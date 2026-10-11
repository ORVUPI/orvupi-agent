import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ETH = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const BNB = "0x55d398326f99059ff775485246999027b3197955";
const SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
};

function word(hex) {
  return `0x${hex.replace(/^0x/, "").padStart(64, "0")}`;
}

function encodeString(text) {
  const bytes = new TextEncoder().encode(text);
  const length = bytes.length.toString(16).padStart(64, "0");
  let data = "";
  for (const byte of bytes) data += byte.toString(16).padStart(2, "0");
  const pad = (64 - (data.length % 64)) % 64;
  return `0x${"20".padStart(64, "0")}${length}${data}${"0".repeat(pad)}`;
}

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount(supply) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  return data;
}

function metadataAccount(mint, name, symbol) {
  const mintBytes = decodeBase58(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(name),
    borsh(symbol),
    borsh(""),
    Buffer.from([0, 0, 0, 0, 0]),
  ]);
}

function account(owner, data) {
  return {
    lamports: 1,
    owner,
    executable: false,
    rentEpoch: 0,
    data: [data.toString("base64"), "base64"],
  };
}

function rpcResult(value) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: { context: { slot: 455334034 }, value } }),
  };
}

function answerFor(address, body) {
  const key = String(address || "").toLowerCase();
  const token = key === BNB
    ? { name: "Tether USD", symbol: "USDT" }
    : { name: "USD Coin", symbol: "USDC" };
  const method = body.method;
  const params = body.params || [];
  const data = params[0] && params[0].data ? params[0].data : "";
  if (method === "eth_getCode") return { result: "0x6001" };
  if (method === "eth_getStorageAt") return { result: word("0") };
  if (data === SELECTORS.name) return { result: encodeString(token.name) };
  if (data === SELECTORS.symbol) return { result: encodeString(token.symbol) };
  if (data === SELECTORS.decimals) return { result: word("06") };
  if (data === SELECTORS.totalSupply) return { result: word("1e8480") };
  if (data === SELECTORS.owner) return { error: { code: 3, message: "execution reverted" } };
  return { error: { code: 3, message: "execution reverted" } };
}

async function mockNetworks(page) {
  const calls = [];
  const evm = (host) => async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const to = body.params && body.params[0] && body.params[0].to ? body.params[0].to : body.params && body.params[0];
    calls.push({ host, to: String(to || "").toLowerCase(), method: body.method });
    const answer = answerFor(to, body);
    const payload = answer.error
      ? { jsonrpc: "2.0", id: body.id, error: answer.error }
      : { jsonrpc: "2.0", id: body.id, result: answer.result };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  };
  await page.route("https://mainnet.base.org/**", evm("mainnet.base.org"));
  await page.route("https://ethereum-rpc.publicnode.com/**", evm("ethereum-rpc.publicnode.com"));
  await page.route("https://bsc-rpc.publicnode.com/**", evm("bsc-rpc.publicnode.com"));
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    const target = Array.isArray(body?.params?.[0]) ? body.params[0][0] : body?.params?.[0];
    calls.push({ host: new URL(route.request().url()).host, to: String(target || ""), method });
    if (method === "getMultipleAccounts") {
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(2_000_000n)),
        account(METADATA_PROGRAM, metadataAccount(SOL, "USD Coin", "USDC")),
        null,
      ]));
    }
    if (method === "getTokenSupply") return route.fulfill(rpcResult({ amount: "2000000", decimals: 6, uiAmountString: "ignored" }));
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult([{ amount: "1" }]));
    return route.fulfill(rpcResult(1));
  });
  return calls;
}

