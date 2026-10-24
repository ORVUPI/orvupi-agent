/** Lote de diseños de marca. Cada pieza es un documento editable, no una miniatura vacía. */

import { imageLayer, rectLayer, textLayer } from "./document.mjs";

const C = "#FFF8EC";
const N = "#102032";
const P = "#FF3070";
const OCT = ["orvupi-avatar", "orvupi-saludo", "orvupi-buen-humor"];
const NAMES = [
  "Mara Sol", "Leo Costa", "Iris Marea", "Nico Lago", "Vera Pinar", "Omar Brisa", "Lia Roca", "Ema Duna",
  "Ivo Nube", "Nara Viento", "Ciro Selva", "Elsa Mar", "Teo Palma", "Ana Rio", "Luz Puerto", "Raul Menta",
  "Olga Faro", "Unai Prado", "Noa Belen", "Rita Cala", "Saul Nieve", "Tina Oro", "Ulises Mar", "Valen Paz",
];
const ROLES = ["Piezas y talleres", "Marca visual", "Relatos claros", "Diseño de comunidad", "Notas y cartel", "Curiosidad aplicada"];

function t(name, x, y, w, h, text, font, size, color, z = 30, align = "left") {
  return textLayer({ name, x, y, w, h, z, text, fontId: font, size, color, align });
}
function r(name, x, y, w, h, fill, z = 2) {
  return rectLayer({ name, x, y, w, h, z, fill });
}
function im(x, y, w, h, id, z = 10) {
  return imageLayer({ name: "Pulpo", x, y, w, h, z, src: { kind: "catalog", id } });
}
function scene(format, w, h, fill, layers) {
  return { name: format, format: { id: format, width: w, height: h }, background: { type: "solid", fill }, layers };
}
function pack(fields, layers) {
  return {
    precio: "gratis",
    idiomas: ["es", "en"],
    etiquetas: [fields.uso],
    formatos: [fields.formato],
    ...fields,
    build: () => scene(fields.formato, fields.w, fields.h, fields.fill, layers),
  };
}

function cvLayers(kind, name, role, oct) {
  if (kind === 0) return [
    r("Riel", 0, 0, 250, 1123, N, 1),
    t("Marca", 28, 48, 190, 40, "ORVUPI", "anton", 24, C),
    im(36, 140, 176, 176, oct),
    t("Nombre", 286, 48, 470, 100, name, "archivo", 44, N),
    t("Oficio", 286, 160, 470, 44, role, "barlow", 26, P),
    t("Lista", 286, 250, 470, 420, "Proyectos\nCartel de barrio\nFicha de taller\nPieza de marca", "barlow", 30, N),
  ];
  if (kind === 1) return [
    r("Tope", 0, 0, 794, 280, P, 1),
    t("Nombre", 36, 48, 500, 100, name, "archivo", 46, N),
    t("Oficio", 36, 160, 460, 48, role, "barlow", 26, N),
    im(560, 48, 190, 190, oct),
    t("Cuerpo", 36, 340, 720, 220, "Una idea clara para la comunidad.", "barlow", 32, N),
    r("Banda", 36, 620, 722, 150, N, 3),
    t("Banda", 60, 660, 680, 70, "ORVUPI", "anton", 36, C),
  ];
  if (kind === 2) return [
    r("Hoja", 28, 28, 738, 1067, C, 1),
    t("Nombre", 56, 56, 420, 110, name, "archivo", 44, N),
    t("Oficio", 56, 180, 400, 44, role, "barlow", 24, P),
    im(470, 64, 230, 230, oct),
    t("Lista", 56, 360, 660, 360, "Mirar\nProbar\nContar", "anton", 48, N),
  ];
  if (kind === 3) return [
    r("A", 0, 0, 794, 340, N, 1),
    r("B", 0, 340, 794, 300, P, 1),
    t("Nombre", 36, 48, 700, 110, name, "archivo", 48, C),
    t("Oficio", 36, 180, 500, 50, role, "barlow", 26, P),
    t("B", 36, 400, 520, 140, "Una pieza clara", "anton", 42, N),
    im(500, 700, 250, 250, oct),
  ];
  if (kind === 4) return [
    im(0, 0, 794, 440, oct, 1),
    r("Velo", 0, 300, 794, 150, N, 3),
    t("Nombre", 36, 320, 720, 90, name, "archivo", 42, C),
    t("Oficio", 36, 480, 700, 44, role, "barlow", 26, P),
    t("Cuerpo", 36, 560, 720, 280, "Cartel, ficha y taller.", "barlow", 34, N),
  ];
  return [
    r("A", 28, 28, 340, 1067, N, 1),
    r("B", 400, 200, 366, 700, P, 2),
    t("Nombre", 48, 56, 300, 160, name, "archivo", 36, C),
    im(64, 260, 240, 240, oct),
    t("B", 424, 280, 320, 160, "Taller", "anton", 48, N),
  ];
}

