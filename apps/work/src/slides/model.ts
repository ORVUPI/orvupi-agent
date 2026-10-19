import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";

/** Tamaño lógico de la diapositiva (16:9, 10 × 5,625 pulgadas a 96 ppp, como Google Slides). */
export const SLIDE_W = 960;
export const SLIDE_H = 540;
/** 1 pt de texto en unidades de diapositiva (960 px = 720 pt). */
export const PT = SLIDE_W / 720;
const LEGACY_W = 816;
const MAX_ITEMS = 60;
const MAX_SLIDES = 100;

export const SLIDE_THEMES = ["sencillo", "oscuro", "papel", "tinta", "bosque", "rosa", "coral", "menta", "medianoche", "pulpo"] as const;
export type SlideTheme = (typeof SLIDE_THEMES)[number];
export const SLIDE_FILLS = ["#fff8ec", "#ffffff", "#102032", "#ff3070", "#0b5d36", "#1d4e89", "#fff0f5", "#e5f6ee"] as const;
export const SLIDE_FONTS = ["Inter", "Arial", "Roboto", "Montserrat", "Lora", "Merriweather", "Georgia", "Courier New"] as const;

export type SlideAlign = "left" | "center" | "right" | "justify";
export type SlideVAlign = "top" | "middle" | "bottom";
export type SlideTransition = "none" | "fade" | "dissolve" | "slide-right" | "slide-left" | "flip" | "cube" | "gallery" | "slide";
export const SLIDE_TRANSITIONS: SlideTransition[] = ["none", "dissolve", "fade", "slide-right", "slide-left", "flip", "cube", "gallery"];
export type SlideLayout = "title" | "section" | "title-body" | "two" | "title-only" | "one-column" | "main-point" | "section-desc" | "caption" | "big-number" | "blank";
export const SLIDE_LAYOUTS: SlideLayout[] = ["title", "section", "title-body", "two", "title-only", "one-column", "main-point", "section-desc", "caption", "big-number", "blank"];
export type SlideAnim = "appear" | "fade" | "fly-left" | "fly-right" | "fly-bottom" | "zoom" | "spin" | "pop";
export const SLIDE_ANIMS: SlideAnim[] = ["appear", "fade", "fly-left", "fly-right", "fly-bottom", "zoom", "spin"];
export type ShapeKind = "rect" | "round" | "ellipse" | "triangle" | "right-triangle" | "diamond" | "pentagon" | "hexagon" | "octagon" | "star" | "arrow-right" | "arrow-left" | "arrow-up" | "arrow-down" | "chevron" | "callout" | "heart" | "plus" | "cloud";
export const SHAPES: ShapeKind[] = ["rect", "round", "ellipse", "triangle", "right-triangle", "diamond", "pentagon", "hexagon", "octagon", "star", "heart", "plus", "cloud", "callout", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "chevron"];
export type Placeholder = "title" | "subtitle" | "body" | "body2" | "caption" | "number";
export type ListKind = "none" | "bullet" | "number";
export type Dash = "solid" | "dash" | "dot";

export type TextStyle = {
  text: string;
  font?: string;
  size?: number; // pt
  color?: string;
  highlight?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  align?: SlideAlign;
  valign?: SlideVAlign;
  lineHeight?: number;
  list?: ListKind;
};

type Base = { id: string; x: number; y: number; w: number; h: number; rot?: number; group?: string; anim?: SlideAnim; link?: string };

export type TextItem = Base & TextStyle & { kind: "text"; fill?: string; stroke?: string; placeholder?: Placeholder };
export type ShapeItem = Base & TextStyle & { kind: "shape"; shape: ShapeKind; fill: string; stroke?: string; strokeWidth?: number; dash?: Dash };
export type ImageItem = Base & { kind: "image"; src: string; crop?: { l: number; t: number; r: number; b: number }; opacity?: number };
export type LineItem = Base & { kind: "line"; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dash?: Dash; start?: "none" | "arrow" | "dot"; end?: "none" | "arrow" | "dot" };
export type TableItem = Base & { kind: "table"; rows: string[][]; size?: number; color?: string; fill?: string; header?: boolean; font?: string };
export type ChartItem = Base & { kind: "chart"; chart: "bar" | "column" | "line" | "pie"; labels: string[]; values: number[]; title?: string; color?: string };
export type VideoItem = Base & { kind: "video"; src: string; youtube?: string; autoplay?: boolean };

