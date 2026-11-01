import { getJson } from "../limits.js";
import { disabledSet, httpsUrl, imageUrl, publicHandle, webUrl } from "../security.js";
import { coinRow, num, plainFromHtml, stamp, text } from "../normalize.js";

const ATTR = "Data provided by CoinGecko";
const HOME = "https://www.coingecko.com/";

export function coingeckoBase(env) {
  return String(env?.CG_API_TIER || "").toLowerCase() === "pro" && env?.CG_API_KEY
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
}

export function coingeckoHeaders(env) {
  const out = {
    accept: "application/json",
    "user-agent": "ORVUPI-Sonar/1.0 (+https://orvupi.com/sonar/)",
  };
  const key = env?.CG_API_KEY;
  if (!key) return out;
  if (String(env?.CG_API_TIER || "demo").toLowerCase() === "pro") out["x-cg-pro-api-key"] = key;
  else out["x-cg-demo-api-key"] = key;
  return out;
}

async function cg(env, path) {
  if (disabledSet(env).has("coingecko")) {
    const error = new Error("disabled");
    error.code = "disabled";
    throw error;
  }
  return getJson(`${coingeckoBase(env)}${path}`, { headers: coingeckoHeaders(env), provider: "coingecko" });
}

function meta(extra) {
  return stamp("CoinGecko", HOME, ATTR, extra);
}

export async function getGlobal(env) {
  const body = await cg(env, "/global");
  const data = body?.data || {};
  return meta({
    marketCap: num(data.total_market_cap?.usd),
    volume24h: num(data.total_volume?.usd),
    change24h: num(data.market_cap_change_percentage_24h_usd),
    dominance: {
      btc: num(data.market_cap_percentage?.btc),
      eth: num(data.market_cap_percentage?.eth),
    },
    assets: num(data.active_cryptocurrencies),
    markets: num(data.markets),
    updatedAt: num(data.updated_at),
  });
}

export async function getMarkets(env, { page = 1, per = 100, category = "", order = "market_cap_desc", ids = "" } = {}) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order,
    per_page: String(per),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "1h,24h,7d,30d",
  });
  if (category) params.set("category", category);
  if (ids) params.set("ids", ids);
  const body = await cg(env, `/coins/markets?${params}`);
  const rows = Array.isArray(body) ? body.filter((row) => row?.id).map((row) => ({ ...coinRow(row), image: imageUrl(row.image) })) : [];
  return meta({ page, per, category: category || null, order, rows });
}

export async function getSimple(env, ids) {
  const params = new URLSearchParams({ ids: ids.join(","), vs_currencies: "usd", include_24hr_change: "true" });
  const body = await cg(env, `/simple/price?${params}`);
  const quotes = {};
  for (const id of ids) {
    const row = body?.[id];
    if (!row) continue;
    quotes[id] = { price: num(row.usd), ch24h: num(row.usd_24h_change) };
  }
  return meta({ quotes });
}

function linkList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => webUrl(value)).filter(Boolean).slice(0, 12);
}

