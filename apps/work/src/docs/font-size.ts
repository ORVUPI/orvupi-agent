import type { Node as ProseNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Tamaños de la lista: todos los enteros del 1 al 96, en orden y sin saltos. */
export const POINTS: readonly number[] = Array.from({ length: 96 }, (_, index) => index + 1);
export const MIN_POINT = 1;
export const MAX_POINT = 400;
/** Tamaño del texto normal del documento. */
export const BODY_POINT = 11;
/** Tamaño por estilo de párrafo (igual que app.css): se usa si no se puede leer el estilo calculado. */
export const HEADING_POINT: Record<number, number> = { 1: 26, 2: 18, 3: 14, 4: 12, 5: 11, 6: 11 };

export function clampPoint(value: number): number {
  if (!Number.isFinite(value)) return BODY_POINT;
  return Math.min(MAX_POINT, Math.max(MIN_POINT, Math.round(value)));
}

/** − y +: siempre de 1 en 1, entre 1 y 400. */
export function nextSize(current: number, dir: 1 | -1): number {
  return clampPoint(clampPoint(current) + dir);
}

/** Puntos de un valor de marca («12pt», «16px»); null si no es un tamaño. */
export function markPoint(raw: unknown): number | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return clampPoint(raw.trim().endsWith("px") ? parsed * 0.75 : parsed);
}

/** Tamaño del bloque sin marca: el estilo de párrafo (título H1–H6 o normal). */
export function stylePoint(block: ProseNode): number {
  if (block.type.name === "heading") return HEADING_POINT[Number(block.attrs.level)] ?? BODY_POINT;
  return BODY_POINT;
}

export type BlockPoint = (block: ProseNode, pos: number) => number;

export type SizeRun = { from: number; to: number; point: number; explicit: boolean };

function sizeMarkOf(node: ProseNode) {
  return node.marks.find((mark) => mark.type.name === "textStyle");
}

/** Trozos de texto de la selección con su tamaño real (marca o estilo del párrafo), en orden. */
export function selectionRuns(state: EditorState, blockPoint: BlockPoint = stylePoint, range?: { from: number; to: number }): SizeRun[] {
  const runs: SizeRun[] = [];
  const ranges = range ? [range] : state.selection.ranges.map((r) => ({ from: r.$from.pos, to: r.$to.pos }));
  for (const { from, to } of ranges) {
    if (from === to) continue;
    let block: ProseNode | null = null;
    let base = BODY_POINT;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isTextblock) {
        block = node;
        base = blockPoint(node, pos);
        return true;
      }
      if (!node.isText) return true;
      const start = Math.max(from, pos);
      const end = Math.min(to, pos + node.nodeSize);
      if (end <= start) return false;
      const own = markPoint(sizeMarkOf(node)?.attrs.fontSize);
      runs.push({ from: start, to: end, point: own ?? (block ? base : BODY_POINT), explicit: own !== null });
      return false;
    });
  }
  return runs;
}

/** Tamaño que se ve en la caja: el del primer trozo seleccionado (o el del cursor). */
export function selectionPoint(state: EditorState, blockPoint: BlockPoint = stylePoint): number {
  const { selection } = state;
  if (!selection.empty) {
    const runs = selectionRuns(state, blockPoint);
    if (runs[0]) return runs[0].point;
  }
  const $from = selection.$from;
  const marks = state.storedMarks ?? $from.marks();
  const stored = marks.find((mark) => mark.type.name === "textStyle");
  const own = markPoint(stored?.attrs.fontSize);
  if (own !== null) return own;
  const parent = $from.parent;
  if (parent.isTextblock) return blockPoint(parent, $from.before($from.depth));
  return BODY_POINT;
}

/** Aplica a cada trozo un tamaño calculado desde el suyo, con marca explícita (también en títulos). */
export function applyRuns(tr: Transaction, runs: SizeRun[], size: (point: number) => number): Transaction {
  const type = tr.doc.type.schema.marks.textStyle;
  if (!type) return tr;
  for (const run of runs) {
    const target = clampPoint(size(run.point));
    // Cada nodo de texto conserva sus otros atributos de estilo (color, fuente…).
    tr.doc.nodesBetween(run.from, run.to, (node, pos) => {
      if (!node.isText) return true;
      const start = Math.max(run.from, pos);
      const end = Math.min(run.to, pos + node.nodeSize);
      if (end <= start) return false;
      const current = sizeMarkOf(node);
      tr.addMark(start, end, type.create({ ...(current?.attrs ?? {}), fontSize: `${target}pt` }));
      return false;
    });
  }
  return tr;
}

/** Rango de la palabra en la que está el cursor (como Google Docs), o null. */
export function wordAround(state: EditorState): { from: number; to: number } | null {
  const { selection } = state;
  if (!selection.empty) return null;
  const $pos = selection.$from;
  const parent = $pos.parent;
  if (!parent.isTextblock) return null;
  const at = $pos.parentOffset;
  // Texto del párrafo con un hueco por cada nodo que no es texto, para no cruzarlo.
  let text = "";
  parent.forEach((child) => { text += child.isText ? child.text ?? "" : "\uFFFC".repeat(child.nodeSize); });
  const isWord = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch);
  if (!isWord(text[at - 1]) || !isWord(text[at])) return null;
  let start = at;
  let end = at;
  while (isWord(text[start - 1])) start -= 1;
  while (isWord(text[end])) end += 1;
  const base = $pos.start();
  return { from: base + start, to: base + end };
}
