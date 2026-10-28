/** Studio llama al motor solo si esa página ya lo tiene listo y el id es de terceros. Si no, el catálogo sigue. */

import { catalogAsk, createRequest, settleResult } from "./contract.mjs";
import { modelById } from "./models.mjs";

const DEFAULT_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function studioAsk(input) {
  const engine = globalThis.__ARQIVEN_ENGINE__;
  if (!engine || engine.ready !== true || typeof engine.run !== "function") return catalogAsk();
  const text = String(input?.text || "").trim();
  if (!text) return catalogAsk();
  const request = createRequest({
    source: "studio",
    task: "ask",
    messages: [{ role: "user", content: text }],
  });
  const limit = Number(engine.timeoutMs) > 0 ? Number(engine.timeoutMs) : DEFAULT_TIMEOUT_MS;
  let raw = null;
  try {
    raw = await withTimeout(engine.run(request), limit);
  } catch {
    return catalogAsk();
  }
  if (!raw || typeof raw !== "object") return catalogAsk();
  const settled = settleResult(request, raw);
  const modelId = String(settled.modelId || "");
  if (settled.provider !== "third-party" || !settled.text.trim() || !modelById(modelId)) return catalogAsk();
  const mode = settled.mode === "mixed" || settled.mode === "extractive" || settled.mode === "model" ? settled.mode : "model";
  return {
    text: settled.text.trim().slice(0, 2000),
    mode,
    provider: "third-party",
    modelId,
    modelVersion: typeof settled.modelVersion === "string" ? settled.modelVersion.slice(0, 80) : "",
  };
}
