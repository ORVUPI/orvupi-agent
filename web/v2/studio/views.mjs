/** Cromo de ORVUPI Studio. La pieza se queda en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { aiPanelCopy, localPhrases } from "./lib/ai-optional.mjs";
import { chartSeriesText } from "./lib/chart-data.mjs";
import { BRAND, FONTS, PRESETS, fontById, importProject, orderedLayers, overlappingIds } from "./lib/document.mjs";
import { HISTORY_COST, listHistory } from "./lib/history.mjs";
import { listPhotos, PHOTO_LICENSE_NOTE } from "./lib/photos.mjs";
import { tablePlainText } from "./lib/table-data.mjs";
import { piecesOf } from "./lib/text-style.mjs";
import { keepsMascot } from "./lib/neutral.mjs";
import { IDEAS, PLANTILLAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import { listProjects } from "./lib/projects.mjs";
import { documentForThumb } from "./lib/thumb-docs.mjs";
import { THUMB_CATS, THUMB_GROUPS, thumbCatsFor, thumbsForGrupo, thumbsIn } from "./lib/thumbs.mjs";

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
  const projects = listProjects(ctx.storage).slice(0, 4);
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
  const projects = listProjects(ctx.storage).slice(0, 4);
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
        if (item) frameNode.append(el("img", { src: studioAsset(item.archivo), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
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

function sizeDialog(ctx) {
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
          el("h2", { text: t("tamano") }),
          button(t("cerrar"), { id: "cerrar-tamano" }),
        ]),
        el("label", { class: "buscar-wrap", for: "buscar-tamano" }, [
          el("span", { class: "sr", text: t("buscarCrear") }),
          el("input", { id: "buscar-tamano", type: "search", placeholder: t("buscarCrear"), autocomplete: "off" }),
        ]),
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
  const items = listProjects(ctx.storage).slice(0, 8);
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
  ["ia", "ORVUPI IA", "ORVUPI AI", "#6D28D9", "M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z"],
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

function canvaHead(title, more) {
  return el("div", { class: "canva-head" }, [el("h2", { text: title }), more || null]);
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
  return el("details", { class: "canva-more" }, [
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
    el("label", { class: "canva-search" }, [
      el("span", { class: "sr", text: t("buscar") }),
      svgIcon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5"]),
      el("input", {
        id: "buscar",
        type: "search",
        value: state.filters.text,
        placeholder: t("buscarDiseno"),
        autocomplete: "off",
        "aria-label": t("buscar"),
      }),
      state.filters.text ? button("×", { id: "limpiar-filtros", class: "canva-clear", "aria-label": t("limpiar") }) : null,
    ]),
  ]);
}

function canvaFab(ctx) {
  const node = button("", { id: "crear-pieza", class: "canva-fab", "aria-label": ctx.t("crearPieza") });
  node.append(svgIcon(["M6 8h9v9H6zM16 5v5M13.5 7.5h5"]));
  return node;
}

function navTab(label, view, current, d) {
  const node = button("", {
    class: "canva-tab canva-plain",
    "data-go": view,
    "aria-current": current === view ? "page" : null,
    "aria-label": label,
  });
  node.append(svgIcon([d]), el("span", { text: label }));
  return node;
}

function canvaNav(ctx, tab) {
  const { t, lang } = ctx;
  const base = localeBase();
  const en = lang === "en";
  const menu = el("details", { class: "canva-tab-menu" }, [
    el("summary", { "aria-label": t("menu") }, [
      el("span", { class: "canva-avatar", "aria-hidden": "true" }, [
        el("span", { text: "O" }),
        el("span", { class: "canva-badge" }),
      ]),
      el("span", { text: t("menu") }),
    ]),
    el("div", { class: "canva-sheet" }, [
      el("p", { class: "canva-sheet-title", text: "ORVUPI" }),
      button(t("disenos"), { "data-go": "disenos" }),
      button(t("plantillas"), { "data-go": "plantillas" }),
      button(t("marca"), { "data-go": "marca" }),
      button(t("recursos"), { "data-go": "recursos" }),
      el("a", { href: `${base}/work/`, text: t("abrirWork") }),
      el("a", { href: `${base}/studio/reglas/`, text: en ? "Rules and assets" : "Reglas y recursos" }),
      el("p", { class: "canva-sheet-note", text: t("local") }),
      el("div", { class: "canva-langs" }, [
        el("a", { href: "/studio/", lang: "es", text: "Español" }),
        el("a", { href: "/en/studio/", lang: "en", text: "English" }),
        el("a", { href: "/pt-br/studio/", lang: "pt-BR", text: "Português" }),
        el("a", { href: "/ja/studio/", lang: "ja", text: "日本語" }),
        el("a", { href: "/ko/studio/", lang: "ko", text: "한국어" }),
      ]),
    ]),
  ]);
  return el("nav", { class: "canva-nav", "aria-label": t("menu") }, [
    navTab(t("inicio"), "inicio", tab, "M4 11 L12 4 L20 11 V20 H4 Z"),
    navTab(t("disenos"), "disenos", tab, "M4 7h6l2 2h8v9H4z"),
    navTab(t("plantillas"), "plantillas", tab, "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
    navTab(t("iaTab"), "ia", tab, "M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z"),
    menu,
  ]);
}

function canvaShell(ctx, tab, feed, withHero) {
  const kids = [canvaTop(ctx)];
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
  const projects = listProjects(ctx.storage).slice(0, 8);
  if (!projects.length) {
    return el("section", { class: "canva-section", id: "seguir" }, [
      canvaHead(t("seguir")),
      el("p", { id: "seguir-vacio", class: "canva-empty", text: t("vacioReciente") }),
    ]);
  }
  return el("section", { class: "canva-section", id: "seguir" }, [
    canvaHead(t("seguir"), seeAll(t("verTodo"), { "data-go": "disenos" })),
    el("div", { class: "canva-row" }, projects.map((item) => recentHomeCard(item, t))),
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
  return el("section", { class: "canva-section", "aria-label": ctx.t("elige") }, [
    canvaHead(ctx.t("elige")),
    row,
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
  return el("section", { class: "canva-section" }, [
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
  return el("section", { class: "canva-section" }, [
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
  return el("section", { class: "canva-section", "aria-label": ctx.t("acceso") }, [
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
  return el("section", { class: "canva-section" }, [
    canvaHead(ctx.t("interes"), seeAll(ctx.t("verTodo"), { "data-go": "plantillas", "data-thumb-cat": "" })),
    el("div", { class: "canva-row" }, items.map((item) => interestCard(item, ctx))),
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
  return el("section", { class: "canva-section" }, [
    canvaHead(ctx.t("exploraPlantillas")),
    el("div", { class: "canva-row" }, cards),
  ]);
}

function homeResults(ctx) {
  const { state, lang, t } = ctx;
  const q = state.filters.text.trim().toLowerCase();
  const thumbs = proThumbList().filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(q)).slice(0, 12);
  const templates = filterPlantillas(state.filters).filter((item) => !keepsMascot(item)).slice(0, 12);
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
  return el("div", { class: "canva-feed" }, [
    seguirHome(ctx),
    startHome(ctx),
    usedHome(ctx),
    popularHome(ctx),
    shortcutsHome(ctx),
    interestHome(ctx),
    categoriesHome(ctx),
  ]);
}

export function renderHome(ctx) {
  const feed = ctx.state.filters.text.trim() ? homeResults(ctx) : homeFeed(ctx);
  ctx.root.replaceChildren(canvaShell(ctx, "inicio", feed, true), sizeDialog(ctx));
}

export function renderIa(ctx) {
  const copy = aiPanelCopy(ctx.lang);
  const phrases = localPhrases(ctx.lang);
  const feed = el("div", { class: "canva-feed" }, [
    el("section", { class: "canva-section canva-ia" }, [
      el("h1", { text: ctx.t("iaTab") }),
      el("p", { text: copy.body }),
      el("p", { class: "nota", text: copy.off }),
      el("h2", { text: copy.phrases }),
      el("ul", { class: "canva-phrases" }, phrases.map((phrase) => el("li", { text: phrase }))),
      button(ctx.t("usarEnDiseno"), { class: "canva-ia-go", "data-start-rail": "ia" }),
    ]),
  ]);
  ctx.root.replaceChildren(canvaShell(ctx, "ia", feed, false));
}

export function renderPlantillas(ctx) {
  ctx.root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main" }, [
      el("h1", { class: "hero-titulo", text: ctx.t("plantillas") }),
      catalogBody(ctx),
    ])),
    sizeDialog(ctx),
  );
}

export function renderDesigns(ctx) {
  const { root, t } = ctx;
  const items = listProjects(ctx.storage);
  const list = el("ul", { class: "disenos" }, items.map((item) => el("li", {}, [
    el("span", { text: item.name || t("abrir") }),
    button(t("abrir"), { "data-open": item.id }),
    button(t("duplicar"), { "data-duplicate": item.id }),
    button(t("eliminar"), { "data-delete": item.id }),
    button(t("exportar"), { "data-export": item.id }),
  ])));
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main" }, [
      el("h1", { class: "hero-titulo", text: t("disenos") }),
      el("p", { text: t("soloAqui") }),
      button(t("importar"), { id: "importar-json" }),
      items.length ? list : el("p", { text: t("vacioReciente") }),
      el("p", { id: "estado-guardado", "aria-live": "polite", text: ctx.statusText() }),
    ])),
  );
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
        const node = el("figure", { class: "marca-card" });
        node.append(el("img", { src: studioAsset(item.archivo), alt: item.nombre[lang] || item.nombre.es }), el("figcaption", { text: item.nombre[lang] || item.nombre.es }));
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
  return `left:${layer.x}px;top:${layer.y}px;width:${layer.w}px;height:${layer.h}px;transform:rotate(${layer.rotation || 0}deg) scale(${fx}, ${fy});opacity:${layer.opacity ?? 1};z-index:${layer.z};`;
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
  node.style.fontWeight = props.bold ? "700" : "400";
  node.style.fontStyle = props.italic ? "italic" : "normal";
  node.style.textDecoration = props.underline ? "underline" : "none";
  const parts = piecesOf(props.text, props.runs, props);
  if (parts.length <= 1) node.textContent = props.text;
  else {
    for (const part of parts) {
      const span = el("span", { text: part.text });
      span.style.fontWeight = part.bold ? "700" : "400";
      span.style.fontStyle = part.italic ? "italic" : "normal";
      span.style.textDecoration = part.underline ? "underline" : "none";
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
    if (item) {
      img.src = studioAsset(item.archivo);
      natural = item.width && item.height ? { w: item.width, h: item.height } : null;
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
      class: `capa${state.selected.includes(layer.id) ? " seleccionada" : ""}${layer.locked ? " bloqueada" : ""}`,
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
    if (state.selected.includes(layer.id) && !layer.locked) node.append(el("span", { class: "asa", "data-resize": layer.id }));
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

function rail(ctx) {
  const { state, t } = ctx;
  const shell = shellOf(state.doc);
  const tabs = RAILS[shell] || RAILS.design;
  const labels = {
    plantillas: t("plantillas"),
    elementos: t("elementos"),
    texto: t("texto"),
    marca: t("marca"),
    subidos: t("subidos"),
    herramientas: t("herramientas"),
    fondo: t("fondo"),
    proyectos: t("disenos"),
    fotos: t("fotos"),
    graficos: t("graficos"),
    formas: t("forma"),
    datos: t("datos"),
    notas: t("notas"),
    capas: t("capas"),
    ia: t("iaOpcional"),
  };
  return el("div", { class: "riel", role: "tablist", "aria-label": t("herramientas") }, tabs.map((id) => button(labels[id] || id, {
    "data-rail": id,
    role: "tab",
    "aria-selected": state.rail === id ? "true" : "false",
  })));
}

function panel(ctx) {
  const { state, t, lang } = ctx;
  const doc = state.doc;
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
        return control;
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
        return control;
      })),
      el("div", { id: "hueco-subida" }),
      button(t("subir"), { id: "subir-imagen" }),
      uploaded.length ? el("ul", {}, uploaded.map((layer) => el("li", {}, [button(layer.name, { "data-pick": layer.id })]))) : null,
    ]);
  }
  if (state.rail === "graficos" || state.rail === "datos") {
    const selected = primary(state);
    const dataEditor = selected?.type === "chart"
      ? el("label", { text: t("editarDatos") }, [el("textarea", { id: "datos-grafico", text: chartSeriesText(selected.props) })])
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
    const tools = [["select", t("seleccionar")], ["draw", t("dibujar")], ["rect", t("forma")], ["line", t("linea")], ["text", t("anadirTexto")]];
    return el("div", { class: "chips" }, tools.map(([id, label]) => button(label, { "data-tool": id, "aria-pressed": state.tool === id ? "true" : "false" })));
  }
  const fondos = catalog.items.filter((item) => item.tipo === "fondo");
  const current = /^#[0-9a-fA-F]{6}$/.test(doc.background.fill || "") ? doc.background.fill : "#FFF8EC";
  return el("div", {}, [
    el("label", { text: t("colorFondo") }, [el("input", { type: "color", id: "fondo-color", value: current, "aria-label": t("colorFondo") })]),
    el("div", { class: "chips" }, [["#FF3070", t("rosa")], ["#FFF8EC", t("crema")], ["#102032", t("azul")]].map(([hex, key]) => button(key, { "data-fondo": hex, style: swatchStyle(hex) }))),
    el("div", { class: "rejilla" }, fondos.map((item) => button(item.nombre[lang] || item.nombre.es, { "data-fondo-id": item.id }))),
  ]);
}

function dataPanel(ctx) {
  const { state, t } = ctx;
  const layer = primary(state);
  if (layer?.type === "chart") {
    return el("section", { class: "datos-capa" }, [
      el("h2", { text: t("editarDatos") }),
      el("textarea", { id: "datos-grafico", text: chartSeriesText(layer.props), "aria-label": t("editarDatos") }),
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
  return el("section", { class: "posicion" }, [
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

function textBar(ctx) {
  const { state, t, lang } = ctx;
  const shell = shellOf(state.doc);
  const layer = primary(state);
  const show = shell === "doc" || layer?.type === "text";
  if (!show) return null;
  const target = layer?.type === "text" ? layer : state.doc.layers.find((item) => item.type === "text");
  const size = target ? Math.round(target.props.size) : 32;
  return el("div", { id: "barra-texto", class: "barra-texto", role: "toolbar", "aria-label": t("texto") }, [
    el("label", { class: "sr", text: t("texto") }),
    target ? el("textarea", { id: "texto-capa", text: target.props.text, "aria-label": t("texto") }) : el("p", { text: "Empieza a escribir." }),
    ...FONTS.map((font) => button(font[lang] || font.es, { "data-font": font.id, class: "chip", style: `font-family:${font.css}` })),
    el("label", { text: t("tamanoTexto") }, [el("input", { id: "tamano-texto", type: "number", min: "8", max: "400", step: "1", value: String(size), "aria-label": t("tamanoTexto") })]),
    button("−", { "data-size": "down", "aria-label": t("menos") }),
    button("+", { "data-size": "up", "aria-label": t("mas") }),
    button(t("negrita"), { "data-style": "bold", "aria-pressed": target?.props.bold ? "true" : "false" }),
    button(t("cursiva"), { "data-style": "italic", "aria-pressed": target?.props.italic ? "true" : "false" }),
    button(t("subrayado"), { "data-style": "underline", "aria-pressed": target?.props.underline ? "true" : "false" }),
    target ? el("input", { type: "color", id: "color-texto", value: /^#[0-9a-fA-F]{6}$/.test(target.props.color) ? target.props.color : "#102032", "aria-label": t("color") }) : null,
    button(t("izquierda"), { "data-text-align": "left", "aria-pressed": target?.props.align === "left" ? "true" : "false" }),
    button(t("centro"), { "data-text-align": "center", "aria-pressed": target?.props.align === "center" ? "true" : "false" }),
    button(t("derecha"), { "data-text-align": "right", "aria-pressed": target?.props.align === "right" ? "true" : "false" }),
    el("label", { text: t("interlineado") }, [el("input", { id: "interlineado", type: "number", min: "0.8", max: "3", step: "0.05", value: String(target?.props.lineHeight ?? 1.15), "aria-label": t("interlineado") })]),
  ]);
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
    canAdd ? button("+", { id: shell === "video" ? "anadir-escena" : "anadir-pagina", "aria-label": shell === "video" ? t("anadirEscena") : t("anadirPagina") }) : null,
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

function bottomBar(ctx) {
  const { state, t } = ctx;
  const shell = shellOf(state.doc);
  const pages = state.doc.meta?.pages?.length || 1;
  const here = (state.page || 0) + 1;
  const pageLabel = ctx.lang === "en" ? `${here} of ${pages}` : `${here} de ${pages}`;
  const seconds = Math.max(0, Math.floor(Number(state.timerSeconds) || 0));
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const bits = [
    shell === "whiteboard" ? button(t("notas"), { id: "abrir-notas", "aria-pressed": state.notesOpen ? "true" : "false" }) : null,
    shell === "whiteboard" ? button(t("ampliarPizarra"), { id: "ampliar-pizarra" }) : null,
    shell === "whiteboard" ? button(state.timerOn ? t("parar") : t("temporizador"), { id: "temporizador" }) : null,
    shell === "whiteboard" && state.timerOn ? el("span", { id: "reloj", text: clock }) : null,
    button(t("ajustar"), { "data-zoom": "fit", "aria-pressed": state.zoom === "fit" ? "true" : "false" }),
    button("−", { "data-zoom": "out", "aria-label": t("menos") }),
    button(t("cien"), { "data-zoom": "100", "aria-pressed": state.zoom === "100" ? "true" : "false" }),
    button("+", { "data-zoom": "in", "aria-label": t("mas") }),
    el("span", { id: "paginas-indicador", text: pageLabel }),
    button(t("cuadricula"), { id: "cuadricula", "aria-pressed": state.grid ? "true" : "false" }),
    button(t("guias"), { id: "guias", "aria-pressed": state.guides ? "true" : "false" }),
    button(t("pantalla"), { id: "pantalla" }),
  ];
  return el("div", { class: "barra-inferior" }, bits);
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

export function renderEditor(ctx) {
  const { root, state, t } = ctx;
  const doc = state.doc;
  const shell = shellOf(doc);
  const name = el("input", { id: "nombre-diseno", type: "text", value: doc.name, maxlength: "80", "aria-label": t("nombre") });
  const fileMenu = state.fileMenu ? el("div", { class: "menu-archivo", id: "menu-archivo" }, [
    el("p", { text: `${doc.format.width}×${doc.format.height} px` }),
    button("Hacer una copia", { "data-duplicate": doc.id }),
    button(t("exportar"), { "data-export": doc.id }),
    button(t("importar"), { id: "importar-json" }),
    button(t("paquete"), { id: "exportar-paquete" }),
    button(t("importarPaquete"), { id: "importar-paquete" }),
    button(t("pdf"), { id: "abrir-pdf" }),
    state.status === "conflict" ? button(t("guardarCopia"), { id: "guardar-copia" }) : null,
    state.status === "cap" ? button(t("abrirRecuperado"), { id: "abrir-recuperado" }) : null,
  ]) : null;
  const editorClass = `editor${state.panelOpen ? "" : " panel-cerrado"}${state.inspectorOpen ? "" : " inspector-cerrado"}`;
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main orv-editor", id: "editor-app", "data-shell": shell }, [
      el("div", { class: "editor-bar" }, [
        button(t("menu"), { id: "menu-estudio", "aria-expanded": state.navOpen ? "true" : "false" }),
        button("Archivo", { id: "abrir-archivo" }),
        fileMenu,
        name,
        el("span", { id: "estado-guardado", "aria-live": "polite", text: ctx.statusText() }),
        button(t("deshacer"), { "data-action": "undo" }),
        button(t("rehacer"), { "data-action": "redo" }),
        button(t("medidaLienzo"), { id: "redimensionar" }),
        el("span", { class: "medidas-titulo", text: `${doc.format.width}×${doc.format.height}` }),
        button(t("abrirWork"), { id: "abrir-work" }),
        shell === "print" ? button(t("imprimir"), { id: "imprimir" }) : null,
        shell === "deck" ? button(t("presentar"), { id: "presentar" }) : null,
        shell === "web" || shell === "video" ? button(t("vistaPrevia"), { id: "vista-previa" }) : null,
        shell === "web" ? button(t("exportarHtml"), { id: "exportar-sitio" }) : null,
        button(state.panelOpen ? t("cerrarPanel") : t("recursos"), { id: "alternar-panel", "aria-pressed": state.panelOpen ? "true" : "false" }),
        button(state.inspectorOpen ? t("cerrarInspector") : t("posicion"), { id: "alternar-inspector", "aria-pressed": state.inspectorOpen ? "true" : "false" }),
      ]),
      textBar(ctx),
      shell === "video" ? el("p", { class: "nota", text: t("videoNota") }) : null,
      el("div", { class: editorClass }, [
        rail(ctx),
        state.panelOpen ? el("div", { class: "panel", id: "panel-riel" }, [panel(ctx)]) : null,
        el("div", { class: "escenario" }, [
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
  const bar = root.querySelector(".editor-bar");
  if (ctx.acciones && bar) bar.append(ctx.acciones);
  ctx.ensureQuality();
  void ctx.paintBackdrop();
  const slot = root.querySelector("#hueco-subida");
  const details = ctx.uploads;
  if (slot && details) slot.append(details);
}
