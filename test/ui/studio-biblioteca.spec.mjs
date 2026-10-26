import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

test("móvil: el chevron abre la biblioteca y cada vista monta", async ({ page }) => {
  await page.goto("/studio/#/plantillas");
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
  await page.locator(".tpl-title").click();
  const sheet = page.locator(".lib-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(".lib-grab")).toBeVisible();
  await expect(sheet.locator(".lib-row")).toHaveCount(4);
  await expect(sheet.locator(".lib-row")).toHaveText([
    "Plantillas",
    "Fotos",
    "Elementos gráficos",
    "Favoritos",
  ]);
  await expect(sheet.getByText("Creators")).toHaveCount(0);
  await expect(sheet.locator(".lib-row[aria-current='true']")).toHaveText("Plantillas");
  const active = await sheet.locator(".lib-row[aria-current='true']").evaluate((node) => {
    const before = getComputedStyle(node, "::before");
    return {
      width: before.width,
      background: before.backgroundColor,
      row: getComputedStyle(node).backgroundColor,
    };
  });
  expect(active.width).toBe("4px");
  expect(active.background).toBe("rgb(139, 61, 255)");
  expect(active.row).toBe("rgb(243, 232, 255)");
  const lines = await sheet.locator(".lib-row").evaluateAll((nodes) => nodes.map((node) => {
    const row = getComputedStyle(node);
    const label = node.querySelector("span");
    const text = label ? getComputedStyle(label) : row;
    return {
      shadow: row.boxShadow,
      borderBottom: row.borderBottomWidth,
      decoration: row.textDecorationLine,
      labelDecoration: text.textDecorationLine,
    };
  }));
  for (const line of lines) {
    expect(line.shadow).toBe("none");
    expect(line.borderBottom).toBe("0px");
    expect(line.decoration).toBe("none");
    expect(line.labelDecoration).toBe("none");
  }

  await sheet.locator(".lib-x").click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator(".tpl-feed h2").first()).toHaveText("Echa un vistazo a las plantillas");

  await page.locator(".tpl-title").click();
  await page.locator(".lib-overlay").click({ position: { x: 12, y: 12 } });
  await expect(page.locator(".lib-sheet")).toHaveCount(0);

  await page.locator(".tpl-title").click();
  await page.locator(".lib-row", { hasText: "Fotos" }).click();
  await expect(page).toHaveURL(/#\/fotos$/);
  await expect(page.locator("[data-library='fotos']")).toBeVisible();
  await expect(page.locator("#buscar")).toHaveAttribute("placeholder", "Busca fotos de alta calidad");
  await expect(page.locator(".lib-hero")).toContainText("Fotos perfectas");
  await expect(page.locator("h2", { hasText: "Explorar fotos" })).toBeVisible();
  const photoCount = Number(await page.locator("[data-library-count]").getAttribute("data-library-count"));
  expect(photoCount).toBeGreaterThanOrEqual(180);
  await expect(page.locator("[data-generate='fotos']")).toBeVisible();
  await expect(page.locator("[data-library='fotos'] [data-asset]")).toHaveCount(photoCount);
  await expect(page.locator(".lib-feed")).not.toContainText(/Canva|Imagen generada con IA|pulpo/i);

  await page.locator("#buscar").fill("papel");
  await expect(page.locator("[data-library='fotos'] [data-asset]").first()).toBeVisible();
  const paper = await page.locator("[data-library='fotos'] [data-asset]").count();
  expect(paper).toBeGreaterThanOrEqual(24);
  await expect(page.locator(".lib-hero")).toHaveCount(0);
  await page.locator("#limpiar-biblioteca").click();
  await expect(page.locator(".lib-hero")).toBeVisible();

  await page.locator(".lib-filters").click();
  await expect(page.locator(".lib-sheet-filter")).toContainText("Gratis y Pro");
  await expect(page.locator(".lib-sheet-filter")).toContainText("Aplicar filtros");
  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await page.locator(".lib-apply").click();
  const proCount = Number(await page.locator("[data-library-count]").getAttribute("data-library-count"));
  expect(proCount).toBeGreaterThan(0);
  expect(proCount).toBeLessThan(photoCount);

  await page.locator(".lib-back").click();
  await expect(page).toHaveURL(/#\/plantillas$/);
  await page.locator(".tpl-title").click();
  await page.locator(".lib-row", { hasText: "Elementos gráficos" }).click();
  await expect(page).toHaveURL(/#\/elementos$/);
  await expect(page.locator("#buscar")).toHaveAttribute("placeholder", /elementos gráficos/i);
  await expect(page.locator("h2", { hasText: "Descubre los elementos gráficos" })).toBeVisible();
  const elementCount = Number(await page.locator("[data-library-count]").getAttribute("data-library-count"));
  expect(elementCount).toBeGreaterThanOrEqual(100);
  await expect(page.locator("[data-generate='elementos']")).toBeVisible();
  await expect(page.locator(".lib-box").first()).toBeVisible();
  const boxBg = await page.locator(".lib-box").first().evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(boxBg).toBe("rgb(243, 244, 246)");

  await page.locator(".lib-back").click();
  await page.goto("/studio/#/creators");
  await expect(page).toHaveURL(/#\/plantillas$/);
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
  await expect(page.locator("[data-creator]")).toHaveCount(0);
  await expect(page.locator(".lib-follow")).toHaveCount(0);
  await expect(page.getByText("Creators", { exact: true })).toHaveCount(0);
  await page.locator(".tpl-title").click();
  await page.locator(".lib-row", { hasText: "Favoritos" }).click();
  await expect(page).toHaveURL(/#\/favoritos$/);
  await expect(page.locator(".lib-empty")).toContainText("Esta carpeta está vacía, pero llena de potencial");
  await expect(page.locator(".lib-empty")).toContainText("Aquí aparecerán los elementos que añadas a Favoritos.");
  await expect(page.locator(".lib-viewbar")).toContainText("Ver como cuadrícula");
  await expect(page.locator("[data-asset]")).toHaveCount(0);

  await expect(page.locator(".canva-nav > button.canva-tab[data-go='plantillas']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".canva-langs a[href='/studio/']")).toHaveCount(1);
  await expect(page.locator(".canva-langs a[href='/en/studio/']")).toHaveCount(1);
});

test("móvil: el hash de plantillas conserva la consulta", async ({ page }) => {
  await page.goto("/studio/#/plantillas?text=Estrategia");
  await expect(page.locator(".canva-plantillas")).toBeVisible();
  await expect(page.locator("#buscar")).toHaveValue("Estrategia");
  await expect(page.locator(".tpl-masonry .tpl-open[aria-label*='Estrategia']").first()).toBeVisible();

  await page.goto("/studio/#/plantillas&grupo=negocios");
  await expect(page.locator(".tpl-chip", { hasText: "Negocios" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tpl-tile", { hasText: "Currículum" })).toBeVisible();
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
});

test("móvil: /en/studio/ muestra la biblioteca en inglés", async ({ page }) => {
  await page.goto("/en/studio/#/plantillas");
  await expect(page.locator(".tpl-title")).toContainText("Templates");
  await page.locator(".tpl-title").click();
  await expect(page.locator(".lib-row")).toHaveText([
    "Templates",
    "Photos",
    "Graphic elements",
    "Favorites",
  ]);
  await expect(page.getByText("Creators", { exact: true })).toHaveCount(0);
  await page.locator(".lib-row", { hasText: "Photos" }).click();
  await expect(page.locator("#buscar")).toHaveAttribute("placeholder", "Search high-quality photos");
  await expect(page.locator(".lib-hero")).toContainText("Perfect photos");
  await page.goto("/en/studio/#/favoritos");
  await expect(page.locator(".lib-empty")).toContainText("This folder is empty, but full of potential");
  await expect(page.locator(".lib-empty")).toContainText("Items you add to Favorites will show up here.");
});
