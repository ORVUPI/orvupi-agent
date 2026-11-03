/**
 * Plantillas profesionales: negocio y documentos.
 * Cada plantilla es un documento; su miniatura se pinta con el mismo renderizador que el editor.
 */

import { circle, line, PALETTES as P, photo, rect, stack, text } from "./pro-kit.mjs";

const CV_PEOPLE = [
  { name: "Lucía Fernández", role: "Diseñadora de producto", photo: 1027, fx: 0.5, fy: 0.3, mail: "lucia@correo.es", city: "Madrid" },
  { name: "Daniel Ortega", role: "Director comercial", photo: 856, fx: 0.5, fy: 0.25, mail: "daniel@correo.es", city: "Valencia" },
  { name: "Marta Gil", role: "Ingeniera de datos", photo: 832, fx: 0.5, fy: 0.35, mail: "marta@correo.es", city: "Bilbao" },
  { name: "Sara Molina", role: "Fotógrafa y editora", photo: 823, fx: 0.5, fy: 0.35, mail: "sara@correo.es", city: "Sevilla" },
];

const CV_EXP = [
  ["2021 — Hoy", "Lead en Estudio Norte", "Dirijo un equipo de 6 personas y lancé 3 productos con +200.000 usuarios."],
  ["2018 — 2021", "Especialista en Grupo Alba", "Rediseñé los procesos clave y reduje un 30 % los tiempos de entrega."],
  ["2016 — 2018", "Junior en Agencia Faro", "Proyectos para marcas de retail, turismo y alimentación."],
];

function cvSidebar(v) {
  const p = v.p;
  const W = 794;
  const side = 270;
  const L = [
    rect(0, 0, side, 1123, p.dark, { name: "Columna" }),
    photo(v.who.photo, 55, 60, 160, 160, { fx: v.who.fx, fy: v.who.fy, radius: 80, name: "Foto de perfil" }),
    text("CONTACTO", 40, 270, 190, { size: 13, bold: true, ls: 2, color: p.accent }),
    text(`${v.who.mail}\n+34 600 123 456\n${v.who.city}, España`, 40, 300, 200, { font: "lato", size: 14, lh: 1.7, color: "#E5E7EB" }),
    text("HABILIDADES", 40, 430, 190, { size: 13, bold: true, ls: 2, color: p.accent }),
    text("Estrategia\nInvestigación\nLiderazgo\nComunicación\nPrototipado", 40, 460, 200, { font: "lato", size: 14, lh: 1.8, color: "#E5E7EB" }),
    text("IDIOMAS", 40, 640, 190, { size: 13, bold: true, ls: 2, color: p.accent }),
    text("Español — nativo\nInglés — C1\nFrancés — B2", 40, 670, 200, { font: "lato", size: 14, lh: 1.8, color: "#E5E7EB" }),
    text(v.who.name, side + 50, 70, W - side - 90, { font: "dmserif", size: 46, lh: 1.05, color: p.ink }),
    text(v.who.role.toUpperCase(), side + 50, 180, W - side - 90, { size: 14, bold: true, ls: 3, color: p.accent }),
    line(side + 50, 220, 80, p.accent, 3),
    text("PERFIL", side + 50, 260, 300, { size: 13, bold: true, ls: 2, color: p.ink }),
    text("Profesional con más de 8 años creando productos útiles y bonitos. Me apasiona convertir datos e ideas en experiencias claras.", side + 50, 290, W - side - 90, { font: "lato", size: 15, lh: 1.6, color: p.muted }),
    text("EXPERIENCIA", side + 50, 420, 300, { size: 13, bold: true, ls: 2, color: p.ink }),
  ];
  CV_EXP.forEach(([when, what, desc], i) => {
    const y = 455 + i * 150;
    L.push(text(what, side + 50, y, W - side - 90, { size: 17, bold: true, color: p.ink }));
    L.push(text(when, side + 50, y + 30, 200, { font: "lato", size: 13, color: p.accent }));
    L.push(text(desc, side + 50, y + 56, W - side - 90, { font: "lato", size: 14, lh: 1.5, color: p.muted }));
  });
  L.push(text("FORMACIÓN", side + 50, 925, 300, { size: 13, bold: true, ls: 2, color: p.ink }));
  L.push(text("Grado en Diseño — Universidad de Granada\nMáster en Gestión de Producto — ESIC", side + 50, 955, W - side - 90, { font: "lato", size: 14, lh: 1.7, color: p.muted }));
  return { bg: p.bg === "#0F172A" ? "#FFFFFF" : p.bg, layers: L };
}

