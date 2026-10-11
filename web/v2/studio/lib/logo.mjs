/** Logo elegido en el navegador. No sale del dispositivo. */

import { INVISIBLE_CHARS } from "./filter.mjs";
import { assertPngInflate, decodePng, pngHeader } from "./png.mjs";

export const DEFAULT_TOKEN = "STUBX";
export const TOKEN_MAX = 20;
export const LOGO_MAX_BYTES = 8_000_000;
export const LOGO_MAX_EDGE = 2048;
export const LOGO_HARD_EDGE = 4096;
export const LOGO_MAX_PIXELS = 16_777_216;
export const LOGO_DRAW_EDGE = 512;

export function clipToken(value) {
  return String(value ?? "").normalize("NFKC").replace(INVISIBLE_CHARS, "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, TOKEN_MAX);
}

export function isStubxToken(value) {
  return clipToken(value).toLowerCase() === "stubx";
}

/** Una carga de logo. cancel() invalida el ticket y aborta la lectura en curso. */
export function createLogoGate() {
  let ticket = 0;
  let controller = null;
  function invalidate() {
    ticket += 1;
    controller?.abort();
    controller = null;
  }
  return {
    begin() {
      invalidate();
      const current = ticket;
      controller = new AbortController();
      const signal = controller.signal;
      return {
        signal,
        stillCurrent() {
          return ticket === current;
        },
      };
    },
    cancel() {
      invalidate();
    },
  };
}

let imageSerial = 0;

/** Cada carga recibe un número nuevo. La misma imagen conserva el suyo. */
export function stampImage(image) {
  if (!image?.rgba) return image;
  if (!image.stamp) {
    imageSerial += 1;
    image.stamp = imageSerial;
  }
  return image;
}

export function avatarKey(image) {
  if (!image?.rgba || !image.stamp) return "";
  return `${image.stamp}:${image.width}x${image.height}:${image.rgba.length}`;
}

export function mascotCacheMark({ customLogo, stubx, avatarId, loaded }) {
  if (customLogo) return "logo";
  if (!stubx) return "off";
  if (!avatarId) return "empty";
  return loaded ? "ready" : "wait";
}

export function mayCacheCard(mark) {
  return mark !== "wait";
}

export function fitLogo(image, edge) {
  const limit = Math.max(1, edge);
  if (image.width <= limit && image.height <= limit) return image;
  const scale = limit / Math.max(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(image.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(image.width - 1, Math.floor(x / scale));
      const si = (sy * image.width + sx) * 4;
      const di = (y * width + x) * 4;
      rgba[di] = image.rgba[si] ?? 0;
      rgba[di + 1] = image.rgba[si + 1] ?? 0;
      rgba[di + 2] = image.rgba[si + 2] ?? 0;
      rgba[di + 3] = image.rgba[si + 3] ?? 255;
    }
  }
  return { width, height, rgba };
}

function ascii(bytes, start, length) {
  let text = "";
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(bytes[start + i] ?? 0);
  return text;
}

function fitEdge(width, height, edge) {
  const long = Math.max(width, height);
  const scale = long > edge ? edge / long : 1;
  return {
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
  };
}

function orientedSize(width, height, orientation) {
  if (orientation >= 5 && orientation <= 8) return { width: height, height: width };
  return { width, height };
}

function exifOrientation(segment) {
  if (segment.length < 16 || ascii(segment, 0, 4) !== "Exif") return 0;
  const tiff = 6;
  const little = segment[tiff] === 0x49 && segment[tiff + 1] === 0x49;
  const big = segment[tiff] === 0x4d && segment[tiff + 1] === 0x4d;
  if ((!little && !big) || segment.length < tiff + 8) return 0;
  const view = new DataView(segment.buffer, segment.byteOffset + tiff, segment.byteLength - tiff);
  const u16 = (offset) => view.getUint16(offset, little);
  const u32 = (offset) => view.getUint32(offset, little);
  if (u16(2) !== 42) return 0;
  const ifd = u32(4);
  if (ifd + 2 > view.byteLength) return 0;
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return 0;
    if (u16(entry) === 0x0112) return u16(entry + 8);
  }
  return 0;
}

function jpegInfo(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("logo");
  let offset = 2;
  let width = 0;
  let height = 0;
  let orientation = 1;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("logo");
    let marker = bytes[offset + 1];
    offset += 2;
    while (marker === 0xff && offset < bytes.length) {
      marker = bytes[offset];
      offset += 1;
    }
    if (marker === 0xd9) break;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) throw new Error("logo");
    const size = (bytes[offset] << 8) | bytes[offset + 1];
    if (size < 2 || offset + size > bytes.length) throw new Error("logo");
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) {
      if (size < 8) throw new Error("logo");
      height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      width = (bytes[offset + 5] << 8) | bytes[offset + 6];
    } else if (marker === 0xe1) {
      const found = exifOrientation(bytes.subarray(offset + 2, offset + size));
      if (found >= 1 && found <= 8) orientation = found;
    }
    offset += size;
  }
  if (width < 1 || height < 1) throw new Error("logo");
  return { width, height, orientation };
}

