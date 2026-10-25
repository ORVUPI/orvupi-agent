/**
 * Cada miniatura del catálogo abre su propio documento.
 * Prohibido sustituirla por la plantilla genérica de su categoría.
 * El PNG histórico no es el documento: la ficha pinta este mismo documento.
 */

import { PRESETS, createDocument, rectLayer, shellForFormat, textLayer } from "./document.mjs";
import { exportAllowed } from "./filter.mjs";
import thumbs from "../thumbs/catalog.json" with { type: "json" };

const C = "#FFF8EC";
const N = "#102032";
const P = "#FF3070";
const W = "#FFFFFF";
const SOFT = "#ECF1F6";
const MUTED = "#5C6B7A";
const SLATE = "#24384E";

const FORMAT = {
  curriculum: "cv",
  presentacion: "deck",
  documento: "doc",
  informe: "doc",
  propuesta: "doc",
  "tarjeta-visita": "card",
  logo: "logo",
  flyer: "flyer",
  cartel: "poster",
  infografia: "info",
  invitacion: "invite",
  "post-instagram": "ig",
  story: "story",
  "miniatura-youtube": "thumb",
  portada: "video",
  video: "video",
  pizarra: "board",
  "sitio-web": "web",
  meme: "square",
  negocio: "doc",
};

/** Títulos cuyo texto literal no pasa el filtro de exportación. El nombre del proyecto conserva el título del catálogo. */
const SAFE_HEADLINE = {
  "tpl-propuesta-04": "Cifras y valor",
  "tpl-story-02": "Webinar",
  "tpl-miniatura-youtube-05": "Ronda de proyecto",
  "tpl-negocio-05": "Alianza",
};

const FORMAT_OVERRIDE = {
  "tpl-propuesta-02": "deck",
  "tpl-propuesta-05": "deck",
  "tpl-negocio-02": "deck",
  "tpl-negocio-03": "card",
  "tpl-negocio-05": "deck",
};

function tx(name, x, y, w, h, text, font, size, color, z = 30, align = "left") {
  return textLayer({
    name,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(Math.max(24, w)),
    h: Math.round(Math.max(20, h)),
    z,
    text,
    fontId: font,
    size,
    color,
    align,
  });
}

function bx(name, x, y, w, h, fill, z = 2) {
  return rectLayer({
    name,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(Math.max(8, w)),
    h: Math.round(Math.max(8, h)),
    z,
    fill,
  });
}

function serial(id) {
  const match = /-(\d+)$/.exec(String(id || ""));
  return match ? Number(match[1]) : 1;
}

export function canvasHeadline(item) {
  if (!item) return "Título";
  return SAFE_HEADLINE[item.id] || item.title || "Título";
}

function formatIdFor(item) {
  return FORMAT_OVERRIDE[item.id] || FORMAT[item.category] || "square";
}

