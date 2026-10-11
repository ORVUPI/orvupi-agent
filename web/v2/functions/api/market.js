/**
 * Cloudflare Pages Function. GET /api/market?mint=…
 * El navegador llama a este mismo sitio. Esta función consulta DEX Screener
 * y no reenvía cabeceras del visitante ni usa un secreto.
 */
import { MARKET_RATE_LIMIT, MARKET_RATE_WINDOW_MS, handleMarketGet } from "../../shared/market-proxy.js";

const hits = [];

function takeMarketSlot() {
  const now = Date.now();
  while (hits.length && hits[0] <= now - MARKET_RATE_WINDOW_MS) hits.shift();
  if (hits.length >= MARKET_RATE_LIMIT) return false;
  hits.push(now);
  return true;
}

function cacheRequest(mint) {
  return new Request(`https://stubxai.com/api/market?mint=${encodeURIComponent(mint)}`, { method: "GET" });
}

async function readMarketCache(mint) {
  const cache = globalThis.caches && caches.default;
  if (!cache || typeof cache.match !== "function") return null;
  const hit = await cache.match(cacheRequest(mint));
  if (!hit) return null;
  return hit.text();
}

async function writeMarketCache(mint, body) {
  const cache = globalThis.caches && caches.default;
  if (!cache || typeof cache.put !== "function") return;
  await cache.put(
    cacheRequest(mint),
    new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    }),
  );
}

export async function onRequest(context) {
  const request = context.request;
  const result = await handleMarketGet({
    method: request.method,
    requestUrl: request.url,
    now: () => new Date(),
    takeSlot: takeMarketSlot,
    readCache: readMarketCache,
    writeCache: writeMarketCache,
    fetchImpl: (url, init) => fetch(url, init),
  });
  return new Response(result.body, { status: result.status, headers: result.headers });
}
