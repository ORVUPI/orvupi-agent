/** Esquemas internos. Un null es un dato ausente: el cliente no lo rellena. */

export function num(value) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function text(value, max = 8000) {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

export function plainFromHtml(value) {
  if (typeof value !== "string") return null;
  const clean = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return clean ? clean.slice(0, 8000) : null;
}

export function downsample(values, size = 32) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const points = values.map(num).filter((item) => item != null);
  if (points.length <= size) return points;
  const out = [];
  for (let index = 0; index < size; index += 1) {
    const at = Math.round((index * (points.length - 1)) / (size - 1));
    out.push(points[at]);
  }
  return out;
}

export function stamp(source, sourceUrl, attribution, extra = {}) {
  return {
    source,
    sourceUrl,
    attribution,
    fetchedAt: new Date().toISOString(),
    ...extra,
  };
}

export function coinRow(raw) {
  const spark = raw?.sparkline_in_7d?.price;
  return {
    id: raw.id,
    rank: num(raw.market_cap_rank),
    symbol: String(raw.symbol || "").toUpperCase(),
    name: text(raw.name, 120) || raw.id,
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
    ath: num(raw.ath),
    athChange: num(raw.ath_change_percentage),
    athDate: text(raw.ath_date, 40),
    atl: num(raw.atl),
    atlChange: num(raw.atl_change_percentage),
    atlDate: text(raw.atl_date, 40),
    spark7d: downsample(spark, 32),
  };
}

const MONEY_FIELDS = ["price", "marketCap", "fdv", "volume24h", "high24h", "low24h", "ath", "atl"];

export function scaleMoney(row, factor) {
  if (!row || factor == null || factor === 1) return row;
  const next = { ...row };
  for (const field of MONEY_FIELDS) {
    if (next[field] != null) next[field] = next[field] * factor;
  }
  if (Array.isArray(next.spark7d)) next.spark7d = next.spark7d.map((point) => point * factor);
  return next;
}

export function scaleSeries(series, factor) {
  if (!series || factor == null || factor === 1) return series;
  return {
    ...series,
    points: (series.points || []).map((point) => {
      if (point.length === 2) return [point[0], point[1] == null ? null : point[1] * factor];
      return [point[0], ...point.slice(1).map((value) => (value == null ? null : value * factor))];
    }),
  };
}
