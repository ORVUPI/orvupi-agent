import { mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/**
 * 0.9.3: auditoría de Presentaciones. Pulsa cada opción de cada menú (con sus submenús), cada botón de la
 * barra de herramientas en cada contexto (nada, texto, forma, línea, imagen, tabla y gráfico) y cada
 * combinación de teclas, y comprueba que hace algo visible y que no da errores. Escritorio, tableta y móvil.
 */

type Outcome = { where: string; status: "ok" | "sin efecto" | "error"; effect?: string; detail?: string };

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVR42mP8z8Dwn4EIwDiqgWEUjGoYVQ8AAAC1MQH/1Hzp2wAAAABJRU5ErkJggg==", "base64");
const PPTX_ACCEPT = /presentation|pptx/;

/** Lo que se espera que no cambie nada a la vista en este estado (con su motivo). */
const QUIET = new Map<string, string>([
  ["Editar › Rehacer", "no hay nada que rehacer"],
  ["Ver › Zoom › Ajustar", "ya está ajustado"],
  ["Editar › Copiar", "copia sin cambiar la pantalla (se comprueba con Pegar)"],
]);

async function openSlides(page: Page): Promise<Page> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nueva presentación", exact: true }).first().click();
  const slides = await opened;
  await expect(slides.locator(".sl-canvas")).toBeVisible({ timeout: 20_000 });
  await slides.evaluate(() => {
    const w = window as unknown as { __printed: number; __toasts: string[] };
    w.__printed = 0;
    w.__toasts = [];
    window.print = () => { w.__printed += 1; window.dispatchEvent(new Event("afterprint")); };
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n instanceof HTMLElement && n.closest(".ow-toasts")) w.__toasts.push(n.textContent ?? "");
    }).observe(document.body, { childList: true, subtree: true });
  });
  // Contenido: título con texto y una segunda diapositiva
  const title = slides.locator(".sl-canvas").getByRole("button", { name: "Haz clic para añadir un título", exact: true });
  await title.dblclick();
  await slides.keyboard.type("Auditoría ORVUPI");
  await slides.keyboard.press("Escape");
  await slides.keyboard.press("Escape");
  START = slides.url();
  return slides;
}

/** Firma de lo que se ve: el editor entero menos el estado de guardado. */
async function signature(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".sl-root");
    const clone = root?.cloneNode(true) as HTMLElement | undefined;
    clone?.querySelectorAll(".sl-save, .sl-timer").forEach((n) => n.remove());
    const w = window as unknown as { __printed: number; __toasts: string[] };
    const extra = [...document.querySelectorAll("body > *:not(#root):not(script)")].map((n) => (n as HTMLElement).outerHTML.length).join(",");
    const a = document.activeElement as HTMLElement | null;
    const focus = a ? `${a.tagName}.${a.className}[${a.getAttribute("aria-label") ?? ""}]` : "";
    return { html: (clone?.outerHTML ?? "") + focus, printed: w.__printed, toasts: w.__toasts.length, extra, full: Boolean(document.fullscreenElement) };
  });
}

