import assert from "node:assert/strict";
import test from "node:test";
import { httpsUrl, publicHandle, webUrl } from "./security.js";
import { applySeriesChanges, changeOver, coinRow } from "./normalize.js";
import { handle } from "./router.js";
import { safeJson } from "./seo.js";
import { specOf } from "../sonar/[[path]].js";

test("las URLs http de una web oficial se conservan y javascript no", () => {
  assert.equal(webUrl("http://bitcoin.org/"), "http://bitcoin.org/");
  assert.equal(httpsUrl("http://bitcoin.org/"), null);
  assert.equal(webUrl("javascript:alert(1)"), null);
  assert.equal(webUrl("null"), null);
});

test("una fila sin rango no inventa el puesto", () => {
  const row = coinRow({ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 10 });
  assert.equal(row.rank, null);
  assert.equal(row.symbol, "BTC");
  assert.equal(row.price, 10);
});

test("el router rechaza página y método inválidos y no inventa noticias", async () => {
  const bad = await handle(new Request("http://local/api/sonar/markets?page=0"), {}, {});
  assert.equal(bad.status, 400);
  const method = await handle(new Request("http://local/api/sonar/global", { method: "POST" }), {}, {});
  assert.equal(method.status, 405);
  const news = await handle(new Request("http://local/api/sonar/news"), {}, {});
  const body = await news.json();
  assert.equal(body.disabled, true);
  assert.deepEqual(body.data, []);
});

