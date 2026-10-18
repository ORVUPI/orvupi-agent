import { canonicalJson, describePair, launchlabLines, drawSnapshot, evidenceRecord, FEE_CAVEAT, GLOBAL_FEE_ACCOUNT, PUBLIC_WARNING, readWithinLimit, sha256Hex, snapshotLines } from "../modules/pair-report.mjs";
// Generado por web/v2/tools/bundle-pares.mjs. La fuente está en pares/.
/**
 * Lectura pública y cerrada. Solo los métodos de verify/policy/limits.json.
 * El primero es publicnode; el de respaldo es mainnet-beta. Un fallo no se anota como fuente.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i += 1) INDEX[ALPHABET.charCodeAt(i)] = i;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const LIMITS = {
  defaultRpcUrl: "https://solana-rpc.publicnode.com",
  fallbackRpcUrl: "https://api.mainnet-beta.solana.com",
  timeoutMs: 8000,
  maxRetries: 2,
  backoffBaseMs: 500,
  minIntervalMs: 400,
  allowedRpcMethods: ["getAccountInfo", "getMultipleAccounts", "getTokenSupply", "getTokenLargestAccounts", "getSlot"],
};

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const DEFAULT_PUBKEY = "11111111111111111111111111111111";
const PUMP_DISCRIMINATOR = Uint8Array.from([23, 183, 248, 55, 96, 216, 172, 96]);
const P = (1n << 255n) - 19n;
const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");

function decodeBase58(source) {
  if (source.length === 0) return new Uint8Array();
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

function encodeBase58(bytes) {
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

function decodePubkey(value) {
  const bytes = decodeBase58(value);
  if (!bytes || bytes.length !== 32) return null;
  return bytes;
}

function rotr(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256(message) {
  const bitLen = message.length * 8;
  const withOne = message.length + 1;
  const zeroPad = withOne % 64 <= 56 ? 56 - (withOne % 64) : 56 + 64 - (withOne % 64);
  const data = new Uint8Array(message.length + 1 + zeroPad + 8);
  data.set(message);
  data[message.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(data.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(data.length - 4, bitLen >>> 0);
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  outView.setUint32(20, h5);
  outView.setUint32(24, h6);
  outView.setUint32(28, h7);
  return out;
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

function isOnCurve(bytes) {
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

function concatBytes(parts) {
  let size = 0;
  for (const part of parts) size += part.length;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function findProgramAddress(seeds, programId) {
  if (programId.length !== 32) throw new Error("El programa tiene que ser de 32 bytes.");
  for (let bump = 255; bump >= 0; bump -= 1) {
    const address = sha256(concatBytes([...seeds, Uint8Array.of(bump), programId, PDA_MARKER]));
    if (!isOnCurve(address)) return { address, bump };
  }
  throw new Error("No hay una PDA fuera de la curva.");
}

function pda(seeds, program) {
  const programBytes = decodePubkey(program);
  if (!programBytes) throw new Error("Programa ilegible.");
  const seedBytes = seeds.map((seed) => (typeof seed === "string" ? new TextEncoder().encode(seed) : seed));
  return encodeBase58(findProgramAddress(seedBytes, programBytes).address);
}

function bondingCurvePda(mint) {
  const mintBytes = decodePubkey(mint);
  if (!mintBytes) return null;
  return pda(["bonding-curve", mintBytes], PUMP_PROGRAM);
}

function metadataPda(mint) {
  const mintBytes = decodePubkey(mint);
  const program = decodePubkey(METADATA_PROGRAM);
  if (!mintBytes || !program) return null;
  return pda(["metadata", program, mintBytes], METADATA_PROGRAM);
}

function globalPda() {
  return pda(["global"], PUMP_PROGRAM);
}

function globalDiscriminator() {
  return sha256(new TextEncoder().encode("account:Global")).subarray(0, 8);
}

function readU64(data, offset) {
  if (offset < 0 || offset + 8 > data.length) return null;
  let n = 0n;
  for (let i = 0; i < 8; i += 1) n |= BigInt(data[offset + i] ?? 0) << (8n * BigInt(i));
  return n;
}

function writeU64(target, offset, value) {
  let n = value;
  for (let i = 0; i < 8; i += 1) {
    target[offset + i] = Number(n & 0xffn);
    n >>= 8n;
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeMintAccount(supply, decimals) {
  const data = new Uint8Array(82);
  writeU64(data, 36, supply);
  data[44] = decimals;
  data[45] = 1;
  return data;
}

function encodeCurveAccount(fields) {
  const quote = fields.quoteMint ? decodePubkey(fields.quoteMint) : null;
  const data = new Uint8Array(quote ? 115 : 49);
  data.set(PUMP_DISCRIMINATOR);
  writeU64(data, 8, fields.virtualToken);
  writeU64(data, 16, fields.virtualQuote);
  writeU64(data, 24, fields.realToken);
  writeU64(data, 32, fields.realQuote);
  writeU64(data, 40, fields.supply);
  data[48] = fields.complete ? 1 : 0;
  if (quote) data.set(quote, 83);
  return data;
}

function encodeGlobalAccount(protocolBps, creatorBps) {
  const data = new Uint8Array(creatorBps === undefined ? 113 : 162);
  data.set(globalDiscriminator());
  if (protocolBps !== undefined) writeU64(data, 105, protocolBps);
  if (creatorBps !== undefined) writeU64(data, 154, creatorBps);
  return data;
}

function encodeMetadataAccount(mint, name, symbol, uri) {
  const mintBytes = decodePubkey(mint);
  if (!mintBytes) return null;
  const parts = [name, symbol, uri].map((text) => {
    const raw = new TextEncoder().encode(text);
    const out = new Uint8Array(4 + raw.length);
    out[0] = raw.length & 255;
    out[1] = (raw.length >> 8) & 255;
    out[2] = (raw.length >> 16) & 255;
    out[3] = (raw.length >> 24) & 255;
    out.set(raw, 4);
    return out;
  });
  const data = new Uint8Array(65 + parts.reduce((sum, part) => sum + part.length, 0));
  data[0] = 4;
  data.set(mintBytes, 33);
  let cursor = 65;
  for (const part of parts) {
    data.set(part, cursor);
    cursor += part.length;
  }
  return data;
}

function decodeMint(owner, data) {
  if (owner !== TOKEN_PROGRAM && owner !== TOKEN_2022_PROGRAM) return null;
  if (data.length < 82 || data[45] !== 1) return null;
  const decimals = data[44];
  const supply = readU64(data, 36);
  if (decimals === undefined || decimals > 18 || supply === null) return null;
  return { standard: owner === TOKEN_2022_PROGRAM ? "token-2022" : "spl-token", decimals, supply };
}

function quoteIsSol(quoteMint) {
  return quoteMint === null || quoteMint === DEFAULT_PUBKEY || quoteMint === WSOL_MINT;
}

function decodeCurve(owner, data) {
  if (owner !== PUMP_PROGRAM || data.length < 49) return null;
  for (let i = 0; i < PUMP_DISCRIMINATOR.length; i += 1) {
    if (data[i] !== PUMP_DISCRIMINATOR[i]) return null;
  }
  const virtualToken = readU64(data, 8);
  const virtualQuote = readU64(data, 16);
  const realToken = readU64(data, 24);
  const realQuote = readU64(data, 32);
  const supply = readU64(data, 40);
  if ([virtualToken, virtualQuote, realToken, realQuote, supply].some((item) => item === null) || (data[48] !== 0 && data[48] !== 1)) {
    return null;
  }
  let cursor = 49;
  if (data.length >= cursor + 32) cursor += 32;
  if (data.length >= cursor + 2) cursor += 2;
  else if (data.length > cursor) cursor = data.length;
  let quoteMint = null;
  if (data.length >= cursor + 32) quoteMint = encodeBase58(data.subarray(cursor, cursor + 32));
  return {
    virtualToken,
    virtualQuote,
    realToken,
    realQuote,
    supply,
    complete: data[48] === 1,
    quoteMint,
    quoteSol: quoteIsSol(quoteMint),
  };
}

function feeField(data, offset, present) {
  if (!present) return { status: "ausente" };
  const bps = readU64(data, offset);
  if (bps === null || bps > 10000n) return { status: "ilegible" };
  return { status: "leida", bps };
}

function decodeGlobal(owner, data) {
  if (owner !== PUMP_PROGRAM) return null;
  const disc = globalDiscriminator();
  if (data.length < disc.length) return null;
  for (let i = 0; i < disc.length; i += 1) {
    if (data[i] !== disc[i]) return null;
  }
  return {
    protocol: feeField(data, 105, data.length >= 113),
    creator: feeField(data, 154, data.length >= 162),
  };
}

function readBorshString(data, offset) {
  if (offset + 4 > data.length) return null;
  const length = (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8) | ((data[offset + 2] ?? 0) << 16) | ((data[offset + 3] ?? 0) << 24);
  const start = offset + 4;
  if (length < 0 || start + length > data.length) return null;
  const bytes = data.subarray(start, start + length);
  const text = new TextDecoder().decode(bytes).replaceAll("\u0000", "").replace(/[\u0001-\u001f\u007f]/g, "").trim();
  return { text, next: start + length };
}

function decodeMetadata(owner, data, expectedMint) {
  if (owner !== METADATA_PROGRAM || data.length < 1 + 32 + 32 + 4 || data[0] !== 4) return null;
  const mint = encodeBase58(data.subarray(33, 65));
  if (mint !== expectedMint) return null;
  const name = readBorshString(data, 65);
  if (!name) return null;
  const symbol = readBorshString(data, name.next);
  if (!symbol) return null;
  const uri = readBorshString(data, symbol.next);
  if (!uri) return null;
  return { name: name.text, symbol: symbol.text, uri: uri.text };
}


// Raydium LaunchLab. Programa y layout del SDK oficial raydium-sdk-V2 (src/raydium/launchpad/layout.ts y pda.ts).
// Comprobado en la cadena con el pool de ORVUPI 8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk. Misma lógica que verify/launchlab.ts.
const LAUNCHLAB_PROGRAM = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
const CPMM_PROGRAM = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
const CPMM_DEFAULT_CONFIG = "D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2";
const USD1_MINT = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";
const LAUNCHLAB_POOL_DISCRIMINATOR = Uint8Array.from([247, 237, 227, 245, 215, 195, 222, 70]);
const LAUNCHLAB_PLATFORM_DISCRIMINATOR = Uint8Array.from([160, 78, 128, 0, 248, 83, 230, 160]);
const LAUNCHLAB_POOL_MIN_LEN = 365;

function startsWith(data, disc) {
  if (data.length < disc.length) return false;
  for (let i = 0; i < disc.length; i += 1) if (data[i] !== disc[i]) return false;
  return true;
}

function launchlabPoolPda(mint, quote = WSOL_MINT) {
  const a = decodePubkey(mint);
  const b = decodePubkey(quote);
  if (!a || !b) return null;
  return pda(["pool", a, b], LAUNCHLAB_PROGRAM);
}

function cpmmPoolPda(config, mintA, mintB) {
  const a = decodePubkey(mintA);
  const b = decodePubkey(mintB);
  const c = decodePubkey(config);
  if (!a || !b || !c) return null;
  let first = a;
  let second = b;
  for (let i = 0; i < 32; i += 1) {
    if (a[i] !== b[i]) {
      if (a[i] > b[i]) {
        first = b;
        second = a;
      }
      break;
    }
  }
  return pda(["pool", c, first, second], CPMM_PROGRAM);
}

function decodeLaunchlabPool(address, owner, data, expectedMint) {
  if (owner !== LAUNCHLAB_PROGRAM || data.length < LAUNCHLAB_POOL_MIN_LEN || !startsWith(data, LAUNCHLAB_POOL_DISCRIMINATOR)) return null;
  const read = (offset) => readU64(data, offset) ?? 0n;
  const statusCode = data[17];
  const migrate = data[20];
  const key = (index) => encodeBase58(data.subarray(141 + index * 32, 173 + index * 32));
  const mintA = key(2);
  if (expectedMint && mintA !== expectedMint) return null;
  return {
    poolAddress: address,
    status: statusCode === 0 ? "en_curva" : statusCode === 1 ? "migrando" : statusCode === 2 ? "migrado" : "desconocido",
    statusCode,
    migrateType: migrate === 0 ? "amm" : migrate === 1 ? "cpmm" : "desconocido",
    decimalsA: data[18],
    decimalsB: data[19],
    supply: read(21),
    totalSellA: read(29),
    virtualA: read(37),
    virtualB: read(45),
    realA: read(53),
    realB: read(61),
    totalFundRaisingB: read(69),
    configId: key(0),
    platformId: key(1),
    mintA,
    mintB: key(3),
    vaultA: key(4),
    vaultB: key(5),
    creator: key(6),
  };
}

function decodePlatformCpConfig(owner, data) {
  if (owner !== LAUNCHLAB_PROGRAM || !startsWith(data, LAUNCHLAB_PLATFORM_DISCRIMINATOR) || data.length < 720) return null;
  return encodeBase58(data.subarray(688, 720));
}

function cpmmPoolHoldsMints(owner, data, mintA, mintB) {
  if (owner !== CPMM_PROGRAM || data.length < 232) return false;
  const t0 = encodeBase58(data.subarray(168, 200));
  const t1 = encodeBase58(data.subarray(200, 232));
  return (t0 === mintA && t1 === mintB) || (t0 === mintB && t1 === mintA);
}

async function readLaunchlab(mint, reader) {
  const candidates = [launchlabPoolPda(mint, WSOL_MINT), launchlabPoolPda(mint, USD1_MINT)];
  if (candidates.some((item) => !item)) return { ok: false, reading: null };
  const first = await reader.getMultipleAccounts(candidates);
  if (!first.ok || !Array.isArray(first.value)) return { ok: false, reading: null };
  let pool = null;
  for (let i = 0; i < candidates.length && !pool; i += 1) {
    const account = first.value[i];
    if (account) pool = decodeLaunchlabPool(candidates[i], account.owner, account.data, mint);
  }
  if (!pool) return { ok: true, reading: null };
  if (pool.status !== "migrado") return { ok: true, reading: { pool, migratedPool: null, migratedNote: "no_aplica" } };
  if (pool.migrateType !== "cpmm") return { ok: true, reading: { pool, migratedPool: null, migratedNote: "amm_v4_no_derivable" } };
  const configs = [CPMM_DEFAULT_CONFIG];
  const platform = await reader.getMultipleAccounts([pool.platformId]);
  const platformAccount = platform.ok && Array.isArray(platform.value) ? platform.value[0] : null;
  const cp = platformAccount ? decodePlatformCpConfig(platformAccount.owner, platformAccount.data) : null;
  if (cp && !configs.includes(cp)) configs.push(cp);
  const pdas = configs.map((config) => cpmmPoolPda(config, pool.mintA, pool.mintB));
  const found = await reader.getMultipleAccounts(pdas);
  if (found.ok && Array.isArray(found.value)) {
    for (let i = 0; i < pdas.length; i += 1) {
      const account = found.value[i];
      if (account && cpmmPoolHoldsMints(account.owner, account.data, pool.mintA, pool.mintB)) {
        return { ok: true, reading: { pool, migratedPool: pdas[i], migratedNote: "localizado" } };
      }
    }
  }
  return { ok: true, reading: { pool, migratedPool: null, migratedNote: "no_localizado" } };
}

function isAllowedMethod(method) {
  return LIMITS.allowedRpcMethods.includes(method);
}

function retryableStatus(status) {
  return status === 429 || status === 408 || status >= 500;
}

function retryableFailure(result) {
  if (result.ok) return false;
  const status = result.httpStatus;
  if (status === 403 || status === 429 || status === 408 || (status !== null && status >= 500)) return true;
  return /429|403|too many|rate limit|timeout|timed out|tiempo de espera|network|fetch failed|ECONN|ENET|ENOTFOUND|socket|access forbidden/i.test(result.error ?? "");
}

function classifyRpcFailure(error, httpStatus) {
  if (httpStatus === 429 || /429|too many|rate limit/i.test(error)) return "limite";
  if (httpStatus === 408 || /timeout|timed out|tiempo de espera/i.test(error)) return "tiempo";
  return "red";
}

function parseAccount(value) {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("Cuenta ilegible.");
  const row = value;
  const data = row.data;
  if (!Array.isArray(data) || data[1] !== "base64" || typeof data[0] !== "string" || typeof row.owner !== "string") {
    throw new Error("Cuenta ilegible.");
  }
  const binary = atob(data[0]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { owner: row.owner, data: bytes };
}

class RpcClient {
  constructor(options) {
    this.endpoint = options.endpoint;
    this.transport = options.transport ?? defaultTransport;
    this.timeoutMs = options.timeoutMs ?? LIMITS.timeoutMs;
    this.maxRetries = options.maxRetries ?? LIMITS.maxRetries;
    this.backoffBaseMs = options.backoffBaseMs ?? LIMITS.backoffBaseMs;
    this.minIntervalMs = options.minIntervalMs ?? LIMITS.minIntervalMs;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
    this.monoNow = options.monoNow ?? Date.now;
    this.nextAt = 0;
    this.id = 1;
    this.calls = [];
  }

  getSlot() {
    return this.call("getSlot", [{ commitment: "confirmed" }], (result) => {
      if (typeof result !== "number" || !Number.isSafeInteger(result)) throw new Error("getSlot no devolvió un entero.");
      return result;
    });
  }

  getMultipleAccounts(addresses) {
    return this.call("getMultipleAccounts", [addresses, { encoding: "base64", commitment: "confirmed" }], (result) => {
      const value = result && typeof result === "object" && "value" in result ? result.value : result;
      if (!Array.isArray(value)) throw new Error("getMultipleAccounts no devolvió una lista.");
      return value.map((item) => parseAccount(item));
    });
  }

  async call(method, params, parse) {
    if (!isAllowedMethod(method)) {
      return { ok: false, method, error: `Método RPC no permitido: ${method}`, httpStatus: null, fetchedAt: this.now().toISOString() };
    }
    let lastError = "sin respuesta";
    let lastStatus = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this.pace();
      const fetchedAt = this.now().toISOString();
      try {
        const payload = JSON.stringify({ jsonrpc: "2.0", id: this.id, method, params });
        this.id += 1;
        this.calls.push(method);
        const response = await this.transport(this.endpoint, payload, this.timeoutMs);
        lastStatus = response.status;
        if (retryableStatus(response.status) && attempt < this.maxRetries) {
          lastError = `HTTP ${response.status}`;
          await this.sleep(this.backoff(attempt));
          continue;
        }
        if (response.status < 200 || response.status >= 300) {
          return { ok: false, method, error: `HTTP ${response.status}`, httpStatus: response.status, fetchedAt };
        }
        const parsed = JSON.parse(response.body);
        if (parsed.error) {
          const message = parsed.error.message ?? "error JSON-RPC";
          return { ok: false, method, error: message, httpStatus: response.status, fetchedAt };
        }
        const slot = readSlot(parsed.result, method);
        return { ok: true, method, value: parse(parsed.result), slot, fetchedAt, endpoint: this.endpoint };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "error de red";
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoff(attempt));
          continue;
        }
        return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt };
      }
    }
    return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt: this.now().toISOString() };
  }

  backoff(attempt) {
    return this.backoffBaseMs * 2 ** attempt + Math.floor(this.random() * 100);
  }

  async pace() {
    const now = this.monoNow();
    const start = Math.max(now, this.nextAt);
    this.nextAt = start + this.minIntervalMs;
    if (start > now) await this.sleep(start - now);
  }
}

function readSlot(result, method) {
  if (method === "getSlot" && typeof result === "number") return result;
  if (result && typeof result === "object" && result.context && Number.isSafeInteger(result.context.slot)) return result.context.slot;
  return null;
}

async function defaultTransport(endpoint, body, timeoutMs) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: response.status, body: await response.text() };
}

class FallbackRpc {
  constructor(readers, endpoints) {
    this.readers = readers;
    this.endpoints = endpoints;
    this.reads = [];
  }

  getSlot() {
    return this.first("getSlot", (reader) => reader.getSlot());
  }

  getMultipleAccounts(addresses) {
    return this.first("getMultipleAccounts", (reader) => reader.getMultipleAccounts(addresses));
  }

  async call(method, params, parse) {
    return this.first(method, (reader) => reader.call(method, params, parse));
  }

  async first(method, run) {
    let last = null;
    for (let index = 0; index < this.readers.length; index += 1) {
      const result = await run(this.readers[index]);
      last = result;
      if (result.ok || !retryableFailure(result) || index === this.readers.length - 1) {
        if (result.ok) this.reads.push({ method, endpoint: this.endpoints[index] ?? "" });
        return result;
      }
    }
    return last ?? { ok: false, method, error: "sin respuesta", httpStatus: null, fetchedAt: new Date().toISOString() };
  }
}

function createReader(options = {}) {
  const endpoints = options.endpoints ?? [LIMITS.defaultRpcUrl, LIMITS.fallbackRpcUrl];
  const readers = endpoints.map((endpoint) => new RpcClient({ ...options, endpoint }));
  return new FallbackRpc(readers, endpoints);
}

async function readCurveState(mint, options = {}) {
  const trimmed = String(mint ?? "").trim();
  if (!decodePubkey(trimmed)) return { ok: false, code: "direccion" };
  const curveAddress = bondingCurvePda(trimmed);
  const metaAddress = metadataPda(trimmed);
  const globalAddress = globalPda();
  if (!curveAddress || !metaAddress || !globalAddress) return { ok: false, code: "direccion" };
  const reader = options.reader ?? createReader(options);
  const packed = await reader.getMultipleAccounts([trimmed, curveAddress, metaAddress, globalAddress]);
  if (!packed.ok) return { ok: false, code: classifyRpcFailure(packed.error ?? "", packed.httpStatus ?? null), error: packed.error ?? "" };
  const slotCall = await reader.getSlot();
  const accounts = packed.value ?? [];
  const mintAccount = accounts[0] ?? null;
  const curveAccount = accounts[1] ?? null;
  const metaAccount = accounts[2] ?? null;
  const globalAccount = accounts[3] ?? null;
  const mintDecoded = mintAccount ? decodeMint(mintAccount.owner, mintAccount.data) : null;
  if (!mintDecoded) return { ok: false, code: "no_mint", reads: reader.reads };
  const curve = curveAccount ? decodeCurve(curveAccount.owner, curveAccount.data) : null;
  const fees = globalAccount ? decodeGlobal(globalAccount.owner, globalAccount.data) : null;
  const metadata = metaAccount ? decodeMetadata(metaAccount.owner, metaAccount.data, trimmed) : null;
  let launchlab = null;
  let launchlabError = false;
  if (!curve) {
    const ll = await readLaunchlab(trimmed, reader);
    launchlab = ll.reading;
    launchlabError = !ll.ok;
  }
  return {
    ok: true,
    mint: trimmed,
    mintDecoded,
    curve,
    launchlab,
    launchlabError,
    fees,
    metadata,
    slot: slotCall.ok ? slotCall.value : null,
    slotError: slotCall.ok ? null : classifyRpcFailure(slotCall.error ?? "", slotCall.httpStatus ?? null),
    fetchedAt: packed.fetchedAt,
    reads: reader.reads,
  };
}


const TEXT = {
  direccion: ["Esa dirección no es válida. Suele tener entre 32 y 44 letras y números.", "That address is not valid. It is usually 32 to 44 letters and numbers."],
  no_mint: ["Esa cuenta no es un mint. No hay informe.", "That account is not a mint. There is no report."],
  limite: ["El servicio limitó la consulta. No se inventa ningún dato. Puedes volver a leer.", "The service limited the query. No data is invented. You can read again."],
  tiempo: ["El servicio no respondió a tiempo. No se inventa ningún dato. Puedes volver a leer.", "The service did not answer in time. No data is invented. You can read again."],
  red: ["El servicio no respondió. No se inventa ningún dato. Puedes volver a leer.", "The service did not answer. No data is invented. You can read again."],
  minuto: ["Se han hecho 6 lecturas en un minuto. Espera un momento antes de comprobar otra. No se inventa ningún dato.", "6 readings were made in one minute. Wait a moment before checking another. No data is invented."],
  leyendo: ["Leyendo datos públicos. No se firma nada.", "Reading public data. Nothing is signed."],
};

let current = null;
let queryStamps = [];

function lang() {
  return document.documentElement.dataset.lang === "en" ? "en" : "es";
}

function span(es, en) {
  const wrap = document.createDocumentFragment();
  const left = document.createElement("span");
  left.className = "lang es";
  left.lang = "es";
  left.textContent = es;
  const right = document.createElement("span");
  right.className = "lang en";
  right.lang = "en";
  right.textContent = en;
  wrap.append(left, right);
  return wrap;
}

function show(lines) {
  const out = document.querySelector("#resultado");
  if (!out) return;
  out.replaceChildren();
  const title = document.createElement("h2");
  title.append(span("Informe", "Report"));
  out.append(title);
  for (const item of lines) {
    const p = document.createElement("p");
    p.append(span(item.es, item.en));
    out.append(p);
  }
  out.tabIndex = -1;
  out.focus();
}

function showReading(evidence, digest) {
  const out = document.querySelector("#resultado");
  if (!out) return;
  out.replaceChildren();
  const title = document.createElement("h2");
  title.append(span("Informe", "Report"));
  out.append(title);
  const strip = document.createElement("p");
  strip.className = "franja-identidad";
  strip.append(
    span(
      evidence.official
        ? "Identidad del proyecto: esta dirección coincide con la del proyecto."
        : "Identidad del proyecto, aparte de este análisis: ORVUPI no revisa ni respalda este token.",
      evidence.official
        ? "Project identity: this address matches the project one."
        : "Project identity, separate from this analysis: ORVUPI does not review or endorse this token.",
    ),
  );
  out.append(strip);
  for (const item of pageLines(evidence, digest)) {
    const p = document.createElement("p");
    p.append(span(item.es, item.en));
    out.append(p);
  }
  const details = document.createElement("details");
  details.className = "tecnico";
  const summary = document.createElement("summary");
  summary.append(span("Detalles técnicos", "Technical details"));
  const slot = document.createElement("p");
  slot.append(
    span(
      evidence.slot === null ? "El momento de la red no se leyó. No se inventa un número." : `Momento de la red: ${evidence.slot}.`,
      evidence.slot === null ? "The network moment was not read. A number is not invented." : `Network moment: ${evidence.slot}.`,
    ),
  );
  details.append(summary, slot);
  out.append(details);
  out.tabIndex = -1;
  out.focus();
}

function fail(code) {
  current = null;
  const exportButton = document.querySelector("#exportar");
  if (exportButton) exportButton.hidden = true;
  const pair = TEXT[code] ?? TEXT.red;
  show([{ es: pair[0], en: pair[1] }]);
}

function hosts(reads) {
  const found = [];
  for (const row of reads ?? []) {
    try {
      const host = new URL(row.endpoint).host;
      if (host && !found.includes(host)) found.push(host);
    } catch {
      /* una fuente ilegible no se inventa */
    }
  }
  return found;
}

