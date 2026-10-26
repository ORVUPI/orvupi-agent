/** Mis diseños: biblioteca móvil. Los registros viven en orvupi-studio-projects. */

import { PRESETS } from "./lib/document.mjs";
import { isDesignRecord, libraryOf, listProjects } from "./lib/projects.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

const VIEWS = [
  ["todos", "Todos los proyectos", "All projects"],
  ["recientes", "Recientes", "Recent"],
  ["mios", "Mis proyectos", "My projects"],
  ["favoritos", "Favoritos", "Favorites"],
  ["compartidos", "Compartido conmigo", "Shared with me"],
  ["offline", "Disponible sin conexión", "Available offline"],
  ["enlaces", "Administrar enlaces", "Manage links"],
];

const TIPOS = [
  ["", "Cualquier tipo", "Any type"],
  ["design", "Diseños", "Designs"],
  ["template", "Plantillas de la marca", "Brand templates"],
  ["image", "Imágenes", "Images"],
  ["folder", "Carpetas", "Folders"],
  ["video", "Vídeos", "Videos"],
  ["file", "Archivos", "Files"],
];

const FECHAS = [
  ["", "Cualquier fecha", "Any date"],
  ["hoy", "Hoy", "Today"],
  ["7", "Últimos 7 días", "Last 7 days"],
  ["30", "Últimos 30 días", "Last 30 days"],
  ["year", "Este año", "This year"],
  ["last", "El año pasado", "Last year"],
];

const CATEGORIES = [
  ["doc", "Doc", "Doc"],
  ["ig", "Post de Instagram", "Instagram post"],
  ["story", "Historia", "Story"],
  ["square", "Publicación", "Post"],
  ["fb", "Post de Facebook", "Facebook post"],
  ["video", "Vídeo", "Video"],
  ["tiktok", "TikTok", "TikTok"],
  ["trifold", "Folleto", "Brochure"],
  ["poster", "Cartel", "Poster"],
  ["flyer", "Flyer", "Flyer"],
  ["deck", "Presentación", "Presentation"],
  ["cv", "Currículum", "Resume"],
  ["thumb", "Miniatura de YouTube", "YouTube thumbnail"],
  ["logo", "Logo", "Logo"],
  ["invite", "Invitación", "Invitation"],
  ["card", "Tarjeta de visita", "Business card"],
  ["info", "Infografía", "Infographic"],
  ["board", "Pizarra", "Whiteboard"],
  ["web", "Sitio web", "Website"],
  ["email", "Correo", "Email"],
  ["sheet", "Hoja", "Sheet"],
  ["x", "Post para X", "X post"],
  ["li", "Post de LinkedIn", "LinkedIn post"],
  ["bio", "Enlace en la biografía", "Link in bio"],
  ["collage", "Collage", "Collage"],
  ["code", "Pieza de código", "Code piece"],
];

const CREATE_GROUPS = [
  ["para-ti", "Para ti", "For you", ["square", "story", "ig", "doc", "deck", "video", "logo", "flyer"]],
  ["redes", "Redes sociales", "Social", ["ig", "story", "square", "fb", "li", "x", "tiktok", "thumb"]],
  ["docs", "Documentos", "Docs", ["doc", "cv", "deck", "email", "sheet", "web"]],
  ["print", "Impresión", "Print", ["flyer", "poster", "trifold", "invite", "card", "info"]],
];

const FEATURES = [
  ["ia", "ORVUPI IA", "ORVUPI AI"],
  ["deck", "Presentación", "Presentation"],
  ["doc", "Doc", "Doc"],
  ["board", "Pizarra", "Whiteboard"],
  ["video", "Vídeo", "Video"],
  ["logo", "Logo", "Logo"],
];

const PHOTO_TILES = [
  ["Papel", "Paper", "#f3eee6"],
  ["Agua", "Water", "#d7e7f6"],
  ["Campo", "Field", "#d9efd4"],
  ["Flores", "Flowers", "#f8d5e4"],
  ["Azul", "Blue", "#d9e0f8"],
  ["Minimal", "Minimal", "#ececf1"],
];

const SHORT = {
  doc: ["Doc", "Doc"],
  ig: ["Post IG", "IG post"],
  story: ["Historia", "Story"],
  square: ["Post", "Post"],
  fb: ["Facebook", "Facebook"],
  video: ["Vídeo", "Video"],
  tiktok: ["TikTok", "TikTok"],
  trifold: ["Folleto", "Brochure"],
  poster: ["Cartel", "Poster"],
  flyer: ["Flyer", "Flyer"],
  deck: ["Presentación", "Presentation"],
  cv: ["Currículum", "Resume"],
  thumb: ["Miniatura", "Thumbnail"],
  logo: ["Logo", "Logo"],
  invite: ["Invitación", "Invitation"],
  card: ["Tarjeta", "Card"],
  info: ["Infografía", "Infographic"],
  board: ["Pizarra", "Whiteboard"],
  web: ["Sitio", "Website"],
  email: ["Correo", "Email"],
  sheet: ["Hoja", "Sheet"],
  x: ["Post X", "X post"],
  li: ["LinkedIn", "LinkedIn"],
  bio: ["Bio", "Bio"],
};

function tr(ctx, es, en) {
  return ctx.lang === "en" ? en : es;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "style") node.style.cssText = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(text, attrs = {}) {
  return el("button", { type: "button", ...attrs, text });
}

function icon(paths, size = 22) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
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

function dots() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("aria-hidden", "true");
  for (const cy of [6, 12, 18]) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", "1.5");
    circle.setAttribute("fill", "currentColor");
    svg.append(circle);
  }
  return svg;
}

function pair(list, id, lang) {
  const row = list.find((item) => item[0] === id);
  if (!row) return "";
  return lang === "en" ? row[2] : row[1];
}

function viewTitle(ctx) {
  return pair(VIEWS, ctx.state.designView || "todos", ctx.lang) || tr(ctx, "Todos los proyectos", "All projects");
}

function itemsOf(ctx) {
  return listProjects(ctx.storage);
}

function liveItems(ctx) {
  return itemsOf(ctx).filter((item) => !libraryOf(item).deletedAt);
}

function byDate(list) {
  return [...list].sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
}

