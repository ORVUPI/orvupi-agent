/**
 * Resumen en lenguaje sencillo de una lectura.
 * Tres bloques, sin puntuación, sin semáforo de «seguro» y sin recomendación.
 * Cada punto: título corto, una frase y un enlace a «Entender».
 */

const TOPIC_BY_ID = {
  suministro: "suministro",
  "suministro-extra": "suministro",
  decimales: "suministro",
  programa: "permisos",
  emision: "permisos",
  congelacion: "permisos",
  permisos: "permisos",
  extensiones: "permisos",
  metadatos: "metadatos",
  enlace: "metadatos",
  nombre: "metadatos",
  simbolo: "metadatos",
  uri: "metadatos",
  mutable: "metadatos",
  cuentas: "distribucion",
  curva: "curva",
  ficha: "metadatos",
};

const SUMMARY_OFFICIAL = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

const ATTENTION = {
  emision: {
    title: { es: "Permiso de emisión", en: "Mint permission" },
    lead: { es: "Está activo: permite crear más tokens.", en: "It is active: it can create more tokens." },
    detail: {
      es: "En una moneda estable es habitual: quien emite añade unidades cuando entra dinero. Si el proyecto prometió un suministro fijo, el mismo permiso permite crear más. Conviene contrastarlo con lo que promete el proyecto. Esta lectura no dice cuál de los dos casos es.",
      en: "On a stablecoin that is common: the issuer adds units when money comes in. If the project promised a fixed supply, the same permission can create more. It is worth comparing with what the project promises. This reading does not say which of the two cases this is.",
    },
  },
  congelacion: {
    title: { es: "Permiso de congelación", en: "Freeze permission" },
    lead: { es: "Está activo: puede bloquear cuentas.", en: "It is active: it can block accounts." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  mutable: {
    title: { es: "Nombre y símbolo", en: "Name and symbol" },
    lead: { es: "Se pueden cambiar.", en: "They can change." },
    detail: { es: "Mañana pueden ser otros. Eso, por sí solo, no es una suplantación.", en: "Tomorrow they may be different. That, on its own, is not impersonation." },
  },
  suministro: {
    title: { es: "Suministro total", en: "Total supply" },
    lead: { es: "Las dos lecturas de la cantidad no coinciden.", en: "The two reads of the amount do not match." },
    detail: {
      es: "Se muestra la cifra del mint y no se calculan porcentajes. Eso no acusa al proyecto.",
      en: "The figure shown is the one from the mint, and percentages are not calculated. That does not accuse the project.",
    },
  },
  comision: {
    title: { es: "Comisión al enviar", en: "Fee on transfer" },
    lead: { es: "El token puede quedarse una parte de cada envío.", en: "The token can keep part of each transfer." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  delegado: {
    title: { es: "Delegado permanente", en: "Permanent delegate" },
    lead: { es: "Alguien puede mover tokens de otras cuentas.", en: "Someone can move tokens out of other accounts." },
    detail: { es: "Eso no pide permiso a quien los tiene. Una señal sola no acusa al proyecto.", en: "That does not ask the account that holds them. One signal does not accuse the project." },
  },
  gancho: {
    title: { es: "Revisión de cada envío", en: "Check on each transfer" },
    lead: { es: "Un programa puede revisar cada envío y rechazarlo.", en: "A program can inspect each transfer and reject it." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  "estado-inicial": {
    title: { es: "Cuentas nuevas congeladas", en: "New accounts start frozen" },
    lead: { es: "Una cuenta nueva puede no poder mover tokens.", en: "A new account may be unable to move tokens." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  "no-transferible": {
    title: { es: "No transferible", en: "Non-transferable" },
    lead: { es: "El token dice que no se puede enviar.", en: "The token says it cannot be sent." },
    detail: { es: "Esta lectura no prueba qué ocurre al intentarlo.", en: "This reading does not prove what happens if someone tries." },
  },
  cierre: {
    title: { es: "Cierre del token", en: "Closing the token" },
    lead: { es: "Alguien puede cerrar este token.", en: "Someone can close this token." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  extensiones: {
    title: { es: "Extensiones", en: "Extensions" },
    lead: { es: "No se pudieron separar las extensiones.", en: "The extensions could not be split." },
    detail: { es: "No se afirma cuál falta. Una señal sola no acusa al proyecto.", en: "This does not claim which one is missing. One signal does not accuse the project." },
  },
  desconocida: {
    title: { es: "Extensión sin describir", en: "Undescribed extension" },
    lead: { es: "Hay una extensión que esta lectura no describe.", en: "There is an extension this reading does not describe." },
    detail: { es: "No se da por inofensiva.", en: "It is not treated as harmless." },
  },
  "metadatos-distintos": {
    title: { es: "Nombre y símbolo", en: "Name and symbol" },
    lead: { es: "Las dos fuentes no coinciden.", en: "The two sources do not match." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  invisibles: {
    title: { es: "Nombre", en: "Name" },
    lead: { es: "Hay caracteres que no se ven en el nombre.", en: "There are characters you cannot see in the name." },
    detail: { es: "Una señal sola no acusa al proyecto.", en: "One signal does not accuse the project." },
  },
  copia: {
    title: { es: "Dirección", en: "Address" },
    lead: { es: "Se parece a STUBX pero no es la dirección oficial.", en: "It looks like STUBX but it is not the official address." },
    detail: {
      es: "La dirección oficial está publicada en stubxai.com. Ábrela y compárala con la de esta lectura, carácter a carácter. Un nombre igual no cambia la dirección.",
      en: "The official address is published on stubxai.com. Open it and compare it with the one in this reading, character by character. The same name does not change the address.",
    },
  },
  ficha: {
    title: { es: "Comprobación anterior", en: "Earlier check" },
    lead: { es: "Es una ficha guardada de antes, no un dato de esta lectura.", en: "It is a card saved earlier, not a fact from this reading." },
    detail: {
      es: "La ficha fechada es una foto anterior. No cambia lo que dice esta lectura.",
      en: "The dated card is an earlier snapshot. It does not change what this reading says.",
    },
  },
  parecido: {
    title: { es: "Parecido con el registro", en: "Likeness with the registry" },
    lead: { es: "Un dato coincide con el registro y la dirección es otra.", en: "A fact matches the registry and the address is different." },
    detail: { es: "La coincidencia no dice quién lo hizo.", en: "The match does not say who did it." },
  },
};

const RISK_EXTENSION = {
  1: "comision",
  3: "cierre",
  9: "no-transferible",
  12: "delegado",
  14: "gancho",
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

const SUMMARY_SERVICE = {
  es: "El servicio público no respondió, prueba otra vez en un minuto.",
  en: "The public service did not respond, try again in a minute.",
};

const CURVE_NOTE = {
  es: "Curva de Pump.fun: no aplica",
  en: "Pump.fun curve: not applicable",
};

export const SUMMARY_HEADINGS = Object.freeze({
  title: { es: "Resumen", en: "Summary" },
  checked: { es: "Qué se comprobó", en: "What was checked" },
  attention: { es: "Qué requiere atención", en: "What needs attention" },
  missing: { es: "Qué falta", en: "What is missing" },
  retry: { es: "Reintentar", en: "Try again" },
  understand: { es: "Entender →", en: "Understand →" },
  more: { es: "Más detalle", en: "More detail" },
});

function topicOf(id) {
  if (TOPIC_BY_ID[id]) return TOPIC_BY_ID[id];
  if (typeof id === "string" && (id.startsWith("extension") || id === "desconocida")) return "permisos";
  return "permisos";
}

function summaryPair(es, en) {
  return { es, en };
}

function summaryPoint(topic, title, lead, detail, note) {
  return { topic, title, lead, detail: detail || null, note: note || null };
}

function attentionPoint(id) {
  const copy = ATTENTION[id] || (typeof id === "string" && id.startsWith("extension") ? ATTENTION.desconocida : null);
  if (!copy) return null;
  return summaryPoint(topicOf(id), copy.title, copy.lead, copy.detail);
}

function findFact(facts, id) {
  return (facts || []).find((item) => item && item.id === id) || null;
}

function summaryFormatUnits(raw, decimals, lang) {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const scale = Number(decimals);
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) return null;
  const padded = raw.padStart(scale + 1, "0");
  const whole = padded.slice(0, padded.length - scale).replace(/^0+(?=\d)/, "");
  const frac = scale ? padded.slice(-scale).replace(/0+$/, "") : "";
  const sep = lang === "en" ? "," : ".";
  const dec = lang === "en" ? "." : ",";
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return frac ? `${grouped}${dec}${frac}` : grouped;
}

function supplyPair(raw, decimals) {
  const es = summaryFormatUnits(raw, decimals, "es");
  const en = summaryFormatUnits(raw, decimals, "en");
  return es && en ? { es, en } : null;
}

function summaryText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function contextFromView(view) {
  const shown = view && view.shown ? view.shown : {};
  const rows = Array.isArray(view && view.rows) ? view.rows : [];
  const row = (label) => rows.find((item) => item && item.label && item.label.es === label);
  const supplyRow = row("Suministro");
  return {
    supply: supplyPair(shown.supplyAccount, shown.decimals) || (supplyRow && supplyRow.value && supplyRow.value.es ? supplyRow.value : null),
    name: summaryText(shown.name) || summaryText(row("Nombre") && row("Nombre").value && row("Nombre").value.es),
    symbol: summaryText(shown.symbol) || summaryText(row("Símbolo") && row("Símbolo").value && row("Símbolo").value.es),
    decimals: shown.decimals,
    extensions: Array.isArray(shown.extensions) ? shown.extensions : [],
    official: view?.mint === SUMMARY_OFFICIAL || (view?.signals || []).some((item) => item && item.id === "registro"),
  };
}

function contextFromCard(card) {
  return {
    supply: supplyPair(card && card.supplyAccount, card && card.decimals) || supplyPair(card && card.supplyRpc, card && card.decimals),
    name: summaryText(card && card.name && card.name.text),
    symbol: summaryText(card && card.symbol && card.symbol.text),
    decimals: card ? card.decimals : null,
    extensions: Array.isArray(card && card.extensions) ? card.extensions : [],
    official: Boolean(card && (card.officialStubx === true || card.mint === SUMMARY_OFFICIAL)),
  };
}

const SUMMARY_HOMOGLYPHS = {
  "\u0391": "A",
  "\u0392": "B",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "H",
  "\u0399": "I",
  "\u039A": "K",
  "\u039C": "M",
  "\u039D": "N",
  "\u039F": "O",
  "\u03A1": "P",
  "\u03A4": "T",
  "\u03A5": "Y",
  "\u03A3": "S",
  "\u03A7": "X",
  "\u03B1": "a",
  "\u03C3": "s",
  "\u03BF": "o",
  "\u03C4": "t",
  "\u0410": "A",
  "\u0412": "B",
  "\u0415": "E",
  "\u041A": "K",
  "\u041C": "M",
  "\u041D": "H",
  "\u041E": "O",
  "\u0420": "P",
  "\u0421": "S",
  "\u0422": "T",
  "\u0425": "X",
  "\u0430": "a",
  "\u0435": "e",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "s",
  "\u0442": "t",
  "\u0445": "x",
  "\u0405": "S",
  "\u0455": "s",
  "\u0406": "I",
  "\u0456": "i",
  "5": "S",
  "8": "B",
  "\uA731": "S",
  "\u1D1B": "T",
  "\u1D1C": "U",
  "\u0299": "B",
  "\u054D": "U",
  "\u057D": "u",
  "\u13DA": "S",
  "\u13A2": "T",
  "\u13F4": "B",
};

function summaryNormalizeToken(value) {
  const folded = String(value || "").normalize("NFKC").replace(/[\p{Cc}\p{Cf}\uFFFD]/gu, "");
  let mapped = "";
  for (const char of folded) mapped += SUMMARY_HOMOGLYPHS[char] ?? char;
  return mapped.toLowerCase().replace(/[\s.\-_'’]+/g, "");
}

function summaryShown(value) {
  const clean = String(value || "").replace(/[\u0000\uFFFD\p{Cc}\p{Cf}]/gu, "").trim();
  if (!clean) return "";
  return clean.length > 64 ? `${clean.slice(0, 64)}…` : clean;
}

function looksLikeStubx(context) {
  if (!context) return false;
  return summaryNormalizeToken(context.name).includes("stubx") || summaryNormalizeToken(context.symbol).includes("stubx");
}

function quotedIdentity(context) {
  const name = summaryShown(context.name);
  const symbol = summaryShown(context.symbol);
  if (name && symbol && name !== symbol) return `«${name}» («${symbol}»)`;
  if (name || symbol) return `«${name || symbol}»`;
  return "";
}

function nameLead(context) {
  const quoted = quotedIdentity(context);
  if (context && !context.official && quoted) {
    return summaryPair(
      `Dice llamarse ${quoted} (texto elegido por quien creó el token).`,
      `It says it is called ${quoted} (text chosen by whoever created the token).`,
    );
  }
  const name = summaryShown(context && context.name);
  const symbol = summaryShown(context && context.symbol);
  if (name && symbol && name !== symbol) return summaryPair(`${name} (${symbol}).`, `${name} (${symbol}).`);
  if (name || symbol) return summaryPair(`${name || symbol}.`, `${name || symbol}.`);
  return summaryPair("Se leyeron el nombre y el símbolo.", "The name and the symbol were read.");
}

function supplyLead(context, matched) {
  const symbol = context && context.official ? summaryShown(context.symbol) : "";
  const mark = symbol ? ` ${symbol}` : " tokens";
  if (context.supply) {
    const es = matched
      ? `Hay ${context.supply.es}${mark} y las dos lecturas coinciden.`
      : `Hay ${context.supply.es}${mark}.`;
    const en = matched
      ? `There are ${context.supply.en}${mark} and the two reads match.`
      : `There are ${context.supply.en}${mark}.`;
    return summaryPair(es, en);
  }
  return summaryPair(
    matched ? "Se leyó la cantidad de tokens y las dos lecturas coinciden." : "Se leyó la cantidad de tokens.",
    matched ? "The token amount was read and the two reads match." : "The token amount was read.",
  );
}

function samplePercent(signal) {
  const blob = `${signal?.explain?.es ?? ""} ${signal?.explain?.en ?? ""}`;
  const found = blob.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return found ? found[1] : null;
}

function isUnread(signal) {
  const blob = `${signal?.title?.es ?? ""} ${signal?.explain?.es ?? ""} ${signal?.title?.en ?? ""} ${signal?.explain?.en ?? ""}`;
  return /no se pudo|could not be checked|could not be read|could not be split|no respondió|did not respond|volvió vacía|came back empty|no se leyó|was not read/i.test(blob);
}

function genericAttention(signal) {
  const titleEs = signal?.title?.es || "Señal";
  const titleEn = signal?.title?.en || "Signal";
  return summaryPoint(
    topicOf(signal?.id),
    summaryPair(titleEs, titleEn),
    summaryPair("Es un dato de esta lectura.", "It is a fact from this reading."),
    summaryPair("Una señal sola no acusa al proyecto.", "One signal does not accuse the project."),
  );
}

function concentrationPoint(signal) {
  const percent = samplePercent(signal);
  const lead = percent
    ? summaryPair(`Una cuenta reúne el ${percent} % de la muestra.`, `One account holds ${percent}% of the sample.`)
    : summaryPair("Una cuenta reúne una parte grande de la muestra.", "One account holds a large share of the sample.");
  return summaryPoint(
    "distribucion",
    summaryPair("Concentración", "Concentration"),
    lead,
    summaryPair(
      "La muestra no es un censo de personas. Una señal sola no acusa al proyecto.",
      "The sample is not a census of people. One signal does not accuse the project.",
    ),
  );
}

function attentionFromSignals(signals) {
  const items = [];
  for (const signal of signals || []) {
    if (!signal || (signal.level !== "atencion" && signal.level !== "riesgo")) continue;
    if (signal.id === "cuentas" || signal.id === "suministro") {
      if (signal.id === "cuentas" && samplePercent(signal)) items.push(concentrationPoint(signal));
      continue;
    }
    if (isUnread(signal)) continue;
    const known = attentionPoint(signal.id);
    const point = known || genericAttention(signal);
    if (signal.id === "copia" || signal.id === "parecido") items.unshift(point);
    else items.push(point);
  }
  return items;
}

function attentionFromCard(card) {
  const items = [];
  const context = contextFromCard(card);
  if (!context.official && looksLikeStubx(context)) items.push(attentionPoint("copia"));
  if (card?.mintAuthority?.state === "activa") items.push(attentionPoint("emision"));
  if (card?.freezeAuthority?.state === "activa") items.push(attentionPoint("congelacion"));
  if (card?.metadataMutable === "si") items.push(attentionPoint("mutable"));
  for (const extension of card?.extensions || []) {
    if (!extension) continue;
    if (extension.status === "no_soportada") items.push(attentionPoint("extension"));
    else if (RISK_EXTENSION[extension.type]) items.push(attentionPoint(RISK_EXTENSION[extension.type]));
  }
  return items.filter(Boolean);
}

function revokedPair(signals, card) {
  if (card) {
    return card.mintAuthority?.state === "revocada" && card.freezeAuthority?.state === "revocada";
  }
  const revoked = (id) => {
    const signal = (signals || []).find((item) => item && item.id === id);
    return Boolean(signal && /Nadie puede/.test(signal.title?.es || ""));
  };
  return revoked("emision") && revoked("congelacion");
}

function pushMissing(missing, topic, title, lead) {
  missing.push(summaryPoint(topic, title, lead));
}

const SUPPLY_AGAIN = summaryPair(
  "No se pudo hacer la segunda comprobación del suministro.",
  "The second supply check could not be done.",
);
const SUPPLY_MISMATCH = summaryPair("Las dos lecturas no coinciden.", "The two reads do not match.");

function readsDisagree(signals) {
  return (signals || []).some((signal) => {
    if (!signal || signal.id !== "suministro" || isUnread(signal)) return false;
    if (signal.level !== "atencion" && signal.level !== "riesgo") return false;
    const blob = `${signal.title?.es ?? ""} ${signal.explain?.es ?? ""} ${signal.title?.en ?? ""} ${signal.explain?.en ?? ""}`;
    return /no coincide|do not match|does not match/i.test(blob);
  });
}

function compose(facts, attention, context, signals, card) {
  const list = Array.isArray(facts) ? facts : [];
  const checked = [];
  const missing = [];
  let note = null;
  let rereadFailed = false;
  const whole = list.length === 1 && list[0] && list[0].state === "fallo" && /Esta lectura/.test(list[0].label?.es || "");
  if (whole) {
    pushMissing(
      missing,
      "suministro",
      summaryPair("Esta lectura", "This reading"),
      summaryPair("No se pudo completar.", "It could not be completed."),
    );
  } else {
    const supply = findFact(list, "suministro");
    const extra = findFact(list, "suministro-extra");
    if (supply?.state === "ok") {
      const mismatch = extra?.reason === "distinto" || (extra?.state !== "fallo" && readsDisagree(signals));
      const again = extra?.state === "fallo" && extra?.reason !== "distinto";
      const supplyNote = mismatch ? SUPPLY_MISMATCH : null;
      checked.push(summaryPoint(
        "suministro",
        summaryPair("Suministro total", "Total supply"),
        supplyLead(context, extra?.state === "ok" && !mismatch),
        mismatch ? ATTENTION.suministro.detail : null,
        supplyNote,
      ));
      if (again) {
        rereadFailed = true;
        pushMissing(
          missing,
          "suministro",
          summaryPair("Segunda comprobación del suministro", "Second supply check"),
          SUPPLY_AGAIN,
        );
      }
    } else if (supply?.state === "fallo" || (!supply && extra?.state === "fallo")) {
      pushMissing(
        missing,
        "suministro",
        summaryPair("Suministro total", "Total supply"),
        summaryPair("No se pudo leer la cantidad de tokens.", "The token amount could not be read."),
      );
    } else if (extra?.state === "ok" && !supply) {
      checked.push(summaryPoint("suministro", summaryPair("Suministro total", "Total supply"), supplyLead(context, false)));
    }

    const decimals = findFact(list, "decimales");
    if (decimals?.state === "ok" && Number.isInteger(context.decimals)) {
      checked.push(summaryPoint(
        "suministro",
        summaryPair("Decimales", "Decimals"),
        summaryPair(`Usa ${context.decimals} decimales.`, `It uses ${context.decimals} decimals.`),
      ));
    } else if (decimals?.state === "fallo") {
      pushMissing(missing, "suministro", summaryPair("Decimales", "Decimals"), summaryPair("No se pudieron leer los decimales.", "The decimals could not be read."));
    }

    const meta = findFact(list, "metadatos");
    const name = findFact(list, "nombre");
    const symbol = findFact(list, "simbolo");
    const identity = meta || name || symbol;
    const identityRead = meta?.state === "ok" || name?.state === "ok" || symbol?.state === "ok";
    const identityFailed = meta?.state === "fallo" || name?.state === "fallo" || symbol?.state === "fallo";
    if (identityRead) {
      checked.push(summaryPoint("metadatos", summaryPair("Nombre y símbolo", "Name and symbol"), nameLead(context)));
    } else if (identity?.state === "ausente") {
      checked.push(summaryPoint(
        "metadatos",
        summaryPair("Nombre y símbolo", "Name and symbol"),
        summaryPair("No hay nombre ni símbolo en esta lectura.", "There is no name or symbol in this reading."),
      ));
    }
    if (identityFailed && !identityRead) {
      pushMissing(
        missing,
        "metadatos",
        summaryPair("Nombre y símbolo", "Name and symbol"),
        summaryPair("No se pudo leer el nombre ni el símbolo.", "The name and the symbol could not be read."),
      );
    } else if (symbol?.state === "fallo") {
      pushMissing(
        missing,
        "metadatos",
        summaryPair("Símbolo", "Symbol"),
        summaryPair("No se pudo leer el símbolo.", "The symbol could not be read."),
      );
    }

    const link = findFact(list, "enlace") || findFact(list, "uri");
    if (link?.state === "ok") {
      checked.push(summaryPoint(
        "metadatos",
        summaryPair("Enlace de metadatos", "Metadata link"),
        summaryPair("Se leyó el enlace de metadatos.", "The metadata link was read."),
      ));
    } else if (link?.state === "ausente") {
      checked.push(summaryPoint(
        "metadatos",
        summaryPair("Enlace de metadatos", "Metadata link"),
        summaryPair("No tiene enlace de metadatos.", "It has no metadata link."),
      ));
    } else if (link?.state === "fallo") {
      pushMissing(
        missing,
        "metadatos",
        summaryPair("Enlace de metadatos", "Metadata link"),
        summaryPair("No se pudo leer el enlace de metadatos.", "The metadata link could not be read."),
      );
    }

    const accounts = findFact(list, "cuentas");
    if (accounts && accounts.state !== "no_consultado" && accounts.state !== "no_aplica") {
      if (accounts.state === "ok") {
        checked.push(summaryPoint(
          "distribucion",
          summaryPair("Cuentas con más tokens", "Largest token accounts"),
          summaryPair("Se leyó una muestra de las cuentas con más tokens.", "A sample of the largest token accounts was read."),
        ));
      } else {
        pushMissing(
          missing,
          "distribucion",
          summaryPair("Cuentas con más tokens", "Largest token accounts"),
          summaryPair("No se pudo leer quién tiene más tokens.", "Who holds the most tokens could not be read."),
        );
      }
    }

    const curve = findFact(list, "curva");
    if (curve?.state === "no_aplica") {
      note = summaryPoint("curva", summaryPair("Curva de Pump.fun", "Pump.fun curve"), CURVE_NOTE);
    } else if (curve?.state === "ok") {
      checked.push(summaryPoint(
        "curva",
        summaryPair("Curva de Pump.fun", "Pump.fun curve"),
        summaryPair("Se leyó la curva.", "The curve was read."),
      ));
    } else if (curve?.state === "ausente") {
      checked.push(summaryPoint(
        "curva",
        summaryPair("Curva de Pump.fun", "Pump.fun curve"),
        summaryPair("No hay cuenta de la curva.", "There is no curve account."),
      ));
    } else if (curve?.state === "fallo") {
      pushMissing(
        missing,
        "curva",
        summaryPair("Curva de Pump.fun", "Pump.fun curve"),
        summaryPair("No se pudo leer la curva.", "The curve could not be read."),
      );
    }

    if (card?.extensionsStatus === "fallo") {
      pushMissing(missing, "permisos", ATTENTION.extensiones.title, ATTENTION.extensiones.lead);
    }
    if (revokedPair(signals, card)) {
      checked.push(summaryPoint(
        "permisos",
        summaryPair("Permisos", "Permissions"),
        summaryPair("Nadie puede crear más tokens ni congelar cuentas.", "Nobody can create more tokens or freeze accounts."),
      ));
    }
    for (const id of ["emision", "congelacion"]) {
      const permission = findFact(list, id);
      if (permission?.state === "fallo") {
        pushMissing(
          missing,
          "permisos",
          id === "emision" ? summaryPair("Permiso de emisión", "Mint permission") : summaryPair("Permiso de congelación", "Freeze permission"),
          id === "emision"
            ? summaryPair("No se pudo leer el permiso de emisión.", "The mint permission could not be read.")
            : summaryPair("No se pudo leer el permiso de congelación.", "The freeze permission could not be read."),
        );
      }
    }
  }

  for (const signal of signals || []) {
    if (!signal || signal.id === "cuentas" || signal.id === "suministro" || !isUnread(signal)) continue;
    if (signal.level !== "atencion" && signal.level !== "riesgo") continue;
    const known = attentionPoint(signal.id);
    const claimsState = signal.id === "emision" || signal.id === "congelacion" || signal.id === "mutable";
    if (known && !claimsState) pushMissing(missing, known.topic, known.title, known.lead);
    else if (signal.id === "extensiones" || (typeof signal.id === "string" && signal.id.startsWith("extension"))) {
      pushMissing(missing, "permisos", ATTENTION.extensiones.title, ATTENTION.extensiones.lead);
    } else {
      pushMissing(
        missing,
        known ? known.topic : topicOf(signal.id),
        summaryPair(signal.title?.es || known?.title.es || "Señal", signal.title?.en || known?.title.en || "Signal"),
        summaryPair("No se pudo leer.", "It could not be read."),
      );
    }
  }

  return {
    title: SUMMARY_HEADINGS.title,
    blocks: [
      { id: "comprobado", heading: SUMMARY_HEADINGS.checked, items: checked, empty: EMPTY.checked },
      { id: "atencion", heading: SUMMARY_HEADINGS.attention, items: attention, empty: EMPTY.attention },
      { id: "falta", heading: SUMMARY_HEADINGS.missing, items: missing, empty: EMPTY.missing, service: missing.length ? SUMMARY_SERVICE : null },
    ],
    note,
    retry: missing.length > 0 || rereadFailed,
  };
}

export function buildReadingSummary(view) {
  const facts = Array.isArray(view?.facts) ? view.facts.slice() : [];
  if (!facts.length && (view?.kind === "red" || view?.kind === "limite" || view?.kind === "tiempo" || view?.ok === false)) {
    facts.push(
      { id: "suministro", label: summaryPair("Suministro", "Supply"), state: "fallo" },
      { id: "decimales", label: summaryPair("Decimales", "Decimals"), state: "fallo" },
      { id: "cuentas", label: summaryPair("Cuentas con más tokens", "Largest token accounts"), state: "fallo" },
    );
  }
  return compose(facts, attentionFromSignals(view?.signals), contextFromView(view), view?.signals, null);
}

function pushFact(facts, id, es, en, state, reason) {
  const fact = { id, label: summaryPair(es, en), state };
  if (reason) fact.reason = reason;
  facts.push(fact);
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
  if (!card) return compose(facts, [], { supply: null, name: "", symbol: "", decimals: null, extensions: [] }, null, null);
  const account = typeof card.supplyAccount === "string" && /^\d+$/.test(card.supplyAccount);
  const extra = card.supplyRpcStatus === "verificado" && typeof card.supplyRpc === "string" && /^\d+$/.test(card.supplyRpc);
  if (card.supplyRpcStatus === "no_aplica" && !account) {
    pushFact(facts, "suministro", "Suministro", "Supply", "no_aplica");
  } else if (account) {
    pushFact(facts, "suministro", "Suministro", "Supply", "ok");
    if (card.supplyRpcStatus !== "no_consultado") {
      const reason = extra && card.supplyRpc === card.supplyAccount ? null : extra ? "distinto" : "otra";
      pushFact(facts, "suministro-extra", "Suministro", "Supply", reason ? "fallo" : "ok", reason);
    }
  } else if (extra) {
    pushFact(facts, "suministro-extra", "Suministro", "Supply", "ok");
  } else if (card.supplyRpcStatus !== "no_consultado") {
    pushFact(facts, "suministro", "Suministro", "Supply", "fallo");
  }
  if (card.decimals === null || card.decimals === undefined) {
    pushFact(facts, "decimales", "Decimales", "Decimals", card.programStatus === "fallo" ? "fallo" : "ausente");
  } else {
    pushFact(facts, "decimales", "Decimales", "Decimals", "ok");
  }
  pushFact(facts, "nombre", "Nombre", "Name", textState(card.name));
  pushFact(facts, "simbolo", "Símbolo", "Symbol", textState(card.symbol));
  pushFact(facts, "uri", "Enlace de metadatos", "Metadata link", textState(card.uri));
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
  if (card.largestStatus === "ok" || card.largestStatus === "verificado") {
    pushFact(facts, "cuentas", "Cuentas con más tokens", "Largest token accounts", "ok");
  } else if (card.largestStatus === "fallo" || card.largestStatus === "ausente") {
    pushFact(facts, "cuentas", "Cuentas con más tokens", "Largest token accounts", "fallo");
  }
  pushFact(facts, "emision", "Permiso de emisión", "Mint permission", authorityState(card.mintAuthority));
  pushFact(facts, "congelacion", "Permiso de congelación", "Freeze permission", authorityState(card.freezeAuthority));
  return compose(facts, attentionFromCard(card), contextFromCard(card), null, card);
}

function meaningfulText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").replace(/\uFFFD/g, "").replace(/\p{Cf}/gu, "").trim();
}

function textState(field) {
  if (!field) return "fallo";
  if (field.status === "no_aplica") return "no_aplica";
  if (field.status === "ausente") return "ausente";
  if (field.status === "fallo" || field.status === "no_disponible") return "fallo";
  if (field.status === "no_consultado") return "no_consultado";
  if (meaningfulText(field.text)) return "ok";
  return "ausente";
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
    const head = document.createElement("div");
    head.className = "cabecera-bloque";
    head.append(summaryChip(block.id), headingNode(block.heading[language]));
    box.append(head);
    if (!block.items.length) {
      const empty = document.createElement("p");
      empty.className = "punto-vacio";
      empty.textContent = block.empty[language];
      box.append(empty);
    } else {
      const list = document.createElement("ul");
      for (const item of block.items) list.append(summaryItem(item, language, block.id));
      box.append(list);
    }
    if (block.service) {
      const service = document.createElement("p");
      service.className = "aviso-servicio";
      service.textContent = block.service[language];
      box.append(service);
    }
    if (block.id === "falta" && model.retry) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reintentar-resumen";
      if (options?.retryId) button.id = options.retryId;
      button.textContent = SUMMARY_HEADINGS.retry[language];
      if (typeof options?.onRetry === "function") button.addEventListener("click", () => options.onRetry());
      box.append(button);
    }
    section.append(box);
  }
  if (model.note) section.append(summaryNote(model.note, language));
  parent.append(section);
  return section;
}

function headingNode(text) {
  const heading = document.createElement("h4");
  heading.textContent = text;
  return heading;
}

function summaryChip(blockId) {
  const chip = document.createElement("span");
  chip.className = "chip-resumen";
  chip.setAttribute("aria-hidden", "true");
  chip.dataset.marca = blockId === "atencion" ? "atencion" : blockId === "falta" ? "falta" : "leido";
  return chip;
}

function summaryItem(item, language, blockId) {
  const row = document.createElement("li");
  row.className = "punto-resumen";
  const body = document.createElement("div");
  const title = document.createElement("p");
  title.className = "punto-titulo";
  title.textContent = item.title[language];
  const lead = document.createElement("p");
  lead.className = "punto-frase";
  lead.textContent = item.lead[language];
  body.append(title, lead);
  if (item.note && item.note[language]) {
    const note = document.createElement("p");
    note.className = "punto-nota";
    note.textContent = item.note[language];
    body.append(note);
  }
  if (item.detail && item.detail[language]) {
    const details = document.createElement("details");
    details.className = "punto-detalle";
    const summary = document.createElement("summary");
    summary.textContent = SUMMARY_HEADINGS.more[language];
    const extra = document.createElement("p");
    extra.textContent = item.detail[language];
    details.append(summary, extra);
    body.append(details);
  }
  body.append(understandLink(item.topic, language));
  row.append(summaryChip(blockId), body);
  return row;
}

function summaryNote(note, language) {
  const line = document.createElement("p");
  line.className = "nota-curva";
  const text = document.createElement("span");
  text.textContent = note.lead[language];
  line.append(text, understandLink(note.topic, language));
  return line;
}

function understandLink(topic, language) {
  const link = document.createElement("a");
  link.className = "entender-enlace";
  link.href = `#entender-${topic}`;
  link.dataset.tema = topic;
  link.textContent = SUMMARY_HEADINGS.understand[language];
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openEntender(link, topic);
  });
  return link;
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
