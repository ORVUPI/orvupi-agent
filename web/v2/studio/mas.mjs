/** Pestaña Más: hub y subpantallas. Las preferencias y la papelera viven en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { BRAND, EDGE, FONTS, LIMITS } from "./lib/document.mjs";
import { listPhotos, photoUrl } from "./lib/photos.mjs";
import { PROJECT_CAP, libraryOf, listDesigns } from "./lib/projects.mjs";
import { desktopRail, designsSub, marcaSub, printSub } from "./desktop.mjs";
import { pathFromHash } from "./lib/route.mjs";
import { thumbsIn } from "./lib/thumbs.mjs";
import { sendIaPrompt } from "./ia.mjs";
import {
  HUB_ROWS,
  ORVUPI_APPS,
  PRINT_PRODUCTS,
  SCHOOL,
  TRASH_DAYS,
  clearIaChats,
  clearOfflineFlags,
  clearStudioData,
  emptyTrash,
  formatBytes,
  listTrash,
  loadMas,
  localHref,
  markRead,
  purgeExpiredTrash,
  resetProfile,
  restoreTrash,
  setMasField,
  setTextScale,
  setTheme,
  storageReport,
  studioNotices,
  togglePref,
  deleteProjectSafe,
} from "./lib/mas-store.mjs";

const SVG_NS = "http:" + "//www.w3.org/2000/svg";

const ui = {
  path: "",
  query: "",
  chip: "",
  step: 1,
  noticeSelect: false,
  picked: [],
  flash: "",
  savedQuery: {},
};

let themeListen = false;

const ICONS = {
  bell: ["M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9", "M10 19a2 2 0 0 0 4 0"],
  help: ["M12 17.5h.01", "M9.5 9a2.5 2.5 0 1 1 3.3 2.4c-.8.4-1.3 1-1.3 1.8V14.2"],
  marca: ["M8.2 15.4a3.2 3.2 0 1 1 .2-6.2", "M15.8 8.6a3.2 3.2 0 1 1-.2 6.2"],
  print: ["M5 9h14v10H5z", "M8 9V5h8v4", "M8 13h8", "M8 16h5"],
  apps: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  flag: ["M6 4v16", "M6 5h12l-2.2 3.2L18 11.5H6"],
  ads: ["M4 10h4l8-4v12l-8-4H4z", "M8 14.2v2.2a2 2 0 0 0 1.3 1.8"],
  star: ["M12 3.4l2.1 4.4 4.8.7-3.5 3.4.8 4.8L12 14.4 7.8 16.7l.8-4.8L5.1 8.5l4.8-.7z"],
  person: ["M12 12a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 12 12z", "M5.6 19.4a6.4 6.4 0 0 1 12.8 0"],
  gear: ["M12 8.2a3.8 3.8 0 1 0 .1 7.6 3.8 3.8 0 0 0-.1-7.6z", "M12 3.4v1.8", "M12 18.8v1.8", "M4.6 6.2l1.4 1.2", "M18 16.6l1.4 1.2", "M3.4 12h1.8", "M18.8 12h1.8", "M4.6 17.8l1.4-1.2", "M18 7.4l1.4-1.2"],
  trash: ["M5 7h14", "M9 7V5h6v2", "M8 7l1 13h6l1-13"],
  moon: ["M16 4.2A7.6 7.6 0 1 0 19.2 16 6 6 0 0 1 16 4.2z"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v6", "M12 8h.01"],
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  logout: ["M10 7V5H5v14h5v-2", "M10 12h9", "M16 9l3 3-3 3"],
  sliders: ["M4 7h16", "M4 12h16", "M4 17h16", "M8 7a1.2 1.2 0 1 0 .1 0", "M14 12a1.2 1.2 0 1 0 .1 0", "M10 17a1.2 1.2 0 1 0 .1 0"],
  reset: ["M4 12a8 8 0 1 0 2.2-5.5", "M4 4v5h5"],
  back: ["M15 6l-6 6 6 6"],
  chev: ["M9 6l6 6-6 6"],
  down: ["M6 9l6 6 6-6"],
  search: ["M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z", "M20 20l-3.5-3.5"],
  book: ["M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5z", "M5 5.5V21"],
  shield: ["M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z"],
  eye: ["M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  db: ["M12 4c5 0 8 1.2 8 2.6S17 9.2 12 9.2 4 8 4 6.6 7 4 12 4z", "M4 6.6v4.4c0 1.4 3 2.6 8 2.6s8-1.2 8-2.6V6.6", "M4 11.4v4.4c0 1.4 3 2.6 8 2.6s8-1.2 8-2.6v-4.4"],
  team: ["M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M3.5 19a4.5 4.5 0 0 1 9 0", "M13 19a4 4 0 0 1 7.5-2"],
  spark: ["M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3z"],
  link: ["M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1", "M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"],
  doc: ["M7 3h7l4 4v14H7z", "M14 3v4h4"],
  card: ["M4 7h16v10H4z", "M4 11h16"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18", "M12 3c2.5 2.8 2.5 15.2 0 18", "M12 3c-2.5 2.8-2.5 15.2 0 18"],
  bag: ["M6 8h12l-1 12H7z", "M9 8V7a3 3 0 0 1 6 0v1"],
  lock: ["M7 11h10v9H7z", "M9 11V8a3 3 0 0 1 6 0v3"],
  mail: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
};

function tr(lang, es, en) {
  return lang === "en" ? en : es;
}

function fold(value) {
  return String(value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key === "hidden") node.hidden = Boolean(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(text, attrs = {}) {
  return el("button", { type: "button", ...attrs, text });
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ICONS[name] || []) {
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
  svg.setAttribute("aria-hidden", "true");
  for (const cx of [6, 12, 18]) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "1.6");
    circle.setAttribute("fill", "currentColor");
    svg.append(circle);
  }
  return svg;
}

function crown() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M3.5 17.5 5.6 8.2l3.6 3.8L12 5.2l2.8 6.8 3.6-3.8 2.1 9.3z");
  path.setAttribute("fill", "#E6A700");
  path.setAttribute("stroke", "#C48A00");
  path.setAttribute("stroke-width", "1.2");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

function fillClass(hex) {
  const value = String(hex || "").toLowerCase();
  if (value === BRAND.pink.toLowerCase()) return "mas-fill-pink";
  if (value === BRAND.navy.toLowerCase()) return "mas-fill-navy";
  if (value === BRAND.cream.toLowerCase()) return "mas-fill-cream";
  return "mas-fill-cream";
}

function asset(path) {
  return new URL(path, import.meta.url).href;
}

function ask(lang, es, en) {
  if (typeof window === "undefined" || typeof window.confirm !== "function") return false;
  return window.confirm(tr(lang, es, en));
}

function go(ctx, view) {
  if (typeof ctx.go === "function") ctx.go(view);
  else if (typeof location !== "undefined") location.hash = view === "inicio" ? "#/" : `#/${view}`;
}

function parentOf(path) {
  if (!path || !path.includes("/")) return "mas";
  return `mas/${path.slice(0, path.lastIndexOf("/"))}`;
}

function initials(text, count) {
  const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
  const raw = parts.join(" ");
  if (count === 2) {
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return raw.slice(0, 2).toUpperCase() || "OR";
  }
  return (raw[0] || "?").toUpperCase();
}

function resolvedTheme(pref) {
  if (pref === "dark" || pref === "light") return pref;
  try {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* sin media query el tema claro sigue */
  }
  return "light";
}

