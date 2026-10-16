import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fingerprint } from "../src/fingerprint.js";
import { EXPECTED_LIMITS, KILL_SWITCH_CANNOT, loadPolicy, policyPath } from "../src/limits.js";
import { repoRoot } from "../src/paths.js";
import { PREVIOUS_MINT } from "../src/public-mint.js";
import type { LimitId } from "../src/types.js";
import { LIMIT_IDS } from "../src/types.js";
import { agent, letters, writeState, DISENGAGED, ENGAGED } from "./helpers.js";

function denied(action: string, payload?: unknown, killSwitchPath?: string) {
  const result = agent(killSwitchPath).dispatch(action, payload);
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected denial");
  }
  return result;
}

describe("limits", () => {
  test("no-sign", () => {
    const result = denied("signTransaction");
    assert.equal(result.limitId, "no-sign");
    assert.equal(result.onChainEffect, false);
  });

  test("no-custody", () => {
    const result = denied("custody:hold");
    assert.equal(result.limitId, "no-custody");
  });

  test("no-trade", () => {
    const result = denied("trade:swap");
    assert.equal(result.limitId, "no-trade");
  });

  test("no-send", () => {
    const result = denied("sendTransaction");
    assert.equal(result.limitId, "no-send");
  });

  test("no-mainnet", () => {
    const result = denied("chain:read", { url: "https://api.mainnet-beta.solana.com" });
    assert.equal(result.limitId, "no-mainnet");
    assert.equal(result.code, "no-mainnet");
  });

  test("no-solicit-funds", () => {
    const term = letters(98, 117, 121);
    const result = denied("log:append", {
      kind: "social-draft",
      detail: `please ${term} STUBX`,
    });
    assert.equal(result.limitId, "no-solicit-funds");
  });

  test("no-solicit-funds rejects a SOL request written in Spanish", () => {
    const result = denied("log:append", {
      kind: "note",
      detail: "envía SOL al equipo",
    });
    assert.equal(result.limitId, "no-solicit-funds");
  });

  test("no-invented-addresses", () => {
    const result = denied("log:append", {
      kind: "note",
      detail: "mira 11111111111111111111111111111112",
    });
    assert.equal(result.limitId, "no-invented-addresses");
  });

  test("no-invented-addresses rejects an unproven hash", () => {
    const result = denied("log:append", {
      kind: "note",
      detail: "huella aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    assert.equal(result.limitId, "no-invented-addresses");
  });

  test("the public mint may be quoted", () => {
    const result = agent().dispatch("log:append", {
      kind: "note",
      detail: `Mint público ${PREVIOUS_MINT}.`,
    });
    assert.equal(result.ok, true);
  });

  test("no-outcome-promises", () => {
    const result = denied("log:append", {
      kind: "social-draft",
      detail: "ganancia segura para quien espere",
    });
    assert.equal(result.limitId, "no-outcome-promises");
  });

  test("no-outcome-promises rejects promotional wording", () => {
    const term = letters(114, 101, 116, 117, 114, 110, 115);
    const result = denied("log:append", {
      kind: "note",
      detail: `sin ${term} prometidos`,
    });
    assert.equal(result.limitId, "no-outcome-promises");
  });

  test("no-publish-while-killed", () => {
    const result = denied(
      "log:append",
      { kind: "social-draft", detail: "Borrador local. Prototipo sin claves." },
      writeState("killswitch.json", ENGAGED),
    );
    assert.equal(result.limitId, "no-publish-while-killed");
    assert.equal(result.onChainEffect, false);
  });

  test("no-store-secrets", () => {
    const result = denied("log:append", {
      kind: "note",
      detail: "api_key=example",
    });
    assert.equal(result.limitId, "no-store-secrets");
  });

  test("no-store-secrets rejects a private key banner", () => {
    const result = denied("log:append", {
      kind: "note",
      detail: "-----BEGIN PRIVATE KEY-----",
    });
    assert.equal(result.limitId, "no-store-secrets");
  });

  test("every limit id has one negative test name", () => {
    const source = readFileSync(path.join(repoRoot(), "test", "limits.test.ts"), "utf8");
    for (const id of LIMIT_IDS) {
      assert.match(source, new RegExp(`test\\("${id}"`));
    }
  });

  test("policy file matches the code catalog", () => {
    const loaded = loadPolicy(repoRoot());
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }
    assert.equal(loaded.policy.limits.length, EXPECTED_LIMITS.length);
    assert.deepEqual(
      loaded.policy.limits.map((item) => item.id),
      EXPECTED_LIMITS.map((item) => item.id),
    );
    assert.deepEqual(loaded.policy.cannot, KILL_SWITCH_CANNOT);
    assert.equal(loaded.policy.sha256, fingerprint(readFileSync(policyPath(repoRoot()), "utf8")));
  });

  test("LIMITS.md quotes every statement and id", () => {
    const markdown = readFileSync(path.join(repoRoot(), "LIMITS.md"), "utf8");
    const ids = [...markdown.matchAll(/<!-- limit:([a-z0-9-]+) -->/g)].map((match) => match[1]);
    assert.deepEqual(ids, [...LIMIT_IDS]);
    for (const limit of EXPECTED_LIMITS) {
      assert.ok(markdown.includes(limit.statement), limit.id);
      assert.ok(markdown.includes(limit.title), limit.id);
      assert.ok(markdown.includes(limit.test), limit.id);
      for (const file of limit.enforcedBy) {
        assert.ok(markdown.includes(file), file);
        assert.equal(existsSync(path.join(repoRoot(), file)), true, file);
      }
    }
    for (const item of KILL_SWITCH_CANNOT) {
      assert.ok(markdown.includes(`<!-- cannot:${item.id} -->`));
      assert.ok(markdown.includes(item.statement));
    }
  });

  test("denial text matches the written statement", () => {
    const cases: Array<[LimitId, string, unknown?]> = [
      ["no-sign", "signTransaction"],
      ["no-custody", "custody:hold"],
      ["no-trade", "swap:now"],
      ["no-send", "sendTransaction"],
    ];
    for (const [id, action] of cases) {
      const result = denied(action);
      const expected = EXPECTED_LIMITS.find((item) => item.id === id);
      assert.equal(result.message, expected?.statement);
    }
  });

  test("a clean local note is accepted", () => {
    const result = agent(writeState("killswitch.json", DISENGAGED)).dispatch("log:append", {
      kind: "social-draft",
      detail: "STUBX es un prototipo. El agente no tiene claves.",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      const output = result.output as { published: boolean; persisted: boolean; network: boolean };
      assert.equal(output.published, false);
      assert.equal(output.persisted, false);
      assert.equal(output.network, false);
    }
  });
});
