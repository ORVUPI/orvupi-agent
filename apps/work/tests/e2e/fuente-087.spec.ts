import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/** 0.8.7: tamaño de letra — lista 1…96 sin saltos, − / + de 1 en 1 (texto, títulos, selecciones) y sin hueco tras «Arial». */

async function newDoc(page: Page): Promise<{ doc: Page; editor: Locator }> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.setViewportSize(page.viewportSize()!);
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  return { doc, editor };
}

const controls = (doc: Page) => ({
  input: doc.getByLabel("Tamaño del texto", { exact: true }).filter({ visible: true }).first(),
  plus: doc.getByRole("button", { name: "Aumentar tamaño" }).filter({ visible: true }).first(),
  minus: doc.getByRole("button", { name: "Reducir tamaño" }).filter({ visible: true }).first(),
  font: doc.getByRole("button", { name: /^Fuente / }).filter({ visible: true }).first(),
});

const shot = async (doc: Page, name: string) =>
  doc.screenshot({ path: join(await screenshotDir(), `087-${name}-${test.info().project.name}.png`) });

/** Selecciona todo el documento como lo haría el usuario arrastrando (sirve igual en móvil, donde no hay Ctrl+A). */
const selectAll = async (editor: Locator) => {
  await editor.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await editor.page().waitForTimeout(150);
};

test("la lista de tamaños va del 1 al 96 de 1 en 1, sin saltos, y se abre en el tamaño actual", async ({ page }) => {
  const { doc } = await newDoc(page);
  await doc.keyboard.type("Hola");
  const { input } = controls(doc);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  const list = doc.getByRole("listbox", { name: "Tamaño del texto" });
  await expect(list).toBeVisible();
  const labels = (await list.getByRole("option").allTextContents()).map((value) => Number(value.trim()));
  expect(labels).toEqual(Array.from({ length: 96 }, (_, index) => index + 1));
  for (let i = 1; i < labels.length; i += 1) expect(labels[i]! - labels[i - 1]!).toBe(1);
  // Resalta el actual (11) y está a la vista dentro de la lista
  const current = list.getByRole("option", { name: "11", exact: true });
  await expect(current).toHaveAttribute("aria-selected", "true");
  await expect(list.locator("[aria-selected='true']")).toHaveCount(1);
  const l = (await list.boundingBox())!;
  const c = (await current.boundingBox())!;
  expect(c.y).toBeGreaterThanOrEqual(l.y - 1);
  expect(c.y + c.height).toBeLessThanOrEqual(l.y + l.height + 1);
  // Se puede desplazar: el 96 existe y se elige
  await list.getByRole("option", { name: "96", exact: true }).click();
  await expect(input).toHaveValue("96");
  await doc.close();
});

test("sin hueco entre la fuente (Arial) y − / +", async ({ page }) => {
  const { doc } = await newDoc(page);
  const { font, minus, input, plus } = controls(doc);
  await minus.scrollIntoViewIfNeeded();
  await expect(font).toContainText("Arial");
  const f = (await font.boundingBox())!;
  const m = (await minus.boundingBox())!;
  const i = (await input.boundingBox())!;
  const p = (await plus.boundingBox())!;
  const gap = m.x - (f.x + f.width);
  expect(gap).toBeGreaterThanOrEqual(-1);
  expect(gap).toBeLessThanOrEqual(6);
  // En la misma fila y seguidos: − número +
  expect(Math.abs(m.y + m.height / 2 - (f.y + f.height / 2))).toBeLessThan(4);
  expect(i.x - (m.x + m.width)).toBeLessThanOrEqual(6);
  expect(p.x - (i.x + i.width)).toBeLessThanOrEqual(6);
  // La flecha de la fuente va pegada al nombre: no hay espacio vacío dentro del botón
  const inner = await font.evaluate((button) => {
    const span = button.querySelector("span")!.getBoundingClientRect();
    const svg = button.querySelector("svg")!.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    return { textToArrow: svg.left - span.right, arrowToEdge: box.right - svg.right };
  });
  expect(inner.textToArrow).toBeLessThanOrEqual(6);
  expect(inner.arrowToEdge).toBeLessThanOrEqual(8);
  await shot(doc, "barra");
  await doc.close();
});

