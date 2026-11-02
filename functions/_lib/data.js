import { getOrRefresh, peek, putEntry } from "./cache.js";
import { budgetLeft } from "./limits.js";
import { applySeriesChanges, scaleMoney, scaleSeries } from "./normalize.js";
import * as cg from "./providers/coingecko.js";
import * as paprika from "./providers/coinpaprika.js";
import * as gt from "./providers/geckoterminal.js";
import { getFearGreed } from "./providers/alternative.js";
import { getAltseason, getCalendar, getUnlockCoin, getUnlocks } from "./providers/patternplus.js";
import { getDailyHistory, getKlines } from "./providers/binance.js";
import { getBtcFees, getEthGas } from "./providers/chain.js";

const DAY = 86400;

/** Ventanas frescas. El plan demo ronda 30 llamadas/min: esto deja la portada en 15 min
 *  y el resto más quieto, para no depender solo del contador por isolate. */
export const CACHE_FRESH = {
  markets: 900,
  marketsOther: 1800,
  coin: 3600,
  categories: 6 * 3600,
  exchanges: 6 * 3600,
  count: 86400,
  quotes: 900,
  chartShort: 1800,
  chartLong: 6 * 3600,
  global: 900,
  trending: 1800,
  rates: 6 * 3600,
  search: 1800,
};

function cached(key, ttlSec, staleSec, loader, ctx, maxAgeSec = DAY) {
  return getOrRefresh({ key, ttlSec, staleSec, maxAgeSec, loader, ctx });
}

async function orFallback(load, fallback) {
  try {
    return await load();
  } catch (error) {
    if (error?.status === 404 || error?.status === 400 || !fallback) throw error;
    return fallback();
  }
}

export function getGlobal(env, ctx) {
  return cached("cg:global", CACHE_FRESH.global, DAY, () => cg.getGlobal(env), ctx);
}

export function getAssetCount(env, ctx) {
  return cached("cg:count", CACHE_FRESH.count, 7 * DAY, () => loadCount(env, ctx), ctx, 7 * DAY);
}

const SPAN_PER = 250;
const SPAN_MAX_PAGE = 120;

export function peekMarketSpan() {
  return peek("cg:span");
}

/** Longitud real de /coins/markets, no active_cryptocurrencies. Cacheada 24 h. */
export function getMarketSpan(env, ctx) {
  return cached("cg:span", CACHE_FRESH.count, 7 * DAY, () => loadMarketSpan(env), ctx, 7 * DAY);
}

async function loadMarketSpan(env) {
  let hinted = null;
  try {
    const list = await cg.getCoinList(env);
    if (Number.isFinite(list?.count) && list.count > 0) hinted = list.count;
  } catch (error) {
    console.error("sonar-span-list", error?.status || error?.code || "fail");
  }
  const total = await measureMarkets(env, hinted);
  if (!Number.isFinite(total) || total <= 0) {
    const error = new Error("span");
    error.status = 503;
    throw error;
  }
  return {
    total,
    per: SPAN_PER,
    exact: true,
    source: "CoinGecko",
    sourceUrl: "https://www.coingecko.com/",
    attribution: "Data provided by CoinGecko",
    fetchedAt: new Date().toISOString(),
  };
}

async function pageLength(env, page, probes) {
  if (probes.n >= 8) return null;
  probes.n += 1;
  const payload = await cg.getMarkets(env, { page, per: SPAN_PER, order: "market_cap_desc", category: "", ids: "" });
  return Array.isArray(payload?.rows) ? payload.rows.length : 0;
}

