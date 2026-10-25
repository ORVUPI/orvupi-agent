/** Bytes de imágenes subidas. El JSON del proyecto solo guarda el id. */

const DB = "orvupi-studio";
const STORE = "images";

function keyOf(projectId, layerId) {
  return `${projectId}/${layerId}`;
}

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => resolve(null);
  });
}

export function createImageStore() {
  const memory = new Map();
  return {
    async put(projectId, layerId, image) {
      const key = keyOf(projectId, layerId);
      memory.set(key, image);
      if (typeof indexedDB === "undefined") return true;
      const database = await openDb();
      if (!database) return false;
      return new Promise((resolve) => {
        try {
          const tx = database.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put({ width: image.width, height: image.height, rgba: image.rgba }, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    },
    async copyProject(fromId, toId, layerIds) {
      let ok = true;
      for (const layerId of layerIds) {
        const image = await this.get(fromId, layerId);
        if (!image) continue;
        const saved = await this.put(toId, layerId, image);
        if (!saved) ok = false;
      }
      return ok;
    },
    async get(projectId, layerId) {
      const key = keyOf(projectId, layerId);
      if (memory.has(key)) return memory.get(key);
      const database = await openDb();
      if (!database) return null;
      return new Promise((resolve) => {
        const tx = database.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).get(key);
        request.onsuccess = () => {
          const value = request.result;
          if (!value?.rgba) {
            resolve(null);
            return;
          }
          const image = { width: value.width, height: value.height, rgba: value.rgba };
          memory.set(key, image);
          resolve(image);
        };
        request.onerror = () => resolve(null);
      });
    },
  };
}
