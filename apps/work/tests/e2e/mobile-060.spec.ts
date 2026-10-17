import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "/opt/cursor/artifacts/screenshots";
const WIDTHS = [360, 390, 412, 460, 768];
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function shot(page: Page, name: string) {
  if (test.info().project.name !== "pixel-7") return;
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

async function fits(page: Page, label: string) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const root = document.documentElement;
      const scroll = document.querySelector(".ow-docs-scroll");
      const rootGap = root.scrollWidth - root.clientWidth;
      const scrollStyle = scroll ? getComputedStyle(scroll) : null;
      const docsGap = scroll && scrollStyle && scrollStyle.overflowX !== "clip" && scrollStyle.overflowX !== "hidden"
        ? scroll.scrollWidth - scroll.clientWidth
        : 0;
      const pageBox = document.querySelector(".ow-a4")?.getBoundingClientRect();
      const pageGap = pageBox ? Math.max(0, pageBox.right - window.innerWidth, -pageBox.left) : 0;
      return Math.max(rootGap, docsGap, pageGap);
    });
  }, { message: label, timeout: 8_000 }).toBeLessThanOrEqual(2);
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((item) => `${item.id} ${item.help} ${item.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function openHomeTool(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name, exact: true }).click();
  const tool = await opened;
  await tool.waitForLoadState("domcontentloaded");
  return tool;
}

async function menu(page: Page, name: string, item: string | RegExp) {
  const overflow = page.locator(".ow-menu-overflow");
  const entry = page.getByRole("menuitem", { name, exact: true });
  await expect.poll(async () => (await overflow.count()) + (await entry.count()), { timeout: 15_000 }).toBeGreaterThan(0);
  if ((await overflow.count()) > 0 && (await overflow.getAttribute("aria-expanded")) !== "true") await overflow.click();
  await entry.last().click();
  await page.getByRole("menuitem", { name: item, exact: typeof item === "string" }).last().click();
}

async function visualFont(page: Page, selector: string) {
  return page.locator(selector).evaluate((node) => {
    let size = Number.parseFloat(getComputedStyle(node).fontSize);
    let current: Element | null = node;
    while (current) {
      const zoom = Number.parseFloat(getComputedStyle(current).getPropertyValue("zoom") || "1");
      if (Number.isFinite(zoom) && zoom > 0 && zoom !== 1) size *= zoom;
      current = current.parentElement;
    }
    return size;
  });
}

test("el inicio y Drive caben, y el móvil tiene barra y botón Nuevo", async ({ page }) => {
  await page.goto("/");
  await fits(page, "inicio");
  const phone = (page.viewportSize()?.width ?? 1360) <= 768;
  if (phone) {
    await expect(page.locator(".ow-fab")).toBeVisible();
    await expect(page.locator(".ow-tabbar")).toBeVisible();
    await page.locator(".ow-fab").click();
    await expect(page.locator(".ow-fab-sheet").getByRole("menuitem", { name: "Documento", exact: true })).toBeVisible();
    await page.locator(".ow-fab").click();
    const viewportHome = page.viewportSize();
    if (!viewportHome) throw new Error("falta el alto");
    const headerRatio = await page.evaluate(() => {
      const bar = document.querySelector(".ow-topbar")?.getBoundingClientRect().height ?? 0;
      const head = document.querySelector(".ow-page-head")?.getBoundingClientRect().height ?? 0;
      return (bar + head) / window.innerHeight;
    });
    expect(headerRatio).toBeLessThan(0.2);
    await expect(page.locator(".ow-chip-more")).toBeVisible();
    const chipsMask = await page.locator(".ow-chips").evaluate((node) => getComputedStyle(node).maskImage || getComputedStyle(node).getPropertyValue("-webkit-mask-image"));
    expect(chipsMask).not.toBe("none");
    const sheetText = await page.evaluate(() => {
      const fab = document.querySelector(".ow-fab")?.getBoundingClientRect();
      const para = document.querySelector('.ow-card[data-tool="sheets"] p');
      if (!fab || !para) return 1;
      for (const rect of para.getClientRects()) {
        const overlapX = Math.min(rect.right, fab.right) - Math.max(rect.left, fab.left);
        const overlapY = Math.min(rect.bottom, fab.bottom) - Math.max(rect.top, fab.top);
        if (overlapX > 2 && overlapY > 2) return 1;
      }
      return 0;
    });
    expect(sheetText).toBe(0);
    await shot(page, "062-drive");
    const modified = page.getByRole("combobox", { name: "Modificado" });
    await modified.evaluate((node) => node.scrollIntoView({ inline: "nearest", block: "nearest" }));
    const filterFits = await modified.evaluate((node) => {
      const row = node.closest(".ow-chips");
      if (!row) return false;
      const rect = node.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      return rect.left >= box.left - 1 && rect.right <= box.right + 1;
    });
    expect(filterFits).toBe(true);
    await page.locator(".ow-tabbar").getByRole("button", { name: "Más", exact: true }).click();
    const drawer = page.locator(".ow-sidebar.is-open");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Mi unidad", exact: true }).click();
  } else {
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Mi unidad", exact: true }).click();
  }
  await expect(page.locator(".ow-drive-title")).toBeVisible();
  if (phone && viewportOf(page) <= 768) {
    const viewport = page.viewportSize();
    const search = await page.locator(".ow-search").boundingBox();
    if (!search || !viewport) throw new Error("falta la búsqueda");
    expect(search.width).toBeGreaterThan(viewport.width * 0.9);
    const chips = page.locator(".ow-chips");
    const chipBox = await chips.boundingBox();
    if (!chipBox) throw new Error("faltan los filtros");
    expect(chipBox.height).toBeLessThan(64);
    const pad = await page.locator("main").evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBottom));
    expect(pad).toBeGreaterThanOrEqual(200);
    await page.evaluate(() => {
      const main = document.querySelector("main");
      window.scrollTo(0, document.documentElement.scrollHeight);
      if (main) main.scrollTop = main.scrollHeight;
    });
    const covered = await page.evaluate(() => {
      const fab = document.querySelector(".ow-fab")?.getBoundingClientRect();
      const main = document.querySelector("main");
      if (!fab || !main) return 1;
      let hit = 0;
      for (const node of main.querySelectorAll("h1, h2, h3, p, article, li, a")) {
        const rect = node.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) continue;
        const overlap = Math.min(rect.bottom, fab.bottom) - Math.max(rect.top, fab.top);
        if (overlap > 8) hit += 1;
      }
      return hit;
    });
    expect(covered).toBe(0);
  }
  await fits(page, "drive");
  await axe(page);
});

function viewportOf(page: Page) {
  return page.viewportSize()?.width ?? 1360;
}

test("Docs encaja, oculta la regla vertical y reserva sitio al teclado", async ({ page }) => {
  const docs = await openHomeTool(page, "Nuevo documento");
  if ((docs.viewportSize()?.width ?? 1360) > 800) await docs.setViewportSize({ width: 460, height: 820 });
  await expect(docs.locator(".ow-vruler")).toHaveCount(0);
  await expect(docs.locator(".ow-format-dock")).toBeVisible();
  await expect(docs.locator(".ow-docs-toolbar")).toBeHidden();
  const title = docs.locator(".ow-docs-name");
  await expect(title).toHaveValue("Sin título");
  const titleFit = await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  expect(titleFit).toBe(true);
  const titleBox = await title.boundingBox();
  const pageBox = await docs.locator(".ow-a4").boundingBox();
  const viewport = docs.viewportSize();
  if (!pageBox || !viewport || !titleBox) throw new Error("la hoja no está en pantalla");
  expect(titleBox.x).toBeGreaterThanOrEqual(-1);
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(pageBox.x).toBeGreaterThanOrEqual(-1);
  expect(pageBox.x + pageBox.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(await visualFont(docs, ".ow-a4 .ProseMirror")).toBeGreaterThanOrEqual(14);
  let previous = -1;
  for (const name of ["Negrita", "Cursiva", "Subrayado", "Alinear a la izquierda", "Centrar"]) {
    const control = docs.getByRole("button", { name, exact: true });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    if (!box) throw new Error(`${name} no está en pantalla`);
    expect(box.x).toBeGreaterThan(previous);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 28);
    previous = box.x;
  }
  await shot(docs, "062-docs");
  const font = docs.getByRole("button", { name: /^Fuente/ });
  await font.scrollIntoViewIfNeeded();
  await expect(font).toBeVisible();
  const fontBox = await font.boundingBox();
  if (!fontBox) throw new Error("la fuente no está en pantalla");
  const dockOrder = await docs.locator(".ow-format-scroll").evaluate((node) => {
    const place = (name: string, starts = false) => {
      const el = [...node.querySelectorAll("button")].find((button) => {
        const label = button.getAttribute("aria-label") || "";
        return starts ? label.startsWith(name) : label === name;
      });
      if (!el) return -1;
      return el.getBoundingClientRect().left - node.getBoundingClientRect().left + node.scrollLeft;
    };
    const names = ["Negrita", "Cursiva", "Subrayado", "Alinear a la izquierda", "Centrar"].map((name) => place(name));
    return { names, font: place("Fuente", true) };
  });
  expect(dockOrder.names.every((value, index) => value >= 0 && (index === 0 || value > dockOrder.names[index - 1]!))).toBe(true);
  expect(dockOrder.font).toBeGreaterThan(dockOrder.names[dockOrder.names.length - 1]!);
  expect(fontBox.x).toBeGreaterThanOrEqual(-1);
  expect(fontBox.x + fontBox.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(fontBox.y + fontBox.height).toBeLessThanOrEqual(viewport.height + 2);
  for (const name of ["Tamaño del texto", "Color del texto", "Lista", "Insertar tabla"]) {
    const control = docs.getByRole(name === "Tamaño del texto" ? "textbox" : "button", { name, exact: true });
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    if (!box) throw new Error(`${name} no está en pantalla`);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  }
  const table = docs.getByRole("button", { name: "Insertar tabla", exact: true });
  const tableBox = await table.boundingBox();
  const moreBox = await docs.locator(".ow-dock-more").boundingBox();
  if (!tableBox || !moreBox) throw new Error("la tabla no está en pantalla");
  expect(tableBox.width).toBeGreaterThanOrEqual(36);
  const tableOverlap = Math.min(tableBox.x + tableBox.width, moreBox.x + moreBox.width) - Math.max(tableBox.x, moreBox.x);
  const tableOverlapY = Math.min(tableBox.y + tableBox.height, moreBox.y + moreBox.height) - Math.max(tableBox.y, moreBox.y);
  expect(tableOverlap > 0 && tableOverlapY > 0 ? tableOverlap : 0).toBeLessThanOrEqual(2);
  await docs.locator(".ow-menu-overflow").click();
  for (const label of ["Archivo", "Editar", "Ver", "Insertar", "Formato", "Herramientas", "Extensiones", "Ayuda"]) {
    await expect(docs.getByRole("menuitem", { name: label, exact: true })).toBeVisible();
  }
  await docs.getByRole("menuitem", { name: "Archivo", exact: true }).click();
  const menuBox = await docs.getByRole("menu", { name: "Archivo" }).boundingBox();
  if (!menuBox) throw new Error("el menú no se abrió");
  expect(menuBox.x).toBeGreaterThanOrEqual(-1);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height + 2);
  await docs.evaluate(() => window.dispatchEvent(new CustomEvent("ow-keyboard-inset", { detail: 280 })));
  await expect(docs.locator(".ow-docs-scroll")).toHaveCSS("padding-bottom", "344px");
  await fits(docs, "docs");
  await axe(docs);
});

test("Docs inserta gráfico, dibujo, ecuación, marca, número, columnas y letra capital", async ({ page }) => {
  const docs = await openHomeTool(page, "Nuevo documento");
  await menu(docs, "Insertar", "Número de página");
  await expect(docs.locator(".ow-page-num")).toHaveText("1");
  await menu(docs, "Insertar", "Marca de agua");
  await expect(docs.locator(".ow-watermark")).toHaveText("ORVUPI");
  await menu(docs, "Insertar", "Ecuación");
  await expect(docs.getByText("E = mc²")).toBeVisible();
  await menu(docs, "Insertar", "Gráfico");
  await expect(docs.getByRole("img", { name: "Gráfico", exact: true })).toBeVisible();
  await menu(docs, "Insertar", "Dibujo");
  await expect(docs.getByRole("img", { name: "Dibujo", exact: true })).toBeVisible();
  await menu(docs, "Insertar", "Encabezado");
  await expect(docs.getByRole("textbox", { name: "Encabezado", exact: true })).toBeFocused();
  await menu(docs, "Formato", "Columnas");
  await expect(docs.locator(".ow-a4")).toHaveClass(/is-cols-2/);
  await menu(docs, "Formato", "Letra capital");
  await expect(docs.locator(".ow-a4")).toHaveClass(/is-dropcap/);
  await fits(docs, "docs funciones");
});

test("la hoja responde al dedo y cubre escala, nota, validación, macro y consulta", async ({ page }) => {
  const sheet = await openHomeTool(page, "Nueva hoja");
  const sheetSize = sheet.viewportSize();
  const restoreWide = (sheetSize?.width ?? 1360) > 768;
  if (restoreWide) await sheet.setViewportSize({ width: 412, height: 915 });
  await expect(sheet.locator(".ow-topbar")).toHaveCount(0);
  await expect(sheet.locator(".ow-tabbar")).toBeHidden();
  await expect(sheet.locator(".ow-fab")).toBeHidden();
  await expect.poll(async () => sheet.evaluate(() => {
    const wrap = document.querySelector(".ow-sheet-wrap");
    if (!wrap) return 0;
    const box = wrap.getBoundingClientRect();
    const top = Math.max(0, box.top);
    const bottom = Math.min(window.innerHeight, box.bottom);
    const labels = new Set<string>();
    for (const node of wrap.querySelectorAll(".ow-vrow")) {
      const rect = node.getBoundingClientRect();
      if (rect.height < 10) continue;
      const visible = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
      if (visible >= 18) labels.add((node.textContent || "").trim());
    }
    return labels.size;
  })).toBeGreaterThanOrEqual(12);
  const ratio = await sheet.evaluate(() => {
    const wrap = document.querySelector(".ow-sheet-wrap");
    if (!wrap) return 0;
    return wrap.getBoundingClientRect().height / window.innerHeight;
  });
  expect(ratio).toBeGreaterThanOrEqual(0.65);
  const formulaField = sheet.locator(".ow-formula .ow-field");
  await expect(formulaField.locator("input")).toHaveAttribute("placeholder", "Fórmula o valor");
  const formulaBox = await formulaField.boundingBox();
  if (!formulaBox) throw new Error("falta la fórmula");
  expect(formulaBox.height).toBeLessThanOrEqual(48);
  const formulaLine = await formulaField.evaluate((node) => {
    const span = node.querySelector("span");
    if (!span) return false;
    return getComputedStyle(span).position === "absolute" && span.getClientRects().length <= 1;
  });
  expect(formulaLine).toBe(true);
  await shot(sheet, "062-sheets");
  await sheet.locator(".ow-menu-overflow").click();
  for (const label of ["Archivo", "Editar", "Ver", "Insertar", "Formato", "Herramientas", "Ayuda"]) {
    await expect(sheet.getByRole("menuitem", { name: label, exact: true })).toBeVisible();
  }
  await sheet.keyboard.press("Escape");
  if (restoreWide && sheetSize) await sheet.setViewportSize({ width: sheetSize.width, height: sheetSize.height });
  await expect(sheet.getByRole("button", { name: /^A1(\s|$)/ })).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Fórmula o valor" })).toBeVisible();
  await expect(sheet.locator(".ow-sheet-cols")).toHaveCSS("position", "sticky");
  const wrap = sheet.locator(".ow-sheet-wrap");
  await wrap.evaluate((node) => {
    node.scrollLeft = 160;
  });
  await expect.poll(() => wrap.evaluate((node) => node.scrollLeft)).toBeGreaterThan(40);

  const formula = sheet.getByRole("textbox", { name: "Fórmula o valor" });
  await sheet.getByRole("button", { name: /^A2(\s|$)/ }).click();
  await formula.fill("1");
  await sheet.getByRole("button", { name: /^A3(\s|$)/ }).click();
  await formula.fill("10");
  await menu(sheet, "Formato", "Escala de color");
  await expect(sheet.getByRole("button", { name: /^A2 / })).toHaveCSS("background-color", "rgb(255, 244, 184)");
  await expect(sheet.getByRole("button", { name: /^A3 / })).toHaveCSS("background-color", "rgb(11, 93, 54)");

  await sheet.getByRole("button", { name: /^F2(\s|$)/ }).click();
  await formula.fill("Ana");
  await sheet.getByRole("button", { name: /^F3(\s|$)/ }).click();
  await formula.fill("Luis");
  await sheet.getByRole("button", { name: /^H1(\s|$)/ }).click();
  await formula.fill("=CONSULTA(F2:F3)");
  await expect(sheet.getByRole("button", { name: /^H1 / })).toContainText("Ana | Luis");

  await sheet.getByRole("button", { name: /^A1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("check");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByRole("checkbox", { name: "Casilla", exact: true }).check();
  await expect(sheet.getByRole("button", { name: /^A1 / })).toContainText("TRUE");

  await sheet.getByRole("button", { name: /^B1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("date");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByLabel("Fecha", { exact: true }).fill("2026-10-17");
  await expect(sheet.getByRole("button", { name: /^B1 / })).toContainText("2026-10-17");

  await sheet.getByRole("button", { name: /^C1(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Validación");
  await sheet.getByRole("dialog").getByLabel("Tipo").selectOption("range");
  await sheet.locator("#ow-range-min").fill("1");
  await sheet.locator("#ow-range-max").fill("9");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await sheet.getByLabel("Intervalo", { exact: true }).fill("5");
  await expect(sheet.getByRole("button", { name: /^C1 / })).toContainText("5");

  await sheet.getByRole("button", { name: /^D1(\s|$)/ }).click();
  await menu(sheet, "Insertar", "Nota de celda");
  await sheet.getByRole("dialog").getByLabel("Nota de celda").fill("aviso");
  await sheet.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /^D1(\s|$)/ })).toHaveAttribute("title", "aviso");

  await sheet.getByRole("button", { name: /^E1(\s|$)/ }).click();
  const chooser = sheet.waitForEvent("filechooser");
  await menu(sheet, "Insertar", "Imagen en la celda");
  await (await chooser).setFiles({ name: "punto.png", mimeType: "image/png", buffer: TINY_PNG });
  await expect(sheet.getByRole("button", { name: /^E1(\s|$)/ })).toHaveCSS("background-image", /url\(/);

  await sheet.getByRole("button", { name: /^G1(\s|$)/ }).click();
  const bold = sheet.getByRole("button", { name: "Negrita", exact: true });
  if (!(await bold.isVisible())) await sheet.getByRole("button", { name: "Formato", exact: true }).click();
  await bold.click();
  if (await sheet.locator(".ow-sheet-tools.is-sheet").isVisible()) await sheet.getByRole("button", { name: "Formato", exact: true }).click();
  await menu(sheet, "Herramientas", "Grabar macro");
  await sheet.getByRole("button", { name: /^G2(\s|$)/ }).click();
  await menu(sheet, "Herramientas", "Ejecutar macro");
  await expect(sheet.getByRole("button", { name: /^G2(\s|$)/ })).toHaveAttribute("data-bold", "true");

  await sheet.getByRole("button", { name: /^F2 / }).click();
  await menu(sheet, "Herramientas", "Tabla dinámica");
  await expect(sheet.getByRole("tab", { name: "Tabla dinámica" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByRole("button", { name: /^A2 / })).toContainText("Ana");
  await expect(sheet.getByRole("button", { name: /^B2 / })).toContainText("1");
  await expect(sheet.getByRole("button", { name: /^A3 / })).toContainText("Luis");
  await fits(sheet, "hoja");
  await axe(sheet);
});

test("la presentación encaja, anima, muestra cuadrícula y patrón", async ({ page }) => {
  const slides = await openHomeTool(page, "Nueva presentación");
  const canvas = slides.locator(".ow-slide-canvas").last();
  const box = await canvas.boundingBox();
  const viewport = slides.viewportSize();
  if (!box || !viewport) throw new Error("falta el lienzo");
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  await expect(slides.locator(".ow-filmstrip")).toBeVisible();
  await menu(slides, "Formato", "Animar objeto");
  await expect(slides.locator(".ow-anim-fade").first()).toBeVisible();
  await menu(slides, "Ver", "Cuadrícula");
  await expect(slides.getByRole("list").getByRole("listitem").first()).toBeVisible();
  await menu(slides, "Ver", "Patrón");
  await expect(slides.locator(".ow-master")).toHaveText("Patrón");
  await fits(slides, "presentación");
  await axe(slides);
  await shot(slides, "061-slides");
});

test("el formulario acepta un archivo y un vídeo locales", async ({ page }) => {
  const form = await openHomeTool(page, "Nuevo formulario");
  await form.locator(".ow-form-card").getByLabel("Tipo").selectOption({ label: "Subida de archivo" });
  await form.getByRole("button", { name: "Vista previa", exact: true }).click();
  const file = form.locator(".ow-form-card input[type='file']");
  await file.setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  await expect(form.locator(".ow-form-card").getByText("nota.txt")).toBeVisible();
  await form.getByRole("button", { name: "Editar", exact: true }).click();
  await form.locator(".ow-form-card").getByLabel("Tipo").selectOption({ label: "Vídeo" });
  await form.getByRole("button", { name: "Vista previa", exact: true }).click();
  await expect(form.locator(".ow-form-card input[type='file']")).toHaveAttribute("accept", "video/*");
  await fits(form, "formulario");
  await axe(form);
  await shot(form, "061-forms");
});

test("el dibujo inserta texto decorado y un diagrama", async ({ page }) => {
  const drawing = await openHomeTool(page, "Nuevo dibujo");
  const canvas = drawing.locator(".ow-draw-canvas");
  const box = await canvas.boundingBox();
  const viewport = drawing.viewportSize();
  if (!box || !viewport) throw new Error("falta el lienzo");
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  await menu(drawing, "Insertar", "Texto decorado");
  await expect(canvas.getByRole("button", { name: "ORVUPI", exact: true })).toBeVisible();
  await menu(drawing, "Insertar", "Diagrama");
  await expect(canvas.getByRole("button", { name: "Forma" })).toHaveCount(2);
  await fits(drawing, "dibujo");
  await axe(drawing);
  await shot(drawing, "061-drawings");
});

test("las notas se filtran desde su propio buscador", async ({ page }) => {
  const notes = await openHomeTool(page, "Nueva nota");
  await notes.locator(".ow-note-editor").getByRole("textbox", { name: "Nombre del archivo", exact: true }).fill("faro");
  await expect(notes.locator(".ow-note-editor").getByRole("status")).toHaveText("Cambios pendientes");
  await expect(notes.locator(".ow-note-editor").getByRole("status")).toHaveText("Guardado");
  await notes.getByLabel("Buscar en notas", { exact: true }).fill("faro");
  await expect(notes.locator(".ow-note-card", { hasText: "faro" })).toBeVisible();
  await notes.getByLabel("Buscar en notas", { exact: true }).fill("zzz");
  await expect(notes.locator(".ow-note-card", { hasText: "faro" })).toHaveCount(0);
  await fits(notes, "notas");
  await axe(notes);
  await shot(notes, "061-notes");
});

test("un id desconocido avisa en cada editor y vuelve a Drive", async ({ page }) => {
  const paths = [
    "/document/d/no-esta/edit",
    "/spreadsheets/d/no-esta/edit",
    "/presentation/d/no-esta/edit",
    "/forms/d/no-esta/edit",
    "/drawings/d/no-esta/edit",
    "/notes/d/no-esta/edit",
  ];
  for (const path of paths) {
    await page.goto(path);
    const card = page.locator(".ow-missing");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Este archivo no está en este dispositivo");
    await expect(card.getByRole("button", { name: "Volver a Drive", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Volver a Drive", exact: true }).click();
  await expect(page.locator(".ow-drive-title")).toBeVisible();
  await shot(page, "061-missing");
});

test("no hay desbordamiento en 360, 390, 412, 460 ni 768", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Pixel 7 e iPhone 14 ya comprueban su propio ancho");
  test.setTimeout(180_000);
  await page.goto("/");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await fits(page, `inicio ${width}`);
  }
  const tools = ["Nuevo documento", "Nueva hoja", "Nueva presentación", "Nuevo formulario", "Nuevo dibujo", "Nueva nota"] as const;
  for (const name of tools) {
    await page.setViewportSize({ width: 1360, height: 900 });
    const tool = await openHomeTool(page, name);
    for (const width of WIDTHS) {
      await tool.setViewportSize({ width, height: 800 });
      await fits(tool, `${name} ${width}`);
    }
    await tool.close();
  }
});
