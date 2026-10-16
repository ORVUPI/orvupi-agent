import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { REQUIRED_DAYS, logsStatus } from "../src/logs-status.js";
import { DAILY_NOTE, LOG_FILE, buildAnchorText, buildPublicLogEntry, serializeEntry } from "../src/public-log.js";
import type { DailyDetail, PublicLogEntry } from "../src/public-log.js";

const RUN = "https://github.com/ORVUPI/orvupi-agent/actions/runs/";
const DETAIL: DailyDetail = {
  mode: "prototipo",
  commit: null,
  killSwitch: { readable: true, engaged: false },
  drill: { ran: true, ok: true, steps: 10, passed: 10 },
  note: DAILY_NOTE,
};

/** Builds a valid logs/ tree with one anchor and stamp per entry. */
function logsTree(items: { ts: string; evidence: string | null }[]): Map<string, Buffer> {
  const entries: PublicLogEntry[] = [];
  items.forEach((item, i) => {
    entries.push(
      buildPublicLogEntry({
        seq: i + 1,
        ts: item.ts,
        detail: DETAIL,
        evidence: item.evidence,
        prevHash: entries[i - 1]?.hash ?? null,
      }),
    );
  });
  const lines = entries.map((e) => serializeEntry(e));
  const files = new Map<string, Buffer>();
  files.set(LOG_FILE, Buffer.from(lines.length ? `${lines.join("\n")}\n` : ""));
  for (const e of entries) {
    const name = `anchors/${e.ts.slice(0, 10)}-${String(e.seq).padStart(6, "0")}.txt`;
    files.set(name, Buffer.from(buildAnchorText(lines, e)));
    files.set(`${name}.ots`, Buffer.from("stamp"));
  }
  return files;
}

function daily(fromDay: number, count: number): { ts: string; evidence: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, fromDay + i, 6, 23));
    return { ts: d.toISOString(), evidence: `${RUN}${1000 + i}` };
  });
}

describe("logs:status (read-only summary for the PPM «Logs» box)", () => {
  test("an empty log counts zero days and keeps the box pending", () => {
    const s = logsStatus(new Map());
    assert.equal(s.ok, true);
    assert.equal(s.box, "pending");
    assert.equal(s.distinctDays, 0);
    assert.equal(s.daysCriterionMet, false);
    assert.equal(s.requiredDays, REQUIRED_DAYS);
  });

  test("six days are not enough", () => {
    const s = logsStatus(logsTree(daily(26, 6)));
    assert.equal(s.ok, true);
    assert.equal(s.distinctDays, 6);
    assert.equal(s.daysCriterionMet, false);
  });

  test("seven distinct UTC days meet the day criterion but the box stays pending", () => {
    const s = logsStatus(logsTree(daily(26, 7)));
    assert.equal(s.distinctDays, 7);
    assert.deepEqual(s.days, ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    assert.equal(s.daysCriterionMet, true);
    assert.equal(s.box, "pending");
    assert.equal(s.stamps, 7);
    assert.equal(s.manualChecks.length, 3);
    assert.match(s.note, /no marca la casilla/);
  });

  test("two entries on the same UTC day count once", () => {
    const items = [
      { ts: "2026-09-26T22:19:50.642Z", evidence: `${RUN}1` },
      { ts: "2026-09-26T23:59:59.000Z", evidence: `${RUN}2` },
      { ts: "2026-09-27T00:00:01.000Z", evidence: `${RUN}3` },
    ];
    const s = logsStatus(logsTree(items));
    assert.equal(s.workflowEntries, 3);
    assert.equal(s.distinctDays, 2);
  });

  test("entries without a run link (evidence null) are not counted", () => {
    const items = [...daily(1, 6), { ts: "2026-09-08T06:23:00.000Z", evidence: null }];
    const s = logsStatus(logsTree(items));
    assert.equal(s.ok, true);
    assert.equal(s.entries, 7);
    assert.equal(s.workflowEntries, 6);
    assert.equal(s.distinctDays, 6);
    assert.equal(s.daysCriterionMet, false);
  });

  test("a run link of another repository makes the log fail and counts nothing", () => {
    const items = [...daily(1, 7), { ts: "2026-09-09T06:23:00.000Z", evidence: "https://github.com/ORVUPI/orvupi-agent/actions/runs/9" }];
    const s = logsStatus(logsTree(items));
    assert.equal(s.ok, false);
    assert.equal(s.distinctDays, 0);
    assert.equal(s.daysCriterionMet, false);
  });

  test("a broken chain counts nothing and fails", () => {
    const t = logsTree(daily(26, 7));
    const text = t.get(LOG_FILE)!.toString("utf8").replace('"passed":10', '"passed":9');
    t.set(LOG_FILE, Buffer.from(text));
    const s = logsStatus(t);
    assert.equal(s.ok, false);
    assert.ok(s.problems.length > 0);
    assert.equal(s.distinctDays, 0);
    assert.equal(s.daysCriterionMet, false);
    assert.equal(s.box, "pending");
  });
});
