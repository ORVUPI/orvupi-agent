import { describe, expect, test } from "vitest";
import { DOC_DOWNLOADS, exportEpub, exportHtmlZip, exportMarkdown, exportOdt, exportRtf } from "../../src/docs/downloads";
import { documentNode, heading, paragraph } from "../../src/docs/model";
import { unzip } from "../../src/sheets/zip";
import { es } from "../../src/i18n/messages";

const sample = documentNode([
  heading(1, "Informe"),
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Cifra " },
      { type: "text", text: "importante", marks: [{ type: "bold" }] },
      { type: "text", text: " y áéíóú" },
    ],
  },
  { type: "bulletList", content: ["uno", "dos"].map((item) => ({ type: "listItem", content: [paragraph(item)] })) },
]);

describe("descargas de documento", () => {
  test("Archivo → Descargar usa las etiquetas de Documentos", () => {
    expect(DOC_DOWNLOADS.map((item) => es[item.labelKey])).toEqual([
      "Microsoft Word (.docx)",
      "Documento PDF (.pdf)",
      "Formato OpenDocument (.odt)",
      "Texto sin formato (.txt)",
      "Formato de texto enriquecido (.rtf)",
      "Página web (.html, comprimido)",
      "Publicación EPUB (.epub)",
      "Markdown (.md)",
    ]);
  });

  test("markdown conserva título, negrita y lista", () => {
    const md = exportMarkdown(sample);
    expect(md).toContain("# Informe");
    expect(md).toContain("**importante**");
    expect(md).toContain("áéíóú");
    expect(md).toContain("- uno");
    expect(md).toContain("- dos");
  });

  test("rtf es un archivo de texto enriquecido", () => {
    const rtf = exportRtf("Informe", sample);
    expect(rtf.startsWith("{\\rtf1")).toBe(true);
    expect(rtf).toContain("Informe");
    expect(rtf).toContain("\\b ");
    expect(rtf).toContain("importante");
    expect(rtf).toContain("\\u225");
  });

  test("odt, epub y html comprimido son archivos utilizables", async () => {
    const odt = await unzip(exportOdt("Informe", sample));
    expect(new TextDecoder().decode(odt.get("mimetype"))).toBe("application/vnd.oasis.opendocument.text");
    const content = new TextDecoder().decode(odt.get("content.xml") ?? new Uint8Array());
    expect(content).toContain("importante");
    expect(content).toContain("uno");
    const epub = await unzip(exportEpub("Informe", sample, "es"));
    expect(new TextDecoder().decode(epub.get("mimetype"))).toBe("application/epub+zip");
    expect(new TextDecoder().decode(epub.get("OEBPS/chapter.xhtml") ?? new Uint8Array())).toContain("importante");
    const htmlZip = await unzip(exportHtmlZip("Informe", sample, "es"));
    const html = [...htmlZip.values()].map((bytes) => new TextDecoder().decode(bytes)).join("\n");
    expect(html).toContain("<strong>importante</strong>");
    expect(html).toContain("Informe");
  });
});
