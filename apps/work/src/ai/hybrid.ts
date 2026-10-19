/** ORVUPI AI en español: combinación de extracción determinista y modelo.
 *  1) Se eligen del propio texto las frases más representativas (TextRank) o las que responden a la pregunta.
 *  2) El modelo solo reformula esas frases, con instrucciones y ejemplos en español.
 *  3) Cada resultado se comprueba contra el original (palabras inventadas, términos clave, idioma); lo que no se
 *     apoya en el texto se sustituye por la frase original. Así el contenido es fiel aunque el modelo sea pequeño. */
import type { ChatMessage } from "./engine";
import { checkFaithful, contentWords, extractSentences, keyTerms, looksSpanish, relevantSentences, splitSentences, stem, tidySentence, type Sentence } from "./extractive";
import { isDegenerate } from "./clean";

/** Genera con el modelo; devuelve null si la salida era basura o falló. */
export type Generate = (messages: ChatMessage[], maxTokens: number) => Promise<string | null>;
export type HybridResult = { markdown: string; fromModel: number; fromText: number; mode: "model" | "mixed" | "extractive" };

const SYSTEM = "Eres ORVUPI AI, un asistente que trabaja dentro del navegador. Escribes siempre en español correcto y claro. Usas solo la información que te dan, sin inventar nada.";

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

/** Une la redacción del modelo con las frases elegidas: cada viñeta debe corresponder a una frase y no inventar. */
export function mergeBullets(output: string | null, chosen: string[], source: string): { bullets: string[]; fromModel: number } {
  const candidates = output && !isDegenerate(output) ? bulletsOf(output) : [];
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
    const check = c ? checkFaithful(c, source, { maxNovel: 0.25, minCoverage: 0 }) : null;
    const fits = c.length >= 20 && c.length <= Math.max(320, sentence.length * 1.2) && overlap(c, sentence) >= 0.5 && check?.ok && !isDegenerate(c);
    if (fits) { used.add(best); fromModel += 1; return c.replace(/\s+/g, " "); }
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
  const markdown = `${bullets.map((b) => `- ${b}`).join("\n")}${terms.length >= 3 ? `\n\n**Términos clave:** ${terms.join(", ")}.` : ""}`;
  return { markdown, fromModel, fromText: bullets.length - fromModel, mode: mode(fromModel, bullets.length) };
}

export function explainMessages(sentences: string[], terms: string[]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Ideas principales de un texto:\n${numbered(["La inflación es el aumento generalizado y sostenido de los precios de bienes y servicios durante un periodo de tiempo.", "Cuando hay inflación, con el mismo dinero se pueden comprar menos cosas."])}\n\nExplica de qué trata el texto con palabras sencillas, como a alguien que no conoce el tema: un párrafo corto de 2 o 3 frases. Usa solo estas ideas.` },
    { role: "assistant", content: "El texto explica qué es la inflación: los precios de las cosas suben de forma general y durante bastante tiempo. Por eso, con el mismo dinero se puede comprar menos." },
    { role: "user", content: `Ideas principales de un texto:\n${numbered(sentences)}\n\nTérminos importantes: ${terms.join(", ")}.\n\nExplica de qué trata el texto con palabras sencillas, como a alguien que no conoce el tema: un párrafo corto de 2 o 3 frases. Usa solo estas ideas.` },
  ];
}

export async function hybridExplain(text: string, generate: Generate): Promise<HybridResult> {
  const chosen = extractSentences(text, Math.min(5, summaryCount(text.length))).map((s) => tidySentence(s.text, 300));
  const terms = keyTerms(text, 6);
  const out = await generate(explainMessages(chosen, terms), 260);
  const para = (out ?? "").replace(/^\s*[-*•]\s+/gm, "").trim();
  const check = para ? checkFaithful(para, text, { maxNovel: 0.4, minCoverage: 0.15 }) : null;
  const keys = `**Ideas clave del texto:**\n${chosen.slice(0, 3).map((s) => `- ${s}`).join("\n")}${terms.length >= 3 ? `\n\n**Conceptos:** ${terms.join(", ")}.` : ""}`;
  if (para && check?.ok && !isDegenerate(para)) return { markdown: `${para}\n\n${keys}`, fromModel: 1, fromText: 0, mode: "model" };
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
  const check = out ? checkFaithful(out, `${text}\n${question}`, { maxNovel: 0.35, minCoverage: 0 }) : null;
  const quotes = `**Lo que dice el texto:**\n${frags.map((s) => `- «${s}»`).join("\n")}`;
  if (out && (check?.ok || /no lo dice/i.test(out)) && !isDegenerate(out)) {
    return { markdown: `${out}\n\n${quotes}`, answer: out, fromModel: 1, fromText: 0, mode: "model" };
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

function fallbackTitle(sentences: string[], source: string): string {
  const terms = keyTerms(sentences.join(" "), 3).filter((t) => keyTerms(source, 30).some((k) => stem(k) === stem(t)));
  const list = (terms.length ? terms : keyTerms(sentences.join(" ") + " " + sentences.join(" "), 3)).slice(0, 3);
  if (list.length === 0) return tidySentence(sentences[0] ?? "", 60);
  const text = list.length > 1 ? `${list.slice(0, -1).join(", ")} y ${list.at(-1)}` : list[0]!;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
    const lines = out.split(/\n+/).map((l) => l.match(/^\s*(?:[-*]\s*)?Parte\s*(\d+)\s*[:.-]\s*(.+)$/i)).filter(Boolean) as RegExpMatchArray[];
    titles = titles.map((t, i) => {
      if (t) return t;
      const line = lines.find((m) => Number(m[1]) === i + 1)?.[2]?.replace(/[«»"*]/g, "").trim() ?? "";
      const ok = line.length >= 3 && line.length <= 70 && !isDegenerate(`${line} ${line}`) && checkFaithful(line, points[i]!.join(" "), { maxNovel: 0.5, minCoverage: 0 }).ok && contentWords(line).length >= 1;
      if (ok) { fromModel += 1; return line; }
      return fallbackTitle(points[i]!, text);
    });
  }
  const markdown = sections
    .map((_, i) => `**${i + 1}. ${titles[i]}**\n${points[i]!.map((p, j) => `- ${i + 1}.${j + 1}. ${p}`).join("\n")}`)
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
