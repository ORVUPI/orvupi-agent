/** ORVUPI Studio. El diseño se edita y se guarda en este navegador. */

import catalog from "./catalog.json" with { type: "json" };
import { cloneForPaste, distributeLayers, duplicatePageAt, fitScale, movePageAt, proportionalSize, removePageAt, shiftCrop, snapBox } from "./lib/arrange.mjs";
import { paintBackground } from "./lib/backgrounds.mjs";
import { encodeJpeg, jpegQuality, renderDocument } from "./lib/compose.mjs";
import {
  BRAND,
  FONTS,
  PRESETS,
  alignLayers,
  blankDocument,
  bringForward,
  makeFormat,
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
  shellForFormat,
  textLayer,
  uid,
  ungroupLayers,
} from "./lib/document.mjs";
import { exportAllowed } from "./lib/filter.mjs";
import { createImageStore } from "./lib/images.mjs";
import { LOGO_MAX_BYTES, readLogoPng } from "./lib/logo.mjs";
import { IDEAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import { documentForThumb } from "./lib/thumb-docs.mjs";
import {
  adoptLegacyDraft,
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
  saveProject,
} from "./lib/projects.mjs";
import { FILE_NAME, REVOKE_MS, canShareFiles, isIOS, saveMode } from "./lib/save.mjs";
import { applySpan, spanIs } from "./lib/text-style.mjs";
import { catalogBody, layerStyle, renderDesigns, renderEditor, renderHome, renderMarca, renderPlantillas, renderRecursos } from "./views.mjs";

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
    buscarPh: "Busca un diseño de la comunidad",
    ideas: "Ideas",
    ideaNota: "Elige una idea y se abre una plantilla editable. No hay generación automática.",
    local: "El diseño se queda en este navegador.",
    todas: "Todas",
    meme: "Memes",
    publicacion: "Publicación",
    historia: "Historia",
    anuncio: "Anuncio",
    marca: "Marca",
    recursos: "Recursos",
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
    tamano: "Crear un diseño",
    verTodo: "Ver todo",
    seguir: "Seguir diseñando",
    paraTi: "Plantillas para ti",
    explora: "Explora las categorías",
    mostrarMas: "Mostrar más",
    mostrarMenos: "Mostrar menos",
    crearBlanco: "Crear en blanco",
    piezas: "Piezas editables",
    grupoTodo: "Todo",
    buscarCrear: "Qué pieza quieres",
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
    hero: "¿Qué diseñamos hoy?",
    fotos: "Fotos",
    graficos: "Gráficos",
    datos: "Datos",
    notas: "Notas",
    notasPizarra: "Notas de la pizarra",
    capasNota: "La lista de capas está en el lateral.",
    imprimir: "Imprimir",
    presentar: "Presentar",
    vistaPrevia: "Vista previa",
    exportarSitio: "Exportar",
    anadirSeccion: "+ Añadir una sección",
    anadirPagina: "Añadir una página",
    temporizador: "Temporizador",
    parar: "Parar",
    cuadricula: "Cuadrícula",
    pantalla: "Pantalla completa",
    barra: "Barra",
    punto: "Punto",
    unidadNota: "Unidad: px. Las medidas en pulgadas y milímetros quedan para una pasada posterior.",
    menu: "Menú",
    abrirWork: "Abrir en Work",
    workNota: "Este diseño no se abre todavía en Work. No se crea una copia ni una conversión. El archivo sigue en este navegador.",
    negrita: "Negrita",
    cursiva: "Cursiva",
    subrayado: "Subrayado",
    interlineado: "Interlineado",
    tamanoTexto: "Tamaño",
    medidaLienzo: "Tamaño",
    menos: "Reducir tamaño",
    mas: "Aumentar tamaño",
    opacidad: "Opacidad",
    contorno: "Contorno",
    grosor: "Grosor",
    circulo: "Círculo",
    voltearH: "Voltear horizontal",
    voltearV: "Voltear vertical",
    distribuirH: "Distribuir horizontal",
    distribuirV: "Distribuir vertical",
    guias: "Guías",
    duplicarPagina: "Duplicar página",
    borrarPagina: "Borrar página",
    anterior: "Anterior",
    siguiente: "Siguiente",
    paginas: "Páginas",
    cerrarInspector: "Cerrar inspector",
    cerrarPanel: "Cerrar panel",
    colorFondo: "Color de fondo",
    fotosNota: "Imágenes de esta pieza. No hay una fototeca aparte.",
    graficosNota: "Estas piezas son formas. No calculan datos.",
    paginaTope: "Esta versión guarda hasta 8 páginas.",
    ultimaPagina: "La última página no se borra.",
    previewNota: "Esto no publica la pieza. La descarga se queda en este dispositivo.",
    videoNota: "La descarga de este formato es un fotograma PNG.",
    tamanosNota: "Tamaños listos. El lienzo nuevo se abre en este navegador.",
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
    buscarPh: "Search a community design",
    ideas: "Ideas",
    ideaNota: "Pick an idea and an editable template opens. Nothing is generated for you.",
    local: "The design stays in this browser.",
    todas: "All",
    meme: "Memes",
    publicacion: "Post",
    historia: "Story",
    anuncio: "Update",
    marca: "Brand",
    recursos: "Assets",
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
    tamano: "Create a design",
    verTodo: "See all",
    seguir: "Keep designing",
    paraTi: "Templates for you",
    explora: "Explore categories",
    mostrarMas: "Show more",
    mostrarMenos: "Show less",
    crearBlanco: "Blank design",
    piezas: "Editable pieces",
    grupoTodo: "All",
    buscarCrear: "What piece do you want",
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
    hero: "What should we design?",
    fotos: "Photos",
    graficos: "Charts",
    datos: "Data",
    notas: "Notes",
    notasPizarra: "Board notes",
    capasNota: "The layer list is on the side.",
    imprimir: "Print",
    presentar: "Present",
    vistaPrevia: "Preview",
    exportarSitio: "Export",
    anadirSeccion: "+ Add a section",
    anadirPagina: "Add a page",
    temporizador: "Timer",
    parar: "Stop",
    cuadricula: "Grid",
    pantalla: "Full screen",
    barra: "Bar",
    punto: "Dot",
    unidadNota: "Unit: px. Inch and millimetre sizes come in a later pass.",
    menu: "Menu",
    abrirWork: "Open in Work",
    workNota: "This design does not open in Work yet. No copy and no conversion are created. The file stays in this browser.",
    negrita: "Bold",
    cursiva: "Italic",
    subrayado: "Underline",
    interlineado: "Line spacing",
    tamanoTexto: "Size",
    medidaLienzo: "Size",
    menos: "Decrease size",
    mas: "Increase size",
    opacidad: "Opacity",
    contorno: "Stroke",
    grosor: "Weight",
    circulo: "Circle",
    voltearH: "Flip horizontal",
    voltearV: "Flip vertical",
    distribuirH: "Distribute horizontal",
    distribuirV: "Distribute vertical",
    guias: "Guides",
    duplicarPagina: "Duplicate page",
    borrarPagina: "Delete page",
    anterior: "Previous",
    siguiente: "Next",
    paginas: "Pages",
    cerrarInspector: "Close inspector",
    cerrarPanel: "Close panel",
    colorFondo: "Background color",
    fotosNota: "Images in this piece. There is no separate photo library.",
    graficosNota: "These pieces are shapes. They do not calculate data.",
    paginaTope: "This version keeps up to 8 pages.",
    ultimaPagina: "The last page stays.",
    previewNota: "This does not publish the piece. The download stays on this device.",
    videoNota: "The download for this format is a PNG frame.",
    tamanosNota: "Ready-made sizes. A new canvas opens in this browser.",
  },
};