export function applyMasChrome(storage) {
  if (typeof document === "undefined") return;
  const prefs = loadMas(storage);
  const root = document.documentElement;
  const theme = resolvedTheme(prefs.theme);
  root.dataset.studioTheme = theme;
  root.dataset.studioThemePref = prefs.theme;
  root.dataset.reduceMotion = prefs.a11y.reduceMotion ? "1" : "0";
  root.dataset.contrast = prefs.a11y.contrast ? "1" : "0";
  root.dataset.textScale = prefs.a11y.textSize || "md";
  if (!themeListen && typeof window !== "undefined" && window.matchMedia) {
    themeListen = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (loadMas(storage).theme === "system") applyMasChrome(storage);
    });
  }
}

function iconBtn(label, attrs, glyph) {
  const node = button("", { class: "mas-iconbtn canva-plain", "aria-label": label, ...attrs });
  node.append(glyph === "dots" ? dots() : icon(glyph));
  return node;
}

function subhead(ctx, title, back, opts = {}) {
  const backBtn = iconBtn(tr(ctx.lang, "Volver", "Back"), { "data-go": back }, "back");
  const extra = opts.extra || el("span", { class: "mas-iconbtn is-spacer", "aria-hidden": "true" });
  if (opts.bar) {
    return el("header", { class: "mas-subhead is-bar" }, [
      el("div", { class: "mas-subbar" }, [backBtn, el("h1", { text: title }), extra]),
    ]);
  }
  return el("header", { class: "mas-subhead" }, [
    el("div", { class: "mas-subbar" }, [backBtn, el("span", { class: "mas-iconbtn is-spacer", "aria-hidden": "true" }), extra]),
    el("h1", { text: title }),
  ]);
}

function backOnly(ctx, back) {
  return el("header", { class: "mas-subhead is-bar" }, [
    el("div", { class: "mas-subbar" }, [
      iconBtn(tr(ctx.lang, "Volver", "Back"), { "data-go": back }, "back"),
    ]),
  ]);
}

function row(lang, spec) {
  const label = tr(lang, spec.es, spec.en);
  const attrs = {
    class: `mas-row canva-plain is-${spec.tone || "ink"}${spec.chevron === false ? " is-action" : ""}`,
    "data-mas-filter": spec.filter || label,
  };
  let node;
  if (spec.href) node = el("a", { ...attrs, href: spec.href });
  else node = button("", { ...attrs, "data-go": spec.go || null });
  node.append(
    el("span", { class: "mas-ico", "aria-hidden": "true" }, [icon(spec.icon)]),
    el("span", { class: "mas-row-label", text: label }),
  );
  if (spec.chevron !== false) node.append(el("span", { class: "mas-chev", "aria-hidden": "true" }, [icon("chev")]));
  return node;
}

function searchField(placeholder, value) {
  return el("label", { class: "mas-search" }, [
    icon("search"),
    el("input", {
      id: "mas-buscar",
      type: "search",
      value: value || "",
      placeholder,
      autocomplete: "off",
      "aria-label": placeholder,
    }),
  ]);
}

function chips(lang, items, current) {
  return el("div", { class: "mas-chips", role: "toolbar" }, items.map(([id, es, en]) => button(tr(lang, es, en), {
    class: `mas-chip canva-plain${current === id ? " is-on" : ""}`,
    "data-mas-chip": id,
    "aria-pressed": current === id ? "true" : "false",
  })));
}

function toggle(lang, es, en, key, on) {
  const node = button("", {
    class: "mas-switch canva-plain",
    "data-mas-toggle": key,
    "aria-pressed": on ? "true" : "false",
  });
  node.append(
    el("span", { class: "mas-switch-label", text: tr(lang, es, en) }),
    el("span", { class: "mas-switch-ui", "aria-hidden": "true" }),
  );
  return node;
}

function pop(label, actions) {
  return el("details", { class: "mas-pop" }, [
    el("summary", { "aria-label": label }, [dots()]),
    el("div", { class: "mas-pop-panel" }, actions),
  ]);
}

function lead(text) {
  return el("p", { class: "mas-lead", text });
}

function note(text) {
  return el("p", { class: "mas-note", text });
}

function h2(text) {
  return el("h2", { class: "mas-h2", text });
}

function cta(label, href, goTo) {
  if (href) return el("a", { class: "mas-cta", href, text: label });
  return button(label, { class: "mas-cta canva-plain", "data-go": goTo });
}

function applyQuery(root, query) {
  const q = fold(query);
  root.querySelectorAll("[data-mas-filter]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const hay = fold(node.getAttribute("data-mas-filter") || "");
    node.hidden = Boolean(q) && !hay.includes(q);
  });
}

const ROW_ICON = {
  marca: "marca",
  imprime: "print",
  apps: "apps",
  dream: "flag",
  anuncios: "ads",
  escuela: "star",
  preferencias: "sliders",
  config: "gear",
  papelera: "trash",
  tema: "moon",
  comentarios: "info",
  avanzadas: "grid",
  borrar: "reset",
};

function renderHub(ctx) {
  const { lang, storage } = ctx;
  const data = loadMas(storage);
  const unread = studioNotices(storage, lang).filter((item) => !data.read.includes(item.id)).length;
  const bell = iconBtn(tr(lang, "Notificaciones", "Notifications"), { "data-go": "mas/avisos" }, "bell");
  if (unread) bell.append(el("i", { class: "mas-badge", "aria-label": String(unread) }));
  const help = iconBtn(tr(lang, "Ayuda", "Help"), { "data-go": "mas/te-ayudamos" }, "help");
  const grouped = HUB_ROWS.filter((item) => item.group).map((item) => row(lang, { ...item, icon: ROW_ICON[item.id] }));
  const plain = HUB_ROWS.filter((item) => !item.group).map((item) => row(lang, { ...item, icon: ROW_ICON[item.id] }));
  return el("div", { class: "mas-page" }, [
    el("div", { class: "mas-tools" }, [bell, help]),
    el("section", { class: "mas-card mas-promo" }, [
      el("h2", {}, [
        el("span", { class: "mas-crown", "aria-hidden": "true" }, [crown()]),
        el("span", { text: tr(lang, "Alcanza tus objetivos de diseño con ORVUPI", "Reach your design goals with ORVUPI") }),
      ]),
      el("p", { text: tr(lang, "Da rienda suelta a tu creatividad con el kit de marca, las plantillas y el catálogo. Todo se queda en este navegador.", "Use the brand kit, the templates, and the catalog. Everything stays in this browser.") }),
      el("a", { class: "mas-cta", href: "/work/", text: tr(lang, "Abrir ORVUPI Work", "Open ORVUPI Work") }),
    ]),
    el("nav", { class: "mas-card mas-list", "aria-label": tr(lang, "Más", "More") }, grouped),
    el("nav", { class: "mas-list is-plain", "aria-label": tr(lang, "Preferencias", "Preferences") }, plain),
  ]);
}