export async function getCoin(env, id) {
  const params = "localization=true&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false";
  const body = await cg(env, `/coins/${encodeURIComponent(id)}?${params}`);
  if (!body?.id) {
    const error = new Error("not-found");
    error.status = 404;
    throw error;
  }
  const market = body.market_data || {};
  const descriptions = body.description || {};
  const spanish = plainFromHtml(descriptions.es);
  const english = plainFromHtml(descriptions.en);
  const links = body.links || {};
  const whitepaper = typeof links.whitepaper === "string" ? links.whitepaper : links.whitepaper?.link;
  const platforms = {};
  for (const [key, value] of Object.entries(body.platforms || {})) {
    const address = chainAddress(value);
    if (address) platforms[key] = address;
  }
  const row = coinRow({
    id: body.id,
    symbol: body.symbol,
    name: body.name,
    image: body.image?.large || body.image?.small,
    market_cap_rank: market.market_cap_rank,
    current_price: market.current_price?.usd,
    market_cap: market.market_cap?.usd,
    fully_diluted_valuation: market.fully_diluted_valuation?.usd,
    total_volume: market.total_volume?.usd,
    high_24h: market.high_24h?.usd,
    low_24h: market.low_24h?.usd,
    price_change_percentage_1h_in_currency: market.price_change_percentage_1h_in_currency?.usd,
    price_change_percentage_24h_in_currency: market.price_change_percentage_24h_in_currency?.usd ?? market.price_change_percentage_24h,
    price_change_percentage_7d_in_currency: market.price_change_percentage_7d_in_currency?.usd,
    price_change_percentage_30d_in_currency: market.price_change_percentage_30d_in_currency?.usd,
    circulating_supply: market.circulating_supply,
    total_supply: market.total_supply,
    max_supply: market.max_supply,
    ath: market.ath?.usd,
    ath_change_percentage: market.ath_change_percentage?.usd,
    ath_date: market.ath_date?.usd,
    atl: market.atl?.usd,
    atl_change_percentage: market.atl_change_percentage?.usd,
    atl_date: market.atl_date?.usd,
  });
  return meta({
    ...row,
    image: imageUrl(row.image),
    priceBtc: body.id === "bitcoin" ? 1 : num(market.current_price?.btc),
    ch1y: num(market.price_change_percentage_1y_in_currency?.usd ?? market.price_change_percentage_1y),
    categories: Array.isArray(body.categories) ? body.categories.filter((item) => typeof item === "string").slice(0, 24) : [],
    description: spanish || english,
    descriptionLang: spanish ? "es" : english ? "en" : null,
    genesisDate: text(body.genesis_date, 20),
    links: {
      homepage: linkList(links.homepage),
      whitepaper: webUrl(whitepaper),
      explorers: linkList(links.blockchain_site),
      forum: linkList(links.official_forum_url),
      chat: linkList(links.chat_url),
      announcement: linkList(links.announcement_url),
      twitter: socialUrl("https://x.com/", publicHandle(links.twitter_screen_name, /^[A-Za-z0-9_]{1,15}$/)),
      telegram: socialUrl("https://t.me/", telegramHandle(links.telegram_channel_identifier)),
      reddit: httpsUrl(links.subreddit_url),
      facebook: socialUrl("https://www.facebook.com/", publicHandle(links.facebook_username, /^[A-Za-z0-9.]{1,50}$/)),
      github: linkList(links.repos_url?.github),
    },
    followers: {
      twitter: num(body.community_data?.twitter_followers),
      telegram: num(body.community_data?.telegram_channel_user_count),
      reddit: num(body.community_data?.reddit_subscribers),
    },
    platforms,
    sentimentUp: num(body.sentiment_votes_up_percentage),
  });
}

export async function getChart(env, id, days) {
  const body = await cg(env, `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}`);
  return meta({
    prices: pairs(body?.prices),
    marketCaps: pairs(body?.market_caps),
    volumes: pairs(body?.total_volumes),
    days: String(days),
  });
}

export async function getChartRange(env, id, from, to) {
  const body = await cg(env, `/coins/${encodeURIComponent(id)}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`);
  return meta({ prices: pairs(body?.prices), volumes: pairs(body?.total_volumes) });
}

export async function getOhlc(env, id, days) {
  const body = await cg(env, `/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${encodeURIComponent(days)}`);
  const points = Array.isArray(body)
    ? body.map((row) => [num(row[0]), num(row[1]), num(row[2]), num(row[3]), num(row[4])]).filter((row) => row[0] != null)
    : [];
  return meta({ points, days: String(days) });
}

export async function getTickers(env, id) {
  const body = await cg(env, `/coins/${encodeURIComponent(id)}/tickers?depth=true&order=volume_desc&include_exchange_logo=false&page=1`);
  const rows = Array.isArray(body?.tickers) ? body.tickers.slice(0, 80).map(ticker) : [];
  return meta({ rows });
}

function ticker(raw) {
  return {
    exchangeId: raw.market?.identifier || null,
    exchangeName: text(raw.market?.name, 80),
    base: raw.base || null,
    target: raw.target || null,
    coinId: raw.coin_id || null,
    price: num(raw.converted_last?.usd),
    volume24h: num(raw.converted_volume?.usd),
    spreadPct: num(raw.bid_ask_spread_percentage),
    depthUp2: num(raw.cost_to_move_up_usd),
    depthDown2: num(raw.cost_to_move_down_usd),
    trust: raw.trust_score == null || raw.trust_score === "" ? null : String(raw.trust_score),
    lastTradedAt: text(raw.last_traded_at, 40),
    tradeUrl: httpsUrl(raw.trade_url),
  };
}

