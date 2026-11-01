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
  return cached("cg:global", 60, 900, () => cg.getGlobal(env), ctx);
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
  return cached("cg:rates", 600, DAY, () => cg.getRates(env), ctx);
}
export function getVs(env, ctx) {
  return cached("cg:vs", DAY, 7 * DAY, () => cg.getSupportedVs(env), ctx, 7 * DAY);
}
export function getPlatforms(env, ctx) {
  return cached("cg:platforms", DAY, 7 * DAY, () => cg.getPlatforms(env), ctx, 7 * DAY);
}
export function getCategories(env, ctx) {
  return cached("cg:categories", 1800, 6 * 3600, () => orFallback(() => cg.getCategories(env), () => paprika.getCategories(env)), ctx);
}
export function getTrendingCg(env, ctx) {
  return cached("cg:trending", 600, 3600, () => cg.getTrending(env), ctx);
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
  const ttl = page === 1 && !query.category && !query.ids ? 60 : 600;
  const stale = page === 1 && !query.category && !query.ids ? 600 : 3600;
  const key = `cg:markets:${query.order}:${per}:${page}:${query.category || "-"}:${query.ids || "-"}`;
  return cached(key, ttl, stale, () => loadMarkets(env, query), ctx);
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
  return cached(key, 30, 600, () => cg.getSimple(env, ids), ctx);
}

export function getCoin(env, ctx, id) {
  return cached(`cg:coin:${id}`, 120, 3600, () => loadCoin(env, id), ctx);
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
  return cached(`cg:search:${q.toLowerCase()}`, 600, 3600, () => cg.getSearch(env, q), ctx);
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
  return cached(`cg:chart:${id}:${days}`, days === "1" || days === "7" ? 300 : 3600, days === "1" || days === "7" ? 3600 : DAY, () => cg.getChart(env, id, days), ctx);
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
  return cached(`cg:ohlc:${id}:${days}`, 300, 3600, () => cg.getOhlc(env, id, days), ctx);
}

export async function getRange(env, ctx, id, from, to) {
  return cached(`cg:range:${id}:${from}:${to}`, 3600, DAY, () => cg.getChartRange(env, id, from, to), ctx);
}

export function getTickers(env, ctx, id) {
  return cached(`cg:tickers:${id}`, 300, 3600, () => cg.getTickers(env, id), ctx);
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
  return cached(`cg:exchange:${id}`, 3600, DAY, () => loadExchange(env, id), ctx);
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
  return cached(`cg:exchanges:${page}`, 3600, DAY, () => loadExchangeList(env, page), ctx);
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

export async function getExchangesClassed(env, ctx) {
  const pending = exchangeJobs.get("classed");
  if (pending) return pending;
  const job = classExchanges(env, ctx).finally(() => exchangeJobs.delete("classed"));
  exchangeJobs.set("classed", job);
  return job;
}

async function classExchanges(env, ctx) {
  const list = await getExchangeList(env, ctx, 1);
  const rows = [];
  for (const row of list.rows || []) {
    if (row.centralized != null) {
      rows.push(row);
      continue;
    }
    const cached = await peek(`cg:exchange:${row.id}`);
    const usable = cached && Date.now() - Date.parse(cached.fetchedAt || "") < DAY * 1000;
    rows.push({ ...row, centralized: usable ? cached.centralized ?? null : null });
  }
  return { ...list, rows };
}

export function getExchangeTickers(env, ctx, id) {
  return cached(`cg:extickers:${id}`, 300, 3600, () => cg.getExchangeTickers(env, id), ctx);
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
