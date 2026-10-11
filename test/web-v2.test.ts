import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const CA = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const CLONE = "Hhq4ffySVX3UQqSowjhP1Lwa8YuJDf7iH2hYWvVHTuEf";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MICA_ES =
  "Esta comunicación publicitaria de criptoactivos no ha sido revisada ni aprobada por ninguna autoridad competente de ningún Estado miembro de la Unión Europea. El oferente del criptoactivo es el único responsable del contenido de esta comunicación publicitaria de criptoactivos.";
const MICA_EN =
  "This crypto-asset marketing communication has not been reviewed or approved by any competent authority in any Member State of the European Union. The offeror of the crypto-asset is solely responsible for the content of this crypto-asset marketing communication.";

function headerPathMatches(pattern: string, urlPath: string): boolean {
  if (pattern === "/*") return urlPath.startsWith("/");
  if (pattern.endsWith("/*")) return urlPath.startsWith(pattern.slice(0, -1));
  return urlPath === pattern;
}

const ROUTES = [
  "index.html",
  "verify/index.html",
  "comparar/index.html",
  "lab/index.html",
  "tablero/index.html",
  "avances/index.html",
  "methodology/index.html",
  "security/index.html",
  "risks/index.html",
  "legal/index.html",
  "proofs/index.html",
  "status/index.html",
  "tokenomics/index.html",
  "community/index.html",
  "marca/index.html",
  "build/index.html",
  "aprender/index.html",
  "studio/index.html",
  "studio/reglas/index.html",
  "pares/index.html",
  "cuaderno/index.html",
  "contribuir/index.html",
  "404.html",
];

type View = {
  kind: string;
  light: string;
  mint: string | null;
  title: { es: string; en: string };
  support: { es: string; en: string };
  partialNote: { es: string; en: string } | null;
  compare: { official: string; marks: { char: string; changed: boolean }[] } | null;
  rows: { label: { es: string; en: string }; value: { es: string; en: string } }[];
};

type Lookup = {
  classifyAddress: (raw: string, cards: readonly object[], source?: string, evm?: readonly object[]) => View;
  reserveWhenLiveFails: (view: View) => View;
  emptyView: () => View;
  pendingView: (raw: string) => View;
  isAddress: (value: string) => boolean;
  normalizeAddress: (raw: string) => string;
};

function redirectMap(root: string): Map<string, string> {
  const text = readFileSync(path.join(root, "_redirects"), "utf8");
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    const from = parts[0] ?? "";
    const to = (parts[1] ?? "").split("#")[0] ?? "";
    if (from.startsWith("/") && to) map.set(from.replace(/\/+$/, "") || "/", to);
  }
  return map;
}

function localTargetExists(root: string, fromFile: string, url: string): boolean {
  const clean = (url.split("#")[0] ?? "").replace(/\/+$/, "") || "/";
  const candidate = clean.startsWith("/")
    ? path.join(root, clean === "/" ? "index.html" : clean.slice(1))
    : path.resolve(path.dirname(fromFile), clean);
  const asFile = candidate.endsWith(".html") || path.extname(candidate) !== "" ? candidate : path.join(candidate, "index.html");
  if (statSync(asFile, { throwIfNoEntry: false })?.isFile()) return true;
  if (statSync(`${candidate}.html`, { throwIfNoEntry: false })?.isFile()) return true;
  if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) return true;
  const rel = clean.startsWith("/") ? clean : `/${path.relative(root, candidate).split(path.sep).join("/")}`;
  const dest = redirectMap(root).get(rel.replace(/\/+$/, "") || "/");
  if (!dest) return false;
  if (dest.startsWith("http://") || dest.startsWith("https://")) return true;
  const destPath = path.join(root, dest.replace(/^\//, ""));
  return (
    statSync(destPath, { throwIfNoEntry: false })?.isFile() === true ||
    statSync(path.join(destPath, "index.html"), { throwIfNoEntry: false })?.isFile() === true
  );
}

function siteRoot(): string {
  return path.join(repoRoot(), "web", "v2");
}

function hiddenNames(): string[] {
  return [
    ["Cri", "stian"],
    ["Par", "do"],
    ["Cama", "cho"],
  ].map((parts) => parts.join("").toLowerCase());
}

function mentionsHiddenName(text: string): boolean {
  const folded = text.toLowerCase();
  return hiddenNames().some((name) => folded.includes(name));
}

function read(rel: string): string {
  return readFileSync(path.join(siteRoot(), rel), "utf8");
}

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

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

function literalHttpsHosts(source: string): string[] {
  const hosts: string[] = [];
  for (const match of source.matchAll(/["'](https:\/\/[^"'\\]+)["']/g)) {
    const raw = match[1];
    if (!raw) continue;
    hosts.push(new URL(raw).host);
  }
  return hosts;
}

function contrast(a: string, b: string): number {
  const lin = (hex: string) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
  };
  const hi = Math.max(lin(a), lin(b));
  const lo = Math.min(lin(a), lin(b));
  return (hi + 0.05) / (lo + 0.05);
}

