/** Respaldo keyless. CoinPaprika permite el uso con atribución; no se rellenan campos que su respuesta no trae. */

import { getJson } from "../limits.js";
import { disabledSet, httpsUrl, imageUrl, webUrl } from "../security.js";
import { coinRow, num, plainFromHtml, text } from "../normalize.js";

const API = "https://api.coinpaprika.com/v1";
const HOME = "https://coinpaprika.com/";
const ATTR = "Market data by CoinPaprika";

function headers() {
  return {
    accept: "application/json",
    "user-agent": "ORVUPI-Sonar/1.0 (+https://orvupi.com/sonar/)",
  };
}

async function paprika(env, path) {
  if (disabledSet(env).has("coinpaprika")) {
    const error = new Error("disabled");
    error.code = "disabled";
    throw error;
  }
  return getJson(`${API}${path}`, { headers: headers(), provider: "coinpaprika" });
}

function meta(extra) {
  return {
    source: "CoinPaprika",
    sourceUrl: HOME,
    attribution: ATTR,
    fetchedAt: new Date().toISOString(),
    ...extra,
  };
}

function quoteOf(raw) {
  return raw?.quotes?.USD || raw?.quotes?.usd || null;
}

function rowFromTicker(raw) {
  const quote = quoteOf(raw);
  if (!raw?.id || !quote) return null;
  const price = num(quote.price);
  const maxSupply = num(raw.max_supply);
  return {
    ...coinRow({
      id: raw.id,
      symbol: raw.symbol,
      name: raw.name,
      market_cap_rank: raw.rank,
      current_price: price,
      market_cap: quote.market_cap,
      fully_diluted_valuation: price != null && maxSupply != null ? price * maxSupply : null,
      total_volume: quote.volume_24h,
      price_change_percentage_1h_in_currency: quote.percent_change_1h,
      price_change_percentage_24h_in_currency: quote.percent_change_24h,
      price_change_percentage_7d_in_currency: quote.percent_change_7d,
      price_change_percentage_30d_in_currency: quote.percent_change_30d,
      total_supply: raw.total_supply,
      max_supply: raw.max_supply,
      ath: quote.ath_price,
      ath_date: quote.ath_date,
    }),
    image: paprikaLogo(raw.id),
    paprikaId: raw.id,
  };
}

function paprikaLogo(id) {
  if (!/^[a-z0-9-]{1,120}$/.test(String(id || ""))) return null;
  return imageUrl(`https://static.coinpaprika.com/coin/${id}/logo.png`);
}

function slugOf(id) {
  const text = String(id || "");
  const dash = text.indexOf("-");
  if (dash <= 0) return null;
  const prefix = text.slice(0, dash);
  const slug = text.slice(dash + 1);
  if (!prefix || !slug || prefix.includes("-")) return null;
  return slug;
}