test("CoinGecko recibe User-Agent", async () => {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    const headers = options?.headers || {};
    seen.push({ href, ua: headers["user-agent"] || headers["User-Agent"] || "" });
    if (href.includes("/api/v3/global")) {
      return new Response(JSON.stringify({ data: { total_market_cap: { usd: 1 }, total_volume: { usd: 1 }, market_cap_percentage: { btc: 50, eth: 10 }, active_cryptocurrencies: 2, markets: 2, market_cap_change_percentage_24h_usd: 0 } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handle(new Request("http://local/api/sonar/global?vs=usd"), { SONAR_DISABLE: "patternplus,chain" }, {});
    assert.equal(response.status, 200);
    const hit = seen.find((item) => new URL(item.href).hostname === "api.coingecko.com");
    assert.ok(hit, "no hubo llamada a CoinGecko");
    assert.match(hit.ua, /ORVUPI-Sonar/);
  } finally {
    globalThis.fetch = original;
  }
});

test("los parámetros raros y el HTML embebido no pasan", () => {
  assert.equal(publicHandle("satoshi", /^[A-Za-z0-9_]{1,15}$/), "satoshi");
  assert.equal(publicHandle("a b", /^[A-Za-z0-9_]{1,15}$/), null);
  assert.equal(publicHandle("https://evil.example", /^[A-Za-z0-9_]{1,15}$/), null);
  assert.equal(safeJson({ name: "</script><img src=x onerror=alert(1)>" }).includes("<"), false);
});

test("el router rechaza categoría, tamaño y búsqueda inválidos", async () => {
  const category = await handle(new Request("http://local/api/sonar/markets?category=%3Cscript%3E"), {}, {});
  assert.equal(category.status, 400);
  const per = await handle(new Request("http://local/api/sonar/markets?per=999"), {}, {});
  assert.equal(per.status, 400);
  const empty = await handle(new Request("http://local/api/sonar/search?q="), {}, {});
  assert.equal(empty.status, 400);
  const huge = await handle(new Request(`http://local/api/sonar/search?q=${"a".repeat(80)}`), {}, {});
  assert.equal(huge.status, 400);
});

test("los movers no recorren el ranking entero en una sola petición", { timeout: 20000 }, async () => {
  const original = globalThis.fetch;
  let markets = 0;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("supported_vs_currencies")) {
      return new Response(JSON.stringify(["usd", "eur"]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (href.includes("/coins/markets")) {
      markets += 1;
      const page = Number(new URL(href).searchParams.get("page") || "1");
      const rows = Array.from({ length: 250 }, (_, index) => ({
        id: `coin-${page}-${index}`,
        symbol: "x",
        name: "X",
        current_price: 1,
        market_cap: 1_000_000 - index,
        market_cap_rank: (page - 1) * 250 + index + 1,
        total_volume: 100000,
        price_change_percentage_24h: index,
      }));
      return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handle(new Request("http://local/api/sonar/movers?period=24h&minVol=0"), { SONAR_DISABLE: "patternplus,chain" }, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.partial, true);
    assert.equal(body.count, 1500);
    assert.equal(markets, 6);
    assert.equal(body.gainers.length, 20);
    assert.equal(body.losers.length, 20);
  } finally {
    globalThis.fetch = original;
  }
});

test("las rutas de Sonar distinguen ficha, exchange y listado", () => {
  assert.deepEqual(specOf(["crypto", "bitcoin"]), { kind: "crypto", id: "bitcoin" });
  assert.deepEqual(specOf(["exchanges", "binance"]), { kind: "exchange", id: "binance" });
  assert.deepEqual(specOf([]), { kind: "shell", id: "" });
  assert.deepEqual(specOf("categories/meme-token".split("/")), { kind: "category", id: "meme-token" });
  assert.deepEqual(specOf(["portfolio"]), { kind: "shell", id: "" });
  assert.deepEqual(specOf(["nope", "zzz"]), { kind: "notfound", id: "" });
  assert.deepEqual(specOf(["watchlist", "x"]), { kind: "notfound", id: "" });
});

test("slugOk acepta ids reales de CoinGecko y rechaza rutas", async () => {
  const { slugOk } = await import("./security.js");
  for (const ok of ["bitcoin", "uniswap_v3", "binance_futures", "sectorone-v2.0-base", "hive_dollar"]) assert.equal(slugOk(ok), true, ok);
  for (const bad of ["", "..", "../etc", "a/b", "a..b", "<x>", ".", "x".repeat(121)]) assert.equal(slugOk(bad), false, bad);
});

test("el cambio sale de un punto con marca de tiempo, o se queda vacío", () => {
  const end = 1_700_000_000_000;
  const hour = 3600 * 1000;
  const points = [[end - 7 * hour, 50], [end - 24 * hour, 80], [end - hour, 90], [end, 100]];
  assert.ok(Math.abs(changeOver(points, 1, 0.5) - ((100 - 90) / 90) * 100) < 1e-9);
  assert.equal(changeOver(points, 24, 2), 25);
  assert.equal(changeOver(points, 168, 6), null);
  const far = [[end - 10 * hour, 50], [end, 100]];
  assert.equal(changeOver(far, 1, 0.5), null);
  assert.equal(changeOver(far, 24, 2), null);
  assert.equal(changeOver([[end, 0], [end - hour, 10]], 1, 0.5), null);
  const kept = applySeriesChanges({ ch24h: 1.5, ch1h: null, ch7d: null }, points);
  assert.equal(kept.ch24h, 1.5);
  assert.ok(Math.abs(kept.ch1h - ((100 - 90) / 90) * 100) < 1e-9);
  assert.equal(kept.ch7d, null);
  assert.equal(applySeriesChanges({ ch1h: null, ch24h: null, ch7d: null }, []).ch24h, null);
});

test("la paginación numérica deja huecos y no inventa la última página", async () => {
  const { pageItems, slicePage } = await import("../../web/v2/assets/sonar/ui.mjs");
  assert.deepEqual(pageItems(1, 10), [1, 2, "gap", 10]);
  assert.deepEqual(pageItems(5, 20), [1, "gap", 4, 5, 6, "gap", 20]);
  assert.deepEqual(pageItems(20, 20), [1, "gap", 19, 20]);
  assert.deepEqual(pageItems(1, 1, true), [1, 2, "gap"]);
  assert.deepEqual(pageItems(6, 6, true), [1, "gap", 5, 6, 7, "gap"]);
  const view = slicePage([1, 2, 3, 4, 5], 2, 2);
  assert.deepEqual(view.rows, [3, 4]);
  assert.equal(view.pages, 3);
  assert.equal(slicePage([], 4, 10).page, 1);
  assert.equal(slicePage([], 4, 10).rows.length, 0);
});

test("/:lang/sonar/* deja pasar /assets/sonar/* a los estáticos", async () => {
  const { onRequest } = await import("../[lang]/sonar/[[path]].js");
  let passed = false;
  await onRequest({ params: { lang: "assets", path: ["shell.mjs"] }, request: new Request("https://orvupi.com/assets/sonar/shell.mjs"), env: {}, next: () => { passed = true; return new Response("static"); } });
  assert.equal(passed, true);
});

test("el total del ranking sale de los activos activos, sin recorrer páginas", async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const original = globalThis.fetch;
  let markets = 0;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("/global")) {
      return jsonResponse({
        data: {
          active_cryptocurrencies: 17000,
          total_market_cap: { usd: 1 },
          total_volume: { usd: 1 },
          market_cap_percentage: { btc: 50, eth: 10 },
          markets: 3,
          market_cap_change_percentage_24h_usd: 0,
        },
      });
    }
    if (href.includes("/coins/markets")) {
      markets += 1;
      const page = Number(new URL(href).searchParams.get("page") || "1");
      const per = Number(new URL(href).searchParams.get("per_page") || "100");
      const rows = page === 1
        ? Array.from({ length: per }, (_, index) => ({ id: `coin-${index}`, symbol: "x", name: "X", current_price: 3, market_cap: 1000 - index }))
        : [];
      return jsonResponse(rows);
    }
    return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
  };
  try {
    const first = await handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    assert.equal(first.status, 200);
    const body = await first.json();
    assert.equal(body.total, 17000);
    assert.equal(body.rows.length, 20);
    assert.equal(markets, 1);
    const deep = await handle(new Request("http://local/api/sonar/markets?page=934&per=20"), {}, {});
    assert.equal(deep.status, 200);
    const deepBody = await deep.json();
    assert.equal(deepBody.total, 17000);
    assert.equal(deepBody.rows.length, 0);
    assert.equal(markets, 2);
    const bad = await handle(new Request("http://local/api/sonar/markets?page=934&per=20&category=%3Cx%3E"), {}, {});
    assert.equal(bad.status, 400);
    const tooDeep = await handle(new Request("http://local/api/sonar/markets?page=2001&per=20"), {}, {});
    assert.equal(tooDeep.status, 400);
  } finally {
    globalThis.fetch = original;
    await clearCache();
  }
});

test("un upstream lento o 429 responde en menos de 9 s con caché o respaldo", { timeout: 20000 }, async () => {
  const { clearCache, putEntry } = await import("./cache.js");
  await clearCache();
  let current = installUpstream();
  const fetchedAt = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  await putEntry("cg:markets:market_cap_desc:20:1:-:-", {
    source: "CoinGecko",
    sourceUrl: "https://www.coingecko.com/",
    attribution: "Data provided by CoinGecko",
    fetchedAt,
    page: 1,
    per: 20,
    category: null,
    order: "market_cap_desc",
    rows: [{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 42424.5, marketCap: 1, volume24h: 2, spark7d: [] }],
  }, 86400);
  try {
    const started = Date.now();
    const cached = await handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    const cachedMs = Date.now() - started;
    assert.ok(cachedMs < 9000, `caché tardó ${cachedMs} ms`);
    assert.equal(cached.status, 200);
    const cachedBody = await cached.json();
    assert.equal(cachedBody.source, "CoinGecko");
    assert.equal(cachedBody.stale, true);
    assert.match(cachedBody.asOf, /^datos de \d{2}:\d{2}$/);
    assert.equal(cached.headers.get("x-sonar-as-of"), cachedBody.asOf);
    assert.equal(cachedBody.rows[0].price, 42424.5);
    assert.equal(cachedBody.rows[0].id, "bitcoin");
    const gecko = current.calls.filter((call) => call.href.includes("/coins/markets"));
    if (gecko.length >= 2) assert.ok(gecko[1].at - gecko[0].at < 2500, "Retry-After de 30 s no puede dormir 30 s");

    await current.restore();
    await clearCache();
    current = installUpstream();
    const cold = Date.now();
    const fallback = await handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    const coldMs = Date.now() - cold;
    assert.ok(coldMs < 9000, `respaldo tardó ${coldMs} ms`);
    assert.equal(fallback.status, 200);
    const body = await fallback.json();
    assert.notEqual(fallback.status, 502);
    assert.equal(body.source, "CoinPaprika");
    assert.equal(body.attribution, "Market data by CoinPaprika");
    assert.equal(body.rows.length, 1);
    assert.equal(body.rows[0].id, "bitcoin");
    assert.equal(body.rows[0].paprikaId, "btc-bitcoin");
    assert.equal(body.rows[0].image, "https://static.coinpaprika.com/coin/btc-bitcoin/logo.png");
    assert.equal(body.rows[0].price, 111.22);
    assert.equal(body.rows[0].volume24h, 50);
    assert.equal(body.rows[0].circulating, null);
    assert.equal(body.total, 1);
    const markets = current.calls.filter((call) => call.href.includes("api.coingecko.com") && call.href.includes("/coins/markets"));
    assert.ok(markets.length >= 2);
    assert.ok(markets[1].at - markets[0].at < 2500);
  } finally {
    await current?.restore();
    await clearCache();
  }
});

test("sin caché y sin respaldo la respuesta es 503, nunca 502", { timeout: 20000 }, async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const installed = installUpstream({ paprika: false });
  try {
    const started = Date.now();
    const response = await handle(new Request("http://local/api/sonar/markets?page=1&per=100"), {}, {});
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 9000, `agotado tardó ${elapsed} ms`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, "unavailable");
  } finally {
    await installed.restore();
    await clearCache();
  }
});

