/** Catálogo de terceros que ya usa Work. No descarga pesos y no crea un id Arqiven-N. */

import { honestResult, settleResult } from "./contract.mjs";

export const TRANSFORMERS_ESM = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm";
export const ORT_WASM_MJS = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.wasm.min.mjs";
export const ONNX_WASM = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

export const CPU_DEFAULT = "qwen35-cpu";
export const CPU_FALLBACK = "smol135-cpu";
export const LOW_MEMORY_GB = 4;

export const THIRD_PARTY_MODELS = [
  { id: "qwen35-cpu", repo: "onnx-community/Qwen3.5-0.8B-Text-ONNX", version: "Qwen3.5-0.8B", device: "wasm", dtype: "q4", sizeMb: 526, contextChars: 12000, contextTurns: 12, maxTokens: 320 },
  { id: "smol135-cpu", repo: "HuggingFaceTB/SmolLM2-135M-Instruct", version: "SmolLM2-135M-Instruct", device: "wasm", dtype: "q8", sizeMb: 140, contextChars: 3200, contextTurns: 4, maxTokens: 160 },
  { id: "qwen05-cpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", version: "Qwen2.5-0.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 520, contextChars: 8000, contextTurns: 8, maxTokens: 320 },
  { id: "qwen05-cpu-q4", repo: "onnx-community/Qwen2.5-0.5B-Instruct", version: "Qwen2.5-0.5B-Instruct", device: "wasm", dtype: "q4", sizeMb: 400, contextChars: 8000, contextTurns: 8, maxTokens: 320, listed: false },
  { id: "qwen05-gpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", version: "Qwen2.5-0.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 490, contextChars: 8000, contextTurns: 8, maxTokens: 320 },
  { id: "qwen15-cpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", version: "Qwen2.5-1.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 1580, contextChars: 12000, contextTurns: 12, maxTokens: 512 },
  { id: "qwen15-gpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", version: "Qwen2.5-1.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 1240, contextChars: 12000, contextTurns: 12, maxTokens: 512 },
  { id: "lfm350-gpu", repo: "onnx-community/LFM2-350M-ONNX", version: "LFM2-350M", device: "webgpu", dtype: "q4f16", sizeMb: 255, contextChars: 8000, contextTurns: 8, maxTokens: 320 },
  { id: "lfm350-gpu32", repo: "onnx-community/LFM2-350M-ONNX", version: "LFM2-350M", device: "webgpu", dtype: "q4", sizeMb: 295, contextChars: 8000, contextTurns: 8, maxTokens: 320 },
];

export function modelById(id) {
  return THIRD_PARTY_MODELS.find((item) => item.id === id) || null;
}

export function defaultModel() {
  return modelById(CPU_DEFAULT);
}

export function lowMemory(hints = {}) {
  const memory = Number(hints.memory) || 0;
  return memory > 0 && memory < LOW_MEMORY_GB;
}

/** En CPU el defecto es Qwen3.5-0.8B q4. SmolLM2 entra si hay poca memoria. Con WebGPU se mantiene el modelo de GPU. */
export function modelForDevice(hints = {}) {
  if (!hints.webgpu) return lowMemory(hints) ? modelById(CPU_FALLBACK) : defaultModel();
  const memory = Number(hints.memory) || 0;
  if (memory >= 8 || (memory === 0 && hints.wide === true)) return modelById("qwen15-gpu");
  return modelById("qwen05-gpu");
}

export function canUseModel(model, hints = {}) {
  if (!model || model.listed === false) return false;
  if (model.device === "webgpu" && !hints.webgpu) return false;
  if (!hints.webgpu && lowMemory(hints) && model.id !== CPU_FALLBACK && model.sizeMb > 200) return false;
  return true;
}

export function stepDown(id, webgpu) {
  const order = webgpu ? ["qwen15-gpu", "qwen05-gpu", CPU_FALLBACK] : [CPU_DEFAULT, CPU_FALLBACK];
  const index = order.indexOf(id);
  if (index < 0) return id === CPU_FALLBACK ? null : CPU_FALLBACK;
  return order[index + 1] || null;
}

export function downloadProgress(progress = {}) {
  const loaded = Number(progress.loaded) || 0;
  const total = Number(progress.total) || 0;
  if (total <= 0) return { known: false, pct: 0 };
  return { known: true, pct: Math.min(100, Math.round((loaded / total) * 100)) };
}

export function badgeOf(result) {
  const mode = typeof result?.mode === "string" ? result.mode : "rules";
  const provider = typeof result?.provider === "string" ? result.provider : "none";
  const modelId = typeof result?.modelId === "string" ? result.modelId : "none";
  const version = typeof result?.modelVersion === "string" && result.modelVersion ? ` · ${result.modelVersion}` : "";
  return `${mode} · ${provider} · ${modelId}${version}`;
}

/** Un id arqiven-* sin checkpoint no sale como modelo propio. Un id desconocido tampoco. */
export function thirdPartyResult(request, raw = {}) {
  const claimed = typeof raw.modelId === "string" ? raw.modelId : "";
  const lang = typeof raw.lang === "string" ? raw.lang : "es";
  if (raw.provider === "arqiven" || claimed.startsWith("arqiven-")) {
    return settleResult(request, {
      text: raw.text,
      modelId: claimed || "arqiven-1-experimental",
      provider: "arqiven",
      mode: "model",
      checkpoint: raw.checkpoint === true,
      lang,
    });
  }
  const model = modelById(claimed);
  if (!model || raw.provider !== "third-party") return honestResult(request, lang);
  const mode = raw.mode === "mixed" || raw.mode === "extractive" || raw.mode === "model" ? raw.mode : "model";
  return settleResult(request, {
    text: typeof raw.text === "string" ? raw.text : "",
    modelId: model.id,
    modelVersion: model.version,
    provider: "third-party",
    mode,
    checkpoint: false,
    lang,
  });
}
