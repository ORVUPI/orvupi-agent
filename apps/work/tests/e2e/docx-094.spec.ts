import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { fixture094, T94, words094 } from "../fixtures/docx-094";
import { screenshotDir } from "./shots";

/**
 * 0.9.4: un DOCX importado se ve como el original: nada más ancho que la hoja, ningún desplazador
 * horizontal dentro de tablas o imágenes, viñetas y «·» presentes y el mismo texto.
 * Con ORVUPI_DOCX=/ruta/al.docx se repiten las comprobaciones generales con un documento real.
 */
const REAL = process.env.ORVUPI_DOCX?.trim();

async function importDoc(page: Page, name: string, buffer: Buffer): Promise<Page> {
  await page.goto("/");
  const input = page.getByLabel("Subir archivo").first();
  const opened = page.waitForEvent("popup", { timeout: 120_000 });
  await input.setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
  const doc = await opened;
  await doc.waitForURL(/\/document\/d\//, { timeout: 120_000 });
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 60_000 });
  return doc;
}

async function imagesLoaded(doc: Page, min: number) {
  await expect.poll(async () => doc.locator(".ProseMirror img").evaluateAll((list) => list.filter((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0).length), { timeout: 60_000 }).toBeGreaterThanOrEqual(min);
}

/** Lo que se sale del ancho del editor y lo que tiene desplazamiento horizontal propio. */
async function overflow(doc: Page) {
  return doc.evaluate(() => {
    const pm = document.querySelector(".ProseMirror")!;
    const box = pm.getBoundingClientRect();
    const wide: string[] = [];
    const scrollers: string[] = [];
    for (const el of Array.from(pm.querySelectorAll("*"))) {
      if (el.closest(".ow-pgap, .column-resize-handle")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > box.right + 1.5 || r.left < box.left - 1.5) wide.push(`${el.tagName.toLowerCase()}.${(el as HTMLElement).className} ${Math.round(r.left)}–${Math.round(r.right)} (hoja ${Math.round(box.left)}–${Math.round(box.right)})`);
      const css = getComputedStyle(el);
      if (/auto|scroll/.test(css.overflowX) && el.scrollWidth > el.clientWidth + 1) scrollers.push(`${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`);
    }
    // Además, ninguna celda recorta su contenido (texto o imagen más ancho que la celda).
    const clipped = Array.from(pm.querySelectorAll("td, th")).filter((cell) => (cell as HTMLElement).scrollWidth > (cell as HTMLElement).clientWidth + 1).map((cell) => (cell.textContent ?? "").slice(0, 40));
    return { wide: wide.slice(0, 10), scrollers, clipped: clipped.slice(0, 10), page: { left: box.left, right: box.right } };
  });
}

/** Huecos entre hojas sobre tablas partidas: no tapan texto y la cabecera repetida va alineada con su tabla. */
async function pageGaps(doc: Page) {
  return doc.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll(".ow-pgov")).map((el) => el.getBoundingClientRect());
    const heads = Array.from(document.querySelectorAll(".ow-pgov-head")).map((el) => el.getBoundingClientRect());
    const tables = Array.from(document.querySelectorAll(".ProseMirror table"));
    const boxes = tables.map((table) => table.getBoundingClientRect());
    const hidden: string[] = [];
    for (const table of tables) {
      const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of Array.from(range.getClientRects())) {
          if (overlays.some((o) => r.top < o.bottom - 1 && r.bottom > o.top + 1 && r.left < o.right && r.right > o.left)) hidden.push(node.textContent.slice(0, 30));
        }
      }
    }
    const misplaced = heads.filter((h) => !boxes.some((t) => Math.abs(h.left - t.left) <= 1.5 && Math.abs(h.right - t.right) <= 1.5)).length;
    return { hidden: hidden.slice(0, 10), misplaced, heads: heads.length };
  });
}

async function shot(doc: Page, name: string) {
  await doc.screenshot({ path: join(await screenshotDir(), `094-${name}-${test.info().project.name}.png`) });
}

