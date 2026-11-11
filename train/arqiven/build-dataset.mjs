/** Arma el dataset del LoRA. Por defecto no descarga nada.
 * Con --fetch pide filas públicas al visor de Hugging Face, sin clave y sin GPU.
 * No ejecuta el entrenamiento.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanExamples, dialogueExamples, exampleFromRow, localOrvupiExamples, safetyExamples, sampleToMix } from "./mix.mjs";
import { EXCLUDED, MIX, SOURCES } from "./sources.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

async function bankQuestions() {
  const file = path.join(repo, "eval/arqiven/bank/arqiven.jsonl");
  const raw = await readFile(file, "utf8");
  return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line).question);
}

async function fetchRows(source, limit) {
  const rows = [];
  for (const split of source.splits || []) {
    let offset = 0;
    while (rows.length < limit) {
      const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(source.dataset)}&config=${encodeURIComponent(source.config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=100`;
      const response = await fetch(url, { headers: { "user-agent": "ORVUPI-ARQIVEN-dataset/0 (research; no training in CI)" } });
      if (!response.ok) break;
      const payload = await response.json();
      const batch = payload.rows || [];
      if (!batch.length) break;
      for (const item of batch) {
        const row = item.row || item;
        if (source.languages && row.language_code && !source.languages.includes(String(row.language_code).slice(0, 2))) continue;
        const example = exampleFromRow(row, source);
        if (example) rows.push(example);
        if (rows.length >= limit) break;
      }
      offset += batch.length;
      if (batch.length < 100) break;
    }
  }
  return rows;
}

async function main() {
  const fetchRemote = process.argv.includes("--fetch");
  const limit = Number(arg("--limit", "20"));
  const questions = await bankQuestions();
  const index = JSON.parse(await readFile(path.join(repo, "web/v2/arqiven/knowledge-index.json"), "utf8"));
  let examples = localOrvupiExamples(index.chunks.filter((chunk) => chunk.curated)).concat(safetyExamples(), dialogueExamples());
  if (fetchRemote) {
    for (const source of SOURCES) {
      if (source.dataset === "local") continue;
      const got = await fetchRows(source, limit);
      examples = examples.concat(got);
      console.log(`${source.id} ${got.length}`);
    }
  }
  const cleaned = cleanExamples(examples, questions);
  const mixed = sampleToMix(cleaned.kept, MIX.parts, MIX.target, MIX.seed);
  const byBlock = {};
  for (const item of mixed.examples) byBlock[item.block] = (byBlock[item.block] || 0) + 1;
  const outDir = path.join(here, "out");
  await mkdir(outDir, { recursive: true });
  const manifest = {
    built: new Date().toISOString(),
    fetch: fetchRemote,
    target: MIX.target,
    seed: MIX.seed,
    parts: MIX.parts,
    quotas: mixed.quotas,
    short: mixed.short,
    byBlock,
    kept: mixed.examples.length,
    droppedContamination: cleaned.dropped,
    sources: SOURCES.map((source) => ({ id: source.id, url: source.url, license: source.license, note: source.note })),
    excluded: EXCLUDED,
    note: "Las cuotas son el objetivo de 50 000. Si un bloque no llega (sobre todo aclaraciones locales), short lo dice y no se rellena con otro bloque. El cuaderno de Kaggle completa la descarga pública y entrena; este script no lo lanza.",
  };
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(outDir, "sample.jsonl"), mixed.examples.map((item) => JSON.stringify({ messages: item.messages, source: item.source, license: item.license, block: item.block })).join("\n") + "\n");
  console.log(`kept ${mixed.examples.length} dropped ${cleaned.dropped}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
