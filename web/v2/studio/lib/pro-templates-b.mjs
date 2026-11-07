/**
 * Plantillas profesionales: marketing, redes, vídeo, educación y web.
 */

import { circle, line, PALETTES as P, photo, rect, stack, text } from "./pro-kit.mjs";

const light = (p) => (p.accent === "#1E1B18" ? "#FFFFFF" : p.accent);

const EVENTS = [
  { k: "Festival de Jazz", s: "Tres noches de música en directo junto al mar", d: "12 — 14 JULIO", w: "Puerto de Valencia", tag: "MÚSICA" },
  { k: "Mercado de Primavera", s: "Productores locales, talleres y comida casera", d: "SÁBADO 25 ABRIL", w: "Plaza Mayor · 10:00", tag: "MERCADO" },
  { k: "Gran Inauguración", s: "Ven a conocer nuestro nuevo espacio y brinda con nosotros", d: "VIERNES 8 MAYO", w: "Calle Luna 14 · 19:00", tag: "APERTURA" },
  { k: "Clases de Yoga al aire libre", s: "Todos los niveles. Trae tu esterilla", d: "CADA DOMINGO", w: "Parque del Retiro · 9:00", tag: "BIENESTAR" },
];

function flyerPhotoTop(v) {
  const p = v.p;
  const W = 816;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 0, 0, W, 560, { fx: v.fx ?? 0.5, name: "Foto principal" }),
      rect(48, 500, 220, 56, p.accent, { radius: 28, name: "Etiqueta" }),
      text(v.c.tag, 48, 514, 220, { size: 18, bold: true, ls: 3, color: "#FFFFFF", align: "center", h: 30 }),
      text(v.c.k, 48, 600, 720, { font: "poppins", bold: true, size: 60, lh: 1.05, color: p.ink }),
      text(v.c.s, 48, 760, 600, { font: "lato", size: 22, lh: 1.45, color: p.muted }),
      line(48, 880, 720, p.soft, 2),
      text(v.c.d, 48, 910, 360, { size: 24, bold: true, color: p.accent }),
      text(v.c.w, 408, 912, 360, { font: "lato", size: 20, color: p.ink, align: "right" }),
    ],
  };
}

function flyerOverlay(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 816, 1056, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 816, 1056, "", { gradient: { from: "rgba(0,0,0,0.1)", to: "rgba(0,0,0,0.82)", angle: 180 }, name: "Degradado" }),
      text(v.c.tag, 60, 560, 696, { size: 20, bold: true, ls: 6, color: light(p) }),
      text(v.c.k.toUpperCase(), 60, 600, 696, { font: "bebas", size: 120, lh: 0.95, color: "#FFFFFF" }),
      text(v.c.s, 60, 840, 620, { font: "lato", size: 22, lh: 1.4, color: "#FFFFFF", opacity: 0.9 }),
      text(`${v.c.d}  ·  ${v.c.w}`, 60, 960, 696, { size: 20, bold: true, color: "#FFFFFF" }),
    ],
  };
}

function flyerFrame(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      rect(36, 36, 744, 984, "", { stroke: p.ink, sw: 3, name: "Marco" }),
      text(v.c.d, 70, 80, 676, { size: 22, bold: true, ls: 5, color: p.accent, align: "center" }),
      text(v.c.k, 70, 130, 676, { font: "dmserif", size: 74, lh: 1.02, color: p.ink, align: "center" }),
      photo(v.ph, 118, 340, 580, 480, { fx: v.fx ?? 0.5, radius: 290, name: "Foto en arco" }),
      text(v.c.s, 100, 850, 616, { font: "lato", size: 20, lh: 1.45, color: p.muted, align: "center" }),
      text(v.c.w, 70, 950, 676, { size: 18, bold: true, ls: 2, color: p.ink, align: "center" }),
    ],
  };
}

const POSTERS = [
  { k: "Exposición Luz y Sombra", s: "Fotografía contemporánea", d: "Del 3 al 30 de octubre", tag: "MUSEO DE LA CIUDAD" },
  { k: "Noche de Cine", s: "Clásicos bajo las estrellas", d: "Jueves · 22:00", tag: "TERRAZA SUR" },
  { k: "Carrera Solidaria 10K", s: "Corre por una buena causa", d: "Domingo 15 de marzo", tag: "INSCRIPCIÓN ABIERTA" },
  { k: "Concierto Acústico", s: "Una velada íntima con artistas locales", d: "Sábado 21 · 20:30", tag: "SALA ÁMBAR" },
];

function posterBold(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      photo(v.ph, 80, 80, 920, 820, { fx: v.fx ?? 0.5, radius: 24, name: "Foto" }),
      text(v.c.k.toUpperCase(), 80, 950, 920, { font: "bebas", size: 140, lh: 0.92, color: "#FFFFFF" }),
      text(`${v.c.s} — ${v.c.d}`, 80, 1240, 920, { font: "lato", size: 30, color: "#FFFFFF" }),
      text(v.c.tag, 80, 1320, 920, { size: 22, bold: true, ls: 5, color: p.dark }),
    ],
  };
}

