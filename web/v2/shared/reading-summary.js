/**
 * Resumen en lenguaje sencillo de una lectura.
 * Tres bloques, sin puntuación, sin semáforo de «seguro» y sin recomendación.
 * Cada punto apunta a su párrafo en «Entender este resultado».
 */

const TOPIC_BY_ID = {
  suministro: "suministro",
  "suministro-extra": "suministro",
  decimales: "suministro",
  programa: "permisos",
  emision: "permisos",
  congelacion: "permisos",
  extensiones: "permisos",
  metadatos: "metadatos",
  enlace: "metadatos",
  nombre: "metadatos",
  simbolo: "metadatos",
  uri: "metadatos",
  mutable: "metadatos",
  cuentas: "distribucion",
  curva: "curva",
};

const SUMMARY_COPY = {
  emision: {
    es: "Permiso de emisión activo. En una moneda estable es habitual: quien emite añade unidades cuando entra dinero. Si el proyecto prometió un suministro fijo, el mismo permiso permite crear más. Conviene contrastarlo con lo que promete el proyecto. Esta lectura no dice cuál de los dos casos es.",
    en: "Active mint permission. On a stablecoin that is common: the issuer adds units when money comes in. If the project promised a fixed supply, the same permission can create more. It is worth comparing with what the project promises. This reading does not say which of the two cases this is.",
  },
  congelacion: {
    es: "Permiso de congelación activo. Puede bloquear cuentas de este token. Una señal sola no acusa al proyecto.",
    en: "Active freeze permission. It can block accounts of this token. One signal does not accuse the project.",
  },
  mutable: {
    es: "Los metadatos se pueden cambiar. El nombre o el símbolo de esta lectura pueden no ser los de mañana. Eso, por sí solo, no es una suplantación.",
    en: "The metadata can be changed. The name or symbol in this reading may not be tomorrow's. That, on its own, is not impersonation.",
  },
  concentracion: {
    es: "En la muestra, una cuenta reúne una parte grande de los tokens. La muestra no es un censo de personas. Una señal sola no acusa al proyecto.",
    en: "In the sample, one account holds a large share of the tokens. The sample is not a census of people. One signal does not accuse the project.",
  },
  suministro: {
    es: "La lectura extra del suministro no coincide con los bytes del mint. Se muestra la cifra de los bytes y no se calculan porcentajes. Eso no acusa al proyecto.",
    en: "The extra supply read does not match the mint bytes. The figure shown is the one from the bytes, and percentages are not calculated. That does not accuse the project.",
  },
};

const EMPTY = {
  checked: {
    es: "Ningún dato quedó leído en esta consulta.",
    en: "No fact was read in this query.",
  },
  attention: {
    es: "Ninguna señal de esta lectura pide atención. Que no aparezca no significa que no haya riesgo.",
    en: "No signal in this reading needs attention. One not showing does not mean there is no risk.",
  },
  missing: {
    es: "No falta ningún dato pedido en esta lectura.",
    en: "No requested fact is missing in this reading.",
  },
};

const SERVICE = {
  es: "El servicio público no respondió, prueba otra vez en un minuto.",
  en: "The public service did not respond, try again in a minute.",
};

const CURVE_NA = {
  es: "No aplica: este token no se creó en Pump.fun",
  en: "Not applicable: this token was not created on Pump.fun",
};

export const SUMMARY_HEADINGS = Object.freeze({
  title: { es: "Resumen", en: "Summary" },
  checked: { es: "Qué se comprobó", en: "What was checked" },
  attention: { es: "Qué requiere atención", en: "What needs attention" },
  missing: { es: "Qué falta", en: "What is missing" },
  retry: { es: "Reintentar", en: "Try again" },
});

function topicOf(id) {
  if (TOPIC_BY_ID[id]) return TOPIC_BY_ID[id];
  if (typeof id === "string" && id.startsWith("extension")) return "permisos";
  return "permisos";
}

function summaryPair(es, en) {
  return { es, en };
}

function failedSignal(signal) {
  const blob = `${signal?.title?.es ?? ""} ${signal?.explain?.es ?? ""} ${signal?.title?.en ?? ""} ${signal?.explain?.en ?? ""}`;
  return /no se pudo|could not be checked|could not be read|no respondió|did not respond|consulta fallida|failed query/i.test(blob);
}

function genericAttention(signal) {
  const titleEs = signal?.title?.es || "Señal";
  const titleEn = signal?.title?.en || "Signal";
  return {
    topic: topicOf(signal?.id),
    text: summaryPair(
      `${titleEs}. Es un dato de esta lectura. Una señal sola no acusa al proyecto.`,
      `${titleEn}. It is a fact from this reading. One signal does not accuse the project.`,
    ),
  };
}

