import { fingerprint } from "./fingerprint.js";
import type { LogEntry } from "./types.js";

export type ChainVerification = {
  ok: false;
  phase: "P4";
  implemented: false;
  reason: string;
};

function contentBody(entry: Pick<LogEntry, "v" | "ts" | "actor" | "action" | "detail">): string {
  return JSON.stringify({
    v: entry.v,
    ts: entry.ts,
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
  });
}

export function buildLogEntry(input: {
  ts: string;
  action: string;
  detail: string;
  prevHash?: string | null;
}): LogEntry {
  const prevHash = input.prevHash ?? null;
  const partial = {
    v: 1 as const,
    ts: input.ts,
    actor: "orvupi-agent" as const,
    action: input.action,
    detail: input.detail,
  };
  const contentSha256 = fingerprint(contentBody(partial));
  const hash = fingerprint(
    JSON.stringify({
      v: 1,
      contentSha256,
      prevHash,
    }),
  );
  return {
    ...partial,
    evidence: null,
    contentSha256,
    prevHash,
    hash,
    chain: "stub-until-p4",
  };
}

export function verifyChain(_entries: readonly LogEntry[]): ChainVerification {
  return {
    ok: false,
    phase: "P4",
    implemented: false,
    reason:
      "Append-only verification is phase P4. This stub does not claim the chain is valid or complete.",
  };
}
