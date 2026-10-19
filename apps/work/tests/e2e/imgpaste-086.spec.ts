import { expect, test, type Page } from "@playwright/test";

/** 0.8.6: imagen PEGADA (portapapeles) — nunca sale de la página, redimensionar sin parpadeo, mover y marco recortado al hacer scroll. */

async function newDoc(page: Page, paragraphs = 3) {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.setViewportSize(page.viewportSize()!);
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  for (let i = 0; i < paragraphs; i++) {
    await doc.keyboard.type(`Párrafo ${i + 1} de prueba de ORVUPI Work.`);
    await doc.keyboard.press("Enter");
  }
  return { doc, editor };
}

/** Pega una imagen generada (W×H) como si viniera del portapapeles (evento paste con un File). */
async function pasteImage(doc: Page, w: number, h: number) {
  await doc.evaluate(async ({ w, h }) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = "#102032";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e0245e";
    g.fillRect(0, 0, w / 2, h / 2);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "image.png", { type: "image/png" }));
    const target = document.querySelector(".ProseMirror")!;
    // Evento paste con clipboardData (Firefox ignora clipboardData en el constructor de ClipboardEvent).
    const ev = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "clipboardData", { value: dt });
    target.dispatchEvent(ev);
  }, { w, h });
  const img = doc.locator(".ProseMirror img").first();
  await expect(img).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  return img;
}

const content = (doc: Page) =>
  doc.locator(".ProseMirror").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight), top: r.top + parseFloat(cs.paddingTop), bottom: r.bottom - parseFloat(cs.paddingBottom) };
  });

async function select(doc: Page, img: ReturnType<Page["locator"]>) {
  if (!(await doc.locator(".ow-imgframe").isVisible().catch(() => false))) await img.click({ force: true });
  await expect(doc.locator(".ow-imgframe")).toBeVisible();
}

/** Desplaza el contenedor de la página para dejar la imagen centrada en la vista. */
const center = (img: ReturnType<Page["locator"]>) =>
  img.evaluate((el) => {
    const sc = el.closest(".ow-docs-scroll") as HTMLElement | null;
    if (!sc) return el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    const s = sc.getBoundingClientRect();
    sc.scrollTop += r.top + r.height / 2 - (s.top + s.height / 2);
  });

test("pegar una imagen más ancha que la página: queda dentro de los márgenes", async ({ page }) => {
  const { doc } = await newDoc(page);
  const img = await pasteImage(doc, 2400, 1600);
  const r = (await img.boundingBox())!;
  const c = await content(doc);
  expect(r.x).toBeGreaterThanOrEqual(c.left - 0.5);
  expect(r.x + r.width).toBeLessThanOrEqual(c.right + 0.5);
  expect(Number(await img.getAttribute("width"))).toBeLessThanOrEqual(Math.ceil(c.right - c.left));
  // Proporción natural
  expect(Math.abs(r.width / r.height - 1.5)).toBeLessThan(0.02);
  await doc.close();
});

test("pegar con Ctrl+V real del portapapeles (Chromium)", async ({ page, browserName, context }) => {
  test.skip(browserName !== "chromium", "El portapapeles de imágenes solo se puede escribir en Chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { doc, editor } = await newDoc(page);
  await doc.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 1200;
    c.getContext("2d")!.fillRect(0, 0, 1600, 1200);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  });
  await editor.focus();
  await doc.keyboard.press("ControlOrMeta+V");
  const img = editor.locator("img").first();
  await expect(img).toBeVisible({ timeout: 20_000 });
  const r = (await img.boundingBox())!;
  const c = await content(doc);
  expect(r.x).toBeGreaterThanOrEqual(c.left - 0.5);
  expect(r.x + r.width).toBeLessThanOrEqual(c.right + 0.5);
  await doc.close();
});

