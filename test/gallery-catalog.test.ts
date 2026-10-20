import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const assets = path.join(root, "web/v2/assets/orvupi");
const catalog = JSON.parse(readFileSync(path.join(assets, "catalogo.json"), "utf8")) as {
  id: number; file: string; thumbnail: string; category_slug: string; title_es: string; slug: string;
}[];
const manifest = JSON.parse(readFileSync(path.join(assets, "album-manifest.json"), "utf8")) as {
  origin: string; files: { file: string; bytes: number; sha256: string }[];
};

describe("galería ORVUPI de 500 imágenes", () => {
  test("incluye las 500 imágenes y 30 colecciones con identificadores únicos", () => {
    assert.equal(catalog.length, 500);
    assert.equal(new Set(catalog.map((item) => item.id)).size, 500);
    assert.ok(catalog.every((item) => Number.isSafeInteger(item.id) && item.id > 0));
    assert.ok(catalog.slice(250).every((item) => item.id > Math.max(...catalog.slice(0, 250).map((entry) => entry.id))));
    assert.equal(new Set(catalog.map((item) => item.file)).size, 500);
    assert.equal(new Set(catalog.map((item) => item.category_slug)).size, 30);
    for (const item of catalog) {
      assert.ok(item.title_es.trim());
      assert.ok(item.slug.trim());
      assert.ok(item.file.endsWith(`/${String(item.id).padStart(3, "0")}-${item.slug}.png`));
      assert.equal(item.thumbnail, `previews/${String(item.id).padStart(3, "0")}-${item.slug}.webp`);
      assert.ok(!item.file.includes("..") && !item.thumbnail.includes(".."));
    }
  });

  test("conserva exactamente las rutas, tamaños y huellas de los 250 PNG anteriores", () => {
    const oldFiles = manifest.files.slice(0, 250);
    const digest = createHash("sha256").update(JSON.stringify(oldFiles)).digest("hex");
    assert.equal(digest, "e8fca4f42e9f6a83ea90ff743c3afd524fc9b03db885229680865aba647978e2");
    assert.deepEqual(oldFiles.map((item) => item.file), catalog.slice(0, 250).map((item) => item.file));
  });

  test("cada imagen tiene un PNG descargable y una vista previa verificable", () => {
    assert.equal(manifest.files.length, 1000);
    const files = new Map(manifest.files.map((entry) => [entry.file, entry]));
    assert.equal(files.size, 1000);
    for (const item of catalog) {
      for (const filename of [item.file, item.thumbnail]) {
        const entry = files.get(filename);
        assert.ok(entry, filename);
        assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, filename);
        assert.match(entry.sha256, /^[a-f0-9]{64}$/, filename);
      }
    }
    assert.equal(manifest.origin, "https://orvupi.com/assets/orvupi/album/");
  });

  test("la página anuncia el mismo número de imágenes y colecciones que el catálogo", () => {
    const html = readFileSync(path.join(root, "web/v2/memes/index.html"), "utf8");
    assert.ok(html.includes(`${catalog.length} PNG · ${new Set(catalog.map((item) => item.category_slug)).size} `));
  });
});
