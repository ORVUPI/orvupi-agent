import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const FAIL = "So11111111111111111111111111111111111111112";
const SUPPLY = 7721704579000000n;
const CLONE_SUPPLY = 1_000_000_000_000_000n;
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount(supply, mintActive, freezeActive) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  if (mintActive) {
    data.writeUInt32LE(1, 0);
    data.fill(7, 4, 36);
  }
  if (freezeActive) {
    data.writeUInt32LE(1, 46);
    data.fill(8, 50, 82);
  }
  return data;
}

function metadataAccount(mint, name, symbol) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(name),
    borsh(symbol),
    borsh(""),
    Buffer.from([0, 0, 0, 0, 1]),
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

function rpcResult(value, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status === 200
        ? { jsonrpc: "2.0", id: 1, result: { context: { slot: 455334034 }, value } }
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: "no" } },
    ),
  };
}

async function bytesOf(download) {
  const file = await download.path();
  return readFileSync(file);
}

test("el informe se descarga en Verify y en el Cuaderno", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  let failReads = false;
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      const name = mint === CLONE ? "ORVUPI" : mint === FAIL ? "OTRO" : "USD Coin";
      const symbol = mint === CLONE ? "ORVUPI" : mint === FAIL ? "OTRO" : "USDC";
      const active = mint === USDC;
      const supply = mint === CLONE ? CLONE_SUPPLY : SUPPLY;
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(supply, active, active)),
        account(METADATA_PROGRAM, metadataAccount(mint, name, symbol)),
        null,
      ]));
    }
    if (method === "getTokenSupply" || method === "getTokenLargestAccounts") {
      const mint = body?.params?.[0];
      if (mint === FAIL && failReads) return route.fulfill(rpcResult(null, 500));
      if (method === "getTokenSupply") {
        const amount = mint === CLONE ? CLONE_SUPPLY : SUPPLY;
        return route.fulfill(rpcResult({ amount: amount.toString(), decimals: 6, uiAmountString: "skip" }));
      }
      return route.fulfill(rpcResult([{ address: USDC, amount: "1000000", decimals: 6 }]));
    }
    return route.fulfill(rpcResult(1));
  });

  await page.goto("/verify/");
  const escaped = await page.evaluate(async () => {
    const mod = await import("/shared/informe.js");
    return mod.canvasSafeText("a<b>\u0000");
  });
  expect(escaped).toBe("a<b>");

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const report = page.locator("#resultado .informe-descarga");
  await expect(report).toContainText("Informe descargable", { timeout: 20_000 });
  await expect(report).toContainText("no se envía a ningún servidor");
  const pngButton = report.getByRole("button", { name: "Descargar PNG" });
  const pdfButton = report.getByRole("button", { name: "Descargar PDF" });
  await expect(pngButton).toBeVisible();
  await expect(pdfButton).toBeVisible();
  const pngBox = await pngButton.boundingBox();
  const pdfBox = await pdfButton.boundingBox();
  expect(pngBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(pdfBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  if (testInfo.project.name === "mobile" || testInfo.project.name === "mobile-webkit") {
    const parent = await pngButton.evaluate((node) => node.parentElement.getBoundingClientRect().width);
    expect(pngBox.width).toBeGreaterThan(parent * 0.9);
    expect(pdfBox.width).toBeGreaterThan(parent * 0.9);
  }

  const [png] = await Promise.all([
    page.waitForEvent("download"),
    pngButton.click(),
  ]);
  expect(png.suggestedFilename()).toBe("informe.png");
  const pngBytes = await bytesOf(png);
  expect(pngBytes.subarray(0, 8)).toEqual(PNG);
  expect(pngBytes.length).toBeGreaterThan(800);
  await expect(report.locator(".informe-estado")).toContainText("Archivo listo");

  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    pdfButton.click(),
  ]);
  expect(pdf.suggestedFilename()).toBe("informe.pdf");
  const pdfBytes = await bytesOf(pdf);
  expect(pdfBytes.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  expect(pdfBytes.includes(Buffer.from("/Subtype /Image"))).toBe(true);

  await page.locator('[data-set-lang="en"]').first().click();
  await expect(report).toContainText("Downloadable report");
  await expect(report.getByRole("button", { name: "Download PNG" })).toBeVisible();
  await expect(report.getByRole("button", { name: "Download PDF" })).toBeVisible();
  await expect(report).toContainText("not sent to any server");
  await page.locator('[data-set-lang="es"]').first().click();
  await expect(report).toContainText("Informe descargable");

  await page.locator("#direccion-token").fill(CLONE);
  await page.locator("#consulta button[type='submit']").click();
  const summary = page.locator("#resultado .resumen-informe");
  await expect(summary).toContainText("Dice llamarse «ORVUPI»", { timeout: 20_000 });
  await expect(summary).toContainText("Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato");
  await expect(summary).not.toContainText("1.000.000.000 ORVUPI");
  await expect(summary.locator(".informe-descarga")).toContainText("Informe descargable");

  failReads = true;
  await page.locator("#direccion-token").fill(FAIL);
  await page.locator("#consulta button[type='submit']").click();
  await expect(summary.locator("[data-bloque='falta']")).toContainText("No se pudo hacer la segunda comprobación del suministro", { timeout: 20_000 });
  await expect(summary.locator("[data-bloque='comprobado']")).not.toContainText("No se pudo hacer la segunda comprobación del suministro");
  await expect(summary.locator(".informe-descarga")).toBeVisible();

  failReads = false;
  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  await expect(summary).toContainText("Dice llamarse «USD Coin»", { timeout: 20_000 });
  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const saved = page.locator(".consulta-guardada", { hasText: USDC }).first();
  const savedReport = saved.locator(".informe-descarga");
  await expect(savedReport).toContainText("Informe descargable", { timeout: 20_000 });
  await expect(saved.locator(".resumen-informe")).toContainText("Qué se comprobó");
  await expect(saved.locator(".resumen-informe")).toContainText("Dice llamarse «USD Coin»");
  const [savedPng] = await Promise.all([
    page.waitForEvent("download"),
    savedReport.getByRole("button", { name: "Descargar PNG" }).click(),
  ]);
  expect(savedPng.suggestedFilename()).toBe("informe.png");
  const savedBytes = await bytesOf(savedPng);
  expect(savedBytes.subarray(0, 8)).toEqual(PNG);
  expect(pageErrors).toEqual([]);
});
