import { expect, test } from "@playwright/test";

test("ORVUPI IA móvil: landing, cajón, currículum y proyecto de empresa", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "la referencia es el móvil");
  await page.goto("/studio/#/ia");
  await expect(page.locator("#ia-saludo")).toHaveText("¿Qué diseñamos hoy?");
  await expect(page.locator(".orvupi-ia")).toContainText("¿Qué tarea deberíamos completar a continuación?");
  await expect(page.locator('.canva-nav [data-go="ia"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('.canva-nav [data-go="ia"] img')).toHaveAttribute("src", /orvupi-avatar\.png/);
  await expect(page.locator(".ia-nav-dot")).toBeVisible();
  await expect(page.locator(".orvupi-ia")).not.toContainText("Canva");
  await expect(page.locator(".orvupi-ia")).not.toContainText("riesgo");

  await page.getByRole("button", { name: "Chats recientes" }).click();
  await expect(page.locator("[data-ia-screen='chats']")).toContainText("Todos tus chats aparecerán aquí");
  await expect(page.locator("[data-ia-screen='chats']")).toContainText("Empieza a diseñar con ORVUPI IA");
  await page.getByRole("button", { name: "Memoria" }).click();
  await expect(page.locator("[data-ia-screen='memoria']")).toContainText("Biblioteca de memorias");
  await expect(page.locator("[data-ia-screen='memoria']")).toContainText("Acerca de mí");
  await page.getByRole("button", { name: "Crear estantería" }).click();
  await expect(page.getByRole("dialog")).toContainText("Crear una estantería");
  await page.locator(".ia-sheet-scrim").click({ position: { x: 12, y: 12 } });

  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByRole("button", { name: "Tareas" }).click();
  await expect(page.locator("[data-ia-screen='tareas']")).toContainText("No hay tareas programadas");
  await page.getByRole("tab", { name: "Completadas" }).click();
  await expect(page.locator("[data-ia-screen='tareas']")).toContainText("No hay tareas completadas");

  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.locator("[data-ia-screen='biblioteca']")).toContainText("Todavía no hay multimedia");
  await page.getByRole("tab", { name: "Chats favoritos" }).click();
  await expect(page.locator("[data-ia-screen='biblioteca']")).toContainText("Todavía no hay chats favoritos");

  await page.goto("/studio/#/ia");
  const prompt = page.locator("#ia-prompt");
  await prompt.fill("Quiero plantillas de currículum");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator(".ia-think")).toContainText("Pensando");
  await expect(page.locator(".ia-octo")).toHaveAttribute("src", /orvupi-avatar\.png/);
  await expect(page.getByRole("button", { name: "Parar" })).toBeVisible();
  await expect(page.locator(".canva-nav")).toHaveCount(0);
  await page.getByRole("button", { name: "Parar" }).click();
  await expect(page.locator(".ia-think")).toHaveCount(0);
  await expect(page.locator(".ia-count")).toHaveCount(0);

  await prompt.fill("Quiero plantillas de currículum");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator(".ia-count")).toContainText("resultados", { timeout: 5000 });
  await expect(page.locator(".ia-grid img").first()).toHaveAttribute("src", /curriculum/);
  await expect(page.locator(".ia-grid img")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Mostrar más plantillas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generar" })).toBeVisible();
  const before = await page.locator(".ia-grid img").count();
  await page.getByRole("button", { name: "Mostrar más plantillas" }).click();
  await expect.poll(async () => page.locator(".ia-grid img").count()).toBeGreaterThan(before);

  await page.goto("/studio/#/ia");
  const empresa = page.locator("#ia-prompt");
  await empresa.click();
  await page.evaluate(() => {
    window.__iaPrompt = document.getElementById("ia-prompt");
  });
  await empresa.pressSequentially("Quiero plantillas para proyecto de empresa", { delay: 12 });
  await expect(empresa).toHaveValue("Quiero plantillas para proyecto de empresa");
  await expect.poll(() => page.evaluate(() => window.__iaPrompt === document.getElementById("ia-prompt"))).toBe(true);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator(".ia-assistant")).toContainText("proyecto de empresa", { timeout: 5000 });
  await expect(page.locator(".ia-assistant")).not.toContainText(/currículum/i);
  await expect(page.locator(".ia-grid img")).toHaveCount(4);
  const srcs = await page.locator(".ia-grid img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") || ""));
  expect(srcs.some((src) => /curriculum/.test(src))).toBe(false);
  expect(srcs.some((src) => /presentacion|propuesta|negocio|documento|informe/.test(src))).toBe(true);

  await page.goto("/studio/#/");
  await expect(page.getByRole("heading", { name: "Elige cómo empezar" })).toBeVisible();
  await page.goto("/studio/#/plantillas");
  await expect(page.locator(".tpl-title")).toContainText("Plantillas");
  await expect(page.locator(".tpl-title")).not.toContainText("Creators");
  await page.goto("/studio/#/disenos");
  await expect(page.locator(".md-title-text")).toContainText("Todos los proyectos");
});
