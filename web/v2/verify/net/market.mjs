/**
 * Mercado, velas y transferencias recientes.
 * Cadena real: si una fuente falla, se prueba la siguiente. No se rellenan cifras.
 * Coinbase, Kraken, Tronscan, el archivo de Binance Vision y la API de Blockscout con clave no se llaman.
 */
import { fetchJson, fetchText, withCache } from "./http.mjs";
import {
  BINANCE_INTERVALS,
  binanceKlineUrl,
  coingeckoOhlcUrl,
  geckoOhlcvUrl,
  parseBinanceKlines,
  parseCoingeckoOhlc,
  parseGeckoOhlcv,
  stepLabel,
  timeframeById,
} from "./ohlcv.mjs";

const JSON_HEADERS = { accept: "application/json" };
const GECKO_HEADERS = { accept: "application/json;version=20230203" };
const BINANCE_ORIGINS = ["https://data-api.binance.vision", "https://api.binance.com"];
const BTC_APIS = ["https://mempool.space", "https://blockstream.info"];
const OHLCV_NETWORKS = new Set(["eth", "solana", "base", "bsc", "arbitrum", "polygon_pos", "optimism", "avax"]);

const COIN_SYMBOL = {
  bitcoin: ["BTC", "BTCUSDT"],
  ethereum: ["ETH", "ETHUSDT"],
  solana: ["SOL", "SOLUSDT"],
  binancecoin: ["BNB", "BNBUSDT"],
  ripple: ["XRP", "XRPUSDT"],
  dogecoin: ["DOGE", "DOGEUSDT"],
  cardano: ["ADA", "ADAUSDT"],
  tron: ["TRX", "TRXUSDT"],
  "the-open-network": ["TON", "TONUSDT"],
  "avalanche-2": ["AVAX", "AVAXUSDT"],
  "matic-network": ["POL", "POLUSDT"],
  "polygon-ecosystem-token": ["POL", "POLUSDT"],
  chainlink: ["LINK", "LINKUSDT"],
};

function finite(value) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function failed(provider, response, scope) {
  return {
    ok: false,
    state: response?.status === 429 ? "requiere-atencion" : "sin-datos",
    provider,
    fetchedAt: response?.fetchedAt || new Date().toISOString(),
    scope,
    httpStatus: response?.status ?? 0,
  };
}

function poolFromSearch(item) {
  const address = item?.attributes?.address;
  const id = String(item?.id || "");
  if (!address || !id.endsWith(String(address))) return null;
  const network = id.slice(0, id.length - String(address).length - 1);
  if (!network) return null;
  return {
    name: String(item.attributes?.name || address),
    address: String(address),
    network,
    reserveUsd: finite(item.attributes?.reserve_in_usd),
    volumeH24: finite(item.attributes?.volume_usd?.h24),
    changeH24: finite(item.attributes?.price_change_percentage?.h24),
    provider: "GeckoTerminal",
  };
}

async function geckoTrending() {
  const response = await fetchJson("https://api.geckoterminal.com/api/v2/networks/trending_pools?page=1", { headers: GECKO_HEADERS, attempts: 2 });
  if (!response.ok || !Array.isArray(response.body?.data)) return { ...failed("GeckoTerminal", response, "Pools en tendencia"), pools: [] };
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
    scope: "Pools en tendencia",
  };
}

function pairRow(pair, fetchedAt) {
  if (!pair?.pairAddress) return null;
  const base = pair.baseToken?.symbol || "";
  const quote = pair.quoteToken?.symbol || "";
  const name = base && quote ? `${base}/${quote}` : base || quote;
  if (!name) return null;
  return {
    name,
    address: String(pair.pairAddress),
    network: String(pair.chainId || ""),
    reserveUsd: finite(pair.liquidity?.usd),
    volumeH24: finite(pair.volume?.h24),
    changeH24: finite(pair.priceChange?.h24),
    provider: "DEX Screener",
    fetchedAt,
  };
}

