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
  chartLayer,
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
  tableLayer,
  textLayer,
  uid,
  ungroupLayers,
} from "./lib/document.mjs";
import { exportAllowed } from "./lib/filter.mjs";
import { loadHistory, pushHistory } from "./lib/history.mjs";
import { exportSiteHtml } from "./lib/html-export.mjs";
import { createImageStore } from "./lib/images.mjs";
import { LOGO_MAX_BYTES, readLogoPng } from "./lib/logo.mjs";
import { localPhrases } from "./lib/ai-optional.mjs";
import { packDesign, unpackDesign, userImageIds } from "./lib/package.mjs";
import { pdfFromPages } from "./lib/pdf-raster.mjs";
import { photoById } from "./lib/photos.mjs";
import { IDEAS, filterPlantillas, instantiate } from "./lib/plantillas.mjs";
import { parseSeriesText } from "./lib/chart-data.mjs";
import { parseTableText } from "./lib/table-data.mjs";
import { documentForOpen } from "./lib/open-target.mjs";
import { documentForThumb } from "./lib/thumb-docs.mjs";
import { thumbById } from "./lib/thumbs.mjs";
import {
  adoptLegacyDraft,
  createContainer,
  deleteProject,
  dropRecovery,
  duplicateProject,
  libraryOf,
  listProjects,
  listRecovery,
  loadProject,
  normalizeLibrary,
  patchItem,
  recoverWrite,
  saveProject,
} from "./lib/projects.mjs";
import { FILE_NAME, REVOKE_MS, canShareFiles, isIOS, saveMode } from "./lib/save.mjs";
import { applySpan, spanIs } from "./lib/text-style.mjs";
import { conversionPreview, toOrvdoc, toSlides } from "./lib/work-convert.mjs";
import { DESIGN_MIME, DOC_MIME, SLIDE_MIME, loadWorkBytes, saveWorkBytes, workIdFromHash } from "./lib/work-store.mjs";
import { queryFromHash, routeFromHash } from "./lib/route.mjs";
import { pushNotice } from "./lib/mas-store.mjs";
import { bindIaRuntime, handleIaClick, handleIaFile, handleIaInput, handleIaKeydown } from "./ia.mjs";
import { applyMasChrome, handleMasClick, handleMasInput, renderMas } from "./mas.mjs";
import { canvaNav, catalogBody, layerStyle, renderDesigns, renderEditor, renderHome, renderIa, renderLibrary, renderMarca, renderPlantillas, renderRecursos, sizeDialog, templatePreview } from "./views.mjs";

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
    confirmarBorrar: "¿Mover este diseño a la papelera? Se puede recuperar durante 30 días.",
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
    buscarDiseno: "¿Qué quieres diseñar?",
    elige: "Elige cómo empezar",
    masUsadas: "Las más usadas",
    populares: "Populares en ORVUPI",
    acceso: "Acceso directo",
    interes: "Plantillas que podrían interesarte",
    exploraPlantillas: "Explora las categorías de plantillas",
    sinTitulo: "Diseño sin título",
    pillWork: "ORVUPI Work",
    iaTab: "Catálogo",
    masOpciones: "Más opciones",
    usarPlantilla: "Usar plantilla",
    verCategoria: "Ver categoría",
    usarEnDiseno: "Usar en un diseño",
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
    masTab: "Más",
    buscaPlantillas: "Busca plantillas",
    echaVistazo: "Echa un vistazo a las plantillas",
    proximosEventos: "Próximos eventos",
    inspirado: "Inspirado en tus diseños",
    descubre: "Descubre ORVUPI",
    destacados: "Los destacados en ORVUPI",
    tendencias: "Tendencias cerca de ti",
    masPlantillas: "Más plantillas para ti",
    anterior: "Anterior",
    siguiente: "Siguiente",
    todasPlantillas: "Todas las plantillas",
    abrirWork: "Abrir en Work",
    workNota: "Se crea una copia en la biblioteca local de Work. Esa biblioteca no es una sincronización en la nube. El diseño original sigue en este navegador.",
    workNativo: "Guardar el diseño en Work",
    workDoc: "Convertir a documento",
    workSlides: "Convertir a presentación",
    workConfirmar: "Crear la copia",
    workHecho: "La copia está en Work. El diseño original sigue aquí.",
    workCopia: "Work ya tenía una revisión más nueva. Se guardó otra copia, sin pisar la anterior.",
    workFallo: "La copia en Work no se escribió. El diseño sigue en este navegador.",
    paquete: "Exportar paquete",
    importarPaquete: "Importar paquete",
    pdf: "PDF",
    pdfNota: "El PDF aplana cada página a 96 ppp. No anuncia cuatricromía ni sangrado. El texto deja de ser editable. El diseño original sigue en este navegador.",
    pdfA4: "794×1123 px es un A4 a 96 ppp.",
    pdfPaginas: "Páginas del PDF",
    pdfListo: "El PDF se descargó. El diseño editable sigue aquí.",
    pdfVacio: "Elige al menos una página.",
    capaTope: "Esta versión guarda hasta 48 capas. No se añadió otra.",
    topeProyectos: "Hay 40 diseños. Este no sustituye a ninguno y quedó aparte.",
    conflicto: "Otra pestaña guardó este diseño. No se ha pisado.",
    guardarCopia: "Guardar como copia",
    abrirRecuperado: "Abrir el diseño recuperado",
    limitePaginas: "Este archivo trae más de 8 páginas. No se recorta.",
    limiteCapas: "Este archivo trae más de 48 capas. No se recorta.",
    limiteTexto: "Un texto pasa de 2000 caracteres. No se recorta.",
    limiteMedida: "El lienzo tiene que medir entre 64 y 2048 px. No se recorta.",
    imagenNo: "La imagen no se pudo guardar. No queda marcado como guardado.",
    guardadoCorto: "Guardado",
    topeCorto: "Tope de 40. No se borró ninguno.",
    conflictoCorto: "Conflicto. No se pisó.",
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
    fotosNota: "Biblioteca local con licencia CC0. También puedes subir imágenes propias. Sin stock de pago.",
    graficosNota: "Gráfico con datos editables o tabla con celdas. Todo se calcula en este navegador.",
    paginaTope: "Esta versión guarda hasta 8 páginas.",
    ultimaPagina: "La última página no se borra.",
    previewNota: "Esto no publica la pieza. La descarga se queda en este dispositivo.",
    videoNota: "Escenas locales con duración. No hay audio ni exportación MP4: haría falta un codificador pesado en el navegador. La descarga sigue siendo PNG o PDF de fotogramas.",
    tamanosNota: "Tamaños listos. El lienzo nuevo se abre en este navegador.",
    buscarFotos: "Buscar fotos",
    licenciaFoto: "Licencia",
    graficoBarras: "Barras",
    graficoLineas: "Líneas",
    graficoTarta: "Tarta",
    tabla: "Tabla",
    editarDatos: "Editar datos",
    editarTabla: "Editar tabla",
    exportarHtml: "Descargar HTML",
    htmlNota: "Descarga un HTML responsive en este dispositivo. Studio no publica ni aloja sitios de usuarios.",
    htmlListo: "HTML descargado. No se ha publicado nada.",
    ampliarPizarra: "Ampliar pizarra",
    comentario: "Comentario",
    anadirComentario: "Añadir comentario",
    historial: "Historial local",
    guardarHistorial: "Guardar instantánea",
    restaurarHistorial: "Restaurar",
    historialNota: "Hasta 20 instantáneas en este navegador. Sin colaboración remota.",
    iaOpcional: "IA opcional",
    escenas: "Escenas",
    anadirEscena: "Añadir escena",
    duracionEscena: "Segundos",
    videoLimite: "Sin audio y sin MP4 en esta versión gratuita local.",
    colaboracionNota: "La colaboración en tiempo real no está disponible: exige identidad y almacenamiento remoto con coste.",
    elementosGraficos: "Elementos gráficos",
    favoritos: "Favoritos",
    buscaFotosCalidad: "Busca fotos de alta calidad",
    buscaElementos: "Busca elementos gráficos de alta calidad",
    fotosPerfectas: "Fotos perfectas",
    explorarFotos: "Explorar fotos",
    elementosLlamativos: "Elementos gráficos llamativos",
    descubreElementos: "Descubre los elementos gráficos",
    filtros: "Filtros",
    gratisYPro: "Gratis y Pro",
    pro: "Pro",
    aplicarFiltros: "Aplicar filtros",
    generarImagen: "Generar mi propia imagen",
    generarElemento: "Generar mi propio elemento",
    favVacioTitulo: "Esta carpeta está vacía, pero llena de potencial",
    favVacioCuerpo: "Aquí aparecerán los elementos que añadas a Favoritos.",
    verCuadricula: "Ver como cuadrícula",
    verLista: "Ver como lista",
    anadirFavorito: "Añadir a favoritos",
    quitarFavorito: "Quitar de favoritos",
    volver: "Volver",
    vacioBiblioteca: "Nada coincide con esa búsqueda.",
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
    confirmarBorrar: "Move this design to trash? It can be restored for 30 days.",
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
    buscarDiseno: "What do you want to design?",
    elige: "Choose how to start",
    masUsadas: "Most used",
    populares: "Popular on ORVUPI",
    acceso: "Shortcuts",
    interes: "Templates you might like",
    exploraPlantillas: "Explore template categories",
    sinTitulo: "Untitled design",
    pillWork: "ORVUPI Work",
    iaTab: "Catalog",
    masOpciones: "More options",
    usarPlantilla: "Use template",
    verCategoria: "See category",
    usarEnDiseno: "Use in a design",
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
    masTab: "More",
    buscaPlantillas: "Search templates",
    echaVistazo: "Take a look at the templates",
    proximosEventos: "Upcoming events",
    inspirado: "Inspired by your designs",
    descubre: "Discover ORVUPI",
    destacados: "Featured on ORVUPI",
    tendencias: "Trends near you",
    masPlantillas: "More templates for you",
    anterior: "Previous",
    siguiente: "Next",
    todasPlantillas: "All templates",
    abrirWork: "Open in Work",
    workNota: "A copy is created in Work's local library. That library is not cloud sync. The original design stays in this browser.",
    workNativo: "Save the design in Work",
    workDoc: "Convert to document",
    workSlides: "Convert to presentation",
    workConfirmar: "Create the copy",
    workHecho: "The copy is in Work. The original design stays here.",
    workCopia: "Work already had a newer revision. Another copy was saved, and the previous file was left as it was.",
    workFallo: "The Work copy was not written. The design stays in this browser.",
    paquete: "Export package",
    importarPaquete: "Import package",
    pdf: "PDF",
    pdfNota: "The PDF flattens each page at 96 ppi. It does not claim process color or bleed. Text is no longer editable. The original design stays in this browser.",
    pdfA4: "794×1123 px is an A4 page at 96 ppi.",
    pdfPaginas: "PDF pages",
    pdfListo: "The PDF downloaded. The editable design stays here.",
    pdfVacio: "Choose at least one page.",
    capaTope: "This version keeps up to 48 layers. Another one was not added.",
    topeProyectos: "There are 40 designs. This one does not replace any of them and was kept aside.",
    conflicto: "Another tab saved this design. It was not overwritten.",
    guardarCopia: "Save as a copy",
    abrirRecuperado: "Open the recovered design",
    limitePaginas: "This file has more than 8 pages. It is not trimmed.",
    limiteCapas: "This file has more than 48 layers. It is not trimmed.",
    limiteTexto: "A text is over 2000 characters. It is not trimmed.",
    limiteMedida: "The canvas must be between 64 and 2048 px. It is not trimmed.",
    imagenNo: "The image could not be stored. It is not marked as saved.",
    guardadoCorto: "Saved",
    topeCorto: "40 design limit. None were deleted.",
    conflictoCorto: "Conflict. Nothing was overwritten.",
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
    fotosNota: "Local CC0 library. You can also upload your own images. No paid stock.",
    graficosNota: "Charts with editable data or tables with cells. Everything runs in this browser.",
    paginaTope: "This version keeps up to 8 pages.",
    ultimaPagina: "The last page stays.",
    previewNota: "This does not publish the piece. The download stays on this device.",
    videoNota: "Local scenes with duration. No audio and no MP4 export: that would need a heavy in-browser encoder. Downloads remain PNG or PDF frames.",
    tamanosNota: "Ready-made sizes. A new canvas opens in this browser.",
    buscarFotos: "Search photos",
    licenciaFoto: "License",
    graficoBarras: "Bars",
    graficoLineas: "Lines",
    graficoTarta: "Pie",
    tabla: "Table",
    editarDatos: "Edit data",
    editarTabla: "Edit table",
    exportarHtml: "Download HTML",
    htmlNota: "Downloads a responsive HTML file on this device. Studio does not publish or host user sites.",
    htmlListo: "HTML downloaded. Nothing was published.",
    ampliarPizarra: "Expand board",
    comentario: "Comment",
    anadirComentario: "Add comment",
    historial: "Local history",
    guardarHistorial: "Save snapshot",
    restaurarHistorial: "Restore",
    historialNota: "Up to 20 snapshots in this browser. No remote collaboration.",
    iaOpcional: "Optional AI",
    escenas: "Scenes",
    anadirEscena: "Add scene",
    duracionEscena: "Seconds",
    videoLimite: "No audio and no MP4 in this free local version.",
    colaboracionNota: "Real-time collaboration is unavailable: it needs identity and paid remote storage.",
    elementosGraficos: "Graphic elements",
    favoritos: "Favorites",
    buscaFotosCalidad: "Search high-quality photos",
    buscaElementos: "Search high-quality graphic elements",
    fotosPerfectas: "Perfect photos",
    explorarFotos: "Explore photos",
    elementosLlamativos: "Bold graphic elements",
    descubreElementos: "Discover graphic elements",
    filtros: "Filters",
    gratisYPro: "Free and Pro",
    pro: "Pro",
    aplicarFiltros: "Apply filters",
    generarImagen: "Generate my own image",
    generarElemento: "Generate my own element",
    favVacioTitulo: "This folder is empty, but full of potential",
    favVacioCuerpo: "Items you add to Favorites will show up here.",
    verCuadricula: "View as grid",
    verLista: "View as list",
    anadirFavorito: "Add to favorites",
    quitarFavorito: "Remove from favorites",
    volver: "Back",
    vacioBiblioteca: "Nothing matches that search.",
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
  pendingRail: "",
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
  openPreview: "",
  previewPage: 0,
  previewMore: false,
  starred: {},
  painter: null,
  helpOpen: false,
  pop: "",
  editMenu: false,
  drawColor: "#102032",
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
  workRoute: "",
  workPreview: null,
  pdfOpen: false,
  imageFailed: false,
  pageNote: "",
  cropping: false,
  clip: null,
  photoQuery: "",
  historyNote: "",
  htmlNote: "",
  librarySheet: false,
  filterSheet: false,
  viewSheet: false,
  libraryQuery: "",
  libraryTopic: "",
  priceFilter: "",
  priceDraft: "",
  favs: [],
  favLayout: "grid",
  routeHash: null,
  designSheet: "",
  designView: "todos",
  designQuery: "",
  designCreateQuery: "",
  designTipo: "",
  designCategoria: "",
  designTitular: "",
  designFecha: "",
  designLayout: "list",
  designFolder: "",
  designCreate: false,
  designItem: "",
  designSelect: false,
  designSelected: [],
  designMove: [],
  designTab: "curso",
  designDraft: "folder",
  designNotice: "",
  designUndo: [],
  designOpen: "",
  pendingFolder: "",
};

