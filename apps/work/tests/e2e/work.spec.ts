import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(result.violations).toEqual([]);
}

test("recorrido crear, escribir, cerrar, volver, recuperar y exportar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ORVUPI Work" })).toBeVisible();
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await editor.click();
  await page.keyboard.type("Informe de prueba ORVUPI");
  await expect(page.getByRole("status").filter({ hasText: "Cambios pendientes" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await expect(page.getByLabel("Nombre del archivo")).toHaveValue("Informe de prueba ORVUPI");
  await expect(page.getByText("4 palabras")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar documento" }).click();
  await page.getByRole("button", { name: "Inicio" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Informe de prueba ORVUPI/ }).click();
  await expect(editor).toContainText("Informe de prueba ORVUPI");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "TXT" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const text = await import("node:fs/promises").then((fs) => fs.readFile(filePath ?? "", "utf8"));
  expect(text).toContain("Informe de prueba ORVUPI");
});

test("contraste WCAG AA en inicio y en el editor", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page);
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  await expect(page.locator(".ProseMirror")).toBeVisible();
  await expectNoViolations(page);
});

test("una hoja suma dos celdas y una carpeta se crea en archivos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nueva hoja" }).click();
  await page.getByRole("button", { name: /^A1(\s|$)/ }).click();
  const formula = page.getByRole("textbox", { name: "Fórmula o valor" });
  await formula.fill("10");
  await page.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await formula.fill("20");
  await page.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await formula.fill("=SUMA(A1:A2)");
  await expect(page.getByRole("button", { name: /^B1(\s|$)/ })).toHaveText("30");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad" }).click();
  await page.getByRole("button", { name: "Nueva carpeta" }).click();
  await expect(page.getByRole("button", { name: "Nueva carpeta Carpeta" })).toBeVisible();
});

test("el idioma persiste entre cargas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Ajustes" }).click();
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();
});
