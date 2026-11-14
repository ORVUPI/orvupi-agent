/** Worker del mismo motor que Work (Transformers.js + ONNX). Los id son de terceros. */

import { ONNX_WASM, ORT_WASM_MJS, TRANSFORMERS_ESM, modelById } from "/shared/ia/models.mjs";
import { profileById } from "/shared/ia/profile.mjs";
import { isDegenerate, trimRepetition } from "/shared/ia/quality.mjs";
import { clipHistory } from "/shared/ia/history.mjs";
import { formatNumber, resolveCalculation, verifiedAnswer } from "/shared/ia/calc.mjs";
import { closeClean, directExtra, generationPlan, languageName, lastUserText, replyLanguage, sourceNote, sourcedSystem } from "/shared/ia/prompt.mjs";

const SYSTEM_LEGACY = [
  "Eres un modelo de terceros dentro del navegador. ARQIVEN es la IA de ORVUPI y no entrenó estos pesos. No digas que eres Arqiven-N.",
  "Lee la última pregunta y el historial reciente. Identifica la intención: informar, resolver, corregir lo ya dicho o pedir un paso práctico.",
  "Si la pregunta es ambigua, haz una sola pregunta de aclaración. No adivines.",
  "Si no consta en las fuentes ni en lo ya dicho, di que no lo sabes. No contradigas el historial ni inventes cifras.",
  "Responde en el idioma del usuario, con tono natural y profesional: qué has entendido, la respuesta y, si cabe, un paso concreto.",
  "En un problema de varios pasos, cierra con una línea que empiece por «Respuesta final:».",
].join(" ");

const SYSTEM_V1 = [
  "Eres un modelo de terceros. ARQIVEN es la IA de ORVUPI y no entrenó estos pesos. No digas que eres Arqiven-N.",
  "Responde a la última pregunta. Respeta las correcciones del historial. Si no lo sabes, dilo y no inventes cifras.",
  "Si la pregunta es ambigua, haz una sola aclaración.",
  "Ejemplo: «El presupuesto es 800, no 500.» Usa 800.",
  "Ejemplo: «Acórtalo.» sin un texto claro antes: «¿Qué quieres que acorte?»",
].join(" ");

const SYSTEM = SYSTEM_LEGACY;

const TASK = {
  summarize: "Resume el mensaje en el idioma del usuario, sin inventar datos.",
  explain: "Explica el mensaje con palabras sencillas, sin inventar datos.",
  rewrite: "Reescribe el mensaje con más claridad, sin cambiar los datos.",
  analyze: "Señala solo datos que estén en el mensaje.",
  ask: "Responde al mensaje. Si no está en el texto, dilo.",
  generate: "Escribe a partir del mensaje. No afirmes ser un modelo propio.",
  outline: "Ordena el mensaje en puntos.",
  questions: "Haz preguntas cortas sobre el mensaje.",
  translate: "Traduce el mensaje. No añadas datos.",
  chat: "",
};

let toolkit = null;
let wasmThreadCount = 1;
let generator = null;
let loadedKey = "";
let loadedModel = null;
let stopper = null;

function stripThinking(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "").trim();
}

function qwen3(model) {
  return /qwen3/i.test(`${model?.repo || ""} ${model?.id || ""}`);
}

const post = (data) => self.postMessage(data);

