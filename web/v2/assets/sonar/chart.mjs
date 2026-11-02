import { localeTag, when } from "./format.mjs";
import { t } from "./i18n.mjs";
import { PRICE_COMPARE, PRICE_DOWN, PRICE_INDICATOR, PRICE_UP, priceColor, seriesUp } from "./price-color.mjs";
import { el } from "./ui.mjs";

const SVG = "http://www.w3.org/2000/svg";
let areaSeq = 0;

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
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 640 320");
  svg.setAttribute("class", "sn-chart-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("preserveAspectRatio", "none");
  const closes = points.map((row) => row.close);
  const up = seriesUp(closes);
  svg.setAttribute("data-sn-trend", up == null ? "flat" : up ? "up" : "down");
  const plot = document.createElementNS(SVG, "g");
  plot.setAttribute("clip-path", "inset(8px 8px 28px 48px)");
  if (compare?.points?.length && mode !== "candles") {
    const base = rebase(closes);
    const other = rebase(normalize(compare).map((row) => row.close));
    plot.append(priceLine(base, priceColor(up)), poly(other, PRICE_COMPARE));
    if (sma) plot.append(poly(moving(base, 20), PRICE_INDICATOR));
  } else if (mode === "candles" && points[0].open != null) {
    plot.append(...candles(points));
  } else {
    plot.append(priceLine(closes, priceColor(up)));
    if (sma) plot.append(poly(moving(closes, 20), PRICE_INDICATOR));
  }
  svg.append(plot);
  const tip = el("p", { class: "sn-note", "data-sn": "tip" });
  svg.addEventListener("pointermove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 640;
    const index = Math.max(0, Math.min(points.length - 1, Math.round((x / 640) * (points.length - 1))));
    const row = points[index];
    tip.textContent = row.open != null
      ? `${when(row.time)}  ${t("open")} ${row.open}  ${t("high")} ${row.high}  ${t("low")} ${row.low}  ${t("close")} ${row.close}`
      : `${when(row.time)}  ${row.close}`;
  });
  host.append(svg, axisOverlay(points, mode, host), tip);
  return () => host.replaceChildren();
}

function axisOverlay(points, mode, host) {
  const values = mode === "candles"
    ? points.flatMap((row) => [row.low, row.high]).filter((value) => value != null)
    : points.map((row) => row.close).filter((value) => value != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = el("div", { class: "sn-axis sn-axis-y" });
  for (const fraction of [0, 0.5, 1]) {
    const price = max - (max - min) * fraction;
    y.append(el("span", { text: compactPrice(price) }));
  }
  const width = host.clientWidth || 640;
  const count = width < 420 ? 3 : 4;
  const lastIndex = Math.max(0, points.length - 1);
  const indexes = [];
  for (let step = 0; step < count; step += 1) indexes.push(Math.round((step / (count - 1)) * lastIndex));
  const picked = [...new Set(indexes)].map((index) => points[index]).filter(Boolean);
  const span = (picked.at(-1)?.time || 0) - (picked[0]?.time || 0);
  let labels = picked.map((row) => axisText(row.time, span));
  if (span > 0 && span <= 36 * 3600 * 1000 && new Set(labels).size !== labels.length) {
    labels = picked.map((row) => `${axisText(row.time, span)} ${axisDay(row.time)}`);
  }
  const x = el("div", { class: "sn-axis sn-axis-x" });
  for (const text of labels) x.append(el("span", { text }));
  return el("div", { class: "sn-axes", "aria-hidden": "true" }, [y, x]);
}

function axisText(time, span) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  if (span <= 36 * 3600 * 1000) {
    return new Intl.DateTimeFormat(localeTag(), {
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Madrid",
    }).format(date);
  }
  if (span <= 40 * 24 * 3600 * 1000) return axisDay(time);
  return new Intl.DateTimeFormat(localeTag(), { month: "short", year: "numeric", timeZone: "Europe/Madrid" }).format(date);
}