function cvHeader(v) {
  const p = v.p;
  const L = [
    rect(0, 0, 794, 300, p.accent, { name: "Cabecera", gradient: { from: p.accent, to: p.dark, angle: 135 } }),
    photo(v.who.photo, 60, 70, 170, 170, { fx: v.who.fx, fy: v.who.fy, radius: 85, name: "Foto de perfil" }),
    circle(145, 155, 89, "", { stroke: "#FFFFFF", sw: 4, name: "Aro" }),
    text(v.who.name, 270, 95, 480, { font: "poppins", bold: true, size: 40, lh: 1.1, color: "#FFFFFF" }),
    text(v.who.role, 270, 190, 480, { font: "lato", size: 20, color: "#FFFFFF", opacity: 0.9 }),
    text(`${v.who.mail}   ·   +34 600 123 456   ·   ${v.who.city}`, 60, 330, 680, { font: "lato", size: 14, color: p.muted }),
    line(60, 370, 674, p.soft, 2),
    text("Sobre mí", 60, 400, 300, { size: 22, bold: true, color: p.ink }),
    text("Me encanta resolver problemas complejos con soluciones sencillas. Busco un equipo donde aportar visión, rigor y buen humor.", 60, 440, 674, { font: "lato", size: 15, lh: 1.6, color: p.muted }),
    text("Experiencia", 60, 540, 300, { size: 22, bold: true, color: p.ink }),
  ];
  CV_EXP.forEach(([when, what, desc], i) => {
    const y = 585 + i * 120;
    L.push(circle(68, y + 12, 7, p.accent, { name: "Punto" }));
    L.push(text(what, 90, y, 420, { size: 16, bold: true, color: p.ink }));
    L.push(text(when, 560, y + 2, 174, { font: "lato", size: 13, color: p.accent, align: "right" }));
    L.push(text(desc, 90, y + 30, 644, { font: "lato", size: 14, lh: 1.5, color: p.muted }));
  });
  L.push(text("Habilidades", 60, 960, 300, { size: 22, bold: true, color: p.ink }));
  ["Liderazgo", "Análisis", "Figma", "SQL"].forEach((skill, i) => {
    L.push(rect(60 + i * 168, 1005, 152, 44, p.soft, { radius: 22, name: "Etiqueta" }));
    L.push(text(skill, 60 + i * 168, 1015, 152, { font: "lato", size: 15, bold: true, color: p.ink, align: "center" }));
  });
  return { bg: "#FFFFFF", layers: L };
}

function cvMinimal(v) {
  const p = v.p;
  const L = [
    text(v.who.name, 70, 80, 460, { font: "dmserif", size: 54, lh: 1.02, color: p.ink }),
    text(v.who.role, 70, 210, 460, { font: "lato", size: 20, italic: true, color: p.accent }),
    photo(v.who.photo, 544, 70, 180, 230, { fx: v.who.fx, fy: v.who.fy, radius: 12, name: "Foto de perfil" }),
    line(70, 330, 654, p.ink, 2),
    text("EXPERIENCIA", 70, 370, 180, { size: 12, bold: true, ls: 3, color: p.ink }),
    text("CONTACTO", 70, 900, 180, { size: 12, bold: true, ls: 3, color: p.ink }),
    text(`${v.who.mail}\n+34 600 123 456\n${v.who.city}`, 260, 900, 464, { font: "lato", size: 15, lh: 1.7, color: p.muted }),
  ];
  CV_EXP.forEach(([when, what, desc], i) => {
    const y = 370 + i * 170;
    L.push(text(what, 260, y, 464, { font: "dmserif", size: 22, color: p.ink }));
    L.push(text(when, 260, y + 36, 464, { font: "lato", size: 13, ls: 1, color: p.accent }));
    L.push(text(desc, 260, y + 62, 464, { font: "lato", size: 15, lh: 1.55, color: p.muted }));
  });
  L.push(line(70, 875, 654, p.soft, 2));
  return { bg: p.bg, layers: L };
}

