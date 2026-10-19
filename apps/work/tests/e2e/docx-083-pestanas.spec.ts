import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import JSZip from "jszip";
import { screenshotDir } from "./shots";

/** 0.8.3: pestañas del documento como Google Docs (escritorio y móvil, 3 navegadores). */

const narrowProject = () => !test.info().project.name.endsWith("-desk");
const shot = async (page: Page, name: string) =>
  page.screenshot({ path: join(await screenshotDir(), `083-pestanas-${name}-${test.info().project.name}.png`) });

async function openFileMenu(doc: Page) {
  const more = doc.getByRole("menuitem", { name: "Menús" });
  if (await more.isVisible().catch(() => false)) await more.click();
  await doc.getByRole("menuitem", { name: "Archivo", exact: true }).filter({ visible: true }).first().click();
}

async function newDoc(page: Page): Promise<Page> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await expect(doc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  return doc;
}

async function focusEditor(doc: Page) {
  const scrim = doc.locator(".ow-tabs-scrim");
  if (await scrim.isVisible().catch(() => false)) {
    const box = (await scrim.boundingBox())!;
    await scrim.click({ position: { x: box.width - 12, y: box.height / 2 }, timeout: 5000 });
    await expect(scrim).toBeHidden();
  }
  await doc.locator(".ProseMirror").click();
}

async function openPanel(doc: Page) {
  const panel = doc.locator(".ow-docs-tabs");
  if (!(await panel.isVisible())) await doc.getByRole("button", { name: "Mostrar pestañas y esquemas" }).click();
  await expect(panel).toBeVisible();
  return panel;
}

const row = (doc: Page, name: string): Locator => doc.locator(".ow-docs-tab").filter({ has: doc.locator(".ow-tab-title", { hasText: new RegExp(`^${name}$`) }) });