function tipoOf(item) {
  const lib = libraryOf(item);
  if (lib.kind === "folder" || lib.kind === "course") return "folder";
  if (lib.kind === "image") return "image";
  if (lib.kind === "video") return "video";
  if (lib.kind === "file") return "file";
  if (lib.template) return "template";
  const format = item.format?.id;
  if (format === "video" || format === "tiktok") return "video";
  if (isDesignRecord(item)) return "design";
  return "file";
}

function matchesFecha(iso, key) {
  if (!key) return true;
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return false;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (key === "hoy") return time >= start;
  if (key === "7") return time >= start - 6 * 86400000;
  if (key === "30") return time >= start - 29 * 86400000;
  if (key === "year") return new Date(time).getFullYear() === now.getFullYear();
  if (key === "last") return new Date(time).getFullYear() === now.getFullYear() - 1;
  return true;
}

function filtering(state) {
  return Boolean(
    String(state.designQuery || "").trim()
    || state.designTipo
    || state.designCategoria
    || state.designTitular
    || state.designFecha,
  );
}

function matches(item, state) {
  const lib = libraryOf(item);
  const q = String(state.designQuery || "").trim().toLowerCase();
  if (q && !String(item.name || "").toLowerCase().includes(q)) return false;
  if (state.designTipo && tipoOf(item) !== state.designTipo) return false;
  if (state.designCategoria && item.format?.id !== state.designCategoria) return false;
  if (state.designTitular === "otro") return false;
  if (!matchesFecha(item.updatedAt, state.designFecha || "")) return false;
  if (lib.inbound && state.designView === "compartidos") return true;
  return true;
}

function poolFor(ctx) {
  const view = ctx.state.designView || "todos";
  const live = byDate(liveItems(ctx));
  if (view === "favoritos") return live.filter((item) => libraryOf(item).favorite);
  if (view === "offline") return live.filter((item) => libraryOf(item).offline);
  if (view === "enlaces") return live.filter((item) => libraryOf(item).access === "link");
  if (view === "compartidos") return live.filter((item) => libraryOf(item).inbound);
  if (view === "mios") return live.filter((item) => !["folder", "course"].includes(libraryOf(item).kind));
  if (view === "recientes") return live;
  return live.filter((item) => !libraryOf(item).folderId);
}

function shortType(ctx, item) {
  const lib = libraryOf(item);
  if (lib.kind === "folder") return tr(ctx, "Carpeta", "Folder");
  if (lib.kind === "course") return tr(ctx, "Curso", "Course");
  if (lib.kind === "image") return tr(ctx, "Imagen", "Image");
  if (lib.kind === "video") return tr(ctx, "Vídeo", "Video");
  if (lib.kind === "file") return tr(ctx, "Archivo", "File");
  if (lib.template) return tr(ctx, "Plantilla", "Template");
  const id = item.format?.id || "";
  if (SHORT[id]) return ctx.lang === "en" ? SHORT[id][1] : SHORT[id][0];
  const preset = PRESETS.find((entry) => entry.id === id);
  if (preset) return ctx.lang === "en" ? preset.en : preset.es;
  return tr(ctx, "Diseño", "Design");
}

function accessWord(ctx, item) {
  return libraryOf(item).access === "link" ? tr(ctx, "Enlace", "Link") : tr(ctx, "Privado", "Private");
}

function wash(item) {
  const lib = item?.library && typeof item.library === "object" ? item.library : libraryOf(item);
  if (lib.kind === "course") return "#d7f3ea";
  if (lib.kind === "folder") return "#f8e7b0";
  if (lib.kind === "image") return "#f8d5e8";
  if (lib.kind === "video" || item?.format?.id === "video" || item?.format?.id === "tiktok") return "#d5e4ff";
  if (lib.kind === "file") return "#e7e8ee";
  if (lib.template) return "#e4d4ff";
  const tones = {
    doc: "#e4ecfa",
    deck: "#ede4ff",
    cv: "#e7f6ef",
    poster: "#ffe4d6",
    ig: "#fde4f2",
    story: "#e4f0ff",
    flyer: "#fff0d6",
    logo: "#f3e8ff",
    fb: "#e7f0ff",
    thumb: "#ffe9d6",
  };
  return tones[item?.format?.id] || "#ede4ff";
}

function glyph(item) {
  const kind = tipoOf(item);
  if (libraryOf(item).kind === "course") return ["M4 9l8-4 8 4-8 4-8-4z", "M8 11.5V16c2 1.4 6 1.4 8 0v-4.5"];
  if (kind === "folder") return ["M3 7h6l2 2h10v9H3z"];
  if (kind === "image") return ["M4 6h16v12H4z", "M8 14l2.5-2.5L13 14l2-2 3 3"];
  if (kind === "video") return ["M8 7l9 5-9 5z"];
  if (kind === "file") return ["M7 3h7l4 4v14H7z", "M14 3v4h4"];
  return ["M7 3h7l4 4v14H7z", "M14 3v4h4", "M9 12h6", "M9 16h4"];
}

function face(item, className) {
  const node = el("span", { class: className, style: `background:${wash(item)};color:#4c3d73` });
  node.append(icon(glyph(item), className.includes("lg") ? 28 : 22));
  return node;
}

function itemName(item) {
  const name = String(item?.name || "").trim();
  return name || "Sin título";
}

function searchField(ctx, id, value, placeholder) {
  return el("label", { class: "canva-search md-search" }, [
    el("span", { class: "sr", text: tr(ctx, "Buscar", "Search") }),
    icon(["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z", "M20 20l-3.5-3.5"], 18),
    el("input", {
      id,
      type: "search",
      value: value || "",
      placeholder,
      autocomplete: "off",
      "aria-label": tr(ctx, "Buscar", "Search"),
    }),
    value ? button("×", { class: "canva-clear md-plain", "data-design-clear": id === "buscar" ? "query" : "create-query", "aria-label": tr(ctx, "Limpiar", "Clear") }) : null,
  ]);
}

function chip(ctx, key, label, active) {
  const node = el("span", { class: active ? "md-chip is-on" : "md-chip" });
  node.append(button(label, {
    class: "md-chip-hit md-plain",
    "data-design-sheet": key,
    "aria-pressed": active ? "true" : "false",
  }));
  if (active) {
    node.append(button("×", {
      class: "md-chip-x md-plain",
      "data-design-clear": key,
      "aria-label": tr(ctx, `Quitar ${label}`, `Clear ${label}`),
    }));
  }
  return node;
}

