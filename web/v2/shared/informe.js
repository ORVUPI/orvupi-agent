/**
 * Informe descargable de una consulta.
 * Se dibuja y se guarda en este navegador. No se envía a ningún servidor.
 * El resumen es el de la lectura ya publicada: qué se comprobó, qué requiere
 * atención y qué falta. Un fallo no pasa al bloque comprobado.
 */

import { formatReadingStamp } from "./notebook-model.js";

export const REPORT_PNG = "informe.png";
export const REPORT_PDF = "informe.pdf";
export const REPORT_REVOKE_MS = 60_000;

export const REPORT_FOOTER = Object.freeze({
  es: "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión",
  en: "High-risk crypto · You could lose everything · Not investment advice",
});

export const REPORT_LIMITS = Object.freeze({
  es: [
    "Es una lectura de datos públicos en el momento indicado. Puede haber cambiado.",
    "No es una auditoría, ni un aval, ni una recomendación.",
    "Lo que no se pudo leer no aparece como comprobado.",
    "Que no aparezca una señal no significa que no haya riesgo.",
  ],
  en: [
    "It is a reading of public data at the time stated. It may have changed.",
    "It is not an audit, an endorsement, or a recommendation.",
    "What could not be read does not appear as checked.",
    "A signal not showing does not mean there is no risk.",
  ],
});

const COPY = {
  es: {
    title: "Informe",
    action: "Informe descargable",
    local: "Se crea en este navegador y no se envía a ningún servidor.",
    png: "Descargar PNG",
    pdf: "Descargar PDF",
    preparing: "Preparando el archivo…",
    saved: "Archivo listo en este navegador.",
    fail: "No se pudo crear el archivo en este navegador. No se ha enviado a ningún servidor.",
    pdfFail: "El PDF no se pudo crear en este navegador. El PNG sigue disponible.",
    network: "Red",
    address: "Dirección",
    networkMissing: "Red no indicada",
    addressMissing: "Dirección no indicada",
    dateMissing: "Fecha no indicada · puede haber cambiado",
    limits: "Límites",
  },
  en: {
    title: "Report",
    action: "Downloadable report",
    local: "It is created in this browser and is not sent to any server.",
    png: "Download PNG",
    pdf: "Download PDF",
    preparing: "Preparing the file…",
    saved: "The file is ready in this browser.",
    fail: "The file could not be created in this browser. It was not sent to any server.",
    pdfFail: "The PDF could not be created in this browser. The PNG is still available.",
    network: "Network",
    address: "Address",
    networkMissing: "Network not stated",
    addressMissing: "Address not stated",
    dateMissing: "Date not stated · this may have changed",
    limits: "Limits",
  },
};

const HIDDEN = /[\u0000-\u001F\u007F-\u009F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFFD\p{Cf}]/gu;
const FAILED_LEAD = /no se pudo|could not|no se leyó|was not read|no respondió|did not respond|vino vacía|came back empty/i;

const COLORS = {
  abyss: "#071422",
  panel: "#10243f",
  cream: "#f9e6d0",
  pink: "#fb437f",
  line: "#8eaccf",
  attention: "#ffe3ad",
  gem: "#1beb91",
};

export function pageLang(doc) {
  const root = doc && doc.documentElement;
  const value = root && (root.lang || root.getAttribute?.("data-lang"));
  return value === "en" ? "en" : "es";
}

export function reportCopy(lang) {
  return COPY[lang === "en" ? "en" : "es"];
}

