/** BM25 ligero, sin modelo de embeddings. Sirve en el navegador y en Node.
 * Los n-gramas de caracteres cubren japonés y coreano, donde no hay espacios.
 */

const STOP = new Set(("el la los las un una unos unas de del al y o u a en que qué es por con para como su sus lo le se te mi tu fue era son soy eres esta este esto " +
  "the of and to in is are was were be it this that for on a an or do how what who which was " +
  "o os um uma de da do das dos e em que é para com como no na se umas foi era são sao quem qual " +
  "quien quién fue").split(/\s+/));

function fold(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

export function tokenize(text) {
  const value = String(text || "").toLowerCase().normalize("NFKC");
  const words = value.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1 && !STOP.has(token));
  const cjk = value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]{2,}/gu) || [];
  const grams = [];
  for (const run of cjk) {
    for (let i = 0; i < run.length - 1; i += 1) grams.push(run.slice(i, i + 2));
  }
  return words.concat(grams);
}

export function buildIndex(chunks) {
  const docs = (Array.isArray(chunks) ? chunks : []).map((chunk, index) => {
    const tokens = tokenize(`${chunk.title || ""} ${chunk.url || ""} ${chunk.text || ""}`);
    const tf = new Map();
    for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
    return { chunk, index, tf, len: tokens.length || 1 };
  });
  const df = new Map();
  for (const doc of docs) {
    for (const token of doc.tf.keys()) df.set(token, (df.get(token) || 0) + 1);
  }
  const avg = docs.reduce((sum, doc) => sum + doc.len, 0) / (docs.length || 1);
  return { docs, df, avg, size: docs.length };
}

export function search(index, query, limit = 4, lang = "") {
  if (!index?.docs?.length) return [];
  const tokens = [...new Set(tokenize(query))];
  if (!tokens.length) return [];
  const k1 = 1.2;
  const b = 0.75;
  const n = index.size;
  const wanted = String(lang || "");
  const scored = [];
  for (const doc of index.docs) {
    let score = 0;
    let titleHits = 0;
    const titleTokens = new Set(tokenize(`${doc.chunk.title || ""} ${doc.chunk.url || ""}`));
    for (const token of tokens) {
      const freq = doc.tf.get(token) || 0;
      if (!freq) continue;
      const docsWith = index.df.get(token) || 0;
      const idf = Math.log(1 + (n - docsWith + 0.5) / (docsWith + 0.5));
      const norm = freq * (k1 + 1) / (freq + k1 * (1 - b + b * doc.len / index.avg));
      score += idf * norm;
      if (titleTokens.has(token)) {
        titleHits += 1;
        score += 5;
      }
    }
    if (score <= 0) continue;
    if (titleHits) score *= 1 + titleHits * 0.35;
    if (doc.chunk.curated) score *= 1.8;
    if (wanted && doc.chunk.lang === wanted) score *= 1.45;
    else if (wanted && doc.chunk.lang !== wanted) score *= 0.72;
    const asked = fold(query);
    const titled = fold(doc.chunk.title);
    if (asked.length > 4 && titled && (titled === asked || titled.includes(asked))) score += 8;
    const product = ["sonar", "studio", "verify", "academy", "work", "arqiven"].filter((name) => tokens.includes(name));
    const route = String(doc.chunk.url || "").toLowerCase();
    if (product.some((name) => titled.includes(name) || route.includes(`/${name}`))) score *= 2.2;
    const generalOrvupi = tokens.includes("orvupi") && !product.length && !tokens.includes("contrato") && !tokens.includes("contract");
    if (generalOrvupi && doc.chunk.curated && /^\/(?:en\/|pt-br\/|ja\/|ko\/)?$/.test(route)) score *= 1.8;
    scored.push({ ...doc.chunk, score });
  }
  scored.sort((a, b2) => b2.score - a.score || String(a.id).localeCompare(String(b2.id)));
  const best = scored[0]?.score || 0;
  const floor = Math.max(3.5, best * 0.28);
  const strong = scored.filter((item) => item.score >= floor);
  const preferred = wanted ? strong.filter((item) => item.lang === wanted) : [];
  return (preferred.length ? preferred : strong).slice(0, limit);
}

export function looksLikeOrvupi(query) {
  return /orvupi|arqiven|sonar|verify|academy|studio|\bwork\b|contrato|novedades|cuaderno/i.test(String(query || ""));
}
