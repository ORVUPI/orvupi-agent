"""Extrae los textos de web/v2 a web/v2/i18n/source.json (inglés y español de origen)."""
import json, re, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from htmltools import lang_elements, text_segments

ROOT = pathlib.Path(__file__).resolve().parents[2] / "web/v2"
PAGES = sorted(p for p in ROOT.rglob("*.html") if not any(x in p.parts for x in ("work","content","en","pt-br","ja","ko")))
ATTR = re.compile(r'\s(alt|aria-label|placeholder|title|data-title-en|content)="([^"]*)"')
segs_en, segs_es = {}, {}
inv = {}
for page in PAGES:
    html = page.read_text()
    rel = str(page.relative_to(ROOT))
    n = 0
    for s, oe, cs, ce in lang_elements(html, "en"):
        for t in text_segments(html[oe:cs]):
            segs_en[t] = segs_en.get(t, 0) + 1; n += 1
    # atributos visibles o de accesibilidad en español fuera de los pares es/en
    for m in ATTR.finditer(html):
        name, val = m.groups()
        if name == "content":
            pre = html[max(0, m.start()-120):m.start()]
            if not re.search(r'(name="description"|property="og:(title|description|image:alt)"|name="twitter:(title|description|image:alt)")[^<]*$', pre):
                continue
        if name == "data-title-en":
            segs_en[val] = segs_en.get(val, 0) + 1; continue
        if " / " in val:
            en_part = val.split(" / ", 1)[1]
            segs_en[en_part] = segs_en.get(en_part, 0) + 1
        elif re.search(r"[A-Za-zÀ-ÿ]{3,}", val) and val not in ("ORVUPI",):
            segs_es[val] = segs_es.get(val, 0) + 1
    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S)
    inv[rel] = {"segments_en": n, "title": t.group(1).strip() if t else ""}
(ROOT / "i18n").mkdir(exist_ok=True)
json.dump({"en": sorted(segs_en), "es_attrs": sorted(segs_es), "pages": inv}, open(ROOT / "i18n/source.json", "w"), ensure_ascii=False, indent=1)
print(len(PAGES), "páginas", len(segs_en), "tramos en", len(segs_es), "atributos es")

# Textos que los scripts insertan en inglés (pares {es, en} y ternarios lang === "en").
dyn = set()
pat = [re.compile(r'\ben:\s*"((?:[^"\\\n]|\\.)*)"'), re.compile(r"\ben:\s*'((?:[^'\\\n]|\\.)*)'"),
       re.compile(r'"en"\s*\?\s*"((?:[^"\\\n]|\\.)*)"'), re.compile(r"'en'\s*\?\s*'((?:[^'\\\n]|\\.)*)'")]
for f in sorted((ROOT / "assets").glob("*.*js")):
    src = f.read_text()
    for p in pat:
        for m in p.finditer(src):
            v = m.group(1).encode().decode("unicode_escape").encode("latin1").decode("utf8", "ignore") if "\\" in m.group(1) else m.group(1)
            if re.search(r"[A-Za-z]{2,}", v) and "${" not in v: dyn.add(v.strip())
data = json.load(open(ROOT / "i18n/source.json"))
data["en_dynamic"] = sorted(dyn - set(data["en"]))
json.dump(data, open(ROOT / "i18n/source.json", "w"), ensure_ascii=False, indent=1)
print(len(data["en_dynamic"]), "textos dinámicos")