let fileMode = "image";
let saveTimer = 0;
let saveChain = Promise.resolve();
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
  if (state.status === "cap") return t("topeCorto");
  if (state.status === "conflict") return t("conflictoCorto");
  if (state.status === "image-fail") return t("imagenNo");
  if (state.status === "limite-paginas") return t("limitePaginas");
  if (state.status === "limite-capas") return t("limiteCapas");
  if (state.status === "limite-texto") return t("limiteTexto");
  if (state.status === "limite-medida") return t("limiteMedida");
  if (state.status === "saved") return t("guardadoCorto");
  return "";
}

function statusFromError(error) {
  const message = error?.message || "";
  if (message === "version-desconocida") return "version";
  if (message === "limite-paginas" || message === "limite-capas" || message === "limite-texto" || message === "limite-medida") return message;
  return "invalid";
}

function viewName() {
  if (workIdFromHash(location.hash) && state.doc) return "editor";
  const known = ["plantillas", "disenos", "editor", "recursos", "marca", "ia", "fotos", "elementos", "favoritos", "mas"];
  if (location.hash) {
    const segment = routeFromHash(location.hash);
    return known.includes(segment) ? segment : "inicio";
  }
  const path = location.pathname.replace(/\/+$/, "");
  const hit = known.find((name) => path.endsWith(`/${name}`));
  return hit || "inicio";
}

function hashText(params) {
  if (!params) return null;
  if (params.text != null) return params.text;
  if (params.q != null) return params.q;
  if (params.buscar != null) return params.buscar;
  return null;
}

function syncRouteFromHash() {
  const hash = location.hash;
  if (hash === state.routeHash) return;
  const prev = state.routeHash;
  state.routeHash = hash;
  const segment = routeFromHash(hash);
  const prevSegment = prev == null ? "" : routeFromHash(prev);
  const params = queryFromHash(hash);
  const prevParams = prev == null ? {} : queryFromHash(prev);
  if (prev != null && segment !== prevSegment) {
    state.librarySheet = false;
    state.filterSheet = false;
    state.viewSheet = false;
    state.designSheet = "";
  }
  if (segment === "disenos") {
    const views = ["todos", "recientes", "mios", "favoritos", "compartidos", "offline", "enlaces"];
    state.designView = views.includes(params.vista) ? params.vista : "todos";
    state.designFolder = typeof params.carpeta === "string" ? params.carpeta : "";
    state.designCreate = params.crear === "1";
    if (params.abrir) state.designOpen = params.abrir;
  }
  const text = hashText(params);
  const prevText = hashText(prevParams);
  const library = segment === "fotos" || segment === "elementos";
  if (text != null) {
    if (library) state.libraryQuery = text;
    else state.filters.text = text;
  } else if (prevText != null) {
    if (library) state.libraryQuery = "";
    else state.filters.text = "";
  }
  if (params.grupo != null) state.grupo = params.grupo;
  else if (prevParams.grupo != null) state.grupo = "";
  if (params.cat != null) state.thumbCat = params.cat;
  else if (params.thumbCat != null) state.thumbCat = params.thumbCat;
  else if (prevParams.cat != null || prevParams.thumbCat != null) state.thumbCat = "";
  if (params.topic != null) state.libraryTopic = params.topic;
  else if (prevParams.topic != null) state.libraryTopic = "";
  if (params.precio != null) state.priceFilter = params.precio;
  else if (prevParams.precio != null) state.priceFilter = "";
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
  state.pendingFolder = "";
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

function applySaveResult(result) {
  if (!result?.ok) {
    if (result?.reason === "cap") {
      state.status = "cap";
      state.pageNote = t("topeProyectos");
    } else if (result?.reason === "conflict") {
      state.status = "conflict";
      state.pageNote = t("conflicto");
    } else state.status = "quota";
    return result;
  }
  if (state.doc) state.doc.meta.revision = result.revision;
  if (state.doc) dropRecovery(storage, state.doc.id);
  if (state.status === "cap" || state.status === "conflict" || state.status === "image-fail") state.pageNote = "";
  state.status = state.imageFailed ? "image-fail" : "saved";
  if (state.imageFailed) state.pageNote = t("imagenNo");
  return result;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveChain = saveChain.then(() => commitSave()).catch(() => {});
  }, 400);
}

async function commitSave() {
  if (!state.doc) return;
  syncPages();
  const result = saveProject(storage, state.doc);
  applySaveResult(result);
  if (!result.ok) render();
  else {
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = statusText();
  }
  if (result.ok && state.doc?.meta?.workFileId) await syncWorkFile();
}