function posterEditorial(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      text(v.c.tag, 80, 90, 920, { size: 22, bold: true, ls: 6, color: p.accent }),
      text(v.c.k, 80, 140, 920, { font: "abril", size: 104, lh: 1, color: p.ink }),
      photo(v.ph, 80, 520, 920, 700, { fx: v.fx ?? 0.5, name: "Foto" }),
      text(v.c.s, 80, 1260, 600, { font: "lato", size: 30, italic: true, color: p.muted }),
      text(v.c.d, 620, 1262, 380, { size: 26, bold: true, color: p.ink, align: "right" }),
    ],
  };
}

function posterFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1080, 1440, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 1080, 1440, "", { gradient: { from: "rgba(0,0,0,0.65)", to: "rgba(0,0,0,0)", angle: 180 }, name: "Velo" }),
      text(v.c.tag, 90, 110, 900, { size: 24, bold: true, ls: 6, color: "#FFFFFF", align: "center" }),
      text(v.c.k, 90, 170, 900, { font: "dmserif", size: 110, lh: 1, color: "#FFFFFF", align: "center" }),
      rect(390, 1250, 300, 80, "#FFFFFF", { radius: 40, name: "Botón" }),
      text(v.c.d, 390, 1272, 300, { size: 22, bold: true, color: p.dark, align: "center", h: 36 }),
    ],
  };
}

const INFOS = [
  { k: "5 hábitos para dormir mejor", items: ["Horario fijo", "Pantallas fuera", "Luz tenue", "Cena ligera", "Respira"], tag: "SALUD" },
  { k: "Cómo lanzar tu tienda online", items: ["Elige nicho", "Crea catálogo", "Fotos cuidadas", "Pasarela de pago", "Promociona"], tag: "NEGOCIO" },
  { k: "Guía rápida de reciclaje", items: ["Amarillo: envases", "Azul: papel", "Verde: vidrio", "Marrón: orgánico", "Punto limpio"], tag: "MEDIO AMBIENTE" },
  { k: "Viajar ligero en 5 pasos", items: ["Lista previa", "Ropa combinable", "Neceser mini", "Digitaliza", "Deja hueco"], tag: "VIAJES" },
];

function infoSteps(v) {
  const p = v.p;
  const L = [
    photo(v.ph, 0, 0, 800, 520, { fx: v.fx ?? 0.5, name: "Foto de cabecera" }),
    rect(0, 360, 800, 160, "", { gradient: { from: "rgba(0,0,0,0)", to: p.bg, angle: 180 }, name: "Fundido" }),
    text(v.c.tag, 60, 560, 680, { size: 18, bold: true, ls: 5, color: p.accent, align: "center" }),
    text(v.c.k, 60, 600, 680, { font: "poppins", bold: true, size: 52, lh: 1.1, color: p.ink, align: "center" }),
  ];
  v.c.items.forEach((item, i) => {
    const y = 800 + i * 230;
    L.push(circle(130, y + 60, 60, p.accent, { name: `Paso ${i + 1}` }));
    L.push(text(String(i + 1), 70, y + 25, 120, { font: "poppins", bold: true, size: 50, color: "#FFFFFF", align: "center" }));
    L.push(text(item, 230, y + 15, 510, { size: 34, bold: true, color: p.ink }));
    L.push(text("Un consejo breve y práctico que puedes aplicar desde hoy mismo.", 230, y + 70, 510, { font: "lato", size: 20, lh: 1.4, color: p.muted }));
  });
  L.push(text("Fuente: equipo ORVUPI", 60, 1930, 680, { font: "lato", size: 16, color: p.muted, align: "center" }));
  return { bg: p.bg, layers: L };
}

function infoStats(v) {
  const p = v.p;
  const nums = ["72 %", "3x", "15 min", "+40 %", "1 de 3"];
  const L = [
    rect(0, 0, 800, 560, p.dark, { name: "Cabecera" }),
    text(v.c.tag, 60, 90, 680, { size: 18, bold: true, ls: 5, color: light(p) }),
    text(v.c.k, 60, 130, 680, { font: "dmserif", size: 64, lh: 1.05, color: "#FFFFFF" }),
    photo(v.ph, 60, 380, 680, 360, { fx: v.fx ?? 0.5, radius: 20, name: "Foto" }),
  ];
  v.c.items.forEach((item, i) => {
    const y = 800 + i * 220;
    L.push(rect(60, y, 680, 190, p.soft, { radius: 20, name: "Tarjeta" }));
    L.push(text(nums[i], 90, y + 45, 250, { font: "poppins", bold: true, size: 64, color: p.accent }));
    L.push(text(item, 360, y + 50, 350, { size: 28, bold: true, color: p.ink }));
    L.push(text("Dato orientativo para ilustrar", 360, y + 100, 350, { font: "lato", size: 18, color: p.muted }));
  });
  return { bg: p.bg, layers: L };
}