async function measureMarkets(env, hinted) {
  const probes = { n: 0 };
  const per = SPAN_PER;
  let low = 1;
  let high = hinted ? Math.min(SPAN_MAX_PAGE, Math.max(1, Math.ceil(hinted / per))) : SPAN_MAX_PAGE;
  if (hinted) {
    const edge = await pageLength(env, high, probes);
    if (edge == null) return null;
    if (edge > 0 && edge < per) return (high - 1) * per + edge;
    if (edge === per) {
      if (high >= SPAN_MAX_PAGE) return null;
      const extra = await pageLength(env, high + 1, probes);
      if (extra == null) return null;
      if (extra === 0) return high * per;
      if (extra > 0 && extra < per) return high * per + extra;
      low = high + 1;
      high = SPAN_MAX_PAGE;
    } else if (edge === 0) {
      if (high <= 1) return null;
      high -= 1;
    }
  }
  let best = 0;
  let bounded = false;
  while (low <= high && probes.n < 8) {
    const page = Math.ceil((low + high) / 2);
    const n = await pageLength(env, page, probes);
    if (n == null) return null;
    if (n <= 0) {
      bounded = true;
      high = page - 1;
    } else if (n < per) {
      return (page - 1) * per + n;
    } else {
      best = Math.max(best, page * per);
      low = page + 1;
    }
  }
  if (low <= high || !bounded) return null;
  return best > 0 ? best : null;
}

async function loadCount(env, ctx) {
  const global = await getGlobal(env, ctx);
  return {
    assets: global.assets ?? null,
    source: global.source,
    sourceUrl: global.sourceUrl,
    attribution: global.attribution,
    fetchedAt: global.fetchedAt,
  };
}

export function getFear(env, ctx) {
  return cached("am:fng", 3600, DAY, () => getFearGreed(env), ctx);
}
export function getAlt(env, ctx) {
  return cached("pp:alt", 6 * 3600, 2 * DAY, () => getAltseason(env), ctx, 2 * DAY);
}
export function getGas(env, ctx) {
  return cached("chain:gas", 60, 900, () => getEthGas(env), ctx);
}
export function getFees(env, ctx) {
  return cached("chain:btc", 60, 900, () => getBtcFees(env), ctx);
}
export function getRates(env, ctx) {
  return cached("cg:rates", CACHE_FRESH.rates, DAY, () => cg.getRates(env), ctx);
}
export function getVs(env, ctx) {
  return cached("cg:vs", DAY, 7 * DAY, () => cg.getSupportedVs(env), ctx, 7 * DAY);
}
export function getPlatforms(env, ctx) {
  return cached("cg:platforms", DAY, 7 * DAY, () => cg.getPlatforms(env), ctx, 7 * DAY);
}
export function getCategories(env, ctx) {
  return cached("cg:categories", CACHE_FRESH.categories, DAY, () => orFallback(() => cg.getCategories(env), () => paprika.getCategories(env)), ctx);
}
export function getTrendingCg(env, ctx) {
  return cached("cg:trending", CACHE_FRESH.trending, DAY, () => cg.getTrending(env), ctx);
}
export function getTrendingPools(env, ctx) {
  return cached("gt:trending", 600, 3600, () => gt.trendingPools(env), ctx);
}
export function getNewPools(env, ctx) {
  return cached("gt:new", 600, 3600, () => gt.newPools(env), ctx);
}
export function getUnlockList(env, ctx) {
  return cached("pp:unlocks", 6 * 3600, 2 * DAY, () => getUnlocks(env), ctx, 2 * DAY);
}
export function getCalendarList(env, ctx) {
  return cached("pp:calendar", 6 * 3600, 2 * DAY, () => getCalendar(env), ctx, 2 * DAY);
}
export function getDerivatives(env, ctx) {
  return cached("cg:deriv", 3600, DAY, () => cg.getDerivatives(env), ctx);
}

export function getMarkets(env, ctx, query) {
  const page = query.page;
  const per = query.per;
  const hot = page === 1 && !query.category && !query.ids;
  const ttl = hot ? CACHE_FRESH.markets : CACHE_FRESH.marketsOther;
  const key = `cg:markets:${query.order}:${per}:${page}:${query.category || "-"}:${query.ids || "-"}`;
  return cached(key, ttl, DAY, () => loadMarkets(env, query), ctx);
}

