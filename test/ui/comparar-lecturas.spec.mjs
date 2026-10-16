import { test, expect } from "@playwright/test";

// Antes de pulsar, el elemento se centra como haría una persona al desplazarse
// (la web ORVUPI usa desplazamiento suave y una barra de consulta fija abajo en móvil).
async function tap(locator) {
  await locator.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await locator.click();
}
import { decodeBase58, METADATA_PROGRAM, TOKEN_PROGRAM } from "../../web/v2/shared/solana-read.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const FIRST = 7723351880366328n;
const SECOND = 7723319021661631n;

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

function metadataAccount(mint) {
  const mintBytes = decodeBase58(mint);
  if (!mintBytes || mintBytes.length !== 32) throw new Error(mint);
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 9),
    Buffer.from(mintBytes),
    borsh("USDC"),
    borsh("USDC"),
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

async function recordCount(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open("orvupi-cuaderno");
    request.onerror = () => resolve(0);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) {
        const name = db.name;
        db.close();
        const del = indexedDB.deleteDatabase(name);
        del.onsuccess = () => resolve(0);
        del.onerror = () => resolve(0);
        del.onblocked = () => resolve(0);
        return;
      }
      const count = db.transaction("records", "readonly").objectStore("records").count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => resolve(0);
    };
  }));
}

test("dos lecturas de la misma dirección se comparan en móvil y escritorio", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors = [];
  const appErrors = [];
  const blocked = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && /TypeError|Uncaught|403|Failed to fetch|getTokenSupply|getTokenLargestAccounts/.test(message.text())) {
      appErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    if (!request.url().includes("publicnode")) return;
    const body = request.postData() || "";
    if (body.includes("getTokenSupply") || body.includes("getTokenLargestAccounts")) blocked.push(request.url());
  });
  const supplies = [FIRST, SECOND];
  let reads = 0;
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      const supply = supplies[Math.min(reads, supplies.length - 1)];
      reads += 1;
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(supply)),
        account(METADATA_PROGRAM, metadataAccount(USDC)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      const supply = supplies[Math.min(Math.max(reads - 1, 0), supplies.length - 1)];
      return route.fulfill(rpcResult({ amount: supply.toString(), decimals: 6, uiAmountString: "ignored" }));
    }
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult([]));
    return route.fulfill(rpcResult(1));
  });

  await page.goto("/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(USDC);
  await tap(page.locator("#consultar"));
  await expect(page.locator("#resultado")).toContainText("Suministro total", { timeout: 30_000 });
  await expect(page.locator("#resultado")).toContainText("7.723.351.880,366328 tokens");
  await expect(page.locator("#consulta-error")).toContainText("Guardada en el Cuaderno de este navegador");
  await tap(page.locator("#consultar"));
  await expect(page.locator("#resultado")).toContainText("7.723.319.021,661631 tokens", { timeout: 30_000 });
  await expect(page.locator("#comparar-izquierda option")).toHaveCount(3);

  await tap(page.locator("#comparar"));
  const compared = page.locator("#comparacion");
  await expect(compared).toContainText("Suministro total");
  await expect(compared).toContainText("7.723.351.880,366328 tokens");
  await expect(compared).toContainText("7.723.319.021,661631 tokens");
  await expect(compared.locator(".resumen-comparacion")).toContainText("dato cambió");
  await expect(compared.locator(".resumen-comparacion")).toContainText("siguen igual");
  await expect(compared).toContainText("Antes:");
  await expect(compared).toContainText("Ahora:");
  await expect(compared).toContainText("Bajó 32.858,704697 tokens");
  await expect(compared).not.toContainText("No hay un cambio en los datos leídos");
  await expect(compared).not.toContainText("no se puede determinar si cambió");
  await expect(compared).not.toContainText("spl-token");
  await expect(compared).toContainText("SPL Token");
  const optionText = await page.locator("#comparar-izquierda option").allTextContents();
  expect(optionText.some((item) => /\d{2}:\d{2}:\d{2}/.test(item))).toBe(true);
  await expect(compared).toContainText("Lo que sigue igual");
  await expect(compared.locator(".grupo-igual")).toContainText("Permiso de emisión");
  await expect(compared.locator(".grupo-igual")).toContainText("Nombre");
  await expect(compared.locator(".grupo-igual")).toContainText("Decimales");
  await expect(compared).not.toContainText("getTokenSupply");
  await expect(compared).not.toContainText("Suministro de getTokenSupply");
  const stamps = compared.locator("p.sello");
  await expect(stamps).toHaveCount(2);
  for (const stamp of await stamps.allTextContents()) {
    expect(stamp).toMatch(/\d{1,2} \S+ \d{4}, \d{2}:\d{2}/);
    expect(stamp.includes("T")).toBe(false);
  }
  await expect(compared.locator(".tecnico")).toContainText(/\d{4}-\d{2}-\d{2}T/);
  await expect(compared.locator(".tecnico")).toContainText("Momento de la red");
  const rows = compared.locator("article.ficha");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  for (let index = 0; index < rowCount; index += 1) {
    const text = await rows.nth(index).innerText();
    expect(text.includes("Momento de la red")).toBe(false);
    const states = ["cambió", "igual", "no se puede determinar"].filter((word) => text.includes(word));
    expect(states).toHaveLength(1);
  }
  const covered = await page.evaluate(() => {
    const node = document.querySelector("#comparacion");
    const bar = document.querySelector("form.consulta");
    if (!node || !bar || node.getBoundingClientRect().height < 40) return true;
    const style = getComputedStyle(bar);
    if (style.position !== "fixed") return false;
    const box = node.getBoundingClientRect();
    const form = bar.getBoundingClientRect();
    const y = Math.min(Math.max(box.top + 8, 0), window.innerHeight - 1);
    const point = document.elementFromPoint(Math.min(box.left + 16, window.innerWidth - 1), y);
    return box.bottom > form.top + 1 && Boolean(point && bar.contains(point));
  });
  expect(covered).toBe(false);

  const panel = compared.locator(".explicacion-resultado");
  await expect(panel).toBeHidden();
  await compared.locator(".abrir-entender").click();
  await expect(panel).toBeVisible();
  await expect(panel).toBeFocused();
  await panel.getByRole("link", { name: "Permisos" }).click();
  await page.waitForURL(/\/aprender\/#guia-permisos$/);
  await expect(page.locator("#guia-permisos")).toBeFocused();

  expect(blocked).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(appErrors).toEqual([]);
});

