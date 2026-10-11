/**
 * Cuaderno local. Solo lectura, sin cartera y sin ejecutar el JSON importado.
 */
import { formatAmount } from "../shared/amount.js";
import { entenderNav } from "../shared/entender.js";
import { explainIncomplete } from "../shared/explain-incomplete.js";
import { mountMarket } from "../shared/market-view.js";
import { cloneWarningText, comparisonBanner, notebookNameText, renderReadingSummary, summaryFromCard } from "../shared/reading-summary.js";
import { factState } from "../shared/fact-state.js";
import { notebookDbAll, notebookDbClear, notebookDbPut, openNotebookDb } from "../shared/notebook-db.js";
import {
  PUBLICNODE_RPC,
  DISCLAIMER,
  OFFICIAL_MINT,
  clearBlockedMethods,
  isAllowedRpcUrl,
  isMintAddress,
  readMint,
} from "../shared/solana-read.js";
import { takeQuerySlot } from "../modules/pair-report.mjs";
import {
  MAX_BYTES,
  MAX_NOTE,
  MAX_STORED,
  chooseWatchTargets,
  compareRecords,
  comparedSideText,
  comparisonSummary,
  curveComparisonValue,
  CURVE_NOT_ON_PUMP,
  migrateStoredRecord,
  pickPrevious,
  readingComplete,
  readingGaps,
  readingOptionLabel,
  reserveWatchSlots,
  sortNotebookRecords,
  stampIdentity,
  tableCellText,
  staleLine,
  supplyConfirmation,
  supplyDirection,
  supplyNote,
  toExport,
  validateCard,
  validateExport,
  watchTargets,
  watchVerdict,
  clipName,
  visibleText,
  withNote,
  withinStoreLimit,
} from "../shared/notebook-model.js";

const DB_NAME = "stubx-cuaderno";

