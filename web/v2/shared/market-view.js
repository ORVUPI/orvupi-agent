/**
 * Bloque «Datos de mercado». createElement y textContent: el texto de la fuente no se interpreta como HTML.
 * Las cifras no llevan color verde ni rojo. No se consulta nada hasta el botón.
 */
import {
  MARKET_ATTRIBUTION,
  MARKET_READ_BUTTON,
  MARKET_RETRY_BUTTON,
  MARKET_STORED_NOTE,
  MARKET_SUMMARY_GAP,
  describeMarket,
  loadMarket,
  marketFailure,
  marketLoading,
  marketPrivacyLead,
  marketPrivacyRest,
} from "./market-read.js";

const CACHE_MS = 60_000;
const marketCache = new Map();
const marketPending = new Map();
const marketTokens = new WeakMap();

function marketEl(tag, attrs) {
  const node = document.createElement(tag);
  if (!attrs) return node;
  for (const key of Object.keys(attrs)) {
    if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
  }
  return node;
}

function marketText(tag, value, attrs) {
  const node = marketEl(tag, attrs);
  node.textContent = value == null ? "" : String(value);
  return node;
}

function rememberMarket(mint, model) {
  if (!model || model.status === "fallo" || model.status === "limite" || model.status === "consulta") return;
  marketCache.set(mint, { at: Date.now(), model });
}

function freshMarket(mint) {
  const hit = marketCache.get(mint);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    marketCache.delete(mint);
    return null;
  }
  return hit.model;
}

function privacyFold(lang) {
  const language = lang === "en" ? "en" : "es";
  const details = marketEl("details", { class: "privacidad-mercado" });
  details.append(
    marketText("summary", language === "en" ? "More detail" : "Más detalle"),
    marketText("p", marketPrivacyRest(language)),
  );
  return [
    marketText("p", marketPrivacyLead(language), { class: "nota" }),
    details,
  ];
}

function summaryBox(anchor) {
  const sibling = anchor && anchor.previousElementSibling;
  if (sibling && sibling.classList && sibling.classList.contains("resumen-informe")) return sibling;
  const parent = anchor && anchor.parentElement;
  if (!parent || !parent.querySelector) return null;
  return parent.querySelector(".resumen-informe");
}

function syncMarketSummaryGap(anchor, show, lang) {
  const summary = summaryBox(anchor);
  if (!summary || !summary.querySelector) return;
  const box = summary.querySelector('[data-bloque="falta"]');
  if (!box) return;
  const language = lang === "en" ? "en" : "es";
  const item = box.querySelector("[data-mercado-falta='si']");
  if (!show) {
    if (!item) return;
    const list = item.parentElement;
    item.remove();
    if (list && list.children.length === 0) {
      const empty = marketText(
        "p",
        language === "en" ? "No requested fact is missing in this reading." : "No falta ningún dato pedido en esta lectura.",
        { class: "punto-vacio" },
      );
      list.replaceWith(empty);
    }
    return;
  }
  const empty = box.querySelector(".punto-vacio");
  let list = box.querySelector("ul");
  if (!list) {
    list = marketEl("ul");
    if (empty) empty.replaceWith(list);
    else box.append(list);
  } else if (empty) {
    empty.remove();
  }
  let row = item;
  if (!row) {
    row = marketEl("li", { class: "punto-resumen", "data-mercado-falta": "si" });
    const lead = marketText("p", "", { class: "punto-frase" });
    const body = marketEl("div");
    body.append(lead);
    row.append(body);
    list.append(row);
  }
  const lead = row.querySelector(".punto-frase");
  if (lead) lead.textContent = MARKET_SUMMARY_GAP[language];
}

