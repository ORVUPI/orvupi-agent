import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

function studio(rel: string): string {
  return pathToFileURL(path.join(repoRoot(), "web/v2/studio", rel)).href;
}

async function load<T>(rel: string): Promise<T> {
  return (await import(studio(rel))) as T;
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe("studio fase 3 y 4", () => {
  test("el diseño 41 no borra el primero y un conflicto no pisa", async () => {
    const { blankDocument } = await load<{ blankDocument: (id: string) => { id: string; name: string; meta: { revision: number } } }>("lib/document.mjs");
    const projects = await load<{
      PROJECT_CAP: number;
      NEXT_KEY: string;
      saveProject: (storage: ReturnType<typeof memoryStorage>, doc: { id: string; name: string; meta: { revision: number } }) => { ok: boolean; reason?: string; revision?: number };
      listProjects: (storage: ReturnType<typeof memoryStorage>) => { id: string; meta?: { revision?: number } }[];
      listRecovery: (storage: ReturnType<typeof memoryStorage>) => { id: string }[];
      loadProject: (storage: ReturnType<typeof memoryStorage>, id: string) => { meta: { revision: number }; name: string } | null;
      recoverWrite: (storage: ReturnType<typeof memoryStorage>) => boolean;
    }>("lib/projects.mjs");
    const storage = memoryStorage();
    const first = blankDocument("square");
    assert.equal(projects.saveProject(storage, first).ok, true);
    for (let index = 1; index < projects.PROJECT_CAP; index += 1) {
      const doc = blankDocument("square");
      doc.name = `pieza ${index}`;
      assert.equal(projects.saveProject(storage, doc).ok, true);
    }
    const extra = blankDocument("square");
    extra.name = "pieza aparte";
    const refused = projects.saveProject(storage, extra);
    assert.equal(refused.ok, false);
    assert.equal(refused.reason, "cap");
    assert.equal(projects.listProjects(storage).length, 40);
    assert.equal(projects.listProjects(storage).some((item) => item.id === first.id), true);
    assert.equal(projects.listRecovery(storage).some((item) => item.id === extra.id), true);

    const fresh = memoryStorage();
    const doc = blankDocument("x");
    const saved = projects.saveProject(fresh, doc);
    assert.equal(saved.ok, true);
    doc.meta.revision = saved.revision || 0;
    const again = projects.saveProject(fresh, doc);
    assert.equal(again.ok, true);
    const stale = blankDocument("x");
    stale.id = doc.id;
    stale.meta.revision = 0;
    stale.name = "pisado";
    const conflict = projects.saveProject(fresh, stale);
    assert.equal(conflict.ok, false);
    assert.equal(conflict.reason, "conflict");
    assert.equal(projects.loadProject(fresh, doc.id)?.name, doc.name);
    assert.notEqual(projects.loadProject(fresh, doc.id)?.meta.revision, 0);

    const recovered = memoryStorage();
    const pending = blankDocument("doc");
    pending.name = "recuperado";
    recovered.setItem(projects.NEXT_KEY, JSON.stringify([pending]));
    assert.equal(projects.recoverWrite(recovered), true);
    assert.equal(projects.listProjects(recovered)[0]?.id, pending.id);
    assert.equal(recovered.getItem(projects.NEXT_KEY), null);
  });

  test("un archivo que se pasa del tope se rechaza entero", async () => {
    const docs = await load<{
      blankDocument: (id: string) => { v: number; layers: unknown[]; format: { width: number; height: number }; meta: { pages: unknown[][]; note: string } };
      exportProject: (doc: unknown) => { layers: unknown[]; format: { width: number; height: number }; meta: { pages: unknown[]; note?: string; revision?: number } };
      importProject: (input: unknown) => { layers: { props?: { text?: string } }[]; meta: { revision: number } };
      textLayer: (spec: { text: string; id?: string }) => unknown;
    }>("lib/document.mjs");
    const base = docs.exportProject(docs.blankDocument("square"));
    const many = docs.exportProject(docs.blankDocument("square"));
    many.layers = Array.from({ length: 49 }, (_, index) => docs.textLayer({ id: `t${index}`, text: "capa" }));
    assert.throws(() => docs.importProject(many), /limite-capas/);
    const pages = docs.exportProject(docs.blankDocument("deck"));
    pages.meta.pages = Array.from({ length: 9 }, () => []);
    assert.throws(() => docs.importProject(pages), /limite-paginas/);
    const long = docs.exportProject(docs.blankDocument("square"));
    long.layers = [{ type: "text", props: { text: "a".repeat(2001) } }];
    assert.throws(() => docs.importProject(long), /limite-texto/);
    const wide = docs.exportProject(docs.blankDocument("square"));
    wide.format.width = 3000;
    assert.throws(() => docs.importProject(wide), /limite-medida/);
    delete base.meta.revision;
    base.layers = [docs.textLayer({ text: "Sigue igual" })];
    const opened = docs.importProject(base);
    assert.equal(opened.layers[0]?.props?.text, "Sigue igual");
    assert.equal(opened.meta.revision, 0);
    assert.equal(opened.layers.length, 1);
  });

  test("el paquete lleva los píxeles y avisa la sustitución de fuentes", async () => {
    const { createDocument, imageLayer } = await load<{
      createDocument: (spec: unknown) => { id: string; layers: { src?: { id: string } }[] };
      imageLayer: (spec: unknown) => unknown;
    }>("lib/document.mjs");
    const { packDesign, unpackDesign, FONT_NOTICE } = await load<{
      packDesign: (doc: unknown, images: { id: string; width: number; height: number; rgba: Uint8Array }[]) => { fonts: { embedded?: boolean; bytes?: unknown }[]; fontNotice: string; images: { rgba: string }[]; missing: string[] };
      unpackDesign: (input: unknown) => { doc: { id: string }; images: Map<string, { rgba: Uint8Array }>; fontNotice: string };
      FONT_NOTICE: string;
    }>("lib/package.mjs");
    const { createImageStore } = await load<{
      createImageStore: () => { put: (project: string, layer: string, image: { width: number; height: number; rgba: Uint8Array }) => Promise<boolean>; copyProject: (from: string, to: string, ids: string[]) => Promise<boolean>; get: (project: string, layer: string) => Promise<{ rgba: Uint8Array } | null> };
    }>("lib/images.mjs");
    const rgba = new Uint8Array([9, 8, 7, 255]);
    const doc = createDocument({
      name: "Paquete local",
      format: { id: "square", width: 1080, height: 1080 },
      layers: [imageLayer({ id: "ly1", src: { kind: "user", id: "img1" } })],
    });
    const packed = packDesign(doc, [{ id: "img1", width: 1, height: 1, rgba }]);
    assert.equal(packed.fonts.every((font) => font.embedded === false && !font.bytes), true);
    assert.match(packed.fontNotice, /sustitu/);
    assert.equal(packed.missing.length, 0);
    const opened = unpackDesign(packed);
    assert.notEqual(opened.doc.id, doc.id);
    assert.equal(opened.images.get("img1")?.rgba[0], 9);
    assert.equal(opened.images.get("img1")?.rgba[2], 7);
    assert.equal(opened.fontNotice, FONT_NOTICE);
    const store = createImageStore();
    assert.equal(await store.put(doc.id, "img1", { width: 1, height: 1, rgba }), true);
    assert.equal(await store.copyProject(doc.id, "otro", ["img1"]), true);
    assert.equal((await store.get("otro", "img1"))?.rgba[1], 8);
    mkdirSync("/opt/cursor/artifacts/studio-fase3", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/studio-fase3/paquete.json", JSON.stringify(packed));
  });

  test("el PDF aplana las páginas pedidas a 96 ppp", async () => {
    const { pdfFromPages, PDF_SUBJECT } = await load<{
      pdfFromPages: (pages: { width: number; height: number; rgba: Uint8Array }[]) => Uint8Array;
      PDF_SUBJECT: string;
    }>("lib/pdf-raster.mjs");
    const pdf = pdfFromPages([
      { width: 2, height: 2, rgba: new Uint8Array(16).fill(255) },
      { width: 2, height: 1, rgba: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]) },
    ]);
    const text = new TextDecoder("latin1").decode(pdf);
    assert.equal(pdf[0], 0x25);
    assert.match(text, /Count 2/);
    assert.match(text, /DeviceRGB/);
    assert.match(text, /96 ppp/);
    assert.equal(text.includes("300"), false);
    assert.match(PDF_SUBJECT, /96 ppp/);
    assert.match(text, /0 0 1\.5000 0\.7500/);
    mkdirSync("/opt/cursor/artifacts/studio-fase3", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/studio-fase3/muestra.pdf", pdf);
  });

  test("la conversión a documento y a diapositivas declara lo que pierde", async () => {
    const docs = await load<{
      createDocument: (spec: unknown) => { id: string; format: { width: number; height: number } };
      textLayer: (spec: Record<string, unknown>) => unknown;
      rectLayer: (spec: Record<string, unknown>) => unknown;
    }>("lib/document.mjs");
    const bridge = await load<{
      conversionPreview: (doc: unknown, route: string) => { losses: string[]; keeps: string[]; dimension: string };
      toOrvdoc: (doc: unknown, options: { images: Map<string, unknown> }) => Promise<{ format: string; footer: string; content: { content: { type: string }[] }; id: string }>;
      toSlides: (doc: unknown, options: { images: Map<string, unknown> }) => Promise<{ format: string; version: number; slides: { items: { kind: string; x?: number; font?: string; text?: string; shape?: string }[] }[] }>;
    }>("lib/work-convert.mjs");
    const { workIdFromHash, workRecord, packageRevision, DESIGN_MIME } = await load<{
      workIdFromHash: (hash: string) => string;
      workRecord: (input: { id: string; name: string; kind: string; mime: string; size: number; contentHash: string; now: string }) => { blobKey: string; mime: string };
      packageRevision: (bytes: Uint8Array) => number | null;
      DESIGN_MIME: string;
    }>("lib/work-store.mjs");
    const doc = docs.createDocument({
      name: "Informe de pieza",
      format: { id: "deck", width: 1920, height: 1080 },
      layers: [
        docs.textLayer({ text: "Estrategia 2026", size: 72, fontId: "anton", x: 80, y: 80, w: 800, h: 140 }),
        docs.rectLayer({ x: 40, y: 400, w: 200, h: 80, fill: "#ff3070" }),
      ],
    });
    const asDoc = bridge.conversionPreview(doc, "doc");
    assert.match(asDoc.losses.join(" "), /Arial/);
    assert.match(asDoc.losses.join(" "), /fluye/);
    assert.match(asDoc.losses.join(" "), /tablas/);
    assert.match(asDoc.losses.join(" "), /captura/);
    const file = await bridge.toOrvdoc(doc, { images: new Map() });
    assert.equal(file.format, "orvupi-doc");
    assert.match(JSON.stringify(file.content), /Estrategia 2026/);
    assert.match(file.footer, new RegExp(doc.id));
    assert.equal(file.content.content.some((node) => node.type === "heading"), true);
    const asSlides = bridge.conversionPreview(doc, "slide");
    assert.match(asSlides.dimension, /960×540/);
    assert.match(asSlides.losses.join(" "), /Courier New|Arial/);
    const slides = await bridge.toSlides(doc, { images: new Map() });
    assert.equal(slides.format, "orvupi-slides");
    assert.equal(slides.version, 2);
    const text = slides.slides[0]?.items.find((item) => item.kind === "text");
    const shape = slides.slides[0]?.items.find((item) => item.kind === "shape");
    assert.equal(text?.x, 40);
    assert.equal(text?.font, "Arial");
    assert.equal(text?.text, "Estrategia 2026");
    assert.equal(shape?.shape, "rect");
    const native = bridge.conversionPreview(doc, "native");
    assert.match(native.losses.join(" "), /nube/);
    assert.equal(workIdFromHash("#/work/123e4567-e89b-12d3-a456-426614174000"), "123e4567-e89b-12d3-a456-426614174000");
    assert.equal(workIdFromHash("#/editor"), "");
    const record = workRecord({
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Informe de pieza",
      kind: "other",
      mime: DESIGN_MIME,
      size: 12,
      contentHash: "abc",
      now: "2026-10-25T00:00:00.000Z",
    });
    assert.equal(record.blobKey, "files/123e4567-e89b-12d3-a456-426614174000");
    assert.equal(record.mime, "application/vnd.orvupi.design+json");
    const packed = new TextEncoder().encode(JSON.stringify({ document: { meta: { revision: 4 } } }));
    assert.equal(packageRevision(packed), 4);
  });
});
