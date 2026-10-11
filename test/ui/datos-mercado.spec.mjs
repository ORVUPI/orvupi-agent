import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";
const EMPTY = SOL;
const LIMITED = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const DOWN = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const STAMP_ES = /Fuente: DEX Screener · leído el \d{2}-\d{2}-\d{4} a las \d{2}:\d{2} \(hora de Madrid\)/;
const STAMP_EN = /Source: DEX Screener · read \d{2}-\d{2}-\d{4} \d{2}:\d{2} \(Madrid time\)/;

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount() {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(1_000_000n, 36);
  data[44] = 6;
  data[45] = 1;
  return data;
}

function metadataAccount(mint) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh("USD Coin"),
    borsh("USDC"),
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
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: { context: { slot: 1 }, value } }),
  };
}

function rawPair(mint) {
  return {
    chainId: "solana",
    dexId: "raydium",
    pairAddress: PAIR,
    baseToken: { symbol: "USDC", address: mint },
    quoteToken: { symbol: "SOL", address: SOL },
    priceUsd: "1.0001",
    liquidity: { usd: 50000.25 },
    volume: { h24: 1200.5 },
  };
}

test("datos de mercado en Verify y en el cuaderno", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  const external = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (host.includes("dexscreener")) external.push(request.url());
  });

  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount()),
        account(METADATA_PROGRAM, metadataAccount(mint)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      return route.fulfill(rpcResult({ amount: "1000000", decimals: 6, uiAmountString: "1" }));
    }
    if (method === "getTokenLargestAccounts") {
      return route.fulfill(rpcResult([{ address: USDC, amount: "1000000", decimals: 6 }]));
    }
    return route.fulfill(rpcResult(1));
  });

  let marketCalls = 0;
  await page.route(/api\.dexscreener\.com\/token-pairs\/v1\/solana\//, async (route) => {
    marketCalls += 1;
    const url = new URL(route.request().url());
    expect(url.search).toBe("");
    expect(url.origin).toBe("https://api.dexscreener.com");
    const mint = decodeURIComponent(url.pathname.slice("/token-pairs/v1/solana/".length));
    if (mint === EMPTY) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (mint === LIMITED) {
      return route.fulfill({ status: 429, contentType: "application/json", body: "[]" });
    }
    if (mint === DOWN) {
      return route.fulfill({ status: 502, contentType: "text/html", body: "<html>fallo</html>" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([rawPair(mint)]),
    });
  });

  async function shot(name) {
    if (testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop") return;
    const block = page.locator("#resultado .datos-mercado");
    await block.scrollIntoViewIfNeeded();
    const target = `/opt/cursor/artifacts/datos_mercado_${name}_${testInfo.project.name}.png`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await block.screenshot({ path: target });
        return;
      } catch (error) {
        if (attempt === 2 || !String(error).includes("EAGAIN")) throw error;
        await page.waitForTimeout(300);
      }
    }
  }

  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const block = page.locator("#resultado .datos-mercado");
  const readMarket = block.getByRole("button", { name: "Leer datos de mercado ahora" });
  await expect(readMarket).toBeVisible({ timeout: 20_000 });
  expect(marketCalls).toBe(0);
  await expect(block).toContainText("Datos: DEX Screener. Pueden no ser exactos ni estar al día.");
  await readMarket.click();
  await expect(block).toContainText("Datos de mercado");
  await expect(block).toContainText(STAMP_ES);
  await expect(block).toContainText("Liquidez: 50.000,25 USD");
  await expect(block).toContainText("Volumen en 24 horas: 1.200,5 USD");
  await expect(block.locator("[data-hueco='falta']")).toContainText("Qué falta");
  await expect(block).not.toContainText("1,0001");
  await expect(block).not.toContainText("Una cifra en dólares");
  await block.locator("summary").click();
  await expect(block.locator("details")).not.toContainText(/precio|priceUsd|usdFigure|cifra en dólares/i);
  const cifraColor = await block.locator("[data-cifra='liquidez']").evaluate((node) => getComputedStyle(node).color);
  const sectionColor = await block.evaluate((node) => getComputedStyle(node).color);
  expect(cifraColor).toBe(sectionColor);
  const advice = await block.innerText();
  expect(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(advice)).toBe(false);
  await shot("ok");

  await page.getByRole("button", { name: "English" }).click();
  await expect(block).toContainText("Market data");
  await expect(block).toContainText("Data: DEX Screener. It may be inaccurate or out of date.");
  await expect(block).toContainText(STAMP_EN);
  await page.getByRole("button", { name: "Español" }).click();

  await page.locator("#direccion-token").fill(EMPTY);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText("no listó ningún par", { timeout: 20_000 });
  await expect(block.locator("[data-cifra='liquidez']")).toHaveCount(0);
  await expect(block).not.toContainText("0 USD");
  await expect(block.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await shot("vacio");

  await page.locator("#direccion-token").fill(LIMITED);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText("No se pudo consultar", { timeout: 20_000 });
  await expect(block.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(block).not.toContainText("0 USD");
  await shot("pausa");

  await page.locator("#direccion-token").fill(DOWN);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText("No se pudo consultar", { timeout: 20_000 });
  await expect(block.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(block).not.toContainText("0 USD");
  await shot("fallo");

  await page.goto("/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(USDC);
  await page.locator("#consultar").click();
  const live = page.locator("#resultado .datos-mercado");
  await expect(live.getByRole("button", { name: "Leer datos de mercado ahora" })).toBeVisible({ timeout: 20_000 });
  await live.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(live).toContainText("Liquidez: 50.000,25 USD", { timeout: 20_000 });
  await expect(live).toContainText(STAMP_ES);
  await expect(live).toContainText("Datos: DEX Screener. Pueden no ser exactos ni estar al día.");
  const saved = page.locator(".consulta-guardada .datos-mercado").first();
  await expect(saved).toContainText("no se guardan en la ficha");
  await expect(saved.getByRole("button", { name: "Leer datos de mercado ahora" })).toBeVisible();
  await saved.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(saved).toContainText("Volumen en 24 horas: 1.200,5 USD");
  await expect(saved).toContainText(STAMP_ES);
  await expect(saved).not.toContainText("1,0001");
  if (testInfo.project.name === "desktop" || testInfo.project.name === "mobile") {
    await saved.scrollIntoViewIfNeeded();
    const target = `/opt/cursor/artifacts/datos_mercado_cuaderno_${testInfo.project.name}.png`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await saved.screenshot({ path: target });
        break;
      } catch (error) {
        if (attempt === 2 || !String(error).includes("EAGAIN")) throw error;
        await page.waitForTimeout(300);
      }
    }
  }

  expect(external.length).toBeGreaterThan(0);
  expect(external.every((url) => url.startsWith("https://api.dexscreener.com/token-pairs/v1/solana/"))).toBe(true);
  expect(pageErrors).toEqual([]);
});
