import { PDFDocument, StandardFonts } from "pdf-lib";
import { PT, SLIDE_H, SLIDE_W, type ChartItem, type LineItem, type Slide, type SlideItem, type SlidesFile, type TableItem, type TextStyle } from "./model";
import { shapePath } from "./shapes";
import { fontStack, type ThemeSpec } from "./themes";
import { inkOn, themeOf } from "./SlideView";

/** Relleno interior de los cuadros de texto (igual que `.sl-text` en slides.css). */
export const TEXT_PAD = 8;
const CHART_COLORS = ["#ff3070", "#102032", "#007960", "#1d4e89", "#ffb000", "#9c1446", "#5b2a86", "#00a37f"];

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src.startsWith("data:") && !src.startsWith("blob:")) return Promise.resolve(null);
  let hit = imageCache.get(src);
  if (!hit) {
    hit = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, hit);
  }
  return hit;
}

function defaultSize(item: SlideItem & TextStyle): number {
  if (item.kind === "text") {
    if (item.placeholder === "title") return 32;
    if (item.placeholder === "number") return 120;
    if (item.placeholder === "subtitle") return 24;
  }
  return 18;
}

function fontOf(item: SlideItem & TextStyle, theme: ThemeSpec, px: number): string {
  const isTitle = item.kind === "text" && (item.placeholder === "title" || item.placeholder === "number");
  return `${item.italic ? "italic " : ""}${item.bold ? 700 : 400} ${px}px ${fontStack(item.font, isTitle ? theme.titleFont : theme.bodyFont)}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  const fits = (t: string) => ctx.measureText(t).width <= width;
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (fits(test)) { line = test; continue; }
    if (line) out.push(line);
    line = "";
    // palabra más larga que la caja: se corta por letras, como en Slides
    for (const ch of word) {
      if (line && !fits(line + ch)) { out.push(line); line = ""; }
      line += ch;
    }
  }
  out.push(line);
  return out;
}

type Laid = { text: string; x: number; y: number; size: number; bold: boolean };

/** Dibuja el texto de un cuadro o forma y devuelve las líneas colocadas (para la capa de texto del PDF). */
function drawText(ctx: CanvasRenderingContext2D, item: SlideItem & TextStyle, theme: ThemeSpec, color: string, defAlign: CanvasTextAlign, defV: "top" | "middle" | "bottom"): Laid[] {
  if (!item.text) return [];
  const size = (item.size ?? defaultSize(item)) * PT;
  const lh = size * (item.lineHeight ?? 1.15);
  ctx.font = fontOf(item, theme, size);
  const indent = item.list === "bullet" || item.list === "number" ? size * 1.2 : 0;
  const inner = Math.max(4, item.w - TEXT_PAD * 2 - indent);
  const rows: Array<{ text: string; marker?: string }> = [];
  item.text.split("\n").forEach((para, i) => {
    const parts = wrap(ctx, para, inner);
    parts.forEach((t, k) => rows.push({ text: t, marker: k === 0 ? (item.list === "bullet" ? "•" : item.list === "number" ? `${i + 1}.` : undefined) : undefined }));
  });
  const total = rows.length * lh;
  const v = item.valign ?? defV;
  let y = v === "middle" ? (item.h - total) / 2 : v === "bottom" ? item.h - TEXT_PAD - total : TEXT_PAD;
  const align = item.align === "center" ? "center" : item.align === "right" ? "right" : item.align === "justify" || item.align === "left" ? "left" : defAlign;
  const laid: Laid[] = [];
  ctx.textBaseline = "alphabetic";
  for (const row of rows) {
    const base = y + (lh - size) / 2 + size * 0.86;
    const w = ctx.measureText(row.text).width;
    const x = align === "center" ? TEXT_PAD + indent + (inner - w) / 2 : align === "right" ? item.w - TEXT_PAD - w : TEXT_PAD + indent;
    if (item.highlight) { ctx.fillStyle = item.highlight; ctx.fillRect(x, y, w, lh); }
    ctx.fillStyle = color;
    if (row.marker) { ctx.textAlign = "left"; ctx.fillText(row.marker, TEXT_PAD, base); }
    ctx.textAlign = "left";
    ctx.fillText(row.text, x, base);
    if (item.underline || item.strike) {
      ctx.fillRect(x, item.underline ? base + size * 0.1 : base - size * 0.3, w, Math.max(1, size / 16));
      if (item.underline && item.strike) ctx.fillRect(x, base - size * 0.3, w, Math.max(1, size / 16));
    }
    laid.push({ text: (row.marker ? `${row.marker} ` : "") + row.text, x: item.x + x, y: item.y + base, size, bold: !!item.bold });
    y += lh;
  }
  return laid;
}

function setDash(ctx: CanvasRenderingContext2D, dash: string | undefined, w: number) {
  ctx.setLineDash(dash === "dash" ? [w * 4, w * 2.5] : dash === "dot" ? [w, w * 1.6] : []);
}

function drawLine(ctx: CanvasRenderingContext2D, item: LineItem, theme: ThemeSpec) {
  const w = item.width ?? 2;
  const color = item.color ?? theme.title;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  setDash(ctx, item.dash, w);
  ctx.beginPath();
  ctx.moveTo(item.x1, item.y1);
  ctx.lineTo(item.x2, item.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
  const cap = (x: number, y: number, a: number, kind: string | undefined) => {
    if (kind === "arrow") {
      const L = w * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - L * Math.cos(a - 0.45), y - L * Math.sin(a - 0.45));
      ctx.lineTo(x - L * Math.cos(a + 0.45), y - L * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fill();
    } else if (kind === "dot") {
      ctx.beginPath();
      ctx.arc(x, y, w * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  cap(item.x2, item.y2, angle, item.end);
  cap(item.x1, item.y1, angle + Math.PI, item.start);
}

function drawTable(ctx: CanvasRenderingContext2D, item: TableItem, theme: ThemeSpec): Laid[] {
  const rows = item.rows.length || 1;
  const cols = item.rows[0]?.length || 1;
  const cw = item.w / cols;
  const rh = item.h / rows;
  const size = (item.size ?? 14) * PT;
  const laid: Laid[] = [];
  if (item.fill) { ctx.fillStyle = item.fill; ctx.fillRect(0, 0, item.w, item.h); }
  item.rows.forEach((row, r) => row.forEach((cell, c) => {
    const head = item.header !== false && r === 0;
    if (head) { ctx.fillStyle = theme.accent; ctx.fillRect(c * cw, r * rh, cw, rh); }
    ctx.save();
    ctx.beginPath();
    ctx.rect(c * cw, r * rh, cw, rh);
    ctx.clip();
    ctx.fillStyle = head ? inkOn(theme.accent) : item.color ?? theme.text;
    ctx.font = `${head ? 700 : 400} ${size}px ${fontStack(item.font, theme.bodyFont)}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(cell, c * cw + 6, r * rh + rh / 2);
    ctx.restore();
    if (cell) laid.push({ text: cell, x: item.x + c * cw + 6, y: item.y + r * rh + rh / 2 + size * 0.35, size, bold: head });
  }));
  ctx.strokeStyle = "#102032";
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r += 1) { ctx.beginPath(); ctx.moveTo(0, r * rh); ctx.lineTo(item.w, r * rh); ctx.stroke(); }
  for (let c = 0; c <= cols; c += 1) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, item.h); ctx.stroke(); }
  return laid;
}