function chipLabel(ctx, key) {
  const { state, lang } = ctx;
  if (key === "tipo") return state.designTipo ? pair(TIPOS, state.designTipo, lang) : tr(ctx, "Tipo", "Type");
  if (key === "categoria") {
    return state.designCategoria ? pair(CATEGORIES, state.designCategoria, lang) : tr(ctx, "Categoría", "Category");
  }
  if (key === "titular") return state.designTitular ? tr(ctx, "Tú", "You") : tr(ctx, "Titular", "Owner");
  if (key === "fecha") return state.designFecha ? pair(FECHAS, state.designFecha, lang) : tr(ctx, "Fecha de modificación", "Date modified");
  return key;
}

function chips(ctx) {
  const { state } = ctx;
  return el("div", { class: "md-chips", role: "group", "aria-label": tr(ctx, "Filtros", "Filters") }, [
    chip(ctx, "tipo", chipLabel(ctx, "tipo"), Boolean(state.designTipo)),
    chip(ctx, "categoria", chipLabel(ctx, "categoria"), Boolean(state.designCategoria)),
    chip(ctx, "titular", chipLabel(ctx, "titular"), Boolean(state.designTitular)),
    chip(ctx, "fecha", chipLabel(ctx, "fecha"), Boolean(state.designFecha)),
  ]);
}

function topBar(ctx, title, mode) {
  const open = ctx.state.designSheet === "views";
  const titleBtn = button("", {
    class: "md-title md-plain",
    "data-design-sheet": mode === "library" ? "views" : null,
    "data-design-back": mode === "library" ? null : mode,
    "aria-expanded": mode === "library" ? (open ? "true" : "false") : null,
    "aria-haspopup": mode === "library" ? "dialog" : null,
    "aria-label": mode === "library" ? title : tr(ctx, "Volver", "Back"),
  });
  if (mode === "library") {
    const chevron = icon(["M6 9l6 6 6-6"], 16);
    chevron.classList.add("md-chevron");
    titleBtn.append(el("span", { class: "md-title-text", text: title }), chevron);
  } else {
    titleBtn.append(icon(["M15 6l-6 6 6 6"], 22), el("span", { class: "md-title-text", text: title }));
  }
  const plus = mode === "create" ? null : button("", {
    class: "md-plus md-plain",
    "data-design-sheet": "add",
    "aria-label": tr(ctx, "Crear", "Create"),
    "aria-expanded": ctx.state.designSheet === "add" ? "true" : "false",
    "aria-haspopup": "dialog",
  });
  if (plus) plus.append(icon(["M12 5v14", "M5 12h14"], 22));
  return el("header", { class: "md-top" }, [el("div", { class: "md-top-bar" }, [titleBtn, plus])]);
}

