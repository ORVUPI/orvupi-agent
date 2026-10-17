import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "/opt/cursor/artifacts/screenshots";

async function openDoc(page: Page) {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  const doc = await opened;
  await expect(doc).toHaveURL(/\/document\/d\/[^/]+\/edit$/);
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  return { doc, editor };
}

async function writeSelection(doc: Page, editor: ReturnType<Page["locator"]>, text: string) {
  await editor.click();
  await doc.keyboard.type(text);
  await doc.keyboard.press("Control+a");
}

async function shot(doc: Page, name: string) {
  await mkdir(SHOTS, { recursive: true });
  await doc.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function insertTable(doc: Page, rows: number, cols: number) {
  await doc.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Insertar tabla" }).click();
  await doc.getByRole("gridcell", { name: `${rows} × ${cols}`, exact: true }).click();
  await expect(doc.locator(".ProseMirror table")).toBeVisible();
}

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
});

test("la rejilla inserta las filas y columnas elegidas", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 3);
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(2);
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(3);
  await shot(doc, "041-tabla-rejilla");
});

test("el clic derecho inserta una fila arriba y otra debajo", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar fila arriba" }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(3);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar fila debajo" }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(4);
  await shot(doc, "041-filas");
});

test("el clic derecho inserta columnas a izquierda y derecha", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar columna a la izquierda" }).click();
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(3);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar columna a la derecha" }).click();
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(4);
  await shot(doc, "041-columnas");
});

test("el clic derecho elimina fila, columna y tabla", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Eliminar fila" }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(1);
  await doc.locator(".ProseMirror th").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Eliminar columna" }).click();
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(1);
  await doc.locator(".ProseMirror th").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Eliminar tabla" }).click();
  await expect(doc.locator(".ProseMirror table")).toHaveCount(0);
  await shot(doc, "041-eliminar-tabla");
});

test("mayús+clic combina celdas y separar las divide", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  const cells = doc.locator(".ProseMirror td");
  await cells.nth(0).click();
  await cells.nth(1).click({ modifiers: ["Shift"] });
  await cells.nth(1).click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Combinar celdas" }).click();
  await expect(doc.locator(".ProseMirror td[colspan='2']")).toHaveCount(1);
  await shot(doc, "041-combinar");
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Separar celdas" }).click();
  await expect(doc.locator(".ProseMirror td[colspan='2']")).toHaveCount(0);
  await expect(doc.locator(".ProseMirror td")).toHaveCount(2);
  await shot(doc, "041-separar");
});

test("arrastrar selecciona celdas y las combina", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  const cells = doc.locator(".ProseMirror th");
  const start = await cells.nth(0).boundingBox();
  const end = await cells.nth(1).boundingBox();
  if (!start || !end) throw new Error("celdas");
  await doc.mouse.move(start.x + 16, start.y + 12);
  await doc.mouse.down();
  await doc.mouse.move(end.x + end.width - 16, end.y + 12, { steps: 8 });
  await doc.mouse.up();
  await cells.nth(1).click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Combinar celdas" }).click();
  await expect(doc.locator(".ProseMirror th[colspan='2']")).toHaveCount(1);
  await shot(doc, "041-arrastre");
});

test("las propiedades cambian el borde y el fondo de la celda", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("button", { name: "Color del borde #1d4e89" }).click();
  await expect.poll(async () => doc.locator(".ProseMirror table").evaluate((element) => (element as HTMLElement).style.getPropertyValue("--table-border"))).toBe("#1d4e89");
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("button", { name: "Color de fondo de la celda #fff4b8" }).click();
  await expect(doc.locator(".ProseMirror td").first()).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await shot(doc, "041-propiedades");
});

