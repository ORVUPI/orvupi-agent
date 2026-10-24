/** Documento de diseño ORVUPI Studio, versión 2. Código MIT. */

import { exportAllowed } from "./filter.mjs";

export const DOC_VERSION = 2;

export const FORMATS = {
  square: { id: "square", width: 1080, height: 1080 },
  story: { id: "story", width: 1080, height: 1920 },
  x: { id: "x", width: 1600, height: 900 },
  tiktok: { id: "tiktok", width: 1080, height: 1920 },
};

export const EDGE = { min: 64, max: 2048 };

export const PRESETS = [
  { id: "square", es: "Publicación", en: "Post", width: 1080, height: 1080, ratio: "1:1" },
  { id: "story", es: "Historia", en: "Story", width: 1080, height: 1920, ratio: "9:16" },
  { id: "x", es: "X", en: "X", width: 1600, height: 900, ratio: "16:9" },
  { id: "tiktok", es: "TikTok", en: "TikTok", width: 1080, height: 1920, ratio: "9:16" },
  { id: "ig", es: "Post vertical", en: "Vertical post", width: 1080, height: 1350, ratio: "4:5" },
  { id: "fb", es: "Post horizontal", en: "Landscape post", width: 1200, height: 630, ratio: "1.91:1" },
  { id: "li", es: "Post profesional", en: "Professional post", width: 1200, height: 627, ratio: "1.91:1" },
  { id: "thumb", es: "Miniatura", en: "Thumbnail", width: 1280, height: 720, ratio: "16:9" },
  { id: "bio", es: "Enlace en la bio", en: "Bio link", width: 1080, height: 1920, ratio: "9:16" },
  { id: "deck", es: "Presentación", en: "Presentation", width: 1920, height: 1080, ratio: "16:9" },
  { id: "video", es: "Vídeo horizontal", en: "Landscape video", width: 1920, height: 1080, ratio: "16:9" },
  { id: "doc", es: "Documento", en: "Document", width: 794, height: 1123, ratio: "A4" },
  { id: "cv", es: "Currículum", en: "Resume", width: 794, height: 1123, ratio: "A4" },
  { id: "email", es: "Correo", en: "Email", width: 640, height: 960, ratio: "2:3" },
  { id: "sheet", es: "Hoja", en: "Sheet", width: 1080, height: 1080, ratio: "1:1" },
  { id: "flyer", es: "Flyer", en: "Flyer", width: 816, height: 1056, ratio: "carta" },
  { id: "poster", es: "Cartel", en: "Poster", width: 1080, height: 1440, ratio: "3:4" },
  { id: "invite", es: "Invitación", en: "Invitation", width: 750, height: 1050, ratio: "5:7" },
  { id: "trifold", es: "Folleto", en: "Trifold", width: 1080, height: 630, ratio: "tríptico" },
  { id: "card", es: "Tarjeta", en: "Card", width: 1050, height: 600, ratio: "1.75:1" },
  { id: "info", es: "Infografía", en: "Infographic", width: 800, height: 2000, ratio: "1:2.5" },
  { id: "logo", es: "Logo", en: "Logo", width: 1080, height: 1080, ratio: "1:1" },
  { id: "board", es: "Pizarra", en: "Whiteboard", width: 1920, height: 1080, ratio: "16:9" },
  { id: "web", es: "Sitio", en: "Website", width: 1280, height: 1800, ratio: "página" },
  { id: "collage", es: "Collage", en: "Collage", width: 1080, height: 1080, ratio: "1:1" },
  { id: "code", es: "Pieza de código", en: "Code piece", width: 1080, height: 1080, ratio: "1:1" },
];

export const SHELLS = ["design", "doc", "deck", "video", "print", "whiteboard", "web"];

export function shellForFormat(id) {
  const map = {
    doc: "doc",
    email: "doc",
    deck: "deck",
    video: "video",
    board: "whiteboard",
    web: "web",
    cv: "print",
    poster: "print",
    flyer: "print",
    invite: "print",
    info: "print",
    trifold: "print",
    card: "print",
    logo: "print",
  };
  return map[id] || "design";
}

export function makeFormat(source) {
  const id = String(source?.id || "custom");
  const known = PRESETS.find((item) => item.id === id);
  const width = clamp(Math.round(num(source?.width, known?.width ?? 1080)), EDGE.min, EDGE.max);
  const height = clamp(Math.round(num(source?.height, known?.height ?? 1080)), EDGE.min, EDGE.max);
  return { id: known ? known.id : "custom", width, height };
}

export const BRAND = {
  pink: "#FF3070",
  cream: "#FFF8EC",
  navy: "#102032",
};