function renderAvisos(ctx) {
  const { lang, storage } = ctx;
  const data = loadMas(storage);
  const notes = studioNotices(storage, lang);
  const items = notes.map((item) => {
    const picked = ui.picked.includes(item.id);
    const read = data.read.includes(item.id);
    const node = button("", {
      class: `mas-note-row canva-plain${read ? " is-read" : ""}`,
      "data-mas-pick": ui.noticeSelect ? item.id : null,
      "aria-pressed": ui.noticeSelect ? (picked ? "true" : "false") : null,
    });
    node.append(
      el("span", { class: "mas-bell", "aria-hidden": "true" }, [icon("bell")]),
      el("span", { class: "mas-account-text" }, [
        el("strong", { text: item.title }),
        el("small", { text: item.body }),
      ]),
    );
    return node;
  });
  const menu = pop(tr(lang, "Opciones de notificaciones", "Notification options"), [
    button(tr(lang, "Marcar todas como leídas", "Mark all as read"), { class: "canva-plain", "data-mas-read-all": "" }),
    button(tr(lang, "Seleccionar notificaciones", "Select notifications"), { class: "canva-plain", "data-mas-select": "" }),
  ]);
  const empty = el("div", { class: "mas-empty" }, [
    el("span", { class: "mas-empty-icon", "aria-hidden": "true" }, [icon("bell")]),
    el("p", { text: tr(lang, "Aquí es donde aparecerán tus notificaciones.", "This is where your notifications will show up.") }),
  ]);
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Notificaciones", "Notifications"), "mas", { extra: menu }),
    notes.length ? el("div", { class: "mas-list" }, items) : empty,
    ui.noticeSelect ? button(tr(lang, "Marcar como leídas", "Mark as read"), { class: "mas-cta canva-plain", "data-mas-read-go": "" }) : null,
  ]);
}

function renderHelp(ctx) {
  const lang = ctx.lang;
  const prompts = lang === "en"
    ? ["How do I export a design?", "Where is the brand kit?", "I want a poster template"]
    : ["¿Cómo exporto un diseño?", "¿Dónde está el kit de marca?", "Quiero una plantilla de cartel"];
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Te ayudamos", "We can help"), "mas"),
    el("h2", { class: "mas-display", text: tr(lang, "¿En qué te puedo ayudar?", "What can I help you with?") }),
    lead(tr(lang, "El catálogo responde con las plantillas de Studio en este navegador.", "The catalog answers from Studio templates in this browser.")),
    el("div", { class: "mas-actions" }, prompts.map((text) => button(text, { class: "mas-chip canva-plain", "data-mas-help": text }))),
    el("a", { class: "mas-cta", href: "mailto:orvupi.hq@gmail.com", text: "orvupi.hq@gmail.com" }),
    cta(tr(lang, "Abrir catálogo", "Open catalog"), null, "ia"),
  ]);
}

function tile(lang, spec) {
  const label = tr(lang, spec.es, spec.en);
  const node = button("", { class: "mas-tile canva-plain", "data-go": spec.go, "data-mas-filter": label });
  node.append(spec.face, el("span", { class: "mas-tile-name", text: label }));
  return node;
}

function face(className, children) {
  return el("span", { class: `mas-tile-face ${className}` }, children);
}

function renderMarca(ctx, path) {
  const lang = ctx.lang;
  const part = path.slice("marca/".length);
  if (!part) return renderMarcaHome(ctx);
  const back = "mas/marca";
  if (part === "plantillas") {
    const thumbs = [...thumbsIn("logo").slice(0, 3), ...thumbsIn("negocio").slice(0, 3)];
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Plantillas de la marca", "Brand templates"), back),
      lead(tr(lang, "Plantillas del catálogo de Studio. Se abren en este navegador.", "Templates from the Studio catalog. They open in this browser.")),
      el("div", { class: "mas-grid" }, thumbs.map((item) => {
        const node = button("", { class: "mas-tile canva-plain", "data-thumb": item.id });
        node.append(
          face("is-photo", [el("img", { src: asset(item.file), alt: "" })]),
          el("span", { class: "mas-tile-name", text: item.title }),
        );
        return node;
      })),
      cta(tr(lang, "Ver todas las plantillas", "See all templates"), null, "plantillas"),
    ]);
  }
  if (part === "logos") {
    const logos = (catalog.items || []).filter((item) => item.permitido && String(item.id || "").startsWith("orvupi"));
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Logos", "Logos"), back),
      el("div", { class: "mas-grid" }, logos.map((item) => face("is-logo", [
        el("img", { src: asset(item.archivo), alt: item.nombre?.[lang] || item.nombre?.es || "ORVUPI" }),
      ]))),
      el("a", { class: "mas-cta", href: localHref("/marca/"), text: tr(lang, "Abrir recursos de marca", "Open brand assets") }),
      button(tr(lang, "Crear un logo", "Create a logo"), { class: "mas-cta canva-plain", "data-format": "logo" }),
    ]);
  }
  if (part === "colores") {
    const colors = [
      [BRAND.pink, tr(lang, "Rosa", "Pink")],
      [BRAND.cream, tr(lang, "Crema", "Cream")],
      [BRAND.navy, tr(lang, "Azul marino", "Navy")],
    ];
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Colores", "Colors"), back),
      el("ul", { class: "mas-swatches" }, colors.map(([hex, label]) => el("li", {}, [
        el("span", { class: `mas-swatch ${fillClass(hex)}` }),
        el("span", {}, [el("strong", { text: label }), el("small", { text: hex })]),
      ]))),
      cta(tr(lang, "Ver la marca en Studio", "See the brand in Studio"), null, "marca"),
    ]);
  }
  if (part === "fuentes") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Fuentes", "Fonts"), back),
      lead(tr(lang, "Estas tipografías van incluidas. No hace falta un plan de pago.", "These typefaces are included. No paid plan is required.")),
      el("ul", { class: "mas-fonts" }, FONTS.map((font) => el("li", { class: `mas-font-${font.id}`, text: font[lang] || font.es }))),
    ]);
  }
  if (part === "voz") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Voz de la marca", "Brand voice"), back),
      el("p", { class: "mas-quote", text: tr(lang, "Curiosidad, frases cortas y un pulpo que saluda.", "Curiosity, short sentences, and an octopus that waves.") }),
      note(tr(lang, "ORVUPI habla claro. El rosa, la crema y el azul marino son los colores. El pulpo es la mascota.", "ORVUPI speaks plainly. Pink, cream, and navy are the colors. The octopus is the mascot.")),
    ]);
  }
  if (part === "fotos") {
    const photos = listPhotos("", lang).slice(0, 6);
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Fotos", "Photos"), back),
      el("div", { class: "mas-grid" }, photos.map((item) => face("is-photo", [
        el("img", { src: photoUrl(item.id), alt: item.nombre?.[lang] || item.nombre?.es || "" }),
      ]))),
      cta(tr(lang, "Abrir fotos", "Open photos"), null, "fotos"),
    ]);
  }
  if (part === "elementos" || part === "iconos") {
    const title = part === "iconos" ? tr(lang, "Iconos", "Icons") : tr(lang, "Elementos gráficos", "Graphic elements");
    return el("div", { class: "mas-page" }, [
      subhead(ctx, title, back),
      lead(tr(lang, "Formas, iconos y gráficos de la biblioteca local.", "Shapes, icons, and graphics from the local library.")),
      cta(tr(lang, "Abrir elementos", "Open elements"), null, "elementos"),
    ]);
  }
  if (part === "graficos") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Gráficos", "Charts"), back),
      lead(tr(lang, "Los gráficos se arman en el editor, con datos de este navegador.", "Charts are built in the editor, with data from this browser.")),
      button(tr(lang, "Crear una infografía", "Create an infographic"), { class: "mas-cta canva-plain", "data-format": "info" }),
    ]);
  }
  return renderMissing(ctx, path);
}

