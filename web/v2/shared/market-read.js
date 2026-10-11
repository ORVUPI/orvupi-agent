/**
 * Lectura de mercado de solo lectura para un mint de Solana.
 * Normaliza la respuesta pública de DEX Screener. No calcula cifras,
 * no sigue otras URLs y no convierte un fallo en cero.
 */

const MARKET_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MARKET_INDEX = new Array(128).fill(-1);
for (let i = 0; i < MARKET_ALPHABET.length; i += 1) MARKET_INDEX[MARKET_ALPHABET.charCodeAt(i)] = i;

export const MARKET_SCHEMA = "stubx.market.v1";
export const MARKET_SOURCE_NAME = "DEX Screener";
export const MARKET_HOST = "api.dexscreener.com";
export const MARKET_PATH = "/token-pairs/v1/solana/";
export const MARKET_MAX_BODY = 500_000;
export const MARKET_SHOW = 8;
export const MARKET_PARSE = 40;
export const MARKET_WINDOWS = Object.freeze([
  ["h24", { es: "Volumen en 24 horas", en: "Volume over 24 hours" }],
  ["h6", { es: "Volumen en 6 horas", en: "Volume over 6 hours" }],
  ["h1", { es: "Volumen en 1 hora", en: "Volume over 1 hour" }],
  ["m5", { es: "Volumen en 5 minutos", en: "Volume over 5 minutes" }],
]);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const USD_FIGURE = /^(?:0|[1-9]\d{0,20})(?:\.\d{1,12})?$/;
const PAIR_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const STATUSES = new Set(["ok", "sin_pares", "fallo", "limite", "incompleta", "consulta"]);

function marketDecode(source) {
  if (typeof source !== "string" || source.length === 0) return null;
  let zeroes = 0;
  let i = 0;
  while (i < source.length && source[i] === "1") {
    zeroes += 1;
    i += 1;
  }
  const size = Math.ceil((source.length * Math.log(58)) / Math.log(256)) + 1;
  const b256 = new Uint8Array(size);
  for (; i < source.length; i += 1) {
    const ch = source.charCodeAt(i);
    const value = ch < 128 ? MARKET_INDEX[ch] : -1;
    if (value === undefined || value < 0) return null;
    let carry = value;
    for (let j = size - 1; j >= 0; j -= 1) {
      carry += 58 * (b256[j] ?? 0);
      b256[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    if (carry !== 0) return null;
  }
  let start = 0;
  while (start < b256.length && b256[start] === 0) start += 1;
  const out = new Uint8Array(zeroes + (b256.length - start));
  out.set(b256.subarray(start), zeroes);
  return out;
}

export function isSolanaMint(value) {
  if (typeof value !== "string" || !PAIR_ADDRESS.test(value)) return false;
  const bytes = marketDecode(value);
  return Boolean(bytes && bytes.length === 32);
}

function clipSymbol(value) {
  if (typeof value !== "string") return "";
  const clean = value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  return Array.from(clean).slice(0, 24).join("");
}

function clipDex(value) {
  const clean = clipSymbol(value).replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,31}$/.test(clean)) return "";
  return clean;
}

function finiteAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function readLiquidity(liquidity) {
  if (!liquidity || typeof liquidity !== "object" || !Object.hasOwn(liquidity, "usd")) return null;
  return finiteAmount(liquidity.usd);
}

function readVolume(volume) {
  if (!volume || typeof volume !== "object") return { usd: null, window: null };
  for (const [key] of MARKET_WINDOWS) {
    if (!Object.hasOwn(volume, key)) continue;
    const amount = finiteAmount(volume[key]);
    if (amount === null) return { usd: null, window: null };
    return { usd: amount, window: key };
  }
  return { usd: null, window: null };
}

function readUsdFigure(pair) {
  const raw = pair && pair.priceUsd;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!USD_FIGURE.test(text)) return null;
  return text;
}

function readPair(item) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.chainId === "string" && item.chainId !== "solana") return null;
  const volume = readVolume(item.volume);
  const base = clipSymbol(item.baseToken && item.baseToken.symbol);
  const quote = clipSymbol(item.quoteToken && item.quoteToken.symbol);
  const address = typeof item.pairAddress === "string" && PAIR_ADDRESS.test(item.pairAddress) ? item.pairAddress : "";
  return {
    dex: clipDex(item.dexId),
    pairAddress: address,
    base,
    quote,
    liquidityUsd: readLiquidity(item.liquidity),
    volumeUsd: volume.usd,
    volumeWindow: volume.window,
    usdFigure: readUsdFigure(item),
  };
}

