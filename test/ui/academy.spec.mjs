import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

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
    // Firefox cancela la fuente al cambiar de página (NS_BINDING_ABORTED). El archivo sí se sirve.
    if (/downloadable font: download failed/.test(m.text()) && /2152398850/.test(m.text())) return;
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
  test("abre, atrapa el foco y se cierra con Escape", async ({ page }) => {
    test.skip(page.viewportSize().width >= 768, "solo móvil");
    await page.goto("/academy/");
    const burger = page.locator(".ac-burger");
    await burger.click();
    await expect(page.locator("#ac-menu-movil")).toBeVisible();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.getElementById("ac-menu-movil").contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#ac-menu-movil")).toBeHidden();
    await expect(burger).toBeFocused();
    // Sin desbordamiento horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});

// ---------- Recorrido completo y datos antiguos ----------
const fixture = JSON.parse(readFileSync(new URL("../fixtures/launchlab-real.json", import.meta.url), "utf8"));
const ORVUPI = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const byAddress = new Map(Object.values(fixture.accounts).filter(Boolean).map((row) => [row.address, row]));
async function rpc(route) {
  const request = route.request().postDataJSON();
  const reply = (result) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: request.id ?? 1, result }) });
  if (request.method === "getSlot") return reply(fixture.slot);
  if (request.method === "getMultipleAccounts") {
    return reply({ context: { slot: fixture.slot }, value: request.params[0].map((address) => {
      const row = byAddress.get(address);
      return row ? { data: [row.data, "base64"], executable: false, lamports: 1, owner: row.owner, space: Buffer.from(row.data, "base64").length } : null;
    }) });
  }
  if (request.method === "getTokenSupply") return reply({ context: { slot: fixture.slot }, value: { amount: "1000000000000000", decimals: 6, uiAmountString: "1000000000" } });
  if (request.method === "getTokenLargestAccounts") return reply({ context: { slot: fixture.slot }, value: [{ address: ORVUPI, amount: "1", decimals: 6 }] });
  return route.fulfill({ status: 400, body: "metodo" });
}
const RPC = /solana-rpc\.publicnode\.com|api\.mainnet-beta\.solana\.com/;
const noOverflow = async (page, where) => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `desbordamiento en ${where}`).toBeLessThanOrEqual(1);

