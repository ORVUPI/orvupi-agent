/** Historial en disco. La escritura pasa por un archivo temporal y un rename. */

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { codeError } from "./errors.mjs";
import { canSeeChat, canWriteChat, createProject, moveChat, removeProject, renameChat, renameProject, roleOf, setMember } from "./projects.mjs";

function empty() {
  return { version: 2, conversations: [], projects: [], members: [] };
}

function asVersion2(parsed, defaultUser) {
  const conversations = Array.isArray(parsed?.conversations) ? parsed.conversations : null;
  if (!conversations || (parsed.version !== 1 && parsed.version !== 2)) {
    throw Object.assign(new Error("historial"), { code: "bad-request" });
  }
  return {
    version: 2,
    conversations: conversations.map((item) => ({
      ...item,
      projectId: typeof item.projectId === "string" ? item.projectId : "",
      ownerId: typeof item.ownerId === "string" && item.ownerId ? item.ownerId : defaultUser,
    })),
    projects: Array.isArray(parsed.projects) ? parsed.projects.map((item) => ({ ...item })) : [],
    members: Array.isArray(parsed.members) ? parsed.members.map((item) => ({ ...item })) : [],
  };
}

function cleanMessage(item) {
  if (!item || (item.role !== "user" && item.role !== "assistant")) return null;
  const content = String(item.content || "").slice(0, 8000);
  if (!content.trim()) return null;
  const run = item.role === "assistant" && item.run && typeof item.run === "object" ? {
    model: String(item.run.model || "").slice(0, 80),
    digest: String(item.run.digest || "").slice(0, 80),
    quantization: String(item.run.quantization || "").slice(0, 40),
    numCtx: Number(item.run.numCtx) || 0,
    numPredict: Number(item.run.numPredict) || 0,
    temperature: Number(item.run.temperature),
    think: item.run.think === true,
    ollamaVersion: String(item.run.ollamaVersion || "").slice(0, 40),
    pipeline: String(item.run.pipeline || "").slice(0, 40),
  } : undefined;
  return run ? { role: item.role, content, run } : { role: item.role, content };
}

function cleanConversation(input = {}) {
  const id = String(input.id || "").slice(0, 80);
  if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) throw Object.assign(new Error("conversation"), { code: "bad-request" });
  const messages = (Array.isArray(input.messages) ? input.messages : []).map(cleanMessage).filter(Boolean).slice(-80);
  const title = String(input.title || messages.find((item) => item.role === "user")?.content || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const projectId = /^[A-Za-z0-9-]{8,80}$/.test(String(input.projectId || "")) ? String(input.projectId) : "";
  const ownerId = /^[A-Za-z0-9._-]{1,64}$/.test(String(input.ownerId || "")) ? String(input.ownerId) : "local";
  return {
    id,
    title,
    renamed: input.renamed === true,
    projectId,
    ownerId,
    updated: new Date().toISOString(),
    messages,
  };
}

export function createStore(dir, options = {}) {
  const root = path.resolve(dir);
  const defaultUser = /^[A-Za-z0-9._-]{1,64}$/.test(String(options.defaultUser || "")) ? String(options.defaultUser) : "local";
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
    return asVersion2(JSON.parse(text), defaultUser);
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
        const data = await readHistory();
        const index = data.conversations.findIndex((item) => item.id === String(input.id || ""));
        const previous = index >= 0 ? data.conversations[index] : null;
        const clean = cleanConversation({
          ...previous,
          ...input,
          title: input.title || previous?.title,
          renamed: input.renamed === true || previous?.renamed === true,
          projectId: input.projectId !== undefined ? input.projectId : previous?.projectId,
          ownerId: input.ownerId || previous?.ownerId,
        });
        if (index >= 0) data.conversations[index] = clean;
        else data.conversations.push(clean);
        await writeHistory(data);
        return clean;
      });
    },
    listFor(userId) {
      return exclusive(async () => {
        const data = await readHistory();
        return data.conversations
          .filter((item) => canSeeChat(data, item, userId))
          .map((item) => ({ ...item, messages: item.messages.map((message) => ({ ...message })) }))
          .sort((a, b) => (a.updated < b.updated ? 1 : -1));
      });
    },
    getFor(userId, id) {
      return exclusive(async () => {
        const data = await readHistory();
        const found = data.conversations.find((item) => item.id === id);
        if (!found) return null;
        if (!canSeeChat(data, found, userId)) throw codeError("forbidden");
        return { ...found, messages: found.messages.map((item) => ({ ...item })) };
      });
    },
    assertWrite(userId, id, projectId) {
      return exclusive(async () => {
        const data = await readHistory();
        const found = data.conversations.find((item) => item.id === id);
        if (found) {
          if (!canWriteChat(data, found, userId)) throw codeError("forbidden");
          return found;
        }
        if (projectId) {
          if (!canWriteChat(data, { projectId, ownerId: userId }, userId)) throw codeError("forbidden");
        }
        return null;
      });
    },
    projectsFor(userId) {
      return exclusive(async () => {
        const data = await readHistory();
        return data.projects
          .filter((item) => roleOf(data.members, item.id, userId))
          .map((item) => ({ ...item, role: roleOf(data.members, item.id, userId) }))
          .sort((a, b) => (a.updated < b.updated ? 1 : -1));
      });
    },
    projectFor(userId, id) {
      return exclusive(async () => {
        const data = await readHistory();
        const project = data.projects.find((item) => item.id === id);
        const role = roleOf(data.members, id, userId);
        if (!project || !role) throw codeError("forbidden");
        const conversations = data.conversations
          .filter((item) => item.projectId === id)
          .map((item) => ({ id: item.id, title: item.title, updated: item.updated, projectId: item.projectId }))
          .sort((a, b) => (a.updated < b.updated ? 1 : -1));
        return { project: { ...project, role }, conversations };
      });
    },
    createProject(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const project = createProject(data, input);
        await writeHistory(data);
        return project;
      });
    },
    renameProject(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const project = renameProject(data, input);
        await writeHistory(data);
        return project;
      });
    },
    removeProject(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const result = removeProject(data, input);
        await writeHistory(data);
        return result;
      });
    },
    setMember(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const result = setMember(data, input);
        await writeHistory(data);
        return result;
      });
    },
    renameChat(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const result = renameChat(data, input);
        await writeHistory(data);
        return result;
      });
    },
    moveChat(input) {
      return exclusive(async () => {
        const data = await readHistory();
        const result = moveChat(data, input);
        await writeHistory(data);
        return result;
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
