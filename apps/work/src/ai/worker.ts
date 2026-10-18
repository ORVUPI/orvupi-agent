/// <reference lib="webworker" />
/** ORVUPI AI: el modelo corre aquí, en un Web Worker del propio navegador. El texto nunca sale del dispositivo;
 *  solo se descargan los pesos del modelo (Hugging Face) y el motor WASM la primera vez, y quedan en caché. */
import { env, InterruptableStoppingCriteria, pipeline, TextStreamer, type TextGenerationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;
// Motor ONNX en WebAssembly desde jsDelivr (gratuito, versión fijada al paquete instalado).
const onnx = env.backends.onnx as { wasm?: { wasmPaths?: string } };
if (onnx.wasm) onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";

type Message = { role: "system" | "user" | "assistant"; content: string };
type Incoming =
  | { type: "load"; model: string; device: "webgpu" | "wasm"; dtype: string }
  | { type: "generate"; id: number; messages: Message[]; maxTokens: number }
  | { type: "stop" };

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
    if (msg.type === "load") {
      const key = `${msg.model}|${msg.device}|${msg.dtype}`;
      if (generator && key === loadedKey) {
        post({ type: "ready", key });
        return;
      }
      const files = new Map<string, { loaded: number; total: number }>();
      generator = (await pipeline("text-generation", msg.model, {
        device: msg.device,
        dtype: msg.dtype as "q4f16",
        progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (info.status === "progress" && info.file && info.total) {
            files.set(info.file, { loaded: info.loaded ?? 0, total: info.total });
            let loaded = 0;
            let total = 0;
            for (const f of files.values()) { loaded += f.loaded; total += f.total; }
            post({ type: "progress", loaded, total, file: info.file });
          }
        },
      })) as TextGenerationPipeline;
      loadedKey = key;
      // Calentamiento corto: compila el modelo para que la primera respuesta no tarde de más
      await generator([{ role: "user", content: "Hola" }], { max_new_tokens: 1 });
      post({ type: "ready", key });
      return;
    }
    if (msg.type === "generate") {
      if (!generator) throw new Error("not-loaded");
      stopper.reset();
      const started = performance.now();
      let tokens = 0;
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          tokens += 1;
          post({ type: "token", id: msg.id, text });
        },
      });
      const output = (await generator(msg.messages, {
        max_new_tokens: msg.maxTokens,
        do_sample: false,
        repetition_penalty: 1.15,
        streamer,
        stopping_criteria: stopper,
      })) as Array<{ generated_text: Message[] | string }>;
      const last = output[0]?.generated_text;
      const text = Array.isArray(last) ? (last.at(-1)?.content ?? "") : String(last ?? "");
      post({ type: "done", id: msg.id, text, tokens, ms: Math.round(performance.now() - started) });
    }
  } catch (error) {
    post({ type: "error", id: (msg as { id?: number }).id, message: error instanceof Error ? error.message : String(error) });
  }
});