function looksBroken(text) {
  const slice = String(text || "");
  return isDegenerate(slice) || (slice.length > 24 && /!\[/.test(slice.slice(-160)));
}

async function lib() {
  if (toolkit) return toolkit;
  const response = await fetch(TRANSFORMERS_ESM);
  if (!response.ok) throw new Error("transformers");
  let source = await response.text();
  source = source.replace(
    "/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/webgpu/+esm",
    ORT_WASM_MJS,
  );
  source = source.replaceAll("from\"/npm/", "from\"https://cdn.jsdelivr.net/npm/");
  if (!source.includes("onnxruntime-web@1.31.1/dist/ort.wasm.min.mjs")) throw new Error("runtime");
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  toolkit = await import(url);
  const { env, InterruptableStoppingCriteria } = toolkit;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const wasm = env.backends?.onnx?.wasm;
  if (wasm) {
    wasm.wasmPaths = ONNX_WASM;
    const cores = Number(navigator.hardwareConcurrency) || 1;
    const isolated = typeof crossOriginIsolated === "boolean" && crossOriginIsolated;
    wasmThreadCount = isolated ? Math.max(1, Math.min(4, cores)) : 1;
    wasm.numThreads = wasmThreadCount;
    wasm.simd = true;
    wasm.proxy = false;
  }
  stopper = new InterruptableStoppingCriteria();
  if (haltFlag) post({ type: "control", halt: haltFlag.buffer });
  return toolkit;
}

let turn = Promise.resolve();
let haltFlag = null;
try {
  haltFlag = new Int32Array(new SharedArrayBuffer(4));
} catch {
  haltFlag = null;
}

function haltRequested() {
  return Boolean(haltFlag) && Atomics.load(haltFlag, 0) === 1;
}

function clearHalt() {
  if (haltFlag) Atomics.store(haltFlag, 0, 0);
}

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "stop") {
    if (haltFlag) Atomics.store(haltFlag, 0, 1);
    stopper?.interrupt();
    return;
  }
  turn = turn.then(() => handle(msg)).catch(() => {});
});

