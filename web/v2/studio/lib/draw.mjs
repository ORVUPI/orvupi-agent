/** Dibujo de titulares OFL sobre el lienzo. Código MIT. */

import { glyphPolylines, measureFont, parseFont } from "./ttf.mjs";

const cache = new Map();

function clock() {
  return globalThis.performance?.now?.() ?? Date.now();
}

// Reparte el trabajo en trozos cortos. Sin pace, el bucle sigue siendo síncrono y el resultado no cambia.
function sliceRows(total, pace, draw) {
  if (!pace) {
    for (let row = 0; row < total; row += 1) draw(row);
    return null;
  }
  return (async () => {
    let stamp = clock();
    for (let row = 0; row < total; row += 1) {
      draw(row);
      if (clock() - stamp < 12) continue;
      const pending = pace();
      if (pending) await pending;
      stamp = clock();
    }
  })();
}

async function taken(value) {
  if (value && typeof value.then === "function") return value;
  return value;
}

export async function loadFace(file) {
  if (cache.has(file)) return cache.get(file);
  const pending = readAsset(file).then((bytes) => parseFont(bytes));
  cache.set(file, pending);
  return pending;
}

async function readAsset(file) {
  const url = new URL(`../assets/${file}`, import.meta.url);
  if (globalThis.process?.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(url));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(file);
  return new Uint8Array(await response.arrayBuffer());
}

export function wrapFace(font, text, maxWidth, size, wholeWords = false) {
  const limit = typeof maxWidth === "function" ? maxWidth : () => maxWidth;
  const lines = [];
  for (const paragraph of String(text ?? "").split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line = "";
    let lineIndex = lines.length;
    const room = () => Math.max(1, limit(lineIndex));
    const pushWord = (word) => {
      if (wholeWords || measureFont(font, word, size) <= room()) {
        line = word;
        return;
      }
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measureFont(font, next, size) <= room()) chunk = next;
        else {
          if (chunk) {
            lines.push(chunk);
            lineIndex += 1;
          }
          chunk = ch;
        }
      }
      line = chunk;
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measureFont(font, next, size) <= room()) line = next;
      else {
        if (line) {
          lines.push(line);
          lineIndex += 1;
        }
        pushWord(word);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function lineBox(font, size) {
  const ascent = Math.max(0, (font.ascender / font.unitsPerEm) * size);
  const descent = Math.max(0, Math.abs(font.descender / font.unitsPerEm) * size);
  return { ascent, descent, step: ascent + descent + size * 0.12 };
}

function widthFor(font, zone, size, avoid) {
  if (!avoid) return () => zone.w;
  const metrics = lineBox(font, size);
  const pad = size * (avoid.padRatio ?? 0) + (avoid.slack ?? 0);
  return (index) => {
    const top = zone.y + index * metrics.step - pad;
    const bottom = top + metrics.ascent + metrics.descent + pad * 2;
    const hits = top < avoid.y + avoid.h && bottom > avoid.y && zone.x < avoid.x + avoid.w && zone.x + zone.w > avoid.x;
    if (!hits) return zone.w;
    return Math.max(8, Math.min(zone.w, avoid.x - zone.x - pad));
  };
}

export function fitFace(font, text, zone, maxSize, minSize, avoid) {
  const value = String(text ?? "");
  const wholeWords = Boolean(avoid?.wholeWords);
  if (!value.trim() || zone.h <= 0 || zone.w <= 0) return { lines: [], size: minSize, fits: !value.trim() };
  const packed = (size) => {
    const limit = widthFor(font, zone, size, avoid);
    const lines = wrapFace(font, value, limit, size, wholeWords);
    const tall = lines.length * lineBox(font, size).step <= zone.h;
    const wide = lines.length > 0 && lines.every((line, index) => measureFont(font, line, size) <= limit(index) + 0.01);
    return { lines, ok: tall && wide, wide };
  };
  let size = Math.ceil(maxSize);
  const designFloor = Math.max(8, Math.floor(minSize));
  const floor = wholeWords ? 4 : designFloor;
  while (size > floor) {
    const fit = packed(size);
    if (fit.ok) return { lines: fit.lines, size, fits: true };
    if (wholeWords && size <= designFloor && fit.wide) break;
    size -= 1;
  }
  const used = Math.max(floor, Math.min(size, Math.ceil(maxSize)));
  const fit = packed(used);
  const maxLines = Math.max(0, Math.floor(zone.h / lineBox(font, used).step));
  const lines = fit.lines.slice(0, maxLines);
  return { lines, size: used, fits: fit.ok && fit.lines.length <= maxLines };
}

function raster(lines, width, height, pace) {
  const mask = new Uint8Array(width * height);
  const edges = [];
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      const a = line[i];
      const b = line[(i + 1) % line.length];
      if (a.y === b.y) continue;
      const down = b.y > a.y;
      edges.push({
        y0: down ? a.y : b.y,
        y1: down ? b.y : a.y,
        x: down ? a.x : b.x,
        dx: (b.x - a.x) / (b.y - a.y),
        wind: down ? 1 : -1,
      });
    }
  }
  const done = sliceRows(height, pace, (y) => {
    const scan = y + 0.5;
    const hits = [];
    for (const edge of edges) {
      if (scan < edge.y0 || scan >= edge.y1) continue;
      hits.push({ x: edge.x + (scan - edge.y0) * edge.dx, wind: edge.wind });
    }
    if (hits.length === 0) return;
    hits.sort((a, b) => a.x - b.x);
    let wind = 0;
    let from = 0;
    for (const hit of hits) {
      if (wind !== 0) {
        const x0 = Math.max(0, Math.ceil(from));
        const x1 = Math.min(width, Math.floor(hit.x));
        for (let x = x0; x < x1; x += 1) mask[y * width + x] = 255;
      }
      wind += hit.wind;
      from = hit.x;
    }
  });
  if (done) return done.then(() => mask);
  return mask;
}

