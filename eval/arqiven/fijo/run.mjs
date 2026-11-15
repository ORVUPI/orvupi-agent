/** Ejecutor del conjunto fijo. No entrena. Si Ollama no está, no inventa una puntuación.
 * Uso en el PC: node eval/arqiven/fijo/run.mjs
 * Solo comprobar el banco y las rúbricas: node eval/arqiven/fijo/run.mjs --comprobar
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CASOS, GRUPOS } from "./casos.mjs";
import { RESERVADOS, comprobarReservado } from "./reservado.mjs";
import { RESERVADOS2, comprobarReservado2 } from "./reservado-2.mjs";
import { RESERVADOS3, comprobarReservado3 } from "./reservado-3.mjs";
import { RESERVADO_EXPERTO, comprobarReservadoExperto } from "./reservado-experto.mjs";
import { RUBRIC_IDS, scoreCase } from "./rubricas.mjs";
import { EVAL_SYSTEM_BASE, LOCAL_SYSTEM, fenceUntrusted, fenceUntrustedBase, withRetry } from "../../../local/arqiven/prompt.mjs";
import { liveFacts } from "../../../local/arqiven/hechos.mjs";
import { retrieveConocimiento } from "../../../local/arqiven/conocimiento.mjs";
import { guardChat, outputViolates, SAFE_ANSWER } from "../../../local/arqiven/guard.mjs";
import { cutRepeatedSentences, ensureNoteCitation, stripMismatchedAnchors, trimAfterWarning } from "../../../local/arqiven/salida.mjs";

export const EVAL_SEED = 15;

export function semillaDe(vuelta) {
  return EVAL_SEED + Number(vuelta) - 1;
}
export const EVAL_TEMPERATURE = 0.2;

export function repeticionesDe(argv = process.argv) {
  const at = argv.indexOf("--repeticiones");
  if (at < 0) return 1;
  const count = Number(argv[at + 1]);
  if (!Number.isInteger(count) || count < 1 || count > 5) {
    throw new Error("--repeticiones necesita un entero de 1 a 5");
  }
  return count;
}

export function resumenRepeticiones(scores) {
  const list = scores.map((score) => Number(score));
  const media = list.reduce((sum, score) => sum + score, 0) / list.length;
  return { media, minimo: Math.min(...list), scores: list };
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function comprobarBanco() {
  const errors = [];
  if (CASOS.length !== 120) errors.push(`hay ${CASOS.length} casos, no 120`);
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

/** El prompt de la corrida de 92/100. El backend ya no usa este texto: usa guardChat. */
export function messagesMitigado(item) {
  const question = `Pregunta del usuario:\n${item.prompt}`;
  const user = item.source ? `${fenceUntrusted(item.source, item.sourceId || "fuente")}\n\n${question}` : question;
  return [{ role: "system", content: LOCAL_SYSTEM }, ...historyOf(item), { role: "user", content: user }];
}

/** La canalización del chat local. Sin documento no se menciona. Con documento, las órdenes ya no están en el texto. */
export function prepareMitigado2(item, modelId = "") {
  const trusted = typeof item.trusted === "string" ? item.trusted : "";
  return guardChat([...historyOf(item), { role: "user", content: item.prompt }], item.source || "", item.sourceId || "fuente", modelId, trusted);
}

