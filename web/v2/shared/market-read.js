/**
 * Lectura de mercado de solo lectura para un mint de Solana.
 * Normaliza la respuesta pública de DEX Screener. No calcula cifras,
 * no sigue otras URLs y no convierte un fallo en cero.
 * Descarta la cotización unitaria si la respuesta la trae.
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
export const MARKET_TIMEOUT_MS = 8_000;
export const MARKET_CLIENT_LIMIT = 6;
export const MARKET_CLIENT_WINDOW_MS = 60_000;
export const MARKET_LOW_USD = 1_000;
export const MARKET_OFFICIAL_MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
export const MARKET_WINDOWS = Object.freeze([
  ["h24", { es: "Volumen en 24 horas", en: "Volume over 24 hours" }],
  ["h6", { es: "Volumen en 6 horas", en: "Volume over 6 hours" }],
  ["h1", { es: "Volumen en 1 hora", en: "Volume over 1 hour" }],
  ["m5", { es: "Volumen en 5 minutos", en: "Volume over 5 minutes" }],
]);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PAIR_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const STATUSES = new Set(["ok", "sin_pares", "fallo", "limite", "incompleta", "consulta"]);

// Mismo texto que AVISO_GUARDAR.
const MARKET_PRIVACY = Object.freeze({
  es: "Este sitio no guarda en ningún servidor la dirección que consultas. Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP. Si pulsas «Leer datos de mercado ahora», tu navegador conecta con DEX Screener y este también ve tu IP y la dirección consultada. Solo si pulsas «Guardar esta consulta», se guarda en el Cuaderno de este navegador, en tu dispositivo, y puedes borrarla allí cuando quieras. Los datos de mercado no se guardan.",
  en: "This site does not store the address you look up on any server. To read it live, it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP. If you press \"Read market data now\", your browser connects to DEX Screener and it also sees your IP and the address you look up. Only if you press \"Save this lookup\" is it stored in this browser's Notebook, on your device, and you can delete it there at any time. Market data is not stored.",
});

export const MARKET_ATTRIBUTION = Object.freeze({
  es: "Datos: DEX Screener. Pueden no ser exactos ni estar al día.",
  en: "Data: DEX Screener. It may be inaccurate or out of date.",
});

const MARKET_HOMOGLYPHS = {
  "\u0391": "A",
  "\u0392": "B",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "H",
  "\u0399": "I",
  "\u039A": "K",
  "\u039C": "M",
  "\u039D": "N",
  "\u039F": "O",
  "\u03A1": "P",
  "\u03A4": "T",
  "\u03A5": "Y",
  "\u03A3": "S",
  "\u03A7": "X",
  "\u03B1": "a",
  "\u03C3": "s",
  "\u03BF": "o",
  "\u03C4": "t",
  "\u0410": "A",
  "\u0412": "B",
  "\u0415": "E",
  "\u041A": "K",
  "\u041C": "M",
  "\u041D": "H",
  "\u041E": "O",
  "\u0420": "P",
  "\u0421": "S",
  "\u0422": "T",
  "\u0425": "X",
  "\u0430": "a",
  "\u0435": "e",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "s",
  "\u0442": "t",
  "\u0445": "x",
  "\u0405": "S",
  "\u0455": "s",
  "\u0406": "I",
  "\u0456": "i",
  "5": "S",
  "8": "B",
  "\uA731": "S",
  "\u1D1B": "T",
  "\u1D1C": "U",
  "\u0299": "B",
  "\u054D": "U",
  "\u057D": "u",
  "\u13DA": "S",
  "\u13A2": "T",
  "\u13F4": "B",
};

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

/** Misma normalización que normalizeToken de Verify: homoglifos, ancho cero y bidi. */
export function marketNormalizeToken(value) {
  const folded = String(value || "").normalize("NFKC").replace(/[\p{Cc}\p{Cf}\uFFFD]/gu, "");
  let mapped = "";
  for (const char of folded) mapped += MARKET_HOMOGLYPHS[char] ?? char;
  return mapped.toLowerCase().replace(/[\s.\-_'’]+/g, "");
}

function clipSymbol(value) {
  if (typeof value !== "string") return "";
  const clean = value.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\p{Cf}/gu, "").trim();
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

function tokenAddress(token) {
  if (!token || typeof token !== "object" || typeof token.address !== "string") return "";
  return token.address;
}

function readPair(item, mint) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.chainId === "string" && item.chainId !== "solana") return null;
  const baseAddress = tokenAddress(item.baseToken);
  const quoteAddress = tokenAddress(item.quoteToken);
  if (!mint || (baseAddress !== mint && quoteAddress !== mint)) return null;
  const volume = readVolume(item.volume);
  const base = clipSymbol(item.baseToken && item.baseToken.symbol);
  const quote = clipSymbol(item.quoteToken && item.quoteToken.symbol);
  const rawPair = typeof item.pairAddress === "string" ? item.pairAddress : "";
  const address = PAIR_ADDRESS.test(rawPair) ? rawPair : "";
  return {
    dex: clipDex(item.dexId),
    pairAddress: address,
    base,
    quote,
    baseMint: baseAddress,
    quoteMint: quoteAddress,
    liquidityUsd: readLiquidity(item.liquidity),
    volumeUsd: volume.usd,
    volumeWindow: volume.window,
  };
}

