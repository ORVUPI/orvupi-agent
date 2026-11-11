/** Prepara un turno de ARQIVEN: fuentes, reglas críticas y texto para el modelo. */

import {
  asksFinancialAdvice,
  asksIdentity,
  caWarning,
  financeRefusal,
  foreignAddresses,
  guardOutput,
  identityAnswer,
  normLang,
} from "./guard.mjs";
import { extractiveFromSources, needsExtract } from "./quality.mjs";
import { looksLikeOrvupi, search } from "./retrieve.mjs";
import { lookupWikipedia } from "./wikipedia.mjs";

const LOCAL_MIN = 1.2;

export function toSource(hit, origin) {
  return {
    id: String(hit.id || ""),
    title: String(hit.title || hit.url || "").slice(0, 140),
    url: String(hit.url || ""),
    excerpt: String(hit.excerpt || hit.text || "").replace(/\s+/g, " ").trim().slice(0, 700),
    license: hit.license || (origin === "wikipedia" ? "CC BY-SA 4.0" : "MIT"),
    origin: origin || hit.origin || "orvupi",
  };
}

export function shouldConsultWikipedia(question, localHits) {
  const best = localHits[0]?.score || 0;
  if (looksLikeOrvupi(question) && best >= LOCAL_MIN) return false;
  return true;
}

export async function planTurn(options) {
  const question = String(options.question || "").trim();
  const lang = normLang(options.lang);
  const pageLang = options.lang === "pt" ? "pt-BR" : (options.lang || "es");
  const index = options.index;
  const localHits = index ? search(index, question, 4, pageLang) : [];
  const local = localHits.map((hit) => toSource(hit, "orvupi"));
  if (foreignAddresses(question).length) {
    return { skipModel: true, critical: "ca", text: caWarning(lang), sources: local.slice(0, 2), promptSources: [] };
  }
  if (asksFinancialAdvice(question)) {
    return { skipModel: true, critical: "finance", text: financeRefusal(lang), sources: local.slice(0, 2), promptSources: [] };
  }
  if (asksIdentity(question)) {
    return { skipModel: true, critical: "identity", text: identityAnswer(lang, options.model), sources: [], promptSources: [] };
  }
  let wiki = null;
  if (options.allowWikipedia !== false && shouldConsultWikipedia(question, localHits) && typeof options.fetchImpl === "function") {
    wiki = await lookupWikipedia(lang, question, options.fetchImpl);
  }
  const usefulLocal = looksLikeOrvupi(question) ? local : [];
  const sources = wiki ? usefulLocal.slice(0, 2).concat([toSource(wiki, "wikipedia")]) : usefulLocal.slice(0, 4);
  return {
    skipModel: false,
    critical: null,
    text: "",
    sources,
    promptSources: sources.map((item) => ({ title: item.title, url: item.url, excerpt: item.excerpt })),
  };
}

export function finishModelAnswer(text, lang, sources = [], question = "") {
  const guarded = guardOutput(text, lang);
  if (guarded.blocked) return { ...guarded, extractive: false };
  if (needsExtract(guarded.text, sources)) {
    const excerpt = extractiveFromSources(lang, sources, question);
    if (excerpt) return { text: excerpt, blocked: null, critical: false, foreign: [], extractive: true };
  }
  return { ...guarded, extractive: false };
}

export function excerptAnswer(lang, source, question = "") {
  if (question && source) return extractiveFromSources(lang, [source], question);
  if (!source?.excerpt) return "";
  const code = normLang(lang);
  const lead = code === "en"
    ? "Excerpt from the source, not from the third-party model:"
    : code === "pt"
      ? "Trecho da fonte, não do modelo de terceiros:"
      : code === "ja"
        ? "出典からの抜粋です。第三者モデルの文章ではありません:"
        : code === "ko"
          ? "출처에서 발췌한 글입니다. 제3자 모델의 문장이 아닙니다:"
          : "Extracto de la fuente, no del modelo de terceros:";
  return `${lead} ${source.excerpt}`;
}
