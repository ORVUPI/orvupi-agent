import { COL_COUNT, ROW_COUNT, adjustFormula, cellRef, displayCell, shiftFormula, type FormulaBook } from "./formulas";

export type CellFormatKind = "general" | "number" | "currency" | "percent" | "date";
export type CellAlign = "left" | "center" | "right";

export type CellStyle = {
  bold?: boolean;
  color?: string;
  fill?: string;
  align?: CellAlign;
  format?: CellFormatKind;
  border?: boolean;
  wrap?: boolean;
  colspan?: number;
  rowspan?: number;
};

export type CondRule = {
  id: string;
  col: number;
  op: "gt" | "lt" | "eq" | "contains" | "scale";
  value: string;
  fill: string;
};

export type CellRule =
  | { kind: "list"; options: string[] }
  | { kind: "check" }
  | { kind: "date" }
  | { kind: "range"; min: number; max: number }
  | { kind: "formula"; expr: string };

export type SheetChart = {
  id: string;
  kind: "bar" | "line" | "pie" | "scatter" | "area" | "gauge";
  title: string;
  labelCol: number;
  valueCol: number;
  rowFrom: number;
  rowTo: number;
};

const HEX = /^#[0-9a-f]{6}$/i;
const FORMATS = new Set<CellFormatKind>(["general", "number", "currency", "percent", "date"]);

export function styleKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function knownStyle(value: unknown): CellStyle | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const style: CellStyle = {};
  if (source.bold === true) style.bold = true;
  if (typeof source.color === "string" && HEX.test(source.color)) style.color = source.color.toLowerCase();
  if (typeof source.fill === "string" && HEX.test(source.fill)) style.fill = source.fill.toLowerCase();
  if (source.align === "left" || source.align === "center" || source.align === "right") style.align = source.align;
  if (typeof source.format === "string" && FORMATS.has(source.format as CellFormatKind)) style.format = source.format as CellFormatKind;
  if (source.border === true) style.border = true;
  if (source.wrap === true) style.wrap = true;
  if (typeof source.colspan === "number" && source.colspan > 1 && source.colspan <= 12) style.colspan = Math.floor(source.colspan);
  if (typeof source.rowspan === "number" && source.rowspan > 1 && source.rowspan <= 12) style.rowspan = Math.floor(source.rowspan);
  return Object.keys(style).length > 0 ? style : null;
}

function grouped(value: number, digits: number): string {
  const sign = value < 0 ? "-" : "";
  const [whole, frac] = Math.abs(value).toFixed(digits).split(".");
  const body = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return frac !== undefined ? `${sign}${body},${frac}` : `${sign}${body}`;
}