export function marketFailure(mint, queriedAt, reason) {
  const empty = reason === "vacio";
  const partial = reason === "parcial";
  return {
    schema: MARKET_SCHEMA,
    status: empty ? "sin_pares" : partial ? "incompleta" : "fallo",
    reason,
    mint: typeof mint === "string" ? mint : "",
    sourceName: MARKET_SOURCE_NAME,
    sourceHost: MARKET_HOST,
    queriedAt: typeof queriedAt === "string" ? queriedAt : "",
    zone: "Europe/Madrid",
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
    zone: "Europe/Madrid",
    pairs: null,
    omitted: null,
  };
}

export function normalizeUpstream(httpStatus, bodyText, meta) {
  const mint = meta && meta.mint;
  const queriedAt = meta && meta.queriedAt;
  if (httpStatus === 429) return marketFailure(mint, queriedAt, "http");
  if (typeof bodyText === "string" && bodyText.length > MARKET_MAX_BODY) {
    return marketFailure(mint, queriedAt, "grande");
  }
  const text = typeof bodyText === "string" ? bodyText.trim() : "";
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
    const pair = readPair(list[i], mint);
    if (!pair) skipped += 1;
    else usable.push(pair);
  }
  if (usable.length === 0) return marketFailure(mint, queriedAt, "json");
  const shown = usable.slice(0, MARKET_SHOW);
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
    zone: "Europe/Madrid",
    pairs: shown,
    omitted,
  };
}

function pairShape(value) {
  if (!value || typeof value !== "object") return null;
  const liquidity = finiteAmount(value.liquidityUsd);
  const volume = finiteAmount(value.volumeUsd);
  const windowOk = MARKET_WINDOWS.some(([key]) => key === value.volumeWindow);
  return {
    dex: clipDex(value.dex),
    pairAddress: typeof value.pairAddress === "string" && PAIR_ADDRESS.test(value.pairAddress) ? value.pairAddress : "",
    base: clipSymbol(value.base),
    quote: clipSymbol(value.quote),
    baseMint: typeof value.baseMint === "string" && isSolanaMint(value.baseMint) ? value.baseMint : "",
    quoteMint: typeof value.quoteMint === "string" && isSolanaMint(value.quoteMint) ? value.quoteMint : "",
    liquidityUsd: value.liquidityUsd === null ? null : liquidity,
    volumeUsd: value.volumeUsd === null ? null : volume,
    volumeWindow: value.volumeWindow === null || !windowOk ? null : value.volumeWindow,
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
    zone: "Europe/Madrid",
    pairs,
    omitted,
  };
}

function clockFrom(now) {
  if (typeof now === "function") return now;
  if (now && typeof now === "object" && typeof now.now === "function") return now.now;
  return () => new Date();
}

function timeoutFrom(now) {
  if (now && typeof now === "object" && Number.isFinite(now.timeoutMs) && now.timeoutMs > 0) return now.timeoutMs;
  return MARKET_TIMEOUT_MS;
}

const clientHits = [];

export function resetMarketClientLimit() {
  clientHits.length = 0;
}

function takeClientSlot(atMs) {
  while (clientHits.length && clientHits[0] <= atMs - MARKET_CLIENT_WINDOW_MS) clientHits.shift();
  if (clientHits.length >= MARKET_CLIENT_LIMIT) return false;
  clientHits.push(atMs);
  return true;
}

export function marketUpstreamUrl(mint) {
  if (!isSolanaMint(mint)) return "";
  return `https://${MARKET_HOST}${MARKET_PATH}${encodeURIComponent(mint)}`;
}