const DECK_COPY = [
  { k: "Plan estratégico 2027", s: "Crecer con foco: clientes, producto y equipo", tag: "PRESENTACIÓN ANUAL", who: "Equipo de Dirección · Enero 2027" },
  { k: "Lanzamiento Aurora", s: "La app que ordena tu día en 5 minutos", tag: "PRODUCTO", who: "Marketing · Marzo 2027" },
  { k: "Resultados del trimestre", s: "Ventas +24 %, nuevos mercados y próximos pasos", tag: "Q3 2027", who: "Finanzas · Octubre 2027" },
  { k: "Taller de creatividad", s: "Ideas que se convierten en proyectos reales", tag: "FORMACIÓN", who: "Academia · Sesión 1" },
];

function deckSplit(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 960, 0, 960, 1080, { fx: v.fx ?? 0.5, name: "Foto principal" }),
      text(v.c.tag, 130, 260, 700, { size: 22, bold: true, ls: 6, color: p.accent }),
      text(v.c.k, 130, 320, 760, { font: "dmserif", size: 104, lh: 1.02, color: p.ink }),
      text(v.c.s, 130, 600, 700, { font: "lato", size: 34, lh: 1.4, color: p.muted }),
      rect(130, 790, 90, 8, p.accent, { radius: 4, name: "Acento" }),
      text(v.c.who, 130, 830, 700, { font: "lato", size: 24, color: p.ink }),
    ],
  };
}

function deckFull(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1920, 1080, { fx: v.fx ?? 0.5, name: "Foto de fondo" }),
      rect(0, 0, 1920, 1080, "", { gradient: { from: "rgba(0,0,0,0.05)", to: "rgba(0,0,0,0.78)", angle: 90 }, name: "Degradado" }),
      text(v.c.tag, 140, 520, 1200, { size: 26, bold: true, ls: 8, color: p.accent === "#1E1B18" ? "#FFFFFF" : p.accent }),
      text(v.c.k, 140, 580, 1500, { font: "poppins", bold: true, size: 110, lh: 1.05, color: "#FFFFFF" }),
      text(v.c.s, 140, 830, 1300, { font: "lato", size: 36, lh: 1.35, color: "#FFFFFF", opacity: 0.88 }),
    ],
  };
}

function deckBlock(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      rect(100, 100, 1720, 880, p.soft, { radius: 36, name: "Tarjeta" }),
      photo(v.ph, 1080, 160, 680, 760, { fx: v.fx ?? 0.5, radius: 28, name: "Foto" }),
      rect(180, 220, 220, 56, p.accent, { radius: 28, name: "Etiqueta" }),
      text(v.c.tag, 180, 233, 220, { size: 18, bold: true, ls: 2, color: "#FFFFFF", align: "center", h: 32 }),
      text(v.c.k, 180, 330, 840, { font: "poppins", bold: true, size: 84, lh: 1.08, color: p.ink }),
      text(v.c.s, 180, 580, 820, { font: "lato", size: 32, lh: 1.45, color: p.muted }),
      text(v.c.who, 180, 820, 820, { font: "lato", size: 24, bold: true, color: p.ink }),
    ],
  };
}

function deckAgenda(v) {
  const p = v.p;
  const items = ["Dónde estamos", "Qué hemos aprendido", "Hacia dónde vamos", "Cómo lo haremos"];
  const L = [
    photo(v.ph, 0, 0, 720, 1080, { fx: v.fx ?? 0.5, name: "Foto" }),
    text("Agenda", 840, 150, 900, { font: "dmserif", size: 96, color: p.ink }),
    text(v.c.k, 840, 290, 900, { font: "lato", size: 28, color: p.muted }),
  ];
  items.forEach((item, i) => {
    const y = 420 + i * 150;
    L.push(text(String(i + 1).padStart(2, "0"), 840, y, 120, { font: "poppins", bold: true, size: 56, color: p.accent }));
    L.push(text(item, 980, y + 12, 800, { font: "poppins", size: 40, color: p.ink }));
    L.push(line(840, y + 118, 940, p.soft, 2));
  });
  return { bg: p.bg, layers: L };
}

