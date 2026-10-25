/** Quita pulpo y marca promocional del contenido genérico. No toca el álbum de memes. */

import { rectLayer, textLayer } from "./document.mjs";

export const MASCOT_IDS = ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"];

const MASCOT = new Set(MASCOT_IDS);

function logoish(name) {
  return /marca|sello|logo|enlace|firma|pie/i.test(String(name || ""));
}

function isPerson(value) {
  return /^[\p{Lu}][\p{L}'’.-]{1,24}(?:\s+[\p{Lu}][\p{L}'’.-]{1,24}){1,2}$/u.test(value);
}

/** Sustituye textos de marca por huecos neutros. El nombre de capa orienta el hueco. */
export function neutralCopy(text, layerName = "") {
  const name = String(layerName || "").trim();
  if (/^(oficio|cargo|rol)$/i.test(name)) return "Cargo";
  let value = String(text ?? "");
  value = value.replace(/Comunidad\s+ORVUPI/gi, "Tu empresa");
  value = value.replace(/Taller\s+ORVUPI/gi, "Tu taller");
  value = value.replace(/Novedades de ORVUPI/gi, "Novedades");
  value = value.replace(/Lo nuevo en ORVUPI/gi, "Lo nuevo");
  value = value.replace(/Un instante de ORVUPI/gi, "Un instante");
  value = value.replace(/Comunidad y marca/gi, "Tu marca");
  value = value.replace(/Comunidad para crear, reír y aprender juntos\./gi, "Un mensaje breve para tu audiencia.");
  value = value.replace(/Comunidad para crear, reír y aprender\./gi, "Un mensaje breve para tu audiencia.");
  value = value.replace(/Ocho tentáculos/gi, "Varias ideas");
  value = value.replace(/tentáculos/gi, "ideas");
  value = value.replace(/tentáculo/gi, "idea");
  value = value.replace(/\bORVUPI\b/g, logoish(name) ? "Tu logotipo" : "Tu empresa");
  value = value.replace(/\bpulpo\b/gi, "equipo");
  value = value.replace(/\bde la comunidad\b/gi, "de tu equipo");
  value = value.replace(/\bcon la comunidad\b/gi, "con tu equipo");
  value = value.replace(/\bpara la comunidad\b/gi, "para tu equipo");
  value = value.replace(/\bla comunidad\b/gi, "tu equipo");
  value = value.replace(/\buna comunidad\b/gi, "un equipo");
  value = value.replace(/\bde comunidad\b/gi, "de tu equipo");
  value = value.replace(/\bComunidad\b/g, "Tu equipo");
  const trimmed = value.trim();
  if (/^(nombre|persona|autor)$/i.test(name) && (isPerson(trimmed) || trimmed === "Tu empresa" || trimmed === "Tu logotipo")) {
    return "Nombre y apellidos";
  }
  return value;
}

function placeholder(layer) {
  const logo = /marca|sello|logo/i.test(layer.name) && layer.w <= 320 && layer.h <= 320;
  const label = logo ? "Tu logotipo" : "Tu foto";
  const rect = rectLayer({
    name: label,
    x: layer.x,
    y: layer.y,
    w: layer.w,
    h: layer.h,
    z: layer.z,
    fill: logo ? "#E7EEF3" : "#D5DDE6",
  });
  const size = Math.max(12, Math.min(32, Math.round(Math.min(layer.w, layer.h) / 8)));
  const text = textLayer({
    name: label,
    x: layer.x + 8,
    y: layer.y + Math.max(0, layer.h / 2 - size),
    w: Math.max(24, layer.w - 16),
    h: Math.max(28, size + 12),
    z: (layer.z || 1) + 1,
    text: label,
    fontId: "barlow",
    size,
    color: "#102032",
    align: "center",
  });
  return [rect, text];
}

function rewrite(layers) {
  const next = [];
  for (const layer of layers || []) {
    if (layer?.type === "image" && MASCOT.has(layer.src?.id)) {
      next.push(...placeholder(layer));
      continue;
    }
    if (layer?.type === "text" && layer.props) {
      layer.props.text = neutralCopy(layer.props.text, layer.name);
    }
    if (layer?.name === "Pulpo") layer.name = "Tu foto";
    next.push(layer);
  }
  return next;
}

/** Reescribe el documento ya creado. No borra proyectos guardados: solo la copia recién instanciada. */
export function neutralizeDocument(doc) {
  if (!doc) return doc;
  doc.layers = rewrite(doc.layers);
  if (Array.isArray(doc.meta?.pages)) doc.meta.pages = doc.meta.pages.map((page) => rewrite(page));
  return doc;
}

export function keepsMascot(item) {
  return item?.uso === "meme" || (item?.etiquetas || []).includes("meme");
}