export type SlideItem = TextItem | ShapeItem | ImageItem | LineItem | TableItem | ChartItem | VideoItem;

export type SlideComment = { id: string; text: string; at: string; resolved?: boolean; replies?: Array<{ text: string; at: string }> };

export type Slide = {
  title: string;
  body: string;
  theme: SlideTheme;
  items: SlideItem[];
  background?: string;
  backgroundImage?: string;
  notes?: string;
  transition?: SlideTransition;
  duration?: number; // s
  layout?: SlideLayout;
  master?: string;
  hidden?: boolean;
  comments?: SlideComment[];
  id?: string;
};

export type SlideVersion = { id: string; at: string; label?: string; slides: Slide[]; title: string };

export type SlidesFile = {
  format: "orvupi-slides";
  version: 2;
  id: string;
  title: string;
  slides: Slide[];
  master?: string;
  numbers?: boolean;
  versions?: SlideVersion[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, min: number, max: number, fallback = min): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const HEX = /^#[0-9a-f]{6}$/i;
function hex(value: unknown): string | undefined {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : undefined;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function defaultItems(title: string, body: string): SlideItem[] {
  return layoutItems("title-body", title, body);
}

function textStyleOf(value: Record<string, unknown>, scale: number): TextStyle {
  const align = value.align === "left" || value.align === "center" || value.align === "right" || value.align === "justify" ? value.align : undefined;
  const valign = value.valign === "top" || value.valign === "middle" || value.valign === "bottom" ? value.valign : undefined;
  const list = value.list === "bullet" || value.list === "number" ? value.list : undefined;
  const font = typeof value.font === "string" && (SLIDE_FONTS as readonly string[]).includes(value.font) ? value.font : undefined;
  // Las versiones antiguas guardaban el tamaño en px de pantalla; se pasa a pt.
  const rawSize = typeof value.size === "number" ? value.size : undefined;
  const size = rawSize === undefined ? undefined : Math.round(num(scale === 1 ? rawSize : rawSize * 0.75, 1, 400, 14));
  return {
    text: typeof value.text === "string" ? value.text.slice(0, 4000) : "",
    font,
    size,
    color: hex(value.color),
    highlight: hex(value.highlight),
    bold: value.bold === true ? true : undefined,
    italic: value.italic === true ? true : undefined,
    underline: value.underline === true ? true : undefined,
    strike: value.strike === true ? true : undefined,
    align,
    valign,
    lineHeight: typeof value.lineHeight === "number" ? num(value.lineHeight, 0.8, 3, 1.15) : undefined,
    list,
  };
}

const ANIMS = new Set<string>([...SLIDE_ANIMS, "pop"]);

export function itemOf(value: unknown, scale = 1): SlideItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const s = (v: unknown) => Number(v) * scale;
  const id = value.id.slice(0, 40);
  const x = num(s(value.x), -SLIDE_W, SLIDE_W * 2, 0);
  const y = num(s(value.y), -SLIDE_H, SLIDE_H * 2, 0);
  const w = num(s(value.w), 1, SLIDE_W * 3, 100);
  const h = num(s(value.h), 1, SLIDE_H * 3, 40);
  const base: Base = {
    id, x, y, w, h,
    rot: typeof value.rot === "number" ? num(value.rot, -360, 360, 0) : undefined,
    group: typeof value.group === "string" ? value.group.slice(0, 40) : undefined,
    anim: typeof value.anim === "string" && ANIMS.has(value.anim) ? (value.anim as SlideAnim) : undefined,
    link: typeof value.link === "string" && /^(https?:\/\/|mailto:|#slide=\d+$)/i.test(value.link) ? value.link.slice(0, 500) : undefined,
  };
  if (value.kind === "text") {
    const placeholder = ["title", "subtitle", "body", "body2", "caption", "number"].includes(String(value.placeholder)) ? (value.placeholder as Placeholder) : id === "title" ? "title" : id === "body" ? "body" : undefined;
    return { ...base, kind: "text", ...textStyleOf(value, scale), fill: hex(value.fill), stroke: hex(value.stroke), placeholder };
  }
  if (value.kind === "shape") {
    const shape = SHAPES.includes(value.shape as ShapeKind) ? (value.shape as ShapeKind) : "rect";
    return {
      ...base, kind: "shape", shape, ...textStyleOf(value, scale),
      fill: value.fill === "none" ? "none" : hex(value.fill) ?? "#ff3070",
      stroke: value.stroke === "none" ? "none" : hex(value.stroke),
      strokeWidth: typeof value.strokeWidth === "number" ? num(value.strokeWidth, 0, 24, 2) : undefined,
      dash: value.dash === "dash" || value.dash === "dot" ? value.dash : undefined,
    };
  }
  if (value.kind === "image" && typeof value.src === "string" && /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(value.src) && value.src.length < 8_000_000) {
    const crop = isRecord(value.crop) ? { l: num(value.crop.l, 0, 0.9), t: num(value.crop.t, 0, 0.9), r: num(value.crop.r, 0, 0.9), b: num(value.crop.b, 0, 0.9) } : undefined;
    return { ...base, kind: "image", src: value.src, crop, opacity: typeof value.opacity === "number" ? num(value.opacity, 0, 1, 1) : undefined };
  }
  if (value.kind === "line") {
    const hasPoints = ["x1", "y1", "x2", "y2"].every((key) => typeof value[key] === "number");
    const x1 = hasPoints ? s(value.x1) : x;
    const y1 = hasPoints ? s(value.y1) : y + h / 2;
    const x2 = hasPoints ? s(value.x2) : x + w;
    const y2 = hasPoints ? s(value.y2) : y + h / 2;
    const ends = (v: unknown) => (v === "arrow" || v === "dot" ? v : undefined);
    return {
      ...lineBox({ ...base, kind: "line", x1: num(x1, -SLIDE_W, SLIDE_W * 2), y1: num(y1, -SLIDE_H, SLIDE_H * 2), x2: num(x2, -SLIDE_W, SLIDE_W * 2), y2: num(y2, -SLIDE_H, SLIDE_H * 2) }),
      color: hex(value.color), width: typeof value.width === "number" ? num(value.width, 0.5, 24, 2) : undefined,
      dash: value.dash === "dash" || value.dash === "dot" ? value.dash : undefined,
      start: ends(value.start), end: ends(value.end),
    };
  }
  if (value.kind === "table" && Array.isArray(value.rows)) {
    const rows = value.rows.slice(0, 20).map((row) => (Array.isArray(row) ? row.slice(0, 20).map((cell) => (typeof cell === "string" ? cell.slice(0, 500) : "")) : []));
    const cols = Math.max(1, ...rows.map((row) => row.length));
    const filled = rows.map((row) => [...row, ...Array(cols - row.length).fill("")]);
    if (filled.length === 0) return null;
    return { ...base, kind: "table", rows: filled, size: typeof value.size === "number" ? num(value.size, 6, 72, 14) : undefined, color: hex(value.color), fill: hex(value.fill), header: value.header !== false, font: typeof value.font === "string" && (SLIDE_FONTS as readonly string[]).includes(value.font) ? value.font : undefined };
  }
  if (value.kind === "chart" && Array.isArray(value.labels) && Array.isArray(value.values)) {
    const chart = value.chart === "column" || value.chart === "line" || value.chart === "pie" ? value.chart : "bar";
    const labels = value.labels.slice(0, 24).map((label) => String(label).slice(0, 60));
    const values = labels.map((_, i) => num((value.values as unknown[])[i], -1e9, 1e9, 0));
    return { ...base, kind: "chart", chart, labels, values, title: typeof value.title === "string" ? value.title.slice(0, 120) : undefined, color: hex(value.color) };
  }
  if (value.kind === "video" && typeof value.src === "string") {
    const youtube = typeof value.youtube === "string" && /^[\w-]{6,20}$/.test(value.youtube) ? value.youtube : undefined;
    const src = /^data:video\/(mp4|webm|ogg);base64,/.test(value.src) && value.src.length < 30_000_000 ? value.src : "";
    if (!youtube && !src) return null;
    return { ...base, kind: "video", src, youtube, autoplay: value.autoplay === true ? true : undefined };
  }
  return null;
}

export function lineBox<T extends LineItem>(item: T): T {
  const pad = 6;
  const x = Math.min(item.x1, item.x2);
  const y = Math.min(item.y1, item.y2);
  return { ...item, x: x - pad, y: y - pad, w: Math.abs(item.x2 - item.x1) + pad * 2, h: Math.abs(item.y2 - item.y1) + pad * 2 };
}

const LAYOUT_SET = new Set<string>(SLIDE_LAYOUTS);
const TRANSITION_SET = new Set<string>([...SLIDE_TRANSITIONS, "slide"]);

function slideOf(entry: unknown, scale: number): Slide | null {
  if (!isRecord(entry)) return null;
  const title = typeof entry.title === "string" ? entry.title.slice(0, 180) : "";
  const body = typeof entry.body === "string" ? entry.body.slice(0, 4000) : "";
  const parsed = Array.isArray(entry.items) ? entry.items.flatMap((item) => {
    const next = itemOf(item, scale);
    return next ? [next] : [];
  }) : [];
  const layout = typeof entry.layout === "string" && LAYOUT_SET.has(entry.layout) ? (entry.layout as SlideLayout) : "title-body";
  const items = parsed.length > 0 || layout === "blank" ? parsed.slice(0, MAX_ITEMS) : defaultItems(title, body);
  const theme = SLIDE_THEMES.includes(entry.theme as SlideTheme) ? (entry.theme as SlideTheme) : "papel";
  const transition = typeof entry.transition === "string" && TRANSITION_SET.has(entry.transition) ? (entry.transition === "slide" ? "slide-right" : (entry.transition as SlideTransition)) : "none";
  const comments = Array.isArray(entry.comments) ? entry.comments.slice(0, 100).flatMap((c) => (isRecord(c) && typeof c.text === "string" ? [{
    id: typeof c.id === "string" ? c.id.slice(0, 40) : newId(),
    text: c.text.slice(0, 2000),
    at: typeof c.at === "string" ? c.at.slice(0, 40) : new Date().toISOString(),
    resolved: c.resolved === true ? true : undefined,
    replies: Array.isArray(c.replies) ? c.replies.slice(0, 50).flatMap((r) => (isRecord(r) && typeof r.text === "string" ? [{ text: r.text.slice(0, 2000), at: typeof r.at === "string" ? r.at.slice(0, 40) : "" }] : [])) : undefined,
  }] : [])) : undefined;
  return syncSlideText({
    id: typeof entry.id === "string" ? entry.id.slice(0, 40) : newId(),
    title,
    body,
    theme,
    items,
    background: hex(entry.background),
    backgroundImage: typeof entry.backgroundImage === "string" && /^data:image\/(png|jpeg|gif|webp);base64,/.test(entry.backgroundImage) && entry.backgroundImage.length < 8_000_000 ? entry.backgroundImage : undefined,
    notes: typeof entry.notes === "string" ? entry.notes.slice(0, 8000) : "",
    master: typeof entry.master === "string" ? entry.master.slice(0, 80) : "",
    transition,
    duration: typeof entry.duration === "number" ? num(entry.duration, 0.1, 5, 0.6) : undefined,
    layout,
    hidden: entry.hidden === true ? true : undefined,
    comments,
  });
}

const PH = { x: 64, w: SLIDE_W - 128 };

/** Marcadores de cada diseño, como en Google Slides. */
export function layoutItems(layout: SlideLayout, title = "", body = ""): SlideItem[] {
  const t = (placeholder: Placeholder, x: number, y: number, w: number, h: number, extra: Partial<TextItem> = {}, text = ""): TextItem => ({
    id: placeholder === "title" ? "title" : placeholder === "body" ? "body" : newId(),
    kind: "text", placeholder, x, y, w, h, text, ...extra,
  });
  switch (layout) {
    case "blank": return [];
    case "title": return [
      t("title", PH.x, 112, PH.w, 196, { size: 52, align: "center", valign: "bottom" }, title),
      t("subtitle", PH.x, 316, PH.w, 76, { size: 24, align: "center", valign: "top" }, body),
    ];
    case "section": return [t("title", PH.x, 200, PH.w, 140, { size: 44, align: "left", valign: "middle" }, title)];
    case "section-desc": return [
      t("title", 48, 130, 400, 180, { size: 40, valign: "bottom" }, title),
      t("subtitle", 48, 320, 400, 120, { size: 20, valign: "top" }, body),
      t("body2", 520, 60, 392, 420, { size: 18, valign: "middle" }),
    ];
    case "two": return [
      t("title", PH.x, 40, PH.w, 80, { size: 32, valign: "top" }, title),
      t("body", PH.x, 140, 400, 340, { size: 18, list: "bullet", valign: "top" }, body),
      t("body2", 496, 140, 400, 340, { size: 18, list: "bullet", valign: "top" }),
    ];
    case "title-only": return [t("title", PH.x, 40, PH.w, 80, { size: 32, valign: "top" }, title)];
    case "one-column": return [
      t("title", 48, 48, 320, 120, { size: 28, valign: "top" }, title),
      t("body", 48, 180, 320, 300, { size: 16, valign: "top" }, body),
    ];
    case "main-point": return [t("title", 80, 100, SLIDE_W - 160, 340, { size: 48, valign: "middle" }, title)];
    case "caption": return [t("caption", 48, 440, SLIDE_W - 96, 70, { size: 18, valign: "top" }, title)];
    case "big-number": return [
      t("number", PH.x, 110, PH.w, 210, { size: 120, align: "center", valign: "bottom" }, title),
      t("body", PH.x, 330, PH.w, 100, { size: 20, align: "center", valign: "top" }, body),
    ];
    case "title-body":
    default: return [
      t("title", PH.x, 40, PH.w, 80, { size: 32, valign: "top" }, title),
      t("body", PH.x, 140, PH.w, 340, { size: 18, list: "bullet", valign: "top" }, body),
    ];
  }
}

/** Cambia el diseño conservando el texto escrito en los marcadores con el mismo papel. */
export function applyLayout(slide: Slide, layout: SlideLayout): Slide {
  const next = layoutItems(layout);
  const keep = slide.items.filter((item) => !(item.kind === "text" && item.placeholder));
  const old = slide.items.filter((item): item is TextItem => item.kind === "text" && Boolean(item.placeholder));
  const filled = next.map((item) => {
    if (item.kind !== "text") return item;
    const match = old.find((o) => o.placeholder === item.placeholder) ?? (item.placeholder === "subtitle" ? old.find((o) => o.placeholder === "body") : item.placeholder === "body" ? old.find((o) => o.placeholder === "subtitle") : undefined);
    return match && match.text ? { ...item, text: match.text } : item;
  });
  return syncSlideText({ ...slide, layout, items: [...filled, ...keep] });
}

export function alignItem(item: SlideItem, canvasW: number, canvasH: number, edge: "left" | "center" | "right" | "top" | "middle" | "bottom"): SlideItem {
  const target = { ...item };
  let dx = 0;
  let dy = 0;
  if (edge === "left") dx = 0 - item.x;
  else if (edge === "center") dx = (canvasW - item.w) / 2 - item.x;
  else if (edge === "right") dx = canvasW - item.w - item.x;
  else if (edge === "top") dy = 0 - item.y;
  else if (edge === "middle") dy = (canvasH - item.h) / 2 - item.y;
  else dy = canvasH - item.h - item.y;
  return moveItem(target, dx, dy);
}

export function moveItem<T extends SlideItem>(item: T, dx: number, dy: number): T {
  if (item.kind === "line") return { ...item, x: item.x + dx, y: item.y + dy, x1: item.x1 + dx, x2: item.x2 + dx, y1: item.y1 + dy, y2: item.y2 + dy };
  return { ...item, x: item.x + dx, y: item.y + dy };
}

/** Cambia la caja de un objeto (las líneas escalan sus extremos dentro de la caja). */
export function setBox<T extends SlideItem>(item: T, box: { x: number; y: number; w: number; h: number }): T {
  if (item.kind === "line") {
    const sx = item.w > 0 ? box.w / item.w : 1;
    const sy = item.h > 0 ? box.h / item.h : 1;
    const map = (px: number, py: number) => [box.x + (px - item.x) * sx, box.y + (py - item.y) * sy] as const;
    const [x1, y1] = map(item.x1, item.y1);
    const [x2, y2] = map(item.x2, item.y2);
    return { ...item, ...box, x1, y1, x2, y2 };
  }
  return { ...item, ...box };
}

export function orderItems(items: SlideItem[], id: string, where: "front" | "back" | "forward" | "backward"): SlideItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const picked = items[index];
  if (!picked) return items;
  const next = items.filter((item) => item.id !== id);
  if (where === "front") return [...next, picked];
  if (where === "back") return [picked, ...next];
  const to = where === "forward" ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1);
  next.splice(to, 0, picked);
  return next;
}

