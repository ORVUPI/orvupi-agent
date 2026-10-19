import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Highlighter, Image as ImageIcon, Italic, LayoutGrid, Link2,
  List, ListOrdered, MessageSquarePlus, Minus, MousePointer2, PaintBucket, Paintbrush, Plus, Printer, Redo2, Search, Shapes, Slash, Star, Strikethrough, Type, Underline, Undo2, X,
} from "lucide-react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { withBase } from "../routing/paths";
import { downloadBytes } from "../security/bytes";
import { fileNameWithExtension } from "../security/names";
import { Button } from "../ui/kit";
import { absentOnDevice, MissingFile } from "../ui/MissingFile";
import { MenuBar, type BarItem } from "../ui/menus";
import { Modal } from "../ui/overlay";
import { useDeviceLayout } from "../ui/phone";
import { APP_VERSION } from "../version";
import {
  LIMITS, PT, SHAPES, SLIDE_ANIMS, SLIDE_FONTS, SLIDE_H, SLIDE_LAYOUTS, SLIDE_THEMES, SLIDE_TRANSITIONS, SLIDE_W, applyLayout, blankSlide, lineBox, moveItem, newId, orderItems,
  parseSlides, serializeSlides, setBox, syncSlideText,
  type Dash, type LineItem, type ShapeKind, type Slide, type SlideAnim, type SlideItem, type SlideLayout, type SlideTheme, type SlideTransition, type SlidesFile, type TextStyle,
} from "./model";
import {
  FONT_SIZES, alignSelection, boxOf, cloneItems, cloneSlide, distribute, editableText, expandGroups, flipItem, groupIds, linesHtml, moveSlide, safeLink, scaleItems, snapBox, stepSize,
  ungroupIds, youtubeId, type Box, type Guide,
} from "./ops";
import { Presenter } from "./Present";
import { exportPdf, exportPng } from "./render";
import { exportPptx } from "./pptx";
import { againstBase, hasRunStyle, parasHtml, parasOf, plainOf, readEditor, stripStyle, type RunStyle } from "./rich";
import { shapePath } from "./shapes";
import { ItemBody, SlideView, itemFrameStyle, slideBackground, themeOf, ThemeDeco } from "./SlideView";
import { PALETTE } from "./themes";
import { animName, layoutName, shapeName, themeName, transitionName, type Tx } from "./names";
import "./slides.css";

type Tool = "select" | "text" | "line" | "arrow" | `shape:${ShapeKind}`;
type Panel = null | "themes" | "motion" | "format" | "comments";
type Ctx = { x: number; y: number; on: "item" | "canvas" | "slide"; slide?: number } | null;
type DialogId = null | "background" | "link" | "video" | "chart" | "table" | "versions" | "shortcuts" | "find" | "imageUrl" | "crop";

const MAX_HISTORY = 100;
const ZOOMS = [0.5, 0.75, 1, 1.5, 2];

function placeholderText(tx: Tx, item: SlideItem): string | undefined {
  if (item.kind !== "text" || !item.placeholder) return undefined;
  if (item.placeholder === "title") return tx("Haz clic para añadir un título", "Click to add title");
  if (item.placeholder === "subtitle") return tx("Haz clic para añadir un subtítulo", "Click to add subtitle");
  if (item.placeholder === "number") return "xx%";
  return tx("Haz clic para añadir texto", "Click to add text");
}

function itemLabel(tx: Tx, item: SlideItem): string {
  if (item.kind === "text") return item.text.trim().slice(0, 60) || placeholderText(tx, item) || tx("Cuadro de texto", "Text box");
  if (item.kind === "shape") return item.text?.trim().slice(0, 60) || shapeName(tx, item.shape);
  if (item.kind === "image") return tx("Imagen", "Image");
  if (item.kind === "line") return item.end === "arrow" || item.start === "arrow" ? tx("Flecha", "Arrow") : tx("Línea", "Line");
  if (item.kind === "table") return tx("Tabla", "Table");
  if (item.kind === "chart") return tx("Gráfico", "Chart");
  return tx("Vídeo", "Video");
}

function hasText(item: SlideItem | undefined): item is SlideItem & TextStyle {
  return Boolean(item && (item.kind === "text" || item.kind === "shape"));
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

function readImage(file: File, maxBytes = 5_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) { reject(new Error("image-type")); return; }
    if (file.size > maxBytes) { reject(new Error("image-too-large")); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.readAsDataURL(file);
  });
}

function imageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = src;
  });
}

function fitInto(w: number, h: number, maxW = SLIDE_W * 0.6, maxH = SLIDE_H * 0.6): { w: number; h: number } {
  const k = Math.min(1, maxW / w, maxH / h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/* ---------------------------------------------------------------- pequeños controles */

function Icon({ label, onClick, pressed, children, disabled, className = "", expanded }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode; disabled?: boolean; className?: string; expanded?: boolean }) {
  return (
    <button type="button" className={`sl-icon ${className}`.trim()} aria-label={label} title={label} aria-pressed={pressed} aria-expanded={expanded} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

function Pop({ open, onClose, children, label, className = "" }: { open: boolean; onClose: () => void; children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Node && ref.current?.parentElement?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.left = "";
    el.style.right = "";
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 4) { el.style.left = "auto"; el.style.right = "0"; }
    const r2 = el.getBoundingClientRect();
    if (r2.left < 4) { el.style.left = `${4 - (r2.left - el.offsetLeft)}px`; el.style.right = "auto"; }
  }, [open]);
  if (!open) return null;
  return <div ref={ref} className={`sl-pop ${className}`.trim()} role="dialog" aria-label={label}>{children}</div>;
}

function ColorGrid({ tx, value, onPick, allowNone }: { tx: Tx; value?: string; onPick: (color: string) => void; allowNone?: boolean }) {
  return (
    <div className="sl-colors">
      {allowNone ? <button type="button" className="sl-color-none" onClick={() => onPick("none")}>{tx("Transparente", "Transparent")}</button> : null}
      <div className="sl-swatches" role="group" aria-label={tx("Colores", "Colours")}>
        {PALETTE.map((c) => (
          <button key={c} type="button" className="sl-swatch" style={{ background: c }} aria-label={c} aria-pressed={value === c} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(c)} />
        ))}
      </div>
      <label className="sl-custom">
        {tx("Personalizado", "Custom")}
        <input type="color" value={value && value !== "none" ? value : "#ff3070"} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  );
}

function ToolPop({ label, icon, children, className = "" }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <span className={`sl-toolpop ${className}`.trim()}>
      <Icon label={label} onClick={() => setOpen((v) => !v)} pressed={open} expanded={open}>{icon}</Icon>
      <Pop open={open} onClose={close} label={label}>{children(close)}</Pop>
    </span>
  );
}

/* ---------------------------------------------------------------- reglas (cm) */

function Ruler({ axis, scale, length, offset }: { axis: "x" | "y"; scale: number; length: number; offset: number }) {
  const cm = (SLIDE_W / 25.4) * scale;
  const count = Math.ceil(length / cm);
  const ticks: ReactNode[] = [];
  for (let i = 0; i <= count * 4; i += 1) {
    const at = (i * cm) / 4;
    if (at > length) break;
    const major = i % 4 === 0;
    const size = major ? 8 : i % 2 === 0 ? 5 : 3;
    ticks.push(axis === "x" ? <line key={i} x1={at} x2={at} y1={18 - size} y2={18} /> : <line key={i} y1={at} y2={at} x1={18 - size} x2={18} />);
    if (major && i > 0 && at < length - 6) {
      ticks.push(axis === "x"
        ? <text key={`t${i}`} x={at} y={9} textAnchor="middle">{i / 4}</text>
        : <text key={`t${i}`} x={7} y={at + 3} textAnchor="middle">{i / 4}</text>);
    }
  }
  const style: CSSProperties = axis === "x" ? { left: offset, width: length } : { top: offset, height: length };
  return (
    <svg className={`sl-ruler is-${axis}`} style={style} width={axis === "x" ? length : 18} height={axis === "x" ? 18 : length} aria-hidden="true">
      {ticks}
    </svg>
  );
}

function Thumb({ slide, width, number, master }: { slide: Slide; width: number; number?: number; master?: string }) {
  return <SlideView slide={slide} scale={width / SLIDE_W} number={number} master={master} className="is-thumb" />;
}

