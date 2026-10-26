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
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

describe("studio más", () => {
  test("el hash de Más conserva el tramo y la subpantalla", async () => {
    const route = await load<{
      routeFromHash: (hash: string) => string;
      pathFromHash: (hash: string) => string[];
    }>("lib/route.mjs");
    assert.equal(route.routeFromHash("#/mas"), "mas");
    assert.equal(route.routeFromHash("#/mas/marca"), "mas");
    assert.deepEqual(route.pathFromHash("#/mas/marca"), ["mas", "marca"]);
    assert.deepEqual(route.pathFromHash("#/mas/cuenta/datos?x=1"), ["mas", "cuenta", "datos"]);
    assert.deepEqual(route.pathFromHash("#/plantillas?text=Estrategia"), ["plantillas"]);
  });

  test("el hub sigue el orden de la lista y no nombra otra marca", async () => {
    const store = await load<{
      HUB_ROWS: { id: string; es: string; en: string; go: string }[];
      ORVUPI_APPS: { id: string; href: string }[];
      SCHOOL: { href?: string; go?: string }[];
    }>("lib/mas-store.mjs");
    assert.deepEqual(store.HUB_ROWS.map((row) => row.id), [
      "marca", "imprime", "apps", "dream", "anuncios", "escuela",
      "cuenta", "config", "papelera", "tema", "comentarios", "avanzadas", "salir",
    ]);
    const labels = store.HUB_ROWS.flatMap((row) => [row.es, row.en, row.go]).join("\n");
    assert.equal(/canva|creators/i.test(labels), false);
    assert.equal(store.HUB_ROWS.every((row) => row.go.startsWith("mas/")), true);
    const hrefs = store.ORVUPI_APPS.map((item) => item.href);
    for (const href of ["/work/", "/lab/", "/verify/", "/cuaderno/", "/aprender/", "/marca/"]) {
      assert.equal(hrefs.includes(href), true, href);
    }
    assert.equal(store.SCHOOL.some((item) => item.href === "/methodology/"), true);
    assert.equal(store.SCHOOL.some((item) => item.go === "plantillas"), true);
  });

  test("perfil, tema, papelera y borrado local", async () => {
    const { blankDocument } = await load<{
      blankDocument: (id: string) => { id: string; name: string; meta: { revision: number } };
    }>("lib/document.mjs");
    const projects = await load<{
      saveProject: (storage: ReturnType<typeof memoryStorage>, doc: { id: string; name: string; meta: { revision: number } }) => { ok: boolean; revision?: number };
      listDesigns: (storage: ReturnType<typeof memoryStorage>) => { id: string }[];
    }>("lib/projects.mjs");
    const mas = await load<{
      loadMas: (storage: ReturnType<typeof memoryStorage>) => { profile: { name: string }; theme: string; ai: { history: boolean } };
      setMasField: (storage: ReturnType<typeof memoryStorage>, key: string, value: string) => { profile: { name: string; email: string } };
      setTheme: (storage: ReturnType<typeof memoryStorage>, theme: string) => { theme: string };
      togglePref: (storage: ReturnType<typeof memoryStorage>, key: string) => { ai: { history: boolean } };
      resetProfile: (storage: ReturnType<typeof memoryStorage>) => { profile: { name: string }; theme: string };
      displayName: (profile: { name: string }, lang: string) => string;
      teamLabel: (profile: { name: string; team?: string }, lang: string) => string;
      listTrash: (storage: ReturnType<typeof memoryStorage>, now?: number) => { id: string }[];
      purgeExpiredTrash: (storage: ReturnType<typeof memoryStorage>, now?: number) => string[];
      restoreTrash: (storage: ReturnType<typeof memoryStorage>, id: string) => { id?: string } | null;
      emptyTrash: (storage: ReturnType<typeof memoryStorage>) => number;
      clearOfflineFlags: (storage: ReturnType<typeof memoryStorage>) => number;
      clearStudioData: (storage: ReturnType<typeof memoryStorage>) => void;
      storageReport: (storage: ReturnType<typeof memoryStorage>) => { designs: number; bytes: number };
      clearIaChats: (storage: ReturnType<typeof memoryStorage>) => boolean;
      TRASH_MS: number;
      MAS_KEY: string;
    }>("lib/mas-store.mjs");
    const { patchItem } = await load<{
      patchItem: (storage: ReturnType<typeof memoryStorage>, id: string, patch: { library?: { deletedAt?: string | null; offline?: boolean } }) => { id?: string } | null;
    }>("lib/projects.mjs");

    const storage = memoryStorage();
    assert.equal(mas.displayName({ name: "" }, "es"), "Visitante");
    assert.equal(mas.displayName({ name: "" }, "en"), "Guest");
    assert.equal(mas.setMasField(storage, "profile.name", "Cris").profile.name, "Cris");
    assert.equal(mas.setTheme(storage, "nope").theme, "system");
    assert.equal(mas.setTheme(storage, "dark").theme, "dark");
    assert.equal(mas.teamLabel({ name: "Cris" }, "es"), "Equipo de Cris");
    assert.equal(mas.togglePref(storage, "ai.history").ai.history, false);
    const reset = mas.resetProfile(storage);
    assert.equal(reset.profile.name, "");
    assert.equal(reset.theme, "dark");
    assert.equal(projects.listDesigns(storage).length, 0);

    const doc = blankDocument("square");
    doc.name = "Cartel";
    const saved = projects.saveProject(storage, doc);
    assert.equal(saved.ok, true);
    const day = 24 * 60 * 60 * 1000;
    const now = Date.parse("2026-10-26T12:00:00.000Z");
    assert.equal(patchItem(storage, doc.id, { library: { deletedAt: new Date(now - 2 * day).toISOString(), offline: true } }) != null, true);
    assert.equal(projects.listDesigns(storage).some((item) => item.id === doc.id), false);
    assert.equal(mas.listTrash(storage, now).some((item) => item.id === doc.id), true);
    assert.equal(mas.restoreTrash(storage, doc.id)?.id, doc.id);
    assert.equal(projects.listDesigns(storage).some((item) => item.id === doc.id), true);
    assert.equal(mas.clearOfflineFlags(storage), 1);

    patchItem(storage, doc.id, { library: { deletedAt: new Date(now - 40 * day).toISOString() } });
    assert.deepEqual(mas.purgeExpiredTrash(storage, now), [doc.id]);
    assert.equal(mas.listTrash(storage, now).length, 0);

    const fresh = blankDocument("story");
    fresh.name = "Historia";
    assert.equal(projects.saveProject(storage, fresh).ok, true);
    patchItem(storage, fresh.id, { library: { deletedAt: new Date(now - day).toISOString() } });
    assert.equal(mas.emptyTrash(storage), 1);
    assert.equal(mas.storageReport(storage).designs >= 0, true);
    mas.clearIaChats(storage);
    mas.clearStudioData(storage);
    assert.equal(storage.getItem(mas.MAS_KEY), null);
    assert.equal(mas.storageReport(storage).designs, 0);
    assert.equal(mas.storageReport(storage).bytes, 0);
  });
});