function abortError() {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

function isAbort(error, signal) {
  return Boolean((signal && signal.aborted) || (error && error.name === "AbortError"));
}

async function readCappedText(response, max, signal) {
  if (signal && signal.aborted) return { aborted: true, text: "" };
  const body = response && response.body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const onAbort = () => {
      if (typeof reader.cancel === "function") {
        reader.cancel().catch(() => {});
      }
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        if (signal && signal.aborted) return { aborted: true, text: "" };
        const step = await reader.read();
        if (signal && signal.aborted) return { aborted: true, text: "" };
        if (step.done) break;
        const raw = step.value;
        const value = raw instanceof Uint8Array ? raw : raw ? new Uint8Array(raw) : new Uint8Array();
        total += value.byteLength;
        if (total > max) {
          if (typeof reader.cancel === "function") await reader.cancel();
          return { overflow: true, text: "" };
        }
        chunks.push(value);
      }
    } catch (error) {
      if (typeof reader.cancel === "function") {
        try {
          await reader.cancel();
        } catch {
          /* el cuerpo ya estaba cerrado */
        }
      }
      if (isAbort(error, signal)) return { aborted: true, text: "" };
      return { failed: true, text: "" };
    } finally {
      if (signal) signal.removeEventListener("abort", onAbort);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(out);
    if (text.length > max) return { overflow: true, text: "" };
    return { text };
  }
  try {
    const reading = response && typeof response.text === "function" ? response.text() : Promise.resolve("");
    const text = await new Promise((resolve, reject) => {
      const fail = () => reject(abortError());
      if (signal && signal.aborted) {
        fail();
        return;
      }
      if (signal) signal.addEventListener("abort", fail, { once: true });
      Promise.resolve(reading).then(
        (value) => {
          if (signal) signal.removeEventListener("abort", fail);
          if (signal && signal.aborted) fail();
          else resolve(value);
        },
        (error) => {
          if (signal) signal.removeEventListener("abort", fail);
          reject(error);
        },
      );
    });
    if (typeof text !== "string") return { failed: true, text: "" };
    if (text.length > max) return { overflow: true, text: "" };
    return { text };
  } catch (error) {
    if (isAbort(error, signal)) return { aborted: true, text: "" };
    return { failed: true, text: "" };
  }
}

export async function loadMarket(mint, fetchImpl, now) {
  const clock = clockFrom(now);
  const timeoutMs = timeoutFrom(now);
  const iso = clock().toISOString();
  if (!isSolanaMint(mint)) return marketFailure(mint, iso, "mint");
  const allowed = now && typeof now.takeSlot === "function" ? now.takeSlot() : takeClientSlot(clock().getTime());
  if (!allowed) return marketFailure(mint, iso, "pausa-navegador");
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") return marketFailure(mint, iso, "http");
  const upstream = marketUpstreamUrl(mint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(upstream, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const status = response && typeof response.status === "number" ? response.status : 0;
    if (status >= 300 && status < 400) {
      await readCappedText(response, MARKET_MAX_BODY, controller.signal);
      return marketFailure(mint, iso, "http");
    }
    const capped = await readCappedText(response, MARKET_MAX_BODY, controller.signal);
    if (capped.aborted || controller.signal.aborted) return marketFailure(mint, iso, "tiempo");
    if (capped.failed) return marketFailure(mint, iso, "http");
    if (capped.overflow) return marketFailure(mint, iso, "grande");
    if (status === 429) return marketFailure(mint, iso, "http");
    return normalizeUpstream(status, capped.text, { mint, queriedAt: iso });
  } catch (error) {
    return marketFailure(mint, iso, isAbort(error, controller.signal) ? "tiempo" : "http");
  } finally {
    clearTimeout(timer);
  }
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

export function formatSourceStamp(iso, lang) {
  if (typeof iso !== "string" || !ISO.test(iso)) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
  } catch {
    return "";
  }
  const pick = (type) => {
    const found = parts.find((part) => part.type === type);
    return found && found.value ? found.value : "";
  };
  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  const hour = pick("hour").padStart(2, "0");
  const minute = pick("minute").padStart(2, "0");
  if (!day || !month || !year || !hour || !minute) return "";
  if (lang === "en") {
    return `Source: ${MARKET_SOURCE_NAME} · read ${day}-${month}-${year} ${hour}:${minute} (Madrid time)`;
  }
  return `Fuente: ${MARKET_SOURCE_NAME} · leído el ${day}-${month}-${year} a las ${hour}:${minute} (hora de Madrid)`;
}

function marketCopy(lang, es, en) {
  return lang === "en" ? en : es;
}

export function marketPrivacy(lang) {
  return marketCopy(lang, MARKET_PRIVACY.es, MARKET_PRIVACY.en);
}

function stampLine(model, lang) {
  const when = formatSourceStamp(model && model.queriedAt, lang);
  if (!when) {
    return marketCopy(
      lang,
      `Fuente: ${MARKET_SOURCE_NAME}. La hora de la consulta no llegó.`,
      `Source: ${MARKET_SOURCE_NAME}. The query time did not arrive.`,
    );
  }
  return when;
}

function windowLabel(key, lang) {
  const found = MARKET_WINDOWS.find(([id]) => id === key);
  if (!found) return marketCopy(lang, "Volumen", "Volume");
  return found[1][lang === "en" ? "en" : "es"];
}

function sideName(symbol, address, lang) {
  if (!symbol) return marketCopy(lang, "sin símbolo", "no symbol");
  if (address !== MARKET_OFFICIAL_MINT) {
    return marketCopy(lang, `Dice llamarse «${symbol}»`, `It says it is called «${symbol}»`);
  }
  return symbol;
}

function pairTitle(pair, lang) {
  const base = sideName(pair.base, pair.baseMint, lang);
  const quote = sideName(pair.quote, pair.quoteMint, lang);
  return marketCopy(lang, `Par: ${base} / ${quote}`, `Pair: ${base} / ${quote}`);
}

function lowLiquidityLine(amount, lang) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount >= MARKET_LOW_USD) return "";
  return marketCopy(
    lang,
    "La liquidez publicada es poca (menos de 1.000 USD). Cualquiera puede crear un par.",
    "The published liquidity is small (under 1,000 USD). Anyone can create a pair.",
  );
}

