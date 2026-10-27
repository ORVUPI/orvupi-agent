/** Cromo de ORVUPI Studio. La pieza se queda en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { aiPanelCopy, localPhrases } from "./lib/ai-optional.mjs";
import { renderOrvupiIa } from "./ia.mjs";
import { BRAND, FONTS, PRESETS, fontById, importProject, orderedLayers, overlappingIds } from "./lib/document.mjs";
import { HISTORY_COST, listHistory } from "./lib/history.mjs";
import { listPhotos, PHOTO_LICENSE_NOTE, photoById } from "./lib/photos.mjs";
import { tablePlainText } from "./lib/table-data.mjs";
import { piecesOf } from "./lib/text-style.mjs";
import { IDEAS, PLANTILLAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import { desktopRail, designsSub } from "./desktop.mjs";
import { designView } from "./mis-disenos.mjs";
import { listDesigns } from "./lib/projects.mjs";
import { loadMas } from "./lib/mas-store.mjs";
import { documentForThumb } from "./lib/thumb-docs.mjs";
import { documentForOpen, openKind, relatedOpenIds } from "./lib/open-target.mjs";
import { THUMB_CATS, THUMB_GROUPS, thumbById, thumbCat, thumbCatsFor, thumbsForGrupo, thumbsIn } from "./lib/thumbs.mjs";
import {
  browseAsset,
  browseElements,
  browsePhotos,
  elementTopics,
  emptyFolderScene,
  filterBrowse,
  photoTopics,
} from "./lib/library.mjs";

const GROUPS = {
  "para-ti": ["square", "story", "x", "tiktok", "ig", "deck", "doc", "cv", "video", "flyer", "logo", "poster", "web", "board"],
  redes: ["square", "ig", "story", "fb", "li", "thumb", "bio", "tiktok", "x"],
  videos: ["video", "story", "tiktok", "thumb"],
  impresion: ["flyer", "poster", "invite", "trifold", "card", "info", "cv", "logo"],
  documentos: ["doc", "email", "sheet", "cv"],
  presentacion: ["deck", "doc", "video"],
  pizarra: ["board"],
  web: ["web", "deck"],
};

const STANDARD = ["plantillas", "elementos", "texto", "marca", "subidos", "herramientas", "proyectos", "fotos", "formas", "graficos", "fondo", "capas", "ia"];

export const RAILS = {
  design: STANDARD,
  deck: STANDARD,
  video: STANDARD,
  print: STANDARD,
  web: STANDARD,
  doc: ["plantillas", "elementos", "marca", "subidos", "proyectos", "fotos", "formas", "graficos", "capas", "ia"],
  whiteboard: [...STANDARD.filter((id) => id !== "fondo"), "notas"],
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "hidden") node.hidden = Boolean(value);
    else if (key === "style") node.style.cssText = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(text, attrs = {}) {
  return el("button", { type: "button", ...attrs, text });
}

const SVG_NS = "http:" + "//www.w3.org/2000/svg";

function icon(d) {
  return svgIcon([d]);
}

function svgIcon(paths) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

function dotsIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const cx of [6, 12, 18]) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "1.7");
    circle.setAttribute("fill", "currentColor");
    svg.append(circle);
  }
  return svg;
}

function navDots() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const cx of [5, 12, 19]) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "1.55");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.7");
    svg.append(circle);
  }
  return svg;
}

function iconButton(label, attrs, d) {
  const node = button("", { ...attrs, class: `nav-btn ${attrs.class || ""}`.trim() });
  node.append(icon(d), el("span", { text: label }));
  return node;
}

function shellOf(doc) {
  const shell = doc?.meta?.shell;
  if (RAILS[shell]) return shell;
  return "design";
}

function catalogItem(id) {
  return catalog.items.find((item) => item.id === id) || null;
}

function studioAsset(path) {
  return new URL(path, import.meta.url).href;
}

function ink(hex) {
  return String(hex).toLowerCase() === "#102032" ? "#FFF8EC" : "#102032";
}

function swatchStyle(hex) {
  return `background:${hex};color:${ink(hex)}`;
}

function primary(state) {
  const id = state.selected[state.selected.length - 1];
  return state.doc?.layers.find((layer) => layer.id === id) || null;
}

function sideNav(ctx) {
  const view = ctx.viewName();
  const mark = (id) => (view === id ? "page" : null);
  return el("div", { class: "side-stack" }, [
    iconButton(ctx.t("crear"), { id: "crear-pieza", class: "crear-btn" }, "M12 5v14M5 12h14"),
    iconButton(ctx.t("inicio"), { "data-go": "inicio", "aria-current": mark("inicio") }, "M4 11 L12 4 L20 11 V20 H4 Z"),
    iconButton(ctx.t("plantillas"), { "data-go": "plantillas", "aria-current": mark("plantillas") }, "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
    iconButton(ctx.t("disenos"), { "data-go": "disenos", "aria-current": mark("disenos") }, "M4 7h6l2 2h8v9H4z"),
    iconButton(ctx.t("marca"), { "data-go": "marca", "aria-current": mark("marca") }, "M12 3l2.5 6H21l-5 4 2 7-6-4-6 4 2-7-5-4h6.5z"),
    iconButton(ctx.t("recursos"), { "data-go": "recursos", "aria-current": mark("recursos") }, "M5 4h14v4H5zM5 10h14v10H5z"),
    el("a", { class: "nav-btn marca-link", href: "/marca/" }, [icon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"), el("span", { text: ctx.t("verMarca") })]),
  ]);
}

function frame(side, main, editing) {
  const open = Boolean(editing && editing.navOpen);
  return el("div", { class: `orv-frame${editing ? " editando" : ""}${open ? " nav-abierta" : ""}` }, [
    el("aside", { class: "orv-side", "aria-label": "ORVUPI Studio", hidden: Boolean(editing && !open) }, [
      el("p", { class: "side-brand" }, [
        el("img", { src: studioAsset("assets/orvupi-avatar.png"), alt: "", width: "36", height: "36" }),
        el("strong", { text: "ORVUPI" }),
      ]),
      side,
    ]),
    main,
  ]);
}

function chip(label, pressed, attrs) {
  return button(label, { ...attrs, class: "chip", "aria-pressed": pressed ? "true" : "false" });
}

export function catalogBody(ctx) {
  const { state, t, lang } = ctx;
  const items = filterPlantillas(state.filters);
  const home = ctx.viewName() === "inicio";
  const active = Boolean(state.filters.text || state.filters.uso || state.filters.estilo || state.filters.color || state.filters.precio || state.filters.formato);
  const gridMode = !home || active;
  const en = lang === "en";
  const usoLabel = {
    "": t("todas"),
    meme: t("meme"),
    publicacion: t("publicacion"),
    historia: t("historia"),
    anuncio: t("anuncio"),
    marca: t("marca"),
    redes: en ? "Social" : "Redes",
    curriculum: en ? "Resume" : "Currículum",
    presentacion: en ? "Presentation" : "Presentación",
    proyecto: en ? "Project" : "Proyecto",
    empresa: en ? "Business" : "Empresa",
    documento: en ? "Doc" : "Documento",
    video: en ? "Video" : "Vídeo",
    flyer: "Flyer",
    cartel: en ? "Poster" : "Cartel",
    folleto: en ? "Leaflet" : "Folleto",
    logo: "Logo",
    invitacion: en ? "Invitation" : "Invitación",
    pizarra: en ? "Whiteboard" : "Pizarra",
    web: en ? "Website" : "Sitio",
    infografia: en ? "Infographic" : "Infografía",
    educacion: en ? "Learning" : "Aprender",
  };
  const usos = ["", "curriculum", "presentacion", "proyecto", "empresa", "redes", "documento", "flyer", "cartel", "logo", "invitacion", "video", "pizarra", "web", "meme", "publicacion", "historia", "anuncio", "marca", "folleto", "infografia"];
  const formatos = [
    ["", t("todas")],
    ["square", "1:1"],
    ["story", "9:16"],
    ["x", "X"],
    ["tiktok", "TikTok"],
    ["ig", "4:5"],
    ["deck", "16:9"],
    ["cv", "A4"],
    ["video", en ? "Video" : "Vídeo"],
    ["poster", en ? "Poster" : "Cartel"],
    ["trifold", en ? "Leaflet" : "Folleto"],
    ["web", en ? "Website" : "Sitio"],
    ["board", en ? "Whiteboard" : "Pizarra"],
  ];
  const estilos = [["", t("todas")], ["humor", t("humor")], ["claro", t("claro")], ["comic", t("comic")], ["informativo", t("informativo")], ["marca", t("marca")]];
  const colores = [["", t("todas")], ["rosa", t("rosa")], ["crema", t("crema")], ["azul", t("azul")]];
  const row = (label, pairs, name, current) => el("div", { class: "chips linea", role: "group", "aria-label": label }, pairs.map(([id, text]) => chip(text, current === id, { "data-filter": name, "data-value": id })));
  const cards = items.map((item) => templateCard(item, lang));
  const filters = el("div", { class: "filtros" }, [
    row(t("tema"), usos.map((id) => [id, usoLabel[id] || id]), "uso", state.filters.uso),
    row(t("formato"), formatos, "formato", state.filters.formato),
    el("div", { class: "chips linea", role: "group", "aria-label": t("estilo") }, [
      ...estilos.map(([id, text]) => chip(text, state.filters.estilo === id, { "data-filter": "estilo", "data-value": id })),
      ...colores.map(([id, text]) => chip(text, state.filters.color === id, { "data-filter": "color", "data-value": id })),
      chip(t("gratis"), state.filters.precio === "gratis", { "data-filter": "precio", "data-value": state.filters.precio === "gratis" ? "" : "gratis" }),
      button(t("limpiar"), { id: "limpiar-filtros", class: "chip" }),
    ]),
  ]);
  const ideas = el("div", { class: "chips linea ideas", role: "group", "aria-label": t("ideas") }, IDEAS.map((item) => button(item[lang] || item.es, { "data-idea": item.id, class: "chip" })));
  const kids = [
    el("label", { class: "buscar-wrap", for: "buscar" }, [
      el("span", { class: "sr", text: t("buscar") }),
      el("input", { id: "buscar", type: "search", value: state.filters.text, placeholder: t("buscarPh"), autocomplete: "off" }),
    ]),
  ];
  const hub = ctx.viewName() === "plantillas" && !active && !state.thumbCat;
  const thumbPage = ctx.viewName() === "plantillas" && !active && Boolean(state.thumbCat);
  if (home && !gridMode) {
    const pinned = new Set(["publi-feed", "historia-saludo", "meme-punch", "pizarra-ideas", "sitio-comunidad", "flyer-comunidad", "cartel-vertical", "logo-cuadrado", "invitacion-vertical", "folleto-tres"]);
    kids.push(groupChips(ctx), thumbSeguir(ctx), thumbParaTi(ctx), categoryGroups(ctx), thumbRails(ctx), homeRails(ctx, pinned), pinnedTemplates(ctx, pinned), ideas, filters);
  } else if (thumbPage) {
    kids.push(thumbCategory(ctx));
    kids.push(filters);
  } else if (hub) {
    kids.push(groupChips(ctx), categoryGroups(ctx), ctx.state.grupo ? thumbRails(ctx) : null, ideas, filters);
  } else {
    const blank = blankCardFor(state.filters.uso, en);
    const grid = items.length ? el("div", { class: "rejilla-cinco" }, blank ? [blank, ...cards] : cards) : null;
    const empty = el("p", { id: "vacio-plantillas", text: t("vacio") });
    if (state.filters.uso && !state.filters.text && !state.filters.formato) {
      kids.push(grid || empty);
      kids.push(filters);
      if (home) kids.push(ideas);
    } else {
      kids.push(filters);
      if (home) kids.push(ideas);
      kids.push(grid || empty);
    }
  }
  return el("div", { id: "catalogo" }, kids);
}

const BLANK = {
  curriculum: ["cv", "Crear un currículum en blanco", "Start a blank resume"],
  presentacion: ["deck", "Crear una presentación en blanco", "Start a blank deck"],
  proyecto: ["deck", "Crear un proyecto en blanco", "Start a blank project"],
  empresa: ["doc", "Crear un brief en blanco", "Start a blank brief"],
  redes: ["ig", "Crear un post en blanco", "Start a blank post"],
  documento: ["doc", "Crear un documento en blanco", "Start a blank doc"],
  flyer: ["flyer", "Crear un flyer en blanco", "Start a blank flyer"],
  cartel: ["poster", "Crear un cartel en blanco", "Start a blank poster"],
  logo: ["logo", "Crear un logo en blanco", "Start a blank logo"],
  invitacion: ["invite", "Crear una invitación en blanco", "Start a blank invitation"],
  video: ["video", "Crear un vídeo en blanco", "Start a blank video"],
  pizarra: ["board", "Crear una pizarra en blanco", "Start a blank board"],
  web: ["web", "Crear un sitio en blanco", "Start a blank site"],
  meme: ["square", "Crear un meme en blanco", "Start a blank meme"],
};

const TILES = [
  ["curriculum", "cv-partido"],
  ["presentacion", "deck-portada"],
  ["redes", "red-ig-bloque"],
  ["video", "vid-tercio"],
  ["documento", "doc-portada"],
  ["flyer", "fly-encuentro"],
  ["cartel", "car-noche"],
  ["logo", "logo-sello"],
  ["invitacion", "inv-marco"],
  ["proyecto", "proy-portada"],
  ["empresa", "deck-empresa"],
  ["pizarra", "piz-notas"],
  ["web", "web-fichas"],
  ["infografia", "info-tres"],
  ["folleto", "fol-pasos"],
  ["publicacion", "publi-feed"],
  ["historia", "historia-saludo"],
  ["anuncio", "anun-sello"],
  ["educacion", "ficha-aprender"],
  ["meme", "meme-punch"],
];

const PASTEL = ["#FFE4EE", "#FFF8EC", "#E7EEF3", "#FFD6E4", "#F6EFE4", "#F8D5E2", "#E4EAF2"];

const GRUPO_USOS = {
  negocios: ["curriculum", "presentacion", "proyecto", "empresa", "logo"],
  redes: ["redes", "historia", "publicacion", "anuncio", "meme", "marca"],
  video: ["video"],
  educacion: ["educacion", "pizarra"],
  documentos: ["documento"],
  marketing: ["flyer", "cartel", "invitacion", "infografia", "web", "folleto"],
};

const PARA_TI = [
  "publi-feed", "historia-saludo", "cv-partido", "deck-portada", "red-ig-bloque",
  "fly-encuentro", "flyer-comunidad", "car-noche", "cartel-vertical", "logo-sello",
  "logo-cuadrado", "inv-marco", "invitacion-vertical", "meme-punch", "pizarra-ideas",
  "sitio-comunidad", "folleto-tres", "web-fichas",
];

const SAMPLE = {
  square: "publi-feed",
  story: "historia-saludo",
  tiktok: "hist-pasos",
  ig: "red-ig-bloque",
  fb: "red-fb-partido",
  li: "red-li-nota",
  thumb: "red-thumb-golpe",
  bio: "red-bio-fichas",
  deck: "deck-portada",
  doc: "doc-portada",
  cv: "cv-partido",
  video: "vid-tercio",
  flyer: "fly-encuentro",
  poster: "car-noche",
  invite: "inv-marco",
  trifold: "fol-pasos",
  card: "tar-clara",
  info: "info-tres",
  logo: "logo-sello",
  board: "piz-notas",
  web: "web-fichas",
  email: "mail-nota",
  sheet: "hoja-agenda",
  collage: "col-franjas",
  code: "codigo-bloque",
};

function blankCard(formatId, label) {
  const preset = PRESETS.find((item) => item.id === formatId);
  const ratio = preset ? `${preset.width} / ${preset.height}` : "3 / 4";
  const node = button("", { "data-format": formatId, class: "plantilla en-blanco" });
  node.append(
    el("span", { class: "mini-slot blanco", style: `aspect-ratio:${ratio}` }, [el("span", { class: "mas", text: "+" })]),
    el("span", { class: "plantilla-nombre", text: label }),
  );
  return node;
}

function blankCardFor(uso, en) {
  const spec = BLANK[uso];
  return spec ? blankCard(spec[0], en ? spec[2] : spec[1]) : null;
}

const THUMB_PARA = [
  "tpl-presentacion-01", "tpl-post-instagram-01", "tpl-curriculum-01", "tpl-logo-01",
  "tpl-flyer-01", "tpl-miniatura-youtube-01", "tpl-cartel-03", "tpl-story-03",
  "tpl-invitacion-02", "tpl-video-01", "tpl-negocio-01", "tpl-documento-01",
];

function thumbLabel(item, lang) {
  return lang === "en" && item.titleEn ? item.titleEn : item.title;
}

function thumbCard(item, lang) {
  const doc = documentForThumb(item.id);
  const node = button("", { class: "plantilla thumb-card", "data-thumb": item.id });
  if (doc) node.append(miniStage(doc));
  node.append(el("span", { class: "plantilla-nombre", text: thumbLabel(item, lang) }));
  return node;
}

function thumbBlank(ctx, formatId) {
  return blankCard(formatId, ctx.t("crearBlanco"));
}

function thumbSeguir(ctx) {
  const { t } = ctx;
  const projects = listDesigns(ctx.storage).slice(0, 4);
  if (!projects.length) {
    return el("section", { class: "carril-bloque", id: "seguir" }, [
      el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") })]),
      el("p", { id: "seguir-vacio", class: "nota", text: t("vacioReciente") }),
    ]);
  }
  const more = button(t("verTodo"), { class: "ver-todo", "data-go": "disenos" });
  return el("section", { class: "carril-bloque", id: "seguir" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") }), more]),
    el("div", { class: "seguir-grid" }, projects.map((item) => recentCard(item, t))),
  ]);
}

function THUMBS_BY_ID(id) {
  for (const cat of THUMB_CATS) {
    const hit = thumbsIn(cat.id).find((item) => item.id === id);
    if (hit) return hit;
  }
  return null;
}

function thumbParaTi(ctx) {
  const items = THUMB_PARA.map(THUMBS_BY_ID).filter(Boolean);
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [
      el("h2", { text: ctx.t("paraTi") }),
      button(ctx.t("verTodo"), { class: "ver-todo", "data-go": "plantillas", "data-thumb-cat": "" }),
    ]),
    el("div", { class: "carril grande" }, items.map((item) => thumbCard(item, ctx.lang))),
  ]);
}

function catTile(ctx, cat, index) {
  const { state, lang } = ctx;
  const en = lang === "en";
  const sample = thumbsIn(cat.id)[0];
  const doc = sample ? documentForThumb(sample.id) : null;
  const node = button("", {
    class: "cat-tile",
    "data-thumb-cat": cat.id,
    "data-go": "plantillas",
    "aria-pressed": state.thumbCat === cat.id ? "true" : "false",
  });
  const fondo = el("span", { class: "cat-fondo", style: `background:${PASTEL[index % PASTEL.length]}` });
  if (doc) fondo.append(miniStage(doc));
  node.append(fondo, el("span", { class: "plantilla-nombre", text: en ? cat.en : cat.es }));
  return node;
}

function categoryGroups(ctx) {
  const { state, lang } = ctx;
  const en = lang === "en";
  const groups = state.grupo ? THUMB_GROUPS.filter((group) => group.id === state.grupo) : THUMB_GROUPS;
  return el("div", { class: "bloques-grupo" }, groups.map((group) => {
    const cats = group.cats.map((id) => THUMB_CATS.find((item) => item.id === id)).filter(Boolean);
    if (!cats.length) return null;
    const label = en ? group.en : group.es;
    return el("section", { class: "bloque-grupo", "aria-label": label }, [
      el("h3", { class: "grupo-titulo", text: label }),
      el("div", { class: "mosaico-cats" }, cats.map((cat, index) => catTile(ctx, cat, index))),
    ]);
  }));
}

function thumbRails(ctx) {
  const { lang, t, state } = ctx;
  const en = lang === "en";
  return el("div", { class: "carriles" }, thumbCatsFor(state.grupo).map((cat) => {
    const items = thumbsIn(cat.id);
    if (!items.length) return null;
    return el("section", { class: "carril-bloque" }, [
      el("div", { class: "carril-head" }, [
        el("h2", { text: en ? cat.en : cat.es }),
        button(t("verTodo"), { class: "ver-todo", "data-go": "plantillas", "data-thumb-cat": cat.id }),
      ]),
      el("div", { class: "carril" }, items.map((item) => thumbCard(item, lang))),
    ]);
  }));
}

function thumbDense(ctx) {
  const items = thumbsForGrupo(ctx.state.grupo);
  return el("div", { class: "rejilla-cinco thumbs" }, items.map((item) => thumbCard(item, ctx.lang)));
}

function thumbCategory(ctx) {
  const { lang, state } = ctx;
  const cat = THUMB_CATS.find((item) => item.id === state.thumbCat);
  if (!cat) return thumbDense(ctx);
  const en = lang === "en";
  const cards = thumbsIn(cat.id).map((item) => thumbCard(item, lang));
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: en ? cat.en : cat.es })]),
    el("div", { class: "rejilla-cinco thumbs" }, [thumbBlank(ctx, cat.format), ...cards]),
  ]);
}

function tileList(ctx, respetoGrupo) {
  let list = TILES;
  if (respetoGrupo && GRUPO_USOS[ctx.state.grupo]) list = TILES.filter(([uso]) => GRUPO_USOS[ctx.state.grupo].includes(uso));
  return list;
}

function categoryTiles(ctx, usoLabel, respetoGrupo) {
  const { state } = ctx;
  const list = tileList(ctx, respetoGrupo);
  const shown = state.masCats ? list : list.slice(0, 14);
  return el("div", { class: "mosaico-cats", role: "group", "aria-label": ctx.t("tema") }, shown.map(([uso, id], index) => {
    const doc = instantiate(id);
    const node = button("", {
      class: "cat-tile",
      "data-filter": "uso",
      "data-value": uso,
      "aria-pressed": state.filters.uso === uso ? "true" : "false",
    });
    const fondo = el("span", { class: "cat-fondo", style: `background:${PASTEL[index % PASTEL.length]}` });
    if (doc) fondo.append(miniStage(doc));
    node.append(fondo, el("span", { class: "plantilla-nombre", text: usoLabel[uso] || uso }));
    return node;
  }));
}

function exploraSection(ctx, usoLabel, respetoGrupo) {
  const { state, t } = ctx;
  const list = tileList(ctx, respetoGrupo);
  const more = list.length > 14
    ? el("div", { class: "mas-fila" }, [button(state.masCats ? t("mostrarMenos") : t("mostrarMas"), { id: "mostrar-mas", class: "mostrar-mas" })])
    : null;
  const ver = button(t("verTodo"), { class: "ver-todo", "data-go": "plantillas", "data-filter": "uso", "data-value": "" });
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("explora") }), ver]),
    categoryTiles(ctx, usoLabel, respetoGrupo),
    more,
  ]);
}

function groupChips(ctx) {
  const { state, t, lang } = ctx;
  const en = lang === "en";
  const groups = [
    ["", t("grupoTodo")],
    ...THUMB_GROUPS.map((group) => [group.id, en ? group.en : group.es]),
  ];
  return el("div", { class: "grupos", role: "group", "aria-label": t("tema") }, groups.map(([id, label]) => button(label, {
    class: "grupo",
    "data-grupo": id,
    "aria-pressed": (state.grupo || "") === id ? "true" : "false",
  })));
}

function seguirSection(ctx) {
  const { t } = ctx;
  const projects = listDesigns(ctx.storage).slice(0, 4);
  if (!projects.length) {
    return el("section", { class: "carril-bloque", id: "seguir" }, [
      el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") })]),
      el("p", { id: "seguir-vacio", class: "nota", text: t("vacioReciente") }),
    ]);
  }
  const more = button(t("verTodo"), { class: "ver-todo", "data-go": "disenos" });
  return el("section", { class: "carril-bloque", id: "seguir" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") }), more]),
    el("div", { class: "seguir-grid" }, projects.map((item) => recentCard(item, t))),
  ]);
}

function paraTiSection(ctx, shown) {
  const { lang, t } = ctx;
  const items = [];
  for (const id of PARA_TI) {
    const item = PLANTILLAS.find((entry) => entry.id === id);
    if (!item || shown.has(id)) continue;
    shown.add(id);
    items.push(item);
  }
  return railBlock(ctx, t("paraTi"), "", items, true);
}

function byUso(uso) {
  const list = PLANTILLAS.filter((item) => item.uso === uso);
  return uso === "meme" ? list : list.slice().reverse();
}

const THEME_RAILS = [
  { es: "Currículum", en: "Resume", uso: "curriculum" },
  { es: "Presentaciones", en: "Presentations", uso: "presentacion" },
  { es: "Proyectos", en: "Projects", uso: "proyecto" },
  { es: "Empresa", en: "Business", uso: "empresa" },
  { es: "Redes", en: "Social", uso: "redes" },
  { es: "Historias", en: "Stories", uso: "historia" },
  { es: "Documentos", en: "Docs", uso: "documento" },
  { es: "Flyers", en: "Flyers", uso: "flyer" },
  { es: "Carteles", en: "Posters", uso: "cartel" },
  { es: "Logos", en: "Logos", uso: "logo" },
  { es: "Invitaciones", en: "Invitations", uso: "invitacion" },
  { es: "Vídeo", en: "Video", uso: "video" },
  { es: "Pizarra", en: "Whiteboard", uso: "pizarra" },
  { es: "Sitio", en: "Website", uso: "web" },
  { es: "Folletos", en: "Leaflets", uso: "folleto" },
  { es: "Infografías", en: "Infographics", uso: "infografia" },
  { es: "Aprender", en: "Learning", uso: "educacion" },
  { es: "Memes", en: "Memes", uso: "meme" },
];

function railBlock(ctx, title, uso, items, grande) {
  const { lang, t } = ctx;
  if (!items.length) return null;
  const more = button(t("verTodo"), {
    class: "ver-todo",
    "data-go": "plantillas",
    "data-filter": "uso",
    "data-value": uso || "",
  });
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: title }), more]),
    el("div", { class: grande ? "carril grande" : "carril" }, items.map((item) => templateCard(item, lang))),
  ]);
}

function themedRails(ctx, limit, shown) {
  const { lang } = ctx;
  const en = lang === "en";
  const allow = GRUPO_USOS[ctx.state.grupo];
  const rails = allow ? THEME_RAILS.filter((rail) => allow.includes(rail.uso)) : THEME_RAILS;
  return el("div", { class: "carriles" }, rails.map((rail) => {
    const items = [];
    for (const item of byUso(rail.uso)) {
      if (shown?.has(item.id)) continue;
      shown?.add(item.id);
      items.push(item);
      if (items.length >= limit) break;
    }
    return railBlock(ctx, en ? rail.en : rail.es, rail.uso, items, false);
  }));
}

function homeRails(ctx, shown) {
  return themedRails(ctx, 8, shown);
}

function pinnedTemplates(ctx, ids) {
  const items = [...ids].map((id) => PLANTILLAS.find((item) => item.id === id)).filter(Boolean);
  return railBlock(ctx, ctx.t("piezas"), "", items, false);
}

function hubRails(ctx) {
  return themedRails(ctx, 12, null);
}

function templateCard(item, lang) {
  const doc = instantiate(item.id);
  const node = button("", { "data-template": item.id, class: "plantilla" });
  if (doc) node.append(miniStage(doc));
  node.append(el("span", { class: "plantilla-nombre", text: item.nombre[lang] || item.nombre.es }));
  return node;
}

function miniStage(doc) {
  const w = doc.format.width;
  const h = doc.format.height;
  const slot = el("span", { class: "mini-slot", style: `aspect-ratio:${w} / ${h}` });
  let bg = `background-color:${doc.background?.fill || BRAND.cream}`;
  if (doc.background?.type === "catalog" && doc.background.catalogId) {
    const item = catalogItem(doc.background.catalogId);
    if (item) bg += `;background-image:url("${studioAsset(item.archivo)}")`;
  }
  const art = el("span", { class: "mini-art", style: `width:${w}px;height:${h}px;--doc-w:${w}px;${bg}` });
  for (const layer of orderedLayers(doc)) {
    if (layer.visible === false) continue;
    const node = el("span", { class: "mini-capa", style: layerStyle(layer) });
    if (layer.type === "text") {
      const text = el("span", { class: "mini-texto", text: layer.props.text });
      text.style.fontFamily = fontById(layer.props.fontId).css;
      text.style.fontSize = `${layer.props.size}px`;
      text.style.color = layer.props.color;
      text.style.textAlign = layer.props.align || "left";
      text.style.lineHeight = String(layer.props.lineHeight || 1.15);
      node.append(text);
    } else if (layer.type === "image") {
      const frameNode = el("span", { class: "mini-img" });
      if (layer.src?.kind === "catalog") {
        const item = catalogItem(layer.src.id);
        if (item?.archivo) frameNode.append(el("img", { src: studioAsset(item.archivo), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
        else {
          const asset = browseAsset(layer.src.id);
          if (asset?.scene) frameNode.append(mountScene(asset.scene, "capa-escena"));
        }
      } else if (layer.src?.kind === "library") {
        frameNode.append(el("img", { src: studioAsset(`photos/${layer.src.id}.png`), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
      }
      node.append(frameNode);
    } else if (layer.type === "chart") {
      node.append(el("span", { class: "mini-forma", style: "background:linear-gradient(180deg,#FF3070 40%,#102032 40%)" }));
    } else if (layer.type === "table") {
      node.append(el("span", { class: "mini-forma", style: "background:#FFF8EC;border:2px solid #102032" }));
    } else if (layer.type === "line") {
      node.append(el("span", { class: "mini-forma", style: `background:${layer.props.color || BRAND.navy}` }));
    } else {
      const shape = el("span", { class: "mini-forma" });
      if (layer.props?.fill) shape.style.background = layer.props.fill;
      if (layer.props?.stroke && layer.props.strokeWidth) shape.style.border = `${layer.props.strokeWidth}px solid ${layer.props.stroke}`;
      node.append(shape);
    }
    art.append(node);
  }
  slot.append(art);
  return slot;
}

function catButton(id, label, pressed, tone) {
  const node = el("button", { type: "button", class: "cat-btn", "data-cat": id, "aria-pressed": pressed ? "true" : "false" });
  node.append(el("span", { class: `cat-dot tono-${tone}`, "aria-hidden": "true" }), el("span", { text: label }));
  return node;
}

function presetCard(item, lang) {
  const sample = SAMPLE[item.id] ? instantiate(SAMPLE[item.id]) : null;
  const node = button("", { "data-format": item.id, class: "preset" });
  if (sample) node.append(el("span", { class: "preset-live" }, [miniStage(sample)]));
  else node.append(el("span", { class: "preset-face tono-navy", style: `aspect-ratio:${item.width} / ${item.height}` }));
  node.append(
    el("strong", { text: item[lang] || item.es }),
    el("span", { class: "plantilla-meta", text: `${item.width}×${item.height}` }),
  );
  return node;
}

export function sizeDialog(ctx) {
  const { state, t, lang } = ctx;
  const cat = state.createCat || "para-ti";
  const ids = GROUPS[cat] || GROUPS["para-ti"];
  const presets = ids.map((id) => PRESETS.find((item) => item.id === id)).filter(Boolean);
  const cats = lang === "en"
    ? [["para-ti", "For you", "pink"], ["redes", "Social", "navy"], ["videos", "Video", "pink"], ["impresion", "Print", "cream"], ["documentos", "Docs", "navy"], ["presentacion", "Presentation", "pink"], ["pizarra", "Whiteboard", "cream"], ["web", "Website", "navy"]]
    : [["para-ti", "Para ti", "pink"], ["redes", "Redes", "navy"], ["videos", "Vídeo", "pink"], ["impresion", "Impresión", "cream"], ["documentos", "Documentos", "navy"], ["presentacion", "Presentación", "pink"], ["pizarra", "Pizarra", "cream"], ["web", "Sitio", "navy"]];
  return el("dialog", { id: "dialogo-tamano" }, [
    el("div", { class: "crear" }, [
      el("div", { class: "crear-side" }, cats.map(([id, label, tone]) => catButton(id, label, cat === id, tone))),
      el("div", { class: "crear-main" }, [
        el("div", { class: "crear-top" }, [
          el("h2", {}, [
            el("span", { class: "mob-label", text: t("tamano") }),
            el("span", { class: "desk-label", text: lang === "en" ? "Create a design" : "Crea un diseño" }),
          ]),
          button(t("cerrar"), { id: "cerrar-tamano" }),
        ]),
        el("label", { class: "buscar-wrap", for: "buscar-tamano" }, [
          el("span", { class: "sr", text: t("buscarCrear") }),
          el("input", { id: "buscar-tamano", type: "search", placeholder: wideDesk() ? (lang === "en" ? "What do you want to design?" : "¿Qué quieres diseñar?") : t("buscarCrear"), autocomplete: "off" }),
        ]),
        el("h3", { class: "desk-only", text: lang === "en" ? "Popular tools" : "Funciones populares" }),
        el("div", { class: "desk-only desk-features" }, [
          ["deck", lang === "en" ? "Presentation" : "Presentación", "#7B61FF", "M4 7h16v10H4zM8 11h8"],
          ["ig", lang === "en" ? "Social" : "Redes", "#FF4B6E", "M7 8h10v8H7z"],
          ["video", lang === "en" ? "Video" : "Vídeo", "#0EA5E9", "M8 7l10 5-10 5z"],
          ["doc", "Doc", "#3B82F6", "M7 3h7l4 4v14H7z"],
          ["flyer", lang === "en" ? "Print" : "Impresión", "#20C997", "M6 8h12v8H6zM8 16v3h8v-3"],
        ].map(([id, label, tone, d]) => {
          const node = button("", { class: "desk-feature", "data-format": id, "aria-label": label });
          node.append(el("span", { class: "desk-feature-bubble", style: `background:${tone}` }, [svgIcon([d])]), el("span", { text: label }));
          return node;
        })),
        el("h3", { class: "desk-only", text: cat === "para-ti" ? (lang === "en" ? "Most used" : "Más usados") : (lang === "en" ? "Popular" : "Populares") }),
        el("div", { class: "crear-grid" }, presets.map((item) => presetCard(item, lang))),
        el("h3", { text: t("personalizado") }),
        el("div", { class: "medidas" }, [
          el("label", { text: t("ancho") }, [el("input", { id: "ancho-custom", type: "number", min: "64", max: "2048", value: "1080" })]),
          el("label", { text: t("alto") }, [el("input", { id: "alto-custom", type: "number", min: "64", max: "2048", value: "1080" })]),
        ]),
        el("p", { class: "nota", text: t("unidadNota") }),
        button(t("usar"), { id: "crear-custom", class: "primary" }),
      ]),
    ]),
  ]);
}

function recentCard(item, t) {
  let doc = null;
  try {
    doc = importProject(item);
  } catch {
    doc = null;
  }
  const node = button("", { "data-open": item.id, class: "reciente" });
  if (doc?.format?.width) node.append(miniStage(doc));
  node.append(el("span", { class: "plantilla-nombre", text: item.name || t("abrir") }));
  return node;
}

function recents(ctx) {
  const { t } = ctx;
  const items = listDesigns(ctx.storage).slice(0, 8);
  if (!items.length) return null;
  return el("section", { class: "bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("reciente") })]),
    el("div", { class: "carril", id: "recientes" }, items.map((item) => recentCard(item, t))),
  ]);
}

function quickRow(ctx) {
  const { t, lang } = ctx;
  const en = lang === "en";
  const items = [
    ["deck", en ? "Deck" : "Presentación", "navy", "q-deck"],
    ["ig", en ? "Social" : "Redes", "pink", "q-ig"],
    ["video", en ? "Video" : "Vídeo", "navy", "q-video"],
    ["flyer", en ? "Print" : "Impresión", "cream", "q-flyer"],
    ["doc", "Doc", "pink", "q-doc"],
    ["cv", en ? "Resume" : "Currículum", "navy", "q-cv"],
    ["board", en ? "Board" : "Pizarra", "cream", "q-board"],
    ["web", en ? "Site" : "Sitio", "pink", "q-web"],
    ["logo", "Logo", "navy", "q-logo"],
    ["poster", en ? "Poster" : "Cartel", "cream", "q-poster"],
  ];
  return el("div", { class: "rapidos", "aria-label": t("crear") }, items.map(([id, label, tone, shape]) => {
    const node = button("", { "data-format": id, class: `rapido ${shape}` });
    node.append(
      el("span", { class: `rapido-cara tono-${tone}`, "aria-hidden": "true" }, [el("span", { class: "q-shape" })]),
      el("span", { class: "q-label", text: label }),
    );
    return node;
  }));
}

/** Inicio móvil al estilo de la referencia: sin barra lateral, con pestañas abajo. */
const CAT_WASH = [
  "linear-gradient(160deg,#d9f4ff,#f7e7ff)",
  "linear-gradient(160deg,#ffe7d6,#fff6ea)",
  "linear-gradient(160deg,#e7ffe8,#e5f6ff)",
  "linear-gradient(160deg,#ffe4f1,#f3e8ff)",
  "linear-gradient(160deg,#fff4cc,#ffe8ef)",
  "linear-gradient(160deg,#e6f0ff,#fde7f3)",
  "linear-gradient(160deg,#e8fff6,#e7f0ff)",
  "linear-gradient(160deg,#f3e8ff,#ffe9d6)",
];

