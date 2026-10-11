import { expect, test } from "@playwright/test";

test("móvil: el cambio de fondo y de formato responde sin bloquear", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "solo el móvil emulado");
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 60_000 });

  async function change(selector) {
    return page.evaluate(async (sel) => {
      const button = document.querySelector(sel);
      const canvas = document.querySelector("#vista");
      const loading = document.querySelector("#vista-carga");
      const sample = () => {
        const pixel = canvas.getContext("2d").getImageData(6, 6, 1, 1).data;
        return `${canvas.width}x${canvas.height}:${pixel[0]},${pixel[1]},${pixel[2]}`;
      };
      const before = sample();
      const start = performance.now();
      button.click();
      const response = performance.now() - start;
      const busy = canvas.getAttribute("aria-busy") === "true" || loading.hidden === false;
      let paint = 0;
      await new Promise((resolve) => {
        const tick = () => {
          const now = performance.now() - start;
          if (sample() !== before) {
            paint = now;
            resolve();
            return;
          }
          if (now > 8000) resolve();
          else setTimeout(tick, 16);
        };
        setTimeout(tick, 16);
      });
      return {
        response: Math.round(response),
        busy,
        paint: Math.round(paint),
        width: canvas.width,
        height: canvas.height,
      };
    }, selector);
  }

  await page.locator("#tab-fondo").click();
  const fondo = await change("#opcion-fondo button:nth-child(2)");
  const fondo2 = await change("#opcion-fondo button:nth-child(4)");
  await page.locator("#tab-formato").click();
  const story = await change("[data-format='story']");
  const square = await change("[data-format='square']");
  const times = { fondo, fondo2, story, square };
  console.log(JSON.stringify(times));
  for (const [name, item] of Object.entries(times)) {
    expect(item.response, name).toBeLessThan(100);
    expect(item.busy, name).toBe(true);
    expect(item.paint, name).toBeGreaterThan(0);
    expect(item.paint, name).toBeLessThan(8000);
    expect(item.width, name).toBeLessThanOrEqual(1080);
    expect(item.height, name).toBeLessThanOrEqual(1600);
    expect(Math.max(item.width, item.height), name).toBeGreaterThan(540);
  }
  expect(story.height / story.width).toBeGreaterThan(1.7);
  expect(square.width).toBe(square.height);
});

test("móvil: alternar fondo, formato y titular no congela más de 200 ms", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "solo el móvil emulado");
  test.setTimeout(120_000);
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 60_000 });
  await page.locator("#tab-fondo").click();

  const report = await page.evaluate(async () => {
    const gaps = [];
    let last = 0;
    let watch = false;
    const loop = (stamp) => {
      if (last && watch && stamp - last > 200) gaps.push(Math.round(stamp - last));
      last = stamp;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const responses = [];
    const click = (selector) => {
      const button = document.querySelector(selector);
      const start = performance.now();
      button.click();
      responses.push(Math.round(performance.now() - start));
    };
    watch = true;
    for (let round = 0; round < 3; round += 1) {
      for (let i = 1; i <= 6; i += 1) {
        click(`#opcion-fondo button:nth-child(${i})`);
        await pause(40);
      }
      await pageWaitTab();
      for (const format of ["story", "square", "story", "square"]) {
        click(`[data-format="${format}"]`);
        await pause(40);
      }
      const input = document.querySelector("#titulo");
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      for (const ch of "Direccion segura") {
        input.value += ch;
        const start = performance.now();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        responses.push(Math.round(performance.now() - start));
        await pause(40);
      }
    }
    await pause(1500);
    watch = false;
    return {
      gaps,
      maxGap: gaps.reduce((max, gap) => Math.max(max, gap), 0),
      maxResponse: responses.reduce((max, gap) => Math.max(max, gap), 0),
    };

    async function pageWaitTab() {
      document.querySelector("#tab-formato").click();
      await pause(40);
    }
  });
  console.log(JSON.stringify(report));
  expect(report.maxResponse).toBeLessThan(100);
  expect(report.gaps).toEqual([]);
});

test("el aviso de preparación se ve también en escritorio", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "solo escritorio");
  await page.goto("/studio/");
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await page.locator("#tab-formato").click();
  await page.locator("[data-format='story']").click();
  await expect(page.locator("#aviso-preparando")).toBeVisible();
  await expect(page.locator("#descargar")).toBeDisabled();
  await expect(page.locator("#descargar")).toHaveClass(/preparando/);
  await expect(page.locator("#compartir")).toBeHidden();
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await expect(page.locator("#aviso-preparando")).toBeHidden();
});
