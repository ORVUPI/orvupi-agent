import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";
import { normalizeToken } from "../verify/impersonation.js";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const SOL = "So11111111111111111111111111111111111111112";
const OFFICIAL = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const WHEN = "2026-10-11T09:48:00.000Z";
const STAMP_ES = "Fuente: DEX Screener · leído el 11-10-2026 a las 11:48 (hora de Madrid)";
const STAMP_EN = "Source: DEX Screener · read 11-10-2026 11:48 (Madrid time)";
const ACCURACY_ES = "Datos: DEX Screener. Pueden no ser exactos ni estar al día.";
const ACCURACY_EN = "Data: DEX Screener. It may be inaccurate or out of date.";

type Pair = {
  dex: string;
  pairAddress: string;
  base: string;
  quote: string;
  liquidityUsd: number | null;
  volumeUsd: number | null;
  volumeWindow: string | null;
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
  MARKET_TIMEOUT_MS: number;
  MARKET_LOW_USD: number;
  MARKET_OFFICIAL_MINT: string;
  MARKET_ATTRIBUTION: { es: string; en: string };
  marketNormalizeToken: (value: string) => string;
  marketPrivacy: (lang: string) => string;
  isSolanaMint: (value: string) => boolean;
  normalizeUpstream: (status: number, body: string, meta: { mint: string; queriedAt: string }) => Model;
  acceptClientPayload: (value: unknown, mint: string) => Model;
  loadMarket: (
    mint: string,
    fetchImpl: (url: string, init?: RequestInit) => Promise<{ status: number; text: () => Promise<string> }>,
    now?: { timeoutMs?: number; now?: () => Date },
  ) => Promise<Model>;
  describeMarket: (model: Model, lang: string) => {
    title: string;
    intro: string;
    notice: string;
    privacy: string;
    attribution: string;
    source: string;
    gap: string;
    gapTitle: string;
    detail: string;
    retry: boolean;
    pairs: Array<{ title: string; liquidity: string; volume: string; low: string }>;
  };
  formatUsd: (value: number | null, lang: string) => string | null;
  marketFailure: (mint: string, queriedAt: string, reason: string) => Model;
};

type ProxyModule = {
  handleMarketGet: (input: {
    method: string;
    requestUrl: string;
    now: () => Date;
    timeoutMs?: number;
    fetchImpl: (
      url: string,
      init?: { method?: string; redirect?: string; headers?: Record<string, string>; signal?: AbortSignal },
    ) => Promise<{ status: number; text?: () => Promise<string>; body?: { getReader: () => Reader } }>;
    takeSlot?: () => boolean;
    readCache?: (mint: string) => Promise<string | null>;
    writeCache?: (mint: string, body: string) => Promise<void>;
  }) => Promise<{ status: number; body: string; headers: Record<string, string>; cacheable: boolean }>;
  marketUpstreamUrl: (mint: string) => string;
  MARKET_CACHE_SECONDS: number;
  MARKET_RATE_LIMIT: number;
  MARKET_RATE_WINDOW_MS: number;
};

type Reader = {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
  cancel: () => Promise<void>;
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
    baseToken: { symbol: "USDC", address: MINT },
    quoteToken: { symbol: "SOL", address: SOL },
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
  return [
    view.title,
    view.intro,
    view.notice,
    view.privacy,
    view.attribution,
    view.source,
    view.detail,
    view.gapTitle,
    view.gap,
    ...view.pairs.flatMap((pair) => [pair.title, pair.liquidity, pair.volume, pair.low]),
  ].join("\n");
}

function priceFree(value: unknown) {
  const dumped = JSON.stringify(value);
  assert.equal(dumped.includes("priceUsd"), false);
  assert.equal(dumped.includes("usdFigure"), false);
  assert.equal(dumped.includes("priceChange"), false);
  assert.equal(dumped.includes("txns"), false);
  assert.equal(dumped.includes("marketCap"), false);
  assert.equal(dumped.includes("\"fdv\""), false);
  assert.equal(dumped.includes("Una cifra en dólares"), false);
}

