import { useEffect, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { Button, Input } from "../ui/kit";
import { absentOnDevice, MissingFile } from "../ui/MissingFile";
import { createId } from "../security/names";
import { NOTE_COLORS, createNoteFile, noteInk, parseNote, serializeNote, type NoteFile } from "./model";

export function NotesScreen() {
  const workspace = useWorkspace();
  const records = workspace.files.filter((file) => file.deletedAt === null && file.kind === "note");
  const [notes, setNotes] = useState<NoteFile[]>([]);
  const [draft, setDraft] = useState<NoteFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!workspace.storage) return;
    const ids = records.map((file) => file.id);
    let cancel = false;
    Promise.all(ids.map((id) => workspace.storage?.loadFile(id).then((loaded) => (loaded.integrity === "ok" ? parseNote(loaded.bytes) : null)).catch(() => null)))
      .then((loaded) => {
        if (cancel) return;
        setNotes(loaded.filter((note): note is NoteFile => note !== null));
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [workspace.storage, records.map((file) => `${file.id}:${file.updatedAt}`).join("|")]);

  useEffect(() => {
    if (!draft || !workspace.storage || status !== "pending") return;
    const timer = window.setTimeout(() => {
      const current = draft;
      void workspace.storage?.saveFile({
        id: current.id,
        name: current.title,
        kind: "note",
        mime: "application/vnd.orvupi.note+json",
        bytes: serializeNote(current),
        snippet: `${current.title} ${current.body} ${current.label ?? ""} ${current.checks.map((check) => check.text).join(" ")}`.slice(0, 4000),
      }).then(() => workspace.refreshFiles()).then(() => setStatus("saved")).catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  useEffect(() => {
    if (!workspace.openNoteId || draft?.id === workspace.openNoteId) return;
    const match = notes.find((note) => note.id === workspace.openNoteId);
    if (!match) return;
    setDraft(match);
    setStatus("saved");
  }, [workspace.openNoteId, notes, draft?.id]);

  function readMedia(picked: File | undefined, kind: "image" | "audio") {
    if (!draft || !picked) return;
    if (picked.size > 280_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      if (!data.startsWith("data:")) return;
      edit({ ...draft, media: { kind, name: picked.name.slice(0, 80), data } });
    };
    reader.readAsDataURL(picked);
  }

  function sketch() {
    if (!draft) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff8ec";
    ctx.fillRect(0, 0, 320, 160);
    ctx.strokeStyle = "#ff3070";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, 110);
    ctx.quadraticCurveTo(120, 20, 200, 90);
    ctx.quadraticCurveTo(250, 130, 290, 50);
    ctx.stroke();
    edit({ ...draft, media: { kind: "drawing", name: workspace.t("noteSketch"), data: canvas.toDataURL("image/png") } });
  }

  function edit(next: NoteFile) {
    setDraft(next);
    setNotes((current) => current.map((note) => (note.id === next.id ? next : note)));
    setStatus("pending");
  }

  const visibleNotes = notes.filter((note) => (showArchived || !note.archived) && (!query.trim() || `${note.title} ${note.body} ${note.label ?? ""} ${note.checks.map((check) => check.text).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())));
  const pinned = visibleNotes.filter((note) => note.pinned);
  const rest = visibleNotes.filter((note) => !note.pinned);

  function wall(title: string, items: NoteFile[]) {
    if (items.length === 0) return null;
    return (
      <section>
        <h2>{title}</h2>
        <div className="ow-notes">
          {items.map((note) => (
            <button
              key={note.id}
              type="button"
              className="ow-note-card"
              style={{ background: note.color, color: noteInk(note.color) }}
              onClick={() => {
                setDraft(note);
                setStatus("saved");
              }}
            >
              <strong>{note.title}</strong>
              {note.label ? <em>{note.label}</em> : null}
              <span>{note.checks.length > 0 ? note.checks.map((check) => check.text).filter(Boolean).slice(0, 3).join(" · ") : note.body}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (absentOnDevice(workspace.ready, workspace.openNoteId, workspace.files)) {
    return <MissingFile message={workspace.t("fileMissing")} action={workspace.t("backToDrive")} onBack={() => void workspace.showBrowse("folder")} />;
  }

  return (
    <div className="ow-page ow-notes-page" data-tool="notes">
      <h1>{workspace.t("navNotes")}</h1>
      <p className="ow-muted">{workspace.t("noteHint")}</p>
      <button type="button" className="ow-note-compose" onClick={() => void workspace.createNote(null)}>
        {workspace.t("noteTake")}
      </button>
      <Input label={workspace.t("noteSearch")} value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} />
      {draft ? (
        <article className="ow-note-editor" style={{ background: draft.color, color: noteInk(draft.color) }}>
          <Input label={workspace.t("fileName")} value={draft.title} onChange={(event) => edit({ ...draft, title: event.target.value.slice(0, 180) })} />
          {draft.checks.length > 0 ? (
            <div>
              {draft.checks.map((check, index) => (
                <div key={check.id} className="ow-check">
                  <input type="checkbox" aria-label={`${workspace.t("noteCheck")} ${index + 1}`} checked={check.done} onChange={(event) => edit({ ...draft, checks: draft.checks.map((item) => item.id === check.id ? { ...item, done: event.target.checked } : item) })} />
                  <input aria-label={`${workspace.t("noteBody")} ${index + 1}`} value={check.text} onChange={(event) => edit({ ...draft, checks: draft.checks.map((item) => item.id === check.id ? { ...item, text: event.target.value.slice(0, 240) } : item) })} />
                </div>
              ))}
              <Button onClick={() => edit({ ...draft, checks: [...draft.checks, { id: createId().slice(0, 12), text: "", done: false }].slice(0, 40) })}>{workspace.t("noteAddCheck")}</Button>
            </div>
          ) : (
            <label className="ow-field">
              {workspace.t("noteBody")}
              <textarea value={draft.body} onChange={(event) => edit({ ...draft, body: event.target.value.slice(0, 4000) })} />
            </label>
          )}
          <div className="ow-row">
            <Button onClick={() => edit({ ...draft, pinned: !draft.pinned })}>{draft.pinned ? workspace.t("noteUnpin") : workspace.t("notePin")}</Button>
            <Button onClick={() => edit({ ...draft, archived: !draft.archived })}>{draft.archived ? workspace.t("noteUnarchive") : workspace.t("noteArchive")}</Button>
            <Button onClick={() => setShowArchived((value) => !value)}>{workspace.t("noteShowArchived")}</Button>
            <Input label={workspace.t("noteLabel")} value={draft.label ?? ""} onChange={(event) => edit({ ...draft, label: event.target.value.slice(0, 40) })} />
            <Button onClick={() => {
              if (!workspace.storage) return;
              const copy = createNoteFile({ id: createId(), title: `${draft.title} copia` });
              copy.body = draft.body;
              copy.color = draft.color;
              copy.checks = draft.checks;
              copy.label = draft.label;
              void workspace.storage.saveFile({
                id: copy.id,
                name: copy.title,
                kind: "note",
                mime: "application/vnd.orvupi.note+json",
                bytes: serializeNote(copy),
              }).then(() => workspace.refreshFiles()).catch(workspace.reportError);
            }}>{workspace.t("noteCopy")}</Button>
            <Button onClick={() => edit(draft.checks.length > 0 ? { ...draft, checks: [] } : { ...draft, checks: [{ id: createId().slice(0, 12), text: "", done: false }] })}>
              {draft.checks.length > 0 ? workspace.t("noteText") : workspace.t("noteList")}
            </Button>
            <label className="ow-file">
              {workspace.t("notePhoto")}
              <input aria-label={workspace.t("notePhoto")} type="file" accept="image/*" onChange={(event) => readMedia(event.target.files?.[0], "image")} />
            </label>
            <label className="ow-file">
              {workspace.t("noteAudio")}
              <input aria-label={workspace.t("noteAudio")} type="file" accept="audio/*" onChange={(event) => readMedia(event.target.files?.[0], "audio")} />
            </label>
            <Button onClick={() => sketch()}>{workspace.t("noteSketch")}</Button>
            {draft.media?.kind === "audio" ? <audio controls src={draft.media.data} /> : null}
            {draft.media && draft.media.kind !== "audio" ? <img src={draft.media.data} alt={draft.media.name || workspace.t("notePhoto")} /> : null}
            <div className="ow-swatches" role="group" aria-label={workspace.t("labelColor")}>
              {NOTE_COLORS.map((color) => (
                <button key={color} type="button" className="ow-swatch" style={{ background: color }} aria-label={color} aria-pressed={draft.color === color} onClick={() => edit({ ...draft, color })} />
              ))}
            </div>
            <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
          </div>
        </article>
      ) : null}
      {wall(workspace.t("notePinned"), pinned)}
      {wall(workspace.t("noteOthers"), rest)}
      {notes.length === 0 ? <p>{workspace.t("noteEmpty")}</p> : null}
    </div>
  );
}