test("redimensionar por la esquina sin parpadeo: tamaño monótono, proporción constante, dentro de la página", async ({ page }) => {
  const { doc } = await newDoc(page, 25);
  const img = await pasteImage(doc, 1200, 1800);
  await select(doc, img);
  // Dejar la esquina inferior a la vista (la imagen es más alta que la pantalla).
  await img.evaluate((el) => {
    const sc = el.closest(".ow-docs-scroll") as HTMLElement;
    const r = el.getBoundingClientRect();
    const s = sc.getBoundingClientRect();
    sc.scrollTop += r.bottom - (s.bottom - 120);
  });
  await doc.waitForTimeout(300);
  const c0 = await content(doc);
  const pageW = c0.right - c0.left;
  // Muestreo en cada frame durante el arrastre.
  await doc.evaluate(() => {
    const w = window as unknown as { __s: number[][]; __stop: boolean };
    w.__s = [];
    w.__stop = false;
    const loop = () => {
      const i = document.querySelector(".ProseMirror img") as HTMLImageElement | null;
      if (i) {
        const r = i.getBoundingClientRect();
        w.__s.push([r.width, r.height, document.querySelectorAll(".ow-imgframe-size").length]);
      }
      if (!w.__stop) requestAnimationFrame(loop);
    };
    loop();
  });
  const box = (await doc.locator(".ow-imgframe").boundingBox())!;
  // Si la esquina inferior no se ve, se usa la superior derecha.
  const area = await doc.locator(".ow-imglayer").boundingBox();
  const useBottom = area ? box.y + box.height < area.y + area.height - 10 : true;
  const h = (await doc.locator(`.ow-imgframe .is-${useBottom ? "se" : "ne"}`).boundingBox())!;
  const sx = h.x + h.width / 2;
  const sy = h.y + h.height / 2;
  await doc.mouse.move(sx, sy);
  await doc.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await doc.mouse.move(sx - i * 12, sy + (useBottom ? -1 : 1) * i * 9);
    await doc.waitForTimeout(16);
  }
  const shrink = await doc.evaluate(() => (window as unknown as { __s: number[][] }).__s.length);
  // Crecer mucho: nunca más que el ancho de la página.
  // Volver por la misma diagonal y seguir hacia fuera (siempre dentro de la ventana).
  const vpw = doc.viewportSize()!;
  const dir = useBottom ? -1 : 1;
  for (let i = 1; i <= 25; i++) {
    const k = 15 - i;
    await doc.mouse.move(Math.max(4, Math.min(vpw.width - 4, sx - k * 12)), Math.max(4, Math.min(vpw.height - 4, sy + dir * k * 9)));
    await doc.waitForTimeout(16);
  }
  await doc.mouse.up();
  await doc.waitForTimeout(200);
  const samples = await doc.evaluate(() => {
    const w = window as unknown as { __s: number[][]; __stop: boolean };
    w.__stop = true;
    return w.__s;
  });
  const down = samples.slice(0, shrink);
  const up = samples.slice(shrink);
  for (let i = 1; i < down.length; i++) expect(down[i]![0]!).toBeLessThanOrEqual(down[i - 1]![0]! + 0.5);
  for (let i = 1; i < up.length; i++) expect(up[i]![0]!).toBeGreaterThanOrEqual(up[i - 1]![0]! - 0.5);
  for (const [w = 0, hh = 1, tip = 0] of samples) {
    expect(Math.abs(w / hh - 2 / 3)).toBeLessThan(0.015);
    expect(w).toBeLessThanOrEqual(pageW + 1);
    expect(tip).toBe(0);
  }
  expect(Math.min(...down.map((s) => s[0] ?? 0))).toBeLessThan((down[0]?.[0] ?? 0) - 60);
  const final = (await img.boundingBox())!;
  const c = await content(doc);
  expect(final.x + final.width).toBeLessThanOrEqual(c.right + 1);
  expect(Math.abs(Number(await img.getAttribute("width")) / Number(await img.getAttribute("height")) - 2 / 3)).toBeLessThan(0.01);
  await doc.close();
});

test("lado con Mayús: cambia una sola dimensión y se mantiene al soltar", async ({ page }) => {
  const { doc } = await newDoc(page);
  const img = await pasteImage(doc, 600, 400);
  await select(doc, img);
  const w0 = Number(await img.getAttribute("width"));
  const s = (await doc.locator(".ow-imgframe .is-s").boundingBox())!;
  await doc.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await doc.keyboard.down("Shift");
  await doc.mouse.down();
  for (let i = 1; i <= 8; i++) await doc.mouse.move(s.x + s.width / 2, s.y + s.height / 2 - i * 8);
  await doc.mouse.up();
  await doc.keyboard.up("Shift");
  await expect.poll(async () => Number(await img.getAttribute("height"))).toBeLessThan(400 * (w0 / 600) - 30);
  expect(Number(await img.getAttribute("width"))).toBe(w0);
  // Lo que se ve es lo guardado (antes volvía a la proporción natural al soltar).
  const r = (await img.boundingBox())!;
  expect(Math.abs(r.height - Number(await img.getAttribute("height")))).toBeLessThanOrEqual(1.5);
  await doc.close();
});

