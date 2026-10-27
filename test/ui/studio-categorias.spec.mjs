import { expect, test } from "@playwright/test";

const TEMPLATE_QUERY = {
  "pizarra-ideas": "Pizarra de ideas",
  "sitio-comunidad": "Página de comunidad",
  "flyer-comunidad": "Flyer de comunidad",
  "cartel-vertical": "Cartel vertical",
  "logo-cuadrado": "Logo cuadrado",
  "invitacion-vertical": "Invitación vertical",
  "folleto-tres": "Folleto de tres caras",
};

async function openTemplate(page, id) {
  await page.goto("/studio/");
  await page.locator("#buscar").fill(TEMPLATE_QUERY[id]);
  await page.locator(`[data-template='${id}']`).click();
  const modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", id);
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toBeVisible();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", id);
}

test("pizarra: once pestañas, lienzo de puntos y barra inferior", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });
  await openTemplate(page, "pizarra-ideas");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "whiteboard");
  await expect(page.locator(".riel [data-rail]")).toHaveCount(9);
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
  await expect(page.locator(".riel [data-rail]")).toHaveCount(9);
  await page.locator(".riel [data-rail='apps']").click();
  await expect(page.locator("[data-rail='fondo']")).toHaveCount(1);
  await page.locator("#abrir-archivo").click();
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
  await page.locator("#abrir-archivo").click();
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "cartel-vertical");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "print");
  await page.locator("#abrir-archivo").click();
  await expect(page.locator("#imprimir")).toBeVisible();
  await expect(page.locator(".guias-pliegue")).toHaveCount(0);
  await openTemplate(page, "logo-cuadrado");
  await page.locator("#abrir-archivo").click();
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "invitacion-vertical");
  await page.locator("#abrir-archivo").click();
  await expect(page.locator("#imprimir")).toBeVisible();
  await openTemplate(page, "folleto-tres");
  await expect(page.locator("#editor-app")).toHaveAttribute("data-shell", "print");
  await page.locator("#abrir-archivo").click();
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

test("cada ficha abre su diseño: miniatura, foto, archivo y fondo", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.goto("/studio/#/plantillas");
  await page.locator("#buscar").fill("CV Ejecutivo Navy");
  const thumb = page.locator(".tpl-open[data-thumb='tpl-curriculum-01']");
  await expect(thumb).toBeVisible();
  await thumb.click();
  let modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "tpl-curriculum-01");
  await expect(modal.locator("h2")).toHaveText("CV Ejecutivo Navy");
  await expect(modal.locator("[data-personalizar]")).toHaveText("Personalizar esta plantilla");
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "tpl-curriculum-01");
  await expect(page.locator("#nombre-diseno")).toHaveValue("CV Ejecutivo Navy");
  await expect(page.locator(".capa-texto", { hasText: "HABILIDADES" })).toBeVisible();
  await expect(page.locator(".stage-art")).toHaveCSS("width", "794px");
  await expect(page.locator(".stage-art")).toHaveCSS("height", "1123px");

  await page.goto("/studio/#/fotos");
  await page.locator("#buscar").fill("Papel rayado 1");
  const scene = page.locator("button[data-asset='lib-papel-01']");
  await expect(scene).toBeVisible();
  await scene.click();
  modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "lib-papel-01");
  await expect(modal.locator(".tpl-modal-hero .capa-escena")).toBeVisible();
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "lib-papel-01");
  await expect(page.locator(".stage-art .capa-escena")).toBeVisible();

  await page.goto("/studio/#/fotos");
  await page.locator("#buscar").fill("foto-crema");
  const file = page.locator("button[data-asset='foto-crema']");
  await expect(file).toBeVisible();
  await file.click();
  modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "foto-crema");
  await expect(modal.locator("h2")).toHaveText("Campo crema");
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "foto-crema");
  await expect(page.locator("#nombre-diseno")).toHaveValue("Campo crema");
  await expect(page.locator(".capa-img img")).toHaveAttribute("src", /foto-crema\.png/);

  await page.goto("/studio/#/elementos");
  await page.locator("#buscar").fill("fondo-solana");
  const fondo = page.locator("button[data-asset='fondo-solana']");
  await expect(fondo).toBeVisible();
  await fondo.click();
  modal = page.locator("#vista-plantilla");
  await expect(modal).toHaveAttribute("data-open-id", "fondo-solana");
  await expect(modal.locator("h2")).toHaveText("Red digital");
  const heroBg = await modal.locator(".tpl-modal-hero .mini-art").evaluate((node) => node.style.backgroundImage);
  expect(heroBg).toContain("fondo-solana");
  await modal.locator("[data-personalizar]").click();
  await expect(page.locator("#editor-app")).toHaveAttribute("data-template-id", "fondo-solana");
  await expect(page.locator("#nombre-diseno")).toHaveValue("Red digital");
  await expect(page.locator(".stage-art")).toHaveCSS("width", "1080px");
  await expect(page.locator(".stage-art")).toHaveCSS("height", "1080px");
  await expect(page.locator(".stage-art")).toHaveCSS("background-color", "rgb(7, 4, 24)");
});
