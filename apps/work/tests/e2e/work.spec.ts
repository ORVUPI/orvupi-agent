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
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  const doc = await opened;
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await expect(doc.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await editor.click();
  await doc.keyboard.type("Informe de prueba ORVUPI");
  await expect(doc.getByRole("status").filter({ hasText: "Cambios pendientes" })).toBeVisible();
  await expect(doc.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await expect(doc.getByLabel("Nombre del archivo")).toHaveValue("Informe de prueba ORVUPI");
  await expect(doc.getByText("4 palabras")).toBeVisible();
  await doc.getByRole("button", { name: "Cerrar documento" }).click();
  await expect(doc.isClosed()).toBeTruthy();
  await page.getByRole("button", { name: "Inicio" }).click();
  await page.reload();
  const again = page.waitForEvent("popup");
  await page.getByRole("button", { name: /Informe de prueba ORVUPI/ }).click();
  const reopened = await again;
  await expect(reopened.locator(".ProseMirror")).toContainText("Informe de prueba ORVUPI");
  await reopened.getByRole("button", { name: "Exportar", exact: true }).click();
  const downloadPromise = reopened.waitForEvent("download");
  await reopened.getByRole("menuitem", { name: "TXT" }).click();
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
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  const doc = await opened;
  await expect(doc.locator(".ProseMirror")).toBeVisible();
  await expectNoViolations(doc);
});

test("una hoja suma dos celdas y una carpeta se crea en archivos", async ({ page }) => {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nueva hoja" }).click();
  const sheet = await opened;
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  const formula = sheet.getByRole("textbox", { name: "Fórmula o valor" });
  await formula.fill("10");
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await formula.fill("20");
  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await formula.fill("=SUMA(A1:A2)");
  await expect(sheet.getByRole("button", { name: /^B1(\s|$)/ })).toHaveText("30");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad" }).click();
  await page.getByRole("button", { name: "Nueva carpeta" }).click();
  await expect(page.getByRole("button", { name: "Nueva carpeta Carpeta" })).toBeVisible();
});

test("Nuevo abre otra pestaña y el doble clic de Drive también", async ({ page }) => {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await page.getByRole("menuitem", { name: "Documento" }).click();
  const doc = await opened;
  await expect(doc).toHaveURL(/\/document\/d\/[^/]+\/edit$/);
  await expect(doc).toHaveTitle(/ORVUPI Docs/);
  await expect(doc.locator("link[rel='icon']")).toHaveAttribute("href", /favicons\/docs\.svg/);
  await expect(page.getByRole("button", { name: /Sin título/ }).first()).toBeVisible();
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad" }).click();
  const second = page.waitForEvent("popup");
  await page.getByRole("button", { name: /Sin título/ }).dblclick();
  const again = await second;
  await expect(again).toHaveURL(/\/document\/d\/[^/]+\/edit$/);
  await expect(again).toHaveTitle(/Sin título - ORVUPI Docs/);
});

test("una ruta de editor desconocida carga la aplicación", async ({ page }) => {
  const response = await page.goto("/spreadsheets/d/local/edit");
  expect(response?.status()).toBe(200);
  await expect(page.locator("#root")).toBeAttached();
});

test("el idioma persiste entre cargas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Ajustes" }).click();
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();
});