function deckLayers(kind, name, role, oct) {
  const first = name.split(" ")[0];
  if (kind === 0) return [
    r("Barra", 0, 0, 28, 1080, P, 1),
    t("Kicker", 80, 80, 500, 40, "ORVUPI", "anton", 28, P),
    t("Titulo", 80, 200, 1000, 220, first, "archivo", 92, N),
    t("Sub", 80, 460, 900, 100, role, "barlow", 36, N),
    im(1280, 240, 500, 500, oct),
  ];
  if (kind === 1) return [
    r("Lado", 0, 0, 760, 1080, N, 1),
    t("Titulo", 60, 180, 640, 200, first, "archivo", 80, C),
    t("Sub", 60, 420, 620, 80, role, "barlow", 32, P),
    t("Der", 840, 240, 960, 200, "La comunidad", "archivo", 64, N),
    im(1400, 520, 400, 400, oct),
  ];
  if (kind === 2) return [
    r("A", 70, 180, 560, 760, C, 2),
    r("B", 680, 180, 560, 760, P, 2),
    r("C", 1290, 180, 560, 760, N, 2),
    t("A", 100, 240, 500, 120, "Mirar", "anton", 52, N),
    t("B", 710, 240, 500, 120, "Probar", "anton", 52, N),
    t("C", 1320, 240, 500, 120, "Contar", "anton", 52, C),
  ];
  if (kind === 3) return [
    t("Cita", 100, 220, 1400, 280, "Hay sitio para tu idea", "archivo", 72, C),
    t("Pie", 100, 560, 600, 60, name, "barlow", 32, P),
    im(1460, 560, 340, 340, oct),
  ];
  if (kind === 4) return [
    r("Num", 80, 80, 220, 220, P, 2),
    t("Num", 80, 120, 220, 140, String(kind + 1), "archivo", 96, N, 30, "center"),
    t("Titulo", 360, 260, 1400, 180, first, "archivo", 84, N),
    t("Sub", 360, 480, 1100, 100, role, "barlow", 36, N),
    im(1460, 640, 360, 360, oct),
  ];
  return [
    r("Caja", 70, 140, 1100, 800, N, 2),
    t("Titulo", 110, 200, 1000, 180, first, "archivo", 76, C),
    t("Sub", 110, 420, 960, 120, role, "barlow", 36, C),
    im(1280, 260, 520, 520, oct),
  ];
}

function igLayers(kind, name, role, oct) {
  const first = name.split(" ")[0];
  if (kind === 0) return [
    t("Titulo", 56, 70, 960, 180, first, "archivo", 84, N),
    t("Sub", 56, 260, 900, 70, role, "barlow", 32, P),
    im(180, 400, 720, 720, oct),
    t("Pie", 56, 1180, 700, 70, "ORVUPI", "anton", 32, N),
  ];
  if (kind === 1) return [
    r("A", 48, 48, 984, 380, N, 2),
    r("B", 48, 460, 984, 380, P, 2),
    r("C", 48, 872, 984, 420, N, 2),
    t("A", 80, 140, 800, 120, "Mirar", "anton", 64, C),
    t("B", 80, 560, 800, 120, "Probar", "anton", 64, N),
    t("C", 80, 980, 800, 120, "Contar", "anton", 64, C),
  ];
  if (kind === 2) return [
    t("Cita", 56, 120, 960, 320, "Tu idea tiene sitio", "archivo", 72, N),
    im(160, 480, 760, 760, oct),
  ];
  if (kind === 3) return [
    r("Caja", 48, 48, 984, 900, C, 2),
    t("Nombre", 80, 90, 900, 140, first, "archivo", 76, N),
    t("Oficio", 80, 250, 800, 60, role, "barlow", 32, P),
    im(250, 400, 580, 580, oct),
    t("Pie", 80, 1100, 700, 70, "ORVUPI", "anton", 32, C),
  ];
  if (kind === 4) return [
    im(0, 0, 1080, 780, oct, 1),
    r("Banda", 0, 680, 1080, 180, N, 3),
    t("Nombre", 48, 710, 980, 100, first, "archivo", 64, C),
    t("Sub", 48, 920, 980, 80, role, "barlow", 32, N),
    t("Pie", 48, 1120, 700, 70, "ORVUPI", "anton", 32, P),
  ];
  return [
    r("Sello", 240, 180, 600, 600, P, 2),
    t("Sello", 260, 400, 560, 140, "ORVUPI", "anton", 48, N, 20, "center"),
    t("Nombre", 56, 860, 960, 120, first, "archivo", 64, C),
    t("Sub", 56, 1000, 900, 70, role, "barlow", 32, P),
  ];
}