function useGeckoIds(rows) {
  const counts = new Map();
  for (const row of rows) {
    const slug = slugOf(row.paprikaId || row.id);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  for (const row of rows) {
    const paprikaId = row.paprikaId || row.id;
    const slug = slugOf(paprikaId);
    if (!slug || counts.get(slug) !== 1) continue;
    row.paprikaId = paprikaId;
    row.id = slug;
  }
}

export function matchPaprikaId(geckoId, currencies) {
  const suffix = `-${String(geckoId || "").toLowerCase()}`;
  const hits = (currencies || []).filter((row) => {
    const id = String(row?.id || "");
    if (!id.endsWith(suffix)) return false;
    const prefix = id.slice(0, -suffix.length);
    return prefix.length > 0 && !prefix.includes("-");
  });
  return hits.length === 1 ? hits[0].id : null;
}

export async function getMarkets(env, { page = 1, per = 100, order = "market_cap_desc" } = {}) {
  const body = await paprika(env, "/tickers");
  const rows = (Array.isArray(body) ? body : []).map(rowFromTicker).filter(Boolean);
  useGeckoIds(rows);
  rows.sort(sorter(order));
  const start = (page - 1) * per;
  return meta({
    page,
    per,
    category: null,
    order,
    total: rows.length,
    rows: rows.slice(start, start + per),
  });
}

function sorter(order) {
  const cap = (row) => row.marketCap ?? -1;
  const vol = (row) => row.volume24h ?? -1;
  if (order === "market_cap_asc") return (a, b) => cap(a) - cap(b);
  if (order === "volume_desc") return (a, b) => vol(b) - vol(a);
  if (order === "volume_asc") return (a, b) => vol(a) - vol(b);
  if (order === "id_asc") return (a, b) => String(a.id).localeCompare(String(b.id));
  if (order === "id_desc") return (a, b) => String(b.id).localeCompare(String(a.id));
  return (a, b) => cap(b) - cap(a);
}

export async function getCoinById(env, id) {
  let ticker = null;
  try {
    ticker = await paprika(env, `/tickers/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
  const row = rowFromTicker(ticker);
  if (!row) return null;
  return meta({
    ...row,
    priceBtc: row.id === "btc-bitcoin" ? 1 : null,
    ch1y: num(quoteOf(ticker)?.percent_change_1y),
    categories: [],
    description: null,
    descriptionLang: null,
    links: {},
    platforms: {},
  });
}

export async function getCoinForGeckoId(env, geckoId) {
  const found = await paprika(env, `/search/?q=${encodeURIComponent(geckoId)}&c=currencies&limit=10`);
  const id = matchPaprikaId(geckoId, found?.currencies);
  if (!id) return null;
  const coin = await getCoinById(env, id);
  if (!coin) return null;
  return { ...coin, id: String(geckoId), paprikaId: id };
}

export async function getCategories(env) {
  const body = await paprika(env, "/tags");
  const rows = (Array.isArray(body) ? body : []).filter((row) => row?.id).map((row) => ({
    id: row.id,
    name: text(row.name, 120) || row.id,
    marketCap: null,
    change24h: null,
    volume24h: null,
    top3: [],
  }));
  return meta({ rows });
}

export async function getExchangeTypes(env) {
  const body = await paprika(env, "/exchanges");
  const byId = {};
  const byName = {};
  for (const row of Array.isArray(body) ? body : []) {
    const flag = centralized(row?.type);
    if (flag == null) continue;
    const id = String(row.id || "").toLowerCase().replace(/_/g, "-");
    const name = String(row.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (id) byId[id] = flag;
    if (name) byName[name] = flag;
  }
  return { byId, byName, fetchedAt: new Date().toISOString() };
}

export async function getExchanges(env) {
  const body = await paprika(env, "/exchanges");
  const list = (Array.isArray(body) ? body : []).filter((row) => row?.id);
  list.sort((a, b) => (num(a.adjusted_rank) ?? 1e9) - (num(b.adjusted_rank) ?? 1e9));
  return meta({ rows: list.slice(0, 100).map(exchangeRow), page: 1 });
}

export async function getExchange(env, id) {
  let body = null;
  try {
    body = await paprika(env, `/exchanges/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
  if (!body?.id && !body?.name) return null;
  return meta({
    ...exchangeRow(body),
    centralized: centralized(body?.type),
    coins: num(body.currencies),
    pairs: num(body.markets),
    description: plainFromHtml(body.description),
    url: website(body),
  });
}

function exchangeRow(raw) {
  const quote = quoteOf(raw);
  return {
    id: raw.id,
    name: text(raw.name, 120) || raw.id,
    image: imageUrl(raw.logo || raw.image),
    country: null,
    year: null,
    volume24hBtc: null,
    volume24hUsd: num(quote?.adjusted_volume_24h ?? quote?.reported_volume_24h),
    trustScore: null,
    trustRank: null,
    url: website(raw),
    centralized: centralized(raw.type),
  };
}

function centralized(type) {
  const kinds = Array.isArray(type) ? type : [];
  const cex = kinds.includes("cex");
  const dex = kinds.includes("dex");
  if (cex && !dex) return true;
  if (dex && !cex) return false;
  return null;
}

function website(raw) {
  const site = raw?.links?.website;
  const value = Array.isArray(site) ? site.find(Boolean) : site;
  return httpsUrl(value) || webUrl(value);
}
