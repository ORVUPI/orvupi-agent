/** Lecturas públicas de solo lectura. Si fallan, no se inventa ninguna cifra. */

const LIVE = /\b(inversi[oó]n(?:es)?|bolsa|mercados?|acciones|bonos|criptomonedas?|cripto|bitcoin|ethereum|divisas?|inflaci[oó]n|tipos de inter[eé]s|cotizaci[oó]n)\b/i;

export function wantsLiveFacts(question) {
  return LIVE.test(String(question || ""));
}

async function readJson(fetchImpl, url, timeoutMs) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  return response.json();
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

export async function liveFacts(question, options = {}) {
  if (!wantsLiveFacts(question)) return { text: "", sources: [] };
  const fetchImpl = options.fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 4000;
  const now = options.now instanceof Date ? options.now : new Date();
  const blocks = [];
  const sources = [];
  const [fxResult, coinResult] = await Promise.allSettled([
    readFx(fetchImpl, timeoutMs, now),
    readJson(fetchImpl, "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&price_change_percentage=24h,7d", timeoutMs),
  ]);
  if (fxResult.status === "fulfilled") {
    const text = formatFx(fxResult.value);
    if (text) {
      blocks.push(`[fx]\n${text}`);
      sources.push({ id: "fx", name: "Frankfurter", date: fxResult.value.at(-1)?.date || "" });
    }
  }
  if (coinResult.status === "fulfilled" && Array.isArray(coinResult.value)) {
    const text = formatCoins(coinResult.value, now);
    if (text) {
      blocks.push(`[btc]\n${text}`);
      sources.push({ id: "btc", name: "CoinGecko", date: stampFrom(coinResult.value.find((row) => row?.last_updated)?.last_updated, now) });
    }
  }
  return { text: blocks.join("\n\n"), sources };
}
