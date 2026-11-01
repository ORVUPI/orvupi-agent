/** Cola por proveedor, espera ante 429 y corte si falla seguido. */

const GAP_MS = {
  coingecko: 350,
  geckoterminal: 900,
  alternative: 250,
  patternplus: 250,
  binance: 120,
  chain: 250,
};

const nextAt = new Map();
const streak = new Map();
const openUntil = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function guarded(provider, run) {
  const until = openUntil.get(provider) || 0;
  if (Date.now() < until) {
    const error = new Error("circuit");
    error.code = "circuit";
    error.provider = provider;
    throw error;
  }
  const wait = (nextAt.get(provider) || 0) - Date.now();
  if (wait > 0) await sleep(wait);
  nextAt.set(provider, Date.now() + (GAP_MS[provider] || 300));
  try {
    const value = await run();
    streak.set(provider, 0);
    return value;
  } catch (error) {
    const count = (streak.get(provider) || 0) + 1;
    streak.set(provider, count);
    if (count >= 5) openUntil.set(provider, Date.now() + 60_000);
    throw error;
  }
}

export async function getJson(url, { headers, timeout = 8000, provider = "coingecko" } = {}) {
  return guarded(provider, async () => {
    let last = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { headers, signal: controller.signal });
        if (response.status === 429 || response.status >= 500) {
          last = response.status;
          const retry = Number(response.headers.get("retry-after"));
          await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 8000) : 400 * (2 ** attempt));
          continue;
        }
        if (response.status === 404) {
          const error = new Error("not-found");
          error.status = 404;
          throw error;
        }
        if (!response.ok) {
          const error = new Error("upstream");
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (error) {
        if (error?.status === 404 || error?.status === 400 || error?.status === 401) throw error;
        last = error;
        if (attempt === 2) throw error;
        await sleep(400 * (2 ** attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    const error = new Error("upstream");
    error.status = typeof last === "number" ? last : 502;
    throw error;
  });
}
