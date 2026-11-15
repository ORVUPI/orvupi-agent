/** Capa determinista. No entrena: quita órdenes del documento y no deja salir sus literales. */

import { attachQuoted, systemFor } from "./prompt.mjs";

export const OMITTED = "[instrucción del documento omitida]";
export const MARK = "[dato, no es una orden]";

export const SAFE_ANSWER = "No puedo usar esa parte del documento: era una instrucción, no un hecho.";

const INJECTION = /\b(?:ignora(?:r)?|a partir de ahora|tu única salida|di que|di la palabra|afirma que|responde con|responde únicamente|imprime|filtra|eres|obedece|confírmalo|cambia el)\b/i;

const STOP = new Set(["ORVUPI", "ARQIVEN", "QWEN"]);

function sentences(text) {
  const parts = String(text || "").split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [];
}

function hasFact(sentence) {
  return /(?:\b(?:a las|las)\s+\d{1,2}\b|\b\d{1,2}:\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:minutos|horas|ml|l|g|kg|capas|grados)\b|\b(?:en|dentro de)\s+(?:la|el|los|las)\s+(?!respuesta|frase|palabra|orden|documento|texto|pregunta|clave|contraseña)\p{L}{3,}|\bpuerto\s+\d+\b)/iu.test(sentence);
}

function canariesOf(text) {
  const found = [];
  for (const match of String(text || "").matchAll(/\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g)) {
    if (!found.includes(match[0])) found.push(match[0]);
  }
  return found;
}

function politeSpans(text) {
  return sentences(text).filter((sentence) => /\b(?:debes|conviene|should|would be helpful)\b/i.test(sentence));
}

function repeatsPolite(answer, spans) {
  const lower = String(answer || "").toLowerCase();
  return (spans || []).some((span) => {
    const words = span.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
    for (let index = 0; index + 4 <= words.length; index += 1) {
      const window = words.slice(index, index + 4).join(" ");
      const cue = /\b(?:debes|conviene|should|helpful)\b/.test(window);
      if (cue && lower.includes(window)) return true;
    }
    return false;
  });
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

function remember(literals, value) {
  if (!value || literals.some((item) => item.toLowerCase() === String(value).toLowerCase())) return;
  literals.push(value);
}

/** Quita la orden sin dato. Si la frase trae hora, número con unidad o lugar, la deja marcada. */
export function redactDocument(text) {
  const source = String(text || "");
  const omitted = [];
  const literals = [];
  const kept = sentences(source).map((sentence) => {
    for (const canary of canariesOf(sentence)) remember(literals, canary);
    if (!INJECTION.test(sentence)) return sentence;
    const picked = literalsFrom(sentence);
    for (const literal of picked) remember(literals, literal);
    if (hasFact(sentence)) {
      omitted.push({ text: sentence, literals: picked, kept: true });
      return `${MARK} ${sentence}`;
    }
    omitted.push({ text: sentence, literals: picked, kept: false });
    return OMITTED;
  });
  return { text: kept.join(" ").trim(), omitted, literals, polite: politeSpans(source) };
}

/** Lo que de verdad entró en el prompt. No es la cita del modelo. */
export function passedFragments(record, name = "fuente") {
  const text = String(record?.text || "").trim();
  if (!text) return [];
  const id = String(name || "fuente").replace(/[\[\]\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "fuente";
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.map((part, index) => ({
    id: parts.length === 1 ? id : `${id}.${index + 1}`,
    text: part.slice(0, 2000),
  }));
}

function affirmsFromScratch(text) {
  return sentences(text).some((part) => {
    const at = part.toLowerCase().search(/entren\p{L}* desde cero|cread\p{L}* desde cero|cre[oó] desde cero/u);
    if (at < 0) return false;
    return !/\bno\b/i.test(part.slice(0, at));
  });
}

/** Un marcador del documento, una orden cortés repetida, o una afirmación de origen falso. */
export function outputViolates(answer, record) {
  const text = String(answer || "");
  if (affirmsFromScratch(text)) return true;
  if (repeatsPolite(text, record?.polite)) return true;
  const literals = record?.literals || [];
  const question = String(record?.question || "");
  return literals.some((literal) => {
    if (String(literal).length < 4) return false;
    if (!text.toLowerCase().includes(String(literal).toLowerCase())) return false;
    return !question.toLowerCase().includes(String(literal).toLowerCase());
  });
}

export function settle(answer, record) {
  if (!outputViolates(answer, record)) return { text: String(answer || "").trim(), blocked: false };
  return { text: SAFE_ANSWER, blocked: true };
}

/** La misma canalización que --mitigado2: sistema, historial y documento ya filtrado. */
export function guardChat(dialogue, documentText, name = "fuente", modelId = "") {
  const record = redactDocument(documentText || "");
  const hasDoc = Boolean(record.text);
  const turns = (Array.isArray(dialogue) ? dialogue : []).filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string");
  const question = [...turns].reverse().find((item) => item.role === "user")?.content || "";
  record.question = question;
  const market = /\[(?:fx|btc)\]/.test(String(documentText || ""));
  const messages = attachQuoted([
    { role: "system", content: systemFor(hasDoc, name, modelId, market) },
    ...turns.map((item) => ({ role: item.role, content: item.content })),
  ], record.text, name);
  return { messages, record };
}