function webpInfo(bytes) {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") throw new Error("logo");
  const kind = ascii(bytes, 12, 4);
  if (kind === "VP8X") {
    return {
      width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
      height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
    };
  }
  if (kind === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  throw new Error("logo");
}

function sniffLogo(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  return "other";
}

function withinHardEdge(width, height) {
  if (width < 1 || height < 1 || width > LOGO_HARD_EDGE || height > LOGO_HARD_EDGE || width * height > LOGO_MAX_PIXELS) {
    throw new Error("logo-size");
  }
}

export function rejectsWithoutResize(width, height, canResize) {
  return !canResize && (width > LOGO_MAX_EDGE || height > LOGO_MAX_EDGE);
}

export async function inspectLogo(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error("logo");
  if (bytes.length > LOGO_MAX_BYTES) throw new Error("logo-bytes");
  const kind = sniffLogo(bytes);
  if (kind === "other") throw new Error("logo-format");
  if (kind === "png") {
    let header;
    try {
      header = pngHeader(bytes);
    } catch {
      throw new Error("logo");
    }
    withinHardEdge(header.width, header.height);
    try {
      await assertPngInflate(bytes);
    } catch (error) {
      if (error?.message === "PNG demasiado grande") throw new Error("logo-size");
      throw new Error("logo");
    }
    const fitted = fitEdge(header.width, header.height, LOGO_MAX_EDGE);
    const simplePng = header.depth === 8 && header.interlace === 0 && (header.color === 2 || header.color === 6);
    return { mime: "image/png", width: header.width, height: header.height, simplePng, ...fitted };
  }
  try {
    const info = kind === "jpeg" ? jpegInfo(bytes) : webpInfo(bytes);
    const oriented = kind === "jpeg" ? orientedSize(info.width, info.height, info.orientation) : info;
    withinHardEdge(oriented.width, oriented.height);
    return {
      mime: kind === "jpeg" ? "image/jpeg" : "image/webp",
      width: oriented.width,
      height: oriented.height,
      simplePng: false,
      ...fitEdge(oriented.width, oriented.height, LOGO_MAX_EDGE),
    };
  } catch (error) {
    if (error?.message === "logo-size") throw error;
    throw new Error("logo");
  }
}

function drawCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const RESIZE_PROBE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 18, 73, 68, 65, 84, 120, 156, 99, 56, 193, 197, 117, 130, 139, 139, 1, 66, 1, 0, 27, 22, 3, 113, 73, 128, 206, 212, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
let resizeKnown;

async function bitmapCanResize() {
  if (resizeKnown !== undefined) return resizeKnown;
  if (typeof createImageBitmap !== "function") {
    resizeKnown = false;
    return false;
  }
  try {
    const blob = new Blob([RESIZE_PROBE], { type: "image/png" });
    const bitmap = await createImageBitmap(blob, { resizeWidth: 1, resizeHeight: 1 });
    resizeKnown = bitmap.width === 1 && bitmap.height === 1;
    bitmap.close?.();
  } catch {
    resizeKnown = false;
  }
  return resizeKnown;
}

async function logoFromBitmap(bytes, plan) {
  const canResize = await bitmapCanResize();
  if (rejectsWithoutResize(plan.width, plan.height, canResize)) throw new Error("logo-scale");
  const blob = new Blob([bytes], { type: plan.mime });
  const options = {
    imageOrientation: "from-image",
    premultiplyAlpha: "none",
  };
  if (canResize) {
    options.resizeWidth = plan.resizeWidth;
    options.resizeHeight = plan.resizeHeight;
    options.resizeQuality = "high";
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, options);
  } catch {
    throw new Error("logo");
  }
  try {
    if (bitmap.width > LOGO_MAX_EDGE || bitmap.height > LOGO_MAX_EDGE) throw new Error("logo-scale");
    const canvas = drawCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return fitLogo({ width: bitmap.width, height: bitmap.height, rgba: data.data }, LOGO_DRAW_EDGE);
  } finally {
    bitmap.close?.();
  }
}

export async function readLogoPng(bytes) {
  const plan = await inspectLogo(bytes);
  if (typeof createImageBitmap === "function") return stampImage(await logoFromBitmap(bytes, plan));
  if (plan.simplePng) {
    const image = await decodePng(bytes, LOGO_HARD_EDGE);
    return stampImage(fitLogo(image, LOGO_DRAW_EDGE));
  }
  throw new Error("logo");
}
