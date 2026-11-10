/** Consulta pública y sin clave a la API de Wikipedia, en el idioma de la persona.
 * El navegador pone su propio User-Agent. En Node hay que pasar uno descriptivo.
 */

import { normLang } from "./guard.mjs";

const HOST = { es: "es", en: "en", pt: "pt", ja: "ja", ko: "ko" };
const MIN_CONFIDENCE = 0.72;

const PREFIXES = [
  "quiénes fueron", "quienes fueron", "quién fue", "quien fue", "quién es", "quien es", "quién era", "quien era",
  "qué es un", "que es un", "qué es una", "que es una", "qué es", "que es", "qué son", "que son", "qué fue", "que fue",
  "cuál es", "cual es", "háblame de", "hablame de", "dime quién fue", "dime quien fue",
  "who were", "who was", "who is", "what was", "what were", "what is a", "what is an", "what is", "what are",
  "tell me about", "tell me who",
  "quem foram", "quem foi", "quem é", "quem e", "o que é um", "o que e um", "o que é uma", "o que é", "o que e", "o que foi",
  "qual é", "qual e", "fale sobre",
];

export function wikiHost(lang) {
  return `${HOST[normLang(lang)] || "en"}.wikipedia.org`;
}

export function wikiQuery(question) {
  let text = String(question || "").replace(/[¿?¡!。．]/g, " ").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const prefix = PREFIXES.slice().sort((a, b) => b.length - a.length).find((item) => lower === item || lower.startsWith(`${item} `));
  if (prefix) text = text.slice(prefix.length).trim();
  text = text.replace(/(とは何ですか|とは何|って誰ですか|って誰|は誰ですか|は誰|について教えて|について).*$/u, "").trim();
  text = text.replace(/(は何ですか|は何).*$/u, "").trim();
  text = text.replace(/(는 누구인가요|은 누구인가요|는 무엇인가요|은 무엇인가요|가 무엇인가요|이란 무엇인가요|란 무엇인가요).*$/u, "").trim();
  return text.replace(/^[\s:：\-–—]+|[\s:：\-–—]+$/g, "").trim();
}

export function foldTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[・·\s'"’`_\-–—]/g, "")
    .replace(/ー/g, "");
}

export function scoreWikiTitle(query, title) {
  const left = foldTitle(query);
  const right = foldTitle(title);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (right.startsWith(left) || left.startsWith(right)) return 0.93;
  if (right.includes(left) || left.includes(right)) return 0.86;
  const parts = String(query || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((part) => part.length > 1);
  if (!parts.length) return 0;
  const hay = String(title || "").toLowerCase();
  const hits = parts.filter((part) => hay.includes(part)).length;
  if (hits === parts.length) return 0.8;
  if (!hits) return 0;
  return 0.35 * (hits / parts.length);
}

export function rankWikiHits(query, hits) {
  const ranked = (Array.isArray(hits) ? hits : []).flatMap((hit) => {
    const title = typeof hit?.title === "string" ? hit.title : "";
    if (!title) return [];
    return [{ title, confidence: scoreWikiTitle(query, title) }];
  });
  ranked.sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title));
  return ranked;
}

export function searchUrl(lang, query) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: String(query || "").slice(0, 180),
    srlimit: "8",
    format: "json",
    utf8: "1",
    origin: "*",
  });
  return `https://${wikiHost(lang)}/w/api.php?${params.toString()}`;
}

export function summaryUrl(lang, title) {
  return `https://${wikiHost(lang)}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
}

export function parseSearch(payload) {
  const hits = payload?.query?.search;
  if (!Array.isArray(hits)) return [];
  return hits.flatMap((hit) => (typeof hit?.title === "string" && hit.title ? [{ title: hit.title }] : []));
}

export function parseSummary(payload) {
  if (!payload || payload.type === "disambiguation" || typeof payload.extract !== "string") return null;
  const extract = payload.extract.replace(/\s+/g, " ").trim();
  if (extract.length < 40) return null;
  const url = payload?.content_urls?.desktop?.page;
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  return {
    title: typeof payload.title === "string" ? payload.title : "",
    excerpt: extract.slice(0, 700),
    url,
    license: "CC BY-SA 4.0",
    origin: "wikipedia",
  };
}

async function readJson(fetchImpl, url, timeoutMs) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, controller ? { signal: controller.signal } : {});
    if (!response?.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function bestInLanguage(lang, entity, fetchImpl, timeoutMs) {
  const payload = await readJson(fetchImpl, searchUrl(lang, entity), timeoutMs);
  const ranked = rankWikiHits(entity, parseSearch(payload));
  const best = ranked.find((item) => item.confidence >= MIN_CONFIDENCE);
  if (!best) return null;
  const summary = parseSummary(await readJson(fetchImpl, summaryUrl(lang, best.title), timeoutMs));
  if (!summary) return null;
  return { ...summary, confidence: best.confidence, id: `wiki:${wikiHost(lang)}:${summary.title}` };
}

export async function lookupWikipedia(lang, query, fetchImpl = globalThis.fetch, timeoutMs = 5000) {
  if (typeof fetchImpl !== "function") return null;
  const entity = wikiQuery(query);
  if (entity.length < 2) return null;
  const primary = await bestInLanguage(normLang(lang), entity, fetchImpl, timeoutMs);
  if (primary) return primary;
  if (normLang(lang) === "en") return null;
  const english = await bestInLanguage("en", entity, fetchImpl, timeoutMs);
  if (!english) return null;
  return { ...english, fallbackLang: "en" };
}
