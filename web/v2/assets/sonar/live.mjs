import { api } from "./api.mjs";

const listeners = new Set();
const last = new Map();
let socket = null;
let symbolToId = {};
let pollTimer = 0;
let started = false;

export function onTick(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function lastPrice(id) {
  return last.get(id) ?? null;
}

export function status() {
  return socket && socket.readyState === WebSocket.OPEN ? "live" : "poll";
}

function emit(updates) {
  if (!updates.length) return;
  for (const fn of listeners) fn(updates);
}

function apply(id, price) {
  const prev = last.get(id);
  if (prev === price) return null;
  last.set(id, price);
  if (prev == null) return null;
  return { id, price, prev };
}

export async function startLive() {
  if (started) return;
  started = true;
  try {
    const body = await api("/api/sonar/pairs");
    symbolToId = {};
    for (const [id, symbol] of Object.entries(body.pairs || {})) symbolToId[symbol] = id;
  } catch {
    symbolToId = {};
  }
  connect();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      socket?.close();
      clearInterval(pollTimer);
      pollTimer = 0;
    } else {
      connect();
    }
  });
  pollTimer = window.setInterval(poll, 60_000);
}

function connect() {
  if (document.hidden || !symbolToId || socket?.readyState === WebSocket.OPEN) return;
  try {
    socket = new WebSocket("wss://data-stream.binance.vision/ws/!miniTicker@arr");
  } catch {
    socket = null;
    return;
  }
  socket.addEventListener("message", (event) => {
    let rows = [];
    try {
      rows = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!Array.isArray(rows)) return;
    const updates = [];
    for (const row of rows) {
      const id = symbolToId[row?.s];
      const price = Number(row?.c);
      if (!id || !Number.isFinite(price)) continue;
      const next = apply(id, price);
      if (next) updates.push(next);
    }
    emit(updates);
  });
  socket.addEventListener("close", () => {
    if (!document.hidden) window.setTimeout(connect, 2000);
  });
}

async function poll() {
  if (document.hidden) return;
  const ids = [...document.querySelectorAll("[data-coin]")].map((node) => node.getAttribute("data-coin")).filter(Boolean);
  const unique = [...new Set(ids)].slice(0, 50);
  if (!unique.length) return;
  try {
    const body = await api(`/api/sonar/quotes?ids=${encodeURIComponent(unique.join(","))}&vs=${encodeURIComponent(window.__sonarVs || "usd")}`);
    const updates = [];
    for (const [id, row] of Object.entries(body.quotes || {})) {
      if (row?.price == null) continue;
      const next = apply(id, row.price);
      if (next) updates.push({ ...next, ch24h: row.ch24h });
      else if (row.ch24h != null) updates.push({ id, price: row.price, prev: row.price, ch24h: row.ch24h });
    }
    emit(updates);
  } catch {
    /* el siguiente ciclo reintenta */
  }
}

export function patchNodes(updates) {
  const format = globalThis.__sonarFormatPrice;
  const formatPct = globalThis.__sonarFormatPct;
  for (const update of updates) {
    const flash = update.prev != null && update.price != null && update.price !== update.prev;
    document.querySelectorAll(`[data-coin="${cssEscape(update.id)}"] [data-k="price"]`).forEach((node) => {
      if (typeof format === "function" && update.price != null) node.textContent = format(update.price);
      if (!flash) return;
      node.classList.remove("sn-upflash", "sn-downflash");
      void node.offsetWidth;
      node.classList.add(update.price > update.prev ? "sn-upflash" : "sn-downflash");
    });
    if (update.ch24h == null) continue;
    const sign = update.ch24h < 0 ? "down" : update.ch24h > 0 ? "up" : "flat";
    document.querySelectorAll(`[data-coin="${cssEscape(update.id)}"] [data-k="ch24h"]`).forEach((node) => {
      if (typeof formatPct === "function") node.textContent = formatPct(update.ch24h);
      node.classList.toggle("sn-down", sign === "down");
      node.classList.toggle("sn-up", sign === "up");
      node.classList.toggle("sn-flat", sign === "flat");
      node.setAttribute("data-sign", sign);
    });
  }
}

function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/"/g, "");
}