export function syncSlideText(slide: Slide): Slide {
  const texts = slide.items.filter((item): item is TextItem => item.kind === "text");
  const title = texts.find((item) => item.id === "title") ?? texts.find((item) => item.placeholder === "title" || item.placeholder === "number");
  const body = texts.find((item) => item.id === "body") ?? texts.find((item) => item.placeholder === "body" || item.placeholder === "subtitle");
  return {
    ...slide,
    title: title ? title.text.slice(0, 180) : slide.items.length === 0 ? "" : slide.title,
    body: body ? body.text.slice(0, 4000) : slide.body,
  };
}

export function blankSlide(layout: SlideLayout = "title-body", theme: SlideTheme = "papel"): Slide {
  return { id: newId(), title: "", body: "", theme, items: layoutItems(layout), notes: "", transition: "none", layout };
}

export function createSlidesFile(input: { id: string; title: string }): SlidesFile {
  return {
    format: "orvupi-slides",
    version: 2,
    id: input.id,
    title: sanitizeName(input.title),
    slides: [blankSlide("title")],
  };
}

export function serializeSlides(file: SlidesFile): Uint8Array {
  const slides = file.slides.map(syncSlideText);
  return encodeUtf8(JSON.stringify({ ...file, version: 2, slides }));
}

export function parseSlides(bytes: Uint8Array | string): SlidesFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-slides") throw new WorkError("invalid-format");
  if (parsed.version !== 1 && parsed.version !== 2) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string" || !Array.isArray(parsed.slides)) {
    throw new WorkError("invalid-format");
  }
  // La versión 1 usaba un lienzo de 816 px de ancho: se escala al de 960.
  const scale = parsed.version === 1 ? SLIDE_W / LEGACY_W : 1;
  const slides = parsed.slides.slice(0, MAX_SLIDES).flatMap((entry) => {
    const slide = slideOf(entry, scale);
    return slide ? [slide] : [];
  });
  const versions = parsed.version === 2 && Array.isArray(parsed.versions)
    ? parsed.versions.slice(-20).flatMap((v) => (isRecord(v) && Array.isArray(v.slides) ? [{
      id: typeof v.id === "string" ? v.id.slice(0, 40) : newId(),
      at: typeof v.at === "string" ? v.at.slice(0, 40) : "",
      label: typeof v.label === "string" ? v.label.slice(0, 80) : undefined,
      title: typeof v.title === "string" ? sanitizeName(v.title) : "",
      slides: v.slides.slice(0, MAX_SLIDES).flatMap((entry) => { const s = slideOf(entry, 1); return s ? [s] : []; }),
    }] : []))
    : undefined;
  return {
    format: "orvupi-slides",
    version: 2,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    slides: slides.length > 0 ? slides : [blankSlide("title")],
    master: typeof parsed.master === "string" ? parsed.master.slice(0, 80) : "",
    numbers: parsed.numbers === true ? true : undefined,
    versions,
  };
}

export const LIMITS = { MAX_ITEMS, MAX_SLIDES };