async function menuOf(doc: Page, name: string) {
  const r = row(doc, name);
  await r.hover().catch(() => undefined);
  await r.getByRole("button", { name: `Opciones de la pestaña ${name}` }).click();
  const menu = doc.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

async function titles(doc: Page) {
  return doc.locator(".ow-docs-tab").evaluateAll((rows) => rows.map((r) => `${Math.round(parseFloat((r as HTMLElement).style.marginLeft || "0") / 16)}:${r.querySelector(".ow-tab-title")?.textContent ?? ""}`));
}

test("pestañas: crear, subpestañas, menú, renombrar, emoji, mover, duplicar, eliminar/deshacer, esquema, enlace, guardar y exportar", async ({ page, context, browserName }) => {
  test.setTimeout(240_000);
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  const doc = await newDoc(page);
  doc.on("dialog", (dialog) => void dialog.accept());
  const editor = doc.locator(".ProseMirror");
  await focusEditor(doc);
  await doc.keyboard.type("Texto de la primera");
  let panel = await openPanel(doc);
  await expect(panel.getByText("Los títulos que añadas al documento aparecerán aquí")).toBeVisible();
  await expect(panel.locator(".ow-docs-tab.is-active .ow-tab-title")).toHaveText("Pestaña 1");

  // + Añadir pestaña: crea «Pestaña 2» y la selecciona con contenido propio
  const add = panel.getByRole("button", { name: "Añadir pestaña" });
  await expect(add).toHaveAttribute("title", "Añadir pestaña");
  await add.click();
  panel = await openPanel(doc);
  await expect(panel.locator(".ow-docs-tab.is-active .ow-tab-title")).toHaveText("Pestaña 2");
  await expect(editor).not.toContainText("Texto de la primera");
  await focusEditor(doc);
  await doc.keyboard.type("Contenido dos");
  // Esquema de títulos bajo la pestaña activa
  await doc.keyboard.press("Enter");
  await doc.keyboard.type("Apartado A");
  await doc.keyboard.press("ControlOrMeta+Alt+1");
  panel = await openPanel(doc);
  await expect(panel.locator(".ow-docs-outline")).toContainText("Apartado A");

  // Menú ⋮: mismo orden y etiquetas que Google Docs
  let menu = await menuOf(doc, "Pestaña 2");
  await expect(menu.getByRole("menuitem")).toHaveText(["Añadir subpestaña", "Eliminar", "Duplicar", "Cambiar nombre", "Seleccionar emoji›", "Copiar enlace", "Ocultar esquema", "Mover hacia arriba", "Mover a›"]);
  await shot(doc, "menu");
  await menu.getByRole("menuitem", { name: "Añadir subpestaña" }).click();
  panel = await openPanel(doc);
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "0:Pestaña 2", "1:Pestaña 3"]);
  await expect(panel.locator(".ow-docs-tab.is-active .ow-tab-title")).toHaveText("Pestaña 3");
  await focusEditor(doc);
  await doc.keyboard.type("Sub tres");
  await openPanel(doc);

  // Cambiar nombre: Esc cancela, Enter confirma
  menu = await menuOf(doc, "Pestaña 3");
  await menu.getByRole("menuitem", { name: "Cambiar nombre" }).click();
  await doc.getByRole("textbox", { name: "Cambiar nombre" }).fill("No vale");
  await doc.keyboard.press("Escape");
  await expect(row(doc, "Pestaña 3")).toBeVisible();
  menu = await menuOf(doc, "Pestaña 3");
  await menu.getByRole("menuitem", { name: "Cambiar nombre" }).click();
  await doc.getByRole("textbox", { name: "Cambiar nombre" }).fill("Anexo");
  await doc.keyboard.press("Enter");
  await expect(row(doc, "Anexo")).toBeVisible();

  // Emoji: sustituye al icono
  menu = await menuOf(doc, "Anexo");
  await menu.getByRole("menuitem", { name: "Seleccionar emoji" }).click();
  await doc.getByRole("menuitem", { name: "🚀" }).click();
  await expect(row(doc, "Anexo").locator(".ow-tab-icon")).toHaveText("🚀");

  // Contraer / expandir grupo
  await row(doc, "Pestaña 2").getByRole("button", { name: "Contraer grupo" }).click();
  await expect(row(doc, "Anexo")).toHaveCount(0);
  await row(doc, "Pestaña 2").getByRole("button", { name: "Expandir grupo" }).click();
  await expect(row(doc, "Anexo")).toBeVisible();

  // Mover a → Sacar del grupo; luego Mover a → Pestaña 1
  menu = await menuOf(doc, "Anexo");
  await menu.getByRole("menuitem", { name: "Mover a" }).click();
  await doc.getByRole("menuitem", { name: "Sacar del grupo" }).click();
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "0:Pestaña 2", "0:Anexo"]);
  menu = await menuOf(doc, "Anexo");
  await menu.getByRole("menuitem", { name: "Mover a" }).click();
  await doc.getByRole("menuitem", { name: "Pestaña 1" }).click();
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "1:Anexo", "0:Pestaña 2"]);
  // Mover hacia abajo / arriba (solo si procede)
  menu = await menuOf(doc, "Pestaña 1");
  await expect(menu.getByRole("menuitem", { name: "Mover hacia arriba" })).toHaveCount(0);
  await menu.getByRole("menuitem", { name: "Mover hacia abajo" }).click();
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 2", "0:Pestaña 1", "1:Anexo"]);
  menu = await menuOf(doc, "Pestaña 1");
  await expect(menu.getByRole("menuitem", { name: "Mover hacia abajo" })).toHaveCount(0);
  await menu.getByRole("menuitem", { name: "Mover hacia arriba" }).click();
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "1:Anexo", "0:Pestaña 2"]);

  // Duplicar y eliminar con confirmación + deshacer
  menu = await menuOf(doc, "Pestaña 2");
  await menu.getByRole("menuitem", { name: "Duplicar" }).click();
  await openPanel(doc);
  await expect(row(doc, "Copia de Pestaña 2")).toBeVisible();
  await expect(editor).toContainText("Contenido dos");
  await openPanel(doc);
  menu = await menuOf(doc, "Copia de Pestaña 2");
  await menu.getByRole("menuitem", { name: "Eliminar" }).click();
  await expect(doc.getByRole("dialog")).toContainText("¿Eliminar la pestaña?");
  await doc.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
  panel = await openPanel(doc);
  await expect(row(doc, "Copia de Pestaña 2")).toHaveCount(0);
  await panel.getByRole("button", { name: "Deshacer" }).click();
  await openPanel(doc);
  await expect(row(doc, "Copia de Pestaña 2")).toBeVisible();
  menu = await menuOf(doc, "Copia de Pestaña 2");
  await menu.getByRole("menuitem", { name: "Eliminar" }).click();
  await doc.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
  await openPanel(doc);

  // Ocultar esquema
  panel = await openPanel(doc);
  await row(doc, "Pestaña 2").locator(".ow-tab-main").click();
  panel = await openPanel(doc);
  panel = doc.locator(".ow-docs-tabs");
  menu = await menuOf(doc, "Pestaña 2");
  await menu.getByRole("menuitem", { name: "Ocultar esquema" }).click();
  await expect(panel.locator(".ow-docs-outline")).toHaveCount(0);
  menu = await menuOf(doc, "Pestaña 2");
  await menu.getByRole("menuitem", { name: "Mostrar esquema" }).click();
  await expect(panel.locator(".ow-docs-outline")).toContainText("Apartado A");

  // Clic derecho abre el mismo menú (escritorio)
  if (!narrowProject()) {
    await row(doc, "Pestaña 1").click({ button: "right" });
    await expect(doc.getByRole("menu").getByRole("menuitem").first()).toHaveText("Añadir subpestaña");
    await doc.keyboard.press("Escape");
    await expect(doc.getByRole("menu")).toHaveCount(0);
  }

  // Copiar enlace → #tab=id que abre esa pestaña
  menu = await menuOf(doc, "Anexo");
  await menu.getByRole("menuitem", { name: "Copiar enlace" }).click();
  const anexoId = await doc.locator(".ow-tabnode").filter({ has: row(doc, "Anexo") }).getAttribute("data-tab-id");
  expect(anexoId).toBeTruthy();
  await shot(doc, "panel");

  // Se guarda: recargar abre la pestaña del enlace con su contenido
  await doc.waitForTimeout(1800);
  const url = new URL(doc.url());
  url.hash = `tab=${anexoId}`;
  await doc.goto(url.toString());
  await doc.reload();
  await expect(doc.locator(".ProseMirror")).toContainText("Sub tres", { timeout: 20_000 });
  panel = await openPanel(doc);
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "1:Anexo", "0:Pestaña 2"]);
  await expect(panel.locator(".ow-docs-tab.is-active .ow-tab-title")).toHaveText("Anexo");
  await row(doc, "Pestaña 1").locator(".ow-tab-main").click();
  await expect(doc.locator(".ProseMirror")).toContainText("Texto de la primera");
  if (narrowProject()) await expect(doc.locator(".ow-docs-tabs")).toBeHidden();

  // Exportar DOCX: cada pestaña como sección con salto de página y título
  const download = doc.waitForEvent("download");
  await openFileMenu(doc);
  await doc.getByRole("menuitem", { name: /^(Exportar|Descargar)/ }).filter({ visible: true }).first().click();
  await doc.getByRole("menuitem", { name: /DOCX/ }).filter({ visible: true }).first().click();
  const file = await (await download).path();
  const xml = await (await JSZip.loadAsync(await readFile(file!))).file("word/document.xml")!.async("string");
  for (const text of ["Pestaña 1", "🚀 Anexo", "Pestaña 2", "Texto de la primera", "Sub tres", "Contenido dos"]) expect(xml).toContain(text);
  expect((xml.match(/w:type="page"/g) ?? []).length).toBeGreaterThanOrEqual(2);
});

