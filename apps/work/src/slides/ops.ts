import { SLIDE_H, SLIDE_W, lineBox, moveItem, newId, setBox, type LineItem, type Slide, type SlideItem } from "./model";

export type Box = { x: number; y: number; w: number; h: number };

/** Tamaños de la lista: del 1 al 96, de 1 en 1, como en Docs. */
export const FONT_SIZES = Array.from({ length: 96 }, (_, i) => i + 1);

export function stepSize(size: number, delta: number): number {
  return Math.min(400, Math.max(1, Math.round(size) + delta));
}

export function boxOf(items: SlideItem[]): Box | null {
  if (items.length === 0) return null;
  const x = Math.min(...items.map((i) => i.x));
  const y = Math.min(...items.map((i) => i.y));
  const r = Math.max(...items.map((i) => i.x + i.w));
  const b = Math.max(...items.map((i) => i.y + i.h));
  return { x, y, w: r - x, h: b - y };
}

/** Amplía la selección a los grupos completos, como Slides. */
export function expandGroups(items: SlideItem[], ids: string[]): string[] {
  const groups = new Set(items.filter((i) => ids.includes(i.id) && i.group).map((i) => i.group));
  return items.filter((i) => ids.includes(i.id) || (i.group && groups.has(i.group))).map((i) => i.id);
}

export function groupIds(items: SlideItem[], ids: string[]): SlideItem[] {
  if (ids.length < 2) return items;
  const group = newId();
  return items.map((i) => (ids.includes(i.id) ? { ...i, group } : i));
}

export function ungroupIds(items: SlideItem[], ids: string[]): SlideItem[] {
  return items.map((i) => (ids.includes(i.id) ? { ...i, group: undefined } : i));
}

export function cloneItems(items: SlideItem[], offset = 16): SlideItem[] {
  const groupMap = new Map<string, string>();
  return items.map((item) => {
    const group = item.group ? groupMap.get(item.group) ?? (groupMap.set(item.group, newId()), groupMap.get(item.group)) : undefined;
    const placeholderId = item.id === "title" || item.id === "body";
    return { ...moveItem(item, offset, offset), id: placeholderId ? newId() : newId(), group };
  });
}

export function cloneSlide(slide: Slide): Slide {
  return { ...slide, id: newId(), items: slide.items.map((item) => ({ ...item, id: item.id === "title" || item.id === "body" ? item.id : newId() })), comments: undefined };
}

export function moveSlide(slides: Slide[], from: number, to: number): Slide[] {
  if (from === to || from < 0 || from >= slides.length) return slides;
  const next = [...slides];
  const [picked] = next.splice(from, 1);
  if (!picked) return slides;
  next.splice(Math.max(0, Math.min(next.length, to)), 0, picked);
  return next;
}

/** Escala un conjunto de objetos de la caja `from` a la caja `to`. */
export function scaleItems(items: SlideItem[], from: Box, to: Box): SlideItem[] {
  const sx = from.w > 0 ? to.w / from.w : 1;
  const sy = from.h > 0 ? to.h / from.h : 1;
  return items.map((item) => setBox(item, { x: to.x + (item.x - from.x) * sx, y: to.y + (item.y - from.y) * sy, w: Math.max(1, item.w * sx), h: Math.max(1, item.h * sy) }));
}

export type Guide = { axis: "x" | "y"; at: number };

