import { describe, expect, it } from "vitest";
import { bootCandidates, modelChain, probeOk, AI_MODELS, type AiSupport } from "../../src/ai/engine";
import { wasmThreadCount } from "../../src/ai/runtime";
import { analyzeText, fallbackQuestion, hybridAnalyze, hybridGenerate, hybridQuestions, parseRequest, type Generate } from "../../src/ai/hybrid";
import { markdownToNodes, parseMarkdown, PAGE_BREAK } from "../../src/ai/markdown";

const TEXT = `La fotosíntesis es el proceso por el que las plantas transforman la luz solar en energía química. Las plantas captan dióxido de carbono del aire y agua del suelo.

En los cloroplastos, la clorofila absorbe la luz y con esa energía se fabrica glucosa. Como resultado de la fotosíntesis, las plantas liberan oxígeno a la atmósfera.

En 1779 se descubrió que las plantas necesitan luz para producir oxígeno. Sin la fotosíntesis no existiría el oxígeno que respiran la mayoría de los seres vivos.`;

const desk: AiSupport = { webgpu: true, f16: true, wasm: true, memoryGb: 8, mobile: false };
const phone: AiSupport = { webgpu: false, f16: false, wasm: true, memoryGb: 4, mobile: true };

describe("ORVUPI AI: elección automática del modo", () => {
  it("prueba WebGPU, luego WASM y después otro modelo, y deja al final lo que falló", () => {
    expect(modelChain(desk).map((m) => m.id)).toEqual(["qwen05-gpu", "qwen05-cpu", "smol135-cpu", "lfm350-gpu32"]);
    expect(modelChain(desk, { device: "", bad: { "qwen05-gpu": Date.now() } }).map((m) => m.id)).toEqual(["qwen05-cpu", "smol135-cpu", "lfm350-gpu32", "qwen05-gpu"]);
    expect(modelChain(desk, { device: "", good: "qwen05-cpu", bad: {} })[0]!.id).toBe("qwen05-cpu");
    expect(modelChain({ ...desk, webgpu: false, f16: false }).map((m) => m.id)).toEqual(["qwen05-cpu", "smol135-cpu"]);
    // Sin fp16 el WebGPU que sí puede correr va antes que WASM
    expect(modelChain({ ...desk, f16: false }).map((m) => m.id)).toEqual(["lfm350-gpu32", "qwen05-cpu", "smol135-cpu"]);
    // Móvil: LFM2 solo con WebGPU (el motor WASM no tiene GatherBlockQuantized); sin GPU, SmolLM2 por WASM
    expect(modelChain(phone).map((m) => m.id)).toEqual(["smol135-cpu"]);
    expect(modelChain({ ...phone, webgpu: true, f16: true }).map((m) => m.id)).toEqual(["lfm350-gpu", "smol135-cpu", "lfm350-gpu32"]);
    expect(modelChain({ ...phone, memoryGb: 2 })[0]!.id).toBe("smol135-cpu");
    // Los modelos grandes nunca se eligen solos
    expect(modelChain(desk).some((m) => m.id.startsWith("qwen15"))).toBe(false);
    expect(AI_MODELS.some((m) => m.id === "qwen15-gpu")).toBe(true);
  });

  it("si WebGPU ya está descargado y falla, el siguiente es WASM u otro modelo ya descargado", () => {
    const onlyGpu = bootCandidates(desk, { device: "", bad: {} }, ["qwen05-gpu"]).map((m) => m.id);
    expect(onlyGpu[0]).toBe("qwen05-gpu");
    expect(onlyGpu[1]).toBe("qwen05-cpu");
    const gpuAndSmol = bootCandidates(desk, { device: "", bad: {} }, ["qwen05-gpu", "smol135-cpu"]).map((m) => m.id);
    expect(gpuAndSmol.slice(0, 2)).toEqual(["qwen05-gpu", "smol135-cpu"]);
    // «Usar este modelo» arranca por el elegido y, si no genera, sigue con el resto
    const picked = bootCandidates(desk, { device: "", bad: {} }, ["qwen05-gpu"], "qwen05-gpu").map((m) => m.id);
    expect(picked[0]).toBe("qwen05-gpu");
    expect(picked).toContain("qwen05-cpu");
    expect(bootCandidates(desk, { device: "", bad: {} }, [], "qwen15-gpu")[0]!.id).toBe("qwen15-gpu");
  });

  it("sin aislamiento de origen WASM usa un solo hilo, para poder arrancar", () => {
    expect(wasmThreadCount(8, false)).toBe(1);
    expect(wasmThreadCount(8, true)).toBe(4);
    expect(wasmThreadCount(2, true)).toBe(1);
  });

  it("la prueba corta detecta «!!!!» (logits NaN en fp16 → token 0, que en Qwen es «!»)", () => {
    expect(probeOk("!!!!!!!!")).toBe(false);
    expect(probeOk("")).toBe(false);
    expect(probeOk("El cielo es azul.")).toBe(true);
  });
});

