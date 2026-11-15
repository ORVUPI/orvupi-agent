/** Arreglos de la respuesta ya escrita. No cambian el filtro de los documentos del usuario. */

function piecesOf(text) {
  const source = String(text || "");
  const pieces = [];
  const re = /(\n+|(?<=[.!?])[ \t]+)/g;
  let last = 0;
  let match;
  while ((match = re.exec(source))) {
    pieces.push({ body: source.slice(last, match.index), sep: match[0] });
    last = match.index + match[0].length;
  }
  pieces.push({ body: source.slice(last), sep: "" });
  return pieces;
}

function joinPieces(pieces, until) {
  return pieces.slice(0, until).map((piece, index) => piece.body + (index === until - 1 ? "" : piece.sep)).join("");
}

function normalizeSentence(part) {
  return part.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

/** Si una frase de más de 60 caracteres vuelve a salir, se corta en la anterior. */
export function cutRepeatedSentences(text) {
  const pieces = piecesOf(text);
  const seen = new Set();
  let end = pieces.length;
  for (let index = 0; index < pieces.length; index += 1) {
    const key = normalizeSentence(pieces[index].body);
    if (key.length > 60 && seen.has(key)) {
      end = index;
      break;
    }
    if (key.length > 60) seen.add(key);
  }
  return joinPieces(pieces, end).trim();
}

function sentenceAt(text, index) {
  const upto = text.slice(0, index);
  let start = 0;
  for (let from = 0; from < upto.length; ) {
    const at = upto.indexOf(". ", from);
    if (at < 0) break;
    if (!/art$/i.test(upto.slice(Math.max(0, at - 4), at))) start = at + 2;
    from = at + 2;
  }
  const rest = text.slice(index);
  const endMatch = rest.search(/[.!?\n]/);
  const end = endMatch < 0 ? text.length : index + endMatch;
  return text.slice(start, end);
}

/** Quita #aNN si esa frase no cita el artículo NN. El 55.6 corresponde a #a55, no a #a56. */
export function stripMismatchedAnchors(text) {
  return String(text || "").replace(/#a(\d+)\b/gi, (tag, raw, index, source) => {
    const sentence = sentenceAt(source, index);
    const cited = [...sentence.matchAll(/art(?:[ií]culo|\.)\s*(\d+)/gi)].map((match) => String(Number(match[1])));
    if (!cited.length || !cited.includes(String(Number(raw)))) return "";
    return tag;
  }).replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}

const WARNING = /no es una recomendaci[oó]n|puedes perder|no sustituye|riesgo de p[eé]rdida|no inviertas lo que no puedas|advertencia breve/i;

/** Si hay cifras de mercado, no deja texto después de la advertencia. */
export function trimAfterWarning(text) {
  const source = String(text || "");
  if (!/frankfurter|coingecko|\bel BCE\b/i.test(source)) return source.trim();
  const pieces = piecesOf(source);
  const at = pieces.findIndex((piece) => WARNING.test(piece.body));
  if (at < 0) return source.trim();
  return joinPieces(pieces, at + 1).trim();
}

export function ensureNoteCitation(text, id) {
  const note = String(id || "").trim();
  const source = String(text || "").trim();
  if (!note || !source) return source;
  const cited = new RegExp(`\\[${note}\\]|documento\\s+${note}\\b`, "i");
  if (cited.test(source)) return source;
  let end = -1;
  for (let index = 0; index < source.length; index += 1) {
    const mark = source[index];
    if (mark !== "." && mark !== "!" && mark !== "?") continue;
    if (mark === "." && /art$/i.test(source.slice(Math.max(0, index - 4), index))) continue;
    if (mark === "." && /\d/.test(source[index - 1] || "") && /\d/.test(source[index + 1] || "")) continue;
    const next = source[index + 1];
    if (next == null || /\s/.test(next)) {
      end = index;
      break;
    }
  }
  if (end < 0) return `${source} [${note}]`;
  return `${source.slice(0, end)} [${note}]${source.slice(end)}`;
}
