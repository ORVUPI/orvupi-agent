import path from "node:path";
import { existsSync } from "node:fs";
import { fingerprint } from "./fingerprint.js";
import { isRecord, readStrictJson, sameKeys } from "./json-file.js";
import type { CannotDef, CannotId, LimitDef, LimitId } from "./types.js";
import { CANNOT_IDS, LIMIT_IDS } from "./types.js";

const POLICY_MAX_BYTES = 64 * 1024;

export const EXPECTED_LIMITS: readonly LimitDef[] = [
  {
    id: "no-sign",
    title: "No firma",
    statement: "El agente no firma mensajes ni transacciones.",
    enforcedBy: ["src/allowlist.ts", "src/orchestrator.ts", "src/forbidden-scan.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-custody",
    title: "No custodia",
    statement: "El agente no custodia activos ni claves.",
    enforcedBy: ["src/allowlist.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-trade",
    title: "No intercambia",
    statement: "El agente no intercambia tokens ni opera en un mercado.",
    enforcedBy: ["src/allowlist.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-send",
    title: "No envía transacciones",
    statement: "El agente no envía transacciones.",
    enforcedBy: ["src/allowlist.ts", "src/orchestrator.ts", "src/forbidden-scan.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-mainnet",
    title: "No usa la red principal",
    statement: "El agente no contacta la red principal ni escribe en ella.",
    enforcedBy: ["src/guard.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-solicit-funds",
    title: "No pide activos",
    statement: "El agente no pide SOL ni otros activos a nadie.",
    enforcedBy: ["src/draft.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-invented-addresses",
    title: "No inventa direcciones ni huellas",
    statement: "El agente no inventa direcciones ni huellas: solo puede citar el mint público de este repositorio.",
    enforcedBy: ["src/draft.ts", "src/public-mint.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-outcome-promises",
    title: "No promete resultados",
    statement: "El agente no promete resultados, ganancias ni ausencia de riesgo.",
    enforcedBy: ["src/draft.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-publish-while-killed",
    title: "No publica con el kill-switch activado",
    statement: "El agente no prepara un borrador social si el kill-switch está activado.",
    enforcedBy: ["src/orchestrator.ts", "src/kill-switch.ts"],
    test: "test/limits.test.ts",
  },
  {
    id: "no-store-secrets",
    title: "No guarda secretos",
    statement: "El agente no almacena secretos ni material de clave.",
    enforcedBy: ["src/draft.ts", "src/forbidden-scan.ts", "src/orchestrator.ts"],
    test: "test/limits.test.ts",
  },
];

export const KILL_SWITCH_CANNOT: readonly CannotDef[] = [
  {
    id: "pause-holder-transfers",
    statement: "No puede pausar transferencias de holders.",
  },
  {
    id: "freeze-accounts",
    statement: "No puede congelar cuentas.",
  },
  {
    id: "seize-balances",
    statement: "No puede confiscar saldos.",
  },
  {
    id: "stop-solana",
    statement: "No puede apagar Solana.",
  },
];

export type LoadedPolicy = {
  id: string;
  version: string;
  sha256: string;
  limits: readonly LimitDef[];
  cannot: readonly CannotDef[];
};

export type PolicyLoad =
  | { ok: true; policy: LoadedPolicy }
  | { ok: false; reason: "unreadable" | "invalid" | "mismatch" };

function isLimitId(value: string): value is LimitId {
  return (LIMIT_IDS as readonly string[]).includes(value);
}

function isCannotId(value: string): value is CannotId {
  return (CANNOT_IDS as readonly string[]).includes(value);
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }
  return value as string[];
}

function parseLimit(value: unknown): LimitDef | null {
  if (!isRecord(value) || !sameKeys(value, ["id", "title", "statement", "enforcedBy", "test"])) {
    return null;
  }
  if (typeof value.id !== "string" || !isLimitId(value.id)) {
    return null;
  }
  if (typeof value.title !== "string" || typeof value.statement !== "string" || typeof value.test !== "string") {
    return null;
  }
  const enforcedBy = asStringArray(value.enforcedBy);
  if (!enforcedBy || enforcedBy.length === 0) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    statement: value.statement,
    enforcedBy,
    test: value.test,
  };
}

function parseCannot(value: unknown): CannotDef | null {
  if (!isRecord(value) || !sameKeys(value, ["id", "statement"])) {
    return null;
  }
  if (typeof value.id !== "string" || !isCannotId(value.id) || typeof value.statement !== "string") {
    return null;
  }
  return { id: value.id, statement: value.statement };
}

function sameLimit(actual: LimitDef, expected: LimitDef): boolean {
  if (
    actual.id !== expected.id ||
    actual.title !== expected.title ||
    actual.statement !== expected.statement ||
    actual.test !== expected.test ||
    actual.enforcedBy.length !== expected.enforcedBy.length
  ) {
    return false;
  }
  return actual.enforcedBy.every((item, index) => item === expected.enforcedBy[index]);
}

export function policyPath(root: string): string {
  return path.join(root, "policy", "limits.json");
}

export function loadPolicy(root: string): PolicyLoad {
  const filePath = policyPath(root);
  const read = readStrictJson(filePath, POLICY_MAX_BYTES);
  if (!read.ok) {
    return { ok: false, reason: read.reason };
  }
  if (!isRecord(read.value) || !sameKeys(read.value, ["id", "version", "limits", "killSwitchCannot"])) {
    return { ok: false, reason: "invalid" };
  }
  if (read.value.id !== "orvupi-agent-limits" || read.value.version !== "1.0.0") {
    return { ok: false, reason: "mismatch" };
  }
  if (!Array.isArray(read.value.limits) || !Array.isArray(read.value.killSwitchCannot)) {
    return { ok: false, reason: "invalid" };
  }
  const limits: LimitDef[] = [];
  for (const item of read.value.limits) {
    const parsed = parseLimit(item);
    if (!parsed) {
      return { ok: false, reason: "invalid" };
    }
    limits.push(parsed);
  }
  const cannot: CannotDef[] = [];
  for (const item of read.value.killSwitchCannot) {
    const parsed = parseCannot(item);
    if (!parsed) {
      return { ok: false, reason: "invalid" };
    }
    cannot.push(parsed);
  }
  if (limits.length !== EXPECTED_LIMITS.length || cannot.length !== KILL_SWITCH_CANNOT.length) {
    return { ok: false, reason: "mismatch" };
  }
  for (let i = 0; i < EXPECTED_LIMITS.length; i += 1) {
    const actual = limits[i];
    const expected = EXPECTED_LIMITS[i];
    if (!actual || !expected || !sameLimit(actual, expected)) {
      return { ok: false, reason: "mismatch" };
    }
    for (const relative of expected.enforcedBy) {
      if (!existsSync(path.join(root, relative))) {
        return { ok: false, reason: "mismatch" };
      }
    }
  }
  for (let i = 0; i < KILL_SWITCH_CANNOT.length; i += 1) {
    const actual = cannot[i];
    const expected = KILL_SWITCH_CANNOT[i];
    if (!actual || !expected || actual.id !== expected.id || actual.statement !== expected.statement) {
      return { ok: false, reason: "mismatch" };
    }
  }
  return {
    ok: true,
    policy: {
      id: "orvupi-agent-limits",
      version: "1.0.0",
      sha256: fingerprint(read.raw),
      limits,
      cannot,
    },
  };
}

export function limitStatement(policy: LoadedPolicy, id: LimitId): string {
  const found = policy.limits.find((item) => item.id === id);
  return found?.statement ?? id;
}

export function cannotStatements(policy?: LoadedPolicy): readonly string[] {
  const source = policy?.cannot ?? KILL_SWITCH_CANNOT;
  return source.map((item) => item.statement);
}
