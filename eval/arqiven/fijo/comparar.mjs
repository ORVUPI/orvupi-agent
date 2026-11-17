/** Compara modelos base con el mismo código. No entrena y no inventa una cifra.
 * Uso: node eval/arqiven/fijo/comparar.mjs qwen3:8b olmo2:13b
 * Cada modelo corre el fijo en --mitigado2, el reservado 2 y el reservado 3.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, "run.mjs");
const outDir = path.join(here, "out");

const jobs = [
  { key: "fijo", args: ["--mitigado2"], file: "resultado-mitigado2.json" },
  { key: "reservado2", args: ["--reservado2"], file: "resultado-reservado-2.json" },
  { key: "reservado3", args: ["--reservado3"], file: "resultado-reservado-3.json" },
];

export function renderTable(rows) {
  const lines = [
    "| Modelo | Fijo | Reservado 2 | Reservado 3 | Total |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.model} | ${row.fijo} | ${row.reservado2} | ${row.reservado3} | ${row.total} |`),
  ];
  const best = rows.reduce((top, row) => (row.totalScore > top.totalScore ? row : top), rows[0]);
  if (best) lines.push("", `Mayor total: ${best.model} (${best.total}).`);
  return lines.join("\n");
}

function runJob(model, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, ...args], {
      cwd: path.resolve(here, "../../.."),
      env: { ...process.env, ARQIVEN_MODEL: model },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${model} salió con código ${code}`))));
  });
}

async function readScore(file) {
  const saved = JSON.parse(await readFile(path.join(outDir, file), "utf8"));
  const failed = (saved.rows || []).filter((row) => !row.pass).map((row) => row.id);
  return { passed: saved.passed, total: saved.total, failed };
}

export async function compareModels(models) {
  const rows = [];
  for (const model of models) {
    const safe = model.replace(/[^A-Za-z0-9._-]+/g, "_");
    const scores = {};
    for (const job of jobs) {
      await runJob(model, job.args);
      const score = await readScore(job.file);
      scores[job.key] = score;
      await writeFile(path.join(outDir, `${safe}-${job.file}`), `${JSON.stringify({ model, ...score }, null, 2)}\n`);
    }
    const totalScore = scores.fijo.passed + scores.reservado2.passed + scores.reservado3.passed;
    const totalCount = scores.fijo.total + scores.reservado2.total + scores.reservado3.total;
    rows.push({
      model,
      fijo: `${scores.fijo.passed}/${scores.fijo.total}`,
      reservado2: `${scores.reservado2.passed}/${scores.reservado2.total}`,
      reservado3: `${scores.reservado3.passed}/${scores.reservado3.total}`,
      total: `${totalScore}/${totalCount}`,
      totalScore,
      failed: {
        fijo: scores.fijo.failed,
        reservado2: scores.reservado2.failed,
        reservado3: scores.reservado3.failed,
      },
    });
  }
  const table = `${renderTable(rows)}\n`;
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "comparativa.md"), table);
  console.log(table);
  return rows;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const models = process.argv.slice(2).filter((item) => item && !item.startsWith("-"));
  if (!models.length) {
    console.error("Uso: node eval/arqiven/fijo/comparar.mjs qwen3:8b olmo2:13b");
    process.exit(1);
  }
  await compareModels(models);
}