function renderMarcaHome(ctx) {
  const lang = ctx.lang;
  const book = el("a", { class: "mas-iconbtn", href: localHref("/marca/"), "aria-label": tr(lang, "Recursos de marca", "Brand assets") }, [icon("book")]);
  const logo = (catalog.items || []).find((item) => item.id === "orvupi-avatar");
  const photo = listPhotos("", lang)[0];
  const tiles = [
    tile(lang, { es: "Plantillas de la marca", en: "Brand templates", go: "mas/marca/plantillas", face: face("is-wash", [el("span", { class: "mas-mini a" }), el("span", { class: "mas-mini b" })]) }),
    tile(lang, { es: "Logos", en: "Logos", go: "mas/marca/logos", face: face("is-logo", [logo ? el("img", { src: asset(logo.archivo), alt: "" }) : el("span", { text: "OR" })]) }),
    tile(lang, { es: "Colores", en: "Colors", go: "mas/marca/colores", face: face("is-colors", [
      el("i", { class: fillClass(BRAND.pink) }),
      el("i", { class: fillClass(BRAND.navy) }),
      el("i", { class: fillClass(BRAND.cream) }),
    ]) }),
    tile(lang, { es: "Fuentes", en: "Fonts", go: "mas/marca/fuentes", face: face("is-type", [el("span", { text: "Aa" })]) }),
    tile(lang, { es: "Voz de la marca", en: "Brand voice", go: "mas/marca/voz", face: face("is-quote", [el("span", { text: "“" })]) }),
    tile(lang, { es: "Fotos", en: "Photos", go: "mas/marca/fotos", face: face("is-photo", [photo ? el("img", { src: photoUrl(photo.id), alt: "" }) : null]) }),
    tile(lang, { es: "Elementos gráficos", en: "Graphic elements", go: "mas/marca/elementos", face: face("is-shapes", [el("i"), el("b"), el("u")]) }),
    tile(lang, { es: "Iconos", en: "Icons", go: "mas/marca/iconos", face: face("is-icons", [icon("spark"), icon("star"), icon("bell")]) }),
    tile(lang, { es: "Gráficos", en: "Charts", go: "mas/marca/graficos", face: face("is-bars", [el("i"), el("i"), el("i")]) }),
  ];
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Kit de marca", "Brand kit"), "mas", { bar: true, extra: book }),
    el("p", { class: "mas-kicker", text: tr(lang, "El kit de ORVUPI, sin complicaciones.", "The ORVUPI kit, without the fuss.") }),
    el("a", { class: "mas-cta", href: localHref("/marca/"), text: tr(lang, "Abrir recursos de marca", "Open brand assets") }),
    el("div", { class: "mas-grid" }, tiles),
  ]);
}

const PRINT_STEPS = [
  ["Elige un producto", "Choose a product"],
  ["Abre o crea un diseño", "Open or create a design"],
  ["Exporta PNG, JPG o PDF en este dispositivo", "Export PNG, JPG, or PDF on this device"],
];

function renderPrint(ctx) {
  const lang = ctx.lang;
  const step = ((ui.step || 1) - 1) % PRINT_STEPS.length;
  const designs = listDesigns(ctx.storage).slice(0, 12);
  const products = PRINT_PRODUCTS.map((item) => {
    const label = tr(lang, item.es, item.en);
    const price = tr(lang, "Gratis en el dispositivo", "Free on this device");
    const node = button("", {
      class: "mas-product canva-plain",
      "data-mas-filter": `${label} ${price}`,
      "data-format": item.format || null,
      "data-mas-jump": item.jump || null,
    });
    node.append(
      el("span", { class: `mas-product-face is-${item.id}` }),
      el("span", { class: "mas-tile-name", text: label }),
      el("small", { text: price }),
    );
    return node;
  });
  const files = designs.map((item) => {
    const line = el("div", { class: "mas-design" }, [
      el("span", { text: item.name || tr(lang, "Sin título", "Untitled") }),
      button(tr(lang, "Abrir", "Open"), { class: "mas-mini-btn canva-plain", "data-open": item.id }),
      button(tr(lang, "JSON", "JSON"), { class: "mas-mini-btn canva-plain", "data-export": item.id }),
    ]);
    return line;
  });
  return el("div", { class: "mas-page" }, [
    backOnly(ctx, "mas"),
    el("h1", { class: "mas-display", text: tr(lang, "Imprime tus diseños con ORVUPI", "Print your designs with ORVUPI") }),
    searchField(tr(lang, "Buscar productos para imprimir", "Search products to print"), ui.query),
    h2(tr(lang, "Cómo funciona", "How it works")),
    el("article", { class: "mas-step" }, [
      el("div", {}, [
        el("p", { class: "mas-kicker", text: tr(lang, `PASO ${step + 1}`, `STEP ${step + 1}`) }),
        el("p", { class: "mas-step-title", text: tr(lang, PRINT_STEPS[step][0], PRINT_STEPS[step][1]) }),
      ]),
      el("span", { class: "mas-sheet", "aria-hidden": "true" }),
      iconBtn(tr(lang, "Paso siguiente", "Next step"), { "data-mas-step": "" }, "chev"),
    ]),
    h2(tr(lang, "Te podría gustar", "You might like")),
    el("div", { class: "mas-products" }, products),
    h2(tr(lang, "Tus diseños", "Your designs")),
    el("div", { id: "mas-disenos", class: "mas-designs" }, files.length ? files : [
      note(tr(lang, "Todavía no hay diseños en este navegador.", "There are no designs in this browser yet.")),
      cta(tr(lang, "Ir a Mis diseños", "Go to My designs"), null, "disenos"),
    ]),
    note(tr(lang, "PNG, JPG y PDF se descargan desde el diseño abierto. No hay envío ni cobro.", "PNG, JPG, and PDF download from the open design. Nothing is shipped or charged.")),
  ]);
}

function renderApps(ctx) {
  const lang = ctx.lang;
  const chip = ui.chip || "para-ti";
  const cats = [["para-ti", "Para ti", "For you"], ["crear", "Crear", "Create"], ["aprender", "Aprender", "Learn"], ["comunidad", "Comunidad", "Community"]];
  const shown = chip === "para-ti" ? ORVUPI_APPS : ORVUPI_APPS.filter((item) => item.cat === chip);
  const featured = ORVUPI_APPS.filter((item) => item.featured);
  return el("div", { class: "mas-page" }, [
    subhead(ctx, "Apps", "mas", { bar: true }),
    searchField(tr(lang, "Busca apps", "Search apps"), ui.query),
    chips(lang, cats, chip),
    h2(tr(lang, "Lo mejor para ti", "Best for you")),
    el("div", { class: "mas-features" }, featured.map((item) => {
      const label = tr(lang, item.es, item.en);
      const blurb = tr(lang, item.esBlurb, item.enBlurb);
      return el("a", { class: `mas-feature is-${item.id}`, href: localHref(item.href), "data-mas-filter": `${label} ${blurb}` }, [
        el("strong", { text: label }),
        el("span", { text: blurb }),
      ]);
    })),
    h2(tr(lang, "Colecciones", "Collections")),
    lead(tr(lang, "Herramientas de ORVUPI que trabajan juntas con tus diseños.", "ORVUPI tools that work together with your designs.")),
    el("div", { class: "mas-apps" }, shown.map((item) => {
      const label = tr(lang, item.es, item.en);
      const blurb = tr(lang, item.esBlurb, item.enBlurb);
      return el("a", { class: "mas-app", href: localHref(item.href), "data-mas-filter": `${label} ${blurb}` }, [
        el("span", { class: "mas-ico", "aria-hidden": "true" }, [icon(item.id === "work" ? "doc" : "spark")]),
        el("span", { class: "mas-account-text" }, [el("strong", { text: label }), el("small", { text: blurb })]),
        el("span", { class: "mas-chev", "aria-hidden": "true" }, [icon("chev")]),
      ]);
    })),
  ]);
}

