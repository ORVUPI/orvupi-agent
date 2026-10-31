/**
 * Reglas puras de Verify: direcciones, paginación, grafo y grupos de búsqueda.
 * No llama a la red y no rellena cifras.
 */
import catalog from "./chains.json" with { type: "json" };

export const CATALOG = catalog;
export const LIMITS = Object.freeze({ ...catalog.limits });
export const CHAINS = catalog.chains;
export const UNSUPPORTED = catalog.unsupported;

const EVM = /^0x[0-9a-fA-F]{40}$/;
const BTC = /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/;
const TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const SEARCH_GROUPS = Object.freeze([
  "best",
  "entities",
  "tokens",
  "pools",
  "addresses",
  "polymarket",
  "predictions",
  "twitter",
]);

const UNSUPPORTED_GROUPS = new Set(["polymarket", "predictions", "twitter"]);

export function chainById(id) {
  return CHAINS.find((chain) => chain.id === id) ?? null;
}

export function supportedIds() {
  return CHAINS.map((chain) => chain.id);
}

export function identify(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return { kind: "empty", address: "", chainId: "" };
  if (EVM.test(value)) return { kind: "evm", address: value, chainId: "" };
  if (BTC.test(value)) return { kind: "bitcoin", address: value, chainId: "bitcoin" };
  if (TRON.test(value)) return { kind: "tron", address: value, chainId: "tron" };
  if (SOL.test(value)) return { kind: "solana", address: value, chainId: "solana" };
  return { kind: "unknown", address: value, chainId: "" };
}

export function pager(total, page, size = LIMITS.pageSize) {
  const count = Math.max(0, Number(total) || 0);
  const pages = count === 0 ? 0 : Math.ceil(count / size);
  const current = pages === 0 ? 0 : Math.min(Math.max(1, page || 1), pages);
  const start = pages === 0 ? 0 : (current - 1) * size;
  return {
    page: current,
    pages,
    start,
    end: pages === 0 ? 0 : Math.min(count, start + size),
    label: pages === 0 ? "— / —" : `${current} / ${pages}`,
    showing: pages === 0 ? "" : `${start + 1}-${Math.min(count, start + size)}`,
  };
}

export function slicePage(rows, page, size = LIMITS.pageSize) {
  const list = Array.isArray(rows) ? rows : [];
  const window = pager(list.length, page, size);
  return { ...window, rows: list.slice(window.start, window.end), total: list.length };
}

export function formatUnits(raw, decimals) {
  if (raw === null || raw === undefined || raw === "") return null;
  let value;
  try {
    value = BigInt(raw);
  } catch {
    return null;
  }
  const places = Number(decimals);
  if (!Number.isInteger(places) || places < 0 || places > 30) return value.toString();
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(places);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(places, "0").replace(/0+$/, "");
  const text = frac ? `${whole.toString()}.${frac}` : whole.toString();
  return negative ? `-${text}` : text;
}

export function sortRows(rows, key, dir = "asc") {
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a?.[key];
    const right = b?.[key];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor;
  });
}

