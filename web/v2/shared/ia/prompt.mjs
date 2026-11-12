/** Prompt corto para el modelo. No llama a la red. */

import { looksLikeOrvupi } from "./retrieve.mjs";

export function compactSources(sources, options = {}) {
  const maxSources = options.maxSources || 2;
  const maxChars = options.maxChars || 160;
  return (Array.isArray(sources) ? sources : []).flatMap((source) => {
    const excerpt = String(source?.excerpt || "").replace(/\s+/g, " ").trim();
    if (!excerpt) return [];
    let cut = excerpt.slice(0, maxChars);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
    if (end >= 40) cut = cut.slice(0, end + 1);
    return [{
      title: String(source.title || source.url || "fuente").slice(0, 80),
      url: String(source.url || "").slice(0, 120),
      excerpt: cut,
    }];
  }).slice(0, maxSources);
}

export function lastUserText(messages) {
  const users = (Array.isArray(messages) ? messages : []).filter((item) => item?.role === "user");
  return String(users.at(-1)?.content || "");
}

const SOURCED = { maxSources: 1, maxChars: 160 };

/** Pregunta de ORVUPI con un fragmento corto: sistema breve y dos o tres frases. */
export function sourcedTurn(question, sources) {
  const compact = compactSources(sources, SOURCED);
  return Boolean(compact.length) && looksLikeOrvupi(question);
}

export function sourcedSystem(language) {
  return `Responde en ${language} en dos o tres frases. Usa solo el texto de Fuentes, cita el título entre corchetes y no añadas datos que no estén ahí. No digas que eres Arqiven-N.`;
}

export function sourceNote(sources) {
  const compact = compactSources(sources, SOURCED);
  if (!compact.length) return "";
  return `\n\nFuentes:\n${compact.map((source) => `[${source.title}] ${source.excerpt}`).join("\n")}`;
}
