/** ORVUPI AI: resumen extractivo determinista (TextRank) en español y comprobación de fidelidad.
 *  Elige las frases más representativas del propio texto, de modo que el contenido sea fiel y coherente aunque el
 *  modelo del dispositivo sea pequeño; el modelo solo pule la redacción, y si lo que escribe no se apoya en el texto
 *  original se usa la versión extractiva. Todo ocurre en el navegador. */

const STOP = new Set(
  ("a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquellas aquellos aqui asi aun aunque bajo bien cada casi " +
    "como con contra cual cuales cualquier cuando cuanto de del desde donde dos durante e el ella ellas ello ellos en entre era eran " +
    "eres es esa esas ese eso esos esta estaba estaban estado estan estar este esto estos estas fue fueron fuera gran ha haber habia " +
    "habian han has hasta hay he la las le les lo los mas me mi mientras mismo misma mismos mismas mucho muchos muy nada ni no nos " +
    "nosotros o os otra otras otro otros para pero poco por porque pues que quien quienes se sea sean segun ser si sido siempre sin " +
    "sino sobre solo son su sus tal tambien tan tanto te tiene tienen toda todas todo todos tras tu tus u un una unas uno unos ya yo " +
    "puede pueden debe deben hace hacen dicho dicha dichos dichas cuya cuyo cuyas cuyos asimismo ademas dentro fin forma vez veces parte " +
    "manera modo caso casos cual tener sera seran seria podra podran mediante traves tanto etc respecto embargo cierto otros esto mismo").split(" "),
);

const EN_STOP = new Set("the and of to is in that it for with as are this be on by or from an was which at have not they their".split(" "));
const ES_FUNC = new Set("el la los las de del que y en un una es por con para se su al lo como mas pero sus le ya o este esta son".split(" "));

const ABBR = new Set("art arts sr sra srs dr dra ud uds núm num pág pag etc ej p pp vol cap fig aprox apdo av ee uu ss cf vid tel".split(" "));

export function fold(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Raíz sencilla para comparar palabras del mismo significado (plural, género, acentos). */
export function stem(word: string): string {
  let w = fold(word);
  if (w.length > 4) w = w.replace(/(es|s)$/, "");
  if (w.length > 5) w = w.replace(/(a|o|e)$/, "");
  return w.slice(0, 7);
}

export function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
}

/** Palabras con contenido (sin artículos, preposiciones…). */
export function contentWords(text: string): string[] {
  return words(text).filter((w) => w.length > 2 && !STOP.has(fold(w)) && !/^\d+$/.test(w));
}

export type Sentence = { text: string; index: number; para: number; heading: boolean };

/** Divide en frases sin cortar abreviaturas («art.», «Sr.», «EE. UU.») ni números («1.500»). */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const paras = text.replace(/\r/g, "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  paras.forEach((para, pi) => {
    const line = para.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "").trim();
    if (!line) return;
    const isHeading = /^#{1,6}\s/.test(para) || (line.length < 80 && !/[.!?:;,…]$/.test(line) && words(line).length <= 10);
    if (isHeading) { out.push({ text: line, index: out.length, para: pi, heading: true }); return; }
    let start = 0;
    const re = /[.!?…]+["»”')\]]*\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const end = m.index + m[0].length;
      const before = line.slice(start, m.index + 1);
      const prevWord = (before.match(/([\p{L}]+)\.$/u)?.[1] ?? "").toLowerCase();
      const next = line.slice(end, end + 1);
      if (m[0].startsWith(".") && (ABBR.has(prevWord) || /^\p{Lu}$/u.test(before.match(/(\p{L})\.$/u)?.[1] ?? "") && prevWord.length === 1)) continue;
      if (!/[\p{Lu}¿¡«"“(\d]/u.test(next)) continue;
      const s = line.slice(start, end).trim();
      if (s) out.push({ text: s, index: out.length, para: pi, heading: false });
      start = end;
    }
    const rest = line.slice(start).trim();
    if (rest) out.push({ text: rest, index: out.length, para: pi, heading: false });
  });
  return out;
}

