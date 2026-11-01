/** Cabeceras y validación de la API interna de Sonar. Sin cookies ni claves hacia el cliente. */

export const SONAR_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-hashes' 'sha256-3pRED1tOXas1FXFoPb9TGCjmYe9XQsmO9OV23khV2nY='",
  "img-src 'self' https://coin-images.coingecko.com https://assets.coingecko.com https://assets.geckoterminal.com https://static.coinpaprika.com",
  "font-src 'self'",
  "connect-src 'self' wss://data-stream.binance.vision https://solana-rpc.publicnode.com https://public.rpc.solanavibestation.com https://public.rpc.atl1.solanavibestation.com https://public.rpc.ams1.solanavibestation.com https://api.mainnet-beta.solana.com https://mainnet.base.org https://ethereum-rpc.publicnode.com https://bsc-rpc.publicnode.com https://api.dexscreener.com https://arbitrum-one-rpc.publicnode.com https://polygon-bor-rpc.publicnode.com https://optimism-rpc.publicnode.com https://avalanche-c-chain-rpc.publicnode.com https://api.geckoterminal.com https://api.coingecko.com https://mempool.space https://api.trongrid.io https://data-api.binance.vision https://api.binance.com https://blockstream.info https://base-rpc.publicnode.com https://bsc-dataseed.binance.org https://arb1.arbitrum.io https://polygon-rpc.com https://mainnet.optimism.io https://api.avax.network https://cloudflare-eth.com https://eth.blockscout.com",
  "manifest-src 'self'",
  "media-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Ids de CoinGecko: minúsculas, dígitos, "-", "_" y "." (p. ej. uniswap_v3, sectorone-v2.0-base). Nunca "/" ni "..".
const SLUG = /^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/;
const buckets = new Map();

export function clientIp(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
}

export function allowRequest(ip, limit = 120) {
  const now = Date.now();
  const recent = (buckets.get(ip) || []).filter((stamp) => now - stamp < 60_000);
  if (buckets.size > 2000) {
    for (const [key, stamps] of buckets) {
      if (!stamps.length || now - stamps[stamps.length - 1] > 60_000) buckets.delete(key);
    }
  }
  if (recent.length >= limit) {
    buckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ip, recent);
  return true;
}

export function slugOk(value) {
  return SLUG.test(String(value || ""));
}

export function intIn(value, min, max, fallback) {
  if (value == null || value === "") return fallback;
  const raw = String(value);
  if (!/^\d{1,12}$/.test(raw)) return null;
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < min || number > max) return null;
  return number;
}

export function publicHandle(value, pattern = /^[A-Za-z0-9_]{1,32}$/) {
  const text = String(value || "").trim().replace(/^@/, "");
  return pattern.test(text) ? text : null;
}

export function oneOf(value, allowed, fallback) {
  if (value == null || value === "") return fallback;
  return allowed.includes(value) ? value : null;
}

export function cleanQuery(value) {
  const text = String(value || "").replace(/[\u0000-\u001f<>]/g, "").trim();
  if (text.length < 1 || text.length > 64) return "";
  return text;
}

export function httpsUrl(value) {
  return webUrl(value, ["https:"]);
}

export function webUrl(value, protocols = ["https:", "http:"]) {
  if (typeof value !== "string" || !value || value === "null") return null;
  try {
    const url = new URL(value.trim());
    if (!protocols.includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function imageUrl(value) {
  const url = httpsUrl(value);
  if (!url) return null;
  const host = new URL(url).host;
  if (host === "coin-images.coingecko.com" || host === "assets.coingecko.com" || host === "assets.geckoterminal.com" || host === "static.coinpaprika.com") return url;
  return null;
}

export function securityHeaders(extra = {}) {
  const headers = new Headers(extra);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-frame-options", "DENY");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("content-security-policy", SONAR_CSP);
  return headers;
}

export function json(status, body, extra = {}) {
  const headers = securityHeaders({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extra,
  });
  return new Response(JSON.stringify(body), { status, headers });
}

export function disabledSet(env) {
  return new Set(String(env?.SONAR_DISABLE || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}
