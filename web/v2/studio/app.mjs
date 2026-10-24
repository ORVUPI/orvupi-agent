/** ORVUPI Studio. El diseño se edita y se guarda en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { paintBackground } from "./lib/backgrounds.mjs";
import { encodeJpeg, jpegQuality, renderDocument } from "./lib/compose.mjs";
import {
  BRAND,
  FONTS,
  PRESETS,
  alignLayers,
  blankDocument,
  bringForward,
  bringToFront,
  duplicateLayer,
  duplicateLayers,
  exportProject,
  fontById,
  groupLayers,
  imageLayer,
  importProject,
  lineLayer,
  lockLayers,
  moveLayer,
  orderedLayers,
  overlappingIds,
  projectTexts,
  rectLayer,
  reorderLayers,
  sendBackward,
  sendToBack,
  textLayer,
  uid,
  ungroupLayers,
} from "./lib/document.mjs";
import { exportAllowed } from "./lib/filter.mjs";
import { createImageStore } from "./lib/images.mjs";
import { LOGO_MAX_BYTES, readLogoPng } from "./lib/logo.mjs";
import { IDEAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import {
  adoptLegacyDraft,
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
  saveProject,
} from "./lib/projects.mjs";
import { FILE_NAME, REVOKE_MS, canShareFiles, isIOS, saveMode } from "./lib/save.mjs";

const root = document.getElementById("studio-root");
const lang = (document.documentElement.lang || "es").toLowerCase().startsWith("en") ? "en" : "es";
const storage = globalThis.localStorage;
const images = createImageStore();
const logoInput = document.getElementById("logo");
const logoEstado = document.getElementById("logo-estado");
const descargar = document.getElementById("descargar");
const descargarJpg = document.getElementById("descargar-jpg");
const compartir = document.getElementById("compartir");
const borrar = document.getElementById("borrar");
const avisoGuardar = document.getElementById("aviso-guardar");
const avisoBloqueo = document.getElementById("aviso-bloqueo");
const avisoPreparando = document.getElementById("aviso-preparando");
const acciones = document.getElementById("studio-acciones");

const COPY = {
  es: {
    inicio: "Inicio",
    plantillas: "Plantillas",
    disenos: "Mis diseños",
    crear: "Crear",
    crearPieza: "Crear pieza",
    reciente: "Recientes",
    vacioReciente: "Todavía no hay diseños en este navegador.",
    buscar: "Buscar",
    ideas: "Ideas",
    ideaNota: "Elige una idea y se abre una plantilla editable. No hay generación automática.",
    local: "El diseño se queda en este navegador.",
    todas: "Todas",
    meme: "Memes",
    publicacion: "Publicación",
    historia: "Historia",
    anuncio: "Anuncio",
    marca: "Marca",
    estilo: "Estilo",
    tema: "Tema",
    color: "Color",
    precio: "Precio",
    gratis: "Gratis",
    formato: "Formato",
    humor: "Humor",
    claro: "Claro",
    comic: "Cómic",
    informativo: "Informativo",
    rosa: "Rosa",
    crema: "Crema",
    azul: "Azul",
    limpiar: "Limpiar filtros",
    vacio: "Ninguna plantilla con ese filtro.",
    tamano: "Tamaño de la pieza",
    personalizado: "Personalizado",
    ancho: "Ancho",
    alto: "Alto",
    usar: "Usar este tamaño",
    cerrar: "Cerrar",
    abrir: "Abrir",
    duplicar: "Duplicar",
    eliminar: "Eliminar",
    exportar: "Exportar JSON",
    importar: "Importar JSON",
    soloAqui: "Solo en este navegador.",
    confirmarBorrar: "¿Eliminar este diseño de este navegador?",
    elementos: "Elementos",
    texto: "Texto",
    subidos: "Subidos",
    herramientas: "Herramientas",
    fondo: "Fondo",
    seleccionar: "Seleccionar",
    dibujar: "Dibujar",
    forma: "Forma",
    linea: "Línea",
    anadirTexto: "Añadir texto",
    titulo: "Título",
    cuerpo: "Cuerpo",
    deshacer: "Deshacer",
    rehacer: "Rehacer",
    ajustar: "Ajustar",
    cien: "100%",
    capas: "Capas",
    solapadas: "Solapadas",
    agrupar: "Agrupar",
    desagrupar: "Desagrupar",
    bloquear: "Bloquear",
    mostrar: "Mostrar",
    ocultar: "Ocultar",
    alFrente: "Al frente",
    adelante: "Adelante",
    atras: "Atrás",
    alFondo: "Al fondo",
    izquierda: "Izquierda",
    centro: "Centro",
    derecha: "Derecha",
    arriba: "Arriba",
    medio: "Medio",
    abajo: "Abajo",
    cambiar: "Cambiar imagen",
    recorte: "Recorte",
    posicion: "Posición",
    rotacion: "Rotación",
    kit: "El kit de ORVUPI va incluido: personajes, colores y tipografías. No hace falta un plan de pago.",
    verMarca: "Ver la marca",
    aplicar: "Aplicar",
    personaje: "Personaje",
    colores: "Colores",
    tipos: "Tipografías",
    sinSubidas: "Todavía no hay imágenes subidas en esta pieza.",
    subir: "Subir imagen",
    pendiente: "Imagen pendiente",
    nombre: "Nombre del diseño",
    guardado: "Guardado en este navegador",
    cuota: "No se pudo guardar. Exporta un archivo JSON si quieres una copia.",
    faltaImagen: "Falta una imagen subida. Esos bytes no viajan dentro del JSON.",
    version: "Este archivo es de otra versión.",
    invalido: "Ese archivo no se puede abrir.",
    imagenLista: "Imagen lista",
    calidad: "Calidad JPG",
    bloqueo: "Hay palabras o datos que no se pueden usar. Cambia el texto para descargar.",
  },
  en: {
    inicio: "Home",
    plantillas: "Templates",
    disenos: "My designs",
    crear: "Create",
    crearPieza: "Create a piece",
    reciente: "Recent",
    vacioReciente: "There are no designs in this browser yet.",
    buscar: "Search",
    ideas: "Ideas",
    ideaNota: "Pick an idea and an editable template opens. Nothing is generated for you.",
    local: "The design stays in this browser.",
    todas: "All",
    meme: "Memes",
    publicacion: "Post",
    historia: "Story",
    anuncio: "Update",
    marca: "Brand",
    estilo: "Style",
    tema: "Theme",
    color: "Color",
    precio: "Price",
    gratis: "Free",
    formato: "Format",
    humor: "Humor",
    claro: "Light",
    comic: "Comic",
    informativo: "Info",
    rosa: "Pink",
    crema: "Cream",
    azul: "Navy",
    limpiar: "Clear filters",
    vacio: "No template matches that filter.",
    tamano: "Piece size",
    personalizado: "Custom",
    ancho: "Width",
    alto: "Height",
    usar: "Use this size",
    cerrar: "Close",
    abrir: "Open",
    duplicar: "Duplicate",
    eliminar: "Delete",
    exportar: "Export JSON",
    importar: "Import JSON",
    soloAqui: "Only in this browser.",
    confirmarBorrar: "Delete this design from this browser?",
    elementos: "Elements",
    texto: "Text",
    subidos: "Uploads",
    herramientas: "Tools",
    fondo: "Background",
    seleccionar: "Select",
    dibujar: "Draw",
    forma: "Shape",
    linea: "Line",
    anadirTexto: "Add text",
    titulo: "Title",
    cuerpo: "Body",
    deshacer: "Undo",
    rehacer: "Redo",
    ajustar: "Fit",
    cien: "100%",
    capas: "Layers",
    solapadas: "Overlapping",
    agrupar: "Group",
    desagrupar: "Ungroup",
    bloquear: "Lock",
    mostrar: "Show",
    ocultar: "Hide",
    alFrente: "To front",
    adelante: "Forward",
    atras: "Backward",
    alFondo: "To back",
    izquierda: "Left",
    centro: "Center",
    derecha: "Right",
    arriba: "Top",
    medio: "Middle",
    abajo: "Bottom",
    cambiar: "Replace image",
    recorte: "Crop",
    posicion: "Position",
    rotacion: "Rotation",
    kit: "The ORVUPI kit is included: characters, colors, and type. No paid plan is required.",
    verMarca: "See the brand",
    aplicar: "Apply",
    personaje: "Character",
    colores: "Colors",
    tipos: "Typefaces",
    sinSubidas: "This piece has no uploaded images yet.",
    subir: "Upload image",
    pendiente: "Image missing",
    nombre: "Design name",
    guardado: "Saved in this browser",
    cuota: "Could not save. Export a JSON file if you want a copy.",
    faltaImagen: "An uploaded image is missing. Those bytes are not inside the JSON.",
    version: "This file is from another version.",
    invalido: "That file cannot be opened.",
    imagenLista: "Image ready",
    calidad: "JPG quality",
    bloqueo: "Some words or data cannot be used. Change the text to download.",
  },
};

function t(key) {
  return COPY[lang][key] || COPY.es[key] || key;
}

const state = {
  filters: { text: "", uso: "", estilo: "", color: "", precio: "", formato: "" },
  rail: "plantillas",
  tool: "select",
  doc: null,
  selected: [],
  past: [],
  future: [],
  layerFilter: "all",
  zoom: "fit",
  status: "",
  busy: false,
  userImages: new Map(),
  scale: 1,
  drawing: null,
};

let fileMode = "image";
let saveTimer = 0;
let logoTicket = 0;
const urlCache = new Map();

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

function statusText() {
  if (state.status === "quota") return t("cuota");
  if (state.status === "missing-image") return t("faltaImagen");
  if (state.status === "version") return t("version");
  if (state.status === "invalid") return t("invalido");
  if (state.status === "saved") return t("guardado");
  return "";
}

function viewName() {
  const name = location.hash.replace(/^#\/?/, "");
  if (name === "plantillas" || name === "disenos" || name === "editor") return name;
  return "inicio";
}

function go(view) {
  const next = view === "inicio" ? "#/" : `#/${view}`;
  if (location.hash === next) render();
  else location.hash = next;
}

function snapshot() {
  if (!state.doc) return;
  state.past.push(JSON.stringify(exportProject(state.doc)));
  if (state.past.length > 30) state.past.shift();
  state.future = [];
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!state.doc) return;
    const result = saveProject(storage, state.doc);
    state.status = result.ok ? "saved" : "quota";
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = statusText();
  }, 400);
}

function openDoc(doc) {
  state.doc = doc;
  state.selected = [];
  state.past = [];
  state.future = [];
  state.rail = "plantillas";
  const saved = saveProject(storage, doc);
  state.status = saved.ok ? "saved" : "quota";
  if (location.hash !== "#/editor") location.hash = "#/editor";
  else render();
  void hydrateUsers();
}

async function hydrateUsers() {
  if (!state.doc) return;
  const id = state.doc.id;
  for (const layer of state.doc.layers) {
    if (layer.src?.kind !== "user") continue;
    if (state.userImages.has(layer.src.id)) continue;
    const image = await images.get(id, layer.src.id);
    if (state.doc?.id !== id) return;
    if (image) state.userImages.set(layer.src.id, image);
  }
  if (viewName() === "editor") render();
}

function primary() {
  const id = state.selected[state.selected.length - 1];
  return state.doc?.layers.find((layer) => layer.id === id) || null;
}

function catalogItem(id) {
  return catalog.items.find((item) => item.id === id) || null;
}

function hideLogoErrors() {
  for (const id of ["aviso-logo", "aviso-logo-formato", "aviso-logo-peso", "aviso-logo-medida", "aviso-logo-reducir"]) {
    const node = document.getElementById(id);
    if (node) node.hidden = true;
  }
}

function showLogoError(message) {
  hideLogoErrors();
  const id = message === "logo-bytes" ? "aviso-logo-peso"
    : message === "logo-size" ? "aviso-logo-medida"
      : message === "logo-format" ? "aviso-logo-formato"
        : message === "logo-scale" ? "aviso-logo-reducir"
          : "aviso-logo";
  const node = document.getElementById(id);
  if (node) node.hidden = false;
  if (logoEstado) logoEstado.textContent = "";
}

function nav() {
  return el("nav", { class: "studio-nav", "aria-label": t("inicio") }, [
    button(t("inicio"), { "data-go": "inicio", "aria-current": viewName() === "inicio" ? "page" : null }),
    button(t("plantillas"), { "data-go": "plantillas", "aria-current": viewName() === "plantillas" ? "page" : null }),
    button(t("disenos"), { "data-go": "disenos", "aria-current": viewName() === "disenos" ? "page" : null }),
  ]);
}

function chip(label, pressed, attrs) {
  return button(label, { ...attrs, "aria-pressed": pressed ? "true" : "false", class: "chip" });
}

function filtersBlock() {
  const usos = [["", "todas"], ["meme", "meme"], ["publicacion", "publicacion"], ["historia", "historia"], ["anuncio", "anuncio"], ["marca", "marca"]];
  const estilos = [["", "todas"], ["humor", "humor"], ["claro", "claro"], ["comic", "comic"], ["informativo", "informativo"], ["marca", "marca"]];
  const colores = [["", "todas"], ["rosa", "rosa"], ["crema", "crema"], ["azul", "azul"]];
  const formatos = [["", "todas"], ["square", "formato"], ["story", "historia"], ["x", "formato"], ["tiktok", "formato"]];
  const formatLabel = (id) => (id === "square" ? "1:1" : id === "story" ? "9:16" : id === "x" ? "X" : id === "tiktok" ? "TikTok" : t("todas"));
  const group = (name, pairs, current, labelOf) => el("div", { class: "chips", role: "group", "aria-label": t(name) }, pairs.map(([id, key]) => chip(labelOf ? labelOf(id, key) : t(key), current === id, { "data-filter": name === "tema" ? "uso" : name, "data-value": id })));
  return el("div", { class: "filtros" }, [
    el("label", { for: "buscar", text: t("buscar") }),
    el("input", { id: "buscar", type: "search", value: state.filters.text, autocomplete: "off" }),
    el("p", { class: "filtro-nombre", text: t("tema") }),
    group("tema", usos, state.filters.uso),
    el("p", { class: "filtro-nombre", text: t("estilo") }),
    group("estilo", estilos, state.filters.estilo),
    el("p", { class: "filtro-nombre", text: t("color") }),
    group("color", colores, state.filters.color),
    el("p", { class: "filtro-nombre", text: t("precio") }),
    chip(t("gratis"), state.filters.precio === "gratis", { "data-filter": "precio", "data-value": state.filters.precio === "gratis" ? "" : "gratis" }),
    el("p", { class: "filtro-nombre", text: t("formato") }),
    group("formato", formatos, state.filters.formato, (id) => formatLabel(id)),
    button(t("limpiar"), { id: "limpiar-filtros" }),
  ]);
}

function templateCard(item) {
  return button(item.nombre[lang] || item.nombre.es, { "data-template": item.id, class: "plantilla" });
}

function catalogBody() {
  const items = filterPlantillas(state.filters);
  const list = el("div", { class: "rejilla" }, items.map(templateCard));
  return el("div", { id: "catalogo" }, [
    filtersBlock(),
    items.length ? list : el("p", { id: "vacio-plantillas", text: t("vacio") }),
  ]);
}

function sizeDialog() {
  const presets = el("div", { class: "rejilla" }, PRESETS.map((item) => button(`${item[lang] || item.es} ${item.width}×${item.height}`, { "data-format": item.id })));
  return el("dialog", { id: "dialogo-tamano" }, [
    el("h2", { text: t("tamano") }),
    presets,
    el("h3", { text: t("personalizado") }),
    el("label", { for: "ancho-custom", text: t("ancho") }),
    el("input", { id: "ancho-custom", type: "number", min: "64", max: "2048", value: "1080" }),
    el("label", { for: "alto-custom", text: t("alto") }),
    el("input", { id: "alto-custom", type: "number", min: "64", max: "2048", value: "1080" }),
    button(t("usar"), { id: "crear-custom" }),
    button(t("cerrar"), { id: "cerrar-tamano" }),
  ]);
}

function recents() {
  const items = listProjects(storage);
  const list = items.length
    ? el("ul", { class: "recientes", id: "recientes" }, items.slice(0, 8).map((item) => el("li", {}, [
      button(item.name || t("abrir"), { "data-open": item.id }),
    ])))
    : el("p", { text: t("vacioReciente") });
  return el("section", {}, [el("h2", { text: t("reciente") }), list]);
}

function renderHome() {
  const ideas = el("div", { class: "chips", role: "group", "aria-label": t("ideas") }, IDEAS.map((item) => button(item[lang] || item.es, { "data-idea": item.id, class: "chip" })));
  root.replaceChildren(
    nav(),
    el("p", { class: "nota", text: t("local") }),
    button(t("crearPieza"), { id: "crear-pieza", class: "primary" }),
    el("h2", { text: t("ideas") }),
    ideas,
    el("p", { text: t("ideaNota") }),
    catalogBody(),
    recents(),
    sizeDialog(),
  );
}

function renderDesigns() {
  const items = listProjects(storage);
  const list = el("ul", { class: "disenos" }, items.map((item) => el("li", {}, [
    el("span", { text: item.name || t("abrir") }),
    button(t("abrir"), { "data-open": item.id }),
    button(t("duplicar"), { "data-duplicate": item.id }),
    button(t("eliminar"), { "data-delete": item.id }),
    button(t("exportar"), { "data-export": item.id }),
  ])));
  root.replaceChildren(
    nav(),
    el("p", { text: t("soloAqui") }),
    button(t("importar"), { id: "importar-json" }),
    items.length ? list : el("p", { text: t("vacioReciente") }),
    el("p", { id: "estado-guardado", "aria-live": "polite", text: statusText() }),
  );
}

function layerStyle(layer) {
  return `left:${layer.x}px;top:${layer.y}px;width:${layer.w}px;height:${layer.h}px;transform:rotate(${layer.rotation || 0}deg);opacity:${layer.opacity ?? 1};z-index:${layer.z};`;
}

function imageNode(layer) {
  const frame = el("div", { class: "capa-img" });
  if (layer.src?.kind === "user" && !state.userImages.has(layer.src.id)) {
    frame.append(el("p", { class: "pendiente", text: t("pendiente") }));
    return frame;
  }
  const img = el("img", { alt: "", draggable: "false" });
  let natural = null;
  if (layer.src?.kind === "catalog") {
    const item = catalogItem(layer.src.id);
    if (item) {
      img.src = item.archivo;
      natural = item.width && item.height ? { w: item.width, h: item.height } : null;
    }
  } else if (layer.src?.kind === "user") {
    const image = state.userImages.get(layer.src.id);
    if (image) {
      img.src = userUrl(layer.src.id, image);
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
  frame.append(img);
  return frame;
}

function userUrl(id, image) {
  if (urlCache.has(id)) return urlCache.get(id);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.putImageData(new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height), 0, 0);
  const url = canvas.toDataURL("image/png");
  urlCache.set(id, url);
  return url;
}

function stageNode() {
  const doc = state.doc;
  const scroll = el("div", { class: "stage-scroll" });
  const frame = el("div", { class: "stage-frame" });
  const art = el("div", { class: "stage-art" });
  art.style.width = `${doc.format.width}px`;
  art.style.height = `${doc.format.height}px`;
  art.style.background = doc.background.fill || BRAND.cream;
  const maxW = Math.max(280, scrollWidth());
  const maxH = Math.max(280, Math.round(window.innerHeight * 0.62));
  const fit = Math.min(maxW / doc.format.width, maxH / doc.format.height, 1);
  state.scale = state.zoom === "100" ? 1 : fit;
  frame.style.width = `${Math.round(doc.format.width * state.scale)}px`;
  frame.style.height = `${Math.round(doc.format.height * state.scale)}px`;
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
    } else if (layer.type === "image") node.append(imageNode(layer));
    else if (layer.type === "line") {
      const bar = el("div", { class: "capa-linea" });
      bar.style.background = layer.props.color;
      bar.style.height = `${Math.max(2, layer.props.strokeWidth || layer.h)}px`;
      node.append(bar);
    } else {
      const shape = el("div", { class: "capa-forma" });
      if (layer.props.fill) shape.style.background = layer.props.fill;
      if (layer.props.stroke && layer.props.strokeWidth) {
        shape.style.border = `${layer.props.strokeWidth}px solid ${layer.props.stroke}`;
      }
      node.append(shape);
    }
    if (state.selected.includes(layer.id) && !layer.locked) node.append(el("span", { class: "asa", "data-resize": layer.id }));
    art.append(node);
  }
  frame.append(art);
  scroll.append(frame);
  return scroll;
}

function scrollWidth() {
  const main = document.getElementById("contenido");
  return Math.min(720, (main?.clientWidth || 640) - 32);
}

function rail() {
  const tabs = [
    ["plantillas", "plantillas"],
    ["elementos", "elementos"],
    ["texto", "texto"],
    ["marca", "marca"],
    ["subidos", "subidos"],
    ["herramientas", "herramientas"],
    ["fondo", "fondo"],
  ];
  return el("div", { class: "riel", role: "tablist", "aria-label": t("herramientas") }, tabs.map(([id, key]) => button(t(key), {
    "data-rail": id,
    role: "tab",
    "aria-selected": state.rail === id ? "true" : "false",
  })));
}

function toolButtons() {
  const tools = [["select", "seleccionar"], ["draw", "dibujar"], ["rect", "forma"], ["line", "linea"], ["text", "anadirTexto"]];
  return el("div", { class: "chips" }, tools.map(([id, key]) => button(t(key), { "data-tool": id, "aria-pressed": state.tool === id ? "true" : "false" })));
}

function panel() {
  const doc = state.doc;
  if (state.rail === "plantillas") return catalogBody();
  if (state.rail === "elementos") {
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
    const colors = [["#FF3070", "rosa"], ["#FFF8EC", "crema"], ["#102032", "azul"]];
    return el("div", {}, [
      el("p", { text: t("kit") }),
      el("p", {}, [el("a", { href: "/marca/", text: t("verMarca") })]),
      el("h3", { text: t("personaje") }),
      el("div", { class: "rejilla" }, ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"].map((id) => {
        const item = catalogItem(id);
        const img = el("img", { src: item.archivo, alt: item.nombre[lang] || item.nombre.es, width: "96", height: "96" });
        const control = button("", { "data-avatar": id, class: "marca-pulpo" });
        control.append(img, el("span", { text: item.nombre[lang] || item.nombre.es }));
        return control;
      })),
      el("h3", { text: t("colores") }),
      el("div", { class: "chips" }, colors.map(([hex, key]) => button(t(key), { "data-color": hex, style: `background:${hex}` }))),
      el("h3", { text: t("tipos") }),
      el("div", { class: "rejilla" }, FONTS.map((font) => button(font[lang] || font.es, { "data-font": font.id, style: `font-family:${font.css}` }))),
    ]);
  }
  if (state.rail === "subidos") {
    const uploaded = doc.layers.filter((layer) => layer.src?.kind === "user");
    return el("div", {}, [
      button(t("subir"), { id: "subir-imagen" }),
      uploaded.length ? el("ul", {}, uploaded.map((layer) => el("li", {}, [button(layer.name, { "data-pick": layer.id })]))) : el("p", { text: t("sinSubidas") }),
    ]);
  }
  if (state.rail === "herramientas") return toolButtons();
  const fondos = catalog.items.filter((item) => item.tipo === "fondo");
  return el("div", {}, [
    el("div", { class: "chips" }, [["#FF3070", "rosa"], ["#FFF8EC", "crema"], ["#102032", "azul"]].map(([hex, key]) => button(t(key), { "data-fondo": hex }))),
    el("div", { class: "rejilla" }, fondos.map((item) => button(item.nombre[lang] || item.nombre.es, { "data-fondo-id": item.id }))),
  ]);
}

function positionPanel() {
  const layer = primary();
  const align = ["left", "center", "right", "top", "middle", "bottom"];
  const alignKey = { left: "izquierda", center: "centro", right: "derecha", top: "arriba", middle: "medio", bottom: "abajo" };
  const fields = layer ? el("div", { class: "medidas" }, ["x", "y", "w", "h"].map((key) => {
    const input = el("input", { id: `medida-${key}`, type: "number", "data-medida": key, value: String(Math.round(layer[key])) });
    return el("label", { text: key }, [input]);
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

function layersPanel() {
  const doc = state.doc;
  const focus = state.selected[0];
  const overlap = state.layerFilter === "overlap" ? new Set([...(focus ? [focus] : []), ...overlappingIds(doc, focus)]) : null;
  const rows = orderedLayers(doc).slice().reverse().filter((layer) => !overlap || overlap.has(layer.id) || (!focus && overlap.has(layer.id)));
  const list = el("ul", { id: "capas" }, rows.map((layer) => el("li", { draggable: "true", "data-layer": layer.id, class: state.selected.includes(layer.id) ? "activa" : "" }, [
    button(layer.visible === false ? t("mostrar") : t("ocultar"), { "data-action": "toggle", "data-id": layer.id }),
    button(layer.name, { "data-pick": layer.id }),
    button(layer.locked ? t("bloquear") : t("bloquear"), { "data-action": "lock-one", "data-id": layer.id, "aria-pressed": layer.locked ? "true" : "false" }),
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

function renderEditor() {
  const doc = state.doc;
  const name = el("input", { id: "nombre-diseno", type: "text", value: doc.name, maxlength: "80", "aria-label": t("nombre") });
  const textPanel = primary()?.type === "text" ? el("label", { text: t("texto") }, [
    el("textarea", { id: "texto-capa", text: primary().props.text }),
  ]) : null;
  root.replaceChildren(
    nav(),
    el("div", { class: "editor-bar" }, [
      name,
      button(t("deshacer"), { "data-action": "undo" }),
      button(t("rehacer"), { "data-action": "redo" }),
      button(t("ajustar"), { "data-zoom": "fit", "aria-pressed": state.zoom === "fit" ? "true" : "false" }),
      button(t("cien"), { "data-zoom": "100", "aria-pressed": state.zoom === "100" ? "true" : "false" }),
    ]),
    el("p", { id: "estado-guardado", "aria-live": "polite", text: statusText() }),
    el("div", { class: "editor" }, [
      rail(),
      el("div", { class: "panel", id: "panel-riel" }, [panel(), textPanel]),
      stageNode(),
      el("div", { class: "lado" }, [positionPanel(), layersPanel()]),
    ]),
  );
  const bar = root.querySelector(".editor-bar");
  if (acciones && bar) bar.append(acciones);
  ensureQuality();
  void paintBackdrop();
}

function ensureQuality() {
  if (document.getElementById("calidad-jpg") || !acciones) return;
  const select = el("select", { id: "calidad-jpg", "aria-label": t("calidad") });
  for (const value of ["0.7", "0.8", "0.92", "0.95"]) {
    const option = el("option", { value, text: value });
    if (value === "0.92") option.selected = true;
    select.append(option);
  }
  acciones.append(el("label", { text: t("calidad") }, [select]));
}

async function paintBackdrop() {
  const art = root.querySelector(".stage-art");
  const doc = state.doc;
  if (!art || !doc || doc.background.type !== "catalog" || !doc.background.catalogId) return;
  const w = Math.max(1, Math.round(doc.format.width / 4));
  const h = Math.max(1, Math.round(doc.format.height / 4));
  const rgba = new Uint8ClampedArray(w * h * 4);
  const color = doc.background.fill || BRAND.navy;
  const hex = color.replace("#", "");
  const n = Number.parseInt(hex, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = rgb[0];
    rgba[i + 1] = rgb[1];
    rgba[i + 2] = rgb[2];
    rgba[i + 3] = 255;
  }
  paintBackground(rgba, w, h, doc.background.catalogId);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d", { willReadFrequently: true }).putImageData(new ImageData(rgba, w, h), 0, 0);
  if (root.querySelector(".stage-art") === art) art.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
}

function render() {
  if (viewName() === "editor" && !state.doc) {
    go("inicio");
    return;
  }
  if (viewName() === "inicio") renderHome();
  else if (viewName() === "plantillas") root.replaceChildren(nav(), catalogBody());
  else if (viewName() === "disenos") renderDesigns();
  else renderEditor();
  syncChrome();
}

function syncChrome() {
  const editing = viewName() === "editor" && Boolean(state.doc);
  if (descargar) {
    descargar.disabled = !editing || state.busy;
    descargar.classList.toggle("preparando", state.busy);
  }
  if (descargarJpg) descargarJpg.disabled = !editing || state.busy;
  if (avisoPreparando) avisoPreparando.hidden = !state.busy;
  if (compartir) {
    const file = new File([new Blob(["png"])], FILE_NAME, { type: "image/png" });
    compartir.hidden = !(editing && canShareFiles(navigator, file));
  }
}

function addLayer(layer) {
  snapshot();
  layer.z = Math.max(0, ...state.doc.layers.map((item) => item.z)) + 1;
  state.doc.layers.push(layer);
  state.selected = [layer.id];
  scheduleSave();
  render();
}

function applyColor(hex) {
  const chosen = state.doc.layers.filter((layer) => state.selected.includes(layer.id) && (layer.type === "text" || layer.type === "rect" || layer.type === "line"));
  snapshot();
  if (!chosen.length) {
    state.doc.background = { type: "solid", catalogId: "", fill: hex };
  } else {
    for (const layer of chosen) {
      if (layer.type === "text") layer.props.color = hex;
      else if (layer.type === "line") layer.props.color = hex;
      else layer.props.fill = hex;
    }
  }
  scheduleSave();
  render();
}

function onRootClick(event) {
  const buttonNode = event.target.closest("button");
  if (!buttonNode || !root.contains(buttonNode)) return;
  if (buttonNode.dataset.go) go(buttonNode.dataset.go);
  if (buttonNode.id === "crear-pieza") document.getElementById("dialogo-tamano")?.showModal();
  if (buttonNode.id === "cerrar-tamano") document.getElementById("dialogo-tamano")?.close();
  if (buttonNode.dataset.format) openDoc(blankDocument(buttonNode.dataset.format));
  if (buttonNode.id === "crear-custom") {
    const width = Number(document.getElementById("ancho-custom")?.value);
    const height = Number(document.getElementById("alto-custom")?.value);
    openDoc(blankDocument("custom", { width, height }));
  }
  if (buttonNode.dataset.template) {
    const doc = instantiate(buttonNode.dataset.template);
    if (doc) openDoc(doc);
  }
  if (buttonNode.dataset.idea) {
    const idea = IDEAS.find((item) => item.id === buttonNode.dataset.idea);
    const doc = idea ? instantiate(idea.plantilla) : null;
    if (doc) openDoc(doc);
  }
  if (buttonNode.dataset.filter) {
    const key = buttonNode.dataset.filter;
    state.filters[key] = buttonNode.dataset.value || "";
    render();
  }
  if (buttonNode.id === "limpiar-filtros") {
    state.filters = { text: "", uso: "", estilo: "", color: "", precio: "", formato: "" };
    render();
  }
  if (buttonNode.dataset.open) {
    const doc = loadProject(storage, buttonNode.dataset.open);
    if (doc) openDoc(doc);
  }
  if (buttonNode.dataset.duplicate) {
    const copy = duplicateProject(storage, buttonNode.dataset.duplicate);
    state.status = copy ? "saved" : "quota";
    render();
  }
  if (buttonNode.dataset.delete) {
    if (window.confirm(t("confirmarBorrar"))) {
      deleteProject(storage, buttonNode.dataset.delete);
      if (state.doc?.id === buttonNode.dataset.delete) state.doc = null;
      render();
    }
  }
  if (buttonNode.dataset.export) exportJson(buttonNode.dataset.export);
  if (buttonNode.id === "importar-json" || buttonNode.id === "subir-imagen" || buttonNode.id === "cambiar-imagen") {
    fileMode = buttonNode.id === "importar-json" ? "project" : "image";
    if (logoInput) {
      logoInput.accept = fileMode === "project" ? "application/json" : "image/png,image/jpeg,image/webp";
      logoInput.click();
    }
  }
  if (buttonNode.dataset.rail) {
    state.rail = buttonNode.dataset.rail;
    render();
  }
  if (buttonNode.dataset.tool) {
    state.tool = buttonNode.dataset.tool;
    render();
  }
  if (buttonNode.dataset.add) addFromTool(buttonNode.dataset.add);
  if (buttonNode.dataset.avatar) {
    addLayer(imageLayer({ name: catalogItem(buttonNode.dataset.avatar)?.nombre?.es || "Personaje", x: 180, y: 180, w: 480, h: 480, src: { kind: "catalog", id: buttonNode.dataset.avatar } }));
  }
  if (buttonNode.dataset.color) applyColor(buttonNode.dataset.color);
  if (buttonNode.dataset.font) {
    const chosen = state.doc.layers.filter((layer) => state.selected.includes(layer.id) && layer.type === "text");
    if (chosen.length) {
      snapshot();
      for (const layer of chosen) layer.props.fontId = buttonNode.dataset.font;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.fondo) {
    snapshot();
    state.doc.background = { type: "solid", catalogId: "", fill: buttonNode.dataset.fondo };
    scheduleSave();
    render();
  }
  if (buttonNode.dataset.fondoId) {
    const item = catalogItem(buttonNode.dataset.fondoId);
    snapshot();
    state.doc.background = { type: "catalog", catalogId: buttonNode.dataset.fondoId, fill: item?.fill || BRAND.navy };
    scheduleSave();
    render();
  }
  if (buttonNode.dataset.align) {
    snapshot();
    alignLayers(state.doc, state.selected.length ? state.selected : [primary()?.id].filter(Boolean), buttonNode.dataset.align);
    scheduleSave();
    render();
  }
  if (buttonNode.dataset.action) runAction(buttonNode.dataset.action, buttonNode.dataset.id);
  if (buttonNode.dataset.pick) {
    const id = buttonNode.dataset.pick;
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      state.selected = state.selected.includes(id) ? state.selected.filter((item) => item !== id) : [...state.selected, id];
    } else state.selected = [id];
    render();
  }
  if (buttonNode.dataset.zoom) {
    state.zoom = buttonNode.dataset.zoom;
    render();
  }
  if (buttonNode.dataset.layers) {
    state.layerFilter = buttonNode.dataset.layers;
    render();
  }
}

function addFromTool(kind) {
  if (kind === "rect") addLayer(rectLayer({ name: t("forma"), x: 120, y: 120, w: 280, h: 180, fill: BRAND.pink }));
  if (kind === "line") addLayer(lineLayer({ name: t("linea"), x: 120, y: 200, w: 420, h: 16, color: BRAND.navy, strokeWidth: 8 }));
  if (kind === "titulo") addLayer(textLayer({ name: t("titulo"), x: 80, y: 80, w: 640, h: 140, text: t("titulo"), fontId: "anton", size: 72, color: BRAND.navy }));
  if (kind === "cuerpo" || kind === "texto") addLayer(textLayer({ name: t("cuerpo"), x: 80, y: 240, w: 640, h: 160, text: t("cuerpo"), fontId: "barlow", size: 40, color: BRAND.navy }));
}

function runAction(action, id) {
  const layer = id ? state.doc.layers.find((item) => item.id === id) : primary();
  if (action === "undo") {
    if (!state.past.length) return;
    state.future.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.past.pop());
    scheduleSave();
    render();
    return;
  }
  if (action === "redo") {
    if (!state.future.length) return;
    state.past.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.future.pop());
    scheduleSave();
    render();
    return;
  }
  if (!layer && !["group", "ungroup", "lock", "duplicate"].includes(action)) return;
  snapshot();
  if (action === "front" && layer) bringToFront(state.doc, layer.id);
  if (action === "forward" && layer) bringForward(state.doc, layer.id);
  if (action === "backward" && layer) sendBackward(state.doc, layer.id);
  if (action === "back" && layer) sendToBack(state.doc, layer.id);
  if (action === "toggle" && layer) layer.visible = layer.visible === false;
  if (action === "lock-one" && layer) layer.locked = !layer.locked;
  if (action === "group") groupLayers(state.doc, state.selected);
  if (action === "ungroup") ungroupLayers(state.doc, state.selected);
  if (action === "lock") lockLayers(state.doc, state.selected, true);
  if (action === "duplicate") {
    const copies = state.selected.length > 1 ? duplicateLayers(state.doc, state.selected) : [duplicateLayer(state.doc, state.selected[0])].filter(Boolean);
    retargetCopies(copies);
    state.selected = copies.map((item) => item.id);
  }
  scheduleSave();
  render();
}

function retargetCopies(copies) {
  for (const copy of copies) {
    if (copy?.src?.kind !== "user") continue;
    const image = state.userImages.get(copy.src.id);
    if (!image || copy.src.id === copy.id) continue;
    copy.src.id = copy.id;
    state.userImages.set(copy.id, image);
    void images.put(state.doc.id, copy.id, image);
  }
}

function bindStage() {
  root.addEventListener("pointerdown", (event) => {
    const resize = event.target.closest?.("[data-resize]");
    const capa = event.target.closest?.(".capa");
    const art = event.target.closest?.(".stage-art");
    if (!state.doc || !art) return;
    if (resize) {
      event.preventDefault();
      event.stopPropagation();
      startResize(resize.dataset.resize, event);
      return;
    }
    if (capa) {
      event.preventDefault();
      const id = capa.dataset.id;
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        state.selected = state.selected.includes(id) ? state.selected.filter((item) => item !== id) : [...state.selected, id];
        render();
        return;
      }
      state.selected = [id];
      const layer = state.doc.layers.find((item) => item.id === id);
      if (!layer || layer.locked || state.tool === "text") {
        render();
        return;
      }
      startDrag(id, event);
      return;
    }
    const point = stagePoint(art, event);
    if (state.tool === "text") addLayer(textLayer({ x: point.x, y: point.y, w: 420, h: 120, text: t("texto"), fontId: "barlow", size: 42, color: BRAND.navy }));
    else if (state.tool === "rect") addLayer(rectLayer({ x: point.x, y: point.y, w: 240, h: 160, fill: BRAND.pink }));
    else if (state.tool === "line" || state.tool === "draw") startDraw(point, event);
    else state.selected = [];
    if (state.tool === "select") render();
  });
}

function stagePoint(art, event) {
  const rect = art.getBoundingClientRect();
  return {
    x: Math.round((event.clientX - rect.left) / state.scale),
    y: Math.round((event.clientY - rect.top) / state.scale),
  };
}

function startDrag(id, event) {
  snapshot();
  const startX = event.clientX;
  const startY = event.clientY;
  const layer = state.doc.layers.find((item) => item.id === id);
  const members = layer.groupId ? state.doc.layers.filter((item) => item.groupId === layer.groupId) : [layer];
  const origins = members.map((item) => ({ id: item.id, x: item.x, y: item.y }));
  const move = (ev) => {
    const dx = Math.round((ev.clientX - startX) / state.scale);
    const dy = Math.round((ev.clientY - startY) / state.scale);
    for (const origin of origins) {
      const item = state.doc.layers.find((layerItem) => layerItem.id === origin.id);
      if (!item) continue;
      item.x = origin.x + dx;
      item.y = origin.y + dy;
      const node = root.querySelector(`.capa[data-id="${item.id}"]`);
      if (node) node.style.left = `${item.x}px`, node.style.top = `${item.y}px`;
    }
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    scheduleSave();
    render();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
  render();
}

function startResize(id, event) {
  snapshot();
  const layer = state.doc.layers.find((item) => item.id === id);
  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { w: layer.w, h: layer.h };
  const move = (ev) => {
    layer.w = Math.max(8, Math.round(origin.w + (ev.clientX - startX) / state.scale));
    layer.h = Math.max(8, Math.round(origin.h + (ev.clientY - startY) / state.scale));
    const node = root.querySelector(`.capa[data-id="${id}"]`);
    if (node) node.style.width = `${layer.w}px`, node.style.height = `${layer.h}px`;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", () => {
    window.removeEventListener("pointermove", move);
    scheduleSave();
    render();
  }, { once: true });
}

function startDraw(point, event) {
  snapshot();
  const layer = lineLayer({ x: point.x, y: point.y, w: 8, h: 8, color: BRAND.navy, strokeWidth: 8 });
  layer.z = Math.max(0, ...state.doc.layers.map((item) => item.z)) + 1;
  state.doc.layers.push(layer);
  state.selected = [layer.id];
  const art = root.querySelector(".stage-art");
  const move = (ev) => {
    const next = stagePoint(art, ev);
    layer.w = Math.max(8, next.x - layer.x);
    layer.h = Math.max(8, Math.abs(next.y - layer.y));
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", () => {
    window.removeEventListener("pointermove", move);
    scheduleSave();
    render();
  }, { once: true });
}

function bindInputs() {
  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === "buscar") {
      state.filters.text = target.value;
      const parent = target.closest("#catalogo");
      if (!parent) return;
      parent.replaceWith(catalogBody());
      const field = document.getElementById("buscar");
      if (field instanceof HTMLInputElement) {
        field.focus();
        const end = field.value.length;
        field.setSelectionRange(end, end);
      }
      return;
    }
    if (!state.doc) return;
    if (target.id === "nombre-diseno") {
      state.doc.name = target.value.slice(0, 80);
      scheduleSave();
    }
    if (target.id === "texto-capa") {
      const layer = primary();
      if (!layer || layer.type !== "text") return;
      layer.props.text = target.value.slice(0, 2000);
      const node = root.querySelector(`.capa[data-id="${layer.id}"] .capa-texto`);
      if (node) node.textContent = layer.props.text;
      scheduleSave();
    }
    if (target.dataset.medida) {
      const layer = primary();
      if (!layer) return;
      const key = target.dataset.medida;
      const value = Number(target.value);
      if (!Number.isFinite(value)) return;
      if (key === "rotation") layer.rotation = value;
      else layer[key] = key === "w" || key === "h" ? Math.max(8, value) : value;
      const node = root.querySelector(`.capa[data-id="${layer.id}"]`);
      if (node) node.setAttribute("style", layerStyle(layer) + (layer.visible === false ? "visibility:hidden;" : ""));
      scheduleSave();
    }
    if (target.dataset.crop) {
      const layer = primary();
      if (!layer || layer.type !== "image") return;
      const crop = { ...(layer.crop || { x: 0, y: 0, w: 0, h: 0 }) };
      crop[target.dataset.crop] = Number(target.value);
      layer.crop = Number.isFinite(crop.w) && crop.w > 0 && Number.isFinite(crop.h) && crop.h > 0 ? crop : null;
      scheduleSave();
    }
  });
  root.addEventListener("change", (event) => {
    if (event.target?.dataset?.crop) render();
  });
}

function bindLayersDrag() {
  let dragId = "";
  root.addEventListener("dragstart", (event) => {
    const row = event.target.closest?.("[data-layer]");
    if (!row) return;
    dragId = row.dataset.layer;
  });
  root.addEventListener("dragover", (event) => {
    if (event.target.closest?.("[data-layer]")) event.preventDefault();
  });
  root.addEventListener("drop", (event) => {
    const row = event.target.closest?.("[data-layer]");
    if (!row || !dragId || !state.doc) return;
    event.preventDefault();
    const ids = [...root.querySelectorAll("#capas [data-layer]")].map((item) => item.dataset.layer);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(row.dataset.layer);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    snapshot();
    reorderLayers(state.doc, ids);
    scheduleSave();
    render();
  });
}

function onKey(event) {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    runAction(event.shiftKey ? "redo" : "undo");
    return;
  }
  if (!state.doc || !state.selected.length) return;
  const step = event.shiftKey ? 10 : 1;
  let dx = 0;
  let dy = 0;
  if (event.key === "ArrowLeft") dx = -step;
  if (event.key === "ArrowRight") dx = step;
  if (event.key === "ArrowUp") dy = -step;
  if (event.key === "ArrowDown") dy = step;
  if (!dx && !dy) return;
  event.preventDefault();
  snapshot();
  const seen = new Set();
  for (const id of state.selected) {
    const layer = state.doc.layers.find((item) => item.id === id);
    if (!layer) continue;
    const key = layer.groupId || layer.id;
    if (seen.has(key)) continue;
    seen.add(key);
    moveLayer(state.doc, id, dx, dy);
  }
  scheduleSave();
  render();
}

async function onLogo() {
  hideLogoErrors();
  const file = logoInput.files && logoInput.files[0];
  logoInput.value = "";
  if (!file) return;
  if (fileMode === "project") {
    fileMode = "image";
    logoInput.accept = "image/png,image/jpeg,image/webp";
    await importJson(file);
    return;
  }
  if (file.size > LOGO_MAX_BYTES) {
    showLogoError("logo-bytes");
    return;
  }
  const ticket = ++logoTicket;
  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    showLogoError("logo");
    return;
  }
  try {
    const image = await readLogoPng(bytes);
    if (ticket !== logoTicket || !state.doc) return;
    const current = primary();
    snapshot();
    const layer = current?.type === "image" ? current : imageLayer({ name: t("subir"), x: 160, y: 160, w: 480, h: 480, src: { kind: "user", id: "pending" } });
    if (current?.type !== "image") {
      layer.z = Math.max(0, ...state.doc.layers.map((item) => item.z)) + 1;
      state.doc.layers.push(layer);
      state.selected = [layer.id];
    }
    layer.src = { kind: "user", id: layer.id };
    state.userImages.set(layer.id, image);
    urlCache.delete(layer.id);
    await images.put(state.doc.id, layer.id, image);
    if (logoEstado) logoEstado.textContent = t("imagenLista");
    scheduleSave();
    render();
  } catch (error) {
    showLogoError(error?.message);
  }
}

async function importJson(file) {
  try {
    const doc = importProject(await file.text());
    doc.id = uid("proj");
    const missing = doc.layers.some((layer) => layer.src?.kind === "user");
    if (missing) state.status = "missing-image";
    openDoc(doc);
  } catch (error) {
    state.status = error?.message === "version-desconocida" ? "version" : "invalid";
    render();
  }
}

function exportJson(id) {
  const doc = id === state.doc?.id ? state.doc : loadProject(storage, id);
  if (!doc) return;
  const blob = new Blob([JSON.stringify(exportProject(doc))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diseno.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
}

function releaseBlob(blob) {
  if (!state.doc) return null;
  const texts = projectTexts(state.doc);
  if (!exportAllowed(texts.title, texts.body, undefined, texts.label)) return null;
  return blob;
}

async function deliver(kind, forceShare = false) {
  if (!state.doc || state.busy) return;
  const texts = projectTexts(state.doc);
  if (!exportAllowed(texts.title, texts.body, undefined, texts.label)) {
    if (avisoBloqueo) avisoBloqueo.hidden = false;
    return;
  }
  if (avisoBloqueo) avisoBloqueo.hidden = true;
  if (avisoGuardar) avisoGuardar.hidden = true;
  state.busy = true;
  syncChrome();
  try {
    const rendered = await renderDocument(state.doc, { userImages: state.userImages });
    const blob = kind === "jpg"
      ? await encodeJpeg(rendered.rgba, rendered.width, rendered.height, jpegQuality(document.getElementById("calidad-jpg")?.value))
      : new Blob([rendered.png], { type: "image/png" });
    const ready = releaseBlob(blob);
    if (!ready) {
      if (avisoBloqueo) avisoBloqueo.hidden = false;
      return;
    }
    const file = new File([ready], kind === "jpg" ? "studio.jpg" : FILE_NAME, { type: ready.type || (kind === "jpg" ? "image/jpeg" : "image/png") });
    const shareOk = canShareFiles(navigator, file);
    const mode = kind === "jpg" ? "download" : forceShare && shareOk ? "share" : saveMode({ ios: isIOS(navigator), share: shareOk });
    const url = URL.createObjectURL(ready);
    if (mode === "share") {
      await navigator.share({ files: [file] });
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
      return;
    }
    if (mode === "open") {
      window.open(url, "_blank", "noopener");
      if (avisoGuardar) avisoGuardar.hidden = false;
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    if (kind === "jpg") link.download = "studio.jpg";
    else link.download = FILE_NAME;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
  } catch {
    state.status = "invalid";
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = statusText();
  } finally {
    state.busy = false;
    syncChrome();
  }
}

function boot() {
  try {
    adoptLegacyDraft(storage);
  } catch {
    /* el navegador puede negar el almacén; la página sigue */
  }
  if (!document.getElementById("calidad-jpg") && acciones) ensureQuality();
  root.addEventListener("click", onRootClick);
  bindStage();
  bindInputs();
  bindLayersDrag();
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", render);
  logoInput?.addEventListener("change", () => { void onLogo(); });
  logoInput?.addEventListener("cancel", () => {
    fileMode = "image";
    if (logoInput) logoInput.accept = "image/png,image/jpeg,image/webp";
  });
  descargar?.addEventListener("click", () => { void deliver("png"); });
  descargarJpg?.addEventListener("click", () => { void deliver("jpg"); });
  compartir?.addEventListener("click", () => { void deliver("png", true); });
  borrar?.addEventListener("click", () => {
    if (!state.doc) return;
    if (!window.confirm(t("confirmarBorrar"))) return;
    deleteProject(storage, state.doc.id);
    state.doc = null;
    go("inicio");
  });
  render();
}

if (root) boot();
