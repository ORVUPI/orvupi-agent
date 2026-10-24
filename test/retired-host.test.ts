import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";

/** Host retirado, partido para que este archivo no lo publique entero. */
const NEEDLE = ["stub", "xai"].join("");

const ALLOWED = new Set([
  "verify/test/fixtures/registry-demo.json",
  "verify/test/fixtures/name-impersonation.json",
  "verify/test/layouts.ts",
  "verify/test/security.test.ts",
  "web/v2/studio/blocklist.json",
  "test/studio.test.ts",
]);

const SKIP = new Set([".git", "node_modules", "dist", "test-results", "coverage", "test-report.json", "test-reporter-out.txt"]);
const TEXT = new Set([
  ".html", ".json", ".md", ".txt", ".ts", ".mjs", ".js", ".py", ".css", ".xml", ".toml", ".yml", ".yaml",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT.has(path.extname(name)) || name.startsWith("_") || name === "LICENSE") out.push(full);
  }
  return out;
}

describe("el host retirado no sale en la web ni en la documentación", () => {
  test("solo queda en el detector y en la lista de Studio", () => {
    const root = repoRoot();
    const hits: string[] = [];
    for (const file of walk(root)) {
      const rel = path.relative(root, file);
      if (ALLOWED.has(rel)) continue;
      let text = "";
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (text.toLowerCase().includes(NEEDLE)) hits.push(rel);
    }
    assert.deepEqual(hits, []);
    for (const rel of ALLOWED) {
      const text = readFileSync(path.join(root, rel), "utf8").toLowerCase();
      assert.equal(text.includes(NEEDLE), true, rel);
    }
  });
});
