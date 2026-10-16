import { expect, test } from "@playwright/test";

// Datos guardados en este navegador con los nombres anteriores (antes del 16-10-2026).
// Los nombres antiguos salen de /shared/legacy-names.js para no repetirlos aquí.
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

async function seedLegacy(page) {
  await page.goto("/aprender/");
  return page.evaluate(async ({ usdc, usdt }) => {
    const legacy = await import("/shared/legacy-names.js");
    const read = await import("/shared/solana-read.js");
    const model = await import("/shared/notebook-model.js");
    const build = (mint, name, symbol) => {
      const card = read.blankCard(mint, "2026-10-15T12:00:00.000Z", []);
      card.isMint = true;
      card.partial = false;
      card.program = "spl-token";
      card.programStatus = "verificado";
      card.decimals = 6;
      card.supplyAccount = "1000000";
      card.supplyRpc = "1000000";
      card.supplyRpcStatus = "verificado";
      card.slot = 4;
      card.slotStatus = "verificado";
      card.mintAuthority = { state: "revocada", address: null, status: "verificado" };
      card.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
      card.name = { text: name, status: "verificado" };
      card.symbol = { text: symbol, status: "verificado" };
      card.uri = { text: null, status: "ausente" };
      card.metadataMutable = "no";
      card.largestStatus = "ok";
      card.extensionsStatus = "no_aplica";
      card.curve = { present: false, status: "no_aplica", virtualToken: null, virtualQuote: null, realToken: null, realQuote: null, complete: null };
      const checked = model.validateCard(card);
      if (!checked.ok) throw new Error(checked.error.es);
      // Vuelve a los nombres anteriores: esquema con el prefijo viejo y el campo de ficha oficial antiguo.
      const old = {};
      for (const [key, value] of Object.entries(checked.card)) {
        if (key === "officialProject") old[legacy.LEGACY_OFFICIAL_FIELD] = value;
        else if (key === "schema") old.schema = `${legacy.LEGACY_SCHEMA_PREFIX}${String(value).replace(/^orvupi\./, "")}`;
        else old[key] = value;
      }
      return old;
    };
    const forged = build(usdt, "USDT", "USDT");
    forged[legacy.LEGACY_OFFICIAL_FIELD] = true;
    const records = [
      { id: "11111111-1111-4111-8111-111111111111", note: "nota de USDC", card: build(usdc, "USD Coin", "USDC") },
      { id: "22222222-2222-4222-8222-222222222222", note: "nota de USDT", card: forged },
      // Entrada manipulada: red y dirección inventadas. No se copia.
      {
        id: "33333333-3333-4333-8333-333333333333",
        note: "<img src=x onerror=alert(1)>",
        network: "javascript:alert(1)",
        address: "<svg onload=alert(1)>",
        card: { ...build(usdc, "USD Coin", "USDC"), mint: "<b>x</b>", [legacy.LEGACY_OFFICIAL_FIELD]: true },
      },
    ];
    for (const name of ["orvupi-cuaderno", legacy.LEGACY_DB_NAME]) {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      });
    }
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(legacy.LEGACY_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("records", "readwrite");
        for (const record of records) tx.objectStore("records").put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    const p = legacy.LEGACY_PREFIX;
    const values = {
      progress: JSON.stringify({ step: 3, answers: { direccion: "oficial", emision: "contexto" } }),
      lesson: JSON.stringify({ step: 2, answers: { contexto: "contexto" } }),
      draft: JSON.stringify({ title: "Borrador guardado", body: "Texto que no se puede perder" }),
    };
    localStorage.clear();
    localStorage.setItem(`${p}-lab-mision-01`, values.progress);
    localStorage.setItem(`${p}-lab-leccion-permisos`, values.lesson);
    localStorage.setItem(`${p}-studio-draft`, values.draft);
    localStorage.setItem(`${p}-lab-lang`, "en");
    // Si ya hay una clave nueva, manda la nueva; la antigua se queda para poder volver atrás.
    localStorage.setItem("orvupi-lab-leccion-huecos", JSON.stringify({ v: "nuevo" }));
    localStorage.setItem(`${p}-lab-leccion-huecos`, JSON.stringify({ v: "viejo" }));
    // Claves desconocidas o con valores no válidos: no se copian.
    localStorage.setItem(`${p}-`, "x");
    localStorage.setItem(`${p}-cualquiera`, "x");
    localStorage.setItem(`${p}-lab-roto`, "no es json");
    return { prefix: p, db: legacy.LEGACY_DB_NAME, values };
  }, { usdc: USDC, usdt: USDT });
}

