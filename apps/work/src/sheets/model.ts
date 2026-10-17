import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { COL_COUNT, ROW_COUNT, emptyGrid } from "./formulas";

export type SheetTab = {
  name: string;
  cells: string[][];
  freezeHeader: boolean;
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
  return { name: sanitizeName(name).slice(0, 40) || "Hoja", cells: emptyGrid(), freezeHeader: true };
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
    return [
      {
        name: sanitizeName(typeof entry.name === "string" ? entry.name : "Hoja").slice(0, 40) || "Hoja",
        cells: fitCells(entry.cells),
        freezeHeader: entry.freezeHeader !== false,
      },
    ];
  });
  if (sheets.length === 0) throw new WorkError("invalid-format");
  const active = typeof parsed.active === "number" && parsed.active >= 0 && parsed.active < sheets.length ? parsed.active : 0;
  return { format: "orvupi-sheet", version: 1, id: parsed.id, title: sanitizeName(parsed.title), active, sheets };
}
