import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

function href(rel: string) {
  return pathToFileURL(path.join(root, rel)).href;
}

async function tempDir() {
  return mkdtemp(path.join(tmpdir(), "arqiven-projects-"));
}

async function openApp(dataDir: string) {
  const serverMod = await import(href("local/arqiven/server.mjs")) as {
    startLocalServer: (options: Record<string, unknown>) => Promise<{
      url: string;
      close: () => Promise<void>;
      store: {
        save: (input: Record<string, unknown>) => Promise<unknown>;
      };
    }>;
  };
  return serverMod.startLocalServer({
    dataDir,
    ollamaBase: "http://127.0.0.1:9",
    port: 0,
    host: "127.0.0.1",
    localUser: "local",
  });
}

function call(url: string, method: string, user: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-arqiven-user": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("proyectos locales de ARQIVEN", () => {
  test("un historial de la versión 1 sigue legible y no pierde los mensajes", async () => {
    const dir = await tempDir();
    try {
      await writeFile(path.join(dir, "history.json"), `${JSON.stringify({
        version: 1,
        conversations: [{ id: "chat-viejo", title: "antes", updated: "2026-11-15T00:00:00.000Z", messages: [{ role: "user", content: "sigue aquí" }] }],
      })}\n`);
      const storeMod = await import(href("local/arqiven/store.mjs")) as {
        createStore: (folder: string) => {
          listFor: (userId: string) => Promise<Array<{ messages: Array<{ content: string }> }>>;
          createProject: (input: { id: string; name: string; userId: string }) => Promise<unknown>;
        };
      };
      const first = storeMod.createStore(dir);
      const rows = await first.listFor("local");
      assert.equal(rows[0]?.messages[0]?.content, "sigue aquí");
      await first.createProject({ id: "proy-viejo", name: "Casa", userId: "local" });
      const raw = JSON.parse(await readFile(path.join(dir, "history.json"), "utf8")) as { version: number; conversations: Array<{ messages: Array<{ content: string }> }> };
      assert.equal(raw.version, 2);
      assert.equal(raw.conversations[0]?.messages[0]?.content, "sigue aquí");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("crear, renombrar, mover y reabrir sobrevive al reinicio, y el lector no puede cambiar nada", async () => {
    const dir = await tempDir();
    const first = await openApp(dir);
    try {
      const created = await call(`${first.url}/api/arqiven/projects`, "POST", "crist", { id: "proyecto-casa", name: "Casa" });
      assert.equal(created.status, 201);
      const project = await created.json() as { project: { id: string; role: string; name: string } };
      assert.equal(project.project.role, "owner");
      const renamed = await call(`${first.url}/api/arqiven/projects/proyecto-casa`, "PATCH", "crist", { name: "Casa norte" });
      assert.equal(renamed.status, 200);
      assert.equal((await renamed.json() as { project: { name: string } }).project.name, "Casa norte");
      await first.store.save({
        id: "chat-mover1",
        title: "Notas",
        ownerId: "crist",
        messages: [{ role: "user", content: "la lista de la obra" }],
      });
      const moved = await call(`${first.url}/api/arqiven/conversations/chat-mover1/move`, "POST", "crist", { projectId: "proyecto-casa" });
      assert.equal(moved.status, 200);
      const titled = await call(`${first.url}/api/arqiven/conversations/chat-mover1`, "PATCH", "crist", { title: "Obra" });
      assert.equal(titled.status, 200);
      await call(`${first.url}/api/arqiven/projects/proyecto-casa/members`, "POST", "crist", { userId: "editor", role: "editor" });
      await call(`${first.url}/api/arqiven/projects/proyecto-casa/members`, "POST", "crist", { userId: "lector", role: "reader" });
      assert.equal((await call(`${first.url}/api/arqiven/projects/proyecto-casa`, "PATCH", "lector", { name: "No" })).status, 403);
      assert.equal((await call(`${first.url}/api/arqiven/conversations/chat-mover1/move`, "POST", "lector", { projectId: "" })).status, 403);
      assert.equal((await call(`${first.url}/api/arqiven/projects/proyecto-casa`, "DELETE", "lector")).status, 403);
      assert.equal((await call(`${first.url}/api/arqiven/projects/proyecto-casa`, "DELETE", "editor")).status, 403);
      assert.equal((await call(`${first.url}/api/arqiven/projects/proyecto-casa/members`, "POST", "editor", { userId: "otra", role: "reader" })).status, 403);
      const chat = await call(`${first.url}/api/arqiven/chat`, "POST", "lector", {
        requestId: "req-lector1",
        conversationId: "chat-mover1",
        messages: [{ role: "user", content: "cambia esto" }],
      });
      assert.equal(chat.status, 403);
      const editorMove = await call(`${first.url}/api/arqiven/projects`, "POST", "crist", { id: "proyecto-sur", name: "Sur" });
      assert.equal(editorMove.status, 201);
      await call(`${first.url}/api/arqiven/projects/proyecto-sur/members`, "POST", "crist", { userId: "editor", role: "editor" });
      const movedByEditor = await call(`${first.url}/api/arqiven/conversations/chat-mover1/move`, "POST", "editor", { projectId: "proyecto-sur" });
      assert.equal(movedByEditor.status, 200);
      const opened = await call(`${first.url}/api/arqiven/projects/proyecto-sur`, "GET", "editor");
      const openedBody = await opened.json() as { project: { name: string }; conversations: Array<{ id: string; title: string }> };
      assert.equal(opened.status, 200);
      assert.equal(openedBody.project.name, "Sur");
      assert.equal(openedBody.conversations[0]?.id, "chat-mover1");
      assert.equal(openedBody.conversations[0]?.title, "Obra");
      const hidden = await call(`${first.url}/api/arqiven/projects/proyecto-sur`, "GET", "lector");
      assert.equal(hidden.status, 403);
    } finally {
      await first.close();
    }
    const second = await openApp(dir);
    try {
      const opened = await call(`${second.url}/api/arqiven/projects/proyecto-sur`, "GET", "crist");
      const body = await opened.json() as { conversations: Array<{ id: string; title: string }> };
      assert.equal(opened.status, 200);
      assert.equal(body.conversations[0]?.title, "Obra");
      const removed = await call(`${second.url}/api/arqiven/projects/proyecto-sur`, "DELETE", "crist");
      assert.equal(removed.status, 200);
      const general = await call(`${second.url}/api/arqiven/conversations/chat-mover1`, "GET", "crist");
      const chat = await general.json() as { conversation: { projectId: string; messages: Array<{ content: string }> } };
      assert.equal(chat.conversation.projectId, "");
      assert.equal(chat.conversation.messages[0]?.content, "la lista de la obra");
      const lastOwner = await call(`${second.url}/api/arqiven/projects/proyecto-casa/members`, "POST", "crist", { userId: "crist", role: "reader" });
      assert.equal(lastOwner.status, 400);
    } finally {
      await second.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
