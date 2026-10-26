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
      LIBRARY_VIEWS: string[];
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
    assert.deepEqual(route.LIBRARY_VIEWS, ["plantillas", "fotos", "elementos", "favoritos"]);
    assert.equal(route.routeFromHash("#/work/not-a-view"), "work");
    assert.deepEqual(route.queryFromHash("#/plantillas&grupo=negocios&cat=curriculum"), {
      grupo: "negocios",
      cat: "curriculum",
    });
    assert.equal(route.queryFromHash("#/plantillas?text=Estrategia").text, "Estrategia");
    assert.equal(route.queryFromHash("#/fotos?q=papel").q, "papel");
  });

  test("hay muchas fotos y elementos neutros, sin creators", async () => {
    const lib = await import(studio("lib/library.mjs")) as {
      browsePhotos: () => { id: string; es: string; premium: boolean; scene: { nodes: unknown[] } }[];
      browseElements: () => { id: string; topic: string }[];
      browseCreators?: unknown;
      filterCreators?: unknown;
      filterBrowse: (items: { es: string; tags?: string[] }[], query: { query?: string; price?: string }) => unknown[];
    };
    const photos = lib.browsePhotos();
    const elements = lib.browseElements();
    assert.ok(photos.length >= 180 && photos.length <= 200);
    assert.ok(elements.length >= 100);
    assert.equal(lib.browseCreators, undefined);
    assert.equal(lib.filterCreators, undefined);
    assert.equal(new Set(photos.map((item) => item.id)).size, photos.length);
    assert.equal(new Set(elements.map((item) => item.id)).size, elements.length);
    assert.ok(lib.filterBrowse(photos, { query: "papel" }).length >= 24);
    assert.ok(lib.filterBrowse(photos, { price: "gratis" }).length >= 120);
    assert.ok(photos.some((item) => item.premium));
    const blob = JSON.stringify({ photos, elements }).toLowerCase();
    assert.equal(blob.includes("canva"), false);
    assert.equal(blob.includes("pulpo"), false);
    assert.equal(blob.includes("imagen generada"), false);
    assert.equal(blob.includes("creators"), false);
  });
});
