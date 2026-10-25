/** Raster del documento para PNG y JPG. Sin marca de agua ni etiqueta. */

import catalog from "../catalog.json" with { type: "json" };
import { paintBackground } from "./backgrounds.mjs";
import { paintChart } from "./chart-data.mjs";
import { PNG_COMMENT } from "./copy.mjs";
import { fontById, orderedLayers } from "./document.mjs";
import { drawFace, lineBox, loadFace, wrapFace } from "./draw.mjs";
import { photoById } from "./photos.mjs";
import { decodePng, encodePng } from "./png.mjs";
import { paintTableGrid } from "./table-data.mjs";
import { piecesOf } from "./text-style.mjs";
import { measureFont } from "./ttf.mjs";

const catalogCache = new Map();
const libraryCache = new Map();

function hexColor(hex) {
  const raw = String(hex || "").trim();
  const body = raw.startsWith("#") ? raw.slice(1) : raw;
  const full = body.length === 3 ? body.split("").map((ch) => ch + ch).join("") : body;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return [16, 32, 50, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function fillRect(rgba, width, height, x, y, w, h, color, alpha = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const i = (yy * width + xx) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = alpha;
    }
  }
}

function blend(rgba, width, x, y, color, alpha) {
  if (alpha <= 0) return;
  const i = (y * width + x) * 4;
  const keep = 1 - alpha;
  rgba[i] = Math.round((rgba[i] ?? 0) * keep + color[0] * alpha);
  rgba[i + 1] = Math.round((rgba[i + 1] ?? 0) * keep + color[1] * alpha);
  rgba[i + 2] = Math.round((rgba[i + 2] ?? 0) * keep + color[2] * alpha);
  rgba[i + 3] = 255;
}

function blitBuffer(dest, dw, dh, src, sw, sh, ox, oy, opacity) {
  for (let y = 0; y < sh; y += 1) {
    const dy = oy + y;
    if (dy < 0 || dy >= dh) continue;
    for (let x = 0; x < sw; x += 1) {
      const dx = ox + x;
      if (dx < 0 || dx >= dw) continue;
      const si = (y * sw + x) * 4;
      const alpha = ((src[si + 3] ?? 0) / 255) * opacity;
      if (alpha <= 0.004) continue;
      blend(dest, dw, dx, dy, [src[si] ?? 0, src[si + 1] ?? 0, src[si + 2] ?? 0], alpha);
    }
  }
}

function userImage(options, id) {
  const bag = options?.userImages;
  if (!bag) return null;
  const image = typeof bag.get === "function" ? bag.get(id) : bag[id];
  if (!image?.rgba || !image.width || !image.height) return null;
  return image;
}

async function loadPngFile(rel) {
  const url = new URL(`../${rel}`, import.meta.url);
  if (globalThis.process?.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(url));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(rel);
  return new Uint8Array(await response.arrayBuffer());
}

async function catalogImage(id) {
  if (catalogCache.has(id)) return catalogCache.get(id);
  const item = catalog.items.find((entry) => entry.id === id);
  if (!item?.archivo) {
    catalogCache.set(id, null);
    return null;
  }
  try {
    const image = await decodePng(await loadPngFile(item.archivo));
    catalogCache.set(id, image);
    return image;
  } catch {
    catalogCache.set(id, null);
    return null;
  }
}

async function libraryImage(id) {
  if (libraryCache.has(id)) return libraryCache.get(id);
  const item = photoById(id);
  if (!item?.archivo) {
    libraryCache.set(id, null);
    return null;
  }
  try {
    const image = await decodePng(await loadPngFile(item.archivo));
    libraryCache.set(id, image);
    return image;
  } catch {
    libraryCache.set(id, null);
    return null;
  }
}

async function paintTable(local, w, h, layer) {
  const data = paintTableGrid(local, w, h, layer.props);
  const rows = data.rows.length;
  const cols = data.rows[0]?.length || 1;
  const cellW = w / cols;
  const cellH = h / rows;
  const font = await loadFace(fontById("barlow").file);
  const size = Math.max(10, Math.min(28, Math.floor(cellH * 0.35)));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const text = String(data.rows[r][c] || "");
      if (!text) continue;
      const fake = {
        props: { text, fontId: "barlow", size, color: "#102032", align: "left", lineHeight: 1.1 },
        w: Math.max(8, cellW - 8),
        h: Math.max(8, cellH - 8),
        opacity: 1,
      };
      await paintPlainText(local, w, h, Math.round(c * cellW) + 4, Math.round(r * cellH) + 4, fake, font);
    }
  }
}

