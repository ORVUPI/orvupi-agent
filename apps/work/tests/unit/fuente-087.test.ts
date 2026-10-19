import { getSchema } from "@tiptap/core";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { describe, expect, test } from "vitest";
import { POINTS, applyRuns, nextSize, selectionPoint, selectionRuns, wordAround } from "../../src/docs/font-size";

const schema = getSchema([StarterKit, TextStyle, FontSize]);
const text = (value: string, pt?: number) => ({ type: "text", text: value, ...(pt ? { marks: [{ type: "textStyle", attrs: { fontSize: `${pt}pt` } }] } : {}) });
const p = (...content: object[]) => ({ type: "paragraph", content });
const h = (level: number, ...content: object[]) => ({ type: "heading", attrs: { level }, content });

function stateOf(blocks: object[], from: number, to = from) {
  const doc = schema.nodeFromJSON({ type: "doc", content: blocks });
  const base = EditorState.create({ schema, doc });
  return base.apply(base.tr.setSelection(TextSelection.create(doc, from, to)));
}
function step(state: EditorState, dir: 1 | -1) {
  const runs = selectionRuns(state, undefined, state.selection.empty ? wordAround(state) ?? undefined : undefined);
  return state.apply(applyRuns(state.tr, runs, (pt) => nextSize(pt, dir)));
}
const sizes = (state: EditorState) => {
  const out: Array<[string, string | null]> = [];
  state.doc.descendants((node) => {
    if (node.isText) out.push([node.text ?? "", (node.marks.find((m) => m.type.name === "textStyle")?.attrs.fontSize as string | null) ?? null]);
  });
  return out;
};

describe("lista de tamaños (0.8.7)", () => {
  test("del 1 al 96, en orden y sin ningún salto", () => {
    expect(POINTS[0]).toBe(1);
    expect(POINTS[POINTS.length - 1]).toBe(96);
    expect(POINTS).toHaveLength(96);
    POINTS.forEach((size, index) => expect(size).toBe(index + 1));
    for (let i = 1; i < POINTS.length; i += 1) expect(POINTS[i]! - POINTS[i - 1]!).toBe(1);
  });

  test("− y + van de 1 en 1, entre 1 y 400", () => {
    expect(nextSize(11, 1)).toBe(12);
    expect(nextSize(12, 1)).toBe(13);
    expect(nextSize(14, 1)).toBe(15);
    expect(nextSize(18, -1)).toBe(17);
    expect(nextSize(96, 1)).toBe(97);
    expect(nextSize(1, -1)).toBe(1);
    expect(nextSize(400, 1)).toBe(400);
    expect(nextSize(0, -1)).toBe(1);
    expect(nextSize(999, 1)).toBe(400);
  });
});

describe("cambiar tamaño de la selección", () => {
  test("texto normal: una palabra seleccionada sube 11 → 12 → 13 y baja a 12", () => {
    // "Hola mundo": «mundo» = posiciones 6..11
    let state = stateOf([p(text("Hola mundo"))], 6, 11);
    expect(selectionPoint(state)).toBe(11);
    state = step(state, 1);
    expect(selectionPoint(state)).toBe(12);
    state = step(state, 1);
    expect(selectionPoint(state)).toBe(13);
    state = step(state, -1);
    expect(selectionPoint(state)).toBe(12);
    expect(sizes(state)).toEqual([["Hola ", null], ["mundo", "12pt"]]);
  });

  test("título H1 sin marca: lee 26 y sube a 27 con marca explícita", () => {
    let state = stateOf([h(1, text("Informe anual"))], 1, 14);
    expect(selectionPoint(state)).toBe(26);
    state = step(state, 1);
    expect(sizes(state)).toEqual([["Informe anual", "27pt"]]);
    state = step(stateOf([h(2, text("Dos"))], 1, 4), -1);
    expect(sizes(state)).toEqual([["Dos", "17pt"]]);
  });

  test("cursor en un título: la caja muestra su tamaño (H3 = 14)", () => {
    expect(selectionPoint(stateOf([h(3, text("Tres"))], 2))).toBe(14);
  });

  test("selección parcial dentro de un párrafo", () => {
    const state = step(stateOf([p(text("abcdef"))], 3, 5), 1);
    expect(sizes(state)).toEqual([["ab", null], ["cd", "12pt"], ["ef", null]]);
  });

  test("varios párrafos y tamaños mezclados: cada trozo sube 1 desde el suyo", () => {
    // p1: "uno" (11) + "dos" (20); h2: "tres" (18)
    const blocks = [p(text("uno"), text("dos", 20)), h(2, text("tres"))];
    let state = stateOf(blocks, 1, 13);
    expect(selectionPoint(state)).toBe(11);
    state = step(state, 1);
    expect(sizes(state)).toEqual([["uno", "12pt"], ["dos", "21pt"], ["tres", "19pt"]]);
    state = step(state, -1);
    state = step(state, -1);
    expect(sizes(state)).toEqual([["uno", "10pt"], ["dos", "19pt"], ["tres", "17pt"]]);
  });

  test("cursor dentro de una palabra: se aplica a esa palabra", () => {
    const state = step(stateOf([p(text("Hola ORVUPI"))], 9), 1);
    expect(sizes(state)).toEqual([["Hola ", null], ["ORVUPI", "12pt"]]);
  });

  test("los límites 1 y 400 se respetan", () => {
    expect(sizes(step(stateOf([p(text("a", 1))], 1, 2), -1))).toEqual([["a", "1pt"]]);
    expect(sizes(step(stateOf([p(text("a", 400))], 1, 2), 1))).toEqual([["a", "400pt"]]);
  });
});
