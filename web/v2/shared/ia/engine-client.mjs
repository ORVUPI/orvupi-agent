/** Cliente del worker de terceros. No descarga nada hasta prepare(). */

import { defaultModel, modelById, thirdPartyResult } from "./models.mjs";
import { activeProfile } from "./profile.mjs";

const WORKER_URL = "/arqiven/engine-worker.mjs";

export function createEngineClient() {
  let worker = null;
  let phase = "idle";
  let model = defaultModel();
  let progress = { loaded: 0, total: 0, file: "" };
  let probe = false;
  let error = "";
  let nextId = 0;
  let pending = null;
  const listeners = new Set();

  function snapshot() {
    return {
      phase,
      ready: phase === "ready",
      provider: "third-party",
      modelId: model?.id || "",
      modelVersion: model?.version || "",
      progress: { ...progress },
      probe,
      error,
    };
  }

  function emit() {
    const snap = snapshot();
    globalThis.__ARQIVEN_ENGINE__ = {
      ready: snap.ready,
      provider: "third-party",
      modelId: snap.ready ? snap.modelId : "",
      modelVersion: snap.ready ? snap.modelVersion : "",
      run(request) {
        return run(request);
      },
    };
    for (const listener of listeners) listener(snap);
    return snap;
  }

  function failPending(reason) {
    const job = pending;
    pending = null;
    if (job) job.reject(reason instanceof Error ? reason : new Error(String(reason || "error")));
  }

  function onMessage(msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "progress") {
      progress = { loaded: Number(msg.loaded) || 0, total: Number(msg.total) || 0, file: String(msg.file || "") };
      emit();
      return;
    }
    if (msg.type === "preparing") {
      phase = "preparing";
      probe = true;
      progress = { loaded: 0, total: 0, file: "" };
      emit();
      return;
    }
    if (msg.type === "ready") {
      phase = "ready";
      probe = false;
      error = "";
      emit();
      return;
    }
    if (msg.type === "token" && pending && msg.id === pending.id) {
      pending.onToken(String(msg.text || ""));
      return;
    }
    if (msg.type === "done" && pending && msg.id === pending.id) {
      const job = pending;
      pending = null;
      job.resolve(thirdPartyResult(job.request, {
        text: String(msg.text || ""),
        modelId: model.id,
        provider: "third-party",
        mode: "model",
        lang: job.lang,
      }));
      return;
    }
    if (msg.type === "error") {
      const message = String(msg.message || msg.kind || "error");
      if (pending && (msg.id == null || msg.id === pending.id)) failPending(new Error(message));
      if (phase !== "ready") {
        phase = "error";
        probe = false;
        error = message;
        emit();
      }
    }
  }

  function discardWorker() {
    if (!worker) return;
    const dead = worker;
    worker = null;
    dead.onmessage = () => {};
    dead.onerror = () => {};
    dead.terminate();
  }

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(WORKER_URL, { type: "module" });
    worker.onmessage = (event) => onMessage(event.data);
    worker.onerror = (event) => {
      phase = "error";
      error = event?.message || "worker";
      failPending(new Error(error));
      emit();
    };
    return worker;
  }

  function prepare(modelId) {
    const next = modelById(modelId) || defaultModel();
    if (!next) return snapshot();
    if (worker && phase === "ready" && model?.id === next.id) return emit();
    discardWorker();
    model = next;
    error = "";
    probe = false;
    progress = { loaded: 0, total: 0, file: "" };
    phase = "preparing";
    emit();
    ensureWorker().postMessage({
      type: "load",
      modelId: next.id,
      model: next.repo,
      device: next.device,
      dtype: next.dtype,
    });
    return snapshot();
  }

  function interrupt() {
    if (!worker || phase !== "ready") return snapshot();
    worker.postMessage({ type: "stop" });
    failPending(new Error("cancelled"));
    return snapshot();
  }

  function cancel() {
    if (phase === "preparing") {
      worker?.terminate();
      worker = null;
      failPending(new Error("cancelled"));
      phase = "idle";
      probe = false;
      error = "";
      progress = { loaded: 0, total: 0, file: "" };
      return emit();
    }
    worker?.postMessage({ type: "stop" });
    failPending(new Error("cancelled"));
    return snapshot();
  }

  function run(request, onToken = () => undefined, lang = "es", sources = []) {
    if (phase !== "ready" || !worker || !model) return Promise.reject(new Error("not-ready"));
    if (pending) return Promise.reject(new Error("busy"));
    const id = ++nextId;
    const promptSources = (Array.isArray(sources) ? sources : []).slice(0, 4).map((item) => ({
      title: String(item?.title || "").slice(0, 140),
      url: String(item?.url || "").slice(0, 200),
      excerpt: String(item?.excerpt || "").slice(0, 500),
    }));
    return new Promise((resolve, reject) => {
      pending = { id, request, onToken, resolve, reject, lang };
      const profile = activeProfile(globalThis.location?.search || "");
      worker.postMessage({
        type: "generate",
        id,
        task: request?.task || "chat",
        messages: Array.isArray(request?.messages) ? request.messages : [],
        maxTokens: profile.maxTokensCap > 0 ? profile.maxTokensCap : (model.maxTokens || 320),
        profile: profile.id,
        modelId: model.id,
        sources: promptSources,
        lang,
      });
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  return { prepare, cancel, interrupt, run, subscribe, snapshot };
}

let singleton = null;

export function arqivenEngine() {
  if (!singleton) singleton = createEngineClient();
  return singleton;
}
