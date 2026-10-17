import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  METADATA_PROGRAM,
  PUMP_PROGRAM,
  TOKEN_PROGRAM,
  bytesToBase64,
  encodeCurveAccount,
  encodeGlobalAccount,
  encodeMetadataAccount,
  encodeMintAccount,
} from "../../pares/chain-read.mjs";

const shots = "test-results/artifacts/screenshots";
const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";
const MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const NAME = "<script>alert(1)</script>";

function accounts() {
  const rows = [
    { owner: TOKEN_PROGRAM, data: encodeMintAccount(1000000000000000n, 6) },
    {
      owner: PUMP_PROGRAM,
      data: encodeCurveAccount({
        virtualToken: 1059122445097276n,
        virtualQuote: 30393086421n,
        realToken: 779222445097276n,
        realQuote: 393086421n,
        supply: 1000000000000000n,
        complete: false,
      }),
    },
    { owner: METADATA_PROGRAM, data: encodeMetadataAccount(MINT, NAME, "X", "https://evil.example/meta.json") },
    { owner: PUMP_PROGRAM, data: encodeGlobalAccount(95n, 5n) },
  ];
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      context: { slot: 454936125 },
      value: rows.map((row) =>
        row
          ? { data: [bytesToBase64(row.data), "base64"], executable: false, lamports: 1, owner: row.owner, space: row.data.length }
          : null,
      ),
    },
  };
}

async function answer(route, status) {
  const request = route.request().postDataJSON();
  if (status !== 200) {
    await route.fulfill({ status, body: "no", contentType: "text/plain" });
    return;
  }
  if (request.method === "getSlot") {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: 454936125 }) });
    return;
  }
  if (request.method !== "getMultipleAccounts") {
    await route.fulfill({ status: 400, body: "metodo" });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(accounts()) });
}

test.beforeAll(() => {
  mkdirSync(shots, { recursive: true });
});

test("el informe lee un paso y cambia de idioma", async ({ page }, info) => {
  test.setTimeout(60000);
  const project = info.project.name;
  const seen = [];
  page.on("dialog", () => {
    throw new Error("un texto de metadatos no debe ejecutarse");
  });
  page.on("request", (request) => {
    seen.push(request.url());
  });
  await page.goto("/");
  await page.locator('main a.or-button[href="/pares/"]').click();
  await expect(page).toHaveURL(/\/pares\/?$/);
  await expect(page.locator("h1")).toContainText("Lectura de la curva");
  await expect(page.locator("main")).toContainText(
    "Lectura de datos públicos. No es una comparación de calidad, ni una recomendación, ni un aval. ORVUPI no tiene relación con estos tokens.",
  );
  await expect(page.locator("footer")).not.toContainText(FOOTER_ES);
  await expect(page.locator("#exportar")).toBeHidden();
  await page.getByRole("button", { name: "Leer" }).click();
  await expect(page.locator("#resultado")).toContainText("Esa dirección no es válida");
  expect(seen.some((url) => url.includes("solana"))).toBe(false);

  await page.route(/solana-rpc\.publicnode\.com/, (route) => answer(route, 200));
  await page.route(/api\.mainnet-beta\.solana\.com/, (route) => answer(route, 500));
  await page.locator("#direccion-token").fill(MINT);
  await page.getByRole("button", { name: "Leer" }).click();
  await expect(page.locator("#resultado")).toContainText("Moneda base: SOL", { timeout: 15000 });
  await expect(page.locator("#resultado")).toContainText("Curva: abierta");
  await expect(page.locator("#resultado")).toContainText("No se inventa ningún dato.");
  await expect(page.locator("#resultado")).toContainText("95");
  await expect(page.locator("#resultado")).toContainText("Identidad del proyecto, aparte de este análisis: ORVUPI no revisa ni respalda este token.");
  await expect(page.locator("#resultado")).toContainText("Un emparejamiento no es una colaboración ni un respaldo.");
  await expect(page.locator("#resultado")).toContainText(NAME);
  await expect(page.locator("#resultado")).toContainText("no se abre");
  expect(seen.some((url) => {
    try {
      return new URL(url).host === "evil.example";
    } catch {
      return false;
    }
  })).toBe(false);
  await expect(page.locator("#exportar")).toBeVisible();
  const downloads = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  await page.getByRole("button", { name: "Exportar ficha" }).click();
  await expect.poll(() => downloads.length, { timeout: 10000 }).toBe(2);
  expect(downloads.some((name) => name.endsWith(".png"))).toBe(true);
  expect(downloads.some((name) => name.endsWith(".json"))).toBe(true);
  await page.screenshot({ path: `${shots}/u09-pares-${project}-es.png`, fullPage: project === "desktop" });

  await page.locator('[data-set-lang="en"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-lang", "en");
  await expect(page.locator("h1")).toContainText("Curve reading");
  await expect(page.locator("main")).toContainText(
    "Public data reading. It is not a quality comparison, a recommendation, or an endorsement. ORVUPI has no relationship with these tokens.",
  );
  await expect(page.locator("footer")).not.toContainText(FOOTER_EN);
  await expect(page.locator("#resultado")).toContainText("Base currency: SOL");
  await page.screenshot({ path: `${shots}/u09-pares-${project}-en.png`, fullPage: false });
});

test("si el primer servicio limita, se usa el respaldo", async ({ page }) => {
  test.setTimeout(60000);
  const hosts = [];
  page.on("request", (request) => {
    if (request.url().includes("solana")) hosts.push(new URL(request.url()).host);
  });
  await page.route(/solana-rpc\.publicnode\.com/, (route) => answer(route, 429));
  await page.route(/api\.mainnet-beta\.solana\.com/, (route) => answer(route, 200));
  await page.goto("/pares/");
  await page.locator("#direccion-token").fill(MINT);
  await page.getByRole("button", { name: "Leer" }).click();
  await expect(page.locator("#resultado")).toContainText("api.mainnet-beta.solana.com", { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText("Moneda base: SOL");
  expect(hosts[0]).toBe("solana-rpc.publicnode.com");
  expect(hosts.some((host) => host === "api.mainnet-beta.solana.com")).toBe(true);
});

test("la séptima lectura en un minuto no llama al servicio", async ({ page }) => {
  test.setTimeout(60000);
  let calls = 0;
  await page.route(/solana-rpc\.publicnode\.com/, async (route) => {
    calls += 1;
    await answer(route, 200);
  });
  await page.route(/api\.mainnet-beta\.solana\.com/, (route) => answer(route, 500));
  await page.goto("/pares/");
  await page.locator("#direccion-token").fill(MINT);
  for (let i = 0; i < 6; i += 1) {
    await page.getByRole("button", { name: "Leer" }).click();
    await expect(page.locator("#resultado")).toContainText("Curva: abierta");
  }
  const afterSix = calls;
  await page.getByRole("button", { name: "Leer" }).click();
  await expect(page.locator("#resultado")).toContainText("Se han hecho 6 lecturas en un minuto");
  await expect(page.locator("#resultado")).toContainText("No se inventa ningún dato.");
  expect(calls).toBe(afterSix);
});
