/**
 * Informe descargable de una consulta.
 * Se dibuja y se guarda en este navegador. No se envía a ningún servidor.
 * El resumen es el de la lectura ya publicada: qué se comprobó, qué requiere
 * atención y qué falta. Un fallo no pasa al bloque comprobado.
 */

import { SITE_HOST } from "./site.js";

export const REPORT_PNG = "informe.png";
export const REPORT_PDF = "informe.pdf";
export const REPORT_REVOKE_MS = 60_000;

export const REPORT_LIMITS = Object.freeze({
  es: [
    "Es una lectura de datos públicos en el momento indicado. Puede haber cambiado.",
    "No es una auditoría, ni un aval, ni una recomendación.",
    "Lo que no se pudo leer no aparece como comprobado.",
    "Que no aparezcan señales no significa que esté todo comprobado.",
  ],
  en: [
    "It is a reading of public data at the time stated. It may have changed.",
    "It is not an audit, an endorsement, or a recommendation.",
    "What could not be read does not appear as checked.",
    "No signals showing does not mean everything was checked.",
  ],
});

const MADRID = "Europe/Madrid";

const COPY = {
  es: {
    title: "Lectura de Verify · no es un certificado",
    action: "Informe descargable",
    local: "Se crea en este navegador y no se envía a ningún servidor.",
    png: "Descargar PNG",
    pdf: "Descargar PDF",
    preparing: "Preparando el archivo…",
    saved: "Archivo listo en este navegador.",
    fail: "No se pudo crear el archivo en este navegador. No se ha enviado a ningún servidor.",
    pdfFail: "Este navegador no puede crear el PDF. Descarga el PNG, que sigue disponible.",
    network: "Red",
    address: "Dirección",
    networkMissing: "Red no indicada",
    addressMissing: "Dirección no indicada",
    dateMissing: "Fecha no indicada · puede haber cambiado",
    limits: "Límites",
    origin: `Generado en ${SITE_HOST} · herramienta para tokens de terceros`,
    zone: "hora de Madrid",
    checkedOn: "Consultado el",
    mayChange: "puede haber cambiado",
  },
  en: {
    title: "Verify reading · not a certificate",
    action: "Downloadable report",
    local: "It is created in this browser and is not sent to any server.",
    png: "Download PNG",
    pdf: "Download PDF",
    preparing: "Preparing the file…",
    saved: "The file is ready in this browser.",
    fail: "The file could not be created in this browser. It was not sent to any server.",
    pdfFail: "This browser cannot create the PDF. Download the PNG, which is still available.",
    network: "Network",
    address: "Address",
    networkMissing: "Network not stated",
    addressMissing: "Address not stated",
    dateMissing: "Date not stated · this may have changed",
    limits: "Limits",
    origin: `Made on ${SITE_HOST} · not affiliated with third-party tokens`,
    zone: "Madrid time",
    checkedOn: "Checked on",
    mayChange: "this may have changed",
  },
};

const EMPTY_FILE = {
  atencion: {
    en: "No signal in this reading needs attention. No signals showing does not mean everything was checked.",
  },
  falta: {
    en: "No requested fact is missing from this reading.",
  },
};

const NOTHING_TO_NOTE = {
  es: "Nada que destacar en esta lectura. Que no aparezcan señales no significa que esté todo comprobado.",
  en: "Nothing to highlight in this reading. No signals showing does not mean everything was checked.",
};

const CLONE_WARNING = {
  es: "Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato",
  en: "It is named like ORVUPI, but ORVUPI does not have a contract yet",
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
  checked: "#9bb4ce",
};

export function pageLang(doc) {
  const root = doc && doc.documentElement;
  const value = root && (root.lang || root.getAttribute?.("data-lang"));
  return value === "en" ? "en" : "es";
}

export function reportCopy(lang) {
  return COPY[lang === "en" ? "en" : "es"];
}

/** Texto de la cadena listo para el lienzo: normalizado, sin marcas de control. El lienzo no interpreta HTML. */
export function canvasSafeText(value, max = 400) {
  const normalized = String(value ?? "").normalize("NFKC").replace(HIDDEN, "").replace(/\u00A0/g, " ");
  const chars = Array.from(normalized);
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : normalized;
}

