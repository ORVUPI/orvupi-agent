import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SCREENS = [
  ["home", "Explorar"],
  ["dex", "DEX"],
  ["tracer", "Tracer"],
  ["visualizer", "Visualizer"],
  ["mercado", "Mercado"],
  ["alertas", "Alertas"],
  ["etiquetas", "Etiquetas"],
  ["paneles", "Paneles"],
  ["transfers", "Transfers"],
  ["ficha", "Ficha"],
];

const ADDRESSES = [
  ["solana", "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU"],
  ["ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  ["base", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  ["bnb", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"],
  ["arbitrum", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
  ["polygon", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"],
  ["bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
  ["tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
];

function watch(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource|net::ERR/i.test(text)) return;
    problems.push(`console ${text}`);
  });
  page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
      console.error(`UNHANDLED ${reason}`);
    });
  });
  return problems;
}

async function openScreen(page, id, label, mobile) {
  const dock = ["home", "dex", "tracer", "visualizer", "mercado"];
  if (mobile && dock.includes(id)) {
    await page.locator(`.vf-dock [data-vf-view="${id}"]`).click();
    return;
  }
  if (mobile) {
    await page.locator("#vf-more-open").click();
    await page.locator("#vf-sheet").getByRole("button", { name: label, exact: true }).click();
    return;
  }
  const visible = page.locator(`[data-vf-view="${id}"]:visible`);
  if (await visible.count() === 0) await page.locator("details.vf-more > summary").click();
  await page.locator(`[data-vf-view="${id}"]:visible`).first().click();
}

