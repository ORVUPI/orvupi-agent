// Recorre TODAS las plantillas profesionales de Studio (todas las categorías).
//  1) miniatura = editor: abre cada plantilla como un usuario (vista previa → «Personalizar») y compara
//     píxel a píxel el lienzo del editor con la miniatura de la galería pintada al mismo tamaño.
//  2) editable: en cada plantilla hay al menos un texto que se edita con doble clic y una imagen que
//     se selecciona y se reemplaza desde la galería.
// Resultado agregado en test-results/studio-todas-*.json para el informe.
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PRO_TEMPLATES } from "../../web/v2/studio/lib/pro-templates.mjs";

const IDS = PRO_TEMPLATES.map((item) => item.id);
const CHUNKS = Number(process.env.STUDIO_CHUNKS || 8);
const MAX_DIFF = Number(process.env.STUDIO_MAX_DIFF || 0.01); // 1 % de píxeles distintos como máximo
const chunkOf = (index) => IDS.filter((_, i) => i % CHUNKS === index);
const OUT = path.resolve("test-results");

test.describe.configure({ mode: "parallel" });
test.setTimeout(20 * 60 * 1000);
test.use({ actionTimeout: 10000, bypassCSP: true });

async function boot(page) {
  await page.goto("/studio/#/plantillas");
  await expect(page.locator(".canva-plantillas")).toBeVisible();
}

async function openTemplate(page, id) {
  // Igual que en la galería: tarjeta → vista previa → Personalizar.
  await page.evaluate((tid) => {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.thumb = tid;
    card.hidden = true;
    document.querySelector("#studio-root").append(card);
    card.click();
    card.remove();
  }, id);
  const personalize = page.locator(`[data-personalizar="${id}"]`).first();
  await expect(personalize).toBeVisible();
  await personalize.click();
  await expect(page.locator(".stage-frame .stage-art .capa").first()).toBeAttached();
  await page.keyboard.press("Escape");
  await settle(page, ".stage-frame .stage-art");
}

async function settle(page, scope) {
  await page.evaluate(async (sel) => {
    await document.fonts.ready;
    const imgs = [...document.querySelectorAll(`${sel} img`)];
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth ? null : new Promise((ok) => {
      img.loading = "eager";
      img.addEventListener("load", ok, { once: true });
      img.addEventListener("error", ok, { once: true });
      setTimeout(ok, 8000);
    }))));
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  }, scope);
}

async function diffRatio(page, a, b) {
  return page.evaluate(async ([pa, pb]) => {
    const bitmap = (b64) => createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" }));
    const [ia, ib] = await Promise.all([bitmap(pa), bitmap(pb)]);
    // A 240 px de ancho (el redondeo de 1 px entre marco y miniatura solo mueve el suavizado del texto),
    // con tolerancia de 1 px de desplazamiento (como pixelmatch):
    // un píxel solo cuenta como distinto si ningún vecino 3×3 de la otra imagen se le parece.
    const w = Math.min(240, ia.width);
    const h = Math.max(1, Math.round((w * ia.height) / ia.width));
    const pixels = (img) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const da = pixels(ia);
    const db = pixels(ib);
    const far = (src, dst, x, y) => {
      const i = (y * w + x) * 4;
      let best = 255;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = (yy * w + xx) * 4;
          const d = Math.max(Math.abs(src[i] - dst[j]), Math.abs(src[i + 1] - dst[j + 1]), Math.abs(src[i + 2] - dst[j + 2]));
          if (d < best) best = d;
        }
      }
      return best > 48;
    };
    let bad = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (far(da, db, x, y) || far(db, da, x, y)) bad += 1;
      }
    }
    return { ratio: bad / (w * h), aspectA: ia.width / ia.height, aspectB: ib.width / ib.height };
  }, [a.toString("base64"), b.toString("base64")]);
}

