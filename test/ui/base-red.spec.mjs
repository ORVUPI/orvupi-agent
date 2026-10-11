import { expect, test } from "@playwright/test";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NO_OWNER = "0x1111111111111111111111111111111111111111";
const PROXY = "0x2222222222222222222222222222222222222222";
const EOA = "0x3333333333333333333333333333333333333333";
const DOWN = "0x5555555555555555555555555555555555555555";
const IMPL = "4444444444444444444444444444444444444444";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
};
const SLOT_IMPLEMENTATION = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function word(hex) {
  return `0x${hex.replace(/^0x/, "").padStart(64, "0")}`;
}

function encodeString(text) {
  const bytes = new TextEncoder().encode(text);
  const length = bytes.length.toString(16).padStart(64, "0");
  let data = "";
  for (const byte of bytes) data += byte.toString(16).padStart(2, "0");
  const pad = (64 - (data.length % 64)) % 64;
  return `0x${"20".padStart(64, "0")}${length}${data}${"0".repeat(pad)}`;
}

function answerFor(address, body) {
  const method = body.method;
  const params = body.params || [];
  const data = params[0] && params[0].data ? params[0].data : "";
  const slot = String(params[1] || "");
  if (address === DOWN) return null;
  if (address === EOA) {
    if (method === "eth_getCode") return { result: "0x" };
    if (method === "eth_getStorageAt") return { result: word("0") };
    return { error: { code: 3, message: "execution reverted" } };
  }
  if (address === NO_OWNER) {
    if (method === "eth_getCode") return { result: "0x6001" };
    if (method === "eth_getStorageAt") return { result: word("0") };
    if (data === SELECTORS.name) return { result: encodeString("Foo") };
    if (data === SELECTORS.symbol) return { result: encodeString("FOO") };
    if (data === SELECTORS.decimals) return { result: word("12") };
    if (data === SELECTORS.totalSupply) return { result: word("0a") };
    if (data === SELECTORS.owner) return { error: { code: 3, message: "execution reverted" } };
    return { error: { code: 3, message: "execution reverted" } };
  }
  if (address === PROXY) {
    if (method === "eth_getCode") return { result: "0x363d3d" };
    if (method === "eth_getStorageAt" && slot === SLOT_IMPLEMENTATION) return { result: word(IMPL) };
    if (method === "eth_getStorageAt") return { result: word("0") };
    return { error: { code: 3, message: "execution reverted" } };
  }
  if (method === "eth_getCode") return { result: "0x60016000" };
  if (method === "eth_getStorageAt" && slot === SLOT_IMPLEMENTATION) return { result: word(IMPL) };
  if (method === "eth_getStorageAt") return { result: word("0") };
  if (data === SELECTORS.name) return { result: encodeString("USD Coin") };
  if (data === SELECTORS.symbol) return { result: encodeString("USDC") };
  if (data === SELECTORS.decimals) return { result: word("06") };
  if (data === SELECTORS.totalSupply) return { result: word("0f4240") };
  if (data === SELECTORS.owner) return { result: word("5555555555555555555555555555555555555555") };
  return { error: { code: 3, message: "execution reverted" } };
}

async function mockRpc(page) {
  let calls = 0;
  await page.route("https://mainnet.base.org/**", async (route) => {
    calls += 1;
    const body = JSON.parse(route.request().postData() || "{}");
    const to = body.params && body.params[0] && body.params[0].to ? body.params[0].to : body.params && body.params[0];
    const address = String(to || "");
    if (address.toLowerCase() === DOWN.toLowerCase()) {
      await route.fulfill({ status: 500, contentType: "application/json", body: "" });
      return;
    }
    const answer = answerFor(address, body);
    if (!answer) {
      await route.fulfill({ status: 500, contentType: "application/json", body: "" });
      return;
    }
    const payload = answer.error
      ? { jsonrpc: "2.0", id: body.id, error: answer.error }
      : { jsonrpc: "2.0", id: body.id, result: answer.result };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });
  await page.route("https://api.dexscreener.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          chainId: "base",
          dexId: "aerodrome",
          pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
          baseToken: { address: USDC, symbol: "USDC" },
          quoteToken: { address: "0x4200000000000000000000000000000000000006", symbol: "WETH" },
          liquidity: { usd: 2500 },
          volume: { h24: 80 },
        },
      ]),
    });
  });
  return {
    calls: () => calls,
  };
}

