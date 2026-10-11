/**
 * Textos y ficha de una lectura EVM. El nombre de un token ajeno sale como
 * «Dice llamarse». Una moneda conocida de la red conserva su nombre fijo.
 */
import { formatAmount } from "./amount.js";
import { factState, factWord } from "./fact-state.js";
import { mountMarket } from "./market-view.js";
import { checksFor, enabledNetworks, networkById, rpcHost } from "./networks.js";
import { DISCLAIMER } from "./solana-read.js";
import { EVM_CARD_SCHEMA, EVM_CARD_VERSION, cardDecimals, staleLine } from "./notebook-model.js";
import { notebookNameText } from "./reading-summary.js";

const COPY = {
  es: {
    title: (net) => `Lectura en ${net}`,
    intro: "Esta lectura pregunta al contrato y anota lo que respondió. No dice si conviene hacer algo con el token.",
    invalid: "Esa dirección no tiene la forma de esta red: empieza por 0x y sigue con 40 letras o números hexadecimales. No se ha consultado el nodo.",
    zero: "Es la dirección cero: no es la dirección de ningún token.",
    checksum: "Las mayúsculas y minúsculas de la dirección no cuadran. Revisa que esté bien copiada.",
    limit: "Se han hecho 6 lecturas en un minuto. Espera un momento antes de comprobar otra. No se ha inventado un resultado.",
    down: "El nodo público no respondió. Cada dato que no llegó queda como consulta fallida. Prueba otra vez en un minuto.",
    partial: "La lectura está incompleta. Lo que falta no se ha puesto a cero.",
    off: "Esta red está en la lista y todavía no está encendida. No se ha consultado.",
    contract: "Tiene código: es un contrato.",
    account: "No tiene código: es una cuenta. A una cuenta sin código a veces se le llama EOA.",
    ownerRevert: "Se pidió owner(). El contrato no respondió esa función.",
    ownerZero: "owner() respondió con la dirección de ceros.",
    ownerEmpty: "owner() no devolvió datos: ausente / sin respuesta.",
    ownerOk: (address) => `owner() respondió ${address}.`,
    proxyOk: (impl, admin, beacon) => {
      const parts = ["Hay una anotación EIP-1967."];
      if (impl) parts.push(`La otra dirección es ${impl}.`);
      if (admin) parts.push(`La dirección admin es ${admin}.`);
      if (beacon) parts.push(`El beacon es ${beacon}.`);
      parts.push("Un proxy reenvía las preguntas a otro contrato.");
      parts.push("Otros tipos de proxy no se comprueban aquí.");
      return parts.join(" ");
    },
    proxyAbsent: "No hay anotación EIP-1967. Esta lectura no encontró otra dirección. Otros tipos de proxy no se comprueban aquí.",
    supplyRaw: (raw) => `Unidades mínimas: ${raw}. No se ha desplegado porque hay más de 18 decimales.`,
    node: (host) => `Nodo: ${host}.`,
    save: "Guardar esta consulta",
    checksTitle: "Qué puede comprobar esta red",
    can: "Esta lectura puede pedir",
    cannot: "Esta lectura no pide",
    notStubx: "No es la dirección de STUBX en Solana.",
    third: "El nombre y el símbolo son texto que escribió el contrato.",
  },
  en: {
    title: (net) => `Reading on ${net}`,
    intro: "This reading asks the contract and writes down what it answered. It does not say whether any action with the token is advisable.",
    invalid: "That address does not have this network's shape: it starts with 0x and continues with 40 hexadecimal letters or numbers. The node was not queried.",
    zero: "This is the zero address: it is not a token address.",
    checksum: "The upper and lower case letters in this address do not match. Check that it was copied correctly.",
    limit: "6 readings were made in one minute. Wait a moment before checking another. No result was invented.",
    down: "The public node did not respond. Each fact that did not arrive stays a failed query. Try again in a minute.",
    partial: "The reading is incomplete. What is missing was not filled in with zero.",
    off: "This network is on the list and is not switched on yet. It was not queried.",
    contract: "It has code: it is a contract.",
    account: "It has no code: it is an account. An account with no code is sometimes called an EOA.",
    ownerRevert: "owner() was requested. The contract did not answer that function.",
    ownerZero: "owner() answered with the zero address.",
    ownerEmpty: "owner() returned no data: absent / no answer.",
    ownerOk: (address) => `owner() answered ${address}.`,
    proxyOk: (impl, admin, beacon) => {
      const parts = ["There is an EIP-1967 note."];
      if (impl) parts.push(`The other address is ${impl}.`);
      if (admin) parts.push(`The admin address is ${admin}.`);
      if (beacon) parts.push(`The beacon is ${beacon}.`);
      parts.push("A proxy forwards questions to another contract.");
      parts.push("Other proxy types are not checked here.");
      return parts.join(" ");
    },
    proxyAbsent: "There is no EIP-1967 note. This reading did not find another address. Other proxy types are not checked here.",
    supplyRaw: (raw) => `Smallest units: ${raw}. It was not expanded because there are more than 18 decimals.`,
    node: (host) => `Node: ${host}.`,
    save: "Save this lookup",
    checksTitle: "What this network can check",
    can: "This reading can ask for",
    cannot: "This reading does not ask for",
    notStubx: "It is not the STUBX address on Solana.",
    third: "The name and the symbol are text the contract wrote.",
  },
};

