/** Miniaturas reales de ORVUPI. El índice vive junto a los PNG. */

import thumbs from "../thumbs/catalog.json" with { type: "json" };

export const THUMBS = thumbs;

/** Orden fijo, el mismo en Inicio y en Plantillas. */
export const THUMB_GROUPS = [
  { id: "negocios", es: "Negocios", en: "Business", cats: ["curriculum", "presentacion", "negocio", "tarjeta-visita", "logo"] },
  { id: "redes", es: "Redes sociales", en: "Social media", cats: ["post-instagram", "story", "youtube-thumb", "meme"] },
  { id: "video", es: "Vídeo", en: "Video", cats: ["video-cover"] },
  { id: "educacion", es: "Educación", en: "Education", cats: ["educacion", "pizarra"] },
  { id: "documentos", es: "Documentos", en: "Docs", cats: ["doc"] },
  { id: "marketing", es: "Marketing", en: "Marketing", cats: ["flyer", "cartel", "invitacion", "infografia", "sitio-web"] },
];

export const THUMB_CATS = [
  { id: "curriculum", es: "Currículum", en: "Resume", format: "cv", open: "cv-partido" },
  { id: "presentacion", es: "Presentación", en: "Presentation", format: "deck", open: "deck-portada" },
  { id: "negocio", es: "Empresa", en: "Company", format: "doc", open: "emp-brief" },
  { id: "tarjeta-visita", es: "Tarjeta de visita", en: "Business card", format: "card", open: "tar-clara" },
  { id: "logo", es: "Logo", en: "Logo", format: "logo", open: "logo-sello" },
  { id: "post-instagram", es: "Publicación", en: "Post", format: "ig", open: "red-ig-bloque" },
  { id: "story", es: "Historia", en: "Story", format: "story", open: "historia-saludo" },
  { id: "youtube-thumb", es: "Miniatura", en: "Thumbnail", format: "thumb", open: "red-thumb-golpe" },
  { id: "meme", es: "Meme", en: "Meme", format: "square", open: "meme-punch" },
  { id: "video-cover", es: "Portada", en: "Cover", format: "video", open: "vid-tercio" },
  { id: "educacion", es: "Clase", en: "Class", format: "doc", open: "ficha-aprender" },
  { id: "pizarra", es: "Pizarra", en: "Whiteboard", format: "board", open: "pizarra-ideas" },
  { id: "doc", es: "Documento", en: "Document", format: "doc", open: "doc-portada" },
  { id: "flyer", es: "Folleto", en: "Flyer", format: "flyer", open: "fly-encuentro" },
  { id: "cartel", es: "Cartel", en: "Poster", format: "poster", open: "car-noche" },
  { id: "invitacion", es: "Invitación", en: "Invitation", format: "invite", open: "inv-marco" },
  { id: "infografia", es: "Infografía", en: "Infographic", format: "info", open: "info-tres" },
  { id: "sitio-web", es: "Sitio web", en: "Website", format: "web", open: "sitio-comunidad" },
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
