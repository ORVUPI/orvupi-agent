/**
 * Comprueba, a 360x740, que el veredicto de Verify queda en pantalla.
 * Usa el Chrome del sistema y playwright-core (NODE_PATH si no está en el repo).
 * No forma parte de npm test.
 */
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/v2");
const official = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.join(dir, rel);
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = readFileSync(file);
        const type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html";
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const server = await serve(root);
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
let failed = "";
try {
  await page.goto(`http://127.0.0.1:${port}/verify/`, { waitUntil: "networkidle" });
  await page.locator("#direccion-token").fill(official);
  await page.locator("#consulta button[type=submit]").click();
  await page.waitForFunction(() => document.querySelector("#resultado h2")?.textContent === "Está en el registro curado");
  const verdict = await page.evaluate(() => {
    const header = document.querySelector("header.site");
    const title = document.querySelector("#resultado h2");
    const box = title?.getBoundingClientRect();
    const headerBox = header?.getBoundingClientRect();
    const pos = header ? getComputedStyle(header).position : "";
    const sample = box ? document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) : null;
    const inside = sample ? title.contains(sample) || sample === title : false;
    const headerCovers = pos === "fixed" || pos === "sticky"
      ? Boolean(headerBox && box && headerBox.bottom > box.top && headerBox.top < box.bottom)
      : false;
    return {
      text: title?.textContent ?? "",
      pos,
      top: box?.top ?? -1,
      bottom: box?.bottom ?? -1,
      height: window.innerHeight,
      inside,
      headerCovers,
    };
  });
  if (verdict.text !== "Está en el registro curado") failed = `texto: ${verdict.text}`;
  else if (verdict.pos === "fixed" || verdict.pos === "sticky") failed = `cabecera ${verdict.pos}`;
  else if (verdict.top < 0 || verdict.bottom > verdict.height) failed = `fuera de pantalla ${verdict.top}–${verdict.bottom}`;
  else if (!verdict.inside || verdict.headerCovers) failed = "el veredicto está tapado";
  const out = process.env.VERDICT_SHOT;
  if (out) await page.screenshot({ path: out });
  console.log(JSON.stringify(verdict));
} finally {
  await browser.close();
  server.close();
}
if (failed) {
  console.error(failed);
  process.exit(1);
}
void statSync(root);
