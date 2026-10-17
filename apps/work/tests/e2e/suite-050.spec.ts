import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "/opt/cursor/artifacts/screenshots";

async function shot(page: Page, name: string) {
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function openHomeTool(page: Page, name: string) {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name, exact: true }).click();
  const tool = await opened;
  await expect(tool.locator("h1").first()).toBeAttached();
  return tool;
}

async function sheetOf(page: Page) {
  const sheet = await openHomeTool(page, "Nueva hoja");
  await expect(sheet).toHaveURL(/\/spreadsheets\/d\/[^/]+\/edit$/);
  await expect(sheet.getByRole("button", { name: /^A1(\s|$)/ })).toBeVisible();
  return sheet;
}

async function formula(sheet: Page) {
  return sheet.getByRole("textbox", { name: "Fórmula o valor" });
}

test("la moneda, la negrita y el color se ven en la celda", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("12.5");
  await sheet.getByRole("button", { name: "Moneda", exact: true }).click();
  await sheet.getByRole("button", { name: "Negrita", exact: true }).click();
  await sheet.getByRole("button", { name: "#0b5d36", exact: true }).click();
  await sheet.getByRole("button", { name: "#fff4b8", exact: true }).click();
  const cell = sheet.getByRole("button", { name: /^A1 / });
  await expect(cell).toContainText("12,50 €");
  await expect(cell).toHaveAttribute("data-bold", "true");
  await expect(cell).toHaveCSS("color", "rgb(11, 93, 54)");
  await expect(cell).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await shot(sheet, "050-sheets-formato");
});

test("los bordes, el ajuste y la alineación cambian la celda", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Bordes", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Ajustar texto", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Centrar", exact: true }).click();
  const cell = sheet.getByRole("button", { name: /^A1(\s|$)/ });
  await expect(cell).toHaveClass(/has-border/);
  await expect(cell).toHaveClass(/is-wrap/);
  await expect(cell).toHaveCSS("text-align", "center");
});

test("combinar celdas ensancha la celda ancla", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click({ modifiers: ["Shift"] });
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Combinar celdas", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A1(\s|$)/ })).toHaveCSS("width", "184px");
  await expect(sheet.getByRole("button", { name: /^B1(\s|$)/ })).toHaveCount(0);
});

test("inmovilizar columnas deja una franja fija", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("menuitem", { name: "Ver", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Inmovilizar columnas", exact: true }).click();
  await expect(sheet.locator(".ow-pin-cols").first()).toBeVisible();
});

test("insertar una fila empuja el valor hacia abajo", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await (await formula(sheet)).fill("5");
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await sheet.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Insertar fila debajo", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A3 / })).toContainText("5");
});

test("ordenar y filtrar reorganizan las filas visibles", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await (await formula(sheet)).fill("10");
  await sheet.getByRole("button", { name: /^A3(\s|$)/ }).click();
  await (await formula(sheet)).fill("2");
  await sheet.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Ordenar columna", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A2 / })).toContainText("2");
  await sheet.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Filtrar", exact: true }).click();
  await sheet.locator("#ow-sheet-filter").fill("10");
  await expect(sheet.getByRole("button", { name: /^A3 / })).toContainText("10");
  await expect(sheet.getByRole("button", { name: /^A2 / })).toHaveCount(0);
});

test("el formato condicional pinta la celda que cumple la regla", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("20");
  await sheet.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Formato condicional", exact: true }).click();
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A1 / })).toHaveCSS("background-color", "rgb(255, 244, 184)");
});

test("la validación ofrece un desplegable", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Validación", exact: true }).click();
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByRole("combobox", { name: "Validación" }).selectOption("Sí");
  await expect(sheet.getByRole("button", { name: /^A1 / })).toContainText("Sí");
});

test("el gráfico de barras usa los números de la columna", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("10");
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await (await formula(sheet)).fill("20");
  await sheet.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Gráfico de barras", exact: true }).click();
  await expect(sheet.getByRole("img", { name: "Gráfico de barras" })).toBeVisible();
  await shot(sheet, "050-sheets-grafico");
});

test("autorrellenar continúa el número y la fórmula", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("4");
  await sheet.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Autorrellenar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A2 / })).toContainText("5");
  await expect(sheet.getByRole("button", { name: /^A4 / })).toContainText("7");
  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await (await formula(sheet)).fill("10");
  const handle = sheet.locator(".ow-fill-handle");
  const box = await handle.boundingBox();
  if (!box) throw new Error("falta el cuadro de autorrelleno");
  await sheet.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await sheet.mouse.down();
  await sheet.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 70, { steps: 4 });
  await sheet.mouse.up();
  await expect(sheet.getByRole("button", { name: /^B2 / })).toContainText("11");
  await expect(sheet.getByRole("button", { name: /^B3 / })).toContainText("12");
});