const START_HOW = [
  ["cat", "redes", "Redes sociales", "Social", "#7B61FF", "M7 8h10v8H7zM9 7V5h6v2"],
  ["format", "cv", "Currículum", "Resume", "#F97316", "M7 4h7l3 3v13H7z"],
  ["cat", "presentacion", "Presentación", "Presentation", "#FF7A45", "M4 7h16v10H4zM8 11h8"],
  ["format", "flyer", "Flyer", "Flyer", "#EC4899", "M7 4h10v16H7z"],
  ["cat", "videos", "Video", "Video", "#FF4B6E", "M8 7l10 5-10 5z"],
  ["format", "poster", "Cartel", "Poster", "#6366F1", "M6 3h12v18H6z"],
  ["cat", "impresion", "Impresión", "Print", "#20C997", "M6 8h12v8H6zM8 16v3h8v-3"],
  ["format", "invite", "Invitación", "Invitation", "#A855F7", "M4 8l8 5 8-5v10H4z"],
  ["cat", "documentos", "Doc", "Doc", "#3B82F6", "M7 3h7l4 4v14H7z"],
  ["format", "info", "Infografía", "Infographic", "#0EA5E9", "M5 19V5M10 19V9M15 19v-6M20 19V8"],
  ["cat", "pizarra", "Pizarra", "Whiteboard", "#F5B942", "M4 5h16v12H4zM8 20h8"],
  ["format", "story", "Historia", "Story", "#F43F5E", "M8 3h8v18H8z"],
  ["cat", "web", "Sitio web", "Website", "#14B8A6", "M4 6h16v12H4zM4 10h16"],
  ["format", "trifold", "Folleto", "Leaflet", "#10B981", "M3 6h18v12H3zM9 6v12M15 6v12"],
  ["format", "logo", "Logo", "Logo", "#102032", "M12 4l2.2 4.6L19 9.2l-3.5 3.3.9 5L12 15.2 7.6 17.5l.9-5L5 9.2l4.8-.6z"],
  ["format", "sheet", "Hoja", "Sheet", "#64748B", "M5 5h14v14H5zM5 10h14M5 15h14M10 5v14"],
];

