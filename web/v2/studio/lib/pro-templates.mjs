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
  const spec = SPECS.get(String(id || ""));
  if (!item || !spec) return null;
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
