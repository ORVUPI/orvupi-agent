import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const STUBX = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const FAIL = "So11111111111111111111111111111111111111112";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const CLONE_SUPPLY = 1_000_000_000_000_000n;
const SUPPLY = 7721704579000000n;

function borsh(value) {
  const body = Buffer.from(value);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length);
  return Buffer.concat([len, body]);
}

function mintAccount(supply, mintActive, freezeActive) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  if (mintActive) {
    data.writeUInt32LE(1, 0);
    data.fill(7, 4, 36);
  }
  if (freezeActive) {
    data.writeUInt32LE(1, 46);
    data.fill(8, 50, 82);
  }
  return data;
}

function metadataAccount(mint, name, symbol, mutable, uri = "") {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(name),
    borsh(symbol),
    borsh(uri),
    Buffer.from([0, 0, 0, 0, mutable ? 1 : 0]),
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
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: "no" } },
    ),
  };
}

test("el resumen en Verify y en la ficha guardada", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  let failReads = true;
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      const name = mint === STUBX || mint === CLONE ? "STUBX" : mint === FAIL ? "OTRO" : "USD Coin";
      const symbol = mint === STUBX || mint === CLONE ? "STUBX" : mint === FAIL ? "OTRO" : "USDC";
      const active = mint === USDC;
      const supply = mint === CLONE ? CLONE_SUPPLY : SUPPLY;
      const uri = mint === USDC ? "\0".repeat(200) : "";
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(supply, active, active)),
        account(METADATA_PROGRAM, metadataAccount(mint, name, symbol, active, uri)),
        null,
      ]));
    }
    if (method === "getTokenSupply" || method === "getTokenLargestAccounts") {
      const mint = body?.params?.[0];
      if (mint === FAIL && failReads) return route.fulfill(rpcResult(null, 500));
      if (method === "getTokenSupply") {
        const amount = mint === CLONE ? CLONE_SUPPLY : SUPPLY;
        return route.fulfill(rpcResult({ amount: amount.toString(), decimals: 6, uiAmountString: "skip" }));
      }
      return route.fulfill(rpcResult([{ address: USDC, amount: "1000000", decimals: 6 }]));
    }
    return route.fulfill(rpcResult(1));
  });

  async function shot(name) {
    if (testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop") return;
    const summary = page.locator("#resultado .resumen-informe");
    await summary.scrollIntoViewIfNeeded();
    await summary.screenshot({
      path: `/opt/cursor/artifacts/resumen_uso49_${name}_${testInfo.project.name}.png`,
    });
  }

  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const summary = page.locator("#resultado .resumen-informe");
  await expect(summary).toContainText("Qué se comprobó", { timeout: 20_000 });
  await expect(summary).toContainText("Qué requiere atención");
  await expect(summary).toContainText("Qué falta");
  await expect(summary).toContainText("Suministro total");
  await expect(summary).toContainText("7.721.704.579");
  await expect(summary).toContainText("USD Coin (USDC)");
  await expect(summary).toContainText("No tiene enlace de metadatos");
  await expect(summary).not.toContainText("Se leyó el enlace de metadatos");
  await expect(page.locator("#resultado")).toContainText("Enlace de metadatos: No tiene enlace de metadatos");
  await expect(page.locator("#resultado")).not.toContainText("Faltan datos");
  await expect(summary.locator("[data-bloque='comprobado']")).not.toContainText("No aplica");
  await expect(summary.locator("[data-bloque='comprobado']")).not.toContainText("bytes del mint");
  await expect(summary.locator(".nota-curva")).toContainText("Curva de Pump.fun: no aplica");
  const emission = summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de emisión" });
  await expect(emission.locator(".punto-frase")).toHaveText("Está activo: permite crear más tokens.");
  await expect(emission.locator(".punto-frase")).not.toContainText("moneda estable");
  await expect(emission.locator(".punto-frase")).not.toContainText("stablecoin");
  await expect(emission.locator("details")).toContainText("moneda estable");
  await expect(emission.locator("details")).toContainText("promete el proyecto");
  await expect(summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de congelación" }).locator(".punto-frase")).toHaveText("Está activo: puede bloquear cuentas.");
  await expect(summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Nombre y símbolo" }).locator(".punto-frase")).toHaveText("Se pueden cambiar.");
  await expect(summary).toContainText("Permiso de congelación");
  await expect(summary).toContainText("bloquear cuentas");
  await expect(summary).toContainText("Se pueden cambiar");
  await expect(summary).toContainText("No falta ningún dato pedido en esta lectura.");
  await expect(summary).not.toContainText("ausente comprobado");
  await expect(summary).not.toContainText("Consulta extra");
  await expect(emission.getByRole("link", { name: "Entender →" })).toHaveAttribute("href", "#entender-permisos");
  await emission.getByRole("link", { name: "Entender →" }).click();
  await expect(page.locator("#entender-permisos")).toBeVisible();
  await expect(page.locator("#entender-permisos")).toBeFocused();
  const banned = await summary.innerText();
  expect(/\b(precio|compra|comprar|seguro|buy|sell)\b/i.test(banned)).toBe(false);
  await shot("usdc");

  await page.getByRole("button", { name: "English" }).click();
  await expect(summary).toContainText("What was checked");
  await expect(summary).toContainText("What needs attention");
  await expect(summary).toContainText("What is missing");
  const englishEmission = summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Mint permission" }).locator(".punto-frase");
  await expect(englishEmission).toHaveText("It is active: it can create more tokens.");
  await expect(englishEmission).not.toContainText("stablecoin");
  await expect(summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Mint permission" }).locator("details")).toContainText("stablecoin");
  await expect(summary).toContainText("Freeze permission");
  await expect(summary.locator(".nota-curva")).toContainText("Pump.fun curve: not applicable");
  await expect(summary.getByRole("link", { name: "Understand →" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Español" }).click();
  await expect(summary).toContainText("Qué se comprobó");

  await page.locator("#direccion-token").fill(STUBX);
  await page.locator("#consulta button[type='submit']").click();
  await expect(page.locator("#resultado")).toContainText("Esta dirección es la del registro de STUBX", { timeout: 20_000 });
  await expect(summary).toContainText("Qué se comprobó");
  await expect(summary).toContainText("Suministro total");
  await expect(summary).toContainText("Nadie puede crear más tokens ni congelar cuentas");
  await expect(summary).toContainText("Ninguna señal de esta lectura pide atención");
  await expect(summary).not.toContainText("moneda estable");
  await expect(summary).not.toContainText("ausente comprobado");
  await shot("stubx");

  await page.locator("#direccion-token").fill(CLONE);
  await page.locator("#consulta button[type='submit']").click();
  await expect(summary).toContainText("Hay 1.000.000.000 tokens", { timeout: 20_000 });
  await expect(summary).not.toContainText("1.000.000.000 STUBX");
  await expect(summary).toContainText("Dice llamarse «STUBX» (texto elegido por quien creó el token)");
  const likeness = summary.locator("[data-bloque='atencion'] .punto-resumen").first();
  await expect(likeness).toContainText("Se parece a STUBX pero no es la dirección oficial");
  await expect(likeness.locator("details")).toContainText("stubxai.com");
  await expect(summary).toContainText("Es una ficha guardada de antes, no un dato de esta lectura");
  await expect(summary).not.toContainText("Es un dato de esta lectura");
  await shot("eryyy");

  await page.locator("#direccion-token").fill(FAIL);
  await page.locator("#consulta button[type='submit']").click();
  await expect(summary.locator("[data-bloque='comprobado'] .punto-resumen", { hasText: "Suministro total" }).locator(".punto-nota")).toContainText("No se pudo hacer la segunda comprobación del suministro", { timeout: 20_000 });
  await expect(summary.locator(".punto-titulo", { hasText: "Suministro total" })).toHaveCount(1);
  await expect(summary.locator("[data-bloque='falta']")).toContainText("Segunda comprobación del suministro");
  await expect(summary.locator("[data-bloque='falta']")).not.toContainText("Suministro total");
  await expect(summary).toContainText("No se pudo leer quién tiene más tokens");
  await expect(summary).toContainText("El servicio público no respondió, prueba otra vez en un minuto.");
  await expect(summary.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(summary).not.toContainText("parte grande");
  await expect(summary).not.toContainText("Consulta extra");
  await expect(summary).not.toContainText("ausente comprobado");
  await shot("fallo");
  failReads = false;
  await summary.getByRole("button", { name: "Reintentar" }).click();
  await expect(summary).toContainText("No falta ningún dato pedido en esta lectura.", { timeout: 20_000 });
  await expect(summary).not.toContainText("consulta fallida");

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta button[type='submit']").click();
  const emissionAgain = summary.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de emisión" }).locator(".punto-frase");
  await expect(emissionAgain).toHaveText("Está activo: permite crear más tokens.", { timeout: 20_000 });
  await expect(emissionAgain).not.toContainText("moneda estable");
  await page.locator("#guardar-consulta").click();
  await page.locator("#comparacion-verify").getByRole("link", { name: "Abrir Cuaderno" }).click();
  await page.waitForURL(/\/cuaderno\/$/);
  const savedCard = page.locator(".consulta-guardada", { hasText: USDC }).first().locator("article.ficha");
  const saved = savedCard.locator(".resumen-informe");
  await expect(saved).toContainText("Qué se comprobó", { timeout: 20_000 });
  await expect(saved).toContainText("Qué requiere atención");
  await expect(saved.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de emisión" }).locator(".punto-frase")).toHaveText("Está activo: permite crear más tokens.");
  await expect(saved.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de emisión" }).locator(".punto-frase")).not.toContainText("moneda estable");
  await expect(saved.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Permiso de emisión" }).locator("details")).toContainText("moneda estable");
  await expect(saved).toContainText("Permiso de congelación");
  await expect(saved.locator(".nota-curva")).toContainText("Curva de Pump.fun: no aplica");
  await saved.locator("[data-bloque='atencion'] .punto-resumen", { hasText: "Nombre y símbolo" }).getByRole("link", { name: "Entender →" }).click();
  await expect(savedCard.locator(".explicacion-resultado [data-tema='metadatos']")).toBeVisible();
  if (testInfo.project.name === "desktop" || testInfo.project.name === "mobile") {
    await saved.scrollIntoViewIfNeeded();
    await saved.screenshot({
      path: `/opt/cursor/artifacts/resumen_b49_cuaderno_${testInfo.project.name}.png`,
    });
  }

  const box = page.locator("#resultado");
  failReads = true;
  await page.locator("#direccion-cuaderno").fill(FAIL);
  await page.locator("#consultar").click();
  await expect(box.locator(".resumen-informe")).toContainText("No se pudo leer", { timeout: 30_000 });
  await expect(box.locator(".reintentar-resumen")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
