#!/usr/bin/env python3
"""Escribe PNG de álbum (≤800 px, paleta) en las rutas que pide el sitio.

Cloudflare Pages publica web/v2 tal cual. Los originales (~2 MB, ~490 MB) no
están en el árbol y en producción responden 404. Estas copias ocupan el mismo
camino /assets/orvupi/album/<colección>/<archivo>.png.
"""
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ALBUM = ROOT / "web/v2/assets/orvupi/album"
CATALOG = ROOT / "web/v2/assets/orvupi/catalogo.json"
STORE = Path("/cursor/stores/bot/album")
WEB = ROOT / "web/v2"
ALBUM_SRC = re.compile(r"(/assets/orvupi/album/[^\"'\s]+)\.webp")


def png_rel(rel: str) -> str:
    if rel.endswith(".webp"):
        return rel[:-5] + ".png"
    return rel


def source_for(rel: str) -> Path | None:
    png = png_rel(rel)
    for base in (STORE, ALBUM):
        for name in (png, rel):
            path = base / name
            if path.is_file() and path.stat().st_size > 0:
                return path
    return None


def write_png(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(src).convert("RGB")
    image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    quantized = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    quantized.save(dest, "PNG", optimize=True)


def main() -> None:
    items = json.loads(CATALOG.read_text())
    kept = []
    written = 0
    for item in items:
        rel = item["file"]
        png = png_rel(rel)
        src = source_for(rel)
        if src is None:
            continue
        dest = ALBUM / png
        # No recomprima una copia ya optimizada si la fuente es ella misma.
        if src.resolve() != dest.resolve() or dest.stat().st_size > 400_000:
            write_png(src, dest)
            written += 1
        item["file"] = png
        kept.append(item)
    CATALOG.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")) + "\n")
    pages = 0
    for page in WEB.rglob("*.html"):
        text = page.read_text()
        new = ALBUM_SRC.sub(r"\1.png", text)
        if new != text:
            page.write_text(new)
            pages += 1
    removed = 0
    for webp in ALBUM.rglob("*.webp"):
        webp.unlink()
        removed += 1
    print(f"álbum png: {len(kept)} de {len(items)} · escritos {written} · html {pages} · webp borrados {removed}")


if __name__ == "__main__":
    main()
