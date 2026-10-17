import { deflateRawSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { folderContains, sortFiles, visibleFiles } from "../../src/files/query";
import { displayCell, emptyGrid, sortGrid } from "../../src/sheets/formulas";
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