const DOCS = [
  { k: "Guía de bienvenida", s: "Todo lo que necesitas saber en tu primera semana", tag: "RECURSOS HUMANOS" },
  { k: "Memoria anual 2026", s: "Un año de proyectos, personas y resultados", tag: "INFORME" },
  { k: "Propuesta de colaboración", s: "Campaña de primavera para Café Lumbre", tag: "PROPUESTA" },
  { k: "Plan de marketing", s: "Objetivos, canales y calendario del semestre", tag: "ESTRATEGIA" },
];

function docCover(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 0, 0, 794, 620, { fx: v.fx ?? 0.5, name: "Foto de portada" }),
      rect(0, 560, 794, 563, p.bg, { name: "Fondo texto" }),
      rect(60, 520, 160, 46, p.accent, { radius: 23, name: "Etiqueta" }),
      text(v.c.tag, 60, 532, 160, { size: 12, bold: true, ls: 2, color: "#FFFFFF", align: "center", h: 22 }),
      text(v.c.k, 60, 620, 674, { font: "dmserif", size: 58, lh: 1.05, color: p.ink }),
      text(v.c.s, 60, 790, 600, { font: "lato", size: 20, lh: 1.5, color: p.muted }),
      line(60, 960, 674, p.soft, 2),
      text("ORVUPI · 2027", 60, 990, 400, { size: 14, bold: true, ls: 3, color: p.ink }),
      text("orvupi.com", 434, 990, 300, { font: "lato", size: 14, color: p.muted, align: "right" }),
    ],
  };
}

function docArticle(v) {
  const p = v.p;
  return {
    bg: "#FFFFFF",
    layers: [
      rect(0, 0, 794, 14, p.accent, { name: "Barra" }),
      text(v.c.tag, 70, 70, 500, { size: 13, bold: true, ls: 3, color: p.accent }),
      text(v.c.k, 70, 105, 654, { font: "poppins", bold: true, size: 42, lh: 1.12, color: p.ink }),
      text(v.c.s, 70, 225, 654, { font: "lato", size: 19, lh: 1.5, color: p.muted }),
      photo(v.ph, 70, 310, 654, 330, { fx: v.fx ?? 0.5, radius: 14, name: "Foto" }),
      text("Introducción", 70, 680, 654, { size: 22, bold: true, color: p.ink }),
      text("Este documento resume el contexto, los objetivos y las próximas acciones. Está pensado para leerse en diez minutos y servir de referencia a todo el equipo.", 70, 720, 654, { font: "lato", size: 16, lh: 1.65, color: "#374151" }),
      rect(70, 860, 654, 150, p.soft, { radius: 14, name: "Destacado" }),
      text("«Lo importante no es hacer más, sino hacer lo que importa.»", 100, 890, 594, { font: "dmserif", italic: true, size: 24, lh: 1.35, color: p.ink }),
      text("Página 1", 70, 1050, 654, { font: "lato", size: 12, color: p.muted, align: "right" }),
    ],
  };
}

