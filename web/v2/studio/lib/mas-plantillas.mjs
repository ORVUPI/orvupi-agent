/** Más diseños listos para editar. La mascota no forma parte del contenido genérico. */

import { imageLayer, rectLayer, textLayer } from "./document.mjs";

const C = "#FFF8EC";
const N = "#102032";
const P = "#FF3070";
const OCT = ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"];

function t(name, x, y, w, h, text, font, size, color, z = 30, align = "left") {
  return textLayer({ name, x, y, w, h, z, text, fontId: font, size, color, align });
}
function r(name, x, y, w, h, fill, z = 2) {
  return rectLayer({ name, x, y, w, h, z, fill });
}
function im(x, y, w, h, id, z = 10) {
  return imageLayer({ name: "Pulpo", x, y, w, h, z, src: { kind: "catalog", id } });
}
function scene(id, w, h, fill, layers) {
  return { name: id, format: { id, width: w, height: h }, background: { type: "solid", fill }, layers };
}
function pack(fields, layers) {
  return {
    precio: "gratis",
    idiomas: ["es", "en"],
    etiquetas: fields.etiquetas || [fields.uso],
    formatos: [fields.formato],
    estilo: fields.estilo || "claro",
    color: fields.color || "crema",
    ...fields,
    build: () => scene(fields.formato, fields.w, fields.h, fields.fill, layers),
  };
}

const cv = (id, es, en, fill, layers, estilo, color) => pack({
  id, nombre: { es, en }, formato: "cv", uso: "curriculum", shell: "print", w: 794, h: 1123, fill, estilo, color,
  etiquetas: ["curriculum", "cv"],
}, layers);

const deck = (id, es, en, fill, layers, estilo, color, uso = "presentacion") => pack({
  id, nombre: { es, en }, formato: "deck", uso, shell: "deck", w: 1920, h: 1080, fill, estilo, color,
  etiquetas: [uso, "paginas"],
}, layers);

