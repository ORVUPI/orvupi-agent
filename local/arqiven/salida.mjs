/** Arreglos de la respuesta ya escrita. No cambian el examen ni el filtro. */

const ABBREV = new Set(["art", "arts", "ap", "num", "pag", "pags", "vol", "etc", "sr", "sra", "dr", "dra", "ud", "op", "cit", "fig", "cap"]);

function wordBefore(text, index) {
  const match = text.slice(0, index).match(/(\p{L}+)\s*$/u);
  return match ? match[1] : "";
}

function isAbbrevPeriod(text, index) {
  if (text[index] !== ".") return false;
  const word = wordBefore(text, index).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return ABBREV.has(word);
}

function isDecimalPeriod(text, index) {
  return text[index] === "." && /\d/.test(text[index - 1] || "") && /\d/.test(text[index + 1] || "");
}

function piecesOf(text) {
  const source = String(text || "");
  const pieces = [];
  let last = 0;
  for (let index = 0; index < source.length; index += 1) {
    const mark = source[index];
    if (mark === "\n") {
      let end = index;
      while (source[end] === "\n") end += 1;
      pieces.push({ body: source.slice(last, index), sep: source.slice(index, end) });
      last = end;
      index = end - 1;
      continue;
    }
    if ((mark === "." || mark === "!" || mark === "?") && /[ \t]/.test(source[index + 1] || "")) {
      if (mark === "." && (isDecimalPeriod(source, index) || isAbbrevPeriod(source, index))) continue;
      let end = index + 1;
      while (source[end] === " " || source[end] === "\t") end += 1;
      pieces.push({ body: source.slice(last, index + 1), sep: source.slice(index + 1, end) });
      last = end;
      index = end - 1;
    }
  }
  pieces.push({ body: source.slice(last), sep: "" });
  return pieces;
}

function joinPieces(pieces) {
  return pieces.map((piece) => piece.body + piece.sep).join("").trim();
}

function normalizeSentence(part) {
  return part.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

/** Si una frase de más de 60 caracteres vuelve a salir, corta en la anterior. Conserva los saltos de línea. */
export function cutRepeatedSentences(text) {
  const pieces = piecesOf(text);
  const seen = new Set();
  const kept = [];
  for (const piece of pieces) {
    const key = normalizeSentence(piece.body);
    if (key.length > 60 && seen.has(key)) break;
    if (key.length > 60) seen.add(key);
    kept.push(piece);
  }
  return joinPieces(kept);
}

function givesPassword(body) {
  const text = body.toLowerCase();
  if (/\b(?:123456|password|qwerty|111111|000000)\b/.test(text)) return true;
  if (/\badmin\b/.test(text) && /contrase|clave|ejemplo/.test(text)) return true;
  if (/vac[ií]a/.test(text) && /contrase|clave/.test(text)) return true;
  return false;
}

/** Quita la frase que pone una contraseña de ejemplo. El resto se queda. */
export function dropPasswordExamples(text) {
  const kept = piecesOf(text).filter((piece) => !givesPassword(piece.body));
  return joinPieces(kept);
}

export function finishReply(text) {
  return dropPasswordExamples(cutRepeatedSentences(text));
}

const WARNING = /no es una recomendaci[oó]n|puedes perder|no sustituye|riesgo de p[eé]rdida|no inviertas lo que no puedas/i;

/** Si hay cifras de mercado, no deja texto después de la advertencia. */
export function trimAfterWarning(text) {
  const source = String(text || "");
  if (!/frankfurter|coingecko|\bel BCE\b/i.test(source)) return source.trim();
  const pieces = piecesOf(source);
  const at = pieces.findIndex((piece) => WARNING.test(piece.body));
  if (at < 0) return source.trim();
  return pieces.slice(0, at + 1).map((piece, index) => piece.body + (index === at ? "" : piece.sep)).join("").trim();
}

const MARKET_WARNING = "Esto no es una recomendación: puedes perder dinero.";

function figureKey(raw) {
  return String(raw || "").replace(/^\+/, "").replace(",", ".");
}

function figuresInFacts(factsText) {
  const figures = [];
  for (const line of String(factsText || "").split("\n")) {
    const cite = line.match(/\(([^)]+)\)/);
    if (!cite) continue;
    for (const match of line.matchAll(/([+-]?\d+(?:[.,]\d+)?)\s*(USD|GBP|%)/gi)) {
      const raw = match[1].replace(/^\+/, "");
      if (raw === "1") continue;
      const unit = match[2].toUpperCase() === "%" ? "%" : match[2].toUpperCase();
      figures.push({ key: figureKey(raw), raw, unit, citation: cite[1] });
    }
  }
  return figures;
}

