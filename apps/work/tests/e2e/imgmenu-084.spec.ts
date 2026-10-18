import { expect, test, type Page } from "@playwright/test";

/** Menú ⋯ de la imagen: solo tiradores y un botón pequeño; el menú no tapa el texto ni se sale de la pantalla. */

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAACBElEQVR42u3UMQ0AQAjAwOcVIQ3/C6hgILmT0KHRWQ/ggi8BYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBbBnAD7fAy8mZgBNAAAAAElFTkSuQmCC", "base64");

async function docWithImage(page: Page) {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.setViewportSize(page.viewportSize()!);
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  await doc.keyboard.type("Texto antes de la imagen.");
  await doc.keyboard.press("Enter");
  await doc.locator("input[type=file][accept*='image']").first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  const img = editor.locator("img").first();
  await expect(img).toBeVisible({ timeout: 20_000 });
  await img.click();
  await expect(doc.locator(".ow-imgframe")).toBeVisible();
  return { doc, editor, img };
}

const inside = (a: { x: number; y: number; width: number; height: number }, vw: number, vh: number) =>
  a.x >= 0 && a.y >= 0 && a.x + a.width <= vw + 0.5 && a.y + a.height <= vh + 0.5;

test("al seleccionar: tiradores y botón ⋯, sin barra ni menú", async ({ page }) => {
  const { doc, img } = await docWithImage(page);
  await expect(doc.locator(".ow-imgframe-h")).toHaveCount(8);
  await expect(doc.getByRole("toolbar", { name: "Imagen seleccionada" })).toHaveCount(0);
  await expect(doc.getByRole("menu")).toHaveCount(0);
  await expect(doc.getByRole("menuitemradio", { name: "Ajustar texto" })).toHaveCount(0);
  const more = doc.getByRole("button", { name: "Opciones de imagen" });
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute("aria-haspopup", "menu");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  const b = (await more.boundingBox())!;
  const i = (await img.boundingBox())!;
  expect(b.width).toBeLessThanOrEqual(40);
  expect(Math.abs(b.width - b.height)).toBeLessThan(1);
  // En la esquina superior derecha de la imagen
  expect(b.x + b.width).toBeLessThanOrEqual(i.x + i.width + 1);
  expect(b.y).toBeLessThan(i.y + i.height / 2);
  await doc.close();
});

test("el menú abre, elige y se cierra; también al tocar fuera y con Esc", async ({ page }) => {
  const { doc, img } = await docWithImage(page);
  const more = doc.getByRole("button", { name: "Opciones de imagen" });
  await more.click();
  const menu = doc.getByRole("menu", { name: "Opciones de imagen" });
  await expect(menu).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(4);
  await expect(menu.getByRole("menuitemradio", { name: "En línea" })).toHaveAttribute("aria-checked", "true");
  const vp = doc.viewportSize()!;
  expect(inside((await menu.boundingBox())!, vp.width, vp.height)).toBe(true);
  // Elegir cierra
  await menu.getByRole("menuitemradio", { name: "Ajustar texto" }).click();
  await expect(img).toHaveAttribute("data-wrap", "square");
  await expect(menu).toHaveCount(0);
  // Tocar fuera cierra
  await more.click();
  await expect(menu).toBeVisible();
  await doc.mouse.click(4, vp.height - 4);
  await expect(menu).toHaveCount(0);
  // Esc cierra
  await img.click();
  await more.click();
  await expect(menu).toBeVisible();
  await doc.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await doc.close();
});

test("teclado: flechas recorren el menú, Enter elige y el foco vuelve al botón", async ({ page }) => {
  const { doc, img } = await docWithImage(page);
  const more = doc.getByRole("button", { name: "Opciones de imagen" });
  await more.focus();
  await doc.keyboard.press("Enter");
  const menu = doc.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "En línea" })).toBeFocused();
  await doc.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitemradio", { name: "Ajustar texto" })).toBeFocused();
  await doc.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Eliminar" })).toBeFocused();
  await doc.keyboard.press("Home");
  await doc.keyboard.press("ArrowDown");
  await doc.keyboard.press("ArrowDown");
  await doc.keyboard.press("Enter");
  await expect(img).toHaveAttribute("data-wrap", "behind");
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await doc.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  await doc.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await doc.close();
});

test("mientras se arrastra un tirador no hay menú ni botón", async ({ page }) => {
  const { doc, img } = await docWithImage(page);
  const more = doc.getByRole("button", { name: "Opciones de imagen" });
  await more.click();
  await expect(doc.getByRole("menu")).toBeVisible();
  const se = (await doc.locator(".ow-imgframe .is-se").boundingBox())!;
  await doc.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await doc.mouse.down();
  await doc.mouse.move(se.x - 30, se.y - 15, { steps: 4 });
  await expect(doc.getByRole("menu")).toHaveCount(0);
  await expect(more).toHaveCount(0);
  await doc.mouse.up();
  await expect(more).toBeVisible();
  await expect(doc.getByRole("menu")).toHaveCount(0);
  expect(Number(await img.getAttribute("width"))).toBeLessThan(400);
  await doc.close();
});

test("el menú no tapa el texto y queda dentro de la parte visible", async ({ page }) => {
  const { doc, editor } = await docWithImage(page);
  await doc.getByRole("button", { name: "Opciones de imagen" }).click();
  const menu = doc.getByRole("menu");
  await expect(menu).toBeVisible();
  const m = (await menu.boundingBox())!;
  const vv = await doc.evaluate(() => ({ w: window.visualViewport?.width ?? innerWidth, h: window.visualViewport?.height ?? innerHeight }));
  expect(inside(m, vv.w, vv.h)).toBe(true);
  // No se solapa con el párrafo de texto
  const p = (await editor.locator("p", { hasText: "Texto antes de la imagen." }).boundingBox())!;
  const overlap = !(m.x + m.width <= p.x || p.x + p.width <= m.x || m.y + m.height <= p.y || p.y + p.height <= m.y);
  expect(overlap).toBe(false);
  await doc.close();
});