function infoTimeline(v) {
  const p = v.p;
  const L = [
    text(v.c.tag, 60, 80, 680, { size: 18, bold: true, ls: 5, color: p.accent }),
    text(v.c.k, 60, 120, 680, { font: "poppins", bold: true, size: 54, lh: 1.08, color: p.ink }),
    photo(v.ph, 60, 330, 680, 420, { fx: v.fx ?? 0.5, radius: 24, name: "Foto" }),
    rect(126, 820, 8, 1080, p.soft, { name: "Línea de tiempo" }),
  ];
  v.c.items.forEach((item, i) => {
    const y = 840 + i * 210;
    L.push(circle(130, y + 30, 26, p.accent, { name: "Hito" }));
    L.push(text(item, 190, y, 550, { size: 32, bold: true, color: p.ink }));
    L.push(text("Explica este paso en una o dos frases claras.", 190, y + 55, 550, { font: "lato", size: 20, color: p.muted }));
  });
  return { bg: p.bg, layers: L };
}

const INVITES = [
  { k: "Laura & Miguel", s: "Tenemos el placer de invitarte a nuestra boda", d: "Sábado 12 de septiembre de 2027", w: "Finca El Olivar · 18:00", tag: "NOS CASAMOS" },
  { k: "¡Leo cumple 5!", s: "Ven a celebrarlo con juegos, tarta y mucha diversión", d: "Domingo 7 de junio · 12:00", w: "Calle Sol 4, Granada", tag: "CUMPLEAÑOS" },
  { k: "Bautizo de Alma", s: "Acompáñanos en un día muy especial", d: "Sábado 18 de abril · 11:30", w: "Iglesia de San Juan", tag: "CELEBRACIÓN" },
  { k: "Cena de Navidad", s: "Brindemos juntos por un gran año", d: "Viernes 18 de diciembre · 21:00", w: "Restaurante Ámbar", tag: "EMPRESA" },
];

function inviteScript(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      rect(30, 30, 690, 990, "", { stroke: p.accent, sw: 2, name: "Marco" }),
      photo(v.ph, 175, 90, 400, 400, { fx: v.fx ?? 0.5, radius: 200, name: "Foto" }),
      text(v.c.tag, 60, 530, 630, { size: 16, bold: true, ls: 6, color: p.accent, align: "center" }),
      text(v.c.k, 60, 565, 630, { font: "greatvibes", size: 84, lh: 1.1, color: p.ink, align: "center" }),
      text(v.c.s, 100, 700, 550, { font: "lato", size: 20, lh: 1.5, color: p.muted, align: "center" }),
      line(325, 800, 100, p.accent, 2),
      text(v.c.d, 60, 830, 630, { font: "dmserif", size: 26, color: p.ink, align: "center" }),
      text(v.c.w, 60, 880, 630, { font: "lato", size: 18, color: p.muted, align: "center" }),
    ],
  };
}

function inviteFun(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      circle(640, 120, 160, p.soft, { opacity: 0.5, name: "Círculo" }),
      circle(80, 980, 200, p.soft, { opacity: 0.4, name: "Círculo" }),
      rect(60, 60, 630, 930, "#FFFFFF", { radius: 32, name: "Tarjeta" }),
      photo(v.ph, 100, 100, 550, 420, { fx: v.fx ?? 0.5, radius: 22, name: "Foto" }),
      text(v.c.k, 90, 560, 570, { font: "poppins", bold: true, size: 56, lh: 1.08, color: p.ink, align: "center" }),
      text(v.c.s, 110, 710, 530, { font: "lato", size: 20, lh: 1.45, color: p.muted, align: "center" }),
      rect(150, 830, 450, 64, p.accent, { radius: 32, name: "Fecha" }),
      text(v.c.d, 150, 848, 450, { size: 18, bold: true, color: "#FFFFFF", align: "center", h: 30 }),
      text(v.c.w, 90, 920, 570, { font: "lato", size: 18, color: p.ink, align: "center" }),
    ],
  };
}

function inviteFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 750, 1050, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 750, 1050, "rgba(0,0,0,0.45)", { name: "Velo" }),
      text(v.c.tag, 60, 300, 630, { size: 18, bold: true, ls: 6, color: "#FFFFFF", align: "center" }),
      text(v.c.k, 60, 350, 630, { font: "dmserif", size: 76, lh: 1.05, color: "#FFFFFF", align: "center" }),
      text(v.c.s, 100, 560, 550, { font: "lato", size: 22, lh: 1.45, color: "#FFFFFF", align: "center" }),
      text(`${v.c.d}\n${v.c.w}`, 60, 820, 630, { size: 20, bold: true, lh: 1.6, color: "#FFFFFF", align: "center" }),
    ],
  };
}

