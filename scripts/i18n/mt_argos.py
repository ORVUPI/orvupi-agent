"""Borrador automático (Argos Translate, MIT, sin conexión) de en -> pt-BR/ja/ko.
Todo lo que sale de aquí queda marcado como PENDIENTE DE REVISIÓN humana.
Uso: python mt_argos.py <lang> <src.json> <out.json>"""
import json, re, sys
import argostranslate.translate as T
CODE = {"pt-BR": "pb", "ja": "ja", "ko": "ko", "en": "en"}
PROTECT = ["Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU", "ORVUPI Work", "ORVUPI AI", "$ORVUPI", "ORVUPI",
           "Pump.fun", "pump.fun", "Solana", "Phantom", "Solflare", "Jupiter", "Raydium", "DexScreener", "Telegram",
           "Farcaster", "TikTok", "GitHub", "Verify", "Studio", "Lab", "Web3", "DOCX", "XLSX", "PPTX", "PDF", "CSV",
           "HTML", "TXT", "IndexedDB", "OPFS", "SOL", "USDC", "EVM", "Base", "BNB", "Ethereum", "X (Twitter)"]
URL = re.compile(r"https?://\S+|[\w.-]+@[\w.-]+\.\w+|\{\w+\}|[1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{6,}")
def tr(text, src, dst):
    toks = []
    def keep(v):
        toks.append(v); return "ZQ%d" % (len(toks) - 1)
    t = URL.sub(lambda m: keep(m.group(0)), text)
    for p in PROTECT:
        t = re.sub(r"(?<![\w$])" + re.escape(p) + r"(?!\w)", lambda m: keep(m.group(0)), t)
    if not re.search(r"[A-Za-zÀ-ÿ]{2,}", re.sub(r"ZQ\d+", "", t)):
        out = t
    else:
        out = T.translate(t, src, dst)
    for i in reversed(range(len(toks))):
        out = re.sub(r"ZQ\s?%d(?!\d)" % i, lambda m: toks[i], out)
    ok = all(v in out for v in toks) and "ZQ" not in out
    return out, ok
if __name__ == "__main__":
    lang, srcf, outf = sys.argv[1:4]
    srcl = sys.argv[4] if len(sys.argv) > 4 else "en"
    items = json.load(open(srcf))
    try: res = json.load(open(outf))
    except Exception: res = {}
    for i, s in enumerate(items):
        if s in res: continue
        o, ok = tr(s, srcl, CODE[lang])
        res[s] = o if ok else None
        if i % 50 == 0:
            json.dump(res, open(outf, "w"), ensure_ascii=False, indent=0); print(lang, i, flush=True)
    json.dump(res, open(outf, "w"), ensure_ascii=False, indent=0); print("fin", lang)
