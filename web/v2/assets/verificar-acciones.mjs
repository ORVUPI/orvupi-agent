/**
 * Acciones de Verify hacia el cuaderno local.
 * La dirección no va en la consulta ni al servidor. Se guarda red y dirección en IndexedDB.
 */
import { formatAmount } from "../shared/amount.js";
import { ENTENDER, entenderNav } from "../shared/entender.js";
import { notebookDbAll, notebookDbPut, openNotebookDb } from "../shared/notebook-db.js";
import { compareRecords, comparedSideText, comparisonSummary, curveComparisonValue, pickPrevious, staleLine, stampIdentity, supplyDirection, validateCard, withinStoreLimit } from "../shared/notebook-model.js";
import { cardFromShown } from "../shared/solana-read.js";

const DB_NAME = "stubx-cuaderno";

const COPY = {
  es: {
    saving: "Guardando esta dirección en este navegador…",
    saved: "Guardada en el Cuaderno de este navegador · ",
    open: "Abrir Cuaderno",
    none: "No hay una consulta anterior de esta dirección en esta red.",
    compare: "Comparar consultas",
    unknownState: "no se puede determinar",
    changed: "cambió",
    same: "igual",
    changes: "Qué cambió",
    unknownTitle: "Lo que no se puede determinar",
    unchangedTitle: "Lo que sigue igual",
    unread: "no se leyó",
    utc: "Hora UTC",
    slot: "Momento de la red",
    technical: "Detalles técnicos",
    incomplete: "Lectura incompleta: se guardará marcando lo que falta",
    emptySave: "No hay una lectura para guardar. No se ha guardado una ficha vacía.",
    wait: "La lectura no ha terminado. Espera a que aparezca el resultado.",
    db: "Este navegador no dejó guardar el cuaderno.",
    tabs: "Cierra las otras pestañas de stubxai.com y recarga.",
    fail: "No hay una lectura en pantalla para guardar. Pulsa Comprobar y espera el resultado.",
    full: "Este navegador ya tiene el máximo de fichas.",
    before: "Antes",
    after: "Ahora",
    yes: "sí",
    no: "no",
    missing: "no disponible",
  },
  en: {
    saving: "Saving this address in this browser…",
    saved: "Saved in this browser's Notebook · ",
    open: "Open Notebook",
    none: "There is no earlier query of this address on this network.",
    compare: "Compare queries",
    unknownState: "it cannot be determined",
    changed: "changed",
    same: "same",
    changes: "What changed",
    unknownTitle: "What cannot be determined",
    unchangedTitle: "What stayed the same",
    unread: "not read",
    utc: "UTC time",
    slot: "Network moment",
    technical: "Technical details",
    incomplete: "Incomplete reading: it will be saved marking what is missing",
    emptySave: "There is no reading to save. An empty card was not saved.",
    wait: "The reading has not finished. Wait until the result appears.",
    db: "This browser did not allow the notebook to be saved.",
    tabs: "Close the other stubxai.com tabs and reload.",
    fail: "There is no reading on screen to save. Press Check and wait for the result.",
    full: "This browser already has the maximum number of cards.",
    before: "Before",
    after: "Now",
    yes: "yes",
    no: "no",
    missing: "unavailable",
  },
};

function lang() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function t(key) {
  return COPY[lang()][key];
}

function openDb() {
  return openNotebookDb(DB_NAME, {
    onConflict() {
      say(t("tabs"));
    },
  });
}

function dbAll(db) {
  return notebookDbAll(db);
}

function dbPut(db, record) {
  return notebookDbPut(db, record);
}

let shown = null;
let lastView = null;

document.addEventListener("stubx-lectura", (event) => {
  shown = event && event.detail ? event.detail : null;
});

const GUIAS = new Set(ENTENDER.map((item) => item.href));

function box() {
  const node = document.getElementById("comparacion-verify");
  if (node) {
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
  }
  return node;
}

function say(message) {
  const node = box();
  if (!node) return;
  node.replaceChildren();
  const p = document.createElement("p");
  p.className = "nota";
  p.textContent = message;
  node.append(p);
}

