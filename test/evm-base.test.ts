import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NO_OWNER = "0x1111111111111111111111111111111111111111";
const PROXY = "0x2222222222222222222222222222222222222222";
const EOA = "0x3333333333333333333333333333333333333333";
const IMPL = "0x4444444444444444444444444444444444444444";
const WHEN = "2026-10-11T16:32:00.000Z";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
};
const SLOT_IMPLEMENTATION = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const SLOT_BEACON = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

function word(hex: string) {
  return `0x${hex.replace(/^0x/, "").padStart(64, "0")}`;
}

function encodeString(text: string) {
  const bytes = new TextEncoder().encode(text);
  const length = bytes.length.toString(16).padStart(64, "0");
  let data = "";
  for (const byte of bytes) data += byte.toString(16).padStart(2, "0");
  const pad = (64 - (data.length % 64)) % 64;
  return `0x${"20".padStart(64, "0")}${length}${data}${"0".repeat(pad)}`;
}

function zeroWord() {
  return `0x${"0".repeat(64)}`;
}

type Hit = { method: string; params: unknown[] };

function scripted(answers: (call: Hit) => { result?: string; error?: { code: number; message: string }; status?: number; body?: string }) {
  const seen: Hit[] = [];
  const transport = async (_endpoint: string, body: string, timeoutMs: number) => {
    assert.equal(timeoutMs, 8000);
    const parsed = JSON.parse(body) as { method: string; params: unknown[] };
    seen.push({ method: parsed.method, params: parsed.params });
    const answer = answers(seen.at(-1) as Hit);
    if (answer.body !== undefined) return { status: answer.status ?? 200, body: answer.body };
    if (answer.status && answer.status !== 200) return { status: answer.status, body: "" };
    if (answer.error) {
      return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, error: answer.error }) };
    }
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: answer.result }) };
  };
  return { transport, seen };
}

function dataOf(call: Hit) {
  const first = call.params[0] as { data?: string } | string;
  if (first && typeof first === "object") return first.data || "";
  return "";
}

function slotOf(call: Hit) {
  return String(call.params[1] || "");
}

async function load() {
  const root = repoRoot();
  const evm = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-read.js")).href);
  const view = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-view.js")).href);
  const model = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href);
  const networks = await import(pathToFileURL(path.join(root, "web/v2/shared/networks.js")).href);
  const db = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-db.js")).href);
  const market = await import(pathToFileURL(path.join(root, "web/v2/shared/market-read.js")).href);
  return { evm, view, model, networks, db, market };
}

