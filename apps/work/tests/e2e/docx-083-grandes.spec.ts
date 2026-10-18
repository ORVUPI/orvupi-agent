import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, type Page } from "@playwright/test";
import { writeBigDocx } from "../fixtures/big-docx";
import { screenshotDir } from "./shots";

/**
 * 0.8.3: documentos grandes. DOCX sintéticos con muchas imágenes (30 MB en CI; 30, 100 y 250 MB
 * con ORVUPI_BIG_SIZES=30,100,250 en local). Importa, abre, edita, guarda, recarga y exporta.
 */

const SIZES = (process.env.ORVUPI_BIG_SIZES ?? "30").split(",").map((v) => Number(v.trim())).filter((v) => v > 0);
const TIMES = process.env.ORVUPI_BIG_TIMES ?? join(tmpdir(), "orvupi-big-times.jsonl");

async function fixture(mb: number) {
  const dir = join(tmpdir(), "orvupi-big");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `Actividad_IPE_Enfermedades_Profesionales_${mb}MB.docx`);
  if (!existsSync(path)) await writeBigDocx(path, mb * 1024 * 1024);
  return { path, bytes: (await stat(path)).size, images: Math.max(1, Math.round((mb * 1024 * 1024) / 1_500_000)) };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(await screenshotDir(), `083-grandes-${name}-${test.info().project.name}.png`) });
}

for (const mb of SIZES) {
  test(`DOCX de ${mb} MB con muchas imágenes: importa, abre, edita, guarda, recarga y exporta`, async ({ page }, info) => {
    test.setTimeout(Math.max(240_000, mb * 6_000));
    const { path, bytes, images } = await fixture(mb);
    const times: Record<string, number> = {};
    await page.goto("/");
    // Se vigila que la página siga respondiendo durante la importación (bloqueo máximo entre frames).
    await page.evaluate(() => {
      const w = window as unknown as { __maxGap: number; __gapOn: boolean };
      w.__maxGap = 0;
      w.__gapOn = true;
      let last = performance.now();
      const tick = (now: number) => {
        w.__maxGap = Math.max(w.__maxGap, now - last);
        last = now;
        if (w.__gapOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const start = Date.now();
    const popup = page.waitForEvent("popup", { timeout: mb * 4_000 + 60_000 });
    await page.getByLabel("Subir archivo").first().setInputFiles(path);
    await expect(page.locator(".ow-import-progress")).toBeVisible({ timeout: 20_000 }).catch(() => undefined);
    if (mb >= 100) await shot(page, `progreso-${mb}MB`);
    const doc = await popup;
    times.importMs = Date.now() - start;
    const maxGap = await page.evaluate(() => (window as unknown as { __maxGap: number }).__maxGap);
    const size = page.viewportSize();
    if (size) await doc.setViewportSize(size);
    const editor = doc.locator(".ProseMirror");
    await expect(editor).toBeVisible({ timeout: 120_000 });
    await expect(editor.locator("img[data-asset]")).toHaveCount(images, { timeout: 120_000 });
    times.openMs = Date.now() - start;
    // Las imágenes se pintan desde el almacén de binarios (blob:), no desde base64.
    await expect.poll(() => editor.locator("img[data-asset]").first().evaluate((img) => (img as HTMLImageElement).src.startsWith("blob:") && (img as HTMLImageElement).naturalWidth > 0), { timeout: 60_000 }).toBe(true);
    await shot(doc, `abierto-${mb}MB`);
    // Editar y guardar
    const t0 = Date.now();
    await editor.locator("p").first().click();
    await doc.keyboard.press("Home");
    await doc.keyboard.type(`Editado ${mb} MB. `);
    const saved = doc.getByRole("status").filter({ hasText: "Guardado" });
    void saved;
    // En el teléfono el estado está oculto, pero sigue en el DOM
    await expect(doc.locator(".ow-docs-save")).toHaveText("Guardado", { timeout: 60_000 });
    times.editSaveMs = Date.now() - t0;
    // Recargar: el texto y todas las imágenes siguen
    const t1 = Date.now();
    await doc.reload();
    await expect(doc.locator(".ProseMirror")).toContainText(`Editado ${mb} MB.`, { timeout: 120_000 });
    await expect(doc.locator(".ProseMirror img[data-asset]")).toHaveCount(images, { timeout: 120_000 });
    times.reloadMs = Date.now() - t1;
    await doc.locator(".ProseMirror img[data-asset]").last().scrollIntoViewIfNeeded();
    await expect.poll(() => doc.locator(".ProseMirror img[data-asset]").last().evaluate((img) => (img as HTMLImageElement).naturalWidth > 0), { timeout: 60_000 }).toBe(true);
    await shot(doc, `recargado-final-${mb}MB`);
    // Exportar a DOCX: las imágenes originales vuelven completas (el archivo pesa como el original)
    {
      const more = doc.getByRole("menuitem", { name: "Menús" });
      const fileMenu = doc.getByRole("menuitem", { name: "Archivo", exact: true }).filter({ visible: true }).first();
      const t2 = Date.now();
      const download = doc.waitForEvent("download", { timeout: mb * 3_000 + 60_000 });
      if (await more.isVisible().catch(() => false)) await more.click();
      await fileMenu.click();
      await doc.getByRole("menuitem", { name: /^(Exportar|Descargar)/ }).filter({ visible: true }).first().click();
      await doc.getByRole("menuitem", { name: /DOCX/ }).filter({ visible: true }).first().click();
      const file = await download;
      const out = await readFile((await file.path())!);
      times.exportMs = Date.now() - t2;
      times.exportBytes = out.byteLength;
      expect(out.subarray(0, 2).toString()).toBe("PK");
      expect(out.byteLength).toBeGreaterThan(bytes * 0.9);
    }
    const record = { project: info.project.name, mb, bytes, images, maxFrameGapMs: Math.round(maxGap), ...times };
    info.annotations.push({ type: "tiempos", description: JSON.stringify(record) });
    await appendFile(TIMES, `${JSON.stringify(record)}\n`);
  });
}