export const FONTS = [
  { id: "anton", file: "Anton-Regular.ttf", css: '"Studio Anton", sans-serif', es: "Anton", en: "Anton" },
  { id: "bangers", file: "Bangers-Regular.ttf", css: '"Studio Bangers", sans-serif', es: "Bangers", en: "Bangers" },
  { id: "archivo", file: "ArchivoBlack-Regular.ttf", css: '"Studio Archivo", sans-serif', es: "Archivo Black", en: "Archivo Black" },
  { id: "silkscreen", file: "Silkscreen-Bold.ttf", css: '"Studio Pixel", sans-serif', es: "Silkscreen", en: "Silkscreen" },
  { id: "audiowide", file: "Audiowide-Regular.ttf", css: '"Studio Audiowide", sans-serif', es: "Audiowide", en: "Audiowide" },
  { id: "barlow", file: "BarlowCondensed-SemiBold.ttf", css: '"Studio Barlow", sans-serif', es: "Barlow Condensed", en: "Barlow Condensed" },
  { id: "saira", file: "SairaExtraCondensed-SemiBold.ttf", css: '"Studio Saira", sans-serif', es: "Saira ExtraCondensed", en: "Saira ExtraCondensed" },
];

export function fontById(id) {
  return FONTS.find((item) => item.id === id) ?? FONTS.find((item) => item.id === "barlow");
}

export function uid(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createDocument(spec = {}) {
  const format = makeFormat(spec.format);
  const now = new Date().toISOString();
  return {
    v: DOC_VERSION,
    id: spec.id || uid("proj"),
    name: String(spec.name || "Sin título").slice(0, 80),
    createdAt: spec.createdAt || now,
    updatedAt: spec.updatedAt || now,
    format,
    templateId: String(spec.templateId || ""),
    background: normalizeBackground(spec.background),
    layers: Array.isArray(spec.layers) ? spec.layers.map(normalizeLayer) : [],
    meta: normalizeMeta(spec.meta, format.id),
  };
}

function normalizeShell(value) {
  return SHELLS.includes(value) ? value : "";
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) return [];
  return pages.slice(0, 8).map((page) => (Array.isArray(page) ? page.slice(0, 48).map(normalizeLayer) : []));
}

function normalizeMeta(meta, formatId) {
  const shell = normalizeShell(meta?.shell) || shellForFormat(formatId);
  const page = Math.max(0, Math.round(num(meta?.page, 0)));
  return {
    locale: meta?.locale === "en" ? "en" : "es",
    useTags: Array.isArray(meta?.useTags) ? meta.useTags.map(String).slice(0, 8) : [],
    optionalLabel: String(meta?.optionalLabel || "").slice(0, 40),
    shell,
    page,
    note: String(meta?.note || "").slice(0, 2000),
    pages: normalizePages(meta?.pages),
  };
}

export function blankDocument(formatId, custom) {
  const known = PRESETS.find((item) => item.id === formatId);
  const format = known
    ? { id: known.id, width: known.width, height: known.height }
    : makeFormat({ id: "custom", width: custom?.width, height: custom?.height });
  const names = {
    square: "Publicación en blanco",
    story: "Historia en blanco",
    x: "Pieza para X",
    tiktok: "Pieza para TikTok",
    custom: "Lienzo en blanco",
  };
  return createDocument({
    name: names[format.id] || `${known?.es || "Lienzo"} en blanco`,
    format,
    background: { type: "solid", fill: format.id === "board" ? "#f4f7fb" : BRAND.cream },
    layers: [],
    meta: { locale: "es", useTags: [], optionalLabel: "", shell: shellForFormat(format.id) },
  });
}

export function textLayer(spec = {}) {
  return normalizeLayer({
    id: spec.id,
    type: "text",
    name: spec.name || "Texto",
    x: spec.x,
    y: spec.y,
    w: spec.w,
    h: spec.h,
    rotation: spec.rotation,
    opacity: spec.opacity,
    locked: spec.locked,
    visible: spec.visible,
    z: spec.z,
    props: {
      text: spec.text ?? spec.props?.text ?? "Texto",
      fontId: spec.fontId || spec.props?.fontId || "barlow",
      size: spec.size ?? spec.props?.size ?? 48,
      color: spec.color || spec.props?.color || BRAND.navy,
      align: spec.align || spec.props?.align || "left",
      lineHeight: spec.lineHeight ?? spec.props?.lineHeight ?? 1.15,
    },
  });
}

