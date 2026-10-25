import { expect, test } from "@playwright/test";

test("móvil: plantillas usa el shell Canva, sin barra lateral", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/#/plantillas");
  await expect(page.locator(".canva-plantillas")).toBeVisible();
  await expect(page.locator(".orv-side, .side-stack, .orv-frame")).toHaveCount(0);
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
  await expect(page.locator("#buscar")).toHaveAttribute("placeholder", "Busca plantillas");
  await expect(page.locator(".tpl-chip")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Echa un vistazo a las plantillas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximos eventos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspirado en tus diseños" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Destacados ORVUPI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tendencias cerca de ti" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Más plantillas para ti" })).toBeVisible();
  await expect(page.locator(".tpl-glance .tpl-tile").first()).toBeVisible();
  await expect(page.locator(".tpl-masonry img").first()).toBeVisible();
  await expect(page.locator(".tpl-masonry .canva-card-name, .tpl-masonry .plantilla-nombre")).toHaveCount(0);
  await expect(page.locator(".tpl-masonry .canva-more").first()).toBeVisible();
  await expect(page.locator(".canva-nav > button.canva-tab[data-go='plantillas']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".canva-nav")).toContainText("ORVUPI IA");
  await expect(page.locator(".canva-nav")).toContainText("Más");
  await expect(page.locator("#studio-root")).not.toContainText(/Disney|Descubre Canva|Canva IA/i);

  const layout = await page.evaluate(() => {
    const masonry = document.querySelector(".tpl-masonry");
    const card = masonry.querySelector(".tpl-card");
    const radius = Number.parseFloat(getComputedStyle(card).borderRadius);
    return {
      cols: getComputedStyle(masonry).columnCount,
      ratio: card.getBoundingClientRect().width / masonry.getBoundingClientRect().width,
      radius,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.cols).toBe("2");
  expect(layout.ratio).toBeGreaterThan(0.4);
  expect(layout.ratio).toBeLessThan(0.56);
  expect(layout.radius).toBeGreaterThanOrEqual(7);
  expect(layout.radius).toBeLessThanOrEqual(10);
  expect(layout.overflow).toBeLessThanOrEqual(1);

  await expect(page.locator(".canva-plantillas")).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 520));
  await expect(page.locator(".canva-plantillas")).toHaveClass(/is-scrolled/);

  await page.locator(".tpl-chip", { hasText: "Negocios" }).click();
  await expect(page.locator(".tpl-chip", { hasText: "Negocios" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tpl-tile", { hasText: "Post de Instagram" })).toHaveCount(0);
  await expect(page.locator(".tpl-tile", { hasText: "Currículum" })).toBeVisible();

  await page.locator("#buscar").fill("Estrategia");
  await expect(page.locator(".tpl-open", { hasText: "" }).first()).toBeVisible();
  await expect(page.locator(".tpl-masonry .tpl-open[aria-label*='Estrategia']").first()).toBeVisible();
  await page.locator(".tpl-masonry .tpl-open").first().click();
  await expect(page.locator("#editor-app")).toBeVisible();
});