async function loadMarkets(env, query) {
  return orFallback(() => cg.getMarkets(env, query), () => {
    if (query.category || query.ids || query.order === "gecko_desc" || query.order === "gecko_asc") {
      const error = new Error("upstream");
      error.status = 503;
      throw error;
    }
    return paprika.getMarkets(env, query);
  });
}

export function getQuotes(env, ctx, ids) {
  const key = `cg:quotes:${ids.slice().sort().join(",")}`;
  return cached(key, CACHE_FRESH.quotes, DAY, () => cg.getSimple(env, ids), ctx);
}

export function getCoin(env, ctx, id) {
  return cached(`cg:coin:${id}`, CACHE_FRESH.coin, DAY, () => loadCoin(env, id), ctx);
}

async function loadCoin(env, id) {
  try {
    return await cg.getCoin(env, id);
  } catch (error) {
    if (error?.status === 400) throw error;
    try {
      const alt = error?.status === 404
        ? await paprika.getCoinById(env, id)
        : await paprika.getCoinForGeckoId(env, id);
      if (alt) return alt;
    } catch {
      throw error;
    }
    if (error?.status === 404) throw error;
    const missing = new Error("not-found");
    missing.status = 404;
    throw missing;
  }
}

export function getSearch(env, ctx, q) {
  return cached(`cg:search:${q.toLowerCase()}`, CACHE_FRESH.search, DAY, () => cg.getSearch(env, q), ctx);
}

export function searchPools(env, ctx, q) {
  return cached(`gt:search:${q.toLowerCase()}`, 600, 3600, () => gt.searchPools(env, q), ctx);
}

export async function getOverview(env, ctx) {
  const jobs = {
    global: getGlobal(env, ctx),
    fear: getFear(env, ctx),
    alt: getAlt(env, ctx),
    gas: getGas(env, ctx),
    fees: getFees(env, ctx),
  };
  const out = {};
  await Promise.all(Object.entries(jobs).map(async ([name, job]) => {
    try {
      out[name] = await job;
    } catch (error) {
      console.error("sonar-overview", name, error?.status || error?.code || "fail");
      out[name] = null;
    }
  }));
  return out;
}

export async function rateFactor(env, ctx, vs) {
  if (!vs || vs === "usd") return { factor: 1, missing: false };
  const rates = await getRates(env, ctx);
  const usd = rates.rates?.usd;
  const target = rates.rates?.[vs];
  if (!usd || !target) return { factor: null, missing: true, rates };
  return { factor: target / usd, missing: false, fetchedAt: rates.fetchedAt, source: rates.source };
}

export function scaleRows(payload, factor) {
  if (!payload || factor == null || factor === 1) return payload;
  return { ...payload, rows: (payload.rows || []).map((row) => scaleMoney(row, factor)) };
}

export async function getChart(env, ctx, id, days) {
  const short = days === "1" || days === "7";
  return cached(`cg:chart:${id}:${days}`, short ? CACHE_FRESH.chartShort : CACHE_FRESH.chartLong, DAY, () => cg.getChart(env, id, days), ctx);
}

/** Una sola serie de 7 días, ya cacheada, cuando falta 1 h, 24 h o 7 d. No toca el objeto cacheado. */
export async function withWindowChanges(env, ctx, coin) {
  if (!coin?.id || (coin.ch1h != null && coin.ch24h != null && coin.ch7d != null)) return coin;
  try {
    const chart = await getChart(env, ctx, coin.id, "7");
    return applySeriesChanges(coin, chart?.prices);
  } catch {
    return coin;
  }
}

export async function getOhlc(env, ctx, id, days) {
  return cached(`cg:ohlc:${id}:${days}`, CACHE_FRESH.chartShort, DAY, () => cg.getOhlc(env, id, days), ctx);
}

