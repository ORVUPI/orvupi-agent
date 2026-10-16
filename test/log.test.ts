import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fingerprint } from "../src/fingerprint.js";
import { buildLogEntry, verifyChain } from "../src/log.js";
import type { LogEntry } from "../src/types.js";
import { agent } from "./helpers.js";

describe("log fingerprint", () => {
  test("sha256 of abc matches the known digest", () => {
    assert.equal(
      fingerprint("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("buildLogEntry fills the fingerprint fields", () => {
    const entry = buildLogEntry({
      ts: "2026-09-26T12:00:00.000Z",
      action: "log:append",
      detail: "hola",
    });
    assert.equal(entry.actor, "orvupi-agent");
    assert.equal(entry.prevHash, null);
    assert.equal(entry.chain, "stub-until-p4");
    assert.equal(entry.evidence, null);
    assert.match(entry.contentSha256, /^[0-9a-f]{64}$/);
    assert.match(entry.hash, /^[0-9a-f]{64}$/);
    assert.equal(
      entry.contentSha256,
      fingerprint(
        JSON.stringify({
          v: 1,
          ts: entry.ts,
          actor: entry.actor,
          action: entry.action,
          detail: entry.detail,
        }),
      ),
    );
    assert.equal(
      entry.hash,
      fingerprint(JSON.stringify({ v: 1, contentSha256: entry.contentSha256, prevHash: null })),
    );
  });

  test("a changed detail changes the fingerprint", () => {
    const left = buildLogEntry({ ts: "2026-09-26T12:00:00.000Z", action: "log:append", detail: "uno" });
    const right = buildLogEntry({ ts: "2026-09-26T12:00:00.000Z", action: "log:append", detail: "dos" });
    assert.notEqual(left.contentSha256, right.contentSha256);
    assert.notEqual(left.hash, right.hash);
  });

  test("verifyChain stays an explicit P4 stub", () => {
    const entry = buildLogEntry({ ts: "2026-09-26T12:00:00.000Z", action: "log:append", detail: "uno" });
    const result = verifyChain([entry]);
    assert.equal(result.ok, false);
    assert.equal(result.implemented, false);
    assert.equal(result.phase, "P4");
  });

  test("in-memory append links prevHash and does not persist", () => {
    const orch = agent();
    const first = orch.dispatch("log:append", { kind: "note", detail: "primera nota local" });
    const second = orch.dispatch("log:append", { kind: "note", detail: "segunda nota local" });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) {
      return;
    }
    const firstEntry = (first.output as { entry: LogEntry }).entry;
    const secondEntry = (second.output as { entry: LogEntry }).entry;
    assert.equal(firstEntry.prevHash, null);
    assert.equal(secondEntry.prevHash, firstEntry.hash);
    assert.equal(orch.logEntries().length, 2);
    const chain = verifyChain(orch.logEntries());
    assert.equal(chain.ok, false);
  });
});
