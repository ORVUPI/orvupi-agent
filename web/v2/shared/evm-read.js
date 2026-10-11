/**
 * Lectura EVM de solo lectura. La red (Base hoy, Ethereum o BNB después)
 * sale de networks.json. No hay cartera, ni firma, ni envío.
 * Cada dato queda en leído, ausente comprobado, consulta fallida o no consultado.
 */
import { networkById } from "./networks.js";

export const EVM_TIMEOUT_MS = 8_000;
export const EVM_MAX_BODY = 500_000;
export const EVM_CLIENT_LIMIT = 6;
export const EVM_CLIENT_WINDOW_MS = 60_000;
export const EVM_TEXT_MAX = 300;

const SELECTORS = Object.freeze({
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
});

const SLOT_IMPLEMENTATION = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const SLOT_BEACON = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const clientHits = [];

export function resetEvmClientLimit() {
  clientHits.length = 0;
}

export function isEvmAddress(value) {
  return typeof value === "string" && ADDRESS.test(value.trim());
}

export function normalizeEvmAddress(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!ADDRESS.test(raw)) return "";
  return raw;
}

function takeClientSlot(atMs, limit, windowMs) {
  while (clientHits.length && clientHits[0] <= atMs - windowMs) clientHits.shift();
  if (clientHits.length >= limit) return false;
  clientHits.push(atMs);
  return true;
}

function hexToBytes(hex) {
  if (typeof hex !== "string" || !hex.startsWith("0x")) return null;
  const raw = hex.slice(2);
  if (raw.length % 2 !== 0) return null;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isFinite(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function wordAt(bytes, index) {
  const start = index * 32;
  if (!bytes || start + 32 > bytes.length) return null;
  return bytes.subarray(start, start + 32);
}

function uintOf(word) {
  if (!word || word.length !== 32) return null;
  let value = 0n;
  for (const byte of word) value = (value << 8n) + BigInt(byte);
  return value;
}

function addressOf(word) {
  if (!word || word.length !== 32) return null;
  let hex = "";
  for (let i = 12; i < 32; i += 1) hex += word[i].toString(16).padStart(2, "0");
  if (/^0+$/.test(hex)) return "";
  return `0x${hex}`;
}

export function decodeAbiString(hex) {
  const bytes = hexToBytes(hex);
  if (!bytes) return null;
  if (bytes.length === 0) return "";
  if (bytes.length === 32) {
    let end = 32;
    while (end > 0 && bytes[end - 1] === 0) end -= 1;
    if (end === 0) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, end));
  }
  if (bytes.length < 64) return null;
  const offset = uintOf(wordAt(bytes, 0));
  if (offset === null || offset > BigInt(bytes.length) || offset % 32n !== 0n) return null;
  const start = Number(offset);
  const length = uintOf(wordAt(bytes, start / 32));
  if (length === null || length > BigInt(EVM_TEXT_MAX)) return null;
  const size = Number(length);
  const dataStart = start + 32;
  if (dataStart + size > bytes.length) return null;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(dataStart, dataStart + size));
}

export function decodeUint256(hex) {
  const bytes = hexToBytes(hex);
  if (!bytes || bytes.length !== 32) return null;
  const value = uintOf(bytes);
  return value === null ? null : value.toString();
}

export function decodeUint8(hex) {
  const raw = decodeUint256(hex);
  if (raw === null) return null;
  const value = BigInt(raw);
  if (value > 255n) return null;
  return Number(value);
}

export function decodeAddressResult(hex) {
  const bytes = hexToBytes(hex);
  if (!bytes || bytes.length !== 32) return null;
  return addressOf(bytes);
}

function emptyFact(status) {
  return { status };
}

function unreadFacts() {
  return {
    code: { status: "no_consultado", kind: null },
    name: { status: "no_consultado", text: null },
    symbol: { status: "no_consultado", text: null },
    decimals: { status: "no_consultado", value: null },
    totalSupply: { status: "no_consultado", raw: null },
    owner: { status: "no_consultado", address: null, reason: null },
    proxy: { status: "no_consultado", implementation: null, beacon: null },
  };
}

