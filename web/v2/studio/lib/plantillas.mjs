/** Seis plantillas de meme y comunidad. El texto vive en el documento y se puede editar. */

import { BRAND, createDocument, imageLayer, rectLayer, textLayer } from "./document.mjs";

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

export const PLANTILLAS = [
  { id: "meme-punch", nombre: { es: "Meme de un golpe", en: "One-line meme" }, formato: "square", formatos: ["square"], uso: "meme", estilo: "humor", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["meme", "pulpo"], build: memePunch },
  { id: "publi-feed", nombre: { es: "Publicación clara", en: "Clear post" }, formato: "square", formatos: ["square"], uso: "publicacion", estilo: "claro", color: "crema", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["publicacion", "comunidad"], build: publiFeed },
  { id: "historia-saludo", nombre: { es: "Saludo de historia", en: "Story hello" }, formato: "story", formatos: ["story", "tiktok"], uso: "historia", estilo: "humor", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["historia", "saludo"], build: historiaSaludo },
  { id: "anuncio-avance", nombre: { es: "Anuncio breve", en: "Short update" }, formato: "square", formatos: ["square"], uso: "anuncio", estilo: "informativo", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["anuncio", "avance"], build: anuncioAvance },
  { id: "meme-vineta", nombre: { es: "Viñeta de dos frases", en: "Two-line panel" }, formato: "square", formatos: ["square"], uso: "meme", estilo: "comic", color: "azul", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["meme", "vineta"], build: memeVineta },
  { id: "historia-marca", nombre: { es: "Pieza de marca", en: "Brand piece" }, formato: "story", formatos: ["story", "tiktok"], uso: "marca", estilo: "marca", color: "rosa", precio: "gratis", idiomas: ["es", "en"], etiquetas: ["marca", "historia"], build: historiaMarca },
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
  const doc = createDocument({ ...spec, templateId: item.id, meta: { locale: "es", useTags: [item.uso], optionalLabel: "" } });
  doc.templateId = item.id;
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