test("− y + de 1 en 1 en texto normal: palabra, selección parcial, varios párrafos y número escrito", async ({ page }) => {
  const { doc, editor } = await newDoc(page);
  await doc.keyboard.type("uno dos tres");
  await doc.keyboard.press("Enter");
  await doc.keyboard.type("cuatro cinco");
  const { input, plus, minus } = controls(doc);
  await plus.scrollIntoViewIfNeeded();
  // Parcial: «tres» al final del primer párrafo
  await editor.locator("p").first().click();
  await doc.keyboard.press("End");
  for (let n = 0; n < 4; n += 1) await doc.keyboard.press("Shift+ArrowLeft");
  await plus.click();
  await expect(input).toHaveValue("12");
  await expect(editor.locator("span[style*='font-size: 12pt']")).toHaveText("tres");
  await plus.click();
  await plus.click();
  await expect(input).toHaveValue("14");
  await minus.click();
  await expect(input).toHaveValue("13");
  await expect(editor.locator("span[style*='font-size: 13pt']")).toHaveText("tres");
  // Varios párrafos con tamaños mezclados: cada trozo se mueve 1 desde el suyo
  await selectAll(editor);
  await plus.click();
  await expect(input).toHaveValue("12");
  await expect(editor.locator("span[style*='font-size: 14pt']")).toHaveText("tres");
  await expect(editor.locator("p").nth(1).locator("span[style*='font-size: 12pt']")).toHaveText("cuatro cinco");
  await minus.click();
  await expect(input).toHaveValue("11");
  await expect(editor.locator("span[style*='font-size: 13pt']")).toHaveText("tres");
  // Número escrito + Enter se aplica a toda la selección
  await input.fill("40");
  await input.press("Enter");
  await expect(editor.locator("span[style*='font-size: 40pt']")).toHaveCount(2);
  await expect(input).toHaveValue("40");
  await shot(doc, "texto");
  await doc.close();
});

test("− y + de 1 en 1 en títulos (H1 = 26, H2 = 18) y el número muestra el tamaño real", async ({ page }, info) => {
  const { doc, editor } = await newDoc(page);
  await doc.keyboard.type("# Informe anual");
  await doc.keyboard.press("Enter");
  await doc.keyboard.type("## Resumen");
  await doc.keyboard.press("Enter");
  await doc.keyboard.type("Texto normal");
  await expect(editor.locator("h1")).toHaveText("Informe anual");
  await expect(editor.locator("h2")).toHaveText("Resumen");
  const { input, plus, minus } = controls(doc);
  await plus.scrollIntoViewIfNeeded();
  await editor.locator("h1").click();
  await expect(input).toHaveValue("26");
  await editor.locator("h2").click();
  await expect(input).toHaveValue("18");
  // Seleccionar el H1 y subir: 27, marca explícita, y se ve más grande
  await editor.locator("h1").selectText();
  const before = await editor.locator("h1").evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  await plus.click();
  await expect(input).toHaveValue("27");
  const span = editor.locator("h1 span[style*='font-size: 27pt']");
  await expect(span).toHaveText("Informe anual");
  const after = await span.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(after).toBeGreaterThan(before);
  await minus.click();
  await minus.click();
  await expect(input).toHaveValue("25");
  // H2 completo: 18 → 17
  await editor.locator("h2").selectText();
  await minus.click();
  await expect(input).toHaveValue("17");
  await expect(editor.locator("h2 span[style*='font-size: 17pt']")).toHaveText("Resumen");
  // En el móvil (cuerpo a 16px) cada punto también se nota: 12 pt se ve mayor que el texto normal
  await editor.locator("p").first().selectText();
  const normal = await editor.locator("p").first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  await plus.click();
  const twelve = await editor.locator("p span[style*='font-size: 12pt']").evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(twelve).toBeGreaterThan(normal + 0.5);
  if (info.project.name.includes("phone")) expect(Math.abs(twelve - (12 * 16) / 11)).toBeLessThan(0.6);
  await shot(doc, "titulos");
  await doc.close();
});