function isRevert(error) {
  if (!error || typeof error !== "object") return false;
  if (error.code === 3) return true;
  const message = String(error.message || "").toLowerCase();
  return message.includes("revert");
}

function failedCall(kind) {
  if (kind === "revert") return { status: "ausente" };
  return { status: "fallo" };
}

async function rpcCall(state, method, params) {
  if (method !== "eth_call" && method !== "eth_getCode" && method !== "eth_getStorageAt") {
    return { ok: false, kind: "metodo" };
  }
  const body = JSON.stringify({ jsonrpc: "2.0", id: state.id, method, params });
  state.id += 1;
  if (body.length > EVM_MAX_BODY) return { ok: false, kind: "grande" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0 && state.minIntervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.minIntervalMs));
    }
    let response;
    try {
      response = await state.transport(state.endpoint, body, state.timeoutMs, state.signal);
    } catch {
      response = { status: 0, body: "" };
    }
    const status = response && typeof response.status === "number" ? response.status : 0;
    const text = response && typeof response.body === "string" ? response.body : "";
    if (state.signal && state.signal.aborted) return { ok: false, kind: "red" };
    if (text.length > EVM_MAX_BODY) return { ok: false, kind: "grande" };
    if (status === 0 || status === 429 || status >= 500) {
      if (attempt === 0) continue;
      return { ok: false, kind: "red" };
    }
    if (status !== 200) return { ok: false, kind: "red" };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, kind: "json" };
    }
    if (parsed && parsed.error) {
      if (isRevert(parsed.error)) return { ok: false, kind: "revert" };
      if (attempt === 0) continue;
      return { ok: false, kind: "red" };
    }
    if (!parsed || typeof parsed.result !== "string" || !parsed.result.startsWith("0x")) {
      return { ok: false, kind: "json" };
    }
    return { ok: true, result: parsed.result };
  }
  return { ok: false, kind: "red" };
}

function textFact(call) {
  if (!call.ok) {
    const failed = failedCall(call.kind);
    return { status: failed.status, text: null };
  }
  if (call.result === "0x") return { status: "ausente", text: null };
  const text = decodeAbiString(call.result);
  if (text === null) return { status: "fallo", text: null };
  if (text.length > EVM_TEXT_MAX) return { status: "fallo", text: null };
  if (!text) return { status: "ausente", text: null };
  return { status: "ok", text };
}

function codeFact(call) {
  if (!call.ok) return { status: "fallo", kind: null };
  const bytes = hexToBytes(call.result);
  if (!bytes) return { status: "fallo", kind: null };
  if (bytes.length === 0) return { status: "ok", kind: "cuenta" };
  return { status: "ok", kind: "contrato" };
}

function ownerFact(call) {
  if (!call.ok) {
    if (call.kind === "revert") return { status: "ausente", address: null, reason: "revert" };
    return { status: "fallo", address: null, reason: "rpc" };
  }
  const address = decodeAddressResult(call.result);
  if (address === null) return { status: "fallo", address: null, reason: "rpc" };
  if (!address) return { status: "ausente", address: null, reason: "cero" };
  return { status: "ok", address, reason: null };
}

function proxyFact(implementation, beacon) {
  if (!implementation.ok || !beacon.ok) {
    return { status: "fallo", implementation: null, beacon: null };
  }
  const impl = decodeAddressResult(implementation.result);
  const beaconAddress = decodeAddressResult(beacon.result);
  if (impl === null || beaconAddress === null) return { status: "fallo", implementation: null, beacon: null };
  if (!impl && !beaconAddress) return { status: "ausente", implementation: null, beacon: null };
  return { status: "ok", implementation: impl || null, beacon: beaconAddress || null };
}

export function isAllowedEvmRpc(network, url) {
  return Boolean(network && typeof network.rpc === "string" && network.rpc && url === network.rpc);
}