export function masPlantillas() {
  const o = (i) => OCT[i % 3];
  return [
    cv("cv-riel", "Currículum con riel", "Resume with rail", C, [
      r("Riel", 0, 0, 246, 1123, N, 1),
      r("Marca", 28, 40, 92, 10, P, 4),
      t("Marca", 28, 64, 190, 40, "ORVUPI", "anton", 26, C, 20),
      im(46, 140, 154, 154, o(0)),
      t("Nombre", 286, 48, 470, 78, "Mara Tinta", "archivo", 42, N),
      t("Oficio", 286, 136, 470, 44, "Diseño de comunidad", "barlow", 28, P),
      r("Linea", 286, 198, 160, 6, N, 5),
      t("Resumen", 286, 230, 470, 150, "Piezas claras para el taller y la comunidad.", "barlow", 26, N),
      t("Bloque", 286, 420, 470, 220, "Proyectos\nCartel de barrio\nFicha de taller\nPieza de marca", "barlow", 28, N),
      t("Contacto", 28, 980, 190, 80, "Comunidad\nORVUPI", "barlow", 22, C, 21),
    ], "claro", "crema"),

    cv("cv-cabecera", "Currículum con cabecera", "Resume with header", C, [
      r("Cabecera", 0, 0, 794, 250, P, 1),
      im(40, 48, 160, 160, o(1)),
      t("Nombre", 230, 58, 520, 80, "Leo Costa", "archivo", 46, N),
      t("Oficio", 230, 148, 520, 48, "Relatos visuales", "barlow", 30, N),
      t("Resumen", 48, 300, 700, 140, "Una idea clara, un equipo pequeño y ganas de aprender.", "barlow", 28, N),
      r("Banda", 48, 470, 698, 120, N, 3),
      t("Banda", 72, 500, 650, 70, "Proyectos con la comunidad", "anton", 32, C),
      t("Lista", 48, 630, 700, 280, "Taller de cartel\nNotas de marca\nPieza para redes\nFicha para aprender", "barlow", 30, N),
    ], "marca", "rosa"),

    cv("cv-tarjeta", "Currículum en tarjeta", "Resume card", N, [
      r("Hoja", 36, 36, 722, 1051, C, 1),
      r("Sello", 72, 72, 120, 12, P, 4),
      t("Marca", 72, 100, 300, 40, "ORVUPI", "anton", 28, N, 20),
      im(500, 80, 200, 200, o(2)),
      t("Nombre", 72, 320, 620, 90, "Iris Marea", "archivo", 52, N),
      t("Oficio", 72, 420, 620, 50, "Piezas y talleres", "barlow", 32, P),
      t("Cuerpo", 72, 520, 620, 300, "Curiosidad\nOcho caminos para contar una idea.\n\nEquipo\nComunidad ORVUPI", "barlow", 30, N),
    ], "claro", "azul"),

    cv("cv-derecha", "Currículum lateral", "Side resume", C, [
      r("Riel", 548, 0, 246, 1123, N, 1),
      t("Nombre", 40, 48, 480, 90, "Teo Bruma", "archivo", 48, N),
      t("Oficio", 40, 146, 480, 48, "Marca y cartel", "barlow", 30, P),
      t("Cuerpo", 40, 240, 480, 420, "Proyectos\nUn cartel, una invitación, una ficha.\n\nAprender\nMirar, probar y contar.", "barlow", 30, N),
      im(590, 80, 164, 164, o(0)),
      t("Marca", 580, 980, 190, 70, "ORVUPI", "anton", 28, C, 20),
    ], "informativo", "crema"),

    cv("cv-espina", "Currículum con espina", "Spine resume", C, [
      r("Espina", 0, 0, 28, 1123, P, 1),
      t("Nombre", 68, 56, 680, 100, "Paz Dunas", "archivo", 56, N),
      t("Oficio", 68, 164, 680, 48, "Notas y mapas", "barlow", 30, P),
      r("Ficha", 68, 260, 680, 180, N, 3),
      t("Ficha", 92, 300, 630, 110, "Una frase sobre el equipo con el que creas.", "barlow", 32, C),
      t("Bloque", 68, 480, 680, 360, "Proyectos\nMapa de taller\nCartel de encuentro\nPieza de comunidad", "barlow", 32, N),
    ], "claro", "rosa"),

    cv("cv-partido", "Currículum partido", "Split resume", C, [
      r("Mitad", 0, 0, 360, 1123, N, 1),
      im(70, 80, 220, 220, o(1)),
      t("Nombre", 36, 340, 290, 140, "Nico Olas", "archivo", 48, C),
      t("Oficio", 36, 500, 290, 80, "Curiosidad aplicada", "barlow", 28, P),
      t("Marca", 36, 1020, 290, 48, "ORVUPI", "anton", 28, C, 20),
      t("Titulo", 400, 80, 350, 60, "Proyectos", "anton", 36, N),
      t("Cuerpo", 400, 170, 350, 500, "Cartel\nInvitación\nFicha\nPresentación\nPieza de marca", "barlow", 32, N),
    ], "marca", "azul"),

    cv("cv-bandas", "Currículum por bandas", "Banded resume", C, [
      r("Tope", 0, 0, 794, 150, N, 1),
      t("Nombre", 40, 36, 520, 70, "Luz Puerto", "archivo", 44, C),
      t("Oficio", 40, 100, 400, 36, "Comunidad ORVUPI", "barlow", 24, P),
      im(600, 24, 150, 150, o(2)),
      r("A", 40, 200, 12, 180, P, 4),
      t("A", 72, 200, 680, 180, "Mirar\nUna idea que se puede contar en una pieza.", "barlow", 30, N),
      r("B", 40, 420, 12, 180, P, 4),
      t("B", 72, 420, 680, 180, "Probar\nUn taller corto con el equipo.", "barlow", 30, N),
      r("C", 40, 640, 12, 180, P, 4),
      t("C", 72, 640, 680, 180, "Contar\nCartel, ficha y nota de marca.", "barlow", 30, N),
    ], "informativo", "azul"),

    cv("cv-foto", "Currículum con retrato", "Portrait resume", C, [
      im(0, 0, 794, 420, o(0), 1),
      r("Velo", 0, 300, 794, 160, C, 3),
      t("Nombre", 40, 330, 720, 80, "Ada Muelle", "archivo", 48, N),
      t("Oficio", 40, 410, 720, 44, "Aprender haciendo", "barlow", 28, P),
      t("Cuerpo", 40, 500, 720, 400, "Proyectos de comunidad\nPiezas para talleres\nNotas visuales\nEncuentros", "barlow", 34, N),
    ], "humor", "crema"),

    cv("cv-columnas", "Currículum en columnas", "Two-column resume", C, [
      t("Nombre", 40, 40, 714, 80, "Río Palma", "archivo", 48, N),
      r("Linea", 40, 130, 220, 8, P, 4),
      t("Izq", 40, 180, 330, 700, "Oficio\nTaller\n\nAprender\nNotas", "barlow", 28, N),
      r("Der", 400, 180, 354, 860, N, 2),
      t("Der", 424, 210, 310, 700, "Piezas\n\nCartel\nFicha\nLogo\nNotas", "barlow", 30, C),
    ], "claro", "azul"),

    cv("cv-formal", "Currículum centrado", "Centered resume", C, [
      r("Tope", 0, 0, 794, 16, P, 1),
      t("Marca", 40, 48, 714, 36, "ORVUPI", "anton", 22, P, 20, "center"),
      t("Nombre", 40, 140, 714, 90, "Noa Selva", "archivo", 52, N, 30, "center"),
      t("Oficio", 40, 240, 714, 48, "Piezas claras", "barlow", 30, P, 31, "center"),
      r("Linea", 297, 310, 200, 4, N, 4),
      t("Cuerpo", 80, 360, 634, 500, "Una idea clara.\nProyectos con la comunidad.\nTalleres, carteles y fichas.\nCuriosidad en cada pieza.", "barlow", 32, N, 32, "center"),
      im(297, 860, 200, 200, o(1)),
    ], "claro", "rosa"),

    deck("deck-portada", "Portada de ideas", "Ideas cover", N, [
      r("Barra", 0, 960, 1920, 120, P, 2),
      t("Marca", 80, 80, 400, 48, "ORVUPI", "anton", 32, P, 20),
      t("Titulo", 80, 280, 1000, 220, "Una idea clara", "archivo", 84, C),
      t("Sub", 80, 540, 900, 120, "Presentación para la comunidad", "barlow", 40, C),
      im(1280, 220, 520, 520, o(0)),
      t("Pie", 80, 990, 600, 60, "Creamos juntos", "barlow", 32, N),
    ], "claro", "azul"),

    deck("deck-tres", "Tres ideas", "Three ideas", C, [
      t("Titulo", 80, 60, 1200, 90, "Tres caminos", "archivo", 64, N),
      r("A", 80, 240, 540, 700, N, 2),
      r("B", 690, 240, 540, 700, P, 2),
      r("C", 1300, 240, 540, 700, N, 2),
      t("A", 110, 300, 480, 200, "Mirar", "anton", 54, C),
      t("B", 720, 300, 480, 200, "Probar", "anton", 54, N),
      t("C", 1330, 300, 480, 200, "Contar", "anton", 54, C),
      t("Aa", 110, 520, 480, 300, "Una pieza para observar.", "barlow", 36, C),
      t("Bb", 720, 520, 480, 300, "Un taller con el equipo.", "barlow", 36, N),
      t("Cc", 1330, 520, 480, 300, "Un cartel para la comunidad.", "barlow", 36, C),
    ], "informativo", "crema"),

    deck("deck-cita", "Cita de comunidad", "Community quote", C, [
      r("Lado", 0, 0, 28, 1080, P, 1),
      t("Cita", 120, 220, 1400, 360, "Hay sitio para tu idea.", "archivo", 84, N),
      t("Firma", 120, 640, 800, 80, "Comunidad ORVUPI", "barlow", 40, P),
      im(1500, 680, 320, 320, o(2)),
    ], "claro", "rosa"),

    deck("deck-panel", "Panel de proyecto", "Project panel", N, [
      r("Panel", 80, 80, 900, 920, C, 2),
      t("Kicker", 120, 140, 700, 50, "PROYECTO", "anton", 28, P),
      t("Titulo", 120, 230, 780, 220, "Ocho caminos", "archivo", 72, N),
      t("Cuerpo", 120, 500, 780, 280, "Notas, cartel y ficha para un taller de comunidad.", "barlow", 36, N),
      im(1120, 240, 640, 640, o(1)),
    ], "informativo", "azul", "proyecto"),

    deck("deck-rosa", "Lámina rosa", "Pink sheet", P, [
      t("Titulo", 80, 180, 1100, 280, "Creamos juntos", "archivo", 92, N),
      t("Sub", 80, 500, 900, 140, "Una presentación corta. Sin humo.", "barlow", 42, N),
      r("Sello", 80, 760, 280, 90, N, 3),
      t("Sello", 104, 782, 240, 50, "ORVUPI", "anton", 32, C),
      im(1200, 180, 600, 600, o(0)),
    ], "marca", "rosa"),

    deck("deck-agenda", "Agenda de tres filas", "Three-row agenda", C, [
      t("Titulo", 80, 50, 1000, 90, "Agenda", "archivo", 64, N),
      r("A", 80, 200, 1760, 220, N, 2),
      r("B", 80, 460, 1760, 220, P, 2),
      r("C", 80, 720, 1760, 220, N, 2),
      t("A", 120, 250, 1400, 120, "Abrir el taller", "anton", 48, C),
      t("B", 120, 510, 1400, 120, "Probar una pieza", "anton", 48, N),
      t("C", 120, 770, 1400, 120, "Contar lo aprendido", "anton", 48, C),
    ], "informativo", "crema"),

    pack({
      id: "proy-breve", nombre: { es: "Brief de proyecto", en: "Project brief" }, formato: "doc", uso: "proyecto", shell: "doc", w: 794, h: 1123, fill: C, estilo: "informativo", color: "crema", etiquetas: ["proyecto", "brief"],
    }, [
      r("Tope", 0, 0, 794, 180, N, 1),
      t("Kicker", 40, 40, 400, 36, "PROYECTO", "anton", 24, P),
      t("Titulo", 40, 84, 700, 70, "Taller de pieza", "archivo", 42, C),
      t("Que", 40, 230, 714, 160, "Qué hacemos\nUna pieza clara para la comunidad.", "barlow", 30, N),
      t("Quien", 40, 420, 714, 160, "Quién entra\nEquipo curioso. Ocho ideas.", "barlow", 30, N),
      im(220, 680, 360, 360, o(2)),
    ]),

    pack({
      id: "proy-portada", nombre: { es: "Portada de proyecto", en: "Project cover" }, formato: "deck", uso: "proyecto", shell: "deck", w: 1920, h: 1080, fill: C, estilo: "marca", color: "rosa", etiquetas: ["proyecto"],
    }, [
      r("Bloque", 0, 0, 760, 1080, P, 1),
      t("Titulo", 60, 280, 640, 240, "El proyecto", "archivo", 80, N),
      t("Sub", 60, 560, 640, 120, "Comunidad ORVUPI", "barlow", 40, N),
      t("Der", 860, 200, 960, 200, "Una idea clara para el equipo.", "archivo", 64, N),
      im(1100, 460, 480, 480, o(0)),
    ]),

    pack({
      id: "proy-caso", nombre: { es: "Caso de comunidad", en: "Community case" }, formato: "doc", uso: "proyecto", shell: "doc", w: 794, h: 1123, fill: N, estilo: "claro", color: "azul", etiquetas: ["proyecto", "caso"],
    }, [
      r("Hoja", 48, 48, 698, 1027, C, 1),
      t("Kicker", 80, 80, 400, 36, "CASO", "anton", 24, P),
      t("Titulo", 80, 130, 620, 120, "Ocho caminos", "archivo", 52, N),
      t("Cuerpo", 80, 280, 620, 280, "Qué cambió\nUna pieza más clara para el taller.\n\nQué queda\nCartel, ficha y nota.", "barlow", 30, N),
      im(240, 640, 320, 320, o(1)),
    ]),

    pack({
      id: "proy-equipo", nombre: { es: "Equipo del proyecto", en: "Project team" }, formato: "deck", uso: "proyecto", shell: "deck", w: 1920, h: 1080, fill: N, estilo: "humor", color: "azul", etiquetas: ["proyecto", "equipo"],
    }, [
      t("Titulo", 80, 70, 1000, 90, "El equipo", "archivo", 64, C),
      im(80, 240, 480, 480, o(0)),
      im(640, 240, 480, 480, o(1)),
      im(1200, 240, 480, 480, o(2)),
      t("A", 80, 780, 480, 80, "Curiosidad", "barlow", 36, P),
      t("B", 640, 780, 480, 80, "Taller", "barlow", 36, P),
      t("C", 1200, 780, 480, 80, "Comunidad", "barlow", 36, P),
    ], ),

    pack({
      id: "red-ig-bloque", nombre: { es: "Post en bloque rosa", en: "Pink block post" }, formato: "ig", uso: "redes", shell: "design", w: 1080, h: 1350, fill: C, estilo: "marca", color: "rosa", etiquetas: ["redes", "vertical"],
    }, [
      r("Bloque", 0, 0, 1080, 620, P, 1),
      t("Titulo", 56, 80, 680, 220, "Hay sitio para tu idea", "archivo", 64, N),
      t("Sub", 56, 340, 640, 140, "Comunidad ORVUPI", "barlow", 40, N),
      im(300, 560, 480, 480, o(0)),
      t("Pie", 56, 1140, 900, 80, "Creamos juntos", "barlow", 36, N),
    ]),

    pack({
      id: "red-ig-noche", nombre: { es: "Post nocturno", en: "Night post" }, formato: "ig", uso: "redes", shell: "design", w: 1080, h: 1350, fill: N, estilo: "humor", color: "azul", etiquetas: ["redes"],
    }, [
      r("Sello", 56, 56, 220, 64, P, 3),
      t("Sello", 72, 70, 190, 40, "ORVUPI", "anton", 26, N),
      t("Titulo", 56, 180, 960, 260, "Ocho ideas. Una pieza.", "archivo", 72, C),
      im(220, 520, 640, 640, o(2)),
    ]),

    pack({
      id: "red-cuadrado-tipo", nombre: { es: "Tipo grande", en: "Big type" }, formato: "square", uso: "redes", shell: "design", w: 1080, h: 1080, fill: P, estilo: "marca", color: "rosa", etiquetas: ["redes", "tipo"],
    }, [
      t("Titulo", 56, 80, 960, 320, "Curiosidad", "archivo", 120, N),
      t("Sub", 56, 420, 700, 140, "Una pieza para la comunidad.", "barlow", 40, N),
      im(680, 620, 340, 340, o(1)),
    ]),

    pack({
      id: "red-fb-partido", nombre: { es: "Banner partido", en: "Split banner" }, formato: "fb", uso: "redes", shell: "design", w: 1200, h: 630, fill: C, estilo: "claro", color: "azul", etiquetas: ["redes", "horizontal"],
    }, [
      r("Lado", 0, 0, 480, 630, N, 1),
      t("Titulo", 40, 160, 400, 200, "Comunidad ORVUPI", "archivo", 48, C),
      t("Der", 540, 160, 600, 180, "Hay sitio para tu idea", "archivo", 48, N),
      im(860, 340, 260, 260, o(0)),
    ]),

    pack({
      id: "red-li-nota", nombre: { es: "Nota profesional", en: "Work note" }, formato: "li", uso: "redes", shell: "design", w: 1200, h: 627, fill: C, estilo: "informativo", color: "crema", etiquetas: ["redes", "profesional"],
    }, [
      r("Linea", 0, 0, 1200, 16, P, 1),
      im(48, 140, 280, 280, o(1)),
      t("Titulo", 380, 150, 760, 140, "Aprendemos en público", "archivo", 48, N),
      t("Cuerpo", 380, 320, 760, 140, "Una nota clara. Un taller. Una pieza.", "barlow", 32, N),
    ]),

    pack({
      id: "red-historia-hoja", nombre: { es: "Historia con hoja", en: "Story sheet" }, formato: "story", uso: "historia", shell: "design", w: 1080, h: 1920, fill: N, estilo: "claro", color: "azul", etiquetas: ["historia"],
    }, [
      t("Hola", 64, 120, 900, 140, "Hola", "archivo", 96, C),
      r("Hoja", 64, 340, 952, 1200, C, 2),
      t("Cuerpo", 110, 400, 860, 280, "Pasa, mira y crea con nosotros.", "barlow", 48, N),
      im(200, 760, 680, 680, o(2)),
      r("Sello", 64, 1640, 280, 80, P, 4),
      t("Sello", 88, 1658, 240, 48, "ORVUPI", "anton", 32, N),
    ]),

    pack({
      id: "red-bio-fichas", nombre: { es: "Bio con fichas", en: "Bio cards" }, formato: "bio", uso: "redes", shell: "design", w: 1080, h: 1920, fill: C, estilo: "marca", color: "rosa", etiquetas: ["bio"],
    }, [
      im(390, 80, 300, 300, o(0)),
      t("Nombre", 80, 400, 920, 80, "ORVUPI", "archivo", 64, N, 30, "center"),
      r("A", 80, 540, 920, 160, N, 2),
      r("B", 80, 740, 920, 160, P, 2),
      r("C", 80, 940, 920, 160, N, 2),
      t("A", 120, 580, 840, 80, "Taller", "anton", 40, C),
      t("B", 120, 780, 840, 80, "Cartel", "anton", 40, N),
      t("C", 120, 980, 840, 80, "Comunidad", "anton", 40, C),
    ]),

    pack({
      id: "red-thumb-golpe", nombre: { es: "Miniatura de golpe", en: "Punch thumbnail" }, formato: "thumb", uso: "miniatura", shell: "design", w: 1280, h: 720, fill: P, estilo: "humor", color: "rosa", etiquetas: ["miniatura"],
    }, [
      t("Titulo", 48, 80, 760, 280, "Mira esto", "archivo", 96, N),
      t("Sub", 48, 380, 700, 120, "Una idea. Ocho caminos.", "barlow", 40, N),
      im(820, 80, 400, 400, o(2)),
    ]),

    pack({
      id: "doc-acta", nombre: { es: "Acta de taller", en: "Workshop notes" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: C, estilo: "informativo", color: "crema", etiquetas: ["documento", "acta"],
    }, [
      t("Titulo", 48, 48, 700, 80, "Acta", "archivo", 56, N),
      r("Linea", 48, 140, 180, 8, P, 3),
      t("Cuando", 48, 180, 700, 80, "Encuentro de comunidad", "barlow", 28, P),
      t("Cuerpo", 48, 280, 700, 500, "Qué vimos\nUna pieza clara.\n\nQué probamos\nUn cartel y una ficha.\n\nQué sigue\nContar el taller.", "barlow", 30, N),
    ]),

    pack({
      id: "doc-carta", nombre: { es: "Carta breve", en: "Short letter" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: C, estilo: "claro", color: "crema", etiquetas: ["documento", "carta"],
    }, [
      r("Margen", 36, 36, 722, 1051, N, 1),
      r("Dentro", 52, 52, 690, 1019, C, 2),
      t("Marca", 88, 88, 400, 40, "ORVUPI", "anton", 28, P),
      t("Saludo", 88, 180, 600, 80, "Hola, equipo", "archivo", 42, N),
      t("Cuerpo", 88, 300, 600, 400, "Gracias por crear con la comunidad. Aquí va una nota corta y clara.", "barlow", 30, N),
      im(460, 760, 220, 220, o(0)),
    ]),

    pack({
      id: "doc-indice", nombre: { es: "Índice de piezas", en: "Piece index" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: N, estilo: "informativo", color: "azul", etiquetas: ["documento", "indice"],
    }, [
      t("Titulo", 48, 48, 700, 80, "Índice", "archivo", 56, C),
      r("A", 48, 180, 698, 120, C, 2),
      r("B", 48, 320, 698, 120, P, 2),
      r("C", 48, 460, 698, 120, C, 2),
      r("D", 48, 600, 698, 120, P, 2),
      t("A", 72, 210, 640, 60, "Cartel", "anton", 32, N),
      t("B", 72, 350, 640, 60, "Ficha", "anton", 32, N),
      t("C", 72, 490, 640, 60, "Invitación", "anton", 32, N),
      t("D", 72, 630, 640, 60, "Presentación", "anton", 32, C),
    ]),

    pack({
      id: "doc-portada", nombre: { es: "Portada de documento", en: "Document cover" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: P, estilo: "marca", color: "rosa", etiquetas: ["documento", "portada"],
    }, [
      t("Marca", 48, 48, 400, 40, "ORVUPI", "anton", 28, N),
      t("Titulo", 48, 360, 700, 220, "Notas de comunidad", "archivo", 64, N),
      t("Sub", 48, 620, 600, 100, "Una idea clara", "barlow", 36, N),
      im(480, 820, 250, 250, o(1)),
    ]),

    pack({
      id: "fly-encuentro", nombre: { es: "Flyer de encuentro", en: "Meetup flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: C, estilo: "claro", color: "rosa", etiquetas: ["flyer"],
    }, [
      r("Tope", 0, 0, 816, 280, P, 1),
      t("Kicker", 40, 40, 400, 40, "ENCUENTRO", "anton", 28, N),
      t("Titulo", 40, 100, 720, 140, "Taller de pieza", "archivo", 56, N),
      t("Cuando", 40, 340, 720, 120, "Lunes por la tarde\nPlaza de la comunidad", "barlow", 36, N),
      im(200, 520, 420, 420, o(2)),
    ]),

    pack({
      id: "fly-bloques", nombre: { es: "Flyer en bloques", en: "Block flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: N, estilo: "humor", color: "azul", etiquetas: ["flyer"],
    }, [
      r("A", 36, 36, 744, 300, P, 2),
      t("A", 60, 80, 680, 180, "Ven a crear", "archivo", 72, N),
      r("B", 36, 360, 360, 320, C, 2),
      r("C", 420, 360, 360, 320, C, 2),
      t("B", 56, 400, 320, 200, "Mirar", "anton", 40, N),
      t("C", 440, 400, 320, 200, "Contar", "anton", 40, N),
      im(250, 720, 300, 300, o(0)),
    ]),

    pack({
      id: "fly-centrado", nombre: { es: "Flyer centrado", en: "Centered flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: C, estilo: "marca", color: "crema", etiquetas: ["flyer"],
    }, [
      r("Marco", 28, 28, 760, 1000, N, 1),
      t("Marca", 48, 70, 720, 40, "ORVUPI", "anton", 28, P, 20, "center"),
      t("Titulo", 60, 220, 700, 200, "Creamos juntos", "archivo", 60, N, 30, "center"),
      im(228, 460, 360, 360, o(1)),
      t("Pie", 60, 860, 700, 80, "Comunidad", "barlow", 32, N, 31, "center"),
    ]),

    pack({
      id: "fly-lista", nombre: { es: "Flyer con lista", en: "List flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: P, estilo: "informativo", color: "rosa", etiquetas: ["flyer"],
    }, [
      t("Titulo", 40, 40, 736, 140, "Qué traer", "archivo", 64, N),
      r("A", 40, 220, 736, 140, C, 2),
      r("B", 40, 390, 736, 140, N, 2),
      r("C", 40, 560, 736, 140, C, 2),
      t("A", 70, 255, 680, 70, "Una idea", "anton", 36, N),
      t("B", 70, 425, 680, 70, "Un equipo", "anton", 36, C),
      t("C", 70, 595, 680, 70, "Ganas de probar", "anton", 36, N),
      t("Pie", 40, 860, 500, 60, "ORVUPI", "barlow", 32, N),
    ]),

    pack({
      id: "car-noche", nombre: { es: "Cartel de noche", en: "Night poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: N, estilo: "humor", color: "azul", etiquetas: ["cartel"],
    }, [
      t("Titulo", 64, 80, 950, 280, "Ven", "archivo", 160, C),
      t("Sub", 64, 380, 900, 140, "Taller de comunidad", "barlow", 48, P),
      im(220, 560, 640, 640, o(2)),
      r("Pie", 0, 1280, 1080, 160, P, 3),
      t("Pie", 64, 1320, 900, 80, "ORVUPI", "anton", 42, N),
    ]),

    pack({
      id: "car-marco", nombre: { es: "Cartel con marco", en: "Framed poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: C, estilo: "claro", color: "crema", etiquetas: ["cartel"],
    }, [
      r("Marco", 36, 36, 1008, 1368, P, 1),
      r("Dentro", 60, 60, 960, 1320, C, 2),
      t("Titulo", 100, 140, 880, 240, "Una idea clara", "archivo", 72, N, 30, "center"),
      im(250, 440, 580, 580, o(0)),
      t("Pie", 100, 1100, 880, 120, "Comunidad ORVUPI", "barlow", 40, N, 31, "center"),
    ]),

    pack({
      id: "car-foto", nombre: { es: "Cartel con retrato", en: "Portrait poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: P, estilo: "marca", color: "rosa", etiquetas: ["cartel"],
    }, [
      im(0, 0, 1080, 780, o(1), 1),
      r("Banda", 0, 700, 1080, 740, N, 2),
      t("Titulo", 56, 780, 960, 220, "Ocho caminos", "archivo", 80, C),
      t("Sub", 56, 1040, 900, 120, "Un cartel para la comunidad", "barlow", 40, P),
    ]),

    pack({
      id: "car-tipo", nombre: { es: "Cartel tipográfico", en: "Type poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: C, estilo: "comic", color: "rosa", etiquetas: ["cartel", "tipo"],
    }, [
      t("A", 48, 60, 980, 200, "MIRA", "archivo", 140, N),
      t("B", 48, 280, 980, 200, "PRUEBA", "archivo", 120, P),
      t("C", 48, 520, 980, 200, "CUENTA", "archivo", 120, N),
      im(680, 900, 340, 340, o(2)),
      t("Pie", 48, 1100, 600, 80, "ORVUPI", "anton", 36, N),
    ]),

    pack({
      id: "logo-sello", nombre: { es: "Sello de marca", en: "Brand seal" }, formato: "logo", uso: "logo", shell: "print", w: 1080, h: 1080, fill: C, estilo: "marca", color: "rosa", etiquetas: ["logo"],
    }, [
      r("Circulo", 140, 80, 800, 800, P, 1),
      im(250, 140, 580, 580, o(0)),
      t("Marca", 140, 900, 800, 80, "ORVUPI", "anton", 64, N, 30, "center"),
    ]),

    pack({
      id: "logo-noche", nombre: { es: "Logo nocturno", en: "Night logo" }, formato: "logo", uso: "logo", shell: "print", w: 1080, h: 1080, fill: N, estilo: "marca", color: "azul", etiquetas: ["logo"],
    }, [
      r("Placa", 180, 120, 720, 720, P, 2),
      im(280, 180, 520, 520, o(1)),
      t("Marca", 80, 880, 920, 80, "ORVUPI", "archivo", 64, C, 30, "center"),
    ]),

    pack({
      id: "logo-palabra", nombre: { es: "Palabra de marca", en: "Wordmark" }, formato: "logo", uso: "logo", shell: "print", w: 1080, h: 1080, fill: P, estilo: "claro", color: "rosa", etiquetas: ["logo", "tipo"],
    }, [
      t("Marca", 40, 280, 1000, 200, "ORVUPI", "archivo", 140, N, 30, "center"),
      t("Sub", 40, 500, 1000, 80, "Comunidad", "barlow", 40, N, 31, "center"),
      im(390, 640, 300, 300, o(2)),
    ]),

    pack({
      id: "logo-horizontal", nombre: { es: "Logo en línea", en: "Inline logo" }, formato: "fb", uso: "logo", shell: "print", w: 1200, h: 630, fill: C, estilo: "marca", color: "crema", etiquetas: ["logo"],
    }, [
      im(60, 80, 470, 470, o(0)),
      t("Marca", 560, 180, 580, 140, "ORVUPI", "archivo", 92, N),
      t("Sub", 560, 340, 580, 80, "Comunidad", "barlow", 40, P),
    ]),

    pack({
      id: "inv-marco", nombre: { es: "Invitación con marco", en: "Framed invitation" }, formato: "invite", uso: "invitacion", shell: "print", w: 750, h: 1050, fill: C, estilo: "claro", color: "crema", etiquetas: ["invitacion"],
    }, [
      r("Marco", 28, 28, 694, 994, N, 1),
      t("Kicker", 60, 80, 630, 40, "INVITACIÓN", "anton", 24, P, 20, "center"),
      t("Titulo", 60, 180, 630, 180, "Ven al taller", "archivo", 60, N, 30, "center"),
      t("Cuando", 60, 400, 630, 140, "Lunes por la tarde\nPlaza de la comunidad", "barlow", 32, N, 31, "center"),
      im(215, 580, 320, 320, o(1)),
    ]),

    pack({
      id: "inv-partida", nombre: { es: "Invitación partida", en: "Split invitation" }, formato: "invite", uso: "invitacion", shell: "print", w: 750, h: 1050, fill: C, estilo: "marca", color: "rosa", etiquetas: ["invitacion"],
    }, [
      r("Tope", 0, 0, 750, 460, P, 1),
      t("Titulo", 40, 80, 670, 200, "Estás invitado", "archivo", 60, N),
      t("Sub", 40, 300, 670, 80, "Comunidad ORVUPI", "barlow", 32, N),
      t("Cuerpo", 40, 520, 670, 200, "Un encuentro para crear una pieza clara.", "barlow", 32, N),
      im(430, 740, 260, 260, o(2)),
    ]),

    pack({
      id: "inv-noche", nombre: { es: "Invitación nocturna", en: "Night invitation" }, formato: "invite", uso: "invitacion", shell: "print", w: 750, h: 1050, fill: N, estilo: "humor", color: "azul", etiquetas: ["invitacion"],
    }, [
      r("Tarjeta", 40, 40, 670, 970, C, 1),
      t("Kicker", 70, 80, 600, 40, "ORVUPI", "anton", 28, P),
      t("Titulo", 70, 180, 600, 180, "Pasa y crea", "archivo", 64, N),
      im(180, 420, 400, 400, o(0)),
      t("Pie", 70, 860, 600, 80, "Taller de comunidad", "barlow", 32, N),
    ]),

    pack({
      id: "inv-fina", nombre: { es: "Invitación fina", en: "Slim invitation" }, formato: "invite", uso: "invitacion", shell: "print", w: 750, h: 1050, fill: P, estilo: "claro", color: "rosa", etiquetas: ["invitacion"],
    }, [
      t("Titulo", 48, 120, 654, 220, "Te esperamos", "archivo", 68, N, 30, "center"),
      r("Linea", 275, 360, 200, 6, N, 4),
      t("Cuando", 48, 400, 654, 160, "Lunes\nPlaza de la comunidad", "barlow", 36, N, 31, "center"),
      im(225, 620, 300, 300, o(1)),
    ]),

    pack({
      id: "vid-tercio", nombre: { es: "Vídeo con tercio", en: "Lower third video" }, formato: "video", uso: "video", shell: "video", w: 1920, h: 1080, fill: N, estilo: "informativo", color: "azul", etiquetas: ["video"],
    }, [
      im(1120, 80, 720, 720, o(0)),
      r("Tercio", 0, 760, 1920, 320, P, 3),
      t("Titulo", 60, 800, 1400, 120, "Una idea clara", "archivo", 72, N),
      t("Sub", 60, 940, 1200, 80, "Comunidad ORVUPI", "barlow", 36, N),
    ]),

    pack({
      id: "vid-lado", nombre: { es: "Vídeo a dos lados", en: "Split video" }, formato: "video", uso: "video", shell: "video", w: 1920, h: 1080, fill: C, estilo: "claro", color: "crema", etiquetas: ["video"],
    }, [
      r("Lado", 0, 0, 860, 1080, N, 1),
      t("Titulo", 60, 280, 740, 240, "Mira el taller", "archivo", 72, C),
      t("Sub", 60, 560, 700, 120, "Una pieza. Un equipo.", "barlow", 36, P),
      im(980, 180, 760, 760, o(2)),
    ]),

    pack({
      id: "vid-rosa", nombre: { es: "Vídeo rosa", en: "Pink video" }, formato: "video", uso: "video", shell: "video", w: 1920, h: 1080, fill: P, estilo: "marca", color: "rosa", etiquetas: ["video"],
    }, [
      t("Titulo", 80, 180, 1100, 280, "Creamos juntos", "archivo", 92, N),
      r("Sello", 80, 520, 320, 90, N, 3),
      t("Sello", 104, 542, 280, 50, "ORVUPI", "anton", 32, C),
      im(1180, 160, 640, 640, o(1)),
    ]),

    pack({
      id: "vid-nota", nombre: { es: "Fotograma de nota", en: "Note frame" }, formato: "video", uso: "video", shell: "video", w: 1920, h: 1080, fill: C, estilo: "humor", color: "azul", etiquetas: ["video", "nota"],
    }, [
      r("Nota", 120, 120, 1680, 840, N, 1),
      t("Titulo", 180, 220, 1100, 200, "Hoy aprendemos", "archivo", 72, C),
      t("Sub", 180, 460, 900, 140, "Una ficha. Un cartel. Una idea.", "barlow", 40, P),
      im(1280, 360, 420, 420, o(0)),
    ]),

    pack({
      id: "piz-notas", nombre: { es: "Notas en la pizarra", en: "Board notes" }, formato: "board", uso: "pizarra", shell: "whiteboard", w: 1920, h: 1080, fill: "#F4F7FB", estilo: "claro", color: "crema", etiquetas: ["pizarra"],
    }, [
      r("A", 80, 80, 520, 360, P, 2),
      r("B", 680, 140, 520, 320, C, 2),
      r("C", 1280, 80, 520, 400, N, 2),
      t("A", 110, 120, 460, 200, "Mirar la idea", "anton", 40, N),
      t("B", 710, 180, 460, 180, "Probar una pieza", "anton", 36, N),
      t("C", 1310, 130, 460, 200, "Contar el taller", "anton", 40, C),
      im(80, 560, 360, 360, o(2)),
    ]),

    pack({
      id: "piz-columnas", nombre: { es: "Pizarra en columnas", en: "Column board" }, formato: "board", uso: "pizarra", shell: "whiteboard", w: 1920, h: 1080, fill: "#F4F7FB", estilo: "informativo", color: "azul", etiquetas: ["pizarra"],
    }, [
      t("Titulo", 60, 40, 800, 70, "Mapa de ideas", "archivo", 48, N),
      r("A", 60, 150, 560, 820, C, 2),
      r("B", 680, 150, 560, 820, P, 2),
      r("C", 1300, 150, 560, 820, N, 2),
      t("A", 90, 190, 500, 80, "Antes del taller", "anton", 32, N),
      t("Aa", 90, 300, 500, 400, "Observar\nPreguntar\nAnotar", "barlow", 36, N),
      t("B", 710, 190, 500, 80, "En el taller", "anton", 32, N),
      t("Bb", 710, 300, 500, 400, "Probar\nCrear\nMostrar", "barlow", 36, N),
      t("C", 1330, 190, 500, 80, "Después", "anton", 32, C),
      t("Cc", 1330, 300, 500, 400, "Contar\nGuardar\nCompartir la pieza", "barlow", 36, C),
    ]),

    pack({
      id: "piz-grande", nombre: { es: "Idea grande", en: "Big idea board" }, formato: "board", uso: "pizarra", shell: "whiteboard", w: 1920, h: 1080, fill: C, estilo: "humor", color: "rosa", etiquetas: ["pizarra"],
    }, [
      t("Titulo", 80, 80, 1100, 200, "Una idea clara", "archivo", 84, N),
      r("Chip", 80, 340, 280, 80, P, 3),
      r("Chip2", 390, 340, 280, 80, N, 3),
      r("Chip3", 700, 340, 360, 80, P, 3),
      t("Chip", 100, 358, 240, 48, "Mirar", "anton", 28, N),
      t("Chip2", 410, 358, 240, 48, "Probar", "anton", 28, C),
      t("Chip3", 720, 358, 320, 48, "Contar", "anton", 28, N),
      im(1280, 200, 520, 520, o(1)),
    ]),

    pack({
      id: "piz-equipo", nombre: { es: "Pizarra de equipo", en: "Team board" }, formato: "board", uso: "pizarra", shell: "whiteboard", w: 1920, h: 1080, fill: N, estilo: "marca", color: "azul", etiquetas: ["pizarra", "equipo"],
    }, [
      t("Titulo", 60, 50, 800, 80, "Equipo", "archivo", 56, C),
      im(60, 200, 400, 400, o(0)),
      im(520, 200, 400, 400, o(1)),
      im(980, 200, 400, 400, o(2)),
      r("Pie", 60, 680, 1760, 280, C, 2),
      t("Pie", 100, 740, 1600, 140, "Curiosidad, taller y comunidad en la misma mesa.", "barlow", 40, N),
    ]),

    pack({
      id: "web-fichas", nombre: { es: "Sitio con fichas", en: "Site with cards" }, formato: "web", uso: "web", shell: "web", w: 1280, h: 1800, fill: C, estilo: "claro", color: "crema", etiquetas: ["web"],
    }, [
      r("Nav", 0, 0, 1280, 96, N, 1),
      t("Marca", 36, 28, 300, 48, "ORVUPI", "anton", 32, C),
      t("Hero", 48, 160, 800, 160, "Una página para la comunidad", "archivo", 48, N),
      r("A", 48, 400, 360, 420, N, 2),
      r("B", 440, 400, 360, 420, P, 2),
      r("C", 832, 400, 400, 420, N, 2),
      t("A", 72, 440, 310, 80, "Taller", "anton", 36, C),
      t("B", 464, 440, 310, 80, "Cartel", "anton", 36, N),
      t("C", 856, 440, 340, 80, "Ficha", "anton", 36, C),
      im(420, 920, 440, 440, o(0)),
      t("Pie", 48, 1460, 800, 120, "Sección para lo que la comunidad crea.", "barlow", 32, N),
    ]),

    pack({
      id: "web-partido", nombre: { es: "Sitio partido", en: "Split site" }, formato: "web", uso: "web", shell: "web", w: 1280, h: 1800, fill: C, estilo: "marca", color: "rosa", etiquetas: ["web"],
    }, [
      r("Nav", 0, 0, 1280, 88, P, 1),
      t("Marca", 36, 24, 300, 48, "ORVUPI", "anton", 32, N),
      r("Lado", 0, 88, 560, 900, N, 2),
      t("Hero", 40, 200, 480, 240, "Hay sitio para tu idea", "archivo", 52, C),
      im(640, 200, 560, 560, o(1)),
      t("Sec", 48, 1100, 1100, 200, "Una sección\nTalleres, carteles y fichas.", "barlow", 36, N),
    ]),

    pack({
      id: "web-noche", nombre: { es: "Sitio nocturno", en: "Night site" }, formato: "web", uso: "web", shell: "web", w: 1280, h: 1800, fill: N, estilo: "humor", color: "azul", etiquetas: ["web"],
    }, [
      t("Marca", 48, 40, 400, 48, "ORVUPI", "anton", 32, P),
      t("Hero", 48, 180, 1100, 200, "Ocho caminos", "archivo", 84, C),
      t("Sub", 48, 400, 900, 100, "Una página clara para la comunidad.", "barlow", 36, C),
      r("Banda", 0, 620, 1280, 520, C, 2),
      t("Banda", 48, 680, 700, 200, "Qué hay aquí\nTaller, cartel y ficha.", "barlow", 36, N),
      im(820, 660, 400, 400, o(2)),
    ]),

    pack({
      id: "web-lista", nombre: { es: "Sitio en lista", en: "List site" }, formato: "web", uso: "web", shell: "web", w: 1280, h: 1800, fill: C, estilo: "informativo", color: "crema", etiquetas: ["web", "lista"],
    }, [
      r("Nav", 0, 0, 1280, 90, N, 1),
      t("Marca", 40, 24, 400, 48, "ORVUPI", "anton", 32, C),
      t("Hero", 48, 140, 900, 100, "Empieza por aquí", "archivo", 52, N),
      r("A", 48, 300, 1184, 180, P, 2),
      r("B", 48, 510, 1184, 180, N, 2),
      r("C", 48, 720, 1184, 180, P, 2),
      t("A", 80, 350, 1000, 80, "Mirar la comunidad", "anton", 40, N),
      t("B", 80, 560, 1000, 80, "Probar una pieza", "anton", 40, C),
      t("C", 80, 770, 1000, 80, "Contar el taller", "anton", 40, N),
    ]),

    pack({
      id: "fol-pasos", nombre: { es: "Folleto de pasos", en: "Steps leaflet" }, formato: "trifold", uso: "folleto", shell: "print", w: 1080, h: 630, fill: C, estilo: "informativo", color: "crema", etiquetas: ["folleto"],
    }, [
      r("A", 0, 0, 360, 630, N, 1),
      r("C", 720, 0, 360, 630, P, 1),
      t("A", 24, 80, 310, 200, "Mirar", "archivo", 48, C),
      t("B", 384, 80, 310, 200, "Probar", "archivo", 48, N),
      t("C", 744, 80, 310, 200, "Contar", "archivo", 48, N),
      t("Aa", 24, 300, 310, 200, "Una idea clara.", "barlow", 28, C),
      t("Bb", 384, 300, 310, 200, "Un taller corto.", "barlow", 28, N),
      t("Cc", 744, 300, 310, 200, "Una pieza lista.", "barlow", 28, N),
    ]),

    pack({
      id: "fol-marca", nombre: { es: "Folleto de marca", en: "Brand leaflet" }, formato: "trifold", uso: "folleto", shell: "print", w: 1080, h: 630, fill: N, estilo: "marca", color: "azul", etiquetas: ["folleto"],
    }, [
      t("Marca", 24, 40, 320, 50, "ORVUPI", "anton", 32, P),
      t("Titulo", 24, 140, 320, 200, "Comunidad", "archivo", 48, C),
      im(400, 80, 280, 280, o(0)),
      t("Pie", 744, 180, 300, 200, "Creamos juntos", "barlow", 36, C),
    ]),

    pack({
      id: "tar-oscura", nombre: { es: "Tarjeta oscura", en: "Dark card" }, formato: "card", uso: "tarjeta", shell: "print", w: 1050, h: 600, fill: N, estilo: "marca", color: "azul", etiquetas: ["tarjeta"],
    }, [
      r("Sello", 0, 0, 16, 600, P, 1),
      im(48, 80, 280, 280, o(1)),
      t("Nombre", 380, 120, 620, 90, "Tu nombre", "archivo", 52, C),
      t("Oficio", 380, 230, 620, 60, "Comunidad ORVUPI", "barlow", 32, P),
      t("Pie", 380, 420, 600, 50, "Piezas y talleres", "barlow", 28, C),
    ]),

    pack({
      id: "tar-clara", nombre: { es: "Tarjeta clara", en: "Light card" }, formato: "card", uso: "tarjeta", shell: "print", w: 1050, h: 600, fill: C, estilo: "claro", color: "rosa", etiquetas: ["tarjeta"],
    }, [
      r("Banda", 0, 0, 1050, 16, P, 1),
      t("Marca", 40, 40, 300, 40, "ORVUPI", "anton", 28, P),
      t("Nombre", 40, 160, 620, 90, "Tu nombre", "archivo", 56, N),
      t("Oficio", 40, 270, 600, 60, "Diseño de comunidad", "barlow", 32, N),
      im(740, 80, 260, 260, o(2)),
    ]),

    pack({
      id: "info-tres", nombre: { es: "Infografía mirar probar contar", en: "Look try tell infographic" }, formato: "info", uso: "infografia", shell: "print", w: 800, h: 2000, fill: C, estilo: "informativo", color: "crema", etiquetas: ["infografia"],
    }, [
      r("Tope", 0, 0, 800, 220, N, 1),
      t("Titulo", 40, 50, 720, 120, "Tres pasos", "archivo", 64, C),
      r("A", 40, 280, 720, 460, P, 2),
      r("B", 40, 780, 720, 460, N, 2),
      r("C", 40, 1280, 720, 460, P, 2),
      t("A", 70, 320, 660, 80, "Mirar", "anton", 48, N),
      t("Aa", 70, 430, 660, 200, "Observa una idea de la comunidad.", "barlow", 32, N),
      t("B", 70, 820, 660, 80, "Probar", "anton", 48, C),
      t("Bb", 70, 930, 660, 200, "Haz una pieza corta en el taller.", "barlow", 32, C),
      t("C", 70, 1320, 660, 80, "Contar", "anton", 48, N),
      t("Cc", 70, 1430, 660, 200, "Comparte lo que aprendiste.", "barlow", 32, N),
      im(250, 1760, 200, 200, o(0)),
    ]),

    pack({
      id: "info-lateral", nombre: { es: "Infografía con riel", en: "Rail infographic" }, formato: "info", uso: "infografia", shell: "print", w: 800, h: 2000, fill: C, estilo: "claro", color: "azul", etiquetas: ["infografia"],
    }, [
      r("Riel", 0, 0, 70, 2000, P, 1),
      t("Titulo", 110, 40, 640, 140, "Cómo empezar", "archivo", 52, N),
      t("A", 110, 240, 640, 300, "Curiosidad\nElige un tema que te importe.", "barlow", 32, N),
      t("B", 110, 580, 640, 300, "Equipo\nBusca a alguien con quien crear.", "barlow", 32, N),
      t("C", 110, 920, 640, 300, "Pieza\nCartel, ficha o nota.", "barlow", 32, N),
      im(200, 1400, 400, 400, o(1)),
    ]),

    pack({
      id: "mail-nota", nombre: { es: "Nota de correo", en: "Mail note" }, formato: "email", uso: "correo", shell: "doc", w: 640, h: 960, fill: C, estilo: "claro", color: "crema", etiquetas: ["correo"],
    }, [
      r("Tope", 0, 0, 640, 120, N, 1),
      t("Marca", 28, 36, 400, 50, "ORVUPI", "anton", 32, C),
      t("Hola", 28, 170, 580, 80, "Hola, comunidad", "archivo", 36, N),
      t("Cuerpo", 28, 280, 580, 280, "Una nota corta para el taller. Hay sitio para tu idea.", "barlow", 28, N),
      r("Boton", 28, 620, 260, 70, P, 3),
      t("Boton", 48, 636, 220, 40, "Ver la pieza", "barlow", 24, N),
      im(360, 680, 220, 220, o(2)),
    ]),

    pack({
      id: "mail-rosa", nombre: { es: "Correo con sello", en: "Sealed mail" }, formato: "email", uso: "correo", shell: "doc", w: 640, h: 960, fill: P, estilo: "marca", color: "rosa", etiquetas: ["correo"],
    }, [
      r("Hoja", 28, 28, 584, 904, C, 1),
      t("Marca", 56, 56, 400, 40, "ORVUPI", "anton", 28, P),
      t("Titulo", 56, 160, 520, 140, "Te escribimos", "archivo", 48, N),
      t("Cuerpo", 56, 340, 520, 220, "El taller sigue. Trae una idea clara.", "barlow", 28, N),
      im(180, 600, 280, 280, o(0)),
    ]),

    pack({
      id: "mini-pregunta", nombre: { es: "Miniatura pregunta", en: "Question thumbnail" }, formato: "thumb", uso: "miniatura", shell: "design", w: 1280, h: 720, fill: N, estilo: "humor", color: "azul", etiquetas: ["miniatura"],
    }, [
      t("Titulo", 48, 80, 800, 240, "¿Qué pieza?", "archivo", 84, C),
      t("Sub", 48, 360, 700, 100, "Elige y edita.", "barlow", 40, P),
      im(860, 120, 360, 360, o(1)),
    ]),

    pack({
      id: "col-franjas", nombre: { es: "Collage en franjas", en: "Stripe collage" }, formato: "collage", uso: "collage", shell: "design", w: 1080, h: 1080, fill: C, estilo: "humor", color: "crema", etiquetas: ["collage"],
    }, [
      im(0, 0, 360, 1080, o(0), 1),
      im(360, 0, 360, 1080, o(1), 1),
      im(720, 0, 360, 1080, o(2), 1),
      r("Pie", 0, 900, 1080, 180, N, 4),
      t("Pie", 40, 950, 1000, 70, "Tres gestos", "anton", 42, C),
    ]),

    pack({
      id: "col-mosaico", nombre: { es: "Mosaico de gestos", en: "Gesture mosaic" }, formato: "collage", uso: "collage", shell: "design", w: 1080, h: 1080, fill: N, estilo: "comic", color: "azul", etiquetas: ["collage"],
    }, [
      im(24, 24, 640, 640, o(2)),
      im(684, 24, 372, 372, o(0)),
      im(684, 416, 372, 300, o(1)),
      r("Pie", 24, 690, 640, 366, P, 3),
      t("Pie", 48, 760, 590, 160, "Comunidad", "archivo", 64, N),
    ]),

    pack({
      id: "edu-pregunta", nombre: { es: "Pregunta del taller", en: "Workshop question" }, formato: "doc", uso: "educacion", shell: "doc", w: 794, h: 1123, fill: C, estilo: "informativo", color: "rosa", etiquetas: ["educacion"],
    }, [
      r("Cab", 0, 0, 794, 200, P, 1),
      t("Titulo", 40, 50, 700, 100, "Pregunta", "archivo", 64, N),
      t("Cuerpo", 40, 260, 714, 200, "Qué observas cuando una idea se vuelve pieza?", "barlow", 36, N),
      r("Caja", 40, 520, 714, 280, N, 2),
      t("Caja", 70, 560, 660, 180, "Anota aquí tu respuesta.", "barlow", 32, C),
      im(520, 860, 220, 220, o(2)),
    ]),

    pack({
      id: "edu-pasos", nombre: { es: "Guía para aprender", en: "Learning guide" }, formato: "doc", uso: "educacion", shell: "doc", w: 794, h: 1123, fill: N, estilo: "claro", color: "azul", etiquetas: ["educacion", "guia"],
    }, [
      t("Titulo", 40, 40, 700, 80, "Guía corta", "archivo", 48, C),
      r("A", 40, 160, 714, 200, C, 2),
      r("B", 40, 390, 714, 200, P, 2),
      r("C", 40, 620, 714, 200, C, 2),
      t("A", 64, 200, 660, 120, "Elige un tema", "anton", 36, N),
      t("B", 64, 430, 660, 120, "Haz una pieza", "anton", 36, N),
      t("C", 64, 660, 660, 120, "Cuéntala", "anton", 36, N),
    ]),

    pack({
      id: "anun-sello", nombre: { es: "Anuncio con sello", en: "Sealed update" }, formato: "square", uso: "anuncio", shell: "design", w: 1080, h: 1080, fill: C, estilo: "informativo", color: "rosa", etiquetas: ["anuncio"],
    }, [
      r("Sello", 48, 48, 260, 72, P, 3),
      t("Sello", 68, 64, 220, 44, "NOVEDAD", "anton", 28, N),
      t("Titulo", 48, 180, 980, 180, "Nuevo en el taller", "archivo", 64, N),
      t("Cuerpo", 48, 400, 640, 180, "Una pieza más para la comunidad. Sin promesas.", "barlow", 32, N),
      im(680, 560, 340, 340, o(0)),
    ]),

    pack({
      id: "anun-banda", nombre: { es: "Anuncio en banda", en: "Band update" }, formato: "square", uso: "anuncio", shell: "design", w: 1080, h: 1080, fill: N, estilo: "claro", color: "azul", etiquetas: ["anuncio"],
    }, [
      r("Banda", 0, 360, 1080, 280, P, 2),
      t("Arriba", 48, 80, 900, 160, "ORVUPI", "archivo", 72, C),
      t("Medio", 48, 420, 980, 160, "Lo que sigue en la comunidad", "anton", 42, N),
      im(60, 700, 280, 280, o(1)),
    ]),

    pack({
      id: "pub-vertical-clara", nombre: { es: "Publicación en columnas", en: "Column post" }, formato: "square", uso: "publicacion", shell: "design", w: 1080, h: 1080, fill: C, estilo: "claro", color: "crema", etiquetas: ["publicacion"],
    }, [
      r("Col", 0, 0, 420, 1080, N, 1),
      t("Titulo", 36, 80, 350, 280, "Tu idea tiene sitio", "archivo", 48, C),
      im(40, 460, 340, 340, o(2)),
      t("Der", 470, 120, 560, 240, "Comunidad para crear, reír y aprender.", "barlow", 40, N),
      r("Boton", 470, 460, 300, 80, P, 3),
      t("Boton", 494, 478, 250, 48, "ORVUPI", "anton", 32, N),
    ]),

    pack({
      id: "pub-cita", nombre: { es: "Publicación cita", en: "Quote post" }, formato: "square", uso: "publicacion", shell: "design", w: 1080, h: 1080, fill: P, estilo: "marca", color: "rosa", etiquetas: ["publicacion", "cita"],
    }, [
      t("Cita", 56, 120, 960, 320, "Rosa por fuera. Curioso por dentro.", "archivo", 64, N),
      im(280, 500, 520, 520, o(0)),
    ]),

    pack({
      id: "hist-pasos", nombre: { es: "Historia en pasos", en: "Step story" }, formato: "story", uso: "historia", shell: "design", w: 1080, h: 1920, fill: C, estilo: "informativo", color: "crema", etiquetas: ["historia"],
    }, [
      t("Titulo", 56, 80, 960, 120, "Hoy", "archivo", 84, N),
      r("A", 56, 260, 968, 280, N, 2),
      r("B", 56, 580, 968, 280, P, 2),
      r("C", 56, 900, 968, 280, N, 2),
      t("A", 90, 330, 900, 140, "Mirar", "anton", 56, C),
      t("B", 90, 650, 900, 140, "Probar", "anton", 56, N),
      t("C", 90, 970, 900, 140, "Contar", "anton", 56, C),
      im(360, 1280, 360, 360, o(1)),
    ]),

    pack({
      id: "marca-horizontal", nombre: { es: "Pieza horizontal de marca", en: "Landscape brand piece" }, formato: "fb", uso: "marca", shell: "design", w: 1200, h: 630, fill: P, estilo: "marca", color: "rosa", etiquetas: ["marca"],
    }, [
      t("Titulo", 48, 80, 700, 220, "ORVUPI", "archivo", 96, N),
      t("Sub", 48, 330, 640, 120, "Curiosidad con ocho caminos.", "barlow", 36, N),
      im(820, 60, 340, 340, o(2)),
    ]),

    pack({
      id: "hoja-agenda", nombre: { es: "Agenda de cuatro celdas", en: "Four-cell sheet" }, formato: "sheet", uso: "hoja", shell: "design", w: 1080, h: 1080, fill: C, estilo: "informativo", color: "crema", etiquetas: ["hoja"],
    }, [
      r("A", 24, 24, 504, 504, N, 1),
      r("B", 552, 24, 504, 504, P, 1),
      r("C", 24, 552, 504, 504, P, 1),
      r("D", 552, 552, 504, 504, N, 1),
      t("A", 48, 60, 450, 80, "Mirar", "anton", 42, C),
      t("B", 576, 60, 450, 80, "Probar", "anton", 42, N),
      t("C", 48, 588, 450, 80, "Contar", "anton", 42, N),
      t("D", 576, 588, 450, 80, "Aprender", "anton", 42, C),
    ]),

    pack({
      id: "codigo-bloque", nombre: { es: "Bloque de pieza", en: "Piece block" }, formato: "code", uso: "codigo", shell: "design", w: 1080, h: 1080, fill: N, estilo: "comic", color: "azul", etiquetas: ["codigo"],
    }, [
      r("Barra", 40, 40, 1000, 72, P, 2),
      t("Barra", 64, 54, 400, 46, "pieza", "silkscreen", 28, N),
      t("Linea", 64, 180, 940, 500, "tema: comunidad\npieza: cartel\nequipo: ocho\nnota: clara", "silkscreen", 36, C),
    ]),

    cv("cv-vera", "Currículum de Vera", "Vera resume", C, [
      r("Tope", 0, 0, 794, 200, N, 1),
      t("Nombre", 36, 36, 500, 70, "Vera Lago", "archivo", 44, C),
      t("Oficio", 36, 112, 480, 40, "Marca visual", "barlow", 26, P),
      im(600, 28, 150, 150, o(0)),
      t("A", 36, 240, 720, 160, "Piezas\nCartel, ficha y nota de comunidad.", "barlow", 28, N),
      r("Banda", 36, 430, 722, 8, P, 4),
      t("B", 36, 470, 720, 280, "Taller\nUn encuentro corto.\n\nAprender\nMirar, probar y contar.", "barlow", 28, N),
    ], "claro", "azul"),

    cv("cv-omar", "Currículum de Omar", "Omar resume", P, [
      r("Hoja", 28, 28, 738, 1067, C, 1),
      t("Nombre", 56, 56, 680, 80, "Omar Brisa", "archivo", 48, N),
      t("Oficio", 56, 140, 680, 40, "Relatos y cartel", "barlow", 26, P),
      im(56, 220, 200, 200, o(1)),
      t("Cuerpo", 280, 230, 450, 400, "Proyectos\nUna pieza clara.\nUn equipo curioso.\nUna nota corta.", "barlow", 28, N),
      r("Pie", 56, 900, 680, 120, N, 3),
      t("Pie", 80, 930, 640, 60, "ORVUPI", "anton", 32, C),
    ], "marca", "rosa"),

    cv("cv-lia", "Currículum de Lía", "Lia resume", C, [
      r("Izq", 0, 0, 280, 1123, P, 1),
      t("Marca", 24, 36, 230, 40, "ORVUPI", "anton", 26, N),
      im(50, 110, 180, 180, o(2)),
      t("Nombre", 310, 48, 450, 80, "Lía Pinar", "archivo", 42, N),
      t("Oficio", 310, 140, 450, 40, "Piezas y talleres", "barlow", 26, P),
      t("Lista", 310, 220, 450, 500, "Cartel\nFicha\nInvitación\nLogo\nNota", "barlow", 32, N),
    ], "claro", "rosa"),

    cv("cv-ema", "Currículum de Ema", "Ema resume", N, [
      t("Nombre", 48, 48, 700, 80, "Ema Roca", "archivo", 52, C),
      t("Oficio", 48, 140, 500, 40, "Comunidad y marca", "barlow", 26, P),
      r("A", 48, 220, 330, 400, C, 2),
      r("B", 410, 220, 336, 400, P, 2),
      t("A", 68, 250, 290, 300, "Mirar\nUna idea.", "anton", 32, N),
      t("B", 430, 250, 290, 300, "Contar\nUna pieza.", "anton", 32, N),
      im(280, 680, 240, 240, o(0)),
    ], "humor", "azul"),

    cv("cv-ivo", "Currículum de Ivo", "Ivo resume", C, [
      r("Linea", 0, 0, 16, 1123, N, 1),
      t("Nombre", 48, 40, 700, 90, "Ivo Duna", "archivo", 56, N),
      t("Oficio", 48, 140, 500, 40, "Mapas y notas", "barlow", 28, P),
      r("F1", 48, 220, 698, 200, N, 2),
      r("F2", 48, 440, 698, 200, P, 2),
      r("F3", 48, 660, 698, 200, N, 2),
      t("F1", 72, 270, 650, 100, "Taller de pieza", "anton", 36, C),
      t("F2", 72, 490, 650, 100, "Cartel de encuentro", "anton", 36, N),
      t("F3", 72, 710, 650, 100, "Ficha para aprender", "anton", 36, C),
    ], "informativo", "crema"),

    cv("cv-nara", "Currículum de Nara", "Nara resume", C, [
      im(0, 0, 794, 360, o(1), 1),
      r("Velo", 0, 280, 794, 120, N, 3),
      t("Nombre", 36, 300, 720, 70, "Nara Viento", "archivo", 40, C),
      t("Oficio", 36, 430, 720, 40, "Curiosidad aplicada", "barlow", 26, P),
      t("Cuerpo", 36, 500, 720, 360, "Proyectos de la comunidad.\nCartel, ficha y presentación.", "barlow", 32, N),
    ], "humor", "crema"),

    cv("cv-ciro", "Currículum de Ciro", "Ciro resume", C, [
      r("Der", 520, 0, 274, 1123, N, 1),
      t("Nombre", 36, 48, 460, 100, "Ciro Marea", "archivo", 44, N),
      t("Oficio", 36, 160, 460, 50, "Diseño de comunidad", "barlow", 26, P),
      t("Cuerpo", 36, 250, 460, 400, "Una idea clara.\nOcho caminos.\nUn taller.", "barlow", 30, N),
      im(560, 80, 200, 200, o(2)),
      t("Marca", 548, 980, 220, 50, "ORVUPI", "anton", 28, C),
    ], "marca", "azul"),

    cv("cv-elsa", "Currículum de Elsa", "Elsa resume", P, [
      t("Marca", 40, 36, 400, 36, "ORVUPI", "anton", 24, N),
      t("Nombre", 40, 160, 714, 120, "Elsa Nube", "archivo", 64, N),
      t("Oficio", 40, 300, 700, 50, "Piezas claras", "barlow", 32, N),
      r("Caja", 40, 400, 714, 280, N, 2),
      t("Caja", 64, 440, 660, 200, "Cartel, logo e invitación para la comunidad.", "barlow", 32, C),
      im(250, 740, 280, 280, o(0)),
    ], "marca", "rosa"),

    deck("deck-empresa", "Portada de empresa", "Company cover", N, [
      r("Barra", 0, 0, 24, 1080, P, 1),
      t("Kicker", 80, 80, 500, 40, "EMPRESA", "anton", 28, P),
      t("Titulo", 80, 200, 1000, 220, "La comunidad", "archivo", 80, C),
      t("Sub", 80, 460, 900, 100, "Una pieza. Un relato. Un taller.", "barlow", 36, C),
      im(1280, 240, 520, 520, o(1)),
    ], "informativo", "azul", "empresa"),

    pack({
      id: "emp-brief", nombre: { es: "Brief de empresa", en: "Company brief" }, formato: "doc", uso: "empresa", shell: "doc", w: 794, h: 1123, fill: C, estilo: "informativo", color: "crema", etiquetas: ["empresa", "brief"],
    }, [
      r("Tope", 0, 0, 794, 160, N, 1),
      t("Kicker", 40, 36, 400, 36, "EMPRESA", "anton", 24, P),
      t("Titulo", 40, 80, 700, 60, "Brief claro", "archivo", 40, C),
      t("A", 40, 210, 714, 180, "Qué contamos\nUna idea de la comunidad.", "barlow", 30, N),
      t("B", 40, 420, 714, 180, "Para quién\nEl equipo del taller.", "barlow", 30, N),
      im(220, 680, 360, 360, o(2)),
    ]),

    pack({
      id: "emp-redes", nombre: { es: "Plan de redes", en: "Social plan" }, formato: "doc", uso: "empresa", shell: "doc", w: 794, h: 1123, fill: C, estilo: "claro", color: "rosa", etiquetas: ["empresa", "redes"],
    }, [
      t("Titulo", 40, 40, 700, 80, "Plan de redes", "archivo", 48, N),
      r("A", 40, 160, 714, 220, N, 2),
      r("B", 40, 410, 714, 220, P, 2),
      r("C", 40, 660, 714, 220, N, 2),
      t("A", 64, 210, 660, 120, "Mirar la comunidad", "anton", 36, C),
      t("B", 64, 460, 660, 120, "Probar una pieza", "anton", 36, N),
      t("C", 64, 710, 660, 120, "Contar el taller", "anton", 36, C),
    ]),

    pack({
      id: "red-ig-cita", nombre: { es: "Post cita rosa", en: "Pink quote post" }, formato: "ig", uso: "redes", shell: "design", w: 1080, h: 1350, fill: P, estilo: "marca", color: "rosa", etiquetas: ["redes", "cita"],
    }, [
      t("Cita", 56, 120, 960, 280, "Hay sitio para tu idea", "archivo", 72, N),
      im(200, 480, 680, 680, o(0)),
      t("Pie", 56, 1200, 800, 70, "ORVUPI", "anton", 36, N),
    ]),

    pack({
      id: "red-story-bloques", nombre: { es: "Historia en bloques", en: "Block story" }, formato: "story", uso: "redes", shell: "design", w: 1080, h: 1920, fill: N, estilo: "humor", color: "azul", etiquetas: ["redes", "historia"],
    }, [
      t("Hola", 56, 80, 900, 120, "Hoy", "archivo", 84, C),
      r("A", 56, 260, 968, 420, P, 2),
      r("B", 56, 720, 968, 420, C, 2),
      t("A", 90, 360, 880, 160, "Mirar", "anton", 72, N),
      t("B", 90, 820, 880, 160, "Crear", "anton", 72, N),
      im(300, 1240, 480, 480, o(2)),
    ]),

    deck("deck-seccion", "Sección de presentación", "Section slide", C, [
      r("Num", 80, 80, 200, 200, P, 2),
      t("Num", 80, 120, 200, 120, "A", "archivo", 96, N, 30, "center"),
      t("Titulo", 340, 280, 1400, 200, "El relato", "archivo", 84, N),
      t("Sub", 340, 520, 1200, 120, "Una sección para la comunidad.", "barlow", 40, N),
      im(1400, 680, 360, 360, o(0)),
    ], "claro", "rosa"),

    pack({
      id: "fly-noche", nombre: { es: "Flyer nocturno", en: "Night flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: N, estilo: "humor", color: "azul", etiquetas: ["flyer"],
    }, [
      t("Titulo", 40, 60, 736, 180, "Ven", "archivo", 120, C),
      t("Sub", 40, 260, 700, 100, "Taller de comunidad", "barlow", 40, P),
      r("Caja", 40, 420, 736, 200, P, 2),
      t("Caja", 64, 470, 680, 100, "Lunes en la plaza", "anton", 40, N),
      im(250, 680, 320, 320, o(1)),
    ]),

    pack({
      id: "car-banda", nombre: { es: "Cartel con banda", en: "Band poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: C, estilo: "claro", color: "rosa", etiquetas: ["cartel"],
    }, [
      r("Banda", 0, 180, 1080, 280, P, 1),
      t("Titulo", 48, 220, 980, 180, "Una idea clara", "archivo", 72, N),
      im(180, 540, 720, 720, o(2)),
      t("Pie", 48, 1300, 900, 70, "Comunidad ORVUPI", "barlow", 36, N),
    ]),

    deck("deck-cierre", "Cierre de presentación", "Closing slide", P, [
      t("Titulo", 80, 180, 1100, 200, "Hasta la pieza", "archivo", 78, N),
      t("Sub", 80, 420, 900, 120, "Mirar, probar y contar.", "barlow", 40, N),
      im(1280, 280, 480, 480, o(2)),
    ], "marca", "rosa"),

    deck("deck-cita-b", "Cita de presentación", "Quote slide", C, [
      r("Barra", 0, 0, 1920, 18, P, 1),
      t("Cita", 120, 260, 1400, 280, "Hay sitio para tu idea", "archivo", 76, N),
      t("Pie", 120, 620, 600, 60, "ORVUPI", "anton", 32, P),
      im(1500, 620, 280, 280, o(0)),
    ], "claro", "crema"),

    deck("deck-tres-b", "Tres columnas", "Three columns", N, [
      r("A", 70, 180, 540, 720, C, 2),
      r("B", 690, 180, 540, 720, P, 2),
      r("C", 1310, 180, 540, 720, C, 2),
      t("A", 100, 240, 480, 200, "Mirar", "anton", 56, N),
      t("B", 720, 240, 480, 200, "Probar", "anton", 56, N),
      t("C", 1340, 240, 480, 200, "Contar", "anton", 56, N),
      t("Kicker", 70, 60, 500, 50, "PRESENTACIÓN", "anton", 28, P),
    ], "informativo", "azul"),

    deck("deck-nota", "Nota de presentación", "Note slide", C, [
      r("Caja", 80, 160, 1100, 760, N, 2),
      t("Titulo", 120, 220, 1000, 180, "Una nota clara", "archivo", 68, C),
      t("Cuerpo", 120, 460, 960, 280, "El taller cuenta una idea en una pieza.", "barlow", 36, C),
      im(1280, 280, 500, 500, o(1)),
    ], "claro", "azul"),

    pack({
      id: "emp-valores", nombre: { es: "Valores de empresa", en: "Company values" }, formato: "doc", uso: "empresa", shell: "doc", w: 794, h: 1123, fill: C, estilo: "marca", color: "rosa", etiquetas: ["empresa"],
    }, [
      t("Titulo", 40, 48, 700, 80, "Valores", "archivo", 64, N),
      r("A", 40, 180, 714, 240, P, 2),
      r("B", 40, 450, 714, 240, N, 2),
      t("A", 64, 240, 660, 120, "Claridad", "anton", 48, N),
      t("B", 64, 510, 660, 120, "Curiosidad", "anton", 48, C),
      im(250, 760, 300, 300, o(0)),
    ]),

    pack({
      id: "emp-nota", nombre: { es: "Nota de empresa", en: "Company note" }, formato: "doc", uso: "empresa", shell: "doc", w: 794, h: 1123, fill: N, estilo: "claro", color: "azul", etiquetas: ["empresa", "nota"],
    }, [
      t("Kicker", 48, 48, 400, 36, "EMPRESA", "anton", 24, P),
      t("Titulo", 48, 120, 700, 140, "Una nota para el equipo", "archivo", 52, C),
      r("Caja", 48, 320, 698, 360, C, 2),
      t("Caja", 72, 360, 650, 260, "El relato cabe en una pieza corta.", "barlow", 36, N),
      im(220, 740, 340, 340, o(2)),
    ]),

    pack({
      id: "emp-ficha", nombre: { es: "Ficha de empresa", en: "Company card" }, formato: "deck", uso: "empresa", shell: "deck", w: 1920, h: 1080, fill: C, estilo: "informativo", color: "crema", etiquetas: ["empresa"],
    }, [
      r("Lado", 0, 0, 640, 1080, N, 1),
      t("Marca", 48, 60, 540, 50, "ORVUPI", "anton", 36, C),
      im(120, 220, 400, 400, o(1)),
      t("Titulo", 720, 180, 1100, 160, "La ficha", "archivo", 80, N),
      t("Cuerpo", 720, 400, 1000, 200, "Qué hacemos y para quién.", "barlow", 40, N),
    ]),

    pack({
      id: "doc-propuesta", nombre: { es: "Propuesta breve", en: "Short proposal" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: C, estilo: "informativo", color: "crema", etiquetas: ["documento"],
    }, [
      r("Tope", 0, 0, 794, 220, P, 1),
      t("Titulo", 40, 48, 700, 120, "Propuesta", "archivo", 64, N),
      t("A", 40, 280, 714, 180, "La idea\nUna pieza para el taller.", "barlow", 32, N),
      t("B", 40, 500, 714, 180, "El plan\nMirar, probar, contar.", "barlow", 32, N),
      im(200, 740, 380, 380, o(0)),
    ]),

    pack({
      id: "doc-dia", nombre: { es: "Notas del día", en: "Day notes" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: C, estilo: "claro", color: "rosa", etiquetas: ["documento", "notas"],
    }, [
      t("Titulo", 40, 40, 700, 80, "Notas", "archivo", 60, N),
      r("A", 40, 160, 714, 200, N, 2),
      r("B", 40, 390, 714, 200, P, 2),
      r("C", 40, 620, 714, 200, N, 2),
      t("A", 64, 210, 660, 90, "Qué vimos", "anton", 36, C),
      t("B", 64, 440, 660, 90, "Qué probamos", "anton", 36, N),
      t("C", 64, 670, 660, 90, "Qué contamos", "anton", 36, C),
    ]),

    pack({
      id: "doc-taller", nombre: { es: "Guía del taller", en: "Workshop guide" }, formato: "doc", uso: "documento", shell: "doc", w: 794, h: 1123, fill: N, estilo: "humor", color: "azul", etiquetas: ["documento", "taller"],
    }, [
      t("Titulo", 40, 48, 700, 100, "El taller", "archivo", 64, C),
      t("Sub", 40, 160, 600, 50, "Una hora, una pieza", "barlow", 28, P),
      im(40, 260, 320, 320, o(2)),
      t("Lista", 400, 280, 350, 300, "Llegar\nMirar\nProbar\nContar", "barlow", 36, C),
      r("Pie", 40, 900, 714, 140, P, 2),
      t("Pie", 64, 940, 660, 70, "Comunidad", "anton", 40, N),
    ]),

    deck("proy-mapa", "Mapa de proyecto", "Project map", C, [
      t("Titulo", 70, 50, 800, 80, "El mapa", "archivo", 64, N),
      r("A", 70, 200, 540, 700, N, 2),
      r("B", 690, 200, 540, 700, P, 2),
      r("C", 1310, 200, 540, 700, N, 2),
      t("A", 100, 280, 480, 120, "Inicio", "anton", 48, C),
      t("B", 720, 280, 480, 120, "Pieza", "anton", 48, N),
      t("C", 1340, 280, 480, 120, "Cierre", "anton", 48, C),
    ], "informativo", "crema", "proyecto"),

    deck("proy-hitos", "Hitos del proyecto", "Project milestones", N, [
      t("Titulo", 80, 70, 1000, 90, "Hitos", "archivo", 72, C),
      r("Linea", 80, 540, 1760, 8, P, 3),
      r("P1", 180, 480, 120, 120, C, 4),
      r("P2", 860, 480, 120, 120, P, 4),
      r("P3", 1540, 480, 120, 120, C, 4),
      t("A", 140, 680, 280, 80, "Mirar", "barlow", 32, C),
      t("B", 820, 680, 280, 80, "Probar", "barlow", 32, C),
      t("C", 1500, 680, 280, 80, "Contar", "barlow", 32, C),
    ], "claro", "azul", "proyecto"),

    pack({
      id: "proy-ficha", nombre: { es: "Ficha de proyecto", en: "Project sheet" }, formato: "doc", uso: "proyecto", shell: "doc", w: 794, h: 1123, fill: C, estilo: "marca", color: "rosa", etiquetas: ["proyecto"],
    }, [
      r("Lado", 0, 0, 220, 1123, N, 1),
      t("Marca", 24, 40, 170, 40, "ORVUPI", "anton", 22, C),
      im(20, 160, 180, 180, o(1)),
      t("Titulo", 260, 48, 490, 100, "El proyecto", "archivo", 44, N),
      t("Cuerpo", 260, 180, 490, 400, "Una idea.\nUna pieza.\nUn taller.", "barlow", 36, N),
    ]),

    pack({
      id: "red-ig-lista", nombre: { es: "Post con lista", en: "List post" }, formato: "ig", uso: "redes", shell: "design", w: 1080, h: 1350, fill: C, estilo: "informativo", color: "crema", etiquetas: ["redes", "lista"],
    }, [
      t("Titulo", 56, 60, 900, 120, "Tres pasos", "archivo", 72, N),
      r("A", 56, 240, 968, 240, N, 2),
      r("B", 56, 520, 968, 240, P, 2),
      r("C", 56, 800, 968, 240, N, 2),
      t("A", 90, 300, 800, 100, "Mirar", "anton", 48, C),
      t("B", 90, 580, 800, 100, "Probar", "anton", 48, N),
      t("C", 90, 860, 800, 100, "Contar", "anton", 48, C),
    ]),

    pack({
      id: "red-sq-saludo", nombre: { es: "Saludo cuadrado", en: "Square hello" }, formato: "square", uso: "redes", shell: "design", w: 1080, h: 1080, fill: N, estilo: "humor", color: "azul", etiquetas: ["redes"],
    }, [
      t("Hola", 56, 60, 900, 140, "Hola", "archivo", 110, C),
      im(180, 280, 720, 720, o(1)),
    ]),

    pack({
      id: "red-story-cita", nombre: { es: "Historia cita", en: "Quote story" }, formato: "story", uso: "redes", shell: "design", w: 1080, h: 1920, fill: P, estilo: "marca", color: "rosa", etiquetas: ["redes", "cita"],
    }, [
      t("Cita", 56, 160, 960, 360, "Tu idea tiene sitio", "archivo", 80, N),
      im(160, 620, 760, 760, o(0)),
      t("Pie", 56, 1600, 700, 80, "ORVUPI", "anton", 40, N),
    ]),

    pack({
      id: "fly-cita", nombre: { es: "Flyer con cita", en: "Quote flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: C, estilo: "marca", color: "rosa", etiquetas: ["flyer"],
    }, [
      r("Tope", 0, 0, 816, 280, P, 1),
      t("Titulo", 36, 48, 740, 180, "Ven a crear", "archivo", 64, N),
      t("Cuerpo", 36, 340, 740, 180, "Un taller corto para la comunidad.", "barlow", 36, N),
      im(200, 560, 420, 420, o(2)),
    ]),

    pack({
      id: "fly-banda", nombre: { es: "Flyer con banda", en: "Band flyer" }, formato: "flyer", uso: "flyer", shell: "print", w: 816, h: 1056, fill: C, estilo: "claro", color: "crema", etiquetas: ["flyer"],
    }, [
      t("Titulo", 36, 40, 740, 140, "Encuentro", "archivo", 72, N),
      r("Banda", 0, 220, 816, 160, N, 2),
      t("Banda", 36, 250, 740, 90, "Plaza y taller", "anton", 40, C),
      im(180, 440, 460, 460, o(0)),
      t("Pie", 36, 940, 700, 50, "ORVUPI", "anton", 28, P),
    ]),

    pack({
      id: "car-sello", nombre: { es: "Cartel con sello", en: "Seal poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: N, estilo: "marca", color: "azul", etiquetas: ["cartel"],
    }, [
      t("Titulo", 48, 60, 980, 200, "Hoy se crea", "archivo", 84, C),
      r("Sello", 340, 340, 400, 400, P, 2),
      t("Sello", 360, 470, 360, 140, "ORVUPI", "anton", 48, N, 20, "center"),
      im(180, 820, 720, 520, o(1)),
    ]),

    pack({
      id: "car-lista", nombre: { es: "Cartel con lista", en: "List poster" }, formato: "poster", uso: "cartel", shell: "print", w: 1080, h: 1440, fill: C, estilo: "informativo", color: "crema", etiquetas: ["cartel"],
    }, [
      r("Lado", 0, 0, 80, 1440, P, 1),
      t("Titulo", 120, 60, 900, 140, "El cartel", "archivo", 72, N),
      t("Lista", 120, 260, 800, 500, "Mirar la idea\nProbar la pieza\nContar el taller", "barlow", 48, N),
      im(280, 860, 520, 520, o(2)),
    ]),

    pack({
      id: "inv-sello", nombre: { es: "Invitación con sello", en: "Seal invitation" }, formato: "invite", uso: "invitacion", shell: "print", w: 750, h: 1050, fill: C, estilo: "marca", color: "rosa", etiquetas: ["invitacion"],
    }, [
      r("Marco", 28, 28, 694, 994, N, 1),
      r("Hoja", 48, 48, 654, 954, C, 2),
      t("Titulo", 80, 90, 590, 140, "Estás invitado", "archivo", 48, N),
      im(180, 280, 390, 390, o(0)),
      t("Pie", 80, 760, 590, 80, "Taller ORVUPI", "barlow", 32, P),
    ]),

    pack({
      id: "logo-circulo", nombre: { es: "Logo en círculo", en: "Circle logo" }, formato: "logo", uso: "logo", shell: "print", w: 1080, h: 1080, fill: C, estilo: "marca", color: "rosa", etiquetas: ["logo"],
    }, [
      r("Circulo", 180, 120, 720, 720, P, 1),
      im(280, 180, 520, 520, o(1)),
      t("Marca", 180, 880, 720, 80, "ORVUPI", "anton", 48, N, 20, "center"),
    ]),

    pack({
      id: "fol-cita", nombre: { es: "Folleto con cita", en: "Quote leaflet" }, formato: "trifold", uso: "folleto", shell: "print", w: 1080, h: 630, fill: C, estilo: "claro", color: "crema", etiquetas: ["folleto"],
    }, [
      r("A", 0, 0, 360, 630, N, 1),
      r("C", 720, 0, 360, 630, P, 1),
      t("A", 24, 40, 310, 200, "Mirar", "anton", 48, C),
      t("B", 384, 80, 310, 300, "Probar la pieza", "archivo", 40, N),
      t("C", 744, 40, 310, 200, "Contar", "anton", 48, N),
      im(400, 340, 240, 240, o(2)),
    ]),
  ];
}