test("recorrido completo: portada → ruta → lección → actividad y quiz → prácticas → glosario → notas → progreso", async ({ page }) => {
  test.setTimeout(120000);
  const errors = watchErrors(page);
  await page.route(RPC, rpc);
  await page.goto("/academy/");
  await noOverflow(page, "portada");
  await page.locator('main a[href="/academy/rutas/primeros-pasos/"]').first().click();
  await expect(page).toHaveURL(/\/academy\/rutas\/primeros-pasos\/$/);
  await expect(page.locator(".ac-row[data-modulo]")).toHaveCount(6);
  await noOverflow(page, "ruta");
  await page.locator('main a.ac-btn.pink[href="/academy/articulos/que-es-el-dinero-digital/"]').first().click();
  await expect(page).toHaveURL(/que-es-el-dinero-digital\/$/);
  await expect(page.locator("h1")).toBeVisible();
  await noOverflow(page, "lección");

  // Actividad: primero un error, luego todo bien.
  const act = page.locator('[data-activity="OA-001"]');
  await act.locator("[data-check]").click();
  await expect(act.locator(".ac-fb")).toContainText(/Te faltan/);
  for (const s of await act.locator("select").all()) await s.selectOption(await s.getAttribute("data-ok"));
  await act.locator("[data-check]").click();
  await expect(act.locator(".ac-fb")).toContainText("¡Hecho!");
  // Quiz: una incorrecta y después la correcta; el acierto se conserva.
  const quiz = page.locator('[data-quiz="OA-001"]');
  await quiz.locator("input:not([data-ok])").first().check({ force: true });
  await quiz.locator("[data-check]").click();
  await expect(quiz.locator(".ac-fb")).toContainText("No es esa.");
  await quiz.locator("input[data-ok]").check({ force: true });
  await quiz.locator("[data-check]").click();
  await expect(quiz.locator(".ac-fb")).toContainText("Correcto.");
  // Nota y leído.
  await page.locator('textarea[data-notes="OA-001"]').fill("Mi nota del recorrido");
  await expect(page.locator(".ac-notes [data-status]")).toContainText("Nota guardada");
  await page.locator('[data-read="OA-001"]').click();
  await expect(page.locator('[data-read="OA-001"]')).toHaveText("Leído ✓");
  // Término del glosario enlazado desde la lección.
  await page.locator('main a.term[href^="/academy/glosario/"]').first().click();
  await expect(page).toHaveURL(/\/academy\/glosario\/[a-z0-9-]+\/$/);
  await expect(page.locator("h1")).toBeVisible();

  // Prácticas: curva en vivo (RPC simulado con cuentas reales capturadas).
  await page.goto("/academy/practicas/");
  await expect(page.locator('main a[href="/academy/practicas/curva-en-vivo/"]').first()).toBeAttached();
  await page.goto("/academy/practicas/curva-en-vivo/");
  await page.locator("#direccion-token").fill(ORVUPI);
  await page.locator("#consulta button[type=submit], #consulta button").first().click();
  await expect(page.locator("#resultado")).toContainText("Raydium LaunchLab", { timeout: 20000 });
  await expect(page.locator("#resultado")).toContainText("1,64 %");
  await noOverflow(page, "curva");
  // Cuaderno dentro de Academy.
  await page.goto("/academy/mi-aprendizaje/cuaderno/");
  await page.locator("#direccion-cuaderno").fill(ORVUPI);
  await page.locator("#consultar").click();
  await expect(page.locator("#resultado")).toContainText("Raydium LaunchLab", { timeout: 20000 });
  await noOverflow(page, "cuaderno");

  // Glosario: filtro.
  await page.goto("/academy/glosario/");
  await page.locator("#gl-q").fill("wallet");
  await expect(page.locator("section[data-term]:not([hidden])").first()).toBeVisible();
  const shown = await page.locator("section[data-term]:not([hidden])").count();
  const total = await page.locator("section[data-term]").count();
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(total);
  await noOverflow(page, "glosario");

  // Progreso.
  await page.goto("/academy/mi-aprendizaje/");
  const me = page.locator("[data-ac-me]");
  await expect(me.locator('[data-k="leidos"]')).toHaveText("1");
  await expect(me.locator('[data-k="preguntas"]')).toHaveText("1");
  await expect(me.locator('[data-k="notas"]')).toContainText("Mi nota del recorrido");
  await page.goto("/academy/rutas/primeros-pasos/");
  await expect(page.locator('.ac-row a[data-unit="OA-001"]')).toHaveClass(/is-done/);
  await expect(page.locator("[data-ac-continue]")).toHaveText("Continuar la ruta");
  await noOverflow(page, "mi aprendizaje");
  expect(errors).toEqual([]);
});

test("evaluación del módulo: aprobado con 5 de 6 y queda marcado en la ruta", async ({ page }) => {
  await page.goto("/academy/rutas/primeros-pasos/");
  const href = await page.locator('.ac-row[data-modulo="1"] a[href$="#evaluacion"]').getAttribute("href");
  await page.goto(href);
  const exam = page.locator("[data-exam]");
  const sets = await exam.locator("fieldset").all();
  for (const [i, fs] of sets.entries()) await fs.locator(i === 0 ? "input:not([data-ok])" : "input[data-ok]").first().check({ force: true });
  await exam.locator("[data-check]").click();
  await expect(exam.locator("[data-total]")).toContainText(`${sets.length - 1} de ${sets.length} aciertos. Módulo superado.`);
  await page.goto("/academy/rutas/primeros-pasos/");
  await expect(page.locator('.ac-row[data-modulo="1"]')).toHaveClass(/is-done/);
});

