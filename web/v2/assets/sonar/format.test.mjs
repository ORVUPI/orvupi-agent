import { test } from "node:test";
import assert from "node:assert/strict";
const attrs = { "data-locale": "es" };
globalThis.document = { documentElement: { lang: "", getAttribute: (k) => attrs[k] ?? null } };
const { btcPrice, compact, money, priceNumber } = await import("./format.mjs");

const n = (s) => s.replace(/\u00a0|\u202f/g, " ");

test("precios < 1 conservan al menos 4 cifras significativas", () => {
  assert.equal(n(compact(0.0202, "usd")), "0,0202 USD");
  assert.equal(n(compact(0.1185, "usd")), "0,1185 USD");
  assert.equal(n(compact(0.001234, "usd")), "0,001234 USD");
  assert.equal(n(compact(0.0001234, "usd")), "0,0001234 USD");
  assert.equal(n(money(0.0001234, "usd")), "0,0001234 US$");
});

test("4 o más ceros tras la coma: subíndice como CoinMarketCap", () => {
  assert.equal(n(compact(0.00001234, "usd")), "0,0₄1234 USD");
  assert.equal(n(money(0.000001234, "usd")), "0,0₅1234 US$");
  assert.equal(priceNumber(1.2344e-12), "0,0₁₁1234");
});

test("ningún precio real positivo se muestra como 0,00", () => {
  for (const v of [0.004, 0.0004, 0.00004, 4e-7, 4e-10]) {
    assert.doesNotMatch(compact(v, "usd"), /^0,00 /);
    assert.doesNotMatch(n(money(v, "usd")), /^0,00 /);
  }
});

test("precios ≥ 1 y ceros no cambian; sin dato sigue nulo", () => {
  assert.equal(n(money(1.5, "usd")), "1,50 US$");
  assert.equal(n(money(43210.123, "usd")), "43.210,12 US$");
  assert.equal(n(compact(2.02, "usd")), "2,02 USD");
  assert.equal(n(money(0, "usd")), "0,00 US$");
  assert.equal(money(null, "usd"), null);
  assert.equal(compact(undefined, "usd"), null);
  assert.equal(priceNumber(null), null);
});

test("negativos y BTC", () => {
  assert.equal(n(money(-0.00001234, "usd")), "-0,0₄1234 US$");
  assert.equal(btcPrice(0.0000000123, "x"), "0,0₇123");
  assert.equal(btcPrice(0.0123, "x"), "0,0123");
});

test("inglés: punto decimal y mismo subíndice", () => {
  attrs["data-locale"] = "en";
  try {
    assert.equal(n(money(0.00001234, "usd")), "$0.0₄1234");
    assert.equal(n(compact(0.0202, "usd")), "0.0202 USD");
    assert.equal(n(money(1234.5, "usd")), "$1,234.50");
  } finally { attrs["data-locale"] = "es"; }
});
