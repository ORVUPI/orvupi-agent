import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultKillSwitchPath, readKillSwitch } from "./kill-switch.js";
import { createOrchestrator } from "./orchestrator.js";
import type { Orchestrator } from "./orchestrator.js";
import { repoRoot } from "./paths.js";
import { ALLOWED_ACTIONS } from "./types.js";
import type { DispatchResult } from "./types.js";

/**
 * Kill-switch drill (phase P3).
 *
 * Runs only against a temporary copy of the kill-switch state. It never edits
 * state/killswitch.json in the repository, makes no network calls, and uses no
 * secrets. Every allowlisted action is attempted in each step.
 */

export const DRILL_ROUNDS = 2;

export type DrillAttempt = {
  action: string;
  payloadKind: "empty" | "note" | "social-draft";
  ok: boolean;
  code: string;
  onChainEffect: false | null;
};

export type DrillStep = {
  id: string;
  title: string;
  pass: boolean;
  attempts: number;
  refused: number;
  expected: "refuse" | "allow" | "check";
  detail: string;
  results: DrillAttempt[];
};

export type DrillReport = {
  drill: "killswitch";
  version: 1;
  date: string;
  commit: string | null;
  node: string;
  network: false;
  secrets: false;
  repoStateUntouched: boolean;
  ok: boolean;
  steps: DrillStep[];
};

export type DrillOptions = {
  root?: string;
  commit?: string | null;
  now?: () => string;
  workDir?: string;
};

type Attempt = { action: string; payloadKind: DrillAttempt["payloadKind"]; payload?: unknown };

const DISENGAGED = {
  version: 1,
  engaged: false,
  since: null,
  reason: null,
  scope: "ops-social",
};

function attemptsFor(rounds: number): Attempt[] {
  const list: Attempt[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (const action of ALLOWED_ACTIONS) {
      if (action === "log:append") {
        list.push({ action, payloadKind: "note", payload: { kind: "note", detail: `simulacro ${round + 1}` } });
        list.push({
          action,
          payloadKind: "social-draft",
          payload: { kind: "social-draft", detail: `borrador de simulacro ${round + 1}` },
        });
      } else {
        list.push({ action, payloadKind: "empty" });
      }
    }
  }
  return list;
}

function toAttempt(item: Attempt, result: DispatchResult): DrillAttempt {
  return {
    action: item.action,
    payloadKind: item.payloadKind,
    ok: result.ok,
    code: result.ok ? "ok" : result.code,
    onChainEffect: result.ok ? null : result.onChainEffect,
  };
}

function runAll(orch: Orchestrator, rounds: number): DrillAttempt[] {
  return attemptsFor(rounds).map((item) => toAttempt(item, orch.dispatch(item.action, item.payload)));
}

function refusedWith(results: DrillAttempt[], codes: readonly string[]): boolean {
  return (
    results.length > 0 &&
    results.every((r) => !r.ok && r.onChainEffect === false && codes.includes(r.code))
  );
}

