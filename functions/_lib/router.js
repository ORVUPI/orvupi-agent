import * as data from "./data.js";
import { scaleSeries } from "./normalize.js";
import { allowRequest, cleanQuery, clientIp, intIn, json, oneOf, slugOk } from "./security.js";

const ORDERS = ["market_cap_desc", "market_cap_asc", "volume_desc", "volume_asc", "id_asc", "id_desc", "gecko_desc", "gecko_asc"];
const DAYS = ["1", "7", "30", "90", "365", "max"];
const PERIODS = ["1h", "24h", "7d"];
const KINDS = ["cex", "dex", "derivatives", "all"];

function cacheHeaders(ttl, stale, payload) {
  return {
    "cache-control": `public, max-age=${ttl}, stale-while-revalidate=${stale}`,
    "x-sonar-source": payload?.source || "",
    "x-sonar-fetched-at": payload?.fetchedAt || "",
  };
}

function fail(error) {
  console.error("sonar-api", error?.status || error?.code || "fail");
  if (error?.status === 404) return json(404, { ok: false, error: "not-found" });
  if (error?.status === 400) return json(400, { ok: false, error: "invalid" });
  return json(502, { ok: false, error: "unavailable" });
}

async function vsFactor(env, ctx, vs) {
  let allowed = ["usd", "eur"];
  try {
    const list = await data.getVs(env, ctx);
    if (list.codes?.length) allowed = list.codes;
  } catch (error) {
    console.error("sonar-vs", error?.status || error?.code || "fail");
  }
  if (!allowed.includes(vs)) return { error: json(400, { ok: false, error: "invalid" }) };
  try {
    const rate = await data.rateFactor(env, ctx, vs);
    return { vs, ...rate };
  } catch (error) {
    console.error("sonar-rate", error?.status || error?.code || "fail");
    return { vs, factor: vs === "usd" ? 1 : null, missing: vs !== "usd" };
  }
}

function withVs(payload, fx) {
  return { ...payload, vs: fx.missing ? "usd" : fx.vs, requestedVs: fx.vs, rateMissing: Boolean(fx.missing) };
}

const NEEDS_VS = new Set(["global", "markets", "quotes", "coin", "categories", "exchanges", "movers", "treasury"]);

