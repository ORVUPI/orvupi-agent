// @vitest-environment jsdom
import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, describe, expect, test } from "vitest";
import { exportDocx } from "../../src/docs/docx";
import { importDocx } from "../../src/docs/docx-import";
import { htmlImages, imageAttrs, imageFilesOf } from "../../src/docs/image-paste";
import type { JsonNode } from "../../src/docs/model";
import { zipStore } from "../../src/sheets/zip";
import { docxFixture, FIXTURE_PNG } from "../fixtures/docx";

// jsdom no trae Blob.stream(), que usa la descompresión del ZIP.
beforeAll(() => {
  (globalThis as { Blob: unknown }).Blob = NodeBlob;
});

const PNG = FIXTURE_PNG;
const enc = (text: string) => new TextEncoder().encode(text);
const fixture = docxFixture;

function texts(node: JsonNode): JsonNode[] {
  if (node.type === "text") return [node];
  return (node.content ?? []).flatMap(texts);
}
const marked = (node: JsonNode, type: string) => (node.marks ?? []).some((mark) => mark.type === type);

describe("importación DOCX fiel", () => {
  test("negrita dentro de una línea, estilos por tramo, imagen, salto de página, listas, tabla y enlace", async () => {
    const result = await importDocx(fixture());
    const blocks = result.content.content ?? [];
    expect(blocks[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(marked(texts(blocks[0]!)[0]!, "bold")).toBe(true);

    const line = blocks[1]!;
    expect(line.attrs).toMatchObject({ textAlign: "center", lineHeight: "1.5", spaceAfter: 12 });
    const runs = texts(line);
    expect(runs.map((run) => run.text).join("")).toBe("Texto con negrita y estilo fuerte fin");
    expect(marked(runs.find((run) => run.text === "Texto con ")!, "bold")).toBe(false);
    expect(marked(runs.find((run) => run.text === "negrita")!, "bold")).toBe(true);
    const styled = runs.find((run) => run.text === "estilo")!;
    expect(marked(styled, "italic") && marked(styled, "underline")).toBe(true);
    expect(styled.marks?.find((mark) => mark.type === "textStyle")?.attrs).toMatchObject({ color: "#c00000", fontSize: "14pt", fontFamily: "Georgia" });
    expect(marked(runs.find((run) => run.text === " fuerte")!, "bold")).toBe(true);

    const image = blocks[2]!;
    expect(image.type).toBe("image");
    expect(image.attrs).toMatchObject({ width: 200, height: 100, align: "center", alt: "Una foto" });
    expect(String(image.attrs?.src)).toMatch(/^data:image\/png;base64,iVBOR/);
    expect(result.images).toBe(1);

    expect(blocks.slice(3, 6).map((block) => block.type)).toEqual(["paragraph", "pageBreak", "paragraph"]);
    expect(blocks[6]).toMatchObject({ type: "bulletList" });
    expect(JSON.stringify(blocks[6])).toContain('"bulletList"');
    expect(JSON.stringify(blocks[6]?.content?.[0])).toContain("Uno.a");
    expect(blocks[7]).toMatchObject({ type: "orderedList" });
    expect(blocks[8]?.type).toBe("table");
    expect(marked(texts(blocks[8]!)[0]!, "bold")).toBe(true);
    expect(texts(blocks[9]!)[0]?.marks?.find((mark) => mark.type === "link")?.attrs?.href).toBe("https://orvupi.com/");
    expect(result).toMatchObject({ header: "Cabecera ORVUPI", footer: "Pie", pageNumber: true, pageSize: "a4", pageMargin: "normal" });
  });

  test("ida y vuelta: importar y exportar a DOCX conserva negrita, imagen y salto de página", async () => {
    const first = await importDocx(fixture());
    const bytes = await exportDocx("Informe", first.content, first.header, first.footer, first.pageNumber, first);
    const second = await importDocx(bytes);
    const blocks = second.content.content ?? [];
    const runs = blocks.flatMap(texts);
    expect(marked(runs.find((run) => run.text === "negrita")!, "bold")).toBe(true);
    expect(marked(runs.find((run) => run.text?.includes("Texto con"))!, "bold")).toBe(false);
    const styled = runs.find((run) => run.text === "estilo")!;
    expect(styled.marks?.find((mark) => mark.type === "textStyle")?.attrs).toMatchObject({ color: "#c00000", fontSize: "14pt", fontFamily: "Georgia" });
    const image = blocks.find((block) => block.type === "image");
    expect(image?.attrs).toMatchObject({ width: 200, height: 100, align: "center" });
    expect(blocks.filter((block) => block.type === "pageBreak")).toHaveLength(1);
    expect(blocks.some((block) => block.type === "bulletList")).toBe(true);
    expect(blocks.some((block) => block.type === "orderedList")).toBe(true);
    expect(blocks.some((block) => block.type === "table")).toBe(true);
    expect(second.header).toBe("Cabecera ORVUPI");
  });

  test("un DOCX sin document.xml se rechaza", async () => {
    await expect(importDocx(zipStore([{ name: "x.txt", data: enc("x") }]))).rejects.toThrow();
  });
});

describe("pegar imágenes", () => {
  test("detecta capturas del portapapeles y <img> en el HTML pegado", () => {
    const file = new File([Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))], "captura.png", { type: "image/png" });
    const data = { files: [file], items: [] } as unknown as DataTransfer;
    expect(imageFilesOf(data)).toHaveLength(1);
    const viaItems = { files: [], items: [{ kind: "file", type: "image/png", getAsFile: () => file }] } as unknown as DataTransfer;
    expect(imageFilesOf(viaItems)).toHaveLength(1);
    expect(imageFilesOf({ files: [new File(["x"], "a.txt", { type: "text/plain" })], items: [] } as unknown as DataTransfer)).toHaveLength(0);
    const found = htmlImages(`<meta charset="utf-8"><img src="data:image/png;base64,${PNG}"><img src="https://www.google.com/logo.png">`);
    expect(found.data).toHaveLength(1);
    expect(found.remote).toBe(1);
    expect(imageAttrs({ src: "data:image/png;base64,AAAA", width: 1204, height: 600, alt: "x" })).toMatchObject({ width: 602, height: 300 });
  });
});
