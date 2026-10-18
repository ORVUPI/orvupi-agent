import { describe, expect, test } from "vitest";
import { filterCommands, findBefore, findInSlices } from "../../src/docs/find";
import { exportHtml } from "../../src/docs/html";
import { countWords, docToText, documentNode, heading, paragraph } from "../../src/docs/model";
import { createOrvdoc, parseOrvdoc, serializeOrvdoc } from "../../src/docs/orvdoc";
import { exportPdf } from "../../src/docs/pdf";
import { WorkError } from "../../src/security/errors";
import { sanitizeName } from "../../src/security/names";

describe("documento", () => {
  test("el texto, el html y el formato propio conservan el contenido", () => {
    const content = documentNode([heading(1, "Informe"), paragraph("Cifra <script>alert(1)</script> y áéíóú")]);
    expect(docToText(content)).toContain("Informe");
    expect(docToText(content)).toContain("áéíóú");
    const html = exportHtml("Informe", content, "es");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    const file = createOrvdoc({ id: "11111111-1111-4111-8111-111111111111", title: "Informe", content });
    const parsed = parseOrvdoc(serializeOrvdoc(file));
    expect(parsed.title).toBe("Informe");
    expect(parsed.content).toEqual(content);
    expect(countWords(docToText(content)).words).toBeGreaterThan(1);
  });

  test("rechaza un formato de otra versión sin modificarlo", () => {
    expect(() => parseOrvdoc(JSON.stringify({ format: "orvupi-doc", version: 2, title: "A", id: "x", content: { type: "doc" } }))).toThrow(WorkError);
  });

  test("pdf válido en español", async () => {
    const bytes = await exportPdf("Informe", documentNode([paragraph("Información pública")]));
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  test("buscar dentro de un nodo de texto", () => {
    expect(findInSlices([{ text: "alfa beta", pos: 1 }], "beta", 1)).toEqual({ from: 6, to: 10 });
    expect(findInSlices([{ text: "alfa", pos: 1 }], "", 1)).toBeNull();
    expect(findBefore([{ text: "alfa beta alfa", pos: 1 }], "alfa", 11)).toEqual({ from: 1, to: 5 });
    expect(findBefore([{ text: "alfa beta alfa", pos: 1 }], "alfa", 1)).toBeNull();
  });

  test("el subíndice, la nota y el índice salen en el html", () => {
    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Capítulo" }] },
        { type: "contents" },
        { type: "paragraph", content: [{ type: "text", text: "H2O", marks: [{ type: "subscript" }] }, { type: "footnote", attrs: { n: 1, text: "nota" } }] },
      ],
    };
    const html = exportHtml("A", content, "es");
    expect(html).toContain("<sub>H2O</sub>");
    expect(html).toContain("ow-contents");
    expect(html).toContain("Capítulo");
    expect(docToText(content)).toContain("nota");
  });

  test("la paleta filtra por etiqueta", () => {
    const commands = [{ label: "Crear documento", keywords: "docs" }, { label: "Ajustes" }];
    expect(filterCommands(commands, "doc")).toHaveLength(1);
  });

  test("el nombre no admite separadores de ruta", () => {
    expect(sanitizeName(" ../informe ")).toBe("..-informe");
    expect(() => sanitizeName("   ")).toThrow(WorkError);
  });
});
