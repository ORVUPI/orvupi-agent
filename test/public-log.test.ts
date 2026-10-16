import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";
import {
  DAILY_NOTE,
  LOG_FILE,
  buildAnchorText,
  buildPublicLogEntry,
  canonicalJson,
  checkLogsUpdate,
  lineHash,
  parseLogText,
  runUrl,
  serializeEntry,
  verifyAnchors,
  verifyLogText,
} from "../src/public-log.js";
import type { DailyDetail, PublicLogEntry } from "../src/public-log.js";
import { appendDailyEntry, readLogsTree, verifyLogsTree } from "../src/public-log-files.js";
import { ENGAGED, writeState } from "./helpers.js";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const RUN = "https://github.com/ORVUPI/orvupi-agent/actions/runs/123456";

const DETAIL: DailyDetail = {
  mode: "prototipo",
  commit: SHA,
  killSwitch: { readable: true, engaged: false },
  drill: { ran: true, ok: true, steps: 11, passed: 11 },
  note: DAILY_NOTE,
};

function chain(count: number): { entries: PublicLogEntry[]; lines: string[]; text: string } {
  const entries: PublicLogEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const prev = entries[i - 1];
    entries.push(
      buildPublicLogEntry({
        seq: i + 1,
        ts: `2026-09-${String(27 + i).padStart(2, "0")}T06:23:00.000Z`,
        detail: DETAIL,
        evidence: RUN,
        prevHash: prev ? prev.hash : null,
      }),
    );
  }
  const lines = entries.map((e) => serializeEntry(e));
  return { entries, lines, text: lines.length ? `${lines.join("\n")}\n` : "" };
}

function tree(files: Record<string, string>): Map<string, Buffer> {
  return new Map(Object.entries(files).map(([k, v]) => [k, Buffer.from(v)]));
}

function withAnchors(c: ReturnType<typeof chain>, upTo = c.entries.length): Record<string, string> {
  const files: Record<string, string> = { [LOG_FILE]: c.text };
  for (const e of c.entries.slice(0, upTo)) {
    files[`anchors/${e.ts.slice(0, 10)}-${String(e.seq).padStart(6, "0")}.txt`] = buildAnchorText(c.lines, e);
  }
  return files;
}

