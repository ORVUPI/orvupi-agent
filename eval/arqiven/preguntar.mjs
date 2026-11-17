/** Una pregunta suelta contra el backend local, en un directorio de datos temporal.
 * No escribe en el historial del propietario.
 * Uso: node eval/arqiven/preguntar.mjs "¿Cómo ves las inversiones hoy?"
 */

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLocalServer } from "../../local/arqiven/server.mjs";

export function isTemporaryDataDir(dir) {
  const resolved = path.resolve(String(dir || ""));
  const temp = path.resolve(os.tmpdir());
  const home = path.resolve(path.join(os.homedir(), ".arqiven"));
  const inside = (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`);
  return inside(temp) && !inside(home);
}

async function readDone(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let error = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.type === "done") text = String(event.text || "");
      if (event.type === "error") error = String(event.message || event.code || "error");
    }
  }
  if (error) throw new Error(error);
  return text;
}

export async function askDetached(questions, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "ARQIVEN-preguntar-"));
  if (!isTemporaryDataDir(dataDir)) {
    await rm(dataDir, { recursive: true, force: true });
    throw new Error("el directorio de datos no es temporal");
  }
  let started;
  const answers = [];
  try {
    started = await startLocalServer({
      dataDir,
      port: 0,
      timeoutMs: options.timeoutMs || 180000,
      ...(options.ollamaBase ? { ollamaBase: options.ollamaBase } : {}),
    });
    for (const question of questions) {
      const response = await fetch(`${started.url}/api/arqiven/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
        signal: AbortSignal.timeout(options.timeoutMs || 180000),
      });
      if (!response.ok) throw new Error(`el backend respondió ${response.status}`);
      const text = await readDone(response);
      answers.push(text);
      if (options.inspect) await options.inspect({ dataDir, question, answer: text });
    }
    return { answers };
  } finally {
    if (started) await started.close();
    await rm(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  const questions = process.argv.slice(2).map((item) => item.trim()).filter(Boolean);
  if (!questions.length) {
    console.error("Uso: node eval/arqiven/preguntar.mjs \"pregunta\"");
    process.exit(1);
  }
  const { answers } = await askDetached(questions);
  for (const answer of answers) console.log(answer);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
