import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

import { decodePng } from "../../web/v2/studio/lib/png.mjs";
import { readLogoPng } from "../../web/v2/studio/lib/logo.mjs";
import { renderCard } from "../../web/v2/studio/lib/render.mjs";
import templates from "../../web/v2/studio/templates.json" with { type: "json" };

const shots = process.env.STUDIO_SHOTS ?? "test-results/studio-guardar";

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// Logo 64x64 amarillo puro, para buscarlo en la imagen exportada.
function yellowPng() {
  const w = 64, h = 64, rows = [];
  for (let y = 0; y < h; y++) { rows.push(Buffer.from([0])); for (let x = 0; x < w; x++) rows.push(Buffer.from([255, 221, 0])); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

async function ready(page) {
  await page.goto("/studio/");
  // El editor está listo cuando ha dibujado la primera vista.
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await page.click("#tab-avatar");
  await page.setInputFiles("#logo", { name: "logo.png", mimeType: "image/png", buffer: yellowPng() });
  await expect(page.locator("#logo-estado")).not.toHaveText("", { timeout: 10000 });
  await expect(page.locator("#descargar")).toBeEnabled({ timeout: 45_000 });
  await page.waitForTimeout(300);
}

test("guardar: la descarga trae el avatar y el aviso sale en iPhone sin compartir", async ({ page, browserName }, info) => {
  mkdirSync(shots, { recursive: true });
  const ua = await page.evaluate(() => navigator.userAgent);
  const ios = /iPhone/.test(ua);
  await ready(page);
  await expect(page.locator("#aviso-guardar")).toBeHidden();
  if (ios) {
    const shareable = await page.evaluate(() => typeof navigator.canShare === "function");
    const popup = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await page.click("#descargar");
    if (!shareable) {
      await expect(page.locator("#aviso-guardar")).toBeVisible();
      await expect(page.locator("#aviso-guardar")).toContainText(/Guardar en Fotos|Save to Photos/);
      await popup;
    }
  } else {
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#descargar")]);
    expect(download.suggestedFilename()).toBe("studio.png");
    const bytes = readFileSync(await download.path());
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    const img = await decodePng(new Uint8Array(bytes));
    let yellow = 0;
    for (let i = 0; i < img.rgba.length; i += 4) {
      const [r, g, b] = [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]];
      if (r > 240 && g > 200 && g < 240 && b < 30) yellow++;
    }
    expect(yellow).toBeGreaterThan(500);
  }
  await page.screenshot({ path: `${shots}/studio-guardar-${info.project.name}.png` });
});

test("guardar: Compartir solo aparece si el navegador comparte archivos", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.share = async () => { window.__shared = (window.__shared || 0) + 1; };
    navigator.canShare = (data) => Boolean(data && data.files && data.files.length);
  });
  await ready(page);
  await expect(page.locator("#compartir")).toBeVisible();
  await page.click("#compartir");
  await expect.poll(() => page.evaluate(() => window.__shared || 0)).toBe(1);
});

test("guardar: sin share Compartir sigue oculto", async ({ page }) => {
  await page.addInitScript(() => { delete Navigator.prototype.share; delete Navigator.prototype.canShare; });
  await ready(page);
  await expect(page.locator("#compartir")).toBeHidden();
});

test("guardar: en iPhone con share, Descargar abre la hoja de compartir", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.share = async () => { window.__shared = (window.__shared || 0) + 1; };
    navigator.canShare = (data) => Boolean(data && data.files && data.files.length);
  });
  await ready(page);
  const ios = await page.evaluate(() => /iPhone/.test(navigator.userAgent));
  test.skip(!ios, "solo iPhone");
  await page.click("#descargar");
  await expect.poll(() => page.evaluate(() => window.__shared || 0)).toBe(1);
  await expect(page.locator("#aviso-guardar")).toBeHidden();
});

