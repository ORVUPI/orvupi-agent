import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";
import {
  CPMM_DEFAULT_CONFIG,
  LAUNCHLAB_PROGRAM,
  cpmmPoolPda,
  decodeLaunchlabPool,
  decodePlatformCpConfig,
  launchlabPoolPda,
  readLaunchlab,
} from "../verify/launchlab.js";
import { bondingCurvePda, metadataPda } from "../verify/programs.js";
import { readAnyMint } from "../verify/signals.js";

type Row = { address: string; owner: string; data: string };
const fixture = JSON.parse(readFileSync(path.join(repoRoot(), "test/fixtures/launchlab-real.json"), "utf8")) as {
  slot: number;
  accounts: Record<string, Row>;
};
const ORVUPI = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const ORVUPI_POOL = "8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk";
const USELESS = "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk";
const USELESS_CPMM = "Q2sPHPdUWFMg7M7wwrQKLrn619cAucfRsmhVJffodSp";
const WSOL = "So11111111111111111111111111111111111111112";
const readUrl = pathToFileURL(path.join(repoRoot(), "pares/chain-read.mjs")).href;
const reportUrl = pathToFileURL(path.join(repoRoot(), "web/v2/modules/pair-report.mjs")).href;

function bytes(row: Row): Uint8Array {
  return new Uint8Array(Buffer.from(row.data, "base64"));
}

const byAddress = new Map<string, { owner: string; data: Uint8Array }>();
for (const row of Object.values(fixture.accounts)) if (row) byAddress.set(row.address, { owner: row.owner, data: bytes(row) });

const reader = async (addresses: readonly string[]) => ({ ok: true, value: addresses.map((item) => byAddress.get(item) ?? null) });