/** Texto de la cadena listo para el lienzo: normalizado y escapado. */
export function canvasSafeText(value, max = 400) {
  const normalized = String(value ?? "").normalize("NFKC").replace(HIDDEN, "");
  const chars = Array.from(normalized);
  const capped = chars.length > max ? `${chars.slice(0, max).join("")}…` : normalized;
  return capped
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function networkName(network, lang) {
  const copy = reportCopy(lang);
  const clean = String(network ?? "").normalize("NFKC").replace(HIDDEN, "").trim();
  if (/^solana$/i.test(clean)) return "Solana";
  if (!clean) return copy.networkMissing;
  return clean;
}

function pointFailed(item) {
  const es = item?.lead?.es || "";
  const en = item?.lead?.en || "";
  return FAILED_LEAD.test(es) || FAILED_LEAD.test(en);
}

function samePoint(left, right) {
  return left?.title?.es === right?.title?.es && left?.lead?.es === right?.lead?.es;
}

export function reportModel(source, lang) {
  const language = lang === "en" ? "en" : "es";
  const copy = reportCopy(language);
  const summary = source?.summary || { blocks: [], note: null };
  const blocks = Array.isArray(summary.blocks) ? summary.blocks : [];
  const checked = blocks.find((item) => item && item.id === "comprobado") || { items: [], empty: { es: "", en: "" }, heading: { es: "Qué se comprobó", en: "What was checked" } };
  const attention = blocks.find((item) => item && item.id === "atencion") || { items: [], empty: { es: "", en: "" }, heading: { es: "Qué requiere atención", en: "What needs attention" } };
  const missing = blocks.find((item) => item && item.id === "falta") || { items: [], empty: { es: "", en: "" }, heading: { es: "Qué falta", en: "What is missing" } };
  const moved = [];
  const kept = [];
  for (const item of checked.items || []) {
    if (pointFailed(item)) moved.push(item);
    else kept.push(item);
  }
  const missingItems = [...(missing.items || [])];
  for (const item of moved) {
    if (!missingItems.some((other) => samePoint(other, item))) missingItems.push(item);
  }
  const date = datedLine(source?.consultedAt, language, copy);
  const addressRaw = String(source?.mint ?? "").trim();
  return {
    lang: language,
    title: copy.title,
    date,
    networkLabel: copy.network,
    network: networkName(source?.network, language),
    addressLabel: copy.address,
    address: addressRaw || copy.addressMissing,
    blocks: [
      paintBlock(checked, kept, language),
      paintBlock(attention, attention.items || [], language),
      paintBlock({ ...missing, service: missing.service }, missingItems, language),
    ],
    note: summary.note?.lead?.[language] || "",
    limitsLabel: copy.limits,
    limits: REPORT_LIMITS[language].slice(),
    footer: REPORT_FOOTER[language],
  };
}

function paintBlock(block, items, lang) {
  const lines = [];
  for (const item of items) {
    const title = item?.title?.[lang] || "";
    const lead = item?.lead?.[lang] || "";
    const note = item?.note?.[lang] || "";
    if (title || lead) lines.push({ title, lead, note });
  }
  return {
    id: block.id || "falta",
    heading: block.heading?.[lang] || "",
    lines,
    empty: lines.length ? "" : (block.empty?.[lang] || ""),
    service: block.service?.[lang] || "",
  };
}

function datedLine(consultedAt, lang, copy) {
  const date = new Date(consultedAt);
  if (!consultedAt || Number.isNaN(date.getTime())) return copy.dateMissing;
  const stamp = formatReadingStamp(consultedAt, lang, true);
  return lang === "en" ? `Checked on ${stamp} · this may have changed` : `Consultado el ${stamp} · puede haber cambiado`;
}

function paintString(value) {
  return canvasSafeText(value);
}

export function reportPaintLines(model) {
  const lines = [model.title, model.date, model.networkLabel, model.network, model.addressLabel, model.address];
  for (const block of model.blocks) {
    lines.push(block.heading, block.empty, block.service);
    for (const item of block.lines) lines.push(item.title, item.lead, item.note);
  }
  lines.push(model.note, model.limitsLabel, ...model.limits, model.footer);
  return lines.filter(Boolean).map(paintString);
}

const SIZES = { title: 34, date: 16, label: 15, body: 18, address: 16, limits: 16, footer: 15 };

function wrapText(ctx, text, max, size, family) {
  ctx.font = `${size}px ${family}`;
  const source = String(text);
  const words = source.split(" ");
  const rows = [];
  let current = "";
  const take = (word) => {
    let chunk = "";
    for (const char of Array.from(word)) {
      const next = chunk + char;
      if (ctx.measureText(next).width > max && chunk) {
        rows.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    return chunk;
  };
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= max) {
      current = trial;
      continue;
    }
    if (current) rows.push(current);
    current = ctx.measureText(word).width <= max ? word : take(word);
  }
  if (current) rows.push(current);
  if (!rows.length) rows.push("");
  return rows;
}

function layoutRows(ctx, model, width, scale) {
  const pad = 36;
  const inner = width - pad * 2 - 28;
  const rows = [];
  const push = (text, role, extra) => {
    const size = Math.max(12, Math.round(SIZES[role] * scale));
    const family = role === "title" ? "Silkscreen, system-ui, sans-serif" : role === "address" ? "ui-monospace, monospace" : "system-ui, sans-serif";
    const safe = paintString(text);
    for (const row of wrapText(ctx, safe, inner, size, family)) {
      rows.push({ text: row, size, family, role, ...extra });
    }
  };
  push(model.title, "title");
  push(model.date, "date");
  push(model.networkLabel, "label");
  push(model.network, "body");
  push(model.addressLabel, "label");
  push(model.address, "address");
  for (const block of model.blocks) {
    rows.push({ kind: "block", id: block.id, size: 8 });
    push(block.heading, "body", { heading: true, block: block.id });
    if (block.empty) push(block.empty, "body", { block: block.id });
    for (const item of block.lines) {
      if (item.title) push(item.title, "body", { strong: true, block: block.id });
      if (item.lead) push(item.lead, "body", { block: block.id });
      if (item.note) push(item.note, "body", { block: block.id });
    }
    if (block.service) push(block.service, "body", { block: block.id });
  }
  if (model.note) push(model.note, "body");
  rows.push({ kind: "block", id: "limites", size: 8 });
  push(model.limitsLabel, "body", { heading: true, block: "limites" });
  for (const line of model.limits) push(line, "limits", { block: "limites" });
  rows.push({ kind: "gap", size: 14 });
  push(model.footer, "footer");
  const height = pad + rows.reduce((sum, row) => sum + row.size + (row.kind === "block" || row.kind === "gap" ? 10 : 8), 0) + pad;
  return { rows, height, pad };
}

function blockColor(id) {
  if (id === "atencion") return COLORS.pink;
  if (id === "falta") return COLORS.attention;
  if (id === "limites") return COLORS.line;
  return COLORS.gem;
}

export function drawReport(ctx, model, width = 840) {
  let scale = 1;
  let laid = layoutRows(ctx, model, width, scale);
  if (laid.height > 3600) {
    scale = 3600 / laid.height;
    laid = layoutRows(ctx, model, width, scale);
  }
  const height = Math.ceil(laid.height);
  if (ctx.canvas) {
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  }
  ctx.fillStyle = COLORS.abyss;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = COLORS.pink;
  ctx.lineWidth = 8;
  if (typeof ctx.strokeRect === "function") ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.textBaseline = "top";
  const placed = [];
  let y = laid.pad;
  for (const row of laid.rows) {
    if (row.kind === "block" || row.kind === "gap") {
      y += row.size + 10;
      placed.push({ ...row, y });
      continue;
    }
    placed.push({ ...row, y });
    y += row.size + 8;
  }
  const bands = [];
  for (const row of placed) {
    if (row.kind === "block") {
      bands.push({ id: row.id, top: row.y });
      continue;
    }
    if (row.block && bands.length) bands[bands.length - 1].bottom = row.y + row.size;
  }
  for (const band of bands) {
    if (!band.bottom) continue;
    ctx.fillStyle = blockColor(band.id);
    ctx.fillRect(laid.pad - 8, band.top, 6, Math.max(6, band.bottom - band.top));
  }
  const footerRows = placed.filter((row) => row.role === "footer");
  if (footerRows.length) {
    const top = footerRows[0].y - 14;
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(laid.pad - 8, top, width - laid.pad * 2 + 16, 4);
  }
  for (const row of placed) {
    if (!row.text) continue;
    ctx.font = `${row.strong || row.heading ? "700 " : ""}${row.size}px ${row.family}`;
    ctx.fillStyle = row.role === "title" || row.heading ? COLORS.pink : COLORS.cream;
    ctx.fillText(row.text, laid.pad + 12, row.y);
  }
  return { width, height };
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function deflateZlib(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function pdfFromRgba(rgba, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error("imagen");
  if (!rgba || rgba.length < width * height * 4) throw new Error("imagen");
  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) {
    rgb[index * 3] = rgba[index * 4];
    rgb[index * 3 + 1] = rgba[index * 4 + 1];
    rgb[index * 3 + 2] = rgba[index * 4 + 2];
  }
  const compressed = await deflateZlib(rgb);
  const pageW = 540;
  const pageH = Math.max(1, Math.round((pageW * height) / width));
  const encoder = new TextEncoder();
  const content = encoder.encode(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im1 Do\nQ\n`);
  const chunks = [];
  const offsets = [0];
  let cursor = 0;
  const push = (bytes) => {
    chunks.push(bytes);
    cursor += bytes.length;
  };
  const text = (value) => push(encoder.encode(value));
  const obj = (n, body) => {
    offsets[n] = cursor;
    text(`${n} 0 obj\n`);
    push(body);
    text("\nendobj\n");
  };
  text("%PDF-1.4\n");
  obj(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  obj(3, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>`));
  obj(4, concat([
    encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
    content,
    encoder.encode("endstream"),
  ]));
  obj(5, concat([
    encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`),
    compressed,
    encoder.encode("\nendstream"),
  ]));
  const xrefAt = cursor;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let n = 1; n <= 5; n += 1) xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  text(xref);
  return concat(chunks);
}

export function isAndroid(nav) {
  return /Android/i.test(String(nav?.userAgent || ""));
}

export function isIOS(nav) {
  if (!nav) return false;
  const ua = String(nav.userAgent || "");
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1;
}

export function canShareFile(nav, file) {
  if (!file || !nav || typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] }) === true;
  } catch {
    return false;
  }
}

export function savePlan(nav, file) {
  if ((isAndroid(nav) || isIOS(nav)) && canShareFile(nav, file)) return "share";
  return "download";
}

function asFile(blob, filename) {
  if (typeof File !== "function") return null;
  try {
    return new File([blob], filename, { type: blob.type || "application/octet-stream" });
  } catch {
    return null;
  }
}

export async function saveBlob(blob, filename, nav, doc) {
  const file = asFile(blob, filename);
  if (savePlan(nav, file) === "share") {
    try {
      await nav.share({ files: [file], title: filename });
      return "share";
    } catch (error) {
      if (error && error.name === "AbortError") return "cancel";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  doc.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, REPORT_REVOKE_MS);
  return "download";
}

export async function renderReportFiles(model, doc) {
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  if (doc.fonts && typeof doc.fonts.load === "function") {
    await Promise.race([
      doc.fonts.load("700 34px Silkscreen").catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);
  }
  drawReport(ctx, model);
  const png = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  if (!png) return null;
  let pdf = null;
  try {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bytes = await pdfFromRgba(image.data, canvas.width, canvas.height);
    pdf = new Blob([bytes], { type: "application/pdf" });
  } catch {
    pdf = null;
  }
  return { png, pdf };
}

export function reportDownloadBox(source, env) {
  const doc = env.document;
  const box = doc.createElement("div");
  box.className = "informe-descarga";
  const lang = () => pageLang(doc);
  const copy = () => reportCopy(lang());
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", copy().action);
  const title = doc.createElement("p");
  title.className = "informe-titulo";
  title.textContent = copy().action;
  const note = doc.createElement("p");
  note.className = "informe-nota";
  note.textContent = copy().local;
  const actions = doc.createElement("div");
  actions.className = "informe-acciones";
  const status = doc.createElement("p");
  status.className = "informe-estado";
  status.setAttribute("role", "status");
  status.hidden = true;
  const png = doc.createElement("button");
  png.type = "button";
  png.dataset.formato = "png";
  png.textContent = copy().png;
  const pdf = doc.createElement("button");
  pdf.type = "button";
  pdf.dataset.formato = "pdf";
  pdf.textContent = copy().pdf;
  let busy = false;
  async function run(kind) {
    if (busy) return;
    busy = true;
    png.disabled = true;
    pdf.disabled = true;
    status.hidden = false;
    status.textContent = copy().preparing;
    try {
      const model = reportModel(source, lang());
      const files = await renderReportFiles(model, doc);
      const blob = kind === "pdf" ? files?.pdf : files?.png;
      if (!blob) {
        status.textContent = kind === "pdf" ? copy().pdfFail : copy().fail;
        return;
      }
      const mode = await saveBlob(blob, kind === "pdf" ? REPORT_PDF : REPORT_PNG, env.navigator, doc);
      status.textContent = mode === "cancel" ? "" : copy().saved;
      if (mode === "cancel") status.hidden = true;
    } catch {
      status.textContent = copy().fail;
    } finally {
      busy = false;
      png.disabled = false;
      pdf.disabled = false;
    }
  }
  png.addEventListener("click", () => { run("png"); });
  pdf.addEventListener("click", () => { run("pdf"); });
  actions.append(png, pdf);
  box.append(title, note, actions, status);
  return box;
}
