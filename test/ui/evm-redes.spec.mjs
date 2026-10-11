import { expect, test } from "@playwright/test";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BAD_USDC = "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BAD_USDT = "0x55D398326f99059fF775485246999027B3197955";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
};

const NOTICE = {
  ethereum: {
    es: "Al consultar en Ethereum, tu navegador envía la dirección al nodo público ethereum-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.",
    en: "When you look up on Ethereum, your browser sends the address to the public node ethereum-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.",
  },
  bnb: {
    es: "Al consultar en BNB Chain, tu navegador envía la dirección al nodo público bsc-rpc.publicnode.com, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.",
    en: "When you look up on BNB Chain, your browser sends the address to the public node bsc-rpc.publicnode.com, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.",
  },
};

const LEDE = {
  ethereum: {
    es: "Cualquier token ERC-20 (el tipo de token habitual en Ethereum), leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados de Solana, no una lista completa. Elige la red. En Ethereum no se conecta ninguna cartera ni se firma nada.",
    en: "Any ERC-20 token (the usual token type on Ethereum), read live and read-only. The cards below are dated Solana examples, not a complete list. Choose the network. On Ethereum, no wallet is connected and nothing is signed.",
  },
  bnb: {
    es: "Cualquier token BEP-20 (el tipo de token habitual en BNB Chain), leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados de Solana, no una lista completa. Elige la red. En BNB Chain no se conecta ninguna cartera ni se firma nada.",
    en: "Any BEP-20 token (the usual token type on BNB Chain), read live and read-only. The cards below are dated Solana examples, not a complete list. Choose the network. On BNB Chain, no wallet is connected and nothing is signed.",
  },
};

const CHECK_ES = "Las mayúsculas y minúsculas de la dirección no cuadran. Revisa que esté bien copiada.";

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

function tokenOf(address) {
  const key = address.toLowerCase();
  if (key === USDC.toLowerCase()) return { name: "USD Coin", symbol: "USDC", decimals: "06" };
  if (key === USDT.toLowerCase()) return { name: "Tether USD", symbol: "USDT", decimals: "12" };
  return null;
}

function answerFor(address, body) {
  const token = tokenOf(address);
  if (!token) return { error: { code: 3, message: "execution reverted" } };
  const method = body.method;
  const params = body.params || [];
  const data = params[0] && params[0].data ? params[0].data : "";
  if (method === "eth_getCode") return { result: "0x6001" };
  if (method === "eth_getStorageAt") return { result: word("0") };
  if (data === SELECTORS.name) return { result: encodeString(token.name) };
  if (data === SELECTORS.symbol) return { result: encodeString(token.symbol) };
  if (data === SELECTORS.decimals) return { result: word(token.decimals) };
  if (data === SELECTORS.totalSupply) return { result: word("0f4240") };
  if (data === SELECTORS.owner) return { error: { code: 3, message: "execution reverted" } };
  return { error: { code: 3, message: "execution reverted" } };
}

async function mockRpc(page) {
  const calls = { ethereum: 0, bnb: 0 };
  const markets = [];
  const handler = (network) => async (route) => {
    calls[network] += 1;
    const body = JSON.parse(route.request().postData() || "{}");
    const to = body.params && body.params[0] && body.params[0].to ? body.params[0].to : body.params && body.params[0];
    const answer = answerFor(String(to || ""), body);
    const payload = answer.error
      ? { jsonrpc: "2.0", id: body.id, error: answer.error }
      : { jsonrpc: "2.0", id: body.id, result: answer.result };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  };
  await page.route("https://ethereum-rpc.publicnode.com/**", handler("ethereum"));
  await page.route("https://bsc-rpc.publicnode.com/**", handler("bnb"));
  await page.route("https://api.dexscreener.com/**", async (route) => {
    const url = route.request().url();
    markets.push(url);
    const ethereum = url.includes("/ethereum/");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        ethereum
          ? {
              chainId: "ethereum",
              dexId: "uniswap",
              pairAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
              baseToken: { address: USDC, symbol: "usd" },
              quoteToken: { address: WETH, symbol: "NOTWETH" },
              liquidity: { usd: 2500 },
              volume: { h24: 80 },
            }
          : {
              chainId: "bsc",
              dexId: "pancakeswap",
              pairAddress: "0xdefdefdefdefdefdefdefdefdefdefdefdefdefd",
              baseToken: { address: USDT, symbol: "usd" },
              quoteToken: { address: WBNB, symbol: "NOTWBNB" },
              liquidity: { usd: 2500 },
              volume: { h24: 80 },
            },
      ]),
    });
  });
  return { calls, markets };
}