const SOCIAL = [
  { k: "Nueva colección", s: "Diseños pensados para durar", cta: "Descúbrela", tag: "@estudio.lumbre" },
  { k: "-30 % este finde", s: "En toda la tienda online", cta: "Comprar ahora", tag: "OFERTA" },
  { k: "Receta del día", s: "Bowl de quinoa con verduras asadas", cta: "Guarda la receta", tag: "COCINA" },
  { k: "Abrimos mañana", s: "Te esperamos con café gratis", cta: "Calle Luna 14", tag: "NOVEDAD" },
  { k: "Consejos de viaje", s: "Lo que nadie te cuenta de Lisboa", cta: "Desliza", tag: "VIAJES" },
  { k: "Lunes de motivación", s: "Pequeños pasos, grandes cambios", cta: "Comparte", tag: "INSPIRACIÓN" },
];

function igPhotoCard(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 60, 60, 960, 860, { fx: v.fx ?? 0.5, radius: 28, name: "Foto" }),
      text(v.c.tag, 60, 970, 960, { size: 22, bold: true, ls: 4, color: p.accent }),
      text(v.c.k, 60, 1010, 960, { font: "poppins", bold: true, size: 76, lh: 1.05, color: p.ink }),
      text(v.c.s, 60, 1120, 700, { font: "lato", size: 30, color: p.muted }),
      rect(760, 1200, 260, 80, p.accent, { radius: 40, name: "Botón" }),
      text(v.c.cta, 760, 1222, 260, { size: 22, bold: true, color: "#FFFFFF", align: "center", h: 36 }),
    ],
  };
}

function igFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1080, 1350, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 650, 1080, 700, "", { gradient: { from: "rgba(0,0,0,0)", to: "rgba(0,0,0,0.8)", angle: 180 }, name: "Degradado" }),
      text(v.c.tag, 80, 960, 920, { size: 24, bold: true, ls: 6, color: light(p) }),
      text(v.c.k, 80, 1000, 920, { font: "dmserif", size: 100, lh: 1, color: "#FFFFFF" }),
      text(v.c.s, 80, 1200, 920, { font: "lato", size: 32, color: "#FFFFFF", opacity: 0.9 }),
    ],
  };
}

function igSplit(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      photo(v.ph, 0, 0, 1080, 760, { fx: v.fx ?? 0.5, name: "Foto" }),
      text(v.c.k.toUpperCase(), 70, 810, 940, { font: "bebas", size: 150, lh: 0.95, color: "#FFFFFF" }),
      text(v.c.s, 70, 1110, 940, { font: "lato", size: 34, color: "#FFFFFF" }),
      text(`${v.c.cta} →`, 70, 1220, 940, { size: 28, bold: true, color: p.dark }),
    ],
  };
}

function storyFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1080, 1920, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 1000, 1080, 920, "", { gradient: { from: "rgba(0,0,0,0)", to: "rgba(0,0,0,0.85)", angle: 180 }, name: "Degradado" }),
      text(v.c.tag, 90, 1300, 900, { size: 30, bold: true, ls: 6, color: light(p) }),
      text(v.c.k, 90, 1360, 900, { font: "poppins", bold: true, size: 104, lh: 1.02, color: "#FFFFFF" }),
      rect(90, 1660, 420, 100, "#FFFFFF", { radius: 50, name: "Botón" }),
      text(v.c.cta, 90, 1688, 420, { size: 30, bold: true, color: p.dark, align: "center", h: 46 }),
    ],
  };
}

function storyCard(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      text(v.c.tag, 90, 170, 900, { size: 30, bold: true, ls: 6, color: p.accent, align: "center" }),
      text(v.c.k, 90, 230, 900, { font: "dmserif", size: 110, lh: 1.02, color: p.ink, align: "center" }),
      photo(v.ph, 90, 560, 900, 1000, { fx: v.fx ?? 0.5, radius: 40, name: "Foto" }),
      text(v.c.s, 90, 1620, 900, { font: "lato", size: 38, color: p.muted, align: "center" }),
      text(`${v.c.cta} ↑`, 90, 1740, 900, { size: 32, bold: true, color: p.accent, align: "center" }),
    ],
  };
}

function storyCollage(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      photo(v.ph, 90, 140, 900, 700, { fx: v.fx ?? 0.5, radius: 30, name: "Foto 1" }),
      photo(v.ph2, 90, 880, 440, 520, { radius: 30, name: "Foto 2" }),
      rect(550, 880, 440, 520, "#FFFFFF", { radius: 30, name: "Tarjeta" }),
      text(v.c.k, 580, 940, 380, { font: "poppins", bold: true, size: 56, lh: 1.08, color: p.ink }),
      text(v.c.s, 580, 1200, 380, { font: "lato", size: 28, lh: 1.35, color: p.muted }),
      text(v.c.tag, 90, 1500, 900, { font: "bebas", size: 120, color: "#FFFFFF", align: "center" }),
      text(v.c.cta, 90, 1680, 900, { size: 34, bold: true, color: p.dark, align: "center" }),
    ],
  };
}

