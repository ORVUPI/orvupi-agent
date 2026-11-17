/** Métricas a partir del objeto final de Ollama. El tiempo hasta el primer token lo mide este proceso. */

const COLD_LOAD_NS = 50_000_000;

export function nsToMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round((number / 1e6) * 10) / 10;
}

export function thermalFrom(done) {
  if (!done || done.load_duration == null || done.load_duration === "") return "unknown";
  const load = Number(done.load_duration);
  if (!Number.isFinite(load)) return "unknown";
  return load > COLD_LOAD_NS ? "cold" : "hot";
}

export function metricsFrom({ requestId, model, done, ttftMs, totalMs, error }) {
  const promptTokens = Number(done?.prompt_eval_count) || 0;
  const evalTokens = Number(done?.eval_count) || 0;
  const evalNs = Number(done?.eval_duration) || 0;
  return {
    requestId: String(requestId || ""),
    model: model || "qwen3:8b",
    provider: "third-party",
    ownModel: false,
    thermal: error ? "unknown" : thermalFrom(done),
    ttftMs: Number(ttftMs) || 0,
    totalMs: Number(totalMs) || 0,
    loadMs: nsToMs(done?.load_duration),
    promptEvalMs: nsToMs(done?.prompt_eval_duration),
    evalMs: nsToMs(done?.eval_duration),
    promptTokens,
    evalTokens,
    tokensPerSecond: evalNs > 0 ? Math.round((evalTokens / (evalNs / 1e9)) * 10) / 10 : 0,
    loadNs: Number(done?.load_duration) || 0,
    promptEvalNs: Number(done?.prompt_eval_duration) || 0,
    evalNs,
    totalDurationNs: Number(done?.total_duration) || 0,
    error: error || null,
    at: new Date().toISOString(),
  };
}
