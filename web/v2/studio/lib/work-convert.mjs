/** Conversión de un diseño de Studio a Docs o Slides de Work. El original no se reescribe. */

import { encodePng } from "./png.mjs";

export const SLIDE_W = 960;
export const SLIDE_H = 540;

const FONT_DOC = {
  anton: "Arial",
  bangers: "Arial",
  archivo: "Arial",
  audiowide: "Arial",
  barlow: "Arial",
  saira: "Arial",
  silkscreen: "Courier New",
};

function pagesOf(doc) {
  const pages = Array.isArray(doc?.meta?.pages) && doc.meta.pages.length ? doc.meta.pages : [doc?.layers || []];
  return pages.map((page) => (Array.isArray(page) ? page : []));
}

function ordered(layers) {
  return [...layers].sort((a, b) => (a.y - b.y) || (a.x - b.x) || ((a.z || 0) - (b.z || 0)));
}

export function slideFit(doc) {
  const width = Number(doc?.format?.width) || SLIDE_W;
  const height = Number(doc?.format?.height) || SLIDE_H;
  const scale = Math.min(SLIDE_W / width, SLIDE_H / height);
  return {
    width,
    height,
    scale,
    ox: (SLIDE_W - width * scale) / 2,
    oy: (SLIDE_H - height * scale) / 2,
  };
}

function fontName(fontId) {
  return FONT_DOC[fontId] || "Arial";
}

function pt(px, scale) {
  return Math.max(1, Math.round(Number(px) * scale * 720 / SLIDE_W));
}

function hex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