function paintMarket(parent, model, lang, token, onRetry) {
  const view = describeMarket(model, lang);
  const language = lang === "en" ? "en" : "es";
  const section = marketEl("section", {
    class: "datos-mercado",
    "data-estado": model && model.status ? model.status : "fallo",
    "aria-label": view.title,
  });
  section.append(
    marketText("h3", view.title),
    marketText("p", view.intro, { class: "apoyo" }),
    marketText("p", view.notice, { class: "nota" }),
    ...privacyFold(language),
    marketText("p", view.attribution, { class: "atribucion-mercado" }),
    marketText("p", view.source, { class: "fuente-mercado" }),
  );
  if (view.pairs.length) {
    const list = marketEl("ul", { class: "pares-mercado" });
    for (const pair of view.pairs) {
      const item = marketEl("li");
      item.append(
        marketText("p", pair.title, { class: "par-nombre" }),
        marketText("p", pair.where),
        marketText("p", pair.liquidity, { "data-cifra": "liquidez" }),
      );
      if (pair.low) item.append(marketText("p", pair.low, { "data-cifra": "liquidez-baja" }));
      item.append(marketText("p", pair.volume, { "data-cifra": "volumen" }));
      const details = marketEl("details", { class: "tecnico" });
      details.append(marketText("summary", view.more));
      details.append(marketText("p", view.detail));
      details.append(marketText("p", pair.address, { class: "mint" }));
      item.append(details);
      list.append(item);
    }
    section.append(list);
  }
  const gap = marketEl("div", { class: "bloque-mercado", "data-hueco": "falta" });
  gap.append(marketText("h4", view.gapTitle), marketText("p", view.gap, { "data-falta": "si" }));
  if (view.retry && typeof onRetry === "function") {
    const button = marketText("button", MARKET_RETRY_BUTTON[language], {
      type: "button",
      class: "leer-mercado reintentar-mercado",
    });
    button.addEventListener("click", () => {
      if (marketTokens.get(parent) !== token) return;
      onRetry();
    });
    gap.append(button);
  }
  section.append(gap);
  parent.replaceChildren(section);
}

function paintMarketPrompt(parent, mint, lang, token) {
  const language = lang === "en" ? "en" : "es";
  const section = marketEl("section", { class: "datos-mercado", "data-estado": "espera" });
  section.append(
    marketText("h3", language === "en" ? "Market data" : "Datos de mercado"),
    ...privacyFold(language),
    marketText("p", MARKET_ATTRIBUTION[language], { class: "atribucion-mercado" }),
    marketText("p", MARKET_STORED_NOTE[language], { class: "nota" }),
  );
  const button = marketText("button", MARKET_READ_BUTTON[language], { type: "button", class: "leer-mercado" });
  button.addEventListener("click", () => {
    if (marketTokens.get(parent) !== token) return;
    mountMarket(parent, { mint, lang: language, auto: true });
  });
  section.append(button);
  parent.replaceChildren(section);
}

export function mountMarket(parent, options) {
  if (!parent) return;
  const mint = options && options.mint;
  const lang = options && options.lang === "en" ? "en" : "es";
  const auto = Boolean(options && options.auto);
  const force = Boolean(options && options.force);
  const token = {};
  marketTokens.set(parent, token);
  const asked = auto || force;
  const retry = () => mountMarket(parent, { mint, lang, auto: true, force: true });
  const settle = (model) => {
    if (marketTokens.get(parent) !== token) return;
    paintMarket(parent, model, lang, token, retry);
    if (asked) syncMarketSummaryGap(parent, Boolean(model && model.status === "fallo"), lang);
  };
  if (!auto && !force) {
    const cached = freshMarket(mint);
    if (cached) {
      paintMarket(parent, cached, lang, token, retry);
      return;
    }
    paintMarketPrompt(parent, mint, lang, token);
    return;
  }
  if (!force) {
    const cached = freshMarket(mint);
    if (cached) {
      paintMarket(parent, cached, lang, token, retry);
      if (asked) syncMarketSummaryGap(parent, false, lang);
      return;
    }
  }
  paintMarket(parent, marketLoading(mint), lang, token, retry);
  if (asked) syncMarketSummaryGap(parent, false, lang);
  if (force) marketPending.delete(mint);
  const pending = !force ? marketPending.get(mint) : null;
  const job = pending || loadMarket(mint);
  marketPending.set(mint, job);
  job
    .then((model) => {
      if (marketPending.get(mint) === job) marketPending.delete(mint);
      rememberMarket(mint, model);
      settle(model);
    })
    .catch(() => {
      if (marketPending.get(mint) === job) marketPending.delete(mint);
      settle(marketFailure(mint, new Date().toISOString(), "http"));
    });
}
