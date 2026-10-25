/** Gráficos basados en datos editables. Solo procesamiento local. */

import { BRAND } from "./document.mjs";

export const CHART_TYPES = ["bar", "line", "pie"];

export function defaultChartProps(type = "bar") {
  const chartType = CHART_TYPES.includes(type) ? type : "bar";
  return {
    chartType,
    labels: ["A", "B", "C", "D"],
    values: [40, 70, 55, 90],
    colors: [BRAND.pink, BRAND.navy, "#3A7CA5", "#F4A261"],
  };
}

export function cleanChartProps(props = {}) {
  const chartType = CHART_TYPES.includes(props.chartType) ? props.chartType : "bar";
  const labels = Array.isArray(props.labels) ? props.labels.map((item) => String(item).slice(0, 40)).slice(0, 12) : defaultChartProps().labels;
  const values = Array.isArray(props.values)
    ? props.values.map((item) => {
        const n = Number(item);
        return Number.isFinite(n) ? Math.max(0, Math.min(1e6, n)) : 0;
      }).slice(0, 12)
    : defaultChartProps().values;
  while (values.length < labels.length) values.push(0);
  while (labels.length < values.length) labels.push(`N${labels.length + 1}`);
  const colors = Array.isArray(props.colors)
    ? props.colors.map((item) => (/^#[0-9a-fA-F]{6}$/.test(String(item)) ? String(item) : BRAND.pink)).slice(0, 12)
    : defaultChartProps().colors;
  while (colors.length < labels.length) colors.push(BRAND.pink);
  return { chartType, labels, values, colors };
}

export function chartSeriesText(props) {
  const clean = cleanChartProps(props);
  return clean.labels.map((label, index) => `${label}:${clean.values[index] ?? 0}`).join("\n");
}

export function parseSeriesText(text, props = {}) {
  const base = cleanChartProps(props);
  const lines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  if (!lines.length) return base;
  const labels = [];
  const values = [];
  for (const line of lines) {
    const match = line.match(/^([^:|=]+)[:|=]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) {
      labels.push(match[1].trim().slice(0, 40));
      values.push(Number(match[2]));
    } else {
      const n = Number(line);
      labels.push(`N${labels.length + 1}`);
      values.push(Number.isFinite(n) ? n : 0);
    }
  }
  return cleanChartProps({ ...base, labels, values });
}

function hexColor(hex) {
  const raw = String(hex || "").trim();
  const body = raw.startsWith("#") ? raw.slice(1) : raw;
  const full = body.length === 3 ? body.split("").map((ch) => ch + ch).join("") : body;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return [16, 32, 50, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
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

function fillCircle(rgba, width, height, cx, cy, r, color) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width, Math.ceil(cx + r));
  const y1 = Math.min(height, Math.ceil(cy + r));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * width + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
}

function fillWedge(rgba, width, height, cx, cy, r, a0, a1, color) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width, Math.ceil(cx + r));
  const y1 = Math.min(height, Math.ceil(cy + r));
  let start = a0;
  let end = a1;
  while (end < start) end += Math.PI * 2;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      let ang = Math.atan2(dy, dx);
      if (ang < start) ang += Math.PI * 2;
      if (ang < start || ang > end) continue;
      const i = (y * width + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
}

/** Pinta el gráfico en un buffer local w×h. */
export function paintChart(local, w, h, props) {
  const data = cleanChartProps(props);
  fillRect(local, w, h, 0, 0, w, h, hexColor("#FFF8EC"));
  const pad = Math.max(8, Math.round(Math.min(w, h) * 0.08));
  const max = Math.max(1, ...data.values);
  if (data.chartType === "pie") {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(8, Math.min(w, h) / 2 - pad);
    const total = Math.max(1, data.values.reduce((sum, value) => sum + value, 0));
    let angle = -Math.PI / 2;
    data.values.forEach((value, index) => {
      const sweep = (value / total) * Math.PI * 2;
      fillWedge(local, w, h, cx, cy, r, angle, angle + sweep, hexColor(data.colors[index]));
      angle += sweep;
    });
    return data;
  }
  if (data.chartType === "line") {
    const axis = hexColor("#102032");
    fillRect(local, w, h, pad, h - pad, w - pad * 2, 2, axis);
    fillRect(local, w, h, pad, pad, 2, h - pad * 2, axis);
    const n = Math.max(1, data.values.length - 1);
    const points = data.values.map((value, index) => ({
      x: pad + ((w - pad * 2) * index) / n,
      y: h - pad - ((h - pad * 2) * value) / max,
      color: hexColor(data.colors[index]),
    }));
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        fillCircle(local, w, h, x, y, 2, axis);
      }
    }
    for (const point of points) fillCircle(local, w, h, point.x, point.y, 5, point.color);
    return data;
  }
  const gap = Math.max(4, Math.round((w - pad * 2) / (data.values.length * 4)));
  const barW = Math.max(6, Math.floor((w - pad * 2 - gap * (data.values.length + 1)) / data.values.length));
  data.values.forEach((value, index) => {
    const barH = Math.round(((h - pad * 2) * value) / max);
    const x = pad + gap + index * (barW + gap);
    const y = h - pad - barH;
    fillRect(local, w, h, x, y, barW, barH, hexColor(data.colors[index]));
  });
  return data;
}
