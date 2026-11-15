/** Backend local de ARQIVEN. Sirve la interfaz y habla con Ollama en este equipo.
 * Escucha solo en 127.0.0.1. No abre el 11434 ni un túnel.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { resolveConfig } from "./config.mjs";
import { createQueue } from "./queue.mjs";
import { createStore } from "./store.mjs";
import { buildChatBody, streamChat } from "./ollama.mjs";
import { attachDocument, attachEditor, LOCAL_SYSTEM } from "./prompt.mjs";
import { fitMessages } from "./budget.mjs";
import { metricsFrom } from "./metrics.mjs";
import { codeError, publicError } from "./errors.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const webRoot = path.resolve(here, "../../web/v2");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

function validId(value) {
  const id = String(value || "");
  return /^[A-Za-z0-9-]{8,80}$/.test(id) ? id : "";
}

function dialogueFrom(input) {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!item || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
    const content = item.content.slice(0, 8000);
    if (!content.trim()) return [];
    return [{ role: item.role, content }];
  }).slice(-40);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

function writeEvent(res, event) {
  if (res.writableEnded || res.destroyed) return false;
  try {
    return res.write(`${JSON.stringify(event)}\n`);
  } catch {
    return false;
  }
}

async function readBody(req, max) {
  const chunks = [];
  let size = 0;
  let overflow = false;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) overflow = true;
    else chunks.push(chunk);
  }
  if (overflow) throw codeError("too-large");
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw codeError("bad-request");
  }
}

function mapPath(pathname) {
  const langAsset = pathname.match(/^\/(?:en|pt-br|ja|ko)(\/arqiven\/(?:app\.css|app\.js|engine-worker\.mjs|favicon-32\.png|icon-192\.png|knowledge-index\.json))$/);
  return langAsset ? langAsset[1] : pathname;
}

function inside(file) {
  const root = webRoot.endsWith(path.sep) ? webRoot : webRoot + path.sep;
  return file === webRoot || file.startsWith(root);
}

function isolated(pathname) {
  return /\/arqiven(?:\/|$)/.test(pathname);
}

function serveStatic(req, res, pathname) {
  const mapped = mapPath(pathname);
  let decoded = mapped;
  try {
    decoded = decodeURIComponent(mapped);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (decoded.includes("\0")) {
    res.writeHead(400);
    res.end();
    return;
  }
  const file = path.normalize(path.join(webRoot, decoded));
  if (!inside(file)) {
    res.writeHead(403);
    res.end();
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("No está");
    return;
  }
  if (stat.isDirectory()) {
    if (!decoded.endsWith("/")) {
      res.writeHead(301, { location: `${decoded}/${new URL(req.url || "/", "http://127.0.0.1").search}` });
      res.end();
      return;
    }
    serveStatic(req, res, `${mapped}index.html`);
    return;
  }
  const headers = {
    "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    "content-length": stat.size,
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
  };
  if (isolated(pathname) || isolated(mapped)) {
    headers["cross-origin-opener-policy"] = "same-origin";
    headers["cross-origin-embedder-policy"] = "credentialless";
  }
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

async function probeOllama(config) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800);
  try {
    const response = await fetch(new URL("/api/tags", config.ollamaBase), { signal: ctrl.signal });
    if (!response.ok) return { ollama: "down", modelReady: false };
    const body = await response.json();
    const names = Array.isArray(body?.models) ? body.models.map((item) => String(item?.name || item?.model || "")) : [];
    const wanted = config.model;
    const modelReady = names.some((name) => name === wanted || name === `${wanted}:latest`);
    return { ollama: "up", modelReady };
  } catch {
    return { ollama: "down", modelReady: false };
  } finally {
    clearTimeout(timer);
  }
}

function statusBody(config, queue, probe) {
  return {
    mode: "local",
    runtime: "ollama",
    host: "127.0.0.1",
    model: config.model,
    provider: "third-party",
    ownModel: false,
    think: config.think,
    numCtx: config.numCtx,
    numPredict: config.numPredict,
    inputBudget: config.inputTokens,
    templateReserve: config.templateReserve,
    temperature: config.temperature,
    concurrency: 1,
    queue: queue.snapshot().waiting.length,
    active: queue.snapshot().active,
    ollama: probe.ollama,
    modelReady: probe.modelReady,
    note: `${config.model} es una referencia de terceros ejecutada con Ollama. ARQIVEN no creó estos pesos.`,
  };
}

export async function startLocalServer(overrides = {}) {
  const config = resolveConfig(overrides);
  const store = createStore(config.dataDir);
  const queue = createQueue(1);
  const jobs = new Map();

  async function remember(metric) {
    try {
      await store.appendMetric(metric);
    } catch {
      /* La respuesta no depende de poder anotar la métrica. */
    }
  }

  async function handleChat(req, res) {
    let body;
    try {
      body = await readBody(req, config.maxBodyBytes);
    } catch (error) {
      const coded = publicError(error.code || "bad-request", config);
      sendJson(res, error.code === "too-large" ? 413 : 400, coded);
      return;
    }
    const requestId = validId(body.requestId) || randomUUID();
    const conversationId = validId(body.conversationId) || randomUUID();
    const controller = new AbortController();
    jobs.set(requestId, controller);
    res.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.on("close", () => {
      if (res.writableEnded) return;
      queue.cancel(requestId);
      controller.abort(codeError("cancelled"));
    });
    let held = false;
    const started = Date.now();
    try {
      await queue.acquire(requestId, (info) => {
        writeEvent(res, { type: "queued", requestId, conversationId, position: info.position, status: "en espera" });
      });
      held = true;
      if (controller.signal.aborted) throw codeError("cancelled");
      let visible = dialogueFrom(body.messages);
      if (body.regenerate === true) {
        const stored = await store.get(conversationId);
        const base = stored?.messages?.length ? stored.messages.map((item) => ({ role: item.role, content: item.content })) : visible;
        if (base.at(-1)?.role === "assistant") base.pop();
        visible = base;
      }
      if (!visible.some((item) => item.role === "user")) throw codeError("bad-request");
      await store.save({ id: conversationId, messages: visible });
      const editor = typeof body.editor === "string" ? body.editor : "";
      const documentText = typeof body.document === "string" ? body.document : "";
      const prompt = fitMessages(attachDocument(attachEditor([
        { role: "system", content: LOCAL_SYSTEM },
        ...visible,
      ], editor), documentText), config.inputTokens);
      const chatBody = buildChatBody({
        model: config.model,
        messages: prompt,
        think: config.think,
        numCtx: config.numCtx,
        numPredict: config.numPredict,
        temperature: config.temperature,
      });
      writeEvent(res, {
        type: "start",
        requestId,
        conversationId,
        model: config.model,
        modelId: config.model,
        provider: "third-party",
        modelVersion: `${config.model} (Ollama, tercero)`,
        ownModel: false,
      });
      const result = await streamChat({
        base: config.ollamaBase,
        body: chatBody,
        signal: controller.signal,
        timeoutMs: config.timeoutMs,
        onToken: (text) => writeEvent(res, { type: "token", requestId, text }),
      });
      await store.save({ id: conversationId, messages: [...visible, { role: "assistant", content: result.text }] });
      const metrics = metricsFrom({
        requestId,
        model: config.model,
        done: result.done,
        ttftMs: result.ttftMs,
        totalMs: result.totalMs,
        error: null,
      });
      await remember(metrics);
      writeEvent(res, {
        type: "done",
        requestId,
        conversationId,
        text: result.text,
        provider: "third-party",
        modelId: config.model,
        modelVersion: `${config.model} (Ollama, tercero)`,
        ownModel: false,
        metrics,
      });
    } catch (error) {
      const code = error?.code || "ollama-error";
      const metrics = metricsFrom({
        requestId,
        model: config.model,
        done: null,
        ttftMs: 0,
        totalMs: Date.now() - started,
        error: code,
      });
      await remember(metrics);
      const published = publicError(code, config, error?.detail);
      writeEvent(res, { type: "error", requestId, conversationId, ...published });
    } finally {
      jobs.delete(requestId);
      if (held) queue.release();
      if (!res.writableEnded) res.end();
    }
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = url.pathname;
    if (pathname === "/api/arqiven/status" && req.method === "GET") {
      probeOllama(config).then((probe) => sendJson(res, 200, statusBody(config, queue, probe))).catch(() => {
        sendJson(res, 200, statusBody(config, queue, { ollama: "down", modelReady: false }));
      });
      return;
    }
    if (pathname === "/api/arqiven/image" && req.method === "GET") {
      sendJson(res, 200, { enabled: false, model: "" });
      return;
    }
    if (pathname === "/api/arqiven/image") {
      sendJson(res, 503, { enabled: false });
      return;
    }
    if (pathname === "/api/arqiven/conversations" && req.method === "GET") {
      store.list().then((conversations) => sendJson(res, 200, { conversations })).catch(() => {
        sendJson(res, 500, publicError("bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/conversations/") && req.method === "GET") {
      const id = validId(decodeURIComponent(pathname.slice("/api/arqiven/conversations/".length)));
      if (!id) {
        sendJson(res, 400, publicError("bad-request", config));
        return;
      }
      store.get(id).then((conversation) => {
        sendJson(res, 200, { conversation: conversation || null });
      }).catch(() => sendJson(res, 500, publicError("bad-request", config)));
      return;
    }
    if (pathname === "/api/arqiven/metrics" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 20;
      store.readMetrics(limit).then((metrics) => sendJson(res, 200, { metrics })).catch(() => {
        sendJson(res, 500, publicError("bad-request", config));
      });
      return;
    }
    if (pathname === "/api/arqiven/cancel" && req.method === "POST") {
      readBody(req, 4096).then((body) => {
        const id = validId(body.requestId);
        if (!id) {
          sendJson(res, 400, publicError("bad-request", config));
          return;
        }
        if (queue.cancel(id)) {
          sendJson(res, 200, { ok: true, state: "en espera", ...publicError("cancelled", config) });
          return;
        }
        const job = jobs.get(id);
        if (!job) {
          sendJson(res, 404, publicError("cancelled", config));
          return;
        }
        job.abort(codeError("cancelled"));
        sendJson(res, 200, { ok: true, state: "running", ...publicError("cancelled", config) });
      }).catch((error) => {
        sendJson(res, error.code === "too-large" ? 413 : 400, publicError(error.code || "bad-request", config));
      });
      return;
    }
    if (pathname === "/api/arqiven/chat" && req.method === "POST") {
      handleChat(req, res).catch(() => {
        if (!res.headersSent) sendJson(res, 500, publicError("ollama-error", config));
        else if (!res.writableEnded) res.end();
      });
      return;
    }
    if (pathname.startsWith("/api/")) {
      sendJson(res, 404, publicError("bad-request", config));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, publicError("bad-request", config));
      return;
    }
    serveStatic(req, res, pathname);
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(config.port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve(undefined);
    });
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
    server.close();
    throw Object.assign(new Error("ARQIVEN local solo escucha en 127.0.0.1"), { code: "bad-request" });
  }
  return {
    server,
    config,
    store,
    queue,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const started = await startLocalServer();
  console.log(`ARQIVEN local en ${started.url}/arqiven/`);
  console.log(`Ollama previsto en ${started.config.ollamaBase} con ${started.config.model} (tercero, no es un modelo de ARQIVEN).`);
  console.log("Escucha solo en 127.0.0.1. No abre el puerto 11434.");
}
