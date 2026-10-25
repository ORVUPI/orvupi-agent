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
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
  props?: { text?: string; fill?: string };
  src?: { id?: string };
};

type Doc = {
  id: string;
  name: string;
  templateId: string;
  background: { fill: string };
  format: { id: string; width: number; height: number };
  layers: Layer[];
};

function textsOf(doc: Doc): string {
  return doc.layers.filter((layer) => layer.type === "text").map((layer) => layer.props?.text || "").join("\n");
}

describe("studio fase 1 catálogo", () => {
  test("openThumb no instancia la base de la categoría", () => {
    const app = readStudio("app.mjs");
    const start = app.indexOf("function openThumb");
    const end = app.indexOf("function applyFormat");
    const fn = app.slice(start, end);
    assert.match(fn, /documentForThumb/);
    assert.equal(fn.includes("thumbCat"), false);
    assert.equal(fn.includes("instantiate"), false);
    assert.equal(fn.includes("meta.open"), false);
    assert.equal(/open:\s*"/.test(readStudio("lib/thumbs.mjs")), false);
  });

  test("Seguir diseñando no rellena con plantillas", () => {
    const views = readStudio("views.mjs");
    assert.equal(views.includes("THUMB_SEGUIR"), false);
    assert.equal(views.includes("const SEGUIR"), false);
    assert.match(views, /id: "seguir-vacio"/);
    assert.match(views, /vacioReciente/);
  });

  test("CV Ejecutivo Navy abre su documento, no el currículum genérico", async () => {
    const { documentForThumb } = await load<{ documentForThumb: (id: string) => Doc | null }>("lib/thumb-docs.mjs");
    const { importProject, exportProject } = await load<{
      exportProject: (doc: Doc) => Doc;
      importProject: (input: string) => Doc;
    }>("lib/document.mjs");
    const first = documentForThumb("tpl-curriculum-01");
    const second = documentForThumb("tpl-curriculum-01");
    assert.ok(first);
    assert.ok(second);
    assert.equal(first.name, "CV Ejecutivo Navy");
    assert.equal(first.templateId, "tpl-curriculum-01");
    assert.notEqual(first.templateId, "cv-partido");
    assert.equal(first.format.id, "cv");
    assert.equal(first.format.width, 794);
    assert.equal(first.format.height, 1123);
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.layers[0]?.id, second.layers[0]?.id);
    const side = first.layers.find((layer) => layer.type === "rect" && layer.x === 0 && layer.props?.fill === "#102032");
    assert.ok(side);
    assert.ok(side.h >= 1000);
    const text = textsOf(first);
    assert.match(text, /Nombre y apellidos/);
    assert.match(text, /HABILIDADES/);
    assert.match(text, /NovaTech/);
    assert.match(text, /MBA IE/);
    assert.doesNotMatch(text, /Nico Olas|Curiosidad aplicada|Cartel|Invitación|ORVUPI|Comunidad|pulpo|Una idea clara/i);
    assert.equal(first.layers.some((layer) => layer.type === "image"), false);
    assert.equal(first.layers.some((layer) => layer.name === "Pulpo" || layer.name === "Oficio" || layer.name === "Mitad"), false);
    assert.equal(JSON.stringify(first).includes("orvupi-avatar"), false);
    assert.equal(first.layers.every((layer) => layer.locked !== true), true);
    const edited = textsOf(first).replace("Nombre y apellidos", "CAMBIADO");
    const name = first.layers.find((layer) => layer.props?.text === "Nombre y apellidos");
    assert.ok(name?.props);
    name.props.text = "CAMBIADO";
    const fresh = documentForThumb("tpl-curriculum-01");
    assert.ok(fresh);
    assert.equal(textsOf(fresh).includes("CAMBIADO"), false);
    assert.equal(textsOf(fresh).includes("Nombre y apellidos"), true);
    assert.notEqual(edited, textsOf(fresh));
    const round = importProject(JSON.stringify(exportProject(fresh)));
    assert.match(textsOf(round), /HABILIDADES/);
    assert.match(textsOf(round), /NovaTech/);
    assert.match(textsOf(round), /MBA IE/);
  });

  test("Portada Estrategia abre su portada, no la de ideas", async () => {
    const { documentForThumb } = await load<{ documentForThumb: (id: string) => Doc | null }>("lib/thumb-docs.mjs");
    const { importProject, exportProject } = await load<{
      exportProject: (doc: Doc) => Doc;
      importProject: (input: string) => Doc;
    }>("lib/document.mjs");
    const doc = documentForThumb("tpl-presentacion-01");
    assert.ok(doc);
    assert.equal(doc.name, "Portada Estrategia");
    assert.equal(doc.templateId, "tpl-presentacion-01");
    assert.notEqual(doc.templateId, "deck-portada");
    assert.equal(doc.format.id, "deck");
    assert.equal(doc.format.width, 1920);
    assert.equal(doc.format.height, 1080);
    assert.equal(doc.background.fill, "#102032");
    const text = textsOf(doc);
    assert.match(text, /Estrategia 2026/);
    assert.match(text, /Informe ejecutivo/);
    assert.doesNotMatch(text, /Portada Estrategia|Una idea clara|Presentación para la comunidad|Creamos juntos|ORVUPI|pulpo|Nico Olas/i);
    const pink = doc.layers.filter((layer) => layer.type === "rect" && layer.props?.fill === "#FF3070");
    assert.equal(pink.length, 1);
    assert.ok(pink[0] && pink[0].w < 400);
    assert.equal(doc.layers.some((layer) => layer.type === "image"), false);
    assert.equal(doc.layers.some((layer) => layer.name === "Pulpo" || layer.name === "Marca" || layer.name === "Pie" || layer.name === "Sub"), false);
    assert.equal(JSON.stringify(doc).includes("orvupi-"), false);
    const round = importProject(JSON.stringify(exportProject(doc)));
    assert.match(textsOf(round), /Estrategia 2026/);
    assert.match(textsOf(round), /Informe ejecutivo/);
  });

  test("las miniaturas tienen documento propio, neutro y exportable", async () => {
    const api = await load<{
      thumbInventory: () => {
        templateId: string;
        category: string;
        title: string;
        png: string;
        editable: boolean;
        format: string;
        pages: number;
        layers: number;
        mascot: boolean;
        brand: boolean;
        exportable: boolean;
      }[];
      documentForThumb: (id: string) => Doc | null;
    }>("lib/thumb-docs.mjs");
    const rows = api.thumbInventory();
    assert.equal(rows.length, 425);
    assert.equal(new Set(rows.map((row) => row.templateId)).size, 425);
    const byCategory = new Map<string, Set<string>>();
    for (const row of rows) {
      assert.equal(row.editable, true, row.templateId);
      assert.equal(row.mascot, false, row.templateId);
      assert.equal(row.brand, false, row.templateId);
      assert.equal(row.exportable, true, row.templateId);
      assert.equal(row.pages, 1, row.templateId);
      assert.ok(row.layers > 0, row.templateId);
      assert.match(row.png, /\.png$/);
      const doc = api.documentForThumb(row.templateId);
      assert.ok(doc);
      assert.equal(doc.templateId, row.templateId);
      assert.equal(doc.name, row.title);
      assert.equal(doc.format.id, row.format);
      const signature = textsOf(doc);
      const seen = byCategory.get(row.category) || new Set<string>();
      assert.equal(seen.has(signature), false, row.templateId);
      seen.add(signature);
      byCategory.set(row.category, seen);
    }
    assert.equal(byCategory.size, 20);
    const cv = rows.find((row) => row.templateId === "tpl-curriculum-01");
    const deck = rows.find((row) => row.templateId === "tpl-presentacion-01");
    assert.equal(cv?.category, "curriculum");
    assert.equal(cv?.title, "CV Ejecutivo Navy");
    assert.equal(deck?.category, "presentacion");
    assert.equal(deck?.title, "Portada Estrategia");
  });

  test("las plantillas genéricas pierden pulpo y marca; el meme no", async () => {
    const { PLANTILLAS, instantiate } = await load<{
      PLANTILLAS: { id: string; uso: string; etiquetas?: string[] }[];
      instantiate: (id: string) => Doc | null;
    }>("lib/plantillas.mjs");
    const { canExport } = await load<{ canExport: (doc: Doc) => boolean }>("lib/document.mjs");
    let memes = 0;
    for (const item of PLANTILLAS) {
      const doc = instantiate(item.id);
      assert.ok(doc, item.id);
      assert.equal(doc.templateId, item.id);
      const meme = item.uso === "meme" || (item.etiquetas || []).includes("meme");
      const raw = JSON.stringify(doc);
      if (meme) {
        memes += 1;
        assert.match(raw, /orvupi-avatar|orvupi-saludo|orvupi-buen-humor/, item.id);
      } else {
        assert.equal(/orvupi-avatar|orvupi-saludo|orvupi-buen-humor/.test(raw), false, item.id);
        assert.equal(/\bORVUPI\b/.test(raw), false, item.id);
        assert.equal(/pulpo/i.test(raw), false, item.id);
        assert.equal(canExport(doc), true, item.id);
      }
    }
    assert.equal(memes, 2);
    const cv = instantiate("cv-partido");
    assert.ok(cv);
    assert.match(textsOf(cv), /Nombre y apellidos/);
    assert.doesNotMatch(textsOf(cv), /Nico Olas|ORVUPI/);
    const meme = instantiate("meme-punch");
    assert.ok(meme);
    assert.match(JSON.stringify(meme), /orvupi-buen-humor/);
    assert.match(textsOf(meme), /pulpo/);
  });
});