describe("ORVUPI AI: funciones nuevas", () => {
  it("entiende peticiones en lenguaje natural, incluida la exportación", () => {
    expect(parseRequest("Resume este documento y créame un DOCX")).toEqual({ action: "summarize", export: "docx", language: undefined });
    expect(parseRequest("Tradúcelo al francés en PDF")).toMatchObject({ action: "translate", language: "francés", export: "pdf" });
    expect(parseRequest("Haz 5 preguntas tipo test").action).toBe("questions");
    expect(parseRequest("Analiza la legibilidad").action).toBe("analyze");
    expect(parseRequest("Escribe una introducción sobre la fotosíntesis").action).toBe("generate");
    expect(parseRequest("¿Qué liberan las plantas?").action).toBe("ask");
    expect(parseRequest("Hazme un esquema").action).toBe("outline");
  });

  it("analizar: datos, legibilidad y tabla calculados del texto", async () => {
    const a = analyzeText(TEXT);
    expect(a.words).toBeGreaterThan(60);
    expect(a.sentences).toBe(6);
    const r = await hybridAnalyze(TEXT);
    expect(r.markdown).toMatch(/\| Legibilidad \(Fernández Huerta\) \|/);
    const blocks = parseMarkdown(r.markdown);
    expect(blocks.some((b) => b.type === "table")).toBe(true);
  });

  it("preguntas: si el modelo no ayuda, se construyen de las frases y llevan su respuesta", async () => {
    const r = await hybridQuestions(TEXT, async () => null);
    expect(r.mode).toBe("extractive");
    const lines = r.markdown.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const l of lines) expect(l).toMatch(/^\d+\. \*\*¿.+\?\*\* \*Respuesta:\* .+/);
    expect(fallbackQuestion("La fotosíntesis es el proceso por el que las plantas transforman la luz.", [])).toBe("¿Qué es la fotosíntesis?");
    expect(fallbackQuestion("En 1779 se descubrió que las plantas necesitan luz.", [])).toBe("¿Qué ocurrió en 1779 según el texto?");
  });

  it("preguntas: acepta las del modelo que se apoyan en su frase", async () => {
    const gen: Generate = async () => "1. ¿Qué transforman las plantas en la fotosíntesis?\n2. ¿Qué captan las plantas del aire?\n3. ¿Quién ganó la liga?";
    const r = await hybridQuestions(TEXT, gen);
    expect(r.fromModel).toBeGreaterThanOrEqual(1);
    expect(r.markdown).not.toMatch(/liga/);
  });

  it("generar contenido: quita repeticiones, cifras inventadas y la frase final a medias; rechaza basura", async () => {
    const gen: Generate = async () => "## Introducción\nLa fotosíntesis permite a las plantas vivir.\nLa fotosíntesis permite a las plantas vivir.\nProduce 5000 toneladas de oxígeno al día.\nEs un proceso esencial para la vida y";
    const r = await hybridGenerate("Escribe una introducción", TEXT, gen);
    expect(r.markdown).toBe("## Introducción\nLa fotosíntesis permite a las plantas vivir.");
    await expect(hybridGenerate("Escribe algo", TEXT, async () => "!!!!!!!!!!!!!!!!!!!!")).rejects.toThrow();
  });

  it("el markdown admite tablas y saltos de página y pasan al documento", () => {
    const nodes = markdownToNodes(`| A | B |\n|---|---|\n| 1 | **2** |\n\n${PAGE_BREAK}\n\nFin`);
    expect(nodes[0]!.type).toBe("table");
    expect(nodes[0]!.content![0]!.content![0]!.type).toBe("tableHeader");
    expect(nodes[0]!.content![1]!.content![1]!.type).toBe("tableCell");
    expect(nodes[1]!.type).toBe("pageBreak");
    expect(nodes[2]!.type).toBe("paragraph");
  });
});
