/** Arreglos de la respuesta ya escrita. No cambian el filtro de los documentos del usuario. */

function partsOf(text) {
  return String(text || "").split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
}

function normalizeSentence(part) {
  return part.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

/** Si una frase de más de 60 caracteres vuelve a salir, se corta en la anterior. */
export function cutRepeatedSentences(text) {
  const parts = partsOf(text);
  const seen = new Set();
  const kept = [];
  for (const part of parts) {
    const key = normalizeSentence(part);
    if (key.length > 60 && seen.has(key)) break;
    if (key.length > 60) seen.add(key);
    kept.push(part);
  }
  return kept.join(" ").trim();
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
  const source = String(text || "").trim();
  if (!/frankfurter|coingecko|\bel BCE\b/i.test(source)) return source;
  const parts = partsOf(source);
  const at = parts.findIndex((part) => WARNING.test(part));
  if (at < 0) return source;
  return parts.slice(0, at + 1).join(" ").trim();
}

export function ensureNoteCitation(text, id) {
  const note = String(id || "").trim();
  const source = String(text || "").trim();
  if (!note || !source) return source;
  const cited = new RegExp(`\\[${note}\\]|documento\\s+${note}\\b`, "i");
  if (cited.test(source)) return source;
  const end = source.search(/[.!?]/);
  if (end < 0) return `${source} [${note}]`;
  return `${source.slice(0, end)} [${note}]${source.slice(end)}`;
}
