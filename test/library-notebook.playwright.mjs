/**
 * Biblioteca y cuaderno a 390×844 en WebKit y en Pixel, y en escritorio. El RPC se simula: no sale a la red.
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, webkit } from "playwright";
import { METADATA_PROGRAM, PUMP_PROGRAM, TOKEN_PROGRAM } from "../web/v2/shared/solana-read.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web/v2");
const shots = "test-results/artifacts/screenshots";
const official = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
mkdirSync(shots, { recursive: true });

function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.normalize(path.join(dir, rel));
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = readFileSync(file);
        const type = file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".js") || file.endsWith(".mjs")
            ? "text/javascript"
            : file.endsWith(".svg")
              ? "image/svg+xml"
              : file.endsWith(".png")
                ? "image/png"
                : file.endsWith(".webp")
                  ? "image/webp"
                  : file.endsWith(".jpg")
                    ? "image/jpeg"
                    : file.endsWith(".json")
                      ? "application/json"
                      : "text/html";
        res.writeHead(200, {
          "content-type": `${type}; charset=utf-8`,
          "content-security-policy": file.endsWith("cuaderno/index.html")
            ? "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://solana-rpc.publicnode.com https://api.mainnet-beta.solana.com; object-src 'none'; base-uri 'self'"
            : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'",
        });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function mintBytes() {
  const bytes = Buffer.alloc(82);
  bytes.writeUInt32LE(0, 0);
  bytes.writeBigUInt64LE(1000n, 36);
  bytes[44] = 6;
  bytes[45] = 1;
  bytes.writeUInt32LE(0, 46);
  return bytes;
}

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function metadataBytes() {
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 3),
    Buffer.alloc(32, 4),
    borsh("ORVUPI"),
    borsh("STB"),
    borsh("https://evil.example/phish"),
    Buffer.from([0, 0, 0, 0, 0]),
  ]);
}

function curveBytes() {
  const bytes = Buffer.alloc(49);
  Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(bytes, 0);
  bytes.writeBigUInt64LE(10n, 8);
  bytes.writeBigUInt64LE(20n, 16);
  bytes.writeBigUInt64LE(30n, 24);
  bytes.writeBigUInt64LE(40n, 32);
  return bytes;
}

function account(owner, data) {
  return { owner, data: [data.toString("base64"), "base64"], executable: false, lamports: 1, rentEpoch: 0 };
}

function rpc(value) {
  return JSON.stringify({ jsonrpc: "2.0", id: 1, result: { context: { slot: 321 }, value } });
}

const server = await serve(root);
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const base = `http://127.0.0.1:${port}`;
const chrome = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const kit = await webkit.launch({ headless: true });

const failures = [];

async function shot(page, name) {
  const file = path.join(shots, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function allowedRequest(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.origin === base) return true;
  const allowed = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
  return allowed.some((item) => parsed.origin === new URL(item).origin);
}

async function mockRpc(page, counter) {
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    if (!allowedRequest(route.request().url())) {
      counter.external += 1;
      await route.abort();
      return;
    }
    counter.count += 1;
    const body = route.request().postDataJSON();
    if (body.method === "getMultipleAccounts") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: rpc([
          account(TOKEN_PROGRAM, mintBytes()),
          account(METADATA_PROGRAM, metadataBytes()),
          account(PUMP_PROGRAM, curveBytes()),
        ]),
      });
      return;
    }
    if (body.method === "getTokenSupply") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: rpc({ amount: "1000", decimals: 6 }),
      });
      return;
    }
    await route.fulfill({ status: 400, contentType: "application/json", body: rpc(null) });
  });
  await page.route("**/*", (route) => {
    if (allowedRequest(route.request().url())) {
      route.fallback();
      return;
    }
    counter.external += 1;
    route.abort();
  });
}

function contextFor(profile) {
  const { defaultBrowserType, ...options } = profile.device;
  return profile.browser.newContext(options);
}

