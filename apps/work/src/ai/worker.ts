/// <reference lib="webworker" />
/** ORVUPI AI: el modelo corre aquí, en un Web Worker del propio navegador. El texto nunca sale del dispositivo;
 *  solo se descargan los pesos del modelo (Hugging Face) y el motor WASM la primera vez, y quedan en caché. */
import { ModelDownloadError, robustFetch } from "./download";
import { isDegenerate } from "./clean";
import { wasmThreadCount } from "./runtime";
import { env, InterruptableStoppingCriteria, pipeline, TextStreamer, type TextGenerationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
// Los pesos se guardan en OPFS con nuestra descarga por partes (la Cache API falla con entradas de cientos de MB).
env.useBrowserCache = false;
let onFileProgress: (file: string, loaded: number, total: number) => void = () => undefined;
const nativeFetch = fetch.bind(self);
env.fetch = (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  if (/^https:\/\/huggingface\.co\//.test(url) && (!init?.method || init.method === "GET")) return robustFetch(url, (f, l, t) => onFileProgress(f, l, t), nativeFetch);
  return nativeFetch(input, init);
};
// Motor ONNX en WebAssembly desde jsDelivr (gratuito, versión fijada al paquete instalado).
const onnx = env.backends.onnx as { wasm?: { wasmPaths?: string; numThreads?: number } };
if (onnx.wasm) {
  onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";
  // Sin Cross-Origin Isolation no hay SharedArrayBuffer: varios hilos impiden arrancar WASM.
  const cores = (self.navigator as Navigator | undefined)?.hardwareConcurrency;
  const isolated = typeof crossOriginIsolated === "boolean" ? crossOriginIsolated : false;
  onnx.wasm.numThreads = wasmThreadCount(cores, isolated);
}

type Message = { role: "system" | "user" | "assistant"; content: string };
type Incoming =
  | { type: "load"; model: string; device: "webgpu" | "wasm"; dtype: string }
  | { type: "generate"; id: number; messages: Message[]; maxTokens: number; options?: { repetitionPenalty?: number; noRepeatNgram?: number; sample?: boolean } }
  | { type: "stop" }
  | { type: "dispose" };

let generator: TextGenerationPipeline | null = null;
let loadedKey = "";
const stopper = new InterruptableStoppingCriteria();
const post = (data: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(data);

self.addEventListener("message", async (event: MessageEvent<Incoming>) => {
  const msg = event.data;
  try {
    if (msg.type === "stop") {
      stopper.interrupt();
      return;
    }
    if (msg.type === "dispose") {
      // Libera la memoria del modelo (pesos y sesión de ONNX)
      await (generator as unknown as { dispose?: () => Promise<void> } | null)?.dispose?.();
      generator = null;
      loadedKey = "";
      post({ type: "disposed" });
      return;
    }
    if (msg.type === "load") {
      const key = `${msg.model}|${msg.device}|${msg.dtype}`;
      if (generator && key === loadedKey) {
        post({ type: "ready", key });
        return;
      }
      const files = new Map<string, { loaded: number; total: number }>();
      let last = 0;
      onFileProgress = (file, loadedNow, totalNow) => {
        files.set(file, { loaded: loadedNow, total: totalNow });
        const now = Date.now();
        if (now - last < 200 && loadedNow < totalNow) return;
        last = now;
        let loaded = 0;
        let total = 0;
        for (const f of files.values()) { loaded += f.loaded; total += f.total; }
        post({ type: "progress", loaded, total, file });
      };
      generator = (await pipeline("text-generation", msg.model, {
        device: msg.device,
        dtype: msg.dtype as "q4f16",
      })) as TextGenerationPipeline;
      loadedKey = key;
      post({ type: "preparing" });
      // Prueba real y corta: compila el modelo y comprueba que genera texto (con algunas GPU y pesos fp16 los
      // valores se desbordan, los logits salen NaN y el modelo solo escribe el token 0, que en Qwen es «!»)
      const probe = (await generator([{ role: "user", content: "Escribe solo esta frase: El cielo es azul." }], { max_new_tokens: 8, do_sample: false })) as Array<{ generated_text: Message[] | string }>;
      const g = probe[0]?.generated_text;
      const probeText = Array.isArray(g) ? (g.at(-1)?.content ?? "") : String(g ?? "");
      post({ type: "ready", key, probe: probeText });
      return;
    }
    if (msg.type === "generate") {
      if (!generator) throw new Error("not-loaded");
      stopper.reset();
      const started = performance.now();
      let tokens = 0;
      let acc = "";
      let degenerate = false;
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          tokens += 1;
          acc += text;
          // Corta en cuanto la salida degenera («![](!!!!…», bucles): no tiene sentido seguir generando basura
          if (!degenerate && acc.length > 24 && isDegenerate(acc.slice(-160)) && /!\[|([^\p{L}\p{N}\s])\1{7,}|(.{6,}?)\2{4,}/u.test(acc.slice(-160))) {
            degenerate = true;
            stopper.interrupt();
          }
          post({ type: "token", id: msg.id, text });
        },
      });
      const output = (await generator(msg.messages, {
        max_new_tokens: msg.maxTokens,
        do_sample: Boolean(msg.options?.sample),
        ...(msg.options?.sample ? { temperature: 0.4, top_p: 0.9 } : {}),
        repetition_penalty: msg.options?.repetitionPenalty ?? 1.2,
        no_repeat_ngram_size: msg.options?.noRepeatNgram ?? 0,
        streamer,
        stopping_criteria: stopper,
      })) as Array<{ generated_text: Message[] | string }>;
      const last = output[0]?.generated_text;
      const text = Array.isArray(last) ? (last.at(-1)?.content ?? "") : String(last ?? "");
      post({ type: "done", id: msg.id, text, tokens, degenerate: degenerate || isDegenerate(text), ms: Math.round(performance.now() - started) });
    }
  } catch (error) {
    post({ type: "error", id: (msg as { id?: number }).id, ...describeError(error, msg.type === "load" ? msg.device : undefined) });
  }
});

/** Clasifica el error para que la interfaz explique la causa real. */
function describeError(error: unknown, device?: string): { message: string; kind: string; detail: Record<string, string | number> } {
  if (error instanceof ModelDownloadError) return { message: error.message, kind: error.kind, detail: error.detail };
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (/allocat|out of memory|Aborted\(\)|memory access out of bounds|OOM|RangeError: Array buffer/i.test(message)) return { message, kind: "memory", detail: {} };
  if (device === "webgpu" && /webgpu|gpu|adapter|device lost|no available backend/i.test(message)) return { message, kind: "gpu", detail: {} };
  if (/QuotaExceeded/i.test(message)) return { message, kind: "quota", detail: {} };
  if (/network error|Failed to fetch|NetworkError|Load failed/i.test(message)) return { message, kind: "network", detail: {} };
  return { message, kind: "other", detail: {} };
}