test("una categoría y el orden gecko no se sustituyen por otro listado", { timeout: 20000 }, async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const installed = installUpstream();
  try {
    const category = await handle(new Request("http://local/api/sonar/categories/meme-token"), {}, {});
    assert.equal(category.status, 503);
    const gecko = await handle(new Request("http://local/api/sonar/markets?order=gecko_desc&per=20"), {}, {});
    assert.equal(gecko.status, 503);
    assert.equal(installed.calls.some((call) => call.href.includes("/v1/tickers")), false);
  } finally {
    await installed.restore();
    await clearCache();
  }
});

test("la ficha y el exchange usan el respaldo real si CoinGecko no responde", { timeout: 20000 }, async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const installed = installUpstream();
  try {
    const started = Date.now();
    const coin = await handle(new Request("http://local/api/sonar/coin/bitcoin"), {}, {});
    assert.ok(Date.now() - started < 9000);
    assert.equal(coin.status, 200);
    const coinBody = await coin.json();
    assert.equal(coinBody.source, "CoinPaprika");
    assert.equal(coinBody.id, "bitcoin");
    assert.equal(coinBody.paprikaId, "btc-bitcoin");
    assert.equal(coinBody.price, 111.22);
    assert.equal(coinBody.priceBtc, 1);

    const exchange = await handle(new Request("http://local/api/sonar/exchanges/binance"), {}, {});
    assert.equal(exchange.status, 200);
    const ex = await exchange.json();
    assert.equal(ex.source, "CoinPaprika");
    assert.equal(ex.volume24h, 999.5);
    assert.equal(ex.volume24hBtc, null);
    assert.equal(ex.trustScore, null);
    assert.equal(ex.trustRank, null);
    assert.equal(ex.centralized, true);
  } finally {
    await installed.restore();
    await clearCache();
  }
});

