#!/usr/bin/env python3
"""Comprueba que cada frase de seguridad o legal de web/current tiene equivalente en web/v2.

Una frase cuenta si, ya normalizada, aparece en v2, o si equivalencias-seguridad.json
apunta a otra frase que sí aparece. No es una lista blanca de reglas: cada destino
tiene que estar en el texto generado.
"""

from __future__ import annotations

import html
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
CURRENT = REPO / "web/current"
V2 = ROOT
PAIRS = Path(__file__).with_name("equivalencias-seguridad.json")

SOURCES = [
    "index.html",
    "canales.html",
    "riesgos.html",
    "pruebas.html",
    "marca.html",
]


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0
        self.capture = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.parts.append(" ")
        if tag in {"script", "style", "svg", "nav", "header", "footer"}:
            self.skip += 1
        if tag in {"p", "li", "h1", "h2", "h3", "figcaption", "td", "th"} and self.skip == 0:
            self.capture += 1
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "svg", "nav", "header", "footer"} and self.skip:
            self.skip -= 1
        if tag in {"p", "li", "h1", "h2", "h3", "figcaption", "td", "th"} and self.capture and self.skip == 0:
            self.capture -= 1
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip == 0 and self.capture:
            self.parts.append(data)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ").replace("\u202f", " ")
    text = text.replace("«", "").replace("»", "").replace("“", "").replace("”", "").replace("’", "'")
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def sentences_from(html: str) -> list[str]:
    parser = TextExtractor()
    parser.feed(html)
    raw = "".join(parser.parts)
    found: list[str] = []
    for chunk in re.split(r"\n+", raw):
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if not chunk:
            continue
        pieces = re.split(r"(?<=[.!?])\s+", chunk)
        for piece in pieces:
            words = re.findall(r"\w+", piece, flags=re.UNICODE)
            if len(words) < 8:
                continue
            if not re.search(
                r"riesgo|mica|comisi[oó]n|creador|pump|clon|semilla|clave|wallet|exchange|custodia|"
                r"logo|metadato|ipfs|autoridad|consejo|inversi[oó]n|cnmv|garant|estafa|privado|"
                r"pr[aá]ctica|oficial|congel|pausa|aportaci|donaci|vesting|multifirma|holder|"
                r"cripto|solana|token|\bca\b|aviso|legal|privacidad|edad|pa[ií]s",
                piece,
                flags=re.IGNORECASE,
            ):
                continue
            found.append(piece)
    return found


def v2_corpus() -> str:
    chunks: list[str] = []
    for path in V2.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".html", ".json", ".txt", ".md"}:
            continue
        if "node_modules" in path.parts:
            continue
        chunks.append(path.read_text(encoding="utf-8", errors="replace"))
    return normalize("\n".join(chunks))


def long_words(text: str) -> list[str]:
    return re.findall(r"[a-záéíóúüñ0-9]{6,}", text)


def covered(sentence: str, words: set[str]) -> bool:
    """La redacción puede cambiar. Si faltan las palabras largas, la frase no tiene equivalente."""
    own = long_words(sentence)
    if not own:
        return False
    hit = sum(1 for word in own if word in words)
    need = 1.0 if len(own) < 4 else 0.8
    return hit / len(own) >= need


class HowToExtractor(HTMLParser):
    """Bloques «Cómo repetirlo tú», incluidos los comandos de <pre>."""

    INLINE = {"a", "code", "strong", "em", "span", "b", "i", "abbr", "small", "sup", "sub"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.in_how = False
        self.mode = ""
        self.buf: list[str] = []
        self.blocks: list[str] = []

    def _flush(self) -> None:
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if self.mode == "h3":
            self.in_how = text.startswith("Cómo repetirlo")
            if self.in_how:
                self.blocks.append(text)
        elif self.in_how and self.mode in {"p", "pre"} and text:
            self.blocks.append(text)
        self.mode = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "svg", "nav", "header", "footer"}:
            self.skip += 1
        if self.skip:
            return
        if tag in {"h3", "p", "pre"}:
            self._flush()
            self.mode = tag
        elif self.mode and tag not in self.INLINE:
            self.buf.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"h3", "p", "pre"} and self.mode == tag and self.skip == 0:
            self._flush()
        if tag in {"script", "style", "svg", "nav", "header", "footer"} and self.skip:
            self.skip -= 1

    def handle_data(self, data: str) -> None:
        if self.skip == 0 and self.mode:
            self.buf.append(data)


def plain_corpus() -> str:
    chunks: list[str] = []
    for path in V2.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".html", ".json", ".txt", ".md"}:
            continue
        if "node_modules" in path.parts:
            continue
        raw = html.unescape(path.read_text(encoding="utf-8", errors="replace"))
        chunks.append(re.sub(r"<[^>]+>", "", raw))
    return normalize("\n".join(chunks))


