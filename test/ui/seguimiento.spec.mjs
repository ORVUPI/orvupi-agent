import { expect, test } from "@playwright/test";
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const ERY = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";

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

function metadataAccount(mint, name, symbol) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh(name),
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
        : { jsonrpc: "2.0", id: 1, error: { code: status, message: status === 403 ? "Request blocked" : "Too many requests" } },
    ),
  };
}

async function storeLegacy(page, records) {
  await page.goto("/aprender/");
  await page.evaluate(async (items) => {
    const read = await import("/shared/solana-read.js");
    const model = await import("/shared/notebook-model.js");
    const ready = items.map((item) => {
      const card = read.blankCard(item.mint, item.at, []);
      card.isMint = true;
      card.partial = false;
      card.program = "spl-token";
      card.programStatus = "verificado";
      card.decimals = 6;
      card.supplyAccount = item.supply;
      card.supplyRpc = item.supply;
      card.supplyRpcStatus = "verificado";
      card.slot = 4;
      card.slotStatus = "verificado";
      card.mintAuthority = { state: "revocada", address: null, status: "verificado" };
      card.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
      card.name = { text: item.name, status: "verificado" };
      card.symbol = { text: item.symbol, status: "verificado" };
      card.uri = { text: null, status: "ausente" };
      card.metadataMutable = "no";
      card.largestStatus = "ok";
      card.extensionsStatus = "no_aplica";
      card.curve = {
        present: false,
        status: item.mint.endsWith("pump") ? "ausente" : "no_aplica",
        virtualToken: null,
        virtualQuote: null,
        realToken: null,
        realQuote: null,
        complete: null,
      };
      const checked = model.validateCard(card);
      if (!checked.ok) throw new Error(checked.error.es);
      return {
        id: item.id,
        note: item.note,
        card: checked.card,
        source: "leida",
      };
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("stubx-cuaderno");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("stubx-cuaderno", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("records", "readwrite");
        for (const record of ready) tx.objectStore("records").put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, records);
}

test("una ficha vieja gana red y dirección y entra en la lista", async ({ page }) => {
  await storeLegacy(page, [{
    id: "11111111-1111-4111-8111-111111111111",
    mint: USDC,
    at: "2026-10-09T12:00:00.000Z",
    supply: "1000000",
    name: "USD Coin",
    symbol: "USDC",
    note: "nota vieja",
  }]);
  await page.goto("/cuaderno/");
  const row = page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: USDC });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Red: Solana");
  await expect(page.locator("#seguir-alcance")).toHaveText("No hay ninguna marcada: se consultan todas.");
  const stored = await page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open("stubx-cuaderno");
    request.onsuccess = () => {
      const db = request.result;
      const get = db.transaction("records", "readonly").objectStore("records").get("11111111-1111-4111-8111-111111111111");
      get.onsuccess = () => resolve(get.result);
    };
  }));
  expect(stored.network).toBe("solana");
  expect(stored.address).toBe(USDC);
  expect(stored.note).toBe("nota vieja");
  expect(stored.card.mint).toBe(USDC);
  const button = page.locator("#seguir");
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(overflow).toBe(true);
  await page.locator('[data-set-lang="en"]').click();
  await expect(page.locator("h2").filter({ hasText: "Watch list" })).toBeVisible();
  await expect(page.locator("#seguir .lang.en")).toHaveText("Check the list");
  await expect(row).toContainText("Network: Solana");
});