const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const profiles = [
  {
    id: "webkit-390",
    browser: kit,
    device: { ...phone, userAgent: devices["iPhone 14"].userAgent },
  },
  {
    id: "pixel-390",
    browser: chrome,
    device: { ...phone, userAgent: devices["Pixel 7"].userAgent },
  },
  {
    id: "escritorio",
    browser: chrome,
    device: {
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
];

try {
  for (const profile of profiles) {
    const context = await contextFor(profile);
    const learn = await context.newPage();
    await learn.goto(`${base}/aprender/`, { waitUntil: "networkidle" });
    await learn.getByRole("link", { name: "Identificar un token" }).click();
    await learn.waitForFunction(() => location.hash === "#guia-identificar");
    await shot(learn, `biblioteca-${profile.id}.png`);
    if (profile.id === "escritorio") {
      await learn.getByRole("button", { name: "EN", exact: true }).click();
      await learn.waitForFunction(() => document.documentElement.lang === "en");
      const englishGuide = await learn.locator("#guia-identificar").innerText();
      if (!englishGuide.includes("Identify a token")) failures.push("la guía en inglés no se muestra");
      await shot(learn, "biblioteca-escritorio-en.png");
    }
    await context.close();

    const notebookContext = await contextFor(profile);
    const page = await notebookContext.newPage();
    const net = { count: 0, external: 0 };
    await mockRpc(page, net);
    await page.goto(`${base}/cuaderno/`, { waitUntil: "networkidle" });
    await page.locator("#direccion-cuaderno").fill("no-vale");
    await page.locator("#consultar").click();
    await page.waitForFunction(() => (document.getElementById("consulta-error")?.textContent || "").includes("no es válida"));
    if (net.count !== 0) failures.push(`${profile.id}: la dirección inválida llamó a la red ${net.count} veces`);
    if (net.external !== 0) failures.push(`${profile.id}: hubo una petición a otro origen`);
    await shot(page, `cuaderno-${profile.id}-error.png`);
    await page.locator("#direccion-cuaderno").fill(official);
    await page.locator("#consultar").click();
    await page.waitForFunction(() => (document.getElementById("resultado")?.textContent || "").includes("puede haber cambiado"), null, { timeout: 15000 });
    const text = await page.locator("#resultado").innerText();
    // Se permiten las negaciones («no es la dirección oficial») y el aviso que remite a orvupi.com/token.
    const claims = text.replace(/no es la dirección oficial|not the official address|La única dirección oficial de ORVUPI está en orvupi\.com\/token|The only official ORVUPI address is on orvupi\.com\/token/g, "");
    if (/dirección oficial|official address/.test(claims)) failures.push(`${profile.id}: presenta una dirección como oficial: ${(text.match(/.{0,80}(dirección oficial|official address).{0,80}/) || [""])[0]}`);
    const uriLinked = await page.locator("#resultado a").evaluateAll((nodes) =>
      nodes.some((node) => `${node.textContent || ""} ${node.getAttribute("href") || ""}`.includes("evil.example")),
    );
    if (text.includes("evil.example") && uriLinked) {
      failures.push(`${profile.id}: la URI de metadatos se volvió un enlace`);
    }
    await shot(page, `cuaderno-${profile.id}-resultado.png`);
    if (profile.device.isMobile) {
      const covered = await page.evaluate(() => {
        const title = document.querySelector("#resultado .sello");
        const box = title?.getBoundingClientRect();
        if (!box) return true;
        const form = document.querySelector("form.consulta")?.getBoundingClientRect();
        return Boolean(form && box.bottom > form.top && box.top < form.bottom);
      });
      if (covered) failures.push(`${profile.id}: el resultado del cuaderno queda tapado`);
    }
    await notebookContext.close();
  }

  const desktop = await contextFor(profiles.find((profile) => profile.id === "escritorio"));
  const wide = await desktop.newPage();
  const wideNet = { count: 0, external: 0 };
  await mockRpc(wide, wideNet);
  await wide.goto(`${base}/cuaderno/`, { waitUntil: "networkidle" });
  await wide.locator("#direccion-cuaderno").fill(official);
  await wide.locator("#consultar").click();
  await wide.waitForFunction(() => document.querySelectorAll("#lista-consultas article.ficha").length >= 1, null, { timeout: 15000 });
  await wide.locator("#lista-consultas textarea").fill("nota de prueba");
  await wide.getByRole("button", { name: "Guardar nota" }).click();
  await wide.waitForFunction(() => (document.getElementById("consulta-error")?.textContent || "").includes("Nota guardada"));
  await wide.getByRole("button", { name: "Volver a consultar" }).click();
  await wide.waitForFunction(() => document.querySelectorAll("#lista-consultas article.ficha").length >= 2, null, { timeout: 15000 });
  const options = wide.locator("#comparar-izquierda option");
  const newest = await options.nth(1).getAttribute("value");
  const older = await options.nth(2).getAttribute("value");
  await wide.locator("#comparar-izquierda").selectOption(older);
  await wide.locator("#comparar-derecha").selectOption(newest);
  await wide.locator("#comparar").click();
  const comparedText = await wide.locator("#comparacion").innerText();
  if (!comparedText.includes("igual")) {
    failures.push(`comparación: ${comparedText}`);
  }
  await shot(wide, "cuaderno-escritorio-comparacion.png");
  const downloadPromise = wide.waitForEvent("download");
  await wide.locator("#exportar").click();
  const download = await downloadPromise;
  const exported = await download.path();
  if (!exported) failures.push("la exportación no dejó archivo");
  else writeFileSync(path.join(shots, "cuaderno-export.json"), readFileSync(exported));
  await wide.locator("#borrar").click();
  await wide.locator("#borrar-confirmar").click();
  await wide.waitForFunction(() => (document.getElementById("lista-consultas")?.textContent || "").includes("Todavía no hay"));
  await wide.locator("#importar-archivo").setInputFiles({
    name: "malo.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schema":"<script>alert(1)</script>"}'),
  });
  await wide.waitForFunction(() => (document.getElementById("consulta-error")?.textContent || "").includes("no guarda"));
  await wide.locator("#importar-archivo").setInputFiles({
    name: "grande.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1_000_001, 120),
  });
  await wide.waitForFunction(() => (document.getElementById("consulta-error")?.textContent || "").includes("1 MB"));
  if (exported) {
    await wide.locator("#importar-archivo").setInputFiles(exported);
    await wide.waitForFunction(() => document.querySelectorAll("#lista-consultas article.ficha").length >= 2, null, { timeout: 10000 });
    const restoredNotes = await wide.locator("#lista-consultas textarea").evaluateAll((nodes) => nodes.map((node) => node.value));
    const restored = await wide.locator("#lista-consultas").innerText();
    if (!restoredNotes.includes("nota de prueba")) failures.push(`la importación no recuperó la nota: ${restoredNotes.join(" | ")}`);
    if (!restored.includes("puede haber cambiado")) failures.push("la ficha importada parece actual");
    if (!restored.includes("Importada de un archivo, no leída por este navegador. Sus datos no se han comprobado: vuelve a consultarla.")) failures.push("la ficha importada no se marca");
  }
  await wide.getByRole("button", { name: "EN", exact: true }).click();
  await wide.waitForFunction(() => (document.querySelector("#lista-consultas")?.textContent || "").includes("this may have changed"));
  await shot(wide, "cuaderno-escritorio-en.png");
  if (wideNet.external !== 0) failures.push("el escritorio llamó a otro origen");
  await wide.close();

  const verify = await desktop.newPage();
  const documentUrls = [];
  verify.on("request", (req) => {
    if (req.resourceType() === "document") documentUrls.push(req.url());
  });
  await verify.goto(`${base}/verify/`, { waitUntil: "domcontentloaded" });
  await verify.locator("#direccion-token").fill(official);
  await verify.locator('a[href="/aprender/#direccion"]').click();
  await verify.waitForFunction((mint) => location.pathname === "/aprender/" && !location.href.includes(mint), official);
  const learned = await verify.evaluate(() => location.pathname + location.search + location.hash);
  if (learned.includes("a=") || learned.includes(official)) failures.push(`la biblioteca dejó la dirección en la URL: ${learned}`);
  const stored = await verify.evaluate(() => ({
    session: sessionStorage.getItem("orvupi-verify-draft"),
    local: localStorage.getItem("orvupi-verify-draft"),
  }));
  if (stored.session || stored.local) failures.push("Verify guardó la dirección");
  await verify.locator('main a[href="/verify/"]').first().click();
  await verify.waitForFunction(
    (mint) => location.pathname === "/verify/" && !location.href.includes(mint) && document.getElementById("direccion-token")?.value === mint,
    official,
  );
  const keptUrl = await verify.evaluate(() => location.pathname + location.search + location.hash);
  if (keptUrl.includes("a=") || keptUrl.includes(official)) failures.push(`Verify dejó la dirección en la URL: ${keptUrl}`);
  const kept = await verify.locator("#direccion-token").inputValue();
  if (kept !== official) failures.push(`Verify no recuperó la dirección del enlace: ${kept}`);
  const storedAfter = await verify.evaluate(() => ({
    session: sessionStorage.getItem("orvupi-verify-draft"),
    local: localStorage.getItem("orvupi-verify-draft"),
  }));
  if (storedAfter.session || storedAfter.local) failures.push("Verify guardó la dirección al volver");
  await shot(verify, "verify-direccion-conservada.png");
  await verify.goBack();
  await verify.waitForFunction((mint) => location.pathname === "/aprender/" && !location.href.includes(mint), official);
  if (documentUrls.some((url) => url.includes(official) || url.includes("a="))) {
    failures.push(`la dirección llegó al servidor: ${documentUrls.filter((url) => url.includes(official) || url.includes("a=")).join(" ")}`);
  }
  await desktop.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack || error.message : String(error));
} finally {
  await chrome.close();
  await kit.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}
console.log("playwright ok");
