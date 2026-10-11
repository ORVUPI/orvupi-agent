import { expect, test } from "@playwright/test";

async function layout(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header.site").getBoundingClientRect();
    const canvas = document.querySelector("canvas#vista").getBoundingClientRect();
    const tab = document.querySelector("#tab-formato").getBoundingClientRect();
    const overlaps = (a, b) => a.bottom > b.top + 1 && a.top < b.bottom - 1 && a.right > b.left + 1 && a.left < b.right - 1;
    return {
      headerBottom: header.bottom,
      canvasTop: canvas.top,
      canvasBottom: canvas.bottom,
      canvasH: canvas.height,
      tabTop: tab.top,
      tabBottom: tab.bottom,
      vh: window.innerHeight,
      covered: overlaps(header, canvas),
      tabCoveredByHeader: overlaps(header, tab),
      tabCoveredByCanvas: overlaps(canvas, tab),
    };
  });
}

test("escritorio: la vista previa se ve entera al editar", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await page.locator("#tab-formato").scrollIntoViewIfNeeded();
  const square = await layout(page);
  expect(square.covered).toBe(false);
  expect(square.canvasTop).toBeGreaterThanOrEqual(square.headerBottom - 1);
  expect(square.canvasBottom).toBeLessThanOrEqual(square.vh + 1);
  expect(square.canvasH).toBeGreaterThan(200);
  expect(square.tabTop).toBeGreaterThanOrEqual(0);
  expect(square.tabBottom).toBeLessThanOrEqual(square.vh + 1);
  expect(square.tabCoveredByHeader).toBe(false);
  expect(square.tabCoveredByCanvas).toBe(false);

  await page.locator("#tab-formato").click();
  const storyButton = page.locator("[data-format='story']");
  await storyButton.click();
  await expect(storyButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector("canvas#vista");
    return canvas.height / canvas.width;
  }), { timeout: 45_000 }).toBeGreaterThan(1.7);
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas#vista");
    const header = document.querySelector("header.site");
    const mode = getComputedStyle(header).position;
    const stuck = mode === "fixed" || mode === "sticky";
    const bar = stuck ? header.getBoundingClientRect().height : 0;
    const y = canvas.getBoundingClientRect().top + window.scrollY - bar - 8;
    window.scrollTo(0, Math.max(0, y));
  });
  const story = await layout(page);
  expect(story.covered).toBe(false);
  expect(story.canvasTop).toBeGreaterThanOrEqual(-1);
  expect(story.canvasBottom).toBeLessThanOrEqual(story.vh + 1);
  expect(story.canvasH).toBeGreaterThan(400);

  await page.locator("#tab-formato").scrollIntoViewIfNeeded();
  const editing = await layout(page);
  expect(editing.covered).toBe(false);
  expect(editing.tabCoveredByHeader).toBe(false);
  expect(editing.tabTop).toBeGreaterThanOrEqual(-1);
  expect(editing.tabBottom).toBeLessThanOrEqual(editing.vh + 1);
});
