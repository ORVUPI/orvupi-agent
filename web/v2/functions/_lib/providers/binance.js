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

export async function getKlines(env, symbol, interval, limit) {
  disabled(env);
  if (!/^[A-Z0-9]{4,20}$/.test(symbol)) {
    const error = new Error("invalid");
    error.status = 400;
    throw error;
  }
  const body = await getJson(`${BASE}/klines?symbol=${symbol}&interval=${encodeURIComponent(interval)}&limit=${limit}`, {
    provider: "binance",
    timeout: 10000,
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
