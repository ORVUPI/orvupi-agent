#!/usr/bin/env python3
"""Escribe copias web del álbum (WebP ≤800 px) y apunta el catálogo y el HTML a ellas.

Los PNG originales (~2 MB, ~490 MB) no están en el despliegue y en producción responden 404.
Las tarjetas de / y /memes usan estas copias, que sí viajan en el repositorio.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ALBUM = ROOT / "web/v2/assets/orvupi/album"
CATALOG = ROOT / "web/v2/assets/orvupi/catalogo.json"
STORE = Path("/cursor/stores/bot/album")
WEB = ROOT / "web/v2"


def source_for(rel: str) -> Path | None:
    for base in (STORE, ALBUM):
        path = base / rel
        if path.is_file():
            return path
    return None


def write_webp(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(src).convert("RGB")
    image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    image.save(dest, "WEBP", quality=76, method=4)


def main() -> None:
    items = json.loads(CATALOG.read_text())
    kept = []
    replaced = {}
    for item in items:
        rel = item["file"]
        src = source_for(rel)
        if src is None:
            continue
        web = rel[:-4] + ".webp" if rel.endswith(".png") else rel
        write_webp(src, ALBUM / web)
        replaced["/assets/orvupi/album/" + rel] = "/assets/orvupi/album/" + web
        item["file"] = web
        kept.append(item)
    CATALOG.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")) + "\n")
    pages = 0
    for page in WEB.rglob("*.html"):
        text = page.read_text()
        new = text
        for old, nxt in replaced.items():
            new = new.replace(old, nxt)
        if new != text:
            page.write_text(new)
            pages += 1
    print(f"álbum web: {len(kept)} de {len(items)} · html {pages}")


if __name__ == "__main__":
    main()
