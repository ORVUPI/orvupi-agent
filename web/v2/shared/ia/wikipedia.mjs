/** Consulta pública y sin clave a la API de Wikipedia, en el idioma de la persona.
 * El navegador pone su propio User-Agent. En Node hay que pasar uno descriptivo.
 */

import { normLang } from "./guard.mjs";

const HOST = { es: "es", en: "en", pt: "pt", ja: "ja", ko: "ko" };

export function wikiHost(lang) {
  return `${HOST[normLang(lang)] || "en"}.wikipedia.org`;
}

export function searchUrl(lang, query) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: String(query || "").slice(0, 180),
    srlimit: "1",
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
  const hit = payload?.query?.search?.[0];
  if (!hit || typeof hit.title !== "string" || !hit.title) return null;
  return { title: hit.title };
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

export async function lookupWikipedia(lang, query, fetchImpl = globalThis.fetch, timeoutMs = 4000) {
  if (typeof fetchImpl !== "function") return null;
  const text = String(query || "").trim();
  if (text.length < 3) return null;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const init = controller ? { signal: controller.signal } : {};
    const found = await fetchImpl(searchUrl(lang, text), init);
    if (!found?.ok) return null;
    const search = parseSearch(await found.json());
    if (!search) return null;
    const page = await fetchImpl(summaryUrl(lang, search.title), init);
    if (!page?.ok) return null;
    const summary = parseSummary(await page.json());
    if (!summary) return null;
    return { ...summary, id: `wiki:${wikiHost(lang)}:${summary.title}` };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
