import { expect, test } from "@playwright/test";

async function placeFrame(page) {
  await page.evaluate(() => {
    const frame = document.querySelector(".stage-frame");
    const header = document.querySelector("header.site");
    const mode = getComputedStyle(header).position;
    const stuck = mode === "fixed" || mode === "sticky";
    const bar = stuck ? header.getBoundingClientRect().height : 0;
    const y = frame.getBoundingClientRect().top + window.scrollY - bar - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
  });
}

async function layout(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header.site").getBoundingClientRect();
    const frame = document.querySelector(".stage-frame").getBoundingClientRect();
    const tab = document.querySelector("[data-rail='fondo']").getBoundingClientRect();
    const overlaps = (a, b) => a.bottom > b.top + 1 && a.top < b.bottom - 1 && a.right > b.left + 1 && a.left < b.right - 1;
    return {
      headerBottom: header.bottom,
      canvasTop: frame.top,
      canvasBottom: frame.bottom,
      canvasH: frame.height,
      canvasW: frame.width,
      tabTop: tab.top,
      tabBottom: tab.bottom,
      vh: window.innerHeight,
      covered: overlaps(header, frame),
      tabCoveredByHeader: overlaps(header, tab),
      tabCoveredByCanvas: overlaps(frame, tab),
    };
  });
}

test("escritorio: la pieza se ve entera al editar", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeDisabled();
  await page.locator("[data-template='historia-saludo']").click();
  await expect(page.locator(".stage-frame")).toBeVisible();
  await placeFrame(page);
  const story = await layout(page);
  expect(story.covered).toBe(false);
  expect(story.canvasTop).toBeGreaterThanOrEqual(-1);
  expect(story.canvasBottom).toBeLessThanOrEqual(story.vh + 1);
  expect(story.canvasH).toBeGreaterThan(200);
  expect(story.canvasH / story.canvasW).toBeGreaterThan(1.7);

  await page.locator("[data-rail='fondo']").scrollIntoViewIfNeeded();
  const editing = await layout(page);
  expect(editing.tabCoveredByHeader).toBe(false);
  expect(editing.tabCoveredByCanvas).toBe(false);
  expect(editing.tabTop).toBeGreaterThanOrEqual(-1);
  expect(editing.tabBottom).toBeLessThanOrEqual(editing.vh + 1);

  await page.locator("[data-template='meme-punch']").click();
  await placeFrame(page);
  const square = await layout(page);
  expect(square.covered).toBe(false);
  expect(square.canvasH / square.canvasW).toBeGreaterThan(0.9);
  expect(square.canvasH / square.canvasW).toBeLessThan(1.1);
});