const MOST_USED = [
  ["trifold", "Folleto", "Leaflet", "flyer", 0],
  ["poster", "Cartel", "Poster", "cartel", 0],
  ["web", "Sitio web", "Website", "sitio-web", 0],
  ["cv", "Currículum", "Resume", "curriculum", 0],
  ["flyer", "Flyer", "Flyer", "flyer", 1],
  ["doc", "Documento", "Document", "documento", 0],
  ["invite", "Invitación", "Invitation", "invitacion", 0],
  ["info", "Infografía", "Infographic", "infografia", 0],
  ["story", "Historia", "Story", "story", 0],
  ["deck", "Presentación", "Presentation", "presentacion", 0],
];

const SHORTCUTS = [
  ["fotos", "Editor de fotos", "Photo editor", "#7B61FF", "M4 7h16v12H4zM8 15l3-3 2 2 3-4 2 3"],
  ["texto", "Texto", "Text", "#3B82F6", "M6 6h12M6 12h12M6 18h8"],
  ["capas", "Capas", "Layers", "#0EA5E9", "M5 8h10v10H5zM9 6h10v10"],
  ["formas", "Formas", "Shapes", "#F97316", "M5 5h8v8H5zM13 11h6v8h-6z"],
  ["graficos", "Gráficos", "Charts", "#10B981", "M5 19V5M9 19v-6M13 19V9M17 19v-9"],
  ["fondo", "Fondo", "Background", "#A855F7", "M4 6h16v12H4zM8 14l2-2 2 2 3-3 3 3"],
  ["subidos", "Subidos", "Uploads", "#64748B", "M12 16V6M8 10l4-4 4 4M5 18h14"],
  ["ia", "Catálogo", "Catalog", "#6D28D9", "M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z"],
  ["elementos", "Elementos", "Elements", "#EC4899", "M12 4l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z"],
  ["marca", "Marca", "Brand", "#102032", "M12 3l2.2 5.2L20 9l-4 3.6L17.2 18 12 15.4 6.8 18 8 12.6 4 9l5.8-.8z"],
];

const INTEREST_CATS = ["post-instagram", "logo", "negocio", "presentacion", "propuesta", "tarjeta-visita", "portada", "informe"];

function localeBase() {
  const path = location.pathname;
  return ["/en", "/pt-br", "/ja", "/ko"].find((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || "";
}

function proThumbList() {
  const items = [];
  for (const cat of THUMB_CATS) {
    if (cat.id === "meme") continue;
    items.push(...thumbsIn(cat.id));
  }
  return items;
}

function projectTitle(item, t) {
  const name = String(item?.name || "").trim();
  if (!name || name === "Sin título" || name === "Untitled") return t("sinTitulo");
  return name;
}

function canvaHead(title, more, deskTitle) {
  const heading = deskTitle
    ? el("h2", {}, [el("span", { class: "mob-label", text: title }), el("span", { class: "desk-label", text: deskTitle })])
    : el("h2", { text: title });
  return el("div", { class: "canva-head" }, [heading, more || null]);
}

function seeAll(label, attrs) {
  return button(label, { class: "canva-see", ...attrs });
}

function thumbFace(item) {
  return el("span", { class: "canva-thumb" }, [
    el("img", { src: studioAsset(item.file), alt: "", loading: "lazy", decoding: "async" }),
  ]);
}

function moreMenu(label, actions) {
  return el("details", { class: "canva-more", "data-card-menu": "" }, [
    el("summary", { "aria-label": label }, [dotsIcon()]),
    el("div", {}, actions),
  ]);
}

function canvaTop(ctx) {
  const pill = el("a", { class: "canva-pill", href: `${localeBase()}/work/` }, [
    svgIcon(["M4 16h16M5 16l2-8 3.5 3.2L12 5l1.5 6.2L17 8l2 8"]),
    el("span", { text: ctx.t("pillWork") }),
  ]);
  return el("header", { class: "canva-top" }, [
    button(ctx.t("inicio"), { class: "canva-inicio canva-plain", "data-go": "inicio" }),
    pill,
  ]);
}

function canvaHero(ctx) {
  const { t, state } = ctx;
  return el("div", { class: "canva-hero" }, [
    el("h1", { text: t("hero") }),
    deskPills(ctx, "inicio"),
    el("label", { class: "canva-search" }, [
      el("span", { class: "sr", text: t("buscar") }),
      svgIcon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5"]),
      el("input", {
        id: "buscar",
        type: "search",
        value: state.filters.text,
        placeholder: wideDesk() ? (ctx.lang === "en" ? "Search for anything" : "Busca lo que quieras") : t("buscarDiseno"),
        autocomplete: "off",
        "aria-label": t("buscar"),
      }),
      state.filters.text ? button("×", { id: "limpiar-filtros", class: "canva-clear", "aria-label": t("limpiar") }) : null,
    ]),
  ]);
}

function wideDesk() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 900px)").matches;
}

function canvaFab(ctx) {
  const node = button("", {
    id: "crear-pieza",
    class: "canva-fab",
    "aria-label": ctx.t("crearPieza"),
  });
  node.append(svgIcon(["M6 8h9v9H6zM16 5v5M13.5 7.5h5"]));
  return node;
}

function deskPills(ctx, current) {
  const inicio = button(ctx.t("inicio"), {
    class: "canva-plain desk-pill",
    "data-go": "inicio",
    "aria-current": current === "inicio" ? "page" : null,
  });
  const plantillas = button(ctx.t("plantillas"), {
    class: "canva-plain desk-pill",
    "data-go": "plantillas",
    "aria-current": current === "plantillas" ? "page" : null,
  });
  return el("div", { class: "desk-only desk-pills", role: "tablist" }, [inicio, plantillas]);
}

function navTab(label, view, current, d, image) {
  const node = button("", {
    class: "canva-tab canva-plain",
    "data-go": view,
    "aria-current": current === view ? "page" : null,
    "aria-label": label,
  });
  if (image) node.append(el("img", { class: "canva-tab-avatar", src: image, alt: "", width: "22", height: "22" }));
  else node.append(svgIcon([d]));
  node.append(el("span", { text: label }));
  if (view === "ia" && current === view) node.append(el("i", { class: "ia-nav-dot", "aria-hidden": "true" }));
  return node;
}

export function canvaNav(ctx, tab) {
  const { t } = ctx;
  const mas = button("", {
    class: "canva-tab canva-plain",
    "data-go": "mas",
    "aria-current": tab === "mas" ? "page" : null,
    "aria-label": t("masTab"),
  });
  mas.append(navDots(), el("span", { text: t("masTab") }));
  return el("nav", { class: "canva-nav", "aria-label": t("menu") }, [
    navTab(t("inicio"), "inicio", tab, "M4 11 L12 4 L20 11 V20 H4 Z"),
    navTab(t("disenos"), "disenos", tab, "M4 7h6l2 2h8v9H4z"),
    navTab(t("plantillas"), "plantillas", tab, "M3 4h10v8H3zM15 4h6v5h-6zM3 14h6v6H3zM11 14h10v6H11z"),
    navTab(t("iaTab"), "ia", tab, "M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z", studioAsset("assets/orvupi-avatar.png")),
    mas,
  ]);
}

function canvaShell(ctx, tab, feed, withHero) {
  const kids = [desktopRail(ctx, tab), canvaTop(ctx)];
  if (withHero) kids.push(canvaHero(ctx));
  kids.push(feed);
  if (withHero) kids.push(canvaFab(ctx));
  kids.push(canvaNav(ctx, tab));
  return el("div", { class: "canva-home", "data-tab": tab }, kids);
}

function recentHomeCard(item, t) {
  let doc = null;
  try {
    doc = importProject(item);
  } catch {
    doc = null;
  }
  const open = button("", { class: "canva-plain canva-recent-open", "data-open": item.id });
  const face = el("span", { class: "canva-recent-face" });
  if (doc?.format?.width && doc.layers?.length) face.append(miniStage(doc));
  else face.append(el("span", { class: "canva-ph" }));
  face.append(el("span", { class: "canva-card-name", text: projectTitle(item, t) }));
  open.append(face);
  return el("article", { class: "canva-recent" }, [
    open,
    moreMenu(t("masOpciones"), [
      button(t("duplicar"), { "data-duplicate": item.id }),
      button(t("exportar"), { "data-export": item.id }),
      button(t("eliminar"), { "data-delete": item.id }),
    ]),
  ]);
}

function seguirHome(ctx) {
  const { t } = ctx;
  const projects = listDesigns(ctx.storage).slice(0, 8);
  if (!projects.length) {
    return el("section", { class: "canva-section", id: "seguir" }, [
      canvaHead(t("seguir")),
      el("p", { id: "seguir-vacio", class: "canva-empty", text: t("vacioReciente") }),
    ]);
  }
  return el("section", { class: "canva-section desk-carousel", id: "seguir" }, [
    canvaHead(t("seguir"), seeAll(t("verTodo"), { "data-go": "disenos" })),
    el("div", { class: "canva-row" }, projects.map((item) => recentHomeCard(item, t))),
    arrowButton(t("anterior"), "prev"),
    arrowButton(t("siguiente"), "next"),
  ]);
}

function startHome(ctx) {
  const en = ctx.lang === "en";
  const row = el("div", { class: "canva-start" }, START_HOW.map(([kind, id, es, labelEn, tone, d]) => {
    const attrs = kind === "cat" ? { "data-cat": id } : { "data-format": id };
    const node = button("", { class: "canva-plain canva-bubble-btn", ...attrs });
    node.append(
      el("span", { class: "canva-bubble", style: `background:${tone}` }, [svgIcon([d])]),
      el("span", { class: "canva-bubble-label", text: en ? labelEn : es }),
    );
    return node;
  }));
  return el("section", { class: "canva-section desk-carousel", "data-home": "start", "aria-label": ctx.t("elige") }, [
    canvaHead(ctx.t("elige")),
    row,
    arrowButton(ctx.t("anterior"), "prev"),
    arrowButton(ctx.t("siguiente"), "next"),
  ]);
}

function usedHome(ctx) {
  const en = ctx.lang === "en";
  const cards = MOST_USED.map(([id, es, labelEn, cat, skip]) => {
    const sample = thumbsIn(cat)[skip] || thumbsIn(cat)[0];
    const node = button("", { class: "canva-plain canva-format", "data-format": id });
    const face = el("span", { class: "canva-thumb" });
    if (sample?.file) face.append(el("img", { src: studioAsset(sample.file), alt: "", loading: "lazy", decoding: "async" }));
    node.append(face, el("span", { class: "canva-card-name", text: en ? labelEn : es }));
    return node;
  });
  return el("section", { class: "canva-section", "data-home": "used" }, [
    canvaHead(ctx.t("masUsadas")),
    el("div", { class: "canva-row" }, cards),
  ]);
}

function portraitCard(item, lang) {
  const node = button("", { class: "canva-plain canva-port", "data-thumb": item.id });
  node.append(thumbFace(item), el("span", { class: "canva-card-name", text: thumbLabel(item, lang) }));
  return node;
}

function popularHome(ctx) {
  const items = proThumbList().filter((item) => item.height >= item.width).slice(0, 10);
  return el("section", { class: "canva-section", "data-home": "popular" }, [
    canvaHead(ctx.t("populares")),
    el("div", { class: "canva-row" }, items.map((item) => portraitCard(item, ctx.lang))),
  ]);
}

function shortcutsHome(ctx) {
  const en = ctx.lang === "en";
  const row = el("div", { class: "canva-start" }, SHORTCUTS.map(([rail, es, labelEn, tone, d]) => {
    const node = button("", { class: "canva-plain canva-bubble-btn", "data-start-rail": rail });
    node.append(
      el("span", { class: "canva-bubble", style: `background:${tone}` }, [svgIcon([d])]),
      el("span", { class: "canva-bubble-label", text: en ? labelEn : es }),
    );
    return node;
  }));
  return el("section", { class: "canva-section", "data-home": "shortcuts", "aria-label": ctx.t("acceso") }, [
    canvaHead(ctx.t("acceso")),
    row,
  ]);
}

function interestCard(item, ctx) {
  const open = button("", { class: "canva-plain", "data-thumb": item.id });
  open.append(thumbFace(item));
  return el("article", { class: "canva-sq" }, [
    open,
    moreMenu(ctx.t("masOpciones"), [
      button(ctx.t("usarPlantilla"), { "data-thumb": item.id }),
      button(ctx.t("verCategoria"), { "data-go": "plantillas", "data-thumb-cat": item.category }),
    ]),
    el("span", { class: "canva-card-name", text: thumbLabel(item, ctx.lang) }),
  ]);
}

function interestHome(ctx) {
  const items = [];
  for (const cat of INTEREST_CATS) {
    for (const item of thumbsIn(cat)) {
      if (item.category === "meme") continue;
      items.push(item);
      if (items.length >= 8) break;
    }
    if (items.length >= 8) break;
  }
  return el("section", { class: "canva-section desk-carousel", "data-home": "interest" }, [
    canvaHead(ctx.t("interes"), seeAll(ctx.t("verTodo"), { "data-go": "plantillas", "data-thumb-cat": "" }), ctx.t("paraTi")),
    el("div", { class: "canva-row" }, items.map((item) => interestCard(item, ctx))),
    arrowButton(ctx.t("anterior"), "prev"),
    arrowButton(ctx.t("siguiente"), "next"),
  ]);
}

function categoriesHome(ctx) {
  const en = ctx.lang === "en";
  const cats = THUMB_CATS.filter((cat) => cat.id !== "meme");
  const cards = cats.map((cat, index) => {
    const sample = thumbsIn(cat.id)[0];
    const node = button("", {
      class: "canva-plain canva-cat",
      "data-go": "plantillas",
      "data-thumb-cat": cat.id,
      style: `background:${CAT_WASH[index % CAT_WASH.length]}`,
    });
    if (sample?.file) node.append(el("img", { src: studioAsset(sample.file), alt: "", loading: "lazy", decoding: "async" }));
    node.append(el("span", { text: en ? cat.en : cat.es }));
    return node;
  });
  return el("section", { class: "canva-section", "data-home": "categories" }, [
    canvaHead(ctx.t("exploraPlantillas")),
    el("div", { class: "canva-row" }, cards),
  ]);
}

function homeResults(ctx) {
  const { state, lang, t } = ctx;
  const q = state.filters.text.trim().toLowerCase();
  const thumbs = proThumbList().filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(q)).slice(0, 12);
  const templates = filterPlantillas(state.filters).slice(0, 24);
  const kids = [];
  if (thumbs.length) {
    kids.push(el("section", { class: "canva-section" }, [
      canvaHead(t("plantillas")),
      el("div", { class: "canva-row" }, thumbs.map((item) => interestCard(item, ctx))),
    ]));
  }
  if (templates.length) {
    kids.push(el("section", { class: "canva-section" }, [
      canvaHead(t("piezas")),
      el("div", { class: "canva-row" }, templates.map((item) => templateCard(item, lang))),
    ]));
  }
  if (!kids.length) kids.push(el("p", { id: "vacio-plantillas", class: "canva-empty", text: t("vacio") }));
  return el("div", { class: "canva-feed" }, kids);
}

function homeFeed(ctx) {
  const personal = loadMas(ctx.storage).privacy.home !== false;
  return el("div", { class: "canva-feed" }, [
    seguirHome(ctx),
    startHome(ctx),
    usedHome(ctx),
    popularHome(ctx),
    shortcutsHome(ctx),
    personal ? interestHome(ctx) : null,
    categoriesHome(ctx),
  ]);
}

export function renderHome(ctx) {
  const feed = ctx.state.filters.text.trim() ? homeResults(ctx) : homeFeed(ctx);
  ctx.root.replaceChildren(canvaShell(ctx, "inicio", feed, true), sizeDialog(ctx));
}

export function renderIa(ctx) {
  renderOrvupiIa(ctx, { nav: () => canvaNav(ctx, "ia"), asset: studioAsset });
}

