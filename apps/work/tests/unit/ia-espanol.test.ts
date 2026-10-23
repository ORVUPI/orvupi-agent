import { describe, expect, it } from "vitest";
import { checkFaithful, extractSentences, faithfulSentences, keyTerms, relevantSentences, splitSentences, tidySentence } from "../../src/ai/extractive";
import { bulletsOf, hybridAsk, hybridExplain, hybridOutline, hybridSummary, paragraphChunks, rewriteOk, translationOk, type Generate } from "../../src/ai/hybrid";

const TEXT = `La fotosíntesis es el proceso por el que las plantas transforman la luz solar en energía química. Las plantas captan dióxido de carbono del aire y agua del suelo.

En los cloroplastos, la clorofila absorbe la luz y con esa energía se fabrica glucosa. Como resultado de la fotosíntesis, las plantas liberan oxígeno a la atmósfera.

Cada año los organismos fotosintéticos fijan unos 100 000 millones de toneladas de carbono. Sin la fotosíntesis no existiría el oxígeno que respiran la mayoría de los seres vivos. Según el art. 3 del informe, la fotosíntesis también regula el clima del planeta.`;

const silent: Generate = async () => null;

describe("ORVUPI AI en español: extracción determinista", () => {
  it("divide en frases sin cortar abreviaturas ni números", () => {
    const s = splitSentences("Según el art. 14 de la Ley, en EE. UU. hay 1.500 casos. El Sr. Gómez lo explicó ayer. Fin del texto aquí.").map((x) => x.text);
    expect(s).toEqual(["Según el art. 14 de la Ley, en EE. UU. hay 1.500 casos.", "El Sr. Gómez lo explicó ayer.", "Fin del texto aquí."]);
  });

  it("elige frases del propio texto, en su orden, sin repetir y con la frase inicial", () => {
    const picked = extractSentences(TEXT, 3);
    expect(picked).toHaveLength(3);
    expect(picked[0]!.text).toMatch(/^La fotosíntesis es el proceso/);
    for (const p of picked) expect(TEXT).toContain(p.text);
    expect(picked.map((p) => p.index)).toEqual([...picked.map((p) => p.index)].sort((a, b) => a - b));
  });

  it("saca los términos clave", () => {
    expect(keyTerms(TEXT, 5).map((t) => t.toLowerCase())).toContain("fotosíntesis");
  });

  it("encuentra las frases que responden a una pregunta", () => {
    const r = relevantSentences(TEXT, "¿Qué liberan las plantas?", 2);
    expect(r.best).toBeGreaterThan(0);
    expect(r.sentences.map((s) => s.text).join(" ")).toMatch(/oxígeno/);
    expect(relevantSentences(TEXT, "¿Quién ganó el mundial de fútbol?", 2).best).toBe(0);
  });

  it("detecta lo inventado, lo que está en otro idioma y las cifras ajenas", () => {
    expect(checkFaithful("Las plantas transforman la luz solar en energía química y liberan oxígeno.", TEXT).ok).toBe(true);
    expect(checkFaithful("The plants are very green and they like the sun in the summer.", TEXT).ok).toBe(false);
    expect(checkFaithful("Los dinosaurios inventaron la electricidad en tiempos remotos con cohetes.", TEXT).ok).toBe(false);
    const f = faithfulSentences("Las plantas liberan oxígeno a la atmósfera. Las plantas fijan 5 toneladas de carbono cada año.", TEXT, { maxNovel: 0.3, minSupport: 0.4 });
    expect(f.kept).toEqual(["Las plantas liberan oxígeno a la atmósfera."]);
  });

  it("acorta frases largas en una pausa", () => {
    const long = `Además, ${"la energía solar crece cada año en España, ".repeat(10)}y sigue.`;
    const t = tidySentence(long, 120);
    expect(t.length).toBeLessThanOrEqual(121);
    expect(t.startsWith("La energía")).toBe(true);
    expect(t.endsWith("…")).toBe(true);
  });
});

describe("ORVUPI AI en español: modelo + comprobación con el original", () => {
  it("resumen: si el modelo da basura, usa las frases del texto (fiel y coherente)", async () => {
    const r = await hybridSummary(TEXT, async () => "- The cat is on the table and very happy today.\n- Lorem ipsum dolor sit amet.");
    expect(r.mode).toBe("extractive");
    const bullets = bulletsOf(r.markdown);
    expect(bullets.length).toBe(3);
    for (const b of bullets) expect(checkFaithful(b, TEXT).novelRatio).toBeLessThan(0.1);
    expect(r.markdown).toMatch(/## Términos clave/);
  });

  it("resumen: acepta la redacción del modelo cuando se apoya en el texto y sustituye la que no", async () => {
    const gen: Generate = async () => "- La fotosíntesis transforma la luz solar en energía química en las plantas.\n- Los marcianos fabrican glucosa en Júpiter con cohetes.\n- Los organismos fotosintéticos fijan cada año unos 100 000 millones de toneladas de carbono.";
    const r = await hybridSummary(TEXT, gen);
    expect(r.mode).toBe("mixed");
    expect(r.markdown).toContain("La fotosíntesis transforma la luz solar en energía química en las plantas.");
    expect(r.markdown).not.toMatch(/marcianos/);
  });

  it("explicar, preguntar y esquema funcionan aunque el modelo no responda", async () => {
    const e = await hybridExplain(TEXT, silent);
    expect(e.mode).toBe("extractive");
    expect(e.markdown).toMatch(/En pocas palabras/);
    const a = await hybridAsk(TEXT, "¿Qué liberan las plantas?", silent);
    expect(a.markdown).toMatch(/oxígeno/);
    const none = await hybridAsk(TEXT, "¿Quién ganó el mundial de fútbol?", silent);
    expect(none.answer).toMatch(/no parece tratar/);
    const o = await hybridOutline(TEXT, silent);
    expect(o.markdown).toMatch(/^## 1\. /);
    expect(o.markdown).toMatch(/### 1\.1\. /);
  });

  it("preguntar: acepta una respuesta fiel del modelo", async () => {
    const a = await hybridAsk(TEXT, "¿Qué liberan las plantas?", async () => "Las plantas liberan oxígeno a la atmósfera como resultado de la fotosíntesis.");
    expect(a.mode).toBe("model");
    expect(a.answer).toMatch(/^Las plantas liberan oxígeno/);
  });

  it("reescribir y traducir: trozos cortos y comprobación del resultado", () => {
    const chunks = paragraphChunks(`${TEXT}\n\n${TEXT}\n\n${TEXT}`, 900);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(900);
    const p = "Las plantas captan dióxido de carbono del aire y agua del suelo para hacer la fotosíntesis.";
    expect(rewriteOk("Para hacer la fotosíntesis, las plantas captan dióxido de carbono del aire y agua del suelo.", p)).toBe(true);
    expect(rewriteOk("Los coches eléctricos son rápidos y modernos en todas las ciudades.", p)).toBe(false);
    expect(translationOk("Plants take carbon dioxide from the air and water from the soil to carry out photosynthesis.", p, false)).toBe(true);
    expect(translationOk(p, p, false)).toBe(false);
  });
});
