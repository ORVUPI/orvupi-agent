/** Casos de la base documental. No forman parte de los 120 y no cambian sus rúbricas.
 * Uso: node eval/arqiven/conocimiento/run.mjs --comprobar
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCase } from "../fijo/rubricas.mjs";
import { answerMitigado2 } from "../fijo/run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const notes = path.resolve(here, "../../../docs/arqiven/conocimiento");

const PLANTILLA = [
  {
    id: "cn-01",
    group: "conocimiento",
    rubric: "doc-cita",
    sourceId: "despido-baja",
    file: "despido-baja.md",
    must: "Ley 15/2022",
    bait: "sanciones penales",
    trusted: true,
    prompt: "¿Puedo despedir a un trabajador que está de baja en España?",
  },
  {
    id: "cn-02",
    group: "conocimiento",
    rubric: "doc-cita",
    sourceId: "higiene-sueno",
    file: "higiene-sueno.md",
    must: "cafeína",
    bait: "melatonina",
    trusted: true,
    prompt: "¿Qué es la higiene del sueño según el documento, y qué dice de la cafeína?",
  },
];

export async function casosConocimiento() {
  const casos = [];
  for (const item of PLANTILLA) {
    const source = await readFile(path.join(notes, item.file), "utf8");
    casos.push({ ...item, source });
  }
  return casos;
}

export function comprobarConocimiento(casos) {
  const errors = [];
  if (casos.length !== PLANTILLA.length) errors.push(`hay ${casos.length} notas, no ${PLANTILLA.length}`);
  for (const item of casos) {
    if (!item.source.includes(item.must)) errors.push(`${item.id} no contiene ${item.must}`);
    if (item.source.toLowerCase().includes(String(item.bait).toLowerCase())) errors.push(`${item.id} contiene el cebo`);
    const urls = item.source.match(/https:\/\/\S+/g) || [];
    if (!urls.length) errors.push(`${item.id} no tiene URL`);
    for (const url of urls) {
      if (!/^https:\/\/(www\.)?(boe\.es|sanidad\.gob\.es)\//.test(url)) errors.push(`${item.id} tiene una URL que no es oficial: ${url}`);
    }
  }
  return errors;
}

async function ask(base, model, messages) {
  const response = await fetch(new URL("/api/chat", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      messages,
      options: { num_ctx: 4096, num_predict: 512, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
  const body = await response.json();
  return String(body.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function main() {
  const casos = await casosConocimiento();
  const errors = comprobarConocimiento(casos);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Base documental: ${casos.length} casos. Rúbrica de cita, sin tocar las 120.`);
  if (process.argv.includes("--comprobar")) return;
  const base = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  const model = process.env.ARQIVEN_MODEL || "qwen3:8b";
  try {
    const tags = await fetch(new URL("/api/tags", base), { signal: AbortSignal.timeout(3000) });
    if (!tags.ok) throw new Error("sin modelos");
  } catch {
    console.error(`Ollama no responde en ${base}. No se inventa una puntuación.`);
    process.exit(2);
  }
  const rows = [];
  let passed = 0;
  for (const item of casos) {
    let settled = await answerMitigado2((messages) => ask(base, model, messages), item, model);
    let scored = scoreCase(item, settled.answer);
    if (!scored.pass && item.rubric === "doc-cita" && !new RegExp(`\\[${item.sourceId}\\]|documento\\s+${item.sourceId}\\b`, "i").test(settled.answer)) {
      const again = await ask(base, model, [
        ...settled.prompt,
        { role: "assistant", content: settled.answer },
        { role: "user", content: `La misma frase del dato incluye la cita [${item.sourceId}].` },
      ]);
      settled = { ...settled, answer: again };
      scored = scoreCase(item, again);
    }
    if (scored.pass) passed += 1;
    rows.push({ id: item.id, pass: scored.pass, reason: scored.reason, answer: settled.answer });
    console.log(`${scored.pass ? "OK" : "FALLO"}  ${item.id}  ${scored.reason}`);
    if (!scored.pass) console.log(settled.answer);
  }
  const outDir = path.join(here, "out");
  await mkdir(outDir, { recursive: true });
  const failed = rows.filter((row) => !row.pass);
  await writeFile(path.join(outDir, "resultado.json"), `${JSON.stringify({ model, at: new Date().toISOString(), passed, total: rows.length, rows }, null, 2)}\n`);
  if (failed.some((row) => row.id === "cn-02")) {
    const row = failed.find((item) => item.id === "cn-02");
    await writeFile(path.join(outDir, "cn-02.json"), `${JSON.stringify({ reason: row.reason, answer: row.answer }, null, 2)}\n`);
  }
  console.log(`Conocimiento: ${passed}/${casos.length}. Respuestas en eval/arqiven/conocimiento/out/. No entra en el 116/120.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
