#!/usr/bin/env node
// Genera ORVUPI Academy (web/v2/academy/**) desde academy/content y las herramientas que absorbe.
// Sin dependencias. Uso: node web/v2/tools/build-academy.mjs  (luego: node web/v2/tools/asset-versions.mjs)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, "..");
const ROOT = resolve(WEB, "../..");
const CONTENT = join(ROOT, "academy/content");
const OUT = join(WEB, "academy");
const SITE = "https://orvupi.com";
const BASE = "/academy/";

const cur = JSON.parse(readFileSync(join(CONTENT, "curriculo.json"), "utf8"));
const preg = JSON.parse(readFileSync(join(CONTENT, "preguntas.json"), "utf8"));
const glos = JSON.parse(readFileSync(join(CONTENT, "glosario.json"), "utf8"));
const catalogo = JSON.parse(readFileSync(join(WEB, "assets/orvupi/catalogo.json"), "utf8"));
const CAT = new Map(catalogo.map((c) => [c.id, c]));
const ACT = cur.actualizado || "Dato no disponible";
// Entradas sin texto propio se completan con el glosario del Lab (lab/library/glossary.json).
const LABG = new Map(JSON.parse(readFileSync(join(ROOT, "lab/library/glossary.json"), "utf8")).entries.map((e) => [e.id, e]));
for (const t of glos.terminos) {
  const l = LABG.get(t.id); if (!l) continue;
  if (!t.termino) t.termino = l.term?.es;
  if (!t.definicion) t.definicion = l.means?.es; else if (l.means?.es && l.means.es !== t.definicion) t.verify = l.means.es;
  if (!t.ejemplo) t.ejemplo = l.example?.es;
  if (!t.noIndica) t.noIndica = l.doesNotConclude?.es;
}
for (const t of glos.terminos) if (!t.termino || !t.definicion) throw new Error(`término sin texto: ${t.id}`);

// ---------- utilidades ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fecha = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : "Dato no disponible"; };
const alt = (n) => `Ilustración de ORVUPI: ${CAT.get(n)?.title_es || "ilustración"}`;
const img = (n, kind = "w") => `/assets/academy/img/${n}-${kind}.webp`;
const SIZES = { w: [768, 432], s: [228, 128], q: [480, 480] };
const picture = (n, kind, cls = "", lazy = true) => { const [w, h] = SIZES[kind]; return `<img${cls ? ` class="${cls}"` : ""} src="${img(n, kind)}" width="${w}" height="${h}" alt="${esc(alt(n))}"${lazy ? ` loading="lazy" decoding="async"` : ""}>`; };
const lvClass = (n) => (/^princ/i.test(n) ? "lv-p" : "lv-i");
function seeded(arr, seed) { // barajado estable: el orden de la página no revela la respuesta
  let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const a = arr.map((x, i) => [x, i]);
  for (let i = a.length - 1; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.every(([, i], k) => i === k) && a.length > 1) a.push(a.shift());
  return a.map(([x]) => x);
}
function write(rel, html) { const f = join(OUT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); }

// ---------- contenido ----------
function frontMatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
  if (!m) throw new Error("sin front matter");
  const data = {}; let key = null;
  for (const line of m[1].split("\n")) {
    const li = /^- (.*)$/.exec(line);
    if (li && key) { (data[key] ||= []).push(li[1].trim()); continue; }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) { key = kv[1]; data[key] = kv[2] === "" ? [] : kv[2].trim(); }
  }
  return { data, body: m[2] };
}
const TERM = new Map(glos.terminos.map((t) => [t.id, t]));
const units = cur.unidades.map((u) => {
  const { data, body } = frontMatter(readFileSync(join(CONTENT, "unidades", `${u.id}.md`), "utf8"));
  const mod = cur.modulos.find((m) => m.unidades.includes(u.id));
  const terminos = (data.terminos || "").split(",").map((s) => s.trim()).filter(Boolean);
  const fuentes = (data.fuentes || []).map((f) => { const i = f.lastIndexOf(" | "); return { texto: f.slice(0, i), url: f.slice(i + 3) }; });
  const lab = (data.laboratorio || "").split(",").map((s) => s.trim()).filter(Boolean);
  return { ...u, titulo: data.titulo, resumen: data.resumen, nivel: data.nivel, terminos, claves: data.claves || [], fuentes, lab, body, mod };
});
const UNIT = new Map(units.map((u) => [u.id, u]));
const ORDER = cur.modulos.flatMap((m) => m.unidades);
const artUrl = (u) => `${BASE}articulos/${u.slug}/`;
// «holder» es término del sector: su página usa el slug termino-holder, igual que la web.
const termSlug = (id) => (id === "holder" ? "termino-holder" : id);
const termUrl = (id) => `${BASE}glosario/${termSlug(id)}/`;
const modUrl = (m) => `${BASE}rutas/${cur.ruta.slug}/${m.slug}/`;
const pracUrl = (p) => `${BASE}practicas/${p.slug}/`;

