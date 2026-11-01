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
  localStorage.setItem(KEY, JSON.stringify(data));
}

function idb() {
  return new Promise((resolve) => {
    if (!globalThis.indexedDB) return resolve(null);
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readIdb() {
  const db = await idb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction("kv", "readonly");
    const request = tx.objectStore("kv").get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function writeIdb(data) {
  const db = await idb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

let state = empty();
let ready = null;

export function loadStore() {
  if (!ready) {
    ready = (async () => {
      const local = readLocal();
      const remote = await readIdb();
      const localAt = Date.parse(local?.savedAt || 0);
      const remoteAt = Date.parse(remote?.savedAt || 0);
      state = remoteAt > localAt ? { ...empty(), ...remote } : local || remote || empty();
      if (!state.lists.length) state.lists = empty().lists;
      if (!state.portfolios.length) state.portfolios = empty().portfolios;
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