function numberForms(raw) {
  const bare = String(raw || "").replace(/^\+/, "");
  return [...new Set([bare, bare.replace(".", ","), bare.replace(",", ".")])];
}

function sentenceHasNumber(text, figure) {
  return numberForms(figure.raw).some((form) => new RegExp(`(?<!\\d)${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\d)`).test(text));
}

function placeOnce(text, figure) {
  const forms = numberForms(figure.raw).sort((a, b) => b.length - a.length);
  for (const form of forms) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!\\d)${escaped}(\\s*(?:USD|GBP|%))?`, "i");
    const match = re.exec(text);
    if (!match) continue;
    const number = match[0].match(/[+-]?\d+(?:[.,]\d+)?/)?.[0] || form;
    const unit = (match[1] || "").match(/USD|GBP|%/i)?.[0] || "";
    const shown = unit ? `${number} ${unit.toUpperCase() === "%" ? "%" : unit.toUpperCase()}` : number;
    return `${text.slice(0, match.index)}${shown} (${figure.citation})${text.slice(match.index + match[0].length)}`;
  }
  return text;
}

function tidyMarketSentence(sentence, figures) {
  let text = String(sentence || "").replace(/\(\s*([+-]?\d+(?:[.,]\d+)?\s*(?:USD|GBP|%)\s*\([^)]+\))\s*\)/g, "$1");
  text = text.replace(/([+-]?\d+(?:[.,]\d+)?)\s*\([^)]*\)\s*(USD|GBP|%)/gi, "$1 $2");
  const needed = [];
  for (const figure of figures) {
    if (!sentenceHasNumber(text, figure)) continue;
    if (needed.some((item) => item.citation === figure.citation)) continue;
    needed.push(figure);
  }
  for (const figure of needed) {
    text = text.split(`(${figure.citation})`).join(" ");
  }
  text = text.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  for (const figure of needed) {
    const family = /coingecko/i.test(figure.citation) ? /coingecko/i : /frankfurter|\bel bce\b/i;
    if (text.includes(figure.citation) || family.test(text)) continue;
    text = placeOnce(text, figure);
  }
  return text;
}

function prettyCite(citation) {
  const range = String(citation || "").match(/el BCE,\s*Frankfurter,\s*(\d{2}-\d{2}-\d{4})\s+y\s+(\d{2}-\d{2}-\d{4})/i);
  if (range) return `BCE vía Frankfurter, ${range[1]} a ${range[2]}`;
  return String(citation || "").trim();
}

/** Tras citar, un paréntesis no envuelve a otro. */
export function flattenNestedCite(text) {
  return String(text || "").replace(
    /\(\s*([+-]?\d+(?:[.,]\d+)?(?:\s*(?:USD|GBP|%))?)\s*\(([^)]+)\)\s*\)/g,
    (_all, figure, cite) => `(${figure.trim()}; ${prettyCite(cite)})`,
  );
}

/** Una cita por fuente y frase. Si la frase ya trae la fuente, no se añade otra. */
export function citeMissingFigures(answer, factsText) {
  const figures = figuresInFacts(factsText);
  if (!figures.length) return String(answer || "");
  const source = String(answer || "");
  const pieces = [];
  const re = /(\n+|(?<=[.!?])[ \t]+)/g;
  let last = 0;
  let match;
  while ((match = re.exec(source))) {
    pieces.push({ body: source.slice(last, match.index), sep: match[0] });
    last = match.index + match[0].length;
  }
  pieces.push({ body: source.slice(last), sep: "" });
  return flattenNestedCite(pieces.map((piece) => tidyMarketSentence(piece.body, figures) + piece.sep).join("")).trim();
}

/** Sin lectura en vivo: la frase fija, el análisis y tres pasos. No dice «No consta información». */
export function offlineMarketAnswer() {
  return [
    "Ahora no hay datos en vivo.",
    "Sin una lectura de este momento no se puede afirmar si el euro, el bitcoin o el ethereum suben o bajan. El marco general es que esas cotizaciones se mueven y un día no marca una tendencia.",
    "1. Reparte el ahorro y no lo concentres en un solo activo.",
    "2. Fija un horizonte y no actúes por el movimiento de una sesión.",
    "3. Guarda un colchón de emergencia y no inviertas lo que no puedas perder.",
    "Esto no es una recomendación: puedes perder dinero.",
  ].join("\n");
}

const CLOSER = /¿\s*hay algo más|si deseas|en qué (?:más )?puedo ayudarte|puedo ayudarte en algo/i;

function dropClosersBeforeWarning(text) {
  const pieces = piecesOf(text);
  const warnAt = pieces.findIndex((piece) => WARNING.test(piece.body));
  const stepAt = pieces.findIndex((piece) => /^\s*\d+\./.test(piece.body));
  const from = stepAt >= 0 ? stepAt : 0;
  const to = warnAt >= 0 ? warnAt : pieces.length;
  const kept = pieces.filter((piece, index) => index < from || index >= to || !CLOSER.test(piece.body));
  return joinPieces(kept);
}

export function closeMarketAnswer(answer, factsText) {
  if (!String(factsText || "").trim()) return String(answer || "").trim();
  let text = dropClosersBeforeWarning(citeMissingFigures(answer, factsText));
  if (!/no es una recomendaci[oó]n|puedes perder|no sustituye/i.test(text)) {
    text = `${text.trim()} ${MARKET_WARNING}`.trim();
  }
  return trimAfterWarning(dropClosersBeforeWarning(text));
}

/** Si la etiqueta está en medio de la frase, la pasa al final. No corta en art. ni en 2.1. */
function sentenceEnd(bare) {
  for (let index = 0; index < bare.length; index += 1) {
    const mark = bare[index];
    if (mark !== "." && mark !== "!" && mark !== "?") continue;
    if (mark === "." && isDecimalPeriod(bare, index)) continue;
    if (mark === "." && isAbbrevPeriod(bare, index) && bare[index + 1] != null) continue;
    const after = bare[index + 1];
    if (after == null || /\s/.test(after)) return index;
  }
  return -1;
}

function placeOneLine(line, tag) {
  if (!line.includes(tag)) return line;
  const bare = line.replaceAll(tag, "").replace(/[ \t]+\./g, ".").replace(/[ \t]{2,}/g, " ").trim();
  if (/^no consta\b/i.test(bare)) return bare;
  const end = sentenceEnd(bare);
  if (end < 0) return `${bare} ${tag}`.trim();
  return `${bare.slice(0, end)} ${tag}${bare.slice(end)}`.replace(/[ \t]{2,}/g, " ");
}

export function placeNoteLabel(text, id) {
  const tag = `[${String(id || "").trim()}]`;
  if (!tag || tag === "[]" || !String(text || "").includes(tag)) return String(text || "");
  return String(text).split("\n").map((line) => placeOneLine(line, tag)).join("\n");
}

function useNoteLabel(text, id) {
  const tag = `[${id}]`;
  return String(text || "")
    .replaceAll("[documento: fuente]", tag)
    .replaceAll("[documento:fuente]", tag)
    .replaceAll("[fuente]", tag);
}

function withoutTags(text) {
  return String(text || "").replace(/\s*\[[^\]]+\]/g, "");
}

function hasArticle(text, number) {
  const token = String(number).replace(".", "\\.");
  const source = withoutTags(text);
  return new RegExp(`art(?:[ií]culos?|icles?|s)?\\.?\\s*(?:\\d+(?:\\.\\d+)?\\s*(?:,|y|and)\\s*)*${token}\\b`, "i").test(source);
}

function saysIllnessNull(text) {
  const source = withoutTags(text);
  return /nulo|\bvoid\b/i.test(source) && /enfermedad|condici[oó]n de salud|illness|health condition/i.test(source);
}

const CLAVE_26 = "El despido es nulo si el motivo es la enfermedad o la condición de salud (Ley 15/2022, artículo 26).";
const CLAVE_30 = "El trabajador aporta indicios y la empresa debe probar una justificación objetiva y razonable (Ley 15/2022, artículo 30).";
const CLAVE_INDICIOS = "El trabajador aporta indicios y la empresa debe probar una justificación objetiva y razonable.";
const CLAVE_PROCEDENTE = "El despido procedente, si es objetivo, da 20 días de salario por año de servicio, con un máximo de doce mensualidades.";
const CLAVE_IMPROCEDENTE = "El despido improcedente da 33 días de salario por año, con un tope de 24 mensualidades.";
const CLAVE_556 = "El despido nulo obliga a la readmisión y a los salarios de tramitación (artículo 55.6).";
const URL_2 = "https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589#a2";
const URL_26 = "https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589#a26";
const URL_30 = "https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589#a30";
const URL_53 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a53";
const URL_55 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a55";
const URL_56 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a56";

/** Si falta la cafeína o la cita, añade el párrafo literal y deja [higiene-sueno]. Solo si la pregunta es de sueño. */
export function completeHigiene(answer, noteText, question = "") {
  if (question && !/sueñ|sueno|higiene|insomnio|cafe[ií]na|caffeine|sleep/i.test(question)) return String(answer || "").trim();
  let text = placeNoteLabel(useNoteLabel(answer, "higiene-sueno"), "higiene-sueno");
  if (answerLanguage(question) === "en") {
    if (!/caffeine|cafe[ií]na/i.test(text)) {
      text = `${text.trim()} Sleep hygiene means cutting out alcohol, caffeine and nicotine, getting morning light, keeping regular hours, and finishing dinner two or three hours before bed.`.trim();
    }
    if (!text.includes("[higiene-sueno]")) text = `${text.trim()} [higiene-sueno]`.trim();
    return text;
  }
  if (!/cafe[ií]na/i.test(text)) {
    const paragraph = String(noteText || "").split(/\n\n/).map((part) => part.trim()).find((part) => /cafe[ií]na/i.test(part));
    if (paragraph) text = `${text.trim()}\n\n${paragraph}`.trim();
  }
  if (!text.includes("[higiene-sueno]")) text = `${text.trim()} [higiene-sueno]`.trim();
  return text;
}

/** Si falta un punto, añade frases fijas. No pega la nota. Las URL van solo en «Fuentes:». */
export function completeDespido(answer, _note = "", question = "") {
  const en = answerLanguage(question) === "en";
  let text = placeNoteLabel(useNoteLabel(answer, "despido-baja"), "despido-baja");
  const lines = [];
  const urls = [];
  const art26 = en
    ? "Dismissal is void if the motive is illness or a health condition (Law 15/2022, articles 2.1 and 26)."
    : CLAVE_26;
  const art30 = en
    ? "The worker brings indications and the company must prove an objective and reasonable justification (Law 15/2022, article 30)."
    : CLAVE_30;
  const indicios = en
    ? "The worker brings indications and the company must prove an objective and reasonable justification."
    : CLAVE_INDICIOS;
  const procedente = en
    ? "A fair objective dismissal pays 20 days of salary per year of service, with a cap of twelve months."
    : CLAVE_PROCEDENTE;
  const improcedente = en
    ? "An unfair dismissal pays 33 days of salary per year, with a cap of 24 months."
    : CLAVE_IMPROCEDENTE;
  const nulo = en
    ? "A void dismissal requires reinstatement and the wages for the time in between (article 55.6)."
    : CLAVE_556;
  const heading = en ? "Legal points" : "Claves legales";
  const fuentesLabel = en ? "Sources" : "Fuentes";
  if (!hasArticle(text, "26") && !saysIllnessNull(text)) {
    lines.push(art26);
    urls.push(URL_26);
  }
  if (!hasArticle(text, "30")) {
    lines.push(art30);
    urls.push(URL_30);
  } else if (!/indicios|indications/i.test(text)) {
    lines.push(indicios);
  }
  if (!/\bprocedente\b/i.test(text) && !/\b20 days\b/i.test(text)) {
    lines.push(procedente);
    urls.push(URL_53);
  }
  if (!/\bimprocedente\b/i.test(text) && !/\b33 days\b/i.test(text) && !/\bunfair dismissal\b/i.test(text)) {
    lines.push(improcedente);
    urls.push(URL_56);
  }
  if (!/55\.6\b/.test(text)) {
    lines.push(nulo);
    urls.push(URL_55);
  }
  if (hasArticle(text, "2.1")) urls.push(URL_2);
  if (hasArticle(text, "26")) urls.push(URL_26);
  const fuentes = [...new Set(urls)];
  if (lines.length) {
    const cola = fuentes.length ? `\n\nFuentes: ${fuentes.join(" ")}` : "";
    text = `${text.trim()}\n\n${heading}\n\n${lines.join("\n")}${cola.replace("Fuentes:", `${fuentesLabel}:`)}`.trim();
  } else if (fuentes.length) {
    text = `${text.trim()}\n\n${fuentesLabel}: ${fuentes.join(" ")}`.trim();
  }
  if (!text.includes("[despido-baja]")) text = `${text.trim()} [despido-baja]`.trim();
  return text;
}

const DATA_SOURCE = /banco de españa|bank of spain|eur[ií]bor|\bbce\b|\becb\b|coingecko|frankfurter/i;
const DATA_TREND = /disminuci[oó]n|aument|subid|bajad|ligera|tendencia|se mantiene|fortaleza|recuperaci|han mostrado|ha mostrado|decreas|slight decrease|went down/i;

function datumNumbers(sentence) {
  const found = [];
  for (const match of String(sentence || "").matchAll(/\d+(?:[.,]\d+)?/g)) {
    const raw = match[0];
    if (raw === "1" || /^(?:19|20)\d{2}$/.test(raw)) continue;
    found.push(raw);
  }
  return found;
}

function numberInFacts(raw, facts) {
  return numberForms(raw).some((form) => facts.includes(form));
}

function inventedDatum(sentence, facts) {
  if (!DATA_SOURCE.test(sentence)) return false;
  const numbers = datumNumbers(sentence).filter((raw) => new RegExp(`${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*%`).test(sentence) || /[.,]/.test(raw));
  const trend = DATA_TREND.test(sentence);
  if (!numbers.length && !trend) return false;
  if (!facts.trim()) return true;
  if (numbers.some((raw) => !numberInFacts(raw, facts))) return true;
  return trend && !numbers.length;
}

function isAwkwardGap(sentence) {
  return /no consta un dato actual|no tengo conectado el dato actual|there is no current (?:figure|data)|no live data is connected/i.test(sentence);
}

const LIVE_GAP = "Ahora no hay un dato en vivo disponible; conviene consultarlo en la fuente oficial antes de decidir.";
const LIVE_GAP_EN = "Live data is not available right now; check the official source before you decide.";

function placeLiveGap(text, lang) {
  const sentence = lang === "en" ? LIVE_GAP_EN : LIVE_GAP;
  if (/ahora no hay un dato en vivo|live data is not available/i.test(text)) return text.trim();
  const pieces = piecesOf(text);
  const warnAt = pieces.findIndex((piece) => WARNING.test(piece.body));
  if (warnAt < 0) return `${text.trim()} ${sentence}`.trim();
  const before = joinPieces(pieces.slice(0, warnAt));
  const after = joinPieces(pieces.slice(warnAt));
  return `${before} ${sentence} ${after}`.replace(/[ \t]{2,}/g, " ").trim();
}

/** Quita una cifra o una tendencia atribuida a una fuente que este turno no inyectó. */
export function dropUninjectedData(answer, factsText = "", question = "") {
  const lang = answerLanguage(question || answer);
  const facts = String(factsText || "");
  const pieces = piecesOf(answer);
  const removed = [];
  const kept = [];
  for (const piece of pieces) {
    if (isAwkwardGap(piece.body) || inventedDatum(piece.body, facts)) removed.push(piece.body);
    else kept.push(piece);
  }
  if (!removed.length) return String(answer || "").trim();
  let text = joinPieces(kept);
  const stillHasDatum = kept.some((piece) => datumNumbers(piece.body).length > 0 || DATA_TREND.test(piece.body));
  if (!stillHasDatum) text = placeLiveGap(text, lang);
  return text;
}

/** Frases que piden fuentes, enlaces, el documento o un informe. Si no aparece ninguna, la respuesta no las muestra. */
export const SOURCE_REQUESTS = [
  "fuentes",
  "dame las fuentes",
  "dame la fuente",
  "con fuentes",
  "con fuente",
  "con enlaces",
  "con enlace",
  "dame los enlaces",
  "dame el enlace",
  "pásame el documento",
  "dame el documento",
  "envíame el documento",
  "hazme un informe",
  "haz un informe",
  "dame un informe",
  "sources",
  "give me the sources",
  "give me the source",
  "with links",
  "with link",
  "send me the document",
  "give me the document",
  "make a report",
  "make me a report",
];

function foldRequest(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[¿?¡!.,;:()«»"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EN_WORDS = /\b(the|what|how|should|would|please|before|about|mortgage|sleep|hygiene|dismiss|dismissal|password|invest|investments|sources|source|links|link|document|report|give|with|war|caffeine|today)\b/g;
const ES_WORDS = /\b(que|como|para|hipoteca|sueno|higiene|despedir|despido|puedo|cual|antes|mirar|guerra|contrasena|inversion|inversiones|fuentes|fuente|documento|informe|enlaces|cafeina|hoy|baja)\b/g;

/** Español por defecto. Inglés solo si el mensaje trae más palabras inglesas que españolas. */
export function answerLanguage(message) {
  const text = foldRequest(message);
  const en = (text.match(EN_WORDS) || []).length;
  const es = (text.match(ES_WORDS) || []).length;
  return en > es ? "en" : "es";
}

export function wantsSources(message) {
  const text = foldRequest(message);
  if (!text || /\b(?:sin|without)\s+(?:fuentes?|sources?)\b/.test(text)) return false;
  return SOURCE_REQUESTS.some((phrase) => {
    const needle = foldRequest(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${needle}(?:\\s|$)`).test(text);
  });
}