async function dexSearch() {
  const response = await fetchJson("https://api.dexscreener.com/latest/dex/search?q=USDC", { headers: JSON_HEADERS, attempts: 2 });
  const pairs = Array.isArray(response.body?.pairs) ? response.body.pairs : [];
  const pools = pairs.map((pair) => pairRow(pair, response.fetchedAt)).filter(Boolean).slice(0, 12);
  if (!response.ok || !pools.length) return { ...failed("DEX Screener", response, "Pares públicos"), pools };
  return { ok: true, state: "comprobado", pools, fetchedAt: response.fetchedAt, provider: "DEX Screener", scope: "Pares públicos" };
}

async function dexProfiles() {
  const response = await fetchJson("https://api.dexscreener.com/token-profiles/latest/v1", { headers: JSON_HEADERS, attempts: 1 });
  const rows = Array.isArray(response.body) ? response.body : [];
  const pools = [];
  for (const row of rows) {
    if (!row?.tokenAddress || !row?.chainId) continue;
    pools.push({
      name: String(row.description || row.tokenAddress).slice(0, 48),
      address: String(row.tokenAddress),
      network: String(row.chainId),
      reserveUsd: null,
      volumeH24: null,
      changeH24: null,
      provider: "DEX Screener",
      fetchedAt: response.fetchedAt,
    });
    if (pools.length >= 8) break;
  }
  if (!response.ok || !pools.length) return { ...failed("DEX Screener", response, "Perfiles de tokens"), pools };
  return { ok: true, state: "comprobado", pools, fetchedAt: response.fetchedAt, provider: "DEX Screener", scope: "Perfiles de tokens" };
}

export async function fetchTrendingPools() {
  return withCache("pools:trending", async () => {
    const gecko = await geckoTrending();
    if (gecko.ok) return gecko;
    const search = await dexSearch();
    if (search.ok) return search;
    const profiles = await dexProfiles();
    if (profiles.ok) return profiles;
    return gecko.pools ? gecko : search;
  });
}

export async function fetchPoolCandles(network, pool, timeframeId) {
  const frame = timeframeById(timeframeId);
  const url = geckoOhlcvUrl(network, pool, timeframeId, 200);
  if (!url) return { ok: false, state: "no-soportado", candles: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString(), scope: "Velas del pool" };
  return withCache(`ohlcv:${network}:${pool}:${timeframeId}`, async () => {
    const response = await fetchJson(url, { headers: GECKO_HEADERS, attempts: 2 });
    const parsed = parseGeckoOhlcv(response.body?.data?.attributes?.ohlcv_list);
    return {
      ok: response.ok && parsed.candles.length > 0,
      state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
      candles: parsed.candles,
      volumeKnown: parsed.volumeKnown,
      stepSeconds: null,
      provider: "GeckoTerminal",
      network,
      pool,
      timeframe: frame?.label || timeframeId,
      fetchedAt: response.fetchedAt,
      scope: `Velas ${frame?.label || timeframeId}`,
      httpStatus: response.status,
    };
  });
}

async function coingeckoCandles(coinId, days) {
  const url = coingeckoOhlcUrl(coinId, days);
  if (!url) return { ok: false, state: "no-soportado", candles: [], provider: "CoinGecko", fetchedAt: new Date().toISOString(), scope: "Velas" };
  const response = await fetchJson(url, { headers: JSON_HEADERS, attempts: 2 });
  const parsed = parseCoingeckoOhlc(response.body);
  const label = stepLabel(parsed.stepSeconds);
  return {
    ok: response.ok && parsed.candles.length > 0,
    state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
    candles: parsed.candles,
    volumeKnown: false,
    stepSeconds: parsed.stepSeconds,
    provider: "CoinGecko",
    network: coinId,
    timeframe: label || "",
    fetchedAt: response.fetchedAt,
    scope: label ? `Velas de ${label}` : "Velas",
    httpStatus: response.status,
  };
}

