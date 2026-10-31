import { test, expect } from "@playwright/test";

const sizes = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1366, height: 800 },
];

for (const size of sizes) {
  test.describe(`Verify app ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("no muestra el aviso de nodos ni el recuadro informativo, y el buscador no queda bajo la barra", async ({ page }) => {
      await page.goto("/verify/");
      await expect(page.locator("#aviso-guardar")).toBeHidden();
      await expect(page.locator('.aviso[data-disclaimer="si"]')).toBeHidden();
      await expect(page.locator(".langsuggest")).toHaveCount(0);
      await expect(page.locator("footer a[href$='risks/']").first()).toBeVisible();
      const field = await page.locator("#direccion-token").boundingBox();
      expect(field).toBeTruthy();
      expect(field.width).toBeGreaterThan(80);
      const dock = await page.locator(".vf-dock").boundingBox();
      if (dock) expect(field.y + field.height).toBeLessThanOrEqual(dock.y + 1);
    });
  });
}