function languageOf(lang) {
  return lang === "en" ? "en" : "es";
}

function copy(lang) {
  return COPY[languageOf(lang)];
}

export function invalidSupport(reason, lang) {
  const text = copy(lang);
  if (reason === "cero") return text.zero;
  if (reason === "checksum") return text.checksum;
  return text.invalid;
}

export function pageLede(networkId, lang) {
  if (networkId === "solana") return "";
  const language = languageOf(lang);
  const network = networkById(networkId);
  const label = network ? network.label[language] : networkId;
  if (language === "en") {
    return `Any ERC-20 token on ${label}, read live and read-only. The cards below are dated examples, not a complete list. Choose the network. On ${label} the reading is read-only: no wallet and no signature.`;
  }
  return `Cualquier token ERC-20 de ${label}, leído en directo y solo en lectura. Las fichas de abajo son ejemplos fechados, no una lista completa. Elige la red. En ${label} la lectura es solo lectura: sin cartera y sin firma.`;
}

export function evmCardFromReading(reading) {
  const facts = reading && reading.facts ? reading.facts : {};
  const pick = (fact, extra) => ({ status: fact && fact.status ? fact.status : "no_consultado", ...extra });
  return {
    schema: EVM_CARD_SCHEMA,
    schemaVersion: EVM_CARD_VERSION,
    rulesVersion: "0.1.0",
    network: reading && reading.network ? reading.network : "",
    address: reading && reading.address ? reading.address : "",
    consultedAt: reading && reading.consultedAt ? reading.consultedAt : "",
    partial: Boolean(reading && reading.partial),
    code: pick(facts.code, { kind: facts.code ? facts.code.kind : null }),
    name: pick(facts.name, { text: facts.name ? facts.name.text : null }),
    symbol: pick(facts.symbol, { text: facts.symbol ? facts.symbol.text : null }),
    decimals: pick(facts.decimals, { value: facts.decimals ? facts.decimals.value : null }),
    totalSupply: pick(facts.totalSupply, { raw: facts.totalSupply ? facts.totalSupply.raw : null }),
    owner: pick(facts.owner, {
      address: facts.owner ? facts.owner.address : null,
      reason: facts.owner ? facts.owner.reason : null,
    }),
    proxy: pick(facts.proxy, {
      implementation: facts.proxy ? facts.proxy.implementation : null,
      admin: facts.proxy ? facts.proxy.admin : null,
      beacon: facts.proxy ? facts.proxy.beacon : null,
    }),
    disclaimer: { es: DISCLAIMER.es, en: DISCLAIMER.en },
  };
}

