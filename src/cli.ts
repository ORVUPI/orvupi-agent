import { appendFileSync } from "node:fs";
import path from "node:path";
import { scanTree } from "./forbidden-scan.js";
import { createOrchestrator } from "./orchestrator.js";
import { repoRoot } from "./paths.js";
import { logsStatus } from "./logs-status.js";
import { checkLogsUpdate, runUrl } from "./public-log.js";
import { appendDailyEntry, defaultLogsDir, readLogsTree, verifyLogsTree } from "./public-log-files.js";

const command = process.argv[2];

if (command === "scan:forbidden") {
  const root = repoRoot();
  const findings = [
    ...scanTree(path.join(root, "src")),
    ...scanTree(path.join(root, "scripts")),
    ...scanTree(path.join(root, "policy")),
    ...scanTree(path.join(root, "state")),
  ];
  if (findings.length > 0) {
    console.error(JSON.stringify({ ok: false, findings }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, findings: 0 }));
} else if (command === "ppm:print" || command === "ppm:check") {
  const result = createOrchestrator().dispatch(command);
  if (result.ok) {
    console.log(`${JSON.stringify(result.output, null, 2)}\n`);
    process.exit(0);
  }
  console.log(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(2);
} else if (command === "logs:verify") {
  const dir = process.argv[3] ? path.resolve(process.argv[3]) : defaultLogsDir(repoRoot());
  const { tree, problems } = readLogsTree(dir);
  const result = verifyLogsTree(tree);
  const ok = problems.length === 0 && result.ok;
  console.log(JSON.stringify({ ...result, ok, problems: [...problems, ...result.problems] }, null, 2));
  process.exit(ok ? 0 : 1);
} else if (command === "logs:status") {
  const dir = process.argv[3] ? path.resolve(process.argv[3]) : defaultLogsDir(repoRoot());
  const { tree, problems } = readLogsTree(dir);
  const status = logsStatus(tree);
  const ok = problems.length === 0 && status.ok;
  console.log(JSON.stringify({ ...status, ok, problems: [...problems, ...status.problems] }, null, 2));
  process.exit(ok ? 0 : 1);
} else if (command === "logs:daily") {
  const root = repoRoot();
  const result = appendDailyEntry({
    root,
    commit: process.env.GITHUB_SHA ?? null,
    evidence: runUrl(process.env.GITHUB_REPOSITORY, process.env.GITHUB_RUN_ID),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.ok && process.env.GITHUB_STEP_SUMMARY) {
    const e = result.entry;
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "## Registro diario (log público)",
        "",
        `- Entrada: ${e.seq} · ${e.ts}`,
        `- Kill-switch: ${e.detail.killSwitch.readable ? (e.detail.killSwitch.engaged ? "activado" : "desactivado") : "ilegible"}`,
        `- Simulacro: ${e.detail.drill.ran ? (e.detail.drill.ok ? "verde" : "rojo") : "no ejecutado"} (${e.detail.drill.passed}/${e.detail.drill.steps} pasos)`,
        `- Hash: \`${e.hash}\``,
        `- Ancla: \`logs/${result.anchor}\``,
        "- Modo: prototipo. El agente de este repositorio no publica en redes sociales, no firma y no mueve fondos. Los posts de @ORVUPI los publica otro agente de IA, fuera de este repositorio.",
        "",
      ].join("\n"),
    );
  }
  process.exit(result.ok ? 0 : 1);
} else if (command === "logs:check-update") {
  const currentDir = process.argv[3];
  const nextDir = process.argv[4];
  if (!currentDir || !nextDir) {
    console.error("Usage: logs:check-update <current logs dir> <new logs dir> [--any]");
    process.exit(1);
  }
  const current = readLogsTree(path.resolve(currentDir));
  const next = readLogsTree(path.resolve(nextDir));
  const result = checkLogsUpdate(current.tree, next.tree, process.argv.includes("--any") ? null : 1);
  const problems = [...current.problems, ...next.problems, ...result.problems];
  console.log(JSON.stringify({ ...result, ok: problems.length === 0, problems }, null, 2));
  process.exit(problems.length === 0 ? 0 : 1);
} else {
  console.error("Commands: ppm:print, ppm:check, scan:forbidden, logs:verify, logs:status, logs:daily, logs:check-update");
  process.exit(1);
}
