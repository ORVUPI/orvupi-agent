import { expect, test } from "@playwright/test";

async function openHome(page) {
  await page.goto("/studio/");
  await expect(page.locator("#crear-pieza:visible, .desk-crear:visible").first()).toBeVisible();
}

test("móvil: filtros, idea y sin scroll horizontal", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "solo el móvil emulado");
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);
  await page.locator("#buscar").fill("viñeta");
  await expect(page.locator("[data-template='meme-vineta']")).toBeVisible();
  await expect(page.locator("[data-template='meme-punch']")).toHaveCount(0);
  await page.locator("#buscar").fill("zzz-no-hay-plantilla");
  await expect(page.locator("#vacio-plantillas")).toBeVisible();
  await page.locator("#limpiar-filtros").click();
  await page.locator("#buscar").fill("Publicación clara");
  await page.locator("[data-template='publi-feed']").click();
  const idea = page.locator("#vista-plantilla");
  await expect(idea).toHaveAttribute("data-open-id", "publi-feed");
  await idea.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "publi-feed");
  await expect(page.locator("#nombre-diseno")).toHaveValue(/Publicación/);
  await expect(page.locator("[data-rail='marca']")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("escritorio: capas, bloqueo, grupo y texto", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });
  await openHome(page);
  await page.locator("#buscar").fill("Publicación clara");
  await page.locator("[data-template='publi-feed']").click();
  const modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "publi-feed");
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "publi-feed");
  await page.locator(".capa-texto").first().click();
  await page.locator("#alternar-inspector").click();
  await expect(page.locator("#capas [data-layer]").first()).toBeVisible();
  const backId = await page.locator("#capas [data-layer]").last().getAttribute("data-layer");
  await page.locator(`#capas [data-layer="${backId}"] [data-pick]`).click();
  await page.locator("[data-action='front']").click();
  await expect(page.locator("#capas [data-layer]").first()).toHaveAttribute("data-layer", backId);
  await page.locator(`#capas [data-layer="${backId}"] [data-action='lock-one']`).click();
  await expect(page.locator(`#capas [data-layer="${backId}"] [data-action='lock-one']`)).toHaveAttribute("aria-pressed", "true");
  await page.locator("#capas [data-action='toggle']").first().click();
  await expect(page.locator(`.capa[data-id="${backId}"]`)).toHaveCSS("visibility", "hidden");
  const picks = page.locator("#capas [data-pick]");
  await picks.nth(1).click();
  await picks.nth(2).click({ modifiers: ["Shift"] });
  await expect(page.locator("[data-action='group']")).toBeVisible();
  await page.locator("[data-action='group']").click();
  await page.locator("#capas [data-pick]").filter({ hasText: "Titular" }).click();
  const box = page.locator("#texto-capa");
  await box.fill("Hola comunidad");
  await expect(page.locator(".capa-texto", { hasText: "Hola comunidad" })).toBeVisible();
  await expect(box).toHaveValue("Hola comunidad");
});

test("inicio: crear abre el tamaño y el lienzo en blanco", async ({ page }) => {
  await openHome(page);
  await page.locator("#crear-pieza:visible, .desk-crear:visible").first().click();
  const dialog = page.locator("#dialogo-tamano");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-format='square']")).toBeVisible();
  await expect(dialog.locator("[data-format='story']")).toBeVisible();
  await expect(dialog.locator("[data-format='x']")).toBeVisible();
  await expect(dialog.locator("[data-format='tiktok']")).toBeVisible();
  await dialog.locator("[data-format='square']").click();
  await expect(page.locator("#nombre-diseno")).toHaveValue(/blanco/);
  await expect(page.locator("#descargar")).toBeEnabled();
  await expect(page.locator("body")).not.toContainText(/quitar fondo|remove background/i);
});