export function formatShown(raw: string, format: CellFormatKind | undefined): string {
  if (!format || format === "general" || raw.startsWith("#")) return raw;
  if (format === "date" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (raw.trim() === "") return raw;
  const number = Number(raw);
  if (!Number.isFinite(number)) return raw;
  if (format === "number") return grouped(number, 2);
  if (format === "currency") return `${grouped(number, 2)} €`;
  if (format === "percent") return `${grouped(number * 100, 2)} %`;
  const utc = new Date(Date.UTC(1899, 11, 30));
  utc.setUTCDate(utc.getUTCDate() + Math.floor(number));
  return utc.toISOString().slice(0, 10);
}

export function cellSpan(styles: Record<string, CellStyle>, row: number, col: number): "covered" | { colspan: number; rowspan: number } {
  for (let r = row; r >= Math.max(0, row - 12); r -= 1) {
    for (let c = col; c >= Math.max(0, col - 12); c -= 1) {
      const style = styles[styleKey(r, c)];
      const colspan = style?.colspan ?? 1;
      const rowspan = style?.rowspan ?? 1;
      if (colspan <= 1 && rowspan <= 1) continue;
      if (row >= r && row < r + rowspan && col >= c && col < c + colspan) {
        return r === row && c === col ? { colspan, rowspan } : "covered";
      }
    }
  }
  return { colspan: 1, rowspan: 1 };
}

export function mergeRange(styles: Record<string, CellStyle>, r1: number, c1: number, r2: number, c2: number): Record<string, CellStyle> {
  const top = Math.min(r1, r2);
  const left = Math.min(c1, c2);
  const rowspan = Math.abs(r2 - r1) + 1;
  const colspan = Math.abs(c2 - c1) + 1;
  if (rowspan < 2 && colspan < 2) return styles;
  const next = { ...styles };
  const anchor = styleKey(top, left);
  next[anchor] = { ...next[anchor], colspan, rowspan };
  return next;
}

export function unmerge(styles: Record<string, CellStyle>, row: number, col: number): Record<string, CellStyle> {
  const anchor = cellSpan(styles, row, col);
  if (anchor === "covered") return styles;
  const next = { ...styles };
  const key = styleKey(row, col);
  if (!next[key]) return styles;
  const style = { ...next[key] };
  delete style.colspan;
  delete style.rowspan;
  if (Object.keys(style).length === 0) delete next[key];
  else next[key] = style;
  return next;
}

function remapKey(row: number, col: number, axis: "row" | "col", at: number, delta: number): string | null {
  let nextRow = row;
  let nextCol = col;
  const point = axis === "row" ? row : col;
  if (delta < 0 && point === at) return null;
  if (point >= at) {
    if (axis === "row") nextRow += delta;
    else nextCol += delta;
  }
  if (nextRow < 0 || nextCol < 0 || nextRow >= ROW_COUNT || nextCol >= COL_COUNT) return null;
  return styleKey(nextRow, nextCol);
}

export function remapStyles(styles: Record<string, CellStyle>, axis: "row" | "col", at: number, delta: number): Record<string, CellStyle> {
  const next: Record<string, CellStyle> = {};
  for (const [key, style] of Object.entries(styles)) {
    const [row, col] = key.split(":").map(Number);
    if (row === undefined || col === undefined) continue;
    const mapped = remapKey(row, col, axis, at, delta);
    if (mapped) next[mapped] = style;
  }
  return next;
}

export function scaleInk(color: string): string {
  const match = /rgb\((\d+), (\d+), (\d+)\)/.exec(color);
  if (!match) return "#102032";
  const channels = match.slice(1, 4).map((item) => Number(item) / 255);
  const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(channels[0] ?? 0) + 0.7152 * linear(channels[1] ?? 0) + 0.0722 * linear(channels[2] ?? 0);
  return luminance > 0.2 ? "#102032" : "#fff8ec";
}

export function scaleColor(shown: string, low: number, high: number): string | undefined {
  const number = Number(shown);
  if (!Number.isFinite(number) || high === low) return undefined;
  const t = Math.min(1, Math.max(0, (number - low) / (high - low)));
  const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
  return `rgb(${mix(255, 11)}, ${mix(244, 93)}, ${mix(184, 54)})`;
}

export function columnSpan(cells: string[][], col: number): { low: number; high: number } {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const row of cells) {
    const raw = String(row[col] ?? "").trim();
    if (!raw) continue;
    const number = Number(raw);
    if (!Number.isFinite(number)) continue;
    low = Math.min(low, number);
    high = Math.max(high, number);
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) return { low: 0, high: 0 };
  return { low, high };
}