const GAP = {
  vacio: {
    es: "DEX Screener no listó ningún par de Solana para esta dirección. No es una liquidez de cero.",
    en: "DEX Screener listed no Solana pair for this address. That is not zero liquidity.",
  },
  http: {
    es: "No se pudo consultar.",
    en: "It could not be queried.",
  },
  json: {
    es: "No se pudo consultar.",
    en: "It could not be queried.",
  },
  grande: {
    es: "No se pudo consultar.",
    en: "It could not be queried.",
  },
  tiempo: {
    es: "No se pudo consultar. Se agotó el tiempo.",
    en: "It could not be queried. The wait timed out.",
  },
  "pausa-fuente": {
    es: "DEX Screener pidió una pausa. No hay cifra. Prueba otra vez en un minuto.",
    en: "DEX Screener asked for a pause. There is no figure. Try again in a minute.",
  },
  "pausa-navegador": {
    es: "Este navegador hizo una pausa para no saturar la fuente. No se ha consultado. No hay cifra.",
    en: "This browser paused so it would not overwhelm the source. It was not queried. There is no figure.",
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
      pairs.push({
        title: pairTitle(pair, language),
        where: pair.dex
          ? marketCopy(language, `Dónde está el par: ${pair.dex}`, `Where the pair is: ${pair.dex}`)
          : marketCopy(language, "Dónde está el par: la fuente no lo nombró.", "Where the pair is: the source did not name it."),
        liquidity: liquidity
          ? marketCopy(language, `Liquidez: ${liquidity}. ${stamp}`, `Liquidity: ${liquidity}. ${stamp}`)
          : marketCopy(language, `Liquidez: la fuente no la dio. ${stamp}`, `Liquidity: the source did not give it. ${stamp}`),
        low: lowLiquidityLine(pair.liquidityUsd, language),
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
      });
    }
  }
  const status = model && model.status;
  return {
    title: marketCopy(language, "Datos de mercado", "Market data"),
    intro: marketCopy(
      language,
      "Estas cifras las publica otra web. No son de la cadena. No dicen qué hacer con el token.",
      "Another website publishes these figures. They are not from the chain. They do not say what to do with the token.",
    ),
    notice: marketCopy(
      language,
      "Lectura de un tercero. No es un consejo ni una puntuación.",
      "A third-party reading. It is not advice and it does not rank the token.",
    ),
    privacy: marketPrivacy(language),
    attribution: MARKET_ATTRIBUTION[language],
    source: stamp,
    pairs,
    gapTitle: marketCopy(language, "Qué falta", "What is missing"),
    gap: marketGap(model, language),
    retry: status === "fallo" || status === "limite",
    detail: marketCopy(
      language,
      "La liquidez es el dinero que la fuente dice que hay en ese par, en dólares. El volumen es lo que la fuente dice que se movió en el intervalo indicado. STUBX no la calcula.",
      "Liquidity is the money the source says is in that pair, in dollars. Volume is what the source says moved in the stated interval. STUBX does not calculate it.",
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

export const MARKET_RETRY_BUTTON = Object.freeze({
  es: "Reintentar",
  en: "Retry",
});
