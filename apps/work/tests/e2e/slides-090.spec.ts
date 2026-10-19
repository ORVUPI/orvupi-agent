import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { screenshotDir } from "./shots";

/** 0.9.0: Presentaciones con la estructura y las funciones de Google Slides (escritorio, tableta y móvil). */

async function openSlides(page: Page): Promise<Page> {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Nueva presentación", exact: true }).first();
  await expect(button).toBeVisible();
  const opened = page.waitForEvent("popup");
  await button.click();
  const slides = await opened;
  await slides.waitForLoadState("domcontentloaded");
  await expect(slides.locator(".sl-canvas")).toBeVisible({ timeout: 20_000 });
  return slides;
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1366) <= 840 || test.info().project.name.includes("tablet");

async function menu(page: Page, name: string, ...path: string[]) {
  const overflow = page.locator(".sl-menus .ow-menu-overflow, .sl-menus.is-compact > button").first();
  const entry = page.locator(".sl-menus").getByRole("menuitem", { name, exact: true });
  if ((await entry.count()) === 0 && (await overflow.count()) > 0) await overflow.click();
  await entry.last().click();
  for (const item of path) await page.getByRole("menuitem", { name: new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\p{L})`, "u") }).last().click();
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${await screenshotDir()}/090-${name}-${test.info().project.name}.png` });
}

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
}

const TITLE = "Haz clic para añadir un título";

async function typeIntoPlaceholder(page: Page, label: string, text: string) {
  const target = page.locator(".sl-canvas").getByRole("button", { name: label, exact: true });
  await target.dblclick();
  const box = page.locator(".sl-canvas .sl-editable");
  await expect(box).toBeVisible();
  await page.keyboard.type(text);
  await page.keyboard.press("Escape");
}

test("estructura de Slides con la identidad ORVUPI", async ({ page }) => {
  const slides = await openSlides(page);
  await expect(slides.getByRole("textbox", { name: "Nombre del archivo" })).toHaveValue(/presentación/i);
  await expect(slides.getByRole("button", { name: "Destacar" })).toBeVisible();
  const present = slides.getByRole("button", { name: "Presentar", exact: true });
  await expect(present).toBeVisible();
  await expect(present).toHaveCSS("background-color", "rgb(255, 48, 112)");
  await expect(slides.locator(".sl-logo img")).toHaveAttribute("src", /avatar\.png$/);
  await expect(slides.getByRole("button", { name: "Opciones de presentación" })).toBeVisible();
  if (!isPhone(slides)) {
    for (const name of ["Archivo", "Editar", "Ver", "Insertar", "Formato", "Diapositiva", "Organizar", "Herramientas", "Ayuda"]) {
      await expect(slides.locator(".sl-menus").getByRole("menuitem", { name, exact: true })).toBeVisible();
    }
    await expect(slides.locator(".sl-ruler.is-x")).toBeVisible();
    for (const name of ["Buscar en los menús", "Nueva diapositiva", "Deshacer", "Rehacer", "Imprimir", "Seleccionar", "Herramienta de cuadro de texto", "Insertar imagen", "Forma", "Línea", "Añadir comentario"]) {
      await expect(slides.locator(".sl-toolbar").getByRole("button", { name, exact: true })).toBeVisible();
    }
    for (const name of ["Fondo", "Diseño", "Tema", "Transición"]) await expect(slides.locator(".sl-toolbar").getByRole("button", { name, exact: true })).toBeVisible();
  }
  // Diseño «Diapositiva de título» con sus marcadores
  await expect(slides.locator(".sl-canvas")).toContainText("Haz clic para añadir un título");
  await expect(slides.locator(".sl-canvas")).toContainText("Haz clic para añadir un subtítulo");
  await expect(slides.getByRole("textbox", { name: "Notas del orador" })).toHaveAttribute("placeholder", "Haz clic para añadir notas del orador");
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(1);
  await noOverflow(slides);
  const axe = await new AxeBuilder({ page: slides }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id} ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  await shot(slides, "inicio");
});

