import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { screenshotDir } from "./shots";

function touchReady(info: TestInfo): boolean {
  return info.project.use.hasTouch === true && info.project.use.browserName !== "firefox";
}

async function press(info: TestInfo, locator: Locator) {
  if (touchReady(info)) await locator.tap();
  else await locator.click();
}

async function pick(doc: Page, info: TestInfo, menu: string, item: string) {
  if (await doc.locator(".ow-menubar.is-compact").count()) {
    await press(info, doc.getByRole("menuitem", { name: "Menús", exact: true }));
    await press(info, doc.getByRole("menuitem", { name: menu, exact: true }));
  } else {
    await press(info, doc.getByRole("menuitem", { name: menu, exact: true }));
  }
  const pattern = new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
  await press(info, doc.getByRole("menuitem", { name: pattern }));
}

async function placeCaret(doc: Page) {
  await doc.keyboard.press("End");
  await doc.keyboard.press("Escape");
}

async function checkAssets(page: Page) {
  const urls = await page.evaluate(() => {
    const found = new Set<string>();
    for (const node of document.querySelectorAll("a[href], img[src]")) {
      const raw = node instanceof HTMLAnchorElement ? node.href : node instanceof HTMLImageElement ? node.currentSrc || node.src : "";
      if (raw.startsWith("http://127.0.0.1:4174/") || raw.startsWith("http://127.0.0.1:4174")) found.add(raw);
    }
    return [...found];
  });
  for (const url of urls) {
    if (url.startsWith("data:")) continue;
    const response = await page.request.get(url);
    expect(response.status(), url).toBeLessThan(400);
  }
}

test.beforeAll(async () => {
  await screenshotDir();
});