function renderDream(ctx) {
  const lang = ctx.lang;
  return el("div", { class: "mas-page" }, [
    subhead(ctx, "Dream Lab", "mas"),
    lead(tr(lang, "El laboratorio creativo de ORVUPI: lecciones, IA y pruebas en este sitio.", "ORVUPI’s creative lab: lessons, AI, and drills on this site.")),
    el("div", { class: "mas-features" }, [
      el("a", { class: "mas-feature is-lab", href: localHref("/lab/") }, [
        el("strong", { text: "Lab" }),
        el("span", { text: tr(lang, "Abrir lecciones", "Open lessons") }),
      ]),
      (() => {
        const node = button("", { class: "mas-feature is-ia canva-plain", "data-go": "ia" });
        node.append(el("strong", { text: "Catálogo" }), el("span", { text: tr(lang, "Diseñar con el chat", "Design with the chat") }));
        return node;
      })(),
    ]),
    cta("Catálogo", null, "ia"),
    el("a", { class: "mas-cta mas-cta-secondary", href: localHref("/aprender/"), text: tr(lang, "Abrir Aprender", "Open Learn") }),
  ]);
}

function renderAds(ctx, path) {
  const lang = ctx.lang;
  const part = path === "anuncios" ? "" : path.slice("anuncios/".length);
  if (part === "crear") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Crear anuncios", "Create ads"), "mas/anuncios"),
      lead(tr(lang, "Elige un formato y arma la pieza en Studio. La descarga se queda aquí.", "Pick a format and build the piece in Studio. The download stays here.")),
      button(tr(lang, "Publicación", "Post"), { class: "mas-cta canva-plain", "data-format": "square" }),
      button(tr(lang, "Historia", "Story"), { class: "mas-cta mas-cta-secondary canva-plain", "data-format": "story" }),
      button(tr(lang, "Cartel", "Poster"), { class: "mas-cta mas-cta-secondary canva-plain", "data-format": "poster" }),
      cta(tr(lang, "Ver plantillas", "See templates"), null, "plantillas"),
    ]);
  }
  if (part === "publicar") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Publicar", "Publish"), "mas/anuncios"),
      note(tr(lang, "Exporta PNG, JPG o PDF desde el diseño. Studio no envía la pieza a una red de anuncios.", "Export PNG, JPG, or PDF from the design. Studio does not send the piece to an ad network.")),
      cta(tr(lang, "Ir a Mis diseños", "Go to My designs"), null, "disenos"),
    ]);
  }
  if (part === "analizar") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Analizar", "Analyze"), "mas/anuncios"),
      note(tr(lang, "No hay métricas remotas. Revisa la pieza en Mis diseños y en el archivo que descargaste.", "There are no remote metrics. Review the piece in My designs and in the file you downloaded.")),
    ]);
  }
  if (part === "vincular") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Red de anuncios", "Ad network"), "mas/anuncios"),
      note(tr(lang, "Studio no envía piezas a una red de anuncios. Las herramientas de ORVUPI están en Apps.", "Studio does not send pieces to an ad network. ORVUPI tools are in Apps.")),
      cta("Apps", null, "mas/apps"),
    ]);
  }
  if (part) return renderMissing(ctx, path);
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Anuncios", "Ads"), "mas"),
    el("nav", { class: "mas-card mas-list" }, [
      row(lang, { es: "Crear anuncios", en: "Create ads", go: "mas/anuncios/crear", icon: "spark", tone: "purple" }),
      row(lang, { es: "Publicar", en: "Publish", go: "mas/anuncios/publicar", icon: "ads", tone: "purple" }),
      row(lang, { es: "Analizar", en: "Analyze", go: "mas/anuncios/analizar", icon: "grid", tone: "purple" }),
      row(lang, { es: "Red de anuncios", en: "Ad network", go: "mas/anuncios/vincular", icon: "link", tone: "purple" }),
    ]),
  ]);
}

function renderSchool(ctx) {
  const lang = ctx.lang;
  const cards = SCHOOL.map((item) => {
    const title = tr(lang, item.es, item.en);
    const body = tr(lang, item.esBody, item.enBody);
    const attrs = { class: "mas-course", "data-mas-filter": `${title} ${body}` };
    const node = item.href ? el("a", { ...attrs, href: localHref(item.href) }) : button("", { ...attrs, class: `${attrs.class} canva-plain`, "data-go": item.go });
    node.append(el("strong", { text: title }), el("span", { text: body }));
    return node;
  });
  return el("div", { class: "mas-page" }, [
    subhead(ctx, "Design School", "mas"),
    searchField(tr(lang, "Quiero aprender…", "I want to learn…"), ui.query),
    h2(tr(lang, "Empieza aquí", "Start here")),
    el("div", { class: "mas-courses" }, cards),
  ]);
}

const PREF_ROWS = [
  ["idioma", "Idioma", "Language", "globe"],
  ["accesibilidad", "Accesibilidad", "Accessibility", "eye"],
  ["avisos", "Notificaciones", "Notifications", "bell"],
  ["privacidad", "Privacidad en este navegador", "Privacy on this browser", "lock"],
  ["datos", "Datos y almacenamiento", "Data and storage", "db"],
  ["ia", "Catálogo", "Catalog", "spark"],
  ["work", "Work en este navegador", "Work in this browser", "doc"],
];

function prefsPart(path) {
  if (path === "cuenta" || path === "preferencias") return "";
  if (path.startsWith("cuenta/")) return path.slice("cuenta/".length);
  if (path.startsWith("preferencias/")) return path.slice("preferencias/".length);
  return null;
}

function renderCuenta(ctx, path) {
  const lang = ctx.lang;
  const part = prefsPart(path);
  const data = loadMas(ctx.storage);
  if (part == null) return renderMissing(ctx);
  if (part === "perfil") return renderIdioma(ctx);
  if (part === "borrar") return renderClearPrefs(ctx);
  if (!part || part === "seguridad" || part === "equipos") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Preferencias", "Preferences"), "mas"),
      lead(tr(lang, "Opciones de este navegador.", "Options for this browser.")),
      el("nav", { class: "mas-list is-plain" }, PREF_ROWS.map(([id, es, en, glyph]) => row(lang, {
        es, en, icon: glyph, go: `mas/preferencias/${id}`, tone: "ink",
      }))),
    ]);
  }
  const back = "mas/preferencias";
  if (part === "idioma") return renderIdioma(ctx);
  if (part === "accesibilidad") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Accesibilidad", "Accessibility"), back),
      toggle(lang, "Reducir movimiento", "Reduce motion", "a11y.reduceMotion", data.a11y.reduceMotion),
      toggle(lang, "Más contraste", "Higher contrast", "a11y.contrast", data.a11y.contrast),
      h2(tr(lang, "Tamaño del texto", "Text size")),
      el("div", { class: "mas-themes" }, [
        ["md", "Normal", "Normal"],
        ["lg", "Grande", "Large"],
        ["xl", "Muy grande", "Larger"],
      ].map(([id, es, en]) => button(tr(lang, es, en), {
        class: "mas-theme canva-plain",
        "data-mas-text": id,
        "aria-pressed": data.a11y.textSize === id ? "true" : "false",
      }))),
    ]);
  }
  if (part === "avisos") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Notificaciones", "Notifications"), back),
      toggle(lang, "Avisar al guardar un diseño", "Tell me when a design is saved", "notices.saved", data.notices.saved),
      toggle(lang, "Avisar al exportar", "Tell me when an export finishes", "notices.export", data.notices.export),
      toggle(lang, "Novedades del producto en este navegador", "Product notes in this browser", "notices.product", data.notices.product),
      cta(tr(lang, "Ver notificaciones", "See notifications"), null, "mas/avisos"),
    ]);
  }
  if (part === "privacidad") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Controles de privacidad", "Privacy controls"), back),
      note(tr(lang, "Las búsquedas se quedan en este navegador.", "Searches stay in this browser.")),
      toggle(lang, "Recordar la búsqueda de esta pestaña", "Remember search on this tab", "privacy.searches", data.privacy.searches),
      toggle(lang, "Personalizar el inicio con tus diseños", "Personalize Home with your designs", "privacy.home", data.privacy.home),
    ]);
  }
  if (part === "datos") return renderDatos(ctx, data);
  if (part === "ia") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Personalización de la IA", "AI personalization"), back),
      toggle(lang, "Guardar el historial del catálogo", "Keep catalog history", "ai.history", data.ai.history),
      note(tr(lang, "Si lo apagas, se borran los chats del catálogo en este navegador. Las plantillas siguen en el catálogo.", "Turning this off clears catalog chats in this browser. Templates stay in the catalog.")),
      button(tr(lang, "Borrar chats del catálogo", "Clear catalog chats"), { class: "mas-danger canva-plain", "data-mas-clear": "chats" }),
    ]);
  }
  if (part === "work" || part === "vinculos") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Work en este navegador", "Work in this browser"), back),
      toggle(lang, "Guardar una copia local en Work", "Keep a local copy in Work", "linked.work", data.linked.work),
      note(tr(lang, data.linked.work ? "Work puede guardar una copia del diseño en este navegador." : "Work no guarda una copia desde Studio.", data.linked.work ? "Work can keep a copy of the design in this browser." : "Work does not keep a copy from Studio.")),
      el("a", { class: "mas-cta", href: "/work/", text: tr(lang, "Abrir ORVUPI Work", "Open ORVUPI Work") }),
    ]);
  }
  return renderMissing(ctx);
}

