import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

// Cuentas reales capturadas de la cadena (test/fixtures/launchlab-real.json).
const fixture = JSON.parse(readFileSync(new URL("../fixtures/launchlab-real.json", import.meta.url), "utf8"));
const ORVUPI = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const shots = "test-results/artifacts/screenshots";
const byAddress = new Map(Object.values(fixture.accounts).filter(Boolean).map((row) => [row.address, row]));

async function answer(route) {
  const request = route.request().postDataJSON();
  const reply = (result) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: request.id ?? 1, result }) });
  if (request.method === "getSlot") return reply(fixture.slot);
  if (request.method === "getMultipleAccounts") {
    const value = request.params[0].map((address) => {
      const row = byAddress.get(address);
      return row ? { data: [row.data, "base64"], executable: false, lamports: 1, owner: row.owner, space: Buffer.from(row.data, "base64").length } : null;
    });
    return reply({ context: { slot: fixture.slot }, value });
  }
  if (request.method === "getTokenSupply") return reply({ context: { slot: fixture.slot }, value: { amount: "1000000000000000", decimals: 6, uiAmountString: "1000000000" } });
  if (request.method === "getTokenLargestAccounts") return reply({ context: { slot: fixture.slot }, value: [] });
  return route.fulfill({ status: 400, body: "metodo" });
}

test.beforeAll(() => mkdirSync(shots, { recursive: true }));

test("la lectura de la curva detecta Raydium LaunchLab en el mint de ORVUPI", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, answer);
  await page.goto("/pares/");
  await expect(page.locator(".lede")).toContainText("Raydium LaunchLab");
  await page.locator("#direccion-token").fill(ORVUPI);
  await page.getByRole("button", { name: "Leer" }).click();
  const out = page.locator("#resultado");
  await expect(out).toContainText("Plataforma: Raydium LaunchLab.", { timeout: 15000 });
  await expect(out).toContainText("Moneda base: SOL");
  await expect(out).toContainText("Curva: abierta");
  await expect(out).toContainText("SOL reunido en la curva: 0,49475 SOL");
  await expect(out).toContainText("Objetivo de graduación: 30 SOL");
  await expect(out).toContainText("Progreso: 1,64 %");
  await expect(out).toContainText("Estado: en curva");
  await expect(out).toContainText("8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk");
  await expect(out).not.toContainText("Cuenta Global de Pump.fun");
  await expect(page.locator("body")).not.toContainText(new RegExp(["STU", "BX"].join(""), "i"));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${shots}/curva-launchlab-${info.project.name}.png`, fullPage: true });
  await page.locator('[data-set-lang="en"]').first().click();
  await expect(out).toContainText("Platform: Raydium LaunchLab.");
  await expect(out).toContainText("Graduation target: 30 SOL.");
  await expect(out).toContainText("Progress: 1.64%.");
});

test("Verify muestra la curva de Raydium LaunchLab y no dice No aplica", async ({ page }) => {
  test.setTimeout(60000);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, answer);
  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(ORVUPI);
  await page.locator("#consulta button[type=submit]").click();
  const out = page.locator("#resultado");
  await expect(out).toContainText("Raydium LaunchLab", { timeout: 30000 });
  await expect(out).toContainText("0,49475 SOL de 30 SOL");
  await expect(out).not.toContainText("No aplica: no hay curva");
});

test("al guardar desde Verify, la ficha del Cuaderno conserva la curva de Raydium LaunchLab", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, answer);
  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(ORVUPI);
  await page.locator("#consulta button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("Raydium LaunchLab", { timeout: 30000 });
  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const card = page.locator(".consulta-guardada", { hasText: ORVUPI }).first().locator("article.ficha");
  await expect(card).toContainText("Plataforma de la curva", { timeout: 20000 });
  await expect(card).toContainText("Raydium LaunchLab");
  await expect(card).toContainText("0,49475 SOL");
  await expect(card).toContainText("1,64 %");
  await expect(card).toContainText("En curva, todavía no se ha graduado");
  await card.screenshot({ path: `${shots}/curva-launchlab-verify-a-cuaderno-${info.project.name}.png` });
});
