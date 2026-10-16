import path from "node:path";
import { isRecord, readStrictJson } from "./json-file.js";
import type { LoadedPolicy } from "./limits.js";

export type PpmBox = {
  status: "pending" | "repo-tested" | "not-applicable";
  provenByTests: boolean;
  ppmMarked: boolean;
  markedOn: string | null;
  notApplicableOn: string | null;
  publicEvidence: string | null;
  summary: string;
  summaryEn: string;
};

/**
 * Public evidence behind the marked boxes (limits and kill-switch; logs unmarked since 2026-10-16),
 * reviewed on 2026-10-05 with legal sign-off. Wallet is not-applicable from
 * 2026-10-05 (by design: the agent has no wallet or keys). The public count
 * stays "2 of 4 marked · 1 not applicable" (logs unmarked since 2026-10-16), never a silent 2/2.
 * Placeholders `__URL_…__` must be replaced by real Actions run URLs before
 * merging: evaluatePpmHonesty rejects anything that is not a run URL of this
 * repository, so CI stays red while a placeholder is left.
 */
export const RUN_URL = /^https:\/\/github\.com\/ORVUPI\/orvupi-agent\/actions\/runs\/[0-9]+$/;
export const PPM_MARKED_ON = "2026-10-05";
export const PPM_WALLET_NOT_APPLICABLE_ON = "2026-10-05";
export const PPM_TOTAL = 4;
export const LOGS_DAILY_RUN = "https://github.com/ORVUPI/orvupi-agent/actions/runs/37274282121";
export const LIMITS_CI_RUN = "https://github.com/ORVUPI/orvupi-agent/actions/runs/37278171372";
export const KILL_SWITCH_DRILL_RUNS: readonly string[] = [
  "https://github.com/ORVUPI/orvupi-agent/actions/runs/36264436020",
  "https://github.com/ORVUPI/orvupi-agent/actions/runs/36397668286",
  "https://github.com/ORVUPI/orvupi-agent/actions/runs/37284177840",
];

export type PpmReport = {
  schema: "orvupi.ppm/v0";
  package: "@orvupi/agents";
  packageVersion: string;
  policyId: string;
  policyVersion: string;
  policySha256: string;
  tokenMint: string;
  approved: boolean;
  ppmMarkedCount: number;
  ppmTotal: number;
  ppmNotApplicableCount: number;
  network: false;
  signing: false;
  scope: string;
  boxes: {
    wallet: PpmBox;
    logs: PpmBox;
    limits: PpmBox;
    killSwitch: PpmBox & { publicDrill: boolean; publicDrills: readonly string[]; scope: "ops-social" };
  };
};

export function readPackageVersion(root: string): string | null {
  const read = readStrictJson(path.join(root, "package.json"), 256 * 1024);
  if (!read.ok || !isRecord(read.value)) {
    return null;
  }
  if (read.value.name !== "@orvupi/agents" || typeof read.value.version !== "string") {
    return null;
  }
  return read.value.version;
}

export function buildPpmReport(input: {
  packageVersion: string;
  policy: LoadedPolicy;
  mint: string;
}): PpmReport {
  return {
    schema: "orvupi.ppm/v0",
    package: "@orvupi/agents",
    packageVersion: input.packageVersion,
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    policySha256: input.policy.sha256,
    tokenMint: input.mint,
    approved: false,
    ppmMarkedCount: 2,
    ppmTotal: PPM_TOTAL,
    ppmNotApplicableCount: 1,
    network: false,
    signing: false,
    scope:
      "Two public PPM boxes are marked (limits and kill-switch, 2026-10-05) after review with legal sign-off. Logs was marked on 2026-10-05 and is unmarked since 2026-10-16: the public log chain restarted and its earlier Bitcoin-confirmed stamps no longer apply to the live chain (the previous chain is kept in tag pre-orvupi-2026-10-16). Wallet is not-applicable from 2026-10-05 by design (no agent wallet or keys). Public count: 2 of 4 marked · 1 not applicable. A marked box is not an audit: a green run only proves what it checks, in that version of the code.",
    boxes: {
      wallet: {
        status: "not-applicable",
        provenByTests: false,
        ppmMarked: false,
        markedOn: null,
        notApplicableOn: PPM_WALLET_NOT_APPLICABLE_ON,
        publicEvidence: null,
        summary:
          "No aplica desde el 05-10-2026: el agente no tiene wallet ni claves por diseño (decisión del creador). La wallet pública del proyecto (SOL) no cuenta para marcar esta casilla. No es una casilla marcada.",
        summaryEn:
          "Not applicable since 2026-10-05: the agent has no wallet or keys by design (creator decision). The project's public SOL wallet does not count toward marking this box. This is not a marked box.",
      },
      logs: {
        status: "repo-tested",
        provenByTests: true,
        ppmMarked: false,
        markedOn: null,
        notApplicableOn: null,
        publicEvidence: null,
        summary:
          "Log público diario de solo añadir en logs/, escrito por el workflow daily-log, con anclas selladas por OpenTimestamps. Casilla desmarcada desde el 16-10-2026: la cadena se reinició con el cambio a ORVUPI y los sellos confirmados en Bitcoin eran de la cadena anterior (conservada en el tag pre-orvupi-2026-10-16). Se vuelve a marcar con entradas en ≥7 días UTC, un sello confirmado de la cadena nueva comprobado a mano (pasos en LOGS.md) y OK legal.",
        summaryEn:
          "Public daily append-only log in logs/, written by the daily-log workflow, with anchors stamped by OpenTimestamps. Box unmarked since 2026-10-16: the chain restarted with the move to ORVUPI and the Bitcoin-confirmed stamps belonged to the previous chain (kept in tag pre-orvupi-2026-10-16). It can be marked again with entries on ≥7 distinct UTC days, a confirmed stamp of the new chain checked by hand (steps in LOGS.md) and legal sign-off.",
      },
      limits: {
        status: "repo-tested",
        provenByTests: true,
        ppmMarked: true,
        markedOn: PPM_MARKED_ON,
        notApplicableOn: null,
        publicEvidence: LIMITS_CI_RUN,
        summary:
          "Límites v1 escritos en LIMITS.md y aplicados en el código, cada uno con su test. Casilla marcada el 05-10-2026 con una ejecución pública de la CI en verde y el OK legal. Marcada no significa auditada. Si una CI posterior falla en estos tests, se desmarca.",
        summaryEn:
          "Limits v1 are written in LIMITS.md and enforced in code, each with its test. Box marked on 2026-10-05 with a green public CI run and legal sign-off. Marked does not mean audited. If a later CI run fails these tests, the box is unmarked.",
      },
      killSwitch: {
        status: "repo-tested",
        provenByTests: true,
        ppmMarked: true,
        markedOn: PPM_MARKED_ON,
        notApplicableOn: null,
        publicEvidence: KILL_SWITCH_DRILL_RUNS[KILL_SWITCH_DRILL_RUNS.length - 1] ?? null,
        publicDrill: true,
        publicDrills: KILL_SWITCH_DRILL_RUNS,
        scope: "ops-social",
        summary:
          "Lee state/killswitch.json y es fail-closed, cubierto por tests. Casilla marcada el 05-10-2026 tras simulacros públicos seguidos en verde (26-09, 28-09 y 05-10) y el OK legal. Solo para el agente: no pausa transferencias ni congela tokens o cuentas. Si un simulacro sale en rojo, se desmarca.",
        summaryEn:
          "Reads state/killswitch.json and fails closed, covered by tests. Box marked on 2026-10-05 after consecutive green public drills (26-09, 28-09 and 05-10) and legal sign-off. Agent only: it cannot pause transfers or freeze tokens or accounts. If a drill fails, the box is unmarked.",
      },
    },
  };
}

