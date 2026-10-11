import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ETH = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const WHEN = "2026-10-11T08:00:00.000Z";
const LATER = "2026-10-11T12:00:00.000Z";

const BATCH_ES = "Al pulsar, tu navegador envía las direcciones que se revisan (las marcadas, o todas si no marcas ninguna) al nodo público de su red: solana-rpc.publicnode.com o api.mainnet-beta.solana.com (Solana), mainnet.base.org (Base), ethereum-rpc.publicnode.com (Ethereum) y bsc-rpc.publicnode.com (BNB Chain). Esos nodos también ven tu IP. La pasada no pide datos de mercado. No se guarda nada nuevo hasta que pulses «Guardar».";
const BATCH_EN = "When you tap, your browser sends the addresses being checked (the marked ones, or all of them if none are marked) to the public node for their network: solana-rpc.publicnode.com or api.mainnet-beta.solana.com (Solana), mainnet.base.org (Base), ethereum-rpc.publicnode.com (Ethereum) and bsc-rpc.publicnode.com (BNB Chain). Those nodes also see your IP. The check does not request market data. Nothing new is saved until you tap \"Save\".";
const BASE_ES = "Al consultar en Base, tu navegador envía la dirección al nodo público mainnet.base.org, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.";

async function modules() {
  const root = repoRoot();
  const view = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-view.js")).href) as {
    batchReviewNotice: (ids: string[], lang: string) => string;
    evmCardFromReading: (reading: Record<string, unknown>) => Record<string, unknown>;
    privacyText: (id: string, lang: string) => string;
  };
  const report = await import(pathToFileURL(path.join(root, "web/v2/shared/informe.js")).href) as {
    networkName: (network: string, lang: string) => string;
    reportModel: (source: Record<string, unknown>, lang: string) => { network: string };
    reportPaintLines: (model: { network: string }) => string[];
  };
  const summary = await import(pathToFileURL(path.join(root, "web/v2/shared/reading-summary.js")).href) as {
    summaryFromEvmCard: (card: Record<string, unknown>) => { blocks: Array<{ id: string; items: Array<{ lead?: { es?: string } }> }>; note: { lead?: { es?: string } } | null };
  };
  const model = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href) as {
    compareRecords: (left: Record<string, unknown>, right: Record<string, unknown>) => { ok: boolean; error?: { es: string; en: string }; network?: string; changes: unknown[] };
    readingComplete: (card: Record<string, unknown>) => boolean;
    validateAnyCard: (card: Record<string, unknown>) => { ok: boolean };
    watchVerdict: (previous: { card: Record<string, unknown> }, result: { card: Record<string, unknown> | null }) => { kind: string };
  };
  return { root, view, report, summary, model };
}

function reading(network: string, address: string, supply: string, at: string) {
  return {
    network,
    address,
    consultedAt: at,
    partial: false,
    reason: "leido",
    facts: {
      code: { status: "ok", kind: "contrato" },
      name: { status: "ok", text: "USD Coin" },
      symbol: { status: "ok", text: "USDC" },
      decimals: { status: "ok", value: 6 },
      totalSupply: { status: "ok", raw: supply },
      owner: { status: "ausente", address: null, reason: "revert" },
      proxy: { status: "ausente", implementation: null, admin: null, beacon: null },
    },
  };
}

