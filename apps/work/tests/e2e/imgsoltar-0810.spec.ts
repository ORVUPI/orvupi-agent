import { expect, test, type Page, type Locator } from "@playwright/test";

/**
 * 0.8.10: lo que se ve al soltar es lo que queda.
 * - Redimensionar por cualquier lado (n, s, e, o) se mantiene al soltar y conserva la proporción, en todos los modos.
 * - Mover desde el modo por defecto («En línea») con una sola línea de texto: la imagen queda donde se suelta
 *   (pasa a «Delante», el texto no se mueve), dentro de la página, y no vuelve atrás ni salta a la esquina.
 */

async function newDoc(page: Page, paragraphs = 3, text?: string) {
  await page.goto("/");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await opened;
  await doc.setViewportSize(page.viewportSize()!);
  const editor = doc.locator(".ProseMirror");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  for (let i = 0; i < paragraphs; i++) {
    await doc.keyboard.type(text ?? `Párrafo ${i + 1} de prueba de ORVUPI Work.`);
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

type Box = { x: number; y: number; width: number; height: number };

/** Arrastre con ratón (escritorio) o con el dedo (CDP en Chromium móvil; ratón en el resto). */
async function drag(doc: Page, from: { x: number; y: number }, to: { x: number; y: number }, touch: boolean, before?: () => Promise<void>) {
  const steps = 10;
  if (touch) {
    const cdp = await doc.context().newCDPSession(doc);
    const t = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await t("touchStart", from.x, from.y);
    for (let i = 1; i <= steps; i++) await t("touchMove", from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    if (before) await before();
    await t("touchEnd", 0, 0);
    return;
  }
  await doc.mouse.move(from.x, from.y);
  await doc.mouse.down();
  for (let i = 1; i <= steps; i++) await doc.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  if (before) await before();
  await doc.mouse.up();
}

const mid = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

async function setWrap(doc: Page, img: Locator, label: string, value: string) {
  await select(doc, img);
  await doc.getByRole("button", { name: "Opciones de imagen" }).click();
  await doc.getByRole("menuitemradio", { name: label }).click();
  await expect(img).toHaveAttribute("data-wrap", value);
}

/** Espera a que la imagen deje de moverse (paginación, carga) y devuelve su caja. */
async function settled(doc: Page, img: Locator) {
  let last = "";
  for (let i = 0; i < 20; i++) {
    await doc.waitForTimeout(120);
    const b = (await img.boundingBox())!;
    const k = [b.x, b.y, b.width, b.height].map((v) => v.toFixed(1)).join(",");
    if (k === last) return b;
    last = k;
  }
  return (await img.boundingBox())!;
}

for (const [label, wrap] of [["En línea", "inline"], ["Ajustar texto", "square"], ["Detrás", "behind"], ["Delante", "front"]] as const) {
  test(`lados n/s/e/o en «${label}»: el tamaño se mantiene al soltar y conserva la proporción`, async ({ page, browserName, isMobile }) => {
    const { doc } = await newDoc(page, 2);
    const img = await pasteImage(doc, 600, 400);
    if (wrap !== "inline") await setWrap(doc, img, label, wrap);
    const vp = doc.viewportSize()!;
    // Empezar pequeña para poder crecer por todos los lados.
    await select(doc, img);
    const se = (await doc.locator(".ow-imgframe .is-se").boundingBox())!;
    const r0 = (await img.boundingBox())!;
    const target = Math.min(220, vp.width * 0.45);
    await drag(doc, mid(se), { x: mid(se).x - (r0.width - target), y: mid(se).y - (r0.height - (target * 2) / 3) }, false);
    await expect.poll(async () => Number(await img.getAttribute("width"))).toBeLessThan(r0.width - 20);
    for (const [h, dx, dy] of [["s", 0, 40], ["e", 40, 0], ["n", 0, -30], ["w", -30, 0]] as const) {
      await select(doc, img);
      const before = await settled(doc, img);
      const hb = (await doc.locator(`.ow-imgframe .is-${h}`).boundingBox())!;
      let preview: Box | null = null;
      await drag(doc, mid(hb), { x: Math.max(4, mid(hb).x + dx), y: mid(hb).y + dy }, browserName === "chromium" && !!isMobile, async () => {
        await doc.waitForTimeout(80);
        preview = await img.boundingBox();
      });
      const after = await settled(doc, img);
      // Creció de verdad y se quedó así al soltar (antes volvía al tamaño original).
      expect(after.width, `lado ${h}`).toBeGreaterThan(before.width + 10);
      expect(Math.abs(after.width - preview!.width), `lado ${h}: ancho = vista previa`).toBeLessThanOrEqual(2);
      expect(Math.abs(after.height - preview!.height), `lado ${h}: alto = vista previa`).toBeLessThanOrEqual(2);
      // Proporción conservada (3:2).
      expect(Math.abs(after.width / after.height - 1.5), `lado ${h}: proporción`).toBeLessThan(0.03);
      expect(Math.abs(Number(await img.getAttribute("width")) - after.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(Number(await img.getAttribute("height")) - after.height)).toBeLessThanOrEqual(1.5);
    }
    await doc.close();
  });
}

test("una línea de texto + imagen pegada: arrastrar a la derecha y al centro la deja exactamente donde se suelta", async ({ page, browserName, isMobile }) => {
  const { doc } = await newDoc(page, 1, "ZCXZCzXC");
  const vp = doc.viewportSize()!;
  const img = await pasteImage(doc, 900, 600);
  await select(doc, img);
  // Tamaño razonable para tener sitio a la derecha.
  const se = (await doc.locator(".ow-imgframe .is-se").boundingBox())!;
  const r0 = (await img.boundingBox())!;
  const w = Math.min(240, vp.width * 0.4);
  await drag(doc, mid(se), { x: mid(se).x - (r0.width - w), y: mid(se).y - (r0.height - (w * 2) / 3) }, false);
  await expect.poll(async () => Number(await img.getAttribute("width"))).toBeLessThan(r0.width - 20);
  expect((await img.getAttribute("data-wrap")) ?? "inline").toBe("inline");
  const touch = browserName === "chromium" && !!isMobile;
  const text = doc.locator(".ProseMirror p", { hasText: "ZCXZCzXC" });
  const textTop = async () => (await text.boundingBox())!.y + (await doc.locator(".ow-docs-scroll").first().evaluate((el) => el.scrollTop).catch(() => 0));
  const t0 = await textTop();
  for (const [name, fx, fy] of [["derecha", 0.6, 0.1], ["centro", 0.3, 0.25], ["izquierda arriba", 0.05, 0.02]] as const) {
    await select(doc, img);
    const start = await settled(doc, img);
    const c = await content(doc);
    const want = { x: c.left + (c.right - c.left - start.width) * fx, y: c.top + 30 + fy * (vp.width < 600 ? 160 : 1400) };
    let preview: Box | null = null;
    const m = mid(start);
    const scroll = () => doc.locator(".ow-docs-scroll").first().evaluate((el) => el.scrollTop).catch(() => 0);
    const s0 = await scroll();
    await drag(doc, m, { x: m.x + (want.x - start.x), y: m.y + (want.y - start.y) }, touch, async () => {
      await doc.waitForTimeout(80);
      preview = await img.boundingBox();
    });
    const after = await settled(doc, img);
    want.y -= (await scroll()) - s0;
    expect(Math.abs(after.x - preview!.x), `${name}: x = vista previa`).toBeLessThanOrEqual(2);
    expect(Math.abs(after.y - preview!.y), `${name}: y = vista previa`).toBeLessThanOrEqual(2);
    expect(Math.abs(after.x - want.x), `${name}: x donde se soltó`).toBeLessThanOrEqual(3);
    expect(Math.abs(after.y - want.y), `${name}: y donde se soltó`).toBeLessThanOrEqual(3);
    expect(Math.abs(after.width - start.width)).toBeLessThanOrEqual(1);
    // Dentro de la página.
    expect(after.x).toBeGreaterThanOrEqual(c.left - 0.5);
    expect(after.x + after.width).toBeLessThanOrEqual(c.right + 0.5);
    await expect(img).toHaveAttribute("data-wrap", "front");
    // Sigue ahí un rato después (no vuelve atrás).
    await doc.waitForTimeout(600);
    const later = (await img.boundingBox())!;
    expect(Math.abs(later.x - after.x) + Math.abs(later.y - after.y)).toBeLessThanOrEqual(1);
  }
  // El texto sigue ahí, arriba (no se ha movido).
  await expect(doc.locator(".ProseMirror")).toContainText("ZCXZCzXC");
  expect(Math.abs((await textTop()) - t0)).toBeLessThanOrEqual(2);
  await doc.close();
});
