import { describe, expect, it } from "vitest";
import { addSubtab, addTab, canMove, combinedContent, duplicateTab, moveInto, moveOut, moveTab, placeTab, removeTab, tabsOf, visibleTabs, type DocTab } from "../../src/docs/tabs";
import { parseOrvdoc, serializeOrvdoc, createOrvdoc } from "../../src/docs/orvdoc";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const shape = (tabs: DocTab[]) => tabs.map((tab) => `${tab.depth}:${tab.title}`);
const base = (): DocTab[] => [
  { id: "a", title: "A", depth: 0, content: doc("a") },
  { id: "b", title: "B", depth: 0, content: doc("b") },
  { id: "b1", title: "B1", depth: 1, content: doc("b1") },
  { id: "b2", title: "B2", depth: 2, content: doc("b2") },
  { id: "c", title: "C", depth: 0, content: doc("c") },
];

describe("pestañas 0.8.3", () => {
  it("añade pestañas y subpestañas", () => {
    expect(shape(addTab(base(), "Pestaña 6").tabs).at(-1)).toBe("0:Pestaña 6");
    expect(shape(addSubtab(base(), 1, "N").tabs)).toEqual(["0:A", "0:B", "1:B1", "2:B2", "1:N", "0:C"]);
  });
  it("elimina con sus subpestañas y no deja el documento sin pestañas", () => {
    expect(shape(removeTab(base(), 1))).toEqual(["0:A", "0:C"]);
    expect(removeTab([base()[0]!], 0)).toHaveLength(1);
  });
  it("duplica el grupo con ids nuevos", () => {
    const { tabs, id } = duplicateTab(base(), 1, (n) => `Copia de ${n}`);
    expect(shape(tabs)).toEqual(["0:A", "0:B", "1:B1", "2:B2", "0:Copia de B", "1:B1", "2:B2", "0:C"]);
    expect(new Set(tabs.map((t) => t.id)).size).toBe(tabs.length);
    expect(id).not.toBe("b");
  });
  it("mueve arriba/abajo entre hermanas", () => {
    expect(canMove(base(), 0, -1)).toBe(false);
    expect(canMove(base(), 2, 1)).toBe(false);
    expect(shape(moveTab(base(), 1, -1))).toEqual(["0:B", "1:B1", "2:B2", "0:A", "0:C"]);
    expect(shape(moveTab(base(), 1, 1))).toEqual(["0:A", "0:C", "0:B", "1:B1", "2:B2"]);
  });
  it("mover a / sacar del grupo / soltar con anidado", () => {
    expect(shape(moveInto(base(), 4, 0))).toEqual(["0:A", "1:C", "0:B", "1:B1", "2:B2"]);
    expect(shape(moveOut(base(), 2))).toEqual(["0:A", "0:B", "0:B1", "1:B2", "0:C"]);
    expect(shape(placeTab(base(), 4, 0, 0))).toEqual(["0:C", "0:A", "0:B", "1:B1", "2:B2"]);
    expect(shape(placeTab(base(), 4, 1, 3))).toEqual(["0:A", "1:C", "0:B", "1:B1", "2:B2"]);
  });
  it("contraer oculta las subpestañas", () => {
    const tabs = base().map((t) => (t.id === "b" ? { ...t, collapsed: true } : t));
    expect(visibleTabs(tabs).map((v) => v.tab.id)).toEqual(["a", "b", "c"]);
  });
  it("exporta cada pestaña con título y salto de página", () => {
    const out = combinedContent(base());
    expect(out.content?.filter((n) => n.type === "pageBreak")).toHaveLength(4);
    expect(out.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  });
  it("se guarda en el .orvdoc y valida lo que llega", () => {
    const file = { ...createOrvdoc({ id: "x", title: "T", content: doc("a") }), tabs: base().map((t, i) => (i === 0 ? { ...t, content: undefined } : t)) };
    const back = parseOrvdoc(serializeOrvdoc(file));
    expect(shape(back.tabs!)).toEqual(shape(base()));
    const bad = tabsOf([{ id: "x", title: "X", depth: 7 }, { id: "x", title: "\u0000", depth: 3 }], doc("a"), "Pestaña 1");
    expect(bad.map((t) => t.depth)).toEqual([0, 1]);
    expect(bad[1]!.id).not.toBe("x");
  });
});
