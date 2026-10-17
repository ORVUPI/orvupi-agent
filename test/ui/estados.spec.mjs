import { test, expect } from "@playwright/test";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// Dirección del token anterior: hoy es una dirección más, sin ningún trato especial.
const PREVIOUS = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

function mintBytes(supply) {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(supply, 36);
  data[44] = 6;
  data[45] = 1;
  return data.toString("base64");
}

function account(data) {
  return {
    lamports: 1,
    owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    executable: false,
    rentEpoch: 0,
    data: [data, "base64"],
  };
}

function rpcResult(value, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status === 200
        ? { jsonrpc: "2.0", id: 1, result: { context: { slot: 455334034 }, value } }
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: status === 403 ? "Request blocked" : "Too many requests" } },
    ),
  };
}

async function mockRpc(page) {
  let mode = "ok";
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (mode === "ausente") {
      if (method === "getMultipleAccounts") return route.fulfill(rpcResult([null, null, null]));
      return route.fulfill(rpcResult(null, 403));
    }
    if (mode === "403") {
      if (method === "getMultipleAccounts") return route.fulfill(rpcResult([account(mintBytes(1_000_000n)), null, null]));
      return route.fulfill(rpcResult(null, 403));
    }
    if (method === "getMultipleAccounts") return route.fulfill(rpcResult([account(mintBytes(1_000_000n)), null, null]));
    if (method === "getTokenSupply") {
      return route.fulfill(rpcResult({ amount: "1000000", decimals: 6, uiAmountString: "1" }));
    }
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult([]));
    return route.fulfill(rpcResult(1));
  });
  return {
    set(next) {
      mode = next;
    },
  };
}

async function readMint(page, mint) {
  await page.goto("/verify/");
  await page.locator("#direccion-token").fill(mint);
  await page.locator("#consulta button[type='submit']").click();
}

for (const mint of [PREVIOUS, USDC]) {
  test(`verify ${mint} muestra ok, 403 y ausencia`, async ({ page }) => {
    const rpc = await mockRpc(page);
    await readMint(page, mint);
    await expect(page.locator("#resultado")).toContainText(/Hay 1 tokens/);
    await expect(page.locator("#resultado")).toContainText(/No hay metadatos en esta lectura|No falta/);
    await expect(page.locator("#resultado")).not.toContainText("ausente comprobado");
    await expect(page.locator("#resultado")).not.toContainText("isMutable");
    const okMissing = await page.locator("[data-bloque='falta']").innerText();
    expect(okMissing).not.toMatch(/ausente comprobado/);
    await expect(page.locator(".resumen-datos")).toHaveCount(0);
    await expect(page.locator("#resultado")).not.toContainText("Comprobado: no existe");
    await expect(page.locator("#entender-resultado")).toContainText("Entender este resultado");
    await expect(page.locator("#resultado")).not.toContainText(/no disponible · verificado|verificado · no disponible/i);

    rpc.set("403");
    await readMint(page, mint);
    await expect(page.locator("#resultado")).toContainText(/El servicio público no respondió, prueba otra vez en un minuto/);
    await expect(page.locator("#reintentar")).toBeVisible();
    const failedMissing = await page.locator("[data-bloque='falta']").innerText();
    expect(failedMissing).not.toMatch(/ausente comprobado/);
    await expect(page.locator("#resultado")).not.toContainText("Comprobado: no existe");
    await expect(page.locator(".resumen-datos")).toHaveCount(0);
    await expect(page.locator("#resultado")).not.toContainText(/no disponible · verificado/i);

    rpc.set("ausente");
    await readMint(page, mint);
    await expect(page.locator("#resultado")).toContainText(/no existe/i);
    await expect(page.locator("#resultado")).not.toContainText("ausente comprobado");
    await expect(page.locator("#resultado")).not.toContainText("isMutable");
    await expect(page.locator(".franja-identidad")).toContainText("Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.");
    await expect(page.locator(".franja-identidad")).not.toContainText(PREVIOUS);
  });
}
