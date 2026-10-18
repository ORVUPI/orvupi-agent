import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { fixture082 } from "../fixtures/docx-082";
import { screenshotDir } from "./shots";

/**
 * 0.8.2: cuadros de texto y formas, notas al pie y finales, secciones con columnas y orientación,
 * comentarios en el margen, imágenes flotantes y párrafos y tablas partidos entre hojas.
 */

const REAL = process.env.ORVUPI_DOCX?.trim();
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function importDoc(page: Page, name: string, buffer: Buffer): Promise<Page> {
  await page.goto("/");
  const input = page.getByLabel("Subir archivo").first();
  const opened = page.waitForEvent("popup");
  await input.setInputFiles({ name, mimeType: DOCX, buffer });
  const doc = await opened;
  await doc.waitForURL(/\/document\/d\//, { timeout: 60_000 });
  await doc.waitForLoadState("domcontentloaded");
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  return doc;
}

async function newDoc(page: Page): Promise<Page> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.waitForURL(/\/document\/d\//, { timeout: 60_000 });
  await doc.waitForLoadState("domcontentloaded");
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  return doc;
}

async function shot(page: Page, name: string, fullPage = false) {
  const project = test.info().project.name;
  await page.screenshot({ path: join(await screenshotDir(), `082-${name}-${project}.png`), fullPage });
}

const paged = (page: Page) => page.locator(".ow-a4.is-paged").count().then((n) => n > 0);
const layout = (doc: Page, action: string) => doc.evaluate((value) => window.dispatchEvent(new CustomEvent("ow-layout", { detail: { action: value } })), action);

test("el DOCX de prueba trae formas, notas, secciones, comentarios, flotantes y tablas partidas", async ({ page }) => {
  test.setTimeout(150_000);
  const doc = await importDoc(page, "Prueba 082.docx", Buffer.from(fixture082()));
  const editor = doc.locator(".ProseMirror");
  // 1) Cuadros de texto y formas
  await expect(editor.locator(".ow-shape")).toHaveCount(5);
  await expect(editor.locator(".ow-shape.is-ellipse[data-wrap='behind']")).toHaveCount(1);
  await expect(editor.locator(".ow-shape").filter({ hasText: "Cuadro ORVUPI" })).toHaveAttribute("data-wrap", "square");
  // 5) Imágenes flotantes con cada ajuste
  for (const wrap of ["square", "topBottom", "behind", "front"]) await expect(editor.locator(`img[data-wrap='${wrap}']`)).toHaveCount(1);
  const square = await editor.locator("img[data-wrap='square']").evaluate((img) => getComputedStyle(img).float);
  expect(square).toBe("right");
  const behind = await editor.locator("img[data-wrap='behind']").evaluate((img) => [getComputedStyle(img).position, getComputedStyle(img).zIndex]);
  expect(behind).toEqual(["absolute", "-1"]);
  // 2) Notas
  await expect(editor.locator("sup.ow-fn:not(.is-end)")).toHaveText(["1", "2"]);
  await expect(editor.locator("sup.ow-fn.is-end")).toHaveText(["i"]);
  // 3) Secciones
  await expect(editor.locator("section.ow-sect")).toHaveCount(2);
  await expect(editor.locator("section.ow-sect[data-cols='2'][data-orient='landscape']")).toHaveCount(1);
  // 4) Comentarios
  const cards = doc.locator(".ow-cmt-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: "Revisa esta frase." })).toContainText("Hecho.");
  await expect(cards.filter({ hasText: "Ya está bien." })).toContainText("Resuelto");
  await expect(editor.locator(".ow-cmt[data-cid]").first()).toBeVisible();
  if (await paged(doc)) {
    // 2) Las notas al pie van al pie de su hoja; la nota final, tras el texto.
    await expect(editor.locator(".ow-pgap-notes, .ow-pfinal .ow-pgap-notes").filter({ hasText: "Primera nota al pie de ORVUPI." })).toHaveCount(1);
    await expect(editor.locator(".ow-endnotes")).toContainText("Nota final del documento.");
    // 6) Párrafo partido entre hojas y tabla partida con encabezado repetido.
    await expect.poll(() => editor.locator(".ow-pgap.is-inline").count()).toBeGreaterThan(0);
    await expect.poll(() => editor.locator("tr.ow-pgrow").count()).toBeGreaterThan(0);
    await expect(doc.locator(".ow-pgov .ow-pgov-head th").first()).toContainText("N.º");
    const pages = Number(await doc.locator(".ow-a4").getAttribute("data-pages"));
    expect(pages).toBeGreaterThanOrEqual(5);
    // La fila partida empieza en la hoja siguiente: debajo del hueco gris.
    const row = editor.locator("tr.ow-pgrow").first();
    const gapH = Number((await row.getAttribute("style"))?.match(/--pg:\s*(\d+)/)?.[1] ?? 0);
    expect(gapH).toBeGreaterThan(150);
    // Comentarios a la altura del texto en pantallas anchas.
    const wide = (doc.viewportSize()?.width ?? 0) >= 1180;
    if (wide) {
      const mark = await editor.locator(".ow-cmt[data-cid]").first().boundingBox();
      const card = await cards.first().boundingBox();
      expect(mark && card && Math.abs(card.y - mark.y) < 120).toBeTruthy();
      expect(card && mark && card.x > mark.x).toBeTruthy();
    }
  }
  await doc.waitForTimeout(400);
  await shot(doc, "fixture-p1");
  if (await paged(doc)) {
    await editor.locator(".ow-pgap.is-inline").first().evaluate((node) => node.scrollIntoView({ block: "center" }));
    await doc.waitForTimeout(300);
    await shot(doc, "parrafo-partido");
    await editor.locator("tr.ow-pgrow").first().evaluate((node) => node.scrollIntoView({ block: "center" }));
    await doc.waitForTimeout(300);
    await shot(doc, "tabla-encabezado");
    await editor.locator("section.ow-sect[data-cols='2']").evaluate((node) => node.scrollIntoView({ block: "start" }));
    await doc.waitForTimeout(300);
    await shot(doc, "seccion-columnas");
  } else {
    await editor.locator("img[data-wrap='square']").scrollIntoViewIfNeeded();
    await shot(doc, "flotantes");
    await cards.first().scrollIntoViewIfNeeded();
    await shot(doc, "comentarios");
  }
  // Persistencia: tras recargar sigue todo.
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/, { timeout: 15_000 });
  await doc.reload();
  await expect(doc.locator(".ProseMirror .ow-shape")).toHaveCount(5);
  await expect(doc.locator(".ProseMirror sup.ow-fn")).toHaveCount(3);
  await expect(doc.locator(".ProseMirror section.ow-sect")).toHaveCount(2);
  await expect(doc.locator(".ow-cmt-card")).toHaveCount(2);
});

test("en el editor se crean, editan y exportan formas, notas, secciones, comentarios y flotantes", async ({ page }) => {
  test.setTimeout(150_000);
  const doc = await newDoc(page);
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.type("Primer párrafo del documento con un comentario.");
  // Cuadro de texto desde el menú (escritorio) o la orden equivalente (teléfono).
  const menu = doc.getByRole("menubar");
  const insertMenu = menu.getByRole("menuitem", { name: "Insertar", exact: true });
  if (await insertMenu.isVisible().catch(() => false)) {
    await insertMenu.click();
    await doc.getByRole("menuitem", { name: "Cuadro de texto" }).click();
  } else {
    await layout(doc, "textbox");
  }
  const shapeDialog = doc.getByRole("dialog", { name: "Cuadro de texto" });
  await shapeDialog.getByLabel("Texto", { exact: true }).fill("Hola desde un cuadro");
  await shapeDialog.getByRole("button", { name: "Insertar" }).click();
  const shape = editor.locator(".ow-shape");
  await expect(shape).toHaveCount(1);
  await expect(shape).toHaveAttribute("data-wrap", "square");
  // El texto de la forma se edita dentro de la forma.
  const shapeText = shape.locator(".ow-shape-text");
  await shapeText.click();
  await doc.keyboard.press("End");
  await doc.keyboard.type(" editado");
  // El cuadro flota a la izquierda del párrafo: se pulsa en el texto, a la derecha.
  const para = editor.locator("p").first();
  const pbox = (await para.boundingBox())!;
  await para.click({ position: { x: pbox.width - 4, y: Math.min(8, pbox.height / 2) } });
  await expect(shapeText).toHaveText("Hola desde un cuadro editado");
  // Ajuste y desplazamiento: se selecciona la forma por su borde.
  const box = await shape.boundingBox();
  await doc.mouse.click(box!.x + 3, box!.y + 3);
  await layout(doc, "object");
  const objectDialog = doc.getByRole("dialog", { name: "Ajuste de texto y posición" });
  await objectDialog.getByLabel("Ajuste de texto").selectOption("topBottom");
  await objectDialog.getByLabel("Desplazamiento horizontal (px)").fill("40");
  await objectDialog.getByRole("button", { name: "Aplicar" }).click();
  await expect(shape).toHaveAttribute("data-wrap", "topBottom");
  await expect(shape).toHaveAttribute("data-ox", "40");
  // Nota al pie y nota final.
  await editor.locator("p").filter({ hasText: "Primer párrafo" }).click();
  await doc.keyboard.press("End");
  if (await insertMenu.isVisible().catch(() => false)) {
    await insertMenu.click();
    await doc.getByRole("menuitem", { name: "Nota al pie" }).click();
    await doc.getByLabel("Texto de la nota").fill("Nota creada en ORVUPI");
    await doc.getByRole("button", { name: "Añadir nota" }).click();
    await expect(editor.locator("sup.ow-fn:not(.is-end)")).toHaveText(["1"]);
  }
  await layout(doc, "endnote");
  await doc.getByLabel("Texto de la nota final").fill("Final creada");
  await doc.getByRole("button", { name: "Añadir nota" }).click();
  await expect(editor.locator("sup.ow-fn.is-end")).toHaveText(["i"]);
  // Editar la nota final pulsando su número.
  await editor.locator("sup.ow-fn.is-end").click();
  await doc.getByRole("textbox", { name: "Editar nota" }).fill("Final editada");
  await doc.getByRole("dialog", { name: "Editar nota" }).getByRole("button", { name: "Aplicar" }).click();
  await expect(editor.locator("sup.ow-fn.is-end")).toHaveAttribute("data-text", "Final editada");
  // Comentario con respuesta y resuelto.
  const first = editor.locator("p").filter({ hasText: "Primer párrafo" });
  await first.click();
  await doc.keyboard.press("End");
  await doc.keyboard.press("Shift+Home");
  await layoutComment(doc);
  await expect(editor.locator(".ow-cmt[data-cid]")).toHaveCount(1);
  const card = doc.locator(".ow-cmt-card");
  await expect(card).toHaveCount(1);
  await card.getByLabel("Responder").fill("Respuesta de prueba");
  await card.getByRole("button", { name: "Enviar" }).click();
  await expect(card).toContainText("Respuesta de prueba");
  await card.getByRole("button", { name: "Resolver" }).click();
  await expect(card).toContainText("Resuelto");
  await card.getByRole("button", { name: "Reabrir" }).click();
  await expect(card.getByLabel("Responder")).toBeVisible();
  // Sección a dos columnas, en horizontal.
  await editor.locator("p").filter({ hasText: "Primer párrafo" }).click();
  await layout(doc, "section");
  const sectionDialog = doc.getByRole("dialog", { name: "Sección: columnas y orientación" });
  await sectionDialog.getByLabel("Columnas", { exact: true }).selectOption("2");
  await sectionDialog.getByLabel("Orientación").selectOption("landscape");
  await sectionDialog.getByRole("button", { name: "Aplicar" }).click();
  await expect(editor.locator("section.ow-sect[data-cols='2'][data-orient='landscape']")).toHaveCount(1);
  await doc.waitForTimeout(300);
  await shot(doc, "editor");
  // Se guarda y se conserva al recargar.
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/, { timeout: 15_000 });
  await doc.reload();
  await expect(doc.locator(".ProseMirror .ow-shape .ow-shape-text")).toHaveText("Hola desde un cuadro editado");
  await expect(doc.locator(".ProseMirror sup.ow-fn.is-end")).toHaveAttribute("data-text", "Final editada");
  await expect(doc.locator(".ow-cmt-card")).toContainText("Respuesta de prueba");
  await expect(doc.locator(".ProseMirror section.ow-sect[data-cols='2']")).toHaveCount(1);
  // Exportar a DOCX: el archivo lleva la forma, las notas, el comentario con su respuesta y la sección.
  const download = doc.waitForEvent("download");
  const fileMenu = doc.getByRole("menubar").getByRole("menuitem", { name: "Archivo", exact: true });
  if (await fileMenu.isVisible().catch(() => false)) {
    await fileMenu.click();
    await doc.getByRole("menuitem", { name: /^(Exportar|Descargar)/ }).filter({ visible: true }).first().click();
    await doc.getByRole("menuitem", { name: /DOCX/ }).filter({ visible: true }).first().click();
    const file = await download;
    const bytes = await readFile((await file.path())!);
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    const text = bytes.toString("latin1");
    for (const part of ["word/footnotes.xml", "word/endnotes.xml", "word/comments.xml", "word/commentsExtended.xml"]) expect(text).toContain(part);
  } else {
    void download.catch(() => undefined);
  }
});