const YT = [
  { k: "PROBÉ ESTO 30 DÍAS", s: "y pasó esto…", tag: "RETO" },
  { k: "RUTA SECRETA", s: "Islandia en 7 días", tag: "VLOG" },
  { k: "5 ERRORES", s: "que arruinan tu café", tag: "TUTORIAL" },
  { k: "MI SETUP 2027", s: "Escritorio minimalista", tag: "TECH" },
];

function ytFace(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      photo(v.ph, 680, 0, 600, 720, { fx: v.fx ?? 0.5, fy: 0.3, name: "Foto" }),
      rect(0, 0, 760, 720, p.accent, { name: "Bloque" }),
      text(v.c.k, 60, 150, 680, { font: "bebas", size: 150, lh: 0.92, color: "#FFFFFF", effect: "sombra" }),
      rect(60, 470, 560, 90, p.dark, { radius: 12, name: "Etiqueta" }),
      text(v.c.s, 60, 487, 560, { size: 38, bold: true, color: "#FFFFFF", align: "center", h: 56 }),
    ],
  };
}

function ytFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1280, 720, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 1280, 720, "", { gradient: { from: "rgba(0,0,0,0.75)", to: "rgba(0,0,0,0)", angle: 90 }, name: "Degradado" }),
      rect(60, 70, 170, 54, p.accent, { radius: 8, name: "Etiqueta" }),
      text(v.c.tag, 60, 82, 170, { size: 22, bold: true, color: "#FFFFFF", align: "center", h: 32 }),
      text(v.c.k, 60, 170, 760, { font: "bebas", size: 160, lh: 0.9, color: "#FFFFFF" }),
      text(v.c.s, 60, 500, 760, { font: "poppins", bold: true, size: 48, color: light(p) }),
    ],
  };
}

function ytBox(v) {
  const p = v.p;
  return {
    bg: "#FFFFFF",
    layers: [
      photo(v.ph, 0, 0, 1280, 720, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(60, 380, 900, 280, p.accent, { radius: 18, rotation: -2, name: "Caja" }),
      text(v.c.k, 90, 400, 840, { font: "bebas", size: 130, lh: 0.95, color: "#FFFFFF", rotation: -2 }),
      text(v.c.s, 90, 540, 840, { size: 44, bold: true, color: p.dark, rotation: -2 }),
    ],
  };
}

const COVERS = [
  { k: "Podcast Ideas Claras", s: "Episodio 12 · Cómo decidir mejor", tag: "PODCAST" },
  { k: "Viaje a la costa", s: "Un fin de semana entre faros y calas", tag: "VLOG" },
  { k: "Cocina en 15 minutos", s: "Recetas rápidas para diario", tag: "SERIE" },
  { k: "Webinar de marca", s: "Construye una identidad que se recuerde", tag: "EN DIRECTO" },
];

function cover16(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 960, 80, 880, 920, { fx: v.fx ?? 0.5, radius: 36, name: "Foto" }),
      text(v.c.tag, 120, 300, 760, { size: 28, bold: true, ls: 8, color: p.accent }),
      text(v.c.k, 120, 360, 780, { font: "dmserif", size: 120, lh: 1, color: p.ink }),
      text(v.c.s, 120, 700, 760, { font: "lato", size: 38, lh: 1.35, color: p.muted }),
    ],
  };
}

function coverFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1920, 1080, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 1920, 1080, "rgba(0,0,0,0.4)", { name: "Velo" }),
      text(v.c.tag, 160, 330, 1600, { size: 30, bold: true, ls: 10, color: "#FFFFFF", align: "center" }),
      text(v.c.k, 160, 390, 1600, { font: "poppins", bold: true, size: 130, lh: 1.02, color: "#FFFFFF", align: "center" }),
      text(v.c.s, 160, 720, 1600, { font: "lato", size: 42, color: "#FFFFFF", align: "center" }),
    ],
  };
}

function videoLower(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1920, 1080, { fx: v.fx ?? 0.5, name: "Fotograma" }),
      rect(100, 780, 1000, 180, p.accent, { radius: 20, name: "Rótulo" }),
      text(v.c.k, 140, 805, 920, { font: "poppins", bold: true, size: 64, color: "#FFFFFF" }),
      text(v.c.s, 140, 895, 920, { font: "lato", size: 32, color: "#FFFFFF" }),
      text(v.c.tag, 1500, 90, 320, { size: 28, bold: true, ls: 6, color: "#FFFFFF", align: "right" }),
    ],
  };
}