// Geometría: cada capa en el editor y en la miniatura, normalizada al ancho del lienzo.
async function layout(page, scope) {
  return page.evaluate((sel) => {
    const art = document.querySelector(sel);
    const base = art.getBoundingClientRect();
    return [...art.querySelectorAll(":scope > .capa")].map((node) => {
      const r = node.getBoundingClientRect();
      const img = node.querySelector("img");
      return {
        x: (r.left - base.left) / base.width,
        y: (r.top - base.top) / base.width,
        w: r.width / base.width,
        h: r.height / base.width,
        text: (node.querySelector(".capa-texto, .mini-texto")?.textContent || "").trim(),
        img: img ? (img.getAttribute("src") || "").split("/").pop() : "",
      };
    });
  }, scope);
}

function layoutDiff(a, b) {
  if (a.length !== b.length) return `capas ${a.length} ≠ ${b.length}`;
  for (let i = 0; i < a.length; i += 1) {
    const d = Math.max(Math.abs(a[i].x - b[i].x), Math.abs(a[i].y - b[i].y), Math.abs(a[i].w - b[i].w), Math.abs(a[i].h - b[i].h));
    if (d > 0.006) return `capa ${i} desplazada ${(d * 100).toFixed(2)} %`;
    if (a[i].text !== b[i].text) return `capa ${i} texto distinto`;
    if (a[i].img !== b[i].img) return `capa ${i} imagen distinta`;
  }
  return "";
}

async function thumbShot(page, id, width) {
  await page.evaluate(async ([tid, w]) => {
    const views = await import("/studio/views.mjs");
    document.querySelector("#prueba-miniatura")?.remove();
    const host = document.createElement("div");
    host.id = "prueba-miniatura";
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.top = "0";
    host.style.zIndex = "2147483647";
    host.style.width = `${w}px`;
    host.style.background = "#fff";
    const slot = views.proArt(tid);
    slot.style.borderRadius = "0";
    slot.style.boxShadow = "none";
    host.append(slot);
    document.body.append(host);
  }, [id, width]);
  await settle(page, "#prueba-miniatura");
  const shot = await page.locator("#prueba-miniatura .mini-slot").screenshot({ animations: "disabled" });
  const geometry = await layout(page, "#prueba-miniatura .mini-art");
  await page.evaluate(() => document.querySelector("#prueba-miniatura")?.remove());
  return { shot, geometry };
}

function record(kind, project, chunk, rows) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `studio-todas-${kind}-${project}-${chunk}.json`), JSON.stringify(rows, null, 1));
}

