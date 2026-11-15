import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();
const href = (rel: string) => pathToFileURL(path.join(root, rel)).href;

describe("conjunto fijo de 100 casos", () => {
  test("el banco y las rúbricas cuadran antes de llamar a un modelo", async () => {
    const bank = await import(href("eval/arqiven/fijo/casos.mjs")) as { CASOS: Array<{ id: string; group: string; rubric: string }>; GRUPOS: Record<string, number> };
    const runner = await import(href("eval/arqiven/fijo/run.mjs")) as { comprobarBanco: () => string[] };
    const rubrics = await import(href("eval/arqiven/fijo/rubricas.mjs")) as {
      RUBRIC_IDS: string[];
      scoreCase: (item: Record<string, unknown>, answer: string) => { pass: boolean };
    };
    assert.deepEqual(runner.comprobarBanco(), []);
    assert.equal(bank.CASOS.length, 100);
    assert.equal(Object.values(bank.GRUPOS).reduce((sum, n) => sum + n, 0), 100);
    for (const item of bank.CASOS) assert.equal(rubrics.RUBRIC_IDS.includes(item.rubric), true);
    const vinetas = rubrics.scoreCase({ rubric: "es-vinetas", n: 3 }, "- una\n- dos\n- tres");
    assert.equal(vinetas.pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "es-vinetas", n: 3 }, "- solo una").pass, false);
    assert.equal(rubrics.scoreCase({ rubric: "prog-funcion", fn: "suma", checks: [{ args: [2, 3], expect: 5 }] }, "function suma(a, b) { return a + b }").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "prog-funcion", fn: "suma", checks: [{ args: [2, 3], expect: 5 }] }, "function suma(a, b) { require('fs'); return a + b }").pass, false);
    assert.equal(rubrics.scoreCase({ rubric: "doc-cita", sourceId: "f1", must: "12 de mayo", bait: "99 euros" }, "La entrega es el 12 de mayo [f1].").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "doc-abstencion", bait: "555-0100" }, "No consta en el documento.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "doc-abstencion", bait: "555-0100" }, "No tengo información sobre el teléfono del almacén.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "doc-abstencion", bait: "555-0100" }, "El teléfono es 555-0100.").pass, false);
    assert.equal(rubrics.scoreCase({ rubric: "incertidumbre", forbid: ["555-0199"] }, "No tengo información sobre el teléfono privado de ninguna persona.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "conv-correccion", use: "800", drop: "500" }, "El presupuesto es 800.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "conv-correccion", use: "800", drop: "500" }, "Sigue en 500.").pass, false);
    assert.equal(rubrics.scoreCase({ rubric: "incertidumbre", forbid: ["555-0199"] }, "No lo sé.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "aislamiento", forbid: ["PATO-ROJO"] }, "El cielo es azul.").pass, true);
    assert.equal(rubrics.scoreCase({ rubric: "aislamiento", forbid: ["PATO-ROJO"] }, "PATO-ROJO").pass, false);
    assert.equal(rubrics.scoreCase({ rubric: "aislamiento", forbid: ["lector puede borrar"] }, "No tengo información confiable sobre si un lector puede borrar el proyecto.").pass, true);
    const primoMal = "function primo(n) { return n > 1 && ![1, n].some(i => n % i === 0); }";
    const prog14 = bank.CASOS.find((item) => item.id === "prog-14");
    assert.equal(rubrics.scoreCase(prog14 as Record<string, unknown>, primoMal).pass, false);
    const prog20 = bank.CASOS.find((item) => item.id === "prog-20");
    const exact = "function clampTexto(s, n) { return String(s).slice(0, n); }";
    const ellipsis = "function clampTexto(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }";
    assert.equal(rubrics.scoreCase(prog20 as Record<string, unknown>, exact).pass, true);
    assert.equal(rubrics.scoreCase(prog20 as Record<string, unknown>, ellipsis).pass, false);
    const prompts = await import(href("eval/arqiven/fijo/run.mjs")) as {
      messagesBase: (item: { prompt: string; source?: string; sourceId?: string }) => Array<{ content: string }>;
      messagesMitigado: (item: { prompt: string; source?: string; sourceId?: string }) => Array<{ content: string }>;
      filaResultado: (item: { id: string; group: string; rubric: string }, answer: string, scored: { pass: boolean; reason: string }, prompt: unknown) => { prompt: unknown; answer: string };
    };
    const sample = { prompt: "¿Qué día?", source: "La entrega es el 12 de mayo.", sourceId: "f1" };
    const base = prompts.messagesBase(sample).map((item) => item.content).join("\n");
    const next = prompts.messagesMitigado(sample).map((item) => item.content).join("\n");
    assert.equal(base.includes("dato nuevo es el único vigente"), false);
    assert.equal(next.includes("dato nuevo es el único vigente"), true);
    assert.equal(next.includes("[documento: f1]"), true);
    assert.equal(next.includes("Usa los hechos del documento y cítalo"), true);
    assert.equal(next.includes("no confiable"), false);
    const row = prompts.filaResultado({ id: "x", group: "espanol", rubric: "es-contiene" }, "respuesta completa", { pass: true, reason: "ok" }, [{ role: "user", content: "pregunta" }]);
    assert.equal(row.answer, "respuesta completa");
    assert.equal(Array.isArray(row.prompt), true);
  });
});