export async function getRange(env, ctx, id, from, to) {
  return cached(`cg:range:${id}:${from}:${to}`, 3600, DAY, () => cg.getChartRange(env, id, from, to), ctx);
}

export function getTickers(env, ctx, id) {
  return cached(`cg:tickers:${id}`, CACHE_FRESH.chartShort, DAY, () => cg.getTickers(env, id), ctx);
}

export async function getDexPools(env, ctx, platforms) {
  const jobs = [];
  for (const [platform, address] of Object.entries(platforms || {})) {
    const network = gt.geckoNetwork(platform);
    if (!network || !address) continue;
    jobs.push(cached(`gt:pools:${network}:${address}`, 300, 3600, () => gt.tokenPools(env, network, address), ctx));
    if (jobs.length >= 3) break;
  }
  const settled = await Promise.all(jobs.map(async (job) => {
    try {
      return await job;
    } catch (error) {
      console.error("sonar-pools", error?.status || error?.code || "fail");
      return null;
    }
  }));
  const pools = [];
  let source = null;
  for (const item of settled) {
    if (!item) continue;
    source = item;
    pools.push(...(item.pools || []));
  }
  return source ? { ...source, pools } : { pools: [], source: "GeckoTerminal", attribution: "On-chain data provided by GeckoTerminal", fetchedAt: new Date().toISOString(), stale: false };
}

export function getExchange(env, ctx, id) {
  return cached(`cg:exchange:${id}`, CACHE_FRESH.exchanges, DAY, () => loadExchange(env, id), ctx);
}

async function loadExchange(env, id) {
  try {
    return await cg.getExchange(env, id);
  } catch (error) {
    if (error?.status === 400) throw error;
    try {
      const alt = await paprika.getExchange(env, id);
      if (alt) return alt;
    } catch {
      throw error;
    }
    if (error?.status === 404) throw error;
    const missing = new Error("not-found");
    missing.status = 404;
    throw missing;
  }
}

export function getExchangeList(env, ctx, page) {
  return cached(`cg:exchanges:${page}`, CACHE_FRESH.exchanges, DAY, () => loadExchangeList(env, page), ctx);
}

async function loadExchangeList(env, page) {
  return orFallback(() => cg.getExchanges(env, page), () => {
    if (page !== 1) {
      const error = new Error("upstream");
      error.status = 503;
      throw error;
    }
    return paprika.getExchanges(env);
  });
}

const exchangeJobs = new Map();

const KNOWN_DEX = new Set([
  "uniswap", "uniswap-v2", "uniswap-v3", "uniswap-v4", "sushiswap", "sushiswap-v3",
  "pancakeswap", "pancakeswap-v2", "pancakeswap-v3", "curve", "curve-finance",
  "balancer", "balancer-v1", "balancer-v2", "balancer-v3", "raydium", "raydium2",
  "orca", "jupiter", "traderjoe", "traderjoe-v2", "camelot", "camelot-v3",
  "quickswap", "quickswap-v3", "velodrome", "velodrome-v2", "aerodrome",
  "spookyswap", "spiritswap", "pangolin", "biswap", "apeswap", "mdex",
  "osmosis", "thorswap", "sunswap", "sunswap-v2", "justswap", "kyberswap",
  "kyberswap-elastic", "dodo", "dodo-bsc", "syncswap", "mute", "iziswap", "woofi",
  "hashflow", "baseswap", "swapbased", "alien-base", "thruster", "maverick",
  "maverick-protocol", "bancor", "loopring", "idex", "tokenlon", "airswap",
  "phoenix", "lifinity", "meteora", "hyperliquid", "gmx", "gmx-v2", "dydx",
  "vertex-protocol", "1inch", "oneinch", "paraswap",
]);

function normId(id) {
  return String(id || "").toLowerCase().replace(/_/g, "-");
}