function layoutToggle(ctx) {
  const grid = ctx.state.designLayout === "grid";
  const node = button("", {
    class: "md-layout md-plain",
    "data-design-layout": grid ? "list" : "grid",
    "aria-pressed": grid ? "true" : "false",
    "aria-label": tr(ctx, grid ? "Ver como lista" : "Ver como cuadrícula", grid ? "View as list" : "View as grid"),
  });
  node.append(icon(grid
    ? ["M5 7h14", "M5 12h14", "M5 17h14"]
    : ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"], 18));
  return node;
}

function moreBtn(ctx, id) {
  const node = button("", {
    class: "md-more md-plain",
    "data-design-menu": id,
    "aria-label": tr(ctx, "Más opciones", "More options"),
    "aria-haspopup": "dialog",
  });
  node.append(dots());
  return node;
}

function checkBtn(ctx, id, on) {
  const node = button("", {
    class: on ? "md-checkbtn md-plain is-on" : "md-checkbtn md-plain",
    "data-design-open": id,
    "aria-pressed": on ? "true" : "false",
    "aria-label": tr(ctx, "Seleccionar", "Select"),
  });
  node.append(icon(on ? ["M5 12l5 5L20 7"] : ["M6 6h12v12H6z"], 18));
  return node;
}

function listRow(ctx, item) {
  const select = ctx.state.designSelect;
  const on = (ctx.state.designSelected || []).includes(item.id);
  const open = button("", {
    class: "md-open md-plain",
    "data-design-open": item.id,
  });
  open.append(
    face(item, "md-thumb"),
    el("span", { class: "md-copy" }, [
      el("strong", { text: itemName(item) }),
      el("span", { class: "md-sub", text: `${accessWord(ctx, item)} • ${shortType(ctx, item)}` }),
    ]),
  );
  return el("li", { class: on ? "md-item is-on" : "md-item" }, [
    open,
    select ? checkBtn(ctx, item.id, on) : moreBtn(ctx, item.id),
  ]);
}

function gridCard(ctx, item) {
  const select = ctx.state.designSelect;
  const on = (ctx.state.designSelected || []).includes(item.id);
  const open = button("", { class: "md-open md-plain", "data-design-open": item.id });
  open.append(face(item, "md-grid-face"));
  return el("article", { class: on ? "md-grid-card is-on" : "md-grid-card" }, [
    open,
    select ? checkBtn(ctx, item.id, on) : moreBtn(ctx, item.id),
    el("strong", { text: itemName(item) }),
    el("span", { class: "md-sub", text: `${accessWord(ctx, item)} • ${shortType(ctx, item)}` }),
  ]);
}

function itemList(ctx, items) {
  if (ctx.state.designLayout === "grid") return el("div", { class: "md-grid" }, items.map((item) => gridCard(ctx, item)));
  return el("ul", { class: "md-list" }, items.map((item) => listRow(ctx, item)));
}

function recentCard(item) {
  const open = button("", { class: "md-recent md-plain", "data-design-open": item.id });
  open.append(face(item, "md-recent-face"), el("span", { class: "md-recent-name", text: itemName(item) }));
  return open;
}

function noResults(ctx) {
  return el("div", { class: "md-empty md-empty-plain" }, [
    el("h2", { text: tr(ctx, "No hay resultados", "No results") }),
    el("p", { text: tr(ctx, "Prueba a cambiar la búsqueda o quitar los filtros.", "Try another search or clear the filters.") }),
    button(tr(ctx, "Quitar filtros", "Clear filters"), { class: "md-textbtn md-plain", "data-design-clear": "all" }),
  ]);
}

function scene(paths, tone) {
  const wrap = el("div", { class: `md-art is-${tone}`, "aria-hidden": "true" });
  wrap.append(icon(paths, 72));
  return wrap;
}

function specialEmpty(ctx, view) {
  if (view === "favoritos") {
    return el("div", { class: "md-empty" }, [
      scene(["M12 3l2.4 5.8L20.5 10l-4.4 3.8L17.2 20 12 17.2 6.8 20l1.1-6.2L3.5 10l6.1-1.2z"], "fav"),
      el("h2", { text: tr(ctx, "Esta página tiene mucho potencial", "This page has a lot of potential") }),
      el("p", { text: tr(ctx, "Los elementos que añadas a Favoritos aparecerán aquí.", "Items you add to Favorites will show up here.") }),
    ]);
  }
  if (view === "compartidos") {
    return el("div", { class: "md-empty" }, [
      scene(["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3.5 19a5 5 0 0 1 9 0", "M12 19a5 5 0 0 1 8.5 0"], "share"),
      el("h2", { text: tr(ctx, "Todavía no han compartido nada contigo", "Nothing has been shared with you yet") }),
      el("p", { text: tr(ctx, "Cuando alguien comparta un diseño, aparecerá aquí.", "When someone shares a design, it will show up here.") }),
    ]);
  }
  if (view === "enlaces") {
    return el("div", { class: "md-empty" }, [
      scene(["M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10 5.9", "M14 11a5 5 0 0 0-7.1 0L5.5 12.4a5 5 0 0 0 7.1 7.1L14 18.1"], "link"),
      el("h2", { text: tr(ctx, "No hay enlaces para administrar", "No links to manage") }),
      el("p", { text: tr(ctx, "Cuando compartas un diseño con enlace, lo verás aquí.", "Designs you share by link will show up here.") }),
    ]);
  }
  return null;
}

function plainEmpty(ctx, view) {
  const copy = {
    todos: ["Todavía no hay elementos.", "Nothing here yet."],
    recientes: ["No hay diseños recientes.", "No recent designs."],
    mios: ["Todavía no has creado proyectos.", "You have not created projects yet."],
    offline: ["Todavía no hay diseños marcados.", "No designs are marked yet."],
  }[view] || ["Todavía no hay elementos.", "Nothing here yet."];
  return el("p", { class: "md-quiet", text: tr(ctx, copy[0], copy[1]) });
}

function selectBar(ctx) {
  if (!ctx.state.designSelect) return null;
  const n = (ctx.state.designSelected || []).length;
  const label = n === 1
    ? tr(ctx, "1 seleccionado", "1 selected")
    : tr(ctx, `${n} seleccionados`, `${n} selected`);
  return el("div", { class: "md-selectbar" }, [
    button(tr(ctx, "Cancelar", "Cancel"), { class: "md-textbtn md-plain", "data-design-action": "select-cancel" }),
    el("strong", { text: label }),
    button(tr(ctx, "Mover", "Move"), { class: "md-textbtn md-plain", "data-design-action": "select-move" }),
    button(tr(ctx, "Papelera", "Trash"), { class: "md-textbtn md-plain", "data-design-action": "select-trash" }),
  ]);
}

function notice(ctx) {
  const text = ctx.state.designNotice || "";
  if (!text) return null;
  const undo = (ctx.state.designUndo || []).length;
  return el("div", { class: "md-notice", role: "status" }, [
    el("span", { text }),
    undo ? button(tr(ctx, "Deshacer", "Undo"), { class: "md-textbtn md-plain", "data-design-undo": "1" }) : null,
  ]);
}

function placeholderFor(ctx) {
  const view = ctx.state.designView || "todos";
  const names = {
    todos: ["Buscar en todos los proyectos", "Search all projects"],
    recientes: ["Buscar en recientes", "Search recent"],
    mios: ["Buscar en mis proyectos", "Search my projects"],
    favoritos: ["Buscar en favoritos", "Search favorites"],
    compartidos: ["Buscar en compartidos", "Search shared"],
    offline: ["Buscar sin conexión", "Search offline"],
    enlaces: ["Buscar enlaces", "Search links"],
  };
  const pairCopy = names[view] || names.todos;
  return tr(ctx, pairCopy[0], pairCopy[1]);
}

function libraryBody(ctx) {
  const view = ctx.state.designView || "todos";
  const state = ctx.state;
  const narrowed = filtering(state);
  const allLive = byDate(liveItems(ctx));
  let list = poolFor(ctx).filter((item) => matches(item, state));
  const kids = [
    topBar(ctx, viewTitle(ctx), "library"),
    searchField(ctx, "buscar", state.designQuery || "", placeholderFor(ctx)),
    chips(ctx),
  ];
  if (view === "offline") {
    kids.push(el("section", { class: "md-offline-intro" }, [
      scene(["M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.2A3.6 3.6 0 0 0 7 18z", "M12 12v4", "M12 18h.01"], "offline"),
      el("h2", { text: tr(ctx, "Disponible sin conexión", "Available offline") }),
      el("p", { text: tr(ctx, "Los diseños que marques se quedan en este navegador. Ábrelos desde esta lista.", "Designs you mark stay in this browser. Open them from this list.") }),
      button(tr(ctx, "Ajustes", "Settings"), { class: "md-settings md-plain", "data-design-sheet": "offline-settings" }),
    ]));
  }
  if (view === "todos" && !narrowed) {
    const recent = allLive.slice(0, 4);
    kids.push(el("section", { class: "md-block", "aria-label": tr(ctx, "Recientes", "Recent") }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: tr(ctx, "Recientes", "Recent") })]),
      recent.length ? el("div", { class: "md-recent-row" }, recent.map(recentCard)) : el("p", { class: "md-quiet", text: tr(ctx, "Tus diseños recientes aparecerán aquí.", "Your recent designs will show up here.") }),
      recent.length ? button(tr(ctx, "Ver todos los recientes", "See all recent"), { class: "md-see md-plain", "data-design-view": "recientes" }) : null,
    ]));
    kids.push(el("section", { class: "md-block" }, [
      el("div", { class: "md-section-head" }, [
        el("h2", { text: tr(ctx, "Todos los elementos", "All items") }),
        layoutToggle(ctx),
      ]),
      list.length ? itemList(ctx, list) : plainEmpty(ctx, "todos"),
    ]));
  } else if (!list.length && narrowed) {
    kids.push(noResults(ctx));
  } else if (!list.length) {
    const special = specialEmpty(ctx, view);
    kids.push(special || plainEmpty(ctx, view));
  } else {
    const heading = view === "todos" ? tr(ctx, "Todos los elementos", "All items") : viewTitle(ctx);
    kids.push(el("section", { class: "md-block" }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: heading }), layoutToggle(ctx)]),
      itemList(ctx, list),
    ]));
  }
  kids.push(selectBar(ctx), notice(ctx));
  return kids;
}

