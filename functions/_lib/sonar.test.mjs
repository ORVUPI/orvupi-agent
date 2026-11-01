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
    const hit = seen.find((item) => item.href.includes("api.coingecko.com"));
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
