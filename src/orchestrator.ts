import { assessAction, isAllowedAction } from "./allowlist.js";
import { reviewPayload, stringsIn } from "./draft.js";
import { assessRpc } from "./guard.js";
import { isRecord, sameKeys } from "./json-file.js";
import { defaultKillSwitchPath, readKillSwitch } from "./kill-switch.js";
import { cannotStatements, limitStatement, loadPolicy } from "./limits.js";
import type { LoadedPolicy } from "./limits.js";
import { buildLogEntry } from "./log.js";
import { repoRoot } from "./paths.js";
import { buildPpmReport, evaluatePpmHonesty, readPackageVersion } from "./ppm.js";
import { loadPublicMint } from "./public-mint.js";
import type { DispatchDenied, DispatchResult, LimitId, LogEntry, MemoryEvent } from "./types.js";

export type OrchestratorOptions = {
  root?: string;
  killSwitchPath?: string;
  now?: () => string;
};

type LogPayload = {
  kind: "social-draft" | "note";
  detail: string;
};

export class Orchestrator {
  private readonly root: string;
  private readonly killSwitchPath: string;
  private readonly now: () => string;
  private readonly memory: MemoryEvent[] = [];
  private readonly entries: LogEntry[] = [];

  constructor(options: OrchestratorOptions = {}) {
    this.root = options.root ?? repoRoot();
    this.killSwitchPath = options.killSwitchPath ?? defaultKillSwitchPath(this.root);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  events(): readonly MemoryEvent[] {
    return [...this.memory];
  }

  logEntries(): readonly LogEntry[] {
    return [...this.entries];
  }

  dispatch(action: string, payload?: unknown): DispatchResult {
    const ts = this.now();
    const result = this.run(action, payload, ts);
    this.memory.push({
      ts,
      action,
      ok: result.ok,
      code: result.ok ? "ok" : result.code,
    });
    return result;
  }

  private deny(
    action: string,
    code: string,
    limitId: LimitId | null,
    message: string,
    policy?: LoadedPolicy,
  ): DispatchDenied {
    return {
      ok: false,
      action,
      code,
      limitId,
      message,
      onChainEffect: false,
      cannot: cannotStatements(policy),
    };
  }

  private run(action: string, payload: unknown, ts: string): DispatchResult {
    const killSwitch = readKillSwitch(this.killSwitchPath);
    if (!killSwitch.ok) {
      const message =
        killSwitch.reason === "unreadable"
          ? "Kill-switch ilegible. Fail-closed: no se ejecuta ninguna acción."
          : "Kill-switch inválido. Fail-closed: no se ejecuta ninguna acción.";
      const code = killSwitch.reason === "unreadable" ? "kill-switch-unreadable" : "kill-switch-invalid";
      return this.deny(action, code, null, message);
    }

    const policyLoad = loadPolicy(this.root);
    if (!policyLoad.ok) {
      return this.deny(
        action,
        "limits-unreadable",
        null,
        "Política de límites ilegible o no coincide con el código. Fail-closed.",
      );
    }
    const policy = policyLoad.policy;

    const mintLoad = loadPublicMint(this.root);
    if (!mintLoad.ok) {
      return this.deny(
        action,
        "public-descriptor-unreadable",
        null,
        "Descriptor público del mint ilegible o no coincide. Fail-closed.",
        policy,
      );
    }

    const assessment = assessAction(action);
    if (assessment.kind === "deny") {
      const message = assessment.limitId
        ? limitStatement(policy, assessment.limitId)
        : "Acción fuera de la lista permitida.";
      return this.deny(action, assessment.code, assessment.limitId, message, policy);
    }
    if (!isAllowedAction(action)) {
      return this.deny(action, "not-allowlisted", null, "Acción fuera de la lista permitida.", policy);
    }

    const endpoint = this.endpointDenial(action, payload, policy);
    if (endpoint) {
      return endpoint;
    }
    const reviewed = reviewPayload(payload, [mintLoad.mint]);
    if (!reviewed.ok) {
      const message =
        reviewed.limitId === null
          ? "Este paquete no admite referencias de red en la entrada."
          : limitStatement(policy, reviewed.limitId);
      return this.deny(action, reviewed.code, reviewed.limitId, message, policy);
    }

    if (killSwitch.state.engaged) {
      const drafted = action === "log:append" ? parseLogPayload(payload) : null;
      if (drafted?.kind === "social-draft") {
        return this.deny(
          action,
          "no-publish-while-killed",
          "no-publish-while-killed",
          limitStatement(policy, "no-publish-while-killed"),
          policy,
        );
      }
      return this.deny(
        action,
        "kill-switch-engaged",
        null,
        "Kill-switch activado. No se ejecuta la acción. No hay efecto en la red ni en las cuentas de los holders.",
        policy,
      );
    }

    switch (action) {
      case "ppm:print":
        return this.finishEmpty(action, payload, policy, () => {
          const packageVersion = readPackageVersion(this.root);
          if (packageVersion === null) {
            return this.deny(action, "package-unreadable", null, "package.json ilegible. Fail-closed.", policy);
          }
          return {
            ok: true,
            action,
            output: buildPpmReport({ packageVersion, policy, mint: mintLoad.mint }),
          };
        });
      case "ppm:check":
        return this.finishEmpty(action, payload, policy, () => {
          const packageVersion = readPackageVersion(this.root);
          if (packageVersion === null) {
            return this.deny(action, "package-unreadable", null, "package.json ilegible. Fail-closed.", policy);
          }
          const report = buildPpmReport({ packageVersion, policy, mint: mintLoad.mint });
          const honesty = evaluatePpmHonesty(report);
          if (!honesty.ok) {
            return this.deny(
              action,
              "ppm-honesty",
              null,
              "El informe PPM no pasa el control de honestidad.",
              policy,
            );
          }
          return { ok: true, action, output: { report, problems: honesty.problems } };
        });
      case "status":
        return this.finishEmpty(action, payload, policy, () => ({
          ok: true,
          action,
          output: {
            package: "@orvupi/agents",
            allowedActions: [
              "ppm:print",
              "ppm:check",
              "log:append",
              "status",
              "killswitch:check",
              "chain:read",
            ],
            killSwitch: killSwitch.state,
            network: false,
            signing: false,
            approved: false,
            policySha256: policy.sha256,
          },
        }));
      case "killswitch:check":
        return this.finishEmpty(action, payload, policy, () => ({
          ok: true,
          action,
          output: {
            state: killSwitch.state,
            onChainEffect: false,
            cannot: cannotStatements(policy),
            scope: "ops-social",
          },
        }));
      case "chain:read":
        return this.finishEmpty(action, payload, policy, () => ({
          ok: true,
          action,
          output: {
            network: false,
            write: false,
            source: "state/public-mint.json",
            mint: mintLoad.mint,
          },
        }));
      case "log:append": {
        const parsed = parseLogPayload(payload);
        if (!parsed) {
          return this.deny(action, "invalid-payload", null, "Payload no admitido para esta acción.", policy);
        }
        const prev = this.entries[this.entries.length - 1];
        const entry = buildLogEntry({
          ts,
          action: "log:append",
          detail: parsed.detail,
          prevHash: prev ? prev.hash : null,
        });
        this.entries.push(entry);
        return {
          ok: true,
          action,
          output: {
            published: false,
            persisted: false,
            network: false,
            kind: parsed.kind,
            entry,
          },
        };
      }
      default: {
        const unreachable: never = action;
        return this.deny(unreachable, "not-allowlisted", null, "Acción fuera de la lista permitida.", policy);
      }
    }
  }

  private finishEmpty(
    action: string,
    payload: unknown,
    policy: LoadedPolicy,
    run: () => DispatchResult,
  ): DispatchResult {
    if (!isEmptyPayload(payload)) {
      return this.deny(action, "invalid-payload", null, "Payload no admitido para esta acción.", policy);
    }
    return run();
  }

  private endpointDenial(action: string, payload: unknown, policy: LoadedPolicy): DispatchDenied | null {
    for (const text of stringsIn(payload)) {
      const lower = text.toLowerCase();
      if (
        !lower.includes("mainnet") &&
        !lower.includes("testnet") &&
        !lower.includes("://") &&
        !lower.includes("rpc")
      ) {
        continue;
      }
      const decision = assessRpc(text);
      if (decision.code === "MAINNET_FORBIDDEN") {
        return this.deny(action, "no-mainnet", "no-mainnet", limitStatement(policy, "no-mainnet"), policy);
      }
      return this.deny(action, decision.code, null, decision.message, policy);
    }
    return null;
  }
}

function isEmptyPayload(payload: unknown): boolean {
  if (payload === undefined) {
    return true;
  }
  return isRecord(payload) && Object.keys(payload).length === 0;
}

function parseLogPayload(payload: unknown): LogPayload | null {
  if (!isRecord(payload) || !sameKeys(payload, ["kind", "detail"])) {
    return null;
  }
  if (payload.kind !== "social-draft" && payload.kind !== "note") {
    return null;
  }
  if (typeof payload.detail !== "string") {
    return null;
  }
  const detail = payload.detail.trim();
  if (detail.length < 1 || detail.length > 500 || detail.includes("\0")) {
    return null;
  }
  return { kind: payload.kind, detail };
}

export function createOrchestrator(options?: OrchestratorOptions): Orchestrator {
  return new Orchestrator(options);
}