test("rutas nuevas: portada, página de ruta, paginación dentro de la ruta y «Tus rutas»", async ({ page }) => {
  const errors = watchErrors(page);
  const datos = JSON.parse(readFileSync(new URL("../../web/v2/academy/datos.json", import.meta.url), "utf8"));
  expect(datos.rutas.length).toBeGreaterThanOrEqual(6);
  await page.goto("/academy/");
  for (const r of datos.rutas) await expect(page.locator(`main a[href="${r.u}"]`).first()).toBeAttached();
  await page.goto("/academy/rutas/");
  for (const r of datos.rutas) await expect(page.locator(`main a[href="${r.u}"]`).first()).toBeAttached();
  for (const r of datos.rutas.slice(1)) {
    await page.goto(r.u);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".ac-row[data-modulo]")).toHaveCount(datos.modulos.filter((m) => m.r === r.slug).length);
    await noOverflow(page, r.slug);
  }
  // Última lección de la ruta de estafas: la paginación no salta a otra ruta.
  const estafas = datos.rutas.find((r) => r.slug === "estafas");
  const last = datos.unidades.find((u) => u.id === estafas.unidades.at(-1));
  await page.goto(last.u);
  await noOverflow(page, "lección nueva");
  const mod = datos.modulos.find((x) => x.r === "estafas");
  await expect(page.locator(".ac-pager a.next")).toHaveAttribute("href", `${mod.u}#evaluacion`);
  // Una lección leída cuenta en «Tus rutas».
  await page.locator(`[data-read="${last.id}"]`).click();
  await expect(page.locator(`[data-read="${last.id}"]`)).toHaveText("Leído ✓");
  await page.goto("/academy/mi-aprendizaje/");
  await expect(page.locator('[data-k="rutas"] [data-ruta="estafas"]')).toHaveText("1");
  await expect(page.locator('[data-k="rutas"] [data-ruta="primeros-pasos"]')).toHaveText("0");
  // Evaluación de un módulo nuevo: 6 preguntas, aprobado con 5.
  const m = datos.modulos.find((x) => x.r === "regulacion-ue");
  await page.goto(m.u + "#evaluacion");
  const exam = page.locator("[data-exam]");
  const sets = await exam.locator("fieldset").all();
  expect(sets.length).toBe(6);
  for (const [i, fs] of sets.entries()) await fs.locator(i === 0 ? "input:not([data-ok])" : "input[data-ok]").first().check({ force: true });
  await exam.locator("[data-check]").click();
  await expect(exam.locator("[data-total]")).toContainText("5 de 6 aciertos. Módulo superado.");
  expect(errors).toEqual([]);
});

test("datos antiguos: Lab y Cuaderno guardados antes siguen en Academy", async ({ page }) => {
  // Se escriben datos como los dejaba la herramienta antigua (/lab/ y /cuaderno/: mismo origen, mismas claves).
  await page.goto("/lab/");
  const LAB = JSON.parse(readFileSync(new URL("../../web/v2/assets/mission.js", import.meta.url), "utf8").split("\n")[2].replace(/^const ORVUPI_LAB = /, "").replace(/;\s*$/, ""));
  const seeded = await page.evaluate(async (m) => {
    const progress = { version: 1, missionId: m.id, missionVersion: m.version, lang: "es", solved: [m.steps[0].id], attempts: {}, completed: false };
    localStorage.setItem("orvupi-lab-mision-01", JSON.stringify(progress));
    const model = await import("/shared/notebook-model.js");
    await new Promise((ok, ko) => {
      const r = indexedDB.open("orvupi-cuaderno", model.NOTEBOOK_DB_VERSION);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("records")) r.result.createObjectStore("records", { keyPath: "id" }); };
      r.onerror = () => ko(r.error);
      r.onsuccess = () => { const tx = r.result.transaction("records", "readwrite"); tx.objectStore("records").put({ id: "antigua-1", note: "ficha antigua" }); tx.oncomplete = () => { r.result.close(); ok(); }; };
    });
    return progress;
  }, LAB.mission);
  await page.goto("/academy/mi-aprendizaje/");
  await expect(page.locator('[data-k="lab"]')).toContainText("1 actividades del laboratorio empezadas, 0 completadas y 1 pasos resueltos.");
  await expect(page.locator('[data-k="cuaderno"]')).toHaveText(/1 fichas? guardadas?\.|Abre el cuaderno/);
  // El laboratorio dentro de Academy monta la misión con las mismas claves: sigue donde se dejó.
  await page.goto("/academy/practicas/laboratorio/");
  await expect(page.locator("#mision-app")).not.toBeEmpty();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("orvupi-lab-mision-01")));
  expect(after.solved).toEqual(seeded.solved);
  await expect(page.locator("[data-leccion]").first()).not.toBeEmpty();
  // La ficha antigua sigue en la base del Cuaderno.
  const n = await page.evaluate(async () => {
    const db = await new Promise((ok) => { const r = indexedDB.open("orvupi-cuaderno"); r.onsuccess = () => ok(r.result); });
    const c = await new Promise((ok) => { const q = db.transaction("records").objectStore("records").get("antigua-1"); q.onsuccess = () => ok(q.result); });
    db.close(); return c && c.note;
  });
  expect(n).toBe("ficha antigua");
});

