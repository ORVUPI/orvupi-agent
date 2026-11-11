/** Worker del mismo motor que Work (Transformers.js + ONNX). Los id son de terceros. */

import { ONNX_WASM, TRANSFORMERS_ESM, modelById } from "/shared/ia/models.mjs";
import { isDegenerate } from "/shared/ia/quality.mjs";
import { clipHistory } from "/shared/ia/history.mjs";

const SYSTEM = [
  "Eres un modelo de terceros dentro del navegador. ARQIVEN es la IA de ORVUPI y no entrenó estos pesos. No digas que eres Arqiven-N.",
  "Lee la última pregunta y el historial reciente. Identifica la intención: informar, resolver, corregir lo ya dicho o pedir un paso práctico.",
  "Si la pregunta es ambigua, haz una sola pregunta de aclaración. No adivines.",
  "Si no consta en las fuentes ni en lo ya dicho, di que no lo sabes. No contradigas el historial ni inventes cifras.",
  "Responde en el idioma del usuario, con tono natural y profesional: qué has entendido, la respuesta y, si cabe, un paso concreto.",
  "En un problema de varios pasos, cierra con una línea que empiece por «Respuesta final:».",
].join(" ");

const LANG_NAME = { es: "español", en: "English", pt: "português", ja: "日本語", ko: "한국어" };

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
let generator = null;
let loadedKey = "";
let stopper = null;

const post = (data) => self.postMessage(data);

function looksBroken(text) {
  const slice = String(text || "");
  return isDegenerate(slice) || (slice.length > 24 && /!\[/.test(slice.slice(-160)));
}

async function lib() {
  if (toolkit) return toolkit;
  toolkit = await import(TRANSFORMERS_ESM);
  const { env, InterruptableStoppingCriteria } = toolkit;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const wasm = env.backends?.onnx?.wasm;
  if (wasm) {
    wasm.wasmPaths = ONNX_WASM;
    wasm.numThreads = 1;
  }
  stopper = new InterruptableStoppingCriteria();
  return toolkit;
}

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "stop") {
    stopper?.interrupt();
    return;
  }
  void handle(msg);
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
      stopper?.reset();
      const hint = TASK[msg.task] || "";
      const cited = Array.isArray(msg.sources) ? msg.sources.flatMap((item) => {
        if (!item || typeof item.excerpt !== "string" || !item.excerpt) return [];
        return [`[${item.title || item.url || "fuente"}] ${item.url || ""}\n${item.excerpt}`];
      }).slice(0, 4) : [];
      const language = LANG_NAME[msg.lang] || LANG_NAME[msg.lang === "pt-BR" ? "pt" : ""] || "español";
      const sourceNote = cited.length ? `\n\nFuentes. Apóyate solo en ellas y cita el título. Si no responden, di que no consta.\n${cited.join("\n\n")}` : "";
      const history = clipHistory(msg.messages, { turns: 4, maxChars: 3200 });
      const messages = [{ role: "system", content: `${SYSTEM} Responde en ${language}. ${hint}${sourceNote}` }, ...history];
      let acc = "";
      let broken = false;
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text) => {
          acc += text;
          if (!broken && looksBroken(acc)) {
            broken = true;
            stopper?.interrupt();
          }
          post({ type: "token", id: msg.id, text });
        },
      });
      const output = await generator(messages, {
        max_new_tokens: Math.min(120, Number(msg.maxTokens) || 120),
        do_sample: false,
        repetition_penalty: 1.22,
        no_repeat_ngram_size: 5,
        streamer,
        stopping_criteria: stopper,
      });
      const last = output?.[0]?.generated_text;
      const text = Array.isArray(last) ? (last.at(-1)?.content ?? acc) : String(last ?? acc);
      post({ type: "done", id: msg.id, text: broken ? "" : text, broken });
    }
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    let kind = "other";
    if (/allocat|out of memory|OOM|memory access out of bounds/i.test(message)) kind = "memory";
    else if (/webgpu|gpu|adapter/i.test(message)) kind = "gpu";
    else if (/QuotaExceeded/i.test(message)) kind = "quota";
    else if (/Failed to fetch|NetworkError|network/i.test(message)) kind = "network";
    post({ type: "error", id: msg.id, message, kind });
  }
}
