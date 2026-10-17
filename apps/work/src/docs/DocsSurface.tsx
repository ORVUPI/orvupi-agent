import type { Mark } from "@tiptap/pm/model";
import { EditorContent, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, Highlighter, Image as ImageIcon, Link2, List, ListChecks, ListOrdered, MessageSquare, Minus, Paintbrush, Pencil, Plus, Printer, Redo2, RemoveFormatting, Search, SpellCheck2, Star, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MessageKey } from "../i18n";
import { MenuBar } from "../ui/menus";
import { chartPng, drawingPng } from "./inserts";
import type { JsonNode } from "./model";

type ExportKind = "pdf" | "html" | "txt" | "orvdoc" | "docx";

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 96;
const CM = 96 / 2.54;

const FONTS = ["Arial", "Times New Roman", "Georgia", "Verdana", "Courier New", "Comic Sans MS", "Roboto", "Inter", "Lora", "Merriweather", "Montserrat"];
const POINTS = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
const ZOOMS = [50, 75, 100, 125, 150];
const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
  "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
  "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
  "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130",
];
const HIGHLIGHT_COLORS = [
  "#fff4b8", "#fff2cc", "#ffe599", "#d9ead3", "#b6d7a8", "#d0e0e3", "#a2c4c9", "#cfe2f3", "#a4c2f4", "#d9d2e9",
  "#fde2ea", "#ead1dc", "#f4cccc", "#fce5cd", "#d9f5e4", "#e6b8af", "#ffffff", "#efefef", "#fffde7", "#e8f5e9",
];
const BORDER_COLORS = ["#102032", "#1d4e89", "#ad1645", "#0b5d36", "#9a3412"];
const CELL_COLORS = ["#fff4b8", "#d9f5e4", "#dbe7f5", "#fde2ea", "#ffffff"];
const HEX = /^#[0-9a-f]{6}$/i;

type TextRange = { from: number; to: number };

function cssFamily(name: string): string {
  return name.includes(" ") ? `"${name}"` : name;
}

function plainFont(raw: unknown): string {
  const value = String(raw ?? "").replaceAll('"', "").replaceAll("'", "").split(",")[0]?.trim() ?? "";
  return FONTS.find((font) => font.toLowerCase() === value.toLowerCase()) ?? "Arial";
}

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function shownPoint(raw: unknown): number {
  if (typeof raw !== "string" || raw.length === 0) return 11;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 11;
  const points = raw.endsWith("px") ? parsed * 0.75 : parsed;
  return Math.min(400, Math.max(1, Math.round(points)));
}

function keepPointer(event: { target: EventTarget | null; preventDefault: () => void }) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
  event.preventDefault();
}

function headingsOf(node: JsonNode | undefined, out: Array<{ text: string; level: number }> = []): Array<{ text: string; level: number }> {
  if (!node) return out;
  if (node.type === "heading") {
    const text = (node.content ?? []).map((child) => child.text ?? "").join("").trim();
    const level = Number(node.attrs?.level ?? 1);
    if (text) out.push({ text, level });
  }
  for (const child of node.content ?? []) headingsOf(child, out);
  return out;
}

function RulerH() {
  const ticks = [];
  for (let mm = 0; mm <= 210; mm += 1) {
    const major = mm % 10 === 0;
    const mid = mm % 5 === 0;
    ticks.push(<i key={mm} className={major ? "is-cm" : mid ? "is-mid" : ""} style={{ left: (mm / 10) * CM }} />);
  }
  const labels = [];
  for (let cm = 1; cm <= 15; cm += 1) labels.push(<span key={cm} style={{ left: MARGIN + cm * CM }}>{cm}</span>);
  return (
    <div className="ow-hruler" aria-hidden="true" style={{ width: PAGE_W }}>
      <em style={{ width: MARGIN }} />
      <em className="is-end" style={{ width: MARGIN }} />
      {ticks}
      {labels}
      <b style={{ left: MARGIN - 1 }} />
      <b className="is-bar" style={{ left: MARGIN + 8 }} />
      <b className="is-end" style={{ right: MARGIN - 1 }} />
    </div>
  );
}

function RulerV() {
  const ticks = [];
  for (let mm = 0; mm <= 297; mm += 5) {
    ticks.push(<i key={mm} className={mm % 10 === 0 ? "is-cm" : ""} style={{ top: (mm / 10) * CM }} />);
  }
  const labels = [];
  for (let cm = 1; cm <= 24; cm += 1) labels.push(<span key={cm} style={{ top: MARGIN + cm * CM }}>{cm}</span>);
  return (
    <div className="ow-vruler" aria-hidden="true" style={{ height: PAGE_H }}>
      <em style={{ height: MARGIN }} />
      <em className="is-end" style={{ height: MARGIN }} />
      {ticks}
      {labels}
    </div>
  );
}

