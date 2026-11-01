import assert from "node:assert/strict";
import test from "node:test";
import { PRICE_DOWN, PRICE_NEUTRAL, PRICE_UP, priceColor, seriesUp } from "./price-color.mjs";

test("la serie sube o se mantiene en verde y baja en rojo", () => {
  assert.equal(seriesUp([10, 9, 12]), true);
  assert.equal(seriesUp([10, 12, 10]), true);
  assert.equal(seriesUp([10, 11, 9]), false);
  assert.equal(seriesUp([null, 4, 5]), true);
  assert.equal(seriesUp(["8", "7"]), false);
  assert.equal(seriesUp([3]), null);
  assert.equal(seriesUp([]), null);
  assert.equal(priceColor(true), PRICE_UP);
  assert.equal(priceColor(false), PRICE_DOWN);
  assert.equal(priceColor(null), PRICE_NEUTRAL);
  assert.equal(PRICE_UP, "#16c784");
  assert.equal(PRICE_DOWN, "#ea3943");
});