export async function getCategories(env) {
  const body = await cg(env, "/coins/categories");
  const rows = Array.isArray(body) ? body.filter((row) => row?.id).map((row) => ({
    id: row.id,
    name: text(row.name, 120) || row.id,
    marketCap: num(row.market_cap),
    change24h: num(row.market_cap_change_24h),
    volume24h: num(row.volume_24h),
    top3: Array.isArray(row.top_3_coins) ? row.top_3_coins.map(imageUrl).filter(Boolean).slice(0, 3) : [],
  })) : [];
  return meta({ rows });
}

export async function getExchanges(env, page = 1) {
  const body = await cg(env, `/exchanges?per_page=100&page=${page}`);
  const rows = Array.isArray(body) ? body.filter((row) => row?.id).map(exchangeRow) : [];
  return meta({ rows, page });
}

export async function getExchange(env, id) {
  const body = await cg(env, `/exchanges/${encodeURIComponent(id)}`);
  if (!body || body.error || (!body.name && !body.trade_volume_24h_btc && !body.tickers)) {
    const error = new Error("not-found");
    error.status = 404;
    throw error;
  }
  return meta({
    ...exchangeRow({ ...body, id: body.id || id }),
    centralized: typeof body.centralized === "boolean" ? body.centralized : null,
    coins: num(body.coins),
    pairs: num(body.pairs),
    description: plainFromHtml(body.description),
    url: httpsUrl(body.url),
    facebook: httpsUrl(body.facebook_url),
    reddit: httpsUrl(body.reddit_url),
    telegram: httpsUrl(body.telegram_url),
    twitter: socialUrl("https://x.com/", publicHandle(body.twitter_handle, /^[A-Za-z0-9_]{1,15}$/)),
  });
}

function exchangeRow(raw) {
  return {
    id: raw.id,
    name: text(raw.name, 120) || raw.id,
    image: imageUrl(raw.image),
    country: text(raw.country, 80),
    year: num(raw.year_established),
    volume24hBtc: num(raw.trade_volume_24h_btc),
    trustScore: num(raw.trust_score),
    trustRank: num(raw.trust_score_rank),
    url: httpsUrl(raw.url),
  };
}

export async function getExchangeTickers(env, id) {
  const body = await cg(env, `/exchanges/${encodeURIComponent(id)}/tickers?depth=true&order=volume_desc&page=1`);
  const rows = Array.isArray(body?.tickers) ? body.tickers.slice(0, 80).map(ticker) : [];
  return meta({ rows });
}

export async function getExchangeVolume(env, id, days) {
  const body = await cg(env, `/exchanges/${encodeURIComponent(id)}/volume_chart?days=${encodeURIComponent(days)}`);
  return meta({ points: pairs(body), days: String(days) });
}

export async function getDerivatives(env) {
  const body = await cg(env, "/derivatives/exchanges?per_page=100");
  const rows = Array.isArray(body) ? body.filter((row) => row?.id || row?.name).map((row) => ({
    id: row.id || null,
    name: text(row.name, 120),
    image: imageUrl(row.image),
    country: text(row.country, 80),
    year: num(row.year_established),
    openInterestBtc: num(row.open_interest_btc),
    volume24hBtc: num(row.trade_volume_24h_btc),
    perpetual: num(row.number_of_perpetual_pairs),
    futures: num(row.number_of_futures_pairs),
    url: httpsUrl(row.url),
  })) : [];
  return meta({ rows });
}

