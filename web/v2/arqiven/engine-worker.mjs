/** Worker del mismo motor que Work (Transformers.js + ONNX). Los id son de terceros. */

import { ONNX_WASM, TRANSFORMERS_ESM, modelById } from "/shared/ia/models.mjs";

const SYSTEM = "Trabajas dentro del navegador, con un modelo de terceros. Escribes de forma clara y breve. No digas que eres Arqiven-N ni que ARQIVEN entrenó este modelo.";

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
  const slice = String(text || "").slice(-160);
  return slice.length > 24 && (/!\[/.test(slice) || /([^\p{L}\p{N}\s])\1{7,}/u.test(slice));
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
      const history = Array.isArray(msg.messages) ? msg.messages.flatMap((item) => {
        if (!item || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
        return [{ role: item.role, content: item.content.slice(0, 8000) }];
      }).slice(-12) : [];
      const messages = [{ role: "system", content: hint ? `${SYSTEM} ${hint}` : SYSTEM }, ...history];
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
        max_new_tokens: Math.min(256, Number(msg.maxTokens) || 256),
        do_sample: false,
        repetition_penalty: 1.12,
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