async function geckoCoinCandles(coinId, frameId) {
  const pair = COIN_SYMBOL[coinId];
  if (!pair) return { ok: false, state: "no-soportado", candles: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString() };
  const response = await fetchJson(`https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(pair[0])}`, { headers: GECKO_HEADERS, attempts: 1 });
  const pools = (response.body?.data || []).map(poolFromSearch).filter((pool) => pool && OHLCV_NETWORKS.has(pool.network));
  pools.sort((a, b) => (b.reserveUsd ?? 0) - (a.reserveUsd ?? 0));
  const pool = pools[0];
  if (!pool) return failed("GeckoTerminal", response, "Pool de referencia");
  const frame = timeframeById(frameId) ? frameId : "15m";
  const candles = await fetchPoolCandles(pool.network, pool.address, frame);
  return { ...candles, scope: candles.timeframe ? `Velas ${candles.timeframe}` : "Velas del pool" };
}

async function binanceCandles(coinId, frameId) {
  const symbol = COIN_SYMBOL[coinId]?.[1];
  const interval = BINANCE_INTERVALS[frameId];
  if (!symbol || !interval) return { ok: false, state: "no-soportado", candles: [], provider: "Binance", fetchedAt: new Date().toISOString(), scope: "Velas" };
  let last = null;
  for (const origin of BINANCE_ORIGINS) {
    const url = binanceKlineUrl(origin, symbol, frameId, 200);
    const response = await fetchJson(url, { headers: JSON_HEADERS, attempts: 1 });
    const parsed = parseBinanceKlines(response.body);
    last = {
      ok: response.ok && parsed.candles.length > 0,
      state: !response.ok ? (response.status === 429 ? "requiere-atencion" : "sin-datos") : parsed.candles.length ? "comprobado" : "sin-datos",
      candles: parsed.candles,
      volumeKnown: parsed.volumeKnown,
      stepSeconds: parsed.stepSeconds,
      provider: "Binance",
      network: coinId,
      timeframe: stepLabel(parsed.stepSeconds) || frameId,
      fetchedAt: response.fetchedAt,
      scope: `Velas ${frameId}`,
      httpStatus: response.status,
    };
    if (last.ok) return last;
  }
  return last || { ok: false, state: "sin-datos", candles: [], provider: "Binance", fetchedAt: new Date().toISOString(), scope: "Velas" };
}

export async function fetchCoinOhlc(coinId, days = "1", frameId = "30m") {
  const id = String(coinId || "bitcoin");
  const frame = BINANCE_INTERVALS[frameId] ? frameId : "30m";
  return withCache(`ohlc:${id}:${frame}:${days}`, async () => {
    const geckoPrice = await coingeckoCandles(id, days);
    if (geckoPrice.ok) return geckoPrice;
    const pool = await geckoCoinCandles(id, frame === "30m" ? "15m" : frame);
    if (pool.ok) return pool;
    const exchange = await binanceCandles(id, frame);
    if (exchange.ok) return exchange;
    return geckoPrice.candles ? geckoPrice : exchange;
  });
}

export async function fetchBitcoinOhlc(days = "1") {
  const frame = days === "180" || days === "365" || days === "max" ? "1D" : days === "14" || days === "30" || days === "90" ? "4h" : "30m";
  return fetchCoinOhlc("bitcoin", days, frame);
}

export async function fetchTopMarkets() {
  return withCache("markets:top", async () => {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetchJson(url, { headers: JSON_HEADERS, attempts: 2 });
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
    if (response.ok && coins.length) {
      return { ok: true, state: "comprobado", coins, provider: "CoinGecko", fetchedAt: response.fetchedAt, scope: "Ocho primeros por capitalización" };
    }
    const ticker = await fetchJson("https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT", { headers: JSON_HEADERS, attempts: 1 });
    const price = finite(ticker.body?.lastPrice);
    if (ticker.ok && price != null) {
      return {
        ok: true,
        state: "comprobado",
        coins: [{
          id: "bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          price,
          change24: finite(ticker.body?.priceChangePercent),
          marketCap: null,
          volumeH24: finite(ticker.body?.quoteVolume),
        }],
        provider: "Binance",
        fetchedAt: ticker.fetchedAt,
        scope: "Bitcoin",
      };
    }
    return { ...failed("CoinGecko", response, "Mercado"), coins };
  });
}

