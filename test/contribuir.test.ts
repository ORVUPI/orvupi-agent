import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";

function read(rel: string): string {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

function hiddenNames(): string[] {
  return [
    ["Cri", "stian"],
    ["Par", "do"],
    ["Cama", "cho"],
  ].map((parts) => parts.join("").toLowerCase());
}

const FILES = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/informe-fallo.yml",
  ".github/ISSUE_TEMPLATE/mejora.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "web/v2/contribuir/plantilla.md",
];

describe("contribuciones", () => {
  test("las plantillas piden el fallo y no datos personales", () => {
    const fallo = read(".github/ISSUE_TEMPLATE/informe-fallo.yml");
    const mejora = read(".github/ISSUE_TEMPLATE/mejora.yml");
    const config = read(".github/ISSUE_TEMPLATE/config.yml");
    const propuesta = read(".github/PULL_REQUEST_TEMPLATE.md");
    for (const text of [fallo, mejora]) {
      assert.match(text, /id: version/);
      assert.match(text, /id: evidencia/);
      assert.match(text, /id: mint/);
      assert.equal(/id: (email|correo|nombre|name|seed|key)\b/.test(text), false);
      assert.equal(/<input\b|<form\b/.test(text), false);
    }
    assert.match(fallo, /id: pasos/);
    assert.match(fallo, /id: esperado/);
    assert.match(fallo, /id: observado/);
    assert.match(mejora, /Explicación confusa/);
    assert.match(mejora, /Traducción revisable/);
    assert.match(mejora, /Prueba de accesibilidad/);
    assert.match(config, /blank_issues_enabled: false/);
    assert.match(config, /security\/policy/);
    assert.equal(config.includes("mailto:"), false);
    assert.match(propuesta, /No pide semilla/);
    assert.match(propuesta, /No firma ni envía/);
    for (const rel of FILES) {
      const folded = read(rel).toLowerCase();
      for (const name of hiddenNames()) assert.equal(folded.includes(name), false, rel);
    }
  });
});
