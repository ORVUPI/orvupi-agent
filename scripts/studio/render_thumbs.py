#!/usr/bin/env python3
"""Miniaturas profesionales de Studio. Marino, crema y blanco. El rosa es solo un acento.

No hay mascota ni sello ORVUPI en la cara del diseño.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web/v2/studio/thumbs"
FONT = {
    "reg": "/usr/share/fonts/truetype/macos/Inter-Regular.ttf",
    "med": "/usr/share/fonts/truetype/macos/Inter-Medium.ttf",
    "semi": "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf",
    "bold": "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
    "serif": "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
    "serif-r": "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
}
NAVY = (16, 32, 50)
CREAM = (255, 248, 236)
WHITE = (255, 255, 255)
MUTED = (96, 110, 126)
LINE = (214, 221, 228)
SOFT = (236, 241, 246)
PINK = (255, 48, 112)
INK = NAVY
SLATE = (36, 56, 78)


class Sheet:
    def __init__(self, w, h, bg=WHITE):
        self.k = 2
        self.w, self.h = w, h
        self.im = Image.new("RGB", (w * self.k, h * self.k), bg)
        self.d = ImageDraw.Draw(self.im)

    def box(self, x, y, w, h):
        return [x * self.k, y * self.k, (x + w) * self.k, (y + h) * self.k]

    def r(self, x, y, w, h, fill, radius=0):
        b = self.box(x, y, w, h)
        if radius:
            self.d.rounded_rectangle(b, radius=radius * self.k, fill=fill)
        else:
            self.d.rectangle(b, fill=fill)

    def font(self, weight, size):
        return ImageFont.truetype(FONT[weight], max(8, int(size * self.k)))

    def wrap(self, text, size, weight, max_w):
        words = str(text).split()
        lines, cur = [], ""
        font = self.font(weight, size)
        for word in words:
            trial = (cur + " " + word).strip()
            if font.getlength(trial) / self.k <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        return lines or [""]

    def block(self, x, y, text, size, fill=INK, weight="semi", max_w=200, gap=1.25):
        lines = self.wrap(text, size, weight, max_w)
        for i, line in enumerate(lines):
            self.t(x, y + i * size * gap, line, size, fill, weight)
        return y + len(lines) * size * gap

    def t(self, x, y, text, size, fill=INK, weight="semi", anchor="lt"):
        lines = str(text).split("\n")
        leading = size * 1.15
        font = self.font(weight, size)
        if len(lines) == 1:
            self.d.text((x * self.k, y * self.k), lines[0], font=font, fill=fill, anchor=anchor)
            return
        top = y - ((len(lines) - 1) * leading / 2 if anchor in ("mm", "ma") else 0)
        line_anchor = "mt" if anchor in ("mm", "mt", "ma") else "lt"
        for i, line in enumerate(lines):
            self.d.text((x * self.k, (top + i * leading) * self.k), line, font=font, fill=fill, anchor=line_anchor)

    def rule(self, x, y, w=36, h=3):
        self.r(x, y, w, h, PINK)

    def bars(self, x, y, widths, color=LINE, h=5, gap=8):
        for i, w in enumerate(widths):
            self.r(x, y + i * (h + gap), w, h, color, radius=2)

    def save(self, path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.im.save(path, "PNG", optimize=True)


def kicker(s, x, y, text, fill=MUTED):
    s.t(x, y, text.upper(), 11, fill, "semi")


def cv_side(s, name, role, city):
    s.r(0, 0, 156, s.h, NAVY)
    s.r(48, 32, 60, 60, SLATE, radius=30)
    s.t(78, 62, name[:1], 22, CREAM, "bold", "mm")
    y = s.block(16, 108, name, 16, CREAM, "bold", 124, 1.15)
    y = s.block(16, y + 16, role, 12, (232, 214, 206), "med", 124, 1.25)
    s.rule(16, y + 8, 32)
    s.t(16, y + 22, city, 12, CREAM, "reg")
    s.t(16, y + 42, "estudio.com", 11, (186, 198, 210), "reg")
    s.t(16, y + 78, "PERFIL", 11, (186, 198, 210), "semi")
    s.bars(16, y + 100, [112, 96, 80], (58, 78, 98), 4, 8)
    s.t(180, 36, "Experiencia", 18, INK, "bold")
    s.rule(180, 64, 28)
    y = 84
    for title, place in (("Dirección de producto", "Norte  ·  2022"), ("Consultoría", "Alba  ·  2019"), ("Análisis", "Lumen  ·  2016")):
        s.t(180, y, title, 14, INK, "semi")
        s.t(180, y + 18, place, 11, MUTED, "reg")
        s.bars(180, y + 38, [200, 160], h=4, gap=6)
        y += 78
    s.t(180, y + 8, "Formación", 16, INK, "bold")
    s.t(180, y + 32, "Grado  ·  Universidad", 12, MUTED, "reg")


def cv_band(s, name, role, city):
    s.r(0, 0, s.w, 128, NAVY)
    s.t(28, 32, name, 24, CREAM, "bold")
    s.block(28, 66, role, 13, (232, 214, 206), "med", s.w - 56)
    s.rule(28, 108, 40)
    s.t(28, 148, "Experiencia", 16, INK, "bold")
    y = 180
    for title, place in (("Liderazgo de equipo", "2022 — hoy"), ("Estrategia", "2018 — 2022"), ("Operaciones", "2015 — 2018")):
        s.r(28, y, s.w - 56, 72, SOFT, radius=8)
        s.r(28, y, 4, 72, PINK if y == 180 else NAVY)
        s.t(44, y + 12, title, 14, INK, "semi")
        s.t(44, y + 34, f"{place}  ·  {city}", 12, MUTED, "reg")
        y += 84
    s.t(28, y + 6, "Idiomas  ·  Español, inglés", 12, MUTED, "reg")


def cv_min(s, name, role, city):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.t(32, 40, name, 28, INK, "bold")
    s.t(32, 78, role, 14, MUTED, "med")
    s.rule(32, 108, 48)
    s.t(32, 128, city, 12, MUTED, "reg")
    s.t(32, 168, "Trayectoria", 15, INK, "bold")
    s.bars(32, 198, [300, 280, 240, 260, 190], h=6, gap=10)
    s.t(32, 310, "Competencias", 15, INK, "bold")
    skills = (("Estrategia", 0.86), ("Equipos", 0.74), ("Datos", 0.62), ("Marca", 0.5))
    for i, (label, amt) in enumerate(skills):
        y = 340 + i * 36
        s.t(32, y, label, 12, INK, "med")
        s.r(140, y + 4, 220, 8, LINE, radius=4)
        s.r(140, y + 4, int(220 * amt), 8, NAVY if i else PINK, radius=4)


def cv_split(s, name, role, city):
    s.r(0, 0, s.w, 168, CREAM)
    s.t(28, 40, name, 26, INK, "bold")
    s.t(28, 78, role, 14, MUTED, "med")
    s.t(28, 108, city, 12, MUTED, "reg")
    s.rule(28, 136, 36)
    s.r(0, 168, s.w, s.h - 168, WHITE)
    cols = (("Experiencia", ["Producto", "Clientes", "Equipo"]), ("Formación", ["Grado", "Máster", "Taller"]))
    for i, (title, rows) in enumerate(cols):
        x = 28 + i * 190
        s.t(x, 192, title, 14, INK, "bold")
        for j, row in enumerate(rows):
            y = 224 + j * 64
            s.t(x, y, row, 13, INK, "semi")
            s.bars(x, y + 20, [140, 110], h=4, gap=6)


def deck_title(s, title, kicker_text):
    s.r(0, 0, s.w, s.h, NAVY)
    kicker(s, 40, 48, kicker_text, (186, 198, 210))
    s.t(40, 110, title, 36, CREAM, "bold")
    s.rule(40, 210, 56, 4)
    s.t(40, 300, "01", 14, (186, 198, 210), "med")


def deck_agenda(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.t(40, 36, title, 26, INK, "bold")
    s.rule(40, 78, 36)
    for i, row in enumerate(("Contexto", "Cifras", "Propuesta", "Siguiente paso")):
        y = 108 + i * 56
        s.t(40, y, f"{i + 1:02d}", 18, PINK if i == 0 else NAVY, "bold")
        s.t(100, y + 2, row, 18, INK, "semi")
        s.r(100, y + 32, 420, 1, LINE)


def deck_stats(s, title):
    s.t(36, 28, title, 22, INK, "bold")
    s.rule(36, 64, 32)
    stats = (("24%", "Crecimiento"), ("1.8", "Margen"), ("12", "Cuentas"))
    for i, (num, label) in enumerate(stats):
        x = 36 + i * 196
        s.r(x, 100, 180, 180, SOFT, radius=12)
        if i == 0:
            s.r(x, 100, 180, 4, PINK)
        s.t(x + 16, 130, num, 36, INK, "bold")
        s.t(x + 16, 190, label, 14, MUTED, "med")
        s.bars(x + 16, 224, [140, 100], h=6, gap=8)


def deck_chart(s, title):
    s.r(0, 0, 240, s.h, NAVY)
    s.t(28, 48, title, 26, CREAM, "bold")
    s.rule(28, 130, 36)
    s.t(28, 160, "Trimestre", 13, (186, 198, 210), "med")
    bars = (70, 110, 90, 150, 130)
    for i, h in enumerate(bars):
        x = 280 + i * 64
        s.r(x, 280 - h, 40, h, NAVY if i < 4 else PINK, radius=4)
        s.t(x + 8, 292, "T" + str(i + 1), 11, MUTED, "med")


def ig_quote(s, quote, who):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.rule(48, 72, 40, 4)
    s.t(48, 110, quote, 32, INK, "bold")
    s.t(48, 400, who, 14, MUTED, "med")


def ig_tips(s, title):
    kicker(s, 36, 36, "02  /  05")
    s.t(36, 64, title, 26, INK, "bold")
    for i, tip in enumerate(("Define el objetivo", "Elige una prueba", "Mide una cifra")):
        y = 140 + i * 96
        s.r(36, y, 48, 48, NAVY if i else PINK, radius=10)
        s.t(60, y + 24, str(i + 1), 18, CREAM, "bold", "mm")
        s.t(104, y + 12, tip, 16, INK, "semi")


def ig_stat(s, num, label):
    s.r(0, 0, s.w, s.h, NAVY)
    s.t(40, 150, num, 72, CREAM, "bold")
    s.rule(40, 250, 48, 4)
    s.t(40, 280, label, 22, CREAM, "med")


def ig_grid(s, title):
    colors = (SOFT, CREAM, (226, 232, 238), SOFT)
    for i, color in enumerate(colors):
        x = 24 + (i % 2) * 220
        y = 24 + (i // 2) * 200
        s.r(x, y, 208, 188, color, radius=12)
    s.r(24, 424, 432, 32, NAVY)
    s.t(40, 430, title, 14, CREAM, "semi")


def story_hero(s, title, meta):
    s.r(0, 0, s.w, s.h, NAVY)
    kicker(s, 28, 48, "Novedad", (186, 198, 210))
    s.t(28, 160, title, 36, CREAM, "bold")
    s.rule(28, 340, 40, 4)
    s.r(20, 460, s.w - 40, 150, CREAM, radius=16)
    s.t(40, 488, meta, 16, INK, "semi")
    s.t(40, 520, "Reserva tu plaza", 13, MUTED, "med")


def story_steps(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.t(28, 40, title, 26, INK, "bold")
    for i, step in enumerate(("Preparar", "Probar", "Contar", "Ajustar")):
        y = 120 + i * 120
        s.r(36, y, 16, 16, PINK if i == 0 else NAVY, radius=8)
        if i < 3:
            s.r(42, y + 16, 3, 100, LINE)
        s.t(72, y - 4, f"0{i + 1}", 12, MUTED, "semi")
        s.t(72, y + 16, step, 20, INK, "bold")


def story_poll(s, question):
    s.t(28, 48, "Pregunta", 12, MUTED, "semi")
    s.t(28, 80, question, 28, INK, "bold")
    for i, (label, w) in enumerate((("Sí, esta semana", 250), ("El mes que viene", 180))):
        y = 280 + i * 110
        s.r(28, y, s.w - 56, 80, SOFT, radius=12)
        s.r(28, y, w, 80, NAVY if i else (255, 228, 236), radius=12)
        s.t(48, y + 28, label, 16, CREAM if i else INK, "semi")


def yt_title(s, title, tag):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.r(400, 0, 240, s.h, NAVY)
    s.r(470, 140, 100, 80, SLATE, radius=8)
    s.t(36, 70, tag.upper(), 13, PINK, "semi")
    s.t(36, 110, title, 32, INK, "bold")
    s.rule(36, 250, 40)


def yt_course(s, title):
    s.r(0, 0, s.w, s.h, WHITE)
    s.r(36, 40, 110, 28, NAVY, radius=14)
    s.t(91, 54, "CURSO", 12, CREAM, "semi", "mm")
    s.t(36, 100, title, 32, INK, "bold")
    s.bars(36, 230, [360, 280, 200], h=8, gap=12)
    s.t(36, 300, "Sesión  ·  42 min", 14, MUTED, "med")


def flyer_event(s, title, when, where):
    s.r(0, 0, s.w, 250, NAVY)
    kicker(s, 28, 36, "Encuentro", (186, 198, 210))
    s.t(28, 80, title, 32, CREAM, "bold")
    s.rule(28, 200, 40)
    s.t(28, 290, when, 20, INK, "bold")
    s.t(28, 324, where, 14, MUTED, "med")
    s.bars(28, 380, [300, 260, 220], h=6, gap=12)
    s.t(28, 500, "Entrada libre", 13, INK, "semi")


def flyer_list(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.t(28, 36, title, 28, INK, "bold")
    s.rule(28, 80, 36)
    for i, row in enumerate(("09:00  Apertura", "10:30  Mesa", "12:00  Cierre", "13:00  Café")):
        y = 120 + i * 90
        s.t(28, y, f"{i + 1:02d}", 16, PINK if i == 1 else NAVY, "bold")
        s.t(80, y, row, 16, INK, "semi")
        s.r(28, y + 40, 360, 1, LINE)


def poster(s, title, meta):
    s.r(0, 0, s.w, s.h, CREAM)
    s.r(0, 0, 12, s.h, NAVY)
    s.t(36, 48, meta.upper(), 13, PINK, "semi")
    s.t(36, 120, title, 40, INK, "bold")
    s.rule(36, 280, 48, 4)
    s.bars(36, 320, [280, 240, 200], h=6, gap=12)
    s.t(36, 480, "Sala norte  ·  19:30", 14, MUTED, "med")


def logo_mark(s, word, letter):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.r(150, 70, 180, 180, NAVY, radius=90)
    s.t(240, 160, letter, 72, CREAM, "bold", "mm")
    s.t(240, 300, word, 28, INK, "bold", "mt")
    s.rule(200, 348, 80)
    s.t(240, 370, "Estudio", 13, MUTED, "med", "mt")


def logo_word(s, word):
    s.r(0, 0, s.w, s.h, WHITE)
    s.t(s.w / 2, s.h / 2 - 20, word, 42, INK, "bold", "mm")
    s.rule(s.w / 2 - 24, s.h / 2 + 24, 48)
    s.t(s.w / 2, s.h / 2 + 48, "MARCA", 12, MUTED, "semi", "mt")


def logo_split(s, word, letter):
    s.r(0, 0, s.w / 2, s.h, NAVY)
    s.t(s.w / 4, s.h / 2, letter, 80, CREAM, "bold", "mm")
    s.t(s.w * 0.75, s.h / 2 - 10, word, 28, INK, "bold", "mm")
    s.t(s.w * 0.75, s.h / 2 + 28, "Desde 2014", 12, MUTED, "med", "mt")


def invite(s, title, names, when):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.r(18, 18, s.w - 36, s.h - 36, WHITE)
    s.r(26, 26, s.w - 52, s.h - 52, None)
    s.d.rectangle([26 * 2, 26 * 2, (s.w - 26) * 2, (s.h - 26) * 2], outline=NAVY, width=2)
    s.t(s.w / 2, 70, title.upper(), 12, MUTED, "semi", "mt")
    s.t(s.w / 2, 130, names, 26, INK, "serif", "mt")
    s.rule(s.w / 2 - 20, 180, 40)
    s.t(s.w / 2, 210, when, 14, MUTED, "med", "mt")


def invite_navy(s, title, names, when):
    s.r(0, 0, s.w, s.h, NAVY)
    s.t(s.w / 2, 70, title.upper(), 12, (186, 198, 210), "semi", "mt")
    s.t(s.w / 2, 140, names, 24, CREAM, "serif", "mt")
    s.rule(s.w / 2 - 18, 190, 36)
    s.t(s.w / 2, 220, when, 14, (232, 214, 206), "med", "mt")


def doc_page(s, kind, title):
    s.r(0, 0, s.w, 8, NAVY)
    kicker(s, 28, 28, kind)
    s.t(28, 52, title, 22, INK, "bold")
    s.rule(28, 88, 32)
    s.bars(28, 116, [340, 320, 300, 260], h=5, gap=8)
    s.t(28, 200, "Resumen", 14, INK, "semi")
    s.bars(28, 226, [340, 300, 280, 320, 180], h=5, gap=8)
    s.r(28, 340, s.w - 56, 120, SOFT, radius=8)
    s.t(44, 356, "Punto acordado", 13, INK, "semi")
    s.bars(44, 384, [280, 220], h=5, gap=8)
    s.t(28, 500, "Página 1", 11, MUTED, "reg")


def doc_table(s, title):
    s.t(28, 28, title, 20, INK, "bold")
    s.rule(28, 60, 28)
    headers = ("Concepto", "Estado")
    s.r(28, 84, s.w - 56, 28, NAVY)
    s.t(40, 90, headers[0], 12, CREAM, "semi")
    s.t(250, 90, headers[1], 12, CREAM, "semi")
    rows = (("Alcance", "Listo"), ("Plazo", "En curso"), ("Presupuesto", "Revisión"), ("Equipo", "Listo"))
    for i, (a, b) in enumerate(rows):
        y = 112 + i * 48
        if i % 2 == 0:
            s.r(28, y, s.w - 56, 48, SOFT)
        s.t(40, y + 14, a, 13, INK, "med")
        s.t(250, y + 14, b, 13, INK, "semi")
    s.bars(28, 340, [300, 260, 220], h=5, gap=10)


def info_steps(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.t(24, 24, title, 22, INK, "bold")
    for i, step in enumerate(("Observar", "Elegir", "Probar", "Contar")):
        y = 80 + i * 130
        s.r(24, y, s.w - 48, 114, WHITE, radius=12)
        s.r(24, y, 6, 114, PINK if i == 0 else NAVY)
        s.t(48, y + 16, f"0{i + 1}", 12, MUTED, "semi")
        s.t(48, y + 38, step, 20, INK, "bold")
        s.bars(48, y + 72, [240, 180], h=5, gap=6)


def info_bars(s, title):
    s.t(24, 28, title, 22, INK, "bold")
    s.rule(24, 64, 32)
    rows = (("Descubrimiento", 0.9), ("Consideración", 0.7), ("Decisión", 0.48), ("Fidelidad", 0.32))
    for i, (label, amt) in enumerate(rows):
        y = 100 + i * 120
        s.t(24, y, label, 14, INK, "semi")
        s.r(24, y + 28, s.w - 48, 22, SOFT, radius=6)
        s.r(24, y + 28, int((s.w - 48) * amt), 22, NAVY if i else PINK, radius=6)


def card_navy(s, name, role):
    s.r(0, 0, s.w, s.h, NAVY)
    s.rule(28, 40, 28)
    s.t(28, 70, name, 26, CREAM, "bold")
    s.t(28, 110, role, 14, (232, 214, 206), "med")
    s.t(28, 250, "hola@estudio.com", 13, CREAM, "reg")
    s.t(28, 274, "Madrid", 13, (186, 198, 210), "reg")


def card_white(s, name, role):
    s.r(0, 0, 10, s.h, NAVY)
    s.t(36, 48, name, 24, INK, "bold")
    s.t(36, 86, role, 14, MUTED, "med")
    s.rule(36, 120, 28)
    s.t(36, 230, "hola@estudio.com  ·  +34 600 000 000", 13, INK, "reg")


def card_split(s, name, letter):
    s.r(0, 0, 180, s.h, NAVY)
    s.t(90, s.h / 2, letter, 48, CREAM, "bold", "mm")
    s.t(204, 70, name, 22, INK, "bold")
    s.t(204, 108, "Dirección", 13, MUTED, "med")
    s.t(204, 230, "estudio.com", 13, INK, "reg")


def video_cover(s, title, episode):
    s.r(0, 0, s.w, s.h, NAVY)
    s.r(0, 0, 8, s.h, PINK)
    kicker(s, 40, 48, episode, (186, 198, 210))
    s.t(40, 120, title, 34, CREAM, "bold")
    s.t(40, 280, "Serie  ·  Temporada 2", 14, (232, 214, 206), "med")


def video_light(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.r(460, 40, 140, 280, NAVY, radius=12)
    s.t(530, 180, "▶", 28, CREAM, "bold", "mm")
    s.t(36, 80, title, 30, INK, "bold")
    s.rule(36, 200, 40)
    s.t(36, 230, "Directo  ·  18:00", 14, MUTED, "med")


def board(s, title):
    s.im.paste((244, 247, 251), (0, 0, s.im.width, s.im.height))
    s.t(24, 16, title, 16, INK, "bold")
    notes = ((28, 60, CREAM, "Idea"), (220, 48, WHITE, "Dato"), (400, 80, (255, 236, 240), "Riesgo"), (48, 210, WHITE, "Siguiente"), (250, 230, CREAM, "Dueño"))
    for x, y, color, label in notes:
        s.r(x, y, 170, 110, color, radius=8)
        s.r(x, y, 170, 6, NAVY if label != "Riesgo" else PINK)
        s.t(x + 14, y + 22, label, 14, INK, "semi")
        s.bars(x + 14, y + 50, [120, 90], h=4, gap=6)
    s.d.line([(200 * 2, 120 * 2), (250 * 2, 160 * 2), (280 * 2, 230 * 2)], fill=NAVY, width=3)


def site(s, title):
    s.r(0, 0, s.w, 36, SOFT)
    for i, color in enumerate((PINK, (232, 196, 92), (92, 168, 120))):
        s.r(16 + i * 16, 12, 10, 10, color, radius=5)
    s.r(80, 8, 280, 20, WHITE, radius=8)
    s.t(28, 64, title, 26, INK, "bold")
    s.t(28, 108, "Una página clara para el equipo.", 13, MUTED, "med")
    s.r(28, 148, 120, 32, NAVY, radius=8)
    s.t(88, 164, "Empezar", 12, CREAM, "semi", "mm")
    for i, label in enumerate(("Producto", "Precio", "Equipo")):
        x = 28 + i * 196
        s.r(x, 210, 180, 150, SOFT, radius=10)
        s.t(x + 14, 226, label, 14, INK, "semi")
        s.bars(x + 14, 258, [140, 100], h=5, gap=8)


def meme_caption(s, top, bottom):
    s.r(0, 0, s.w, 90, NAVY)
    s.t(s.w / 2, 45, top, 18, CREAM, "semi", "mm")
    s.r(0, 90, s.w, s.h - 180, CREAM)
    s.r(0, s.h - 90, s.w, 90, WHITE)
    s.t(s.w / 2, s.h - 45, bottom, 22, INK, "bold", "mm")


def meme_split(s, a, b):
    s.r(0, 0, s.w, s.h / 2, WHITE)
    s.r(0, s.h / 2, s.w, s.h / 2, NAVY)
    s.t(28, 40, a, 26, INK, "bold")
    s.rule(28, 100, 32)
    s.t(28, s.h / 2 + 50, b, 26, CREAM, "bold")


def dash(s, title):
    s.im.paste(SOFT, (0, 0, s.im.width, s.im.height))
    s.t(24, 18, title, 18, INK, "bold")
    for i, (num, label) in enumerate((("128", "Abiertas"), ("36", "Ganadas"), ("4.2", "Ciclo"))):
        x = 24 + i * 200
        s.r(x, 58, 184, 90, WHITE, radius=10)
        if i == 1:
            s.r(x, 58, 184, 4, PINK)
        s.t(x + 14, 72, num, 22, INK, "bold")
        s.t(x + 14, 106, label, 12, MUTED, "med")
    s.r(24, 168, s.w - 48, 200, WHITE, radius=10)
    heights = (40, 70, 55, 110, 90, 130)
    for i, h in enumerate(heights):
        s.r(48 + i * 90, 330 - h, 48, h, NAVY if i < 5 else PINK, radius=4)


def invoice(s, title):
    s.t(28, 24, title, 20, INK, "bold")
    s.t(28, 54, "Nº 1042  ·  Marzo", 12, MUTED, "med")
    s.rule(28, 80, 28)
    for i, (item, price) in enumerate((("Asesoría", "1.200"), ("Taller", "640"), ("Informe", "380"))):
        y = 110 + i * 48
        s.t(28, y, item, 14, INK, "med")
        s.t(s.w - 28, y, price, 14, INK, "semi", "rt")
        s.r(28, y + 28, s.w - 56, 1, LINE)
    s.r(28, 280, s.w - 56, 64, NAVY, radius=8)
    s.t(44, 300, "Total", 14, CREAM, "med")
    s.t(s.w - 44, 300, "2.220", 18, CREAM, "bold", "rt")


def okr(s, title):
    s.t(24, 20, title, 20, INK, "bold")
    for i, (goal, amt) in enumerate((("Ingresos", 0.72), ("Retención", 0.54), ("Equipo", 0.88))):
        y = 70 + i * 100
        s.r(24, y, s.w - 48, 84, SOFT, radius=10)
        s.t(40, y + 14, f"O{i + 1}   {goal}", 15, INK, "semi")
        s.r(40, y + 46, s.w - 80, 10, WHITE, radius=5)
        s.r(40, y + 46, int((s.w - 80) * amt), 10, PINK if i == 2 else NAVY, radius=5)


def lesson(s, title):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    kicker(s, 28, 28, "Lección 04")
    s.t(28, 52, title, 24, INK, "bold")
    s.rule(28, 92, 32)
    for i, item in enumerate(("Objetivo de la sesión", "Ejemplo guiado", "Práctica corta")):
        y = 120 + i * 80
        s.r(28, y, 36, 36, NAVY if i else PINK, radius=8)
        s.t(46, y + 18, str(i + 1), 14, CREAM, "bold", "mm")
        s.t(80, y + 8, item, 16, INK, "semi")


def certificate(s, name):
    s.im.paste(CREAM, (0, 0, s.im.width, s.im.height))
    s.d.rectangle([16 * 2, 16 * 2, (s.w - 16) * 2, (s.h - 16) * 2], outline=NAVY, width=3)
    s.t(s.w / 2, 48, "CERTIFICADO", 12, MUTED, "semi", "mt")
    s.t(s.w / 2, 110, name, 26, INK, "serif", "mt")
    s.rule(s.w / 2 - 20, 160, 40)
    s.t(s.w / 2, 190, "Ha completado el curso", 14, MUTED, "med", "mt")
    s.t(s.w / 2, 250, "Marzo 2026", 13, INK, "semi", "mt")


def schedule(s):
    s.t(20, 16, "Horario", 18, INK, "bold")
    days = ("L", "M", "X", "J", "V")
    for i, day in enumerate(days):
        x = 20 + i * 106
        s.t(x + 40, 52, day, 12, MUTED, "semi", "mt")
        s.r(x, 72, 96, 70, NAVY if i == 1 else SOFT, radius=8)
        s.r(x, 154, 96, 70, SOFT, radius=8)
        s.r(x, 236, 96, 70, CREAM if i == 3 else SOFT, radius=8)
    s.t(20, 330, "Aula 2  ·  Mañana", 13, MUTED, "med")


def rubric(s):
    s.t(20, 16, "Rúbrica", 18, INK, "bold")
    s.r(20, 52, s.w - 40, 28, NAVY)
    s.t(32, 58, "Criterio", 12, CREAM, "semi")
    for i, label in enumerate(("Claridad", "Fuentes", "Estructura", "Cierre")):
        y = 80 + i * 70
        if i % 2 == 0:
            s.r(20, y, s.w - 40, 70, SOFT)
        s.t(32, y + 22, label, 14, INK, "med")
        s.r(220, y + 26, 18, 18, WHITE, radius=4)
        s.r(260, y + 26, 18, 18, WHITE, radius=4)
        s.r(300, y + 26, 18, 18, PINK if i == 0 else WHITE, radius=4)


PEOPLE = [
    ("Elena Marín", "Dirección de producto", "Madrid"),
    ("Hugo Ferrer", "Consultoría", "Barcelona"),
    ("Nuria Vidal", "Estrategia de marca", "Valencia"),
    ("Pablo Ríos", "Datos", "Sevilla"),
    ("Marta León", "Marketing", "Bilbao"),
    ("Andrés Gil", "Operaciones", "Zaragoza"),
    ("Lucía Peña", "Investigación", "Málaga"),
    ("Sergio Costa", "Dirección general", "A Coruña"),
]


def render_one(cat, index, title, w, h):
    person = PEOPLE[index % len(PEOPLE)]
    if cat == "curriculum":
        s = Sheet(w, h, WHITE)
        [cv_side, cv_band, cv_min, cv_split][index % 4](s, *person)
        return s
    if cat == "presentacion":
        layouts = (
            lambda: (deck_title(Sheet(w, h), title.replace(" ", "\n") if len(title) > 18 else title, "Informe"),),
            lambda: (deck_agenda(Sheet(w, h, CREAM), title),),
            lambda: (deck_stats(Sheet(w, h), title),),
            lambda: (deck_chart(Sheet(w, h), title),),
        )
        # deck_title returns None after drawing on a sheet created inside. Redo cleanly.
    return None


# The lambda approach above is messy. Draw explicitly below.

def draw(cat, index, es, en, w, h):
    name, role, city = PEOPLE[index % len(PEOPLE)]
    if cat == "curriculum":
        s = Sheet(w, h, WHITE)
        [cv_side, cv_band, cv_min, cv_split][index % 4](s, name, role, city)
        return s
    if cat == "presentacion":
        kind = index % 4
        if kind == 0:
            s = Sheet(w, h, NAVY)
            deck_title(s, es.replace(" ", "\n", 1) if len(es) > 16 else es, "Informe")
            return s
        if kind == 1:
            s = Sheet(w, h, CREAM)
            deck_agenda(s, es)
            return s
        if kind == 2:
            s = Sheet(w, h, WHITE)
            deck_stats(s, es)
            return s
        s = Sheet(w, h, WHITE)
        deck_chart(s, es)
        return s
    if cat == "post-instagram":
        kind = index % 4
        if kind == 0:
            s = Sheet(w, h, CREAM)
            ig_quote(s, "Menos ruido.\nMás criterio.", name.split()[0])
            return s
        if kind == 1:
            s = Sheet(w, h, WHITE)
            ig_tips(s, "Tres pasos")
            return s
        if kind == 2:
            s = Sheet(w, h, NAVY)
            ig_stat(s, "32%", "más respuestas\neste mes")
            return s
        s = Sheet(w, h, WHITE)
        ig_grid(s, es)
        return s
    if cat == "story":
        kind = index % 3
        if kind == 0:
            s = Sheet(w, h, NAVY)
            story_hero(s, es.replace(" ", "\n", 1), "Jueves  ·  19:00")
            return s
        if kind == 1:
            s = Sheet(w, h, CREAM)
            story_steps(s, es)
            return s
        s = Sheet(w, h, WHITE)
        story_poll(s, "¿Lo vemos\nesta semana?")
        return s
    if cat == "youtube-thumb":
        s = Sheet(w, h, CREAM if index % 2 == 0 else WHITE)
        if index % 2 == 0:
            yt_title(s, es.replace(" ", "\n", 1), "Guía")
        else:
            yt_course(s, es.replace(" ", "\n", 1))
        return s
    if cat == "flyer":
        s = Sheet(w, h, WHITE if index % 2 else CREAM)
        if index % 2 == 0:
            flyer_event(s, es.replace(" ", "\n", 1), "12 de mayo", city)
        else:
            flyer_list(s, es)
        return s
    if cat == "cartel":
        s = Sheet(w, h, CREAM)
        poster(s, es.replace(" ", "\n", 1), "Programa")
        return s
    if cat == "logo":
        words = ("NORTE", "ALBA", "LUMEN", "CASA", "MIRA", "VELA", "SOLA")
        word = words[index % len(words)]
        kind = index % 3
        if kind == 0:
            s = Sheet(w, h, CREAM)
            logo_mark(s, word, word[0])
            return s
        if kind == 1:
            s = Sheet(w, h, WHITE)
            logo_word(s, word)
            return s
        s = Sheet(w, h, WHITE)
        logo_split(s, word, word[0])
        return s
    if cat == "invitacion":
        if index % 2 == 0:
            s = Sheet(w, h, CREAM)
            invite(s, "Invitación", name, "18 de junio  ·  " + city)
            return s
        s = Sheet(w, h, NAVY)
        invite_navy(s, "Cena", name, "Sala 2  ·  21:00")
        return s
    if cat == "doc":
        s = Sheet(w, h, WHITE)
        if index % 2 == 0:
            doc_page(s, "Documento", es)
        else:
            doc_table(s, es)
        return s
    if cat == "infografia":
        s = Sheet(w, h, CREAM if index % 2 == 0 else WHITE)
        if index % 2 == 0:
            info_steps(s, es)
        else:
            info_bars(s, es)
        return s
    if cat == "tarjeta-visita":
        kind = index % 3
        if kind == 0:
            s = Sheet(w, h, NAVY)
            card_navy(s, name, role)
            return s
        if kind == 1:
            s = Sheet(w, h, WHITE)
            card_white(s, name, role)
            return s
        s = Sheet(w, h, WHITE)
        card_split(s, name, name[0])
        return s
    if cat == "video-cover":
        if index % 2 == 0:
            s = Sheet(w, h, NAVY)
            video_cover(s, es.replace(" ", "\n", 1), "Episodio")
            return s
        s = Sheet(w, h, CREAM)
        video_light(s, es.replace(" ", "\n", 1))
        return s
    if cat == "pizarra":
        s = Sheet(w, h, (244, 247, 251))
        board(s, es)
        return s
    if cat == "sitio-web":
        s = Sheet(w, h, WHITE)
        site(s, es)
        return s
    if cat == "meme":
        tops = ("Cuando el plazo", "La reunión", "El informe", "El lunes", "El despliegue")
        bots = ("ya era ayer", "sigue en pie", "cabe en una página", "empieza suave", "salió limpio")
        if index % 2 == 0:
            s = Sheet(w, h, CREAM)
            meme_caption(s, tops[index % 5], bots[index % 5])
            return s
        s = Sheet(w, h, WHITE)
        meme_split(s, tops[index % 5], bots[index % 5])
        return s
    if cat == "negocio":
        kind = index % 3
        if kind == 0:
            s = Sheet(w, h, SOFT)
            dash(s, es)
            return s
        if kind == 1:
            s = Sheet(w, h, WHITE)
            invoice(s, es)
            return s
        s = Sheet(w, h, WHITE)
        okr(s, es)
        return s
    if cat == "educacion":
        kind = index % 4
        if kind == 0:
            s = Sheet(w, h, CREAM)
            lesson(s, es)
            return s
        if kind == 1:
            s = Sheet(w, h, CREAM)
            certificate(s, name)
            return s
        if kind == 2:
            s = Sheet(w, h, WHITE)
            schedule(s)
            return s
        s = Sheet(w, h, WHITE)
        rubric(s)
        return s
    raise SystemExit(cat)


ITEMS = {
    "curriculum": (420, 560, [
        ("01", "CV dirección de producto", "Product resume"),
        ("02", "CV consultoría", "Consulting resume"),
        ("03", "CV marca", "Brand resume"),
        ("04", "CV minimal", "Minimal resume"),
        ("05", "CV marketing", "Marketing resume"),
        ("06", "CV ejecutivo", "Executive resume"),
        ("07", "CV junior", "Junior resume"),
        ("08", "CV dirección general", "General management resume"),
    ]),
    "presentacion": (640, 360, [
        ("01", "Informe de apertura", "Opening report"),
        ("02", "Agenda de cuatro puntos", "Four-point agenda"),
        ("03", "Cifras del trimestre", "Quarterly figures"),
        ("04", "Serie de resultados", "Results series"),
        ("05", "Propuesta a inversores", "Investor proposal"),
        ("06", "Cierre de proyecto", "Project close"),
        ("07", "Plan de producto", "Product plan"),
        ("08", "Informe anual", "Annual report"),
        ("09", "Revisión de equipo", "Team review"),
    ]),
    "post-instagram": (480, 480, [
        ("01", "Cita de criterio", "Point of view"),
        ("02", "Carrusel de pasos", "Step carousel"),
        ("03", "Cifra del mes", "Figure of the month"),
        ("04", "Anuncio sobrio", "Quiet announcement"),
        ("05", "Cuadrícula de marca", "Brand grid"),
        ("06", "Nota breve", "Short note"),
        ("07", "Antes y después", "Before and after"),
        ("08", "Pregunta al equipo", "Question for the team"),
        ("09", "Tablero visual", "Visual board"),
    ]),
    "story": (360, 640, [
        ("01", "Cuenta atrás", "Countdown"),
        ("02", "Detrás del trabajo", "Behind the work"),
        ("03", "Aviso de sesión", "Session notice"),
        ("04", "Encuesta breve", "Short poll"),
        ("05", "Novedad", "New drop"),
        ("06", "Preguntas", "Questions"),
        ("07", "Oferta de plazo", "Limited offer"),
        ("08", "Resumen semanal", "Weekly recap"),
    ]),
    "youtube-thumb": (640, 360, [
        ("01", "Guía clara", "Clear guide"),
        ("02", "Reseña sobria", "Quiet review"),
        ("03", "Sesión en directo", "Live session"),
        ("04", "Título directo", "Direct title"),
        ("05", "Curso breve", "Short course"),
        ("06", "Pieza corta", "Short clip"),
        ("07", "Conversación", "Conversation"),
    ]),
    "flyer": (420, 560, [
        ("01", "Encuentro", "Gathering"),
        ("02", "Jornada de trabajo", "Work day"),
        ("03", "Taller", "Workshop"),
        ("04", "Jornada de puertas", "Open day"),
        ("05", "Programa", "Programme"),
        ("06", "Clase magistral", "Masterclass"),
    ]),
    "cartel": (400, 560, [
        ("01", "Ciclo de charlas", "Talk series"),
        ("02", "Programa de temporada", "Season programme"),
        ("03", "Exposición", "Exhibition"),
        ("04", "Charla técnica", "Technical talk"),
        ("05", "Semana de oficio", "Week of craft"),
    ]),
    "logo": (480, 480, [
        ("01", "Sello circular", "Round mark"),
        ("02", "Nombre solo", "Wordmark"),
        ("03", "Marca partida", "Split mark"),
        ("04", "Inicial en círculo", "Initial in a circle"),
        ("05", "Monograma", "Monogram"),
        ("06", "Bloque de marca", "Brand block"),
        ("07", "Nombre horizontal", "Horizontal name"),
    ]),
    "invitacion": (480, 360, [
        ("01", "Ceremonia", "Ceremony"),
        ("02", "Celebración", "Celebration"),
        ("03", "Cena", "Dinner"),
        ("04", "Encuentro familiar", "Family gathering"),
        ("05", "Cita de empresa", "Company reception"),
        ("06", "Networking", "Networking"),
    ]),
    "doc": (420, 560, [
        ("01", "Informe mensual", "Monthly report"),
        ("02", "Propuesta", "Proposal"),
        ("03", "Brief", "Brief"),
        ("04", "Acta", "Minutes"),
        ("05", "Guía interna", "Internal guide"),
        ("06", "Acuerdo breve", "Short agreement"),
        ("07", "Bienvenida al equipo", "Team welcome"),
    ]),
    "infografia": (420, 640, [
        ("01", "Cuatro pasos", "Four steps"),
        ("02", "Comparativa", "Comparison"),
        ("03", "Línea de tiempo", "Timeline"),
        ("04", "Dos columnas", "Two columns"),
        ("05", "Lista de control", "Checklist"),
        ("06", "Embudo", "Funnel"),
    ]),
    "tarjeta-visita": (560, 320, [
        ("01", "Tarjeta marina", "Navy card"),
        ("02", "Tarjeta clara", "Light card"),
        ("03", "Tarjeta con inicial", "Initial card"),
        ("04", "Tarjeta de fundador", "Founder card"),
        ("05", "Tarjeta de estudio", "Studio card"),
        ("06", "Tarjeta con contacto", "Contact card"),
        ("07", "Tarjeta doble", "Two-sided card"),
    ]),
    "video-cover": (640, 360, [
        ("01", "Portada de serie", "Series cover"),
        ("02", "Portada de podcast", "Podcast cover"),
        ("03", "Portada de curso", "Course cover"),
        ("04", "Portada de avance", "Trailer cover"),
        ("05", "Portada de directo", "Live cover"),
    ]),
    "pizarra": (640, 400, [
        ("01", "Lluvia de ideas", "Brainstorm"),
        ("02", "Hoja de ruta", "Roadmap"),
        ("03", "Sprint", "Sprint"),
        ("04", "Referencias", "References"),
        ("05", "Equipo", "Team"),
        ("06", "Recorrido de cliente", "Customer journey"),
    ]),
    "sitio-web": (640, 400, [
        ("01", "Página de arranque", "Launch page"),
        ("02", "Portafolio", "Portfolio"),
        ("03", "Academia", "Academy"),
        ("04", "Tienda sobria", "Quiet shop"),
        ("05", "Estudio", "Studio site"),
        ("06", "Precios", "Pricing"),
    ]),
    "meme": (480, 480, [
        ("01", "Pie de foto, arriba", "Top caption"),
        ("02", "Dos bandas", "Two bands"),
        ("03", "Frase corta", "Short line"),
        ("04", "Reunión", "The meeting"),
        ("05", "Plazo", "The deadline"),
    ]),
    "negocio": (640, 400, [
        ("01", "Panel de ventas", "Sales panel"),
        ("02", "Factura", "Invoice"),
        ("03", "Plan de negocio", "Business plan"),
        ("04", "Carta", "Menu"),
        ("05", "Catálogo", "Catalogue"),
        ("06", "Propuesta comercial", "Commercial proposal"),
        ("07", "Objetivos del trimestre", "Quarterly goals"),
    ]),
    "educacion": (560, 400, [
        ("01", "Ficha de curso", "Course sheet"),
        ("02", "Lección", "Lesson"),
        ("03", "Certificado", "Certificate"),
        ("04", "Tarjetas de repaso", "Review cards"),
        ("05", "Horario", "Schedule"),
        ("06", "Rúbrica", "Rubric"),
        ("07", "Programa intensivo", "Intensive syllabus"),
    ]),
}

SLUG = {
    "curriculum": "cv",
    "presentacion": "presentacion",
    "post-instagram": "publicacion",
    "story": "historia",
    "youtube-thumb": "miniatura",
    "flyer": "folleto",
    "cartel": "cartel",
    "logo": "logo",
    "invitacion": "invitacion",
    "doc": "documento",
    "infografia": "infografia",
    "tarjeta-visita": "tarjeta",
    "video-cover": "portada",
    "pizarra": "pizarra",
    "sitio-web": "sitio",
    "meme": "meme",
    "negocio": "empresa",
    "educacion": "clase",
}


def main():
    catalog = []
    kept = set()
    for cat, (w, h, rows) in ITEMS.items():
        for i, (num, es, en) in enumerate(rows):
            slug = f"{cat}-{num}-{SLUG[cat]}-{i + 1:02d}.png"
            path = OUT / slug
            draw(cat, i, es, en, w, h).save(path)
            kept.add(slug)
            catalog.append({
                "id": f"tpl-{cat}-{num}",
                "category": cat,
                "title": es,
                "titleEn": en,
                "width": w,
                "height": h,
                "file": f"thumbs/{slug}",
            })
    for old in OUT.glob("*.png"):
        if old.name not in kept:
            old.unlink()
    (OUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    print(f"miniaturas: {len(catalog)}")


if __name__ == "__main__":
    main()