for (let chunk = 0; chunk < CHUNKS; chunk += 1) {
  test(`miniatura = editor en todas las plantillas (${chunk + 1}/${CHUNKS})`, async ({ page }, info) => {
    await boot(page);
    const rows = [];
    for (const id of chunkOf(chunk)) {
      await openTemplate(page, id);
      const frame = page.locator(".stage-frame").first();
      const box = await frame.boundingBox();
      // Solo el lienzo: se ocultan (sin mover nada) el cromo y las barras que flotan encima.
      const editor = await frame.screenshot({ animations: "disabled", style: "body *{visibility:hidden!important}.stage-frame .stage-art,.stage-frame .stage-art *{visibility:visible!important}" });
      const editorGeometry = await layout(page, ".stage-frame .stage-art");
      const { shot: thumb, geometry } = await thumbShot(page, id, box.width);
      const result = await diffRatio(page, editor, thumb);
      const geo = layoutDiff(editorGeometry, geometry);
      rows.push({ id, ...result, capas: editorGeometry.length, geometria: geo || "ok", ok: !geo && result.ratio <= MAX_DIFF && Math.abs(result.aspectA - result.aspectB) < 0.02 });
      if (!rows.at(-1).ok) {
        fs.mkdirSync(path.join(OUT, "studio-todas-fallos"), { recursive: true });
        fs.writeFileSync(path.join(OUT, "studio-todas-fallos", `${info.project.name}-${id}-editor.png`), editor);
        fs.writeFileSync(path.join(OUT, "studio-todas-fallos", `${info.project.name}-${id}-miniatura.png`), thumb);
      }
    }
    record("pixel", info.project.name, chunk, rows);
    expect(rows.filter((row) => !row.ok), "plantillas cuya miniatura no coincide con el editor").toEqual([]);
  });

  test(`texto e imagen editables en todas las plantillas (${chunk + 1}/${CHUNKS})`, async ({ page }, info) => {
    await boot(page);
    const mobile = (page.viewportSize()?.width || 1280) < 900;
    const rows = [];
    for (const id of chunkOf(chunk)) {
      const row = { id, texto: false, imagen: false, paso: "abrir" };
      await openTemplate(page, id);
      // Busca, como haría una persona, un texto y una foto visibles y no tapados por otra capa.
      const pick = async (kind) => page.evaluate((k) => {
        const art = document.querySelector(".stage-frame .stage-art");
        const nodes = [...art.querySelectorAll(`:scope > .capa:has(${k === "texto" ? ".capa-texto" : ".capa-img img"})`)];
        const found = [];
        for (const node of nodes) {
          const r = node.getBoundingClientRect();
          if (r.width < 6 || r.height < 6) continue;
          for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7], [0.2, 0.2]]) {
            const x = r.left + r.width * fx;
            const y = r.top + r.height * fy;
            const hit = document.elementFromPoint(x, y)?.closest(".capa");
            // Una foto bajo un velo o degradado decorativo también es «visible» (el toque la atraviesa).
            const veil = k === "imagen" && hit && hit !== node && !hit.querySelector(".capa-texto, img");
            if (hit === node || veil) { found.push({ id: node.dataset.id, x, y, area: r.width * r.height }); break; }
          }
        }
        found.sort((p, q) => q.area - p.area);
        return found[0] || null;
      }, kind);
      // Texto: doble clic → contenteditable → escribir cambia el texto.
      row.paso = "texto";
      const text = await pick("texto");
      if (text) {
        await page.mouse.dblclick(text.x, text.y);
        const editing = page.locator(`.stage-art [data-edit="${text.id}"][contenteditable='true']`);
        if (await editing.count()) {
          await editing.first().focus();
          await page.keyboard.press("Control+End");
          await page.keyboard.type("✓");
          row.texto = ((await editing.first().textContent()) || "").includes("✓");
        }
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
      }
      // Imagen: clic → marco de selección → Reemplazar → elegir otra foto → la imagen cambia.
      row.paso = "imagen";
      const photo = await pick("imagen");
      if (photo) {
        const img = page.locator(`.stage-frame .stage-art .capa[data-id="${photo.id}"] img`).first();
        const before = await img.getAttribute("src");
        await page.mouse.click(photo.x, photo.y);
        const selected = page.locator(`.stage-sel .sel-box[data-sel="${photo.id}"]`);
        await selected.waitFor({ state: "attached", timeout: 3000 }).catch(() => {});
        if (await selected.count()) {
          const replace = page.locator(mobile ? ".m-chrome .m-bar [data-m-sheet='reemplazar']" : ".barra-texto [data-m-sheet='reemplazar']").first();
          if (await replace.count()) {
            row.paso = "reemplazar";
            await replace.click();
            const options = page.locator(".m-sheet-body [data-m-replace]");
            await options.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
            const total = await options.count();
            for (let i = 0; i < Math.min(total, 8); i += 1) {
              const src = (await options.nth(i).locator("img").first().getAttribute("src").catch(() => "")) || "";
              if (before && src && before.split("/").pop() === src.split("/").pop()) continue;
              await options.nth(i).scrollIntoViewIfNeeded();
              await options.nth(i).click();
              break;
            }
            await page.waitForTimeout(150);
            const after = await page.locator(`.stage-frame .stage-art .capa[data-id="${photo.id}"] img`).first().getAttribute("src").catch(() => null);
            row.imagen = Boolean(after) && after !== before;
          }
        }
        await page.keyboard.press("Escape");
      }
      row.paso = "fin";
      rows.push(row);
      record("editable", info.project.name, chunk, rows);
    }
    record("editable", info.project.name, chunk, rows);
    expect(rows.filter((row) => !row.texto || !row.imagen), "plantillas sin texto o imagen editable").toEqual([]);
  });
}