function helpFor(networkId, id, lang) {
  const groups = checksFor(networkId);
  const found = groups.available.concat(groups.unavailable).find((item) => item.id === id);
  if (!found) return "";
  return found.help[languageOf(lang)];
}

function lineFor(status, value, text, lang) {
  const state = factState(status, value);
  const word = factWord(state, lang);
  if (text) return `${text} · ${word}`;
  return word;
}

export function describeEvm(reading, lang) {
  const language = languageOf(lang);
  const text = copy(language);
  const network = networkById(reading && reading.network);
  const netLabel = network ? network.label[language] : String((reading && reading.network) || "");
  const facts = reading && reading.facts ? reading.facts : {};
  const card = evmCardFromReading(reading || {});
  const spoken = notebookNameText(card, language);
  const decimals = cardDecimals(card);
  const supply = facts.totalSupply || { status: "no_consultado", raw: null };
  let supplyText = "";
  if (supply.status === "ok" && supply.raw) {
    const formatted = decimals !== null && decimals <= 18 ? formatAmount(supply.raw, decimals, language) : null;
    supplyText = formatted || text.supplyRaw(supply.raw);
  }
  let codeText = "";
  if (facts.code && facts.code.status === "ok" && facts.code.kind === "contrato") codeText = text.contract;
  if (facts.code && facts.code.status === "ok" && facts.code.kind === "cuenta") codeText = text.account;
  let ownerText = "";
  if (facts.owner && facts.owner.status === "ok" && facts.owner.address) ownerText = text.ownerOk(facts.owner.address);
  if (facts.owner && facts.owner.status === "ausente" && facts.owner.reason === "revert") ownerText = text.ownerRevert;
  if (facts.owner && facts.owner.status === "ausente" && facts.owner.reason === "cero") ownerText = text.ownerZero;
  if (facts.owner && facts.owner.status === "ausente" && facts.owner.reason === "vacio") ownerText = text.ownerEmpty;
  let proxyText = "";
  if (facts.proxy && facts.proxy.status === "ok") proxyText = text.proxyOk(facts.proxy.implementation, facts.proxy.admin, facts.proxy.beacon);
  if (facts.proxy && facts.proxy.status === "ausente") proxyText = text.proxyAbsent;
  const networkId = card.network;
  const rows = [
    { id: "code", label: language === "en" ? "Contract or account" : "Contrato o cuenta", status: facts.code && facts.code.status, value: facts.code && facts.code.kind, line: lineFor(facts.code && facts.code.status, facts.code && facts.code.kind, codeText, language), help: helpFor(networkId, "code", language) },
    { id: "name", label: language === "en" ? "Name" : "Nombre", status: facts.name && facts.name.status, value: facts.name && facts.name.text, line: lineFor(facts.name && facts.name.status, facts.name && facts.name.text, spoken, language), help: helpFor(networkId, "name", language) },
    { id: "symbol", label: language === "en" ? "Symbol" : "Símbolo", status: facts.symbol && facts.symbol.status, value: facts.symbol && facts.symbol.text, line: lineFor(facts.symbol && facts.symbol.status, facts.symbol && facts.symbol.text, facts.symbol && facts.symbol.text, language), help: helpFor(networkId, "symbol", language) },
    { id: "decimals", label: language === "en" ? "Decimals" : "Decimales", status: facts.decimals && facts.decimals.status, value: facts.decimals ? facts.decimals.value : null, line: lineFor(facts.decimals && facts.decimals.status, facts.decimals ? facts.decimals.value : null, facts.decimals && facts.decimals.status === "ok" ? String(facts.decimals.value) : "", language), help: helpFor(networkId, "decimals", language) },
    { id: "supply", label: language === "en" ? "Total amount" : "Cantidad total", status: supply.status, value: supply.raw, line: lineFor(supply.status, supply.raw, supplyText, language), help: helpFor(networkId, "supply", language) },
    { id: "owner", label: language === "en" ? "owner() address" : "Dirección owner()", status: facts.owner && facts.owner.status, value: facts.owner && facts.owner.address, line: lineFor(facts.owner && facts.owner.status, facts.owner && (facts.owner.address || facts.owner.reason), ownerText, language), help: helpFor(networkId, "owner", language) },
    { id: "proxy", label: language === "en" ? "EIP-1967 proxy" : "Proxy EIP-1967", status: facts.proxy && facts.proxy.status, value: facts.proxy && (facts.proxy.implementation || facts.proxy.admin || facts.proxy.beacon), line: lineFor(facts.proxy && facts.proxy.status, facts.proxy && (facts.proxy.implementation || facts.proxy.admin || facts.proxy.beacon || (facts.proxy.status === "ausente" ? "ausente" : null)), proxyText, language), help: helpFor(networkId, "proxy", language) },
  ];
  const states = rows.map((row) => factState(row.status, row.value));
  const allFailed = states.every((state) => state === "fallo");
  const noneAsked = states.every((state) => state === "no_consultado");
  let headline = text.title(netLabel);
  let support = text.intro;
  if (reading && (reading.reason === "invalid" || reading.reason === "cero" || reading.reason === "checksum")) {
    headline = language === "en" ? "Not queried" : "No consultado";
    support = invalidSupport(reading.reason, language);
  } else if (reading && reading.reason === "limite") {
    headline = language === "en" ? "Could not be checked" : "No se pudo comprobar";
    support = text.limit;
  } else if (reading && reading.reason === "red") {
    headline = language === "en" ? "Could not be checked" : "No se pudo comprobar";
    support = text.off;
  } else if (allFailed) {
    headline = language === "en" ? "Could not be checked" : "No se pudo comprobar";
    support = text.down;
  } else if (noneAsked) {
    support = text.invalid;
  }
  return {
    headline,
    support,
    partial: Boolean(reading && reading.partial) && !allFailed,
    partialText: text.partial,
    node: reading && reading.rpcHost ? text.node(reading.rpcHost) : "",
    address: card.address,
    rows,
    card,
    disclaimer: DISCLAIMER[language],
    notStubx: text.notStubx,
    third: text.third,
    save: text.save,
  };
}

