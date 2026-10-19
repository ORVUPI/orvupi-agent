/**
 * Texto enriquecido dentro de un cuadro, como en Google Slides: cada párrafo es una lista de
 * tramos (runs) con su propio formato. El formato que no indica un tramo lo hereda del cuadro.
 */
import { PT } from "./model";
import { escapeHtml, safeLink } from "./ops";

export type Run = {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  color?: string;
  hl?: string;
  font?: string;
  size?: number; // pt
  link?: string;
};
export type Para = Run[];
export type RunStyle = Omit<Run, "t">;

const KEYS: Array<keyof RunStyle> = ["b", "i", "u", "s", "color", "hl", "font", "size", "link"];
const MAX_RUNS = 400;

export function plainOf(paras: Para[]): string {
  return paras.map((p) => p.map((r) => r.t).join("")).join("\n");
}

export function parasOf(item: { text: string; rich?: Para[] }): Para[] {
  if (item.rich && plainOf(item.rich) === item.text) return item.rich;
  return item.text.split("\n").map((line) => [{ t: line }]);
}

export function hasRunStyle(paras: Para[] | undefined): boolean {
  return Boolean(paras?.some((p) => p.some((r) => KEYS.some((k) => r[k] !== undefined))));
}

function sameStyle(a: Run, b: Run): boolean {
  return KEYS.every((k) => a[k] === b[k]);
}

/** Une tramos vecinos con el mismo formato y quita los vacíos. */
export function normalize(paras: Para[]): Para[] {
  let count = 0;
  return paras.map((p) => {
    const out: Run[] = [];
    for (const r of p) {
      if (!r.t) continue;
      const last = out[out.length - 1];
      if (last && sameStyle(last, r)) last.t += r.t;
      else if (count++ < MAX_RUNS) out.push({ ...r });
      else if (last) last.t += r.t;
    }
    return out.length > 0 ? out : [{ t: "" }];
  });
}

/** Quita de los tramos un formato que pasa a aplicarse a todo el cuadro. */
export function stripStyle(paras: Para[] | undefined, keys: Array<keyof RunStyle>): Para[] | undefined {
  if (!paras) return paras;
  const next = normalize(paras.map((p) => p.map((r) => { const c = { ...r }; for (const k of keys) delete c[k]; return c; })));
  return hasRunStyle(next) ? next : undefined;
}

export function sanitizeRuns(value: unknown, text: string): Para[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined);
  const paras: Para[] = value.slice(0, 200).map((p) => (Array.isArray(p) ? p.slice(0, MAX_RUNS) : []).map((r: Record<string, unknown>) => {
    const run: Run = { t: typeof r?.t === "string" ? r.t.slice(0, 4000) : "" };
    if (r.b === true) run.b = true; else if (r.b === false) run.b = false;
    if (r.i === true) run.i = true; else if (r.i === false) run.i = false;
    if (r.u === true) run.u = true; else if (r.u === false) run.u = false;
    if (r.s === true) run.s = true; else if (r.s === false) run.s = false;
    const c = hex(r.color); if (c) run.color = c;
    const h = hex(r.hl); if (h) run.hl = h;
    if (typeof r.font === "string" && /^[\w \-]{1,40}$/.test(r.font)) run.font = r.font;
    if (typeof r.size === "number" && Number.isFinite(r.size) && r.size >= 1 && r.size <= 400) run.size = Math.round(r.size * 2) / 2;
    if (typeof r.link === "string") { const l = safeLink(r.link); if (l) run.link = l; }
    return run;
  }));
  const norm = normalize(paras);
  return plainOf(norm) === text && hasRunStyle(norm) ? norm : undefined;
}

/** Estilo CSS de un tramo (unidades de diapositiva). */
export function runCss(r: RunStyle): Record<string, string> {
  const css: Record<string, string> = {};
  if (r.b !== undefined) css["font-weight"] = r.b ? "700" : "400";
  if (r.i !== undefined) css["font-style"] = r.i ? "italic" : "normal";
  const deco = [r.u ? "underline" : "", r.s ? "line-through" : ""].filter(Boolean).join(" ");
  if (r.u !== undefined || r.s !== undefined || r.link) css["text-decoration"] = deco || (r.link ? "underline" : "none");
  if (r.color) css.color = r.color;
  else if (r.link) css.color = "#1a73e8";
  if (r.hl) css["background-color"] = r.hl;
  if (r.font) css["font-family"] = `"${r.font}", sans-serif`;
  if (r.size) css["font-size"] = `${r.size * PT}px`;
  return css;
}

function styleAttr(css: Record<string, string>): string {
  return Object.entries(css).map(([k, v]) => `${k}: ${v}`).join("; ");
}