export function marketFailure(mint, queriedAt, reason) {
  const limited = reason === "pausa-sitio" || reason === "pausa-fuente";
  const empty = reason === "vacio";
  const partial = reason === "parcial" || reason === "grande";
  return {
    schema: MARKET_SCHEMA,
    status: limited ? "limite" : empty ? "sin_pares" : partial ? "incompleta" : "fallo",
    reason,
    mint: typeof mint === "string" ? mint : "",
    sourceName: MARKET_SOURCE_NAME,
    sourceHost: MARKET_HOST,
    queriedAt: typeof queriedAt === "string" ? queriedAt : "",
    zone: "UTC",
    pairs: empty ? [] : null,
    omitted: empty ? 0 : null,
  };
}

export function marketLoading(mint) {
  return {
    schema: MARKET_SCHEMA,
    status: "consulta",
    reason: "consulta",
    mint: typeof mint === "string" ? mint : "",
    sourceName: MARKET_SOURCE_NAME,
    sourceHost: MARKET_HOST,
    queriedAt: "",
    zone: "UTC",
    pairs: null,
    omitted: null,
  };
}

export function normalizeUpstream(httpStatus, bodyText, meta) {
  const mint = meta && meta.mint;
  const queriedAt = meta && meta.queriedAt;
  if (httpStatus === 429) return marketFailure(mint, queriedAt, "pausa-fuente");
  if (typeof bodyText === "string" && bodyText.length > MARKET_MAX_BODY) {
    return marketFailure(mint, queriedAt, "grande");
  }
  const text = typeof bodyText === "string" ? bodyText.trim() : "";
  if (httpStatus === 404 && (text === "" || text === "null" || text === "[]")) {
    return marketFailure(mint, queriedAt, "vacio");
  }
  if (typeof httpStatus !== "number" || httpStatus < 200 || httpStatus >= 300) {
    return marketFailure(mint, queriedAt, "http");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return marketFailure(mint, queriedAt, "json");
  }
  const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.pairs) ? parsed.pairs : null;
  if (!list) return marketFailure(mint, queriedAt, "json");
  if (list.length === 0) return marketFailure(mint, queriedAt, "vacio");
  const usable = [];
  let skipped = 0;
  const cap = Math.min(list.length, MARKET_PARSE);
  for (let i = 0; i < cap; i += 1) {
    const pair = readPair(list[i]);
    if (!pair) skipped += 1;
    else usable.push(pair);
  }
  if (usable.length === 0) return marketFailure(mint, queriedAt, "json");
  const ranked = usable.map((pair, index) => ({ pair, index }));
  ranked.sort((left, right) => {
    const a = left.pair.liquidityUsd;
    const b = right.pair.liquidityUsd;
    const aMissing = a === null;
    const bMissing = b === null;
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (a !== b) return b - a;
    return left.index - right.index;
  });
  const shown = ranked.slice(0, MARKET_SHOW).map((item) => item.pair);
  const omitted = usable.length - shown.length + skipped + (list.length - cap);
  const anyFigure = shown.some((pair) => pair.liquidityUsd !== null || pair.volumeUsd !== null);
  return {
    schema: MARKET_SCHEMA,
    status: anyFigure ? "ok" : "incompleta",
    reason: anyFigure ? "leido" : "parcial",
    mint: typeof mint === "string" ? mint : "",
    sourceName: MARKET_SOURCE_NAME,
    sourceHost: MARKET_HOST,
    queriedAt: typeof queriedAt === "string" ? queriedAt : "",
    zone: "UTC",
    pairs: shown,
    omitted,
  };
}

function pairShape(value) {
  if (!value || typeof value !== "object") return null;
  const liquidity = finiteAmount(value.liquidityUsd);
  const volume = finiteAmount(value.volumeUsd);
  const windowOk = MARKET_WINDOWS.some(([key]) => key === value.volumeWindow);
  const figure = typeof value.usdFigure === "string" && USD_FIGURE.test(value.usdFigure) ? value.usdFigure : null;
  return {
    dex: clipDex(value.dex),
    pairAddress: typeof value.pairAddress === "string" && PAIR_ADDRESS.test(value.pairAddress) ? value.pairAddress : "",
    base: clipSymbol(value.base),
    quote: clipSymbol(value.quote),
    liquidityUsd: value.liquidityUsd === null ? null : liquidity,
    volumeUsd: value.volumeUsd === null ? null : volume,
    volumeWindow: value.volumeWindow === null || !windowOk ? null : value.volumeWindow,
    usdFigure: figure,
  };
}

