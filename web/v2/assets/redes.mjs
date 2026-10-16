/**
 * Selector de red en Verify y en el Cuaderno.
 * Solana sigue el camino de siempre. Base, Ethereum y BNB Chain
 * usan el lector genérico. La lista vive en networks.json.
 */
import { EVM_MAX_BODY, normalizeEvmAddress, readCappedText, readEvmToken, resetEvmClientLimit } from "../shared/evm-read.js";
import {
  fillNetworkSelect,
  pageLede,
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

let solanaLede = null;

function syncLede(id) {
  const lede = document.querySelector("main .lede");
  if (!lede) return;
  const es = lede.querySelector(".lang.es");
  const en = lede.querySelector(".lang.en");
  if (!solanaLede) {
    solanaLede = { es: es ? es.textContent : "", en: en ? en.textContent : "" };
  }
  const nextEs = id === "solana" ? solanaLede.es : pageLede(id, "es");
  const nextEn = id === "solana" ? solanaLede.en : pageLede(id, "en");
  if (es && nextEs) es.textContent = nextEs;
  if (en && nextEn) en.textContent = nextEn;
}

function syncSolanaHelp(id) {
  const hide = id !== "solana";
  for (const link of document.querySelectorAll(".ayuda-terminos a")) {
    const href = link.getAttribute("href") || "";
    if (href !== "/aprender/#autoridad-emision" && href !== "/aprender/#curva-pump") continue;
    link.hidden = hide;
  }
}

function paintChrome() {
  const id = networkId();
  const language = pageLang();
  syncLede(id);
  syncSolanaHelp(id);
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
    const capped = await readCappedText(response, EVM_MAX_BODY, local.signal);
    if (capped.aborted || capped.failed) return { status: 0, body: "" };
    if (capped.overflow) return { status: response.status, body: "", overflow: true };
    return { status: response.status, body: capped.text || "" };
  } catch {
    return { status: 0, body: "" };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function cacheKey(id, address) {
  const normalized = normalizeEvmAddress(address);
  if (!normalized) return "";
  return `${id}:${normalized}`;
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
    const db = await openNotebookDb("orvupi-cuaderno", {
      onConflict() {
        const node = document.getElementById("estado-guardado");
        if (node) {
          node.textContent = lang() === "en"
            ? "Close the other tabs of this website and reload."
            : "Cierra las otras pestañas de esta web y recarga.";
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
  if (key && !force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      lastReading = hit.reading;
      paint(hit.reading);
      return;
    }
  } else if (key) {
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
    if (key && result.reason === "leido" && !allFailed) {
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
  if (window.orvupiRedPedida && [...select.options].some((option) => option.value === window.orvupiRedPedida)) {
    select.value = window.orvupiRedPedida;
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
  document.addEventListener("orvupi-lang", () => {
    paintChrome();
    if (networkId() !== "solana" && lastReading) paint(lastReading);
  });
  document.addEventListener("orvupi-lectura", () => {
    if (networkId() === "solana") return;
    queueMicrotask(() => {
      if (networkId() === "solana") return;
      if (lastReading) paint(lastReading);
      else clearResult();
    });
  });
  window.orvupiConsultarRed = (options) => consult(Boolean(options && options.force));
  window.orvupiRepintarRed = () => {
    paintChrome();
    if (lastReading) paint(lastReading);
  };
  window.orvupiResetEvm = resetEvmClientLimit;
}

boot();
