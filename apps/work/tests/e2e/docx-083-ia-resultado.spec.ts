import { expect, test } from "@playwright/test";

/** ORVUPI AI 0.8.8: documento con imágenes pegadas → resultado limpio, documento creado y exportaciones.
 *  Descarga el modelo real: solo con ORVUPI_AI_REAL=1. */
test("ORVUPI AI: resultado limpio como documento, PDF y Word", async ({ page }) => {
  test.skip(process.env.ORVUPI_AI_REAL !== "1", "ORVUPI_AI_REAL=1 para descargar y ejecutar el modelo");
  test.setTimeout(1_800_000);
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  await doc.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 2000; c.height = 1500;
    const g = c.getContext("2d")!; for (let i = 0; i < 300; i++) { g.fillStyle = `hsl(${i},70%,50%)`; g.fillRect((i * 37) % 2000, (i * 53) % 1500, 300, 200); }
    const big = c.toDataURL("image/png");
    const html = `<h1>Prevención</h1><p>La prevención de riesgos laborales protege la salud de la plantilla.</p><p><img src="${big}"></p><p>Texto web: ![](${big.slice(0, 3000)}) La empresa debe evaluar los riesgos y formar a la plantilla.</p>`;
    const dt = new DataTransfer(); dt.setData("text/html", html); dt.setData("text/plain", "x");
    document.querySelector(".ProseMirror")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await doc.waitForTimeout(3000);
  await doc.close();
  await page.reload();
  const panel = page.locator("aside.ow-ai");
  if (!(await panel.isVisible())) await page.locator('.ow-top-actions [aria-label="ORVUPI AI"]').first().click();
  await panel.getByText("Opciones avanzadas").click();
  await panel.locator(".ow-ai-advanced select").selectOption(process.env.ORVUPI_AI_MODEL ?? "smol135-cpu");
  await panel.getByRole("button", { name: "Usar este modelo" }).click();
  await expect(panel.locator(".ow-ai-ready")).toBeVisible({ timeout: 1_500_000 });
  await panel.getByRole("radio", { name: "Otro archivo de Work" }).check();
  const created = page.waitForEvent("popup", { timeout: 900_000 });
  await panel.getByRole("button", { name: "Resumir", exact: true }).click();
  await expect(panel.locator(".ow-ai-status")).toContainText(/Documento listo|fiable/, { timeout: 900_000 });
  const out = await panel.locator(".ow-ai-output").innerText();
  expect(out).not.toMatch(/!\[|\]\(|!!!!/);
  const newDoc = await created;
  await expect(newDoc.locator(".ProseMirror")).toBeVisible({ timeout: 30_000 });
  expect(await newDoc.title()).toContain("Resumen");
  for (const [name, ext] of [["Exportar PDF", ".pdf"], ["Exportar DOCX", ".docx"]] as const) {
    const download = page.waitForEvent("download");
    await panel.getByRole("button", { name }).click();
    expect((await download).suggestedFilename()).toMatch(new RegExp(`\\${ext}$`));
  }
});
