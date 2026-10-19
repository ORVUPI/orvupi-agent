import { clearStored, isStored, modelWeightsKey } from "./download";

/** ORVUPI AI en el navegador: catálogo de modelos, comprobación del dispositivo, descarga con progreso y generación en un Web Worker. */

export type AiDevice = "webgpu" | "wasm";
export type AiModel = {
  id: string;
  repo: string;
  device: AiDevice;
  dtype: string;
  sizeMb: number;
  label: "modelGpuSmall" | "modelGpuLarge" | "modelCpu" | "modelCpuLarge" | "modelTiny" | "modelLfm" | "modelGemma";
  needs: "webgpu-f16" | "webgpu" | "wasm";
  minMemoryGb?: number;
  /** Pesos en un archivo aparte («.onnx_data») */
  externalData?: boolean;
};

export const AI_MODELS: AiModel[] = [
  { id: "qwen05-gpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 490, label: "modelGpuSmall", needs: "webgpu-f16" },
  { id: "qwen15-gpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 1240, label: "modelGpuLarge", needs: "webgpu-f16", minMemoryGb: 8 },
  { id: "qwen05-cpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 520, label: "modelCpu", needs: "wasm" },
  { id: "qwen15-cpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 1580, label: "modelCpuLarge", needs: "wasm", minMemoryGb: 8 },
  { id: "lfm350-cpu", repo: "onnx-community/LFM2-350M-ONNX", device: "wasm", dtype: "q4", sizeMb: 295, label: "modelLfm", needs: "wasm", externalData: true },
  { id: "gemma270-cpu", repo: "onnx-community/gemma-3-270m-it-ONNX", device: "wasm", dtype: "q4", sizeMb: 325, label: "modelGemma", needs: "wasm", externalData: true },
  { id: "smol135-cpu", repo: "HuggingFaceTB/SmolLM2-135M-Instruct", device: "wasm", dtype: "q8", sizeMb: 140, label: "modelTiny", needs: "wasm" },
];

export type AiSupport = { webgpu: boolean; f16: boolean; wasm: boolean; memoryGb: number | null; mobile: boolean; gpu?: string; cores?: number };

export async function detectAiSupport(): Promise<AiSupport> {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string>; info?: { vendor?: string; architecture?: string; description?: string } } | null> }; deviceMemory?: number; userAgentData?: { mobile?: boolean } };
  let webgpu = false;
  let f16 = false;
  let gpu = "";
  try {
    const adapter = nav.gpu ? await nav.gpu.requestAdapter() : null;
    webgpu = Boolean(adapter);
    f16 = Boolean(adapter?.features.has("shader-f16"));
    gpu = [adapter?.info?.vendor, adapter?.info?.architecture, adapter?.info?.description].filter(Boolean).join(" ");
  } catch {
    webgpu = false;
  }
  const wasm = typeof WebAssembly === "object" && typeof Worker !== "undefined";
  const mobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  return { webgpu, f16, wasm, memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null, mobile, gpu, cores: nav.hardwareConcurrency };
}

/** Lo que funcionó (o falló) en este dispositivo, para no repetir pruebas: se guarda en el propio navegador. */
type DeviceMemory = { device: string; good?: string; bad: Record<string, number> };
const MEMORY_KEY = "orvupi-ai-device-v1";
const BAD_TTL = 30 * 24 * 3600 * 1000;

export function deviceId(support: AiSupport): string {
  return `${support.mobile ? "m" : "d"}|${support.webgpu ? (support.f16 ? "gpu16" : "gpu") : "nogpu"}|${support.gpu ?? ""}`;
}

export function readDeviceMemory(support: AiSupport): DeviceMemory {
  const fresh: DeviceMemory = { device: deviceId(support), bad: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? "null") as DeviceMemory | null;
    if (!raw || raw.device !== fresh.device) return fresh;
    const now = Date.now();
    for (const [id, at] of Object.entries(raw.bad ?? {})) if (now - at > BAD_TTL) delete raw.bad[id];
    return { ...raw, bad: raw.bad ?? {} };
  } catch {
    return fresh;
  }
}