describe("lectura EVM en Base", () => {
  test("USDC, token sin owner, proxy, cuenta, dirección inválida y nodo caído", async () => {
    const { evm, view, model } = await load();
    evm.resetEvmClientLimit();

    const usdc = scripted((call) => {
      if (call.method === "eth_getCode") return { result: "0x60016000" };
      if (call.method === "eth_getStorageAt" && slotOf(call) === SLOT_IMPLEMENTATION) return { result: word(IMPL.slice(2)) };
      if (call.method === "eth_getStorageAt" && slotOf(call) === SLOT_BEACON) return { result: zeroWord() };
      const data = dataOf(call);
      if (data === SELECTORS.name) return { result: encodeString("USD Coin") };
      if (data === SELECTORS.symbol) return { result: encodeString("USDC") };
      if (data === SELECTORS.decimals) return { result: word("06") };
      if (data === SELECTORS.totalSupply) return { result: word("0f4240") };
      if (data === SELECTORS.owner) return { result: word("5555555555555555555555555555555555555555") };
      return { error: { code: 3, message: "execution reverted" } };
    });
    const read = await evm.readEvmToken({
      networkId: "base",
      address: `  ${USDC}  `,
      transport: usdc.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(read.ok, true);
    assert.equal(read.reason, "leido");
    assert.equal(read.reading.address, USDC);
    assert.equal(read.reading.rpcHost, "mainnet.base.org");
    assert.equal(read.reading.facts.code.kind, "contrato");
    assert.equal(read.reading.facts.code.status, "ok");
    assert.equal(read.reading.facts.name.text, "USD Coin");
    assert.equal(read.reading.facts.symbol.text, "USDC");
    assert.equal(read.reading.facts.decimals.value, 6);
    assert.equal(read.reading.facts.totalSupply.raw, "1000000");
    assert.equal(read.reading.facts.owner.status, "ok");
    assert.equal(read.reading.facts.proxy.status, "ok");
    assert.equal(read.reading.facts.proxy.implementation, IMPL.toLowerCase());
    assert.equal(read.reading.facts.proxy.beacon, null);
    assert.equal(read.reading.partial, false);
    assert.deepEqual(
      [...new Set(usdc.seen.map((call) => call.method))].sort(),
      ["eth_call", "eth_getCode", "eth_getStorageAt"],
    );
    const spoken = view.describeEvm(read.reading, "es");
    assert.match(spoken.rows.find((row: { id: string }) => row.id === "name").line, /USDC/);
    assert.match(spoken.rows.find((row: { id: string }) => row.id === "name").line, /El contrato escribió «USD Coin»/);
    assert.match(spoken.rows.find((row: { id: string }) => row.id === "name").line, /leído/);
    assert.equal(spoken.rows.find((row: { id: string }) => row.id === "name").line.toLowerCase().includes("verified"), false);
    const card = view.evmCardFromReading({ ...read.reading, reason: "leido" });
    const checked = model.validateEvmCard(card);
    assert.equal(checked.ok, true, checked.ok ? "" : checked.error.es);

    evm.resetEvmClientLimit();
    const noOwner = scripted((call) => {
      if (call.method === "eth_getCode") return { result: "0x6001" };
      if (call.method === "eth_getStorageAt") return { result: zeroWord() };
      const data = dataOf(call);
      if (data === SELECTORS.name) return { result: encodeString("Foo") };
      if (data === SELECTORS.symbol) return { result: encodeString("FOO") };
      if (data === SELECTORS.decimals) return { result: word("12") };
      if (data === SELECTORS.totalSupply) return { result: word("01") };
      if (data === SELECTORS.owner) return { error: { code: 3, message: "execution reverted" } };
      return { result: "0x" };
    });
    const ownerless = await evm.readEvmToken({
      networkId: "base",
      address: NO_OWNER,
      transport: noOwner.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(ownerless.reading.facts.owner.status, "ausente");
    assert.equal(ownerless.reading.facts.owner.reason, "revert");
    assert.equal(ownerless.reading.facts.proxy.status, "ausente");
    const foreign = view.describeEvm(ownerless.reading, "es");
    assert.match(foreign.rows.find((row: { id: string }) => row.id === "name").line, /Dice llamarse «Foo»/);
    assert.match(foreign.rows.find((row: { id: string }) => row.id === "owner").line, /ausente comprobado/);

    evm.resetEvmClientLimit();
    const proxy = scripted((call) => {
      if (call.method === "eth_getCode") return { result: "0x363d3d373d3d3d363d73" };
      if (call.method === "eth_getStorageAt" && slotOf(call) === SLOT_IMPLEMENTATION) return { result: word(IMPL.slice(2)) };
      if (call.method === "eth_getStorageAt") return { result: zeroWord() };
      return { error: { code: 3, message: "execution reverted" } };
    });
    const proxied = await evm.readEvmToken({
      networkId: "base",
      address: PROXY,
      transport: proxy.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(proxied.reading.facts.proxy.status, "ok");
    assert.equal(proxied.reading.facts.name.status, "ausente");
    assert.match(view.describeEvm(proxied.reading, "es").rows.find((row: { id: string }) => row.id === "proxy").line, /EIP-1967/);

    evm.resetEvmClientLimit();
    const eoa = scripted((call) => {
      if (call.method === "eth_getCode") return { result: "0x" };
      if (call.method === "eth_getStorageAt") return { result: zeroWord() };
      return { error: { code: 3, message: "execution reverted" } };
    });
    const account = await evm.readEvmToken({
      networkId: "base",
      address: EOA,
      transport: eoa.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(account.reading.facts.code.kind, "cuenta");
    assert.equal(account.reading.facts.code.status, "ok");
    assert.match(view.describeEvm(account.reading, "en").rows.find((row: { id: string }) => row.id === "code").line, /EOA/);
    assert.match(view.describeEvm(account.reading, "en").rows.find((row: { id: string }) => row.id === "code").line, /read/);

    evm.resetEvmClientLimit();
    let called = 0;
    const invalid = await evm.readEvmToken({
      networkId: "base",
      address: "0x123",
      transport: async () => {
        called += 1;
        return { status: 200, body: "" };
      },
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(called, 0);
    assert.equal(invalid.reason, "invalid");
    assert.equal(invalid.ok, false);
    for (const fact of Object.values(invalid.reading.facts) as { status: string }[]) {
      assert.equal(fact.status, "no_consultado");
    }
    assert.match(view.describeEvm({ ...invalid.reading, reason: invalid.reason }, "es").support, /No se ha consultado el nodo/);

    evm.resetEvmClientLimit();
    let attempts = 0;
    const down = await evm.readEvmToken({
      networkId: "base",
      address: USDC,
      transport: async () => {
        attempts += 1;
        return { status: 0, body: "" };
      },
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(down.reason, "leido");
    assert.equal(down.reading.partial, true);
    for (const fact of Object.values(down.reading.facts) as { status: string }[]) {
      assert.equal(fact.status, "fallo");
    }
    assert.ok(attempts >= 8);
    assert.match(view.describeEvm({ ...down.reading, reason: down.reason }, "es").support, /consulta fallida|no respondió/);
  });

  test("el límite es de una lectura por consulta, owner cero es ausencia y ethereum sigue apagado", async () => {
    const { evm, view, networks, market, db, model } = await load();
    evm.resetEvmClientLimit();
    const okTransport = async () => ({ status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" }) });
    let allowed = 0;
    for (let i = 0; i < 7; i += 1) {
      const result = await evm.readEvmToken({
        networkId: "base",
        address: USDC,
        transport: okTransport,
        minIntervalMs: 0,
        now: () => new Date(WHEN),
      });
      if (result.reason !== "limite") allowed += 1;
      else assert.equal(result.reason, "limite");
    }
    assert.equal(allowed, 6);

    evm.resetEvmClientLimit();
    const zeroOwner = scripted((call) => {
      if (call.method === "eth_getCode") return { result: "0x6001" };
      if (call.method === "eth_getStorageAt") return { result: zeroWord() };
      if (dataOf(call) === SELECTORS.owner) return { result: zeroWord() };
      return { error: { code: 3, message: "execution reverted" } };
    });
    const zero = await evm.readEvmToken({
      networkId: "base",
      address: NO_OWNER,
      transport: zeroOwner.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(zero.reading.facts.owner.status, "ausente");
    assert.equal(zero.reading.facts.owner.reason, "cero");

    assert.equal(networks.isEnabledNetwork("base"), true);
    assert.equal(networks.isEnabledNetwork("ethereum"), false);
    assert.equal(networks.isEnabledNetwork("bnb"), false);
    assert.equal(networks.DEFAULT_NETWORK, "solana");
    const baseChecks = networks.checksFor("base");
    assert.equal(baseChecks.available.some((item: { id: string }) => item.id === "proxy"), true);
    assert.equal(baseChecks.unavailable.some((item: { id: string }) => item.id === "mintAuthority"), true);
    const ownerHelp = baseChecks.available.find((item: { id: string }) => item.id === "owner") as { help: { es: string; en: string } };
    const proxyHelp = baseChecks.available.find((item: { id: string }) => item.id === "proxy") as { help: { es: string; en: string } };
    assert.equal(ownerHelp.help.es, "Algunos contratos responden a owner() con una dirección. Si no tienen esa función, esta lectura lo dice. Si hay una dirección owner, el contrato puede darle funciones especiales. Esta lectura no dice cuáles son.");
    assert.equal(ownerHelp.help.en, "Some contracts answer owner() with an address. If they do not have that function, this reading says so. If there is an owner address, the contract may give it special functions. This reading does not say which ones.");
    assert.equal(ownerHelp.help.es.includes("No es un permiso de Solana"), false);
    assert.equal(ownerHelp.help.en.includes("It is not a Solana permission."), false);
    assert.equal(proxyHelp.help.es, "Un proxy es un contrato que reenvía las preguntas a otro contrato. EIP-1967 es la forma habitual de anotar esa otra dirección. Si no está, esta lectura lo dice. Con un proxy, el código al que se reenvía puede cambiarse. Esta lectura no dice si ha cambiado.");
    assert.equal(proxyHelp.help.en, "A proxy is a contract that forwards questions to another contract. EIP-1967 is the usual way to record that other address. If it is not there, this reading says so. With a proxy, the code it forwards to can be changed. This reading does not say whether it has.");
    assert.equal(view.privacyText("base", "es"), "Al consultar en Base, tu navegador envía la dirección al nodo público mainnet.base.org, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
    assert.equal(view.privacyText("base", "en"), "When you look up on Base, your browser sends the address to the public node mainnet.base.org, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
    const solanaChecks = networks.checksFor("solana");
    assert.equal(solanaChecks.available.some((item: { id: string }) => item.id === "mintAuthority"), true);
    assert.equal(solanaChecks.unavailable.some((item: { id: string }) => item.id === "proxy"), true);
    assert.equal(
      market.marketUpstreamUrl(USDC, "base"),
      `https://api.dexscreener.com/token-pairs/v1/base/${USDC}`,
    );
    assert.equal(market.marketUpstreamUrl("no", "base"), "");
    assert.match(market.marketUpstreamUrl("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), /\/solana\//);
    const spaced = `${USDC.slice(0, 6)} ${USDC.slice(6)}`;
    const dropped = market.normalizeUpstream(
      200,
      JSON.stringify([{ chainId: "base", baseToken: { address: spaced, symbol: "USDC" }, quoteToken: { address: "0x4200000000000000000000000000000000000006", symbol: "WETH" }, pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", dexId: "aerodrome", liquidity: { usd: 10 }, volume: { h24: 3 } }]),
      { mint: USDC, queriedAt: WHEN, chain: "base" },
    );
    assert.equal(dropped.pairs, null);
    const pair = market.normalizeUpstream(
      200,
      JSON.stringify([{
        chainId: "base",
        baseToken: { address: USDC.toLowerCase(), symbol: "usd coin" },
        quoteToken: { address: "0x4200000000000000000000000000000000000006", symbol: "WETH" },
        pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
        dexId: "aerodrome",
        liquidity: { usd: 2500 },
        volume: { h24: 80 },
      }]),
      { mint: USDC, queriedAt: WHEN, chain: "base" },
    );
    assert.equal(pair.status, "ok");
    assert.equal(pair.chain, "base");
    const described = market.describeMarket(pair, "es");
    assert.match(described.pairs[0].title, /USDC/);
    assert.match(described.pairs[0].title, /WETH/);
    assert.equal(described.pairs[0].title.includes("Dice llamarse"), false);
    assert.equal(JSON.stringify(described).includes("priceUsd"), false);

    const migrated = db.migrateStoredRecord({
      id: "11111111-1111-4111-8111-111111111111",
      note: "",
      card: { network: "solana", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    });
    assert.equal(migrated.network, "solana");
    assert.equal(migrated.address, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    assert.equal(db.DB_VERSION, 2);
    const rollback = readFileSync(path.join(repoRoot(), "web/v2/shared/ROLLBACK.md"), "utf8");
    assert.match(rollback, /onblocked/);
    assert.match(rollback, /onversionchange/);
    assert.equal(model.validateCard({ schema: "stubx.notebook.card.evm" }).ok, false);
  });
});
