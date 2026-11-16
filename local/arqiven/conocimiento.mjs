/** Base documental general. Solo entra lo que tiene URL oficial. Se recupera por similitud, en local. */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokensOf } from "./embed.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/arqiven/conocimiento");

export async function loadConocimiento(dir = root) {
  let listed = [];
  try {
    listed = JSON.parse(await readFile(path.join(dir, "manifiesto.json"), "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(listed)) return [];
  const docs = [];
  for (const name of listed) {
    if (typeof name !== "string" || !name.endsWith(".md") || name.includes("..") || name.includes("/") || name.includes("\\")) continue;
    let text = "";
    try {
      text = await readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    const title = (text.match(/^#\s+(.+)$/m) || [null, name])[1].trim();
    const url = (text.match(/https?:\/\/\S+/) || [""])[0];
    docs.push({ id: name.replace(/\.md$/, ""), title, url, text });
  }
  return docs;
}

function noteTokens(text) {
  return tokensOf(text).filter((token) => token.length >= 4);
}

/** Palabras que están en una nota y en ninguna otra. */
export function distinctiveTokens(docs) {
  const sets = docs.map((doc) => new Set(noteTokens(`${doc.title || ""} ${doc.text || ""}`)));
  return sets.map((tokens, index) => [...tokens].filter((token) => sets.every((other, otherIndex) => otherIndex === index || !other.has(token))));
}

const TOPIC = {
  "higiene-sueno": /sueñ|sueno|higiene|insomnio|cafe[ií]na/i,
  "despido-baja": /despid|desped/i,
  "sarajevo-1914": /sarajevo|princip|guerra|bosnia|archiduque/i,
};

export function aboutTopic(question, id) {
  const rule = TOPIC[id];
  if (!rule) return false;
  return rule.test(String(question || ""));
}

export function matchConocimiento(question, docs) {
  const asked = new Set(noteTokens(question));
  const own = distinctiveTokens(docs);
  const ranked = docs.map((doc, index) => ({
    doc,
    words: own[index].filter((token) => asked.has(token)),
  })).filter((row) => row.words.length >= 2 && aboutTopic(question, row.doc.id));
  ranked.sort((a, b) => b.words.length - a.words.length);
  if (!ranked.length) return null;
  if (ranked[1] && ranked[1].words.length === ranked[0].words.length) return null;
  return ranked[0];
}

export async function retrieveConocimiento(question, options = {}) {
  const docs = await loadConocimiento(options.dir);
  const chosen = matchConocimiento(question, docs);
  if (!chosen) return { text: "", hits: [] };
  const text = [`[${chosen.doc.id}] ${chosen.doc.title}`, chosen.doc.url, chosen.doc.text].filter(Boolean).join("\n");
  return {
    text,
    hits: [{ id: chosen.doc.id, title: chosen.doc.title, url: chosen.doc.url, words: chosen.words.length }],
  };
}
