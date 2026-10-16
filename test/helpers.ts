import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOrchestrator } from "../src/orchestrator.js";
import type { Orchestrator } from "../src/orchestrator.js";
import { repoRoot } from "../src/paths.js";

export const FIXED_NOW = "2026-09-26T12:00:00.000Z";

export const DISENGAGED = {
  version: 1,
  engaged: false,
  since: null,
  reason: null,
  scope: "ops-social",
};

export const ENGAGED = {
  version: 1,
  engaged: true,
  since: "2026-09-26T10:00:00.000Z",
  reason: "drill",
  scope: "ops-social",
};

export function writeState(name: string, contents: string | unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "orvupi-"));
  const file = path.join(dir, name);
  const raw = typeof contents === "string" ? contents : JSON.stringify(contents);
  writeFileSync(file, raw);
  return file;
}

export function agent(killSwitchPath?: string): Orchestrator {
  return createOrchestrator({
    root: repoRoot(),
    ...(killSwitchPath ? { killSwitchPath } : {}),
    now: () => FIXED_NOW,
  });
}

export function letters(...codes: number[]): string {
  return String.fromCharCode(...codes);
}