export async function getSearch(env, query) {
  const body = await cg(env, `/search?query=${encodeURIComponent(query)}`);
  return meta({
    coins: (body?.coins || []).slice(0, 12).map((row) => ({
      id: row.id,
      name: text(row.name, 120),
      symbol: String(row.symbol || "").toUpperCase(),
      rank: num(row.market_cap_rank),
      image: imageUrl(row.large || row.thumb),
    })).filter((row) => row.id),
    exchanges: (body?.exchanges || []).slice(0, 8).map((row) => ({
      id: row.id,
      name: text(row.name, 120),
      image: imageUrl(row.large || row.thumb),
    })).filter((row) => row.id),
    categories: (body?.categories || []).slice(0, 8).map((row) => ({
      id: row.id,
      name: text(row.name, 120),
    })).filter((row) => row.id),
  });
}

export async function getTrending(env) {
  const body = await cg(env, "/search/trending");
  const coins = (body?.coins || []).map((entry) => {
    const item = entry.item || {};
    return {
      id: item.id,
      name: text(item.name, 120),
      symbol: String(item.symbol || "").toUpperCase(),
      rank: num(item.market_cap_rank),
      image: imageUrl(item.large || item.thumb),
      score: num(item.score),
      price: num(item.data?.price),
      ch24h: num(item.data?.price_change_percentage_24h?.usd),
    };
  }).filter((row) => row.id);
  const categories = (body?.categories || []).slice(0, 8).map((row) => ({
    id: row.id,
    name: text(row.name, 120),
  })).filter((row) => row.id);
  return meta({ coins, categories });
}

export async function getRates(env) {
  const body = await cg(env, "/exchange_rates");
  const rates = {};
  for (const [code, row] of Object.entries(body?.rates || {})) {
    const value = num(row?.value);
    if (value != null && value > 0) rates[code.toLowerCase()] = value;
  }
  return meta({ rates });
}

export async function getSupportedVs(env) {
  const body = await cg(env, "/simple/supported_vs_currencies");
  const codes = Array.isArray(body) ? body.map((item) => String(item).toLowerCase()).filter((item) => /^[a-z0-9]{2,12}$/.test(item)) : [];
  return meta({ codes });
}

export async function getPlatforms(env) {
  const body = await cg(env, "/asset_platforms");
  const rows = Array.isArray(body) ? body.filter((row) => row?.id).map((row) => ({
    id: row.id,
    name: text(row.name, 80) || row.id,
    chainId: num(row.chain_identifier),
  })) : [];
  return meta({ rows });
}

export async function getBinanceTickers(env, page) {
  const body = await cg(env, `/exchanges/binance/tickers?page=${page}&depth=false&order=volume_desc`);
  const rows = Array.isArray(body?.tickers) ? body.tickers.map((row) => ({
    coinId: row.coin_id || null,
    base: String(row.base || "").toUpperCase(),
    target: String(row.target || "").toUpperCase(),
  })) : [];
  return meta({ rows });
}

export async function getTreasury(env, coin) {
  const body = await cg(env, `/companies/public_treasury/${encodeURIComponent(coin)}`);
  const companies = Array.isArray(body?.companies) ? body.companies.map((row) => ({
    name: text(row.name, 120),
    symbol: text(row.symbol, 16),
    country: text(row.country, 80),
    holdings: num(row.total_holdings),
    valueUsd: num(row.total_current_value_usd),
    pctSupply: num(row.percentage_of_total_supply),
  })).filter((row) => row.name) : [];
  return meta({
    coin,
    totalHoldings: num(body?.total_holdings),
    totalValueUsd: num(body?.total_value_usd),
    dominance: num(body?.market_cap_dominance),
    companies,
  });
}

export async function getHistory(env, id, date) {
  const body = await cg(env, `/coins/${encodeURIComponent(id)}/history?date=${encodeURIComponent(date)}&localization=false`);
  return meta({ price: num(body?.market_data?.current_price?.usd) });
}

function chainAddress(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[a-zA-Z0-9:_-]{2,128}$/.test(text)) return null;
  return text;
}

function telegramHandle(value) {
  const raw = String(value || "").trim();
  const fromUrl = raw.match(/(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{1,32})/i);
  return publicHandle(fromUrl ? fromUrl[1] : raw);
}

function socialUrl(prefix, handle) {
  return handle ? `${prefix}${encodeURIComponent(handle)}` : null;
}

function pairs(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => [num(row?.[0]), num(row?.[1])]).filter((row) => row[0] != null && row[1] != null);
}