function dilate(mask, width, height, radius, pace) {
  const r = Math.ceil(radius);
  if (r <= 0) return mask;
  const out = new Uint8Array(mask.length);
  const r2 = radius * radius;
  const halves = new Int16Array(r + 1);
  for (let dy = 0; dy <= r; dy += 1) {
    let dx = r;
    while (dx >= 0 && dx * dx + dy * dy > r2) dx -= 1;
    halves[dy] = dx;
  }
  const done = sliceRows(height, pace, (y) => {
    const row = y * width;
    let x = 0;
    while (x < width) {
      while (x < width && mask[row + x] === 0) x += 1;
      if (x >= width) return;
      const start = x;
      while (x < width && mask[row + x] !== 0) x += 1;
      const end = x;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        const half = halves[Math.abs(dy)];
        if (half < 0) continue;
        const x0 = Math.max(0, start - half);
        const x1 = Math.min(width, end + half);
        out.fill(255, yy * width + x0, yy * width + x1);
      }
    }
  });
  if (done) return done.then(() => out);
  return out;
}

function blur(mask, width, height, radius, pace) {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  const win = r * 2 + 1;
  const horizontal = sliceRows(height, pace, (y) => {
    let sum = 0;
    for (let x = -r; x <= r; x += 1) sum += mask[y * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
    for (let x = 0; x < width; x += 1) {
      tmp[y * width + x] = Math.round(sum / win);
      const leave = x - r;
      const enter = x + r + 1;
      sum -= mask[y * width + Math.min(width - 1, Math.max(0, leave))] ?? 0;
      sum += mask[y * width + Math.min(width - 1, Math.max(0, enter))] ?? 0;
    }
  });
  const vertical = () => sliceRows(width, pace, (x) => {
    let sum = 0;
    for (let y = -r; y <= r; y += 1) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x] ?? 0;
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = Math.round(sum / win);
      const leave = y - r;
      const enter = y + r + 1;
      sum -= tmp[Math.min(height - 1, Math.max(0, leave)) * width + x] ?? 0;
      sum += tmp[Math.min(height - 1, Math.max(0, enter)) * width + x] ?? 0;
    }
  });
  if (!horizontal) {
    const done = vertical();
    if (done) return done.then(() => out);
    return out;
  }
  return horizontal.then(vertical).then((done) => (done ? done.then(() => out) : out));
}

