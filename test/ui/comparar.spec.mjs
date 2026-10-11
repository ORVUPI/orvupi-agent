import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const shots = "/opt/cursor/artifacts/screenshots";
const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";
const WARNING_ES =
  "Ejemplo educativo. No es una comparación de calidad, ni una recomendación, ni un aval. STUBX no tiene relación con ningún token de este ejemplo.";
const WARNING_EN =
  "Educational example. It is not a quality comparison, a recommendation, or an endorsement. STUBX has no relationship with any token in this example.";

test.beforeAll(() => {
  mkdirSync(shots, { recursive: true });
});

test("el ejemplo de la curva no lee una dirección", async ({ page }, info) => {
  const project = info.project.name;
  const reads = [];
  page.on("request", (request) => {
    try {
      const host = new URL(request.url()).host;
      if (host === "solana-rpc.publicnode.com" || host === "api.mainnet-beta.solana.com") reads.push(host);
    } catch {
      /* una URL ilegible no es una lectura */
    }
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ver el ejemplo" })).toBeVisible();
  await page.goto("/comparar/");
  await expect(page.locator("h1")).toContainText("Ejemplo de una curva");
  await expect(page.locator("main")).toContainText("Ejemplo hipotético, no leído de la cadena");
  await expect(page.locator("main")).toContainText(WARNING_ES);
  await expect(page.locator("main")).toContainText("1 000 000");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input, textarea")).toHaveCount(0);
  await expect(page.locator("footer")).not.toContainText(FOOTER_ES);
  expect(reads).toEqual([]);
  await page.screenshot({ path: `${shots}/u07-comparar-${project}-es.png`, fullPage: project === "desktop" });

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-lang", "en");
  await expect(page.locator("h1")).toContainText("Curve example");
  await expect(page.locator("main")).toContainText("Hypothetical example, not read from the chain");
  await expect(page.locator("main")).toContainText(WARNING_EN);
  await expect(page.locator("footer")).not.toContainText(FOOTER_EN);
  expect(reads).toEqual([]);
  await page.screenshot({ path: `${shots}/u07-comparar-${project}-en.png`, fullPage: false });
});