function vectors(sentences: Sentence[]): Map<string, number>[] {
  const df = new Map<string, number>();
  const tfs = sentences.map((s) => {
    const tf = new Map<string, number>();
    for (const w of contentWords(s.text)) tf.set(stem(w), (tf.get(stem(w)) ?? 0) + 1);
    for (const k of tf.keys()) df.set(k, (df.get(k) ?? 0) + 1);
    return tf;
  });
  const n = sentences.length;
  return tfs.map((tf) => {
    const v = new Map<string, number>();
    for (const [k, c] of tf) v.set(k, (1 + Math.log(c)) * Math.log(1 + n / (df.get(k) ?? 1)));
    return v;
  });
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) dot += x * y; }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Puntúa las frases con TextRank (grafo de similitud entre frases) y un pequeño sesgo hacia el comienzo. */
export function rankSentences(sentences: Sentence[]): number[] {
  const n = sentences.length;
  if (n === 0) return [];
  const vec = vectors(sentences);
  const sim: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const sums = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const s = cosine(vec[i]!, vec[j]!);
      sim[i]![j] = s;
      sim[j]![i] = s;
      sums[i] = sums[i]! + s;
      sums[j] = sums[j]! + s;
    }
  }
  let score = new Array<number>(n).fill(1);
  for (let it = 0; it < 40; it += 1) {
    const next = new Array<number>(n).fill(0.15);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) if (i !== j && sim[j]![i]! > 0 && sums[j]! > 0) next[i] = next[i]! + 0.85 * (sim[j]![i]! / sums[j]!) * score[j]!;
    }
    score = next;
  }
  const firstOfPara = new Set<number>();
  let lastPara = -1;
  for (const s of sentences) if (!s.heading && s.para !== lastPara) { firstOfPara.add(s.index); lastPara = s.para; }
  return sentences.map((s, i) => {
    const len = s.text.length;
    if (s.heading || len < 30 || words(s.text).length < 6) return 0;
    let w = score[i]!;
    if (i === sentences.findIndex((x) => !x.heading)) w *= 1.35;
    else if (firstOfPara.has(i)) w *= 1.1;
    if (len > 420) w *= 0.6;
    if (/^\s*(véase|vease|referencias|bibliografía|enlaces externos)\b/i.test(s.text)) w *= 0.1;
    return w;
  });
}

/** Las `count` frases más representativas, sin repetir ideas, en el orden del texto. Si el texto es largo se
 *  reparte por tramos para cubrir el documento entero (resumen por partes). */
export function extractSentences(text: string, count: number): Sentence[] {
  const sentences = splitSentences(text);
  const scores = rankSentences(sentences);
  const vec = vectors(sentences);
  const order = sentences.map((_, i) => i).filter((i) => scores[i]! > 0).sort((a, b) => scores[b]! - scores[a]!);
  const picked: number[] = [];
  const total = sentences.length;
  const segments = total > 60 ? Math.min(count, Math.ceil(total / 40)) : 1;
  const segOf = (i: number) => Math.min(segments - 1, Math.floor((i / total) * segments));
  const redundant = (i: number) => picked.some((p) => cosine(vec[i]!, vec[p]!) > 0.45);
  // La frase inicial suele definir el tema (artículos, noticias, leyes): entra si tiene contenido
  const lead = sentences.findIndex((s) => !s.heading);
  if (lead >= 0 && scores[lead]! > 0) picked.push(lead);
  for (let s = 0; s < segments && segments > 1; s += 1) {
    if (picked.some((p) => segOf(p) === s)) continue;
    const best = order.find((i) => segOf(i) === s && !redundant(i));
    if (best !== undefined) picked.push(best);
  }
  for (const i of order) {
    if (picked.length >= count) break;
    if (!picked.includes(i) && !redundant(i)) picked.push(i);
  }
  return picked.sort((a, b) => a - b).map((i) => sentences[i]!);
}

