/** Backend local de ARQIVEN. Sirve la interfaz y habla con Ollama en este equipo.
 * Escucha solo en 127.0.0.1. No abre el 11434 ni un túnel.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { resolveConfig } from "./config.mjs";
import { createQueue } from "./queue.mjs";
import { createStore } from "./store.mjs";
import { buildChatBody, streamChat } from "./ollama.mjs";
import { attachEditor, withRetry } from "./prompt.mjs";
import { guardChat, outputViolates, passedFragments, SAFE_ANSWER } from "./guard.mjs";
import { liveFacts } from "./hechos.mjs";
import { closeMarketAnswer, completeDespido, completeHigiene, dropUninjectedData, finishReply, offlineMarketAnswer, placeNoteLabel } from "./salida.mjs";
import { retrieveConocimiento } from "./conocimiento.mjs";
import { fitMessages } from "./budget.mjs";
import { metricsFrom } from "./metrics.mjs";
import { codeError, publicError } from "./errors.mjs";
import { canAct } from "./projects.mjs";
import { EMBED_MODEL, ollamaEmbed } from "./embed.mjs";
import { createIndex } from "./rag.mjs";

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

function requestUser(req, config) {
  const raw = req.headers["x-arqiven-user"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const clean = String(value || "").trim();
  if (/^[A-Za-z0-9._-]{1,64}$/.test(clean)) return clean;
  return config.localUser;
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
    if (!response.ok) return { ollama: "down", modelReady: false, digest: "" };
    const body = await response.json();
    const models = Array.isArray(body?.models) ? body.models : [];
    const wanted = config.model;
    const found = models.find((item) => {
      const name = String(item?.name || item?.model || "");
      return name === wanted || name === `${wanted}:latest`;
    });
    return { ollama: "up", modelReady: Boolean(found), digest: String(found?.digest || "").slice(0, 80) };
  } catch {
    return { ollama: "down", modelReady: false, digest: "" };
  } finally {
    clearTimeout(timer);
  }
}

const bootedAt = new Date().toISOString();

function statusBody(config, queue, probe, card = {}) {
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
    digest: card.digest || probe.digest || "",
    quantization: card.quantization || "",
    ollamaVersion: card.ollamaVersion || "",
    pipeline: "mitigado2",
    pid: process.pid,
    startedAt: bootedAt,
    build: String(process.env.ARQIVEN_BUILD || "").slice(0, 80),
    note: `${config.model} es una referencia de terceros ejecutada con Ollama. ARQIVEN no creó estos pesos.`,
  };
}

let cardCache = { at: 0, key: "", card: null };

async function modelCard(config) {
  const key = `${config.ollamaBase}|${config.model}`;
  if (cardCache.card && cardCache.key === key && Date.now() - cardCache.at < 15000) return cardCache.card;
  const card = { digest: "", quantization: "", ollamaVersion: "" };
  const timer = AbortSignal.timeout(800);
  try {
    const version = await fetch(new URL("/api/version", config.ollamaBase), { signal: timer });
    if (version.ok) card.ollamaVersion = String((await version.json())?.version || "").slice(0, 40);
  } catch { /* la ficha sigue sin versión */ }
  try {
    const show = await fetch(new URL("/api/show", config.ollamaBase), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: config.model }),
      signal: AbortSignal.timeout(800),
    });
    if (show.ok) {
      const body = await show.json();
      card.quantization = String(body?.details?.quantization_level || "").slice(0, 40);
    }
  } catch { /* sin cuantización */ }
  if (!card.digest) {
    const probe = await probeOllama(config);
    card.digest = probe.digest || "";
  }
  cardCache = { at: Date.now(), key, card };
  return card;
}

function runRecord(config, card) {
  return {
    model: config.model,
    digest: card.digest || "",
    quantization: card.quantization || "",
    numCtx: config.numCtx,
    numPredict: config.numPredict,
    temperature: config.temperature,
    think: config.think,
    ollamaVersion: card.ollamaVersion || "",
    pipeline: "mitigado2",
  };
}