function cvDoc(w, h, n) {
  if (n === 1) {
    return {
      fill: W,
      layers: [
        bx("Columna", 0, 0, 280, h, N, 1),
        bx("Inicial", 90, 56, 100, 100, SLATE, 3),
        tx("Inicial", 90, 78, 100, 56, "N", "archivo", 40, C, 4, "center"),
        tx("Nombre", 24, 180, 232, 120, "Nombre y apellidos", "archivo", 28, C, 20),
        tx("Cargo", 24, 310, 232, 48, "Cargo", "barlow", 22, P, 21),
        bx("Regla", 24, 372, 48, 6, P, 5),
        tx("Ciudad", 24, 392, 232, 32, "Ciudad", "barlow", 18, C, 22),
        tx("Sitio", 24, 428, 232, 32, "tu sitio", "barlow", 16, "#BAC6D2", 23),
        tx("Perfil", 24, 490, 232, 28, "PERFIL", "anton", 16, "#BAC6D2", 24),
        tx("Perfil texto", 24, 528, 232, 150, "Una frase breve con más señal.", "barlow", 18, C, 25),
        tx("Idiomas", 24, 700, 232, 70, "Idiomas: Español, inglés", "barlow", 16, C, 26),
        tx("Experiencia", 320, 56, w - 360, 48, "Experiencia", "archivo", 32, N, 30),
        bx("Regla exp", 320, 112, 48, 6, P, 6),
        tx("Puesto 1", 320, 140, w - 360, 36, "Dirección de producto", "barlow", 24, N, 31),
        tx("Lugar 1", 320, 180, w - 360, 32, "Tu empresa (2022)", "barlow", 18, MUTED, 32),
        tx("Detalle 1", 320, 216, w - 360, 64, "Logro concreto que quieras destacar.", "barlow", 18, N, 33),
        tx("Puesto 2", 320, 300, w - 360, 36, "Consultoría", "barlow", 24, N, 34),
        tx("Lugar 2", 320, 340, w - 360, 32, "Tu empresa (2019)", "barlow", 18, MUTED, 35),
        tx("Detalle 2", 320, 376, w - 360, 64, "Otro resultado medible.", "barlow", 18, N, 36),
        tx("Formación", 320, 470, w - 360, 40, "Formación", "archivo", 28, N, 37),
        tx("Estudio", 320, 516, w - 360, 36, "Grado, Tu universidad", "barlow", 20, MUTED, 38),
      ],
    };
  }
  if (n === 2) {
    return {
      fill: C,
      layers: [
        bx("Banda", 0, 0, w, 220, N, 1),
        tx("Nombre", 48, 48, w - 96, 80, "Nombre y apellidos", "archivo", 40, C, 20),
        tx("Cargo", 48, 136, w - 96, 40, "Cargo", "barlow", 24, P, 21),
        tx("Experiencia", 48, 260, w - 96, 40, "Experiencia", "archivo", 28, N, 30),
        bx("Ficha 1", 48, 320, w - 96, 140, W, 2),
        bx("Acento 1", 48, 320, 8, 140, P, 3),
        tx("Puesto 1", 72, 340, w - 140, 36, "Liderazgo de equipo", "barlow", 22, N, 31),
        tx("Cuando 1", 72, 384, w - 140, 32, "Tu empresa (2022)", "barlow", 18, MUTED, 32),
        bx("Ficha 2", 48, 480, w - 96, 140, W, 2),
        tx("Puesto 2", 72, 500, w - 140, 36, "Estrategia", "barlow", 22, N, 33),
        tx("Cuando 2", 72, 544, w - 140, 32, "Tu empresa (2018)", "barlow", 18, MUTED, 34),
        tx("Idiomas", 48, 660, w - 96, 40, "Idiomas: Español, inglés", "barlow", 18, MUTED, 35),
      ],
    };
  }
  if (n === 3) {
    return {
      fill: W,
      layers: [
        bx("Barra", 0, 0, 18, h, P, 1),
        tx("Nombre", 56, 64, w - 100, 120, "Nombre y apellidos", "archivo", 48, N, 20),
        tx("Cargo", 56, 190, w - 100, 40, "Cargo, Tu empresa", "barlow", 24, P, 21),
        bx("Regla", 56, 250, 72, 8, N, 4),
        tx("Uno", 56, 290, w - 100, 80, "Producto", "anton", 36, N, 30),
        tx("Dos", 56, 380, w - 100, 80, "Investigación", "anton", 36, N, 31),
        tx("Tres", 56, 470, w - 100, 80, "Equipos", "anton", 36, N, 32),
        tx("Nota", 56, 580, w - 100, 80, "Una frase breve con más señal.", "barlow", 22, MUTED, 33),
      ],
    };
  }
  if (n === 4) {
    return {
      fill: C,
      layers: [
        bx("Foto", 48, 48, 220, 220, "#D5DDE6", 2),
        tx("Foto", 48, 130, 220, 40, "Tu foto", "barlow", 20, N, 20, "center"),
        tx("Nombre", 300, 64, w - 348, 90, "Nombre y apellidos", "archivo", 36, N, 21),
        tx("Cargo", 300, 160, w - 348, 40, "Cargo", "barlow", 22, P, 22),
        tx("Empresa", 300, 208, w - 348, 36, "Tu empresa", "barlow", 20, MUTED, 23),
        tx("Experiencia", 48, 310, w - 96, 40, "Experiencia", "archivo", 26, N, 30),
        tx("Cuerpo", 48, 360, w - 96, 280, "Puesto reciente\nTu empresa\n\nPuesto anterior\nTu empresa", "barlow", 24, N, 31),
      ],
    };
  }
  if (n === 5) {
    return {
      fill: W,
      layers: [
        bx("Tope", 0, 0, w, 200, N, 1),
        tx("Nombre", 48, 48, w - 96, 80, "Nombre y apellidos", "archivo", 36, C, 20, "center"),
        tx("Cargo", 48, 130, w - 96, 36, "Cargo, Tu empresa", "barlow", 20, P, 21, "center"),
        tx("Resumen", 64, 240, w - 128, 100, "Resumen para un consejo o un comité.", "barlow", 22, N, 30, "center"),
        bx("Col a", 48, 380, (w - 120) / 2, 360, SOFT, 2),
        bx("Col b", 72 + (w - 120) / 2, 380, (w - 120) / 2, 360, SOFT, 2),
        tx("A", 64, 400, (w - 160) / 2, 300, "Mandato\nDirección\nResultados", "barlow", 22, N, 31),
        tx("B", 88 + (w - 120) / 2, 400, (w - 160) / 2, 300, "Formación\nTu universidad\nIdiomas", "barlow", 22, N, 32),
      ],
    };
  }
  if (n === 6) {
    return {
      fill: W,
      layers: [
        tx("Nombre", 48, 40, w - 96, 70, "Nombre y apellidos", "archivo", 36, N, 20),
        tx("Cargo", 48, 116, w - 96, 36, "Cargo, Tu empresa", "barlow", 20, P, 21),
        bx("Eje", 78, 200, 4, 760, P, 2),
        tx("Año 1", 100, 200, w - 160, 36, "2024", "anton", 22, P, 30),
        tx("Hecho 1", 100, 240, w - 160, 70, "Lanzamiento\nTu empresa", "barlow", 20, N, 31),
        tx("Año 2", 100, 360, w - 160, 36, "2022", "anton", 22, P, 32),
        tx("Hecho 2", 100, 400, w - 160, 70, "Equipo\nTu empresa", "barlow", 20, N, 33),
        tx("Año 3", 100, 520, w - 160, 36, "2019", "anton", 22, P, 34),
        tx("Hecho 3", 100, 560, w - 160, 70, "Inicio\nTu empresa", "barlow", 20, N, 35),
      ],
    };
  }
  if (n === 7) {
    return {
      fill: SOFT,
      layers: [
        tx("Nombre", 40, 36, w - 80, 64, "Nombre y apellidos", "archivo", 32, N, 20),
        bx("G1", 40, 130, (w - 100) / 2, 200, W, 2),
        bx("G2", 60 + (w - 100) / 2, 130, (w - 100) / 2, 200, W, 2),
        bx("G3", 40, 350, (w - 100) / 2, 200, W, 2),
        bx("G4", 60 + (w - 100) / 2, 350, (w - 100) / 2, 200, W, 2),
        tx("C1", 56, 150, (w - 140) / 2, 150, "Producto reciente", "barlow", 22, N, 30),
        tx("C2", 76 + (w - 100) / 2, 150, (w - 140) / 2, 150, "Equipo actual", "barlow", 22, N, 31),
        tx("C3", 56, 370, (w - 140) / 2, 150, "Mercado local", "barlow", 22, N, 32),
        tx("C4", 76 + (w - 100) / 2, 370, (w - 140) / 2, 150, "Resultado anual", "barlow", 22, N, 33),
      ],
    };
  }
  return {
    fill: C,
    layers: [
      bx("Filete", 0, 0, w, 12, P, 1),
      tx("Nombre", 48, 80, w - 96, 100, "Nombre y apellidos", "archivo", 40, N, 20, "center"),
      tx("Cargo", 48, 190, w - 96, 40, "Cargo", "barlow", 22, P, 21, "center"),
      bx("Linea", w / 2 - 80, 250, 160, 4, N, 4),
      tx("Cuerpo", 80, 290, w - 160, 360, "Experiencia\nTu empresa\n\nFormación\nTu universidad\n\nIdiomas: Español, inglés", "barlow", 24, N, 30, "center"),
    ],
  };
}