function folderBody(ctx) {
  const folder = itemsOf(ctx).find((item) => item.id === ctx.state.designFolder);
  if (!folder || libraryOf(folder).deletedAt) {
    return [
      topBar(ctx, tr(ctx, "Carpeta", "Folder"), "folder"),
      el("div", { class: "md-empty" }, [
        el("h2", { text: tr(ctx, "No encontramos esa carpeta", "We could not find that folder") }),
        button(tr(ctx, "Volver", "Back"), { class: "md-textbtn md-plain", "data-design-back": "folder" }),
      ]),
    ];
  }
  const lib = libraryOf(folder);
  const course = lib.kind === "course";
  const tab = ctx.state.designTab === "seguimiento" ? "seguimiento" : "curso";
  const kids = childrenOf(ctx, folder.id).filter((item) => matches(item, ctx.state));
  const body = [
    topBar(ctx, itemName(folder), "folder"),
    searchField(ctx, "buscar", ctx.state.designQuery || "", tr(ctx, "Buscar en la carpeta", "Search in the folder")),
    filtering(ctx.state) ? chips(ctx) : null,
    el("section", { class: course ? "md-banner is-course" : "md-banner" }, [
      face(folder, "md-banner-mark"),
      el("h2", { text: itemName(folder) }),
      el("p", { text: course ? tr(ctx, "Curso", "Course") : tr(ctx, "Carpeta", "Folder") }),
    ]),
  ];
  if (course) {
    body.push(el("div", { class: "md-tabs", role: "tablist" }, [
      button(tr(ctx, "Curso", "Course"), {
        class: "md-tab md-plain",
        "data-design-tab": "curso",
        role: "tab",
        "aria-selected": tab === "curso" ? "true" : "false",
      }),
      button(tr(ctx, "Seguimiento", "Progress"), {
        class: "md-tab md-plain",
        "data-design-tab": "seguimiento",
        role: "tab",
        "aria-selected": tab === "seguimiento" ? "true" : "false",
      }),
    ]));
  }
  if (!course || tab === "curso") {
    body.push(el("label", { class: "md-desc", text: tr(ctx, "Descripción", "Description") }, [
      el("textarea", {
        id: "curso-desc",
        rows: "3",
        placeholder: tr(ctx, "Añade una descripción", "Add a description"),
      }),
    ]));
    body.push(el("section", { class: "md-block" }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: course ? tr(ctx, "Actividades", "Activities") : tr(ctx, "Elementos", "Items") })]),
      filtering(ctx.state) && !kids.length ? noResults(ctx) : kids.length ? itemList(ctx, kids) : el("p", { class: "md-quiet", text: tr(ctx, "Esta carpeta está vacía.", "This folder is empty.") }),
    ]));
  } else {
    body.push(el("section", { class: "md-block" }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: tr(ctx, "Seguimiento", "Progress") })]),
      el("p", { class: "md-quiet", text: tr(ctx, "Marca cada actividad cuando la completes. El avance se queda en este navegador.", "Mark each activity when you finish it. Progress stays in this browser.") }),
      kids.length ? el("ul", { class: "md-track" }, kids.map((item) => trackRow(ctx, item))) : el("p", { class: "md-quiet", text: tr(ctx, "Todavía no hay actividades.", "No activities yet.") }),
    ]));
  }
  body.push(selectBar(ctx), notice(ctx));
  return body;
}

function childrenOf(ctx, id) {
  return byDate(liveItems(ctx).filter((item) => libraryOf(item).folderId === id));
}

function trackRow(ctx, item) {
  const done = libraryOf(item).done;
  return el("li", {}, [
    button(done ? tr(ctx, "Hecho", "Done") : tr(ctx, "Pendiente", "To do"), {
      class: done ? "md-done md-plain is-on" : "md-done md-plain",
      "data-design-done": item.id,
      "aria-pressed": done ? "true" : "false",
    }),
    el("span", { text: itemName(item) }),
  ]);
}

function presetById(id) {
  return PRESETS.find((item) => item.id === id) || null;
}

function formatCard(ctx, preset) {
  const ratio = Math.max(0.45, Math.min(1.4, preset.width / preset.height));
  const node = button("", { class: "md-format md-plain", "data-format": preset.id, "aria-label": ctx.lang === "en" ? preset.en : preset.es });
  node.append(
    el("span", { class: "md-format-face", style: `aspect-ratio:${ratio};background:${wash({ format: { id: preset.id }, library: { kind: "design" } })}` }),
    el("span", { class: "md-format-name", text: ctx.lang === "en" ? preset.en : preset.es }),
  );
  return node;
}