function renderIdioma(ctx) {
  const lang = ctx.lang;
  const current = typeof location === "undefined" ? "" : location.pathname.replace(/\/+$/, "") || "/";
  const langs = [
    ["/studio/", "es", "Español"],
    ["/en/studio/", "en", "English"],
    ["/pt-br/studio/", "pt-BR", "Português"],
    ["/ja/studio/", "ja", "日本語"],
    ["/ko/studio/", "ko", "한국어"],
  ];
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Idioma", "Language"), "mas/preferencias"),
    lead(tr(lang, "El idioma abre la página de Studio en ese idioma.", "Language opens the Studio page in that language.")),
    el("div", { class: "mas-langs" }, langs.map(([href, code, label]) => el("a", {
      href,
      lang: code,
      text: label,
      "aria-current": current === href.replace(/\/+$/, "") || `${current}/` === href ? "true" : null,
    }))),
  ]);
}

function renderDatos(ctx, data) {
  const lang = ctx.lang;
  const report = storageReport(ctx.storage);
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Datos y almacenamiento", "Data and storage"), "mas/preferencias"),
    el("p", { class: "mas-bytes", text: formatBytes(report.bytes) }),
    note(tr(lang, `${report.designs} elementos en la biblioteca · ${report.trash} en la papelera.`, `${report.designs} library items · ${report.trash} in trash.`)),
    el("ul", { class: "mas-keys" }, report.keys.map((item) => el("li", {}, [
      el("code", { text: item.key }),
      el("span", { text: formatBytes(item.bytes) }),
    ]))),
    note(tr(lang, "Las imágenes subidas viven en la base local del navegador, aparte de estas claves.", "Uploaded images live in the browser’s local database, apart from these keys.")),
    button(tr(lang, "Quitar la marca de sin conexión", "Clear offline marks"), { class: "mas-cta mas-cta-secondary canva-plain", "data-mas-clear": "offline" }),
    button(tr(lang, "Eliminar todos los datos de Studio", "Delete all Studio data"), { class: "mas-danger canva-plain", "data-mas-clear": "all" }),
  ]);
}

const CONFIG_BLOCKS = [
  ["pay", "Pagos y planes", "Payments and plans", [
    ["pedidos", "Pedidos y facturas", "Orders and invoices", "bag"],
    ["suscripcion", "Suscripción", "Subscription", "card"],
  ]],
  ["apps", "Gestión de apps", "App management", [
    ["apps", "Apps", "Apps", "apps"],
    ["privadas", "Apps privadas", "Private apps", "lock"],
  ]],
  ["web", "Dominios", "Domains", [
    ["dominios", "Dominios web", "Web domains", "globe"],
  ]],
];

function renderConfig(ctx, path) {
  const lang = ctx.lang;
  const part = path === "config" ? "" : path.slice("config/".length);
  if (!part) {
    const blocks = CONFIG_BLOCKS.map(([, es, en, rows]) => el("section", {}, [
      h2(tr(lang, es, en)),
      el("div", { class: "mas-list" }, rows.map(([id, labelEs, labelEn, glyph]) => row(lang, {
        es: labelEs, en: labelEn, icon: glyph, go: `mas/config/${id}`, tone: "ink",
      }))),
    ]));
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Configuración", "Settings"), "mas"),
      ...blocks,
    ]);
  }
  const back = "mas/config";
  if (part === "personas" || part === "equipo") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Configuración", "Settings"), back),
      note(tr(lang, "El idioma, el tema y el almacenamiento están en Preferencias.", "Language, theme, and storage are in Preferences.")),
      cta(tr(lang, "Abrir preferencias", "Open preferences"), null, "mas/preferencias"),
    ]);
  }
  if (part === "pedidos") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Pedidos y facturas", "Orders and invoices"), back),
      el("div", { class: "mas-empty" }, [
        el("span", { class: "mas-empty-icon", "aria-hidden": "true" }, [icon("bag")]),
        el("p", { text: tr(lang, "No hay pedidos en este navegador.", "There are no orders in this browser.") }),
      ]),
    ]);
  }
  if (part === "suscripcion") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Suscripción", "Subscription"), back),
      el("p", { class: "mas-bytes", text: tr(lang, "Gratis", "Free") }),
      note(tr(lang, "Studio no tiene planes de pago.", "Studio has no paid plans.")),
    ]);
  }
  if (part === "apps") return renderApps(ctx);
  if (part === "privadas") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Apps privadas", "Private apps"), back),
      note(tr(lang, "No hay apps privadas. Las herramientas públicas están en Apps.", "There are no private apps. Public tools are in Apps.")),
      cta("Apps", null, "mas/apps"),
    ]);
  }
  if (part === "dominios") {
    return el("div", { class: "mas-page" }, [
      subhead(ctx, tr(lang, "Dominios web", "Web domains"), back),
      note(tr(lang, "Studio no publica ni aloja sitios. El sitio de ORVUPI es orvupi.com.", "Studio does not publish or host sites. The ORVUPI site is orvupi.com.")),
      el("a", { class: "mas-cta", href: "https://orvupi.com/", text: "orvupi.com" }),
    ]);
  }
  return renderMissing(ctx, path);
}

