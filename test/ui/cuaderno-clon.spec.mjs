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
      next.name = { text: "ORVUPI", status: "verificado" };
      next.symbol = { text: "ORVUPI", status: "verificado" };
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
      { id: "33333333-3333-4333-8333-333333333333", note: "", card: card("2026-10-09T12:00:01.000Z", 3) },
    ];
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("orvupi-cuaderno");
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
  await expect(ficha.locator("p.sello")).toHaveText(/Consultado el .+\d{2}:\d{2}:\d{2}.+puede haber cambiado/);
  const cells = await ficha.locator("dl").first().evaluate((list) => {
    const rows = {};
    const terms = list.querySelectorAll("dt");
    for (const term of terms) {
      const value = term.nextElementSibling;
      if (value && value.tagName === "DD") rows[term.textContent] = value.textContent;
    }
    return rows;
  });
  expect(cells.Nombre).toBe("Dice llamarse «ORVUPI»");
  expect(cells["Enlace de metadatos"]).toBe("No tiene enlace de metadatos");
  expect(JSON.stringify(cells)).not.toMatch(/ausente comprobado|consulta fallida|no consultado/);
  const options = await page.locator("#comparar-izquierda option").allTextContents();
  const labels = options.filter((item) => item !== "—");
  expect(labels).toHaveLength(3);
  const marked = labels.filter((item) => item.endsWith(" (2)"));
  expect(marked).toHaveLength(1);
  const plain = labels.filter((item) => !item.endsWith(" (2)"));
  expect(plain).toHaveLength(2);
  for (const label of labels) {
    expect(label.startsWith("Dice llamarse «ORVUPI» · ERYy… · ")).toBe(true);
    expect(label.startsWith("ORVUPI ·")).toBe(false);
  }
  for (const label of plain) expect(label).toMatch(/\d{2}:\d{2}:\d{2}$/);
  expect(plain.some((label) => marked[0] === `${label} (2)`)).toBe(true);
  const duplicateAt = labels.findIndex((item) => item.endsWith(" (2)"));
  expect(labels[duplicateAt - 1]).toBe(marked[0].slice(0, -4));
  expect(plain[0].slice(-8)).not.toBe(plain[1].slice(-8));
  await page.locator("#comparar").click();
  await expect(page.locator("#comparacion .franja-identidad").first()).toHaveText("Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato.");
  const stamps = page.locator("#comparacion > p.sello");
  await expect(stamps).toHaveCount(2);
  await expect(stamps.nth(0)).toHaveText(/Antes · Consultado el .+\d{2}:\d{2}:\d{2}.+puede haber cambiado/);
  await expect(stamps.nth(1)).toHaveText(/Ahora · Consultado el .+\d{2}:\d{2}:\d{2}.+puede haber cambiado/);
  const nameRow = page.locator("#comparacion article").filter({ has: page.getByRole("heading", { name: "Nombre", exact: true }) });
  await expect(nameRow.locator("p").nth(0)).toHaveText("Antes: Dice llamarse «ORVUPI»");
  await expect(nameRow.locator("p").nth(1)).toHaveText("Ahora: Dice llamarse «ORVUPI»");
});
