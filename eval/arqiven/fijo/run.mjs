/** Ejecutor del conjunto fijo. No entrena. Si Ollama no está, no inventa una puntuación.
 * Uso en el PC: node eval/arqiven/fijo/run.mjs
 * Solo comprobar el banco y las rúbricas: node eval/arqiven/fijo/run.mjs --comprobar
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CASOS, GRUPOS } from "./casos.mjs";
import { RUBRIC_IDS, scoreCase } from "./rubricas.mjs";
import { EVAL_SYSTEM_BASE, LOCAL_SYSTEM, fenceUntrusted, fenceUntrustedBase, systemFor, withRetry } from "../../../local/arqiven/prompt.mjs";
import { redactDocument, outputViolates, SAFE_ANSWER } from "../../../local/arqiven/guard.mjs";

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

/** Las mismas instrucciones que el backend local usa ahora. El documento va antes; la pregunta, al final. */
export function messagesMitigado(item) {
  const question = `Pregunta del usuario:\n${item.prompt}`;
  const user = item.source ? `${fenceUntrusted(item.source, item.sourceId || "fuente")}\n\n${question}` : question;
  return [{ role: "system", content: LOCAL_SYSTEM }, ...historyOf(item), { role: "user", content: user }];
}

/** Capa determinista. Sin documento no se menciona. Con documento, las órdenes ya no están en el texto. */
export function prepareMitigado2(item) {
  const record = redactDocument(item.source || "");
  const hasDoc = Boolean(record.text);
  const user = hasDoc
    ? `${fenceUntrusted(record.text, item.sourceId || "fuente")}\n\nPregunta del usuario:\n${item.prompt}`
    : item.prompt;
  return {
    messages: [{ role: "system", content: systemFor(hasDoc) }, ...historyOf(item), { role: "user", content: user }],
    record,
  };
}

export async function answerMitigado2(askModel, item) {
  const prepared = prepareMitigado2(item);
  let answer = await askModel(prepared.messages);
  if (outputViolates(answer, prepared.record)) {
    answer = await askModel(withRetry(prepared.messages));
    if (outputViolates(answer, prepared.record)) answer = SAFE_ANSWER;
  }
  return { answer, prompt: prepared.messages, omitted: prepared.record.omitted.length };
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
  const rescoreAt = process.argv.indexOf("--repuntuar");
  if (rescoreAt >= 0) {
    const file = process.argv[rescoreAt + 1];
    if (!file) {
      console.error("Falta la ruta de resultado.json");
      process.exit(1);
    }
    const saved = JSON.parse(await readFile(file, "utf8"));
    const again = repuntuar(saved);
    const failed = again.rows.filter((row) => !row.pass).map((row) => row.id);
    console.log(`Repuntuado: ${again.passed}/${again.total}. Fallos: ${failed.join(", ") || "ninguno"}.`);
    return;
  }

  const base = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  const model = process.env.ARQIVEN_MODEL || "qwen3:8b";
  try {
    const tags = await fetch(new URL("/api/tags", base), { signal: AbortSignal.timeout(3000) });
    if (!tags.ok) throw new Error("sin modelos");
  } catch {
    console.error(`Ollama no responde en ${base}. No se inventa una puntuación.`);
    process.exit(2);
  }

  const variant = process.argv.includes("--mitigado2") ? "mitigado2" : process.argv.includes("--mitigado") ? "mitigado" : "base";
  const outDir = path.join(here, "out");
  await mkdir(outDir, { recursive: true });
  const rows = [];
  let passed = 0;
  for (const item of CASOS) {
    let prompt;
    let answer;
    let omitted = 0;
    if (variant === "mitigado2") {
      const settled = await answerMitigado2((messages) => ask(base, model, item, messages), item);
      prompt = settled.prompt;
      answer = settled.answer;
      omitted = settled.omitted;
    } else {
      prompt = variant === "mitigado" ? messagesMitigado(item) : messagesBase(item);
      answer = await ask(base, model, item, prompt);
    }
    const scored = scoreCase(item, answer);
    if (scored.pass) passed += 1;
    const row = filaResultado(item, answer, scored, prompt);
    if (variant === "mitigado2") row.omitted = omitted;
    rows.push(row);
    console.log(`${scored.pass ? "OK" : "FALLO"}  ${item.id}  ${scored.reason}`);
  }
  const summary = {
    model,
    variant,
    think: false,
    numCtx: 4096,
    numPredict: 256,
    temperature: 0.2,
    passed,
    total: rows.length,
    at: new Date().toISOString(),
    rows,
  };
  const file = path.join(outDir, "resultado.json");
  const named = path.join(outDir, `resultado-${summary.variant}.json`);
  const body = `${JSON.stringify(summary, null, 2)}\n`;
  await writeFile(file, body);
  await writeFile(named, body);
  console.log(`Resultado: ${passed}/${rows.length}. No es un entrenamiento. El archivo está en eval/arqiven/fijo/out/.`);
}

/** Vuelve a puntuar un resultado.json ya guardado, sin llamar al modelo. */
export function repuntuar(saved) {
  const byId = new Map(CASOS.map((item) => [item.id, item]));
  const rows = Array.isArray(saved?.rows) ? saved.rows : [];
  let passed = 0;
  const next = [];
  for (const row of rows) {
    const item = byId.get(row.id);
    if (!item) continue;
    const scored = scoreCase(item, row.answer);
    if (scored.pass) passed += 1;
    next.push({ id: row.id, pass: scored.pass, reason: scored.reason, answer: row.answer });
  }
  return { passed, total: next.length, rows: next };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