function docReport(v) {
  const p = v.p;
  const stats = [["+24 %", "ventas"], ["3", "mercados nuevos"], ["98 %", "satisfacción"]];
  const L = [
    rect(0, 0, 794, 360, p.dark, { name: "Cabecera" }),
    photo(v.ph, 0, 0, 794, 360, { fx: v.fx ?? 0.5, opacity: 0.45, name: "Foto de cabecera" }),
    text(v.c.tag, 60, 90, 500, { size: 14, bold: true, ls: 3, color: p.accent === "#1E1B18" ? "#FFFFFF" : p.accent }),
    text(v.c.k, 60, 130, 674, { font: "poppins", bold: true, size: 44, lh: 1.1, color: "#FFFFFF" }),
    text(v.c.s, 60, 250, 674, { font: "lato", size: 18, color: "#FFFFFF", opacity: 0.9 }),
    text("Cifras clave", 60, 410, 674, { size: 22, bold: true, color: p.ink }),
  ];
  stats.forEach(([n, l], i) => {
    const x = 60 + i * 230;
    L.push(rect(x, 460, 210, 150, p.soft, { radius: 16, name: "Tarjeta dato" }));
    L.push(text(n, x + 20, 485, 170, { font: "poppins", bold: true, size: 40, color: p.accent }));
    L.push(text(l, x + 20, 555, 170, { font: "lato", size: 15, color: p.ink }));
  });
  L.push(text("Resumen", 60, 660, 674, { size: 22, bold: true, color: p.ink }));
  L.push(text("El año cerró con crecimiento en todas las líneas de negocio. Las nuevas alianzas y la mejora del servicio explican la mayor parte del resultado. Para 2027 proponemos consolidar lo aprendido y abrir dos mercados más.", 60, 700, 674, { font: "lato", size: 16, lh: 1.65, color: "#374151" }));
  L.push({ type: "chart", name: "Gráfico", x: 60, y: 860, w: 674, h: 200, props: { chartType: "bar", values: [42, 55, 61, 78], labels: ["T1", "T2", "T3", "T4"], colors: [p.accent, p.accent, p.accent, p.accent] } });
  return { bg: "#FFFFFF", layers: L };
}

function invoice(v) {
  const p = v.p;
  const rows = [["Diseño de identidad", "1", "1.200 €"], ["Sesión de fotos", "1", "450 €"], ["Gestión de redes (mes)", "3", "900 €"]];
  const L = [
    photo(v.ph, 594, 50, 140, 140, { fx: v.fx ?? 0.5, radius: 70, name: "Logo / foto" }),
    text("FACTURA", 60, 60, 400, { font: "poppins", bold: true, size: 48, ls: 2, color: p.ink }),
    text("Nº 2027-014 · 12/03/2027", 60, 135, 400, { font: "lato", size: 15, color: p.muted }),
    rect(60, 230, 674, 120, p.soft, { radius: 12, name: "Datos" }),
    text("DE\nEstudio Lumbre S.L.\nCalle Mayor 12, Madrid", 85, 248, 300, { font: "lato", size: 14, lh: 1.5, color: p.ink }),
    text("PARA\nCafé Aurora\nAv. del Puerto 8, Valencia", 420, 248, 300, { font: "lato", size: 14, lh: 1.5, color: p.ink }),
    rect(60, 400, 674, 50, p.accent, { radius: 8, name: "Cabecera tabla" }),
    text("Concepto", 80, 412, 340, { size: 15, bold: true, color: "#FFFFFF", h: 26 }),
    text("Uds.", 440, 412, 80, { size: 15, bold: true, color: "#FFFFFF", align: "center", h: 26 }),
    text("Importe", 560, 412, 154, { size: 15, bold: true, color: "#FFFFFF", align: "right", h: 26 }),
  ];
  rows.forEach(([a, b, c], i) => {
    const y = 470 + i * 60;
    L.push(text(a, 80, y, 340, { font: "lato", size: 16, color: p.ink }));
    L.push(text(b, 440, y, 80, { font: "lato", size: 16, color: p.ink, align: "center" }));
    L.push(text(c, 560, y, 154, { font: "lato", size: 16, color: p.ink, align: "right" }));
    L.push(line(60, y + 42, 674, p.soft, 2));
  });
  L.push(text("Total", 420, 690, 140, { size: 22, bold: true, color: p.ink }));
  L.push(text("2.550 €", 540, 685, 194, { font: "poppins", bold: true, size: 30, color: p.accent, align: "right" }));
  L.push(text("Gracias por confiar en nosotros. Pago por transferencia en 30 días.", 60, 1000, 674, { font: "lato", size: 14, color: p.muted, align: "center" }));
  return { bg: "#FFFFFF", layers: L };
}