async function expectNotice(page, network, lang) {
  const notice = page.locator("#aviso-rpc-base");
  await expect(notice).toBeVisible();
  await expect(notice.locator(lang === "en" ? ".lang.en" : ".lang.es")).toHaveText(NOTICE[network][lang]);
  const place = await page.evaluate(() => {
    const button = document.querySelector("#consulta button[type='submit'], #consultar");
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
  const button = page.locator("#consulta button[type='submit'], #consultar").first();
  await page.locator("#aviso-rpc-base").scrollIntoViewIfNeeded();
  const clip = await page.evaluate(() => {
    const control = document.querySelector("#consulta button[type='submit'], #consultar");
    const note = document.getElementById("aviso-rpc-base");
    const buttonBox = control.getBoundingClientRect();
    const noteBox = note.getBoundingClientRect();
    const top = Math.max(0, Math.min(buttonBox.top, noteBox.top) - 12);
    const left = Math.max(0, Math.min(buttonBox.left, noteBox.left) - 12);
    const right = Math.min(window.innerWidth, Math.max(buttonBox.right, noteBox.right) + 12);
    const bottom = Math.min(window.innerHeight, Math.max(buttonBox.bottom, noteBox.bottom) + 12);
    return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
  });
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}.png`, clip });
}

async function choose(page, network) {
  await page.goto("/verify/");
  await expect(page.locator("#red")).toHaveValue("solana");
  const values = await page.locator("#red option").evaluateAll((nodes) => nodes.map((node) => node.value));
  expect(values).toEqual(["solana", "base", "ethereum", "bnb"]);
  await page.locator("#red").selectOption(network);
  await expectNotice(page, network, "es");
  await expect(page.locator("main .lede .lang.es")).toHaveText(LEDE[network].es);
  await expect(page.locator("main .lede")).not.toContainText("SPL");
}

test("Ethereum lee USDC y WETH, y un checksum mal no comparte caché", async ({ page }, testInfo) => {
  const rpc = await mockRpc(page);
  await choose(page, "ethereum");
  await page.locator("#direccion-token").fill(BAD_USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("USD Coin");
  expect(rpc.calls.ethereum).toBe(0);

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText("ethereum-rpc.publicnode.com");
  await expect(page.locator("#resultado")).not.toContainText(CHECK_ES);
  const after = rpc.calls.ethereum;
  expect(after).toBeGreaterThan(0);

  await page.locator("#direccion-token").fill(BAD_USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("USD Coin");
  expect(rpc.calls.ethereum).toBe(after);

  await page.locator("#direccion-token").fill(USDC);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });
  expect(rpc.calls.ethereum).toBe(after);
  await page.locator(".leer-mercado").click();
  await expect(page.locator(".datos-mercado")).toContainText("USDC");
  await expect(page.locator(".datos-mercado")).toContainText("WETH");
  await expect(page.locator(".datos-mercado")).not.toContainText("NOTWETH");
  expect(rpc.markets.some((url) => url.includes("/token-pairs/v1/ethereum/") && url.toLowerCase().includes(USDC.toLowerCase()))).toBe(true);

  const shot = testInfo.project.name === "mobile" || testInfo.project.name === "desktop" ? testInfo.project.name : "";
  if (shot) {
    await page.locator("main .lede").screenshot({ path: `/opt/cursor/artifacts/lede-ethereum-es-${shot}.png` });
    await shotNotice(page, `aviso-ethereum-es-${shot}`);
    await page.locator("[data-set-lang='en']").click();
    await expectNotice(page, "ethereum", "en");
    await expect(page.locator("main .lede .lang.en")).toHaveText(LEDE.ethereum.en);
    await page.locator("main .lede").screenshot({ path: `/opt/cursor/artifacts/lede-ethereum-en-${shot}.png` });
    await shotNotice(page, `aviso-ethereum-en-${shot}`);
  }
});

test("BNB Chain lee USDT y WBNB, y un checksum mal no comparte caché", async ({ page }, testInfo) => {
  const rpc = await mockRpc(page);
  await choose(page, "bnb");
  await page.locator("#direccion-token").fill(BAD_USDT);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("Tether USD");
  expect(rpc.calls.bnb).toBe(0);

  await page.locator("#direccion-token").fill(USDT);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("Tether USD", { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText("bsc-rpc.publicnode.com");
  const after = rpc.calls.bnb;
  expect(after).toBeGreaterThan(0);

  await page.locator("#direccion-token").fill(BAD_USDT);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText(CHECK_ES);
  await expect(page.locator("#resultado")).not.toContainText("Tether USD");
  expect(rpc.calls.bnb).toBe(after);

  await page.locator("#direccion-token").fill(USDT);
  await page.locator("#consulta").locator("button[type=submit]").click();
  await expect(page.locator("#resultado")).toContainText("Tether USD");
  expect(rpc.calls.bnb).toBe(after);
  await page.locator(".leer-mercado").click();
  await expect(page.locator(".datos-mercado")).toContainText("USDT");
  await expect(page.locator(".datos-mercado")).toContainText("WBNB");
  await expect(page.locator(".datos-mercado")).not.toContainText("NOTWBNB");
  expect(rpc.markets.some((url) => url.includes("/token-pairs/v1/bsc/") && url.toLowerCase().includes(USDT.toLowerCase()))).toBe(true);

  const shot = testInfo.project.name === "mobile" || testInfo.project.name === "desktop" ? testInfo.project.name : "";
  if (shot) {
    await page.locator("main .lede").screenshot({ path: `/opt/cursor/artifacts/lede-bnb-es-${shot}.png` });
    await shotNotice(page, `aviso-bnb-es-${shot}`);
    await page.locator("[data-set-lang='en']").click();
    await expectNotice(page, "bnb", "en");
    await expect(page.locator("main .lede .lang.en")).toHaveText(LEDE.bnb.en);
    await page.locator("main .lede").screenshot({ path: `/opt/cursor/artifacts/lede-bnb-en-${shot}.png` });
    await shotNotice(page, `aviso-bnb-en-${shot}`);
  }
});

test("el cuaderno guarda Ethereum y BNB Chain con red y dirección distintas", async ({ page }) => {
  await mockRpc(page);
  await page.goto("/cuaderno/");
  await expect(page.locator("#red-cuaderno")).toHaveValue("solana");
  await page.locator("#red-cuaderno").selectOption("ethereum");
  await expect(page.locator("#aviso-rpc-base .lang.es")).toHaveText(NOTICE.ethereum.es);
  await page.locator("#direccion-cuaderno").fill(USDC);
  await page.locator("#consultar").click();
  await expect(page.locator("#resultado")).toContainText("USD Coin", { timeout: 20000 });

  await page.locator("#red-cuaderno").selectOption("bnb");
  await expect(page.locator("#aviso-rpc-base .lang.es")).toHaveText(NOTICE.bnb.es);
  await page.locator("#direccion-cuaderno").fill(USDT);
  await page.locator("#consultar").click();
  await expect(page.locator("#resultado")).toContainText("Tether USD", { timeout: 20000 });

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
    return rows.map((row) => `${row.network}:${row.address}`);
  });
  expect(stored).toContain(`ethereum:${USDC.toLowerCase()}`);
  expect(stored).toContain(`bnb:${USDT.toLowerCase()}`);
});