function saySaved(incomplete) {
  const node = box();
  if (!node) return;
  node.replaceChildren();
  const p = document.createElement("p");
  p.className = "nota confirmacion-guardado";
  p.setAttribute("role", "status");
  p.setAttribute("aria-live", "polite");
  if (incomplete) p.append(document.createTextNode(`${t("incomplete")} `));
  p.append(document.createTextNode(t("saved")));
  const link = document.createElement("a");
  link.href = "/cuaderno/";
  link.textContent = t("open");
  p.append(link);
  node.append(p);
  revealAboveBar(p);
}

function revealAboveBar(node) {
  node.scrollIntoView({ block: "center" });
  const bar = document.querySelector(".consulta-barra") || document.querySelector("form.consulta");
  if (!bar) return;
  const box = node.getBoundingClientRect();
  const form = bar.getBoundingClientRect();
  if (box.bottom > form.top - 12) {
    window.scrollBy(0, box.bottom - form.top + 28);
  }
}

function sideText(row, side, card) {
  const state = side === "left" ? row.leftState : row.rightState;
  const curveText = curveComparisonValue(row.field.es, state, lang());
  if (curveText) return curveText;
  const raw = side === "left" ? row.left : row.right;
  if (row.amount && raw !== null) {
    const formatted = formatAmount(raw, card.decimals, lang());
    if (formatted) return formatted;
  }
  return comparedSideText(row.field.es, card, raw, lang());
}

function gridFor(rows, verdict, older, newer) {
  const grid = document.createElement("div");
  grid.className = "comparacion";
  const word = verdict === "cambio" ? t("changed") : verdict === "igual" ? t("same") : t("unknownState");
  for (const row of rows) {
    const article = document.createElement("article");
    article.className = "ficha";
    article.dataset.veredicto = verdict;
    const title = document.createElement("h3");
    title.textContent = row.field[lang()];
    const left = document.createElement("p");
    left.textContent = `${t("before")}: ${sideText(row, "left", older.card)}`;
    const right = document.createElement("p");
    right.textContent = `${t("after")}: ${sideText(row, "right", newer.card)}`;
    article.append(title, left, right);
    if (row.difference && verdict === "cambio") {
      const delta = supplyDirection(row.difference, older.card.decimals, lang());
      if (delta) {
        const diff = document.createElement("p");
        diff.className = "nota";
        diff.textContent = delta;
        article.append(diff);
      }
    }
    const mark = document.createElement("p");
    mark.className = verdict === "cambio" ? "nota" : "muted";
    mark.dataset.estado = verdict;
    mark.textContent = word;
    article.append(mark);
    grid.append(article);
  }
  return grid;
}

function paintComparison(current, previous, compared) {
  const node = box();
  if (!node) return;
  const older = compared.older || previous;
  const newer = compared.newer || current;
  node.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = t("compare");
  const counted = document.createElement("p");
  counted.className = "resumen-comparacion";
  counted.textContent = comparisonSummary(compared, lang());
  const before = document.createElement("p");
  before.className = "sello";
  before.textContent = `${t("before")} · ${staleLine(older.card.consultedAt, lang())}`;
  const after = document.createElement("p");
  after.className = "sello";
  after.textContent = `${t("after")} · ${staleLine(newer.card.consultedAt, lang())}`;
  node.append(title, counted, before, after);
  if (compared.changes.length) {
    const heading = document.createElement("h3");
    heading.id = "que-cambio";
    heading.textContent = t("changes");
    node.append(heading, gridFor(compared.changes, "cambio", older, newer));
  }
  if (compared.unknown.length) {
    const details = document.createElement("details");
    details.open = true;
    details.className = "aviso-mas grupo-desconocido";
    const summary = document.createElement("summary");
    summary.textContent = t("unknownTitle");
    details.append(summary, gridFor(compared.unknown, "indeterminado", older, newer));
    node.append(details);
  }
  if (compared.unchanged.length) {
    const sameBox = document.createElement("details");
    sameBox.open = true;
    sameBox.className = "aviso-mas grupo-igual";
    const summary = document.createElement("summary");
    summary.textContent = t("unchangedTitle");
    sameBox.append(summary, gridFor(compared.unchanged, "igual", older, newer));
    node.append(sameBox);
  }
  const tech = document.createElement("details");
  tech.className = "tecnico";
  const techSummary = document.createElement("summary");
  techSummary.textContent = t("technical");
  const list = document.createElement("dl");
  const slotName = document.createElement("dt");
  slotName.textContent = t("slot");
  const slotValue = document.createElement("dd");
  const slotText = (value) => (value === null || value === undefined ? t("unread") : String(value));
  slotValue.textContent = `${t("before")}: ${slotText(compared.technical.slot.left)} · ${t("after")}: ${slotText(compared.technical.slot.right)}`;
  const timeName = document.createElement("dt");
  timeName.textContent = t("utc");
  const timeValue = document.createElement("dd");
  timeValue.textContent = `${t("before")}: ${compared.technical.consultedAt.left} · ${t("after")}: ${compared.technical.consultedAt.right}`;
  list.append(slotName, slotValue, timeName, timeValue);
  tech.append(techSummary, list);
  node.append(tech, entenderNav(lang()));
  lastView = { current, previous };
  const changes = document.getElementById("que-cambio");
  if (changes) changes.scrollIntoView({ block: "nearest" });
}

