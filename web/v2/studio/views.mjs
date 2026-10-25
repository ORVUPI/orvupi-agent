/** Cromo de ORVUPI Studio. La pieza se queda en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { BRAND, FONTS, PRESETS, fontById, importProject, orderedLayers, overlappingIds } from "./lib/document.mjs";
import { IDEAS, PLANTILLAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import { listProjects } from "./lib/projects.mjs";
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

const STANDARD = ["plantillas", "elementos", "texto", "marca", "subidos", "herramientas", "proyectos", "fotos", "formas", "graficos", "fondo", "capas"];

export const RAILS = {
  design: STANDARD,
  deck: STANDARD,
  video: STANDARD,
  print: STANDARD,
  web: STANDARD,
  doc: ["plantillas", "elementos", "marca", "subidos", "proyectos", "fotos", "formas", "graficos", "capas"],
  whiteboard: STANDARD.filter((id) => id !== "fondo"),
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
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.8");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
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

function frame(side, main) {
  return el("div", { class: "orv-frame" }, [
    el("aside", { class: "orv-side", "aria-label": "ORVUPI Studio" }, [
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

const SEGUIR = ["deck-cierre", "deck-cita", "deck-tres", "red-fb-partido"];

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
const THUMB_SEGUIR = ["tpl-presentacion-02", "tpl-miniatura-youtube-03", "tpl-video-04", "tpl-negocio-03"];

function thumbLabel(item, lang) {
  return lang === "en" && item.titleEn ? item.titleEn : item.title;
}

function thumbCard(item, lang) {
  const node = button("", { class: "plantilla thumb-card", "data-thumb": item.id });
  const slot = el("span", { class: "mini-slot thumb-slot", style: `aspect-ratio:${item.width} / ${item.height}` });
  slot.append(el("img", { src: studioAsset(item.file), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
  node.append(slot, el("span", { class: "plantilla-nombre", text: thumbLabel(item, lang) }));
  return node;
}

function thumbBlank(ctx, formatId) {
  return blankCard(formatId, ctx.t("crearBlanco"));
}

function thumbSeguir(ctx) {
  const { t } = ctx;
  const projects = listProjects(ctx.storage).slice(0, 4);
  const cards = projects.length
    ? projects.map((item) => recentCard(item, t))
    : THUMB_SEGUIR.map((id) => THUMBS_BY_ID(id)).filter(Boolean).map((item) => thumbCard(item, ctx.lang));
  const more = button(t("verTodo"), { class: "ver-todo", "data-go": projects.length ? "disenos" : "plantillas", "data-thumb-cat": "" });
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") }), more]),
    el("div", { class: "seguir-grid" }, cards),
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
  const node = button("", {
    class: "cat-tile",
    "data-thumb-cat": cat.id,
    "data-go": "plantillas",
    "aria-pressed": state.thumbCat === cat.id ? "true" : "false",
  });
  const fondo = el("span", { class: "cat-fondo", style: `background:${PASTEL[index % PASTEL.length]}` });
  if (sample) {
    const slot = el("span", { class: "mini-slot thumb-slot", style: `aspect-ratio:${sample.width} / ${sample.height}` });
    slot.append(el("img", { src: studioAsset(sample.file), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
    fondo.append(slot);
  }
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

function seguirSection(ctx, shown) {
  const { t, lang } = ctx;
  const projects = listProjects(ctx.storage).slice(0, 4);
  const cards = projects.length
    ? projects.map((item) => recentCard(item, t))
    : SEGUIR.map((id) => {
      const item = PLANTILLAS.find((entry) => entry.id === id);
      if (!item) return null;
      shown.add(id);
      return templateCard(item, lang);
    }).filter(Boolean);
  const more = button(t("verTodo"), { class: "ver-todo", "data-go": projects.length ? "disenos" : "plantillas" });
  return el("section", { class: "carril-bloque" }, [
    el("div", { class: "carril-head" }, [el("h2", { text: t("seguir") }), more]),
    el("div", { class: "seguir-grid" }, cards),
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
      const item = layer.src?.kind === "catalog" ? catalogItem(layer.src.id) : null;
      if (item) frameNode.append(el("img", { src: studioAsset(item.archivo), alt: "", draggable: "false", loading: "lazy", decoding: "async" }));
      node.append(frameNode);
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

export function renderHome(ctx) {
  const { root, t } = ctx;
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main" }, [
      el("h1", { class: "hero-titulo", text: t("hero") }),
      catalogBody(ctx),
    ])),
    sizeDialog(ctx),
  );
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
  return `left:${layer.x}px;top:${layer.y}px;width:${layer.w}px;height:${layer.h}px;transform:rotate(${layer.rotation || 0}deg);opacity:${layer.opacity ?? 1};z-index:${layer.z};`;
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
  const art = el("div", { class: `stage-art${state.grid ? " cuadricula" : ""}` });
  art.style.width = `${doc.format.width}px`;
  art.style.height = `${doc.format.height}px`;
  art.style.background = doc.background.fill || BRAND.cream;
  const maxW = window.innerWidth < 900 ? Math.max(240, window.innerWidth - 36) : Math.max(280, window.innerWidth - 760);
  const maxH = Math.max(220, window.innerHeight - 300);
  const fit = Math.min(maxW / doc.format.width, maxH / doc.format.height, 1);
  state.scale = state.zoom === "100" ? 1 : fit;
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
    if (layer.type === "text") {
      const text = el("p", { class: "capa-texto", text: layer.props.text });
      text.style.fontFamily = fontById(layer.props.fontId).css;
      text.style.fontSize = `${layer.props.size}px`;
      text.style.color = layer.props.color;
      text.style.textAlign = layer.props.align;
      text.style.lineHeight = String(layer.props.lineHeight);
      node.append(text);
    } else if (layer.type === "image") node.append(imageNode(ctx, layer));
    else if (layer.type === "line") {
      const bar = el("div", { class: "capa-linea" });
      bar.style.background = layer.props.color;
      bar.style.height = `${Math.max(2, layer.props.strokeWidth || layer.h)}px`;
      node.append(bar);
    } else {
      const shape = el("div", { class: "capa-forma" });
      if (layer.props.fill) shape.style.background = layer.props.fill;
      if (layer.props.stroke && layer.props.strokeWidth) shape.style.border = `${layer.props.strokeWidth}px solid ${layer.props.stroke}`;
      node.append(shape);
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
      button(t("linea"), { "data-add": "line" }),
      ...["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"].map((id) => button(catalogItem(id)?.nombre?.[lang] || id, { "data-avatar": id })),
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
  if (state.rail === "subidos" || state.rail === "fotos") {
    const uploaded = doc.layers.filter((layer) => layer.src?.kind === "user");
    return el("div", {}, [
      el("div", { id: "hueco-subida" }),
      button(t("subir"), { id: "subir-imagen" }),
      uploaded.length ? el("ul", {}, uploaded.map((layer) => el("li", {}, [button(layer.name, { "data-pick": layer.id })]))) : el("p", { text: t("sinSubidas") }),
    ]);
  }
  if (state.rail === "graficos" || state.rail === "datos") {
    return el("div", { class: "rejilla" }, [
      button(t("barra"), { "data-add": "barra" }),
      button(t("punto"), { "data-add": "punto" }),
      button(t("forma"), { "data-add": "rect" }),
    ]);
  }
  if (state.rail === "notas") {
    return el("label", { text: t("notasPizarra") }, [
      el("textarea", { id: "notas-pizarra", text: doc.meta?.note || "" }),
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
  return el("div", {}, [
    el("div", { class: "chips" }, [["#FF3070", t("rosa")], ["#FFF8EC", t("crema")], ["#102032", t("azul")]].map(([hex, key]) => button(key, { "data-fondo": hex, style: swatchStyle(hex) }))),
    el("div", { class: "rejilla" }, fondos.map((item) => button(item.nombre[lang] || item.nombre.es, { "data-fondo-id": item.id }))),
  ]);
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
    el("p", { text: t("recorte") }),
    ...["x", "y", "w", "h"].map((key) => el("label", { text: key }, [el("input", { type: "number", "data-crop": key, value: layer.crop ? String(layer.crop[key]) : "" })])),
  ]) : null;
  const multi = state.selected.length > 1 ? el("div", { class: "chips" }, [
    button(t("agrupar"), { "data-action": "group" }),
    button(t("desagrupar"), { "data-action": "ungroup" }),
    button(t("bloquear"), { "data-action": "lock" }),
    button(t("duplicar"), { "data-action": "duplicate" }),
  ]) : null;
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
  return el("div", { id: "barra-texto", class: "barra-texto" }, [
    el("label", { class: "sr", text: t("texto") }),
    target ? el("textarea", { id: shell === "doc" ? "texto-capa" : undefined, class: shell === "doc" ? "" : "sr", text: target.props.text }) : el("p", { text: "Empieza a escribir." }),
    ...FONTS.map((font) => button(font[lang] || font.es, { "data-font": font.id, class: "chip", style: `font-family:${font.css}` })),
    button("−", { "data-size": "down" }),
    button("+", { "data-size": "up" }),
    button(t("izquierda"), { "data-align": "left" }),
    button(t("centro"), { "data-align": "center" }),
    button(t("derecha"), { "data-align": "right" }),
  ]);
}

function pageStrip(ctx) {
  const { state, t } = ctx;
  const shell = shellOf(state.doc);
  const pages = state.doc.meta?.pages?.length || 1;
  const withStrip = shell === "deck" || shell === "web" || shell === "design" || shell === "print";
  if (!withStrip) return null;
  const buttons = [];
  for (let index = 0; index < pages; index += 1) {
    buttons.push(button(String(index + 1), { "data-page": String(index), "aria-pressed": state.page === index ? "true" : "false" }));
  }
  const canAdd = shell !== "doc" && shell !== "whiteboard" && shell !== "video" && shell !== "web";
  return el("div", { id: "tira-paginas", class: "tira" }, [
    ...buttons,
    canAdd ? button("+", { id: "anadir-pagina", "aria-label": t("anadirPagina") }) : null,
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
    shell === "whiteboard" ? button(state.timerOn ? t("parar") : t("temporizador"), { id: "temporizador" }) : null,
    shell === "whiteboard" && state.timerOn ? el("span", { id: "reloj", text: clock }) : null,
    button(t("ajustar"), { "data-zoom": "fit", "aria-pressed": state.zoom === "fit" ? "true" : "false" }),
    button(t("cien"), { "data-zoom": "100", "aria-pressed": state.zoom === "100" ? "true" : "false" }),
    el("span", { id: "paginas-indicador", text: pageLabel }),
    button(t("cuadricula"), { id: "cuadricula", "aria-pressed": state.grid ? "true" : "false" }),
    button(t("pantalla"), { id: "pantalla" }),
  ];
  return el("div", { class: "barra-inferior" }, bits);
}

export function renderEditor(ctx) {
  const { root, state, t } = ctx;
  const doc = state.doc;
  const shell = shellOf(doc);
  const name = el("input", { id: "nombre-diseno", type: "text", value: doc.name, maxlength: "80", "aria-label": t("nombre") });
  const layer = primary(state);
  const textPanel = layer?.type === "text" && shell !== "doc"
    ? el("label", { text: t("texto") }, [el("textarea", { id: "texto-capa", text: layer.props.text })])
    : null;
  const fileMenu = state.fileMenu ? el("div", { class: "menu-archivo", id: "menu-archivo" }, [
    el("p", { text: `${doc.format.width}×${doc.format.height} px` }),
    button("Hacer una copia", { "data-duplicate": doc.id }),
    button(t("exportar"), { "data-export": doc.id }),
    button(t("importar"), { id: "importar-json" }),
  ]) : null;
  root.replaceChildren(
    frame(sideNav(ctx), el("div", { class: "orv-main orv-editor", id: "editor-app", "data-shell": shell }, [
      el("div", { class: "editor-bar" }, [
        button("Archivo", { id: "abrir-archivo" }),
        fileMenu,
        button("Redimensionar", { id: "redimensionar" }),
        name,
        el("span", { class: "medidas-titulo", text: `${doc.format.width}×${doc.format.height}` }),
        button(t("deshacer"), { "data-action": "undo" }),
        button(t("rehacer"), { "data-action": "redo" }),
        shell === "print" ? button(t("imprimir"), { id: "imprimir" }) : null,
        shell === "deck" ? button(t("presentar"), { id: "presentar" }) : null,
        shell === "web" || shell === "video" ? button(t("vistaPrevia"), { id: "vista-previa" }) : null,
        shell === "web" ? button(t("exportarSitio"), { id: "exportar-sitio" }) : null,
        el("span", { id: "estado-guardado", "aria-live": "polite", text: ctx.statusText() }),
      ]),
      textBar(ctx),
      shell === "video" ? el("p", { class: "nota", text: t("videoNota") }) : null,
      el("div", { class: "editor" }, [
        rail(ctx),
        el("div", { class: "panel", id: "panel-riel" }, [panel(ctx), textPanel]),
        el("div", { class: "escenario" }, [
          stageNode(ctx),
          shell === "web" ? button(t("anadirSeccion"), { id: "anadir-seccion", class: "anadir-seccion" }) : null,
          pageStrip(ctx),
          shell === "video" ? el("div", { id: "linea-tiempo" }, [
            button("▶", { id: "reproducir", "aria-label": "Vista previa" }),
            el("span", { text: "0:00" }),
            el("span", { class: "pista", text: "Fotograma" }),
            el("span", { text: "0:05" }),
          ]) : null,
          state.notesOpen ? el("label", { text: t("notas") }, [el("textarea", { id: "notas-pizarra", text: doc.meta?.note || "" })]) : null,
        ]),
        el("div", { class: "lado" }, [positionPanel(ctx), layersPanel(ctx)]),
      ]),
      bottomBar(ctx),
    ])),
    sizeDialog(ctx),
    state.preview ? el("dialog", { id: "dialogo-previa", open: "open" }, [
      el("h2", { text: t("vistaPrevia") }),
      el("p", { text: `${doc.name} · ${doc.format.width}×${doc.format.height} px` }),
      el("p", { text: t("previewNota") }),
      button(t("cerrar"), { id: "cerrar-previa" }),
    ]) : null,
  );
  const bar = root.querySelector(".editor-bar");
  if (ctx.acciones && bar) bar.append(ctx.acciones);
  ctx.ensureQuality();
  void ctx.paintBackdrop();
  const slot = root.querySelector("#hueco-subida");
  const details = ctx.uploads;
  if (slot && details) slot.append(details);
}