function ToolMenu({
  label,
  value,
  options,
  wide,
  onPick,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string; family?: string }>;
  wide?: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className={`ow-tool-select ${wide ? "is-wide" : ""}`} ref={ref} onMouseDown={keepPointer}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label} ${value}`} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)}>
        <span>{value}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.label === value || option.id === value}
              style={option.family ? { fontFamily: option.family } : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onPick(option.id);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocIcon({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="ow-doc-icon" aria-label={label} aria-pressed={pressed} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function DocsSurface({
  t,
  editor,
  name,
  saveLabel,
  starred,
  onName,
  onCommit,
  onStar,
  onClose,
  onExport,
  onFind,
  onLink,
  onImage,
  onComment,
  onVersions,
  onShortcuts,
  onPrint,
  onCapture,
  header,
  footer,
  onHeader,
  onFooter,
  columns = 1,
  dropCap = false,
  watermark = "",
  pageNumber = false,
  onLayout,
  find,
  words,
}: {
  t: Translate;
  editor: Editor | null;
  name: string;
  saveLabel: string;
  starred: boolean;
  onName: (value: string) => void;
  onCommit: () => void;
  onStar: () => void;
  onClose: () => void;
  onExport: (kind: ExportKind) => void;
  onFind: () => void;
  onLink: () => void;
  onImage: (file: File) => void;
  onComment: () => void;
  onVersions: () => void;
  onShortcuts: () => void;
  onPrint: () => void;
  onCapture?: () => void;
  header: string;
  footer: string;
  onHeader: (value: string) => void;
  onFooter: (value: string) => void;
  columns?: 1 | 2 | 3;
  dropCap?: boolean;
  watermark?: string;
  pageNumber?: boolean;
  onLayout?: (patch: { columns?: 1 | 2 | 3; dropCap?: boolean; watermark?: string; pageNumber?: boolean }) => void;
  find: ReactNode;
  words: string;
}) {
  const [menus, setMenus] = useState(true);
  const [ruler, setRuler] = useState(true);
  const [zoom, setZoom] = useState(100);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth));
  const [inset, setInset] = useState(0);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [spell, setSpell] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [brush, setBrush] = useState(false);
  const [tabMenu, setTabMenu] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(true);
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<TextRange | null>(null);
  const brushRef = useRef<readonly Mark[] | null>(null);
  const brushRange = useRef<TextRange | null>(null);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const measure = () => setPane(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const apply = (value: number) => {
      setInset(Math.max(0, value));
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const element = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (value > 0) element?.scrollIntoView({ block: "center" });
    };
    const onCustom = (event: Event) => apply(Number((event as CustomEvent<number>).detail) || 0);
    const viewport = window.visualViewport;
    const onViewport = () => {
      if (!viewport) return;
      apply(window.innerHeight - viewport.height - viewport.offsetTop);
    };
    window.addEventListener("ow-keyboard-inset", onCustom);
    viewport?.addEventListener("resize", onViewport);
    viewport?.addEventListener("scroll", onViewport);
    return () => {
      window.removeEventListener("ow-keyboard-inset", onCustom);
      viewport?.removeEventListener("resize", onViewport);
      viewport?.removeEventListener("scroll", onViewport);
    };
  }, []);
  const narrow = pane < PAGE_W + 8;
  const shownZoom = narrow ? 1 : zoom / 100;
  const point = shownPoint(editor?.getAttributes("textStyle")?.fontSize);
  const font = plainFont(editor?.getAttributes("textStyle")?.fontFamily);
  const style = editor?.isActive("heading", { level: 1 })
    ? "1"
    : editor?.isActive("heading", { level: 2 })
      ? "2"
      : editor?.isActive("heading", { level: 3 })
        ? "3"
        : "0";
  const headings = editor ? headingsOf(editor.getJSON() as JsonNode) : [];

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((value) => value + 1);
    editor.on("transaction", bump);
    return () => {
      editor.off("transaction", bump);
    };
  }, [editor]);

  useEffect(() => {
    const root = document.querySelector(".ow-a4 .ProseMirror");
    if (!root) return;
    const clear = () => {
      selectionRef.current = null;
    };
    root.addEventListener("mousedown", clear);
    return () => root.removeEventListener("mousedown", clear);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const timer = window.setTimeout(() => {
      try {
        editor.setEditable(mode === "edit");
        const node = document.querySelector(".ow-a4 .ProseMirror");
        if (node instanceof HTMLElement) node.spellcheck = spell;
      } catch {
        // The editor view is created after the first paint.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editor, mode, spell]);

  useEffect(() => {
    if (!brush || !editor) return;
    const apply = () => {
      const marks = brushRef.current;
      if (!marks) return;
      const { from, to, empty } = editor.state.selection;
      const origin = brushRange.current;
      if (empty || (origin && origin.from === from && origin.to === to)) return;
      brushRef.current = null;
      brushRange.current = null;
      setBrush(false);
      editor.chain().focus().command(({ tr, state }) => {
        const range = state.selection;
        if (range.empty) return false;
        for (const name of ["bold", "italic", "underline", "strike", "textStyle"]) {
          const type = state.schema.marks[name];
          if (type) tr.removeMark(range.from, range.to, type);
        }
        for (const mark of marks) tr.addMark(range.from, range.to, mark);
        return true;
      }).run();
    };
    editor.on("selectionUpdate", apply);
    return () => {
      editor.off("selectionUpdate", apply);
    };
  }, [editor, brush]);

  useEffect(() => {
    if (!editor) return;
    const node = document.querySelector(".ow-a4 .ProseMirror");
    if (!node) return;
    const open = (event: Event) => {
      if (!editor.isActive("table")) return;
      const mouse = event as MouseEvent;
      mouse.preventDefault();
      const width = 280;
      const height = 420;
      setContext({
        x: Math.max(8, Math.min(mouse.clientX, window.innerWidth - width)),
        y: Math.max(8, Math.min(mouse.clientY, window.innerHeight - height)),
      });
    };
    node.addEventListener("contextmenu", open);
    return () => node.removeEventListener("contextmenu", open);
  }, [editor]);

  useEffect(() => {
    if (!context) return;
    const close = (event: PointerEvent) => {
      if (!contextRef.current?.contains(event.target as Node)) setContext(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContext(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [context]);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [exportOpen]);

  function rememberSelection() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const saved = selectionRef.current;
    if (from === to && saved && saved.from !== saved.to) return;
    selectionRef.current = { from, to };
    onCapture?.();
  }

  function holdPointer(event: { target: EventTarget | null; preventDefault: () => void }) {
    const target = event.target;
    const field = target instanceof HTMLElement && target.closest("input, textarea, select");
    if (!field) rememberSelection();
    keepPointer(event);
  }

  function run(command: () => boolean | void) {
    if (mode === "view" || !editor) return;
    const saved = selectionRef.current;
    const current = editor.state.selection;
    if (saved && current.empty && saved.from !== saved.to) editor.commands.setTextSelection(saved);
    command();
  }

  function applySize(next: number) {
    if (!Number.isFinite(next)) return;
    const size = Math.min(400, Math.max(1, Math.round(next)));
    run(() => editor?.chain().focus().setFontSize(`${size}pt`).run());
  }

  function copyFormat() {
    if (!editor || mode === "view") return;
    const { from, to, empty } = editor.state.selection;
    const pos = empty ? from : Math.min(to, from + 1);
    brushRange.current = { from, to };
    brushRef.current = editor.state.doc.resolve(pos).marks();
    setBrush(true);
  }

  function tableCommand(command: () => boolean | void) {
    run(command);
    setContext(null);
  }

  function bumpIndent(delta: number) {
    if (!editor) return;
    if (editor.isActive("taskItem")) {
      run(() => (delta > 0 ? editor.chain().focus().sinkListItem("taskItem").run() : editor.chain().focus().liftListItem("taskItem").run()));
      return;
    }
    if (editor.isActive("listItem")) {
      run(() => (delta > 0 ? editor.chain().focus().sinkListItem("listItem").run() : editor.chain().focus().liftListItem("listItem").run()));
      return;
    }
    const type = editor.isActive("heading") ? "heading" : "paragraph";
    const current = Number(editor.getAttributes(type).indent ?? 0);
    run(() => updateBlocks(editor, { indent: Math.max(0, Math.min(8, current + delta)) }));
  }

  const block = editor?.isActive("heading") ? "heading" : "paragraph";
  const align = String(editor?.getAttributes(block)?.textAlign ?? "left");

  return (
    <div className={`ow-docs${narrow ? " is-narrow" : ""}`} data-tool="docs">
      <header className="ow-docs-head">
        <div className="ow-docs-titlebar">
          <button type="button" className="ow-docs-logo" aria-label={t("closeDoc")} onClick={onClose}>
            <img src="/avatar.png" alt="" width={40} height={40} />
          </button>
          <div className="ow-docs-titleblock">
            <div className="ow-docs-titlerow">
              <input
                className="ow-docs-name"
                aria-label={t("fileName")}
                value={name}
                onChange={(event) => onName(event.target.value)}
                onBlur={onCommit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <button type="button" className={`ow-doc-icon ${starred ? "is-on" : ""}`} aria-label={t("star")} aria-pressed={starred} onClick={onStar}>
                <Star size={20} />
              </button>
              <p role="status" className="ow-docs-save">{saveLabel}</p>
            </div>
            {menus ? (
              <nav className="ow-docs-menus" aria-label={t("menuBar")} onMouseDown={holdPointer}>
                <MenuInline t={t} editor={editor} run={run} onClose={onClose} onExport={onExport} onFind={onFind} onLink={onLink} onImage={() => { rememberSelection(); fileRef.current?.click(); }} onComment={onComment} onVersions={onVersions} onShortcuts={onShortcuts} onPrint={onPrint} onRuler={() => setRuler((value) => !value)} onZoom={setZoom} onMode={setMode} onHeaderFocus={() => document.querySelector<HTMLInputElement>(".ow-a4-edge")?.focus()} onFooterFocus={() => document.querySelectorAll<HTMLInputElement>(".ow-a4-edge")[1]?.focus()} onPageNumber={() => onLayout?.({ pageNumber: !pageNumber })} onColumns={() => onLayout?.({ columns: columns === 1 ? 2 : columns === 2 ? 3 : 1 })} onDropCap={() => onLayout?.({ dropCap: !dropCap })} onWatermark={() => onLayout?.({ watermark: watermark ? "" : "ORVUPI" })} onChart={() => run(() => editor?.chain().focus().setImage({ src: chartPng(), alt: t("docChart") }).run())} onDrawing={() => { const src = drawingPng(); if (src) run(() => editor?.chain().focus().setImage({ src, alt: t("docDrawing") }).run()); }} onEquation={() => run(() => editor?.chain().focus().insertContent({ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "E = mc²", marks: [{ type: "italic" }] }] }).run())} />
              </nav>
            ) : null}
          </div>
          <div className="ow-docs-actions">
            <DocIcon label={t("comment")} onClick={onComment}><MessageSquare size={20} /></DocIcon>
            <div className="ow-share" ref={exportRef}>
              <button type="button" className="ow-share-main" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen(true)}>
                {t("export")}
              </button>
              <button type="button" className="ow-share-caret" aria-label={t("exportFormats")} aria-expanded={exportOpen} onClick={() => setExportOpen((value) => !value)}>
                <ChevronDown size={18} />
              </button>
              {exportOpen ? (
                <div role="menu" aria-label={t("export")}>
                  {(["pdf", "html", "txt", "docx", "orvdoc"] as const).map((kind) => (
                    <button key={kind} type="button" role="menuitem" onClick={() => { onExport(kind); setExportOpen(false); }}>
                      {kind === "orvdoc" ? "ORVDOC" : kind.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="ow-docs-avatar" aria-hidden="true">O</span>
          </div>
        </div>
      </header>
      {menus ? (
        <div className={`ow-docs-toolwrap${narrow ? " is-narrow" : ""}`}>
          <div className="ow-docs-toolbar" role="toolbar" aria-label={t("toolbarLabel")} onMouseDown={holdPointer}>
            <DocIcon label={t("find")} onClick={onFind}><Search size={20} /></DocIcon>
            <DocIcon label={t("undo")} onClick={() => run(() => editor?.chain().focus().undo().run())}><Undo2 size={20} /></DocIcon>
            <DocIcon label={t("redo")} onClick={() => run(() => editor?.chain().focus().redo().run())}><Redo2 size={20} /></DocIcon>
            <DocIcon label={t("print")} onClick={onPrint}><Printer size={20} /></DocIcon>
            <DocIcon label={t("spell")} pressed={spell} onClick={() => setSpell((value) => !value)}><SpellCheck2 size={20} /></DocIcon>
            <DocIcon label={t("paint")} pressed={brush} onClick={copyFormat}><Paintbrush size={20} /></DocIcon>
            <ToolMenu label={t("zoomLabel")} value={`${zoom}%`} options={ZOOMS.map((value) => ({ id: String(value), label: `${value}%` }))} onPick={(id) => setZoom(Number(id))} />
            <i className="ow-tool-gap" />
            <ToolMenu
              wide
              label={t("styleLabel")}
              value={style === "0" ? t("styleNormal") : t(style === "1" ? "heading1" : style === "2" ? "heading2" : "heading3")}
              options={[
                { id: "0", label: t("styleNormal") },
                { id: "1", label: t("heading1") },
                { id: "2", label: t("heading2") },
                { id: "3", label: t("heading3") },
              ]}
              onPick={(id) => run(() => {
                if (!editor) return;
                if (id === "0") editor.chain().focus().setParagraph().run();
                else editor.chain().focus().setHeading({ level: Number(id) as 1 | 2 | 3 }).run();
              })}
            />
            <ToolMenu label={t("fontLabel")} value={font} wide options={FONTS.map((item) => ({ id: item, label: item, family: cssFamily(item) }))} onPick={(id) => run(() => editor?.chain().focus().setFontFamily(cssFamily(id)).run())} />
            <SizeBox t={t} point={point} onApply={applySize} onRemember={rememberSelection} />
            <DocIcon label={t("bold")} pressed={editor?.isActive("bold")} onClick={() => run(() => editor?.chain().focus().toggleBold().run())}><strong aria-hidden="true">B</strong></DocIcon>
            <DocIcon label={t("italic")} pressed={editor?.isActive("italic")} onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}><em aria-hidden="true">I</em></DocIcon>
            <DocIcon label={t("underline")} pressed={editor?.isActive("underline")} onClick={() => run(() => editor?.chain().focus().toggleUnderline().run())}><span className="ow-u" aria-hidden="true">U</span></DocIcon>
            <DocIcon label={t("strike")} pressed={editor?.isActive("strike")} onClick={() => run(() => editor?.chain().focus().toggleStrike().run())}><span className="ow-s" aria-hidden="true">S</span></DocIcon>
            <ColorMenu t={t} editor={editor} run={run} kind="color" />
            <ColorMenu t={t} editor={editor} run={run} kind="highlight" />
            <i className="ow-tool-gap" />
            <DocIcon label={t("link")} onClick={onLink}><Link2 size={20} /></DocIcon>
            <DocIcon label={t("comment")} onClick={onComment}><MessageSquare size={20} /></DocIcon>
            <DocIcon label={t("image")} onClick={() => { rememberSelection(); fileRef.current?.click(); }}><ImageIcon size={20} /></DocIcon>
            <i className="ow-tool-gap" />
            <ToolMenu
              label={t("alignMenu")}
              value={align === "center" ? t("alignCenter") : align === "right" ? t("alignRight") : align === "justify" ? t("alignJustify") : t("alignLeft")}
              options={[
                { id: "left", label: t("alignLeft") },
                { id: "center", label: t("alignCenter") },
                { id: "right", label: t("alignRight") },
                { id: "justify", label: t("alignJustify") },
              ]}
              onPick={(id) => run(() => editor?.chain().focus().setTextAlign(id).run())}
            />
            <ToolMenu
              label={t("lineHeight")}
              value={String(editor?.getAttributes(block)?.lineHeight ?? "1.15")}
              options={["1", "1.15", "1.5", "2"].map((id) => ({ id, label: id }))}
              onPick={(id) => run(() => { if (editor) updateBlocks(editor, { lineHeight: id }); })}
            />
            <DocIcon label={t("checklist")} pressed={editor?.isActive("taskList")} onClick={() => run(() => editor?.chain().focus().toggleTaskList().run())}><ListChecks size={20} /></DocIcon>
            <DocIcon label={t("bullet")} pressed={editor?.isActive("bulletList")} onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())}><List size={20} /></DocIcon>
            <DocIcon label={t("ordered")} pressed={editor?.isActive("orderedList")} onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())}><ListOrdered size={20} /></DocIcon>
            <DocIcon label={t("indentLess")} onClick={() => bumpIndent(-1)}><span className="ow-indent" aria-hidden="true">←</span></DocIcon>
            <DocIcon label={t("indentMore")} onClick={() => bumpIndent(1)}><span className="ow-indent" aria-hidden="true">→</span></DocIcon>
            <DocIcon label={t("clearFormat")} onClick={() => run(() => editor?.chain().focus().unsetAllMarks().clearNodes().run())}><RemoveFormatting size={20} /></DocIcon>
            <span className="ow-tool-grow" />
            <ToolMenu
              label={t("modeLabel")}
              value={mode === "edit" ? t("modeEdit") : t("modeView")}
              options={[
                { id: "edit", label: t("modeEdit") },
                { id: "view", label: t("modeView") },
              ]}
              onPick={(id) => setMode(id === "view" ? "view" : "edit")}
            />
            <DocIcon label={t("hideMenus")} onClick={() => setMenus(false)}><ChevronUp size={20} /></DocIcon>
          </div>
        </div>
      ) : (
        <div className={`ow-docs-toolwrap is-collapsed${narrow ? " is-narrow" : ""}`}>
          <DocIcon label={t("showMenus")} onClick={() => setMenus(true)}><Pencil size={18} /></DocIcon>
        </div>
      )}
      {find}
      <div className="ow-docs-body">
        {tabsOpen ? <aside className="ow-docs-tabs" aria-label={t("outlineTitle")}>
          <div className="ow-docs-tabhead">
            <button type="button" aria-label={t("outlineTitle")} onClick={() => setTabsOpen(false)}>‹</button>
            <strong>{t("outlineTitle")}</strong>
            <button type="button" aria-label={t("heading1")} onClick={() => run(() => editor?.chain().focus("end").insertContent({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: t("heading1") }] }).run())}>+</button>
          </div>
          <div className="ow-docs-tab">
            <img src="/avatar.png" alt="" width={18} height={18} />
            <span>{name}</span>
            <button type="button" aria-label={t("menu")} aria-expanded={tabMenu} onClick={() => setTabMenu((value) => !value)}>⋮</button>
            {tabMenu ? (
              <div role="menu" aria-label={name}>
                <button type="button" role="menuitem" onClick={() => { setTabMenu(false); onClose(); }}>{t("closeDoc")}</button>
              </div>
            ) : null}
          </div>
          {headings.length === 0 ? <p className="ow-docs-outline-empty">{t("outlineEmpty")}</p> : (
            <ol className="ow-docs-outline">
              {headings.map((item) => <li key={`${item.level}-${item.text}`} data-level={item.level}>{item.text}</li>)}
            </ol>
          )}
        </aside> : (
          <button type="button" className="ow-docs-tabs-open" aria-label={t("outlineTitle")} onClick={() => setTabsOpen(true)}>›</button>
        )}
        <div className="ow-docs-scroll" ref={scrollRef} style={{ paddingBottom: inset + (narrow ? 64 : 48) }}>
          <div className={`ow-docs-sheet${narrow ? " is-flow" : ""}`} style={{ zoom: shownZoom }}>
            {ruler && !narrow ? <div className="ow-ruler-row"><div className="ow-vruler-spacer" /><RulerH /></div> : null}
            <div className="ow-docs-page-row">
              {ruler && !narrow ? <RulerV /> : null}
              <article className={`ow-a4${narrow ? " is-flow" : ""}${columns === 2 ? " is-cols-2" : columns === 3 ? " is-cols-3" : ""}${dropCap ? " is-dropcap" : ""}`} style={narrow ? undefined : { width: PAGE_W, minHeight: PAGE_H }}>
                {watermark ? <p className="ow-watermark" aria-hidden="true">{watermark}</p> : null}
                <input className="ow-a4-edge" aria-label={t("header")} value={header} placeholder={t("header")} onChange={(event) => onHeader(event.target.value.slice(0, 240))} />
                <div className="ow-a4-body">
                  <EditorContent editor={editor} />
                </div>
                <div className="ow-a4-foot">
                  <input className="ow-a4-edge" aria-label={t("footer")} value={footer} placeholder={t("footer")} onChange={(event) => onFooter(event.target.value.slice(0, 240))} />
                  {pageNumber ? <span className="ow-page-num" aria-label={t("pageNumber")}>1</span> : null}
                </div>
              </article>
            </div>
          </div>
          <p className="ow-count" aria-live="polite">{words}</p>
        </div>
      </div>
      {narrow ? (
        <div className="ow-format-dock" role="toolbar" aria-label={t("toolbarLabel")}>
          <div className="ow-format-scroll" ref={dockRef}>
            <DocIcon label={t("bold")} pressed={editor?.isActive("bold")} onClick={() => run(() => editor?.chain().focus().toggleBold().run())}><strong>B</strong></DocIcon>
            <DocIcon label={t("italic")} pressed={editor?.isActive("italic")} onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}><em>I</em></DocIcon>
            <DocIcon label={t("underline")} pressed={editor?.isActive("underline")} onClick={() => run(() => editor?.chain().focus().toggleUnderline().run())}><span className="ow-u">U</span></DocIcon>
            <DocIcon label={t("alignLeft")} pressed={align === "left"} onClick={() => run(() => editor?.chain().focus().setTextAlign("left").run())}>≡</DocIcon>
            <DocIcon label={t("alignCenter")} pressed={align === "center"} onClick={() => run(() => editor?.chain().focus().setTextAlign("center").run())}>☰</DocIcon>
            <DocIcon label={t("bullet")} pressed={editor?.isActive("bulletList")} onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())}><List size={20} /></DocIcon>
            <DocIcon label={t("ordered")} pressed={editor?.isActive("orderedList")} onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())}><ListOrdered size={20} /></DocIcon>
            <DocIcon label={t("checklist")} pressed={editor?.isActive("taskList")} onClick={() => run(() => editor?.chain().focus().toggleTaskList().run())}><ListChecks size={20} /></DocIcon>
            <DocIcon label={t("table")} onClick={() => run(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><span aria-hidden="true">⊞</span></DocIcon>
            <ToolMenu label={t("fontLabel")} value={font} options={FONTS.map((item) => ({ id: item, label: item, family: cssFamily(item) }))} onPick={(id) => run(() => editor?.chain().focus().setFontFamily(cssFamily(id)).run())} />
            <SizeBox t={t} point={point} onApply={applySize} onRemember={rememberSelection} />
            <ColorMenu t={t} editor={editor} run={run} kind="color" />
            <ColorMenu t={t} editor={editor} run={run} kind="highlight" />
            <DocIcon label={t("clearFormat")} onClick={() => run(() => editor?.chain().focus().unsetAllMarks().clearNodes().run())}><RemoveFormatting size={20} /></DocIcon>
            <span className="ow-dock-end" aria-hidden="true" />
          </div>
          <button type="button" className="ow-dock-more" aria-label={t("moreFormat")} onMouseDown={(event) => event.preventDefault()} onClick={() => dockRef.current?.scrollBy({ left: 160 })}>›</button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        className="ow-sr"
        aria-label={t("image")}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onImage(file);
        }}
      />
      {context && editor ? (
        <div
          ref={contextRef}
          className="ow-table-context"
          role="menu"
          aria-label={t("tableProps")}
          style={{ left: context.x, top: context.y }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().addRowBefore().run())}>{t("rowAbove")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().addRowAfter().run())}>{t("rowBelow")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().addColumnBefore().run())}>{t("colLeft")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().addColumnAfter().run())}>{t("colRight")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().deleteRow().run())}>{t("deleteRow")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().deleteColumn().run())}>{t("deleteCol")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().deleteTable().run())}>{t("deleteTable")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().mergeCells().run())}>{t("mergeCells")}</button>
          <button type="button" role="menuitem" onClick={() => tableCommand(() => editor.chain().focus().splitCell().run())}>{t("splitCell")}</button>
          <p>{t("borderColor")}</p>
          <div className="ow-swatches">
            {BORDER_COLORS.map((color) => (
              <button key={color} type="button" aria-label={`${t("borderColor")} ${color}`} style={{ background: color }} onClick={() => tableCommand(() => paintTableBorder(editor, color))} />
            ))}
          </div>
          <label>
            {t("customColor")}
            <input aria-label={t("borderColor")} type="color" defaultValue="#102032" onInput={(event) => paintTableBorder(editor, event.currentTarget.value)} />
          </label>
          <p>{t("cellColor")}</p>
          <div className="ow-swatches">
            {CELL_COLORS.map((color) => (
              <button key={color} type="button" aria-label={`${t("cellColor")} ${color}`} style={{ background: color }} onClick={() => tableCommand(() => editor.chain().focus().setCellAttribute("background", color).run())} />
            ))}
          </div>
          <label>
            {t("customColor")}
            <input aria-label={t("cellColor")} type="color" defaultValue="#fff4b8" onInput={(event) => {
              const value = event.currentTarget.value;
              if (HEX.test(value)) editor.chain().focus().setCellAttribute("background", value).run();
            }} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function updateBlocks(editor: Editor, attributes: Record<string, unknown>) {
  return editor.chain().focus().command(({ tr, state }) => {
    const { from, to } = state.selection;
    let changed = false;
    const touch = (name: string, attrs: Record<string, unknown>, pos: number) => {
      if (name !== "paragraph" && name !== "heading") return;
      tr.setNodeMarkup(pos, undefined, { ...attrs, ...attributes });
      changed = true;
    };
    state.doc.nodesBetween(from, to, (node, pos) => {
      touch(node.type.name, node.attrs, pos);
    });
    if (!changed) {
      const { $from } = state.selection;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          touch(node.type.name, node.attrs, $from.before(depth));
          break;
        }
      }
    }
    return changed;
  }).run();
}

function paintTableBorder(editor: Editor, color: string) {
  if (!HEX.test(color)) return false;
  return editor.chain().focus().command(({ tr, state }) => {
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name !== "table") continue;
      const pos = $from.before(depth);
      tr.setNodeMarkup(pos, undefined, { ...$from.node(depth).attrs, borderColor: color });
      return true;
    }
    return false;
  }).run();
}

function SizeBox({
  t,
  point,
  onApply,
  onRemember,
}: {
  t: Translate;
  point: number;
  onApply: (size: number) => void;
  onRemember: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(point));
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(point));
  }, [point]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  function commit(raw: string) {
    const next = Number.parseInt(raw, 10);
    if (!Number.isInteger(next)) {
      setDraft(String(point));
      return;
    }
    onApply(next);
    setDraft(String(Math.min(400, Math.max(1, next))));
  }
  return (
    <div className="ow-sizebox" ref={ref}>
      <DocIcon label={t("sizeDown")} onClick={() => onApply(point - 1)}><Minus size={18} /></DocIcon>
      <input
        aria-label={t("size")}
        inputMode="numeric"
        value={draft}
        onPointerDown={onRemember}
        onFocus={() => {
          focused.current = true;
          onRemember();
          setOpen(true);
        }}
        onBlur={() => {
          focused.current = false;
          commit(draft);
        }}
        onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
            setOpen(false);
          }
        }}
      />
      <DocIcon label={t("sizeUp")} onClick={() => onApply(point + 1)}><Plus size={18} /></DocIcon>
      {open ? (
        <div role="listbox" aria-label={t("size")}>
          {POINTS.map((size) => (
            <button
              key={size}
              type="button"
              role="option"
              aria-selected={size === point}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onApply(size);
                setDraft(String(size));
                setOpen(false);
              }}
            >
              {size}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ColorMenu({
  t,
  editor,
  run,
  kind,
}: {
  t: Translate;
  editor: Editor | null;
  run: (command: () => void) => void;
  kind: "color" | "highlight";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colors = kind === "color" ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const current = kind === "color"
    ? String(editor?.getAttributes("textStyle")?.color ?? "#102032")
    : String(editor?.getAttributes("textStyle")?.backgroundColor ?? "#fff4b8");
  const bar = HEX.test(current) ? current : kind === "color" ? "#102032" : "#fff4b8";
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  function apply(value: string) {
    if (!HEX.test(value)) return;
    run(() => {
      if (kind === "color") editor?.chain().focus().setColor(value).run();
      else editor?.chain().focus().setBackgroundColor(value).run();
    });
    setOpen(false);
  }
  return (
    <div className="ow-color-menu" ref={ref} onMouseDown={keepPointer}>
      <button type="button" className="ow-doc-icon ow-color-trigger" aria-label={t(kind === "color" ? "color" : "highlight")} aria-expanded={open} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((value) => !value)}>
        {kind === "color" ? <span aria-hidden="true">A</span> : <Highlighter size={16} aria-hidden="true" />}
        <i style={{ background: bar }} />
      </button>
      {open ? (
        <div role="menu" aria-label={t(kind === "color" ? "color" : "highlight")}>
          <div className="ow-color-grid">
            {colors.map((value) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                aria-label={value}
                aria-checked={value.toLowerCase() === bar.toLowerCase()}
                style={{ background: value }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(value)}
              />
            ))}
          </div>
          <label>
            {t("customColor")}
            <input
              aria-label={t("customColor")}
              type="color"
              value={bar}
              onMouseDown={(event) => event.stopPropagation()}
              onInput={(event) => apply(event.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              run(() => {
                if (kind === "color") editor?.chain().focus().unsetColor().run();
                else editor?.chain().focus().unsetBackgroundColor().run();
              });
              setOpen(false);
            }}
          >
            {t("clearColor")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuInline({
  t,
  editor,
  run,
  onClose,
  onExport,
  onFind,
  onLink,
  onImage,
  onComment,
  onVersions,
  onShortcuts,
  onPrint,
  onRuler,
  onZoom,
  onMode,
  onHeaderFocus,
  onFooterFocus,
  onPageNumber,
  onColumns,
  onDropCap,
  onWatermark,
  onChart,
  onDrawing,
  onEquation,
}: {
  t: Translate;
  editor: Editor | null;
  run: (command: () => void) => void;
  onClose: () => void;
  onExport: (kind: ExportKind) => void;
  onFind: () => void;
  onLink: () => void;
  onImage: () => void;
  onComment: () => void;
  onVersions: () => void;
  onShortcuts: () => void;
  onPrint: () => void;
  onRuler: () => void;
  onZoom: (value: number) => void;
  onMode: (mode: "edit" | "view") => void;
  onHeaderFocus: () => void;
  onFooterFocus: () => void;
  onPageNumber: () => void;
  onColumns: () => void;
  onDropCap: () => void;
  onWatermark: () => void;
  onChart: () => void;
  onDrawing: () => void;
  onEquation: () => void;
}) {
  return (
    <MenuBar
      label={t("menuBar")}
      menus={[
        { id: "file", label: t("menuFile"), items: [
          { id: "print", label: t("print"), hint: "Ctrl+P", onSelect: onPrint },
          { id: "export", label: t("export"), children: [
            { id: "pdf", label: "PDF", onSelect: () => onExport("pdf") },
            { id: "html", label: "HTML", onSelect: () => onExport("html") },
            { id: "txt", label: "TXT", onSelect: () => onExport("txt") },
            { id: "docx", label: "DOCX", onSelect: () => onExport("docx") },
          ] },
          { id: "close", label: t("closeDoc"), onSelect: onClose },
        ] },
        { id: "edit", label: t("menuEdit"), items: [
          { id: "undo", label: t("undo"), hint: "Ctrl+Z", onSelect: () => run(() => editor?.chain().focus().undo().run()) },
          { id: "redo", label: t("redo"), hint: "Ctrl+Y", onSelect: () => run(() => editor?.chain().focus().redo().run()) },
          { id: "find", label: t("findReplace"), hint: "Ctrl+F", onSelect: onFind },
        ] },
        { id: "view", label: t("menuView"), items: [
          { id: "ruler", label: t("showRuler"), onSelect: onRuler },
          { id: "zoom", label: t("zoomLabel"), children: [50, 75, 100, 125, 150].map((value) => ({ id: String(value), label: `${value}%`, onSelect: () => onZoom(value) })) },
          { id: "mode", label: t("modeLabel"), children: [
            { id: "edit", label: t("modeEdit"), onSelect: () => onMode("edit") },
            { id: "view", label: t("modeView"), onSelect: () => onMode("view") },
          ] },
        ] },
        { id: "insert", label: t("menuInsert"), items: [
          { id: "image", label: t("image"), onSelect: onImage },
          { id: "link", label: t("link"), hint: "Ctrl+K", onSelect: onLink },
          { id: "table", label: t("table"), table: (rows, cols) => run(() => editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()) },
          { id: "break", label: t("pageBreak"), onSelect: () => run(() => editor?.chain().focus().insertPageBreak().run()) },
          { id: "comment", label: t("comment"), onSelect: onComment },
          { id: "header", label: t("header"), onSelect: onHeaderFocus },
          { id: "footer", label: t("footer"), onSelect: onFooterFocus },
          { id: "page", label: t("pageNumber"), onSelect: onPageNumber },
          { id: "chart", label: t("docChart"), onSelect: onChart },
          { id: "draw", label: t("docDrawing"), onSelect: onDrawing },
          { id: "eq", label: t("equation"), onSelect: onEquation },
          { id: "water", label: t("watermark"), onSelect: onWatermark },
        ] },
        { id: "format", label: t("menuFormat"), items: [
          { id: "bold", label: t("bold"), hint: "Ctrl+B", onSelect: () => run(() => editor?.chain().focus().toggleBold().run()) },
          { id: "italic", label: t("italic"), hint: "Ctrl+I", onSelect: () => run(() => editor?.chain().focus().toggleItalic().run()) },
          { id: "underline", label: t("underline"), hint: "Ctrl+U", onSelect: () => run(() => editor?.chain().focus().toggleUnderline().run()) },
          { id: "strike", label: t("strike"), hint: "Alt+Mayús+5", onSelect: () => run(() => editor?.chain().focus().toggleStrike().run()) },
          { id: "clear", label: t("clearFormat"), onSelect: () => run(() => editor?.chain().focus().unsetAllMarks().clearNodes().run()) },
          { id: "align", label: t("alignMenu"), children: [
            { id: "left", label: t("alignLeft"), hint: "Ctrl+Mayús+L", onSelect: () => run(() => editor?.chain().focus().setTextAlign("left").run()) },
            { id: "center", label: t("alignCenter"), hint: "Ctrl+Mayús+E", onSelect: () => run(() => editor?.chain().focus().setTextAlign("center").run()) },
            { id: "right", label: t("alignRight"), hint: "Ctrl+Mayús+R", onSelect: () => run(() => editor?.chain().focus().setTextAlign("right").run()) },
            { id: "justify", label: t("alignJustify"), hint: "Ctrl+Mayús+J", onSelect: () => run(() => editor?.chain().focus().setTextAlign("justify").run()) },
          ] },
          { id: "columns", label: t("docColumns"), onSelect: onColumns },
          { id: "drop", label: t("dropCap"), onSelect: onDropCap },
          { id: "lists", label: t("bullet"), children: [
            { id: "bullets", label: t("bullet"), onSelect: () => run(() => editor?.chain().focus().toggleBulletList().run()) },
            { id: "numbers", label: t("ordered"), onSelect: () => run(() => editor?.chain().focus().toggleOrderedList().run()) },
            { id: "checks", label: t("checklist"), onSelect: () => run(() => editor?.chain().focus().toggleTaskList().run()) },
          ] },
        ] },
        { id: "tools", label: t("menuTools"), items: [
          { id: "versions", label: t("versions"), onSelect: onVersions },
        ] },
        { id: "ext", label: t("menuExtensions"), items: [
          { id: "none", label: t("noExtensions"), static: true },
        ] },
        { id: "help", label: t("menuHelp"), items: [
          { id: "keys", label: t("shortcuts"), hint: "Ctrl+/", onSelect: onShortcuts },
        ] },
      ]}
    />
  );
}