test("volver a consultar marca el cambio, el clon y solo las direcciones elegidas", async ({ page }) => {
  test.setTimeout(90_000);
  const calls = [];
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    calls.push({ method, mint: Array.isArray(body?.params?.[0]) ? body.params[0][0] : body?.params?.[0] });
    if (method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      const name = mint === ERY ? "STUBX" : "USD Coin";
      const symbol = mint === ERY ? "STUBX" : "USDC";
      const supply = mint === ERY ? 2_000_000n : 1_000_000n;
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(supply)),
        account(METADATA_PROGRAM, metadataAccount(mint, name, symbol)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      const mint = body.params[0];
      const supply = mint === ERY ? "2000000" : "1000000";
      return route.fulfill(rpcResult({ amount: supply, decimals: 6, uiAmountString: "ignored" }));
    }
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult([{ amount: "1" }]));
    return route.fulfill(rpcResult(1));
  });
  await storeLegacy(page, [
    {
      id: "11111111-1111-4111-8111-111111111111",
      mint: USDC,
      at: "2026-10-09T12:00:00.000Z",
      supply: "1000000",
      name: "USD Coin",
      symbol: "USDC",
      note: "",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      mint: ERY,
      at: "2026-10-09T12:00:00.000Z",
      supply: "1000000",
      name: "STUBX",
      symbol: "STUBX",
      note: "",
    },
  ]);
  await page.goto("/cuaderno/");
  const cloneRow = page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: ERY });
  await expect(cloneRow).toContainText("Dice llamarse «STUBX»");
  await expect(cloneRow).toContainText("Se parece a STUBX pero no es la dirección oficial.");
  await cloneRow.locator("input").check();
  await expect(page.locator("#seguir-alcance")).toHaveText("Se consultan solo las marcadas.");
  await page.locator("#seguir").click();
  const result = page.locator("#resultado-seguimiento article").filter({ hasText: ERY });
  await expect(result).toBeVisible({ timeout: 30_000 });
  await expect(result).toContainText("Cambió desde la última lectura.");
  await expect(result).toContainText("Dice llamarse «STUBX»");
  await expect(result).toContainText("Se parece a STUBX pero no es la dirección oficial.");
  await expect(result).toContainText("Suministro total");
  await expect(page.locator("#resultado-seguimiento")).not.toContainText(USDC);
  const asked = calls.filter((item) => item.method === "getMultipleAccounts").map((item) => item.mint);
  expect(asked).toContain(ERY);
  expect(asked).not.toContain(USDC);
  const started = [];
  calls.length = 0;
  await cloneRow.locator("input").uncheck();
  await expect(page.locator("#seguir-alcance")).toHaveText("No hay ninguna marcada: se consultan todas.");
  let releaseFirst;
  const gate = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  await page.unroute(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    started.push(body?.method);
    if (body?.method === "getMultipleAccounts" && started.filter((item) => item === "getMultipleAccounts").length === 1) {
      await gate;
    }
    if (body?.method === "getMultipleAccounts") {
      const mint = body.params[0][0];
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(1_000_000n)),
        account(METADATA_PROGRAM, metadataAccount(mint, mint === ERY ? "STUBX" : "USD Coin", mint === ERY ? "STUBX" : "USDC")),
        null,
      ]));
    }
    if (body?.method === "getTokenSupply") return route.fulfill(rpcResult({ amount: "1000000", decimals: 6, uiAmountString: "ignored" }));
    if (body?.method === "getTokenLargestAccounts") return route.fulfill(rpcResult([{ amount: "1" }]));
    return route.fulfill(rpcResult(1));
  });
  await page.locator("#seguir").click();
  await expect.poll(() => started.filter((item) => item === "getMultipleAccounts").length).toBe(1);
  expect(started.filter((item) => item === "getMultipleAccounts").length).toBe(1);
  releaseFirst();
  await expect.poll(() => started.filter((item) => item === "getMultipleAccounts").length, { timeout: 20_000 }).toBe(2);
});

test("si el servicio rechaza la consulta, queda en Qué falta con Reintentar y no como igual", async ({ page }) => {
  test.setTimeout(60_000);
  let mode = "403";
  const hits = [];
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    hits.push(`${mode} ${body?.method}`);
    if (mode === "403") return route.fulfill(rpcResult(null, 403));
    if (body?.method === "getMultipleAccounts") {
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(2_000_000n)),
        account(METADATA_PROGRAM, metadataAccount(ERY, "STUBX", "STUBX")),
        null,
      ]));
    }
    if (body?.method === "getTokenSupply") return route.fulfill(rpcResult({ amount: "2000000", decimals: 6, uiAmountString: "ignored" }));
    if (body?.method === "getTokenLargestAccounts") return route.fulfill(rpcResult([{ amount: "1" }]));
    return route.fulfill(rpcResult(1));
  });
  await storeLegacy(page, [{
    id: "33333333-3333-4333-8333-333333333333",
    mint: ERY,
    at: "2026-10-09T12:00:00.000Z",
    supply: "1000000",
    name: "STUBX",
    symbol: "STUBX",
    note: "",
  }]);
  await page.goto("/cuaderno/");
  await page.locator("#seguir").click();
  const result = page.locator("#resultado-seguimiento article.seguimiento-estado");
  await expect(result).toHaveAttribute("data-estado", "rechazada", { timeout: 20_000 });
  await expect(result).toContainText("Qué falta");
  await expect(result).toContainText("Reintentar");
  await expect(result).toContainText("El servicio rechazó esta consulta. No se da por igual.");
  await expect(result).toContainText("Dice llamarse «STUBX»");
  await expect(result).toContainText("Se parece a STUBX pero no es la dirección oficial.");
  await expect(result).not.toContainText("Sigue igual");
  await expect(result.locator('[data-estado="igual"]')).toHaveCount(0);
  await page.locator('[data-set-lang="en"]').click();
  await expect(result).toContainText("What is missing");
  await expect(result).toContainText("Try again");
  await expect(result).toContainText("It says it is called «STUBX»");
  await expect(result).toContainText("It looks like STUBX but it is not the official address.");
  await expect(result).not.toContainText("It is the same since the last reading.");
  const beforeRetry = hits.length;
  mode = "ok";
  await result.getByRole("button", { name: "Try again" }).click();
  await expect(result).toContainText("It changed since the last reading.", { timeout: 30_000 });
  expect(hits.slice(beforeRetry).some((item) => item.startsWith("ok getMultipleAccounts"))).toBe(true);
});