function flyerLayers(kind, name, oct) {
  const first = name.split(" ")[0];
  if (kind === 0) return [
    r("Tope", 0, 0, 816, 280, P, 1),
    t("Titulo", 36, 48, 740, 160, first, "archivo", 64, N),
    t("Sub", 36, 340, 740, 80, "Taller de comunidad", "barlow", 32, N),
    im(180, 480, 460, 460, oct),
  ];
  if (kind === 1) return [
    t("Titulo", 36, 40, 740, 140, first, "archivo", 72, C),
    r("Banda", 0, 220, 816, 160, P, 2),
    t("Banda", 36, 250, 740, 90, "Ven a crear", "anton", 40, N),
    im(170, 440, 480, 480, oct),
  ];
  return [
    r("Lado", 0, 0, 80, 1056, N, 1),
    t("Titulo", 110, 48, 660, 140, first, "archivo", 60, N),
    t("Lista", 110, 220, 640, 280, "Mirar la idea\nProbar la pieza\nContar el taller", "barlow", 32, N),
    im(180, 560, 460, 460, oct),
  ];
}

function posterLayers(kind, name, oct) {
  const first = name.split(" ")[0];
  if (kind === 0) return [
    t("Titulo", 48, 60, 980, 180, first, "archivo", 84, C),
    r("Sello", 340, 320, 400, 400, P, 2),
    t("Sello", 360, 450, 360, 120, "ORVUPI", "anton", 42, N, 20, "center"),
    im(180, 820, 720, 520, oct),
  ];
  if (kind === 1) return [
    r("Banda", 0, 160, 1080, 280, P, 1),
    t("Titulo", 48, 200, 980, 180, first, "archivo", 72, N),
    im(180, 520, 720, 720, oct),
    t("Pie", 48, 1280, 900, 70, "Comunidad", "barlow", 36, N),
  ];
  return [
    r("Lado", 0, 0, 90, 1440, N, 1),
    t("Titulo", 130, 60, 880, 160, first, "archivo", 72, N),
    t("Lista", 130, 260, 800, 400, "Mirar\nProbar\nContar", "anton", 64, N),
    im(280, 780, 560, 560, oct),
  ];
}

function docLayers(kind, name, role, oct, kicker) {
  if (kind === 0) return [
    r("Tope", 0, 0, 794, 180, N, 1),
    t("Kicker", 40, 36, 400, 36, kicker, "anton", 22, P),
    t("Titulo", 40, 80, 700, 70, name, "archivo", 40, C),
    t("Cuerpo", 40, 230, 714, 200, role, "barlow", 32, N),
    im(200, 520, 400, 400, oct),
  ];
  if (kind === 1) return [
    t("Titulo", 40, 40, 700, 90, name, "archivo", 48, N),
    r("A", 40, 170, 714, 240, N, 2),
    r("B", 40, 440, 714, 240, P, 2),
    t("A", 64, 230, 660, 100, "Mirar", "anton", 42, C),
    t("B", 64, 500, 660, 100, "Contar", "anton", 42, N),
    im(250, 740, 300, 300, oct),
  ];
  return [
    r("Lado", 0, 0, 220, 1123, P, 1),
    t("Marca", 24, 40, 170, 40, "ORVUPI", "anton", 22, N),
    im(24, 140, 172, 172, oct),
    t("Titulo", 250, 48, 500, 120, name, "archivo", 40, N),
    t("Cuerpo", 250, 200, 500, 200, role, "barlow", 28, N),
  ];
}

function storyLayers(kind, name, oct) {
  const first = name.split(" ")[0];
  if (kind === 0) return [
    t("Hola", 56, 80, 900, 140, first, "archivo", 84, C),
    r("A", 56, 280, 968, 460, P, 2),
    t("A", 90, 400, 880, 140, "Hoy", "anton", 72, N),
    im(280, 900, 520, 520, oct),
    t("Pie", 56, 1560, 700, 80, "ORVUPI", "anton", 36, C),
  ];
  return [
    t("Cita", 56, 140, 960, 280, "Tu idea tiene sitio", "archivo", 64, N),
    im(140, 500, 800, 800, oct),
    t("Pie", 56, 1500, 800, 80, name, "barlow", 36, N),
  ];
}

