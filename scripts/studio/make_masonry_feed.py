#!/usr/bin/env python3
"""Muro de «Más plantillas para ti»: piezas originales, sin mascota y sin marca.

Compone miniaturas a partir de fotografías generadas para este catálogo
(scripts no copia diseños de terceros). Cada ficha lleva feed:true para
abrir el masonry, y vivid:true para que el documento editable no repita
el texto de otra categoría.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / "web/v2/studio"
CATALOG = STUDIO / "thumbs" / "catalog.json"
SOURCES = Path("/opt/cursor/artifacts/assets")
FONT = {
    "reg": "/usr/share/fonts/truetype/macos/Inter-Regular.ttf",
    "semi": "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf",
    "bold": "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
    "serif": "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
}
CATS = [
    "curriculum", "presentacion", "documento", "informe", "propuesta",
    "tarjeta-visita", "logo", "flyer", "cartel", "infografia", "invitacion",
    "post-instagram", "story", "miniatura-youtube", "portada", "video",
    "pizarra", "sitio-web", "negocio",
]
LABEL = {
    "curriculum": "Currículum",
    "presentacion": "Presentación",
    "documento": "Documento",
    "informe": "Informe",
    "propuesta": "Propuesta",
    "tarjeta-visita": "Tarjeta",
    "logo": "Marca",
    "flyer": "Flyer",
    "cartel": "Cartel",
    "infografia": "Infografía",
    "invitacion": "Invitación",
    "post-instagram": "Post",
    "story": "Historia",
    "miniatura-youtube": "Miniatura",
    "portada": "Portada",
    "video": "Vídeo",
    "pizarra": "Pizarra",
    "sitio-web": "Enlaces",
    "negocio": "Negocio",
}
ASPECTS = [(3, 4), (4, 5), (1, 1), (5, 4), (9, 16), (4, 3), (2, 3), (3, 5), (16, 9), (5, 7), (1, 1), (4, 5)]
PAPER = [(246, 241, 234), (243, 246, 242), (247, 243, 255), (255, 248, 236), (244, 247, 246), (255, 241, 242)]
INK = (26, 26, 30)
MUTED = (90, 84, 78)
ADD = 297

NOUNS = [
    "Mesa", "Taller", "Costa", "Lino", "Jardín", "Cuaderno", "Cerámica", "Ramo",
    "Puerto", "Sombra", "Desayuno", "Estudio", "Mercado", "Sendero", "Fachada",
    "Lago", "Vidrio", "Cosecha", "Patio", "Archivo", "Terraza", "Huerto", "Oasis",
    "Atelier", "Riviera", "Bosque", "Plaza", "Nube", "Horario", "Receta",
]
TAILS = [
    "en calma", "de abril", "del sábado", "de temporada", "sin prisa", "de estudio",
    "al sol", "de barrio", "de campo", "de verano", "en papel", "del norte",
    "de tarde", "con luz", "de otoño", "en casa",
]


def slug(text):
    raw = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")[:40]


def font(weight, size):
    return ImageFont.truetype(FONT[weight], max(12, size))


def titles_for(category, count, used):
    out = []
    n = 0
    while len(out) < count:
        noun = NOUNS[n % len(NOUNS)]
        tail = TAILS[(n * 3 + len(category)) % len(TAILS)]
        n += 1
        if noun.lower() in tail:
            continue
        phrase = "%s %s" % (noun, tail)
        if phrase in used:
            continue
        used.add(phrase)
        out.append(phrase)
        if n > 5000:
            raise SystemExit("faltan títulos en " + category)
    return out


def load_sources():
    paths = sorted(SOURCES.glob("feed-*.jpg"))
    if len(paths) < 8:
        raise SystemExit("faltan fotografías de origen en " + str(SOURCES))
    images = []
    for path in paths:
        im = Image.open(path).convert("RGB")
        im.thumbnail((960, 960), Image.Resampling.LANCZOS)
        images.append(im)
    return images


def cover(im, w, h, ox=0.5, oy=0.5):
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = max(w, int(sw * scale) + 1), max(h, int(sh * scale) + 1)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = max(0, min(nw - w, int((nw - w) * ox)))
    y = max(0, min(nh - h, int((nh - h) * oy)))
    return resized.crop((x, y, x + w, y + h))


def grade(im, kind):
    im = im.convert("RGB")
    if kind == 1:
        im = ImageEnhance.Color(im).enhance(1.18)
        im = ImageEnhance.Contrast(im).enhance(1.06)
    elif kind == 2:
        im = ImageEnhance.Color(im).enhance(0.78)
        im = ImageEnhance.Brightness(im).enhance(1.05)
    elif kind == 3:
        im = ImageEnhance.Contrast(im).enhance(1.22)
        im = ImageEnhance.Color(im).enhance(0.9)
    elif kind == 4:
        r, g, b = im.split()
        im = Image.merge("RGB", (
            r.point(lambda v: min(255, int(v * 1.08 + 6))),
            g,
            b.point(lambda v: int(v * 0.9)),
        ))
    elif kind == 5:
        r, g, b = im.split()
        im = Image.merge("RGB", (
            r.point(lambda v: int(v * 0.92)),
            g,
            b.point(lambda v: min(255, int(v * 1.08 + 4))),
        ))
    return im


def scrim(im, strength=168):
    w, h = im.size
    fade_h = max(24, int(h * 0.46))
    grad = Image.linear_gradient("L").resize((w, fade_h))
    mask = Image.new("L", (w, h), 0)
    mask.paste(grad, (0, h - fade_h))
    if strength != 255:
        mask = mask.point(lambda v: int(v * strength / 255))
    veil = Image.new("RGB", (w, h), (18, 14, 12))
    return Image.composite(veil, im, mask)


def wrap(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines[:3]


def paint(draw, lines, x, y, fnt, fill, leading, anchor="lt"):
    for i, line in enumerate(lines):
        yy = y + i * leading
        draw.text((x, yy), line, font=fnt, fill=fill, anchor=anchor)


def headline(draw, title, max_w, start, weight="serif"):
    size = start
    while size >= 18:
        fnt = font(weight, size)
        lines = wrap(draw, title, fnt, max_w)
        if len(lines) <= 3 and all(draw.textlength(line, font=fnt) <= max_w + 1 for line in lines):
            return fnt, lines, int(size * 1.05)
        size -= 2
    fnt = font(weight, 18)
    return fnt, wrap(draw, title, fnt, max_w), 20


def layout_cover(canvas, photos, title, label, paper):
    im = scrim(photos[0])
    canvas.paste(im, (0, 0))
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    kicker = font("semi", max(12, w // 28))
    label_w = d.textlength(label.upper(), font=kicker)
    d.rounded_rectangle((20, 20, 36 + label_w, 20 + kicker.size + 12), radius=8, fill=(20, 16, 12))
    d.text((28, 26), label.upper(), font=kicker, fill=(255, 255, 255))
    fnt, lines, lead = headline(d, title, w - 56, max(28, w // 11))
    paint(d, lines, 28, h - 36 - lead * len(lines), fnt, (255, 248, 242), lead)


def layout_poster(canvas, photos, title, label, paper):
    im = grade(photos[0], 3)
    canvas.paste(cover(im, *canvas.size, 0.5, 0.42), (0, 0))
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    band = max(8, w // 28)
    d.rectangle((0, 0, band, h), fill=paper)
    fnt, lines, lead = headline(d, title, w - band - 48, max(26, w // 12))
    paint(d, lines, band + 24, int(h * 0.62), fnt, (255, 255, 255), lead)
    d.text((band + 24, int(h * 0.62) - 28), label.upper(), font=font("semi", max(11, w // 32)), fill=(255, 236, 220))


def layout_split(canvas, photos, title, label, paper):
    w, h = canvas.size
    portrait = h >= w
    a, b = photos[0], photos[1 % len(photos)]
    if portrait:
        cut = int(h * 0.58)
        canvas.paste(cover(a, w, cut, 0.45, 0.4), (0, 0))
        canvas.paste(cover(b, w, h - cut, 0.6, 0.55), (0, cut))
        d = ImageDraw.Draw(canvas)
        d.rectangle((0, cut - 3, w, cut + 3), fill=paper)
    else:
        cut = int(w * 0.56)
        canvas.paste(cover(a, cut, h, 0.4, 0.5), (0, 0))
        canvas.paste(cover(b, w - cut, h, 0.62, 0.48), (cut, 0))
        d = ImageDraw.Draw(canvas)
        d.rectangle((cut - 3, 0, cut + 3, h), fill=paper)
    fnt, lines, lead = headline(d, title, w * 0.7, max(22, w // 14))
    block_w = max(d.textlength(line, font=fnt) for line in lines)
    d.rounded_rectangle((16, 16, 32 + block_w, 32 + lead * len(lines)), radius=10, fill=(20, 16, 12))
    paint(d, lines, 24, 24, fnt, (255, 255, 255), lead)


def layout_collage(canvas, photos, title, label, paper):
    w, h = canvas.size
    gap = max(6, w // 48)
    d = ImageDraw.Draw(canvas)
    d.rectangle((0, 0, w, h), fill=paper)
    a, b, c = photos[0], photos[1 % len(photos)], photos[2 % len(photos)]
    if h >= w:
        top = int(h * 0.62)
        canvas.paste(cover(a, w - gap * 2, top - gap * 2, 0.5, 0.45), (gap, gap))
        cell_w = (w - gap * 3) // 2
        canvas.paste(cover(b, cell_w, h - top - gap, 0.3, 0.5), (gap, top))
        canvas.paste(cover(c, w - cell_w - gap * 3, h - top - gap, 0.7, 0.4), (gap * 2 + cell_w, top))
    else:
        left = int(w * 0.62)
        canvas.paste(cover(a, left - gap, h - gap * 2, 0.48, 0.5), (gap, gap))
        cell_h = (h - gap * 3) // 2
        canvas.paste(cover(b, w - left - gap, cell_h, 0.4, 0.3), (left, gap))
        canvas.paste(cover(c, w - left - gap, h - cell_h - gap * 3, 0.6, 0.7), (left, gap * 2 + cell_h))
    d = ImageDraw.Draw(canvas)
    fnt = font("semi", max(12, w // 26))
    d.rounded_rectangle((16, 16, 16 + d.textlength(label.upper(), font=fnt) + 20, 16 + max(22, w // 22)), radius=8, fill=(255, 255, 255))
    d.text((26, 20), label.upper(), font=fnt, fill=INK)


def layout_doc(canvas, photos, title, label, paper):
    w, h = canvas.size
    d = ImageDraw.Draw(canvas)
    d.rectangle((0, 0, w, h), fill=paper)
    photo_h = int(h * (0.34 if h >= w else 0.72))
    if h >= w:
        canvas.paste(cover(photos[0], w, photo_h, 0.5, 0.35), (0, 0))
        y = photo_h + 22
        d.text((28, y), label.upper(), font=font("semi", max(11, w // 30)), fill=MUTED)
        fnt, lines, lead = headline(d, title, w - 56, max(26, w // 12), "serif")
        paint(d, lines, 28, y + 28, fnt, INK, lead)
        y = y + 36 + lead * len(lines)
        for i in range(5):
            d.rectangle((28, y + i * 18, w - 28 - (i % 3) * 36, y + i * 18 + 6), fill=(226, 220, 210))
    else:
        canvas.paste(cover(photos[0], int(w * 0.42), h, 0.45, 0.5), (0, 0))
        x = int(w * 0.42) + 24
        d.text((x, 28), label.upper(), font=font("semi", max(11, w // 34)), fill=MUTED)
        fnt, lines, lead = headline(d, title, w - x - 24, max(22, w // 16), "serif")
        paint(d, lines, x, 56, fnt, INK, lead)
        y = 64 + lead * len(lines)
        for i in range(4):
            d.rectangle((x, y + i * 16, w - 24, y + i * 16 + 5), fill=(226, 220, 210))


def layout_invite(canvas, photos, title, label, paper):
    im = grade(photos[0], 2)
    canvas.paste(cover(im, *canvas.size, 0.5, 0.5), (0, 0))
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    pad = int(min(w, h) * 0.1)
    d.rounded_rectangle((pad, pad, w - pad, h - pad), radius=18, outline=(255, 255, 255), width=max(2, w // 140))
    inner = int(min(w, h) * 0.16)
    d.rectangle((inner, int(h * 0.38), w - inner, int(h * 0.7)), fill=(255, 250, 245))
    fnt, lines, lead = headline(d, title, w - inner * 2 - 16, max(22, w // 14), "serif")
    block_h = lead * len(lines)
    paint(d, lines, w // 2, int(h * 0.54) - block_h // 2, fnt, INK, lead, anchor="ma")
    d.text((w // 2, int(h * 0.28)), label.upper(), font=font("semi", max(12, w // 28)), fill=(255, 255, 255), anchor="ma")


def layout_info(canvas, photos, title, label, paper):
    w, h = canvas.size
    d = ImageDraw.Draw(canvas)
    d.rectangle((0, 0, w, h), fill=paper)
    if h >= w:
        band = int(h * 0.28)
        canvas.paste(cover(photos[0], w, band, 0.5, 0.4), (0, 0))
        d.text((24, band + 16), label.upper(), font=font("semi", max(11, w // 30)), fill=MUTED)
        fnt, lines, lead = headline(d, title, w - 48, max(22, w // 14), "bold")
        paint(d, lines, 24, band + 40, fnt, INK, lead)
        y = band + 52 + lead * len(lines)
        step_h = max(28, (h - y - 16) // 4)
        for i in range(4):
            yy = y + i * step_h
            d.ellipse((24, yy, 24 + step_h - 10, yy + step_h - 10), fill=INK)
            d.text((24 + (step_h - 10) / 2, yy + (step_h - 10) / 2), str(i + 1), font=font("bold", max(12, step_h // 3)), fill=(255, 255, 255), anchor="mm")
            d.rectangle((24 + step_h, yy + 8, w - 24, yy + 16), fill=(214, 206, 196))
    else:
        side = int(w * 0.38)
        canvas.paste(cover(photos[0], side, h, 0.4, 0.5), (0, 0))
        d.text((side + 20, 20), label.upper(), font=font("semi", max(11, w // 34)), fill=MUTED)
        fnt, lines, lead = headline(d, title, w - side - 40, max(20, w // 18), "bold")
        paint(d, lines, side + 20, 46, fnt, INK, lead)


def layout_frame(canvas, photos, title, label, paper):
    w, h = canvas.size
    d = ImageDraw.Draw(canvas)
    d.rectangle((0, 0, w, h), fill=paper)
    margin = max(14, int(min(w, h) * 0.07))
    canvas.paste(cover(photos[0], w - margin * 2, h - margin * 2, 0.52, 0.48), (margin, margin))
    d = ImageDraw.Draw(canvas)
    fnt, lines, lead = headline(d, title, w - margin * 2 - 24, max(20, w // 13))
    d.rectangle((margin, h - margin - lead * len(lines) - 28, w - margin, h - margin), fill=(255, 250, 245))
    paint(d, lines, margin + 16, h - margin - lead * len(lines) - 14, fnt, INK, lead)
    d.text((margin + 16, margin + 12), label.upper(), font=font("semi", max(11, w // 30)), fill=(255, 255, 255))


LAYOUTS = [layout_cover, layout_poster, layout_split, layout_collage, layout_doc, layout_invite, layout_info, layout_frame]


def size_for(aspect):
    aw, ah = aspect
    long_edge = 520 if aw >= ah else 460
    if aw >= ah:
        w = long_edge
        h = max(1, round(long_edge * ah / aw))
    else:
        h = long_edge
        w = max(1, round(long_edge * aw / ah))
    return w, h


def save_png(im, path):
    im.convert("RGB").save(path, "PNG", optimize=True)
    if path.stat().st_size > 95_000:
        q = im.convert("RGB").quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        q.save(path, "PNG", optimize=True)


def main():
    photos = load_sources()
    items = json.loads(CATALOG.read_text())
    removed = [item for item in items if item.get("feed")]
    for item in removed:
        path = STUDIO / item["file"]
        if path.exists():
            path.unlink()
    items = [item for item in items if not item.get("feed")]
    used_titles = {item.get("title", "") for item in items}
    next_n = {}
    for item in items:
        match = re.search(r"-(\d+)$", item["id"])
        if not match:
            continue
        cat = item["category"]
        next_n[cat] = max(next_n.get(cat, 0), int(match.group(1)))
    plan = []
    base, extra = divmod(ADD, len(CATS))
    for index, cat in enumerate(CATS):
        plan.extend([cat] * (base + (1 if index < extra else 0)))
    assert len(plan) == ADD
    fresh = []
    per_cat_count = {}
    for cat in plan:
        per_cat_count[cat] = per_cat_count.get(cat, 0) + 1
    phrases = {cat: titles_for(cat, per_cat_count[cat], set(used_titles)) for cat in per_cat_count}
    cursor = {cat: 0 for cat in per_cat_count}
    for i, cat in enumerate(plan):
        title = phrases[cat][cursor[cat]]
        cursor[cat] += 1
        n = next_n.get(cat, 0) + 1
        next_n[cat] = n
        aspect = ASPECTS[(i * 3 + len(cat)) % len(ASPECTS)]
        w, h = size_for(aspect)
        shots = [grade(photos[(i + k * 5) % len(photos)], (i + k) % 6) for k in range(3)]
        canvas = Image.new("RGB", (w, h), PAPER[i % len(PAPER)])
        LAYOUTS[i % len(LAYOUTS)](canvas, shots, title, LABEL[cat], PAPER[i % len(PAPER)])
        file_name = "thumbs/%s-%02d-%s.png" % (cat, n, slug(title))
        save_png(canvas, STUDIO / file_name)
        fresh.append({
            "id": "tpl-%s-%02d" % (cat, n),
            "templateId": "tpl-%s-%02d" % (cat, n),
            "category": cat,
            "title": title,
            "width": w,
            "height": h,
            "file": file_name,
            "vivid": True,
            "feed": True,
        })
    # Solo las fichas históricas (sin feed) más esta generación. No se concatena
    # sobre un catálogo que ya tuviera feed: si no, los ids se duplican.
    CATALOG.write_text(json.dumps(items + fresh, ensure_ascii=False, indent=2) + "\n")
    total_bytes = sum((STUDIO / item["file"]).stat().st_size for item in fresh)
    print("added", len(fresh), "catalog", len(items) + len(fresh), "mb", round(total_bytes / 1_048_576, 2))


def append_feed(count):
    """Añade piezas nuevas sin borrar el feed ya generado. Cada archivo es único."""
    if count < 1:
        raise SystemExit("append pide un entero positivo")
    photos = load_sources()
    items = json.loads(CATALOG.read_text())
    feed_now = sum(1 for item in items if item.get("feed"))
    if feed_now >= ADD + count:
        print("append skip", "feed", feed_now, "catalog", len(items))
        return
    used_titles = {item.get("title", "") for item in items}
    used_files = {item.get("file") for item in items}
    used_ids = {item.get("id") for item in items}
    next_n = {}
    for item in items:
        match = re.search(r"-(\d+)$", item["id"])
        if not match:
            continue
        cat = item["category"]
        next_n[cat] = max(next_n.get(cat, 0), int(match.group(1)))
    plan = []
    base, extra = divmod(count, len(CATS))
    for index, cat in enumerate(CATS):
        plan.extend([cat] * (base + (1 if index < extra else 0)))
    assert len(plan) == count
    per_cat_count = {}
    for cat in plan:
        per_cat_count[cat] = per_cat_count.get(cat, 0) + 1
    phrases = {cat: titles_for(cat, per_cat_count[cat], set(used_titles)) for cat in per_cat_count}
    cursor = {cat: 0 for cat in per_cat_count}
    fresh = []
    for i, cat in enumerate(plan):
        title = phrases[cat][cursor[cat]]
        cursor[cat] += 1
        n = next_n.get(cat, 0) + 1
        next_n[cat] = n
        aspect = ASPECTS[(i * 5 + 3 + len(cat)) % len(ASPECTS)]
        w, h = size_for(aspect)
        seed = i + 997
        shots = [grade(photos[(seed + k * 7) % len(photos)], (seed + k * 2) % 6) for k in range(3)]
        canvas = Image.new("RGB", (w, h), PAPER[(i + 3) % len(PAPER)])
        LAYOUTS[(i + 3) % len(LAYOUTS)](canvas, shots, title, LABEL[cat], PAPER[(i + 3) % len(PAPER)])
        file_name = "thumbs/%s-%02d-%s.png" % (cat, n, slug(title))
        item_id = "tpl-%s-%02d" % (cat, n)
        if file_name in used_files or item_id in used_ids:
            raise SystemExit("id o archivo repetido: " + item_id)
        save_png(canvas, STUDIO / file_name)
        fresh.append({
            "id": item_id,
            "templateId": item_id,
            "category": cat,
            "title": title,
            "width": w,
            "height": h,
            "file": file_name,
            "vivid": True,
            "feed": True,
        })
    CATALOG.write_text(json.dumps(items + fresh, ensure_ascii=False, indent=2) + "\n")
    total_bytes = sum((STUDIO / item["file"]).stat().st_size for item in fresh)
    print("appended", len(fresh), "catalog", len(items) + len(fresh), "mb", round(total_bytes / 1_048_576, 2))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--append":
        append_feed(int(sys.argv[2]))
    else:
        main()
