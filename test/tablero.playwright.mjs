/**
 * Tablero en Pixel 7 (Chromium), iPhone 14 (WebKit) y escritorio.
 * Usa playwright-core, por NODE_PATH si no está en el repo.
 * No forma parte de npm test y no añade dependencias al package.json.
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, webkit } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web/v2");
const shots = process.env.TABLERO_SHOTS || "test-results/artifacts/screenshots";
const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";

const TYPES = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.resolve(dir, `.${rel}`);
      if (file !== dir && !file.startsWith(`${dir}${path.sep}`)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = readFileSync(file);
        const type = TYPES[path.extname(file)] ?? "application/octet-stream";
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

function must(ok, message) {
  if (!ok) throw new Error(message);
}

async function check(page, name) {
  await page.goto("/", { waitUntil: "load" });
  must(await page.getByRole("link", { name: "Abrir el tablero" }).isVisible(), "falta el enlace de la portada");
  await page.goto("/tablero/", { waitUntil: "load" });
  must((await page.locator("h1").innerText()).includes("Tablero de construcción"), "título");
  must((await page.locator("#como-leerlo").innerText()).includes("No es un plazo"), "plazo");
  must((await page.locator("#plantilla").innerText()).includes("no avala ningún token"), "plantilla");
  must(await page.locator('#plantilla a[href="/modules/tablero/plantilla.json"]').isVisible(), "enlace de la plantilla");
  must(!(await page.locator("footer").innerText()).includes(FOOTER_ES), "pie");
  must((await page.locator("form").count()) === 0, "formulario");
  must((await page.locator('[data-web="si"]').count()) === 6, "publicado");
  must((await page.locator('[data-web="no"]').count()) > 0, "sin publicar");
  const boardText = await page.locator("main").innerText();
  must(boardText.includes("La columna «En esta web» dice sí solo si la función se puede abrir hoy en la web."), "columna");
  must(boardText.includes("Publicada en /contribuir el 2026-10-10."), "u04");
  must(boardText.includes("Ejemplo educativo fijo, revisado por Legal."), "legal");
  must(boardText.includes("2026-10-09 · Medición de uso: ninguna en el cliente"), "medicion");
  must(!boardText.includes("Nada de esta página está publicado"), "frase falsa");
  must(!boardText.includes("Hoy ninguna lo está"), "ninguna");
  must(!boardText.includes("Hace falta definir el canal"), "canal");
  must(!boardText.includes("Hace falta un abogado"), "abogado");
  await page.screenshot({ path: path.join(shots, `u03-tablero-${name}-es.png`), fullPage: name === "desktop" });

  await page.getByRole("button", { name: "English" }).click();
  must(await page.locator("html").getAttribute("data-lang") === "en", "idioma");
  must((await page.locator("h1").innerText()).includes("Construction board"), "título en");
  must((await page.locator("#como-leerlo").innerText()).includes("It is not a deadline"), "plazo en");
  must((await page.locator("#como-leerlo").innerText()).includes("The “On this website” column says yes only if the function can be opened on the website today."), "columna en");
  must(!(await page.locator("footer").innerText()).includes(FOOTER_EN), "pie en");
  await page.locator('a[href="#grupo-propuesta"]').click();
  const box = await page.locator("#grupo-propuesta").boundingBox();
  const viewport = page.viewportSize();
  must(Boolean(box && viewport && box.y < viewport.height && box.y + box.height > 0), "el grupo queda fuera de la vista");
  await page.screenshot({ path: path.join(shots, `u03-tablero-${name}-en.png`), fullPage: false });
}

const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const projects = [
  { name: "mobile", engine: chromium, device: { ...devices["Desktop Chrome"], ...mobile, userAgent: devices["Pixel 7"].userAgent } },
  { name: "mobile-webkit", engine: webkit, device: { ...devices["Desktop Chrome"], ...mobile, userAgent: devices["iPhone 14"].userAgent } },
  { name: "desktop", engine: chromium, device: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
];

mkdirSync(shots, { recursive: true });
const server = await serve(root);
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const base = `http://127.0.0.1:${port}`;
let failed = "";
try {
  for (const project of projects) {
    const browser = await project.engine.launch({ headless: true });
    const context = await browser.newContext({ ...project.device, baseURL: base });
    const page = await context.newPage();
    try {
      await check(page, project.name);
      console.log(`ok ${project.name}`);
    } catch (error) {
      failed = `${project.name}: ${error instanceof Error ? error.message : "fallo"}`;
      break;
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
if (failed) {
  console.error(failed);
  process.exit(1);
}
void statSync(root);
