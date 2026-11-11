/** Sube el dataset y el kernel a Kaggle. No entrena en esta máquina.
 * La clave se lee de KAGGLE_USERNAME y KAGGLE_KEY. No va en los argumentos ni se imprime.
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, cp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIX, SOURCES } from "./sources.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

export function notebookFrom(source) {
  const chunks = source.split(/\n(?=# %%)/).filter((chunk) => chunk.trim());
  const cells = chunks.map((chunk) => {
    const [head, ...rest] = chunk.split("\n");
    const markdown = head.includes("markdown");
    const body = rest.join("\n").replace(/\s+$/, "");
    const text = markdown
      ? body.split("\n").map((line) => (line.startsWith("# ") ? line.slice(2) : line.replace(/^#/, ""))).join("\n")
      : body;
    const lines = text.split("\n");
    const cell = {
      cell_type: markdown ? "markdown" : "code",
      metadata: {},
      source: lines.map((line, index) => (index < lines.length - 1 ? `${line}\n` : line)),
    };
    if (!markdown) {
      cell.outputs = [];
      cell.execution_count = null;
    }
    return cell;
  });
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python" },
      kaggle: { accelerator: "NvidiaTeslaT4", isGpuEnabled: true, isInternetEnabled: true },
    },
    cells,
  };
}

export function planLaunch({ username, datasetSlug = "arqiven-sft", kernelSlug = "arqiven-lora" } = {}) {
  if (!username || !/^[A-Za-z0-9_-]+$/.test(username)) throw new Error("KAGGLE_USERNAME no es válido");
  return {
    datasetId: `${username}/${datasetSlug}`,
    kernelId: `${username}/${kernelSlug}`,
    accelerator: "NvidiaTeslaT4",
    enableGpu: true,
    enableInternet: true,
    isPrivate: true,
    kernelFile: "lora-qwen35.ipynb",
    commands: [
      ["datasets", "create", "-p"],
      ["kernels", "push", "-p"],
    ],
  };
}

export async function writeNotebook(target = path.join(here, "lora-qwen35.ipynb")) {
  const source = await readFile(path.join(here, "kaggle_train.py"), "utf8");
  const notebook = notebookFrom(source);
  await writeFile(target, JSON.stringify(notebook, null, 1));
  return notebook;
}

function redact(text) {
  let out = String(text || "");
  for (const name of ["KAGGLE_KEY", "KAGGLE_USERNAME"]) {
    const secret = process.env[name];
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out;
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("exit", (code) => resolve({ code: code ?? 1, stdout: redact(stdout), stderr: redact(stderr) }));
  });
}

async function stageDataset(dir, username) {
  const plan = planLaunch({ username });
  const metadata = JSON.parse(await readFile(path.join(here, "dataset-metadata.json"), "utf8"));
  metadata.id = plan.datasetId;
  await writeFile(path.join(dir, "dataset-metadata.json"), JSON.stringify(metadata, null, 2));
  const sample = path.join(here, "out", "sample.jsonl");
  try {
    await cp(sample, path.join(dir, "sample.jsonl"));
  } catch {
    await writeFile(path.join(dir, "sample.jsonl"), "");
  }
  await cp(path.join(repo, "eval/arqiven/bank/arqiven.jsonl"), path.join(dir, "bank.jsonl"));
  await cp(path.join(here, "kaggle_metrics.py"), path.join(dir, "kaggle_metrics.py"));
  const questions = (await readFile(path.join(repo, "eval/arqiven/bank/arqiven.jsonl"), "utf8"))
    .split("\n").filter(Boolean).map((line) => JSON.parse(line).question);
  await writeFile(path.join(dir, "eval-questions.json"), JSON.stringify(questions));
  await writeFile(path.join(dir, "sources.json"), JSON.stringify({
    target: MIX.target,
    seed: MIX.seed,
    parts: MIX.parts,
    sources: SOURCES.map((source) => ({
      id: source.id,
      dataset: source.dataset,
      config: source.config || null,
      splits: source.splits || [],
      license: source.license,
      block: source.block,
      languages: source.languages || [],
    })),
  }, null, 2));
  const licenses = SOURCES.map((source) => `${source.id}: ${source.license}. ${source.note}`).join("\n");
  await writeFile(path.join(dir, "LICENSES.txt"), `${licenses}\n`);
}

async function main() {
  const writeOnly = process.argv.includes("--write-notebook");
  const dryRun = process.argv.includes("--dry-run");
  await writeNotebook();
  if (writeOnly) {
    console.log("cuaderno escrito");
    return;
  }
  const username = process.env.KAGGLE_USERNAME || "";
  const key = process.env.KAGGLE_KEY || "";
  if (!username || !key) {
    console.error("Faltan KAGGLE_USERNAME y KAGGLE_KEY en el entorno. No se llama a Kaggle.");
    process.exit(2);
  }
  const plan = planLaunch({ username });
  if (dryRun) {
    console.log(JSON.stringify({ ...plan, key: undefined }));
    return;
  }
  const built = await run(process.execPath, [path.join(here, "build-dataset.mjs")], repo);
  if (built.code !== 0) {
    console.error(built.stderr || built.stdout);
    process.exit(built.code);
  }
  const datasetDir = await mkdtemp(path.join(tmpdir(), "arqiven-dataset-"));
  const kernelDir = await mkdtemp(path.join(tmpdir(), "arqiven-kernel-"));
  await stageDataset(datasetDir, username);
  const created = await run("kaggle", ["datasets", "create", "-p", datasetDir], datasetDir);
  if (created.code !== 0) {
    const version = await run("kaggle", ["datasets", "version", "-p", datasetDir, "-m", "mezcla ARQIVEN"], datasetDir);
    if (version.code !== 0) {
      console.error(created.stderr || created.stdout);
      console.error(version.stderr || version.stdout);
      process.exit(version.code || 1);
    }
  }
  const kernelMeta = JSON.parse(await readFile(path.join(here, "kernel-metadata.json"), "utf8"));
  kernelMeta.id = plan.kernelId;
  kernelMeta.dataset_sources = [plan.datasetId];
  kernelMeta.enable_gpu = "true";
  kernelMeta.enable_tpu = "false";
  kernelMeta.enable_internet = "true";
  kernelMeta.is_private = "true";
  kernelMeta.machine_shape = plan.accelerator;
  await mkdir(kernelDir, { recursive: true });
  await writeFile(path.join(kernelDir, "kernel-metadata.json"), JSON.stringify(kernelMeta, null, 2));
  await cp(path.join(here, "lora-qwen35.ipynb"), path.join(kernelDir, "lora-qwen35.ipynb"));
  let pushed = await run("kaggle", ["kernels", "push", "-p", kernelDir], kernelDir);
  if (pushed.code !== 0 && /machine|accelerator|shape/i.test(`${pushed.stderr}\n${pushed.stdout}`)) {
    delete kernelMeta.machine_shape;
    await writeFile(path.join(kernelDir, "kernel-metadata.json"), JSON.stringify(kernelMeta, null, 2));
    pushed = await run("kaggle", ["kernels", "push", "-p", kernelDir], kernelDir);
  }
  if (pushed.stdout) console.log(pushed.stdout);
  if (pushed.code !== 0) {
    console.error(pushed.stderr || "kaggle kernels push falló");
    process.exit(pushed.code);
  }
  console.log(`kernel ${plan.kernelId} en cola con GPU T4`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