function paintImage(local, w, h, image, crop) {
  const sx0 = crop ? crop.x : 0;
  const sy0 = crop ? crop.y : 0;
  const sw = Math.max(1, crop ? crop.w : image.width);
  const sh = Math.max(1, crop ? crop.h : image.height);
  const scale = Math.max(w / sw, h / sh);
  const visW = w / scale;
  const visH = h / scale;
  const ox = sx0 + (sw - visW) / 2;
  const oy = sy0 + (sh - visH) / 2;
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(image.height - 1, Math.max(0, Math.floor(oy + (y / h) * visH)));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(image.width - 1, Math.max(0, Math.floor(ox + (x / w) * visW)));
      const si = (sy * image.width + sx) * 4;
      const di = (y * w + x) * 4;
      local[di] = image.rgba[si] ?? 0;
      local[di + 1] = image.rgba[si + 1] ?? 0;
      local[di + 2] = image.rgba[si + 2] ?? 0;
      local[di + 3] = image.rgba[si + 3] ?? 255;
    }
  }
}

function paintEllipse(local, w, h, layer) {
  const fill = layer.props?.fill ? hexColor(layer.props.fill) : null;
  const sw = Math.max(0, Math.round(layer.props?.strokeWidth || 0));
  const stroke = layer.props?.stroke && sw > 0 ? hexColor(layer.props.stroke) : null;
  const rx = w / 2;
  const ry = h / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = rx ? (x + 0.5 - rx) / rx : 0;
      const ny = ry ? (y + 0.5 - ry) / ry : 0;
      if (nx * nx + ny * ny > 1) continue;
      const innerRx = Math.max(0.001, rx - sw);
      const innerRy = Math.max(0.001, ry - sw);
      const ix = (x + 0.5 - rx) / innerRx;
      const iy = (y + 0.5 - ry) / innerRy;
      const inside = sw > 0 && ix * ix + iy * iy <= 1;
      const color = !inside && stroke ? stroke : fill;
      if (!color) continue;
      const i = (y * w + x) * 4;
      local[i] = color[0];
      local[i + 1] = color[1];
      local[i + 2] = color[2];
      local[i + 3] = 255;
    }
  }
}

function paintShape(local, w, h, layer) {
  if (layer.type === "line") {
    const color = hexColor(layer.props?.color);
    const sw = Math.max(2, Math.round(layer.props?.strokeWidth || h));
    const y0 = Math.max(0, Math.round((h - sw) / 2));
    fillRect(local, w, h, 0, y0, w, sw, color, 255);
    return;
  }
  if (layer.props?.shape === "ellipse") {
    paintEllipse(local, w, h, layer);
    return;
  }
  const fill = layer.props?.fill ? hexColor(layer.props.fill) : null;
  if (fill && layer.props.fill) fillRect(local, w, h, 0, 0, w, h, fill, 255);
  const sw = Math.max(0, Math.round(layer.props?.strokeWidth || 0));
  if (layer.props?.stroke && sw > 0) {
    const color = hexColor(layer.props.stroke);
    fillRect(local, w, h, 0, 0, w, sw, color, 255);
    fillRect(local, w, h, 0, h - sw, w, sw, color, 255);
    fillRect(local, w, h, 0, 0, sw, h, color, 255);
    fillRect(local, w, h, w - sw, 0, sw, h, color, 255);
  }
}

function textAdvance(font, size, lineHeight) {
  const metrics = lineBox(font, size);
  const leading = Number(lineHeight) || 1.15;
  if (Math.abs(leading - 1.15) < 0.001) return metrics.step;
  return size * leading;
}

