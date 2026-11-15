/** Historial en disco. La escritura pasa por un archivo temporal y un rename. */

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function empty() {
  return { version: 1, conversations: [] };
}

function cleanMessage(item) {
  if (!item || (item.role !== "user" && item.role !== "assistant")) return null;
  const content = String(item.content || "").slice(0, 8000);
  if (!content.trim()) return null;
  return { role: item.role, content };
}

function cleanConversation(input = {}) {
  const id = String(input.id || "").slice(0, 80);
  if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) throw Object.assign(new Error("conversation"), { code: "bad-request" });
  const messages = (Array.isArray(input.messages) ? input.messages : []).map(cleanMessage).filter(Boolean).slice(-80);
  const title = String(input.title || messages.find((item) => item.role === "user")?.content || "").replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    id,
    title,
    updated: new Date().toISOString(),
    messages,
  };
}

export function createStore(dir) {
  const root = path.resolve(dir);
  const historyFile = path.join(root, "history.json");
  const metricsFile = path.join(root, "metrics.jsonl");
  let chain = Promise.resolve();

  function exclusive(task) {
    const run = chain.then(task, task);
    chain = run.then(() => undefined, () => undefined);
    return run;
  }

  async function readHistory() {
    let text = "";
    try {
      text = await readFile(historyFile, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return empty();
      throw error;
    }
    const parsed = JSON.parse(text);
    if (parsed?.version !== 1 || !Array.isArray(parsed.conversations)) {
      throw Object.assign(new Error("historial"), { code: "bad-request" });
    }
    return parsed;
  }

  async function writeHistory(data) {
    await mkdir(root, { recursive: true });
    const tmp = `${historyFile}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data)}\n`, "utf8");
    await rename(tmp, historyFile);
  }

  return {
    dir: root,
    list() {
      return exclusive(async () => {
        const data = await readHistory();
        return data.conversations.map((item) => ({ ...item })).sort((a, b) => (a.updated < b.updated ? 1 : -1));
      });
    },
    get(id) {
      return exclusive(async () => {
        const data = await readHistory();
        const found = data.conversations.find((item) => item.id === id);
        return found ? { ...found, messages: found.messages.map((item) => ({ ...item })) } : null;
      });
    },
    save(input) {
      return exclusive(async () => {
        const clean = cleanConversation(input);
        const data = await readHistory();
        const index = data.conversations.findIndex((item) => item.id === clean.id);
        if (index >= 0) data.conversations[index] = clean;
        else data.conversations.push(clean);
        await writeHistory(data);
        return clean;
      });
    },
    appendMetric(metric) {
      return exclusive(async () => {
        await mkdir(root, { recursive: true });
        await appendFile(metricsFile, `${JSON.stringify(metric)}\n`, "utf8");
        return metric;
      });
    },
    async readMetrics(limit = 20) {
      let text = "";
      try {
        text = await readFile(metricsFile, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") return [];
        throw error;
      }
      const rows = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return rows.slice(-Math.max(1, Math.min(200, limit)));
    },
  };
}