export function filterTransfers(rows, options = {}) {
  const query = String(options.query ?? "").trim().toLowerCase();
  const direction = options.direction || "all";
  const focus = options.focus || "";
  const chains = options.chains instanceof Set ? options.chains : null;
  const minUsd = options.minUsd == null || options.minUsd === "" ? null : Number(options.minUsd);
  return (rows || []).filter((row) => {
    if (chains && row.chain && !chains.has(row.chain)) return false;
    if (direction === "in" && focus && row.to !== focus) return false;
    if (direction === "out" && focus && row.from !== focus) return false;
    if (direction === "self" && focus && !(row.from === focus && row.to === focus)) return false;
    if (minUsd != null) {
      if (row.usd == null || Number.isNaN(Number(row.usd)) || Number(row.usd) < minUsd) return false;
    }
    if (!query) return true;
    const haystack = [row.from, row.to, row.token, row.signature, row.id].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

/**
 * Grafo propio a partir de transferencias ya descargadas.
 * Una arista no implica mismo dueño. La profundidad 1 son las contrapartes
 * directas; la 2 solo existe si la fila ya trae ese salto.
 */
export function buildGraph(transfers, options = {}) {
  const seed = options.seed || "";
  const maxNodes = options.maxNodes ?? LIMITS.maxNodes;
  const depth = Math.min(options.depth ?? 1, LIMITS.maxDepth);
  const edges = [];
  const seen = new Set();
  for (const row of transfers || []) {
    if (!row || !row.from || !row.to) continue;
    const id = row.id || `${row.from}->${row.to}`;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({
      id,
      from: row.from,
      to: row.to,
      token: row.token || "",
      value: row.value ?? null,
      signature: row.signature || "",
      chain: row.chain || "",
    });
  }
  const ranked = [];
  const push = (address, level) => {
    if (!address || ranked.some((node) => node.id === address)) return;
    if (ranked.length >= maxNodes) return;
    ranked.push({ id: address, level, seed: address === seed });
  };
  if (seed) push(seed, 0);
  const pass = (level) => {
    const known = new Set(ranked.map((node) => node.id));
    for (const edge of edges) {
      if (known.has(edge.from)) push(edge.to, level);
      if (known.has(edge.to)) push(edge.from, level);
    }
  };
  if (!seed) {
    for (const edge of edges) {
      push(edge.from, 1);
      push(edge.to, 1);
    }
  } else {
    for (let level = 1; level <= depth; level += 1) pass(level);
  }
  const ids = new Set(ranked.map((node) => node.id));
  const visible = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  return {
    nodes: ranked,
    edges: visible,
    truncated: edges.length > visible.length || ranked.length >= maxNodes,
    maxNodes,
    depth,
  };
}

export function groupSearch(query, context = {}) {
  const text = String(query ?? "").trim();
  const id = identify(text);
  const recent = (context.recent || []).filter((item) => !text || String(item.label || item.address || "").toLowerCase().includes(text.toLowerCase()));
  const pools = (context.pools || []).filter((pool) => {
    if (!text) return false;
    const blob = `${pool.name || ""} ${pool.address || ""} ${pool.network || ""}`.toLowerCase();
    return blob.includes(text.toLowerCase());
  });
  const official = context.official && text && context.official.address === id.address ? [context.official] : [];
  const groups = SEARCH_GROUPS.map((key) => {
    if (UNSUPPORTED_GROUPS.has(key)) {
      return { id: key, status: "no-soportado", items: [] };
    }
    if (!text && key === "best") return { id: key, status: "sin-datos", items: recent.slice(0, 6) };
    if (key === "addresses" && (id.kind === "evm" || id.kind === "solana" || id.kind === "bitcoin" || id.kind === "tron")) {
      return { id: key, status: "comprobado", items: [{ kind: id.kind, address: id.address, chainId: id.chainId }] };
    }
    if (key === "best" && id.kind !== "empty" && id.kind !== "unknown") {
      return { id: key, status: "comprobado", items: [{ kind: id.kind, address: id.address, chainId: id.chainId }] };
    }
    if (key === "entities") {
      return { id: key, status: official.length ? "comprobado" : "sin-datos", items: official };
    }
    if (key === "tokens" || key === "pools") {
      return { id: key, status: pools.length ? "comprobado" : "sin-datos", items: key === "pools" ? pools.slice(0, 6) : pools.slice(0, 6) };
    }
    return { id: key, status: "sin-datos", items: [] };
  });
  return { query: text, identify: id, groups };
}

export function explorerHref(chainId, address) {
  const chain = chainById(chainId);
  if (!chain || !address) return "";
  return chain.explorer.replace("{address}", address);
}

export function storageKeys() {
  return Object.freeze({
    recent: "orvupi.verify.recent.v1",
    traces: "orvupi.verify.traces.v1",
    views: "orvupi.verify.views.v1",
    alerts: "orvupi.verify.alerts.v1",
    labels: "orvupi.verify.labels.v1",
    panels: "orvupi.verify.panels.v1",
  });
}
