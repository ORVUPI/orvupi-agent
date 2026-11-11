/** Línea base de la capa de reglas y de las fuentes. No descarga un modelo salvo --model. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../../web/v2/shared/ia/retrieve.mjs";
import { excerptAnswer, planTurn } from "../../web/v2/shared/ia/turn.mjs";
import { defaultModel } from "../../web/v2/shared/ia/models.mjs";
import { scoreItem, summarize } from "./score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

export async function loadBank() {
  const raw = await readFile(path.join(here, "bank/arqiven.jsonl"), "utf8");
  return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

export async function loadKnowledge() {
  const payload = JSON.parse(await readFile(path.join(repo, "web/v2/arqiven/knowledge-index.json"), "utf8"));
  return { payload, index: buildIndex(payload.chunks || []) };
}

export async function scoreRules(items, index, fetchImpl = null) {
  const results = [];
  for (const item of items) {
    const plan = await planTurn({
      question: item.question,
      lang: item.lang,
      index,
      model: defaultModel(),
      fetchImpl,
      allowWikipedia: Boolean(fetchImpl),
    });
    const output = plan.skipModel ? plan.text : excerptAnswer(item.lang, plan.sources[0]);
    results.push({ ...scoreItem(item, output, plan.sources), output: output.slice(0, 400), skippedModel: plan.skipModel });
  }
  return results;
}

function markdown(summary, meta) {
  const lines = [
    "# Línea base de ARQIVEN",
    "",
    `Fecha: ${meta.date}. Coste: 0 €. No se ha entrenado ni publicado.`,
    "",
    "ARQIVEN es la IA de ORVUPI. No hay un modelo propio. El catálogo sigue siendo de terceros y el de por defecto es SmolLM2-135M-Instruct (`smol135-cpu`).",
    "",
    "## Capa que ya responde sin el modelo",
    "",
    "Contrato, consejo financiero e identidad salen de reglas. El resto, si hay página, sale como extracto citado. La búsqueda es BM25 con n-gramas: un modelo de embeddings añadiría otra descarga grande y aquí el léxico basta para las páginas propias. Wikipedia, cuando hace falta, se consulta en el idioma de la persona. Esta tabla no es una puntuación de SmolLM2.",
    "",
    `- Ítems: ${summary.total}. Automáticos: ${summary.automatic}. Aciertos: ${summary.passed}. Rúbrica humana pendiente: ${summary.rubric}.`,
    `- Fallos críticos de esta capa: ${summary.critical}.`,
    "",
    "| Bloque | Aciertos | Total |",
    "| --- | --- | --- |",
  ];
  for (const [name, block] of Object.entries(summary.byBlock)) {
    lines.push(`| ${name} | ${block.pass} | ${block.total} |`);
  }
  lines.push("", "| Idioma | Aciertos | Total |", "| --- | --- | --- |");
  for (const lang of ["es", "en", "pt-BR", "ja", "ko"]) {
    const block = summary.byLang[lang] || { pass: 0, total: 0 };
    lines.push(`| ${lang} | ${block.pass} | ${block.total} |`);
  }
  lines.push(
    "",
    "## Modelo de terceros en esta máquina",
    "",
    meta.modelNote,
    "",
    "## Qué no es esta línea",
    "",
    "MMLU-Pro, GSM8K, HumanEval, IFEval, Global-MMLU, MGSM y TruthfulQA no se han corrido aquí. El cuaderno está en `eval/arqiven/benchmarks/`. Hace falta Kaggle o Colab gratis.",
    "",
    "## Fase 3, todavía sin hacer",
    "",
    "- Entrenar el LoRA en Kaggle o Colab sobre Qwen3.5-0.8B (si falla la exportación, Qwen3-0.6B o 1.7B).",
    "- Fusionar, evaluar en PyTorch, exportar a ONNX y volver a evaluar.",
    "- Ficha del modelo y registro de versiones, con marcha atrás.",
    "- Arqiven-1 Pro en servidor: solo si el propietario lo aprueba. No entra en este PR.",
    "- Triage semanal de los votos locales y reindexado cuando cambie la web.",
    "",
  );
  return lines.join("\n");
}

async function tryModel(items) {
  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    const generator = await pipeline("text-generation", "HuggingFaceTB/SmolLM2-135M-Instruct", { dtype: "q8", device: "cpu" });
    const subset = items.filter((item) => item.lang === "es" && ["ca", "safety", "identity", "general"].includes(item.block)).slice(0, 4);
    const rows = [];
    for (const item of subset) {
      const output = await generator([{ role: "user", content: item.question }], { max_new_tokens: 40, do_sample: false });
      const text = output?.[0]?.generated_text?.at?.(-1)?.content || "";
      rows.push({ id: item.id, score: scoreItem(item, text), text: String(text).slice(0, 300) });
    }
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const items = await loadBank();
  const { index } = await loadKnowledge();
  const results = await scoreRules(items, index, null);
  const summary = summarize(results);
  let modelNote = "No se ha lanzado SmolLM2 en esta corrida. El comando `node eval/arqiven/run-baseline.mjs --model` lo intenta en CPU si `@huggingface/transformers` está instalado. La CI no lo descarga.";
  if (process.argv.includes("--model")) {
    const model = await tryModel(items);
    if (!model.ok) modelNote = `SmolLM2 no se ha podido ejecutar en esta máquina: ${model.reason}`;
    else {
      const failed = model.rows.filter((row) => row.score.pass === false);
      modelNote = `Subconjunto es de ${model.rows.length} preguntas con SmolLM2-135M-Instruct q8 en CPU. Aciertos automáticos: ${model.rows.length - failed.length}. Esto no sustituye la tanda de lm-eval.`;
      await writeFile(path.join(here, "informe/modelo-muestra.json"), JSON.stringify(model.rows, null, 2));
    }
  }
  const report = { date: new Date().toISOString().slice(0, 10), summary, modelNote, criticalExamples: results.filter((item) => item.critical).slice(0, 12) };
  await mkdir(path.join(here, "informe"), { recursive: true });
  await writeFile(path.join(here, "informe/linea-base.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(here, "informe/linea-base.md"), markdown(summary, report));
  console.log(JSON.stringify({ critical: summary.critical, passed: summary.passed, automatic: summary.automatic, total: summary.total }));
}