describe("web v2", () => {
  test("every mapped route exists and shares the shell", () => {
    for (const rel of ROUTES) {
      const html = read(rel);
      assert.match(html, /<html lang="es"/);
      assert.match(html, /name="viewport"/);
      assert.match(html, /class="skip lang es"/);
      assert.match(html, /class="skip lang en"/);
      assert.match(html, /<title/);
      assert.match(html, /<main id="contenido"/);
      assert.match(html, /Content-Security-Policy/);
      assert.match(html, /assets\/site\.css/);
      assert.match(html, /assets\/shell\.js/);
      assert.match(html, /data-set-lang="es"/);
      assert.match(html, /data-set-lang="en"/);
    }
  });

  test("token.json matches the production copy byte for byte", () => {
    const root = repoRoot();
    const live = readFileSync(path.join(root, "web/v2/token.json"));
    const current = readFileSync(path.join(root, "web/current/token.json"));
    assert.deepEqual(live, current);
  });

  test("pages do not load a CDN or a remote stylesheet, and the worker stays under lab", () => {
    const root = siteRoot();
    for (const file of walk(root)) {
      const rel = path.relative(root, file);
      if (path.basename(file) === "sw.js") {
        assert.equal(rel, path.join("lab", "sw.js"));
      }
      const text = readFileSync(file, "utf8");
      if (/serviceWorker\.register/.test(text)) {
        assert.equal(rel, path.join("assets", "shell.js"));
      }
      if (!file.endsWith(".html") && !file.endsWith(".css") && !file.endsWith(".js")) continue;
      assert.equal(/url\(\s*['"]?https?:/i.test(text), false, rel);
    }
    const worker = read("lab/sw.js");
    assert.match(worker, /\/lab\//);
    assert.match(worker, /path === "\/"/);
    assert.match(worker, /aviso|notice/);
    const shell = read("assets/shell.js");
    assert.match(shell, /register\("\/lab\/sw\.js", \{ scope: "\/lab\/" \}\)/);
    assert.match(shell, /onLab && "serviceWorker" in navigator/);
    assert.match(read("lab/index.html"), /worker-src 'self'/);
    assert.equal(read("lab/index.html").includes("frame-ancestors"), false);
    assert.equal(read("verify/index.html").includes("frame-ancestors"), false);
    assert.match(read("_headers"), /frame-ancestors 'none'/);
    assert.match(read("assets/site.css"), /max-width:\s*599px/);
    assert.match(read("assets/site.css"), /header\.site \{\s*position:\s*static;/);
    assert.match(read("assets/site.css"), /footer\.site a[\s\S]*min-height:\s*44px/);
    assert.match(read("verify/index.html"), /id="direccion-error"/);
    assert.match(read("lab/index.html"), /Para quien quiera más detalle/);
    assert.match(read("assets/mission.js"), /Siguiente paso/);
    assert.match(read("assets/mission.js"), /Empezar de nuevo/);
    assert.match(read("index.html"), /worker-src 'none'/);
    assert.match(read("verify/index.html"), /worker-src 'none'/);
    for (const file of htmlFiles(root)) {
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
        const url = match[1] ?? "";
        if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:")) continue;
        assert.equal(url.startsWith("//"), false, url);
      }
      const linked = [...html.matchAll(/<(?:script|img)\b[^>]*(?:src|href)="(https?:\/\/[^"]+)"/g)];
      const styles = [...html.matchAll(/<link\b(?![^>]*rel="canonical")[^>]*href="(https?:\/\/[^"]+)"/g)];
      assert.deepEqual(linked, [], path.relative(root, file));
      assert.deepEqual(styles, [], path.relative(root, file));
    }
  });

  test("local links, labels, alt text, and both languages stay paired", () => {
    const root = siteRoot();
    for (const file of htmlFiles(root)) {
      const html = readFileSync(file, "utf8");
      const es = html.match(/class="[^"]*\blang es\b[^"]*"/g)?.length ?? 0;
      const en = html.match(/class="[^"]*\blang en\b[^"]*"/g)?.length ?? 0;
      for (const img of html.matchAll(/<img\b[^>]*>/g)) {
        assert.match(img[0], /\balt="/);
      }
      for (const input of html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)) {
        const id = input[1] ?? "";
        assert.match(html, new RegExp(`<label[^>]*\\bfor="${id}"`));
      }
      if (path.basename(file) === "archivo.html") {
        assert.equal((html.match(/N\.º \d+ del inventario/g) ?? []).length, 18);
      } else {
        assert.equal(es, en, path.relative(root, file));
        assert.ok(es > 0);
      }
      for (const match of html.matchAll(/\b(?:href|src|srcset)="([^"]+)"/g)) {
        const raw = match[1] ?? "";
        for (const part of raw.split(",")) {
          const url = part.trim().split(/\s+/)[0] ?? "";
          if (!url || url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("https://") || url.startsWith("http://")) {
            continue;
          }
          assert.equal(localTargetExists(root, file, url), true, `${url} from ${path.relative(root, file)}`);
        }
      }
    }
  });

  test("the official contract, channels, and notices are present in both languages", () => {
    const home = read("index.html");
    const security = read("security/index.html");
    const risks = read("risks/index.html");
    const legal = read("legal/index.html");
    for (const html of [home, security, risks, legal]) {
      assert.ok(html.includes(CA));
      assert.ok(html.includes(MICA_ES));
      assert.ok(html.includes(MICA_EN));
    }
    for (const html of [home, security]) {
      assert.match(html, /x\.com\/stubxai/);
      assert.match(html, /stubxai\.hq@gmail\.com/);
      assert.match(html, /github\.com\/stubxai\/stubx-agent/);
      assert.match(html, /t\.me\/stubxai/);
    }
    assert.match(home, /href="\/verify\/"/);
    assert.match(home, /Analizar token/);
    assert.match(home, /Analyze token/);
    assert.match(home, /No stub, no story/);
    assert.match(home, /Contrasta la dirección antes de creer el nombre\./);
    assert.match(home, /Check the address before you believe the name\./);
    assert.equal(home.includes("before you trust"), false);
    assert.match(home, /Consulta cualquier token de Solana, entiende sus permisos y guarda y compara lecturas\./);
    assert.match(home, /Look up any Solana token, understand its permissions, and save and compare readings\./);
    assert.match(home, /<a class="primary" href="\/verify\/"><strong>Verify<\/strong>/);
    assert.match(home, /<a class="primary" href="\/lab\/"><strong>Lab<\/strong>/);
    assert.match(home, /<a class="primary" href="\/cuaderno\/"><strong>/);
    assert.match(home, /Guardar y comparar/);
    assert.match(home, /Save and compare/);
    assert.match(home, /Studio, para crear una imagen/);
    assert.match(home, /Studio, to create an image/);
    assert.equal(home.includes("cta-gem"), false);
    assert.match(home, /class="resumen-informe"/);
    assert.match(home, /Nadie puede crear más tokens ni congelar cuentas\./);
    assert.match(home, /Nobody can create more tokens or freeze accounts\./);
    assert.match(home, /Agente Talón te guía/);
    assert.match(home, /No es un sello de aprobación/);
    assert.match(home, /<article class="card"><p class="estado-pill">[\s\S]*?<h3>Studio<\/h3>/);
    assert.equal(/<article class="slot">[\s\S]*?<h3>Studio<\/h3>/.test(home), false);
    assert.match(home, /Crea una imagen para tu token, sin cuenta\. Los recursos de STUBX vienen por defecto/);
    assert.match(home, /Create an image for your token, without an account\. STUBX assets start as the default/);
    assert.match(home, /<a href="\/studio\/"><span class="lang es" lang="es">Abrir Studio<\/span><span class="lang en" lang="en">Open Studio<\/span><\/a>/);
    assert.match(security, /Comunidad STUBX/);
    assert.match(security, /COMUNIDAD/);
    assert.match(risks, /puedes perder todo lo que aportes/);
    assert.match(risks, /you could lose everything you put in/i);
  });

  test("el inglés de la portada no avala y el ejemplo nombra la ficha guardada", () => {
    const home = read("index.html");
    const hero = home.match(/<div class="hero-actions">[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.match(hero, /<a class="primary" href="\/lab\/"><strong>Lab<\/strong>/);
    assert.match(hero, /href="\/methodology\/"/);
    assert.match(hero, /Ver la metodología/);
    assert.match(hero, /Read the methodology/);
    assert.match(home, /<div class="resumen-informe">[\s\S]*<h3>[\s\S]*Resumen de ejemplo · ficha guardada del 2026-10-09/);
    assert.match(home, /<div class="resumen-informe">[\s\S]*<h3>[\s\S]*Sample summary · saved snapshot from 2026-10-09/);
    assert.match(home, /data-bloque="falta"[\s\S]*Este recuadro es un extracto\. No trae la lectura completa\./);
    assert.match(home, /data-bloque="falta"[\s\S]*This box is an excerpt\. It does not include the full reading\./);
    const english = [...home.matchAll(/lang="en">([^<]*)</g)].map((match) => match[1] ?? "").join("\n");
    const stripped = english
      .replaceAll(MICA_EN, "")
      .replaceAll("It is not advice or a recommendation, and it has not been approved by the CNMV or any other authority.", "");
    const banned = /\b(trust(?:ed|ing|s|worthy)?|safe(?:r|st|ly|ty)?|verified|verification|secure[d]?|legitimate|authentic(?:ated)?|guarantees?)\b/i;
    assert.equal(banned.test(stripped), false, stripped.match(banned)?.[0]);
  });

  test("the curve example is fixed and no route reads an address", () => {
    const html = read("comparar/index.html");
    const home = read("index.html");
    assert.match(home, /Ver el ejemplo/);
    assert.match(home, /See the example/);
    assert.match(html, /Ejemplo hipotético, no leído de la cadena/);
    assert.match(html, /Hypothetical example, not read from the chain/);
    assert.match(html, /Ejemplo educativo\. No es una comparación de calidad, ni una recomendación, ni un aval\. STUBX no tiene relación con ningún token de este ejemplo\./);
    assert.match(html, /Educational example\. It is not a quality comparison, a recommendation, or an endorsement\. STUBX has no relationship with any token in this example\./);
    assert.equal(/<form\b/.test(html), false);
    assert.equal(/<input\b/.test(html), false);
    assert.equal(html.includes("assets/comparar.mjs"), false);
    assert.equal(html.includes("chain-read.mjs"), false);
    assert.equal(html.includes("getMultipleAccounts"), false);
    const meta = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
    assert.deepEqual(cspHosts(meta), []);
    assert.equal(meta.includes("frame-ancestors"), false);
    const headers = read("_headers");
    assert.equal(headers.includes("/comparar/"), false);
    const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    assert.equal(locs.some((loc) => loc === "https://stubxai.com/comparar/"), false);
    const root = path.join(repoRoot(), "web/v2");
    for (const file of walkFiles(root)) {
      if (!file.endsWith(".html")) continue;
      const page = readFileSync(file, "utf8");
      assert.equal(/<script[^>]+chain-read\.mjs/.test(page), false, file);
      assert.equal(page.includes("assets/comparar.mjs"), false, file);
    }
  });

  test("the pair report is read-only and has one route policy", () => {
    const html = read("pares/index.html");
    const home = read("index.html");
    assert.match(home, /Abrir la curva/);
    assert.match(home, /Open the curve/);
    assert.match(html, /Lectura de la curva/);
    assert.match(html, /Curve reading/);
    assert.match(html, /Lectura de datos públicos\. No es una comparación de calidad, ni una recomendación, ni un aval\. STUBX no tiene relación con estos tokens salvo la CA oficial\./);
    assert.match(html, /No se inventa ningún dato\./);
    assert.equal(html.includes("Conector"), false);
    assert.equal(html.includes("favorable"), false);
    assert.equal(/\bRuta:/.test(html), false);
    assert.match(html, /No es una auditoría ni una recomendación\./);
    assert.match(html, /Un emparejamiento no es una colaboración ni un respaldo\./);
    assert.match(html, /A pairing is not a collaboration or an endorsement\./);
    assert.match(html, /id="consulta"/);
    assert.match(html, /id="direccion-token"/);
    assert.match(html, /id="resultado"/);
    assert.match(html, /id="exportar"/);
    assert.match(html, /type="module"/);
    assert.match(html, /assets\/pares\.mjs/);
    assert.match(html, /solana-rpc\.publicnode\.com/);
    assert.match(html, /api\.mainnet-beta\.solana\.com/);
    const meta = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
    assert.deepEqual(cspHosts(meta), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    assert.equal(meta.includes("frame-ancestors"), false);
    const headers = read("_headers");
    const block = headers.split("/pares/*")[1]?.split("\n\n")[0] ?? "";
    assert.match(block, /! Content-Security-Policy/);
    assert.equal((block.match(/Content-Security-Policy:/g) ?? []).length, 1);
    assert.deepEqual(cspHosts(block), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const bundle = read("assets/pares.mjs");
    assert.equal(bundle.includes("sendTransaction"), false);
    assert.equal(bundle.includes("localStorage"), false);
    assert.equal(bundle.includes("innerHTML"), false);
    assert.match(read("sitemap.xml"), /https:\/\/stubxai\.com\/pares\//);
  });

  test("contributions link to GitHub and collect nothing", () => {
    const html = read("contribuir/index.html");
    const home = read("index.html");
    assert.match(home, /Abrir contribuciones/);
    assert.match(home, /Open contributions/);
    const articles = [...home.matchAll(/<article class="(card|slot)">([\s\S]*?)<\/article>/g)];
    const contrib = articles.find((item) => item[2]?.includes("Contribuir"));
    assert.equal(contrib?.[1], "card");
    assert.match(html, /<h1>[\s\S]*Contribuir/);
    assert.match(html, /Contribute/);
    assert.match(html, /No es una auditoría ni una recomendación/);
    assert.match(html, /This is not an audit or a recommendation/);
    assert.match(html, /Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión\./);
    assert.match(html, /High-risk crypto · You could lose everything · Not investment advice\./);
    assert.match(html, /https:\/\/github\.com\/stubxai\/stubx-agent\/issues\/new\?template=informe-fallo\.yml/);
    assert.match(html, /https:\/\/github\.com\/stubxai\/stubx-agent\/issues\/new\?template=mejora\.yml/);
    assert.match(html, /https:\/\/github\.com\/stubxai\/stubx-agent\/compare/);
    assert.match(html, /href="\/contribuir\/plantilla\.md"/);
    assert.match(html, /mailto:stubxai\.hq@gmail\.com/);
    assert.match(html, /security\/policy/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /data-set-lang="en"/);
    assert.equal(/<form\b/.test(html), false);
    assert.equal(/<input\b/.test(html), false);
    assert.equal(/<textarea\b/.test(html), false);
    assert.equal(/type="email"/.test(html), false);
    assert.equal(/type="file"/.test(html), false);
    const meta = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
    assert.deepEqual(cspHosts(meta), []);
    assert.match(meta, /connect-src 'self'/);
    assert.equal(meta.includes("frame-ancestors"), false);
    assert.equal(read("_headers").includes("/contribuir/"), false);
    assert.match(read("sitemap.xml"), /https:\/\/stubxai\.com\/contribuir\//);
    const plantilla = read("contribuir/plantilla.md");
    assert.match(plantilla, /La web no recibe este archivo/);
    assert.match(plantilla, /This website does not receive this file/);
    assert.equal(/@/.test(plantilla), false);
  });

  test("verify reads any mint live and keeps the dated cards", () => {
    const html = read("verify/index.html");
    assert.match(html, /id="consulta"/);
    assert.match(html, /id="direccion-token"/);
    assert.match(html, /id="resultado"/);
    assert.match(html, /id="ver-lectura-caida"/);
    assert.match(html, /2026-10-09/);
    assert.match(html, /USD Coin/);
    assert.match(html, /No es una auditoría, ni una recomendación, ni un aval/);
    assert.match(html, /Solo si pulsas «Guardar esta consulta»/);
    assert.equal(html.includes("Esta página no consulta la red"), false);
    assert.equal(html.includes("\uFFFD"), false);
    assert.match(html, /assets\/verify\.js/);
    const meta = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
    assert.deepEqual(cspHosts(meta), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const home = read("index.html");
    const homeMeta = home.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
    assert.deepEqual(cspHosts(homeMeta), []);
    const headers = read("_headers");
    assert.match(headers, /\/verify\/\*/);
    assert.match(headers, /! Content-Security-Policy/);
    const bundle = read("assets/verify.js");
    assert.match(bundle, /stubx-verify-preview/);
    assert.match(bundle, /ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump/);
    assert.match(bundle, /FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump/);
    assert.match(bundle, /0xC99056C762F0802e4154E6322bd71ae928857777/);
    assert.match(bundle, /function readAnyMint/);
    const bundleHosts = literalHttpsHosts(bundle);
    assert.equal(bundleHosts.some((host) => host === "api.mainnet-beta.solana.com"), true);
    assert.equal(bundleHosts.some((host) => host === "solana-rpc.publicnode.com"), true);
    assert.equal(/fetch\(/.test(bundle), true);
    assert.equal(bundle.includes("localStorage"), false);
    assert.equal(bundle.includes("sessionStorage"), false);
    assert.equal(/gtag|google-analytics|googletagmanager|plausible|posthog/i.test(bundle), false);
    assert.equal(bundle.includes("\uFFFD"), false);
    const snap = JSON.parse(read("modules/snapshot.json")) as {
      pr: number;
      branch: string;
      commit: string;
      inBranch: boolean;
      liveNetwork: boolean;
      cardsDate: string;
      note: string;
    };
    assert.equal(snap.pr, 21);
    assert.equal(snap.branch, "feat/verify-universal");
    assert.equal(JSON.stringify(snap).includes("feat/lab-mision-1"), false);
    assert.equal(JSON.stringify(snap).includes('"pr":14'), false);
    const cited = spawnSync("git", ["rev-parse", `${snap.commit}:lab/verify/lookup.ts`], { cwd: repoRoot(), encoding: "utf8" });
    const headLookup = spawnSync("git", ["rev-parse", "HEAD:lab/verify/lookup.ts"], { cwd: repoRoot(), encoding: "utf8" });
    assert.equal(cited.status, 0, cited.stderr);
    assert.equal(headLookup.status, 0, headLookup.stderr);
    assert.equal(cited.stdout.trim(), headLookup.stdout.trim());
    assert.equal(snap.inBranch, true);
    assert.equal(Object.hasOwn(snap, "merged"), false);
    assert.equal(snap.liveNetwork, true);
    assert.equal(snap.cardsDate, "2026-10-09");
  });

  test("lookup classifies the 2026-10-09 cards, the older clones, and 0x addresses", async () => {
    const href = pathToFileURL(path.join(siteRoot(), "modules/verify/lookup.mjs")).href;
    const lookup = (await import(href)) as Lookup;
    const data = JSON.parse(read("modules/verify/cards.json")) as { cards: object[]; evm: object[] };
    assert.equal(data.cards.length, 7);
    assert.equal(data.evm.length, 2);
    assert.equal(lookup.emptyView().kind, "vacio");
    assert.equal(lookup.pendingView(CA).kind, "comprobando");
    assert.equal(lookup.classifyAddress("", data.cards, "lista", data.evm).kind, "vacio");
    assert.equal(lookup.classifyAddress("no es una direccion", data.cards, "lista", data.evm).kind, "invalida");
    const official = lookup.classifyAddress(`  ${CA.slice(0, 8)} ${CA.slice(8)}  `, data.cards, "lista", data.evm);
    assert.equal(official.kind, "oficial");
    assert.equal(official.light, "ok");
    const liveDown = lookup.reserveWhenLiveFails(official);
    assert.equal(liveDown.light, "neutro");
    assert.equal(liveDown.title.es, "No se pudo comprobar en directo");
    assert.equal(liveDown.title.en, "Could not check live");
    assert.match(liveDown.partialNote?.es ?? "", /Es la ficha del 2026-10-09/);
    assert.equal(liveDown.title.es.includes("Parece el STUBX oficial"), false);
    assert.equal(official.mint, CA);
    assert.match(official.partialNote?.es ?? "", /cuenta personal publicada/);
    assert.match(official.partialNote?.es ?? "", /censo/);
    const officialCard = data.cards.find((card) => (card as { mint?: string }).mint === CA) as { id?: string; holdersNote?: string };
    assert.equal(officialCard.id, "a9e7f8d9d16fa3113f669afbcb4966123279efed3efa0769a864be484f43d9eb");
    assert.match(officialCard.holdersNote ?? "", /2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX|cuenta personal publicada/);
    assert.match(officialCard.holdersNote ?? "", /0\.0000 %/);
    const clone = lookup.classifyAddress(CLONE, data.cards, "lista", data.evm);
    assert.equal(clone.kind, "copia");
    assert.equal(clone.light, "atencion");
    assert.equal(clone.title.es, "Se parece a STUBX, pero no es la CA oficial");
    assert.equal(/copia|riesgo/i.test(clone.title.es), false);
    const ery = lookup.classifyAddress("ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump", data.cards, "lista", data.evm);
    assert.equal(ery.kind, "copia");
    const fmn = lookup.classifyAddress("FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump", data.cards, "lista", data.evm);
    assert.equal(fmn.kind, "copia");
    const other = lookup.classifyAddress(USDC, data.cards, "lista", data.evm);
    assert.equal(other.kind, "otra");
    assert.equal(other.light, "atencion");
    const usdcName = other.rows.find((row) => row.label.es === "Nombre");
    assert.equal(usdcName?.value.es, "USD Coin");
    assert.equal(usdcName?.value.es.includes("\uFFFD"), false);
    const knownEvm = lookup.classifyAddress("0xC99056C762F0802e4154E6322bd71ae928857777", data.cards, "lista", data.evm);
    assert.equal(knownEvm.kind, "evm");
    assert.equal(knownEvm.light, "riesgo");
    assert.equal(knownEvm.title.es, "Copia conocida");
    const otherEvm = lookup.classifyAddress("0x0000000000000000000000000000000000000001", data.cards, "lista", data.evm);
    assert.equal(otherEvm.kind, "evm");
    assert.equal(otherEvm.light, "atencion");
    assert.match(otherEvm.title.es, /solo existe en Solana/);
    const missing = lookup.classifyAddress("11111111111111111111111111111111", data.cards, "lista", data.evm);
    assert.equal(missing.kind, "sin_ficha");
    assert.equal(missing.title.es, "No es la dirección oficial");
    assert.match(missing.support.es, /Esto no dice quién creó esta dirección ni con qué intención/);
    const near = lookup.classifyAddress(`${CA.slice(0, -1)}q`, data.cards, "lista", data.evm);
    assert.equal(near.title.es, "No es la dirección oficial");
    assert.equal(near.compare?.marks.filter((mark) => mark.changed).length, 1);
    const down = lookup.classifyAddress(CA, data.cards, "caida", data.evm);
    assert.equal(down.kind, "lectura_caida");
    assert.equal(down.light, "neutro");
  });

  test("palette pairs used as text clear 4.5:1", () => {
    const css = read("assets/tool.css");
    const pick = (name: string) => {
      const found = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
      assert.ok(found?.[1], name);
      return found[1];
    };
    const bg = pick("--bg");
    const elev = pick("--bg-elev");
    const text = pick("--text");
    const muted = pick("--muted");
    const accent = pick("--accent");
    const ink = pick("--accent-ink");
    for (const [fg, surface] of [
      [text, bg],
      [muted, bg],
      [text, elev],
      [muted, elev],
      [ink, accent],
      [pick("--ok"), bg],
      [pick("--attention"), bg],
      [pick("--risk"), bg],
    ] as const) {
      assert.ok(contrast(fg, surface) >= 4.5, `${fg} on ${surface}`);
    }
  });

  test("public anchors, the archive, and the publish flag stay intact", () => {
    const home = read("index.html");
    for (const id of ["wallets", "transparencia", "reparto", "estado", "ppm"]) {
      assert.match(home, new RegExp(`id="${id}"`));
    }
    for (const name of hiddenNames()) assert.equal(mentionsHiddenName(name.toUpperCase()), true);
    for (const rel of ROUTES) {
      const html = read(rel);
      assert.equal(mentionsHiddenName(html), false, rel);
      assert.equal(html.includes('class="draft"'), false, rel);
      assert.equal(html.includes("Borrador del repositorio. No publicado en stubxai.com."), false, rel);
      assert.match(html, /rel="canonical" href="https:\/\/stubxai.com\//);
      assert.match(html, /property="og:image"/);
      assert.match(html, /name="twitter:card"/);
    }
    assert.equal(mentionsHiddenName(read("archivo.html")), false);
    assert.match(read("404.html"), /href="\/assets\/site\.css"/);
    assert.match(read("404.html"), /href="\/"/);
    assert.equal(/href="assets\//.test(read("404.html")), false);
    const redirects = read("_redirects");
    assert.match(redirects, /https:\/\/superb-horse-9036f5\.netlify\.app\/\*  https:\/\/stubxai.com\/:splat  301!/);
    assert.equal(redirects.includes("/proofs/#archivo"), false);
    assert.match(read("_headers"), /Strict-Transport-Security: max-age=31536000; includeSubDomains/);
    assert.match(read("_headers"), /Cloudflare Pages/);
    const robots = read("robots.txt");
    for (const bot of ["GPTBot", "Google-Extended", "CCBot", "ClaudeBot", "anthropic-ai", "Applebot-Extended", "Bytespider", "meta-externalagent"]) {
      assert.match(robots, new RegExp(`User-agent: ${bot}\\nDisallow: /`));
    }
    assert.match(robots, /User-agent: \*\nAllow: \//);
    assert.match(robots, /Sitemap: https:\/\/stubxai\.com\/sitemap\.xml/);
    const globalHeaders = read("_headers").split(/\n\/assets\/\*/)[0] ?? "";
    assert.equal(globalHeaders.includes("X-Robots-Tag"), false);
    for (const rule of [/\/lab\/sw\.js\n(?:  .*\n)*  X-Robots-Tag: noindex, nofollow/, /\/modules\/\*\n(?:  .*\n)*  X-Robots-Tag: noindex, nofollow/, /\/token\.json\n(?:  .*\n)*  X-Robots-Tag: noindex, nofollow/]) {
      assert.match(read("_headers"), rule);
    }
    for (const rel of ["index.html", "verify/index.html", "lab/index.html", "archivo.html", "proofs/index.html"]) {
      assert.equal(read(rel).includes("noindex"), false, rel);
      assert.match(read(rel), /<link rel="canonical" href="https:\/\/stubxai\.com\//, rel);
    }
    assert.match(read("sitemap.xml"), /https:\/\/stubxai.com\/verify\//);
    assert.match(read("sitemap.xml"), /https:\/\/stubxai.com\/archivo</);
    assert.match(read("sitemap.xml"), /https:\/\/stubxai.com\/studio\/</);
    assert.match(read("sitemap.xml"), /https:\/\/stubxai.com\/studio\/reglas\//);
    assert.equal((read("_headers").match(/^\/studio\/\*$/gm) ?? []).length, 0);
    assert.match(read("studio/index.html"), /connect-src 'self'/);
    assert.match(read("studio/index.html"), /default-src 'none'/);
    assert.match(read("studio/reglas/index.html"), /connect-src 'self'/);
    assert.match(read("studio/reglas/index.html"), /default-src 'none'/);
    assert.equal(read("studio/index.html").includes("noindex"), false);
    assert.equal(read("studio/reglas/index.html").includes("noindex"), false);
    assert.equal(read("sitemap.xml").includes("archivo.html"), false);
    assert.match(read("_headers"), /\/assets\/\*[\s\S]*max-age=0, must-revalidate/);
    assert.equal(redirects.includes("/archivo.html"), false);
    assert.match(redirects, /\/docs\s+\/archivo\s+301/);
    assert.deepEqual(redirectCycles(redirects, siteRoot()), []);
    assert.ok(redirectCycles("/archivo /archivo.html 301\n", siteRoot()).length > 0);
    const proofs = read("proofs/index.html");
    assert.equal((proofs.match(/Cómo repetirlo tú/g) ?? []).length, 7);
    assert.match(proofs, /ots info/);
    assert.match(proofs, /blockstream\.info/);
    assert.match(proofs, /logs\/anchors/);
    assert.match(proofs, /https:\/\/opentimestamps\.org\//);
    assert.match(read("verify/index.html"), /2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX/);
    assert.match(read("verify/index.html"), /cuenta personal publicada/);
    const security = read("security/index.html");
    assert.match(security, /ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump/);
    assert.match(security, /FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump/);
    assert.match(security, /0xC99056C762F0802e4154E6322bd71ae928857777/);
    assert.match(security, /0xAEE5212f20cc95370cb3556c4493CFD07721a5a3/);
    assert.match(security, /Cloudflare Pages/);
    assert.match(security, /edad mínima de 18 años/);
    assert.match(security, /de práctica/);
    assert.match(security, /STUBX no es un exchange/);
    assert.match(read("tokenomics/index.html"), /se mezcló con su dinero; no se usó por separado para el proyecto/);
    assert.match(read("marca/index.html"), /ipfs add --only-hash --cid-version=1 --raw-leaves/);
    assert.match(read("marca/index.html"), /bfae3649d4b255d72ca13985344082b079cdf4a3cdd582c6e5b224d1d96a2d17/);
    assert.match(read("marca/index.html"), /id="reglas"/);
    const phrases = spawnSync("python3", ["web/v2/tools/check_legal_phrases.py"], { cwd: repoRoot(), encoding: "utf8" });
    assert.equal(phrases.status, 0, phrases.stderr);
    const refused = spawnSync("python3", ["web/v2/tools/build_site.py", "--publish"], {
      cwd: repoRoot(),
      encoding: "utf8",
      env: { ...process.env, STUBX_PUBLISH: "" },
    });
    assert.equal(refused.status, 1, refused.stdout);
    assert.match(refused.stderr, /STUBX_PUBLISH=1 y --publish/);
    assert.equal(read("index.html").includes('class="draft"'), false);
    const flag = spawnSync(
      "python3",
      [
        "-c",
        [
          "import importlib.util",
          "spec = importlib.util.spec_from_file_location('build_site', 'web/v2/tools/build_site.py')",
          "mod = importlib.util.module_from_spec(spec)",
          "spec.loader.exec_module(mod)",
          "assert mod.draft_html(True) == ''",
          "draft = mod.draft_html(False)",
          "assert draft.count('class=\"draft\"') == 1",
          "names = ['Cri' + 'stian', 'Par' + 'do', 'Cama' + 'cho']",
          "low = draft.lower()",
          "assert all(name.lower() not in low for name in names)",
          "assert 'No publicado en stubxai.com' in draft",
        ].join("\n"),
      ],
      { cwd: repoRoot(), encoding: "utf8" },
    );
    assert.equal(flag.status, 0, flag.stderr);
  });

  test("frame-ancestors 'none' cubre todas las rutas de _headers", () => {
    const blocks: Array<{ path: string; headers: string[] }> = [];
    let current: { path: string; headers: string[] } | null = null;
    for (const line of read("_headers").split("\n")) {
      if (line.startsWith("#")) continue;
      if (line.trim() === "") {
        current = null;
        continue;
      }
      if (!/^\s/.test(line)) {
        current = { path: line.trim(), headers: [] };
        blocks.push(current);
        continue;
      }
      assert.ok(current, line);
      current.headers.push(line.trim());
    }
    const policies = blocks.flatMap((block) =>
      block.headers
        .filter((header) => header.startsWith("Content-Security-Policy:"))
        .map((header) => ({ path: block.path, header })),
    );
    assert.equal(policies.length, 6);
    assert.ok(policies.every((policy) => policy.header.includes("frame-ancestors 'none'")));
    const globalPolicy = policies.find((policy) => policy.path === "/*");
    assert.deepEqual(cspHosts(globalPolicy?.header ?? ""), []);
    const verifyPolicy = policies.find((policy) => policy.path === "/verify/*");
    assert.deepEqual(cspHosts(verifyPolicy?.header ?? ""), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const verifyBlock = blocks.find((block) => block.path === "/verify/*");
    assert.ok(verifyBlock?.headers.includes("! Content-Security-Policy"));
    const notebookBlock = blocks.find((block) => block.path === "/cuaderno/*");
    const unsetAt = notebookBlock?.headers.findIndex((header) => header.replace(/\s+/g, " ") === "! Content-Security-Policy") ?? -1;
    const notebookCspAt = notebookBlock?.headers.findIndex((header) => header.startsWith("Content-Security-Policy:")) ?? -1;
    assert.ok(unsetAt >= 0 && notebookCspAt > unsetAt);
    const notebookPolicy = policies.find((policy) => policy.path === "/cuaderno/*");
    assert.deepEqual(cspHosts(notebookPolicy?.header ?? ""), ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    const samples = ["/", "/verify/", "/lab/", "/lab/sw.js", "/aprender/", "/studio/", "/cuaderno/", "/cuaderno/index.html", "/token.json", "/assets/site.css", "/404.html"];
    const seen = new Map<string, string>();
    for (const sample of samples) {
      const applied = new Map<string, string[]>();
      for (const block of blocks) {
        if (!headerPathMatches(block.path, sample)) continue;
        for (const line of block.headers) {
          const compact = line.replace(/\s+/g, " ");
          if (compact.startsWith("! ")) {
            applied.delete(compact.slice(2).trim().toLowerCase());
            continue;
          }
          const split = line.indexOf(":");
          const name = line.slice(0, split).trim().toLowerCase();
          const value = line.slice(split + 1).trim();
          const list = applied.get(name) ?? [];
          list.push(value);
          applied.set(name, list);
        }
      }
      const csp = applied.get("content-security-policy") ?? [];
      assert.equal(csp.length, 1, `${sample} recibe ${csp.length} CSP`);
      seen.set(sample, csp[0] ?? "");
    }
    assert.equal(seen.get("/")?.includes("mainnet-beta"), false);
    assert.match(seen.get("/cuaderno/") ?? "", /https:\/\/solana-rpc\.publicnode\.com/);
    assert.match(seen.get("/verify/") ?? "", /https:\/\/api\.mainnet-beta\.solana\.com/);
    const star = blocks.find((block) => block.path === "/*");
    assert.ok(star?.headers.some((header) => header === "X-Frame-Options: DENY"));
    for (const file of htmlFiles(siteRoot())) {
      const html = readFileSync(file, "utf8");
      const rel = path.relative(siteRoot(), file);
      assert.equal(html.includes("frame-ancestors"), false, rel);
      if (!html.includes("<head>")) continue;
      assert.match(html, /og-stubx-2026-10b-1200x630\.jpg/, rel);
      assert.equal(html.includes("og-stubx-2026-10-1200x630.jpg"), false, rel);
    }
  });

  test("the browser bundle matches lab/", async () => {
    const root = repoRoot();
    const bundlePaths = [
      "web/v2/modules",
      "web/v2/assets/verify.js",
      "web/v2/assets/mission.js",
      "web/v2/content/tools",
      "web/v2/lab/sw.js",
    ];
    const before = digestTree(root, bundlePaths);
    const run = spawnSync(process.execPath, ["web/v2/tools/bundle-from-lab.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    const snap = JSON.parse(readFileSync(path.join(root, "web/v2/modules/snapshot.json"), "utf8")) as { pr: number; branch: string; commit: string };
    assert.equal(snap.pr, 21);
    assert.equal(snap.branch, "feat/verify-universal");
    assert.match(run.stdout, new RegExp(snap.commit));
    const same = (left: string, right: string) => {
      assert.equal(readFileSync(path.join(root, left), "utf8"), readFileSync(path.join(root, right), "utf8"), left);
    };
    same("web/v2/assets/verify.js", "site-drafts/assets/verify.js");
    same("web/v2/assets/mission.js", "site-drafts/assets/mission.js");
    same("web/v2/lab/sw.js", "site-drafts/lab/sw.js");
    same("web/v2/modules/lab/mision-01.json", "lab/mission/mision-01.json");
    const verifyJs = readFileSync(path.join(root, "web/v2/assets/verify.js"), "utf8");
    assert.match(verifyJs, /CENSUS_PERSONAL/);
    assert.match(verifyJs, /cuenta personal publicada/);
    assert.match(verifyJs, /0\.0000 %/);
    const { loadCards, loadFuentes } = (await import(pathToFileURL(path.join(root, "dist/lab/mission/load.js")).href)) as {
      loadCards: (repo: string, fuentes: unknown) => Array<Record<string, unknown>>;
      loadFuentes: (repo: string) => unknown;
    };
    const { presentCard, presentClones, presentEvmItem } = (await import(
      pathToFileURL(path.join(root, "dist/lab/display-copy.js")).href
    )) as {
      presentCard: (card: Record<string, unknown>) => Record<string, unknown>;
      presentClones: (clones: Record<string, unknown>) => Record<string, unknown>;
      presentEvmItem: (item: Record<string, unknown>) => Record<string, unknown>;
    };
    const clones = JSON.parse(readFileSync(path.join(root, "verify/registry/clones.json"), "utf8")) as {
      evm: Array<Record<string, unknown>>;
    };
    const expected = {
      source: "lista",
      cards: loadCards(root, loadFuentes(root)).map((card) => presentCard(card)),
      evm: clones.evm.map((item) => presentEvmItem(item)),
    };
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, "web/v2/modules/verify/cards.json"), "utf8")), expected);
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(root, "web/v2/modules/verify/clones.json"), "utf8")),
      presentClones(clones),
    );
    assert.equal(digestTree(root, bundlePaths), before, "el bundle de web/v2 no coincide con lab/: hay que regenerarlo y commitearlo");
    const compiled = readFileSync(path.join(root, "dist/lab/verify/lookup.js"), "utf8")
      .replaceAll("\r\n", "\n")
      .replaceAll(/^\/\/# sourceMappingURL=.*\n?/gm, "")
      .trim();
    assert.equal(readFileSync(path.join(root, "web/v2/modules/verify/lookup.mjs"), "utf8"), `${compiled}\n`);
    const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", "86df5760554c65d53dbe022739f620a86c93b684", "HEAD"], {
      cwd: root,
    });
    assert.equal(ancestor.status, 0);
  });

  test("publicar otra vez deja web/v2 igual", () => {
    const root = repoRoot();
    const digest = () => {
      const hash = createHash("sha256");
      const files: string[] = [];
      const walk = (rel: string) => {
        const full = path.join(root, rel);
        const info = statSync(full);
        if (info.isDirectory()) {
          if (path.basename(full) === "__pycache__") return;
          for (const name of readdirSync(full).sort()) walk(path.join(rel, name));
          return;
        }
        if (rel.endsWith(".pyc")) return;
        files.push(rel);
      };
      walk("web/v2");
      for (const rel of files.sort()) {
        hash.update(rel);
        hash.update(readFileSync(path.join(root, rel)));
      }
      return hash.digest("hex");
    };
    const before = digest();
    const run = spawnSync("python3", ["web/v2/tools/build_site.py", "--publish"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, STUBX_PUBLISH: "1", PYTHONDONTWRITEBYTECODE: "1" },
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    assert.equal(digest(), before, "regenerar web/v2 en modo publicación cambió archivos");
  });
});

function digestTree(root: string, rels: readonly string[]): string {
  const hash = createHash("sha256");
  const files: string[] = [];
  const walk = (rel: string) => {
    const full = path.join(root, rel);
    let info;
    try {
      info = statSync(full);
    } catch {
      return;
    }
    if (info.isDirectory()) {
      for (const name of readdirSync(full).sort()) walk(path.join(rel, name));
      return;
    }
    files.push(rel);
  };
  for (const rel of rels) walk(rel);
  for (const rel of files.sort()) {
    hash.update(rel);
    hash.update(readFileSync(path.join(root, rel)));
  }
  return hash.digest("hex");
}

const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";
const HOLDER_GLOSSARY_ES = "‘Holder’ (término del sector): cuenta que tiene tokens. No implica derechos ni comunidad de inversores.";
const HOLDER_GLOSSARY_EN = "‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community.";

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

test("el pie es el mismo en español y en inglés", () => {
  const root = repoRoot();
  for (const rel of ROUTES) {
    const html = readFileSync(path.join(root, "web/v2", rel), "utf8");
    const footer = html.slice(html.lastIndexOf("<footer"));
    assert.ok(footer.includes(FOOTER_ES), rel);
    assert.ok(footer.includes(FOOTER_EN), rel);
    assert.equal(footer.includes("Memecoin experimental"), false, rel);
    assert.equal(footer.includes("You can lose"), false, rel);
  }
});

const OG_FILE = "og-stubx-2026-10b-1200x630.jpg";
const OG_AI_ES = "Ilustración con elementos generados con IA.";
const OG_AI_EN = "Illustration with AI-generated elements.";
const OLD_OG_FOOTER = [
  "you can lose everything",
  "memecoin experimental",
  "criptoactivo de alto riesgo",
  "imagen generada con ia",
  "ai-generated image",
];

test("el pie antiguo no sale en el alt de la imagen OG", () => {
  const root = repoRoot();
  const pages = [...ROUTES, "archivo.html"];
  for (const rel of pages) {
    const html = readFileSync(path.join(root, "web/v2", rel), "utf8");
    for (const attr of ["og:image:alt", "twitter:image:alt"]) {
      const match = html.match(new RegExp(`(?:property|name)="${attr}" content="([^"]*)"`));
      const alt = match?.[1];
      assert.ok(alt, `${rel} ${attr}`);
      const lower = alt.toLowerCase();
      for (const phrase of OLD_OG_FOOTER) assert.equal(lower.includes(phrase), false, `${rel} ${attr} ${phrase}`);
      assert.ok(alt.includes(FOOTER_ES), rel);
      assert.ok(alt.includes(FOOTER_EN), rel);
      assert.ok(alt.includes(OG_AI_ES), rel);
      assert.ok(alt.includes(OG_AI_EN), rel);
    }
    for (const attr of ["og:image", "twitter:image"]) {
      const match = html.match(new RegExp(`(?:property|name)="${attr}" content="([^"]*)"`));
      assert.equal(match?.[1], `https://stubxai.com/assets/${OG_FILE}`, `${rel} ${attr}`);
    }
  }
  const generator = readFileSync(path.join(root, "web/v2/tools/build_site.py"), "utf8");
  const og = generator.slice(generator.indexOf("OG_IMAGE"), generator.indexOf("DRAFT_ES"));
  const ogLower = og.toLowerCase();
  for (const phrase of OLD_OG_FOOTER) assert.equal(ogLower.includes(phrase), false, phrase);
  assert.ok(og.includes(OG_FILE));
  assert.ok(og.includes(FOOTER_ES) && og.includes(FOOTER_EN));
  assert.ok(og.includes(OG_AI_ES) && og.includes(OG_AI_EN));
  for (const file of walkFiles(path.join(root, "web/v2"))) {
    const rel = path.relative(path.join(root, "web/v2"), file);
    if (rel === "archivo.html" || rel === "token.json" || rel.startsWith("tools/__pycache__")) continue;
    if (!/\.(html|py|js|mjs|json|md|css|txt|xml)$/.test(rel)) continue;
    const text = readFileSync(file, "utf8").toLowerCase();
    const studioLabel = rel === "studio/lib/copy.mjs" || rel === "studio/reglas/index.html";
    for (const phrase of OLD_OG_FOOTER) {
      if (studioLabel && (phrase === "imagen generada con ia" || phrase === "ai-generated image")) continue;
      assert.equal(text.includes(phrase), false, `${rel} ${phrase}`);
    }
  }
});

test("las palabras prohibidas no salen en el texto visible, y token.json queda fuera", () => {
  const root = path.join(repoRoot(), "web/v2");
  const token = readFileSync(path.join(root, "token.json"), "utf8");
  assert.match(token, /holders/);
  const allowedHolder = new Set([HOLDER_GLOSSARY_ES, HOLDER_GLOSSARY_EN, "‘Holder’ (término del sector)", "‘Holder’ (industry term)"]);
  const hits: string[] = [];
  for (const file of walkFiles(root)) {
    const rel = path.relative(root, file);
    if (rel === "token.json" || rel === "archivo.html" || rel.startsWith("tools/")) continue;
    if (rel === "studio/blocklist.json") continue;
    if (!/\.(html|json|md|js|mjs)$/.test(rel)) continue;
    const text = readFileSync(file, "utf8");
    const stripped = text
      .replaceAll(HOLDER_GLOSSARY_ES, "")
      .replaceAll(HOLDER_GLOSSARY_EN, "")
      .replaceAll("‘Holder’ (término del sector)", "")
      .replaceAll("‘Holder’ (industry term)", "")
      .replaceAll("termino-holder", "")
      .replaceAll('id="holder"', "")
      .replaceAll("\"id\": \"holder\"", "")
      .replaceAll("\"id\":\"holder\"", "")
      .replaceAll("holdersNote_en", "")
      .replaceAll("holdersStatus", "")
      .replaceAll("holdersNote", "")
      .replaceAll("otherHolders", "")
      .replaceAll("\"holders\"", "")
      .replaceAll("holders:", "")
      .replaceAll("reserva-real", "")
      .replaceAll("reserva-virtual", "")
      .replaceAll("real_token_reserves", "")
      .replaceAll("real_quote_reserves", "")
      .replaceAll("virtual_token_reserves", "")
      .replaceAll("virtual_quote_reserves", "")
      .replaceAll("Pump.fun lo llama ‘reserves’", "")
      .replaceAll("Pump.fun calls these ‘reserves’", "")
      .replaceAll("sin reserva de equipo", "")
      .replaceAll("Sin reserva de equipo", "")
      .replaceAll("No team reserve", "")
      .replaceAll("with no team reserve", "")
      .replaceAll("no team reserve", "")
      .replaceAll("ni reservados", "")
      .replaceAll("not locked or reserved", "")
      .replaceAll("or reserved", "");
    if (/\bholders?\b/i.test(stripped)) hits.push(`holder ${rel}`);
    if (/\breserves?\b/i.test(stripped)) hits.push(`reserve ${rel}`);
    if (/\breserva\b/i.test(stripped) && !/reservados/.test(stripped)) hits.push(`reserva ${rel}`);
    for (const phrase of [
      "fondo de liquidez",
      "el fondo que se puede retirar",
      "el fondo retirable",
      "único fondo",
      "fondos retirables",
      "withdrawable funds",
    ]) {
      if (text.includes(phrase)) hits.push(`${phrase} ${rel}`);
    }
    for (const sentence of allowedHolder) {
      if (rel.endsWith("glossary.json") && text.includes(sentence)) continue;
    }
  }
  assert.deepEqual(hits, []);
  const legal = readFileSync(path.join(root, "legal/index.html"), "utf8");
  const risks = readFileSync(path.join(root, "risks/index.html"), "utf8");
  const glossary = readFileSync(path.join(root, "modules/lab/glossary.json"), "utf8");
  assert.match(legal, /fondos de garantía de depósitos/);
  assert.match(risks, /fondos de garantía de depósitos/);
  assert.match(glossary, /No es una auditoría de fondos/);
});

function redirectCycles(text: string, root: string): string[] {
  const rules = new Map<string, string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    const from = parts[0] ?? "";
    const to = parts[1] ?? "";
    const status = parts[2] ?? "";
    if (!from.startsWith("/") || !to.startsWith("/") || status === "200") continue;
    rules.set(from, to);
  }
  const htmlFiles = new Set<string>();
  const walkHtml = (dir: string, prefix: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(full).isDirectory()) walkHtml(full, rel);
      else if (name.endsWith(".html")) htmlFiles.add(`/${rel}`);
    }
  };
  walkHtml(root, "");
  const implicit = (url: string): string | null => {
    if (url.endsWith("/index.html")) {
      const parent = url.slice(0, -"index.html".length);
      return parent.endsWith("/") ? parent : `${parent}/`;
    }
    if (url.endsWith(".html")) return url.slice(0, -".html".length) || "/";
    if (url !== "/" && url.endsWith("/") && htmlFiles.has(`${url.slice(0, -1)}.html`)) return url.slice(0, -1);
    return null;
  };
  const hop = (url: string): string | null => rules.get(url) ?? implicit(url);
  const cycles: string[] = [];
  const starts = new Set<string>([...rules.keys(), ...htmlFiles]);
  for (const start of starts) {
    const seen: string[] = [];
    let url: string | null = start;
    for (let step = 0; url && step < 8; step += 1) {
      if (seen.includes(url)) {
        cycles.push([...seen.slice(seen.indexOf(url)), url].join(" -> "));
        break;
      }
      seen.push(url);
      url = hop(url);
    }
  }
  return cycles;
}