describe("cuaderno en las cuatro redes", () => {
  test("el informe nombra la red, por ejemplo Base mainnet", async () => {
    const { report } = await modules();
    assert.equal(report.networkName("solana", "es"), "Solana mainnet");
    assert.equal(report.networkName("base", "es"), "Base mainnet");
    assert.equal(report.networkName("ethereum", "en"), "Ethereum mainnet");
    assert.equal(report.networkName("bnb", "es"), "BNB Chain mainnet");
    assert.equal(report.networkName("BASE", "en"), "Base mainnet");
    assert.equal(report.networkName("", "es"), "Red no indicada");
    assert.equal(report.networkName("otra<script>", "en"), "otra<script>");
    const model = report.reportModel({ summary: { blocks: [] }, mint: BASE, network: "base", consultedAt: LATER }, "es");
    assert.equal(model.network, "Base mainnet");
    assert.match(report.reportPaintLines(model).join("\n"), /Base mainnet/);
  });

  test("el aviso de la pasada es el literal de Legal y queda junto al botón", async () => {
    const { view, root } = await modules();
    assert.equal(view.privacyText("base", "es"), BASE_ES);
    for (const ids of [[], ["solana"], ["base"], ["ethereum", "bnb", "base"], ["solana", "base", "ethereum", "bnb"]]) {
      assert.equal(view.batchReviewNotice(ids, "es"), BATCH_ES);
      assert.equal(view.batchReviewNotice(ids, "en"), BATCH_EN);
    }
    assert.equal(BATCH_ES.includes("La pasada no pide datos de mercado."), true);
    assert.equal(BATCH_EN.includes("The check does not request market data."), true);
    assert.equal(BATCH_ES.includes("DEX Screener también ve tu IP y las direcciones."), false);
    assert.equal(BATCH_EN.includes("DEX Screener also sees your IP and the addresses."), false);
    const page = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    assert.equal(page.includes(BATCH_ES), true);
    assert.equal(page.includes(BATCH_EN), true);
    const noticeAt = page.indexOf('id="aviso-pasada"');
    const buttonAt = page.indexOf('id="seguir"');
    assert.equal(noticeAt >= 0 && noticeAt < buttonAt, true);
    const before = page.slice(0, noticeAt);
    assert.equal(before.lastIndexOf("</details>") > before.lastIndexOf("<details"), true);
    const between = page.slice(noticeAt, buttonAt);
    assert.equal(between.includes("<details"), false);
    assert.equal(between.includes(BATCH_ES), true);
    const follow = readFileSync(path.join(root, "web/v2/assets/cuaderno.js"), "utf8");
    const pass = follow.slice(follow.indexOf("async function followSelected"), follow.indexOf("function bind"));
    assert.equal(pass.includes("dexscreener"), false);
    assert.equal(pass.includes("mountMarket"), false);
    assert.equal(pass.includes("api.dexscreener.com"), false);
  });

  test("la comparación exige la misma red y la misma dirección, y una ficha EVM completa se puede releer", async () => {
    const { view, summary, model } = await modules();
    const older = view.evmCardFromReading(reading("base", BASE, "1000000", WHEN));
    const newer = view.evmCardFromReading(reading("base", BASE, "2000000", LATER));
    const ethereum = view.evmCardFromReading(reading("ethereum", ETH, "1000000", LATER));
    assert.equal(model.validateAnyCard(older).ok, true);
    assert.equal(model.readingComplete(older), true);
    const same = model.compareRecords({ id: "a", note: "", card: older }, { id: "b", note: "", card: newer });
    assert.equal(same.ok, true);
    assert.equal(same.network, "base");
    assert.equal(same.changes.length > 0, true);
    const crossed = model.compareRecords({ id: "a", note: "", card: older }, { id: "c", note: "", card: ethereum });
    assert.equal(crossed.ok, false);
    assert.equal(crossed.error?.es, "Solo se comparan dos consultas de la misma red y dirección.");
    assert.equal(crossed.error?.en, "Only two queries of the same network and address can be compared.");
    const equal = model.watchVerdict({ card: newer }, { card: newer });
    assert.equal(equal.kind, "igual");
    const changed = model.watchVerdict({ card: older }, { card: newer });
    assert.equal(changed.kind, "cambio");
    const broken = view.evmCardFromReading(reading("base", BASE, "2000000", LATER));
    (broken.totalSupply as { status: string }).status = "fallo";
    (broken as { partial: boolean }).partial = true;
    assert.equal(model.watchVerdict({ card: older }, { card: broken }).kind, "incompleto");
    const told = summary.summaryFromEvmCard(older);
    const blob = JSON.stringify(told);
    assert.match(blob, /USDC/);
    assert.match(blob, /Tiene código: es un contrato/);
    assert.equal(blob.includes("Pump.fun"), false);
    assert.equal(blob.includes("Permiso de emisión"), false);
    assert.equal(told.note, null);
  });

  test("la pasada no reinicia el lector entre consultas y usa readEvmToken", () => {
    const root = repoRoot();
    const source = readFileSync(path.join(root, "web/v2/assets/cuaderno.js"), "utf8");
    const follow = source.slice(source.indexOf("async function followSelected"), source.indexOf("function bind"));
    assert.match(follow, /readEvmToken\(\{/);
    assert.match(follow, /networkId: entry\.network/);
    assert.equal(follow.includes("resetEvmClientLimit"), false);
    assert.equal(follow.includes("stubxResetEvm"), false);
    assert.match(source, /validateAnyCard\(outcome\.card\)/);
    assert.match(source, /batchReviewNotice/);
    const page = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    assert.match(page, /Comparar consultas de la misma red y dirección/);
    assert.match(page, /Compare queries of the same network and address/);
    assert.match(page, /Lee un token de Solana, Base, Ethereum o BNB Chain/);
    const spec = readFileSync(path.join(root, "test/ui/cuaderno-redes.spec.mjs"), "utf8");
    assert.equal(spec.includes("stubxResetEvm"), false);
    assert.equal(spec.includes("resetEvmClientLimit"), false);
  });
});