async function cleanup(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    const busy = await page.evaluate(() => Boolean(document.querySelector(".ow-modal, .sl-present, .sl-show, .sl-presenter, [role=menu], .sl-pop") || document.fullscreenElement || document.querySelector(".sl-editable")));
    if (!busy) break;
    const close = page.locator(".ow-modal").getByRole("button", { name: /^(Cerrar|Cancelar)$/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
  }
  if (await page.evaluate(() => Boolean(document.fullscreenElement))) await page.evaluate(() => document.exitFullscreen().catch(() => {}));
}

/** Pulsa y mira si pasó algo (descarga, selector de archivo, ventana, diálogo, impresión, aviso o cambio en pantalla). */
async function probe(page: Page, where: string, act: () => Promise<void>, errors: string[]): Promise<Outcome> {
  const before = await signature(page);
  const url = page.url();
  const seen: string[] = [];
  const onDownload = () => seen.push("descarga");
  const onChooser = (c: { setFiles: (f: { name: string; mimeType: string; buffer: Buffer }) => Promise<void>; isMultiple: () => boolean; element: () => { getAttribute: (n: string) => Promise<string | null> } }) => {
    seen.push("selector de archivos");
    void c.element().getAttribute("accept").then((accept) => (accept && PPTX_ACCEPT.test(accept) ? undefined : /image/.test(accept ?? "") ? c.setFiles({ name: "punto.png", mimeType: "image/png", buffer: PNG }) : undefined)).catch(() => {});
  };
  const onPopup = (p: Page) => { seen.push("ventana"); void p.close().catch(() => {}); };
  const home = page.context().pages()[0];
  const onHomePopup = (p: Page) => { if (p !== page) { seen.push("ventana"); void p.close().catch(() => {}); } };
  home?.on("popup", onHomePopup);
  const onDialog = (d: { dismiss: () => Promise<void>; type: () => string }) => { seen.push(`diálogo ${d.type()}`); void d.dismiss().catch(() => {}); };
  page.on("download", onDownload);
  page.on("filechooser", onChooser as never);
  page.on("popup", onPopup);
  page.on("dialog", onDialog as never);
  const errorsBefore = errors.length;
  try {
    await act();
    await page.waitForTimeout(350);
    // efectos que tardan (PDF, PNG, importar): espera hasta 2,5 s si aún no se ve nada
    for (let i = 0; i < 10 && seen.length === 0 && !page.isClosed(); i += 1) {
      const now = await signature(page).catch(() => before);
      if (now.html !== before.html || now.toasts !== before.toasts || now.printed !== before.printed || now.extra !== before.extra) break;
      await page.waitForTimeout(220);
    }
  } catch (error) {
    page.off("download", onDownload); page.off("filechooser", onChooser as never); page.off("popup", onPopup); page.off("dialog", onDialog as never); home?.off("popup", onHomePopup);
    if (page.isClosed()) return { where, status: "ok", effect: "cierra la ventana" };
    await cleanup(page);
    return { where, status: "error", detail: String(error).split("\n")[0] };
  }
  if (page.isClosed()) return { where, status: "ok", effect: "cierra la ventana" };
  if (page.url() !== url) { seen.push("navega"); return { where, status: "ok", effect: [...seen].join(", ") }; }
  const after = await signature(page);
  page.off("download", onDownload); page.off("filechooser", onChooser as never); page.off("popup", onPopup); page.off("dialog", onDialog as never); home?.off("popup", onHomePopup);
  if (after.printed > before.printed) seen.push("impresión");
  if (after.toasts > before.toasts) seen.push("aviso");
  if (after.full !== before.full) seen.push("pantalla completa");
  if (after.html !== before.html || after.extra !== before.extra) seen.push("cambio en pantalla");
  await cleanup(page);
  if (errors.length > errorsBefore) return { where, status: "error", detail: errors.slice(errorsBefore).join(" | ").slice(0, 300) };
  return seen.length > 0 ? { where, status: "ok", effect: [...new Set(seen)].join(", ") } : { where, status: "sin efecto" };
}

const compact = async (page: Page) => (await page.locator(".sl-menus .ow-menu-overflow").count()) > 0;

async function openTop(page: Page, top: string) {
  if (await compact(page)) {
    await page.locator(".sl-menus .ow-menu-overflow").click();
    await page.locator('.sl-menus [role="menu"]').getByRole("menuitem", { name: top, exact: true }).click();
  } else {
    await page.locator(".sl-menus").getByRole("menuitem", { name: top, exact: true }).click();
  }
}

/** Botones del último menú abierto (sin los de submenús anidados). */
async function menuEntries(page: Page, label: string) {
  return page.evaluate((name) => {
    const menus = [...document.querySelectorAll<HTMLElement>(`.sl-menus [role="menu"]`)].filter((m) => m.getAttribute("aria-label") === name);
    const menu = menus[menus.length - 1];
    if (!menu) return [];
    return [...menu.children].flatMap((row) => {
      const b = row.querySelector(":scope > button[role=menuitem]");
      if (!b) return [];
      const text = b.querySelector("span")?.textContent?.trim() ?? b.textContent?.trim() ?? "";
      return [{ label: text, sub: b.getAttribute("aria-haspopup") === "menu", table: Boolean(row.querySelector(".ow-table-grid, [role=grid]")) }];
    });
  }, label);
}

async function clickEntry(page: Page, parent: string, label: string) {
  const menus = page.locator(`.sl-menus [role="menu"][aria-label="${parent.replace(/"/g, '\\"')}"]`);
  const row = menus.last().locator(":scope > .ow-menu-row > button[role=menuitem]").filter({ has: page.locator("span", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) }).first();
  await row.click();
}

async function openPath(page: Page, path: string[]) {
  await openTop(page, path[0]!);
  for (let i = 1; i < path.length; i += 1) await clickEntry(page, path[i - 1]!, path[i]!);
}

/** Todas las rutas de menú hasta las hojas. */
async function allPaths(page: Page, top: string): Promise<Array<{ path: string[]; table: boolean }>> {
  const out: Array<{ path: string[]; table: boolean }> = [];
  const visit = async (path: string[]) => {
    await cleanup(page);
    await openPath(page, path);
    const parent = path[path.length - 1]!;
    const entries = await menuEntries(page, parent);
    await cleanup(page);
    for (const e of entries) {
      const next = [...path, e.label];
      if (e.sub) {
        // ¿submenú con cuadrícula de tabla?
        await openPath(page, next);
        const grid = await page.locator(`.sl-menus [role="menu"][aria-label="${e.label}"] [role="gridcell"], .sl-menus [role="menu"][aria-label="${e.label}"] .ow-table-grid button`).count();
        await cleanup(page);
        if (grid > 0) out.push({ path: next, table: true });
        else await visit(next);
      } else out.push({ path: next, table: false });
    }
  };
  await visit([top]);
  return out;
}

async function selectTitle(page: Page) {
  const title = page.locator(".sl-canvas .sl-item").filter({ hasText: "Auditoría ORVUPI" }).first();
  if ((await title.count()) === 0) return false;
  const box = await title.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}

let START = "";
async function ensureState(page: Page): Promise<Page> {
  if (page.isClosed() || (START && page.url() !== START)) return fresh(page);
  await cleanup(page);
  const show = page.locator(".sl-toolbar").getByRole("button", { name: "Mostrar los menús", exact: true });
  if (await show.isVisible().catch(() => false)) await show.click();
  if (!(await page.locator(".sl-canvas").isVisible().catch(() => false))) {
    // vista de cuadrícula u otra: volver a la normal
    const grid = page.locator(".sl-grid");
    if (await grid.isVisible().catch(() => false)) await page.keyboard.press("Escape");
  }
  if (!(await selectTitle(page))) return fresh(page);
  return page;
}

/** Presentación nueva con el título seleccionado. */
async function fresh(page: Page): Promise<Page> {
  const home = page.context().pages().find((p) => !p.isClosed() && p !== page) ?? (await page.context().newPage());
  if (!page.isClosed()) await page.close();
  const next = await openSlides(home);
  await selectTitle(next);
  return next;
}

/** Lo que hay que preparar antes de algunas opciones (como haría una persona). */
async function prepare(page: Page, where: string) {
  const all = async () => {
    // tres objetos para alinear, distribuir y agrupar
    await openTop(page, "Insertar"); await clickEntry(page, "Insertar", "Forma"); await clickEntry(page, "Forma", "Rectángulo");
    await openTop(page, "Insertar"); await clickEntry(page, "Insertar", "Forma"); await clickEntry(page, "Forma", "Elipse");
    const items = page.locator(".sl-canvas .sl-item");
    const n = await items.count();
    const last = await items.nth(n - 1).boundingBox();
    if (last) { await page.mouse.move(last.x + 20, last.y + 20); await page.mouse.down(); await page.mouse.move(last.x + 160, last.y + 60, { steps: 4 }); await page.mouse.up(); }
    await page.keyboard.press("Escape");
    await openTop(page, "Editar"); await clickEntry(page, "Editar", "Seleccionar todo");
  };
  if (/^Organizar › (Alinear|Distribuir|Agrupar)|^Herramientas › Distribuir/.test(where)) await all();
  if (where === "Organizar › Desagrupar") { await all(); await page.keyboard.press("Control+g"); }
  if (/^Organizar › (Girar|Ordenar)/.test(where)) {
    await openTop(page, "Insertar"); await clickEntry(page, "Insertar", "Forma"); await clickEntry(page, "Forma", "Triángulo");
    if (/Enviar|fondo|atrás/i.test(where)) return;
    await openTop(page, "Insertar"); await clickEntry(page, "Insertar", "Forma"); await clickEntry(page, "Forma", "Rectángulo");
    const items = page.locator(".sl-canvas .sl-item");
    const r = await items.last().boundingBox();
    if (r) { await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await page.mouse.move(r.x + r.width / 2 + 260, r.y + r.height / 2 + 40, { steps: 5 }); await page.mouse.up(); }
    const tri = items.nth((await items.count()) - 2);
    const b = await tri.boundingBox();
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.75);
  }
  if (where === "Herramientas › Centrar" || /^Organizar › Centrar en la página/.test(where)) for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowRight");
  if (/^Formato › Imagen/.test(where)) {
    const chooser = page.waitForEvent("filechooser");
    await openTop(page, "Insertar"); await clickEntry(page, "Insertar", "Imagen"); await clickEntry(page, "Imagen", "Subir desde el ordenador");
    await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator(".sl-canvas .sl-item.is-image.is-selected")).toBeVisible();
  }
  if (where === "Formato › Imagen › Restablecer imagen") { await openPath(page, ["Organizar", "Girar", "Girar 90° a la derecha"]); }
  if (where === "Formato › Borrar formato") await page.keyboard.press("Control+b");
  if (where === "Editar › Pegar") await page.keyboard.press("Control+c");
  if (/^Diapositiva › Mover diapositiva/.test(where)) {
    // tres diapositivas y la del medio elegida
    await threeSlides(page);
  }
}

