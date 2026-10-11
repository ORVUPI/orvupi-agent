import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BAD_USDC = "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BAD_USDT = "0x55D398326f99059fF775485246999027B3197955";
const WHEN = "2026-10-11T18:00:00.000Z";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
};

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

async function load() {
  const root = repoRoot();
  const evm = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-read.js")).href);
  const view = await import(pathToFileURL(path.join(root, "web/v2/shared/evm-view.js")).href);
  const model = await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href);
  const networks = await import(pathToFileURL(path.join(root, "web/v2/shared/networks.js")).href);
  const market = await import(pathToFileURL(path.join(root, "web/v2/shared/market-read.js")).href);
  return { evm, view, model, networks, market };
}

function tokenTransport(name: string, symbol: string, decimals: string) {
  const endpoints: string[] = [];
  const transport = async (endpoint: string, body: string) => {
    endpoints.push(endpoint);
    const parsed = JSON.parse(body) as { method: string; params: unknown[] };
    if (parsed.method === "eth_getCode") return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x6001" }) };
    if (parsed.method === "eth_getStorageAt") return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: zeroWord() }) };
    const first = parsed.params[0] as { data?: string } | undefined;
    const data = first && first.data ? first.data : "";
    let result = "0x";
    if (data === SELECTORS.name) result = encodeString(name);
    if (data === SELECTORS.symbol) result = encodeString(symbol);
    if (data === SELECTORS.decimals) result = word(decimals);
    if (data === SELECTORS.totalSupply) result = word("01");
    if (data === SELECTORS.owner) {
      return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: 3, message: "execution reverted" } }) };
    }
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result }) };
  };
  return { transport, endpoints };
}