const COPY = {
  es: {
    consulting: "Consultando la red…",
    invalid: "Esa dirección no es válida. Una dirección de Solana suele tener entre 32 y 44 letras y números, sin 0, O, I ni l.",
    rpc: "Ese lector no está en la lista. Solo se puede usar api.mainnet-beta.solana.com o solana-rpc.publicnode.com. No se ha llamado a la red.",
    full: `Este navegador ya tiene ${MAX_STORED} fichas. Borra alguna para guardar otra.`,
    partial: "La lectura está incompleta. Lo que falta no se ha puesto a cero.",
    network: "El servicio público no respondió, prueba otra vez en un minuto.",
    limit: "Se han hecho 6 lecturas en un minuto. Espera un momento antes de comprobar otra. No se ha inventado un resultado.",
    saved: "Guardada en el Cuaderno de este navegador · ",
    open: "Abrir Cuaderno",
    retry: "Reintentar",
    saveFail: "Esta lectura trae texto que el cuaderno no guarda. No se ha guardado.",
    db: "Este navegador no dejó guardar el cuaderno. Si está en modo privado, el almacenamiento puede estar cerrado.",
    noteFail: "La nota tiene que ser texto, de hasta 2000 caracteres, y no puede ser un script.",
    noteOk: "Nota guardada. Sigue separada de los datos de la cadena.",
    compareNeed: "Elige dos consultas distintas.",
    deleted: "Consultas borradas de este navegador.",
    cancel: "No se ha borrado nada.",
    empty: "Todavía no hay consultas guardadas.",
    importOk: "Copia importada. Cada ficha sigue siendo la de su fecha, no una lectura actual.",
    imported: "Importada de un archivo, no leída por este navegador. Sus datos no se han comprobado: vuelve a consultarla.",
    fileBig: "El archivo pasa de 1 MB. No se importa.",
    fileRead: "No se pudo leer el archivo.",
    exportEmpty: "No hay consultas que exportar.",
    exportOk: "Copia descargada. Sigue en este navegador.",
    sameMint: "Solo se comparan dos consultas de la misma red y dirección.",
    official: "Es la dirección oficial de STUBX.",
    notOfficial: "No es la dirección oficial de STUBX.",
    untrusted: "Nombre, símbolo y URI son texto de terceros. No son un enlace ni una imagen.",
    requery: "Volver a consultar",
    saveNote: "Guardar nota",
    noteLabel: "Nota personal, separada de la cadena",
    none: "no disponible",
    program: "Programa",
    mintAuth: "Permiso de emisión",
    freezeAuth: "Permiso de congelación",
    supplyAccount: "Suministro total",
    supplyRpc: "Suministro leído aparte",
    decimals: "Decimales",
    name: "Nombre",
    symbol: "Símbolo",
    uri: "Enlace de metadatos",
    mutable: "Metadatos mutables",
    extensions: "Extensiones",
    curve: "Curva",
    supplyExtra: "Consulta extra del suministro",
    slot: "Momento de la red",
    largest: "Cuentas con más tokens",
    errors: "Qué no se pudo leer",
    technical: "Detalles técnicos",
    yes: "sí",
    no: "no",
    revoked: "revocada",
    active: "activa",
    undecodable: "no se pudo leer",
    spl: "SPL Token",
    token2022: "Token-2022",
    notMint: "No es una cuenta de mint",
    unknownProgram: "no disponible",
    compareTitle: "Comparar consultas",
    before: "Antes",
    after: "Ahora",
    changed: "cambió",
    same: "igual",
    unknownState: "no se puede determinar",
    unread: "no se leyó",
    utc: "Hora UTC",
    incomplete: "Lectura incompleta: se guardará marcando lo que falta",
    emptySave: "No hay una lectura para guardar. No se ha guardado una ficha vacía.",
    changesTitle: "Qué cambió",
    unknownTitle: "Lo que no se puede determinar",
    unchangedTitle: "Lo que sigue igual",
    rawAccount: "Valor en bruto del suministro en la cuenta",
    rawRpc: "Valor en bruto del suministro leído aparte",
    format: "La versión de la ficha no es la misma. Se comparan solo los campos que existen en las dos.",
    watchEmpty: "Todavía no hay direcciones guardadas.",
    watchAll: "No hay ninguna marcada: se consultan todas.",
    watchSome: "Se consultan solo las marcadas.",
    watchReading: "Leyendo",
    watchOf: "de",
    watchChanged: "Cambió desde la última lectura.",
    watchSame: "Sigue igual desde la última lectura.",
    watchIncomplete: "Incompleto.",
    watchSave: "Guardar",
    watchSaveAll: "Guardar todas",
    watchStop: "Detener",
    watchStopped: "Pasada detenida. Lo que no se llegó a leer no se da por igual.",
    tabs: "Cierra las otras pestañas de stubxai.com y recarga.",
    watchRefused: "El servicio rechazó esta consulta. No se da por igual.",
    watchMissing: "Qué falta",
    watchSaved: "Esta lectura queda guardada en este navegador. Puedes borrarla en el Cuaderno.",
    watchNetwork: "Red",
    watchSolana: "Solana",
    watchAllLabel: "Todas las direcciones guardadas",
    lastReading: "Última lectura",
  },
  en: {
    consulting: "Reading the network…",
    invalid: "That address is not valid. A Solana address is usually 32 to 44 letters and numbers, with no 0, O, I, or l.",
    rpc: "That reader is not on the list. Only api.mainnet-beta.solana.com or solana-rpc.publicnode.com can be used. The network was not called.",
    full: `This browser already has ${MAX_STORED} cards. Delete one to save another.`,
    partial: "The reading is incomplete. What is missing was not filled in with zero.",
    network: "The public service did not respond, try again in a minute.",
    limit: "6 readings were made in one minute. Wait a moment before checking another. No result was invented.",
    saved: "Saved in this browser's Notebook · ",
    open: "Open Notebook",
    retry: "Try again",
    saveFail: "This reading contains text the notebook does not store. It was not saved.",
    db: "This browser did not allow the notebook to be saved. In private mode, storage may be closed.",
    noteFail: "The note must be text, at most 2000 characters, and it cannot be a script.",
    noteOk: "Note saved. It stays separate from the chain data.",
    compareNeed: "Choose two different queries.",
    deleted: "Queries deleted from this browser.",
    cancel: "Nothing was deleted.",
    empty: "There are no saved queries yet.",
    importOk: "Copy imported. Each card is still the one from its date, not a current reading.",
    imported: "Imported from a file, not read by this browser. Its data has not been checked: query it again.",
    fileBig: "The file is over 1 MB. It was not imported.",
    fileRead: "The file could not be read.",
    exportEmpty: "There are no queries to export.",
    exportOk: "Copy downloaded. It also stays in this browser.",
    sameMint: "Only two queries of the same network and address can be compared.",
    official: "This is the official STUBX address.",
    notOfficial: "This is not the official STUBX address.",
    untrusted: "Name, symbol, and URI are third-party text. They are not a link and not an image.",
    requery: "Check again",
    saveNote: "Save note",
    noteLabel: "Personal note, separate from the chain",
    none: "unavailable",
    program: "Program",
    mintAuth: "Mint authority",
    freezeAuth: "Freeze authority",
    supplyAccount: "Total supply",
    supplyRpc: "Supply read separately",
    decimals: "Decimals",
    name: "Name",
    symbol: "Symbol",
    uri: "Metadata link",
    mutable: "Mutable metadata",
    extensions: "Extensions",
    curve: "Curve",
    supplyExtra: "Extra supply query",
    slot: "Network moment",
    largest: "Largest token accounts",
    errors: "What could not be read",
    technical: "Technical details",
    yes: "yes",
    no: "no",
    revoked: "revoked",
    active: "active",
    undecodable: "could not be read",
    spl: "SPL Token",
    token2022: "Token-2022",
    notMint: "Not a mint account",
    unknownProgram: "unavailable",
    compareTitle: "Compare queries",
    before: "Before",
    after: "Now",
    changed: "changed",
    same: "same",
    unknownState: "it cannot be determined",
    unread: "not read",
    utc: "UTC time",
    incomplete: "Incomplete reading: it will be saved marking what is missing",
    emptySave: "There is no reading to save. An empty card was not saved.",
    changesTitle: "What changed",
    unknownTitle: "What cannot be determined",
    unchangedTitle: "What stayed the same",
    rawAccount: "Raw supply on the account",
    rawRpc: "Raw supply read separately",
    format: "The card version is not the same. Only fields that exist on both are compared.",
    watchEmpty: "There are no saved addresses yet.",
    watchAll: "Nothing is marked: every saved address is checked.",
    watchSome: "Only the marked ones are checked.",
    watchReading: "Reading",
    watchOf: "of",
    watchChanged: "It changed since the last reading.",
    watchSame: "It is the same since the last reading.",
    watchIncomplete: "Incomplete.",
    watchSave: "Save",
    watchSaveAll: "Save all",
    watchStop: "Stop",
    watchStopped: "The pass was stopped. What was not read is not treated as unchanged.",
    tabs: "Close the other stubxai.com tabs and reload.",
    watchRefused: "The public service refused this check. It is not treated as unchanged.",
    watchMissing: "What is missing",
    watchSaved: "This reading is saved in this browser. You can delete it in the Notebook.",
    watchNetwork: "Network",
    watchSolana: "Solana",
    watchAllLabel: "Every saved address",
    lastReading: "Last reading",
  },
};

const STATUS = {
  verificado: { es: "verificado", en: "verified" },
  inferido: { es: "inferido", en: "inferred" },
  no_disponible: { es: "no disponible", en: "unavailable" },
  no_aplica: { es: "no aplica", en: "not applicable" },
  no_soportada: { es: "no soportado", en: "not supported" },
};

function lang() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function t(key) {
  return COPY[lang()][key];
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) node.setAttribute(key, String(value));
    }
  }
  return node;
}

function text(tag, value, attrs) {
  const node = el(tag, attrs);
  node.textContent = value == null ? "" : visibleText(value);
  return node;
}

function showMessage(message, kind) {
  const node = document.getElementById("consulta-error");
  if (!node) return;
  node.hidden = !message;
  node.replaceChildren();
  if (message) node.append(document.createTextNode(message));
  node.dataset.kind = kind || "";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
}

