/** Prueba opcional contra un Ollama real de esta máquina.
 * No forma parte de la CI. Si Ollama no está, termina sin error.
 * El resultado, si sale, es de esta VM, no del PC del propietario.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startLocalServer } from "./server.mjs";

const base = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const preferred = process.env.ARQIVEN_MODEL || "qwen3:0.6b";

async function tags() {
  const response = await fetch(new URL("/api/tags", base), { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

let catalog;
try {
  catalog = await tags();
} catch {
  console.log("Integración real omitida: Ollama no responde en esta máquina. No es el PC del propietario.");
  process.exit(0);
}

const names = (catalog.models || []).map((item) => String(item.name || item.model || ""));
const model = names.find((name) => name === preferred || name.startsWith(`${preferred}`))
  || names.find((name) => name.startsWith("qwen3:"));
if (!model) {
  console.log(`Integración real omitida: no hay un qwen3 en Ollama. Modelos: ${names.join(", ") || "(ninguno)"}.`);
  process.exit(0);
}

const dir = await mkdtemp(path.join(tmpdir(), "arqiven-real-"));
const app = await startLocalServer({
  dataDir: dir,
  ollamaBase: base,
  model,
  port: 0,
  timeoutMs: 120000,
});
try {
  const response = await fetch(`${app.url}/api/arqiven/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: "req-real-01",
      conversationId: "chat-real01",
      messages: [{ role: "user", content: "Di hola en una frase." }],
    }),
  });
  const text = await response.text();
  const events = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const done = events.find((item) => item.type === "done");
  const error = events.find((item) => item.type === "error");
  if (!done) {
    console.log(`Integración real falló: ${error?.code || "sin cierre"} ${error?.message || ""}`);
    process.exit(1);
  }
  console.log("VERIFICADO EN VM, no en el PC del propietario.");
  console.log(`modelo: ${model}`);
  console.log(`respuesta: ${String(done.text).slice(0, 180)}`);
  console.log(`térmico: ${done.metrics?.thermal}  primer token: ${done.metrics?.ttftMs} ms  tok/s: ${done.metrics?.tokensPerSecond}`);
} finally {
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
