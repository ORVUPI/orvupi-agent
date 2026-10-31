/**
 * Series de velas. No rellena huecos, no promedia duplicados y no inventa volumen.
 * GeckoTerminal: [time_s, open, high, low, close, volume], el más reciente primero.
 * CoinGecko OHLC free: [time_ms, open, high, low, close], sin volumen.
 */

export const TIMEFRAMES = Object.freeze([
  { id: "1m", path: "minute", aggregate: 1, label: "1m" },
  { id: "5m", path: "minute", aggregate: 5, label: "5m" },
  { id: "15m", path: "minute", aggregate: 15, label: "15m" },
  { id: "1h", path: "hour", aggregate: 1, label: "1h" },
  { id: "4h", path: "hour", aggregate: 4, label: "4h" },
  { id: "1D", path: "day", aggregate: 1, label: "1D" },
]);

/** CoinGecko free OHLC: el rango elige el tamaño real de la vela. */
export const COIN_FRAMES = Object.freeze([
  { id: "30m", days: "1", label: "30m" },
  { id: "4h", days: "14", label: "4h" },
  { id: "1D", days: "180", label: "1D" },
]);

export function stepLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const near = (target, slack) => Math.abs(seconds - target) <= slack;
  if (near(60, 20)) return "1m";
  if (near(300, 40)) return "5m";
  if (near(900, 90)) return "15m";
  if (near(1800, 180)) return "30m";
  if (near(3600, 240)) return "1h";
  if (near(14400, 900)) return "4h";
  if (near(86400, 3600)) return "1D";
  if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

export const PROVIDERS = Object.freeze({
  gecko: {
    id: "geckoterminal",
    name: "GeckoTerminal",
    host: "api.geckoterminal.com",
    candles: true,
    note: "OHLCV público del pool. Caché de la fuente de aproximadamente 1 minuto. Atribución obligatoria.",
  },
  coingecko: {
    id: "coingecko",
    name: "CoinGecko",
    host: "api.coingecko.com",
    candles: "ohlc-free",
    note: "OHLC keyless. El tamaño de la vela lo fija days; no es 1m/5m/15m a elección. Sin volumen por vela.",
  },
  dexscreener: {
    id: "dexscreener",
    name: "DEX Screener",
    host: "api.dexscreener.com",
    candles: false,
    note: "La API pública documentada entrega liquidez y volumen actuales del par, no velas.",
  },
  defillama: {
    id: "defillama",
    name: "DeFiLlama",
    host: "",
    candles: false,
    status: "requiere-permiso",
    note: "Términos del 24-06-2025, cláusula 8: no republicar los datos sin permiso. No se llama a la API.",
  },
});

export const POLL_MS = 30_000;

function finite(value) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function candleFrom(time, open, high, low, close, volume) {
  if (![time, open, high, low, close].every((part) => typeof part === "number" && Number.isFinite(part))) return null;
  if (time <= 0 || high < low) return null;
  if (open > high || open < low || close > high || close < low) return null;
  return {
    time: Math.trunc(time),
    open,
    high,
    low,
    close,
    volume: volume == null ? null : volume,
  };
}

/** Conserva el orden temporal y descarta tiempos repetidos. No inserta velas intermedias. */
export function dedupeCandles(rows) {
  const sorted = [...rows].sort((a, b) => a.time - b.time);
  const out = [];
  let dropped = 0;
  for (const row of sorted) {
    if (out.length && out[out.length - 1].time === row.time) {
      dropped += 1;
      continue;
    }
    out.push(row);
  }
  return { candles: out, droppedDuplicates: dropped };
}

export function parseGeckoOhlcv(list) {
  const parsed = [];
  let rejected = 0;
  if (!Array.isArray(list)) return { candles: [], rejected: 0, droppedDuplicates: 0, volumeKnown: false };
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 5) {
      rejected += 1;
      continue;
    }
    const volume = finite(row[5]);
    const candle = candleFrom(finite(row[0]), finite(row[1]), finite(row[2]), finite(row[3]), finite(row[4]), volume);
    if (!candle) {
      rejected += 1;
      continue;
    }
    parsed.push(candle);
  }
  const unique = dedupeCandles(parsed);
  return {
    ...unique,
    rejected,
    volumeKnown: unique.candles.some((candle) => candle.volume != null),
  };
}