export function checksCopy(networkId, lang) {
  const language = languageOf(lang);
  const text = copy(language);
  const groups = checksFor(networkId);
  const map = (item) => ({ id: item.id, label: item[language], help: item.help[language] });
  return {
    title: text.checksTitle,
    can: text.can,
    cannot: text.cannot,
    available: groups.available.map(map),
    unavailable: groups.unavailable.map(map),
  };
}

const BASE_PRIVACY = {
  es: "Al consultar en Base, tu navegador envía la dirección al nodo público mainnet.base.org, que también ve tu IP. Si pides los datos de mercado, DEX Screener también ve tu IP y la dirección.",
  en: "When you look up on Base, your browser sends the address to the public node mainnet.base.org, which also sees your IP. If you request market data, DEX Screener also sees your IP and the address.",
};

export function privacyText(networkId, lang) {
  const language = languageOf(lang);
  if (networkId === "base") return BASE_PRIVACY[language];
  const host = rpcHost(networkId);
  const network = networkById(networkId);
  const label = network ? network.label[language] : networkId;
  if (!host) return "";
  if (language === "en") return `To read it on ${label}, it is sent to the public node ${host}, which also sees your IP.`;
  return `Para leerla en ${label}, se envía al nodo público ${host}, que también ve tu IP.`;
}