function deckDoc(w, h, title, n) {
  if (n === 1) {
    return {
      fill: N,
      layers: [
        bx("Acento", 0, h - 120, w, 120, P, 2),
        tx("Kicker", 80, 72, 640, 40, "INFORME", "anton", 28, P, 20),
        tx("Titulo", 80, 180, 1100, 280, title, "archivo", 72, C, 30),
        tx("Sub", 80, 500, 900, 80, "Tu empresa", "barlow", 36, C, 31),
        bx("Anio", 1320, 180, 480, 480, SLATE, 3),
        tx("Anio", 1320, 360, 480, 120, "2026", "archivo", 72, C, 32, "center"),
        tx("Pie", 80, h - 88, 800, 56, "¿Qué decisión abre el año?", "barlow", 28, N, 33),
      ],
    };
  }
  if (n === 2) {
    return {
      fill: C,
      layers: [
        tx("Titulo", 80, 64, w - 160, 90, title, "archivo", 56, N, 20),
        bx("1", 80, 220, w - 160, 160, W, 2),
        bx("2", 80, 410, w - 160, 160, W, 2),
        bx("3", 80, 600, w - 160, 160, W, 2),
        bx("4", 80, 790, w - 160, 160, N, 2),
        tx("N1", 110, 250, 120, 80, "01", "anton", 40, P, 30),
        tx("N2", 110, 440, 120, 80, "02", "anton", 40, P, 31),
        tx("N3", 110, 630, 120, 80, "03", "anton", 40, P, 32),
        tx("N4", 110, 820, 120, 80, "04", "anton", 40, C, 33),
        tx("T1", 250, 260, w - 400, 70, "Contexto", "barlow", 32, N, 34),
        tx("T2", 250, 450, w - 400, 70, "Objetivo", "barlow", 32, N, 35),
        tx("T3", 250, 640, w - 400, 70, "Plan", "barlow", 32, N, 36),
        tx("T4", 250, 830, w - 400, 70, "Cierre", "barlow", 32, C, 37),
      ],
    };
  }
  if (n === 3) {
    return {
      fill: W,
      layers: [
        tx("Titulo", 72, 56, w - 144, 80, title, "archivo", 48, N, 20),
        bx("A", 72, 200, 540, 640, N, 2),
        bx("B", 660, 200, 540, 640, SOFT, 2),
        bx("C", 1248, 200, 540, 640, P, 2),
        tx("Na", 100, 240, 480, 80, "32", "archivo", 72, C, 30),
        tx("Nb", 688, 240, 480, 80, "18", "archivo", 72, N, 31),
        tx("Nc", 1276, 240, 480, 80, "07", "archivo", 72, N, 32),
        tx("La", 100, 360, 480, 80, "Respuestas", "barlow", 28, C, 33),
        tx("Lb", 688, 360, 480, 80, "Cuentas", "barlow", 28, N, 34),
        tx("Lc", 1276, 360, 480, 80, "Mercados", "barlow", 28, N, 35),
      ],
    };
  }
  if (n === 4) {
    return {
      fill: W,
      layers: [
        tx("Titulo", 72, 48, w - 144, 80, title, "archivo", 48, N, 20),
        bx("Izq", 72, 180, (w - 180) / 2, h - 280, N, 2),
        bx("Der", 108 + (w - 180) / 2, 180, (w - 180) / 2, h - 280, C, 2),
        tx("A", 100, 220, (w - 260) / 2, 80, "Reto", "anton", 36, P, 30),
        tx("B", 136 + (w - 180) / 2, 220, (w - 260) / 2, 80, "Solución", "anton", 36, N, 31),
        tx("Aa", 100, 320, (w - 260) / 2, 300, "Qué frena hoy a tu equipo.", "barlow", 28, C, 32),
        tx("Bb", 136 + (w - 180) / 2, 320, (w - 260) / 2, 300, "Qué propones en una frase.", "barlow", 28, N, 33),
      ],
    };
  }
  if (n === 5) {
    return {
      fill: C,
      layers: [
        bx("Foto", w - 640, 120, 520, 720, "#D5DDE6", 2),
        tx("Foto", w - 640, 440, 520, 48, "Tu imagen", "barlow", 24, N, 20, "center"),
        tx("Titulo", 80, 180, w - 820, 280, title, "archivo", 56, N, 30),
        tx("Firma", 80, 500, w - 820, 80, "Nombre y apellidos", "barlow", 28, P, 31),
        tx("Empresa", 80, 580, w - 820, 60, "Tu empresa", "barlow", 24, MUTED, 32),
      ],
    };
  }
  if (n === 6) {
    return {
      fill: W,
      layers: [
        tx("Titulo", 72, 48, w - 144, 80, title, "archivo", 48, N, 20),
        bx("1", 72, 200, 400, h - 320, N, 2),
        bx("2", 504, 280, 400, h - 400, SLATE, 2),
        bx("3", 936, 360, 400, h - 480, P, 2),
        bx("4", 1368, 440, 400, h - 560, SOFT, 2),
        tx("T1", 96, 240, 352, 120, "Ahora", "anton", 32, C, 30),
        tx("T2", 528, 320, 352, 120, "Siguiente", "anton", 32, C, 31),
        tx("T3", 960, 400, 352, 120, "Después", "anton", 32, N, 32),
        tx("T4", 1392, 480, 352, 120, "Meta", "anton", 32, N, 33),
      ],
    };
  }
  if (n === 7) {
    return {
      fill: N,
      layers: [
        tx("Titulo", 80, 64, w - 160, 80, title, "archivo", 48, C, 20),
        bx("A", 80, 220, 540, 700, SLATE, 2),
        bx("B", 660, 220, 540, 700, SLATE, 2),
        bx("C", 1240, 220, 540, 700, P, 2),
        tx("Fa", 120, 260, 460, 48, "Tu foto", "barlow", 20, C, 21, "center"),
        tx("Fb", 700, 260, 460, 48, "Tu foto", "barlow", 20, C, 22, "center"),
        tx("Fc", 1280, 260, 460, 48, "Tu foto", "barlow", 20, N, 23, "center"),
        tx("Na", 110, 480, 480, 80, "Nombre y apellidos", "barlow", 28, C, 30),
        tx("Nb", 690, 480, 480, 80, "Nombre y apellidos", "barlow", 28, C, 31),
        tx("Nc", 1270, 480, 480, 80, "Nombre y apellidos", "barlow", 28, N, 32),
        tx("Ca", 110, 570, 480, 48, "Cargo", "barlow", 22, P, 33),
        tx("Cb", 690, 570, 480, 48, "Cargo", "barlow", 22, P, 34),
        tx("Cc", 1270, 570, 480, 48, "Cargo", "barlow", 22, N, 35),
      ],
    };
  }
  return {
    fill: N,
    layers: [
      tx("Titulo", 80, 280, w - 160, 160, title, "archivo", 72, C, 20, "center"),
      tx("Sub", 80, 480, w - 160, 80, "Tu empresa", "barlow", 36, P, 21, "center"),
      bx("Linea", w / 2 - 60, 600, 120, 6, P, 4),
      tx("Pie", 80, 660, w - 160, 60, "Gracias", "barlow", 28, C, 30, "center"),
    ],
  };
}