function axisDay(time) {
  return new Intl.DateTimeFormat(localeTag(), { day: "2-digit", month: "short", timeZone: "Europe/Madrid" }).format(new Date(time));
}

function compactPrice(value) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  const tag = localeTag();
  if (abs >= 1000) return value.toLocaleString(tag, { maximumFractionDigits: 0 });
  if (abs >= 1) return value.toLocaleString(tag, { maximumFractionDigits: 2 });
  return value.toLocaleString(tag, { maximumSignificantDigits: 4 });
}

function normalize(payload) {
  const rows = payload?.points || [];
  return rows.map((row) => {
    if (row.length >= 5) return { time: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] ?? null };
    return { time: row[0], close: row[1], open: null, high: null, low: null, volume: null };
  }).filter((row) => row.time != null && row.close != null);
}

function scale(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value) => 300 - ((value - min) / span) * 280;
}

function coordsOf(values) {
  const clean = values.filter((value) => value != null && Number.isFinite(value));
  if (!clean.length) return [];
  const y = scale(clean);
  return clean.map((value, index) => {
    const x = clean.length === 1 ? 320 : (index / (clean.length - 1)) * 620 + 10;
    return [x, y(value)];
  });
}

function poly(values, color) {
  const coords = coordsOf(values);
  const line = document.createElementNS(SVG, "polyline");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linejoin", "round");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("points", coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
  return line;
}

function priceLine(values, color) {
  const coords = coordsOf(values);
  const group = document.createElementNS(SVG, "g");
  if (coords.length >= 2) {
    const id = `sn-area-${++areaSeq}`;
    const defs = document.createElementNS(SVG, "defs");
    const gradient = document.createElementNS(SVG, "linearGradient");
    gradient.setAttribute("id", id);
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y2", "1");
    const top = document.createElementNS(SVG, "stop");
    top.setAttribute("offset", "0%");
    top.setAttribute("stop-color", color);
    top.setAttribute("stop-opacity", "0.28");
    const bottom = document.createElementNS(SVG, "stop");
    bottom.setAttribute("offset", "100%");
    bottom.setAttribute("stop-color", color);
    bottom.setAttribute("stop-opacity", "0");
    gradient.append(top, bottom);
    defs.append(gradient);
    const area = document.createElementNS(SVG, "polygon");
    const floor = 300;
    const last = coords[coords.length - 1];
    const first = coords[0];
    area.setAttribute("points", [
      ...coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
      `${last[0].toFixed(1)},${floor}`,
      `${first[0].toFixed(1)},${floor}`,
    ].join(" "));
    area.setAttribute("fill", `url(#${id})`);
    area.setAttribute("stroke", "none");
    group.append(defs, area);
  }
  group.append(poly(values, color));
  return group;
}

function candles(points) {
  const values = points.flatMap((row) => [row.low, row.high, row.open, row.close]);
  const y = scale(values);
  const nodes = [];
  points.forEach((row, index) => {
    const x = points.length === 1 ? 320 : (index / (points.length - 1)) * 620 + 10;
    const up = row.close >= row.open;
    const color = up ? PRICE_UP : PRICE_DOWN;
    const wick = document.createElementNS(SVG, "line");
    wick.setAttribute("x1", String(x));
    wick.setAttribute("x2", String(x));
    wick.setAttribute("y1", String(y(row.high)));
    wick.setAttribute("y2", String(y(row.low)));
    wick.setAttribute("stroke", color);
    const body = document.createElementNS(SVG, "rect");
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

function noteOf(value) {
  if (!value) return "";
  if (value === "max-year") return t("maxYear");
  if (value === "ohlc-volume") return t("ohlcVolume");
  if (value === "volume-day") return t("volumeDay");
  return String(value);
}

export function chartNote(payload) {
  return [noteOf(payload?.maxRangeNote), noteOf(payload?.volumeNote)].filter(Boolean).join(" · ");
}
