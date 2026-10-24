import { expect, test } from "@playwright/test";

async function openTemplate(page, id) {
  await page.goto("/studio/");
  await page.locator(`[data-template='${id}']`).click();
  await expect(page.locator("#editor-app")).toBeVisible();
}

test("pizarra: once pestañas, lienzo de puntos y barra inferior", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });
  await openTemplate(page, "pizarra-ideas");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "whiteboard");
  await expect(page.locator(".riel [data-rail]")).toHaveCount(11);
  await expect(page.locator("[data-rail='fondo']")).toHaveCount(0);
  await expect(page.locator("#anadir-pagina")).toHaveCount(0);
  await expect(page.locator("#lienzo-pizarra")).toBeVisible();
  await expect(page.locator(".campo-pizarra")).toBeVisible();
  await expect(page.locator("#abrir-notas")).toBeVisible();
  await expect(page.locator("#temporizador")).toBeVisible();
  await expect(page.locator("#paginas-indicador")).toHaveText("1 de 1");
  await expect(page.locator("#cuadricula")).toBeVisible();
  await expect(page.locator("#pantalla")).toBeVisible();
  await page.locator("#abrir-notas").click();
  await expect(page.locator("#notas-pizarra")).toBeVisible();
  await page.locator("#cuadricula").click();
  await expect(page.locator(".stage-art")).toHaveClass(/cuadricula/);
});

test("sitio: doce pestañas, vista previa, exportar y sección", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });
  await openTemplate(page, "sitio-comunidad");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "web");
  await expect(page.locator(".riel [data-rail]")).toHaveCount(12);
  await expect(page.locator("[data-rail='fondo']")).toHaveCount(1);
  await expect(page.locator("#vista-previa")).toBeVisible();
  await expect(page.locator("#exportar-sitio")).toBeVisible();
  await expect(page.locator("#anadir-seccion")).toHaveText(/\+ Añadir una sección/);
  await expect(page.locator("#tira-paginas")).toBeVisible();
  await expect(page.locator("#anadir-pagina")).toHaveCount(0);
  const heightOf = () => page.locator(".stage-art").evaluate((node) => Number.parseFloat(node.style.height));
  const before = await heightOf();
  await page.locator("#anadir-seccion").click();
  await expect(page.locator(".capa-texto", { hasText: /^Sección$/ })).toBeVisible();
  expect(await heightOf()).toBeGreaterThan(before);
  await page.locator("#vista-previa").click();
  const preview = page.locator("#dialogo-previa");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(/no publica/i);
  await expect(page.locator("body")).not.toContainText(/publicar sitio|publish site/i);
});

test("cartel y folleto comparten impresión; el folleto marca el pliegue", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });
  await openTemplate(page, "flyer-comunidad");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "print");
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "cartel-vertical");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "print");
  await expect(page.locator("#imprimir")).toBeVisible();
  await expect(page.locator(".guias-pliegue")).toHaveCount(0);
  await openTemplate(page, "logo-cuadrado");
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "invitacion-vertical");
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "folleto-tres");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "print");
  await expect(page.locator("#imprimir")).toBeVisible();
  await expect(page.locator(".guias-pliegue .guia")).toHaveCount(2);
});

test("móvil: pizarra y sitio no ensanchan la página", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "solo el móvil emulado");
  await page.setViewportSize({ width: 390, height: 844 });
  await openTemplate(page, "pizarra-ideas");
  await expect(page.locator("#anadir-pagina")).toHaveCount(0);
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await openTemplate(page, "sitio-comunidad");
  await expect(page.locator("#anadir-seccion")).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