function menu(v) {
  const p = v.p;
  const dishes = [["Tostada de aguacate", "Pan de masa madre, lima y semillas", "7,50"], ["Bowl de temporada", "Quinoa, verduras asadas y hummus", "11,00"], ["Tarta de queso", "Horneada, con frutos rojos", "5,50"], ["Café de especialidad", "Origen Colombia · tueste medio", "2,20"]];
  const L = [
    photo(v.ph, 0, 0, 794, 380, { fx: v.fx ?? 0.5, name: "Foto de plato" }),
    text("Carta", 60, 420, 674, { font: "greatvibes", size: 80, color: p.accent, align: "center" }),
    text(v.c.k.toUpperCase(), 60, 530, 674, { size: 16, bold: true, ls: 6, color: p.ink, align: "center" }),
  ];
  dishes.forEach(([a, b, c], i) => {
    const y = 600 + i * 110;
    L.push(text(a, 90, y, 480, { font: "dmserif", size: 26, color: p.ink }));
    L.push(text(c, 584, y, 120, { font: "dmserif", size: 26, color: p.accent, align: "right" }));
    L.push(text(b, 90, y + 40, 520, { font: "lato", size: 15, italic: true, color: p.muted }));
  });
  return { bg: p.bg, layers: L };
}

function proposal(v) {
  const p = v.p;
  const steps = [["01", "Descubrimiento", "Entrevistas y análisis"], ["02", "Diseño", "Concepto y piezas"], ["03", "Lanzamiento", "Campaña y medición"]];
  const L = [
    rect(0, 0, 794, 1123, p.bg, { name: "Fondo" }),
    rect(0, 0, 300, 1123, p.accent, { gradient: { from: p.accent, to: p.dark, angle: 180 }, name: "Banda" }),
    photo(v.ph, 60, 120, 480, 360, { fx: v.fx ?? 0.5, radius: 16, name: "Foto" }),
    text(v.c.tag, 60, 540, 674, { size: 13, bold: true, ls: 3, color: p.accent }),
    text(v.c.k, 60, 575, 674, { font: "poppins", bold: true, size: 44, lh: 1.1, color: p.ink }),
    text(v.c.s, 60, 690, 600, { font: "lato", size: 18, lh: 1.5, color: p.muted }),
  ];
  steps.forEach(([n, a, b], i) => {
    const x = 60 + i * 230;
    L.push(text(n, x, 830, 200, { font: "poppins", bold: true, size: 34, color: p.accent }));
    L.push(text(a, x, 885, 200, { size: 17, bold: true, color: p.ink }));
    L.push(text(b, x, 915, 200, { font: "lato", size: 14, color: p.muted }));
  });
  L.push(text("Preparado para Café Lumbre · Marzo 2027", 60, 1040, 674, { font: "lato", size: 13, color: p.muted }));
  return { bg: p.bg, layers: L };
}

const CARD_PEOPLE = [
  { name: "Elena Ruiz", role: "Arquitecta", brand: "RUIZ ESTUDIO" },
  { name: "Pablo Serrano", role: "Abogado laboralista", brand: "SERRANO & ASOCIADOS" },
  { name: "Nuria Campos", role: "Fisioterapeuta", brand: "CENTRO MUEVE" },
  { name: "Javier Luna", role: "Fotógrafo", brand: "LUNA FOTO" },
];

function cardSplit(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      photo(v.ph, 0, 0, 420, 600, { fx: v.fx ?? 0.5, name: "Foto" }),
      text(v.who.brand, 480, 80, 520, { size: 18, bold: true, ls: 5, color: p.accent }),
      text(v.who.name, 480, 200, 520, { font: "dmserif", size: 56, lh: 1.05, color: p.ink }),
      text(v.who.role, 480, 280, 520, { font: "lato", size: 24, color: p.muted }),
      line(480, 345, 70, p.accent, 4),
      text("+34 600 123 456\nhola@ejemplo.es\nCalle Mayor 12, Madrid", 480, 380, 520, { font: "lato", size: 20, lh: 1.6, color: p.ink }),
    ],
  };
}