/** Guías inteligentes: ajusta la caja a los bordes y centros de la diapositiva y de los demás objetos. */
export function snapBox(box: Box, others: SlideItem[], threshold: number): { dx: number; dy: number; guides: Guide[] } {
  const xs = [0, SLIDE_W / 2, SLIDE_W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const ys = [0, SLIDE_H / 2, SLIDE_H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const mine = { x: [box.x, box.x + box.w / 2, box.x + box.w], y: [box.y, box.y + box.h / 2, box.y + box.h] };
  let best = { dx: 0, gx: null as number | null, ex: threshold + 1 };
  for (const m of mine.x) for (const t of xs) { const d = t - m; if (Math.abs(d) < best.ex && Math.abs(d) <= threshold) best = { dx: d, gx: t, ex: Math.abs(d) }; }
  let bestY = { dy: 0, gy: null as number | null, ey: threshold + 1 };
  for (const m of mine.y) for (const t of ys) { const d = t - m; if (Math.abs(d) < bestY.ey && Math.abs(d) <= threshold) bestY = { dy: d, gy: t, ey: Math.abs(d) }; }
  const guides: Guide[] = [];
  if (best.gx !== null) guides.push({ axis: "x", at: best.gx });
  if (bestY.gy !== null) guides.push({ axis: "y", at: bestY.gy });
  return { dx: best.dx, dy: bestY.dy, guides };
}

export function distribute(items: SlideItem[], ids: string[], axis: "x" | "y"): SlideItem[] {
  const picked = items.filter((i) => ids.includes(i.id)).sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
  if (picked.length < 3) return items;
  const first = picked[0];
  const last = picked[picked.length - 1];
  if (!first || !last) return items;
  const span = axis === "x" ? last.x + last.w - first.x : last.y + last.h - first.y;
  const total = picked.reduce((sum, i) => sum + (axis === "x" ? i.w : i.h), 0);
  const gap = (span - total) / (picked.length - 1);
  let at = axis === "x" ? first.x : first.y;
  const moved = new Map<string, SlideItem>();
  for (const i of picked) {
    moved.set(i.id, axis === "x" ? moveItem(i, at - i.x, 0) : moveItem(i, 0, at - i.y));
    at += (axis === "x" ? i.w : i.h) + gap;
  }
  return items.map((i) => moved.get(i.id) ?? i);
}

export function alignSelection(items: SlideItem[], ids: string[], edge: "left" | "center" | "right" | "top" | "middle" | "bottom", toPage: boolean): SlideItem[] {
  const picked = items.filter((i) => ids.includes(i.id));
  const ref = toPage || picked.length < 2 ? { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H } : boxOf(picked);
  if (!ref) return items;
  return items.map((i) => {
    if (!ids.includes(i.id)) return i;
    if (edge === "left") return moveItem(i, ref.x - i.x, 0);
    if (edge === "center") return moveItem(i, ref.x + ref.w / 2 - (i.x + i.w / 2), 0);
    if (edge === "right") return moveItem(i, ref.x + ref.w - (i.x + i.w), 0);
    if (edge === "top") return moveItem(i, 0, ref.y - i.y);
    if (edge === "middle") return moveItem(i, 0, ref.y + ref.h / 2 - (i.y + i.h / 2));
    return moveItem(i, 0, ref.y + ref.h - (i.y + i.h));
  });
}

export function flipItem(item: SlideItem, axis: "h" | "v"): SlideItem {
  if (item.kind === "line") {
    return axis === "h"
      ? lineBox({ ...item, x1: item.x2, x2: item.x1 } as LineItem)
      : lineBox({ ...item, y1: item.y2, y2: item.y1 } as LineItem);
  }
  return { ...item, rot: ((item.rot ?? 0) * -1) % 360 };
}

/** Lee el texto de un elemento editable: cada bloque o salto es una línea. */
export function editableText(root: HTMLElement): string {
  const out: string[] = [];
  let line = "";
  let open = false;
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { line += node.textContent ?? ""; open = true; return; }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") { out.push(line); line = ""; open = false; return; }
    const block = /^(DIV|P|LI|H[1-6])$/.test(node.tagName);
    if (block && open) { out.push(line); line = ""; open = false; }
    node.childNodes.forEach(walk);
    if (block && open) { out.push(line); line = ""; open = false; }
  };
  root.childNodes.forEach(walk);
  if (open) out.push(line);
  return out.join("\n").replace(/\u00a0/g, " ");
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function linesHtml(text: string): string {
  return text.split("\n").map((line) => `<div>${line ? escapeHtml(line) : "<br>"}</div>`).join("");
}

export function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  const match = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,20})/.exec(trimmed);
  return match?.[1] ?? (/^[\w-]{11}$/.test(trimmed) ? trimmed : null);
}

export function safeLink(url: string): string | null {
  const t = url.trim();
  if (/^#slide=\d+$/.test(t)) return t;
  if (/^mailto:[^\s]+$/i.test(t)) return t;
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/[^\s]*)?$/.test(t)) return `https://${t}`;
  return null;
}