/** Términos clave del texto (palabra más frecuente de cada raíz), por frecuencia y dispersión. */
export function keyTerms(text: string, count = 10): string[] {
  const sentences = splitSentences(text);
  const freq = new Map<string, number>();
  const spread = new Map<string, Set<number>>();
  const surface = new Map<string, Map<string, number>>();
  sentences.forEach((s, i) => {
    for (const w of contentWords(s.text)) {
      if (w.length < 4) continue;
      const k = stem(w);
      freq.set(k, (freq.get(k) ?? 0) + 1);
      if (!spread.has(k)) spread.set(k, new Set());
      spread.get(k)!.add(i);
      const forms = surface.get(k) ?? new Map<string, number>();
      const form = /^\p{Lu}{2,}$/u.test(w) ? w : /^\p{Lu}/u.test(w) && i > 0 ? w : w.toLowerCase();
      forms.set(form, (forms.get(form) ?? 0) + 1);
      surface.set(k, forms);
    }
  });
  return [...freq.keys()]
    .filter((k) => (freq.get(k) ?? 0) >= 2)
    .sort((a, b) => (freq.get(b)! * Math.sqrt(spread.get(b)!.size)) - (freq.get(a)! * Math.sqrt(spread.get(a)!.size)))
    .slice(0, count)
    .map((k) => [...surface.get(k)!.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
}

/** Frases del texto que mejor responden a una pregunta (coincidencia de raíces, ponderada por rareza). */
export function relevantSentences(text: string, question: string, count = 4): { sentences: Sentence[]; best: number } {
  const sentences = splitSentences(text).filter((s) => !s.heading);
  const q = new Set(contentWords(question).map(stem));
  if (q.size === 0) return { sentences: [], best: 0 };
  const df = new Map<string, number>();
  const sets = sentences.map((s) => new Set(contentWords(s.text).map(stem)));
  for (const set of sets) for (const k of set) df.set(k, (df.get(k) ?? 0) + 1);
  const n = sentences.length || 1;
  const scored = sentences.map((s, i) => {
    let score = 0;
    for (const k of q) if (sets[i]!.has(k)) score += Math.log(1 + n / (df.get(k) ?? 1));
    return { s, score };
  });
  const top = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, count);
  return { sentences: top.map((x) => x.s).sort((a, b) => a.index - b.index), best: top[0]?.score ?? 0 };
}

/** Acorta una frase para una viñeta: quita conectores iniciales y corta en una pausa si es muy larga. */
export function tidySentence(sentence: string, max = 240): string {
  let s = sentence.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim().replace(/^\(?\d+[.)]\s+/, "").replace(/\s*\[\d+\]/g, "");
  s = s.replace(/^(además|asimismo|por otra parte|por otro lado|por ello|por tanto|sin embargo|en cambio|así|también|de hecho|en este sentido|en concreto),\s*/i, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length > max) {
    const cut = Math.max(s.lastIndexOf(", ", max), s.lastIndexOf("; ", max), s.lastIndexOf(": ", max));
    s = `${s.slice(0, cut > max * 0.5 ? cut : max).replace(/[,;:\s]+$/, "")}…`;
  }
  return s;
}

export type Faithfulness = { novelRatio: number; coverage: number; spanish: boolean; ok: boolean; novel: string[] };

/** ¿Lo que ha escrito el modelo se apoya en el texto original? Mide palabras con contenido que no están en el
 *  original (inventadas), cobertura de los términos clave, números ajenos al texto e idioma. */
export function checkFaithful(output: string, source: string, opts: { maxNovel?: number; minCoverage?: number; terms?: string[] } = {}): Faithfulness {
  const src = new Set(contentWords(source).map(stem));
  const srcNumbers = new Set(source.match(/\d+(?:[.,]\d+)*/g) ?? []);
  const out = contentWords(output);
  const novel = out.filter((w) => !src.has(stem(w)));
  const numbers = (output.match(/\d+(?:[.,]\d+)*/g) ?? []).filter((n) => n.length > 1 && !srcNumbers.has(n));
  const novelRatio = out.length ? (novel.length + numbers.length * 2) / (out.length + numbers.length) : 1;
  const terms = opts.terms ?? keyTerms(source, 10);
  const outStems = new Set(out.map(stem));
  const coverage = terms.length ? terms.filter((t) => outStems.has(stem(t))).length / terms.length : 1;
  const all = words(output).map(fold);
  const es = all.filter((w) => ES_FUNC.has(w)).length;
  const en = all.filter((w) => EN_STOP.has(w)).length;
  const spanish = all.length < 6 || (es >= en * 2 && es / all.length > 0.08);
  const ok = out.length >= 3 && novelRatio <= (opts.maxNovel ?? 0.35) && coverage >= (opts.minCoverage ?? 0.2) && spanish;
  return { novelRatio, coverage, spanish, ok, novel: [...new Set(novel)].slice(0, 12) };
}

/** ¿El texto está en un idioma que no es español? (para comprobar una traducción). */
export function looksSpanish(text: string): boolean {
  const all = words(text).map(fold);
  if (all.length < 6) return false;
  const es = all.filter((w) => ES_FUNC.has(w)).length;
  return es / all.length > 0.12;
}

/** Frases de la salida del modelo que se apoyan en el texto: sin palabras ni cifras ajenas, completas, sin
 *  repetirse y cercanas a alguna frase de apoyo (`support`). Devuelve las aceptadas y la proporción aceptada. */
export function faithfulSentences(output: string, source: string, opts: { maxNovel: number; minSupport: number; support?: string[] }): { kept: string[]; share: number } {
  const src = new Set(contentWords(source).map(stem));
  const srcNumbers = new Set((source.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]/g, "")));
  const supports = (opts.support ?? splitSentences(source).map((s) => s.text)).map((s) => new Set(contentWords(s).map(stem)));
  const sentences = splitSentences(output.replace(/^\s*[-*•]\s+/gm, "")).map((s) => s.text).filter((s) => !/^\*\*.*\*\*$/.test(s));
  const kept: string[] = [];
  const seen: Set<string>[] = [];
  let total = 0;
  let good = 0;
  sentences.forEach((s, i) => {
    total += s.length;
    const cw = contentWords(s).map(stem);
    if (cw.length < 3) return;
    if (i === sentences.length - 1 && sentences.length > 1 && !/[.!?…»")]$/.test(s.trim())) return;
    const novel = cw.filter((w) => !src.has(w)).length / cw.length;
    if (novel > opts.maxNovel) return;
    const nums = (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]/g, ""));
    if (nums.some((n) => !srcNumbers.has(n))) return;
    const set = new Set(cw);
    const support = Math.max(0, ...supports.map((sup) => [...set].filter((w) => sup.has(w)).length / set.size));
    if (support < opts.minSupport) return;
    if (seen.some((prev) => [...set].filter((w) => prev.has(w)).length / set.size > 0.7)) return;
    seen.push(set);
    kept.push(s.trim());
    good += s.length;
  });
  return { kept, share: total ? good / total : 0 };
}