test("arrastrar el borde cambia el ancho de la columna", async ({ page }) => {
  const { doc } = await openDoc(page);
  await insertTable(doc, 2, 2);
  const cell = doc.locator(".ProseMirror th").first();
  const before = await doc.locator(".ProseMirror col").first().getAttribute("style");
  const box = await cell.boundingBox();
  if (!box) throw new Error("celda");
  await doc.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await doc.mouse.down();
  await doc.mouse.move(box.x + box.width + 80, box.y + box.height / 2, { steps: 10 });
  await doc.mouse.up();
  await expect.poll(async () => doc.locator(".ProseMirror col").first().getAttribute("style")).not.toBe(before);
  await shot(doc, "041-ancho");
});

test("la fuente se aplica y el desplegable muestra la de la selección", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Fuente");
  await doc.getByRole("button", { name: "Fuente Arial" }).click();
  await doc.getByRole("option", { name: "Times New Roman" }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /Times New Roman/);
  await expect(doc.getByRole("button", { name: "Fuente Times New Roman" })).toBeVisible();
  await doc.getByRole("button", { name: "Fuente Times New Roman" }).click();
  await doc.getByRole("option", { name: "Roboto" }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /Roboto/);
  await expect(doc.getByRole("button", { name: "Fuente Roboto" })).toBeVisible();
  await shot(doc, "041-fuente");
});

test("el tamaño baja, sube, acepta un número y una medida de la lista", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Tamaño");
  const field = doc.getByRole("textbox", { name: "Tamaño del texto" });
  await expect(field).toHaveValue("11");
  await doc.getByRole("button", { name: "Aumentar tamaño" }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /font-size:\s*12pt/);
  await expect(field).toHaveValue("12");
  await doc.getByRole("button", { name: "Reducir tamaño" }).click();
  await expect(field).toHaveValue("11");
  await field.click();
  await field.fill("30");
  await field.press("Enter");
  await expect(editor.locator("span").first()).toHaveAttribute("style", /font-size:\s*30pt/);
  await field.click();
  await doc.getByRole("option", { name: "96", exact: true }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /font-size:\s*96pt/);
  await expect(field).toHaveValue("96");
  await shot(doc, "041-tamano");
});

test("negrita, cursiva, subrayado y tachado marcan el botón y el atajo", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Formato");
  await doc.getByRole("button", { name: "Negrita" }).click();
  await expect(editor.locator("strong")).toHaveText("Formato");
  await expect(doc.getByRole("button", { name: "Negrita" })).toHaveAttribute("aria-pressed", "true");
  await doc.keyboard.press("Control+b");
  await expect(editor.locator("strong")).toHaveCount(0);
  await doc.keyboard.press("Control+b");
  await expect(editor.locator("strong")).toHaveText("Formato");
  await doc.getByRole("button", { name: "Cursiva" }).click();
  await expect(editor.locator("em")).toContainText("Formato");
  await expect(doc.getByRole("button", { name: "Cursiva" })).toHaveAttribute("aria-pressed", "true");
  await doc.keyboard.press("Control+i");
  await expect(editor.locator("em")).toHaveCount(0);
  await doc.getByRole("button", { name: "Subrayado" }).click();
  await expect(editor.locator(".ow-ul")).toContainText("Formato");
  await expect(doc.getByRole("button", { name: "Subrayado" })).toHaveAttribute("aria-pressed", "true");
  await doc.keyboard.press("Control+u");
  await expect(editor.locator(".ow-ul")).toHaveCount(0);
  await doc.getByRole("button", { name: "Tachado" }).click();
  await expect(editor.locator("s")).toContainText("Formato");
  await expect(doc.getByRole("button", { name: "Tachado" })).toHaveAttribute("aria-pressed", "true");
  await doc.keyboard.press("Alt+Shift+Digit5");
  await expect(editor.locator("s")).toHaveCount(0);
  await doc.keyboard.press("Alt+Shift+Digit5");
  await expect(editor.locator("s")).toContainText("Formato");
  await shot(doc, "041-marcas");
});