function drawChart(ctx: CanvasRenderingContext2D, item: ChartItem, theme: ThemeSpec) {
  const { w, h } = item;
  const top = item.title ? 34 : 10;
  const ink = theme.text;
  const font = fontStack(undefined, theme.bodyFont);
  if (item.title) { ctx.fillStyle = ink; ctx.font = `700 18px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(item.title, w / 2, 22); }
  const n = Math.max(1, item.values.length);
  const max = Math.max(1, ...item.values.map((v) => Math.abs(v)));
  if (item.chart === "pie") {
    const total = item.values.reduce((s, v) => s + Math.max(0, v), 0) || 1;
    const r = Math.min(w * 0.6, h - top - 10) / 2;
    const cx = r + 10;
    const cy = top + (h - top) / 2;
    let a = -Math.PI / 2;
    item.values.forEach((v, i) => {
      const d = (Math.max(0, v) / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a + d); ctx.closePath();
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]!; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      a += d;
    });
    ctx.font = `400 14px ${font}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    item.labels.forEach((label, i) => {
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]!; ctx.fillRect(cx + r + 24, top + 6 + i * 22, 12, 12);
      ctx.fillStyle = ink; ctx.fillText(label, cx + r + 42, top + 17 + i * 22);
    });
    return;
  }
  const left = 40, bottom = 26;
  const ph = h - top - bottom, pw = w - left - 10;
  ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + ph); ctx.lineTo(left + pw, top + ph); ctx.stroke();
  ctx.globalAlpha = 1;
  const color = item.color ?? theme.accent;
  if (item.chart === "line") {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath();
    item.values.forEach((v, i) => { const x = left + (pw * (i + 0.5)) / n; const y = top + ph - (Math.max(0, v) / max) * ph; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    item.values.forEach((v, i) => { ctx.beginPath(); ctx.arc(left + (pw * (i + 0.5)) / n, top + ph - (Math.max(0, v) / max) * ph, 4, 0, Math.PI * 2); ctx.fill(); });
  } else {
    item.values.forEach((v, i) => {
      const value = Math.max(0, v) / max;
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]!;
      if (item.chart === "bar") ctx.fillRect(left, top + (ph * i) / n + (ph / n) * 0.15, pw * value, (ph / n) * 0.7);
      else ctx.fillRect(left + (pw * i) / n + (pw / n) * 0.15, top + ph - ph * value, (pw / n) * 0.7, ph * value);
    });
  }
  ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
  item.labels.forEach((label, i) => {
    if (item.chart === "bar") { ctx.font = `400 11px ${font}`; ctx.textAlign = "right"; ctx.fillText(label.slice(0, 8), left - 4, top + (ph * (i + 0.5)) / n + 4); }
    else { ctx.font = `400 12px ${font}`; ctx.textAlign = "center"; ctx.fillText(label.slice(0, 12), left + (pw * (i + 0.5)) / n, h - 8); }
  });
}