export async function readEvmToken(input) {
  const networkId = input && input.networkId;
  const network = networkById(networkId);
  const consultedAt = input && typeof input.now === "function" ? input.now().toISOString() : new Date().toISOString();
  const address = normalizeEvmAddress(input && input.address);
  const base = {
    network: network ? network.id : String(networkId || ""),
    address,
    consultedAt,
    rpcHost: "",
    partial: true,
    facts: unreadFacts(),
  };
  if (!network || network.family !== "evm" || !network.enabled || !network.rpc) {
    return { ok: false, reason: "red", reading: base };
  }
  try {
    base.rpcHost = new URL(network.rpc).host;
  } catch {
    return { ok: false, reason: "red", reading: base };
  }
  if (!address) return { ok: false, reason: "invalid", reading: base };
  const limit = input && Number.isInteger(input.limit) ? input.limit : EVM_CLIENT_LIMIT;
  const windowMs = input && Number.isInteger(input.windowMs) ? input.windowMs : EVM_CLIENT_WINDOW_MS;
  const atMs = input && typeof input.now === "function" ? input.now().getTime() : Date.now();
  const allowed = input && typeof input.takeSlot === "function" ? input.takeSlot() : takeClientSlot(atMs, limit, windowMs);
  if (!allowed) return { ok: false, reason: "limite", reading: base };
  if (!isAllowedEvmRpc(network, network.rpc)) return { ok: false, reason: "red", reading: base };
  const state = {
    endpoint: network.rpc,
    transport: input.transport,
    timeoutMs: input.timeoutMs || EVM_TIMEOUT_MS,
    minIntervalMs: Number.isInteger(input.minIntervalMs) ? input.minIntervalMs : 200,
    signal: input.signal,
    id: 1,
  };
  if (typeof state.transport !== "function") return { ok: false, reason: "red", reading: base };
  const to = address;
  const call = (data) => rpcCall(state, "eth_call", [{ to, data }, "latest"]);
  const pause = async () => {
    if (state.minIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, state.minIntervalMs));
  };
  const code = await rpcCall(state, "eth_getCode", [to, "latest"]);
  await pause();
  const name = await call(SELECTORS.name);
  await pause();
  const symbol = await call(SELECTORS.symbol);
  await pause();
  const decimals = await call(SELECTORS.decimals);
  await pause();
  const totalSupply = await call(SELECTORS.totalSupply);
  await pause();
  const owner = await call(SELECTORS.owner);
  await pause();
  const implementation = await rpcCall(state, "eth_getStorageAt", [to, SLOT_IMPLEMENTATION, "latest"]);
  await pause();
  const beacon = await rpcCall(state, "eth_getStorageAt", [to, SLOT_BEACON, "latest"]);
  const decimalsValue = decimals.ok ? decodeUint8(decimals.result) : null;
  const supplyRaw = totalSupply.ok ? decodeUint256(totalSupply.result) : null;
  const facts = {
    code: codeFact(code),
    name: textFact(name),
    symbol: textFact(symbol),
    decimals: !decimals.ok
      ? { status: failedCall(decimals.kind).status, value: null }
      : decimals.result === "0x"
        ? { status: "ausente", value: null }
        : decimalsValue === null
          ? { status: "fallo", value: null }
          : { status: "ok", value: decimalsValue },
    totalSupply: !totalSupply.ok
      ? { status: failedCall(totalSupply.kind).status, raw: null }
      : totalSupply.result === "0x"
        ? { status: "ausente", raw: null }
        : supplyRaw === null
          ? { status: "fallo", raw: null }
          : { status: "ok", raw: supplyRaw },
    owner: ownerFact(owner),
    proxy: proxyFact(implementation, beacon),
  };
  const partial = Object.values(facts).some((fact) => fact.status === "fallo");
  return {
    ok: true,
    reason: "leido",
    reading: { ...base, partial, facts },
  };
}

export function absentFact() {
  return emptyFact("ausente");
}
