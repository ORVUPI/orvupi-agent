/**
 * Lectura HTTP con reintentos, tiempo límite y la última respuesta real en caché.
 * No inventa cuerpos. Un fallo de red no se convierte en un objeto vacío con cifras.
 */

const memory = new Map();
const PREFIX = "orvupi.sonar.cache.v1:";

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
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.value) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  const entry = { at: new Date().toISOString(), value };
  memory.set(key, entry);
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(entry));
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

export async function fetchText(url, options = {}) {
  const attempts = options.attempts ?? 2;
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    if (i) await sleep(400 * 2 ** (i - 1));
    last = await once(url, options, false);
    if (last.ok) return last;
    if (last.status && last.status < 500 && last.status !== 429 && last.status !== 408) break;
  }
  return last;
}

export async function fetchJson(url, options = {}) {
  const attempts = options.attempts ?? 2;
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    if (i) await sleep(400 * 2 ** (i - 1));
    last = await once(url, options, true);
    if (last.ok) return last;
    if (last.status && last.status < 500 && last.status !== 429 && last.status !== 408) break;
  }
  return last;
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
    return { ok: response.ok, status: response.status, body, fetchedAt: new Date().toISOString() };
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