function t(key) {
  return COPY[lang][key] || COPY.es[key] || key;
}

const state = {
  filters: { text: "", uso: "", estilo: "", color: "", precio: "", formato: "" },
  grupo: "",
  masCats: false,
  thumbCat: "",
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
  createCat: "para-ti",
  fileMenu: false,
  preview: false,
  page: 0,
  grid: false,
  notesOpen: false,
  timerOn: false,
  dialog: false,
  resizing: false,
  timerSeconds: 0,
  inspectorOpen: true,
  panelOpen: true,
  navOpen: false,
  guides: false,
  editingId: "",
  workNote: false,
  pageNote: "",
  cropping: false,
  clip: null,
};

let fileMode = "image";
let saveTimer = 0;
let logoTicket = 0;
let clockTimer = 0;
const urlCache = new Map();

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

function statusText() {
  if (state.status === "quota") return t("cuota");
  if (state.status === "missing-image") return t("faltaImagen");
  if (state.status === "version") return t("version");
  if (state.status === "invalid") return t("invalido");
  if (state.status === "saved") return t("guardado");
  return "";
}

function viewName() {
  const hash = location.hash.replace(/^#\/?/, "");
  const known = ["plantillas", "disenos", "editor", "recursos", "marca"];
  if (location.hash) return known.includes(hash) ? hash : "inicio";
  const path = location.pathname.replace(/\/+$/, "");
  const hit = known.find((name) => path.endsWith(`/${name}`));
  return hit || "inicio";
}

function syncPages() {
  if (!state.doc) return;
  if (!Array.isArray(state.doc.meta.pages) || !state.doc.meta.pages.length) state.doc.meta.pages = [state.doc.layers];
  state.doc.meta.pages[state.page] = state.doc.layers;
  state.doc.meta.page = state.page;
}

function bindPages(doc) {
  if (!doc.meta) return 0;
  if (!Array.isArray(doc.meta.pages) || !doc.meta.pages.length) {
    doc.meta.pages = [doc.layers];
    doc.meta.page = 0;
    return 0;
  }
  const index = Math.min(doc.meta.pages.length - 1, Math.max(0, doc.meta.page || 0));
  doc.meta.page = index;
  doc.layers = doc.meta.pages[index];
  return index;
}

function go(view) {
  const next = view === "inicio" ? "#/" : `#/${view}`;
  if (location.hash === next) render();
  else location.hash = next;
}

function snapshot() {
  if (!state.doc) return;
  syncPages();
  state.past.push(JSON.stringify(exportProject(state.doc)));
  if (state.past.length > 30) state.past.shift();
  state.future = [];
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!state.doc) return;
    syncPages();
    const result = saveProject(storage, state.doc);
    state.status = result.ok ? "saved" : "quota";
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = statusText();
  }, 400);
}

