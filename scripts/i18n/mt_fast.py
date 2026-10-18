"""Borrador automático por lotes con los modelos de Argos Translate (MIT/CC0) vía CTranslate2, sin red.
Todo lo que sale de aquí es PENDIENTE DE REVISIÓN humana. Uso: python mt_fast.py <pkg_dir> <src.json> <out.json>"""
import json, re, sys
import ctranslate2, sentencepiece as spm
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from mt_argos import URL, PROTECT
pkg, srcf, outf = sys.argv[1:4]
sp = spm.SentencePieceProcessor(model_file=pkg + "/sentencepiece.model")
tr = ctranslate2.Translator(pkg + "/model", device="cpu", inter_threads=1, intra_threads=4)
items = json.load(open(srcf))
SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z¿¡“\"(])")
jobs, meta = [], []
for idx, text in enumerate(items):
    toks = []
    def keep(v):
        toks.append(v); return "ZQ%d" % (len(toks) - 1)
    t = URL.sub(lambda m: keep(m.group(0)), text)
    for p in PROTECT:
        t = re.sub(r"(?<![\w$])" + re.escape(p) + r"(?!\w)", lambda m: keep(m.group(0)), t)
    sents = SPLIT.split(t) if re.search(r"[A-Za-zÀ-ÿ]{2,}", re.sub(r"ZQ\d+", "", t)) else []
    meta.append((t, toks, len(jobs), len(sents)))
    jobs.extend(sents)
out = []
B = 64
for i in range(0, len(jobs), B):
    batch = [sp.encode(s, out_type=str) for s in jobs[i:i + B]]
    res = tr.translate_batch(batch, beam_size=2, max_decoding_length=256)
    out.extend(sp.decode(r.hypotheses[0]) for r in res)
    print(i, flush=True)
result = {}
for text, (t, toks, start, n) in zip(items, meta):
    o = " ".join(out[start:start + n]) if n else t
    o = o.replace("▁", " ").strip()
    for k in reversed(range(len(toks))):
        o = re.sub(r"ZQ\s?%d(?!\d)" % k, lambda m: toks[k], o)
    ok = all(v in o for v in toks) and "ZQ" not in o
    result[text] = o if ok else None
json.dump(result, open(outf, "w"), ensure_ascii=False, indent=0)
print("fin", sum(v is None for v in result.values()), "fallos")