test("el color del texto y el resaltado aplican la cuadrícula y un color propio", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Color");
  const colored = editor.locator("span").first();
  await doc.getByRole("button", { name: "Color del texto" }).click();
  await doc.getByRole("menuitem", { name: "#cc0000" }).click();
  await expect(colored).toHaveCSS("color", "rgb(204, 0, 0)");
  await doc.getByRole("button", { name: "Color del texto" }).click();
  await doc.getByLabel("Color personalizado").fill("#123456");
  await expect(colored).toHaveCSS("color", "rgb(18, 52, 86)");
  await doc.getByRole("button", { name: "Resaltado" }).click();
  await doc.getByRole("menuitem", { name: "#fff4b8" }).click();
  await expect(colored).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await doc.getByRole("button", { name: "Resaltado" }).click();
  await doc.getByLabel("Color personalizado").fill("#cfe2f3");
  await expect(colored).toHaveCSS("background-color", "rgb(207, 226, 243)");
  await shot(doc, "041-color");
});

test("la alineación aplica las cuatro opciones y los atajos", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Alineado");
  await doc.getByRole("button", { name: "Alineación Alinear a la izquierda" }).click();
  await doc.getByRole("option", { name: "Centrar" }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*center/);
  await expect(doc.getByRole("button", { name: "Alineación Centrar" })).toBeVisible();
  await editor.click();
  await doc.keyboard.press("Control+a");
  await doc.keyboard.press("Control+Shift+R");
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*right/);
  await doc.keyboard.press("Control+Shift+J");
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*justify/);
  await doc.keyboard.press("Control+Shift+L");
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*left/);
  await doc.keyboard.press("Control+Shift+E");
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*center/);
  await shot(doc, "041-alineacion");
});

test("el estilo, el interlineado, las listas, la sangría y borrar formato cambian el DOM", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Titulo");
  await doc.getByRole("button", { name: "Estilo Texto normal" }).click();
  await doc.getByRole("option", { name: "Título", exact: true }).click();
  await expect(editor.locator("h1")).toHaveText("Titulo");
  await doc.getByRole("button", { name: "Interlineado 1.15" }).click();
  await doc.getByRole("option", { name: "2", exact: true }).click();
  await expect(editor.locator("h1")).toHaveAttribute("style", /line-height:\s*2/);
  await doc.getByRole("button", { name: "Aumentar sangría" }).click();
  await expect(editor.locator("h1")).toHaveAttribute("data-indent", "1");
  await doc.getByRole("button", { name: "Reducir sangría" }).click();
  await expect(editor.locator("h1")).not.toHaveAttribute("data-indent", /.+/);
  await doc.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(editor.locator("ul li").filter({ hasText: "Titulo" })).toBeVisible();
  await doc.getByRole("button", { name: "Lista numerada" }).click();
  await expect(editor.locator("ol li").filter({ hasText: "Titulo" })).toBeVisible();
  await doc.getByRole("button", { name: "Checklist" }).click();
  await expect(editor.locator("ul[data-type='taskList']")).toContainText("Titulo");
  await doc.getByRole("button", { name: "Negrita" }).click();
  await doc.getByRole("button", { name: "Borrar formato" }).click();
  await expect(editor.locator("strong")).toHaveCount(0);
  await expect(editor.locator("p").filter({ hasText: "Titulo" })).toBeVisible();
  await shot(doc, "041-parrafo");
});

test("enlace, imagen, comentario, imprimir y zoom hacen su acción", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await writeSelection(doc, editor, "Enlace");
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Enlace" }).click();
  await doc.getByLabel("Dirección del enlace").fill("https://orvupi.local/a");
  await doc.getByRole("button", { name: "Aplicar enlace" }).click();
  await expect(editor.locator("a")).toHaveAttribute("href", "https://orvupi.local/a");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const chooser = doc.waitForEvent("filechooser");
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Insertar imagen" }).click();
  await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: png });
  await expect(editor.locator("img")).toBeVisible();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Comentario" }).click();
  await doc.getByLabel("Nota local").fill("Nota de margen");
  await doc.getByRole("button", { name: "Aplicar" }).click();
  await expect(doc.getByText("Nota de margen")).toBeVisible();
  await doc.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "1";
    };
  });
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Imprimir" }).click();
  await expect(doc.locator("html")).toHaveAttribute("data-printed", "1");
  await doc.getByRole("button", { name: "Zoom 100%" }).click();
  await doc.getByRole("option", { name: "150%" }).click();
  await expect(doc.locator(".ow-docs-sheet")).toHaveAttribute("style", /zoom:\s*1\.5/);
  await shot(doc, "041-insertar");
});