function openDoc(doc) {
  state.doc = doc;
  state.page = bindPages(doc);
  state.selected = [];
  state.past = [];
  state.future = [];
  state.rail = shellRail(doc);
  state.dialog = false;
  state.resizing = false;
  state.preview = false;
  state.notesOpen = false;
  state.editingId = "";
  state.cropping = false;
  state.pageNote = "";
  state.workNote = false;
  state.navOpen = false;
  const narrow = window.innerWidth < 800;
  state.panelOpen = !narrow;
  state.inspectorOpen = !narrow;
  state.timerOn = false;
  state.timerSeconds = 0;
  clearInterval(clockTimer);
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


function shellRail(doc) {
  const shell = doc?.meta?.shell;
  if (shell === "whiteboard") return "elementos";
  return "plantillas";
}

function openThumb(id) {
  const doc = documentForThumb(id);
  if (!doc) return;
  openDoc(doc);
}

function applyFormat(id) {
  const preset = PRESETS.find((item) => item.id === id);
  if (state.resizing && state.doc && preset) {
    snapshot();
    state.doc.format = { id: preset.id, width: preset.width, height: preset.height };
    state.doc.meta.shell = shellForFormat(preset.id);
    state.rail = shellRail(state.doc);
    state.dialog = false;
    state.resizing = false;
    scheduleSave();
    render();
    return;
  }
  openDoc(blankDocument(id));
}

function applyCustomSize(width, height) {
  if (state.resizing && state.doc) {
    snapshot();
    state.doc.format = makeFormat({ id: "custom", width, height });
    state.doc.meta.shell = shellForFormat("custom");
    state.rail = shellRail(state.doc);
    state.dialog = false;
    state.resizing = false;
    scheduleSave();
    render();
    return;
  }
  openDoc(blankDocument("custom", { width, height }));
}

function showPage(index) {
  if (!state.doc) return;
  syncPages();
  const pages = state.doc.meta.pages;
  if (!pages[index]) return;
  state.page = index;
  state.doc.layers = pages[index];
  state.doc.meta.page = index;
  state.selected = [];
  render();
}

function addPage() {
  if (!state.doc) return;
  const shell = state.doc.meta.shell;
  if (shell === "whiteboard" || shell === "doc" || shell === "video" || shell === "web") return;
  syncPages();
  if (state.doc.meta.pages.length >= 8) {
    state.pageNote = t("paginaTope");
    render();
    return;
  }
  state.pageNote = "";
  snapshot();
  state.doc.meta.pages.push([]);
  state.page = state.doc.meta.pages.length - 1;
  state.doc.layers = state.doc.meta.pages[state.page];
  state.doc.meta.page = state.page;
  state.selected = [];
  scheduleSave();
  render();
}

function duplicateCurrentPage() {
  if (!state.doc) return;
  const shell = state.doc.meta.shell;
  if (shell === "whiteboard" || shell === "doc" || shell === "video" || shell === "web") return;
  syncPages();
  if (state.doc.meta.pages.length >= 8) {
    state.pageNote = t("paginaTope");
    render();
    return;
  }
  snapshot();
  const at = duplicatePageAt(state.doc.meta.pages, state.page, () => uid("ly"));
  if (at == null) return;
  state.pageNote = "";
  state.page = at;
  state.doc.layers = state.doc.meta.pages[at];
  state.doc.meta.page = at;
  state.selected = [];
  scheduleSave();
  render();
}

function deleteCurrentPage() {
  if (!state.doc) return;
  const shell = state.doc.meta.shell;
  if (shell === "whiteboard" || shell === "doc" || shell === "video" || shell === "web") return;
  syncPages();
  if (state.doc.meta.pages.length < 2) {
    state.pageNote = t("ultimaPagina");
    render();
    return;
  }
  snapshot();
  removePageAt(state.doc.meta.pages, state.page);
  state.page = Math.min(state.page, state.doc.meta.pages.length - 1);
  state.doc.layers = state.doc.meta.pages[state.page];
  state.doc.meta.page = state.page;
  state.pageNote = "";
  state.selected = [];
  scheduleSave();
  render();
}

function shiftPage(delta) {
  if (!state.doc) return;
  syncPages();
  const to = state.page + delta;
  if (to < 0 || to >= state.doc.meta.pages.length) return;
  snapshot();
  movePageAt(state.doc.meta.pages, state.page, to);
  state.page = to;
  state.doc.layers = state.doc.meta.pages[to];
  state.doc.meta.page = to;
  scheduleSave();
  render();
}

function addSection() {
  if (!state.doc || state.doc.meta.shell !== "web") return;
  snapshot();
  const doc = state.doc;
  const room = 2048 - doc.format.height;
  const grow = Math.min(420, Math.max(0, room));
  const y = Math.max(0, doc.format.height - (grow > 0 ? 24 : 320));
  if (grow >= 64) doc.format.height += grow;
  const z = Math.max(0, ...doc.layers.map((item) => item.z), 0) + 1;
  const width = doc.format.width;
  doc.layers.push(rectLayer({
    name: "Sección",
    x: 40,
    y,
    w: Math.max(120, width - 80),
    h: Math.min(320, Math.max(120, grow || 240)),
    z,
    fill: "#ffffff",
    stroke: BRAND.navy,
    strokeWidth: 2,
  }));
  const text = textLayer({
    name: "Sección",
    x: 64,
    y: y + 28,
    w: Math.max(80, width - 128),
    h: 100,
    z: z + 1,
    text: "Sección",
    fontId: "barlow",
    size: 36,
    color: BRAND.navy,
  });
  doc.layers.push(text);
  state.selected = [text.id];
  scheduleSave();
  render();
}

function toggleTimer() {
  state.timerOn = !state.timerOn;
  clearInterval(clockTimer);
  if (!state.timerOn) {
    state.timerSeconds = 0;
    render();
    return;
  }
  clockTimer = setInterval(() => {
    state.timerSeconds = (state.timerSeconds || 0) + 1;
    const node = document.getElementById("reloj");
    const n = state.timerSeconds;
    if (node) node.textContent = `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  }, 1000);
  render();
}

function toggleFullscreen() {
  const node = document.getElementById("lienzo-pizarra") || document.getElementById("lienzo") || document.querySelector(".stage-frame");
  if (!node) return;
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void node.requestFullscreen?.();
}

function makeCtx() {
  return {
    root,
    state,
    t,
    lang,
    storage,
    acciones,
    statusText,
    viewName,
    ensureQuality,
    paintBackdrop,
    userUrl,
    uploads: document.getElementById("logo")?.closest("details") || null,
  };
}

let rendering = false;

function render() {
  rendering = true;
  if (viewName() === "editor" && !state.doc) {
    rendering = false;
    go("inicio");
    return;
  }
  const view = viewName();
  const ctx = makeCtx();
  if (view === "inicio") renderHome(ctx);
  else if (view === "plantillas") renderPlantillas(ctx);
  else if (view === "disenos") renderDesigns(ctx);
  else if (view === "marca") renderMarca(ctx);
  else if (view === "recursos") renderRecursos(ctx);
  else renderEditor(ctx);
  applyStageFit();
  focusEditing();
  if (state.dialog) {
    const dialog = document.getElementById("dialogo-tamano");
    if (dialog && !dialog.open) dialog.showModal();
  }
  syncChrome();
  rendering = false;
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

function stageRoom() {
  const host = root.querySelector(".escenario");
  if (!host || host.clientWidth < 80 || host.clientHeight < 80) return null;
  const scroll = host.querySelector(".stage-scroll");
  let extra = 0;
  for (const child of host.children) {
    if (child === scroll) continue;
    extra += child.getBoundingClientRect().height;
  }
  return {
    w: Math.max(120, host.clientWidth - 8),
    h: Math.max(120, host.clientHeight - extra - 8),
  };
}

function applyStageFit() {
  if (!state.doc || viewName() !== "editor") return;
  const art = root.querySelector(".stage-art");
  const frame = root.querySelector(".stage-frame");
  const shell = root.querySelector(".orv-frame");
  if (shell) {
    const top = shell.getBoundingClientRect().top + window.scrollY;
    shell.style.height = `${Math.max(320, Math.round(window.innerHeight - top - 8))}px`;
  }
  if (!art || !frame) return;
  if (state.zoom === "100") state.scale = 1;
  else if (state.zoom === "fit") {
    const room = stageRoom();
    if (!room) {
      if (!applyStageFit.waiting) {
        applyStageFit.waiting = true;
        requestAnimationFrame(() => {
          applyStageFit.waiting = false;
          applyStageFit();
        });
      }
      return;
    }
    state.scale = fitScale(state.doc.format.width, state.doc.format.height, room.w, room.h);
  } else {
    const numeric = Number(state.zoom);
    if (Number.isFinite(numeric)) state.scale = Math.min(2, Math.max(0.1, numeric));
  }
  frame.style.width = `${Math.round(state.doc.format.width * state.scale)}px`;
  frame.style.height = `${Math.round(state.doc.format.height * state.scale)}px`;
  art.style.transform = `scale(${state.scale})`;
}

function focusEditing() {
  const node = state.editingId ? root.querySelector(`[data-edit="${state.editingId}"]`) : null;
  if (node instanceof HTMLElement && document.activeElement !== node) {
    rendering = true;
    node.focus();
    rendering = false;
  }
}

function textRange(layer) {
  const node = root.querySelector("[data-edit]");
  if (!(node instanceof HTMLElement)) return [0, layer.props.text.length];
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !node.contains(sel.anchorNode)) return [0, layer.props.text.length];
  const measure = (container, offset) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.setEnd(container, offset);
    return range.toString().length;
  };
  const a = measure(sel.anchorNode, sel.anchorOffset);
  const b = measure(sel.focusNode, sel.focusOffset);
  return [Math.min(a, b), Math.max(a, b)];
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
  if ("thumbCat" in buttonNode.dataset) {
    state.thumbCat = buttonNode.dataset.thumbCat || "";
    state.filters.uso = "";
    state.filters.text = "";
    state.filters.formato = "";
  }
  if (buttonNode.dataset.thumb) openThumb(buttonNode.dataset.thumb);
  if (buttonNode.dataset.go) go(buttonNode.dataset.go);
  if (buttonNode.id === "crear-pieza") {
    state.resizing = false;
    state.dialog = true;
    render();
  }
  if (buttonNode.id === "cerrar-tamano" || buttonNode.id === "cerrar-previa") {
    state.dialog = false;
    state.resizing = false;
    state.preview = false;
    render();
  }
  if (buttonNode.dataset.cat) {
    state.createCat = buttonNode.dataset.cat;
    state.dialog = true;
    render();
  }
  if (buttonNode.dataset.format) applyFormat(buttonNode.dataset.format);
  if (buttonNode.id === "crear-custom") {
    const width = Number(document.getElementById("ancho-custom")?.value);
    const height = Number(document.getElementById("alto-custom")?.value);
    applyCustomSize(width, height);
  }
  if (buttonNode.dataset.page) showPage(Number(buttonNode.dataset.page));
  if (buttonNode.id === "anadir-pagina") addPage();
  if (buttonNode.id === "duplicar-pagina") duplicateCurrentPage();
  if (buttonNode.id === "borrar-pagina") deleteCurrentPage();
  if (buttonNode.id === "pagina-anterior") shiftPage(-1);
  if (buttonNode.id === "pagina-siguiente") shiftPage(1);
  if (buttonNode.id === "menu-estudio") {
    state.navOpen = !state.navOpen;
    render();
  }
  if (buttonNode.id === "abrir-work") {
    state.workNote = true;
    render();
  }
  if (buttonNode.id === "cerrar-work") {
    state.workNote = false;
    render();
  }
  if (buttonNode.id === "alternar-panel") {
    state.panelOpen = !state.panelOpen;
    render();
  }
  if (buttonNode.id === "alternar-inspector" || buttonNode.id === "cerrar-inspector") {
    state.inspectorOpen = buttonNode.id === "cerrar-inspector" ? false : !state.inspectorOpen;
    render();
  }
  if (buttonNode.id === "guias") {
    state.guides = !state.guides;
    render();
  }
  if (buttonNode.id === "modo-recorte") {
    state.cropping = !state.cropping;
    render();
  }
  if (buttonNode.id === "anadir-seccion") addSection();
  if (buttonNode.id === "imprimir") window.print();
  if (buttonNode.id === "vista-previa") {
    state.preview = true;
    render();
  }
  if (buttonNode.id === "exportar-sitio") void deliver("png");
  if (buttonNode.id === "presentar" || buttonNode.id === "pantalla") toggleFullscreen();
  if (buttonNode.id === "cuadricula") {
    state.grid = !state.grid;
    render();
  }
  if (buttonNode.id === "temporizador") toggleTimer();
  if (buttonNode.id === "abrir-notas") {
    state.notesOpen = !state.notesOpen;
    render();
  }
  if (buttonNode.id === "abrir-archivo") {
    state.fileMenu = !state.fileMenu;
    render();
  }
  if (buttonNode.id === "redimensionar") {
    state.resizing = true;
    state.dialog = true;
    render();
  }
  if (buttonNode.dataset.size && state.doc) {
    const current = primary();
    const layer = current?.type === "text" ? current : state.doc.layers.find((item) => item.type === "text");
    if (layer) {
      snapshot();
      const delta = buttonNode.dataset.size === "up" ? 1 : -1;
      const next = Math.min(400, Math.max(8, Math.round(layer.props.size || 32) + delta));
      const [from, to] = textRange(layer);
      if (state.editingId === layer.id && to > from) layer.props.runs = applySpan(layer.props.text, layer.props.runs, from, to, { size: next }, layer.props);
      else layer.props.size = next;
      scheduleSave();
      render();
    }
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
  if ("grupo" in buttonNode.dataset) {
    state.grupo = buttonNode.dataset.grupo || "";
    state.masCats = false;
    render();
  }
  if (buttonNode.id === "mostrar-mas") {
    state.masCats = !state.masCats;
    render();
  }
  if (buttonNode.dataset.filter) {
    const key = buttonNode.dataset.filter;
    state.filters[key] = buttonNode.dataset.value || "";
    render();
  }
  if (buttonNode.id === "limpiar-filtros") {
    state.filters = { text: "", uso: "", estilo: "", color: "", precio: "", formato: "" };
    state.thumbCat = "";
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
  if (buttonNode.dataset.font && state.doc) {
    const chosen = state.doc.layers.filter((layer) => state.selected.includes(layer.id) && layer.type === "text");
    const targets = chosen.length ? chosen : state.doc.layers.filter((layer) => layer.type === "text").slice(0, 1);
    if (targets.length) {
      snapshot();
      for (const layer of targets) layer.props.fontId = buttonNode.dataset.font;
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
  if (buttonNode.dataset.style && state.doc) {
    const layer = primary();
    if (layer?.type === "text") {
      const key = buttonNode.dataset.style;
      const [from, to] = textRange(layer);
      const on = !spanIs(layer.props.text, layer.props.runs, from, to, key, layer.props);
      snapshot();
      const whole = to <= from || (from === 0 && to === layer.props.text.length);
      if (whole) layer.props[key] = on;
      layer.props.runs = applySpan(layer.props.text, layer.props.runs, from, to, { [key]: on }, layer.props);
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.textAlign && state.doc) {
    const layer = primary();
    if (layer?.type === "text") {
      snapshot();
      layer.props.align = buttonNode.dataset.textAlign;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.flip && state.doc) {
    const layer = primary();
    if (layer?.type === "image") {
      snapshot();
      if (buttonNode.dataset.flip === "x") layer.flipX = !layer.flipX;
      else layer.flipY = !layer.flipY;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.distribute && state.doc) {
    snapshot();
    distributeLayers(state.doc, state.selected, buttonNode.dataset.distribute);
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
    if (buttonNode.dataset.zoom === "in" || buttonNode.dataset.zoom === "out") {
      const current = state.zoom === "fit" || state.zoom === "100" ? state.scale : Number(state.zoom) || state.scale;
      const next = buttonNode.dataset.zoom === "in" ? Math.min(2, current + 0.1) : Math.max(0.1, current - 0.1);
      state.zoom = String(Math.round(next * 100) / 100);
    } else state.zoom = buttonNode.dataset.zoom;
    render();
  }
  if (buttonNode.dataset.layers) {
    state.layerFilter = buttonNode.dataset.layers;
    render();
  }
}

function addFromTool(kind) {
  if (kind === "rect") addLayer(rectLayer({ name: t("forma"), x: 120, y: 120, w: 280, h: 180, fill: BRAND.pink }));
  if (kind === "ellipse") addLayer(rectLayer({ name: t("circulo"), x: 160, y: 160, w: 220, h: 220, fill: BRAND.pink, shape: "ellipse" }));
  if (kind === "barra") addLayer(rectLayer({ name: t("barra"), x: 80, y: 80, w: 360, h: 48, fill: BRAND.pink }));
  if (kind === "punto") addLayer(rectLayer({ name: t("punto"), x: 80, y: 160, w: 36, h: 36, fill: BRAND.navy }));
  if (kind === "line") addLayer(lineLayer({ name: t("linea"), x: 120, y: 200, w: 420, h: 16, color: BRAND.navy, strokeWidth: 8 }));
  if (kind === "titulo") addLayer(textLayer({ name: t("titulo"), x: 80, y: 80, w: 640, h: 140, text: t("titulo"), fontId: "anton", size: 72, color: BRAND.navy }));
  if (kind === "cuerpo" || kind === "texto") addLayer(textLayer({ name: t("cuerpo"), x: 80, y: 240, w: 640, h: 160, text: t("cuerpo"), fontId: "barlow", size: 40, color: BRAND.navy }));
}

function runAction(action, id) {
  const layer = id ? state.doc.layers.find((item) => item.id === id) : primary();
  if (action === "undo") {
    if (!state.past.length || !state.doc) return;
    syncPages();
    state.future.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.past.pop());
    state.page = bindPages(state.doc);
    scheduleSave();
    render();
    return;
  }
  if (action === "redo") {
    if (!state.future.length || !state.doc) return;
    syncPages();
    state.past.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.future.pop());
    state.page = bindPages(state.doc);
    scheduleSave();
    render();
    return;
  }
  if (!layer && !["group", "ungroup", "lock", "duplicate", "remove"].includes(action)) return;
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
  if (action === "remove") {
    const ids = new Set(state.selected);
    state.doc.layers = state.doc.layers.filter((item) => !ids.has(item.id) || item.locked);
    state.selected = state.selected.filter((id) => state.doc.layers.some((item) => item.id === id));
  }
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
  const lastTap = { id: "", at: 0 };
  root.addEventListener("pointerdown", (event) => {
    const resize = event.target.closest?.("[data-resize]");
    const cropEdge = event.target.closest?.("[data-crop-edge]");
    const capa = event.target.closest?.(".capa");
    const art = event.target.closest?.(".stage-art");
    if (!state.doc || !art) return;
    if (event.target.closest?.("[data-edit]")) return;
    if (cropEdge) {
      event.preventDefault();
      event.stopPropagation();
      startCrop(cropEdge.dataset.cropEdge, event);
      return;
    }
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
      const now = performance.now();
      const again = id === lastTap.id && now - lastTap.at < 450;
      lastTap.id = id;
      lastTap.at = now;
      if (layer?.type === "text" && (event.detail >= 2 || again)) {
        state.editingId = id;
        snapshot();
        render();
        return;
      }
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
    let dx = Math.round((ev.clientX - startX) / state.scale);
    let dy = Math.round((ev.clientY - startY) / state.scale);
    if (state.guides && layer) {
      const others = state.doc.layers.filter((item) => !origins.some((origin) => origin.id === item.id));
      const snapped = snapBox({ x: origins[0].x + dx, y: origins[0].y + dy, w: layer.w, h: layer.h }, others, state.doc.format);
      dx = snapped.x - origins[0].x;
      dy = snapped.y - origins[0].y;
    }
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
    const next = proportionalSize(origin, (ev.clientX - startX) / state.scale, (ev.clientY - startY) / state.scale, layer.type === "image" || ev.shiftKey);
    layer.w = next.w;
    layer.h = next.h;
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
      parent.replaceWith(catalogBody(makeCtx()));
      const field = document.getElementById("buscar");
      if (field instanceof HTMLInputElement) {
        field.focus();
        const end = field.value.length;
        field.setSelectionRange(end, end);
      }
      return;
    }
    if (target.id === "buscar-tamano") {
      const q = target.value.trim().toLowerCase();
      const dialog = document.getElementById("dialogo-tamano");
      dialog?.querySelectorAll("[data-format]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const label = (node.textContent || "").toLowerCase();
        node.hidden = q.length > 0 && !label.includes(q);
      });
    }
    if (!state.doc) return;
    if (target.id === "notas-pizarra" && state.doc) {
      state.doc.meta.note = target.value.slice(0, 2000);
      scheduleSave();
    }
    if (target.id === "nombre-diseno") {
      state.doc.name = target.value.slice(0, 80);
      scheduleSave();
    }
    if (target.dataset.edit) {
      const layer = state.doc.layers.find((item) => item.id === target.dataset.edit);
      if (layer?.type === "text") {
        layer.props.text = target.textContent.slice(0, 2000);
        scheduleSave();
      }
    }
    if (target.id === "fondo-color") {
      state.doc.background = { type: "solid", catalogId: "", fill: target.value };
      const art = root.querySelector(".stage-art");
      if (art) {
        art.style.background = target.value;
        art.style.backgroundImage = "";
      }
      scheduleSave();
    }
    if (target.id === "color-texto" || target.id === "tamano-texto" || target.id === "interlineado") {
      const layer = primary();
      if (layer?.type === "text") {
        if (target.id === "color-texto") {
          const [from, to] = textRange(layer);
          if (state.editingId === layer.id && to > from) layer.props.runs = applySpan(layer.props.text, layer.props.runs, from, to, { color: target.value }, layer.props);
          else layer.props.color = target.value;
        }
        if (target.id === "tamano-texto") layer.props.size = Math.min(400, Math.max(8, Math.round(Number(target.value) || layer.props.size)));
        if (target.id === "interlineado") layer.props.lineHeight = Math.min(3, Math.max(0.8, Number(target.value) || layer.props.lineHeight));
        const node = root.querySelector(`.capa[data-id="${layer.id}"] .capa-texto`);
        if (node instanceof HTMLElement) {
          node.style.color = layer.props.color;
          node.style.fontSize = `${layer.props.size}px`;
          node.style.lineHeight = String(layer.props.lineHeight);
        }
        scheduleSave();
      }
    }
    if (target.dataset.opacidad) {
      const layer = primary();
      if (layer) {
        layer.opacity = Math.min(1, Math.max(0, Number(target.value)));
        const node = root.querySelector(`.capa[data-id="${layer.id}"]`);
        if (node instanceof HTMLElement) node.style.opacity = String(layer.opacity);
        scheduleSave();
      }
    }
    if (target.dataset.stroke || target.id === "contorno-color") {
      const layer = primary();
      if (layer && (layer.type === "rect" || layer.type === "line")) {
        if (target.id === "contorno-color") {
          if (layer.type === "line") layer.props.color = target.value;
          else layer.props.stroke = target.value;
        } else layer.props.strokeWidth = Math.max(0, Math.round(Number(target.value) || 0));
        scheduleSave();
      }
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
      if (node) node.style.cssText = layerStyle(layer) + (layer.visible === false ? "visibility:hidden;" : "");
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
    if (event.target?.dataset?.crop || event.target?.id === "contorno-color" || event.target?.dataset?.stroke || event.target?.id === "tamano-texto" || event.target?.id === "interlineado" || event.target?.id === "color-texto" || event.target?.id === "fondo-color") render();
  });
  root.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !state.doc) return;
    if (target.matches("#tamano-texto, #interlineado, #fondo-color, #color-texto, #contorno-color, [data-opacidad], [data-stroke], #texto-capa")) snapshot();
  });
  root.addEventListener("mousedown", (event) => {
    const keep = event.target.closest?.("[data-style], [data-size], [data-font], [data-text-align], #color-texto, [data-action], .editor-bar, #barra-texto, .tira");
    if (keep && state.editingId) event.preventDefault();
  });
  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (rendering || !(target instanceof HTMLElement) || !target.dataset.edit) return;
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest("#barra-texto")) return;
    state.editingId = "";
    render();
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

function naturalOf(layer) {
  if (layer.src?.kind === "user") {
    const image = state.userImages.get(layer.src.id);
    if (image?.width && image?.height) return { w: image.width, h: image.height };
  }
  const item = layer.src?.kind === "catalog" ? catalogItem(layer.src.id) : null;
  if (item?.width && item?.height) return { w: item.width, h: item.height };
  return { w: Math.max(1, layer.w), h: Math.max(1, layer.h) };
}

function startCrop(edge, event) {
  const layer = primary();
  if (!layer || layer.type !== "image") return;
  snapshot();
  const natural = naturalOf(layer);
  if (!layer.crop) layer.crop = { x: 0, y: 0, w: natural.w, h: natural.h };
  const origin = { ...layer.crop };
  const startX = event.clientX;
  const startY = event.clientY;
  const move = (ev) => {
    const dx = ((ev.clientX - startX) / state.scale) * (origin.w / Math.max(1, layer.w));
    const dy = ((ev.clientY - startY) / state.scale) * (origin.h / Math.max(1, layer.h));
    layer.crop = shiftCrop(origin, edge, dx, dy);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", () => {
    window.removeEventListener("pointermove", move);
    scheduleSave();
    render();
  }, { once: true });
}

function onKey(event) {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    runAction(event.shiftKey ? "redo" : "undo");
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a" && state.doc) {
    event.preventDefault();
    state.selected = state.doc.layers.map((layer) => layer.id);
    render();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c" && state.doc) {
    state.clip = state.doc.layers.filter((layer) => state.selected.includes(layer.id)).map((layer) => JSON.parse(JSON.stringify(layer)));
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v" && state.doc && state.clip?.length) {
    event.preventDefault();
    snapshot();
    const copies = cloneForPaste(state.clip, () => uid("ly"));
    for (const copy of copies) {
      copy.z = Math.max(0, ...state.doc.layers.map((item) => item.z)) + 1;
      state.doc.layers.push(copy);
    }
    retargetCopies(copies);
    state.selected = copies.map((item) => item.id);
    scheduleSave();
    render();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && state.doc && state.selected.length) {
    event.preventDefault();
    runAction("duplicate");
    return;
  }
  if ((event.key === "Delete" || event.key === "Backspace") && state.doc && state.selected.length) {
    event.preventDefault();
    runAction("remove");
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
  let wasNarrow = window.innerWidth < 800;
  window.addEventListener("resize", () => {
    if (viewName() !== "editor") return;
    const narrow = window.innerWidth < 800;
    if (narrow && !wasNarrow) {
      state.panelOpen = false;
      state.inspectorOpen = false;
      wasNarrow = true;
      render();
      return;
    }
    wasNarrow = narrow;
    applyStageFit();
  });
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
