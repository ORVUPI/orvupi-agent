import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { READONLY_LINE, UNKNOWN_LINE } from "../copy.js";
import { repoRootFromMeta } from "../paths.js";
import { PALETTE, contrast } from "../theme.js";
import { bannedHits } from "../text.js";
import { buildOutputs, pagesDiffer } from "../tools/build-pages.js";
import { renderPages } from "../tools/render.js";
import { loadCards, loadFuentes } from "../mission/load.js";

const root = repoRootFromMeta(import.meta.url);

function cspHosts(policy: string): string[] {
  const connect = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => /(^|\s)connect-src\b/.test(part));
  if (!connect) return [];
  return connect
    .split(/\s+/)
    .filter((token) => token.startsWith("https://"))
    .map((token) => new URL(token).host);
}

function page(pages: Array<{ rel: string; body: string }>, suffix: string): string {
  const found = pages.find((item) => item.rel.endsWith(suffix));
  assert.ok(found, suffix);
  return found.body;
}

function externalSubresources(source: string): string[] {
  const hits: string[] = [];
  for (const match of source.matchAll(/<(script|link|img|iframe|source|audio|video|embed|object)\b[^>]*>/gi)) {
    const tag = match[0] ?? "";
    const src = /\s(?:src|href)\s*=\s*"([^"]*)"/i.exec(tag);
    const url = src?.[1] ?? "";
    if (url.length === 0) continue;
    if (/^(https?:)?\/\//i.test(url) || /^[a-z][a-z0-9+.-]*:/i.test(url)) hits.push(url);
  }
  for (const match of source.matchAll(/url\(\s*['"]?([^'")]+)/gi)) {
    const url = match[1] ?? "";
    if (/^(https?:)?\/\//i.test(url)) hits.push(url);
  }
  if (/@import\b/i.test(source)) hits.push("@import");
  return hits;
}

function unnamedButtons(html: string): string[] {
  const hits: string[] = [];
  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = match[1] ?? "";
    const label = /aria-label\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? "";
    if (label.length === 0 && !hasVisibleText(match[2] ?? "")) hits.push(match[0] ?? "");
  }
  return hits;
}

function hasVisibleText(inner: string): boolean {
  let inTag = false;
  for (const char of inner) {
    if (char === "<") {
      inTag = true;
      continue;
    }
    if (char === ">") {
      inTag = false;
      continue;
    }
    if (!inTag && char.trim().length > 0) return true;
  }
  return false;
}

describe("páginas estáticas", () => {
  const pages = buildOutputs(root);
  const htmlPages = pages.filter((item) => item.rel.endsWith(".html"));
  const css = page(pages, "assets/site.css");
  const missionJs = page(pages, "assets/mission.js");
  const sw = page(pages, "lab/sw.js");

  test("los HTML generados coinciden con los archivos del repositorio", () => {
    assert.deepEqual(pagesDiffer(root, pages), []);
  });

  test("cada página lleva el aviso, la fecha y la diferencia entre desconocido y comprobado", () => {
    for (const item of htmlPages) {
      assert.equal(item.body.includes("Cripto de alto riesgo · Puedes perderlo todo"), false, item.rel);
      assert.equal(item.body.includes("High-risk crypto · You could lose everything"), false, item.rel);
      assert.match(item.body, new RegExp(READONLY_LINE.es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(item.body, /2026-10-08/);
      assert.match(item.body, new RegExp(UNKNOWN_LINE.es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(item.body, /lang="es"/);
      assert.match(item.body, /<main id="contenido"/);
      assert.match(item.body, /href="#contenido"/);
      assert.match(item.body, /<h1>/);
      assert.match(item.body, /<title>[^<]+<\/title>/);
      assert.deepEqual(externalSubresources(item.body), [], item.rel);
      assert.deepEqual(unnamedButtons(item.body), [], item.rel);
      assert.equal(item.body.includes("tabindex=\"1\""), false, item.rel);
      for (const match of item.body.matchAll(/tabindex="(-?\d+)"/g)) {
        assert.ok(Number(match[1]) <= 0, item.rel);
      }
    }
  });

  test("no hay recursos externos ni analítica en css, script ni service worker", () => {
    assert.deepEqual(externalSubresources(css), []);
    assert.deepEqual(externalSubresources(missionJs), []);
    assert.equal(/https?:\/\//.test(sw), false);
    assert.equal(sw.includes("localStorage"), false);
    assert.match(sw, /caches\.delete/);
    const joined = pages.map((item) => item.body).join("\n") + sw;
    assert.equal(/gtag|google-analytics|googletagmanager|plausible|posthog/i.test(joined), false);
    for (const item of pages) {
      if (item.rel.endsWith("tablero/index.html")) continue;
      const body = item.body.replaceAll(
        "Read-only: it does not connect wallets or sign anything.",
        "Read-only: it does not connect accounts or sign anything.",
      );
      assert.deepEqual(bannedHits(body), [], item.rel);
    }
  });

  test("la paleta tiene contraste suficiente y el css la usa", () => {
    assert.ok(contrast(PALETTE.text, PALETTE.bg) >= 7);
    assert.ok(contrast(PALETTE.muted, PALETTE.bg) >= 4.5);
    assert.ok(contrast(PALETTE.accentInk, PALETTE.accent) >= 4.5);
    assert.ok(contrast(PALETTE.accent, PALETTE.bg) >= 3);
    assert.ok(contrast(PALETTE.ok, PALETTE.bg) >= 4.5);
    assert.ok(contrast(PALETTE.attention, PALETTE.bg) >= 4.5);
    assert.ok(contrast(PALETTE.risk, PALETTE.bg) >= 4.5);
    for (const color of Object.values(PALETTE)) {
      assert.match(css, new RegExp(color, "i"));
    }
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /overflow-wrap: anywhere/);
    assert.match(css, /min-height: 3\.5rem/);
    assert.match(css, /footer\.site a/);
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /max-width:\s*599px/);
    assert.match(css, /position:\s*static/);
    assert.ok(contrast(PALETTE.ok, PALETTE.bgElev) >= 4.5);
    assert.ok(contrast(PALETTE.risk, PALETTE.bgElev) >= 4.5);
    assert.ok(contrast(PALETTE.attention, PALETTE.bgElev) >= 4.5);
  });

  test("lab, verify y tablero salen de los datos del repositorio", () => {
    const lab = page(pages, "lab/index.html");
    const verify = page(pages, "verify/index.html");
    const board = page(pages, "tablero/index.html");
    assert.match(lab, /data-mission="mision-01"/);
    assert.match(lab, /Cómo detectar un token clon en 5 pasos/);
    assert.match(lab, /How to spot a clone token in 5 steps/);
    assert.match(lab, /¿Cómo funciona\?/);
    assert.match(lab, /Para quien quiera más detalle/);
    assert.match(lab, /For anyone who wants more detail/);
    assert.match(lab, /id="biblioteca"/);
    assert.match(verify, /Pega la dirección del token/);
    assert.match(verify, /Dirección del registro de STUBX/);
    assert.match(verify, /Se parece a STUBX, pero no es la CA oficial/);
    assert.match(verify, /No es una auditoría, ni una recomendación, ni un aval/);
    assert.match(verify, /Solo si pulsas «Guardar esta consulta»/);
    assert.match(verify, /No se pudo comprobar/);
    assert.match(verify, /id="direccion-token"/);
    assert.match(verify, /id="direccion-error"/);
    assert.match(verify, /Pega primero una dirección/);
    assert.match(verify, /Paste an address first/);
    assert.match(verify, /id="resultado"/);
    assert.match(missionJs, /Paso /);
    assert.match(lab, /TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump/);
    assert.match(missionJs, /function answer/);
    assert.match(missionJs, /Siguiente paso/);
    assert.match(missionJs, /Next step/);
    assert.match(missionJs, /Empezar de nuevo/);
    assert.match(missionJs, /Start again/);
    assert.match(missionJs, /step\.glossary\.forEach/);
    assert.match(missionJs, /function initialProgress/);
    assert.match(verify, /EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/);
    assert.match(verify, /no disponible/);
    assert.match(board, /data-status="en_revision"/);
    assert.match(board, /id="como-leerlo"/);
    assert.match(board, /id="plantilla"/);
    assert.match(board, /id="grupo-en_revision"/);
    assert.match(board, /No es un plazo/);
    assert.match(board, /It is not a deadline/);
    assert.match(board, /id="tarea-U01"/);
    assert.equal(board.includes('id="tarea-U01" data-status="publicada"'), false);
    assert.match(board, /data-web="si"/);
    assert.match(board, /data-web="no"/);
    assert.match(board, /La columna stubxai.com dice sí solo si la función se puede abrir hoy en la web/);
    assert.equal(board.includes("Nada de esta página está publicado"), false);
    assert.equal(board.includes("Hoy ninguna lo está"), false);
    assert.match(board, /Ejemplo educativo fijo, revisado por Legal/);
    assert.match(board, /Publicada en stubxai.com\/contribuir el 2026-10-10/);
    assert.equal(board.includes("Hoy stubxai.com/comparar no existe"), false);
    assert.match(board, /2026-10-09 · Usage measurement: none on the client/);
    assert.match(board, /id="tarea-U04" data-status="en_revision" data-web="si"/);
    assert.equal(board.includes("Hace falta un abogado"), false);
    assert.match(board, /https:\/\/github.com\/stubxai\/stubx-agent\/pull\/13/);
    assert.match(board, /lab\/test\/mission\.test\.ts/);
    assert.match(board, /\.github\/workflows\/ci\.yml/);
    assert.match(page(pages, "indice-borrador.html"), /href="\.\/lab\/index\.html"/);
    assert.match(verify, /no una lista completa de clones/);
    assert.match(verify, /Solo lectura: no conecta carteras ni firma nada/);
    assert.equal(verify.includes("Sin esa señal · ok"), false);
    assert.equal(verify.includes("No such signal · ok"), false);
    assert.match(verify, /class="sin-senal"/);
    assert.match(verify, /partial: yes|partial: no/);
    const headers = page(pages, "_headers");
    assert.match(headers, /Content-Security-Policy: default-src 'none'/);
    const verifyHeaders = headers.split("/verify/*")[1]?.split("\n\n")[0] ?? "";
    assert.deepEqual(cspHosts(verifyHeaders), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    assert.match(verifyHeaders, /! Content-Security-Policy/);
    const labHeaders = headers.split("/lab/*")[1]?.split("\n\n")[0] ?? "";
    assert.deepEqual(cspHosts(labHeaders), []);
    assert.equal(headers.includes("\n/*\n") || headers.startsWith("/*"), false);
    assert.equal(existsSync(path.join(root, "site-drafts/sw.js")), false);
    assert.equal(existsSync(path.join(root, "site-drafts/index.html")), false);
    const siteJs = readFileSync(path.join(root, "site-drafts/assets/site.js"), "utf8");
    assert.match(siteJs, /function onLab/);
    assert.match(siteJs, /register\("\/lab\/sw\.js", \{ scope: "\/lab\/" \}\)/);
    assert.equal(/\/lab\$/.test(siteJs), false);
    assert.match(sw, /fetch\(event\.request\)/);
    assert.ok(sw.indexOf("fetch(event.request)") < sw.indexOf("caches.match("));
    assert.match(sw, /url\.search === ""/);
    assert.equal(sw.includes("cache.put(event.request"), false);
    assert.match(sw, /path === "\/"/);
    assert.match(sw, /aviso/);
    assert.equal(sw.includes("../index.html"), false);
    assert.equal(sw.includes("./verify/"), false);
    const verifyJs = page(pages, "assets/verify.js");
    assert.match(verifyJs, /function classifyAddress/);
    assert.match(verifyJs, /function pendingView/);
    assert.match(verifyJs, /lectura_caida/);
    assert.match(verifyJs, /Esta dirección no es válida/);
    assert.match(verifyJs, /No es la dirección oficial/);
    assert.match(verifyJs, /scrollIntoView/);
    assert.match(verifyJs, /direccion-error/);
    assert.equal(verify.includes("frame-ancestors"), false);
    assert.match(verifyJs, /Comprobando esta dirección/);
    for (const html of [lab, verify]) {
      const start = html.indexOf('<details class="como">');
      const end = html.indexOf("</details>", start);
      const block = html.slice(start, end);
      assert.equal([...block.matchAll(/<li>/g)].length, 3, html.slice(0, 40));
    }
  });

  test("el modo publicación no es el borrador por defecto", () => {
    const cards = loadCards(root, loadFuentes(root));
    const published = renderPages(root, cards, { publish: true });
    const home = published.find((item) => item.rel.endsWith("indice-borrador.html"));
    assert.ok(home);
    assert.equal(home.body.includes('content="noindex"'), false);
    assert.equal(home.body.includes("No publicado"), false);
    assert.match(page(pages, "indice-borrador.html"), /content="noindex"/);
    assert.match(page(pages, "indice-borrador.html"), /No publicado/);
  });

  test("los svg decorativos no se anuncian como imagen sin texto", () => {
    for (const item of htmlPages) {
      for (const svg of item.body.matchAll(/<svg\b[^>]*>/gi)) {
        assert.match(svg[0] ?? "", /aria-hidden="true"/);
      }
    }
  });
});
