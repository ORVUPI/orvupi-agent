/**
 * Selector de red en Verify y en el Cuaderno.
 * Solana sigue el camino de siempre. Base (y luego otras redes EVM)
 * usa el lector genérico. Encender una red es un campo en networks.json.
 */
import { readEvmToken, resetEvmClientLimit } from "../shared/evm-read.js";
import {
  fillNetworkSelect,
  paintChecks,
  paintEvmResult,
  privacyText,
  syncNetworkLabels,
} from "../shared/evm-view.js";
import { openNotebookDb } from "../shared/notebook-db.js";
import { stampIdentity, validateAnyCard, withinStoreLimit } from "../shared/notebook-model.js";

const CACHE_MS = 60_000;
const cache = new Map();
let lastReading = null;
let busy = false;
let controller = null;

function lang() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function selectEl() {
  return document.querySelector("select[data-red='si']");
}

function networkId() {
  const select = selectEl();
  return select && select.value ? select.value : "solana";
}

function addressInput() {
  return document.getElementById("direccion-token") || document.getElementById("direccion-cuaderno");
}

function pageLang() {
  return lang();
}

function paintChrome() {
  const id = networkId();
  const language = pageLang();
  const checks = document.getElementById("comprobaciones-red");
  paintChecks(checks, id, language);
  const notice = document.getElementById("aviso-rpc-base");
  const evm = id !== "solana";
  if (notice) {
    notice.hidden = !evm;
    const es = notice.querySelector(".lang.es");
    const en = notice.querySelector(".lang.en");
    if (es) es.textContent = privacyText(id, "es");
    if (en) en.textContent = privacyText(id, "en");
  }
  const solanaNodes = document.querySelector("#aviso-guardar .aviso-nodos");
  if (solanaNodes) solanaNodes.hidden = evm;
  const rpcDetails = document.querySelector("details:has(#rpc-url)");
  if (rpcDetails) rpcDetails.hidden = evm;
  syncNetworkLabels(language);
}

