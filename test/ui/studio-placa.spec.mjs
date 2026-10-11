import { expect, test } from "@playwright/test";

import { renderCard } from "../../web/v2/studio/lib/render.mjs";

test("la placa NO OFICIAL se lee en la vista previa", async ({ page }) => {
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await page.locator("#tab-formato").click();
  await page.locator("[data-format='story']").click();
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector("#vista");
    if (canvas.getAttribute("aria-busy") === "true") return 0;
    return canvas.height / canvas.width;
  }), { timeout: 45_000 }).toBeGreaterThan(1.7);

  const shot = await page.evaluate(() => {
    const canvas = document.querySelector("#vista");
    const dpr = window.devicePixelRatio || 1;
    return { width: canvas.width, height: canvas.height, css: canvas.clientWidth, dpr };
  });
  const expectedW = Math.min(1080, Math.round(shot.css * shot.dpr));
  expect(shot.width).toBeGreaterThanOrEqual(expectedW - 2);
  expect(shot.width).toBeLessThanOrEqual(1080);
  expect(shot.height).toBeLessThanOrEqual(1600);
  expect(shot.height / shot.width).toBeGreaterThan(1.7);

  const card = await renderCard({
    width: shot.width,
    height: shot.height,
    lang: "es",
    title: "",
    body: "",
    token: "STUBX",
    fill: "#070418",
    ink: "#f4f7fb",
    backgroundId: "fondo-solana",
    headline: "meme",
    origins: ["ninguno"],
    png: false,
  });
  const plateText = card.glyphs.filter((glyph) => glyph.role === "watermark").map((glyph) => glyph.ch).join("");
  expect(plateText.replace(/\s/g, "")).toBe("NOOFICIAL");
  const box = {
    x: Math.max(0, Math.floor(card.watermarkBox.x)),
    y: Math.max(0, Math.floor(card.watermarkBox.y)),
    w: Math.min(shot.width - Math.floor(card.watermarkBox.x), Math.ceil(card.watermarkBox.w)),
    h: Math.min(shot.height - Math.floor(card.watermarkBox.y), Math.ceil(card.watermarkBox.h)),
  };
  expect(box.w).toBeGreaterThan(8);
  expect(box.h).toBeGreaterThan(8);
  const pixels = await page.evaluate((region) => {
    const canvas = document.querySelector("#vista");
    return Array.from(canvas.getContext("2d").getImageData(region.x, region.y, region.w, region.h).data);
  }, box);
  let diff = 0;
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      const fromShot = (y * box.w + x) * 4;
      const fromCard = ((box.y + y) * card.width + (box.x + x)) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        if (pixels[fromShot + channel] !== card.rgba[fromCard + channel]) diff += 1;
      }
    }
  }
  expect(diff).toBe(0);
});
