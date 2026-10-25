/**
 * Índice de miniaturas. Cada entrada se abre por su id.
 * No hay plantilla genérica de categoría: el campo `open` se retiró
 * porque sustituía el documento anunciado (cv-partido, deck-portada, …).
 */

import thumbs from "../thumbs/catalog.json" with { type: "json" };

export const THUMBS = thumbs;

/** Orden fijo, el mismo en Inicio y en Plantillas. */
export const THUMB_GROUPS = [
  { id: "negocios", es: "Negocios", en: "Business", cats: ["curriculum", "presentacion", "tarjeta-visita", "logo", "negocio", "propuesta"] },
  { id: "redes", es: "Redes sociales", en: "Social", cats: ["post-instagram", "story", "meme"] },
  { id: "video", es: "Vídeo", en: "Video", cats: ["miniatura-youtube", "portada", "video"] },
  { id: "educacion", es: "Educación", en: "Education", cats: ["pizarra", "sitio-web", "presentacion"] },
  { id: "documentos", es: "Documentos", en: "Docs", cats: ["documento", "informe", "propuesta"] },
  { id: "marketing", es: "Marketing", en: "Marketing", cats: ["flyer", "cartel", "infografia", "invitacion", "portada"] },
];

export const THUMB_CATS = [
  { id: "curriculum", es: "Currículum", en: "Resume", format: "cv" },
  { id: "presentacion", es: "Presentación", en: "Presentation", format: "deck" },
  { id: "documento", es: "Documento", en: "Document", format: "doc" },
  { id: "informe", es: "Informe", en: "Report", format: "doc" },
  { id: "propuesta", es: "Propuesta", en: "Proposal", format: "doc" },
  { id: "tarjeta-visita", es: "Tarjeta de visita", en: "Business card", format: "card" },
  { id: "logo", es: "Logo", en: "Logo", format: "logo" },
  { id: "flyer", es: "Flyer", en: "Flyer", format: "flyer" },
  { id: "cartel", es: "Cartel", en: "Poster", format: "poster" },
  { id: "infografia", es: "Infografía", en: "Infographic", format: "info" },
  { id: "invitacion", es: "Invitación", en: "Invitation", format: "invite" },
  { id: "post-instagram", es: "Post Instagram", en: "Instagram post", format: "ig" },
  { id: "story", es: "Story", en: "Story", format: "story" },
  { id: "miniatura-youtube", es: "Miniatura YouTube", en: "YouTube thumbnail", format: "thumb" },
  { id: "portada", es: "Portada", en: "Cover", format: "video" },
  { id: "video", es: "Vídeo", en: "Video", format: "video" },
  { id: "pizarra", es: "Pizarra", en: "Whiteboard", format: "board" },
  { id: "sitio-web", es: "Sitio web", en: "Website", format: "web" },
  { id: "meme", es: "Meme", en: "Meme", format: "square" },
  { id: "negocio", es: "Negocio", en: "Business", format: "doc" },
];

const GROUP_CATS = Object.fromEntries(THUMB_GROUPS.map((group) => [group.id, group.cats]));

export function thumbById(id) {
  return THUMBS.find((item) => item.id === id) || null;
}

export function thumbCat(id) {
  return THUMB_CATS.find((item) => item.id === id) || null;
}

export function thumbsIn(category) {
  return THUMBS.filter((item) => item.category === category);
}

export function thumbCatsFor(grupo) {
  const allow = GROUP_CATS[grupo];
  if (!allow) return THUMB_CATS;
  return allow.map((id) => THUMB_CATS.find((item) => item.id === id)).filter(Boolean);
}

export function thumbsForGrupo(grupo) {
  const allow = GROUP_CATS[grupo];
  if (!allow) return THUMBS;
  return THUMBS.filter((item) => allow.includes(item.category));
}