test("al cargar, las claves y el cuaderno antiguos pasan a ORVUPI sin perder fichas, notas, borradores ni progreso", async ({ page }) => {
  const seeded = await seedLegacy(page);
  await page.goto("/cuaderno/");
  await expect(page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: USDC })).toBeVisible();
  await expect(page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: USDT })).toBeVisible();

  const state = await page.evaluate(async ({ db }) => {
    const keys = Object.keys(localStorage).sort();
    const entries = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
    const records = await new Promise((resolve, reject) => {
      const request = indexedDB.open("orvupi-cuaderno");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const all = request.result.transaction("records", "readonly").objectStore("records").getAll();
        all.onsuccess = () => {
          request.result.close();
          resolve(all.result);
        };
      };
    });
    const names = indexedDB.databases ? (await indexedDB.databases()).map((item) => item.name) : null;
    return { entries, records, names, db };
  }, { db: seeded.db });

  // Progreso, lecciones, borrador e idioma: copiados con el mismo valor; las antiguas siguen ahí.
  expect(state.entries["orvupi-lab-mision-01"]).toBe(seeded.values.progress);
  expect(state.entries["orvupi-lab-leccion-permisos"]).toBe(seeded.values.lesson);
  expect(state.entries["orvupi-studio-draft"]).toBe(seeded.values.draft);
  expect(state.entries["orvupi-lab-lang"]).toBe("en");
  expect(state.entries["orvupi-lab-leccion-huecos"]).toBe(JSON.stringify({ v: "nuevo" }));
  expect(state.entries[`${seeded.prefix}-lab-mision-01`]).toBe(seeded.values.progress);
  expect(state.entries[`${seeded.prefix}-studio-draft`]).toBe(seeded.values.draft);
  for (const gone of ["orvupi-", "orvupi-cualquiera", "orvupi-lab-roto"]) expect(state.entries[gone]).toBeUndefined();
  expect(state.entries["orvupi-migracion-claves"]).toBeTruthy();
  expect(state.entries["orvupi-migracion-cuaderno"]).toBeTruthy();

  // Fichas y notas: las dos están en la base nueva, con los nombres ORVUPI.
  const byId = Object.fromEntries(state.records.map((record) => [record.id, record]));
  expect(Object.keys(byId).sort()).toEqual(["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"]);
  expect(byId["11111111-1111-4111-8111-111111111111"].note).toBe("nota de USDC");
  expect(byId["22222222-2222-4222-8222-222222222222"].note).toBe("nota de USDT");
  for (const record of state.records) {
    expect(record.card.schema.startsWith("orvupi.")).toBe(true);
    expect(typeof record.card.officialProject).toBe("boolean");
    expect(JSON.stringify(record).includes(`${seeded.prefix}.`)).toBe(false);
  }
  expect(byId["11111111-1111-4111-8111-111111111111"].card.mint).toBe(USDC);
  // El campo oficial antiguo se descarta: otra dirección nunca queda como oficial.
  expect(byId["22222222-2222-4222-8222-222222222222"].card.officialProject).toBe(false);

  // La base antigua no se borra: una vuelta atrás sigue viendo sus fichas.
  if (state.names) expect(state.names.includes(seeded.db)).toBe(true);

  // Una segunda carga no duplica ni pierde nada.
  const rows = await page.locator("#lista-seguimiento .seguimiento-fila").count();
  await page.reload();
  await expect(page.locator("#lista-seguimiento .seguimiento-fila").filter({ hasText: USDC })).toBeVisible();
  await expect(page.locator("#lista-seguimiento .seguimiento-fila")).toHaveCount(rows);
});

test("una copia exportada con los nombres anteriores se importa igual", async ({ page }) => {
  await page.goto("/aprender/");
  const result = await page.evaluate(async () => {
    const legacy = await import("/shared/legacy-names.js");
    const model = await import("/shared/notebook-model.js");
    const upgraded = model.upgradeLegacyNames({
      schema: `${legacy.LEGACY_SCHEMA_PREFIX}notebook.export`,
      cards: [{ card: { schema: `${legacy.LEGACY_SCHEMA_PREFIX}notebook.card`, [legacy.LEGACY_OFFICIAL_FIELD]: false } }],
    });
    return upgraded;
  });
  expect(result.schema).toBe("orvupi.notebook.export");
  expect(result.cards[0].card.schema).toBe("orvupi.notebook.card");
  expect(result.cards[0].card.officialProject).toBe(false);
});
