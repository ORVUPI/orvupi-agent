"""Genera las miniaturas WebP de ORVUPI Academy desde el álbum propio.

Fuente: web/v2/assets/orvupi/album (dibujos originales de ORVUPI, 800×800).
Salida: web/v2/assets/academy/img/<id>-w.webp (768×432) y <id>-s.webp (228×128).
El dibujo cuadrado se centra entero sobre un fondo difuminado de sí mismo, así
el pulpo nunca se recorta. Uso: python3 academy/tools/make_images.py
"""
import json
import pathlib
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
ALBUM = ROOT / "web/v2/assets/orvupi/album"
OUT = ROOT / "web/v2/assets/academy/img"
CATALOG = json.loads((ROOT / "web/v2/assets/orvupi/catalogo.json").read_text())
FILES = {e["id"]: e["file"] for e in CATALOG}
CURRICULUM = json.loads((ROOT / "academy/content/curriculo.json").read_text())


def ids():
    found = set(CURRICULUM.get("imagenes", []))
    for unit in CURRICULUM["unidades"]:
        found.add(unit["imagen"])
    for practice in CURRICULUM["practicas"]:
        found.add(practice["imagen"])
    for tool in CURRICULUM.get("herramientas", []):
        found.add(tool["imagen"])
    return sorted(found)


def frame(src, width, height):
    base = src.convert("RGB")
    bg = base.resize((width, width)).crop((0, (width - height) // 2, width, (width + height) // 2))
    bg = bg.filter(ImageFilter.GaussianBlur(width // 24))
    fg = base.resize((height, height), Image.LANCZOS)
    bg.paste(fg, ((width - height) // 2, 0))
    return bg


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for image_id in ids():
        src = Image.open(ALBUM / FILES[image_id])
        frame(src, 768, 432).save(OUT / f"{image_id}-w.webp", "WEBP", quality=72, method=6)
        frame(src, 228, 128).save(OUT / f"{image_id}-s.webp", "WEBP", quality=70, method=6)
    logo = Image.open(ROOT / "web/v2/assets/orvupi/avatar.png").convert("RGBA").resize((64, 64), Image.LANCZOS)
    logo.save(OUT / "logo-64.webp", "WEBP", quality=85, method=6)
    for image_id in CURRICULUM.get("cuadradas", []):
        sq = Image.open(ALBUM / FILES[image_id]).convert("RGB").resize((480, 480), Image.LANCZOS)
        sq.save(OUT / f"{image_id}-q.webp", "WEBP", quality=72, method=6)
    print("ok", len(ids()))


if __name__ == "__main__":
    main()