export function imageLayer(spec = {}) {
  return normalizeLayer({
    id: spec.id,
    type: "image",
    name: spec.name || "Imagen",
    x: spec.x,
    y: spec.y,
    w: spec.w,
    h: spec.h,
    rotation: spec.rotation,
    opacity: spec.opacity,
    locked: spec.locked,
    visible: spec.visible,
    z: spec.z,
    src: spec.src || { kind: "catalog", id: "orvupi-avatar" },
    crop: spec.crop || null,
  });
}

export function rectLayer(spec = {}) {
  return normalizeLayer({
    id: spec.id,
    type: "rect",
    name: spec.name || "Forma",
    x: spec.x,
    y: spec.y,
    w: spec.w,
    h: spec.h,
    rotation: spec.rotation,
    opacity: spec.opacity,
    locked: spec.locked,
    visible: spec.visible,
    z: spec.z,
    groupId: spec.groupId,
    props: {
      fill: spec.fill ?? spec.props?.fill ?? BRAND.pink,
      stroke: spec.stroke ?? spec.props?.stroke ?? "",
      strokeWidth: spec.strokeWidth ?? spec.props?.strokeWidth ?? 0,
    },
  });
}

export function lineLayer(spec = {}) {
  return normalizeLayer({
    id: spec.id,
    type: "line",
    name: spec.name || "Línea",
    x: spec.x,
    y: spec.y,
    w: spec.w,
    h: spec.h,
    rotation: spec.rotation,
    opacity: spec.opacity,
    locked: spec.locked,
    visible: spec.visible,
    z: spec.z,
    groupId: spec.groupId,
    props: {
      color: spec.color || spec.props?.color || BRAND.navy,
      strokeWidth: spec.strokeWidth ?? spec.props?.strokeWidth ?? 8,
    },
  });
}

function normalizeBackground(background) {
  const fill = typeof background?.fill === "string" ? background.fill : BRAND.navy;
  const type = background?.type === "catalog" || background?.type === "user" ? background.type : "solid";
  return {
    type,
    catalogId: type === "catalog" ? String(background.catalogId || "") : "",
    fill,
  };
}

function normalizeLayer(layer) {
  const raw = layer?.type === "shape" ? "rect" : layer?.type;
  const type = raw === "image" || raw === "rect" || raw === "line" || raw === "text" ? raw : "text";
  const base = {
    id: typeof layer?.id === "string" && layer.id ? layer.id : uid("ly"),
    type,
    name: String(layer?.name || (type === "text" ? "Texto" : type === "image" ? "Imagen" : type === "line" ? "Línea" : "Forma")).slice(0, 40),
    x: num(layer?.x, 48),
    y: num(layer?.y, 48),
    w: Math.max(8, num(layer?.w, type === "line" ? 360 : 320)),
    h: Math.max(type === "line" ? 2 : 8, num(layer?.h, type === "line" ? 12 : 120)),
    rotation: num(layer?.rotation, 0),
    opacity: clamp(num(layer?.opacity, 1), 0, 1),
    locked: Boolean(layer?.locked),
    visible: layer?.visible !== false,
    z: Math.round(num(layer?.z, 1)),
    groupId: typeof layer?.groupId === "string" ? layer.groupId.slice(0, 80) : "",
  };
  if (type === "text") {
    const props = layer?.props || {};
    base.props = {
      text: String(props.text ?? "").slice(0, 2000),
      fontId: fontById(props.fontId).id,
      size: clamp(num(props.size, 48), 8, 400),
      color: typeof props.color === "string" ? props.color : BRAND.navy,
      align: props.align === "center" || props.align === "right" ? props.align : "left",
      lineHeight: clamp(num(props.lineHeight, 1.15), 0.8, 3),
    };
  } else if (type === "image") {
    const src = layer?.src || {};
    base.src = {
      kind: src.kind === "user" ? "user" : "catalog",
      id: String(src.id || "orvupi-avatar"),
    };
    const crop = layer?.crop;
    base.crop = crop && Number.isFinite(Number(crop.w)) && Number.isFinite(Number(crop.h))
      ? { x: num(crop.x, 0), y: num(crop.y, 0), w: Math.max(1, num(crop.w, 1)), h: Math.max(1, num(crop.h, 1)) }
      : null;
  } else if (type === "line") {
    const props = layer?.props || {};
    base.props = {
      color: typeof props.color === "string" ? props.color : BRAND.navy,
      strokeWidth: Math.max(2, num(props.strokeWidth, base.h)),
    };
  } else {
    const props = layer?.props || {};
    base.props = {
      fill: typeof props.fill === "string" ? props.fill : BRAND.pink,
      stroke: typeof props.stroke === "string" ? props.stroke : "",
      strokeWidth: Math.max(0, num(props.strokeWidth, 0)),
    };
  }
  return base;
}