describe("public append-only log", () => {
  test("canonical JSON sorts keys at every level", () => {
    assert.equal(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } }), '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}');
  });

  test("an empty log verifies with no head", () => {
    assert.deepEqual(verifyLogText(""), { ok: true, entries: 0, head: null, problems: [] });
  });

  test("a three-entry chain verifies and links every line", () => {
    const c = chain(3);
    const result = verifyLogText(c.text);
    assert.equal(result.ok, true, result.problems.join("; "));
    assert.equal(result.entries, 3);
    assert.equal(result.head, c.entries[2]?.hash);
    assert.equal(c.entries[0]?.prevHash, null);
    assert.equal(c.entries[1]?.prevHash, c.entries[0]?.hash);
    const first = c.entries[0];
    assert.ok(first);
    assert.equal(first.hash, lineHash(1, 1, first.contentSha256, null));
  });

  test("editing a detail breaks the chain", () => {
    const c = chain(3);
    const edited = c.text.replace('"passed":11', '"passed":10');
    assert.notEqual(edited, c.text);
    assert.equal(verifyLogText(edited).ok, false);
  });

  test("deleting or reordering a line breaks the chain", () => {
    const c = chain(3);
    assert.equal(verifyLogText(`${c.lines[0]}\n${c.lines[2]}\n`).ok, false);
    assert.equal(verifyLogText(`${c.lines[1]}\n${c.lines[0]}\n${c.lines[2]}\n`).ok, false);
  });

  test("non-canonical spacing, missing newline and extra keys are rejected", () => {
    const c = chain(1);
    const spaced = `${JSON.stringify(JSON.parse(c.lines[0] ?? ""), null, 1).replace(/\n/g, "")}\n`;
    assert.equal(verifyLogText(spaced).ok, false);
    assert.equal(verifyLogText(c.text.slice(0, -1)).ok, false);
    const extra = { ...(JSON.parse(c.lines[0] ?? "") as object), extra: 1 };
    assert.equal(verifyLogText(`${canonicalJson(extra)}\n`).ok, false);
  });

  test("evidence must be a run of the official repository", () => {
    const foreign = buildPublicLogEntry({
      seq: 1,
      ts: "2026-09-27T06:23:00.000Z",
      detail: DETAIL,
      evidence: "https://example.com/actions/runs/1",
      prevHash: null,
    });
    assert.equal(verifyLogText(`${serializeEntry(foreign)}\n`).ok, false);
    assert.equal(runUrl("ORVUPI/orvupi-agent", "987"), "https://github.com/ORVUPI/orvupi-agent/actions/runs/987");
    assert.equal(runUrl("someone/fork", "987"), null);
    assert.equal(runUrl("ORVUPI/orvupi-agent", "abc"), null);
  });

  test("a drill cannot be reported as run while the kill-switch is on", () => {
    const bad = buildPublicLogEntry({
      seq: 1,
      ts: "2026-09-27T06:23:00.000Z",
      detail: { ...DETAIL, killSwitch: { readable: true, engaged: true } },
      evidence: null,
      prevHash: null,
    });
    assert.equal(verifyLogText(`${serializeEntry(bad)}\n`).ok, false);
    const inconsistent = buildPublicLogEntry({
      seq: 1,
      ts: "2026-09-27T06:23:00.000Z",
      detail: { ...DETAIL, drill: { ran: true, ok: true, steps: 11, passed: 10 } },
      evidence: null,
      prevHash: null,
    });
    assert.equal(verifyLogText(`${serializeEntry(inconsistent)}\n`).ok, false);
  });

  test("anchors must match the log prefix they claim", () => {
    const c = chain(2);
    const files = withAnchors(c);
    const anchors = new Map(
      Object.entries(files)
        .filter(([k]) => k.startsWith("anchors/"))
        .map(([k, v]) => [k.slice(8), v]),
    );
    assert.deepEqual(verifyAnchors(c.text, anchors), []);
    const [name, text] = [...anchors][0] ?? ["", ""];
    assert.notDeepEqual(verifyAnchors(c.text, new Map([[name, text.replace(/head: \w+/, `head: ${"0".repeat(64)}`)]])), []);
    assert.notDeepEqual(verifyAnchors(c.text, new Map([["2026-01-01-000001.txt", text]])), []);
  });

  test("a full rewrite with recomputed hashes still fails the anchors", () => {
    const c = chain(2);
    const files = withAnchors(c);
    const rewritten: PublicLogEntry[] = [];
    for (const e of c.entries) {
      const prev = rewritten[rewritten.length - 1];
      rewritten.push(
        buildPublicLogEntry({
          seq: e.seq,
          ts: e.ts,
          detail: { ...DETAIL, drill: { ran: true, ok: false, steps: 11, passed: 3 } },
          evidence: e.evidence,
          prevHash: prev ? prev.hash : null,
        }),
      );
    }
    const text = `${rewritten.map((e) => serializeEntry(e)).join("\n")}\n`;
    assert.equal(verifyLogText(text).ok, true);
    const result = verifyLogsTree(tree({ ...files, [LOG_FILE]: text }));
    assert.equal(result.ok, false);
    const update = checkLogsUpdate(tree(files), tree({ ...files, [LOG_FILE]: text }), null);
    assert.equal(update.ok, false);
    assert.ok(update.problems.some((p) => p.includes("solo-añadir")));
  });

  test("an update may append one entry with its anchor and stamp", () => {
    const c = chain(2);
    const before = withAnchors({ ...c, entries: c.entries.slice(0, 1), lines: c.lines.slice(0, 1), text: `${c.lines[0]}\n` });
    before["anchors/2026-09-27-000001.txt.ots"] = "pending";
    const after = { ...withAnchors(c), "anchors/2026-09-27-000001.txt.ots": "upgraded", "anchors/2026-09-28-000002.txt.ots": "new" };
    const result = checkLogsUpdate(tree(before), tree(after), 1);
    assert.equal(result.ok, true, result.problems.join("; "));
    assert.equal(result.newEntries, 1);
  });

  test("an update may not edit anchors, delete stamps, add files or add two entries", () => {
    const one = chain(1);
    const three = chain(3);
    const before = { ...withAnchors(one), "anchors/2026-09-27-000001.txt.ots": "x" };
    const base = withAnchors(three);
    const cases: Record<string, string>[] = [
      { ...base, "anchors/2026-09-27-000001.txt.ots": "x" },
      { ...withAnchors(chain(2)) },
      { ...withAnchors(chain(2)), "anchors/2026-09-27-000001.txt.ots": "x", "notes.md": "hola" },
      {
        ...withAnchors(chain(2)),
        "anchors/2026-09-27-000001.txt.ots": "x",
        "anchors/2026-09-27-000001.txt": "orvupi-agent public log anchor v1\n",
      },
      { ...withAnchors(chain(2)), "anchors/2026-09-27-000001.txt.ots": "x", "anchors/2026-09-30-000009.txt.ots": "y" },
    ];
    const limits = [1, 1, 1, 1, 1];
    cases.forEach((next, i) => {
      assert.equal(checkLogsUpdate(tree(before), tree(next), limits[i] ?? 1).ok, false, `case ${i}`);
    });
  });

  test("appendDailyEntry writes a real entry and an anchor, then links the next one", () => {
    const logsDir = path.join(mkdtempSync(path.join(tmpdir(), "orvupi-logs-")), "logs");
    const times = ["2026-09-27T06:23:00.000Z", "2026-09-28T06:23:00.000Z"];
    let i = 0;
    const now = () => times[Math.min(i, times.length - 1)] ?? times[0] ?? "";
    const first = appendDailyEntry({ root: repoRoot(), logsDir, now, commit: SHA, evidence: RUN });
    assert.equal(first.ok, true, JSON.stringify(first));
    i = 1;
    const second = appendDailyEntry({ root: repoRoot(), logsDir, now, commit: "not-a-sha", evidence: null });
    assert.equal(second.ok, true, JSON.stringify(second));
    if (!first.ok || !second.ok) {
      return;
    }
    assert.equal(first.entry.detail.mode, "prototipo");
    assert.deepEqual(first.entry.detail.killSwitch, { readable: true, engaged: false });
    assert.equal(first.entry.detail.drill.ran, true);
    assert.equal(first.entry.detail.drill.ok, true);
    assert.equal(first.entry.detail.commit, SHA);
    assert.equal(second.entry.detail.commit, null);
    assert.equal(second.entry.prevHash, first.entry.hash);
    assert.deepEqual(readdirSync(path.join(logsDir, "anchors")).sort(), ["2026-09-27-000001.txt", "2026-09-28-000002.txt"]);
    const read = readLogsTree(logsDir);
    const verified = verifyLogsTree(read.tree);
    assert.equal(verified.ok, true, verified.problems.join("; "));
    assert.equal(verified.entries, 2);
    assert.equal(verified.missingStamps.length, 2);
    const text = readFileSync(path.join(logsDir, LOG_FILE), "utf8");
    assert.equal(parseLogText(text).entries.length, 2);
    assert.equal(/compra|precio|price|buy|rentab/i.test(text), false);
  });

  test("with the kill-switch on, the entry records it and the drill does not run", () => {
    const logsDir = path.join(mkdtempSync(path.join(tmpdir(), "orvupi-logs-")), "logs");
    const result = appendDailyEntry({
      root: repoRoot(),
      logsDir,
      killSwitchPath: writeState("killswitch.json", ENGAGED),
      now: () => "2026-09-27T06:23:00.000Z",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.entry.detail.killSwitch, { readable: true, engaged: true });
      assert.deepEqual(result.entry.detail.drill, { ran: false, ok: null, steps: 0, passed: 0 });
    }
    const unreadable = appendDailyEntry({
      root: repoRoot(),
      logsDir,
      killSwitchPath: path.join(logsDir, "missing.json"),
      now: () => "2026-09-27T07:00:00.000Z",
    });
    assert.equal(unreadable.ok, true);
    if (unreadable.ok) {
      assert.deepEqual(unreadable.entry.detail.killSwitch, { readable: false, engaged: null });
      assert.equal(unreadable.entry.detail.drill.ran, false);
    }
  });

  test("the fixed note names the workflow and keeps the social-media wording", () => {
    assert.ok(DAILY_NOTE.length <= 400);
    assert.match(DAILY_NOTE, /^Prototipo\. El agente de este repositorio no publica en redes sociales, no firma y no mueve fondos\./);
    assert.match(DAILY_NOTE, /@ORVUPI/);
    assert.match(DAILY_NOTE, /workflow daily-log/);
  });

  test("KILL-SWITCH.md and LOGS.md declare the daily-log exception", () => {
    const ks = readFileSync(path.join(repoRoot(), "KILL-SWITCH.md"), "utf8");
    const logs = readFileSync(path.join(repoRoot(), "LOGS.md"), "utf8");
    assert.match(ks, /^Excepción: el registro diario del log público \(workflow `daily-log`/m);
    assert.match(ks, /\*\*no se ejecuta ninguna acción\*\* del agente\. El log diario solo anota/);
    assert.match(ks, /Exception: the daily public-log entry/);
    assert.match(logs, /como excepción declarada en \[KILL-SWITCH\.md\]/);
    assert.match(logs, /no tienen relación con STUBX ni con el token/i);
  });

  test("appendDailyEntry refuses to extend a tampered log", () => {
    const logsDir = path.join(mkdtempSync(path.join(tmpdir(), "orvupi-logs-")), "logs");
    mkdirSync(logsDir, { recursive: true });
    const c = chain(2);
    writeFileSync(path.join(logsDir, LOG_FILE), c.text.replace('"passed":11', '"passed":9'));
    const result = appendDailyEntry({ root: repoRoot(), logsDir, now: () => "2026-09-30T06:23:00.000Z" });
    assert.equal(result.ok, false);
  });

  test("readLogsTree rejects unexpected folders", () => {
    const logsDir = mkdtempSync(path.join(tmpdir(), "orvupi-logs-"));
    mkdirSync(path.join(logsDir, "other"));
    assert.notDeepEqual(readLogsTree(logsDir).problems, []);
  });

  test("the committed logs folder verifies", () => {
    const read = readLogsTree(path.join(repoRoot(), "logs"));
    assert.deepEqual(read.problems, []);
    const verified = verifyLogsTree(read.tree);
    assert.equal(verified.ok, true, verified.problems.join("; "));
  });
});

