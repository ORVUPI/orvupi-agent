import { devices, expect, test, type Page } from "@playwright/test";
import { appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION } from "../../src/version";

import { screenshotDir } from "./shots";
const pixel7 = devices["Pixel 7"];
const ANDROID = {
  userAgent: pixel7.userAgent,
  deviceScaleFactor: pixel7.deviceScaleFactor,
  viewport: { width: 460, height: 900 },
  isMobile: true,
  hasTouch: true,
};

const OLD_SW = `
const CACHE = "orvupi-work-old";
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.put("/", new Response(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>viejo</title></head><body><p id="ow-old">viejo</p></body></html>',
    { headers: { "content-type": "text/html; charset=utf-8" } },
  ))));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(caches.match("/").then((cached) => cached || fetch(event.request)));
});
`;

async function openDoc(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Nuevo documento", exact: true })).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const docs = await opened;
  await docs.waitForLoadState("domcontentloaded");
  return docs;
}

test.describe("Chrome de Android", () => {
  test.use(ANDROID);

  test("Docs a 460, 480 y con el puntero grueso usa el móvil y enseña la versión", async ({ page }) => {
    await page.goto("/");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
    expect(viewport).toContain("initial-scale=1");
    for (const width of [460, 480, 980]) {
      await page.setViewportSize({ width, height: 900 });
      const docs = await openDoc(page);
      await docs.setViewportSize({ width, height: 900 });
      await expect(docs.locator(".ow-docs")).toHaveAttribute("data-layout", "mobile");
      await expect(docs.locator(".ow-docs")).toHaveAttribute("data-version", APP_VERSION);
      await expect(docs.locator(".ow-menu-overflow")).toBeVisible();
      await expect(docs.locator(".ow-format-dock")).toBeVisible();
      await expect(docs.locator(".ow-docs-toolbar")).toBeHidden();
      await expect(docs.locator(".ow-vruler")).toHaveCount(0);
      await expect(docs.locator(".ow-hruler")).toHaveCount(0);
      const box = await docs.locator(".ow-a4").boundingBox();
      const size = docs.viewportSize();
      if (!box || !size) throw new Error("la hoja no está en pantalla");
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 2);
      await docs.locator(".ow-menu-overflow").click();
      await docs.getByRole("menuitem", { name: "Ayuda", exact: true }).click();
      await expect(docs.getByText(`Versión ${APP_VERSION}`)).toBeVisible();
      if (width === 460) {
        await docs.keyboard.press("Escape");
        await docs.screenshot({ path: `${await screenshotDir()}/063-docs.png` });
      }
      await docs.close();
    }
  });
});

test("un service worker viejo se sustituye y aparece Nueva versión", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.route("**/sw.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    headers: { "cache-control": "no-store" },
    body: OLD_SW,
  }));
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect(page.locator("#ow-old")).toHaveText("viejo");

  await context.unroute("**/sw.js");
  const changed = page.evaluate(() => new Promise((resolve) => {
    navigator.serviceWorker.addEventListener("controllerchange", () => resolve(true), { once: true });
  }));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await changed;
  await page.reload();
  await expect(page.locator(".ow-top-title")).toBeVisible();

  const source = await (await page.request.get("/sw.js")).text();
  expect(source).toContain("skipWaiting");
  expect(source).toContain("clientsClaim");
  expect(source).toContain("NetworkFirst");
  expect(source).toContain("orvupi-work-063");
  const swPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist/sw.js");
  await appendFile(swPath, `\n// orvupi-work-063-next-${Date.now()}\n`);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await expect(page.locator(".ow-update")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recargar", exact: true })).toBeVisible();
  await page.screenshot({ path: `${await screenshotDir()}/063-update.png` });
  await page.getByRole("button", { name: "Recargar", exact: true }).click();
  await expect(page.locator(".ow-top-title")).toBeVisible();
});
