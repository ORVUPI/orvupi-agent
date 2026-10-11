/**
 * GET /api/market. Solo lectura, sin secreto y sin reenviar cabeceras del visitante.
 * La URL de la fuente se arma con un mint ya validado.
 */
import {
  MARKET_HOST,
  MARKET_MAX_BODY,
  MARKET_PATH,
  isSolanaMint,
  marketFailure,
  normalizeUpstream,
} from "./market-read.js";

const CACHE_SECONDS = 60;

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

export function marketUpstreamUrl(mint) {
  if (!isSolanaMint(mint)) return "";
  return `https://${MARKET_HOST}${MARKET_PATH}${mint}`;
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
    if (typeof cached === "string" && cached.length > 0 && cached.length <= MARKET_MAX_BODY) {
      return {
        status: 200,
        headers: headersFor(CACHE_SECONDS),
        body: cached,
        cacheable: false,
      };
    }
  }
  if (typeof input.takeSlot === "function" && !input.takeSlot()) {
    return jsonResult(429, marketFailure(mint, queriedAt, "pausa-sitio"), 0);
  }
  const upstream = marketUpstreamUrl(mint);
  let response;
  try {
    response = await input.fetchImpl(upstream, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "application/json" },
    });
  } catch {
    return jsonResult(502, marketFailure(mint, queriedAt, "http"), 0);
  }
  const status = response && typeof response.status === "number" ? response.status : 0;
  if (status >= 300 && status < 400) {
    return jsonResult(502, marketFailure(mint, queriedAt, "http"), 0);
  }
  let text = "";
  try {
    text = response && typeof response.text === "function" ? await response.text() : "";
  } catch {
    return jsonResult(502, marketFailure(mint, queriedAt, "http"), 0);
  }
  const model = normalizeUpstream(status, text, { mint, queriedAt });
  const http = model.status === "limite" ? 429 : model.status === "fallo" || model.status === "incompleta" ? 502 : 200;
  const cacheSeconds = model.status === "ok" || model.status === "sin_pares" ? CACHE_SECONDS : 0;
  const result = jsonResult(http, model, cacheSeconds);
  if (result.cacheable && typeof input.writeCache === "function") {
    await input.writeCache(mint, result.body);
  }
  return result;
}
