import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

describe("motor de terceros de ARQIVEN", () => {
  test("el catálogo nombra terceros y el contrato no acepta Arqiven-N sin checkpoint", async () => {
    const models = await import(pathToFileURL(path.join(root, "web/v2/shared/ia/models.mjs")).href) as {
      defaultModel: () => { id: string; repo: string; version: string };
      thirdPartyResult: (request: { contextRefs: string[] }, raw: { text?: string; modelId?: string; provider?: string; mode?: string; checkpoint?: boolean; lang?: string }) => { text: string; modelId: string; provider: string; modelVersion: string; mode: string };
      badgeOf: (result: { mode: string; provider: string; modelId: string; modelVersion?: string }) => string;
      THIRD_PARTY_MODELS: Array<{ id: string }>;
    };
    const contract = await import(pathToFileURL(path.join(root, "web/v2/shared/ia/contract.mjs")).href) as {
      createRequest: (input: { source: string }) => { contextRefs: string[] };
      capabilities: () => { models: string[] };
    };
    const request = contract.createRequest({ source: "central" });
    assert.deepEqual(contract.capabilities().models, []);
    assert.equal(models.defaultModel().id, "smol135-cpu");
    assert.equal(models.defaultModel().repo, "HuggingFaceTB/SmolLM2-135M-Instruct");
    assert.equal(models.THIRD_PARTY_MODELS.some((item) => item.id.startsWith("arqiven-")), false);
    const third = models.thirdPartyResult(request, { text: "azul", modelId: "smol135-cpu", provider: "third-party", mode: "model", lang: "es" });
    assert.equal(third.provider, "third-party");
    assert.equal(third.modelId, "smol135-cpu");
    assert.equal(third.modelVersion, "SmolLM2-135M-Instruct");
    assert.equal(third.text, "azul");
    assert.match(models.badgeOf(third), /model · third-party · smol135-cpu · SmolLM2-135M-Instruct/);
    const blocked = models.thirdPartyResult(request, { text: "soy Arqiven", modelId: "arqiven-1-experimental", provider: "arqiven", mode: "model" });
    assert.equal(blocked.modelId, "none");
    assert.equal(blocked.provider, "none");
    assert.match(blocked.text, /No hay respuesta generada/);
    const unknown = models.thirdPartyResult(request, { text: "x", modelId: "inventado", provider: "third-party" });
    assert.equal(unknown.provider, "none");
  });

  test("Studio usa el motor solo si está listo y si no deja el catálogo", async () => {
    const hook = await import(pathToFileURL(path.join(root, "web/v2/shared/ia/studio-hook.mjs")).href) as {
      studioAsk: (input: { text: string }) => Promise<{ text: string; mode: string; provider: string; modelId: string }>;
    };
    const bag = globalThis as typeof globalThis & { __ARQIVEN_ENGINE__?: { ready: boolean; timeoutMs?: number; run: (request: unknown) => Promise<unknown> } };
    const previous = bag.__ARQIVEN_ENGINE__;
    delete bag.__ARQIVEN_ENGINE__;
    assert.deepEqual(await hook.studioAsk({ text: "logo" }), { text: "", mode: "rules", provider: "none", modelId: "none" });
    bag.__ARQIVEN_ENGINE__ = {
      ready: true,
      run: async () => ({ text: "desde el modelo", modelId: "smol135-cpu", provider: "third-party", mode: "model" }),
    };
    const hit = await hook.studioAsk({ text: "logo" });
    assert.equal(hit.text, "desde el modelo");
    assert.equal(hit.provider, "third-party");
    assert.equal(hit.modelId, "smol135-cpu");
    bag.__ARQIVEN_ENGINE__ = {
      ready: true,
      run: async () => ({ text: "soy Arqiven", modelId: "arqiven-1-experimental", provider: "arqiven", mode: "model" }),
    };
    assert.equal((await hook.studioAsk({ text: "logo" })).text, "");
    bag.__ARQIVEN_ENGINE__ = { ready: false, run: async () => ({ text: "no", modelId: "smol135-cpu", provider: "third-party", mode: "model" }) };
    assert.equal((await hook.studioAsk({ text: "logo" })).text, "");
    bag.__ARQIVEN_ENGINE__ = { ready: true, timeoutMs: 30, run: () => new Promise(() => undefined) };
    assert.equal((await hook.studioAsk({ text: "logo" })).text, "");
    bag.__ARQIVEN_ENGINE__ = { ready: true, run: async () => ({ text: "otro", modelId: "inventado", provider: "third-party", mode: "model" }) };
    assert.equal((await hook.studioAsk({ text: "logo" })).text, "");
    if (previous) bag.__ARQIVEN_ENGINE__ = previous;
    else delete bag.__ARQIVEN_ENGINE__;
    assert.match(read("web/v2/studio/ia.mjs"), /studioAsk/);
    assert.match(read("web/v2/studio/ia.mjs"), /third-party/);
  });

  test("el worker fija los mismos orígenes que Work y la CSP de ARQIVEN no abre el resto del sitio", () => {
    const models = read("web/v2/shared/ia/models.mjs");
    const worker = read("web/v2/arqiven/engine-worker.mjs");
    const app = read("web/v2/arqiven/app.js");
    const headers = read("web/v2/_headers");
    assert.match(models, /https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@4\.3\.1\/\+esm/);
    assert.match(models, /https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@1\.31\.0-dev\.20260914-8d85527a0\/dist\//);
    assert.match(worker, /import\(TRANSFORMERS_ESM\)/);
    assert.match(worker, /wasmPaths = ONNX_WASM/);
    assert.match(worker, /numThreads = 1/);
    assert.equal(worker.includes("arqiven-1"), false);
    assert.equal(worker.includes("Eres ORVUPI AI"), false);
    assert.match(app, /honestResult/);
    assert.match(app, /startPrepare\(defaultModel\(\)\.id\)/);
    assert.match(app, /Preparando modelo de terceros/);
    assert.equal(app.includes("Preparar modelo de terceros"), false);
    assert.match(app, /prepare\.addEventListener/);
    assert.equal(app.includes("Pensando"), false);
    assert.equal(app.includes("getUserMedia"), false);
    assert.equal(app.includes("localStorage"), false);
    assert.equal(app.includes("SharedWorker"), false);
    assert.equal(app.includes("innerHTML"), false);
    assert.match(app, /loadWorkBytes/);
    assert.match(app, /openEditorWith/);
    assert.match(app, /randomUUID/);
    const globalBlock = headers.slice(headers.indexOf("\n/*\n"), headers.indexOf("\n/verify/\n"));
    assert.match(globalBlock, /connect-src 'self'/);
    assert.equal(globalBlock.includes("huggingface"), false);
    assert.equal(globalBlock.includes("wasm-unsafe-eval"), false);
    const arqiven = headers.split("/arqiven/\n")[1]?.split("/arqiven/*")[0] ?? "";
    assert.match(arqiven, /https:\/\/huggingface\.co/);
    assert.match(arqiven, /https:\/\/cdn\.jsdelivr\.net/);
    assert.equal(arqiven.includes("unsafe-inline"), false);
    assert.equal(arqiven.includes("youtube"), false);
    assert.equal(arqiven.includes("'unsafe-eval'"), false);
    for (const rel of ["web/v2/arqiven/index.html", "web/v2/en/arqiven/index.html", "web/v2/pt-br/arqiven/index.html", "web/v2/ja/arqiven/index.html", "web/v2/ko/arqiven/index.html"]) {
      const meta = read(rel).match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
      assert.match(meta, /huggingface\.co/, rel);
      assert.match(meta, /cdn\.jsdelivr\.net/, rel);
      assert.match(meta, /wasm-unsafe-eval/, rel);
      assert.equal(meta.includes("unsafe-inline"), false, rel);
      assert.equal(meta.includes("youtube"), false, rel);
      assert.equal(meta.includes("'unsafe-eval'"), false, rel);
    }
    const entry = read("web/v2/work/index.html").match(/src="(\/work\/assets\/index-[^"]+\.js)"/)?.[1] ?? "";
    assert.match(entry, /\/work\/assets\/index-/);
    const bundle = read(`web/v2${entry}`);
    assert.equal(bundle.includes("Eres ORVUPI AI"), false);
    assert.match(bundle, /No digas que eres Arqiven-N/);
    assert.match(bundle, /aside:e\.aiOpen\|\|e\.view===`ai`/);
    assert.match(bundle, /arqiven-core`\)!==`0`/);
    assert.equal(bundle.includes("e.navigate(`ai`)"), false);
    assert.match(bundle, /Preparar ORVUPI AI/);
    assert.match(read("apps/work/src/ai/client.ts"), /arqiven-core"\) !== "0"/);
    assert.match(read("apps/work/src/app/App.tsx"), /aiOnePanel/);
    assert.equal(read("web/v2/studio/index.html").includes("huggingface.co"), false);
  });

  test("el esqueleto de entrenamiento cuenta parámetros y no abre la red", async () => {
    const train = await import(pathToFileURL(path.join(root, "docs/orvupi-ia/entrenamiento/comprobar.mjs")).href) as {
      CONFIG: { initialize_from: string; seed: number; n_layer: number; n_embd: number; n_head: number; n_ctx: number; vocab: number };
      CPU_CHECK: { device: string; n_layer: number; initialize_from: string; seed: number; n_embd: number; n_head: number; n_ctx: number; vocab: number; modelId: string; ffn_hidden_size: number; tie_embeddings: boolean };
      countParams: (config?: { initialize_from: string; modelId: string; device: string; n_embd: number; n_head: number; ffn_hidden_size: number; n_ctx: number; vocab: number; n_layer: number; tie_embeddings: boolean }) => number;
      EXPECTED_PARAMS: number;
      CPU_CHECK_PARAMS: number;
    };
    assert.equal(train.CONFIG.initialize_from, "random");
    assert.equal(train.CONFIG.seed, 42);
    assert.equal(train.CONFIG.n_layer, 8);
    assert.equal(train.CONFIG.n_embd, 384);
    assert.equal(train.CONFIG.n_head, 6);
    assert.equal(train.CONFIG.n_ctx, 512);
    assert.equal(train.CONFIG.vocab, 8192);
    assert.equal(train.countParams(), train.EXPECTED_PARAMS);
    assert.equal(train.EXPECTED_PARAMS, 17504640);
    assert.equal(train.countParams(train.CPU_CHECK), train.CPU_CHECK_PARAMS);
    assert.equal(train.CPU_CHECK_PARAMS, 108864);
    assert.equal(train.CPU_CHECK.device, "cpu");
    assert.equal(train.CPU_CHECK.n_layer, 2);
    const manifest = JSON.parse(read("docs/orvupi-ia/entrenamiento/manifiesto.ejemplo.json")) as { documents: unknown[]; modelId: string };
    assert.equal(manifest.modelId, "arqiven-1-experimental");
    assert.deepEqual(manifest.documents, []);
    const step = await import(pathToFileURL(path.join(root, "docs/orvupi-ia/entrenamiento/paso-cpu.mjs")).href) as {
      cpuStep: (config: typeof train.CPU_CHECK) => { loss: number; checkpoint: boolean; network: boolean; publicModel: boolean };
    };
    const first = step.cpuStep(train.CPU_CHECK);
    const second = step.cpuStep(train.CPU_CHECK);
    assert.equal(first.checkpoint, false);
    assert.equal(first.network, false);
    assert.equal(first.publicModel, false);
    assert.equal(first.loss, second.loss);
    assert.equal(Number.isFinite(first.loss), true);
    assert.equal(first.loss, 0.0007700743344215597);
    assert.match(read("web/v2/studio/lib/ai-optional.mjs"), /Textos rápidos/);
    assert.match(read("apps/work/src/pdf/engine.ts"), /getTextContent/);
    assert.match(read("apps/work/src/pdf/engine.ts"), /no es OCR/);
    assert.match(read("apps/work/src/pdf/PdfScreen.tsx"), /pdfNotOcr/);
    assert.match(read("apps/work/src/i18n/messages.ts"), /No es OCR/);
    const plain = await import(pathToFileURL(path.join(root, "web/v2/shared/ia/plain.mjs")).href) as {
      sanitizePlain: (value: string, max?: number) => string;
    };
    assert.equal(plain.sanitizePlain("a<b>\u0000c"), "a<b>c");
    assert.equal(plain.sanitizePlain("javascript:alert(1)").includes("alert"), true);
    assert.equal(plain.sanitizePlain("x".repeat(9000)).length, 8000);
    const source = read("docs/orvupi-ia/entrenamiento/comprobar.mjs");
    assert.equal(source.includes("fetch("), false);
    assert.equal(source.includes("https://"), false);
  });
});
