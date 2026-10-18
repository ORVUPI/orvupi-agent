import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const cat = (l) => JSON.parse(readFileSync(new URL(`../../apps/work/src/i18n/locales/${l}.json`, import.meta.url)));
const ja = cat("ja"), ko = cat("ko"), pt = cat("pt-BR");
const TEXT = "日本語のテキスト 한국어 텍스트 Português: ação, coração. Español: año, pingüino. English.";

test("ORVUPI Work: idioma del navegador, selector visible, preferencia y documento intacto", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", baseURL, acceptDownloads: true, viewport: test.info().project.use.viewport });
  const page = await ctx.newPage();
  await page.goto("/work/");
  // sin preferencia: idioma del navegador
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("button", { name: ja.newDoc }).first()).toBeVisible();
  const select = page.getByTestId("ow-lang");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).toHaveText(["English", "Español", "Português (Brasil)", "日本語", "한국어"]);
  // cambiar a coreano
  await select.selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("button", { name: ko.newDoc }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("orvupi-lang"))).toBe("ko");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  // crear y escribir en los cinco idiomas
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: ko.newDoc }).first().click();
  const doc = await opened;
  await doc.waitForLoadState("domcontentloaded");
  const editor = doc.locator(".ProseMirror").first();
  await editor.click();
  await doc.keyboard.insertText(TEXT);
  await expect(editor).toContainText(TEXT);
  await expect(doc.locator(".ow-docs-save")).toHaveText(ko.statusSaved, { timeout: 15000 });
  // cambiar el idioma en la otra pestaña no toca el documento
  await select.selectOption("pt-BR");
  await expect(page.getByRole("button", { name: pt.newDoc }).first()).toBeVisible();
  await doc.reload();
  await expect(doc.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(doc.locator(".ProseMirror").first()).toContainText(TEXT);
  // exportar TXT: el contenido sale tal cual, sin traducir (la barra de menús completa es de escritorio)
  if ((test.info().project.use.viewport?.width ?? 1366) < 1000) { await ctx.close(); return; }
  const download = doc.waitForEvent("download");
  await doc.getByRole("menuitem", { name: pt.menuFile, exact: true }).click();
  await doc.getByRole("menuitem", { name: pt.export, exact: true }).click();
  await doc.getByRole("menuitem", { name: "TXT", exact: true }).click();
  const file = await download;
  const path = await file.path();
  expect(readFileSync(path, "utf8")).toContain(TEXT);
  await ctx.close();
});

test("ORVUPI Work: sin claves visibles ni caracteres rotos en los cinco idiomas", async ({ browser, baseURL }) => {
  for (const loc of ["en", "es", "pt-BR", "ja", "ko"]) {
    const ctx = await browser.newContext({ baseURL, viewport: test.info().project.use.viewport });
    await ctx.addInitScript((l) => localStorage.setItem("orvupi-lang", l), loc);
    const page = await ctx.newPage();
    await page.goto("/work/");
    await expect(page.locator("html")).toHaveAttribute("lang", loc);
    const text = await page.locator("body").innerText();
    expect(text, loc).not.toMatch(/\uFFFD|tpl:|\{[a-zA-Z]+\}/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${loc} desbordamiento`).toBeLessThanOrEqual(2);
    await ctx.close();
  }
});

test("ORVUPI Work: solo se descarga el catálogo del idioma activo", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("orvupi-lang", "ja"));
  const page = await ctx.newPage();
  const urls = [];
  page.on("request", (r) => urls.push(new URL(r.url()).pathname));
  await page.goto("/work/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.waitForLoadState("networkidle");
  expect(urls.some((u) => /\/assets\/ja-[\w-]+\.js$/.test(u))).toBeTruthy();
  expect(urls.some((u) => /\/assets\/(ko|pt-BR)-[\w-]+\.js$/.test(u))).toBeFalsy();
  await ctx.close();
});
