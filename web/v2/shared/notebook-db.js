/**
 * Cuaderno en este navegador. La versión 2 añade red y dirección en cada entrada
 * sin borrar las fichas que ya estaban.
 */
import { NOTEBOOK_DB_VERSION, migrateStoredRecord } from "./notebook-model.js";

export const NOTEBOOK_DB_NAME = "stubx-cuaderno";
export const NOTEBOOK_STORE = "records";

/** Dirección de la ficha: la de Base (address) o el mint de Solana. */
export function cardAddress(card) {
  if (!card || typeof card !== "object") return "";
  if (typeof card.address === "string" && card.address) return card.address;
  if (typeof card.mint === "string") return card.mint;
  return "";
}

function attachDb(db, hooks) {
  db.onversionchange = () => {
    db.close();
    if (hooks && typeof hooks.onConflict === "function") hooks.onConflict();
  };
}

function openCurrent(name, hooks, fallback) {
  const again = indexedDB.open(name);
  again.onblocked = () => {
    if (hooks && typeof hooks.onConflict === "function") hooks.onConflict();
  };
  again.onsuccess = () => {
    const db = again.result;
    attachDb(db, hooks);
    fallback(db);
  };
  again.onerror = (event) => {
    if (event && event.preventDefault) event.preventDefault();
    fallback(null, again.error);
  };
}

export function openNotebookDb(name = NOTEBOOK_DB_NAME, hooks = {}) {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("indexedDB"));
      return;
    }
    const request = indexedDB.open(name, NOTEBOOK_DB_VERSION);
    request.onblocked = () => {
      if (hooks && typeof hooks.onConflict === "function") hooks.onConflict();
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) db.createObjectStore(NOTEBOOK_STORE, { keyPath: "id" });
      const tx = request.transaction;
      if (!tx) return;
      let store;
      try {
        store = tx.objectStore(NOTEBOOK_STORE);
      } catch {
        return;
      }
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        try {
          const next = migrateStoredRecord(cursor.value);
          if (next && next.changed && next.record && next.record.id) cursor.update(next.record);
        } catch {
          /* La entrada anterior se queda como estaba. */
        }
        cursor.continue();
      };
    };
    request.onsuccess = () => {
      const db = request.result;
      attachDb(db, hooks);
      resolve(db);
    };
    request.onerror = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      const error = request.error;
      if (error && error.name === "VersionError") {
        openCurrent(name, hooks, (db, nextError) => {
          if (db) resolve(db);
          else reject(nextError || error);
        });
        return;
      }
      reject(error || new Error("indexedDB"));
    };
  });
}

export function notebookDbAll(db) {
  return new Promise((resolve, reject) => {
    const items = [];
    const request = db.transaction(NOTEBOOK_STORE, "readonly").objectStore(NOTEBOOK_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(items);
        return;
      }
      items.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export function notebookDbPut(db, record) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTEBOOK_STORE, "readwrite").objectStore(NOTEBOOK_STORE).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function notebookDbClear(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTEBOOK_STORE, "readwrite").objectStore(NOTEBOOK_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
