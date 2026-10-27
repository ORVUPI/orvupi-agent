/** ORVUPI AI en español: combinación de extracción determinista y modelo.
 *  1) Se eligen del propio texto las frases más representativas (TextRank) o las que responden a la pregunta.
 *  2) El modelo solo reformula esas frases, con instrucciones y ejemplos en español.
 *  3) Cada resultado se comprueba contra el original (palabras inventadas, términos clave, idioma); lo que no se
 *     apoya en el texto se sustituye por la frase original. Así el contenido es fiel aunque el modelo sea pequeño. */
import type { ChatMessage } from "./engine";
import { checkFaithful, contentWords, faithfulSentences, fold, extractSentences, keyTerms, looksSpanish, relevantSentences, splitSentences, stem, tidySentence, type Sentence } from "./extractive";
import { isDegenerate } from "./clean";

/** Genera con el modelo; devuelve null si la salida era basura o falló. */
export type Generate = (messages: ChatMessage[], maxTokens: number) => Promise<string | null>;
export type HybridResult = { markdown: string; fromModel: number; fromText: number; mode: "model" | "mixed" | "extractive" };

const SYSTEM = "Trabajas dentro del navegador, con un modelo de terceros. Escribes siempre en español correcto y claro. Usas solo la información que te dan, sin inventar nada. No digas que eres Arqiven-N.";