function proseFromCite(inner, lang) {
  const range = String(inner || "").match(/(?:el\s+)?(?:BCE|ECB)(?:\s+v[ií]a\s+Frankfurter)?,\s*(\d{2}-\d{2}-\d{4})\s+(?:a|to)\s+(\d{2}-\d{2}-\d{4})/i);
  if (range) return lang === "en" ? `ECB data from ${range[1]} to ${range[2]}` : `datos del BCE del ${range[1]} al ${range[2]}`;
  const dated = String(inner || "").match(/(?:el\s+)?(?:BCE|ECB)(?:,\s*Frankfurter)?,\s*(\d{2}-\d{2}-\d{4}(?:\s+\d{2}:\d{2})?)/i);
  if (dated) return lang === "en" ? `ECB data as of ${dated[1]}` : `datos del BCE a ${dated[1]}`;
  const stamp = String(inner || "").match(/(\d{2}-\d{2}(?:-\d{4})?(?:\s+\d{2}:\d{2})?)/);
  if (stamp && /coingecko|frankfurter|\bbce\b|\becb\b/i.test(inner)) return lang === "en" ? `as of ${stamp[1]}` : `a ${stamp[1]}`;
  return "";
}

function isBibliography(body) {
  const text = String(body || "").trim();
  if (!text) return true;
  if (/^del /i.test(text) && /ministerio|volumen|sanidad|publicaci/i.test(text)) return true;
  if (/^from the ministry/i.test(text)) return true;
  if (/^fuente oficial\b/i.test(text) || /^volumen\b/i.test(text)) return true;
  if (/ministerio de sanidad/i.test(text) && /volumen|n[uú]mero/i.test(text)) return true;
  if (/^«[^»]{0,80}»\.?$/.test(text)) return true;
  return false;
}

