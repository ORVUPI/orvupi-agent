import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const CA = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
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
  "methodology/index.html",
  "security/index.html",
  "risks/index.html",
  "legal/index.html",
  "community/index.html",
  "marca/index.html",
  "memes/index.html",
  "vision/index.html",
  "aprender/index.html",
  "studio/index.html",
  "studio/reglas/index.html",
  "pares/index.html",
  "cuaderno/index.html",
  "contribuir/index.html",
  "404.html",
];
const RETIRED = ["token.json", "tokenomics/index.html", "status/index.html", "proofs/index.html", "archivo.html", "build/index.html", "avances/index.html"];

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

function httpsUrlHosts(source: string): string[] {
  const hosts: string[] = [];
  for (const match of source.matchAll(/https:\/\/[a-z0-9.-]+/gi)) {
    hosts.push(new URL(match[0]).host);
  }
  return hosts;
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

describe("web ORVUPI", () => {
  test("todas las rutas existen, comparten la cabecera ORVUPI y llevan los dos idiomas", () => {
    for (const rel of ROUTES) {
      const html = read(rel);
      assert.match(html, /<html lang="es"/, rel);
      assert.match(html, /<strong>ORVUPI<\/strong>/, rel);
      assert.match(html, /\/assets\/orvupi\/avatar\.png/, rel);
      const es = (html.match(/class="lang es"/g) ?? []).length;
      const en = (html.match(/class="lang en"/g) ?? []).length;
      assert.ok(es > 0 && Math.abs(es - en) <= 2, `${rel} es=${es} en=${en}`);
      assert.match(html, /href="https:\/\/github\.com\/ORVUPI\/orvupi-agent"/, rel);
    }
  });

  test("las páginas del token anterior ya no están y redirigen a la portada", () => {
    const redirects = redirectMap(siteRoot());
    for (const rel of RETIRED) {
      assert.equal(statSync(path.join(siteRoot(), rel), { throwIfNoEntry: false }), undefined, rel);
    }
    for (const from of ["/token.json", "/tokenomics", "/status", "/proofs", "/archivo", "/build", "/avances", "/pruebas"]) {
      assert.equal(redirects.get(from), "/", from);
    }
    const sitemap = read("sitemap.xml");
    for (const gone of ["/tokenomics/", "/status/", "/proofs/", "/build/", "/archivo"]) assert.equal(sitemap.includes(gone), false, gone);
  });

  test("el nombre anterior y su dirección no salen en ningún archivo publicado, salvo el dominio y la migración", () => {
    const legacy = ["stu", "bx"].join("");
    const allowed = [
      new RegExp(`${legacy}ai\\.com`, "gi"),
      
    ];
    const migrationFiles = new Set(["shared/legacy-names.js", "assets/shell.js"]);
    const hits: string[] = [];
    for (const file of walk(siteRoot())) {
      const rel = path.relative(siteRoot(), file).split(path.sep).join("/");
      if (rel.startsWith("tools/") || rel.startsWith("content/") || rel.includes("/album/")) continue;
      if (!/\.(html|js|mjs|json|md|css|txt|xml|webmanifest)$/.test(rel)) continue;
      let text = readFileSync(file, "utf8");
      if (rel === "shared/solana-read.js") text = text.replace(/export const LEGACY_FLAG_MINT = "[^"]+";/, "");
      for (const re of allowed) text = text.replace(re, "");
      if (migrationFiles.has(rel)) text = text.replace(new RegExp(`"${legacy}-?"|\\$\\{LEGACY_PREFIX\\}`, "g"), "");
      if (new RegExp(legacy, "i").test(text)) hits.push(`nombre anterior ${rel}`);
      if (/tal[oó]n/i.test(text.replace(/fondo-talon|function talon|talon\(rgba/g, ""))) hits.push(`talon ${rel}`);
      if (rel !== "lab/index.html" && rel !== "assets/mission.js" && !rel.startsWith("modules/lab/") && text.includes(CA)) hits.push(`mint ${rel}`);
    }
    assert.deepEqual(hits, []);
  });

  test("el contrato se lee de un solo módulo, vale null y no casa con valores vacíos", async () => {
    const contract = await import(pathToFileURL(path.join(siteRoot(), "shared/orvupi-contract.js")).href);
    const config = JSON.parse(read("shared/orvupi-contract.json")) as { contract: unknown; network: unknown };
    assert.equal(contract.OFFICIAL_ADDRESS, config.contract);
    assert.equal(contract.OFFICIAL_NETWORK, config.network);
    assert.equal(contract.OFFICIAL_ADDRESS, null);
    for (const value of ["", null, undefined, 0, "null", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]) assert.equal(contract.isOfficialAddress(value), false, String(value));
    const hits: string[] = [];
    for (const file of walk(siteRoot())) {
      const rel = path.relative(siteRoot(), file).split(path.sep).join("/");
      if (rel.startsWith("tools/") || rel.startsWith("content/") || !/\.(m?js)$/.test(rel)) continue;
      const text = readFileSync(file, "utf8");
      if (/(OFFICIAL_(MINT|CA)|SUMMARY_OFFICIAL)\s*=\s*["'`]/.test(text)) hits.push(rel);
      if (/===\s*(OFFICIAL_MINT|MARKET_OFFICIAL_MINT|OFFICIAL_ADDRESS)\b/.test(text) && rel !== "shared/orvupi-contract.js" && rel !== "assets/verify.js" && rel !== "modules/verify/lookup.mjs") hits.push(`${rel}: comparación directa`);
    }
    assert.deepEqual(hits, []);
  });

  test("el contrato ORVUPI tiene un único punto de configuración y hoy no existe", () => {
    const config = JSON.parse(read("shared/orvupi-contract.json")) as { contract: unknown; network: unknown; label: { es: string; en: string } };
    assert.equal(config.contract, null);
    assert.equal(config.network, null);
    assert.equal(config.label.es, "Contrato ORVUPI: aún no existe");
    assert.equal(config.label.en, "ORVUPI contract: does not exist yet");
    assert.equal(/OFFICIAL_CA\s*=/.test(read("assets/shell.js")), false);
    assert.match(read("assets/shell.js"), /import\("\/shared\/orvupi-contract\.js"\)/);
    assert.match(read("assets/verify.js"), /"Contrato ORVUPI: aún no existe\."/);
    const bundle = read("assets/verify.js");
    const data = JSON.parse(bundle.slice(bundle.indexOf("{", bundle.indexOf("const ORVUPI_VERIFY")), bundle.indexOf(";\n", bundle.indexOf("const ORVUPI_VERIFY")))) as { registry: unknown[]; evm: unknown[]; cards: { mint: string }[] };
    assert.deepEqual(data.registry, []);
    assert.deepEqual(data.evm, []);
    assert.deepEqual(data.cards.map((card) => card.mint), ["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);
  });

  test("los enlaces locales llevan a un archivo o a una redirección", () => {
    const missing: string[] = [];
    for (const rel of ROUTES) {
      const file = path.join(siteRoot(), rel);
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
        const url = match[1] ?? "";
        if (!localTargetExists(siteRoot(), file, url)) missing.push(`${rel} -> ${url}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test("las cabeceras cubren todas las rutas con frame-ancestors 'none' y Verify solo habla con los nodos de su red", () => {
    const headers = read("_headers");
    assert.match(headers, /\/\*\n  Content-Security-Policy: [^\n]*frame-ancestors 'none'/);
    const verify = headers.slice(headers.indexOf("/verify/\n"));
    const policy = verify.split("\n").find((line) => line.includes("Content-Security-Policy:")) ?? "";
    assert.deepEqual(cspHosts(policy).sort(), ["api.dexscreener.com", "api.mainnet-beta.solana.com", "bsc-rpc.publicnode.com", "ethereum-rpc.publicnode.com", "mainnet.base.org", "solana-rpc.publicnode.com"]);
    assert.deepEqual(redirectCycles(read("_redirects"), siteRoot()), []);
  });

  test("las páginas no nombran a la persona creadora", () => {
    for (const rel of ROUTES) assert.equal(mentionsHiddenName(read(rel)), false, rel);
  });

  test("el pie de cada página y /legal dan el correo oficial", () => {
    const mail = '<a href="mailto:orvupi.hq@gmail.com">orvupi.hq@gmail.com</a>';
    assert.ok(read("legal/index.html").includes(mail));
    for (const file of walk(siteRoot())) {
      const rel = path.relative(siteRoot(), file).split(path.sep).join("/");
      if (!rel.endsWith(".html") || rel.startsWith("tools/") || rel.startsWith("content/")) continue;
      const html = readFileSync(file, "utf8");
      if (!html.includes("or-footer-links")) continue;
      assert.ok((html.split("or-footer-links")[1] ?? "").includes(mail), rel);
    }
    for (const txt of ["security.txt", ".well-known/security.txt"]) assert.match(read(txt), /^Contact: mailto:orvupi\.hq@gmail\.com$/m);
  });

  test("ninguna página muestra la franja de cifras de la portada", () => {
    for (const file of walk(siteRoot())) {
      const rel = path.relative(siteRoot(), file).split(path.sep).join("/");
      if (!rel.endsWith(".html") || rel.startsWith("tools/") || rel.startsWith("content/")) continue;
      const html = readFileSync(file, "utf8");
      for (const gone of ["or-metrics", "Imágenes para crear", "Colecciones visuales", "Herramientas que explorar", "La web en dos idiomas", "Images for creating", "Visual collections", "Tools to explore", "Website in two languages"]) {
        assert.equal(html.includes(gone), false, `${rel}: ${gone}`);
      }
    }
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

const FOOTER_ES = ["Cripto de alto riesgo", " · ", "Puedes perderlo todo", " · ", "No es consejo de inversión."].join("");
const FOOTER_EN = ["High-risk crypto", " · ", "You could lose everything", " · ", "Not investment advice."].join("");
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

test("el pie no repite el riesgo y enlaza a Riesgos", () => {
  const root = repoRoot();
  for (const rel of ROUTES) {
    const html = readFileSync(path.join(root, "web/v2", rel), "utf8");
    const footer = html.slice(html.lastIndexOf("<footer"));
    assert.equal(footer.includes(FOOTER_ES), false, rel);
    assert.equal(footer.includes(FOOTER_EN), false, rel);
    assert.equal(footer.includes('class="mica"'), false, rel);
    assert.match(footer, /href="(?:\/|\.\.\/)*risks\/"/, rel);
    assert.match(footer, /Riesgos/, rel);
    assert.equal(footer.includes("Memecoin experimental"), false, rel);
    assert.equal(footer.includes("You can lose"), false, rel);
    const keepsRisk = rel === "risks/index.html" || rel === "legal/index.html";
    const main = html.slice(0, html.lastIndexOf("<footer"));
    if (!keepsRisk) assert.equal(main.includes('class="mica"'), false, rel);
  }
});

test("las frases retiradas no salen fuera de /risks y /legal", () => {
  const run = spawnSync("python3", ["web/v2/tools/check_legal_phrases.py"], {
    cwd: repoRoot(),
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});

test("la guardia de frases compara con la lista base congelada y falla si falta una", () => {
  const run = spawnSync("python3", ["web/v2/tools/check_legal_phrases.py"], { cwd: repoRoot(), encoding: "utf8" });
  const covered = Number(/frases de la lista base cubiertas: (\d+)/.exec(run.stdout)?.[1] ?? 0);
  assert.ok(covered >= 60, run.stdout + run.stderr);
  const script = [
    "import check_legal_phrases as guard",
    "base = guard.load_base()",
    "lost = guard.base_missing(base, lambda page: guard.page_text(page).replace(guard.normalize('Un mensaje directo que ofrezca preventa'), ''))",
    "assert any('preventa' in line for line in lost), lost",
    "assert guard.base_missing(base) == []",
    "print('ok')",
  ].join("\n");
  const check = spawnSync("python3", ["-c", script], { cwd: path.join(repoRoot(), "web/v2/tools"), encoding: "utf8" });
  assert.equal(check.stdout.trim(), "ok", check.stderr);
});

test("la guardia junta espacios, saltos, etiquetas, ancho cero y concatenaciones", () => {
  const script = `
import check_legal_phrases as guard
samples = [
    ("espacios", "cripto   de   alto   riesgo"),
    ("salto", "cripto de alto\\nriesgo"),
    ("etiqueta", "cripto de alto <b>riesgo</b>"),
    ("suma", '"cripto de alto " + "riesgo"'),
    ("piece", 'piece("puedes perder", "lo todo")'),
    ("join", '["not investment ", "advice"].join("")'),
    ("adyacentes", '"imagen generada con " "ia"'),
    ("plantilla", "<p>AI-generated\\nimage</p>"),
    ("zwsp", "cripto de alto \\u200briesgo"),
    ("zwj", "not invest\\u200dment advice"),
    ("bom", "ai-generated \\ufeffimage"),
    ("entidad", "cripto de alto &#8203;riesgo"),
    ("zwnj", "cripto de alto \\u200criesgo"),
    ("wj", "not invest\\u2060ment advice"),
    ("rlo", "ai-generated \\u202eimage"),
    ("entidad zwnj", "cripto de alto &#x200C;riesgo"),
    ("entidad wj", "not invest&#x2060;ment advice"),
    ("entidad rlo", "ai-generated &#x202E;image"),
    ("zwsp entre letras", "cripto de alto\\u200briesgo"),
    ("zwnj entre letras", "cripto de alto\\u200criesgo"),
    ("zwj entre letras", "cripto de alto\\u200driesgo"),
    ("bom entre letras", "cripto de alto\\ufeffriesgo"),
    ("wj entre letras", "cripto de alto\\u2060riesgo"),
    ("rlo entre letras", "cripto de alto\\u202eriesgo"),
    ("doble cf", "cripto de alto\\u200b\\u200briesgo"),
    ("mayusculas cf", "CRIPTO DE ALTO\\u200bRIESGO"),
    ("entidad entre letras", "cripto de alto&#8203;riesgo"),
    ("riesgo partido", "there is no\\u200brisk"),
]
for name, sample in samples:
    hits = guard.phrase_hits("content/tools/ejemplo.html", sample)
    if not hits:
        raise SystemExit("no vio " + name)
anti = "trátala como no oficial hasta comprobarla"
anti_cf = "trátala como no\\u200boficial hasta comprobarla"
anti_en = "treat it as unofficial until you check it"
anti_en_cf = "treat it as un\\u200dofficial until you check it"
if guard.phrase_hits("security/index.html", anti) or guard.phrase_hits("security/index.html", anti_cf):
    raise SystemExit("antiestafa")
if guard.phrase_hits("security/index.html", anti_en) or guard.phrase_hits("security/index.html", anti_en_cf):
    raise SystemExit("antiestafa en")
if guard.phrase_hits("security/index.html", "no es oficial") or guard.phrase_hits("security/index.html", "no oficiales"):
    raise SystemExit("no es oficial")
if guard.phrase_hits("studio/reglas/index.html", "no\\u200bes oficial"):
    raise SystemExit("no es oficial cf")
if guard.phrase_hits("index.html", "is not\\u200bofficial"):
    raise SystemExit("portada cf")
if not guard.phrase_hits("studio/index.html", "no\\u200boficial"):
    raise SystemExit("studio cf")
if not guard.phrase_hits("studio/index.html", "unofficial"):
    raise SystemExit("studio")
if not guard.phrase_hits("studio/index.html", "no \\u200boficial"):
    raise SystemExit("ancho cero")
if not guard.phrase_hits("studio/index.html", "un\\u200dofficial"):
    raise SystemExit("zwj")
if not guard.phrase_hits("studio/index.html", "\\ufeffunofficial"):
    raise SystemExit("bom")
if not guard.phrase_hits("studio/index.html", "no \\u200coficial"):
    raise SystemExit("zwnj")
if not guard.phrase_hits("studio/index.html", "un\\u2060official"):
    raise SystemExit("wj")
if not guard.phrase_hits("studio/index.html", "\\u202eunofficial"):
    raise SystemExit("rlo")
if not guard.phrase_hits("studio/index.html", "no &#x200C;oficial"):
    raise SystemExit("entidad zwnj")
if not guard.phrase_hits("studio/index.html", "un&#x2060;official"):
    raise SystemExit("entidad wj")
if not guard.phrase_hits("studio/index.html", "&#x202E;unofficial"):
    raise SystemExit("entidad rlo")
if not guard.phrase_hits("studio/lib/copy.mjs", "not official"):
    raise SystemExit("metadatos")
if guard.phrase_hits("index.html", "is not official"):
    raise SystemExit("portada")
if not guard.phrase_hits("index.html", "no significa que no haya riesgo"):
    raise SystemExit("no haya riesgo")
if not guard.phrase_hits("index.html", "does not mean there is no risk"):
    raise SystemExit("there is no risk")
if guard.phrase_hits("risks/index.html", "no haya riesgo"):
    raise SystemExit("risks")
if guard.phrase_hits("legal/index.html", "there is no risk"):
    raise SystemExit("legal")
if guard.phrase_hits("verify/index.html", "Que no aparezcan señales no significa que esté todo comprobado."):
    raise SystemExit("aprobada")
if not guard.phrase_hits("index.html", "no cierra otros riesgos"):
    raise SystemExit("otros riesgos")
if not guard.phrase_hits("index.html", "close off other risks"):
    raise SystemExit("other risks")
if guard.phrase_hits("risks/index.html", "otros riesgos"):
    raise SystemExit("risks otros")
if guard.phrase_hits("legal/index.html", "other risks"):
    raise SystemExit("legal other")
if guard.phrase_hits("verify/index.html", "Que no aparezcan extensiones no significa que esté todo comprobado."):
    raise SystemExit("extensiones")
print("ok")
`;
  const run = spawnSync("python3", ["-c", script], {
    cwd: repoRoot(),
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: "web/v2/tools" },
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /ok/);
});

const OG_FILE = "orvupi/social.png";
const OG_AI_ES = ["Ilustración con elementos ", "generados con IA."].join("");
const OG_AI_EN = ["Illustration with ", "AI-generated elements."].join("");
const AI_CREDIT_ES = ["Imágenes de Agente Talón ", "generadas con IA"].join("");
const AI_CREDIT_EN = ["Agente Talón images ", "generated with AI"].join("");
const AI_LABEL_ES = ["Imagen ", "generada con IA"].join("");
const AI_LABEL_EN = ["AI-generated ", "image"].join("");
const OLD_OG_FOOTER = [
  "you can lose everything",
  "memecoin experimental",
  "criptoactivo de alto riesgo",
  "imagen generada con ia",
  "ai-generated image",
  "ilustración con elementos generados con ia",
  "illustration with ai-generated elements",
  "imágenes de agente talón generadas con ia",
  "agente talón images generated with ai",
  "cripto de alto riesgo · puedes perderlo todo",
  "high-risk crypto · you could lose everything",
  "no oficial · cripto de alto riesgo",
  "unofficial · high-risk crypto",
];

test("el pie antiguo no sale en el alt de la imagen OG", () => {
  const root = repoRoot();
  const pages = ROUTES.filter((rel) => rel !== "404.html");
  for (const rel of pages) {
    const html = readFileSync(path.join(root, "web/v2", rel), "utf8");
    for (const attr of ["og:image:alt"]) {
      const match = html.match(new RegExp(`(?:property|name)="${attr}" content="([^"]*)"`));
      const alt = match?.[1];
      assert.ok(alt, `${rel} ${attr}`);
      const lower = alt.toLowerCase();
      for (const phrase of OLD_OG_FOOTER) assert.equal(lower.includes(phrase), false, `${rel} ${attr} ${phrase}`);
      assert.equal(alt.includes(FOOTER_ES), false, rel);
      assert.equal(alt.includes(FOOTER_EN), false, rel);
      assert.equal(alt.includes(OG_AI_ES), false, rel);
      assert.equal(alt.includes(OG_AI_EN), false, rel);
      assert.ok(/pulpo/i.test(alt), rel);
    }
    for (const attr of ["og:image", "twitter:image"]) {
      const match = html.match(new RegExp(`(?:property|name)="${attr}" content="([^"]*)"`));
      assert.equal(match?.[1], `https://orvupi.com/assets/${OG_FILE}`, `${rel} ${attr}`);
    }
  }
  const banned = [...OLD_OG_FOOTER, FOOTER_ES.toLowerCase(), FOOTER_EN.toLowerCase(), AI_CREDIT_ES.toLowerCase(), AI_CREDIT_EN.toLowerCase(), AI_LABEL_ES.toLowerCase(), AI_LABEL_EN.toLowerCase()];
  for (const file of walkFiles(path.join(root, "web/v2"))) {
    const rel = path.relative(path.join(root, "web/v2"), file);
    if (rel.startsWith("tools/__pycache__")) continue;
    if (!/\.(html|py|js|mjs|json|md|css|txt|xml)$/.test(rel)) continue;
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const phrase of banned) assert.equal(text.includes(phrase), false, `${rel} ${phrase}`);
  }
});

test("las palabras prohibidas no salen en el texto visible, y token.json queda fuera", () => {
  const root = path.join(repoRoot(), "web/v2");
  const allowedHolder = new Set([HOLDER_GLOSSARY_ES, HOLDER_GLOSSARY_EN, "‘Holder’ (término del sector)", "‘Holder’ (industry term)"]);
  const hits: string[] = [];
  for (const file of walkFiles(root)) {
    const rel = path.relative(root, file);
    if (rel.startsWith("tools/") || rel.startsWith("content/")) continue;
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
  assert.match(risks, /[Rr]iesgo/);
  assert.match(legal, /Privacidad/);
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