export function networkName(network, lang) {
  const copy = reportCopy(lang);
  const clean = String(network ?? "").normalize("NFKC").replace(HIDDEN, "").trim();
  if (/^solana$/i.test(clean)) return "Solana mainnet";
  if (/^base$/i.test(clean)) return "Base";
  if (/^ethereum$/i.test(clean)) return "Ethereum";
  if (/^bnb$/i.test(clean)) return "BNB Chain";
  if (!clean) return copy.networkMissing;
  return clean;
}

export function formatReportWhen(consultedAt, lang) {
  const date = new Date(consultedAt);
  if (!consultedAt || Number.isNaN(date.getTime())) return "";
  const language = lang === "en" ? "en" : "es";
  const parts = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es-ES", {
    timeZone: MADRID,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "long",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const zoneName = pick("timeZoneName");
  const clock = `${pick("day")}-${pick("month")}-${pick("year")} ${pick("hour")}:${pick("minute")}:${pick("second")}`;
  const local = reportCopy(language).zone;
  return zoneName ? `${clock} ${local} · ${zoneName}` : `${clock} ${local}`;
}

function fileWording(text, lang) {
  const source = String(text ?? "");
  const kept = [];
  const masked = source.replace(/«[^»]*»/g, (match) => {
    kept.push(match);
    return `\uE000${kept.length - 1}\uE001`;
  });
  const rewritten = lang === "en"
    ? masked.replace(/·\s*verified\b/gi, "· read on-chain")
    : masked.replace(/·\s*verificado\b/gi, "· leído en la cadena");
  const restored = rewritten.replace(/\uE000(\d+)\uE001/g, (_, index) => kept[Number(index)] || "");
  if (lang !== "en") return restored;
  return restored.replace(/«([^»]*)»/g, "\u201C$1\u201D");
}

function legalEmpty(text, blockId, lang) {
  const source = String(text ?? "").trim();
  if (lang !== "en") return source;
  if (blockId === "atencion" && (source === "No signal." || source.startsWith("No signal in this reading needs attention."))) {
    return EMPTY_FILE.atencion.en;
  }
  if (blockId === "falta" && (source === "Nothing missing." || source === "No requested fact is missing in this reading.")) {
    return EMPTY_FILE.falta.en;
  }
  return source;
}

function isEarlierCheck(item) {
  const title = `${item?.title?.es || ""} ${item?.title?.en || ""}`;
  return /Comprobación anterior|Earlier check/.test(title);
}

function earlierCheckDate(item) {
  const blob = `${item?.lead?.es || ""} ${item?.lead?.en || ""} ${item?.note?.es || ""} ${item?.note?.en || ""}`;
  return /\d{4}-\d{2}-\d{2}/.test(blob);
}

function isCloneLead(item) {
  const es = item?.lead?.es || "";
  const en = item?.lead?.en || "";
  return es.includes(CLONE_WARNING.es) || en.includes(CLONE_WARNING.en);
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
  const attentionItems = (attention.items || []).filter((item) => !isEarlierCheck(item) || earlierCheckDate(item));
  const warningItems = attentionItems.filter(isCloneLead);
  const attentionRest = attentionItems.filter((item) => !isCloneLead(item));
  const warningLead = warningItems.map((item) => item?.lead?.[language] || item?.lead?.es || "").find(Boolean) || "";
  const date = datedLine(source?.consultedAt, language, copy);
  const addressRaw = String(source?.mint ?? "").trim();
  return {
    lang: language,
    title: copy.title,
    date,
    origin: copy.origin,
    warning: fileWording(warningLead, language),
    networkLabel: copy.network,
    network: networkName(source?.network, language),
    addressLabel: copy.address,
    address: addressRaw || copy.addressMissing,
    blocks: [
      paintBlock(checked, kept, language),
      paintBlock(attention, [...warningItems, ...attentionRest], language),
      paintBlock({ ...missing, service: missing.service }, missingItems, language),
    ],
    note: fileWording(summary.note?.lead?.[language] || "", language),
    limitsLabel: copy.limits,
    limits: REPORT_LIMITS[language].slice(),
  };
}