function docPage(w, h, title, n) {
  const band = n % 2 === 0 ? N : P;
  const ink = n % 2 === 0 ? C : N;
  return {
    fill: n % 2 === 0 ? W : C,
    layers: [
      bx("Cabecera", 0, 0, w, 160, band, 1),
      tx("Kicker", 48, 36, w - 96, 32, "DOCUMENTO", "anton", 16, n % 2 === 0 ? P : N, 20),
      tx("Titulo", 48, 72, w - 96, 70, title, "archivo", 32, ink, 21),
      tx("Empresa", 48, 190, w - 96, 36, "Tu empresa", "barlow", 20, MUTED, 22),
      tx("Cuerpo", 48, 260, w - 96, h - 340, n === 1
        ? "Partes\n1  Qué se acuerda\n2  Plazos\n3  Responsables\n\nNombre y apellidos"
        : "Sección\nEscribe aquí el contenido.\n\nOtra sección\nUn dato, una fecha, un responsable.", "barlow", 24, N, 30),
    ],
  };
}

function cardDoc(w, h, title, n) {
  const piece = tx("Pieza", 48, 16, w - 96, 28, title, "barlow", 14, MUTED, 40);
  if (n % 3 === 1) {
    return {
      fill: N,
      layers: [
        bx("Acento", 0, 0, 16, h, P, 2),
        tx("Nombre", 56, h / 2 - 80, w - 120, 70, "Nombre y apellidos", "archivo", 36, C, 20),
        tx("Cargo", 56, h / 2, w - 120, 40, "Cargo", "barlow", 22, P, 21),
        tx("Empresa", 56, h / 2 + 48, w - 120, 36, "Tu empresa", "barlow", 20, C, 22),
        tx("Pieza", 56, h - 48, w - 120, 28, title, "barlow", 14, "#BAC6D2", 40),
      ],
    };
  }
  if (n % 3 === 2) {
    return {
      fill: W,
      layers: [
        piece,
        tx("Nombre", 48, 56, w - 96, 70, "Nombre y apellidos", "archivo", 36, N, 20),
        tx("Cargo", 48, 136, w - 96, 36, "Cargo, Tu empresa", "barlow", 22, P, 21),
        bx("Linea", 48, 190, 80, 4, N, 4),
        tx("Contacto", 48, h - 120, w - 96, 70, "Ciudad\ntu sitio", "barlow", 18, MUTED, 22),
      ],
    };
  }
  return {
    fill: W,
    layers: [
      bx("Lado", 0, 0, 280, h, N, 1),
      tx("Inicial", 0, h / 2 - 40, 280, 80, "N", "archivo", 64, C, 4, "center"),
      tx("Nombre", 320, h / 2 - 70, w - 360, 70, "Nombre y apellidos", "archivo", 32, N, 20),
      tx("Cargo", 320, h / 2 + 10, w - 360, 40, "Cargo", "barlow", 22, P, 21),
      tx("Pieza", 320, h - 64, w - 360, 28, title, "barlow", 14, MUTED, 40),
    ],
  };
}