function LayoutTile({ tx, layout, theme, onPick }: { tx: Tx; layout: SlideLayout; theme: SlideTheme; onPick: () => void }) {
  const preview = useMemo(() => {
    const slide = blankSlide(layout, theme);
    const items = slide.items.map((item) => (item.kind === "text" ? { ...item, text: item.placeholder === "number" ? "xx%" : item.placeholder === "title" ? tx("Título", "Title") : "—" } : item));
    return { ...slide, items };
  }, [layout, theme, tx]);
  return (
    <button type="button" className="sl-layout-tile" onClick={onPick} role="menuitem" aria-label={layoutName(tx, layout)}>
      <Thumb slide={preview} width={132} />
      <span aria-hidden="true">{layoutName(tx, layout)}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- pantalla */

export function SlidesScreen() {
  const workspace = useWorkspace();
  const decks = workspace.files.filter((file) => file.deletedAt === null && file.kind === "slide");
  if (!workspace.openSlideId) {
    return (
      <div className="ow-page" data-tool="slides">
        <h1>{workspace.t("navSlides")}</h1>
        <p>{workspace.t("slideHint")}</p>
        <Button variant="primary" onClick={() => void workspace.createSlides(null)}>{workspace.t("newSlides")}</Button>
        <div className="ow-list">
          {decks.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openSlide(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }
  if (absentOnDevice(workspace.ready, workspace.openSlideId, workspace.files)) {
    return <MissingFile message={workspace.t("fileMissing")} action={workspace.t("backToDrive")} onBack={() => void workspace.showBrowse("folder")} />;
  }
  return <SlidesLoader key={workspace.openSlideId} id={workspace.openSlideId} />;
}

function SlidesLoader({ id }: { id: string }) {
  const workspace = useWorkspace();
  const [file, setFile] = useState<SlidesFile | null>(null);
  useEffect(() => {
    if (!workspace.storage) return;
    let cancel = false;
    loadFileWhenReady(workspace.storage, id).then((loaded) => {
      if (cancel || loaded.integrity === "mismatch") return;
      setFile(parseSlides(loaded.bytes));
    }).catch(workspace.reportError);
    return () => { cancel = true; };
  }, [id, workspace.storage, workspace.reportError]);
  if (!file) return <p>{workspace.t("preparing")}</p>;
  return <SlidesEditor initial={file} />;
}

function SlidesEditor({ initial }: { initial: SlidesFile }) {
  const workspace = useWorkspace();
  const device = useDeviceLayout();
  const phone = device === "phone";
  const tablet = device === "tablet";
  const tx: Tx = useCallback((es: string, en: string) => (workspace.locale === "en" ? en : es), [workspace.locale]);
  const record = workspace.files.find((f) => f.id === initial.id);
  const [file, setFileState] = useState<SlidesFile>(initial);
  const fileRef = useRef(file);
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [fit, setFit] = useState(0.6);
  const [panel, setPanel] = useState<Panel>(null);
  const [notesOpen, setNotesOpen] = useState(true);
  const [notesH, setNotesH] = useState(phone ? 64 : 96);
  const [filmOpen, setFilmOpen] = useState(true);
  const [rulers, setRulers] = useState(true);
  const [snapOn, setSnapOn] = useState(true);
  const [menusOpen, setMenusOpen] = useState(true);
  const [grid, setGrid] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const [status, setStatus] = useState<"saved" | "pending" | "saving">("saved");
  const [starred, setStarred] = useState(record?.favorite ?? false);
  const [title, setTitle] = useState(initial.title);
  const [present, setPresent] = useState<null | { from: number; presenter: boolean }>(null);
  const [presentMenu, setPresentMenu] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const t = window.setTimeout(() => window.print(), 60);
    return () => { window.clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printing]);
  const [layoutMenu, setLayoutMenu] = useState(false);
  const [layoutApply, setLayoutApply] = useState(false);
  const [ctx, setCtx] = useState<Ctx>(null);
  const [dialog, setDialog] = useState<DialogId>(null);
  const [dragSlide, setDragSlide] = useState<null | { from: number; to: number }>(null);
  const [filmSel, setFilmSel] = useState<number[]>([]);
  const [focusArea, setFocusArea] = useState<"canvas" | "film">("canvas");
  const [painter, setPainter] = useState<(Partial<TextStyle> & { fill?: string; stroke?: string }) | null>(null);
  const past = useRef<SlidesFile[]>([]);
  const future = useRef<SlidesFile[]>([]);
  const [, setHistoryTick] = useState(0);
  const clipboard = useRef<{ items?: SlideItem[]; slides?: Slide[] } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const lastCommit = useRef<{ key: string; at: number } | null>(null);

  const scale = zoom === "fit" ? fit : zoom;
  const slide = file.slides[index] ?? file.slides[0]!;
  const selectedItems = slide.items.filter((i) => selection.includes(i.id));
  const single = selectedItems.length === 1 ? selectedItems[0] : undefined;
  const editingItem = editingId ? slide.items.find((i) => i.id === editingId) : undefined;
  const textTarget = editingItem ?? (selectedItems.length > 0 && selectedItems.every(hasText) ? selectedItems[0] : undefined);
  const textItem = hasText(textTarget) ? textTarget : undefined;
  const theme = themeOf(slide);

  /* ---------- guardado automático */
  useEffect(() => {
    if (status !== "pending" || !workspace.storage) return;
    const storage = workspace.storage;
    const timer = window.setTimeout(() => {
      const current = fileRef.current;
      setStatus("saving");
      void storage.saveFile({
        id: current.id,
        name: current.title,
        kind: "slide",
        mime: "application/vnd.orvupi.slides+json",
        bytes: serializeSlides(current),
        snippet: current.slides.map((s) => `${s.title} ${s.body} ${s.notes ?? ""}`).join("\n").slice(0, 4000),
      }).then(() => workspace.refreshFiles()).then(() => setStatus((s) => (s === "saving" ? "saved" : s))).catch(workspace.reportError);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  /* ---------- versión automática al abrir, si la última tiene más de 10 minutos */
  useEffect(() => {
    const versions = initial.versions ?? [];
    const last = versions.at(-1);
    if (last && Date.now() - Date.parse(last.at) < 10 * 60_000) return;
    if (last && JSON.stringify(last.slides) === JSON.stringify(initial.slides)) return;
    const next = { ...fileRef.current, versions: [...versions, { id: newId(), at: new Date().toISOString(), title: initial.title, slides: initial.slides }].slice(-20) };
    fileRef.current = next;
    setFileState(next);
    setStatus("pending");
  }, [initial]);

  /* ---------- «Ajustar» */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const pad = phone ? 16 : tablet ? 28 : rulers ? 64 : 40;
      const w = stage.clientWidth - pad;
      const h = stage.clientHeight - pad;
      if (w <= 0 || h <= 0) return;
      setFit(Math.max(0.1, Math.min(w / SLIDE_W, h / SLIDE_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [phone, tablet, rulers, grid]);

  /* ---------- historial (deshacer / rehacer) */
  const setFile = useCallback((next: SlidesFile | ((f: SlidesFile) => SlidesFile), opts: { history?: boolean; key?: string } = {}) => {
    const prev = fileRef.current;
    const value = typeof next === "function" ? next(prev) : next;
    if (value === prev) return;
    if (opts.history !== false) {
      const now = Date.now();
      const coalesce = Boolean(opts.key && lastCommit.current && lastCommit.current.key === opts.key && now - lastCommit.current.at < 1200);
      if (!coalesce) {
        past.current = [...past.current, prev].slice(-MAX_HISTORY);
        future.current = [];
      }
      lastCommit.current = opts.key ? { key: opts.key, at: now } : null;
      setHistoryTick((t) => t + 1);
    }
    fileRef.current = value;
    setFileState(value);
    setStatus("pending");
  }, []);

  const pushHistory = useCallback((before: SlidesFile) => {
    if (before === fileRef.current) return;
    past.current = [...past.current, before].slice(-MAX_HISTORY);
    future.current = [];
    lastCommit.current = null;
    setHistoryTick((t) => t + 1);
  }, []);

  const restore = useCallback((value: SlidesFile) => {
    fileRef.current = value;
    setFileState(value);
    setStatus("pending");
    setEditingId(null);
    setSelection((sel) => sel.filter((id) => value.slides.some((s) => s.items.some((i) => i.id === id))));
    setIndex((i) => Math.min(i, value.slides.length - 1));
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [fileRef.current, ...future.current];
    restore(prev);
  }, [restore]);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, fileRef.current];
    restore(next);
  }, [restore]);

  /* ---------- mutaciones */
  const patchSlide = useCallback((mutator: (s: Slide) => Slide, opts?: { history?: boolean; key?: string }) => {
    setFile((f) => ({ ...f, slides: f.slides.map((s, i) => (i === index ? syncSlideText(mutator(s)) : s)) }), opts);
  }, [index, setFile]);

  const patchItems = useCallback((ids: string[], mutator: (item: SlideItem) => SlideItem, key?: string) => {
    if (ids.length === 0) return;
    patchSlide((s) => ({ ...s, items: s.items.map((i) => (ids.includes(i.id) ? mutator(i) : i)) }), { key });
  }, [patchSlide]);

  const liveItems = useCallback((map: Map<string, SlideItem>) => {
    setFile((f) => ({ ...f, slides: f.slides.map((s, i) => (i === index ? { ...s, items: s.items.map((it) => map.get(it.id) ?? it) } : s)) }), { history: false });
  }, [index, setFile]);

  function patchText(style: Partial<TextStyle>, key?: string) {
    if (editingId && inlineFormat(style)) return;
    const ids = editingId ? [editingId] : selection;
    // Formato a todo el cuadro: quita el mismo formato de las palabras sueltas, como en Slides.
    const runKeys: Record<string, keyof RunStyle> = { bold: "b", italic: "i", underline: "u", strike: "s", color: "color", highlight: "hl", font: "font", size: "size" };
    const strip = Object.keys(style).map((k) => runKeys[k]).filter((k): k is keyof RunStyle => Boolean(k));
    patchItems(ids, (i) => (hasText(i) ? ({ ...i, ...style, rich: strip.length > 0 ? stripStyle(i.rich, strip) : i.rich } as SlideItem) : i), key);
    if (editingId && editRef.current && strip.length > 0) {
      // El editor abierto se rehace con el formato nuevo.
      const node = editRef.current;
      requestAnimationFrame(() => {
        const item = fileRef.current.slides[index]?.items.find((it) => it.id === editingId);
        if (!item || !hasText(item) || !node.isConnected) return;
        node.innerHTML = item.rich && hasRunStyle(item.rich) ? parasHtml(parasOf(item)) : linesHtml(item.text);
      });
    }
  }

  function addItems(items: SlideItem[], edit = false) {
    if (slide.items.length + items.length > LIMITS.MAX_ITEMS) {
      workspace.pushToast(tx("Esta diapositiva ya tiene el máximo de objetos.", "This slide already has the maximum number of objects."));
      return;
    }
    patchSlide((s) => ({ ...s, items: [...s.items, ...items] }));
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest(".sl-notes, .sl-panel")) document.activeElement.blur();
    setSelection(items.map((i) => i.id));
    setTool("select");
    if (edit && items[0]) setEditingId(items[0].id);
  }

  function removeSelection() {
    if (selection.length === 0) return;
    patchSlide((s) => ({ ...s, items: s.items.filter((i) => !selection.includes(i.id)) }));
    setSelection([]);
    setEditingId(null);
  }

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(fileRef.current.slides.length - 1, i)));
    setSelection([]);
    setEditingId(null);
    setFilmSel([]);
  }

  function newSlide(layout?: SlideLayout) {
    if (file.slides.length >= LIMITS.MAX_SLIDES) { workspace.pushToast(tx("Has llegado al máximo de diapositivas.", "You reached the maximum number of slides.")); return; }
    const chosen = layout ?? (slide.layout === "title" || slide.layout === "blank" || !slide.layout ? "title-body" : slide.layout);
    const fresh: Slide = { ...blankSlide(chosen, slide.theme), background: slide.background, transition: slide.transition, duration: slide.duration };
    const after = index;
    setFile((f) => ({ ...f, slides: [...f.slides.slice(0, after + 1), fresh, ...f.slides.slice(after + 1)] }));
    setIndex(after + 1);
    setSelection([]);
    setEditingId(null);
    setFilmSel([]);
  }

  function slideTargets(): number[] {
    return filmSel.length > 0 ? [...filmSel].sort((a, b) => a - b) : [index];
  }

  function duplicateSlides() {
    const targets = slideTargets();
    if (file.slides.length + targets.length > LIMITS.MAX_SLIDES) return;
    const last = targets[targets.length - 1] ?? index;
    const copies = targets.map((i) => cloneSlide(file.slides[i]!));
    setFile((f) => ({ ...f, slides: [...f.slides.slice(0, last + 1), ...copies, ...f.slides.slice(last + 1)] }));
    setIndex(last + 1);
    setFilmSel([]);
  }

  function deleteSlides() {
    const targets = new Set(slideTargets());
    if (targets.size >= file.slides.length) {
      setFile((f) => ({ ...f, slides: [blankSlide("title-body", slide.theme)] }));
      setIndex(0);
    } else {
      const remaining = file.slides.length - targets.size;
      const before = [...targets].filter((t) => t < index).length;
      setFile((f) => ({ ...f, slides: f.slides.filter((_, i) => !targets.has(i)) }));
      setIndex(Math.max(0, Math.min(index - before, remaining - 1)));
    }
    setFilmSel([]);
    setSelection([]);
  }

  function toggleSkip() {
    const targets = new Set(slideTargets());
    const hide = !file.slides[[...targets][0] ?? index]?.hidden;
    setFile((f) => ({ ...f, slides: f.slides.map((s, i) => (targets.has(i) ? { ...s, hidden: hide ? true : undefined } : s)) }));
  }

  function moveCurrent(to: number) {
    const target = Math.max(0, Math.min(file.slides.length - 1, to));
    if (target === index) return;
    setFile((f) => ({ ...f, slides: moveSlide(f.slides, index, target) }));
    setIndex(target);
  }

  function applyTheme(next: SlideTheme) {
    setFile((f) => ({ ...f, slides: f.slides.map((s) => ({ ...s, theme: next })) }));
  }

  function setLayout(layout: SlideLayout) {
    patchSlide((s) => applyLayout(s, layout));
    setSelection([]);
    setEditingId(null);
  }

  function selectAll() {
    setSelection(slide.items.map((i) => i.id));
    setEditingId(null);
  }

  function copySel(cut = false): boolean {
    if (selectedItems.length > 0) {
      clipboard.current = { items: selectedItems.map((i) => ({ ...i })) };
      if (cut) removeSelection();
      return true;
    }
    if (focusArea === "film") {
      clipboard.current = { slides: slideTargets().map((i) => file.slides[i]!) };
      if (cut) deleteSlides();
      return true;
    }
    return false;
  }

  function pasteInternal(): boolean {
    const clip = clipboard.current;
    if (!clip) return false;
    if (clip.items && clip.items.length > 0) {
      const copies = cloneItems(clip.items);
      clipboard.current = { items: copies };
      addItems(copies);
      return true;
    }
    if (clip.slides && clip.slides.length > 0) {
      const copies = clip.slides.map(cloneSlide);
      setFile((f) => ({ ...f, slides: [...f.slides.slice(0, index + 1), ...copies, ...f.slides.slice(index + 1)].slice(0, LIMITS.MAX_SLIDES) }));
      setIndex(index + 1);
      return true;
    }
    return false;
  }

  function duplicateSel() {
    if (selectedItems.length === 0) { duplicateSlides(); return; }
    addItems(cloneItems(selectedItems));
  }

  function order(where: "front" | "back" | "forward" | "backward") {
    if (selection.length === 0) return;
    patchSlide((s) => {
      let items = s.items;
      const ids = where === "front" || where === "backward" ? selection : [...selection].reverse();
      for (const id of ids) items = orderItems(items, id, where);
      return { ...s, items };
    });
  }

  function align(edge: "left" | "center" | "right" | "top" | "middle" | "bottom", toPage = false) {
    if (selection.length === 0) return;
    patchSlide((s) => ({ ...s, items: alignSelection(s.items, selection, edge, toPage) }));
  }

  function rotate(delta: number) {
    patchItems(selection, (i) => (i.kind === "line" ? i : { ...i, rot: ((((i.rot ?? 0) + delta) % 360) + 360) % 360 }));
  }

  function group(on: boolean) {
    patchSlide((s) => ({ ...s, items: on ? groupIds(s.items, selection) : ungroupIds(s.items, selection) }));
  }

  async function insertImageFile(picked: File, replaceId?: string) {
    try {
      const src = await readImage(picked);
      const size = await imageSize(src);
      if (replaceId) {
        patchItems([replaceId], (i) => (i.kind === "image" ? { ...i, src, crop: undefined } : i));
        return;
      }
      const box = fitInto(size.w, size.h);
      addItems([{ id: newId(), kind: "image", x: (SLIDE_W - box.w) / 2, y: (SLIDE_H - box.h) / 2, w: box.w, h: box.h, src }]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      workspace.pushToast(code === "image-too-large" ? tx("La imagen supera 5 MB.", "The image is larger than 5 MB.") : tx("Ese archivo no es una imagen PNG, JPG, GIF o WebP.", "That file is not a PNG, JPG, GIF or WebP image."));
    }
  }

  function insertText(at?: Box) {
    const box = at ?? { x: 240, y: 220, w: 480, h: 80 };
    addItems([{ id: newId(), kind: "text", x: box.x, y: box.y, w: Math.max(40, box.w), h: Math.max(40, box.h), text: "", size: 18 }], true);
  }

  function insertShape(shape: ShapeKind, at?: Box) {
    const box = at && at.w > 8 && at.h > 8 ? at : { x: 380, y: 190, w: 200, h: shape === "ellipse" || shape === "star" || shape === "heart" ? 200 : 140 };
    addItems([{ id: newId(), kind: "shape", shape, ...box, fill: theme.accent, stroke: "#102032", strokeWidth: 2, text: "" }]);
  }

  function insertLine(arrow: boolean, pts?: { x1: number; y1: number; x2: number; y2: number }) {
    const p = pts ?? { x1: 320, y1: 270, x2: 640, y2: 270 };
    addItems([lineBox({ id: newId(), kind: "line", ...p, x: 0, y: 0, w: 0, h: 0, color: theme.title, width: 3, end: arrow ? "arrow" : undefined })]);
  }

  function insertTable(rows: number, cols: number) {
    const r = Math.max(1, Math.min(20, rows));
    const c = Math.max(1, Math.min(20, cols));
    const w = Math.min(SLIDE_W - 96, c * 140);
    const h = Math.min(SLIDE_H - 120, r * 40);
    addItems([{ id: newId(), kind: "table", x: (SLIDE_W - w) / 2, y: (SLIDE_H - h) / 2 + 20, w, h, rows: Array.from({ length: r }, () => Array.from({ length: c }, () => "")), size: 14, header: true }]);
  }

  function insertChart(kind: "bar" | "column" | "line" | "pie") {
    addItems([{ id: newId(), kind: "chart", chart: kind, x: 220, y: 120, w: 520, h: 320, title: tx("Título del gráfico", "Chart title"), labels: ["T1", "T2", "T3", "T4"], values: [12, 19, 8, 15] }]);
  }

  function insertDiagram(kind: "process" | "timeline" | "cycle") {
    const g = newId();
    const items: SlideItem[] = [];
    if (kind === "process") {
      for (let i = 0; i < 4; i += 1) items.push({ id: newId(), kind: "shape", shape: "chevron", x: 90 + i * 200, y: 220, w: 190, h: 100, fill: i % 2 ? "#102032" : theme.accent, stroke: "none", text: `${tx("Paso", "Step")} ${i + 1}`, group: g, bold: true });
    } else if (kind === "timeline") {
      items.push(lineBox({ id: newId(), kind: "line", x1: 80, y1: 270, x2: 880, y2: 270, x: 0, y: 0, w: 0, h: 0, color: "#102032", width: 4, end: "arrow", group: g }));
      for (let i = 0; i < 4; i += 1) {
        items.push({ id: newId(), kind: "shape", shape: "ellipse", x: 136 + i * 200, y: 256, w: 28, h: 28, fill: theme.accent, stroke: "#102032", strokeWidth: 2, text: "", group: g });
        items.push({ id: newId(), kind: "text", x: 70 + i * 200, y: i % 2 ? 300 : 170, w: 160, h: 80, text: `${2026 + i}\n${tx("Hito", "Milestone")}`, align: "center", size: 16, group: g });
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        items.push({ id: newId(), kind: "shape", shape: "ellipse", x: 480 + 150 * Math.cos(a) - 70, y: 280 + 150 * Math.sin(a) - 50, w: 140, h: 100, fill: i % 2 ? "#102032" : theme.accent, stroke: "none", text: `${tx("Fase", "Phase")} ${i + 1}`, group: g, bold: true });
      }
    }
    addItems(items);
  }

  /* ---------- copiar y pegar con el portapapeles del sistema */
  useEffect(() => {
    const own = (data: DataTransfer | null) => {
      if (!data) return;
      data.setData("text/plain", selectedItems.map((i) => (hasText(i) ? i.text : "")).filter(Boolean).join("\n"));
      data.setData("application/x-orvupi-slides", JSON.stringify(selectedItems));
    };
    const onCopy = (event: ClipboardEvent) => {
      if (editingId || isTyping(event.target) || present) return;
      if (selectedItems.length === 0) return;
      copySel(false);
      own(event.clipboardData);
      event.preventDefault();
    };
    const onCut = (event: ClipboardEvent) => {
      if (editingId || isTyping(event.target) || present || selectedItems.length === 0) return;
      own(event.clipboardData);
      copySel(true);
      event.preventDefault();
    };
    const onPaste = (event: ClipboardEvent) => {
      if (editingId || isTyping(event.target) || present || dialog) return;
      const data = event.clipboardData;
      if (!data) return;
      const mine = data.getData("application/x-orvupi-slides");
      if (mine) {
        try {
          const parsed = JSON.parse(mine) as unknown;
          if (Array.isArray(parsed)) {
            event.preventDefault();
            clipboard.current = { items: parsed as SlideItem[] };
            pasteInternal();
            return;
          }
        } catch { /* se sigue con el resto */ }
      }
      const image = [...data.files].find((f) => f.type.startsWith("image/"));
      if (image) { event.preventDefault(); void insertImageFile(image); return; }
      const text = data.getData("text/plain");
      if (text) {
        event.preventDefault();
        addItems([{ id: newId(), kind: "text", x: 160, y: 180, w: 640, h: 120, text: text.slice(0, 4000), size: 18 }]);
        return;
      }
      if (pasteInternal()) event.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  });

  /* ---------- atajos de teclado */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (present || dialog) return;
      const mod = event.ctrlKey || event.metaKey;
      const typing = isTyping(event.target);
      const key = event.key.toLowerCase();
      if (mod && !typing && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (mod && !typing && key === "y") { event.preventDefault(); redo(); return; }
      if (mod && !event.altKey && key === "m") { event.preventDefault(); newSlide(); return; }
      if (mod && event.altKey && key === "m") { event.preventDefault(); setPanel("comments"); return; }
      if (mod && event.altKey && event.shiftKey && key === "p") { event.preventDefault(); setPresent({ from: index, presenter: true }); return; }
      if (mod && !event.altKey && !event.shiftKey && key === "p") { event.preventDefault(); setPrinting(true); return; }
      if ((mod && key === "enter") || (mod && event.key === "F5")) { event.preventDefault(); setPresent({ from: event.shiftKey ? 0 : index, presenter: false }); return; }
      if (mod && key === "/") { event.preventDefault(); setDialog("shortcuts"); return; }
      if (mod && key === "h") { event.preventDefault(); setDialog("find"); return; }
      if (mod && key === "k") { event.preventDefault(); if (selection.length > 0 || editingId) setDialog("link"); return; }
      if (textItem && mod && !event.altKey) {
        const size = (editingId ? selFmt?.size : undefined) ?? textItem.size ?? 18;
        if (key === "b") { event.preventDefault(); patchText({ bold: !textItem.bold }); return; }
        if (key === "i") { event.preventDefault(); patchText({ italic: !textItem.italic }); return; }
        if (key === "u") { event.preventDefault(); patchText({ underline: !textItem.underline }); return; }
        if (event.shiftKey && (event.key === ">" || event.key === "." || event.code === "Period")) { event.preventDefault(); patchText({ size: stepSize(size, 1) }, "size"); return; }
        if (event.shiftKey && (event.key === "<" || event.key === "," || event.code === "Comma")) { event.preventDefault(); patchText({ size: stepSize(size, -1) }, "size"); return; }
        if (event.shiftKey && key === "l") { event.preventDefault(); patchText({ align: "left" }); return; }
        if (event.shiftKey && key === "e") { event.preventDefault(); patchText({ align: "center" }); return; }
        if (event.shiftKey && key === "r") { event.preventDefault(); patchText({ align: "right" }); return; }
        if (event.shiftKey && key === "j") { event.preventDefault(); patchText({ align: "justify" }); return; }
        if (event.shiftKey && (event.code === "Digit8" || key === "8")) { event.preventDefault(); patchText({ list: textItem.list === "bullet" ? "none" : "bullet" }); return; }
        if (event.shiftKey && (event.code === "Digit7" || key === "7")) { event.preventDefault(); patchText({ list: textItem.list === "number" ? "none" : "number" }); return; }
      }
      if (typing || editingId) {
        if (event.key === "Escape" && editingId) { event.preventDefault(); const id = editingId; setEditingId(null); setSelection([id]); }
        return;
      }
      if (mod && key === "a") { event.preventDefault(); selectAll(); return; }
      if (mod && key === "d") { event.preventDefault(); duplicateSel(); return; }
      if (mod && key === "g") { event.preventDefault(); group(!event.shiftKey); return; }
      if (mod && (key === "arrowup" || key === "arrowdown")) {
        event.preventDefault();
        const up = key === "arrowup";
        if (focusArea === "film" || selection.length === 0) {
          if (event.shiftKey) moveCurrent(up ? 0 : file.slides.length - 1); else moveCurrent(index + (up ? -1 : 1));
        } else order(event.shiftKey ? (up ? "front" : "back") : up ? "forward" : "backward");
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.length > 0) { event.preventDefault(); removeSelection(); } else if (focusArea === "film") { event.preventDefault(); deleteSlides(); }
        return;
      }
      if (event.key === "Escape") { setSelection([]); setTool("select"); setFilmSel([]); setPainter(null); return; }
      if (!mod && !event.altKey && event.key.length === 1 && single && hasText(single)) { event.preventDefault(); pendingChar.current = event.key; setEditingId(single.id); return; }
      if (event.key === "Enter" && single && hasText(single)) { event.preventDefault(); setEditingId(single.id); return; }
      if (event.key === "PageDown" || event.key === "PageUp") { event.preventDefault(); goTo(index + (event.key === "PageDown" ? 1 : -1)); return; }
      if (event.key.startsWith("Arrow")) {
        if (selection.length > 0) {
          event.preventDefault();
          const step = event.shiftKey ? 1 : 8;
          const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
          const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
          patchItems(selection, (i) => moveItem(i, dx, dy), "nudge");
        } else if (focusArea === "film" && (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          goTo(index + (event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- Ctrl + rueda = zoom */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((z) => {
        const current = z === "fit" ? fit : z;
        return Math.max(0.25, Math.min(3, Math.round(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1) * 100) / 100));
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [fit, grid]);

  /* ---------- coordenadas */
  function toSlide(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }

  function track(pid: number, move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) {
    const onMove = (e: PointerEvent) => { if (e.pointerId === pid) move(e); };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      up(e);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  /* ---------- lienzo vacío: selección por área o dibujo de objetos */
  function onCanvasDown(event: ReactPointerEvent) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    setFocusArea("canvas");
    setCtx(null);
    if (editingId) setEditingId(null);
    const start = toSlide(event.clientX, event.clientY);
    const creating = tool !== "select";
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (!creating && !additive) setSelection([]);
    if (!creating && event.pointerType === "touch") return; // con el dedo, el lienzo vacío solo desplaza
    if (creating) event.preventDefault();
    track(event.pointerId, (e) => {
      const p = toSlide(e.clientX, e.clientY);
      if (creating && e.cancelable) e.preventDefault();
      const box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      if (creating) setDraft(tool === "line" || tool === "arrow" ? { x: start.x, y: start.y, w: p.x - start.x, h: p.y - start.y } : box);
      else setMarquee(box);
    }, (e) => {
      const p = toSlide(e.clientX, e.clientY);
      const box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      setDraft(null);
      setMarquee(null);
      if (creating) {
        const small = box.w < 6 && box.h < 6;
        if (tool === "text") insertText(small ? { x: start.x, y: start.y, w: 320, h: 60 } : box);
        else if (tool === "line" || tool === "arrow") insertLine(tool === "arrow", small ? { x1: start.x, y1: start.y, x2: start.x + 240, y2: start.y } : { x1: start.x, y1: start.y, x2: p.x, y2: p.y });
        else insertShape(tool.slice(6) as ShapeKind, small ? { x: start.x, y: start.y, w: 160, h: 120 } : box);
        return;
      }
      if (box.w > 3 || box.h > 3) {
        const items = fileRef.current.slides[index]?.items ?? [];
        const inside = items.filter((i) => i.x >= box.x - 1 && i.y >= box.y - 1 && i.x + i.w <= box.x + box.w + 1 && i.y + i.h <= box.y + box.h + 1).map((i) => i.id);
        setSelection((sel) => expandGroups(items, additive ? [...new Set([...sel, ...inside])] : inside));
      }
    });
  }

  /* ---------- mover objetos (ratón y dedo) */
  function onItemDown(event: ReactPointerEvent, item: SlideItem) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (editingId === item.id) return;
    event.stopPropagation();
    setFocusArea("canvas");
    setCtx(null);
    if (tool !== "select") { onCanvasDown(event); return; }
    if (painter) {
      patchItems([item.id], (i) => ({ ...i, ...(hasText(i) ? painter : {}), ...(i.kind === "shape" && painter.fill ? { fill: painter.fill, stroke: painter.stroke } : {}) } as SlideItem));
      setPainter(null);
      return;
    }
    if (editingId) setEditingId(null);
    const wasSelected = selection.includes(item.id);
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    let ids = additive ? (wasSelected ? selection.filter((s) => s !== item.id) : [...selection, item.id]) : wasSelected ? selection : [item.id];
    ids = expandGroups(slide.items, ids);
    setSelection(ids);
    if (!ids.includes(item.id)) return;
    event.preventDefault();
    const before = fileRef.current;
    const start = { x: event.clientX, y: event.clientY };
    const origin = slide.items.filter((i) => ids.includes(i.id));
    const originBox = boxOf(origin)!;
    const others = slide.items.filter((i) => !ids.includes(i.id));
    let moved = false;
    track(event.pointerId, (e) => {
      const dxs = e.clientX - start.x;
      const dys = e.clientY - start.y;
      if (!moved && Math.hypot(dxs, dys) < (e.pointerType === "touch" ? 6 : 3)) return;
      if (e.cancelable) e.preventDefault();
      moved = true;
      let dx = dxs / scale;
      let dy = dys / scale;
      let lines: Guide[] = [];
      if (snapOn && !e.altKey) {
        const snapped = snapBox({ ...originBox, x: originBox.x + dx, y: originBox.y + dy }, others, 6 / scale);
        dx += snapped.dx;
        dy += snapped.dy;
        lines = snapped.guides;
      }
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      setGuides(lines);
      liveItems(new Map(origin.map((o) => [o.id, moveItem(o, dx, dy)])));
    }, () => {
      setGuides([]);
      if (moved) pushHistory(before);
      else if (wasSelected && ids.length === 1 && hasText(item) && !additive) setEditingId(item.id);
    });
  }

  /* ---------- cambiar tamaño con las 8 asas (también girado) */
  function onHandleDown(event: ReactPointerEvent, handle: string) {
    event.stopPropagation();
    event.preventDefault();
    const before = fileRef.current;
    const origin = selectedItems.map((i) => ({ ...i }));
    const box = boxOf(origin);
    if (!box) return;
    const rot = origin.length === 1 && origin[0]!.kind !== "line" ? origin[0]!.rot ?? 0 : 0;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const start = { x: event.clientX, y: event.clientY };
    const ratio = origin.length > 1 || origin.some((i) => i.kind === "image" || i.kind === "video");
    let changed = false;
    track(event.pointerId, (e) => {
      if (e.cancelable) e.preventDefault();
      changed = true;
      const gx = (e.clientX - start.x) / scale;
      const gy = (e.clientY - start.y) / scale;
      const lx = gx * cos + gy * sin;
      const ly = -gx * sin + gy * cos;
      let w = box.w;
      let h = box.h;
      if (handle.includes("e")) w = box.w + lx;
      if (handle.includes("w")) w = box.w - lx;
      if (handle.includes("s")) h = box.h + ly;
      if (handle.includes("n")) h = box.h - ly;
      w = Math.max(8, w);
      h = Math.max(8, h);
      if ((ratio || e.shiftKey) && handle.length === 2) {
        const k = Math.max(w / box.w, h / box.h);
        w = Math.max(8, box.w * k);
        h = Math.max(8, box.h * k);
      }
      // El lado (o la esquina) opuesto queda fijo.
      const ax = handle.includes("e") ? -1 : handle.includes("w") ? 1 : 0;
      const ay = handle.includes("s") ? -1 : handle.includes("n") ? 1 : 0;
      const cx0 = box.x + box.w / 2;
      const cy0 = box.y + box.h / 2;
      const fx = (ax * box.w) / 2;
      const fy = (ay * box.h) / 2;
      const fixedX = cx0 + fx * cos - fy * sin;
      const fixedY = cy0 + fx * sin + fy * cos;
      const nfx = (ax * w) / 2;
      const nfy = (ay * h) / 2;
      const cx = fixedX - (nfx * cos - nfy * sin);
      const cy = fixedY - (nfx * sin + nfy * cos);
      liveItems(new Map(scaleItems(origin, box, { x: cx - w / 2, y: cy - h / 2, w, h }).map((o) => [o.id, o])));
    }, () => { if (changed) pushHistory(before); });
  }

  /* ---------- girar */
  function onRotateDown(event: ReactPointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    const target = single;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!target || target.kind === "line" || !rect) return;
    const before = fileRef.current;
    const cx = rect.left + (target.x + target.w / 2) * scale;
    const cy = rect.top + (target.y + target.h / 2) * scale;
    let changed = false;
    track(event.pointerId, (e) => {
      if (e.cancelable) e.preventDefault();
      changed = true;
      let deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
      deg = ((deg % 360) + 360) % 360;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      else for (const snap of [0, 90, 180, 270, 360]) if (Math.abs(deg - snap) < 3) deg = snap;
      liveItems(new Map([[target.id, { ...target, rot: Math.round(deg) % 360 }]]));
    }, () => { if (changed) pushHistory(before); });
  }

  /* ---------- extremos de una línea */
  function onEndDown(event: ReactPointerEvent, end: 1 | 2) {
    event.stopPropagation();
    event.preventDefault();
    const target = single;
    if (!target || target.kind !== "line") return;
    const before = fileRef.current;
    let changed = false;
    track(event.pointerId, (e) => {
      if (e.cancelable) e.preventDefault();
      changed = true;
      const p = toSlide(e.clientX, e.clientY);
      const other = end === 1 ? { x: target.x2, y: target.y2 } : { x: target.x1, y: target.y1 };
      if (e.shiftKey) {
        const a = Math.round(Math.atan2(p.y - other.y, p.x - other.x) / (Math.PI / 4)) * (Math.PI / 4);
        const d = Math.hypot(p.x - other.x, p.y - other.y);
        p.x = other.x + d * Math.cos(a);
        p.y = other.y + d * Math.sin(a);
      }
      const next: LineItem = lineBox(end === 1 ? { ...target, x1: p.x, y1: p.y } : { ...target, x2: p.x, y2: p.y });
      liveItems(new Map([[target.id, next]]));
    }, () => { if (changed) pushHistory(before); });
  }

  /* ---------- editar texto sobre la diapositiva */
  const pendingChar = useRef<string | null>(null);
  const setupEditor = useCallback((node: HTMLDivElement | null) => {
    editRef.current = node;
    if (!node || node.dataset.ready === "1") return;
    const item = fileRef.current.slides[index]?.items.find((i) => i.id === editingId);
    node.innerHTML = item && hasText(item) && item.rich && hasRunStyle(item.rich) ? parasHtml(parasOf(item)) : linesHtml(item && hasText(item) ? item.text : "");
    node.dataset.ready = "1";
    node.focus({ preventScroll: true });
    const range = document.createRange();
    // El cursor va dentro del último párrafo (Firefox, si no, escribe fuera del <div>).
    const last = node.lastElementChild;
    if (last && last.textContent === "") { range.setStart(last, 0); range.collapse(true); }
    else { range.selectNodeContents(last ?? node); range.collapse(false); }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    if (pendingChar.current) {
      // Como en Slides: escribir con un cuadro seleccionado empieza a editarlo.
      document.execCommand("insertText", false, pendingChar.current);
      pendingChar.current = null;
    }
  }, [editingId, index]);

  const editBefore = useRef<SlidesFile | null>(null);
  useEffect(() => {
    if (editingId) { editBefore.current = fileRef.current; return; }
    if (editBefore.current) { pushHistory(editBefore.current); editBefore.current = null; }
  }, [editingId, pushHistory]);

  function onEditInput() {
    const node = editRef.current;
    if (!node || !editingId) return;
    const id = editingId;
    const current = fileRef.current.slides[index]?.items.find((it) => it.id === id);
    if (!current || !hasText(current)) return;
    const base = baseTextStyle(current);
    const paras = againstBase(readEditor(node), base);
    let text = plainOf(paras);
    if (text.length > 4000) text = editableText(node).slice(0, 4000);
    const rich = text.length <= 4000 && plainOf(paras) === text && hasRunStyle(paras) ? paras : undefined;
    setFile((f) => ({ ...f, slides: f.slides.map((s, i) => (i === index ? syncSlideText({ ...s, items: s.items.map((it) => (it.id === id && hasText(it) ? ({ ...it, text, rich } as SlideItem) : it)) }) : s)) }), { history: false });
  }

  /* ---------- formato por selección dentro del cuadro (como en Slides y Docs) */
  const savedRange = useRef<Range | null>(null);
  const [selFmt, setSelFmt] = useState<SelFmt | null>(null);
  useEffect(() => {
    if (!editingId) { setSelFmt(null); savedRange.current = null; return; }
    const read = () => {
      const node = editRef.current;
      const sel = window.getSelection();
      if (!node || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!node.contains(range.commonAncestorContainer)) return;
      savedRange.current = range.cloneRange();
      setSelFmt(readSelFmt(node, range));
    };
    document.addEventListener("selectionchange", read);
    read();
    return () => document.removeEventListener("selectionchange", read);
  }, [editingId]);

  /** Devuelve el rango del editor (restaurado si el foco se fue a un control de la barra). */
  function editorRange(): Range | null {
    const node = editRef.current;
    if (!node || !editingId) return null;
    const sel = window.getSelection();
    let range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (!range || !node.contains(range.commonAncestorContainer)) {
      range = savedRange.current;
      if (!range || !node.contains(range.commonAncestorContainer)) return null;
      node.focus({ preventScroll: true });
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    return range;
  }

  /** Aplica formato solo a lo seleccionado dentro del cuadro que se edita. Devuelve false si no hay selección de texto. */
  function inlineFormat(style: Partial<TextStyle>): boolean {
    const range = editorRange();
    const node = editRef.current;
    if (!range || !node) return false;
    const keys = Object.keys(style);
    const inlineKeys = ["bold", "italic", "underline", "strike", "color", "highlight", "font", "size"];
    if (keys.length === 0 || !keys.every((k) => inlineKeys.includes(k))) return false;
    // Con el cursor sin seleccionar nada, Slides aplica el formato a la palabra en la que está.
    if (range.collapsed && !selectWordAt(range)) return false;
    document.execCommand("styleWithCSS", false, "true");
    // Como en Docs: si todo lo seleccionado ya lo tiene, se quita; si no, se pone.
    const toggle = (cmd: string, _want: boolean | undefined) => { document.execCommand(cmd, false); };
    if ("bold" in style) toggle("bold", style.bold);
    if ("italic" in style) toggle("italic", style.italic);
    if ("underline" in style) toggle("underline", style.underline);
    if ("strike" in style) toggle("strikeThrough", style.strike);
    if ("color" in style) document.execCommand("foreColor", false, style.color ?? (editingItem && baseTextStyle(editingItem as SlideItem & TextStyle).isTitle ? theme.title : theme.text));
    if ("highlight" in style) document.execCommand("hiliteColor", false, style.highlight ?? "transparent");
    if ("font" in style && style.font) document.execCommand("fontName", false, style.font);
    if ("size" in style && style.size) wrapFontSize(node, style.size);
    onEditInput();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) { savedRange.current = sel.getRangeAt(0).cloneRange(); setSelFmt(readSelFmt(node, sel.getRangeAt(0))); }
    return true;
  }

  /** Enlace sobre el texto seleccionado (Ctrl+K con texto seleccionado). */
  function inlineLink(url: string | null): boolean {
    const range = editorRange();
    if (!range || (range.collapsed && !selectWordAt(range))) return false;
    if (url) document.execCommand("createLink", false, url);
    else document.execCommand("unlink", false);
    onEditInput();
    return true;
  }

  /* ---------- tira: arrastrar para ordenar (ratón al momento; dedo con pulsación larga) */
  function onThumbDown(event: ReactPointerEvent, i: number) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    setFocusArea("film");
    setCtx(null);
    if (event.shiftKey) {
      const lo = Math.min(index, i);
      const hi = Math.max(index, i);
      setFilmSel(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setFilmSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...new Set([...s, index, i])]));
      return;
    }
    goTo(i);
    const start = { x: event.clientX, y: event.clientY };
    const touch = event.pointerType !== "mouse";
    let dragging = false;
    let cancelled = false;
    let to = i;
    const timer = touch ? window.setTimeout(() => { if (!cancelled) { dragging = true; setDragSlide({ from: i, to: i }); navigator.vibrate?.(15); } }, 380) : 0;
    track(event.pointerId, (e) => {
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (!dragging) {
        if (touch) { if (dist > 10) { cancelled = true; window.clearTimeout(timer); } return; }
        if (dist < 6) return;
        dragging = true;
      }
      if (e.cancelable) e.preventDefault();
      const thumbs = [...(filmRef.current?.querySelectorAll<HTMLElement>(".sl-film-item") ?? [])];
      const row = filmRef.current ? getComputedStyle(filmRef.current).flexDirection === "row" : false;
      to = thumbs.length;
      for (let k = 0; k < thumbs.length; k += 1) {
        const r = thumbs[k]!.getBoundingClientRect();
        if (row ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2) { to = k; break; }
      }
      setDragSlide({ from: i, to });
    }, () => {
      window.clearTimeout(timer);
      if (!dragging) return;
      setDragSlide(null);
      const target = to > i ? to - 1 : to;
      if (target !== i) {
        setFile((f) => ({ ...f, slides: moveSlide(f.slides, i, target) }));
        setIndex(target);
      }
    });
  }

  /* ---------- exportar e importar */
  async function doExport(kind: "pdf" | "png" | "pptx" | "txt" | "orvslides") {
    try {
      const name = file.title || tx("presentacion", "presentation");
      if (kind === "pdf") downloadBytes(await exportPdf(file), fileNameWithExtension(name, "pdf"), "application/pdf");
      else if (kind === "png") downloadBytes(await exportPng(file, index), fileNameWithExtension(`${name}-${index + 1}`, "png"), "image/png");
      else if (kind === "pptx") downloadBytes(await exportPptx(file), fileNameWithExtension(name, "pptx"), "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      else if (kind === "txt") {
        const text = file.slides.map((s, i) => `${tx("Diapositiva", "Slide")} ${i + 1}\n${s.items.flatMap((it) => (hasText(it) && it.text ? [it.text] : it.kind === "table" ? [it.rows.map((r) => r.join("\t")).join("\n")] : [])).join("\n")}${s.notes ? `\n\n${tx("Notas", "Notes")}: ${s.notes}` : ""}`).join("\n\n");
        downloadBytes(new TextEncoder().encode(text), fileNameWithExtension(name, "txt"), "text/plain");
      } else downloadBytes(serializeSlides(file), fileNameWithExtension(name, "orvslides"), "application/vnd.orvupi.slides+json");
    } catch (error) {
      workspace.reportError(error);
    }
  }

  async function importSlides(picked: File) {
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      let slides: Slide[];
      if (/\.pptx$/i.test(picked.name)) {
        const { importPptx } = await import("./pptx");
        slides = (await importPptx(bytes)).slides;
      } else slides = parseSlides(bytes).slides;
      if (slides.length === 0) return;
      setFile((f) => ({ ...f, slides: [...f.slides.slice(0, index + 1), ...slides, ...f.slides.slice(index + 1)].slice(0, LIMITS.MAX_SLIDES) }));
      setIndex(index + 1);
      workspace.pushToast(tx(`Importadas ${slides.length} diapositivas.`, `Imported ${slides.length} slides.`));
    } catch (error) {
      workspace.reportError(error);
    }
  }

  function commitTitle() {
    const name = title.trim() || tx("Presentación sin título", "Untitled presentation");
    setTitle(name);
    if (name !== file.title) setFile((f) => ({ ...f, title: name.slice(0, 180) }), { history: false });
  }

  function saveVersion(label?: string) {
    setFile((f) => ({ ...f, versions: [...(f.versions ?? []), { id: newId(), at: new Date().toISOString(), title: f.title, label, slides: f.slides }].slice(-20) }), { history: false });
  }

  async function makeCopy() {
    if (!workspace.storage) return;
    const id = crypto.randomUUID();
    const name = `${tx("Copia de", "Copy of")} ${file.title}`.slice(0, 180);
    await workspace.storage.saveFile({ id, name, kind: "slide", mime: "application/vnd.orvupi.slides+json", bytes: serializeSlides({ ...file, id, title: name, versions: [] }), snippet: file.slides.map((s) => s.title).join("\n") });
    await workspace.refreshFiles();
    workspace.pushToast(tx("Copia creada en Mi unidad.", "Copy created in My Drive."));
  }

  /* ---------- menús (los mismos que Google Slides) */
  const sel = selection.length > 0;
  const needImage = (run: () => void) => () => { if (single?.kind !== "image") { workspace.pushToast(tx("Selecciona antes una imagen.", "Select an image first.")); return; } run(); };
  const needSel = (run: () => void) => () => { if (selection.length === 0 && !editingId) { workspace.pushToast(tx("Selecciona antes un objeto.", "Select an object first.")); return; } run(); };
  const menus: Array<{ id: string; label: string; items: BarItem[] }> = [
    { id: "file", label: tx("Archivo", "File"), items: [
      { id: "new", label: tx("Nueva presentación", "New presentation"), onSelect: () => void workspace.createSlides(null) },
      { id: "import", label: tx("Importar diapositivas", "Import slides"), onSelect: () => importRef.current?.click() },
      { id: "copy", label: tx("Hacer una copia", "Make a copy"), onSelect: () => void makeCopy().catch(workspace.reportError) },
      { id: "download", label: tx("Descargar", "Download"), children: [
        { id: "pptx", label: "Microsoft PowerPoint (.pptx)", onSelect: () => void doExport("pptx") },
        { id: "pdf", label: tx("Documento PDF (.pdf)", "PDF document (.pdf)"), onSelect: () => void doExport("pdf") },
        { id: "png", label: tx("Imagen PNG (diapositiva actual)", "PNG image (current slide)"), onSelect: () => void doExport("png") },
        { id: "txt", label: tx("Texto sin formato (.txt)", "Plain text (.txt)"), onSelect: () => void doExport("txt") },
        { id: "orv", label: tx("Presentación ORVUPI (.orvslides)", "ORVUPI presentation (.orvslides)"), onSelect: () => void doExport("orvslides") },
      ] },
      { id: "pdf", label: tx("Exportar PDF", "Export PDF"), onSelect: () => void doExport("pdf") },
      { id: "rename", label: tx("Cambiar nombre", "Rename"), onSelect: () => requestAnimationFrame(() => { const name = document.querySelector<HTMLInputElement>(".sl-name"); name?.focus(); name?.select(); }) },
      { id: "versions", label: tx("Historial de versiones", "Version history"), onSelect: () => setDialog("versions") },
      { id: "print", label: tx("Imprimir", "Print"), hint: "Ctrl+P", onSelect: () => setPrinting(true) },
      { id: "close", label: tx("Cerrar", "Close"), onSelect: () => workspace.closeDoc() },
    ] },
    { id: "edit", label: tx("Editar", "Edit"), items: [
      { id: "undo", label: tx("Deshacer", "Undo"), hint: "Ctrl+Z", onSelect: undo },
      { id: "redo", label: tx("Rehacer", "Redo"), hint: "Ctrl+Y", onSelect: redo },
      { id: "cut", label: tx("Cortar", "Cut"), hint: "Ctrl+X", onSelect: () => void copySel(true) },
      { id: "copy", label: tx("Copiar", "Copy"), hint: "Ctrl+C", onSelect: () => void copySel(false) },
      { id: "paste", label: tx("Pegar", "Paste"), hint: "Ctrl+V", onSelect: () => void pasteInternal() },
      { id: "all", label: tx("Seleccionar todo", "Select all"), hint: "Ctrl+A", onSelect: selectAll },
      { id: "delete", label: tx("Eliminar", "Delete"), hint: tx("Supr", "Del"), onSelect: () => (sel ? removeSelection() : deleteSlides()) },
      { id: "remove", label: tx("Quitar objeto", "Remove object"), onSelect: removeSelection },
      { id: "dup", label: tx("Duplicar", "Duplicate"), hint: "Ctrl+D", onSelect: duplicateSel },
      { id: "find", label: tx("Buscar y reemplazar", "Find and replace"), hint: "Ctrl+H", onSelect: () => setDialog("find") },
    ] },
    { id: "view", label: tx("Ver", "View"), items: [
      { id: "present", label: tx("Presentar", "Present"), hint: "Ctrl+Intro", onSelect: () => setPresent({ from: index, presenter: false }) },
      { id: "presenter", label: tx("Vista del presentador", "Presenter view"), onSelect: () => setPresent({ from: index, presenter: true }) },
      { id: "motion", label: tx("Movimiento", "Motion"), onSelect: () => setPanel("motion") },
      { id: "grid", label: tx("Cuadrícula", "Grid"), onSelect: () => setGrid((v) => !v) },
      { id: "master", label: tx("Patrón", "Master"), onSelect: () => setFile((f) => ({ ...f, master: f.master ? "" : tx("Patrón", "Master") })) },
      { id: "rulers", label: rulers ? tx("Ocultar reglas", "Hide rulers") : tx("Mostrar reglas", "Show rulers"), onSelect: () => setRulers((v) => !v) },
      { id: "snap", label: snapOn ? tx("Desactivar guías inteligentes", "Turn off smart guides") : tx("Activar guías inteligentes", "Turn on smart guides"), onSelect: () => setSnapOn((v) => !v) },
      { id: "notes", label: notesOpen ? tx("Ocultar notas del orador", "Hide speaker notes") : tx("Mostrar notas del orador", "Show speaker notes"), onSelect: () => setNotesOpen((v) => !v) },
      { id: "film", label: filmOpen ? tx("Ocultar tira de diapositivas", "Hide filmstrip") : tx("Mostrar tira de diapositivas", "Show filmstrip"), onSelect: () => setFilmOpen((v) => !v) },
      { id: "zoom", label: "Zoom", children: [
        { id: "fit", label: tx("Ajustar", "Fit"), onSelect: () => setZoom("fit") },
        ...ZOOMS.map((z) => ({ id: `z${z}`, label: `${Math.round(z * 100)} %`, onSelect: () => setZoom(z) })),
      ] },
      { id: "full", label: tx("Pantalla completa", "Full screen"), onSelect: () => void document.documentElement.requestFullscreen?.().catch(() => undefined) },
    ] },
    { id: "insert", label: tx("Insertar", "Insert"), items: [
      { id: "image", label: tx("Imagen", "Image"), children: [
        { id: "upload", label: tx("Subir desde el ordenador", "Upload from computer"), onSelect: () => imageRef.current?.click() },
        { id: "url", label: tx("Por URL", "By URL"), onSelect: () => setDialog("imageUrl") },
      ] },
      { id: "text", label: tx("Cuadro de texto", "Text box"), onSelect: () => insertText() },
      { id: "video", label: tx("Vídeo", "Video"), onSelect: () => setDialog("video") },
      { id: "shape", label: tx("Forma", "Shape"), children: SHAPES.map((s) => ({ id: s, label: shapeName(tx, s), onSelect: () => insertShape(s) })) },
      { id: "rect", label: tx("Rectángulo", "Rectangle"), onSelect: () => insertShape("rect") },
      { id: "ellipse", label: tx("Elipse", "Oval"), onSelect: () => insertShape("ellipse") },
      { id: "table", label: tx("Tabla", "Table"), table: insertTable, tableLabels: { custom: tx("Tamaño personalizado", "Custom size"), size: (r, c) => `${c} × ${r}` } },
      { id: "chart", label: tx("Gráfico", "Chart"), children: [
        { id: "bar", label: tx("Barras", "Bar"), onSelect: () => insertChart("bar") },
        { id: "column", label: tx("Columnas", "Column"), onSelect: () => insertChart("column") },
        { id: "line", label: tx("Líneas", "Line"), onSelect: () => insertChart("line") },
        { id: "pie", label: tx("Circular", "Pie"), onSelect: () => insertChart("pie") },
      ] },
      { id: "diagram", label: tx("Diagrama", "Diagram"), children: [
        { id: "process", label: tx("Proceso", "Process"), onSelect: () => insertDiagram("process") },
        { id: "timeline", label: tx("Cronología", "Timeline"), onSelect: () => insertDiagram("timeline") },
        { id: "cycle", label: tx("Ciclo", "Cycle"), onSelect: () => insertDiagram("cycle") },
      ] },
      { id: "line", label: tx("Línea", "Line"), onSelect: () => insertLine(false) },
      { id: "arrow", label: tx("Flecha", "Arrow"), onSelect: () => insertLine(true) },
      { id: "anim", label: tx("Animación", "Animation"), onSelect: () => setPanel("motion") },
      { id: "link", label: tx("Enlace", "Link"), hint: "Ctrl+K", onSelect: needSel(() => setDialog("link")) },
      { id: "comment", label: tx("Comentario", "Comment"), hint: "Ctrl+Alt+M", onSelect: () => setPanel("comments") },
      { id: "newslide", label: tx("Nueva diapositiva", "New slide"), hint: "Ctrl+M", onSelect: () => newSlide() },
      { id: "numbers", label: file.numbers ? tx("Quitar números de diapositiva", "Remove slide numbers") : tx("Números de diapositiva", "Slide numbers"), onSelect: () => setFile((f) => ({ ...f, numbers: f.numbers ? undefined : true })) },
    ] },
    { id: "format", label: tx("Formato", "Format"), items: [
      { id: "text", label: tx("Texto", "Text"), children: [
        { id: "underline", label: tx("Subrayado", "Underline"), hint: "Ctrl+U", onSelect: needSel(() => patchText({ underline: !textItem?.underline })) },
        { id: "strike", label: tx("Tachado", "Strikethrough"), onSelect: needSel(() => patchText({ strike: !textItem?.strike })) },
        { id: "bigger", label: tx("Aumentar tamaño de fuente", "Increase font size"), hint: "Ctrl+Mayús+.", onSelect: needSel(() => patchText({ size: stepSize(textItem?.size ?? 18, 1) })) },
        { id: "smaller", label: tx("Reducir tamaño de fuente", "Decrease font size"), hint: "Ctrl+Mayús+,", onSelect: needSel(() => patchText({ size: stepSize(textItem?.size ?? 18, -1) })) },
      ] },
      { id: "bold", label: tx("Negrita", "Bold"), hint: "Ctrl+B", onSelect: () => {
        const ids = editingId ? [editingId] : selection.length > 0 ? selection : slide.items.filter(hasText).slice(0, 1).map((i) => i.id);
        const first = slide.items.find((i) => ids.includes(i.id));
        patchItems(ids, (i) => (hasText(i) ? ({ ...i, bold: !(hasText(first) && first.bold) } as SlideItem) : i));
        if (ids[0]) setSelection(ids);
      } },
      { id: "italic", label: tx("Cursiva", "Italic"), hint: "Ctrl+I", onSelect: needSel(() => patchText({ italic: !textItem?.italic })) },
      { id: "align", label: tx("Alinear y sangría", "Align and indent"), children: [
        { id: "l", label: tx("Izquierda", "Left"), onSelect: needSel(() => patchText({ align: "left" })) },
        { id: "c", label: tx("Centro", "Center"), onSelect: needSel(() => patchText({ align: "center" })) },
        { id: "r", label: tx("Derecha", "Right"), onSelect: needSel(() => patchText({ align: "right" })) },
        { id: "j", label: tx("Justificado", "Justified"), onSelect: needSel(() => patchText({ align: "justify" })) },
        { id: "top", label: tx("Arriba", "Top"), onSelect: needSel(() => patchText({ valign: "top" })) },
        { id: "middle", label: tx("En medio", "Middle"), onSelect: needSel(() => patchText({ valign: "middle" })) },
        { id: "bottom", label: tx("Abajo", "Bottom"), onSelect: needSel(() => patchText({ valign: "bottom" })) },
      ] },
      { id: "spacing", label: tx("Interlineado", "Line spacing"), children: [1, 1.15, 1.5, 2].map((v) => ({ id: String(v), label: String(v).replace(".", ","), onSelect: needSel(() => patchText({ lineHeight: v })) })) },
      { id: "lists", label: tx("Viñetas y numeración", "Bullets and numbering"), children: [
        { id: "bullet", label: tx("Lista con viñetas", "Bulleted list"), onSelect: needSel(() => patchText({ list: "bullet" })) },
        { id: "number", label: tx("Lista numerada", "Numbered list"), onSelect: needSel(() => patchText({ list: "number" })) },
        { id: "none", label: tx("Sin lista", "No list"), onSelect: needSel(() => patchText({ list: "none" })) },
      ] },
      { id: "image", label: tx("Imagen", "Image"), children: [
        { id: "crop", label: tx("Recortar imagen", "Crop image"), onSelect: needImage(() => setDialog("crop")) },
        { id: "reset", label: tx("Restablecer imagen", "Reset image"), onSelect: needImage(() => single && patchItems([single.id], (i) => (i.kind === "image" ? { ...i, crop: undefined, opacity: undefined, rot: undefined, flipH: undefined, flipV: undefined } : i))) },
        { id: "replace", label: tx("Sustituir imagen", "Replace image"), onSelect: needImage(() => replaceRef.current?.click()) },
      ] },
      { id: "options", label: tx("Opciones de formato", "Format options"), onSelect: () => setPanel("format") },
      { id: "anim", label: tx("Animar objeto", "Animate object"), onSelect: () => {
        const ids = selection.length > 0 ? selection : slide.items.slice(0, 1).map((i) => i.id);
        patchItems(ids, (i) => ({ ...i, anim: i.anim ? undefined : "fade" }));
      } },
      { id: "clear", label: tx("Borrar formato", "Clear formatting"), onSelect: needSel(() => patchText({ bold: undefined, italic: undefined, underline: undefined, strike: undefined, color: undefined, highlight: undefined, font: undefined, lineHeight: undefined })) },
    ] },
    { id: "slide", label: tx("Diapositiva", "Slide"), items: [
      { id: "new", label: tx("Nueva diapositiva", "New slide"), hint: "Ctrl+M", onSelect: () => newSlide() },
      { id: "dup", label: tx("Duplicar diapositiva", "Duplicate slide"), onSelect: duplicateSlides },
      { id: "del", label: tx("Eliminar diapositiva", "Delete slide"), onSelect: deleteSlides },
      { id: "skip", label: slide.hidden ? tx("No omitir diapositiva", "Unskip slide") : tx("Omitir diapositiva", "Skip slide"), onSelect: toggleSkip },
      { id: "move", label: tx("Mover diapositiva", "Move slide"), children: [
        { id: "first", label: tx("Al principio", "To beginning"), onSelect: () => moveCurrent(0) },
        { id: "up", label: tx("Hacia arriba", "Up"), hint: "Ctrl+↑", onSelect: () => moveCurrent(index - 1) },
        { id: "down", label: tx("Hacia abajo", "Down"), hint: "Ctrl+↓", onSelect: () => moveCurrent(index + 1) },
        { id: "last", label: tx("Al final", "To end"), onSelect: () => moveCurrent(file.slides.length - 1) },
      ] },
      { id: "bg", label: tx("Cambiar fondo", "Change background"), onSelect: () => setDialog("background") },
      { id: "layout", label: tx("Aplicar diseño", "Apply layout"), children: SLIDE_LAYOUTS.map((l) => ({ id: l, label: layoutName(tx, l), onSelect: () => setLayout(l) })) },
      { id: "transition", label: tx("Transición", "Transition"), onSelect: () => setPanel("motion") },
      { id: "theme", label: tx("Cambiar tema", "Change theme"), onSelect: () => setPanel("themes") },
    ] },
    { id: "arrange", label: tx("Organizar", "Arrange"), items: [
      { id: "order", label: tx("Ordenar", "Order"), children: [
        { id: "front", label: tx("Traer al frente", "Bring to front"), hint: "Ctrl+Mayús+↑", onSelect: () => order("front") },
        { id: "forward", label: tx("Traer adelante", "Bring forward"), hint: "Ctrl+↑", onSelect: () => order("forward") },
        { id: "backward", label: tx("Enviar atrás", "Send backward"), hint: "Ctrl+↓", onSelect: () => order("backward") },
        { id: "back", label: tx("Enviar al fondo", "Send to back"), hint: "Ctrl+Mayús+↓", onSelect: () => order("back") },
      ] },
      { id: "align", label: tx("Alinear", "Align"), children: (["left", "center", "right", "top", "middle", "bottom"] as const).map((e) => ({ id: e, label: { left: tx("Izquierda", "Left"), center: tx("Centro", "Center"), right: tx("Derecha", "Right"), top: tx("Arriba", "Top"), middle: tx("En medio", "Middle"), bottom: tx("Abajo", "Bottom") }[e], onSelect: () => align(e) })) },
      { id: "centerpage", label: tx("Centrar en la página", "Center on page"), children: [
        { id: "h", label: tx("Horizontalmente", "Horizontally"), onSelect: () => align("center", true) },
        { id: "v", label: tx("Verticalmente", "Vertically"), onSelect: () => align("middle", true) },
      ] },
      { id: "distribute", label: tx("Distribuir", "Distribute"), children: [
        { id: "h", label: tx("Horizontalmente", "Horizontally"), onSelect: () => patchSlide((s) => ({ ...s, items: distribute(s.items, selection, "x") })) },
        { id: "v", label: tx("Verticalmente", "Vertically"), onSelect: () => patchSlide((s) => ({ ...s, items: distribute(s.items, selection, "y") })) },
      ] },
      { id: "rotate", label: tx("Girar", "Rotate"), children: [
        { id: "cw", label: tx("Girar 90° a la derecha", "Rotate clockwise 90°"), onSelect: () => rotate(90) },
        { id: "ccw", label: tx("Girar 90° a la izquierda", "Rotate counter-clockwise 90°"), onSelect: () => rotate(-90) },
        { id: "fh", label: tx("Voltear horizontalmente", "Flip horizontally"), onSelect: () => patchItems(selection, (i) => flipItem(i, "h")) },
        { id: "fv", label: tx("Voltear verticalmente", "Flip vertically"), onSelect: () => patchItems(selection, (i) => flipItem(i, "v")) },
      ] },
      { id: "group", label: tx("Agrupar", "Group"), hint: "Ctrl+G", onSelect: () => group(true) },
      { id: "ungroup", label: tx("Desagrupar", "Ungroup"), hint: "Ctrl+Mayús+G", onSelect: () => group(false) },
    ] },
    { id: "tools", label: tx("Herramientas", "Tools"), items: [
      { id: "center", label: tx("Centrar", "Center"), onSelect: () => align("center", true) },
      { id: "dist", label: tx("Distribuir", "Distribute"), onSelect: () => patchSlide((s) => ({ ...s, items: distribute(s.items, selection.length >= 3 ? selection : s.items.map((i) => i.id), "x") })) },
      { id: "front", label: tx("Traer al frente", "Bring to front"), onSelect: () => order("front") },
      { id: "back", label: tx("Enviar atrás", "Send backward"), onSelect: () => order("back") },
      { id: "snap", label: snapOn ? tx("Desactivar guías inteligentes", "Turn off smart guides") : tx("Activar guías inteligentes", "Turn on smart guides"), onSelect: () => setSnapOn((v) => !v) },
    ] },
    { id: "help", label: tx("Ayuda", "Help"), items: [
      { id: "version", label: workspace.t("appVersion", { version: APP_VERSION }), static: true },
      { id: "keys", label: tx("Combinaciones de teclas", "Keyboard shortcuts"), hint: "Ctrl+/", onSelect: () => setDialog("shortcuts") },
    ] },
  ];

  function ctxItems(): Array<{ id: string; label: string; run: () => void; hint?: string }> {
    if (ctx?.on === "slide") return [
      { id: "new", label: tx("Nueva diapositiva", "New slide"), hint: "Ctrl+M", run: () => newSlide() },
      { id: "dup", label: tx("Duplicar diapositiva", "Duplicate slide"), hint: "Ctrl+D", run: duplicateSlides },
      { id: "del", label: tx("Eliminar", "Delete"), run: deleteSlides },
      { id: "skip", label: slide.hidden ? tx("No omitir diapositiva", "Unskip slide") : tx("Omitir diapositiva", "Skip slide"), run: toggleSkip },
      { id: "copy", label: tx("Copiar", "Copy"), run: () => { clipboard.current = { slides: slideTargets().map((i) => file.slides[i]!) }; } },
      { id: "paste", label: tx("Pegar", "Paste"), run: () => void pasteInternal() },
      { id: "bg", label: tx("Cambiar fondo", "Change background"), run: () => setDialog("background") },
      { id: "layout", label: tx("Aplicar diseño", "Apply layout"), run: () => setLayoutApply(true) },
      { id: "transition", label: tx("Transición", "Transition"), run: () => setPanel("motion") },
      { id: "up", label: tx("Mover hacia arriba", "Move up"), run: () => moveCurrent(index - 1) },
      { id: "down", label: tx("Mover hacia abajo", "Move down"), run: () => moveCurrent(index + 1) },
    ];
    if (ctx?.on === "item" && sel) return [
      { id: "cut", label: tx("Cortar", "Cut"), hint: "Ctrl+X", run: () => void copySel(true) },
      { id: "copy", label: tx("Copiar", "Copy"), hint: "Ctrl+C", run: () => void copySel(false) },
      { id: "paste", label: tx("Pegar", "Paste"), hint: "Ctrl+V", run: () => void pasteInternal() },
      { id: "dup", label: tx("Duplicar", "Duplicate"), hint: "Ctrl+D", run: duplicateSel },
      { id: "del", label: tx("Eliminar", "Delete"), run: removeSelection },
      { id: "front", label: tx("Traer al frente", "Bring to front"), run: () => order("front") },
      { id: "back", label: tx("Enviar al fondo", "Send to back"), run: () => order("back") },
      { id: "center", label: tx("Centrar en la página", "Center on page"), run: () => patchSlide((s) => ({ ...s, items: alignSelection(alignSelection(s.items, selection, "center", true), selection, "middle", true) })) },
      ...(selection.length > 1 ? [{ id: "group", label: tx("Agrupar", "Group"), hint: "Ctrl+G", run: () => group(true) }] : []),
      ...(selectedItems.some((i) => i.group) ? [{ id: "ungroup", label: tx("Desagrupar", "Ungroup"), hint: "Ctrl+Mayús+G", run: () => group(false) }] : []),
      { id: "link", label: tx("Enlace", "Link"), hint: "Ctrl+K", run: () => setDialog("link") },
      { id: "anim", label: tx("Animar", "Animate"), run: () => setPanel("motion") },
      { id: "comment", label: tx("Comentar", "Comment"), run: () => setPanel("comments") },
      { id: "format", label: tx("Opciones de formato", "Format options"), run: () => setPanel("format") },
    ];
    return [
      { id: "paste", label: tx("Pegar", "Paste"), hint: "Ctrl+V", run: () => void pasteInternal() },
      { id: "all", label: tx("Seleccionar todo", "Select all"), hint: "Ctrl+A", run: selectAll },
      { id: "bg", label: tx("Cambiar fondo", "Change background"), run: () => setDialog("background") },
      { id: "layout", label: tx("Aplicar diseño", "Apply layout"), run: () => setLayoutApply(true) },
      { id: "transition", label: tx("Transición", "Transition"), run: () => setPanel("motion") },
      { id: "theme", label: tx("Cambiar tema", "Change theme"), run: () => setPanel("themes") },
    ];
  }

  /* ================================================================ render */
  if (present) {
    return <Presenter file={file} start={present.from} presenter={present.presenter} tx={tx} onExit={(at) => { if (typeof at === "number" && at < 0) { setPresent({ from: -1 - at, presenter: true }); return; } setPresent(null); if (typeof at === "number") setIndex(at); }} />;
  }

  const canvasW = SLIDE_W * scale;
  const canvasH = SLIDE_H * scale;
  const selBox = boxOf(selectedItems);
  // Como Slides: un grupo se ve como un solo objeto (un marco, sin los marcos de cada pieza)
  const asGroup = selectedItems.length > 1 && Boolean(selectedItems[0]!.group) && selectedItems.every((i) => i.group === selectedItems[0]!.group);
  const showRulers = rulers && !phone && !tablet;
  const R = showRulers ? 18 : 0;
  const saveLabel = status === "saved" ? tx("Guardado en este dispositivo", "Saved on this device") : tx("Guardando…", "Saving…");
  const panelTitle = panel === "themes" ? tx("Temas", "Themes") : panel === "motion" ? tx("Movimiento", "Motion") : panel === "comments" ? tx("Comentarios", "Comments") : tx("Opciones de formato", "Format options");

  function textTools(box: SlideItem & TextStyle) {
    const live = editingId === box.id ? selFmt : null;
    const it = live ? { ...box, bold: live.bold, italic: live.italic, underline: live.underline, strike: live.strike, color: live.color ?? box.color } : box;
    const boxSize = box.size ?? (box.kind === "text" && box.placeholder === "title" ? 32 : box.kind === "text" && box.placeholder === "subtitle" ? 24 : box.kind === "text" && box.placeholder === "number" ? 120 : 18);
    const size = live?.size ?? boxSize;
    const boxFont = box.font ?? (box.kind === "text" && (box.placeholder === "title" || box.placeholder === "number") ? theme.titleFont : theme.bodyFont);
    const font = live && (SLIDE_FONTS as readonly string[]).includes(live.font) ? live.font : boxFont;
    return (
      <span className="sl-texttools">
        <select className="sl-font" value={font} onChange={(e) => patchText({ font: e.target.value })} aria-label={tx("Fuente", "Font")}>
          {SLIDE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="sl-size">
          <Icon label={tx("Reducir tamaño de fuente", "Decrease font size")} onClick={() => patchText({ size: stepSize(size, -1) }, "size")}><Minus size={16} /></Icon>
          <SizeBox tx={tx} size={size} onSet={(n, key) => patchText({ size: n }, key)} />
          <Icon label={tx("Aumentar tamaño de fuente", "Increase font size")} onClick={() => patchText({ size: stepSize(size, 1) }, "size")}><Plus size={16} /></Icon>
        </span>
        <Icon label={tx("Negrita", "Bold")} pressed={Boolean(it.bold)} onClick={() => patchText({ bold: !it.bold })}><Bold size={18} /></Icon>
        <Icon label={tx("Cursiva", "Italic")} pressed={Boolean(it.italic)} onClick={() => patchText({ italic: !it.italic })}><Italic size={18} /></Icon>
        <Icon label={tx("Subrayado", "Underline")} pressed={Boolean(it.underline)} onClick={() => patchText({ underline: !it.underline })}><Underline size={18} /></Icon>
        <Icon label={tx("Tachado", "Strikethrough")} pressed={Boolean(it.strike)} onClick={() => patchText({ strike: !it.strike })}><Strikethrough size={18} /></Icon>
        <ToolPop label={tx("Color del texto", "Text colour")} icon={<Baseline size={18} style={{ color: it.color }} />}>
          {(close) => <ColorGrid tx={tx} value={it.color} onPick={(c) => { patchText({ color: c }); close(); }} />}
        </ToolPop>
        <ToolPop label={tx("Color de resaltado", "Highlight colour")} icon={<Highlighter size={18} />}>
          {(close) => <ColorGrid tx={tx} allowNone value={it.highlight} onPick={(c) => { patchText({ highlight: c === "none" ? undefined : c }); close(); }} />}
        </ToolPop>
        <ToolPop label={tx("Alinear", "Align")} icon={it.align === "center" ? <AlignCenter size={18} /> : it.align === "right" ? <AlignRight size={18} /> : it.align === "justify" ? <AlignJustify size={18} /> : <AlignLeft size={18} />}>
          {(close) => (
            <div className="sl-row" role="group" aria-label={tx("Alineación", "Alignment")}>
              <Icon label={tx("Alinear a la izquierda", "Left align")} pressed={(it.align ?? "left") === "left"} onClick={() => { patchText({ align: "left" }); close(); }}><AlignLeft size={18} /></Icon>
              <Icon label={tx("Centrar", "Center align")} pressed={it.align === "center"} onClick={() => { patchText({ align: "center" }); close(); }}><AlignCenter size={18} /></Icon>
              <Icon label={tx("Alinear a la derecha", "Right align")} pressed={it.align === "right"} onClick={() => { patchText({ align: "right" }); close(); }}><AlignRight size={18} /></Icon>
              <Icon label={tx("Justificar", "Justify")} pressed={it.align === "justify"} onClick={() => { patchText({ align: "justify" }); close(); }}><AlignJustify size={18} /></Icon>
              <span className="sl-sep" />
              <Icon label={tx("Arriba", "Top")} pressed={it.valign === "top"} onClick={() => { patchText({ valign: "top" }); close(); }}><span className="sl-glyph">⤒</span></Icon>
              <Icon label={tx("En medio", "Middle")} pressed={it.valign === "middle"} onClick={() => { patchText({ valign: "middle" }); close(); }}><span className="sl-glyph">↕</span></Icon>
              <Icon label={tx("Abajo", "Bottom")} pressed={it.valign === "bottom"} onClick={() => { patchText({ valign: "bottom" }); close(); }}><span className="sl-glyph">⤓</span></Icon>
            </div>
          )}
        </ToolPop>
        <ToolPop label={tx("Interlineado", "Line spacing")} icon={<span className="sl-glyph">↕≡</span>}>
          {(close) => (
            <div role="menu" className="sl-list" aria-label={tx("Interlineado", "Line spacing")}>
              {[1, 1.15, 1.5, 2].map((v) => <button key={v} type="button" role="menuitemradio" aria-checked={(it.lineHeight ?? 1.15) === v} onClick={() => { patchText({ lineHeight: v }); close(); }}>{String(v).replace(".", ",")}</button>)}
            </div>
          )}
        </ToolPop>
        <Icon label={tx("Lista con viñetas", "Bulleted list")} pressed={it.list === "bullet"} onClick={() => patchText({ list: it.list === "bullet" ? "none" : "bullet" })}><List size={18} /></Icon>
        <Icon label={tx("Lista numerada", "Numbered list")} pressed={it.list === "number"} onClick={() => patchText({ list: it.list === "number" ? "none" : "number" })}><ListOrdered size={18} /></Icon>
      </span>
    );
  }

  function contextTools() {
    const shape = single?.kind === "shape" ? single : undefined;
    const line = single?.kind === "line" ? single : undefined;
    const image = single?.kind === "image" ? single : undefined;
    const fillTarget = shape ?? (single?.kind === "text" ? single : undefined);
    const endName = (e: "none" | "arrow" | "dot") => (e === "none" ? tx("ninguna", "none") : e === "arrow" ? tx("flecha", "arrow") : tx("punto", "dot"));
    return (
      <span className="sl-context">
        {fillTarget ? (
          <ToolPop label={tx("Color de relleno", "Fill colour")} icon={<PaintBucket size={18} />}>
            {(close) => <ColorGrid tx={tx} allowNone value={fillTarget.fill} onPick={(c) => { patchItems(selection, (i) => (i.kind === "shape" ? { ...i, fill: c } : i.kind === "text" ? { ...i, fill: c === "none" ? undefined : c } : i)); close(); }} />}
          </ToolPop>
        ) : null}
        {shape || line ? (
          <>
            <ToolPop label={tx("Color del borde", "Border colour")} icon={<span className="sl-border-ico" />}>
              {(close) => <ColorGrid tx={tx} allowNone={Boolean(shape)} value={shape?.stroke ?? line?.color} onPick={(c) => { patchItems(selection, (i) => (i.kind === "shape" ? { ...i, stroke: c } : i.kind === "line" ? { ...i, color: c === "none" ? undefined : c } : i)); close(); }} />}
            </ToolPop>
            <ToolPop label={tx("Grosor del borde", "Border weight")} icon={<span className="sl-glyph">≡</span>}>
              {(close) => (
                <div role="menu" className="sl-list" aria-label={tx("Grosor", "Weight")}>
                  {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((w) => <button key={w} type="button" role="menuitem" onClick={() => { patchItems(selection, (i) => (i.kind === "shape" ? { ...i, strokeWidth: w } : i.kind === "line" ? { ...i, width: w } : i)); close(); }}>{w} px</button>)}
                </div>
              )}
            </ToolPop>
            <ToolPop label={tx("Trazo del borde", "Border dash")} icon={<span className="sl-glyph">┄</span>}>
              {(close) => (
                <div role="menu" className="sl-list" aria-label={tx("Trazo", "Dash")}>
                  {(["solid", "dash", "dot"] as Dash[]).map((d) => <button key={d} type="button" role="menuitem" onClick={() => { patchItems(selection, (i) => (i.kind === "shape" || i.kind === "line" ? { ...i, dash: d === "solid" ? undefined : d } : i)); close(); }}>{d === "solid" ? tx("Continuo", "Solid") : d === "dash" ? tx("Discontinuo", "Dashed") : tx("Punteado", "Dotted")}</button>)}
                </div>
              )}
            </ToolPop>
          </>
        ) : null}
        {line ? (
          <ToolPop label={tx("Puntas de línea", "Line ends")} icon={<span className="sl-glyph">→</span>}>
            {(close) => (
              <div role="menu" className="sl-list" aria-label={tx("Puntas", "Ends")}>
                {(["none", "arrow", "dot"] as const).map((e) => <button key={`s${e}`} type="button" role="menuitem" onClick={() => { patchItems(selection, (i) => (i.kind === "line" ? { ...i, start: e === "none" ? undefined : e } : i)); close(); }}>{tx("Inicio", "Start")}: {endName(e)}</button>)}
                {(["none", "arrow", "dot"] as const).map((e) => <button key={`e${e}`} type="button" role="menuitem" onClick={() => { patchItems(selection, (i) => (i.kind === "line" ? { ...i, end: e === "none" ? undefined : e } : i)); close(); }}>{tx("Final", "End")}: {endName(e)}</button>)}
              </div>
            )}
          </ToolPop>
        ) : null}
        {image ? (
          <>
            <button type="button" className="sl-textbtn" onClick={() => setDialog("crop")}>{tx("Recortar", "Crop")}</button>
            <button type="button" className="sl-textbtn" onClick={() => replaceRef.current?.click()}>{tx("Sustituir imagen", "Replace image")}</button>
          </>
        ) : null}
        {textItem ? textTools(textItem) : null}
        {single?.kind === "table" ? <button type="button" className="sl-textbtn" onClick={() => setDialog("table")}>{tx("Editar tabla", "Edit table")}</button> : null}
        {single?.kind === "chart" ? <button type="button" className="sl-textbtn" onClick={() => setDialog("chart")}>{tx("Editar datos", "Edit data")}</button> : null}
        <Icon label={tx("Insertar enlace", "Insert link")} onClick={() => setDialog("link")}><Link2 size={18} /></Icon>
        <button type="button" className="sl-textbtn" aria-pressed={panel === "format"} onClick={() => setPanel((p) => (p === "format" ? null : "format"))}>{tx("Opciones de formato", "Format options")}</button>
        <button type="button" className="sl-textbtn" aria-pressed={panel === "motion"} onClick={() => setPanel((p) => (p === "motion" ? null : "motion"))}>{tx("Animar", "Animate")}</button>
      </span>
    );
  }

  function themesPanel() {
    return (
      <div className="sl-themes">
        <p className="sl-panel-note">{tx("En esta presentación", "In this presentation")}: <strong>{themeName(tx, slide.theme)}</strong></p>
        <ul className="sl-theme-list">
          {SLIDE_THEMES.map((t) => {
            const base = blankSlide("title", t);
            const sample: Slide = { ...base, items: base.items.map((i) => (i.kind === "text" ? { ...i, text: i.placeholder === "title" ? tx("Haz clic para añadir un título", "Click to add title") : tx("Haz clic para añadir un subtítulo", "Click to add subtitle") } : i)) };
            return (
              <li key={t}>
                <button type="button" className={`sl-theme${slide.theme === t ? " is-on" : ""}`} aria-pressed={slide.theme === t} onClick={() => applyTheme(t)}>
                  <SlideView slide={sample} scale={0.28} />
                  <span>{themeName(tx, t)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Button onClick={() => importRef.current?.click()}>{tx("Importar tema", "Import theme")}</Button>
      </div>
    );
  }

  function motionPanel() {
    const target = single;
    const animated = slide.items.filter((i) => i.anim);
    return (
      <div className="sl-motion">
        <section>
          <h3>{tx("Transición de diapositiva", "Slide transition")}</h3>
          <label className="sl-field">{tx("Tipo", "Type")}
            <select value={slide.transition ?? "none"} onChange={(e) => { const transition = e.target.value as SlideTransition; patchSlide((s) => ({ ...s, transition })); }}>
              {SLIDE_TRANSITIONS.map((t) => <option key={t} value={t}>{transitionName(tx, t)}</option>)}
            </select>
          </label>
          <label className="sl-field">{tx("Duración", "Duration")}: {(slide.duration ?? 0.6).toFixed(1).replace(".", ",")} s
            <input type="range" min={0.1} max={5} step={0.1} value={slide.duration ?? 0.6} onChange={(e) => { const duration = Number(e.target.value); patchSlide((s) => ({ ...s, duration }), { key: "dur" }); }} />
          </label>
          <Button onClick={() => setFile((f) => ({ ...f, slides: f.slides.map((s) => ({ ...s, transition: slide.transition, duration: slide.duration })) }))}>{tx("Aplicar a todas las diapositivas", "Apply to all slides")}</Button>
        </section>
        <section>
          <h3>{tx("Animaciones de objetos", "Object animations")}</h3>
          {target ? (
            <label className="sl-field">{itemLabel(tx, target)}
              <select value={target.anim ?? ""} onChange={(e) => { const anim = (e.target.value || undefined) as SlideAnim | undefined; patchItems([target.id], (i) => ({ ...i, anim })); }}>
                <option value="">{tx("Sin animación", "No animation")}</option>
                {SLIDE_ANIMS.map((a) => <option key={a} value={a}>{animName(tx, a)}</option>)}
              </select>
            </label>
          ) : <p className="sl-panel-note">{tx("Selecciona un objeto para animarlo. Al presentar, cada animación sale al hacer clic, en este orden:", "Select an object to animate it. When presenting, each animation plays on click, in this order:")}</p>}
          <ol className="sl-anim-list">
            {animated.map((i) => (
              <li key={i.id}>
                <button type="button" className="sl-textbtn" onClick={() => setSelection([i.id])}>{itemLabel(tx, i)} · {animName(tx, i.anim!)}</button>
                <Icon label={tx("Quitar animación", "Remove animation")} onClick={() => patchItems([i.id], (x) => ({ ...x, anim: undefined }))}><X size={14} /></Icon>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  function formatPanel() {
    const target = single;
    if (!target) return <p className="sl-panel-note">{tx("Selecciona un objeto para ver su tamaño, posición y giro.", "Select an object to see its size, position and rotation.")}</p>;
    const toCm = (v: number) => Math.round((v / (SLIDE_W / 25.4)) * 100) / 100;
    const toPx = (v: number) => v * (SLIDE_W / 25.4);
    const field = (label: string, value: number, apply: (v: number) => void) => (
      <label className="sl-field is-num">{label}
        <input type="number" step={0.1} value={value} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && e.target.value !== "") apply(n); }} />
      </label>
    );
    return (
      <div className="sl-format">
        <h3>{tx("Tamaño y giro", "Size and rotation")}</h3>
        <div className="sl-grid2">
          {field(tx("Ancho (cm)", "Width (cm)"), toCm(target.w), (v) => patchItems([target.id], (i) => setBox(i, { x: i.x, y: i.y, w: Math.max(1, toPx(v)), h: i.h }), "fw"))}
          {field(tx("Alto (cm)", "Height (cm)"), toCm(target.h), (v) => patchItems([target.id], (i) => setBox(i, { x: i.x, y: i.y, w: i.w, h: Math.max(1, toPx(v)) }), "fh"))}
          {target.kind !== "line" ? field(tx("Ángulo (°)", "Angle (°)"), target.rot ?? 0, (v) => patchItems([target.id], (i) => ({ ...i, rot: ((v % 360) + 360) % 360 }), "fr")) : null}
        </div>
        <h3>{tx("Posición", "Position")}</h3>
        <div className="sl-grid2">
          {field("X (cm)", toCm(target.x), (v) => patchItems([target.id], (i) => moveItem(i, toPx(v) - i.x, 0), "fx"))}
          {field("Y (cm)", toCm(target.y), (v) => patchItems([target.id], (i) => moveItem(i, 0, toPx(v) - i.y), "fy"))}
        </div>
        {target.kind === "image" ? (
          <label className="sl-field">{tx("Transparencia", "Transparency")}
            <input type="range" min={0} max={0.9} step={0.05} value={1 - (target.opacity ?? 1)} onChange={(e) => { const o = 1 - Number(e.target.value); patchItems([target.id], (i) => (i.kind === "image" ? { ...i, opacity: o } : i), "op"); }} />
          </label>
        ) : null}
        {target.link ? <p className="sl-panel-note">{tx("Enlace", "Link")}: {target.link}</p> : null}
      </div>
    );
  }

  const zoomText = zoom === "fit" ? tx("Ajustar", "Fit") : `${Math.round(scale * 100)} %`;
  return (
    <div className={`ow-slides-page sl-root${phone ? " is-phone" : tablet ? " is-tablet" : ""}${panel ? " has-panel" : ""}${filmOpen ? "" : " no-film"}`} data-tool="slides" data-version={APP_VERSION}>
      <h1 className="ow-sr">{file.title}</h1>
      <header className="sl-head">
        <button type="button" className="sl-logo" aria-label={tx("Volver a ORVUPI Work", "Back to ORVUPI Work")} onClick={() => workspace.closeDoc()}>
          <img src={withBase("/avatar.png")} alt="" width={40} height={40} />
        </button>
        <div className="sl-titleblock">
          <div className="sl-titlerow">
            <input className="sl-name" aria-label={tx("Nombre del archivo", "File name")} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 180))} onBlur={commitTitle} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
            <Icon label={tx("Destacar", "Star")} pressed={starred} className={starred ? "is-on" : ""} onClick={() => {
              const next = !starred;
              setStarred(next);
              void workspace.storage?.setFavorite(file.id, next).then(() => workspace.refreshFiles()).catch(workspace.reportError);
            }}><Star size={18} fill={starred ? "currentColor" : "none"} /></Icon>
            <p role="status" className="sl-save">{saveLabel}</p>
          </div>
          {menusOpen ? <MenuBar className="sl-menus" label={tx("Barra de menús", "Menu bar")} menus={menus} compact={phone} /> : null}
        </div>
        <div className="sl-actions">
          {!phone ? <Icon label={tx("Comentarios", "Comments")} pressed={panel === "comments"} onClick={() => setPanel((p) => (p === "comments" ? null : "comments"))}><MessageSquarePlus size={20} /></Icon> : null}
          <div className="sl-present">
            <button type="button" className="sl-present-main" onClick={() => setPresent({ from: index, presenter: false })}>{tx("Presentar", "Present")}</button>
            <button type="button" className="sl-present-caret" aria-label={tx("Opciones de presentación", "Presentation options")} aria-haspopup="menu" aria-expanded={presentMenu} onClick={() => setPresentMenu((v) => !v)}><ChevronDown size={18} /></button>
            <Pop open={presentMenu} onClose={() => setPresentMenu(false)} label={tx("Opciones de presentación", "Presentation options")} className="sl-present-menu">
              <div role="menu" className="sl-list" aria-label={tx("Opciones de presentación", "Presentation options")}>
                <button type="button" role="menuitem" onClick={() => { setPresentMenu(false); setPresent({ from: 0, presenter: false }); }}>{tx("Presentar desde el principio", "Present from beginning")}</button>
                <button type="button" role="menuitem" onClick={() => { setPresentMenu(false); setPresent({ from: index, presenter: true }); }}>{tx("Vista del presentador", "Presenter view")}</button>
              </div>
            </Pop>
          </div>
        </div>
      </header>

      <div className="sl-toolbar" role="toolbar" aria-label={tx("Barra de herramientas", "Toolbar")}>
        <Icon label={tx("Buscar en los menús", "Search the menus")} onClick={() => setDialog("find")}><Search size={18} /></Icon>
        <span className="sl-split">
          <Icon label={tx("Nueva diapositiva", "New slide")} onClick={() => newSlide()}><Plus size={18} /></Icon>
          <span className="sl-toolpop">
            <Icon label={tx("Elegir el diseño de la nueva diapositiva", "Choose the new slide layout")} className="is-caret" pressed={layoutMenu} expanded={layoutMenu} onClick={() => setLayoutMenu((v) => !v)}><ChevronDown size={14} /></Icon>
            <Pop open={layoutMenu} onClose={() => setLayoutMenu(false)} label={tx("Diseños", "Layouts")} className="sl-layouts">
              <div role="menu" aria-label={tx("Diseños", "Layouts")} className="sl-layout-grid">
                {SLIDE_LAYOUTS.map((l) => <LayoutTile key={l} tx={tx} layout={l} theme={slide.theme} onPick={() => { setLayoutMenu(false); newSlide(l); }} />)}
              </div>
            </Pop>
          </span>
        </span>
        <Icon label={tx("Deshacer", "Undo")} onClick={undo} disabled={past.current.length === 0}><Undo2 size={18} /></Icon>
        <Icon label={tx("Rehacer", "Redo")} onClick={redo} disabled={future.current.length === 0}><Redo2 size={18} /></Icon>
        <Icon label={tx("Imprimir", "Print")} onClick={() => setPrinting(true)}><Printer size={18} /></Icon>
        <Icon label={tx("Copiar formato", "Paint format")} pressed={Boolean(painter)} onClick={() => {
          if (painter) { setPainter(null); return; }
          const src = selectedItems[0];
          if (!src) { workspace.pushToast(tx("Selecciona antes un objeto.", "Select an object first.")); return; }
          const style = hasText(src) ? { font: src.font, size: src.size, color: src.color, bold: src.bold, italic: src.italic, underline: src.underline, strike: src.strike, align: src.align, lineHeight: src.lineHeight } : {};
          setPainter({ ...style, ...(src.kind === "shape" ? { fill: src.fill, stroke: src.stroke } : {}) });
        }}><Paintbrush size={18} /></Icon>
        <ToolPop label={`${tx("Zoom", "Zoom")}: ${zoomText}`} className="is-wide" icon={<span className="sl-zoom-label">{zoomText}<ChevronDown size={14} /></span>}>
          {(close) => (
            <div role="menu" aria-label="Zoom" className="sl-list">
              <button type="button" role="menuitem" onClick={() => { setZoom("fit"); close(); }}>{tx("Ajustar", "Fit")}</button>
              {ZOOMS.map((z) => <button key={z} type="button" role="menuitem" onClick={() => { setZoom(z); close(); }}>{Math.round(z * 100)} %</button>)}
            </div>
          )}
        </ToolPop>
        <span className="sl-sep" />
        <Icon label={tx("Seleccionar", "Select")} pressed={tool === "select"} onClick={() => setTool("select")}><MousePointer2 size={18} /></Icon>
        <Icon label={tx("Herramienta de cuadro de texto", "Text box tool")} pressed={tool === "text"} onClick={() => setTool(tool === "text" ? "select" : "text")}><Type size={18} /></Icon>
        <Icon label={tx("Insertar imagen", "Insert image")} onClick={() => imageRef.current?.click()}><ImageIcon size={18} /></Icon>
        <ToolPop label={tx("Forma", "Shape")} icon={<Shapes size={18} />}>
          {(close) => (
            <div className="sl-shape-grid" role="menu" aria-label={tx("Formas", "Shapes")}>
              {SHAPES.map((s) => (
                <button key={s} type="button" role="menuitem" title={shapeName(tx, s)} aria-label={shapeName(tx, s)} onClick={() => { setTool(`shape:${s}`); close(); }}>
                  <svg viewBox="-6 -6 112 112" aria-hidden="true"><path d={shapePath(s)} fill="none" stroke="currentColor" strokeWidth={7} /></svg>
                </button>
              ))}
            </div>
          )}
        </ToolPop>
        <ToolPop label={tx("Línea", "Line")} icon={<Slash size={18} />}>
          {(close) => (
            <div role="menu" aria-label={tx("Líneas", "Lines")} className="sl-list">
              <button type="button" role="menuitem" onClick={() => { setTool("line"); close(); }}>{tx("Línea", "Line")}</button>
              <button type="button" role="menuitem" onClick={() => { setTool("arrow"); close(); }}>{tx("Flecha", "Arrow")}</button>
            </div>
          )}
        </ToolPop>
        <Icon label={tx("Añadir comentario", "Add comment")} onClick={() => setPanel("comments")}><MessageSquarePlus size={18} /></Icon>
        <span className="sl-sep" />
        {selection.length === 0 && !editingId ? (
          <span className="sl-context">
            <button type="button" className="sl-textbtn" onClick={() => setDialog("background")}>{tx("Fondo", "Background")}</button>
            <button type="button" className="sl-textbtn" onClick={() => setLayoutApply(true)}>{tx("Diseño", "Layout")}</button>
            <button type="button" className="sl-textbtn" aria-pressed={panel === "themes"} onClick={() => setPanel((p) => (p === "themes" ? null : "themes"))}>{tx("Tema", "Theme")}</button>
            <button type="button" className="sl-textbtn" aria-pressed={panel === "motion"} onClick={() => setPanel((p) => (p === "motion" ? null : "motion"))}>{tx("Transición", "Transition")}</button>
          </span>
        ) : contextTools()}
        <span className="sl-grow" />
        <Icon label={menusOpen ? tx("Ocultar los menús", "Hide the menus") : tx("Mostrar los menús", "Show the menus")} onClick={() => setMenusOpen((v) => !v)}>{menusOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</Icon>
      </div>

      <div className="sl-body">
        {filmOpen ? (
          <aside className="sl-film" aria-label={tx("Tira de diapositivas", "Filmstrip")}>
            <div className="sl-film-list ow-filmstrip" ref={filmRef} role="listbox" aria-label={tx("Diapositivas", "Slides")} aria-multiselectable="true">
              {file.slides.map((s, i) => (
                <div
                  key={s.id ?? i}
                  className={`sl-film-item${i === index ? " is-current" : ""}${filmSel.includes(i) ? " is-picked" : ""}${s.hidden ? " is-hidden" : ""}${dragSlide && dragSlide.to === i && dragSlide.from !== i ? " is-drop" : ""}${dragSlide && dragSlide.to === file.slides.length && i === file.slides.length - 1 ? " is-drop-after" : ""}${dragSlide?.from === i ? " is-dragging" : ""}`}
                  role="option"
                  aria-selected={i === index || filmSel.includes(i)}
                  tabIndex={i === index ? 0 : -1}
                  data-slide={i + 1}
                  onPointerDown={(e) => onThumbDown(e, i)}
                  onContextMenu={(e) => { e.preventDefault(); if (!filmSel.includes(i) && i !== index) goTo(i); setFocusArea("film"); setCtx({ x: e.clientX, y: e.clientY, on: "slide", slide: i }); }}
                  onFocus={() => setFocusArea("film")}
                >
                  <span className="ow-sr">{`${tx("Diapositiva", "Slide")} ${i + 1}${s.hidden ? ` (${tx("omitida", "skipped")})` : ""}: `}</span>
                  <span className="sl-film-num" aria-hidden="true">{i + 1}</span>
                  <span className="sl-film-thumb ow-thumb">
                    <Thumb slide={s} width={phone ? 104 : tablet ? 108 : 148} number={file.numbers ? i + 1 : undefined} master={file.master} />
                    {s.hidden ? <span className="sl-film-skip" aria-hidden="true">⊘</span> : null}
                  </span>
                </div>
              ))}
            </div>
            {phone ? <button type="button" className="sl-film-add" aria-label={tx("Añadir diapositiva", "Add slide")} onClick={() => newSlide()}><Plus size={22} /></button> : null}
            {!phone ? (
              <div className="sl-film-foot">
                <Icon label={tx("Vista de cuadrícula", "Grid view")} pressed={grid} onClick={() => setGrid((v) => !v)}><LayoutGrid size={18} /></Icon>
                <Icon label={tx("Ocultar tira de diapositivas", "Hide filmstrip")} onClick={() => setFilmOpen(false)}><ChevronLeft size={18} /></Icon>
              </div>
            ) : null}
          </aside>
        ) : (
          <button type="button" className="sl-film-show" aria-label={tx("Mostrar tira de diapositivas", "Show filmstrip")} onClick={() => setFilmOpen(true)}><ChevronRight size={18} /></button>
        )}

        <main className="sl-main" aria-label={tx("Área de edición", "Editing area")}>
          {grid ? (
            <div className="sl-grid ow-slide-grid" role="list" aria-label={tx("Vista de cuadrícula", "Grid view")}>
              {file.slides.map((s, i) => (
                <div key={s.id ?? i} role="listitem">
                  <button type="button" className={`sl-grid-item${i === index ? " is-current" : ""}${s.hidden ? " is-hidden" : ""}`} onClick={() => { goTo(i); setGrid(false); }} aria-label={`${tx("Diapositiva", "Slide")} ${i + 1}`}>
                    <Thumb slide={s} width={phone ? 150 : 220} />
                    <span aria-hidden="true">{i + 1}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={`sl-stage${showRulers ? " has-rulers" : ""}`} ref={stageRef} onPointerDown={(e) => { if (e.target === e.currentTarget) { setSelection([]); setEditingId(null); setCtx(null); } }}>
              <div className="sl-stage-inner" style={{ width: canvasW + R, height: canvasH + R }}>
                {showRulers ? (
                  <>
                    <span className="sl-ruler-corner" />
                    <Ruler axis="x" scale={scale} length={canvasW} offset={R} />
                    <Ruler axis="y" scale={scale} length={canvasH} offset={R} />
                  </>
                ) : null}
                <div
                  ref={canvasRef}
                  className={`sl-canvas ow-slide-canvas${tool !== "select" ? " is-drawing" : ""}${painter ? " is-painting" : ""}`}
                  style={{ width: canvasW, height: canvasH, left: R, top: R }}
                  onPointerDown={onCanvasDown}
                  onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, on: "canvas" }); }}
                  aria-label={`${tx("Diapositiva", "Slide")} ${index + 1}`}
                  role="group"
                  data-scale={scale}
                >
                  <div className="sl-slide" style={{ ...slideBackground(slide, theme), transform: `scale(${scale})` }}>
                    {slide.backgroundImage ? null : <ThemeDeco theme={theme} />}
                    {file.master ? <p className="sl-master ow-master" style={{ color: theme.text }}>{file.master}</p> : null}
                    {slide.items.map((item) => {
                      const editing = editingId === item.id;
                      const picked = selection.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`sl-item is-${item.kind}${picked ? " is-selected" : ""}${editing ? " is-editing" : ""}${item.anim ? ` ow-anim-${item.anim === "pop" ? "pop" : "fade"}` : ""}${item.kind === "text" && item.placeholder && !item.text ? " is-empty-ph" : ""}`}
                          style={itemFrameStyle(item)}
                          role="button"
                          tabIndex={-1}
                          aria-label={itemLabel(tx, item)}
                          aria-pressed={picked}
                          data-item={item.id}
                          onPointerDown={(e) => onItemDown(e, item)}
                          onDoubleClick={(e) => { e.stopPropagation(); if (hasText(item)) setEditingId(item.id); else if (item.kind === "image") setDialog("crop"); else if (item.kind === "table" || item.kind === "chart") setDialog(item.kind); }}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!picked) setSelection(expandGroups(slide.items, [item.id])); setCtx({ x: e.clientX, y: e.clientY, on: "item" }); }}
                        >
                          <ItemBody
                            item={item}
                            theme={theme}
                            placeholder={placeholderText(tx, item)}
                            editor={editing ? (
                              <div
                                ref={setupEditor}
                                className={`sl-lines sl-editable${hasText(item) && item.list && item.list !== "none" ? ` is-${item.list}` : ""}`}
                                contentEditable
                                suppressContentEditableWarning
                                role="textbox"
                                aria-multiline="true"
                                aria-label={itemLabel(tx, item)}
                                onInput={onEditInput}
                                onPointerDown={(e) => e.stopPropagation()}
                                onPaste={(e) => { e.preventDefault(); e.stopPropagation(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
                                onBlur={(e) => {
                                  const next = e.relatedTarget as HTMLElement | null;
                                  if (next && next.closest(".sl-toolbar, .sl-pop, .sl-panel, .ow-menubar, .ow-modal, [role=menu]")) return;
                                  setEditingId((id) => (id === item.id ? null : id));
                                }}
                              />
                            ) : undefined}
                          />
                        </div>
                      );
                    })}
                    {file.numbers ? <span className="sl-number" style={{ color: theme.text }}>{index + 1}</span> : null}
                  </div>
                  <div className="sl-overlay">
                    {guides.map((g, i) => <span key={i} className={`sl-guide is-${g.axis}`} style={g.axis === "x" ? { left: g.at * scale } : { top: g.at * scale }} />)}
                    {marquee ? <span className="sl-marquee" style={{ left: marquee.x * scale, top: marquee.y * scale, width: marquee.w * scale, height: marquee.h * scale }} /> : null}
                    {draft ? (tool === "line" || tool === "arrow"
                      ? <svg className="sl-draft-line" width={canvasW} height={canvasH} aria-hidden="true"><line x1={draft.x * scale} y1={draft.y * scale} x2={(draft.x + draft.w) * scale} y2={(draft.y + draft.h) * scale} /></svg>
                      : <span className="sl-marquee is-draft" style={{ left: draft.x * scale, top: draft.y * scale, width: draft.w * scale, height: draft.h * scale }} />) : null}
                    {single && single.kind === "line" && !editingId ? (
                      <>
                        <span className="sl-end" data-handle="end1" style={{ left: single.x1 * scale, top: single.y1 * scale }} onPointerDown={(e) => onEndDown(e, 1)} />
                        <span className="sl-end" data-handle="end2" style={{ left: single.x2 * scale, top: single.y2 * scale }} onPointerDown={(e) => onEndDown(e, 2)} />
                      </>
                    ) : selBox && !editingId ? (
                      <div className={`sl-selbox${selectedItems.length > 1 ? (asGroup ? " is-group" : " is-multi") : ""}`} style={{ left: selBox.x * scale, top: selBox.y * scale, width: selBox.w * scale, height: selBox.h * scale, transform: single?.rot ? `rotate(${single.rot}deg)` : undefined }}>
                        {selectedItems.length > 1 && !asGroup ? selectedItems.map((i) => <span key={i.id} className="sl-subsel" style={{ left: (i.x - selBox.x) * scale, top: (i.y - selBox.y) * scale, width: i.w * scale, height: i.h * scale }} />) : null}
                        {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => <span key={h} className={`sl-handle is-${h}`} data-handle={h} onPointerDown={(e) => onHandleDown(e, h)} />)}
                        {single ? <span className="sl-rotate" data-handle="rotate" onPointerDown={onRotateDown} /> : null}
                      </div>
                    ) : null}
                    {editingItem ? <div className="sl-selbox is-editing" style={{ left: editingItem.x * scale, top: editingItem.y * scale, width: editingItem.w * scale, height: editingItem.h * scale, transform: editingItem.rot ? `rotate(${editingItem.rot}deg)` : undefined }} /> : null}
                  </div>
                </div>
              </div>
            </div>
          )}
          {notesOpen && !grid ? (
            <div className="sl-notes" style={{ height: notesH }}>
              <span
                className="sl-notes-handle"
                aria-hidden="true"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startH = notesH;
                  track(e.pointerId, (ev) => setNotesH(Math.max(44, Math.min(360, startH - (ev.clientY - startY)))), () => undefined);
                }}
              />
              <textarea
                className="sl-notes-text ow-speaker"
                aria-label={tx("Notas del orador", "Speaker notes")}
                placeholder={tx("Haz clic para añadir notas del orador", "Click to add speaker notes")}
                value={slide.notes ?? ""}
                onFocus={() => { setSelection([]); setEditingId(null); }}
                onChange={(e) => { const notes = e.target.value.slice(0, 8000); patchSlide((s) => ({ ...s, notes }), { key: `notes-${index}` }); }}
              />
            </div>
          ) : null}
        </main>

        {panel ? (
          <aside className={`sl-panel is-${panel}`} aria-label={panelTitle}>
            <header className="sl-panel-head">
              <h2>{panelTitle}</h2>
              <Icon label={tx("Cerrar", "Close")} onClick={() => setPanel(null)}><X size={18} /></Icon>
            </header>
            <div className="sl-panel-body">
              {panel === "themes" ? themesPanel() : panel === "motion" ? motionPanel() : panel === "format" ? formatPanel() : (
                <CommentsPanel tx={tx} locale={workspace.locale} comments={slide.comments ?? []} onChange={(comments) => patchSlide((s) => ({ ...s, comments }))} />
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {ctx ? <ContextPop tx={tx} x={ctx.x} y={ctx.y} items={ctxItems()} onClose={() => setCtx(null)} /> : null}

      {layoutApply ? (
        <Modal open title={tx("Aplicar diseño", "Apply layout")} onClose={() => setLayoutApply(false)}>
          <div className="sl-layout-grid" role="menu" aria-label={tx("Diseños", "Layouts")}>
            {SLIDE_LAYOUTS.map((l) => <LayoutTile key={l} tx={tx} layout={l} theme={slide.theme} onPick={() => { setLayout(l); setLayoutApply(false); }} />)}
          </div>
        </Modal>
      ) : null}

      <input ref={imageRef} className="ow-sr" type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label={tx("Subir imagen", "Upload image")} tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void insertImageFile(f); }} />
      <input ref={replaceRef} className="ow-sr" type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label={tx("Sustituir imagen", "Replace image")} tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && single?.kind === "image") void insertImageFile(f, single.id); }} />
      <input ref={bgImageRef} className="ow-sr" type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label={tx("Imagen de fondo", "Background image")} tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readImage(f).then((src) => patchSlide((s) => ({ ...s, backgroundImage: src }))).catch(() => workspace.pushToast(tx("No se pudo usar esa imagen.", "That image could not be used."))); }} />
      <input ref={importRef} className="ow-sr" type="file" accept=".pptx,.orvslides,application/vnd.openxmlformats-officedocument.presentationml.presentation" aria-label={tx("Importar diapositivas", "Import slides")} tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importSlides(f); }} />
      <input ref={videoRef} className="ow-sr" type="file" accept="video/mp4,video/webm" aria-label={tx("Subir vídeo", "Upload video")} tabIndex={-1} onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (f.size > 20_000_000) { workspace.pushToast(tx("El vídeo supera 20 MB.", "The video is larger than 20 MB.")); return; }
        const reader = new FileReader();
        reader.onload = () => { const src = typeof reader.result === "string" ? reader.result : ""; if (/^data:video\/(mp4|webm);base64,/.test(src)) addItems([{ id: newId(), kind: "video", x: 200, y: 112, w: 560, h: 315, src }]); setDialog(null); };
        reader.readAsDataURL(f);
      }} />

      {dialog === "background" ? (
        <Modal open title={tx("Fondo", "Background")} onClose={() => setDialog(null)}>
          <div className="sl-dialog">
            <h3>{tx("Color", "Colour")}</h3>
            <ColorGrid tx={tx} value={slide.background} onPick={(c) => patchSlide((s) => ({ ...s, background: c }))} />
            <h3>{tx("Imagen", "Image")}</h3>
            <div className="sl-row">
              <Button onClick={() => bgImageRef.current?.click()}>{tx("Elegir imagen", "Choose image")}</Button>
              {slide.backgroundImage ? <Button onClick={() => patchSlide((s) => ({ ...s, backgroundImage: undefined }))}>{tx("Quitar imagen", "Remove image")}</Button> : null}
            </div>
            <div className="sl-row">
              <Button onClick={() => patchSlide((s) => ({ ...s, background: undefined, backgroundImage: undefined }))}>{tx("Restablecer al tema", "Reset to theme")}</Button>
              <Button onClick={() => setFile((f) => ({ ...f, slides: f.slides.map((s) => ({ ...s, background: slide.background, backgroundImage: slide.backgroundImage })) }))}>{tx("Aplicar a todas", "Apply to all")}</Button>
              <Button variant="primary" onClick={() => setDialog(null)}>{tx("Hecho", "Done")}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {dialog === "link" ? <LinkDialog tx={tx} initial={(editingId ? selFmt?.link : undefined) ?? single?.link ?? ""} slides={file.slides.length} onClose={() => setDialog(null)} onApply={(link) => { if (editingId && inlineLink(link || null)) return; patchItems(editingId ? [editingId] : selection, (i) => ({ ...i, link })); }} /> : null}
      {dialog === "video" ? <VideoDialog tx={tx} onClose={() => setDialog(null)} onUpload={() => videoRef.current?.click()} onYoutube={(id) => addItems([{ id: newId(), kind: "video", x: 200, y: 112, w: 560, h: 315, src: "", youtube: id }])} /> : null}
      {dialog === "imageUrl" ? <ImageUrlDialog tx={tx} onClose={() => setDialog(null)} onFile={(f) => insertImageFile(f)} /> : null}
      {dialog === "crop" && single?.kind === "image" ? <CropDialog tx={tx} image={single} theme={theme} onClose={() => setDialog(null)} onApply={(next) => patchItems([single.id], () => next)} /> : null}
      {dialog === "table" && single?.kind === "table" ? <TableDialog tx={tx} table={single} onClose={() => setDialog(null)} onApply={(next) => patchItems([single.id], () => next)} /> : null}
      {dialog === "chart" && single?.kind === "chart" ? <ChartDialog tx={tx} chart={single} onClose={() => setDialog(null)} onApply={(next) => patchItems([single.id], () => next)} /> : null}
      {dialog === "find" ? <FindDialog tx={tx} menus={menus} file={file} onClose={() => setDialog(null)} onReplace={(find, replace) => {
        setFile((f) => ({ ...f, slides: f.slides.map((s) => syncSlideText({ ...s, items: s.items.map((i) => (hasText(i) ? ({ ...i, text: i.text.split(find).join(replace), rich: i.rich ? i.rich.map((p) => p.map((r) => ({ ...r, t: r.t.split(find).join(replace) }))) : undefined } as SlideItem) : i)) })) }));
      }} /> : null}
      {dialog === "versions" ? (
        <Modal open title={tx("Historial de versiones", "Version history")} onClose={() => setDialog(null)}>
          <div className="sl-dialog">
            <Button onClick={() => { const label = window.prompt(tx("Nombre de la versión", "Version name")); if (label !== null) saveVersion(label.trim().slice(0, 80) || undefined); }}>{tx("Nombrar la versión actual", "Name current version")}</Button>
            <ul className="sl-versions">
              {[...(file.versions ?? [])].reverse().map((v) => (
                <li key={v.id}>
                  <Thumb slide={v.slides[0] ?? blankSlide()} width={120} />
                  <div>
                    <strong>{v.label ?? new Date(v.at).toLocaleString(workspace.locale === "en" ? "en-GB" : "es-ES")}</strong>
                    <small>{v.label ? `${new Date(v.at).toLocaleString(workspace.locale === "en" ? "en-GB" : "es-ES")} · ` : ""}{v.slides.length} {tx("diapositivas", "slides")}</small>
                  </div>
                  <Button onClick={() => { setFile((f) => ({ ...f, slides: v.slides })); setIndex(0); setSelection([]); setDialog(null); workspace.pushToast(tx("Versión restaurada.", "Version restored.")); }}>{tx("Restaurar esta versión", "Restore this version")}</Button>
                </li>
              ))}
              {(file.versions ?? []).length === 0 ? <li className="sl-panel-note">{tx("Aún no hay versiones guardadas.", "There are no saved versions yet.")}</li> : null}
            </ul>
          </div>
        </Modal>
      ) : null}
      {dialog === "shortcuts" ? <ShortcutsDialog tx={tx} onClose={() => setDialog(null)} /> : null}
      {printing ? (
        <div className="sl-print" aria-hidden="true">
          {file.slides.filter((s) => !s.hidden).map((s, i) => <SlideView key={s.id ?? i} slide={s} scale={1} number={file.numbers ? file.slides.indexOf(s) + 1 : undefined} master={file.master} />)}
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================ componentes con estado propio */

type SelFmt = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; size: number; font: string; color?: string; link?: string };

/** Formato del cuadro sin palabras sueltas (para no guardar lo que ya hereda). */
function baseTextStyle(item: SlideItem & TextStyle) {
  const isTitle = item.kind === "text" && (item.placeholder === "title" || item.placeholder === "number");
  const baseSize = item.kind === "text" && item.placeholder === "title" ? 32 : item.kind === "text" && item.placeholder === "subtitle" ? 24 : item.kind === "text" && item.placeholder === "number" ? 120 : 18;
  return { bold: item.bold, italic: item.italic, underline: item.underline, strike: item.strike, color: item.color, font: item.font, size: item.size, baseSize, baseColor: undefined as string | undefined, baseFont: undefined as string | undefined, isTitle };
}

function rgbHex(value: string): string | undefined {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : undefined;
}

/** Lee el formato en el inicio de la selección del editor. */
function readSelFmt(root: HTMLElement, range: Range): SelFmt {
  let el: Node | null = range.startContainer;
  if (el.nodeType !== Node.TEXT_NODE) {
    // La selección empieza en un elemento: busca el primer texto que abarca.
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let t: Node | null = walker.nextNode();
    let found: Node | null = null;
    while (t) { if ((t.textContent ?? "").trim() && (range.collapsed ? true : range.intersectsNode(t))) { found = t; if (!range.collapsed) break; } if (range.collapsed && found) break; t = walker.nextNode(); }
    if (found) el = found;
  }
  if (el.nodeType === Node.TEXT_NODE) el = el.parentNode;
  const target = el instanceof HTMLElement ? el : root;
  const cs = getComputedStyle(target);
  const deco = (() => { let n: HTMLElement | null = target; let u = false; let s = false; while (n && n !== root.parentElement) { const d = getComputedStyle(n).textDecorationLine; if (d.includes("underline")) u = true; if (d.includes("line-through")) s = true; if (n === root) break; n = n.parentElement; } return { u, s }; })();
  const link = target.closest("a")?.getAttribute("href") ?? undefined;
  return {
    bold: Number(cs.fontWeight) >= 600,
    italic: cs.fontStyle === "italic",
    underline: deco.u,
    strike: deco.s,
    size: Math.round((Number.parseFloat(cs.fontSize) / PT) * 2) / 2,
    font: cs.fontFamily.split(",")[0]!.replace(/["']/g, "").trim(),
    color: rgbHex(cs.color),
    link,
  };
}

/** Con el cursor dentro de una palabra, la selecciona (como Slides al aplicar formato). */
function selectWordAt(range: Range): boolean {
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.textContent ?? "";
  let a = range.startOffset;
  let b = range.startOffset;
  const word = /[\p{L}\p{N}_'’-]/u;
  while (a > 0 && word.test(text[a - 1]!)) a--;
  while (b < text.length && word.test(text[b]!)) b++;
  if (a === b) return false;
  const next = document.createRange();
  next.setStart(node, a);
  next.setEnd(node, b);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(next);
  return true;
}

/** Tamaño de letra en pt sobre lo seleccionado (execCommand solo sabe de 1 a 7). */
function wrapFontSize(root: HTMLElement, pt: number) {
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");
  document.execCommand("styleWithCSS", false, "true");
  const fonts = Array.from(root.querySelectorAll<HTMLElement>('font[size="7"]'));
  const sel = window.getSelection();
  let first: Node | null = null;
  let last: Node | null = null;
  for (const f of fonts) {
    const span = document.createElement("span");
    span.style.fontSize = `${pt * PT}px`;
    f.querySelectorAll<HTMLElement>("[style]").forEach((n) => { n.style.fontSize = ""; if (!n.getAttribute("style")) n.removeAttribute("style"); });
    while (f.firstChild) span.appendChild(f.firstChild);
    f.replaceWith(span);
    first ??= span;
    last = span;
  }
  // Algunos navegadores ponen el tamaño como estilo en vez de <font>.
  root.querySelectorAll<HTMLElement>("span").forEach((n) => { if (n.style.fontSize === "xxx-large" || n.style.fontSize === "-webkit-xxx-large") n.style.fontSize = `${pt * PT}px`; });
  if (first && last && sel) {
    const r = document.createRange();
    r.setStartBefore(first);
    r.setEndAfter(last);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

function SizeBox({ tx, size, onSet }: { tx: Tx; size: number; onSet: (n: number, key?: string) => void }) {
  const [draft, setDraft] = useState(String(size));
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(String(size)), [size]);
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>(`[data-size="${Math.min(96, Math.max(1, Math.round(size)))}"]`);
    if (list && current) list.scrollTop = current.offsetTop - list.clientHeight / 2 + current.clientHeight / 2;
  }, [open, size]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 1 && n <= 400 && n !== size) onSet(Math.round(n));
    else setDraft(String(size));
  };
  return (
    <span className="sl-size-box">
      <input
        aria-label={tx("Tamaño de fuente", "Font size")}
        inputMode="numeric"
        value={draft}
        onFocus={(e) => { setOpen(true); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(); setOpen(false); e.currentTarget.blur(); }
          if (e.key === "Escape") { setDraft(String(size)); setOpen(false); e.currentTarget.blur(); }
          if (e.key === "ArrowUp") { e.preventDefault(); onSet(stepSize(size, 1), "size"); }
          if (e.key === "ArrowDown") { e.preventDefault(); onSet(stepSize(size, -1), "size"); }
        }}
        onBlur={() => { commit(); window.setTimeout(() => setOpen(false), 120); }}
      />
      {open ? (
        <div className="sl-size-list" role="listbox" aria-label={tx("Tamaños", "Sizes")} ref={listRef}>
          {FONT_SIZES.map((n) => (
            <button key={n} type="button" role="option" data-size={n} aria-selected={n === size} onMouseDown={(e) => e.preventDefault()} onClick={() => { onSet(n); setOpen(false); }}>{n}</button>
          ))}
        </div>
      ) : null}
    </span>
  );
}

function ContextPop({ tx, x, y, items, onClose }: { tx: Tx; x: number; y: number; items: Array<{ id: string; label: string; run: () => void; hint?: string }>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.max(4, Math.min(x, window.innerWidth - r.width - 8)), y: Math.max(4, Math.min(y, window.innerHeight - r.height - 8)) });
  }, [x, y]);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!(e.target instanceof Node && ref.current?.contains(e.target))) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [onClose]);
  return (
    <div ref={ref} className="sl-ctx" role="menu" aria-label={tx("Menú contextual", "Context menu")} style={{ left: pos.x, top: pos.y }}>
      {items.map((i) => (
        <button key={i.id} type="button" role="menuitem" onClick={() => { onClose(); i.run(); }}>
          <span>{i.label}</span>{i.hint ? <kbd>{i.hint}</kbd> : null}
        </button>
      ))}
    </div>
  );
}

