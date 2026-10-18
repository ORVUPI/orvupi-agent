import { clearStored, isStored, modelWeightsKey } from "./download";

/** ORVUPI AI en el navegador: catálogo de modelos, comprobación del dispositivo, descarga con progreso y generación en un Web Worker. */

export type AiDevice = "webgpu" | "wasm";
export type AiModel = {
  id: string;
  repo: string;
  device: AiDevice;
  dtype: string;
  sizeMb: number;
  label: "modelGpuSmall" | "modelGpuLarge" | "modelCpu" | "modelCpuLarge" | "modelTiny";
  needs: "webgpu-f16" | "webgpu" | "wasm";
  minMemoryGb?: number;
};

export const AI_MODELS: AiModel[] = [
  { id: "qwen05-gpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 490, label: "modelGpuSmall", needs: "webgpu-f16" },
  { id: "qwen15-gpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 1240, label: "modelGpuLarge", needs: "webgpu-f16", minMemoryGb: 8 },
  { id: "qwen05-cpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 520, label: "modelCpu", needs: "wasm" },
  { id: "qwen15-cpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 1580, label: "modelCpuLarge", needs: "wasm", minMemoryGb: 8 },
  { id: "smol135-cpu", repo: "HuggingFaceTB/SmolLM2-135M-Instruct", device: "wasm", dtype: "q8", sizeMb: 140, label: "modelTiny", needs: "wasm" },
];

export type AiSupport = { webgpu: boolean; f16: boolean; wasm: boolean; memoryGb: number | null; mobile: boolean };

export async function detectAiSupport(): Promise<AiSupport> {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> }; deviceMemory?: number; userAgentData?: { mobile?: boolean } };
  let webgpu = false;
  let f16 = false;
  try {
    const adapter = nav.gpu ? await nav.gpu.requestAdapter() : null;
    webgpu = Boolean(adapter);
    f16 = Boolean(adapter?.features.has("shader-f16"));
  } catch {
    webgpu = false;
  }
  const wasm = typeof WebAssembly === "object" && typeof Worker !== "undefined";
  const mobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  return { webgpu, f16, wasm, memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null, mobile };
}

export function usableModels(support: AiSupport): AiModel[] {
  return AI_MODELS.filter((model) => {
    if (model.needs === "webgpu-f16" && !(support.webgpu && support.f16)) return false;
    if (model.needs === "webgpu" && !support.webgpu) return false;
    if (model.needs === "wasm" && !support.wasm) return false;
    if (model.minMemoryGb && (support.memoryGb ?? 4) < model.minMemoryGb) return false;
    if (model.minMemoryGb && support.mobile) return false;
    return true;
  });
}

/** El más adecuado. En el móvil, el más ligero (SmolLM2 135M, ~137 MB, WASM): cabe en memoria y se descarga en poco
 *  tiempo; los de ~500 MB fallaban al descargar o al cargarse en teléfonos. En ordenador: GPU pequeño si hay WebGPU
 *  con f16; si no, CPU (WASM). */
export function recommendedModel(support: AiSupport): AiModel | null {
  const list = usableModels(support);
  if (list.length === 0) return null;
  if (support.mobile) return list.find((model) => model.id === "smol135-cpu") ?? list[0]!;
  const gpu = list.find((model) => model.id === "qwen05-gpu");
  if (gpu) return gpu;
  if (support.mobile && (support.memoryGb ?? 4) < 4) return list.find((model) => model.id === "smol135-cpu") ?? list[0]!;
  return list.find((model) => model.id === "qwen05-cpu") ?? list[0]!;
}

/** ¿Ya está descargado? (caché del navegador de transformers.js) */
export async function isModelCached(model: AiModel): Promise<boolean> {
  return isStored(modelWeightsKey(model.repo, model.dtype));
}

export async function removeCachedModels(): Promise<void> {
  await clearStored();
  // Restos de la versión 0.8.4, que guardaba en la Cache API
  if (typeof caches !== "undefined") await caches.delete("transformers-cache").catch(() => false);
}

/** Error de carga con la causa clasificada en el worker. */
export class AiLoadError extends Error {
  constructor(message: string, public readonly kind: string, public readonly detail: Record<string, string | number>) {
    super(message);
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type Pending = { onToken: (text: string) => void; resolve: (r: { text: string; tokens: number; ms: number }) => void; reject: (e: Error) => void };

export class AiEngine {
  private worker: Worker | null = null;
  private loadedKey = "";
  private seq = 0;
  private pending = new Map<number, Pending>();
  private loading: { resolve: () => void; reject: (e: Error) => void; onProgress: (loaded: number, total: number) => void } | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent) => {
      const msg = event.data as { type: string; id?: number; text?: string; loaded?: number; total?: number; key?: string; tokens?: number; ms?: number; message?: string; kind?: string; detail?: Record<string, string | number> };
      if (msg.type === "progress") this.loading?.onProgress(msg.loaded ?? 0, msg.total ?? 0);
      else if (msg.type === "ready") { this.loadedKey = msg.key ?? ""; this.loading?.resolve(); this.loading = null; }
      else if (msg.type === "token" && msg.id !== undefined) this.pending.get(msg.id)?.onToken(msg.text ?? "");
      else if (msg.type === "done" && msg.id !== undefined) { this.pending.get(msg.id)?.resolve({ text: msg.text ?? "", tokens: msg.tokens ?? 0, ms: msg.ms ?? 0 }); this.pending.delete(msg.id); }
      else if (msg.type === "error") {
        const error = new AiLoadError(msg.message ?? "error", msg.kind ?? "other", msg.detail ?? {});
        if (msg.id !== undefined && this.pending.has(msg.id)) { this.pending.get(msg.id)!.reject(error); this.pending.delete(msg.id); }
        else if (this.loading) { this.loading.reject(error); this.loading = null; }
      }
    });
    worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "worker");
      this.loading?.reject(error);
      this.loading = null;
      for (const p of this.pending.values()) p.reject(error);
      this.pending.clear();
    });
    this.worker = worker;
    return worker;
  }

  isLoaded(model: AiModel): boolean {
    return this.loadedKey === `${model.repo}|${model.device}|${model.dtype}`;
  }

  load(model: AiModel, onProgress: (loaded: number, total: number) => void): Promise<void> {
    if (this.isLoaded(model)) return Promise.resolve();
    if (this.loadedKey) this.reset();
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      this.loading = { resolve, reject, onProgress };
      worker.postMessage({ type: "load", model: model.repo, device: model.device, dtype: model.dtype });
    });
  }

  generate(messages: ChatMessage[], maxTokens: number, onToken: (text: string) => void): Promise<{ text: string; tokens: number; ms: number }> {
    const worker = this.ensureWorker();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { onToken, resolve, reject });
      worker.postMessage({ type: "generate", id, messages, maxTokens });
    });
  }

  stop(): void {
    this.worker?.postMessage({ type: "stop" });
  }

  reset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.loadedKey = "";
    this.loading = null;
    for (const p of this.pending.values()) p.reject(new Error("reset"));
    this.pending.clear();
  }
}

let shared: AiEngine | null = null;
export function aiEngine(): AiEngine {
  shared ??= new AiEngine();
  return shared;
}