export function cloneDocument(doc) {
  return importProject(JSON.parse(JSON.stringify(exportProject(doc))));
}

export function orderedLayers(doc) {
  return [...(doc?.layers || [])].sort((a, b) => a.z - b.z || String(a.id).localeCompare(String(b.id)));
}

export function bringForward(doc, id) {
  const list = orderedLayers(doc);
  const index = list.findIndex((layer) => layer.id === id);
  if (index < 0 || index === list.length - 1) return doc;
  const current = list[index];
  const above = list[index + 1];
  if (above.z === current.z) current.z = above.z + 1;
  else {
    const z = current.z;
    current.z = above.z;
    above.z = z;
  }
  return doc;
}

export function sendBackward(doc, id) {
  const list = orderedLayers(doc);
  const index = list.findIndex((layer) => layer.id === id);
  if (index <= 0) return doc;
  const current = list[index];
  const below = list[index - 1];
  if (below.z === current.z) current.z = below.z - 1;
  else {
    const z = current.z;
    current.z = below.z;
    below.z = z;
  }
  return doc;
}

export function duplicateLayer(doc, id) {
  const layer = doc.layers.find((item) => item.id === id);
  if (!layer) return null;
  const copy = normalizeLayer(JSON.parse(JSON.stringify(layer)));
  copy.id = uid("ly");
  copy.groupId = "";
  copy.x += 24;
  copy.y += 24;
  copy.z = Math.max(0, ...doc.layers.map((item) => item.z)) + 1;
  copy.name = `${layer.name} copia`.slice(0, 40);
  doc.layers.push(copy);
  return copy;
}

export function alignLayer(doc, id, mode) {
  const layer = doc.layers.find((item) => item.id === id);
  if (!layer || layer.locked) return doc;
  const width = doc.format.width;
  const height = doc.format.height;
  if (mode === "left") layer.x = 0;
  if (mode === "center") layer.x = Math.round((width - layer.w) / 2);
  if (mode === "right") layer.x = Math.round(width - layer.w);
  if (mode === "top") layer.y = 0;
  if (mode === "middle") layer.y = Math.round((height - layer.h) / 2);
  if (mode === "bottom") layer.y = Math.round(height - layer.h);
  return doc;
}

export function exportProject(doc) {
  const data = JSON.parse(JSON.stringify(doc));
  data.v = DOC_VERSION;
  for (const layer of data.layers || []) {
    if (layer.src) layer.src = { kind: layer.src.kind === "user" ? "user" : "catalog", id: String(layer.src.id || "") };
    if (layer.props) {
      delete layer.props.rgba;
      delete layer.props.bytes;
    }
  }
  return data;
}

export function importProject(input) {
  let data = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error("proyecto-invalido");
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("proyecto-invalido");
  if (data.v !== DOC_VERSION) throw new Error("version-desconocida");
  if (!data.format || !Number.isFinite(Number(data.format.width)) || !Number.isFinite(Number(data.format.height))) {
    throw new Error("proyecto-invalido");
  }
  if (!Array.isArray(data.layers)) throw new Error("proyecto-invalido");
  return {
    v: DOC_VERSION,
    id: typeof data.id === "string" && data.id ? data.id.slice(0, 80) : uid("proj"),
    name: String(data.name || "Sin título").slice(0, 80),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    format: makeFormat(data.format),
    templateId: String(data.templateId || ""),
    background: normalizeBackground(data.background),
    layers: data.layers.slice(0, 48).map(normalizeLayer),
    meta: normalizeMeta(data.meta, makeFormat(data.format).id),
  };
}

export function projectTexts(doc) {
  const bags = [doc?.layers || []];
  if (Array.isArray(doc?.meta?.pages)) {
    for (const page of doc.meta.pages) {
      if (Array.isArray(page) && page !== doc.layers) bags.push(page);
    }
  }
  const texts = [];
  for (const layers of bags) {
    for (const layer of layers) {
      if (layer?.type === "text" && layer.visible !== false) texts.push(String(layer.props?.text || ""));
    }
  }
  if (doc?.meta?.note) texts.push(String(doc.meta.note));
  return {
    title: texts[0] || "",
    body: texts.slice(1).join("\n"),
    label: String(doc?.meta?.optionalLabel || ""),
  };
}

export function canExport(doc) {
  const texts = projectTexts(doc);
  return exportAllowed(texts.title, texts.body, undefined, texts.label);
}

export function bringToFront(doc, id) {
  const layer = doc.layers.find((item) => item.id === id);
  if (!layer) return doc;
  layer.z = Math.max(0, ...doc.layers.map((item) => item.z)) + 1;
  return doc;
}

