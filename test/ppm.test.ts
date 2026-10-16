import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";
import { fingerprint } from "../src/fingerprint.js";
import { StubAgent } from "../src/stub-agent.js";
import { evaluatePpmHonesty, KILL_SWITCH_DRILL_RUNS, LIMITS_CI_RUN, LOGS_DAILY_RUN, RUN_URL } from "../src/ppm.js";
import type { PpmReport } from "../src/ppm.js";
import { repoRoot } from "../src/paths.js";
import { PREVIOUS_MINT } from "../src/public-mint.js";
import { agent } from "./helpers.js";

function reportFrom(orch = agent()): PpmReport {
  const result = orch.dispatch("ppm:print");
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("ppm:print failed");
  }
  return result.output as PpmReport;
}

describe("ppm", () => {
  test("wallet is not-applicable by design", () => {
    const report = reportFrom();
    assert.equal(report.boxes.wallet.status, "not-applicable");
    assert.equal(report.boxes.wallet.provenByTests, false);
    assert.equal(report.boxes.wallet.ppmMarked, false);
    assert.equal(report.boxes.wallet.publicEvidence, null);
    assert.equal(report.boxes.wallet.markedOn, null);
    assert.equal(report.boxes.wallet.notApplicableOn, "2026-10-05");
  });

  test("logs, limits and kill-switch are marked, each with a public run", () => {
    const report = reportFrom();
    assert.equal(report.boxes.logs.status, "repo-tested");
    assert.equal(report.boxes.logs.provenByTests, true);
    assert.equal(report.boxes.logs.ppmMarked, true);
    assert.equal(report.boxes.logs.markedOn, "2026-10-05");
    assert.equal(report.boxes.logs.publicEvidence, LOGS_DAILY_RUN);
    assert.match(LOGS_DAILY_RUN, RUN_URL);
    assert.equal(report.boxes.limits.status, "repo-tested");
    assert.equal(report.boxes.limits.provenByTests, true);
    assert.equal(report.boxes.limits.ppmMarked, true);
    assert.equal(report.boxes.limits.markedOn, "2026-10-05");
    assert.equal(report.boxes.limits.publicEvidence, LIMITS_CI_RUN);
    assert.match(LIMITS_CI_RUN, RUN_URL);
    assert.equal(report.boxes.killSwitch.status, "repo-tested");
    assert.equal(report.boxes.killSwitch.provenByTests, true);
    assert.equal(report.boxes.killSwitch.ppmMarked, true);
    assert.equal(report.boxes.killSwitch.markedOn, "2026-10-05");
    assert.equal(report.boxes.killSwitch.publicDrill, true);
    assert.equal(report.boxes.killSwitch.scope, "ops-social");
    assert.ok(KILL_SWITCH_DRILL_RUNS.length >= 2);
    for (const url of KILL_SWITCH_DRILL_RUNS) {
      assert.match(url, RUN_URL);
    }
    assert.deepEqual([...report.boxes.killSwitch.publicDrills], [...KILL_SWITCH_DRILL_RUNS]);
    assert.equal(report.boxes.killSwitch.publicEvidence, KILL_SWITCH_DRILL_RUNS[KILL_SWITCH_DRILL_RUNS.length - 1]);
  });

  test("the report is not an approval", () => {
    const report = reportFrom();
    assert.equal(report.approved, false);
    assert.equal(report.ppmMarkedCount, 3);
    assert.equal(report.ppmTotal, 4);
    assert.equal(report.ppmNotApplicableCount, 1);
    assert.equal(report.signing, false);
    assert.equal(report.network, false);
    assert.equal(report.package, "@orvupi/agents");
    assert.equal(report.packageVersion, "0.1.0");
    assert.equal(report.tokenMint, PREVIOUS_MINT);
    assert.equal(report.policyVersion, "1.0.0");
    assert.match(report.policySha256, /^[0-9a-f]{64}$/);
  });

  test("honesty check passes the real report and rejects a marked wallet, missing run links and a wrong count", () => {
    const report = reportFrom();
    assert.equal(evaluatePpmHonesty(report).ok, true);
    const marked: PpmReport = {
      ...report,
      boxes: {
        ...report.boxes,
        wallet: { ...report.boxes.wallet, status: "repo-tested", provenByTests: true },
      },
    };
    const honesty = evaluatePpmHonesty(marked);
    assert.equal(honesty.ok, false);
    assert.ok(honesty.problems.includes("wallet"));
    const pendingWallet = evaluatePpmHonesty({
      ...report,
      boxes: {
        ...report.boxes,
        wallet: {
          ...report.boxes.wallet,
          status: "pending",
          notApplicableOn: null,
        },
      },
      ppmNotApplicableCount: 0,
    });
    assert.equal(pendingWallet.ok, false);
    assert.ok(pendingWallet.problems.includes("wallet"));
    // A marked box needs a run link of this repository and the count must match.
    const noLink = evaluatePpmHonesty({
      ...report,
      boxes: { ...report.boxes, logs: { ...report.boxes.logs, publicEvidence: "pending-link" } },
    });
    assert.equal(noLink.ok, false);
    assert.ok(noLink.problems.includes("logs.publicEvidence"));
    const otherRepo = evaluatePpmHonesty({
      ...report,
      boxes: {
        ...report.boxes,
        limits: { ...report.boxes.limits, publicEvidence: "https://github.com/orvupi/agent/actions/runs/1" },
      },
    });
    assert.ok(otherRepo.problems.includes("limits.publicEvidence"));
    const oneDrill = evaluatePpmHonesty({
      ...report,
      boxes: {
        ...report.boxes,
        killSwitch: { ...report.boxes.killSwitch, publicDrills: [KILL_SWITCH_DRILL_RUNS[0] ?? ""] },
      },
    });
    assert.ok(oneDrill.problems.includes("killSwitch.publicDrills"));
    const count = evaluatePpmHonesty({ ...report, ppmMarkedCount: 0 });
    assert.ok(count.problems.includes("ppmMarkedCount"));
  });

  test("ppm:check agrees with the honest report", () => {
    const result = agent().dispatch("ppm:check");
    assert.equal(result.ok, true);
    if (result.ok) {
      const output = result.output as { problems: string[] };
      assert.deepEqual(output.problems, []);
    }
  });

  test("stub agent prints, audits, and fingerprints memory", () => {
    const orch = agent();
    const stub = new StubAgent(orch);
    const printed = stub.print();
    assert.equal(printed.ok, true);
    const before = stub.hashLogs();
    assert.match(before, /^[0-9a-f]{64}$/);
    assert.equal(stub.hashLogs(), before);
    assert.equal(before, fingerprint(JSON.stringify(orch.events())));
    const audited = stub.audit();
    assert.equal(audited.ok, true);
    assert.notEqual(stub.hashLogs(), before);
  });

  test("cli ppm:print exits 0 with not-applicable wallet and marked logs", () => {
    const result = spawnSync(process.execPath, ["dist/src/cli.js", "ppm:print"], {
      cwd: repoRoot(),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout) as PpmReport;
    assert.equal(report.approved, false);
    assert.equal(report.boxes.wallet.status, "not-applicable");
    assert.equal(report.boxes.wallet.notApplicableOn, "2026-10-05");
    assert.equal(report.boxes.logs.status, "repo-tested");
    assert.equal(report.boxes.logs.ppmMarked, true);
    assert.equal(report.boxes.limits.provenByTests, true);
    assert.equal(report.boxes.killSwitch.provenByTests, true);
  });

  test("chain:read is local and does not claim a network call", () => {
    const result = agent().dispatch("chain:read");
    assert.equal(result.ok, true);
    if (result.ok) {
      const output = result.output as { network: boolean; write: boolean; mint: string };
      assert.equal(output.network, false);
      assert.equal(output.write, false);
      assert.equal(output.mint, PREVIOUS_MINT);
    }
  });
});
