import fs from "node:fs";
import path from "node:path";
import pkg from "/tmp/pw/node_modules/playwright-core/index.js";

const { chromium } = pkg;
const outDir = path.resolve("docs/verify/capturas-cmc");
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.SONAR_BASE || "http://127.0.0.1:4173";
const report = [];

function note(name, ok, detail = "") {
  report.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function open(viewport, pathName) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));
  const response = await page.goto(`${base}${pathName}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  return { page, errors, status: response?.status() || 0 };
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const desktop = { width: 1440, height: 900 };
const home = await open(desktop, "/sonar/");
await home.page.waitForSelector("[data-sn-stat]", { timeout: 30000 });
await home.page.waitForSelector("[data-coin=bitcoin]", { timeout: 30000 });
const fear = await home.page.locator("[data-sn-stat=fear]").innerText();
const alt = await home.page.locator("[data-sn-stat=alt]").innerText();
const attrib = await home.page.locator("footer .sn-attrib").innerText();
note("stats", /\d/.test(fear) && /\d/.test(alt) && /Alternative\.me/.test(attrib) && /PatternPlus/.test(attrib), fear.replace(/\s+/g, " "));
await home.page.waitForFunction(() => [...document.querySelectorAll(".sn-table img.sn-logo")].some((img) => img.naturalWidth > 0), { timeout: 10000 });
const logos = await home.page.evaluate(() => [...document.querySelectorAll(".sn-table img.sn-logo")].slice(0, 3).map((img) => img.naturalWidth));
note("logos", logos.some((width) => width > 0), String(logos));
note("home-console", home.errors.length === 0, home.errors.slice(0, 2).join(" | "));
note("home-overflow", (await overflow(home.page)) <= 1, String(await overflow(home.page)));
await shot(home.page, "1440-mercados");

await home.page.locator("[data-sn-star=bitcoin]").first().click();
await home.page.locator("[data-sn-dock=watchlist], .sn-topnav a").nth(0).waitFor();
await home.page.goto(`${base}/sonar/watchlist/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-coin=bitcoin]", { timeout: 30000 });
note("watchlist", true);
await shot(home.page, "1440-watchlist");

await home.page.goto(`${base}/sonar/crypto/bitcoin`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=chart] svg, [data-sn=chart] .sn-state", { timeout: 45000 });
const chartSvg = await home.page.locator("[data-sn=chart] svg").count();
note("chart", chartSvg > 0);
await home.page.locator("[data-sn-period='7d']").click();
await home.page.waitForTimeout(1500);
note("chart-7d", await home.page.locator("[data-sn=chart] svg").count() > 0);
await home.page.locator("[data-sn-tab=acerca]").click();
await home.page.waitForSelector("[data-sn=about]", { timeout: 15000 });
note("about", (await home.page.locator("[data-sn=about]").innerText()).length > 40);
await shot(home.page, "1440-bitcoin");
note("coin-console", home.errors.filter((item) => !item.includes("favicon")).length === 0, home.errors.slice(0, 3).join(" | "));

await home.page.locator("#vf-open-search").click();
await home.page.waitForSelector("[data-sn=q]");
await home.page.fill("[data-sn=q]", "ethereum");
await home.page.waitForSelector(".sn-hits a", { timeout: 20000 });
const hits = await home.page.locator(".sn-hits a").count();
note("search", hits > 0, String(hits));
await shot(home.page, "1440-busqueda");
await home.page.keyboard.press("Escape").catch(() => {});

await home.page.goto(`${base}/sonar/categories/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=categories] a", { timeout: 45000 });
note("categories", true);
await shot(home.page, "1440-categorias");

await home.page.goto(`${base}/sonar/exchanges/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=exchanges]", { timeout: 90000 });
note("exchanges", /Binance/i.test(await home.page.locator("[data-sn=exchanges]").innerText()));
await shot(home.page, "1440-exchanges");

