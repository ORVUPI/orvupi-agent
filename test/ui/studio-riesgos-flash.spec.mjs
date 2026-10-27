import { expect, test } from "@playwright/test";

async function visibleRiskLabel(page) {
  return page.locator("a[href$='risks/'], h1, h2").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (node.getClientRects().length === 0) return false;
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        return text === "Riesgos" || text === "Risks";
      })
      .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim()),
  );
}

test("abrir Studio no pinta la franja de Riesgos", async ({ page, browser }) => {
  await page.goto("/#herramientas");
  const card = page.locator("article.or-card", { has: page.getByRole("heading", { name: "Studio", exact: true }) });
  await card.getByRole("link", { name: /Abrir herramienta/ }).click();
  await expect(page).toHaveURL(/\/studio\/?$/);
  await expect(page.getByText("¿Qué diseñamos hoy?")).toBeVisible();
  await expect(page.locator("footer")).toHaveCount(0);
  expect(await visibleRiskLabel(page)).toEqual([]);

  const context = await browser.newContext({ javaScriptEnabled: false });
  const shell = await context.newPage();
  await shell.setViewportSize({ width: 390, height: 844 });
  await shell.goto("/studio/");
  await expect(shell.locator("footer")).toHaveCount(0);
  expect(await visibleRiskLabel(shell), "primer pintado sin JS").toEqual([]);
  await expect(shell.locator(".langpick summary")).toContainText("Español");
  await context.close();
});

test("la página de riesgos sigue accesible a propósito", async ({ page }) => {
  await page.goto("/risks/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Límites y riesgos");
  await expect(page.locator("footer a[href$='risks/']").first()).toBeVisible();
  await expect(page.locator("main")).toContainText("Las herramientas son informativas.");
});
