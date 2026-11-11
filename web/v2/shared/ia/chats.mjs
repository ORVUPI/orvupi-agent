/** Chats, proyectos e imágenes de ARQIVEN en este navegador.
 * La versión 2 añade almacenes. No borra los chats de la versión 1.
 */

export const CHAT_DB = "orvupi-arqiven-chats";
export const CHAT_DB_VERSION = 2;
export const CHAT_STORE = "conversations";
export const PROJECT_STORE = "projects";
export const IMAGE_STORE = "images";

function cleanMessage(item) {
  if (!item || (item.role !== "user" && item.role !== "assistant")) return null;
  const content = String(item.content || "").slice(0, 8000);
  if (!content) return null;
  const sources = Array.isArray(item.sources) ? item.sources.slice(0, 8).map((source) => ({
    url: String(source?.url || "").slice(0, 400),
    title: String(source?.title || "").slice(0, 200),
    license: String(source?.license || "").slice(0, 40),
    origin: String(source?.origin || "").slice(0, 40),
  })).filter((source) => source.url) : [];
  return {
    id: String(item.id || "").slice(0, 80),
    role: item.role,
    content,
    mode: String(item.mode || "rules").slice(0, 32),
    provider: String(item.provider || "none").slice(0, 32),
    modelId: String(item.modelId || "none").slice(0, 80),
    modelVersion: String(item.modelVersion || "").slice(0, 80),
    sources,
  };
}

function optionalId(value) {
  return typeof value === "string" && value ? value.slice(0, 80) : "";
}

export function conversationRecord(input = {}) {
  const id = String(input.id || "").slice(0, 80);
  if (!id) throw new Error("conversation");
  const messages = (Array.isArray(input.messages) ? input.messages : []).map(cleanMessage).filter(Boolean).slice(-80);
  const renamed = input.renamed === true;
  const title = String((renamed ? input.title : "") || input.title || messages.find((item) => item.role === "user")?.content || "").replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    id,
    title,
    renamed,
    projectId: optionalId(input.projectId),
    updated: typeof input.updated === "string" && input.updated ? input.updated.slice(0, 40) : new Date().toISOString(),
    messages,
  };
}

export function projectRecord(input = {}) {
  const id = String(input.id || "").slice(0, 80);
  if (!id) throw new Error("project");
  const name = String(input.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!name) throw new Error("project");
  return {
    id,
    name,
    updated: typeof input.updated === "string" && input.updated ? input.updated.slice(0, 40) : new Date().toISOString(),
  };
}

export function openChatDb(name = CHAT_DB) {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(name, CHAT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE)) db.createObjectStore(CHAT_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finish(tx, value) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export function saveConversation(db, input) {
  const clean = conversationRecord(input);
  const tx = db.transaction(CHAT_STORE, "readwrite");
  tx.objectStore(CHAT_STORE).put(clean);
  return finish(tx, clean);
}

export function listConversations(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE, "readonly");
    const request = tx.objectStore(CHAT_STORE).getAll();
    request.onsuccess = () => {
      const rows = Array.isArray(request.result) ? request.result.map((item) => conversationRecord(item)) : [];
      rows.sort((a, b) => (a.updated < b.updated ? 1 : -1));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export function readConversation(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE, "readonly");
    const request = tx.objectStore(CHAT_STORE).get(String(id || ""));
    request.onsuccess = () => resolve(request.result ? conversationRecord(request.result) : null);
    request.onerror = () => reject(request.error);
  });
}

export function deleteConversation(db, id) {
  const tx = db.transaction(CHAT_STORE, "readwrite");
  tx.objectStore(CHAT_STORE).delete(String(id || ""));
  return finish(tx, true);
}

export function saveProject(db, input) {
  const clean = projectRecord(input);
  const tx = db.transaction(PROJECT_STORE, "readwrite");
  tx.objectStore(PROJECT_STORE).put(clean);
  return finish(tx, clean);
}

export function listProjects(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const request = tx.objectStore(PROJECT_STORE).getAll();
    request.onsuccess = () => {
      const rows = Array.isArray(request.result) ? request.result.map((item) => projectRecord(item)) : [];
      rows.sort((a, b) => a.name.localeCompare(b.name));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Al borrar un proyecto, sus chats vuelven al historial general. */
export function deleteProject(db, id) {
  const projectId = String(id || "");
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PROJECT_STORE, CHAT_STORE], "readwrite");
    tx.objectStore(PROJECT_STORE).delete(projectId);
    const request = tx.objectStore(CHAT_STORE).getAll();
    let count = 0;
    request.onsuccess = () => {
      for (const chat of request.result ?? []) {
        if (chat?.projectId !== projectId) continue;
        tx.objectStore(CHAT_STORE).put(conversationRecord({ ...chat, projectId: "" }));
        count += 1;
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

export function saveImage(db, input) {
  const id = String(input.id || "").slice(0, 80);
  if (!id || !input.bytes) throw new Error("image");
  const clean = {
    id,
    name: String(input.name || "imagen").slice(0, 120),
    mime: String(input.mime || "image/png").slice(0, 40),
    chatId: optionalId(input.chatId),
    projectId: optionalId(input.projectId),
    favorite: input.favorite === true,
    created: typeof input.created === "string" && input.created ? input.created.slice(0, 40) : new Date().toISOString(),
    bytes: input.bytes,
  };
  const tx = db.transaction(IMAGE_STORE, "readwrite");
  tx.objectStore(IMAGE_STORE).put(clean);
  return finish(tx, { ...clean, bytes: undefined });
}

export function listImages(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    const request = tx.objectStore(IMAGE_STORE).getAll();
    request.onsuccess = () => {
      const rows = Array.isArray(request.result) ? request.result.slice() : [];
      rows.sort((a, b) => (a.created < b.created ? 1 : -1));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export function deleteImage(db, id) {
  const tx = db.transaction(IMAGE_STORE, "readwrite");
  tx.objectStore(IMAGE_STORE).delete(String(id || ""));
  return finish(tx, true);
}

export function matchesQuery(row, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  if (String(row.title || "").toLowerCase().includes(needle)) return true;
  return (row.messages || []).some((item) => String(item.content || "").toLowerCase().includes(needle));
}

export function dateGroup(iso, now = new Date()) {
  const date = new Date(iso || 0);
  if (Number.isNaN(date.getTime())) return "older";
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (start.getTime() - day.getTime()) / 86400000;
  if (diff < 1) return "today";
  if (diff < 2) return "yesterday";
  if (diff < 7) return "week";
  return "older";
}