function openDoc(doc, options = {}) {
  state.doc = doc;
  state.page = bindPages(doc);
  state.selected = [];
  state.past = [];
  state.future = [];
  state.rail = state.pendingRail || shellRail(doc);
  const openedRail = state.pendingRail;
  state.pendingRail = "";
  state.dialog = false;
  state.resizing = false;
  state.preview = false;
  state.openPreview = "";
  state.previewPage = 0;
  state.previewMore = false;
  state.painter = null;
  state.helpOpen = false;
  state.pop = "";
  state.editMenu = false;
  state.notesOpen = false;
  state.editingId = "";
  state.cropping = false;
  state.pageNote = "";
  state.workNote = false;
  state.workRoute = "";
  state.workPreview = null;
  state.pdfOpen = false;
  state.imageFailed = Boolean(options.imageFailed);
  state.navOpen = false;
  state.panelOpen = Boolean(openedRail);
  state.inspectorOpen = false;
  state.timerOn = false;
  state.timerSeconds = 0;
  clearInterval(clockTimer);
  if (state.pendingFolder) {
    const current = doc.library && typeof doc.library === "object" ? doc.library : {};
    doc.library = normalizeLibrary({ ...current, folderId: state.pendingFolder });
    state.pendingFolder = "";
  }
  const workId = options.workFileId || doc.meta?.workFileId || "";
  if (workId) doc.meta.workFileId = workId;
  else if (doc.meta) doc.meta.workFileId = "";
  if (!options.skipSave) applySaveResult(saveProject(storage, doc));
  else state.status = state.imageFailed ? "image-fail" : "saved";
  const next = workId ? `#/work/${workId}` : "#/editor";
  if (location.hash !== next) location.hash = next;
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
  if (!doc || doc.templateId !== id) return;
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
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64 || width > 2048 || height > 2048) {
    state.pageNote = t("limiteMedida");
    state.dialog = true;
    render();
    return;
  }
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
  if (shell === "whiteboard" || shell === "doc" || shell === "web") return;
  syncPages();
  if (state.doc.meta.pages.length >= 8) {
    state.pageNote = t("paginaTope");
    render();
    return;
  }
  state.pageNote = "";
  snapshot();
  state.doc.meta.pages.push([]);
  const scenes = Array.isArray(state.doc.meta.scenes) ? state.doc.meta.scenes.slice() : [];
  scenes.push({ duration: 5, label: `${t("escenas")} ${scenes.length + 1}` });
  state.doc.meta.scenes = scenes.slice(0, 8);
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
  if (shell === "whiteboard" || shell === "doc" || shell === "web") return;
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
  syncRouteFromHash();
  const path = location.pathname.replace(/\/+$/, "");
  if (routeFromHash(location.hash) === "creators" || path.endsWith("/creators")) {
    rendering = false;
    go("plantillas");
    return;
  }
  if (viewName() === "editor" && !state.doc) {
    rendering = false;
    go("inicio");
    return;
  }
  const view = viewName();
  const ctx = makeCtx();
  if (view === "inicio") renderHome(ctx);
  else if (view === "ia") renderIa(ctx);
  else if (view === "plantillas") renderPlantillas(ctx);
  else if (view === "fotos" || view === "elementos" || view === "favoritos") renderLibrary(ctx);
  else if (view === "disenos") {
    if (state.designOpen) {
      const id = state.designOpen;
      state.designOpen = "";
      if (String(location.hash).includes("abrir=")) {
        history.replaceState(null, "", `${location.pathname}${location.search}#/disenos`);
        state.routeHash = "#/disenos";
      }
      const doc = loadProject(storage, id);
      if (doc) {
        queueMicrotask(() => openDoc(doc));
        rendering = false;
        return;
      }
      const raw = listProjects(storage).find((item) => item.id === id);
      const kind = raw ? libraryOf(raw).kind : "";
      if (raw && (kind === "folder" || kind === "course") && !libraryOf(raw).deletedAt) {
        state.designFolder = id;
        queueMicrotask(() => designHash());
        rendering = false;
        return;
      }
    }
    renderDesigns(ctx);
  }
  else if (view === "mas") renderMas(ctx, { nav: () => canvaNav(ctx, "mas") });
  else if (view === "marca") renderMarca(ctx);
  else if (view === "recursos") renderRecursos(ctx);
  else renderEditor(ctx);
  if (state.openPreview) {
    const modal = templatePreview(ctx);
    if (modal) root.append(modal);
    else state.openPreview = "";
  }
  applyStageFit();
  focusEditing();
  if (state.dialog && !document.getElementById("dialogo-tamano")) root.append(sizeDialog(ctx));
  if (state.dialog) {
    const dialog = document.getElementById("dialogo-tamano");
    if (dialog && !dialog.open) dialog.showModal();
  }
  syncChrome();
  document.body?.classList.toggle("lib-sheet-open", Boolean(state.librarySheet || state.filterSheet || state.viewSheet || state.designSheet));
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
  const pct = Math.round(state.scale * 100);
  const zoom = root.querySelector("#zoom-indicador");
  if (zoom) zoom.textContent = `${pct}%`;
  const range = root.querySelector("#zoom-rango");
  if (range instanceof HTMLInputElement && document.activeElement !== range) range.value = String(Math.min(200, Math.max(10, pct)));
  placeSelectionPill();
}

function placeSelectionPill() {
  const pill = root.querySelector("#pastilla-seleccion");
  const capa = root.querySelector(".capa.seleccionada");
  const host = root.querySelector(".escenario");
  if (!(pill instanceof HTMLElement) || !(capa instanceof HTMLElement) || !(host instanceof HTMLElement)) return;
  const box = capa.getBoundingClientRect();
  const hostBox = host.getBoundingClientRect();
  const width = pill.offsetWidth || 280;
  const height = pill.offsetHeight || 40;
  let left = box.left - hostBox.left;
  let top = box.top - hostBox.top - height - 10;
  if (top < 8) top = box.bottom - hostBox.top + 8;
  left = Math.max(8, Math.min(left, Math.max(8, hostBox.width - width - 8)));
  pill.style.left = `${Math.round(left)}px`;
  pill.style.top = `${Math.round(top)}px`;
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
  if (!state.doc) return;
  if (state.doc.layers.length >= 48) {
    state.pageNote = t("capaTope");
    render();
    return;
  }
  state.pageNote = "";
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

function say(esText, enText) {
  return lang === "en" ? enText : esText;
}

function designHash() {
  const params = new URLSearchParams();
  if (state.designView && state.designView !== "todos") params.set("vista", state.designView);
  if (state.designFolder) params.set("carpeta", state.designFolder);
  if (state.designCreate) params.set("crear", "1");
  const query = params.toString();
  const next = query ? `#/disenos?${query}` : "#/disenos";
  if (location.hash === next) render();
  else location.hash = next;
}

function designLink(id) {
  const url = new URL(location.href);
  url.hash = `#/disenos?abrir=${encodeURIComponent(id)}`;
  return url.toString();
}

function pickDesignFile(mode) {
  fileMode = mode;
  if (!logoInput) {
    state.designNotice = say("Este navegador no puede abrir archivos aquí.", "This browser cannot open files here.");
    render();
    return;
  }
  logoInput.accept = mode === "project"
    ? "application/json,.json"
    : "image/png,image/jpeg,image/webp,video/mp4,video/quicktime,application/pdf,.pdf,.json";
  logoInput.click();
}

function folderContains(ancestor, maybeChild) {
  if (!ancestor || !maybeChild) return false;
  let cursor = maybeChild;
  const seen = new Set();
  while (cursor) {
    if (cursor === ancestor) return true;
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    const raw = listProjects(storage).find((item) => item.id === cursor);
    cursor = raw ? libraryOf(raw).folderId : "";
  }
  return false;
}

function moveToTrash(id) {
  if (!id) return;
  const moved = patchItem(storage, id, { library: { deletedAt: new Date().toISOString() } });
  if (!moved) deleteProject(storage, id);
  if (state.doc?.id === id) state.doc = null;
}

function trashDesigns(ids) {
  const now = new Date().toISOString();
  const done = [];
  for (const id of ids) {
    if (!id) continue;
    if (patchItem(storage, id, { library: { deletedAt: now } })) done.push(id);
  }
  state.designUndo = done;
  state.designSheet = "";
  state.designSelect = false;
  state.designSelected = [];
  state.designMove = [];
  state.designNotice = done.length ? say("Movido a la papelera.", "Moved to trash.") : say("No se pudo mover el elemento.", "Could not move that item.");
  render();
}

function copyDesign(id) {
  const raw = listProjects(storage).find((item) => item.id === id);
  if (!raw) return;
  if (loadProject(storage, id)) {
    const copy = duplicateProject(storage, id);
    state.designNotice = copy ? say("Copia creada.", "Copy created.") : say("No se pudo copiar.", "Could not copy.");
    return;
  }
  const lib = libraryOf(raw);
  const item = createContainer(storage, {
    kind: lib.kind,
    name: `${raw.name} copia`,
    access: lib.access,
    folderId: lib.folderId,
    description: lib.description,
  });
  state.designNotice = item ? say("Copia creada.", "Copy created.") : say("No se pudo copiar.", "Could not copy.");
}

function runDesignAction(action) {
  const id = state.designItem;
  const raw = listProjects(storage).find((item) => item.id === id);
  if (action === "select-cancel") {
    state.designSelect = false;
    state.designSelected = [];
    render();
    return;
  }
  if (action === "select-move") {
    state.designMove = [...(state.designSelected || [])];
    state.designSheet = "move";
    render();
    return;
  }
  if (action === "select-trash") {
    trashDesigns(state.designSelected || []);
    return;
  }
  if (action === "create") {
    state.pendingFolder = state.designFolder || "";
    state.designCreate = true;
    state.designCreateQuery = "";
    state.designSheet = "";
    designHash();
    return;
  }
  if (action === "upload") {
    state.pendingFolder = state.designFolder || "";
    state.designSheet = "";
    pickDesignFile("library");
    return;
  }
  if (action === "import") {
    state.pendingFolder = state.designFolder || "";
    state.designSheet = "";
    pickDesignFile("project");
    return;
  }
  if (action === "print-now") {
    state.designSheet = "";
    render();
    window.print();
    return;
  }
  if (!raw) return;
  const lib = libraryOf(raw);
  if (action === "details") state.designSheet = "details";
  else if (action === "print") state.designSheet = "print";
  else if (action === "share") state.designSheet = "share";
  else if (action === "move") {
    state.designMove = [id];
    state.designSheet = "move";
  } else if (action === "select") {
    state.designSelect = true;
    state.designSelected = [id];
    state.designSheet = "";
  } else if (action === "fav") {
    const next = !lib.favorite;
    patchItem(storage, id, { library: { favorite: next } });
    state.designSheet = "";
    state.designNotice = next ? say("Añadido a Favoritos.", "Added to Favorites.") : say("Quitado de Favoritos.", "Removed from Favorites.");
  } else if (action === "offline") {
    const next = !lib.offline;
    patchItem(storage, id, { library: { offline: next } });
    state.designSheet = "";
    state.designNotice = next ? say("Disponible sin conexión.", "Available offline.") : say("Quitado de sin conexión.", "Removed from offline.");
  } else if (action === "trash") {
    trashDesigns([id]);
    return;
  } else if (action === "copy") {
    copyDesign(id);
    state.designSheet = "";
  } else if (action === "template") {
    const copy = duplicateProject(storage, id);
    if (copy) {
      const base = String(copy.name || "").replace(/ copia$/, "");
      patchItem(storage, copy.id, { name: `${base} plantilla`.slice(0, 80), library: { template: true } });
      state.designNotice = say("Guardado como plantilla.", "Saved as a template.");
    } else state.designNotice = say("No se pudo guardar la plantilla.", "Could not save the template.");
    state.designSheet = "";
  } else if (action === "download") {
    if (loadProject(storage, id)) exportJson(id);
    else state.designNotice = say("Este elemento no tiene un archivo para descargar.", "This item has no file to download.");
    state.designSheet = "";
  } else if (action === "link") {
    const link = designLink(id);
    state.designSheet = "";
    const done = (copied) => {
      state.designNotice = copied ? say("Enlace copiado.", "Link copied.") : link;
      render();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => done(true)).catch(() => done(false));
      return;
    }
    done(false);
    return;
  }
  render();
}

