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
const CLONE_ES = "Se parece a STUBX pero no es la dirección oficial. El oficial solo está en Solana.";
const CLONE_EN = "Looks like STUBX but is not the official address. The official one is only on Solana.";
const CURVE_ES = "Curva de Pump.fun: No aplica (no es una red de Solana)";
const CURVE_EN = "Pump.fun curve: Not applicable (not a Solana network)";
const BNB = "0x55d398326f99059ff775485246999027b3197955";

function exactHosts(text: string) {
  const pattern = /(?:^|[^A-Za-z0-9.-])([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)(?![A-Za-z0-9.-])/g;
  return [...String(text).matchAll(pattern)].map((match) => match[1]);
}

async function modules() {
  const root = repoRoot();
  const view = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-view.js")).href) as {
    batchReviewNotice: (ids: string[], lang: string) => string;
    evmCardFromReading: (reading: Record<string, unknown>) => Record<string, unknown>;
    evmEntryGapMs: (previousId: string, nextId: string) => number;
    evmPassVerdict: (previous: { card: Record<string, unknown> } | null, read: Record<string, unknown>) => { kind: string; unchecked?: boolean };
    privacyText: (id: string, lang: string) => string;
  };
  const read = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-read.js")).href) as {
    readEvmToken: (input: Record<string, unknown>) => Promise<{ transport?: string; reason: string; reading: Record<string, unknown> }>;
  };
  const report = await import(pathToFileURL(path.join(root, "web/v2/shared/informe.js")).href) as {
    networkName: (network: string, lang: string) => string;
    reportModel: (source: Record<string, unknown>, lang: string) => { network: string; warning: string; note: string; blocks: Array<{ id: string; lines: Array<{ lead?: string }> }> };
    reportPaintLines: (model: { network: string }) => string[];
    drawReport: (ctx: object, model: object, width?: number) => { height: number; warningTop: number; warningBottom: number; guides: { headerBottom: number } };
    reportPagePlan: (height: number, limitsTop: number, pageHeight?: number, warningHeight?: number, guides?: { headerBottom: number }) => Array<{ repeatHeader: boolean }>;
  };
  const summary = await import(pathToFileURL(path.join(root, "web/v2/shared/reading-summary.js")).href) as {
    summaryFromEvmCard: (card: Record<string, unknown>) => { blocks: Array<{ id: string; items: Array<{ lead?: { es?: string; en?: string } }> }>; note: { lead?: { es?: string; en?: string } } | null };
  };
  const model = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href) as {
    compareRecords: (left: Record<string, unknown>, right: Record<string, unknown>) => { ok: boolean; error?: { es: string; en: string }; network?: string; changes: unknown[] };
    readingComplete: (card: Record<string, unknown>) => boolean;
    validateAnyCard: (card: Record<string, unknown>) => { ok: boolean };
    watchVerdict: (previous: { card: Record<string, unknown> }, result: { card: Record<string, unknown> | null }) => { kind: string };
  };
  return { root, view, read, report, summary, model };
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
    const kept = "No se guarda nada nuevo hasta que pulses «Guardar».";
    const onlyEvm = view.batchReviewNotice(["base", "ethereum", "bnb"], "es");
    assert.equal(onlyEvm, BATCH_ES);
    const keptAt = onlyEvm.indexOf(kept);
    assert.equal(keptAt >= 0, true);
    assert.equal(onlyEvm.slice(keptAt, keptAt + kept.length), kept);
    assert.deepEqual(exactHosts(BATCH_ES), [
      "solana-rpc.publicnode.com",
      "api.mainnet-beta.solana.com",
      "mainnet.base.org",
      "ethereum-rpc.publicnode.com",
      "bsc-rpc.publicnode.com",
    ]);
    const page = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    const noticeAt = page.indexOf('id="aviso-pasada"');
    const buttonAt = page.indexOf('id="seguir"');
    assert.equal(noticeAt >= 0 && noticeAt < buttonAt, true);
    const before = page.slice(0, noticeAt);
    assert.equal(before.lastIndexOf("</details>") > before.lastIndexOf("<details"), true);
    const between = page.slice(noticeAt, buttonAt);
    assert.equal(between.includes("<details"), false);
    const spanish = between.match(/<span class="lang es"[^>]*>([^<]*)<\/span>/);
    const english = between.match(/<span class="lang en"[^>]*>([^<]*)<\/span>/);
    assert.equal(spanish && spanish[1], BATCH_ES);
    assert.equal(english && english[1], BATCH_EN);
    const follow = readFileSync(path.join(root, "web/v2/assets/cuaderno.js"), "utf8");
    const pass = follow.slice(follow.indexOf("async function followSelected"), follow.indexOf("function bind"));
    assert.equal(exactHosts(pass).some((host) => host === "api.dexscreener.com"), false);
    assert.equal(pass.includes("mountMarket"), false);
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
    assert.equal(blob.includes("Permiso de emisión"), false);
    assert.equal(told.note && told.note.lead && told.note.lead.es, "Curva de Pump.fun: No aplica (no es una red de Solana)");
    const missing = told.blocks.find((block) => block.id === "falta");
    assert.equal(JSON.stringify(missing).includes("Curva de Pump.fun"), false);
    const attention = told.blocks.find((block) => block.id === "atencion");
    assert.equal(JSON.stringify(attention).includes("Se parece a STUBX"), false);
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
    assert.match(follow, /evmEntryGapMs\(previousNetwork, entry\.network\)/);
    assert.match(follow, /evmPassVerdict\(entry\.latest, read\)/);
    assert.equal(follow.includes('new Set(["base", "ethereum", "bnb"])'), false);
  });

  test("el informe de un clon EVM lleva el aviso arriba, en cada página y el primero de atención", async () => {
    const { view, summary, report } = await modules();
    const clones = [
      ["base", BASE],
      ["ethereum", ETH],
      ["bnb", BNB],
    ] as const;
    for (const [network, address] of clones) {
      const named = reading(network, address, "1000000", WHEN);
      named.facts.name.text = "S\u03A4UBX";
      named.facts.symbol.text = "STUBX";
      const card = view.evmCardFromReading(named);
      const told = summary.summaryFromEvmCard(card);
      const attention = told.blocks.find((block) => block.id === "atencion");
      assert.equal(attention && attention.items[0] && attention.items[0].lead && attention.items[0].lead.es, CLONE_ES);
      assert.equal(attention && attention.items[0] && attention.items[0].lead && attention.items[0].lead.en, CLONE_EN);
      const missing = told.blocks.find((block) => block.id === "falta");
      assert.equal(JSON.stringify(missing).includes("Curva de Pump.fun"), false);
      assert.equal(told.note && told.note.lead && told.note.lead.es, CURVE_ES);
      assert.equal(told.note && told.note.lead && told.note.lead.en, CURVE_EN);
      const model = report.reportModel({ summary: told, mint: address, network, consultedAt: WHEN }, "es");
      assert.equal(model.warning, CLONE_ES);
      const lines = report.reportPaintLines(model);
      const warningAt = lines.findIndex((line) => line === CLONE_ES);
      const networkAt = lines.findIndex((line) => line === "Red");
      const attentionAt = lines.findIndex((line) => line === "Qué requiere atención");
      assert.equal(warningAt >= 0 && warningAt < networkAt && warningAt < attentionAt, true);
      const attentionBlock = model.blocks.find((block) => block.id === "atencion");
      assert.equal(attentionBlock && attentionBlock.lines[0] && attentionBlock.lines[0].lead, CLONE_ES);
      assert.equal(model.note, CURVE_ES);
      const english = report.reportModel({ summary: told, mint: address, network, consultedAt: WHEN }, "en");
      assert.equal(english.warning, CLONE_EN);
      assert.equal(english.note, CURVE_EN);
      const drawn = report.drawReport(mockCtx(), model, 840);
      assert.equal(drawn.warningTop < drawn.warningBottom, true);
      assert.equal(drawn.warningBottom <= drawn.guides.headerBottom, true);
      const plan = report.reportPagePlan(drawn.height, drawn.height - 1, 420, drawn.warningBottom - drawn.warningTop, drawn.guides);
      assert.equal(plan.length > 1, true);
      assert.equal(plan.every((page) => page.repeatHeader), true);
    }
    const plain = summary.summaryFromEvmCard(view.evmCardFromReading(reading("base", BASE, "1000000", WHEN)));
    const plainAttention = plain.blocks.find((block) => block.id === "atencion");
    assert.equal(JSON.stringify(plainAttention).includes("Se parece a STUBX"), false);
    assert.equal(plain.note && plain.note.lead && plain.note.lead.es, CURVE_ES);
  });

  test("un timeout o un 5xx de la pasada EVM queda en incompleto", async () => {
    const { view, read } = await modules();
    const previous = { card: view.evmCardFromReading(reading("base", BASE, "1000000", WHEN)) };
    const input = {
      networkId: "base",
      address: BASE,
      minIntervalMs: 0,
      timeoutMs: 1,
      takeSlot: () => true,
    };
    const timeout = await read.readEvmToken({ ...input, transport: async () => ({ status: 0, body: "" }) });
    const server = await read.readEvmToken({ ...input, transport: async () => ({ status: 503, body: "" }) });
    assert.equal(timeout.transport, "tiempo");
    assert.equal(server.transport, "servidor");
    const timed = view.evmPassVerdict(previous, timeout);
    const failed = view.evmPassVerdict(previous, server);
    assert.equal(timed.kind, "incompleto");
    assert.equal(timed.unchecked, true);
    assert.equal(failed.kind, "incompleto");
    assert.equal(failed.unchecked, true);
    const source = readFileSync(path.join(repoRoot(), "web/v2/assets/cuaderno.js"), "utf8");
    assert.equal(source.includes("Incompleto. No se pudo comprobar."), true);
    assert.equal(source.includes("Incomplete. Could not be checked."), true);
    assert.equal(source.includes('kind === "incompleto" && outcome.unchecked'), true);
  });

  test("las redes EVM del cuaderno salen de networks.json y la pasada deja 500 ms entre ellas", async () => {
    const { view, model } = await modules();
    const catalog = JSON.parse(readFileSync(path.join(repoRoot(), "web/v2/shared/networks.json"), "utf8")) as {
      networks: Array<{ id: string; enabled: boolean; family: string }>;
    };
    const active = catalog.networks.filter((item) => item.enabled && item.family === "evm").map((item) => item.id);
    assert.deepEqual(active, ["base", "ethereum", "bnb"]);
    for (const id of active) {
      const card = view.evmCardFromReading(reading(id, id === "bnb" ? BNB : id === "ethereum" ? ETH : BASE, "1000000", WHEN));
      assert.equal(model.validateAnyCard(card).ok, true);
    }
    const other = view.evmCardFromReading(reading("avalanche", BASE, "1000000", WHEN));
    assert.equal(model.validateAnyCard(other).ok, false);
    const notebook = readFileSync(path.join(repoRoot(), "web/v2/shared/notebook-model.js"), "utf8");
    assert.equal(notebook.includes('new Set(["base", "ethereum", "bnb"])'), false);
    assert.equal(view.evmEntryGapMs("base", "ethereum"), 500);
    assert.equal(view.evmEntryGapMs("ethereum", "bnb"), 500);
    assert.equal(view.evmEntryGapMs("bnb", "base"), 500);
    assert.equal(view.evmEntryGapMs("solana", "base"), 0);
    assert.equal(view.evmEntryGapMs("base", "solana"), 0);
    assert.equal(view.evmEntryGapMs("", "base"), 0);
  });
});

function mockCtx() {
  return {
    canvas: { width: 0, height: 0 },
    fillStyle: "",
    strokeStyle: "",
    font: "16px sans-serif",
    lineWidth: 1,
    textBaseline: "alphabetic",
    measureText(text: string) {
      const size = Number(/(\d+)px/.exec(this.font)?.[1] || 16);
      return { width: Array.from(String(text)).length * size * 0.45 };
    },
    fillRect() {},
    strokeRect() {},
    fillText() {},
  };
}