async function paintPlainText(target, tw, th, originX, originY, layer, font) {
  const size = layer.props.size;
  const lines = wrapFace(font, layer.props.text, layer.w, size, true).slice(0, 24);
  if (!lines.length) return;
  const metrics = lineBox(font, size);
  const advance = textAdvance(font, size, layer.props.lineHeight);
  const style = { fill: hexColor(layer.props.color).slice(0, 3), alpha: layer.opacity ?? 1, crisp: true };
  let baseline = originY + metrics.ascent;
  for (const line of lines) {
    const measured = measureFont(font, line, size);
    let x = originX;
    if (layer.props.align === "center") x = originX + Math.max(0, (layer.w - measured) / 2);
    if (layer.props.align === "right") x = originX + Math.max(0, layer.w - measured);
    await drawFace(target, tw, th, font, [line], x, baseline, size, "text", [], style, null);
    baseline += advance;
    if (baseline > originY + layer.h) break;
  }
}

async function paintStyledText(target, tw, th, originX, originY, layer, font) {
  const parts = piecesOf(layer.props.text, layer.props.runs, layer.props);
  const lines = [];
  let line = [];
  let width = 0;
  const push = () => {
    if (line.length) lines.push(line);
    line = [];
    width = 0;
  };
  for (const part of parts) {
    for (const ch of part.text) {
      if (ch === "\n") {
        push();
        continue;
      }
      const glyph = measureFont(font, ch, part.size);
      if (width + glyph > layer.w && line.length) push();
      line.push({ ch, ...part });
      width += glyph;
    }
  }
  push();
  const size = layer.props.size;
  const metrics = lineBox(font, size);
  const advance = textAdvance(font, size, layer.props.lineHeight);
  let baseline = originY + metrics.ascent;
  for (const row of lines.slice(0, 24)) {
    const groups = [];
    for (const item of row) {
      const prev = groups[groups.length - 1];
      if (prev && prev.bold === item.bold && prev.italic === item.italic && prev.underline === item.underline && prev.color === item.color && prev.size === item.size) prev.text += item.ch;
      else groups.push({ text: item.ch, bold: item.bold, italic: item.italic, underline: item.underline, color: item.color, size: item.size });
    }
    const measured = groups.reduce((sum, group) => sum + measureFont(font, group.text, group.size), 0);
    let x = originX;
    if (layer.props.align === "center") x = originX + Math.max(0, (layer.w - measured) / 2);
    if (layer.props.align === "right") x = originX + Math.max(0, layer.w - measured);
    const lineStart = x;
    for (const group of groups) {
      const style = {
        fill: hexColor(group.color).slice(0, 3),
        alpha: layer.opacity ?? 1,
        crisp: true,
        bold: group.bold,
        italic: group.italic,
      };
      await drawFace(target, tw, th, font, [group.text], x, baseline, group.size, "text", [], style, null);
      const groupWidth = measureFont(font, group.text, group.size);
      if (group.underline) {
        const bar = Math.max(1, Math.round(group.size * 0.06));
        fillRect(target, tw, th, x, baseline + bar, groupWidth, bar, hexColor(group.color), Math.round(255 * (layer.opacity ?? 1)));
      }
      x += groupWidth;
    }
    if (groups.some((group) => group.underline) && measured === 0) fillRect(target, tw, th, lineStart, baseline + 2, 8, 1, hexColor(layer.props.color), 255);
    baseline += advance;
    if (baseline > originY + layer.h) break;
  }
}

async function paintText(target, tw, th, originX, originY, layer) {
  const font = await loadFace(fontById(layer.props.fontId).file);
  const styled = layer.props.bold || layer.props.italic || layer.props.underline || (layer.props.runs || []).length;
  if (!styled) {
    await paintPlainText(target, tw, th, originX, originY, layer, font);
    return;
  }
  await paintStyledText(target, tw, th, originX, originY, layer, font);
}

function mirrorBuffer(local, w, h, flipX, flipY) {
  if (!flipX && !flipY) return local;
  const out = new Uint8ClampedArray(local.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = flipX ? w - 1 - x : x;
      const sy = flipY ? h - 1 - y : y;
      const from = (sy * w + sx) * 4;
      const to = (y * w + x) * 4;
      out[to] = local[from];
      out[to + 1] = local[from + 1];
      out[to + 2] = local[from + 2];
      out[to + 3] = local[from + 3];
    }
  }
  return out;
}

