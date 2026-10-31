/**
 * Lecturas de red. El mercado vive en market.mjs. Sin claves, sin relleno y sin DeFiLlama.
 */
import { fetchJson } from "./http.mjs";
import { fetchEthereumActivity } from "./market.mjs";
import { CHAINS, LIMITS, chainById, identify } from "./present.mjs";
import { bondingCurvePda, decodeCurveAccount, decodeMintAccount } from "../../shared/solana-read.js";

export {
  fetchBitcoinOhlc,
  fetchBitcoinQuote,
  fetchCoinOhlc,
  fetchDexSnapshot,
  fetchGlobalMarket,
  fetchLargeTransfers,
  fetchPoolCandles,
  fetchPoolTrades,
  fetchTopMarkets,
  fetchTrendingPools,
} from "./market.mjs";

const TIMEOUT_MS = 8_000;

function finite(value) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

async function solanaRpc(method, params) {
  const chain = chainById("solana");
  let last = null;
  for (const url of chain.rpc) {
    last = await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      timeoutMs: TIMEOUT_MS,
    });
    if (last.ok && last.body && !last.body.error) return { ...last, provider: url };
    if (last.status !== 429 && last.status !== 403 && last.status !== 0) break;
  }
  return { ...(last || { ok: false, body: null, fetchedAt: new Date().toISOString() }), provider: chain.rpc[0] };
}

