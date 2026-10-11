import { noticeFloor } from "./copy.mjs";
import { clipToken } from "./logo.mjs";
import { paintBackground } from "./backgrounds.mjs";
import { drawFace, fitFace, lineBox, loadFace } from "./draw.mjs";
import { BODY_FONT, headlineById } from "./headlines.mjs";
import { encodePng } from "./png.mjs";

export const BRAND_BG = Object.freeze([16, 36, 63, 255]);
export const BRAND_FG = Object.freeze([244, 247, 251, 255]);
export const FOOTER_BG = Object.freeze([7, 20, 34, 255]);
export const FOOTER_FG = Object.freeze([244, 247, 251, 255]);
export const PNG_TEXT = "";

export function contrastHex(a, b) {
  const lin = (hex) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((channel) => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
  };
  const hi = Math.max(lin(a), lin(b));
  const lo = Math.min(lin(a), lin(b));
  return (hi + 0.05) / (lo + 0.05);
}

function luma(color) {
  const lin = (channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(color[0] ?? 0) + 0.7152 * lin(color[1] ?? 0) + 0.0722 * lin(color[2] ?? 0);
}

function hexColor(hex) {
  const n = Number.parseInt(String(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

const backdropCache = new Map();
const fullBackdropCache = new Map();

function backdropStore(width, height) {
  if (width === 1080 && (height === 1080 || height === 1920)) return fullBackdropCache;
  return backdropCache;
}

function backdropOf(width, height, fill, backgroundId) {
  const key = `${width}x${height}|${backgroundId || ""}|${fill[0]},${fill[1]},${fill[2]}`;
  const store = backdropStore(width, height);
  const cached = store.get(key);
  if (cached) {
    store.delete(key);
    store.set(key, cached);
    return new Uint8ClampedArray(cached);
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  fillRect(rgba, width, height, 0, 0, width, height, fill);
  if (backgroundId) paintBackground(rgba, width, height, backgroundId);
  const limit = store === fullBackdropCache ? 32 : 8;
  if (store.size >= limit) store.delete(store.keys().next().value);
  store.set(key, new Uint8ClampedArray(rgba));
  return rgba;
}

async function breathe(options) {
  if (!options?.preview && !options?.cooperative) return;
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (typeof options.alive === "function" && !options.alive()) {
    const error = new Error("cancelled");
    error.name = "AbortError";
    throw error;
  }
}

function createPace(options) {
  if (!options?.slice) return null;
  let stamp = 0;
  return () => {
    const now = globalThis.performance?.now?.() ?? Date.now();
    if (stamp && now - stamp < 12) return null;
    stamp = now;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        stamp = globalThis.performance?.now?.() ?? Date.now();
        if (typeof options.alive === "function" && !options.alive()) {
          const error = new Error("cancelled");
          error.name = "AbortError";
          reject(error);
          return;
        }
        resolve();
      }, 0);
    });
  };
}

function fillRect(rgba, width, height, x, y, w, h, color) {
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
      rgba[i + 3] = 255;
    }
  }
}

function zoneOf(spec, width, height, limitBottom, limitTop = 0) {
  const x = spec.x * width;
  const w = spec.w * width;
  let y = spec.y * height;
  let h = spec.h * height;
  if (y < limitTop) {
    h -= limitTop - y;
    y = limitTop;
  }
  if (h < 0) h = 0;
  if (y >= limitBottom) return { x, y: limitBottom, w, h: 0 };
  if (y + h > limitBottom) h = limitBottom - y;
  return { x, y, w, h };
}

function blit(rgba, width, height, zone, image) {
  if (!image || zone.w < 2 || zone.h < 2) return;
  const scale = Math.min(zone.w / image.width, zone.h / image.height);
  const w = Math.max(1, Math.floor(image.width * scale));
  const h = Math.max(1, Math.floor(image.height * scale));
  const x = Math.floor(zone.x + (zone.w - w) / 2);
  const y = Math.floor(zone.y + (zone.h - h) / 2);
  for (let yy = 0; yy < h; yy += 1) {
    const sy = Math.min(image.height - 1, Math.floor((yy * image.height) / h));
    for (let xx = 0; xx < w; xx += 1) {
      const sx = Math.min(image.width - 1, Math.floor((xx * image.width) / w));
      const dx = x + xx;
      const dy = y + yy;
      if (dx < 0 || dy < 0 || dx >= width || dy >= height) continue;
      const si = (sy * image.width + sx) * 4;
      const di = (dy * width + dx) * 4;
      const alpha = (image.rgba[si + 3] ?? 255) / 255;
      if (alpha <= 0) continue;
      if (alpha >= 1) {
        rgba[di] = image.rgba[si] ?? 0;
        rgba[di + 1] = image.rgba[si + 1] ?? 0;
        rgba[di + 2] = image.rgba[si + 2] ?? 0;
        rgba[di + 3] = 255;
        continue;
      }
      for (let c = 0; c < 3; c += 1) {
        rgba[di + c] = Math.round((rgba[di + c] ?? 0) * (1 - alpha) + (image.rgba[si + c] ?? 0) * alpha);
      }
      rgba[di + 3] = 255;
    }
  }
}

