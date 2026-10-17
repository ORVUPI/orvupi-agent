import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "/opt/cursor/artifacts/screenshots";
const WIDTHS = [360, 390, 412, 460, 768];
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function shot(page: Page, name: string) {
  if (test.info().project.name !== "pixel-7") return;
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

async function fits(page: Page, label: string) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const root = document.documentElement;
      const scroll = document.querySelector(".ow-docs-scroll");
      const rootGap = root.scrollWidth - root.clientWidth;
      const scrollStyle = scroll ? getComputedStyle(scroll) : null;
      const docsGap = scroll && scrollStyle && scrollStyle.overflowX !== "clip" && scrollStyle.overflowX !== "hidden"
        ? scroll.scrollWidth - scroll.clientWidth
        : 0;
      const pageBox = document.querySelector(".ow-a4")?.getBoundingClientRect();
      const pageGap = pageBox ? Math.max(0, pageBox.right - window.innerWidth, -pageBox.left) : 0;
      return Math.max(rootGap, docsGap, pageGap);
    });
  }, { message: label, timeout: 8_000 }).toBeLessThanOrEqual(2);
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((item) => `${item.id} ${item.help} ${item.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function openHomeTool(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name, exact: true }).click();
  const tool = await opened;
  await tool.waitForLoadState("domcontentloaded");
  return tool;
}

async function menu(page: Page, name: string, item: string | RegExp) {
  await page.getByRole("menuitem", { name, exact: true }).click();
  await page.getByRole("menuitem", { name: item, exact: typeof item === "string" }).click();
}

test("el inicio y Drive caben, y el móvil tiene barra y botón Nuevo", async ({ page }) => {
  await page.goto("/");
  await fits(page, "inicio");
  const phone = (page.viewportSize()?.width ?? 1360) <= 768;
  if (phone) {
    await expect(page.locator(".ow-fab")).toBeVisible();
    await expect(page.locator(".ow-tabbar")).toBeVisible();
    await page.locator(".ow-fab").click();
    await expect(page.locator(".ow-fab-sheet").getByRole("menuitem", { name: "Documento", exact: true })).toBeVisible();
    await page.locator(".ow-fab").click();
    await page.locator(".ow-tabbar").getByRole("button", { name: "Más", exact: true }).click();
    const drawer = page.locator(".ow-sidebar.is-open");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Mi unidad", exact: true }).click();
  } else {
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad", exact: true }).click();
  }
  await expect(page.locator(".ow-drive-title")).toBeVisible();
  await fits(page, "drive");
  await axe(page);
  await shot(page, "060-drive");
});

test("Docs encaja, oculta la regla vertical y reserva sitio al teclado", async ({ page }) => {
  const docs = await openHomeTool(page, "Nuevo documento");
  if ((docs.viewportSize()?.width ?? 1360) > 800) await docs.setViewportSize({ width: 460, height: 820 });
  await expect(docs.locator(".ow-vruler")).toHaveCount(0);
  await expect(docs.locator(".ow-format-dock")).toBeVisible();
  await expect(docs.locator(".ow-docs-toolbar")).toBeVisible();
  const pageBox = await docs.locator(".ow-a4").boundingBox();
  const viewport = docs.viewportSize();
  if (!pageBox || !viewport) throw new Error("la hoja no está en pantalla");
  expect(pageBox.x).toBeGreaterThanOrEqual(-1);
  expect(pageBox.x + pageBox.width).toBeLessThanOrEqual(viewport.width + 2);
  await docs.getByRole("menuitem", { name: "Archivo", exact: true }).click();
  const menuBox = await docs.getByRole("menu", { name: "Archivo" }).boundingBox();
  if (!menuBox) throw new Error("el menú no se abrió");
  expect(menuBox.x).toBeGreaterThanOrEqual(-1);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height + 2);
  await docs.evaluate(() => window.dispatchEvent(new CustomEvent("ow-keyboard-inset", { detail: 280 })));
  await expect(docs.locator(".ow-docs-scroll")).toHaveCSS("padding-bottom", "344px");
  await fits(docs, "docs");
  await shot(docs, "060-docs");
  await axe(docs);
});

test("Docs inserta gráfico, dibujo, ecuación, marca, número, columnas y letra capital", async ({ page }) => {
  const docs = await openHomeTool(page, "Nuevo documento");
  await menu(docs, "Insertar", "Número de página");
  await expect(docs.locator(".ow-page-num")).toHaveText("1");
  await menu(docs, "Insertar", "Marca de agua");
  await expect(docs.locator(".ow-watermark")).toHaveText("ORVUPI");
  await menu(docs, "Insertar", "Ecuación");
  await expect(docs.getByText("E = mc²")).toBeVisible();
  await menu(docs, "Insertar", "Gráfico");
  await expect(docs.getByRole("img", { name: "Gráfico", exact: true })).toBeVisible();
  await menu(docs, "Insertar", "Dibujo");
  await expect(docs.getByRole("img", { name: "Dibujo", exact: true })).toBeVisible();
  await menu(docs, "Insertar", "Encabezado");
  await expect(docs.getByRole("textbox", { name: "Encabezado", exact: true })).toBeFocused();
  await menu(docs, "Formato", "Columnas");
  await expect(docs.locator(".ow-a4")).toHaveClass(/is-cols-2/);
  await menu(docs, "Formato", "Letra capital");
  await expect(docs.locator(".ow-a4")).toHaveClass(/is-dropcap/);
  await fits(docs, "docs funciones");
});

test("la hoja responde al dedo y cubre escala, nota, validación, macro y consulta", async ({ page }) => {
  const sheet = await openHomeTool(page, "Nueva hoja");
  await expect(sheet.getByRole("button", { name: /^A1(\s|$)/ })).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Fórmula o valor" })).toBeVisible();
  await expect(sheet.locator(".ow-sheet-cols")).toHaveCSS("position", "sticky");
  const wrap = sheet.locator(".ow-sheet-wrap");
  await wrap.evaluate((node) => {
    node.scrollLeft = 160;
  });
  await expect.poll(() => wrap.evaluate((node) => node.scrollLeft)).toBeGreaterThan(40);

  const formula = sheet.getByRole("textbox", { name: "Fórmula o valor" });
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await formula.fill("1");
  await sheet.getByRole("button", { name: /^A3(\s|$)/ }).click();
  await formula.fill("10");
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Escala de color", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A2 / })).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await expect(sheet.getByRole("button", { name: /^A3 / })).toHaveCSS("background-color", "rgb(11, 93, 54)");

  await sheet.getByRole("button", { name: /^F2(\s|$)/ }).click();
  await formula.fill("Ana");
  await sheet.getByRole("button", { name: /^F3(\s|$)/ }).click();
  await formula.fill("Luis");
  await sheet.getByRole("button", { name: /^H1(\s|$)/ }).click();
  await formula.fill("=CONSULTA(F2:F3)");
  await expect(sheet.getByRole("button", { name: /^H1 / })).toContainText("Ana | Luis");

  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("check");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByRole("checkbox", { name: "Casilla", exact: true }).check();
  await expect(sheet.getByRole("button", { name: /^A1 / })).toContainText("TRUE");

  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("date");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByLabel("Fecha", { exact: true }).fill("2026-10-17");
  await expect(sheet.getByRole("button", { name: /^B1 / })).toContainText("2026-10-17");

  await sheet.getByRole("button", { name: /^C1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("range");
  await sheet.locator("#ow-range-min").fill("1");
  await sheet.locator("#ow-range-max").fill("9");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByLabel("Intervalo", { exact: true }).fill("5");
  await expect(sheet.getByRole("button", { name: /^C1 / })).toContainText("5");

  await sheet.getByRole("button", { name: /^D1(\s|$)/ }).click();
  await menu(sheet, "Insertar", "Nota de celda");
  await sheet.getByRole("dialog").getByLabel("Nota de celda").fill("aviso");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^D1(\s|$)/ })).toHaveAttribute("title", "aviso");

  await sheet.getByRole("button", { name: /^E1(\s|$)/ }).click();
  const chooser = sheet.waitForEvent("filechooser");
  await menu(sheet, "Insertar", "Imagen en la celda");
  await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: TINY_PNG });
  await expect(sheet.getByRole("button", { name: /^E1(\s|$)/ })).toHaveCSS("background-image", /url\(/);

  await sheet.getByRole("button", { name: /^G1(\s|$)/ }).click();
  await sheet.getByRole("button", { name: "Negrita", exact: true }).click();
  await menu(sheet, "Herramientas", "Grabar macro");
  await sheet.getByRole("button", { name: /^G2(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Ejecutar macro");
  await expect(sheet.getByRole("button", { name: /^G2(\s|$)/ })).toHaveAttribute("data-bold", "true");

  await sheet.getByRole("button", { name: /^F2 / }).click();
  await menu(sheet, "Herramientas", "Tabla dinámica");
  await expect(sheet.getByRole("tab", { name: "Tabla dinámica" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByRole("button", { name: /^A2 / })).toContainText("Ana");
  await expect(sheet.getByRole("button", { name: /^B2 / })).toContainText("1");
  await expect(sheet.getByRole("button", { name: /^A3 / })).toContainText("Luis");
  await fits(sheet, "hoja");
  await shot(sheet, "060-sheets");
});

test("la presentación encaja, anima, muestra cuadrícula y patrón", async ({ page }) => {
  const slides = await openHomeTool(page, "Nueva presentación");
  const canvas = slides.locator(".ow-slide-canvas").last();
  const box = await canvas.boundingBox();
  const viewport = slides.viewportSize();
  if (!box || !viewport) throw new Error("falta el lienzo");
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  await expect(slides.locator(".ow-filmstrip")).toBeVisible();
  await menu(slides, "Formato", "Animar objeto");
  await expect(slides.locator(".ow-anim-fade").first()).toBeVisible();
  await menu(slides, "Ver", "Cuadrícula");
  await expect(slides.getByRole("list").getByRole("listitem").first()).toBeVisible();
  await menu(slides, "Ver", "Patrón");
  await expect(slides.locator(".ow-master")).toHaveText("Patrón");
  await fits(slides, "presentación");
  await axe(slides);
  await shot(slides, "060-slides");
});

test("el formulario acepta un archivo y un vídeo locales", async ({ page }) => {
  const form = await openHomeTool(page, "Nuevo formulario");
  await form.locator(".ow-form-card").getByLabel("Tipo").selectOption({ label: "Subida de archivo" });
  await form.getByRole("button", { name: "Vista previa", exact: true }).click();
  const file = form.locator(".ow-form-card input[type='file']");
  await file.setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  await expect(form.locator(".ow-form-card").getByText("nota.txt")).toBeVisible();
  await form.getByRole("button", { name: "Editar", exact: true }).click();
  await form.locator(".ow-form-card").getByLabel("Tipo").selectOption({ label: "Vídeo" });
  await form.getByRole("button", { name: "Vista previa", exact: true }).click();
  await expect(form.locator(".ow-form-card input[type='file']")).toHaveAttribute("accept", "video/*");
  await fits(form, "formulario");
  await axe(form);
  await shot(form, "060-forms");
});

test("el dibujo inserta texto decorado y un diagrama", async ({ page }) => {
  const drawing = await openHomeTool(page, "Nuevo dibujo");
  const canvas = drawing.locator(".ow-draw-canvas");
  const box = await canvas.boundingBox();
  const viewport = drawing.viewportSize();
  if (!box || !viewport) throw new Error("falta el lienzo");
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  await menu(drawing, "Insertar", "Texto decorado");
  await expect(canvas.getByRole("button", { name: "ORVUPI", exact: true })).toBeVisible();
  await menu(drawing, "Insertar", "Diagrama");
  await expect(canvas.getByRole("button", { name: "Forma" })).toHaveCount(2);
  await fits(drawing, "dibujo");
  await axe(drawing);
  await shot(drawing, "060-drawings");
});

test("las notas se filtran desde su propio buscador", async ({ page }) => {
  const notes = await openHomeTool(page, "Nueva nota");
  await notes.locator(".ow-note-editor").getByRole("textbox", { name: "Nombre del archivo", exact: true }).fill("faro");
  await expect(notes.locator(".ow-note-editor").getByRole("status")).toHaveText("Cambios pendientes");
  await expect(notes.locator(".ow-note-editor").getByRole("status")).toHaveText("Guardado");
  await notes.getByLabel("Buscar en notas", { exact: true }).fill("faro");
  await expect(notes.locator(".ow-note-card", { hasText: "faro" })).toBeVisible();
  await notes.getByLabel("Buscar en notas", { exact: true }).fill("zzz");
  await expect(notes.locator(".ow-note-card", { hasText: "faro" })).toHaveCount(0);
  await fits(notes, "notas");
  await axe(notes);
  await shot(notes, "060-notes");
});

test("no hay desbordamiento en 360, 390, 412, 460 ni 768", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Pixel 7 e iPhone 14 ya comprueban su propio ancho");
  test.setTimeout(180_000);
  await page.goto("/");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await fits(page, `inicio ${width}`);
  }
  const tools = ["Nuevo documento", "Nueva hoja", "Nueva presentación", "Nuevo formulario", "Nuevo dibujo", "Nueva nota"] as const;
  for (const name of tools) {
    await page.setViewportSize({ width: 1360, height: 900 });
    const tool = await openHomeTool(page, name);
    for (const width of WIDTHS) {
      await tool.setViewportSize({ width, height: 800 });
      await fits(tool, `${name} ${width}`);
    }
    await tool.close();
  }
});
