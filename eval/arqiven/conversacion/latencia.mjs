/** Latencia con 4 hilos: 5 preguntas generales y 5 de ORVUPI, en cinco idiomas.
 * node eval/arqiven/conversacion/latencia.mjs [repo] [dtype]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../../../web/v2/shared/ia/retrieve.mjs";
import { planTurn } from "../../../web/v2/shared/ia/turn.mjs";
import { sourceNote, sourcedSystem, sourcedTurn } from "../../../web/v2/shared/ia/prompt.mjs";
import { profileById } from "../../../web/v2/shared/ia/profile.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const LANG_NAME = { es: "español", en: "English", "pt-BR": "português", ja: "日本語", ko: "한국어" };
const profile = profileById("v1");

export const LATENCY = [
  ["general", "es", "¿Qué es un faro?"],
  ["general", "es", "¿Cómo se hierve el agua?"],
  ["general", "es", "¿Para qué sirve una brújula?"],
  ["general", "es", "¿Qué es la lluvia?"],
  ["general", "es", "¿Qué es un mapa?"],
  ["general", "en", "What is a lighthouse?"],
  ["general", "en", "How do you boil water?"],
  ["general", "en", "What is a compass for?"],
  ["general", "en", "What is rain?"],
  ["general", "en", "What is a map?"],
  ["general", "pt-BR", "O que é um farol?"],
  ["general", "pt-BR", "Como se ferve a água?"],
  ["general", "pt-BR", "Para que serve uma bússola?"],
  ["general", "pt-BR", "O que é a chuva?"],
  ["general", "pt-BR", "O que é um mapa?"],
  ["general", "ja", "灯台とは何ですか。"],
  ["general", "ja", "水はどうやって沸かしますか。"],
  ["general", "ja", "方位磁針は何に使いますか。"],
  ["general", "ja", "雨とは何ですか。"],
  ["general", "ja", "地図とは何ですか。"],
  ["general", "ko", "등대란 무엇입니까?"],
  ["general", "ko", "물은 어떻게 끓이나요?"],
  ["general", "ko", "나침반은 무엇에 쓰나요?"],
  ["general", "ko", "비란 무엇입니까?"],
  ["general", "ko", "지도란 무엇입니까?"],
  ["orvupi", "es", "¿Qué es ORVUPI Sonar?"],
  ["orvupi", "es", "¿Qué es Work?"],
  ["orvupi", "es", "¿Qué es Studio?"],
  ["orvupi", "es", "¿Qué es Academy?"],
  ["orvupi", "es", "¿Qué es Verify?"],
  ["orvupi", "en", "What is ORVUPI Sonar?"],
  ["orvupi", "en", "What is Work?"],
  ["orvupi", "en", "What is Studio?"],
  ["orvupi", "en", "What is Academy?"],
  ["orvupi", "en", "What is Verify?"],
  ["orvupi", "pt-BR", "O que é o ORVUPI Sonar?"],
  ["orvupi", "pt-BR", "O que é o Work?"],
  ["orvupi", "pt-BR", "O que é o Studio?"],
  ["orvupi", "pt-BR", "O que é a Academy?"],
  ["orvupi", "pt-BR", "O que é o Verify?"],
  ["orvupi", "ja", "ORVUPI Sonar とは何ですか。"],
  ["orvupi", "ja", "Work とは何ですか。"],
  ["orvupi", "ja", "Studio とは何ですか。"],
  ["orvupi", "ja", "Academy とは何ですか。"],
  ["orvupi", "ja", "Verify とは何ですか。"],
  ["orvupi", "ko", "ORVUPI Sonar는 무엇입니까?"],
  ["orvupi", "ko", "Work는 무엇입니까?"],
  ["orvupi", "ko", "Studio는 무엇입니까?"],
  ["orvupi", "ko", "Academy는 무엇입니까?"],
  ["orvupi", "ko", "Verify는 무엇입니까?"],
].map(([kind, lang, ask]) => ({ kind, lang, ask }));

function median(values) {
  const list = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!list.length) return 0;
  return list[Math.floor(list.length / 2)];
}

const worker = await readFile(path.join(repoRoot, "web/v2/arqiven/engine-worker.mjs"), "utf8");
const system = worker.match(/const SYSTEM_V1 = (\[[\s\S]*?\]\.join\(" "\));/);
const SYSTEM_V1 = Function(`return ${system[1]}`)();
const kn = JSON.parse(await readFile(path.join(repoRoot, "web/v2/arqiven/knowledge-index.json"), "utf8"));
const index = buildIndex(kn.chunks || []);
const [repo, dtype] = [process.argv[2] || "onnx-community/Qwen3.5-0.8B-Text-ONNX", process.argv[3] || "q4"];
const threads = 4;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pipeline, env, TextStreamer, InterruptableStoppingCriteria } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  const loaded = Date.now();
  const gen = await pipeline("text-generation", repo, { dtype, device: "cpu", session_options: { intraOpNumThreads: threads } });
  const loadMs = Date.now() - loaded;
  const rows = [];
  for (const item of LATENCY) {
    const plan = await planTurn({ question: item.ask, lang: item.lang, index, history: [], fetchImpl: null });
    const history = [{ role: "user", content: item.ask, mode: "model" }];
    const sourced = sourcedTurn(item.ask, plan.promptSources);
    const language = LANG_NAME[item.lang] || "español";
    const prompt = sourced
      ? sourcedSystem(language) + sourceNote(plan.promptSources)
      : `${SYSTEM_V1} Responde en ${language}.`;
    const messages = [{ role: "system", content: prompt }, ...history];
    const promptTokens = messages.reduce((sum, message) => sum + gen.tokenizer.encode(String(message.content || "")).length, 0);
    let ttft = 0;
    let acc = "";
    const started = Date.now();
    if (!plan.skipModel) {
      const stopper = new InterruptableStoppingCriteria();
      const counting = new TextStreamer(gen.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (chunk) => {
          if (!ttft) ttft = Date.now() - started;
          acc += chunk;
          const sentences = acc.split(/[.!?。！？]+/).filter((part) => part.trim().length > 8).length;
          if (sourced && sentences >= 3) stopper.interrupt();
        },
      });
      await gen(messages, {
        max_new_tokens: sourced ? 40 : 64,
        do_sample: false,
        repetition_penalty: profile.repetitionPenalty,
        ...(profile.disableThinking ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        streamer: counting,
        stopping_criteria: stopper,
      });
    }
    const ms = plan.skipModel ? 0 : Date.now() - started;
    const out = (plan.skipModel ? plan.text : acc).slice(0, 280);
    const row = { ...item, sourced, skip: plan.skipModel, promptTokens, ttft, ms, out };
    rows.push(row);
    console.error(`${item.kind} ${item.lang} ttft ${ttft}ms total ${ms}ms prompt ${promptTokens} ${out.slice(0, 80).replace(/\s+/g, " ")}`);
  }
  const modelRows = rows.filter((row) => !row.skip);
  const summary = {
    repo, dtype, threads, loadMs, profile: profile.id,
    general: {
      n: modelRows.filter((row) => row.kind === "general").length,
      ttft: median(modelRows.filter((row) => row.kind === "general").map((row) => row.ttft)),
      total: median(modelRows.filter((row) => row.kind === "general").map((row) => row.ms)),
      prompt: median(modelRows.filter((row) => row.kind === "general").map((row) => row.promptTokens)),
    },
    orvupi: {
      n: modelRows.filter((row) => row.kind === "orvupi").length,
      ttft: median(modelRows.filter((row) => row.kind === "orvupi").map((row) => row.ttft)),
      total: median(modelRows.filter((row) => row.kind === "orvupi").map((row) => row.ms)),
      prompt: median(modelRows.filter((row) => row.kind === "orvupi").map((row) => row.promptTokens)),
    },
  };
  await mkdir(path.join(here, "out"), { recursive: true });
  await writeFile(path.join(here, "out", "latencia-qwen35.json"), JSON.stringify({ summary, rows }, null, 2));
  console.log(JSON.stringify(summary));
}
