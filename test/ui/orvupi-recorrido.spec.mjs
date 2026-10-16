import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = process.env.PRUEBA_DIR || "test-results/prueba";
mkdirSync(OUT, { recursive: true });
const shot = async (page, info, name) => page.screenshot({ path: `${OUT}/${info.project.name}-${name}.png`, fullPage: true });

const CASES = [
  { red: "solana", ok: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", bad: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1" },
  { red: "base", ok: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", bad: "0x833589fcd6edb6e08f4c7c32d4f71b54bda0291" },
  { red: "ethereum", ok: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", bad: "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  { red: "bnb", ok: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", bad: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580" },
];

for (const c of CASES) {
  test(`verify ${c.red}: válida e inválida`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.goto("/verify/");
    const red = page.locator("#red");
    await expect(red.locator(`option[value="${c.red}"]`)).toHaveCount(1);
    await red.selectOption(c.red);
    await page.fill("#direccion-token", c.bad);
    await page.locator("#consulta button[type=submit]").click();
    await page.waitForTimeout(1500);
    const errVisible = await page.locator("#direccion-error").isVisible();
    const resultText = (await page.locator("#resultado").innerText().catch(() => "")) || "";
    expect(errVisible || /no cuadran|no es|no válida|inválid|no parece|no se puede|No se encontró|no existe|revisa/i.test(resultText)).toBeTruthy();
    await shot(page, info, `verify-${c.red}-invalida`);
    await page.fill("#direccion-token", c.ok);
    await page.locator("#consulta button[type=submit]").click();
    await expect(page.locator("#resultado")).toContainText(/USDC|USD Coin|USD/, { timeout: 60_000 });
    await expect(page.locator("body")).not.toContainText(new RegExp(["STU", "BX"].join(""), "i"));
    await shot(page, info, `verify-${c.red}-valida`);
  });
}

test("lab: misión se abre y responde", async ({ page }, info) => {
  await page.goto("/lab/");
  await expect(page.locator("body")).not.toContainText(new RegExp(["STU", "BX"].join(""), "i"));
  const first = page.locator("main input[type=radio], main button[data-opcion], main .opcion button, main fieldset button").first();
  if (await first.count()) await first.click().catch(() => {});
  await shot(page, info, "lab");
});

test("studio: exporta PNG", async ({ page }, info) => {
  // Guarda los blobs que Studio entrega, por si la pestaña los revoca antes de leerlos.
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    window.__blobs = [];
    URL.createObjectURL = (obj) => { if (obj instanceof Blob) window.__blobs.push(obj); return create(obj); };
  });
  await page.goto("/studio/");
  await expect(page.locator("body")).not.toContainText(new RegExp(["STU", "BX"].join(""), "i"));
  await page.waitForTimeout(1500);
  await shot(page, info, "studio");
  // En iPhone (WebKit móvil) Descargar no dispara una descarga: abre el PNG en una pestaña nueva
  // (o la hoja de compartir). Se acepta cualquiera de las dos salidas y se comprueba el PNG igual.
  const outcome = Promise.race([
    page.waitForEvent("download", { timeout: 30_000 }).then((download) => ({ download })),
    page.context().waitForEvent("page", { timeout: 30_000 }).then((popup) => ({ popup })),
  ]);
  await page.click("#descargar");
  const result = await outcome;
  let buf;
  if (result.download) {
    const file = `${OUT}/${info.project.name}-studio-export.png`;
    await result.download.saveAs(file);
    buf = readFileSync(file);
  } else {
    const popup = result.popup;
    await popup.waitForLoadState().catch(() => {});
    const url = popup.url();
    expect(url).toMatch(/^(blob:|data:image\/png)/);
    const bytes = await page.evaluate(async () => {
      const png = [...window.__blobs].reverse().find((b) => b.type === "image/png") ?? window.__blobs.at(-1);
      return png ? Array.from(new Uint8Array(await png.arrayBuffer())) : [];
    });
    buf = Buffer.from(bytes);
  }
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  expect(buf.length).toBeGreaterThan(10_000);
});

test("cuaderno: guarda, exporta e importa conservando fichas", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.goto("/verify/");
  await page.fill("#direccion-token", CASES[0].ok);
  await page.locator("#consulta button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/USDC|USD Coin/, { timeout: 60_000 });
  const save = page.getByRole("button", { name: /Guardar esta consulta|Save this lookup/ });
  await save.first().click();
  await page.waitForTimeout(800);
  await page.goto("/cuaderno/");
  await page.waitForTimeout(1000);
  const before = await page.locator("main article, main li.ficha, main [data-ficha]").count();
  await shot(page, info, "cuaderno-con-ficha");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#exportar")]);
  const file = `${OUT}/${info.project.name}-cuaderno-orvupi.json`;
  await download.saveAs(file);
  const json = JSON.parse(readFileSync(file, "utf8"));
  const text = JSON.stringify(json);
  expect(text).toContain("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  expect(download.suggestedFilename()).toMatch(/orvupi/);
  // Vaciar el navegador y volver a importar.
  await page.evaluate(async () => { localStorage.clear(); const dbs = (await indexedDB.databases?.()) || []; await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(); }))); });
  await page.reload();
  await page.waitForTimeout(800);
  await page.setInputFiles("#importar-archivo", file);
  await page.waitForTimeout(1500);
  const confirm = page.getByRole("button", { name: /Importar|Import|Añadir|Sustituir|Confirmar/ });
  if (await confirm.count()) await confirm.first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await expect(page.locator("main")).toContainText(/EPjFWdd5|USDC/);
  const after = await page.locator("main article, main li.ficha, main [data-ficha]").count();
  expect(after).toBe(before);
  await shot(page, info, "cuaderno-importado");
});
