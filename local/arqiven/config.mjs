/** Configuración estructurada. think es un booleano del JSON, no una orden dentro del texto. */

import os from "node:os";
import path from "node:path";
import { budgetPlan } from "./budget.mjs";

export const DEFAULTS = {
  host: "127.0.0.1",
  port: 4174,
  ollamaBase: "http://127.0.0.1:11434",
  model: "qwen3:8b",
  think: false,
  numCtx: 4096,
  numPredict: 1024,
  temperature: 0.2,
  concurrency: 1,
  timeoutMs: 180000,
  maxBodyBytes: 262144,
  templateReserve: 256,
  localUser: "local",
};

function fromEnv(name, fallback) {
  const value = process.env[name];
  return value == null || value === "" ? fallback : value;
}

function intValue(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw Object.assign(new Error(`${name} debe ser un entero`), { code: "bad-request" });
  }
  return number;
}

export function assertLoopbackUrl(raw, label) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw Object.assign(new Error(`${label} no es una URL`), { code: "bad-request" });
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (parsed.protocol !== "http:" || (host !== "127.0.0.1" && host !== "localhost" && host !== "::1")) {
    throw Object.assign(new Error(`${label} solo puede apuntar a este equipo`), { code: "bad-request" });
  }
  return parsed.origin;
}

export function resolveConfig(overrides = {}) {
  const requestedHost = String(overrides.host ?? fromEnv("ARQIVEN_HOST", DEFAULTS.host));
  if (requestedHost !== "127.0.0.1" && requestedHost !== "localhost") {
    throw Object.assign(new Error("ARQIVEN local solo escucha en 127.0.0.1"), { code: "bad-request" });
  }
  const port = intValue(overrides.port ?? fromEnv("ARQIVEN_PORT", DEFAULTS.port), "ARQIVEN_PORT");
  if (port === 11434) {
    throw Object.assign(new Error("ARQIVEN no abre el puerto 11434. Ese puerto es de Ollama."), { code: "bad-request" });
  }
  const ollamaBase = assertLoopbackUrl(overrides.ollamaBase ?? fromEnv("OLLAMA_HOST", DEFAULTS.ollamaBase), "Ollama");
  const model = String(overrides.model ?? fromEnv("ARQIVEN_MODEL", DEFAULTS.model)).slice(0, 80);
  const thinkSource = overrides.think ?? fromEnv("ARQIVEN_THINK", "false");
  const think = thinkSource === true || thinkSource === "true";
  const numCtx = intValue(overrides.numCtx ?? fromEnv("ARQIVEN_NUM_CTX", DEFAULTS.numCtx), "ARQIVEN_NUM_CTX");
  const numPredict = intValue(overrides.numPredict ?? fromEnv("ARQIVEN_NUM_PREDICT", DEFAULTS.numPredict), "ARQIVEN_NUM_PREDICT");
  const temperature = Number(overrides.temperature ?? fromEnv("ARQIVEN_TEMPERATURE", DEFAULTS.temperature));
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw Object.assign(new Error("ARQIVEN_TEMPERATURE fuera de rango"), { code: "bad-request" });
  }
  const concurrency = intValue(overrides.concurrency ?? fromEnv("ARQIVEN_CONCURRENCY", DEFAULTS.concurrency), "ARQIVEN_CONCURRENCY");
  if (concurrency !== 1) {
    throw Object.assign(new Error("Esta fase atiende una sola petición"), { code: "bad-request" });
  }
  const timeoutMs = intValue(overrides.timeoutMs ?? fromEnv("ARQIVEN_TIMEOUT_MS", DEFAULTS.timeoutMs), "ARQIVEN_TIMEOUT_MS");
  const maxBodyBytes = intValue(overrides.maxBodyBytes ?? fromEnv("ARQIVEN_MAX_BODY", DEFAULTS.maxBodyBytes), "ARQIVEN_MAX_BODY");
  const templateReserve = intValue(overrides.templateReserve ?? fromEnv("ARQIVEN_TEMPLATE_RESERVE", DEFAULTS.templateReserve), "ARQIVEN_TEMPLATE_RESERVE");
  const budget = budgetPlan({ numCtx, numPredict, templateReserve });
  const dataDir = path.resolve(String(overrides.dataDir ?? fromEnv("ARQIVEN_DATA", path.join(os.homedir(), ".arqiven", "local"))));
  const localUser = String(overrides.localUser ?? fromEnv("ARQIVEN_USER", DEFAULTS.localUser)).slice(0, 64);
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(localUser)) {
    throw Object.assign(new Error("ARQIVEN_USER no es un identificador local válido"), { code: "bad-request" });
  }
  return {
    host: "127.0.0.1",
    port,
    ollamaBase,
    model,
    think,
    temperature,
    concurrency,
    timeoutMs,
    maxBodyBytes,
    dataDir,
    localUser,
    ...budget,
  };
}
