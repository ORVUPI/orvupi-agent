import { EditorContent, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, Image as ImageIcon, Link2, List, ListChecks, ListOrdered, MessageSquare, Minus, Paintbrush, Pencil, Plus, Printer, Redo2, RemoveFormatting, Search, SpellCheck2, Star, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MessageKey } from "../i18n";
import { MenuBar } from "../ui/menus";
import type { JsonNode } from "./model";

type ExportKind = "pdf" | "html" | "txt" | "orvdoc" | "docx";

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 96;
const CM = 96 / 2.54;

const FONTS = ["Arial", "Inter", "Georgia", "Courier New"];
const POINTS = [8, 9, 10, 11, 12, 14, 18, 24, 36];
const ZOOMS = [50, 75, 100, 125, 150];

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function shownPoint(raw: unknown): number {
  if (typeof raw !== "string" || raw.length === 0) return 11;
  if (raw.endsWith("pt")) return Math.round(Number.parseFloat(raw)) || 11;
  if (raw.endsWith("px")) return Math.max(8, Math.round(Number.parseFloat(raw) * 0.75)) || 11;
  return 11;
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
  options: Array<{ id: string; label: string }>;
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
    <div className={`ow-tool-select ${wide ? "is-wide" : ""}`} ref={ref}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label} ${value}`} onClick={() => setOpen((current) => !current)}>
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
    <button type="button" className="ow-doc-icon" aria-label={label} aria-pressed={pressed} onClick={onClick}>
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
  header,
  footer,
  onHeader,
  onFooter,
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
  header: string;
  footer: string;
  onHeader: (value: string) => void;
  onFooter: (value: string) => void;
  find: ReactNode;
  words: string;
}) {
  const [menus, setMenus] = useState(true);
  const [ruler, setRuler] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [spell, setSpell] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [brush, setBrush] = useState(false);
  const [tabMenu, setTabMenu] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const point = shownPoint(editor?.getAttributes("textStyle")?.fontSize);
  const font = String(editor?.getAttributes("textStyle")?.fontFamily ?? "Arial");
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
    if (!brush) return;
    const apply = () => {
      if (!editor) return;
      const marks = editor.state.storedMarks ?? editor.state.selection.$from.marks();
      editor.chain().focus().command(({ tr, state }) => {
        const stored = marks.length > 0 ? marks : state.storedMarks;
        if (stored) tr.setStoredMarks(stored);
        return true;
      }).run();
      setBrush(false);
    };
    const node = document.querySelector(".ow-a4 .ProseMirror");
    node?.addEventListener("mouseup", apply);
    return () => node?.removeEventListener("mouseup", apply);
  }, [editor, brush]);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [exportOpen]);

  function run(command: () => boolean | void) {
    if (mode === "view" || !editor) return;
    command();
  }

  function bumpSize(delta: number) {
    const next = POINTS.reduce((best, value) => (Math.abs(value - (point + delta)) < Math.abs(best - (point + delta)) ? value : best), point);
    const target = POINTS.includes(point + delta) ? point + delta : next === point ? Math.min(36, Math.max(8, point + delta)) : next;
    run(() => editor?.chain().focus().setFontSize(`${target}pt`).run());
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
    run(() => editor.chain().focus().updateAttributes(type, { indent: Math.max(0, Math.min(8, current + delta)) }).run());
  }

  const block = editor?.isActive("heading") ? "heading" : "paragraph";
  const align = String(editor?.getAttributes(block)?.textAlign ?? "left");

  return (
    <div className="ow-docs" data-tool="docs">
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
              <nav className="ow-docs-menus" aria-label={t("menuBar")}>
                <MenuInline t={t} editor={editor} run={run} onClose={onClose} onExport={onExport} onFind={onFind} onLink={onLink} onImage={() => fileRef.current?.click()} onComment={onComment} onVersions={onVersions} onShortcuts={onShortcuts} onPrint={onPrint} onRuler={() => setRuler((value) => !value)} onZoom={setZoom} onMode={setMode} />
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
        <div className="ow-docs-toolwrap">
          <div className="ow-docs-toolbar" role="toolbar" aria-label={t("toolbarLabel")}>
            <DocIcon label={t("find")} onClick={onFind}><Search size={20} /></DocIcon>
            <DocIcon label={t("undo")} onClick={() => run(() => editor?.chain().focus().undo().run())}><Undo2 size={20} /></DocIcon>
            <DocIcon label={t("redo")} onClick={() => run(() => editor?.chain().focus().redo().run())}><Redo2 size={20} /></DocIcon>
            <DocIcon label={t("print")} onClick={onPrint}><Printer size={20} /></DocIcon>
            <DocIcon label={t("spell")} pressed={spell} onClick={() => setSpell((value) => !value)}><SpellCheck2 size={20} /></DocIcon>
            <DocIcon label={t("paint")} pressed={brush} onClick={() => setBrush(true)}><Paintbrush size={20} /></DocIcon>
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
            <ToolMenu label={t("fontLabel")} value={font.replaceAll('"', "")} wide options={FONTS.map((item) => ({ id: item, label: item }))} onPick={(id) => run(() => editor?.chain().focus().setFontFamily(id).run())} />
            <div className="ow-sizebox">
              <DocIcon label={t("sizeDown")} onClick={() => bumpSize(-1)}><Minus size={18} /></DocIcon>
              <span>{point}</span>
              <DocIcon label={t("sizeUp")} onClick={() => bumpSize(1)}><Plus size={18} /></DocIcon>
            </div>
            <DocIcon label={t("bold")} pressed={editor?.isActive("bold")} onClick={() => run(() => editor?.chain().focus().toggleBold().run())}><strong aria-hidden="true">B</strong></DocIcon>
            <DocIcon label={t("italic")} pressed={editor?.isActive("italic")} onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}><em aria-hidden="true">I</em></DocIcon>
            <DocIcon label={t("underline")} pressed={editor?.isActive("underline")} onClick={() => run(() => editor?.chain().focus().toggleUnderline().run())}><span className="ow-u" aria-hidden="true">U</span></DocIcon>
            <ColorMenu t={t} editor={editor} run={run} kind="color" />
            <ColorMenu t={t} editor={editor} run={run} kind="highlight" />
            <i className="ow-tool-gap" />
            <DocIcon label={t("link")} onClick={onLink}><Link2 size={20} /></DocIcon>
            <DocIcon label={t("comment")} onClick={onComment}><MessageSquare size={20} /></DocIcon>
            <DocIcon label={t("image")} onClick={() => fileRef.current?.click()}><ImageIcon size={20} /></DocIcon>
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
              onPick={(id) => run(() => editor?.chain().focus().setLineHeight(id).run())}
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
        <div className="ow-docs-toolwrap is-collapsed">
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
        <div className="ow-docs-scroll">
          <div className="ow-docs-sheet" style={{ zoom: zoom / 100 }}>
            {ruler ? <div className="ow-ruler-row"><div className="ow-vruler-spacer" /><RulerH /></div> : null}
            <div className="ow-docs-page-row">
              {ruler ? <RulerV /> : null}
              <article className="ow-a4" style={{ width: PAGE_W, minHeight: PAGE_H }}>
                <input className="ow-a4-edge" aria-label={t("header")} value={header} placeholder={t("header")} onChange={(event) => onHeader(event.target.value.slice(0, 240))} />
                <div className="ow-a4-body">
                  <EditorContent editor={editor} />
                </div>
                <input className="ow-a4-edge" aria-label={t("footer")} value={footer} placeholder={t("footer")} onChange={(event) => onFooter(event.target.value.slice(0, 240))} />
              </article>
            </div>
          </div>
          <p className="ow-count" aria-live="polite">{words}</p>
        </div>
      </div>
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
  const colors = kind === "color"
    ? [["#102032", "colorInk"], ["#ad1645", "colorPink"], ["#0b5d36", "colorGreen"], ["#1d4e89", "colorBlue"]]
    : [["#fff4b8", "colorAmber"], ["#d9f5e4", "colorGreen"], ["#fde2ea", "colorPink"], ["#dbe7f5", "colorBlue"]];
  return (
    <div className="ow-color-menu">
      <button type="button" className="ow-doc-icon ow-color-trigger" aria-label={t(kind === "color" ? "color" : "highlight")} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{kind === "color" ? "A" : "H"}</span>
        <i style={{ background: kind === "color" ? "#102032" : "#fff4b8" }} />
      </button>
      {open ? (
        <div role="menu" aria-label={t(kind === "color" ? "color" : "highlight")}>
          {colors.map(([value, key]) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              aria-label={t(key as MessageKey)}
              onClick={() => {
                run(() => {
                  if (kind === "color") editor?.chain().focus().setColor(value ?? "").run();
                  else editor?.chain().focus().setBackgroundColor(value ?? "").run();
                });
                setOpen(false);
              }}
            >
              <i style={{ background: value }} />
              {t(key as MessageKey)}
            </button>
          ))}
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
          { id: "table", label: t("table"), onSelect: () => run(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) },
          { id: "break", label: t("pageBreak"), onSelect: () => run(() => editor?.chain().focus().insertPageBreak().run()) },
          { id: "comment", label: t("comment"), onSelect: onComment },
        ] },
        { id: "format", label: t("menuFormat"), items: [
          { id: "bold", label: t("bold"), hint: "Ctrl+B", onSelect: () => run(() => editor?.chain().focus().toggleBold().run()) },
          { id: "italic", label: t("italic"), hint: "Ctrl+I", onSelect: () => run(() => editor?.chain().focus().toggleItalic().run()) },
          { id: "underline", label: t("underline"), hint: "Ctrl+U", onSelect: () => run(() => editor?.chain().focus().toggleUnderline().run()) },
          { id: "clear", label: t("clearFormat"), onSelect: () => run(() => editor?.chain().focus().unsetAllMarks().clearNodes().run()) },
          { id: "align", label: t("alignMenu"), children: [
            { id: "left", label: t("alignLeft"), onSelect: () => run(() => editor?.chain().focus().setTextAlign("left").run()) },
            { id: "center", label: t("alignCenter"), onSelect: () => run(() => editor?.chain().focus().setTextAlign("center").run()) },
            { id: "right", label: t("alignRight"), onSelect: () => run(() => editor?.chain().focus().setTextAlign("right").run()) },
          ] },
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
          { id: "none", label: t("noExtensions"), onSelect: () => undefined },
        ] },
        { id: "help", label: t("menuHelp"), items: [
          { id: "keys", label: t("shortcuts"), hint: "Ctrl+/", onSelect: onShortcuts },
        ] },
      ]}
    />
  );
}
