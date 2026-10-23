"""Utilidades mínimas (solo stdlib) para localizar las páginas estáticas de web/v2."""
import re, hashlib

VOID = {"br","img","input","meta","link","hr","wbr","source","area","col","embed","param","track"}
TAG = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>")

def element_end(html, start):
    """start apunta a '<' de una etiqueta de apertura. Devuelve (fin_apertura, inicio_cierre, fin_cierre)."""
    m = TAG.match(html, start)
    name = m.group(2).lower()
    open_end = m.end()
    depth = 1
    for t in TAG.finditer(html, open_end):
        if t.group(2).lower() != name or t.group(3).rstrip().endswith("/"):
            continue
        if t.group(1):
            depth -= 1
            if depth == 0:
                return open_end, t.start(), t.end()
        else:
            depth += 1
    raise ValueError("etiqueta sin cerrar en %d" % start)

LANG_OPEN = re.compile(r'<([a-z0-9]+)\s[^>]*class="([^"]*\blang\b[^"]*)"[^>]*>')

def lang_elements(html, which):
    """Itera (start, open_end, close_start, close_end) de los elementos con class lang <which>."""
    out = []
    for m in LANG_OPEN.finditer(html):
        classes = m.group(2).split()
        if "lang" in classes and which in classes:
            oe, cs, ce = element_end(html, m.start())
            out.append((m.start(), oe, cs, ce))
    return out

def key_for(text):
    return "w" + hashlib.sha1(text.strip().encode()).hexdigest()[:10]

SEG = re.compile(r"(<[^>]+>)")
def text_segments(inner):
    """Divide HTML en tramos de texto traducibles, saltando <code>…</code>."""
    parts = SEG.split(inner)
    segs = []
    in_code = 0
    for p in parts:
        if p.startswith("<"):
            low = p.lower()
            if low.startswith("<code") or low.startswith("<kbd") or low.startswith("<samp"): in_code += 1
            elif low.startswith("</code") or low.startswith("</kbd") or low.startswith("</samp"): in_code -= 1
            continue
        if not in_code and re.search(r"[A-Za-zÀ-ÿ]{2,}", p):
            segs.append(p.strip())
    return segs

def translate_inner(inner, lookup):
    parts = SEG.split(inner)
    in_code = 0
    out = []
    for p in parts:
        if p.startswith("<"):
            low = p.lower()
            if low.startswith("<code") or low.startswith("<kbd") or low.startswith("<samp"): in_code += 1
            elif low.startswith("</code") or low.startswith("</kbd") or low.startswith("</samp"): in_code -= 1
            out.append(p); continue
        s = p.strip()
        if not in_code and s and re.search(r"[A-Za-zÀ-ÿ]{2,}", p):
            t = lookup(s)
            lead = p[:len(p)-len(p.lstrip())]; trail = p[len(p.rstrip()):]
            out.append(lead + t + trail)
        else:
            out.append(p)
    return "".join(out)
