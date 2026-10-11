import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const WHEN = "2026-10-11T09:48:00.000Z";
const STAMP = "2026-10-11 09:48:00 UTC";

type Pair = {
  dex: string;
  pairAddress: string;
  base: string;
  quote: string;
  liquidityUsd: number | null;
  volumeUsd: number | null;
  volumeWindow: string | null;
  usdFigure: string | null;
};

type Model = {
  schema: string;
  status: string;
  reason: string;
  mint: string;
  sourceName: string;
  sourceHost: string;
  queriedAt: string;
  zone: string;
  pairs: Pair[] | null;
  omitted: number | null;
};

type MarketModule = {
  MARKET_SOURCE_NAME: string;
  MARKET_MAX_BODY: number;
  isSolanaMint: (value: string) => boolean;
  normalizeUpstream: (status: number, body: string, meta: { mint: string; queriedAt: string }) => Model;
  acceptClientPayload: (value: unknown, mint: string) => Model;
  loadMarket: (mint: string, fetchImpl: (url: string, init?: RequestInit) => Promise<{ status: number; text: () => Promise<string> }>) => Promise<Model>;
  describeMarket: (model: Model, lang: string) => {
    title: string;
    intro: string;
    notice: string;
    source: string;
    gap: string;
    gapTitle: string;
    pairs: Array<{ title: string; liquidity: string; volume: string; figure: string }>;
  };
  formatUsd: (value: number | null, lang: string) => string | null;
  marketFailure: (mint: string, queriedAt: string, reason: string) => Model;
};

type ProxyModule = {
  handleMarketGet: (input: {
    method: string;
    requestUrl: string;
    now: () => Date;
    fetchImpl: (url: string, init?: { method?: string; redirect?: string; headers?: Record<string, string> }) => Promise<{ status: number; text: () => Promise<string> }>;
    takeSlot?: () => boolean;
    readCache?: (mint: string) => Promise<string | null>;
    writeCache?: (mint: string, body: string) => Promise<void>;
  }) => Promise<{ status: number; body: string; headers: Record<string, string>; cacheable: boolean }>;
  marketUpstreamUrl: (mint: string) => string;
};