function paintBlock(block, items, lang) {
  const lines = [];
  for (const item of items) {
    const title = fileWording(item?.title?.[lang] || "", lang);
    const lead = fileWording(item?.lead?.[lang] || "", lang);
    const note = fileWording(item?.note?.[lang] || "", lang);
    if (title || lead) lines.push({ title, lead, note });
  }
  const screenEmpty = legalEmpty(block.empty?.[lang] || "", block.id, lang).trim();
  const empty = lines.length ? "" : (screenEmpty || NOTHING_TO_NOTE[lang] || NOTHING_TO_NOTE.es);
  return {
    id: block.id || "falta",
    heading: block.heading?.[lang] || "",
    lines,
    empty: fileWording(empty, lang),
    service: fileWording(block.service?.[lang] || "", lang),
  };
}

function datedLine(consultedAt, lang, copy) {
  const stamp = formatReportWhen(consultedAt, lang);
  if (!stamp) return copy.dateMissing;
  return `${copy.checkedOn} ${stamp} · ${copy.mayChange}`;
}

function paintString(value) {
  return canvasSafeText(value);
}

export function reportPaintLines(model) {
  const lang = model.lang === "en" ? "en" : "es";
  const lines = [model.title, model.date, model.warning, model.origin, model.networkLabel, model.network, model.addressLabel, model.address];
  for (const block of model.blocks) {
    lines.push(block.heading, block.empty, block.service);
    for (const item of block.lines) lines.push(item.title, item.lead, item.note);
  }
  lines.push(model.note, model.limitsLabel, ...model.limits);
  return lines.filter(Boolean).map((line) => paintString(line));
}

const SIZES = { title: 34, date: 16, label: 15, body: 18, address: 16, limits: 16 };

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
  let unitSerial = 0;
  const unit = () => {
    unitSerial += 1;
    return unitSerial;
  };
  const push = (text, role, extra) => {
    const size = Math.max(12, Math.round(SIZES[role] * scale));
    const family = role === "address" ? "ui-monospace, monospace" : "system-ui, sans-serif";
    const safe = paintString(text);
    for (const row of wrapText(ctx, safe, inner, size, family)) {
      rows.push({ text: row, size, family, role, ...extra });
    }
  };
  const header = unit();
  push(model.title, "title", { strong: true, unit: header, header: true });
  push(model.date, "date", { unit: header, header: true });
  if (model.warning) push(model.warning, "body", { heading: true, warning: true, unit: header, header: true });
  push(model.origin, "date", { unit: header, header: true });
  const network = unit();
  push(model.networkLabel, "label", { unit: network });
  push(model.network, "body", { unit: network });
  const address = unit();
  push(model.addressLabel, "label", { unit: address });
  push(model.address, "address", { unit: address });
  for (const block of model.blocks) {
    rows.push({ kind: "block", id: block.id, size: 8 });
    push(block.heading, "body", { heading: true, block: block.id, unit: unit() });
    if (block.empty) push(block.empty, "body", { block: block.id, unit: unit() });
    for (const item of block.lines) {
      const card = unit();
      if (item.title) push(item.title, "body", { strong: true, block: block.id, unit: card });
      if (item.lead) push(item.lead, "body", { block: block.id, unit: card });
      if (item.note) push(item.note, "body", { block: block.id, unit: card });
    }
    if (block.service) push(block.service, "body", { block: block.id, unit: unit() });
  }
  if (model.note) {
    rows.push({ kind: "gap", size: 16 });
    rows.push({ kind: "block", id: "nota", size: 8 });
    push(model.note, "body", { block: "nota", unit: unit() });
  }
  const limits = unit();
  rows.push({ kind: "block", id: "limites", size: 8 });
  push(model.limitsLabel, "body", { heading: true, block: "limites", unit: limits, limits: true });
  for (const line of model.limits) push(line, "limits", { block: "limites", unit: limits, limits: true });
  const height = pad + rows.reduce((sum, row) => sum + row.size + (row.kind === "block" || row.kind === "gap" ? 10 : 8), 0) + pad;
  return { rows, height, pad };
}

