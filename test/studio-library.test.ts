import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

function studio(rel: string): string {
  return pathToFileURL(path.join(repoRoot(), "web/v2/studio", rel)).href;
}

describe("studio biblioteca", () => {
  test("routeFromHash ignora la consulta y el ampersand", async () => {
    const route = await import(studio("lib/route.mjs")) as {
      routeFromHash: (hash: string) => string;
      queryFromHash: (hash: string) => Record<string, string>;
    };
    assert.equal(route.routeFromHash("#/plantillas"), "plantillas");
    assert.equal(route.routeFromHash("#/plantillas?text=Estrategia"), "plantillas");
    assert.equal(route.routeFromHash("#/plantillas&grupo=negocios"), "plantillas");
    assert.equal(route.routeFromHash("#/fotos?q=papel"), "fotos");
    assert.equal(route.routeFromHash("#/elementos"), "elementos");
    assert.equal(route.routeFromHash("#/creators"), "creators");
    assert.equal(route.routeFromHash("#/favoritos"), "favoritos");
    assert.equal(route.routeFromHash("#/work/not-a-view"), "work");
    assert.deepEqual(route.queryFromHash("#/plantillas&grupo=negocios&cat=curriculum"), {
      grupo: "negocios",
      cat: "curriculum",
    });
    assert.equal(route.queryFromHash("#/plantillas?text=Estrategia").text, "Estrategia");
    assert.equal(route.queryFromHash("#/fotos?q=papel").q, "papel");
  });

  test("hay muchas fotos, elementos y creators neutros", async () => {
    const lib = await import(studio("lib/library.mjs")) as {
      browsePhotos: () => { id: string; es: string; premium: boolean; scene: { nodes: unknown[] } }[];
      browseElements: () => { id: string; topic: string }[];
      browseCreators: () => { id: string; name: string; samples: unknown[] }[];
      filterBrowse: (items: { es: string; tags?: string[] }[], query: { query?: string; price?: string }) => unknown[];
    };
    const photos = lib.browsePhotos();
    const elements = lib.browseElements();
    const creators = lib.browseCreators();
    assert.ok(photos.length >= 180 && photos.length <= 200);
    assert.ok(elements.length >= 100);
    assert.ok(creators.length >= 12);
    assert.equal(new Set(photos.map((item) => item.id)).size, photos.length);
    assert.equal(new Set(elements.map((item) => item.id)).size, elements.length);
    assert.ok(lib.filterBrowse(photos, { query: "papel" }).length >= 24);
    assert.ok(lib.filterBrowse(photos, { price: "gratis" }).length >= 120);
    assert.ok(photos.some((item) => item.premium));
    assert.ok(creators.every((item) => item.samples.length >= 3 && item.name.length > 2));
    const blob = JSON.stringify({ photos, elements, creators }).toLowerCase();
    assert.equal(blob.includes("canva"), false);
    assert.equal(blob.includes("pulpo"), false);
    assert.equal(blob.includes("imagen generada"), false);
  });
});
