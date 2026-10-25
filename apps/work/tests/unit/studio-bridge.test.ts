import { mkdirSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { exportDocx } from "../../src/docs/docx";
import { parseOrvdoc } from "../../src/docs/orvdoc";
import { studioDesignPath, STUDIO_DESIGN_MIME } from "../../src/routing/paths";
import { parseSlides } from "../../src/slides/model";
import { exportPptx } from "../../src/slides/pptx";

type StudioDoc = {
  id: string;
  format: { width: number; height: number };
  layers: unknown[];
};

type StudioApi = {
  createDocument: (spec: unknown) => StudioDoc;
  textLayer: (spec: Record<string, unknown>) => unknown;
  rectLayer: (spec: Record<string, unknown>) => unknown;
};

type ConvertApi = {
  toOrvdoc: (doc: StudioDoc, options: { images: Map<string, unknown> }) => Promise<{
    format: string;
    title: string;
    content: unknown;
    header: string;
    footer: string;
    id: string;
  }>;
  toSlides: (doc: StudioDoc, options: { images: Map<string, unknown> }) => Promise<unknown>;
};

async function studio<T>(rel: string): Promise<T> {
  const href = new URL(`../../../../web/v2/studio/${rel}`, import.meta.url).href;
  return (await import(href)) as T;
}

function zipEntry(bytes: Uint8Array, name: string): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const entry = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    const start = offset + 30 + nameLen + extraLen;
    const data = bytes.subarray(start, start + compSize);
    if (entry === name) {
      const raw = method === 0 ? data : inflateRawSync(data);
      return new TextDecoder().decode(raw);
    }
    offset = start + compSize;
  }
  return "";
}

describe("puente Studio y Work", () => {
  test("un diseño nativo apunta a Studio y el derivado abre en Docs y Slides", async () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(studioDesignPath({ id, mime: STUDIO_DESIGN_MIME, kind: "other" })).toBe(`/studio/#/work/${id}`);
    expect(studioDesignPath({ id, mime: "application/pdf", kind: "pdf" })).toBeNull();

    const docs = await studio<StudioApi>("lib/document.mjs");
    const bridge = await studio<ConvertApi>("lib/work-convert.mjs");
    const doc = docs.createDocument({
      name: "Informe de pieza",
      format: { id: "deck", width: 1920, height: 1080 },
      layers: [
        docs.textLayer({ text: "Estrategia 2026", size: 72, fontId: "anton", x: 80, y: 80, w: 800, h: 140 }),
        docs.rectLayer({ x: 40, y: 400, w: 200, h: 80, fill: "#ff3070" }),
      ],
    });
    const orvdoc = await bridge.toOrvdoc(doc, { images: new Map() });
    const parsed = parseOrvdoc(JSON.stringify(orvdoc));
    expect(parsed.footer).toContain(String(doc.id));
    expect(JSON.stringify(parsed.content)).toContain("Estrategia 2026");
    const docx = await exportDocx(parsed.title, parsed.content, parsed.header, parsed.footer);
    expect(docx[0]).toBe(0x50);
    expect(docx[1]).toBe(0x4b);
    expect(zipEntry(docx, "word/document.xml")).toContain("Estrategia 2026");

    const slides = await bridge.toSlides(doc, { images: new Map() });
    const parsedSlides = parseSlides(JSON.stringify(slides));
    expect(parsedSlides.slides[0]?.items.some((item) => item.kind === "text" && item.text === "Estrategia 2026")).toBe(true);
    const pptx = await exportPptx(parsedSlides);
    expect(pptx[0]).toBe(0x50);
    expect(zipEntry(pptx, "ppt/slides/slide1.xml")).toContain("Estrategia 2026");

    mkdirSync("/opt/cursor/artifacts/studio-fase3", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/studio-fase3/informe.docx", docx);
    writeFileSync("/opt/cursor/artifacts/studio-fase3/presentacion.pptx", pptx);
  });
});
