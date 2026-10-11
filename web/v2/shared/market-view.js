/**
 * Bloque «Datos de mercado». createElement y textContent: el texto de la fuente no se interpreta como HTML.
 */
import {
  MARKET_READ_BUTTON,
  MARKET_STORED_NOTE,
  describeMarket,
  loadMarket,
  marketFailure,
  marketLoading,
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

function paintMarket(parent, model, lang) {
  const view = describeMarket(model, lang);
  const section = marketEl("section", {
    class: "datos-mercado",
    "data-estado": model && model.status ? model.status : "fallo",
    "aria-label": view.title,
  });
  const title = marketText("h3", view.title);
  section.append(
    title,
    marketText("p", view.intro, { class: "apoyo" }),
    marketText("p", view.notice, { class: "nota" }),
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
        marketText("p", pair.volume, { "data-cifra": "volumen" }),
      );
      const details = marketEl("details", { class: "tecnico" });
      details.append(marketText("summary", view.more));
      details.append(marketText("p", view.detail));
      details.append(marketText("p", pair.address, { class: "mint" }));
      details.append(marketText("p", pair.figure, { "data-cifra": "dolares" }));
      item.append(details);
      list.append(item);
    }
    section.append(list);
  }
  const gap = marketEl("div", { class: "bloque-mercado", "data-hueco": "falta" });
  gap.append(marketText("h4", view.gapTitle), marketText("p", view.gap, { "data-falta": "si" }));
  section.append(gap);
  parent.replaceChildren(section);
}

function paintMarketPrompt(parent, mint, lang, token) {
  const language = lang === "en" ? "en" : "es";
  const section = marketEl("section", { class: "datos-mercado", "data-estado": "guardado" });
  section.append(
    marketText("h3", language === "en" ? "Market data" : "Datos de mercado"),
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
  const token = {};
  marketTokens.set(parent, token);
  if (!auto) {
    paintMarketPrompt(parent, mint, lang, token);
    return;
  }
  const cached = freshMarket(mint);
  if (cached) {
    paintMarket(parent, cached, lang);
    return;
  }
  paintMarket(parent, marketLoading(mint), lang);
  const job = marketPending.get(mint) || loadMarket(mint);
  marketPending.set(mint, job);
  job
    .then((model) => {
      marketPending.delete(mint);
      rememberMarket(mint, model);
      if (marketTokens.get(parent) !== token) return;
      paintMarket(parent, model, lang);
    })
    .catch(() => {
      marketPending.delete(mint);
      if (marketTokens.get(parent) !== token) return;
      paintMarket(parent, marketFailure(mint, new Date().toISOString(), "http"), lang);
    });
}
