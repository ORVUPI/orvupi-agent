import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";
const WORD = "Hdjdjdj";
const pixel = devices["Pixel 7"];
const ANDROID = {
  userAgent: pixel.userAgent,
  deviceScaleFactor: pixel.deviceScaleFactor,
  viewport: { width: 460, height: 900 },
  isMobile: true,
  hasTouch: true,
};

async function openDoc(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Nuevo documento", exact: true })).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.waitForLoadState("domcontentloaded");
  await expect(doc.locator(".ProseMirror")).toBeVisible();
  return doc;
}

async function setMark(doc: Page, name: string, on: boolean) {
  const button = doc.getByRole("button", { name, exact: true });
  await expect(button).toBeVisible();
  if ((await button.getAttribute("aria-pressed")) === "true" !== on) await button.click();
  await expect(button).toHaveAttribute("aria-pressed", on ? "true" : "false");
}

async function clearDoc(doc: Page) {
  const editor = doc.locator(".ProseMirror");
  await editor.click();
  await doc.keyboard.press("Control+a");
  await doc.keyboard.press("Backspace");
}

async function decoration(run: Locator) {
  return run.evaluate((element) => {
    const computed = getComputedStyle(element);
    const texts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) texts.push(node.textContent);
      node.childNodes.forEach(walk);
    };
    walk(element);
    return {
      font: computed.fontFamily,
      color: computed.color,
      line: computed.textDecorationLine,
      style: computed.textDecorationStyle,
      texts,
    };
  });
}

async function expectClean(doc: Page, word: string, selector: string, line: string) {
  const editor = doc.locator(".ProseMirror");
  const run = editor.locator(selector);
  await expect(run).toHaveCount(1);
  await expect(run).toHaveText(word);
  const style = await decoration(run);
  expect(style.font.toLowerCase()).not.toMatch(/monospace|consolas|menlo|monaco/);
  expect(style.color).toBe("rgb(16, 32, 50)");
  expect(style.line).toBe(line);
  expect(style.texts).toEqual([word]);
  await expect(editor.locator("code")).toHaveCount(0);
  await expect(editor.locator("a")).toHaveCount(0);
  if (line === "underline") expect(style.style).toBe("solid");
}

async function turnStrikeOn(doc: Page, phone: boolean) {
  if (!phone) {
    await setMark(doc, "Tachado", true);
    return;
  }
  await doc.locator(".ow-menu-overflow").click();
  await doc.getByRole("menuitem", { name: "Formato", exact: true }).click();
  await doc.getByRole("menuitem", { name: /^Tachado/ }).click();
}

async function checkMarks(doc: Page, phone: boolean) {
  const editor = doc.locator(".ProseMirror");
  await expect.poll(() => editor.evaluate((element) => element instanceof HTMLElement && element.spellcheck)).toBe(true);
  await clearDoc(doc);
  await setMark(doc, "Subrayado", true);
  await doc.keyboard.type(WORD);
  await expectClean(doc, WORD, ".ow-ul", "underline");
  await expect(doc.locator(".ow-count")).toContainText("1 palabra");
  await expect(doc.locator(".ow-count")).not.toContainText("palabras");

  await clearDoc(doc);
  await setMark(doc, "Subrayado", false);
  await setMark(doc, "Negrita", true);
  await setMark(doc, "Subrayado", true);
  await doc.keyboard.type(WORD);
  await expectClean(doc, WORD, ".ow-ul", "underline");
  await expect(editor.locator("strong")).toHaveCount(1);
  await expect(editor.locator("strong")).toHaveText(WORD);

  await clearDoc(doc);
  await setMark(doc, "Negrita", false);
  await setMark(doc, "Subrayado", false);
  await setMark(doc, "Cursiva", true);
  await doc.keyboard.type("Cursiva");
  await expectClean(doc, "Cursiva", "em", "none");

  await clearDoc(doc);
  await setMark(doc, "Cursiva", false);
  await turnStrikeOn(doc, phone);
  await doc.keyboard.type("Tachado");
  await expectClean(doc, "Tachado", "s", "line-through");
}

test("en el escritorio U subraya la palabra entera y no la pasa a monoespacio", async ({ page }) => {
  const doc = await openDoc(page);
  await checkMarks(doc, false);
  await expect(doc.getByRole("button", { name: "Ortografía", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test.describe("Chrome de Android", () => {
  test.use(ANDROID);

  test("en el teléfono U subraya la palabra entera, el contador va en singular y la hoja llena el alto", async ({ page }) => {
    await page.setViewportSize({ width: 460, height: 900 });
    const doc = await openDoc(page);
    await doc.setViewportSize({ width: 460, height: 900 });
    await checkMarks(doc, true);
    const text = await doc.locator(".ProseMirror p").boundingBox();
    const sheet = await doc.locator(".ow-docs-sheet").boundingBox();
    const dock = await doc.locator(".ow-format-dock").boundingBox();
    const weight = await doc.locator(".ow-count").evaluate((element) => getComputedStyle(element).fontWeight);
    if (!text || !sheet || !dock) throw new Error("la hoja no está en pantalla");
    const scrollBg = await doc.locator(".ow-docs-scroll").evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(text.x).toBeGreaterThanOrEqual(20);
    expect(text.x + text.width).toBeLessThanOrEqual(440);
    expect(sheet.y + sheet.height).toBeGreaterThanOrEqual(dock.y - 16);
    expect(scrollBg).toBe("rgb(255, 255, 255)");
    expect(weight === "400" || weight === "normal").toBe(true);
    await doc.screenshot({ path: `${await screenshotDir()}/063-underline.png` });
  });
});