describe("Raydium LaunchLab con cuentas reales capturadas", () => {
  test("la PDA del pool de ORVUPI coincide con la cuenta de la cadena", () => {
    assert.equal(launchlabPoolPda(ORVUPI), ORVUPI_POOL);
    assert.equal(fixture.accounts["orvupi-pool"]?.owner, LAUNCHLAB_PROGRAM);
  });

  test("decodifica el pool de ORVUPI con el layout del SDK", () => {
    const row = fixture.accounts["orvupi-pool"] as Row;
    const pool = decodeLaunchlabPool(row.address, row.owner, bytes(row), ORVUPI);
    assert.ok(pool);
    assert.equal(pool.mintA, ORVUPI);
    assert.equal(pool.mintB, WSOL);
    assert.equal(pool.status, "en_curva");
    assert.equal(pool.migrateType, "cpmm");
    assert.equal(pool.decimalsA, 6);
    assert.equal(pool.decimalsB, 9);
    assert.equal(pool.supply, 1_000_000_000_000_000n);
    assert.equal(pool.totalSellA, 750_000_000_000_000n);
    assert.equal(pool.realB, 494_750_000n);
    assert.equal(pool.totalFundRaisingB, 30_000_000_000n);
    assert.equal(pool.progressPercent, "1.64");
    assert.equal(pool.platformId, "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4");
    assert.equal(pool.creator, "GKpccLJwKArptzt9j897njXUx9RsV5NKL3Egu7bfMA6Q");
  });

  test("otro propietario, otro mint o bytes cortos no son una curva", () => {
    const row = fixture.accounts["orvupi-pool"] as Row;
    assert.equal(decodeLaunchlabPool(row.address, "11111111111111111111111111111111", bytes(row)), null);
    assert.equal(decodeLaunchlabPool(row.address, row.owner, bytes(row), USELESS), null);
    assert.equal(decodeLaunchlabPool(row.address, row.owner, bytes(row).subarray(0, 300)), null);
  });

  test("un pool migrado a CPMM lleva al pool de Raydium comprobado en la cadena", async () => {
    const platform = fixture.accounts["useless-platform"] as Row;
    assert.ok(decodePlatformCpConfig(platform.owner, bytes(platform)));
    assert.equal(cpmmPoolPda(CPMM_DEFAULT_CONFIG, USELESS, WSOL), USELESS_CPMM);
    const result = await readLaunchlab(USELESS, reader);
    assert.equal(result.ok, true);
    assert.equal(result.reading?.pool.status, "migrado");
    assert.equal(result.reading?.migratedPool, USELESS_CPMM);
  });

  test("sin curva en ninguna plataforma no hay lectura y un fallo no se da por ausencia", async () => {
    const none = await readLaunchlab("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", reader);
    assert.deepEqual(none, { ok: true, reading: null });
    const failed = await readLaunchlab(ORVUPI, async () => ({ ok: false, value: null }));
    assert.deepEqual(failed, { ok: false, reading: null });
  });

  test("la página de la curva detecta Raydium LaunchLab y da los valores leídos", async () => {
    const { readCurveState } = await import(readUrl);
    const { describePair, evidenceRecord, launchlabLines } = await import(reportUrl);
    const mock = {
      reads: [],
      getSlot: async () => ({ ok: true, value: fixture.slot }),
      getMultipleAccounts: async (addresses: string[]) => ({ ok: true, value: addresses.map((item) => byAddress.get(item) ?? null), fetchedAt: "2026-10-18T19:50:00.000Z" }),
    };
    const state = await readCurveState(ORVUPI, { reader: mock });
    assert.equal(state.ok, true);
    assert.equal(state.curve, null);
    const pair = describePair(state);
    assert.equal(pair.platform, "raydium_launchlab");
    assert.equal(pair.curve, "abierta");
    assert.equal(pair.base, "SOL");
    assert.equal(pair.launchlab.raised, "0.49475");
    assert.equal(pair.launchlab.target, "30");
    assert.equal(pair.launchlab.progress, "1.64");
    const evidence = evidenceRecord({ mint: ORVUPI, base: pair.base, curve: pair.curve, platform: pair.platform, launchlab: pair.launchlab, protocolFeeBps: null, creatorFeeBps: null, source: "x", readAt: "t" });
    const text = launchlabLines(evidence).map((line: { es: string }) => line.es).join(" | ");
    assert.match(text, /Plataforma: Raydium LaunchLab/);
    assert.match(text, /SOL reunido en la curva: 0,49475 SOL/);
    assert.match(text, /Objetivo de graduación: 30 SOL/);
    assert.match(text, /Progreso: 1,64 %/);
    assert.match(text, /en curva/);
    assert.doesNotMatch(text, /STUBX|precio|price|compra/i);
    // El mint de USELESS no está capturado; para esta lectura vale cualquier mint SPL válido.
    byAddress.set(USELESS, byAddress.get(ORVUPI) as { owner: string; data: Uint8Array });
    const migrated = await readCurveState(USELESS, { reader: mock });
    byAddress.delete(USELESS);
    const migratedPair = describePair(migrated);
    assert.equal(migratedPair.curve, "migrada");
    assert.equal(migratedPair.launchlab.migratedPool, USELESS_CPMM);
  });

  test("Verify lee la curva de ORVUPI en Raydium LaunchLab y no dice No aplica", async () => {
    const accounts = new Map<string, { owner: string; data: Uint8Array } | null>([
      [metadataPda(ORVUPI), byAddress.get(metadataPda(ORVUPI)) ?? null],
      [bondingCurvePda(ORVUPI), null],
    ]);
    const reading = await readAnyMint({
      mint: ORVUPI,
      registry: [],
      endpoints: ["https://rpc-a.invalid"],
      transport: async (_endpoint, body) => {
        const request = JSON.parse(body) as { method: string; params: unknown[] };
        const ok = (value: unknown) => ({ status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: { context: { slot: fixture.slot }, value } }) });
        if (request.method === "getMultipleAccounts") {
          const ids = request.params[0] as string[];
          return ok(
            ids.map((id) => {
              const found = accounts.has(id) ? accounts.get(id) : byAddress.get(id);
              return found ? { owner: found.owner, lamports: 1, executable: false, space: found.data.length, data: [Buffer.from(found.data).toString("base64"), "base64"] } : null;
            }),
          );
        }
        if (request.method === "getTokenSupply") return ok({ amount: "1000000000000000", decimals: 6 });
        if (request.method === "getTokenLargestAccounts") return ok([]);
        return { status: 400, body: "" };
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    const curve = reading.signals.find((item) => item.id === "curva");
    assert.ok(curve);
    assert.match(curve.title.es, /Raydium LaunchLab: en curva/);
    assert.match(curve.explain.es, /Moneda base: SOL/);
    assert.match(curve.explain.es, /0,49475 SOL de 30 SOL/);
    assert.match(curve.explain.es, /1,64 %/);
    assert.doesNotMatch(curve.explain.es, /No aplica/);
    assert.equal(reading.facts?.find((item) => item.id === "curva")?.state, "ok");
    assert.equal((reading.shown as { curve?: { status?: string } } | null)?.curve?.status, "verificado");
    // Guardar en el Cuaderno desde Verify conserva la curva de LaunchLab.
    const read = await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/solana-read.js")).href);
    const model = await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/notebook-model.js")).href);
    const card = read.cardFromShown(reading.shown);
    assert.ok(card);
    assert.deepEqual(card.curve.launchlab, {
      platform: "raydium_launchlab",
      pool: ORVUPI_POOL,
      quoteMint: WSOL,
      quoteDecimals: 9,
      raised: "494750000",
      target: "30000000000",
      progress: "1.64",
      status: "en_curva",
      migrateType: "cpmm",
      migratedPool: null,
      migratedNote: "no_aplica",
    });
    assert.deepEqual(model.validateCard(card).error ?? null, null);
    const tampered = structuredClone(reading.shown) as { curve: { launchlab: { raised: string } } };
    tampered.curve.launchlab.raised = "1e9";
    assert.equal(Object.hasOwn(read.cardFromShown(tampered).curve, "launchlab"), false);
  });
});