function logoDoc(w, h, title, n) {
  const word = "Tu empresa";
  if (n % 3 === 1) {
    return {
      fill: C,
      layers: [
        bx("Circulo", w / 2 - 220, h / 2 - 260, 440, 440, N, 2),
        tx("Inicial", w / 2 - 220, h / 2 - 80, 440, 120, word.slice(0, 1), "archivo", 96, C, 20, "center"),
        tx("Nombre", 80, h / 2 + 220, w - 160, 70, word, "barlow", 32, N, 21, "center"),
        tx("Pieza", 80, h - 80, w - 160, 36, title, "barlow", 16, MUTED, 22, "center"),
      ],
    };
  }
  if (n % 3 === 2) {
    return {
      fill: W,
      layers: [
        tx("Marca", 80, h / 2 - 80, w - 160, 120, word, "archivo", 72, N, 20, "center"),
        bx("Linea", w / 2 - 40, h / 2 + 60, 80, 6, P, 4),
        tx("Pieza", 80, h / 2 + 90, w - 160, 40, title, "barlow", 18, MUTED, 21, "center"),
      ],
    };
  }
  return {
    fill: W,
    layers: [
      bx("Bloque", 80, h / 2 - 160, 360, 320, N, 2),
      tx("Inicial", 80, h / 2 - 60, 360, 100, word.slice(0, 1), "archivo", 80, C, 20, "center"),
      tx("Marca", 480, h / 2 - 60, w - 560, 100, word, "archivo", 48, N, 21),
      tx("Pieza", 480, h / 2 + 50, w - 560, 40, title, "barlow", 18, MUTED, 22),
    ],
  };
}

function flyerDoc(w, h, title, n) {
  return {
    fill: n % 2 ? C : W,
    layers: [
      bx("Tope", 0, 0, w, 280, n % 2 ? N : P, 1),
      tx("Kicker", 40, 36, w - 80, 32, "ENCUENTRO", "anton", 16, C, 20),
      tx("Titulo", 40, 80, w - 80, 160, title, "archivo", 40, C, 21),
      tx("Cuando", 40, 320, w - 80, 40, "Fecha, Ciudad", "barlow", 22, N, 30),
      tx("Cuerpo", 40, 390, w - 80, 280, "Qué ocurre\nA quién va\nDónde es", "barlow", 26, N, 31),
      tx("Empresa", 40, h - 100, w - 80, 40, "Tu empresa", "barlow", 22, P, 32),
    ],
  };
}

function posterDoc(w, h, title) {
  return {
    fill: C,
    layers: [
      bx("Margen", 36, 36, w - 72, h - 72, W, 1),
      tx("Kicker", 72, 80, w - 144, 36, "PROGRAMA", "anton", 18, P, 20),
      tx("Titulo", 72, 140, w - 144, 280, title, "archivo", 56, N, 21),
      bx("Linea", 72, 440, 80, 8, N, 4),
      tx("Meta", 72, 480, w - 144, 80, "Fecha, Lugar", "barlow", 28, MUTED, 30),
      tx("Cuerpo", 72, 600, w - 144, 360, "Una línea sobre el acto.\nOtra línea con el horario.", "barlow", 28, N, 31),
      tx("Empresa", 72, h - 160, w - 144, 48, "Tu empresa", "barlow", 24, P, 32),
    ],
  };
}

