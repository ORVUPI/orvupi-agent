import { useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { Locale, MessageKey } from "../i18n";
import { translate } from "../i18n";
import { downloadBytes } from "../security/bytes";
import { MAX_IMAGE_BYTES } from "../security/limits";
import { createId, fileNameWithExtension } from "../security/names";
import { safeHref } from "../security/sanitize";
import type { FileRecord, StorageService } from "../storage/types";
import { Button, ErrorState, Input } from "../ui/kit";
import { DocsSurface } from "./DocsSurface";
import { Modal } from "../ui/overlay";
import { createExtensions, pastedHtml } from "./extensions";
import { findInSlices, type TextSlice } from "./find";
import { exportHtml } from "./html";
import { countWords, docToText, firstLine, UNTITLED_NAMES, type DocComment, type DocVersion, type JsonNode } from "./model";
import { serializeOrvdoc, withContent, type OrvdocFile } from "./orvdoc";
import { SaveController, createSaveQueue, type SaveState } from "./save-status";

export type ExportKind = "pdf" | "html" | "txt" | "orvdoc" | "docx";

export type DocSession = {
  name: string;
  saveState: SaveState;
  rename: (name: string) => void;
  commitName: () => Promise<void>;
  exportAs: (kind: ExportKind) => Promise<void>;
  close: () => Promise<boolean>;
};

function slicesOf(editor: NonNullable<ReturnType<typeof useEditor>>): TextSlice[] {
  const slices: TextSlice[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) slices.push({ text: node.text, pos });
  });
  return slices;
}

