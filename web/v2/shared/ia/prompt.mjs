/** Prompt corto para el modelo. No llama a la red. */

import { looksLikeOrvupi } from "./retrieve.mjs";

const NAMES = { es: "español", en: "English", "pt-BR": "português", pt: "português", ja: "日本語", ko: "한국어" };

export function languageName(code) {
  return NAMES[code] || NAMES[code === "pt" ? "pt-BR" : ""] || "español";
}

/** El idioma de la pregunta manda, aunque la página esté en otro. */
export function replyLanguage(question, pageLang = "es") {
  const text = String(question || "");
  const page = pageLang === "pt" ? "pt-BR" : (pageLang || "es");
  if (/[\p{Script=Hangul}]/u.test(text)) return "ko";
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return "ja";
  const english = /\b(what|who|how|why|when|where|which|give me|please|does|isn't|don't|can't|tips?)\b/i.test(text)
    && !/[¿¡ñáéíóúãõç]/i.test(text);
  if (english) return "en";
  if (/[¿¡ñ]/i.test(text) || /\b(dame|consejos?|entrevista|qu[eé] es|c[oó]mo se|por qu[eé]|d[oó]nde|cu[aá]nto)\b/i.test(text)) return "es";
  if (/\b(n[aã]o|voc[eê]|o que|obrigad)\b/i.test(text) || /[ãõç]/i.test(text)) return "pt-BR";
  return page;
}

export function wantsDetail(question) {
  return /\b(m[aá]s detalle|con detalle|en detalle|explica con pasos|paso a paso|desarrolla|en profundidad|escribe un correo|write (?:me )?an email|more detail|step by step|in more detail)\b/i.test(String(question || ""));
}

export function wantsList(question) {
  const text = String(question || "");
  if (/\b(lista|viñetas|bullets)\b/i.test(text)) return true;
  return /\b(\d+|tres|three|tr[eê]s)\b[^\n]{0,48}\b(consejos?|ventajas?|ideas?|puntos?|tips?|razones?|ejemplos?|examples?|points?)\b/i.test(text);
}

export function compactSources(sources, options = {}) {
  const maxSources = options.maxSources || 2;
  const maxChars = options.maxChars || 160;
  return (Array.isArray(sources) ? sources : []).flatMap((source) => {
    const excerpt = String(source?.excerpt || source?.text || "").replace(/\s+/g, " ").trim();
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

/** Hasta tres frases cortas. La primera de cada fuente va antes que la segunda, y se deja fuera la auditoría larga. */
export function sourceFragments(sources, options = {}) {
  const maxSources = options.maxSources || 3;
  const maxChars = options.maxChars || 180;
  const rows = [];
  (Array.isArray(sources) ? sources : []).forEach((source) => {
    const raw = String(source?.excerpt || source?.text || "").replace(/\s+/g, " ").trim();
    const parts = raw.split(/(?<=[.。！？])\s+/).map((part) => part.trim()).filter((part) => part.length >= 20);
    const pool = parts.length ? parts : (raw ? [raw] : []);
    pool.forEach((part, partIndex) => {
      if (/fecha:\s*\d|comparaci[oó]n del|^\s*matriz\b|no debe entrar/i.test(part)) return;
      if (/^auditor[ií]a de orvupi|^qa de orvupi/i.test(part)) return;
      if (/saltar al contenido|skip to content|pular para o conteúdo/i.test(part)) return;
      let cut = part.slice(0, maxChars);
      const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
      if (cut.length === maxChars && end >= 40) cut = cut.slice(0, end + 1);
      rows.push({
        title: String(source?.title || source?.url || "fuente").slice(0, 80),
        url: String(source?.url || "").slice(0, 120),
        excerpt: cut.trim(),
        part: partIndex,
      });
    });
  });
  const firstTitle = rows[0]?.title;
  const fromFirst = rows.filter((row) => row.title === firstTitle);
  const ordered = fromFirst.length >= 2 ? fromFirst : rows;
  const kept = [];
  for (const row of ordered) {
    const key = row.excerpt.toLowerCase();
    if (!key) continue;
    if (kept.some((prev) => prev.excerpt.toLowerCase() === key || prev.excerpt.includes(row.excerpt) || row.excerpt.includes(prev.excerpt))) continue;
    kept.push(row);
    if (kept.length >= maxSources) return kept;
  }
  return kept;
}

export function lastUserText(messages) {
  const users = (Array.isArray(messages) ? messages : []).filter((item) => item?.role === "user");
  return String(users.at(-1)?.content || "");
}

export function sourcedTurn(question, sources) {
  return Boolean(sourceFragments(sources).length) && looksLikeOrvupi(question);
}

export function sourcedSystem(language) {
  return `Responde en ${language} con dos o tres frases completas. Copia los datos de Fuentes sin cambiarlos: si hay un subtítulo, déjalo entre comillas. No inventes pagos, contratos ni blockchain. Cita el título entre corchetes. No digas que eres Arqiven-N.`;
}

export function sourceNote(sources) {
  const compact = sourceFragments(sources);
  if (!compact.length) return "";
  return `\n\nFuentes:\n${compact.map((source) => `[${source.title}] ${source.excerpt}`).join("\n")}`;
}

/** El dato ya está en el mensaje: no hace falta un descargo. */
export function directExtra(question, long = false) {
  const text = String(question || "");
  if (/\b(c[oó]digo|documento|adjunto)\b/i.test(text) || long) {
    return " El dato pedido está en el mensaje. Escríbelo en una frase completa y no digas que falta el adjunto.";
  }
  if (/\d/.test(text) && /\b(cu[aá]nto|cuesta|gasto|queda|devuelven|reais|€)\b/i.test(text)) {
    return " Calcula el resultado final con los números del mensaje y escríbelo en una frase. No digas que falta el historial.";
  }
  return "";
}

/** Tope y forma. El detalle solo si lo piden. El sistema largo de v1 no cambia. */
export function generationPlan(question, sources, profileId = "v1") {
  const sourced = sourcedTurn(question, sources);
  if (profileId === "legacy") return { sourced, detail: false, list: false, maxTokens: sourced ? 72 : 120, extra: "" };
  const detail = !sourced && wantsDetail(question);
  const list = !sourced && !detail && wantsList(question);
  const bare = String(question || "").trim();
  const clarify = !sourced && !detail && !list && bare.length <= 32 && /^(ac[oó]rtalo|ac[oó]rtala|resume|expl[ií]calo|shorten it|make it shorter)[.!?]?$/i.test(bare);
  const maxTokens = sourced ? 45 : detail ? 180 : 45;
  const extra = sourced
    ? ""
    : detail
      ? " Desarrolla la respuesta con los datos del mensaje y termina la última frase."
      : list
        ? " Responde solo con 3 puntos cortos, uno por línea y una frase cada uno. Sin preámbulo ni descargo."
        : clarify
          ? " No hay un texto anterior. Responde solo con una pregunta, sin decir que falta el historial: ¿Qué quieres que acorte?"
          : " Responde en una o dos frases cortas. Si no lo sabes, dilo en la primera frase.";
  return { sourced, detail, list, maxTokens, extra };
}

/** Tope de salida. Un historial largo no lo sube: solo un documento adjunto. */
export function tokenLimit(plan, options = {}) {
  const planned = Number(plan?.maxTokens) > 0 ? Number(plan.maxTokens) : 45;
  if (options.attached && !plan?.list) return Math.max(planned, 280);
  return planned;
}

/** Contexto que entra al modelo. Una pregunta general no arrastra el chat largo. */
export function contextBudget(plan, options = {}) {
  if (options.attached || plan?.detail) return { turns: 12, maxChars: 12000, perMessage: 0, pinFirst: true };
  if (plan?.sourced) return { turns: 4, maxChars: 1400, perMessage: 360, pinFirst: false };
  return { turns: 2, maxChars: 640, perMessage: 200, pinFirst: false };
}

export const REPLY_DEADLINE_MS = 30000;

export function moreDetailOffer(lang) {
  const code = lang === "pt" ? "pt-BR" : (lang || "es");
  const lines = {
    es: "Puedes pedir más detalle.",
    en: "You can ask for more detail.",
    "pt-BR": "Você pode pedir mais detalhes.",
    ja: "もっと詳しく聞けます。",
    ko: "더 자세히 물어볼 수 있습니다.",
  };
  return lines[code] || lines.es;
}

/** Cierra en la última frase completa y ofrece ampliar. */
export function finishOnDeadline(text, lang) {
  const value = String(text || "").replace(/\s+$/g, "").trim();
  const end = Math.max(
    value.lastIndexOf("."),
    value.lastIndexOf("!"),
    value.lastIndexOf("?"),
    value.lastIndexOf("。"),
    value.lastIndexOf("！"),
    value.lastIndexOf("？"),
  );
  const cut = end >= 0 ? value.slice(0, end + 1).trim() : "";
  const offer = moreDetailOffer(lang);
  if (!cut) return offer;
  if (cut.endsWith(offer)) return cut;
  return `${cut} ${offer}`;
}

/** Corta en el último cierre si el tope dejó una frase a medias. */
export function closeClean(text, plan = {}) {
  const value = String(text || "").replace(/\s+$/g, "").trim();
  if (!value) return value;
  if (plan.list) {
    const bullets = value.split("\n").map((line) => line.trim()).filter((line) => /^([-*•]|\d+[.)])\s+\S/.test(line));
    if (bullets.length >= 3) return bullets.slice(0, 3).join("\n");
    if (bullets.length) return bullets.join("\n");
  }
  if (/[.!?。！？)\]»"]$/.test(value)) return value;
  const end = Math.max(value.lastIndexOf("."), value.lastIndexOf("!"), value.lastIndexOf("?"), value.lastIndexOf("。"));
  if (end >= 40) return value.slice(0, end + 1).trim();
  return value;
}