export async function startLocalServer(overrides = {}) {
  const config = resolveConfig(overrides);
  const store = createStore(config.dataDir, { defaultUser: config.localUser });
  const embed = typeof overrides.embed === "function"
    ? overrides.embed
    : (text) => ollamaEmbed({ base: config.ollamaBase, model: EMBED_MODEL, text });
  const index = createIndex(config.dataDir, {
    embed,
    model: EMBED_MODEL,
    threshold: Number.isFinite(overrides.embedThreshold) ? overrides.embedThreshold : 0.45,
  });
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
    const userId = requestUser(req, config);
    try {
      const projectId = validId(body.projectId);
      await store.assertWrite(userId, conversationId, projectId);
    } catch (error) {
      if (error?.code === "forbidden") {
        sendJson(res, 403, publicError("forbidden", config));
        return;
      }
      throw error;
    }
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
      const projectId = validId(body.projectId);
      const existing = await store.assertWrite(userId, conversationId, projectId);
      const scope = existing?.projectId || projectId;
      let editor = typeof body.editor === "string" ? body.editor : "";
      let documentText = typeof body.document === "string" ? body.document : "";
      if (body.ground === true) {
        if (!scope) throw codeError("bad-request");
        const question = [...visible].reverse().find((item) => item.role === "user")?.content || "";
        const found = await index.retrieve(scope, question);
        if (found.abstain) {
          const text = found.text;
          await store.save({
            id: conversationId,
            messages: [...visible, { role: "assistant", content: text }],
            ownerId: existing?.ownerId || userId,
            ...(existing ? {} : { projectId }),
          });
          writeEvent(res, {
            type: "start",
            requestId,
            conversationId,
            model: "none",
            modelId: "none",
            provider: "none",
            modelVersion: "",
            ownModel: false,
          });
          writeEvent(res, {
            type: "done",
            requestId,
            conversationId,
            text,
            provider: "none",
            modelId: "none",
            modelVersion: "",
            ownModel: false,
            abstain: true,
            citations: [],
          });
          return;
        }
        documentText = [documentText, ...found.citations.map((item) => `[${item.id}] ${item.title}\n${item.excerpt}`)].filter(Boolean).join("\n\n");
        editor = `${editor}\nSi usas un dato de las citas, incluye su id entre corchetes. Si no basta, di que no consta.`.trim();
      }
      await store.save({
        id: conversationId,
        messages: visible,
        ownerId: existing?.ownerId || userId,
        ...(existing ? {} : { projectId }),
      });
      const question = [...visible].reverse().find((item) => item.role === "user")?.content || "";
      let factsText = "";
      let marketOffline = false;
      try {
        const facts = await liveFacts(question);
        if (facts.text) {
          factsText = facts.text;
          documentText = [documentText, facts.text].filter(Boolean).join("\n\n");
        } else if (facts.offline) marketOffline = true;
      } catch { /* sin cifras en vivo */ }
      let trustedNote = "";
      let noteId = "";
      try {
        const known = await retrieveConocimiento(question);
        if (known.text && known.hits?.[0]?.id) {
          trustedNote = known.text;
          noteId = known.hits[0].id;
        }
      } catch { /* la base general no bloquea el chat */ }
      const guarded = guardChat(visible, documentText, "fuente", config.model, trustedNote);
      const redacted = guarded.record;
      const prompt = fitMessages(attachEditor(guarded.messages, editor), config.inputTokens);
      const hold = redacted.omitted.some((item) => item.kept !== true);
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
      let result = await streamChat({
        base: config.ollamaBase,
        body: chatBody,
        signal: controller.signal,
        timeoutMs: config.timeoutMs,
        onToken: (text) => {
          if (!hold) writeEvent(res, { type: "token", requestId, text });
        },
      });
      const polish = (text) => {
        let reply = finishReply(text);
        if (noteId === "despido-baja") reply = completeDespido(reply, trustedNote);
        else if (noteId === "higiene-sueno") reply = completeHigiene(reply, trustedNote);
        else if (noteId) reply = placeNoteLabel(reply, noteId);
        if (factsText) reply = closeMarketAnswer(reply, factsText);
        else if (marketOffline) reply = offlineMarketAnswer();
        return dropUninjectedData(reply, factsText);
      };
      let reply = polish(result.text);
      if (outputViolates(reply, redacted)) {
        const retryBody = buildChatBody({
          model: config.model,
          messages: withRetry(prompt),
          think: config.think,
          numCtx: config.numCtx,
          numPredict: config.numPredict,
          temperature: config.temperature,
        });
        result = await streamChat({
          base: config.ollamaBase,
          body: retryBody,
          signal: controller.signal,
          timeoutMs: config.timeoutMs,
          onToken: () => {},
        });
        reply = outputViolates(result.text, redacted) ? SAFE_ANSWER : polish(result.text);
      }
      const fragments = passedFragments(redacted, "fuente");
      if (hold) writeEvent(res, { type: "token", requestId, text: reply });
      const card = await modelCard(config);
      const run = runRecord(config, card);
      await store.save({ id: conversationId, messages: [...visible, { role: "assistant", content: reply, run, fragments }] });
      await appendFile(path.join(config.dataDir, "runs.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), conversationId, requestId, run })}\n`).catch(() => {});
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
        text: reply,
        omittedInstructions: redacted.omitted.length,
        fragments,
        run,
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
      Promise.all([probeOllama(config), modelCard(config)]).then(([probe, card]) => sendJson(res, 200, statusBody(config, queue, probe, card))).catch(() => {
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
    if (pathname === "/api/arqiven/projects" && req.method === "GET") {
      store.projectsFor(requestUser(req, config)).then((projects) => sendJson(res, 200, { projects })).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 500, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname === "/api/arqiven/projects" && req.method === "POST") {
      readBody(req, 8192).then(async (body) => {
        const project = await store.createProject({
          id: validId(body.id) || randomUUID(),
          name: body.name,
          userId: requestUser(req, config),
        });
        sendJson(res, 201, { project });
      }).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/projects/") && req.method === "POST" && pathname.endsWith("/members")) {
      const projectId = validId(decodeURIComponent(pathname.slice("/api/arqiven/projects/".length, -"/members".length)));
      readBody(req, 8192).then(async (body) => {
        const member = await store.setMember({
          projectId,
          userId: requestUser(req, config),
          memberId: body.userId,
          role: body.role,
        });
        sendJson(res, 200, { member });
      }).catch((error) => {
        const status = error?.code === "forbidden" ? 403 : 400;
        sendJson(res, status, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/projects/") && pathname.includes("/documents")) {
      const marker = "/documents";
      const cut = pathname.indexOf(marker);
      const projectId = validId(decodeURIComponent(pathname.slice("/api/arqiven/projects/".length, cut)));
      const userId = requestUser(req, config);
      const rest = pathname.slice(cut + marker.length).replace(/^\//, "");
      const documentId = validId(decodeURIComponent(rest));
      const guard = store.projectFor(userId, projectId).then((opened) => {
        const write = canAct(opened.project.role, "write");
        const needsWrite = req.method === "DELETE" || (req.method === "POST" && !pathname.endsWith("/retrieve"));
        if (needsWrite && !write) throw codeError("forbidden");
        return opened;
      });
      if (req.method === "GET" && !rest) {
        guard.then(() => index.list(projectId)).then((documents) => sendJson(res, 200, { documents })).catch((error) => {
          sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
        });
        return;
      }
      if (req.method === "DELETE" && documentId) {
        guard.then(() => index.removeDocument(projectId, documentId)).then((result) => sendJson(res, 200, result)).catch((error) => {
          sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
        });
        return;
      }
      if (req.method === "POST" && pathname.endsWith("/retrieve")) {
        readBody(req, 8192).then(async (body) => {
          await guard;
          return index.retrieve(projectId, body.query);
        }).then((found) => sendJson(res, 200, found)).catch((error) => {
          const code = error?.code || "bad-request";
          sendJson(res, code === "forbidden" ? 403 : 400, publicError(code, config, error?.detail));
        });
        return;
      }
      if (req.method === "POST" && !rest) {
        readBody(req, 65536).then(async (body) => {
          await guard;
          return index.add({
            projectId,
            documentId: validId(body.id) || randomUUID(),
            name: body.name,
            text: body.text,
          });
        }).then((document) => sendJson(res, 201, { document })).catch((error) => {
          const code = error?.code || "bad-request";
          sendJson(res, code === "forbidden" ? 403 : 400, publicError(code, config, error?.detail));
        });
        return;
      }
      sendJson(res, 400, publicError("bad-request", config));
      return;
    }
    if (pathname.startsWith("/api/arqiven/projects/") && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      const projectId = validId(decodeURIComponent(pathname.slice("/api/arqiven/projects/".length)));
      const userId = requestUser(req, config);
      const run = req.method === "GET"
        ? store.projectFor(userId, projectId)
        : req.method === "DELETE"
          ? store.removeProject({ projectId, userId })
          : readBody(req, 8192).then((body) => store.renameProject({ projectId, userId, name: body.name }));
      Promise.resolve(run).then(async (payload) => {
        if (req.method === "DELETE") await index.forgetProject(projectId);
        sendJson(res, 200, req.method === "GET" ? payload : { project: payload });
      }).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname === "/api/arqiven/conversations" && req.method === "GET") {
      store.listFor(requestUser(req, config)).then((conversations) => sendJson(res, 200, { conversations })).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 500, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/conversations/") && req.method === "PATCH") {
      const id = validId(decodeURIComponent(pathname.slice("/api/arqiven/conversations/".length)));
      readBody(req, 8192).then(async (body) => {
        const conversation = await store.renameChat({
          conversationId: id,
          title: body.title,
          userId: requestUser(req, config),
        });
        sendJson(res, 200, { conversation });
      }).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/conversations/") && req.method === "POST" && pathname.endsWith("/move")) {
      const id = validId(decodeURIComponent(pathname.slice("/api/arqiven/conversations/".length, -"/move".length)));
      readBody(req, 8192).then(async (body) => {
        const conversation = await store.moveChat({
          conversationId: id,
          projectId: validId(body.projectId),
          userId: requestUser(req, config),
        });
        sendJson(res, 200, { conversation });
      }).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 400, publicError(error?.code || "bad-request", config));
      });
      return;
    }
    if (pathname.startsWith("/api/arqiven/conversations/") && req.method === "GET") {
      const id = validId(decodeURIComponent(pathname.slice("/api/arqiven/conversations/".length)));
      if (!id) {
        sendJson(res, 400, publicError("bad-request", config));
        return;
      }
      store.getFor(requestUser(req, config), id).then((conversation) => {
        sendJson(res, 200, { conversation: conversation || null });
      }).catch((error) => {
        sendJson(res, error?.code === "forbidden" ? 403 : 500, publicError(error?.code || "bad-request", config));
      });
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