export function sendToBack(doc, id) {
  const layer = doc.layers.find((item) => item.id === id);
  if (!layer) return doc;
  layer.z = Math.min(...doc.layers.map((item) => item.z)) - 1;
  return doc;
}

export function reorderLayers(doc, orderedIdsTopFirst) {
  const known = new Set(doc.layers.map((layer) => layer.id));
  const ids = orderedIdsTopFirst.filter((id) => known.has(id));
  for (const layer of doc.layers) {
    if (!ids.includes(layer.id)) ids.push(layer.id);
  }
  for (let index = 0; index < ids.length; index += 1) {
    const layer = doc.layers.find((item) => item.id === ids[index]);
    if (layer) layer.z = ids.length - index;
  }
  return doc;
}

export function groupLayers(doc, ids) {
  const chosen = doc.layers.filter((layer) => ids.includes(layer.id));
  if (chosen.length < 2) return "";
  const groupId = uid("grp");
  for (const layer of chosen) layer.groupId = groupId;
  return groupId;
}

export function ungroupLayers(doc, ids) {
  const groups = new Set(doc.layers.filter((layer) => ids.includes(layer.id) && layer.groupId).map((layer) => layer.groupId));
  for (const layer of doc.layers) {
    if (groups.has(layer.groupId)) layer.groupId = "";
  }
  return doc;
}

export function lockLayers(doc, ids, locked = true) {
  const groups = new Set();
  const direct = [];
  for (const id of ids) {
    const layer = doc.layers.find((item) => item.id === id);
    if (!layer) continue;
    if (layer.groupId) groups.add(layer.groupId);
    else direct.push(layer);
  }
  for (const layer of direct) layer.locked = Boolean(locked);
  for (const layer of doc.layers) {
    if (groups.has(layer.groupId)) layer.locked = Boolean(locked);
  }
  return doc;
}

export function duplicateLayers(doc, ids) {
  const copies = [];
  const groupId = ids.length > 1 ? uid("grp") : "";
  for (const id of ids) {
    const copy = duplicateLayer(doc, id);
    if (!copy) continue;
    if (groupId) copy.groupId = groupId;
    copies.push(copy);
  }
  return copies;
}

export function moveLayer(doc, id, dx, dy) {
  const layer = doc.layers.find((item) => item.id === id);
  if (!layer || layer.locked) return doc;
  const members = layer.groupId ? doc.layers.filter((item) => item.groupId === layer.groupId) : [layer];
  if (members.some((item) => item.locked)) return doc;
  for (const item of members) {
    item.x = Math.round(item.x + dx);
    item.y = Math.round(item.y + dy);
  }
  return doc;
}

export function alignLayers(doc, ids, mode) {
  const picked = doc.layers.filter((layer) => ids.includes(layer.id));
  if (!picked.length) return doc;
  const groups = new Set(picked.map((layer) => layer.groupId).filter(Boolean));
  const all = doc.layers.filter((layer) => ids.includes(layer.id) || (layer.groupId && groups.has(layer.groupId)));
  if (all.some((layer) => layer.locked)) return doc;
  const minX = Math.min(...all.map((layer) => layer.x));
  const minY = Math.min(...all.map((layer) => layer.y));
  const maxX = Math.max(...all.map((layer) => layer.x + layer.w));
  const maxY = Math.max(...all.map((layer) => layer.y + layer.h));
  let dx = 0;
  let dy = 0;
  if (mode === "left") dx = -minX;
  if (mode === "center") dx = Math.round((doc.format.width - (maxX - minX)) / 2) - minX;
  if (mode === "right") dx = Math.round(doc.format.width - maxX);
  if (mode === "top") dy = -minY;
  if (mode === "middle") dy = Math.round((doc.format.height - (maxY - minY)) / 2) - minY;
  if (mode === "bottom") dy = Math.round(doc.format.height - maxY);
  for (const layer of all) {
    layer.x = Math.round(layer.x + dx);
    layer.y = Math.round(layer.y + dy);
  }
  return doc;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function overlappingIds(doc, focusId) {
  const layers = (doc?.layers || []).filter((layer) => layer.visible !== false);
  if (focusId) {
    const focus = layers.find((layer) => layer.id === focusId);
    if (!focus) return [];
    return layers.filter((layer) => layer.id !== focus.id && overlaps(focus, layer)).map((layer) => layer.id);
  }
  return layers.filter((layer) => layers.some((other) => other.id !== layer.id && overlaps(layer, other))).map((layer) => layer.id);
}