const GLANCE = [
  ["curriculum", "Currículum", "Resume"],
  ["documento", "Doc", "Doc"],
  ["post-instagram", "Post de Instagram", "Instagram post"],
  ["sitio-web", "Enlace en la biografía", "Link in bio"],
  ["informe", "Documento", "Document"],
  ["presentacion", "Presentación", "Presentation"],
  ["cartel", "Cartel", "Poster"],
  ["story", "Tu historia", "Your story"],
  ["logo", "Logo", "Logo"],
  ["invitacion", "Invitación", "Invitation"],
  ["video", "Vídeo", "Video"],
  ["miniatura-youtube", "Miniatura de YouTube", "YouTube thumbnail"],
  ["flyer", "Flyer", "Flyer"],
  ["negocio", "Negocio", "Business"],
  ["infografia", "Infografía", "Infographic"],
  ["tarjeta-visita", "Tarjeta", "Card"],
  ["propuesta", "Propuesta", "Proposal"],
  ["portada", "Portada", "Cover"],
  ["pizarra", "Pizarra", "Whiteboard"],
];

const GLANCE_WASH = [
  "#E5F7F4", "#F4E8FF", "#FFE8D8", "#E7F0FF", "#FDE7F2", "#FFF3C9", "#E7FFF3", "#EEE7FF",
  "#FFE4EE", "#E5F4FF", "#FFF0E0", "#EDE9FE", "#E7FBF6", "#F8E8FF", "#FFE9D6", "#E8EEFF",
];

const CHIP_ICON = {
  negocios: "M4 9h16v10H4zM8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  redes: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z",
  video: "M4 8h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4zM15 11l5-3v8l-5-3z",
  educacion: "M5 5h10a2 2 0 0 1 2 2v12H7a2 2 0 0 0-2 2V5zM7 5v14",
  documentos: "M7 3h7l4 4v14H7zM14 3v4h4",
  marketing: "M4 10h5l8-4v12l-8-4H4z",
};

const VIDEO_CATS = new Set(["video", "miniatura-youtube", "portada"]);

function plantillasPool(ctx) {
  const items = ctx.state.grupo ? thumbsForGrupo(ctx.state.grupo) : proThumbList();
  return items.filter((item) => item?.file && item.category !== "meme");
}

function vividFirst(list) {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(b.item.vivid)) - Number(Boolean(a.item.vivid)) || a.index - b.index)
    .map((entry) => entry.item);
}

function mixCats(items, cats, limit) {
  const buckets = cats.map((cat) => vividFirst(items.filter((item) => item.category === cat)));
  const out = [];
  let index = 0;
  while (out.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      if (!bucket[index]) continue;
      out.push(bucket[index]);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
    index += 1;
  }
  return out;
}

function masonryOrder(items) {
  const buckets = [];
  const seen = new Map();
  for (const item of items) {
    if (!seen.has(item.category)) {
      seen.set(item.category, []);
      buckets.push(seen.get(item.category));
    }
    seen.get(item.category).push(item);
  }
  for (let i = 0; i < buckets.length; i += 1) buckets[i] = vividFirst(buckets[i]);
  const out = [];
  let index = 0;
  while (out.length < items.length) {
    let added = false;
    for (const bucket of buckets) {
      if (!bucket[index]) continue;
      out.push(bucket[index]);
      added = true;
    }
    if (!added) break;
    index += 1;
  }
  return out;
}

function glanceList(ctx) {
  const group = THUMB_GROUPS.find((item) => item.id === ctx.state.grupo);
  const allow = group ? new Set(group.cats) : null;
  const list = GLANCE.filter(([id]) => !allow || allow.has(id));
  if (allow) {
    for (const id of allow) {
      if (id === "meme" || list.some(([item]) => item === id)) continue;
      const cat = THUMB_CATS.find((item) => item.id === id);
      if (cat) list.push([id, cat.es, cat.en]);
    }
  }
  return list;
}

