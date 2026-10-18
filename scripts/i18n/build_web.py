"""Genera las versiones /en/, /pt-br/, /ja/ y /ko/ de web/v2 y prepara las páginas en español (raíz).

- Raíz (/): español, tal como estaba; las URL existentes no cambian.
- /en/: inglés, versión internacional (x-default).
- /pt-br/, /ja/, /ko/: traducciones desde el inglés (borrador pendiente de revisión).
Idempotente: se puede ejecutar varias veces. Solo stdlib.
Uso: python3 scripts/i18n/build_web.py
"""
import json, re, pathlib, sys, shutil, datetime
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from htmltools import lang_elements, translate_inner

REPO = pathlib.Path(__file__).resolve().parents[2]
ROOT = REPO / "web/v2"
SITE = "https://orvupi.com"
# Fecha fija para que regenerar sea reproducible (CI compara). Cámbiala al publicar contenido nuevo.
LASTMOD = "2026-10-18"
LOCALES = [("es", "", "Español", "es_ES"), ("en", "en", "English", "en_US"), ("pt-BR", "pt-br", "Português (Brasil)", "pt_BR"),
           ("ja", "ja", "日本語", "ja_JP"), ("ko", "ko", "한국어", "ko_KR")]
PREFIXES = [p for _, p, _, _ in LOCALES if p]
PAGES = sorted(p for p in ROOT.rglob("*.html")
               if p.relative_to(ROOT).parts[0] not in ("work", "content", *PREFIXES))
PAGE_DIRS = sorted({p.relative_to(ROOT).parts[0] for p in PAGES if len(p.relative_to(ROOT).parts) > 1})

def url_path(page):
    rel = page.relative_to(ROOT).as_posix()
    if rel == "index.html": return "/"
    if rel.endswith("/index.html"): return "/" + rel[:-len("index.html")]
    return "/" + rel[:-5]  # 404.html -> /404

def load_catalog(lang):
    f = REPO / "i18n/web" / (lang + ".json")
    return json.load(open(f)) if f.exists() else {"segments": {}, "attrs": {}}

MARK_A, MARK_B = "<!-- i18n:alternates -->", "<!-- /i18n:alternates -->"

def alternates(path):
    out = [MARK_A]
    for code, pre, _, _ in LOCALES:
        out.append('<link rel="alternate" hreflang="%s" href="%s%s">' % (code, SITE, ("/" + pre if pre else "") + path))
    out.append('<link rel="alternate" hreflang="x-default" href="%s/en%s">' % (SITE, path))
    out.append('<link rel="stylesheet" href="/assets/i18n.css">')
    out.append('<script src="/assets/i18n.js" defer></script>')
    out.append(MARK_B)
    return "\n".join(out)

def picker(path, current):
    items = []
    cur_name = next(n for c, _, n, _ in LOCALES if c == current)
    for code, pre, name, _ in LOCALES:
        href = ("/" + pre if pre else "") + path
        cur = ' aria-current="true"' if code == current else ""
        items.append('<li><a href="%s" hreflang="%s" lang="%s" data-lang-link="%s"%s>%s</a></li>' % (href, code, code, code, cur, name))
    return ('<nav class="langpick" aria-label="Language · Idioma · 言語 · 언어"><details><summary>'
            '<span class="langpick-icon" aria-hidden="true">🌐</span> <span lang="%s">%s</span></summary>'
            '<ul>%s</ul></details></nav>') % (current, cur_name, "".join(items))

LANGS_DIV = re.compile(r'<div class="langs"[^>]*>.*?</div>|<nav class="langpick".*?</nav>', re.S)

def common(html, path, locale, prefix):
    html = re.sub(re.escape(MARK_A) + r".*?" + re.escape(MARK_B) + r"\n?", "", html, flags=re.S)
    html = html.replace("</head>", alternates(path) + "\n</head>", 1)
    if LANGS_DIV.search(html):
        html = LANGS_DIV.sub(lambda m: picker(path, locale), html, count=1)
    canon = SITE + ("/" + prefix if prefix else "") + path
    html = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % canon, html)
    html = re.sub(r'(<meta property="og:url" content=")[^"]*(">)', lambda m: m.group(1) + canon + m.group(2), html)
    og = next(o for c, _, _, o in LOCALES if c == locale)
    html = re.sub(r'<meta property="og:locale" content="[^"]*">', '<meta property="og:locale" content="%s">' % og, html)
    html = re.sub(r'<meta property="og:locale:alternate"[^>]*>\n?', "", html)
    return html

def root_page(page):
    html = page.read_text()
    path = url_path(page)
    html = re.sub(r'<html lang="[^"]*"( data-lang="[^"]*")?( data-locale="[^"]*")?( data-fixed-lang)?', '<html lang="es" data-lang="es" data-locale="es" data-fixed-lang', html, count=1)
    page.write_text(common(html, path, "es", ""))

