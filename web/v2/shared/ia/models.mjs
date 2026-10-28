/** Catálogo de terceros que ya usa Work. No descarga pesos y no crea un id Arqiven-N. */

import { honestResult, settleResult } from "./contract.mjs";

export const TRANSFORMERS_ESM = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm";
export const ONNX_WASM = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";

export const THIRD_PARTY_MODELS = [
  { id: "smol135-cpu", repo: "HuggingFaceTB/SmolLM2-135M-Instruct", version: "SmolLM2-135M-Instruct", device: "wasm", dtype: "q8", sizeMb: 140 },
  { id: "qwen05-cpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", version: "Qwen2.5-0.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 520 },
  { id: "qwen05-gpu", repo: "onnx-community/Qwen2.5-0.5B-Instruct", version: "Qwen2.5-0.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 490 },
  { id: "qwen15-cpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", version: "Qwen2.5-1.5B-Instruct", device: "wasm", dtype: "q8", sizeMb: 1580 },
  { id: "qwen15-gpu", repo: "onnx-community/Qwen2.5-1.5B-Instruct", version: "Qwen2.5-1.5B-Instruct", device: "webgpu", dtype: "q4f16", sizeMb: 1240 },
  { id: "lfm350-gpu", repo: "onnx-community/LFM2-350M-ONNX", version: "LFM2-350M", device: "webgpu", dtype: "q4f16", sizeMb: 255 },
  { id: "lfm350-gpu32", repo: "onnx-community/LFM2-350M-ONNX", version: "LFM2-350M", device: "webgpu", dtype: "q4", sizeMb: 295 },
];

export function modelById(id) {
  return THIRD_PARTY_MODELS.find((item) => item.id === id) || null;
}

export function defaultModel() {
  return modelById("smol135-cpu");
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
