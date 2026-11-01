import { t } from "./i18n.mjs";
import { el } from "./ui.mjs";

export function chartHost() {
  return el("div", { class: "sn-chart", "data-sn": "chart" });
}

export async function drawChart(host, payload, { mode = "line", compare = null, sma = false } = {}) {
  host.replaceChildren();
  const points = normalize(payload);
  if (!points.length) {
    host.append(el("p", { class: "sn-state", text: t("unavailable") }));
    return () => {};
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 640 320");
  svg.setAttribute("class", "sn-chart-svg");
  svg.setAttribute("role", "img");
  const values = seriesValues(points, mode);
  if (compare?.points?.length && mode !== "candles") {
    const base = rebase(points.map((row) => row.close));
    const other = rebase(normalize(compare).map((row) => row.close));
    svg.append(poly(base, "#ff3070"), poly(other, "#9ecbff"));
  } else if (mode === "candles" && points[0].open != null) {
    svg.append(...candles(points));
  } else {
    svg.append(poly(points.map((row) => row.close), "#ff3070"));
    if (sma) svg.append(poly(moving(points.map((row) => row.close), 20), "#7dcea0"));
  }
  const tip = el("p", { class: "sn-note", "data-sn": "tip" });
  svg.addEventListener("pointermove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 640;
    const index = Math.max(0, Math.min(points.length - 1, Math.round((x / 640) * (points.length - 1))));
    const row = points[index];
    tip.textContent = row.open != null
      ? `${new Date(row.time).toISOString().slice(0, 16)}  O ${row.open}  H ${row.high}  L ${row.low}  C ${row.close}`
      : `${new Date(row.time).toISOString().slice(0, 16)}  ${row.close}`;
  });
  host.append(svg, tip);
  return () => host.replaceChildren();
}

function normalize(payload) {
  const rows = payload?.points || [];
  return rows.map((row) => {
    if (row.length >= 5) return { time: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] ?? null };
    return { time: row[0], close: row[1], open: null, high: null, low: null, volume: null };
  }).filter((row) => row.time != null && row.close != null);
}

function seriesValues(points) {
  return points.flatMap((row) => [row.low, row.high, row.close, row.open].filter((value) => value != null));
}

function scale(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value) => 300 - ((value - min) / span) * 280;
}

function poly(values, color) {
  const clean = values.filter((value) => value != null);
  const y = scale(clean);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "2");
  line.setAttribute("points", clean.map((value, index) => {
    const x = clean.length === 1 ? 320 : (index / (clean.length - 1)) * 620 + 10;
    return `${x.toFixed(1)},${y(value).toFixed(1)}`;
  }).join(" "));
  return line;
}

function candles(points) {
  const values = points.flatMap((row) => [row.low, row.high, row.open, row.close]);
  const y = scale(values);
  const nodes = [];
  points.forEach((row, index) => {
    const x = points.length === 1 ? 320 : (index / (points.length - 1)) * 620 + 10;
    const up = row.close >= row.open;
    const color = up ? "#7dcea0" : "#f0a0b0";
    const wick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    wick.setAttribute("x1", String(x));
    wick.setAttribute("x2", String(x));
    wick.setAttribute("y1", String(y(row.high)));
    wick.setAttribute("y2", String(y(row.low)));
    wick.setAttribute("stroke", color);
    const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const top = y(Math.max(row.open, row.close));
    const height = Math.max(1, Math.abs(y(row.open) - y(row.close)));
    body.setAttribute("x", String(x - 2));
    body.setAttribute("y", String(top));
    body.setAttribute("width", "4");
    body.setAttribute("height", String(height));
    body.setAttribute("fill", color);
    nodes.push(wick, body);
  });
  return nodes;
}

function rebase(values) {
  const first = values.find((value) => value != null);
  if (!first) return [];
  return values.map((value) => (value == null ? null : (value / first) * 100));
}

function moving(values, size) {
  const out = [];
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= size) sum -= values[index - size];
    out.push(index >= size - 1 ? sum / size : null);
  }
  return out;
}

export function rsi(points) {
  const closes = normalize({ points }).map((row) => row.close);
  if (closes.length < 15) return null;
  let gain = 0;
  let loss = 0;
  for (let index = closes.length - 14; index < closes.length; index += 1) {
    const diff = closes[index] - closes[index - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function chartNote(payload) {
  return [payload?.interval || "", payload?.maxRangeNote || "", payload?.volumeNote || "", t("calc")].filter(Boolean).join(" · ");
}