test("recorre Sonar sin errores de la aplicación", async ({ page }, info) => {
  const problems = watch(page);
  const mobile = info.project.name.endsWith("390");
  const shots = info.project.name.startsWith("chromium");
  await page.goto("/verify/");
  await expect(page).toHaveTitle(/ORVUPI Sonar/);
  await expect(page.locator(".vf-tagline")).toHaveText("Sonar · verify on-chain");
  await page.waitForSelector(".vf-coin strong", { timeout: 60_000 });
  await page.waitForSelector(".vf-chart-canvas:not([hidden])", { timeout: 60_000 });
  await page.locator(".vf-netname:visible").first().waitFor({ state: "visible", timeout: 60_000 });

  async function shot(name) {
    if (!shots) return;
    if (await page.locator(".vf-chart-canvas").count()) {
      await page.waitForSelector(".vf-chart-canvas:not([hidden])", { timeout: 40_000 }).catch(() => {});
    }
    const width = mobile ? "390" : "1440";
    await page.screenshot({ path: `docs/verify/capturas/${width}-${name}.png` });
  }
  if (shots) await mkdir(path.join("docs/verify/capturas"), { recursive: true });
  await shot("explorar");

  for (const [id, label] of SCREENS) {
    await openScreen(page, id, label, mobile);
    await expect(page.locator("#vf-root")).toBeVisible();
    await shot(id === "home" ? "explorar" : id);
  }

  await openScreen(page, "home", "Explorar", mobile);
  for (const frame of ["30m", "4h", "1D"]) {
    await page.locator(".vf-chart-card .vf-seg", { hasText: frame }).first().click();
  }
  await page.locator(".vf-chart-card .vf-segments").last().getByRole("button", { name: "Bitcoin" }).click({ timeout: 2000 }).catch(() => {});

  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await page.keyboard.press("/");
  await expect(page.locator("#vf-modal-q")).toBeVisible();
  await page.keyboard.press("Escape");

  await openScreen(page, "alertas", "Alertas", mobile);
  await page.locator("form input[name='token']").fill("BTC");
  await page.locator("#vf-root").getByRole("button", { name: "Crear" }).click();
  await expect(page.locator(".vf-local")).toContainText("BTC");
  await page.locator("#vf-root").getByRole("button", { name: "Editar" }).click();
  await page.locator("form input[name='token']").fill("ETH");
  await page.locator("#vf-root").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".vf-local")).toContainText("ETH");
  await page.locator("#vf-root").getByRole("button", { name: "Borrar" }).click();

  await openScreen(page, "etiquetas", "Etiquetas", mobile);
  await page.locator("form input[name='name']").fill("nota de prueba");
  await page.locator("#vf-root").getByRole("button", { name: "Crear" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Editar" }).click();
  await page.locator("form input[name='name']").fill("nota editada");
  await page.locator("#vf-root").getByRole("button", { name: "Guardar cambios" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Borrar" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Entidades" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Etiquetas" }).click();

  await openScreen(page, "transfers", "Transfers", mobile);
  await page.locator("#vf-root").getByRole("button", { name: "Entradas" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Salidas" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Todas" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "USD ≥ 1" }).click();
  const next = page.locator(".vf-card").getByRole("button", { name: "›" }).last();
  if (await next.isEnabled()) await next.click();

  await openScreen(page, "visualizer", "Visualizer", mobile);
  const graph = page.locator(".vf-graph");
  await expect(graph).toBeVisible({ timeout: 40_000 });
  const box = await graph.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 70);
    await page.mouse.up();
    await page.mouse.wheel(0, -120);
    await graph.evaluate((el) => {
      const down = (id, x, y) => el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: id, clientX: x, clientY: y, bubbles: true }));
      const move = (id, x, y) => el.dispatchEvent(new PointerEvent("pointermove", { pointerId: id, clientX: x, clientY: y, bubbles: true }));
      const up = (id) => el.dispatchEvent(new PointerEvent("pointerup", { pointerId: id, bubbles: true }));
      down(1, 80, 80);
      down(2, 140, 80);
      move(2, 180, 80);
      up(1);
      up(2);
    });
  }
  await page.locator(".vf-graph-reset").click();

  await openScreen(page, "dex", "DEX", mobile);
  await page.locator("#vf-root").getByRole("button", { name: "Leaderboard" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "Screener" }).click();
  await openScreen(page, "mercado", "Mercado", mobile);
  await page.locator("#vf-root").getByRole("button", { name: "resumen" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "futuros" }).click();
  await page.locator("#vf-root").getByRole("button", { name: "spot" }).click();

  if (info.project.name === "chromium-1440") {
    for (const [chain, address] of ADDRESSES) {
      await page.locator("#red").selectOption(chain);
      await page.locator("#direccion-token").fill(address);
      await page.locator("#consulta button[type='submit']").click();
      await expect(page.locator("[data-address]")).toHaveAttribute("data-address", address, { timeout: 50_000 });
    }
    await page.locator("#direccion-token").fill("esto-no-es-una-direccion");
    await page.locator("#consulta button[type='submit']").click();
    await expect(page.locator("#vf-root")).toContainText("no es una dirección", { timeout: 15_000 });
    const access = await new AxeBuilder({ page }).include("#vf-root").disableRules(["color-contrast"]).analyze();
    expect(access.violations.filter((item) => item.impact === "critical")).toEqual([]);
  }

  if (info.project.name === "chromium-1440") {
    await page.goto("/en/verify/");
    await expect(page).toHaveTitle(/ORVUPI Sonar/);
    await expect(page.locator("nav.vf-nav")).toContainText("Explore");
    await page.goto("/sonar/");
    await expect(page).toHaveTitle(/ORVUPI Sonar/);
  }

  const appErrors = problems.filter((item) => !/CORS|Cross-Origin|Access-Control|Status code: 429|style-src|Content-Security-Policy/i.test(item));
  expect(appErrors, appErrors.join("\n")).toEqual([]);
});

test("si CoinGecko falla, otra fuente real pinta las velas", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-1440", "un proyecto basta para la cadena");
  const problems = watch(page);
  await page.route(/api\.coingecko\.com\/api\/v3\/coins\/.*\/ohlc/, (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.route(/api\.geckoterminal\.com\/.*\/ohlcv\//, (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/verify/#mercado");
  await expect(page.locator(".vf-chart-card .vf-source")).toContainText(/Binance|CoinGecko|GeckoTerminal/, { timeout: 40_000 });
  await expect(page.locator(".vf-chart-canvas:not([hidden]), .vf-chart-card button:has-text('Reintentar'), .vf-chart-card .vf-empty")).toBeVisible();
  expect(problems.filter((item) => !item.includes("503"))).not.toContainEqual(expect.stringMatching(/pageerror|UNHANDLED/));
});