function CommentsPanel({ tx, locale, comments, onChange }: { tx: Tx; locale: string; comments: NonNullable<Slide["comments"]>; onChange: (c: NonNullable<Slide["comments"]>) => void }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const when = (at: string) => new Date(at).toLocaleString(locale === "en" ? "en-GB" : "es-ES");
  return (
    <div className="sl-comments">
      <label className="sl-field">{tx("Nuevo comentario en esta diapositiva", "New comment on this slide")}
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} />
      </label>
      <Button variant="primary" onClick={() => {
        if (!text.trim()) return;
        onChange([...comments, { id: newId(), text: text.trim(), at: new Date().toISOString() }]);
        setText("");
      }}>{tx("Comentar", "Comment")}</Button>
      <ul className="sl-comment-list">
        {comments.length === 0 ? <li className="sl-panel-note">{tx("Todavía no hay comentarios en esta diapositiva.", "There are no comments on this slide yet.")}</li> : null}
        {comments.map((c) => (
          <li key={c.id} className={c.resolved ? "is-resolved" : ""}>
            <p>{c.text}</p>
            <small>{when(c.at)}{c.resolved ? ` · ${tx("resuelto", "resolved")}` : ""}</small>
            {(c.replies ?? []).map((r, k) => <p key={k} className="sl-reply">↳ {r.text}</p>)}
            {replyTo === c.id ? (
              <div className="sl-reply-box">
                <textarea aria-label={tx("Respuesta", "Reply")} value={reply} onChange={(e) => setReply(e.target.value.slice(0, 2000))} />
                <Button onClick={() => {
                  if (!reply.trim()) return;
                  onChange(comments.map((x) => (x.id === c.id ? { ...x, replies: [...(x.replies ?? []), { text: reply.trim(), at: new Date().toISOString() }] } : x)));
                  setReply("");
                  setReplyTo(null);
                }}>{tx("Responder", "Reply")}</Button>
              </div>
            ) : null}
            <div className="sl-row">
              <button type="button" className="sl-textbtn" onClick={() => { setReplyTo(c.id); setReply(""); }}>{tx("Responder", "Reply")}</button>
              <button type="button" className="sl-textbtn" onClick={() => onChange(comments.map((x) => (x.id === c.id ? { ...x, resolved: x.resolved ? undefined : true } : x)))}>{c.resolved ? tx("Reabrir", "Reopen") : tx("Resolver", "Resolve")}</button>
              <button type="button" className="sl-textbtn" onClick={() => onChange(comments.filter((x) => x.id !== c.id))}>{tx("Eliminar", "Delete")}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkDialog({ tx, initial, slides, onClose, onApply }: { tx: Tx; initial: string; slides: number; onClose: () => void; onApply: (link: string | undefined) => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState(false);
  return (
    <Modal open title={tx("Enlace", "Link")} onClose={onClose}>
      <div className="sl-dialog">
        <label className="sl-field">{tx("Dirección web o diapositiva de esta presentación", "Web address or a slide in this presentation")}
          <input value={value} onChange={(e) => { setValue(e.target.value); setError(false); }} placeholder="https://orvupi.com" />
        </label>
        <div className="sl-row">
          {Array.from({ length: Math.min(12, slides) }, (_, i) => <button key={i} type="button" className="sl-textbtn" onClick={() => setValue(`#slide=${i + 1}`)}>{tx("Diapositiva", "Slide")} {i + 1}</button>)}
        </div>
        {error ? <p role="alert" className="sl-error">{tx("Ese enlace no es válido.", "That link is not valid.")}</p> : null}
        <div className="sl-row">
          <Button onClick={() => { onApply(undefined); onClose(); }}>{tx("Quitar enlace", "Remove link")}</Button>
          <Button variant="primary" onClick={() => { const link = safeLink(value); if (!link) { setError(true); return; } onApply(link); onClose(); }}>{tx("Aplicar", "Apply")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function VideoDialog({ tx, onClose, onUpload, onYoutube }: { tx: Tx; onClose: () => void; onUpload: () => void; onYoutube: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  return (
    <Modal open title={tx("Insertar vídeo", "Insert video")} onClose={onClose}>
      <div className="sl-dialog">
        <label className="sl-field">{tx("Enlace de YouTube", "YouTube link")}
          <input value={url} onChange={(e) => { setUrl(e.target.value); setError(false); }} placeholder="https://www.youtube.com/watch?v=…" />
        </label>
        {error ? <p role="alert" className="sl-error">{tx("No es un enlace de YouTube válido.", "That is not a valid YouTube link.")}</p> : null}
        <div className="sl-row">
          <Button onClick={onUpload}>{tx("Subir vídeo (MP4 o WebM, hasta 20 MB)", "Upload video (MP4 or WebM, up to 20 MB)")}</Button>
          <Button variant="primary" onClick={() => { const id = youtubeId(url); if (!id) { setError(true); return; } onYoutube(id); onClose(); }}>{tx("Insertar", "Insert")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ImageUrlDialog({ tx, onClose, onFile }: { tx: Tx; onClose: () => void; onFile: (file: File) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal open title={tx("Insertar imagen por URL", "Insert image by URL")} onClose={onClose}>
      <div className="sl-dialog">
        <label className="sl-field">URL
          <input value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://…/imagen.png" />
        </label>
        {error ? <p role="alert" className="sl-error">{error}</p> : null}
        <Button variant="primary" onClick={() => void (async () => {
          const link = safeLink(url);
          if (!link || !link.startsWith("https://")) { setError(tx("Usa una dirección https.", "Use an https address.")); return; }
          try {
            // Se carga como imagen (img-src https:) y se copia al archivo; solo funciona si la web permite reutilizarla (CORS).
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.referrerPolicy = "no-referrer";
            await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("img")); img.src = link; });
            const canvas = document.createElement("canvas");
            const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
            canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
            if (!blob) throw new Error("blob");
            await onFile(new File([blob], "imagen.png", { type: "image/png" }));
            onClose();
          } catch {
            setError(tx("Esa web no deja reutilizar la imagen. Guárdala en tu dispositivo y súbela.", "That site does not allow reusing the image. Save it to your device and upload it."));
          }
        })()}>{tx("Insertar", "Insert")}</Button>
      </div>
    </Modal>
  );
}

function CropDialog({ tx, image, theme, onClose, onApply }: { tx: Tx; image: Extract<SlideItem, { kind: "image" }>; theme: ReturnType<typeof themeOf>; onClose: () => void; onApply: (next: SlideItem) => void }) {
  const old = image.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  const [crop, setCrop] = useState(old);
  const fullW = image.w / Math.max(0.1, 1 - old.l - old.r);
  const fullH = image.h / Math.max(0.1, 1 - old.t - old.b);
  const side = (key: "l" | "t" | "r" | "b", label: string) => (
    <label className="sl-field">{label}: {Math.round(crop[key] * 100)} %
      <input type="range" min={0} max={0.45} step={0.01} value={crop[key]} onChange={(e) => { const v = Number(e.target.value); setCrop((c) => ({ ...c, [key]: v })); }} />
    </label>
  );
  const pw = 280;
  const ph = (pw * fullH * (1 - crop.t - crop.b)) / Math.max(1, fullW * (1 - crop.l - crop.r));
  return (
    <Modal open title={tx("Recortar imagen", "Crop image")} onClose={onClose}>
      <div className="sl-dialog">
        <div className="sl-crop-preview" style={{ width: pw, height: Math.min(280, ph) }}>
          <ItemBody item={{ ...image, crop, w: pw, h: Math.min(280, ph) }} theme={theme} />
        </div>
        {side("l", tx("Izquierda", "Left"))}{side("r", tx("Derecha", "Right"))}{side("t", tx("Arriba", "Top"))}{side("b", tx("Abajo", "Bottom"))}
        <div className="sl-row">
          <Button onClick={() => setCrop({ l: 0, t: 0, r: 0, b: 0 })}>{tx("Restablecer", "Reset")}</Button>
          <Button variant="primary" onClick={() => {
            const x = image.x - fullW * old.l + fullW * crop.l;
            const y = image.y - fullH * old.t + fullH * crop.t;
            const any = crop.l + crop.t + crop.r + crop.b > 0;
            onApply({ ...image, crop: any ? crop : undefined, x, y, w: fullW * (1 - crop.l - crop.r), h: fullH * (1 - crop.t - crop.b) });
            onClose();
          }}>{tx("Aplicar", "Apply")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function TableDialog({ tx, table, onClose, onApply }: { tx: Tx; table: Extract<SlideItem, { kind: "table" }>; onClose: () => void; onApply: (next: SlideItem) => void }) {
  const [rows, setRows] = useState<string[][]>(table.rows);
  const [header, setHeader] = useState(table.header !== false);
  const cols = rows[0]?.length ?? 0;
  return (
    <Modal open title={tx("Editar tabla", "Edit table")} onClose={onClose}>
      <div className="sl-dialog">
        <div className="sl-table-edit">
          <table>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}><input aria-label={`${tx("Fila", "Row")} ${r + 1}, ${tx("columna", "column")} ${c + 1}`} value={cell} onChange={(e) => { const v = e.target.value.slice(0, 500); setRows((rs) => rs.map((x, i) => (i === r ? x.map((y, j) => (j === c ? v : y)) : x))); }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sl-row">
          <Button onClick={() => { if (rows.length < 20) setRows((rs) => [...rs, Array<string>(cols).fill("")]); }}>{tx("Insertar fila", "Insert row")}</Button>
          <Button onClick={() => { if (cols < 20) setRows((rs) => rs.map((x) => [...x, ""])); }}>{tx("Insertar columna", "Insert column")}</Button>
          <Button onClick={() => { if (rows.length > 1) setRows((rs) => rs.slice(0, -1)); }}>{tx("Eliminar fila", "Delete row")}</Button>
          <Button onClick={() => { if (cols > 1) setRows((rs) => rs.map((x) => x.slice(0, -1))); }}>{tx("Eliminar columna", "Delete column")}</Button>
        </div>
        <label className="sl-check"><input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> {tx("Primera fila como encabezado", "First row as header")}</label>
        <Button variant="primary" onClick={() => { onApply({ ...table, rows, header }); onClose(); }}>{tx("Aplicar", "Apply")}</Button>
      </div>
    </Modal>
  );
}

function ChartDialog({ tx, chart, onClose, onApply }: { tx: Tx; chart: Extract<SlideItem, { kind: "chart" }>; onClose: () => void; onApply: (next: SlideItem) => void }) {
  const [data, setData] = useState(() => chart.labels.map((l, i) => `${l}; ${chart.values[i] ?? 0}`).join("\n"));
  const [name, setName] = useState(chart.title ?? "");
  const [kind, setKind] = useState(chart.chart);
  return (
    <Modal open title={tx("Datos del gráfico", "Chart data")} onClose={onClose}>
      <div className="sl-dialog">
        <label className="sl-field">{tx("Título", "Title")}<input value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} /></label>
        <label className="sl-field">{tx("Tipo", "Type")}
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="bar">{tx("Barras", "Bar")}</option><option value="column">{tx("Columnas", "Column")}</option><option value="line">{tx("Líneas", "Line")}</option><option value="pie">{tx("Circular", "Pie")}</option>
          </select>
        </label>
        <label className="sl-field">{tx("Datos: una fila por categoría, «nombre; valor»", "Data: one row per category, “name; value”")}
          <textarea rows={6} value={data} onChange={(e) => setData(e.target.value.slice(0, 3000))} />
        </label>
        <Button variant="primary" onClick={() => {
          const rows = data.split("\n").map((l) => l.split(/[;\t]/)).filter((p) => p[0]?.trim()).slice(0, 24);
          onApply({ ...chart, chart: kind, title: name || undefined, labels: rows.map((p) => p[0]!.trim().slice(0, 60)), values: rows.map((p) => Number((p[1] ?? "0").trim().replace(",", ".")) || 0) });
          onClose();
        }}>{tx("Aplicar", "Apply")}</Button>
      </div>
    </Modal>
  );
}

function FindDialog({ tx, menus, file, onClose, onReplace }: { tx: Tx; menus: Array<{ id: string; label: string; items: BarItem[] }>; file: SlidesFile; onClose: () => void; onReplace: (find: string, replace: string) => void }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [query, setQuery] = useState("");
  const count = find ? file.slides.reduce((n, s) => n + s.items.reduce((m, i) => m + (hasText(i) ? i.text.split(find).length - 1 : 0), 0), 0) : 0;
  const flat = menus.flatMap((m) => m.items.flatMap((i) => (i.children ? i.children.map((c) => ({ ...c, label: `${m.label} › ${i.label} › ${c.label}` })) : [{ ...i, label: `${m.label} › ${i.label}` }]))).filter((i) => i.onSelect);
  const hits = query.trim() ? flat.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8) : [];
  return (
    <Modal open title={tx("Buscar", "Search")} onClose={onClose}>
      <div className="sl-dialog">
        <label className="sl-field">{tx("Buscar en los menús", "Search the menus")}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx("p. ej., tabla, fondo, PDF", "e.g. table, background, PDF")} />
        </label>
        {hits.length ? <div className="sl-list" role="menu" aria-label={tx("Resultados", "Results")}>{hits.map((h) => <button key={h.label} type="button" role="menuitem" onClick={() => { onClose(); h.onSelect?.(); }}>{h.label}</button>)}</div> : null}
        <h3>{tx("Buscar y reemplazar", "Find and replace")}</h3>
        <label className="sl-field">{tx("Buscar", "Find")}<input value={find} onChange={(e) => setFind(e.target.value)} /></label>
        <label className="sl-field">{tx("Reemplazar por", "Replace with")}<input value={replace} onChange={(e) => setReplace(e.target.value)} /></label>
        <p className="sl-panel-note" role="status">{find ? tx(`${count} coincidencias`, `${count} matches`) : ""}</p>
        <Button variant="primary" disabled={!find || count === 0} onClick={() => { onReplace(find, replace); onClose(); }}>{tx("Reemplazar todo", "Replace all")}</Button>
      </div>
    </Modal>
  );
}

function ShortcutsDialog({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["Ctrl+M", tx("Nueva diapositiva", "New slide")], ["Ctrl+D", tx("Duplicar", "Duplicate")], [tx("Supr", "Del"), tx("Eliminar", "Delete")],
    ["Ctrl+Z / Ctrl+Y", tx("Deshacer / rehacer", "Undo / redo")], ["Ctrl+C / X / V", tx("Copiar / cortar / pegar", "Copy / cut / paste")], ["Ctrl+A", tx("Seleccionar todo", "Select all")],
    ["Ctrl+G / Ctrl+Mayús+G", tx("Agrupar / desagrupar", "Group / ungroup")], ["Ctrl+↑ / ↓", tx("Adelante / atrás (o mover la diapositiva)", "Forward / backward (or move slide)")],
    ["Ctrl+Mayús+↑ / ↓", tx("Al frente / al fondo", "To front / back")], [tx("Flechas (con Mayús, 1 px)", "Arrows (Shift for 1 px)"), tx("Mover el objeto", "Nudge object")],
    ["Ctrl+B / I / U", tx("Negrita / cursiva / subrayado", "Bold / italic / underline")], ["Ctrl+Mayús+. / ,", tx("Tamaño de fuente +1 / −1", "Font size +1 / −1")],
    ["Ctrl+Mayús+L / E / R / J", tx("Alinear izquierda / centro / derecha / justificar", "Align left / center / right / justify")], ["Ctrl+Mayús+7 / 8", tx("Lista numerada / con viñetas", "Numbered / bulleted list")],
    ["Ctrl+K", tx("Enlace", "Link")], ["Ctrl+Alt+M", tx("Comentario", "Comment")], ["Ctrl+H", tx("Buscar y reemplazar", "Find and replace")],
    ["Ctrl+Intro", tx("Presentar", "Present")], ["Ctrl+Alt+Mayús+P", tx("Vista del presentador", "Presenter view")], [tx("Ctrl + rueda", "Ctrl + wheel"), "Zoom"],
    [tx("Alt al arrastrar", "Alt while dragging"), tx("Sin guías", "No guides")], [tx("Mayús al girar", "Shift while rotating"), tx("De 15 en 15 grados", "In 15° steps")], ["Ctrl+/", tx("Esta ayuda", "This help")],
  ];
  return (
    <Modal open title={tx("Combinaciones de teclas", "Keyboard shortcuts")} onClose={onClose}>
      <dl className="sl-keys">
        {rows.map(([k, v]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}
      </dl>
    </Modal>
  );
}