test("marcadores, nueva diapositiva con diseño, miniaturas reales y reordenar", async ({ page }) => {
  const slides = await openSlides(page);
  await typeIntoPlaceholder(slides, TITLE, "Plan ORVUPI");
  await expect(slides.locator(".sl-film-list").getByRole("option").first()).toContainText("Plan ORVUPI");
  // Nueva diapositiva con el menú de diseños
  await slides.getByRole("button", { name: "Elegir el diseño de la nueva diapositiva" }).click();
  await slides.locator(".sl-layouts").getByRole("menuitem", { name: "Título y cuerpo" }).click();
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(2);
  await expect(slides.locator(".sl-canvas")).toContainText("Haz clic para añadir texto");
  await typeIntoPlaceholder(slides, TITLE, "Segunda");
  await expect(slides.locator(".sl-film-list").getByRole("option").nth(1)).toContainText("Segunda");
  // Mover la diapositiva hacia arriba (Diapositiva › Mover diapositiva › Hacia arriba)
  await menu(slides, "Diapositiva", "Mover diapositiva", "Hacia arriba");
  await expect(slides.locator(".sl-film-list").getByRole("option").first()).toContainText("Segunda");
  // Duplicar y deshacer
  await menu(slides, "Diapositiva", "Duplicar diapositiva");
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(3);
  await slides.locator(".sl-stage").click({ position: { x: 4, y: 4 } });
  await slides.keyboard.press("Control+z");
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(2);
  await slides.keyboard.press("Control+y");
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(3);
  await shot(slides, "diapositivas");
});

test("cuadro de texto con formato y tamaño de fuente 1–96", async ({ page }) => {
  const slides = await openSlides(page);
  await menu(slides, "Insertar", "Cuadro de texto");
  const box = slides.locator(".sl-canvas .sl-item.is-text").last();
  await expect(box).toBeVisible();
  await slides.keyboard.type("Hola pulpo");
  await expect(box).toContainText("Hola pulpo");
  const size = slides.getByRole("textbox", { name: "Tamaño de fuente" });
  await expect(size).toHaveValue("18");
  await slides.getByRole("button", { name: "Aumentar tamaño de fuente" }).click();
  await expect(size).toHaveValue("19");
  await slides.getByRole("button", { name: "Reducir tamaño de fuente" }).click();
  await slides.getByRole("button", { name: "Reducir tamaño de fuente" }).click();
  await expect(size).toHaveValue("17");
  await size.click();
  const list = slides.getByRole("listbox", { name: "Tamaños" });
  await expect(list.getByRole("option")).toHaveCount(96);
  await expect(list.getByRole("option").first()).toHaveText("1");
  await expect(list.getByRole("option").last()).toHaveText("96");
  await list.getByRole("option", { name: "40", exact: true }).click();
  await expect(size).toHaveValue("40");
  await expect.poll(() => box.locator(".sl-text").evaluate((n) => Math.round(Number.parseFloat(getComputedStyle(n).fontSize)))).toBe(53);
  await slides.getByRole("button", { name: "Negrita" }).click();
  await expect(box.locator(".sl-text")).toHaveCSS("font-weight", "700");
  await slides.getByRole("button", { name: "Lista con viñetas" }).click();
  await expect(box.locator(".sl-lines.is-bullet")).toBeAttached();
  await shot(slides, "texto");
});

