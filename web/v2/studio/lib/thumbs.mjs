/** Miniaturas reales de ORVUPI. El índice vive junto a los PNG. */

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
  { id: "curriculum", es: "Currículum", en: "Resume", format: "cv", open: "cv-partido" },
  { id: "presentacion", es: "Presentación", en: "Presentation", format: "deck", open: "deck-portada" },
  { id: "documento", es: "Documento", en: "Document", format: "doc", open: "doc-portada" },
  { id: "informe", es: "Informe", en: "Report", format: "doc", open: "doc-portada" },
  { id: "propuesta", es: "Propuesta", en: "Proposal", format: "doc", open: "emp-brief" },
  { id: "tarjeta-visita", es: "Tarjeta de visita", en: "Business card", format: "card", open: "tar-clara" },
  { id: "logo", es: "Logo", en: "Logo", format: "logo", open: "logo-sello" },
  { id: "flyer", es: "Flyer", en: "Flyer", format: "flyer", open: "fly-encuentro" },
  { id: "cartel", es: "Cartel", en: "Poster", format: "poster", open: "car-noche" },
  { id: "infografia", es: "Infografía", en: "Infographic", format: "info", open: "info-tres" },
  { id: "invitacion", es: "Invitación", en: "Invitation", format: "invite", open: "inv-marco" },
  { id: "post-instagram", es: "Post Instagram", en: "Instagram post", format: "ig", open: "red-ig-bloque" },
  { id: "story", es: "Story", en: "Story", format: "story", open: "historia-saludo" },
  { id: "miniatura-youtube", es: "Miniatura YouTube", en: "YouTube thumbnail", format: "thumb", open: "red-thumb-golpe" },
  { id: "portada", es: "Portada", en: "Cover", format: "doc", open: "doc-portada" },
  { id: "video", es: "Vídeo", en: "Video", format: "video", open: "vid-tercio" },
  { id: "pizarra", es: "Pizarra", en: "Whiteboard", format: "board", open: "pizarra-ideas" },
  { id: "sitio-web", es: "Sitio web", en: "Website", format: "web", open: "sitio-comunidad" },
  { id: "meme", es: "Meme", en: "Meme", format: "square", open: "meme-punch" },
  { id: "negocio", es: "Negocio", en: "Business", format: "doc", open: "emp-brief" },
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
