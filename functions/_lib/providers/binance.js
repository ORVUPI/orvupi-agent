import { getJson } from "../limits.js";
import { disabledSet } from "../security.js";
import { num, stamp } from "../normalize.js";

const BASE = "https://data-api.binance.vision/api/v3";

function disabled(env) {
  if (!disabledSet(env).has("binance")) return;
  const error = new Error("disabled");
  error.code = "disabled";
  throw error;
}

export async function getKlines(env, symbol, interval, limit, startTime) {
  disabled(env);
  if (!/^[A-Z0-9]{4,20}$/.test(symbol)) {
    const error = new Error("invalid");
    error.status = 400;
    throw error;
  }
  const start = startTime ? `&startTime=${startTime}` : "";
  const body = await getJson(`${BASE}/klines?symbol=${symbol}&interval=${encodeURIComponent(interval)}&limit=${limit}${start}`, {
    provider: "binance",
    timeout: 12000,
  });
  const points = Array.isArray(body) ? body.map((row) => ({
    time: num(row[0]),
    open: num(row[1]),
    high: num(row[2]),
    low: num(row[3]),
    close: num(row[4]),
    volume: num(row[5]),
  })).filter((row) => row.time != null && row.close != null) : [];
  return stamp("Binance", "https://data-api.binance.vision/", "Binance market data", { symbol, interval, points });
}

export async function getDailyHistory(env, symbol) {
  const points = [];
  let start = Date.parse("2017-08-17T00:00:00Z");
  const now = Date.now();
  for (let page = 0; page < 8 && start < now; page += 1) {
    const batch = await getKlines(env, symbol, "1d", 1000, start);
    if (!batch.points.length) break;
    points.push(...batch.points);
    const last = batch.points[batch.points.length - 1].time;
    if (!last || last <= start || batch.points.length < 1000) break;
    start = last + 1;
  }
  return stamp("Binance", "https://data-api.binance.vision/", "Binance market data", { symbol, interval: "1d", points });
}
