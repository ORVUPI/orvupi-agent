import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/** 0.8.3: botones −/+ del tamaño de letra, hoja centrada y redimensionar imágenes (escritorio y móvil). */

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAABJdyC1AAACBElEQVR42u3UMQ0AQAjAwOcVIQ3/C6hgILmT0KHRWQ/ggi8BYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBbBnAD7fAy8mZgBNAAAAAElFTkSuQmCC", "base64");

function viewports(project: string) {
  if (project.endsWith("-desk")) return [{ width: 1920, height: 1080 }, { width: 1366, height: 900 }, { width: 1024, height: 768 }];
  if (project.endsWith("-tablet")) return [{ width: 820, height: 1180 }];
  return [{ width: 360, height: 740 }, { width: 390, height: 844 }];
}

async function newDoc(page: Page, size: { width: number; height: number }): Promise<Page> {
  await page.setViewportSize(size);
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.setViewportSize(size);
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  return doc;
}

const shot = async (page: Page, name: string, size: { width: number }) =>
  page.screenshot({ path: join(await screenshotDir(), `083-${name}-${size.width}-${test.info().project.name}.png`) });

test("tamaño de letra: − y + con selección y con el cursor, pasos como Google Docs", async ({ page }, info) => {
  test.setTimeout(180_000);
  for (const size of viewports(info.project.name)) {
    const doc = await newDoc(page, size);
    const editor = doc.locator(".ProseMirror");
    await editor.click();
    await doc.keyboard.type("Hola mundo ORVUPI");
    const input = doc.getByLabel("Tamaño del texto", { exact: true }).filter({ visible: true }).first();
    const plus = doc.getByRole("button", { name: "Aumentar tamaño" }).filter({ visible: true }).first();
    const minus = doc.getByRole("button", { name: "Reducir tamaño" }).filter({ visible: true }).first();
    await plus.scrollIntoViewIfNeeded();
    // Selección: 11 → 12 → 14 → 18 (pasos), y luego − vuelve a 14
    await editor.locator("p").first().selectText();
    await plus.click();
    await expect(input).toHaveValue("12");
    await plus.click();
    await expect(input).toHaveValue("14");
    await plus.click();
    await expect(input).toHaveValue("18");
    await expect(editor.locator("span[style*='font-size: 18pt']")).toContainText("Hola mundo ORVUPI");
    await minus.click();
    await expect(input).toHaveValue("14");
    // La selección sigue: se escribe un tamaño y se aplica
    await input.fill("30");
    await input.press("Enter");
    await expect(editor.locator("span[style*='font-size: 30pt']")).toContainText("Hola mundo ORVUPI");
    // Cursor dentro de una palabra: se aplica a la palabra
    await editor.locator("p").first().click();
    await doc.keyboard.press("End");
    await doc.keyboard.press("ArrowLeft");
    await doc.keyboard.press("ArrowLeft");
    await minus.click();
    await expect(editor.locator("span[style*='font-size: 24pt']")).toHaveText("ORVUPI");
    await shot(doc, "fuente", size);
    await doc.close();
  }
});

test("la hoja queda centrada (con y sin panel de pestañas y con zoom)", async ({ page }, info) => {
  test.setTimeout(180_000);
  for (const size of viewports(info.project.name)) {
    const doc = await newDoc(page, size);
    const center = async () => doc.evaluate(() => {
      const page = document.querySelector(".ow-a4") as HTMLElement;
      const scroll = document.querySelector(".ow-docs-scroll") as HTMLElement;
      const tabs = document.querySelector(".ow-docs-body > .ow-docs-tabs, .ow-docs-body > .ow-docs-tabs-open") as HTMLElement | null;
      const p = page.getBoundingClientRect();
      const s = scroll.getBoundingClientRect();
      const tabsRight = tabs && getComputedStyle(tabs).display !== "none" ? tabs.getBoundingClientRect().right : s.left;
      return { left: p.left - s.left, right: s.right - (scroll.offsetWidth - scroll.clientWidth) - p.right, overlap: p.left < tabsRight, narrow: p.width >= s.width - 2 };
    });
    const check = async () => {
      const c = await center();
      expect(c.overlap).toBe(false);
      // Centrada en todo el ancho salvo que el panel de pestañas lo impida (entonces, pegada a él).
      if (!c.narrow && c.left > 300) expect(Math.abs(c.left - c.right)).toBeLessThanOrEqual(40);
    };
    await check();
    await shot(doc, "centrado", size);
    const close = doc.locator(".ow-docs-tabs button").first();
    if (await close.isVisible().catch(() => false) && info.project.name.endsWith("-desk")) {
      await close.click();
      await check();
      await shot(doc, "centrado-sin-pestanas", size);
      const zoom = doc.getByRole("button", { name: /100\s*%/ }).filter({ visible: true }).first();
      if (await zoom.isVisible().catch(() => false)) {
        await zoom.click();
        await doc.getByRole("menuitem", { name: "75%" }).or(doc.getByRole("option", { name: "75%" })).first().click().catch(() => undefined);
        await check();
      }
    }
    await doc.close();
  }
});

