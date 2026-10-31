import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

describe("ORVUPI Verify, series y grafo", () => {
  test("no rellena huecos ni inventa volumen", async () => {
    const ohlcv = await import(pathToFileURL(path.join(root, "web/v2/verify/net/ohlcv.mjs")).href);
    const parsed = ohlcv.parseGeckoOhlcv([
      [200, 2, 3, 1, 2, 10],
      [100, 1, 2, 1, 1.5, null],
      [200, 9, 9, 9, 9, 1],
      [150, 1, 0, 2, 1, 4],
      "no",
    ]);
    assert.deepEqual(parsed.candles.map((candle: { time: number }) => candle.time), [100, 200]);
    assert.equal(parsed.candles[0].volume, null);
    assert.equal(parsed.droppedDuplicates, 1);
    assert.equal(parsed.rejected, 2);
    assert.equal(ohlcv.observedStep(parsed.candles), 100);
    const coin = ohlcv.parseCoingeckoOhlc([[1_000_000, 1, 2, 1, 1.5]]);
    assert.equal(coin.candles[0].time, 1000);
    assert.equal(coin.volumeKnown, false);
    assert.equal(ohlcv.geckoOhlcvUrl("solana", "POOL", "5m").includes("/ohlcv/minute?"), true);
    assert.equal(ohlcv.geckoOhlcvUrl("solana", "POOL", "4h").includes("aggregate=4"), true);
    assert.equal(ohlcv.coingeckoOhlcUrl("bitcoin", "1").includes("days=1"), true);
    assert.equal(ohlcv.coingeckoOhlcUrl("bitcoin", "2"), "");
    assert.equal(ohlcv.PROVIDERS.defillama.candles, false);
    assert.equal(ohlcv.PROVIDERS.dexscreener.candles, false);
  });

  test("el grafo y la tabla salen de las mismas transferencias", async () => {
    const present = await import(pathToFileURL(path.join(root, "web/v2/verify/net/present.mjs")).href);
    const rows = [
      { id: "a", from: "A", to: "B", value: "1", token: "SOL" },
      { id: "b", from: "B", to: "C", value: "2", token: "SOL" },
      { id: "c", from: null, to: "A", value: null, token: "" },
    ];
    const graph = present.buildGraph(rows, { seed: "A", maxNodes: 16, depth: 1 });
    assert.deepEqual(graph.edges.map((edge: { id: string }) => edge.id), ["a"]);
    const filtered = present.filterTransfers(rows, { direction: "out", focus: "A" });
    assert.deepEqual(filtered.map((row: { id: string }) => row.id), ["a"]);
    const window = present.slicePage(rows, 1, 2);
    assert.equal(window.label, "1 / 2");
    assert.equal(present.pager(0, 1).label, "— / —");
    assert.equal(present.identify("0x" + "ab".repeat(20)).kind, "evm");
    assert.equal(present.identify("not an address").kind, "unknown");
    const groups = present.groupSearch("polymarket", {});
    assert.equal(groups.groups.find((group: { id: string }) => group.id === "predictions").status, "no-soportado");
  });

  test("DeFiLlama no se consulta y el cuaderno no cambia de clave", () => {
    const adapters = readFileSync(path.join(root, "web/v2/verify/net/adapters.mjs"), "utf8");
    const app = readFileSync(path.join(root, "web/v2/assets/verify-app.mjs"), "utf8");
    assert.equal(adapters.includes("llama.fi"), false);
    assert.equal(app.includes("llama.fi"), false);
    assert.match(adapters, /defillamaBlocked/);
    assert.match(app, /orvupi\.verify\.alerts\.v1|storageKeys/);
    assert.equal(app.includes("lightweight-charts"), false);
    assert.match(readFileSync(path.join(root, "web/v2/verify/net/chart.mjs"), "utf8"), /lightweight-charts-5\.0\.9/);
    assert.match(readFileSync(path.join(root, "web/v2/verify/index.html"), "utf8"), /data-vf-view="mercado"/);
    assert.match(readFileSync(path.join(root, "web/v2/verify/index.html"), "utf8"), /class="verify-app"/);
    const css = readFileSync(path.join(root, "web/v2/assets/verify-app.css"), "utf8");
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /min-height: 44px/);
    assert.match(css, /vf-dock/);
    assert.match(css, /overflow-x: clip/);
    assert.match(readFileSync(path.join(root, "web/v2/verify/net/chart.mjs"), "utf8"), /pinch: true/);
    assert.equal(/\bTrade\b/.test(readFileSync(path.join(root, "web/v2/assets/verify-app.mjs"), "utf8")), false);
  });
});
