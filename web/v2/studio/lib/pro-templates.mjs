/**
 * Catálogo de plantillas profesionales de ORVUPI Studio.
 *
 * Fuente única de verdad: cada plantilla es un documento. La miniatura de la galería,
 * la vista previa y el lienzo del editor se pintan desde este mismo documento con el
 * mismo renderizador, así que lo que ves es exactamente lo que abres.
 */

import { createDocument, PRESETS, shellForFormat } from "./document.mjs";
import { businessTemplates } from "./pro-templates-a.mjs";
import { marketingTemplates } from "./pro-templates-b.mjs";

const RAW = [...businessTemplates(), ...marketingTemplates()];
const counters = new Map();

export const PRO_TEMPLATES = RAW.map((item) => {
  const n = (counters.get(item.category) || 0) + 1;
  counters.set(item.category, n);
  const preset = PRESETS.find((entry) => entry.id === item.preset) || PRESETS[0];
  return Object.freeze({
    id: `pro-${item.category}-${String(n).padStart(2, "0")}`,
    category: item.category,
    title: item.title,
    preset: preset.id,
    width: preset.width,
    height: preset.height,
    pro: true,
  });
});

const SPECS = new Map(PRO_TEMPLATES.map((item, index) => [item.id, RAW[index]]));
const BY_ID = new Map(PRO_TEMPLATES.map((item) => [item.id, item]));
const CACHE = new Map();

// ── Legibilidad ─────────────────────────────────────────────────────────────────────────────
// Ningún texto puede perderse sobre su fondo (p. ej. tinta clara de una paleta oscura sobre una
// hoja blanca). Si el contraste WCAG con lo que tiene debajo no llega, el color se oscurece o se
// aclara conservando su tono. Se aplica al documento, así que miniatura y editor siguen idénticos.
const rgbOf = (color) => {
  const text = String(color || "").trim();
  let match = /^#([0-9a-f]{6})$/i.exec(text);
  if (match) return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
  match = /^#([0-9a-f]{3})$/i.exec(text);
  if (match) return [...match[1]].map((x) => parseInt(x + x, 16));
  match = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (match) {
    const parts = match[1].split(",").map(Number);
    return parts.length > 3 && parts[3] < 0.6 ? null : parts.slice(0, 3);
  }
  return null;
};
const luminance = ([r, g, b]) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

function backdrop(spec, index, layer) {
  const x = layer.x + Math.min(layer.w, 60) / 2;
  const y = layer.y + Math.min(layer.h, 40) / 2;
  for (let j = index - 1; j >= 0; j -= 1) {
    const under = spec.layers[j];
    if (under.type === "text" || under.visible === false) continue;
    if (x < under.x || x > under.x + under.w || y < under.y || y > under.y + under.h) continue;
    if (under.type === "image") return null; // sobre foto: el diseño ya lleva velo o sombra
    if (under.type === "rect") {
      const gradient = under.props?.gradient;
      const color = gradient ? rgbOf(gradient.to) : rgbOf(under.props?.fill);
      if (gradient && !color) return null;
      if (color) return color;
    }
  }
  return rgbOf(spec.bg) || [255, 255, 255];
}

function legible(spec) {
  const layers = spec.layers.map((layer, index) => {
    if (layer.type !== "text") return layer;
    const ink = rgbOf(layer.props?.color);
    const bg = ink && backdrop(spec, index, layer);
    if (!ink || !bg) return layer;
    const [r, g, b] = ink;
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 40;
    const big = Number(layer.props?.size || 0) >= 44;
    const target = neutral ? 7 : big ? 3 : 4.5;
    if (contrast(ink, bg) >= target) return layer;
    const toward = luminance(bg) > 0.4 ? [16, 16, 20] : [255, 255, 255];
    let best = ink;
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      best = ink.map((v, i) => v + (toward[i] - v) * t);
      if (contrast(best, bg) >= target) break;
    }
    return { ...layer, props: { ...layer.props, color: toHex(best) } };
  });
  return { ...spec, layers };
}

export function proById(id) {
  return BY_ID.get(String(id || "")) || null;
}

export function isProTemplate(id) {
  return BY_ID.has(String(id || ""));
}

export function proIn(category) {
  return PRO_TEMPLATES.filter((item) => item.category === category);
}

export function proForCategories(categories) {
  const set = new Set(categories);
  return PRO_TEMPLATES.filter((item) => set.has(item.category));
}

/** Documento nuevo (copia) para abrir en el editor. Misma geometría que la miniatura. */
export function proDocument(id) {
  const item = proById(id);
  const raw = SPECS.get(String(id || ""));
  if (!item || !raw) return null;
  const spec = legible(raw);
  const doc = createDocument({
    name: item.title.slice(0, 80),
    format: { id: item.preset, width: item.width, height: item.height },
    templateId: item.id,
    background: { type: "solid", fill: spec.bg },
    layers: JSON.parse(JSON.stringify(spec.layers)),
    meta: { locale: "es", useTags: [item.category], optionalLabel: "", shell: shellForFormat(item.preset) },
  });
  doc.templateId = item.id;
  return doc;
}

/** Documento compartido (solo lectura) para pintar miniaturas sin crear uno nuevo cada vez. */
export function proThumbDocument(id) {
  if (!CACHE.has(id)) CACHE.set(id, proDocument(id));
  return CACHE.get(id);
}

export function proCounts() {
  return Object.fromEntries(counters);
}
