import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

import { decodePng } from "../../web/v2/studio/lib/png.mjs";

test("la historia exporta 1080×1920 y la plantilla vertical no lleva marca de agua", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/studio/");
  await page.locator("#buscar").fill("Saludo de historia");
  await page.locator("[data-template='historia-saludo']").click();
  const modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "historia-saludo");
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "historia-saludo");
  await expect(page.locator(".stage-frame")).toBeVisible();
  const ratio = await page.evaluate(() => {
    const frame = document.querySelector(".stage-frame");
    return frame.getBoundingClientRect().height / frame.getBoundingClientRect().width;
  });
  expect(ratio).toBeGreaterThan(1.7);
  await expect(page.locator("body")).not.toContainText(/Community content, unofficial|Imagen generada con IA|AI-generated image/);

  await page.goto("/studio/");
  await page.locator("#crear-pieza:visible, .desk-crear:visible").first().click();
  await page.locator("#dialogo-tamano [data-format='story']").click();
  await expect(page.locator("#descargar")).toBeEnabled();
  const ios = await page.evaluate(() => /iPhone/.test(navigator.userAgent));
  if (!ios) {
  if (!(await page.locator("#menu-archivo #descargar").count())) await page.locator("#abrir-archivo").click();
  await expect(page.locator("#menu-archivo #descargar")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.click("#descargar"),
  ]);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.includes(Buffer.from("Community content, unofficial. Not from @ORVUPI."))).toBe(false);
  const img = await decodePng(new Uint8Array(bytes));
  expect(img.width).toBe(1080);
  expect(img.height).toBe(1920);
  }
});
