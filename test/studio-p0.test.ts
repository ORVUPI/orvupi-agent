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

function memoryStorage(opts: { failProjects?: boolean } = {}) {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key: string, value: string) => {
      if (opts.failProjects && key === "orvupi-studio-projects") throw new Error("quota");
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("studio p0", () => {
  test("el borrador v1 se abre como proyecto y la clave antigua sigue", async () => {
    const { DRAFT_KEY } = await load<{ DRAFT_KEY: string }>("lib/draft.mjs");
    const projects = await load<{
      ADOPTED_KEY: string;
      adoptLegacyDraft: (storage: ReturnType<typeof memoryStorage>) => { id: string; meta: { optionalLabel: string } } | null;
      listProjects: (storage: ReturnType<typeof memoryStorage>) => { id: string }[];
    }>("lib/projects.mjs");
    const storage = memoryStorage();
    const raw = JSON.stringify({
      v: 1,
      templateId: "meme",
      formatId: "square",
      avatarId: "orvupi-avatar",
      fondoId: "fondo-claro",
      token: "ORVUPI",
      title: "Hola",
      body: "Un meme de la comunidad",
    });
    storage.setItem(DRAFT_KEY, raw);
    const doc = projects.adoptLegacyDraft(storage);
    assert.ok(doc);
    assert.equal(doc.meta.optionalLabel, "ORVUPI");
    assert.equal(storage.getItem(DRAFT_KEY), raw);
    assert.equal(storage.getItem(projects.ADOPTED_KEY), raw);
    assert.equal(projects.listProjects(storage).length, 1);
    assert.equal(projects.adoptLegacyDraft(storage), null);
    assert.equal(projects.listProjects(storage).length, 1);
    assert.equal(readFileSync(path.join(repoRoot(), "web/v2/studio/lib/projects.mjs"), "utf8").includes("removeItem"), false);
  });

  test("si no cabe el proyecto, no se marca el borrador como copiado", async () => {
    const { DRAFT_KEY } = await load<{ DRAFT_KEY: string }>("lib/draft.mjs");
    const { ADOPTED_KEY, adoptLegacyDraft } = await load<{
      ADOPTED_KEY: string;
      adoptLegacyDraft: (storage: ReturnType<typeof memoryStorage>) => unknown;
    }>("lib/projects.mjs");
    const storage = memoryStorage({ failProjects: true });
    storage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, templateId: "meme", formatId: "square", title: "Hola", body: "Cuerpo" }));
    assert.equal(adoptLegacyDraft(storage), null);
    assert.equal(storage.getItem(ADOPTED_KEY), null);
    assert.ok(storage.getItem(DRAFT_KEY));
  });

  test("guardar, abrir, duplicar y borrar un proyecto", async () => {
    const { blankDocument } = await load<{
      blankDocument: (id: string) => { id: string; name: string; format: { width: number; height: number } };
    }>("lib/document.mjs");
    const { saveProject, loadProject, duplicateProject, deleteProject, listProjects } = await load<{
      saveProject: (storage: ReturnType<typeof memoryStorage>, doc: { id: string; name: string }) => { ok: boolean; reason?: string };
      loadProject: (storage: ReturnType<typeof memoryStorage>, id: string) => { name: string; format: { id: string; width: number; height: number } } | null;
      duplicateProject: (storage: ReturnType<typeof memoryStorage>, id: string) => { id: string; name: string } | null;
      deleteProject: (storage: ReturnType<typeof memoryStorage>, id: string) => void;
      listProjects: (storage: ReturnType<typeof memoryStorage>) => { id: string }[];
    }>("lib/projects.mjs");
    const storage = memoryStorage();
    const doc = blankDocument("x");
    assert.equal(doc.format.width, 1600);
    assert.equal(doc.format.height, 900);
    assert.equal(saveProject(storage, doc).ok, true);
    const opened = loadProject(storage, doc.id);
    assert.equal(opened?.format.id, "x");
    assert.equal(opened?.format.width, 1600);
    const copy = duplicateProject(storage, doc.id);
    assert.ok(copy);
    assert.notEqual(copy.id, doc.id);
    assert.match(copy.name, /copia$/);
    assert.equal(listProjects(storage).length, 2);
    deleteProject(storage, doc.id);
    assert.equal(loadProject(storage, doc.id), null);
    assert.equal(listProjects(storage).length, 1);
    const full = memoryStorage({ failProjects: true });
    const failed = saveProject(full, blankDocument("square"));
    assert.equal(failed.ok, false);
    assert.equal(failed.reason, "quota");
  });

  test("filtros, orden, grupo y solape", async () => {
    const docApi = await load<{
      createDocument: (spec: { layers: unknown[]; format?: { id: string; width: number; height: number } }) => {
        layers: { id: string; x: number; z: number; groupId: string; locked: boolean; src?: { id: string } }[];
        format: { width: number };
      };
      rectLayer: (spec: { id: string; x: number; y: number; w: number; h: number; z: number }) => unknown;
      imageLayer: (spec: { id: string; src: { kind: string; id: string } }) => unknown;
      bringToFront: (doc: { layers: { id: string; z: number }[] }, id: string) => void;
      reorderLayers: (doc: { layers: { id: string; z: number }[] }, ids: string[]) => void;
      groupLayers: (doc: { layers: { id: string; groupId: string }[] }, ids: string[]) => string;
      lockLayers: (doc: { layers: { id: string; locked: boolean; groupId: string }[] }, ids: string[], locked: boolean) => void;
      moveLayer: (doc: { layers: { id: string; x: number; locked: boolean; groupId: string }[] }, id: string, dx: number, dy: number) => void;
      duplicateLayer: (doc: { layers: { id: string; src?: { id: string } }[] }, id: string) => { id: string; src?: { id: string } } | null;
      overlappingIds: (doc: unknown, id: string) => string[];
      alignLayers: (doc: { layers: { id: string; x: number }[]; format: { width: number } }, ids: string[], mode: string) => void;
    }>("lib/document.mjs");
    const { canExport } = await load<{ canExport: (doc: unknown) => boolean }>("lib/document.mjs");
    const { filterPlantillas, instantiate, PLANTILLAS } = await load<{
      PLANTILLAS: { id: string; precio: string }[];
      filterPlantillas: (query: { formato?: string; precio?: string; uso?: string; text?: string }) => { id: string }[];
      instantiate: (id: string) => { templateId: string; format: { width: number; height: number } } | null;
    }>("lib/plantillas.mjs");
    assert.equal(PLANTILLAS.length, 6);
    assert.equal(PLANTILLAS.every((item) => item.precio === "gratis"), true);
    assert.equal(filterPlantillas({ precio: "gratis" }).length, 6);
    assert.equal(filterPlantillas({ formato: "x" }).length, 0);
    assert.equal(filterPlantillas({ uso: "meme" }).length, 2);
    assert.equal(filterPlantillas({ text: "viñeta" }).length, 1);
    for (const item of PLANTILLAS) {
      const doc = instantiate(item.id);
      assert.equal(doc?.templateId, item.id);
      assert.ok(doc && doc.format.width >= 1080 && doc.format.height >= 1080);
      assert.equal(canExport(doc), true, item.id);
    }
    const a = docApi.rectLayer({ id: "a", x: 0, y: 0, w: 100, h: 100, z: 1 });
    const b = docApi.rectLayer({ id: "b", x: 40, y: 40, w: 100, h: 100, z: 2 });
    const c = docApi.rectLayer({ id: "c", x: 800, y: 800, w: 40, h: 40, z: 3 });
    const doc = docApi.createDocument({ layers: [a, b, c] });
    assert.deepEqual(docApi.overlappingIds(doc, "a").sort(), ["b"]);
    docApi.bringToFront(doc, "a");
    const front = Math.max(...doc.layers.map((layer) => layer.z));
    assert.equal(doc.layers.find((layer) => layer.id === "a")?.z, front);
    docApi.reorderLayers(doc, ["c", "b", "a"]);
    assert.ok((doc.layers.find((layer) => layer.id === "c")?.z ?? 0) > (doc.layers.find((layer) => layer.id === "a")?.z ?? 0));
    const groupId = docApi.groupLayers(doc, ["a", "b"]);
    assert.equal(doc.layers.find((layer) => layer.id === "a")?.groupId, groupId);
    docApi.lockLayers(doc, ["a"], true);
    assert.equal(doc.layers.find((layer) => layer.id === "b")?.locked, true);
    const before = doc.layers.find((layer) => layer.id === "a")?.x ?? 0;
    docApi.moveLayer(doc, "a", 12, 0);
    assert.equal(doc.layers.find((layer) => layer.id === "a")?.x, before);
    const image = docApi.imageLayer({ id: "img", src: { kind: "user", id: "img" } });
    const withImage = docApi.createDocument({ layers: [image] });
    const copy = docApi.duplicateLayer(withImage, "img");
    assert.ok(copy);
    assert.notEqual(copy.id, "img");
    assert.equal(copy.src?.id, "img");
    docApi.alignLayers(doc, ["c"], "left");
    assert.equal(doc.layers.find((layer) => layer.id === "c")?.x, 0);
  });

  test("la exportación bloquea palabras vetadas y no mete bytes de imagen", async () => {
    const { createDocument, textLayer, imageLayer, exportProject, importProject, canExport, makeFormat } = await load<{
      createDocument: (spec: unknown) => {
        layers: { props?: { rgba?: number[] }; src?: { kind: string; id: string } }[];
        format: { id: string; width: number; height: number };
      };
      textLayer: (spec: { text: string }) => unknown;
      imageLayer: (spec: { src: { kind: string; id: string } }) => { props?: { rgba?: number[] } };
      exportProject: (doc: unknown) => { layers: { props?: { rgba?: number[] }; src?: { kind: string; id: string } }[] };
      importProject: (input: unknown) => { format: { id: string; width: number; height: number } };
      canExport: (doc: unknown) => boolean;
      makeFormat: (source: { id: string; width: number; height: number }) => { id: string; width: number; height: number };
    }>("lib/document.mjs");
    const blocked = createDocument({ layers: [textLayer({ text: "wallet" })] });
    assert.equal(canExport(blocked), false);
    const fine = createDocument({ layers: [textLayer({ text: "Un meme de la comunidad" })] });
    assert.equal(canExport(fine), true);
    const image = imageLayer({ src: { kind: "user", id: "foto" } });
    image.props = { ...(image.props || {}), rgba: [1, 2, 3, 4] };
    const doc = createDocument({
      format: { id: "custom", width: 800, height: 600 },
      layers: [image],
    });
    const exported = exportProject(doc);
    assert.equal(exported.layers[0]?.props?.rgba, undefined);
    assert.deepEqual(exported.layers[0]?.src, { kind: "user", id: "foto" });
    assert.equal(JSON.stringify(exported).includes("rgba"), false);
    const back = importProject(JSON.stringify(exported));
    assert.equal(back.format.id, "custom");
    assert.equal(back.format.width, 800);
    assert.equal(back.format.height, 600);
    assert.throws(() => importProject("{"), /proyecto-invalido/);
    assert.throws(() => importProject({ v: 9, format: { width: 10, height: 10 }, layers: [] }), /version-desconocida/);
    const clamped = makeFormat({ id: "custom", width: 9000, height: 2 });
    assert.equal(clamped.width, 2048);
    assert.equal(clamped.height, 64);
  });

  test("PNG de publicación, historia y X, y la calidad JPG", async () => {
    const { createDocument, rectLayer } = await load<{
      createDocument: (spec: { format: { id: string; width: number; height: number }; background: { type: string; fill: string }; layers: unknown[] }) => unknown;
      rectLayer: (spec: { x: number; y: number; w: number; h: number; fill: string; z: number }) => unknown;
    }>("lib/document.mjs");
    const { renderDocument, jpegQuality } = await load<{
      renderDocument: (doc: unknown) => Promise<{ width: number; height: number; png: Uint8Array }>;
      jpegQuality: (value: unknown) => number;
    }>("lib/compose.mjs");
    assert.equal(jpegQuality(2), 0.95);
    assert.equal(jpegQuality(0.1), 0.7);
    assert.equal(jpegQuality(undefined), 0.92);
    const sizes = [
      ["square", 1080, 1080],
      ["story", 1080, 1920],
      ["x", 1600, 900],
    ] as const;
    for (const [id, width, height] of sizes) {
      const doc = createDocument({
        format: { id, width, height },
        background: { type: "solid", fill: "#FFF8EC" },
        layers: [rectLayer({ x: 8, y: 8, w: 24, h: 24, fill: "#FF3070", z: 1 })],
      });
      const out = await renderDocument(doc);
      assert.equal(out.width, width);
      assert.equal(out.height, height);
      assert.equal(out.png[0], 0x89);
      assert.equal(out.png[1], 0x50);
      assert.equal(out.png[2], 0x4e);
      assert.equal(out.png[3], 0x47);
      assert.equal(Buffer.from(out.png).includes(Buffer.from("Comment")), false);
    }
  });

  test("la interfaz no nombra otras herramientas ni promete quitar el fondo", () => {
    const app = readFileSync(path.join(repoRoot(), "web/v2/studio/app.mjs"), "utf8");
    assert.equal(/\bcanva\b|firefly|dall-?e|remove-background|quitar fondo/i.test(app), false);
    assert.match(app, /Plantillas/);
    assert.match(app, /El kit de ORVUPI va incluido/);
    assert.match(app, /encodeJpeg/);
    assert.equal(app.includes("image/svg"), false);
  });
});