test("redimensionar una imagen con los tiradores; se guarda y la barra cambia el ajuste", async ({ page }, info) => {
  test.setTimeout(180_000);
  for (const size of viewports(info.project.name)) {
    const doc = await newDoc(page, size);
    const editor = doc.locator(".ProseMirror");
    await editor.click();
    await doc.keyboard.type("Imagen:");
    await doc.keyboard.press("Enter");
    await doc.locator("input[type=file][accept*='image']").first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    const img = editor.locator("img").first();
    const selectImg = async () => { if (!(await doc.locator(".ow-imgframe").isVisible())) await img.click(); };
    await expect(img).toBeVisible({ timeout: 20_000 });
    await img.click();
    const frame = doc.locator(".ow-imgframe");
    await expect(frame).toBeVisible();
    await expect(frame.locator(".ow-imgframe-h")).toHaveCount(8);
    const before = (await img.boundingBox())!;
    // Esquina: mantiene la proporción
    const se = (await frame.locator(".is-se").boundingBox())!;
    const touch = Boolean(info.project.use.hasTouch);
    if (touch) expect(se.width).toBeGreaterThanOrEqual(23);
    await doc.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
    await doc.mouse.down();
    await doc.mouse.move(se.x + se.width / 2 - before.width * 0.4, se.y + se.height / 2 - 5, { steps: 6 });
    await expect(frame.locator(".ow-imgframe-size")).toContainText("×");
    await shot(doc, "imagen-arrastre", size);
    await doc.mouse.up();
    await expect.poll(async () => Number(await img.getAttribute("width"))).toBeLessThan(before.width);
    const w = Number(await img.getAttribute("width"));
    const h = Number(await img.getAttribute("height"));
    expect(Math.abs(w / h - 2)).toBeLessThan(0.08);
    // Lado: libre (solo cambia la altura)
    await selectImg();
    const s = (await frame.locator(".is-s").boundingBox())!;
    await doc.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await doc.mouse.down();
    await doc.mouse.move(s.x + s.width / 2, s.y + s.height / 2 + 40, { steps: 5 });
    await doc.mouse.up();
    await expect.poll(async () => Number(await img.getAttribute("height"))).toBeGreaterThan(h + 20);
    expect(Number(await img.getAttribute("width"))).toBe(w);
    // Límite al ancho de la página
    await selectImg();
    const e = (await frame.locator(".is-e").boundingBox())!;
    await doc.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
    await doc.mouse.down();
    await doc.mouse.move(doc.viewportSize()!.width - 4, e.y + e.height / 2, { steps: 5 });
    await doc.mouse.up();
    const pageWidth = await editor.evaluate((el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
    await expect.poll(async () => Number(await img.getAttribute("width"))).toBeLessThanOrEqual(Math.ceil(pageWidth));
    // Barra: ajustar texto y tamaño original
    await selectImg();
    const more = doc.getByRole("button", { name: "Opciones de imagen" });
    await more.click();
    await doc.getByRole("menuitemradio", { name: "Ajustar texto" }).click();
    await expect(img).toHaveAttribute("data-wrap", "square");
    await selectImg();
    await more.click();
    await doc.getByRole("menuitem", { name: "Tamaño original" }).click();
    await expect.poll(async () => Number(await img.getAttribute("width"))).toBe(Math.min(400, Math.floor(pageWidth)));
    await shot(doc, "imagen-barra", size);
    // Se guarda: recargar y sigue con su tamaño
    const saved = Number(await img.getAttribute("width"));
    await doc.waitForTimeout(1500);
    await doc.reload();
    await expect(doc.locator(".ProseMirror img").first()).toHaveAttribute("width", String(saved), { timeout: 20_000 });
    await doc.close();
  }
});

test("logo de Work: pulpo con documento centrado y alineado con el texto", async ({ page }, info) => {
  for (const size of viewports(info.project.name)) {
    await page.setViewportSize(size);
    await page.goto("/");
    const mobileMark = page.locator(".ow-brandmark");
    const title = page.locator(".ow-top-title");
    await expect(title).toBeVisible();
    const t = (await title.boundingBox())!;
    if (await mobileMark.isVisible()) {
      const b = (await mobileMark.boundingBox())!;
      const i = (await mobileMark.locator("img").boundingBox())!;
      // La imagen está centrada en su botón y el botón alineado con el texto
      expect(Math.abs(i.x + i.width / 2 - (b.x + b.width / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(i.y + i.height / 2 - (b.y + b.height / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(b.y + b.height / 2 - (t.y + t.height / 2))).toBeLessThanOrEqual(3);
      expect(await mobileMark.locator("img").evaluate((img) => (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
    } else {
      const logo = title.locator("img");
      await expect(logo).toBeVisible();
      const l = (await logo.boundingBox())!;
      expect(Math.abs(l.y + l.height / 2 - (t.y + t.height / 2))).toBeLessThanOrEqual(2);
    }
    await page.locator(".ow-topbar").screenshot({ path: join(await screenshotDir(), `083-logo-${size.width}-${info.project.name}.png`) });
  }
});
