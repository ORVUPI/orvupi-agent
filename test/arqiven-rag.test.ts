import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();
const href = (rel: string) => pathToFileURL(path.join(root, rel)).href;

async function stack() {
  const dir = await mkdtemp(path.join(tmpdir(), "arqiven-rag-"));
  const embedMod = await import(href("local/arqiven/embed.mjs")) as { hashEmbed: (text: string) => number[] };
  const serverMod = await import(href("local/arqiven/server.mjs")) as {
    startLocalServer: (options: Record<string, unknown>) => Promise<{ url: string; close: () => Promise<void> }>;
  };
  const app = await serverMod.startLocalServer({
    dataDir: dir,
    ollamaBase: "http://127.0.0.1:9",
    port: 0,
    host: "127.0.0.1",
    localUser: "local",
    embed: embedMod.hashEmbed,
    embedThreshold: 0.5,
  });
  return { dir, app };
}

function call(url: string, method: string, user: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-arqiven-user": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("RAG local por proyecto", () => {
  test("cita un fragmento real, se abstiene si no consta, y el borrado quita el índice", async () => {
    const { dir, app } = await stack();
    try {
      assert.equal((await call(`${app.url}/api/arqiven/projects`, "POST", "ana", { id: "proyecto-obra", name: "Obra" })).status, 201);
      assert.equal((await call(`${app.url}/api/arqiven/projects`, "POST", "ana", { id: "proyecto-otro", name: "Otro" })).status, 201);
      const added = await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents`, "POST", "ana", {
        id: "doc-entrega1",
        name: "Nota de obra",
        text: "La obra usa cemento gris y la fecha de entrega es el 12 de mayo.",
      });
      assert.equal(added.status, 201);
      await call(`${app.url}/api/arqiven/projects/proyecto-obra/members`, "POST", "ana", { userId: "lector", role: "reader" });
      await call(`${app.url}/api/arqiven/projects/proyecto-obra/members`, "POST", "ana", { userId: "editor", role: "editor" });
      assert.equal((await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents`, "POST", "lector", { name: "x", text: "no debe entrar" })).status, 403);
      const cited = await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents/retrieve`, "POST", "lector", { query: "fecha de entrega de la obra" });
      const hit = await cited.json() as { abstain: boolean; citations: Array<{ id: string; excerpt: string; title: string }> };
      assert.equal(cited.status, 200);
      assert.equal(hit.abstain, false);
      assert.match(hit.citations[0]?.excerpt || "", /12 de mayo/);
      assert.equal((await call(`${app.url}/api/arqiven/projects/proyecto-otro/documents/retrieve`, "POST", "ana", { query: "fecha de entrega de la obra" })).status, 200);
      const other = await (await call(`${app.url}/api/arqiven/projects/proyecto-otro/documents/retrieve`, "POST", "ana", { query: "fecha de entrega de la obra" })).json() as { abstain: boolean };
      assert.equal(other.abstain, true);
      const absent = await (await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents/retrieve`, "POST", "ana", { query: "receta de paella" })).json() as { abstain: boolean; text: string };
      assert.equal(absent.abstain, true);
      assert.match(absent.text, /No consta/);
      const grounded = await call(`${app.url}/api/arqiven/chat`, "POST", "ana", {
        requestId: "req-ground1",
        conversationId: "chat-ground1",
        projectId: "proyecto-obra",
        ground: true,
        messages: [{ role: "user", content: "receta de paella" }],
      });
      const events = (await grounded.text()).split("\n").filter(Boolean).map((line) => JSON.parse(line) as { type?: string; abstain?: boolean; text?: string });
      assert.equal(events.some((item) => item.type === "done" && item.abstain === true && /No consta/.test(String(item.text))), true);
      assert.equal((await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents/doc-entrega1`, "DELETE", "editor")).status, 200);
      const after = await (await call(`${app.url}/api/arqiven/projects/proyecto-obra/documents/retrieve`, "POST", "ana", { query: "fecha de entrega de la obra" })).json() as { abstain: boolean };
      assert.equal(after.abstain, true);
      await call(`${app.url}/api/arqiven/projects/proyecto-otro/documents`, "POST", "ana", { id: "doc-otro0001", name: "Otro", text: "El otro proyecto guarda su propia nota azul." });
      assert.equal((await call(`${app.url}/api/arqiven/projects/proyecto-obra`, "DELETE", "ana")).status, 200);
      const left = await (await call(`${app.url}/api/arqiven/projects/proyecto-otro/documents/retrieve`, "POST", "ana", { query: "nota azul del otro proyecto" })).json() as { abstain: boolean; citations: Array<{ excerpt: string }> };
      assert.equal(left.abstain, false);
      assert.match(left.citations[0]?.excerpt || "", /nota azul/);
    } finally {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