function numbered(sentences: string[]): string {
  return sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

/** Cuántas frases según la longitud del texto. */
export function summaryCount(length: number): number {
  if (length < 1500) return 3;
  if (length < 4000) return 4;
  if (length < 12000) return 5;
  return length < 30000 ? 6 : 7;
}

export function polishMessages(sentences: string[]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Frases de un texto:\n${numbered([
      "El ciclo del agua es el proceso continuo por el que el agua circula entre la superficie terrestre y la atmósfera, cambiando de estado.",
      "Por otra parte, el calor del sol evapora el agua de mares, ríos y lagos, que asciende a la atmósfera en forma de vapor.",
      "Al enfriarse, el vapor se condensa en pequeñas gotas que forman las nubes y después cae como lluvia o nieve.",
    ])}\n\nReescribe cada frase como una viñeta corta y clara (empieza por «- »). Una viñeta por frase, en el mismo orden. Conserva los datos, nombres y cifras; no añadas nada.` },
    { role: "assistant", content: "- El ciclo del agua es la circulación continua del agua entre la superficie terrestre y la atmósfera.\n- El calor del sol evapora el agua de mares, ríos y lagos, que sube como vapor.\n- El vapor se enfría, se condensa en nubes y cae como lluvia o nieve." },
    { role: "user", content: `Frases de un texto:\n${numbered(sentences)}\n\nReescribe cada frase como una viñeta corta y clara (empieza por «- »). Una viñeta por frase, en el mismo orden. Conserva los datos, nombres y cifras; no añadas nada.` },
  ];
}

export function bulletsOf(output: string): string[] {
  return output
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
}

function overlap(a: string, b: string): number {
  const A = contentWords(a).map(stem);
  const B = new Set(contentWords(b).map(stem));
  return A.length ? A.filter((w) => B.has(w)).length / A.length : 0;
}

const NEGATION = /\b(no|nunca|jamás|ni|sin|tampoco|ningún|ninguna|ninguno|nada)\b/i;

function numbersOf(text: string): string[] {
  return (text.match(/\d+(?:[.,\s]\d{3})*(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/[.,\s]/g, ""));
}

/** ¿La viñeta dice lo mismo que su frase? Casi sin palabras nuevas, las mismas cifras, la misma negación y
 *  conservando buena parte de su contenido. */
export function bulletMatches(bullet: string, sentence: string): boolean {
  if (bullet.length < 20 || bullet.length > Math.max(320, sentence.length * 1.2) || isDegenerate(bullet)) return false;
  const b = contentWords(bullet).map(stem);
  const sset = new Set(contentWords(sentence).map(stem));
  if (b.length < 3) return false;
  const novel = b.filter((w) => !sset.has(w)).length / b.length;
  const recall = [...sset].filter((w) => b.includes(w)).length / Math.max(1, sset.size);
  if (novel > 0.15 || b.length - b.filter((w) => sset.has(w)).length > 3 || recall < 0.45) return false;
  const sn = new Set(numbersOf(sentence));
  if (numbersOf(bullet).some((n) => !sn.has(n))) return false;
  if (NEGATION.test(bullet) !== NEGATION.test(sentence)) return false;
  return checkFaithful(bullet, sentence, { maxNovel: 0.25, minCoverage: 0 }).spanish;
}

/** Quita etiquetas que añade el modelo al principio («Dignidad y participación: …», «No: …»). */
function dropLabel(bullet: string): string {
  const m = bullet.match(/^([^:.]{1,40}):\s+(.+)$/);
  return m && m[1]!.split(/\s+/).length <= 5 ? m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1) : bullet;
}

/** Une la redacción del modelo con las frases elegidas: cada viñeta debe corresponder a una frase y no inventar. */
export function mergeBullets(output: string | null, chosen: string[], source: string): { bullets: string[]; fromModel: number } {
  void source;
  const candidates = output && !isDegenerate(output) ? bulletsOf(output).map(dropLabel) : [];
  const used = new Set<number>();
  let fromModel = 0;
  const bullets = chosen.map((sentence, i) => {
    let best = -1;
    let bestScore = 0;
    candidates.forEach((c, j) => {
      if (used.has(j)) return;
      const score = overlap(c, sentence) + (j === i ? 0.1 : 0);
      if (score > bestScore) { bestScore = score; best = j; }
    });
    const c = best >= 0 ? candidates[best]! : "";
    if (c && bulletMatches(c, sentence)) { used.add(best); fromModel += 1; return c.replace(/\s+/g, " "); }
    return tidySentence(sentence);
  });
  return { bullets, fromModel };
}

function mode(fromModel: number, total: number): HybridResult["mode"] {
  return fromModel === 0 ? "extractive" : fromModel === total ? "model" : "mixed";
}

export async function hybridSummary(text: string, generate: Generate, onStep?: (n: number, total: number) => void): Promise<HybridResult> {
  const chosen = extractSentences(text, summaryCount(text.length)).map((s) => tidySentence(s.text, 400));
  const batches: string[][] = [];
  for (let i = 0; i < chosen.length; i += 4) batches.push(chosen.slice(i, i + 4));
  const bullets: string[] = [];
  let fromModel = 0;
  for (let b = 0; b < batches.length; b += 1) {
    onStep?.(b + 1, batches.length);
    const out = await generate(polishMessages(batches[b]!), 70 * batches[b]!.length + 40);
    const merged = mergeBullets(out, batches[b]!, text);
    bullets.push(...merged.bullets);
    fromModel += merged.fromModel;
  }
  const terms = keyTerms(text, 6);
  const markdown = `## Ideas principales\n${bullets.map((b) => `- ${b}`).join("\n")}${terms.length >= 3 ? `\n\n## Términos clave\n${terms.join(", ")}.` : ""}`;
  return { markdown, fromModel, fromText: bullets.length - fromModel, mode: mode(fromModel, bullets.length) };
}

export function explainMessages(sentences: string[], terms: string[]): ChatMessage[] {
  // Sin ejemplo: los modelos pequeños copiaban el tema del ejemplo en lugar del texto
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Ideas principales de un texto:\n${numbered(sentences)}\n\nTérminos importantes: ${terms.join(", ")}.\n\nExplica de qué trata este texto con palabras sencillas, como a alguien que no conoce el tema: un párrafo corto de 2 o 3 frases. Usa solo estas ideas y estos términos.` },
  ];
}

export async function hybridExplain(text: string, generate: Generate): Promise<HybridResult> {
  const chosen = extractSentences(text, Math.min(5, summaryCount(text.length))).map((s) => tidySentence(s.text, 300));
  const terms = keyTerms(text, 6);
  const out = await generate(explainMessages(chosen, terms), 260);
  // Solo se aceptan las frases del modelo que se apoyan en el texto; si descarta la mayoría, no se usa
  const { kept, share } = out && !isDegenerate(out) ? faithfulSentences(out, text, { maxNovel: 0.3, minSupport: 0.4, support: chosen }) : { kept: [], share: 0 };
  const keys = `**Ideas clave del texto:**\n${chosen.slice(0, 3).map((s) => `- ${s}`).join("\n")}${terms.length >= 3 ? `\n\n**Conceptos:** ${terms.join(", ")}.` : ""}`;
  if (kept.length >= 1 && share >= 0.6) return { markdown: `${kept.join(" ")}\n\n${keys}`, fromModel: 1, fromText: 0, mode: "model" };
  return { markdown: `**En pocas palabras:** ${chosen[0] ?? ""}\n\n${keys}`, fromModel: 0, fromText: 1, mode: "extractive" };
}

export function askMessages(sentences: string[], question: string): ChatMessage[] {
  return [
    { role: "system", content: `${SYSTEM} Contesta solo con lo que dicen los fragmentos; si no lo dicen, responde «El texto no lo dice».` },
    { role: "user", content: `Fragmentos del texto:\n${numbered(sentences)}\n\nPregunta: ${question}\n\nResponde en 1 a 3 frases.` },
  ];
}

export async function hybridAsk(text: string, question: string, generate: Generate): Promise<HybridResult & { answer: string }> {
  const { sentences, best } = relevantSentences(text, question, 4);
  if (best === 0 || sentences.length === 0) {
    const answer = "El texto no parece tratar eso: no encuentro ningún pasaje relacionado con la pregunta.";
    return { markdown: answer, answer, fromModel: 0, fromText: 1, mode: "extractive" };
  }
  const frags = sentences.map((s) => tidySentence(s.text, 400));
  const out = (await generate(askMessages(frags, question), 200))?.trim() ?? "";
  const quotes = `**Lo que dice el texto:**\n${frags.map((s) => `- «${s}»`).join("\n")}`;
  if (/^el texto no lo dice/i.test(out)) return { markdown: `El texto no lo dice.\n\n${quotes}`, answer: "El texto no lo dice.", fromModel: 1, fromText: 0, mode: "model" };
  const { kept, share } = out && !isDegenerate(out) ? faithfulSentences(out, `${text}\n${question}`, { maxNovel: 0.25, minSupport: 0.5, support: frags.map((f) => `${f} ${question}`) }) : { kept: [], share: 0 };
  if (kept.length >= 1 && share >= 0.6) {
    const answer = kept.join(" ");
    return { markdown: `${answer}\n\n${quotes}`, answer, fromModel: 1, fromText: 0, mode: "model" };
  }
  return { markdown: quotes, answer: quotes, fromModel: 0, fromText: 1, mode: "extractive" };
}

type Section = { title: string; sentences: Sentence[] };

/** Secciones del texto: por sus títulos si los tiene; si no, por bloques de párrafos consecutivos. */
export function sectionsOf(text: string): Section[] {
  const all = splitSentences(text);
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const s of all) {
    if (s.heading) { current = { title: s.text, sentences: [] }; sections.push(current); continue; }
    if (!current) { current = { title: "", sentences: [] }; sections.push(current); }
    current.sentences.push(s);
  }
  const real = sections.filter((s) => s.sentences.length > 0);
  if (real.filter((s) => s.title).length >= 2) return real.slice(0, 8);
  const body = all.filter((s) => !s.heading);
  const paras = [...new Set(body.map((s) => s.para))];
  const groups = Math.max(1, Math.min(5, paras.length, Math.ceil(body.length / 4)));
  const out: Section[] = [];
  for (let g = 0; g < groups; g += 1) {
    const ps = new Set(paras.slice(Math.floor((g * paras.length) / groups), Math.floor(((g + 1) * paras.length) / groups)));
    out.push({ title: "", sentences: body.filter((s) => ps.has(s.para)) });
  }
  return out.filter((s) => s.sentences.length > 0);
}

export function titleMessages(groups: string[][]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Ideas de las partes de un texto:\nParte 1: El ciclo del agua es la circulación continua del agua entre la superficie y la atmósfera.\nParte 2: El calor del sol evapora el agua de mares y ríos. El vapor se condensa y forma nubes.\n\nEscribe un título breve (de 2 a 6 palabras) para cada parte, uno por línea, con el formato «Parte N: título».` },
    { role: "assistant", content: "Parte 1: Qué es el ciclo del agua\nParte 2: Evaporación y formación de nubes" },
    { role: "user", content: `Ideas de las partes de un texto:\n${groups.map((g, i) => `Parte ${i + 1}: ${g.join(" ")}`).join("\n")}\n\nEscribe un título breve (de 2 a 6 palabras) para cada parte, uno por línea, con el formato «Parte N: título».` },
  ];
}