function arrowButton(label, dir) {
  const node = button("", {
    class: `tpl-arrow canva-plain is-${dir}`,
    "data-rail-dir": dir,
    "aria-label": label,
  });
  node.append(svgIcon([dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"]));
  return node;
}

function pageOrPlay(item) {
  if (VIDEO_CATS.has(item.category)) {
    const play = el("span", { class: "tpl-play", "aria-hidden": "true" }, [svgIcon(["M9 7.5l7 4.5-7 4.5z"])]);
    const kids = [play];
    if (item.category === "video") {
      kids.push(el("span", { class: "tpl-mute", "aria-hidden": "true" }, [
        svgIcon(["M5 10h3l4-3v10l-4-3H5z", "M16.5 10.5l3 3", "M19.5 10.5l-3 3"]),
      ]));
    }
    return el("span", { class: "tpl-media" }, kids);
  }
  const pages = Number(item.pages || 0);
  if (!(pages > 1)) return null;
  return el("span", { class: "tpl-pages", "aria-label": String(pages) }, [
    svgIcon(["M8 4h9v13H8z", "M6 7h9v13H6z"]),
    el("span", { text: String(pages) }),
  ]);
}

function previewCard(item, ctx, extra) {
  const open = button("", {
    class: "canva-plain tpl-open",
    "data-thumb": item.id,
    "aria-label": thumbLabel(item, ctx.lang),
  });
  const face = thumbFace(item);
  const img = face.querySelector("img");
  if (img && item.width && item.height) {
    img.setAttribute("width", String(item.width));
    img.setAttribute("height", String(item.height));
    if (extra !== "tpl-rail-card") img.style.aspectRatio = `${item.width} / ${item.height}`;
  }
  open.append(face);
  return el("article", { class: extra ? `tpl-card ${extra}` : "tpl-card" }, [
    open,
    moreMenu(ctx.t("masOpciones"), [
      button(ctx.t("usarPlantilla"), { "data-thumb": item.id }),
      button(ctx.t("verCategoria"), { "data-go": "plantillas", "data-thumb-cat": item.category }),
    ]),
    pageOrPlay(item),
  ]);
}

function plantillasTop(ctx) {
  const { t, state } = ctx;
  const chevron = el("span", { class: "tpl-chevron", "aria-hidden": "true" });
  const chevronIcon = svgIcon(["M8 10.5l4 4 4-4"]);
  // Sin estos atributos el SVG cae a 300×150 y el círculo del título ocupa el viewport.
  chevronIcon.setAttribute("width", "14");
  chevronIcon.setAttribute("height", "14");
  chevron.append(chevronIcon);
  const title = button("", {
    class: "tpl-title canva-plain",
    "data-library-sheet": "1",
    "aria-expanded": state.librarySheet ? "true" : "false",
    "aria-haspopup": "dialog",
    "aria-controls": "biblioteca-sheet",
  });
  title.append(el("span", { class: "tpl-title-text", text: t("plantillas") }), chevron);
  const finder = button("", {
    id: "tpl-buscar-icono",
    class: "tpl-search-btn canva-plain",
    "aria-label": t("buscar"),
  });
  finder.append(svgIcon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5"]));
  return el("header", { class: "tpl-top" }, [
    el("div", { class: "tpl-top-bar" }, [title, finder]),
  ]);
}

function plantillasSearch(ctx) {
  const { t, state } = ctx;
  return el("div", { class: "tpl-search-wrap" }, [
    el("label", { class: "canva-search" }, [
      el("span", { class: "sr", text: t("buscar") }),
      svgIcon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5"]),
      el("input", {
        id: "buscar",
        type: "search",
        value: state.filters.text,
        placeholder: wideDesk() ? (ctx.lang === "en" ? "Search the templates" : "Busca entre las plantillas") : t("buscaPlantillas"),
        autocomplete: "off",
        "aria-label": t("buscar"),
      }),
      state.filters.text ? button("×", { id: "limpiar-filtros", class: "canva-clear", "aria-label": t("limpiar") }) : null,
    ]),
  ]);
}

function plantillasChips(ctx) {
  const en = ctx.lang === "en";
  return el("div", { class: "tpl-chips", role: "group", "aria-label": ctx.t("tema") }, THUMB_GROUPS.map((group) => {
    const node = button("", {
      class: "tpl-chip canva-plain",
      "data-grupo": group.id,
      "aria-pressed": ctx.state.grupo === group.id ? "true" : "false",
    });
    node.append(svgIcon([CHIP_ICON[group.id] || "M4 4h16v16H4z"]), el("span", { text: en ? group.en : group.es }));
    return node;
  }));
}

function glancePicks(ctx, pool) {
  const picks = [];
  for (const [id] of glanceList(ctx)) {
    const samples = pool.filter((item) => item.category === id);
    const sample = samples.find((item) => item.vivid) || samples[0];
    if (sample) picks.push(sample);
  }
  return picks;
}

function glanceSection(ctx, picks) {
  const en = ctx.lang === "en";
  const chosen = new Map();
  for (const item of picks || []) {
    if (item && !chosen.has(item.category)) chosen.set(item.category, item);
  }
  const grid = el("div", { class: "tpl-glance" });
  glanceList(ctx).forEach(([id, es, labelEn], index) => {
    const sample = chosen.get(id);
    if (!sample?.file) return;
    const node = button("", {
      class: "tpl-tile canva-plain",
      "data-go": "plantillas",
      "data-thumb-cat": id,
      "aria-pressed": ctx.state.thumbCat === id ? "true" : "false",
    });
    node.append(
      el("span", { class: "tpl-tile-face", style: `background:${GLANCE_WASH[index % GLANCE_WASH.length]}` }, [
        el("img", { src: studioAsset(sample.file), alt: "", loading: "lazy", decoding: "async" }),
      ]),
      el("span", { class: "tpl-tile-label", text: en ? labelEn : es }),
    );
    grid.append(node);
  });
  if (!grid.childElementCount) return null;
  return el("section", { class: "canva-section", "data-section": "vistazo" }, [
    canvaHead(ctx.t("echaVistazo")),
    el("div", { class: "tpl-glance-wrap" }, [grid, arrowButton(ctx.t("siguiente"), "next")]),
  ]);
}

function railSection(ctx, title, items, sectionId, width) {
  if (!items.length) return null;
  const row = el("div", { class: `tpl-rail-row ${width || ""}`.trim() });
  for (const item of items) row.append(previewCard(item, ctx, "tpl-rail-card"));
  const kids = [row];
  if (items.length > 1) {
    kids.push(arrowButton(ctx.t("anterior"), "prev"), arrowButton(ctx.t("siguiente"), "next"));
  }
  return el("section", { class: "canva-section", "data-section": sectionId }, [
    canvaHead(title),
    el("div", { class: "tpl-rail-wrap" }, kids),
  ]);
}

function leadFeed(items) {
  const feed = [];
  const other = [];
  for (const item of items) (item.feed ? feed : other).push(item);
  return feed.length ? [...feed, ...other] : items;
}

function masonrySection(ctx, title, items) {
  if (!items.length) return null;
  return el("section", { class: "canva-section", "data-section": "mas" }, [
    canvaHead(title),
    el("div", { class: "tpl-masonry" }, masonryOrder(leadFeed(items)).map((item) => previewCard(item, ctx))),
  ]);
}

function plantillasHub(ctx) {
  const pool = plantillasPool(ctx);
  const used = new Set();
  const freshPool = () => pool.filter((item) => item?.file && !used.has(item.id) && !used.has(item.file));
  const take = (list) => {
    const fresh = [];
    for (const item of list) {
      if (!item?.file || used.has(item.id) || used.has(item.file)) continue;
      used.add(item.id);
      used.add(item.file);
      fresh.push(item);
    }
    return fresh;
  };
  const glance = take(glancePicks(ctx, freshPool()));
  const eventos = take(mixCats(freshPool(), ["invitacion", "flyer", "cartel"], 8));
  const inspirado = take(mixCats(freshPool(), ["post-instagram", "story", "logo", "tarjeta-visita"], 8));
  const descubre = take(mixCats(freshPool(), ["portada", "video", "cartel", "story", "sitio-web", "post-instagram"], 6));
  const tendencias = take(mixCats(freshPool(), ["presentacion", "informe", "negocio", "propuesta", "documento"], 6));
  const destacados = take(mixCats(freshPool(), ["miniatura-youtube", "infografia", "curriculum", "pizarra", "portada", "video"], 6));
  const rest = freshPool();
  return el("div", { class: "canva-feed tpl-feed" }, [
    glanceSection(ctx, glance),
    railSection(ctx, ctx.t("proximosEventos"), eventos, "eventos", "is-wide"),
    railSection(ctx, ctx.t("inspirado"), inspirado, "inspirado", "is-pair"),
    railSection(ctx, ctx.t("descubre"), descubre, "descubre", "is-hero"),
    railSection(ctx, ctx.t("tendencias"), tendencias, "tendencias", "is-feature"),
    railSection(ctx, ctx.t("destacados"), destacados, "destacados", "is-wide"),
    masonrySection(ctx, ctx.t("masPlantillas"), rest),
  ]);
}

function plantillasResults(ctx) {
  const q = ctx.state.filters.text.trim().toLowerCase();
  const allow = ctx.state.grupo
    ? new Set(THUMB_GROUPS.find((group) => group.id === ctx.state.grupo)?.cats || [])
    : null;
  const items = plantillasPool({ ...ctx, state: { ...ctx.state, grupo: "" } }).filter((item) => {
    if (allow && !allow.has(item.category)) return false;
    const cat = THUMB_CATS.find((entry) => entry.id === item.category);
    const blob = `${item.title} ${item.titleEn || ""} ${item.category} ${cat?.es || ""} ${cat?.en || ""}`.toLowerCase();
    return blob.includes(q);
  });
  if (!items.length) {
    return el("div", { class: "canva-feed tpl-feed" }, [
      el("p", { id: "vacio-plantillas", class: "canva-empty", text: ctx.t("vacio") }),
    ]);
  }
  return el("div", { class: "canva-feed tpl-feed" }, [
    masonrySection(ctx, ctx.t("plantillas"), items),
  ]);
}

function plantillasCategory(ctx) {
  const cat = THUMB_CATS.find((item) => item.id === ctx.state.thumbCat);
  if (!cat) return plantillasHub(ctx);
  const en = ctx.lang === "en";
  const items = thumbsIn(cat.id).filter((item) => item?.file && item.category !== "meme");
  return el("div", { class: "canva-feed tpl-feed" }, [
    el("section", { class: "canva-section", "data-section": "categoria" }, [
      canvaHead(en ? cat.en : cat.es, seeAll(ctx.t("verTodo"), { "data-go": "plantillas", "data-thumb-cat": "" })),
      items.length
        ? el("div", { class: "tpl-masonry" }, items.map((item) => previewCard(item, ctx)))
        : el("p", { id: "vacio-plantillas", class: "canva-empty", text: ctx.t("vacio") }),
      button(ctx.t("crearBlanco"), { "data-format": cat.format, class: "tpl-blank" }),
    ]),
  ]);
}

function plantillasShell(ctx, body) {
  const node = el("div", { class: "canva-home canva-plantillas", "data-tab": "plantillas" }, [
    desktopRail(ctx, "plantillas"),
    el("div", { class: "desk-only desk-tpl-hero" }, [
      el("h1", { text: ctx.t("hero") }),
      deskPills(ctx, "plantillas"),
    ]),
    plantillasTop(ctx),
    plantillasSearch(ctx),
    plantillasChips(ctx),
    body,
    canvaNav(ctx, "plantillas"),
  ]);
  if (typeof window !== "undefined" && window.scrollY > 12) node.classList.add("is-scrolled");
  return node;
}

function mountScene(scene, className) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${scene.w} ${scene.h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  for (const node of scene.nodes) {
    const shape = document.createElementNS(SVG_NS, node.t);
    for (const [key, value] of Object.entries(node)) {
      if (key === "t" || value == null || value === false) continue;
      shape.setAttribute(key, String(value));
    }
    svg.append(shape);
  }
  return svg;
}

function libraryLocale(lang) {
  return lang === "en" ? "en-US" : "es-ES";
}

function libraryCount(n, lang, one, many) {
  const num = new Intl.NumberFormat(libraryLocale(lang)).format(n);
  return `${num} ${n === 1 ? one : many}`;
}

function backButton(ctx) {
  const node = button("", { class: "lib-back canva-plain", "data-go": "plantillas", "aria-label": ctx.t("volver") });
  const icon = svgIcon(["M15 6l-6 6 6 6"]);
  icon.setAttribute("width", "22");
  icon.setAttribute("height", "22");
  node.append(icon);
  return node;
}

function sheetIcon(paths, size = 22) {
  const icon = svgIcon(paths);
  icon.setAttribute("width", String(size));
  icon.setAttribute("height", String(size));
  for (const node of icon.querySelectorAll("path")) node.setAttribute("stroke-width", "1.6");
  return icon;
}

function librarySheet(ctx) {
  if (!ctx.state.librarySheet) return null;
  const { t } = ctx;
  const current = ctx.viewName() === "plantillas" ? "plantillas" : ctx.viewName();
  const rows = [
    ["plantillas", t("plantillas"), [
      "M6.15 5.15h3.7c.62 0 1.12.5 1.12 1.12v11.46c0 .62-.5 1.12-1.12 1.12h-3.7c-.62 0-1.12-.5-1.12-1.12V6.27c0-.62.5-1.12 1.12-1.12z",
      "M14.15 5.15h3.7c.62 0 1.12.5 1.12 1.12v11.46c0 .62-.5 1.12-1.12 1.12h-3.7c-.62 0-1.12-.5-1.12-1.12V6.27c0-.62.5-1.12 1.12-1.12z",
    ]],
    ["fotos", t("fotos"), [
      "M4.15 7.15h15.7c.7 0 1.25.55 1.25 1.25v8.2c0 .7-.55 1.25-1.25 1.25H4.15c-.7 0-1.25-.55-1.25-1.25v-8.2c0-.7.55-1.25 1.25-1.25z",
      "M16.35 10.2a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3z",
      "M4.55 16.2l3.55-3.4 2.35 2.15 2.85-3.1 5.15 4.35",
    ]],
    ["elementos", t("elementosGraficos"), [
      "M7.35 17.85a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z",
      "M12 4.7l4.25 7.4H7.75L12 4.7z",
      "M14.35 13.05h5.15a.85.85 0 0 1 .85.85v4.3a.85.85 0 0 1-.85.85h-5.15a.85.85 0 0 1-.85-.85v-4.3a.85.85 0 0 1 .85-.85z",
    ]],
    ["favoritos", t("favoritos"), [
      "M12 4.15l1.95 4.2 4.55.45-3.45 3.05 1 4.45L12 14.05l-4.05 2.25 1-4.45-3.45-3.05 4.55-.45z",
    ]],
  ];
  const close = button("", { class: "lib-x canva-plain", "data-sheet-close": "1", "aria-label": t("cerrar") });
  close.append(sheetIcon(["M8 8l8 8", "M16 8l-8 8"], 20));
  const list = el("div", { class: "lib-rows" }, rows.map(([id, label, paths]) => {
    const row = button("", {
      class: "lib-row",
      "data-library": id,
      "aria-current": current === id ? "true" : null,
    });
    row.append(sheetIcon(paths), el("span", { text: label }));
    return row;
  }));
  return el("div", { class: "lib-layer", id: "biblioteca-sheet" }, [
    button("", { class: "lib-overlay", "data-sheet-close": "1", "aria-label": t("cerrar") }),
    el("div", { class: "lib-sheet lib-sheet-nav", role: "dialog", "aria-modal": "true", "aria-label": t("plantillas") }, [
      el("span", { class: "lib-grab", "aria-hidden": "true" }),
      el("div", { class: "lib-sheet-head" }, [
        el("h2", { text: t("plantillas") }),
        close,
      ]),
      list,
    ]),
  ]);
}

function filterSheet(ctx) {
  if (!ctx.state.filterSheet) return null;
  const { t, state } = ctx;
  const draft = state.priceDraft ?? state.priceFilter ?? "";
  const options = [
    ["", t("gratisYPro")],
    ["pro", t("pro")],
    ["gratis", t("gratis")],
  ];
  const close = button("", { class: "lib-x canva-plain", "data-sheet-close": "1", "aria-label": t("cerrar") });
  close.append(svgIcon(["M7 7l10 10", "M17 7L7 17"]));
  return el("div", { class: "lib-layer", id: "filtros-sheet" }, [
    button("", { class: "lib-overlay", "data-sheet-close": "1", "aria-label": t("cerrar") }),
    el("div", { class: "lib-sheet lib-sheet-filter", role: "dialog", "aria-modal": "true", "aria-label": t("filtros") }, [
      el("div", { class: "lib-sheet-head" }, [el("h2", { text: t("precio") }), close]),
      el("div", { class: "lib-price", role: "radiogroup", "aria-label": t("precio") }, options.map(([value, label]) => button(label, {
        class: "lib-price-opt",
        "data-price-pick": value,
        "aria-pressed": draft === value ? "true" : "false",
      }))),
      button(t("aplicarFiltros"), { class: "lib-apply", "data-price-apply": "1" }),
    ]),
  ]);
}

function viewSheet(ctx) {
  if (!ctx.state.viewSheet) return null;
  const { t, state } = ctx;
  const close = button("", { class: "lib-x canva-plain", "data-sheet-close": "1", "aria-label": t("cerrar") });
  close.append(svgIcon(["M7 7l10 10", "M17 7L7 17"]));
  return el("div", { class: "lib-layer" }, [
    button("", { class: "lib-overlay", "data-sheet-close": "1", "aria-label": t("cerrar") }),
    el("div", { class: "lib-sheet", role: "dialog", "aria-modal": "true", "aria-label": t("verCuadricula") }, [
      el("div", { class: "lib-sheet-head" }, [el("h2", { text: t("favoritos") }), close]),
      button(t("verCuadricula"), {
        class: "lib-row",
        "data-fav-layout": "grid",
        "aria-pressed": state.favLayout === "grid" ? "true" : "false",
      }),
      button(t("verLista"), {
        class: "lib-row",
        "data-fav-layout": "list",
        "aria-pressed": state.favLayout === "list" ? "true" : "false",
      }),
    ]),
  ]);
}

function libraryLayers(ctx) {
  return librarySheet(ctx) || filterSheet(ctx) || viewSheet(ctx);
}

function assetMenu(ctx, item) {
  const saved = (ctx.state.favs || []).includes(item.id);
  return moreMenu(ctx.t("masOpciones"), [
    button(saved ? ctx.t("quitarFavorito") : ctx.t("anadirFavorito"), { "data-fav": item.id }),
  ]);
}

function assetFace(item, className) {
  const face = el("span", { class: className || "lib-face", style: `aspect-ratio:${item.scene.w} / ${item.scene.h}` });
  face.append(mountScene(item.scene));
  return face;
}

function splitColumns(cards) {
  const left = el("div", { class: "lib-col" });
  const right = el("div", { class: "lib-col" });
  cards.forEach((card, index) => (index % 2 === 0 ? left : right).append(card));
  return el("div", { class: "lib-masonry" }, [left, right]);
}

function generateTile(ctx, kind) {
  const node = button("", {
    class: "lib-generate canva-plain",
    "data-generate": kind,
    "data-go": "ia",
    "aria-label": kind === "elementos" ? ctx.t("generarElemento") : ctx.t("generarImagen"),
  });
  const icon = el("span", { class: "lib-generate-icon", "aria-hidden": "true" });
  icon.append(svgIcon(["M5 7h10v9H5z", "M8 13l2-2 2 2 2-3", "M16 5l.7 2.1L19 8l-2.3.7L16 11l-.7-2.3L13 8l2.3-.9z"]));
  node.append(icon, el("span", { class: "lib-generate-label", text: kind === "elementos" ? ctx.t("generarElemento") : ctx.t("generarImagen") }));
  return node;
}

function photoCard(ctx, item) {
  const open = button("", {
    class: "lib-open canva-plain",
    "data-asset": item.id,
    "aria-label": ctx.lang === "en" ? item.en : item.es,
  });
  if (item.file) open.append(el("img", { src: studioAsset(item.file), alt: "", class: "lib-file" }));
  else open.append(assetFace(item));
  return el("article", { class: "lib-card" }, [open, assetMenu(ctx, item)]);
}

function elementCard(ctx, item) {
  const open = button("", {
    class: "lib-open canva-plain",
    "data-asset": item.id,
    "aria-label": ctx.lang === "en" ? item.en : item.es,
  });
  if (item.file) open.append(el("img", { src: studioAsset(item.file), alt: "", class: "lib-file" }));
  else if (item.scene) {
    const box = el("span", { class: "lib-box" });
    box.append(mountScene(item.scene, "lib-glyph"));
    open.append(box);
  } else open.append(el("span", { class: "lib-box", style: `background:${item.fill || "#102032"}` }));
  return el("article", { class: "lib-card lib-element" }, [open, assetMenu(ctx, item)]);
}

function topicChips(ctx, topics) {
  const en = ctx.lang === "en";
  return el("div", { class: "tpl-chips lib-chips", role: "group", "aria-label": ctx.t("tema") }, topics.map((topic) => button(en ? topic.en : topic.es, {
    class: "tpl-chip canva-plain",
    "data-topic": topic.id,
    "aria-pressed": ctx.state.libraryTopic === topic.id ? "true" : "false",
  })));
}

function exploreRow(ctx, title, countText, countN) {
  const filters = button("", { class: "lib-filters canva-plain", "data-price-open": "1" });
  filters.append(svgIcon(["M4 6h16", "M7 12h10", "M10 18h4"]), el("span", { text: ctx.t("filtros") }));
  return el("div", { class: "lib-explore" }, [
    el("h2", { text: title }),
    el("div", { class: "lib-explore-bar" }, [
      filters,
      el("p", { class: "lib-count", "data-library-count": String(countN), text: countText }),
    ]),
  ]);
}

function librarySearch(ctx, placeholder) {
  const { t, state } = ctx;
  return el("header", { class: "lib-chrome" }, [
    backButton(ctx),
    el("label", { class: "canva-search lib-search" }, [
      el("span", { class: "sr", text: t("buscar") }),
      svgIcon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5"]),
      el("input", {
        id: "buscar",
        type: "search",
        value: state.libraryQuery || "",
        placeholder,
        autocomplete: "off",
        "aria-label": t("buscar"),
      }),
      state.libraryQuery ? button("×", { id: "limpiar-biblioteca", class: "canva-clear", "aria-label": t("limpiar") }) : null,
    ]),
  ]);
}

function heroBanner(title, tone, scenes) {
  const art = el("div", { class: "lib-hero-art", "aria-hidden": "true" });
  for (const item of scenes) {
    const frame = el("span", { class: "lib-hero-shot" });
    frame.append(mountScene(item.scene));
    art.append(frame);
  }
  return el("section", { class: `lib-hero is-${tone}` }, [
    el("h2", { class: "lib-hero-title", text: title }),
    art,
  ]);
}

function fileInventory(kind) {
  if (kind === "fotos") {
    return listPhotos().map((item) => ({
      id: item.id,
      kind: "foto",
      topic: "archivo",
      es: item.nombre?.es || item.id,
      en: item.nombre?.en || item.id,
      tags: [...(item.etiquetas || []), item.id, "cc0"],
      premium: false,
      file: item.archivo,
    }));
  }
  return catalog.items
    .filter((item) => item.tipo === "avatar" || item.tipo === "fondo")
    .map((item) => ({
      id: item.id,
      kind: "elemento",
      topic: item.tipo,
      es: item.nombre?.es || item.id,
      en: item.nombre?.en || item.id,
      tags: [item.tipo, item.id],
      premium: false,
      file: item.archivo || "",
    }));
}

function browseBody(ctx, kind) {
  const { lang, state, t } = ctx;
  const en = lang === "en";
  const source = (kind === "elementos" ? browseElements() : browsePhotos()).concat(fileInventory(kind));
  const topics = kind === "elementos" ? elementTopics() : photoTopics();
  const items = filterBrowse(source, {
    query: state.libraryQuery || "",
    topic: state.libraryTopic || "",
    price: state.priceFilter || "",
  });
  const searching = Boolean((state.libraryQuery || "").trim());
  const cards = items.map((item) => (kind === "elementos" ? elementCard(ctx, item) : photoCard(ctx, item)));
  if (!searching) cards.unshift(generateTile(ctx, kind));
  const grid = kind === "elementos"
    ? el("div", { class: "lib-grid" }, cards)
    : splitColumns(cards);
  if (searching) {
    return el("div", { class: "lib-feed" }, [
      items.length ? grid : el("p", { class: "canva-empty", text: t("vacioBiblioteca") }),
    ]);
  }
  const count = libraryCount(
    items.length,
    lang,
    kind === "elementos" ? (en ? "graphic element" : "elemento gráfico") : (en ? "photo" : "foto"),
    kind === "elementos" ? (en ? "graphic elements" : "elementos gráficos") : (en ? "photos" : "fotos"),
  );
  const sampleA = source.find((item) => item.topic === (kind === "elementos" ? "formas" : "flores"));
  const sampleB = source.find((item) => item.topic === (kind === "elementos" ? "ondas" : "campo"));
  return el("div", { class: "lib-feed" }, [
    heroBanner(
      kind === "elementos" ? t("elementosLlamativos") : t("fotosPerfectas"),
      kind === "elementos" ? "blue" : "green",
      [sampleA, sampleB].filter(Boolean),
    ),
    topicChips(ctx, topics),
    exploreRow(ctx, kind === "elementos" ? t("descubreElementos") : t("explorarFotos"), count, items.length),
    grid,
  ]);
}

function favoritesChrome(ctx) {
  const more = button("", { class: "lib-back canva-plain", "data-view-sheet": "1", "aria-label": ctx.t("masOpciones") });
  more.append(dotsIcon());
  return el("header", { class: "lib-chrome lib-chrome-center" }, [
    backButton(ctx),
    el("h1", { text: ctx.t("favoritos") }),
    more,
  ]);
}

function favoritesBody(ctx) {
  const { t, state } = ctx;
  const saved = (state.favs || []).map((id) => browseAsset(id) || fileInventory("fotos").concat(fileInventory("elementos")).find((item) => item.id === id)).filter(Boolean);
  const bar = button("", { class: "lib-viewbar", "data-view-sheet": "1" });
  bar.append(svgIcon(["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"]), el("span", { text: t("verCuadricula") }));
  if (!saved.length) {
    const art = el("div", { class: "lib-empty-art", "aria-hidden": "true" });
    art.append(mountScene(emptyFolderScene()));
    return el("div", { class: "lib-feed lib-empty" }, [
      art,
      el("h2", { text: t("favVacioTitulo") }),
      el("p", { text: t("favVacioCuerpo") }),
      bar,
    ]);
  }
  const cards = saved.map((item) => (item.kind === "elemento" ? elementCard(ctx, item) : photoCard(ctx, item)));
  const grid = state.favLayout === "list" ? el("div", { class: "lib-grid is-list" }, cards) : el("div", { class: "lib-grid" }, cards);
  return el("div", { class: "lib-feed" }, [grid, bar]);
}

function mountLibrary(ctx, chrome, body) {
  const view = ctx.viewName();
  const node = el("div", {
    class: `canva-home canva-plantillas canva-library is-${view}`,
    "data-tab": "plantillas",
    "data-library": view,
  }, [desktopRail(ctx, "plantillas"), chrome, body, canvaNav(ctx, "plantillas")]);
  if (typeof window !== "undefined" && window.scrollY > 12) node.classList.add("is-scrolled");
  const kids = [node, sizeDialog(ctx)];
  const layer = libraryLayers(ctx);
  if (layer) kids.push(layer);
  ctx.root.replaceChildren(...kids);
}

export function renderLibrary(ctx) {
  const view = ctx.viewName();
  if (view === "favoritos") {
    mountLibrary(ctx, favoritesChrome(ctx), favoritesBody(ctx));
    return;
  }
  const placeholder = view === "elementos" ? ctx.t("buscaElementos") : ctx.t("buscaFotosCalidad");
  const body = browseBody(ctx, view === "elementos" ? "elementos" : "fotos");
  mountLibrary(ctx, librarySearch(ctx, placeholder), body);
}

export function renderPlantillas(ctx) {
  const q = ctx.state.filters.text.trim();
  const body = q ? plantillasResults(ctx) : ctx.state.thumbCat ? plantillasCategory(ctx) : plantillasHub(ctx);
  const kids = [plantillasShell(ctx, body), sizeDialog(ctx)];
  const layer = libraryLayers(ctx);
  if (layer) kids.push(layer);
  ctx.root.replaceChildren(...kids);
}

export function renderDesigns(ctx) {
  const { screen, sheet } = designView(ctx);
  screen.classList.add("has-sub");
  screen.prepend(desktopRail(ctx, "disenos"), designsSub(ctx));
  screen.append(canvaNav(ctx, "disenos"));
  ctx.root.replaceChildren(screen, ...(sheet ? [sheet] : []));
}

export function renderMarca(ctx) {
  const { root, t, lang } = ctx;
  const colors = [["#FF3070", t("rosa")], ["#FFF8EC", t("crema")], ["#102032", t("azul")]];
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main" }, [
      el("h1", { class: "hero-titulo", text: t("marca") }),
      el("p", { text: t("kit") }),
      el("div", { class: "rejilla-plantillas" }, ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"].map((id) => {
        const item = catalogItem(id);
        const label = item.nombre[lang] || item.nombre.es;
        const node = button("", { class: "marca-card", "data-asset": id, "aria-label": label });
        node.append(el("img", { src: studioAsset(item.archivo), alt: "" }), el("span", { text: label }));
        return node;
      })),
      el("div", { class: "chips" }, colors.map(([hex, label]) => el("span", { class: "muestra", style: swatchStyle(hex), text: label }))),
      el("p", {}, [el("a", { href: "/marca/", text: t("verMarca") })]),
    ])),
  );
}

export function renderRecursos(ctx) {
  const { root, t, lang } = ctx;
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main" }, [
      el("h1", { class: "hero-titulo", text: t("recursos") }),
      el("p", { class: "nota", text: t("tamanosNota") }),
      el("div", { class: "crear-grid" }, PRESETS.map((item) => button(`${item[lang] || item.es} ${item.width}×${item.height}`, { "data-format": item.id, class: "preset" }))),
      el("p", {}, [el("a", { href: "/studio/reglas/", text: "Reglas y recursos" })]),
    ])),
  );
}

export function layerStyle(layer) {
  const fx = layer.flipX ? -1 : 1;
  const fy = layer.flipY ? -1 : 1;
  const origin = layer.type === "line" ? "transform-origin:0 50%;" : "";
  return `left:${layer.x}px;top:${layer.y}px;width:${layer.w}px;height:${layer.h}px;${origin}transform:rotate(${layer.rotation || 0}deg) scale(${fx}, ${fy});opacity:${layer.opacity ?? 1};z-index:${layer.z};`;
}

