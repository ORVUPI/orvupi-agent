import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

type Row = { address: string; owner: string; data: string } | null;
const fixture = JSON.parse(readFileSync(path.join(repoRoot(), "test/fixtures/launchlab-real.json"), "utf8")) as { slot: number; accounts: Record<string, Row> };
const rows = new Map<string, Row>();
for (const row of Object.values(fixture.accounts)) if (row) rows.set(row.address, row);
const ORVUPI = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const USELESS = "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk";
const readUrl = pathToFileURL(path.join(repoRoot(), "web/v2/shared/solana-read.js")).href;
const modelUrl = pathToFileURL(path.join(repoRoot(), "web/v2/shared/notebook-model.js")).href;

function transport(extra: Record<string, string> = {}) {
  return async (_endpoint: string, body: string) => {
    const request = JSON.parse(body) as { method: string; params: unknown[] };
    const ok = (value: unknown) => ({ status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: { context: { slot: fixture.slot }, value } }) });
    if (request.method === "getMultipleAccounts") {
      return ok((request.params[0] as string[]).map((id) => {
        const row = rows.get(extra[id] ?? id);
        return row ? { owner: row.owner, lamports: 1, executable: false, space: 0, data: [row.data, "base64"] } : null;
      }));
    }
    if (request.method === "getTokenSupply") return ok({ amount: "1000000000000000", decimals: 6 });
    if (request.method === "getTokenLargestAccounts") return ok([{ address: ORVUPI, amount: "1", decimals: 6 }]);
    return { status: 400, body: "" };
  };
}

describe("Cuaderno con Raydium LaunchLab (cuentas reales capturadas)", () => {
  test("la ficha de ORVUPI guarda la curva de LaunchLab y es válida", async () => {
    const read = await import(readUrl);
    const model = await import(modelUrl);
    const result = await read.readMint({ mint: ORVUPI, transport: transport(), minIntervalMs: 0, maxRetries: 0, sleep: async () => {} });
    const curve = result.card.curve;
    assert.equal(curve.present, true);
    assert.equal(curve.status, "verificado");
    assert.equal(curve.complete, false);
    assert.deepEqual(curve.launchlab, {
      platform: "raydium_launchlab",
      pool: "8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk",
      quoteMint: "So11111111111111111111111111111111111111112",
      quoteDecimals: 9,
      raised: "494750000",
      target: "30000000000",
      progress: "1.64",
      status: "en_curva",
      migrateType: "cpmm",
      migratedPool: null,
      migratedNote: "no_aplica",
    });
    assert.deepEqual(model.validateCard(result.card).error ?? null, null);
  });

  test("un token graduado guarda el pool CPMM al que migró", async () => {
    const read = await import(readUrl);
    const model = await import(modelUrl);
    const result = await read.readMint({ mint: USELESS, transport: transport({ [USELESS]: ORVUPI }), minIntervalMs: 0, maxRetries: 0, sleep: async () => {} });
    assert.equal(result.card.curve.launchlab.status, "migrado");
    assert.equal(result.card.curve.launchlab.migratedPool, "Q2sPHPdUWFMg7M7wwrQKLrn619cAucfRsmhVJffodSp");
    assert.equal(result.card.curve.complete, true);
    assert.equal(model.validateCard(result.card).ok, true);
  });

  test("las fichas antiguas siguen siendo válidas y una curva LaunchLab rota no", async () => {
    const read = await import(readUrl);
    const model = await import(modelUrl);
    const result = await read.readMint({ mint: ORVUPI, transport: transport(), minIntervalMs: 0, maxRetries: 0, sleep: async () => {} });
    const old = structuredClone(result.card);
    delete old.curve.launchlab;
    assert.equal(model.validateCard(old).ok, true);
    const broken = structuredClone(result.card);
    broken.curve.launchlab.raised = "1.5";
    assert.equal(model.validateCard(broken).ok, false);
  });
});
