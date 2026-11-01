/** Caché en memoria del isolate y, si existe, Cache API. Lo fresco se sirve al momento; lo viejo, hasta 24 h, con sello. */

import { asOfLabel } from "./asof.js";

const memory = new Map();
const inflight = new Map();
const MAX_MEMORY = 400;
const DAY_MS = 86400 * 1000;

function remember(key, entry) {
  if (memory.has(key)) memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MAX_MEMORY) memory.delete(memory.keys().next().value);
}

function ageMs(entry) {
  const stamp = Date.parse(entry?.fetchedAt || "");
  if (!Number.isFinite(stamp)) return Infinity;
  return Date.now() - stamp;
}

function present(entry, stale) {
  const next = { ...entry };
  if (!stale) {
    delete next.asOf;
    return { ...next, stale: false };
  }
  const asOf = asOfLabel(entry?.fetchedAt);
  return { ...next, stale: true, ...(asOf ? { asOf } : {}) };
}

async function readCache(key) {
  const cache = globalThis.caches?.default;
  if (!cache) return null;
  try {
    const hit = await cache.match(new Request(`https://sonar.internal/${encodeURIComponent(key)}`));
    if (!hit) return null;
    return await hit.json();
  } catch {
    return null;
  }
}

async function writeCache(key, entry, ttlSec) {
  const cache = globalThis.caches?.default;
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify(entry), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttlSec}` },
    });
    await cache.put(new Request(`https://sonar.internal/${encodeURIComponent(key)}`), response);
  } catch {
    /* la memoria del isolate sigue valiendo en este proceso */
  }
}

export function clearCache() {
  memory.clear();
  inflight.clear();
}

export async function peek(key) {
  if (memory.has(key)) return memory.get(key);
  return readCache(key);
}

export async function putEntry(key, entry, ttlSec, ctx) {
  remember(key, entry);
  const job = writeCache(key, entry, ttlSec);
  if (ctx?.waitUntil) ctx.waitUntil(job);
  else await job;
  return entry;
}

export async function getOrRefresh({ key, ttlSec, staleSec, maxAgeSec = 86400, loader, ctx }) {
  const freshFor = ttlSec * 1000;
  const serveFor = Math.max(staleSec, 86400, maxAgeSec) * 1000;
  const stored = await readStored(key, serveFor);
  if (stored && ageMs(stored) < freshFor) return present(stored, false);
  if (stored && ageMs(stored) < serveFor) {
    refreshLater();
    return present(stored, true);
  }
  try {
    return await join();
  } catch (error) {
    const again = await readStored(key, serveFor);
    if (again && ageMs(again) < serveFor) return present(again, true);
    throw error;
  }

  function refreshLater() {
    const job = join().catch((error) => {
      console.error("sonar-refresh", key.slice(0, 80), error?.status || error?.code || "fail");
    });
    if (ctx?.waitUntil) ctx.waitUntil(job);
  }

  function join() {
    const pending = inflight.get(key);
    if (pending) return pending;
    const job = refresh().finally(() => {
      if (inflight.get(key) === job) inflight.delete(key);
    });
    inflight.set(key, job);
    return job;
  }

  async function refresh() {
    const loaded = await loader();
    const entry = { ...loaded, fetchedAt: loaded.fetchedAt || new Date().toISOString() };
    if (ageMs(entry) > Math.max(serveFor, DAY_MS)) {
      const error = new Error("stale-source");
      error.code = "stale-source";
      throw error;
    }
    const keepStale = Boolean(loaded.stale) && ageMs(entry) >= freshFor;
    await putEntry(key, entry, Math.ceil(serveFor / 1000), ctx);
    return present(entry, keepStale);
  }

  async function readStored(cacheKey, maxMs) {
    const mem = memory.get(cacheKey);
    if (mem && ageMs(mem) < maxMs) return mem;
    const cached = await readCache(cacheKey);
    if (cached && ageMs(cached) < maxMs) {
      remember(cacheKey, cached);
      return cached;
    }
    return null;
  }
}
