import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";

const root = repoRoot();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("v0.1.0 notes, without a tag", () => {
  test("the public changelog is the ORVUPI one and the v0.1.0 notes stay in docs/releases", () => {
    // El CHANGELOG de la raíz se reescribió con la identidad ORVUPI; la entrada 0.1.0 vive en docs/releases/v0.1.0.
    const log = read("CHANGELOG.md");
    assert.match(log, /^# Cambios de ORVUPI/);
    assert.equal(new RegExp(`\\b${["STU", "BX"].join("")}\\b`).test(log), false);
    assert.match(read("docs/releases/v0.1.0/NOTAS.es.md"), /Verify/);
  });

  test("Spanish and English notes cover the same four pieces", () => {
    const es = read("docs/releases/v0.1.0/NOTAS.es.md");
    const en = read("docs/releases/v0.1.0/NOTAS.en.md");
    for (const text of [es, en]) {
      assert.match(text, /Verify/);
      assert.match(text, /Lab/);
      assert.match(text, /web v2/i);
      assert.match(text, /sitemap\.xml/);
      assert.match(text, /robots\.txt/);
      assert.match(text, /0\.1\.0/);
    }
    assert.match(es, /Fecha de estas notas: 2026-10-10\./);
    assert.match(en, /These notes are dated 2026-10-10\./);
    assert.match(es, /La web v2 se desplegó en orvupi.com el 2026-10-09, fuera de estas notas\. Estas notas no la despliegan ni la cambian\./);
    assert.match(en, /Web v2 was deployed to orvupi.com on 2026-10-09, outside these notes\. These notes do not deploy or change it\./);
    assert.match(es, /Este repositorio no inserta medición de visitas ni cookies\. Cloudflare Web Analytics debe estar apagado en el panel de la zona \(sin baliza en el HTML servido el 2026-10-10\)\./);
    assert.match(en, /This repository inserts no visit measurement or cookies\. Cloudflare Web Analytics must be off in the zone dashboard \(no beacon in the HTML served on 2026-10-10\)\./);
    assert.equal(es.includes("vista previa"), false);
    assert.equal(en.toLowerCase().includes("preview"), false);
    assert.match(es, /`web\/v2\/` es la web publicada en orvupi.com desde el 2026-10-09 \(merge `ed1c7759`\)\. `web\/current\/` es la copia anterior, para volver atrás\./);
    assert.match(en, /`web\/v2\/` is the website published on orvupi.com since 2026-10-09 \(merge `ed1c7759`\)\. `web\/current\/` is the earlier copy, kept so it can be put back\./);
    assert.match(es, /Studio está desplegado \(PR #20 y #26\) y se indexa\. Verify universal está desplegado \(merge `2434636`\)\. El cuaderno está en orvupi\.com\/cuaderno desde el 2026-10-10 \(PR #24\)\./);
    assert.match(en, /Studio is deployed \(pull requests #20 and #26\) and it is indexable\. Verify universal is deployed \(merge `2434636`\)\. The notebook is at orvupi\.com\/cuaderno since 2026-10-10 \(pull request #24\)\./);
    assert.match(es, /el tablero en \/tablero \(PR #27\)/);
    assert.match(en, /the board at \/tablero \(pull request #27\)/);
    assert.match(es, /orvupi\.com\/pares desde el 2026-10-10 \(PR #31\) y el tablero la da por publicada/);
    assert.match(en, /orvupi\.com\/pares since 2026-10-10 \(pull request #31\), and the board marks it published/);
    assert.match(es, /cualquier mint SPL o Token-2022/);
    assert.match(en, /any SPL or Token-2022 mint/);
    assert.equal(es.includes("hay que reescribir"), false);
    assert.equal(en.includes("this paragraph has to be rewritten"), false);
    assert.equal(es.includes("no consulta la red"), false);
    assert.equal(en.includes("does not query the network"), false);
    assert.equal(es.includes("no están construidos"), false);
    assert.equal(en.includes("not built"), false);
    assert.equal(es.includes("/studio/"), false);
    assert.equal(en.includes("/studio/"), false);
    assert.match(es, /Puedes perderlo todo/);
    assert.match(en, /You could lose everything/);
    assert.equal(en.includes("You can lose"), false);
    assert.equal(es.includes("Memecoin experimental"), false);
    assert.equal(en.includes("Experimental memecoin"), false);
  });

  test("the tag message is ready and the helper refuses to create it", () => {
    const message = read("docs/releases/v0.1.0/tag-message.txt");
    const guide = read("docs/releases/v0.1.0/TAG.md");
    const helper = read("scripts/prepare-v0.1.0-tag.mjs");
    assert.match(message, /ORVUPI 0\.1\.0 \(2026-10-10\)/);
    assert.match(message, /You could lose everything/);
    assert.match(guide, /Estado: \*\*creado\*\*/);
    assert.match(guide, /392de12adf34c1df890a95c7491fb31c1c8bce45/);
    assert.equal(guide.includes("no creado"), false);
    assert.match(guide, /git tag -a v0\.1\.0 SHA/);
    assert.equal(helper.includes("git tag"), true);
    assert.match(helper, /process\.exit\(1\)/);
    assert.equal(/exec(File|Sync)?\(/.test(helper), false);
    assert.equal(helper.includes("child_process"), false);

    const tagsOf = () => {
      const listed = spawnSync("git", ["tag", "-l", "v0.1.0"], { cwd: root, encoding: "utf8" });
      assert.equal(listed.status, 0);
      return listed.stdout;
    };
    const before = tagsOf();

    const shown = spawnSync(process.execPath, ["scripts/prepare-v0.1.0-tag.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(shown.status, 0, shown.stderr);
    assert.match(shown.stdout, /no creado/);
    assert.match(shown.stdout, /no ejecuta/);

    const refused = spawnSync(process.execPath, ["scripts/prepare-v0.1.0-tag.mjs", "--create"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /No se crea el tag/);

    assert.equal(tagsOf(), before);
    const listed = before.trim();
    assert.ok(listed === "" || listed === "v0.1.0", listed);
    if (listed === "v0.1.0") {
      const peeled = spawnSync("git", ["rev-parse", "v0.1.0^{}"], { cwd: root, encoding: "utf8" });
      assert.equal(peeled.status, 0, peeled.stderr);
      assert.equal(peeled.stdout.trim(), "392de12adf34c1df890a95c7491fb31c1c8bce45");
    }
  });

  test("README and LIMITS use the current footer, not the retired line", () => {
    const readme = read("README.md");
    const limits = read("LIMITS.md");
    for (const text of [readme, limits]) {
      assert.equal(text.includes("Memecoin experimental"), false);
      assert.equal(text.includes("you can lose everything"), false);
      // El aviso de riesgo vive solo en /risks (regla permanente).
      assert.equal(/You could lose everything|Puedes perderlo todo/.test(text), false);
    }
  });
});
