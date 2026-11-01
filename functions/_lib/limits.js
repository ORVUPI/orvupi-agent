/** Tiempo acotado por petición. Sin cola global: una llamada no espera a otra. */

import { AsyncLocalStorage } from "node:async_hooks";

const FETCH_MS = 4000;
const BUDGET_MS = 8000;
const RETRY_SLEEP_MS = 1000;

const budgetStore = new AsyncLocalStorage();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runWithBudget(ms, fn) {
  return budgetStore.run(Date.now() + ms, fn);
}

export function budgetLeft() {
  const end = budgetStore.getStore();
  if (!end) return BUDGET_MS;
  return Math.max(0, end - Date.now());
}

function deadline() {
  const end = budgetStore.getStore();
  return end || Date.now() + BUDGET_MS;
}

/** La cadena RPC sigue llamando aquí. Ya no espera turno ni abre un corte de un minuto. */
export async function guarded(_provider, run) {
  return run();
}

export async function getJson(url, { headers, timeout = FETCH_MS, attempts = 2 } = {}) {
  const end = deadline();
  const max = attempts === 1 ? 1 : 2;
  let last = null;
  for (let attempt = 0; attempt < max; attempt += 1) {
    const left = end - Date.now();
    if (left < 250) break;
    const wait = Math.min(timeout, FETCH_MS, left);
    try {
      const response = await attemptFetch(url, headers, wait);
      if (response.status === 429 || response.status >= 500) {
        last = response.status;
        if (attempt === max - 1) break;
        const retry = Number(response.headers.get("retry-after"));
        const pause = Math.min(
          Number.isFinite(retry) && retry > 0 ? retry * 1000 : 200,
          RETRY_SLEEP_MS,
          Math.max(0, end - Date.now() - 250),
        );
        if (pause > 0) await sleep(pause);
        continue;
      }
      if (response.status === 404) {
        const error = new Error("not-found");
        error.status = 404;
        throw error;
      }
      if (!response.ok) {
        const error = new Error("upstream");
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error?.status === 404 || error?.status === 400 || error?.status === 401) throw error;
      last = error;
      break;
    }
  }
  const error = new Error("upstream");
  error.status = typeof last === "number" ? last : 503;
  error.code = last?.name === "AbortError" ? "timeout" : "upstream";
  throw error;
}

function attemptFetch(url, headers, wait) {
  const controller = new AbortController();
  let timer = 0;
  let settled = false;
  const timed = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error("timeout");
      error.name = "AbortError";
      reject(error);
    }, wait);
  });
  const request = fetch(url, { headers, signal: controller.signal }).catch((error) => {
    if (settled) return new Promise(() => {});
    if (error?.name === "AbortError") {
      const timeout = new Error("timeout");
      timeout.name = "AbortError";
      throw timeout;
    }
    throw error;
  });
  return Promise.race([request, timed]).then(
    (value) => {
      settled = true;
      return value;
    },
    (error) => {
      settled = true;
      throw error;
    },
  ).finally(() => clearTimeout(timer));
}