function blockColor(id) {
  if (id === "atencion") return COLORS.pink;
  if (id === "falta") return COLORS.attention;
  if (id === "limites" || id === "nota") return COLORS.line;
  return COLORS.checked;
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
  const lines = [];
  const cards = [];
  let y = laid.pad;
  let limitsTop = 0;
  let warningTop = 0;
  let warningBottom = 0;
  let pendingTop = null;
  let card = null;
  const closeCard = () => {
    if (card) cards.push(card);
    card = null;
  };
  for (const row of laid.rows) {
    if (row.kind === "block" || row.kind === "gap") {
      if (row.id === "limites" && !limitsTop) limitsTop = y;
      if (pendingTop === null) pendingTop = y;
      y += row.size + 10;
      placed.push({ ...row, y });
      continue;
    }
    if (row.warning) {
      const top = Math.max(0, Math.floor(y));
      const bottom = Math.min(height, Math.ceil(y + row.size));
      if (!warningBottom) warningTop = top;
      warningBottom = Math.max(warningBottom, bottom);
    }
    const textTop = y;
    const textBottom = y + row.size;
    if (!card || card.unit !== row.unit) {
      closeCard();
      card = {
        unit: row.unit,
        top: pendingTop === null ? textTop : pendingTop,
        bottom: textBottom,
        header: Boolean(row.header),
        limits: Boolean(row.limits),
        heading: Boolean(row.heading) && !row.header && !row.limits,
      };
    } else {
      card.bottom = textBottom;
    }
    pendingTop = null;
    lines.push({ top: textTop, bottom: textBottom, unit: row.unit, header: Boolean(row.header), limits: Boolean(row.limits) });
    placed.push({ ...row, y });
    y += row.size + 8;
  }
  closeCard();
  const bands = [];
  for (const row of placed) {
    if (row.kind === "block") {
      bands.push({ id: row.id, top: row.y });
      continue;
    }
    if (row.block && bands.length && bands[bands.length - 1].id === row.block) {
      bands[bands.length - 1].bottom = row.y + row.size;
    }
  }
  for (const band of bands) {
    if (!band.bottom) continue;
    ctx.fillStyle = blockColor(band.id);
    ctx.fillRect(laid.pad - 8, band.top, 6, Math.max(6, band.bottom - band.top));
  }
  for (const row of placed) {
    if (!row.text) continue;
    ctx.font = `${row.strong || row.heading ? "700 " : ""}${row.size}px ${row.family}`;
    ctx.fillStyle = row.role === "title" || row.heading ? COLORS.pink : COLORS.cream;
    ctx.fillText(row.text, laid.pad + 12, row.y);
  }
  const bodyCards = cards.filter((item) => !item.header && !item.limits && item.top < limitsTop);
  const headerBottom = bodyCards.length ? bodyCards[0].top : limitsTop;
  const kept = [];
  for (let index = 0; index < bodyCards.length - 1; index += 1) {
    const card = bodyCards[index];
    const next = bodyCards[index + 1];
    if (!card.heading || next.heading || next.header || next.limits) continue;
    if (!(next.top > card.bottom && next.bottom > next.top)) continue;
    kept.push({ top: card.top, headingBottom: card.bottom, bottom: next.bottom, cutTop: next.top, cutEnd: card.bottom });
  }
  const skipTops = new Set(kept.map((item) => item.cutTop));
  const skipEnds = new Set(kept.map((item) => item.cutEnd));
  const breaks = [...new Set(bodyCards.map((item) => item.top).concat(limitsTop))].filter((item) => item > headerBottom && item <= limitsTop && !skipTops.has(item)).sort((a, b) => a - b);
  const cardEnds = [...new Set(bodyCards.map((item) => item.bottom))].filter((item) => item > headerBottom && item <= limitsTop && !skipEnds.has(item)).sort((a, b) => a - b);
  return {
    width,
    height,
    limitsTop: limitsTop || height,
    warningTop,
    warningBottom,
    lines,
    cards,
    guides: {
      headerBottom,
      breaks,
      cardEnds,
      kept: kept.map((item) => ({ top: item.top, headingBottom: item.headingBottom, bottom: item.bottom })),
    },
  };
}

export const REPORT_PAGE_HEIGHT = 1500;

function ascendingCuts(values, start, end) {
  return [...new Set(values.filter((item) => Number.isInteger(item) && item > start && item <= end))].sort((a, b) => a - b);
}