function handleDesignClick(buttonNode) {
  const keys = [
    "designClose", "designClear", "designUndo", "designBack", "designLayout", "designTab", "designDone",
    "designMenu", "designOpen", "designSheet", "designDraft", "designView", "designTipo", "designCategoria",
    "designTitular", "designFecha", "designAccess", "designMoveTo", "designAction", "designRenameSave",
    "designCreateSave", "designCustom",
  ];
  if (!keys.some((key) => key in buttonNode.dataset)) return false;
  if (!("designUndo" in buttonNode.dataset)) {
    state.designNotice = "";
    state.designUndo = [];
  }
  if ("designClose" in buttonNode.dataset) {
    state.designSheet = "";
    render();
    return true;
  }
  if ("designUndo" in buttonNode.dataset) {
    for (const id of state.designUndo || []) patchItem(storage, id, { library: { deletedAt: null } });
    state.designUndo = [];
    state.designNotice = say("Restaurado.", "Restored.");
    render();
    return true;
  }
  if ("designClear" in buttonNode.dataset) {
    const key = buttonNode.dataset.designClear;
    if (key === "all") {
      state.designTipo = "";
      state.designCategoria = "";
      state.designTitular = "";
      state.designFecha = "";
      state.designQuery = "";
    } else if (key === "query") state.designQuery = "";
    else if (key === "create-query") state.designCreateQuery = "";
    else if (key === "tipo") state.designTipo = "";
    else if (key === "categoria") state.designCategoria = "";
    else if (key === "titular") state.designTitular = "";
    else if (key === "fecha") state.designFecha = "";
    render();
    return true;
  }
  if ("designBack" in buttonNode.dataset) {
    state.designSheet = "";
    if (buttonNode.dataset.designBack === "create") {
      state.designCreate = false;
      state.pendingFolder = "";
    } else {
      state.designFolder = "";
      state.designTab = "curso";
    }
    designHash();
    return true;
  }
  if ("designLayout" in buttonNode.dataset) {
    state.designLayout = buttonNode.dataset.designLayout === "grid" ? "grid" : "list";
    render();
    return true;
  }
  if ("designTab" in buttonNode.dataset) {
    state.designTab = buttonNode.dataset.designTab === "seguimiento" ? "seguimiento" : "curso";
    render();
    return true;
  }
  if ("designDone" in buttonNode.dataset) {
    const raw = listProjects(storage).find((item) => item.id === buttonNode.dataset.designDone);
    if (raw) patchItem(storage, raw.id, { library: { done: !libraryOf(raw).done } });
    render();
    return true;
  }
  if ("designMenu" in buttonNode.dataset) {
    state.designItem = buttonNode.dataset.designMenu;
    state.designSheet = "item";
    render();
    return true;
  }
  if ("designOpen" in buttonNode.dataset) {
    const id = buttonNode.dataset.designOpen;
    if (state.designSelect) {
      const picked = new Set(state.designSelected || []);
      if (picked.has(id)) picked.delete(id);
      else picked.add(id);
      state.designSelected = [...picked];
      render();
      return true;
    }
    const raw = listProjects(storage).find((item) => item.id === id);
    const kind = raw ? libraryOf(raw).kind : "";
    if (kind === "folder" || kind === "course") {
      state.designFolder = id;
      state.designCreate = false;
      state.designTab = "curso";
      state.designSheet = "";
      designHash();
      return true;
    }
    const doc = loadProject(storage, id);
    if (doc) {
      openDoc(doc);
      return true;
    }
    state.designItem = id;
    state.designSheet = "details";
    render();
    return true;
  }
  if ("designView" in buttonNode.dataset) {
    const views = ["todos", "recientes", "mios", "favoritos", "compartidos", "offline", "enlaces"];
    if (!views.includes(buttonNode.dataset.designView)) return true;
    state.designView = buttonNode.dataset.designView;
    state.designFolder = "";
    state.designCreate = false;
    state.pendingFolder = "";
    state.designSheet = "";
    state.designSelect = false;
    state.designSelected = [];
    designHash();
    return true;
  }
  if ("designTipo" in buttonNode.dataset) {
    state.designTipo = buttonNode.dataset.designTipo || "";
    state.designSheet = "";
    render();
    return true;
  }
  if ("designCategoria" in buttonNode.dataset) {
    state.designCategoria = buttonNode.dataset.designCategoria || "";
    state.designSheet = "";
    render();
    return true;
  }
  if ("designTitular" in buttonNode.dataset) {
    state.designTitular = buttonNode.dataset.designTitular || "";
    state.designSheet = "";
    render();
    return true;
  }
  if ("designFecha" in buttonNode.dataset) {
    state.designFecha = buttonNode.dataset.designFecha || "";
    state.designSheet = "";
    render();
    return true;
  }
  if ("designAccess" in buttonNode.dataset) {
    patchItem(storage, state.designItem, { library: { access: buttonNode.dataset.designAccess === "link" ? "link" : "private" } });
    render();
    return true;
  }
  if ("designMoveTo" in buttonNode.dataset) {
    const target = buttonNode.dataset.designMoveTo || "";
    const ids = state.designMove?.length ? state.designMove : [state.designItem];
    let moved = 0;
    for (const itemId of ids) {
      if (!itemId || itemId === target) continue;
      if (target && folderContains(itemId, target)) continue;
      if (patchItem(storage, itemId, { library: { folderId: target || null } })) moved += 1;
    }
    state.designSheet = "";
    state.designMove = [];
    state.designSelect = false;
    state.designSelected = [];
    state.designNotice = moved ? say("Movido.", "Moved.") : say("No se pudo mover.", "Could not move.");
    render();
    return true;
  }
  if ("designRenameSave" in buttonNode.dataset) {
    const name = document.getElementById("md-rename")?.value || "";
    patchItem(storage, state.designItem, { name });
    state.designSheet = "item";
    render();
    return true;
  }
  if ("designCreateSave" in buttonNode.dataset) {
    const name = document.getElementById("md-nombre")?.value || "";
    const access = document.querySelector("input[name='md-acceso']:checked")?.value === "link" ? "link" : "private";
    const kind = state.designDraft === "course" ? "course" : "folder";
    const item = createContainer(storage, { kind, name, access, folderId: state.designFolder || null });
    state.designSheet = "";
    if (!item) {
      state.designNotice = say("No se pudo crear.", "Could not create it.");
      render();
      return true;
    }
    state.designFolder = item.id;
    state.designCreate = false;
    state.designTab = "curso";
    designHash();
    return true;
  }
  if ("designCustom" in buttonNode.dataset) {
    const width = Number(document.getElementById("md-ancho")?.value);
    const height = Number(document.getElementById("md-alto")?.value);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64 || width > 2048 || height > 2048) {
      state.designNotice = say("Usa un tamaño entre 64 y 2048 px.", "Use a size between 64 and 2048 px.");
      state.dialog = false;
      render();
      return true;
    }
    applyCustomSize(width, height);
    return true;
  }
  if ("designAction" in buttonNode.dataset) {
    runDesignAction(buttonNode.dataset.designAction);
    return true;
  }
  if ("designSheet" in buttonNode.dataset) {
    if (buttonNode.dataset.designSheet === "views" && window.matchMedia("(min-width: 900px)").matches) return true;
    if (buttonNode.dataset.designDraft) state.designDraft = buttonNode.dataset.designDraft;
    state.designSheet = buttonNode.dataset.designSheet;
    render();
    return true;
  }
  return true;
}

