/**
 * Lecturas de red y de mercado. Sin claves, sin relleno y sin DeFiLlama.
 */
import { CHAINS, LIMITS, chainById, identify } from "./present.mjs";
import {
  coingeckoOhlcUrl,
  geckoOhlcvUrl,
  parseCoingeckoOhlc,
  parseGeckoOhlcv,
  timeframeById,
} from "./ohlcv.mjs";
import { bondingCurvePda, decodeCurveAccount, decodeMintAccount } from "../../shared/solana-read.js";

const TIMEOUT_MS = 8_000;

function finite(value) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: options.signal ?? controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { ok: response.ok, status: response.status, body, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 0 : 0,
      body: null,
      fetchedAt: new Date().toISOString(),
      error: error?.name === "AbortError" ? "timeout" : "red",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function solanaRpc(method, params) {
  const chain = chainById("solana");
  let last = null;
  for (const url of chain.rpc) {
    last = await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (last.ok && last.body && !last.body.error) return { ...last, provider: url };
    if (last.status !== 429 && last.status !== 403 && last.status !== 0) break;
  }
  return { ...(last || { ok: false, body: null, fetchedAt: new Date().toISOString() }), provider: chain.rpc[0] };
}

export async function fetchTrendingPools() {
  const url = "https://api.geckoterminal.com/api/v2/networks/trending_pools?page=1";
  const response = await fetchJson(url, { headers: { accept: "application/json;version=20230203" } });
  if (!response.ok || !Array.isArray(response.body?.data)) {
    return { ok: false, state: response.status === 429 ? "requiere-atencion" : "sin-datos", pools: [], fetchedAt: response.fetchedAt, provider: "GeckoTerminal", scope: "página 1 de trending_pools" };
  }
  const pools = [];
  for (const item of response.body.data) {
    const attrs = item?.attributes || {};
    if (!attrs.address || !attrs.name) continue;
    pools.push({
      name: String(attrs.name),
      address: String(attrs.address),
      network: String(item?.relationships?.network?.data?.id || ""),
      reserveUsd: finite(attrs.reserve_in_usd),
      volumeH24: finite(attrs.volume_usd?.h24),
      changeH24: finite(attrs.price_change_percentage?.h24),
      provider: "GeckoTerminal",
      fetchedAt: response.fetchedAt,
    });
  }
  return {
    ok: pools.length > 0,
    state: pools.length ? "comprobado" : "sin-datos",
    pools,
    fetchedAt: response.fetchedAt,
    provider: "GeckoTerminal",
    scope: "página 1 de trending_pools; no es el mercado completo",
  };
}

export async function fetchPoolCandles(network, pool, timeframeId) {
  const frame = timeframeById(timeframeId);
  const url = geckoOhlcvUrl(network, pool, timeframeId, 200);
  if (!url) return { ok: false, state: "no-soportado", candles: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString() };
  const response = await fetchJson(url, { headers: { accept: "application/json;version=20230203" } });
  const parsed = parseGeckoOhlcv(response.body?.data?.attributes?.ohlcv_list);
  const base = response.body?.meta?.base || {};
  return {
    ok: response.ok && parsed.candles.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
    candles: parsed.candles,
    volumeKnown: parsed.volumeKnown,
    rejected: parsed.rejected,
    droppedDuplicates: parsed.droppedDuplicates,
    provider: "GeckoTerminal",
    network,
    pool,
    timeframe: frame?.label || timeframeId,
    fetchedAt: response.fetchedAt,
    scope: `OHLCV ${frame?.label || timeframeId} del pool, hasta 200 velas, USD de GeckoTerminal. ${base.symbol ? `Base ${base.symbol}. ` : ""}Huecos no rellenados.`,
    httpStatus: response.status,
  };
}

export async function fetchBitcoinOhlc(days = "1") {
  const url = coingeckoOhlcUrl("bitcoin", days);
  const response = await fetchJson(url, { headers: { accept: "application/json" } });
  const parsed = parseCoingeckoOhlc(response.body);
  return {
    ok: response.ok && parsed.candles.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
    candles: parsed.candles,
    volumeKnown: false,
    stepSeconds: parsed.stepSeconds,
    provider: "CoinGecko",
    network: "bitcoin",
    pool: "bitcoin",
    timeframe: `days=${days}`,
    fetchedAt: response.fetchedAt,
    scope: `OHLC keyless de bitcoin, days=${days}. El paso observado es ${parsed.stepSeconds ?? "desconocido"} s. Sin volumen por vela. No es 1m salvo que el paso lo sea.`,
    httpStatus: response.status,
  };
}

export async function fetchTopMarkets() {
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h";
  const response = await fetchJson(url, { headers: { accept: "application/json" } });
  const rows = Array.isArray(response.body) ? response.body : [];
  const coins = rows.flatMap((coin) => {
    const price = finite(coin.current_price);
    if (!coin.id || price == null) return [];
    return [{
      id: String(coin.id),
      symbol: String(coin.symbol || "").toUpperCase(),
      name: String(coin.name || coin.symbol || ""),
      price,
      change24: finite(coin.price_change_percentage_24h),
      marketCap: finite(coin.market_cap),
      volumeH24: finite(coin.total_volume),
    }];
  });
  return {
    ok: response.ok && coins.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : coins.length ? "comprobado" : "sin-datos",
    coins,
    provider: "CoinGecko",
    fetchedAt: response.fetchedAt,
    scope: "coins/markets, 8 primeros por capitalización, USD. Keyless.",
  };
}

export async function fetchPoolTrades(network, pool) {
  if (!network || !pool) return { ok: false, state: "sin-datos", rows: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString() };
  const url = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(pool)}/trades`;
  const response = await fetchJson(url, { headers: { accept: "application/json;version=20230203" } });
  const rows = [];
  for (const item of response.body?.data || []) {
    const attrs = item?.attributes || {};
    if (!attrs.tx_hash) continue;
    rows.push({
      id: String(attrs.tx_hash),
      signature: String(attrs.tx_hash),
      time: attrs.block_timestamp || null,
      from: attrs.tx_from_address || null,
      to: pool,
      value: attrs.from_token_amount || null,
      token: attrs.kind || "",
      usd: finite(attrs.volume_in_usd),
      chain: network,
      provider: "GeckoTerminal",
      state: "comprobado",
    });
  }
  rows.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  return {
    ok: response.ok && rows.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : rows.length ? "comprobado" : "sin-datos",
    rows: rows.slice(0, 12),
    provider: "GeckoTerminal",
    fetchedAt: response.fetchedAt,
    network,
    pool,
    scope: "Operaciones de ese pool, las 12 de mayor volumen USD en la respuesta. No es un índice global.",
  };
}

export async function fetchCoinOhlc(coinId, days = "1") {
  const url = coingeckoOhlcUrl(coinId, days);
  const response = await fetchJson(url, { headers: { accept: "application/json" } });
  const parsed = parseCoingeckoOhlc(response.body);
  return {
    ok: response.ok && parsed.candles.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
    candles: parsed.candles,
    volumeKnown: false,
    stepSeconds: parsed.stepSeconds,
    provider: "CoinGecko",
    network: coinId,
    pool: coinId,
    timeframe: `days=${days}`,
    fetchedAt: response.fetchedAt,
    scope: `OHLC keyless de ${coinId}, days=${days}. Paso observado ${parsed.stepSeconds ?? "desconocido"} s. Sin volumen por vela.`,
    httpStatus: response.status,
  };
}

export async function fetchBitcoinQuote() {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true";
  const response = await fetchJson(url, { headers: { accept: "application/json" } });
  const row = response.body?.bitcoin;
  if (!response.ok || !row || finite(row.usd) == null) {
    return { ok: false, state: response.status === 429 ? "requiere-atencion" : "sin-datos", provider: "CoinGecko", fetchedAt: response.fetchedAt };
  }
  return {
    ok: true,
    state: "comprobado",
    provider: "CoinGecko",
    fetchedAt: response.fetchedAt,
    network: "bitcoin",
    usd: finite(row.usd),
    marketCap: finite(row.usd_market_cap),
    volumeH24: finite(row.usd_24h_vol),
    changeH24: finite(row.usd_24h_change),
    scope: "simple/price de bitcoin. La variación y el volumen son de 24 h según CoinGecko, no de una vela.",
  };
}

export async function fetchDexSnapshot(chainId, tokenAddress) {
  const dexSlug = { solana: "solana", ethereum: "ethereum", base: "base", bnb: "bsc", arbitrum: "arbitrum", polygon: "polygon", optimism: "optimism", avalanche: "avalanche" }[chainId];
  if (!tokenAddress || !dexSlug) return { ok: false, state: "no-soportado", provider: "DEX Screener" };
  const url = `https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(dexSlug)}/${encodeURIComponent(tokenAddress)}`;
  const response = await fetchJson(url, { headers: { accept: "application/json" } });
  const pairs = Array.isArray(response.body) ? response.body : [];
  if (!response.ok) return { ok: false, state: response.status === 429 ? "requiere-atencion" : "sin-datos", provider: "DEX Screener", fetchedAt: response.fetchedAt, pairs: [] };
  const rows = pairs.slice(0, 8).map((pair) => ({
    pair: pair.pairAddress || "",
    dex: pair.dexId || "",
    chain: pair.chainId || dexSlug,
    liquidityUsd: finite(pair.liquidity?.usd),
    volumeH24: finite(pair.volume?.h24),
    base: pair.baseToken?.symbol || "",
    quote: pair.quoteToken?.symbol || "",
  }));
  return {
    ok: true,
    state: rows.length ? "comprobado" : "sin-datos",
    provider: "DEX Screener",
    fetchedAt: response.fetchedAt,
    pairs: rows,
    scope: "token-pairs v1, como máximo 8 pares. Sin velas: esa API no las documenta.",
  };
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
  const url = chain.rpc[0];
  const response = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return { ...response, provider: url };
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
  facts.push({ id: "transfers", state: "no-soportado", value: null });
  return {
    ok: true,
    state: "comprobado",
    chain: chainId,
    address,
    kind,
    provider: chain.rpc[0],
    fetchedAt,
    slot: null,
    facts,
    largest: [],
    transfers: [],
    transferNote: "El RPC público no entrega un índice de transferencias. No se rellena la tabla.",
  };
}

export async function readBitcoin(address) {
  const url = `https://mempool.space/api/address/${encodeURIComponent(address)}`;
  const info = await fetchJson(url, { headers: { accept: "application/json" } });
  const txs = await fetchJson(`https://mempool.space/api/address/${encodeURIComponent(address)}/txs`, { headers: { accept: "application/json" } });
  if (!info.ok) return { ok: false, state: info.status === 429 ? "requiere-atencion" : "sin-datos", chain: "bitcoin", address, provider: "mempool.space", fetchedAt: info.fetchedAt, transfers: [], largest: [], facts: [] };
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
        provider: "mempool.space",
        scope: "primer input y primer output; no es el neto de la transacción",
      });
    }
  }
  return {
    ok: true,
    state: "comprobado",
    chain: "bitcoin",
    address,
    kind: "cuenta",
    provider: "mempool.space",
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
