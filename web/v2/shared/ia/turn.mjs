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
import { extractiveFromSources, needsExtract, trimRepetition } from "./quality.mjs";
import { replyLanguage } from "./prompt.mjs";
import { looksLikeOrvupi, search } from "./retrieve.mjs";
import { lookupWikipedia, wikiQuery } from "./wikipedia.mjs";

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

const FOLLOW = /^(?:¿\s*)?(?:y\b|e\b|and\b|entonces\b|eso\b|esa\b|ese\b|ah[ií]\b|then\b)/i;

export function isFollowUp(question, history = []) {
  const text = String(question || "").trim();
  if (!text || text.length > 90) return false;
  const cue = FOLLOW.test(text) || /\b(eso|ah[ií]|that|there)\b/i.test(text);
  if (!cue) return false;
  return history.some((item) => item?.role === "assistant" && (item.mode === "model" || (!item.mode && item.content && !/extracto citado|se repiti[oó]|cited excerpt|出典からの抜粋|출처에서 발췌/i.test(String(item.content)))));
}

export function looksLikeDefinition(question) {
  const raw = String(question || "").replace(/[¿?¡!。．]/g, " ").replace(/\s+/g, " ").trim();
  const stripped = wikiQuery(question);
  return Boolean(stripped) && stripped.length < raw.length;
}

export function shouldConsultWikipedia(question, localHits, options = {}) {
  if (options.attachment) return false;
  if (isFollowUp(question, options.history)) return false;
  if (!looksLikeDefinition(question)) return false;
  const best = localHits[0]?.score || 0;
  if (looksLikeOrvupi(question) && best >= LOCAL_MIN) return false;
  return true;
}

export async function planTurn(options) {
  const question = String(options.question || "").trim();
  const pageLang = options.lang === "pt" ? "pt-BR" : (options.lang || "es");
  const reply = replyLanguage(question, pageLang);
  const lang = normLang(reply);
  const index = options.index;
  const localHits = index ? search(index, question, 4, reply) : [];
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
  const history = Array.isArray(options.history) ? options.history : [];
  if (options.allowWikipedia !== false && shouldConsultWikipedia(question, localHits, { attachment: Boolean(options.attachment), history }) && typeof options.fetchImpl === "function") {
    wiki = await lookupWikipedia(lang, question, options.fetchImpl);
  }
  const usefulLocal = looksLikeOrvupi(question) ? local : [];
  const namedTool = /\b(sonar|studio|verify|academy|work)\b/i.test(question);
  const aboutOrvupi = /\borvupi\b/i.test(question) && !namedTool;
  const focused = aboutOrvupi
    ? usefulLocal.filter((source) => !/\b(academy|studio|sonar|verify|work)\b/i.test(`${source.title} ${source.url}`))
    : usefulLocal;
  const picked = focused.length ? focused : usefulLocal;
  const sources = wiki ? picked.slice(0, 2).concat([toSource(wiki, "wikipedia")]) : picked.slice(0, 4);
  return {
    skipModel: false,
    critical: null,
    text: "",
    sources,
    promptSources: sources.map((item) => ({ title: item.title, url: item.url, excerpt: item.excerpt })),
    replyLang: reply,
  };
}

export function finishModelAnswer(text, lang, sources = [], question = "", history = []) {
  const trimmed = trimRepetition(text);
  const guarded = guardOutput(trimmed, lang);
  if (guarded.blocked) return { ...guarded, extractive: false };
  if (isFollowUp(question, history)) return { ...guarded, extractive: false };
  if (needsExtract(guarded.text, sources, question)) {
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