describe("datos de mercado", () => {
  test("normaliza pares, liquidez y volumen con fuente y hora, y descarta el resto", async () => {
    const market = await loadMarketModule();
    const model = market.normalizeUpstream(200, JSON.stringify([upstreamPair()]), { mint: MINT, queriedAt: WHEN });
    assert.equal(model.status, "ok");
    assert.equal(model.sourceName, "DEX Screener");
    assert.equal(model.zone, "Europe/Madrid");
    assert.equal(model.queriedAt, WHEN);
    assert.equal(model.pairs?.[0]?.liquidityUsd, 50000.25);
    assert.equal(model.pairs?.[0]?.volumeUsd, 1200.5);
    assert.equal(model.pairs?.[0]?.volumeWindow, "h24");
    assert.equal(Object.hasOwn(model.pairs?.[0] ?? {}, "usdFigure"), false);
    priceFree(model);
    const view = market.describeMarket(model, "es");
    const text = prose(view);
    assert.equal(view.attribution, ACCURACY_ES);
    assert.equal(text.includes(STAMP_ES), true);
    assert.equal(view.pairs[0]?.liquidity.includes(STAMP_ES), true);
    assert.equal(view.pairs[0]?.volume.includes(STAMP_ES), true);
    assert.match(text, /Liquidez: 50\.000,25 USD/);
    assert.match(text, /Volumen en 24 horas: 1\.200,5 USD/);
    assert.equal(text.includes("Una cifra en dólares"), false);
    assert.equal(text.includes("cifra en dólares"), false);
    assert.equal(view.detail.includes("Una cifra en dólares"), false);
    assert.equal(Object.hasOwn(view.pairs[0] ?? {}, "figure"), false);
    assert.equal(view.retry, false);
    assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(text), false);
    assert.equal(/\b(afiliad|partner|endors|respaldo|patrocin|logo)\b/i.test(text), false);
    const englishView = market.describeMarket(model, "en");
    const english = prose(englishView);
    assert.equal(englishView.attribution, ACCURACY_EN);
    assert.equal(english.includes(STAMP_EN), true);
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

    const missingPage = market.normalizeUpstream(404, "[]", { mint: MINT, queriedAt: WHEN });
    assert.equal(missingPage.status, "fallo");
    assert.equal(missingPage.reason, "http");
    assert.equal(missingPage.pairs, null);
    assert.equal(market.describeMarket(missingPage, "es").gap, "No se pudo consultar.");
    assert.equal(market.describeMarket(missingPage, "es").retry, true);

    const paused = market.normalizeUpstream(429, "slow down", { mint: MINT, queriedAt: WHEN });
    assert.equal(paused.status, "limite");
    assert.equal(paused.reason, "pausa-fuente");
    assert.equal(paused.pairs, null);
    assert.match(market.describeMarket(paused, "es").gap, /pidió una pausa/);

    const down = market.normalizeUpstream(500, "<html>no</html>", { mint: MINT, queriedAt: WHEN });
    assert.equal(down.status, "fallo");
    assert.equal(down.pairs, null);
    assert.equal(market.describeMarket(down, "es").gap, "No se pudo consultar.");
    assert.equal(market.describeMarket(down, "es").retry, true);

    const broken = market.normalizeUpstream(200, "{", { mint: MINT, queriedAt: WHEN });
    assert.equal(broken.status, "fallo");
    assert.equal(broken.reason, "json");
    assert.equal(broken.pairs, null);

    const otherChain = market.normalizeUpstream(200, JSON.stringify([upstreamPair({ chainId: "ethereum" })]), { mint: MINT, queriedAt: WHEN });
    assert.equal(otherChain.status, "fallo");
    assert.equal(otherChain.pairs, null);

    const huge = market.normalizeUpstream(200, "x".repeat(market.MARKET_MAX_BODY + 1), { mint: MINT, queriedAt: WHEN });
    assert.equal(huge.status, "fallo");
    assert.equal(huge.reason, "grande");
    assert.equal(huge.pairs, null);
    assert.equal(market.describeMarket(huge, "es").gap, "No se pudo consultar.");
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
      readCache: async () =>
        JSON.stringify({
          schema: "stubx.market.v1",
          status: "ok",
          reason: "leido",
          mint: MINT,
          sourceName: "DEX Screener",
          queriedAt: WHEN,
          pairs: [
            {
              dex: "raydium",
              pairAddress: PAIR,
              base: "USDC",
              quote: "SOL",
              liquidityUsd: 12,
              volumeUsd: 3,
              volumeWindow: "h24",
              usdFigure: "1.0001",
              priceUsd: "1.0001",
            },
          ],
          omitted: 0,
          priceUsd: "9",
        }),
    });
    assert.equal(cached.status, 200);
    assert.equal(fetches, 0);
    priceFree(JSON.parse(cached.body));
    assert.equal(JSON.parse(cached.body).pairs[0].liquidityUsd, 12);

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
    assert.equal(proxy.includes("x-forwarded-for"), false);
    assert.equal(proxy.includes("X-Forwarded-For"), false);
    assert.equal(proxy.includes("user-agent"), false);
    assert.equal(proxy.includes("User-Agent"), false);
    assert.match(proxy, /headers:\s*\{\s*accept:\s*"application\/json"\s*\}/);
    const read = readFileSync(path.join(root, "web/v2/shared/market-read.js"), "utf8");
    for (const source of [fn, proxy, view, read, readFileSync(path.join(root, "web/v2/assets/verify.js"), "utf8")]) {
      assert.equal(source.includes("priceUsd"), false);
      assert.equal(source.includes("usdFigure"), false);
      assert.equal(source.includes("Una cifra en dólares"), false);
    }
    const css = readFileSync(path.join(root, "web/v2/assets/site.css"), "utf8");
    const rule = css.match(/\.datos-mercado \[data-cifra\] \{[^}]+\}/)?.[0] ?? "";
    assert.match(rule, /color:\s*var\(--cream\)/);
    assert.equal(/--ok|--risk|--gem|green|red|#1beb91|#ffd0dc/.test(rule), false);
    const ui = readFileSync(path.join(root, "lab/client/verify-ui.js"), "utf8");
    assert.match(ui, /auto:\s*false/);
    assert.equal(ui.includes("auto: true"), false);
    const notebook = readFileSync(path.join(root, "web/v2/assets/cuaderno.js"), "utf8");
    assert.equal(notebook.includes("autoMarket: true"), false);
  });

  test("un par de otra dirección, incluida la CA oficial, se descarta", async () => {
    const market = await loadMarketModule();
    const foreign = market.normalizeUpstream(
      200,
      JSON.stringify([
        upstreamPair({
          baseToken: { symbol: "STUBX", address: OFFICIAL },
          quoteToken: { symbol: "SOL", address: SOL },
          liquidity: { usd: 999999 },
        }),
      ]),
      { mint: MINT, queriedAt: WHEN },
    );
    assert.equal(foreign.status, "fallo");
    assert.equal(foreign.pairs, null);
    const dumped = JSON.stringify(foreign);
    assert.equal(dumped.includes(OFFICIAL), false);
    assert.equal(dumped.includes("999999"), false);

    const kept = market.normalizeUpstream(
      200,
      JSON.stringify([
        upstreamPair({
          baseToken: { symbol: "STUBX", address: OFFICIAL },
          quoteToken: { symbol: "SOL", address: SOL },
          liquidity: { usd: 40 },
        }),
        upstreamPair({ liquidity: { usd: 80 } }),
      ]),
      { mint: OFFICIAL, queriedAt: WHEN },
    );
    assert.equal(kept.status, "ok");
    assert.equal(kept.pairs?.length, 1);
    assert.equal(kept.pairs?.[0]?.base, "STUBX");
    assert.equal(kept.pairs?.[0]?.liquidityUsd, 40);
    assert.equal(market.describeMarket(kept, "es").pairs[0]?.title.includes("Dice llamarse"), false);
  });

  test("un clon llamado STUBX dice su nombre y clipSymbol quita ancho cero y bidi", async () => {
    const market = await loadMarketModule();
    assert.equal(market.marketNormalizeToken("STU\u200BBX"), normalizeToken("STU\u200BBX"));
    assert.equal(market.marketNormalizeToken("S\u03A4UBX"), normalizeToken("S\u03A4UBX"));
    assert.equal(market.marketNormalizeToken("STU\u200BBX"), "stubx");
    const clone = market.normalizeUpstream(
      200,
      JSON.stringify([
        upstreamPair({
          baseToken: { symbol: "STU\u200BBX\u202E", address: CLONE },
          quoteToken: { symbol: "SOL", address: SOL },
        }),
      ]),
      { mint: CLONE, queriedAt: WHEN },
    );
    assert.equal(clone.status, "ok");
    assert.equal(clone.pairs?.[0]?.base, "STUBX");
    const title = market.describeMarket(clone, "es").pairs[0]?.title ?? "";
    assert.match(title, /Dice llamarse «STUBX»/);
    assert.equal(title.includes("\u200B"), false);
    assert.equal(title.includes("\u202E"), false);
    const english = market.describeMarket(clone, "en").pairs[0]?.title ?? "";
    assert.match(english, /It says it is called «STUBX»/);
  });

  test("no ordena por liquidez y avisa si hay poca", async () => {
    const market = await loadMarketModule();
    const second = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
    const model = market.normalizeUpstream(
      200,
      JSON.stringify([
        upstreamPair({ liquidity: { usd: 10 }, pairAddress: PAIR }),
        upstreamPair({ liquidity: { usd: 900000 }, pairAddress: second }),
        upstreamPair({ liquidity: { usd: 1000 }, pairAddress: SOL }),
      ]),
      { mint: MINT, queriedAt: WHEN },
    );
    assert.equal(model.pairs?.[0]?.liquidityUsd, 10);
    assert.equal(model.pairs?.[1]?.liquidityUsd, 900000);
    assert.equal(model.pairs?.[2]?.liquidityUsd, 1000);
    const view = market.describeMarket(model, "es");
    assert.match(view.pairs[0]?.low ?? "", /La liquidez publicada es poca \(menos de 1\.000 USD\)\. Cualquiera puede crear un par\./);
    assert.equal(view.pairs[1]?.low, "");
    assert.equal(view.pairs[2]?.low, "");
    assert.match(market.describeMarket(model, "en").pairs[0]?.low ?? "", /The published liquidity is small \(under 1,000 USD\)\. Anyone can create a pair\./);
    assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(view.pairs[0]?.low ?? ""), false);
  });

  test("si se agota el tiempo, Qué falta ofrece Reintentar", async () => {
    const market = await loadMarketModule();
    const loaded = await market.loadMarket(
      MINT,
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
      { timeoutMs: 20, now: () => new Date(WHEN) },
    );
    assert.equal(loaded.reason, "tiempo");
    const view = market.describeMarket(loaded, "es");
    assert.equal(view.gapTitle, "Qué falta");
    assert.match(view.gap, /No se pudo consultar/);
    assert.equal(view.retry, true);
    const { handleMarketGet } = await loadProxy();
    const paused = await handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now: () => new Date(WHEN),
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
      takeSlot: () => true,
      readCache: async () => null,
    });
    assert.equal(paused.status, 504);
    assert.equal(JSON.parse(paused.body).reason, "tiempo");
    const limit = market.describeMarket(market.marketFailure(MINT, WHEN, "pausa-sitio"), "es");
    assert.equal(limit.gapTitle, "Qué falta");
    assert.equal(limit.retry, true);
  });

  test("el proxy corta la descarga, no devuelve el cuerpo crudo y limita muy por debajo de 300 por minuto", async () => {
    const market = await loadMarketModule();
    const proxy = await loadProxy();
    assert.equal(market.MARKET_TIMEOUT_MS, 8000);
    assert.equal(market.MARKET_LOW_USD, 1000);
    assert.equal(market.MARKET_OFFICIAL_MINT, OFFICIAL);
    assert.equal(market.MARKET_ATTRIBUTION.es, ACCURACY_ES);
    assert.equal(market.MARKET_ATTRIBUTION.en, ACCURACY_EN);
    assert.ok(proxy.MARKET_RATE_LIMIT < 300);
    assert.ok(proxy.MARKET_RATE_LIMIT <= 60);
    assert.equal(proxy.MARKET_CACHE_SECONDS, 60);
    assert.equal(proxy.MARKET_RATE_WINDOW_MS, 60_000);
    const aviso = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/aviso-guardar.js")).href)) as {
      AVISO_GUARDAR: { es: string; en: string };
    };
    assert.equal(market.marketPrivacy("es"), aviso.AVISO_GUARDAR.es);
    assert.equal(market.marketPrivacy("en"), aviso.AVISO_GUARDAR.en);

    let reads = 0;
    let cancelled = false;
    const overflow = await proxy.handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now: () => new Date(WHEN),
      takeSlot: () => true,
      readCache: async () => null,
      fetchImpl: async () => ({
        status: 200,
        body: {
          getReader() {
            return {
              async read() {
                reads += 1;
                if (reads === 1) return { done: false, value: new Uint8Array(400_000) };
                if (reads === 2) return { done: false, value: new Uint8Array(200_000) };
                return { done: true };
              },
              async cancel() {
                cancelled = true;
              },
            };
          },
        },
      }),
    });
    assert.equal(cancelled, true);
    assert.equal(reads, 2);
    assert.equal(JSON.parse(overflow.body).reason, "grande");
    assert.equal(JSON.parse(overflow.body).pairs, null);

    let headerKeys: string[] = [];
    const ok = await proxy.handleMarketGet({
      method: "GET",
      requestUrl: `https://stubxai.com/api/market?mint=${MINT}`,
      now: () => new Date(WHEN),
      takeSlot: () => true,
      readCache: async () => null,
      fetchImpl: async (_url, init) => {
        headerKeys = Object.keys(init?.headers ?? {});
        assert.equal(init?.headers?.["x-forwarded-for"], undefined);
        assert.equal(init?.headers?.["user-agent"], undefined);
        return { status: 200, text: async () => JSON.stringify([upstreamPair()]) };
      },
    });
    assert.deepEqual(headerKeys, ["accept"]);
    const body = JSON.parse(ok.body);
    priceFree(body);
    assert.equal(body.pairs[0].liquidityUsd, 50000.25);
    assert.equal(body.pairs[0].volumeUsd, 1200.5);
  });
});
