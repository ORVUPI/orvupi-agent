import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { Locale, MessageKey } from "../i18n";
import { translate } from "../i18n";
import { downloadBytes } from "../security/bytes";
import { MAX_IMAGE_BYTES } from "../security/limits";
import { fileNameWithExtension } from "../security/names";
import { safeHref } from "../security/sanitize";
import type { FileRecord, StorageService } from "../storage/types";
import { Icon } from "../ui/icons";
import { Button, ErrorState, IconButton, Input, Select } from "../ui/kit";
import { Modal } from "../ui/overlay";
import { createExtensions, pastedHtml } from "./extensions";
import { findInSlices, type TextSlice } from "./find";
import { exportHtml } from "./html";
import { countWords, docToText, firstLine, UNTITLED_NAMES, type JsonNode } from "./model";
import { serializeOrvdoc, withContent, type OrvdocFile } from "./orvdoc";
import { SaveController, createSaveQueue, type SaveState } from "./save-status";

export type ExportKind = "pdf" | "html" | "txt" | "orvdoc";

export type DocSession = {
  name: string;
  saveState: SaveState;
  rename: (name: string) => void;
  commitName: () => Promise<void>;
  exportAs: (kind: ExportKind) => Promise<void>;
  close: () => Promise<boolean>;
};

const COLORS: Array<{ id: string; value: string; key: MessageKey }> = [
  { id: "ink", value: "#102032", key: "colorInk" },
  { id: "pink", value: "#ad1645", key: "colorPink" },
  { id: "green", value: "#0b5d36", key: "colorGreen" },
  { id: "blue", value: "#1d4e89", key: "colorBlue" },
  { id: "red", value: "#a3123f", key: "colorRed" },
];

const SIZES: Array<{ id: string; value: string; key: MessageKey }> = [
  { id: "sm", value: "14px", key: "sizeSm" },
  { id: "md", value: "16px", key: "sizeMd" },
  { id: "lg", value: "20px", key: "sizeLg" },
  { id: "xl", value: "28px", key: "sizeXl" },
];

function slicesOf(editor: Editor): TextSlice[] {
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
  const writeRef = useRef<(snapshot: string) => Promise<void>>(async () => undefined);
  const closeRef = useRef<() => Promise<boolean>>(async () => false);
  const exportRef = useRef<(kind: ExportKind) => Promise<void>>(async () => undefined);
  const queue = useState(() => {
    const controller = new SaveController();
    controller.reset(JSON.stringify(initial.content));
    return createSaveQueue(controller, (snapshot) => writeRef.current(snapshot), setSaveState);
  })[0];

  const editor = useEditor({
    immediatelyRender: true,
    extensions: createExtensions(t("placeholder")),
    content: initial.content,
    editorProps: {
      attributes: { "aria-label": t("editorRegion") },
      transformPastedHTML: pastedHtml,
    },
    onUpdate: ({ editor: current }) => queue.note(JSON.stringify(current.getJSON())),
  });

  writeRef.current = async (snapshot) => {
    const content = JSON.parse(snapshot) as JsonNode;
    let title = nameRef.current;
    if (UNTITLED_NAMES.has(title)) {
      const derived = firstLine(docToText(content));
      if (derived) {
        title = derived;
        nameRef.current = title;
        setName(title);
      }
    }
    const next = withContent(fileRef.current, content, title, new Date().toISOString());
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
      downloadBytes(serializeOrvdoc({ ...current, title: nameRef.current, content }), fileNameWithExtension(nameRef.current, "orvdoc"), "application/json");
      return;
    }
    const { exportPdf } = await import("./pdf");
    const pdf = await exportPdf(nameRef.current, content);
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

  const run = (command: () => boolean) => {
    command();
  };

  return (
    <section className="ow-editor" aria-label={t("editorRegion")}>
      <h1 className="ow-sr">{name}</h1>
      <div className="ow-toolbar" role="toolbar" aria-label={t("toolbarLabel")}>
        <Select
          label={t("styleLabel")}
          value={editor?.isActive("heading", { level: 1 }) ? "1" : editor?.isActive("heading", { level: 2 }) ? "2" : editor?.isActive("heading", { level: 3 }) ? "3" : "0"}
          onChange={(event) => {
            const level = Number(event.target.value);
            if (!editor) return;
            if (level === 0) run(() => editor.chain().focus().setParagraph().run());
            else run(() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run());
          }}
        >
          <option value="0">{t("paragraphStyle")}</option>
          <option value="1">{t("heading1")}</option>
          <option value="2">{t("heading2")}</option>
          <option value="3">{t("heading3")}</option>
        </Select>
        <IconButton label={t("bold")} pressed={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Icon name="bold" />
        </IconButton>
        <IconButton label={t("italic")} pressed={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Icon name="italic" />
        </IconButton>
        <IconButton label={t("underline")} pressed={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <Icon name="underline" />
        </IconButton>
        <IconButton label={t("strike")} pressed={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Icon name="strike" />
        </IconButton>
        <IconButton label={t("bullet")} pressed={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <Icon name="list" />
        </IconButton>
        <IconButton label={t("ordered")} pressed={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <Icon name="ordered" />
        </IconButton>
        <IconButton label={t("alignLeft")} pressed={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <Icon name="alignLeft" />
        </IconButton>
        <IconButton label={t("alignCenter")} pressed={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <Icon name="alignCenter" />
        </IconButton>
        <IconButton label={t("alignRight")} pressed={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <Icon name="alignRight" />
        </IconButton>
        <div className="ow-swatches" role="group" aria-label={t("color")}>
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className="ow-swatch"
              style={{ background: color.value }}
              aria-label={t(color.key)}
              aria-pressed={editor?.isActive("textStyle", { color: color.value })}
              onClick={() => editor?.chain().focus().setColor(color.value).run()}
            />
          ))}
        </div>
        <Select
          label={t("size")}
          value="16px"
          onChange={(event) => editor?.chain().focus().setFontSize(event.target.value).run()}
        >
          {SIZES.map((size) => (
            <option key={size.id} value={size.value}>
              {t(size.key)}
            </option>
          ))}
        </Select>
        <Button onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>{t("table")}</Button>
        <label className="ow-file">
          <input
            aria-label={t("image")}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void addImage(file);
            }}
          />
          <span className="ow-button ow-button-secondary">{t("image")}</span>
        </label>
        <Button onClick={() => setLinkOpen(true)}>{t("link")}</Button>
        <IconButton label={t("undo")} onClick={() => editor?.chain().focus().undo().run()}>
          <Icon name="undo" />
        </IconButton>
        <IconButton label={t("redo")} onClick={() => editor?.chain().focus().redo().run()}>
          <Icon name="redo" />
        </IconButton>
        <Button onClick={() => setFindOpen((value) => !value)}>{t("findReplace")}</Button>
        <Button onClick={() => window.print()}>{t("print")}</Button>
      </div>
      {findOpen ? (
        <form
          className="ow-find"
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
      <div className="ow-paper">
        <EditorContent editor={editor} />
      </div>
      <p className="ow-count" aria-live="polite">
        {t("words", { count: counts.words })} · {t("characters", { count: counts.characters })}
      </p>
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
    </section>
  );
}