export function evaluatePpmHonesty(report: PpmReport): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (report.approved !== false) {
    problems.push("approved");
  }
  if (report.signing !== false) {
    problems.push("signing");
  }
  if (report.network !== false) {
    problems.push("network");
  }
  const named = [
    ["wallet", report.boxes.wallet],
    ["logs", report.boxes.logs],
    ["limits", report.boxes.limits],
    ["killSwitch", report.boxes.killSwitch],
  ] as const;
  let marked = 0;
  let notApplicable = 0;
  for (const [name, box] of named) {
    if (box.ppmMarked === true) {
      marked += 1;
      if (typeof box.publicEvidence !== "string" || !RUN_URL.test(box.publicEvidence)) {
        problems.push(`${name}.publicEvidence`);
      }
      if (typeof box.markedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(box.markedOn)) {
        problems.push(`${name}.markedOn`);
      }
      if (box.notApplicableOn !== null || box.status === "not-applicable") {
        problems.push(`${name}.notApplicable`);
      }
    } else if (box.status === "not-applicable") {
      notApplicable += 1;
      if (
        box.ppmMarked !== false ||
        box.publicEvidence !== null ||
        box.markedOn !== null ||
        typeof box.notApplicableOn !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(box.notApplicableOn)
      ) {
        problems.push(`${name}.notApplicable`);
      }
    } else if (box.ppmMarked !== false || box.publicEvidence !== null || box.markedOn !== null || box.notApplicableOn !== null) {
      problems.push(`${name}.ppmMarked`);
    }
  }
  if (report.ppmMarkedCount !== marked) {
    problems.push("ppmMarkedCount");
  }
  if (report.ppmTotal !== PPM_TOTAL) {
    problems.push("ppmTotal");
  }
  if (report.ppmNotApplicableCount !== notApplicable) {
    problems.push("ppmNotApplicableCount");
  }
  // Wallet is not-applicable (by design), never marked. Logs, limits and kill-switch may be marked.
  if (
    report.boxes.wallet.status !== "not-applicable" ||
    report.boxes.wallet.provenByTests !== false ||
    report.boxes.wallet.ppmMarked !== false ||
    report.boxes.wallet.notApplicableOn !== PPM_WALLET_NOT_APPLICABLE_ON
  ) {
    problems.push("wallet");
  }
  if (report.boxes.logs.status !== "repo-tested" || report.boxes.logs.provenByTests !== true) {
    problems.push("logs");
  }
  if (report.boxes.limits.status !== "repo-tested" || report.boxes.limits.provenByTests !== true) {
    problems.push("limits");
  }
  const ks = report.boxes.killSwitch;
  if (ks.status !== "repo-tested" || ks.provenByTests !== true || ks.scope !== "ops-social") {
    problems.push("killSwitch");
  }
  if (ks.ppmMarked === true) {
    const drills = Array.isArray(ks.publicDrills) ? ks.publicDrills : [];
    if (
      ks.publicDrill !== true ||
      drills.length < 2 ||
      !drills.every((url) => typeof url === "string" && RUN_URL.test(url)) ||
      ks.publicEvidence !== drills[drills.length - 1]
    ) {
      problems.push("killSwitch.publicDrills");
    }
  }
  return { ok: problems.length === 0, problems };
}