export function acceptClientPayload(value, mint) {
  const iso = typeof value === "object" && value && typeof value.queriedAt === "string" ? value.queriedAt : "";
  if (!value || typeof value !== "object" || value.schema !== MARKET_SCHEMA || !STATUSES.has(value.status)) {
    return marketFailure(mint, iso, "json");
  }
  if (value.mint !== mint || value.sourceName !== MARKET_SOURCE_NAME) {
    return marketFailure(mint, iso, "json");
  }
  if (value.status === "fallo" || value.status === "limite" || value.status === "consulta") {
    return {
      ...marketFailure(mint, iso, typeof value.reason === "string" ? value.reason : "http"),
      status: value.status === "consulta" ? "consulta" : value.status,
      reason: typeof value.reason === "string" ? value.reason : "http",
      pairs: null,
      omitted: null,
    };
  }
  if (!Array.isArray(value.pairs)) return marketFailure(mint, iso, "json");
  const pairs = [];
  for (const item of value.pairs) {
    const pair = pairShape(item);
    if (pair) pairs.push(pair);
  }
  const omitted = Number.isInteger(value.omitted) && value.omitted >= 0 && value.omitted < 10000 ? value.omitted : 0;
  return {
    schema: MARKET_SCHEMA,
    status: value.status,
    reason: typeof value.reason === "string" ? value.reason : "leido",
    mint,
    sourceName: MARKET_SOURCE_NAME,
    sourceHost: MARKET_HOST,
    queriedAt: iso,
    zone: "UTC",
    pairs,
    omitted,
  };
}