def strip_es(html):
    spans = lang_elements(html, "es")
    for s, oe, cs, ce in reversed(spans):
        html = html[:s] + html[ce:]
    return html

ATTR = re.compile(r'(\s(?:alt|aria-label|placeholder|title)=")([^"]*)(")')
META = re.compile(r'(<meta (?:name="description"|property="og:(?:title|description|image:alt)"|name="twitter:(?:title|description|image:alt)") content=")([^"]*)(")')

def local_page(page, locale, prefix, cat, en_attrs, missing):
    html = page.read_text()
    path = url_path(page)
    segs, attrs = cat["segments"], cat["attrs"]
    def seg(t):
        if locale == "en": return t
        v = segs.get(t)
        if v is None: missing.add(t); return t
        return v
    def attr(v):
        if not re.search(r"[A-Za-zÀ-ÿ]{3,}", v) or v == "ORVUPI" or v.startswith("Language · "): return v
        if " / " in v:  # «Español / English»
            v = v.split(" / ", 1)[1]
            return seg(v)
        if locale == "en":
            r = en_attrs.get(v)
        else:
            r = attrs.get(v)
        if r is None: missing.add(v); return en_attrs.get(v) or v
        return r
    # 1) texto: los elementos .lang.en llevan el idioma de destino; los .lang.es se quitan
    for s, oe, cs, ce in reversed(lang_elements(html, "en")):
        inner = translate_inner(html[oe:cs], seg)
        opening = html[s:oe]
        if locale != "en":
            opening = re.sub(r'\slang="en"', ' lang="%s"' % locale, opening)
        html = html[:s] + opening + inner + html[cs:]
    html = strip_es(html)
    # 2) atributos y metadatos
    html = META.sub(lambda m: m.group(1) + attr(m.group(2)) + m.group(3), html)
    html = ATTR.sub(lambda m: m.group(1) + attr(m.group(2)) + m.group(3), html)
    t = re.search(r'<title([^>]*)>(.*?)</title>', html, re.S)
    if t:
        en_title = re.search(r'data-title-en="([^"]*)"', t.group(1))
        es_title = t.group(2).strip()
        if locale == "en" and es_title in en_attrs: new = en_attrs[es_title]
        elif locale != "en" and es_title in attrs: new = attrs[es_title]
        else: new = seg(en_title.group(1)) if en_title else attr(es_title)
        html = html[:t.start()] + "<title>%s</title>" % new + html[t.end():]
    # 3) idioma del documento: data-lang="en" para que CSS y scripts usen la rama inglesa
    html = re.sub(r'<html lang="[^"]*"[^>]*>', '<html lang="%s" data-lang="en" data-locale="%s" data-fixed-lang>' % (locale, locale), html, count=1)
    # 4) enlaces internos hacia la misma versión
    def relink(m):
        href = m.group(2)
        first = href.lstrip("/").split("/")[0].split("#")[0].split("?")[0]
        if href == "/" or href.startswith("/#") or href.startswith("/?") or first in PAGE_DIRS:
            return m.group(1) + "/" + prefix + href + m.group(3)
        return m.group(0)
    html = re.sub(r'(<a\s[^>]*href=")(/[^"]*)(")', relink, html)
    html = common(html, path, locale, prefix)
    if locale in ("ja", "ko"):
        css = "noto-sans-jp" if locale == "ja" else "noto-sans-kr"
        html = html.replace(MARK_B, '<link rel="stylesheet" href="/fonts/noto/%s.css">\n%s' % (css, MARK_B), 1)
    # el selector apunta a las versiones de cada idioma de esta misma página
    out = ROOT / prefix / page.relative_to(ROOT)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)

def sitemap():
    today = LASTMOD
    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for page in PAGES:
        path = url_path(page)
        if path == "/404": continue
        alts = "".join('<xhtml:link rel="alternate" hreflang="%s" href="%s%s"/>' % (c, SITE, ("/" + p if p else "") + path) for c, p, _, _ in LOCALES)
        alts += '<xhtml:link rel="alternate" hreflang="x-default" href="%s/en%s"/>' % (SITE, path)
        for c, p, _, _ in LOCALES:
            rows.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod>%s</url>' % (SITE, ("/" + p if p else "") + path, today, alts))
    rows.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(rows) + "\n")

def main():
    for pre in PREFIXES:
        shutil.rmtree(ROOT / pre, ignore_errors=True)
    en_cat = load_catalog("en")
    report = {}
    for code, pre, _, _ in LOCALES[1:]:
        cat = load_catalog(code) if code != "en" else en_cat
        missing = set()
        for page in PAGES:
            local_page(page, code, pre, cat, en_cat["attrs"], missing)
        report[code] = sorted(missing)
    for page in PAGES:
        root_page(page)
    sitemap()
    (REPO / "i18n/web/missing.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print({k: len(v) for k, v in report.items()}, len(PAGES), "páginas")

if __name__ == "__main__":
    main()
