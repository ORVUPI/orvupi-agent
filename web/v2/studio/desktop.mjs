/** Rail de escritorio (≥900px). En móvil el CSS lo oculta; el bottom nav no cambia. */

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(text, attrs = {}, children = []) {
  return el("button", { type: "button", ...attrs, text }, children);
}

function icon(paths) {
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

function tr(ctx, es, en) {
  return ctx?.lang === "en" ? en : es;
}

function hashPath() {
  return String(typeof location === "undefined" ? "" : location.hash)
    .replace(/^#\/?/, "")
    .split(/[?&]/)[0];
}

const AVATAR = new URL("./assets/orvupi-avatar.png", import.meta.url).href;

const RAIL = [
  ["ia", "ORVUPI IA", "ORVUPI AI", "ia", null, true],
  ["inicio", "Inicio", "Home", "inicio", ["M4 11 12 4l8 7", "M6 10.5V20h12v-9.5"]],
  ["disenos", "Mis diseños", "My designs", "disenos", ["M4 7h6l2 2h8v10H4z"]],
  ["plantillas", "Plantillas", "Templates", "plantillas", ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"]],
  ["marca", "Marca", "Brand", "mas/marca", ["M12 3l2.2 5.2L20 9l-4 3.6.8 5.4L12 15.4 7.2 18l.8-5.4L4 9l5.8-.8z"]],
  ["apps", "Apps", "Apps", "mas/apps", ["M5 5h6v6H5z", "M13 5h6v6h-6z", "M5 13h6v6H5z", "M13 13h6v6h-6z"]],
  ["print", "Impresión", "Print", "mas/imprime", ["M6 9h12v7H6z", "M8 9V5h8v4", "M8 16v3h8v-3"]],
  ["mas", "Más", "More", "mas", ["M5 12h.01", "M12 12h.01", "M19 12h.01"]],
];

function railOn(id, tab) {
  const path = hashPath();
  if (id === "marca") return path === "mas/marca" || path.startsWith("mas/marca/");
  if (id === "apps") return path === "mas/apps" || path.startsWith("mas/apps/");
  if (id === "print") return path === "mas/imprime" || path.startsWith("mas/imprime/");
  if (id === "disenos") return tab === "disenos" || path === "mas/papelera";
  if (id === "plantillas") return tab === "plantillas";
  if (id === "ia") return tab === "ia";
  if (id === "inicio") return tab === "inicio";
  if (id === "mas") {
    if (tab !== "mas") return false;
    if (!path.startsWith("mas")) return false;
    if (path === "mas/marca" || path.startsWith("mas/marca/")) return false;
    if (path === "mas/apps" || path.startsWith("mas/apps/")) return false;
    if (path === "mas/imprime" || path.startsWith("mas/imprime/")) return false;
    if (path === "mas/papelera" || path === "mas/avisos") return false;
    return true;
  }
  return false;
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

function railItem(ctx, spec, tab) {
  const [id, es, en, go, paths, avatar] = spec;
  const label = tr(ctx, es, en);
  const node = button("", {
    class: "desk-item",
    "data-go": go,
    "aria-current": railOn(id, tab) ? "page" : null,
    "aria-label": label,
  });
  if (avatar) node.append(el("img", { src: AVATAR, alt: "", width: "26", height: "26" }));
  else if (id === "mas") node.append(dotsIcon());
  else node.append(icon(paths));
  node.append(el("span", { text: label }));
  return node;
}

function crearButton(ctx) {
  const label = tr(ctx, "Crear", "Create");
  const node = button("", {
    class: "desk-crear",
    "data-open-create": "1",
    "aria-label": label,
  });
  const mark = el("span", { class: "desk-crear-mark", "aria-hidden": "true" });
  mark.append(icon(["M12 5v14", "M5 12h14"]));
  node.append(mark, el("span", { class: "desk-crear-label", text: label }));
  return node;
}

export function desktopRail(ctx, tab) {
  const nav = el("nav", { class: "desk-rail-nav", "aria-label": tr(ctx, "Studio", "Studio") }, RAIL.map((spec) => railItem(ctx, spec, tab)));
  const foot = el("div", { class: "desk-rail-foot" }, [
    button("", {
      class: "desk-util",
      "data-go": "mas/papelera",
      "aria-label": tr(ctx, "Papelera", "Trash"),
      "aria-current": hashPath() === "mas/papelera" ? "page" : null,
    }, [icon(["M5 7h14", "M9 7V5h6v2", "M8 7l1 13h6l1-13"]), el("span", { text: tr(ctx, "Papelera", "Trash") })]),
    button("", {
      class: "desk-util",
      "data-go": "mas/avisos",
      "aria-label": tr(ctx, "Notificaciones", "Notifications"),
      "aria-current": hashPath() === "mas/avisos" ? "page" : null,
    }, [icon(["M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z", "M10 19a2 2 0 0 0 4 0"]), el("span", { text: tr(ctx, "Avisos", "Alerts") })]),
    el("a", { class: "desk-work", href: "https://orvupi.com/work" }, [
      icon(["M4 16h16", "M6 16V8l6-3 6 3v8"]),
      el("span", { text: "Work" }),
    ]),
  ]);
  const kids = [crearButton(ctx), nav, foot];
  return el("aside", { class: "desk-rail", "aria-label": tr(ctx, "Navegación", "Navigation") }, kids);
}

function subItem(label, attrs, on) {
  return button(label, {
    class: "desk-sub-item",
    "aria-current": on ? "page" : null,
    ...attrs,
  });
}

export function designsSub(ctx) {
  const path = hashPath();
  const view = path === "mas/papelera" ? "papelera" : (ctx.state?.designView || "todos");
  const rows = [
    ["todos", tr(ctx, "Todos", "All"), { "data-design-view": "todos" }],
    ["recientes", tr(ctx, "Recientes", "Recent"), { "data-design-view": "recientes" }],
    ["mios", tr(ctx, "Mis diseños", "My designs"), { "data-design-view": "mios" }],
    ["papelera", tr(ctx, "Papelera", "Trash"), { "data-go": "mas/papelera" }],
  ];
  return el("aside", { class: "desk-sub", "aria-label": tr(ctx, "Mis diseños", "My designs") }, [
    el("p", { class: "desk-sub-kicker", text: tr(ctx, "Mis diseños", "My designs") }),
    el("nav", {}, rows.map(([id, label, attrs]) => subItem(label, attrs, view === id))),
  ]);
}

export function marcaSub(ctx, path) {
  const here = `mas/${path || "marca"}`;
  const rows = [
    ["mas/marca", tr(ctx, "Kit de marca", "Brand kit")],
    ["mas/marca/plantillas", tr(ctx, "Plantillas de la marca", "Brand templates")],
    ["mas/marca/logos", tr(ctx, "Logos", "Logos")],
    ["mas/marca/colores", tr(ctx, "Colores", "Colors")],
    ["mas/marca/fuentes", tr(ctx, "Fuentes", "Fonts")],
    ["mas/marca/voz", tr(ctx, "Voz de la marca", "Brand voice")],
    ["mas/marca/fotos", tr(ctx, "Fotos", "Photos")],
    ["mas/marca/elementos", tr(ctx, "Elementos gráficos", "Graphic elements")],
    ["mas/marca/iconos", tr(ctx, "Iconos", "Icons")],
    ["mas/marca/graficos", tr(ctx, "Gráficos", "Charts")],
  ];
  return el("aside", { class: "desk-sub", "aria-label": tr(ctx, "Marca", "Brand") }, [
    el("p", { class: "desk-sub-kicker", text: tr(ctx, "Kit de marca", "Brand kit") }),
    el("nav", {}, rows.map(([go, label]) => subItem(label, { "data-go": go }, here === go))),
  ]);
}

export function printSub(ctx) {
  const rows = [
    [tr(ctx, "Todos los productos", "All products"), { "data-go": "mas/imprime" }, true],
    [tr(ctx, "Carteles", "Posters"), { "data-format": "poster" }, false],
    [tr(ctx, "Flyers", "Flyers"), { "data-format": "flyer" }, false],
    [tr(ctx, "Invitaciones", "Invitations"), { "data-format": "invite" }, false],
    [tr(ctx, "Tarjetas", "Cards"), { "data-format": "card" }, false],
    [tr(ctx, "Folletos", "Leaflets"), { "data-format": "trifold" }, false],
    [tr(ctx, "Currículum", "Resume"), { "data-format": "cv" }, false],
  ];
  return el("aside", { class: "desk-sub", "aria-label": tr(ctx, "Impresión", "Print") }, [
    el("p", { class: "desk-sub-kicker", text: tr(ctx, "Impresión", "Print") }),
    el("nav", {}, rows.map(([label, attrs, on]) => subItem(label, attrs, on))),
  ]);
}
