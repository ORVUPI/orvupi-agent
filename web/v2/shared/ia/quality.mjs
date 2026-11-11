/** Detecta respuestas degeneradas y arma un extracto citado. No llama a la red. */

import { normLang } from "./guard.mjs";
import { wikiQuery } from "./wikipedia.mjs";

const NOTICE = {
  es: "El modelo de terceros se repitió o no se apoyó en las fuentes. Esto es un extracto citado, no su redacción.",
  en: "The third-party model repeated itself or did not follow the sources. This is a cited excerpt, not its wording.",
  pt: "O modelo de terceiros se repetiu ou não se apoiou nas fontes. Isto é um trecho citado, não a redação dele.",
  ja: "第三者モデルが同じことを繰り返したか、出典に沿いませんでした。これは出典からの抜粋で、モデルの文章ではありません。",
  ko: "제3자 모델이 같은 말을 반복했거나 출처를 따르지 않았습니다. 이것은 출처에서 발췌한 글이며 모델의 문장이 아닙니다.",
};

const LEAD = {
  es: "Según las fuentes citadas:",
  en: "According to the cited sources:",
  pt: "Segundo as fontes citadas:",
  ja: "示した出典によると:",
  ko: "밝힌 출처에 따르면:",
};

export function isDegenerate(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length < 48) return false;
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);
  const grams = new Map();
  for (let i = 0; i <= words.length - 3; i += 1) {
    const gram = words.slice(i, i + 3).join(" ");
    const count = (grams.get(gram) || 0) + 1;
    grams.set(gram, count);
    if (count >= 3) return true;
  }
  const unique = new Set(words);
  if (words.length >= 24 && unique.size / words.length < 0.45) return true;
  return /([^\p{L}\p{N}\s])\1{7,}/u.test(value);
}

function contentWords(text) {
  return String(text || "").toLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 4);
}

const COMMON = new Set("esta este esto para como donde cuando sobre entre desde hasta tiene tenido sido fueron seria sería donde that with from have been were this your about into also solo cada muy mais essa este para como quando sobre entre desde".split(/\s+/));

export function lacksSupport(answer, sources) {
  const words = [...new Set(contentWords(answer))].filter((word) => !COMMON.has(word));
  if (words.length < 3 || !sources?.length) return false;
  const blob = sources.map((source) => `${source.title || ""} ${source.excerpt || source.text || ""}`).join("\n").toLowerCase();
  const missing = words.filter((word) => !blob.includes(word));
  return missing.length >= 2 && missing.length / words.length >= 0.34;
}

export function needsExtract(answer, sources) {
  return isDegenerate(answer) || lacksSupport(answer, sources);
}

function sentencesOf(text) {
  return String(text || "").replace(/\s+/g, " ").split(/(?<=[.。！？!?])\s+/).map((part) => part.trim()).filter((part) => part.length >= 40 && part.length <= 320);
}

export function citedExcerpt(lang, sources, question) {
  const body = pickSentences(sources, question);
  if (!body) return "";
  const code = normLang(lang);
  return `${LEAD[code] || LEAD.es} ${body}`;
}

export function extractiveFromSources(lang, sources, question) {
  const body = pickSentences(sources, question);
  if (!body) return "";
  const code = normLang(lang);
  return `${NOTICE[code] || NOTICE.es} ${body}`;
}

function pickSentences(sources, question) {
  const list = (Array.isArray(sources) ? sources : []).filter((source) => source?.excerpt || source?.text);
  if (!list.length) return "";
  const query = wikiQuery(question || "").toLowerCase();
  const wanted = contentWords(`${query} ${question || ""}`);
  const ranked = [];
  list.forEach((source, index) => {
    const prefer = (source.origin === "wikipedia" ? 2 : 0) + Math.max(0, 3 - index);
    for (const sentence of sentencesOf(source.excerpt || source.text)) {
      const words = contentWords(sentence);
      const lower = sentence.toLowerCase();
      const overlap = wanted.filter((word) => words.includes(word) || lower.includes(word)).length;
      const defines = query && new RegExp(`^${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(es|is|é|とは)\\b`, "i").test(sentence) ? 6 : 0;
      ranked.push({ sentence, source, score: overlap + prefer + defines });
    }
  });
  ranked.sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length);
  const best = ranked[0]?.score || 0;
  const picked = [];
  for (const item of ranked) {
    if (picked.length && item.score < best - 3) break;
    if (picked.some((prev) => prev.sentence === item.sentence)) continue;
    picked.push(item);
    if (picked.length === 2) break;
  }
  if (!picked.length) {
    const first = list[0];
    picked.push({ sentence: String(first.excerpt || first.text).slice(0, 320), source: first, score: 0 });
  }
  return picked.map((item) => item.sentence).join(" ");
}
