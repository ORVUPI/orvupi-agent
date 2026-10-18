import { NodeSelection } from "@tiptap/pm/state";
import { inlineAssets, preloadAssets, releaseExportAssets } from "../storage/assets";
import { useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { Locale, MessageKey } from "../i18n";
import { translate } from "../i18n";
import { downloadBytes } from "../security/bytes";
import { MAX_IMAGE_BYTES } from "../security/limits";
import { createId, fileNameWithExtension } from "../security/names";
import { safeHref } from "../security/sanitize";
import { editorPath, openEditorWindow } from "../routing/paths";
import type { FileRecord, StorageService } from "../storage/types";
import { Button, ErrorState, Input } from "../ui/kit";
import { DocsSurface } from "./DocsSurface";
import { combinedContent, tabsOf, type DocTab } from "./tabs";
import { tabFromHash } from "./DocTabs";
import { CommentsRail } from "./CommentsRail";
import { LayoutTools } from "./LayoutTools";
import { usePhone } from "../ui/phone";
import { Modal } from "../ui/overlay";
import { createExtensions, pastedHtml } from "./extensions";
import { imageAttrs, prepareImage } from "./image-paste";
import { findBefore, findInSlices, type TextSlice } from "./find";
import { exportHtml } from "./html";
import { countWords, docToText, firstLine, UNTITLED_NAMES, type DocComment, type DocVersion, type JsonNode, type PageMargin, type PageOrientation, type PageSize } from "./model";
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
  const phone = usePhone();
  const [name, setName] = useState(record.name || initial.title);
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
  const nameRef = useRef(record.name || initial.title);
  const headerRef = useRef(initial.header);
  const footerRef = useRef(initial.footer);
  const layoutRef = useRef({
    columns: initial.columns ?? 1,
    dropCap: initial.dropCap === true,
    watermark: initial.watermark ?? "",
    pageNumber: initial.pageNumber === true,
    pageSize: (initial.pageSize ?? "a4") as PageSize,
    pageOrientation: (initial.pageOrientation ?? "portrait") as PageOrientation,
    pageMargin: (initial.pageMargin ?? "normal") as PageMargin,
  });
  const commentsRef = useRef<DocComment[]>(initial.comments);
  const versionsRef = useRef<DocVersion[]>(initial.versions);
  const writeRef = useRef<(snapshot: string) => Promise<void>>(async () => undefined);
  const closeRef = useRef<() => Promise<boolean>>(async () => false);
  const exportRef = useRef<(kind: ExportKind) => Promise<void>>(async () => undefined);
  // Pestañas: la activa vive en el editor; las demás guardan su contenido en tabsRef.
  const tabsRef = useRef<DocTab[]>(tabsOf(initial.tabs, initial.content, `${t("tabDefault")} 1`));
  const [tabs, setTabs] = useState<DocTab[]>(tabsRef.current);
  const activeRef = useRef<string>((() => {
    const wanted = typeof window === "undefined" ? null : tabFromHash();
    return tabsRef.current.some((tab) => tab.id === wanted) ? wanted! : tabsRef.current[0]!.id;
  })());
  const [activeTab, setActiveTab] = useState(activeRef.current);
  const withActive = (content: JsonNode): DocTab[] => tabsRef.current.map((tab) => (tab.id === activeRef.current ? { ...tab, content } : tab));
  const snapshotOf = (active: JsonNode) => {
    const all = withActive(active);
    const content = all[0]!.content ?? active;
    const tabsOut = all.length > 1 || all[0]!.emoji || all[0]!.title !== `${t("tabDefault")} 1` || all[0]!.hideOutline ? all.map((tab, i) => (i === 0 ? { ...tab, content: undefined } : tab)) : undefined;
    return JSON.stringify({ content, tabs: tabsOut, header: headerRef.current, footer: footerRef.current, comments: commentsRef.current, versions: versionsRef.current, ...layoutRef.current });
  };
  const queue = useState(() => {
    const controller = new SaveController();
    controller.reset(snapshotOf(tabsRef.current.find((tab) => tab.id === activeRef.current)?.content ?? initial.content));
    return createSaveQueue(controller, (snapshot) => writeRef.current(snapshot), setSaveState);
  })[0];
  const [header, setHeader] = useState(initial.header);
  const [footer, setFooter] = useState(initial.footer);
  const [layout, setLayout] = useState(layoutRef.current);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const [starred, setStarred] = useState(record.favorite);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const findAnchor = useRef<{ from: number; to: number } | null>(null);

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    immediatelyRender: true,
    extensions: createExtensions(t("placeholder")),
    content: tabsRef.current.find((tab) => tab.id === activeRef.current)?.content ?? initial.content,
    editorProps: {
      attributes: { "aria-label": t("editorRegion") },
      transformPastedHTML: pastedHtml,
    },
    onUpdate: ({ editor: current }) => queue.note(snapshotOf(current.getJSON() as JsonNode)),
  });
  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const save = () => {
      const selection = editor.state.selection;
      const previous = findAnchor.current;
      if (!selection.empty) {
        findAnchor.current = { from: selection.from, to: selection.to };
        return;
      }
      if (previous && (selection.from === previous.from || selection.from === previous.to)) return;
      let focused = false;
      try {
        focused = editor.view.hasFocus();
      } catch {
        return;
      }
      if (focused) findAnchor.current = { from: selection.from, to: selection.to };
    };
    editor.on("selectionUpdate", save);
    return () => {
      editor.off("selectionUpdate", save);
    };
  }, [editor]);

  function keepRange() {
    const current = editorRef.current;
    if (!current) return;
    rangeRef.current = { from: current.state.selection.from, to: current.state.selection.to };
  }

  function chainWithRange() {
    const current = editorRef.current;
    if (!current) return null;
    const range = rangeRef.current;
    const chain = current.chain().focus();
    return range ? chain.setTextSelection(range) : chain;
  }

  writeRef.current = async (snapshot) => {
    const parsed = JSON.parse(snapshot) as { tabs?: DocTab[]; content?: JsonNode; header?: string; footer?: string; comments?: DocComment[]; versions?: DocVersion[]; columns?: 1 | 2 | 3; dropCap?: boolean; watermark?: string; pageNumber?: boolean; pageSize?: PageSize; pageOrientation?: PageOrientation; pageMargin?: PageMargin };
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
    const columns: 1 | 2 | 3 = parsed.columns === 3 ? 3 : parsed.columns === 2 ? 2 : 1;
    const pageSize: PageSize = parsed.pageSize === "letter" ? "letter" : "a4";
    const pageOrientation: PageOrientation = parsed.pageOrientation === "landscape" ? "landscape" : "portrait";
    const pageMargin: PageMargin = parsed.pageMargin === "wide" ? "wide" : parsed.pageMargin === "narrow" ? "narrow" : "normal";
    const next = {
      ...withContent(fileRef.current, content, title, new Date().toISOString()),
      header: parsed.header ?? headerRef.current,
      footer: parsed.footer ?? footerRef.current,
      comments: parsed.comments ?? commentsRef.current,
      versions: parsed.versions ?? versionsRef.current,
      columns,
      dropCap: parsed.dropCap === true,
      watermark: typeof parsed.watermark === "string" ? parsed.watermark : "",
      pageNumber: parsed.pageNumber === true,
      pageSize,
      pageOrientation,
      pageMargin,
    };
    if (parsed.tabs && parsed.tabs.length > 0) next.tabs = parsed.tabs; else delete next.tabs;
    const allText = parsed.tabs && parsed.tabs.length > 1 ? docToText(combinedContent(parsed.tabs.map((tab, i) => (i === 0 ? { ...tab, content } : tab)))) : docToText(content);
    const saved = await storage.saveFile({
      id: record.id,
      name: title,
      kind: "doc",
      mime: "application/vnd.orvupi.doc+json",
      bytes: serializeOrvdoc(next),
      snippet: allText.slice(0, 4000),
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
        keepRange();
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

  function selectTab(id: string, force = false) {
    if (!editor || (!force && id === activeRef.current)) return;
    const target = tabsRef.current.find((tab) => tab.id === id);
    if (!target) return;
    if (!force || tabsRef.current.some((tab) => tab.id === activeRef.current)) tabsRef.current = withActive(editor.getJSON() as JsonNode);
    activeRef.current = id;
    setActiveTab(id);
    setTabs(tabsRef.current);
    const fresh = tabsRef.current.find((tab) => tab.id === id);
    editor.commands.setContent(fresh?.content ?? { type: "doc", content: [{ type: "paragraph" }] }, { emitUpdate: false });
    try {
      window.history.replaceState(window.history.state, "", `#tab=${encodeURIComponent(id)}`);
    } catch {
      /* sin historial */
    }
    editor.commands.focus("start");
    queue.note(snapshotOf(editor.getJSON() as JsonNode));
  }

  async function exportAs(kind: ExportKind): Promise<void> {
    await queue.flush();
    const current = fileRef.current;
    const active = (editor?.getJSON() as JsonNode | undefined) ?? current.content;
    const allTabs = withActive(active);
    // Cada pestaña se exporta como una sección con su título y salto de página.
    const content = combinedContent(allTabs);
    if (kind === "txt") {
      downloadBytes(new TextEncoder().encode(docToText(content)), fileNameWithExtension(nameRef.current, "txt"), "text/plain");
      return;
    }
    if (kind === "html") {
      await preloadAssets(content);
      const html = (() => { try { return exportHtml(nameRef.current, content, locale); } finally { releaseExportAssets(); } })();
      downloadBytes(new TextEncoder().encode(html), fileNameWithExtension(nameRef.current, "html"), "text/html");
      return;
    }
    if (kind === "orvdoc") {
      // El .orvdoc se lleva las imágenes incrustadas para abrirse en otro dispositivo.
      await preloadAssets(content);
      const portableTabs = (() => { try { return allTabs.map((tab) => ({ ...tab, content: inlineAssets(tab.content ?? active) })); } finally { releaseExportAssets(); } })();
      const portable = portableTabs[0]!.content;
      downloadBytes(serializeOrvdoc({ ...current, ...(allTabs.length > 1 ? { tabs: portableTabs.map((tab, i) => (i === 0 ? { ...tab, content: undefined } : tab)) } : {}), title: nameRef.current, content: portable, header: headerRef.current, footer: footerRef.current, comments: commentsRef.current }), fileNameWithExtension(nameRef.current, "orvdoc"), "application/json");
      return;
    }
    if (kind === "docx") {
      const { exportDocx } = await import("./docx");
      const docx = await exportDocx(nameRef.current, content, headerRef.current, footerRef.current, layoutRef.current.pageNumber, { ...layoutRef.current, comments: commentsRef.current });
      downloadBytes(docx, fileNameWithExtension(nameRef.current, "docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return;
    }
    const { exportPdf } = await import("./pdf");
    const pdf = await exportPdf(nameRef.current, content, headerRef.current, footerRef.current, layoutRef.current.pageNumber, layoutRef.current);
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

  async function makeCopy() {
    const ok = await queue.flush();
    if (!ok) {
      setSaveError(true);
      return;
    }
    const copy = await storage.duplicateFile(record.id);
    const opened = openEditorWindow("doc", copy.id);
    if (!opened) window.location.assign(editorPath("doc", copy.id));
  }

  function pinFindSelection(event: { target: EventTarget | null }) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("button")) return;
    const current = editorRef.current;
    if (!current || current.state.selection.empty) return;
    findAnchor.current = { from: current.state.selection.from, to: current.state.selection.to };
  }

  function findEdge(edge: "from" | "to"): number {
    const live = editor?.state.selection;
    let focused = false;
    try {
      focused = Boolean(editor?.view.hasFocus());
    } catch {
      focused = false;
    }
    const pinned = findAnchor.current;
    if (!focused && pinned) return pinned[edge];
    if (live && !live.empty) return live[edge];
    return pinned ? pinned[edge] : live ? live[edge] : 0;
  }

  function findPrevious() {
    if (!editor) return;
    if (!findQuery.trim()) {
      setFindNote(t("findEmpty"));
      return;
    }
    const found = findBefore(slicesOf(editor), findQuery, findEdge("from"));
    if (!found) {
      setFindNote(t("findNone"));
      return;
    }
    editor.chain().focus().setTextSelection(found).run();
    setFindNote("");
  }

  function findNext() {
    if (!editor) return;
    if (!findQuery.trim()) {
      setFindNote(t("findEmpty"));
      return;
    }
    const found = findInSlices(slicesOf(editor), findQuery, findEdge("to"));
    if (!found) {
      setFindNote(t("findNone"));
      return;
    }
    editor.chain().focus().setTextSelection(found).run();
    setFindNote("");
  }

  function replaceOne() {
    findAnchor.current = null;
    if (!editor) return;
    const found = findInSlices(slicesOf(editor), findQuery, editor.state.selection.from);
    if (!found) {
      setFindNote(t("findNone"));
      return;
    }
    editor.chain().focus().insertContentAt(found, replaceValue).run();
  }

  function replaceAll() {
    findAnchor.current = null;
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
    const prepared = await prepareImage(file, file.name);
    if (!prepared || (prepared.src.startsWith("data:") && prepared.src.length * 0.75 > MAX_IMAGE_BYTES * 1.4)) {
      setFindNote(t("reasonImageSize"));
      return;
    }
    const attrs = imageAttrs(prepared);
    const current = editorRef.current;
    if (current?.state.selection instanceof NodeSelection) {
      current.chain().focus().insertContentAt(current.state.selection.to, { type: "image", attrs }).run();
      return;
    }
    const chain = chainWithRange();
    chain?.insertContent({ type: "image", attrs }).run();
  }

  function applyLink() {
    if (!editor) return;
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError(t("reasonLink"));
      return;
    }
    const chain = chainWithRange();
    chain?.extendMarkRange("link").setLink({ href }).run();
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
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) => selectTab(id)}
        tabsSnapshot={() => (editor ? withActive(editor.getJSON() as JsonNode) : tabsRef.current)}
        onTabsChange={(next, select) => {
          // Guarda primero lo escrito en la pestaña activa
          const active = editor ? (editor.getJSON() as JsonNode) : undefined;
          const merged = next.map((tab) => (tab.id === activeRef.current && active ? { ...tab, content: active } : tab));
          tabsRef.current = merged;
          setTabs(merged);
          const target = select ?? (merged.some((tab) => tab.id === activeRef.current) ? activeRef.current : merged[0]!.id);
          if (target !== activeRef.current) selectTab(target, true);
          else if (active) queue.note(snapshotOf(active));
        }}
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
        onLink={() => {
          keepRange();
          setLinkOpen(true);
        }}
        onImage={(file) => void addImage(file)}
        onComment={() => {
          keepRange();
          setCommentOpen(true);
        }}
        onCapture={keepRange}
        onVersions={() => setVersionsOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onPrint={() => window.print()}
        onCopy={() => void makeCopy()}
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
        columns={layout.columns}
        dropCap={layout.dropCap}
        watermark={layout.watermark}
        pageNumber={layout.pageNumber}
        pageSize={layout.pageSize}
        pageOrientation={layout.pageOrientation}
        pageMargin={layout.pageMargin}
        onLayout={(patch) => {
          const next = { ...layoutRef.current, ...patch };
          layoutRef.current = next;
          setLayout(next);
          if (editor) queue.note(snapshotOf(editor.getJSON() as JsonNode));
        }}
        rail={rev >= 0 ? (
          <CommentsRail
            editor={editor}
            comments={commentsRef.current}
            t={t}
            locale={locale}
            narrow={phone}
            onChange={(next) => {
              commentsRef.current = next;
              if (editor) queue.note(snapshotOf(editor.getJSON() as JsonNode));
              setRev((value) => value + 1);
            }}
          />
        ) : null}
        words={`${counts.words === 1 ? t("wordOne") : t("words", { count: counts.words })} · ${t("characters", { count: counts.characters })}`}
        find={findOpen ? (
          <form
            className="ow-find ow-docs-find"
            onPointerDown={pinFindSelection}
            onMouseDown={(event) => {
              const target = event.target;
              if (target instanceof HTMLElement && target.closest("button")) event.preventDefault();
            }}
            onSubmit={(event) => {
              event.preventDefault();
              findNext();
            }}
          >
            <Input label={t("find")} value={findQuery} onChange={(event) => setFindQuery(event.target.value)} />
            <Input label={t("replace")} value={replaceValue} onChange={(event) => setReplaceValue(event.target.value)} />
            <Button type="submit">{t("findNext")}</Button>
            <Button onClick={findPrevious}>{t("findPrev")}</Button>
            <Button onClick={replaceOne}>{t("replaceOne")}</Button>
            <Button onClick={replaceAll}>{t("replaceAll")}</Button>
            <Button onClick={() => { findAnchor.current = null; setFindOpen(false); }}>{t("closeFind")}</Button>
            {findNote ? <p role="status">{findNote}</p> : null}
          </form>
        ) : null}
      />
      <LayoutTools editor={editor} t={t} />
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
                const range = rangeRef.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
                const quote = editor.state.doc.textBetween(range.from, range.to, " ").slice(0, 180);
                const id = createId();
                commentsRef.current = [...commentsRef.current, { id, quote, body: commentBody.trim().slice(0, 2000), createdAt: new Date().toISOString() }];
                const markType = editor.schema.marks.comment;
                if (markType && range.to > range.from) editor.view.dispatch(editor.state.tr.addMark(range.from, range.to, markType.create({ id })));
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