async function browserTransport(endpoint, body, timeoutMs, signal) {
  const local = new AbortController();
  const timer = setTimeout(() => local.abort(), timeoutMs);
  const onAbort = () => local.abort();
  if (signal) signal.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: local.signal,
    });
    const text = await response.text();
    return { status: response.status, body: text };
  } catch {
    return { status: 0, body: "" };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function cacheKey(id, address) {
  return `${id}:${String(address || "").toLowerCase()}`;
}

function saySaved(card) {
  const node = document.getElementById("estado-guardado") || document.getElementById("comparacion-verify");
  if (!node) return;
  node.replaceChildren();
  const p = document.createElement("p");
  p.className = "nota";
  const lead = document.createElement("span");
  lead.textContent = lang() === "en"
    ? "Saved in this browser's Notebook · "
    : "Guardada en el Cuaderno de este navegador · ";
  const link = document.createElement("a");
  link.href = "/cuaderno/";
  link.textContent = lang() === "en" ? "Open Notebook" : "Abrir Cuaderno";
  p.append(lead, link);
  node.append(p);
  if (card && card.partial) {
    const extra = document.createElement("p");
    extra.className = "nota";
    extra.textContent = lang() === "en"
      ? "Incomplete reading: it was saved marking what is missing."
      : "Lectura incompleta: se guardó marcando lo que falta.";
    node.append(extra);
  }
}

async function saveCard(card) {
  const checked = validateAnyCard(card);
  if (!checked.ok) {
    const node = document.getElementById("estado-guardado");
    if (node) node.textContent = checked.error[lang()];
    return;
  }
  try {
    const db = await openNotebookDb("stubx-cuaderno", {
      onConflict() {
        const node = document.getElementById("estado-guardado");
        if (node) {
          node.textContent = lang() === "en"
            ? "Close the other stubxai.com tabs and reload."
            : "Cierra las otras pestañas de stubxai.com y recarga.";
        }
      },
    });
    const existing = await new Promise((resolve, reject) => {
      const items = [];
      const request = db.transaction("records", "readonly").objectStore("records").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(items);
          return;
        }
        items.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
    if (!withinStoreLimit(existing.length, 1)) {
      const node = document.getElementById("estado-guardado");
      if (node) {
        node.textContent = lang() === "en"
          ? "This browser already has the maximum number of cards."
          : "Este navegador ya tiene el máximo de fichas.";
      }
      return;
    }
    const record = stampIdentity({
      id: crypto.randomUUID(),
      note: "",
      card: checked.card,
      source: "leida",
    });
    await new Promise((resolve, reject) => {
      const request = db.transaction("records", "readwrite").objectStore("records").put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    saySaved(checked.card);
  } catch {
    const node = document.getElementById("estado-guardado");
    if (node) {
      node.textContent = lang() === "en"
        ? "This browser did not allow the notebook to be saved."
        : "Este navegador no dejó guardar el cuaderno.";
    }
  }
}

function paint(reading) {
  const out = document.getElementById("resultado");
  if (!out) return;
  const verify = Boolean(document.getElementById("direccion-token"));
  paintEvmResult(out, reading, lang(), verify ? { onSave: saveCard } : null);
  const title = out.querySelector("h2");
  if (title && title.focus) title.focus({ preventScroll: true });
}

async function consult(force) {
  if (busy) return;
  if (!document.getElementById("direccion-token")) return;
  const input = addressInput();
  const id = networkId();
  if (!input || id === "solana") return;
  const raw = input.value.trim();
  const out = document.getElementById("resultado");
  if (!raw) {
    const error = document.getElementById("direccion-error") || document.getElementById("consulta-error");
    if (error) error.hidden = false;
    return;
  }
  const fieldError = document.getElementById("direccion-error");
  if (fieldError) fieldError.hidden = true;
  const key = cacheKey(id, raw);
  if (!force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      lastReading = hit.reading;
      paint(hit.reading);
      return;
    }
  } else {
    cache.delete(key);
  }
  if (controller) controller.abort();
  controller = new AbortController();
  const ticket = controller;
  busy = true;
  const button = document.querySelector("#consulta button[type='submit']");
  if (button) button.disabled = true;
  if (out) {
    out.dataset.state = "comprobando";
    out.replaceChildren();
    const p = document.createElement("p");
    p.textContent = lang() === "en" ? "Checking…" : "Comprobando…";
    out.append(p);
  }
  try {
    const result = await readEvmToken({
      networkId: id,
      address: raw,
      transport: browserTransport,
      minIntervalMs: 200,
      timeoutMs: 8000,
      signal: ticket.signal,
    });
    if (controller !== ticket) return;
    lastReading = result.reading ? { ...result.reading, reason: result.reason } : result.reading;
    const facts = lastReading && lastReading.facts ? Object.values(lastReading.facts) : [];
    const allFailed = facts.length > 0 && facts.every((fact) => fact.status === "fallo");
    if (result.reason === "invalid" || (result.reason === "leido" && !allFailed)) {
      cache.set(key, { at: Date.now(), reading: lastReading });
    }
    paint(lastReading);
  } finally {
    if (controller === ticket) {
      busy = false;
      if (button) button.disabled = false;
    }
  }
}

let emptyResult = null;

function rememberEmpty() {
  const out = document.getElementById("resultado");
  if (!out || emptyResult) return;
  emptyResult = out.cloneNode(true);
}

function restoreEmpty() {
  const out = document.getElementById("resultado");
  if (!out || !emptyResult) return;
  const copy = emptyResult.cloneNode(true);
  out.replaceChildren(...copy.childNodes);
  if (copy.dataset.state) out.dataset.state = copy.dataset.state;
  if (copy.dataset.luz) out.dataset.luz = copy.dataset.luz;
}

function clearResult() {
  const out = document.getElementById("resultado");
  if (!out) return;
  out.replaceChildren();
  out.dataset.state = "vacio";
  delete out.dataset.luz;
}

function boot() {
  const select = selectEl();
  if (!select) return;
  fillNetworkSelect(select);
  if (window.stubxRedPedida && [...select.options].some((option) => option.value === window.stubxRedPedida)) {
    select.value = window.stubxRedPedida;
  }
  rememberEmpty();
  paintChrome();
  const form = document.getElementById("consulta");
  if (form && document.getElementById("direccion-token")) {
    form.addEventListener("submit", (event) => {
      if (networkId() === "solana") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      consult(false);
    }, true);
  }
  select.addEventListener("change", () => {
    lastReading = null;
    paintChrome();
    if (networkId() === "solana") {
      restoreEmpty();
      return;
    }
    clearResult();
  });
  document.addEventListener("stubx-lang", () => {
    paintChrome();
    if (networkId() !== "solana" && lastReading) paint(lastReading);
  });
  document.addEventListener("stubx-lectura", () => {
    if (networkId() === "solana") return;
    queueMicrotask(() => {
      if (networkId() === "solana") return;
      if (lastReading) paint(lastReading);
      else clearResult();
    });
  });
  window.stubxConsultarRed = (options) => consult(Boolean(options && options.force));
  window.stubxRepintarRed = () => {
    paintChrome();
    if (lastReading) paint(lastReading);
  };
  window.stubxResetEvm = resetEvmClientLimit;
}

boot();
