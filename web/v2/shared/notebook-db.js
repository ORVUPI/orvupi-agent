/**
 * Cuaderno en este navegador. La versión 2 añade red y dirección en cada entrada
 * sin borrar las fichas que ya estaban.
 */
import { NOTEBOOK_DB_VERSION, migrateStoredRecord } from "./notebook-model.js";

export const NOTEBOOK_DB_NAME = "stubx-cuaderno";
export const NOTEBOOK_STORE = "records";

export function openNotebookDb(name = NOTEBOOK_DB_NAME) {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("indexedDB"));
      return;
    }
    const request = indexedDB.open(name, NOTEBOOK_DB_VERSION);
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexedDB"));
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