function normName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getExchangeTypes(env, ctx) {
  return cached("pp:exkinds", DAY, 7 * DAY, () => paprika.getExchangeTypes(env), ctx, 7 * DAY);
}

export async function getExchangesClassed(env, ctx) {
  const pending = exchangeJobs.get("classed");
  if (pending) return pending;
  const job = classExchanges(env, ctx).finally(() => exchangeJobs.delete("classed"));
  exchangeJobs.set("classed", job);
  return job;
}

function classifyExchange(row, kinds) {
  if (row.centralized === true || row.centralized === false) return row.centralized;
  const id = normId(row.id);
  const name = normName(row.name);
  if (id && kinds?.byId && Object.prototype.hasOwnProperty.call(kinds.byId, id)) return kinds.byId[id];
  if (name && kinds?.byName && Object.prototype.hasOwnProperty.call(kinds.byName, name)) return kinds.byName[name];
  if (KNOWN_DEX.has(id)) return false;
  return null;
}

async function classExchanges(env, ctx) {
  const list = await getExchangeList(env, ctx, 1);
  let kinds = null;
  try {
    kinds = await getExchangeTypes(env, ctx);
  } catch (error) {
    console.error("sonar-exkinds", error?.status || error?.code || "fail");
  }
  const rows = (list.rows || []).map((row) => ({ ...row, centralized: classifyExchange(row, kinds) }));
  return { ...list, rows };
}

export function getExchangeTickers(env, ctx, id) {
  return cached(`cg:extickers:${id}`, CACHE_FRESH.chartShort, DAY, () => cg.getExchangeTickers(env, id), ctx);
}

export function getExchangeVolume(env, ctx, id, days) {
  return cached(`cg:exvol:${id}:${days}`, 3600, DAY, () => cg.getExchangeVolume(env, id, days), ctx);
}

const MOVERS_PAGES = 70;
const MOVERS_PER = 250;
const MOVERS_COLD = 6;
const moverJobs = new Map();

export async function getMovers(env, ctx, { period, minVol }) {
  const key = `calc:movers:${period}:${minVol}`;
  const hit = await peek(key);
  const age = hit ? Date.now() - Date.parse(hit.fetchedAt || "") : Infinity;
  if (hit && !hit.partial && age < 600_000) return { ...hit, stale: false };
  if (hit?.partial && age < 25_000) return { ...hit, stale: true };
  const pending = moverJobs.get(key);
  if (pending) return pending;
  const job = buildMovers(env, ctx, key, period, minVol).finally(() => moverJobs.delete(key));
  moverJobs.set(key, job);
  return job;
}

async function buildMovers(env, ctx, key, period, minVol) {
  const pages = [];
  let partial = false;
  let cold = 0;
  for (let page = 1; page <= MOVERS_PAGES; page += 1) {
    const marketKey = `cg:markets:market_cap_desc:${MOVERS_PER}:${page}:-:-`;
    const cached = await peek(marketKey);
    const fresh = cached && Date.now() - Date.parse(cached.fetchedAt || "") < 600_000 && Array.isArray(cached.rows);
    if (!fresh) {
      if (cold >= MOVERS_COLD) {
        partial = true;
        break;
      }
      cold += 1;
    }
    if (pages.length && budgetLeft() < 800) {
      partial = true;
      break;
    }
    try {
      const payload = fresh ? cached : await getMarkets(env, ctx, { page, per: MOVERS_PER, category: "", order: "market_cap_desc", ids: "" });
      const batch = payload.rows || [];
      pages.push(payload);
      if (batch.length < MOVERS_PER) {
        partial = false;
        break;
      }
    } catch (error) {
      console.error("sonar-movers", page, error?.status || error?.code || "fail");
      partial = pages.length > 0;
      break;
    }
  }
  const rows = pages.flatMap((page) => page.rows || []);
  if (!rows.length) {
    const error = new Error("unavailable");
    error.status = 503;
    throw error;
  }
  const field = period === "1h" ? "ch1h" : period === "7d" ? "ch7d" : "ch24h";
  const eligible = rows.filter((row) => row[field] != null && (minVol <= 0 || (row.volume24h != null && row.volume24h >= minVol)));
  const head = pages.find((page) => page?.source) || {};
  const entry = {
    source: head.source || "CoinGecko",
    sourceUrl: head.sourceUrl || "https://www.coingecko.com/",
    attribution: head.attribution || "Data provided by CoinGecko",
    fetchedAt: new Date().toISOString(),
    count: rows.length,
    partial,
    period,
    minVol,
    gainers: eligible.slice().sort((a, b) => b[field] - a[field]).slice(0, 20),
    losers: eligible.slice().sort((a, b) => a[field] - b[field]).slice(0, 20),
  };
  await putEntry(key, entry, partial ? 20 : 600, ctx);
  return { ...entry, stale: false };
}

