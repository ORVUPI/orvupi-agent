import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { knownStyle, type CellRule, type CellStyle, type CondRule, type SheetChart } from "./format";
import { COL_COUNT, ROW_COUNT, emptyGrid } from "./formulas";

export type SheetTab = {
  name: string;
  cells: string[][];
  freezeHeader: boolean;
  styles?: Record<string, CellStyle>;
  frozenRows?: number;
  frozenCols?: number;
  conditional?: CondRule[];
  validation?: Record<string, CellRule>;
  images?: Record<string, string>;
  notes?: Record<string, string>;
  macro?: CellStyle;
  charts?: SheetChart[];
  filter?: string;
  filterViews?: Array<{ name: string; query: string }>;
  names?: Array<{ name: string; ref: string }>;
};

export type SheetFile = {
  format: "orvupi-sheet";
  version: 1;
  id: string;
  title: string;
  active: number;
  sheets: SheetTab[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function blankSheet(name: string): SheetTab {
  return {
    name: sanitizeName(name).slice(0, 40) || "Hoja",
    cells: emptyGrid(),
    freezeHeader: true,
    styles: {},
    frozenRows: 1,
    frozenCols: 0,
    conditional: [],
    validation: {},
    charts: [],
  };
}

function stylesOf(value: unknown): Record<string, CellStyle> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const styles: Record<string, CellStyle> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d+:\d+$/.test(key)) continue;
    const style = knownStyle(entry);
    if (style) styles[key] = style;
  }
  return styles;
}

function asOp(value: unknown): CondRule["op"] | null {
  if (value === "gt" || value === "lt" || value === "eq" || value === "contains" || value === "scale") return value;
  return null;
}

function asChart(value: unknown): SheetChart["kind"] | null {
  if (value === "bar" || value === "line" || value === "pie" || value === "scatter" || value === "area" || value === "gauge") return value;
  return null;
}

function rulesOf(value: unknown): CondRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const rule = entry as Record<string, unknown>;
    const op = asOp(rule.op);
    if (!op || typeof rule.id !== "string" || typeof rule.value !== "string" || typeof rule.col !== "number") return [];
    const fill = typeof rule.fill === "string" && /^#[0-9a-f]{6}$/i.test(rule.fill) ? rule.fill.toLowerCase() : "#fff4b8";
    return [{ id: rule.id.slice(0, 40), col: Math.max(0, Math.min(COL_COUNT - 1, Math.floor(rule.col))), op, value: rule.value.slice(0, 80), fill }];
  }).slice(0, 20);
}

function chartsOf(value: unknown): SheetChart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const chart = entry as Record<string, unknown>;
    const kind = asChart(chart.kind);
    if (!kind || typeof chart.id !== "string") return [];
    const rowFrom = typeof chart.rowFrom === "number" ? Math.max(0, Math.floor(chart.rowFrom)) : 0;
    const rowTo = typeof chart.rowTo === "number" ? Math.min(ROW_COUNT - 1, Math.floor(chart.rowTo)) : rowFrom;
    return [{
      id: chart.id.slice(0, 40),
      kind,
      title: typeof chart.title === "string" ? chart.title.slice(0, 80) : "Gráfico",
      labelCol: typeof chart.labelCol === "number" ? Math.max(0, Math.min(COL_COUNT - 1, Math.floor(chart.labelCol))) : 0,
      valueCol: typeof chart.valueCol === "number" ? Math.max(0, Math.min(COL_COUNT - 1, Math.floor(chart.valueCol))) : 1,
      rowFrom,
      rowTo: Math.max(rowFrom, rowTo),
    }];
  }).slice(0, 6);
}

function cellRule(entry: unknown): CellRule | null {
  if (Array.isArray(entry)) {
    const options = entry.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 80)).slice(0, 20);
    return options.length > 0 ? { kind: "list", options } : null;
  }
  if (typeof entry !== "object" || entry === null) return null;
  const rule = entry as Record<string, unknown>;
  if (rule.kind === "check" || rule.kind === "date") return { kind: rule.kind };
  if (rule.kind === "range") {
    const min = Number(rule.min);
    const max = Number(rule.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { kind: "range", min, max: Math.max(min, max) };
  }
  if (rule.kind === "formula" && typeof rule.expr === "string" && rule.expr.trim()) {
    return { kind: "formula", expr: rule.expr.replace(/^=/, "").slice(0, 120) };
  }
  if (rule.kind === "list" && Array.isArray(rule.options)) return cellRule(rule.options);
  return null;
}