function createBody(ctx) {
  const q = String(ctx.state.designCreateQuery || "").trim().toLowerCase();
  const kids = [
    topBar(ctx, tr(ctx, "Crear un diseño", "Create a design"), "create"),
    searchField(ctx, "md-crear-buscar", ctx.state.designCreateQuery || "", tr(ctx, "¿Qué te gustaría crear?", "What would you like to create?")),
  ];
  if (!q) {
    kids.push(el("div", { class: "md-features" }, FEATURES.map(([id, es, en]) => {
      const node = button("", {
        class: "md-feature md-plain",
        "data-go": id === "ia" ? "ia" : null,
        "data-format": id === "ia" ? null : id,
        "aria-label": tr(ctx, es, en),
      });
      node.append(
        el("span", { class: `md-feature-bubble is-${id}` }, [icon(id === "ia" ? ["M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z"] : ["M6 4h12v16H6z"], 22)]),
        el("span", { text: tr(ctx, es, en) }),
      );
      return node;
    })));
  }
  for (const [id, es, en, ids] of CREATE_GROUPS) {
    const presets = ids.map(presetById).filter(Boolean).filter((preset) => {
      if (!q) return true;
      return `${preset.es} ${preset.en} ${preset.id}`.toLowerCase().includes(q);
    });
    if (!presets.length) continue;
    kids.push(el("section", { class: "md-block", "data-create-group": id }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: tr(ctx, es, en) })]),
      el("div", { class: "md-carousel" }, presets.map((preset) => formatCard(ctx, preset))),
    ]));
  }
  if (!q || /foto|photo/.test(q)) {
    kids.push(el("section", { class: "md-block" }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: tr(ctx, "Fotos", "Photos") })]),
      el("div", { class: "md-carousel" }, PHOTO_TILES.map(([es, en, color]) => {
        const node = button("", { class: "md-photo md-plain", "data-go": "fotos", "aria-label": tr(ctx, es, en) });
        node.append(el("span", { class: "md-photo-face", style: `background:${color}` }), el("span", { text: tr(ctx, es, en) }));
        return node;
      })),
    ]));
  }
  const customHit = !q || /personal|custom|tama|size/.test(q);
  if (customHit) {
    kids.push(el("section", { class: "md-block md-custom" }, [
      el("div", { class: "md-section-head" }, [el("h2", { text: tr(ctx, "Tamaño personalizado", "Custom size") })]),
      el("div", { class: "md-measures" }, [
        el("label", { text: tr(ctx, "Ancho", "Width") }, [el("input", { id: "md-ancho", type: "number", min: "64", max: "2048", value: "1080" })]),
        el("label", { text: tr(ctx, "Alto", "Height") }, [el("input", { id: "md-alto", type: "number", min: "64", max: "2048", value: "1080" })]),
      ]),
      el("p", { class: "md-quiet", text: tr(ctx, "Entre 64 y 2048 px.", "Between 64 and 2048 px.") }),
      button(tr(ctx, "Crear diseño", "Create design"), { class: "md-primary", "data-design-custom": "1" }),
    ]));
  }
  if (q && kids.length <= 2) kids.push(noResults(ctx));
  kids.push(notice(ctx));
  return kids;
}

function grab() {
  return el("span", { class: "lib-grab md-grab" });
}

function closeBtn(ctx) {
  const node = button("", { class: "lib-x md-plain", "data-design-close": "1", "aria-label": tr(ctx, "Cerrar", "Close") });
  node.append(icon(["M7 7l10 10", "M17 7L7 17"], 18));
  return node;
}

function sheetHead(ctx, title) {
  return el("div", { class: "lib-sheet-head" }, [el("h2", { text: title }), closeBtn(ctx)]);
}

function optionRow(label, attrs, on) {
  return button(label, {
    class: "md-row md-plain",
    "aria-pressed": on ? "true" : "false",
    ...attrs,
  });
}

function actionRow(label, action, paths) {
  const node = button("", { class: "md-row md-plain", "data-design-action": action });
  node.append(icon(paths, 22), el("span", { text: label }));
  return node;
}

function layer(label, body, modal) {
  return el("div", { class: modal ? "md-layer md-modal-layer" : "lib-layer md-layer", role: "presentation" }, [
    button("", { class: "lib-overlay", "data-design-close": "1", "aria-label": label }),
    el("div", {
      class: modal ? "md-modal" : "lib-sheet md-sheet",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": label,
    }, modal ? body : [grab(), ...body]),
  ]);
}

function viewsSheet(ctx) {
  const current = ctx.state.designView || "todos";
  const rows = VIEWS.map(([id, es, en]) => button(tr(ctx, es, en), {
    class: "md-row md-plain",
    "data-design-view": id,
    "aria-current": current === id ? "true" : "false",
  }));
  return layer(tr(ctx, "Vistas", "Views"), [
    el("h2", { class: "sr", text: tr(ctx, "Vistas", "Views") }),
    ...rows,
  ]);
}

function addSheet(ctx) {
  const rows = [
    ["folder", tr(ctx, "Nueva carpeta", "New folder"), ["M3 7h6l2 2h10v9H3z"], "folder"],
    ["course", tr(ctx, "Curso nuevo", "New course"), ["M4 9l8-4 8 4-8 4-8-4z", "M8 11.5V16c2 1.4 6 1.4 8 0v-4.5"], "course"],
    ["create", tr(ctx, "Diseño", "Design"), ["M6 4h12v16H6z", "M12 8v8", "M8 12h8"], ""],
    ["upload", tr(ctx, "Subir archivos", "Upload files"), ["M12 16V6", "M8 9l4-4 4 4", "M5 19h14"], ""],
    ["import", tr(ctx, "Importar", "Import"), ["M12 4v10", "M8 10l4 4 4-4", "M5 19h14"], ""],
  ];
  return layer(tr(ctx, "Crear", "Create"), rows.map(([action, label, paths, draft]) => {
    if (draft) {
      const node = button("", {
        class: "md-row md-plain",
        "data-design-sheet": "new-folder",
        "data-design-draft": draft,
      });
      node.append(icon(paths, 22), el("span", { text: label }));
      return node;
    }
    return actionRow(label, action, paths);
  }));
}

function choiceSheet(ctx, title, rows) {
  return layer(title, [sheetHead(ctx, title), ...rows]);
}

function tipoSheet(ctx) {
  return choiceSheet(ctx, tr(ctx, "Tipo", "Type"), TIPOS.map(([id, es, en]) => optionRow(tr(ctx, es, en), { "data-design-tipo": id }, (ctx.state.designTipo || "") === id)));
}

function fechaSheet(ctx) {
  return choiceSheet(ctx, tr(ctx, "Fecha de modificación", "Date modified"), FECHAS.map(([id, es, en]) => optionRow(tr(ctx, es, en), { "data-design-fecha": id }, (ctx.state.designFecha || "") === id)));
}

function titularSheet(ctx) {
  const current = ctx.state.designTitular || "";
  return choiceSheet(ctx, tr(ctx, "Titular", "Owner"), [
    optionRow(tr(ctx, "Cualquier titular", "Any owner"), { "data-design-titular": "" }, current === ""),
    optionRow(tr(ctx, "Tú", "You"), { "data-design-titular": "yo" }, current === "yo"),
  ]);
}