export async function getPairs(env, ctx) {
  return cached("cg:binance-map", DAY, 7 * DAY, async () => {
    const pages = [];
    for (let page = 1; page <= 3; page += 1) {
      try {
        pages.push(await cg.getBinanceTickers(env, page));
      } catch (error) {
        console.error("sonar-pairs", page, error?.status || error?.code || "fail");
        break;
      }
    }
    const bySymbol = new Map();
    for (const page of pages) {
      for (const row of page.rows || []) {
        if (row.target !== "USDT" || !row.base || !row.coinId) continue;
        const symbol = `${row.base}USDT`;
        const prev = bySymbol.get(symbol);
        if (!prev) bySymbol.set(symbol, row.coinId);
        else if (prev !== row.coinId) bySymbol.set(symbol, null);
      }
    }
    const pairs = {};
    for (const [symbol, coinId] of bySymbol) {
      if (coinId) pairs[coinId] = symbol;
    }
    return {
      source: "CoinGecko",
      sourceUrl: "https://www.coingecko.com/",
      attribution: "Data provided by CoinGecko",
      fetchedAt: new Date().toISOString(),
      pairs,
    };
  }, ctx, 7 * DAY);
}

export async function getKlinesCached(env, ctx, symbol, interval, limit) {
  const ttl = interval.endsWith("m") ? 60 : interval === "1h" ? 300 : 3600;
  return cached(`bn:${symbol}:${interval}:${limit}`, ttl, 3600, () => getKlines(env, symbol, interval, limit), ctx);
}

export function getDailyHistoryCached(env, ctx, symbol) {
  return cached(`bn:daily:${symbol}`, 6 * 3600, DAY, () => getDailyHistory(env, symbol), ctx);
}

export function getTreasury(env, ctx, coin) {
  return cached(`cg:treasury:${coin}`, 6 * 3600, DAY, () => cg.getTreasury(env, coin), ctx);
}

export function getHistoryPrice(env, ctx, id, date) {
  return cached(`cg:history:${id}:${date}`, DAY, 7 * DAY, () => cg.getHistory(env, id, date), ctx, 7 * DAY);
}

export function getUnlockOne(env, ctx, slug) {
  return cached(`pp:unlock:${slug}`, 6 * 3600, 2 * DAY, () => getUnlockCoin(env, slug), ctx, 2 * DAY);
}

export function applyFactor(payload, factor, fields = "rows") {
  if (factor == null || factor === 1) return payload;
  if (fields === "rows") return scaleRows(payload, factor);
  if (fields === "quotes") {
    const quotes = {};
    for (const [id, row] of Object.entries(payload.quotes || {})) {
      quotes[id] = { ...row, price: row.price == null ? null : row.price * factor };
    }
    return { ...payload, quotes };
  }
  if (fields === "coin") return scaleMoney(payload, factor);
  if (fields === "series") return scaleSeries(payload, factor);
  return payload;
}

export { scaleSeries };
