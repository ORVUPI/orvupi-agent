import { test, expect, devices } from "@playwright/test";

const sizes = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1366, height: 800 },
];

for (const size of sizes) {
  test.describe(`aviso de privacidad de Verify ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("no se queda fijo, se cierra con la X, se recuerda y se reabre", async ({ page }) => {
      await page.goto("/verify/");
      const aviso = page.locator("#aviso-guardar");
      await expect(aviso).toBeVisible();
      expect(await aviso.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
      expect(await aviso.evaluate((el) => getComputedStyle(el).position)).not.toBe("sticky");

      // Tras hacer scroll no tapa la barra inferior.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const barra = page.locator(".consulta-barra");
      const a = await aviso.boundingBox();
      const b = await barra.boundingBox();
      if (a && b && (await aviso.isVisible())) {
        const vh = size.height;
        const aVisible = a.y < vh && a.y + a.height > 0;
        if (aVisible && (await barra.evaluate((el) => getComputedStyle(el).position)) === "fixed") {
          const solapa = a.y < b.y + b.height && a.y + a.height > b.y;
          if (solapa) {
            const z = await aviso.evaluate((el) => getComputedStyle(el).zIndex);
            expect(z === "auto" || Number(z) < 4).toBe(true);
          }
        }
      }

      const cerrar = aviso.locator(".aviso-cerrar");
      const box = await cerrar.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(43.9);
      expect(box.height).toBeGreaterThanOrEqual(43.9);
      await expect(cerrar).toHaveAttribute("aria-label", /privacidad|privacy/i);
      await cerrar.click();
      await expect(aviso).toBeHidden();
      const abrir = page.locator(".privacidad-abrir .aviso-abrir");
      await expect(abrir).toBeVisible();

      await page.reload();
      await expect(page.locator("#aviso-guardar")).toBeHidden();
      await expect(abrir).toBeVisible();

      await abrir.click();
      await expect(page.locator("#aviso-guardar")).toBeVisible();
      await expect(page.locator("#aviso-guardar .aviso-nodos")).toContainText("solana-rpc.publicnode.com");
      await page.reload();
      await expect(page.locator("#aviso-guardar")).toBeVisible();
    });
  });
}
