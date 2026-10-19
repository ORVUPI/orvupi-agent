import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/** 0.8.3: capturas de color de cada herramienta (ORVUPI_COLOR_TAG = antes | despues). */
const TAG = process.env.ORVUPI_COLOR_TAG ?? "despues";
const TOOLS: Array<[string, string | null]> = [
  ["drive", null],
  ["docs", "Nuevo documento"],
  ["hojas", "Nueva hoja"],
  ["presentaciones", "Nueva presentación"],
  ["formularios", "Nuevo formulario"],
  ["dibujos", "Nuevo dibujo"],
  ["notas", "Nueva nota"],
];

async function open(page: Page, label: string): Promise<Page> {
  const button = page.getByRole("button", { name: label, exact: true }).first();
  if (!(await button.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Nuevo", exact: true }).first().click();
    const item = page.getByRole("menuitem", { name: label, exact: true }).or(page.getByRole("button", { name: label, exact: true })).first();
    const popup = page.waitForEvent("popup", { timeout: 15_000 }).catch(() => null);
    await item.click();
    return (await popup) ?? page;
  }
  const popup = page.waitForEvent("popup", { timeout: 15_000 }).catch(() => null);
  await button.click();
  return (await popup) ?? page;
}

for (const [name, label] of TOOLS) {
  test(`colores ${name}`, async ({ page }, info) => {
    await page.goto("/");
    await expect(page.locator(".ow-topbar")).toBeVisible();
    const target = label ? await open(page, label) : page;
    await target.waitForLoadState("domcontentloaded");
    await target.waitForTimeout(1500);
    await target.screenshot({ path: join(await screenshotDir(), `083-colores-${name}-${TAG}-${info.project.name}.png`) });
    // Sin avatar «O» junto a Exportar
    expect(await target.locator(".ow-docs-avatar").count()).toBe(0);
  });
}