function cardCenter(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.ph, 0, 0, 1050, 600, { fx: v.fx ?? 0.5, opacity: 0.35, name: "Foto de fondo" }),
      rect(0, 0, 1050, 600, "", { gradient: { from: "rgba(0,0,0,0.2)", to: "rgba(0,0,0,0.7)", angle: 180 }, name: "Velo" }),
      text(v.who.name, 75, 190, 900, { font: "poppins", bold: true, size: 64, color: "#FFFFFF", align: "center" }),
      text(v.who.role.toUpperCase(), 75, 290, 900, { size: 22, ls: 6, color: p.accent === "#1E1B18" ? "#FFFFFF" : p.accent, align: "center" }),
      text("hola@ejemplo.es  ·  +34 600 123 456", 75, 470, 900, { font: "lato", size: 22, color: "#FFFFFF", align: "center" }),
    ],
  };
}

function cardMinimal(v) {
  const p = v.p;
  return {
    bg: "#FFFFFF",
    layers: [
      rect(0, 540, 1050, 60, p.accent, { name: "Franja" }),
      photo(v.ph, 70, 70, 180, 180, { fx: v.fx ?? 0.5, radius: 90, name: "Foto" }),
      text(v.who.name, 290, 95, 700, { font: "poppins", bold: true, size: 50, color: p.ink }),
      text(v.who.role, 290, 170, 700, { font: "lato", size: 24, color: p.muted }),
      text("T  +34 600 123 456\nE  hola@ejemplo.es\nW  ejemplo.es", 70, 320, 600, { font: "lato", size: 22, lh: 1.6, color: p.ink }),
      text(v.who.brand, 650, 440, 330, { size: 16, bold: true, ls: 4, color: p.accent, align: "right" }),
    ],
  };
}

const LOGOS = [
  { n: "Café Lumbre", s: "TOSTADORES · DESDE 2019", ph: 30 },
  { n: "Verde Vivo", s: "HUERTA ECOLÓGICA", ph: 1015 },
  { n: "Norte Studio", s: "ARQUITECTURA E INTERIORISMO", ph: 1031 },
  { n: "Ola Surf", s: "ESCUELA DE SURF", ph: 1036 },
];

function logoBadge(v) {
  const p = v.p;
  return {
    bg: p.bg,
    layers: [
      circle(540, 470, 300, p.accent, { name: "Círculo" }),
      photo(v.l.ph, 270, 200, 540, 540, { radius: 270, name: "Foto del logo" }),
      circle(540, 470, 270, "", { stroke: "#FFFFFF", sw: 10, name: "Aro" }),
      text(v.l.n, 90, 820, 900, { font: "dmserif", size: 96, color: p.ink, align: "center" }),
      text(v.l.s, 90, 950, 900, { size: 24, bold: true, ls: 8, color: p.accent, align: "center" }),
    ],
  };
}

function logoWord(v) {
  const p = v.p;
  return {
    bg: p.dark,
    layers: [
      photo(v.l.ph, 0, 0, 1080, 1080, { opacity: 0.28, name: "Textura" }),
      rect(190, 300, 700, 480, "", { stroke: "#FFFFFF", sw: 6, radius: 24, name: "Marco" }),
      text(v.l.n.toUpperCase(), 190, 420, 700, { font: "bebas", size: 150, ls: 6, color: "#FFFFFF", align: "center" }),
      text(v.l.s, 190, 610, 700, { font: "lato", size: 24, ls: 6, color: p.accent === "#1E1B18" ? "#FFFFFF" : p.accent, align: "center" }),
    ],
  };
}

function logoSplit(v) {
  const p = v.p;
  return {
    bg: "#FFFFFF",
    layers: [
      rect(140, 340, 400, 400, p.accent, { radius: 120, name: "Símbolo" }),
      photo(v.l.ph, 180, 380, 320, 320, { radius: 100, name: "Foto del símbolo" }),
      text(v.l.n, 580, 420, 460, { font: "poppins", bold: true, size: 76, lh: 1, color: p.ink }),
      text(v.l.s, 580, 610, 460, { font: "lato", size: 20, ls: 3, color: p.muted }),
    ],
  };
}

