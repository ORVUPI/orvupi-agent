import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/launchlab-real.json", import.meta.url), "utf8"));
const ORVUPI = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const shots = "test-results/artifacts/screenshots";
const byAddress = new Map(Object.values(fixture.accounts).filter(Boolean).map((row) => [row.address, row]));

async function answer(route) {
  const request = route.request().postDataJSON();
  const reply = (result) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: request.id ?? 1, result }) });
  if (request.method === "getSlot") return reply(fixture.slot);
  if (request.method === "getMultipleAccounts") {
    return reply({ context: { slot: fixture.slot }, value: request.params[0].map((address) => {
      const row = byAddress.get(address);
      return row ? { data: [row.data, "base64"], executable: false, lamports: 1, owner: row.owner, space: 0 } : null;
    }) });
  }
  if (request.method === "getTokenSupply") return reply({ context: { slot: fixture.slot }, value: { amount: "1000000000000000", decimals: 6 } });
  if (request.method === "getTokenLargestAccounts") return reply({ context: { slot: fixture.slot }, value: [{ address: ORVUPI, amount: "1", decimals: 6 }] });
  return route.fulfill({ status: 400, body: "metodo" });
}

test.beforeAll(() => mkdirSync(shots, { recursive: true }));

test("el cuaderno lee la curva de Raydium LaunchLab y su estado de graduación", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, answer);
  await page.goto("/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(ORVUPI);
  await page.locator("#consultar").click();
  const out = page.locator("#resultado");
  await expect(out).toContainText("Raydium LaunchLab", { timeout: 20000 });
  await expect(out).toContainText("8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk");
  await expect(out).toContainText("0,49475 SOL");
  await expect(out).toContainText("30 SOL");
  await expect(out).toContainText("1,64 %");
  await expect(out).toContainText("En curva, todavía no se ha graduado");
  await expect(page.locator("body")).not.toContainText(new RegExp(["STU", "BX"].join(""), "i"));
  await page.screenshot({ path: `${shots}/curva-launchlab-cuaderno-${info.project.name}.png`, fullPage: true });
});
