"""Une borrador automático + traducciones manuales y escribe los catálogos finales.
Entradas: i18n/mt/<idioma>.json (borrador en->idioma), i18n/overrides.json, i18n/attrs-manual.json.
Salidas: i18n/web/<idioma>.json, web/v2/i18n/web/dyn-<idioma>.json, apps/work/src/i18n/locales/<idioma>.json,
i18n/review-status.json (qué es manual, qué es automático, qué cae al inglés)."""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
src = json.load(open(R / "web/v2/i18n/source.json"))
over = {k: v for k, v in json.load(open(R / "i18n/overrides.json")).items() if not k.startswith("_")}
manual = {k: v for k, v in json.load(open(R / "i18n/attrs-manual.json")).items() if not k.startswith("_")}
LANGS = ["pt-BR", "ja", "ko"]
status = {}

def work_en():
    s = (R / "apps/work/src/i18n/messages.ts").read_text()
    blk = s[s.index("export const en"):]
    pat = re.compile(r'^\s+([A-Za-z0-9_]+):\s*\n?\s*"((?:[^"\\]|\\.)*)",?\s*$', re.M)
    return {k: json.loads('"' + v + '"') for k, v in pat.findall(blk)}

def tpl_en():
    s = (R / "apps/work/src/docs/templates.ts").read_text()
    return sorted(set(re.findall(r'"([^"]+)"', s[s.index("  en: {"):s.index("} as const")])))

WEN = work_en(); TPL = tpl_en()
# atributos en inglés
en_attrs = {k: v[0] for k, v in manual.items()}
(R / "i18n/web").mkdir(parents=True, exist_ok=True)
json.dump({"segments": {}, "attrs": en_attrs}, open(R / "i18n/web/en.json", "w"), ensure_ascii=False, indent=1)
for i, lang in enumerate(LANGS):
    mt = json.load(open(R / "i18n/mt" / (lang + ".json")))
    st = {"manual": 0, "auto": 0, "fallback_en": []}
    def get(en_text, key_hint=None):
        if en_text in over:
            st["manual"] += 1; return over[en_text][i]
        v = mt.get(en_text)
        if v and v.strip():
            st["auto"] += 1; return v
        st["fallback_en"].append(key_hint or en_text); return en_text
    segs = {t: get(t) for t in src["en"]}
    attrs = {k: v[i + 1] for k, v in manual.items()}
    json.dump({"segments": segs, "attrs": attrs}, open(R / "i18n/web" / (lang + ".json"), "w"), ensure_ascii=False, indent=1)
    dyn = {t: get(t) for t in src["en_dynamic"]}
    dyn.update({k: v[i] for k, v in over.items() if k not in dyn})
    dyn = {k: v for k, v in dyn.items() if k != v}
    (R / "web/v2/i18n/web").mkdir(parents=True, exist_ok=True)
    json.dump(dyn, open(R / "web/v2/i18n/web" / ("dyn-%s.json" % lang), "w"), ensure_ascii=False, separators=(",", ":"))
    work = {k: get(v, "work:" + k) for k, v in WEN.items()}
    if "Open" in over: pass
    for t in TPL:
        work["tpl:" + t] = over["Open (task)"][i] if t == "Open" else get(t, "tpl:" + t)
    json.dump(work, open(R / "apps/work/src/i18n/locales" / (lang + ".json"), "w"), ensure_ascii=False, indent=1)
    status[lang] = st
json.dump(status, open(R / "i18n/review-status.json", "w"), ensure_ascii=False, indent=1)
print({k: (v["manual"], v["auto"], len(v["fallback_en"])) for k, v in status.items()})