describe("workflows", () => {
  function workflow(name: string): string {
    return readFileSync(path.join(repoRoot(), ".github", "workflows", name), "utf8");
  }

  test("daily-log is pinned, least-privilege and only writes from main", () => {
    const text = workflow("daily-log.yml");
    assert.match(text, /^on:\n {2}schedule:\n {4}- cron: "([1-9]|[1-5]\d) \d+ \* \* \*"\n {2}workflow_dispatch:\n/m);
    assert.match(text, /^permissions:\n {2}contents: read\n\n/m);
    assert.equal((text.match(/contents: write/g) ?? []).length, 1);
    assert.equal((text.match(/permissions:/g) ?? []).length, 2);
    assert.equal(text.includes("secrets."), false);
    assert.equal(text.includes("pull_request"), false);
    assert.equal(text.includes("id-token"), false);
    for (const line of text.match(/uses: \S+/g) ?? []) {
      assert.match(line, /^uses: [\w./-]+@[0-9a-f]{40}$/, line);
    }
    const commitJob = text.slice(text.indexOf("\n  commit:"));
    assert.match(commitJob, /if: github\.ref == 'refs\/heads\/main'/);
    assert.match(commitJob, /contents: write/);
    assert.match(commitJob, /persist-credentials: false/);
    assert.match(commitJob, /logs:check-update/);
    assert.match(commitJob, /npm ci --ignore-scripts/);
    assert.equal(/npm ci\n/.test(commitJob), false);
    assert.equal(commitJob.includes("pip install"), false);
    assert.equal(commitJob.includes("ots-requirements"), false);
    const buildJob = text.slice(text.indexOf("\n  build:"), text.indexOf("\n  commit:"));
    assert.equal(buildJob.includes("contents: write"), false);
    assert.match(buildJob, /--require-hashes/);
    assert.match(buildJob, /persist-credentials: false/);
  });

  test("the OpenTimestamps client is pinned by version and hash", () => {
    const req = readFileSync(path.join(repoRoot(), ".github", "ots-requirements.txt"), "utf8");
    assert.match(req, /^opentimestamps-client==0\.7\.2 \\$/m);
    const packages = req.split("\n").filter((l) => /^[a-z]/i.test(l));
    assert.ok(packages.length >= 5);
    for (const p of packages) {
      assert.match(p, /^[\w.-]+==[\w.]+ \\$/, p);
    }
    assert.ok((req.match(/--hash=sha256:[0-9a-f]{64}/g) ?? []).length >= packages.length);
  });

  test("scheduled workflows avoid the top of the hour", () => {
    for (const name of ["ci.yml", "daily-log.yml", "killswitch-drill.yml"]) {
      const crons = workflow(name).match(/cron: "(\d+) /g) ?? [];
      assert.ok(crons.length > 0, name);
      for (const c of crons) {
        assert.notEqual(c, 'cron: "0 ', name);
      }
    }
  });

  test("ci verifies the log and keeps it append-only", () => {
    const text = workflow("ci.yml");
    assert.match(text, /npm run logs:verify/);
    assert.match(text, /logs:check-update/);
  });
});