function titleStyle(id, ink) {
  const dark = luma(ink) < 0.45;
  const paper = [255, 255, 255];
  const night = [12, 8, 16];
  if (id === "comic") {
    return dark
      ? { fill: [20, 6, 12], stroke: [255, 225, 74], strokeWidth: 0.11 }
      : { fill: [255, 225, 74], stroke: night, strokeWidth: 0.11 };
  }
  if (id === "neon") {
    return {
      fill: paper,
      stroke: [18, 6, 32],
      strokeWidth: 0.045,
      glow: [40, 255, 210],
      glow2: [176, 120, 255],
      glowRadius: 0.16,
      glowAlpha: 0.85,
    };
  }
  if (id === "pixel") return { fill: dark ? ink : paper, shadow: 0.07, shadowAlpha: 1 };
  if (id === "bold") return { fill: dark ? ink : paper, shadow: 0.08, shadowAlpha: 0.85 };
  return dark
    ? { fill: night, stroke: paper, strokeWidth: 0.09 }
    : { fill: paper, stroke: night, strokeWidth: 0.09 };
}

function decoRatio(style) {
  return Math.max(style.strokeWidth ?? 0, style.glowRadius ?? 0, style.shadow ?? 0);
}

async function placeText(rgba, width, height, font, fit, zone, role, glyphs, style, pace) {
  if (!fit.lines.length || zone.h < 4) return;
  const metrics = lineBox(font, fit.size);
  await drawFace(rgba, width, height, font, fit.lines, zone.x, zone.y + metrics.ascent, fit.size, role, glyphs, style, pace);
}

export async function renderCard(options) {
  const width = options.width;
  const height = options.height;
  const pace = createPace(options);
  const lang = options.lang === "en" ? "en" : "es";
  const fill = hexColor(options.fill ?? "#0a090d");
  const ink = hexColor(options.ink ?? "#fff3f5");
  const rgba = backdropOf(width, height, fill, options.backgroundId);
  await breathe(options);

  const headline = headlineById(options.headline);
  const [bodyFont, titleFont] = await Promise.all([
    loadFace(BODY_FONT),
    loadFace(headline.file),
  ]);
  const tokenText = clipToken(options.token ?? "");
  const minInk = noticeFloor(height);
  const contentBottom = height;
  const titleClear = Math.ceil(height * 0.078);

  const zones = options.zones ?? {
    title: { x: 0.05, y: 0.08, w: 0.9, h: 0.3 },
    body: { x: 0.05, y: 0.4, w: 0.5, h: 0.38 },
    avatar: { x: 0.5, y: 0.36, w: 0.46, h: 0.52 },
  };
  const titleZone = zoneOf(zones.title, width, height, contentBottom, titleClear);
  const bodyZone = zoneOf(zones.body, width, height, contentBottom, 0);
  const avatarZone = zoneOf(zones.avatar, width, height, contentBottom, 0);
  const tokenBand = tokenText ? Math.ceil(Math.max(18, height * 0.045)) : 0;
  const imageZone = tokenBand > 0 && avatarZone.h > tokenBand + 4
    ? { x: avatarZone.x, y: avatarZone.y, w: avatarZone.w, h: avatarZone.h - tokenBand }
    : avatarZone;
  const tokenZone = imageZone.h < avatarZone.h
    ? { x: avatarZone.x, y: imageZone.y + imageZone.h, w: avatarZone.w, h: avatarZone.h - imageZone.h }
    : { x: avatarZone.x, y: avatarZone.y, w: avatarZone.w, h: 0 };
  blit(rgba, width, height, imageZone, options.avatar ?? null);

  const glyphs = [];
  const inkRgb = [ink[0], ink[1], ink[2]];
  const titleLook = titleStyle(headline.id, inkRgb);
  const titleFit = fitFace(
    titleFont,
    options.title ?? "",
    titleZone,
    Math.max(minInk, height * 0.16),
    Math.max(22, Math.round(height * 0.045)),
    { wholeWords: true },
  );
  const bodyFit = fitFace(bodyFont, options.body ?? "", bodyZone, Math.max(18, height * 0.04), Math.max(14, Math.round(height * 0.02)));
  const tokenFit = fitFace(bodyFont, tokenText, tokenZone, Math.max(14, Math.round(height * 0.028)), 12);
  await placeText(rgba, width, height, titleFont, titleFit, titleZone, "title", glyphs, titleLook, pace);
  await breathe(options);
  await placeText(rgba, width, height, bodyFont, bodyFit, bodyZone, "body", glyphs, { fill: inkRgb, shadow: 0.05, shadowAlpha: 0.75 }, pace);
  await breathe(options);
  await placeText(rgba, width, height, bodyFont, tokenFit, tokenZone, "token", glyphs, { fill: inkRgb }, pace);

  const png = options.png === false ? new Uint8Array() : await encodePng(rgba, width, height, "");
  return {
    rgba,
    png,
    width,
    height,
    lang,
    texts: [options.title ?? "", options.body ?? "", tokenText].filter((item) => item !== ""),
    glyphs,
    fits: titleFit.fits && bodyFit.fits && tokenFit.fits,
    brandFontSize: 0,
    noticeFontSize: 0,
    noticeInk: 0,
    noticeText: "",
    noticeLines: 0,
    brandTop: height,
    footerTop: height,
    noticeTop: height,
    aiTop: height,
    topBand: 0,
    contentBottom,
    watermarkAlpha: 0,
    watermarkColor: [0, 0, 0],
    watermarkPlate: [0, 0, 0],
    watermarkBox: { x: 0, y: 0, w: 0, h: 0 },
    labelBox: null,
    headline: headline.id,
    fill,
    ink,
    label: "",
  };
}
