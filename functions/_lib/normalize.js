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

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** Texto plano desde HTML de CoinGecko. El resultado es texto: quien lo pinta lo escapa (textContent / esc). */
export function plainFromHtml(value) {
  if (typeof value !== "string") return null;
  const clean = value
    .replace(/<(script|style)\b[\s\S]*?<\/\1\b[^>]*>/gi, " ")
    .replace(/<[^>]*>?/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
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

/**
 * Cambio porcentual entre el último precio y el punto más cercano a `hours` atrás.
 * Null si no hay un precio real dentro de la tolerancia: no se inventa la ventana.
 */
export function changeOver(points, hours, toleranceHours) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const windowMs = hours * 3600 * 1000;
  const toleranceMs = toleranceHours * 3600 * 1000;
  let lastTime = null;
  let lastPrice = null;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const time = points[index]?.[0];
    const price = points[index]?.[1];
    if (typeof time !== "number" || !Number.isFinite(time)) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    lastTime = time;
    lastPrice = price;
    break;
  }
  if (lastTime == null) return null;
  const target = lastTime - windowMs;
  let bestPrice = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const time = point?.[0];
    const price = point?.[1];
    if (typeof time !== "number" || !Number.isFinite(time) || time >= lastTime) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    const distance = Math.abs(time - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPrice = price;
    }
  }
  if (bestPrice == null || bestDistance > toleranceMs) return null;
  const change = ((lastPrice - bestPrice) / bestPrice) * 100;
  return Number.isFinite(change) ? change : null;
}

/** Rellena solo los porcentajes ausentes. Un valor publicado por la fuente se conserva. */
export function applySeriesChanges(row, points) {
  const next = { ...row };
  if (next.ch1h == null) next.ch1h = changeOver(points, 1, 0.5);
  if (next.ch24h == null) next.ch24h = changeOver(points, 24, 2);
  if (next.ch7d == null) next.ch7d = changeOver(points, 168, 6);
  return next;
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
