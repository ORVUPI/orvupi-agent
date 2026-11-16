/** Lecturas públicas de solo lectura. Si fallan, no se inventa ninguna cifra. */

const LIVE = /\b(inversi[oó]n(?:es)?|bolsa|mercados?|acciones|bonos|criptomonedas?|cripto|bitcoin|ethereum|divisas?|inflaci[oó]n|tipos de inter[eé]s|cotizaci[oó]n|investments?|stocks?|shares|markets?|currenc(?:y|ies)|inflation)\b/i;

export function wantsLiveFacts(question) {
  return LIVE.test(String(question || ""));
}

const CACHE_MS = 5 * 60 * 1000;
const memory = {};

async function readJson(fetchImpl, url, timeoutMs) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      if (!response?.ok) continue;
      return await response.json();
    } catch {
      last = null;
    }
  }
  return last;
}

function euroDate(iso) {
  const [year, month, day] = String(iso || "").split("-");
  if (!year || !month || !day) return "";
  return `${day}-${month}-${year}`;
}

function isoDaysAgo(days, now) {
  return new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
}

function madridStamp(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const day = pick("day");
  const month = pick("month");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!day || !month || !hour || !minute) return "";
  return `${day}-${month} ${hour}:${minute}`;
}

function stampFrom(iso, now) {
  const date = new Date(iso || "");
  if (Number.isNaN(date.getTime())) return madridStamp(now);
  return madridStamp(date);
}

function money(amount) {
  const number = Number(amount);
  return Number.isFinite(number) ? String(number) : "";
}

function signedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2).replace(".", ",")} %`;
}

function fxPoints(body) {
  const rates = body?.rates;
  if (!rates || typeof rates !== "object" || Array.isArray(rates)) return [];
  if (Number.isFinite(Number(rates.USD)) || Number.isFinite(Number(rates.GBP))) {
    const date = euroDate(body.date);
    return date ? [{ date, usd: rates.USD, gbp: rates.GBP }] : [];
  }
  return Object.keys(rates).sort().flatMap((iso) => {
    const date = euroDate(iso);
    const row = rates[iso];
    if (!date || !row) return [];
    return [{ date, usd: row.USD, gbp: row.GBP }];
  });
}

function changeLine(label, from, to, fromDate, toDate) {
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) return "";
  const shown = signedPercent(((end - start) / start) * 100);
  return `Variación del ${label} entre ${fromDate} y ${toDate}: ${shown} (el BCE, Frankfurter, ${fromDate} y ${toDate}). Calculada entre esas dos lecturas.`;
}

function formatFx(points) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const span = points.length >= 2 && first.date !== last.date;
  const lines = [span
    ? `Histórico del BCE vía Frankfurter: ${points.length} lecturas entre ${first.date} y ${last.date}. Cada cifra se cita con «el BCE, Frankfurter» y su fecha. El cambio se describe entre esas dos fechas.`
    : `Una sola lectura del BCE vía Frankfurter, ${first.date}. No hay histórico de 30 días: no digas que se mantiene, ni estabilidad, ni fortaleza, ni recuperación, ni equilibrio.`];
  const shown = span ? [first, last] : [first];
  for (const point of shown) {
    const usd = money(point.usd);
    const gbp = money(point.gbp);
    if (usd) lines.push(`1 EUR = ${usd} USD (el BCE, Frankfurter, ${point.date}).`);
    if (gbp) lines.push(`1 EUR = ${gbp} GBP (el BCE, Frankfurter, ${point.date}).`);
  }
  if (span) {
    const usd = changeLine("euro frente al dólar", first.usd, last.usd, first.date, last.date);
    const gbp = changeLine("euro frente a la libra", first.gbp, last.gbp, first.date, last.date);
    if (usd) lines.push(usd);
    if (gbp) lines.push(gbp);
  }
  return lines.join("\n");
}

async function readFx(fetchImpl, timeoutMs, now) {
  const end = isoDaysAgo(0, now);
  const start = isoDaysAgo(30, now);
  const series = await readJson(fetchImpl, `https://api.frankfurter.app/${start}..${end}?from=EUR&to=USD,GBP`, timeoutMs);
  const points = fxPoints(series);
  if (points.length >= 2) return points;
  const latest = await readJson(fetchImpl, "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", timeoutMs);
  return fxPoints(latest);
}

function formatCoins(rows, now) {
  const names = { bitcoin: "Bitcoin", ethereum: "Ethereum" };
  const lines = ["Cada cifra lleva su propia cita. Ethereum se cita aparte de Bitcoin."];
  for (const id of ["bitcoin", "ethereum"]) {
    const row = rows.find((item) => item?.id === id);
    const name = names[id];
    const price = money(row?.current_price);
    if (!price) continue;
    const cite = `CoinGecko, ${stampFrom(row.last_updated, now)}`;
    lines.push(`${name}: ${price} USD (${cite}).`);
    const day = signedPercent(row.price_change_percentage_24h);
    const week = signedPercent(row.price_change_percentage_7d_in_currency);
    if (day) lines.push(`Variación 24 h de ${name}: ${day} (${cite}).`);
    if (week) lines.push(`Variación 7 d de ${name}: ${week} (${cite}).`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

function cacheFor(options) {
  if (options.store) return options.store;
  if (options.fetch) return {};
  return memory;
}

function stillFresh(entry, now) {
  return Boolean(entry?.text) && now.getTime() - entry.at < CACHE_MS;
}

async function loadFx(fetchImpl, timeoutMs, now, store) {
  if (stillFresh(store.fx, now)) return store.fx;
  try {
    const points = await readFx(fetchImpl, timeoutMs, now);
    const text = formatFx(points);
    if (text) {
      store.fx = { at: now.getTime(), text, date: points.at(-1)?.date || "" };
      return store.fx;
    }
  } catch { /* se usa la última lectura buena */ }
  return store.fx?.text ? store.fx : null;
}

async function loadCoins(fetchImpl, timeoutMs, now, store) {
  if (stillFresh(store.coins, now)) return store.coins;
  try {
    const rows = await readJson(fetchImpl, "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&price_change_percentage=24h,7d", timeoutMs);
    const text = Array.isArray(rows) ? formatCoins(rows, now) : "";
    if (text) {
      store.coins = { at: now.getTime(), text, date: stampFrom(rows.find((row) => row?.last_updated)?.last_updated, now) };
      return store.coins;
    }
  } catch { /* se usa la última lectura buena */ }
  return store.coins?.text ? store.coins : null;
}

export async function liveFacts(question, options = {}) {
  if (!wantsLiveFacts(question)) return { text: "", sources: [], offline: false };
  const fetchImpl = options.fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 4000;
  const now = options.now instanceof Date ? options.now : new Date();
  const store = cacheFor(options);
  const [fx, coins] = await Promise.all([
    loadFx(fetchImpl, timeoutMs, now, store),
    loadCoins(fetchImpl, timeoutMs, now, store),
  ]);
  const blocks = [];
  const sources = [];
  if (fx?.text) {
    blocks.push(`[fx]\n${fx.text}`);
    sources.push({ id: "fx", name: "Frankfurter", date: fx.date || "" });
  }
  if (coins?.text) {
    blocks.push(`[btc]\n${coins.text}`);
    sources.push({ id: "btc", name: "CoinGecko", date: coins.date || "" });
  }
  const text = blocks.join("\n\n");
  return { text, sources, offline: !text };
}