function blit(rgba, width, height, mask, mw, mh, ox, oy, color, alpha, sample, pace) {
  const step = sample;
  const rows = [];
  for (let y = 0; y < mh; y += step) rows.push(y);
  const done = sliceRows(rows.length, pace, (index) => {
    const y = rows[index];
    const dy = oy + Math.floor(y / step);
    if (dy < 0 || dy >= height) return;
    for (let x = 0; x < mw; x += step) {
      const dx = ox + Math.floor(x / step);
      if (dx < 0 || dx >= width) continue;
      let cover = 0;
      let count = 0;
      for (let sy = 0; sy < step; sy += 1) {
        for (let sx = 0; sx < step; sx += 1) {
          const mx = x + sx;
          const my = y + sy;
          if (mx >= mw || my >= mh) continue;
          cover += mask[my * mw + mx] ?? 0;
          count += 1;
        }
      }
      const a = (cover / (count * 255)) * alpha;
      if (a <= 0.004) continue;
      const i = (dy * width + dx) * 4;
      const keep = 1 - a;
      rgba[i] = Math.round((rgba[i] ?? 0) * keep + color[0] * a);
      rgba[i + 1] = Math.round((rgba[i + 1] ?? 0) * keep + color[1] * a);
      rgba[i + 2] = Math.round((rgba[i + 2] ?? 0) * keep + color[2] * a);
      rgba[i + 3] = 255;
    }
  });
  return done;
}

function shownChar(ch) {
  const upper = ch.toLocaleUpperCase("es-ES");
  return [...upper][0] ?? ch;
}

export async function drawFace(rgba, width, height, font, lines, x, baseline, size, role, glyphs, style, pace) {
  const sample = style.crisp ? 1 : 2;
  const { ascent, descent, step } = lineBox(font, size);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const y = baseline + index * step;
    const placed = [];
    let pen = x;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ch of line) {
      const poly = glyphPolylines(font, ch, size);
      if (ch !== " ") {
        placed.push({ ch, pen, poly });
        for (const contour of poly.lines) {
          for (const point of contour) {
            minX = Math.min(minX, pen + point.x);
            maxX = Math.max(maxX, pen + point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
        }
      }
      pen += poly.advance;
    }
    for (const item of placed) {
      glyphs.push({
        ch: shownChar(item.ch),
        x: item.pen,
        y: y - ascent,
        size,
        w: item.poly.advance,
        h: ascent + descent,
        role,
        missing: item.poly.missing,
      });
    }
    if (!Number.isFinite(minX)) continue;
    const pad = Math.ceil(size * Math.max(style.strokeWidth ?? 0, style.glowRadius ?? 0, style.shadow ?? 0) + 3);
    const ox = Math.floor(minX) - pad;
    const oyTop = Math.floor(y - maxY) - pad;
    const mw = Math.max(1, Math.ceil((maxX - minX) + pad * 2)) * sample;
    const mh = Math.max(1, Math.ceil((maxY - minY) + pad * 2)) * sample;
    const shifted = [];
    for (const item of placed) {
      for (const contour of item.poly.lines) {
        shifted.push(contour.map((point) => ({
          x: (item.pen + point.x - ox) * sample,
          y: (y - point.y - oyTop) * sample,
        })));
      }
    }
    const mask = await taken(raster(shifted, mw, mh, pace));
    const fill = style.fill;
    const stroke = style.stroke;
    const glow = style.glow;
    if (glow) {
      const soft = await taken(blur(mask, mw, mh, (style.glowRadius ?? 0.2) * size * sample, pace));
      await taken(blit(rgba, width, height, soft, mw, mh, ox, oyTop, glow, style.glowAlpha ?? 0.9, sample, pace));
      if (style.glow2) await taken(blit(rgba, width, height, soft, mw, mh, ox - Math.round(size * 0.03), oyTop, style.glow2, 0.55, sample, pace));
    }
    if (style.shadow) {
      const shift = Math.max(1, Math.round(size * style.shadow));
      await taken(blit(rgba, width, height, mask, mw, mh, ox + shift, oyTop + shift, style.shadowColor ?? [8, 6, 12], style.shadowAlpha ?? 0.9, sample, pace));
    }
    if (stroke && (style.strokeWidth ?? 0) > 0) {
      const thick = await taken(dilate(mask, mw, mh, style.strokeWidth * size * sample, pace));
      await taken(blit(rgba, width, height, thick, mw, mh, ox, oyTop, stroke, style.alpha ?? 1, sample, pace));
    }
    await taken(blit(rgba, width, height, mask, mw, mh, ox, oyTop, fill, style.alpha ?? 1, sample, pace));
  }
}

export function letterInk(font, ch, size) {
  const poly = glyphPolylines(font, ch, size);
  let top = 0;
  let bottom = 0;
  for (const line of poly.lines) {
    for (const point of line) {
      top = Math.max(top, point.y);
      bottom = Math.min(bottom, point.y);
    }
  }
  return top - bottom;
}

export function capInk(font, size) {
  return letterInk(font, "H", size);
}