function categoriaSheet(ctx) {
  const current = ctx.state.designCategoria || "";
  const rows = [
    optionRow(tr(ctx, "Cualquier categoría", "Any category"), { "data-design-categoria": "" }, current === ""),
    ...CATEGORIES.map(([id, es, en]) => optionRow(tr(ctx, es, en), { class: "md-row md-plain md-cat", "data-design-categoria": id }, current === id)),
  ];
  return layer(tr(ctx, "Categoría", "Category"), [
    sheetHead(ctx, tr(ctx, "Categoría", "Category")),
    el("label", { class: "md-sheet-search" }, [
      el("span", { class: "sr", text: tr(ctx, "Buscar categoría", "Search category") }),
      el("input", {
        id: "md-cat-buscar",
        type: "search",
        placeholder: tr(ctx, "Buscar categoría", "Search category"),
        autocomplete: "off",
      }),
    ]),
    ...rows,
  ]);
}

function itemSheet(ctx) {
  const item = itemsOf(ctx).find((entry) => entry.id === ctx.state.designItem);
  if (!item) return null;
  const lib = libraryOf(item);
  const fav = lib.favorite ? tr(ctx, "Quitar de Favoritos", "Remove from Favorites") : tr(ctx, "Añadir a Favoritos", "Add to Favorites");
  const offline = lib.offline ? tr(ctx, "Quitar sin conexión", "Remove offline") : tr(ctx, "Usar sin conexión", "Use offline");
  const head = el("div", { class: "md-item-head" }, [
    face(item, "md-thumb md-thumb-lg"),
    el("div", { class: "md-copy" }, [
      el("div", { class: "md-rename-line" }, [
        el("strong", { text: itemName(item) }),
        button("", { class: "md-pencil md-plain", "data-design-sheet": "rename", "aria-label": tr(ctx, "Cambiar nombre", "Rename") }),
      ]),
      el("span", { class: "md-sub", text: tr(ctx, "Tú", "You") }),
      el("span", { class: "md-sub", text: lib.access === "link" ? tr(ctx, "Cualquiera con el enlace", "Anyone with the link") : tr(ctx, "Solo tú", "Only you") }),
    ]),
  ]);
  const pencil = head.querySelector(".md-pencil");
  if (pencil) pencil.append(icon(["M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z", "M13 7.5l3.5 3.5"], 16));
  return layer(itemName(item), [
    head,
    actionRow(tr(ctx, "Detalles", "Details"), "details", ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 8h.01"]),
    actionRow(tr(ctx, "Guardar como plantilla", "Save as template"), "template", ["M7 4h10v16l-5-3-5 3z"]),
    actionRow(tr(ctx, "Descargar", "Download"), "download", ["M12 4v10", "M8 10l4 4 4-4", "M5 19h14"]),
    actionRow(tr(ctx, "Usar mi impresora", "Use my printer"), "print", ["M7 9V4h10v5", "M6 14h12v6H6z", "M6 11h12v3H6z"]),
    actionRow(tr(ctx, "Hacer una copia", "Make a copy"), "copy", ["M8 8h11v11H8z", "M5 5h11v3"]),
    actionRow(tr(ctx, "Mover", "Move"), "move", ["M3 7h6l2 2h10v9H3z"]),
    actionRow(tr(ctx, "Compartir", "Share"), "share", ["M12 16V5", "M8 8l4-4 4 4", "M6 14v5h12v-5"]),
    actionRow(tr(ctx, "Copiar enlace", "Copy link"), "link", ["M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1", "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"]),
    actionRow(fav, "fav", ["M12 3l2.2 5.6L20 9.2l-4.2 3.6L17 19l-5-3-5 3 1.2-6.2L4 9.2l5.8-.6z"]),
    actionRow(tr(ctx, "Seleccionar elementos", "Select items"), "select", ["M5 5h6v6H5z", "M13 5h6v6h-6z", "M5 13h6v6H5z", "M13 13h6v6h-6z"]),
    actionRow(offline, "offline", ["M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1.5A3.5 3.5 0 0 0 7 18z"]),
    actionRow(tr(ctx, "Mover a la papelera", "Move to trash"), "trash", ["M5 7h14", "M9 7V5h6v2", "M8 7l1 12h6l1-12"]),
  ]);
}

function when(iso, lang) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return "—";
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", { dateStyle: "medium", timeStyle: "short" }).format(time);
}

function detailsSheet(ctx) {
  const item = itemsOf(ctx).find((entry) => entry.id === ctx.state.designItem);
  if (!item) return null;
  const lib = libraryOf(item);
  const parent = lib.folderId ? itemsOf(ctx).find((entry) => entry.id === lib.folderId) : null;
  const rows = [
    [tr(ctx, "Tipo", "Type"), shortType(ctx, item)],
    [tr(ctx, "Titular", "Owner"), tr(ctx, "Tú", "You")],
    [tr(ctx, "Acceso", "Access"), lib.access === "link" ? tr(ctx, "Cualquiera con el enlace", "Anyone with the link") : tr(ctx, "Privado", "Private")],
    [tr(ctx, "Modificado", "Modified"), when(item.updatedAt, ctx.lang)],
    [tr(ctx, "Creado", "Created"), when(item.createdAt, ctx.lang)],
    [tr(ctx, "Ubicación", "Location"), parent ? itemName(parent) : tr(ctx, "Mis diseños", "Your designs")],
    [tr(ctx, "Sin conexión", "Offline"), lib.offline ? tr(ctx, "Sí", "Yes") : tr(ctx, "No", "No")],
  ];
  return layer(tr(ctx, "Detalles", "Details"), [
    sheetHead(ctx, tr(ctx, "Detalles", "Details")),
    el("dl", { class: "md-details" }, rows.flatMap(([dt, dd]) => [el("dt", { text: dt }), el("dd", { text: dd })])),
  ]);
}

function shareSheet(ctx) {
  const item = itemsOf(ctx).find((entry) => entry.id === ctx.state.designItem);
  if (!item) return null;
  const access = libraryOf(item).access;
  return layer(tr(ctx, "Compartir", "Share"), [
    sheetHead(ctx, tr(ctx, "Compartir", "Share")),
    optionRow(tr(ctx, "Privado", "Private"), { "data-design-access": "private" }, access !== "link"),
    optionRow(tr(ctx, "Cualquiera con el enlace", "Anyone with the link"), { "data-design-access": "link" }, access === "link"),
    actionRow(tr(ctx, "Copiar enlace", "Copy link"), "link", ["M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1", "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"]),
    el("p", { class: "md-sheet-note", text: tr(ctx, "El enlace abre este elemento en este navegador.", "The link opens this item in this browser.") }),
  ]);
}