export async function fetchPoolTrades(network, pool) {
  if (!network || !pool || !OHLCV_NETWORKS.has(network)) {
    return { ok: false, state: "no-soportado", rows: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString(), scope: "Operaciones del pool" };
  }
  return withCache(`trades:${network}:${pool}`, async () => {
    const url = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(pool)}/trades`;
    const response = await fetchJson(url, { headers: GECKO_HEADERS, attempts: 2 });
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
      rows: rows.slice(0, 16),
      provider: "GeckoTerminal",
      fetchedAt: response.fetchedAt,
      network,
      pool,
      scope: "Operaciones recientes del pool",
    };
  });
}

export async function fetchBitcoinQuote() {
  return withCache("quote:bitcoin", async () => {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true";
    const response = await fetchJson(url, { headers: JSON_HEADERS, attempts: 2 });
    const row = response.body?.bitcoin;
    if (response.ok && finite(row?.usd) != null) {
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
        scope: "Bitcoin",
      };
    }
    const ticker = await fetchJson("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { headers: JSON_HEADERS, attempts: 1 });
    const price = finite(ticker.body?.lastPrice);
    if (ticker.ok && price != null) {
      return {
        ok: true,
        state: "comprobado",
        provider: "Binance",
        fetchedAt: ticker.fetchedAt,
        network: "bitcoin",
        usd: price,
        marketCap: null,
        volumeH24: finite(ticker.body?.quoteVolume),
        changeH24: finite(ticker.body?.priceChangePercent),
        scope: "Bitcoin",
      };
    }
    return failed("CoinGecko", response, "Bitcoin");
  });
}

export async function fetchDexSnapshot(chainId, tokenAddress) {
  const dexSlug = { solana: "solana", ethereum: "ethereum", base: "base", bnb: "bsc", arbitrum: "arbitrum", polygon: "polygon", optimism: "optimism", avalanche: "avalanche" }[chainId];
  if (!tokenAddress || !dexSlug) return { ok: false, state: "no-soportado", provider: "DEX Screener", pairs: [] };
  const url = `https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(dexSlug)}/${encodeURIComponent(tokenAddress)}`;
  const response = await fetchJson(url, { headers: JSON_HEADERS, attempts: 2 });
  const pairs = Array.isArray(response.body) ? response.body : [];
  if (!response.ok) return { ...failed("DEX Screener", response, "Pares del token"), pairs: [] };
  const rows = pairs.slice(0, 8).map((pair) => ({
    pair: pair.pairAddress || "",
    dex: pair.dexId || "",
    chain: pair.chainId || dexSlug,
    liquidityUsd: finite(pair.liquidity?.usd),
    volumeH24: finite(pair.volume?.h24),
    base: pair.baseToken?.symbol || "",
    quote: pair.quoteToken?.symbol || "",
  }));
  return { ok: true, state: rows.length ? "comprobado" : "sin-datos", provider: "DEX Screener", fetchedAt: response.fetchedAt, pairs: rows, scope: "Pares del token" };
}

export async function fetchGlobalMarket() {
  return withCache("market:global", async () => {
    const response = await fetchJson("https://api.coingecko.com/api/v3/global", { headers: JSON_HEADERS, attempts: 2 });
    const data = response.body?.data;
    const marketCap = finite(data?.total_market_cap?.usd);
    if (!response.ok || marketCap == null) return { ...failed("CoinGecko", response, "Mercado global"), marketCap: null };
    return {
      ok: true,
      state: "comprobado",
      provider: "CoinGecko",
      fetchedAt: response.fetchedAt,
      marketCap,
      volume: finite(data.total_volume?.usd),
      btcDominance: finite(data.market_cap_percentage?.btc),
      change24: finite(data.market_cap_change_percentage_24h_usd),
      scope: "Mercado global",
    };
  });
}

function ethRows(items, fetchedAt) {
  const rows = [];
  for (const item of items || []) {
    const value = finite(item?.value);
    if (value == null || value <= 0) continue;
    const rate = finite(item.exchange_rate);
    const usd = rate == null ? null : (value / 1e18) * rate;
    rows.push({
      id: item.hash,
      signature: item.hash,
      time: item.timestamp || null,
      from: item.from?.hash || null,
      to: item.to?.hash || null,
      value: String(Math.trunc(value)),
      decimals: 18,
      token: "ETH",
      usd,
      chain: "ethereum",
      provider: "Blockscout",
      state: "comprobado",
    });
  }
  rows.sort((a, b) => (b.usd ?? b.value) - (a.usd ?? a.value));
  return { ok: rows.length > 0, state: rows.length ? "comprobado" : "sin-datos", rows: rows.slice(0, 12), provider: "Blockscout", fetchedAt, scope: "Transferencias recientes de Ethereum" };
}

async function bitcoinBlockRows() {
  let last = null;
  for (const origin of BTC_APIS) {
    const tip = await fetchText(`${origin}/api/blocks/tip/hash`, { headers: JSON_HEADERS, attempts: 1 });
    const hash = String(tip.body || "").trim();
    if (!tip.ok || !/^[a-f0-9]{64}$/i.test(hash)) {
      last = failed(origin.includes("blockstream") ? "Blockstream" : "mempool.space", tip, "Bitcoin");
      continue;
    }
    const txs = await fetchJson(`${origin}/api/block/${hash}/txs/0`, { headers: JSON_HEADERS, attempts: 1 });
    const rows = [];
    for (const tx of Array.isArray(txs.body) ? txs.body : []) {
      const output = (tx.vout || []).reduce((best, row) => (Number(row?.value || 0) > Number(best?.value || 0) ? row : best), null);
      if (!output?.value) continue;
      rows.push({
        id: tx.txid,
        signature: tx.txid,
        time: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
        from: tx.vin?.[0]?.prevout?.scriptpubkey_address || null,
        to: output.scriptpubkey_address || null,
        value: String(output.value),
        decimals: 8,
        token: "BTC",
        usd: null,
        chain: "bitcoin",
        provider: origin.includes("blockstream") ? "Blockstream" : "mempool.space",
        state: "comprobado",
      });
    }
    rows.sort((a, b) => Number(b.value) - Number(a.value));
    if (rows.length) return { ok: true, state: "comprobado", rows: rows.slice(0, 8), provider: rows[0].provider, fetchedAt: txs.fetchedAt, scope: "Salidas mayores del último bloque" };
    last = failed(origin.includes("blockstream") ? "Blockstream" : "mempool.space", txs, "Bitcoin");
  }
  return last || { ok: false, state: "sin-datos", rows: [], provider: "mempool.space", fetchedAt: new Date().toISOString(), scope: "Bitcoin" };
}

export async function fetchLargeTransfers() {
  return withCache("transfers:large", async () => {
    const response = await fetchJson("https://eth.blockscout.com/api/v2/transactions?filter=validated", { headers: JSON_HEADERS, attempts: 2 });
    const eth = ethRows(response.body?.items, response.fetchedAt);
    if (response.ok && eth.ok) return eth;
    const btc = await bitcoinBlockRows();
    if (btc.ok) return btc;
    return eth.rows ? eth : btc;
  });
}

export async function fetchEthereumActivity(address) {
  if (!address) return { ok: false, rows: [] };
  const response = await fetchJson(`https://eth.blockscout.com/api/v2/addresses/${encodeURIComponent(address)}/transactions`, { headers: JSON_HEADERS, attempts: 1 });
  if (!response.ok || !Array.isArray(response.body?.items)) return { ok: false, rows: [], fetchedAt: response.fetchedAt, provider: "Blockscout" };
  const rows = [];
  for (const item of response.body.items.slice(0, 8)) {
    if (!item?.hash) continue;
    const value = finite(item.value);
    rows.push({
      id: item.hash,
      signature: item.hash,
      time: item.timestamp || null,
      from: item.from?.hash || null,
      to: item.to?.hash || null,
      value: value != null && value > 0 ? String(Math.trunc(value)) : null,
      decimals: 18,
      token: value != null && value > 0 ? "ETH" : "",
      usd: null,
      chain: "ethereum",
      provider: "Blockscout",
      state: "comprobado",
    });
  }
  return { ok: rows.length > 0, rows, fetchedAt: response.fetchedAt, provider: "Blockscout" };
}