// El archivo que se comparte o se abre es el PNG final (lienzo completo con banda,
// marca de agua y pie, y el comentario PNG), no una vista previa reducida.
async function expectFinalPng(page, bytes) {
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.includes(Buffer.from("Community content, unofficial. Not from @stubxai."))).toBe(true);
  const img = await decodePng(new Uint8Array(bytes));
  const preview = await page.evaluate(() => {
    const c = document.getElementById("vista");
    return { width: c.width, height: c.height };
  });
  expect(img.width).toBeGreaterThanOrEqual(1080);
  expect(img.width).toBeGreaterThan(preview.width);
  expect(img.height / img.width).toBeCloseTo(preview.height / preview.width, 1);
  // Banda superior y pie: filas con texto (no un color plano).
  const rowVaries = (y) => {
    const set = new Set();
    for (let x = 0; x < img.width; x++) set.add(img.rgba[(y * img.width + x) * 4]);
    return set.size >= 2; // la fuente pixel usa dos colores por fila
  };
  const bandRows = Array.from({ length: Math.floor(img.height * 0.06) }, (_, y) => y).filter(rowVaries).length;
  const footRows = Array.from({ length: Math.floor(img.height * 0.08) }, (_, k) => img.height - 1 - k).filter(rowVaries).length;
  expect(bandRows).toBeGreaterThan(3);
  expect(footRows).toBeGreaterThan(3);
  const logo = await readLogoPng(yellowPng());
  const item = templates.templates.find((entry) => entry.id === "aprendizaje");
  const card = await renderCard({
    width: 1080,
    height: 1080,
    lang: "es",
    title: item.title.es,
    body: item.body.es,
    token: "STUBX",
    fill: "#070418",
    ink: "#f4f7fb",
    backgroundId: "fondo-solana",
    headline: "meme",
    origins: ["ninguno"],
    zones: templates.zones,
    avatar: logo,
    png: false,
  });
  expect(img.width).toBe(card.width);
  expect(img.height).toBe(card.height);
  let diff = 0;
  for (let i = 0; i < img.rgba.length; i += 4) {
    if (img.rgba[i] !== card.rgba[i] || img.rgba[i + 1] !== card.rgba[i + 1] || img.rgba[i + 2] !== card.rgba[i + 2]) diff += 1;
  }
  expect(diff).toBe(0);
}

test("guardar: lo que se comparte es el PNG final", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.canShare = (data) => Boolean(data && data.files && data.files.length);
    navigator.share = async (data) => {
      const buf = new Uint8Array(await data.files[0].arrayBuffer());
      let s = ""; for (const b of buf) s += String.fromCharCode(b);
      window.__sharedPng = btoa(s);
      window.__sharedName = data.files[0].name;
    };
  });
  await ready(page);
  await page.click("#compartir");
  await expect.poll(() => page.evaluate(() => Boolean(window.__sharedPng))).toBe(true);
  expect(await page.evaluate(() => window.__sharedName)).toBe("studio.png");
  await expectFinalPng(page, Buffer.from(await page.evaluate(() => window.__sharedPng), "base64"));
});

test("guardar: lo que se abre en la pestaña (noopener) es el PNG final", async ({ page }) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    window.__blobs = new Map();
    URL.createObjectURL = (blob) => { const url = create(blob); window.__blobs.set(url, blob); return url; };
    window.open = (url, target, features) => {
      window.__opened = { url: String(url), target, features };
      return null;
    };
  });
  await ready(page);
  const ios = await page.evaluate(() => /iPhone/.test(navigator.userAgent) && typeof navigator.canShare !== "function");
  test.skip(!ios, "solo iPhone sin share");
  await page.click("#descargar");
  await expect.poll(() => page.evaluate(() => Boolean(window.__opened))).toBe(true);
  const opened = await page.evaluate(() => window.__opened);
  expect(opened.url).toMatch(/^blob:/);
  expect(opened.target).toBe("_blank");
  expect(opened.features).toBe("noopener");
  await expect(page.locator("#aviso-guardar")).toBeVisible();
  const b64 = await page.evaluate(async (url) => {
    // La CSP no deja fetch a blob:; se lee el mismo Blob que recibió window.open.
    const buf = new Uint8Array(await window.__blobs.get(url).arrayBuffer());
    let s = ""; for (const b of buf) s += String.fromCharCode(b);
    return btoa(s);
  }, opened.url);
  await expectFinalPng(page, Buffer.from(b64, "base64"));
});