const BASE_NOTICE = {
  es: "Al consultar en Base, tu navegador envía la dirección al nodo público mainnet.base.org, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.",
  en: "When you look up on Base, your browser sends the address to the public node mainnet.base.org, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.",
};
const SOLANA_NOTICE = {
  es: "Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP.",
  en: "To read it live, it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP.",
};

async function expectNoticeBesideButton(page, lang) {
  const notice = page.locator("#aviso-rpc-base");
  await expect(notice).toBeVisible();
  await expect(notice.locator(lang === "en" ? ".lang.en" : ".lang.es")).toHaveText(BASE_NOTICE[lang]);
  const place = await page.evaluate(() => {
    const button = document.querySelector("#consulta button[type='submit']");
    const note = document.getElementById("aviso-rpc-base");
    const buttonBox = button.getBoundingClientRect();
    const noteBox = note.getBoundingClientRect();
    const gap = noteBox.top - buttonBox.bottom;
    const sameRow = Math.abs(noteBox.top - buttonBox.top) < 28 && noteBox.left >= buttonBox.left - 8;
    return {
      folded: Boolean(note.closest("details")),
      hidden: note.hidden,
      near: sameRow || (gap >= -8 && gap < 96),
      width: noteBox.width,
      height: noteBox.height,
    };
  });
  expect(place.folded).toBe(false);
  expect(place.hidden).toBe(false);
  expect(place.near).toBe(true);
  expect(place.width).toBeGreaterThan(180);
  expect(place.height).toBeGreaterThan(18);
}