function infoDoc(w, h, title, n) {
  const steps = n % 2 ? ["Mirar", "Ordenar", "Decidir", "Contar"] : ["Antes", "Cambio", "Después", "Nota"];
  const layers = [
    tx("Titulo", 40, 36, w - 80, 90, title, "archivo", 36, N, 20),
  ];
  steps.forEach((label, i) => {
    const y = 160 + i * 420;
    layers.push(bx(`Paso ${i + 1}`, 40, y, w - 80, 380, i % 2 ? N : SOFT, 2));
    layers.push(tx(`N${i + 1}`, 64, y + 24, 120, 60, `0${i + 1}`, "anton", 32, i % 2 ? P : P, 30));
    layers.push(tx(`T${i + 1}`, 64, y + 100, w - 140, 80, label, "archivo", 32, i % 2 ? C : N, 31));
    layers.push(tx(`D${i + 1}`, 64, y + 190, w - 140, 120, "Escribe aquí.", "barlow", 22, i % 2 ? C : N, 32));
  });
  return { fill: C, layers };
}

function inviteDoc(w, h, title, n) {
  return {
    fill: n % 2 ? N : C,
    layers: [
      bx("Marco", 28, 28, w - 56, h - 56, n % 2 ? SLATE : W, 1),
      tx("Kicker", 64, 80, w - 128, 32, "INVITACIÓN", "anton", 16, P, 20, "center"),
      tx("Titulo", 64, 160, w - 128, 160, title, "archivo", 40, n % 2 ? C : N, 21, "center"),
      tx("Nombres", 64, 360, w - 128, 80, "Nombre y apellidos", "barlow", 24, n % 2 ? C : N, 30, "center"),
      tx("Cuando", 64, 460, w - 128, 80, "Fecha\nLugar", "barlow", 22, n % 2 ? P : MUTED, 31, "center"),
      tx("Empresa", 64, h - 140, w - 128, 40, "Tu empresa", "barlow", 20, n % 2 ? C : N, 32, "center"),
    ],
  };
}

function postDoc(w, h, title, n) {
  if (n % 4 === 1) {
    return {
      fill: C,
      layers: [
        tx("Cita", 64, 180, w - 128, 360, title, "archivo", 56, N, 20),
        tx("Quien", 64, h - 220, w - 128, 48, "Nombre y apellidos", "barlow", 24, P, 21),
        tx("Empresa", 64, h - 160, w - 128, 40, "Tu empresa", "barlow", 20, MUTED, 22),
      ],
    };
  }
  if (n % 4 === 2) {
    return {
      fill: W,
      layers: [
        tx("Titulo", 56, 56, w - 112, 100, title, "archivo", 40, N, 20),
        tx("1", 56, 220, w - 112, 200, "01  Primer paso", "barlow", 32, N, 30),
        tx("2", 56, 440, w - 112, 200, "02  Segundo paso", "barlow", 32, N, 31),
        tx("3", 56, 660, w - 112, 200, "03  Tercer paso", "barlow", 32, N, 32),
      ],
    };
  }
  if (n % 4 === 3) {
    return {
      fill: N,
      layers: [
        tx("Cifra", 64, 280, w - 128, 180, "32", "archivo", 140, C, 20),
        tx("Label", 64, 500, w - 128, 120, title, "barlow", 36, P, 21),
        tx("Empresa", 64, h - 140, w - 128, 40, "Tu empresa", "barlow", 22, C, 22),
      ],
    };
  }
  return {
    fill: W,
    layers: [
      bx("A", 48, 48, (w - 120) / 2, (h - 160) / 2, N, 2),
      bx("B", 72 + (w - 120) / 2, 48, (w - 120) / 2, (h - 160) / 2, P, 2),
      bx("C", 48, 72 + (h - 160) / 2, (w - 120) / 2, (h - 200) / 2, SOFT, 2),
      bx("D", 72 + (w - 120) / 2, 72 + (h - 160) / 2, (w - 120) / 2, (h - 200) / 2, N, 2),
      tx("Titulo", 48, h - 80, w - 96, 48, title, "barlow", 22, N, 30),
    ],
  };
}