/** Un título vale si sus palabras con contenido están, en su mayoría, en esa parte del texto. */
export function titleOk(title: string, sectionText: string): boolean {
  const cw = contentWords(title).map(stem);
  if (cw.length === 0 || cw.length > 8) return false;
  const src = new Set(contentWords(sectionText).map(stem));
  return cw.filter((w) => src.has(w)).length / cw.length >= 0.5;
}

/** Título de reserva, sacado del propio texto: el comienzo de la frase principal de esa parte. */
export function fallbackTitle(sentences: string[]): string {
  const first = (sentences[0] ?? "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").split(/[,;:(—–]/)[0]!.trim();
  const list = first.split(/\s+/).slice(0, 7);
  while (list.length > 2 && STOPWORD_END.test(list.at(-1)!)) list.pop();
  const t = list.join(" ").replace(/[.…]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const STOPWORD_END = /^(el|la|los|las|de|del|en|y|o|a|al|un|una|que|con|por|para|se|su|sus|es|son|lo|como|e|u)$/i;

export async function hybridOutline(text: string, generate: Generate): Promise<HybridResult> {
  const sections = sectionsOf(text);
  const points = sections.map((sec) => {
    const joined = sec.sentences.map((s) => s.text).join("\n");
    const n = Math.min(3, Math.max(1, Math.round(sec.sentences.length / 3)));
    return extractSentences(joined, n).map((s) => tidySentence(s.text, 160));
  });
  let titles = sections.map((s) => s.title);
  let fromModel = 0;
  const missing = titles.some((t) => !t);
  if (missing) {
    const out = (await generate(titleMessages(points.map((p) => p.slice(0, 2))), 30 * points.length + 20)) ?? "";
    const lines = out.split(/\n+/).map((l) => l.replace(/\*\*/g, "").match(/^\s*(?:[-*]\s*)?(?:Parte|Título)\s*(\d+)\s*[:.-]\s*(.+)$/i)).filter(Boolean) as RegExpMatchArray[];
    titles = titles.map((t, i) => {
      if (t) return t;
      const line = lines.find((m) => Number(m[1]) === i + 1)?.[2]?.replace(/[«»"*]/g, "").trim() ?? "";
      const ok = line.length >= 3 && line.length <= 70 && titleOk(line, sections[i]!.sentences.map((x) => x.text).join(" "));
      if (ok) { fromModel += 1; return line; }
      return fallbackTitle(points[i]!);
    });
  }
  const markdown = sections
    .map((_, i) => `## ${i + 1}. ${titles[i]}\n${points[i]!.map((p, j) => `### ${i + 1}.${j + 1}. ${p}`).join("\n")}`)
    .join("\n\n");
  return { markdown, fromModel, fromText: sections.length - fromModel, mode: mode(fromModel, sections.length) };
}

/** Partes para reescribir o traducir: párrafos agrupados hasta `size` caracteres (los modelos pequeños rinden mejor
 *  con trozos cortos). */
export function paragraphChunks(text: string, size = 1400): string[] {
  const paras = text.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length > size) { out.push(cur); cur = ""; }
    if (p.length > size) {
      const sentences = splitSentences(p).map((s) => s.text);
      for (const s of sentences) {
        if (cur && cur.length + s.length > size) { out.push(cur); cur = ""; }
        cur = cur ? `${cur} ${s}` : s;
      }
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

/** ¿La reescritura conserva el contenido? (mismos términos, sin inventar y con longitud parecida) */
export function rewriteOk(output: string, input: string): boolean {
  if (!output || isDegenerate(output)) return false;
  const ratio = output.length / Math.max(1, input.length);
  if (ratio < 0.5 || ratio > 1.8) return false;
  return overlap(input, output) >= 0.55 && checkFaithful(output, input, { maxNovel: 0.3, minCoverage: 0 }).ok;
}

/** ¿La traducción lo es? (no degenerada, no sigue en español si el destino no es español, longitud parecida) */
export function translationOk(output: string, input: string, toSpanish: boolean): boolean {
  if (!output || isDegenerate(output)) return false;
  const ratio = output.length / Math.max(1, input.length);
  if (ratio < 0.45 || ratio > 2.2) return false;
  return toSpanish ? looksSpanish(output) : !looksSpanish(output);
}

export function rewriteMessages(text: string): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Reescribe este texto para que sea más claro y fluido, con el mismo significado y los mismos datos. No añadas información ni comentarios. Devuelve solo el texto reescrito.\n\nTexto:\n${text}` },
  ];
}

// ——— Generar preguntas ———

export function questionMessages(sentences: string[]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Frases de un texto:\n${numbered(["El ciclo del agua es la circulación continua del agua entre la superficie terrestre y la atmósfera.", "El calor del sol evapora el agua de mares, ríos y lagos."])}\n\nEscribe una pregunta de estudio por frase, cuya respuesta sea esa frase. Una por línea, en el mismo orden, empezando por «¿» y terminando en «?».` },
    { role: "assistant", content: "1. ¿Qué es el ciclo del agua?\n2. ¿Qué hace el calor del sol con el agua de mares, ríos y lagos?" },
    { role: "user", content: `Frases de un texto:\n${numbered(sentences)}\n\nEscribe una pregunta de estudio por frase, cuya respuesta sea esa frase. Una por línea, en el mismo orden, empezando por «¿» y terminando en «?».` },
  ];
}

/** Pregunta de reserva, construida a partir de la propia frase. */
export function fallbackQuestion(sentence: string, terms: string[]): string {
  const def = sentence.match(/^(?:(?:El|La|Los|Las|Un|Una)\s+)?([^,;:]{3,60}?)\s+(?:es|son|consiste en|se define como)\s/i);
  if (def && contentWords(def[1]!).length >= 1 && contentWords(def[1]!).length <= 5) return `¿Qué ${/ son\s/i.test(sentence.slice(0, def[0].length + 1)) ? "son" : "es"} ${def[0].replace(/\s+(es|son|consiste en|se define como)\s$/i, "").replace(/^(El|La|Los|Las|Un|Una)\s/i, (m) => m.toLowerCase())}?`;
  const year = sentence.match(/\b(1[5-9]\d\d|20\d\d)\b/);
  if (year) return `¿Qué ocurrió en ${year[1]} según el texto?`;
  const term = terms.find((t) => new Set(contentWords(sentence).map(stem)).has(stem(t))) ?? contentWords(sentence).sort((a, b) => b.length - a.length)[0] ?? "este punto";
  return `¿Qué dice el texto sobre «${term}»?`;
}

export async function hybridQuestions(text: string, generate: Generate): Promise<HybridResult> {
  const chosen = extractSentences(text, Math.min(6, summaryCount(text.length) + 1)).map((s) => tidySentence(s.text, 300));
  const terms = keyTerms(text, 12);
  const out = (await generate(questionMessages(chosen), 40 * chosen.length + 30)) ?? "";
  const lines = out.split(/\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").replace(/\*\*/g, "").trim()).filter((l) => l.endsWith("?"));
  let fromModel = 0;
  const items = chosen.map((sentence, i) => {
    const q = lines[i] ? (lines[i]!.startsWith("¿") ? lines[i]! : `¿${lines[i]!}`) : "";
    const cw = contentWords(q).map(stem);
    const sset = new Set(contentWords(sentence).map(stem));
    const ok = q.length >= 8 && q.length <= 160 && cw.length >= 1 && cw.filter((w) => sset.has(w)).length / cw.length >= 0.5 && !isDegenerate(q) && checkFaithful(q, sentence, { maxNovel: 1, minCoverage: 0 }).spanish;
    if (ok) fromModel += 1;
    return `${i + 1}. **${ok ? q : fallbackQuestion(sentence, terms)}** *Respuesta:* ${sentence}`;
  });
  return { markdown: items.join("\n"), fromModel, fromText: chosen.length - fromModel, mode: mode(fromModel, chosen.length) };
}

// ——— Analizar (calculado del propio texto) ———

function syllables(word: string): number {
  return Math.max(1, (word.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").match(/[aeiouy]+/g) ?? []).length);
}

export function analyzeText(text: string): { words: number; sentences: number; paragraphs: number; minutes: number; avgSentence: number; readability: number; level: string } {
  const all = splitSentences(text).filter((s) => !s.heading);
  const w = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const sylls = w.reduce((n, x) => n + syllables(x), 0);
  const sentences = Math.max(1, all.length);
  // Índice de Fernández Huerta (legibilidad en español): 206,84 − 0,60·sílabas/100 palabras − 1,02·palabras/frase
  const readability = Math.round(206.84 - 0.6 * (sylls / Math.max(1, w.length)) * 100 - 1.02 * (w.length / sentences));
  const level = readability >= 80 ? "fácil" : readability >= 60 ? "normal" : readability >= 40 ? "algo difícil" : "difícil (técnico)";
  return { words: w.length, sentences, paragraphs: text.split(/\n\s*\n|\n/).filter((p) => p.trim()).length, minutes: Math.max(1, Math.round(w.length / 200)), avgSentence: Math.round(w.length / sentences), readability, level };
}

export async function hybridAnalyze(text: string): Promise<HybridResult> {
  const a = analyzeText(text);
  const terms = keyTerms(text, 8);
  const main = extractSentences(text, 3).map((s) => tidySentence(s.text, 220));
  const sections = sectionsOf(text);
  const long = splitSentences(text).filter((s) => !s.heading && (s.text.match(/[\p{L}\p{N}]+/gu) ?? []).length > 40);
  const lang = looksSpanish(text) ? "español" : "otro idioma (no parece español)";
  const md = [
    "## Datos del texto",
    "| Medida | Valor |",
    "|---|---|",
    `| Palabras | ${a.words} |`,
    `| Frases | ${a.sentences} |`,
    `| Párrafos | ${a.paragraphs} |`,
    `| Lectura | unos ${a.minutes} min |`,
    `| Palabras por frase | ${a.avgSentence} |`,
    `| Legibilidad (Fernández Huerta) | ${a.readability} · ${a.level} |`,
    `| Idioma | ${lang} |`,
    "",
    "## Tema principal",
    main[0] ?? "",
    "",
    "## Ideas principales",
    ...main.map((s) => `- ${s}`),
    "",
    "## Términos clave",
    terms.join(", ") + ".",
    "",
    "## Estructura",
    ...(sections.some((s) => s.title) ? sections.map((s, i) => `${i + 1}. ${s.title || fallbackTitle(s.sentences.map((x) => x.text))}`) : [`El texto no tiene títulos: ${a.paragraphs} párrafos seguidos.`]),
    "",
    "## Sugerencias",
    long.length ? `- Hay ${long.length} frase${long.length > 1 ? "s" : ""} de más de 40 palabras: dividirlas facilitaría la lectura.` : "- Las frases tienen una longitud cómoda.",
    a.readability < 50 ? "- El texto es técnico: una explicación o un resumen ayudarán a quien no conozca el tema." : "- La dificultad del texto es adecuada para un público general.",
    !sections.some((s) => s.title) && a.words > 600 ? "- Es largo y no tiene títulos: un esquema ayudaría a organizarlo." : "",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
  return { markdown: md.trim(), fromModel: 0, fromText: 1, mode: "extractive" };
}

// ——— Generar contenido ———

export function generateMessages(instruction: string, ideas: string[], terms: string[]): ChatMessage[] {
  const base = ideas.length ? `\n\nBasa el contenido en estas ideas del documento (sin inventar datos ni cifras):\n${numbered(ideas)}\n\nTérminos: ${terms.join(", ")}.` : "";
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `${instruction.trim()}${base}\n\nEscribe en español, con frases completas. Usa títulos con «## » y listas con «- » si ayudan. Sin comentarios sobre lo que haces.` },
  ];
}

/** Contenido nuevo pedido por el usuario. Se valida que no sea basura, ni repetitivo, ni incompleto; si se basa en
 *  un documento, se quitan las frases con cifras que no están en él. */
export async function hybridGenerate(instruction: string, text: string, generate: Generate): Promise<HybridResult> {
  const ideas = text ? extractSentences(text, 5).map((s) => tidySentence(s.text, 260)) : [];
  const terms = text ? keyTerms(text, 8) : [];
  const out = (await generate(generateMessages(instruction, ideas, terms), 420)) ?? "";
  if (!out || isDegenerate(out)) throw new Error("no-valid-output");
  const srcNumbers = new Set((text.match(/\d+/g) ?? []));
  const seen = new Set<string>();
  const lines = out.split("\n").filter((line) => {
    const key = fold(line.trim()).replace(/\s+/g, " ");
    if (key.length > 20 && seen.has(key)) return false;
    seen.add(key);
    if (text && (line.match(/\d+/g) ?? []).some((n) => n.length > 1 && !srcNumbers.has(n))) return false;
    return true;
  });
  let md = lines.join("\n").trim();
  // Quita la última frase si quedó a medias (se acabó el límite de longitud)
  if (!/[.!?…:»")\]|]$/.test(md)) md = md.replace(/[^.!?…\n]*$/, "").trim();
  if (md.length < 40) throw new Error("no-valid-output");
  return { markdown: md, fromModel: 1, fromText: 0, mode: "model" };
}

// ——— Peticiones en lenguaje natural («Resume este documento y créame un DOCX») ———

export type Intent = { action: "summarize" | "explain" | "outline" | "rewrite" | "translate" | "questions" | "analyze" | "generate" | "ask"; language?: string; export?: "docx" | "pdf" };

export function parseRequest(request: string): Intent {
  const r = fold(request);
  const exp: Intent["export"] = /\b(docx|word)\b/.test(r) ? "docx" : /\bpdf\b/.test(r) ? "pdf" : undefined;
  const lang = r.match(/\btradu\w*\s+(?:(?:este|el)\s+(?:documento|texto)\s+)?(?:al|a)\s+(ingles|espanol|frances|aleman|italiano|portugues|catalan|chino|arabe)/);
  const LANG: Record<string, string> = { ingles: "inglés", espanol: "español", frances: "francés", aleman: "alemán", italiano: "italiano", portugues: "portugués", catalan: "catalán", chino: "chino", arabe: "árabe" };
  let action: Intent["action"] = "ask";
  if (/\btradu/.test(r)) action = "translate";
  else if (/\bresum|\bresumen|\bsintetiz/.test(r)) action = "summarize";
  else if (/\besquema|\bindice\b|\bestructura en apartados/.test(r)) action = "outline";
  else if (/\bpreguntas\b|\bcuestionario|\btipo test|\bexamen/.test(r)) action = "questions";
  else if (/\banaliz|\banalisis|\blegibilidad|\bestadistic/.test(r)) action = "analyze";
  else if (/\bexplic/.test(r)) action = "explain";
  else if (/\breescrib|\bmejora (la )?redaccion|\bcorrige|\breformula/.test(r)) action = "rewrite";
  else if (/^(escribe|redacta|genera|crea|elabora|haz|hazme|creame|escribeme|redactame)\b/.test(r.trim()) && !/^(crea|creame|haz|hazme)\s+(un|el)\s+(docx|word|pdf)\b/.test(r.trim())) action = "generate";
  else if (exp && /\b(este|el) (documento|texto)\b/.test(r)) action = "summarize";
  return { action, language: lang ? LANG[lang[1]!] : undefined, export: exp };
}