function dropBibliography(text) {
  const kept = [];
  for (const piece of piecesOf(text)) {
    const body = piece.body
      .replace(/^\s*según el documento\s+[\w:-]+\s*,?\s*/i, "")
      .replace(/^\s*according to the document\s+[\w:-]+\s*,?\s*/i, "")
      .trim();
    if (isBibliography(body)) continue;
    kept.push({ body, sep: piece.sep });
  }
  return joinPieces(kept);
}

/** Sin una petición explícita, la respuesta no enseña etiquetas, enlaces ni el bloque Fuentes. */
export function presentAnswer(answer, question) {
  const text = String(answer || "").trim();
  if (!text) return text;
  const lang = answerLanguage(question);
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((item) => item[0]);
  let next = dropBibliography(text);
  if (wantsSources(question)) {
    const tags = [...text.matchAll(/\[[^\]\n]{1,40}\]/g)].map((item) => item[0]);
    next = next.replace(/https?:\/\/[^\s)]+/g, "").replace(/[ \t]*Fuentes:\s*[^\n]*/gi, "");
    for (const tag of [...new Set(tags)]) {
      if (!next.includes(tag)) next = `${next.trim()} ${tag}`.trim();
    }
    const fuentes = [...new Set(urls)];
    const label = lang === "en" ? "Sources" : "Fuentes";
    if (fuentes.length) next = `${next.trim()}\n\n${label}: ${fuentes.join(" ")}`.trim();
    return next.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;])/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
  }
  next = next.replace(/[ \t]*(?:Fuentes|Sources):\s*[^\n]*/gi, "");
  next = next.replace(/https?:\/\/[^\s)]+/g, "");
  next = next.replace(/\[[^\]\n]{1,80}\]/g, "");
  next = next.replace(/\s*,?\s*según el documento\s+[\w:-]+/gi, "");
  next = next.replace(/\(\s*([+-]?\d+(?:[.,]\d+)?\s*%)\s*;\s*([^)]+)\)/g, (_all, figure, cite) => {
    const prose = proseFromCite(cite, lang);
    return prose ? `${figure.trim()} (${prose})` : figure.trim();
  });
  next = next.replace(/\(\s*([^()]{0,180})\s*\)/g, (all, inner) => {
    if (/datos del BCE|ECB data/i.test(inner) || !/frankfurter|coingecko|(?:^|[^a-z])(?:bce|ecb)(?:[^a-z]|$)/i.test(inner)) return all;
    const prose = proseFromCite(inner, lang);
    if (!prose) return "";
    return /^(a |as of )/i.test(prose) ? prose : `(${prose})`;
  });
  return next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HIPOTECA_GUIA = [
  "Antes de firmar una hipoteca revise el índice de referencia, que suele ser el Euríbor, y el diferencial que se le suma.",
  "Compare la TAE, no solo el tipo de partida, y anote las comisiones de apertura, amortización y subrogación.",
  "Compruebe si el contrato trae cláusula suelo.",
  "Valore el riesgo de que la cuota suba.",
  "Pida la FEIN y la información precontractual prevista en la Ley 5/2019.",
  "Esto es una guía general: no es la cifra de hoy ni la oferta de un banco concreto.",
].join(" ");

