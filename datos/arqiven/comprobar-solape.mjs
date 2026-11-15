/* © 2026 ORVUPI. Todos los derechos reservados.
 * Comprueba que el lote de entrenamiento no repite, ni de forma casi igual,
 * los casos de eval/arqiven/fijo, el reservado ni eval/arqiven/v01.
 * No entrena, no descarga pesos y no modifica esos conjuntos.
 */

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { CASOS } from "../../eval/arqiven/fijo/casos.mjs";
import { RESERVADOS } from "../../eval/arqiven/fijo/reservado.mjs";

const JACCARD = 0.82;
const MIN_TOKENS = 8;
const MIN_CONTAIN = 80;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).split(" ").filter((token) => token.length > 1);
}

function jaccard(left, right) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (a.size < MIN_TOKENS || b.size < MIN_TOKENS) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export function solape(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return "";
  if (a === b) return "exacto";
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= MIN_CONTAIN && longer.includes(shorter)) return "contenido";
  if (jaccard(a, b) >= JACCARD) return "casi-exacto";
  return "";
}

function textsOfCase(item) {
  const out = [];
  for (const key of ["prompt", "source", "pregunta", "respuesta_esperada", "fragmento"]) {
    if (typeof item[key] === "string" && item[key].trim()) out.push(item[key]);
  }
  return out;
}

function textsOfExample(example) {
  const messages = Array.isArray(example.messages) ? example.messages : [];
  const pieces = messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => String(message.content || ""));
  return pieces.filter(Boolean).concat(pieces.join("\n"));
}

export async function referencias(root) {
  const v01 = JSON.parse(await readFile(new URL("../../eval/arqiven/v01/preguntas-reales.json", root), "utf8"));
  const rows = [];
  for (const item of CASOS) rows.push({ conjunto: "fijo", id: item.id, texto: textsOfCase(item) });
  for (const item of RESERVADOS) rows.push({ conjunto: "reservado", id: item.id, texto: textsOfCase(item) });
  for (const item of v01.preguntas) rows.push({ conjunto: "v01", id: item.id, texto: textsOfCase(item) });
  return rows;
}

export function buscarSolapes(ejemplos, refs) {
  const hits = [];
  for (const example of ejemplos) {
    const id = example.id || "(sin id)";
    for (const piece of textsOfExample(example)) {
      for (const ref of refs) {
        for (const texto of ref.texto) {
          const kind = solape(piece, texto);
          if (kind) hits.push({ id, conjunto: ref.conjunto, caso: ref.id, kind });
        }
      }
    }
  }
  return hits;
}

async function main() {
  const file = new URL("./lote-01.jsonl", import.meta.url);
  const raw = await readFile(file, "utf8");
  const ejemplos = raw.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
  const refs = await referencias(import.meta.url);
  const hits = buscarSolapes(ejemplos, refs);
  if (hits.length) {
    for (const hit of hits) console.error(`${hit.id} solapa con ${hit.conjunto}:${hit.caso} (${hit.kind})`);
    process.exit(1);
  }
  console.log(`sin solape: ${ejemplos.length} ejemplos frente a ${refs.length} referencias`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
