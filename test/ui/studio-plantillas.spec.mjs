import { expect, test } from "@playwright/test";

test("móvil: plantillas usa el shell Canva, sin barra lateral", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/#/plantillas");
  await expect(page.locator(".canva-plantillas")).toBeVisible();
  await expect(page.locator(".orv-side, .side-stack, .orv-frame")).toHaveCount(0);
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
  await expect(page.locator("#buscar")).toHaveAttribute("placeholder", "Busca plantillas");
  await expect(page.locator(".tpl-chip")).toHaveCount(6);
  await expect(page.locator(".tpl-feed h2")).toHaveText([
    "Echa un vistazo a las plantillas",
    "Próximos eventos",
    "Inspirado en tus diseños",
    "Descubre ORVUPI",
    "Tendencias cerca de ti",
    "Los destacados en ORVUPI",
    "Más plantillas para ti",
  ]);
  await expect(page.locator(".tpl-glance .tpl-tile").first()).toBeVisible();
  await expect(page.locator(".tpl-masonry img").first()).toBeVisible();
  await expect(page.locator(".tpl-masonry .canva-card-name, .tpl-masonry .plantilla-nombre")).toHaveCount(0);
  await expect(page.locator(".tpl-masonry .canva-more").first()).toBeVisible();
  await expect(page.locator(".canva-nav > button.canva-tab[data-go='plantillas']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".canva-nav")).toContainText("ORVUPI IA");
  await expect(page.locator(".canva-nav")).toContainText("Más");
  await expect(page.locator(".canva-avatar, .canva-badge")).toHaveCount(0);
  await expect(page.locator(".tpl-chevron")).toBeVisible();
  const chevron = await page.locator(".tpl-chevron").boundingBox();
  expect(chevron.width).toBeGreaterThanOrEqual(20);
  expect(chevron.width).toBeLessThanOrEqual(24);
  expect(chevron.height).toBeGreaterThanOrEqual(20);
  expect(chevron.height).toBeLessThanOrEqual(24);
  const thumbs = await page.evaluate(() => {
    const srcOf = (img) => img.getAttribute("src") || "";
    const glance = [...document.querySelectorAll(".tpl-glance img")].map(srcOf);
    const rails = [...document.querySelectorAll(".tpl-rail-card img")].map(srcOf);
    const masonry = [...document.querySelectorAll(".tpl-masonry img")].map(srcOf);
    const ids = [...document.querySelectorAll(".tpl-feed .tpl-open")].map((node) => node.getAttribute("data-thumb") || "");
    const repeated = (list) => [...new Set(list.filter((value, index) => value && list.indexOf(value) !== index))];
    const all = [...glance, ...rails, ...masonry];
    return {
      glance: glance.length,
      rails: rails.length,
      masonry: masonry.length,
      dupSrc: repeated(all),
      dupId: repeated(ids),
    };
  });
  expect(thumbs.glance).toBeGreaterThan(0);
  expect(thumbs.rails).toBeGreaterThan(0);
  expect(thumbs.masonry).toBeGreaterThanOrEqual(390);
  expect(thumbs.masonry).toBeLessThanOrEqual(430);
  expect(thumbs.dupSrc).toEqual([]);
  expect(thumbs.dupId).toEqual([]);
  await expect(page.locator(".tpl-tile", { hasText: "Enlace en la biografía" })).toBeVisible();
  await expect(page.locator(".tpl-tile", { hasText: "Tu historia" })).toBeVisible();
  await expect(page.locator("#studio-root")).not.toContainText(/Disney|Descubre Canva|Canva IA/i);

  const chrome = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector(".tpl-title"));
    const more = getComputedStyle(document.querySelector(".tpl-masonry .canva-more summary"));
    const arrow = document.querySelector(".tpl-arrow");
    const rail = document.querySelector(".tpl-rail-row");
    const card = rail.querySelector(".tpl-rail-card");
    const masonry = document.querySelector(".tpl-masonry");
    const first = masonry.querySelector(".tpl-card");
    return {
      titleBorder: title.borderTopWidth,
      titleBg: title.backgroundColor,
      titleSize: Number.parseFloat(title.fontSize),
      moreSize: Number.parseFloat(more.width),
      moreBorder: more.borderTopWidth,
      arrowDisplay: arrow ? getComputedStyle(arrow).display : "none",
      railLeft: Math.round(card.getBoundingClientRect().left - rail.getBoundingClientRect().left),
      masonryShadow: getComputedStyle(first).boxShadow,
      scroll: getComputedStyle(document.documentElement).scrollbarWidth,
    };
  });
  expect(chrome.titleBorder).toBe("0px");
  expect(chrome.titleBg).toBe("rgba(0, 0, 0, 0)");
  expect(chrome.titleSize).toBeGreaterThanOrEqual(24);
  expect(chrome.titleSize).toBeLessThanOrEqual(28);
  expect(chrome.moreSize).toBeLessThanOrEqual(28);
  expect(chrome.moreBorder).toBe("0px");
  expect(chrome.arrowDisplay).toBe("none");
  expect(chrome.railLeft).toBeGreaterThanOrEqual(12);
  expect(chrome.railLeft).toBeLessThanOrEqual(20);
  expect(chrome.masonryShadow).not.toBe("none");

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