export async function loadMarket(mint, fetchImpl, now) {
  const clock = typeof now === "function" ? now : () => new Date();
  const iso = clock().toISOString();
  if (!isSolanaMint(mint)) return marketFailure(mint, iso, "mint");
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") return marketFailure(mint, iso, "http");
  let response;
  try {
    response = await fetchFn(`/api/market?mint=${encodeURIComponent(mint)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
  } catch {
    return marketFailure(mint, iso, "http");
  }
  const status = response && typeof response.status === "number" ? response.status : 0;
  let text = "";
  try {
    text = response && typeof response.text === "function" ? await response.text() : "";
  } catch {
    return marketFailure(mint, iso, "http");
  }
  if (typeof text === "string" && text.length > MARKET_MAX_BODY) return marketFailure(mint, iso, "grande");
  if (status === 429) {
    try {
      const parsed = JSON.parse(text);
      const accepted = acceptClientPayload(parsed, mint);
      if (accepted.status === "limite") return accepted;
    } catch {
      /* la pausa sigue siendo una pausa aunque el cuerpo no se lea */
    }
    return marketFailure(mint, iso, "pausa-fuente");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return marketFailure(mint, iso, "http");
  }
  return acceptClientPayload(parsed, mint);
}

function groupDigits(whole, lang) {
  const sep = lang === "en" ? "," : ".";
  let text = "";
  for (let i = 0; i < whole.length; i += 1) {
    if (i > 0 && (whole.length - i) % 3 === 0) text += sep;
    text += whole[i];
  }
  return text;
}

export function formatUsd(value, lang) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const language = lang === "en" ? "en" : "es";
  if (value === 0) return "0 USD";
  const dec = language === "en" ? "." : ",";
  let places = 2;
  if (value < 1) places = 4;
  if (value < 0.01) places = 8;
  const fixed = value.toFixed(places);
  if (/^0(?:\.0+)?$/.test(fixed)) {
    return language === "en" ? "under 0.00000001 USD" : "menor que 0,00000001 USD";
  }
  const [whole, fracRaw] = fixed.split(".");
  const frac = (fracRaw || "").replace(/0+$/, "");
  const grouped = groupDigits(whole || "0", language);
  return frac ? `${grouped}${dec}${frac} USD` : `${grouped} USD`;
}

export function formatUsdFigure(figure, lang) {
  if (typeof figure !== "string" || !USD_FIGURE.test(figure)) return null;
  const language = lang === "en" ? "en" : "es";
  const [whole, fracRaw] = figure.split(".");
  const frac = fracRaw || "";
  const dec = language === "en" ? "." : ",";
  const grouped = groupDigits(whole || "0", language);
  return frac ? `${grouped}${dec}${frac} USD` : `${grouped} USD`;
}

export function formatStamp(iso) {
  if (typeof iso !== "string" || !ISO.test(iso)) return "";
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

function marketCopy(lang, es, en) {
  return lang === "en" ? en : es;
}

function stampLine(model, lang) {
  const when = formatStamp(model.queriedAt);
  if (!when) {
    return marketCopy(
      lang,
      `Fuente: ${MARKET_SOURCE_NAME}. La hora de la consulta no llegó.`,
      `Source: ${MARKET_SOURCE_NAME}. The query time did not arrive.`,
    );
  }
  return marketCopy(
    lang,
    `Fuente: ${MARKET_SOURCE_NAME}. Consultado: ${when}.`,
    `Source: ${MARKET_SOURCE_NAME}. Queried: ${when}.`,
  );
}

function windowLabel(key, lang) {
  const found = MARKET_WINDOWS.find(([id]) => id === key);
  if (!found) return marketCopy(lang, "Volumen", "Volume");
  return found[1][lang === "en" ? "en" : "es"];
}

function pairTitle(pair, lang) {
  const base = pair.base || marketCopy(lang, "sin símbolo", "no symbol");
  const quote = pair.quote || marketCopy(lang, "sin símbolo", "no symbol");
  return marketCopy(lang, `Par: ${base} / ${quote}`, `Pair: ${base} / ${quote}`);
}

const GAP = {
  vacio: {
    es: "DEX Screener no listó ningún par de Solana para esta dirección. No es una liquidez de cero.",
    en: "DEX Screener listed no Solana pair for this address. That is not zero liquidity.",
  },
  http: {
    es: "La consulta falló. No hay cifra de pares, liquidez ni volumen.",
    en: "The query failed. There is no figure for pairs, liquidity, or volume.",
  },
  json: {
    es: "La fuente no contestó como se esperaba. No hay cifra.",
    en: "The source did not answer as expected. There is no figure.",
  },
  grande: {
    es: "La respuesta de la fuente era demasiado grande. No se ha usado. No hay cifra.",
    en: "The source response was too large. It was not used. There is no figure.",
  },
  "pausa-fuente": {
    es: "DEX Screener pidió una pausa. No hay cifra. Prueba otra vez en un minuto.",
    en: "DEX Screener asked for a pause. There is no figure. Try again in a minute.",
  },
  "pausa-sitio": {
    es: "Este sitio hizo una pausa para no saturar la fuente. No se ha consultado. No hay cifra.",
    en: "This site paused so it would not overwhelm the source. It was not queried. There is no figure.",
  },
  mint: {
    es: "Esa dirección no es un mint de Solana. No se ha consultado la fuente.",
    en: "That address is not a Solana mint. The source was not queried.",
  },
  consulta: {
    es: "Todavía no hay cifra. La consulta no ha terminado.",
    en: "There is no figure yet. The query has not finished.",
  },
  parcial: {
    es: "La fuente nombró pares, pero no dio la liquidez ni el volumen que esta página enseña.",
    en: "The source named pairs, but it did not give the liquidity or the volume this page shows.",
  },
};

export function marketGap(model, lang) {
  const reason = model && model.reason;
  if (model && model.status === "ok") {
    const missing = [];
    for (const pair of model.pairs || []) {
      if (pair.liquidityUsd === null) missing.push("liquidez");
      if (pair.volumeUsd === null) missing.push("volumen");
    }
    if (missing.length === 0 && !(model.omitted > 0)) {
      return marketCopy(
        lang,
        "No falta ninguna cifra pedida en esta consulta de mercado.",
        "No requested figure is missing in this market query.",
      );
    }
    const parts = [];
    if (missing.includes("liquidez")) {
      parts.push(marketCopy(lang, "En algún par la fuente no dio la liquidez.", "For some pair the source did not give liquidity."));
    }
    if (missing.includes("volumen")) {
      parts.push(marketCopy(lang, "En algún par la fuente no dio el volumen.", "For some pair the source did not give volume."));
    }
    if (model.omitted > 0) {
      parts.push(
        marketCopy(
          lang,
          `Se muestran ${model.pairs.length} pares. La fuente listó más. Ese recorte no es una nota de calidad.`,
          `${model.pairs.length} pairs are shown. The source listed more. That cut is not a quality note.`,
        ),
      );
    }
    return parts.join(" ");
  }
  const known = GAP[reason] || GAP.http;
  return known[lang === "en" ? "en" : "es"];
}

export function describeMarket(model, lang) {
  const language = lang === "en" ? "en" : "es";
  const stamp = stampLine(model || {}, language);
  const pairs = [];
  if (model && Array.isArray(model.pairs)) {
    for (const pair of model.pairs) {
      const liquidity = formatUsd(pair.liquidityUsd, language);
      const volume = formatUsd(pair.volumeUsd, language);
      const figure = formatUsdFigure(pair.usdFigure, language);
      pairs.push({
        title: pairTitle(pair, language),
        where: pair.dex
          ? marketCopy(language, `Dónde está el par: ${pair.dex}`, `Where the pair is: ${pair.dex}`)
          : marketCopy(language, "Dónde está el par: la fuente no lo nombró.", "Where the pair is: the source did not name it."),
        liquidity: liquidity
          ? marketCopy(language, `Liquidez: ${liquidity}. ${stamp}`, `Liquidity: ${liquidity}. ${stamp}`)
          : marketCopy(language, `Liquidez: la fuente no la dio. ${stamp}`, `Liquidity: the source did not give it. ${stamp}`),
        volume: volume
          ? marketCopy(
              language,
              `${windowLabel(pair.volumeWindow, language)}: ${volume}. ${stamp}`,
              `${windowLabel(pair.volumeWindow, language)}: ${volume}. ${stamp}`,
            )
          : marketCopy(language, `Volumen: la fuente no lo dio. ${stamp}`, `Volume: the source did not give it. ${stamp}`),
        address: pair.pairAddress
          ? marketCopy(language, `Dirección del par: ${pair.pairAddress}`, `Pair address: ${pair.pairAddress}`)
          : marketCopy(language, "Dirección del par: la fuente no la dio.", "Pair address: the source did not give it."),
        figure: figure
          ? marketCopy(
              language,
              `Cifra en dólares publicada por la fuente: ${figure}. ${stamp}`,
              `Dollar figure published by the source: ${figure}. ${stamp}`,
            )
          : marketCopy(
              language,
              "La fuente no publicó una cifra en dólares.",
              "The source did not publish a dollar figure.",
            ),
      });
    }
  }
  return {
    title: marketCopy(language, "Datos de mercado", "Market data"),
    intro: marketCopy(
      language,
      "Estas cifras las publica otra web. No son de la cadena. No dicen qué hacer con el token.",
      "Another website publishes these figures. They are not from the chain. They do not say what to do with the token.",
    ),
    notice: marketCopy(
      language,
      "Lectura de un tercero. No es un consejo ni una puntuación. La dirección se envía a DEX Screener a través de este sitio. Esta página no le reenvía tu IP.",
      "A third-party reading. It is not advice and it does not rank the token. The address is sent to DEX Screener through this site. This page does not forward your IP to it.",
    ),
    source: stamp,
    pairs,
    gapTitle: marketCopy(language, "Qué falta", "What is missing"),
    gap: marketGap(model, language),
    detail: marketCopy(
      language,
      "La liquidez es el dinero que la fuente dice que hay en ese par, en dólares. El volumen es lo que la fuente dice que se movió en el intervalo indicado. Una cifra en dólares, si aparece, es la que publicó la fuente. STUBX no la calcula.",
      "Liquidity is the money the source says is in that pair, in dollars. Volume is what the source says moved in the stated interval. A dollar figure, if one appears, is the one the source published. STUBX does not calculate it.",
    ),
    more: marketCopy(language, "Más detalle", "More detail"),
  };
}

export const MARKET_STORED_NOTE = Object.freeze({
  es: "Los datos de mercado no se guardan en la ficha y no entran en la comparación.",
  en: "Market data is not stored on the card and is not part of the comparison.",
});

export const MARKET_READ_BUTTON = Object.freeze({
  es: "Leer datos de mercado ahora",
  en: "Read market data now",
});