test("CG_API_KEY demo solo entra tras un 429 y nunca sale al cliente", async () => {
  const { clearCache } = await import("./cache.js");
  const { coingeckoBase, coingeckoHeaders } = await import("./providers/coingecko.js");
  const { keyedUsage, resetKeyedUsage, setKeyedUsageForTests } = await import("./cg-usage.js");
  assert.equal(coingeckoBase({}), "https://api.coingecko.com/api/v3");
  assert.equal(coingeckoBase({ CG_API_KEY: "demo-key", CG_API_TIER: "demo" }), "https://api.coingecko.com/api/v3");
  assert.equal(coingeckoHeaders({ CG_API_KEY: "demo-key" })["x-cg-demo-api-key"], "demo-key");
  assert.equal(coingeckoHeaders({ CG_API_KEY: "demo-key", CG_API_TIER: "demo" })["x-cg-pro-api-key"], undefined);
  assert.equal(coingeckoBase({ CG_API_KEY: "pro-key", CG_API_TIER: "pro" }), "https://pro-api.coingecko.com/api/v3");
  assert.equal(coingeckoHeaders({ CG_API_KEY: "pro-key", CG_API_TIER: "pro" })["x-cg-pro-api-key"], "pro-key");
  assert.equal(coingeckoHeaders({})["x-cg-demo-api-key"], undefined);

  const original = globalThis.fetch;
  const originalLog = console.log;
  const seen = [];
  const logs = [];
  const globalBody = { data: { total_market_cap: { usd: 1 }, total_volume: { usd: 1 }, market_cap_percentage: { btc: 1, eth: 1 }, active_cryptocurrencies: 1, markets: 1, market_cap_change_percentage_24h_usd: 0 } };
  const envBase = { SONAR_DISABLE: "patternplus,chain,alternative" };
  const demoEnv = { ...envBase, CG_API_KEY: "demo-key", CG_API_TIER: "demo" };
  console.log = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  function install(respond) {
    seen.length = 0;
    globalThis.fetch = async (url, options) => {
      const href = String(url);
      const headers = options?.headers || {};
      seen.push({ href, headers });
      return respond(href, seen.length);
    };
  }
  try {
    resetKeyedUsage();
    await clearCache();
    install((href) => (href.includes("/global") ? jsonResponse(globalBody) : new Response("{}", { status: 503, headers: { "content-type": "application/json" } })));
    const open = await handle(new Request("http://local/api/sonar/global"), demoEnv, {});
    assert.equal(open.status, 200);
    const openHits = seen.filter((item) => item.href.includes("/global"));
    assert.equal(openHits.length, 1);
    assert.equal(openHits[0].headers["x-cg-demo-api-key"], undefined);
    assert.equal(keyedUsage().calls, 0);
    assert.equal(JSON.stringify(await open.json()).includes("demo-key"), false);

    await clearCache();
    let globals = 0;
    install((href) => {
      if (!href.includes("/global")) return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
      globals += 1;
      if (globals === 1) return new Response("{}", { status: 429, headers: { "retry-after": "30", "content-type": "application/json" } });
      return jsonResponse(globalBody);
    });
    const keyed = await handle(new Request("http://local/api/sonar/global"), demoEnv, {});
    assert.equal(keyed.status, 200);
    const keyedHits = seen.filter((item) => item.href.includes("api.coingecko.com") && item.href.includes("/global"));
    assert.equal(keyedHits.length, 2);
    assert.equal(keyedHits[0].headers["x-cg-demo-api-key"], undefined);
    assert.equal(keyedHits[1].headers["x-cg-demo-api-key"], "demo-key");
    assert.equal(keyedUsage().calls, 1);
    assert.match(logs.find((line) => line.startsWith("sonar-cg-demo day=")) || "", /calls=1/);
    assert.equal(logs.some((line) => line.includes("demo-key")), false);
    assert.equal(JSON.stringify(await keyed.json()).includes("demo-key"), false);

    resetKeyedUsage();
    await clearCache();
    logs.length = 0;
    install((href) => (href.includes("/global") ? jsonResponse(globalBody) : new Response("{}", { status: 503, headers: { "content-type": "application/json" } })));
    await handle(new Request("http://local/api/sonar/global"), { ...envBase, CG_API_KEY: "pro-key", CG_API_TIER: "pro" }, {});
    const proHit = seen.find((item) => item.href.includes("/global"));
    assert.ok(proHit.href.startsWith("https://pro-api.coingecko.com/"));
    assert.equal(proHit.headers["x-cg-pro-api-key"], "pro-key");
    assert.equal(proHit.headers["x-cg-demo-api-key"], undefined);
    assert.equal(keyedUsage().calls, 0);

    setKeyedUsageForTests({ calls: keyedUsage().dayCap });
    await clearCache();
    logs.length = 0;
    install(() => new Response("{}", { status: 429, headers: { "retry-after": "30", "content-type": "application/json" } }));
    await handle(new Request("http://local/api/sonar/global"), demoEnv, {});
    assert.equal(seen.some((item) => item.headers["x-cg-demo-api-key"]), false);
    assert.equal(keyedUsage().calls, keyedUsage().dayCap);
    assert.match(logs.join("\n"), /sonar-cg-demo skip .*reason=day/);

    setKeyedUsageForTests({ calls: 1, minute: keyedUsage().minuteCap });
    await clearCache();
    logs.length = 0;
    install(() => new Response("{}", { status: 429, headers: { "retry-after": "1", "content-type": "application/json" } }));
    await handle(new Request("http://local/api/sonar/global"), demoEnv, {});
    assert.equal(seen.some((item) => item.headers["x-cg-demo-api-key"]), false);
    assert.equal(keyedUsage().calls, 1);
    assert.match(logs.join("\n"), /reason=minute/);

    resetKeyedUsage();
    await clearCache();
    install(() => new Response("{}", { status: 503, headers: { "content-type": "application/json" } }));
    await handle(new Request("http://local/api/sonar/global"), demoEnv, {});
    assert.equal(seen.some((item) => item.headers["x-cg-demo-api-key"]), false);
    assert.equal(keyedUsage().calls, 0);
  } finally {
    console.log = originalLog;
    globalThis.fetch = original;
    resetKeyedUsage();
    await clearCache();
  }
});

