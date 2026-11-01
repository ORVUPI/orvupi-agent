/** Caché en memoria del isolate y, si existe, Cache API. Nada más viejo de maxAgeSec se sirve. */

const memory = new Map();
const inflight = new Map();
const MAX_MEMORY = 400;

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
  const staleFor = Math.min(staleSec, maxAgeSec) * 1000;
  const mem = memory.get(key);
  if (mem && ageMs(mem) < freshFor) return { ...mem, stale: false };
  const cached = mem && ageMs(mem) < staleFor ? mem : await readCache(key);
  if (cached && ageMs(cached) < freshFor) {
    remember(key, cached);
    return { ...cached, stale: false };
  }
  if (cached && ageMs(cached) < staleFor) {
    const job = join().catch((error) => {
      console.error("sonar-refresh", key.slice(0, 80), error?.status || error?.code || "fail");
    });
    if (ctx?.waitUntil) ctx.waitUntil(job);
    return { ...cached, stale: true };
  }
  return join();

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
    if (ageMs(entry) > maxAgeSec * 1000) {
      const error = new Error("stale-source");
      error.code = "stale-source";
      throw error;
    }
    return putEntry(key, entry, ttlSec, ctx).then(() => ({ ...entry, stale: false }));
  }
}
