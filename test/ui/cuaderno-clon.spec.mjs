import { expect, test } from "@playwright/test";

const ERY = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";

test("el cuaderno muestra el clon, el enlace ausente y la hora con segundos", async ({ page }) => {
  await page.goto("/cuaderno/");
  const saved = await page.evaluate(async (mint) => {
    const read = await import("/shared/solana-read.js");
    const model = await import("/shared/notebook-model.js");
    const card = (at, slot) => {
      const next = read.blankCard(mint, at, []);
      next.isMint = true;
      next.partial = false;
      next.program = "spl-token";
      next.programStatus = "verificado";
      next.decimals = 6;
      next.supplyAccount = "1000000000000000";
      next.supplyRpc = "1000000000000000";
      next.supplyRpcStatus = "verificado";
      next.slot = slot;
      next.slotStatus = "verificado";
      next.mintAuthority = { state: "revocada", address: null, status: "verificado" };
      next.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
      next.name = { text: "STUBX", status: "verificado" };
      next.symbol = { text: "STUBX", status: "verificado" };
      next.uri = { text: null, status: "ausente" };
      next.metadataMutable = "no";
      next.largestStatus = "no_consultado";
      next.extensionsStatus = "no_aplica";
      next.curve = {
        present: false,
        status: "ausente",
        virtualToken: null,
        virtualQuote: null,
        realToken: null,
        realQuote: null,
        complete: null,
      };
      const checked = model.validateCard(next);
      if (!checked.ok) throw new Error(checked.error.es);
      return checked.card;
    };
    const records = [
      { id: "11111111-1111-4111-8111-111111111111", note: "", card: card("2026-10-09T12:00:01.000Z", 1) },
      { id: "22222222-2222-4222-8222-222222222222", note: "", card: card("2026-10-09T12:00:08.000Z", 2) },
    ];
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
        const store = tx.objectStore("records");
        store.clear();
        for (const record of records) store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
    return true;
  }, ERY);
  expect(saved).toBe(true);
  await page.reload();
  const ficha = page.locator("#lista-consultas article.ficha").first();
  await expect(ficha).toBeVisible();
  const cells = await ficha.locator("dl").first().evaluate((list) => {
    const rows = {};
    const terms = list.querySelectorAll("dt");
    for (const term of terms) {
      const value = term.nextElementSibling;
      if (value && value.tagName === "DD") rows[term.textContent] = value.textContent;
    }
    return rows;
  });
  expect(cells.Nombre).toBe("Dice llamarse «STUBX»");
  expect(cells["Enlace de metadatos"]).toBe("No tiene enlace de metadatos");
  expect(JSON.stringify(cells)).not.toMatch(/ausente comprobado|consulta fallida|no consultado/);
  const options = await page.locator("#comparar-izquierda option").allTextContents();
  const labels = options.filter((item) => item !== "—");
  expect(labels).toHaveLength(2);
  for (const label of labels) {
    expect(label.startsWith("Dice llamarse «STUBX» · ERYy… · ")).toBe(true);
    expect(label.startsWith("STUBX ·")).toBe(false);
    expect(label).toMatch(/\d{2}:\d{2}:\d{2}$/);
  }
  expect(labels[0].slice(-8)).not.toBe(labels[1].slice(-8));
  await page.locator("#comparar").click();
  await expect(page.locator("#comparacion .franja-identidad").first()).toHaveText("Se parece a STUBX pero no es la dirección oficial.");
});
