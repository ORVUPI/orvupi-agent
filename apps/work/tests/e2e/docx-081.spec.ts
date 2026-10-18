import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { docxFixture, FIXTURE_PNG } from "../fixtures/docx";
import { screenshotDir } from "./shots";

/** 0.8.1: importación DOCX fiel, vista paginada y pegar/arrastrar imágenes. */

const REAL = process.env.ORVUPI_DOCX?.trim();

async function importDoc(page: Page, name: string, buffer: Buffer): Promise<Page> {
  await page.goto("/");
  const input = page.getByLabel("Subir archivo").first();
  const opened = page.waitForEvent("popup");
  await input.setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
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
  await page.screenshot({ path: join(await screenshotDir(), `081-${name}-${project}.png`), fullPage });
}

async function imagesLoaded(doc: Page, min: number) {
  await expect.poll(async () => doc.locator(".ProseMirror img").evaluateAll((list) => list.filter((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0).length)).toBeGreaterThanOrEqual(min);
}

test("el DOCX se importa con negrita parcial, imagen, salto de página y páginas separadas", async ({ page }) => {
  const doc = await importDoc(page, "Informe.docx", Buffer.from(docxFixture()));
  const editor = doc.locator(".ProseMirror");
  await expect(editor.locator("h1")).toContainText("Informe");
  await expect(editor.locator("strong").filter({ hasText: /^negrita$/ })).toHaveCount(1);
  await expect(editor.locator("strong").filter({ hasText: "Texto con" })).toHaveCount(0);
  await expect(editor.locator("em").filter({ hasText: "estilo" })).toHaveCount(1);
  await expect(editor.locator("a[href='https://orvupi.com/']")).toHaveText("enlace");
  await expect(editor.locator("ul li")).toHaveCount(2);
  await expect(editor.locator("ol li")).toHaveCount(1);
  await expect(editor.locator("table td").first()).toContainText("A1");
  await imagesLoaded(doc, 1);
  const img = editor.locator("img").first();
  await expect(img).toHaveAttribute("data-align", "center");
  expect(Math.round((await img.boundingBox())?.width ?? 0)).toBeGreaterThan(150);
  await expect(editor.locator(".ow-break")).toHaveCount(1);
  const narrow = (doc.viewportSize()?.width ?? 1000) < 700;
  if (!narrow) {
    await expect(doc.locator(".ow-a4.is-paged")).toBeVisible();
    await expect(editor.locator(".ow-pgap")).toHaveCount(1);
    await expect(doc.locator(".ow-a4")).toHaveAttribute("data-pages", "2");
    const gap = await editor.locator(".ow-pgap .ow-pgap-band").boundingBox();
    const after = await editor.getByText("Después").boundingBox();
    expect(gap && after && after.y > gap.y).toBeTruthy();
  }
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/, { timeout: 15_000 });
  await doc.reload();
  await expect(doc.locator(".ProseMirror strong").filter({ hasText: /^negrita$/ })).toHaveCount(1);
  await imagesLoaded(doc, 1);
  await shot(doc, "fixture");
});

test("pegar una captura o una imagen copiada del navegador la inserta y se conserva al recargar", async ({ page }) => {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.waitForURL(/\/document\/d\//, { timeout: 60_000 });
  await doc.waitForLoadState("domcontentloaded");
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.type("Captura:");
  // Captura de pantalla: el portapapeles trae solo image/png.
  await editor.evaluate(async (node, png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "captura.png", { type: "image/png" }));
    // Firefox copia el clipboardData de los eventos sintéticos sin los archivos: se adjunta tal cual.
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    node.dispatchEvent(event);
  }, FIXTURE_PNG);
  await expect(editor.locator("img")).toHaveCount(1);
  // «Copiar imagen» en Chrome: HTML con <img> remoto + image/png.
  await editor.evaluate(async (node, png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.setData("text/html", '<meta charset="utf-8"><img src="https://www.google.com/images/branding/logo.png">');
    data.items.add(new File([bytes], "image.png", { type: "image/png" }));
    // Firefox copia el clipboardData de los eventos sintéticos sin los archivos: se adjunta tal cual.
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    node.dispatchEvent(event);
  }, FIXTURE_PNG);
  await expect(editor.locator("img")).toHaveCount(2);
  // HTML con la imagen embebida (data:).
  await editor.evaluate((node, png) => {
    const data = new DataTransfer();
    data.setData("text/html", `<img src="data:image/png;base64,${png}">`);
    // Firefox copia el clipboardData de los eventos sintéticos sin los archivos: se adjunta tal cual.
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    node.dispatchEvent(event);
  }, FIXTURE_PNG);
  await expect(editor.locator("img")).toHaveCount(3);
  // Arrastrar y soltar un archivo de imagen.
  await editor.evaluate((node, png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "soltada.png", { type: "image/png" }));
    const box = node.getBoundingClientRect();
    node.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true, clientX: box.left + 20, clientY: box.top + 10 }));
  }, FIXTURE_PNG);
  await expect(editor.locator("img")).toHaveCount(4);
  let expected = 4;
  if (test.info().project.name.startsWith("docx-chromium")) {
    // Portapapeles real del sistema y Ctrl+V, como una captura de pantalla.
    await doc.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await editor.evaluate(async (_node, png) => {
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": new Blob([bytes], { type: "image/png" }) })]);
    }, FIXTURE_PNG);
    await editor.click();
    await doc.keyboard.press("Control+End");
    await doc.keyboard.press("Control+v");
    expected = 5;
    await expect(editor.locator("img")).toHaveCount(expected);
  }
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/, { timeout: 15_000 });
  await doc.reload();
  await expect(doc.locator(".ProseMirror img")).toHaveCount(expected);
  await imagesLoaded(doc, expected);
});

test("documento real del usuario (solo local, con ORVUPI_DOCX)", async ({ page }) => {
  test.skip(!REAL, "sin ORVUPI_DOCX");
  test.setTimeout(180_000);
  const doc = await importDoc(page, "Tarea 2.docx", await readFile(REAL!));
  const editor = doc.locator(".ProseMirror");
  await imagesLoaded(doc, 22);
  await expect(editor.locator("strong").filter({ hasText: "Módulo:" })).toHaveCount(1);
  const narrow = (doc.viewportSize()?.width ?? 1000) < 700;
  if (!narrow) {
    await expect.poll(async () => Number(await doc.locator(".ow-a4").getAttribute("data-pages"))).toBeGreaterThanOrEqual(22);
  }
  await doc.waitForTimeout(500);
  await shot(doc, "real-p1");
  const scroller = doc.locator(".ow-docs-scroll");
  const bands = editor.locator(".ow-pgap .ow-pgap-band");
  if ((await bands.count()) > 1) {
    await bands.nth(0).evaluate((node) => node.scrollIntoView({ block: "center" }));
    await doc.waitForTimeout(300);
    await shot(doc, "real-salto");
    await bands.nth(0).evaluate((node) => node.scrollIntoView({ block: "start" }));
    await doc.waitForTimeout(300);
    await shot(doc, "real-p2");
    // Vista alejada: varias hojas seguidas.
    await doc.locator(".ow-docs-sheet").evaluate((node) => { (node as HTMLElement).style.zoom = "0.4"; });
    await scroller.evaluate((node) => node.scrollTo(0, 0));
    await doc.waitForTimeout(400);
    await shot(doc, "real-paginas");
  } else {
    await scroller.evaluate((node) => node.scrollBy(0, 900));
    await doc.waitForTimeout(300);
    await shot(doc, "real-p2");
  }
  await doc.reload();
  await imagesLoaded(doc, 22);
});
