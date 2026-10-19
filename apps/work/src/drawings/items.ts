/** Objetos de Dibujos (formato propio de Dibujos; antes compartía el de Presentaciones). */
export const SLIDE_FILLS = ["#fff8ec", "#ffffff", "#102032", "#ff3070", "#0b5d36", "#1d4e89", "#fff0f5", "#e5f6ee"] as const;

export type SlideAlign = "left" | "center" | "right" | "justify";
export type SlideAnim = "fade" | "pop";

export type SlideItem =
  | { id: string; kind: "text"; x: number; y: number; w: number; h: number; text: string; bold?: boolean; italic?: boolean; align?: SlideAlign; color?: string; size?: number; fill?: string; anim?: SlideAnim }
  | { id: string; kind: "shape"; x: number; y: number; w: number; h: number; shape: "rect" | "ellipse"; fill: string; anim?: SlideAnim }
  | { id: string; kind: "image"; x: number; y: number; w: number; h: number; src: string; anim?: SlideAnim }
  | { id: string; kind: "line"; x: number; y: number; w: number; h: number; anim?: SlideAnim };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function textExtras(value: Record<string, unknown>): Pick<Extract<SlideItem, { kind: "text" }>, "bold" | "italic" | "align" | "color" | "size" | "fill"> {
  const align = value.align === "left" || value.align === "center" || value.align === "right" || value.align === "justify" ? value.align : undefined;
  const color = typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color.toLowerCase() : undefined;
  const fill = typeof value.fill === "string" && /^#[0-9a-f]{6}$/i.test(value.fill) ? value.fill.toLowerCase() : undefined;
  const size = typeof value.size === "number" && value.size >= 8 && value.size <= 96 ? Math.round(value.size) : undefined;
  return {
    bold: value.bold === true ? true : undefined,
    italic: value.italic === true ? true : undefined,
    align,
    color,
    size,
    fill,
  };
}

export function itemOf(value: unknown, box = { maxX: 900, maxY: 560, maxW: 860, maxH: 520, minH: 28 }): SlideItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const x = clamp(Number(value.x), 0, box.maxX);
  const y = clamp(Number(value.y), 0, box.maxY);
  const w = clamp(Number(value.w), value.kind === "line" ? 8 : 40, box.maxW);
  const h = clamp(Number(value.h), value.kind === "line" ? 4 : box.minH, box.maxH);
  const id = value.id.slice(0, 40);
  const anim = value.anim === "fade" || value.anim === "pop" ? value.anim : undefined;
  if (value.kind === "text") {
    return { id, kind: "text", x, y, w, h, text: typeof value.text === "string" ? value.text.slice(0, 4000) : "", ...textExtras(value), anim };
  }
  if (value.kind === "shape") {
    const fill = SLIDE_FILLS.includes(value.fill as (typeof SLIDE_FILLS)[number]) ? String(value.fill) : "#ff3070";
    return { id, kind: "shape", x, y, w, h, shape: value.shape === "ellipse" ? "ellipse" : "rect", fill, anim };
  }
  if (value.kind === "image" && typeof value.src === "string" && value.src.startsWith("data:image/") && value.src.length < 2_800_000) {
    return { id, kind: "image", x, y, w, h, src: value.src, anim };
  }
  if (value.kind === "line") return { id, kind: "line", x, y, w, h, anim };
  return null;
}

export function alignItem(item: SlideItem, canvasW: number, canvasH: number, edge: "left" | "center" | "right" | "top" | "middle" | "bottom"): SlideItem {
  if (edge === "left") return { ...item, x: 16 };
  if (edge === "center") return { ...item, x: Math.max(0, (canvasW - item.w) / 2) };
  if (edge === "right") return { ...item, x: Math.max(0, canvasW - item.w - 16) };
  if (edge === "top") return { ...item, y: 16 };
  if (edge === "middle") return { ...item, y: Math.max(0, (canvasH - item.h) / 2) };
  return { ...item, y: Math.max(0, canvasH - item.h - 16) };
}

export function orderItems(items: SlideItem[], id: string, where: "front" | "back"): SlideItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const next = items.filter((item) => item.id !== id);
  const picked = items[index];
  if (!picked) return items;
  return where === "front" ? [...next, picked] : [picked, ...next];
}

