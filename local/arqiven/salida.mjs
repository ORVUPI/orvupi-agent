/** Arreglos de la respuesta ya escrita. No cambian el examen ni el filtro. */

function piecesOf(text) {
  const source = String(text || "");
  const pieces = [];
  const re = /(\n+|(?<!art)(?<=\.)[ \t]+|(?<=[!?])[ \t]+)/gi;
  let last = 0;
  let match;
  while ((match = re.exec(source))) {
    pieces.push({ body: source.slice(last, match.index), sep: match[0] });
    last = match.index + match[0].length;
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
      figures.push({ key: figureKey(raw), unit, citation: cite[1] });
    }
  }
  return figures;
}

function figureFor(figures, number, unit) {
  const key = figureKey(number);
  if (!key || key === "1") return null;
  if (unit) {
    const exact = figures.find((item) => item.key === key && item.unit === unit);
    if (exact) return exact;
  }
  return figures.find((item) => item.key === key) || null;
}

/** Añade «(Fuente, fecha)» detrás de la cifra y de su unidad. Cada cifra se mira sola. */
export function citeMissingFigures(answer, factsText) {
  const figures = figuresInFacts(factsText);
  if (!figures.length) return String(answer || "");
  return String(answer || "").replace(
    /(?<!\d)([+-]?\d+(?:[.,]\d+)?)(\s*\([^)]*\))?(\s*(?:USD|GBP|%))?/gi,
    (found, number, paren = "", unit = "", offset, source) => {
      const unitToken = (String(unit).match(/USD|GBP|%/i) || [""])[0].toUpperCase();
      const figure = figureFor(figures, number, unitToken === "%" ? "%" : unitToken);
      if (!figure) return found;
      const rest = source.slice(offset + found.length).trimStart();
      const cited = `(${figure.citation})`;
      if (rest.startsWith(cited)) return found;
      if (!unitToken && paren.includes(figure.citation)) return found;
      const shown = unitToken === "%" ? "%" : unitToken;
      return shown ? `${number} ${shown} ${cited}` : `${number} ${cited}`;
    },
  );
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

export function closeMarketAnswer(answer, factsText) {
  if (!String(factsText || "").trim()) return String(answer || "").trim();
  let text = citeMissingFigures(answer, factsText);
  if (!/no es una recomendaci[oó]n|puedes perder|no sustituye/i.test(text)) {
    text = `${text.trim()} ${MARKET_WARNING}`.trim();
  }
  return trimAfterWarning(text);
}

/** Si la etiqueta está en medio de la frase, la pasa al final. No la añade a un «No consta». */
function sentenceEnd(bare) {
  for (let index = 0; index < bare.length; index += 1) {
    const mark = bare[index];
    if (mark !== "." && mark !== "!" && mark !== "?") continue;
    if (mark === "." && /art$/i.test(bare.slice(Math.max(0, index - 4), index))) continue;
    if (mark === "." && /\d/.test(bare[index - 1] || "") && /\d/.test(bare[index + 1] || "")) continue;
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

function hasArticle(text, number) {
  const token = String(number).replace(".", "\\.");
  return new RegExp(`art(?:[ií]culos?|s)?\\.?\\s*(?:\\d+(?:\\.\\d+)?\\s*(?:,|y)\\s*)*${token}\\b`, "i").test(String(text || ""));
}

const CLAVE_26 = "El despido es nulo si el motivo es la enfermedad o la condición de salud (Ley 15/2022, artículo 26).";
const CLAVE_30 = "El trabajador aporta indicios y la empresa debe probar una justificación objetiva y razonable (Ley 15/2022, artículo 30).";
const CLAVE_INDICIOS = "El trabajador aporta indicios y la empresa debe probar una justificación objetiva y razonable.";
const CLAVE_PROCEDENTE = "El despido procedente, si es objetivo, da 20 días de salario por año de servicio, con un máximo de doce mensualidades.";
const CLAVE_IMPROCEDENTE = "El despido improcedente da 33 días de salario por año, con un tope de 24 mensualidades.";
const CLAVE_556 = "El despido nulo obliga a la readmisión y a los salarios de tramitación (artículo 55.6).";
const URL_26 = "https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589#a26";
const URL_30 = "https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589#a30";
const URL_53 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a53";
const URL_55 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a55";
const URL_56 = "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430#a56";

/** Si falta la cafeína o la cita, añade el párrafo literal y deja [higiene-sueno]. */
export function completeHigiene(answer, noteText) {
  let text = placeNoteLabel(useNoteLabel(answer, "higiene-sueno"), "higiene-sueno");
  if (!/cafe[ií]na/i.test(text)) {
    const paragraph = String(noteText || "").split(/\n\n/).map((part) => part.trim()).find((part) => /cafe[ií]na/i.test(part));
    if (paragraph) text = `${text.trim()}\n\n${paragraph}`.trim();
  }
  if (!text.includes("[higiene-sueno]")) text = `${text.trim()} [higiene-sueno]`.trim();
  return text;
}

/** Si falta un punto, añade frases fijas. No pega la nota. Las URL van solo en «Fuentes:». */
export function completeDespido(answer) {
  let text = placeNoteLabel(useNoteLabel(answer, "despido-baja"), "despido-baja");
  const lines = [];
  const urls = [];
  if (!hasArticle(text, "26")) {
    lines.push(CLAVE_26);
    urls.push(URL_26);
  }
  if (!hasArticle(text, "30")) {
    lines.push(CLAVE_30);
    urls.push(URL_30);
  } else if (!/indicios/i.test(text)) {
    lines.push(CLAVE_INDICIOS);
  }
  if (!/\bprocedente\b/i.test(text)) {
    lines.push(CLAVE_PROCEDENTE);
    urls.push(URL_53);
  }
  if (!/\bimprocedente\b/i.test(text)) {
    lines.push(CLAVE_IMPROCEDENTE);
    urls.push(URL_56);
  }
  if (!/55\.6\b/.test(text)) {
    lines.push(CLAVE_556);
    urls.push(URL_55);
  }
  if (lines.length) {
    const fuentes = [...new Set(urls)];
    const cola = fuentes.length ? `\n\nFuentes: ${fuentes.join(" ")}` : "";
    text = `${text.trim()}\n\nClaves legales\n\n${lines.join("\n")}${cola}`.trim();
  }
  if (!text.includes("[despido-baja]")) text = `${text.trim()} [despido-baja]`.trim();
  return text;
}