function lastMarkWithin(marks, start, limit) {
  let fit = null;
  for (const mark of marks) {
    if (mark <= start) continue;
    if (mark <= limit) fit = mark;
    else break;
  }
  return fit;
}

function firstMarkAfter(marks, start) {
  for (const mark of marks) {
    if (mark > start) return mark;
  }
  return null;
}

function nextPageEnd(start, room, cut, cardBreaks, cardEnds) {
  const limit = start + Math.max(1, room);
  const cardFit = lastMarkWithin(cardBreaks, start, limit);
  if (cardFit !== null) return cardFit;
  const endFit = lastMarkWithin(cardEnds, start, limit);
  if (endFit !== null) return endFit;
  return firstMarkAfter(cardBreaks, start) ?? firstMarkAfter(cardEnds, start) ?? cut;
}

export function reportPagePlan(height, limitsTop, pageHeight = REPORT_PAGE_HEIGHT, warningHeight = 0, guides = null) {
  const total = Math.max(1, height);
  const cut = Number.isInteger(limitsTop) && limitsTop > 0 && limitsTop < total ? limitsTop : total;
  const footerHeight = total - cut;
  const stamp = footerHeight + (warningHeight > 0 ? warningHeight : 0);
  const room = Math.max(80, pageHeight - stamp);
  const headerBottom = guides && Number.isInteger(guides.headerBottom) && guides.headerBottom > 0 && guides.headerBottom < cut
    ? guides.headerBottom
    : 0;
  if (!headerBottom) {
    if (total <= pageHeight || cut <= room) {
      return [{ bodyTop: 0, bodyBottom: total, repeatLimits: true, repeatHeader: false, single: true }];
    }
    const pages = [];
    for (let top = 0; top < cut; top += room) {
      pages.push({
        bodyTop: top,
        bodyBottom: Math.min(cut, top + room),
        repeatLimits: true,
        repeatHeader: false,
        single: false,
      });
    }
    return pages.length ? pages : [{ bodyTop: 0, bodyBottom: 0, repeatLimits: true, repeatHeader: false, single: false }];
  }
  if (total <= pageHeight) {
    return [{ bodyTop: 0, bodyBottom: total, repeatLimits: true, repeatHeader: true, single: true }];
  }
  const cardBreaks = ascendingCuts(guides.breaks || [], 0, cut);
  if (cardBreaks[cardBreaks.length - 1] !== cut) cardBreaks.push(cut);
  const cardEnds = ascendingCuts(guides.cardEnds || [], headerBottom, cut);
  const firstRoom = Math.max(1, pageHeight - footerHeight);
  const laterRoom = Math.max(1, pageHeight - footerHeight - headerBottom);
  const pages = [];
  let start = 0;
  while (start < cut && pages.length < 1000) {
    let end = nextPageEnd(start, start === 0 ? firstRoom : laterRoom, cut, cardBreaks, cardEnds);
    if (start === 0 && end < headerBottom) end = headerBottom;
    const bodyBottom = end > start ? end : Math.min(cut, start + 1);
    pages.push({
      bodyTop: start,
      bodyBottom,
      repeatLimits: true,
      repeatHeader: true,
      single: false,
    });
    if (bodyBottom <= start) break;
    start = bodyBottom;
  }
  return pages.length ? pages : [{ bodyTop: 0, bodyBottom: cut, repeatLimits: true, repeatHeader: true, single: false }];
}

function sliceRgba(rgba, width, y0, y1) {
  return rgba.subarray(y0 * width * 4, y1 * width * 4);
}

function stackMany(parts, width) {
  const height = parts.reduce((sum, part) => sum + part.height, 0);
  const rgba = new Uint8Array(width * height * 4);
  let offset = 0;
  for (const part of parts) {
    rgba.set(part.rgba, offset);
    offset += part.rgba.length;
  }
  return { rgba, width, height };
}