function showRetry(message, retryMint) {
  const node = document.getElementById("consulta-error");
  if (!node) return;
  node.hidden = false;
  node.replaceChildren();
  node.dataset.kind = "error";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.append(document.createTextNode(message));
  if (retryMint) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "reintentar";
    button.textContent = t("retry");
    button.addEventListener("click", () => consult(retryMint, true));
    node.append(document.createTextNode(" "), button);
  }
}

function announceSaved(extra, retryMint) {
  const node = document.getElementById("consulta-error");
  if (!node) return;
  node.hidden = false;
  node.replaceChildren();
  node.dataset.kind = "ok";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  if (extra) node.append(document.createTextNode(`${extra} `));
  node.append(document.createTextNode(t("saved")));
  const link = document.createElement("a");
  link.href = "#lista-consultas";
  link.textContent = t("open");
  node.append(link);
  if (retryMint) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "reintentar";
    button.textContent = t("retry");
    button.addEventListener("click", () => consult(retryMint, true));
    node.append(document.createTextNode(" "), button);
  }
  revealAboveBar(node);
}

function revealAboveBar(node) {
  node.scrollIntoView({ block: "center" });
  const bar = document.querySelector(".consulta-barra") || document.querySelector("form.consulta");
  if (!bar) return;
  const box = node.getBoundingClientRect();
  const form = bar.getBoundingClientRect();
  if (box.bottom > form.top - 12) window.scrollBy(0, box.bottom - form.top + 28);
}

function openDb() {
  return openNotebookDb(DB_NAME, {
    onConflict() {
      dbPromise = null;
      showMessage(t("tabs"), "error");
    },
  });
}

function dbAll(db) {
  return notebookDbAll(db);
}

function dbPut(db, record) {
  return notebookDbPut(db, record);
}

function dbClear(db) {
  return notebookDbClear(db);
}

async function browserTransport(endpoint, body, timeoutMs, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const stop = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      const error = new Error("abortado");
      error.name = "AbortError";
      throw error;
    }
    signal.addEventListener("abort", stop, { once: true });
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } catch (error) {
    if (signal && signal.aborted) throw error;
    return { status: 0, body: "" };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", stop);
  }
}

function endpointFromForm() {
  const input = document.getElementById("rpc-url");
  const value = input && typeof input.value === "string" ? input.value.trim() : "";
  return value || PUBLICNODE_RPC;
}

function statusLabel(value) {
  const row = STATUS[value];
  return row ? row[lang()] : t("none");
}

function programLabel(value) {
  if (value === "spl-token") return t("spl");
  if (value === "token-2022") return t("token2022");
  if (value === "no_es_mint") return t("notMint");
  return t("unknownProgram");
}

function authorityLabel(value) {
  if (!value) return t("none");
  if (value.state === "revocada") return t("revoked");
  if (value.state === "activa") return t("active");
  if (value.state === "no_decodificable") return t("undecodable");
  return statusLabel(value.state);
}

function shown(value) {
  if (value === null || value === undefined || value === "") return t("none");
  if (value === true) return t("yes");
  if (value === false) return t("no");
  return visibleText(value);
}

function plain(status, value, field) {
  const state = factState(status, value);
  if (state === "ok") {
    if (value === null || value === undefined || value === "") return tableCellText(field, status, value, lang());
    if (value === true) return t("yes");
    if (value === false) return t("no");
    return shown(value);
  }
  return tableCellText(field, status, value, lang());
}

function amountText(raw, decimals, status) {
  if (factState(status, raw) !== "ok") return plain(status, raw, "supply");
  return formatAmount(raw, decimals, lang()) || plain(status, raw, "supply");
}

function dataRow(list, label, status, value, field) {
  const term = text("dt", label);
  const detail = text("dd", plain(status, value, field));
  detail.dataset.estado = factState(status, value);
  list.append(term, detail);
  return { label, state: factState(status, value) };
}