async function seed(page) {
  await page.goto("/aprender/");
  await page.evaluate(async ({ BASE, ETH, BNB, SOL }) => {
    const view = await import("/shared/evm-view.js");
    const model = await import("/shared/notebook-model.js");
    const solana = await import("/shared/solana-read.js");
    const evm = (id, network, address, supply, at, name, symbol) => {
      const card = view.evmCardFromReading({
        network,
        address,
        consultedAt: at,
        partial: false,
        reason: "leido",
        facts: {
          code: { status: "ok", kind: "contrato" },
          name: { status: "ok", text: name },
          symbol: { status: "ok", text: symbol },
          decimals: { status: "ok", value: 6 },
          totalSupply: { status: "ok", raw: supply },
          owner: { status: "ausente", address: null, reason: "revert" },
          proxy: { status: "ausente", implementation: null, admin: null, beacon: null },
        },
      });
      const checked = model.validateAnyCard(card);
      if (!checked.ok) throw new Error(checked.error.es);
      return model.stampIdentity({ id, note: "", card: checked.card, source: "leida" });
    };
    const solanaCard = solana.blankCard(SOL, "2026-10-11T09:00:00.000Z", []);
    solanaCard.isMint = true;
    solanaCard.partial = false;
    solanaCard.program = "spl-token";
    solanaCard.programStatus = "verificado";
    solanaCard.decimals = 6;
    solanaCard.supplyAccount = "2000000";
    solanaCard.supplyRpc = "2000000";
    solanaCard.supplyRpcStatus = "verificado";
    solanaCard.slot = 4;
    solanaCard.slotStatus = "verificado";
    solanaCard.mintAuthority = { state: "revocada", address: null, status: "verificado" };
    solanaCard.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
    solanaCard.name = { text: "USD Coin", status: "verificado" };
    solanaCard.symbol = { text: "USDC", status: "verificado" };
    solanaCard.uri = { text: null, status: "ausente" };
    solanaCard.metadataMutable = "no";
    solanaCard.largestStatus = "ok";
    solanaCard.extensionsStatus = "no_aplica";
    solanaCard.curve = {
      present: false,
      status: "no_aplica",
      virtualToken: null,
      virtualQuote: null,
      realToken: null,
      realQuote: null,
      complete: null,
    };
    const checkedSolana = model.validateCard(solanaCard);
    if (!checkedSolana.ok) throw new Error(checkedSolana.error.es);
    const records = [
      evm("11111111-1111-4111-8111-111111111111", "base", BASE, "1000000", "2026-10-11T08:00:00.000Z", "USD Coin", "USDC"),
      evm("22222222-2222-4222-8222-222222222222", "base", BASE, "2000000", "2026-10-11T12:00:00.000Z", "USD Coin", "USDC"),
      evm("33333333-3333-4333-8333-333333333333", "ethereum", ETH, "2000000", "2026-10-11T11:00:00.000Z", "USD Coin", "USDC"),
      evm("44444444-4444-4444-8444-444444444444", "bnb", BNB, "2000000", "2026-10-11T10:00:00.000Z", "Tether USD", "USDT"),
      model.stampIdentity({
        id: "55555555-5555-4555-8555-555555555555",
        note: "",
        card: checkedSolana.card,
        source: "leida",
      }),
    ];
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("stubx-cuaderno");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("stubx-cuaderno", 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("records", "readwrite");
        for (const record of records) tx.objectStore("records").put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, { BASE, ETH, BNB, SOL });
}

async function shot(page, locator, name) {
  const project = test.info().project.name;
  if (project !== "mobile" && project !== "desktop") return;
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  await locator.screenshot({ path: `/opt/cursor/artifacts/${name}-${project}.png` });
}

test("la pasada, la comparación y el informe usan la red de cada ficha", async ({ page }) => {
  test.setTimeout(180_000);
  const calls = await mockNetworks(page);
  await seed(page);
  await page.goto("/cuaderno/");
  await expect(page.locator("h2", { hasText: "Comparar consultas de la misma red y dirección" })).toBeVisible();
  const notice = page.locator("#aviso-pasada .lang.es");
  await expect(notice).toContainText("solana-rpc.publicnode.com");
  await expect(notice).toContainText("api.mainnet-beta.solana.com");
  await expect(notice).toContainText("Al consultar en Base, tu navegador envía la dirección al nodo público mainnet.base.org, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
  await expect(notice).toContainText("Al consultar en Ethereum, tu navegador envía la dirección al nodo público ethereum-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
  await expect(notice).toContainText("Al consultar en BNB Chain, tu navegador envía la dirección al nodo público bsc-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.");
  await shot(page, page.locator("#aviso-pasada"), "cuaderno-aviso-es");
  await page.locator("#seguir").click();
  const results = page.locator("#resultado-seguimiento > article.seguimiento-estado");
  await expect(results).toHaveCount(4, { timeout: 90_000 });
  await expect(results.filter({ hasText: BASE })).toContainText("Red: Base");
  await expect(results.filter({ hasText: ETH })).toContainText("Red: Ethereum");
  await expect(results.filter({ hasText: BNB })).toContainText("Red: BNB Chain");
  await expect(results.filter({ hasText: SOL })).toContainText("Red: Solana");
  const hostsFor = (address) => new Set(calls.filter((item) => item.to === address).map((item) => item.host));
  expect(hostsFor(BASE)).toEqual(new Set(["mainnet.base.org"]));
  expect(hostsFor(ETH)).toEqual(new Set(["ethereum-rpc.publicnode.com"]));
  expect(hostsFor(BNB)).toEqual(new Set(["bsc-rpc.publicnode.com"]));
  expect([...hostsFor(SOL)].some((host) => host.includes("solana"))).toBe(true);
  expect(calls.some((item) => item.host === "mainnet.base.org" && item.to === ETH)).toBe(false);
  expect(calls.some((item) => item.host === "ethereum-rpc.publicnode.com" && item.to === BASE)).toBe(false);
  await page.locator("#comparar").click();
  const compared = page.locator("#comparacion");
  await expect(compared.locator("[data-red='base']")).toHaveText("Red: Base");
  await expect(compared).toContainText("cambió");
  await expect(compared).not.toContainText("Solo se comparan dos consultas de la misma red y dirección.");
  await shot(page, page.locator("h2", { hasText: "Comparar consultas de la misma red y dirección" }), "cuaderno-titulo-comparar-es");
  await shot(page, compared, "cuaderno-comparacion-es");
  const report = page.locator(".informe-red", { hasText: "Base mainnet" }).first();
  await expect(report).toHaveText("Red: Base mainnet");
  await expect(page.locator(".informe-red", { hasText: "Ethereum mainnet" }).first()).toHaveText("Red: Ethereum mainnet");
  await expect(page.locator(".informe-red", { hasText: "BNB Chain mainnet" }).first()).toHaveText("Red: BNB Chain mainnet");
  await expect(page.locator(".informe-red", { hasText: "Solana mainnet" }).first()).toHaveText("Red: Solana mainnet");
  await shot(page, report, "cuaderno-informe-es");
  await page.evaluate(() => {
    const right = document.getElementById("comparar-derecha");
    const option = document.createElement("option");
    option.value = "33333333-3333-4333-8333-333333333333";
    option.textContent = "ethereum";
    right.append(option);
    document.getElementById("comparar-izquierda").value = "22222222-2222-4222-8222-222222222222";
    right.value = "33333333-3333-4333-8333-333333333333";
  });
  await page.locator("#comparar").click();
  await expect(page.locator("#comparacion")).toHaveText("Solo se comparan dos consultas de la misma red y dirección.");
  await page.locator('[data-set-lang="en"]').click();
  await expect(page.locator("#aviso-pasada .lang.en")).toContainText("When you look up on Base, your browser sends the address to the public node mainnet.base.org, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
  await expect(page.locator("#aviso-pasada .lang.en")).toContainText("When you look up on Ethereum, your browser sends the address to the public node ethereum-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
  await expect(page.locator("#aviso-pasada .lang.en")).toContainText("When you look up on BNB Chain, your browser sends the address to the public node bsc-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
  await expect(page.locator("#aviso-pasada .lang.en")).toContainText("solana-rpc.publicnode.com");
  await shot(page, page.locator("#aviso-pasada"), "cuaderno-aviso-en");
  await page.locator("#comparar-izquierda").selectOption("22222222-2222-4222-8222-222222222222");
  await page.locator("#comparar").click();
  await expect(page.locator("#comparacion [data-red='base']")).toHaveText("Network: Base");
  await shot(page, page.locator("h2", { hasText: "Compare queries of the same network and address" }), "cuaderno-titulo-comparar-en");
  await shot(page, page.locator("#comparacion"), "cuaderno-comparacion-en");
  await expect(page.locator(".informe-red", { hasText: "Base mainnet" }).first()).toHaveText("Network: Base mainnet");
  await shot(page, page.locator(".informe-red", { hasText: "Base mainnet" }).first(), "cuaderno-informe-en");
  const baseRow = page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: BASE });
  await baseRow.locator("input").check();
  await expect(page.locator("#aviso-pasada .lang.en")).toHaveText("When you look up on Base, your browser sends the address to the public node mainnet.base.org, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.");
  await expect(page.locator("#aviso-pasada .lang.en")).not.toContainText("ethereum-rpc.publicnode.com");
  await expect(page.locator("#aviso-pasada .lang.en")).not.toContainText("bsc-rpc.publicnode.com");
  await expect(page.locator("#aviso-pasada .lang.en")).not.toContainText("solana-rpc.publicnode.com");
});