test("CoinPaprika solo casa un id de CoinGecko sin ambigüedad", async () => {
  const { matchPaprikaId } = await import("./providers/coinpaprika.js");
  assert.equal(matchPaprikaId("bitcoin", [{ id: "btc-bitcoin" }, { id: "wbtc-wrapped-bitcoin" }]), "btc-bitcoin");
  assert.equal(matchPaprikaId("bitcoin", [{ id: "btc-bitcoin" }, { id: "xbt-bitcoin" }]), null);
  assert.equal(matchPaprikaId("wrapped-bitcoin", [{ id: "wbtc-wrapped-bitcoin" }]), "wbtc-wrapped-bitcoin");
  assert.equal(matchPaprikaId("meme-token", [{ id: "meme-coin" }]), null);
});

test("el sello de una lectura vieja es datos de hh:mm en Madrid", async () => {
  const { asOfLabel } = await import("./asof.js");
  assert.equal(asOfLabel("2026-11-01T11:05:00.000Z"), "datos de 12:05");
  assert.equal(asOfLabel("no-es-fecha"), null);
});

test("las llamadas no se esperan en una cola global", async () => {
  const { guarded } = await import("./limits.js");
  const started = Date.now();
  const values = await Promise.all([
    guarded("coingecko", () => new Promise((resolve) => setTimeout(() => resolve(1), 200))),
    guarded("coingecko", () => new Promise((resolve) => setTimeout(() => resolve(2), 200))),
  ]);
  assert.deepEqual(values, [1, 2]);
  assert.ok(Date.now() - started < 500);
});