function renderCard(card, options) {
  const article = el("article", { class: "ficha" });
  article.append(text("p", staleLine(card.consultedAt, lang()), { class: "sello" }));
  article.append(text("p", card.officialStubx ? t("official") : t("notOfficial"), { class: "franja-identidad" }));
  if (card.partial) article.append(text("p", t("partial"), { class: "nota" }));
  article.append(text("p", DISCLAIMER[lang()], { class: "nota" }));
  const code = el("code", { class: "mint" });
  code.textContent = card.mint;
  const mintLine = el("p");
  mintLine.append(code);
  article.append(mintLine);
  renderReadingSummary(article, summaryFromCard(card), lang(), {
    onRetry: () => consult(card.mint, true),
  });
  const marketHost = el("div", { class: "hueco-mercado" });
  article.append(marketHost);
  mountMarket(marketHost, {
    mint: card.mint,
    lang: lang(),
    auto: Boolean(options && options.autoMarket),
  });
  const list = el("dl");
  const supplyCheck = supplyConfirmation(card);
  dataRow(list, t("program"), card.programStatus, programLabel(card.program), "program");
  const mintAuth = card.mintAuthority.address
    ? `${authorityLabel(card.mintAuthority)} · ${card.mintAuthority.address}`
    : authorityLabel(card.mintAuthority);
  const freezeAuth = card.freezeAuthority.address
    ? `${authorityLabel(card.freezeAuthority)} · ${card.freezeAuthority.address}`
    : authorityLabel(card.freezeAuthority);
  dataRow(list, t("mintAuth"), card.mintAuthority.status, mintAuth, "mintAuth");
  dataRow(list, t("freezeAuth"), card.freezeAuthority.status, freezeAuth, "freezeAuth");
  appendSupply(list, card, supplyCheck);
  dataRow(list, t("decimals"), card.decimals === null ? "ausente" : "verificado", card.decimals, "decimals");
  const spokenName = notebookNameText(card, lang());
  dataRow(list, t("name"), card.name.status, spokenName || (card.name.text ? clipName(card.name.text) : card.name.text), "name");
  dataRow(list, t("symbol"), card.symbol.status, card.symbol.text ? clipName(card.symbol.text) : card.symbol.text, "symbol");
  dataRow(list, t("uri"), card.uri.status, card.uri.text, "uri");
  const mutableValue = card.metadataMutable === "si" ? t("yes") : card.metadataMutable === "no" ? t("no") : null;
  const mutableStatus = mutableValue ? "verificado" : card.metadataMutable;
  dataRow(list, t("mutable"), mutableStatus, mutableValue, "mutable");
  const extensionText = card.extensions.length ? card.extensions.map((item) => item.name).join(", ") : null;
  dataRow(list, t("extensions"), card.extensionsStatus, extensionText, "extensions");
  const curve = card.curve;
  if (curve.status === "no_aplica") {
    const term = text("dt", t("curve"));
    const detail = text("dd", CURVE_NOT_ON_PUMP[lang()] || CURVE_NOT_ON_PUMP.es);
    detail.dataset.estado = "no_aplica";
    list.append(term, detail);
  } else {
    const curveValue = curve.present === true ? t("yes") : null;
    dataRow(list, t("curve"), curve.status, curveValue, "curve");
  }
  dataRow(list, t("largest"), card.largestStatus || "no_consultado", null, "largest");
  article.append(list);
  article.append(entenderNav(lang()));
  article.append(text("p", t("untrusted"), { class: "muted" }));
  const details = el("details", { class: "tecnico" });
  const summaryTech = el("summary");
  summaryTech.textContent = t("technical");
  const tech = el("dl");
  dataRow(tech, t("slot"), card.slotStatus, card.slot, "slot");
  const utcTerm = text("dt", t("utc"));
  const utcValue = text("dd", card.consultedAt);
  tech.append(utcTerm, utcValue);
  dataRow(tech, t("rawAccount"), supplyCheck.account ? "verificado" : "fallo", card.supplyAccount, "supply");
  dataRow(tech, t("rawRpc"), card.supplyRpcStatus, card.supplyRpc, "supply");
  if (card.errors.length) {
    const errors = el("ul");
    for (const item of card.errors) {
      errors.append(text("li", `${item.at} · ${item.method} · ${item.message}`));
    }
    tech.append(errors);
  }
  details.append(summaryTech, tech);
  article.append(details);
  return article;
}

function appendSupply(list, card, check) {
  const note = supplyNote(card, lang());
  if (!check.account && !check.extra) {
    const status = check.reason === "no_aplica" ? "no_aplica" : "fallo";
    dataRow(list, t("supplyAccount"), status, null, "supply");
    return;
  }
  const raw = check.account || check.extra;
  const term = text("dt", t("supplyAccount"));
  const detail = text("dd", amountText(raw, card.decimals, "verificado"));
  detail.dataset.estado = check.confirmed ? "ok" : "fallo";
  list.append(term, detail);
  if (note) list.append(text("dd", note, { class: "nota" }));
}

function sameReading(left, right) {
  return Boolean(left && right && left.card.mint === right.card.mint && left.card.network === right.card.network);
}

function pairFor(list, leftId, rightId) {
  const byId = new Map(list.map((item) => [item.id, item]));
  let leftRec = byId.get(leftId) || null;
  let rightRec = byId.get(rightId) || null;
  if (!leftRec) leftRec = list[0] || null;
  if (leftRec && (!rightRec || rightRec.id === leftRec.id || !sameReading(leftRec, rightRec))) {
    rightRec = pickPrevious(list, leftRec.card, leftRec.id);
  }
  if (leftRec && rightRec && String(leftRec.card.consultedAt) > String(rightRec.card.consultedAt)) {
    const newer = leftRec;
    leftRec = rightRec;
    rightRec = newer;
  }
  const rightChoices = leftRec
    ? list.filter((item) => item.id !== leftRec.id && sameReading(leftRec, item))
    : [];
  return {
    leftId: leftRec ? leftRec.id : "",
    rightId: rightRec ? rightRec.id : "",
    rightChoices,
  };
}

function fillSelect(select, list, selected, peers) {
  select.replaceChildren();
  const blank = el("option", { value: "" });
  blank.textContent = "—";
  select.append(blank);
  const cards = (peers || list).map((item) => item.card);
  for (const record of list) {
    const option = el("option", { value: record.id });
    option.textContent = readingOptionLabel(record.card, lang(), cards);
    select.append(option);
  }
  select.value = selected && list.some((item) => item.id === selected) ? selected : "";
}

function paintSelects(list, leftId, rightId) {
  const left = document.getElementById("comparar-izquierda");
  const right = document.getElementById("comparar-derecha");
  if (!left || !right) return;
  const pair = pairFor(list, leftId, rightId);
  fillSelect(left, list, pair.leftId, list);
  fillSelect(right, pair.rightChoices, pair.rightId, list);
}

function renderRecords(records) {
  const list = document.getElementById("lista-consultas");
  const left = document.getElementById("comparar-izquierda");
  const right = document.getElementById("comparar-derecha");
  if (!list || !left || !right) return;
  const leftId = left.value;
  const rightId = right.value;
  list.replaceChildren();
  if (!records.length) {
    list.append(text("p", t("empty")));
  }
  for (const record of records) {
    const block = el("article", { class: "consulta-guardada", "data-id": record.id });
    if (record.source === "importada") block.append(text("p", t("imported"), { class: "nota" }));
    block.append(renderCard(record.card));
    const note = el("div", { class: "nota-personal" });
    const label = text("label", t("noteLabel"));
    label.htmlFor = `nota-${record.id}`;
    const area = el("textarea", { id: `nota-${record.id}`, class: "nota", maxlength: String(MAX_NOTE) });
    area.value = visibleText(record.note);
    const save = el("button", { type: "button" });
    save.textContent = t("saveNote");
    save.addEventListener("click", () => saveNote(record.id, area.value));
    note.append(label, area, save);
    const again = el("button", { type: "button" });
    again.textContent = t("requery");
    again.addEventListener("click", () => consult(record.card.mint));
    block.append(note, again);
    list.append(block);
  }
  paintSelects(records, leftId, rightId);
  renderWatchList(records);
}

