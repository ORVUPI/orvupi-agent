/** Base documental general. Solo entra lo que tiene URL oficial. Se recupera por similitud, en local. */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashEmbed, cosine, tokensOf } from "./embed.mjs";
import { chunkText } from "./rag.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/arqiven/conocimiento");

export async function loadConocimiento(dir = root) {
  let names = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const docs = [];
  for (const name of names) {
    const text = await readFile(path.join(dir, name), "utf8");
    const title = (text.match(/^#\s+(.+)$/m) || [null, name])[1].trim();
    const url = (text.match(/https?:\/\/\S+/) || [""])[0];
    docs.push({ id: name.replace(/\.md$/, ""), title, url, text });
  }
  return docs;
}

function sharedWords(question, text) {
  const wanted = new Set(tokensOf(question));
  let count = 0;
  for (const token of new Set(tokensOf(text))) if (wanted.has(token)) count += 1;
  return count;
}

export async function retrieveConocimiento(question, options = {}) {
  const embed = options.embed || hashEmbed;
  const docs = await loadConocimiento(options.dir);
  if (!docs.length || typeof embed !== "function") return { text: "", hits: [] };
  const query = await embed(String(question || ""));
  const byDoc = new Map();
  for (const doc of docs) {
    const parts = chunkText(doc.text, 8000, 0).map((part) => ({
      part,
      score: 0,
      words: sharedWords(question, part),
    }));
    for (const row of parts) row.score = cosine(query, await embed(row.part));
    const words = sharedWords(question, doc.text);
    const score = parts.reduce((best, row) => Math.max(best, row.score), 0);
    byDoc.set(doc.id, { doc, parts, words, score });
  }
  const ranked = [...byDoc.values()].sort((a, b) => b.words - a.words || b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.words < 2) return { text: "", hits: [] };
  if (second && second.words === best.words && second.score > best.score - 0.05) return { text: "", hits: [] };
  const hits = best.parts
    .filter((row) => row.words > 0)
    .sort((a, b) => b.words - a.words || b.score - a.score)
    .slice(0, 2);
  const body = hits.map((row) => row.part).join("\n\n");
  const text = [`[${best.doc.id}] ${best.doc.title}`, best.doc.url, body].filter(Boolean).join("\n");
  return {
    text,
    hits: [{ id: best.doc.id, title: best.doc.title, url: best.doc.url, score: Math.round(best.score * 1000) / 1000, words: best.words }],
  };
}
