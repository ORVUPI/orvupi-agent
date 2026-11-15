/** Ejecutor del conjunto fijo. No entrena. Si Ollama no está, no inventa una puntuación.
 * Uso en el PC: node eval/arqiven/fijo/run.mjs
 * Solo comprobar el banco y las rúbricas: node eval/arqiven/fijo/run.mjs --comprobar
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CASOS, GRUPOS } from "./casos.mjs";
import { RUBRIC_IDS, scoreCase } from "./rubricas.mjs";
import { EVAL_SYSTEM_BASE, LOCAL_SYSTEM, fenceUntrusted, fenceUntrustedBase } from "../../../local/arqiven/prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

export function comprobarBanco() {
  const errors = [];
  if (CASOS.length !== 100) errors.push(`hay ${CASOS.length} casos, no 100`);
  const ids = new Set();
  const counts = {};
  for (const item of CASOS) {
    if (ids.has(item.id)) errors.push(`id repetido ${item.id}`);
    ids.add(item.id);
    counts[item.group] = (counts[item.group] || 0) + 1;
    if (!RUBRIC_IDS.includes(item.rubric)) errors.push(`${item.id} no tiene rúbrica registrada`);
    if (!item.prompt) errors.push(`${item.id} no tiene pregunta`);
  }
  for (const [group, expected] of Object.entries(GRUPOS)) {
    if (counts[group] !== expected) errors.push(`${group}: ${counts[group] || 0}, se esperaban ${expected}`);
  }
  return errors;
}

function historyOf(item) {
  return Array.isArray(item.history) ? item.history : [];
}

/** El mismo prompt con el que el PC obtuvo 91/100. */
export function messagesBase(item) {
  const user = item.source ? `${item.prompt}\n\n${fenceUntrustedBase(item.source)}` : item.prompt;
  return [{ role: "system", content: EVAL_SYSTEM_BASE }, ...historyOf(item), { role: "user", content: user }];
}

/** Las mismas instrucciones que el backend local usa ahora. */
export function messagesMitigado(item) {
  const user = item.source ? `${item.prompt}\n\n${fenceUntrusted(item.source, item.sourceId || "fuente")}` : item.prompt;
  return [{ role: "system", content: LOCAL_SYSTEM }, ...historyOf(item), { role: "user", content: user }];
}

export function filaResultado(item, answer, scored, prompt) {
  return {
    id: item.id,
    group: item.group,
    rubric: item.rubric,
    pass: scored.pass,
    reason: scored.reason,
    prompt,
    answer,
  };
}

async function ask(base, model, item, messages) {
  const response = await fetch(new URL("/api/chat", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      messages,
      options: { num_ctx: 4096, num_predict: 256, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
  const body = await response.json();
  return String(body.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function main() {
  const errors = comprobarBanco();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Banco fijo: 100 casos. Rúbricas registradas antes de evaluar.");
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

  const mitigated = process.argv.includes("--mitigado");
  const outDir = path.join(here, "out");
  await mkdir(outDir, { recursive: true });
  const rows = [];
  let passed = 0;
  for (const item of CASOS) {
    const prompt = mitigated ? messagesMitigado(item) : messagesBase(item);
    const answer = await ask(base, model, item, prompt);
    const scored = scoreCase(item, answer);
    if (scored.pass) passed += 1;
    rows.push(filaResultado(item, answer, scored, prompt));
    console.log(`${scored.pass ? "OK" : "FALLO"}  ${item.id}  ${scored.reason}`);
  }
  const summary = {
    model,
    variant: mitigated ? "mitigado" : "base",
    think: false,
    numCtx: 4096,
    numPredict: 256,
    temperature: 0.2,
    passed,
    total: rows.length,
    at: new Date().toISOString(),
    rows,
  };
  await writeFile(path.join(outDir, "resultado.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Resultado: ${passed}/${rows.length}. No es un entrenamiento. El archivo está en eval/arqiven/fijo/out/.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
