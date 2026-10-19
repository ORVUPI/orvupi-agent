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
  await img.click({ force: true });
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
  await img.click({ force: true });
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

// ---- Mover la imagen (como Google Docs) ----

async function dragCenter(page: Page, el: { x: number; y: number; width: number; height: number }, dx: number, dy: number, during?: () => Promise<void>) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2 + Math.min(20, el.height / 4);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx / 2, cy + dy / 2, { steps: 4 });
  await page.mouse.move(cx + dx, cy + dy, { steps: 4 });
  if (during) await during();
  await page.mouse.up();
}

test("sin seleccionar no hay zona de arrastre (el dedo desplaza la página)", async ({ page }) => {
  const { doc } = await docWithImage(page);
  await expect(doc.locator(".ow-imgframe-move")).toHaveCount(1);
  await doc.locator(".ProseMirror p").first().click();
  await expect(doc.locator(".ow-imgframe")).toHaveCount(0);
  await expect(doc.locator(".ow-imgframe-move")).toHaveCount(0);
  await doc.close();
});

test("«Ajustar texto»: arrastrar desde el centro la mueve libremente y se guarda", async ({ page }) => {
  const { doc, img, editor } = await docWithImage(page);
  await doc.getByRole("button", { name: "Opciones de imagen" }).click();
  await doc.getByRole("menuitemradio", { name: "Ajustar texto" }).click();
  await expect(img).toHaveAttribute("data-wrap", "square");
  const w0 = await img.getAttribute("width");
  const frame = (await doc.locator(".ow-imgframe").boundingBox())!;
  await dragCenter(doc, frame, 50, 40, async () => {
    await expect(doc.locator(".ow-imgframe-h")).toHaveCount(0);
    await expect(doc.getByRole("button", { name: "Opciones de imagen" })).toHaveCount(0);
  });
  await expect.poll(async () => (await img.boundingBox())!.y).toBeGreaterThan(frame.y + 25);
  const after = (await img.boundingBox())!;
  const pg = await editor.evaluate((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) }; });
  expect(after.x).toBeGreaterThanOrEqual(pg.left - 1);
  expect(after.x + after.width).toBeLessThanOrEqual(pg.right + 1);
  if (after.width + 60 < pg.right - pg.left) expect(after.x).toBeGreaterThan(frame.x + 25);
  expect(await img.getAttribute("width")).toBe(w0);
  const ox = await img.getAttribute("data-oy");
  await doc.screenshot({ path: `/tmp/orvupi-img-mover-${test.info().project.name}.png` }).catch(() => undefined);
  await doc.waitForTimeout(1500);
  await doc.reload();
  await expect(doc.locator(".ProseMirror img").first()).toHaveAttribute("data-oy", ox!, { timeout: 20_000 });
  await doc.close();
});

test("«En línea»: arrastrarla la recoloca en el texto con línea de inserción", async ({ page }) => {
  const { doc, editor, img } = await docWithImage(page);
  const first = editor.locator("p", { hasText: "Texto antes de la imagen." });
  const frame = (await doc.locator(".ow-imgframe").boundingBox())!;
  const p = (await first.boundingBox())!;
  const tx = p.x + 40;
  const ty = p.y + 3;
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2 + Math.min(20, frame.height / 4);
  await dragCenter(doc, frame, tx - cx, ty - cy, async () => {
    await expect(doc.locator(".ow-imgcaret")).toBeVisible();
  });
  await expect(doc.locator(".ow-imgcaret")).toHaveCount(0);
  // Ahora la imagen va antes del primer párrafo
  const order = await editor.evaluate((el) => Array.from(el.children).map((c) => (c.querySelector("img") || c.tagName === "IMG" ? "img" : (c.textContent ?? "").trim())));
  expect(order.indexOf("img")).toBeLessThan(order.indexOf("Texto antes de la imagen."));
  await expect(img).not.toHaveAttribute("data-wrap", /./);
  await doc.close();
});

test("arrastrar un tirador cambia el tamaño y no mueve", async ({ page }) => {
  const { doc, img } = await docWithImage(page);
  const se = (await doc.locator(".ow-imgframe .is-se").boundingBox())!;
  await doc.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await doc.mouse.down();
  await doc.mouse.move(se.x - 40, se.y - 20, { steps: 5 });
  await doc.mouse.up();
  await expect.poll(async () => Number(await img.getAttribute("width"))).toBeLessThan(400);
  expect(await img.getAttribute("data-ox")).toBeNull();
  await doc.close();
});