test("DOCX con tablas del ancho de la hoja, viñetas en celdas e imágenes con pie: fiel y sin desplazadores", async ({ page }) => {
  test.setTimeout(180_000);
  const doc = await importDoc(page, "Enfermedades profesionales.docx", Buffer.from(fixture094()));
  const editor = doc.locator(".ProseMirror");
  await imagesLoaded(doc, 3);
  await doc.waitForTimeout(400);

  const result = await overflow(doc);
  expect(result.wide, "nada más ancho que la hoja").toEqual([]);
  expect(result.scrollers, "ningún desplazador horizontal").toEqual([]);
  expect(result.clipped, "ninguna celda recorta su contenido").toEqual([]);

  const tables = editor.locator("table");
  await expect(tables).toHaveCount(4);
  const sheet = result.page;
  // Caso 1 (vídeo, hoja 1): la tabla azul del «Ejemplo…» conserva su borde derecho dentro de la hoja.
  const box = await tables.nth(0).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(sheet.right + 1);
  await expect(tables.nth(0)).toContainText(T94.box);
  // Caso 2 (hojas 2–3): la columna «Prevención básica» entera y las viñetas en todas las celdas.
  const lastHead = tables.nth(1).locator("tr").first().locator("td, th").last();
  await expect(lastHead).toHaveText(T94.heads[3]!);
  const headBox = await lastHead.boundingBox();
  expect(headBox!.x + headBox!.width).toBeLessThanOrEqual(sheet.right + 1);
  await expect(tables.nth(1).locator("li")).toHaveCount(T94.sectors.length * 9);
  await expect(tables.nth(1).locator("ul")).toHaveCount(T94.sectors.length * 3);
  const marker = await tables.nth(1).locator("ul").first().evaluate((ul) => getComputedStyle(ul).listStyleType);
  expect(marker).not.toBe("none");
  await expect(tables.nth(1).locator("li").filter({ hasText: T94.bullets[2]![2]! })).toHaveCount(T94.sectors.length);
  await expect(tables.nth(1).locator("tr").nth(4)).toContainText("CONSTRUCCIÓN");
  // La tabla sigue en la hoja siguiente: el hueco entre hojas no tapa ninguna fila y la cabecera repetida va sobre su tabla.
  const narrowView = (doc.viewportSize()?.width ?? 1000) < 700;
  // Solo si la tabla llega a partirse entre hojas (depende del ancho y la letra disponibles).
  const splits = await tables.nth(1).locator("tr.ow-pgrow").count();
  if (!narrowView && splits > 0) {
    const covered = await pageGaps(doc);
    expect(covered.hidden, "texto tapado por el hueco entre hojas").toEqual([]);
    expect(covered.heads).toBeGreaterThan(0);
    expect(covered.misplaced, "cabecera repetida desplazada").toBe(0);
  }
  // Caso 3 (hojas 4–5): las dos imágenes caben en sus celdas y el pie se lee entero.
  const images = tables.nth(2).locator("img");
  await expect(images).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const img = await images.nth(index).boundingBox();
    const cellBox = await tables.nth(2).locator("tr").first().locator("td").nth(index).boundingBox();
    expect(img!.x + img!.width).toBeLessThanOrEqual(cellBox!.x + cellBox!.width + 0.5);
    expect(img!.x).toBeGreaterThanOrEqual(cellBox!.x - 0.5);
    expect(img!.width / img!.height).toBeCloseTo(315 / 210, 1); // sin deformar
    await expect(tables.nth(2).locator("tr").last().locator("td").nth(index)).toHaveText(T94.captions[index]!);
  }
  // Tabla e imagen más anchas que la hoja: se ajustan sin cortarse.
  const wideBox = await tables.nth(3).boundingBox();
  expect(wideBox!.x + wideBox!.width).toBeLessThanOrEqual(sheet.right + 1);
  const big = await editor.locator("img").nth(2).boundingBox();
  expect(big!.x + big!.width).toBeLessThanOrEqual(sheet.right + 1);
  // Símbolos y texto.
  const text = await editor.innerText();
  expect(text).toContain(T94.symbols);
  expect(text).toContain("•");
  expect(text).toContain("✓");
  expect(text).toContain(T94.boxText);
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
  const missing = words094().filter((word) => {
    const n = counts.get(word) ?? 0;
    counts.set(word, n - 1);
    return n <= 0;
  });
  expect(missing, "palabras perdidas").toEqual([]);
  // Las fuentes del original sin equivalente no caen en serif.
  const family = await tables.nth(1).locator("li").first().evaluate((li) => getComputedStyle(li).fontFamily);
  expect(family.toLowerCase()).not.toMatch(/^"?(aptos|times)/);
  // Escritorio: hoja Carta con los márgenes exactos del documento (0,7" = 67,2 px).
  const narrow = (doc.viewportSize()?.width ?? 1000) < 700;
  if (!narrow) {
    const margin = await doc.locator(".ow-a4").evaluate((el) => getComputedStyle(el).getPropertyValue("--page-margin").trim());
    expect(margin).toBe("67.2px");
  }
  await shot(doc, "tabla");

  // Tras recargar sigue igual (los atributos nuevos se guardan).
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/, { timeout: 20_000 });
  await doc.reload();
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await imagesLoaded(doc, 3);
  const again = await overflow(doc);
  expect(again.wide).toEqual([]);
  expect(again.scrollers).toEqual([]);
  await expect(tables.nth(1).locator("li")).toHaveCount(T94.sectors.length * 9);
});

test("documento real (ORVUPI_DOCX): nada se sale de la hoja ni tiene desplazador", async ({ page }) => {
  test.skip(!REAL, "Sin ORVUPI_DOCX");
  test.setTimeout(300_000);
  const doc = await importDoc(page, "real.docx", await readFile(REAL!));
  const count = await doc.locator(".ProseMirror img").count();
  await imagesLoaded(doc, count);
  await doc.waitForTimeout(800);
  const result = await overflow(doc);
  expect(result.wide).toEqual([]);
  expect(result.scrollers).toEqual([]);
  expect(result.clipped).toEqual([]);
  if ((doc.viewportSize()?.width ?? 1000) >= 700) {
    const gaps = await pageGaps(doc);
    expect(gaps.hidden).toEqual([]);
    expect(gaps.misplaced).toBe(0);
  }
  await shot(doc, "real");
});