export async function answerMitigado2(askModel, item, modelId = "") {
  let source = item.source || "";
  let trusted = "";
  let noteId = "";
  if (item.trusted === true) {
    trusted = source;
    source = "";
    noteId = item.sourceId || "";
  } else if (item.group === "experto") {
    try {
      const known = await retrieveConocimiento(item.prompt);
      if (known.text) {
        trusted = known.text;
        noteId = known.hits?.[0]?.id || "";
      }
    } catch { /* sin nota */ }
  }
  try {
    const facts = await liveFacts(item.prompt);
    if (facts.text) source = [source, facts.text].filter(Boolean).join("\n\n");
  } catch { /* sin cifras en vivo */ }
  const prepared = prepareMitigado2({ ...item, source, trusted }, modelId);
  let answer = await askModel(prepared.messages);
  if (outputViolates(answer, prepared.record)) {
    answer = await askModel(withRetry(prepared.messages));
    if (outputViolates(answer, prepared.record)) answer = SAFE_ANSWER;
  }
  if (item.rubric === "prog-funcion") {
    const scored = scoreCase(item, answer);
    if (!scored.pass) {
      answer = await askModel([
        ...prepared.messages,
        { role: "assistant", content: answer },
        { role: "user", content: `Comprobación local, sin red: ${scored.reason}. Corrige la función.${item.fn === "primo" ? " Los divisores se prueban desde 2 hasta la raíz de n. primo(5) es true y primo(1) es false." : ""}${item.fn === "clampTexto" ? " No añadas puntos suspensivos: clampTexto(\"hola\", 2) es \"ho\"." : ""} No escribas la comprobación.` },
      ]);
      if (outputViolates(answer, prepared.record)) answer = SAFE_ANSWER;
    }
  }
  answer = trimAfterWarning(stripMismatchedAnchors(cutRepeatedSentences(answer)));
  if (noteId) answer = ensureNoteCitation(answer, noteId);
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

async function ask(base, model, item, messages, seed = EVAL_SEED) {
  const response = await fetch(new URL("/api/chat", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      messages,
      options: { num_ctx: 4096, num_predict: item?.group === "experto" ? 640 : 256, temperature: EVAL_TEMPERATURE, seed },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
  const body = await response.json();
  return String(body.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function runHeld(label, cases, check, fileName) {
  const errors = check();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`${label}: ${cases.length} casos. No se ha usado para ajustar el filtro.`);
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
  const outDir = path.join(here, "out");
  await mkdir(outDir, { recursive: true });
  const veces = repeticionesDe();
  const puntuaciones = [];
  let rows = [];
  let passed = 0;
  for (let vuelta = 1; vuelta <= veces; vuelta += 1) {
    rows = [];
    passed = 0;
    for (const item of cases) {
      const settled = await answerMitigado2((messages) => ask(base, model, item, messages, semillaDe(vuelta)), item, model);
      const scored = scoreCase(item, settled.answer);
      if (scored.pass) passed += 1;
      const row = filaResultado(item, settled.answer, scored, settled.prompt);
      row.omitted = settled.omitted;
      rows.push(row);
      console.log(`${scored.pass ? "OK" : "FALLO"}  ${item.id}  ${scored.reason}`);
    }
    puntuaciones.push(passed);
    console.log(`Vuelta ${vuelta}/${veces}: ${passed}/${rows.length}`);
  }
  const resumen = resumenRepeticiones(puntuaciones);
  const summary = {
    model,
    variant: label,
    pipeline: "mitigado2",
    think: false,
    numCtx: 4096,
    numPredict: 256,
    temperature: EVAL_TEMPERATURE,
    seed: EVAL_SEED,
    repeticiones: veces,
    media: resumen.media,
    minimo: resumen.minimo,
    passed,
    total: rows.length,
    at: new Date().toISOString(),
    rows,
  };
  await writeFile(path.join(outDir, fileName), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`${label}: media ${resumen.media}, mínimo ${resumen.minimo}, de ${rows.length}. No es un entrenamiento. El archivo está en eval/arqiven/fijo/out/${fileName}.`);
}

async function main() {
  try {
    repeticionesDe();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "repeticiones");
    process.exit(1);
  }
  if (process.argv.includes("--reservado-experto")) {
    await runHeld("reservado-experto", RESERVADO_EXPERTO, comprobarReservadoExperto, "resultado-reservado-experto.json");
    return;
  }
  if (process.argv.includes("--reservado3")) {
    await runHeld("reservado3", RESERVADOS3, comprobarReservado3, "resultado-reservado-3.json");
    return;
  }
  if (process.argv.includes("--reservado2")) {
    await runHeld("reservado2", RESERVADOS2, comprobarReservado2, "resultado-reservado-2.json");
    return;
  }
  if (process.argv.includes("--reservado")) {
    await runHeld("reservado", RESERVADOS, comprobarReservado, "resultado-reservado.json");
    return;
  }
  const errors = comprobarBanco();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Banco fijo: 120 casos. Rúbricas registradas antes de evaluar.");
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
  const veces = repeticionesDe();
  const puntuaciones = [];
  let rows = [];
  let passed = 0;
  for (let vuelta = 1; vuelta <= veces; vuelta += 1) {
    rows = [];
    passed = 0;
  for (const item of CASOS) {
    let prompt;
    let answer;
    let omitted = 0;
    if (variant === "mitigado2") {
      const settled = await answerMitigado2((messages) => ask(base, model, item, messages, semillaDe(vuelta)), item, model);
      prompt = settled.prompt;
      answer = settled.answer;
      omitted = settled.omitted;
    } else {
      prompt = variant === "mitigado" ? messagesMitigado(item) : messagesBase(item);
      answer = await ask(base, model, item, prompt, semillaDe(vuelta));
    }
    const scored = scoreCase(item, answer);
    if (scored.pass) passed += 1;
    const row = filaResultado(item, answer, scored, prompt);
    if (variant === "mitigado2") row.omitted = omitted;
    rows.push(row);
    console.log(`${scored.pass ? "OK" : "FALLO"}  ${item.id}  ${scored.reason}`);
    }
    puntuaciones.push(passed);
    console.log(`Vuelta ${vuelta}/${veces}: ${passed}/${rows.length}`);
  }
  const resumen = resumenRepeticiones(puntuaciones);
  const summary = {
    model,
    variant,
    think: false,
    numCtx: 4096,
    numPredict: 256,
    temperature: EVAL_TEMPERATURE,
    seed: EVAL_SEED,
    repeticiones: veces,
    media: resumen.media,
    minimo: resumen.minimo,
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
  console.log(`Resultado: media ${resumen.media}, mínimo ${resumen.minimo}, de ${rows.length}. No es un entrenamiento. El archivo está en eval/arqiven/fijo/out/.`);
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
