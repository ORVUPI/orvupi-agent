import { test, expect } from "@playwright/test";

// Antes de pulsar, el elemento se centra como haría una persona al desplazarse
// (la web ORVUPI usa desplazamiento suave y una barra de consulta fija abajo en móvil).
async function tap(locator) {
  await locator.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await locator.click();
}
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const OTHER = "So11111111111111111111111111111111111111112";
const SUPPLY = 7840780507370947n;

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount(supply) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  return data;
}

function metadataAccount(mint, symbol) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(symbol),
    borsh(symbol),
    borsh(""),
    Buffer.from([0, 0, 0, 0, 0]),
  ]);
}

function account(owner, data) {
  return {
    lamports: 1,
    owner,
    executable: false,
    rentEpoch: 0,
    data: [data.toString("base64"), "base64"],
  };
}

function rpcResult(value, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status === 200
        ? { jsonrpc: "2.0", id: 1, result: { context: { slot: 455334034 }, value } }
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: "Too many requests" } },
    ),
  };
}

test("lectura, guardado y comparación en el uso real", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const pageErrors = [];
  const appErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && /TypeError|Uncaught|is not a function|is not defined/.test(message.text())) {
      appErrors.push(message.text());
    }
  });
  let supplyHits = 0;
  let supplyMode = "retry";
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    const asked = Array.isArray(body?.params?.[0]) ? body.params[0][0] : body?.params?.[0];
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      const symbol = mint === OTHER ? "OTRO" : "USDC";
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(SUPPLY)),
        account(METADATA_PROGRAM, metadataAccount(mint, symbol)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      supplyHits += 1;
      if (supplyMode === "fail" || supplyHits === 1) return route.fulfill(rpcResult(null, 429));
      return route.fulfill(rpcResult({ amount: SUPPLY.toString(), decimals: 6, uiAmountString: "ignored" }));
    }
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult(null, 429));
    return route.fulfill(rpcResult(asked ? 1 : 1));
  });

  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(USDC);
  await tap(page.locator("#consulta button[type='submit']"));
  await expect(page.locator("#resultado")).toContainText("Hay 7.840.780.507,370947 tokens", { timeout: 20_000 });
  await expect(page.locator("#resultado")).not.toContainText("7840780507.370947");
  const missing = await page.locator("[data-bloque='falta']").innerText();
  expect(missing).toContain("El servicio público no respondió, prueba otra vez en un minuto");
  expect(missing).not.toContain("ausente comprobado");
  expect(missing).not.toContain("Curva");
  await expect(page.locator("#resultado")).toContainText("No aplica: este token no se creó en Pump.fun");
  await expect(page.locator("#resultado")).not.toContainText("Comprobado: no existe");
  await expect(page.locator(".resumen-datos")).toHaveCount(0);
  const linkText = await page.locator(".resumen-informe").innerText();
  expect(linkText.split("No tiene enlace de metadatos").length - 1).toBe(1);
  await expect(page.locator("#reintentar")).toBeVisible();
  const entender = page.locator("#entender-resultado");
  await expect(entender).toContainText("Entender este resultado");
  await entender.getByRole("button", { name: "Entender este resultado" }).click();
  await expect(entender.locator(".explicacion-resultado")).toBeVisible();
  await expect(entender.locator(".explicacion-resultado")).toBeFocused();
  await expect(entender.getByRole("link", { name: "Permisos" })).toHaveAttribute("href", "/aprender/#guia-permisos");
  await expect(entender.getByRole("link", { name: "Suministro" })).toHaveAttribute("href", "/aprender/#autoridad-emision");
  await expect(entender.getByRole("link", { name: "Metadatos" })).toHaveAttribute("href", "/aprender/#metadatos-mutables");
  await expect(entender.getByRole("link", { name: "Distribución" })).toHaveAttribute("href", "/aprender/#censo");

  await tap(page.locator('[data-set-lang="en"]').first());
  await expect(page.locator("#resultado")).toContainText("There are 7,840,780,507.370947 tokens");
  await expect(page.locator("#resultado")).toContainText("Not applicable: this token was not created on Pump.fun");
  await expect(page.locator("#entender-resultado")).toContainText("Understand this result");
  await tap(page.locator('[data-set-lang="es"]').first());
  await expect(page.locator("#resultado")).toContainText("Hay 7.840.780.507,370947 tokens");

  await tap(page.locator("#reintentar"));
  await expect(page.locator("#resultado")).toContainText("Hay 7.840.780.507,370947 tokens", { timeout: 20_000 });
  await tap(page.locator("#guardar-consulta"));
  const saved = page.locator("#comparacion-verify");
  await expect(saved).toHaveAttribute("aria-live", "polite");
  await expect(saved).toContainText("Guardada en el Cuaderno de este navegador");
  const openNotebook = saved.getByRole("link", { name: "Abrir Cuaderno" });
  await expect(openNotebook).toBeVisible();
  await expect(openNotebook).toHaveAttribute("href", "/cuaderno/");
  await expect(saved).toContainText("Lectura incompleta: se guardará marcando lo que falta");
  if (testInfo.project.name !== "desktop") {
    const covered = await page.evaluate(() => {
      const node = document.querySelector(".confirmacion-guardado");
      const bar = document.querySelector(".consulta-barra");
      if (!node || !bar) return true;
      if (getComputedStyle(bar).position !== "fixed") return false;
      const box = node.getBoundingClientRect();
      const form = bar.getBoundingClientRect();
      const point = document.elementFromPoint(box.left + 12, Math.min(box.top + 8, box.bottom - 4));
      return box.bottom > form.top + 1 || !node.contains(point);
    });
    expect(covered).toBe(false);
  }

  await openNotebook.click();
  await page.waitForURL(/\/cuaderno\/$/);
  supplyMode = "fail";
  await page.locator("#direccion-cuaderno").fill(USDC);
  await tap(page.locator("#consultar"));
  await expect(page.locator("#consulta-error")).toContainText("Lectura incompleta: se guardará marcando lo que falta", { timeout: 30_000 });
  await expect(page.locator("#consulta-error")).toContainText("Guardada en el Cuaderno de este navegador");
  await expect(page.locator("#consulta-error")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#consulta-error")).toContainText("El servicio público no respondió, prueba otra vez en un minuto");
  await expect(page.locator("#consulta-error").getByRole("link", { name: "Abrir Cuaderno" })).toBeVisible();
  await expect(page.locator("#resultado")).toContainText("Entender este resultado");
  await expect(page.locator("#resultado")).toContainText("No aplica: este token no se creó en Pump.fun");
  const notebookMissing = await page.locator("#resultado [data-bloque='falta']").innerText();
  expect(notebookMissing).not.toContain("Curva");
  await expect(page.locator("#resultado")).not.toContainText("Comprobado: no existe");
  await expect(page.locator("#resultado .resumen-datos")).toHaveCount(0);
  await tap(page.locator("#resultado .abrir-entender"));
  await expect(page.locator("#resultado .explicacion-resultado")).toBeVisible();
  await expect(page.locator("#resultado .explicacion-resultado")).toBeFocused();
  await expect(page.locator("#resultado").getByRole("link", { name: "Distribución" })).toHaveAttribute("href", "/aprender/#censo");

  const leftOptions = page.locator("#comparar-izquierda option");
  await expect(leftOptions).toHaveCount(3);
  const leftText = await leftOptions.allTextContents();
  expect(leftText.filter((item) => item.includes("USDC")).length).toBe(2);
  expect(leftText.some((item) => /USDC · \d{1,2} \w+ \d{4}, \d{2}:\d{2}/.test(item))).toBe(true);
  const rightText = await page.locator("#comparar-derecha option").allTextContents();
  expect(rightText.filter((item) => item.includes("USDC")).length).toBe(1);
  expect(rightText.some((item) => item.includes("OTRO"))).toBe(false);
  await tap(page.locator("#comparar"));
  const compared = page.locator("#comparacion");
  await expect(compared).toContainText("Lo que sigue igual");
  await expect(compared).toContainText("No aplica: este token no se creó en Pump.fun");
  await expect(compared).toContainText("Suministro total");
  await expect(compared).toContainText("Permiso de emisión");
  await expect(compared).toContainText("Decimales");
  await expect(compared).toContainText("Entender este resultado");
  await expect(compared.locator(".tecnico")).toContainText("Momento de la red");
  const mainRows = compared.locator("article.ficha");
  const rowCount = await mainRows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const text = await mainRows.nth(index).innerText();
    const states = ["cambió", "igual", "no se puede determinar"].filter((word) => text.includes(word));
    expect(states).toHaveLength(1);
  }

  await page.locator("#direccion-cuaderno").fill(OTHER);
  await tap(page.locator("#consultar"));
  await expect(page.locator("#comparar-izquierda option")).toHaveCount(4, { timeout: 30_000 });
  const usdcValue = await page.locator("#comparar-izquierda option", { hasText: "USDC" }).first().getAttribute("value");
  await page.locator("#comparar-izquierda").selectOption(usdcValue);
  const after = await page.locator("#comparar-derecha option").allTextContents();
  expect(after.some((item) => item.includes("OTRO"))).toBe(false);
  expect(after.some((item) => item.includes("USDC"))).toBe(true);

  expect(pageErrors).toEqual([]);
  expect(appErrors).toEqual([]);
});