test("formas, líneas, tabla y gráfico: mover, cambiar tamaño, girar, copiar y ordenar", async ({ page }) => {
  const slides = await openSlides(page);
  await menu(slides, "Insertar", "Forma", "Rectángulo");
  const shape = slides.locator(".sl-canvas .sl-item.is-shape").last();
  await expect(shape).toBeVisible();
  await expect(slides.locator(".sl-selbox .sl-handle")).toHaveCount(8);
  const before = await shape.boundingBox();
  const handle = slides.locator(".sl-handle.is-se");
  const hb = await handle.boundingBox();
  if (!before || !hb) throw new Error("sin caja");
  await slides.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await slides.mouse.down();
  await slides.mouse.move(hb.x + 60, hb.y + 30, { steps: 6 });
  await slides.mouse.up();
  await expect.poll(async () => (await shape.boundingBox())?.width ?? 0).toBeGreaterThan(before.width + 20);
  // mover arrastrando
  const mid = await shape.boundingBox();
  if (!mid) throw new Error("sin caja");
  await slides.mouse.move(mid.x + mid.width / 2, mid.y + mid.height / 2);
  await slides.mouse.down();
  await slides.mouse.move(mid.x + mid.width / 2 - 70, mid.y + mid.height / 2 + 20, { steps: 8 });
  await slides.mouse.up();
  await expect.poll(async () => (await shape.boundingBox())?.x ?? 0).toBeLessThan(mid.x - 30);
  // girar 90°
  await menu(slides, "Organizar", "Girar", "Girar 90° a la derecha");
  await expect(shape).toHaveCSS("transform", /matrix/);
  // copiar y pegar
  await slides.keyboard.press("Control+c");
  await slides.keyboard.press("Control+v");
  await expect(slides.locator(".sl-canvas .sl-item.is-shape")).toHaveCount(2);
  await slides.keyboard.press("Control+z");
  await expect(slides.locator(".sl-canvas .sl-item.is-shape")).toHaveCount(1);
  // línea con flecha, tabla y gráfico
  await menu(slides, "Insertar", "Flecha");
  await expect(slides.locator(".sl-canvas .sl-item.is-line")).toHaveCount(1);
  await menu(slides, "Insertar", "Tabla");
  await slides.getByRole("gridcell", { name: "3 × 4" }).click();
  await expect(slides.locator(".sl-canvas .sl-item.is-table td").first()).toBeAttached();
  await menu(slides, "Insertar", "Gráfico", "Columnas");
  await expect(slides.locator(".sl-canvas .sl-item.is-chart svg rect").first()).toBeAttached();
  // ordenar: el gráfico (seleccionado) al fondo
  await menu(slides, "Organizar", "Ordenar", "Enviar al fondo");
  await expect(slides.locator(".sl-canvas .sl-slide > .sl-item").first()).toHaveClass(/is-chart/);
  await shot(slides, "objetos");
});

test("temas con vista previa, fondo, transición y comentarios", async ({ page }) => {
  const slides = await openSlides(page);
  await menu(slides, "Diapositiva", "Cambiar tema");
  const panel = slides.locator(".sl-panel");
  await expect(panel.locator(".sl-theme .sl-view")).toHaveCount(10);
  await panel.getByRole("button", { name: "Tinta" }).click();
  await expect(slides.locator(".sl-canvas .sl-slide")).toHaveCSS("background-color", "rgb(16, 32, 50)");
  await menu(slides, "Diapositiva", "Transición");
  await slides.locator(".sl-panel").getByLabel("Tipo").selectOption({ label: "Deslizar desde la derecha" });
  await menu(slides, "Insertar", "Comentario");
  await slides.locator(".sl-panel textarea").first().fill("Revisar el título");
  await slides.locator(".sl-panel").getByRole("button", { name: "Comentar" }).click();
  await expect(slides.locator(".sl-comment-list")).toContainText("Revisar el título");
  await shot(slides, "temas");
});