function attentionFromSignals(signals) {
  const items = [];
  for (const signal of signals || []) {
    if (!signal || (signal.level !== "atencion" && signal.level !== "riesgo")) continue;
    if (failedSignal(signal)) continue;
    if (signal.id === "emision") items.push({ topic: "permisos", text: SUMMARY_COPY.emision });
    else if (signal.id === "congelacion") items.push({ topic: "permisos", text: SUMMARY_COPY.congelacion });
    else if (signal.id === "mutable") items.push({ topic: "metadatos", text: SUMMARY_COPY.mutable });
    else if (signal.id === "cuentas") items.push({ topic: "distribucion", text: SUMMARY_COPY.concentracion });
    else if (signal.id === "suministro") items.push({ topic: "suministro", text: SUMMARY_COPY.suministro });
    else items.push(genericAttention(signal));
  }
  return items;
}

function attentionFromCard(card) {
  const items = [];
  if (card?.mintAuthority?.state === "activa") items.push({ topic: "permisos", text: SUMMARY_COPY.emision });
  if (card?.freezeAuthority?.state === "activa") items.push({ topic: "permisos", text: SUMMARY_COPY.congelacion });
  if (card?.metadataMutable === "si") items.push({ topic: "metadatos", text: SUMMARY_COPY.mutable });
  return items;
}

function factLine(fact) {
  if (fact.state === "ausente") {
    return summaryPair(`${fact.label.es}: ausente comprobado`, `${fact.label.en}: confirmed absent`);
  }
  if (fact.state === "no_aplica" && fact.id === "curva") return CURVE_NA;
  if (fact.state === "no_aplica") return summaryPair(`${fact.label.es}: no aplica`, `${fact.label.en}: not applicable`);
  if (fact.state === "fallo") return summaryPair(`${fact.label.es}: consulta fallida`, `${fact.label.en}: failed query`);
  return fact.label;
}

function assemble(facts, attention) {
  const checked = [];
  const missing = [];
  for (const fact of facts) {
    if (!fact || !fact.label) continue;
    if (fact.state === "no_consultado") continue;
    const text = factLine(fact);
    const item = { topic: topicOf(fact.id), text };
    if (fact.state === "fallo") missing.push(item);
    else if (fact.state === "ok" || fact.state === "ausente" || fact.state === "no_aplica") checked.push(item);
  }
  return {
    title: SUMMARY_HEADINGS.title,
    blocks: [
      { id: "comprobado", heading: SUMMARY_HEADINGS.checked, items: checked, empty: EMPTY.checked },
      { id: "atencion", heading: SUMMARY_HEADINGS.attention, items: attention, empty: EMPTY.attention },
      { id: "falta", heading: SUMMARY_HEADINGS.missing, items: missing, empty: EMPTY.missing, service: missing.length ? SERVICE : null },
    ],
    retry: missing.length > 0,
  };
}

export function buildReadingSummary(view) {
  const facts = Array.isArray(view?.facts) ? view.facts.slice() : [];
  const attention = attentionFromSignals(view?.signals);
  if (!facts.length && (view?.kind === "red" || view?.kind === "limite" || view?.kind === "tiempo" || view?.ok === false)) {
    facts.push({
      id: "suministro",
      label: summaryPair("Esta lectura", "This reading"),
      state: "fallo",
    });
  }
  return assemble(facts, attention);
}

function pushFact(facts, id, es, en, state) {
  facts.push({ id, label: summaryPair(es, en), state });
}

function authorityState(field) {
  if (!field) return "fallo";
  if (field.status === "no_aplica" || field.state === "no_aplica") return "no_aplica";
  if (field.status === "fallo" || field.state === "no_decodificable") return "fallo";
  if (field.state === "activa" || field.state === "revocada") return "ok";
  if (field.status === "verificado" || field.status === "ok") return "ok";
  return "fallo";
}

