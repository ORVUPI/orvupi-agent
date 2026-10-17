import { deflateRawSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { folderContains, sortFiles, visibleFiles } from "../../src/files/query";
import { autofill, formatShown, pivotGrid, replaceInGrid, scaleColor } from "../../src/sheets/format";
import { FUNCTION_NAMES, displayCell, emptyGrid, shiftFormula, sortGrid, type FormulaBook } from "../../src/sheets/formulas";
import { parseSheet, serializeSheet, createSheetFile } from "../../src/sheets/model";
import { sheetsToXlsx, xlsxToSheets } from "../../src/sheets/xlsx";
import { crc32, zipStore } from "../../src/sheets/zip";
import type { FileRecord } from "../../src/storage/types";

function gridWith(entries: Record<string, string>): string[][] {
  const grid = emptyGrid();
  for (const [ref, value] of Object.entries(entries)) {
    const col = ref.toUpperCase().charCodeAt(0) - 65;
    const row = Number(ref.slice(1)) - 1;
    grid[row]![col] = value;
  }
  return grid;
}

function file(partial: Partial<FileRecord> & Pick<FileRecord, "id" | "name" | "kind">): FileRecord {
  return {
    mime: "text/plain",
    tags: [],
    favorite: false,
    folderId: null,
    color: null,
    deletedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    size: 4,
    blobKey: partial.id,
    contentHash: "abc",
    ...partial,
  };
}

describe("fórmulas", () => {
  test("suma, promedio, min, max, contar y si", () => {
    const grid = gridWith({
      A1: "10",
      A2: "20",
      A3: "texto",
      B1: "=SUMA(A1:A3)",
      B2: "=PROMEDIO(A1:A2)",
      B3: "=MIN(A1:A2)",
      B4: "=MAX(A1:A2)",
      B5: "=CONTAR(A1:A3)",
      B6: '=SI(A1>5,"alto","bajo")',
      B7: "=SUM(A1,A2)",
      B8: "=A1+A2*2",
    });
    expect(displayCell(grid, 0, 1)).toBe("30");
    expect(displayCell(grid, 1, 1)).toBe("15");
    expect(displayCell(grid, 2, 1)).toBe("10");
    expect(displayCell(grid, 3, 1)).toBe("20");
    expect(displayCell(grid, 4, 1)).toBe("2");
    expect(displayCell(grid, 5, 1)).toBe("alto");
    expect(displayCell(grid, 6, 1)).toBe("30");
    expect(displayCell(grid, 7, 1)).toBe("50");
  });

  test("un ciclo no se presenta como un número", () => {
    const grid = gridWith({ A1: "=B1", B1: "=A1" });
    expect(displayCell(grid, 0, 0)).toBe("#CICLO!");
  });

  test("hay al menos cien nombres de función y cubren búsqueda, fechas y texto", () => {
    expect(FUNCTION_NAMES.length).toBeGreaterThanOrEqual(100);
    const grid = gridWith({
      A1: "10",
      A2: "20",
      A3: "Ana",
      B1: "uno",
      B2: "dos",
      C1: "=BUSCARV(20,A1:B3,2)",
      C2: '=CONTAR.SI(A1:A2,">5")',
      C3: '=SUMAR.SI(A1:A2,">5")',
      C4: '=CONCATENAR(A3," ",B2)',
      C5: '=REDONDEAR(10.46,1)',
      C6: '=SI.ERROR(1/0,"ups")',
      C7: '=Y(A1>1,A2>1)',
      C8: '=IZQUIERDA(A3,1)',
      C9: '=FECHA(2026,10,17)',
      C10: '=AÑO("2026-10-17")',
      D1: "=ABS(-4)",
      D2: '=SI(ESNUMERO(A1),"n","t")',
      D3: "=PROMEDIO(A1:A2)",
    });
    expect(displayCell(grid, 0, 2)).toBe("dos");
    expect(displayCell(grid, 1, 2)).toBe("2");
    expect(displayCell(grid, 2, 2)).toBe("30");
    expect(displayCell(grid, 3, 2)).toBe("Ana dos");
    expect(displayCell(grid, 4, 2)).toBe("10.5");
    expect(displayCell(grid, 5, 2)).toBe("ups");
    expect(displayCell(grid, 6, 2)).toBe("TRUE");
    expect(displayCell(grid, 7, 2)).toBe("A");
    expect(displayCell(grid, 8, 2)).toBe("2026-10-17");
    expect(displayCell(grid, 9, 2)).toBe("2026");
    expect(displayCell(grid, 0, 3)).toBe("4");
    expect(displayCell(grid, 1, 3)).toBe("n");
  });

  test("una fórmula puede leer otra hoja", () => {
    const first = gridWith({ A1: "=Hoja2!A1" });
    const second = gridWith({ A1: "7" });
    const book: FormulaBook = { sheets: [{ name: "Hoja 1", cells: first }, { name: "Hoja2", cells: second }], active: 0 };
    expect(displayCell(first, 0, 0, new Set(), book, "Hoja 1")).toBe("7");
    const quoted = gridWith({ B1: "='Hoja 2'!A1" });
    const spaced = gridWith({ A1: "9" });
    const book2: FormulaBook = { sheets: [{ name: "Hoja 1", cells: quoted }, { name: "Hoja 2", cells: spaced }], active: 0 };
    expect(displayCell(quoted, 0, 1, new Set(), book2, "Hoja 1")).toBe("9");
  });

  test("el formato, el autorrelleno y el reemplazo no pierden el valor", () => {
    expect(formatShown("12.5", "currency")).toBe("12,50 €");
    expect(formatShown("0.5", "percent")).toBe("50,00 %");
    expect(shiftFormula("=A1+B$1", 1, 1)).toBe("=B2+C$1");
    const filled = autofill(gridWith({ A1: "3", A2: "=A1*2" }), 1, 0, 1, true);
    expect(filled[2]?.[0]).toBe("=A2*2");
    const replaced = replaceInGrid(gridWith({ A1: "hola" }), "ho", "Ha");
    expect(replaced.cells[0]?.[0]).toBe("Hala");
    expect(replaced.count).toBe(1);
    const legacy = parseSheet(serializeSheet(createSheetFile({ id: "s1", title: "Vieja" })));
    expect(legacy.sheets[0]?.cells[0]?.[0]).toBe("");
    expect(legacy.version).toBe(1);
  });

  test("CONSULTA une el texto del rango y la escala pinta de crema a verde", () => {
    const grid = gridWith({ A1: "Ana", A2: "Luis", B1: "=CONSULTA(A1:A2)", B2: "=QUERY(A1:A2)" });
    expect(displayCell(grid, 0, 1)).toBe("Ana | Luis");
    expect(displayCell(grid, 1, 1)).toBe("Ana | Luis");
    expect(scaleColor("1", 1, 10)).toBe("rgb(255, 244, 184)");
    expect(scaleColor("10", 1, 10)).toBe("rgb(11, 93, 54)");
    const pivot = pivotGrid(gridWith({ A1: "tipo", A2: "Ana", A3: "Ana" }), 0);
    expect(pivot[0]?.[0]).toBe("Valor");
    expect(pivot[1]?.[0]).toBe("Ana");
    expect(pivot[1]?.[1]).toBe("2");
  });

  test("ordenar deja la fila inmovilizada en su sitio", () => {
    const grid = gridWith({ A1: "nombre", A2: "2", A3: "10" });
    const sorted = sortGrid(grid, 0, "asc", true);
    expect(sorted[0]?.[0]).toBe("nombre");
    expect(sorted[1]?.[0]).toBe("2");
    expect(sorted[2]?.[0]).toBe("10");
  });
});

describe("archivos", () => {
  test("no se puede mover una carpeta dentro de sí misma", () => {
    const files = [file({ id: "a", name: "A", kind: "folder" }), file({ id: "b", name: "B", kind: "folder", folderId: "a" })];
    expect(folderContains(files, "a", "b")).toBe(true);
    expect(folderContains(files, "b", "a")).toBe(false);
  });

  test("filtra por carpeta, destacado y tipo", () => {
    const now = Date.parse("2026-10-17T00:00:00.000Z");
    const files = [
      file({ id: "root", name: "Notas", kind: "doc", updatedAt: "2026-10-16T00:00:00.000Z" }),
      file({ id: "in", name: "Dentro", kind: "sheet", folderId: "box", favorite: true, updatedAt: "2026-10-16T00:00:00.000Z" }),
      file({ id: "box", name: "Caja", kind: "folder", updatedAt: "2026-10-16T00:00:00.000Z" }),
      file({ id: "gone", name: "Viejo", kind: "doc", deletedAt: "2026-10-10T00:00:00.000Z" }),
    ];
    expect(visibleFiles(files, { mode: "folder", folderId: null, query: "", kind: "all", date: "any", now }).map((item) => item.id)).toEqual(["root", "box"]);
    expect(visibleFiles(files, { mode: "starred", folderId: null, query: "dentro", kind: "sheet", date: "week", now })).toHaveLength(1);
    expect(sortFiles(visibleFiles(files, { mode: "trash", folderId: null, query: "", kind: "all", date: "any", now }), "name", "asc")[0]?.name).toBe("Viejo");
  });
});

describe("xlsx", () => {
  test("escribe y vuelve a leer una hoja", async () => {
    const cells = emptyGrid();
    cells[0]![0] = "Hola";
    cells[1]![0] = "12";
    const bytes = sheetsToXlsx([{ name: "Datos", cells, freezeHeader: true }]);
    const sheets = await xlsxToSheets(bytes);
    expect(sheets[0]?.name).toBe("Datos");
    expect(sheets[0]?.cells[0]?.[0]).toBe("Hola");
    expect(sheets[0]?.cells[1]?.[0]).toBe("12");
  });

  test("lee una entrada comprimida", async () => {
    const xml = new TextEncoder().encode("<t>Uno</t>");
    const compressed = new Uint8Array(deflateRawSync(xml));
    const name = new TextEncoder().encode("xl/sharedStrings.xml");
    const crc = crc32(xml);
    const u16 = (value: number) => new Uint8Array([value & 255, value >> 8]);
    const u32 = (value: number) => new Uint8Array([value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255]);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0), ...u32(crc),
      ...u32(compressed.byteLength), ...u32(xml.byteLength), ...u16(name.byteLength), ...u16(0), ...name, ...compressed,
    ]);
    const central = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0), ...u32(crc),
      ...u32(compressed.byteLength), ...u32(xml.byteLength), ...u16(name.byteLength), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...name,
    ]);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1), ...u32(central.byteLength), ...u32(local.byteLength), ...u16(0)]);
    const stored = zipStore([{ name: "note.txt", data: new TextEncoder().encode("ok") }]);
    expect(stored[0]).toBe(0x50);
    const { unzip } = await import("../../src/sheets/zip");
    const files = await unzip(new Uint8Array([...local, ...central, ...end]));
    expect(new TextDecoder().decode(files.get("xl/sharedStrings.xml"))).toBe("<t>Uno</t>");
  });
});
