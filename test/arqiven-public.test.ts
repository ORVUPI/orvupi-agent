import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("ARQIVEN público", () => {
  test("la barra pone ARQIVEN justo después de Work y el mapa después de Studio", () => {
    const samples = [
      ["web/v2/index.html", "/arqiven/", "/studio/"],
      ["web/v2/en/index.html", "/en/arqiven/", "/en/studio/"],
      ["web/v2/ja/index.html", "/ja/arqiven/", "/ja/studio/"],
      ["web/v2/ko/index.html", "/ko/arqiven/", "/ko/studio/"],
      ["web/v2/pt-br/index.html", "/pt-br/arqiven/", "/pt-br/studio/"],
    ] as const;
    for (const [rel, href, studio] of samples) {
      const html = read(rel);
      assert.match(html, new RegExp(`href="/work/"[\\s\\S]{0,700}href="${href}"`));
      assert.match(html, new RegExp(`href="${studio}"><span[^>]*>Studio</span>[\\s\\S]{0,500}href="${href}"`));
      assert.equal(html.includes("ORVUPI IA"), false, rel);
    }
  });

  test("la página no simula un modelo y el logotipo publicado conserva el hash", async () => {
    const page = read("web/v2/arqiven/index.html");
    const app = read("web/v2/arqiven/app.js");
    const css = read("web/v2/arqiven/app.css");
    assert.match(page, /¿En qué puedo ayudarte\?/);
    assert.match(page, /Pregunta lo que quieras/);
    assert.match(page, /id="tools"/);
    assert.match(page, /data-chip="Crear un texto"/);
    assert.match(page, /Sin modelo propio/);
    assert.match(page, /href="\/arqiven\/" aria-current="page"/);
    assert.equal(page.includes("ORVUPI IA"), false);
    assert.equal(page.includes("Espacio de Cristian"), false);
    assert.equal(page.includes("Pensando"), false);
    assert.equal(page.includes("Podríamos organizar tu idea"), false);
    assert.equal(page.includes("RESUMEN DE EJEMPLO"), false);
    assert.equal(page.includes(' style='), false);
    assert.match(page, /src="\/arqiven\/app\.js"/);
    assert.match(page, /href="\/arqiven\/app\.css"/);
    assert.equal(app.includes("getUserMedia"), false);
    assert.equal(app.includes("localStorage"), false);
    assert.equal(app.includes("SharedWorker"), false);
    assert.match(app, /honestResult/);
    assert.match(app, /saveWorkBytes/);
    assert.match(css, /#fc2d63/i);
    const hash = createHash("sha256").update(readFileSync(path.join(root, "web/v2/assets/arqiven/logo-oficial.png"))).digest("hex");
    assert.equal(hash, "f0b8294692096b5d81151e1702e22fdfbe686a535e8cd834c72323af0000812b");
    assert.ok(statSync(path.join(root, "web/v2/arqiven/favicon-32.png")).size > 100);
    assert.ok(statSync(path.join(root, "web/v2/arqiven/icon-192.png")).size > 100);
    for (const rel of ["web/v2/en/arqiven/index.html", "web/v2/pt-br/arqiven/index.html", "web/v2/ja/arqiven/index.html", "web/v2/ko/arqiven/index.html"]) {
      assert.match(read(rel), /<h2>[^<]+<\/h2>/);
      assert.equal(read(rel).includes("ORVUPI IA"), false);
    }
    const sitemap = read("web/v2/sitemap.xml");
    for (const loc of ["https://orvupi.com/arqiven/", "https://orvupi.com/en/arqiven/", "https://orvupi.com/pt-br/arqiven/", "https://orvupi.com/ja/arqiven/", "https://orvupi.com/ko/arqiven/"]) {
      assert.ok(sitemap.includes(loc), loc);
    }
    assert.match(read("apps/work/src/app/App.tsx"), /workspace\.aiOpen \|\| workspace\.view === "ai"/);
    assert.equal(read("apps/work/src/app/App.tsx").includes('navigate("ai")'), false);
    const contract = await import(pathToFileURL(path.join(root, "web/v2/shared/ia/contract.mjs")).href) as {
      capabilities: () => { models: string[]; documentsLeaveDevice: boolean; reservedModelId: string };
      createRequest: (input: { source: string; task: string; messages: Array<{ role: string; content: string }>; contextRefs: string[] }) => { source: string; task: string; contextRefs: string[] };
      honestResult: (request: { contextRefs: string[] }, lang?: string) => { text: string; modelId: string; provider: string; mode: string };
      settleResult: (request: { contextRefs: string[] }, raw: { text: string; modelId: string; provider: string; mode: string; checkpoint?: boolean }) => { text: string; modelId: string; provider: string };
      catalogAsk: () => { text: string; mode: string; provider: string; modelId: string };
      listModels: (ids: string[], checkpoint?: boolean) => string[];
      honestText: (lang: string) => string;
    };
    const caps = contract.capabilities();
    assert.deepEqual(caps.models, []);
    assert.equal(caps.documentsLeaveDevice, false);
    assert.equal(caps.reservedModelId, "arqiven-1-experimental");
    const request = contract.createRequest({ source: "central", task: "chat", messages: [{ role: "user", content: "hola" }], contextRefs: ["file-1"] });
    assert.equal(request.source, "central");
    assert.deepEqual(request.contextRefs, ["file-1"]);
    const honest = contract.honestResult(request, "es");
    assert.equal(honest.modelId, "none");
    assert.equal(honest.provider, "none");
    assert.equal(honest.mode, "rules");
    assert.match(honest.text, /No hay respuesta generada/);
    assert.match(page, new RegExp(honest.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const third = contract.settleResult(request, { text: "resumen", modelId: "qwen05-gpu", provider: "third-party", mode: "model" });
    assert.equal(third.modelId, "qwen05-gpu");
    assert.equal(third.provider, "third-party");
    assert.equal(third.text, "resumen");
    const blocked = contract.settleResult(request, { text: "soy Arqiven", modelId: "arqiven-1-experimental", provider: "arqiven", mode: "model" });
    assert.equal(blocked.modelId, "none");
    assert.equal(blocked.provider, "none");
    assert.match(blocked.text, /No hay respuesta generada/);
    assert.deepEqual(contract.catalogAsk(), { text: "", mode: "rules", provider: "none", modelId: "none" });
    assert.deepEqual(contract.listModels(["qwen05-gpu", "arqiven-1-experimental"]), ["qwen05-gpu"]);
    assert.equal(contract.honestText("en").includes("no generated answer"), true);
    const source = read("web/v2/shared/ia/contract.mjs");
    assert.match(source, /No se usa orvupi-text-experimental/);
    assert.equal(source.includes('modelId: "orvupi-text-experimental-0.1"'), false);
  });
});
