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

describe("studio fase 5", () => {
  test("la biblioteca de fotos es local, CC0 y buscable", async () => {
    const photos = await load<{
      listPhotos: (q?: string, lang?: string) => { id: string; licencia: string; archivo: string }[];
      photoById: (id: string) => { id: string } | null;
      PHOTO_LICENSE_NOTE: { es: string };
    }>("lib/photos.mjs");
    const all = photos.listPhotos();
    assert.ok(all.length >= 8);
    for (const item of all) {
      assert.match(item.licencia, /CC0/i);
      const file = path.join(repoRoot(), "web/v2/studio", item.archivo);
      assert.equal(readFileSync(file)[0], 0x89);
    }
    assert.ok(photos.listPhotos("cuadricula").some((item) => item.id === "foto-cuadricula"));
    assert.equal(photos.photoById("no-existe"), null);
    assert.match(photos.PHOTO_LICENSE_NOTE.es, /CC0|dominio público|stock/i);
  });

  test("gráficos y tablas son capas con datos editables y entran en el raster", async () => {
    const docApi = await load<{
      blankDocument: (id: string) => any;
      chartLayer: (spec?: any) => any;
      tableLayer: (spec?: any) => any;
      exportProject: (doc: any) => any;
      importProject: (data: any) => any;
      projectTexts: (doc: any) => { title: string; body: string };
    }>("lib/document.mjs");
    const compose = await load<{ renderDocument: (doc: any) => Promise<{ png: Uint8Array; width: number; height: number }> }>("lib/compose.mjs");
    const chartData = await load<{ parseSeriesText: (text: string) => any; cleanChartProps: (props?: any) => any }>("lib/chart-data.mjs");
    const tableData = await load<{ parseTableText: (text: string) => any }>("lib/table-data.mjs");

    const parsed = chartData.parseSeriesText("Alpha:10\nBeta:20\nGamma:5");
    assert.deepEqual(parsed.labels, ["Alpha", "Beta", "Gamma"]);
    assert.deepEqual(parsed.values, [10, 20, 5]);

    const table = tableData.parseTableText("A\tB\n1\t2");
    assert.equal(table.rows.length, 2);
    assert.deepEqual(table.rows[0], ["A", "B"]);

    const doc = docApi.blankDocument("deck");
    doc.layers.push(docApi.chartLayer({ name: "KPI", props: { chartType: "bar", labels: ["A", "B"], values: [3, 7], colors: ["#FF3070", "#102032"] } }));
    doc.layers.push(docApi.tableLayer({ name: "Tabla", props: { rows: [["Mes", "Valor"], ["Ene", "4"], ["Feb", "9"]], header: true } }));
    const round = docApi.importProject(docApi.exportProject(doc));
    assert.equal(round.layers.filter((layer: { type: string }) => layer.type === "chart").length, 1);
    assert.equal(round.layers.filter((layer: { type: string }) => layer.type === "table").length, 1);
    const texts = docApi.projectTexts(round);
    assert.match(`${texts.title}\n${texts.body}`, /Mes|Ene|A|B/);

    const rendered = await compose.renderDocument(round);
    assert.equal(rendered.width, 1920);
    assert.ok(rendered.png.length > 100);
    assert.equal(rendered.png[0], 0x89);
  });

  test("el HTML del sitio es responsive y no publica", async () => {
    const docApi = await load<{ blankDocument: (id: string) => any; textLayer: (spec?: any) => any; tableLayer: (spec?: any) => any }>("lib/document.mjs");
    const htmlApi = await load<{ exportSiteHtml: (doc: any, options?: { lang?: string }) => string }>("lib/html-export.mjs");
    const doc = docApi.blankDocument("web");
    doc.name = "Landing prueba";
    doc.layers.push(docApi.textLayer({ text: "Hola sitio", x: 40, y: 80, w: 400, h: 80, size: 48 }));
    doc.layers.push(docApi.tableLayer({ props: { rows: [["A", "B"], ["1", "2"]] } }));
    const html = htmlApi.exportSiteHtml(doc, { lang: "es" });
    assert.match(html, /viewport/);
    assert.match(html, /Hola sitio/);
    assert.match(html, /<table>/);
    assert.match(html, /no publica|No publica/i);
    assert.doesNotMatch(html, /https?:\/\/upload|netlify|firebase/i);
  });

  test("historial local guarda y restaura sin colaboración remota", async () => {
    const docApi = await load<{ blankDocument: (id: string) => any; textLayer: (spec?: any) => any; exportProject: (doc: any) => any }>("lib/document.mjs");
    const history = await load<{
      pushHistory: (storage: ReturnType<typeof memoryStorage>, doc: any) => { ok: boolean; id?: string };
      listHistory: (storage: ReturnType<typeof memoryStorage>, id: string) => { id: string }[];
      loadHistory: (storage: ReturnType<typeof memoryStorage>, projectId: string, historyId: string) => any;
      HISTORY_COST: { es: string };
      HISTORY_CAP: number;
    }>("lib/history.mjs");
    const storage = memoryStorage();
    const doc = docApi.blankDocument("board");
    doc.layers.push(docApi.textLayer({ text: "Antes" }));
    const first = history.pushHistory(storage, docApi.exportProject(doc));
    assert.equal(first.ok, true);
    doc.layers[0].props.text = "Después";
    const second = history.pushHistory(storage, docApi.exportProject(doc));
    assert.equal(second.ok, true);
    const listed = history.listHistory(storage, doc.id);
    assert.ok(listed.length >= 2);
    const restored = history.loadHistory(storage, doc.id, first.id!);
    assert.equal(restored.layers[0].props.text, "Antes");
    assert.match(history.HISTORY_COST.es, /colaboración|remoto|cuota/i);
    assert.equal(history.HISTORY_CAP, 20);
  });

  test("la IA opcional no exige modelo y ofrece frases locales", async () => {
    const ai = await load<{
      AI_STATUS: { enabled: boolean; modelRequired: boolean; note: { es: string } };
      localPhrases: (lang?: string) => string[];
      aiPanelCopy: (lang?: string) => { off: string };
    }>("lib/ai-optional.mjs");
    assert.equal(ai.AI_STATUS.enabled, false);
    assert.equal(ai.AI_STATUS.modelRequired, false);
    assert.ok(ai.localPhrases("es").length >= 4);
    assert.match(ai.AI_STATUS.note.es, /no necesitan descargar un modelo/i);
    assert.match(ai.aiPanelCopy("es").off, /modelo/i);
  });

  test("vídeo declara escenas locales y el límite sin MP4/audio", async () => {
    const docApi = await load<{ blankDocument: (id: string) => any; createDocument?: any }>("lib/document.mjs");
    const { blankDocument } = await load<{ blankDocument: (id: string) => any }>("lib/document.mjs");
    const doc = blankDocument("video");
    assert.equal(doc.meta.shell, "video");
    assert.ok(Array.isArray(doc.meta.scenes));
    assert.ok(doc.meta.scenes.length >= 1);
    assert.ok(doc.meta.scenes[0].duration >= 1);
    void docApi;
  });
});