function videoIntro(v) {
  const p = v.p;
  return {
    bg: p.accent,
    layers: [
      circle(960, 420, 260, "#FFFFFF", { opacity: 0.2, name: "Halo" }),
      photo(v.ph, 760, 220, 400, 400, { fx: v.fx ?? 0.5, radius: 200, name: "Foto" }),
      text(v.c.k, 160, 690, 1600, { font: "poppins", bold: true, size: 96, color: "#FFFFFF", align: "center" }),
      text(v.c.s, 160, 830, 1600, { font: "lato", size: 38, color: "#FFFFFF", align: "center" }),
    ],
  };
}

function board(v) {
  const p = v.p;
  const notes = [["#FDE68A", "Ideas"], ["#BBF7D0", "Hacer"], ["#BFDBFE", "Hecho"]];
  const L = [
    text(v.c.k, 100, 70, 1200, { font: "poppins", bold: true, size: 64, color: "#0F172A" }),
    text(v.c.s, 100, 170, 1200, { font: "lato", size: 28, color: "#475569" }),
    photo(v.ph, 1400, 70, 420, 300, { fx: v.fx ?? 0.5, radius: 18, name: "Referencia" }),
  ];
  notes.forEach(([fill, title], i) => {
    const x = 100 + i * 430;
    L.push(rect(x, 300, 400, 80, "#FFFFFF", { radius: 16, name: "Columna" }));
    L.push(text(title, x + 24, 318, 352, { size: 30, bold: true, color: "#0F172A" }));
    for (let n = 0; n < 2; n += 1) {
      const y = 410 + n * 290;
      L.push(rect(x, y, 400, 260, fill, { radius: 6, rotation: n % 2 ? 1.5 : -1.5, name: "Nota" }));
      L.push(text(["Entrevistar a 5 clientes", "Prototipo de portada", "Revisar textos", "Fotos del producto", "Lanzar campaña", "Medir resultados"][i * 2 + n], x + 28, y + 30, 344, { font: "lato", size: 30, lh: 1.3, color: "#1F2937", rotation: n % 2 ? 1.5 : -1.5 }));
    }
  });
  L.push(rect(1400, 410, 420, 550, "#FFFFFF", { radius: 16, name: "Panel" }));
  L.push(text("Notas del equipo", 1430, 440, 360, { size: 28, bold: true, color: "#0F172A" }));
  L.push(text("• Mantener el tono cercano\n• Usar fotos reales\n• Revisar el viernes", 1430, 500, 360, { font: "lato", size: 24, lh: 1.6, color: "#475569" }));
  return { bg: "#F4F7FB", layers: L };
}

const BOARDS = [
  { k: "Lluvia de ideas", s: "Campaña de primavera" },
  { k: "Mapa del proyecto", s: "Rediseño de la web" },
  { k: "Retrospectiva", s: "Sprint 14 · equipo producto" },
  { k: "Plan de clase", s: "Unidad 3 · ecosistemas" },
];

function webLanding(v) {
  const p = v.p;
  const L = [
    text(v.c.brand, 80, 40, 400, { font: "poppins", bold: true, size: 30, color: p.ink }),
    text("Inicio     Servicios     Precios     Contacto", 560, 46, 640, { font: "lato", size: 20, color: p.muted, align: "right" }),
    text(v.c.k, 80, 200, 600, { font: "poppins", bold: true, size: 68, lh: 1.05, color: p.ink }),
    text(v.c.s, 80, 470, 560, { font: "lato", size: 24, lh: 1.5, color: p.muted }),
    rect(80, 620, 260, 72, p.accent, { radius: 36, name: "Botón" }),
    text("Empezar gratis", 80, 640, 260, { size: 22, bold: true, color: "#FFFFFF", align: "center", h: 34 }),
    photo(v.ph, 700, 160, 500, 600, { fx: v.fx ?? 0.5, radius: 32, name: "Foto principal" }),
    rect(0, 880, 1280, 520, p.soft, { name: "Sección" }),
    text("Por qué elegirnos", 80, 940, 1120, { font: "poppins", bold: true, size: 44, color: p.ink, align: "center" }),
  ];
  ["Rápido", "Seguro", "Cercano"].forEach((t, i) => {
    const x = 80 + i * 380;
    L.push(rect(x, 1050, 350, 280, "#FFFFFF", { radius: 20, name: "Tarjeta" }));
    L.push(circle(x + 60, 1110, 30, p.accent, { name: "Icono" }));
    L.push(text(t, x + 30, 1160, 290, { size: 28, bold: true, color: p.ink }));
    L.push(text("Una frase que explica el beneficio de forma clara.", x + 30, 1210, 290, { font: "lato", size: 19, lh: 1.45, color: p.muted }));
  });
  L.push(photo(v.ph2, 80, 1450, 540, 300, { radius: 24, name: "Foto 2" }));
  L.push(text("Hablemos de tu proyecto", 680, 1490, 520, { font: "dmserif", size: 48, lh: 1.1, color: p.ink }));
  L.push(text("hola@ejemplo.es", 680, 1640, 520, { size: 24, bold: true, color: p.accent }));
  return { bg: "#FFFFFF", layers: L };
}