export function summaryFromCard(card) {
  const facts = [];
  if (!card) return assemble(facts, []);
  const programState = card.programStatus === "verificado" || card.programStatus === "ok"
    ? "ok"
    : card.programStatus === "no_aplica"
      ? "no_aplica"
      : card.programStatus === "no_consultado"
        ? "no_consultado"
        : "fallo";
  pushFact(facts, "programa", "Programa", "Program", programState);
  pushFact(facts, "emision", "Permiso de emisión", "Mint permission", authorityState(card.mintAuthority));
  pushFact(facts, "congelacion", "Permiso de congelación", "Freeze permission", authorityState(card.freezeAuthority));
  const account = typeof card.supplyAccount === "string" && /^\d+$/.test(card.supplyAccount);
  const extra = card.supplyRpcStatus === "verificado" && typeof card.supplyRpc === "string" && /^\d+$/.test(card.supplyRpc);
  if (card.supplyRpcStatus === "no_aplica" && !account) {
    pushFact(facts, "suministro", "Suministro", "Supply", "no_aplica");
  } else if (account) {
    pushFact(facts, "suministro", "Suministro en los bytes del mint", "Supply in the mint bytes", "ok");
    pushFact(
      facts,
      "suministro-extra",
      "Consulta extra del suministro",
      "Extra supply query",
      extra && card.supplyRpc === card.supplyAccount ? "ok" : "fallo",
    );
  } else if (extra) {
    pushFact(facts, "suministro-extra", "Consulta extra del suministro", "Extra supply query", "ok");
  } else if (card.supplyRpcStatus !== "no_consultado") {
    pushFact(facts, "suministro", "Suministro", "Supply", "fallo");
  }
  const decimalsState = card.decimals === null || card.decimals === undefined ? "ausente" : "ok";
  pushFact(facts, "decimales", "Decimales", "Decimals", decimalsState);
  pushFact(facts, "nombre", "Nombre", "Name", textState(card.name));
  pushFact(facts, "simbolo", "Símbolo", "Symbol", textState(card.symbol));
  pushFact(facts, "uri", "Enlace de metadatos", "Metadata link", textState(card.uri));
  pushFact(facts, "mutable", "Metadatos que se pueden cambiar", "Metadata that can change", mutableState(card.metadataMutable));
  if (card.extensionsStatus && card.extensionsStatus !== "no_consultado") {
    const extensionState = card.extensionsStatus === "verificado" || card.extensionsStatus === "ok"
      ? "ok"
      : card.extensionsStatus === "no_aplica"
        ? "no_aplica"
        : card.extensionsStatus === "ausente"
          ? "ausente"
          : "fallo";
    pushFact(facts, "extensiones", "Extensiones", "Extensions", extensionState);
  }
  const curve = card.curve || {};
  const curveState = curve.status === "verificado" || curve.status === "ok"
    ? "ok"
    : curve.status === "ausente"
      ? "ausente"
      : curve.status === "no_aplica"
        ? "no_aplica"
        : curve.status === "no_consultado"
          ? "no_consultado"
          : "fallo";
  pushFact(facts, "curva", "Curva", "Curve", curveState);
  if (card.largestStatus && card.largestStatus !== "no_consultado" && card.largestStatus !== "no_disponible") {
    const largestState = card.largestStatus === "ok" || card.largestStatus === "verificado"
      ? "ok"
      : card.largestStatus === "ausente"
        ? "ausente"
        : card.largestStatus === "no_aplica"
          ? "no_aplica"
          : "fallo";
    pushFact(facts, "cuentas", "Cuentas con más tokens", "Largest token accounts", largestState);
  }
  return assemble(facts, attentionFromCard(card));
}

function textState(field) {
  if (!field) return "fallo";
  if (field.status === "no_aplica") return "no_aplica";
  if (field.status === "ausente") return "ausente";
  if (field.status === "fallo" || field.status === "no_disponible") return "fallo";
  if (field.status === "no_consultado") return "no_consultado";
  if (field.text) return "ok";
  return "ausente";
}

function mutableState(value) {
  if (value === "si" || value === "no") return "ok";
  if (value === "ausente") return "ausente";
  if (value === "no_aplica") return "no_aplica";
  if (value === "no_consultado") return "no_consultado";
  return "fallo";
}

export function renderReadingSummary(parent, model, lang, options) {
  const language = lang === "en" ? "en" : "es";
  const section = document.createElement("section");
  section.className = "resumen-informe";
  section.setAttribute("aria-label", model.title[language]);
  const title = document.createElement("h3");
  title.textContent = model.title[language];
  section.append(title);
  for (const block of model.blocks) {
    const box = document.createElement("div");
    box.className = "bloque-resumen";
    box.dataset.bloque = block.id;
    const heading = document.createElement("h4");
    heading.textContent = block.heading[language];
    box.append(heading);
    if (!block.items.length) {
      const empty = document.createElement("p");
      empty.textContent = block.empty[language];
      box.append(empty);
    } else {
      const list = document.createElement("ul");
      for (const item of block.items) {
        const row = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#entender-${item.topic}`;
        link.dataset.tema = item.topic;
        link.textContent = item.text[language];
        link.addEventListener("click", (event) => {
          event.preventDefault();
          openEntender(link, item.topic);
        });
        row.append(link);
        list.append(row);
      }
      box.append(list);
    }
    if (block.service) {
      const service = document.createElement("p");
      service.textContent = block.service[language];
      box.append(service);
    }
    if (block.id === "falta" && model.retry) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reintentar-resumen";
      if (options?.retryId) button.id = options.retryId;
      button.textContent = SUMMARY_HEADINGS.retry[language];
      if (typeof options?.onRetry === "function") {
        button.addEventListener("click", () => options.onRetry());
      }
      box.append(button);
    }
    section.append(box);
  }
  parent.append(section);
  return section;
}

function openEntender(link, topic) {
  const root = link.closest("article") || link.closest("#resultado") || document;
  const nav = root.querySelector(".entender-resultado");
  if (!nav) return;
  const panel = nav.querySelector(".explicacion-resultado");
  if (panel) panel.hidden = false;
  const target = nav.querySelector(`[data-tema="${topic}"]`) || panel;
  if (target && typeof target.focus === "function") target.focus();
}
