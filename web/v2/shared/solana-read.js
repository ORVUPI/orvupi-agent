/**
 * Lector de solo lectura para cualquier mint de Solana.
 * Métodos en lista cerrada. No firma, no envía y no sigue URLs de metadatos.
 */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i += 1) INDEX[ALPHABET.charCodeAt(i)] = i;

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
// Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU (ver /shared/orvupi-contract.json).
export { OFFICIAL_ADDRESS as OFFICIAL_MINT } from "./orvupi-contract.js";
import { isOfficialAddress } from "./orvupi-contract.js";
// Solo compatibilidad: fichas guardadas antes del 16-10-2026 llevan officialProject = true con esta dirección.
export const LEGACY_FLAG_MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
export const DEFAULT_RPC = ["https://api.", "mainnet-beta", ".solana.com"].join("");
export const PUBLICNODE_RPC = "https://solana-rpc.publicnode.com";
// Mismos dos orígenes y el mismo orden que verify/policy/limits.json (default, luego fallback).
export const ALLOWED_RPCS = Object.freeze([PUBLICNODE_RPC, DEFAULT_RPC]);
export const ALLOWED_METHODS = Object.freeze([
  "getAccountInfo",
  "getMultipleAccounts",
  "getTokenSupply",
  "getTokenLargestAccounts",
  "getSlot",
]);
export const CARD_SCHEMA = "orvupi.notebook.card";
export const CARD_VERSION = 2;
export const DISCLAIMER = Object.freeze({
  es: "No es una auditoría ni una recomendación. Muestra datos públicos de la cadena en el momento indicado; no dice si un token es bueno, seguro o una buena compra.",
  en: "It is not an audit or a recommendation. It shows public chain data at the time stated; it does not say whether a token is good, safe, or a good purchase.",
});

const PUMP_DISCRIMINATOR = Uint8Array.from([23, 183, 248, 55, 96, 216, 172, 96]);
const MINT_BASE_LEN = 82;
const ACCOUNT_BASE_LEN = 165;
const P = (1n << 255n) - 19n;
const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");
const EXTENSION_NAMES = {
  1: "TransferFeeConfig",
  3: "MintCloseAuthority",
  6: "DefaultAccountState",
  9: "NonTransferable",
  12: "PermanentDelegate",
  14: "TransferHook",
  18: "MetadataPointer",
  19: "TokenMetadata",
};

