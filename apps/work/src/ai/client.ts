/** Envoltorio del motor. Encendido salvo localStorage arqiven-core=0.
 * No renombra Qwen, LFM2 ni SmolLM2 a Arqiven-N.
 */

import { settleResult, type AiRequest, type AiResult } from "./contract";

export function coreEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem("arqiven-core") !== "0";
  } catch {
    return true;
  }
}

export async function runWorkGenerate<T extends { text: string }>(
  request: AiRequest,
  generate: () => Promise<T & { modelId: string; provider: AiResult["provider"]; mode: AiResult["mode"]; checkpoint?: boolean; modelVersion?: string }>,
): Promise<T & AiResult> {
  const raw = await generate();
  const settled = settleResult(request, raw);
  return { ...raw, ...settled };
}
