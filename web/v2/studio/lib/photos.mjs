/** Biblioteca local de fotos con licencia documentada. Sin stock de pago ni APIs remotas. */

import catalog from "../photos/catalog.json" with { type: "json" };
import proCatalog from "../photos/pro/catalog.json" with { type: "json" };

/** Fotografías reales (Unsplash License) que usan las plantillas profesionales. */
export const PRO_PHOTOS = Array.isArray(proCatalog.items) ? proCatalog.items : [];

export function listProPhotos(query = "", lang = "es") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return PRO_PHOTOS.slice();
  return PRO_PHOTOS.filter((item) => {
    const name = String(item?.nombre?.[lang] || item?.nombre?.es || "").toLowerCase();
    const tags = Array.isArray(item?.etiquetas) ? item.etiquetas.join(" ").toLowerCase() : "";
    return name.includes(q) || tags.includes(q);
  });
}

/** Ficha de cualquier foto local (CC0 o Unsplash) por id. */
export function anyPhotoById(id) {
  return photoById(id) || PRO_PHOTOS.find((item) => item.id === id) || null;
}

export const PHOTO_LICENSE_NOTE = {
  es: "Imágenes geométricas generadas en este repositorio. Licencia CC0 1.0 (dominio público). Sin stock de pago ni descarga remota.",
  en: "Geometric images generated in this repository. CC0 1.0 (public domain). No paid stock and no remote download.",
};

export function listPhotos(query = "", lang = "es") {
  const q = String(query || "").trim().toLowerCase();
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  if (!q) return items.slice();
  return items.filter((item) => {
    const name = String(item?.nombre?.[lang] || item?.nombre?.es || "").toLowerCase();
    const tags = Array.isArray(item?.etiquetas) ? item.etiquetas.join(" ").toLowerCase() : "";
    const license = String(item?.licencia || "").toLowerCase();
    return name.includes(q) || tags.includes(q) || license.includes(q) || String(item?.id || "").includes(q);
  });
}

export function photoById(id) {
  return (catalog.items || []).find((item) => item.id === id) || null;
}

export function photoUrl(id) {
  const item = anyPhotoById(id);
  if (!item?.archivo) return "";
  return new URL(`../${item.archivo}`, import.meta.url).href;
}

export function photoLicense(id, lang = "es") {
  const item = anyPhotoById(id);
  if (!item) return PHOTO_LICENSE_NOTE[lang] || PHOTO_LICENSE_NOTE.es;
  if (lang === "en" && item.licenciaEn) return item.licenciaEn;
  return item.licencia || PHOTO_LICENSE_NOTE.es;
}
