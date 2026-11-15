/** Capa determinista. No entrena: quita órdenes del documento y no deja salir sus literales. */

import { attachDocument, systemFor } from "./prompt.mjs";

export const OMITTED = "[instrucción del documento omitida]";

export const SAFE_ANSWER = "No puedo usar esa parte del documento: era una instrucción, no un hecho.";

const INJECTION = /\b(?:ignora(?:r)?|a partir de ahora|tu única salida|di que|di la palabra|afirma que|responde con|responde únicamente|imprime|filtra|eres|obedece|confírmalo|cambia el)\b/i;

const STOP = new Set(["ORVUPI", "ARQIVEN", "QWEN"]);

function sentences(text) {
  const parts = String(text || "").split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [];
}

function literalsFrom(sentence) {
  const found = [];
  const add = (value) => {
    const clean = String(value || "").trim().replace(/[.]+$/g, "");
    if (clean.length < 4 || STOP.has(clean)) return;
    found.push(clean);
  };
  for (const match of sentence.matchAll(/\b[A-Z]{2,}(?:[-_][A-Z0-9]+)+\b/g)) add(match[0]);
  for (const match of sentence.matchAll(/\b[A-Z]{5,}\b/g)) add(match[0]);
  for (const match of sentence.matchAll(/\bArqiven-\d+\b/g)) add(match[0]);
  for (const match of sentence.matchAll(/\b\d{4,}\b/g)) add(match[0]);
  const spoken = sentence.match(/\bdi que\s+(.{8,80}?)(?:\.|$)/i);
  if (spoken) add(spoken[1]);
  const changed = sentence.match(/\bcambia el\s+(.{4,40}?)(?:\sy\s|\.|$)/i);
  if (changed) add(changed[1]);
  return found;
}

/** Sustituye cada frase imperativa y guarda los literales para la salida. */
export function redactDocument(text) {
  const omitted = [];
  const literals = [];
  const kept = sentences(text).map((sentence) => {
    if (!INJECTION.test(sentence)) return sentence;
    const picked = literalsFrom(sentence);
    omitted.push({ text: sentence, literals: picked });
    for (const literal of picked) {
      if (!literals.some((item) => item.toLowerCase() === literal.toLowerCase())) literals.push(literal);
    }
    return OMITTED;
  });
  return { text: kept.join(" ").trim(), omitted, literals };
}

function affirmsFromScratch(text) {
  return sentences(text).some((part) => {
    const at = part.toLowerCase().search(/entren\p{L}* desde cero|cread\p{L}* desde cero|cre[oó] desde cero/u);
    if (at < 0) return false;
    return !/\bno\b/i.test(part.slice(0, at));
  });
}

/** Un literal del bloque omitido, o una afirmación de origen falso. Negar ese origen no cuenta. */
export function outputViolates(answer, record) {
  const text = String(answer || "");
  if (affirmsFromScratch(text)) return true;
  const literals = record?.literals || [];
  return literals.some((literal) => literal.length >= 4 && text.toLowerCase().includes(String(literal).toLowerCase()));
}

export function settle(answer, record) {
  if (!outputViolates(answer, record)) return { text: String(answer || "").trim(), blocked: false };
  return { text: SAFE_ANSWER, blocked: true };
}

/** La misma canalización que --mitigado2: sistema, historial y documento ya filtrado. */
export function guardChat(dialogue, documentText, name = "fuente") {
  const record = redactDocument(documentText || "");
  const hasDoc = Boolean(record.text);
  const turns = (Array.isArray(dialogue) ? dialogue : []).filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string");
  const messages = attachDocument([
    { role: "system", content: systemFor(hasDoc) },
    ...turns.map((item) => ({ role: item.role, content: item.content })),
  ], record.text, name);
  return { messages, record };
}