function storyDoc(w, h, title, n) {
  if (n % 3 === 1) {
    return {
      fill: N,
      layers: [
        tx("Titulo", 56, 220, w - 112, 360, title, "archivo", 64, C, 20),
        tx("Meta", 56, 640, w - 112, 60, "Jueves, 19:00", "barlow", 28, P, 21),
        tx("Empresa", 56, h - 180, w - 112, 48, "Tu empresa", "barlow", 24, C, 22),
      ],
    };
  }
  if (n % 3 === 2) {
    return {
      fill: C,
      layers: [
        tx("Titulo", 56, 80, w - 112, 140, title, "archivo", 48, N, 20),
        bx("1", 56, 280, w - 112, 360, N, 2),
        bx("2", 56, 680, w - 112, 360, W, 2),
        bx("3", 56, 1080, w - 112, 360, P, 2),
        tx("A", 80, 360, w - 160, 80, "Paso 1", "anton", 32, C, 30),
        tx("B", 80, 760, w - 160, 80, "Paso 2", "anton", 32, N, 31),
        tx("C", 80, 1160, w - 160, 80, "Paso 3", "anton", 32, N, 32),
      ],
    };
  }
  return {
    fill: W,
    layers: [
      tx("Pregunta", 56, 200, w - 112, 240, title, "archivo", 48, N, 20),
      bx("Si", 56, 560, w - 112, 160, N, 2),
      bx("No", 56, 760, w - 112, 160, SOFT, 2),
      tx("Si", 80, 600, w - 160, 70, "Sí", "anton", 32, C, 30),
      tx("No", 80, 800, w - 160, 70, "Todavía no", "anton", 32, N, 31),
      tx("Empresa", 56, h - 160, w - 112, 40, "Tu empresa", "barlow", 22, MUTED, 22),
    ],
  };
}

function thumbVideo(w, h, title, n) {
  return {
    fill: n % 2 ? C : W,
    layers: [
      bx("Panel", 36, 36, w * 0.62, h - 72, n % 2 ? N : N, 1),
      tx("Tag", 64, 64, w * 0.5, 36, n % 2 ? "GUÍA" : "SESIÓN", "anton", 18, P, 20),
      tx("Titulo", 64, h / 2 - 80, w * 0.55, 180, title, "archivo", 48, C, 21),
      tx("Empresa", w * 0.68, h / 2 - 20, w * 0.28, 80, "Tu empresa", "barlow", 22, N, 30),
    ],
  };
}

function coverDoc(w, h, title, n) {
  if (n % 2) {
    return {
      fill: N,
      layers: [
        tx("Episodio", 80, 80, 400, 40, "PORTADA", "anton", 20, P, 20),
        tx("Titulo", 80, 280, w - 200, 240, title, "archivo", 64, C, 21),
        tx("Empresa", 80, h - 160, w - 200, 48, "Tu empresa", "barlow", 28, C, 22),
      ],
    };
  }
  return {
    fill: C,
    layers: [
      bx("Lado", 0, 0, 28, h, P, 1),
      tx("Titulo", 80, 220, w - 160, 240, title, "archivo", 64, N, 20),
      tx("Empresa", 80, 500, w - 160, 48, "Tu empresa", "barlow", 28, MUTED, 21),
    ],
  };
}

function videoFrame(w, h, title, n) {
  return {
    fill: n % 2 ? N : W,
    layers: [
      bx("Tercio", 0, h - 280, w, 280, n % 2 ? P : N, 2),
      tx("Titulo", 64, h - 220, w - 128, 100, title, "archivo", 48, n % 2 ? N : C, 20),
      tx("Empresa", 64, h - 100, w - 128, 48, "Tu empresa", "barlow", 24, n % 2 ? N : P, 21),
    ],
  };
}

function boardDoc(w, h, title, n) {
  const heads = [
    ["Notas", "Hoy", "Después"],
    ["Idea", "Ruta", "Dueño"],
    ["Hacer", "En curso", "Hecho"],
    ["Referencia", "Decisión", "Siguiente"],
  ][(n - 1) % 4];
  const colW = (w - 160) / 3;
  const layers = [tx("Titulo", 48, 28, w - 96, 56, title, "archivo", 32, N, 20)];
  heads.forEach((head, i) => {
    const x = 40 + i * (colW + 20);
    layers.push(bx(`Col ${i}`, x, 110, colW, h - 160, W, 2));
    layers.push(tx(`H${i}`, x + 16, 128, colW - 32, 48, head, "anton", 22, P, 30));
    layers.push(tx(`B${i}`, x + 16, 190, colW - 32, 200, "Escribe una nota.", "barlow", 20, N, 31));
  });
  return { fill: "#F4F7FB", layers };
}

function siteDoc(w, h, title) {
  return {
    fill: W,
    layers: [
      bx("Barra", 0, 0, w, 88, N, 1),
      tx("Marca", 32, 24, 360, 40, "Tu empresa", "anton", 22, C, 20),
      tx("Hero", 64, 160, w - 128, 160, title, "archivo", 56, N, 21),
      tx("Sub", 64, 340, w - 128, 80, "Una frase sobre qué ofreces.", "barlow", 28, MUTED, 22),
      bx("A", 64, 480, (w - 180) / 3, 280, SOFT, 2),
      bx("B", 84 + (w - 180) / 3, 480, (w - 180) / 3, 280, SOFT, 2),
      bx("C", 104 + 2 * ((w - 180) / 3), 480, (w - 180) / 3, 280, N, 2),
      tx("Ta", 80, 510, (w - 220) / 3, 80, "Servicio", "barlow", 24, N, 30),
      tx("Tb", 100 + (w - 180) / 3, 510, (w - 220) / 3, 80, "Prueba", "barlow", 24, N, 31),
      tx("Tc", 120 + 2 * ((w - 180) / 3), 510, (w - 220) / 3, 80, "Contacto", "barlow", 24, C, 32),
    ],
  };
}