export function rememberModel(support: AiSupport, id: string, ok: boolean): void {
  try {
    const mem = readDeviceMemory(support);
    if (ok) { mem.good = id; delete mem.bad[id]; }
    else { mem.bad[id] = Date.now(); if (mem.good === id) delete mem.good; }
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch {
    // sin almacenamiento: se vuelve a probar la próxima vez
  }
}

/** Orden automático de prueba: el que ya funcionó; si no, GPU (WebGPU) → CPU (WASM) → modelos más ligeros.
 *  Los que fallaron en este dispositivo se dejan para el final. Los grandes (1.5B) solo se eligen a mano. */
export function modelChain(support: AiSupport, mem: DeviceMemory = { device: "", bad: {} }): AiModel[] {
  const list = usableModels(support);
  const ids = support.mobile
    ? ((support.memoryGb ?? 4) <= 2 ? ["smol135-cpu", "lfm350-cpu"] : ["lfm350-cpu", "smol135-cpu"])
    : ["qwen05-gpu", "qwen05-cpu", "lfm350-cpu", "smol135-cpu"];
  const chain = ids.map((id) => list.find((m) => m.id === id)).filter((m): m is AiModel => Boolean(m));
  const good = chain.find((m) => m.id === mem.good);
  const ok = chain.filter((m) => m !== good && !mem.bad[m.id]);
  const bad = chain.filter((m) => m !== good && mem.bad[m.id]);
  return [...(good ? [good] : []), ...ok, ...bad];
}

/** ¿La prueba corta del modelo dio texto de verdad? (no «!!!!», no vacío) */
export function probeOk(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/([^\p{L}\p{N}\s])\1{2,}/u.test(t)) return false;
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  return letters >= 3 && letters / t.length > 0.5;
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

/** El más adecuado. En el móvil, LFM2 350M (q4, ~295 MB, WASM): multilingüe y bueno en español, más rápido que
 *  SmolLM2 135M y con menos memoria que Qwen2.5 0.5B (que fallaba al descargarse o cargarse en teléfonos). Con poca
 *  memoria (≤ 2 GB) se queda en SmolLM2 135M. En ordenador: GPU pequeño si hay WebGPU con f16; si no, CPU (WASM).
 *  En todos los casos el contenido sale del propio texto (extracción) y el modelo solo redacta lo que se comprueba. */
export function recommendedModel(support: AiSupport): AiModel | null {
  const list = usableModels(support);
  if (list.length === 0) return null;
  if (support.mobile) {
    const small = (support.memoryGb ?? 4) <= 2;
    return list.find((model) => model.id === (small ? "smol135-cpu" : "lfm350-cpu")) ?? list.find((model) => model.id === "smol135-cpu") ?? list[0]!;
  }
  const gpu = list.find((model) => model.id === "qwen05-gpu");
  if (gpu) return gpu;
  return list.find((model) => model.id === "qwen05-cpu") ?? list[0]!;
}

/** ¿Ya está descargado? (caché del navegador de transformers.js) */
export async function isModelCached(model: AiModel): Promise<boolean> {
  return isStored(modelWeightsKey(model.repo, model.dtype, model.externalData));
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
export type GenResult = { text: string; tokens: number; ms: number; degenerate?: boolean };
export type GenOptions = { repetitionPenalty?: number; noRepeatNgram?: number; sample?: boolean };
type Pending = { onToken: (text: string) => void; resolve: (r: GenResult) => void; reject: (e: Error) => void };

export class AiEngine {
  private worker: Worker | null = null;
  private loadedKey = "";
  private seq = 0;
  private pending = new Map<number, Pending>();
  private loading: { resolve: () => void; reject: (e: Error) => void; onProgress: (loaded: number, total: number) => void; onPreparing?: () => void } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private prepareTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tras este tiempo sin usarse se libera la memoria del modelo (vuelve a cargarse de OPFS, sin descargar). */
  idleMs = 15 * 60 * 1000;
  /** Tiempo máximo preparando (compilar + prueba) tras la descarga: si se atasca se pasa al siguiente modelo. */
  prepareMs = 150 * 1000;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent) => {
      const msg = event.data as { type: string; id?: number; text?: string; loaded?: number; total?: number; key?: string; probe?: string; tokens?: number; ms?: number; degenerate?: boolean; message?: string; kind?: string; detail?: Record<string, string | number> };
      if (msg.type === "progress") this.loading?.onProgress(msg.loaded ?? 0, msg.total ?? 0);
      else if (msg.type === "preparing") {
        this.loading?.onPreparing?.();
        if (this.prepareTimer) clearTimeout(this.prepareTimer);
        this.prepareTimer = setTimeout(() => {
          const pending = this.loading;
          this.reset();
          pending?.reject(new AiLoadError("prepare-timeout", "timeout", {}));
        }, this.prepareMs);
      } else if (msg.type === "ready") {
        if (this.prepareTimer) clearTimeout(this.prepareTimer);
        const pending = this.loading;
        this.loading = null;
        if (msg.probe !== undefined && !probeOk(msg.probe)) {
          // La prueba dio basura («!!!!»): este modelo/backend no sirve en este dispositivo
          this.reset();
          pending?.reject(new AiLoadError(`probe: ${msg.probe.slice(0, 40)}`, "probe", {}));
        } else {
          this.loadedKey = msg.key ?? "";
          this.touch();
          pending?.resolve();
        }
      }
      else if (msg.type === "token" && msg.id !== undefined) this.pending.get(msg.id)?.onToken(msg.text ?? "");
      else if (msg.type === "done" && msg.id !== undefined) { this.pending.get(msg.id)?.resolve({ text: msg.text ?? "", tokens: msg.tokens ?? 0, ms: msg.ms ?? 0, degenerate: msg.degenerate }); this.pending.delete(msg.id); }
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

  load(model: AiModel, onProgress: (loaded: number, total: number) => void, onPreparing?: () => void): Promise<void> {
    if (this.isLoaded(model)) return Promise.resolve();
    if (this.loadedKey || this.loading) this.reset();
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      this.loading = { resolve, reject, onProgress, onPreparing };
      worker.postMessage({ type: "load", model: model.repo, device: model.device, dtype: model.dtype });
    });
  }

  /** Las peticiones se ponen en cola: el worker atiende una generación cada vez. */
  generate(messages: ChatMessage[], maxTokens: number, onToken: (text: string) => void, options: GenOptions = {}): Promise<GenResult> {
    const run = () => {
      const worker = this.ensureWorker();
      const id = ++this.seq;
      if (this.idleTimer) clearTimeout(this.idleTimer);
      return new Promise<GenResult>((resolve, reject) => {
        this.pending.set(id, { onToken, resolve: (r) => { this.touch(); resolve(r); }, reject: (e) => { this.touch(); reject(e); } });
        worker.postMessage({ type: "generate", id, messages, maxTokens, options });
      });
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private touch(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.unload(), this.idleMs);
  }

  /** Libera la memoria del modelo sin borrar la descarga. */
  unload(): void {
    if (this.pending.size > 0 || this.loading) return;
    this.reset();
  }

  stop(): void {
    this.worker?.postMessage({ type: "stop" });
  }

  reset(): void {
    if (this.prepareTimer) clearTimeout(this.prepareTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
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