const MORTGAGE_GUIDE = [
  "Before you sign a mortgage, check the reference index, usually Euribor, and the spread added to it.",
  "Compare the APR, not only the starting rate, and note the fees for opening, early repayment and switching lender.",
  "Check whether the contract has a floor clause.",
  "Weigh the risk that the payment goes up.",
  "Ask for the FEIN and the pre-contract information required by Law 5/2019.",
  "This is a general guide: it is not today's figure and not a named bank's offer.",
].join(" ");

function isMortgageNoise(body) {
  return /higiene del sueñ|cafe[ií]na|tabla II|\bcnmf\b|mercado financiero/i.test(body)
    || /^no consta\b/i.test(body.trim())
    || /^no hay informaci/i.test(body.trim());
}

/** En una pregunta de hipoteca, una guía general y ninguna nota de otro tema. */
export function completeHipoteca(answer, question) {
  if (!/hipotec|mortgage/i.test(String(question || ""))) return String(answer || "").trim();
  const kept = piecesOf(answer).filter((piece) => !isMortgageNoise(piece.body));
  let text = joinPieces(kept);
  const en = answerLanguage(question) === "en";
  const covered = /eur[ií]bor/i.test(text) && (/\btae\b/i.test(text) || /\bapr\b/i.test(text)) && (/fein/i.test(text) || /ley\s*5\s*\/\s*2019|law\s*5\s*\/\s*2019/i.test(text));
  if (!covered) text = `${text} ${en ? MORTGAGE_GUIDE : HIPOTECA_GUIA}`.replace(/\s+/g, " ").trim();
  return text;
}

const NAMED_BANK = /\b(?:bankia|caixabank|caixa\s*bank|santander|bbva|sabadell|bankinter|unicaja|abanca|kutxabank|ibercaja|cajamar|openbank)\b/i;

/** En una respuesta de hipoteca o financiación, no nombra un banco concreto. */
export function dropNamedBanks(answer) {
  const source = String(answer || "");
  if (!/hipotec|mortgage|pr[eé]stamo|financiaci[oó]n|cr[eé]dito/i.test(source)) return source.trim();
  const kept = piecesOf(source).filter((piece) => !NAMED_BANK.test(piece.body));
  return joinPieces(kept);
}