function recordOnScreen(mint) {
  const card = cardFromShown(shown);
  if (!card || card.mint !== mint) return null;
  const checked = validateCard(card);
  if (!checked.ok) return null;
  return { id: crypto.randomUUID(), note: "", card: checked.card, source: "leida" };
}

async function saveQuery(mint) {
  const screen = document.getElementById("resultado");
  if (screen && screen.getAttribute("aria-busy") === "true") {
    say(t("wait"));
    return;
  }
  say(t("saving"));
  try {
    const record = recordOnScreen(mint);
    if (!record || !record.card) {
      say(t("emptySave"));
      return;
    }
    const db = await openDb();
    const existing = await dbAll(db);
    if (!withinStoreLimit(existing.length, 1)) {
      say(t("full"));
      return;
    }
    await dbPut(db, stampIdentity({ id: record.id, note: "", card: record.card }));
    saySaved(Boolean(record.card.partial));
  } catch {
    say(t("db"));
  }
}

async function comparePrevious(mint, focusChanges) {
  say(t("saving"));
  try {
    const current = recordOnScreen(mint);
    if (!current) {
      say(t("fail"));
      return;
    }
    const db = await openDb();
    const existing = await dbAll(db);
    const previous = pickPrevious(existing, current.card, current.id);
    if (!previous) {
      say(t("none"));
      return;
    }
    const compared = compareRecords(current, previous);
    if (!compared.ok) {
      say(compared.error[lang()]);
      return;
    }
    paintComparison(current, previous, compared);
    if (focusChanges) {
      const changes = document.getElementById("que-cambio");
      if (changes) changes.scrollIntoView({ block: "start" });
    }
  } catch {
    say(t("db"));
  }
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const understand = target.closest("#entender-resultado, .entender-resultado");
  if (understand) {
    event.preventDefault();
    const link = target.closest("a");
    const href = link && understand.contains(link) ? link.getAttribute("data-guia") : null;
    if (href !== null && GUIAS.has(href)) location.assign(href);
    return;
  }
  const save = target.closest("#guardar-consulta");
  if (save) {
    const mint = save.getAttribute("data-mint") || "";
    saveQuery(mint);
    return;
  }
  const previous = target.closest("#comparar-anterior");
  if (previous) {
    comparePrevious(previous.getAttribute("data-mint") || "", false);
    return;
  }
  const changed = target.closest("#ver-cambio");
  if (changed) {
    if (lastView) {
      const node = document.getElementById("que-cambio");
      if (node) node.scrollIntoView({ block: "start" });
      else comparePrevious(changed.getAttribute("data-mint") || "", true);
      return;
    }
    comparePrevious(changed.getAttribute("data-mint") || "", true);
  }
});

document.addEventListener("stubx-lang", () => {
  if (!lastView) return;
  const compared = compareRecords(lastView.current, lastView.previous);
  if (compared.ok) paintComparison(lastView.current, lastView.previous, compared);
});
