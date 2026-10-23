// @vitest-environment jsdom
import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, describe, expect, test } from "vitest";
import { importDocx, symbolChar } from "../../src/docs/docx-import";
import { cellBorders, cellPadding } from "../../src/docs/extensions";
import type { JsonNode } from "../../src/docs/model";
import { fixture094, T94, words094 } from "../fixtures/docx-094";

beforeAll(() => {
  (globalThis as { Blob: unknown }).Blob = NodeBlob;
});

const all = (node: JsonNode, type: string): JsonNode[] => [...(node.type === type ? [node] : []), ...(node.content ?? []).flatMap((child) => all(child, type))];
const textOf = (node: JsonNode): string => (node.type === "text" ? node.text ?? "" : (node.content ?? []).map(textOf).join(node.type === "paragraph" || node.type === "heading" ? "" : " "));
const USABLE = Math.floor((12240 - 1008 * 2) / 15); // 681 px

describe("0.9.4 · importación DOCX fiel", () => {
  test("márgenes exactos de la hoja (0,7\") y tamaño Carta", async () => {
    const result = await importDocx(fixture094());
    expect(result.pageSize).toBe("letter");
    expect(result.pageMarginTw).toBe(1008);
  });

  test("ninguna tabla ni imagen es más ancha que el ancho útil", async () => {
    const result = await importDocx(fixture094());
    const tables = all(result.content, "table");
    expect(tables).toHaveLength(4);
    for (const table of tables) {
      const first = table.content![0]!;
      const sum = (first.content ?? []).reduce((total, cell) => total + ((cell.attrs?.colwidth as number[] | undefined) ?? []).reduce((a, b) => a + b, 0), 0);
      expect(sum).toBeGreaterThan(0);
      expect(sum).toBeLessThanOrEqual(USABLE);
    }
    // La tabla de 14 000 twips se reparte en proporción.
    const wide = tables[3]!.content![0]!.content!.map((cell) => (cell.attrs?.colwidth as number[])[0]!);
    expect(Math.max(...wide) - Math.min(...wide)).toBeLessThanOrEqual(1);
    const images = all(result.content, "image");
    expect(images).toHaveLength(3);
    expect(images.slice(0, 2).map((img) => [img.attrs?.width, img.attrs?.height])).toEqual([[315, 210], [315, 210]]);
    expect(Number(images[2]!.attrs?.width)).toBeLessThanOrEqual(USABLE);
    expect(Number(images[2]!.attrs?.width) / Number(images[2]!.attrs?.height)).toBeCloseTo(3, 1);
  });

  test("las viñetas de las celdas se conservan como listas", async () => {
    const result = await importDocx(fixture094());
    const comparative = all(result.content, "table")[1]!;
    const lists = all(comparative, "bulletList");
    expect(lists).toHaveLength(T94.sectors.length * 3);
    expect(all(comparative, "listItem")).toHaveLength(T94.sectors.length * 9);
    expect(all(comparative, "listItem").map(textOf)).toContain(T94.bullets[2]![2]);
  });

  test("bordes, relleno y alineación de cada celda", async () => {
    const result = await importDocx(fixture094());
    const [box, comparative, images] = all(result.content, "table");
    const head = comparative!.content![0]!.content![0]!;
    expect(head.type).toBe("tableHeader");
    expect(head.attrs).toMatchObject({ background: "#183b5b", borders: "1px solid #ffffff", valign: "middle" });
    expect(cellPadding(head.attrs?.padding)).toBe("0 8 0 8");
    expect(box!.content![0]!.content![0]!.attrs).toMatchObject({ background: "#eaf3f8", padding: "7 8 7 8" });
    // La tabla de imágenes no tiene bordes, como en el original.
    for (const cell of images!.content!.flatMap((row) => row.content ?? [])) expect(cell.attrs?.borders).toBe("none");
    expect(cellBorders("1px solid #ffffff|none|2px solid #000000|none")).not.toBeNull();
    expect(cellBorders("1px solid red")).toBeNull();
  });

  test("símbolos «·», w:sym de Symbol y Wingdings pasan a Unicode, y no se pierde ninguna palabra", async () => {
    const result = await importDocx(fixture094());
    const text = textOf(result.content);
    expect(text).toContain(T94.symbols);
    expect(text).toContain(T94.boxText);
    expect(text).toContain("•");
    expect(text).toContain("✓");
    expect(symbolChar("Symbol", "F0B7")).toBe("•");
    expect(symbolChar("Wingdings", "F0FC")).toBe("✓");
    expect(symbolChar("Wingdings", "F0A7")).toBe("▪");
    const got = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const counts = new Map<string, number>();
    for (const word of got) counts.set(word, (counts.get(word) ?? 0) + 1);
    for (const word of words094()) {
      expect(counts.get(word) ?? 0, word).toBeGreaterThan(0);
      counts.set(word, (counts.get(word) ?? 0) - 1);
    }
  });

  test("las fuentes que el navegador no tiene (Aptos, Play) pasan a una equivalente", async () => {
    const result = await importDocx(fixture094());
    const families = new Set(all(result.content, "text").flatMap((node) => (node.marks ?? []).map((mark) => mark.attrs?.fontFamily)).filter(Boolean));
    expect(families.has("Aptos")).toBe(false);
    expect(families.has("Play")).toBe(false);
  });
});