describe("Ethereum y BNB Chain reutilizan el lector EVM", () => {
  test("están encendidas, con RPC público, aviso, entradilla y DEX Screener", async () => {
    const { view, networks, market } = await load();
    assert.deepEqual(networks.enabledNetworks().map((item: { id: string }) => item.id), ["solana", "base", "ethereum", "bnb"]);
    assert.equal(networks.rpcHost("ethereum"), "ethereum-rpc.publicnode.com");
    assert.equal(networks.rpcHost("bnb"), "bsc-rpc.publicnode.com");
    assert.equal(networks.knownQuote("ethereum", USDC), "USDC");
    assert.equal(networks.knownQuote("ethereum", WETH), "WETH");
    assert.equal(networks.knownQuote("bnb", USDT), "USDT");
    assert.equal(networks.knownQuote("bnb", WBNB), "WBNB");
    assert.equal(networks.knownQuote("ethereum", USDT), "");
    assert.equal(networks.knownQuote("bnb", USDC), "");

    assert.equal(view.privacyText("ethereum", "es"), "Al consultar en Ethereum, tu navegador envía la dirección al nodo público ethereum-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
    assert.equal(view.privacyText("ethereum", "en"), "When you look up on Ethereum, your browser sends the address to the public node ethereum-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
    assert.equal(view.privacyText("bnb", "es"), "Al consultar en BNB Chain, tu navegador envía la dirección al nodo público bsc-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
    assert.equal(view.privacyText("bnb", "en"), "When you look up on BNB Chain, your browser sends the address to the public node bsc-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
    assert.equal(view.privacyText("solana", "es"), "");

    assert.equal(view.pageLede("ethereum", "es"), "Cualquier token ERC-20 (el tipo de token habitual en Ethereum), leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados de Solana, no una lista completa. Elige la red. En Ethereum no se conecta ninguna cartera ni se firma nada.");
    assert.equal(view.pageLede("ethereum", "en"), "Any ERC-20 token (the usual token type on Ethereum), read live and read-only. The cards below are dated Solana examples, not a complete list. Choose the network. On Ethereum, no wallet is connected and nothing is signed.");
    assert.equal(view.pageLede("bnb", "es"), "Cualquier token BEP-20 (el tipo de token habitual en BNB Chain), leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados de Solana, no una lista completa. Elige la red. En BNB Chain no se conecta ninguna cartera ni se firma nada.");
    assert.equal(view.pageLede("bnb", "en"), "Any BEP-20 token (the usual token type on BNB Chain), read live and read-only. The cards below are dated Solana examples, not a complete list. Choose the network. On BNB Chain, no wallet is connected and nothing is signed.");
    assert.equal(view.pageLede("ethereum", "es").includes("BEP-20"), false);
    assert.equal(view.pageLede("bnb", "es").includes("ERC-20"), false);
    assert.equal((view.pageLede("ethereum", "es").match(/solo(?: en)? lectura/g) || []).length, 1);
    assert.equal((view.pageLede("bnb", "en").match(/read-only/g) || []).length, 1);

    assert.equal(market.marketUpstreamUrl(USDC, "ethereum"), `https://api.dexscreener.com/token-pairs/v1/ethereum/${USDC}`);
    assert.equal(market.marketUpstreamUrl(USDT, "bnb"), `https://api.dexscreener.com/token-pairs/v1/bsc/${USDT}`);
    const ethPair = market.normalizeUpstream(
      200,
      JSON.stringify([{
        chainId: "ethereum",
        baseToken: { address: USDC.toLowerCase(), symbol: "usd" },
        quoteToken: { address: WETH.toLowerCase(), symbol: "NOTWETH" },
        pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
        dexId: "uniswap",
        liquidity: { usd: 2500 },
        volume: { h24: 80 },
      }]),
      { mint: USDC, queriedAt: WHEN, chain: "ethereum" },
    );
    assert.equal(ethPair.status, "ok");
    assert.equal(ethPair.chain, "ethereum");
    const ethTitle = market.describeMarket(ethPair, "es").pairs[0].title;
    assert.match(ethTitle, /USDC/);
    assert.match(ethTitle, /WETH/);
    assert.equal(ethTitle.includes("NOTWETH"), false);
    const wrongChain = market.normalizeUpstream(
      200,
      JSON.stringify([{
        chainId: "base",
        baseToken: { address: USDC.toLowerCase(), symbol: "USDC" },
        quoteToken: { address: WETH.toLowerCase(), symbol: "WETH" },
        pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
        dexId: "uniswap",
        liquidity: { usd: 2500 },
        volume: { h24: 80 },
      }]),
      { mint: USDC, queriedAt: WHEN, chain: "ethereum" },
    );
    assert.equal(wrongChain.pairs, null);
    const bnbPair = market.normalizeUpstream(
      200,
      JSON.stringify([{
        chainId: "bsc",
        baseToken: { address: USDT.toLowerCase(), symbol: "usd" },
        quoteToken: { address: WBNB.toLowerCase(), symbol: "NOTWBNB" },
        pairAddress: "0xdefdefdefdefdefdefdefdefdefdefdefdefdefd",
        dexId: "pancakeswap",
        liquidity: { usd: 2500 },
        volume: { h24: 80 },
      }]),
      { mint: USDT, queriedAt: WHEN, chain: "bnb" },
    );
    assert.equal(bnbPair.status, "ok");
    const bnbTitle = market.describeMarket(bnbPair, "es").pairs[0].title;
    assert.match(bnbTitle, /USDT/);
    assert.match(bnbTitle, /WBNB/);
    assert.equal(bnbTitle.includes("NOTWBNB"), false);
  });

  test("USDC de Ethereum y USDT de BNB se leen en su nodo y el cuaderno separa red y dirección", async () => {
    const { evm, view, model } = await load();
    evm.resetEvmClientLimit();
    const eth = tokenTransport("USD Coin", "USDC", "06");
    const readEth = await evm.readEvmToken({
      networkId: "ethereum",
      address: USDC,
      transport: eth.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(readEth.ok, true);
    assert.equal(readEth.reading.network, "ethereum");
    assert.equal(readEth.reading.address, USDC.toLowerCase());
    assert.equal(readEth.reading.rpcHost, "ethereum-rpc.publicnode.com");
    assert.equal(readEth.reading.facts.name.text, "USD Coin");
    assert.equal(eth.endpoints[0], "https://ethereum-rpc.publicnode.com");
    assert.match(view.describeEvm(readEth.reading, "es").node, /ethereum-rpc\.publicnode\.com/);

    evm.resetEvmClientLimit();
    const bnb = tokenTransport("Tether USD", "USDT", "12");
    const readBnb = await evm.readEvmToken({
      networkId: "bnb",
      address: USDT,
      transport: bnb.transport,
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(readBnb.ok, true);
    assert.equal(readBnb.reading.network, "bnb");
    assert.equal(readBnb.reading.address, USDT.toLowerCase());
    assert.equal(readBnb.reading.rpcHost, "bsc-rpc.publicnode.com");
    assert.equal(readBnb.reading.facts.symbol.text, "USDT");
    assert.equal(bnb.endpoints[0], "https://bsc-rpc.publicnode.com");

    assert.equal(evm.normalizeEvmAddress(USDC), USDC.toLowerCase());
    assert.equal(evm.normalizeEvmAddress(WETH), WETH.toLowerCase());
    assert.equal(evm.normalizeEvmAddress(USDT), USDT.toLowerCase());
    assert.equal(evm.normalizeEvmAddress(WBNB), WBNB.toLowerCase());
    assert.equal(evm.normalizeEvmAddress(BAD_USDC), "");
    assert.equal(evm.normalizeEvmAddress(BAD_USDT), "");
    let calls = 0;
    const rejected = await evm.readEvmToken({
      networkId: "ethereum",
      address: BAD_USDC,
      transport: async () => {
        calls += 1;
        return { status: 200, body: "" };
      },
      minIntervalMs: 0,
      now: () => new Date(WHEN),
    });
    assert.equal(calls, 0);
    assert.equal(rejected.reason, "checksum");

    const ethCard = model.stampIdentity({
      id: "33333333-3333-4333-8333-333333333333",
      note: "",
      card: view.evmCardFromReading(readEth.reading),
    });
    const bnbCard = model.stampIdentity({
      id: "44444444-4444-4444-8444-444444444444",
      note: "",
      card: view.evmCardFromReading(readBnb.reading),
    });
    assert.equal(ethCard.network, "ethereum");
    assert.equal(ethCard.address, USDC.toLowerCase());
    assert.equal(bnbCard.network, "bnb");
    assert.equal(bnbCard.address, USDT.toLowerCase());
    const watched = model.watchTargets([ethCard, bnbCard]).map((item: { key: string }) => item.key);
    assert.equal(watched.includes(`ethereum\n${USDC.toLowerCase()}`), true);
    assert.equal(watched.includes(`bnb\n${USDT.toLowerCase()}`), true);
    assert.equal(new Set(watched).size, 2);
  });
});
