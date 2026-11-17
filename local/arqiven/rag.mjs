/** Índice local por proyecto. El texto de un documento es un dato, no una instrucción. */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { codeError } from "./errors.mjs";
import { EMBED_MODEL, cosine } from "./embed.mjs";

export const ABSTAIN_TEXT = "No consta en los documentos de este proyecto.";

function empty(model) {
  return { version: 1, model, documents: [], chunks: [] };
}

export function chunkText(text, size = 480, overlap = 80) {
  const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 20000);
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + size);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function createIndex(dir, options = {}) {
  const root = path.resolve(dir);
  const file = path.join(root, "rag-index.json");
  const embed = options.embed;
  const model = options.model || EMBED_MODEL;
  const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.45;
  let chain = Promise.resolve();

  function exclusive(task) {
    const run = chain.then(task, task);
    chain = run.then(() => undefined, () => undefined);
    return run;
  }

  async function readIndex() {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      if (parsed?.version !== 1 || !Array.isArray(parsed.documents) || !Array.isArray(parsed.chunks)) {
        throw Object.assign(new Error("indice"), { code: "bad-request" });
      }
      return parsed;
    } catch (error) {
      if (error?.code === "ENOENT") return empty(model);
      throw error;
    }
  }

  async function writeIndex(data) {
    await mkdir(root, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data)}\n`, "utf8");
    await rename(tmp, file);
  }

  return {
    async add({ projectId, documentId, name, text }) {
      return exclusive(async () => {
        if (typeof embed !== "function") throw codeError("embed-missing");
        const parts = chunkText(text);
        if (!parts.length || !projectId || !documentId) throw codeError("bad-request");
        const data = await readIndex();
        data.documents = data.documents.filter((item) => item.id !== documentId);
        data.chunks = data.chunks.filter((item) => item.documentId !== documentId);
        const title = String(name || "documento").replace(/\s+/g, " ").trim().slice(0, 80);
        data.documents.push({ id: documentId, projectId, name: title, created: new Date().toISOString() });
        for (let i = 0; i < parts.length; i += 1) {
          const vector = await embed(parts[i]);
          data.chunks.push({
            id: `${documentId}-${i + 1}`,
            documentId,
            projectId,
            title,
            text: parts[i],
            vector,
          });
        }
        data.model = model;
        await writeIndex(data);
        return { id: documentId, projectId, name: title, chunks: parts.length };
      });
    },
    async retrieve(projectId, query) {
      return exclusive(async () => {
        const data = await readIndex();
        const pool = data.chunks.filter((item) => item.projectId === projectId);
        if (!pool.length || typeof embed !== "function") {
          return { abstain: true, text: ABSTAIN_TEXT, citations: [] };
        }
        const queryVector = await embed(query);
        const ranked = pool
          .map((item) => ({ item, score: cosine(queryVector, item.vector) }))
          .sort((a, b) => b.score - a.score);
        const best = ranked[0];
        if (!best || best.score < threshold) return { abstain: true, text: ABSTAIN_TEXT, citations: [] };
        const citations = ranked.filter((row) => row.score >= threshold).slice(0, 3).map((row) => {
          const excerpt = row.item.text.slice(0, 240);
          if (!row.item.text.includes(excerpt)) throw codeError("bad-request");
          return {
            id: row.item.id,
            documentId: row.item.documentId,
            title: row.item.title,
            excerpt,
            score: Math.round(row.score * 1000) / 1000,
          };
        });
        return { abstain: false, text: "", citations };
      });
    },
    async removeDocument(projectId, documentId) {
      return exclusive(async () => {
        const data = await readIndex();
        const before = data.chunks.length;
        data.documents = data.documents.filter((item) => !(item.projectId === projectId && item.id === documentId));
        data.chunks = data.chunks.filter((item) => !(item.projectId === projectId && item.documentId === documentId));
        await writeIndex(data);
        return { removed: before - data.chunks.length };
      });
    },
    async forgetProject(projectId) {
      return exclusive(async () => {
        const data = await readIndex();
        data.documents = data.documents.filter((item) => item.projectId !== projectId);
        data.chunks = data.chunks.filter((item) => item.projectId !== projectId);
        await writeIndex(data);
        return true;
      });
    },
    async list(projectId) {
      return exclusive(async () => {
        const data = await readIndex();
        return data.documents.filter((item) => item.projectId === projectId).map((item) => ({ ...item }));
      });
    },
  };
}