function sha256File(filePath: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

function normalizeCommit(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
}

function step(
  id: string,
  title: string,
  expected: DrillStep["expected"],
  results: DrillAttempt[],
  pass: boolean,
  detail: string,
): DrillStep {
  return {
    id,
    title,
    pass,
    attempts: results.length,
    refused: results.filter((r) => !r.ok).length,
    expected,
    detail,
    results,
  };
}

export function runKillSwitchDrill(options: DrillOptions = {}): DrillReport {
  const root = options.root ?? repoRoot();
  const now = options.now ?? (() => new Date().toISOString());
  const repoState = defaultKillSwitchPath(root);
  const repoStateHashBefore = sha256File(repoState);

  const ownDir = options.workDir === undefined;
  const dir = options.workDir ?? mkdtempSync(path.join(tmpdir(), "orvupi-drill-"));
  const statePath = path.join(dir, "killswitch.json");
  const steps: DrillStep[] = [];

  try {
    // 0. Temporary copy of the committed state. It must be readable and disengaged.
    writeFileSync(statePath, readFileSync(repoState));
    const orch = createOrchestrator({ root, killSwitchPath: statePath, now });
    const copied = readKillSwitch(statePath);
    const baseline = runAll(orch, 1);
    steps.push(
      step(
        "0-baseline",
        "Copia temporal del estado: desactivado, las acciones permitidas responden",
        "allow",
        baseline,
        copied.ok && !copied.state.engaged && baseline.every((r) => r.ok),
        "Punto de partida con el mismo orquestador que se usa en todo el simulacro.",
      ),
    );

    // a. Engage the switch in the temporary copy.
    const engagedAt = now();
    writeFileSync(
      statePath,
      JSON.stringify({ version: 1, engaged: true, since: engagedAt, reason: "simulacro semanal", scope: "ops-social" }),
    );
    const engagedRead = readKillSwitch(statePath);
    steps.push(
      step(
        "a-engage",
        "Activar el kill-switch en la copia temporal",
        "check",
        [],
        engagedRead.ok && engagedRead.state.engaged,
        "El archivo temporal se lee bien y dice engaged: true.",
      ),
    );

    // b. Every allowlisted action is refused. Same orchestrator instance: the
    //    switch takes effect on the next action, with no restart.
    const whileEngaged = runAll(orch, DRILL_ROUNDS);
    steps.push(
      step(
        "b-refuse-all",
        "Con el kill-switch activado, todas las acciones permitidas se rechazan",
        "refuse",
        whileEngaged,
        whileEngaged.length >= 10 && refusedWith(whileEngaged, ["kill-switch-engaged", "no-publish-while-killed"]),
        "Se exige un mínimo de 10 intentos. Efecto en la acción siguiente, sin reiniciar el proceso.",
      ),
    );

    // c. Fail-closed: missing, corrupt or malformed file.
    const failCases: { id: string; title: string; apply: () => void; codes: string[] }[] = [
      {
        id: "c1-missing",
        title: "archivo borrado",
        apply: () => unlinkSync(statePath),
        codes: ["kill-switch-unreadable"],
      },
      {
        id: "c2-corrupt-json",
        title: "archivo corrupto (JSON cortado)",
        apply: () => writeFileSync(statePath, '{"version": 1, "engaged": fal'),
        codes: ["kill-switch-invalid"],
      },
      {
        id: "c3-empty",
        title: "archivo vacío",
        apply: () => writeFileSync(statePath, ""),
        codes: ["kill-switch-invalid"],
      },
      {
        id: "c4-wrong-shape",
        title: "forma incorrecta (falta scope)",
        apply: () => writeFileSync(statePath, JSON.stringify({ version: 1, engaged: false, since: null, reason: null })),
        codes: ["kill-switch-invalid"],
      },
      {
        id: "c5-oversized",
        title: "archivo demasiado grande",
        apply: () => writeFileSync(statePath, " ".repeat(8192)),
        codes: ["kill-switch-unreadable"],
      },
    ];
    for (const failCase of failCases) {
      failCase.apply();
      const results = runAll(orch, 1);
      steps.push(
        step(
          failCase.id,
          `Fail-closed: ${failCase.title}; todas las acciones se rechazan`,
          "refuse",
          results,
          refusedWith(results, failCase.codes),
          `Código esperado: ${failCase.codes.join(", ")}.`,
        ),
      );
    }

    // d. Disengage: normal behaviour returns.
    writeFileSync(statePath, JSON.stringify(DISENGAGED));
    const restored = runAll(orch, 1);
    steps.push(
      step(
        "d-restore",
        "Desactivar el kill-switch: las acciones permitidas vuelven a responder",
        "allow",
        restored,
        restored.length > 0 && restored.every((r) => r.ok),
        "Mismo orquestador; no hace falta reiniciar nada.",
      ),
    );
  } finally {
    if (ownDir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // e. The committed state file was never touched.
  const repoStateHashAfter = sha256File(repoState);
  const repoStateUntouched =
    repoStateHashBefore !== null && repoStateHashBefore === repoStateHashAfter && existsSync(repoState);
  steps.push(
    step(
      "e-repo-state-untouched",
      "El archivo real state/killswitch.json no se ha modificado",
      "check",
      [],
      repoStateUntouched,
      "Se compara el sha256 antes y después del simulacro.",
    ),
  );

  return {
    drill: "killswitch",
    version: 1,
    date: now(),
    commit: normalizeCommit(options.commit),
    node: process.version,
    network: false,
    secrets: false,
    repoStateUntouched,
    ok: steps.length > 0 && steps.every((s) => s.pass),
    steps,
  };
}

export function drillMarkdown(report: DrillReport): string {
  const lines = [
    "## Simulacro del kill-switch",
    "",
    `- Resultado: **${report.ok ? "VERDE (todos los pasos pasan)" : "ROJO (algo falla)"}**`,
    `- Fecha (UTC): ${report.date}`,
    `- Commit: ${report.commit ?? "local (sin SHA)"}`,
    `- Node: ${report.node}`,
    "- El simulacro no hace llamadas de red ni usa secretos propios. Solo usa una copia temporal del estado.",
    "",
    "| Paso | Qué se comprueba | Intentos | Rechazados | Resultado |",
    "| --- | --- | ---: | ---: | --- |",
  ];
  for (const s of report.steps) {
    lines.push(`| \`${s.id}\` | ${s.title} | ${s.attempts} | ${s.refused} | ${s.pass ? "pasa" : "FALLA"} |`);
  }
  lines.push(
    "",
    "El kill-switch solo para las acciones de este paquete. No pausa transferencias de holders ni congela cuentas. Un simulacro en verde solo demuestra lo que ese simulacro comprueba.",
    "",
  );
  return lines.join("\n");
}