function build(cat, preset, title, fn, v, extra = {}) {
  const spec = fn(v);
  return { category: cat, preset, title, bg: spec.bg, layers: stack(spec.layers), ...extra };
}

export function businessTemplates() {
  const out = [];
  const pal = [P.terracota, P.noche, P.salvia, P.violeta, P.azul, P.rosa, P.arena, P.oceano];
  const cvL = [["Lateral", cvSidebar], ["Cabecera", cvHeader], ["Editorial", cvMinimal]];
  let i = 0;
  for (const [ln, fn] of cvL) {
    for (let k = 0; k < 4; k += 1) {
      const who = CV_PEOPLE[(k + i) % 4];
      out.push(build("curriculum", "cv", `CV ${ln} · ${who.name}`, fn, { p: pal[(i * 4 + k) % pal.length], who }));
    }
    i += 1;
  }
  const deckL = [["Dividida", deckSplit, [1027, 2, 1031, 1010]], ["Foto completa", deckFull, [1015, 43, 1067, 49]], ["Bloque", deckBlock, [180, 0, 48, 24]], ["Agenda", deckAgenda, [1076, 445, 526, 1073]]];
  deckL.forEach(([ln, fn, phs], li) => {
    phs.forEach((ph, k) => {
      const c = DECK_COPY[(k + li) % 4];
      out.push(build("presentacion", "deck", `${c.k} · ${ln}`, fn, { p: pal[(li * 3 + k) % pal.length], c, ph }));
    });
  });
  const docL = [["documento", "Portada", docCover, [1015, 28, 43, 1048]], ["documento", "Artículo", docArticle, [0, 180, 1, 366]], ["documento", "Dossier", docReport, [1043, 1050, 513, 49]], ["informe", "Informe", docReport, [1076, 1031, 392, 1048]], ["informe", "Artículo", docArticle, [48, 2, 445, 3]], ["informe", "Portada", docCover, [1067, 122, 862, 411]], ["propuesta", "Propuesta", proposal, [526, 180, 201, 528]], ["propuesta", "Portada", docCover, [366, 513, 0, 48]], ["propuesta", "Factura", invoice, [30, 63, 1, 2]], ["negocio", "Factura", invoice, [1015, 30, 856, 1031]], ["negocio", "Carta", menu, [225, 292, 312, 429]], ["negocio", "Propuesta", proposal, [1, 2, 3, 445]]];
  docL.forEach(([cat, ln, fn, phs], li) => {
    phs.forEach((ph, k) => {
      const c = DOCS[(k + li) % 4];
      const title = fn === menu ? `Carta · ${["Café Lumbre", "Brunch Aurora", "Bistró Sal", "La Huerta"][k]}` : fn === invoice ? `Factura · ${["Estudio", "Café", "Freelance", "Consultora"][k]}` : `${c.k} · ${ln}`;
      const cc = fn === menu ? { ...c, k: ["Café Lumbre", "Brunch Aurora", "Bistró Sal", "La Huerta"][k] } : c;
      out.push(build(cat, "doc", title, fn, { p: pal[(li + k * 3) % pal.length], c: cc, ph }));
    });
  });
  const cardL = [["Dividida", cardSplit, [1031, 1048, 0, 1069]], ["Foto", cardCenter, [43, 1076, 1067, 1015]], ["Minimal", cardMinimal, [1027, 856, 832, 823]]];
  cardL.forEach(([ln, fn, phs], li) => {
    phs.forEach((ph, k) => {
      const who = CARD_PEOPLE[(k + li) % 4];
      out.push(build("tarjeta-visita", "card", `Tarjeta ${ln} · ${who.name}`, fn, { p: pal[(li * 2 + k) % pal.length], who, ph }));
    });
  });
  const logoL = [["Insignia", logoBadge], ["Tipográfico", logoWord], ["Símbolo", logoSplit]];
  logoL.forEach(([ln, fn], li) => {
    LOGOS.forEach((l, k) => {
      out.push(build("logo", "logo", `Logo ${ln} · ${l.n}`, fn, { p: pal[(li * 3 + k) % pal.length], l }));
    });
  });
  return out;
}
