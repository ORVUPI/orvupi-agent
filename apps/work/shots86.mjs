import { chromium, devices } from "@playwright/test";
const [tag, base] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
for (const [name, o] of [["desk", { viewport: { width: 1912, height: 904 } }], ["movil", { ...devices["Pixel 7"] }]]) {
  const ctx = await b.newContext({ ...o, ...(tag === "despues" ? { recordVideo: { dir: `/tmp/rv86-${name}`, size: o.viewport ?? { width: 412, height: 839 } } } : {}) });
  const page = await ctx.newPage();
  await page.goto(base);
  const op = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Nuevo documento", exact: true }).click();
  const doc = await op; const ed = doc.locator(".ProseMirror"); await ed.waitFor({ timeout: 60000 });
  await ed.click();
  for (let i = 0; i < 4; i++) { await doc.keyboard.type(`Párrafo ${i + 1}: texto de ejemplo de ORVUPI Work para ver la imagen pegada.`); await doc.keyboard.press("Enter"); }
  await doc.evaluate(async () => {
    const W = 1200, H = 1800; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#102032"); gr.addColorStop(1, "#e0245e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff"; g.font = "bold 140px sans-serif"; g.fillText("PEGADA", 80, 300); g.strokeStyle = "#fff"; g.lineWidth = 20; g.strokeRect(10, 10, W - 20, H - 20);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const dt = new DataTransfer(); dt.items.add(new File([blob], "image.png", { type: "image/png" }));
    const ev = new Event("paste", { bubbles: true, cancelable: true }); Object.defineProperty(ev, "clipboardData", { value: dt });
    document.querySelector(".ProseMirror").dispatchEvent(ev);
  });
  for (let i = 0; i < 12; i++) { await doc.keyboard.type(`Texto después ${i + 1}.`); await doc.keyboard.press("Enter"); }
  const img = ed.locator("img").first(); await img.waitFor({ timeout: 20000 });
  await doc.waitForTimeout(800);
  await img.click({ force: true }); await doc.waitForTimeout(400);
  await doc.screenshot({ path: `/workspace/ow-shots/img-086-${tag}-pegada-${name}.png` });
  // Esquina inferior a la vista y redimensionar
  await img.evaluate((el) => { const sc = el.closest(".ow-docs-scroll"); const r = el.getBoundingClientRect(); const s = sc.getBoundingClientRect(); sc.scrollTop += r.bottom - (s.bottom - 140); });
  await doc.waitForTimeout(400);
  const se = await doc.locator(".ow-imgframe .is-se").boundingBox();
  if (se) {
    const x = se.x + se.width / 2, y = se.y + se.height / 2;
    await doc.mouse.move(x, y); await doc.mouse.down();
    for (let i = 1; i <= 14; i++) { await doc.mouse.move(x - i * 12, y - i * 18); await doc.waitForTimeout(30); }
    await doc.screenshot({ path: `/workspace/ow-shots/img-086-${tag}-redimensionando-${name}.png` });
    await doc.mouse.up(); await doc.waitForTimeout(400);
  }
  // Seleccionada + scroll: mitad por encima del área visible
  await img.click({ force: true }).catch(() => {}); await doc.waitForTimeout(200);
  await img.evaluate((el) => { const sc = el.closest(".ow-docs-scroll"); const r = el.getBoundingClientRect(); const s = sc.getBoundingClientRect(); sc.scrollTop += r.top - s.top + r.height / 2; });
  await doc.waitForTimeout(400);
  await doc.screenshot({ path: `/workspace/ow-shots/img-086-${tag}-scroll-${name}.png` });
  if (tag === "despues") {
    // Mover: volver a la vista y subirla entre párrafos
    await img.evaluate((el) => el.scrollIntoView({ block: "center" })); await doc.waitForTimeout(300);
    const f = await doc.locator(".ow-imgframe").boundingBox();
    const p1 = await ed.locator("p").first().boundingBox();
    const cx = f.x + f.width / 2, cy = f.y + f.height / 2;
    await doc.mouse.move(cx, cy); await doc.mouse.down();
    for (let i = 1; i <= 12; i++) { await doc.mouse.move(cx, cy + ((p1.y - f.y) * i) / 12); await doc.waitForTimeout(40); }
    await doc.screenshot({ path: `/workspace/ow-shots/img-086-despues-moviendo-${name}.png` });
    await doc.mouse.up(); await doc.waitForTimeout(500);
    await doc.screenshot({ path: `/workspace/ow-shots/img-086-despues-movida-${name}.png` });
  }
  await ctx.close();
}
await b.close();
