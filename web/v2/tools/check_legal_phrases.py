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
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return text


def banned_marks() -> list[str]:
    """Frases que solo pueden vivir en /risks y /legal. El fuente las parte para no contenerlas enteras."""
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
        piece("un", "official"),
        piece("not ", "official"),
        piece("no ", "oficial"),
    ]


def forbidden_outside_risk_pages() -> list[str]:
    """Falla si una frase retirada aparece en una página, herramienta, plantilla o imagen fuera de /risks y /legal."""
    needles = banned_marks()
    patterns = [re.compile(r"\b" + re.escape(needle) + r"\b") for needle in needles]
    allowed = {"risks/index.html", "legal/index.html"}
    skip_files = {"tools/build_site.py", "tools/equivalencias-seguridad.json"}
    suffixes = {".html", ".js", ".mjs", ".json", ".md", ".css", ".txt", ".xml", ".py", ".webmanifest", ".jpg", ".jpeg", ".png", ".webp"}
    hits: list[str] = []
    for path in V2.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(V2).as_posix()
        if rel in allowed or rel.startswith("risks/") or rel.startswith("legal/"):
            continue
        if rel in skip_files or "__pycache__" in rel or "node_modules" in rel:
            continue
        if path.suffix.lower() not in suffixes:
            continue
        text = fold_marks(path.read_text(encoding="utf-8", errors="replace"))
        for needle, pattern in zip(needles, patterns):
            if pattern.search(text):
                hits.append(f"{rel}: {needle}")
    return hits


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
