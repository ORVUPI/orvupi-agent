/** Conversaciones de ARQIVEN en este navegador. No toca los votos ni las notas de Work. */

export const CHAT_DB = "orvupi-arqiven-chats";
export const CHAT_STORE = "conversations";

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

export function conversationRecord(input = {}) {
  const id = String(input.id || "").slice(0, 80);
  if (!id) throw new Error("conversation");
  const messages = (Array.isArray(input.messages) ? input.messages : []).map(cleanMessage).filter(Boolean).slice(-80);
  const title = String(input.title || messages.find((item) => item.role === "user")?.content || "").replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    id,
    title,
    updated: typeof input.updated === "string" && input.updated ? input.updated.slice(0, 40) : new Date().toISOString(),
    messages,
  };
}

export function openChatDb(name = CHAT_DB) {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE)) db.createObjectStore(CHAT_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveConversation(db, input) {
  const clean = conversationRecord(input);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE, "readwrite");
    tx.objectStore(CHAT_STORE).put(clean);
    tx.oncomplete = () => resolve(clean);
    tx.onerror = () => reject(tx.error);
  });
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