async function layoutComment(doc: Page) {
  const insertMenu = doc.getByRole("menubar").getByRole("menuitem", { name: "Insertar", exact: true });
  if (await insertMenu.isVisible().catch(() => false)) {
    await insertMenu.click();
    await doc.getByRole("menuitem", { name: "Comentario" }).click();
  } else {
    // Teléfono y tablet estrecha: ⋮ de la cabecera → Insertar → Comentario.
    await doc.locator(".ow-docs-titlebar button").filter({ visible: true }).last().click();
    await doc.getByRole("menuitem", { name: "Insertar", exact: true }).filter({ visible: true }).first().click();
    await doc.getByRole("menuitem", { name: "Comentario", exact: true }).filter({ visible: true }).first().click();
  }
  await doc.getByLabel("Nota local").fill("Comentario de prueba");
  await doc.getByRole("button", { name: "Aplicar" }).click();
}

test("documento real del usuario: sigue igual con la 0.8.2 (solo local, con ORVUPI_DOCX)", async ({ page }) => {
  test.skip(!REAL, "sin ORVUPI_DOCX");
  test.setTimeout(180_000);
  const doc = await importDoc(page, "Tarea 2.docx", await readFile(REAL!));
  const editor = doc.locator(".ProseMirror");
  await expect.poll(async () => editor.locator("img").evaluateAll((list) => list.filter((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0).length)).toBeGreaterThanOrEqual(22);
  await expect(editor.locator("strong").filter({ hasText: "Módulo:" })).toHaveCount(1);
  await doc.waitForTimeout(800);
  await shot(doc, "real-p1");
  if (await paged(doc)) {
    const pages = Number(await doc.locator(".ow-a4").getAttribute("data-pages"));
    test.info().annotations.push({ type: "pages", description: String(pages) });
    await doc.locator(".ow-docs-sheet").evaluate((node) => { (node as HTMLElement).style.zoom = "0.4"; });
    await doc.locator(".ow-docs-scroll").evaluate((node) => node.scrollTo(0, 0));
    await doc.waitForTimeout(500);
    await shot(doc, "real-paginas");
  }
});