await home.page.goto(`${base}/sonar/trending/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=trending-list]", { timeout: 45000 });
note("trending", true);
await shot(home.page, "1440-tendencia");

await home.page.goto(`${base}/sonar/portfolio/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=portfolio]", { timeout: 20000 });
await home.page.fill("[data-sn=coin-pick]", "bitcoin");
await home.page.locator("[data-sn=coin-results] button").first().waitFor({ timeout: 20000 });
await home.page.locator("[data-sn=coin-results] button").first().click();
await home.page.fill("[name=qty]", "0.1");
await home.page.fill("[name=price]", "100");
await home.page.fill("[name=at]", "2026-01-02");
await home.page.locator("[data-sn=tx-form] button[type=submit]").click();
await home.page.locator("[data-sn=portfolio] a[href*='bitcoin']").waitFor({ timeout: 20000 });
note("portfolio", /BTC/.test(await home.page.locator("[data-sn=portfolio]").innerText()));
await shot(home.page, "1440-cartera");

await home.page.goto(`${base}/sonar/calendar/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=calendar]", { timeout: 30000 });
note("calendar", /PatternPlus/.test(await home.page.locator("[data-sn=calendar]").innerText()));
await shot(home.page, "1440-calendario");

await home.page.goto(`${base}/sonar/unlocks/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=unlocks]", { timeout: 30000 });
note("unlocks", await home.page.locator("[data-sn=unlocks] tr").count() > 1);
await shot(home.page, "1440-unlocks");

await home.page.goto(`${base}/sonar/new/`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-sn=new]", { timeout: 30000 });
note("new-pools", /GeckoTerminal/.test(await home.page.locator("[data-sn=new]").innerText()));
await shot(home.page, "1440-nuevos");

await home.page.goto(`${base}/sonar/?category=meme-token`, { waitUntil: "domcontentloaded" });
await home.page.waitForSelector("[data-coin]", { timeout: 30000 });
note("filter-memes", true);
await shot(home.page, "1440-memes");

await home.page.close();

const missing = await open(desktop, "/sonar/crypto/no-esta-esta-moneda");
note("404", missing.status === 404, String(missing.status));
await missing.page.close();

const verify = await open(desktop, "/verify/");
await verify.page.waitForTimeout(1500);
note("verify", await verify.page.locator("#vf-root").count() === 1 && !(await verify.page.locator(".sn-dock").count()));
await shot(verify.page, "1440-verify");
note("verify-console", verify.errors.length === 0, verify.errors.slice(0, 2).join(" | "));
await verify.page.close();

const phones = [
  ["1920", { width: 1920, height: 1080 }],
  ["1366", { width: 1366, height: 768 }],
  ["1024", { width: 1024, height: 768 }],
  ["768", { width: 768, height: 1024 }],
  ["390", { width: 390, height: 844 }],
  ["412", { width: 412, height: 915 }],
];
for (const [name, viewport] of phones) {
  const page = await open(viewport, "/sonar/");
  await page.page.waitForSelector("[data-sn=stats]", { timeout: 30000 });
  const wide = await overflow(page.page);
  const dock = await page.page.locator(".sn-dock").isVisible();
  note(`viewport-${name}`, wide <= 1 && (viewport.width < 768 ? dock : !dock), `overflow ${wide} dock ${dock}`);
  await shot(page.page, `${name}-mercados`);
  if (name === "390") {
    await shot(page.page, "390-iphone");
    await page.page.goto(`${base}/sonar/crypto/bitcoin`, { waitUntil: "domcontentloaded" });
    await page.page.waitForSelector("[data-sn=chart]", { timeout: 45000 });
    const header = await page.page.locator(".sn-coinhead").boundingBox();
    const chart = await page.page.locator("[data-sn=chart]").boundingBox();
    const fold = !!header && !!chart && header.y < viewport.height - 80 && chart.y + 40 < viewport.height;
    note("390-fold", fold, `header ${header?.y ?? "-"} chart ${chart?.y ?? "-"}`);
    await shot(page.page, "390-bitcoin");
  }
  note(`console-${name}`, page.errors.length === 0, page.errors.slice(0, 1).join(" | "));
  await page.page.close();
}

const en = await open(desktop, "/en/sonar/");
await en.page.waitForSelector("[data-sn=tabs]", { timeout: 30000 });
note("english", /Markets|Top/.test(await en.page.locator("[data-sn=tabs]").innerText()));
await shot(en.page, "1440-en");
await en.page.close();

await browser.close();
const failed = report.filter((row) => !row.ok);
fs.writeFileSync(path.join(outDir, "qa.json"), JSON.stringify(report, null, 2));
console.log(`RESULT ${report.length - failed.length}/${report.length}`);
if (failed.length) process.exitCode = 1;
