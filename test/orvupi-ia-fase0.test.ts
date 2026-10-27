import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("ARQIVEN fase 0", () => {
  test("el informe cita el HEAD auditado y el hash de la maqueta", () => {
    const pack = read("docs/orvupi-ia/PAQUETE.md");
    assert.match(pack, /707fef7c32aee3ed7a0dd9751995c690f27d56ef/);
    assert.match(pack, /6f4f882b35121e00e8d51d8d0f4c6ea855ca08de/);
    assert.match(pack, /ecb9dd6f489d4748970913f854aef5d5971507d2fb7d24c7804b3c33900d3ba9/);
    assert.match(pack, /arqiven-1-experimental/);
    assert.equal(existsSync(path.join(root, "web/v2/ia/index.html")), false);
    assert.equal(existsSync(path.join(root, "web/v2/arqiven/index.html")), false);
    assert.equal(read("web/v2/index.html").includes("ARQIVEN"), false);
  });

  test("la marca visible es ARQIVEN y la ficha es Arqiven-N", () => {
    const arch = read("docs/orvupi-ia/ARQUITECTURA.md");
    const plan = read("docs/orvupi-ia/PLAN-IMPLEMENTACION.md");
    const audit = read("docs/orvupi-ia/AUDITORIA.md");
    assert.match(arch, /arqiven-1-experimental/);
    assert.match(arch, /Arqiven-1 experimental/);
    assert.match(arch, /provider: "arqiven"/);
    assert.match(arch, /<nav class="site">/);
    assert.match(arch, /\/arqiven\//);
    assert.match(arch, /No se usa `orvupi-text-experimental`/);
    assert.equal(arch.includes('modelId: "orvupi-text-experimental-0.1"'), false);
    assert.match(plan, /modelId: "arqiven-1-experimental"/);
    assert.match(plan, /Arqiven-1 experimental/);
    assert.match(plan, /No se crea el id `orvupi-text-experimental-0.1`/);
    assert.equal(plan.includes('modelId: "orvupi-text-experimental-0.1"'), false);
    assert.match(audit, /110 con `<nav class="site">`/);
    assert.match(audit, /BroadcastChannel\("orvupi-work"\)/);
  });

  test("el esqueleto está apagado y no simula una respuesta de modelo", () => {
    const html = read("docs/orvupi-ia/prototipo/index.html");
    assert.match(html, /ARQIVEN no está activada/);
    assert.match(html, /preview=1/);
    assert.equal(html.includes("Espacio de Cristian"), false);
    assert.equal(html.includes("Pensando"), false);
    assert.equal(html.includes("ORVUPI IA"), false);
    assert.equal(html.includes("orvupi-text-experimental"), false);
    assert.match(html, /No hay respuesta generada/);
    assert.match(html, /get\("preview"\) === "1"/);
    assert.match(html, /aria-current="page">ARQIVEN</);
    assert.match(html, /arqiven-1-experimental/);
    assert.equal(html.includes("localStorage"), false);
    assert.equal(html.includes("getUserMedia"), false);
    assert.equal(html.includes("indexedDB"), false);
  });
});