async function handle(msg) {
  try {
    if (msg.type === "load") {
      const known = modelById(msg.modelId);
      if (!known || known.repo !== msg.model || known.device !== msg.device || known.dtype !== msg.dtype) {
        post({ type: "error", message: "Ese modelo no está en el catálogo de terceros.", kind: "other" });
        return;
      }
      const key = `${known.repo}|${known.device}|${known.dtype}`;
      if (generator && key === loadedKey) {
        post({ type: "ready", key });
        return;
      }
      const { pipeline } = await lib();
      let last = 0;
      loadedModel = known;
      generator = await pipeline("text-generation", known.repo, {
        device: known.device,
        dtype: known.dtype,
        progress_callback: (data) => {
          const now = Date.now();
          const loaded = Number(data?.loaded) || 0;
          const total = Number(data?.total) || 0;
          const ratio = Number(data?.progress) || 0;
          if (now - last < 200 && ratio < 100 && loaded < total) return;
          last = now;
          post({
            type: "progress",
            loaded: loaded || ratio,
            total: total || (ratio ? 100 : 0),
            file: String(data?.file || data?.name || ""),
            status: String(data?.status || ""),
          });
        },
      });
      loadedKey = key;
      post({ type: "preparing" });
      stopper?.reset();
      await generator([{ role: "user", content: "Responde solo: ok" }], { max_new_tokens: 4, do_sample: false });
      post({ type: "ready", key });
      return;
    }
    if (msg.type === "generate") {
      if (!generator) throw new Error("not-loaded");
      const { TextStreamer } = await lib();
      clearHalt();
      stopper?.reset();
      const hint = TASK[msg.task] || "";
      const cited = Array.isArray(msg.sources) ? msg.sources.flatMap((item) => {
        if (!item || typeof item.excerpt !== "string" || !item.excerpt) return [];
        return [`[${item.title || item.url || "fuente"}] ${item.url || ""}\n${item.excerpt}`];
      }).slice(0, 4) : [];
      const profile = profileById(msg.profile);
      const model = loadedModel || modelById(msg.modelId);
      const history = clipHistory(msg.messages, {
        profile: profile.id,
        turns: profile.id === "legacy" ? 4 : model?.contextTurns,
        maxChars: profile.id === "legacy" ? 3200 : model?.contextChars,
        perMessage: profile.perMessage,
        dropNonModel: profile.dropNonModel,
        pinFirst: profile.pinFirst,
      });
      const question = lastUserText(history);
      const reply = replyLanguage(question, msg.lang);
      const language = languageName(reply);
      const plan = generationPlan(question, msg.sources, profile.id);
      const promptText = plan.sourced ? sourcedSystem(language) : (profile.id === "v1" ? SYSTEM_V1 : SYSTEM_LEGACY);
      const note = plan.sourced ? sourceNote(msg.sources) : (cited.length ? `\n\nFuentes. Apóyate solo en ellas y cita el título. Si no responden, di que no consta.\n${cited.join("\n\n")}` : "");
      const calc = resolveCalculation(history);
      if (calc?.follow) {
        const started = Date.now();
        post({
          type: "done",
          id: msg.id,
          text: calc.display,
          broken: false,
          tokens: 1,
          ms: Math.max(1, Date.now() - started),
          threads: wasmThreadCount,
        });
        post({ type: "settled", id: msg.id });
        return;
      }
      const verified = calc ? `\n\nCálculo verificado. No lo recalcules. ${calc.display}. La respuesta numérica es ${formatNumber(calc.value)}. Responde en una frase y no des otro número.` : "";
      const longContext = history.reduce((sum, item) => sum + String(item.content || "").length, 0) > 1000;
      const attached = history.some((item) => item.role === "user" && String(item.content || "").length > 1000);
      const messages = [{ role: "system", content: `${promptText}${plan.sourced ? "" : ` Responde en ${language}. ${hint}`}${plan.extra}${plan.sourced ? "" : directExtra(question, attached)}${note}${verified}` }, ...history];
      let acc = "";
      let broken = false;
      const shown = calc ? formatNumber(calc.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text) => {
          if (haltRequested()) {
            broken = true;
            stopper?.interrupt();
          }
          acc += text;
          const sentences = acc.split(/[.!?。！？]+/).filter((part) => part.trim().length > 8).length;
          const bullets = acc.split("\n").filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line)).length;
          const listDone = plan.list && bullets >= 3 && /[.!?。！？]\s*$/.test(acc);
          const shortAnswer = (plan.sourced || (!plan.detail && !plan.list && !longContext)) && sentences >= 4;
          if (!broken && (looksBroken(acc) || (shown && new RegExp(`(?:^|\\D)${shown}(?:\\D|$)`).test(acc)) || shortAnswer || listDone)) {
            broken = true;
            stopper?.interrupt();
          }
          post({ type: "token", id: msg.id, text });
        },
      });
      const cap = profile.maxTokensCap > 0 ? profile.maxTokensCap : (model?.maxTokens || Number(msg.maxTokens) || 320);
      const limit = longContext && !plan.list ? Math.max(plan.maxTokens, 280) : plan.maxTokens;
      const started = Date.now();
      const output = await generator(messages, {
        max_new_tokens: calc ? Math.min(cap, 12) : Math.min(cap, limit),
        do_sample: false,
        repetition_penalty: profile.repetitionPenalty,
        ...(profile.noRepeatNgram ? { no_repeat_ngram_size: profile.noRepeatNgram } : {}),
        ...(profile.disableThinking && qwen3(model) ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        streamer,
        stopping_criteria: stopper,
      });
      const last = output?.[0]?.generated_text;
      const raw = Array.isArray(last) ? (last.at(-1)?.content ?? acc) : String(last ?? acc);
      const cleaned = closeClean(stripThinking(trimRepetition(broken ? acc : raw)), plan);
      const trimmed = verifiedAnswer(cleaned, calc);
      const ms = Date.now() - started;
      const tokens = Math.max(1, generator.tokenizer.encode(String(trimmed || acc)).length);
      const promptTokens = messages.reduce((sum, item) => sum + generator.tokenizer.encode(String(item.content || "")).length, 0);
      post({ type: "done", id: msg.id, text: trimmed, broken: broken && trimmed.trim().length < 60, tokens, promptTokens, ms, threads: wasmThreadCount });
      post({ type: "settled", id: msg.id });
    }
  } catch (error) {
    post({ type: "settled", id: msg?.id });
    generator = null;
    loadedKey = "";
    loadedModel = null;
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    let kind = "other";
    if (/allocat|out of memory|OOM|memory access out of bounds/i.test(message)) kind = "memory";
    else if (/webgpu|gpu|adapter/i.test(message)) kind = "gpu";
    else if (/QuotaExceeded/i.test(message)) kind = "quota";
    else if (/Failed to fetch|NetworkError|network/i.test(message)) kind = "network";
    post({ type: "error", id: msg.id, message, kind });
  }
}
