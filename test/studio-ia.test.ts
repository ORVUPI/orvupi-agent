import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe("studio ORVUPI IA", () => {
  test("el hash #/ia sigue siendo la pestaña y el saludo usa el nombre guardado", async () => {
    const ia = await load<{
      greeting: (name: string, lang: string) => string;
      hrefFor: (screen: string, chatId?: string) => string;
      screenFromHash: (hash: string) => { name: string; chatId: string };
      copy: (lang: string) => { emptyChats: string; thinking: string; more: string; generate: string; sheetShelf: string; noScheduled: string };
    }>("lib/ia-chat.mjs");
    assert.equal(ia.hrefFor("landing"), "#/ia");
    assert.equal(ia.hrefFor("memoria"), "#/ia?panel=memoria");
    assert.equal(ia.hrefFor("chat", "abc"), "#/ia?chat=abc");
    assert.deepEqual(ia.screenFromHash("#/ia"), { name: "landing", chatId: "" });
    assert.deepEqual(ia.screenFromHash("#/ia?panel=memoria"), { name: "memoria", chatId: "" });
    assert.equal(ia.screenFromHash("#/ia?chat=abc").name, "chat");
    assert.equal(ia.greeting("", "es"), "¿Qué diseñamos hoy?");
    assert.equal(ia.greeting("Ana", "es"), "¿Qué diseñamos hoy, Ana?");
    assert.equal(ia.copy("es").emptyChats, "Todos tus chats aparecerán aquí");
    assert.equal(ia.copy("es").thinking, "Pensando…");
    assert.equal(ia.copy("es").more, "Mostrar más plantillas");
    assert.equal(ia.copy("es").generate, "Generar");
    assert.equal(ia.copy("es").sheetShelf, "Crear una estantería");
    assert.equal(ia.copy("es").noScheduled, "No hay tareas programadas");
  });

  test("un currículum o la palabra plantillas devuelven la rejilla del catálogo", async () => {
    const ia = await load<{
      localAnswer: (text: string, lang: string) => { text: string; format: string; templates: { id: string; file: string; category: string }[] };
      workBootStatus: () => { wired: boolean; source: string };
    }>("lib/ia-chat.mjs");
    for (const phrase of ["Quiero un CV", "plantillas de currículum", "enséñame plantillas"]) {
      const answer = ia.localAnswer(phrase, "es");
      assert.equal(answer.format, "cv");
      assert.ok(answer.templates.length >= 4, phrase);
      assert.ok(answer.templates.every((item) => item.category === "curriculum" && item.file.includes("curriculum")));
      assert.match(answer.text, /currículum/);
    }
    const logo = ia.localAnswer("plantillas de logo", "es");
    assert.equal(logo.format, "logo");
    assert.equal(ia.localAnswer("hola", "es").templates.length, 0);
    assert.equal(ia.workBootStatus().source, "catalog");
    assert.equal(ia.workBootStatus().wired, false);
  });

  test("la estantería y los chats se quedan en este navegador", async () => {
    const ia = await load<{
      IA_KEY: string;
      emptyStore: () => { name: string; about: string; shelves: { id: string; name: string; description: string; type: string }[]; tasks: unknown[]; chats: { id: string; messages: { text: string }[] }[]; favs: string[] };
      loadStore: (storage: ReturnType<typeof memoryStorage>) => { name: string; shelves: { name: string }[]; chats: { id: string; messages: { text: string }[] }[] };
      saveStore: (storage: ReturnType<typeof memoryStorage>, store: unknown) => boolean;
      withUserMessage: (store: { name: string; about: string; shelves: { id: string; name: string; description: string; type: string }[]; tasks: unknown[]; chats: { id: string }[]; favs: string[] }, id: string, message: { id: string; role: string; text: string; attachment: string; templates: []; format: string; shown: number; at: number }) => { name: string; shelves: { name: string }[]; chats: { id: string }[] };
      expandMessage: (store: { chats: { id: string; messages: { id: string; templates: { id: string; title: string; file: string; category: string }[]; shown: number }[] }[] }, id: string) => { chats: { messages: { shown: number }[] }[] };
    }>("lib/ia-chat.mjs");
    const storage = memoryStorage();
    const base = ia.emptyStore();
    const message = { id: "m1", role: "user", text: "Hola", attachment: "", templates: [] as [], format: "", shown: 0, at: 1 };
    const next = ia.withUserMessage({ ...base, name: "Ana", shelves: [{ id: "sh1", name: "Marca", description: "", type: "personal" }] }, "c1", message);
    assert.equal(ia.saveStore(storage, next), true);
    const loaded = ia.loadStore(storage);
    assert.equal(loaded.name, "Ana");
    assert.equal(loaded.shelves[0]?.name, "Marca");
    assert.equal(loaded.chats[0]?.id, "c1");
    assert.equal(loaded.chats[0]?.messages[0]?.text, "Hola");
    assert.equal(storage.getItem(ia.IA_KEY)?.includes("Marca"), true);
    const grown = ia.expandMessage({
      chats: [{
        id: "c1",
        messages: [{
          id: "a1",
          templates: [
            { id: "t1", title: "A", file: "thumbs/a.png", category: "curriculum" },
            { id: "t2", title: "B", file: "thumbs/b.png", category: "curriculum" },
            { id: "t3", title: "C", file: "thumbs/c.png", category: "curriculum" },
            { id: "t4", title: "D", file: "thumbs/d.png", category: "curriculum" },
            { id: "t5", title: "E", file: "thumbs/e.png", category: "curriculum" },
          ],
          shown: 4,
        }],
      }],
    }, "a1");
    assert.equal(grown.chats[0]?.messages[0]?.shown, 5);
  });

  test("la pestaña no muestra avisos de Canva ni de riesgo", () => {
    const root = repoRoot();
    const ia = readFileSync(path.join(root, "web/v2/studio/ia.mjs"), "utf8");
    const chat = readFileSync(path.join(root, "web/v2/studio/lib/ia-chat.mjs"), "utf8");
    const view = readFileSync(path.join(root, "web/v2/studio/views.mjs"), "utf8");
    const start = view.indexOf("export function renderIa");
    const end = view.indexOf("const GLANCE");
    const fn = view.slice(start, end);
    assert.match(fn, /renderOrvupiIa/);
    assert.equal(ia.includes("Canva"), false);
    assert.equal(chat.includes("Canva"), false);
    assert.equal(/riesgo|disclaimer/i.test(ia + chat), false);
    assert.match(ia, /orvupi-avatar\.png/);
    assert.match(chat, /Pensando…/);
    assert.equal(fn.includes("modelo"), false);
  });
});
