import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

function studio(rel: string): string {
  return pathToFileURL(path.join(repoRoot(), "web/v2/studio", rel)).href;
}

async function load<T>(rel: string): Promise<T> {
  return (await import(studio(rel))) as T;
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("studio mis diseños", () => {
  test("la biblioteca vive en la lista de proyectos y sobrevive a un guardado", async () => {
    const { blankDocument } = await load<{
      blankDocument: (id: string) => { id: string; name: string; meta: { revision: number }; library?: { favorite?: boolean; kind?: string } };
    }>("lib/document.mjs");
    const projects = await load<{
      saveProject: (storage: ReturnType<typeof memoryStorage>, doc: { id: string; name: string; meta: { revision: number }; library?: { favorite?: boolean } }) => { ok: boolean; revision?: number; reason?: string };
      listProjects: (storage: ReturnType<typeof memoryStorage>) => { id: string; library?: { favorite?: boolean; kind?: string; deletedAt?: string | null } }[];
      listDesigns: (storage: ReturnType<typeof memoryStorage>) => { id: string }[];
      patchItem: (storage: ReturnType<typeof memoryStorage>, id: string, patch: { library?: { favorite?: boolean; deletedAt?: string | null; folderId?: string | null }; name?: string }) => { name?: string; library?: { favorite?: boolean; deletedAt?: string | null } } | null;
      createContainer: (storage: ReturnType<typeof memoryStorage>, spec: { kind?: string; name?: string }) => { id: string; library?: { kind?: string } } | null;
      duplicateProject: (storage: ReturnType<typeof memoryStorage>, id: string) => { id: string; library?: { favorite?: boolean; template?: boolean } } | null;
      PROJECT_CAP: number;
    }>("lib/projects.mjs");
    const storage = memoryStorage();
    const doc = blankDocument("doc");
    doc.name = "Notas";
    const saved = projects.saveProject(storage, doc);
    assert.equal(saved.ok, true);
    doc.meta.revision = saved.revision || 0;
    assert.equal(projects.patchItem(storage, doc.id, { library: { favorite: true } })?.library?.favorite, true);
    doc.library = { favorite: false, kind: "design" };
    const again = projects.saveProject(storage, doc);
    assert.equal(again.ok, true);
    doc.meta.revision = again.revision || doc.meta.revision;
    const kept = projects.listProjects(storage).find((item) => item.id === doc.id);
    assert.equal(kept?.library?.favorite, true);

    const folder = projects.createContainer(storage, { kind: "folder", name: "Cliente" });
    assert.equal(folder?.library?.kind, "folder");
    assert.equal(projects.listDesigns(storage).some((item) => item.id === folder?.id), false);
    assert.equal(projects.patchItem(storage, doc.id, { library: { deletedAt: new Date().toISOString() } })?.library?.deletedAt != null, true);
    assert.equal(projects.listDesigns(storage).some((item) => item.id === doc.id), false);
    assert.equal(projects.patchItem(storage, doc.id, { library: { deletedAt: null } })?.library?.deletedAt, null);
    assert.equal(projects.listDesigns(storage).some((item) => item.id === doc.id), true);

    const copy = projects.duplicateProject(storage, doc.id);
    assert.ok(copy);
    assert.equal(copy?.library?.favorite, false);
    assert.equal(copy?.library?.template, false);

    const full = memoryStorage();
    for (let index = 0; index < projects.PROJECT_CAP; index += 1) {
      const piece = blankDocument("square");
      piece.name = `pieza ${index}`;
      assert.equal(projects.saveProject(full, piece).ok, true);
    }
    assert.ok(projects.createContainer(full, { kind: "folder", name: "Extra" }));
    const blocked = projects.saveProject(full, blankDocument("square"));
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, "cap");
  });
});