function accountData(value) {
  const raw = value?.data?.[0];
  if (typeof raw !== "string" || !raw) return null;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function readSolana(address) {
  const fetchedAt = new Date().toISOString();
  const info = await solanaRpc("getAccountInfo", [address, { encoding: "base64", commitment: "confirmed" }]);
  if (!info.ok || info.body?.error) {
    return { ok: false, state: "requiere-atencion", chain: "solana", address, provider: info.provider, fetchedAt: info.fetchedAt || fetchedAt, transfers: [], largest: [], facts: [] };
  }
  const value = info.body?.result?.value;
  const slot = info.body?.result?.context?.slot ?? null;
  if (!value) {
    return { ok: true, state: "sin-datos", chain: "solana", address, provider: info.provider, fetchedAt: info.fetchedAt, slot, kind: "ausente", transfers: [], largest: [], facts: [{ id: "cuenta", state: "sin-datos", value: null }] };
  }
  const bytes = accountData(value);
  const mint = bytes ? decodeMintAccount(value.owner, bytes) : null;
  const facts = [{ id: "owner", state: "comprobado", value: value.owner }];
  let kind = mint ? "token" : "cuenta";
  if (mint) {
    facts.push(
      { id: "standard", state: "comprobado", value: mint.standard },
      { id: "supply", state: "comprobado", value: mint.supplyRaw, decimals: mint.decimals },
      { id: "decimals", state: "comprobado", value: String(mint.decimals) },
      { id: "mintAuthority", state: "comprobado", value: mint.mintAuthority.state === "activa" ? mint.mintAuthority.address : mint.mintAuthority.state },
      { id: "freezeAuthority", state: "comprobado", value: mint.freezeAuthority.state === "activa" ? mint.freezeAuthority.address : mint.freezeAuthority.state },
    );
    const supply = await solanaRpc("getTokenSupply", [address, { commitment: "confirmed" }]);
    const supplyAmount = supply.body?.result?.value?.amount;
    facts.push({ id: "supplyRpc", state: supply.ok && supplyAmount != null ? "comprobado" : "requiere-atencion", value: supplyAmount ?? null });
    const sampleRpc = await solanaRpc("getTokenLargestAccounts", [address, { commitment: "confirmed" }]);
    const sample = [];
    const list = sampleRpc.body?.result?.value;
    if (Array.isArray(list)) {
      for (const row of list.slice(0, 20)) {
        if (!row?.address || row.amount == null) continue;
        sample.push({ address: row.address, amount: String(row.amount), decimals: row.decimals ?? mint.decimals });
      }
    }
    facts.push({ id: "sample", state: sample.length ? "comprobado" : sampleRpc.ok ? "sin-datos" : "requiere-atencion", value: sample.length ? String(sample.length) : null });
    let curve = null;
    try {
      const pda = await bondingCurvePda(address);
      const curveInfo = await solanaRpc("getAccountInfo", [pda, { encoding: "base64", commitment: "confirmed" }]);
      const curveValue = curveInfo.body?.result?.value;
      const curveBytes = curveValue ? accountData(curveValue) : null;
      const decoded = curveBytes ? decodeCurveAccount(curveValue.owner, curveBytes) : null;
      curve = decoded?.present === true ? { state: "comprobado", present: true } : { state: curveInfo.ok ? "sin-datos" : "requiere-atencion", present: false };
    } catch {
      curve = { state: "sin-datos", present: false };
    }
    facts.push({ id: "curve", state: curve.state, value: curve.present ? "cuenta de curva" : null });
    const activity = await solanaTransfers(address, info.provider);
    return { ok: true, state: "comprobado", chain: "solana", address, kind, provider: info.provider, fetchedAt: info.fetchedAt, slot, facts, largest: sample, transfers: activity.transfers, curve };
  }
  const balance = await solanaRpc("getBalance", [address, { commitment: "confirmed" }]);
  const lamports = balance.body?.result?.value;
  facts.push({ id: "lamports", state: balance.ok && lamports != null ? "comprobado" : "requiere-atencion", value: lamports != null ? String(lamports) : null, decimals: 9 });
  const activity = await solanaTransfers(address, info.provider);
  return { ok: true, state: "comprobado", chain: "solana", address, kind, provider: info.provider, fetchedAt: info.fetchedAt, slot, facts, largest: [], transfers: activity.transfers };
}

async function solanaTransfers(address, provider) {
  const sigs = await solanaRpc("getSignaturesForAddress", [address, { limit: LIMITS.maxSignatures, commitment: "confirmed" }]);
  const list = sigs.body?.result;
  if (!Array.isArray(list)) return { transfers: [] };
  const transfers = [];
  for (const row of list.slice(0, LIMITS.maxTransactions)) {
    if (!row?.signature) continue;
    const tx = await solanaRpc("getTransaction", [row.signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
    const parsed = tx.body?.result;
    const extracted = parsed ? extractSolanaTransfers(parsed, row.signature) : [];
    if (extracted.length) transfers.push(...extracted.map((item) => ({ ...item, chain: "solana", provider, slot: row.slot ?? parsed?.slot ?? null })));
    else {
      transfers.push({
        id: row.signature,
        signature: row.signature,
        chain: "solana",
        from: null,
        to: null,
        value: null,
        token: null,
        usd: null,
        time: row.blockTime ? new Date(row.blockTime * 1000).toISOString() : null,
        state: tx.ok ? "sin-datos" : "requiere-atencion",
        provider,
        slot: row.slot ?? null,
      });
    }
  }
  return { transfers };
}

function extractSolanaTransfers(tx, signature) {
  const message = tx?.transaction?.message;
  const instructions = [
    ...(message?.instructions || []),
    ...((tx?.meta?.innerInstructions || []).flatMap((inner) => inner.instructions || [])),
  ];
  const rows = [];
  for (const ix of instructions) {
    const parsed = ix?.parsed;
    if (!parsed || (parsed.type !== "transfer" && parsed.type !== "transferChecked")) continue;
    const info = parsed.info || {};
    const amount = info.tokenAmount?.amount ?? info.amount ?? null;
    rows.push({
      id: `${signature}:${rows.length}`,
      signature,
      from: info.source || info.authority || null,
      to: info.destination || null,
      value: amount == null ? null : String(amount),
      decimals: info.tokenAmount?.decimals ?? (parsed.type === "transfer" && !info.mint ? 9 : null),
      token: info.mint || (parsed.type === "transfer" && !info.mint ? "SOL" : ""),
      usd: null,
      time: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
      state: tx.meta?.err ? "requiere-atencion" : "comprobado",
    });
  }
  return rows.filter((row) => row.from && row.to);
}

const SELECTORS = { name: "0x06fdde03", symbol: "0x95d89b41", decimals: "0x313ce567", totalSupply: "0x18160ddd" };

async function evmRpc(chain, method, params) {
  const urls = Array.isArray(chain.rpc) ? chain.rpc : [chain.rpc].filter(Boolean);
  let last = null;
  for (const url of urls) {
    last = await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      timeoutMs: TIMEOUT_MS,
    });
    if (last.ok && last.body && !last.body.error) return { ...last, provider: url };
    if (last.status && last.status !== 429 && last.status !== 403 && last.status !== 0) break;
  }
  return { ...(last || { ok: false, body: null, fetchedAt: new Date().toISOString() }), provider: urls[0] || "" };
}

function decodeAbiString(hex) {
  if (typeof hex !== "string" || !hex.startsWith("0x") || hex.length < 130) return null;
  try {
    const offset = Number(BigInt(hex.slice(2, 66)));
    const start = 2 + offset * 2;
    const length = Number(BigInt(`0x${hex.slice(start, start + 64)}`));
    const data = hex.slice(start + 64, start + 64 + length * 2);
    const bytes = new Uint8Array(data.length / 2);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(data.slice(i * 2, i * 2 + 2), 16);
    const text = new TextDecoder().decode(bytes).replace(/\u0000/g, "").trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function readEvm(chainId, address) {
  const chain = chainById(chainId);
  if (!chain || chain.family !== "evm") return { ok: false, state: "no-soportado", transfers: [], largest: [], facts: [] };
  const code = await evmRpc(chain, "eth_getCode", [address, "latest"]);
  const balance = await evmRpc(chain, "eth_getBalance", [address, "latest"]);
  const fetchedAt = code.fetchedAt;
  if (!code.ok && !balance.ok) {
    return { ok: false, state: "requiere-atencion", chain: chainId, address, provider: chain.rpc[0], fetchedAt, transfers: [], largest: [], facts: [] };
  }
  const bytecode = code.body?.result;
  const isContract = typeof bytecode === "string" && bytecode !== "0x" && bytecode !== "0x0";
  const facts = [
    { id: "code", state: code.ok ? "comprobado" : "requiere-atencion", value: code.ok ? (isContract ? "contrato" : "sin código") : null },
    { id: "native", state: balance.ok && balance.body?.result ? "comprobado" : "requiere-atencion", value: balance.body?.result ? BigInt(balance.body.result).toString() : null, decimals: chain.native.decimals, symbol: chain.native.symbol },
  ];
  let kind = isContract ? "cuenta" : "cuenta";
  if (isContract) {
    const calls = await Promise.all(Object.entries(SELECTORS).map(async ([key, data]) => {
      const response = await evmRpc(chain, "eth_call", [{ to: address, data }, "latest"]);
      return [key, response];
    }));
    const map = Object.fromEntries(calls);
    const name = decodeAbiString(map.name?.body?.result);
    const symbol = decodeAbiString(map.symbol?.body?.result);
    const decimalsHex = map.decimals?.body?.result;
    const supplyHex = map.totalSupply?.body?.result;
    if (symbol || name || (supplyHex && supplyHex !== "0x")) kind = "token";
    facts.push(
      { id: "name", state: name ? "comprobado" : "sin-datos", value: name },
      { id: "symbol", state: symbol ? "comprobado" : "sin-datos", value: symbol },
      { id: "decimals", state: decimalsHex && decimalsHex !== "0x" ? "comprobado" : "sin-datos", value: decimalsHex && decimalsHex !== "0x" ? String(Number(BigInt(decimalsHex))) : null },
      { id: "supply", state: supplyHex && supplyHex !== "0x" ? "comprobado" : "sin-datos", value: supplyHex && supplyHex !== "0x" ? BigInt(supplyHex).toString() : null },
    );
  }
  let transfers = [];
  let provider = chain.rpc[0];
  if (chainId === "ethereum") {
    const activity = await fetchEthereumActivity(address);
    if (activity.ok) {
      transfers = activity.rows;
      provider = activity.provider || provider;
      facts.push({ id: "transfers", state: "comprobado", value: String(transfers.length) });
    }
  }
  return {
    ok: true,
    state: "comprobado",
    chain: chainId,
    address,
    kind,
    provider,
    fetchedAt,
    slot: null,
    facts,
    largest: [],
    transfers,
  };
}

export async function readBitcoin(address) {
  const hosts = [
    ["https://mempool.space", "mempool.space"],
    ["https://blockstream.info", "Blockstream"],
  ];
  let info = null;
  let txs = null;
  let provider = "mempool.space";
  for (const [origin, name] of hosts) {
    info = await fetchJson(`${origin}/api/address/${encodeURIComponent(address)}`, { headers: { accept: "application/json" }, attempts: 1 });
    txs = await fetchJson(`${origin}/api/address/${encodeURIComponent(address)}/txs`, { headers: { accept: "application/json" }, attempts: 1 });
    provider = name;
    if (info.ok) break;
  }
  if (!info?.ok) return { ok: false, state: info?.status === 429 ? "requiere-atencion" : "sin-datos", chain: "bitcoin", address, provider, fetchedAt: info?.fetchedAt, transfers: [], largest: [], facts: [] };
  const funded = finite(info.body?.chain_stats?.funded_txo_sum);
  const spent = finite(info.body?.chain_stats?.spent_txo_sum);
  const balance = funded != null && spent != null ? String(BigInt(Math.trunc(funded)) - BigInt(Math.trunc(spent))) : null;
  const transfers = [];
  if (Array.isArray(txs.body)) {
    for (const tx of txs.body.slice(0, LIMITS.maxTransactions)) {
      const from = tx?.vin?.[0]?.prevout?.scriptpubkey_address || null;
      const to = tx?.vout?.[0]?.scriptpubkey_address || null;
      const value = tx?.vout?.[0]?.value;
      transfers.push({
        id: tx.txid,
        signature: tx.txid,
        chain: "bitcoin",
        from,
        to,
        value: value == null ? null : String(value),
        decimals: 8,
        token: "BTC",
        usd: null,
        time: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
        state: from && to && value != null ? "comprobado" : "sin-datos",
        provider,
      });
    }
  }
  return {
    ok: true,
    state: "comprobado",
    chain: "bitcoin",
    address,
    kind: "cuenta",
    provider,
    fetchedAt: info.fetchedAt,
    facts: [{ id: "sats", state: balance != null ? "comprobado" : "sin-datos", value: balance, decimals: 8, symbol: "BTC" }],
    largest: [],
    transfers,
  };
}

export async function readTron(address) {
  const info = await fetchJson(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`, { headers: { accept: "application/json" } });
  const txs = await fetchJson(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}/transactions?limit=${LIMITS.maxTransactions}&only_confirmed=true`, { headers: { accept: "application/json" } });
  if (!info.ok) return { ok: false, state: info.status === 401 || info.status === 403 ? "requiere-atencion" : "sin-datos", chain: "tron", address, provider: "api.trongrid.io", fetchedAt: info.fetchedAt, transfers: [], largest: [], facts: [] };
  const row = info.body?.data?.[0];
  const balance = row && row.balance != null ? String(row.balance) : null;
  const transfers = [];
  for (const tx of txs.body?.data || []) {
    const contract = tx?.raw_data?.contract?.[0];
    const type = contract?.type;
    const value = contract?.parameter?.value || {};
    transfers.push({
      id: tx.txID,
      signature: tx.txID,
      chain: "tron",
      from: value.owner_address || null,
      to: value.to_address || null,
      value: value.amount != null ? String(value.amount) : null,
      token: type || "",
      usd: null,
      time: tx.raw_data?.timestamp ? new Date(tx.raw_data.timestamp).toISOString() : null,
      state: type === "TransferContract" && value.amount != null ? "comprobado" : "sin-datos",
      provider: "api.trongrid.io",
    });
  }
  return {
    ok: true,
    state: row ? "comprobado" : "sin-datos",
    chain: "tron",
    address,
    kind: "cuenta",
    provider: "api.trongrid.io",
    fetchedAt: info.fetchedAt,
    facts: [{ id: "sun", state: balance != null ? "comprobado" : "sin-datos", value: balance, decimals: 6, symbol: "TRX" }],
    largest: [],
    transfers: transfers.slice(0, LIMITS.maxTransactions),
  };
}

export async function readAddress(chainId, raw) {
  const found = identify(raw);
  if (found.kind === "unknown" || found.kind === "empty") return { ok: false, state: "no-soportado", transfers: [], largest: [], facts: [] };
  if (found.kind === "solana" || chainId === "solana") return readSolana(found.address);
  if (found.kind === "bitcoin" || chainId === "bitcoin") return readBitcoin(found.address);
  if (found.kind === "tron" || chainId === "tron") return readTron(found.address);
  const chain = chainById(chainId) || CHAINS.find((item) => item.family === "evm");
  return readEvm(chain?.id || "ethereum", found.address);
}

export function defillamaBlocked() {
  return {
    ok: false,
    state: "requiere-permiso",
    provider: "DeFiLlama",
    scope: "TVL, comisiones e histórico. No consultado: la cláusula 8 de los términos prohíbe republicar sin permiso.",
  };
}