function textBlock(layer, editing) {
  const props = layer.props;
  const node = el("p", {
    class: "capa-texto",
    "data-edit": editing ? layer.id : null,
    contenteditable: editing ? "true" : null,
    role: editing ? "textbox" : null,
    "aria-label": editing ? layer.name : null,
    spellcheck: "false",
  });
  node.style.fontFamily = fontById(props.fontId).css;
  node.style.fontSize = `${props.size}px`;
  node.style.color = props.color;
  node.style.textAlign = props.align;
  node.style.lineHeight = String(props.lineHeight);
  node.style.letterSpacing = `${props.letterSpacing || 0}px`;
  node.style.fontWeight = props.bold ? "700" : "400";
  node.style.fontStyle = props.italic ? "italic" : "normal";
  const decoration = [props.underline ? "underline" : "", props.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none";
  node.style.textDecoration = decoration;
  if (props.textCase === "upper") node.style.textTransform = "uppercase";
  else if (props.textCase === "lower") node.style.textTransform = "lowercase";
  else if (props.textCase === "title") node.style.textTransform = "capitalize";
  if (props.effect) node.classList.add(`fx-${props.effect}`);
  const parts = piecesOf(props.text, props.runs, props);
  const listed = !editing && parts.length <= 1 && (props.list === "bullet" || props.list === "number")
    ? String(props.text || "").split("\n").map((line, index) => (props.list === "number" ? `${index + 1}. ${line}` : `• ${line}`)).join("\n")
    : props.text;
  if (parts.length <= 1) node.textContent = listed;
  else {
    for (const part of parts) {
      const span = el("span", { text: part.text });
      span.style.fontWeight = part.bold ? "700" : "400";
      span.style.fontStyle = part.italic ? "italic" : "normal";
      span.style.textDecoration = [part.underline ? "underline" : "", props.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none";
      span.style.color = part.color;
      span.style.fontSize = `${part.size}px`;
      node.append(span);
    }
  }
  return node;
}

function chartNode(layer) {
  const props = layer.props || {};
  const max = Math.max(1, ...(props.values || [1]));
  const wrap = el("div", { class: "capa-chart", "data-chart": props.chartType || "bar" });
  if (props.chartType === "pie") {
    const total = Math.max(1, (props.values || []).reduce((sum, value) => sum + Number(value || 0), 0));
    let start = 0;
    const stops = (props.values || []).map((value, index) => {
      const sweep = (Number(value || 0) / total) * 100;
      const color = props.colors?.[index] || BRAND.pink;
      const part = `${color} ${start}% ${start + sweep}%`;
      start += sweep;
      return part;
    });
    wrap.style.background = `conic-gradient(${stops.join(",")})`;
    return wrap;
  }
  if (props.chartType === "line") {
    wrap.classList.add("is-line");
    const n = Math.max(1, (props.values || []).length - 1);
    (props.values || []).forEach((value, index) => {
      const dot = el("span", { class: "chart-dot" });
      dot.style.left = `${(index / n) * 100}%`;
      dot.style.bottom = `${(Number(value || 0) / max) * 100}%`;
      dot.style.background = props.colors?.[index] || BRAND.navy;
      wrap.append(dot);
    });
    return wrap;
  }
  (props.values || []).forEach((value, index) => {
    const bar = el("span", { class: "chart-bar" });
    bar.style.height = `${(Number(value || 0) / max) * 100}%`;
    bar.style.background = props.colors?.[index] || BRAND.pink;
    wrap.append(bar);
  });
  return wrap;
}

function tableNode(layer) {
  const props = layer.props || {};
  const table = el("table", { class: "capa-tabla" });
  (props.rows || []).forEach((row, index) => {
    const tr = el("tr", {});
    (Array.isArray(row) ? row : [row]).forEach((cell) => {
      tr.append(el(props.header && index === 0 ? "th" : "td", { text: String(cell ?? "") }));
    });
    table.append(tr);
  });
  return table;
}

function imageNode(ctx, layer) {
  const frameNode = el("div", { class: "capa-img" });
  if (layer.src?.kind === "user" && !ctx.state.userImages.has(layer.src.id)) {
    frameNode.append(el("p", { class: "pendiente", text: ctx.t("pendiente") }));
    return frameNode;
  }
  const img = el("img", { alt: "", draggable: "false" });
  let natural = null;
  if (layer.src?.kind === "catalog") {
    const item = catalogItem(layer.src.id);
    if (item?.archivo) {
      img.src = studioAsset(item.archivo);
      natural = item.width && item.height ? { w: item.width, h: item.height } : null;
    } else {
      const asset = browseAsset(layer.src.id);
      if (asset?.scene) {
        frameNode.append(mountScene(asset.scene, "capa-escena"));
        return frameNode;
      }
    }
  } else if (layer.src?.kind === "library") {
    img.src = studioAsset(`photos/${layer.src.id}.png`);
    natural = { w: 640, h: 480 };
  } else if (layer.src?.kind === "user") {
    const image = ctx.state.userImages.get(layer.src.id);
    if (image) {
      img.src = ctx.userUrl(layer.src.id, image);
      natural = { w: image.width, h: image.height };
    }
  }
  if (layer.crop && natural) {
    const scale = Math.max(layer.w / layer.crop.w, layer.h / layer.crop.h);
    img.style.width = `${natural.w * scale}px`;
    img.style.height = `${natural.h * scale}px`;
    img.style.marginLeft = `${-layer.crop.x * scale}px`;
    img.style.marginTop = `${-layer.crop.y * scale}px`;
  } else {
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
  }
  frameNode.append(img);
  return frameNode;
}

function stageNode(ctx) {
  const { state } = ctx;
  const doc = state.doc;
  const shell = shellOf(doc);
  const scroll = el("div", { class: `stage-scroll${shell === "whiteboard" ? " lienzo-pizarra" : ""}`, id: shell === "whiteboard" ? "lienzo-pizarra" : "lienzo" });
  const frameNode = el("div", { class: "stage-frame" });
  const art = el("div", { class: `stage-art${state.grid ? " cuadricula" : ""}${state.guides ? " guias" : ""}` });
  art.style.width = `${doc.format.width}px`;
  art.style.height = `${doc.format.height}px`;
  art.style.background = doc.background.fill || BRAND.cream;
  if (state.zoom === "100") state.scale = 1;
  else if (!state.scale) state.scale = 1;
  frameNode.style.width = `${Math.round(doc.format.width * state.scale)}px`;
  frameNode.style.height = `${Math.round(doc.format.height * state.scale)}px`;
  art.style.transform = `scale(${state.scale})`;
  for (const layer of orderedLayers(doc)) {
    const node = el("div", {
      class: `capa${state.selected.includes(layer.id) ? " seleccionada" : ""}${layer.locked ? " bloqueada" : ""}${layer.anim ? ` anim-${layer.anim}` : ""}`,
      "data-id": layer.id,
      style: layerStyle(layer),
    });
    if (layer.visible === false) node.style.visibility = "hidden";
    if (layer.type === "text") node.append(textBlock(layer, state.editingId === layer.id));
    else if (layer.type === "image") node.append(imageNode(ctx, layer));
    else if (layer.type === "chart") node.append(chartNode(layer));
    else if (layer.type === "table") node.append(tableNode(layer));
    else if (layer.type === "line") {
      const bar = el("div", { class: "capa-linea" });
      bar.style.background = layer.props.color;
      bar.style.height = `${Math.max(2, layer.props.strokeWidth || layer.h)}px`;
      node.append(bar);
    } else {
      const shape = el("div", { class: `capa-forma${layer.props.shape === "ellipse" ? " elipse" : ""}` });
      if (layer.props.fill) shape.style.background = layer.props.fill;
      if (layer.props.stroke && layer.props.strokeWidth) shape.style.border = `${layer.props.strokeWidth}px solid ${layer.props.stroke}`;
      node.append(shape);
    }
    if (state.cropping && layer.type === "image" && state.selected.includes(layer.id)) {
      node.append(el("div", { class: "recorte-visual" }, ["move", "n", "e", "s", "w"].map((edge) => button("", {
        class: `asa-recorte ${edge}`,
        "data-crop-edge": edge,
        "aria-label": edge === "move" ? "Mover recorte" : `Recorte ${edge}`,
      }))));
    }
    if (state.selected.includes(layer.id) && !layer.locked) {
      for (const corner of ["nw", "ne", "sw", "se"]) {
        node.append(el("span", { class: `asa asa-${corner}`, "data-resize": corner === "se" ? layer.id : null }));
      }
      node.append(el("span", { class: "asa-giro", "data-rotate": layer.id, "aria-hidden": "true" }));
    }
    art.append(node);
  }
  frameNode.append(art);
  if (doc.format.id === "trifold") {
    frameNode.append(el("div", { class: "guias-pliegue", "aria-hidden": "true" }, [
      el("span", { class: "guia", style: "left:33.33%" }),
      el("span", { class: "guia", style: "left:66.66%" }),
    ]));
  }
  if (shell === "whiteboard") {
    const field = el("div", { class: "campo-pizarra" });
    field.append(frameNode);
    scroll.append(field);
  } else scroll.append(frameNode);
  return scroll;
}

const STRIP = [
  ["ia", "Textos rápidos", "Quick text", null],
  ["plantillas", "Plantillas", "Templates", ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"]],
  ["elementos", "Elementos", "Elements", ["M5 5h6v6H5z", "M13 8h6", "M13 12h6", "M13 16h4", "M5 14h6v5H5z"]],
  ["texto", "Texto", "Text", ["M5 6h14", "M12 6v12", "M8 18h8"]],
  ["marca", "Marca", "Brand", ["M12 3l2.2 5.2L20 9l-4 3.6.8 5.4L12 15.4 7.2 18l.8-5.4L4 9l5.8-.8z"]],
  ["subidos", "Subidos", "Uploads", ["M12 16V6", "M8 9l4-4 4 4", "M5 19h14"]],
  ["herramientas", "Herramientas", "Tools", ["M4 16l8-8 4 4-8 8H4z", "M14 6l4 4"]],
  ["proyectos", "Proyectos", "Projects", ["M4 7h6l2 2h8v10H4z"]],
  ["apps", "Apps", "Apps", ["M5 5h6v6H5z", "M13 5h6v6h-6z", "M5 13h6v6H5z", "M13 13h6v6h-6z"]],
];

const APP_RAILS = new Set(["apps", "fotos", "graficos", "fondo", "formas", "capas", "notas"]);

function rail(ctx) {
  const { state, t, lang } = ctx;
  const textQuiet = primary(state)?.type === "text" && !state.panelOpen;
  return el("nav", { class: "riel canva-strip", role: "tablist", "aria-label": t("herramientas") }, STRIP.map(([id, es, en, paths]) => {
    const label = lang === "en" ? en : es;
    const selected = textQuiet ? id === "texto" : (id === "apps" ? APP_RAILS.has(state.rail) : state.rail === id);
    const node = button("", {
      class: "strip-btn",
      "data-rail": id,
      role: "tab",
      "aria-selected": selected ? "true" : "false",
      "aria-label": label,
    });
    if (id === "ia") node.append(el("img", { class: "strip-octo", src: studioAsset("assets/orvupi-avatar.png"), alt: "" }));
    else node.append(svgIcon(paths));
    node.append(el("span", { text: label }));
    return node;
  }));
}

function chartSheet(layer, lang) {
  const labels = layer?.props?.labels || [];
  const values = layer?.props?.values || [];
  const en = lang === "en";
  const rows = labels.map((label, index) => el("tr", {}, [
    el("td", {}, [el("input", {
      "data-chart-row": String(index),
      "data-chart-field": "label",
      value: String(label),
      "aria-label": en ? `Label ${index + 1}` : `Etiqueta ${index + 1}`,
    })]),
    el("td", {}, [el("input", {
      "data-chart-row": String(index),
      "data-chart-field": "value",
      type: "number",
      value: String(values[index] ?? 0),
      "aria-label": en ? `Value ${index + 1}` : `Cantidad ${index + 1}`,
    })]),
  ]));
  return el("div", { class: "datos-vivo" }, [
    el("p", { class: "nota", text: en ? "Edit the table. The chart updates with these numbers." : "Edita la tabla. El gráfico usa estos números." }),
    el("table", {}, [
      el("thead", {}, [el("tr", {}, [
        el("th", { text: en ? "Label" : "Etiqueta" }),
        el("th", { text: en ? "Amount" : "Cantidad" }),
      ])]),
      el("tbody", {}, rows),
    ]),
  ]);
}

function panel(ctx) {
  const { state, t, lang } = ctx;
  const doc = state.doc;
  const shell = shellOf(doc);
  if (state.rail === "apps") {
    const extras = [
      ["fotos", t("fotos")],
      ["graficos", t("graficos")],
      ["formas", t("forma")],
      ["capas", t("capas")],
      ["ia", t("iaOpcional")],
    ];
    if (shell !== "whiteboard") extras.splice(2, 0, ["fondo", t("fondo")]);
    if (shell === "whiteboard") extras.push(["notas", t("notas")]);
    return el("div", { class: "apps-lista" }, [
      el("h2", { text: lang === "en" ? "Apps" : "Apps" }),
      el("p", { class: "nota", text: lang === "en" ? "Open a tool. It stays in this browser." : "Abre una herramienta. Se queda en este navegador." }),
      ...extras.map(([id, label]) => button(label, { "data-rail": id, class: "app-row" })),
    ]);
  }
  if (state.rail === "plantillas" || state.rail === "proyectos") return state.rail === "proyectos" ? el("div", {}, [el("p", { text: t("soloAqui") }), button(t("disenos"), { "data-go": "disenos" })]) : catalogBody(ctx);
  if (state.rail === "elementos" || state.rail === "formas") {
    return el("div", { class: "rejilla" }, [
      button(t("forma"), { "data-add": "rect" }),
      button(t("circulo"), { "data-add": "ellipse" }),
      button(t("linea"), { "data-add": "line" }),
    ]);
  }
  if (state.rail === "texto") {
    return el("div", { class: "rejilla" }, [
      button(t("titulo"), { "data-add": "titulo" }),
      button(t("cuerpo"), { "data-add": "cuerpo" }),
      button(t("anadirTexto"), { "data-add": "texto" }),
    ]);
  }
  if (state.rail === "marca") {
    const colors = [["#FF3070", t("rosa")], ["#FFF8EC", t("crema")], ["#102032", t("azul")]];
    return el("div", {}, [
      el("p", { text: t("kit") }),
      el("p", {}, [el("a", { href: "/marca/", text: t("verMarca") })]),
      el("div", { class: "rejilla" }, ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"].map((id) => {
        const item = catalogItem(id);
        const control = button("", { "data-avatar": id, class: "marca-pulpo" });
        control.append(el("img", { src: studioAsset(item.archivo), alt: item.nombre[lang] || item.nombre.es, width: "96", height: "96" }), el("span", { text: item.nombre[lang] || item.nombre.es }));
        return el("div", { class: "asset-open" }, [
          control,
          button(lang === "en" ? "Open" : "Abrir", { "data-asset": id }),
        ]);
      })),
      el("div", { class: "chips" }, colors.map(([hex, key]) => button(key, { "data-color": hex, style: swatchStyle(hex) }))),
      el("div", { class: "rejilla" }, FONTS.map((font) => button(font[lang] || font.es, { "data-font": font.id, style: `font-family:${font.css}` }))),
    ]);
  }
  if (state.rail === "subidos") {
    const uploaded = doc.layers.filter((layer) => layer.src?.kind === "user");
    return el("div", {}, [
      el("div", { id: "hueco-subida" }),
      el("p", { text: t("sinSubidas") }),
      button(t("subir"), { id: "subir-imagen" }),
      uploaded.length ? el("ul", {}, uploaded.map((layer) => el("li", {}, [button(layer.name, { "data-pick": layer.id })]))) : null,
    ]);
  }
  if (state.rail === "fotos") {
    const photos = listPhotos(state.photoQuery || "", lang);
    const uploaded = doc.layers.filter((layer) => layer.src?.kind === "user");
    return el("div", { class: "panel-fotos" }, [
      el("p", { text: t("fotosNota") }),
      el("p", { class: "nota", text: PHOTO_LICENSE_NOTE[lang] || PHOTO_LICENSE_NOTE.es }),
      el("label", { class: "buscar-wrap", for: "buscar-fotos" }, [
        el("span", { class: "sr", text: t("buscarFotos") }),
        el("input", { id: "buscar-fotos", type: "search", value: state.photoQuery || "", placeholder: t("buscarFotos"), autocomplete: "off" }),
      ]),
      el("div", { class: "rejilla fotos-rejilla" }, photos.map((item) => {
        const control = button("", { "data-photo": item.id, class: "foto-card" });
        control.append(
          el("img", { src: studioAsset(item.archivo), alt: item.nombre[lang] || item.nombre.es, loading: "lazy", decoding: "async" }),
          el("span", { text: item.nombre[lang] || item.nombre.es }),
          el("small", { text: `${t("licenciaFoto")}: CC0` }),
        );
        return el("div", { class: "asset-open" }, [
          control,
          button(lang === "en" ? "Open" : "Abrir", { "data-asset": item.id }),
          button(lang === "en" ? "Set as background" : "Al fondo", { "data-photo-bg": item.id }),
        ]);
      })),
      el("div", { id: "hueco-subida" }),
      button(t("subir"), { id: "subir-imagen" }),
      uploaded.length ? el("ul", {}, uploaded.map((layer) => el("li", {}, [button(layer.name, { "data-pick": layer.id })]))) : null,
    ]);
  }
  if (state.rail === "graficos" || state.rail === "datos") {
    const selected = primary(state);
    const dataEditor = selected?.type === "chart"
      ? (state.inspectorOpen ? null : chartSheet(selected, lang))
      : selected?.type === "table"
        ? el("label", { text: t("editarTabla") }, [el("textarea", { id: "datos-tabla", text: tablePlainText(selected.props) })])
        : null;
    return el("div", {}, [
      el("p", { text: t("graficosNota") }),
      el("div", { class: "rejilla" }, [
        button(t("graficoBarras"), { "data-add": "barra" }),
        button(t("graficoLineas"), { "data-add": "lineas" }),
        button(t("graficoTarta"), { "data-add": "tarta" }),
        button(t("tabla"), { "data-add": "tabla" }),
      ]),
      dataEditor,
    ]);
  }
  if (state.rail === "ia") {
    const copy = aiPanelCopy(lang);
    return el("div", {}, [
      el("h2", { text: copy.title }),
      el("p", { text: copy.body }),
      el("p", { class: "nota", text: copy.off }),
      el("p", { text: copy.phrases }),
      el("div", { class: "chips" }, localPhrases(lang).map((phrase) => button(phrase, { "data-phrase": phrase }))),
    ]);
  }
  if (state.rail === "notas") {
    const comments = Array.isArray(doc.meta?.comments) ? doc.meta.comments : [];
    const history = listHistory(ctx.storage || globalThis.localStorage, doc.id);
    return el("div", {}, [
      el("label", { text: t("notasPizarra") }, [
        el("textarea", { id: "notas-pizarra", text: doc.meta?.note || "" }),
      ]),
      button(t("ampliarPizarra"), { id: "ampliar-pizarra" }),
      button(t("anadirComentario"), { id: "anadir-comentario" }),
      el("ul", { class: "comentarios" }, comments.map((item) => el("li", {}, [
        el("textarea", { "data-comment": item.id, text: item.text || "" }),
      ]))),
      el("h3", { text: t("historial") }),
      el("p", { class: "nota", text: HISTORY_COST[lang] || HISTORY_COST.es }),
      el("p", { class: "nota", text: t("colaboracionNota") }),
      button(t("guardarHistorial"), { id: "guardar-historial" }),
      el("ul", {}, history.map((item) => el("li", {}, [
        button(`${item.at.slice(0, 19)} · r${item.revision}`, { "data-history": item.id }),
      ]))),
      state.historyNote ? el("p", { text: state.historyNote }) : null,
    ]);
  }
  if (state.rail === "capas") {
    return el("div", {}, [
      el("p", { text: t("capas") }),
      el("p", { class: "nota", text: t("capasNota") }),
    ]);
  }
  if (state.rail === "herramientas") {
    const en = lang === "en";
    const tools = [
      ["select", t("seleccionar")],
      ["draw", t("dibujar")],
      ["erase", en ? "Eraser" : "Borrador"],
      ["rect", t("forma")],
      ["line", t("linea")],
      ["text", t("anadirTexto")],
    ];
    return el("div", {}, [
      el("p", { class: "nota", text: en ? "Draw on the page. The eraser removes strokes and shapes." : "Dibuja en la página. El borrador quita trazos y formas." }),
      el("div", { class: "chips" }, tools.map(([id, label]) => button(label, { "data-tool": id, "aria-pressed": state.tool === id ? "true" : "false" }))),
      el("div", { class: "chips" }, ["#102032", "#FF3070", "#7d2ae8", "#0f766e"].map((hex) => button("", {
        "data-draw-color": hex,
        "aria-label": hex,
        "aria-pressed": (state.drawColor || "#102032") === hex ? "true" : "false",
        style: swatchStyle(hex),
      }))),
    ]);
  }
  const fondos = catalog.items.filter((item) => item.tipo === "fondo");
  const current = /^#[0-9a-fA-F]{6}$/.test(doc.background.fill || "") ? doc.background.fill : "#FFF8EC";
  return el("div", {}, [
    el("label", { text: t("colorFondo") }, [el("input", { type: "color", id: "fondo-color", value: current, "aria-label": t("colorFondo") })]),
    el("div", { class: "chips" }, [["#FF3070", t("rosa")], ["#FFF8EC", t("crema")], ["#102032", t("azul")]].map(([hex, key]) => button(key, { "data-fondo": hex, style: swatchStyle(hex) }))),
    el("div", { class: "rejilla" }, fondos.map((item) => el("div", { class: "asset-open" }, [
      button(item.nombre[lang] || item.nombre.es, { "data-fondo-id": item.id }),
      button(lang === "en" ? "Open" : "Abrir", { "data-asset": item.id }),
    ]))),
  ]);
}

function dataPanel(ctx) {
  const { state, t } = ctx;
  const layer = primary(state);
  if (layer?.type === "chart") {
    return el("section", { class: "datos-capa" }, [
      el("h2", { text: t("editarDatos") }),
      chartSheet(layer, ctx.lang),
    ]);
  }
  if (layer?.type === "table") {
    return el("section", { class: "datos-capa" }, [
      el("h2", { text: t("editarTabla") }),
      el("textarea", { id: "datos-tabla", text: tablePlainText(layer.props), "aria-label": t("editarTabla") }),
    ]);
  }
  return null;
}

function positionPanel(ctx) {
  const { state, t } = ctx;
  const layer = primary(state);
  const align = ["left", "center", "right", "top", "middle", "bottom"];
  const alignKey = { left: "izquierda", center: "centro", right: "derecha", top: "arriba", middle: "medio", bottom: "abajo" };
  const fields = layer ? el("div", { class: "medidas" }, ["x", "y", "w", "h"].map((key) => {
    const input = el("input", { id: `medida-${key}`, type: "number", "data-medida": key, value: String(Math.round(layer[key])) });
    return el("label", { text: key.toUpperCase() }, [input]);
  }).concat([
    el("label", { text: t("rotacion") }, [el("input", { id: "medida-rot", type: "number", "data-medida": "rotation", value: String(layer.rotation || 0) })]),
  ])) : el("p", { text: t("posicion") });
  const crop = layer?.type === "image" ? el("div", {}, [
    button(t("cambiar"), { id: "cambiar-imagen" }),
    button(state.cropping ? t("cerrar") : t("recorte"), { id: "modo-recorte", "aria-pressed": state.cropping ? "true" : "false" }),
    el("p", { text: t("recorte") }),
    ...["x", "y", "w", "h"].map((key) => el("label", { text: key }, [el("input", { type: "number", "data-crop": key, value: layer.crop ? String(Math.round(layer.crop[key])) : "" })])),
    button(t("voltearH"), { "data-flip": "x", "aria-pressed": layer.flipX ? "true" : "false" }),
    button(t("voltearV"), { "data-flip": "y", "aria-pressed": layer.flipY ? "true" : "false" }),
  ]) : null;
  const stroke = layer && (layer.type === "rect" || layer.type === "line") ? el("div", { class: "medidas" }, [
    el("label", { text: t("contorno") }, [el("input", { type: "color", id: "contorno-color", value: /^#[0-9a-fA-F]{6}$/.test(layer.props.stroke || layer.props.color || "") ? (layer.props.stroke || layer.props.color) : "#102032", "aria-label": t("contorno") })]),
    el("label", { text: t("grosor") }, [el("input", { id: "grosor", type: "number", min: "0", max: "200", "data-stroke": "width", value: String(Math.round(layer.props.strokeWidth || 0)) })]),
  ]) : null;
  const opacity = layer ? el("label", { text: t("opacidad") }, [el("input", { type: "range", min: "0", max: "1", step: "0.05", "data-opacidad": "1", value: String(layer.opacity ?? 1), "aria-valuemin": "0", "aria-valuemax": "1", "aria-label": t("opacidad") })]) : null;
  const multi = el("div", { class: "chips" }, [
    state.selected.length > 1 ? button(t("agrupar"), { "data-action": "group" }) : null,
    button(t("desagrupar"), { "data-action": "ungroup" }),
    button(t("bloquear"), { "data-action": "lock" }),
    button(t("duplicar"), { "data-action": "duplicate" }),
    button(t("eliminar"), { "data-action": "remove" }),
    state.selected.length > 2 ? button(t("distribuirH"), { "data-distribute": "x" }) : null,
    state.selected.length > 2 ? button(t("distribuirV"), { "data-distribute": "y" }) : null,
  ]);
  const textField = layer?.type === "text" ? el("label", { text: t("texto") }, [
    el("textarea", { id: "texto-capa", text: layer.props.text, "aria-label": t("texto") }),
  ]) : null;
  return el("section", { class: "posicion" }, [
    textField,
    el("h2", { text: t("posicion") }),
    el("div", { class: "chips" }, [
      button(t("alFrente"), { "data-action": "front" }),
      button(t("adelante"), { "data-action": "forward" }),
      button(t("atras"), { "data-action": "backward" }),
      button(t("alFondo"), { "data-action": "back" }),
    ]),
    el("div", { class: "chips" }, align.map((mode) => button(t(alignKey[mode]), { "data-align": mode }))),
    fields,
    opacity,
    stroke,
    crop,
    multi,
  ]);
}

function layersPanel(ctx) {
  const { state, t } = ctx;
  const doc = state.doc;
  const focus = state.selected[0];
  const overlap = state.layerFilter === "overlap" ? new Set([...(focus ? [focus] : []), ...overlappingIds(doc, focus)]) : null;
  const rows = orderedLayers(doc).slice().reverse().filter((layer) => !overlap || overlap.has(layer.id));
  const list = el("ul", { id: "capas" }, rows.map((layer) => el("li", { draggable: "true", "data-layer": layer.id, class: state.selected.includes(layer.id) ? "activa" : "" }, [
    button(layer.visible === false ? t("mostrar") : t("ocultar"), { "data-action": "toggle", "data-id": layer.id }),
    button(layer.name, { "data-pick": layer.id }),
    button(t("bloquear"), { "data-action": "lock-one", "data-id": layer.id, "aria-pressed": layer.locked ? "true" : "false" }),
  ])));
  return el("section", {}, [
    el("h2", { text: t("capas") }),
    el("div", { class: "chips" }, [
      chip(t("todas"), state.layerFilter === "all", { "data-layers": "all" }),
      chip(t("solapadas"), state.layerFilter === "overlap", { "data-layers": "overlap" }),
    ]),
    list,
  ]);
}

function popButton(label, id, open, extra = "") {
  return button(label, { "data-pop": id, class: `tb-pop ${extra}`.trim(), "aria-expanded": open ? "true" : "false" });
}

function iconBtn(label, attrs, paths) {
  const node = button("", { ...attrs, "aria-label": label, class: `${attrs.class || ""} tb-icon`.trim() });
  node.append(paths === "dots" ? dotsIcon() : svgIcon(paths));
  return node;
}

function textBar(ctx) {
  const { state, t, lang } = ctx;
  const shell = shellOf(state.doc);
  const layer = primary(state);
  const textTarget = layer?.type === "text"
    ? layer
    : (!layer && shell === "doc" ? state.doc.layers.find((item) => item.type === "text") : null);
  if (!layer && !textTarget) return null;
  const target = textTarget;
  const en = lang === "en";
  const kids = [];
  if (target) {
    const size = Math.round(target.props.size || 32);
    const font = fontById(target.props.fontId);
    const color = /^#[0-9a-fA-F]{6}$/.test(target.props.color) ? target.props.color : "#102032";
    kids.push(popButton(font ? (font[lang] || font.es) : "Inter", "font", state.pop === "font", "tb-font"));
    if (state.pop === "font") {
      kids.push(el("div", { class: "tb-menu", id: "menu-fuente" }, FONTS.map((item) => button(item[lang] || item.es, {
        "data-font": item.id,
        class: "chip",
        style: `font-family:${item.css}`,
        "aria-pressed": target.props.fontId === item.id ? "true" : "false",
      }))));
    }
    kids.push(el("span", { class: "tb-size" }, [
      button("−", { "data-size": "down", class: "tb-step", "aria-label": t("menos") }),
      el("input", {
        id: "tamano-texto",
        type: "number",
        min: "8",
        max: "400",
        step: "1",
        value: String(size),
        "aria-label": t("tamanoTexto"),
      }),
      button("+", { "data-size": "up", class: "tb-step", "aria-label": t("mas") }),
    ]));
    kids.push(button("A", { "data-pop": "color", class: "tb-a tb-pop", "aria-label": t("color"), "aria-expanded": state.pop === "color" ? "true" : "false", style: `--ink:${color}` }));
    if (state.pop === "color") {
      kids.push(el("div", { class: "tb-menu", id: "menu-color" }, [
        el("input", { type: "color", id: "color-texto", value: color, "aria-label": t("color") }),
        ...["#102032", "#FF3070", "#FFFFFF", "#7d2ae8", "#0f766e", "#F4A261"].map((hex) => button("", {
          "data-color": hex,
          "aria-label": hex,
          style: swatchStyle(hex),
        })),
      ]));
    }
    kids.push(button("B", { "data-style": "bold", class: "tb-mark", "aria-pressed": target.props.bold ? "true" : "false", "aria-label": t("negrita") }));
    kids.push(button("I", { "data-style": "italic", class: "tb-mark is-italic", "aria-pressed": target.props.italic ? "true" : "false", "aria-label": t("cursiva") }));
    kids.push(button("U", { "data-style": "underline", class: "tb-mark is-under", "aria-pressed": target.props.underline ? "true" : "false", "aria-label": en ? "Underline" : "Subrayado" }));
    kids.push(button("S", { "data-style": "strike", class: "tb-mark is-strike", "aria-pressed": target.props.strike ? "true" : "false", "aria-label": en ? "Strikethrough" : "Tachado" }));
    kids.push(button("aA", { "data-case": "cycle", class: "tb-mark tb-case", "aria-label": en ? "Letter case" : "Mayúsculas" }));
    kids.push(iconBtn(en ? "Align" : "Alinear", { "data-pop": "align", class: "tb-pop", "aria-expanded": state.pop === "align" ? "true" : "false" }, ["M4 6h16", "M8 12h8", "M4 18h16"]));
    if (state.pop === "align") {
      kids.push(el("div", { class: "tb-menu", id: "menu-alinear" }, [
        button(t("izquierda"), { "data-text-align": "left", "aria-pressed": target.props.align === "left" ? "true" : "false" }),
        button(t("centro"), { "data-text-align": "center", "aria-pressed": target.props.align === "center" ? "true" : "false" }),
        button(t("derecha"), { "data-text-align": "right", "aria-pressed": target.props.align === "right" ? "true" : "false" }),
      ]));
    }
    kids.push(iconBtn(en ? "List" : "Lista", { "data-pop": "list", class: "tb-pop", "aria-expanded": state.pop === "list" ? "true" : "false" }, ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h.01", "M4 12h.01", "M4 18h.01"]));
    if (state.pop === "list") {
      kids.push(el("div", { class: "tb-menu", id: "menu-lista" }, [
        button(en ? "None" : "Ninguna", { "data-list": "none", "aria-pressed": !target.props.list ? "true" : "false" }),
        button(en ? "Bullets" : "Viñetas", { "data-list": "bullet", "aria-pressed": target.props.list === "bullet" ? "true" : "false" }),
        button(en ? "Numbers" : "Numerada", { "data-list": "number", "aria-pressed": target.props.list === "number" ? "true" : "false" }),
      ]));
    }
    kids.push(iconBtn(en ? "Spacing" : "Espaciado", { "data-pop": "space", class: "tb-pop", "aria-expanded": state.pop === "space" ? "true" : "false" }, ["M8 4v16", "M16 4v16", "M4 8h16", "M4 16h16"]));
    if (state.pop === "space") {
      kids.push(el("div", { class: "tb-menu", id: "menu-espacio" }, [
        el("label", { text: t("interlineado") }, [el("input", { id: "interlineado", type: "number", min: "0.8", max: "3", step: "0.05", value: String(target.props.lineHeight ?? 1.15), "aria-label": t("interlineado") })]),
        el("label", { text: en ? "Letter spacing" : "Interletrado" }, [el("input", { id: "interletrado", type: "number", min: "-8", max: "40", step: "0.5", value: String(target.props.letterSpacing ?? 0), "aria-label": en ? "Letter spacing" : "Interletrado" })]),
        el("label", { text: en ? "Transparency" : "Transparencia" }, [el("input", { type: "range", min: "0", max: "1", step: "0.05", "data-opacidad": "1", value: String(target.opacity ?? 1), "aria-label": t("opacidad") })]),
      ]));
    }
    kids.push(popButton(en ? "Effects" : "Efectos", "fx", state.pop === "fx"));
    if (state.pop === "fx") {
      kids.push(el("div", { class: "tb-menu" }, ["", "sombra", "neon", "glitch"].map((id) => button(id ? id : (en ? "None" : "Ninguno"), {
        "data-effect": id || "ninguno",
        "aria-pressed": (target.props.effect || "") === id ? "true" : "false",
      }))));
    }
  }
  const subject = layer || target;
  if (subject) {
    kids.push(popButton(en ? "Animate" : "Animar", "anim", state.pop === "anim"));
    if (state.pop === "anim") {
      kids.push(el("div", { class: "tb-menu" }, [
        ["", en ? "None" : "Ninguna"],
        ["aparecer", en ? "Fade" : "Aparecer"],
        ["subir", en ? "Rise" : "Subir"],
        ["rebote", en ? "Bounce" : "Rebote"],
      ].map(([id, label]) => button(label, { "data-anim": id || "ninguna", "aria-pressed": (subject.anim || "") === id ? "true" : "false" }))));
    }
    kids.push(button(t("posicion"), { id: "alternar-inspector", class: "tb-pop", "aria-pressed": state.inspectorOpen ? "true" : "false" }));
    if (!target && subject) {
      kids.push(el("label", { class: "tb-opacity", text: en ? "Transparency" : "Transparencia" }, [
        el("input", { type: "range", min: "0", max: "1", step: "0.05", "data-opacidad": "1", value: String(subject.opacity ?? 1), "aria-label": t("opacidad") }),
      ]));
    }
    kids.push(iconBtn(en ? "Copy style" : "Copiar estilo", { id: "copiar-formato", "aria-pressed": state.painter ? "true" : "false" }, ["M14 4l5 5-8 8H6v-5z", "M4 20h6"]));
  }
  return el("div", { id: "barra-texto", class: "barra-texto", role: "toolbar", "aria-label": t("texto") }, kids);
}

function pageStrip(ctx) {
  const { state, t } = ctx;
  const shell = shellOf(state.doc);
  const pages = state.doc.meta?.pages?.length || 1;
  const withStrip = shell === "deck" || shell === "web" || shell === "design" || shell === "print" || shell === "video";
  if (!withStrip) return null;
  const buttons = [];
  for (let index = 0; index < pages; index += 1) {
    const label = shell === "video" ? `${index + 1}` : String(index + 1);
    buttons.push(button(label, { "data-page": String(index), "aria-pressed": state.page === index ? "true" : "false" }));
  }
  const canAdd = shell !== "doc" && shell !== "whiteboard" && shell !== "web";
  return el("div", { id: "tira-paginas", class: "tira", role: "navigation", "aria-label": shell === "video" ? t("escenas") : t("paginas") }, [
    ...buttons,
    canAdd ? button(shell === "video" ? t("anadirEscena") : `+ ${t("anadirPagina")}`, { id: shell === "video" ? "anadir-escena" : "anadir-pagina", class: "anadir-pagina", "aria-label": shell === "video" ? t("anadirEscena") : t("anadirPagina") }) : null,
    canAdd && shell !== "video" ? button(t("duplicarPagina"), { id: "duplicar-pagina" }) : null,
    canAdd && shell !== "video" ? button(t("borrarPagina"), { id: "borrar-pagina" }) : null,
    canAdd ? button(t("anterior"), { id: "pagina-anterior" }) : null,
    canAdd ? button(t("siguiente"), { id: "pagina-siguiente" }) : null,
    state.pageNote ? el("p", { id: "aviso-paginas", text: state.pageNote }) : null,
  ]);
}

function videoTimeline(ctx) {
  const { state, t } = ctx;
  const scenes = Array.isArray(state.doc.meta?.scenes) ? state.doc.meta.scenes : [];
  const page = state.page || 0;
  const current = scenes[page] || { duration: 5, label: `${t("escenas")} ${page + 1}` };
  const total = scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 5), 0) || current.duration;
  return el("div", { id: "linea-tiempo", class: "linea-tiempo" }, [
    el("p", { class: "nota", text: t("videoLimite") }),
    el("div", { class: "escenas-pista" }, (scenes.length ? scenes : [current]).map((scene, index) => button(scene.label || `${index + 1}`, {
      "data-page": String(index),
      class: index === page ? "activa" : "",
      style: `flex:${Math.max(1, Number(scene.duration) || 5)}`,
    }))),
    el("label", { text: t("duracionEscena") }, [
      el("input", { id: "duracion-escena", type: "number", min: "1", max: "60", value: String(current.duration || 5) }),
    ]),
    el("span", { text: `0:00 → 0:${String(Math.round(total)).padStart(2, "0")}` }),
    button(t("anadirEscena"), { id: "anadir-escena" }),
  ]);
}

function labeledBtn(label, attrs, paths) {
  const node = button("", attrs);
  if (paths) node.append(svgIcon(paths));
  node.append(el("span", { text: label }));
  return node;
}

function bottomBar(ctx) {
  const { state, t } = ctx;
  const shell = shellOf(state.doc);
  const pages = state.doc.meta?.pages?.length || 1;
  const here = (state.page || 0) + 1;
  const pageLabel = ctx.lang === "en" ? `${here} of ${pages}` : `${here} de ${pages}`;
  const seconds = Math.max(0, Math.floor(Number(state.timerSeconds) || 0));
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const pctNum = Math.round((Number(state.scale) || 1) * 100);
  const en = ctx.lang === "en";
  const grid = iconBtn(t("cuadricula"), { id: "cuadricula", "aria-pressed": state.grid ? "true" : "false" }, ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"]);
  const full = iconBtn(t("pantalla"), { id: "pantalla" }, ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"]);
  const help = iconBtn(en ? "Help" : "Ayuda", { id: "ayuda" }, ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.4-1.2.9-1.2 1.8", "M12 17h.01"]);
  return el("div", { class: "barra-inferior" }, [
    el("div", { class: "barra-izq" }, [
      labeledBtn(t("notas"), { id: "abrir-notas", "aria-pressed": state.notesOpen ? "true" : "false" }, ["M6 3h9l3 3v15H6z", "M15 3v4h4"]),
      shell === "whiteboard" ? button(t("ampliarPizarra"), { id: "ampliar-pizarra" }) : null,
      labeledBtn(state.timerOn ? t("parar") : t("temporizador"), { id: "temporizador" }, ["M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M12 8v5l3 2"]),
      state.timerOn ? el("span", { id: "reloj", text: clock }) : null,
    ]),
    el("div", { class: "barra-der" }, [
      button(t("ajustar"), { "data-zoom": "fit", class: "sr", "aria-pressed": state.zoom === "fit" ? "true" : "false" }),
      button("−", { "data-zoom": "out", class: "sr", "aria-label": t("menos") }),
      button(t("cien"), { "data-zoom": "100", class: "sr", "aria-pressed": state.zoom === "100" ? "true" : "false" }),
      button("+", { "data-zoom": "in", class: "sr", "aria-label": t("mas") }),
      el("input", {
        id: "zoom-rango",
        type: "range",
        min: "10",
        max: "200",
        step: "1",
        value: String(Math.min(200, Math.max(10, pctNum))),
        "aria-label": "Zoom",
      }),
      el("span", { id: "zoom-indicador", text: `${pctNum}%` }),
      grid,
      button(t("guias"), { id: "guias", class: "tb-extra", "aria-pressed": state.guides ? "true" : "false" }),
      el("span", { class: "paginas-palabra", text: shell === "video" ? (en ? "Scenes" : "Escenas") : (en ? "Pages" : "Páginas") }),
      el("span", { id: "paginas-indicador", text: pageLabel }),
      full,
      help,
    ]),
  ]);
}

function pdfDialog(ctx) {
  const { state, t } = ctx;
  const count = state.doc?.meta?.pages?.length || 1;
  const pages = [];
  for (let index = 0; index < count; index += 1) {
    pages.push(el("label", {}, [
      el("input", { type: "checkbox", "data-pdf-page": String(index), checked: "checked" }),
      el("span", { text: ` ${index + 1}` }),
    ]));
  }
  const a4 = state.doc?.format?.width === 794 && state.doc?.format?.height === 1123;
  return el("dialog", { id: "dialogo-pdf", open: "open" }, [
    el("h2", { text: t("pdf") }),
    el("p", { text: t("pdfNota") }),
    a4 ? el("p", { id: "nota-a4", text: t("pdfA4") }) : null,
    el("p", { text: t("pdfPaginas") }),
    el("div", { id: "pdf-paginas" }, pages),
    button(t("pdf"), { id: "exportar-pdf" }),
    button(t("cerrar"), { id: "cerrar-pdf" }),
  ]);
}

function previewAttr(id) {
  const kind = openKind(id);
  if (kind === "thumb") return { "data-thumb": id };
  if (kind === "plantilla") return { "data-template": id };
  return { "data-asset": id };
}

function previewMeta(doc, lang) {
  if (!doc) return "";
  const w = doc.format?.width || 0;
  const h = doc.format?.height || 0;
  const en = lang === "en";
  const preset = PRESETS.find((item) => item.id === doc.format?.id);
  const name = preset ? (en ? preset.en : preset.es) : (en ? "Design" : "Diseño");
  const orient = h >= w ? (en ? "Portrait" : "Vertical") : (en ? "Landscape" : "Horizontal");
  if (doc.format?.id === "cv" || doc.format?.id === "doc" || preset?.ratio === "A4") {
    return en ? `${name} (A4, ${orient}) · 21 × 29.7 cm` : `${name} (A4, ${orient}) · 21 × 29,7 cm`;
  }
  const ratio = preset?.ratio && preset.ratio !== "página" ? `${preset.ratio}, ` : "";
  return `${name} (${ratio}${orient}) · ${w} × ${h} px`;
}

function pageThumb(doc, layers, index, pressed) {
  const node = button("", {
    class: "canva-plain tpl-modal-mini tpl-modal-page",
    "data-preview-page": String(index),
    "aria-pressed": pressed ? "true" : "false",
    "aria-label": String(index + 1),
  });
  node.append(miniStage({ ...doc, layers }));
  return node;
}

function starIcon(filled) {
  const svg = svgIcon(["M12 3l2.2 5.2L20 9l-4 3.6.8 5.4L12 15.4 7.2 18l.8-5.4L4 9l5.8-.8z"]);
  if (filled) {
    const path = svg.querySelector("path");
    if (path) path.setAttribute("fill", "currentColor");
  }
  return svg;
}

function relatedThumb(id, label) {
  const node = button("", { class: "canva-plain tpl-modal-mini", ...previewAttr(id), "aria-label": label });
  const thumb = thumbById(id);
  const photo = photoById(id);
  const visual = catalogItem(id);
  const asset = browseAsset(id);
  if (thumb?.file) node.append(el("img", { src: studioAsset(thumb.file), alt: "" }));
  else if (photo?.archivo) node.append(el("img", { src: studioAsset(photo.archivo), alt: "" }));
  else if (visual?.archivo) node.append(el("img", { src: studioAsset(visual.archivo), alt: "" }));
  else if (asset?.scene) node.append(mountScene(asset.scene));
  else {
    const sample = documentForOpen(id);
    if (sample) node.append(miniStage(sample));
  }
  return node;
}

function selectionPill(ctx) {
  const { state, t, lang } = ctx;
  const layer = primary(state);
  if (!layer || !state.selected.includes(layer.id)) return null;
  const en = lang === "en";
  const ask = button(en ? "Quick text" : "Textos rápidos", { class: "pill-ia", "data-rail": "ia" });
  ask.prepend(el("img", { src: studioAsset("assets/orvupi-avatar.png"), alt: "" }));
  const magic = iconBtn(en ? "Magic" : "Magia", { id: "magia-capa", class: "pill-btn" }, ["M15 4l1.2 3.2L19.4 8.4 16.2 9.6 15 12.8 13.8 9.6 10.6 8.4l3.2-1.2z", "M6 14l.7 1.8L8.5 16.5 6.7 17.2 6 19l-.7-1.8L3.5 16.5l1.8-.7z"]);
  const lock = iconBtn(t("bloquear"), { class: "pill-btn", "data-action": "lock", "aria-pressed": layer.locked ? "true" : "false" }, ["M8 11V8a4 4 0 0 1 8 0v3", "M6 11h12v9H6z"]);
  const dup = iconBtn(t("duplicar"), { class: "pill-btn", "data-action": "duplicate" }, ["M8 8h11v11H8z", "M5 16V5h11"]);
  const del = iconBtn(t("eliminar"), { class: "pill-btn", "data-action": "remove" }, ["M5 7h14", "M9 7V5h6v2", "M7 7l1 13h8l1-13"]);
  const more = iconBtn(en ? "More" : "Más", { class: "pill-btn", "data-pop": "mas", "aria-expanded": state.pop === "mas" ? "true" : "false" }, "dots");
  const kids = [ask, magic, lock, dup, del, more];
  if (state.pop === "mas") {
    kids.push(el("div", { class: "tb-menu pill-menu" }, [
      button(t("alFrente"), { "data-action": "front" }),
      button(t("alFondo"), { "data-action": "back" }),
    ]));
  }
  return el("div", { id: "pastilla-seleccion", class: "pastilla-seleccion" }, kids);
}

export function templatePreview(ctx) {
  const id = ctx.state.openPreview;
  if (!id) return null;
  const doc = documentForOpen(id);
  if (!doc || doc.templateId !== id) return null;
  const { lang, t } = ctx;
  const en = lang === "en";
  const pages = Array.isArray(doc.meta?.pages) && doc.meta.pages.length ? doc.meta.pages : [doc.layers];
  const pageIndex = Math.min(pages.length - 1, Math.max(0, ctx.state.previewPage || 0));
  const view = { ...doc, layers: pages[pageIndex] || doc.layers };
  const close = button("", { id: "cerrar-plantilla", class: "canva-plain tpl-modal-x", "aria-label": t("cerrar") });
  close.append(svgIcon(["M7 7l10 10", "M17 7L7 17"]));
  const pageButtons = pages.map((layers, index) => pageThumb(doc, layers, index, index === pageIndex));
  const related = relatedOpenIds(id, Math.max(1, 6 - pageButtons.length)).map((relatedId) => {
    const sample = documentForOpen(relatedId);
    return relatedThumb(relatedId, sample?.name || relatedId);
  });
  const star = button("", {
    id: "tpl-guardar",
    class: "tpl-icon",
    "aria-pressed": ctx.state.starred?.[id] ? "true" : "false",
    "aria-label": en ? "Save" : "Guardar",
  });
  star.append(starIcon(Boolean(ctx.state.starred?.[id])));
  const more = button("", {
    id: "tpl-mas",
    class: "tpl-icon",
    "aria-expanded": ctx.state.previewMore ? "true" : "false",
    "aria-label": en ? "More" : "Más",
  });
  more.append(dotsIcon());
  const backdrop = button("", { class: "tpl-modal-backdrop", "data-close-preview": "1", "aria-label": t("cerrar") });
  return el("div", { class: "tpl-modal-root" }, [
    backdrop,
    el("div", {
      id: "vista-plantilla",
      class: "tpl-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "tpl-modal-title",
      "data-open-id": id,
    }, [
      close,
      el("div", { class: "tpl-modal-grid" }, [
        el("div", { class: "tpl-modal-stage" }, [
          el("div", { class: "tpl-modal-hero" }, [miniStage(view)]),
          el("div", { class: "tpl-modal-rail", id: "tpl-variantes" }, [...pageButtons, ...related]),
        ]),
        el("aside", { class: "tpl-modal-side" }, [
          el("h2", { id: "tpl-modal-title", text: doc.name }),
          el("p", { class: "tpl-modal-meta", text: previewMeta(doc, lang) }),
          ctx.state.previewMore ? el("div", { class: "tpl-more-menu", id: "tpl-more-menu" }, [
            button(t("cerrar"), { "data-close-preview": "1" }),
          ]) : null,
          el("div", { class: "tpl-modal-actions" }, [
            button(en ? "Customize this template" : "Personalizar esta plantilla", {
              class: "tpl-cta",
              "data-personalizar": id,
            }),
            star,
            more,
          ]),
        ]),
      ]),
    ]),
  ]);
}

export function renderEditor(ctx) {
  const { root, state, t } = ctx;
  const doc = state.doc;
  const shell = shellOf(doc);
  const name = el("input", { id: "nombre-diseno", type: "text", value: doc.name, maxlength: "80", "aria-label": t("nombre") });
  const en = ctx.lang === "en";
  const fileMenu = state.fileMenu ? el("div", { class: "menu-archivo", id: "menu-archivo" }, [
    el("p", { text: `${doc.format.width}×${doc.format.height} px` }),
    button("Hacer una copia", { "data-duplicate": doc.id }),
    button(t("exportar"), { "data-export": doc.id }),
    button(t("importar"), { id: "importar-json" }),
    button(t("paquete"), { id: "exportar-paquete" }),
    button(t("importarPaquete"), { id: "importar-paquete" }),
    button(t("pdf"), { id: "abrir-pdf" }),
    shell === "print" ? button(t("imprimir"), { id: "imprimir" }) : null,
    shell === "deck" ? button(t("presentar"), { id: "presentar" }) : null,
    shell === "web" || shell === "video" ? button(t("vistaPrevia"), { id: "vista-previa" }) : null,
    shell === "web" ? button(t("exportarHtml"), { id: "exportar-sitio" }) : null,
    button(t("abrirWork"), { id: "abrir-work" }),
    state.status === "conflict" ? button(t("guardarCopia"), { id: "guardar-copia" }) : null,
    state.status === "cap" ? button(t("abrirRecuperado"), { id: "abrir-recuperado" }) : null,
  ]) : null;
  const home = button("", { "data-go": "inicio", class: "tb-home tb-icon", "aria-label": t("inicio") });
  home.append(svgIcon(["M4 11 12 4l8 7", "M6 10.5V20h12v-9.5"]));
  const undo = button("", { "data-action": "undo", class: "tb-quiet tb-icon", "aria-label": t("deshacer") });
  undo.append(svgIcon(["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 1 1 0 11H12"]));
  const redo = button("", { "data-action": "redo", class: "tb-quiet tb-icon", "aria-label": t("rehacer") });
  redo.append(svgIcon(["M15 14l5-5-5-5", "M20 9H9.5a5.5 5.5 0 1 0 0 11H12"]));
  const editMenu = state.editMenu ? el("div", { class: "menu-archivo", id: "menu-editar" }, [
    button(t("deshacer"), { "data-action": "undo" }),
    button(t("rehacer"), { "data-action": "redo" }),
    button(t("duplicarPagina"), { "data-page-cmd": "duplicate" }),
    button(t("borrarPagina"), { "data-page-cmd": "delete" }),
    button(t("duplicar"), { "data-action": "duplicate" }),
    button(t("eliminar"), { "data-action": "remove" }),
  ]) : null;
  const editorClass = `editor${state.panelOpen ? "" : " panel-cerrado"}${state.inspectorOpen ? "" : " inspector-cerrado"}`;
  root.replaceChildren(
    frame(sideNav(ctx), el("div", {
      class: "orv-main orv-editor canva-edit",
      id: "editor-app",
      "data-shell": shell,
      "data-template-id": doc.templateId || "",
    }, [
      el("div", { class: "editor-bar canva-topbar" }, [
        home,
        button(t("menu"), { id: "menu-estudio", class: "tb-quiet tb-menu-movil", "aria-expanded": state.navOpen ? "true" : "false" }),
        button("Archivo", { id: "abrir-archivo", class: "tb-quiet" }),
        fileMenu,
        button(en ? "Resize" : "Redimensionar", { id: "redimensionar", class: "tb-quiet" }),
        button(en ? "Edit ▾" : "Editar ▾", { id: "menu-editar-btn", class: "tb-quiet", "aria-expanded": state.editMenu ? "true" : "false" }),
        editMenu,
        undo,
        redo,
        el("span", { id: "estado-guardado", class: "nube-guardado", "aria-live": "polite", text: ctx.statusText() }),
        name,
        button(en ? "Share" : "Compartir", { id: "compartir-studio", class: "canva-share" }),
      ]),
      shell === "video" ? el("p", { class: "nota", text: t("videoNota") }) : null,
      el("div", { class: editorClass }, [
        rail(ctx),
        state.panelOpen ? el("div", { class: "panel", id: "panel-riel" }, [panel(ctx)]) : null,
        el("div", { class: "escenario" }, [
          textBar(ctx),
          selectionPill(ctx),
          stageNode(ctx),
          shell === "web" ? button(t("anadirSeccion"), { id: "anadir-seccion", class: "anadir-seccion" }) : null,
          pageStrip(ctx),
          shell === "video" ? videoTimeline(ctx) : null,
          shell === "web" ? el("p", { class: "nota", text: t("htmlNota") }) : null,
          state.htmlNote ? el("p", { class: "nota", text: state.htmlNote }) : null,
          state.notesOpen ? el("label", { text: t("notas") }, [el("textarea", { id: "notas-pizarra", text: doc.meta?.note || "" })]) : null,
        ]),
        state.inspectorOpen ? el("aside", { class: "lado", id: "inspector", "aria-label": t("posicion") }, [
          button(t("cerrarInspector"), { id: "cerrar-inspector" }),
          positionPanel(ctx),
          dataPanel(ctx),
          layersPanel(ctx),
        ]) : null,
      ]),
      bottomBar(ctx),
      state.fileMenu ? null : el("div", { id: "muelle-acciones", class: "sr" }),
      state.helpOpen ? el("dialog", { id: "dialogo-ayuda", open: "open" }, [
        el("h2", { text: en ? "ORVUPI Studio" : "ORVUPI Studio" }),
        el("p", { text: en ? "The design stays in this browser. There is no account." : "El diseño se queda en este navegador. No hay cuenta." }),
        button(t("cerrar"), { id: "cerrar-ayuda" }),
      ]) : null,
      state.workNote ? el("dialog", { id: "dialogo-work", open: "open" }, [
        el("h2", { text: t("abrirWork") }),
        el("p", { text: t("workNota") }),
        button(t("workNativo"), { id: "work-nativo" }),
        button(t("workDoc"), { id: "work-doc" }),
        button(t("workSlides"), { id: "work-diapositivas" }),
        state.workPreview ? el("div", { id: "vista-conversion" }, [
          el("p", { text: state.workPreview.dimension || "" }),
          el("ul", {}, (state.workPreview.keeps || []).map((line) => el("li", { text: line }))),
          el("ul", {}, (state.workPreview.losses || []).map((line) => el("li", { text: line }))),
          button(t("workConfirmar"), { id: "work-confirmar" }),
        ]) : null,
        button(t("cerrar"), { id: "cerrar-work" }),
      ]) : null,
    ]), { navOpen: state.navOpen }),
    sizeDialog(ctx),
    state.preview ? el("dialog", { id: "dialogo-previa", open: "open" }, [
      el("h2", { text: t("vistaPrevia") }),
      el("p", { text: `${doc.name}. ${doc.format.width}×${doc.format.height} px` }),
      el("p", { text: t("previewNota") }),
      button(t("cerrar"), { id: "cerrar-previa" }),
    ]) : null,
    state.pdfOpen ? pdfDialog(ctx) : null,
  );
  const menu = root.querySelector("#menu-archivo");
  const hold = root.querySelector("#muelle-acciones");
  if (ctx.acciones && menu) menu.append(ctx.acciones);
  else if (ctx.acciones && hold) hold.append(ctx.acciones);
  ctx.ensureQuality();
  void ctx.paintBackdrop();
  const slot = root.querySelector("#hueco-subida");
  const details = ctx.uploads;
  if (slot && details) slot.append(details);
}
