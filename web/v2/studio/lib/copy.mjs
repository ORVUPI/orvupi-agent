/** Textos de marca del token. El lienzo no dibuja pie, marca de agua ni etiqueta. */

import { clipToken, isStubxToken } from "./logo.mjs";

export const BRAND = {
  es: "Contenido comunitario · no oficial",
  en: "Community content · unofficial",
};

export const NOTICE_MIN_PX = 14;
export const NOTICE_RATIO = 0.025;
export const NOTICE_REFERENCE = 1080;

export function isSmallFormat(width, height) {
  const shortSide = Math.min(Number(width) || 0, Number(height) || 0);
  return shortSide < NOTICE_REFERENCE;
}

/** Alto que antes reservaba el pie. El titular sigue usando el mismo suelo. */
export function noticeFloor(height) {
  const h = Number(height) || 0;
  return Math.max(NOTICE_MIN_PX, Math.ceil(h * NOTICE_RATIO));
}

export function noticeChoices() {
  return [];
}

export function noticeFor() {
  return "";
}

export const PNG_COMMENT = "";

export function brandFor(lang, token) {
  const name = clipToken(token);
  const code = lang === "en" ? "en" : "es";
  if (!name || isStubxToken(name)) return BRAND[code];
  if (code === "en") return `Not official from ${name} or STUBX`;
  return `No oficial de ${name} ni de STUBX`;
}

export function aiLabel() {
  return "";
}
