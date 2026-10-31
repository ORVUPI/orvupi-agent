import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

describe("ORVUPI Sonar, cadenas de respaldo", () => {
  test("las klines se leen y las fuentes prohibidas no se llaman", async () => {
    const ohlcv = await import(pathToFileURL(path.join(root, "web/v2/verify/net/ohlcv.mjs")).href);
    const parsed = ohlcv.parseBinanceKlines([
      [1_700_000_000_000, "10", "12", "9", "11", "3"],
      [1_700_000_060_000, "11", "13", "10", "12", "4"],
      [1_700_000_060_000, "1", "1", "1", "1", "1"],
    ]);
    assert.deepEqual(parsed.candles.map((candle: { time: number }) => candle.time), [1_700_000_000, 1_700_000_060]);
    assert.equal(parsed.volumeKnown, true);
    assert.equal(parsed.droppedDuplicates, 1);
    assert.equal(ohlcv.binanceKlineUrl("https://data-api.binance.vision", "BTCUSDT", "30m").includes("interval=30m"), true);
    assert.equal(ohlcv.binanceKlineUrl("https://api.binance.com", "BTCUSDT", "2m"), "");
    assert.match(ohlcv.EXCLUDED.coinbase, /Market Data/);
    assert.match(ohlcv.EXCLUDED.kraken, /términos/);
    assert.match(ohlcv.EXCLUDED.tronscan, /clave/);
    const market = readFileSync(path.join(root, "web/v2/verify/net/market.mjs"), "utf8");
    const adapters = readFileSync(path.join(root, "web/v2/verify/net/adapters.mjs"), "utf8");
    assert.equal(market.includes("api.coinbase.com"), false);
    assert.equal(market.includes("api.kraken.com"), false);
    assert.equal(market.includes("tronscan"), false);
    assert.equal(market.includes("data.binance.vision"), false);
    assert.match(market, /data-api\.binance\.vision/);
    assert.match(market, /eth\.blockscout\.com/);
    assert.equal(adapters.includes("llama.fi"), false);
    assert.match(adapters, /defillamaBlocked/);
    assert.match(adapters, /blockstream\.info/);
  });

  test("si la fuente falla, se muestra la última respuesta real", async () => {
    const http = await import(pathToFileURL(path.join(root, "web/v2/verify/net/http.mjs")).href);
    const mem = new Map<string, string>();
    Object.assign(globalThis, {
      localStorage: {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => mem.set(key, value),
      },
    });
    const fresh = await http.withCache("qa-demo", async () => ({ ok: true, n: 1 }));
    assert.equal(fresh.n, 1);
    assert.equal(fresh.stale, false);
    const stale = await http.withCache("qa-demo", async () => ({ ok: false, n: 9 }));
    assert.equal(stale.n, 1);
    assert.equal(stale.stale, true);
  });
});