/** Klines públicas: [openTime_ms, open, high, low, close, volume, ...]. */
export function parseBinanceKlines(list) {
  const parsed = [];
  let rejected = 0;
  if (!Array.isArray(list)) return { candles: [], rejected: 0, droppedDuplicates: 0, volumeKnown: false, stepSeconds: null };
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 6) {
      rejected += 1;
      continue;
    }
    const timeMs = finite(row[0]);
    const candle = candleFrom(timeMs == null ? null : Math.trunc(timeMs / 1000), finite(row[1]), finite(row[2]), finite(row[3]), finite(row[4]), finite(row[5]));
    if (!candle) {
      rejected += 1;
      continue;
    }
    parsed.push(candle);
  }
  const unique = dedupeCandles(parsed);
  return { ...unique, rejected, volumeKnown: unique.candles.some((candle) => candle.volume != null), stepSeconds: observedStep(unique.candles) };
}

export const BINANCE_INTERVALS = Object.freeze({
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
});

export function binanceKlineUrl(origin, symbol, interval, limit = 200) {
  const frame = BINANCE_INTERVALS[interval] || (Object.values(BINANCE_INTERVALS).includes(interval) ? interval : "");
  if (!origin || !symbol || !frame) return "";
  const params = new URLSearchParams({ symbol, interval: frame, limit: String(Math.min(1000, Math.max(1, limit))) });
  return `${origin}/api/v3/klines?${params}`;
}

/**
 * Fuentes pedidas que no se llaman.
 * Coinbase: la documentación de Exchange ata el acceso a los Market Data Terms y no se pudo
 * confirmar un permiso de muestra pública. Kraken: los términos globales del 28-10-2026
 * no permiten poner su contenido a disposición de terceros sin licencia.
 * Tronscan: exige clave. El archivo histórico de data.binance.vision es CC BY-NC-SA.
 * La API unificada api.blockscout.com exige clave. Las instancias con desafío no se llaman.
 */
export const EXCLUDED = Object.freeze({
  coinbase: "Market Data Terms, sin permiso confirmado para mostrarlo",
  kraken: "términos globales, sin licencia de redistribución",
  tronscan: "la API exige clave",
  binanceVisionArchive: "dataset CC BY-NC-SA, uso comercial excluido",
  blockscoutKeyed: "api.blockscout.com exige clave",
});

export function parseCoingeckoOhlc(list) {
  const parsed = [];
  let rejected = 0;
  if (!Array.isArray(list)) return { candles: [], rejected: 0, droppedDuplicates: 0, volumeKnown: false, stepSeconds: null };
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 5) {
      rejected += 1;
      continue;
    }
    const timeMs = finite(row[0]);
    const candle = candleFrom(timeMs == null ? null : Math.trunc(timeMs / 1000), finite(row[1]), finite(row[2]), finite(row[3]), finite(row[4]), null);
    if (!candle) {
      rejected += 1;
      continue;
    }
    parsed.push(candle);
  }
  const unique = dedupeCandles(parsed);
  return { ...unique, rejected, volumeKnown: false, stepSeconds: observedStep(unique.candles) };
}

export function observedStep(candles) {
  if (!candles || candles.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < candles.length; i += 1) gaps.push(candles[i].time - candles[i - 1].time);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? null;
}

export function timeframeById(id) {
  return TIMEFRAMES.find((item) => item.id === id) ?? null;
}

export function geckoOhlcvUrl(network, pool, timeframeId, limit = 200) {
  const frame = timeframeById(timeframeId);
  if (!frame || !network || !pool) return "";
  const params = new URLSearchParams({
    aggregate: String(frame.aggregate),
    limit: String(Math.min(1000, Math.max(1, limit))),
    currency: "usd",
  });
  return `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(pool)}/ohlcv/${frame.path}?${params}`;
}

export function coingeckoOhlcUrl(coinId, days) {
  const id = String(coinId || "").trim();
  const allowed = new Set(["1", "7", "14", "30", "90", "180", "365", "max"]);
  const day = allowed.has(String(days)) ? String(days) : "";
  if (!id || !day) return "";
  return `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${day}`;
}
