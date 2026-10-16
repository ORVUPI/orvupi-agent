// Revisión de seguridad del PR #62 (16-10-2026): leet en Studio y Verify, franja e informe en EVM,
// migración validada y campo oficial antiguo descartado.
import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";
import { namesProject } from "../verify/signals.js";

type Loose = Record<string, any>;
const load = async (rel: string): Promise<Loose> => (await import(pathToFileURL(path.join(repoRoot(), rel)).href)) as Loose;

const EVM = {
  network: "base",
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  reason: "leido",
  consultedAt: "2026-10-16T20:00:00.000Z",
  rpcHost: "mainnet.base.org",
  facts: {
    code: { status: "ok", kind: "contrato" },
    name: { status: "ok", text: "0RVUP1" },
    symbol: { status: "ok", text: "ORVUPl" },
    decimals: { status: "ok", value: 6 },
    totalSupply: { status: "ok", raw: "1000000" },
    owner: { status: "ausente", reason: "revert" },
    proxy: { status: "ausente" },
  },
};

describe("revisión de seguridad PR #62", () => {
  test("Verify ve ORVUPI también con leet y homóglifos, y no marca otros nombres", async () => {
    const summary = await load("web/v2/shared/reading-summary.js");
    for (const name of ["ORVUPI", "0RVUP1", "ORVUPl", "orvup|", "Оrvupi", "O R V U P I", "orv\u200bupi"]) {
      assert.equal(namesProject(name), true, name);
      assert.notEqual(summary.namedLikeOrvupiText(name, "", "es"), "", name);
    }
    for (const name of ["USD Coin", "USDC", "orbit", "upi"]) {
      assert.equal(namesProject(name), false, name);
      assert.equal(summary.namedLikeOrvupiText(name, "", "es"), "", name);
    }
  });

  test("Studio bloquea los @handles con leet: @0RVUP1, @orvup1, @creador0rvupi", async () => {
    const filter = await load("web/v2/studio/lib/filter.mjs");
    for (const text of ["sígueme en @0RVUP1", "escribe a @orvup1", "habla con @creador0rvupi", "@ORVUPl oficial", "@Оrvupi"]) {
      assert.equal(filter.analyze(text).blocked, true, text);
    }
  });

  test("EVM: la franja «Se llama como ORVUPI» sale y el informe PNG/PDF se puede generar", async () => {
    const evm = await load("web/v2/shared/evm-view.js");
    const report = await load("web/v2/shared/informe.js");
    const view = evm.describeEvm(EVM, "es");
    assert.equal(view.namedLike, "Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato.");
    const model = report.reportModel(evm.evmReportSource(EVM), "es");
    assert.equal(model.warning.startsWith("Se llama como ORVUPI"), true);
    assert.equal(model.network, "Base");
    assert.equal(model.address, EVM.address);
    assert.deepEqual(model.blocks.map((block: Loose) => block.id), ["comprobado", "atencion", "falta"]);
    const plain = report.reportModel(evm.evmReportSource({ ...EVM, facts: { ...EVM.facts, name: { status: "ok", text: "USD Coin" }, symbol: { status: "ok", text: "USDC" } } }), "en");
    assert.equal(plain.warning, "");
    assert.equal(evm.describeEvm({ ...EVM, facts: { ...EVM.facts, name: { status: "ok", text: "USD Coin" }, symbol: { status: "ok", text: "USDC" } } }, "en").namedLike, "");
  });

  test("el campo oficial antiguo se descarta salvo en la ficha del token anterior", async () => {
    const model = await load("web/v2/shared/notebook-model.js");
    const legacy = await load("web/v2/shared/legacy-names.js");
    const read = await load("web/v2/shared/solana-read.js");
    const other = model.upgradeLegacyNames({ schema: `${legacy.LEGACY_SCHEMA_PREFIX}notebook.card`, mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", [legacy.LEGACY_OFFICIAL_FIELD]: true });
    assert.equal(other.officialProject, false);
    assert.equal(legacy.LEGACY_OFFICIAL_FIELD in other, false);
    const previous = model.upgradeLegacyNames({ mint: read.LEGACY_FLAG_MINT, [legacy.LEGACY_OFFICIAL_FIELD]: true });
    assert.equal(previous.officialProject, true);
  });

  test("la migración no copia entradas con red o dirección inventadas", async () => {
    const db = await load("web/v2/shared/notebook-db.js");
    assert.equal(db.legacyRecordForMigration(null), null);
    assert.equal(db.legacyRecordForMigration({ id: "x", network: "javascript:alert(1)", address: "<svg onload=alert(1)>", card: { mint: "<b>x</b>" } }), null);
    assert.equal(db.legacyRecordForMigration({ id: "", card: {} }), null);
  });
});
