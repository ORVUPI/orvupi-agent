import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function samplePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 1; index <= 6; index += 1) {
    const sheet = doc.addPage([595, 842]);
    sheet.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: rgb(1, 0.19, 0.44) });
    sheet.drawText(`ORVUPI pagina ${index}`, { x: 48, y: 420, size: 32, font, color: rgb(0.08, 0.1, 0.16) });
  }
  return Buffer.from(await doc.save());
}

async function viewAnchor(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".ow-pdf-scroll");
    const node = document.querySelector<HTMLElement>("[data-pdf-page='4']");
    if (!root || !node) return null;
    const rootRect = root.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const centerX = rootRect.left + root.clientLeft + root.clientWidth / 2;
    const centerY = rootRect.top + root.clientTop + root.clientHeight / 2;
    return {
      relX: (centerX - rect.left) / rect.width,
      relY: (centerY - rect.top) / rect.height,
      width: rect.width,
      height: rect.height,
      label: document.querySelector(".ow-pdf-page")?.textContent ?? "",
      zoom: document.querySelector(".ow-pdf-zoompct")?.textContent ?? "",
    };
  });
}

test("el zoom del PDF no mueve la página que se está leyendo", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Subir archivo").first().setInputFiles({
    name: "zoom-ancla.pdf",
    mimeType: "application/pdf",
    buffer: await samplePdf(),
  });
  await expect(page.locator(".ow-pdf-page")).toHaveText("Página 1 / 6");
  await page.waitForFunction(() => {
    const node = document.querySelector<HTMLElement>("[data-pdf-page='1']");
    return Boolean(node && node.getBoundingClientRect().height > 100);
  });
  await page.getByRole("button", { name: "Mostrar u ocultar miniaturas" }).click();
  await expect(page.locator(".ow-pdf-side")).toHaveCount(0);
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "Página siguiente" }).first().click();
  }
  await expect(page.locator(".ow-pdf-page")).toHaveText("Página 4 / 6");

  const before = await viewAnchor(page);
  expect(before).not.toBeNull();
  const zoomIn = page.getByRole("button", { name: "Ampliar zoom" });
  const zoomOut = page.getByRole("button", { name: "Reducir zoom" });
  for (let step = 0; step < 8; step += 1) await zoomIn.click();
  const zoomed = await viewAnchor(page);
  expect(zoomed?.label).toBe("Página 4 / 6");
  expect(zoomed!.zoom).not.toBe(before!.zoom);
  expect(Math.abs(zoomed!.relX - before!.relX) * zoomed!.width).toBeLessThan(8);
  expect(Math.abs(zoomed!.relY - before!.relY) * zoomed!.height).toBeLessThan(8);
  expect(zoomed!.relX).toBeGreaterThan(-0.02);
  expect(zoomed!.relX).toBeLessThan(1.02);
  expect(zoomed!.relY).toBeGreaterThan(-0.02);
  expect(zoomed!.relY).toBeLessThan(1.02);

  for (let step = 0; step < 8; step += 1) await zoomOut.click();
  const back = await viewAnchor(page);
  expect(back?.label).toBe("Página 4 / 6");
  expect(Math.abs(back!.relX - before!.relX) * back!.width).toBeLessThan(8);
  expect(Math.abs(back!.relY - before!.relY) * back!.height).toBeLessThan(8);

  await page.locator(".ow-pdf-zoompct").click();
  await page.getByRole("menuitem", { name: "200 %", exact: true }).click();
  const wide = await viewAnchor(page);
  expect(wide?.label).toBe("Página 4 / 6");
  expect(Math.abs(wide!.relX - before!.relX) * wide!.width).toBeLessThan(8);
  expect(Math.abs(wide!.relY - before!.relY) * wide!.height).toBeLessThan(8);

  await page.locator(".ow-pdf-zoompct").click();
  await page.getByRole("menuitem", { name: "50 %", exact: true }).click();
  const small = await viewAnchor(page);
  expect(small?.label).toBe("Página 4 / 6");
  expect(small!.relX).toBeGreaterThan(-0.02);
  expect(small!.relX).toBeLessThan(1.02);
  expect(Math.abs(small!.relY - before!.relY) * small!.height).toBeLessThan(8);

  await page.getByRole("button", { name: "Ajustar" }).click();
  await expect(page.locator(".ow-pdf-zoompct")).not.toHaveText(/^50 %/);
  const fitted = await viewAnchor(page);
  expect(fitted?.label).toBe("Página 4 / 6");
  expect(Math.abs(fitted!.relY - before!.relY) * fitted!.height).toBeLessThan(8);
});
