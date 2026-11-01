/**
 * Lectura HTTP con reintentos, tiempo límite y la última respuesta real en caché.
 * No inventa cuerpos. Un fallo de red no se convierte en un objeto vacío con cifras.
 */

const memory = new Map();
const PREFIX = "orvupi.sonar.cache.v1:";
const CACHE_LIMIT = 80;
const CACHE_CHARS = 400_000;

function touch(key, entry) {
  if (memory.has(key)) memory.delete(key);
  memory.set(key, entry);
  while (memory.size > CACHE_LIMIT) memory.delete(memory.keys().next().value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let gate = Promise.resolve();
function waitTurn() {
  const run = gate.then(() => sleep(280));
  gate = run.then(() => {}, () => {});
  return run;
}

export function cacheGet(key) {
  if (memory.has(key)) {
    const hit = memory.get(key);
    touch(key, hit);
    return hit;
  }
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.value) return null;
    touch(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  const entry = { at: new Date().toISOString(), value };
  let raw = "";
  try {
    raw = JSON.stringify(entry);
  } catch {
    return entry;
  }
  if (raw.length > CACHE_CHARS) return entry;
  touch(key, entry);
  try {
    globalThis.localStorage?.setItem(PREFIX + key, raw);
  } catch {
    /* cuota del navegador */
  }
  void idbPut(key, entry);
  return entry;
}

let dbPromise;
function idb() {
  if (!globalThis.indexedDB) return null;
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open("orvupi-sonar", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("cache")) request.result.createObjectStore("cache");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function idbPut(key, entry) {
  try {
    const db = await idb();
    if (!db) return;
    const tx = db.transaction("cache", "readwrite");
    tx.objectStore("cache").put(entry, key);
  } catch {
    /* la memoria y localStorage siguen siendo la copia de trabajo */
  }
}

function retryDelay(index, last) {
  const seconds = Number(last?.retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(8000, Math.max(250, Math.round(seconds * 1000)));
  return Math.min(8000, 1000 * 2 ** (index - 1));
}

async function readWithRetry(url, options, asJson) {
  const attempts = options.attempts ?? 3;
  const method = String(options.method || "GET").toUpperCase();
  const key = method === "GET" ? `get:${url}` : null;
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    if (i) await sleep(retryDelay(i, last));
    last = await once(url, options, asJson);
    if (last.ok) {
      if (key) cacheSet(key, last);
      return last;
    }
    if (last.status && last.status < 500 && last.status !== 429 && last.status !== 408) break;
  }
  if (key) {
    const cached = cacheGet(key);
    if (cached?.value?.ok) return { ...cached.value, stale: true, fetchedAt: cached.at };
  }
  return last;
}

export function fetchText(url, options = {}) {
  return readWithRetry(url, options, false);
}

export function fetchJson(url, options = {}) {
  return readWithRetry(url, options, true);
}

async function once(url, options, asJson) {
  await waitTurn();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: options.signal ?? controller.signal,
    });
    const text = await response.text();
    let body = text;
    if (asJson) {
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
    }
    const retry = response.headers.get("retry-after");
    let retryAfter = null;
    if (retry) {
      const seconds = Number(retry);
      if (Number.isFinite(seconds)) retryAfter = seconds;
      else {
        const at = Date.parse(retry);
        if (Number.isFinite(at)) retryAfter = Math.max(0, (at - Date.now()) / 1000);
      }
    }
    return { ok: response.ok, status: response.status, body, fetchedAt: new Date().toISOString(), retryAfter };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      fetchedAt: new Date().toISOString(),
      error: error?.name === "AbortError" ? "timeout" : "red",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Devuelve la respuesta nueva si vale. Si no, la última real guardada, marcada como atrasada. */
export async function withCache(key, load) {
  const cached = cacheGet(key);
  try {
    const fresh = await load();
    if (fresh?.ok) {
      cacheSet(key, fresh);
      return { ...fresh, stale: false };
    }
    if (cached?.value?.ok) return { ...cached.value, stale: true, fetchedAt: cached.at };
    return fresh;
  } catch {
    if (cached?.value?.ok) return { ...cached.value, stale: true, fetchedAt: cached.at };
    return { ok: false, state: "requiere-atencion", fetchedAt: new Date().toISOString() };
  }
}