export async function handle(request, env = {}, ctx = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") return json(405, { ok: false, error: "method" }, { allow: "GET, HEAD" });
  if (!allowRequest(clientIp(request))) return json(429, { ok: false, error: "rate" }, { "retry-after": "30" });
  const url = new URL(request.url);
  if (url.search.length > 2048) return json(400, { ok: false, error: "invalid" });
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const rest = parts[0] === "api" && parts[1] === "sonar" ? parts.slice(2) : parts;
  const q = url.searchParams;
  try {
    const head = rest[0] || "";
    const fx = NEEDS_VS.has(head) ? await vsOf() : { vs: "usd", factor: 1, missing: false };
    if (fx?.error) return fx.error;
    const result = await route(rest, q, fx);
    return result;
  } catch (error) {
    return fail(error);
  }

  async function vsOf() {
    const raw = (q.get("vs") || "usd").toLowerCase();
    if (!/^[a-z0-9]{2,12}$/.test(raw)) return { error: json(400, { ok: false, error: "invalid" }) };
    return vsFactor(env, ctx, raw);
  }

  async function route(path, query, fx) {
    const head = path[0] || "";
    if (head === "global" && path.length === 1) {
      const overview = await data.getOverview(env, ctx);
      if (overview.global && fx.factor && fx.factor !== 1) {
        overview.global = {
          ...overview.global,
          marketCap: overview.global.marketCap == null ? null : overview.global.marketCap * fx.factor,
          volume24h: overview.global.volume24h == null ? null : overview.global.volume24h * fx.factor,
        };
      }
      const body = { ok: true, ...withVs({ data: overview }, fx), source: "mixed", fetchedAt: overview.global?.fetchedAt || new Date().toISOString() };
      return json(200, body, cacheHeaders(60, 900, overview.global || {}));
    }
    if (head === "markets" && path.length === 1) return markets(query, fx);
    if (head === "quotes" && path.length === 1) return quotes(query, fx);
    if (head === "coin" && path.length >= 2) return coin(path, query, fx);
    if (head === "categories" && path.length === 1) return categories(fx);
    if (head === "categories" && path.length === 2) return category(path[1], query, fx);
    if (head === "exchanges" && path.length === 1) return exchanges(query, fx);
    if (head === "exchanges" && path.length === 2) return exchange(path[1], fx);
    if (head === "exchanges" && path.length === 3 && path[2] === "tickers") return exchangeTickers(path[1], fx);
    if (head === "exchanges" && path.length === 3 && path[2] === "volume") return exchangeVolume(path[1], query);
    if (head === "movers" && path.length === 1) return movers(query, fx);
    if (head === "trending" && path.length === 1) return trending();
    if (head === "new" && path.length === 1) return fresh();
    if (head === "search" && path.length === 1) return search(query);
    if (head === "suggest" && path.length === 1) return suggest();
    if (head === "calendar" && path.length === 1) return calendar(query);
    if (head === "unlocks" && path.length === 1) return unlocks(query);
    if (head === "treasury" && path.length === 2) return treasury(path[1], fx);
    if (head === "rates" && path.length === 1) return rates();
    if (head === "pairs" && path.length === 1) return pairs();
    if (head === "platforms" && path.length === 1) return platforms();
    if (head === "news" && path.length === 1) {
      return json(200, { ok: true, disabled: true, reason: "terms", data: [], source: null, fetchedAt: new Date().toISOString() }, cacheHeaders(3600, 3600, {}));
    }
    return json(404, { ok: false, error: "not-found" });
  }

  async function markets(query, fx) {
    const page = intIn(query.get("page"), 1, 400, 1);
    const per = oneOf(query.get("per"), ["50", "100", "250"], "100");
    const order = oneOf(query.get("order"), ORDERS, "market_cap_desc");
    const category = query.get("category") || "";
    const ids = query.get("ids") || "";
    if (page == null || per == null || order == null) return json(400, { ok: false, error: "invalid" });
    if (category && !slugOk(category)) return json(400, { ok: false, error: "invalid" });
    const idList = ids ? ids.split(",").filter(Boolean) : [];
    if (idList.length > 50 || idList.some((id) => !slugOk(id))) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getMarkets(env, ctx, { page, per: Number(per), category, order, ids: idList.join(",") });
    const scaled = data.scaleRows(payload, fx.missing ? 1 : fx.factor);
    return json(200, { ok: true, ...withVs(scaled, fx) }, cacheHeaders(page === 1 ? 60 : 600, 3600, payload));
  }

  async function quotes(query, fx) {
    const ids = (query.get("ids") || "").split(",").filter(Boolean);
    if (!ids.length || ids.length > 50 || ids.some((id) => !slugOk(id))) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getQuotes(env, ctx, ids);
    const scaled = data.applyFactor(payload, fx.missing ? 1 : fx.factor, "quotes");
    return json(200, { ok: true, ...withVs(scaled, fx) }, cacheHeaders(30, 600, payload));
  }

  async function coin(path, query, fx) {
    const id = path[1];
    if (!slugOk(id)) return json(400, { ok: false, error: "invalid" });
    const sub = path[2] || "";
    if (!sub) {
      const payload = data.applyFactor(await data.getCoin(env, ctx, id), fx.missing ? 1 : fx.factor, "coin");
      return json(200, { ok: true, ...withVs(payload, fx) }, cacheHeaders(120, 3600, payload));
    }
    if (sub === "chart") return chart(id, query, fx);
    if (sub === "ohlc") return ohlc(id, query, fx);
    if (sub === "tickers") return tickers(id, query);
    if (sub === "history") return history(id, query, fx);
    if (sub === "unlocks") {
      const payload = await data.getUnlockOne(env, ctx, id);
      return json(200, { ok: true, ...payload }, cacheHeaders(6 * 3600, 86400, payload));
    }
    return json(404, { ok: false, error: "not-found" });
  }

  async function chart(id, query, fx) {
    const days = oneOf(query.get("days"), DAYS, null);
    if (!days) return json(400, { ok: false, error: "invalid" });
    if (days === "max" || query.get("interval") === "1h") {
      const pair = await pairFor(id);
      if (pair && (days === "max" || query.get("interval") === "1h")) {
        const interval = query.get("interval") === "1h" ? "1m" : "1d";
        const candles = interval === "1d"
          ? await data.getDailyHistoryCached(env, ctx, pair)
          : await data.getKlinesCached(env, ctx, pair, interval, 60);
        const points = candles.points.map((row) => [row.time, row.close]);
        const factor = fx.missing ? 1 : fx.factor;
        return json(200, {
          ok: true,
          ...withVs({
            source: candles.source,
            sourceUrl: candles.sourceUrl,
            attribution: candles.attribution,
            fetchedAt: candles.fetchedAt,
            stale: candles.stale,
            kind: "price",
            interval,
            points: factor === 1 ? points : points.map(([t, v]) => [t, v * factor]),
            maxRangeNote: null,
          }, fx),
        }, cacheHeaders(60, 3600, candles));
      }
      if (days === "max") {
        const payload = await data.getChart(env, ctx, id, "365");
        return json(200, {
          ok: true,
          ...withVs(seriesPayload(payload, "prices", fx, "max-year"), fx),
        }, cacheHeaders(3600, 86400, payload));
      }
    }
    const payload = await data.getChart(env, ctx, id, days);
    return json(200, { ok: true, ...withVs(seriesPayload(payload, "prices", fx), fx) }, cacheHeaders(days === "1" || days === "7" ? 300 : 3600, 3600, payload));
  }

  function seriesPayload(payload, field, fx, note) {
    const factor = fx.missing ? 1 : fx.factor;
    const points = (payload[field] || []).map(([t, v]) => [t, factor == null || factor === 1 || v == null ? v : v * factor]);
    return {
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      attribution: payload.attribution,
      fetchedAt: payload.fetchedAt,
      stale: payload.stale,
      kind: field === "marketCaps" ? "mcap" : field === "volumes" ? "volume" : "price",
      interval: payload.days,
      points,
      maxRangeNote: note || null,
    };
  }

  async function ohlc(id, query, fx) {
    const days = oneOf(query.get("days"), ["1", "7", "30", "90", "365"], "1");
    if (!days) return json(400, { ok: false, error: "invalid" });
    const pair = await pairFor(id);
    if (pair && (days === "1" || days === "7" || query.get("source") === "binance")) {
      const interval = days === "1" ? "15m" : days === "7" ? "1h" : days === "30" ? "4h" : "1d";
      const limit = days === "365" ? 365 : days === "90" ? 180 : days === "30" ? 180 : days === "7" ? 168 : 96;
      const candles = await data.getKlinesCached(env, ctx, pair, interval, limit);
      const factor = fx.missing ? 1 : (fx.factor || 1);
      return json(200, {
        ok: true,
        ...withVs({
          source: candles.source,
          sourceUrl: candles.sourceUrl,
          attribution: candles.attribution,
          fetchedAt: candles.fetchedAt,
          stale: candles.stale,
          kind: "ohlc",
          interval,
          points: candles.points.map((row) => [row.time, row.open * factor, row.high * factor, row.low * factor, row.close * factor, row.volume]),
        }, fx),
      }, cacheHeaders(300, 3600, candles));
    }
    const payload = await data.getOhlc(env, ctx, id, days);
    const factor = fx.missing ? 1 : (fx.factor || 1);
    const points = payload.points.map((row) => [row[0], ...row.slice(1).map((value) => (value == null ? null : value * factor))]);
    return json(200, {
      ok: true,
      ...withVs({
        source: payload.source,
        sourceUrl: payload.sourceUrl,
        attribution: payload.attribution,
        fetchedAt: payload.fetchedAt,
        stale: payload.stale,
        kind: "ohlc",
        interval: days,
        points,
        volumeNote: "ohlc-volume",
      }, fx),
    }, cacheHeaders(300, 3600, payload));
  }

  async function tickers(id, query) {
    const type = oneOf(query.get("type"), ["cex", "dex", "all"], "all");
    if (!type) return json(400, { ok: false, error: "invalid" });
    const [spot, coin] = await Promise.all([
      data.getTickers(env, ctx, id),
      type === "cex" ? null : data.getCoin(env, ctx, id).catch(() => null),
    ]);
    let dex = [];
    if (type !== "cex" && coin?.platforms) dex = (await data.getDexPools(env, ctx, coin.platforms)).pools || [];
    return json(200, { ok: true, spot, dex, type }, cacheHeaders(300, 3600, spot));
  }

  async function history(id, query, fx) {
    const from = intIn(query.get("from"), 1_000_000_000, 4_000_000_000, null);
    const to = intIn(query.get("to"), 1_000_000_000, 4_000_000_000, null);
    if (from && to && from < to) {
      const payload = await data.getRange(env, ctx, id, from, to);
      const factor = fx.missing ? 1 : fx.factor;
      return json(200, { ok: true, ...withVs(scaleSeries({ ...payload, kind: "price", points: payload.prices }, factor), fx) }, cacheHeaders(3600, 86400, payload));
    }
    const days = oneOf(query.get("days"), ["30", "90", "365"], "90");
    const [ohlcPayload, chart] = await Promise.all([
      data.getOhlc(env, ctx, id, days === "30" ? "30" : days === "90" ? "90" : "365"),
      data.getChart(env, ctx, id, days),
    ]);
    const volumes = new Map((chart.volumes || []).map(([t, v]) => [dayKey(t), v]));
    const factor = fx.missing ? 1 : (fx.factor || 1);
    const rows = ohlcPayload.points.map(([time, open, high, low, close]) => ({
      time,
      open: open == null ? null : open * factor,
      high: high == null ? null : high * factor,
      low: low == null ? null : low * factor,
      close: close == null ? null : close * factor,
      volume: volumes.get(dayKey(time)) ?? null,
    }));
    return json(200, {
      ok: true,
      ...withVs({
        source: ohlcPayload.source,
        sourceUrl: ohlcPayload.sourceUrl,
        attribution: ohlcPayload.attribution,
        fetchedAt: ohlcPayload.fetchedAt,
        stale: ohlcPayload.stale,
        rows,
        volumeNote: "volume-day",
      }, fx),
    }, cacheHeaders(3600, 86400, ohlcPayload));
  }

  async function categories(fx) {
    const [payload, global] = await Promise.all([
      data.getCategories(env, ctx),
      data.getGlobal(env, ctx).catch(() => null),
    ]);
    const cap = global?.marketCap && fx.factor ? global.marketCap * (fx.missing ? 1 : fx.factor) : global?.marketCap;
    const rows = (payload.rows || []).map((row) => {
      const marketCap = row.marketCap == null ? null : row.marketCap * (fx.missing ? 1 : (fx.factor || 1));
      const volume24h = row.volume24h == null ? null : row.volume24h * (fx.missing ? 1 : (fx.factor || 1));
      return {
        ...row,
        marketCap,
        volume24h,
        dominance: marketCap != null && cap ? (marketCap / cap) * 100 : null,
        dominanceBasis: "capitalización de la categoría / capitalización total",
      };
    });
    return json(200, { ok: true, ...withVs({ ...payload, rows }, fx) }, cacheHeaders(1800, 6 * 3600, payload));
  }

  async function category(id, query, fx) {
    if (!slugOk(id)) return json(400, { ok: false, error: "invalid" });
    const page = intIn(query.get("page"), 1, 400, 1);
    if (page == null) return json(400, { ok: false, error: "invalid" });
    const per = oneOf(query.get("per"), ["50", "100", "250"], "100");
    const [directory, markets] = await Promise.all([
      data.getCategories(env, ctx),
      data.getMarkets(env, ctx, { page, per: Number(per || 100), category: id, order: "market_cap_desc", ids: "" }),
    ]);
    const found = (directory.rows || []).find((row) => row.id === id) || null;
    if (!found && markets.rows?.length === 0) return json(404, { ok: false, error: "not-found" });
    const factor = fx.missing ? 1 : (fx.factor || 1);
    const scaled = data.scaleRows(markets, factor);
    const { category: ignoredCategory, ...marketRest } = scaled;
    void ignoredCategory;
    const categoryRow = found ? {
      ...found,
      marketCap: found.marketCap == null ? null : found.marketCap * factor,
      volume24h: found.volume24h == null ? null : found.volume24h * factor,
    } : null;
    return json(200, { ok: true, ...withVs({ ...marketRest, category: categoryRow }, fx) }, cacheHeaders(300, 3600, markets));
  }

  async function exchanges(query, fx) {
    const type = oneOf(query.get("type"), KINDS, "all");
    if (!type) return json(400, { ok: false, error: "invalid" });
    if (type === "derivatives") {
      const payload = await data.getDerivatives(env, ctx);
      const btc = await btcUsd(fx);
      const rows = payload.rows.map((row) => ({
        ...row,
        volume24h: row.volume24hBtc == null || btc == null ? null : row.volume24hBtc * btc,
        openInterest: row.openInterestBtc == null || btc == null ? null : row.openInterestBtc * btc,
      }));
      return json(200, { ok: true, ...withVs({ ...payload, rows, type }, fx) }, cacheHeaders(3600, 86400, payload));
    }
    const payload = await data.getExchangesClassed(env, ctx);
    const btc = await btcUsd(fx);
    let rows = payload.rows.map((row) => ({
      ...row,
      volume24h: row.volume24hBtc == null || btc == null ? null : row.volume24hBtc * btc,
    }));
    if (type === "cex") rows = rows.filter((row) => row.centralized === true);
    if (type === "dex") rows = rows.filter((row) => row.centralized === false);
    const total = rows.reduce((sum, row) => sum + (row.volume24h || 0), 0);
    rows = rows.map((row) => ({
      ...row,
      sharePct: row.volume24h != null && total > 0 ? (row.volume24h / total) * 100 : null,
      shareBasis: "porcentaje sobre la suma de esta lista",
    }));
    return json(200, { ok: true, ...withVs({ ...payload, rows, type }, fx) }, cacheHeaders(3600, 86400, payload));
  }

  async function exchange(id, fx) {
    if (!slugOk(id)) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getExchange(env, ctx, id);
    const btc = await btcUsd(fx);
    return json(200, {
      ok: true,
      ...withVs({ ...payload, volume24h: payload.volume24hBtc == null || btc == null ? null : payload.volume24hBtc * btc }, fx),
    }, cacheHeaders(3600, 86400, payload));
  }

  async function exchangeTickers(id, fx) {
    if (!slugOk(id)) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getExchangeTickers(env, ctx, id);
    const factor = fx.missing ? 1 : (fx.factor || 1);
    const rows = (payload.rows || []).map((row) => ({
      ...row,
      price: row.price == null ? null : row.price * factor,
      volume24h: row.volume24h == null ? null : row.volume24h * factor,
      depthUp2: row.depthUp2 == null ? null : row.depthUp2 * factor,
      depthDown2: row.depthDown2 == null ? null : row.depthDown2 * factor,
    }));
    return json(200, { ok: true, ...withVs({ ...payload, rows }, fx) }, cacheHeaders(300, 3600, payload));
  }

  async function exchangeVolume(id, query) {
    if (!slugOk(id)) return json(400, { ok: false, error: "invalid" });
    const days = oneOf(query.get("days"), ["1", "7", "14", "30", "90", "365"], "7");
    if (!days) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getExchangeVolume(env, ctx, id, days);
    return json(200, { ok: true, ...payload, kind: "volume-btc", points: payload.points }, cacheHeaders(3600, 86400, payload));
  }

  async function movers(query, fx) {
    const period = oneOf(query.get("period"), PERIODS, "24h");
    const minVol = intIn(query.get("minVol"), 0, 1_000_000_000, 50000);
    if (!period || minVol == null) return json(400, { ok: false, error: "invalid" });
    const payload = await data.getMovers(env, ctx, { period, minVol });
    const factor = fx.missing ? 1 : (fx.factor || 1);
    const ttl = payload.partial ? 20 : 120;
    return json(200, {
      ok: true,
      ...withVs({
        ...payload,
        gainers: (payload.gainers || []).map((row) => data.applyFactor(row, factor, "coin")),
        losers: (payload.losers || []).map((row) => data.applyFactor(row, factor, "coin")),
      }, fx),
    }, cacheHeaders(ttl, payload.partial ? 60 : 900, payload));
  }

  async function trending() {
    const [searches, pools] = await Promise.all([
      data.getTrendingCg(env, ctx).catch((error) => { console.error("sonar-trend", error?.status || "fail"); return null; }),
      data.getTrendingPools(env, ctx).catch((error) => { console.error("sonar-pools", error?.status || "fail"); return null; }),
    ]);
    return json(200, { ok: true, searches, pools }, cacheHeaders(600, 3600, searches || {}));
  }

  async function fresh() {
    const payload = await data.getNewPools(env, ctx);
    return json(200, { ok: true, ...payload, note: "new-pools" }, cacheHeaders(600, 3600, payload));
  }

  async function search(query) {
    const text = cleanQuery(query.get("q"));
    if (!text) return json(400, { ok: false, error: "invalid" });
    const [coins, pools] = await Promise.all([
      data.getSearch(env, ctx, text).catch((error) => { console.error("sonar-search", error?.status || "fail"); return null; }),
      data.searchPools(env, ctx, text).catch((error) => { console.error("sonar-search-pool", error?.status || "fail"); return null; }),
    ]);
    return json(200, { ok: true, coins, pools }, cacheHeaders(600, 3600, coins || {}));
  }

  async function suggest() {
    const [trending, markets, pools] = await Promise.all([
      data.getTrendingCg(env, ctx).catch(() => null),
      data.getMarkets(env, ctx, { page: 1, per: 100, category: "", order: "market_cap_desc", ids: "" }).catch(() => null),
      data.getTrendingPools(env, ctx).catch(() => null),
    ]);
    const rows = (markets?.rows || []).filter((row) => row.ch24h != null && (row.volume24h || 0) >= 50000);
    return json(200, {
      ok: true,
      trending,
      pools,
      gainers: rows.slice().sort((a, b) => b.ch24h - a.ch24h).slice(0, 3),
      losers: rows.slice().sort((a, b) => a.ch24h - b.ch24h).slice(0, 3),
      note: "Subidas y bajadas de esta vista: las 100 mayores con volumen de al menos 50 000 USD.",
    }, cacheHeaders(120, 900, trending || {}));
  }

  async function calendar(query) {
    const payload = await data.getCalendarList(env, ctx);
    const kind = query.get("kind") || "";
    const from = query.get("from") || "";
    const to = query.get("to") || "";
    if (kind && !/^[a-z0-9_-]{1,40}$/.test(kind)) return json(400, { ok: false, error: "invalid" });
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) return json(400, { ok: false, error: "invalid" });
    const rows = (payload.rows || []).filter((row) => {
      if (kind && row.kind !== kind) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      return true;
    });
    return json(200, { ok: true, ...payload, rows }, cacheHeaders(6 * 3600, 2 * 86400, payload));
  }

  async function unlocks(query) {
    const payload = await data.getUnlockList(env, ctx);
    const coin = query.get("coin") || "";
    if (coin && !slugOk(coin)) return json(400, { ok: false, error: "invalid" });
    const rows = coin ? (payload.rows || []).filter((row) => row.coinId === coin || (row.symbol || "").toLowerCase() === coin) : payload.rows;
    return json(200, { ok: true, ...payload, rows }, cacheHeaders(6 * 3600, 2 * 86400, payload));
  }

  async function treasury(coin, fx) {
    if (coin !== "bitcoin" && coin !== "ethereum") return json(400, { ok: false, error: "invalid" });
    const payload = await data.getTreasury(env, ctx, coin);
    const factor = fx.missing ? 1 : (fx.factor || 1);
    return json(200, {
      ok: true,
      ...withVs({
        ...payload,
        totalValueUsd: payload.totalValueUsd == null ? null : payload.totalValueUsd * factor,
        companies: (payload.companies || []).map((row) => ({ ...row, valueUsd: row.valueUsd == null ? null : row.valueUsd * factor })),
      }, fx),
    }, cacheHeaders(6 * 3600, 86400, payload));
  }

  async function rates() {
    const payload = await data.getRates(env, ctx);
    return json(200, { ok: true, ...payload }, cacheHeaders(600, 86400, payload));
  }

  async function pairs() {
    const payload = await data.getPairs(env, ctx);
    return json(200, { ok: true, ...payload }, cacheHeaders(86400, 7 * 86400, payload));
  }

  async function platforms() {
    const payload = await data.getPlatforms(env, ctx);
    return json(200, { ok: true, ...payload }, cacheHeaders(86400, 7 * 86400, payload));
  }

  async function pairFor(id) {
    try {
      const map = await data.getPairs(env, ctx);
      return map.pairs?.[id] || null;
    } catch {
      return null;
    }
  }

  async function btcUsd(fx) {
    try {
      const rates = await data.getRates(env, ctx);
      const usd = rates.rates?.usd;
      if (!usd) return null;
      return usd * (fx.missing ? 1 : (fx.factor || 1));
    } catch {
      return null;
    }
  }
}

function dayKey(ms) {
  if (ms == null) return "";
  return new Date(ms).toISOString().slice(0, 10);
}