function webPortfolio(v) {
  const p = v.p;
  const L = [
    photo(v.ph, 0, 0, 1280, 820, { fx: v.fx ?? 0.5, name: "Foto de cabecera" }),
    rect(0, 0, 1280, 820, "rgba(0,0,0,0.45)", { name: "Velo" }),
    text(v.c.brand.toUpperCase(), 80, 50, 600, { size: 22, bold: true, ls: 6, color: "#FFFFFF" }),
    text(v.c.k, 80, 330, 1120, { font: "dmserif", size: 92, lh: 1.02, color: "#FFFFFF" }),
    text(v.c.s, 80, 560, 900, { font: "lato", size: 28, color: "#FFFFFF" }),
    text("Trabajos recientes", 80, 900, 1120, { font: "poppins", bold: true, size: 40, color: p.ink }),
  ];
  [v.ph2, v.ph3, v.ph4].forEach((ph, i) => {
    const x = 80 + i * 380;
    L.push(photo(ph, x, 980, 350, 420, { radius: 14, name: `Proyecto ${i + 1}` }));
    L.push(text(["Identidad", "Editorial", "Campaña"][i], x, 1420, 350, { size: 24, bold: true, color: p.ink }));
  });
  L.push(rect(80, 1560, 1120, 160, p.accent, { radius: 24, name: "Llamada" }));
  L.push(text("¿Trabajamos juntos? Escríbeme →", 120, 1610, 1040, { font: "poppins", bold: true, size: 36, color: "#FFFFFF" }));
  return { bg: p.bg, layers: L };
}

const WEBS = [
  { brand: "Lumbre", k: "Tu café de especialidad, en casa cada semana", s: "Seleccionamos y tostamos granos de pequeños productores." },
  { brand: "Norte Studio", k: "Espacios que se sienten como hogar", s: "Arquitectura e interiorismo con mirada sostenible." },
  { brand: "Mueve", k: "Fisioterapia que te devuelve el movimiento", s: "Sesiones personalizadas y seguimiento online." },
  { brand: "Ana Vidal", k: "Fotografía con alma para marcas valientes", s: "Retrato, producto y campañas." },
];

const MEMES = [
  { top: "CUANDO DICES «SOLO UN EPISODIO»", bottom: "Y YA SON LAS 3 AM" },
  { top: "YO EL LUNES", bottom: "YO EL VIERNES" },
  { top: "EL CAFÉ DE LA MAÑANA", bottom: "MI ÚNICA RELACIÓN ESTABLE" },
  { top: "CUANDO EL WIFI VUELVE", bottom: "TODO VUELVE A TENER SENTIDO" },
];

function bottomText(value) {
  const layer = text(value, 40, 0, 1000, { font: "bebas", size: 104, lh: 1, color: "#FFFFFF", align: "center", effect: "sombra" });
  layer.y = 1080 - 40 - layer.h;
  return layer;
}

function memeClassic(v) {
  return {
    bg: "#000000",
    layers: [
      photo(v.ph, 0, 0, 1080, 1080, { fx: v.fx ?? 0.5, name: "Imagen" }),
      text(v.c.top, 40, 40, 1000, { font: "bebas", size: 104, lh: 1, color: "#FFFFFF", align: "center", effect: "sombra" }),
      bottomText(v.c.bottom),
    ],
  };
}

function memeModern(v) {
  return {
    bg: "#FFFFFF",
    layers: [
      text(`${v.c.top.charAt(0)}${v.c.top.slice(1).toLowerCase()}…`, 50, 40, 980, { font: "poppins", bold: true, size: 54, lh: 1.2, color: "#111111" }),
      photo(v.ph, 0, 280, 1080, 800, { fx: v.fx ?? 0.5, name: "Imagen" }),
    ],
  };
}

function memeSplit(v) {
  const p = v.p;
  return {
    bg: "#FFFFFF",
    layers: [
      photo(v.ph, 0, 0, 540, 540, { fx: v.fx ?? 0.5, name: "Imagen 1" }),
      photo(v.ph2, 0, 540, 540, 540, { name: "Imagen 2" }),
      rect(540, 0, 540, 540, p.soft, { name: "Fondo 1" }),
      text(v.c.top, 580, 200, 460, { font: "poppins", bold: true, size: 44, lh: 1.15, color: p.ink }),
      text(v.c.bottom, 580, 740, 460, { font: "poppins", bold: true, size: 44, lh: 1.15, color: p.ink }),
    ],
  };
}

function build(cat, preset, title, fn, v) {
  const spec = fn(v);
  return { category: cat, preset, title, bg: spec.bg, layers: stack(spec.layers) };
}

