/** Paquete local orvupi-design. Lleva las imágenes. Las fuentes OFL van con la aplicación. */

import { exportProject, importProject, uid } from "./document.mjs";

export const PACKAGE_FORMAT = "orvupi-design";
export const PACKAGE_VERSION = 1;
export const FONT_NOTICE = "Las fuentes OFL (Anton, Bangers, Archivo Black, Silkscreen, Audiowide, Barlow Condensed y Saira ExtraCondensed) viajan con la aplicacion Studio. Este paquete no incluye esos archivos. Otro programa puede sustituirlas por una sans condensada. Silkscreen puede sustituirse por una monoespaciada.";

const FONT_FILES = [
  { id: "anton", file: "Anton-Regular.ttf" },
  { id: "bangers", file: "Bangers-Regular.ttf" },
  { id: "archivo", file: "ArchivoBlack-Regular.ttf" },
  { id: "silkscreen", file: "Silkscreen-Bold.ttf" },
  { id: "audiowide", file: "Audiowide-Regular.ttf" },
  { id: "barlow", file: "BarlowCondensed-SemiBold.ttf" },
  { id: "saira", file: "SairaExtraCondensed-SemiBold.ttf" },
];

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let index = 0; index < data.length; index += chunk) {
    binary += String.fromCharCode(...data.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function userImageIds(doc) {
  const ids = [];
  const bags = [doc?.layers, ...(Array.isArray(doc?.meta?.pages) ? doc.meta.pages : [])];
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const layer of bag) {
      if (layer?.src?.kind === "user" && layer.src.id && !ids.includes(layer.src.id)) ids.push(layer.src.id);
    }
  }
  return ids;
}

export function packDesign(doc, images = []) {
  const byId = new Map(images.map((image) => [image.id, image]));
  const packed = [];
  const missing = [];
  for (const id of userImageIds(doc)) {
    const image = byId.get(id);
    if (!image?.rgba || !image.width || !image.height) {
      missing.push(id);
      continue;
    }
    packed.push({
      id,
      width: image.width,
      height: image.height,
      rgba: bytesToBase64(image.rgba),
    });
  }
  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    document: exportProject(doc),
    images: packed,
    missing,
    fonts: FONT_FILES.map((font) => ({ id: font.id, file: font.file, embedded: false })),
    fontNotice: FONT_NOTICE,
  };
}

export function unpackDesign(input, options = {}) {
  let data = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error("paquete-invalido");
    }
  }
  if (!data || data.format !== PACKAGE_FORMAT || data.version !== PACKAGE_VERSION || !data.document) {
    throw new Error("paquete-invalido");
  }
  const doc = importProject(data.document);
  if (options.keepId !== true) {
    doc.id = uid("proj");
    doc.meta.revision = 0;
    doc.meta.workFileId = "";
  }
  const images = new Map();
  for (const image of Array.isArray(data.images) ? data.images : []) {
    if (!image?.id || !image.rgba) continue;
    const rgba = base64ToBytes(image.rgba);
    images.set(String(image.id), {
      width: Number(image.width) || 0,
      height: Number(image.height) || 0,
      rgba,
    });
  }
  return {
    doc,
    images,
    missing: Array.isArray(data.missing) ? data.missing.map(String) : [],
    fontNotice: typeof data.fontNotice === "string" ? data.fontNotice : FONT_NOTICE,
  };
}