export function fillNetworkSelect(select) {
  if (!select) return;
  const current = select.value || "solana";
  select.replaceChildren();
  for (const network of enabledNetworks()) {
    const option = document.createElement("option");
    option.value = network.id;
    option.textContent = network.label.es;
    option.dataset.labelEs = network.label.es;
    option.dataset.labelEn = network.label.en;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;
  else if ([...select.options].some((option) => option.value === "solana")) select.value = "solana";
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  if (!attrs) return node;
  for (const key of Object.keys(attrs)) {
    if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
  }
  return node;
}

function textNode(tag, value, attrs) {
  const node = el(tag, attrs);
  node.textContent = value == null ? "" : String(value);
  return node;
}

export function paintChecks(parent, networkId, lang) {
  if (!parent) return;
  const view = checksCopy(networkId, lang);
  const section = el("section");
  section.append(textNode("h2", view.title));
  section.append(textNode("h3", view.can));
  const yes = el("ul");
  for (const item of view.available) {
    const li = el("li");
    li.append(textNode("strong", item.label), document.createTextNode(` ${item.help}`));
    yes.append(li);
  }
  section.append(yes, textNode("h3", view.cannot));
  const no = el("ul");
  for (const item of view.unavailable) {
    const li = el("li");
    li.append(textNode("strong", item.label), document.createTextNode(` ${item.help}`));
    no.append(li);
  }
  section.append(no);
  parent.replaceChildren(section);
}

export function paintEvmResult(parent, reading, lang, options) {
  if (!parent) return;
  const view = describeEvm(reading, lang);
  const article = el("article", { class: "ficha", "data-red": reading && reading.network ? reading.network : "" });
  if (view.card.consultedAt) article.append(textNode("p", staleLine(view.card.consultedAt, lang), { class: "sello" }));
  article.append(textNode("h2", view.headline));
  article.append(textNode("p", view.support, { class: "apoyo" }));
  if (view.partial) article.append(textNode("p", view.partialText, { class: "nota" }));
  article.append(textNode("p", view.notStubx, { class: "franja-identidad" }));
  article.append(textNode("p", view.disclaimer, { class: "nota" }));
  if (view.address) {
    const line = el("p");
    const code = el("code", { class: "mint" });
    code.textContent = view.address;
    line.append(code);
    article.append(line);
  }
  if (view.node) article.append(textNode("p", view.node, { class: "muted" }));
  const list = el("dl");
  for (const row of view.rows) {
    const term = textNode("dt", row.label);
    const detail = el("dd");
    detail.dataset.estado = factState(row.status, row.value);
    detail.append(textNode("p", row.line));
    if (row.help) detail.append(textNode("p", row.help, { class: "muted" }));
    list.append(term, detail);
  }
  article.append(list);
  article.append(textNode("p", view.third, { class: "muted" }));
  const marketHost = el("div", { class: "hueco-mercado" });
  article.append(marketHost);
  if (view.card.address && reading && reading.reason === "leido") {
    mountMarket(marketHost, {
      mint: view.card.address,
      lang: languageOf(lang),
      chain: view.card.network,
      auto: false,
    });
  }
  if (options && typeof options.onSave === "function" && reading && reading.reason === "leido") {
    const button = textNode("button", view.save, {
      type: "button",
      id: "guardar-consulta",
      "data-network": view.card.network,
      "data-mint": view.card.address,
    });
    button.addEventListener("click", () => options.onSave(view.card));
    article.append(button);
  }
  const status = el("div", { id: "estado-guardado" });
  article.append(status);
  parent.replaceChildren(article);
  parent.dataset.state = "leido";
  parent.dataset.luz = "neutro";
}

export function syncNetworkLabels(lang) {
  const language = languageOf(lang);
  for (const select of document.querySelectorAll("select[data-red='si']")) {
    for (const option of select.options) {
      const label = language === "en" ? option.dataset.labelEn : option.dataset.labelEs;
      if (label) option.textContent = label;
    }
  }
}
