import { devices, expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";
const pixel7 = devices["Pixel 7"];
const ANDROID = {
  userAgent: pixel7.userAgent,
  deviceScaleFactor: pixel7.deviceScaleFactor,
  viewport: { width: 460, height: 900 },
  isMobile: true,
  hasTouch: true,
};

async function openTool(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name, exact: true }).click();
  const popup = await opened;
  await popup.waitForLoadState("domcontentloaded");
  if (page.viewportSize()?.width && page.viewportSize()!.width < 800) await popup.setViewportSize({ width: 460, height: 900 });
  return popup;
}

async function shot(doc: Page, name: string) {
  await doc.screenshot({ path: `${await screenshotDir()}/${name}.png` });
}

async function handleOnCorner(sheet: Page) {
  const gap = await sheet.evaluate(() => {
    const cell = document.querySelector('button.ow-cell[aria-pressed="true"]');
    const handle = document.querySelector(".ow-range-handle");
    if (!(cell instanceof HTMLElement) || !(handle instanceof HTMLElement)) return 99;
    const box = cell.getBoundingClientRect();
    const knob = handle.getBoundingClientRect();
    const dy = Math.abs(knob.top + knob.height / 2 - box.bottom);
    const dx = Math.abs(knob.left + knob.width / 2 - box.right);
    return Math.max(dy, dx);
  });
  expect(gap).toBeLessThanOrEqual(2);
}

async function pick(doc: Page, menu: string, item: string) {
  await doc.getByRole("menuitem", { name: menu, exact: true }).click();
  const pattern = new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
  await doc.getByRole("menuitem", { name: pattern }).click();
}

