import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/** 0.8.2: selector de tablas 15 × 15 (ratón, táctil, teclado) y tabla personalizada validada. */

async function newDoc(page: Page): Promise<Page> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.waitForURL(/\/document\/d\//, { timeout: 60_000 });
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  await doc.locator(".ProseMirror").click();
  return doc;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(await screenshotDir(), `082-tabla-${name}-${test.info().project.name}.png`) });
}

/** Abre la cuadrícula: barra inferior en pantallas estrechas, menú Insertar en escritorio. */
async function openGrid(doc: Page) {
  const dock = doc.locator(".ow-format-dock").getByRole("button", { name: "Insertar tabla", exact: true });
  if (await dock.isVisible().catch(() => false)) {
    await dock.click();
  } else {
    const insert = doc.getByRole("menuitem", { name: "Insertar", exact: true });
    if (!(await insert.isVisible())) await doc.getByRole("button", { name: /menús|Mostrar menús/i }).first().click();
    await insert.click();
    await doc.getByRole("menuitem", { name: "Insertar tabla" }).click();
  }
  const grid = doc.getByRole("grid");
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("gridcell")).toHaveCount(25); // empieza pequeña (5 × 5)
  return grid;
}

/** Recorre la cuadrícula celda a celda (ratón o teclado) hasta filas × columnas; crece al avanzar. */
async function reach(doc: Page, grid: ReturnType<Page["getByRole"]>, rows: number, cols: number, keyboard: boolean) {
  const cell = (r: number, c: number) => grid.locator(`[data-r="${r}"][data-c="${c}"]`);
  if (keyboard) {
    // El puntero se aparta: en WebKit, una cuadrícula que se abre bajo el ratón recibe «hover» y pisa al teclado.
    await doc.mouse.move(0, 0);
    await cell(1, 1).focus();
    for (let c = 1; c < cols; c += 1) await doc.keyboard.press("ArrowRight");
    for (let r = 1; r < rows; r += 1) await doc.keyboard.press("ArrowDown");
  } else {
    for (let c = 1; c <= cols; c += 1) await cell(1, c).hover();
    for (let r = 1; r <= rows; r += 1) await cell(r, cols).hover();
  }
  await expect(doc.getByTestId("table-size")).toHaveText(`${rows} × ${cols}`);
  await expect(grid.locator(".is-hot")).toHaveCount(rows * cols);
  return cell(rows, cols);
}

const shape = (doc: Page) => doc.locator(".ProseMirror table").evaluateAll((tables) => tables.map((table) => {
  const rows = table.querySelectorAll("tr");
  return [rows.length, rows[0]?.children.length ?? 0];
}));

test("cuadrícula 15 × 15: ratón o toque, teclado y tabla personalizada", async ({ page }, info) => {
  test.setTimeout(120_000);
  const doc = await newDoc(page);
  const touch = Boolean(info.project.use.hasTouch);

  // 1) Las cuatro esquinas: 1 × 1, 1 × 15, 15 × 1 y 15 × 15 (ratón; en táctil, teclado y toque final)
  let count = 0;
  for (const [r, c] of [[1, 1], [1, 15], [15, 1], [15, 15]] as const) {
    const grid = await openGrid(doc);
    const target = await reach(doc, grid, r, c, touch);
    if (r === 15 && c === 15) {
      await expect(grid.getByRole("gridcell")).toHaveCount(225);
      await shot(doc, "cuadricula");
    }
    if (r === 1 && c === 15) await shot(doc, "1x15");
    if (touch) await target.tap();
    else await target.click();
    count += 1;
    await expect(doc.locator(".ProseMirror table")).toHaveCount(count);
    expect(await shape(doc)).toContainEqual([r, c]);
  }

  // 2) Teclado con Intro: 5 × 6
  const grid = await openGrid(doc);
  await reach(doc, grid, 5, 6, true);
  await doc.keyboard.press("Enter");
  await expect(doc.locator(".ProseMirror table")).toHaveCount(5);
  expect(await shape(doc)).toContainEqual([5, 6]);

  // 3) Tabla personalizada con validación 1–15
  await openGrid(doc);
  await doc.getByRole("button", { name: /Insertar tabla personalizada/ }).click();
  const dialog = doc.getByRole("dialog", { name: "Insertar tabla personalizada" });
  await expect(dialog).toBeVisible();
  const rows = dialog.getByLabel("Filas");
  const cols = dialog.getByLabel("Columnas");
  await rows.fill("16");
  await expect(dialog.getByRole("alert")).toContainText("entre 1 y 15");
  await expect(dialog.getByRole("button", { name: "Insertar", exact: true })).toBeDisabled();
  await rows.fill("0");
  await expect(dialog.getByRole("button", { name: "Insertar", exact: true })).toBeDisabled();
  await rows.fill("12");
  await cols.fill("7");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await shot(doc, "personalizada");
  await dialog.getByRole("button", { name: "Insertar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(doc.locator(".ProseMirror table")).toHaveCount(6);
  expect(await shape(doc)).toContainEqual([12, 7]);
  await shot(doc, "insertada");
});
