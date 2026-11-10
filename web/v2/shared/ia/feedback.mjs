/** Votos locales de ARQIVEN. No guardan el texto de la conversación ni lo envían. */

export const FEEDBACK_DB = "orvupi-arqiven-feedback";
export const FEEDBACK_STORE = "votes";

export function voteRecord(input = {}) {
  const vote = input.vote === "down" ? "down" : input.vote === "up" ? "up" : "";
  if (!vote) throw new Error("vote");
  const id = typeof input.id === "string" && input.id ? input.id.slice(0, 80) : newId();
  return {
    id,
    at: typeof input.at === "string" && input.at ? input.at.slice(0, 40) : new Date().toISOString(),
    vote,
    lang: String(input.lang || "es").slice(0, 16),
    modelId: String(input.modelId || "none").slice(0, 80),
    modelVersion: String(input.modelVersion || "").slice(0, 80),
    task: String(input.task || "chat").slice(0, 32),
    sourceCount: Math.max(0, Math.min(20, Number(input.sourceCount) || 0)),
  };
}

export function exportPayload(votes) {
  const list = (Array.isArray(votes) ? votes : []).map((item) => voteRecord(item));
  return JSON.stringify({ format: "orvupi-arqiven-feedback", version: 1, note: "Sin texto de la conversación. Solo este dispositivo.", votes: list }, null, 2);
}

export function openFeedbackDb(name = FEEDBACK_DB) {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FEEDBACK_STORE)) db.createObjectStore(FEEDBACK_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveVote(db, record) {
  const clean = voteRecord(record);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, "readwrite");
    tx.objectStore(FEEDBACK_STORE).put(clean);
    tx.oncomplete = () => resolve(clean);
    tx.onerror = () => reject(tx.error);
  });
}

export function listVotes(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, "readonly");
    const request = tx.objectStore(FEEDBACK_STORE).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
  });
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `vote-${Date.now()}`;
}