/** HTML para el editor (contentEditable): un <div> por párrafo y un <span> por tramo. */
export function parasHtml(paras: Para[]): string {
  return paras.map((p) => {
    const inner = p.filter((r) => r.t).map((r) => {
      const style = styleAttr(runCss(r));
      const body = escapeHtml(r.t);
      const span = style ? `<span style="${escapeHtml(style)}">${body}</span>` : body;
      return r.link ? `<a href="${escapeHtml(r.link)}" data-link="1">${span}</a>` : span;
    }).join("");
    return `<div>${inner || "<br>"}</div>`;
  }).join("");
}

function hexColor(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(v);
  if (!m) return undefined;
  if (m[4] !== undefined && Number(m[4]) === 0) return undefined;
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

const FONT_SIZES_HTML: Record<string, number> = { "1": 7.5, "2": 10, "3": 12, "4": 13.5, "5": 18, "6": 24, "7": 36 };

/** Estilo que aporta un elemento del editor (b, i, span con estilo, a, font…). */
function elementStyle(el: HTMLElement, scale: number): RunStyle {
  const s: RunStyle = {};
  const tag = el.tagName;
  if (tag === "B" || tag === "STRONG") s.b = true;
  if (tag === "I" || tag === "EM") s.i = true;
  if (tag === "U") s.u = true;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") s.s = true;
  if (tag === "A") { const l = safeLink(el.getAttribute("href") ?? ""); if (l) s.link = l; }
  if (tag === "FONT") {
    const c = el.getAttribute("color"); if (c) { const h = hexColor(c); if (h) s.color = h; }
    const f = el.getAttribute("face"); if (f) s.font = f.split(",")[0]!.replace(/["']/g, "").trim();
    const z = el.getAttribute("size"); if (z && FONT_SIZES_HTML[z]) s.size = FONT_SIZES_HTML[z];
  }
  const st = el.style;
  if (st.fontWeight) s.b = st.fontWeight === "bold" || st.fontWeight === "bolder" || Number(st.fontWeight) >= 600;
  if (st.fontStyle) s.i = st.fontStyle === "italic" || st.fontStyle === "oblique";
  const deco = `${st.textDecorationLine || ""} ${st.textDecoration || ""}`;
  if (/underline/.test(deco)) s.u = true;
  if (/line-through/.test(deco)) s.s = true;
  if (/\bnone\b/.test(deco) && !/underline|line-through/.test(deco)) { s.u = false; s.s = false; }
  if (st.color) { const h = hexColor(st.color); if (h) s.color = h; }
  if (st.backgroundColor) { const h = hexColor(st.backgroundColor); if (h) s.hl = h; }
  if (st.fontFamily) s.font = st.fontFamily.split(",")[0]!.replace(/["']/g, "").trim();
  if (st.fontSize) {
    const px = Number.parseFloat(st.fontSize);
    if (st.fontSize.endsWith("px") && Number.isFinite(px)) s.size = Math.round((px / PT / scale) * 2) / 2;
    else if (st.fontSize.endsWith("pt") && Number.isFinite(px)) s.size = Math.round((px * (96 / 72) / PT / scale) * 2) / 2;
  }
  return s;
}

/**
 * Lee el contenido del editor como párrafos con tramos. `scale` corrige tamaños
 * escritos por el navegador en píxeles de pantalla (normalmente 1: el editor vive en la diapositiva).
 */
export function readEditor(root: HTMLElement, scale = 1): Para[] {
  const out: Para[] = [];
  let para: Run[] = [];
  let open = false;
  const flush = () => { out.push(para); para = []; open = false; };
  const walk = (node: Node, style: RunStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").replace(/\u00a0/g, " ").replace(/\u200b/g, "");
      if (t) para.push({ t, ...style });
      open = true;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") { flush(); return; }
    const block = /^(DIV|P|LI|H[1-6])$/.test(node.tagName);
    if (block && open) flush();
    const own = elementStyle(node, scale);
    const next = { ...style, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined)) };
    node.childNodes.forEach((child) => walk(child, next));
    if (block && open) flush();
  };
  root.childNodes.forEach((child) => walk(child, {}));
  if (open) flush();
  if (out.length === 0) out.push([]);
  return normalize(out);
}

/** Quita de los tramos lo que ya coincide con el formato del cuadro. */
export function againstBase(paras: Para[], base: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string; font?: string; size?: number; baseColor?: string; baseFont?: string; baseSize: number }): Para[] {
  return normalize(paras.map((p) => p.map((r) => {
    const c: Run = { ...r };
    if (c.b === Boolean(base.bold)) delete c.b;
    if (c.i === Boolean(base.italic)) delete c.i;
    if (c.u === Boolean(base.underline)) delete c.u;
    if (c.s === Boolean(base.strike)) delete c.s;
    if (c.color && (c.color === base.color?.toLowerCase() || (!base.color && c.color === base.baseColor?.toLowerCase()))) delete c.color;
    if (c.font && (c.font === base.font || (!base.font && c.font === base.baseFont))) delete c.font;
    if (c.size && Math.abs(c.size - (base.size ?? base.baseSize)) < 0.26) delete c.size;
    return c;
  })));
}
