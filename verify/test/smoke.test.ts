import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { readAnyMint } from "../signals.js";
import { repoRootFrom } from "../root.js";
import type { CanonicalToken } from "../types.js";

const root = repoRootFrom(import.meta.url);
const enabled = process.env.VERIFY_SMOKE === "1";

describe("humo opcional contra mainnet", { skip: enabled ? false : "VERIFY_SMOKE no está en 1" }, () => {
  test("un token conocido ajeno a STUB se lee sin llamarlo copia", async () => {
    const dir = path.join(root, "verify/examples/2026-10-09");
    const file = readdirSync(dir).find((name) => name.startsWith("EPjFW") && name.endsWith(".json"));
    assert.ok(file);
    const mint = file.slice(0, -".json".length);
    const limits = JSON.parse(readFileSync(path.join(root, "verify/policy/limits.json"), "utf8")) as {
      defaultRpcUrl: string;
      fallbackRpcUrl: string;
    };
    const registry = (
      JSON.parse(readFileSync(path.join(root, "verify/test/fixtures/registry-demo.json"), "utf8")) as { tokens: CanonicalToken[] }
    ).tokens;
    const reading = await readAnyMint({
      mint,
      registry,
      endpoints: [limits.defaultRpcUrl, limits.fallbackRpcUrl],
      maxRetries: 0,
      minIntervalMs: 300,
      timeoutMs: 8000,
    });
    assert.equal(reading.ok, true, reading.support.es);
    assert.equal(reading.title.es, "Lectura de este token");
    assert.equal(
      reading.signals.some((item) => item.title.es === "Se parece a STUB, pero no es la CA oficial"),
      false,
    );
    assert.match(reading.signals.find((item) => item.id === "programa")?.explain.es ?? "", /SPL Token/);
  });
});
