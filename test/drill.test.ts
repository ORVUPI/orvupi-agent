import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { DRILL_ROUNDS, drillMarkdown, runKillSwitchDrill } from "../src/drill.js";
import { repoRoot } from "../src/paths.js";
import { ALLOWED_ACTIONS } from "../src/types.js";
import { FIXED_NOW } from "./helpers.js";

const SHA = "0123456789abcdef0123456789abcdef01234567";

function stepById(report: ReturnType<typeof runKillSwitchDrill>, id: string) {
  const found = report.steps.find((s) => s.id === id);
  assert.ok(found, `missing step ${id}`);
  return found;
}

describe("kill-switch drill", () => {
  test("the drill is green on this repository", () => {
    const report = runKillSwitchDrill({ commit: SHA, now: () => FIXED_NOW });
    assert.equal(report.ok, true, JSON.stringify(report.steps.filter((s) => !s.pass), null, 2));
    assert.equal(report.drill, "killswitch");
    assert.equal(report.date, FIXED_NOW);
    assert.equal(report.commit, SHA);
    assert.equal(report.network, false);
    assert.equal(report.secrets, false);
    for (const s of report.steps) {
      assert.equal(s.pass, true, s.id);
    }
  });

  test("every allowlisted action is refused at least ten times in total while engaged", () => {
    const report = runKillSwitchDrill({ now: () => FIXED_NOW });
    const engaged = stepById(report, "b-refuse-all");
    assert.ok(engaged.attempts >= 10);
    assert.equal(engaged.refused, engaged.attempts);
    for (const action of ALLOWED_ACTIONS) {
      const tries = engaged.results.filter((r) => r.action === action);
      assert.ok(tries.length >= DRILL_ROUNDS, action);
      assert.ok(tries.every((r) => !r.ok && r.onChainEffect === false), action);
    }
    const draft = engaged.results.find((r) => r.payloadKind === "social-draft");
    assert.equal(draft?.code, "no-publish-while-killed");
  });

  test("fail-closed steps refuse every action", () => {
    const report = runKillSwitchDrill({ now: () => FIXED_NOW });
    const failSteps = report.steps.filter((s) => s.id.startsWith("c"));
    assert.ok(failSteps.length >= 4);
    for (const s of failSteps) {
      assert.equal(s.expected, "refuse");
      assert.ok(s.attempts >= ALLOWED_ACTIONS.length, s.id);
      assert.equal(s.refused, s.attempts, s.id);
    }
    assert.ok(stepById(report, "c1-missing").results.every((r) => r.code === "kill-switch-unreadable"));
    assert.ok(stepById(report, "c2-corrupt-json").results.every((r) => r.code === "kill-switch-invalid"));
  });

  test("disengaging restores every allowlisted action", () => {
    const report = runKillSwitchDrill({ now: () => FIXED_NOW });
    const restored = stepById(report, "d-restore");
    assert.equal(restored.refused, 0);
    for (const action of ALLOWED_ACTIONS) {
      assert.ok(restored.results.some((r) => r.action === action && r.ok), action);
    }
  });

  test("the committed state file is left untouched", () => {
    const file = path.join(repoRoot(), "state", "killswitch.json");
    const before = readFileSync(file, "utf8");
    const report = runKillSwitchDrill({ now: () => FIXED_NOW });
    assert.equal(report.repoStateUntouched, true);
    assert.equal(readFileSync(file, "utf8"), before);
    assert.equal(JSON.parse(before).engaged, false);
  });

  test("the drill turns red when the agent cannot run normally", () => {
    const root = mkdtempSync(path.join(tmpdir(), "orvupi-drill-root-"));
    mkdirSync(path.join(root, "state"));
    copyFileSync(path.join(repoRoot(), "state", "killswitch.json"), path.join(root, "state", "killswitch.json"));
    const report = runKillSwitchDrill({ root, now: () => FIXED_NOW });
    assert.equal(report.ok, false);
    assert.equal(stepById(report, "0-baseline").pass, false);
    assert.equal(stepById(report, "d-restore").pass, false);
  });

  test("only a full lowercase commit SHA is reported", () => {
    assert.equal(runKillSwitchDrill({ commit: "main", now: () => FIXED_NOW }).commit, null);
    assert.equal(runKillSwitchDrill({ now: () => FIXED_NOW }).commit, null);
  });

  test("the markdown summary lists every step and the scope limit", () => {
    const report = runKillSwitchDrill({ commit: SHA, now: () => FIXED_NOW });
    const md = drillMarkdown(report);
    assert.match(md, /VERDE/);
    assert.ok(md.includes(SHA));
    assert.ok(md.includes(FIXED_NOW));
    for (const s of report.steps) {
      assert.ok(md.includes(s.id), s.id);
    }
    assert.match(md, /No pausa transferencias de holders ni congela cuentas/);
  });

  test("the drill code has no network or process-spawning imports", () => {
    const root = repoRoot();
    for (const rel of ["src/drill.ts", "scripts/killswitch-drill.mjs"]) {
      const text = readFileSync(path.join(root, rel), "utf8");
      for (const banned of ["node:http", "node:https", "node:net", "node:dgram", "child_process", "fetch("]) {
        assert.equal(text.includes(banned), false, `${rel}: ${banned}`);
      }
    }
  });

  test("the drill workflow is pinned, read-only and secret-free", () => {
    const text = readFileSync(path.join(repoRoot(), ".github", "workflows", "killswitch-drill.yml"), "utf8");
    assert.match(text, /^on:\n {2}schedule:\n {4}- cron: "[^"]+"\n {2}workflow_dispatch:\n/m);
    assert.match(text, /^permissions:\n {2}contents: read\n\n/m);
    assert.equal((text.match(/^\s*permissions:/gm) ?? []).length, 1);
    assert.equal(text.includes("write"), false);
    assert.equal(text.includes("secrets."), false);
    assert.equal(text.includes("pull_request_target"), false);
    const uses = text.match(/uses: \S+/g) ?? [];
    assert.ok(uses.length >= 3);
    for (const line of uses) {
      assert.match(line, /^uses: [\w./-]+@[0-9a-f]{40}$/, line);
    }
    assert.match(text, /npm run drill:killswitch/);
  });

  test("KILL-SWITCH.md describes the drill as it runs and keeps the PPM box unmarked", () => {
    const report = runKillSwitchDrill({ now: () => FIXED_NOW });
    const doc = readFileSync(path.join(repoRoot(), "KILL-SWITCH.md"), "utf8");
    assert.match(doc, /^## Simulacro semanal$/m);
    assert.ok(doc.includes(`(${stepById(report, "b-refuse-all").attempts} intentos)`));
    assert.ok(doc.includes("killswitch-drill.yml"));
    assert.match(doc, /al menos 2 simulacros públicos seguidos en verde/);
    assert.match(doc, /No puede pausar transferencias de holders\./);
    assert.match(doc, /No puede congelar cuentas\./);
  });
});
