/** La clave demo ronda las 30 llamadas/min y 10 000 al mes.
 *  El minuto cuenta cada llamada a CoinGecko (pública o con clave) y se guarda en Cache API,
 *  no solo en la memoria del isolate. El día cuenta solo las llamadas que sí llevan la clave.
 *  No es un contador atómico entre regiones: los TTL largos son el freno de verdad. */

const DAY_CAP = 300;
const MINUTE_CAP = 20;

const state = {
  day: "",
  count: 0,
  minute: 0,
  minuteCount: 0,
  hydrated: false,
  minuteHydrated: false,
};

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function usageRequest(day) {
  return new Request(`https://sonar.internal/cg-usage/${day}`);
}

async function readSaved(day) {
  const cache = globalThis.caches?.default;
  if (!cache) return 0;
  try {
    const hit = await cache.match(usageRequest(day));
    if (!hit) return 0;
    const body = await hit.json();
    const count = Number(body?.count);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

async function writeSaved(day, count) {
  const cache = globalThis.caches?.default;
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify({ day, count }), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=172800" },
    });
    await cache.put(usageRequest(day), response);
  } catch {
    /* la memoria del isolate sigue contando */
  }
}

function minuteRequest(minute) {
  return new Request(`https://sonar.internal/cg-minute/${minute}`);
}

async function readMinute(minute) {
  const cache = globalThis.caches?.default;
  if (!cache) return 0;
  try {
    const hit = await cache.match(minuteRequest(minute));
    if (!hit) return 0;
    const body = await hit.json();
    const count = Number(body?.count);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

async function writeMinute(minute, count) {
  const cache = globalThis.caches?.default;
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify({ minute, count }), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=120" },
    });
    await cache.put(minuteRequest(minute), response);
  } catch {
    /* la memoria del isolate sigue contando */
  }
}

async function hydrate() {
  const now = Date.now();
  const day = utcDay(now);
  const minute = Math.floor(now / 60000);
  if (state.minute !== minute) {
    state.minute = minute;
    state.minuteCount = 0;
    state.minuteHydrated = false;
  }
  if (!state.hydrated || state.day !== day) {
    const saved = await readSaved(day);
    if (state.day !== day) state.count = 0;
    state.day = day;
    state.count = Math.max(state.count, saved);
    state.hydrated = true;
  }
  if (state.minuteHydrated) return;
  const savedMinute = await readMinute(minute);
  state.minuteCount = Math.max(state.minuteCount, savedMinute);
  state.minuteHydrated = true;
}

// Hasta cuándo se salta el intento sin clave (tras un 429 sin clave).
export function publicHoldUntil() {
  return state.publicHold || 0;
}

export function holdPublic(ms) {
  state.publicHold = Date.now() + ms;
}

/** Tope de llamadas upstream a CoinGecko en este minuto, compartido por Cache API. */
export async function upstreamAllowed() {
  await hydrate();
  if (state.minuteCount >= MINUTE_CAP) return { ok: false, reason: "minute" };
  return { ok: true, reason: "" };
}

export async function noteUpstreamCall(path) {
  await hydrate();
  state.minuteCount += 1;
  const route = String(path || "").split("?")[0].slice(0, 80);
  console.log(`sonar-cg-rpm minute=${state.minuteCount} cap=${MINUTE_CAP} route=${route}`);
  await writeMinute(state.minute, state.minuteCount);
  return { minute: state.minuteCount };
}

export async function keyedAllowed() {
  await hydrate();
  if (state.count >= DAY_CAP) return { ok: false, reason: "day" };
  if (state.minuteCount >= MINUTE_CAP) return { ok: false, reason: "minute" };
  return { ok: true, reason: "" };
}

export async function noteKeyedCall(path) {
  await hydrate();
  state.count += 1;
  const route = String(path || "").split("?")[0].slice(0, 80);
  console.log(`sonar-cg-demo day=${state.day} calls=${state.count} minute=${state.minuteCount} route=${route}`);
  await writeSaved(state.day, state.count);
  return { day: state.day, calls: state.count, minute: state.minuteCount };
}

export function keyedUsage() {
  return { day: state.day, calls: state.count, minute: state.minuteCount, dayCap: DAY_CAP, minuteCap: MINUTE_CAP };
}

export function resetKeyedUsage() {
  state.day = utcDay();
  state.count = 0;
  state.minute = Math.floor(Date.now() / 60000);
  state.minuteCount = 0;
  state.hydrated = true;
  state.minuteHydrated = true;
  state.publicHold = 0;
}

export function setKeyedUsageForTests({ calls = 0, minute = 0 } = {}) {
  resetKeyedUsage();
  state.count = calls;
  state.minuteCount = minute;
}