export function sliceReportPages(rgba, width, height, limitsTop, pageHeight = REPORT_PAGE_HEIGHT, warning = null, guides = null) {
  const warnTop = warning && Number.isInteger(warning.top) && warning.top >= 0 ? warning.top : 0;
  const warnBottom = warning && Number.isInteger(warning.bottom) && warning.bottom > warnTop && warning.bottom <= height ? warning.bottom : 0;
  const warningHeight = warnBottom > warnTop ? warnBottom - warnTop : 0;
  const plan = reportPagePlan(height, limitsTop, pageHeight, warningHeight, guides);
  const headerBottom = guides && Number.isInteger(guides.headerBottom) && guides.headerBottom > 0 && guides.headerBottom < height
    ? guides.headerBottom
    : 0;
  return plan.map((page) => {
    if (page.single) return { rgba, width, height };
    const parts = [];
    const coversWarning = warningHeight > 0 && page.bodyTop <= warnTop && page.bodyBottom >= warnBottom;
    if (headerBottom > 0 && page.bodyTop >= headerBottom) {
      parts.push({ rgba: sliceRgba(rgba, width, 0, headerBottom), height: headerBottom });
    } else if (warningHeight > 0 && !coversWarning) {
      parts.push({ rgba: sliceRgba(rgba, width, warnTop, warnBottom), height: warningHeight });
    }
    parts.push({
      rgba: sliceRgba(rgba, width, page.bodyTop, page.bodyBottom),
      height: page.bodyBottom - page.bodyTop,
    });
    parts.push({
      rgba: sliceRgba(rgba, width, limitsTop, height),
      height: height - limitsTop,
    });
    return stackMany(parts, width);
  });
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
  if (typeof CompressionStream !== "function") throw new Error("pdf");
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

export async function pdfFromImages(pages) {
  if (typeof CompressionStream !== "function") throw new Error("pdf");
  if (!Array.isArray(pages) || pages.length < 1) throw new Error("imagen");
  const prepared = [];
  for (const page of pages) {
    const width = page.width;
    const height = page.height;
    const rgba = page.rgba;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error("imagen");
    if (!rgba || rgba.length < width * height * 4) throw new Error("imagen");
    const rgb = new Uint8Array(width * height * 3);
    for (let index = 0; index < width * height; index += 1) {
      rgb[index * 3] = rgba[index * 4];
      rgb[index * 3 + 1] = rgba[index * 4 + 1];
      rgb[index * 3 + 2] = rgba[index * 4 + 2];
    }
    prepared.push({ width, height, compressed: await deflateZlib(rgb) });
  }
  const encoder = new TextEncoder();
  const pageW = 540;
  const contents = prepared.map((page) => {
    const pageH = Math.max(1, Math.round((pageW * page.height) / page.width));
    return { pageH, bytes: encoder.encode(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im1 Do\nQ\n`) };
  });
  const count = prepared.length;
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
  const kids = prepared.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  text("%PDF-1.4\n");
  obj(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, encoder.encode(`<< /Type /Pages /Kids [${kids}] /Count ${count} >>`));
  prepared.forEach((page, index) => {
    const pageObj = 3 + index * 3;
    const contentObj = pageObj + 1;
    const imageObj = pageObj + 2;
    const content = contents[index];
    obj(pageObj, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${content.pageH}] /Contents ${contentObj} 0 R /Resources << /XObject << /Im1 ${imageObj} 0 R >> >> >>`));
    obj(contentObj, concat([
      encoder.encode(`<< /Length ${content.bytes.length} >>\nstream\n`),
      content.bytes,
      encoder.encode("endstream"),
    ]));
    obj(imageObj, concat([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${page.compressed.length} >>\nstream\n`),
      page.compressed,
      encoder.encode("\nendstream"),
    ]));
  });
  const size = 3 + count * 3;
  const xrefAt = cursor;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n += 1) xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
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
  const drawn = drawReport(ctx, model);
  const png = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  if (!png) return null;
  let pdf = null;
  try {
    if (typeof CompressionStream !== "function") {
      pdf = null;
    } else {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pages = sliceReportPages(image.data, drawn.width, drawn.height, drawn.limitsTop, REPORT_PAGE_HEIGHT, {
        top: drawn.warningTop,
        bottom: drawn.warningBottom,
      }, drawn.guides);
      const bytes = pages.length === 1
        ? await pdfFromRgba(pages[0].rgba, pages[0].width, pages[0].height)
        : await pdfFromImages(pages);
      pdf = bytes ? new Blob([bytes], { type: "application/pdf" }) : null;
    }
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
  box.informeSource = source;
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
