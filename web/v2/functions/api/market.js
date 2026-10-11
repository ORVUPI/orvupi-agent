/**
 * Cloudflare Pages Function. GET /api/market?mint=…
 * El navegador llama a este mismo sitio. Esta función consulta DEX Screener
 * y no reenvía cabeceras del visitante ni usa un secreto.
 */
import { handleMarketGet } from "../../shared/market-proxy.js";

const LIMIT = 40;
const WINDOW_MS = 60_000;
const hits = [];

function takeMarketSlot() {
  const now = Date.now();
  while (hits.length && hits[0] <= now - WINDOW_MS) hits.shift();
  if (hits.length >= LIMIT) return false;
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
    fetchImpl: async (url, init) => {
      const response = await fetch(url, init);
      return { status: response.status, text: () => response.text() };
    },
  });
  return new Response(result.body, { status: result.status, headers: result.headers });
}
