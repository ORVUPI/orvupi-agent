import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { KILL_SWITCH_CANNOT } from "../src/limits.js";
import { createOrchestrator } from "../src/orchestrator.js";
import { repoRoot } from "../src/paths.js";
import { readKillSwitch } from "../src/kill-switch.js";
import { agent, ENGAGED, writeState } from "./helpers.js";

describe("kill-switch", () => {
  test("the committed file is disengaged and readable", () => {
    const read = readKillSwitch(path.join(repoRoot(), "state", "killswitch.json"));
    assert.equal(read.ok, true);
    if (read.ok) {
      assert.equal(read.state.engaged, false);
      assert.equal(read.state.scope, "ops-social");
    }
  });

  test("dispatches ppm:print and stops after kill without claiming token pause", () => {
    const orch = agent(writeState("killswitch.json", ENGAGED));
    const first = orch.dispatch("ppm:print");
    const second = orch.dispatch("status");
    assert.equal(first.ok, false);
    assert.equal(second.ok, false);
    if (!first.ok) {
      assert.equal(first.code, "kill-switch-engaged");
      assert.equal(first.onChainEffect, false);
      assert.match(first.message, /No hay efecto en la red/);
      for (const item of KILL_SWITCH_CANNOT) {
        assert.ok(first.cannot.includes(item.statement));
      }
      assert.equal(JSON.stringify(first).includes("token pause"), false);
    }
  });

  test("engaged switch blocks chain:read", () => {
    const result = agent(writeState("killswitch.json", ENGAGED)).dispatch("chain:read");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-engaged");
    }
  });

  test("missing file fails closed", () => {
    const missing = path.join(repoRoot(), "state", "does-not-exist.json");
    const result = agent(missing).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-unreadable");
      assert.equal(JSON.stringify(result).includes("TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"), false);
    }
  });

  test("invalid JSON fails closed", () => {
    const result = agent(writeState("killswitch.json", "{")).dispatch("ppm:print");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-invalid");
    }
  });

  test("wrong shape fails closed", () => {
    const result = agent(writeState("killswitch.json", { engaged: false })).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-invalid");
    }
  });

  test("a non-boolean engaged flag fails closed", () => {
    const result = agent(
      writeState("killswitch.json", {
        version: 1,
        engaged: "false",
        since: null,
        reason: null,
        scope: "ops-social",
      }),
    ).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-invalid");
    }
  });

  test("a scope other than ops-social fails closed", () => {
    const result = agent(
      writeState("killswitch.json", {
        version: 1,
        engaged: false,
        since: null,
        reason: null,
        scope: "token",
      }),
    ).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-invalid");
    }
  });

  test("a directory path fails closed", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "orvupi-dir-"));
    const result = agent(dir).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-unreadable");
    }
  });

  test("a symlink fails closed", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "orvupi-link-"));
    const real = path.join(dir, "real.json");
    writeFileSync(
      real,
      JSON.stringify({
        version: 1,
        engaged: false,
        since: null,
        reason: null,
        scope: "ops-social",
      }),
    );
    const link = path.join(dir, "killswitch.json");
    symlinkSync(real, link);
    const result = agent(link).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-unreadable");
    }
  });

  test("an oversized file fails closed", () => {
    const result = agent(writeState("killswitch.json", "x".repeat(5000))).dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-unreadable");
    }
  });

  test("killswitch:check reports no on-chain effect", () => {
    const result = agent().dispatch("killswitch:check");
    assert.equal(result.ok, true);
    if (result.ok) {
      const output = result.output as { onChainEffect: boolean; scope: string; cannot: string[] };
      assert.equal(output.onChainEffect, false);
      assert.equal(output.scope, "ops-social");
      assert.ok(output.cannot.some((line) => line.includes("congelar cuentas")));
    }
  });

  test("unreadable state blocks a signing attempt before any other code", () => {
    const result = agent(path.join(repoRoot(), "state", "missing-switch.json")).dispatch("signTransaction");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "kill-switch-unreadable");
      assert.equal(result.limitId, null);
    }
  });

  test("a custom root without a policy fails closed", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "orvupi-root-"));
    const ks = path.join(dir, "killswitch.json");
    writeFileSync(
      ks,
      JSON.stringify({
        version: 1,
        engaged: false,
        since: null,
        reason: null,
        scope: "ops-social",
      }),
    );
    const orch = createOrchestrator({ root: dir, killSwitchPath: ks, now: () => "2026-09-26T12:00:00.000Z" });
    const result = orch.dispatch("status");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "limits-unreadable");
    }
  });
});