function viewsOf(value: unknown): Array<{ name: string; query: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.name !== "string") return [];
    const name = entry.name.trim().slice(0, 40);
    if (!name) return [];
    return [{ name, query: typeof entry.query === "string" ? entry.query.slice(0, 80) : "" }];
  }).slice(0, 12);
}

function namesOf(value: unknown): Array<{ name: string; ref: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.ref !== "string") return [];
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(entry.name)) return [];
    if (!/^[A-Za-z]{1,3}[1-9][0-9]*(?::[A-Za-z]{1,3}[1-9][0-9]*)?$/.test(entry.ref)) return [];
    return [{ name: entry.name, ref: entry.ref.toUpperCase() }];
  }).slice(0, 20);
}

function validationOf(value: unknown): Record<string, CellRule> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const validation: Record<string, CellRule> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d+:\d+$/.test(key)) continue;
    const rule = cellRule(entry);
    if (rule) validation[key] = rule;
  }
  return validation;
}

function textMap(value: unknown, limit: number): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const map: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d+:\d+$/.test(key) || typeof entry !== "string" || entry.length > limit) continue;
    map[key] = entry;
  }
  return map;
}

export function createSheetFile(input: { id: string; title: string; sheets?: SheetTab[] }): SheetFile {
  return {
    format: "orvupi-sheet",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    active: 0,
    sheets: input.sheets && input.sheets.length > 0 ? input.sheets : [blankSheet("Hoja 1")],
  };
}

function fitCells(value: unknown): string[][] {
  const grid = emptyGrid();
  if (!Array.isArray(value)) return grid;
  for (let row = 0; row < ROW_COUNT; row += 1) {
    const source = value[row];
    if (!Array.isArray(source)) continue;
    for (let col = 0; col < COL_COUNT; col += 1) {
      const cell = source[col];
      grid[row]![col] = typeof cell === "string" ? cell.slice(0, 500) : "";
    }
  }
  return grid;
}

function compactCells(cells: string[][]): string[][] {
  let lastRow = -1;
  let lastCol = -1;
  for (let row = 0; row < cells.length; row += 1) {
    const line = cells[row] ?? [];
    for (let col = 0; col < line.length; col += 1) {
      if (!line[col]) continue;
      if (row > lastRow) lastRow = row;
      if (col > lastCol) lastCol = col;
    }
  }
  if (lastRow < 0 || lastCol < 0) return [[""]];
  return cells.slice(0, lastRow + 1).map((row) => row.slice(0, lastCol + 1));
}

export function serializeSheet(file: SheetFile): Uint8Array {
  const compact: SheetFile = {
    ...file,
    sheets: file.sheets.map((sheet) => ({ ...sheet, cells: compactCells(sheet.cells) })),
  };
  return encodeUtf8(JSON.stringify(compact));
}

export function parseSheet(bytes: Uint8Array | string): SheetFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-sheet") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string" || !Array.isArray(parsed.sheets)) {
    throw new WorkError("invalid-format");
  }
  const sheets = parsed.sheets.slice(0, 12).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const freezeHeader = entry.freezeHeader !== false;
    return [
      {
        name: sanitizeName(typeof entry.name === "string" ? entry.name : "Hoja").slice(0, 40) || "Hoja",
        cells: fitCells(entry.cells),
        freezeHeader,
        styles: stylesOf(entry.styles),
        frozenRows: typeof entry.frozenRows === "number" ? Math.max(0, Math.min(8, Math.floor(entry.frozenRows))) : (freezeHeader ? 1 : 0),
        frozenCols: typeof entry.frozenCols === "number" ? Math.max(0, Math.min(4, Math.floor(entry.frozenCols))) : 0,
        conditional: rulesOf(entry.conditional),
        validation: validationOf(entry.validation),
        charts: chartsOf(entry.charts),
        images: textMap(entry.images, 120_000),
        notes: textMap(entry.notes, 240),
        macro: knownStyle(entry.macro) ?? undefined,
        filter: typeof entry.filter === "string" ? entry.filter.slice(0, 80) : "",
        filterViews: viewsOf(entry.filterViews),
        names: namesOf(entry.names),
      },
    ];
  });
  if (sheets.length === 0) throw new WorkError("invalid-format");
  const active = typeof parsed.active === "number" && parsed.active >= 0 && parsed.active < sheets.length ? parsed.active : 0;
  return { format: "orvupi-sheet", version: 1, id: parsed.id, title: sanitizeName(parsed.title), active, sheets };
}
