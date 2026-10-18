import { switchLang } from "./lang.mjs";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const shots = "test-results/artifacts/screenshots";
const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";

test.beforeAll(() => {
  mkdirSync(shots, { recursive: true });
});

test("contribuciones abre GitHub y cambia de idioma", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await expect(page.locator('main a.or-button[href="/contribuir/"]').first()).toBeVisible();
  await page.goto("/contribuir/");
  await expect(page.locator("h1")).toContainText("Contribuir");
  await expect(page.getByRole("link", { name: "Informar un fallo" })).toHaveAttribute(
    "href",
    "https://github.com/ORVUPI/orvupi-agent/issues/new?template=informe-fallo.yml",
  );
  await expect(page.getByRole("link", { name: "Proponer una mejora" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar la plantilla" })).toHaveAttribute("href", "/contribuir/plantilla.md");
  await expect(page.locator("main")).toContainText(
    "Un issue o una propuesta de cambio es público. Lo que escribas, y tu usuario, quedan en GitHub según sus condiciones y su política de privacidad.",
  );
  await expect(page.locator("main")).toContainText(
    "Al enviar una propuesta de cambio, aceptas que se publique con la licencia MIT del repositorio.",
  );
  await expect(page.locator("main")).toContainText(
    "Pedir pago, tokens, recompensas o una parte del proyecto. Contribuir no da derecho a nada de eso.",
  );
  await expect(page.locator("footer")).not.toContainText(FOOTER_ES);
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input, textarea")).toHaveCount(0);
  await page.screenshot({ path: `${shots}/u04-contribuir-${project}-es.png`, fullPage: project === "desktop" });

  await switchLang(page, "en");
  await expect(page.locator("html")).toHaveAttribute("data-lang", "en");
  await expect(page.locator("h1")).toContainText("Contribute");
  await expect(page.getByRole("link", { name: "Report a bug" })).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "An issue or a change proposal is public. What you write, and your username, stay on GitHub under its terms and privacy policy.",
  );
  await expect(page.locator("main")).toContainText(
    "By sending a change proposal, you agree that it is published under the repository's MIT license.",
  );
  await expect(page.locator("footer")).not.toContainText(FOOTER_EN);
  await page.screenshot({ path: `${shots}/u04-contribuir-${project}-en.png`, fullPage: false });
});