function moveSheet(ctx) {
  const moving = new Set((ctx.state.designMove || []).filter(Boolean));
  if (!moving.size && ctx.state.designItem) moving.add(ctx.state.designItem);
  const folders = liveItems(ctx).filter((item) => {
    const kind = libraryOf(item).kind;
    if (kind !== "folder" && kind !== "course") return false;
    if (moving.has(item.id)) return false;
    return true;
  });
  const rows = [
    optionRow(tr(ctx, "Mis diseños", "Your designs"), { "data-design-move-to": "" }, false),
    ...folders.map((folder) => optionRow(itemName(folder), { "data-design-move-to": folder.id }, false)),
  ];
  return layer(tr(ctx, "Mover", "Move"), [sheetHead(ctx, tr(ctx, "Mover", "Move")), ...rows]);
}

function printSheet(ctx) {
  return layer(tr(ctx, "Usar mi impresora", "Use my printer"), [
    sheetHead(ctx, tr(ctx, "Usar mi impresora", "Use my printer")),
    el("p", { class: "md-sheet-note", text: tr(ctx, "Se abre el cuadro de impresión del sistema.", "This opens the system print dialog.") }),
    button(tr(ctx, "Abrir impresión", "Open print dialog"), { class: "md-primary", "data-design-action": "print-now" }),
  ]);
}

function offlineSheet(ctx) {
  return layer(tr(ctx, "Ajustes", "Settings"), [
    sheetHead(ctx, tr(ctx, "Ajustes", "Settings")),
    el("p", { class: "md-sheet-note", text: tr(ctx, "En el menú de un diseño, elige Usar sin conexión. Esos diseños se listan en Disponible sin conexión y siguen guardados en este navegador.", "From a design’s menu, choose Use offline. Those designs are listed in Available offline and stay saved in this browser.") }),
    button(tr(ctx, "Entendido", "Done"), { class: "md-primary", "data-design-close": "1" }),
  ]);
}

function renameSheet(ctx) {
  const item = itemsOf(ctx).find((entry) => entry.id === ctx.state.designItem);
  if (!item) return null;
  return layer(tr(ctx, "Cambiar nombre", "Rename"), [
    el("h2", { text: tr(ctx, "Cambiar nombre", "Rename") }),
    el("input", {
      id: "md-rename",
      class: "md-field",
      type: "text",
      value: itemName(item),
      maxlength: "80",
      "aria-label": tr(ctx, "Nombre", "Name"),
    }),
    el("div", { class: "md-modal-actions" }, [
      button(tr(ctx, "Cancelar", "Cancel"), { class: "md-textbtn md-plain", "data-design-close": "1" }),
      button(tr(ctx, "Guardar", "Save"), { class: "md-primary", "data-design-rename-save": "1" }),
    ]),
  ], true);
}

function folderModal(ctx) {
  const course = ctx.state.designDraft === "course";
  return layer(course ? tr(ctx, "Curso nuevo", "New course") : tr(ctx, "Nueva carpeta", "New folder"), [
    el("h2", { text: course ? tr(ctx, "Curso nuevo", "New course") : tr(ctx, "Nueva carpeta", "New folder") }),
    el("input", {
      id: "md-nombre",
      class: "md-field",
      type: "text",
      maxlength: "80",
      placeholder: course ? tr(ctx, "Nombre del curso", "Course name") : tr(ctx, "Nombre de la carpeta", "Folder name"),
      "aria-label": tr(ctx, "Nombre", "Name"),
    }),
    el("fieldset", { class: "md-access" }, [
      el("legend", { text: tr(ctx, "Acceso", "Access") }),
      el("label", {}, [el("input", { type: "radio", name: "md-acceso", value: "private", checked: "checked" }), el("span", { text: tr(ctx, "Privado", "Private") })]),
      el("label", {}, [el("input", { type: "radio", name: "md-acceso", value: "link" }), el("span", { text: tr(ctx, "Cualquiera con el enlace", "Anyone with the link") })]),
    ]),
    el("div", { class: "md-modal-actions" }, [
      button(tr(ctx, "Cancelar", "Cancel"), { class: "md-textbtn md-plain", "data-design-close": "1" }),
      button(tr(ctx, "Crear", "Create"), { class: "md-primary", "data-design-create-save": "1" }),
    ]),
  ], true);
}

function designSheet(ctx) {
  const which = ctx.state.designSheet || "";
  if (which === "views") return viewsSheet(ctx);
  if (which === "add") return addSheet(ctx);
  if (which === "tipo") return tipoSheet(ctx);
  if (which === "categoria") return categoriaSheet(ctx);
  if (which === "titular") return titularSheet(ctx);
  if (which === "fecha") return fechaSheet(ctx);
  if (which === "item") return itemSheet(ctx);
  if (which === "details") return detailsSheet(ctx);
  if (which === "share") return shareSheet(ctx);
  if (which === "move") return moveSheet(ctx);
  if (which === "print") return printSheet(ctx);
  if (which === "offline-settings") return offlineSheet(ctx);
  if (which === "rename") return renameSheet(ctx);
  if (which === "new-folder") return folderModal(ctx);
  return null;
}

function fillDescription(screen, ctx) {
  const area = screen.querySelector("#curso-desc");
  if (!(area instanceof HTMLTextAreaElement)) return;
  const folder = itemsOf(ctx).find((item) => item.id === ctx.state.designFolder);
  area.value = folder ? libraryOf(folder).description || "" : "";
}

export function designView(ctx) {
  const create = Boolean(ctx.state.designCreate);
  const folder = !create && ctx.state.designFolder ? ctx.state.designFolder : "";
  const mode = create ? "create" : folder ? "folder" : "library";
  const screen = el("div", {
    class: `canva-home canva-disenos is-${mode}`,
    "data-tab": "disenos",
    "data-design-mode": mode,
    "data-design-view": ctx.state.designView || "todos",
  }, create ? createBody(ctx) : folder ? folderBody(ctx) : libraryBody(ctx));
  fillDescription(screen, ctx);
  if (typeof window !== "undefined" && window.scrollY > 12) screen.classList.add("is-scrolled");
  return { screen, sheet: designSheet(ctx) };
}
