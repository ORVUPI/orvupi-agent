const KEY = "orvupi-sonar-v1";
const DB = "orvupi-sonar";

function empty() {
  return {
    savedAt: new Date().toISOString(),
    lists: [{ id: "main", name: "Principal", ids: [] }],
    activeList: "main",
    portfolios: [{ id: "main", name: "Principal" }],
    activePortfolio: "main",
    txs: [],
    alerts: [],
    recent: [],
    prefs: { vs: "usd", period: "24h", view: "list", top: 100, columns: { h1: true, d7: true, supply: true, spark: true } },
  };
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!parsed || !Array.isArray(parsed.lists)) return null;
    return { ...empty(), ...parsed };
  } catch {
    return null;
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* cuota llena o almacenamiento bloqueado: queda la copia en IndexedDB */
  }
}

// La base "orvupi-sonar" la comparten este almacén ("kv") y la caché de lecturas
// del verificador ("cache"). Si una de las dos partes la creó antes sin el almacén
// de la otra, se abre una versión nueva que añade los que falten.
const STORES = ["kv", "cache"];
let dbPromise = null;

function openDb(version) {
  return new Promise((resolve) => {
    let request;
    try {
      request = version ? indexedDB.open(DB, version) : indexedDB.open(DB);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function idb() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = withTimeout((async () => {
      const db = await openDb(0);
      if (!db) return null;
      if (STORES.every((name) => db.objectStoreNames.contains(name))) return db;
      const next = db.version + 1;
      db.close();
      return openDb(next);
    })(), 2500, null).then((db) => {
      if (!db) dbPromise = null;
      return db;
    });
  }
  return dbPromise;
}

async function readIdb() {
  const db = await idb();
  if (!db) return null;
  return withTimeout(new Promise((resolve) => {
    try {
      const tx = db.transaction("kv", "readonly");
      const request = tx.objectStore("kv").get(KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }), 2500, null);
}

async function writeIdb(data) {
  const db = await idb();
  if (!db) return;
  await withTimeout(new Promise((resolve) => {
    try {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  }), 2500, null);
}

let state = empty();
let ready = null;

export function loadStore() {
  if (!ready) {
    ready = (async () => {
      const local = readLocal();
      let remote = null;
      try {
        remote = await readIdb();
      } catch {
        remote = null;
      }
      const localAt = Date.parse(local?.savedAt || 0);
      const remoteAt = Date.parse(remote?.savedAt || 0);
      state = remoteAt > localAt ? { ...empty(), ...remote } : local || remote || empty();
      if (!state || typeof state !== "object") state = empty();
      if (!Array.isArray(state.lists) || !state.lists.length) state.lists = empty().lists;
      if (!Array.isArray(state.portfolios) || !state.portfolios.length) state.portfolios = empty().portfolios;
      writeLocal(state);
      return state;
    })();
  }
  return ready;
}

export function snapshot() {
  return state;
}

export async function update(mutator) {
  await loadStore();
  state = mutator({ ...state, lists: state.lists.map((row) => ({ ...row, ids: [...row.ids] })), txs: [...state.txs], alerts: [...state.alerts], recent: [...state.recent], prefs: { ...state.prefs } }) || state;
  state.savedAt = new Date().toISOString();
  writeLocal(state);
  await writeIdb(state);
  return state;
}

export function activeList() {
  return state.lists.find((row) => row.id === state.activeList) || state.lists[0];
}

export function hasCoin(id) {
  return Boolean(activeList()?.ids.includes(id));
}

export function remember(item) {
  return update((data) => {
    data.recent = [{ ...item, at: new Date().toISOString() }, ...data.recent.filter((row) => row.id !== item.id || row.kind !== item.kind)].slice(0, 12);
    return data;
  });
}

export function exportJson() {
  return JSON.stringify({ version: 1, ...state }, null, 2);
}

export async function importJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.lists) || !Array.isArray(parsed.txs)) throw new Error("invalid");
  return update((data) => {
    const lists = new Map(data.lists.map((row) => [row.id, row]));
    for (const row of parsed.lists) {
      if (!row?.id || !Array.isArray(row.ids)) continue;
      const prev = lists.get(row.id);
      lists.set(row.id, { id: String(row.id).slice(0, 40), name: String(row.name || row.id).slice(0, 60), ids: [...new Set([...(prev?.ids || []), ...row.ids.filter((id) => typeof id === "string")])] });
    }
    data.lists = [...lists.values()];
    const seen = new Set(data.txs.map((row) => row.id));
    for (const row of parsed.txs) {
      if (!row?.id || seen.has(row.id)) continue;
      data.txs.push(row);
    }
    if (Array.isArray(parsed.portfolios)) {
      const ports = new Map(data.portfolios.map((row) => [row.id, row]));
      for (const row of parsed.portfolios) if (row?.id) ports.set(row.id, { id: String(row.id).slice(0, 40), name: String(row.name || row.id).slice(0, 60) });
      data.portfolios = [...ports.values()];
    }
    return data;
  });
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
