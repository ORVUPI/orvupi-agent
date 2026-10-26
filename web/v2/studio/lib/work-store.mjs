/** Escritura en la biblioteca local de ORVUPI Work (IndexedDB orvupi-work y OPFS si existe). */

export const DESIGN_MIME = "application/vnd.orvupi.design+json";
export const DOC_MIME = "application/vnd.orvupi.doc+json";
export const SLIDE_MIME = "application/vnd.orvupi.slides+json";
export const WORK_DB = "orvupi-work";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isWorkId(value) {
  return typeof value === "string" && UUID.test(value);
}

export function workIdFromHash(hash) {
  const clean = String(hash || "").replace(/^#\/?/, "").split(/[?&]/, 1)[0];
  const match = /^work\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(clean);
  return match ? match[1] : "";
}

export function createWorkId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sanitizeWorkName(name) {
  const cleaned = String(name || "").replace(/[\u0000-\u001f]/g, "").replace(/[\\/]/g, "-").trim().slice(0, 180);
  return cleaned || "Diseno";
}

export async function sha256Hex(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function workRecord({ id, name, kind, mime, size, contentHash, now, createdAt }) {
  return {
    id,
    name: sanitizeWorkName(name),
    kind,
    mime,
    tags: [],
    favorite: false,
    folderId: null,
    color: null,
    deletedAt: null,
    createdAt: createdAt || now,
    updatedAt: now,
    size,
    blobKey: `files/${id}`,
    contentHash,
  };
}

export function packageRevision(bytes) {
  try {
    const text = new TextDecoder().decode(bytes);
    const data = JSON.parse(text);
    const revision = Number(data?.document?.meta?.revision);
    return Number.isFinite(revision) ? revision : null;
  } catch {
    return null;
  }
}

function openWorkDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const open = indexedDB.open(WORK_DB, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("files")) {
        const files = db.createObjectStore("files", { keyPath: "id" });
        files.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => resolve(null);
  });
}

async function opfsRoot() {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const probe = await root.getFileHandle(".orvupi-probe", { create: true });
    const writable = await probe.createWritable();
    await writable.write(new Uint8Array([1]));
    await writable.close();
    await root.removeEntry(".orvupi-probe");
    return root;
  } catch {
    return null;
  }
}

async function opfsFile(root, key, create) {
  const parts = key.split("/").filter(Boolean);
  const filename = parts.pop();
  if (!filename) return null;
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
  return directory.getFileHandle(filename, { create });
}

async function writeOpfs(root, key, bytes) {
  const handle = await opfsFile(root, key, true);
  if (!handle) return false;
  const writable = await handle.createWritable();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await writable.write(copy);
  await writable.close();
  return true;
}

async function readOpfs(root, key) {
  try {
    const handle = await opfsFile(root, key, false);
    if (!handle) return null;
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db, store, value, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const request = key === undefined ? tx.objectStore(store).put(value) : tx.objectStore(store).put(value, key);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function notifyWork() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("orvupi-work");
  channel.postMessage({ type: "files-changed" });
  channel.close();
}

async function readBlob(db, root, key) {
  if (root) {
    const bytes = await readOpfs(root, key);
    if (bytes) return bytes;
  }
  const stored = await idbGet(db, "blobs", key);
  return stored ? new Uint8Array(stored) : null;
}

async function writeBlob(db, root, key, bytes) {
  if (root) return writeOpfs(root, key, bytes);
  await idbPut(db, "blobs", bytes, key);
  return true;
}

export async function saveWorkBytes(input) {
  const db = await openWorkDb();
  if (!db) return { ok: false, reason: "store" };
  const root = await opfsRoot();
  const bytes = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);
  if (!bytes.byteLength) return { ok: false, reason: "empty" };
  let id = isWorkId(input.id) ? input.id : createWorkId();
  let copied = false;
  const existing = isWorkId(input.id) ? await idbGet(db, "files", input.id) : null;
  if (existing && input.mime === DESIGN_MIME) {
    const stored = await readBlob(db, root, existing.blobKey || `files/${existing.id}`);
    const storedRev = stored ? packageRevision(stored) : null;
    const incoming = Number(input.revision);
    if (storedRev != null && Number.isFinite(incoming) && storedRev > incoming) {
      id = createWorkId();
      copied = true;
    }
  }
  const now = new Date().toISOString();
  const contentHash = await sha256Hex(bytes);
  const blobKey = `files/${id}`;
  const wrote = await writeBlob(db, root, blobKey, bytes);
  if (!wrote) return { ok: false, reason: "blob" };
  const previous = !copied && existing && existing.id === id ? existing : null;
  const record = {
    ...workRecord({
      id,
      name: input.name,
      kind: input.kind,
      mime: input.mime,
      size: bytes.byteLength,
      contentHash,
      now,
      createdAt: previous?.createdAt,
    }),
    tags: Array.isArray(previous?.tags) ? previous.tags : [],
    favorite: previous?.favorite === true,
    folderId: typeof previous?.folderId === "string" ? previous.folderId : null,
    color: typeof previous?.color === "string" ? previous.color : null,
  };
  if (input.snippet) record.snippet = String(input.snippet).replace(/\s+/g, " ").trim().slice(0, 4000);
  await idbPut(db, "files", record);
  notifyWork();
  return { ok: true, id, copied, record };
}

export async function loadWorkBytes(id) {
  if (!isWorkId(id)) return null;
  const db = await openWorkDb();
  if (!db) return null;
  const record = await idbGet(db, "files", id);
  if (!record) return null;
  const root = await opfsRoot();
  const bytes = await readBlob(db, root, record.blobKey || `files/${id}`);
  if (!bytes) return null;
  return { record, bytes };
}