async function loadMarketModule(): Promise<MarketModule> {
  return (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/market-read.js")).href)) as MarketModule;
}

async function loadProxy(): Promise<ProxyModule> {
  return (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/market-proxy.js")).href)) as ProxyModule;
}

function upstreamPair(overrides: Record<string, unknown> = {}) {
  return {
    chainId: "solana",
    dexId: "raydium",
    pairAddress: PAIR,
    baseToken: { symbol: "USDC" },
    quoteToken: { symbol: "SOL" },
    priceUsd: "1.0001",
    priceChange: { h24: 4.2 },
    volume: { h24: 1200.5, h6: 10 },
    liquidity: { usd: 50000.25 },
    txns: { h24: { buys: 9, sells: 3 } },
    fdv: 99,
    marketCap: 88,
    ...overrides,
  };
}

function prose(view: ReturnType<MarketModule["describeMarket"]>) {
  return [view.title, view.intro, view.notice, view.source, view.gapTitle, view.gap, ...view.pairs.flatMap((pair) => [pair.title, pair.liquidity, pair.volume, pair.figure])].join("\n");
}

describe("datos de mercado", () => {
  test("normaliza pares, liquidez y volumen con fuente y hora, y descarta el resto", async () => {
    const market = await loadMarketModule();
    const model = market.normalizeUpstream(200, JSON.stringify([upstreamPair()]), { mint: MINT, queriedAt: WHEN });
    assert.equal(model.status, "ok");
    assert.equal(model.sourceName, "DEX Screener");
    assert.equal(model.zone, "UTC");
    assert.equal(model.queriedAt, WHEN);
    assert.equal(model.pairs?.[0]?.liquidityUsd, 50000.25);
    assert.equal(model.pairs?.[0]?.volumeUsd, 1200.5);
    assert.equal(model.pairs?.[0]?.volumeWindow, "h24");
    assert.equal(model.pairs?.[0]?.usdFigure, "1.0001");
    const dumped = JSON.stringify(model);
    assert.equal(dumped.includes("priceChange"), false);
    assert.equal(dumped.includes("txns"), false);
    assert.equal(dumped.includes("marketCap"), false);
    assert.equal(dumped.includes("\"fdv\""), false);
    const view = market.describeMarket(model, "es");
    const text = prose(view);
    assert.match(text, /Fuente: DEX Screener/);
    assert.match(text, new RegExp(STAMP));
    assert.match(text, /Liquidez: 50\.000,25 USD/);
    assert.match(text, /Volumen en 24 horas: 1\.200,5 USD/);
    assert.match(text, /Cifra en dólares publicada por la fuente: 1,0001 USD/);
    assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(text), false);
    const english = prose(market.describeMarket(model, "en"));
    assert.match(english, /Source: DEX Screener/);
    assert.match(english, /Queried: 2026-10-11 09:48:00 UTC/);
    assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(english), false);
  });

  test("un cero real se enseña; un campo ausente, negativo o no numérico no se convierte en cero", async () => {
    const market = await loadMarketModule();
    const zero = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ volume: { h24: 0, h6: 40 } })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(zero.pairs?.[0]?.volumeUsd, 0);
    assert.equal(market.formatUsd(0, "es"), "0 USD");
    assert.match(market.describeMarket(zero, "es").pairs[0]?.volume ?? "", /Volumen en 24 horas: 0 USD/);

    const missing = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ liquidity: {} })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(missing.status, "ok");
    assert.equal(missing.pairs?.[0]?.liquidityUsd, null);
    assert.match(market.describeMarket(missing, "es").pairs[0]?.liquidity ?? "", /la fuente no la dio/);
    assert.equal((market.describeMarket(missing, "es").pairs[0]?.liquidity ?? "").includes("0 USD"), false);

    const textZero = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ volume: { h24: "0", h6: 8 } })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(textZero.pairs?.[0]?.volumeUsd, null);
    assert.equal(textZero.pairs?.[0]?.volumeWindow, null);

    const negative = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ volume: { h24: -1, h6: 8 } })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(negative.pairs?.[0]?.volumeUsd, null);
    assert.equal(negative.pairs?.[0]?.volumeWindow, null);
  });

  test("sin pares, fallo, pausa y cuerpo enorme no inventan cifras", async () => {
    const market = await loadMarketModule();
    const empty = market.normalizeUpstream(200, "[]", { mint: MINT, queriedAt: WHEN });
    assert.equal(empty.status, "sin_pares");
    assert.deepEqual(empty.pairs, []);
    assert.match(market.describeMarket(empty, "es").gap, /no listó ningún par/);
    assert.equal(market.describeMarket(empty, "es").gap.includes("0 USD"), false);

    const missingPage = market.normalizeUpstream(404, "", { mint: MINT, queriedAt: WHEN });
    assert.equal(missingPage.status, "sin_pares");

    const paused = market.normalizeUpstream(429, "slow down", { mint: MINT, queriedAt: WHEN });
    assert.equal(paused.status, "limite");
    assert.equal(paused.reason, "pausa-fuente");
    assert.equal(paused.pairs, null);
    assert.match(market.describeMarket(paused, "es").gap, /pidió una pausa/);

    const down = market.normalizeUpstream(500, "<html>no</html>", { mint: MINT, queriedAt: WHEN });
    assert.equal(down.status, "fallo");
    assert.equal(down.pairs, null);
    assert.match(market.describeMarket(down, "es").gap, /La consulta falló/);

    const broken = market.normalizeUpstream(200, "{", { mint: MINT, queriedAt: WHEN });
    assert.equal(broken.status, "fallo");
    assert.equal(broken.reason, "json");
    assert.equal(broken.pairs, null);

    const otherChain = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ chainId: "ethereum" })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(otherChain.status, "fallo");
    assert.equal(otherChain.pairs, null);

    const huge = market.normalizeUpstream(200, "x".repeat(market.MARKET_MAX_BODY + 1), { mint: MINT, queriedAt: WHEN });
    assert.equal(huge.status, "incompleta");
    assert.equal(huge.reason, "grande");
    assert.equal(huge.pairs, null);
  });

  test("el cliente rechaza HTML, un mint distinto y un cuerpo que no es el esquema", async () => {
    const market = await loadMarketModule();
    const html = market.acceptClientPayload("<html>404</html>", MINT);
    assert.equal(html.status, "fallo");
    assert.equal(html.pairs, null);
    const swapped = market.acceptClientPayload(
      market.normalizeUpstream(200, JSON.stringify([upstreamPair()]), { mint: MINT, queriedAt: WHEN }),
      "So11111111111111111111111111111111111111112",
    );
    assert.equal(swapped.status, "fallo");
    assert.equal(swapped.pairs, null);

    let seen = "";
    const loaded = await market.loadMarket(MINT, async (url) => {
      seen = url;
      return { status: 404, text: async () => "<html>missing</html>" };
    });
    assert.equal(seen, `/api/market?mint=${MINT}`);
    assert.equal(loaded.status, "fallo");
    assert.equal(loaded.pairs, null);
    assert.equal(market.describeMarket(loaded, "es").gap.includes("0 USD"), false);
  });

  test("el proxy no consulta si el mint no vale, si hay caché o si el cupo del sitio está lleno", async () => {
    const { handleMarketGet, marketUpstreamUrl } = await loadProxy();
    const now = () => new Date(WHEN);
    let fetches = 0;
    const fetchImpl = async (url: string, init?: { redirect?: string }) => {
      fetches += 1;
      assert.equal(url, `https://api.dexscreener.com/token-pairs/v1/solana/${MINT}`);
      assert.equal(init?.redirect, "manual");
      return { status: 302, text: async () => "" };
    };
    const bad = await handleMarketGet({
      method: "GET",
      requestUrl: "https://stubxai.com/api/market?mint=no-es-mint",
      now,
      fetchImpl,
    });
    assert.equal(bad.status, 400);
    assert.equal(fetches, 0);
    assert.equal(JSON.parse(bad.body).reason, "mint");
    assert.equal(JSON.parse(bad.body).pairs, null);

    const cached = await handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now,
      fetchImpl,
      takeSlot: () => {
        throw new Error("la caché no debe gastar cupo");
      },
      readCache: async () => JSON.stringify({ schema: "stubx.market.v1", cached: true }),
    });
    assert.equal(cached.status, 200);
    assert.equal(fetches, 0);
    assert.match(cached.body, /cached/);

    const limited = await handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now,
      fetchImpl,
      takeSlot: () => false,
      readCache: async () => null,
    });
    assert.equal(limited.status, 429);
    assert.equal(fetches, 0);
    assert.equal(JSON.parse(limited.body).reason, "pausa-sitio");
    assert.equal(JSON.parse(limited.body).pairs, null);

    const redirected = await handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now,
      fetchImpl,
      takeSlot: () => true,
      readCache: async () => null,
    });
    assert.equal(fetches, 1);
    assert.equal(redirected.status, 502);
    assert.equal(JSON.parse(redirected.body).status, "fallo");
    assert.equal(marketUpstreamUrl("no"), "");
    assert.equal(marketUpstreamUrl(MINT).startsWith("https://api.dexscreener.com/token-pairs/v1/solana/"), true);
  });

  test("la función y la vista no reenvían cabeceras, no abren CORS y no interpretan HTML externo", () => {
    const root = repoRoot();
    const fn = readFileSync(path.join(root, "web/v2/functions/api/market.js"), "utf8");
    const proxy = readFileSync(path.join(root, "web/v2/shared/market-proxy.js"), "utf8");
    const view = readFileSync(path.join(root, "web/v2/shared/market-view.js"), "utf8");
    const headers = readFileSync(path.join(root, "web/v2/_headers"), "utf8");
    const verify = readFileSync(path.join(root, "web/v2/verify/index.html"), "utf8");
    for (const source of [fn, proxy]) {
      assert.equal(source.includes("request.headers"), false);
      assert.equal(source.includes("CF-Connecting-IP"), false);
      assert.equal(source.includes("Access-Control-Allow-Origin"), false);
    }
    assert.equal(view.includes("innerHTML"), false);
    assert.equal(view.includes("insertAdjacentHTML"), false);
    assert.equal(headers.includes("dexscreener"), false);
    assert.equal(verify.includes("dexscreener"), false);
    assert.match(headers, /connect-src 'self'/);
  });
});
