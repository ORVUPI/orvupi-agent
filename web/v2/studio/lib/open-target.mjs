/**
 * Abre el diseño exacto que el usuario eligió.
 * El id de la ficha (miniatura, plantilla, foto o elemento) es el templateId.
 * No sustituye por un lienzo en blanco ni por otra plantilla de la misma categoría.
 */

import catalog from "../catalog.json" with { type: "json" };
import { createDocument, imageLayer } from "./document.mjs";
import { browseAsset, browseElements, browsePhotos } from "./library.mjs";
import { listPhotos, photoById } from "./photos.mjs";
import { PLANTILLAS, instantiate, plantillaById } from "./plantillas.mjs";
import { documentForThumb } from "./thumb-docs.mjs";
import { THUMBS, thumbById, thumbsIn } from "./thumbs.mjs";

function catalogVisual(id) {
  return (catalog.items || []).find((item) => item.id === id && (item.tipo === "avatar" || item.tipo === "fondo")) || null;
}

function sceneDocument(asset) {
  const w = Math.max(64, Math.round(asset.scene?.w || 360));
  const h = Math.max(64, Math.round(asset.scene?.h || 360));
  const name = String(asset.es || asset.en || asset.id);
  const doc = createDocument({
    name,
    format: { id: "custom", width: w, height: h },
    templateId: asset.id,
    background: { type: "solid", fill: "#ffffff" },
    layers: [
      imageLayer({
        name: name.slice(0, 40),
        x: 0,
        y: 0,
        w,
        h,
        src: { kind: "catalog", id: asset.id },
      }),
    ],
    meta: { locale: "es", useTags: [asset.kind || "foto"], optionalLabel: "", shell: "design" },
  });
  doc.templateId = asset.id;
  return doc.templateId === asset.id ? doc : null;
}

function photoDocument(photo) {
  const w = Math.max(64, Math.round(photo.width || 640));
  const h = Math.max(64, Math.round(photo.height || 480));
  const name = photo.nombre?.es || photo.id;
  const doc = createDocument({
    name,
    format: { id: "custom", width: w, height: h },
    templateId: photo.id,
    background: { type: "solid", fill: "#ffffff" },
    layers: [
      imageLayer({
        name: String(name).slice(0, 40),
        x: 0,
        y: 0,
        w,
        h,
        src: { kind: "library", id: photo.id },
      }),
    ],
    meta: { locale: "es", useTags: ["foto"], optionalLabel: "", shell: "design" },
  });
  doc.templateId = photo.id;
  return doc.templateId === photo.id ? doc : null;
}

function catalogDocument(item) {
  const name = item.nombre?.es || item.id;
  if (item.tipo === "fondo") {
    const doc = createDocument({
      name,
      format: { id: "square", width: 1080, height: 1080 },
      templateId: item.id,
      background: { type: "catalog", catalogId: item.id, fill: item.fill || "#102032" },
      layers: [],
      meta: { locale: "es", useTags: ["fondo"], optionalLabel: "", shell: "design" },
    });
    doc.templateId = item.id;
    return doc.templateId === item.id ? doc : null;
  }
  const w = Math.max(64, Math.round(item.width || 1080));
  const h = Math.max(64, Math.round(item.height || 1080));
  const doc = createDocument({
    name,
    format: { id: "custom", width: w, height: h },
    templateId: item.id,
    background: { type: "solid", fill: "#FFF8EC" },
    layers: [
      imageLayer({
        name: String(name).slice(0, 40),
        x: 0,
        y: 0,
        w,
        h,
        src: { kind: "catalog", id: item.id },
      }),
    ],
    meta: { locale: "es", useTags: ["avatar"], optionalLabel: "", shell: "design" },
  });
  doc.templateId = item.id;
  return doc.templateId === item.id ? doc : null;
}

/** Documento nuevo con el mismo templateId, formato, capas y páginas de esa ficha. */
export function documentForOpen(id) {
  const key = String(id || "");
  if (!key) return null;
  const thumb = documentForThumb(key);
  if (thumb) return thumb.templateId === key ? thumb : null;
  if (plantillaById(key)) {
    const doc = instantiate(key);
    return doc && doc.templateId === key ? doc : null;
  }
  const asset = browseAsset(key);
  if (asset?.scene) return sceneDocument(asset);
  const photo = photoById(key);
  if (photo) return photoDocument(photo);
  const visual = catalogVisual(key);
  if (visual) return catalogDocument(visual);
  return null;
}

export function openKind(id) {
  if (thumbById(id)) return "thumb";
  if (plantillaById(id)) return "plantilla";
  const asset = browseAsset(id);
  if (asset) return asset.kind === "elemento" ? "elemento" : "foto";
  if (photoById(id)) return "foto-archivo";
  const visual = catalogVisual(id);
  if (visual) return visual.tipo;
  return "";
}

export function relatedOpenIds(id, limit = 8) {
  const thumb = thumbById(id);
  if (thumb) return thumbsIn(thumb.category).filter((item) => item.id !== id).slice(0, limit).map((item) => item.id);
  const plantilla = plantillaById(id);
  if (plantilla) {
    return PLANTILLAS.filter((item) => item.id !== id && item.uso === plantilla.uso).slice(0, limit).map((item) => item.id);
  }
  const asset = browseAsset(id);
  if (asset) {
    const pool = asset.kind === "elemento" ? browseElements() : browsePhotos();
    return pool.filter((item) => item.id !== id && item.topic === asset.topic).slice(0, limit).map((item) => item.id);
  }
  const photo = photoById(id);
  if (photo) return listPhotos().filter((item) => item.id !== id).slice(0, limit).map((item) => item.id);
  const visual = catalogVisual(id);
  if (visual) {
    return (catalog.items || [])
      .filter((item) => item.id !== id && item.tipo === visual.tipo)
      .slice(0, limit)
      .map((item) => item.id);
  }
  return [];
}

export function inventoryCounts() {
  const visuals = (catalog.items || []).filter((item) => item.tipo === "avatar" || item.tipo === "fondo");
  return {
    thumbs: THUMBS.length,
    plantillas: PLANTILLAS.length,
    fotos: browsePhotos().length,
    elementos: browseElements().length,
    fotosArchivo: listPhotos().length,
    catalogo: visuals.length,
  };
}