async function shotNotice(page, name) {
  await page.locator("#aviso-rpc-base").scrollIntoViewIfNeeded();
  const clip = await page.evaluate(() => {
    const button = document.querySelector("#consulta button[type='submit']");
    const note = document.getElementById("aviso-rpc-base");
    const buttonBox = button.getBoundingClientRect();
    const noteBox = note.getBoundingClientRect();
    const top = Math.max(0, Math.min(buttonBox.top, noteBox.top) - 12);
    const left = Math.max(0, Math.min(buttonBox.left, noteBox.left) - 12);
    const right = Math.min(window.innerWidth, Math.max(buttonBox.right, noteBox.right) + 12);
    const bottom = Math.min(window.innerHeight, Math.max(buttonBox.bottom, noteBox.bottom) + 12);
    return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
  });
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}.png`, clip });
}

async function chooseBase(page) {
  await page.goto("/verify/");
  await expect(page.locator("#red")).toHaveValue("solana");
  await expect(page.locator("#aviso-guardar .aviso-nodos .lang.es")).toHaveText(SOLANA_NOTICE.es);
  await expect(page.locator("#aviso-rpc-base")).toBeHidden();
  await page.locator("#red").selectOption("base");
  await expectNoticeBesideButton(page, "es");
  await expect(page.locator("#aviso-guardar .aviso-nodos")).toBeHidden();
  await expect(page.locator("#comprobaciones-red")).toContainText("Si hay una dirección owner, el contrato puede darle funciones especiales. Esta lectura no dice cuáles son.");
  await expect(page.locator("#comprobaciones-red")).toContainText("Con un proxy, el código al que se reenvía puede cambiarse. Esta lectura no dice si ha cambiado.");
  await expect(page.locator("#comprobaciones-red")).toContainText("Otros tipos de proxy no se comprueban aquí");
  await expect(page.locator("#comprobaciones-red")).not.toContainText("No es un permiso de Solana");
}

test("Verify en Base lee USDC, un token sin owner, un proxy, una cuenta, una dirección inválida y un nodo caído", async ({ page }, testInfo) => {
  const rpc = await mockRpc(page);
  await chooseBase(page);
  const before = rpc.calls();
  await page.locator("#direccion-token").fill("0x123");
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/No se ha consultado el nodo|The node was not queried/);
  expect(rpc.calls()).toBe(before);

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText(/leído|read/);
  await expect(page.locator("#resultado")).toContainText(/EIP-1967|proxy/i);
  await expect(page.locator("#resultado")).toContainText("Otros tipos de proxy no se comprueban aquí");
  await expect(page.locator("#resultado")).toContainText("mainnet.base.org");
  const shot = testInfo.project.name === "mobile" ? "mobile" : testInfo.project.name === "desktop" ? "desktop" : "";
  if (shot) {
    await shotNotice(page, `aviso-base-es-${shot}`);
    await page.screenshot({ path: `/opt/cursor/artifacts/verify-base-es-${shot}.png`, fullPage: true });
    await page.locator("[data-set-lang='en']").click();
    await expectNoticeBesideButton(page, "en");
    await expect(page.locator("#resultado")).toContainText(/The contract wrote/);
    await shotNotice(page, `aviso-base-en-${shot}`);
    await page.screenshot({ path: `/opt/cursor/artifacts/verify-base-en-${shot}.png`, fullPage: true });
    await page.locator("[data-set-lang='es']").click();
    await expectNoticeBesideButton(page, "es");
  } else {
    await page.locator("[data-set-lang='en']").click();
    await expectNoticeBesideButton(page, "en");
    await page.locator("[data-set-lang='es']").click();
  }
  await page.locator(".leer-mercado").click();
  await expect(page.locator(".datos-mercado")).toContainText(/USDC/);
  await expect(page.locator(".datos-mercado")).toContainText(/WETH/);
  await expect(page.locator(".datos-mercado")).not.toContainText(/priceUsd|precio por token/i);

  await page.evaluate(() => window.stubxResetEvm && window.stubxResetEvm());
  await page.locator("#direccion-token").fill(NO_OWNER);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/Dice llamarse «Foo»|It says it is called «Foo»/, { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText(/ausente comprobado|confirmed absent/);

  await page.evaluate(() => window.stubxResetEvm && window.stubxResetEvm());
  await page.locator("#direccion-token").fill(PROXY);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/EIP-1967/, { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText(/0x4444444444444444444444444444444444444444/i);

  await page.evaluate(() => window.stubxResetEvm && window.stubxResetEvm());
  await page.locator("#direccion-token").fill(EOA);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/EOA/, { timeout: 20000 });

  await page.evaluate(() => window.stubxResetEvm && window.stubxResetEvm());
  await page.locator("#direccion-token").fill(DOWN);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(/consulta fallida|failed query/, { timeout: 20000 });
});

const BAD_CHECKSUM = "0x833589fCd6eDb6E08f4c7C32D4f71b54bdA02913";
const ZERO = `0x${"0".repeat(40)}`;
const ZERO_ES = "Es la dirección cero: no es la dirección de ningún token.";
const ZERO_EN = "This is the zero address: it is not a token address.";
const CHECK_ES = "Las mayúsculas y minúsculas de la dirección no cuadran. Revisa que esté bien copiada.";
const CHECK_EN = "The upper and lower case letters in this address do not match. Check that it was copied correctly.";
const LEDE_BASE_ES = "Cualquier token ERC-20 (el tipo de token habitual en Base), leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados de Solana, no una lista completa. Elige la red. En Base no hay cartera ni firma.";
const LEDE_BASE_EN = "Any ERC-20 token (the usual token type on Base), read live and read-only. The cards below are dated Solana examples, not a complete list. Choose the network. On Base there is no wallet and no signature.";

test("un checksum mal no comparte caché con USDC", async ({ page }) => {
  const rpc = await mockRpc(page);
  await chooseBase(page);
  await page.locator("#direccion-token").fill(BAD_CHECKSUM);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("USD Coin");
  expect(rpc.calls()).toBe(0);

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });
  await expect(page.locator("#resultado")).not.toContainText(CHECK_ES);
  const afterUsdc = rpc.calls();
  expect(afterUsdc).toBeGreaterThan(0);

  await page.locator("#direccion-token").fill(BAD_CHECKSUM);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("USD Coin");
  expect(rpc.calls()).toBe(afterUsdc);
});

test("en Base la entradilla no habla de SPL y se ocultan Permiso de emisión y Curva", async ({ page }) => {
  await page.goto("/verify/");
  await expect(page.locator("main .lede .lang.es")).toContainText("Cualquier token SPL o Token-2022");
  await expect(page.locator('a[href="/aprender/#autoridad-emision"]')).toBeVisible();
  await expect(page.locator('a[href="/aprender/#curva-pump"]')).toBeVisible();
  await expect(page.locator('a[href="/aprender/#direccion"]')).toBeVisible();
  await page.locator("#red").selectOption("base");
  await expect(page.locator("main .lede .lang.es")).toHaveText(LEDE_BASE_ES);
  await expect(page.locator("main .lede")).not.toContainText("SPL");
  await expect(page.locator("main .lede")).not.toContainText("Token-2022");
  await expect(page.locator('a[href="/aprender/#autoridad-emision"]')).toBeHidden();
  await expect(page.locator('a[href="/aprender/#curva-pump"]')).toBeHidden();
  await expect(page.locator('a[href="/aprender/#direccion"]')).toBeVisible();
  await expect(page.locator('a[href="/aprender/#guia-identificar"]')).toBeVisible();
  await page.locator("[data-set-lang='en']").click();
  await expect(page.locator("main .lede .lang.en")).toHaveText(LEDE_BASE_EN);
  await page.locator("#direccion-token").fill(ZERO);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(ZERO_EN);
  await expect(page.locator("#resultado")).not.toContainText("does not have this network's shape");
  await page.locator("#direccion-token").fill(BAD_CHECKSUM);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_EN);
  await page.locator("#direccion-token").fill("0x123");
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("That address does not have this network's shape");
  await expect(page.locator("#resultado")).not.toContainText(ZERO_EN);
  await expect(page.locator("#resultado")).not.toContainText("do not match");
  await page.locator("[data-set-lang='es']").click();
  await page.locator("#direccion-token").fill(ZERO);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(ZERO_ES);
  await page.locator("#direccion-token").fill(BAD_CHECKSUM);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await page.locator("#red").selectOption("solana");
  await expect(page.locator("main .lede .lang.es")).toContainText("Cualquier token SPL o Token-2022");
  await expect(page.locator('a[href="/aprender/#autoridad-emision"]')).toBeVisible();
  await expect(page.locator('a[href="/aprender/#curva-pump"]')).toBeVisible();
});

test("el cuaderno guarda la red y la dirección de Base", async ({ page }) => {
  await mockRpc(page);
  await page.goto("/cuaderno/");
  await expect(page.locator("#red-cuaderno")).toHaveValue("solana");
  await page.locator("#red-cuaderno").selectOption("base");
  await expect(page.locator("#aviso-rpc-base .lang.es")).toHaveText(BASE_NOTICE.es);
  await expectNoticeBesideButton(page, "es");
  await page.locator("#direccion-cuaderno").fill(USDC);
  await page.locator("#consultar").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });
  await expect(page.locator("#lista-consultas")).toContainText(USDC.toLowerCase(), { timeout: 20000 });
  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("stubx-cuaderno");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise((resolve, reject) => {
      const items = [];
      const request = db.transaction("records").objectStore("records").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(items);
          return;
        }
        items.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows.map((row) => ({ network: row.network, address: row.address, cardNetwork: row.card && row.card.network }));
  });
  expect(stored.some((row) => row.network === "base" && row.address === USDC.toLowerCase() && row.cardNetwork === "base")).toBe(true);
});
