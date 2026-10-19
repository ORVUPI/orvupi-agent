// @vitest-environment jsdom
import { inflateSync } from "node:zlib";
import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, describe, expect, it } from "vitest";
import { cleanInput, cleanOutput, isDegenerate } from "../../src/ai/clean";
import { markdownToDoc, markdownToNodes, markdownToPlain, parseMarkdown } from "../../src/ai/markdown";
import { exportDocx } from "../../src/docs/docx";
import { importDocx } from "../../src/docs/docx-import";
import { exportPdf } from "../../src/docs/pdf";
import { docToText } from "../../src/docs/model";
import { splitText } from "../../src/ai/prompts";

beforeAll(() => {
  (globalThis as { Blob: unknown }).Blob = NodeBlob;
});

const BIG = `data:image/png;base64,${"iVBORw0KGgoAAAANSUhEUgAA".repeat(40000)}`;
const DIRTY = `# Informe de riesgos

La prevención de riesgos laborales protege la salud.
![](${BIG})
![logo de la empresa](https://example.com/${"a".repeat(300)}.png)
<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ${"Z".repeat(500)}">
Más información en [la guía](https://www.insst.es/documents/94886/${"x".repeat(200)}).
!!!!!!!!!!!!!!!!!!!!!!
La empresa debe evaluar los riesgos y formar a la plantilla.`;

describe("ORVUPI AI: texto limpio para el modelo", () => {
  it("quita imágenes, data URLs, URLs largas y marcado; conserva el texto y los alt", () => {
    const clean = cleanInput(DIRTY);
    expect(clean).not.toMatch(/!\[|\]\(|data:|base64|<img|!!!!/);
    expect(clean).toContain("La prevención de riesgos laborales protege la salud.");
    expect(clean).toContain("logo de la empresa");
    expect(clean).toContain("la guía");
    expect(clean).toContain("La empresa debe evaluar los riesgos");
    expect(clean.length).toBeLessThan(400);
    expect(splitText(clean)).toHaveLength(1);
  });

  it("detecta la salida basura de la captura de Cristian y acepta un resumen normal", () => {
    expect(isDegenerate("![](![](!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")).toBe(true);
    expect(isDegenerate("![](https://!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")).toBe(true);
    expect(isDegenerate("la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud la salud")).toBe(true);
    expect(isDegenerate("")).toBe(true);
    expect(isDegenerate("- La prevención protege la salud de la plantilla.\n- La empresa evalúa los riesgos.\n- Hay que formar e informar.")).toBe(false);
    expect(isDegenerate("**Resumen**\n\n1. Presupuesto de 2026: 12.500 € en total.\n2. Plazo: 3 meses.")).toBe(false);
    expect(cleanOutput("- Uno ![](x)\n- Dos!!!!!!")).toBe("- Uno\n- Dos!");
  });
});

describe("ORVUPI AI: resultado con formato", () => {
  const MD = "# Resumen\n\nTexto con **negrita** y *cursiva*.\n\n- Primera idea\n- Segunda idea\n\n1. Paso uno\n2. Paso dos";
  it("convierte títulos, listas, negrita y cursiva", () => {
    const blocks = parseMarkdown(MD);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "bullet", "ordered"]);
    const nodes = markdownToNodes(MD);
    expect(nodes[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(JSON.stringify(nodes[1])).toContain('"marks":[{"type":"bold"}]');
    expect(nodes[2]!.type).toBe("bulletList");
    expect(nodes[3]!.type).toBe("orderedList");
    expect(markdownToPlain(MD)).not.toMatch(/\*\*|^#/m);
  });

  it("Word (.docx): se exporta y se vuelve a importar en Work con el formato", async () => {
    const bytes = await exportDocx("Resumen · Informe", markdownToDoc(MD), "", "");
    expect(Buffer.from(bytes.subarray(0, 2)).toString("latin1")).toBe("PK");
    const back = await importDocx(bytes);
    const json = JSON.stringify(back.content);
    expect(json).toContain('"type":"heading"');
    expect(json).toContain('"type":"bulletList"');
    expect(json).toContain('"type":"orderedList"');
    expect(json).toContain('"type":"bold"');
    const text = docToText(back.content);
    for (const t of ["Resumen", "negrita", "Primera idea", "Paso dos"]) expect(text).toContain(t);
  });

  it("PDF: es válido y contiene el texto", async () => {
    const bytes = await exportPdf("Resumen · Informe", markdownToDoc(MD));
    const raw = Buffer.from(bytes);
    expect(raw.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    let text = "";
    const re = /stream\r?\n/g;
    for (let m = re.exec(raw.toString("latin1")); m; m = re.exec(raw.toString("latin1"))) {
      const start = m.index + m[0].length;
      const end = raw.indexOf("endstream", start);
      try { text += inflateSync(raw.subarray(start, end)).toString("latin1"); } catch { text += raw.subarray(start, end).toString("latin1"); }
    }
    const decoded = text.replace(/<([0-9A-Fa-f]+)>/g, (_, hex: string) => Buffer.from(hex, "hex").toString("latin1")).replace(/\((.*?)\)/g, "$1");
    for (const t of ["Primera idea", "Paso dos", "negrita"]) expect(decoded).toContain(t);
  });
});
