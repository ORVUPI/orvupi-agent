import { PNG_COMMENT, WATERMARK, WATERMARK_ALPHA, aiLabel, noticeChoices, noticeFloor } from "./copy.mjs";
import { clipToken } from "./logo.mjs";
import { paintBackground } from "./backgrounds.mjs";
import { drawFace, fitFace, letterInk, lineBox, loadFace, wrapFace } from "./draw.mjs";
import { measureFont } from "./ttf.mjs";
import { BODY_FONT, NOTICE_FONT, headlineById } from "./headlines.mjs";
import { encodePng } from "./png.mjs";

export const BRAND_BG = Object.freeze([16, 36, 63, 255]);
export const BRAND_FG = Object.freeze([244, 247, 251, 255]);
export const FOOTER_BG = Object.freeze([7, 20, 34, 255]);
export const FOOTER_FG = Object.freeze([244, 247, 251, 255]);
export { WATERMARK_ALPHA };
export const PNG_TEXT = PNG_COMMENT;
const WM_TEXT = "NO OFICIAL";
const WM_PLATE = Object.freeze([7, 20, 34]);
const WM_INK = Object.freeze([244, 247, 251]);
const NOTICE_LETTERS = ["H", "N", "C", "U", "P", "M", "O"];

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

function emForLetters(font, minInk) {
  let size = Math.max(8, Math.ceil(minInk));
  const short = () => NOTICE_LETTERS.some((ch) => letterInk(font, ch, size) < minInk);
  while (size < minInk * 4 && short()) size += 1;
  return size;
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

function watermarkLayout(width, height, bodyFont) {
  const pad = Math.round(width * 0.04);
  const wmSize = Math.max(13, Math.round(Math.min(width, height) * 0.026));
  const wmWidth = measureFont(bodyFont, WM_TEXT, wmSize);
  const wmMetrics = lineBox(bodyFont, wmSize);
  const platePad = Math.max(4, Math.round(wmSize * 0.35));
  let wmX = width - pad - wmWidth;
  let plateX = Math.round(wmX - platePad);
  let plateW = Math.ceil(wmWidth + platePad * 2);
  if (plateX < 0) {
    plateX = 0;
    wmX = platePad;
  }
  if (plateX + plateW > width) {
    plateX = Math.max(0, width - plateW);
    wmX = plateX + platePad;
  }
  const plateY = Math.max(0, Math.round(height * 0.028));
  const plateH = Math.ceil(wmMetrics.ascent + wmMetrics.descent + platePad * 2);
  return {
    wmSize,
    wmX,
    wmBaseline: plateY + platePad + wmMetrics.ascent,
    plateX,
    plateY,
    plateW,
    plateH,
  };
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
  const [noticeFont, bodyFont, titleFont] = await Promise.all([
    loadFace(NOTICE_FONT),
    loadFace(BODY_FONT),
    loadFace(headline.file),
  ]);
  const pad = Math.round(width * 0.04);
  const inner = Math.max(8, width - pad * 2);
  const tokenText = clipToken(options.token ?? "");
  const minInk = noticeFloor(height);
  const noticeSize = emForLetters(noticeFont, minInk);
  const choices = noticeChoices(lang, tokenText);
  const fitsLine = (text) => measureFont(noticeFont, text, noticeSize) <= inner;
  let noticeText = choices[choices.length - 1] ?? "";
  let noticeLinesDrawn = [noticeText];
  if (choices.length > 1 && fitsLine(choices[0])) {
    noticeText = choices[0];
    noticeLinesDrawn = [noticeText];
  } else if (fitsLine(noticeText)) {
    noticeLinesDrawn = [noticeText];
  } else {
    const wrapped = wrapFace(noticeFont, noticeText, inner, noticeSize);
    noticeLinesDrawn = wrapped.length ? wrapped : [noticeText];
  }
  const noticeMetrics = lineBox(noticeFont, noticeSize);
  const padY = Math.max(2, Math.round(noticeSize * 0.16));
  const block = noticeMetrics.ascent + noticeMetrics.descent + Math.max(0, noticeLinesDrawn.length - 1) * noticeMetrics.step;
  const noticeH = Math.ceil(block + padY * 2);
  const footerTop = height - noticeH;
  const label = aiLabel(options.origins ?? [], lang);
  const aiSize = label ? Math.max(12, Math.round(Math.min(width, height) * 0.02)) : 0;
  const aiLines = label ? wrapFace(bodyFont, label, inner, aiSize) : [];
  const aiMetrics = aiLines.length ? lineBox(bodyFont, aiSize) : null;
  const aiPad = aiLines.length ? Math.max(4, Math.round(aiSize * 0.35)) : 0;
  const aiBlock = aiMetrics ? aiMetrics.ascent + aiMetrics.descent + Math.max(0, aiLines.length - 1) * aiMetrics.step : 0;
  const aiH = aiLines.length ? Math.ceil(aiBlock + aiPad * 2) : 0;
  const aiTop = footerTop - aiH;
  const contentBottom = aiTop;
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

  const mark = watermarkLayout(width, height, bodyFont);
  const watermarkBox = { x: mark.plateX, y: mark.plateY, w: mark.plateW, h: mark.plateH };
  const glyphs = [];
  const inkRgb = [ink[0], ink[1], ink[2]];
  const titleLook = titleStyle(headline.id, inkRgb);
  const titleFit = fitFace(
    titleFont,
    options.title ?? "",
    titleZone,
    Math.max(minInk, height * 0.16),
    Math.max(22, Math.round(height * 0.045)),
    { x: watermarkBox.x, y: watermarkBox.y, w: watermarkBox.w, h: watermarkBox.h, padRatio: decoRatio(titleLook), slack: 2, wholeWords: true },
  );
  const bodyFit = fitFace(bodyFont, options.body ?? "", bodyZone, Math.max(18, height * 0.04), Math.max(14, Math.round(height * 0.02)));
  const tokenFit = fitFace(bodyFont, tokenText, tokenZone, Math.max(14, Math.round(height * 0.028)), 12);
  await placeText(rgba, width, height, titleFont, titleFit, titleZone, "title", glyphs, titleLook, pace);
  await breathe(options);
  await placeText(rgba, width, height, bodyFont, bodyFit, bodyZone, "body", glyphs, { fill: inkRgb, shadow: 0.05, shadowAlpha: 0.75 }, pace);
  await breathe(options);
  await placeText(rgba, width, height, bodyFont, tokenFit, tokenZone, "token", glyphs, { fill: inkRgb }, pace);

  fillRect(rgba, width, height, mark.plateX, mark.plateY, mark.plateW, mark.plateH, [WM_PLATE[0], WM_PLATE[1], WM_PLATE[2], 255]);
  await drawFace(rgba, width, height, bodyFont, [WM_TEXT], mark.wmX, mark.wmBaseline, mark.wmSize, "watermark", glyphs, {
    fill: [WM_INK[0], WM_INK[1], WM_INK[2]],
    alpha: WATERMARK_ALPHA,
    crisp: true,
  }, pace);

  let labelBox = null;
  if (aiLines.length && aiMetrics) {
    const aiWidth = Math.max(...aiLines.map((line) => measureFont(bodyFont, line, aiSize)));
    labelBox = {
      x: Math.max(0, pad - aiPad),
      y: aiTop,
      w: Math.min(width - Math.max(0, pad - aiPad), Math.ceil(aiWidth + aiPad * 2)),
      h: aiH,
    };
    fillRect(rgba, width, height, labelBox.x, labelBox.y, labelBox.w, labelBox.h, [WM_PLATE[0], WM_PLATE[1], WM_PLATE[2], 255]);
    await drawFace(rgba, width, height, bodyFont, aiLines, labelBox.x + aiPad, labelBox.y + aiPad + aiMetrics.ascent, aiSize, "ai", glyphs, {
      fill: [WM_INK[0], WM_INK[1], WM_INK[2]],
      alpha: WATERMARK_ALPHA,
      crisp: true,
    }, pace);
  }

  fillRect(rgba, width, height, 0, footerTop, width, noticeH, FOOTER_BG);
  const noticeBaseline = footerTop + padY + noticeMetrics.ascent;
  await drawFace(rgba, width, height, noticeFont, noticeLinesDrawn, pad, noticeBaseline, noticeSize, "notice", glyphs, {
    fill: [FOOTER_FG[0], FOOTER_FG[1], FOOTER_FG[2]],
  }, pace);

  const png = options.png === false ? new Uint8Array() : await encodePng(rgba, width, height, PNG_COMMENT);
  const noticeGlyphs = glyphs.filter((glyph) => glyph.role === "notice");
  const noticeLineCount = new Set(noticeGlyphs.map((glyph) => Math.round(glyph.y))).size;
  return {
    rgba,
    png,
    width,
    height,
    lang,
    texts: [noticeText, WATERMARK, label, options.title ?? "", options.body ?? "", tokenText].filter((item) => item !== ""),
    glyphs,
    fits: titleFit.fits && bodyFit.fits && tokenFit.fits,
    brandFontSize: noticeSize,
    noticeFontSize: noticeSize,
    noticeInk: Math.min(...NOTICE_LETTERS.map((ch) => letterInk(noticeFont, ch, noticeSize))),
    noticeText,
    noticeLines: noticeLineCount,
    brandTop: footerTop,
    footerTop,
    noticeTop: footerTop,
    aiTop,
    topBand: 0,
    contentBottom,
    watermarkAlpha: WATERMARK_ALPHA,
    watermarkColor: [WM_INK[0], WM_INK[1], WM_INK[2]],
    watermarkPlate: [WM_PLATE[0], WM_PLATE[1], WM_PLATE[2]],
    watermarkBox,
    labelBox,
    headline: headline.id,
    fill,
    ink,
    label,
  };
}