let records = [];
let dbPromise = null;
let queryStamps = [];
let watchResults = [];
let followRunning = false;
let followAbort = null;
let followRun = 0;
const selectedWatch = new Set();

function database() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

async function refresh() {
  const db = await database();
  const raw = await dbAll(db);
  const migrated = [];
  for (const item of raw) {
    const next = migrateStoredRecord(item);
    if (next.changed && next.record) {
      await dbPut(db, next.record);
      migrated.push(next.record);
    } else {
      migrated.push(item);
    }
  }
  records = sortNotebookRecords(migrated, lang());
  renderRecords(records);
  renderComparison();
  renderWatchResults();
}

async function persist(record) {
  const checked = validateCard(record.card);
  if (!checked.ok) {
    showMessage(checked.error[lang()], "error");
    return false;
  }
  const previous = records.find((item) => item.id === record.id);
  const replacing = Boolean(previous);
  if (!replacing && !withinStoreLimit(records.length, 1)) {
    showMessage(t("full"), "error");
    return false;
  }
  const stored = stampIdentity({
    ...(previous || {}),
    ...record,
    card: checked.card,
    source: record.source || (previous && previous.source) || undefined,
  });
  if (!stored.network || !stored.address) {
    showMessage(t("saveFail"), "error");
    return false;
  }
  if (!stored.source) delete stored.source;
  const db = await database();
  await dbPut(db, stored);
  return true;
}

async function consult(mint, forgetBlocked = false) {
  const button = document.getElementById("consultar");
  const input = document.getElementById("direccion-cuaderno");
  if (button) button.disabled = true;
  showMessage(t("consulting"), "info");
  const endpoint = endpointFromForm();
  if (!isAllowedRpcUrl(endpoint)) {
    showMessage(t("rpc"), "error");
    if (button) button.disabled = false;
    return;
  }
  if (!isMintAddress(mint)) {
    showMessage(t("invalid"), "error");
    if (button) button.disabled = false;
    return;
  }
  const slot = takeQuerySlot(queryStamps, Date.now(), 6, 60000);
  queryStamps = slot.stamps;
  if (!slot.allowed) {
    showMessage(t("limit"), "error");
    if (button) button.disabled = false;
    return;
  }
  if (forgetBlocked) clearBlockedMethods();
  try {
    const result = await readMint({
      mint,
      endpoint,
      transport: browserTransport,
      minIntervalMs: 2000,
      maxRetries: 1,
    });
    const box = document.getElementById("resultado");
    if (!result.card) {
      showMessage(t(result.error === "rpc" ? "rpc" : result.error === "invalid" ? "invalid" : "emptySave"), "error");
      if (box) box.replaceChildren();
      return;
    }
    if (box) {
      box.replaceChildren(renderCard(result.card, { autoMarket: false }));
      box.focus();
      box.scrollIntoView({ block: "start" });
    }
    const record = { id: crypto.randomUUID(), note: "", card: result.card, source: "leida" };
    const saved = await persist(record);
    if (!saved) return;
    const incomplete = Boolean(result.card.partial || !result.ok);
    const extra = incomplete ? `${t("incomplete")}${result.ok ? "" : ` ${t("network")}`}` : "";
    announceSaved(extra, incomplete ? mint : "");
    await refresh();
  } catch {
    showRetry(t("network"), mint);
  } finally {
    if (button) button.disabled = false;
    if (input && mint) input.value = mint;
  }
}

async function saveNote(id, note) {
  const current = records.find((item) => item.id === id);
  if (!current) return;
  const next = withNote(current, note);
  if (!next.ok) {
    showMessage(t("noteFail"), "error");
    return;
  }
  try {
    const saved = await persist(next.record);
    if (!saved) return;
    showMessage(t("noteOk"), "ok");
    await refresh();
  } catch (error) {
    showMessage(t("db"), "error");
  }
}

