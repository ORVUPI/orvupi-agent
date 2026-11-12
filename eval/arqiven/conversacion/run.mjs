/** Mide las 21 tareas con el código del repositorio. No publica nada.
 * Uso: node eval/arqiven/conversacion/run.mjs <repo> <dtype> <legacy|v1> [hilos]
 * Requiere @huggingface/transformers en el entorno. No está en las dependencias del sitio.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clipHistory } from "../../../web/v2/shared/ia/history.mjs";
import { planTurn, finishModelAnswer, isFollowUp } from "../../../web/v2/shared/ia/turn.mjs";
import { citedExcerpt, extractiveFromSources, isDegenerate } from "../../../web/v2/shared/ia/quality.mjs";
import { buildIndex } from "../../../web/v2/shared/ia/retrieve.mjs";
import { profileById } from "../../../web/v2/shared/ia/profile.mjs";
import { TASKS } from "./tasks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const LANG_NAME = { es: "español", en: "English", "pt-BR": "português", pt: "português", ja: "日本語", ko: "한국어" };

const [repo, dtype, profileName, threadsArg] = [process.argv[2], process.argv[3] || "q4", process.argv[4] || "v1", Number(process.argv[5] || 4)];
const profile = profileById(profileName);
const only = process.argv[6] ? process.argv[6].split(",") : null;
const worker = await readFile(path.join(repoRoot, "web/v2/arqiven/engine-worker.mjs"), "utf8");
const system = profile.id === "v1"
  ? worker.match(/const SYSTEM_V1 = (\[[\s\S]*?\]\.join\(" "\));/)
  : worker.match(/const SYSTEM_LEGACY = (\[[\s\S]*?\]\.join\(" "\));/);
const SYSTEM = Function(`return ${system[1]}`)();
const kn = JSON.parse(await readFile(path.join(repoRoot, "web/v2/arqiven/knowledge-index.json"), "utf8"));
const index = buildIndex(kn.chunks || []);

const budget = profile.id === "legacy"
  ? { turns: 4, maxChars: 3200, maxNew: 120 }
  : { turns: /1\.5B/.test(repo) ? 12 : 12, maxChars: /135M|0\.5B|350M/.test(repo) ? 8000 : 12000, maxNew: /1\.5B/.test(repo) ? 512 : 320 };
if (/135M/.test(repo) && profile.id === "v1") {
  budget.turns = 4;
  budget.maxChars = 3200;
  budget.maxNew = 160;
}

const { pipeline, env, TextStreamer, InterruptableStoppingCriteria } = await import("@huggingface/transformers");
env.allowLocalModels = false;
const t0 = Date.now();
const gen = await pipeline("text-generation", repo, { dtype, device: "cpu", session_options: { intraOpNumThreads: threadsArg } });
const loadMs = Date.now() - t0;
const results = [];
for (const task of TASKS) {
  if (only && !only.includes(task.id)) continue;
  const prior = [];
  for (const [user, answer] of task.turns) {
    prior.push({ role: "user", content: user, mode: "model" });
    const notice = /^El modelo de terceros se repitió/.test(answer);
    if (!(profile.dropNonModel && notice)) prior.push({ role: "assistant", content: answer, mode: notice ? "extractive" : "model" });
  }
  const modelText = [task.ask, task.attachment || ""].filter(Boolean).join("\n\n").slice(0, 8000);
  const history = clipHistory([...prior, { role: "user", content: task.ask, modelContent: modelText, mode: "model" }], {
    profile: profile.id,
    turns: budget.turns,
    maxChars: budget.maxChars,
  });
  const plan = await planTurn({
    question: task.ask,
    lang: task.lang,
    index,
    history: prior,
    attachment: Boolean(task.attachment),
    fetchImpl: task.attachment || isFollowUp(task.ask, prior) ? null : fetch,
  });
  let out = "";
  let mode = "rules";
  let ms = 0;
  let toks = 0;
  let truncated = false;
  let broken = false;
  if (plan.skipModel) out = plan.text;
  else {
    const cited = (plan.promptSources || []).filter((source) => source.excerpt).slice(0, 4);
    const sourceNote = cited.length ? `\n\nFuentes. Apóyate solo en ellas y cita el título. Si no responden, di que no consta.\n${cited.map((source) => `[${source.title || "fuente"}] ${source.url || ""}\n${source.excerpt}`).join("\n\n")}` : "";
    const language = LANG_NAME[task.lang] || "español";
    const messages = [{ role: "system", content: `${SYSTEM} Responde en ${language}. ${sourceNote}` }, ...history];
    const stopper = new InterruptableStoppingCriteria();
    let acc = "";
    const streamer = new TextStreamer(gen.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (chunk) => {
        acc += chunk;
        toks += 1;
        if (!broken && (isDegenerate(acc) || (acc.length > 24 && /!\[/.test(acc.slice(-160))))) {
          broken = true;
          stopper.interrupt();
        }
      },
    });
    const started = Date.now();
    const generated = await gen(messages, {
      max_new_tokens: budget.maxNew,
      do_sample: false,
      repetition_penalty: profile.repetitionPenalty,
      ...(profile.noRepeatNgram ? { no_repeat_ngram_size: profile.noRepeatNgram } : {}),
      ...(profile.disableThinking && /qwen3/i.test(repo) ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      streamer,
      stopping_criteria: stopper,
    });
    ms = Date.now() - started;
    const raw = generated?.[0]?.generated_text;
    const text = Array.isArray(raw) ? raw.at(-1)?.content ?? acc : String(raw ?? acc);
    const ids = gen.tokenizer.encode(acc);
    toks = ids.length;
    truncated = !broken && toks >= budget.maxNew - 2 && !/[.!?。！？»)\]]\s*$/.test(text.trim());
    const finished = finishModelAnswer(broken ? acc : text, task.lang, plan.sources, task.ask, prior);
    if (finished.blocked) {
      out = finished.text;
      mode = "rules";
    } else if (finished.extractive || text.trim().length < 24) {
      const excerpt = finished.extractive && finished.text.trim().length >= 24
        ? finished.text
        : (extractiveFromSources(task.lang, plan.sources, task.ask) || citedExcerpt(task.lang, plan.sources, task.ask));
      out = excerpt || "(vacía)";
      mode = excerpt ? "extractive" : "empty";
    } else {
      out = finished.text || text;
      mode = "model";
    }
  }
  const fails = [];
  for (const pattern of task.must || []) if (!pattern.test(out)) fails.push(`falta ${pattern}`);
  for (const pattern of task.mustNot || []) if (pattern.test(out)) fails.push(`sobra ${pattern}`);
  if (task.minChars && out.length < task.minChars) fails.push("corta");
  if (task.complete && truncated) fails.push("truncada");
  if (task.maxSentences) {
    const count = out.split(/(?<=[.!?])\s+/).filter((part) => part.trim()).length;
    if (count > task.maxSentences || /^\s*[-*•\d]/m.test(out)) fails.push(`frases ${count}`);
  }
  const bullets = out.split("\n").filter((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line)).length;
  if (task.bullets && bullets !== task.bullets) fails.push(`viñetas ${bullets}`);
  if (task.bulletsMin && bullets < task.bulletsMin) fails.push(`viñetas ${bullets}`);
  if (mode === "extractive" && task.cat !== "fuentes") fails.push("sustituida por extracto");
  const row = {
    id: task.id,
    cat: task.cat,
    lang: task.lang,
    pass: fails.length === 0,
    fails,
    mode,
    ms,
    toks,
    tps: ms ? Number((toks / (ms / 1000)).toFixed(1)) : null,
    truncated,
    broken,
    histMsgs: history.length,
    histChars: history.reduce((sum, item) => sum + item.content.length, 0),
    sources: plan.sources.map((source) => `${source.origin}:${source.title}`).slice(0, 3),
    out: out.slice(0, 700),
  };
  results.push(row);
  console.error(`${row.pass ? "OK " : "XX "} ${task.id} ${mode} ${ms}ms ${fails.join("; ")}`);
}
const name = `${String(repo).split("/").pop()}-${dtype}-${profile.id}-t${threadsArg}`;
await mkdir(path.join(here, "out"), { recursive: true });
await writeFile(path.join(here, "out", `${name}.json`), JSON.stringify({ repo, dtype, cfg: profile.id, threads: threadsArg, loadMs, results }, null, 2));
const pass = results.filter((row) => row.pass).length;
const times = results.filter((row) => row.ms).map((row) => row.ms).sort((a, b) => a - b);
console.log(JSON.stringify({
  name,
  pass,
  total: results.length,
  loadMs,
  medianMs: times[Math.floor(times.length / 2)] || 0,
  truncated: results.filter((row) => row.truncated).length,
}));