export function pivotGrid(cells: string[][], col: number): string[][] {
  const counts = new Map<string, number>();
  for (let row = 1; row < cells.length; row += 1) {
    const label = (cells[row]?.[col] ?? "").trim();
    if (!label || label.startsWith("=")) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const grid = cells.map((row) => row.map(() => ""));
  if (grid[0]) {
    grid[0][0] = "Valor";
    grid[0][1] = "Cuenta";
  }
  let index = 1;
  for (const [label, count] of counts) {
    if (!grid[index]) break;
    grid[index]![0] = label;
    grid[index]![1] = String(count);
    index += 1;
  }
  return grid;
}

export function remapValidation(validation: Record<string, CellRule>, axis: "row" | "col", at: number, delta: number): Record<string, CellRule> {
  const next: Record<string, CellRule> = {};
  for (const [key, options] of Object.entries(validation)) {
    const [row, col] = key.split(":").map(Number);
    if (row === undefined || col === undefined) continue;
    const mapped = remapKey(row, col, axis, at, delta);
    if (mapped) next[mapped] = options;
  }
  return next;
}

export function spliceGrid(cells: string[][], axis: "row" | "col", at: number, delta: number): string[][] {
  const next = cells.map((row) => [...row]);
  if (axis === "row" && delta > 0) {
    next.splice(at, 0, Array.from({ length: COL_COUNT }, () => ""));
    next.pop();
  } else if (axis === "row" && delta < 0) {
    next.splice(at, 1);
    next.push(Array.from({ length: COL_COUNT }, () => ""));
  } else if (axis === "col" && delta > 0) {
    for (const row of next) {
      row.splice(at, 0, "");
      row.pop();
    }
  } else if (axis === "col" && delta < 0) {
    for (const row of next) {
      row.splice(at, 1);
      row.push("");
    }
  }
  for (let row = 0; row < next.length; row += 1) {
    for (let col = 0; col < COL_COUNT; col += 1) {
      const value = next[row]?.[col] ?? "";
      if (value.startsWith("=")) next[row]![col] = adjustFormula(value, { axis, at, delta });
    }
  }
  return next;
}

export function paintStyle(styles: Record<string, CellStyle>, row: number, col: number, patch: CellStyle): Record<string, CellStyle> {
  const key = styleKey(row, col);
  const next = { ...styles, [key]: { ...styles[key], ...patch } };
  const style = next[key];
  if (!style) return next;
  if (patch.format === "general") delete style.format;
  return next;
}

export function autofill(cells: string[][], row: number, col: number, count: number, vertical: boolean): string[][] {
  const next = cells.map((line) => [...line]);
  const source = next[row]?.[col] ?? "";
  for (let step = 1; step <= count; step += 1) {
    const targetRow = vertical ? row + step : row;
    const targetCol = vertical ? col : col + step;
    if (targetRow >= ROW_COUNT || targetCol >= COL_COUNT) break;
    if (source.startsWith("=")) next[targetRow]![targetCol] = shiftFormula(source, vertical ? step : 0, vertical ? 0 : step);
    else if (/^-?\d+(\.\d+)?$/.test(source)) next[targetRow]![targetCol] = String(Number(source) + step);
    else next[targetRow]![targetCol] = source;
  }
  return next;
}

export function replaceInGrid(cells: string[][], query: string, replacement: string, book?: FormulaBook): { cells: string[][]; count: number } {
  if (!query) return { cells, count: 0 };
  const next = cells.map((row) => [...row]);
  let count = 0;
  const needle = query.toLowerCase();
  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let col = 0; col < COL_COUNT; col += 1) {
      const raw = next[row]?.[col] ?? "";
      const shown = raw.startsWith("=") ? displayCell(next, row, col, new Set(), book) : raw;
      if (!raw.toLowerCase().includes(needle) && !shown.toLowerCase().includes(needle)) continue;
      const source = raw.toLowerCase().includes(needle) ? raw : shown;
      next[row]![col] = source.split(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig")).join(replacement).slice(0, 500);
      count += 1;
    }
  }
  return { cells: next, count };
}

export function ruleMatches(shown: string, rule: CondRule): boolean {
  if (rule.op === "contains") return shown.toLowerCase().includes(rule.value.toLowerCase());
  const number = Number(shown);
  const target = Number(rule.value);
  if (!Number.isFinite(number) || !Number.isFinite(target)) return rule.op === "eq" && shown === rule.value;
  if (rule.op === "gt") return number > target;
  if (rule.op === "lt") return number < target;
  return number === target;
}

export function chartSeries(cells: string[][], chart: SheetChart, book?: FormulaBook): { labels: string[]; values: number[] } {
  const labels: string[] = [];
  const values: number[] = [];
  for (let row = chart.rowFrom; row <= chart.rowTo; row += 1) {
    const raw = cells[row]?.[chart.valueCol] ?? "";
    const shown = raw.startsWith("=") ? displayCell(cells, row, chart.valueCol, new Set(), book) : raw;
    const number = Number(shown);
    if (!Number.isFinite(number)) continue;
    const labelRaw = cells[row]?.[chart.labelCol] ?? "";
    const label = labelRaw.startsWith("=") ? displayCell(cells, row, chart.labelCol, new Set(), book) : labelRaw;
    labels.push(label || cellRef(row, chart.valueCol));
    values.push(number);
  }
  return { labels, values };
}