def piece(*parts: str) -> str:
    return "".join(parts)


def fold_marks(text: str) -> str:
    text = normalize(text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Cf")
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return text


def risk_marks() -> list[str]:
    """Pie de riesgo y etiqueta de imagen. Solo pueden vivir en /risks y /legal."""
    return [
        piece("cripto de alto ", "riesgo"),
        piece("puedes perder", "lo todo"),
        piece("no es consejo de ", "inversion"),
        piece("imagen generada con ", "ia"),
        piece("high-risk ", "crypto"),
        piece("you could lose ", "everything"),
        piece("you can lose ", "everything"),
        piece("not investment ", "advice"),
        piece("ai-generated ", "image"),
        piece("no haya ", "riesgo"),
        piece("there is no ", "risk"),
        piece("otros ", "riesgos"),
        piece("other ", "risks"),
    ]


def studio_marks() -> list[str]:
    """«No oficial» solo se prohíbe en Studio. En el resto de la web es antiestafa."""
    return [
        piece("un", "official"),
        piece("not ", "official"),
        piece("no ", "oficial"),
    ]


_LITERAL = r"""(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')"""
_LITERAL_RE = re.compile(_LITERAL)


def _unquote(token: str) -> str:
    body = token[1:-1]
    out: list[str] = []
    i = 0
    while i < len(body):
        if body[i] == "\\" and i + 1 < len(body):
            mapping = {"n": "\n", "t": "\t", "r": "\r", '"': '"', "'": "'", "\\": "\\"}
            out.append(mapping.get(body[i + 1], body[i + 1]))
            i += 2
        else:
            out.append(body[i])
            i += 1
    return "".join(out)


def _requote(value: str) -> str:
    escaped = (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )
    return f'"{escaped}"'


def _literals_only(chunk: str) -> str | None:
    literals = _LITERAL_RE.findall(chunk)
    rest = _LITERAL_RE.sub("", chunk)
    if rest.strip(" \t\n\r,") != "" or not literals:
        return None
    return "".join(_unquote(item) for item in literals)


def resolve_concat(text: str) -> str:
    """Junta concatenaciones simples: suma, literales pegados, piece/_join/phrase y .join."""

    def repl_call(match: re.Match[str]) -> str:
        joined = _literals_only(match.group(1))
        return _requote(joined) if joined is not None else match.group(0)

    def repl_join(match: re.Match[str]) -> str:
        body = _literals_only(match.group(1))
        if body is None:
            return match.group(0)
        sep = _unquote(match.group(2))
        parts = _LITERAL_RE.findall(match.group(1))
        return _requote(sep.join(_unquote(item) for item in parts))

    def repl_plus(match: re.Match[str]) -> str:
        return _requote(_unquote(match.group(1)) + _unquote(match.group(2)))

    def repl_adjacent(match: re.Match[str]) -> str:
        return _requote(_unquote(match.group(1)) + _unquote(match.group(2)))

    call = re.compile(rf"\b(?:piece|_join|phrase)\(({_LITERAL}(?:\s*,\s*{_LITERAL})*)\)")
    join = re.compile(rf"\[({_LITERAL}(?:\s*,\s*{_LITERAL})*)\]\s*\.\s*join\(\s*({_LITERAL})\s*\)")
    plus = re.compile(rf"({_LITERAL})\s*\+\s*({_LITERAL})")
    adjacent = re.compile(rf"({_LITERAL})[ \t\r\n]+({_LITERAL})")
    previous = None
    while previous != text:
        previous = text
        text = call.sub(repl_call, text)
        text = join.sub(repl_join, text)
        text = plus.sub(repl_plus, text)
        text = adjacent.sub(repl_adjacent, text)
    return text


def prepare_scan(raw: str) -> str:
    """Normaliza espacios, saltos, etiquetas, ancho cero y concatenaciones antes de buscar."""
    text = resolve_concat(raw)
    text = html.unescape(text)
    text = re.sub(r"</?[A-Za-z!][^>]*>", " ", text)
    return fold_marks(text)


def _drop_assignment(source: str, name: str) -> str:
    match = re.search(rf"^{re.escape(name)} = \(", source, flags=re.M)
    if not match:
        return source
    start = match.start()
    depth = 0
    for index in range(match.end() - 1, len(source)):
        if source[index] == "(":
            depth += 1
        elif source[index] == ")":
            depth -= 1
            if depth == 0:
                end = index + 1
                if end < len(source) and source[end] == "\n":
                    end += 1
                return source[:start] + source[end:]
    return source


def _drop_function(source: str, name: str) -> str:
    match = re.search(rf"^def {re.escape(name)}\(", source, flags=re.M)
    if not match:
        return source
    nxt = re.search(r"^def ", source[match.end() :], flags=re.M)
    end = match.end() + nxt.start() if nxt else len(source)
    return source[: match.start()] + source[end:]


def without_risk_page_source(source: str) -> str:
    """El cuerpo de /risks y /legal vive en el generador. El resto del archivo se revisa."""
    source = _drop_assignment(source, "RISK_ES")
    source = _drop_assignment(source, "RISK_EN")
    source = _drop_function(source, "risks")
    source = _drop_function(source, "legal")
    return source


# La lista de la guardia y el filtro de Studio comparan estas frases; no las publican.
SKIP_FILES = {"tools/check_legal_phrases.py", "studio/lib/filter.mjs"}
TEXT_SUFFIXES = {".html", ".js", ".mjs", ".json", ".md", ".css", ".txt", ".xml", ".py", ".webmanifest"}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def is_risk_page(rel: str) -> bool:
    return rel in {"risks/index.html", "legal/index.html"} or rel.startswith("risks/") or rel.startswith("legal/")


def is_studio(rel: str) -> bool:
    return rel.startswith("studio/")


def marks_in(text: str, marks: list[str]) -> list[str]:
    return [mark for mark in marks if re.search(r"\b" + re.escape(mark) + r"\b", text)]


def phrase_hits(rel: str, raw: str, *, binary: bool = False) -> list[str]:
    text = fold_marks(raw) if binary else prepare_scan(raw)
    found: list[str] = []
    if not is_risk_page(rel):
        found.extend(marks_in(text, risk_marks()))
    if is_studio(rel):
        found.extend(marks_in(text, studio_marks()))
    return found


def _scan_root(root: Path, prefix: str) -> list[str]:
    hits: list[str] = []
    if not root.exists():
        return hits
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if prefix:
            rel = f"{prefix}/{rel}"
        if is_risk_page(rel) or rel in SKIP_FILES or "__pycache__" in rel or "node_modules" in rel:
            continue
        suffix = path.suffix.lower()
        binary = suffix in IMAGE_SUFFIXES
        if suffix not in TEXT_SUFFIXES and not binary:
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        if rel == "tools/build_site.py":
            raw = without_risk_page_source(raw)
        for mark in phrase_hits(rel, raw, binary=binary):
            hits.append(f"{rel}: {mark}")
    return hits


def forbidden_outside_risk_pages() -> list[str]:
    """Falla si el pie o la etiqueta salen fuera de /risks y /legal, o «no oficial» sale en Studio.

    Revisa páginas, herramientas, imágenes, build_site.py y las plantillas (content y site-drafts).
    """
    return _scan_root(V2, "") + _scan_root(REPO / "site-drafts", "site-drafts")


def self_check() -> None:
    """Casos que antes colaban: espacios, saltos, etiquetas y concatenaciones simples."""
    samples = [
        ("espacios", "cripto   de   alto   riesgo"),
        ("salto", "cripto de alto\nriesgo"),
        ("etiqueta", "cripto de alto <b>riesgo</b>"),
        ("suma", '"cripto de alto " + "riesgo"'),
        ("piece", 'piece("puedes perder", "lo todo")'),
        ("join", '["not investment ", "advice"].join("")'),
        ("adyacentes", '"imagen generada con " "ia"'),
        ("plantilla", '<p>AI-generated\nimage</p>'),
        ("zwsp", "cripto de alto \u200briesgo"),
        ("zwj", "not invest\u200dment advice"),
        ("bom", "ai-generated \ufeffimage"),
        ("entidad", "cripto de alto &#8203;riesgo"),
    ]
    for name, sample in samples:
        if not phrase_hits("content/tools/ejemplo.html", sample):
            raise SystemExit(f"la guardia no vio el caso {name}")
    anti = "Si una cuenta no está aquí, trátala como no oficial hasta comprobarla."
    if phrase_hits("security/index.html", anti):
        raise SystemExit("el aviso antiestafa no puede caer en la guardia")
    if not phrase_hits("studio/index.html", anti):
        raise SystemExit("en Studio, no oficial tiene que caer")
    if phrase_hits("studio/reglas/index.html", "no es oficial"):
        raise SystemExit("no es oficial no es la marca de Studio")
    if phrase_hits("studio/reglas/index.html", "no oficiales"):
        raise SystemExit("no oficiales no es la marca de Studio")
    if "tools/build_site.py" in SKIP_FILES:
        raise SystemExit("build_site.py tiene que entrar en la guardia")
    if not phrase_hits("index.html", "Que no aparezca no significa que no haya riesgo."):
        raise SystemExit("la guardia no vio no haya riesgo")
    if not phrase_hits("index.html", "A signal not showing does not mean there is no risk."):
        raise SystemExit("la guardia no vio there is no risk")
    if phrase_hits("risks/index.html", "no significa que no haya riesgo"):
        raise SystemExit("en /risks puede decirse que no haya riesgo")
    if phrase_hits("legal/index.html", "there is no risk"):
        raise SystemExit("en /legal puede decirse there is no risk")
    approved = "Que no aparezcan señales no significa que esté todo comprobado."
    if phrase_hits("verify/index.html", approved):
        raise SystemExit("la frase aprobada no está retirada")
    if phrase_hits("verify/index.html", "No signals showing does not mean everything was checked."):
        raise SystemExit("la frase inglesa aprobada no está retirada")
    if not phrase_hits("index.html", "Que no aparezcan no cierra otros riesgos."):
        raise SystemExit("la guardia no vio otros riesgos")
    if not phrase_hits("index.html", "Their absence does not close off other risks."):
        raise SystemExit("la guardia no vio other risks")
    if phrase_hits("risks/index.html", "otros riesgos"):
        raise SystemExit("en /risks puede decirse otros riesgos")
    if phrase_hits("legal/index.html", "other risks"):
        raise SystemExit("en /legal puede decirse other risks")
    if phrase_hits("verify/index.html", "Que no aparezcan extensiones no significa que esté todo comprobado."):
        raise SystemExit("la frase de extensiones no está retirada")
    if phrase_hits("verify/index.html", "No extensions showing does not mean everything was checked."):
        raise SystemExit("la frase inglesa de extensiones no está retirada")
    if not (REPO / "site-drafts").exists():
        raise SystemExit("faltan las plantillas de site-drafts")


def retired_sentences() -> set[str]:
    """Frases retiradas por decisión del dueño. No tienen que tener equivalente: no pueden estar."""
    footer = "".join(
        [
            piece("Cripto de alto ", "riesgo"),
            " · ",
            piece("Puedes perder", "lo todo"),
            " · ",
            piece("No es consejo de ", "inversión."),
        ]
    )
    illustration = "".join(
        [
            "Es el mismo personaje, ilustración con elementos ",
            "generados con IA, servido desde stubxai.com para las webs que no cargan IPFS.",
        ]
    )
    return {normalize(footer), normalize(illustration)}


def main() -> int:
    self_check()
    pairs = json.loads(PAIRS.read_text(encoding="utf-8")) if PAIRS.exists() else []
    mapped = {normalize(item["current"]): item["v2"] for item in pairs}
    corpus = v2_corpus()
    words = set(long_words(corpus))
    retired = retired_sentences()
    missing: list[str] = []
    present: list[str] = []
    seen: set[str] = set()
    for name in SOURCES:
        html = (CURRENT / name).read_text(encoding="utf-8")
        for sentence in sentences_from(html):
            key = normalize(sentence)
            if key in seen:
                continue
            seen.add(key)
            if key in retired:
                if key in corpus:
                    present.append(sentence)
                continue
            if key in corpus or covered(key, words):
                continue
            target = mapped.get(key)
            if target and (normalize(target) in corpus or covered(normalize(target), words)):
                continue
            missing.append(sentence)
    repeat_parser = HowToExtractor()
    repeat_parser.feed((CURRENT / "pruebas.html").read_text(encoding="utf-8"))
    plain = plain_corpus()

    def how_covered(block: str) -> bool:
        if normalize(block) in plain:
            return True
        rewritten = block
        for item in pairs:
            rewritten = rewritten.replace(item["current"], item["v2"])
        return normalize(rewritten) in plain

    how_missing = [block for block in repeat_parser.blocks if not how_covered(block)]
    if not repeat_parser.blocks:
        how_missing = ["pruebas.html no tiene secciones «Cómo repetirlo tú»"]
    forbidden = forbidden_outside_risk_pages()
    if present or missing or how_missing or forbidden:
        if present:
            sys.stderr.write(f"{len(present)} frases retiradas siguen en web/v2:\n")
            for sentence in present:
                sys.stderr.write(f"- {sentence}\n")
        if missing:
            sys.stderr.write(f"{len(missing)} frases de web/current sin equivalente en web/v2:\n")
            for sentence in missing:
                sys.stderr.write(f"- {sentence}\n")
        if how_missing:
            sys.stderr.write(f"{len(how_missing)} bloques «Cómo repetirlo tú» sin equivalente en web/v2:\n")
            for block in how_missing:
                sys.stderr.write(f"- {block}\n")
        if forbidden:
            sys.stderr.write(f"{len(forbidden)} frases retiradas fuera de /risks y /legal:\n")
            for hit in forbidden:
                sys.stderr.write(f"- {hit}\n")
        return 1
    print(f"frases de seguridad o legal cubiertas: {len(seen)}; bloques de repetición: {len(repeat_parser.blocks)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