test("pestañas: arrastrar y soltar con línea indicadora y anidado; teclado", async ({ page }) => {
  test.setTimeout(180_000);
  const doc = await newDoc(page);
  let panel = await openPanel(doc);
  for (let i = 0; i < 2; i += 1) {
    panel = await openPanel(doc);
    await panel.getByRole("button", { name: "Añadir pestaña" }).click();
    panel = await openPanel(doc);
  }
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 1", "0:Pestaña 2", "0:Pestaña 3"]);
  const touch = narrowProject() && Boolean(test.info().project.use.hasTouch);
  // Arrastrar «Pestaña 3» encima de «Pestaña 1»
  const from = (await row(doc, "Pestaña 3").locator(".ow-tab-title").boundingBox())!;
  const to = (await row(doc, "Pestaña 1").boundingBox())!;
  const drag = async (sx: number, sy: number, ex: number, ey: number, kind: "mouse" | "touch") => {
    await doc.evaluate(async ({ sx, sy, ex, ey, kind }) => {
      const target = document.elementFromPoint(sx, sy)!;
      const base = { bubbles: true, cancelable: true, pointerId: 7, pointerType: kind, isPrimary: true, button: 0, buttons: 1 };
      target.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: sx, clientY: sy }));
      if (kind === "touch") await new Promise((r) => setTimeout(r, 600));
      for (let i = 1; i <= 8; i += 1) {
        window.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: sx + ((ex - sx) * i) / 8, clientY: sy + ((ey - sy) * i) / 8 }));
        await new Promise((r) => setTimeout(r, 30));
      }
      await new Promise((r) => setTimeout(r, 50));
      const line = document.querySelector(".ow-tabdrop") !== null;
      window.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, clientX: ex, clientY: ey }));
      (window as unknown as { __line: boolean }).__line = line;
    }, { sx, sy, ex, ey, kind });
    expect(await doc.evaluate(() => (window as unknown as { __line: boolean }).__line)).toBe(true);
  };
  await drag(from.x + 10, from.y + from.height / 2, from.x + 10, to.y + 4, touch ? "touch" : "mouse");
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 3", "0:Pestaña 1", "0:Pestaña 2"]);
  // Arrastrar a la derecha anida bajo la de arriba
  const p2 = (await row(doc, "Pestaña 2").locator(".ow-tab-title").boundingBox())!;
  await drag(p2.x + 10, p2.y + p2.height / 2, p2.x + 60, p2.y + p2.height / 2 + 2, touch ? "touch" : "mouse");
  await expect.poll(() => titles(doc)).toEqual(["0:Pestaña 3", "0:Pestaña 1", "1:Pestaña 2"]);
  await shot(doc, "arrastre");

  // Teclado: flechas para moverse, Intro selecciona, Mayús+F10 abre el menú, F2 renombra
  await row(doc, "Pestaña 3").locator(".ow-tab-main").focus();
  await doc.keyboard.press("ArrowDown");
  await expect(row(doc, "Pestaña 1").locator(".ow-tab-main")).toBeFocused();
  await doc.keyboard.press("Enter");
  if (narrowProject()) await openPanel(doc);
  await expect(doc.locator(".ow-docs-tab.is-active .ow-tab-title")).toHaveText("Pestaña 1");
  await doc.locator(".ow-docs-tab.is-active .ow-tab-main").focus();
  await doc.keyboard.press("ArrowLeft");
  await expect(row(doc, "Pestaña 2")).toHaveCount(0);
  await doc.keyboard.press("ArrowRight");
  await expect(row(doc, "Pestaña 2")).toBeVisible();
  await doc.keyboard.press("Shift+F10");
  await expect(doc.getByRole("menuitem", { name: "Añadir subpestaña" })).toBeFocused();
  await doc.keyboard.press("ArrowDown");
  await doc.keyboard.press("ArrowDown");
  await expect(doc.getByRole("menuitem", { name: "Duplicar" })).toBeFocused();
  await doc.keyboard.press("Escape");
  await expect(row(doc, "Pestaña 1").locator(".ow-tab-main")).toBeFocused();
  await doc.keyboard.press("F2");
  await doc.keyboard.type("Intro");
  await doc.keyboard.press("Enter");
  await expect(row(doc, "Intro")).toBeVisible();
  if (narrowProject()) {
    // En móvil el panel es un cajón: al elegir pestaña se cierra
    await row(doc, "Pestaña 3").locator(".ow-tab-main").click();
    await expect(doc.locator(".ow-docs-tabs")).toBeHidden();
    await shot(doc, "movil-cerrado");
    await openPanel(doc);
    await shot(doc, "movil-cajon");
  }
});