test("imagen pegada: arrastrar desde el centro la mueve entre párrafos («En línea»)", async ({ page }) => {
  const { doc, editor } = await newDoc(page, 4);
  const img = await pasteImage(doc, 300, 150);
  await select(doc, img);
  const cursor = await doc.locator(".ow-imgframe-move").evaluate((el) => getComputedStyle(el).cursor);
  expect(cursor).toBe("move");
  const f = (await doc.locator(".ow-imgframe").boundingBox())!;
  const p2 = (await editor.locator("p", { hasText: "Párrafo 2" }).boundingBox())!;
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  await doc.mouse.move(cx, cy);
  await doc.mouse.down();
  for (let i = 1; i <= 8; i++) await doc.mouse.move(cx, cy + ((p2.y - f.y) * i) / 8);
  await expect(doc.locator(".ow-imgcaret")).toBeVisible();
  await doc.mouse.up();
  await expect(doc.locator(".ow-imgcaret")).toHaveCount(0);
  const order = await editor.evaluate((el) => Array.from(el.children).map((c) => (c.tagName === "IMG" || c.querySelector("img") ? "img" : (c.textContent ?? "").trim().slice(0, 10))));
  expect(order.indexOf("img")).toBeLessThan(order.findIndex((t) => t.startsWith("Párrafo 2")) + 1);
  expect(order.indexOf("img")).toBeLessThan(order.findIndex((t) => t.startsWith("Párrafo 4")));
  await doc.close();
});

test("«Delante»: se mueve libremente y nunca sale de la página", async ({ page }) => {
  const { doc } = await newDoc(page, 10);
  const img = await pasteImage(doc, 200, 140);
  await select(doc, img);
  await doc.getByRole("button", { name: "Opciones de imagen" }).click();
  await doc.getByRole("menuitemradio", { name: "Delante" }).click();
  await expect(img).toHaveAttribute("data-wrap", "front");
  await select(doc, img);
  const f = (await doc.locator(".ow-imgframe").boundingBox())!;
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const vp = doc.viewportSize()!;
  // Muy a la derecha y hacia arriba: se queda en el borde de la página.
  await doc.mouse.move(cx, cy);
  await doc.mouse.down();
  for (let i = 1; i <= 10; i++) await doc.mouse.move(cx + ((vp.width - cx) * i) / 10, cy - i * 15);
  const mid = (await img.boundingBox())!;
  let c = await content(doc);
  expect(mid.x + mid.width).toBeLessThanOrEqual(c.right + 1);
  await doc.mouse.up();
  await doc.waitForTimeout(300);
  const r = (await img.boundingBox())!;
  c = await content(doc);
  expect(r.x).toBeGreaterThanOrEqual(c.left - 1);
  expect(r.x + r.width).toBeLessThanOrEqual(c.right + 1);
  expect(r.y).toBeLessThan(f.y - 40);
  if (c.right - c.left > r.width + 40) expect(r.x + r.width).toBeGreaterThan(c.right - 6);
  // A la izquierda del todo
  await select(doc, img);
  const g = (await doc.locator(".ow-imgframe").boundingBox())!;
  await doc.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await doc.mouse.down();
  for (let i = 1; i <= 10; i++) await doc.mouse.move(g.x + g.width / 2 - i * 80, g.y + g.height / 2 + i * 10);
  await doc.mouse.up();
  await doc.waitForTimeout(300);
  const l = (await img.boundingBox())!;
  c = await content(doc);
  expect(l.x).toBeGreaterThanOrEqual(c.left - 1);
  expect(l.x).toBeLessThan(c.left + 6);
  await doc.close();
});

