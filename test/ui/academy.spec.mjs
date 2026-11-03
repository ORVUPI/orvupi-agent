import { expect, test } from "@playwright/test";

// ORVUPI Academy en navegador. Todo usa datos de prueba en un contexto nuevo:
// nunca se leen notas reales ni se borra almacenamiento (sin clear ni deleteDatabase).
const KEY = "orvupi-academy-progreso";

// WebKit (WPE) avisa una vez por cada <select> de que su hoja interna no cumple style-src 'self'.
// Pasa igual con una página vacía que solo tenga un <select>, y en /verify/: no es nuestro CSS.
const WEBKIT_SELECT = /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive/;

function watchErrors(page) {
  const errors = [];
  const webkit = page.context().browser()?.browserType().name() === "webkit";
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error" || /favicon|Failed to load resource.*(404|net::ERR)/i.test(m.text())) return;
    if (webkit && WEBKIT_SELECT.test(m.text())) return;
    errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test.describe("ORVUPI Academy", () => {
  test("portada propia: marca, manifest, favicon y entrada desde la web", async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto("/academy/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/ORVUPI Academy/);
    await expect(page.locator("header.ac-nav .ac-logo")).toContainText("ACADEMY");
    const manifest = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifest).toBe("/academy/manifest.webmanifest");
    const m = await (await page.request.get(manifest)).json();
    expect(m.name).toBe("ORVUPI Academy");
    expect((await page.request.get(await page.locator('link[rel="icon"]').first().getAttribute("href"))).status()).toBe(200);
    for (const p of ["/academy/articulos/", "/academy/rutas/", "/academy/rutas/primeros-pasos/", "/academy/practicas/", "/academy/glosario/", "/academy/mi-aprendizaje/", "/academy/practicas/laboratorio/", "/academy/practicas/curva-en-vivo/", "/academy/mi-aprendizaje/cuaderno/"]) {
      expect((await page.request.get(p)).status(), p).toBe(200);
    }
    await page.goto("/");
    await expect(page.locator('a[href="/academy/"]').first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test("pregunta, nota y leído se guardan y aparecen en Mi aprendizaje", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/academy/articulos/que-es-una-blockchain/");
    const quiz = page.locator('[data-quiz="OA-002"]');
    await quiz.locator("input[data-ok]").check({ force: true });
    await quiz.locator("[data-check]").click();
    await expect(quiz.locator(".ac-fb")).toContainText("Correcto.");

    await page.goto("/academy/articulos/que-es-el-dinero-digital/");
    await page.locator('textarea[data-notes="OA-001"]').fill("Nota de prueba (fixture)");
    await expect(page.locator(".ac-notes [data-status]")).toContainText("Nota guardada");
    await page.locator('[data-read="OA-001"]').click();
    await expect(page.locator('[data-read="OA-001"]')).toHaveText("Leído ✓");

    await page.goto("/academy/practicas/leer-un-permiso/");
    const act = page.locator('[data-activity="P3"]');
    for (const s of await act.locator("select").all()) await s.selectOption(await s.getAttribute("data-ok"));
    await act.locator("[data-check]").click();
    await expect(act.locator(".ac-fb")).toContainText(/^(\d+) de \1 correctas\./);

    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    expect(saved.preguntas["OA-002"].ok).toBe(true);
    expect(saved.leidos["OA-001"]).toBeTruthy();
    expect(saved.notas["OA-001"].texto).toBe("Nota de prueba (fixture)");
    expect(saved.actividades.P3.ok).toBe(true);

    await page.goto("/academy/mi-aprendizaje/");
    const me = page.locator("[data-ac-me]");
    await expect(me.locator('[data-k="leidos"]')).toHaveText("1");
    await expect(me.locator('[data-k="preguntas"]')).toHaveText("1");
    await expect(me.locator('[data-k="practicas"]')).toHaveText("1");
    await expect(me.locator('[data-k="notas"]')).toContainText("Nota de prueba (fixture)");
    await expect(me.locator('[data-k="siguiente"] a')).toHaveAttribute("href", /\/academy\/articulos\//);
    expect(errors).toEqual([]);
  });

  test("importar suma al progreso sin perder nada y rechaza archivos ajenos", async ({ page }) => {
    await page.addInitScript((k) => {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify({ version: 1, leidos: { "OA-001": "2026-10-01T00:00:00.000Z" }, preguntas: { "OA-002": { ok: true, ultima: true, at: "2026-10-01T00:00:00.000Z" } }, actividades: {}, modulos: {}, notas: { "OA-001": { texto: "local", at: "2026-10-05T00:00:00.000Z" } } }));
      }
    }, KEY);
    await page.goto("/academy/mi-aprendizaje/");
    const copia = { formato: KEY, version: 1, exportado: "2026-10-10T00:00:00.000Z", progreso: { leidos: { "OA-003": "2026-10-02T00:00:00.000Z" }, preguntas: { "OA-002": { ok: false, ultima: false, at: "2026-10-09T00:00:00.000Z" } }, actividades: { P1: { ok: true, aciertos: 6, total: 6, at: "2026-10-03T00:00:00.000Z" } }, modulos: {}, notas: { "OA-001": { texto: "antigua", at: "2026-09-01T00:00:00.000Z" } } } };
    await page.locator("#ac-import").setInputFiles({ name: "copia.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(copia)) });
    await expect(page.locator("[data-ac-me] [data-status]").last()).toContainText("Progreso importado");
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    expect(Object.keys(saved.leidos).sort()).toEqual(["OA-001", "OA-003"]);
    expect(saved.preguntas["OA-002"].ok).toBe(true); // un acierto no se pierde
    expect(saved.actividades.P1.ok).toBe(true);
    expect(saved.notas["OA-001"].texto).toBe("local"); // gana la nota más reciente

    await page.locator("#ac-import").setInputFiles({ name: "otra.json", mimeType: "application/json", buffer: Buffer.from('{"hola":1}') });
    await expect(page.locator("[data-ac-me] [data-status]").last()).toContainText("No se ha cambiado nada");
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).toEqual(saved);

    const download = page.waitForEvent("download");
    await page.locator("[data-export]").click();
    expect((await download).suggestedFilename()).toBe("orvupi-academy-progreso.json");
  });

  test("lee el progreso del Lab y cuenta el Cuaderno sin modificarlos", async ({ page }) => {
    await page.goto("/academy/mi-aprendizaje/");
    await expect(page.locator('[data-k="lab"]')).toHaveText("Aún no has empezado el laboratorio en este navegador.");
    await expect(page.locator('[data-k="cuaderno"]')).toHaveText(/Aún no has guardado fichas|Abre el cuaderno/);
    // Sin Cuaderno previo, Academy no crea la base de datos.
    const created = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).some((d) => d.name === "orvupi-cuaderno") : false));
    expect(created).toBe(false);

    // Fixtures aislados, con el esquema del Cuaderno (shared/notebook-db.js).
    await page.evaluate(async () => {
      localStorage.setItem("orvupi-lab-mision-01", JSON.stringify({ solved: [1, 2, 3], completed: true }));
      localStorage.setItem("orvupi-lab-lang", "es");
      const model = await import("/shared/notebook-model.js");
      await new Promise((ok, ko) => {
        const r = indexedDB.open("orvupi-cuaderno", model.NOTEBOOK_DB_VERSION);
        r.onupgradeneeded = () => r.result.createObjectStore("records", { keyPath: "id" });
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
          const tx = r.result.transaction("records", "readwrite");
          tx.objectStore("records").put({ id: "fixture-1", note: "prueba" });
          tx.objectStore("records").put({ id: "fixture-2", note: "prueba" });
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      });
    });
    await page.reload();
    await expect(page.locator('[data-k="lab"]')).toHaveText("1 actividades del laboratorio empezadas, 1 completadas y 3 pasos resueltos.");
    await expect(page.locator('[data-k="cuaderno"]')).toHaveText(/2 fichas guardadas\.|Abre el cuaderno/);
    const after = await page.evaluate(async () => {
      const db = await new Promise((ok) => { const r = indexedDB.open("orvupi-cuaderno"); r.onsuccess = () => ok(r.result); });
      const n = await new Promise((ok) => { const c = db.transaction("records").objectStore("records").count(); c.onsuccess = () => ok(c.result); });
      db.close();
      return { n, lab: localStorage.getItem("orvupi-lab-mision-01") };
    });
    expect(after.n).toBe(2);
    expect(JSON.parse(after.lab).solved).toEqual([1, 2, 3]);
  });

  test("las anclas del antiguo Aprender siguen llevando a su sitio", async ({ page }) => {
    await page.goto("/academy/glosario/#guia-identificar");
    await expect(page).toHaveURL(/\/academy\/articulos\/[a-z-]+\//);
    await page.goto("/academy/glosario/#direccion");
    await expect(page.locator("#direccion")).toBeAttached();
  });

  test("búsqueda de la cabecera filtra artículos", async ({ page }) => {
    await page.goto("/academy/articulos/?q=phishing");
    await expect(page.locator(".ac-lcard:not([hidden])").first()).toHaveAttribute("data-search", /phishing/i);
    await expect(page.locator(".ac-lcard[hidden]").first()).toBeAttached();
    await expect(page.locator("#art-n")).toHaveText(/Artículos \(\d+\)/);
  });
});

test.describe("menú móvil", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("abre, atrapa el foco y se cierra con Escape", async ({ page }) => {
    await page.goto("/academy/");
    const burger = page.locator(".ac-burger");
    await burger.click();
    await expect(page.locator("#ac-menu-movil")).toBeVisible();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.getElementById("ac-menu-movil").contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#ac-menu-movil")).toBeHidden();
    await expect(burger).toBeFocused();
    // Sin desbordamiento horizontal en 390 px.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
  });
});