function onRootClick(event) {
  const buttonNode = event.target.closest("button");
  if (!buttonNode || !root.contains(buttonNode)) return;
  if (buttonNode.dataset.ia) {
    handleIaClick(buttonNode);
    return;
  }
  if (handleDesignClick(buttonNode)) return;
  if (handleMasClick(buttonNode, {
    storage,
    lang,
    render,
    go,
    state,
    onWipe() {
      state.doc = null;
      state.past = [];
      state.future = [];
      applyMasChrome(storage);
      go("mas/preferencias/datos");
    },
  })) return;
  if (buttonNode.dataset.sheetClose != null) {
    state.librarySheet = false;
    state.filterSheet = false;
    state.viewSheet = false;
    render();
    return;
  }
  if (buttonNode.dataset.librarySheet != null) {
    state.librarySheet = true;
    state.filterSheet = false;
    state.viewSheet = false;
    render();
    return;
  }
  if (buttonNode.dataset.library) {
    state.librarySheet = false;
    state.filterSheet = false;
    state.viewSheet = false;
    state.libraryTopic = "";
    state.libraryQuery = "";
    state.priceFilter = "";
    state.priceDraft = "";
    go(buttonNode.dataset.library);
    return;
  }
  if ("topic" in buttonNode.dataset) {
    const next = buttonNode.dataset.topic || "";
    state.libraryTopic = state.libraryTopic === next ? "" : next;
    render();
    return;
  }
  if (buttonNode.dataset.priceOpen != null) {
    state.priceDraft = state.priceFilter || "";
    state.filterSheet = true;
    state.librarySheet = false;
    render();
    return;
  }
  if ("pricePick" in buttonNode.dataset) {
    state.priceDraft = buttonNode.dataset.pricePick || "";
    render();
    return;
  }
  if (buttonNode.dataset.priceApply != null) {
    state.priceFilter = state.priceDraft || "";
    state.filterSheet = false;
    render();
    return;
  }
  if (buttonNode.dataset.fav) {
    const id = buttonNode.dataset.fav;
    const list = new Set(state.favs || []);
    if (list.has(id)) list.delete(id);
    else list.add(id);
    state.favs = [...list];
    render();
    return;
  }
  if (buttonNode.dataset.viewSheet != null) {
    state.viewSheet = true;
    state.librarySheet = false;
    state.filterSheet = false;
    render();
    return;
  }
  if (buttonNode.dataset.favLayout) {
    state.favLayout = buttonNode.dataset.favLayout;
    state.viewSheet = false;
    render();
    return;
  }
  if (buttonNode.id === "limpiar-biblioteca") {
    state.libraryQuery = "";
    render();
    return;
  }
  if ("thumbCat" in buttonNode.dataset) {
    state.thumbCat = buttonNode.dataset.thumbCat || "";
    state.filters.uso = "";
    state.filters.text = "";
    state.filters.formato = "";
    if (!buttonNode.dataset.go && !buttonNode.dataset.thumb) render();
  }
  if (buttonNode.dataset.railDir) {
    const scroller = buttonNode.closest(".tpl-rail-wrap, .tpl-glance-wrap, .desk-carousel")?.querySelector(".tpl-rail-row, .tpl-glance, .canva-row, .canva-start");
    if (scroller) {
      const dir = buttonNode.dataset.railDir === "prev" ? -1 : 1;
      scroller.scrollBy({ left: dir * Math.max(160, Math.round(scroller.clientWidth * 0.72)), behavior: "smooth" });
    }
  }
  if (buttonNode.id === "tpl-buscar-icono") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const field = document.getElementById("buscar");
    if (field instanceof HTMLInputElement) field.focus();
  }
  if (buttonNode.id === "cerrar-plantilla" || buttonNode.dataset.closePreview != null) {
    state.openPreview = "";
    state.previewPage = 0;
    state.previewMore = false;
    render();
    return;
  }
  if (buttonNode.id === "tpl-guardar" && state.openPreview) {
    state.starred[state.openPreview] = !state.starred[state.openPreview];
    render();
    return;
  }
  if (buttonNode.id === "tpl-mas") {
    state.previewMore = !state.previewMore;
    render();
    return;
  }
  if (buttonNode.dataset.personalizar) {
    const id = buttonNode.dataset.personalizar;
    if (thumbById(id)) openThumb(id);
    else {
      const opened = documentForOpen(id);
      if (opened && opened.templateId === id) openDoc(opened);
    }
    return;
  }
  if (buttonNode.dataset.previewPage != null && state.openPreview) {
    state.previewPage = Number(buttonNode.dataset.previewPage) || 0;
    render();
    return;
  }
  const previewId = buttonNode.dataset.thumb
    || buttonNode.dataset.template
    || buttonNode.dataset.asset
    || (buttonNode.dataset.idea ? IDEAS.find((item) => item.id === buttonNode.dataset.idea)?.plantilla : "");
  if (previewId && documentForOpen(previewId)?.templateId === previewId) {
    state.openPreview = previewId;
    state.previewPage = 0;
    state.previewMore = false;
    render();
    return;
  }
  if (buttonNode.dataset.thumb) openThumb(buttonNode.dataset.thumb);
  if (buttonNode.dataset.go) go(buttonNode.dataset.go);
  if (buttonNode.id === "crear-pieza" || "openCreate" in buttonNode.dataset) {
    state.resizing = false;
    state.dialog = true;
    render();
  }
  if (buttonNode.dataset.startRail) {
    state.pendingRail = buttonNode.dataset.startRail;
    applyFormat("square");
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
    state.workRoute = "";
    state.workPreview = null;
    state.pdfOpen = false;
    render();
  }
  if (buttonNode.id === "cerrar-work") {
    state.workNote = false;
    state.workRoute = "";
    state.workPreview = null;
    render();
  }
  if (buttonNode.id === "work-nativo" || buttonNode.id === "work-doc" || buttonNode.id === "work-diapositivas") {
    const route = buttonNode.id === "work-nativo" ? "native" : buttonNode.id === "work-doc" ? "doc" : "slide";
    state.workRoute = route;
    state.workPreview = state.doc ? conversionPreview(state.doc, route) : null;
    render();
  }
  if (buttonNode.id === "work-confirmar") void confirmWork();
  if (buttonNode.id === "abrir-pdf") {
    state.pdfOpen = true;
    state.workNote = false;
    state.fileMenu = false;
    render();
  }
  if (buttonNode.id === "cerrar-pdf") {
    state.pdfOpen = false;
    render();
  }
  if (buttonNode.id === "exportar-pdf") void exportPdf();
  if (buttonNode.id === "exportar-paquete" && state.doc) void exportPackage(state.doc.id);
  if (buttonNode.id === "guardar-copia") void saveAsCopy();
  if (buttonNode.id === "abrir-recuperado") openRecovered();
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
  if (buttonNode.id === "exportar-sitio") downloadHtml();
  if (buttonNode.id === "exportar-html") downloadHtml();
  if (buttonNode.id === "ampliar-pizarra") expandBoard();
  if (buttonNode.id === "anadir-comentario") addComment();
  if (buttonNode.id === "guardar-historial") saveHistorySnapshot();
  if (buttonNode.dataset.history) restoreHistorySnapshot(buttonNode.dataset.history);
  if (buttonNode.dataset.photo) addLibraryPhoto(buttonNode.dataset.photo);
  if (buttonNode.dataset.phrase) insertPhrase(buttonNode.dataset.phrase);
  if (buttonNode.id === "anadir-escena") addPage();
  if (buttonNode.id === "presentar" || buttonNode.id === "pantalla") toggleFullscreen();
  if (buttonNode.id === "ayuda") {
    state.helpOpen = !state.helpOpen;
    render();
  }
  if (buttonNode.id === "cerrar-ayuda") {
    state.helpOpen = false;
    render();
  }
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
    state.editMenu = false;
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
    const next = buttonNode.dataset.grupo || "";
    const toggle = buttonNode.classList.contains("tpl-chip") || buttonNode.classList.contains("tpl-menu-item");
    state.grupo = toggle && next && state.grupo === next ? "" : next;
    state.masCats = false;
    if (toggle) state.thumbCat = "";
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
  if (buttonNode.dataset.duplicate) void duplicateWithImages(buttonNode.dataset.duplicate);
  if (buttonNode.dataset.delete) {
    if (window.confirm(t("confirmarBorrar"))) {
      moveToTrash(buttonNode.dataset.delete);
      render();
    }
  }
  if (buttonNode.dataset.export) exportJson(buttonNode.dataset.export);
  if (buttonNode.id === "importar-json" || buttonNode.id === "importar-paquete" || buttonNode.id === "subir-imagen" || buttonNode.id === "cambiar-imagen") {
    fileMode = buttonNode.id === "importar-json" || buttonNode.id === "importar-paquete" ? "project" : "image";
    if (logoInput) {
      logoInput.accept = fileMode === "project" ? "application/json,.json" : "image/png,image/jpeg,image/webp";
      logoInput.click();
    }
  }
  if (buttonNode.dataset.rail) {
    const next = buttonNode.dataset.rail;
    const fromStrip = buttonNode.classList.contains("strip-btn");
    if (fromStrip && state.panelOpen && state.rail === next) state.panelOpen = false;
    else {
      state.rail = next;
      state.panelOpen = true;
    }
    state.pop = "";
    render();
  }
  if (buttonNode.id === "menu-editar-btn") {
    state.editMenu = !state.editMenu;
    state.fileMenu = false;
    render();
  }
  if (buttonNode.dataset.pageCmd === "duplicate") duplicateCurrentPage();
  if (buttonNode.dataset.pageCmd === "delete") deleteCurrentPage();
  if (buttonNode.id === "compartir-studio") {
    if (compartir && !compartir.hidden) compartir.click();
    else descargar?.click();
  }
  if (buttonNode.dataset.pop) {
    state.pop = state.pop === buttonNode.dataset.pop ? "" : buttonNode.dataset.pop;
    render();
    return;
  }
  if (buttonNode.dataset.drawColor) {
    state.drawColor = buttonNode.dataset.drawColor;
    state.tool = "draw";
    render();
  }
  if (buttonNode.dataset.effect && state.doc) {
    const layer = primary();
    if (layer?.type === "text") {
      snapshot();
      const next = buttonNode.dataset.effect === "ninguno" ? "" : buttonNode.dataset.effect;
      layer.props.effect = layer.props.effect === next ? "" : next;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.anim && state.doc) {
    const layer = primary();
    if (layer) {
      snapshot();
      const next = buttonNode.dataset.anim === "ninguna" ? "" : buttonNode.dataset.anim;
      layer.anim = layer.anim === next ? "" : next;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.photoBg) {
    const item = photoById(buttonNode.dataset.photoBg);
    if (item && state.doc) {
      addLayer(imageLayer({
        name: (item.nombre?.[lang] || item.nombre?.es || item.id).slice(0, 40),
        x: 0,
        y: 0,
        w: state.doc.format.width,
        h: state.doc.format.height,
        src: { kind: "library", id: item.id },
      }));
      const placed = primary();
      if (placed) {
        placed.z = Math.min(...state.doc.layers.map((entry) => entry.z)) - 1;
        scheduleSave();
        render();
      }
    }
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
      state.pop = "";
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
    const key = buttonNode.dataset.style;
    if (layer?.type === "text" && key === "strike") {
      snapshot();
      layer.props.strike = !layer.props.strike;
      scheduleSave();
      render();
    } else if (layer?.type === "text" && (key === "bold" || key === "italic" || key === "underline")) {
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
  if (buttonNode.dataset.case === "cycle" && state.doc) {
    const layer = primary();
    if (layer?.type === "text") {
      const order = ["", "upper", "lower", "title"];
      const index = Math.max(0, order.indexOf(layer.props.textCase || ""));
      snapshot();
      layer.props.textCase = order[(index + 1) % order.length];
      scheduleSave();
      render();
    }
  }
  if (buttonNode.dataset.list && state.doc) {
    const layer = primary();
    if (layer?.type === "text") {
      snapshot();
      const next = buttonNode.dataset.list === "none" ? "" : buttonNode.dataset.list;
      layer.props.list = layer.props.list === next ? "" : next;
      scheduleSave();
      render();
    }
  }
  if (buttonNode.id === "copiar-formato") {
    const layer = primary();
    if (layer?.type === "text") {
      state.painter = {
        id: layer.id,
        props: {
          fontId: layer.props.fontId,
          size: layer.props.size,
          color: layer.props.color,
          bold: layer.props.bold,
          italic: layer.props.italic,
          underline: layer.props.underline,
          strike: Boolean(layer.props.strike),
          align: layer.props.align,
          textCase: layer.props.textCase || "",
        },
      };
      render();
    }
  }
  if (buttonNode.id === "magia-capa") {
    const layer = primary();
    if (layer?.type === "text") {
      snapshot();
      layer.props.effect = layer.props.effect ? "" : "sombra";
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
  if (kind === "barra") addLayer(chartLayer({ name: t("graficoBarras"), x: 80, y: 80, w: 480, h: 300, props: { chartType: "bar" } }));
  if (kind === "punto" || kind === "lineas") addLayer(chartLayer({ name: t("graficoLineas"), x: 80, y: 80, w: 480, h: 300, props: { chartType: "line" } }));
  if (kind === "tarta") addLayer(chartLayer({ name: t("graficoTarta"), x: 80, y: 80, w: 360, h: 360, props: { chartType: "pie" } }));
  if (kind === "tabla") addLayer(tableLayer({ name: t("tabla"), x: 80, y: 120, w: 520, h: 260 }));
  if (kind === "line") addLayer(lineLayer({ name: t("linea"), x: 120, y: 200, w: 420, h: 16, color: BRAND.navy, strokeWidth: 8 }));
  if (kind === "titulo") addLayer(textLayer({ name: t("titulo"), x: 80, y: 80, w: 640, h: 140, text: t("titulo"), fontId: "anton", size: 72, color: BRAND.navy }));
  if (kind === "cuerpo" || kind === "texto") addLayer(textLayer({ name: t("cuerpo"), x: 80, y: 240, w: 640, h: 160, text: t("cuerpo"), fontId: "barlow", size: 40, color: BRAND.navy }));
}

function addLibraryPhoto(id) {
  const item = photoById(id);
  if (!item) return;
  addLayer(imageLayer({
    name: (item.nombre?.[lang] || item.nombre?.es || item.id).slice(0, 40),
    x: 80,
    y: 80,
    w: 480,
    h: 360,
    src: { kind: "library", id: item.id },
  }));
}

function downloadHtml() {
  if (!state.doc) return;
  const html = exportSiteHtml(state.doc, { lang });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(state.doc.name || "sitio").replace(/[\\/]/g, "-").slice(0, 60)}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  state.htmlNote = t("htmlListo");
  render();
}

function expandBoard() {
  if (!state.doc || state.doc.meta.shell !== "whiteboard") return;
  snapshot();
  const next = Math.min(2048, state.doc.format.width + 240);
  const nextH = Math.min(2048, state.doc.format.height + 160);
  state.doc.format = makeFormat({ id: "board", width: next, height: nextH });
  state.doc.meta.boardExtra = (state.doc.meta.boardExtra || 0) + 1;
  scheduleSave();
  render();
}

function addComment() {
  if (!state.doc) return;
  snapshot();
  const comments = Array.isArray(state.doc.meta.comments) ? state.doc.meta.comments.slice() : [];
  comments.push({
    id: uid("cmt"),
    text: lang === "en" ? "Comment" : "Comentario",
    x: 48 + comments.length * 12,
    y: 48 + comments.length * 12,
    at: new Date().toISOString(),
    layerId: state.selected[0] || "",
  });
  state.doc.meta.comments = comments.slice(0, 40);
  scheduleSave();
  render();
}

function saveHistorySnapshot() {
  if (!state.doc) return;
  const result = pushHistory(storage, exportProject(state.doc));
  state.historyNote = result.ok ? t("historialNota") : (lang === "en" ? "Could not save snapshot (quota)." : "No se pudo guardar la instantánea (cuota).");
  render();
}

function restoreHistorySnapshot(historyId) {
  if (!state.doc) return;
  const doc = loadHistory(storage, state.doc.id, historyId);
  if (!doc) return;
  snapshot();
  const revision = state.doc.meta.revision;
  const workFileId = state.doc.meta.workFileId;
  state.doc = importProject(doc);
  state.doc.id = state.doc.id || doc.id;
  state.doc.meta.revision = revision;
  state.doc.meta.workFileId = workFileId;
  scheduleSave();
  render();
}

function insertPhrase(text) {
  const layer = primary();
  if (layer?.type === "text") {
    snapshot();
    layer.props.text = String(text || "").slice(0, 2000);
    scheduleSave();
    render();
    return;
  }
  addLayer(textLayer({ name: t("texto"), x: 80, y: 80, w: 640, h: 120, text: String(text || "").slice(0, 2000), fontId: "barlow", size: 40, color: BRAND.navy }));
}

function runAction(action, id) {
  const layer = id ? state.doc.layers.find((item) => item.id === id) : primary();
  if (action === "undo") {
    if (!state.past.length || !state.doc) return;
    syncPages();
    const revision = state.doc.meta.revision;
    const workFileId = state.doc.meta.workFileId;
    state.future.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.past.pop());
    state.doc.meta.revision = revision;
    state.doc.meta.workFileId = workFileId;
    state.page = bindPages(state.doc);
    scheduleSave();
    render();
    return;
  }
  if (action === "redo") {
    if (!state.future.length || !state.doc) return;
    syncPages();
    const revision = state.doc.meta.revision;
    const workFileId = state.doc.meta.workFileId;
    state.past.push(JSON.stringify(exportProject(state.doc)));
    state.doc = importProject(state.future.pop());
    state.doc.meta.revision = revision;
    state.doc.meta.workFileId = workFileId;
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
    const count = Math.max(1, state.selected.length);
    if (state.doc.layers.length + count > 48) {
      state.past.pop();
      state.pageNote = t("capaTope");
      render();
      return;
    }
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
  root.addEventListener("scroll", (event) => {
    if (event.target?.classList?.contains("stage-scroll")) placeSelectionPill();
  }, true);
  root.addEventListener("pointerdown", (event) => {
    const resize = event.target.closest?.("[data-resize]");
    const cropEdge = event.target.closest?.("[data-crop-edge]");
    const capa = event.target.closest?.(".capa");
    const art = event.target.closest?.(".stage-art");
    if (!state.doc || !art) return;
    if (event.target.closest?.("[data-edit]")) return;
    if (state.tool === "erase") {
      event.preventDefault();
      snapshot();
      const wipe = (node, ev) => {
        const point = stagePoint(node, ev);
        const hit = [...state.doc.layers].reverse().find((layer) => {
          if (layer.locked || (layer.type !== "line" && layer.type !== "rect")) return false;
          return point.x >= layer.x - 14 && point.x <= layer.x + layer.w + 14 && point.y >= layer.y - 14 && point.y <= layer.y + layer.h + 14;
        });
        if (!hit) return;
        state.doc.layers = state.doc.layers.filter((layer) => layer.id !== hit.id);
        state.selected = state.selected.filter((id) => id !== hit.id);
      };
      wipe(art, event);
      const move = (ev) => {
        const live = root.querySelector(".stage-art");
        if (live) wipe(live, ev);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", () => {
        window.removeEventListener("pointermove", move);
        scheduleSave();
        render();
      }, { once: true });
      return;
    }
    if (cropEdge) {
      event.preventDefault();
      event.stopPropagation();
      startCrop(cropEdge.dataset.cropEdge, event);
      return;
    }
    const rotate = event.target.closest?.("[data-rotate]");
    if (resize) {
      event.preventDefault();
      event.stopPropagation();
      startResize(resize.dataset.resize, event);
      return;
    }
    if (rotate) {
      event.preventDefault();
      event.stopPropagation();
      startRotate(rotate.dataset.rotate, event);
      return;
    }
    if (capa) {
      const hit = state.doc.layers.find((item) => item.id === capa.dataset.id);
      if (state.painter && hit?.type === "text" && state.painter.id !== hit.id) {
        event.preventDefault();
        snapshot();
        Object.assign(hit.props, state.painter.props);
        state.painter = null;
        state.selected = [hit.id];
        scheduleSave();
        render();
        return;
      }
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
    if (layer?.type === "image" && !layer.groupId && state.doc) {
      const format = state.doc.format;
      const area = (layer.w * layer.h) / Math.max(1, format.width * format.height);
      const near = layer.x <= 48 && layer.y <= 48 && layer.x + layer.w >= format.width - 48 && layer.y + layer.h >= format.height - 48;
      if (area >= 0.72 || near) {
        layer.x = 0;
        layer.y = 0;
        layer.w = format.width;
        layer.h = format.height;
        layer.z = Math.min(...state.doc.layers.map((entry) => entry.z)) - 1;
      }
    }
    scheduleSave();
    render();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
  render();
}

function startRotate(id, event) {
  snapshot();
  const layer = state.doc.layers.find((item) => item.id === id);
  const node = root.querySelector(`.capa[data-id="${id}"]`);
  if (!layer || !(node instanceof HTMLElement)) return;
  const box = node.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const move = (ev) => {
    layer.rotation = Math.round(Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90);
    const fx = layer.flipX ? -1 : 1;
    const fy = layer.flipY ? -1 : 1;
    node.style.transform = `rotate(${layer.rotation}deg) scale(${fx}, ${fy})`;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", () => {
    window.removeEventListener("pointermove", move);
    scheduleSave();
    render();
  }, { once: true });
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
  let last = point;
  let count = 0;
  const place = (a, b) => {
    if (!state.doc || state.doc.layers.length >= 48 || count > 36) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;
    const layer = lineLayer({
      x: a.x,
      y: a.y - 4,
      w: Math.max(2, len),
      h: 8,
      color: state.drawColor || BRAND.navy,
      strokeWidth: 8,
    });
    layer.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
    layer.z = Math.max(0, ...state.doc.layers.map((item) => item.z)) + 1;
    state.doc.layers.push(layer);
    state.selected = [layer.id];
    count += 1;
  };
  const move = (ev) => {
    const art = root.querySelector(".stage-art");
    if (!art) return;
    const next = stagePoint(art, ev);
    if (Math.hypot(next.x - last.x, next.y - last.y) < 12) return;
    place(last, next);
    last = next;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", () => {
    window.removeEventListener("pointermove", move);
    if (!count) place(point, { x: point.x + 8, y: point.y + 4 });
    scheduleSave();
    render();
  }, { once: true });
}

function bindInputs() {
  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id.startsWith("ia-")) {
      if (!handleIaInput(target)) return;
      render();
      return;
    }
    if (handleMasInput(target, { storage })) return;
    if (target.id === "buscar") {
      const view = viewName();
      if (view === "disenos") {
        state.designQuery = target.value;
        render();
        const field = document.getElementById("buscar");
        if (field instanceof HTMLInputElement) {
          field.focus();
          const end = field.value.length;
          field.setSelectionRange(end, end);
        }
        return;
      }
      if (view === "fotos" || view === "elementos") {
        state.libraryQuery = target.value;
        render();
        const field = document.getElementById("buscar");
        if (field instanceof HTMLInputElement) {
          field.focus();
          const end = field.value.length;
          field.setSelectionRange(end, end);
        }
        return;
      }
      state.filters.text = target.value;
      if (view === "inicio" || view === "plantillas") {
        render();
        const field = document.getElementById("buscar");
        if (field instanceof HTMLInputElement) {
          field.focus();
          const end = field.value.length;
          field.setSelectionRange(end, end);
        }
        return;
      }
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
    if (target.id === "md-crear-buscar") {
      state.designCreateQuery = target.value;
      render();
      const field = document.getElementById("md-crear-buscar");
      if (field instanceof HTMLInputElement) {
        field.focus();
        const end = field.value.length;
        field.setSelectionRange(end, end);
      }
      return;
    }
    if (target.id === "md-cat-buscar") {
      const q = target.value.trim().toLowerCase();
      root.querySelectorAll(".md-cat").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const label = (node.textContent || "").toLowerCase();
        node.hidden = Boolean(q) && !label.includes(q);
      });
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
    if (target.id === "buscar-fotos") {
      state.photoQuery = target.value;
      render();
      const field = document.getElementById("buscar-fotos");
      if (field instanceof HTMLInputElement) {
        field.focus();
        const end = field.value.length;
        field.setSelectionRange(end, end);
      }
      return;
    }
    if (!state.doc) return;
    if (target.id === "datos-grafico") {
      const layer = primary();
      if (layer?.type === "chart") {
        const caret = target.selectionStart;
        layer.props = parseSeriesText(target.value, layer.props);
        scheduleSave();
        render();
        const field = document.getElementById("datos-grafico");
        if (field instanceof HTMLTextAreaElement) {
          field.focus();
          const at = Math.min(caret ?? field.value.length, field.value.length);
          field.setSelectionRange(at, at);
        }
        return;
      }
    }
    if (target.id === "datos-tabla") {
      const layer = primary();
      if (layer?.type === "table") {
        const caret = target.selectionStart;
        layer.props = parseTableText(target.value, layer.props);
        scheduleSave();
        render();
        const field = document.getElementById("datos-tabla");
        if (field instanceof HTMLTextAreaElement) {
          field.focus();
          const at = Math.min(caret ?? field.value.length, field.value.length);
          field.setSelectionRange(at, at);
        }
        return;
      }
    }
    if (target.id === "duracion-escena") {
      const scenes = Array.isArray(state.doc.meta.scenes) ? state.doc.meta.scenes.slice() : [];
      const index = state.page || 0;
      while (scenes.length <= index) scenes.push({ duration: 5, label: `${t("escenas")} ${scenes.length + 1}` });
      scenes[index] = { ...scenes[index], duration: Math.min(60, Math.max(1, Math.round(Number(target.value) || 5))) };
      state.doc.meta.scenes = scenes;
      scheduleSave();
    }
    if (target.dataset.comment) {
      const comments = Array.isArray(state.doc.meta.comments) ? state.doc.meta.comments : [];
      const item = comments.find((entry) => entry.id === target.dataset.comment);
      if (item) {
        item.text = String(target.value || "").slice(0, 500);
        scheduleSave();
      }
    }
    if (target.id === "notas-pizarra" && state.doc) {
      if (target.value.length > 2000) {
        state.status = "limite-texto";
        state.pageNote = t("limiteTexto");
        const node = document.getElementById("estado-guardado");
        if (node) node.textContent = statusText();
      }
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
        const raw = target.textContent || "";
        if (raw.length > 2000) {
          state.status = "limite-texto";
        state.pageNote = t("limiteTexto");
          const node = document.getElementById("estado-guardado");
          if (node) node.textContent = statusText();
        }
        layer.props.text = raw.slice(0, 2000);
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
    if (target.dataset.chartField != null && target.dataset.chartRow != null) {
      const layer = primary();
      if (layer?.type === "chart") {
        const index = Number(target.dataset.chartRow);
        const labels = (layer.props.labels || []).slice();
        const values = (layer.props.values || []).slice();
        if (target.dataset.chartField === "label") labels[index] = String(target.value || "").slice(0, 40);
        else values[index] = Math.max(0, Math.min(1e6, Number(target.value) || 0));
        layer.props = { ...layer.props, labels, values };
        const caret = target.selectionStart;
        scheduleSave();
        render();
        const next = root.querySelector(`[data-chart-row="${index}"][data-chart-field="${target.dataset.chartField}"]`);
        if (next instanceof HTMLInputElement) {
          next.focus();
          const at = Math.min(caret ?? next.value.length, next.value.length);
          try { next.setSelectionRange(at, at); } catch { /* number inputs */ }
        }
        return;
      }
    }
    if (target.id === "zoom-rango") {
      state.zoom = String(Math.min(200, Math.max(10, Number(target.value) || 100)) / 100);
      applyStageFit();
    }
    if (target.id === "color-texto" || target.id === "tamano-texto" || target.id === "interlineado" || target.id === "interletrado") {
      const layer = primary();
      if (layer?.type === "text") {
        if (target.id === "color-texto") {
          const [from, to] = textRange(layer);
          if (state.editingId === layer.id && to > from) layer.props.runs = applySpan(layer.props.text, layer.props.runs, from, to, { color: target.value }, layer.props);
          else layer.props.color = target.value;
        }
        if (target.id === "tamano-texto") layer.props.size = Math.min(400, Math.max(8, Math.round(Number(target.value) || layer.props.size)));
        if (target.id === "interlineado") layer.props.lineHeight = Math.min(3, Math.max(0.8, Number(target.value) || layer.props.lineHeight));
        if (target.id === "interletrado") layer.props.letterSpacing = Math.min(40, Math.max(-8, Number(target.value) || 0));
        const node = root.querySelector(`.capa[data-id="${layer.id}"] .capa-texto`);
        if (node instanceof HTMLElement) {
          node.style.color = layer.props.color;
          node.style.fontSize = `${layer.props.size}px`;
          node.style.lineHeight = String(layer.props.lineHeight);
          node.style.letterSpacing = `${layer.props.letterSpacing || 0}px`;
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
      const raw = target.value || "";
      if (raw.length > 2000) {
        state.status = "limite-texto";
        state.pageNote = t("limiteTexto");
        const node = document.getElementById("estado-guardado");
        if (node) node.textContent = statusText();
      }
      layer.props.text = raw.slice(0, 2000);
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
    if (event.target?.id === "ia-adjunto" && event.target instanceof HTMLInputElement) {
      handleIaFile(event.target.files?.[0]);
      event.target.value = "";
      render();
      return;
    }
    if (event.target?.dataset?.crop || event.target?.id === "contorno-color" || event.target?.dataset?.stroke || event.target?.id === "tamano-texto" || event.target?.id === "interlineado" || event.target?.id === "color-texto" || event.target?.id === "fondo-color") render();
  });
  root.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !state.doc) return;
    if (target.matches("#tamano-texto, #interlineado, #interletrado, #fondo-color, #color-texto, #contorno-color, [data-opacidad], [data-stroke], #texto-capa, [data-chart-field]")) snapshot();
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
  if (event.key === "Escape" && state.openPreview) {
    state.openPreview = "";
    state.previewPage = 0;
    render();
    return;
  }
  if (event.key === "Escape" && state.designSheet) {
    state.designSheet = "";
    render();
    return;
  }
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
    if (state.doc.layers.length + state.clip.length > 48) {
      state.pageNote = t("capaTope");
      render();
      return;
    }
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
  if (fileMode === "library") {
    fileMode = "image";
    logoInput.accept = "image/png,image/jpeg,image/webp";
    const base = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || say("Archivo", "File");
    if (file.type === "application/json" || /\.json$/i.test(file.name)) {
      await importJson(file);
      return;
    }
    if (file.type.startsWith("image/")) {
      const doc = blankDocument("square");
      doc.name = base;
      doc.library = normalizeLibrary({ kind: "image" });
      openDoc(doc);
    } else {
      const kind = file.type.startsWith("video/") ? "video" : "file";
      const item = createContainer(storage, {
        kind,
        name: file.name.slice(0, 80),
        folderId: state.pendingFolder || state.designFolder || null,
      });
      state.pendingFolder = "";
      state.designSheet = "";
      state.designNotice = item ? say("Archivo añadido a tus diseños.", "File added to your designs.") : say("No se pudo guardar el archivo.", "Could not save that file.");
      if (viewName() === "disenos") render();
      else go("disenos");
      return;
    }
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
    const stored = await images.put(state.doc.id, layer.id, image);
    state.imageFailed = stored === false;
    if (state.imageFailed) {
      state.status = "image-fail";
      state.pageNote = t("imagenNo");
    }
    if (logoEstado) logoEstado.textContent = t("imagenLista");
    scheduleSave();
    render();
  } catch (error) {
    showLogoError(error?.message);
  }
}

async function importJson(file) {
  let text = "";
  try {
    text = await file.text();
  } catch {
    state.status = "invalid";
    render();
    return;
  }
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    state.status = "invalid";
    render();
    return;
  }
  if (data?.format === "orvupi-design") {
    await importPackage(data);
    return;
  }
  try {
    const doc = importProject(data);
    doc.id = uid("proj");
    doc.meta.revision = 0;
    doc.meta.workFileId = "";
    const missing = userImageIds(doc).length > 0;
    openDoc(doc, { imageFailed: false });
    if (missing) {
      state.status = "missing-image";
      render();
    }
  } catch (error) {
    state.status = statusFromError(error);
    state.pageNote = statusText();
    if (routeFromHash(location.hash) === "disenos") state.designNotice = state.pageNote || say("No se pudo importar.", "Could not import.");
    render();
  }
}

async function importPackage(data) {
  try {
    const opened = unpackDesign(data);
    let imageFailed = false;
    for (const [id, image] of opened.images) {
      const stored = await images.put(opened.doc.id, id, image);
      if (!stored) imageFailed = true;
      state.userImages.set(id, image);
    }
    openDoc(opened.doc, { imageFailed });
    if (opened.missing.length) {
      state.status = "missing-image";
      state.pageNote = t("faltaImagen");
      render();
    }
  } catch (error) {
    state.status = statusFromError(error);
    state.pageNote = statusText();
    render();
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
}

async function collectImages(doc) {
  const list = [];
  for (const id of userImageIds(doc)) {
    let image = state.userImages.get(id);
    if (!image) image = await images.get(doc.id, id);
    if (!image) continue;
    list.push({ id, width: image.width, height: image.height, rgba: image.rgba });
  }
  return list;
}

async function exportPackage(id) {
  const doc = id === state.doc?.id ? state.doc : loadProject(storage, id);
  if (!doc) return;
  const packed = packDesign(doc, await collectImages(doc));
  downloadBlob(new Blob([JSON.stringify(packed)], { type: "application/json" }), "diseno.orvdesign.json");
  if (packed.missing.length) {
    state.status = "missing-image";
    state.pageNote = t("faltaImagen");
    render();
  }
}

async function exportPdf() {
  if (!state.doc || state.busy) return;
  const texts = projectTexts(state.doc);
  if (!exportAllowed(texts.title, texts.body, undefined, texts.label)) {
    if (avisoBloqueo) avisoBloqueo.hidden = false;
    return;
  }
  const boxes = [...document.querySelectorAll("[data-pdf-page]")].filter((node) => node.checked).map((node) => Number(node.dataset.pdfPage));
  if (!boxes.length) {
    state.pageNote = t("pdfVacio");
    render();
    return;
  }
  state.busy = true;
  syncChrome();
  try {
    syncPages();
    const pages = [];
    for (const index of boxes) {
      const layers = state.doc.meta.pages?.[index] || state.doc.layers;
      const rendered = await renderDocument({ ...state.doc, layers }, { userImages: state.userImages });
      pages.push({ width: rendered.width, height: rendered.height, rgba: rendered.rgba });
    }
    const pdf = pdfFromPages(pages);
    downloadBlob(new Blob([pdf], { type: "application/pdf" }), "studio.pdf");
    state.pdfOpen = false;
    state.pageNote = t("pdfListo");
    render();
  } catch {
    state.status = "invalid";
    render();
  } finally {
    state.busy = false;
    syncChrome();
  }
}

async function duplicateWithImages(id) {
  const copy = duplicateProject(storage, id);
  if (!copy) {
    const full = listProjects(storage).length >= 40;
    state.status = full ? "cap" : "quota";
    state.pageNote = full ? t("topeProyectos") : "";
    render();
    return;
  }
  const ok = await images.copyProject(id, copy.id, userImageIds(copy));
  state.imageFailed = !ok;
  state.status = ok ? "saved" : "image-fail";
  if (!ok) state.pageNote = t("imagenNo");
  render();
}

function openRecovered() {
  const raw = listRecovery(storage)[0];
  if (!raw) return;
  try {
    const doc = importProject(raw);
    openDoc(doc);
  } catch (error) {
    state.status = statusFromError(error);
    state.pageNote = statusText();
    render();
  }
}

async function saveAsCopy() {
  if (!state.doc) return;
  const previous = state.doc.id;
  syncPages();
  const raw = exportProject(state.doc);
  raw.id = uid("proj");
  raw.name = `${state.doc.name} copia`.slice(0, 80);
  raw.meta.revision = 0;
  raw.meta.workFileId = "";
  const doc = importProject(raw);
  const imagesOk = await images.copyProject(previous, doc.id, userImageIds(doc));
  openDoc(doc, { imageFailed: !imagesOk });
}

async function syncWorkFile() {
  if (!state.doc?.meta?.workFileId) return;
  try {
    const packed = packDesign(state.doc, await collectImages(state.doc));
    const bytes = new TextEncoder().encode(JSON.stringify(packed));
    const saved = await saveWorkBytes({
      id: state.doc.meta.workFileId,
      name: state.doc.name,
      kind: "other",
      mime: DESIGN_MIME,
      bytes,
      revision: state.doc.meta.revision || 0,
      snippet: projectTexts(state.doc).title,
    });
    if (!saved.ok) {
      state.pageNote = t("workFallo");
    } else if (saved.copied) {
      state.doc.meta.workFileId = saved.id;
      state.pageNote = t("workCopia");
      applySaveResult(saveProject(storage, state.doc));
      const next = `#/work/${saved.id}`;
      if (location.hash !== next) location.hash = next;
    }
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = statusText();
  } catch {
    state.pageNote = t("workFallo");
  }
}

async function confirmWork() {
  if (!state.doc || !state.workRoute) return;
  syncPages();
  const route = state.workRoute;
  const collected = await collectImages(state.doc);
  const imageMap = new Map(collected.map((image) => [image.id, image]));
  try {
    if (route === "native") {
      const packed = packDesign(state.doc, collected);
      const bytes = new TextEncoder().encode(JSON.stringify(packed));
      const saved = await saveWorkBytes({
        id: state.doc.meta.workFileId || "",
        name: state.doc.name,
        kind: "other",
        mime: DESIGN_MIME,
        bytes,
        revision: state.doc.meta.revision || 0,
        snippet: projectTexts(state.doc).title,
      });
      if (!saved.ok) {
        state.pageNote = t("workFallo");
        render();
        return;
      }
      state.doc.meta.workFileId = saved.id;
      state.workNote = false;
      state.pageNote = saved.copied ? t("workCopia") : t("workHecho");
      applySaveResult(saveProject(storage, state.doc));
      const next = `#/work/${saved.id}`;
      if (location.hash !== next) location.hash = next;
      else render();
      return;
    }
    const file = route === "doc" ? await toOrvdoc(state.doc, { images: imageMap }) : await toSlides(state.doc, { images: imageMap });
    const bytes = new TextEncoder().encode(JSON.stringify(file));
    const saved = await saveWorkBytes({
      name: file.title,
      kind: route === "doc" ? "doc" : "slide",
      mime: route === "doc" ? DOC_MIME : SLIDE_MIME,
      bytes,
      snippet: projectTexts(state.doc).title,
    });
    if (!saved.ok) {
      state.pageNote = t("workFallo");
      render();
      return;
    }
    state.workNote = false;
    state.pageNote = t("workHecho");
    render();
    const path = route === "doc" ? `/work/document/d/${saved.id}/edit` : `/work/presentation/d/${saved.id}/edit`;
    window.location.assign(path);
  } catch {
    state.pageNote = t("workFallo");
    render();
  }
}

async function openFromWork(id) {
  const loaded = await loadWorkBytes(id);
  if (!loaded) {
    state.status = "invalid";
    state.pageNote = t("invalido");
    render();
    return;
  }
  let data = null;
  try {
    data = JSON.parse(new TextDecoder().decode(loaded.bytes));
  } catch {
    state.status = "invalid";
    render();
    return;
  }
  try {
    const opened = unpackDesign(data, { keepId: true });
    opened.doc.meta.workFileId = id;
    let imageFailed = false;
    for (const [imageId, image] of opened.images) {
      const stored = await images.put(opened.doc.id, imageId, image);
      if (!stored) imageFailed = true;
      state.userImages.set(imageId, image);
    }
    openDoc(opened.doc, { workFileId: id, imageFailed });
  } catch (error) {
    state.status = statusFromError(error);
    state.pageNote = statusText();
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
    const label = String(kind || "png").toUpperCase();
    pushNotice(storage, {
      id: `export:${label}`,
      title: lang === "en" ? "Export ready" : "Exportación lista",
      body: lang === "en" ? `The ${label} file stayed on this device.` : `El archivo ${label} se quedó en este dispositivo.`,
    });
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
  bindIaRuntime({ render, storage, lang });
  try {
    recoverWrite(storage);
    adoptLegacyDraft(storage);
  } catch {
    /* el navegador puede negar el almacén; la página sigue */
  }
  if (!document.getElementById("calidad-jpg") && acciones) ensureQuality();
  root.addEventListener("click", onRootClick);
  root.addEventListener("toggle", (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.hasAttribute("data-card-menu") || !details.open) return;
    const panel = details.querySelector("div");
    const summary = details.querySelector("summary");
    if (!panel || !summary) return;
    const rect = summary.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.top = `${Math.round(rect.bottom + 6)}px`;
    panel.style.right = `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`;
    panel.style.left = "auto";
    panel.style.zIndex = "60";
  }, true);
  bindStage();
  bindInputs();
  bindLayersDrag();
  document.addEventListener("keydown", onKey);
  window.addEventListener("scroll", () => {
    const home = root.querySelector(".canva-plantillas, .canva-disenos");
    if (!home) return;
    home.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });
  window.addEventListener("hashchange", () => {
    const id = workIdFromHash(location.hash);
    if (id && state.doc?.meta?.workFileId !== id) {
      void openFromWork(id);
      return;
    }
    render();
  });
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
    if (viewName() === "disenos") state.pendingFolder = "";
  });
  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement) || target.id !== "curso-desc" || !state.designFolder) return;
    patchItem(storage, state.designFolder, { library: { description: target.value } });
  });
  root.addEventListener("keydown", (event) => {
    if (handleIaKeydown(event)) return;
    if (event.key !== "Enter") return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "md-nombre") document.querySelector("[data-design-create-save]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    if (target.id === "md-rename") document.querySelector("[data-design-rename-save]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  descargar?.addEventListener("click", () => { void deliver("png"); });
  descargarJpg?.addEventListener("click", () => { void deliver("jpg"); });
  compartir?.addEventListener("click", () => { void deliver("png", true); });
  borrar?.addEventListener("click", () => {
    if (!state.doc) return;
    if (!window.confirm(t("confirmarBorrar"))) return;
    moveToTrash(state.doc.id);
    go("mas/papelera");
  });
  applyMasChrome(storage);
  render();
  window.matchMedia("(min-width: 900px)").addEventListener("change", () => {
    if (viewName() === "editor") return;
    render();
  });
  const pendingWork = workIdFromHash(location.hash);
  if (pendingWork) void openFromWork(pendingWork);
}

if (root) boot();
