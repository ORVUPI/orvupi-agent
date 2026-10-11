// @ts-nocheck
import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

function idb() {
  return globalThis.indexedDB;
}

function openRaw(name, version) {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? idb().open(name) : idb().open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("base local del cuaderno", () => {
  test("si otra pestaña bloquea la subida, se avisa y se puede seguir al cerrarla", async () => {
    const root = repoRoot();
    const mod = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-db.js")).href);
    const name = `stubx-cuaderno-${crypto.randomUUID()}`;
    const held = await openRaw(name, 1);
    let conflicts = 0;
    const opening = mod.openNotebookDb(name, {
      onConflict() {
        conflicts += 1;
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok(conflicts >= 1);
    held.close();
    const db = await opening;
    assert.equal(db.version, 2);
    db.close();
  });

  test("un cambio de versión cierra esta base y avisa para recargar", async () => {
    const root = repoRoot();
    const mod = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-db.js")).href);
    const name = `stubx-cuaderno-${crypto.randomUUID()}`;
    let conflicts = 0;
    const current = await mod.openNotebookDb(name, {
      onConflict() {
        conflicts += 1;
      },
    });
    assert.equal(current.version, 2);
    const newer = openRaw(name, 3);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok(conflicts >= 1);
    const upgraded = await newer;
    assert.equal(upgraded.version, 3);
    upgraded.close();
  });

  test("una versión mayor no rompe: se abre sin subirla", async () => {
    const root = repoRoot();
    const mod = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-db.js")).href);
    const name = `stubx-cuaderno-${crypto.randomUUID()}`;
    const created = await openRaw(name, 4);
    created.close();
    const opened = await mod.openNotebookDb(name);
    assert.equal(opened.version, 4);
    const tx = opened.transaction("records", "readwrite");
    tx.objectStore("records").put({ id: "1", note: "sigue", network: "solana", address: "abc" });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    opened.close();
  });
});
