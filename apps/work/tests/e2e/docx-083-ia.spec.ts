import { join } from "node:path";
import { appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { expect, test, type Page } from "@playwright/test";
import { screenshotDir } from "./shots";

/** ORVUPI AI real en el navegador. La prueba con el modelo de verdad se activa con ORVUPI_AI_REAL=1 (descarga cientos de MB). */
const shot = async (page: Page, name: string) =>
  page.screenshot({ path: join(await screenshotDir(), `083-ia-${name}-${test.info().project.name}.png`) });

const TEXT = "La prevención de riesgos laborales busca proteger la salud de las personas trabajadoras. Las enfermedades profesionales son las que se contraen por el trabajo realizado por cuenta ajena en las actividades que establece el cuadro oficial, y están provocadas por elementos o sustancias concretas. Para evitarlas, la empresa debe evaluar los riesgos, informar y formar a la plantilla, entregar equipos de protección individual y vigilar la salud periódicamente. La vigilancia de la salud permite detectar a tiempo los daños y adaptar el puesto.";

async function newDocWithText(page: Page): Promise<Page> {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  await doc.keyboard.insertText(TEXT);
  return doc;
}

test("ORVUPI AI: guía, elección de modelo, origen y acciones (Drive y Docs)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  const panel = page.locator("aside.ow-ai");
  if (!(await panel.isVisible())) await page.locator('.ow-top-actions [aria-label="ORVUPI AI"]').first().click();
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Tus documentos no salen del dispositivo")).toBeVisible();
  await expect(panel.getByText("El modelo local no se descarga")).toHaveCount(0);
  // Modelo: hay al menos un modelo utilizable y botón de descarga con tamaño
  const select = panel.locator("select").first();
  await expect(select).toBeVisible({ timeout: 20_000 });
  expect(await select.locator("option").count()).toBeGreaterThan(0);
  await expect(panel.getByRole("button", { name: /Descargar y activar \(|Activar/ })).toBeVisible();
  for (const label of ["Resumir", "Explicar", "Reescribir", "Traducir", "Esquema"]) await expect(panel.getByRole("button", { name: label, exact: true })).toBeVisible();
  await expect(panel.getByText("Las ideas principales en viñetas")).toBeVisible();
  await expect(panel.getByRole("radio", { name: "Otro archivo de Work" })).toBeVisible();
  // Sin modelo activado no se simula nada: lo dice claramente
  await panel.getByRole("button", { name: "Resumir", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Primero activa un modelo");
  await shot(page, "panel");

  const doc = await newDocWithText(page);
  await doc.getByRole("button", { name: "ORVUPI AI" }).filter({ visible: true }).first().click();
  const drawer = doc.locator(".ow-doc-aipanel");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("radio", { name: /Documento abierto/ })).toBeChecked();
  await expect(drawer.getByRole("radio", { name: "Texto seleccionado" })).toBeVisible();
  await shot(doc, "docs");
});

test("ORVUPI AI: resumen real con el modelo pequeño, sin enviar el documento", async ({ page }, info) => {
  test.skip(process.env.ORVUPI_AI_REAL !== "1", "ORVUPI_AI_REAL=1 para descargar y ejecutar el modelo");
  test.setTimeout(1_800_000);
  const modelId = process.env.ORVUPI_AI_MODEL ?? "qwen05-cpu";
  const doc = await newDocWithText(page);
  // Privacidad: ninguna petición lleva el texto del documento
  const leaks: string[] = [];
  doc.on("request", (request) => {
    const body = request.postData() ?? "";
    if (body.includes("enfermedades profesionales") || request.url().includes("enfermedades")) leaks.push(request.url());
  });
  await doc.getByRole("button", { name: "ORVUPI AI" }).filter({ visible: true }).first().click();
  const drawer = doc.locator(".ow-doc-aipanel");
  const select = drawer.locator("select").first();
  await expect(select).toBeVisible({ timeout: 20_000 });
  await select.selectOption(modelId);
  const t0 = Date.now();
  await drawer.getByRole("button", { name: /Descargar y activar|Activar/ }).click();
  await expect(drawer.getByRole("progressbar")).toBeVisible({ timeout: 60_000 }).catch(() => undefined);
  await shot(doc, "descarga");
  await expect(drawer.locator(".ow-ai-ready")).toBeVisible({ timeout: 1_500_000 });
  const loadMs = Date.now() - t0;
  const t1 = Date.now();
  await drawer.getByRole("button", { name: "Resumir", exact: true }).click();
  await expect(drawer.locator(".ow-ai-status")).toContainText("fragmentos", { timeout: 900_000 });
  const summaryMs = Date.now() - t1;
  const summary = (await drawer.locator(".ow-ai-output").innerText()).trim();
  expect(summary.length).toBeGreaterThan(40);
  expect(summary.toLowerCase()).toMatch(/salud|riesg|enfermedad|prevenci|trabaj/);
  await shot(doc, "resumen");
  await drawer.getByRole("button", { name: "Insertar en el documento" }).click();
  await expect(doc.locator(".ProseMirror")).toContainText(summary.split("\n")[0]!.replace(/^[-*•\s]+/, "").slice(0, 30));
  expect(leaks).toEqual([]);
  const record = { project: info.project.name, model: modelId, loadMs, summaryMs, summary };
  info.annotations.push({ type: "ia", description: JSON.stringify(record) });
  await appendFile(process.env.ORVUPI_AI_TIMES ?? join(tmpdir(), "orvupi-ai-times.jsonl"), `${JSON.stringify(record)}\n`);
});
