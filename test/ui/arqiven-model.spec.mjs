import { expect, test } from "@playwright/test";

test.beforeEach(({ }, testInfo) => {
  test.skip(testInfo.project.use.defaultBrowserType === "webkit", "Esta prueba carga el modelo en Chromium.");
  test.skip(!process.env.ARQIVEN_BROWSER_MODEL, "Descarga los pesos. ARQIVEN_BROWSER_MODEL=1 para ejecutarla.");
});

async function ask(page, question) {
  await page.locator("#prompt").fill(question);
  await page.locator("#send").click();
  return page.locator(".assistant").last();
}

test("si Qwen no carga, SmolLM2 sí responde", async ({ page }) => {
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

async function measured(page, question, marker, forbidden) {
  const started = Date.now();
  const answer = await ask(page, question);
  await expect(answer).toContainText(marker, { timeout: 45000 });
  await expect(answer).toHaveAttribute("data-gen-ms", /[1-9]/, { timeout: 20000 });
  const ms = Number(await answer.getAttribute("data-gen-ms"));
  const tokens = Number(await answer.getAttribute("data-gen-tokens"));
  const threads = Number(await answer.getAttribute("data-gen-threads"));
  const isolated = await page.evaluate(() => crossOriginIsolated);
  console.log(JSON.stringify({ question, marker, ms, tokens, threads, perSecond: Number((tokens / (ms / 1000)).toFixed(1)), isolated, wall: Date.now() - started }));
  await expect(answer).not.toContainText(forbidden);
  await expect(page.locator("#local-editor")).toBeHidden();
  expect(ms).toBeLessThan(30000);
  return answer;
}

async function expectProduct(page, size) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { configurable: true, get: () => undefined });
  });
  await page.setViewportSize(size);
  await page.goto("/arqiven/");
  await expect(page.locator("#engine-progress")).toContainText("Modelo de terceros listo", { timeout: 420000 });
  await expect(page.locator("#engine-progress")).toContainText("qwen35-cpu");
  await expect(page.locator("#model-indicator")).toContainText("Qwen3.5-0.8B");
  await measured(page, "¿Cuánto es 12 por 7?", "84", "96");
  await measured(page, "¿Y si le sumo 16?", "100", "112");
}

test("Chromium sin WebGPU responde 12 por 7 en escritorio", async ({ page }) => {
  test.setTimeout(600000);
  await expectProduct(page, { width: 1440, height: 900 });
});

test("Chromium sin WebGPU responde 12 por 7 en móvil", async ({ page }) => {
  test.setTimeout(600000);
  await expectProduct(page, { width: 390, height: 844 });
  const box = await page.locator("#send").boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= 845).toBeTruthy();
});
