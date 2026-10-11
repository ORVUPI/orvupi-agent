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

function marketKey(mint, chain) {
  return chain && chain !== "solana" ? `${chain}:${mint}` : mint;
}

function rememberMarket(mint, model, chain) {
  if (!model || model.status === "fallo" || model.status === "limite" || model.status === "consulta") return;
  marketCache.set(marketKey(mint, chain), { at: Date.now(), model });
}

function freshMarket(mint, chain) {
  const hit = marketCache.get(marketKey(mint, chain));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    marketCache.delete(mint);
    return null;
  }
  return hit.model;
}

function privacyParts(lang) {
  const language = lang === "en" ? "en" : "es";
  const details = marketEl("details", { class: "privacidad-mercado" });
  details.append(
    marketText("summary", language === "en" ? "More detail" : "Más detalle"),
    marketText("p", marketPrivacyRest(language)),
  );
  const lead = marketText("p", marketPrivacyLead(language), { class: "nota", "data-aviso": "dex" });
  return { lead, details };
}

function besideButton(lead, button) {
  const pair = marketEl("div", { class: "aviso-boton" });
  pair.append(lead, button);
  return pair;
}

function summaryBox(anchor) {
  const sibling = anchor && anchor.previousElementSibling;
  if (sibling && sibling.classList && sibling.classList.contains("resumen-informe")) return sibling;
  const parent = anchor && anchor.parentElement;
  if (!parent || !parent.querySelector) return null;
  return parent.querySelector(".resumen-informe");
}

function syncMarketSummaryGap(anchor, show, lang, onRetry) {
  const summary = summaryBox(anchor);
  if (!summary || !summary.querySelector) return;
  const box = summary.querySelector('[data-bloque="falta"]');
  if (!box) return;
  const language = lang === "en" ? "en" : "es";
  const item = box.querySelector("[data-mercado-falta='si']");
  const hasSolanaPoint = Boolean(box.querySelector("ul li"));
  if (!show) {
    if (item) item.remove();
    if (!hasSolanaPoint && !box.querySelector(".punto-vacio")) {
      const empty = marketText(
        "p",
        language === "en" ? "No requested fact is missing in this reading." : "No falta ningún dato pedido en esta lectura.",
        { class: "punto-vacio" },
      );
      const head = box.querySelector(".cabecera-bloque");
      if (head) head.after(empty);
      else box.prepend(empty);
    }
    return;
  }
  if (!hasSolanaPoint) {
    const empty = box.querySelector(".punto-vacio");
    if (empty) empty.remove();
  }
  let row = item;
  if (!row) {
    row = marketEl("div", { class: "falta-mercado", "data-mercado-falta": "si" });
    const lead = marketText("p", "", { class: "punto-frase" });
    const button = marketText("button", language === "en" ? "Try again" : "Reintentar", {
      type: "button",
      class: "reintentar-resumen reintentar-mercado-resumen",
    });
    button.addEventListener("click", () => {
      if (typeof onRetry === "function") onRetry();
    });
    row.append(lead, button);
    box.append(row);
  }
  const lead = row.querySelector(".punto-frase");
  if (lead) lead.textContent = MARKET_SUMMARY_GAP[language];
}

function paintMarket(parent, model, lang, token, onRetry) {
  const view = describeMarket(model, lang);
  const language = lang === "en" ? "en" : "es";
  const privacy = privacyParts(language);
  const section = marketEl("section", {
    class: "datos-mercado",
    "data-estado": model && model.status ? model.status : "fallo",
    "aria-label": view.title,
  });
  section.append(
    marketText("h3", view.title),
    marketText("p", view.intro, { class: "apoyo" }),
    marketText("p", view.notice, { class: "nota" }),
    privacy.details,
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
    gap.append(besideButton(privacy.lead, button));
  } else {
    gap.append(privacy.lead);
  }
  section.append(gap);
  parent.replaceChildren(section);
}

function paintMarketPrompt(parent, mint, lang, token, chain) {
  const language = lang === "en" ? "en" : "es";
  const privacy = privacyParts(language);
  const section = marketEl("section", { class: "datos-mercado", "data-estado": "espera" });
  const button = marketText("button", MARKET_READ_BUTTON[language], { type: "button", class: "leer-mercado" });
  button.addEventListener("click", () => {
    if (marketTokens.get(parent) !== token) return;
    mountMarket(parent, { mint, lang: language, chain, auto: true });
  });
  section.append(
    marketText("h3", language === "en" ? "Market data" : "Datos de mercado"),
    privacy.details,
    marketText("p", MARKET_ATTRIBUTION[language], { class: "atribucion-mercado" }),
    marketText("p", MARKET_STORED_NOTE[language], { class: "nota" }),
    besideButton(privacy.lead, button),
  );
  parent.replaceChildren(section);
}

export function mountMarket(parent, options) {
  if (!parent) return;
  const mint = options && options.mint;
  const lang = options && options.lang === "en" ? "en" : "es";
  const chain = options && typeof options.chain === "string" && options.chain ? options.chain : "solana";
  const auto = Boolean(options && options.auto);
  const force = Boolean(options && options.force);
  const token = {};
  marketTokens.set(parent, token);
  const asked = auto || force;
  const retry = () => mountMarket(parent, { mint, lang, chain, auto: true, force: true });
  const settle = (model) => {
    if (marketTokens.get(parent) !== token) return;
    paintMarket(parent, model, lang, token, retry);
    if (asked) syncMarketSummaryGap(parent, Boolean(model && model.status === "fallo"), lang, retry);
  };
  if (!auto && !force) {
    const cached = freshMarket(mint, chain);
    if (cached) {
      paintMarket(parent, cached, lang, token, retry);
      return;
    }
    paintMarketPrompt(parent, mint, lang, token, chain);
    return;
  }
  if (!force) {
    const cached = freshMarket(mint, chain);
    if (cached) {
      paintMarket(parent, cached, lang, token, retry);
      if (asked) syncMarketSummaryGap(parent, false, lang, retry);
      return;
    }
  }
  paintMarket(parent, marketLoading(mint), lang, token, retry);
  if (asked) syncMarketSummaryGap(parent, false, lang, retry);
  const key = marketKey(mint, chain);
  if (force) marketPending.delete(key);
  const pending = !force ? marketPending.get(key) : null;
  const job = pending || loadMarket(mint, undefined, chain === "solana" ? undefined : { chain });
  marketPending.set(key, job);
  job
    .then((model) => {
      if (marketPending.get(key) === job) marketPending.delete(key);
      rememberMarket(mint, model, chain);
      settle(model);
    })
    .catch(() => {
      if (marketPending.get(key) === job) marketPending.delete(key);
      settle(marketFailure(mint, new Date().toISOString(), "http"));
    });
}
