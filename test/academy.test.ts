import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { repoRoot } from "../src/paths.js";

// ORVUPI Academy: herramienta independiente en /academy/ que reúne Curva, Ejemplo de curva,
// Cuaderno, Lab y Aprender. Estas pruebas no abren navegador: leen los ficheros publicados.
const WEB = path.join(repoRoot(), "web/v2");
const AC = path.join(WEB, "academy");
const CA = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
const LANGS = ["", "/en", "/pt-br", "/ja", "/ko"];
const OLD: Record<string, string> = {
  aprender: "/academy/glosario/",
  lab: "/academy/practicas/laboratorio/",
  pares: "/academy/practicas/curva-en-vivo/",
  cuaderno: "/academy/mi-aprendizaje/cuaderno/",
  comparar: "/academy/articulos/intercambios-y-liquidez/#ejemplo-de-curva",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const pages = walk(AC).filter((f) => f.endsWith(".html"));

type Rule = { from: string; to: string; status: number };
function rules(): Rule[] {
  return readFileSync(path.join(WEB, "_redirects"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/))
    .map(([from = "", to = "", status]) => ({ from, to, status: Number(status || 302) }));
}
// Igual que Cloudflare Pages: la primera regla que encaja gana; :lang y * se sustituyen.
function resolve(url: string, list = rules()): { to: string; status: number } | null {
  for (const r of list) {
    const names: string[] = [];
    const rx = new RegExp(
      "^" +
        r.from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/:(\w+)/g, (_m, n) => (names.push(n), "([^/]+)")).replace(/\*/g, () => (names.push("splat"), "(.*)")) +
        "$",
    );
    const m = url.match(rx);
    if (!m) continue;
    let to = r.to;
    names.forEach((n, i) => (to = to.replace(n === "splat" ? ":splat" : `:${n}`, m[i + 1] ?? "")));
    return { to, status: r.status };
  }
  return null;
}
function fileFor(url: string): string {
  const clean = url.replace(/[#?].*$/, "");
  return path.join(WEB, clean.endsWith("/") ? clean + "index.html" : clean);
}

describe("ORVUPI Academy", () => {
  test("es una herramienta propia: cabecera, marca, favicon, manifest y assets versionados", () => {
    assert.ok(pages.length >= 100, `${pages.length} páginas`);
    const manifest = JSON.parse(readFileSync(path.join(AC, "manifest.webmanifest"), "utf8"));
    assert.equal(manifest.name, "ORVUPI Academy");
    assert.equal(manifest.start_url, "/academy/");
    for (const icon of manifest.icons) assert.ok(existsSync(path.join(WEB, icon.src)), icon.src);
    for (const f of pages) {
      const html = readFileSync(f, "utf8");
      const rel = path.relative(WEB, f);
      assert.match(html, /<header class="site ac-nav">/, rel);
      assert.match(html, /ORVUPI<small>ACADEMY<\/small>/, rel);
      assert.match(html, /<link rel="manifest" href="\/academy\/manifest\.webmanifest">/, rel);
      assert.match(html, /<link rel="icon" href="\/assets\/academy\/academy\.svg"/, rel);
      assert.match(html, /\/assets\/academy\/academy\.css\?v=[0-9a-f]+"/, rel);
      assert.match(html, /\/assets\/academy\/academy\.js\?v=[0-9a-f]+"/, rel);
      // CSP estricta: nada en línea.
      assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")), false, `script en línea ${rel}`);
      assert.equal(/\sstyle="/.test(html), false, `style en línea ${rel}`);
      assert.equal(/\son[a-z]+="/.test(html), false, `manejador en línea ${rel}`);
    }
  });

  test("tiene su entrada en el menú de herramientas, en el mapa y en la portada", () => {
    for (const rel of ["index.html", "token/index.html", "risks/index.html", "verify/index.html", "en/index.html", "ja/legal/index.html"]) {
      const html = readFileSync(path.join(WEB, rel), "utf8");
      const nav = html.match(/<nav class="site(?: [^"]*)?"[\s\S]*?<\/nav>/)?.[0] ?? html.match(/<header class="site(?: [^"]*)?"[\s\S]*?<\/header>/)?.[0] ?? "";
      assert.match(nav, /href="\/academy\/"/, rel);
      for (const old of Object.keys(OLD)) assert.equal(new RegExp(`href="(/[a-z-]+)?/${old}/`).test(html), false, `${rel} ${old}`);
    }
    const store = readFileSync(path.join(WEB, "studio/lib/mas-store.mjs"), "utf8");
    assert.match(store, /id: "academy", href: "\/academy\/"/);
  });

  test("las rutas antiguas redirigen con 301 a su sitio dentro de /academy/, sin cadenas", () => {
    const list = rules();
    for (const [old, target] of Object.entries(OLD)) {
      for (const lang of LANGS) {
        for (const suffix of ["", "/", "/index.html"]) {
          const url = `${lang}/${old}${suffix}`;
          const hit = resolve(url, list);
          assert.ok(hit, `${url} sin regla`);
          assert.equal(hit.status, 301, url);
          assert.equal(hit.to, target, url);
          assert.ok(existsSync(fileFor(hit.to)), `${hit.to} no existe`);
          // El destino no vuelve a redirigir.
          assert.equal(resolve(hit.to.replace(/#.*$/, ""), list), null, `cadena en ${hit.to}`);
        }
      }
    }
    assert.deepEqual(resolve("/academy", list), { to: "/academy/", status: 301 });
    // El service worker antiguo de Lab sigue accesible para poder retirarse solo.
    assert.equal(resolve("/lab/sw.js", list), null);
    // Los fragmentos de /aprender/ (#direccion, #guia-*) siguen funcionando en el glosario.
    const glosario = readFileSync(path.join(AC, "glosario/index.html"), "utf8");
    for (const id of ["direccion", "autoridad-emision", "curva-pump", "holder"]) assert.match(glosario, new RegExp(`id="${id}"`), id);
    const legacy = JSON.parse((glosario.match(/data-legacy="([^"]+)"/)?.[1] ?? "{}").replace(/&quot;/g, '"'));
    for (const id of ["guia-identificar", "guia-permisos", "guia-liquidez"]) assert.ok(existsSync(fileFor(String(legacy[id]))), id);
  });

  test("las cabeceras de seguridad de las herramientas viajan con ellas", () => {
    const headers = readFileSync(path.join(WEB, "_headers"), "utf8");
    for (const p of ["/academy/practicas/curva-en-vivo/", "/academy/mi-aprendizaje/cuaderno/"]) {
      const block = headers.slice(headers.indexOf(`\n${p}\n`)).split("\n\n")[0] ?? "";
      assert.ok(headers.includes(`\n${p}\n`), p);
      assert.match(block, /! Content-Security-Policy\n\s+Content-Security-Policy: /, p);
    }
    assert.match(headers, /\/academy\/manifest\.webmanifest\n\s+Content-Type: application\/manifest\+json/);
  });

  test("el sitemap lista Academy y no las rutas retiradas", () => {
    const xml = readFileSync(path.join(WEB, "sitemap.xml"), "utf8");
    assert.match(xml, /<loc>https:\/\/orvupi\.com\/academy\/<\/loc>/);
    for (const old of Object.keys(OLD)) assert.equal(new RegExp(`<loc>https://orvupi\\.com(/[a-z-]+)?/${old}/</loc>`).test(xml), false, old);
    for (const f of pages) {
      const url = "/" + path.relative(WEB, f).replace(/index\.html$/, "");
      assert.ok(xml.includes(`<loc>https://orvupi.com${url}</loc>`), url);
    }
  });

  test("contenido: solo el contrato permitido, sin avisos de riesgo fuera de /risks y sin cifras inventadas", () => {
    const base58 = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    // Aparte del contrato de ORVUPI, solo salen direcciones de las fichas fechadas del Lab (lab/mission/*.json):
    // USDC, USDT, sus permisos y copias con el mismo nombre, usadas como ejemplos de lectura. Y programas del sistema.
    const missionDir = path.join(repoRoot(), "lab/mission");
    const fuentes = readdirSync(missionDir).filter((n) => n.endsWith(".json")).flatMap((n) => readFileSync(path.join(missionDir, n), "utf8").match(base58) ?? []);
    const allowedMints = new Set([...fuentes, CA, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "11111111111111111111111111111111"]);
    for (const f of pages) {
      const html = readFileSync(f, "utf8");
      const rel = path.relative(WEB, f);
      const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");
      for (const m of text.match(base58) ?? []) if (/\d/.test(m) && /[a-z]/.test(m) && /[A-Z]/.test(m)) assert.ok(allowedMints.has(m), `${rel} ${m}`);
      assert.equal(html.includes("Cripto de alto riesgo"), false, rel);
      assert.equal(html.includes("Puedes perderlo todo"), false, rel);
      // La nota de alcance del Lab («No es una auditoría…») se conserva; los avisos de pérdida o riesgo viven solo en /risks.
      // Se mira el texto de los bloques de aviso, no el contenido didáctico.
      const avisos = (html.match(/<(div|aside|section|p)\b[^>]*class="[^"]*(aviso|risk|riesgo|warn)[^"]*"[^>]*>[\s\S]*?<\/\1>/g) ?? []).join(" ");
      assert.equal(/perder|p[eé]rdida|riesgo|volatil/i.test(avisos.replace(/<[^>]+>/g, " ")), false, `${rel}: aviso de riesgo fuera de /risks`);
      // Los huecos de cuenta y recompensas de Binance Academy son destinos educativos: ningún botón o enlace pide cuenta.
      const controls = (html.match(/<(a|button)\b[^>]*>[\s\S]*?<\/\1>/g) ?? []).join(" ").replace(/<[^>]+>/g, " ");
      assert.equal(/iniciar sesi[oó]n|reg[ií]strate|crear (una )?cuenta|abrir (una )?cuenta|recompensa|log ?in|sign ?up/i.test(controls), false, `${rel}: sin cuentas ni recompensas`);
      assert.equal(/type="password"/.test(html), false, rel);
    }
  });

  test("el progreso se fusiona sin borrar nada", async () => {
    const src = readFileSync(path.join(WEB, "assets/academy/academy.js"), "utf8");
    assert.equal(/localStorage\.(clear|removeItem)|deleteDatabase|\.clear\(\)|\.delete\(/.test(src), false);
    assert.match(src, /req\.onupgradeneeded = function \(e\) \{ e\.target\.transaction\.abort\(\); \}/);
    assert.match(src, /"readonly"/);
  });
  test("el texto visible no usa las palabras vetadas «holder» ni «reserva»", () => {
    for (const f of pages) {
      const html = readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<link[^>]*>|<meta property="og:url"[^>]*>/g, "");
      const visible = html.replace(/<[^>]+>/g, " ") + " " + [...html.matchAll(/(?:alt|title|placeholder|aria-label|content)="([^"]*)"/g)].map((m) => m[1]).join(" ");
      assert.equal(/holder|reserva/i.test(visible), false, path.relative(WEB, f));
    }
  });

  test("rutas: cada ruta tiene su página, sus módulos y artículos, y ningún enlace interno roto", () => {
    const datos = JSON.parse(readFileSync(path.join(AC, "datos.json"), "utf8"));
    const preguntas = JSON.parse(readFileSync(path.join(repoRoot(), "academy/content/preguntas.json"), "utf8"));
    assert.ok(datos.rutas.length >= 6, `${datos.rutas.length} rutas`);
    const unidades = new Set<string>();
    for (const r of datos.rutas) {
      assert.match(r.u, /^\/academy\/rutas\/[a-z0-9-]+\/$/, r.slug);
      const html = readFileSync(fileFor(r.u), "utf8");
      assert.ok(r.unidades.length > 0, r.slug);
      for (const id of r.unidades) {
        assert.equal(unidades.has(id), false, `${id} en dos rutas`);
        unidades.add(id);
        const art = datos.unidades.find((a: { id: string }) => a.id === id);
        if (art?.u) assert.ok(html.includes(`href="${art.u}"`), `${r.slug} enlaza ${id}`);
        assert.ok(preguntas.unidades[id], `pregunta de ${id}`);
        assert.equal(preguntas.unidades[id].opciones.filter((o: { correcta: boolean }) => o.correcta).length, 1, id);
      }
    }
    for (const [n, qs] of Object.entries(preguntas.modulos) as [string, unknown[]][]) assert.equal(qs.length, 6, `módulo ${n}`);
    for (const f of pages) {
      const html = readFileSync(f, "utf8");
      for (const [, href = ""] of html.matchAll(/href="(\/academy\/[^"#?]*)/g)) {
        const target = fileFor(href.endsWith("/") || /\.[a-z]+$/.test(href) ? href : href + "/");
        assert.ok(existsSync(target), `${path.relative(WEB, f)} → ${href}`);
      }
      assert.equal(/\[\[|\]\]/.test(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "")), false, `markdown sin convertir en ${path.relative(WEB, f)}`);
    }
  });

  test("redes: cada red tiene su página con sus artículos, la lista filtra por red y la ruta Blockchains y redes existe", () => {
    const datos = JSON.parse(readFileSync(path.join(AC, "datos.json"), "utf8"));
    const ids = datos.redes.map((r: { id: string }) => r.id);
    for (const id of ["bitcoin", "ethereum", "capas-2", "bnb-chain", "solana", "avalanche", "polygon", "cardano", "ton", "tron"]) assert.ok(ids.includes(id), id);
    const indice = readFileSync(path.join(AC, "redes/index.html"), "utf8");
    const lista = readFileSync(path.join(AC, "articulos/index.html"), "utf8");
    for (const r of datos.redes) {
      assert.ok(r.unidades.length > 0, `${r.id} sin artículos`);
      assert.ok(indice.includes(`href="${r.u}"`), `índice enlaza ${r.id}`);
      assert.ok(lista.includes(`<option value="${r.id}">`), `filtro ${r.id}`);
      const html = readFileSync(fileFor(r.u), "utf8");
      for (const id of r.unidades) {
        const art = datos.unidades.find((a: { id: string }) => a.id === id);
        assert.ok(html.includes(`href="${art.u}"`), `${r.id} enlaza ${id}`);
        assert.ok(lista.includes(`data-unit="${id}"`) && new RegExp(`data-unit="${id}"[^>]*data-redes="[^"]*\\b${r.id}\\b`).test(lista), `${id} etiquetado ${r.id}`);
      }
    }
    assert.ok(datos.rutas.some((r: { slug: string }) => r.slug === "blockchains-y-redes"));
    // Lo genérico ya no es solo de Solana: los artículos de tokens, comisiones y exploradores citan varias redes.
    for (const slug of ["monedas-tokens-y-stablecoins", "como-leer-un-explorador", "permisos-de-contratos", "intercambios-y-liquidez"]) {
      const u = datos.unidades.find((a: { u: string }) => a.u.includes(`/${slug}`));
      assert.ok(u, slug);
      const html = readFileSync(fileFor(u.u), "utf8");
      assert.ok(/Ethereum/.test(html) && /BNB/.test(html) && /Solana/.test(html), slug);
    }
  });
});