test("redirecciones: cada ruta antigua apunta a una página de Academy que existe", async ({ page }) => {
  const rules = readFileSync(new URL("../../web/v2/_redirects", import.meta.url), "utf8").split("\n")
    .map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 3 && /^\/(:lang\/)?(aprender|lab|pares|cuaderno|comparar|academy)\b/.test(p[0]));
  expect(rules.length).toBeGreaterThanOrEqual(30);
  const seen = new Set();
  for (const [, to] of rules) {
    const [path, hash] = to.split("#");
    if (seen.has(to)) continue; seen.add(to);
    expect((await page.request.get(path)).status(), to).toBe(200);
    if (hash) { await page.goto(to); await expect(page.locator(`[id="${hash}"]`), to).toBeAttached(); }
  }
  // Todas las anclas del antiguo /aprender/ existen en el glosario o se reenvían a un artículo.
  const old = [...readFileSync(new URL("../../web/v2/aprender/index.html", import.meta.url), "utf8").matchAll(/<(?:section|article|dt|div|h[2-4])[^>]* id="([a-z0-9-]+)"/g)].map((m) => m[1]);
  await page.goto("/academy/glosario/");
  const legacy = JSON.parse(await page.locator("[data-ac-glist]").getAttribute("data-legacy"));
  for (const id of old) {
    if (legacy[id]) continue;
    await expect(page.locator(`[id="${id}"]`), `#${id}`).toBeAttached();
  }
});

test("redes: filtro por red en Artículos, páginas de cada red y etiquetas en el artículo", async ({ page }) => {
  const errors = watchErrors(page);
  const datos = JSON.parse(readFileSync(new URL("../../web/v2/academy/datos.json", import.meta.url), "utf8"));
  const eth = datos.redes.find((r) => r.id === "ethereum");
  await page.goto("/academy/articulos/?red=ethereum");
  await expect(page.locator("#f-r")).toHaveValue("ethereum");
  await expect(page.locator("[data-ac-list] .ac-lcard:not([hidden])")).toHaveCount(eth.unidades.length);
  await page.locator("#f-r").selectOption("bitcoin");
  await expect(page).toHaveURL(/[?&]red=bitcoin\b/);
  const btc = datos.redes.find((r) => r.id === "bitcoin");
  await expect(page.locator("[data-ac-list] .ac-lcard:not([hidden])")).toHaveCount(btc.unidades.length);
  await page.locator("#f-r").selectOption("");
  await expect(page.locator("[data-ac-list] .ac-lcard:not([hidden])")).toHaveCount(datos.unidades.length);
  await noOverflow(page, "artículos");
  await page.goto("/academy/redes/");
  await expect(page.locator("h1")).toHaveText("Blockchains y redes");
  for (const r of datos.redes) await expect(page.locator(`main a[href="${r.u}"]`).first()).toBeAttached();
  await noOverflow(page, "redes");
  await page.goto(eth.u);
  await expect(page.locator("main .ac-lcard")).toHaveCount(eth.unidades.length);
  await noOverflow(page, "red ethereum");
  const art = datos.unidades.find((u) => u.id === eth.unidades[0]);
  await page.goto(art.u);
  await expect(page.locator(`.ac-redes-l a[href="${eth.u}"]`)).toBeVisible();
  await page.locator(`.ac-redes-l a[href="${eth.u}"]`).click();
  await expect(page).toHaveURL(new RegExp(eth.u.replace(/\//g, "\\/") + "$"));
  expect(errors).toEqual([]);
});