function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, text) => {
    if (UNIT.has(id)) return `<a href="${artUrl(UNIT.get(id))}">${text}</a>`;
    if (!TERM.has(id)) throw new Error(`término desconocido: ${id}`);
    return `<a class="term" href="${termUrl(id)}">${text}</a>`;
  });
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}" rel="noopener noreferrer">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out;
}
function markdown(md) {
  const lines = md.replace(/\r/g, "").split("\n"); const html = []; const toc = []; let i = 0; const used = new Set();
  const hid = (t) => { let id = slugify(t) || "seccion"; let k = id, n = 2; while (used.has(k)) k = `${id}-${n++}`; used.add(k); return k; };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{2,4}) (.*)$/.exec(line))) {
      const lvl = m[1].length; const id = hid(m[2]);
      if (lvl === 2) toc.push({ id, t: m[2] });
      html.push(`<h${lvl} id="${id}">${inline(m[2])}</h${lvl}>`); i++; continue;
    }
    if (/^\|/.test(line)) {
      const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]); const body = rows.slice(/^\|[\s:|-]+\|$/.test(rows[1] || "") ? 2 : 1);
      html.push(`<div class="ac-tablewrap"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^- /.test(line)) { const it = []; while (i < lines.length && /^- /.test(lines[i])) it.push(lines[i++].slice(2)); html.push(`<ul>${it.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`); continue; }
    if (/^\d+\. /.test(line)) { const it = []; while (i < lines.length && /^\d+\. /.test(lines[i])) it.push(lines[i++].replace(/^\d+\. /, "")); html.push(`<ol>${it.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`); continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(#{2,4} |- |\d+\. |\|)/.test(lines[i])) p.push(lines[i++]);
    html.push(`<p>${inline(p.join(" "))}</p>`);
  }
  return { html: html.join("\n"), toc };
}
const minutes = (u) => Math.max(1, Math.round((u.body + u.claves.join(" ")).split(/\s+/).length / 200));

// ---------- herramientas absorbidas (se leen de sus páginas, que siguen en el repo) ----------
function legacyMain(path) {
  const s = readFileSync(join(WEB, path), "utf8");
  const m = /<main[^>]*>([\s\S]*)<\/main>/.exec(s); if (!m) throw new Error(`sin <main> en ${path}`);
  return m[1].trim();
}
const fixLinks = (h) => h
  .replace(/href="\/aprender\/#(guia-identificar)"/g, `href="${artUrl(UNIT.get("OA-021"))}"`)
  .replace(/href="\/aprender\/#(guia-permisos)"/g, `href="${artUrl(UNIT.get("OA-022"))}"`)
  .replace(/href="\/aprender\/#(guia-liquidez)"/g, `href="${artUrl(UNIT.get("OA-018"))}"`)
  .replace(/href="\/aprender\/#([a-z0-9-]+)"/g, (_, id) => `href="${TERM.has(id) ? termUrl(id) : BASE + "glosario/"}"`)
  .replace(/href="\/aprender\/"/g, `href="${BASE}glosario/"`)
  .replace(/href="\/lab\/(#[^"]*)?"/g, (_, h) => `href="${BASE}practicas/laboratorio/${h || ""}"`)
  .replace(/href="\/pares\/"/g, `href="${BASE}practicas/curva-en-vivo/"`)
  .replace(/href="\/cuaderno\/"/g, `href="${BASE}mi-aprendizaje/cuaderno/"`)
  .replace(/href="\/comparar\/"/g, `href="${artUrl(UNIT.get("OA-018"))}#ejemplo-de-curva"`);
const stripEn = (h) => h.replace(/<span class="lang en" lang="en">[\s\S]*?<\/span>/g, "").replace(/<span class="lang es" lang="es">([\s\S]*?)<\/span>/g, "$1");

// ---------- CSP ----------
const CSP_BASE = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'";
const CSP_CURVA = CSP_BASE.replace("connect-src 'self'", "connect-src 'self' https://solana-rpc.publicnode.com https://api.mainnet-beta.solana.com");
const CSP_CUADERNO = CSP_BASE.replace("connect-src 'self'", "connect-src 'self' https://solana-rpc.publicnode.com https://api.mainnet-beta.solana.com https://mainnet.base.org https://ethereum-rpc.publicnode.com https://bsc-rpc.publicnode.com https://api.dexscreener.com");

// ---------- iconos ----------
const I = {
  home: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  burger: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  art: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="8" y="5" width="24" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M14 13h12M14 19h12M14 25h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  route: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="10" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="30" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M14 30h10a6 6 0 0 0 0-12h-8a6 6 0 0 1 0-12h10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  prac: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M15 5h10M17 5v10L8 31a3 3 0 0 0 2.6 4.5h18.8A3 3 0 0 0 32 31l-9-16V5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 25h16" stroke="currentColor" stroke-width="2.4"/></svg>',
  gloss: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M8 8a3 3 0 0 1 3-3h21v26H11a3 3 0 0 0-3 3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 34a3 3 0 0 1 3-3h21v4H11a3 3 0 0 1-3-1M15 13l3-6 3 6M16 11h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  me: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M6 31 14 19l6 7 5-6 9 11z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="28" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  gh: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.5z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.4-1.5zM8.9 13.4l9.6-6c.5-.3.9-.1.5.2l-8 7.3-.3 3.4z"/></svg>',
  tt: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5.1-2.8-.4-4-1.2v6.4c0 3.8-3.2 6.2-6.4 5.6-3.9-.7-5.3-5.6-2.4-8.3 1.2-1.1 2.8-1.5 4.4-1.2v3.3c-1.4-.4-2.8.4-3 1.7-.3 1.9 1.6 3 3 2.4 1-.4 1.4-1.3 1.4-2.4V3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// ---------- plantilla común ----------
const MENU = [["articulos", "Artículos", "articulos/"], ["rutas", "Rutas", "rutas/"], ["practicas", "Prácticas", "practicas/"], ["glosario", "Glosario", "glosario/"]];
const TOOLS = [["/", "Inicio de ORVUPI"], ["/sonar/", "Sonar"], ["/work/", "Work"], ["/studio/", "Studio"], ["/arqiven/", "ARQIVEN"], ["/tablero/", "Tablero"]];
function header(current) {
  const items = MENU.map(([id, t, h]) => `<li><a href="${BASE}${h}"${id === current ? ' aria-current="page"' : ""}>${t}</a></li>`).join("");
  return `<a class="ac-skip" href="#contenido">Saltar al contenido</a>
<header class="site ac-nav">
<a class="ac-home" href="/" aria-label="Inicio de ORVUPI">${I.home}</a>
<a class="ac-logo" href="${BASE}" aria-label="ORVUPI Academy, portada"><img src="/assets/academy/logo.png" width="36" height="36" alt=""><span>ORVUPI<small>ACADEMY</small></span></a>
<nav aria-label="Secciones de Academy"><ul class="ac-menu">${items}</ul></nav>
<div class="ac-right">
<div class="ac-search" data-ac-search><button type="button" class="ac-icon" aria-expanded="false" aria-controls="ac-buscar" aria-label="Buscar en Academy">${I.search}</button>
<form id="ac-buscar" role="search" action="${BASE}articulos/" data-ac-goto><label class="ac-sr" for="ac-q">Buscar en Academy</label><input id="ac-q" name="q" type="search" placeholder="Buscar artículos y términos" autocomplete="off"><button type="submit" class="ac-btn pink">Buscar</button></form></div>
<a class="ac-btn ghost" href="${BASE}mi-aprendizaje/"${current === "mi" ? ' aria-current="page"' : ""}>Mi aprendizaje</a>
<a class="ac-btn pink" href="${BASE}rutas/${cur.ruta.slug}/">Empezar</a>
<a class="ac-icon wide" href="/" aria-label="Volver a ORVUPI">${I.globe}</a>
<a class="ac-icon ac-burger" href="#ac-menu-movil" role="button" aria-expanded="false" aria-controls="ac-menu-movil" aria-label="Abrir el menú">${I.burger}</a>
</div>
</header>
<div class="ac-veil" data-ac-close></div>
<div class="ac-drawer" id="ac-menu-movil" role="dialog" aria-modal="true" aria-label="Menú de ORVUPI Academy">
<div class="ac-drawer-top"><a class="ac-icon" href="#" data-ac-close role="button" aria-label="Cerrar el menú">${I.close}</a></div>
<a class="ac-btn soft" href="${BASE}mi-aprendizaje/">Mi aprendizaje</a>
<a class="ac-btn pink" href="${BASE}rutas/${cur.ruta.slug}/">Empezar</a>
<nav aria-label="Secciones de Academy (móvil)"><ul><li><a href="${BASE}">Portada</a></li>${items.replace(/ aria-current="page"/g, "")}<li><a href="${BASE}articulos/">Buscar</a></li></ul>
<h2>Herramientas ORVUPI</h2><ul>${TOOLS.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></nav>
</div>`;
}
const PROMO = `<div class="ac-promo"><p style="margin:0">Academia gratuita: sin cuenta, sin wallet y sin pagos.<span class="ac-promo-x"> Tu progreso se guarda en este navegador.</span></p><a class="ac-btn pink" href="${BASE}rutas/${cur.ruta.slug}/">Empieza la ruta</a></div>`.replace(' style="margin:0"', ' class="ac-promo-t"');
function footer() {
  const col = (t, links) => `<div><h3>${t}</h3><ul>${links.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>`;
  return `<footer class="ac-foot"><div class="ac-c"><div class="ac-foot-g">
<div><h3>Comunidad</h3><div class="soc"><a href="https://github.com/ORVUPI/orvupi-agent" rel="noopener noreferrer" aria-label="GitHub de ORVUPI">${I.gh}</a><a href="https://x.com/ORVUPI" rel="noopener noreferrer" aria-label="ORVUPI en X">${I.x}</a><a href="https://t.me/orvupi" rel="noopener noreferrer" aria-label="ORVUPI en Telegram">${I.tg}</a><a href="https://www.tiktok.com/@orvupi" rel="noopener noreferrer" aria-label="ORVUPI en TikTok">${I.tt}</a></div>
<h3>Idioma</h3><ul><li><a href="${BASE}" lang="es">Español</a></li></ul></div>
<div class="ac-foot-cols">
${col("Academy", [[`${BASE}articulos/`, "Artículos"], [`${BASE}rutas/`, "Rutas"], [`${BASE}practicas/`, "Prácticas"], [`${BASE}glosario/`, "Glosario"], [`${BASE}mi-aprendizaje/`, "Mi aprendizaje"], [`${BASE}mi-aprendizaje/cuaderno/`, "Cuaderno"]])}
${col("Herramientas ORVUPI", [["/sonar/", "Sonar"], ["/work/", "Work"], ["/studio/", "Studio"], ["/arqiven/", "ARQIVEN"], ["/tablero/", "Tablero"], [`${BASE}practicas/curva-en-vivo/`, "Curva en vivo"]])}
${col("Acerca de ORVUPI", [["/vision/", "Visión"], ["/novedades/", "Novedades"], ["/methodology/", "Metodología"], ["/marca/", "Marca"], ["/community/", "Comunidad"], ["/contribuir/", "Contribuir"]])}
${col("Legal y seguridad", [["/legal/", "Legal"], ["/security/", "Seguridad"], ["/risks/", "Riesgos"], ["/token/", "Token"]])}
</div></div>
<p class="legal">ORVUPI Academy · contenido educativo propio, gratuito y sin publicidad. Actualizado el ${fecha(ACT)}. <a href="/risks/">Riesgos</a> · <a href="/legal/">Aviso legal</a></p>
</div></footer>`;
}
function page({ path, title, desc, current, body, promo = false, tool = null, csp = CSP_BASE, scripts = "" }) {
  const canonical = SITE + path;
  return `<!DOCTYPE html>
<html lang="es" data-lang="es" data-locale="es" data-fixed-lang>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="theme-color" content="#ff3070">
<meta property="og:site_name" content="ORVUPI Academy">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<link rel="manifest" href="/academy/manifest.webmanifest">
<link rel="icon" href="/assets/academy/academy.svg" type="image/svg+xml">
<link rel="icon" href="/academy/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/academy/icon-192.png">
${tool ? `<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/orvupi.css">\n` : ""}<link rel="stylesheet" href="/assets/academy/academy.css">
<script src="/assets/shell.js"></script>
<script src="/assets/academy/academy.js" defer></script>${scripts}
</head>
<body class="ac${tool ? " ac-has-tool" : ""}">
${header(current)}
${promo ? PROMO : ""}
${body}
${footer()}
</body>
</html>
`;
}
const crumbs = (items) => `<nav aria-label="Ruta de navegación"><ol class="ac-crumbs">${items.map(([h, t], i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="${h}">${esc(t)}</a>`}</li>`).join("")}</ol></nav>`;
const chips = (u) => `<div class="ac-chips"><span class="ac-chip lv ${lvClass(u.nivel)}">${esc(u.nivel)}</span><span class="ac-chip">${esc(u.mod.titulo)}</span></div>`;
const meta = (u) => `<p class="ac-meta">${fecha(ACT)} · ${I.clock} ${minutes(u)} min <span class="ac-done">· ✓ Leído</span></p>`;
const card = (u) => `<a class="ac-card" href="${artUrl(u)}" data-unit="${u.id}">${picture(u.imagen, "w")}<div class="b">${chips(u)}<h3>${esc(u.titulo)}</h3>${meta(u)}</div></a>`;
const lcard = (u) => `<a class="ac-lcard" href="${artUrl(u)}" data-unit="${u.id}" data-mod="${u.mod.n}" data-nivel="${esc(u.nivel)}" data-orden="${ORDER.indexOf(u.id)}" data-search="${esc((u.titulo + " " + u.resumen + " " + u.terminos.map((t) => TERM.get(t)?.termino || "").join(" ")))}">${picture(u.imagen, "w")}<span class="tags"><span>${esc(u.mod.titulo)}</span></span><span class="b"><h3>${esc(u.titulo)}</h3><span class="foot"><span class="ac-chip ${lvClass(u.nivel)}">${esc(u.nivel)}</span><span>${fecha(ACT)}</span><span>${I.clock} ${minutes(u)} min</span><span class="ac-done">✓ Leído</span></span></span></a>`;

// ---------- actividades ----------
function quizBlock(id, q, heading = "Comprueba lo que has aprendido") {
  const name = `q-${id}`;
  const opts = q.opciones.map((o, i) => `<label class="ac-opt"><input type="radio" name="${name}" value="${i}"${o.correcta ? ' data-ok="1"' : ""} data-porque="${esc(o.porque)}"> <span>${inline(o.texto)}</span></label>`).join("");
  const ok = q.opciones.find((o) => o.correcta);
  return `<section class="ac-box ac-quiz" data-quiz="${id}" aria-labelledby="h-${name}">
<h2 id="h-${name}">${heading}</h2>
<fieldset><legend>${inline(q.pregunta)}</legend>${opts}</fieldset>
<div class="ac-actions ac-js-only"><button type="button" class="ac-btn pink mid" data-check>Comprobar</button></div>
<p class="ac-fb" aria-live="polite"></p>
<details class="ac-sol nojs"><summary>Ver la respuesta</summary><p><strong>Correcta:</strong> ${inline(ok.texto)}. ${inline(ok.porque)}</p><ul>${q.opciones.filter((o) => !o.correcta).map((o) => `<li>${inline(o.texto)}: ${inline(o.porque)}</li>`).join("")}</ul></details>
</section>`;
}
function activityBlock(id, a, heading = "Practica") {
  const items = seeded(a.items, id);
  const sel = (k) => `<select aria-label="Clasifica: ${esc(items[k].texto)}" data-ok="${esc(items[k].categoria)}"><option value="">Elige…</option>${a.categorias.map((c) => `<option>${esc(c)}</option>`).join("")}</select>`;
  return `<section class="ac-box ac-activity" data-activity="${id}" aria-labelledby="h-a-${id}">
<h2 id="h-a-${id}">${heading}</h2>
<p>${inline(a.enunciado)}</p>
<ul class="ac-items">${items.map((it, k) => `<li><span>${inline(it.texto)}</span>${sel(k)}<span class="why" hidden>${inline(it.porque)}</span></li>`).join("")}</ul>
<div class="ac-actions ac-js-only"><button type="button" class="ac-btn pink mid" data-check>Comprobar</button></div>
<p class="ac-fb" aria-live="polite"></p>
<details class="ac-sol nojs"><summary>Ver la solución</summary><div class="ac-tablewrap"><table><thead><tr><th scope="col">Elemento</th><th scope="col">${a.tipo === "ordenar" ? "Orden" : "Respuesta"}</th><th scope="col">Por qué</th></tr></thead><tbody>${(a.tipo === "ordenar" ? a.items : items).map((it) => `<tr><td>${inline(it.texto)}</td><td>${esc(it.categoria)}</td><td>${inline(it.porque)}</td></tr>`).join("")}</tbody></table></div></details>
</section>`;
}

// ---------- páginas ----------
const pages = [];
const add = (rel, opts) => pages.push([rel, page(opts)]);
const P = cur.practicas;
const route = cur.ruta;

// Portada
{
  const d = UNIT.get(cur.portada.destacado);
  const tiles = [["articulos/", I.art, "Artículos"], ["rutas/", I.route, "Rutas"], ["practicas/", I.prac, "Prácticas"], ["glosario/", I.gloss, "Glosario"], ["mi-aprendizaje/", I.me, "Mi aprendizaje"]];
  const secciones = cur.portada.secciones.map((s) => { const m = cur.modulos.find((x) => x.n === s.modulo); return `<section class="ac-sec ac-c" aria-labelledby="s-${m.slug}"><div class="ac-sec-h"><h2 id="s-${m.slug}">${esc(s.titulo)}</h2><a href="${modUrl(m)}">Ver todo ›</a></div><div class="ac-grid3">${m.unidades.slice(0, 3).map((id) => card(UNIT.get(id))).join("")}</div></section>`; }).join("\n");
  const nuevos = `<section class="ac-sec ac-c" aria-labelledby="s-ult"><div class="ac-sec-h"><h2 id="s-ult">Prácticas</h2><a href="${BASE}practicas/">Ver todo ›</a></div><div class="ac-grid3">${P.slice(0, 3).map((p) => `<a class="ac-card" href="${pracUrl(p)}" data-practica="${p.id}">${picture(p.imagen, "w")}<div class="b"><div class="ac-chips"><span class="ac-chip ${lvClass(p.nivel)}">${esc(p.nivel)}</span><span class="ac-chip">Práctica</span></div><h3>${esc(p.titulo.replace(/^Práctica: /, ""))}</h3><p class="ac-meta">${esc(p.resumen)}</p></div></a>`).join("")}</div></section>`;
  const t1 = TERM.get("frase-de-recuperacion") || glos.terminos[0]; const t2 = TERM.get("permiso") || glos.terminos[1];
  const gl = (t) => `<a href="${termUrl(t.id)}"><span class="q" aria-hidden="true">“</span><h3>${esc(t.termino)}</h3><p>${esc(t.definicion)}</p><span class="ac-btn">Leer la definición</span></a>`;
  const body = `<main id="contenido">
<section class="ac-hero"><div class="ac-c"><div class="ac-hero-g">
<div class="ac-hero-t"><h1>ORVUPI Academy</h1><p>Aprende cripto con calma, gratis y en español</p><p class="sub">${units.length} artículos, ${cur.modulos.length} módulos, ${P.length} prácticas y ${glos.terminos.length} términos. Sin cuenta, sin wallet y sin pagos.</p></div>
<a class="ac-feat" href="${artUrl(d)}">${picture(d.imagen, "w", "", false)}<span class="in"><span class="badge">Destacado</span><h2>${esc(d.titulo)}</h2><span class="meta">${I.clock} ${minutes(d)} min · ${esc(d.nivel)}</span></span></a>
</div></div></section>
<div class="ac-c"><nav class="ac-tiles" aria-label="Accesos rápidos">${tiles.map(([h, ic, t]) => `<a class="ac-tile" href="${BASE}${h}">${ic}<span>${t}</span></a>`).join("")}</nav>
<h2 class="ac-sug-h">Sugerido</h2>
<div class="ac-sug">${cur.portada.sugeridos.map((id) => { const u = UNIT.get(id); return `<a href="${artUrl(u)}" data-unit="${u.id}">${picture(u.imagen, "s")}<span>${esc(u.titulo)}</span></a>`; }).join("")}</div>
<section class="ac-track" aria-labelledby="s-ruta">${picture(route.imagen, "w")}<div><h2 id="s-ruta">${esc(route.titulo)}</h2><p>${esc(route.resumen)}</p><a class="ac-btn pink mid" href="${BASE}rutas/${route.slug}/">Empezar la ruta</a></div></section>
</div>
${secciones}
${nuevos}
<section class="ac-sec ac-c" aria-labelledby="s-glo"><div class="ac-sec-h"><h2 id="s-glo">Glosario</h2><a href="${BASE}glosario/">Ver todo ›</a></div>
<div class="ac-gl"><div><p class="num">${glos.terminos.length}</p><p>términos explicados con un ejemplo y lo que no indican.</p><form action="${BASE}glosario/" role="search" data-ac-goto><label class="ac-sr" for="g-q">Buscar en el glosario</label>${I.search}<input id="g-q" name="q" type="search" placeholder="Buscar un término"></form></div>${gl(t1)}${gl(t2)}</div></section>
<section class="ac-cta"><h2>Tu progreso es tuyo y se queda en tu navegador</h2><a class="ac-btn pink big" href="${BASE}mi-aprendizaje/">Ver mi aprendizaje</a>${picture(1, "q")}</section>
</main>`;
  add("index.html", { path: BASE, title: "ORVUPI Academy · aprende cripto gratis", desc: "Academia gratuita de ORVUPI: artículos, rutas, prácticas y glosario cripto en español. Sin cuenta, sin wallet y sin pagos.", current: "home", promo: true, body });
}

// Artículos (lista)
{
  const mods = cur.modulos.map((m) => `<option value="${m.n}">${m.n}. ${esc(m.titulo)}</option>`).join("");
  const body = `<main id="contenido">
<div class="ac-head"><div class="ac-c-n"><h1>Artículos de ORVUPI Academy</h1><p>${units.length} artículos originales en ${cur.modulos.length} módulos.</p></div></div>
<div class="ac-filters"><div class="ac-c-n"><form data-ac-filter role="search" aria-label="Filtrar artículos">
<label for="f-q">Buscar</label><input id="f-q" name="q" type="search" placeholder="Palabra o término">
<label for="f-m">Módulo</label><select id="f-m" name="modulo"><option value="">Todos</option>${mods}</select>
<label for="f-n">Nivel</label><select id="f-n" name="nivel"><option value="">Todos</option><option>Principiante</option><option>Intermedio</option></select>
<button type="reset" class="ac-btn ghost">Limpiar filtros</button>
</form></div></div>
<div class="ac-c-n"><div class="ac-list-h"><h2 id="art-n" aria-live="polite">Artículos (${units.length})</h2><div class="ac-sort"><label class="ac-sr" for="f-o">Ordenar</label><select id="f-o" data-ac-sort><option value="ruta">Orden de la ruta</option><option value="az">De la A a la Z</option></select></div></div>
<div class="ac-grid-l" data-ac-list>${ORDER.map((id) => lcard(UNIT.get(id))).join("")}</div>
<p class="ac-empty" hidden data-ac-none>Ningún artículo coincide. Prueba con otra palabra o <a href="${BASE}glosario/">busca en el glosario</a>.</p>
</div></main>`;
  add("articulos/index.html", { path: `${BASE}articulos/`, title: "Artículos · ORVUPI Academy", desc: "Todos los artículos de ORVUPI Academy: fundamentos, redes, seguridad, transacciones, DeFi y lectura de datos.", current: "articulos", promo: true, body });
}

// Artículo
const caso = stripEn(legacyMain("comparar/index.html")).replace(/<h1>/g, "<h3>").replace(/<\/h1>/g, "</h3>").replace(/<h2>/g, "<h4>").replace(/<\/h2>/g, "</h4>").replace(/<p class="lede">/g, "<p>");
const LAB_TXT = { "mision-01": ["Misión 1 del laboratorio", "#mision-titulo"], "leccion-permisos": ["Lección: permisos de un token", "#lecciones"], "leccion-reparto": ["Lección: reparto de la oferta", "#lecciones"], "leccion-huecos": ["Lección: datos que faltan", "#lecciones"] };
for (const u of units) {
  const k = ORDER.indexOf(u.id); const prev = UNIT.get(ORDER[k - 1]); const next = UNIT.get(ORDER[k + 1]);
  const { html, toc } = markdown(u.body);
  const extra = [];
  if (u.lab.includes("caso-curva")) { extra.push(`<section class="ac-box" id="ejemplo-de-curva" aria-labelledby="h-caso"><h2 id="h-caso">Ejemplo de curva</h2>${caso}<p><a class="ac-btn pink mid" href="${BASE}practicas/curva-en-vivo/">Abrir la curva en vivo</a></p></section>`); toc.push({ id: "ejemplo-de-curva", t: "Ejemplo de curva" }); }
  const labs = u.lab.filter((l) => LAB_TXT[l]);
  if (labs.length) { extra.push(`<section class="ac-box" id="laboratorio" aria-labelledby="h-lab"><h2 id="h-lab">Practica en el laboratorio</h2><p>El laboratorio usa fichas reales guardadas y fechadas. No lee la cadena ni conecta wallets. Tu avance del laboratorio se conserva.</p><ul>${labs.map((l) => `<li><a href="${BASE}practicas/laboratorio/${LAB_TXT[l][1]}">${LAB_TXT[l][0]}</a></li>`).join("")}</ul></section>`); toc.push({ id: "laboratorio", t: "Laboratorio" }); }
  const q = preg.unidades[u.id]; const a = preg.actividades[u.id];
  const prac = P.find((p) => p.unidad === u.id);
  const blocks = [
    q ? quizBlock(u.id, q) : "",
    a ? activityBlock(u.id, a) : "",
    prac ? `<section class="ac-box"><h2>Práctica relacionada</h2><p>${esc(prac.resumen)}</p><a class="ac-btn pink mid" href="${pracUrl(prac)}">${esc(prac.titulo)}</a></section>` : "",
  ].join("\n");
  if (q) toc.push({ id: `h-q-${u.id}`, t: "Pregunta" });
  const notes = `<section class="ac-box ac-notes" aria-labelledby="h-notas-${u.id}"><h2 id="h-notas-${u.id}">Tus notas</h2><p class="ac-nojs">Las notas necesitan JavaScript. Se guardan solo en este navegador.</p><div class="ac-js-only"><label class="ac-sr" for="notas-${u.id}">Notas sobre ${esc(u.titulo)}</label><textarea id="notas-${u.id}" data-notes="${u.id}" maxlength="4000" placeholder="Escribe lo que quieras recordar. Se guarda en este navegador."></textarea><div class="ac-actions"><button type="button" class="ac-btn pink mid" data-read="${u.id}">Marcar como leído</button><a class="ac-btn soft mid" href="${BASE}mi-aprendizaje/">Ver mi aprendizaje</a></div><p class="ac-status" aria-live="polite" data-status></p></div></section>`;
  toc.push({ id: `h-notas-${u.id}`, t: "Tus notas" }, { id: "fuentes", t: "Fuentes" });
  const fuentes = `<section class="ac-fuentes"><h2 id="fuentes">Fuentes</h2><ol>${u.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="noopener noreferrer">${esc(f.texto)}</a></li>`).join("")}</ol><p>Términos: ${u.terminos.map((t) => `<a class="term" href="${termUrl(t)}">${esc(TERM.get(t).termino)}</a>`).join(", ")}.</p></section>`;
  const related = u.mod.unidades.filter((x) => x !== u.id).slice(0, 3).map((x) => { const r = UNIT.get(x); return `<a href="${artUrl(r)}">${picture(r.imagen, "s")}${esc(r.titulo)}</a>`; }).join("");
  const url = SITE + artUrl(u);
  const body = `<main id="contenido"><div class="ac-art-g"><div class="ac-art-main">
<div class="tags"><span>Módulo ${u.mod.n}</span><span>${esc(u.mod.titulo)}</span></div>
${picture(u.imagen, "w", "ac-art-img", false)}
${crumbs([[BASE, "Inicio"], [`${BASE}articulos/`, "Artículos"], ["", u.titulo]])}
<h1>${esc(u.titulo)}</h1>
<div class="ac-art-meta"><span class="ac-level ${lvClass(u.nivel)}">${esc(u.nivel)}</span><span>Actualizado ${fecha(ACT)}</span><span>${I.clock} ${minutes(u)} min</span><span class="ac-done" data-unit-done="${u.id}">✓ Leído</span></div>
<article class="ac-article" data-article="${u.id}">
<section class="claves"><h2 id="aspectos-clave">Aspectos clave</h2><ul>${u.claves.map((c) => `<li>${inline(c)}</li>`).join("")}</ul></section>
${html}
${extra.join("\n")}
${blocks}
${notes}
${fuentes}
</article>
<nav class="ac-pager" aria-label="Artículos de la ruta">${prev ? `<a href="${artUrl(prev)}"><small>‹ Anterior</small>${esc(prev.titulo)}</a>` : ""}${next ? `<a class="next" href="${artUrl(next)}"><small>Siguiente ›</small>${esc(next.titulo)}</a>` : `<a class="next" href="${modUrl(u.mod)}#evaluacion"><small>Siguiente ›</small>Evaluación del módulo ${u.mod.n}</a>`}</nav>
</div>
<aside class="ac-side" aria-label="Más sobre este artículo">
<div><h2>Compartir</h2><div class="ac-share"><a href="https://x.com/intent/post?url=${encodeURIComponent(url)}&amp;text=${encodeURIComponent(u.titulo)}" rel="noopener noreferrer" aria-label="Compartir en X">${I.x}</a><a href="https://t.me/share/url?url=${encodeURIComponent(url)}&amp;text=${encodeURIComponent(u.titulo)}" rel="noopener noreferrer" aria-label="Compartir en Telegram">${I.tg}</a><button type="button" class="ac-js-only" data-copy="${url}" aria-label="Copiar el enlace">${I.link}</button></div></div>
<nav class="ac-toc" aria-label="En este artículo"><h2>En este artículo</h2><ol>${[{ id: "aspectos-clave", t: "Aspectos clave" }, ...toc].map((t) => `<li><a href="#${t.id}">${esc(t.t)}</a></li>`).join("")}</ol></nav>
<div><h2>Artículos relacionados</h2><div class="ac-rel">${related}</div></div>
</aside></div></main>`;
  add(`articulos/${u.slug}/index.html`, { path: artUrl(u), title: `${u.titulo} · ORVUPI Academy`, desc: u.resumen, current: "articulos", promo: true, body });
}

// Rutas
{
  const mins = units.reduce((s, u) => s + minutes(u), 0);
  const body = `<main id="contenido"><div class="ac-head ac-head-xl"><div class="ac-c-n"><div><h1>Rutas de aprendizaje</h1><p>Itinerarios ordenados con evaluación por módulo.</p></div><img src="/assets/academy/img/1-q.webp" width="320" height="320" alt="Ilustración de ORVUPI: el pulpo rosa con su rizo"></div></div>
<div class="ac-c-n"><div class="ac-list-h"><h2>Rutas (1)</h2></div><div class="ac-grid-l"><a class="ac-lcard" href="${BASE}rutas/${route.slug}/">${picture(route.imagen, "w")}<span class="b"><h3>${esc(route.titulo)}</h3><span>${esc(route.resumen)}</span><span class="foot"><span class="ac-chip ${lvClass(route.nivel)}">${esc(route.nivel)}</span><span>${cur.modulos.length} módulos</span><span>${I.clock} ${Math.floor(mins / 60)} h ${mins % 60} min</span></span></span></a></div></div></main>`;
  add("rutas/index.html", { path: `${BASE}rutas/`, title: "Rutas · ORVUPI Academy", desc: "Rutas de aprendizaje de ORVUPI Academy.", current: "rutas", promo: true, body });
  const rows = cur.modulos.map((m) => `<div class="ac-row" data-modulo="${m.n}"><span class="ck" aria-hidden="true">✓</span><details><summary><strong>${m.n}. ${esc(m.titulo)}</strong><span>${m.unidades.length} artículos · 6 preguntas</span></summary><p>${esc(m.resumen)}</p><ol>${m.unidades.map((id) => `<li><a href="${artUrl(UNIT.get(id))}" data-unit="${id}">${esc(UNIT.get(id).titulo)} <span class="ac-done">✓</span></a></li>`).join("")}<li><a href="${modUrl(m)}#evaluacion">Evaluación del módulo ${m.n}</a></li></ol></details></div>`).join("");
  const body2 = `<main id="contenido"><section class="ac-th"><div class="ac-c"><div class="ac-th-g"><div>
<p class="brand"><img src="/assets/academy/logo.png" width="28" height="28" alt="">ORVUPI ACADEMY</p>
${crumbs([[BASE, "Inicio"], [`${BASE}rutas/`, "Rutas"], ["", route.titulo]])}
<h1>${esc(route.titulo)}</h1><p>${esc(route.resumen)}</p>
<dl><div><dt>Nivel</dt><dd>${esc(route.nivel)}</dd></div><div><dt>Tiempo estimado</dt><dd>${Math.floor(mins / 60)} h ${mins % 60} min</dd></div><div><dt>Módulos superados</dt><dd data-ac-mods>Dato no disponible</dd></div></dl>
<a class="ac-btn pink" href="${artUrl(UNIT.get(ORDER[0]))}" data-ac-continue>Empezar la ruta</a></div>
${picture(route.imagen, "q", "art", false).replace(`${route.imagen}-q.webp`, `${cur.cuadradas.includes(route.imagen) ? route.imagen + "-q" : route.imagen + "-w"}.webp`)}
</div></div></section>
<div class="ac-c"><section class="ac-tdesc"><h2>Descripción general</h2><h3>Más sobre esta ruta</h3>${route.descripcion.map((p) => `<p>${inline(p)}</p>`).join("")}<h3>Lo que vas a aprender</h3><ul>${route.aprenderas.map((p) => `<li>${inline(p)}</li>`).join("")}</ul>
<h3>Constancia de progreso</h3><p>No emitimos certificados ni pedimos registro. Tu avance se guarda en este navegador y puedes exportarlo como archivo desde <a href="${BASE}mi-aprendizaje/">Mi aprendizaje</a>.</p></section>
<section class="ac-prog"><h2>Programa</h2><p class="n">${cur.modulos.length} módulos</p>${rows}
<div class="ac-row cert"><span class="ck" aria-hidden="true">★</span><details open><summary><strong>Mi aprendizaje</strong><a class="ac-btn pink" href="${BASE}mi-aprendizaje/">Ver mi progreso</a></summary></details></div></section></div></main>`;
  add(`rutas/${route.slug}/index.html`, { path: `${BASE}rutas/${route.slug}/`, title: `${route.titulo} · ORVUPI Academy`, desc: route.resumen, current: "rutas", body: body2 });
  for (const m of cur.modulos) {
    const qs = preg.modulos[String(m.n)];
    const eva = `<section class="ac-box ac-exam" id="evaluacion" data-exam="M${m.n}" data-pass="${preg.aprobado_modulo}" aria-labelledby="h-eva"><h2 id="h-eva">Evaluación del módulo ${m.n}</h2><p>${qs.length} preguntas. Se supera con ${preg.aprobado_modulo} aciertos. Puedes repetirla.</p>
${qs.map((q, i) => `<fieldset class="ac-quiz-q"><legend>${i + 1}. ${inline(q.pregunta)}</legend>${q.opciones.map((o, j) => `<label class="ac-opt"><input type="radio" name="m${m.n}-${i}" value="${j}"${o.correcta ? ' data-ok="1"' : ""} data-porque="${esc(o.porque)}"> <span>${inline(o.texto)}</span></label>`).join("")}<p class="ac-fb" aria-live="polite"></p></fieldset>`).join("")}
<div class="ac-actions ac-js-only"><button type="button" class="ac-btn pink mid" data-check>Corregir</button></div><p class="ac-fb" data-total aria-live="polite"></p>
<details class="ac-sol nojs"><summary>Ver las respuestas</summary><ol>${qs.map((q) => { const ok = q.opciones.find((o) => o.correcta); return `<li>${inline(ok.texto)}. ${inline(ok.porque)}</li>`; }).join("")}</ol></details></section>`;
    const body3 = `<main id="contenido"><div class="ac-head"><div class="ac-c-n">${crumbs([[BASE, "Inicio"], [`${BASE}rutas/${route.slug}/`, route.titulo], ["", `Módulo ${m.n}`]])}<h1>Módulo ${m.n}. ${esc(m.titulo)}</h1><p>${esc(m.resumen)}</p></div></div>
<div class="ac-c-n"><div class="ac-list-h"><h2>Artículos (${m.unidades.length})</h2></div><div class="ac-grid-l">${m.unidades.map((id) => lcard(UNIT.get(id))).join("")}</div>
<div class="ac-quizwrap ac-quiz">${eva}</div>
<nav class="ac-pager" aria-label="Módulos">${m.n > 1 ? `<a href="${modUrl(cur.modulos[m.n - 2])}"><small>‹ Anterior</small>Módulo ${m.n - 1}</a>` : ""}${m.n < cur.modulos.length ? `<a class="next" href="${modUrl(cur.modulos[m.n])}"><small>Siguiente ›</small>Módulo ${m.n + 1}</a>` : `<a class="next" href="${BASE}mi-aprendizaje/"><small>Fin de la ruta ›</small>Mi aprendizaje</a>`}</nav></div></main>`;
    add(`rutas/${route.slug}/${m.slug}/index.html`, { path: modUrl(m), title: `Módulo ${m.n}: ${m.titulo} · ORVUPI Academy`, desc: m.resumen, current: "rutas", body: body3 });
  }
}

// Glosario
{
  const sorted = [...glos.terminos].sort((a, b) => a.termino.localeCompare(b.termino, "es"));
  const letter = (t) => t.termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0].toUpperCase().replace(/[^A-Z]/, "#");
  const groups = new Map(); for (const t of sorted) { const l = letter(t); if (!groups.has(l)) groups.set(l, []); groups.get(l).push(t); }
  const ALPHA = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const body = `<main id="contenido"><section class="ac-gh"><div class="ac-c-n"><div class="ac-gh-g"><div><h1>Glosario cripto</h1><p>${glos.terminos.length} términos, con un ejemplo y lo que no indican.</p></div>${picture(231, "q", "", false)}</div></div></section>
<div class="ac-letters"><div class="ac-c-n"><div class="in"><div><label class="ac-sr" for="gl-q">Buscar términos</label><input id="gl-q" type="search" placeholder="Buscar términos…" data-ac-gfilter></div><nav aria-label="Letras">${ALPHA.map((l) => groups.has(l) ? `<a href="#letra-${l === "#" ? "otros" : l}">${l}</a>` : `<span aria-hidden="true">${l}</span>`).join("")}</nav></div></div></div>
<div class="ac-c-n ac-terms" data-ac-glist data-legacy="${esc(JSON.stringify({ "guia-identificar": artUrl(UNIT.get("OA-021")), "guia-permisos": artUrl(UNIT.get("OA-022")), "guia-liquidez": artUrl(UNIT.get("OA-018")) }))}">${[...groups].map(([l, ts]) => `<div class="ac-tl" id="letra-${l === "#" ? "otros" : l}"><div class="l" aria-hidden="true">${l}</div><div>${ts.map((t) => `<section id="${t.id}" data-term="${esc(t.termino + " " + t.definicion)}"><h2><a href="${termUrl(t.id)}">${esc(t.termino)}</a></h2><p>${esc(t.definicion)}</p></section>`).join("")}</div></div>`).join("")}
<p class="ac-empty" hidden data-ac-none>Ningún término coincide.</p></div></main>`;
  add("glosario/index.html", { path: `${BASE}glosario/`, title: "Glosario · ORVUPI Academy", desc: `Glosario cripto de ORVUPI Academy: ${glos.terminos.length} términos explicados.`, current: "glosario", body });
  for (const t of glos.terminos) {
    const usedIn = units.filter((u) => u.terminos.includes(t.id) || u.body.includes(`[[${t.id}|`));
    const same = glos.terminos.filter((x) => x.tema === t.tema && x.id !== t.id).slice(0, 3);
    const body2 = `<main id="contenido" class="ac-term"><div class="ac-term-g"><div>
${crumbs([[BASE, "Inicio"], [`${BASE}glosario/`, "Glosario"], ["", t.termino]])}
<h1>${esc(t.termino)}</h1><p><span class="ac-level ${lvClass(t.nivel)}">${esc(t.nivel)}</span></p>
<div class="body"><p>${inline(t.definicion)}</p>${t.verify ? `<h2>En las fichas de Verify</h2><p>${inline(t.verify)}</p>` : ""}<h2>Ejemplo</h2><p>${inline(t.ejemplo || "Dato no disponible")}</p><h2>Lo que no indica</h2><p>${inline(t.noIndica || "Dato no disponible")}</p>
${usedIn.length ? `<h2>Aparece en</h2><ul>${usedIn.map((u) => `<li><a href="${artUrl(u)}">${esc(u.titulo)}</a></li>`).join("")}</ul>` : ""}</div></div>
<aside class="ac-tcards" aria-label="Términos relacionados">${same.map((x) => `<a href="${termUrl(x.id)}"><strong>${esc(x.termino)}</strong><span>${esc(x.definicion)}</span></a>`).join("")}</aside></div></main>`;
    add(`glosario/${termSlug(t.id)}/index.html`, { path: termUrl(t.id), title: `${t.termino} · Glosario · ORVUPI Academy`, desc: t.definicion, current: "glosario", body: body2 });
  }
}

// Prácticas
{
  const tcard = (href, n, t, r, chip, data = "") => `<a class="ac-lcard" href="${href}"${data}>${picture(n, "w")}<span class="b"><h3>${esc(t)}</h3><span>${esc(r)}</span><span class="foot"><span class="ac-chip">${chip}</span><span class="ac-done">✓ Hecha</span></span></span></a>`;
  const body = `<main id="contenido"><div class="ac-head"><div class="ac-c-n"><h1>Prácticas</h1><p>Ejercicios con casos inventados, el laboratorio con fichas reales fechadas y las herramientas de lectura.</p></div></div>
<div class="ac-c-n"><div class="ac-list-h"><h2>Ejercicios (${P.length})</h2></div><div class="ac-grid-l">${P.map((p) => tcard(pracUrl(p), p.imagen, p.titulo.replace(/^Práctica: /, ""), p.resumen, esc(p.nivel), ` data-practica="${p.id}"`)).join("")}</div>
<div class="ac-list-h"><h2>Laboratorio y herramientas</h2></div><div class="ac-grid-l">
${tcard(`${BASE}practicas/laboratorio/`, 187, "Laboratorio: misión y lecciones", "Identificar un token, leer sus permisos y su reparto con fichas reales guardadas. Conserva tu avance del antiguo Lab.", "Laboratorio")}
${cur.herramientas.map((h) => tcard(h.id === "cuaderno" ? `${BASE}mi-aprendizaje/cuaderno/` : `${BASE}practicas/${h.slug}/`, h.imagen, h.titulo, h.resumen, "Herramienta")).join("")}
</div></div></main>`;
  add("practicas/index.html", { path: `${BASE}practicas/`, title: "Prácticas · ORVUPI Academy", desc: "Prácticas de ORVUPI Academy: ejercicios, laboratorio y herramientas de lectura.", current: "practicas", promo: true, body });
  for (const p of P) {
    const d = preg.practicas[p.id]; const u = UNIT.get(p.unidad);
    const body2 = `<main id="contenido"><div class="ac-art-g"><div class="ac-art-main">${picture(p.imagen, "w", "ac-art-img", false)}${crumbs([[BASE, "Inicio"], [`${BASE}practicas/`, "Prácticas"], ["", d.titulo]])}<h1>${esc(p.titulo)}</h1><div class="ac-art-meta"><span class="ac-level ${lvClass(p.nivel)}">${esc(p.nivel)}</span><span class="ac-done" data-prac-done="${p.id}">✓ Hecha</span></div>
<article class="ac-article"><p>${inline(d.enunciado)}</p>${activityBlock(p.id, d.actividad, "Ejercicio")}<p>Repasa la teoría en <a href="${artUrl(u)}">${esc(u.titulo)}</a>.</p></article></div>
<aside class="ac-side" aria-label="Más prácticas"><div><h2>Más prácticas</h2><div class="ac-rel">${P.filter((x) => x.id !== p.id).map((x) => `<a href="${pracUrl(x)}">${picture(x.imagen, "s")}${esc(x.titulo.replace(/^Práctica: /, ""))}</a>`).join("")}</div></div></aside></div></main>`;
    add(`practicas/${p.slug}/index.html`, { path: pracUrl(p), title: `${p.titulo} · ORVUPI Academy`, desc: p.resumen, current: "practicas", promo: true, body: body2 });
  }
  // Laboratorio (antiguo /lab/): se conserva entero, con sus anclas, claves de progreso y misión.
  const lab = fixLinks(legacyMain("lab/index.html"));
  add("practicas/laboratorio/index.html", { path: `${BASE}practicas/laboratorio/`, title: "Laboratorio · ORVUPI Academy", desc: "Laboratorio de ORVUPI Academy: misión y lecciones con fichas reales guardadas.", current: "practicas", tool: "lab", scripts: `\n<script src="/assets/mission.js" defer></script>`,
    body: `<main id="contenido" class="ac-tool"><div class="ac-c-n">${crumbs([[BASE, "Inicio"], [`${BASE}practicas/`, "Prácticas"], ["", "Laboratorio"]])}</div><div class="wrap estrecha ac-lab">${lab}</div></main>` });
  const pares = fixLinks(legacyMain("pares/index.html"));
  add("practicas/curva-en-vivo/index.html", { path: `${BASE}practicas/curva-en-vivo/`, title: "Curva en vivo · ORVUPI Academy", desc: "Lee el estado de la curva de un token de Pump.fun o Raydium LaunchLab, solo cuando lo pides.", current: "practicas", tool: "curva", csp: CSP_CURVA, scripts: `\n<script type="module" src="/assets/pares.mjs"></script>`,
    body: `<main id="contenido" class="ac-tool"><div class="ac-c-n">${crumbs([[BASE, "Inicio"], [`${BASE}practicas/`, "Prácticas"], ["", "Curva en vivo"]])}</div><div class="wrap estrecha ac-lab">${pares}<p><a href="${artUrl(UNIT.get("OA-018"))}">Aprende a leer una curva: ${esc(UNIT.get("OA-018").titulo)}</a></p></div></main>` });
}

// Mi aprendizaje
{
  const body = `<main id="contenido" class="ac-main"><div class="ac-c-n">${crumbs([[BASE, "Inicio"], ["", "Mi aprendizaje"]])}
<h1 class="ac-h1">Mi aprendizaje</h1>
<p>Sin cuenta: tu progreso, tus notas y tu cuaderno se guardan solo en este navegador. Nadie más los ve.</p>
<p class="ac-nojs ac-panel">Esta página necesita JavaScript para leer tu progreso guardado en el navegador. El contenido de Academy se puede leer sin él.</p>
<div class="ac-js-only" data-ac-me>
<div class="ac-stats"><div class="ac-stat"><strong data-k="leidos">0</strong><span>de ${units.length} artículos leídos</span></div><div class="ac-stat"><strong data-k="preguntas">0</strong><span>preguntas acertadas</span></div><div class="ac-stat"><strong data-k="modulos">0</strong><span>de ${cur.modulos.length} módulos superados</span></div><div class="ac-stat"><strong data-k="practicas">0</strong><span>de ${P.length} prácticas hechas</span></div></div>
<section class="ac-panel"><h2>Sigue donde lo dejaste</h2><p data-k="siguiente">Dato no disponible</p></section>
<section class="ac-panel"><h2>Tus notas</h2><div data-k="notas"><p>Aún no has escrito notas.</p></div></section>
<section class="ac-panel"><h2>Laboratorio</h2><p data-k="lab">Dato no disponible</p><p><a href="${BASE}practicas/laboratorio/">Abrir el laboratorio</a></p></section>
<section class="ac-panel"><h2>Cuaderno de fichas</h2><p data-k="cuaderno">Dato no disponible</p><p><a class="ac-btn pink mid" href="${BASE}mi-aprendizaje/cuaderno/">Abrir el cuaderno</a></p></section>
<section class="ac-panel"><h2>Copia de seguridad</h2><p>Exporta tu progreso y tus notas a un archivo JSON. Al importar, se suma a lo que ya tienes: no se borra nada.</p><div class="ac-actions"><button type="button" class="ac-btn pink mid" data-export>Exportar progreso</button><label class="ac-btn soft mid" for="ac-import">Importar progreso</label><input id="ac-import" type="file" accept="application/json,.json" class="ac-sr" data-import></div><p class="ac-status" aria-live="polite" data-status></p></section>
</div></div></main>`;
  add("mi-aprendizaje/index.html", { path: `${BASE}mi-aprendizaje/`, title: "Mi aprendizaje · ORVUPI Academy", desc: "Tu progreso en ORVUPI Academy, guardado en este navegador.", current: "mi", body });
  const cuad = fixLinks(legacyMain("cuaderno/index.html"));
  add("mi-aprendizaje/cuaderno/index.html", { path: `${BASE}mi-aprendizaje/cuaderno/`, title: "Cuaderno · ORVUPI Academy", desc: "Cuaderno de fichas de ORVUPI Academy: guarda lecturas y notas en este navegador.", current: "mi", tool: "cuaderno", csp: CSP_CUADERNO, scripts: `\n<script type="module" src="/assets/redes.mjs"></script>\n<script type="module" src="/assets/cuaderno.js"></script>`,
    body: `<main id="contenido" class="ac-tool"><div class="ac-c-n">${crumbs([[BASE, "Inicio"], [`${BASE}mi-aprendizaje/`, "Mi aprendizaje"], ["", "Cuaderno"]])}</div><div class="wrap ac-lab">${cuad}</div></main>` });
}

// Datos para academy.js (sin scripts en línea: JSON aparte)
const data = { version: 1, unidades: ORDER.map((id) => { const u = UNIT.get(id); return { id, t: u.titulo, u: artUrl(u), m: u.mod.n }; }), modulos: cur.modulos.map((m) => ({ n: m.n, t: m.titulo, u: modUrl(m) })), practicas: P.map((p) => ({ id: p.id, t: p.titulo, u: pracUrl(p) })), glosario: glos.terminos.map((t) => ({ id: t.id, t: t.termino })) };

// ---------- escritura ----------
for (const d of ["articulos", "rutas", "glosario", "practicas", "mi-aprendizaje"]) rmSync(join(OUT, d), { recursive: true, force: true });
for (const [rel, html] of pages) {
  if (/<script>(?!\s*<\/script>)|<script(?![^>]*\b(src|type="application\/json")=)[^>]*>|\son[a-z]+="|style="/.test(html)) throw new Error(`HTML con script o estilo en línea: ${rel}`);
  write(rel, html);
}
writeFileSync(join(OUT, "datos.json"), JSON.stringify(data));
console.log(`ORVUPI Academy: ${pages.length} páginas en web/v2/academy/`);

// Versiona academy.css/academy.js y el resto de /assets/ referenciados (?v=<hash>).
execFileSync(process.execPath, [join(WEB, "tools/asset-versions.mjs")], { stdio: "inherit" });
