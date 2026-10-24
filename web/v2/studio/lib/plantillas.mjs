/** Seis plantillas de meme y comunidad. El texto vive en el documento y se puede editar. */

import { BRAND, createDocument, imageLayer, rectLayer, textLayer } from "./document.mjs";
import { masPlantillas } from "./mas-plantillas.mjs";

const CREAM = BRAND.cream;
const NAVY = BRAND.navy;
const PINK = BRAND.pink;

function memePunch() {
  return {
    name: "Meme de un golpe",
    format: { id: "square", width: 1080, height: 1080 },
    background: { type: "catalog", catalogId: "fondo-rafaga", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 64, y: 72, w: 952, h: 200, z: 30, text: "Cuando dices «solo un meme más»", fontId: "anton", size: 68, color: CREAM, align: "left" }),
      textLayer({ name: "Remate", x: 64, y: 280, w: 952, h: 120, z: 31, text: "…y el pulpo tiene ocho ideas.", fontId: "barlow", size: 40, color: CREAM, align: "left" }),
      imageLayer({ name: "Buen humor", x: 280, y: 430, w: 520, h: 520, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
    ],
  };
}

function publiFeed() {
  return {
    name: "Publicación clara",
    format: { id: "square", width: 1080, height: 1080 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Franja", x: 0, y: 0, w: 1080, h: 168, z: 5, fill: PINK }),
      textLayer({ name: "Titular", x: 64, y: 230, w: 560, h: 220, z: 30, text: "Hay sitio para tu idea", fontId: "archivo", size: 64, color: NAVY, align: "left" }),
      textLayer({ name: "Cuerpo", x: 64, y: 470, w: 540, h: 180, z: 31, text: "Comunidad para crear, reír y aprender juntos.", fontId: "barlow", size: 36, color: NAVY, align: "left" }),
      rectLayer({ name: "Marca", x: 64, y: 860, w: 360, h: 96, z: 20, fill: PINK }),
      textLayer({ name: "Enlace", x: 88, y: 882, w: 320, h: 56, z: 32, text: "ORVUPI", fontId: "barlow", size: 36, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 640, y: 340, w: 380, h: 380, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function historiaSaludo() {
  return {
    name: "Saludo de historia",
    format: { id: "story", width: 1080, height: 1920 },
    background: { type: "catalog", catalogId: "fondo-estrellas", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 72, y: 140, w: 936, h: 200, z: 30, text: "Hola, curiosidad", fontId: "bangers", size: 84, color: CREAM, align: "left" }),
      imageLayer({ name: "Saludo", x: 160, y: 420, w: 760, h: 760, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
      textLayer({ name: "Cuerpo", x: 72, y: 1260, w: 936, h: 160, z: 31, text: "Pasa, mira y crea con nosotros.", fontId: "barlow", size: 42, color: CREAM, align: "left" }),
      rectLayer({ name: "Sello", x: 72, y: 1520, w: 300, h: 84, z: 20, fill: PINK }),
      textLayer({ name: "Marca", x: 96, y: 1538, w: 250, h: 52, z: 32, text: "ORVUPI", fontId: "anton", size: 36, color: NAVY, align: "left" }),
    ],
  };
}

function anuncioAvance() {
  return {
    name: "Anuncio breve",
    format: { id: "square", width: 1080, height: 1080 },
    background: { type: "catalog", catalogId: "fondo-panel", fill: NAVY },
    layers: [
      rectLayer({ name: "Etiqueta", x: 64, y: 72, w: 240, h: 72, z: 20, fill: PINK }),
      textLayer({ name: "Tipo", x: 84, y: 86, w: 200, h: 48, z: 30, text: "AVANCE", fontId: "anton", size: 32, color: NAVY, align: "left" }),
      textLayer({ name: "Titular", x: 64, y: 190, w: 952, h: 160, z: 31, text: "Lo nuevo en ORVUPI", fontId: "anton", size: 64, color: CREAM, align: "left" }),
      textLayer({ name: "Cuerpo", x: 64, y: 380, w: 640, h: 200, z: 32, text: "Resumen corto del avance confirmado. Sin promesas.", fontId: "barlow", size: 36, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 700, y: 640, w: 300, h: 300, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Fuente", x: 64, y: 960, w: 600, h: 56, z: 33, text: "Novedades de ORVUPI", fontId: "barlow", size: 28, color: CREAM, align: "left" }),
    ],
  };
}

function memeVineta() {
  return {
    name: "Viñeta de dos frases",
    format: { id: "square", width: 1080, height: 1080 },
    background: { type: "catalog", catalogId: "fondo-vineta", fill: "#12081c" },
    layers: [
      rectLayer({ name: "Marco", x: 36, y: 36, w: 1008, h: 1008, z: 4, fill: "", stroke: CREAM, strokeWidth: 10 }),
      textLayer({ name: "Arriba", x: 72, y: 72, w: 936, h: 140, z: 30, text: "Tentáculo 1: planificar", fontId: "bangers", size: 52, color: CREAM, align: "left" }),
      imageLayer({ name: "Personaje", x: 250, y: 250, w: 580, h: 580, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
      textLayer({ name: "Abajo", x: 72, y: 880, w: 936, h: 120, z: 31, text: "Tentáculos 2–8: memes.", fontId: "silkscreen", size: 32, color: CREAM, align: "left" }),
    ],
  };
}

function historiaMarca() {
  return {
    name: "Pieza de marca",
    format: { id: "story", width: 1080, height: 1920 },
    background: { type: "solid", fill: PINK },
    layers: [
      textLayer({ name: "Titular", x: 72, y: 140, w: 936, h: 220, z: 30, text: "Rosa por fuera. Curioso por dentro.", fontId: "anton", size: 64, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 170, y: 420, w: 740, h: 740, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Cuerpo", x: 72, y: 1240, w: 936, h: 180, z: 31, text: "Una curiosidad. Ocho tentáculos. Muchas ideas.", fontId: "barlow", size: 40, color: NAVY, align: "left" }),
      textLayer({ name: "Firma", x: 72, y: 1720, w: 936, h: 72, z: 32, text: "ORVUPI", fontId: "barlow", size: 32, color: NAVY, align: "left" }),
    ],
  };
}

function curriculum() {
  return {
    name: "Currículum claro",
    format: { id: "cv", width: 794, height: 1123 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Franja", x: 0, y: 0, w: 240, h: 1123, z: 2, fill: NAVY }),
      textLayer({ name: "Marca", x: 28, y: 36, w: 190, h: 48, z: 20, text: "ORVUPI", fontId: "anton", size: 28, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 48, y: 110, w: 150, h: 150, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Nombre", x: 280, y: 48, w: 470, h: 80, z: 30, text: "Tu nombre", fontId: "archivo", size: 42, color: NAVY, align: "left" }),
      textLayer({ name: "Oficio", x: 280, y: 130, w: 470, h: 48, z: 31, text: "Lo que te gusta hacer", fontId: "barlow", size: 28, color: PINK, align: "left" }),
      textLayer({ name: "Resumen", x: 280, y: 210, w: 470, h: 140, z: 32, text: "Una frase sobre ti y la comunidad con la que creas.", fontId: "barlow", size: 24, color: NAVY, align: "left" }),
      textLayer({ name: "Bloque", x: 280, y: 380, w: 470, h: 200, z: 33, text: "Proyectos\nUna pieza, un aprendizaje, un equipo.", fontId: "barlow", size: 26, color: NAVY, align: "left" }),
      textLayer({ name: "Contacto", x: 28, y: 980, w: 190, h: 90, z: 21, text: "Comunidad", fontId: "barlow", size: 20, color: CREAM, align: "left" }),
    ],
  };
}

function presentacion() {
  return {
    name: "Presentación de ideas",
    format: { id: "deck", width: 1920, height: 1080 },
    background: { type: "solid", fill: NAVY },
    layers: [
      rectLayer({ name: "Acento", x: 0, y: 0, w: 28, h: 1080, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 120, y: 280, w: 1200, h: 220, z: 30, text: "Ideas con ocho caminos", fontId: "anton", size: 84, color: CREAM, align: "left" }),
      textLayer({ name: "Cuerpo", x: 120, y: 540, w: 900, h: 120, z: 31, text: "Una página para contar lo confirmado.", fontId: "barlow", size: 40, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 1320, y: 280, w: 460, h: 460, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
    ],
  };
}

function presentacionPagina2() {
  return [
    textLayer({ name: "Titular", x: 120, y: 120, w: 1600, h: 140, z: 30, text: "Siguiente idea", fontId: "anton", size: 72, color: NAVY, align: "left" }),
    textLayer({ name: "Uno", x: 120, y: 340, w: 700, h: 200, z: 31, text: "1. Observar", fontId: "barlow", size: 42, color: NAVY, align: "left" }),
    textLayer({ name: "Dos", x: 980, y: 340, w: 700, h: 200, z: 32, text: "2. Crear juntos", fontId: "barlow", size: 42, color: NAVY, align: "left" }),
    rectLayer({ name: "Pie", x: 120, y: 860, w: 280, h: 72, z: 4, fill: PINK }),
    textLayer({ name: "Marca", x: 148, y: 876, w: 230, h: 48, z: 33, text: "ORVUPI", fontId: "barlow", size: 28, color: NAVY, align: "left" }),
  ];
}

function docNotas() {
  return {
    name: "Notas en documento",
    format: { id: "doc", width: 794, height: 1123 },
    background: { type: "solid", fill: CREAM },
    layers: [
      textLayer({ name: "Titular", x: 72, y: 72, w: 650, h: 90, z: 30, text: "Documento", fontId: "archivo", size: 48, color: NAVY, align: "left" }),
      textLayer({ name: "Cuerpo", x: 72, y: 190, w: 650, h: 700, z: 31, text: "Empieza a escribir aquí.\n\nUna idea por párrafo.\nLo que confirmes, en frases cortas.", fontId: "barlow", size: 28, color: NAVY, align: "left" }),
    ],
  };
}

function videoHorizontal() {
  return {
    name: "Fotograma horizontal",
    format: { id: "video", width: 1920, height: 1080 },
    background: { type: "solid", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 100, y: 160, w: 1100, h: 180, z: 30, text: "Un instante de ORVUPI", fontId: "anton", size: 72, color: CREAM, align: "left" }),
      textLayer({ name: "Pie", x: 100, y: 380, w: 900, h: 80, z: 31, text: "Fotograma fijo para compartir.", fontId: "barlow", size: 36, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 1240, y: 240, w: 520, h: 520, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
      rectLayer({ name: "Barra", x: 0, y: 980, w: 1920, h: 100, z: 4, fill: PINK }),
    ],
  };
}

function flyer() {
  return {
    name: "Flyer de comunidad",
    format: { id: "flyer", width: 816, height: 1056 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cabecera", x: 0, y: 0, w: 816, h: 220, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 48, y: 48, w: 720, h: 120, z: 30, text: "Ven a crear", fontId: "anton", size: 64, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 230, y: 280, w: 360, h: 360, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
      textLayer({ name: "Cuerpo", x: 64, y: 680, w: 688, h: 180, z: 31, text: "Una tarde para ideas. Comunidad ORVUPI.", fontId: "barlow", size: 32, color: NAVY, align: "left" }),
      textLayer({ name: "Lugar", x: 64, y: 900, w: 688, h: 80, z: 32, text: "Trae una pregunta.", fontId: "barlow", size: 28, color: PINK, align: "left" }),
    ],
  };
}

function cartel() {
  return {
    name: "Cartel vertical",
    format: { id: "poster", width: 1080, height: 1440 },
    background: { type: "solid", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 72, y: 80, w: 936, h: 220, z: 30, text: "Cartel de comunidad", fontId: "anton", size: 72, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 180, y: 340, w: 720, h: 720, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Pie", x: 72, y: 1140, w: 936, h: 160, z: 31, text: "Rosa, crema y azul.", fontId: "barlow", size: 40, color: CREAM, align: "left" }),
    ],
  };
}

function folleto() {
  return {
    name: "Folleto de tres caras",
    format: { id: "trifold", width: 1080, height: 630 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cara 1", x: 0, y: 0, w: 360, h: 630, z: 2, fill: PINK }),
      textLayer({ name: "Qué", x: 24, y: 48, w: 312, h: 80, z: 30, text: "Qué es", fontId: "anton", size: 36, color: NAVY, align: "left" }),
      textLayer({ name: "Texto 1", x: 24, y: 150, w: 312, h: 300, z: 31, text: "Una curiosidad y muchas ideas.", fontId: "barlow", size: 26, color: NAVY, align: "left" }),
      textLayer({ name: "Cómo", x: 384, y: 48, w: 312, h: 80, z: 32, text: "Cómo se usa", fontId: "anton", size: 32, color: NAVY, align: "left" }),
      textLayer({ name: "Texto 2", x: 384, y: 150, w: 312, h: 300, z: 33, text: "Elige una pieza, edita y descarga.", fontId: "barlow", size: 26, color: NAVY, align: "left" }),
      textLayer({ name: "Dónde", x: 744, y: 48, w: 312, h: 80, z: 34, text: "Dónde mirar", fontId: "anton", size: 32, color: PINK, align: "left" }),
      imageLayer({ name: "Avatar", x: 760, y: 180, w: 280, h: 280, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function logoPieza() {
  return {
    name: "Logo cuadrado",
    format: { id: "logo", width: 1080, height: 1080 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Disco", x: 250, y: 160, w: 580, h: 580, z: 2, fill: PINK }),
      imageLayer({ name: "Avatar", x: 290, y: 200, w: 500, h: 500, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Nombre", x: 80, y: 820, w: 920, h: 120, z: 30, text: "ORVUPI", fontId: "anton", size: 84, color: NAVY, align: "center" }),
    ],
  };
}

function invitacion() {
  return {
    name: "Invitación vertical",
    format: { id: "invite", width: 750, height: 1050 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Marco", x: 36, y: 36, w: 678, h: 978, z: 2, fill: "", stroke: PINK, strokeWidth: 8 }),
      textLayer({ name: "Titular", x: 80, y: 90, w: 590, h: 140, z: 30, text: "Estás invitado", fontId: "anton", size: 52, color: NAVY, align: "center" }),
      imageLayer({ name: "Avatar", x: 185, y: 260, w: 380, h: 380, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
      textLayer({ name: "Cuerpo", x: 80, y: 700, w: 590, h: 180, z: 31, text: "Una quedada para crear.", fontId: "barlow", size: 32, color: NAVY, align: "center" }),
    ],
  };
}

function infografia() {
  return {
    name: "Infografía de tres pasos",
    format: { id: "info", width: 800, height: 2000 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cabecera", x: 0, y: 0, w: 800, h: 220, z: 2, fill: NAVY }),
      textLayer({ name: "Titular", x: 40, y: 48, w: 720, h: 120, z: 30, text: "Ocho ideas", fontId: "anton", size: 64, color: CREAM, align: "left" }),
      textLayer({ name: "Uno", x: 48, y: 280, w: 700, h: 160, z: 31, text: "Curiosidad", fontId: "archivo", size: 40, color: NAVY, align: "left" }),
      textLayer({ name: "Dos", x: 48, y: 520, w: 700, h: 160, z: 32, text: "Comunidad", fontId: "archivo", size: 40, color: PINK, align: "left" }),
      textLayer({ name: "Tres", x: 48, y: 760, w: 700, h: 160, z: 33, text: "Herramientas", fontId: "archivo", size: 40, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 180, y: 1100, w: 440, h: 440, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
    ],
  };
}

function postVertical() {
  return {
    name: "Post vertical",
    format: { id: "ig", width: 1080, height: 1350 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Franja", x: 0, y: 0, w: 1080, h: 160, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 64, y: 220, w: 952, h: 180, z: 30, text: "Hay sitio para tu idea", fontId: "archivo", size: 64, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 250, y: 460, w: 580, h: 580, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Pie", x: 64, y: 1120, w: 952, h: 120, z: 31, text: "Comunidad ORVUPI", fontId: "barlow", size: 36, color: NAVY, align: "left" }),
    ],
  };
}

function postHorizontal() {
  return {
    name: "Post horizontal",
    format: { id: "fb", width: 1200, height: 630 },
    background: { type: "solid", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 48, y: 160, w: 640, h: 180, z: 30, text: "Comunidad en horizontal", fontId: "anton", size: 48, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 760, y: 80, w: 380, h: 380, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
    ],
  };
}

function miniatura() {
  return {
    name: "Miniatura ancha",
    format: { id: "thumb", width: 1280, height: 720 },
    background: { type: "solid", fill: PINK },
    layers: [
      textLayer({ name: "Titular", x: 48, y: 180, w: 760, h: 220, z: 30, text: "Mira esta idea", fontId: "anton", size: 72, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 860, y: 80, w: 360, h: 360, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
    ],
  };
}

function enlaceBio() {
  return {
    name: "Enlace en la bio",
    format: { id: "bio", width: 1080, height: 1920 },
    background: { type: "solid", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 72, y: 120, w: 936, h: 140, z: 30, text: "Enlaces", fontId: "anton", size: 72, color: CREAM, align: "left" }),
      rectLayer({ name: "Uno", x: 120, y: 400, w: 840, h: 140, z: 4, fill: CREAM }),
      textLayer({ name: "Comunidad", x: 160, y: 440, w: 760, h: 70, z: 31, text: "Comunidad", fontId: "barlow", size: 36, color: NAVY, align: "center" }),
      rectLayer({ name: "Dos", x: 120, y: 600, w: 840, h: 140, z: 5, fill: PINK }),
      textLayer({ name: "Novedades", x: 160, y: 640, w: 760, h: 70, z: 32, text: "Novedades", fontId: "barlow", size: 36, color: NAVY, align: "center" }),
      imageLayer({ name: "Avatar", x: 280, y: 980, w: 520, h: 520, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function postProfesional() {
  return {
    name: "Post profesional",
    format: { id: "li", width: 1200, height: 627 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Barra", x: 0, y: 0, w: 16, h: 627, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 64, y: 160, w: 680, h: 180, z: 30, text: "Profesional y curioso", fontId: "archivo", size: 48, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 800, y: 90, w: 340, h: 340, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function tarjeta() {
  return {
    name: "Tarjeta de presentación",
    format: { id: "card", width: 1050, height: 600 },
    background: { type: "solid", fill: NAVY },
    layers: [
      imageLayer({ name: "Avatar", x: 48, y: 80, w: 280, h: 280, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      textLayer({ name: "Nombre", x: 380, y: 160, w: 620, h: 100, z: 30, text: "ORVUPI", fontId: "anton", size: 64, color: CREAM, align: "left" }),
      textLayer({ name: "Oficio", x: 380, y: 280, w: 620, h: 70, z: 31, text: "Comunidad", fontId: "barlow", size: 32, color: PINK, align: "left" }),
    ],
  };
}

function correo() {
  return {
    name: "Correo breve",
    format: { id: "email", width: 640, height: 960 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cabecera", x: 0, y: 0, w: 640, h: 140, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 40, y: 40, w: 560, h: 70, z: 30, text: "Mensaje", fontId: "anton", size: 40, color: NAVY, align: "left" }),
      textLayer({ name: "Cuerpo", x: 40, y: 200, w: 560, h: 400, z: 31, text: "Hola.\n\nUn mensaje corto para la comunidad.", fontId: "barlow", size: 28, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 200, y: 640, w: 240, h: 240, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
    ],
  };
}

function hoja() {
  return {
    name: "Hoja de tres filas",
    format: { id: "sheet", width: 1080, height: 1080 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cabecera", x: 40, y: 40, w: 1000, h: 100, z: 2, fill: NAVY }),
      textLayer({ name: "Columnas", x: 60, y: 64, w: 960, h: 56, z: 30, text: "Idea          Estado          Nota", fontId: "barlow", size: 32, color: CREAM, align: "left" }),
      textLayer({ name: "Fila", x: 60, y: 180, w: 960, h: 80, z: 31, text: "Pulpo         Listo           Borrador", fontId: "barlow", size: 32, color: NAVY, align: "left" }),
      rectLayer({ name: "Linea", x: 40, y: 280, w: 1000, h: 8, z: 3, fill: PINK }),
    ],
  };
}

function codigo() {
  return {
    name: "Pieza de código",
    format: { id: "code", width: 1080, height: 1080 },
    background: { type: "solid", fill: NAVY },
    layers: [
      textLayer({ name: "Titular", x: 64, y: 80, w: 952, h: 80, z: 30, text: "Pieza", fontId: "silkscreen", size: 36, color: PINK, align: "left" }),
      textLayer({ name: "Lineas", x: 64, y: 240, w: 952, h: 360, z: 31, text: "while (curiosidad)\n  crear", fontId: "silkscreen", size: 42, color: CREAM, align: "left" }),
      imageLayer({ name: "Avatar", x: 680, y: 620, w: 320, h: 320, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function collage() {
  return {
    name: "Collage de tres gestos",
    format: { id: "collage", width: 1080, height: 1080 },
    background: { type: "solid", fill: CREAM },
    layers: [
      imageLayer({ name: "Uno", x: 36, y: 36, w: 480, h: 640, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
      imageLayer({ name: "Dos", x: 540, y: 36, w: 500, h: 300, z: 11, src: { kind: "catalog", id: "orvupi-saludo" } }),
      imageLayer({ name: "Tres", x: 540, y: 360, w: 500, h: 316, z: 12, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
      textLayer({ name: "Pie", x: 36, y: 760, w: 1000, h: 200, z: 30, text: "Tres gestos", fontId: "anton", size: 64, color: NAVY, align: "left" }),
    ],
  };
}

function pizarra() {
  return {
    name: "Pizarra de ideas",
    format: { id: "board", width: 1920, height: 1080 },
    background: { type: "solid", fill: "#f4f7fb" },
    layers: [
      rectLayer({ name: "Nota", x: 120, y: 160, w: 420, h: 280, z: 4, fill: "#ffe07a" }),
      textLayer({ name: "Idea", x: 148, y: 190, w: 370, h: 200, z: 30, text: "Idea", fontId: "barlow", size: 40, color: NAVY, align: "left" }),
      rectLayer({ name: "Nota 2", x: 620, y: 220, w: 420, h: 240, z: 5, fill: PINK }),
      textLayer({ name: "Otra", x: 648, y: 250, w: 370, h: 160, z: 31, text: "Otra nota", fontId: "barlow", size: 36, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 1280, y: 240, w: 420, h: 420, z: 10, src: { kind: "catalog", id: "orvupi-buen-humor" } }),
    ],
  };
}

function sitio() {
  return {
    name: "Página de comunidad",
    format: { id: "web", width: 1280, height: 1800 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Barra", x: 0, y: 0, w: 1280, h: 96, z: 4, fill: NAVY }),
      textLayer({ name: "Marca", x: 36, y: 24, w: 300, h: 52, z: 30, text: "ORVUPI", fontId: "anton", size: 32, color: CREAM, align: "left" }),
      textLayer({ name: "Hero", x: 72, y: 180, w: 800, h: 160, z: 31, text: "Una página para la comunidad", fontId: "archivo", size: 48, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 760, y: 360, w: 420, h: 420, z: 10, src: { kind: "catalog", id: "orvupi-saludo" } }),
      textLayer({ name: "Seccion", x: 72, y: 860, w: 640, h: 200, z: 32, text: "Sección\nUn espacio para lo que la comunidad crea.", fontId: "barlow", size: 32, color: NAVY, align: "left" }),
    ],
  };
}

function ficha() {
  return {
    name: "Ficha para aprender",
    format: { id: "doc", width: 794, height: 1123 },
    background: { type: "solid", fill: CREAM },
    layers: [
      rectLayer({ name: "Cabecera", x: 0, y: 0, w: 794, h: 160, z: 2, fill: PINK }),
      textLayer({ name: "Titular", x: 40, y: 40, w: 700, h: 80, z: 30, text: "Ficha", fontId: "anton", size: 48, color: NAVY, align: "left" }),
      textLayer({ name: "Pregunta", x: 40, y: 220, w: 700, h: 160, z: 31, text: "Pregunta del día\nQué observas", fontId: "barlow", size: 32, color: NAVY, align: "left" }),
      imageLayer({ name: "Avatar", x: 220, y: 480, w: 360, h: 360, z: 10, src: { kind: "catalog", id: "orvupi-avatar" } }),
    ],
  };
}

function entry(spec) {
  return {
    precio: "gratis",
    idiomas: ["es", "en"],
    etiquetas: spec.etiquetas || [],
    formatos: spec.formatos || [spec.formato],
    ...spec,
  };
}

export const PLANTILLAS = [
  { id: "meme-punch", nombre: { es: "Meme de un golpe", en: "One-line meme" }, formato: "square", formatos: ["square"], uso: "meme", estilo: "humor", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["meme", "pulpo"], shell: "design", build: memePunch },
  { id: "publi-feed", nombre: { es: "Publicación clara", en: "Clear post" }, formato: "square", formatos: ["square"], uso: "publicacion", estilo: "claro", color: "crema", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["publicacion", "comunidad"], shell: "design", build: publiFeed },
  { id: "historia-saludo", nombre: { es: "Saludo de historia", en: "Story hello" }, formato: "story", formatos: ["story", "tiktok"], uso: "historia", estilo: "humor", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["historia", "saludo"], shell: "design", build: historiaSaludo },
  { id: "anuncio-avance", nombre: { es: "Anuncio breve", en: "Short update" }, formato: "square", formatos: ["square"], uso: "anuncio", estilo: "informativo", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["anuncio", "avance"], shell: "design", build: anuncioAvance },
  { id: "meme-vineta", nombre: { es: "Viñeta de dos frases", en: "Two-line panel" }, formato: "square", formatos: ["square"], uso: "meme", estilo: "comic", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["meme", "vineta"], shell: "design", build: memeVineta },
  { id: "historia-marca", nombre: { es: "Pieza de marca", en: "Brand piece" }, formato: "story", formatos: ["story", "tiktok"], uso: "marca", estilo: "marca", color: "rosa", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["marca", "historia"], shell: "design", build: historiaMarca },
  entry({ id: "curriculum-claro", nombre: { es: "Currículum claro", en: "Clear resume" }, formato: "cv", uso: "curriculum", estilo: "claro", color: "crema", etiquetas: ["curriculum", "cv"], shell: "print", build: curriculum }),
  entry({ id: "presentacion-ideas", nombre: { es: "Presentación de ideas", en: "Ideas deck" }, formato: "deck", uso: "presentacion", estilo: "claro", color: "azul", etiquetas: ["presentacion", "paginas"], shell: "deck", build: presentacion, extraPages: presentacionPagina2 }),
  entry({ id: "doc-notas", nombre: { es: "Notas en documento", en: "Notes doc" }, formato: "doc", uso: "documento", estilo: "claro", color: "crema", etiquetas: ["documento", "notas"], shell: "doc", build: docNotas }),
  entry({ id: "video-horizontal", nombre: { es: "Fotograma horizontal", en: "Landscape frame" }, formato: "video", uso: "video", estilo: "informativo", color: "azul", etiquetas: ["video", "fotograma"], shell: "video", build: videoHorizontal }),
  entry({ id: "flyer-comunidad", nombre: { es: "Flyer de comunidad", en: "Community flyer" }, formato: "flyer", uso: "flyer", estilo: "claro", color: "rosa", etiquetas: ["flyer", "impresion"], shell: "print", build: flyer }),
  entry({ id: "cartel-vertical", nombre: { es: "Cartel vertical", en: "Vertical poster" }, formato: "poster", uso: "cartel", estilo: "humor", color: "azul", etiquetas: ["cartel", "poster"], shell: "print", build: cartel }),
  entry({ id: "folleto-tres", nombre: { es: "Folleto de tres caras", en: "Three-panel leaflet" }, formato: "trifold", uso: "folleto", estilo: "claro", color: "crema", etiquetas: ["folleto", "plegado"], shell: "print", build: folleto }),
  entry({ id: "logo-cuadrado", nombre: { es: "Logo cuadrado", en: "Square logo" }, formato: "logo", uso: "logo", estilo: "marca", color: "rosa", etiquetas: ["logo", "marca"], shell: "print", build: logoPieza }),
  entry({ id: "invitacion-vertical", nombre: { es: "Invitación vertical", en: "Vertical invitation" }, formato: "invite", uso: "invitacion", estilo: "claro", color: "crema", etiquetas: ["invitacion"], shell: "print", build: invitacion }),
  entry({ id: "infografia-pasos", nombre: { es: "Infografía de tres pasos", en: "Three-step infographic" }, formato: "info", uso: "infografia", estilo: "informativo", color: "crema", etiquetas: ["infografia"], shell: "print", build: infografia }),
  entry({ id: "post-vertical", nombre: { es: "Post vertical", en: "Vertical post" }, formato: "ig", uso: "redes", estilo: "claro", color: "crema", etiquetas: ["redes", "vertical"], shell: "design", build: postVertical }),
  entry({ id: "post-horizontal", nombre: { es: "Post horizontal", en: "Landscape post" }, formato: "fb", uso: "redes", estilo: "humor", color: "azul", etiquetas: ["redes", "horizontal"], shell: "design", build: postHorizontal }),
  entry({ id: "miniatura-ancha", nombre: { es: "Miniatura ancha", en: "Wide thumbnail" }, formato: "thumb", uso: "miniatura", estilo: "humor", color: "rosa", etiquetas: ["miniatura"], shell: "design", build: miniatura }),
  entry({ id: "enlace-bio", nombre: { es: "Enlace en la bio", en: "Bio link" }, formato: "bio", uso: "redes", estilo: "marca", color: "azul", etiquetas: ["bio", "historia"], shell: "design", build: enlaceBio }),
  entry({ id: "post-profesional", nombre: { es: "Post profesional", en: "Professional post" }, formato: "li", uso: "redes", estilo: "informativo", color: "crema", etiquetas: ["profesional"], shell: "design", build: postProfesional }),
  entry({ id: "tarjeta-presentacion", nombre: { es: "Tarjeta de presentación", en: "Calling card" }, formato: "card", uso: "tarjeta", estilo: "marca", color: "azul", etiquetas: ["tarjeta"], shell: "print", build: tarjeta }),
  entry({ id: "correo-breve", nombre: { es: "Correo breve", en: "Short email" }, formato: "email", uso: "correo", estilo: "claro", color: "crema", etiquetas: ["correo"], shell: "doc", build: correo }),
  entry({ id: "hoja-filas", nombre: { es: "Hoja de tres filas", en: "Three-row sheet" }, formato: "sheet", uso: "hoja", estilo: "informativo", color: "crema", etiquetas: ["hoja", "tabla"], shell: "design", build: hoja }),
  entry({ id: "pieza-codigo", nombre: { es: "Pieza de código", en: "Code piece" }, formato: "code", uso: "codigo", estilo: "comic", color: "azul", etiquetas: ["codigo"], shell: "design", build: codigo }),
  entry({ id: "collage-gestos", nombre: { es: "Collage de tres gestos", en: "Three-gesture collage" }, formato: "collage", uso: "collage", estilo: "humor", color: "crema", etiquetas: ["collage", "fotos"], shell: "design", build: collage }),
  entry({ id: "pizarra-ideas", nombre: { es: "Pizarra de ideas", en: "Ideas board" }, formato: "board", uso: "pizarra", estilo: "claro", color: "crema", etiquetas: ["pizarra"], shell: "whiteboard", build: pizarra }),
  entry({ id: "sitio-comunidad", nombre: { es: "Página de comunidad", en: "Community page" }, formato: "web", uso: "web", estilo: "claro", color: "crema", etiquetas: ["web", "seccion"], shell: "web", build: sitio }),
  entry({ id: "ficha-aprender", nombre: { es: "Ficha para aprender", en: "Learning card" }, formato: "doc", uso: "educacion", estilo: "informativo", color: "rosa", etiquetas: ["educacion", "ficha"], shell: "doc", build: ficha }),
  ...masPlantillas(),
];

export const IDEAS = [
  { id: "meme-rapido", plantilla: "meme-punch", es: "Meme de un golpe", en: "One-line meme" },
  { id: "publicacion", plantilla: "publi-feed", es: "Publicación clara", en: "Clear post" },
  { id: "saludo", plantilla: "historia-saludo", es: "Saludo de historia", en: "Story hello" },
  { id: "anuncio", plantilla: "anuncio-avance", es: "Anuncio breve", en: "Short update" },
  { id: "vineta", plantilla: "meme-vineta", es: "Viñeta de dos frases", en: "Two-line panel" },
  { id: "marca", plantilla: "historia-marca", es: "Pieza de marca", en: "Brand piece" },
];

export function plantillaById(id) {
  return PLANTILLAS.find((item) => item.id === id) || null;
}

export function instantiate(id) {
  const item = plantillaById(id);
  if (!item) return null;
  const spec = item.build();
  const doc = createDocument({
    ...spec,
    templateId: item.id,
    meta: { locale: "es", useTags: [item.uso], optionalLabel: "", shell: item.shell || "design" },
  });
  doc.templateId = item.id;
  doc.meta.shell = item.shell || doc.meta.shell;
  if (typeof item.extraPages === "function") {
    doc.meta.pages = [doc.layers, item.extraPages()];
    doc.meta.page = 0;
  }
  return doc;
}

export function filterPlantillas(query = {}) {
  const text = String(query.text || "").trim().toLowerCase();
  return PLANTILLAS.filter((item) => {
    if (query.uso && item.uso !== query.uso) return false;
    if (query.estilo && item.estilo !== query.estilo) return false;
    if (query.color && item.color !== query.color) return false;
    if (query.formato && !(item.formatos || [item.formato]).includes(query.formato)) return false;
    if (query.precio && item.precio !== query.precio) return false;
    if (query.idioma && !item.idiomas.includes(query.idioma)) return false;
    if (!text) return true;
    const blob = [item.nombre.es, item.nombre.en, item.uso, item.estilo, item.color, ...(item.etiquetas || [])].join(" ").toLowerCase();
    return blob.includes(text);
  });
}