function renderTrash(ctx) {
  const lang = ctx.lang;
  const items = listTrash(ctx.storage);
  const menu = pop(tr(lang, "Opciones de la papelera", "Trash options"), [
    button(tr(lang, "Vaciar papelera", "Empty trash"), { class: "canva-plain", "data-mas-empty": "" }),
  ]);
  const rows = items.map((item) => {
    const name = item.name || tr(lang, "Sin título", "Untitled");
    const left = daysLeft(libraryOf(item).deletedAt);
    return el("article", { class: "mas-trash-row" }, [
      el("span", { class: "mas-trash-thumb", "aria-hidden": "true", text: initials(name, 1) }),
      el("span", { class: "mas-account-text" }, [
        el("strong", { text: name }),
        el("small", { text: tr(lang, `Quedan ${left} días`, `${left} days left`) }),
      ]),
      pop(tr(lang, "Opciones", "Options"), [
        button(tr(lang, "Recuperar", "Restore"), { class: "canva-plain", "data-mas-restore": item.id }),
        button(tr(lang, "Eliminar", "Delete"), { class: "canva-plain", "data-mas-purge": item.id }),
      ]),
    ]);
  });
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Papelera", "Trash"), "mas", { extra: menu }),
    el("span", { class: "mas-tabline", "aria-hidden": "true" }),
    el("p", { class: "mas-info", text: tr(lang, `Los diseños que hayas eliminado aparecerán aquí. Tendrás ${TRASH_DAYS} días para recuperarlos antes de que se eliminen de la papelera.`, `Designs you delete show up here. You have ${TRASH_DAYS} days to restore them before they leave the trash.`) }),
    rows.length ? el("div", { class: "mas-trash" }, rows) : el("div", { class: "mas-empty" }, [
      el("span", { class: "mas-empty-icon", "aria-hidden": "true" }, [icon("trash")]),
      el("p", { text: tr(lang, "La papelera está vacía.", "Trash is empty.") }),
    ]),
  ]);
}

function daysLeft(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return TRASH_DAYS;
  const left = TRASH_DAYS * 86400000 - (Date.now() - time);
  return Math.max(0, Math.ceil(left / 86400000));
}

function renderTema(ctx) {
  const lang = ctx.lang;
  const data = loadMas(ctx.storage);
  const options = [
    ["light", "Claro", "Light", "sun"],
    ["dark", "Oscuro", "Dark", "moon"],
    ["system", "Sistema", "System", "gear"],
  ];
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Tema", "Theme"), "mas"),
    lead(tr(lang, "El tema se aplica a Studio en este navegador.", "The theme applies to Studio in this browser.")),
    el("div", { class: "mas-themes" }, options.map(([id, es, en, glyph]) => {
      const node = button("", {
        class: "mas-theme canva-plain",
        "data-mas-theme": id,
        "aria-pressed": data.theme === id ? "true" : "false",
      });
      node.append(icon(glyph === "sun" ? "spark" : glyph), el("span", { text: tr(lang, es, en) }));
      return node;
    })),
  ]);
}

function renderComments(ctx) {
  const lang = ctx.lang;
  const faqs = lang === "en"
    ? [
      ["Where are designs saved?", "In this browser."],
      ["How do I export?", "Open the design and download PNG, JPG, or PDF."],
      ["How do I restore a design?", `Trash keeps it for ${TRASH_DAYS} days.`],
      ["Is there a paid plan?", "No. Studio has no paid plans."],
    ]
    : [
      ["¿Dónde se guardan los diseños?", "En este navegador."],
      ["¿Cómo exporto?", "Abre el diseño y descarga PNG, JPG o PDF."],
      ["¿Cómo recupero un diseño?", `La papelera lo guarda ${TRASH_DAYS} días.`],
      ["¿Hay un plan de pago?", "No. Studio no tiene planes de pago."],
    ];
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Ayuda y comentarios", "Help and feedback"), "mas"),
    el("div", { class: "mas-faq" }, faqs.map(([q, a]) => el("details", {}, [
      el("summary", { text: q }),
      el("p", { text: a }),
    ]))),
    el("a", { class: "mas-cta", href: "mailto:orvupi.hq@gmail.com", text: "orvupi.hq@gmail.com" }),
    el("a", { class: "mas-cta mas-cta-secondary", href: localHref("/studio/reglas/"), text: tr(lang, "Reglas y recursos", "Rules and assets") }),
    cta(tr(lang, "Preguntar al catálogo", "Ask the catalog"), null, "mas/te-ayudamos"),
  ]);
}

function renderAdvanced(ctx) {
  const lang = ctx.lang;
  const open = Boolean(ctx.state?.doc);
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Herramientas avanzadas", "Advanced tools"), "mas"),
    el("ul", { class: "mas-limits" }, [
      el("li", { text: tr(lang, `Hasta ${LIMITS.layers} capas y ${LIMITS.pages} páginas.`, `Up to ${LIMITS.layers} layers and ${LIMITS.pages} pages.`) }),
      el("li", { text: tr(lang, `Texto hasta ${LIMITS.text} caracteres.`, `Text up to ${LIMITS.text} characters.`) }),
      el("li", { text: tr(lang, `Lienzo de ${EDGE.min} a ${EDGE.max} px.`, `Canvas from ${EDGE.min} to ${EDGE.max} px.`) }),
      el("li", { text: tr(lang, `Hasta ${PROJECT_CAP} diseños en este navegador.`, `Up to ${PROJECT_CAP} designs in this browser.`) }),
    ]),
    cta(tr(lang, "Exportar JSON desde Mis diseños", "Export JSON from My designs"), null, "disenos"),
    open ? cta(tr(lang, "Volver al diseño abierto", "Back to the open design"), null, "editor") : note(tr(lang, "Abre un diseño para usar el paquete, el PDF y la copia en Work.", "Open a design to use the package, the PDF, and the Work copy.")),
    el("a", { class: "mas-cta mas-cta-secondary", href: "/work/", text: tr(lang, "Abrir ORVUPI Work", "Open ORVUPI Work") }),
  ]);
}

function renderClearPrefs(ctx) {
  const lang = ctx.lang;
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(lang, "Borrar preferencias", "Clear preferences"), "mas"),
    note(tr(lang, "Se borran los avisos, la privacidad y las opciones del catálogo de este navegador. Los diseños se quedan. El tema y la accesibilidad también.", "This clears notices, privacy, and catalog options in this browser. Designs stay. So do the theme and accessibility.")),
    button(tr(lang, "Borrar preferencias", "Clear preferences"), { class: "mas-danger canva-plain", "data-mas-signout": "" }),
  ]);
}

function renderMissing(ctx) {
  return el("div", { class: "mas-page" }, [
    subhead(ctx, tr(ctx.lang, "Más", "More"), "mas"),
    note(tr(ctx.lang, "Esa pantalla no está.", "That screen is not here.")),
  ]);
}

function renderScreen(ctx, path) {
  if (!path) return renderHub(ctx);
  if (path === "avisos") return renderAvisos(ctx);
  if (path === "te-ayudamos") return renderHelp(ctx);
  if (path === "marca" || path.startsWith("marca/")) return renderMarca(ctx, path);
  if (path === "imprime") return renderPrint(ctx);
  if (path === "apps") return renderApps(ctx);
  if (path === "dream") return renderDream(ctx);
  if (path === "anuncios" || path.startsWith("anuncios/")) return renderAds(ctx, path);
  if (path === "escuela") return renderSchool(ctx);
  if (path === "cuenta" || path.startsWith("cuenta/") || path === "preferencias" || path.startsWith("preferencias/")) return renderCuenta(ctx, path);
  if (path === "config" || path.startsWith("config/")) return renderConfig(ctx, path);
  if (path === "papelera") return renderTrash(ctx);
  if (path === "tema") return renderTema(ctx);
  if (path === "comentarios") return renderComments(ctx);
  if (path === "avanzadas") return renderAdvanced(ctx);
  if (path === "salir" || path === "borrar") return renderClearPrefs(ctx);
  return renderMissing(ctx);
}

