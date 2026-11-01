import assert from "node:assert/strict";
import test from "node:test";
import { webUrl, httpsUrl } from "./security.js";
import { coinRow } from "./normalize.js";
import { handle } from "./router.js";
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

test("las rutas de Sonar distinguen ficha, exchange y listado", () => {
  assert.deepEqual(specOf(["crypto", "bitcoin"]), { kind: "crypto", id: "bitcoin" });
  assert.deepEqual(specOf(["exchanges", "binance"]), { kind: "exchange", id: "binance" });
  assert.deepEqual(specOf([]), { kind: "shell", id: "" });
  assert.deepEqual(specOf("categories/meme-token".split("/")), { kind: "category", id: "meme-token" });
});
