import { expect, test } from "@playwright/test";

test.use({
  launchOptions: { args: ["--disable-webgpu", "--disable-gpu"] },
});

const heavy = !process.env.ARQIVEN_BROWSER_MODEL;

async function ask(page, question) {
  await page.locator("#prompt").fill(question);
  await page.locator("#send").click();
  return page.locator(".assistant").last();
}

test("si Qwen no carga, SmolLM2 sí responde", async ({ page }) => {
  test.skip(heavy, "Descarga SmolLM2. ARQIVEN_BROWSER_MODEL=1 para ejecutarla.");
  test.setTimeout(300000);
  await page.route(/huggingface\.co|hf\.co/, (route) => {
    if (route.request().url().includes("Qwen3.5-0.8B")) return route.abort();
    return route.continue();
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { configurable: true, get: () => undefined });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/arqiven/");
  await expect(page.locator("#engine-progress")).toContainText("Modelo de terceros listo", { timeout: 240000 });
  await expect(page.locator("#engine-progress")).toContainText("smol135-cpu");
  await expect(page.locator("#engine-progress")).toContainText("no se ha podido cargar");
  const answer = await ask(page, "¿Cuánto es 2 más 2?");
  await expect(answer).toBeVisible({ timeout: 120000 });
  await expect(answer).not.toContainText("no se ha preparado");
  await expect(answer).not.toContainText("GatherBlockQuantized");
  await expect(answer).not.toContainText("no se ha podido cargar");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

async function expectTwelveBySeven(page, size) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { configurable: true, get: () => undefined });
  });
  await page.setViewportSize(size);
  await page.goto("/arqiven/");
  await expect(page.locator("#engine-progress")).toContainText("Modelo de terceros listo", { timeout: 420000 });
  await expect(page.locator("#engine-progress")).toContainText("qwen35-cpu");
  await expect(page.locator("#model-indicator")).toContainText("Qwen3.5-0.8B");
  const answer = await ask(page, "¿Cuánto es 12 por 7?");
  await expect(answer).toContainText("84", { timeout: 180000 });
}

test("Chromium sin WebGPU responde 12 por 7 en escritorio", async ({ page }) => {
  test.skip(heavy, "Descarga Qwen3.5-0.8B q4. ARQIVEN_BROWSER_MODEL=1 para ejecutarla.");
  test.setTimeout(600000);
  await expectTwelveBySeven(page, { width: 1280, height: 800 });
});

test("Chromium sin WebGPU responde 12 por 7 en móvil", async ({ page }) => {
  test.skip(heavy, "Descarga Qwen3.5-0.8B q4. ARQIVEN_BROWSER_MODEL=1 para ejecutarla.");
  test.setTimeout(600000);
  await expectTwelveBySeven(page, { width: 390, height: 844 });
  const box = await page.locator("#send").boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= 845).toBeTruthy();
});