test("una lectura incompleta se avisa y una lectura a medias no se guarda en silencio", async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/, async (route) => {
    const body = route.request().postDataJSON();
    const method = body?.method;
    if (method === "getMultipleAccounts") {
      return route.fulfill(rpcResult([
        account(TOKEN_PROGRAM, mintAccount(FIRST)),
        account(METADATA_PROGRAM, metadataAccount(USDC)),
        null,
      ]));
    }
    if (method === "getTokenSupply") {
      return route.fulfill(rpcResult({ amount: FIRST.toString(), decimals: 6, uiAmountString: "ignored" }));
    }
    if (method === "getTokenLargestAccounts") return route.fulfill(rpcResult(null, 429));
    return route.fulfill(rpcResult(1));
  });

  await page.goto("/verify/");
  await expect(page.locator("#guardar-consulta")).toHaveCount(0);
  await page.locator("#direccion-token").fill(USDC);
  await tap(page.locator("#consulta button[type='submit']"));
  await expect(page.locator("#guardar-consulta")).toBeVisible({ timeout: 20_000 });
  const before = await recordCount(page);
  await page.evaluate(() => {
    const screen = document.getElementById("resultado");
    const save = document.getElementById("guardar-consulta");
    if (screen) screen.setAttribute("aria-busy", "true");
    if (save) save.disabled = false;
    save?.click();
  });
  await expect(page.locator("#comparacion-verify")).toContainText("La lectura no ha terminado. Espera a que aparezca el resultado.");
  expect(await recordCount(page)).toBe(before);

  await page.goto("/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(USDC);
  await tap(page.locator("#consultar"));
  await expect(page.locator("#consulta-error")).toContainText("Lectura incompleta: se guardará marcando lo que falta", { timeout: 30_000 });
  await expect(page.locator("#consulta-error")).toContainText("Guardada en el Cuaderno de este navegador");
  await expect(page.locator("#comparar-izquierda option")).toHaveCount(2);
  await expect(page.locator("#resultado")).toContainText("Suministro total");
});