function shortId(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`.slice(0, 40);
}

async function pngDataUrl(image) {
  if (!image?.rgba || !image.width || !image.height) return "";
  const png = await encodePng(image.rgba, image.width, image.height);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < png.length; index += chunk) {
    binary += String.fromCharCode(...png.subarray(index, index + chunk));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function imageOf(map, id) {
  if (!map) return null;
  if (typeof map.get === "function") return map.get(id) || null;
  return map[id] || null;
}

export function conversionPreview(doc, route) {
  const fit = slideFit(doc);
  const pages = pagesOf(doc);
  const layers = pages.flat();
  const locked = layers.some((layer) => layer.locked);
  const catalogBg = doc?.background?.type === "catalog";
  const userImages = layers.filter((layer) => layer?.type === "image" && layer.src?.kind === "user").length;
  const overItems = pages.some((page) => page.filter((layer) => layer.visible !== false).length > 60);
  const fontLoss = "Anton, Bangers, Archivo Black, Audiowide, Barlow Condensed y Saira ExtraCondensed pasan a Arial. Silkscreen pasa a Courier New.";
  if (route === "native") {
    return {
      route,
      keeps: [
        "El mismo editor abre todas las capas, páginas, textos, formas e imágenes.",
        "El archivo de Work guarda el identificador. El diseño no viaja entero en la dirección.",
      ],
      losses: [
        "La biblioteca local no es una sincronización en la nube.",
        "Abrir el derivado no actualiza el diseño al revés.",
      ],
      dimension: `${fit.width}×${fit.height} px se conservan.`,
    };
  }
  if (route === "doc") {
    return {
      route,
      keeps: [
        "Los textos pasan a títulos (si el tamaño es de 48 px o más) y a párrafos.",
        "Las imágenes con bytes pasan a nodos de imagen.",
      ],
      losses: [
        "El texto fluye. No se conserva la posición absoluta ni el lienzo.",
        fontLoss,
        "Recorte, volteo y rotación de las imágenes no se conservan.",
        "Las formas y las líneas no entran como objetos del documento.",
        layers.some((layer) => layer.type === "table")
          ? "Las tablas de Studio pasan a texto plano por filas, no a una tabla nativa de Docs en esta versión."
          : "Si no hay tablas, no se inventan.",
        layers.some((layer) => layer.type === "chart")
          ? "Los gráficos de datos se omiten en el documento: solo se listan las etiquetas como párrafo."
          : "No hay gráficos de datos en este diseño.",
        "No se pega una captura de la página como si fuera un documento editable.",
        userImages ? "Si falta el archivo de una imagen, esa imagen no entra." : "Este diseño no tiene imágenes subidas.",
        "No hay vuelta automática al diseño original.",
      ],
      dimension: `El documento usa página A4. El lienzo de origen mide ${fit.width}×${fit.height} px.`,
    };
  }
  const losses = [
    `La diapositiva de Work mide 960×540. Este lienzo de ${fit.width}×${fit.height} entra a escala ${fit.scale.toFixed(3)}.`,
    fontLoss,
    "El bloqueo de capas no se conserva.",
    "Las guías y la cuadrícula no se convierten.",
    layers.some((layer) => layer.type === "table")
      ? "Las tablas no entran como tabla nativa de diapositivas; se omiten o se aplanan en una pasada posterior."
      : "No hay tablas que mapear.",
    layers.some((layer) => layer.type === "chart")
      ? "Los gráficos de datos no se convierten a objetos de diapositiva en esta versión."
      : "No hay gráficos de datos en este diseño.",
    "Un vídeo, si lo hubiera, entra como fotograma estático. No hay audio ni exportación MP4.",
    "No hay vuelta automática al diseño original.",
  ];
  if (catalogBg) losses.push("El fondo de catálogo entra como color plano.");
  if (locked) losses.push("Hay capas bloqueadas. En la presentación se pueden mover.");
  if (overItems) losses.push("A partir del elemento 61 de una página, el resto no entra en la diapositiva.");
  if (Math.abs(fit.width / fit.height - 16 / 9) > 0.02) {
    losses.push("La proporción no es 16:9. Quedan márgenes para no recortar el diseño.");
  }
  return {
    route: "slide",
    keeps: [
      "Textos, formas, líneas e imágenes conservan posición, tamaño, rotación y volteo, a escala.",
      "Los grupos se conservan como grupo.",
    ],
    losses,
    dimension: `${fit.width}×${fit.height} px → 960×540, escala ${fit.scale.toFixed(3)}.`,
  };
}

function textMarks(layer) {
  const marks = [];
  const attrs = {
    fontFamily: fontName(layer.props?.fontId),
  };
  if (typeof layer.props?.color === "string") attrs.color = layer.props.color;
  if (Number.isFinite(Number(layer.props?.size))) attrs.fontSize = `${Math.max(1, Math.round(Number(layer.props.size) * 0.75))}pt`;
  marks.push({ type: "textStyle", attrs });
  if (layer.props?.bold) marks.push({ type: "bold" });
  if (layer.props?.italic) marks.push({ type: "italic" });
  if (layer.props?.underline) marks.push({ type: "underline" });
  return marks;
}

function textBlock(layer) {
  const size = Number(layer.props?.size) || 16;
  const level = size >= 72 ? 1 : size >= 48 ? 2 : 0;
  const content = [{ type: "text", text: String(layer.props?.text || ""), marks: textMarks(layer) }];
  if (level) return { type: "heading", attrs: { level }, content };
  const node = { type: "paragraph", content };
  if (layer.props?.align === "center" || layer.props?.align === "right") node.attrs = { textAlign: layer.props.align };
  return node;
}

export async function toOrvdoc(doc, options = {}) {
  const content = [];
  const pages = pagesOf(doc);
  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) content.push({ type: "paragraph", content: [{ type: "text", text: "" }] });
    for (const layer of ordered(pages[index])) {
      if (layer.visible === false) continue;
      if (layer.type === "text") content.push(textBlock(layer));
      if (layer.type === "table" && Array.isArray(layer.props?.rows)) {
        for (const row of layer.props.rows) {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: (Array.isArray(row) ? row : [row]).map((cell) => String(cell ?? "")).join(" | ") }],
          });
        }
      }
      if (layer.type === "chart" && Array.isArray(layer.props?.labels)) {
        const labels = layer.props.labels.map((label, i) => `${label}: ${layer.props.values?.[i] ?? 0}`).join(", ");
        content.push({ type: "paragraph", content: [{ type: "text", text: labels }] });
      }
      if (layer.type === "image" && layer.src?.kind === "user") {
        const image = imageOf(options.images, layer.src.id);
        const src = await pngDataUrl(image);
        if (!src) continue;
        content.push({
          type: "image",
          attrs: { src, alt: String(layer.name || "Imagen").slice(0, 180), width: Math.round(layer.w) || image.width, height: Math.round(layer.h) || image.height },
        });
      }
    }
  }
  if (!content.length) content.push({ type: "paragraph" });
  const now = new Date().toISOString();
  const title = String(doc?.name || "Diseno").replace(/[\u0000-\u001f]/g, "").replace(/[\\/]/g, "-").trim().slice(0, 180) || "Diseno";
  return {
    format: "orvupi-doc",
    version: 1,
    id: newId(),
    title,
    createdAt: now,
    updatedAt: now,
    content: { type: "doc", content },
    header: "",
    footer: `Origen Studio ${doc?.id || ""}. Sin vuelta automatica.`.slice(0, 240),
    comments: [],
    versions: [],
    columns: 1,
    dropCap: false,
    watermark: "",
    pageNumber: false,
    pageSize: "a4",
    pageOrientation: "portrait",
    pageMargin: "normal",
  };
}

function slideItem(layer, fit, src) {
  const x = Math.round(fit.ox + layer.x * fit.scale);
  const y = Math.round(fit.oy + layer.y * fit.scale);
  const w = Math.max(1, Math.round(layer.w * fit.scale));
  const h = Math.max(1, Math.round(layer.h * fit.scale));
  const base = {
    id: shortId("s"),
    x,
    y,
    w,
    h,
    rot: Number(layer.rotation) ? Math.round(Number(layer.rotation)) : undefined,
    flipH: layer.flipX ? true : undefined,
    flipV: layer.flipY ? true : undefined,
    group: layer.groupId ? String(layer.groupId).slice(0, 40) : undefined,
  };
  if (layer.type === "text") {
    return {
      ...base,
      kind: "text",
      text: String(layer.props?.text || ""),
      font: fontName(layer.props?.fontId),
      size: pt(layer.props?.size || 32, fit.scale),
      color: hex(layer.props?.color, "#102032"),
      bold: Boolean(layer.props?.bold) || undefined,
      italic: Boolean(layer.props?.italic) || undefined,
      underline: Boolean(layer.props?.underline) || undefined,
      align: layer.props?.align === "center" || layer.props?.align === "right" ? layer.props.align : "left",
    };
  }
  if (layer.type === "rect") {
    return {
      ...base,
      kind: "shape",
      shape: layer.props?.shape === "ellipse" ? "ellipse" : "rect",
      text: "",
      fill: layer.props?.fill === "none" ? "none" : hex(layer.props?.fill, "#ff3070"),
      stroke: layer.props?.stroke ? hex(layer.props.stroke, "#102032") : undefined,
      strokeWidth: Number(layer.props?.strokeWidth) > 0 ? Math.min(24, Math.round(Number(layer.props.strokeWidth) * fit.scale)) : undefined,
    };
  }
  if (layer.type === "line") {
    return {
      ...base,
      kind: "line",
      x1: x,
      y1: y,
      x2: x + w,
      y2: y + h,
      color: hex(layer.props?.color, "#102032"),
      width: Math.max(1, Math.round((Number(layer.props?.strokeWidth) || layer.h || 2) * fit.scale)),
    };
  }
  if (layer.type === "image" && src) {
    return { ...base, kind: "image", src };
  }
  return null;
}

export async function toSlides(doc, options = {}) {
  const fit = slideFit(doc);
  const slides = [];
  const pages = pagesOf(doc);
  for (const page of pages.slice(0, 100)) {
    const items = [];
    for (const layer of [...page].sort((a, b) => (a.z || 0) - (b.z || 0))) {
      if (layer.visible === false) continue;
      if (items.length >= 60) break;
      let src = "";
      if (layer.type === "image" && layer.src?.kind === "user") src = await pngDataUrl(imageOf(options.images, layer.src.id));
      if (layer.type === "image" && !src) continue;
      const item = slideItem(layer, fit, src);
      if (item) items.push(item);
    }
    const titleItem = items.find((item) => item.kind === "text");
    slides.push({
      id: shortId("p"),
      title: titleItem ? String(titleItem.text).slice(0, 180) : String(doc?.name || "").slice(0, 180),
      body: "",
      theme: "papel",
      background: hex(doc?.background?.fill, "#fff8ec"),
      items,
      notes: `Origen Studio ${doc?.id || ""}. Sin vuelta automatica.`.slice(0, 240),
      transition: "none",
      layout: "blank",
    });
  }
  if (!slides.length) {
    slides.push({ id: shortId("p"), title: "", body: "", theme: "papel", items: [], transition: "none", layout: "blank" });
  }
  const nowTitle = String(doc?.name || "Diseno").replace(/[\u0000-\u001f]/g, "").replace(/[\\/]/g, "-").trim().slice(0, 180) || "Diseno";
  return {
    format: "orvupi-slides",
    version: 2,
    id: newId(),
    title: nowTitle,
    slides,
  };
}