test("Docs y Drive de la fase 1 hacen el trabajo y lo guardan", async ({ page }, info) => {
  const errors: string[] = [];
  const hear = (target: Page) => {
    target.on("pageerror", (error) => errors.push(`${error.message}`));
    target.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (text.includes("font-src") && text.includes("data:font")) return;
      errors.push(text);
    });
  };
  hear(page);
  await page.goto("/");
  const create = page.getByRole("button", { name: "Nuevo documento", exact: true });
  await expect(create).toBeVisible();
  await checkAssets(page);

  const opened = page.waitForEvent("popup");
  await press(info, create);
  const doc = await opened;
  hear(doc);
  await doc.waitForLoadState("domcontentloaded");
  const size = page.viewportSize();
  if (size) await doc.setViewportSize(size);
  expect(new URL(doc.url()).pathname).toMatch(/^\/document\/d\/[^/]+\/edit/);
  expect(doc.url()).not.toBe(page.url());

  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await editor.click();
  await doc.keyboard.type("Informe fase");
  await doc.keyboard.press("Enter");
  await doc.keyboard.type("alfa claveunica080 alfa");
  await doc.keyboard.press("Control+s");
  await expect(doc.locator(".ow-docs-save")).toHaveText(/Guardado/);

  const search = page.getByLabel("Buscar en este dispositivo");
  await search.fill("noexiste080xyz");
  await expect(page.getByRole("button", { name: /Informe fase/ })).toHaveCount(0);
  await search.fill("claveunica080");
  await expect(page.getByRole("button", { name: /Informe fase/ })).toBeVisible();

  await editor.locator("p").first().click();
  await pick(doc, info, "Formato", "Estilo");
  await press(info, doc.getByRole("menuitem", { name: "Título", exact: true }));
  await expect(editor.locator("h1")).toContainText("Informe");
  await doc.keyboard.press("End");
  await doc.keyboard.press("Enter");
  await pick(doc, info, "Insertar", "Índice");
  const toc = doc.locator("nav.ow-contents button").filter({ hasText: "Informe" });
  await expect(toc).toBeVisible();
  await press(info, toc);
  await doc.keyboard.type("Q");
  await expect(editor.locator("h1")).toContainText("Q");

  const outline = doc.locator(".ow-docs-outline button").filter({ hasText: "Informe" });
  if (await outline.isVisible()) {
    await press(info, outline);
    await doc.keyboard.type("W");
    await expect(editor.locator("h1")).toContainText("W");
  }

  await doc.keyboard.press("Control+f");
  const find = doc.locator(".ow-docs-find");
  await find.getByLabel("Buscar").fill("fase");
  await press(info, find.getByRole("button", { name: "Siguiente" }));
  await pick(doc, info, "Formato", "Subíndice");
  await expect(editor.locator("sub").filter({ hasText: "fase" })).toBeVisible();
  await pick(doc, info, "Formato", "Superíndice");
  await expect(editor.locator("sup:not(.ow-fn)").filter({ hasText: "fase" })).toBeVisible();
  await doc.keyboard.press("ArrowRight");

  await doc.keyboard.press("End");
  await pick(doc, info, "Insertar", "Nota al pie");
  await doc.getByLabel("Texto de la nota").fill("nota de pie 080");
  await press(info, doc.getByRole("button", { name: "Añadir nota" }));
  await expect(editor.locator("sup.ow-fn")).toHaveText("1");
  await expect(doc.locator("ol.ow-footnotes")).toContainText("nota de pie 080");

  await editor.click();
  await doc.keyboard.press("Control+End");
  await doc.keyboard.type(" uno dos uno");
  await doc.keyboard.press("Control+f");
  await find.getByLabel("Buscar").fill("uno");
  await press(info, find.getByRole("button", { name: "Siguiente" }));
  await press(info, find.getByRole("button", { name: "Siguiente" }));
  await press(info, find.getByRole("button", { name: "Anterior" }));
  await doc.keyboard.type("Z");
  await expect(editor).toContainText("Z dos uno");
  await expect(editor).not.toContainText("uno dos Z");

  await pick(doc, info, "Editar", "Seleccionar todo");
  const bold = doc.getByRole("button", { name: "Negrita" }).first();
  await press(info, bold);
  await expect(editor.locator("strong").filter({ hasText: "claveunica080" })).toBeVisible();
  await doc.keyboard.press("Control+z");

  await doc.keyboard.press("Control+f");
  await find.getByLabel("Buscar").fill("fase");
  await press(info, find.getByRole("button", { name: "Siguiente" }));
  await pick(doc, info, "Editar", "Copiar");
  const denied = doc.locator(".ow-clip");
  if (info.project.use.browserName === "chromium") {
    await expect(denied).toHaveCount(0);
    const copied = await doc.evaluate(async () => navigator.clipboard.readText());
    expect(copied).toBe("fase");
    await doc.evaluate(async () => {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob(["<strong>Rico080</strong>"], { type: "text/html" }),
          "text/plain": new Blob(["Rico080"], { type: "text/plain" }),
        }),
      ]);
    });
    await placeCaret(doc);
    await pick(doc, info, "Editar", "Pegar Ctrl+V");
    await expect(editor.locator("strong").filter({ hasText: "Rico080" })).toBeVisible();
    await placeCaret(doc);
    await pick(doc, info, "Editar", "Pegar sin formato");
    await expect(editor.locator("strong").filter({ hasText: "Rico080" })).toHaveCount(1);
    const plain = await editor.evaluate((node) => (node.textContent ?? "").split("Rico080").length - 1);
    expect(plain).toBeGreaterThan(1);
  } else {
    const blocked = await denied.isVisible();
    if (!blocked) {
      await placeCaret(doc);
      await pick(doc, info, "Editar", "Pegar Ctrl+V");
      await expect(editor).toContainText("fase");
    } else {
      await expect(denied).toContainText("portapapeles");
    }
  }

  await find.getByLabel("Buscar").fill("Z");
  await press(info, find.getByRole("button", { name: "Siguiente" }));
  await pick(doc, info, "Editar", "Cortar");
  if (info.project.use.browserName === "chromium") {
    await expect(denied).toHaveCount(0);
    await expect(editor).not.toContainText("Z dos uno");
  } else if (await denied.isVisible()) {
    await expect(denied).toContainText("portapapeles");
  } else {
    await expect(editor).not.toContainText("Z dos uno");
  }

  const copyWait = doc.waitForEvent("popup");
  await pick(doc, info, "Archivo", "Hacer una copia");
  const copy = await copyWait;
  hear(copy);
  expect(new URL(copy.url()).pathname).toMatch(/^\/document\/d\/[^/]+\/edit/);
  expect(copy.url()).not.toBe(doc.url());
  await expect(copy.locator(".ProseMirror")).toContainText("claveunica080");
  await checkAssets(doc);

  await find.getByRole("button", { name: "Cerrar búsqueda" }).click();
  const axe = await new AxeBuilder({ page: doc }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((item) => `${item.id} ${item.nodes[0]?.target.join(" ")}`)).toEqual([]);

  if (info.project.name.startsWith("fase-chromium-")) {
    const id = info.project.name.slice("fase-chromium-".length);
    await doc.screenshot({ path: `${await screenshotDir()}/080-${id}.png` });
  }
  expect(errors, errors.join("\n")).toEqual([]);
});
