import { switchLang } from "./lang.mjs";
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";
const EMPTY = SOL;
const LIMITED = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const DOWN = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const STAMP_ES = /Fuente: DEX Screener · leído el \d{2}-\d{2}-\d{4} a las \d{2}:\d{2}:\d{2} \(hora de Madrid\)/;
const STAMP_EN = /Source: DEX Screener · read \d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2} \(Madrid time\)/;
const FAIL_ES = "No se pudo leer DEX Screener. Prueba otra vez en un minuto.";

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
  mkdirSync("test-results/artifacts", { recursive: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  const external = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (host.includes("dexscreener")) external.push(request.url());
  });

  let marketCalls = 0;
  let rpcCalls = 0;
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    rpcCalls += 1;
    const body = route.request().postDataJSON();
    const method = body?.method;
    const param = body?.params?.[0];
    const asked = typeof param === "string" ? param : Array.isArray(param) ? param[0] : "";
    if (method === "getMultipleAccounts") {
      const mint = asked;
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount()),
        account(METADATA_PROGRAM, metadataAccount(mint)),
        null,
      ]));
    }
    if ((method === "getTokenSupply" || method === "getTokenLargestAccounts") && asked === LIMITED) {
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, error: { code: 403, message: "Request blocked" } }),
      });
    }
    if (method === "getTokenSupply") {
      return route.fulfill(rpcResult({ amount: "1000000", decimals: 6, uiAmountString: "1" }));
    }
    if (method === "getTokenLargestAccounts") {
      return route.fulfill(rpcResult([{ address: USDC, amount: "1000000", decimals: 6 }]));
    }
    return route.fulfill(rpcResult(1));
  });
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
    const target = `test-results/artifacts/datos_mercado_${name}_${testInfo.project.name}.png`;
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
  const nodesEs = "Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP.";
  const nodes = page.locator("#aviso-guardar .aviso-nodos .lang.es");
  await expect(nodes).toBeVisible();
  await expect(nodes).toContainText(nodesEs);
  await expect(page.locator("#aviso-guardar details")).not.toContainText(nodesEs);
  const field = page.locator("#direccion-token");
  const check = page.locator("#consulta button[type='submit']");
  const nodesBox = await nodes.boundingBox();
  const fieldBox = await field.boundingBox();
  const checkBox = await check.boundingBox();
  expect(nodesBox).toBeTruthy();
  expect(fieldBox).toBeTruthy();
  expect(checkBox).toBeTruthy();
  const besideLookup = (phrase, control) => {
    const gapX = Math.max(phrase.x, control.x) - Math.min(phrase.x + phrase.width, control.x + control.width);
    const gapY = Math.max(phrase.y, control.y) - Math.min(phrase.y + phrase.height, control.y + control.height);
    if (gapX < 0 && gapY < 0) return 0;
    if (gapX < 0) return gapY;
    if (gapY < 0) return gapX;
    return Math.hypot(gapX, gapY);
  };
  const nextToLookup = Math.min(besideLookup(nodesBox, fieldBox), besideLookup(nodesBox, checkBox));
  expect(nextToLookup).toBeGreaterThanOrEqual(0);
  const inForm = await nodes.evaluate((node) => Boolean(node.closest("form#consulta")));
  expect(inForm).toBe(true);
  const barBox = await page.locator(".consulta-barra").boundingBox();
  if (barBox) {
    const noticeBox = await page.locator("#aviso-guardar").boundingBox();
    expect(noticeBox).toBeTruthy();
    // En móvil la barra de consulta va fija abajo y el aviso va en el flujo del formulario,
    // sin quedarse fijo encima del contenido ni de la barra (se puede cerrar con la X).
    const barFixed = await page.locator(".consulta-barra").evaluate((el) => getComputedStyle(el).position === "fixed");
    if (barFixed) {
      expect(await page.locator("#aviso-guardar").evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
      await expect(page.locator("#aviso-guardar .aviso-cerrar")).toBeVisible();
    } else {
      expect(besideLookup(noticeBox, barBox)).toBeLessThan(24);
      expect(nodesBox.y).toBeGreaterThanOrEqual(barBox.y - noticeBox.height - 24);
    }
  } else {
    expect(nextToLookup).toBeLessThan(80);
  }
  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const block = page.locator("#resultado .datos-mercado");
  const readMarket = block.getByRole("button", { name: "Leer datos de mercado ahora" });
  await expect(readMarket).toBeVisible({ timeout: 20_000 });
  expect(marketCalls).toBe(0);
  const dexNotice = block.locator("[data-aviso='dex']");
  const dexBox = await dexNotice.boundingBox();
  const buttonBox = await readMarket.boundingBox();
  expect(dexBox).toBeTruthy();
  expect(buttonBox).toBeTruthy();
  const gap = buttonBox.y - (dexBox.y + dexBox.height);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(80);
  await expect(page.locator("#resultado .resumen-informe")).not.toContainText("Datos de mercado: no se pudieron leer");
  await expect(dexNotice).toContainText("DEX Screener también ve tu IP y la dirección consultada");
  await expect(dexNotice).not.toContainText("no guarda en ningún servidor");
  await expect(block.locator("details.privacidad-mercado")).toContainText("Los datos de mercado no se guardan");
  await expect(block).toContainText("Datos: DEX Screener. Pueden no ser exactos ni estar al día.");
  await readMarket.click();
  await expect(block).toContainText("Datos de mercado");
  await expect(block).toContainText(STAMP_ES);
  await expect(block).toContainText("Par: USDC / SOL");
  await expect(block).toContainText("Dónde está el par: Raydium");
  await expect(page.locator("#resultado .resumen-informe")).not.toContainText("Datos de mercado: no se pudieron leer");
  await expect(block).toContainText("Liquidez: 50.000,25 USD");
  await expect(block).toContainText("Volumen en 24 horas: 1.200,5 USD");
  await expect(block.locator("[data-hueco='falta']")).toContainText("Qué falta");
  await expect(block).not.toContainText("1,0001");
  await expect(block).not.toContainText("Una cifra en dólares");
  await block.locator("details.tecnico summary").click();
  await expect(block.locator("details.tecnico")).not.toContainText(/precio|priceUsd|usdFigure|cifra en dólares/i);
  const cifraColor = await block.locator("[data-cifra='liquidez']").evaluate((node) => getComputedStyle(node).color);
  const sectionColor = await block.evaluate((node) => getComputedStyle(node).color);
  expect(cifraColor).toBe(sectionColor);
  const advice = await block.innerText();
  expect(/\b(precio|compra|comprar|seguro|buy|sell|score|sube|baja|fomo)\b/i.test(advice)).toBe(false);
  await shot("ok");

  await switchLang(page, "en");
  await expect(page.locator("#aviso-guardar .aviso-nodos .lang.en")).toBeVisible();
  await expect(page.locator("#aviso-guardar .aviso-nodos .lang.en")).toContainText("it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP");
  await expect(block).toContainText("Market data");
  await expect(block).toContainText("Data: DEX Screener. It may be inaccurate or out of date.");
  await expect(block).toContainText(STAMP_EN);
  await switchLang(page, "es");

  await page.locator("#direccion-token").fill(EMPTY);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText("no listó ningún par", { timeout: 20_000 });
  await expect(block).toContainText(STAMP_ES);
  await expect(block).not.toContainText("intentado el");
  await expect(page.locator("#resultado .resumen-informe")).not.toContainText("Datos de mercado: no se pudieron leer");
  await expect(block.locator("[data-cifra='liquidez']")).toHaveCount(0);
  await expect(block).not.toContainText("0 USD");
  await expect(block.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await shot("vacio");

  await page.locator("#direccion-token").fill(LIMITED);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText(FAIL_ES, { timeout: 20_000 });
  await expect(block.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(block).toContainText(/intentado el \d{2}-\d{2}-\d{4} a las \d{2}:\d{2}:\d{2}/);
  await expect(block).not.toContainText("leído el");
  const falta = page.locator("#resultado .resumen-informe [data-bloque='falta']");
  const marketPoint = falta.locator("[data-mercado-falta='si']");
  await expect(marketPoint).toContainText("Datos de mercado: no se pudieron leer");
  await expect(marketPoint.getByRole("button", { name: "Reintentar" })).toBeVisible();
  const solanaRetry = falta.locator("#reintentar");
  await expect(solanaRetry).toBeVisible();
  await expect(marketPoint).not.toContainText("El servicio público no respondió");
  const apart = await falta.evaluate((box) => {
    const solana = box.querySelector("#reintentar");
    const market = box.querySelector("[data-mercado-falta='si']");
    if (!solana || !market) return false;
    const follows = Boolean(solana.compareDocumentPosition(market) & Node.DOCUMENT_POSITION_FOLLOWING);
    return follows && market.parentElement === box && !market.contains(solana) && !solana.contains(market);
  });
  expect(apart).toBe(true);
  const callsBefore = marketCalls;
  const rpcBefore = rpcCalls;
  await marketPoint.getByRole("button", { name: "Reintentar" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText(FAIL_ES, { timeout: 20_000 });
  expect(marketCalls).toBe(callsBefore + 1);
  expect(rpcCalls).toBe(rpcBefore);
  await expect(block).not.toContainText("0 USD");
  await shot("pausa");

  await page.locator("#direccion-token").fill(DOWN);
  await page.locator("#consulta button[type='submit']").click();
  await block.getByRole("button", { name: "Leer datos de mercado ahora" }).click();
  await expect(block.locator("[data-falta='si']")).toContainText(FAIL_ES, { timeout: 20_000 });
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
    const target = `test-results/artifacts/datos_mercado_cuaderno_${testInfo.project.name}.png`;
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