function feeLine(field, offset, bps) {
  if (bps === null) {
    return {
      es: `Cuenta Global de Pump.fun ${GLOBAL_FEE_ACCOUNT}, campo ${field}, desplazamiento ${offset}: no se leyó. No se pone cero en su lugar. ${FEE_CAVEAT.es}`,
      en: `Pump.fun Global account ${GLOBAL_FEE_ACCOUNT}, field ${field}, offset ${offset}: not read. Zero is not used in its place. ${FEE_CAVEAT.en}`,
    };
  }
  const percentEs = (bps / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percentEn = (bps / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    es: `Leído en la cuenta Global de Pump.fun ${GLOBAL_FEE_ACCOUNT}, campo ${field}, desplazamiento ${offset}: ${bps} diezmilésimas (${percentEs} %). ${FEE_CAVEAT.es}`,
    en: `Read on the Pump.fun Global account ${GLOBAL_FEE_ACCOUNT}, field ${field}, offset ${offset}: ${bps} basis points (${percentEn}%). ${FEE_CAVEAT.en}`,
  };
}

function pageLines(evidence, digest) {
  const curve = {
    abierta: ["Curva: abierta.", "Curve: open."],
    completa: ["Curva: completa.", "Curve: complete."],
    sin_curva: ["Curva: no hay curva de Pump.fun ni de Raydium LaunchLab.", "Curve: there is no Pump.fun or Raydium LaunchLab curve."],
    migrada: ["Curva: graduada y migrada.", "Curve: graduated and migrated."],
    migrando: ["Curva: migrando.", "Curve: migrating."],
  }[evidence.curve] ?? ["Curva: no disponible.", "Curve: unavailable."];
  const base = evidence.base === "desconocida"
    ? ["Moneda base: desconocida.", "Base currency: unknown."]
    : [`Moneda base: ${evidence.base}.`, `Base currency: ${evidence.base}.`];
  const lines = [
    { es: PUBLIC_WARNING.es, en: PUBLIC_WARNING.en },
    { es: "No se inventa ningún dato.", en: "No data is invented." },
    { es: "No es una auditoría ni una recomendación. Muestra datos públicos de la cadena en el momento indicado; no dice si un token es bueno, seguro o una buena compra.", en: "It is not an audit or a recommendation. It shows public chain data at the stated time; it does not say whether a token is good, safe, or a good purchase." },
    { es: `Token analizado: ${evidence.mint}`, en: `Token analyzed: ${evidence.mint}` },
  ];
  lines.push({ es: "Un emparejamiento no es una colaboración ni un respaldo.", en: "A pairing is not a collaboration or an endorsement." });
  if (evidence.name) lines.push({ es: `Nombre leído: ${evidence.name}. Es un texto de la cuenta, no un aval.`, en: `Name read: ${evidence.name}. It is account text, not an endorsement.` });
  else lines.push({ es: "Nombre: no disponible. No se rellena.", en: "Name: not available. It is not filled in." });
  if (evidence.uri) lines.push({ es: `Enlace de metadatos, no se abre: ${evidence.uri}`, en: `Metadata link, not opened: ${evidence.uri}` });
  lines.push(
    { es: base[0], en: base[1] },
    { es: curve[0], en: curve[1] },
    ...(evidence.launchlab
      ? launchlabLines(evidence)
      : [
          ...(evidence.platform === "pump_fun" ? [{ es: "Plataforma: Pump.fun.", en: "Platform: Pump.fun." }] : []),
          feeLine("fee_basis_points", 105, evidence.protocolFeeBps),
          feeLine("creator_fee_basis_points", 154, evidence.creatorFeeBps),
        ]),
    { es: `Hora UTC: ${evidence.readAt}`, en: `UTC time: ${evidence.readAt}` },
    { es: `Fuente de las lecturas que respondieron: ${evidence.source}`, en: `Source of the reads that answered: ${evidence.source}` },
    { es: "Instantánea: puede haber cambiado.", en: "Snapshot: it may have changed." },
    { es: `sha256: ${digest}`, en: `sha256: ${digest}` },
    { es: "El hash detecta cambios respecto a esta evidencia. No certifica que sea verdad.", en: "The hash detects changes against this evidence. It does not certify that it is true." },
  );
  return lines;
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportReport() {
  if (!current) return;
  const lines = snapshotLines(current.evidence, lang());
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawSnapshot(ctx, lines);
  const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) return;
  const stem = `pares-${current.evidence.mint.slice(0, 8)}`;
  download(`${stem}.png`, png);
  download(`${stem}.json`, new Blob([`${current.json}\n`], { type: "application/json" }));
}

async function onSubmit(event) {
  event.preventDefault();
  const address = document.querySelector("#direccion-token");
  const button = event.submitter ?? document.querySelector("#consulta button[type='submit']");
  if (!address || !address.value.trim()) {
    fail("direccion");
    return;
  }
  if (button) button.disabled = true;
  fail("leyendo");
  try {
    const gate = await readWithinLimit(queryStamps, Date.now(), () => readCurveState(address.value));
    queryStamps = gate.stamps;
    if (!gate.allowed) {
      fail("minuto");
      return;
    }
    const state = gate.result;
    if (!state.ok) {
      fail(TEXT[state.code] ? state.code : "red");
      return;
    }
    const pair = describePair(state);
    if (!pair.ok) {
      fail("red");
      return;
    }
    const evidence = evidenceRecord({
      mint: state.mint,
      name: state.metadata?.name || null,
      uri: state.metadata?.uri || null,
      base: pair.base,
      curve: pair.curve,
      platform: pair.platform,
      launchlab: pair.launchlab,
      protocolFeeBps: pair.protocolFeeBps,
      creatorFeeBps: pair.creatorFeeBps,
      slot: state.slot,
      source: hosts(state.reads).join(", ") || "no disponible",
      readAt: state.fetchedAt,
    });
    const canonical = canonicalJson(evidence);
    const digest = await sha256Hex(canonical);
    current = { evidence, json: JSON.stringify({ evidence, sha256: digest }, null, 2) };
    const exportButton = document.querySelector("#exportar");
    if (exportButton) exportButton.hidden = false;
    showReading(evidence, digest);
  } catch {
    fail("red");
  } finally {
    if (button) button.disabled = false;
  }
}

const form = document.querySelector("#consulta");
form?.addEventListener("submit", onSubmit);
document.querySelector("#exportar")?.addEventListener("click", () => {
  exportReport().catch(() => fail("red"));
});