test("presentar a pantalla completa con animaciones y salir", async ({ page }) => {
  const slides = await openSlides(page);
  await typeIntoPlaceholder(slides, TITLE, "Uno");
  await slides.getByRole("button", { name: "Nueva diapositiva", exact: true }).click();
  await typeIntoPlaceholder(slides, TITLE, "Dos");
  await slides.locator(".sl-film-list").getByRole("option").first().click();
  await slides.getByRole("button", { name: "Presentar", exact: true }).click();
  const show = slides.getByRole("dialog", { name: /Presentación/ });
  await expect(show).toBeVisible();
  await expect(show.getByRole("status")).toHaveText("Diapositiva 1 / 2");
  await expect(show.locator(".sl-tr-layer.is-in")).toContainText("Uno");
  await slides.keyboard.press("ArrowRight");
  await expect(show.getByRole("status")).toHaveText("Diapositiva 2 / 2");
  await expect(show.locator(".sl-tr-layer.is-in")).toContainText("Dos");
  await shot(slides, "presentar");
  await slides.keyboard.press("Escape");
  await expect(show).toBeHidden();
  await expect(slides.locator(".sl-canvas")).toBeVisible();
});

test("descarga PDF, PNG y PPTX reales y vuelve a importar el PPTX", async ({ page }) => {
  const slides = await openSlides(page);
  await typeIntoPlaceholder(slides, TITLE, "Exportar ORVUPI");
  await slides.getByRole("textbox", { name: "Notas del orador" }).fill("Nota para PowerPoint");
  await slides.getByRole("button", { name: "Nueva diapositiva", exact: true }).click();
  const grab = async (item: string) => {
    const download = slides.waitForEvent("download");
    await menu(slides, "Archivo", "Descargar", item);
    const file = await download;
    return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
  };
  const pdf = await grab("Documento PDF (.pdf)");
  expect(pdf.name).toMatch(/\.pdf$/);
  expect(pdf.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const doc = await PDFDocument.load(pdf.bytes);
  expect(doc.getPageCount()).toBe(2);
  expect(Math.round(doc.getPage(0).getWidth())).toBe(720);
  const png = await grab("Imagen PNG (diapositiva actual)");
  expect([...png.bytes.subarray(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
  const pptx = await grab("Microsoft PowerPoint (.pptx)");
  expect(pptx.name).toMatch(/\.pptx$/);
  expect(pptx.bytes.subarray(0, 2).toString()).toBe("PK");
  expect(pptx.bytes.toString("latin1")).toContain("ppt/slides/slide2.xml");
  // reimportar
  const chooser = slides.waitForEvent("filechooser");
  await menu(slides, "Archivo", "Importar diapositivas");
  await (await chooser).setFiles({ name: "vuelta.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: pptx.bytes });
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(4, { timeout: 15_000 });
  await expect(slides.locator(".sl-film-list").getByRole("option").nth(2)).toContainText("Exportar ORVUPI");
});

test("historial de versiones y combinaciones de teclas", async ({ page }) => {
  const slides = await openSlides(page);
  await menu(slides, "Archivo", "Historial de versiones");
  const dialog = slides.getByRole("dialog", { name: "Historial de versiones" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".sl-versions li").first()).toBeVisible();
  await slides.keyboard.press("Escape");
  await menu(slides, "Ayuda", "Combinaciones de teclas");
  await expect(slides.getByRole("dialog", { name: "Combinaciones de teclas" })).toContainText("Ctrl+M");
});

test("con el dedo: tocar, escribir y añadir diapositivas", async ({ page }) => {
  test.skip(!test.info().project.use.hasTouch, "solo en pantallas táctiles");
  const slides = await openSlides(page);
  const title = slides.locator(".sl-canvas").getByRole("button", { name: TITLE, exact: true });
  const b = await title.boundingBox();
  if (!b) throw new Error("sin título");
  await slides.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await expect(slides.locator(".sl-selbox")).toBeVisible();
  await slides.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await expect(slides.locator(".sl-canvas .sl-editable")).toBeVisible();
  await slides.keyboard.type("Táctil");
  await slides.keyboard.press("Escape");
  await expect(slides.locator(".sl-film-list").getByRole("option").first()).toContainText("Táctil");
  const add = slides.locator(".sl-film-add");
  const a = await add.boundingBox();
  if (!a) throw new Error("sin botón");
  await slides.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2);
  await expect(slides.locator(".sl-film-list").getByRole("option")).toHaveCount(2);
  await noOverflow(slides);
  await shot(slides, "tactil");
});
