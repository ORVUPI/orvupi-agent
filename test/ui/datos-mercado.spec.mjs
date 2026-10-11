import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const EMPTY = "So11111111111111111111111111111111111111112";
const LIMITED = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const DOWN = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const WHEN = "2026-10-11T09:48:00.000Z";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

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

function marketModel(status, reason, pairs) {
  return {
    schema: "stubx.market.v1",
    status,
    reason,
    sourceName: "DEX Screener",
    sourceHost: "api.dexscreener.com",
    queriedAt: WHEN,
    zone: "UTC",
    pairs,
    omitted: 0,
  };
}

function okBody(mint) {
  return marketModel("ok", "leido", [
    {
      dex: "raydium",
      pairAddress: PAIR,
      base: "USDC",
      quote: "SOL",
      liquidityUsd: 50000.25,
      volumeUsd: 1200.5,
      volumeWindow: "h24",
      usdFigure: "1.0001",
    },
  ]);
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

  await page.route(/\/api\/market\?mint=/, async (route) => {
    const mint = new URL(route.request().url()).searchParams.get("mint");
    if (mint === EMPTY) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...marketModel("sin_pares", "vacio", []), mint }),
      });
    }
    if (mint === LIMITED) {
      return route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ ...marketModel("limite", "pausa-fuente", null), mint, omitted: null }),
      });
    }
    if (mint === DOWN) {
      return route.fulfill({ status: 502, contentType: "text/html", body: "<html>fallo</html>" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...okBody(mint), mint }),
    });
  });

  async function shot(name) {
    if (testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop") return;
    const block = page.locator("#resultado .datos-mercado");
    await block.scrollIntoViewIfNeeded();
    await block.screenshot({
      path: `/opt/cursor/artifacts/datos_mercado_${name}_${testInfo.project.name}.png`,
    });
  }

  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const block = page.locator("#resultado .datos-mercado");
  await expect(block).toContainText("Datos de mercado", { timeout: 20_000 });
  await expect(block).toContainText("Fuente: DEX Screener");
  await expect(block).toContainText("2026-10-11 09:48:00 UTC");
  await expect(block).toContainText("Liquidez: 50.000,25 USD");
  await expect(block).toContainText("Volumen en 24 horas: 1.200,5 USD");
  await expect(block.locator("[data-bloque='falta']")).toContainText("Qué falta");
  const advice = await block.innerText();
  expect(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(advice)).toBe(false);
  await shot("ok");

  await page.getByRole("button", { name: "English" }).click();
  await expect(block).toContainText("Market data");
  await expect(block).toContainText("Source: DEX Screener");
  await expect(block).toContainText("Queried: 2026-10-11 09:48:00 UTC");
  await page.getByRole("button", { name: "Español" }).click();

  await page.locator("#direccion-token").fill(EMPTY);
  await page.locator("#consulta button[type='submit']").click();
  await expect(block.locator("[data-falta='si']")).toContainText("no listó ningún par", { timeout: 20_000 });
  await expect(block.locator("[data-cifra='liquidez']")).toHaveCount(0);
  await expect(block).not.toContainText("0 USD");
  await shot("vacio");

  await page.locator("#direccion-token").fill(LIMITED);
  await page.locator("#consulta button[type='submit']").click();
  await expect(block.locator("[data-falta='si']")).toContainText("pidió una pausa", { timeout: 20_000 });
  await expect(block).not.toContainText("0 USD");
  await shot("pausa");

  await page.locator("#direccion-token").fill(DOWN);
  await page.locator("#consulta button[type='submit']").click();
  await expect(block.locator("[data-falta='si']")).toContainText("La consulta falló", { timeout: 20_000 });
  await expect(block).not.toContainText("0 USD");
  await shot("fallo");

  await page.goto("/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(USDC);
  await page.locator("#consultar").click();
  const live = page.locator("#resultado .datos-mercado");
  await expect(live).toContainText("Liquidez: 50.000,25 USD", { timeout: 20_000 });
  await expect(live).toContainText("Fuente: DEX Screener");
  const saved = page.locator(".consulta-guardada .datos-mercado").first();
  await expect(saved).toContainText("no se guardan en la ficha");
  await expect(saved.getByRole("button", { name: "Leer datos de mercado ahora" })).toBeVisible();
  await saved.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(saved).toContainText("Volumen en 24 horas: 1.200,5 USD");
  await expect(saved).toContainText("2026-10-11 09:48:00 UTC");
  if (testInfo.project.name === "desktop" || testInfo.project.name === "mobile") {
    await saved.scrollIntoViewIfNeeded();
    await saved.screenshot({
      path: `/opt/cursor/artifacts/datos_mercado_cuaderno_${testInfo.project.name}.png`,
    });
  }

  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
});