export function decodeBase58(source) {
  if (typeof source !== "string" || source.length === 0) return null;
  let zeroes = 0;
  let i = 0;
  while (i < source.length && source[i] === "1") {
    zeroes += 1;
    i += 1;
  }
  const size = Math.ceil((source.length * Math.log(58)) / Math.log(256)) + 1;
  const b256 = new Uint8Array(size);
  for (; i < source.length; i += 1) {
    const ch = source.charCodeAt(i);
    const value = ch < 128 ? INDEX[ch] : -1;
    if (value === undefined || value < 0) return null;
    let carry = value;
    for (let j = size - 1; j >= 0; j -= 1) {
      carry += 58 * (b256[j] ?? 0);
      b256[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    if (carry !== 0) return null;
  }
  let start = 0;
  while (start < b256.length && b256[start] === 0) start += 1;
  const out = new Uint8Array(zeroes + (b256.length - start));
  out.set(b256.subarray(start), zeroes);
  return out;
}

export function encodeBase58(bytes) {
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes += 1;
  const size = Math.ceil((bytes.length * Math.log(256)) / Math.log(58)) + 1;
  const b58 = new Uint8Array(size);
  for (let i = zeroes; i < bytes.length; i += 1) {
    let carry = bytes[i] ?? 0;
    for (let j = size - 1; j >= 0; j -= 1) {
      carry += 256 * (b58[j] ?? 0);
      b58[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
  }
  let start = 0;
  while (start < b58.length && b58[start] === 0) start += 1;
  let out = "1".repeat(zeroes);
  for (let i = start; i < b58.length; i += 1) out += ALPHABET[b58[i] ?? 0] ?? "";
  return out;
}

export function isMintAddress(value) {
  if (typeof value !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  const bytes = decodeBase58(value);
  return Boolean(bytes && bytes.length === 32);
}

export function isAllowedRpcUrl(value) {
  if (typeof value !== "string" || value.length > 200) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return false;
  if (url.pathname !== "/" && url.pathname !== "") return false;
  return ALLOWED_RPCS.some((item) => {
    const allowed = new URL(item);
    return url.origin === allowed.origin;
  });
}

function mod(a) {
  const r = a % P;
  return r >= 0n ? r : r + P;
}

function modPow(base, exp) {
  let result = 1n;
  let b = mod(base);
  let e = exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = mod(result * b);
    b = mod(b * b);
    e >>= 1n;
  }
  return result;
}

const D = mod(-121665n * modPow(121666n, P - 2n));

export function isOnCurve(bytes) {
  if (bytes.length !== 32) return false;
  let y = 0n;
  for (let i = 0; i < 32; i += 1) y |= BigInt(bytes[i] ?? 0) << (8n * BigInt(i));
  y &= (1n << 255n) - 1n;
  if (y >= P) return false;
  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(D * y2 + 1n);
  if (v === 0n) return false;
  const x2 = mod(u * modPow(v, P - 2n));
  if (x2 === 0n) return true;
  return modPow(x2, (P - 1n) / 2n) === 1n;
}

async function sha256(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const all = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", all);
  return new Uint8Array(digest);
}

export async function findProgramAddress(seeds, programId) {
  if (programId.length !== 32) throw new Error("El programa tiene que ser de 32 bytes.");
  for (let bump = 255; bump >= 0; bump -= 1) {
    const address = await sha256([...seeds, Uint8Array.of(bump), programId, PDA_MARKER]);
    if (!isOnCurve(address)) return { address, bump };
  }
  throw new Error("No hay una PDA fuera de la curva.");
}

async function pda(seeds, program) {
  const programBytes = decodeBase58(program);
  if (!programBytes || programBytes.length !== 32) throw new Error("Programa no decodifica.");
  const { address } = await findProgramAddress(seeds, programBytes);
  return encodeBase58(address);
}

export async function metadataPda(mint) {
  const mintBytes = decodeBase58(mint);
  const programBytes = decodeBase58(METADATA_PROGRAM);
  if (!mintBytes || !programBytes) throw new Error("Mint no decodifica.");
  return pda([new TextEncoder().encode("metadata"), programBytes, mintBytes], METADATA_PROGRAM);
}

export async function bondingCurvePda(mint) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes) throw new Error("Mint no decodifica.");
  return pda([new TextEncoder().encode("bonding-curve"), mintBytes], PUMP_PROGRAM);
}

function readU16(data, offset) {
  if (offset < 0 || offset + 2 > data.length) return null;
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

function readU32(data, offset) {
  if (offset < 0 || offset + 4 > data.length) return null;
  return (
    ((data[offset] ?? 0) |
      ((data[offset + 1] ?? 0) << 8) |
      ((data[offset + 2] ?? 0) << 16) |
      ((data[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function readU64(data, offset) {
  if (offset < 0 || offset + 8 > data.length) return null;
  let n = 0n;
  for (let i = 0; i < 8; i += 1) n |= BigInt(data[offset + i] ?? 0) << (8n * BigInt(i));
  return n;
}

function cleanText(bytes) {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, end))
    .replace(/\u0000/g, "")
    .replace(/\p{Cf}/gu, "")
    .replaceAll("<", "‹")
    .replaceAll(">", "›")
    .trim();
  return text.length > 200 ? text.slice(0, 200) : text;
}

function readBorshString(data, offset) {
  const length = readU32(data, offset);
  if (length === null || offset + 4 + length > data.length || length > 500) return null;
  return { text: cleanText(data.subarray(offset + 4, offset + 4 + length)), next: offset + 4 + length };
}

function readCOption(data, offset) {
  const tag = readU32(data, offset);
  if (tag === null || offset + 36 > data.length) return null;
  const pubkey = data.subarray(offset + 4, offset + 36);
  if (tag === 0) return { state: "revocada", address: null };
  if (tag === 1) return { state: "activa", address: encodeBase58(pubkey) };
  return { state: "no_decodificable", address: null };
}

function pubkeyOrNull(bytes) {
  if (bytes.length !== 32 || bytes.every((byte) => byte === 0)) return null;
  return encodeBase58(bytes);
}

function readTokenMetadataExtension(value) {
  if (value.length < 64) return null;
  const updateAuthority = pubkeyOrNull(value.subarray(0, 32));
  let offset = 64;
  const name = readBorshString(value, offset);
  if (!name) return null;
  offset = name.next;
  const symbol = readBorshString(value, offset);
  if (!symbol) return null;
  offset = symbol.next;
  const uri = readBorshString(value, offset);
  if (!uri) return null;
  offset = uri.next;
  if (offset < value.length) {
    const count = readU32(value, offset);
    offset += 4;
    if (count === null || count > 32) return null;
    for (let i = 0; i < count; i += 1) {
      const key = readBorshString(value, offset);
      if (!key) return null;
      offset = key.next;
      const extra = readBorshString(value, offset);
      if (!extra) return null;
      offset = extra.next;
    }
  }
  return {
    updateAuthority,
    name: name.text,
    symbol: symbol.text,
    uri: uri.text,
    mutable: updateAuthority ? "si" : "no",
  };
}

function emptyExtensions(status) {
  return { status, items: [], tokenMetadata: null, metadataPointer: null };
}

function parseExtensions(data) {
  if (data.length === MINT_BASE_LEN) return emptyExtensions("no_aplica");
  if (data.length <= ACCOUNT_BASE_LEN || data[ACCOUNT_BASE_LEN] !== 1) {
    return emptyExtensions("no_disponible");
  }
  for (let i = MINT_BASE_LEN; i < ACCOUNT_BASE_LEN; i += 1) {
    if (data[i] !== 0) return emptyExtensions("no_disponible");
  }
  const items = [];
  let tokenMetadata = null;
  let metadataPointer = null;
  let offset = 0;
  const tlv = data.subarray(ACCOUNT_BASE_LEN + 1);
  while (offset < tlv.length) {
    if (tlv[offset] === 0 && tlv.subarray(offset).every((byte) => byte === 0)) break;
    const type = readU16(tlv, offset);
    const length = readU16(tlv, offset + 2);
    if (type === null || length === null || offset + 4 + length > tlv.length) {
      return { status: "no_disponible", items, tokenMetadata: null, metadataPointer: null };
    }
    if (type === 0) break;
    const raw = tlv.subarray(offset + 4, offset + 4 + length);
    if (type === 19) tokenMetadata = readTokenMetadataExtension(raw);
    if (type === 18 && length === 64) metadataPointer = pubkeyOrNull(raw.subarray(32, 64));
    const known = Object.hasOwn(EXTENSION_NAMES, type);
    items.push({
      type,
      name: known ? EXTENSION_NAMES[type] : `tipo ${type}`,
      status: known ? "verificado" : "no_soportada",
    });
    offset += 4 + length;
    if (items.length > 40) return { status: "no_disponible", items, tokenMetadata: null, metadataPointer: null };
  }
  return { status: "verificado", items, tokenMetadata, metadataPointer };
}

export function decodeMintAccount(owner, data) {
  if (owner !== TOKEN_PROGRAM && owner !== TOKEN_2022_PROGRAM) return null;
  if (data.length < MINT_BASE_LEN) return null;
  const mintAuthority = readCOption(data, 0);
  const supplyRaw = readU64(data, 36);
  const decimals = data[44];
  const initialized = data[45] === 1;
  const freezeAuthority = readCOption(data, 46);
  if (!mintAuthority || supplyRaw === null || decimals === undefined || !freezeAuthority || !initialized) return null;
  const standard = owner === TOKEN_2022_PROGRAM ? "token-2022" : "spl-token";
  const extensions = standard === "token-2022" ? parseExtensions(data) : { status: "no_aplica", items: [] };
  return {
    standard,
    supplyRaw: supplyRaw.toString(),
    decimals,
    mintAuthority,
    freezeAuthority,
    extensions,
  };
}

export function decodeMetadataAccount(data) {
  if (data.length < 1 + 32 + 32 + 4) return null;
  if (data[0] !== 4) return null;
  const name = readBorshString(data, 65);
  if (!name) return null;
  const symbol = readBorshString(data, name.next);
  if (!symbol) return null;
  const uri = readBorshString(data, symbol.next);
  if (!uri) return null;
  let cursor = uri.next + 2;
  if (cursor >= data.length) return { name: name.text, symbol: symbol.text, uri: uri.text, mutable: null };
  const hasCreators = data[cursor];
  cursor += 1;
  if (hasCreators === 1) {
    const count = readU32(data, cursor);
    if (count === null) return { name: name.text, symbol: symbol.text, uri: uri.text, mutable: null };
    cursor += 4 + count * 34;
  }
  cursor += 1;
  if (cursor >= data.length) return { name: name.text, symbol: symbol.text, uri: uri.text, mutable: null };
  const flag = data[cursor];
  const mutable = flag === 1 ? "si" : flag === 0 ? "no" : null;
  return { name: name.text, symbol: symbol.text, uri: uri.text, mutable };
}

export function decodeCurveAccount(owner, data) {
  if (owner !== PUMP_PROGRAM) return { present: false, status: "verificado" };
  if (data.length < 49) return { present: null, status: "no_soportada" };
  for (let i = 0; i < PUMP_DISCRIMINATOR.length; i += 1) {
    if (data[i] !== PUMP_DISCRIMINATOR[i]) return { present: null, status: "no_soportada" };
  }
  const virtualToken = readU64(data, 8);
  const virtualQuote = readU64(data, 16);
  const realToken = readU64(data, 24);
  const realQuote = readU64(data, 32);
  const completeByte = data[48];
  if (
    virtualToken === null ||
    virtualQuote === null ||
    realToken === null ||
    realQuote === null ||
    (completeByte !== 0 && completeByte !== 1)
  ) {
    return { present: null, status: "no_disponible" };
  }
  return {
    present: true,
    status: "verificado",
    virtualToken: virtualToken.toString(),
    virtualQuote: virtualQuote.toString(),
    realToken: realToken.toString(),
    realQuote: realQuote.toString(),
    complete: completeByte === 1,
  };
}

function fromBase64(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function parseAccount(value) {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("Cuenta ilegible.");
  const data = value.data;
  if (!Array.isArray(data) || typeof data[0] !== "string" || data[1] !== "base64") {
    throw new Error("La cuenta no vino en base64.");
  }
  if (data[0].length > 2_000_000) throw new Error("La cuenta es demasiado grande.");
  return {
    owner: typeof value.owner === "string" ? value.owner : "",
    data: fromBase64(data[0]),
  };
}

function curveAbsent(mint) {
  return { ...emptyCurve(), present: false, status: String(mint).endsWith("pump") ? "ausente" : "no_aplica" };
}

function emptyCurve() {
  return {
    present: null,
    status: "no_consultado",
    virtualToken: null,
    virtualQuote: null,
    realToken: null,
    realQuote: null,
    complete: null,
  };
}

function textFact(text) {
  const cleaned = typeof text === "string" ? text.replace(/\u0000/g, "").replace(/\uFFFD/g, "").replace(/\p{Cf}/gu, "").trim() : "";
  if (!cleaned) return { text: null, status: "ausente" };
  return { text: cleaned, status: "verificado" };
}

function unavailableAuthority() {
  return { state: "no_disponible", address: null, status: "no_disponible" };
}

export function blankCard(mint, consultedAt, errors) {
  return {
    schema: CARD_SCHEMA,
    schemaVersion: CARD_VERSION,
    rulesVersion: "0.1.0",
    network: "solana",
    mint,
    consultedAt,
    slot: null,
    slotStatus: "no_disponible",
    partial: true,
    errors,
    isMint: false,
    program: "no_disponible",
    programStatus: "no_disponible",
    decimals: null,
    supplyAccount: null,
    supplyRpc: null,
    supplyRpcStatus: "no_disponible",
    mintAuthority: unavailableAuthority(),
    freezeAuthority: unavailableAuthority(),
    name: { text: null, status: "no_disponible" },
    symbol: { text: null, status: "no_disponible" },
    uri: { text: null, status: "no_disponible" },
    metadataMutable: "no_disponible",
    extensions: [],
    extensionsStatus: "no_disponible",
    curve: emptyCurve(),
    largestStatus: "no_consultado",
    officialProject: isOfficialAddress(mint),
    disclaimer: DISCLAIMER,
  };
}

function authorityField(value) {
  if (!value || (value.state !== "revocada" && value.state !== "activa")) {
    return {
      state: value && value.state === "no_decodificable" ? "no_decodificable" : "no_disponible",
      address: null,
      status: "fallo",
    };
  }
  return { state: value.state, address: value.address, status: "verificado" };
}

const SHOWN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function textFromShown(text, status) {
  if (status === "verificado" && typeof text === "string" && text.length > 0 && text.length <= 300) {
    return { text, status: "verificado" };
  }
  if (status === "ausente") return { text: null, status: "ausente" };
  if (status === "no_aplica") return { text: null, status: "no_aplica" };
  return { text: null, status: "fallo" };
}

function curveFromShown(value) {
  const empty = emptyCurve();
  if (!value || typeof value !== "object") return { ...empty, present: null, status: "fallo" };
  const status = ["verificado", "ausente", "fallo", "no_aplica", "no_disponible"].includes(value.status) ? value.status : "fallo";
  const amountOrNull = (item) => (typeof item === "string" && /^\d+$/.test(item) ? item : null);
  return {
    present: value.present === true || value.present === false ? value.present : null,
    status,
    virtualToken: amountOrNull(value.virtualToken),
    virtualQuote: amountOrNull(value.virtualQuote),
    realToken: amountOrNull(value.realToken),
    realQuote: amountOrNull(value.realQuote),
    complete: value.complete === true || value.complete === false ? value.complete : null,
  };
}

function notMintCard(card) {
  card.program = "no_es_mint";
  card.programStatus = "verificado";
  card.partial = false;
  card.isMint = false;
  card.name.status = "no_aplica";
  card.symbol.status = "no_aplica";
  card.uri.status = "no_aplica";
  card.metadataMutable = "no_aplica";
  card.extensionsStatus = "no_aplica";
  card.supplyRpcStatus = "no_aplica";
  card.largestStatus = "no_aplica";
  card.mintAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
  card.freezeAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
  card.curve = { ...emptyCurve(), present: false, status: "no_aplica" };
  return card;
}

/** Ficha del cuaderno a partir de la lectura ya pintada. No consulta la red. */
export function cardFromShown(shown) {
  if (!shown || typeof shown !== "object" || !isMintAddress(shown.mint)) return null;
  if (!["ausente", "no_mint", "ilegible", "mint"].includes(shown.kind)) return null;
  if (typeof shown.consultedAt !== "string" || !SHOWN_ISO.test(shown.consultedAt)) return null;
  const card = blankCard(shown.mint, shown.consultedAt, []);
  if (Number.isSafeInteger(shown.slot) && shown.slot >= 0) {
    card.slot = shown.slot;
    card.slotStatus = "verificado";
  }
  if (shown.kind === "ausente" || shown.kind === "no_mint") return notMintCard(card);
  if (shown.kind === "ilegible") {
    card.program = shown.program === "token-2022" ? "token-2022" : "spl-token";
    card.programStatus = "verificado";
    card.isMint = false;
    card.partial = true;
    card.mintAuthority = { state: "no_decodificable", address: null, status: "fallo" };
    card.freezeAuthority = { state: "no_decodificable", address: null, status: "fallo" };
    card.name = { text: null, status: "fallo" };
    card.symbol = { text: null, status: "fallo" };
    card.uri = { text: null, status: "fallo" };
    card.metadataMutable = "fallo";
    card.extensionsStatus = "fallo";
    card.supplyRpcStatus = "fallo";
    card.largestStatus = "fallo";
    card.curve = { ...emptyCurve(), present: null, status: "fallo" };
    return card;
  }
  if (shown.program !== "spl-token" && shown.program !== "token-2022") return null;
  if (!Number.isInteger(shown.decimals) || shown.decimals < 0 || shown.decimals > 18) return null;
  if (typeof shown.supplyAccount !== "string" || !/^\d+$/.test(shown.supplyAccount)) return null;
  card.isMint = true;
  card.program = shown.program;
  card.programStatus = "verificado";
  card.decimals = shown.decimals;
  card.supplyAccount = shown.supplyAccount;
  card.mintAuthority = authorityField(shown.mintAuthority);
  card.freezeAuthority = authorityField(shown.freezeAuthority);
  card.name = textFromShown(shown.name, shown.metadataStatus);
  card.symbol = textFromShown(shown.symbol, shown.metadataStatus);
  card.uri = textFromShown(shown.uri, shown.uriStatus || shown.metadataStatus);
  card.metadataMutable = ["si", "no", "ausente", "fallo"].includes(shown.metadataMutable) ? shown.metadataMutable : "fallo";
  const extensionStatus = ["verificado", "no_aplica", "fallo", "no_disponible"].includes(shown.extensionsStatus)
    ? shown.extensionsStatus
    : "fallo";
  card.extensionsStatus = extensionStatus;
  card.extensions = Array.isArray(shown.extensions)
    ? shown.extensions.filter((item) => item && Number.isInteger(item.type) && typeof item.name === "string" && (item.status === "verificado" || item.status === "no_soportada")).slice(0, 40)
    : [];
  card.supplyRpc = typeof shown.supplyRpc === "string" && /^\d+$/.test(shown.supplyRpc) ? shown.supplyRpc : null;
  card.supplyRpcStatus = card.supplyRpc === null ? "fallo" : shown.supplyRpcStatus === "verificado" ? "verificado" : "fallo";
  card.largestStatus = ["ok", "verificado", "ausente", "fallo", "no_consultado", "no_disponible"].includes(shown.largestStatus)
    ? shown.largestStatus
    : "fallo";
  card.curve = curveFromShown(shown.curve);
  card.partial = card.mintAuthority.status === "fallo"
    || card.freezeAuthority.status === "fallo"
    || card.supplyRpcStatus === "fallo"
    || card.largestStatus === "fallo"
    || card.extensionsStatus === "fallo"
    || card.name.status === "fallo"
    || card.curve.status === "fallo";
  return card;
}

function endpointsFor(preferred) {
  let origin = "";
  try {
    origin = new URL(preferred).origin;
  } catch {
    origin = "";
  }
  const first = ALLOWED_RPCS.find((item) => new URL(item).origin === origin);
  if (!first) return [...ALLOWED_RPCS];
  return [first, ...ALLOWED_RPCS.filter((item) => item !== first)];
}

const RPC_BLOCK_MS = 10 * 60 * 1000;
const blockedRpcMethods = new Map();

export function blockedRpcKey(endpoint, method) {
  try {
    return `${new URL(endpoint).origin} ${method}`;
  } catch {
    return `${endpoint} ${method}`;
  }
}

export function rememberBlockedMethod(endpoint, method, nowMs = Date.now()) {
  blockedRpcMethods.set(blockedRpcKey(endpoint, method), nowMs + RPC_BLOCK_MS);
}

export function isMethodBlocked(endpoint, method, nowMs = Date.now()) {
  const key = blockedRpcKey(endpoint, method);
  const until = blockedRpcMethods.get(key);
  if (until === undefined) return false;
  if (nowMs >= until) {
    blockedRpcMethods.delete(key);
    return false;
  }
  return true;
}

export function clearBlockedMethods() {
  blockedRpcMethods.clear();
}

function retryableRpcFailure(result) {
  // Una lista que no trae las cuentas pedidas es fallo del nodo, no una ausencia.
  if (result?.error === "No se pudo comprobar") return true;
  const status = result?.httpStatus ?? null;
  if (status === 0 || status === 403 || status === 429 || status === 408 || (status !== null && status >= 500)) return true;
  return /429|403|too many|rate limit|timeout|timed out|tiempo de espera|failed to fetch|\bHTTP 0\b|error de red|network|fetch failed|ECONN|ENET|ENOTFOUND|socket|access forbidden|aborted|personal token|indexed request|request blocked/i.test(
    result?.error ?? "",
  );
}

const MAINNET_ONLY_METHODS = new Set(["getTokenSupply", "getTokenLargestAccounts"]);

function blockedResult(state, method) {
  return {
    ok: false,
    method,
    error: "HTTP 403",
    httpStatus: 403,
    fetchedAt: state.now().toISOString(),
  };
}

async function rpcCall(state, method, params) {
  // publicnode cierra getTokenSupply y las cuentas grandes con 403. No se pide ahí.
  // Un 403 de un nodo se recuerda 10 minutos: ese método no vuelve a pedirse ahí.
  const nowMs = state.now().getTime();
  const candidates = MAINNET_ONLY_METHODS.has(method)
    ? [DEFAULT_RPC]
    : (state.endpoints?.length ? state.endpoints : [state.endpoint]);
  const endpoints = candidates.filter((endpoint) => !isMethodBlocked(endpoint, method, nowMs));
  if (!endpoints.length) return blockedResult(state, method);
  let last = null;
  for (const endpoint of endpoints) {
    state.endpoint = endpoint;
    last = await rpcCallOnce(state, method, params);
    if (last && last.httpStatus === 403) rememberBlockedMethod(endpoint, method, nowMs);
    if (!last || last.ok || !retryableRpcFailure(last)) return last;
  }
  return last;
}

function aborted(state) {
  return Boolean(state.signal && state.signal.aborted);
}

async function pause(state, ms) {
  if (aborted(state)) return false;
  if (ms > 0) {
    if (!state.signal) {
      await state.sleep(ms);
    } else {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        state.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  }
  return !aborted(state);
}

async function rpcCallOnce(state, method, params) {
  if (!ALLOWED_METHODS.includes(method)) {
    return { ok: false, method, error: "Método RPC no permitido.", httpStatus: null, fetchedAt: state.now().toISOString() };
  }
  let lastError = "sin respuesta";
  let lastStatus = null;
  for (let attempt = 0; attempt <= state.maxRetries; attempt += 1) {
    const wait = state.nextAt - state.mono();
    if (!(await pause(state, wait > 0 ? wait : 0))) {
      const error = new Error("abortado");
      error.name = "AbortError";
      throw error;
    }
    state.nextAt = state.mono() + state.minIntervalMs;
    const fetchedAt = state.now().toISOString();
    try {
      const body = JSON.stringify({ jsonrpc: "2.0", id: state.id, method, params });
      state.id += 1;
      const response = await state.transport(state.endpoint, body, state.timeoutMs, state.signal);
      lastStatus = response.status;
      if ((response.status === 0 || response.status === 408 || response.status === 429 || response.status >= 500) && attempt < state.maxRetries) {
        lastError = `HTTP ${response.status}`;
        if (!(await pause(state, 300 * (attempt + 1)))) {
          const error = new Error("abortado");
          error.name = "AbortError";
          throw error;
        }
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        return { ok: false, method, error: `HTTP ${response.status}`, httpStatus: response.status, fetchedAt };
      }
      const parsed = JSON.parse(response.body);
      if (parsed.error) {
        const message = typeof parsed.error.message === "string" ? parsed.error.message.slice(0, 300) : "error de lectura";
        return { ok: false, method, error: message, httpStatus: response.status, fetchedAt };
      }
      if (method === "getMultipleAccounts") {
        const asked = Array.isArray(params[0]) ? params[0].length : null;
        const list = parsed.result && typeof parsed.result === "object" ? parsed.result.value : undefined;
        if (asked === null || !Array.isArray(list) || list.length !== asked) {
          lastError = "No se pudo comprobar";
          lastStatus = response.status;
          if (attempt < state.maxRetries) {
            if (!(await pause(state, 300 * (attempt + 1)))) {
              const error = new Error("abortado");
              error.name = "AbortError";
              throw error;
            }
            continue;
          }
          return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt };
        }
      }
      const slot = parsed.result && parsed.result.context && Number.isInteger(parsed.result.context.slot)
        ? parsed.result.context.slot
        : null;
      return { ok: true, method, value: parsed.result, slot, fetchedAt };
    } catch (error) {
      if (aborted(state) || (error && error.name === "AbortError")) throw error;
      const name = error && typeof error === "object" ? error.name : "";
      const message = error instanceof Error ? error.message.slice(0, 300) : "error de red";
      if (name === "AbortError" || /timeout|timed out|aborted/i.test(message)) {
        lastError = "timeout";
        lastStatus = 408;
      } else {
        lastError = message;
      }
      if (attempt < state.maxRetries) {
        if (!(await pause(state, 300 * (attempt + 1)))) {
          const error = new Error("abortado");
          error.name = "AbortError";
          throw error;
        }
        continue;
      }
      return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt };
    }
  }
  return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt: state.now().toISOString() };
}

export async function readMint(options) {
  const mint = typeof options.mint === "string" ? options.mint.trim() : "";
  const now = options.now ?? (() => new Date());
  const consultedAt = now().toISOString();
  if (!isMintAddress(mint)) {
    return {
      ok: false,
      error: "invalid",
      card: null,
    };
  }
  const endpoint = options.endpoint ?? PUBLICNODE_RPC;
  if (!isAllowedRpcUrl(endpoint)) {
    return { ok: false, error: "rpc", card: blankCard(mint, consultedAt, []) };
  }
  const state = {
    endpoint,
    endpoints: endpointsFor(endpoint),
    transport: options.transport,
    timeoutMs: options.timeoutMs ?? 8000,
    maxRetries: options.maxRetries ?? 2,
    minIntervalMs: options.minIntervalMs ?? 2000,
    now,
    sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    mono: options.mono ?? (() => Date.now()),
    nextAt: 0,
    id: 1,
    signal: options.signal || null,
  };
  if (typeof state.transport !== "function") {
    throw new Error("Falta el transporte de lectura.");
  }
  const errors = [];
  const card = blankCard(mint, consultedAt, errors);
  let metadataAddress;
  let curveAddress;
  try {
    metadataAddress = await metadataPda(mint);
    curveAddress = await bondingCurvePda(mint);
  } catch (error) {
    errors.push({
      method: "local",
      httpStatus: null,
      message: error instanceof Error ? error.message : "No se pudo derivar la cuenta.",
      at: consultedAt,
    });
    return { ok: false, error: "partial", card };
  }
  const accounts = await rpcCall(state, "getMultipleAccounts", [
    [mint, metadataAddress, curveAddress],
    { encoding: "base64", commitment: "confirmed" },
  ]);
  if (!accounts.ok) {
    errors.push({ method: accounts.method, httpStatus: accounts.httpStatus, message: accounts.error, at: accounts.fetchedAt });
    card.programStatus = "fallo";
    card.name.status = "fallo";
    card.symbol.status = "fallo";
    card.uri.status = "fallo";
    card.metadataMutable = "fallo";
    card.slotStatus = "fallo";
    card.curve = { ...emptyCurve(), status: "fallo" };
    card.supplyRpcStatus = "fallo";
    card.largestStatus = "fallo";
    return { ok: false, error: "partial", card };
  }
  if (accounts.slot !== null) {
    card.slot = accounts.slot;
    card.slotStatus = "verificado";
  }
  const value = accounts.value && accounts.value.value;
  if (!Array.isArray(value) || value.length !== 3) {
    errors.push({ method: "getMultipleAccounts", httpStatus: 200, message: "No se pudo comprobar", at: accounts.fetchedAt });
    card.programStatus = "fallo";
    card.name.status = "fallo";
    card.symbol.status = "fallo";
    card.uri.status = "fallo";
    card.metadataMutable = "fallo";
    card.slotStatus = "fallo";
    card.curve = { ...emptyCurve(), status: "fallo" };
    card.supplyRpcStatus = "fallo";
    card.largestStatus = "fallo";
    return { ok: false, error: "partial", card };
  }
  let mintAccount = null;
  let metadataAccount = null;
  let curveAccount = null;
  try {
    mintAccount = parseAccount(value[0]);
    metadataAccount = parseAccount(value[1]);
    curveAccount = parseAccount(value[2]);
  } catch (error) {
    errors.push({
      method: "getMultipleAccounts",
      httpStatus: 200,
      message: error instanceof Error ? error.message : "Cuenta ilegible.",
      at: accounts.fetchedAt,
    });
    card.programStatus = "fallo";
    card.name.status = "fallo";
    card.symbol.status = "fallo";
    card.uri.status = "fallo";
    card.metadataMutable = "fallo";
    card.slotStatus = "fallo";
    card.curve = { ...emptyCurve(), status: "fallo" };
    card.supplyRpcStatus = "fallo";
    card.largestStatus = "fallo";
    return { ok: false, error: "partial", card };
  }
  if (!mintAccount) {
    card.program = "no_es_mint";
    card.programStatus = "verificado";
    card.partial = false;
    card.name.status = "no_aplica";
    card.symbol.status = "no_aplica";
    card.uri.status = "no_aplica";
    card.metadataMutable = "no_aplica";
    card.extensionsStatus = "no_aplica";
    card.supplyRpcStatus = "no_aplica";
    card.largestStatus = "no_aplica";
    card.mintAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
    card.freezeAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
    card.curve = { ...emptyCurve(), present: false, status: "no_aplica" };
    return { ok: true, error: null, card };
  }
  const decoded = decodeMintAccount(mintAccount.owner, mintAccount.data);
  if (!decoded) {
    card.program = "no_es_mint";
    card.programStatus = "verificado";
    card.partial = false;
    card.mintAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
    card.freezeAuthority = { state: "no_aplica", address: null, status: "no_aplica" };
    card.name.status = "no_aplica";
    card.symbol.status = "no_aplica";
    card.uri.status = "no_aplica";
    card.metadataMutable = "no_aplica";
    card.supplyRpcStatus = "no_aplica";
    card.largestStatus = "no_aplica";
    card.extensionsStatus = "no_aplica";
    card.curve = curveAccount
      ? { ...emptyCurve(), ...decodeCurveAccount(curveAccount.owner, curveAccount.data) }
      : curveAbsent(mint);
    if (card.curve.present === false) card.curve = curveAbsent(mint);
    if (card.curve.status === "no_disponible") card.curve.status = "fallo";
    return { ok: true, error: null, card };
  }
  card.isMint = true;
  card.partial = false;
  card.program = decoded.standard;
  card.programStatus = "verificado";
  card.decimals = decoded.decimals;
  card.supplyAccount = decoded.supplyRaw;
  card.mintAuthority = authorityField(decoded.mintAuthority);
  card.freezeAuthority = authorityField(decoded.freezeAuthority);
  if (card.mintAuthority.status === "fallo" || card.freezeAuthority.status === "fallo") card.partial = true;
  card.extensions = decoded.extensions.items;
  card.extensionsStatus = decoded.extensions.status;
  if (metadataAccount) {
    const meta = decodeMetadataAccount(metadataAccount.data);
    if (meta) {
      card.name = textFact(meta.name);
      card.symbol = textFact(meta.symbol);
      card.uri = textFact(meta.uri);
      card.metadataMutable = meta.mutable === "si" || meta.mutable === "no" ? meta.mutable : "ausente";
    } else {
      card.name = { text: null, status: "fallo" };
      card.symbol = { text: null, status: "fallo" };
      card.uri = { text: null, status: "fallo" };
      card.metadataMutable = "fallo";
      errors.push({
        method: "getMultipleAccounts",
        httpStatus: 200,
        message: "Los metadatos no se pudieron leer. No se inventa un nombre.",
        at: accounts.fetchedAt,
      });
    }
  } else {
    card.name = { text: null, status: "ausente" };
    card.symbol = { text: null, status: "ausente" };
    card.uri = { text: null, status: "ausente" };
    card.metadataMutable = "ausente";
  }
  if (card.name.text === null && decoded.standard === "token-2022") {
    const pointer = decoded.extensions.metadataPointer;
    const embedded = decoded.extensions.tokenMetadata;
    if (pointer && pointer !== mint) {
      errors.push({
        method: "local",
        httpStatus: null,
        message: "El puntero de metadatos no apunta a este mint. El nombre incrustado no se da como verificado.",
        at: accounts.fetchedAt,
      });
    } else if (embedded) {
      card.name = textFact(embedded.name);
      card.symbol = textFact(embedded.symbol);
      card.uri = textFact(embedded.uri);
      card.metadataMutable = embedded.mutable === "si" || embedded.mutable === "no" ? embedded.mutable : "ausente";
    }
  }
  if (curveAccount) {
    const curve = decodeCurveAccount(curveAccount.owner, curveAccount.data);
    card.curve = { ...emptyCurve(), ...curve };
    if (curve.present === false) card.curve = curveAbsent(mint);
    if (curve.status === "no_disponible") card.curve.status = "fallo";
  } else {
    card.curve = curveAbsent(mint);
  }
  const supply = await rpcCall(state, "getTokenSupply", [mint, { commitment: "confirmed" }]);
  if (!supply.ok) {
    errors.push({ method: supply.method, httpStatus: supply.httpStatus, message: supply.error, at: supply.fetchedAt });
    card.supplyRpcStatus = "fallo";
    card.partial = true;
  } else {
    const amount = supply.value && supply.value.value && supply.value.value.amount;
    if (typeof amount === "string" && /^\d+$/.test(amount)) {
      card.supplyRpc = amount;
      card.supplyRpcStatus = "verificado";
      if (supply.slot !== null && card.slot === null) {
        card.slot = supply.slot;
        card.slotStatus = "verificado";
      }
    } else {
      errors.push({
        method: "getTokenSupply",
        httpStatus: 200,
        message: "El suministro no vino como un entero. No se pone un cero.",
        at: supply.fetchedAt,
      });
      card.supplyRpcStatus = "fallo";
      card.partial = true;
    }
  }
  const largest = await rpcCall(state, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
  const largestRows = largest.ok && largest.value && Array.isArray(largest.value.value) ? largest.value.value : null;
  if (!largest.ok || !largestRows) {
    errors.push({
      method: largest.method || "getTokenLargestAccounts",
      httpStatus: largest.httpStatus,
      message: largest.ok ? "La muestra no vino como una lista. No se pone un cero." : largest.error,
      at: largest.fetchedAt,
    });
    card.largestStatus = "fallo";
    card.partial = true;
  } else if (largestRows.length === 0) {
    errors.push({
      method: "getTokenLargestAccounts",
      httpStatus: 200,
      message: "La muestra de cuentas volvió vacía. No se leyó quién tiene más tokens. No es una ausencia de cuentas ni una concentración de cero.",
      at: largest.fetchedAt,
    });
    card.largestStatus = "fallo";
    card.partial = true;
  } else {
    card.largestStatus = "ok";
  }
  card.partial = card.partial || errors.length > 0 || card.extensionsStatus === "no_disponible";
  return { ok: errors.length === 0, error: errors.length ? "partial" : null, card };
}
