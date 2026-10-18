// @vitest-environment jsdom
import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, describe, expect, test } from "vitest";
import { exportDocx } from "../../src/docs/docx";
import { importDocx, type DocxImport } from "../../src/docs/docx-import";
import type { JsonNode } from "../../src/docs/model";
import { unzip } from "../../src/sheets/zip";
import { fixture082 } from "../fixtures/docx-082";

beforeAll(() => {
  (globalThis as { Blob: unknown }).Blob = NodeBlob;
});

function all(node: JsonNode): JsonNode[] {
  return [node, ...(node.content ?? []).flatMap(all)];
}
const ofType = (doc: JsonNode, type: string) => all(doc).filter((node) => node.type === type);

function check(imported: DocxImport, label: string) {
  const doc = imported.content;
  // 1) Formas y cuadros de texto
  const shapes = ofType(doc, "docShape");
  expect(shapes.length, label).toBeGreaterThanOrEqual(5);
  const box = shapes.find((shape) => shape.attrs?.text === "Cuadro ORVUPI");
  expect(box?.attrs?.wrap, label).toBe("square");
  const ellipse = shapes.find((shape) => shape.attrs?.text === "Elipse");
  expect(ellipse?.attrs?.shape, label).toBe("ellipse");
  expect(ellipse?.attrs?.wrap, label).toBe("behind");
  expect(ellipse?.attrs?.fill, label).toBe("#ffd7e5");
  expect(shapes.some((shape) => shape.attrs?.text === "Cuadro VML"), label).toBe(true);
  expect(shapes.some((shape) => shape.attrs?.text === "Grupo B"), label).toBe(true);
  // 2) Notas
  const notes = ofType(doc, "footnote");
  expect(notes.filter((note) => note.attrs?.kind !== "end").map((note) => note.attrs?.text), label).toEqual(["Primera nota al pie de ORVUPI.", "Segunda nota."]);
  expect(notes.filter((note) => note.attrs?.kind === "end").map((note) => note.attrs?.text), label).toEqual(["Nota final del documento."]);
  // 3) Secciones
  const sections = ofType(doc, "section");
  expect(sections.length, label).toBe(2);
  expect(sections[1]!.attrs, label).toMatchObject({ columns: 2, orientation: "landscape" });
  // 4) Comentarios
  const open = imported.comments.find((comment) => comment.body === "Revisa esta frase.");
  expect(open?.quote, label).toBe("Texto comentado");
  expect(open?.replies?.map((reply) => reply.body), label).toEqual(["Hecho."]);
  expect(imported.comments.find((comment) => comment.body === "Ya está bien.")?.resolved, label).toBe(true);
  const marked = all(doc).filter((node) => (node.marks ?? []).some((mark) => mark.type === "comment"));
  expect(marked.map((node) => node.text).join(""), label).toContain("Texto comentado");
  // 5) Imágenes flotantes
  const wraps = ofType(doc, "image").map((image) => image.attrs?.wrap);
  expect(wraps, label).toEqual(expect.arrayContaining(["square", "topBottom", "behind", "front"]));
  const top = ofType(doc, "image").find((image) => image.attrs?.wrap === "topBottom");
  expect(top?.attrs?.offsetX, label).toBe(100);
  // 6) Fila de encabezado
  const table = ofType(doc, "table")[0]!;
  expect(table.content?.[0]?.content?.every((cell) => cell.type === "tableHeader"), label).toBe(true);
  expect(table.content?.length, label).toBe(61);
}

describe("DOCX 0.8.2: objetos, notas, secciones y comentarios", () => {
  test("importa cada función del fixture", async () => {
    check(await importDocx(fixture082()), "import");
  });

  test("ida y vuelta DOCX → ORVUPI → DOCX → ORVUPI conserva todo", async () => {
    const first = await importDocx(fixture082());
    const bytes = await exportDocx("Prueba", first.content, "", "", false, { pageSize: first.pageSize, pageOrientation: first.pageOrientation, pageMargin: first.pageMargin, columns: first.columns, comments: first.comments });
    const files = await unzip(bytes);
    const xml = new TextDecoder().decode(files.get("word/document.xml"));
    expect(xml).toContain("wps:wsp");
    expect(xml).toContain("w:footnoteReference");
    expect(xml).toContain("w:endnoteReference");
    expect(xml).toContain("w:commentRangeStart");
    expect(xml).toContain('w:num="2"');
    expect(xml).toContain("w:tblHeader");
    expect(xml).toContain('behindDoc="1"');
    expect(xml).toContain("wp:wrapSquare");
    expect(xml).toContain("wp:wrapTopAndBottom");
    expect(files.has("word/commentsExtended.xml")).toBe(true);
    check(await importDocx(bytes), "roundtrip");
  });
});