export function DocsEditor({
  record,
  initial,
  storage,
  locale,
  onSession,
  onFilesChanged,
  onClose,
}: {
  record: FileRecord;
  initial: OrvdocFile;
  storage: StorageService;
  locale: Locale;
  onSession: (session: DocSession | null) => void;
  onFilesChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const [name, setName] = useState(initial.title);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [findNote, setFindNote] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const [linkError, setLinkError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const fileRef = useRef(initial);
  const nameRef = useRef(initial.title);
  const headerRef = useRef(initial.header);
  const footerRef = useRef(initial.footer);
  const commentsRef = useRef<DocComment[]>(initial.comments);
  const versionsRef = useRef<DocVersion[]>(initial.versions);
  const writeRef = useRef<(snapshot: string) => Promise<void>>(async () => undefined);
  const closeRef = useRef<() => Promise<boolean>>(async () => false);
  const exportRef = useRef<(kind: ExportKind) => Promise<void>>(async () => undefined);
  const snapshotOf = (content: JsonNode) =>
    JSON.stringify({ content, header: headerRef.current, footer: footerRef.current, comments: commentsRef.current, versions: versionsRef.current });
  const queue = useState(() => {
    const controller = new SaveController();
    controller.reset(snapshotOf(initial.content));
    return createSaveQueue(controller, (snapshot) => writeRef.current(snapshot), setSaveState);
  })[0];
  const [header, setHeader] = useState(initial.header);
  const [footer, setFooter] = useState(initial.footer);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const [starred, setStarred] = useState(record.favorite);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: createExtensions(t("placeholder")),
    content: initial.content,
    editorProps: {
      attributes: { "aria-label": t("editorRegion") },
      transformPastedHTML: pastedHtml,
    },
    onUpdate: ({ editor: current }) => queue.note(snapshotOf(current.getJSON() as JsonNode)),
  });

  writeRef.current = async (snapshot) => {
    const parsed = JSON.parse(snapshot) as { content?: JsonNode; header?: string; footer?: string; comments?: DocComment[]; versions?: DocVersion[] };
    const content = parsed.content ?? (parsed as unknown as JsonNode);
    let title = nameRef.current;
    if (UNTITLED_NAMES.has(title)) {
      const derived = firstLine(docToText(content));
      if (derived) {
        title = derived;
        nameRef.current = title;
        setName(title);
      }
    }
    const next = {
      ...withContent(fileRef.current, content, title, new Date().toISOString()),
      header: parsed.header ?? headerRef.current,
      footer: parsed.footer ?? footerRef.current,
      comments: parsed.comments ?? commentsRef.current,
      versions: parsed.versions ?? versionsRef.current,
    };
    const saved = await storage.saveFile({
      id: record.id,
      name: title,
      kind: "doc",
      mime: "application/vnd.orvupi.doc+json",
      bytes: serializeOrvdoc(next),
    });
    fileRef.current = { ...next, title: saved.name };
    await onFilesChanged();
  };

  useEffect(() => {
    const flush = () => void queue.flush().catch(() => setSaveError(true));
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        flush();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLinkOpen(true);
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (saveState === "pending") {
        event.preventDefault();
        flush();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [queue, saveState]);

  useEffect(() => {
    return () => {
      void queue.flush();
    };
  }, [queue]);

  useEffect(() => {
    const session: DocSession = {
      name,
      saveState,
      rename: (value) => {
        nameRef.current = value;
        setName(value);
      },
      commitName: async () => {
        const title = nameRef.current.trim();
        if (!title) return;
        const saved = await storage.renameFile(record.id, title);
        nameRef.current = saved.name;
        setName(saved.name);
        fileRef.current = { ...fileRef.current, title: saved.name };
        await onFilesChanged();
      },
      exportAs: (kind) => exportRef.current(kind),
      close: () => closeRef.current(),
    };
    onSession(session);
    return () => onSession(null);
  }, [name, saveState, onSession, onFilesChanged, record.id, storage]);

  const text = editor ? docToText(editor.getJSON() as JsonNode) : "";
  const counts = countWords(text);

  async function exportAs(kind: ExportKind): Promise<void> {
    await queue.flush();
    const current = fileRef.current;
    const content = (editor?.getJSON() as JsonNode | undefined) ?? current.content;
    if (kind === "txt") {
      downloadBytes(new TextEncoder().encode(docToText(content)), fileNameWithExtension(nameRef.current, "txt"), "text/plain");
      return;
    }
    if (kind === "html") {
      const html = exportHtml(nameRef.current, content, locale);
      downloadBytes(new TextEncoder().encode(html), fileNameWithExtension(nameRef.current, "html"), "text/html");
      return;
    }
    if (kind === "orvdoc") {
      downloadBytes(serializeOrvdoc({ ...current, title: nameRef.current, content, header: headerRef.current, footer: footerRef.current }), fileNameWithExtension(nameRef.current, "orvdoc"), "application/json");
      return;
    }
    if (kind === "docx") {
      const { exportDocx } = await import("./docx");
      const docx = await exportDocx(nameRef.current, content, headerRef.current, footerRef.current);
      downloadBytes(docx, fileNameWithExtension(nameRef.current, "docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return;
    }
    const { exportPdf } = await import("./pdf");
    const pdf = await exportPdf(nameRef.current, content, headerRef.current, footerRef.current);
    downloadBytes(pdf, fileNameWithExtension(nameRef.current, "pdf"), "application/pdf");
  }

  async function closeDocument(): Promise<boolean> {
    try {
      const ok = await queue.flush();
      if (!ok) {
        setSaveError(true);
        return false;
      }
      onClose();
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }

  closeRef.current = closeDocument;
  exportRef.current = exportAs;

  function findNext() {
    if (!editor) return;
    if (!findQuery.trim()) {
      setFindNote(t("findEmpty"));
      return;
    }
    const found = findInSlices(slicesOf(editor), findQuery, editor.state.selection.to);
    if (!found) {
      setFindNote(t("findNone"));
      return;
    }
    editor.chain().focus().setTextSelection(found).run();
    setFindNote("");
  }

  function replaceOne() {
    if (!editor) return;
    const found = findInSlices(slicesOf(editor), findQuery, editor.state.selection.from);
    if (!found) {
      setFindNote(t("findNone"));
      return;
    }
    editor.chain().focus().insertContentAt(found, replaceValue).run();
  }

  function replaceAll() {
    if (!editor || !findQuery) return;
    let guard = 0;
    let found = findInSlices(slicesOf(editor), findQuery, 0);
    while (found && guard < 200) {
      editor.chain().insertContentAt(found, replaceValue).run();
      found = findInSlices(slicesOf(editor), findQuery, found.from + replaceValue.length);
      guard += 1;
    }
  }

  async function addImage(file: File) {
    if (!editor) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      setFindNote(t("reasonImageType"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFindNote(t("reasonImageSize"));
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(file);
    });
    editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
  }

  function applyLink() {
    if (!editor) return;
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError(t("reasonLink"));
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkError("");
  }

  return (
    <section className="ow-editor" data-tool="docs" aria-label={t("editorRegion")}>
      <h1 className="ow-sr">{name}</h1>
      <DocsSurface
        t={t}
        editor={editor}
        name={name}
        saveLabel={t(saveState === "saved" ? "statusSaved" : "statusPending")}
        starred={starred}
        onName={(value) => {
          nameRef.current = value;
          setName(value);
        }}
        onCommit={() => {
          const title = nameRef.current.trim();
          if (!title) return;
          void storage.renameFile(record.id, title).then(async (saved) => {
            nameRef.current = saved.name;
            setName(saved.name);
            fileRef.current = { ...fileRef.current, title: saved.name };
            await onFilesChanged();
          });
        }}
        onStar={() => {
          const next = !starred;
          setStarred(next);
          void storage.setFavorite(record.id, next).then(() => onFilesChanged());
        }}
        onClose={() => void closeDocument()}
        onExport={(kind) => void exportAs(kind)}
        onFind={() => setFindOpen(true)}
        onLink={() => setLinkOpen(true)}
        onImage={(file) => void addImage(file)}
        onComment={() => setCommentOpen(true)}
        onVersions={() => setVersionsOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onPrint={() => window.print()}
        header={header}
        footer={footer}
        onHeader={(value) => {
          headerRef.current = value;
          setHeader(value);
          if (editor) queue.note(snapshotOf(editor.getJSON() as JsonNode));
        }}
        onFooter={(value) => {
          footerRef.current = value;
          setFooter(value);
          if (editor) queue.note(snapshotOf(editor.getJSON() as JsonNode));
        }}
        words={`${t("words", { count: counts.words })} · ${t("characters", { count: counts.characters })}`}
        find={findOpen ? (
          <form
            className="ow-find ow-docs-find"
            onSubmit={(event) => {
              event.preventDefault();
              findNext();
            }}
          >
            <Input label={t("find")} value={findQuery} onChange={(event) => setFindQuery(event.target.value)} />
            <Input label={t("replace")} value={replaceValue} onChange={(event) => setReplaceValue(event.target.value)} />
            <Button type="submit">{t("findNext")}</Button>
            <Button onClick={replaceOne}>{t("replaceOne")}</Button>
            <Button onClick={replaceAll}>{t("replaceAll")}</Button>
            <Button onClick={() => setFindOpen(false)}>{t("closeFind")}</Button>
            {findNote ? <p role="status">{findNote}</p> : null}
          </form>
        ) : null}
      />
      {rev >= 0 && commentsRef.current.length > 0 ? (
        <ul className="ow-list">
          {commentsRef.current.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.quote || t("comment")}</strong>
              <p>{comment.body}</p>
              <Button
                onClick={() => {
                  commentsRef.current = commentsRef.current.filter((item) => item.id !== comment.id);
                  if (editor) queue.note(snapshotOf(editor.getJSON() as JsonNode));
                  setRev((value) => value + 1);
                }}
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {saveError ? (
        <ErrorState
          title={t("saveErrorTitle")}
          reason={t("reasonStorage")}
          solution={t("solutionExport")}
          retryLabel={t("retry")}
          onRetry={() => {
            setSaveError(false);
            void queue.flush().catch(() => setSaveError(true));
          }}
          extra={<Button onClick={() => void exportAs("orvdoc")}>{t("exportOrvdoc")}</Button>}
        />
      ) : null}
      <Modal
        open={linkOpen}
        title={t("link")}
        onClose={() => setLinkOpen(false)}
        footer={
          <>
            <Button onClick={() => setLinkOpen(false)}>{t("cancel")}</Button>
            <Button
              onClick={() => {
                editor?.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              {t("removeLink")}
            </Button>
            <Button variant="primary" onClick={applyLink}>
              {t("applyLink")}
            </Button>
          </>
        }
      >
        <Input label={t("linkUrl")} value={linkValue} onChange={(event) => setLinkValue(event.target.value)} />
        {linkError ? <p role="alert">{linkError}</p> : null}
      </Modal>
      <Modal
        open={commentOpen}
        title={t("comment")}
        onClose={() => setCommentOpen(false)}
        footer={
          <>
            <Button onClick={() => setCommentOpen(false)}>{t("cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!editor || !commentBody.trim()) return;
                const quote = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ").slice(0, 180);
                commentsRef.current = [...commentsRef.current, { id: createId(), quote, body: commentBody.trim().slice(0, 500), createdAt: new Date().toISOString() }];
                queue.note(snapshotOf(editor.getJSON() as JsonNode));
                setCommentBody("");
                setCommentOpen(false);
                setRev((value) => value + 1);
              }}
            >
              {t("apply")}
            </Button>
          </>
        }
      >
        <Input label={t("commentBody")} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
      </Modal>
      <Modal open={versionsOpen} title={t("versions")} onClose={() => setVersionsOpen(false)}>
        <Button
          variant="primary"
          onClick={() => {
            if (!editor) return;
            const content = editor.getJSON() as JsonNode;
            const last = versionsRef.current.at(-1);
            if (last && JSON.stringify(last.content) === JSON.stringify(content)) return;
            versionsRef.current = [...versionsRef.current, { id: createId(), at: new Date().toISOString(), title: nameRef.current, content }].slice(-20);
            queue.note(snapshotOf(content));
            setRev((value) => value + 1);
          }}
        >
          {t("saveVersion")}
        </Button>
        <ul className="ow-list">
          {versionsRef.current.map((version) => (
            <li key={version.id}>
              <span>{version.at}</span>
              <Button
                onClick={() => {
                  editor?.commands.setContent(version.content);
                  if (editor) queue.note(snapshotOf(version.content));
                  setVersionsOpen(false);
                }}
              >
                {t("restoreVersion")}
              </Button>
            </li>
          ))}
        </ul>
        {versionsRef.current.length === 0 ? <p>{t("noVersions")}</p> : null}
      </Modal>
      <Modal open={shortcutsOpen} title={t("shortcuts")} onClose={() => setShortcutsOpen(false)}>
        <p>{t("shortcutsBody")}</p>
      </Modal>
    </section>
  );
}
