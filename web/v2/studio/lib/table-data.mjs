/** Tablas editables en el documento. Filas y celdas reales, no una captura. */

import { BRAND } from "./document.mjs";

export function defaultTableProps() {
  return {
    rows: [
      ["Concepto", "Q1", "Q2"],
      ["Ingresos", "12", "18"],
      ["Costes", "7", "9"],
    ],
    header: true,
    border: BRAND.navy,
    fill: "#FFFFFF",
    headerFill: "#FFF8EC",
  };
}

export function cleanTableProps(props = {}) {
  const source = Array.isArray(props.rows) && props.rows.length ? props.rows : defaultTableProps().rows;
  const rows = source.slice(0, 20).map((row) => {
    const cells = Array.isArray(row) ? row : [row];
    return cells.slice(0, 12).map((cell) => String(cell ?? "").slice(0, 80));
  });
  const cols = Math.max(1, ...rows.map((row) => row.length));
  for (const row of rows) {
    while (row.length < cols) row.push("");
  }
  return {
    rows,
    header: props.header !== false,
    border: /^#[0-9a-fA-F]{6}$/.test(String(props.border || "")) ? String(props.border) : BRAND.navy,
    fill: /^#[0-9a-fA-F]{6}$/.test(String(props.fill || "")) ? String(props.fill) : "#FFFFFF",
    headerFill: /^#[0-9a-fA-F]{6}$/.test(String(props.headerFill || "")) ? String(props.headerFill) : "#FFF8EC",
  };
}

export function tablePlainText(props) {
  const clean = cleanTableProps(props);
  return clean.rows.map((row) => row.join("\t")).join("\n");
}

export function parseTableText(text, props = {}) {
  const base = cleanTableProps(props);
  const lines = String(text || "").replace(/\r/g, "").split("\n").slice(0, 20);
  const rows = lines.map((line) => {
    const cells = line.includes("\t") ? line.split("\t") : line.split("|");
    return cells.map((cell) => cell.trim().slice(0, 80)).slice(0, 12);
  }).filter((row) => row.some((cell) => cell.length));
  if (!rows.length) return base;
  return cleanTableProps({ ...base, rows });
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

/** Dibuja la rejilla. El texto de celdas lo aporta compose con paintText aparte si hace falta;
 * aquí se pinta solo el fondo y los bordes para el raster rápido. */
export function paintTableGrid(local, w, h, props) {
  const data = cleanTableProps(props);
  const rows = data.rows.length;
  const cols = data.rows[0]?.length || 1;
  const cellW = w / cols;
  const cellH = h / rows;
  fillRect(local, w, h, 0, 0, w, h, hexColor(data.fill));
  if (data.header) fillRect(local, w, h, 0, 0, w, cellH, hexColor(data.headerFill));
  const border = hexColor(data.border);
  for (let r = 0; r <= rows; r += 1) {
    const y = Math.round(r * cellH);
    fillRect(local, w, h, 0, Math.min(h - 1, y), w, 1, border);
  }
  for (let c = 0; c <= cols; c += 1) {
    const x = Math.min(w - 1, Math.max(0, Math.round(c * cellW)));
    fillRect(local, w, h, x, 0, 1, h, border);
  }
  return data;
}
