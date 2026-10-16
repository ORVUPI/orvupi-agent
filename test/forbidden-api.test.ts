import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import {
  dependencyFindings,
  FORBIDDEN_MARKERS,
  scanFile,
  scanText,
  scanTree,
} from "../src/forbidden-scan.js";
import { repoRoot } from "../src/paths.js";

describe("forbidden API scanner", () => {
  test("source, policy, and state have no forbidden markers", () => {
    const root = repoRoot();
    const findings = [
      ...scanTree(path.join(root, "src")),
      ...scanTree(path.join(root, "scripts")),
      ...scanTree(path.join(root, "policy")),
      ...scanTree(path.join(root, "state")),
    ];
    assert.deepEqual(findings, []);
  });

  test("the fixture is flagged", () => {
    const fixture = path.join(repoRoot(), "test", "fixtures", "forbidden-sample.js");
    const findings = scanFile(fixture);
    assert.ok(findings.length > 0);
    const markers = new Set(findings.map((item) => item.marker));
    for (const marker of FORBIDDEN_MARKERS) {
      assert.equal(markers.has(marker), true, marker);
    }
  });

  test("scanner flags an isolated signing call", () => {
    const marker = FORBIDDEN_MARKERS.find((item) => item.toLowerCase().includes("transaction") && item.startsWith("s"));
    assert.ok(marker);
    const findings = scanText("synthetic.txt", `kp.${marker}(tx);`);
    assert.equal(findings.length, 1);
  });

  test("each marker is detectable on its own line", () => {
    for (const marker of FORBIDDEN_MARKERS) {
      const findings = scanText("synthetic.txt", marker);
      assert.ok(findings.some((item) => item.marker === marker && item.line === 1), marker);
    }
  });

  test("runtime dependencies are absent", () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    assert.deepEqual(pkg.dependencies ?? {}, {});
    assert.deepEqual(dependencyFindings(pkg), []);
    assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@axe-core/playwright", "@playwright/test", "@types/node", "fake-indexeddb", "playwright", "typescript"]);
  });

  test("a declared wallet package would be flagged", () => {
    const banned = FORBIDDEN_MARKERS.find((item) => item.includes("web3"));
    assert.ok(banned);
    const hits = dependencyFindings({ dependencies: { [banned]: "1.0.0" } });
    assert.deepEqual(hits, [banned]);
  });

  test("source never sets an on-chain effect", () => {
    const findings = scanTree(path.join(repoRoot(), "src"));
    assert.deepEqual(findings, []);
    const combined = scanTree(path.join(repoRoot(), "src"));
    void combined;
    const text = readFileSync(path.join(repoRoot(), "src", "orchestrator.ts"), "utf8");
    assert.equal(text.includes("onChainEffect: true"), false);
    assert.equal(text.includes("signing: true"), false);
    assert.equal(text.includes("network: true"), false);
  });
});