function memeDoc(w, h, title, n) {
  if (n % 2) {
    return {
      fill: C,
      layers: [
        bx("Arriba", 0, 0, w, 220, N, 1),
        bx("Abajo", 0, h - 220, w, 220, N, 1),
        tx("Top", 40, 60, w - 80, 120, title, "anton", 40, C, 20, "center"),
        bx("Hueco", 80, 260, w - 160, h - 520, W, 2),
        tx("Hueco", 80, h / 2 - 30, w - 160, 60, "Tu foto", "barlow", 24, MUTED, 21, "center"),
        tx("Bot", 40, h - 150, w - 80, 100, "Tu pie de foto", "anton", 36, C, 22, "center"),
      ],
    };
  }
  return {
    fill: W,
    layers: [
      bx("A", 0, 0, w / 2, h, N, 1),
      bx("B", w / 2, 0, w / 2, h, P, 1),
      tx("A", 24, h / 2 - 80, w / 2 - 48, 160, title, "archivo", 36, C, 20, "center"),
      tx("B", w / 2 + 24, h / 2 - 80, w / 2 - 48, 160, "Tu pie de foto", "archivo", 36, N, 21, "center"),
    ],
  };
}

function businessDoc(w, h, title, format) {
  if (format === "deck") {
    return deckDoc(w, h, title, 1);
  }
  if (format === "card") {
    return cardDoc(w, h, title, 1);
  }
  return docPage(w, h, title, 1);
}

function build(item) {
  const format = formatIdFor(item);
  const preset = PRESETS.find((entry) => entry.id === format);
  const w = preset.width;
  const h = preset.height;
  const n = serial(item.id);
  const title = canvasHeadline(item);
  const cat = item.category;
  let spec;
  if (cat === "curriculum") spec = cvDoc(w, h, n);
  else if (cat === "presentacion") spec = deckDoc(w, h, title, n);
  else if (cat === "documento" || cat === "informe" || cat === "propuesta") spec = format === "deck" ? deckDoc(w, h, title, n === 2 ? 1 : 8) : docPage(w, h, title, n);
  else if (cat === "tarjeta-visita") spec = cardDoc(w, h, title, n);
  else if (cat === "logo") spec = logoDoc(w, h, title, n);
  else if (cat === "flyer") spec = flyerDoc(w, h, title, n);
  else if (cat === "cartel") spec = posterDoc(w, h, title);
  else if (cat === "infografia") spec = infoDoc(w, h, title, n);
  else if (cat === "invitacion") spec = inviteDoc(w, h, title, n);
  else if (cat === "post-instagram") spec = postDoc(w, h, title, n);
  else if (cat === "story") spec = storyDoc(w, h, title, n);
  else if (cat === "miniatura-youtube") spec = thumbVideo(w, h, title, n);
  else if (cat === "portada") spec = coverDoc(w, h, title, n);
  else if (cat === "video") spec = videoFrame(w, h, title, n);
  else if (cat === "pizarra") spec = boardDoc(w, h, title, n);
  else if (cat === "sitio-web") spec = siteDoc(w, h, title);
  else if (cat === "meme") spec = memeDoc(w, h, title, n);
  else if (cat === "negocio") spec = businessDoc(w, h, title, format);
  else return null;
  return { format, preset, ...spec };
}

/**
 * Instancia una copia nueva. El id del proyecto cambia en cada llamada.
 * No usa la plantilla genérica de la categoría.
 */
export function documentForThumb(id) {
  const item = thumbs.find((entry) => entry.id === id) || null;
  if (!item) return null;
  const templateId = item.templateId || item.id;
  if (templateId !== item.id) return null;
  const spec = build(item);
  if (!spec?.preset) return null;
  const doc = createDocument({
    name: String(item.title || "Sin título").slice(0, 80),
    format: { id: spec.preset.id, width: spec.preset.width, height: spec.preset.height },
    templateId: item.id,
    background: { type: "solid", fill: spec.fill },
    layers: spec.layers,
    meta: {
      locale: "es",
      useTags: [item.category],
      optionalLabel: "",
      shell: shellForFormat(spec.preset.id),
    },
  });
  doc.templateId = item.id;
  return doc;
}

export function thumbInventory() {
  return thumbs.map((item) => {
    const doc = documentForThumb(item.id);
    const texts = (doc?.layers || []).filter((layer) => layer.type === "text").map((layer) => layer.props.text);
    const blob = JSON.stringify(doc || {});
    return {
      templateId: item.id,
      category: item.category,
      title: item.title,
      png: item.file,
      pngWidth: item.width,
      pngHeight: item.height,
      editable: Boolean(doc),
      headline: doc ? canvasHeadline(item) : "",
      format: doc?.format?.id || "",
      width: doc?.format?.width || 0,
      height: doc?.format?.height || 0,
      pages: doc ? 1 : 0,
      layers: doc?.layers?.length || 0,
      mascot: /orvupi-avatar|orvupi-saludo|orvupi-buen-humor|pulpo/i.test(blob),
      brand: /\bORVUPI\b|Comunidad ORVUPI/.test(blob),
      exportable: doc ? exportAllowed(texts[0] || "", texts.slice(1).join("\n"), undefined, "") : false,
    };
  });
}