function renderComparison() {
  const out = document.getElementById("comparacion");
  const leftId = document.getElementById("comparar-izquierda")?.value;
  const rightId = document.getElementById("comparar-derecha")?.value;
  if (!out) return;
  out.replaceChildren();
  if (!leftId || !rightId) return;
  if (leftId === rightId) {
    out.append(text("p", t("compareNeed"), { class: "campo-error" }));
    return;
  }
  const left = records.find((item) => item.id === leftId);
  const right = records.find((item) => item.id === rightId);
  if (!left || !right) return;
  const compared = compareRecords(left, right);
  if (!compared.ok) {
    out.append(text("p", compared.error[lang()], { class: "campo-error" }));
    return;
  }
  const older = compared.older || left;
  const newer = compared.newer || right;
  const banner = comparisonBanner(older.card, newer.card, lang());
  if (banner) out.append(text("p", banner, { class: "franja-identidad" }));
  out.append(text("h3", t("compareTitle")));
  const counted = text("p", comparisonSummary(compared, lang()), { class: "resumen-comparacion" });
  out.append(counted);
  out.append(text("p", `${t("before")} · ${staleLine(older.card.consultedAt, lang())}`, { class: "sello" }));
  out.append(text("p", `${t("after")} · ${staleLine(newer.card.consultedAt, lang())}`, { class: "sello" }));
  if (compared.formatChanged) out.append(text("p", t("format")));
  const shownSide = (rowItem, side, card) => {
    const state = side === "left" ? rowItem.leftState : rowItem.rightState;
    const curveText = curveComparisonValue(rowItem.field.es, state, lang());
    if (curveText) return curveText;
    const raw = side === "left" ? rowItem.left : rowItem.right;
    if (rowItem.amount && raw !== null) {
      const formatted = formatAmount(raw, card.decimals, lang());
      if (formatted) return formatted;
    }
    return comparedSideText(rowItem.field.es, card, raw, lang());
  };
  const gridFor = (rows, verdict) => {
    const grid = el("div", { class: "comparacion" });
    const word = verdict === "igual" ? t("same") : verdict === "cambio" ? t("changed") : t("unknownState");
    for (const rowItem of rows) {
      const article = el("article", { class: "ficha", "data-veredicto": verdict });
      article.append(text("h3", rowItem.field[lang()]));
      article.append(text("p", `${t("before")}: ${shownSide(rowItem, "left", older.card)}`));
      article.append(text("p", `${t("after")}: ${shownSide(rowItem, "right", newer.card)}`));
      if (rowItem.difference && verdict === "cambio") {
        const delta = supplyDirection(rowItem.difference, older.card.decimals, lang());
        if (delta) article.append(text("p", delta, { class: "nota" }));
      }
      article.append(text("p", word, { class: verdict === "cambio" ? "nota" : "muted", "data-estado": verdict }));
      grid.append(article);
    }
    return grid;
  };
  if (compared.changes.length) out.append(text("h3", t("changesTitle")), gridFor(compared.changes, "cambio"));
  if (compared.unknown.length) {
    const unknown = el("details", { class: "aviso-mas grupo-desconocido", open: "open" });
    const summary = el("summary");
    summary.textContent = t("unknownTitle");
    unknown.append(summary, gridFor(compared.unknown, "indeterminado"));
    out.append(unknown);
  }
  if (compared.unchanged.length) {
    const sameBox = el("details", { class: "aviso-mas grupo-igual", open: "open" });
    const summary = el("summary");
    summary.textContent = t("unchangedTitle");
    sameBox.append(summary, gridFor(compared.unchanged, "igual"));
    out.append(sameBox);
  }
  const tech = el("details", { class: "tecnico" });
  const techSummary = el("summary");
  techSummary.textContent = t("technical");
  const techList = el("dl");
  const slotText = (value) => (value === null || value === undefined ? t("unread") : String(value));
  techList.append(text("dt", t("slot")), text("dd", `${t("before")}: ${slotText(compared.technical.slot.left)} · ${t("after")}: ${slotText(compared.technical.slot.right)}`));
  techList.append(text("dt", t("utc")), text("dd", `${t("before")}: ${compared.technical.consultedAt.left} · ${t("after")}: ${compared.technical.consultedAt.right}`));
  tech.append(techSummary, techList);
  out.append(tech);
  if (compared.notes.left || compared.notes.right) {
    const notes = el("div", { class: "nota-personal" });
    notes.append(text("p", `${t("before")}: ${compared.notes.left}`));
    notes.append(text("p", `${t("after")}: ${compared.notes.right}`));
    out.append(notes);
  }
  out.append(entenderNav(lang()));
}

async function exportCopy() {
  if (!records.length) {
    showMessage(t("exportEmpty"), "error");
    return;
  }
  const json = toExport(records, new Date().toISOString());
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: "cuaderno-stubx.json" });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showMessage(t("exportOk"), "ok");
}

async function importCopy(file) {
  if (!file) return;
  if (file.size > MAX_BYTES) {
    showMessage(t("fileBig"), "error");
    return;
  }
  let textValue = "";
  try {
    textValue = await file.text();
  } catch (error) {
    showMessage(t("fileRead"), "error");
    return;
  }
  const parsed = validateExport(textValue);
  if (!parsed.ok) {
    showMessage(parsed.error[lang()], "error");
    return;
  }
  const incomingNew = parsed.records.filter((record) => !records.some((item) => item.id === record.id)).length;
  if (!withinStoreLimit(records.length, incomingNew)) {
    showMessage(t("full"), "error");
    return;
  }
  try {
    const db = await database();
    for (const record of parsed.records) await dbPut(db, stampIdentity({ ...record, source: "importada" }));
    showMessage(t("importOk"), "ok");
    await refresh();
  } catch (error) {
    showMessage(t("db"), "error");
  }
}

function armDelete() {
  const box = document.getElementById("confirmar-borrado");
  if (box) box.hidden = false;
}

async function confirmDelete() {
  try {
    const db = await database();
    await dbClear(db);
    const box = document.getElementById("confirmar-borrado");
    if (box) box.hidden = true;
    const result = document.getElementById("resultado");
    if (result) result.replaceChildren();
    const compare = document.getElementById("comparacion");
    if (compare) compare.replaceChildren();
    watchResults = [];
    selectedWatch.clear();
    showMessage(t("deleted"), "ok");
    await refresh();
  } catch (error) {
    showMessage(t("db"), "error");
  }
}

function cancelDelete() {
  const box = document.getElementById("confirmar-borrado");
  if (box) box.hidden = true;
  showMessage(t("cancel"), "info");
}

function networkLabel(network) {
  if (network === "solana") return t("watchSolana");
  return visibleText(network || "");
}

function watchStatusText(kind) {
  if (kind === "cambio") return t("watchChanged");
  if (kind === "igual") return t("watchSame");
  if (kind === "incompleto") return t("watchIncomplete");
  if (kind === "rechazada") return t("watchRefused");
  return t("limit");
}

function shownSide(rowItem, side, card) {
  const state = side === "left" ? rowItem.leftState : rowItem.rightState;
  const curveText = curveComparisonValue(rowItem.field.es, state, lang());
  if (curveText) return curveText;
  const raw = side === "left" ? rowItem.left : rowItem.right;
  if (rowItem.amount && raw !== null) {
    const formatted = formatAmount(raw, card.decimals, lang());
    if (formatted) return formatted;
  }
  return comparedSideText(rowItem.field.es, card, raw, lang());
}

function comparisonGrid(rows, verdict, older, newer) {
  const grid = el("div", { class: "comparacion" });
  const word = verdict === "igual" ? t("same") : verdict === "cambio" ? t("changed") : t("unknownState");
  for (const rowItem of rows) {
    const article = el("article", { class: "ficha", "data-veredicto": verdict });
    article.append(text("h3", rowItem.field[lang()]));
    article.append(text("p", `${t("before")}: ${shownSide(rowItem, "left", older.card)}`));
    article.append(text("p", `${t("after")}: ${shownSide(rowItem, "right", newer.card)}`));
    if (rowItem.difference && verdict === "cambio") {
      const delta = supplyDirection(rowItem.difference, older.card.decimals, lang());
      if (delta) article.append(text("p", delta, { class: "nota" }));
    }
    article.append(text("p", word, { class: verdict === "cambio" ? "nota" : "muted", "data-estado": verdict }));
    grid.append(article);
  }
  return grid;
}