test("con la imagen seleccionada, al hacer scroll el marco se recorta y no sale sobre la barra", async ({ page }) => {
  const { doc } = await newDoc(page, 20);
  const img = await pasteImage(doc, 800, 600);
  // Texto después de la imagen para poder desplazarla fuera de la vista.
  // Tras pegar, el cursor ya queda detrás de la imagen.
  for (let i = 0; i < 40; i++) await doc.keyboard.press("Enter");
  await select(doc, img);
  await center(img);
  await doc.waitForTimeout(200);
  const scroller = doc.locator(".ow-docs-scroll");
  const area = (await scroller.boundingBox())!;
  // Desplazar hasta que la mitad superior de la imagen quede por encima del área visible.
  const r0 = (await img.boundingBox())!;
  await scroller.evaluate((el, by) => { el.scrollTop += by; }, r0.y - area.y + r0.height / 2);
  await doc.waitForTimeout(250);
  const layer = (await doc.locator(".ow-imglayer").boundingBox())!;
  expect(layer.y).toBeGreaterThanOrEqual(area.y - 0.5);
  // Ningún tirador ni el ⋯ se ve encima del área (barra de herramientas).
  const above = await doc.evaluate((top) => {
    const hits: string[] = [];
    for (const el of Array.from(document.querySelectorAll(".ow-imgframe-h, .ow-imgmore"))) {
      const r = el.getBoundingClientRect();
      if (r.bottom < top - 1) {
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (at && (at === el || el.contains(at))) hits.push(el.className);
      }
    }
    return hits;
  }, area.y);
  expect(above).toEqual([]);
  // El ⋯ sigue visible dentro de la parte visible de la imagen.
  const more = doc.getByRole("button", { name: "Opciones de imagen" });
  await expect(more).toBeVisible();
  expect((await more.boundingBox())!.y).toBeGreaterThanOrEqual(area.y - 0.5);
  // Imagen fuera de la vista: no queda nada flotando.
  await img.evaluate((el) => {
    const sc = el.closest(".ow-docs-scroll") as HTMLElement;
    sc.scrollTop += el.getBoundingClientRect().bottom - sc.getBoundingClientRect().top + 80;
  });
  await doc.waitForTimeout(250);
  await expect(more).toHaveCount(0);
  const visibleBits = await doc.evaluate(() => {
    const layer = document.querySelector(".ow-imglayer")!.getBoundingClientRect();
    return Array.from(document.querySelectorAll(".ow-imgframe-h")).filter((h) => {
      const r = h.getBoundingClientRect();
      return r.bottom > layer.top && r.top < layer.bottom;
    }).length;
  });
  expect(visibleBits).toBe(0);
  await doc.close();
});

test("móvil: mover con el dedo (toque real) solo con la imagen seleccionada", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium" || !test.info().project.use.hasTouch, "Toques reales por CDP solo en Chromium móvil");
  const { doc, editor } = await newDoc(page, 6);
  const img = await pasteImage(doc, 300, 150);
  await editor.locator("p").first().click();
  await expect(doc.locator(".ow-imgframe")).toHaveCount(0);
  const cdp = await doc.context().newCDPSession(doc);
  const touch = async (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await center(img);
  await doc.waitForTimeout(200);
  // Sin seleccionar: el dedo no la mueve (la página puede desplazarse).
  const before = await editor.evaluate((el) => Array.from(el.children).findIndex((c) => c.tagName === "IMG" || !!c.querySelector("img")));
  let r = (await img.boundingBox())!;
  await touch("touchStart", r.x + r.width / 2, r.y + r.height / 2);
  for (let i = 1; i <= 6; i++) await touch("touchMove", r.x + r.width / 2, r.y + r.height / 2 - i * 25);
  await touch("touchEnd", 0, 0);
  await doc.waitForTimeout(300);
  expect(await editor.evaluate((el) => Array.from(el.children).findIndex((c) => c.tagName === "IMG" || !!c.querySelector("img")))).toBe(before);
  // Seleccionada: arrastrar hacia arriba la recoloca antes.
  await select(doc, img);
  r = (await img.boundingBox())!;
  const firstP = (await editor.locator("p").first().boundingBox())!;
  await touch("touchStart", r.x + r.width / 2, r.y + r.height / 2);
  const steps = 10;
  for (let i = 1; i <= steps; i++) await touch("touchMove", r.x + r.width / 2, r.y + r.height / 2 + ((firstP.y - r.y) * i) / steps);
  await touch("touchEnd", 0, 0);
  await doc.waitForTimeout(300);
  const after = await editor.evaluate((el) => Array.from(el.children).findIndex((c) => c.tagName === "IMG" || !!c.querySelector("img")));
  expect(after).toBeLessThan(before);
  await doc.close();
});