function each(out, cat, preset, list, copies, pals, labelOf) {
  list.forEach(([ln, fn, phs], li) => {
    phs.forEach((ph, k) => {
      const c = copies[(k + li) % copies.length];
      const v = { p: pals[(li * 3 + k) % pals.length], c, ph: Array.isArray(ph) ? ph[0] : ph, fx: Array.isArray(ph) ? ph[1] : undefined, ph2: phs[(k + 1) % phs.length], ph3: phs[(k + 2) % phs.length], ph4: phs[(k + 3) % phs.length] };
      if (Array.isArray(v.ph2)) v.ph2 = v.ph2[0];
      if (Array.isArray(v.ph3)) v.ph3 = v.ph3[0];
      if (Array.isArray(v.ph4)) v.ph4 = v.ph4[0];
      out.push(build(cat, preset, `${labelOf(c)} · ${ln}`, fn, v));
    });
  });
}

export function marketingTemplates() {
  const out = [];
  const pals = [P.terracota, P.noche, P.violeta, P.salvia, P.melocoton, P.carbon, P.azul, P.rosa, P.oceano, P.limon, P.bosque, P.arena];
  each(out, "flyer", "flyer", [["Foto arriba", flyerPhotoTop, [39, 225, 452, 1058]], ["Impacto", flyerOverlay, [1082, 429, 158, 1043]], ["Marco", flyerFrame, [453, 488, 815, 1036]]], EVENTS, pals, (c) => c.k);
  each(out, "cartel", "poster", [["Bloque", posterBold, [1069, 815, 1058, 39]], ["Editorial", posterEditorial, [43, 1067, 177, 1082]], ["Foto completa", posterFull, [740, 57, 948, 486]]], POSTERS, pals, (c) => c.k);
  each(out, "infografia", "info", [["Pasos", infoSteps, [1015, 0, 1080, 1039]], ["Datos", infoStats, [431, 180, 1050, 49]], ["Cronología", infoTimeline, [1062, 1, 976, 211]]], INFOS, pals, (c) => c.k);
  each(out, "invitacion", "invite", [["Caligrafía", inviteScript, [1068, 828, 407, 1080]], ["Alegre", inviteFun, [452, 453, 659, 815]], ["Foto", inviteFull, [855, 158, 21, 828]]], INVITES, pals, (c) => c.k);
  each(out, "post-instagram", "ig", [["Tarjeta", igPhotoCard, [21, 1068, 674, 1025]], ["Foto completa", igFull, [1080, 237, 870, 64]], ["Bloque", igSplit, [292, 659, 1072, 1039]], ["Revista", igPhotoCard, [184, 1012, 312, 403]]], SOCIAL, pals, (c) => c.k);
  each(out, "story", "story", [["Foto completa", storyFull, [514, 57, 740, 870]], ["Tarjeta", storyCard, [486, 948, 1011, 1005]], ["Collage", storyCollage, [425, 63, 837, 1062]]], SOCIAL, pals, (c) => c.k);
  each(out, "miniatura-youtube", "thumb", [["Cara", ytFace, [[1027, 0.5], [856, 0.5], [64, 0.5], [65, 0.5]]], ["Foto", ytFull, [[1050, 0.5], [30, 0.5], [0, 0.5], [133, 0.5]]], ["Caja", ytBox, [[1043, 0.5], [766, 0.5], [180, 0.5], [1071, 0.5]]]], YT, pals, (c) => `${c.k.charAt(0)}${c.k.slice(1).toLowerCase()}`);
  each(out, "portada", "video", [["Dividida", cover16, [1082, 896, 835, 526]], ["Foto completa", coverFull, [1036, 1039, 674, 1076]], ["Retrato", cover16, [342, 325, 1027, 832]]], COVERS, pals, (c) => c.k);
  each(out, "video", "video", [["Rótulo", videoLower, [1036, 164, 182, 1043]], ["Intro", videoIntro, [64, 1012, 836, 1005]], ["Escena", videoLower, [643, 401, 525, 724]]], COVERS, pals, (c) => c.k);
  each(out, "pizarra", "board", [["Kanban", board, [0, 180, 445, 1010]], ["Equipo", board, [2, 366, 513, 24]], ["Clase", board, [1073, 403, 486, 48]]], BOARDS, pals, (c) => c.k);
  each(out, "sitio-web", "web", [["Landing", webLanding, [30, 1031, 1027, 823]], ["Portafolio", webPortfolio, [1048, 1067, 1076, 43]], ["Servicio", webLanding, [832, 856, 1012, 1062]]], WEBS, pals, (c) => c.brand);
  each(out, "meme", "square", [["Clásico", memeClassic, [237, 1025, 659, 837]], ["Moderno", memeModern, [1062, 64, 0, 30]], ["Comparación", memeSplit, [[1025, 0.5], [837, 0.5], [659, 0.5], [237, 0.5]]]], MEMES, pals, (c) => c.top.slice(0, 26).replace(/[«»]/g, ""));
  return out;
}
