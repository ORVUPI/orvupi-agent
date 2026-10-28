/** Studio llama al motor solo si esa página ya lo tiene listo. Si no, el catálogo sigue. */

import { catalogAsk, createRequest, settleResult } from "./contract.mjs";

export async function studioAsk(input) {
  const engine = globalThis.__ARQIVEN_ENGINE__;
  if (!engine || engine.ready !== true || typeof engine.run !== "function") return catalogAsk();
  const request = createRequest({
    source: "studio",
    task: "ask",
    messages: [{ role: "user", content: String(input?.text || "") }],
  });
  let raw = null;
  try {
    raw = await engine.run(request);
  } catch {
    return catalogAsk();
  }
  const settled = settleResult(request, raw && typeof raw === "object" ? raw : {});
  if (settled.provider === "third-party" && settled.text && !String(settled.modelId).startsWith("arqiven-")) {
    return { text: settled.text, mode: settled.mode, provider: "third-party", modelId: settled.modelId };
  }
  return catalogAsk();
}