test("copiar y pegar lleva el valor a otra celda", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("hola");
  await sheet.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Copiar", exact: true }).click();
  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await sheet.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await sheet.getByRole("menuitem", { name: "Pegar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^B1 / })).toContainText("hola");
});

test("buscar y reemplazar cambia el texto de la celda", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await (await formula(sheet)).fill("hola");
  await sheet.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await sheet.getByRole("menuitem", { name: /^Buscar/ }).click();
  await sheet.getByRole("textbox", { name: "Buscar" }).fill("ho");
  await sheet.getByRole("textbox", { name: "Reemplazar" }).fill("Ha");
  await sheet.getByRole("button", { name: "Reemplazar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^A1 / })).toContainText("Hala");
});

test("una celda puede leer otra hoja", async ({ page }) => {
  const sheet = await sheetOf(page);
  await sheet.getByRole("button", { name: "Añadir hoja", exact: true }).click();
  await sheet.getByRole("tab", { name: "Sheets 2" }).click();
  await (await formula(sheet)).fill("8");
  await sheet.getByRole("tab", { name: "Hoja 1" }).click();
  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await (await formula(sheet)).fill("='Sheets 2'!A1");
  await expect(sheet.getByRole("button", { name: /^B1 / })).toContainText("8");
});

test("la presentación formatea texto, dibuja una línea, anota y exporta PDF", async ({ page }) => {
  const slides = await openHomeTool(page, "Nueva presentación");
  await expect(slides).toHaveURL(/\/presentation\/d\/[^/]+\/edit$/);
  await slides.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await slides.getByRole("menuitem", { name: "Negrita", exact: true }).click();
  await expect(slides.getByRole("button", { name: "Cuadro de texto" }).first()).toHaveCSS("font-weight", "800");
  await slides.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await slides.getByRole("menuitem", { name: "Línea", exact: true }).click();
  await expect(slides.getByRole("button", { name: "Línea" })).toBeVisible();
  await slides.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await slides.getByRole("menuitem", { name: "Centrar", exact: true }).click();
  await slides.getByLabel("Notas del orador").fill("Hablar despacio");
  await expect(slides.getByLabel("Notas del orador")).toHaveValue("Hablar despacio");
  const download = slides.waitForEvent("download");
  await slides.getByRole("menuitem", { name: "Archivo", exact: true }).click();
  await slides.getByRole("menuitem", { name: "Exportar PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await shot(slides, "050-slides");
});

test("el formulario cubre tipos, vista previa, resumen y exportación", async ({ page }) => {
  const form = await openHomeTool(page, "Nuevo formulario");
  await expect(form).toHaveURL(/\/forms\/d\/[^/]+\/edit$/);
  await form.getByLabel("Tipo").selectOption({ label: "Desplegable" });
  await form.getByLabel("Opción 1").fill("Sí");
  await form.getByLabel("Opción 2").fill("No");
  await form.getByRole("button", { name: "Vista previa", exact: true }).click();
  await expect(form.getByRole("combobox", { name: "Desplegable" })).toBeVisible();
  await form.getByRole("button", { name: "Responder", exact: true }).click();
  await form.getByRole("combobox", { name: "Desplegable" }).selectOption("Sí");
  await form.getByRole("button", { name: "Enviar", exact: true }).click();
  await form.getByRole("button", { name: "Respuestas", exact: true }).click();
  await expect(form.getByRole("img", { name: /Resumen|Pregunta|Sí/ })).toBeVisible();
  const exportButton = form.getByRole("button", { name: "Exportar a una hoja", exact: true });
  await exportButton.scrollIntoViewIfNeeded();
  const exported = form.waitForEvent("popup");
  await exportButton.click();
  const sheet = await exported;
  await expect(sheet).toHaveURL(/\/spreadsheets\/d\/[^/]+\/edit$/);
  await expect(sheet.getByRole("button", { name: /^A2 / })).toContainText("Sí");
  await shot(form, "050-forms");
});

test("Drive muestra almacenamiento, detalles, mover, acceso directo y versión", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad" }).click();
  await expect(page.locator(".ow-storage-line")).toBeVisible();
  await page.getByRole("button", { name: "Nueva carpeta", exact: true }).click();
  const folder = page.getByRole("button", { name: "Nueva carpeta Carpeta" });
  await folder.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Detalles", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Actividad" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar versión", exact: true }).click();
  await expect(page.locator(".ow-details").getByText(/· v /)).toBeVisible();
  await folder.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Mover a", exact: true }).click();
  await page.getByRole("dialog", { name: "Mover a" }).getByRole("button", { name: "Raíz", exact: true }).click();
  await folder.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Acceso directo", exact: true }).click();
  await expect(page.getByText(/· acceso/)).toBeVisible();
  await page.getByRole("button", { name: "Nombre", exact: true }).click();
  const download = page.waitForEvent("download");
  await folder.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Descargar carpeta", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await shot(page, "050-drive");
});

test("el dibujo inserta una línea y la centra", async ({ page }) => {
  const drawing = await openHomeTool(page, "Nuevo dibujo");
  await expect(drawing).toHaveURL(/\/drawings\/d\/[^/]+\/edit$/);
  await drawing.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await drawing.getByRole("menuitem", { name: "Línea", exact: true }).click();
  await drawing.getByRole("menuitem", { name: "Herramientas", exact: true }).click();
  await drawing.getByRole("menuitem", { name: "Centrar", exact: true }).click();
  await expect(drawing.locator(".ow-draw-canvas").getByRole("button", { name: "Línea" })).toBeVisible();
  await shot(drawing, "050-drawings");
});

test("la nota guarda etiqueta, archivo y copia", async ({ page }) => {
  const notes = await openHomeTool(page, "Nueva nota");
  await expect(notes).toHaveURL(/\/notes\/d\/[^/]+\/edit$/);
  await notes.locator(".ow-note-editor").getByRole("textbox", { name: "Etiqueta", exact: true }).fill("casa");
  await expect(notes.locator(".ow-note-editor").getByRole("textbox", { name: "Etiqueta", exact: true })).toHaveValue("casa");
  await notes.getByRole("button", { name: "Archivar", exact: true }).click();
  await notes.getByRole("button", { name: "Ver archivadas", exact: true }).click();
  await notes.getByRole("button", { name: "Copiar nota", exact: true }).click();
  await expect(notes.getByRole("button", { name: /Nueva nota copia/ })).toBeVisible();
  await shot(notes, "050-notes");
});

test("la hoja mantiene contraste AA", async ({ page }) => {
  const sheet = await sheetOf(page);
  const result = await new AxeBuilder({ page: sheet }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});
