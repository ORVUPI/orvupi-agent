import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { screenshotDir } from "./shots";

/** 0.8.2: el menú ⋮ de un archivo cabe en la pantalla del teléfono y trae «Eliminar» con deshacer. */

for (const size of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  test(`menú del último archivo a ${size.width}×${size.height}: hoja inferior completa y Eliminar con deshacer`, async ({ page }, info) => {
    test.skip(!info.project.name.endsWith("-phone"), "solo en los proyectos de teléfono");
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await page.goto("/");
    // Cada CSV abre su hoja en otra pestaña; se cierran y se sigue en Drive.
    page.context().on("page", (other) => void other.close().catch(() => undefined));
    const input = page.getByLabel("Subir archivo").first();
    for (let i = 1; i <= 14; i += 1) {
      await input.setInputFiles({ name: `archivo-${String(i).padStart(2, "0")}.csv`, mimeType: "text/csv", buffer: Buffer.from(`ORVUPI,${i}\n`) });
      await page.waitForTimeout(600);
    }
    const drive = page.getByRole("button", { name: "Mi unidad", exact: true }).last();
    if (await drive.isVisible().catch(() => false)) await drive.click();
    const rows = page.locator("tr, li").filter({ has: page.getByRole("button", { name: "Acciones", exact: true }) });
    await expect.poll(() => rows.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(12);
    const last = rows.last();
    const name = (await last.locator(".ow-file-open strong").textContent())?.replace("★ ", "").trim() ?? "";
    await last.scrollIntoViewIfNeeded();
    await last.getByRole("button", { name: "Acciones", exact: true }).click();
    const menu = page.getByRole("menu", { name });
    await expect(menu).toBeVisible();
    const remove = menu.getByRole("menuitem", { name: "Eliminar", exact: true });
    await remove.scrollIntoViewIfNeeded();
    await expect(remove).toBeInViewport({ ratio: 1 });
    // La hoja queda dentro de la pantalla y por encima de la barra inferior y del botón +.
    const box = (await menu.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    const hit = await remove.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(hit).toBe(true);
    await page.screenshot({ path: join(await screenshotDir(), `082-menu-${size.width}x${size.height}-${info.project.name}.png`) });
    await remove.click();
    await expect(menu).toBeHidden();
    const toast = page.getByRole("status").filter({ hasText: "papelera" });
    await expect(toast).toBeVisible();
    await expect(page.locator(".ow-file-open strong", { hasText: name })).toHaveCount(0);
    await page.screenshot({ path: join(await screenshotDir(), `082-menu-eliminado-${size.width}x${size.height}-${info.project.name}.png`) });
    await toast.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.locator(".ow-file-open strong", { hasText: name })).toHaveCount(1);
  });
}
