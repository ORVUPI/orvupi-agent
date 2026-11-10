/**
 * Utilidades para describir plantillas profesionales como documentos.
 * Todo lo que se dibuja en la miniatura sale de estas capas: no hay PNG aparte.
 */

import proCatalog from "../photos/pro/catalog.json" with { type: "json" };

const PHOTOS = new Map((proCatalog.items || []).map((item) => [item.id, item]));

/** Anchura media de carácter (en "em") por fuente, para calcular la altura de cada caja. */
const CHAR = {
  poppins: 0.58,
  "poppins-b": 0.63,
  lato: 0.52,
  "lato-b": 0.55,
  dmserif: 0.5,
  bebas: 0.42,
  abril: 0.58,
  greatvibes: 0.42,
  anton: 0.48,
  archivo: 0.68,
  barlow: 0.45,
};

export const PALETTES = {
  terracota: { bg: "#F6F1EA", ink: "#1E1B18", muted: "#6B625A", accent: "#B84330", soft: "#EADFD2", dark: "#2A2521", light: "#FFFFFF" },
  noche: { bg: "#0F172A", ink: "#F8FAFC", muted: "#94A3B8", accent: "#38BDF8", soft: "#1E293B", dark: "#020617", light: "#FFFFFF" },
  violeta: { bg: "#FFFFFF", ink: "#1F1235", muted: "#6B6380", accent: "#7C3AED", soft: "#F1EAFE", dark: "#2E1065", light: "#FFFFFF" },
  salvia: { bg: "#F1F4EE", ink: "#1F3B2D", muted: "#5D7266", accent: "#2F855A", soft: "#DCE7DE", dark: "#183026", light: "#FFFFFF" },
  melocoton: { bg: "#FFF4E8", ink: "#3D2C1E", muted: "#8A6F58", accent: "#F28C28", soft: "#FFE2C4", dark: "#1D3557", light: "#FFFFFF" },
  carbon: { bg: "#111111", ink: "#FFFFFF", muted: "#A3A3A3", accent: "#F43F5E", soft: "#262626", dark: "#000000", light: "#FFFFFF" },
  azul: { bg: "#F4F8FF", ink: "#0B2545", muted: "#4F6B8F", accent: "#1D4ED8", soft: "#DCE8FF", dark: "#0B2545", light: "#FFFFFF" },
  rosa: { bg: "#FDF2F6", ink: "#4A0D2E", muted: "#9D5C7C", accent: "#DB2777", soft: "#FBDDEB", dark: "#500724", light: "#FFFFFF" },
  arena: { bg: "#EFE6D8", ink: "#2B2118", muted: "#7A6A58", accent: "#B4833F", soft: "#E2D4BE", dark: "#2B2118", light: "#FFFFFF" },
  oceano: { bg: "#EAF6F6", ink: "#073B4C", muted: "#3F7380", accent: "#118AB2", soft: "#CDEBEC", dark: "#073B4C", light: "#FFFFFF" },
  limon: { bg: "#FFFBEA", ink: "#1C1917", muted: "#6B6158", accent: "#EAB308", soft: "#FEF3C7", dark: "#1C1917", light: "#FFFFFF" },
  bosque: { bg: "#13241B", ink: "#F3F1E7", muted: "#A9B8A9", accent: "#D4A373", soft: "#1F3A2B", dark: "#0A1510", light: "#FFFFFF" },
};

export function estimateLines(text, size, width, font = "poppins", bold = false, spacing = 0) {
  const key = bold && CHAR[`${font}-b`] ? `${font}-b` : font;
  const em = CHAR[key] || 0.55;
  const perLine = Math.max(1, Math.floor(width / (size * em + spacing)));
  let lines = 0;
  for (const raw of String(text).split("\n")) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) { lines += 1; continue; }
    let current = 0;
    let count = 1;
    for (const word of words) {
      const len = word.length;
      if (current === 0) current = len;
      else if (current + 1 + len <= perLine) current += 1 + len;
      else { count += 1; current = len; }
      while (current > perLine) { count += 1; current -= perLine; }
    }
    lines += count;
  }
  return lines;
}

/**
 * Capa de texto con altura calculada para que no se corte.
 * o: { font, size, color, align, lh, ls, bold, italic, upper, name, h, effect }
 */
export function text(value, x, y, w, o = {}) {
  const font = o.font || "poppins";
  const size = o.size || 32;
  const lh = o.lh || 1.2;
  const ls = o.ls || 0;
  const lines = estimateLines(o.upper ? String(value).toUpperCase() : value, size, w, font, o.bold, ls);
  const h = o.h || Math.ceil(lines * size * lh + size * 0.35);
  return {
    type: "text",
    name: (o.name || String(value).split("\n")[0]).slice(0, 40),
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h,
    rotation: o.rotation || 0,
    opacity: o.opacity ?? 1,
    props: {
      text: String(value),
      fontId: font,
      size,
      color: o.color || "#111111",
      align: o.align || "left",
      lineHeight: lh,
      letterSpacing: ls,
      bold: Boolean(o.bold),
      italic: Boolean(o.italic),
      textCase: o.upper ? "upper" : "",
      effect: o.effect || "",
    },
  };
}

export function rect(x, y, w, h, fill, o = {}) {
  return {
    type: "rect",
    name: o.name || "Forma",
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    rotation: o.rotation || 0,
    opacity: o.opacity ?? 1,
    props: {
      fill: fill || "",
      stroke: o.stroke || "",
      strokeWidth: o.sw || 0,
      shape: o.ellipse ? "ellipse" : "rect",
      radius: o.radius || 0,
      gradient: o.gradient || null,
    },
  };
}

export function circle(cx, cy, r, fill, o = {}) {
  return rect(cx - r, cy - r, r * 2, r * 2, fill, { ...o, ellipse: true });
}

export function line(x, y, w, color, thick = 2, o = {}) {
  return {
    type: "line",
    name: o.name || "Línea",
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.max(2, Math.round(thick)),
    opacity: o.opacity ?? 1,
    props: { color, strokeWidth: Math.max(2, Math.round(thick)) },
  };
}

/** Foto local con encuadre "cover" y punto de interés (fx, fy entre 0 y 1). */
export function photo(id, x, y, w, h, o = {}) {
  const key = String(id).startsWith("pro-") ? String(id) : `pro-${id}`;
  const item = PHOTOS.get(key);
  const nw = item?.width || 1000;
  const nh = item?.height || 667;
  const fx = o.fx ?? 0.5;
  const fy = o.fy ?? 0.5;
  const zoom = Math.max(1, o.zoom || 1);
  const target = w / h;
  let cw = nw;
  let ch = nw / target;
  if (ch > nh) {
    ch = nh;
    cw = nh * target;
  }
  cw /= zoom;
  ch /= zoom;
  const cx = Math.min(nw - cw, Math.max(0, fx * nw - cw / 2));
  const cy = Math.min(nh - ch, Math.max(0, fy * nh - ch / 2));
  return {
    type: "image",
    name: o.name || "Foto",
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    opacity: o.opacity ?? 1,
    radius: o.radius || 0,
    src: { kind: "library", id: key },
    crop: { x: Math.round(cx), y: Math.round(cy), w: Math.round(cw), h: Math.round(ch) },
  };
}

export function photoExists(id) {
  return PHOTOS.has(String(id).startsWith("pro-") ? String(id) : `pro-${id}`);
}

/** Asigna z en el orden de la lista (la última capa queda delante). */
export function stack(layers) {
  return layers.filter(Boolean).map((layer, index) => ({ ...layer, z: index + 1 }));
}
