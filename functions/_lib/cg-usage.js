/** Cuenta llamadas con la clave demo. El tope diario deja margen bajo las 10 000 al mes.
 *  Memoria del isolate más Cache API: es una estimación, no un contador atómico entre regiones. */

const DAY_CAP = 300;
const MINUTE_CAP = 80;

const state = {
  day: "",
  count: 0,
  minute: 0,
  minuteCount: 0,
  hydrated: false,
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

async function hydrate() {
  const now = Date.now();
  const day = utcDay(now);
  const minute = Math.floor(now / 60000);
  if (state.minute !== minute) {
    state.minute = minute;
    state.minuteCount = 0;
  }
  if (state.hydrated && state.day === day) return;
  const saved = await readSaved(day);
  if (state.day !== day) state.count = 0;
  state.day = day;
  state.count = Math.max(state.count, saved);
  state.hydrated = true;
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
  state.minuteCount += 1;
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
}

export function setKeyedUsageForTests({ calls = 0, minute = 0 } = {}) {
  resetKeyedUsage();
  state.count = calls;
  state.minuteCount = minute;
}