async function drawItem(ctx: CanvasRenderingContext2D, item: SlideItem, theme: ThemeSpec): Promise<Laid[]> {
  if (item.kind === "line") { drawLine(ctx, item, theme); return []; }
  ctx.save();
  ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
  if (item.rot) ctx.rotate((item.rot * Math.PI) / 180);
  ctx.translate(-item.w / 2, -item.h / 2);
  let laid: Laid[] = [];
  if (item.kind === "text") {
    if (item.fill) { ctx.fillStyle = item.fill; ctx.fillRect(0, 0, item.w, item.h); }
    if (item.stroke) { ctx.strokeStyle = item.stroke; ctx.lineWidth = 2; ctx.strokeRect(1, 1, item.w - 2, item.h - 2); }
    const isTitle = item.placeholder === "title" || item.placeholder === "number";
    laid = drawText(ctx, item, theme, item.color ?? (isTitle ? theme.title : theme.text), "left", "top");
  } else if (item.kind === "shape") {
    const path = new Path2D();
    path.addPath(new Path2D(shapePath(item.shape)), new DOMMatrix().scale(item.w / 100, item.h / 100));
    if (item.fill !== "none") { ctx.fillStyle = item.fill; ctx.fill(path); }
    const sw = item.stroke === "none" ? 0 : item.strokeWidth ?? 2;
    if (sw > 0) { ctx.strokeStyle = item.stroke ?? "#102032"; ctx.lineWidth = sw; setDash(ctx, item.dash, sw); ctx.stroke(path); ctx.setLineDash([]); }
    laid = drawText(ctx, item, theme, item.color ?? inkOn(item.fill), "center", "middle");
  } else if (item.kind === "image") {
    const img = await loadImage(item.src);
    if (img) {
      const c = item.crop ?? { l: 0, t: 0, r: 0, b: 0 };
      ctx.globalAlpha = item.opacity ?? 1;
      ctx.drawImage(img, img.naturalWidth * c.l, img.naturalHeight * c.t, img.naturalWidth * (1 - c.l - c.r), img.naturalHeight * (1 - c.t - c.b), 0, 0, item.w, item.h);
      ctx.globalAlpha = 1;
    }
  } else if (item.kind === "table") {
    laid = drawTable(ctx, item, theme);
  } else if (item.kind === "chart") {
    drawChart(ctx, item, theme);
  } else if (item.kind === "video") {
    ctx.fillStyle = "#102032";
    ctx.fillRect(0, 0, item.w, item.h);
    ctx.fillStyle = "#ff3070";
    const r = Math.min(item.w, item.h) * 0.16;
    ctx.beginPath(); ctx.arc(item.w / 2, item.h / 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(item.w / 2 - r * 0.35, item.h / 2 - r * 0.5); ctx.lineTo(item.w / 2 + r * 0.55, item.h / 2); ctx.lineTo(item.w / 2 - r * 0.35, item.h / 2 + r * 0.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return laid;
}

function drawDeco(ctx: CanvasRenderingContext2D, theme: ThemeSpec) {
  const a = theme.accent;
  ctx.fillStyle = a;
  if (theme.deco === "bar-left") ctx.fillRect(0, 0, 18, SLIDE_H);
  if (theme.deco === "bar-bottom") ctx.fillRect(0, SLIDE_H - 14, SLIDE_W, 14);
  if (theme.deco === "corner") { ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(SLIDE_W, 0, 150, 0, Math.PI * 2); ctx.fill(); }
  if (theme.deco === "dots") for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(SLIDE_W - 40 - i * 28, SLIDE_H - 36, 8, 0, Math.PI * 2); ctx.fill(); }
  if (theme.deco === "wave") { ctx.globalAlpha = 0.22; ctx.fill(new Path2D(`M0 ${SLIDE_H - 50}Q${SLIDE_W / 4} ${SLIDE_H - 90} ${SLIDE_W / 2} ${SLIDE_H - 50}T${SLIDE_W} ${SLIDE_H - 50}V${SLIDE_H}H0Z`)); }
  ctx.globalAlpha = 1;
}

/** Pinta una diapositiva en un lienzo a `scale` × 960 × 540. Devuelve el lienzo y el texto colocado. */
export async function renderSlide(slide: Slide, options: { scale?: number; number?: number; master?: string } = {}): Promise<{ canvas: HTMLCanvasElement; text: Laid[] }> {
  const scale = options.scale ?? 2;
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(SLIDE_W * scale);
  canvas.height = Math.round(SLIDE_H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(scale, scale);
  const theme = themeOf(slide);
  ctx.fillStyle = slide.background ?? theme.bg;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  if (slide.backgroundImage) {
    const img = await loadImage(slide.backgroundImage);
    if (img) {
      const k = Math.max(SLIDE_W / img.naturalWidth, SLIDE_H / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      ctx.drawImage(img, (SLIDE_W - w) / 2, (SLIDE_H - h) / 2, w, h);
    }
  } else drawDeco(ctx, theme);
  const text: Laid[] = [];
  if (options.master) {
    ctx.fillStyle = theme.text; ctx.globalAlpha = 0.7; ctx.font = `400 13px ${fontStack(undefined, theme.bodyFont)}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(options.master, 24, SLIDE_H - 18); ctx.globalAlpha = 1;
  }
  for (const item of slide.items) text.push(...(await drawItem(ctx, item, theme)));
  if (options.number) {
    ctx.fillStyle = theme.text; ctx.font = `400 13px ${fontStack(undefined, theme.bodyFont)}`; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillText(String(options.number), SLIDE_W - 22, SLIDE_H - 18);
  }
  return { canvas, text };
}

/** Pinta un único objeto (por ejemplo, un gráfico) en PNG, para exportarlo a PowerPoint. */
export async function itemPng(item: SlideItem, slide: Slide, scale = 2): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(item.w * scale));
  canvas.height = Math.max(1, Math.round(item.h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(scale, scale);
  ctx.translate(-item.x, -item.y);
  await drawItem(ctx, { ...item, rot: 0 }, themeOf(slide));
  return canvasBytes(canvas, "image/png");
}

function canvasBytes(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("blob")); return; }
      void blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
    }, type, quality);
  });
}

export async function exportPng(file: SlidesFile, index: number): Promise<Uint8Array> {
  const slide = file.slides[index] ?? file.slides[0]!;
  const { canvas } = await renderSlide(slide, { scale: 2, number: file.numbers ? index + 1 : undefined, master: file.master });
  return canvasBytes(canvas, "image/png");
}

const WIN_ANSI = /[^\u0020-\u007e\u00a0-\u00ff€‘’“”•–—…]/g;

/** PDF de 10 × 5,625 in (una página por diapositiva, sin las ocultas) con la imagen de la diapositiva y una capa de texto seleccionable. */
export async function exportPdf(file: SlidesFile): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(file.title);
  pdf.setCreator("ORVUPI Work");
  pdf.setProducer("ORVUPI Work");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const W = 720, H = 405, k = W / SLIDE_W;
  const slides = file.slides.map((slide, i) => ({ slide, i })).filter(({ slide }) => !slide.hidden);
  for (const { slide, i } of slides.length ? slides : [{ slide: file.slides[0]!, i: 0 }]) {
    const { canvas, text } = await renderSlide(slide, { scale: 2, number: file.numbers ? i + 1 : undefined, master: file.master });
    const image = await pdf.embedJpg(await canvasBytes(canvas, "image/jpeg", 0.92));
    const page = pdf.addPage([W, H]);
    page.drawImage(image, { x: 0, y: 0, width: W, height: H });
    for (const t of text) {
      const value = t.text.replace(WIN_ANSI, "?");
      if (!value.trim()) continue;
      page.drawText(value, { x: t.x * k, y: H - t.y * k, size: Math.max(1, t.size * k), font, opacity: 0 });
    }
  }
  return pdf.save();
}