function item(id, es, en, formato, uso, shell, w, h, fill, estilo, color, layers) {
  return pack({
    id, nombre: { es, en }, formato, uso, shell, w, h, fill, estilo, color,
  }, layers);
}

export function lotePlantillas() {
  const out = [];
  const o = (i) => OCT[i % 3];
  for (let i = 0; i < NAMES.length; i += 1) {
    const name = NAMES[i];
    const role = ROLES[i % ROLES.length];
    const first = name.split(" ")[0];
    const n = String(i + 1).padStart(2, "0");
    const kind = i % 6;
    const cvFill = [C, C, N, C, C, C][kind];
    out.push(item(
      `cv-lote-${n}`, `Currículum de ${first}`, `${first} resume`,
      "cv", "curriculum", "print", 794, 1123, cvFill,
      ["claro", "marca", "claro", "informativo", "humor", "marca"][kind],
      ["crema", "rosa", "azul", "crema", "crema", "rosa"][kind],
      cvLayers(kind, name, role, o(i)),
    ));
    const deckFill = [C, C, N, N, C, C][kind];
    out.push(item(
      `deck-lote-${n}`, `Lámina de ${first}`, `${first} slide`,
      "deck", "presentacion", "deck", 1920, 1080, deckFill,
      ["marca", "claro", "informativo", "humor", "claro", "marca"][kind],
      ["rosa", "crema", "azul", "azul", "crema", "rosa"][kind],
      deckLayers(kind, name, role, o(i + 1)),
    ));
    const igFill = [C, C, P, N, C, N][kind];
    out.push(item(
      `ig-lote-${n}`, `Post de ${first}`, `${first} post`,
      "ig", "redes", "design", 1080, 1350, igFill,
      ["marca", "informativo", "marca", "claro", "humor", "humor"][kind],
      ["crema", "crema", "rosa", "azul", "rosa", "azul"][kind],
      igLayers(kind, name, role, o(i + 2)),
    ));
  }
  for (let i = 0; i < 8; i += 1) {
    const name = NAMES[i];
    const first = name.split(" ")[0];
    const n = String(i + 1).padStart(2, "0");
    out.push(item(
      `fly-lote-${n}`, `Flyer de ${first}`, `${first} flyer`,
      "flyer", "flyer", "print", 816, 1056, i % 2 ? N : C,
      i % 2 ? "humor" : "claro", i % 2 ? "azul" : "rosa",
      flyerLayers(i % 3, name, o(i)),
    ));
    out.push(item(
      `car-lote-${n}`, `Cartel de ${first}`, `${first} poster`,
      "poster", "cartel", "print", 1080, 1440, i % 2 ? N : C,
      i % 2 ? "marca" : "claro", i % 2 ? "azul" : "crema",
      posterLayers(i % 3, name, o(i + 1)),
    ));
    out.push(item(
      `emp-lote-${n}`, `Empresa de ${first}`, `${first} company`,
      "doc", "empresa", "doc", 794, 1123, C,
      "informativo", "crema",
      docLayers(i % 3, first, ROLES[i % ROLES.length], o(i), "EMPRESA"),
    ));
    out.push(item(
      `doc-lote-${n}`, `Nota de ${first}`, `${first} note`,
      "doc", "documento", "doc", 794, 1123, i % 2 ? N : C,
      "claro", i % 2 ? "azul" : "crema",
      docLayers(i % 3, first, "Una nota para el taller", o(i + 1), "NOTA"),
    ));
    out.push(item(
      `proy-lote-${n}`, `Proyecto de ${first}`, `${first} project`,
      "deck", "proyecto", "deck", 1920, 1080, i % 2 ? N : C,
      "marca", i % 2 ? "azul" : "rosa",
      deckLayers(i % 6, name, "Mapa del proyecto", o(i)),
    ));
  }
  for (let i = 0; i < 6; i += 1) {
    const name = NAMES[i + 8];
    const n = String(i + 1).padStart(2, "0");
    out.push(item(
      `hist-lote-${n}`, `Historia de ${name.split(" ")[0]}`, `${name.split(" ")[0]} story`,
      "story", "historia", "design", 1080, 1920, i % 2 ? P : N,
      "humor", i % 2 ? "azul" : "rosa",
      storyLayers(i % 2, name, o(i)),
    ));
  }
  return out;
}
