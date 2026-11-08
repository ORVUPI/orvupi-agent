/** Si /api/sonar no está en este host (la vista previa estática responde 404),
 *  se leen las mismas fuentes públicas. Sin cifras inventadas. */

const CG = "https://api.coingecko.com/api/v3";
const HOME = "https://www.coingecko.com/";
const ATTR = "Data provided by CoinGecko";
const PATTERN = "https://pattern.plus/api/v1";

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stamp(extra) {
  return {
    source: "CoinGecko",
    sourceUrl: HOME,
    attribution: ATTR,
    fetchedAt: new Date().toISOString(),
    ...extra,
  };
}

function rowFrom(raw) {
  return {
    id: raw.id,
    rank: num(raw.market_cap_rank),
    symbol: String(raw.symbol || "").toUpperCase(),
    name: raw.name || raw.id,
    image: raw.image || null,
    price: num(raw.current_price),
    ch1h: num(raw.price_change_percentage_1h_in_currency),
    ch24h: num(raw.price_change_percentage_24h_in_currency ?? raw.price_change_percentage_24h),
    ch7d: num(raw.price_change_percentage_7d_in_currency),
    ch30d: num(raw.price_change_percentage_30d_in_currency),
    marketCap: num(raw.market_cap),
    fdv: num(raw.fully_diluted_valuation),
    volume24h: num(raw.total_volume),
    circulating: num(raw.circulating_supply),
    total: num(raw.total_supply),
    max: num(raw.max_supply),
    high24h: num(raw.high_24h),
    low24h: num(raw.low_24h),
  };
}

async function readJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    const error = new Error("upstream");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function cg(path) {
  return readJson(`${CG}${path}`);
}

async function markets(params) {
  const vs = params.get("vs") || "usd";
  const page = params.get("page") || "1";
  const per = params.get("per") || "20";
  const order = params.get("order") || "market_cap_desc";
  const query = new URLSearchParams({
    vs_currency: vs,
    order,
    per_page: per,
    page,
    price_change_percentage: "1h,24h,7d,30d",
  });
  if (params.get("category")) query.set("category", params.get("category"));
  if (params.get("ids")) query.set("ids", params.get("ids"));
  const body = await cg(`/coins/markets?${query}`);
  const rows = Array.isArray(body) ? body.filter((item) => item?.id).map(rowFrom) : [];
  return { ok: true, vs, ...stamp({ page: Number(page), per: Number(per), rows }) };
}

async function global(params) {
  const vs = params.get("vs") || "usd";
  const body = await cg("/global");
  const data = body?.data || {};
  return {
    ok: true,
    vs,
    data: {
      global: stamp({
        marketCap: num(data.total_market_cap?.[vs] ?? data.total_market_cap?.usd),
        volume24h: num(data.total_volume?.[vs] ?? data.total_volume?.usd),
        change24h: num(data.market_cap_change_percentage_24h_usd),
        dominance: {
          btc: num(data.market_cap_percentage?.btc),
          eth: num(data.market_cap_percentage?.eth),
        },
        assets: num(data.active_cryptocurrencies),
        markets: num(data.markets),
      }),
    },
    source: "CoinGecko",
    fetchedAt: new Date().toISOString(),
  };
}

async function trending() {
  const body = await cg("/search/trending");
  const coins = (body?.coins || []).map((entry) => {
    const item = entry.item || {};
    return {
      id: item.id,
      name: item.name,
      symbol: String(item.symbol || "").toUpperCase(),
      rank: num(item.market_cap_rank),
      image: item.large || item.thumb || null,
      price: num(item.data?.price),
      ch24h: num(item.data?.price_change_percentage_24h?.usd),
    };
  }).filter((row) => row.id);
  return {
    ok: true,
    searches: stamp({ coins }),
    pools: null,
  };
}

async function movers(params) {
  const vs = params.get("vs") || "usd";
  const period = params.get("period") || "24h";
  const minVol = Number(params.get("minVol") || 50000);
  const query = new URLSearchParams({
    vs_currency: vs,
    order: "market_cap_desc",
    per_page: "100",
    page: "1",
    price_change_percentage: "1h,24h,7d",
  });
  const body = await cg(`/coins/markets?${query}`);
  const key = period === "1h" ? "ch1h" : period === "7d" ? "ch7d" : "ch24h";
  const rows = (Array.isArray(body) ? body : []).map(rowFrom).filter((row) => row[key] != null && (row.volume24h == null || row.volume24h >= minVol));
  const gainers = rows.slice().sort((a, b) => b[key] - a[key]).slice(0, 20);
  const losers = rows.slice().sort((a, b) => a[key] - b[key]).slice(0, 20);
  return { ok: true, vs, ...stamp({ gainers, losers, period }) };
}

async function calendar() {
  const body = await readJson(`${PATTERN}/calendar.json`);
  const rows = (Array.isArray(body?.data) ? body.data : []).map((row) => ({
    date: row.date || "",
    kind: row.kind || "",
    coinId: row.token || "",
    symbol: row.symbol || "",
    name: row.name || "",
    title: row.title || "",
  })).filter((row) => row.date && row.title);
  return {
    ok: true,
    source: "PatternPlus",
    sourceUrl: "https://pattern.plus",
    attribution: body?.attribution?.text || "Data: PatternPlus",
    fetchedAt: new Date().toISOString(),
    rows,
  };
}

async function unlocks() {
  const body = await readJson(`${PATTERN}/unlocks.json`);
  const rows = (Array.isArray(body?.data) ? body.data : []).map((row) => ({
    date: row.date || "",
    coinId: row.token || "",
    symbol: row.symbol || "",
    name: row.name || "",
    amount: num(row.amount),
    pctCirc: num(row.pct_circulating),
    valueUsd: num(row.value_usd),
    basis: Array.isArray(row.basis) ? row.basis.filter((item) => typeof item === "string") : [],
  })).filter((row) => row.date);
  return {
    ok: true,
    source: "PatternPlus",
    sourceUrl: "https://pattern.plus",
    attribution: body?.attribution?.text || "Data: PatternPlus",
    fetchedAt: new Date().toISOString(),
    rows,
  };
}

export async function publicSonar(path) {
  const url = new URL(path, "https://orvupi.local");
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const rest = parts[0] === "api" && parts[1] === "sonar" ? parts.slice(2) : parts;
  const head = rest[0] || "";
  try {
    if (head === "markets" && rest.length === 1) return await markets(url.searchParams);
    if (head === "global" && rest.length === 1) return await global(url.searchParams);
    if (head === "trending" && rest.length === 1) return await trending();
    if (head === "movers" && rest.length === 1) return await movers(url.searchParams);
    if (head === "calendar" && rest.length === 1) return await calendar();
    if (head === "unlocks" && rest.length === 1) return await unlocks();
  } catch {
    return null;
  }
  return null;
}
