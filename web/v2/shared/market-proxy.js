/**
 * GET /api/market. Solo lectura, sin secreto y sin reenviar cabeceras del visitante.
 * La URL de la fuente se arma con un mint ya validado. La respuesta es el modelo
 * procesado: nunca el cuerpo crudo de la fuente.
 */
import {
  MARKET_HOST,
  MARKET_MAX_BODY,
  MARKET_PATH,
  MARKET_SCHEMA,
  MARKET_TIMEOUT_MS,
  acceptClientPayload,
  isSolanaMint,
  marketFailure,
  normalizeUpstream,
} from "./market-read.js";

export const MARKET_CACHE_SECONDS = 60;
export const MARKET_RATE_LIMIT = 40;
export const MARKET_RATE_WINDOW_MS = 60_000;

const KNOWN_STATUS = new Set(["ok", "sin_pares", "fallo", "limite", "incompleta", "consulta"]);

function headersFor(cacheSeconds) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

function jsonResult(status, model, cacheSeconds) {
  return {
    status,
    headers: headersFor(cacheSeconds),
    body: JSON.stringify(model),
    cacheable: cacheSeconds > 0,
  };
}

function statusFor(model) {
  if (model.reason === "tiempo") return 504;
  if (model.status === "limite") return 429;
  if (model.status === "fallo" || model.status === "incompleta") return 502;
  return 200;
}

export function marketUpstreamUrl(mint) {
  if (!isSolanaMint(mint)) return "";
  return `https://${MARKET_HOST}${MARKET_PATH}${mint}`;
}

function processedPayload(text, mint) {
  if (typeof text !== "string" || text.length === 0 || text.length > MARKET_MAX_BODY) return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.schema !== MARKET_SCHEMA || !KNOWN_STATUS.has(parsed.status)) return null;
  return acceptClientPayload(parsed, mint);
}

async function readCappedText(response, max) {
  const body = response && response.body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const step = await reader.read();
        if (step.done) break;
        const raw = step.value;
        const value = raw instanceof Uint8Array ? raw : raw ? new Uint8Array(raw) : new Uint8Array();
        total += value.byteLength;
        if (total > max) {
          if (typeof reader.cancel === "function") await reader.cancel();
          return { overflow: true, text: "" };
        }
        chunks.push(value);
      }
    } catch {
      if (typeof reader.cancel === "function") {
        try {
          await reader.cancel();
        } catch {
          /* el cuerpo ya estaba cerrado */
        }
      }
      return { failed: true, text: "" };
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(out);
    if (text.length > max) return { overflow: true, text: "" };
    return { text };
  }
  let text = "";
  try {
    text = response && typeof response.text === "function" ? await response.text() : "";
  } catch {
    return { failed: true, text: "" };
  }
  if (typeof text !== "string") return { failed: true, text: "" };
  if (text.length > max) return { overflow: true, text: "" };
  return { text };
}

export async function handleMarketGet(input) {
  const now = typeof input.now === "function" ? input.now() : new Date();
  const queriedAt = now.toISOString();
  if (input.method !== "GET") {
    return {
      status: 405,
      headers: { ...headersFor(0), allow: "GET" },
      body: JSON.stringify(marketFailure("", queriedAt, "http")),
      cacheable: false,
    };
  }
  let url;
  try {
    url = new URL(input.requestUrl);
  } catch {
    return jsonResult(400, marketFailure("", queriedAt, "mint"), 0);
  }
  const mint = (url.searchParams.get("mint") || "").trim();
  if (!isSolanaMint(mint)) {
    return jsonResult(400, marketFailure(mint, queriedAt, "mint"), 0);
  }
  if (typeof input.readCache === "function") {
    const cached = await input.readCache(mint);
    const model = processedPayload(cached, mint);
    if (model) return jsonResult(statusFor(model), model, MARKET_CACHE_SECONDS);
  }
  if (typeof input.takeSlot === "function" && !input.takeSlot()) {
    return jsonResult(429, marketFailure(mint, queriedAt, "pausa-sitio"), 0);
  }
  const upstream = marketUpstreamUrl(mint);
  const timeoutMs = Number.isFinite(input.timeoutMs) && input.timeoutMs > 0 ? input.timeoutMs : MARKET_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await input.fetchImpl(upstream, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = controller.signal.aborted || (error && error.name === "AbortError");
    return jsonResult(aborted ? 504 : 502, marketFailure(mint, queriedAt, aborted ? "tiempo" : "http"), 0);
  } finally {
    clearTimeout(timer);
  }
  const status = response && typeof response.status === "number" ? response.status : 0;
  if (status >= 300 && status < 400) {
    return jsonResult(502, marketFailure(mint, queriedAt, "http"), 0);
  }
  const capped = await readCappedText(response, MARKET_MAX_BODY);
  if (capped.failed) return jsonResult(502, marketFailure(mint, queriedAt, "http"), 0);
  if (capped.overflow) return jsonResult(502, marketFailure(mint, queriedAt, "grande"), 0);
  const model = normalizeUpstream(status, capped.text, { mint, queriedAt });
  const http = statusFor(model);
  const cacheSeconds = model.status === "ok" || model.status === "sin_pares" ? MARKET_CACHE_SECONDS : 0;
  const result = jsonResult(http, model, cacheSeconds);
  if (result.cacheable && typeof input.writeCache === "function") {
    await input.writeCache(mint, result.body);
  }
  return result;
}
