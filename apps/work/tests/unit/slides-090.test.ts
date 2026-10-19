import { describe, expect, it } from "vitest";
import { createSlidesFile, layoutItems, parseSlides, serializeSlides, SLIDE_W, SLIDE_LAYOUTS } from "../../src/slides/model";
import { FONT_SIZES, safeLink, stepSize, youtubeId, moveSlide, boxOf } from "../../src/slides/ops";
import { exportPptx } from "../../src/slides/pptx";
import { unzip } from "../../src/sheets/zip";

describe("Presentaciones 0.9.0", () => {
  it("una presentación nueva empieza con la diapositiva de título y sus marcadores", () => {
    const file = createSlidesFile({ id: "a", title: "Prueba" });
    expect(file.slides).toHaveLength(1);
    const ph = file.slides[0]!.items.map((i) => (i.kind === "text" ? i.placeholder : null));
    expect(ph).toEqual(["title", "subtitle"]);
  });

  it("los 11 diseños dan marcadores dentro de la diapositiva", () => {
    expect(SLIDE_LAYOUTS).toHaveLength(11);
    for (const l of SLIDE_LAYOUTS) for (const i of layoutItems(l)) expect(i.x + i.w).toBeLessThanOrEqual(SLIDE_W);
  });

  it("migra los archivos antiguos (816 px de ancho) a 960 × 540", () => {
    const legacy = JSON.stringify({ format: "orvupi-slides", version: 1, id: "x", title: "Vieja", slides: [{ title: "Hola", body: "", theme: "papel", items: [{ id: "t", kind: "text", x: 408, y: 100, w: 408, h: 60, text: "Hola", size: 24 }] }] });
    const file = parseSlides(legacy);
    const item = file.slides[0]!.items[0]!;
    expect(item.x).toBeCloseTo(480, 0);
    expect(item.w).toBeCloseTo(480, 0);
    expect(parseSlides(serializeSlides(file)).slides[0]!.items[0]!.x).toBeCloseTo(480, 0);
  });

  it("tamaño de fuente de 1 en 1 y lista 1–96 sin saltos", () => {
    expect(FONT_SIZES).toEqual(Array.from({ length: 96 }, (_, i) => i + 1));
    expect(stepSize(18, 1)).toBe(19);
    expect(stepSize(18, -1)).toBe(17);
    expect(stepSize(1, -1)).toBe(1);
  });

  it("enlaces y vídeos seguros", () => {
    expect(safeLink("javascript:alert(1)")).toBeNull();
    expect(safeLink("orvupi.com")).toBe("https://orvupi.com");
    expect(safeLink("#slide=3")).toBe("#slide=3");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://evil.example/x")).toBeNull();
  });

  it("mover diapositivas y caja de selección", () => {
    expect(moveSlide(["a", "b", "c"] as never[], 2, 0)).toEqual(["c", "a", "b"]);
    expect(boxOf([{ id: "1", kind: "shape", shape: "rect", fill: "#fff", x: 10, y: 10, w: 10, h: 10, text: "" }, { id: "2", kind: "shape", shape: "rect", fill: "#fff", x: 30, y: 5, w: 10, h: 10, text: "" }])).toEqual({ x: 10, y: 5, w: 30, h: 15 });
  });

  it("exporta un .pptx válido con texto, notas, formas y líneas", async () => {
    const file = createSlidesFile({ id: "p", title: "Deck & <ORVUPI>" });
    file.slides[0] = { ...file.slides[0]!, notes: "Nota", items: [
      ...file.slides[0]!.items.map((i) => (i.kind === "text" && i.placeholder === "title" ? { ...i, text: "Hola <mundo>" } : i)),
      { id: "s", kind: "shape", shape: "star", fill: "#ff3070", x: 10, y: 10, w: 100, h: 100, text: "" },
      { id: "l", kind: "line", x: 0, y: 0, w: 100, h: 0, x1: 100, y1: 0, x2: 0, y2: 0, end: "arrow" },
    ] };
    const parts = await unzip(await exportPptx(file, { chartPng: async () => null }));
    for (const name of ["[Content_Types].xml", "ppt/presentation.xml", "ppt/slides/slide1.xml", "ppt/notesSlides/notesSlide1.xml", "ppt/slideMasters/slideMaster1.xml", "ppt/theme/theme1.xml"]) expect(parts.has(name)).toBe(true);
    const slide = new TextDecoder().decode(parts.get("ppt/slides/slide1.xml"));
    expect(slide).toContain("Hola &lt;mundo&gt;");
    expect(slide).toContain('prst="star5"');
    expect(slide).toContain('flipH="1"');
    expect(slide).toContain('<a:tailEnd type="triangle"/>');
    expect(new TextDecoder().decode(parts.get("ppt/notesSlides/notesSlide1.xml"))).toContain("Nota");
    expect(new TextDecoder().decode(parts.get("ppt/presentation.xml"))).toContain('cx="9144000" cy="5143500"');
  });
});