function renderWatchList(list) {
  const box = document.getElementById("lista-seguimiento");
  const note = document.getElementById("seguir-alcance");
  if (!box) return;
  const targets = watchTargets(list);
  const alive = new Set(targets.map((item) => item.key));
  for (const key of selectedWatch) {
    if (!alive.has(key)) selectedWatch.delete(key);
  }
  box.replaceChildren();
  if (!targets.length) {
    box.append(text("p", t("watchEmpty")));
    if (note) note.textContent = "";
    return;
  }
  const all = el("label", { class: "seguimiento-fila" });
  const allBox = el("input", { type: "checkbox", id: "seguir-todas-marca" });
  allBox.checked = targets.every((item) => selectedWatch.has(item.key));
  allBox.addEventListener("change", () => {
    if (allBox.checked) {
      for (const item of targets) selectedWatch.add(item.key);
    } else {
      selectedWatch.clear();
    }
    renderWatchList(records);
  });
  all.append(allBox, text("span", t("watchAllLabel")));
  box.append(all);
  for (const entry of targets) {
    const row = el("label", { class: "seguimiento-fila" });
    const input = el("input", { type: "checkbox", value: entry.key });
    input.checked = selectedWatch.has(entry.key);
    input.addEventListener("change", () => {
      if (input.checked) selectedWatch.add(entry.key);
      else selectedWatch.delete(entry.key);
      renderWatchList(records);
    });
    const body = el("span");
    const spoken = notebookNameText(entry.latest.card, lang());
    body.append(text("strong", spoken || entry.address));
    const code = el("code", { class: "mint" });
    code.textContent = entry.address;
    const meta = text("span", `${t("watchNetwork")}: ${networkLabel(entry.network)}`, { class: "muted" });
    body.append(code, meta);
    const banner = cloneWarningText(entry.latest.card, lang());
    if (banner) body.append(text("span", banner, { class: "franja-identidad" }));
    row.append(input, body);
    box.append(row);
  }
  if (note) note.textContent = selectedWatch.size ? t("watchSome") : t("watchAll");
}

function renderWatchResults() {
  const out = document.getElementById("resultado-seguimiento");
  if (!out) return;
  out.replaceChildren();
  for (const item of watchResults) out.append(renderWatchResult(item));
}

function renderWatchResult(item) {
  const entry = item.entry;
  const outcome = item.outcome || { kind: "espera", rejection: { rejected: true, primary: true } };
  const article = el("article", {
    class: "seguimiento-estado",
    "data-estado": outcome.kind,
    "data-direccion": entry.address,
  });
  const previousCard = entry.latest && entry.latest.card;
  const card = outcome.card || previousCard;
  const banner = cloneWarningText(card, lang()) || cloneWarningText(previousCard, lang());
  if (banner) article.append(text("p", banner, { class: "franja-identidad" }));
  const spoken = notebookNameText(card, lang()) || notebookNameText(previousCard, lang());
  article.append(text("h3", spoken || entry.address));
  const code = el("code", { class: "mint" });
  code.textContent = entry.address;
  const line = el("p");
  line.append(code);
  article.append(line);
  article.append(text("p", `${t("watchNetwork")}: ${networkLabel(entry.network)}`, { class: "muted" }));
  if (previousCard) article.append(text("p", `${t("lastReading")} · ${staleLine(previousCard.consultedAt, lang())}`, { class: "sello" }));
  const status = text("p", watchStatusText(outcome.kind), { class: outcome.kind === "cambio" ? "nota" : "sello", "data-estado": outcome.kind });
  article.append(status);
  const refused = Boolean(outcome.rejection && outcome.rejection.rejected);
  const gap = outcome.card && !readingComplete(outcome.card)
    ? outcome.card
    : (previousCard && !readingComplete(previousCard) ? previousCard : outcome.card);
  if (outcome.kind !== "espera" && (outcome.kind === "rechazada" || outcome.kind === "incompleto" || refused)) {
    if (gap) {
      const model = summaryFromCard(gap);
      if (outcome.kind === "incompleto") explainIncomplete(model, readingGaps(gap));
      renderReadingSummary(article, model, lang(), {
        onRetry: () => followSelected(entry.key),
      });
    } else if (outcome.kind === "rechazada") {
      article.append(text("h3", t("watchMissing")));
      const retry = el("button", { type: "button", class: "reintentar-resumen" });
      retry.textContent = t("retry");
      retry.addEventListener("click", () => followSelected(entry.key));
      article.append(retry);
    }
  }
  if (outcome.compared && outcome.kind !== "rechazada" && outcome.kind !== "espera" && !refused) {
    const older = outcome.compared.older || entry.latest;
    const newer = outcome.compared.newer;
    if (outcome.kind === "cambio" && outcome.compared.changes.length) {
      article.append(text("h3", t("changesTitle")), comparisonGrid(outcome.compared.changes, "cambio", older, newer));
    }
    if (outcome.kind === "cambio" && outcome.compared.unknown.length) {
      article.append(text("h3", t("unknownTitle")), comparisonGrid(outcome.compared.unknown, "indeterminado", older, newer));
    }
    if (outcome.kind === "igual") {
      article.append(text("p", comparisonSummary(outcome.compared, lang()), { class: "resumen-comparacion" }));
      if (outcome.compared.unchanged.length) {
        article.append(text("h3", t("unchangedTitle")), comparisonGrid(outcome.compared.unchanged, "igual", older, newer));
      }
    }
    if (outcome.kind === "incompleto" && outcome.compared.unknown.length) {
      article.append(text("h3", t("unknownTitle")), comparisonGrid(outcome.compared.unknown, "indeterminado", older, newer));
    }
  } else if (outcome.compared && outcome.kind === "cambio" && outcome.compared.changes.length) {
    const older = outcome.compared.older || entry.latest;
    const newer = outcome.compared.newer;
    article.append(text("h3", t("changesTitle")), comparisonGrid(outcome.compared.changes, "cambio", older, newer));
  }
  if (canKeep(outcome)) {
    const save = el("button", { type: "button" });
    save.textContent = t("watchSave");
    save.addEventListener("click", () => {
      saveWatchItem(item);
    });
    article.append(save);
  }
  if (outcome.saved) article.append(text("p", t("watchSaved"), { class: "muted" }));
  return article;
}

