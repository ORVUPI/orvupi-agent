import { useEffect, useState } from "react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { editorPath } from "../routing/paths";
import { Button, Input, Select } from "../ui/kit";
import { MenuBar } from "../ui/menus";
import { createId } from "../security/names";
import { createSheetFile, serializeSheet } from "../sheets/model";
import { emptyGrid } from "../sheets/formulas";
import { OrvupiChart } from "../ui/chart";
import { answerCounts, missingRequired, parseForm, serializeForm, type FormFile, type QuestionKind } from "./model";

const KIND_KEY = {
  short: "formShort",
  long: "formLong",
  choice: "formChoice",
  check: "formCheck",
  dropdown: "formDropdown",
  scale: "formScale",
  date: "formDate",
  time: "formTime",
  grid: "formGrid",
  section: "formSection",
  file: "formFile",
  video: "formVideo",
} as const;

const WITH_OPTIONS = new Set<QuestionKind>(["choice", "check", "dropdown", "grid"]);

export function FormsScreen() {
  const workspace = useWorkspace();
  const forms = workspace.files.filter((file) => file.deletedAt === null && file.kind === "form");
  const [file, setFile] = useState<FormFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [mode, setMode] = useState<"edit" | "fill" | "preview" | "answers">("edit");
  const [help, setHelp] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!workspace.openFormId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openFormId;
    let cancel = false;
    loadFileWhenReady(workspace.storage, id).then((loaded) => {
      if (cancel || loaded.integrity === "mismatch") return;
      setFile(parseForm(loaded.bytes));
      setStatus("saved");
      setMode("edit");
      setDraft({});
      setNotice("");
    }).catch(workspace.reportError);
    return () => {
      cancel = true;
    };
  }, [workspace.openFormId, workspace.storage, workspace.reportError]);

  useEffect(() => {
    if (!file || !workspace.storage || status !== "pending" || mode === "fill") return;
    const timer = window.setTimeout(() => {
      void workspace.storage?.saveFile({
        id: file.id,
        name: file.title,
        kind: "form",
        mime: "application/vnd.orvupi.form+json",
        bytes: serializeForm(file),
      }).then(() => workspace.refreshFiles()).then(() => setStatus("saved")).catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, mode, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  function update(next: FormFile) {
    setFile(next);
    setStatus("pending");
  }

  if (!workspace.openFormId) {
    return (
      <div className="ow-page" data-tool="forms">
        <h1>{workspace.t("navForms")}</h1>
        <p>{workspace.t("formHint")}</p>
        <Button variant="primary" onClick={() => void workspace.createForm(null)}>{workspace.t("newForm")}</Button>
        <div className="ow-list">
          {forms.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openForm(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (!file) return <p>{workspace.t("preparing")}</p>;

  return (
    <div className="ow-page ow-form-page" data-tool="forms">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-row">
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
        <Button aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>{workspace.t("formEdit")}</Button>
        <Button aria-pressed={mode === "fill"} onClick={() => { setMode("fill"); setDraft({}); setNotice(""); }}>{workspace.t("formFill")}</Button>
        <Button aria-pressed={mode === "preview"} onClick={() => { setMode("preview"); setDraft({}); setNotice(""); }}>{workspace.t("formPreview")}</Button>
        <Button aria-pressed={mode === "answers"} onClick={() => setMode("answers")}>{workspace.t("formResponses")}</Button>
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [{ id: "fill", label: workspace.t("formFill"), onSelect: () => setMode("fill") }] },
          { id: "edit", label: workspace.t("menuEdit"), items: [{ id: "add", label: workspace.t("formAddQuestion"), onSelect: () => {
            if (file.questions.length >= 40) return;
            update({ ...file, questions: [...file.questions, { id: createId().slice(0, 12), prompt: "", kind: "short", required: false, options: [] }] });
            setMode("edit");
          } }] },
          { id: "view", label: workspace.t("menuView"), items: [
            { id: "questions", label: workspace.t("formQuestions"), onSelect: () => setMode("edit") },
            { id: "answers", label: workspace.t("formResponses"), onSelect: () => setMode("answers") },
          ] },
          { id: "insert", label: workspace.t("menuInsert"), items: [{ id: "q", label: workspace.t("formAddQuestion"), onSelect: () => {
            if (file.questions.length >= 40) return;
            update({ ...file, questions: [...file.questions, { id: createId().slice(0, 12), prompt: "", kind: "choice", required: false, options: ["", ""] }] });
          } }] },
          { id: "format", label: workspace.t("menuFormat"), items: [{ id: "required", label: workspace.t("formRequired"), onSelect: () => {
            const first = file.questions.find((question) => question.kind !== "section");
            if (!first) return;
            update({ ...file, questions: file.questions.map((question) => question.id === first.id ? { ...question, required: !question.required } : question) });
          } }] },
          { id: "tools", label: workspace.t("menuTools"), items: [{ id: "preview", label: workspace.t("formPreview"), onSelect: () => setMode("preview") }] },
          { id: "help", label: workspace.t("menuHelp"), items: [{ id: "keys", label: workspace.t("shortcuts"), onSelect: () => setHelp(true) }] },
        ]}
      />
      <div className="ow-form-banner" aria-hidden="true" />
      <article className="ow-form-card">
        {mode === "edit" ? (
          <>
            <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update({ ...file, title: event.target.value.slice(0, 180) })} />
            <label className="ow-field">
              {workspace.t("formDescription")}
              <textarea value={file.description} onChange={(event) => update({ ...file, description: event.target.value.slice(0, 500) })} />
            </label>
          </>
        ) : (
          <>
            <h2>{file.title}</h2>
            {file.description ? <p>{file.description}</p> : null}
          </>
        )}
      </article>
      {mode === "answers" ? (
        <div className="ow-list">
          <Button onClick={() => {
            if (!workspace.storage) return;
            const id = createId();
            const opened = window.open(editorPath("sheet", id), "_blank");
            const cells = emptyGrid();
            const questions = file.questions.filter((question) => question.kind !== "section");
            questions.forEach((question, col) => {
              cells[0]![col] = question.prompt || workspace.t("formPrompt");
            });
            file.responses.forEach((response, row) => {
              questions.forEach((question, col) => {
                cells[row + 1]![col] = response.answers[question.id] ?? "";
              });
            });
            const sheet = createSheetFile({ id, title: `${file.title} ${workspace.t("formResponses")}`, sheets: [{ name: workspace.t("formResponses"), cells, freezeHeader: true }] });
            void workspace.storage.saveFile({
              id,
              name: sheet.title,
              kind: "sheet",
              mime: "application/vnd.orvupi.sheet+json",
              bytes: serializeSheet(sheet),
            }).then(() => workspace.refreshFiles()).then(() => { if (!opened) workspace.openSheet(id); }).catch(workspace.reportError);
          }}>{workspace.t("formExportSheet")}</Button>
          {file.questions.filter((question) => question.kind === "choice" || question.kind === "check" || question.kind === "dropdown" || question.kind === "scale").map((question) => {
            const counts = answerCounts(file, question.id);
            return (
              <article key={`sum-${question.id}`} className="ow-form-card ow-form-summary">
                <h2>{workspace.t("formSummary")}: {question.prompt || workspace.t("formPrompt")}</h2>
                <div className="ow-chart-panel">
                  <OrvupiChart kind="bar" title={question.prompt || workspace.t("formSummary")} labels={counts.map((item) => item.label)} values={counts.map((item) => item.count)} />
                </div>
              </article>
            );
          })}
          {file.responses.length === 0 ? <p>{workspace.t("formEmptyResponses")}</p> : null}
          {file.responses.map((response) => (
            <article key={response.id} className="ow-form-card">
              <p className="ow-muted">{response.at}</p>
              {file.questions.map((question) => (
                <p key={question.id}><strong>{question.prompt || workspace.t("formPrompt")}</strong> {response.answers[question.id] || "—"}</p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className="ow-form-stack">
          {file.questions.map((question) => (
            <article key={question.id} className="ow-form-card">
              {mode === "edit" ? (
                <>
                  <Input label={workspace.t("formPrompt")} value={question.prompt} onChange={(event) => update({
                    ...file,
                    questions: file.questions.map((item) => item.id === question.id ? { ...item, prompt: event.target.value.slice(0, 180) } : item),
                  })} />
                  <Select label={workspace.t("chipType")} value={question.kind} onChange={(event) => {
                    const kind = event.target.value as QuestionKind;
                    update({
                      ...file,
                      questions: file.questions.map((item) => item.id === question.id ? { ...item, kind, options: WITH_OPTIONS.has(kind) ? (item.options.length > 0 ? item.options : ["", ""]) : [] } : item),
                    });
                  }}>
                    {(Object.keys(KIND_KEY) as QuestionKind[]).map((kind) => (
                      <option key={kind} value={kind}>{workspace.t(KIND_KEY[kind])}</option>
                    ))}
                  </Select>
                  <label className="ow-check">
                    <input type="checkbox" checked={question.required} onChange={(event) => update({
                      ...file,
                      questions: file.questions.map((item) => item.id === question.id ? { ...item, required: event.target.checked } : item),
                    })} />
                    {workspace.t("formRequired")}
                  </label>
                  {question.options.map((option, optionIndex) => (
                    <Input key={`${question.id}-${optionIndex}`} label={`${workspace.t("formOption")} ${optionIndex + 1}`} value={option} onChange={(event) => update({
                      ...file,
                      questions: file.questions.map((item) => item.id === question.id ? { ...item, options: item.options.map((value, index) => index === optionIndex ? event.target.value.slice(0, 80) : value) } : item),
                    })} />
                  ))}
                  {question.options.length > 0 && question.options.length < 8 ? (
                    <Button onClick={() => update({
                      ...file,
                      questions: file.questions.map((item) => item.id === question.id ? { ...item, options: [...item.options, ""] } : item),
                    })}>{workspace.t("formAddOption")}</Button>
                  ) : null}
                  {file.questions.length > 1 ? (
                    <Button onClick={() => update({ ...file, questions: file.questions.filter((item) => item.id !== question.id) })}>{workspace.t("formRemove")}</Button>
                  ) : null}
                </>
              ) : (
                <>
                  {question.kind === "section" ? <h2>{question.prompt || workspace.t("formSection")}</h2> : <h3>{question.prompt || workspace.t("formPrompt")}{question.required ? " *" : ""}</h3>}
                  {question.kind === "long" ? (
                    <label className="ow-field">
                      {workspace.t("formLong")}
                      <textarea value={draft[question.id] ?? ""} onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value.slice(0, 2000) })} />
                    </label>
                  ) : null}
                  {question.kind === "short" ? (
                    <Input label={workspace.t("formShort")} value={draft[question.id] ?? ""} onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value.slice(0, 500) })} />
                  ) : null}
                  {question.kind === "choice" ? (
                    <div role="radiogroup" aria-label={question.prompt || workspace.t("formChoice")}>
                      {question.options.map((option, optionIndex) => (
                        <label key={`${question.id}-c-${optionIndex}`} className="ow-check">
                          <input type="radio" name={question.id} checked={(draft[question.id] ?? "") === option} onChange={() => setDraft({ ...draft, [question.id]: option })} />
                          {option || `${workspace.t("formOption")} ${optionIndex + 1}`}
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {question.kind === "dropdown" ? (
                    <label className="ow-field">
                      {workspace.t("formDropdown")}
                      <select aria-label={question.prompt || workspace.t("formDropdown")} value={draft[question.id] ?? ""} onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value })}>
                        <option value="">{workspace.t("formOption")}</option>
                        {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {question.kind === "scale" ? (
                    <div role="radiogroup" aria-label={question.prompt || workspace.t("formScale")}>
                      {["1", "2", "3", "4", "5"].map((option) => (
                        <label key={option} className="ow-check">
                          <input type="radio" name={question.id} checked={(draft[question.id] ?? "") === option} onChange={() => setDraft({ ...draft, [question.id]: option })} />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {question.kind === "date" ? <Input label={workspace.t("formDate")} type="date" value={draft[question.id] ?? ""} onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value })} /> : null}
                  {question.kind === "time" ? <Input label={workspace.t("formTime")} type="time" value={draft[question.id] ?? ""} onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value })} /> : null}
                  {question.kind === "grid" ? (
                    <div>
                      {question.options.map((option) => (
                        <label key={option} className="ow-field">
                          {option || workspace.t("formGrid")}
                          <select aria-label={option || workspace.t("formGrid")} value={(draft[question.id] ?? "").split("\n").find((line) => line.startsWith(`${option}=`))?.split("=")[1] ?? ""} onChange={(event) => {
                            const lines = (draft[question.id] ?? "").split("\n").filter((line) => line && !line.startsWith(`${option}=`));
                            setDraft({ ...draft, [question.id]: [...lines, `${option}=${event.target.value}`].join("\n") });
                          }}>
                            {["1", "2", "3", "4", "5"].map((column) => <option key={column} value={column}>{column}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {question.kind === "file" || question.kind === "video" ? (
                    <label className="ow-field">
                      {workspace.t(question.kind === "file" ? "formFile" : "formVideo")}
                      <input
                        type="file"
                        accept={question.kind === "video" ? "video/*" : undefined}
                        aria-label={question.prompt || workspace.t(question.kind === "file" ? "formFile" : "formVideo")}
                        onChange={(event) => {
                          const picked = event.target.files?.[0];
                          setDraft({ ...draft, [question.id]: picked ? picked.name.slice(0, 180) : "" });
                        }}
                      />
                      {draft[question.id] ? <span>{draft[question.id]}</span> : null}
                    </label>
                  ) : null}
                  {question.kind === "check" ? (
                    <div role="group" aria-label={question.prompt || workspace.t("formCheck")}>
                      {question.options.map((option, optionIndex) => {
                        const selected = (draft[question.id] ?? "").split("\n").filter(Boolean);
                        const on = selected.includes(option);
                        return (
                          <label key={`${question.id}-k-${optionIndex}`} className="ow-check">
                            <input type="checkbox" checked={on} onChange={() => {
                              const next = on ? selected.filter((item) => item !== option) : [...selected, option];
                              setDraft({ ...draft, [question.id]: next.join("\n") });
                            }} />
                            {option || `${workspace.t("formOption")} ${optionIndex + 1}`}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          ))}
          {help ? <p role="status">{workspace.t("formHint")}</p> : null}
          {mode === "edit" ? (
            <Button variant="primary" onClick={() => {
              if (file.questions.length >= 40) return;
              update({ ...file, questions: [...file.questions, { id: createId().slice(0, 12), prompt: "", kind: "short", required: false, options: [] }] });
            }}>{workspace.t("formAddQuestion")}</Button>
          ) : mode === "preview" ? <p role="status">{workspace.t("formPreview")}</p> : (
            <Button variant="primary" onClick={() => {
              if (missingRequired(file, draft)) {
                setNotice(workspace.t("formMissing"));
                return;
              }
              const next = {
                ...file,
                responses: [...file.responses, { id: createId().slice(0, 12), at: new Date().toISOString(), answers: draft }].slice(-200),
              };
              setFile(next);
              setStatus("pending");
              setDraft({});
              setNotice(workspace.t("formThanks"));
            }}>{workspace.t("formSend")}</Button>
          )}
          {notice ? <p role="status">{notice}</p> : null}
        </div>
      )}
    </div>
  );
}