test("un id desconocido sigue en 404 aunque CoinGecko responda 429", { timeout: 20000 }, async () => {
  const { clearCache } = await import("./cache.js");
  const { renderSonarPage } = await import("./seo.js");
  await clearCache();
  const installed = installUpstream({ currencies: [] });
  try {
    const response = await handle(new Request("http://local/api/sonar/coin/no-esta-esta-moneda"), {}, {});
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error, "not-found");
    const page = await renderSonarPage(
      new Request("http://local/sonar/crypto/no-esta-esta-moneda"),
      { SONAR_READ: () => "<html></html>" },
      {},
      { kind: "crypto", id: "no-esta-esta-moneda" },
    );
    assert.equal(page.status, 404);
  } finally {
    await installed.restore();
    await clearCache();
  }
});

test("solo stubxai.pages.dev redirige a orvupi.com", async () => {
  const { pagesDevRedirect } = await import("./preview-host.js");
  const { onRequest } = await import("../_middleware.js");
  assert.equal(pagesDevRedirect("https://stubxai.pages.dev/api/sonar/global?x=1"), "https://orvupi.com/api/sonar/global?x=1");
  assert.equal(pagesDevRedirect("https://stubxai.pages.dev/sonar/"), "https://orvupi.com/sonar/");
  assert.equal(pagesDevRedirect("https://deadbeef.stubxai.pages.dev/api/sonar/markets"), null);
  assert.equal(pagesDevRedirect("https://cursor-sonar-edge.stubxai.pages.dev/"), null);
  assert.equal(pagesDevRedirect("https://www.stubxai.pages.dev/"), null);
  assert.equal(pagesDevRedirect("https://orvupi.com/sonar/"), null);
  let next = false;
  const preview = await onRequest({
    request: new Request("https://deadbeef.stubxai.pages.dev/api/sonar/markets?page=1"),
    next: () => {
      next = true;
      return new Response("ok");
    },
  });
  assert.equal(next, true);
  assert.equal(preview.status, 200);
  const apex = await onRequest({
    request: new Request("https://stubxai.pages.dev/sonar/?q=1"),
    next: () => {
      throw new Error("el host de producción no debe seguir");
    },
  });
  assert.equal(apex.status, 301);
  assert.equal(apex.headers.get("location"), "https://orvupi.com/sonar/?q=1");
});