function shellClass(path) {
  const grad = !path || path.startsWith("cuenta") || path.startsWith("preferencias") || path === "avisos" || path === "te-ayudamos" || path === "tema" || path === "salir" || path === "borrar" || path === "comentarios";
  return `${path ? "mas-sub" : "mas-hub"} ${grad ? "is-grad" : "is-plain"}`;
}

export function renderMas(ctx, parts) {
  purgeExpiredTrash(ctx.storage);
  const path = pathFromHash(typeof location === "undefined" ? "" : location.hash).slice(1).join("/");
  if (path !== ui.path) {
    const remember = loadMas(ctx.storage).privacy.searches !== false;
    if (remember && ui.path) ui.savedQuery[ui.path] = ui.query;
    ui.path = path;
    ui.query = remember ? (ui.savedQuery[path] || "") : "";
    ui.chip = "";
    ui.step = 1;
    ui.noticeSelect = false;
    ui.picked = [];
  }
  applyMasChrome(ctx.storage);
  const page = renderScreen(ctx, path);
  if (ui.flash) page.prepend(el("p", { class: "mas-flash", role: "status", text: ui.flash }));
  const shell = el("div", {
    class: `canva-home mas-screen ${shellClass(path)}`,
    "data-tab": "mas",
    "data-mas-screen": path || "hub",
  }, [page, parts.nav()]);
  const sub = path === "papelera"
    ? designsSub(ctx)
    : (path === "marca" || path.startsWith("marca/"))
      ? marcaSub(ctx, path)
      : path === "imprime"
        ? printSub(ctx)
        : null;
  if (sub) {
    shell.classList.add("has-sub");
    shell.prepend(desktopRail(ctx, "mas"), sub);
  } else shell.prepend(desktopRail(ctx, "mas"));
  ctx.root.replaceChildren(shell);
  if (ui.query) applyQuery(shell, ui.query);
  const fieldNode = document.getElementById("mas-buscar");
  if (fieldNode instanceof HTMLInputElement && ui.query) {
    fieldNode.focus();
    const end = fieldNode.value.length;
    fieldNode.setSelectionRange(end, end);
  }
}

const MAS_ACTIONS = [
  "masToggle", "masTheme", "masText", "masChip", "masStep", "masJump", "masRestore", "masPurge",
  "masEmpty", "masSignout", "masClear", "masReadAll", "masSelect", "masPick", "masReadGo", "masHelp",
];

export function handleMasClick(buttonNode, ctx) {
  if (!buttonNode?.dataset) return false;
  if (buttonNode.dataset.go) ui.flash = "";
  if (!MAS_ACTIONS.some((key) => key in buttonNode.dataset)) return false;
  ui.flash = "";
  const { storage, lang } = ctx;
  const refresh = () => {
    applyMasChrome(storage);
    if (typeof ctx.render === "function") ctx.render();
  };
  if (buttonNode.dataset.masToggle) {
    const key = buttonNode.dataset.masToggle;
    const next = togglePref(storage, key);
    if (key === "ai.history" && next.ai.history === false) clearIaChats(storage);
    if (key === "privacy.searches" && next.privacy.searches === false) ui.savedQuery = {};
    refresh();
    return true;
  }
  if (buttonNode.dataset.masTheme) {
    setTheme(storage, buttonNode.dataset.masTheme);
    refresh();
    return true;
  }
  if (buttonNode.dataset.masText) {
    setTextScale(storage, buttonNode.dataset.masText);
    refresh();
    return true;
  }
  if (buttonNode.dataset.masChip) {
    ui.chip = buttonNode.dataset.masChip;
    refresh();
    return true;
  }
  if ("masStep" in buttonNode.dataset) {
    ui.step = (Number(ui.step) % PRINT_STEPS.length) + 1;
    refresh();
    return true;
  }
  if (buttonNode.dataset.masJump) {
    document.getElementById(buttonNode.dataset.masJump)?.scrollIntoView({ block: "start" });
    return true;
  }
  if (buttonNode.dataset.masRestore) {
    restoreTrash(storage, buttonNode.dataset.masRestore);
    ui.flash = tr(lang, "Recuperado.", "Restored.");
    refresh();
    return true;
  }
  if (buttonNode.dataset.masPurge) {
    if (!ask(lang, "¿Eliminar este elemento de la papelera?", "Delete this item from trash?")) return true;
    deleteProjectSafe(storage, buttonNode.dataset.masPurge);
    ui.flash = tr(lang, "Eliminado.", "Deleted.");
    refresh();
    return true;
  }
  if ("masEmpty" in buttonNode.dataset) {
    if (!ask(lang, "¿Vaciar la papelera? No se puede deshacer.", "Empty trash? This cannot be undone.")) return true;
    emptyTrash(storage);
    ui.flash = tr(lang, "Papelera vacía.", "Trash emptied.");
    refresh();
    return true;
  }
  if ("masSignout" in buttonNode.dataset) {
    if (!ask(lang, "¿Borrar las preferencias de este navegador? Los diseños se quedan.", "Clear preferences in this browser? Designs stay.")) return true;
    resetProfile(storage);
    ui.flash = tr(lang, "Preferencias borradas.", "Preferences cleared.");
    applyMasChrome(storage);
    go(ctx, "mas");
    return true;
  }
  if (buttonNode.dataset.masClear === "offline") {
    const count = clearOfflineFlags(storage);
    ui.flash = tr(lang, `Marca de sin conexión quitada en ${count}.`, `Cleared the offline mark on ${count}.`);
    refresh();
    return true;
  }
  if (buttonNode.dataset.masClear === "chats") {
    if (!ask(lang, "¿Borrar los chats del catálogo en este navegador?", "Clear catalog chats in this browser?")) return true;
    clearIaChats(storage);
    ui.flash = tr(lang, "Chats borrados.", "Chats cleared.");
    refresh();
    return true;
  }
  if (buttonNode.dataset.masClear === "all") {
    if (!ask(lang, "¿Eliminar diseños, historial y chats de este navegador?", "Delete designs, history, and chats from this browser?")) return true;
    clearStudioData(storage);
    ui.flash = tr(lang, "Datos de Studio borrados de este navegador.", "Studio data cleared from this browser.");
    if (typeof ctx.onWipe === "function") ctx.onWipe();
    else {
      applyMasChrome(storage);
      go(ctx, "mas/preferencias/datos");
    }
    return true;
  }
  if ("masReadAll" in buttonNode.dataset) {
    markRead(storage, studioNotices(storage, lang).map((item) => item.id));
    ui.noticeSelect = false;
    ui.picked = [];
    refresh();
    return true;
  }
  if ("masSelect" in buttonNode.dataset) {
    ui.noticeSelect = !ui.noticeSelect;
    ui.picked = [];
    refresh();
    return true;
  }
  if (buttonNode.dataset.masPick) {
    const id = buttonNode.dataset.masPick;
    const picked = new Set(ui.picked);
    if (picked.has(id)) picked.delete(id);
    else picked.add(id);
    ui.picked = [...picked];
    refresh();
    return true;
  }
  if ("masReadGo" in buttonNode.dataset) {
    markRead(storage, ui.picked);
    ui.picked = [];
    ui.noticeSelect = false;
    refresh();
    return true;
  }
  if ("masHelp" in buttonNode.dataset) {
    sendIaPrompt(buttonNode.dataset.masHelp);
    return true;
  }
  return false;
}

export function handleMasInput(target, ctx) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.id === "mas-buscar") {
    ui.query = target.value;
    const root = target.closest(".mas-screen");
    if (root) applyQuery(root, ui.query);
    return true;
  }
  if (target.dataset.masField) {
    setMasField(ctx.storage, target.dataset.masField, target.value);
    return true;
  }
  return false;
}