async function touchDrag(doc: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const client = await doc.context().newCDPSession(doc);
  const point = (x: number, y: number) => ({ x: Math.round(x), y: Math.round(y), id: 1 });
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(from.x, from.y)] });
  for (let step = 1; step <= 8; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [point(from.x + ((to.x - from.x) * step) / 8, from.y + ((to.y - from.y) * step) / 8)],
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test.beforeAll(async () => {
  await screenshotDir();
});

test("la barra cambia el texto seleccionado", async ({ page }) => {
  const doc = await openTool(page, "Nuevo documento");
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.type("Alpha Beta");
  await doc.keyboard.down("Shift");
  await doc.keyboard.down("Control");
  await doc.keyboard.press("ArrowLeft");
  await doc.keyboard.up("Control");
  await doc.keyboard.up("Shift");
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Negrita" }).click();
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
  await doc.keyboard.press("Control+a");
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Cursiva" }).click();
  await expect(editor.locator("em").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Subrayado" }).click();
  await expect(editor.locator(".ow-ul").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Tachado" }).click();
  await expect(editor.locator("s").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("button", { name: /^Fuente / }).click();
  await doc.getByRole("option", { name: "Georgia", exact: true }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /Georgia/);
  await doc.getByRole("button", { name: "Reducir tamaño" }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /font-size:\s*10pt/);
  await doc.getByRole("button", { name: "Aumentar tamaño" }).click();
  await doc.getByRole("button", { name: "Aumentar tamaño" }).click();
  await expect(editor.locator("span").first()).toHaveAttribute("style", /font-size:\s*12pt/);
  await doc.getByRole("button", { name: "Color del texto" }).click();
  await doc.getByRole("menuitem", { name: "#cc0000" }).click();
  await expect(editor.locator("span").first()).toHaveCSS("color", "rgb(204, 0, 0)");
  await doc.getByRole("button", { name: "Resaltado" }).click();
  await doc.getByRole("menuitem", { name: "#fff4b8" }).click();
  await expect(editor.locator("span").first()).toHaveCSS("background-color", "rgb(255, 244, 184)");
  for (const [name, tag] of [
    ["Título", "h1"],
    ["Subtítulo", "h2"],
    ["Encabezado", "h3"],
    ["Título 4", "h4"],
    ["Título 5", "h5"],
  ] as const) {
    await doc.getByRole("button", { name: /^Estilo / }).click();
    await doc.getByRole("option", { name, exact: true }).click();
    await expect(editor.locator(tag).filter({ hasText: "Alpha" })).toBeVisible();
  }
  await doc.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Estilo", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Título 6", exact: true }).click();
  await expect(editor.locator("h6").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("button", { name: /^Estilo / }).click();
  await doc.getByRole("option", { name: "Texto normal", exact: true }).click();
  await expect(editor.locator("p").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("button", { name: /^Alineación / }).click();
  await doc.getByRole("option", { name: "Centrar", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*center/);
  await doc.getByRole("button", { name: /^Alineación / }).click();
  await doc.getByRole("option", { name: "Alinear a la derecha", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*right/);
  await doc.getByRole("button", { name: /^Alineación / }).click();
  await doc.getByRole("option", { name: "Justificar", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*justify/);
  await doc.getByRole("button", { name: /^Alineación / }).click();
  await doc.getByRole("option", { name: "Alinear a la izquierda", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /text-align:\s*left/);
  await doc.getByRole("button", { name: /^Interlineado / }).click();
  await doc.getByRole("option", { name: "2", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("style", /line-height:\s*2/);
  await doc.getByRole("button", { name: "Aumentar sangría" }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("data-indent", "1");
  await doc.getByRole("button", { name: "Reducir sangría" }).click();
  await expect(editor.locator("p").first()).not.toHaveAttribute("data-indent", /.+/);
  await doc.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(editor.locator("ul li").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("button", { name: "Lista numerada" }).click();
  await expect(editor.locator("ol li").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Checklist" }).click();
  await expect(editor.locator("ul[data-type='taskList']")).toContainText("Alpha");
  await doc.getByRole("button", { name: "Borrar formato" }).click();
  await expect(editor.locator("strong")).toHaveCount(0);
  await expect(editor.locator("p").filter({ hasText: "Alpha" })).toBeVisible();
  await doc.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Lista", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Checklist", exact: true }).click();
  await expect(editor.locator("ul[data-type='taskList']")).toContainText("Alpha");
  await doc.getByRole("button", { name: "Borrar formato" }).click();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Enlace" }).click();
  await doc.getByLabel("Dirección del enlace").fill("https://orvupi.local/a");
  await doc.getByRole("button", { name: "Aplicar enlace" }).click();
  await expect(editor.locator("a")).toHaveAttribute("href", "https://orvupi.local/a");
  await doc.getByRole("button", { name: "Ortografía" }).click();
  await expect(editor).toHaveAttribute("spellcheck", "false");
  await doc.getByRole("button", { name: "Ortografía" }).click();
  await expect(editor).toHaveAttribute("spellcheck", "true");
  await doc.getByRole("button", { name: "Zoom 100%" }).click();
  await doc.getByRole("option", { name: "150%" }).click();
  await expect(doc.locator(".ow-docs-sheet")).toHaveAttribute("style", /zoom:\s*1\.5/);
  await doc.getByRole("button", { name: "Deshacer" }).click();
  await doc.getByRole("button", { name: "Rehacer" }).click();
  await expect(editor).toContainText("Alpha");
  await shot(doc, "070-barra");
});

test("insertar, la tabla y la página cambian el documento", async ({ page }) => {
  const doc = await openTool(page, "Nuevo documento");
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.type("Cuerpo");
  await doc.keyboard.press("Control+a");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const chooser = doc.waitForEvent("filechooser");
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Insertar imagen" }).click();
  await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: png });
  await expect(editor.locator("img")).toBeVisible();
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Comentario" }).click();
  await doc.getByLabel("Nota local").fill("Nota de margen");
  await doc.getByRole("button", { name: "Aplicar" }).click();
  await expect(doc.getByText("Nota de margen")).toBeVisible();
  await pick(doc, "Insertar", "Insertar tabla");
  await doc.getByRole("gridcell", { name: "4 × 5", exact: true }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(4);
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(5);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar fila debajo" }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(5);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Insertar columna a la derecha" }).click();
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(6);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Eliminar columna" }).click();
  await expect(doc.locator(".ProseMirror tr").first().locator("th, td")).toHaveCount(5);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Eliminar fila" }).click();
  await expect(doc.locator(".ProseMirror tr")).toHaveCount(4);
  const cells = doc.locator(".ProseMirror td");
  await cells.nth(0).click();
  await cells.nth(1).click({ modifiers: ["Shift"] });
  await cells.nth(1).click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Combinar celdas" }).click();
  await expect(doc.locator(".ProseMirror td[colspan='2']")).toHaveCount(1);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("menuitem", { name: "Separar celdas" }).click();
  await expect(doc.locator(".ProseMirror td[colspan='2']")).toHaveCount(0);
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("button", { name: "Color del borde #1d4e89" }).click();
  await expect.poll(async () => doc.locator(".ProseMirror table").evaluate((element) => (element as HTMLElement).style.getPropertyValue("--table-border"))).toBe("#1d4e89");
  await doc.locator(".ProseMirror td").first().click({ button: "right" });
  await doc.getByRole("button", { name: "Color de fondo de la celda #fff4b8" }).click();
  await expect(doc.locator(".ProseMirror td").first()).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await editor.click();
  await doc.keyboard.press("Control+End");
  await pick(doc, "Insertar", "Salto de página");
  await expect(editor.locator("hr.ow-page-break")).toBeVisible();
  await pick(doc, "Insertar", "Línea horizontal");
  await expect(editor.locator("hr:not(.ow-page-break)")).toBeVisible();
  await pick(doc, "Insertar", "Fecha");
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await expect(editor).toContainText(stamp);
  await pick(doc, "Insertar", "Caracteres especiales");
  await doc.getByRole("dialog", { name: "Caracteres especiales" }).getByRole("button", { name: "€" }).click();
  await expect(editor).toContainText("€");
  await pick(doc, "Insertar", "Encabezado");
  await doc.keyboard.type("Cabecera");
  await expect(doc.getByRole("textbox", { name: "Encabezado" })).toHaveValue("Cabecera");
  await pick(doc, "Insertar", "Pie");
  await doc.keyboard.type("Pie");
  await expect(doc.getByRole("textbox", { name: "Pie", exact: true })).toHaveValue("Pie");
  await pick(doc, "Insertar", "Número de página");
  await expect(doc.locator(".ow-page-num")).toHaveText("1");
  await editor.click();
  await doc.keyboard.press("Control+End");
  await doc.keyboard.press("Enter");
  await pick(doc, "Insertar", "Gráfico");
  await expect(editor.getByRole("img", { name: "Gráfico" })).toBeVisible();
  await pick(doc, "Insertar", "Dibujo");
  await expect(editor.getByRole("img", { name: "punto.png" })).toBeVisible();
  await expect(editor.getByRole("img", { name: "Gráfico" })).toBeVisible();
  await expect(editor.getByRole("img", { name: "Dibujo" })).toBeVisible();
  await pick(doc, "Insertar", "Ecuación");
  await expect(editor).toContainText("E = mc²");
  await pick(doc, "Insertar", "Marca de agua");
  await expect(doc.locator(".ow-watermark")).toHaveText("ORVUPI");
  await pick(doc, "Formato", "Columnas");
  await expect(doc.locator(".ow-a4")).toHaveClass(/is-cols-2/);
  await pick(doc, "Formato", "Letra capital");
  await expect(doc.locator(".ow-a4")).toHaveClass(/is-dropcap/);
  await pick(doc, "Archivo", "Configurar página");
  await doc.getByRole("button", { name: "Carta", exact: true }).click();
  await doc.getByRole("button", { name: "Horizontal", exact: true }).click();
  await doc.getByRole("button", { name: "Estrecho", exact: true }).click();
  await doc.getByRole("button", { name: "Aplicar", exact: true }).click();
  const paper = doc.locator(".ow-a4");
  await expect(paper).toHaveAttribute("data-page-size", "letter");
  await expect(paper).toHaveAttribute("data-page-orientation", "landscape");
  await expect(paper).toHaveAttribute("data-page-margin", "narrow");
  await expect(paper).toHaveCSS("width", "1056px");
  await expect(doc.locator(".ow-a4-body")).toHaveCSS("padding-top", "48px");
  await shot(doc, "070-insertar");
});

test("archivo, editar, ver, herramientas, extensiones y ayuda responden", async ({ page }) => {
  const doc = await openTool(page, "Nuevo documento");
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.type("alfa alfa");
  await doc.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await doc.getByRole("menuitem", { name: /^Buscar y reemplazar/ }).click();
  await doc.getByRole("textbox", { name: "Buscar" }).fill("alfa");
  await doc.getByRole("textbox", { name: "Reemplazar" }).fill("beta");
  await doc.getByRole("button", { name: "Reemplazar todo" }).click();
  await expect(editor).toContainText("beta beta");
  await expect(editor).not.toContainText("alfa");
  await doc.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await editor.click();
  await doc.keyboard.press("Control+a");
  await doc.keyboard.type("Hola");
  await pick(doc, "Herramientas", "Recuento de palabras");
  await expect(doc.getByRole("dialog", { name: "Recuento de palabras" })).toContainText("1 palabra");
  await doc.getByRole("dialog", { name: "Recuento de palabras" }).getByRole("button", { name: "Cerrar búsqueda" }).click();
  await pick(doc, "Ver", "Mostrar regla");
  await expect(doc.locator(".ow-hruler")).toHaveCount(0);
  await doc.getByRole("menuitem", { name: "Ver", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Zoom", exact: true }).click();
  await doc.getByRole("menuitem", { name: "75%", exact: true }).click();
  await expect(doc.locator(".ow-docs-sheet")).toHaveAttribute("style", /zoom:\s*0\.75/);
  await doc.getByRole("button", { name: "Modo Edición" }).click();
  await doc.getByRole("option", { name: "Visualización" }).click();
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await doc.getByRole("menuitem", { name: "Ver", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Modo", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Edición", exact: true }).click();
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await pick(doc, "Herramientas", "Versiones");
  await doc.getByRole("button", { name: "Guardar versión" }).click();
  await expect(doc.getByRole("button", { name: "Restaurar esta versión" })).toBeVisible();
  await doc.keyboard.press("Escape");
  await pick(doc, "Ayuda", "Atajos");
  await expect(doc.getByText("Alt + Mayús + 5 tacha")).toBeVisible();
  await doc.keyboard.press("Escape");
  await expect(doc.getByRole("menuitem", { name: "Extensiones", exact: true })).toHaveCount(0);
  await doc.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "1";
    };
  });
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Imprimir" }).click();
  await pick(doc, "Archivo", "Imprimir");
  await expect(doc.locator("html")).toHaveAttribute("data-printed", "1");
  const download = doc.waitForEvent("download");
  await doc.getByRole("menuitem", { name: "Archivo", exact: true }).click();
  await doc.getByRole("menuitem", { name: "Exportar", exact: true }).click();
  await doc.getByRole("menuitem", { name: "TXT", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await doc.locator(".ow-docs-toolbar").getByRole("button", { name: "Buscar" }).click();
  await expect(doc.getByRole("textbox", { name: "Buscar" })).toBeVisible();
  await doc.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await doc.getByRole("button", { name: "Ocultar menús" }).click();
  await expect(doc.locator(".ow-docs-toolbar")).toHaveCount(0);
  await doc.getByRole("button", { name: "Mostrar menús" }).click();
  await expect(doc.locator(".ow-docs-toolbar")).toBeVisible();
  await shot(doc, "070-menus");
});

test.describe("teléfono", () => {
  test.use(ANDROID);

  test("el dedo selecciona el texto y no lo tapa la barra", async ({ page }) => {
    const doc = await openTool(page, "Nuevo documento");
    const editor = doc.locator(".ProseMirror");
    await expect(doc.locator(".ow-docs")).toHaveAttribute("data-layout", "mobile");
    await editor.click();
    await doc.keyboard.type("Seleccion");
    const word = editor.locator("p").first();
    const box = await word.boundingBox();
    const dock = await doc.locator(".ow-format-dock").boundingBox();
    if (!box || !dock) throw new Error("texto");
    expect(box.y + box.height).toBeLessThan(dock.y);
    const hit = await doc.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".ProseMirror") != null, { x: box.x + 12, y: box.y + box.height / 2 });
    expect(hit).toBe(true);
    const style = await editor.evaluate((element) => getComputedStyle(element).userSelect);
    expect(style).toBe("text");
    const blocked = await editor.evaluate((element) => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 0 });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(blocked).toBe(false);
    await touchDrag(doc, { x: box.x + 4, y: box.y + box.height / 2 }, { x: box.x + box.width - 4, y: box.y + box.height / 2 });
    await expect.poll(async () => doc.evaluate(() => window.getSelection()?.toString() ?? "")).toContain("Seleccion");
    await shot(doc, "070-seleccion");
  });

  test("en una tabla el dedo y el asa combinan celdas", async ({ page }) => {
    const doc = await openTool(page, "Nuevo documento");
    await doc.locator(".ow-menu-overflow").click();
    await doc.getByRole("menuitem", { name: "Insertar", exact: true }).click();
    await doc.getByRole("menuitem", { name: "Insertar tabla", exact: true }).click();
    await doc.getByRole("gridcell", { name: "2 × 2", exact: true }).click();
    const cells = doc.locator(".ProseMirror td");
    await cells.nth(0).click();
    const handle = doc.getByRole("button", { name: "Asa de selección" }).last();
    await expect(handle).toBeVisible();
    const from = await handle.boundingBox();
    const target = await cells.nth(1).boundingBox();
    if (!from || !target) throw new Error("asa");
    await touchDrag(doc, { x: from.x + from.width / 2, y: from.y + from.height / 2 }, { x: target.x + target.width / 2, y: target.y + target.height / 2 });
    await expect(doc.locator(".ProseMirror .selectedCell")).toHaveCount(2);
    await cells.nth(0).click();
    const start = await cells.nth(0).boundingBox();
    const end = await cells.nth(1).boundingBox();
    if (!start || !end) throw new Error("celdas");
    await touchDrag(doc, { x: start.x + start.width / 2, y: start.y + start.height / 2 }, { x: end.x + end.width / 2, y: end.y + end.height / 2 });
    await expect(doc.locator(".ProseMirror .selectedCell")).toHaveCount(2);
    await doc.locator(".ow-format-dock").getByRole("button", { name: "Combinar celdas" }).click();
    await expect(doc.locator(".ProseMirror td[colspan='2']")).toHaveCount(1);
    await shot(doc, "070-combinar-docs");
  });

  test("en Hojas el dedo y el asa marcan un rango y lo combinan", async ({ page }) => {
    const sheet = await openTool(page, "Nueva hoja");
    const a1 = sheet.getByRole("button", { name: "A1", exact: true });
    await expect(a1).toHaveAttribute("aria-pressed", "true");
    await handleOnCorner(sheet);
    const b1 = sheet.getByRole("button", { name: "B1", exact: true });
    const from = await a1.boundingBox();
    const to = await b1.boundingBox();
    if (!from || !to) throw new Error("rejilla");
    await touchDrag(sheet, { x: from.x + from.width / 2, y: from.y + from.height / 2 }, { x: to.x + to.width / 2, y: to.y + to.height / 2 });
    await expect(a1).toHaveAttribute("data-range", "true");
    await expect(b1).toHaveAttribute("data-range", "true");
    await sheet.getByRole("button", { name: "Combinar celdas" }).click();
    await expect(sheet.getByRole("button", { name: "B1", exact: true })).toHaveCount(0);
    await expect(a1).toHaveCSS("width", "184px");
    await sheet.getByRole("button", { name: "A2", exact: true }).click();
    await handleOnCorner(sheet);
    const handle = await sheet.getByRole("button", { name: "Asa de selección" }).boundingBox();
    const b2 = await sheet.getByRole("button", { name: "B2", exact: true }).boundingBox();
    if (!handle || !b2) throw new Error("asa");
    await touchDrag(sheet, { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }, { x: b2.x + 24, y: b2.y + 12 });
    await expect(sheet.getByRole("button", { name: "B2", exact: true })).toHaveAttribute("data-range", "true");
    await sheet.getByRole("button", { name: "Combinar celdas" }).click();
    await expect(sheet.getByRole("button", { name: "B2", exact: true })).toHaveCount(0);
    await shot(sheet, "070-combinar-hojas");
  });
});