test("copiar formato, deshacer y rehacer modifican el texto", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await editor.click();
  await doc.keyboard.type("Alpha Beta");
  await doc.keyboard.down("Shift");
  await doc.keyboard.down("Control");
  await doc.keyboard.press("ArrowLeft");
  await doc.keyboard.up("Control");
  await doc.keyboard.up("Shift");
  await doc.getByRole("button", { name: "Negrita" }).click();
  await expect(editor.locator("strong")).toHaveText("Beta");
  await doc.getByRole("button", { name: "Copiar formato" }).click();
  await editor.click();
  await doc.keyboard.press("Home");
  await doc.keyboard.down("Shift");
  await doc.keyboard.down("Control");
  await doc.keyboard.press("ArrowRight");
  await doc.keyboard.up("Control");
  await doc.keyboard.up("Shift");
  await expect(editor.locator("strong").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("button", { name: "Deshacer" }).click();
  await doc.getByRole("button", { name: "Deshacer" }).click();
  await doc.getByRole("button", { name: "Rehacer" }).click();
  await expect(editor).toContainText("Alpha Beta");
  await shot(doc, "041-formato-historial");
});

test("buscar, salto de página, ortografía, regla, modo, menús, versiones, atajos y extensiones responden", async ({ page }) => {
  const { doc, editor } = await openDoc(page);
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Buscar" }).click();
  await expect(doc.getByRole("textbox", { name: "Buscar" })).toBeVisible();
  await doc.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await doc.getByRole("menuitem", { name: "Insertar", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Salto de página" }).click();
  await expect(editor.locator("hr.ow-page-break")).toBeVisible();
  await doc.getByRole("button", { name: "Ortografía" }).click();
  await expect(editor).toHaveAttribute("spellcheck", "false");
  await doc.getByRole("menuitem", { name: "Ver", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Mostrar regla" }).click();
  await expect(doc.locator(".ow-hruler")).toHaveCount(0);
  await doc.getByRole("button", { name: "Modo Edición" }).click();
  await doc.getByRole("option", { name: "Visualización" }).click();
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await doc.getByRole("button", { name: "Modo Visualización" }).click();
  await doc.getByRole("option", { name: "Edición" }).click();
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await doc.getByRole("menuitem", { name: "Herramientas" }).click();
  await doc.getByRole("menuitem", { name: "Versiones" }).click();
  await doc.getByRole("button", { name: "Guardar versión" }).click();
  await expect(doc.getByRole("button", { name: "Restaurar esta versión" })).toBeVisible();
  await doc.keyboard.press("Escape");
  await doc.getByRole("menuitem", { name: "Ayuda" }).click();
  await doc.getByRole("menuitem", { name: "Atajos" }).click();
  await expect(doc.getByText("Alt + Mayús + 5 tacha")).toBeVisible();
  await doc.keyboard.press("Escape");
  await doc.getByRole("menuitem", { name: "Extensiones" }).click();
  await expect(doc.getByText("No hay extensiones en este dispositivo")).toBeVisible();
  await doc.keyboard.press("Escape");
  await doc.getByRole("button", { name: "Ocultar menús" }).click();
  await expect(doc.locator(".ow-docs-toolbar")).toHaveCount(0);
  await doc.getByRole("button", { name: "Mostrar menús" }).click();
  await expect(doc.locator(".ow-docs-toolbar")).toBeVisible();
  await shot(doc, "041-resto");
});
