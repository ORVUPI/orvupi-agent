import { getJson } from "../limits.js";
import { disabledSet, httpsUrl, slugOk } from "../security.js";
import { num, stamp, text } from "../normalize.js";

const HOME = "https://pattern.plus";

function disabled(env) {
  if (!disabledSet(env).has("patternplus")) return;
  const error = new Error("disabled");
  error.code = "disabled";
  throw error;
}

async function load(env, file) {
  disabled(env);
  return getJson(`https://pattern.plus/api/v1/${file}`, { provider: "patternplus", timeout: 10000 });
}

function meta(body, extra) {
  return stamp("PatternPlus", HOME, body?.attribution?.text || "Data: PatternPlus", {
    license: body?.license?.name || "CC BY 4.0",
    licenseUrl: httpsUrl(body?.license?.url) || "https://creativecommons.org/licenses/by/4.0/",
    attributionUrl: httpsUrl(body?.attribution?.url) || HOME,
    asOf: text(body?.as_of, 20),
    ...extra,
  });
}

export async function getAltseason(env) {
  const body = await load(env, "altseason.json");
  const data = body?.data || {};
  return meta(body, {
    value: num(data.index),
    season: text(data.season, 40),
    beat: num(data.beat),
    coins: num(data.coins),
    lookDays: num(data.look_days),
    method: "Cuántas de las monedas seguidas superan a Bitcoin en la ventana publicada.",
    page: httpsUrl(data.page),
  });
}

export function unlockRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    date: text(row.date, 20),
    coinId: text(row.token, 80),
    symbol: text(row.symbol, 24),
    name: text(row.name, 120),
    amount: num(row.amount),
    pctCirc: num(row.pct_circulating),
    pctTotal: num(row.pct_total),
    valueUsd: num(row.value_usd),
    types: Array.isArray(row.types) ? row.types.filter((item) => typeof item === "string").slice(0, 4) : [],
    basis: Array.isArray(row.basis) ? row.basis.filter((item) => typeof item === "string").slice(0, 4) : [],
  };
}

export async function getUnlocks(env) {
  const body = await load(env, "unlocks.json");
  const rows = (Array.isArray(body?.data) ? body.data : []).map(unlockRow).filter((row) => row?.date);
  return meta(body, { rows });
}

export async function getUnlockCoin(env, slug) {
  if (!slugOk(slug)) {
    const error = new Error("invalid");
    error.status = 400;
    throw error;
  }
  try {
    const body = await load(env, `unlocks/${slug}.json`);
    const data = body?.data;
    const rows = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : Array.isArray(data?.unlocks) ? data.unlocks : [];
    return meta(body, { rows: rows.map(unlockRow).filter((row) => row?.date), coinId: slug });
  } catch (error) {
    if (error?.status === 404) return meta({ attribution: { text: "Data: PatternPlus" } }, { rows: [], coinId: slug, missing: true });
    throw error;
  }
}

export async function getCalendar(env) {
  const body = await load(env, "calendar.json");
  const rows = (Array.isArray(body?.data) ? body.data : []).map((row) => ({
    date: text(row.date, 20),
    kind: text(row.kind, 40),
    coinId: text(row.token, 80),
    symbol: text(row.symbol, 24),
    name: text(row.name, 120),
    title: text(row.title, 240),
    page: httpsUrl(row.page),
  })).filter((row) => row.date && row.title);
  return meta(body, { rows });
}
