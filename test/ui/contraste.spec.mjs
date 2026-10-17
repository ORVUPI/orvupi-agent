// Contraste WCAG AA (axe-core, 4,5:1 texto normal) en todas las páginas, ES y EN, claro y oscuro.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/verify/", "/lab/", "/tablero/", "/aprender/", "/studio/", "/cuaderno/", "/comparar/", "/pares/",
  "/risks/", "/token/", "/legal/", "/security/", "/methodology/", "/vision/", "/marca/", "/memes/", "/community/", "/contribuir/", "/404.html"];
const SHOTS = process.env.CONTRAST_SHOTS || "";

for (const scheme of ["light", "dark"]) {
  for (const lang of ["es", "en"]) {
    test(`contraste AA ${scheme} ${lang}`, async ({ page }, info) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.addInitScript((l) => { try { localStorage.setItem("orvupi-lab-lang", l); } catch {} }, lang);
      const problems = [];
      for (const path of PAGES) {
        await page.goto(path, { waitUntil: "networkidle" }).catch(() => page.goto(path));
        await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
        await page.waitForTimeout(150);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-${scheme}-${lang}${path.replace(/\W+/g, "_")}.png`, fullPage: true });
        const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
        for (const v of r.violations) for (const n of v.nodes) problems.push(`${path} ${n.target.join(" ")} :: ${(n.any[0]?.message || "").slice(0, 160)}`);
      }
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
}
