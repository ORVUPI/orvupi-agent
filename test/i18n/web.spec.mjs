import { test, expect } from "@playwright/test";

const LOCALES = [
  { code: "es", pre: "", name: "Español" },
  { code: "en", pre: "/en", name: "English" },
  { code: "pt-BR", pre: "/pt-br", name: "Português (Brasil)" },
  { code: "ja", pre: "/ja", name: "日本語" },
  { code: "ko", pre: "/ko", name: "한국어" },
];
const PAGES = ["/", "/verify/", "/token/", "/risks/", "/lab/", "/studio/", "/cuaderno/", "/memes/", "/legal/"];
const quick = (name) => test.info().project.name.endsWith("desktop") || name === "/";

// Texto visible sin claves crudas, sin caracteres rotos y sin el otro idioma oculto a la vista.
async function visibleProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!el || !node.nodeValue.trim()) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || !el.getClientRects().length) continue;
      if (el.closest("script,style,code,pre")) continue;
      const t = node.nodeValue;
      if (/\uFFFD/.test(t)) out.push("carácter roto: " + t.slice(0, 60));
      if (/\bw[0-9a-f]{10}\b/.test(t)) out.push("clave visible: " + t.slice(0, 60));
      if (/\{[a-zA-Z]+\}/.test(t)) out.push("marcador visible: " + t.slice(0, 60));
      if (/^(ZQ\d+)/.test(t.trim())) out.push("token de protección: " + t.slice(0, 60));
    }
    return out;
  });
}

for (const loc of LOCALES) {
  for (const path of PAGES) {
    test(`${loc.code} ${path}: idioma, SEO y texto`, async ({ page }) => {
      test.skip(!quick(path), "solo escritorio para páginas secundarias");
      const res = await page.goto(loc.pre + path);
      expect(res.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", loc.code);
      expect((await page.title()).length).toBeGreaterThan(3);
      const alts = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((l) => l.map((x) => [x.hreflang, new URL(x.href).pathname]));
      expect(alts).toEqual([["es", path], ["en", "/en" + path], ["pt-BR", "/pt-br" + path], ["ja", "/ja" + path], ["ko", "/ko" + path], ["x-default", "/en" + path]]);
      const canon = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canon).pathname).toBe((loc.pre || "") + path);
      expect(await visibleProblems(page)).toEqual([]);
      if (loc.code !== "es") expect(await page.locator(".lang.es").count()).toBe(0);
      // el selector muestra el idioma con su nombre propio y no se sale de la pantalla
      const summary = page.locator(".langpick summary");
      await expect(summary).toContainText(loc.name);
      const vw = page.viewportSize().width;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "desbordamiento horizontal").toBeLessThanOrEqual(2);
      const box = await summary.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
      await summary.click();
      const menu = page.locator(".langpick ul");
      await expect(menu).toBeVisible();
      const mb = await menu.boundingBox();
      expect(mb.x).toBeGreaterThanOrEqual(-1);
      expect(mb.x + mb.width).toBeLessThanOrEqual(vw + 1);
      await expect(page.locator(".langpick a")).toHaveText(LOCALES.map((l) => l.name));
    });
  }
}

test("cambiar de idioma: misma página, preferencia guardada y recuperada al volver", async ({ page, context }) => {
  await page.goto("/verify/");
  await page.locator(".langpick summary").click();
  await page.locator('.langpick a[hreflang="ja"]').click();
  await expect(page).toHaveURL(/\/ja\/verify\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  expect(await page.evaluate(() => localStorage.getItem("orvupi-lang"))).toBe("ja");
  await page.reload();
  await expect(page).toHaveURL(/\/ja\/verify\/$/);
  // nueva visita desde fuera a la portada en español: se respeta la elección expresa (una sola vez, sin bucle)
  const other = await context.newPage();
  await other.goto("/");
  await expect(other).toHaveURL(/\/ja\/$/);
  await other.goto("/");
  await expect(other).toHaveURL(/\/$/); // segunda vez en la sesión: no se vuelve a redirigir
  // enlaces internos se quedan en el idioma
  const hrefs = await page.locator("nav.site a").evaluateAll((l) => l.map((a) => a.getAttribute("href")));
  for (const h of hrefs) if (h.startsWith("/") && !h.startsWith("/work/")) expect(h.startsWith("/ja/")).toBeTruthy();
});

test("sin preferencia solo se sugiere el idioma del navegador, sin redirigir", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ locale: "ko-KR", baseURL });
  const page = await ctx.newPage();
  await page.goto("/en/");
  await expect(page).toHaveURL(/\/en\/$/);
  const box = page.locator(".langsuggest");
  await expect(box).toBeVisible();
  await expect(box).toContainText("한국어");
  await box.locator("button").click();
  await expect(box).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".langsuggest")).toHaveCount(0);
  await ctx.close();
});

test("los datos de un formulario se conservan al cambiar de idioma", async ({ page }) => {
  await page.goto("/en/verify/");
  const input = page.locator("main input[type=text], main input:not([type]), main input[type=search]").first();
  await input.fill("Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU");
  await page.locator(".langpick summary").click();
  await page.locator('.langpick a[hreflang="ko"]').click();
  await expect(page).toHaveURL(/\/ko\/verify\/$/);
  await expect(page.locator("main input[type=text], main input:not([type]), main input[type=search]").first()).toHaveValue("Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU");
});

test("el selector funciona con teclado", async ({ page }) => {
  test.skip(!test.info().project.name.endsWith("desktop"), "teclado en escritorio");
  await page.goto("/en/");
  const summary = page.locator(".langpick summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".langpick ul")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(".langpick a").nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/$/);
});

test("carga perezosa: solo se descarga el idioma activo", async ({ page }) => {
  const urls = [];
  page.on("request", (r) => urls.push(new URL(r.url()).pathname));
  await page.goto("/ja/");
  await page.waitForLoadState("networkidle");
  expect(urls).toContain("/i18n/web/dyn-ja.json");
  expect(urls.some((u) => /dyn-(ko|pt-BR)\.json/.test(u))).toBeFalsy();
  expect(urls).toContain("/fonts/noto/noto-sans-jp.css");
  expect(urls.some((u) => u.includes("noto-sans-kr"))).toBeFalsy();
  urls.length = 0;
  await page.goto("/en/");
  await page.waitForLoadState("networkidle");
  expect(urls.some((u) => u.includes("/i18n/") || u.includes("/fonts/noto/"))).toBeFalsy();
});

test("los textos dinámicos de los scripts salen traducidos (ja)", async ({ page }) => {
  test.skip(!test.info().project.name.endsWith("desktop"), "una vez por navegador");
  await page.goto("/ja/verify/");
  await page.waitForLoadState("networkidle");
  const dict = await (await page.request.get("/i18n/web/dyn-ja.json")).json();
  const body = await page.locator("main").innerText();
  const leftover = Object.keys(dict).filter((k) => k.length > 12 && body.includes(k));
  expect(leftover).toEqual([]);
});

test("sitemap con alternates para todas las versiones", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/", "/en/", "/pt-br/", "/ja/", "/ko/"]) expect(xml).toContain(`<loc>https://orvupi.com${p}</loc>`);
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).not.toContain("/work/");
});
