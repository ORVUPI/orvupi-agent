/**
 * Cuaderno en este navegador. La versión 2 añade red y dirección en cada entrada
 * sin borrar las fichas que ya estaban.
 */
import { NOTEBOOK_DB_VERSION, migrateStoredRecord, validateAnyCard } from "./notebook-model.js";
import { isEnabledNetwork } from "./networks.js";
import { LEGACY_DB_NAME } from "./legacy-names.js";

export const NOTEBOOK_DB_NAME = "orvupi-cuaderno";
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

function openNotebookDbOnly(name = NOTEBOOK_DB_NAME, hooks = {}) {
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

/** Abre la base anterior solo si ya existe. No la crea. */
function openLegacyIfPresent() {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(LEGACY_DB_NAME);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0 && request.transaction) request.transaction.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      resolve(null);
    };
    request.onblocked = () => resolve(null);
  });
}

function readAll(db) {
  if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) return Promise.resolve([]);
  return notebookDbAll(db);
}

function getById(db, id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTEBOOK_STORE, "readonly").objectStore(NOTEBOOK_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Marca de que la copia ya se hizo en este navegador (la base anterior no se borra). */
export const NOTEBOOK_MIGRATION_MARK = "orvupi-migracion-cuaderno";

function readMark() {
  try {
    return globalThis.localStorage ? globalThis.localStorage.getItem(NOTEBOOK_MIGRATION_MARK) : "sin-almacenamiento";
  } catch {
    return "sin-almacenamiento";
  }
}

function writeMark() {
  try {
    globalThis.localStorage.setItem(NOTEBOOK_MIGRATION_MARK, "2026-10-16");
  } catch {
    /* sin localStorage: la copia se repite, pero nunca pisa una entrada que ya exista */
  }
}

function addressFitsNetwork(network, address) {
  if (typeof address !== "string" || !address) return false;
  if (network === "solana") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  return /^0x[0-9a-f]{40}$/.test(address);
}

/**
 * Una entrada del cuaderno anterior solo se copia si, ya con los nombres ORVUPI, la ficha es válida,
 * la red está habilitada y la dirección de la entrada es la de la ficha.
 */
export function legacyRecordForMigration(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  if (typeof record.id !== "string" || !record.id || record.id.length > 100) return null;
  const next = migrateStoredRecord(record).record;
  if (!next || !next.card || typeof next.card !== "object") return null;
  if (!validateAnyCard(next.card).ok) return null;
  if (typeof next.network !== "string" || !isEnabledNetwork(next.network)) return null;
  const fromCard = cardAddress(next.card).trim();
  const canonical = /^0x[0-9a-fA-F]{40}$/.test(fromCard) ? fromCard.toLowerCase() : fromCard;
  if (next.address !== canonical || !addressFitsNetwork(next.network, next.address)) return null;
  if (typeof next.card.network === "string" && next.card.network && next.card.network !== next.network) return null;
  return next;
}

/**
 * Copia el cuaderno guardado con el nombre anterior a la base ORVUPI, sin borrar la anterior:
 * así una vuelta atrás sigue viendo sus fichas (ver shared/ROLLBACK.md). Solo copia entradas válidas
 * (legacyRecordForMigration); si ya hay una entrada con el mismo id, manda la nueva.
 * Las que no se copian se quedan en la base anterior y se cuentan en skipped.
 */
export async function migrateLegacyNotebook(hooks = {}) {
  if (!("indexedDB" in globalThis)) return { migrated: 0, skipped: 0, kept: false };
  if (readMark() !== null) return { migrated: 0, skipped: 0, kept: true };
  const legacy = await openLegacyIfPresent();
  if (!legacy) return { migrated: 0, skipped: 0, kept: false };
  let records = [];
  try {
    records = await readAll(legacy);
  } catch {
    legacy.close();
    return { migrated: 0, skipped: 0, kept: true };
  }
  legacy.close();
  const db = await openNotebookDbOnly(NOTEBOOK_DB_NAME, hooks);
  let migrated = 0;
  let skipped = 0;
  try {
    for (const record of records) {
      const next = legacyRecordForMigration(record);
      if (!next) {
        skipped += 1;
        continue;
      }
      if (await getById(db, next.id)) {
        skipped += 1;
        continue;
      }
      await notebookDbPut(db, next);
      if (!(await getById(db, next.id))) throw new Error("migración incompleta");
      migrated += 1;
    }
  } catch {
    db.close();
    return { migrated, skipped, kept: true };
  }
  db.close();
  writeMark();
  if (skipped && hooks && typeof hooks.onLegacySkipped === "function") hooks.onLegacySkipped(skipped);
  return { migrated, skipped, kept: true };
}

let migration = null;

export function openNotebookDb(name = NOTEBOOK_DB_NAME, hooks = {}) {
  if (name !== NOTEBOOK_DB_NAME) return openNotebookDbOnly(name, hooks);
  if (!migration) migration = migrateLegacyNotebook(hooks).catch(() => ({ migrated: 0, kept: true }));
  return migration.then(() => openNotebookDbOnly(name, hooks));
}
