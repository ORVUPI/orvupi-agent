import Papa from "papaparse";
import { COL_COUNT, ROW_COUNT, displayGrid, emptyGrid } from "./formulas";

export function csvToGrid(text: string): string[][] {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const grid = emptyGrid();
  parsed.data.slice(0, ROW_COUNT).forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return;
    row.slice(0, COL_COUNT).forEach((cell, colIndex) => {
      grid[rowIndex]![colIndex] = String(cell ?? "").slice(0, 500);
    });
  });
  return grid;
}

export function gridToCsv(cells: string[][]): string {
  return Papa.unparse(displayGrid(cells));
}