function stamp(dest, dw, dh, layer, local) {
  const w = Math.max(1, Math.round(layer.w));
  const h = Math.max(1, Math.round(layer.h));
  local = mirrorBuffer(local, w, h, layer.flipX, layer.flipY);
  const rad = (Number(layer.rotation) || 0) * Math.PI / 180;
  const opacity = layer.opacity ?? 1;
  if (Math.abs(rad) < 0.001) {
    blitBuffer(dest, dw, dh, local, w, h, Math.round(layer.x), Math.round(layer.y), opacity);
    return;
  }
  const cx = layer.x + w / 2;
  const cy = layer.y + h / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
  const minX = Math.max(0, Math.floor(Math.min(...corners.map((point) => point[0]))));
  const maxX = Math.min(dw - 1, Math.ceil(Math.max(...corners.map((point) => point[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...corners.map((point) => point[1]))));
  const maxY = Math.min(dh - 1, Math.ceil(Math.max(...corners.map((point) => point[1]))));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cos + dy * sin + w / 2;
      const ly = -dx * sin + dy * cos + h / 2;
      const sx = Math.floor(lx);
      const sy = Math.floor(ly);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const si = (sy * w + sx) * 4;
      const alpha = ((local[si + 3] ?? 0) / 255) * opacity;
      if (alpha <= 0.004) continue;
      blend(dest, dw, x, y, [local[si] ?? 0, local[si + 1] ?? 0, local[si + 2] ?? 0], alpha);
    }
  }
}

export function jpegQuality(value) {
  const n = Number(value);
  const q = Number.isFinite(n) ? n : 0.92;
  return Math.min(0.95, Math.max(0.7, q));
}

export async function encodeJpeg(rgba, width, height, quality) {
  const q = jpegQuality(quality);
  const Offscreen = globalThis.OffscreenCanvas;
  if (typeof document === "undefined" && typeof Offscreen !== "function") throw new Error("jpeg-navegador");
  const canvas = typeof document === "undefined" ? new Offscreen(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  if (typeof canvas.convertToBlob === "function") return canvas.convertToBlob({ type: "image/jpeg", quality: q });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("jpeg-navegador"))), "image/jpeg", q);
  });
}

export async function renderDocument(doc, options = {}) {
  const width = doc.format.width;
  const height = doc.format.height;
  const rgba = new Uint8ClampedArray(width * height * 4);
  fillRect(rgba, width, height, 0, 0, width, height, hexColor(doc.background?.fill || "#102032"), 255);
  if (doc.background?.type === "catalog" && doc.background.catalogId) paintBackground(rgba, width, height, doc.background.catalogId);
  const warnings = [];
  for (const layer of orderedLayers(doc)) {
    if (layer.visible === false) continue;
    const w = Math.max(1, Math.round(layer.w));
    const h = Math.max(1, Math.round(layer.h));
    if (layer.type === "text") {
      const turned = Math.abs(Number(layer.rotation) || 0) >= 0.001 || layer.flipX || layer.flipY;
      if (!turned) {
        await paintText(rgba, width, height, layer.x, layer.y, layer);
      } else {
        const local = new Uint8ClampedArray(w * h * 4);
        fillRect(local, w, h, 0, 0, w, h, hexColor(doc.background?.fill || "#102032"), 255);
        await paintText(local, w, h, 0, 0, { ...layer, opacity: 1 });
        stamp(rgba, width, height, layer, local);
      }
      continue;
    }
    const local = new Uint8ClampedArray(w * h * 4);
    if (layer.type === "image") {
      const image = layer.src?.kind === "user"
        ? userImage(options, layer.src.id)
        : layer.src?.kind === "library"
          ? await libraryImage(layer.src.id)
          : await catalogImage(layer.src?.id);
      if (!image) {
        warnings.push(layer.src?.id || layer.id);
        fillRect(local, w, h, 0, 0, w, 4, hexColor("#FF3070"), 255);
        fillRect(local, w, h, 0, h - 4, w, 4, hexColor("#FF3070"), 255);
        fillRect(local, w, h, 0, 0, 4, h, hexColor("#FF3070"), 255);
        fillRect(local, w, h, w - 4, 0, 4, h, hexColor("#FF3070"), 255);
      } else paintImage(local, w, h, image, layer.crop);
    } else if (layer.type === "chart") {
      paintChart(local, w, h, layer.props);
    } else if (layer.type === "table") {
      await paintTable(local, w, h, layer);
    } else paintShape(local, w, h, layer);
    stamp(rgba, width, height, layer, local);
  }
  const png = await encodePng(rgba, width, height, PNG_COMMENT);
  return { rgba, png, width, height, warnings };
}