function canKeep(outcome) {
  if (!outcome || outcome.saved || !outcome.card) return false;
  if (outcome.kind === "espera" || outcome.kind === "rechazada") return false;
  const checked = validateCard(outcome.card);
  return Boolean(checked.ok);
}

async function saveWatchItem(item) {
  const outcome = item && item.outcome;
  if (!canKeep(outcome)) return false;
  if (!withinStoreLimit(records.length, 1)) {
    showMessage(t("full"), "error");
    return false;
  }
  const record = stampIdentity({
    id: crypto.randomUUID(),
    note: "",
    card: outcome.card,
    source: "leida",
  });
  const ok = await persist(record);
  if (!ok) return false;
  outcome.saved = true;
  const kept = watchResults.slice();
  await refresh();
  watchResults = kept;
  renderWatchResults();
  return true;
}

async function saveAllWatch() {
  for (const item of watchResults) {
    if (!canKeep(item.outcome)) continue;
    const ok = await saveWatchItem(item);
    if (!ok) break;
  }
}

function stopFollow() {
  if (followAbort) followAbort.abort();
}

async function followSelected(forgetKey) {
  if (followRunning) return;
  const button = document.getElementById("seguir");
  const stop = document.getElementById("detener");
  const endpoint = endpointFromForm();
  if (!isAllowedRpcUrl(endpoint)) {
    showMessage(t("rpc"), "error");
    return;
  }
  const targets = watchTargets(records);
  const selected = forgetKey ? [forgetKey] : [...selectedWatch];
  const list = chooseWatchTargets(targets, selected).filter((item) => isMintAddress(item.address));
  const out = document.getElementById("resultado-seguimiento");
  if (!list.length) {
    showMessage(t("watchEmpty"), "info");
    return;
  }
  const run = followRun + 1;
  followRun = run;
  const abort = new AbortController();
  followAbort = abort;
  followRunning = true;
  if (button) button.disabled = true;
  if (stop) stop.hidden = false;
  if (out) out.setAttribute("aria-busy", "true");
  let stopped = false;
  try {
    const plan = reserveWatchSlots(list, queryStamps, Date.now(), takeQuerySlot);
    queryStamps = plan.stamps;
    if (forgetKey && plan.ready.length) clearBlockedMethods();
    const painted = [];
    let index = 0;
    for (const entry of plan.ready) {
      if (abort.signal.aborted) {
        stopped = true;
        break;
      }
      index += 1;
      showMessage(`${t("watchReading")} ${index} ${t("watchOf")} ${list.length}`, "info");
      let outcome;
      try {
        const result = await readMint({
          mint: entry.address,
          endpoint,
          transport: browserTransport,
          minIntervalMs: 2000,
          maxRetries: 1,
          signal: abort.signal,
        });
        if (abort.signal.aborted || (result && result.aborted)) {
          stopped = true;
          break;
        }
        outcome = watchVerdict(entry.latest, result);
      } catch (error) {
        if (abort.signal.aborted || (error && error.name === "AbortError")) {
          stopped = true;
          break;
        }
        outcome = watchVerdict(entry.latest, { ok: false, card: null });
      }
      painted.push({ entry, outcome });
      watchResults = painted.slice();
      renderWatchResults();
    }
    if (!stopped) {
      for (const entry of plan.waiting) {
        painted.push({ entry, outcome: { kind: "espera", rejection: { rejected: true, primary: true }, card: entry.latest.card } });
      }
    }
    watchResults = painted;
    renderWatchResults();
    if (!stopped && plan.waiting.length) showMessage(t("limit"), "error");
    if (stopped) showMessage(t("watchStopped"), "info");
    if (out && !stopped) out.focus();
  } catch {
    if (!abort.signal.aborted) showMessage(t("network"), "error");
  } finally {
    if (run === followRun) {
      followRunning = false;
      followAbort = null;
      if (button) button.disabled = false;
      if (stop) stop.hidden = true;
      if (out) out.removeAttribute("aria-busy");
    }
  }
}

function bind() {
  const form = document.getElementById("consulta");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const mint = document.getElementById("direccion-cuaderno")?.value.trim() ?? "";
    consult(mint);
  });
  document.getElementById("exportar")?.addEventListener("click", () => {
    exportCopy();
  });
  document.getElementById("importar-archivo")?.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    importCopy(file);
    event.target.value = "";
  });
  document.getElementById("borrar")?.addEventListener("click", armDelete);
  document.getElementById("borrar-confirmar")?.addEventListener("click", confirmDelete);
  document.getElementById("borrar-cancelar")?.addEventListener("click", cancelDelete);
  document.getElementById("comparar")?.addEventListener("click", renderComparison);
  document.getElementById("seguir")?.addEventListener("click", () => followSelected(""));
  document.getElementById("detener")?.addEventListener("click", () => stopFollow());
  document.getElementById("guardar-todas")?.addEventListener("click", () => {
    saveAllWatch();
  });
  document.getElementById("comparar-izquierda")?.addEventListener("change", () => {
    const left = document.getElementById("comparar-izquierda");
    paintSelects(records, left ? left.value : "", "");
  });
  document.addEventListener("stubx-lang", () => {
    renderRecords(records);
    const current = document.getElementById("resultado")?.querySelector(".ficha");
    if (current) {
      /* La ficha visible se vuelve a pintar con el idioma nuevo desde la última lectura guardada. */
    }
    const latest = records[0];
    const box = document.getElementById("resultado");
    if (latest && box && box.childElementCount) box.replaceChildren(renderCard(latest.card, { autoMarket: false }));
    renderComparison();
    renderWatchList(records);
    renderWatchResults();
  });
  refresh().catch(() => showMessage(t("db"), "error"));
}

bind();

export { OFFICIAL_MINT };