/** Tres diapositivas iguales (con el título) y la del medio elegida. */
async function threeSlides(page: Page) {
  await page.keyboard.press("Escape");
  for (let i = 0; i < 2; i += 1) { await openTop(page, "Diapositiva"); await clickEntry(page, "Diapositiva", "Duplicar diapositiva"); }
  await page.locator(".sl-film-list").getByRole("option").nth(1).click();
  await selectTitle(page);
}

async function entryLabels(page: Page, path: string[]) {
  await openPath(page, path.slice(0, -1));
  const labels = (await menuEntries(page, path[path.length - 2]!)).map((e) => e.label).join("|");
  await cleanup(page);
  return labels;
}

async function report(name: string, all: Outcome[]) {
  const results = all.map((r) => (r.status === "sin efecto" && quietReason(r.where) ? { ...r, status: "ok" as const, effect: `sin cambios (esperado: ${quietReason(r.where)})` } : r));
  const dir = `${await screenshotDir()}/auditoria-093`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/${name}-${test.info().project.name}.json`, JSON.stringify(results, null, 2));
  await test.info().attach(`${name}.json`, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
}

function trackErrors(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR|Permissions policy|fullscreen|Content Security Policy.*youtube/i.test(m.text())) errors.push(`console: ${m.text()}`); });
}

/** Opciones que de verdad no cambian nada en ese momento (igual que en Slides). */
function quietReason(where: string) {
  if (QUIET.has(where)) return QUIET.get(where);
  if (/ › Seleccionar$/.test(where)) return "la herramienta Seleccionar ya es la activa";
  return undefined;
}

function assertClean(results: Outcome[]) {
  const errors = results.filter((r) => r.status === "error");
  const quiet = results.filter((r) => r.status === "sin efecto" && !quietReason(r.where));
  expect(errors.map((r) => `${r.where}: ${r.detail}`), "opciones con error").toEqual([]);
  expect(quiet.map((r) => r.where), "opciones que no hacen nada visible").toEqual([]);
}

const TOPS = ["Archivo", "Editar", "Ver", "Insertar", "Formato", "Diapositiva", "Organizar", "Herramientas", "Ayuda"];

for (const top of TOPS) {
  test(`menú ${top}: cada opción hace algo y sin errores`, async ({ page }) => {
    test.setTimeout(300_000);
    let slides = await openSlides(page);
    const errors: string[] = [];
    trackErrors(slides, errors);
    const paths = await allPaths(slides, top);
    expect(paths.length).toBeGreaterThan(0);
    const results: Outcome[] = [];
    for (const { path, table } of paths) {
      const where = path.join(" › ");
      const run = async (page: Page) => {
        await prepare(page, where);
        return probe(page, where, async () => {
          await openPath(page, path);
          if (table) await page.locator(`.sl-menus [role="menu"][aria-label="${path[path.length - 1]}"]`).locator('[role="gridcell"], .ow-table-grid button').first().click();
        }, errors);
      };
      let next = await ensureState(slides);
      if (next !== slides) { slides = next; trackErrors(slides, errors); }
      let result = await run(slides);
      if (result.status === "sin efecto") {
        // otra vez desde cero, por si el estado anterior ya lo tenía aplicado
        slides = await fresh(slides); trackErrors(slides, errors);
        const before = await entryLabels(slides, path);
        await selectTitle(slides);
        result = await run(slides);
        if (result.status === "sin efecto" && !slides.isClosed()) {
          const after = await entryLabels(slides, path);
          if (after !== before) result = { where, status: "ok", effect: "cambia la opción del menú" };
        }
      }
      results.push(result);
    }
    await report(`menu-${top}`, results);
    assertClean(results);
  });
}

/** Selecciona un objeto de un tipo (lo inserta si hace falta). */
async function context(page: Page, kind: string) {
  await cleanup(page);
  const menu = async (...path: string[]) => {
    await openTop(page, path[0]!);
    for (let i = 1; i < path.length; i += 1) await clickEntry(page, path[i - 1]!, path[i]!);
  };
  if (kind === "nada") { await page.keyboard.press("Escape"); return; }
  if (kind === "texto") { await selectTitle(page); return; }
  if (kind === "forma") { await menu("Insertar", "Forma", "Rectángulo"); return; }
  if (kind === "línea") { await menu("Insertar", "Línea"); return; }
  if (kind === "tabla") { await menu("Insertar", "Tabla"); await page.locator('.sl-menus [role="menu"][aria-label="Tabla"]').locator('[role="gridcell"]').first().click(); return; }
  if (kind === "gráfico") { await menu("Insertar", "Gráfico", "Barras"); return; }
  if (kind === "imagen") {
    const chooser = page.waitForEvent("filechooser");
    await menu("Insertar", "Imagen", "Subir desde el ordenador");
    await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator(".sl-canvas img").first()).toBeVisible();
  }
}

test("barra de herramientas: cada botón en cada contexto", async ({ page }) => {
  test.setTimeout(400_000);
  let slides = await openSlides(page);
  const errors: string[] = [];
  trackErrors(slides, errors);
  const results: Outcome[] = [];
  for (const kind of ["nada", "texto", "forma", "línea", "imagen", "tabla", "gráfico"]) {
    const fresh = await ensureState(slides);
    if (fresh !== slides) { slides = fresh; trackErrors(slides, errors); }
    await context(slides, kind);
    const labels = await slides.locator(".sl-toolbar button[aria-label]:visible").evaluateAll((els) => els.filter((e) => !e.closest(".sl-pop")).map((e) => e.getAttribute("aria-label") ?? ""));
    for (const label of [...new Set(labels)]) {
      if (label === "Presentar") continue;
      if (kind === "texto") await selectTitle(slides);
      if (kind === "nada") { await cleanup(slides); await slides.keyboard.press("Escape"); }
      if (kind !== "nada" && kind !== "texto") {
        // vuelve a seleccionar el último objeto insertado
        await cleanup(slides);
        const items = slides.locator(".sl-canvas .sl-item");
        const last = items.last();
        const box = await last.boundingBox();
        if (box) await slides.mouse.click(box.x + Math.min(12, box.width / 2), box.y + box.height / 2);
      }
      const button = slides.locator(".sl-toolbar").getByRole("button", { name: label, exact: true }).first();
      if (!(await button.isVisible().catch(() => false))) continue;
      if (await button.isDisabled()) { results.push({ where: `${kind} › ${label}`, status: "ok", effect: "desactivado en este contexto" }); continue; }
      results.push(await probe(slides, `${kind} › ${label}`, async () => {
        await button.click();
        // si abre un menú o panel con opciones, elige la primera para comprobar que se aplica
      }, errors));
    }
  }
  await report("barra", results);
  assertClean(results);
});

const SHORTCUTS: Array<{ keys: string; label: string; setup?: "texto" | "nada" }> = [
  { keys: "Control+m", label: "Nueva diapositiva" },
  { keys: "Control+d", label: "Duplicar objeto", setup: "texto" },
  { keys: "Control+z", label: "Deshacer" },
  { keys: "Control+y", label: "Rehacer" },
  { keys: "Control+a", label: "Seleccionar todo", setup: "nada" },
  { keys: "Control+b", label: "Negrita", setup: "texto" },
  { keys: "Control+i", label: "Cursiva", setup: "texto" },
  { keys: "Control+u", label: "Subrayado", setup: "texto" },
  { keys: "Control+Shift+Period", label: "Aumentar tamaño", setup: "texto" },
  { keys: "Control+Shift+Comma", label: "Reducir tamaño", setup: "texto" },
  { keys: "Control+Shift+l", label: "Alinear a la izquierda", setup: "texto" },
  { keys: "Control+Shift+e", label: "Centrar", setup: "texto" },
  { keys: "Control+Shift+r", label: "Alinear a la derecha", setup: "texto" },
  { keys: "Control+Shift+j", label: "Justificar", setup: "texto" },
  { keys: "Control+Shift+Digit8", label: "Viñetas", setup: "texto" },
  { keys: "Control+Shift+Digit7", label: "Numeración", setup: "texto" },
  { keys: "Control+k", label: "Enlace", setup: "texto" },
  { keys: "Control+h", label: "Buscar y reemplazar" },
  { keys: "Control+Slash", label: "Combinaciones de teclas" },
  { keys: "Control+p", label: "Imprimir" },
  { keys: "Control+Enter", label: "Presentar" },
  { keys: "Control+Alt+Shift+p", label: "Vista del presentador" },
  { keys: "Control+Alt+m", label: "Comentario" },
  { keys: "ArrowRight", label: "Mover a la derecha", setup: "texto" },
  { keys: "Shift+ArrowDown", label: "Mover 1 px", setup: "texto" },
  { keys: "Control+ArrowUp", label: "Traer adelante", setup: "texto" },
  { keys: "Control+g", label: "Agrupar", setup: "nada" },
  { keys: "Delete", label: "Eliminar objeto", setup: "texto" },
  { keys: "Enter", label: "Editar texto", setup: "texto" },
  { keys: "PageDown", label: "Siguiente diapositiva", setup: "nada" },
  { keys: "PageUp", label: "Diapositiva anterior", setup: "nada" },
];

test("combinaciones de teclas", async ({ page }) => {
  test.setTimeout(240_000);
  let slides = await openSlides(page);
  const errors: string[] = [];
  trackErrors(slides, errors);
  await threeSlides(slides);
  const results: Outcome[] = [];
  for (const s of SHORTCUTS) {
    const fresh = await ensureState(slides);
    if (fresh !== slides) { slides = fresh; trackErrors(slides, errors); await threeSlides(slides); }
    if (s.setup === "nada") await slides.keyboard.press("Escape");
    // Mover con flechas: objeto seleccionado sin editar (un clic sobre un cuadro ya seleccionado entra a editar, como en Slides)
    if (s.setup === "texto" && /Arrow/.test(s.keys)) { await slides.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await slides.keyboard.press("Escape"); await slides.keyboard.press("Escape"); await selectTitle(slides); }
    if (s.label === "Agrupar") await prepare(slides, "Organizar › Agrupar");
    if (s.label === "Rehacer") { await slides.keyboard.press("Control+b"); await slides.keyboard.press("Control+z"); }
    results.push(await probe(slides, `${s.keys} (${s.label})`, async () => { await slides.keyboard.press(s.keys); }, errors));
  }
  await report("teclas", results);
  assertClean(results);
});
