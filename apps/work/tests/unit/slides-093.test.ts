// @vitest-environment jsdom
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSlidesFile, parseSlides, serializeSlides, type SlidesFile } from "../../src/slides/model";
import { exportPptx, importPptx } from "../../src/slides/pptx";
import { againstBase, normalize, parasHtml, plainOf, readEditor, stripStyle } from "../../src/slides/rich";
import { unzip } from "../../src/sheets/zip";
import { decodeUtf8 } from "../../src/security/bytes";

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
// mp4 mínimo (cabecera ftyp): basta para comprobar que viaja incrustado
const MP4 = `data:video/mp4;base64,${btoa("\u0000\u0000\u0000\u0018ftypmp42\u0000\u0000\u0000\u0000mp42isom")}`;

function sample(): SlidesFile {
  const file = createSlidesFile({ id: "r", title: "Rico" });
  const s = file.slides[0]!;
  s.items = [
    { id: "t1", kind: "text", x: 40, y: 40, w: 600, h: 100, text: "Hola mundo bonito", size: 30, rich: [[{ t: "Hola " }, { t: "mundo", b: true, color: "#ff3070" }, { t: " bonito", i: true, size: 40, link: "https://orvupi.com" }]] },
    { id: "c1", kind: "chart", x: 40, y: 160, w: 400, h: 300, chart: "column", labels: ["Ene", "Feb", "Mar"], values: [3, 5, 8], title: "Ventas", color: "#1d4e89" },
    { id: "c2", kind: "chart", x: 460, y: 160, w: 300, h: 300, chart: "pie", labels: ["A", "B"], values: [60, 40] },
    { id: "v1", kind: "video", x: 600, y: 20, w: 320, h: 180, src: "", youtube: "dQw4w9WgXcQ" },
    { id: "v2", kind: "video", x: 600, y: 300, w: 320, h: 180, src: MP4 },
  ];
  return file;
}

describe("Presentaciones 0.9.3", () => {
  it("lee el editor como párrafos con tramos y lo vuelve a escribir igual", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div>Hola <span style="font-weight: bold;">mundo</span></div><div><i>dos</i> <a href="https://orvupi.com">enlace</a></div><div><br></div>';
    const paras = readEditor(root);
    expect(plainOf(paras)).toBe("Hola mundo\ndos enlace\n");
    expect(paras[0]).toEqual([{ t: "Hola " }, { t: "mundo", b: true }]);
    expect(paras[1]![0]).toEqual({ t: "dos", i: true });
    expect(paras[1]![2]).toEqual({ t: "enlace", link: "https://orvupi.com" });
    const again = document.createElement("div");
    again.innerHTML = parasHtml(paras);
    expect(readEditor(again)).toEqual(paras);
  });

  it("no guarda lo que ya hereda del cuadro y quita el formato al aplicarlo a todo", () => {
    const paras = againstBase([[{ t: "a", b: true, size: 18 }, { t: "b", b: false }]], { bold: true, baseSize: 18 });
    expect(paras).toEqual([[{ t: "a" }, { t: "b", b: false }]]);
    expect(stripStyle([[{ t: "x", b: true }, { t: "y" }]], ["b"])).toBeUndefined();
    expect(normalize([[{ t: "a", b: true }, { t: "b", b: true }]])).toEqual([[{ t: "ab", b: true }]]);
  });

  it("el formato por palabras se guarda y se limpia al abrir", () => {
    const file = sample();
    const back = parseSlides(serializeSlides(file));
    const t = back.slides[0]!.items[0]!;
    expect(t.kind === "text" && t.rich?.[0]?.[1]).toEqual({ t: "mundo", b: true, color: "#ff3070" });
    // si el texto plano no cuadra con los tramos, se descartan
    const bad = JSON.parse(decodeUtf8(serializeSlides(file) as unknown as Uint8Array));
    bad.slides[0].items[0].text = "otro";
    const t2 = parseSlides(JSON.stringify(bad)).slides[0]!.items[0]!;
    expect(t2.kind === "text" && t2.rich).toBeUndefined();
  });

  it("PPTX: gráfico nativo con hoja de datos, vídeo en línea e incrustado, y texto con formato por palabras", async () => {
    const bytes = await exportPptx(sample(), { chartPng: async () => PNG });
    if (process.env.PPTX_OUT) writeFileSync(process.env.PPTX_OUT, bytes);
    const files = await unzip(bytes);
    const names = [...files.keys()];
    expect(names).toContain("ppt/charts/chart1.xml");
    expect(names).toContain("ppt/charts/chart2.xml");
    expect(names.some((n) => /^ppt\/embeddings\/.+\.xlsx$/.test(n))).toBe(true);
    expect(names.some((n) => /^ppt\/media\/.+\.mp4$/.test(n))).toBe(true);
    const slide = decodeUtf8(files.get("ppt/slides/slide1.xml")!);
    expect(slide).toContain("drawingml/2006/chart");
    expect(slide).toContain("<a:videoFile");
    const rels = decodeUtf8(files.get("ppt/slides/_rels/slide1.xml.rels")!);
    expect(rels).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(decodeUtf8(files.get("[Content_Types].xml")!)).toContain("drawingml.chart+xml");

    const { slides } = await importPptx(bytes);
    const items = slides[0]!.items;
    const text = items.find((i) => i.kind === "text");
    expect(text && text.kind === "text" && text.text).toBe("Hola mundo bonito");
    const runs = text && text.kind === "text" ? text.rich?.[0] : undefined;
    expect(runs?.find((r) => r.t === "mundo")).toMatchObject({ b: true, color: "#ff3070" });
    expect(runs?.find((r) => r.t === " bonito")).toMatchObject({ i: true, size: 40, link: "https://orvupi.com" });
    const charts = items.filter((i) => i.kind === "chart");
    expect(charts).toHaveLength(2);
    expect(charts[0]).toMatchObject({ chart: "column", labels: ["Ene", "Feb", "Mar"], values: [3, 5, 8], title: "Ventas", color: "#1d4e89" });
    expect(charts[1]).toMatchObject({ chart: "pie", values: [60, 40] });
    const videos = items.filter((i) => i.kind === "video");
    expect(videos.find((v) => v.kind === "video" && v.youtube === "dQw4w9WgXcQ")).toBeTruthy();
    expect(videos.find((v) => v.kind === "video" && v.src.startsWith("data:video/mp4;base64,"))).toBeTruthy();
  });
});