test("los TTL frescos caben en el cupo de la clave demo", async () => {
  const { CACHE_FRESH } = await import("./data.js");
  assert.ok(CACHE_FRESH.markets >= 120 && CACHE_FRESH.markets <= 300);
  assert.ok(CACHE_FRESH.marketsOther >= 120 && CACHE_FRESH.marketsOther <= 300);
  assert.ok(CACHE_FRESH.coin >= 900 && CACHE_FRESH.coin <= 1800);
  assert.equal(CACHE_FRESH.categories, 3600);
  assert.equal(CACHE_FRESH.exchanges, 3600);
  assert.equal(CACHE_FRESH.count, 86400);
});

test("una lectura fresca no repite la llamada y publica el TTL", async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const original = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async (url) => {
    fetches += 1;
    const href = String(url);
    if (href.includes("/global")) {
      return jsonResponse({
        data: {
          active_cryptocurrencies: 12,
          total_market_cap: { usd: 9 },
          total_volume: { usd: 4 },
          market_cap_percentage: { btc: 50, eth: 10 },
          markets: 2,
          market_cap_change_percentage_24h_usd: 0,
        },
      });
    }
    if (href.includes("/coins/markets")) {
      const page = Number(new URL(href).searchParams.get("page") || "1");
      const rows = page === 1 ? [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 3, market_cap: 8 }] : [];
      return jsonResponse(rows);
    }
    if (href.includes("/coins/bitcoin/market_chart")) return jsonResponse({ prices: [[1, 1], [2, 3]], market_caps: [], total_volumes: [] });
    if (href.includes("/coins/bitcoin?")) {
      return jsonResponse({
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        market_data: {
          current_price: { usd: 3 },
          market_cap: { usd: 8 },
          price_change_percentage_1h_in_currency: { usd: 0 },
          price_change_percentage_24h_in_currency: { usd: 1 },
          price_change_percentage_7d_in_currency: { usd: -1 },
        },
      });
    }
    if (href.includes("/coins/categories")) return jsonResponse([{ id: "layer-1", name: "Layer 1", market_cap: 8, volume_24h: 1 }]);
    if (href.includes("/simple/price")) return jsonResponse({ bitcoin: { usd: 3, usd_24h_change: 1 } });
    if (href.includes("/exchanges/binance/tickers")) return jsonResponse({ tickers: [] });
    return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
  };
  try {
    const first = await handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    assert.equal(first.status, 200);
    assert.match(first.headers.get("cache-control"), /max-age=180/);
    assert.match(first.headers.get("cache-control"), /stale-while-revalidate=86400/);
    const after = fetches;
    const second = await handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    assert.equal(second.status, 200);
    assert.equal(fetches, after);
    const other = await handle(new Request("http://local/api/sonar/markets?page=2&per=20"), {}, {});
    assert.match(other.headers.get("cache-control"), /max-age=300/);
    const coin = await handle(new Request("http://local/api/sonar/coin/bitcoin"), {}, {});
    assert.equal(coin.status, 200);
    assert.match(coin.headers.get("cache-control"), /max-age=1200/);
    const categories = await handle(new Request("http://local/api/sonar/categories"), {}, {});
    assert.equal(categories.status, 200);
    assert.match(categories.headers.get("cache-control"), /max-age=3600/);
    const chart = await handle(new Request("http://local/api/sonar/coin/bitcoin/chart?days=1"), {}, {});
    assert.equal(chart.status, 200);
    assert.match(chart.headers.get("cache-control"), /max-age=900/);
    const quotes = await handle(new Request("http://local/api/sonar/quotes?ids=bitcoin"), {}, {});
    assert.equal(quotes.status, 200);
    assert.match(quotes.headers.get("cache-control"), /max-age=180/);
  } finally {
    globalThis.fetch = original;
    await clearCache();
  }
});

test("una misma clave de caché tiene un solo refresco en vuelo", async () => {
  const { clearCache } = await import("./cache.js");
  await clearCache();
  const original = globalThis.fetch;
  let markets = 0;
  let release = () => {};
  const gate = new Promise((resolve) => { release = resolve; });
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("/global")) {
      return jsonResponse({ data: { active_cryptocurrencies: 4, total_market_cap: { usd: 1 }, total_volume: { usd: 1 }, market_cap_percentage: { btc: 1, eth: 1 }, markets: 1, market_cap_change_percentage_24h_usd: 0 } });
    }
    if (href.includes("/coins/markets")) {
      markets += 1;
      await gate;
      return jsonResponse([{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 2, market_cap: 3 }]);
    }
    return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
  };
  try {
    const first = handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    const second = handle(new Request("http://local/api/sonar/markets?page=1&per=20"), {}, {});
    const started = Date.now();
    while (markets < 1 && Date.now() - started < 1000) await new Promise((resolve) => setTimeout(resolve, 5));
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(markets, 1);
    release();
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(markets, 1);
    assert.equal((await a.json()).rows[0].id, "bitcoin");
    assert.equal((await b.json()).rows[0].price, 2);
  } finally {
    release();
    globalThis.fetch = original;
    await clearCache();
  }
});

