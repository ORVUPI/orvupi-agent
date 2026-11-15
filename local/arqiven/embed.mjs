/** Embeddings locales. El modelo por defecto es de terceros y tiene licencia Apache 2.0.
 * qwen3-embedding:0.6b (Qwen3-Embedding-0.6B) cubre español y cabe junto a qwen3:8b.
 * nomic-embed-text también es Apache 2.0, pero está pensado sobre todo para inglés: no es el defecto.
 */

export const EMBED_MODEL = "qwen3-embedding:0.6b";
export const EMBED_LICENSE = "Apache-2.0";

export function cosine(left, right) {
  const size = Math.min(left?.length || 0, right?.length || 0);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < size; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function tokensOf(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2 && !/^(los|las|una|uno|del|con|por|para|que|como|esta|este|sobre)$/.test(token));
}

/** Vector disperso y determinista. Sirve para las pruebas; no sustituye al modelo de Ollama. */
export function hashEmbed(text, dims = 64) {
  const vector = new Array(dims).fill(0);
  for (const token of tokensOf(text)) {
    let hash = 2166136261;
    for (const char of token) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    vector[hash % dims] += 1;
  }
  return vector;
}

export async function ollamaEmbed({ base, model, text, timeoutMs = 30000 }) {
  const response = await fetch(new URL("/api/embed", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input: String(text || "") }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) {
    const error = new Error("embed-missing");
    error.code = "embed-missing";
    throw error;
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (/not found/i.test(detail)) {
      const error = new Error("embed-missing");
      error.code = "embed-missing";
      throw error;
    }
    const error = new Error("ollama-error");
    error.code = "ollama-error";
    error.detail = detail.slice(0, 160);
    throw error;
  }
  const body = await response.json();
  const vector = body.embeddings?.[0] || body.embedding;
  if (!Array.isArray(vector) || !vector.length) {
    const error = new Error("embed-missing");
    error.code = "embed-missing";
    throw error;
  }
  return vector;
}
