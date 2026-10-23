// Cambia el idioma con el selector de la web (es <-> en se cambia en la misma página, sin recargar).
export async function switchLang(page, lang) {
  const details = page.locator(".langpick details").first();
  if (!(await details.evaluate((d) => d.open))) await page.locator(".langpick summary").first().click();
  await page.locator(`.langpick a[data-lang-link="${lang}"]`).first().click();
  await page.locator(`html[data-lang="${lang}"]`).waitFor();
}
