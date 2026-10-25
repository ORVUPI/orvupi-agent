import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

function readStudio(rel: string): string {
  return readFileSync(path.join(repoRoot(), "web/v2/studio", rel), "utf8");
}

type Layer = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  flipX?: boolean;
  props?: { text?: string; bold?: boolean; runs?: unknown[]; shape?: string; fill?: string; stroke?: string; strokeWidth?: number };
};

describe("studio fase 2 editor", () => {
  test("el ajuste usa el hueco real y no un margen fijo", async () => {
    const { fitScale } = await load<{ fitScale: (w: number, h: number, aw: number, bh: number) => number }>("lib/arrange.mjs");
    const wide = fitScale(1920, 1080, 640, 400);
    const tall = fitScale(794, 1123, 640, 400);
    assert.equal(wide, 640 / 1920);
    assert.equal(tall, 400 / 1123);
    assert.equal(fitScale(100, 100, 400, 400), 1);
    const app = readStudio("app.mjs");
    const views = readStudio("views.mjs");
    assert.equal(app.includes("window.innerWidth - 760"), false);
    assert.equal(views.includes("window.innerWidth - 760"), false);
    assert.match(app, /fitScale\(/);
    assert.match(views, /id: "abrir-work"/);
    assert.match(views, /workNota/);
    assert.match(readStudio("studio.css"), /white-space:\s*nowrap/);
    assert.equal(readStudio("studio.css").includes("zoom:"), false);
  });

  test("el texto guarda fragmentos, tamaño de una unidad y el mismo estilo", async () => {
    const api = await load<{
      applySpan: (text: string, runs: unknown[], start: number, end: number, patch: Record<string, unknown>, base: Record<string, unknown>) => { start: number; end: number; bold?: boolean }[];
      piecesOf: (text: string, runs: unknown[], base: Record<string, unknown>) => { text: string; bold: boolean; italic: boolean; underline: boolean }[];
      spanIs: (text: string, runs: unknown[], start: number, end: number, key: string, base: Record<string, unknown>) => boolean;
    }>("lib/text-style.mjs");
    const base = { bold: false, italic: false, underline: false, color: "#102032", size: 32 };
    const text = "Hola mundo";
    const runs = api.applySpan(text, [], 0, 4, { bold: true }, base);
    const parts = api.piecesOf(text, runs, base);
    assert.equal(parts[0]?.text, "Hola");
    assert.equal(parts[0]?.bold, true);
    assert.equal(parts[1]?.bold, false);
    assert.equal(api.spanIs(text, runs, 0, 4, "bold", base), true);
    assert.equal(api.spanIs(text, runs, 5, 10, "bold", base), false);
    const off = api.applySpan(text, runs, 0, 4, { bold: false }, base);
    assert.equal(api.piecesOf(text, off, base).some((part) => part.bold), false);
    const app = readStudio("app.mjs");
    const size = app.slice(app.indexOf("dataset.size"));
    assert.match(size, /const delta = buttonNode\.dataset\.size === "up" \? 1 : -1/);
    assert.match(readStudio("views.mjs"), /data-edit/);
    assert.match(readStudio("views.mjs"), /id: "tamano-texto"/);
    assert.match(readStudio("views.mjs"), /id: "interlineado"/);
  });

  test("negrita, círculo, volteo y páginas sobreviven al documento y al raster", async () => {
    const docs = await load<{
      createDocument: (spec: unknown) => { layers: Layer[]; format: { width: number; height: number } };
      textLayer: (spec: Record<string, unknown>) => Layer;
      rectLayer: (spec: Record<string, unknown>) => Layer;
      imageLayer: (spec: Record<string, unknown>) => Layer;
      importProject: (input: string) => { layers: Layer[] };
      exportProject: (doc: unknown) => unknown;
    }>("lib/document.mjs");
    const { renderDocument } = await load<{
      renderDocument: (doc: unknown) => Promise<{ rgba: Uint8ClampedArray; width: number; height: number }>;
    }>("lib/compose.mjs");
    const plain = docs.createDocument({
      format: { id: "custom", width: 240, height: 80 },
      background: { type: "solid", fill: "#FFFFFF" },
      layers: [docs.textLayer({ x: 8, y: 8, w: 220, h: 64, text: "Aa", size: 42, color: "#102032", fontId: "barlow" })],
    });
    const bold = docs.createDocument({
      format: { id: "custom", width: 240, height: 80 },
      background: { type: "solid", fill: "#FFFFFF" },
      layers: [docs.textLayer({ x: 8, y: 8, w: 220, h: 64, text: "Aa", size: 42, color: "#102032", fontId: "barlow", bold: true, underline: true })],
    });
    const plainPng = await renderDocument(plain);
    const boldPng = await renderDocument(bold);
    const ink = (rgba: Uint8ClampedArray) => {
      let n = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        const r = rgba[i] ?? 255;
        const g = rgba[i + 1] ?? 255;
        const b = rgba[i + 2] ?? 255;
        if (r < 250 || g < 250 || b < 250) n += 1;
      }
      return n;
    };
    assert.ok(ink(boldPng.rgba) > ink(plainPng.rgba));
    const circle = docs.rectLayer({ x: 0, y: 0, w: 40, h: 40, fill: "#FF3070", shape: "ellipse" });
    assert.equal(circle.props?.shape, "ellipse");
    const round = docs.importProject(JSON.stringify(docs.exportProject(docs.createDocument({
      format: { id: "custom", width: 80, height: 80 },
      layers: [circle],
    }))));
    assert.equal(round.layers[0]?.props?.shape, "ellipse");
    const painted = await renderDocument(docs.createDocument({
      format: { id: "custom", width: 40, height: 40 },
      background: { type: "solid", fill: "#FFFFFF" },
      layers: [docs.rectLayer({ x: 0, y: 0, w: 40, h: 40, fill: "#FF3070", shape: "ellipse", z: 1 })],
    }));
    const corner = painted.rgba[1] ?? 0;
    const center = painted.rgba[(20 * painted.width + 20) * 4 + 1] ?? 255;
    assert.equal(corner, 255);
    assert.ok(center < 80);
    const image = docs.imageLayer({ x: 0, y: 0, w: 20, h: 20, src: { kind: "catalog", id: "vacio" }, flipX: true });
    assert.equal(image.flipX, true);
    const back = docs.importProject(JSON.stringify(docs.exportProject(docs.createDocument({
      format: { id: "custom", width: 40, height: 40 },
      layers: [image],
    }))));
    assert.equal(back.layers[0]?.flipX, true);
  });

  test("distribuir, duplicar y borrar páginas, y el recorte", async () => {
    const arrange = await load<{
      distributeLayers: (doc: { layers: { id: string; x: number; y: number; w: number; h: number; locked?: boolean }[] }, ids: string[], axis: string) => unknown;
      duplicatePageAt: (pages: unknown[][], index: number, mint: () => string) => number | null;
      removePageAt: (pages: unknown[][], index: number) => boolean;
      movePageAt: (pages: unknown[][], from: number, to: number) => boolean;
      proportionalSize: (origin: { w: number; h: number }, dw: number, dh: number, lock: boolean) => { w: number; h: number };
      shiftCrop: (crop: { x: number; y: number; w: number; h: number }, edge: string, dx: number, dy: number) => { x: number; w: number };
    }>("lib/arrange.mjs");
    const doc = {
      layers: [
        { id: "a", x: 0, y: 0, w: 10, h: 10 },
        { id: "b", x: 20, y: 0, w: 10, h: 10 },
        { id: "c", x: 80, y: 0, w: 10, h: 10 },
      ],
    };
    arrange.distributeLayers(doc, ["a", "b", "c"], "x");
    assert.equal(doc.layers[0]?.x, 0);
    assert.equal(doc.layers[2]?.x, 80);
    assert.equal(doc.layers[1]?.x, 40);
    const pages = [[{ id: "p1" }], [{ id: "p2" }]];
    const at = arrange.duplicatePageAt(pages, 0, () => "nuevo");
    assert.equal(at, 1);
    assert.equal(pages.length, 3);
    assert.notEqual((pages[1]?.[0] as { id: string }).id, "p1");
    assert.equal(arrange.removePageAt([[{ id: "solo" }]], 0), false);
    assert.equal(arrange.removePageAt(pages, 2), true);
    assert.equal(arrange.movePageAt(pages, 0, 1), true);
    const sized = arrange.proportionalSize({ w: 40, h: 20 }, 20, 5, true);
    assert.equal(sized.w, 60);
    assert.equal(sized.h, 30);
    const crop = arrange.shiftCrop({ x: 10, y: 10, w: 40, h: 40 }, "e", 6, 0);
    assert.equal(crop.w, 46);
    assert.equal(crop.x, 10);
  });
});
