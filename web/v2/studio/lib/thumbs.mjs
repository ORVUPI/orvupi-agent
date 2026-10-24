/** Miniaturas reales de ORVUPI. El índice vive junto a los PNG. */

import thumbs from "../thumbs/catalog.json" with { type: "json" };

export const THUMBS = thumbs;

export const THUMB_CATS = [
  { id: "curriculum", es: "Currículum", en: "Resume", format: "cv", open: "cv-partido" },
  { id: "presentacion", es: "Presentación", en: "Presentation", format: "deck", open: "deck-portada" },
  { id: "post-instagram", es: "Post", en: "Post", format: "ig", open: "red-ig-bloque" },
  { id: "story", es: "Story", en: "Story", format: "story", open: "historia-saludo" },
  { id: "youtube-thumb", es: "Miniatura", en: "Thumbnail", format: "thumb", open: "red-thumb-golpe" },
  { id: "flyer", es: "Flyer", en: "Flyer", format: "flyer", open: "fly-encuentro" },
  { id: "cartel", es: "Cartel", en: "Poster", format: "poster", open: "car-noche" },
  { id: "logo", es: "Logo", en: "Logo", format: "logo", open: "logo-sello" },
  { id: "invitacion", es: "Invitación", en: "Invitation", format: "invite", open: "inv-marco" },
  { id: "doc", es: "Documento", en: "Doc", format: "doc", open: "doc-portada" },
  { id: "infografia", es: "Infografía", en: "Infographic", format: "info", open: "info-tres" },
  { id: "tarjeta-visita", es: "Tarjeta", en: "Card", format: "card", open: "tar-clara" },
  { id: "video-cover", es: "Vídeo", en: "Video", format: "video", open: "vid-tercio" },
  { id: "pizarra", es: "Pizarra", en: "Whiteboard", format: "board", open: "pizarra-ideas" },
  { id: "sitio-web", es: "Sitio", en: "Website", format: "web", open: "sitio-comunidad" },
  { id: "meme", es: "Meme", en: "Meme", format: "square", open: "meme-punch" },
  { id: "negocio", es: "Negocio", en: "Business", format: "doc", open: "emp-brief" },
  { id: "educacion", es: "Educación", en: "Learning", format: "doc", open: "ficha-aprender" },
];

const GROUPS = {
  negocios: ["negocio", "curriculum", "presentacion", "doc", "flyer", "cartel", "logo", "invitacion", "tarjeta-visita"],
  redes: ["post-instagram", "story", "youtube-thumb", "meme"],
  video: ["video-cover"],
  educacion: ["educacion", "infografia", "pizarra", "sitio-web"],
};

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
  const allow = GROUPS[grupo];
  if (!allow) return THUMB_CATS;
  return THUMB_CATS.filter((item) => allow.includes(item.id));
}

export function thumbsForGrupo(grupo) {
  const allow = GROUPS[grupo];
  if (!allow) return THUMBS;
  return THUMBS.filter((item) => allow.includes(item.category));
}
