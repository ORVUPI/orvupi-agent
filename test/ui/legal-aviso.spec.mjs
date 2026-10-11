import { expect, test } from "@playwright/test";

const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";
const LEAD_ES =
  "Lectura informativa y solo lectura. No es una auditoría, ni un aval, ni una recomendación.";
const LEAD_EN =
  "Informational, read-only view. It is not an audit, an endorsement, or a recommendation.";
const ABSENT = [
  FOOTER_ES,
  FOOTER_EN,
  "Imagen generada con IA",
  "AI-generated image",
  "Ilustración con elementos generados con IA",
  "Illustration with AI-generated elements",
  "Imágenes de Agente Talón generadas con IA",
  "Agente Talón images generated with AI",
  "Herramienta educativa con datos públicos. No es consejo de inversión. Cripto de alto riesgo",
  "Educational tool using public data. Not investment advice. High-risk crypto",
];
const SUMMARY_ES = "Leer el aviso completo";
const SUMMARY_EN = "Read the full notice";
const MICA_ES =
  "Esta comunicación publicitaria de criptoactivos no ha sido revisada ni aprobada por ninguna autoridad competente de ningún Estado miembro de la Unión Europea.";
const PAGES = [
  "/",
  "/verify/",
  "/lab/",
  "/tablero/",
  "/studio/",
  "/studio/reglas/",
  "/aprender/",
  "/cuaderno/",
  "/pares/",
  "/comparar/",
  "/contribuir/",
  "/methodology/",
  "/security/",
  "/risks/",
  "/legal/",
  "/proofs/",
  "/status/",
  "/tokenomics/",
  "/community/",
  "/marca/",
  "/build/",
  "/avances/",
  "/404.html",
];
const TOOLS = ["/verify/", "/lab/", "/tablero/"];
const BUY_LANGUAGE =
  /\b(comprar|cómpralo|compra ya|buy now|buy|precio|prices?|urgent\w*|urgencia|ahora mismo|última oportunidad|last chance)\b/i;
const DENIAL =
  /no dice qué comprar|does not say what to buy/gi;

async function showSpanish(page) {
  const button = page.getByRole("button", { name: "Español" });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
}

test("el pie de riesgo y la etiqueta de imagen no están en ninguna vista", async ({ page }) => {
  for (const path of PAGES) {
    const source = await page.request.get(path);
    const html = await source.text();
    for (const phrase of ABSENT) expect(html, `${path} ${phrase}`).not.toContain(phrase);
    expect(html, path).toContain("p class=\"mica\"");
    await page.goto(path);
    await showSpanish(page);
    await expect(page.locator("footer p.mica").first(), path).toBeVisible();
    await expect(page.locator("footer"), path).not.toContainText(FOOTER_ES);
  }
});

test("la primera línea del aviso queda bajo el hero y encima de la herramienta", async ({ page }) => {
  for (const path of TOOLS) {
    await page.goto(path);
    await showSpanish(page);
    const lead = page.locator('.aviso[data-disclaimer="si"] > p').first().locator(".lang.es");
    await expect(lead).toHaveText(LEAD_ES);
    await expect(lead).toBeVisible();
    expect(await lead.evaluate((node) => Boolean(node.closest("details")))).toBe(false);
    const english = page.locator('.aviso[data-disclaimer="si"] > p').first().locator(".lang.en");
    await expect(english).toHaveText(LEAD_EN);
    const place = await page.evaluate(() => {
      const top = (node) => node.getBoundingClientRect().top + window.scrollY;
      const flow = (node) => {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") return false;
        return node.getBoundingClientRect().height > 0;
      };
      const h1 = document.querySelector("main h1");
      const aviso = document.querySelector('main > .aviso[data-disclaimer="si"]');
      const tool = document.querySelector("form.consulta, #mision-app, .grupos");
      const items = [...document.querySelectorAll("main > *, .herramienta > *")].filter(flow);
      items.sort((a, b) => top(a) - top(b));
      const next = items[items.indexOf(h1) + 1];
      return {
        belowHero: top(aviso) > top(h1),
        aboveTool: top(aviso) < top(tool),
        nextIsNotice: next === aviso,
      };
    });
    expect(place, path).toEqual({ belowHero: true, aboveTool: true, nextIsNotice: true });
  }
});

test("el plegable es details en el HTML y se abre con el teclado", async ({ page }) => {
  for (const path of TOOLS) {
    const source = await page.request.get(path);
    const html = await source.text();
    expect(html, path).toContain("<details class=\"aviso-mas\">");
    expect(html, path).toContain(`>${SUMMARY_ES}<`);
    expect(html, path).toContain(`>${SUMMARY_EN}<`);
    expect(html, path).toContain(LEAD_ES);
    expect(html.indexOf(LEAD_ES), path).toBeLessThan(html.indexOf("<details class=\"aviso-mas\">"));
    await page.goto(path);
    await showSpanish(page);
    const details = page.locator("details.aviso-mas");
    await expect(details).toHaveCount(1);
    await expect(details).toHaveJSProperty("open", false);
    const summary = details.locator("summary");
    await expect(summary).toHaveAccessibleName(SUMMARY_ES);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveJSProperty("open", true);
    await expect(page.locator('.aviso[data-disclaimer="si"]')).toContainText("Solo lectura: no conecta carteras ni firma nada.");
    await expect(details).toContainText("Lo desconocido no es lo mismo que lo comprobado.");
    await page.getByRole("button", { name: "English" }).click();
    await expect(summary).toHaveAccessibleName(SUMMARY_EN);
  }
});

test("el aviso MiCA de la portada y de Legal no se pliega", async ({ page }) => {
  for (const path of ["/", "/legal/"]) {
    await page.goto(path);
    await showSpanish(page);
    const mica = page.locator("p.mica", { hasText: MICA_ES });
    const count = await mica.count();
    expect(count, path).toBeGreaterThanOrEqual(1);
    for (let index = 0; index < count; index += 1) {
      const block = mica.nth(index);
      await expect(block, path).toBeVisible();
      expect(await block.evaluate((node) => Boolean(node.closest("details"))), path).toBe(false);
    }
    await expect(page.locator("details.aviso-mas"), path).toHaveCount(0);
  }
});

test("los heroes y los botones no venden ni enlazan Pump.fun", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const hits = await page.evaluate(({ pattern, denial }) => {
      const bad = new RegExp(pattern, "i");
      const excuse = new RegExp(denial, "gi");
      const nodes = [
        ...document.querySelectorAll("section.hero, main h1, button, a.primary, .hero-actions a"),
      ];
      const found = [];
      for (const node of nodes) {
        const parts = [
          ...node.querySelectorAll(".lang.es"),
          ...node.querySelectorAll(".lang.en"),
        ].map((part) => part.textContent || "");
        const bare = node.cloneNode(true);
        bare.querySelectorAll(".lang").forEach((part) => part.remove());
        parts.push(bare.textContent || "");
        for (const part of parts) {
          const text = part.replace(excuse, "").replace(/\s+/g, " ").trim();
          const match = text.match(bad);
          if (match) found.push(match[0]);
        }
        const href = node.getAttribute?.("href") || "";
        if (/pump\.fun/i.test(href)) found.push(href);
      }
      for (const link of document.querySelectorAll("section.hero a, main h1 a")) {
        const href = link.getAttribute("href") || "";
        if (/pump\.fun/i.test(href)) found.push(href);
      }
      return found;
    }, { pattern: BUY_LANGUAGE.source, denial: DENIAL.source });
    expect(hits, path).toEqual([]);
  }
});