test("Retry-After de 30 s se recorta a un segundo", async () => {
  const { getJson } = await import("./limits.js");
  const original = globalThis.fetch;
  const times = [];
  globalThis.fetch = async () => {
    times.push(Date.now());
    if (times.length === 1) return new Response("{}", { status: 429, headers: { "retry-after": "30", "content-type": "application/json" } });
    return jsonResponse({ ok: true });
  };
  try {
    const body = await getJson("https://example.test/retry");
    assert.deepEqual(body, { ok: true });
    assert.equal(times.length, 2);
    const gap = times[1] - times[0];
    assert.ok(gap < 2500, `la segunda llamada tardó ${gap} ms`);
    assert.ok(gap >= 700, `no esperó el tope de un segundo (${gap} ms)`);
  } finally {
    globalThis.fetch = original;
  }
});

const TICKER = {
  id: "btc-bitcoin",
  name: "Bitcoin",
  symbol: "BTC",
  rank: 1,
  total_supply: 19000000,
  max_supply: 21000000,
  quotes: {
    USD: {
      price: 111.22,
      volume_24h: 50,
      market_cap: 2000,
      percent_change_1h: 0.1,
      percent_change_24h: 1.2,
      percent_change_7d: -3,
      percent_change_30d: 4,
      ath_price: 70000,
      ath_date: "2021-11-10T00:00:00Z",
    },
  },
};

const BINANCE = {
  id: "binance",
  name: "Binance",
  type: ["cex"],
  adjusted_rank: 1,
  currencies: 400,
  markets: 1200,
  quotes: { USD: { adjusted_volume_24h: 999.5, reported_volume_24h: 1000 } },
  links: { website: ["https://www.binance.com/"] },
};

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function hang(signal, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

function installUpstream({ paprika = true, hangMs = 20000, currencies } = {}) {
  const original = globalThis.fetch;
  const attempts = new Map();
  const calls = [];
  let inflight = 0;
  let idleWait = [];
  function settleIdle() {
    if (inflight !== 0) return;
    const waiters = idleWait;
    idleWait = [];
    for (const resolve of waiters) resolve();
  }
  globalThis.fetch = (url, options) => {
    const href = String(url);
    calls.push({ href, at: Date.now() });
    inflight += 1;
    const signal = options?.signal;
    return Promise.resolve()
      .then(async () => {
        if (href.includes("api.coinpaprika.com")) {
          if (!paprika) return new Response("{}", { status: 429, headers: { "retry-after": "30", "content-type": "application/json" } });
          if (href.includes("/v1/search/")) return jsonResponse({ currencies: currencies || [{ id: "btc-bitcoin" }, { id: "wbtc-wrapped-bitcoin" }] });
          if (href.includes("/v1/exchanges/binance")) return jsonResponse(BINANCE);
          if (href.includes("/v1/tags")) return jsonResponse([{ id: "meme-coin", name: "Meme Coin" }]);
          if (href.includes("/v1/tickers")) return jsonResponse(href.includes("/btc-bitcoin") ? TICKER : [TICKER]);
          return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
        }
        if (href.includes("coingecko.com")) {
          const next = (attempts.get(href) || 0) + 1;
          attempts.set(href, next);
          if (next === 1) return new Response("{}", { status: 429, headers: { "retry-after": "30", "content-type": "application/json" } });
          return hang(signal, hangMs);
        }
        return new Response("{}", { status: 503, headers: { "content-type": "application/json" } });
      })
      .finally(() => {
        inflight -= 1;
        settleIdle();
      });
  };
  return {
    calls,
    restore: async () => {
      if (inflight) {
        await Promise.race([
          new Promise((resolve) => idleWait.push(resolve)),
          new Promise((resolve) => setTimeout(resolve, 12000)),
        ]);
      }
      globalThis.fetch = original;
    },
  };
}
