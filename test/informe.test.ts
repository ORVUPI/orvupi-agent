import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const LEGACY_MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const WHEN = "2026-10-11T10:18:00.000Z";
const ABSENT_FROM_FILE = [
  "Cripto de alto riesgo",
  "Puedes perderlo todo",
  "No es consejo de inversión",
  "High-risk crypto",
  "You could lose everything",
  "Not investment advice",
  "Imagen generada con IA",
  "AI-generated",
  "no oficial",
  "No oficial",
  "not official",
  "unofficial",
];

function assertAbsent(text: string) {
  for (const phrase of ABSENT_FROM_FILE) assert.equal(text.includes(phrase), false, phrase);
}

function assertTitleStaysWithFirstCard(plan: PageSlice[], kept: KeptSpan[]) {
  assert.ok(kept.length > 0);
  for (const span of kept) {
    const holders = plan.filter((page) => span.top < page.bodyBottom && span.headingBottom > page.bodyTop);
    assert.equal(holders.length, 1, `${span.top}-${span.bottom}`);
    const holder = holders[0];
    assert.ok(holder);
    assert.ok(span.top >= holder.bodyTop && span.bottom <= holder.bodyBottom);
    assert.equal(plan.some((page) => page.bodyBottom > span.top && page.bodyBottom < span.bottom), false);
  }
}

type KeptSpan = { top: number; headingBottom: number; bottom: number };
type PageSlice = { bodyTop: number; bodyBottom: number };
type Line = { title: string; lead: string; note: string };
type Block = { id: string; heading: string; lines: Line[]; empty: string; service: string };
type Model = {
  title: string;
  date: string;
  origin: string;
  warning: string;
  network: string;
  networkLabel: string;
  address: string;
  addressLabel: string;
  blocks: Block[];
  note: string;
  limitsLabel: string;
  limits: string[];
};

type ReportModule = {
  formatReportWhen: (value: string, lang: string) => string;
  reportPagePlan: (height: number, limitsTop: number, pageHeight?: number, warningHeight?: number, guides?: { headerBottom: number; breaks: number[]; cardEnds?: number[]; kept?: KeptSpan[] } | null) => Array<{ repeatLimits: boolean; repeatHeader: boolean; single: boolean; bodyBottom: number; bodyTop: number }>;
  sliceReportPages: (rgba: Uint8Array, width: number, height: number, limitsTop: number, pageHeight?: number, warning?: { top: number; bottom: number } | null, guides?: { headerBottom: number; breaks: number[]; cardEnds?: number[]; kept?: KeptSpan[] } | null) => Array<{ rgba: Uint8Array; width: number; height: number }>;
  reportCopy: (lang: string) => { pdfFail: string; title: string };
  canvasSafeText: (value: string, max?: number) => string;
  reportModel: (source: Record<string, unknown>, lang: string) => Model;
  reportPaintLines: (model: Model) => string[];
  drawReport: (ctx: object, model: Model, width?: number) => {
    width: number;
    height: number;
    limitsTop: number;
    warningTop: number;
    warningBottom: number;
    lines: Array<{ top: number; bottom: number; header: boolean; limits: boolean }>;
    cards: Array<{ top: number; bottom: number; header: boolean; limits: boolean }>;
    guides: { headerBottom: number; breaks: number[]; cardEnds?: number[]; kept?: KeptSpan[] };
  };
  pdfFromRgba: (rgba: Uint8Array, width: number, height: number) => Promise<Uint8Array>;
  isAndroid: (nav: { userAgent?: string }) => boolean;
  savePlan: (nav: { userAgent?: string; share?: unknown; canShare?: unknown }, file: File) => string;
  saveBlob: (blob: Blob, filename: string, nav: unknown, doc: unknown) => Promise<string>;
};

type SummaryModule = {
  summaryFromCard: (card: Record<string, unknown>) => Record<string, unknown>;
};

async function load() {
  const root = repoRoot();
  const report = (await import(pathToFileURL(path.join(root, "web/v2/shared/informe.js")).href)) as ReportModule;
  const summary = (await import(pathToFileURL(path.join(root, "web/v2/shared/reading-summary.js")).href)) as SummaryModule;
  return { report, summary };
}

function card(extra: Record<string, unknown>) {
  return {
    programStatus: "verificado",
    mintAuthority: { state: "revocada", status: "verificado" },
    freezeAuthority: { state: "revocada", status: "verificado" },
    supplyAccount: "7721704579000000",
    supplyRpc: "7721704579000000",
    supplyRpcStatus: "verificado",
    decimals: 6,
    name: { text: "USD Coin", status: "verificado" },
    symbol: { text: "USDC", status: "verificado" },
    uri: { text: null, status: "ausente" },
    metadataMutable: "si",
    extensionsStatus: "no_aplica",
    extensions: [],
    curve: { status: "no_aplica", present: false },
    largestStatus: "ok",
    ...extra,
  };
}

function joined(model: Model, id: string) {
  const block = model.blocks.find((item) => item.id === id);
  assert.ok(block, id);
  return [block.heading, block.empty, block.service, ...block.lines.flatMap((item) => [item.title, item.lead, item.note])].join("\n");
}

function mockCtx() {
  const calls: Array<{ op: string; text?: string; fillStyle?: string; font?: string }> = [];
  const ctx = {
    canvas: { width: 0, height: 0 },
    fillStyle: "",
    strokeStyle: "",
    font: "16px sans-serif",
    lineWidth: 1,
    textBaseline: "alphabetic",
    measureText(text: string) {
      const size = Number(/(\d+)px/.exec(this.font)?.[1] || 16);
      return { width: Array.from(String(text)).length * size * 0.45 };
    },
    fillRect() {
      calls.push({ op: "fillRect", fillStyle: this.fillStyle });
    },
    strokeRect() {},
    fillText(text: string) {
      calls.push({ op: "fillText", text, fillStyle: this.fillStyle, font: this.font });
    },
  };
  return { ctx, calls };
}

describe("informe descargable", () => {
  test("la ficha lleva fecha, red, dirección, resumen y límites, sin pie de riesgo", async () => {
    const { report, summary } = await load();
    const usdc = card({
      mint: USDC,
      mintAuthority: { state: "activa", status: "verificado" },
      freezeAuthority: { state: "activa", status: "verificado" },
    });
    const model = report.reportModel({
      summary: summary.summaryFromCard(usdc),
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.equal(model.title, "Lectura de Verify · no es un certificado");
    assert.match(model.date, /Consultado el /);
    assert.match(model.date, /11-10-2026 12:18:00/);
    assert.match(model.date, /hora de Madrid/);
    assert.match(model.date, /puede haber cambiado/);
    const zone = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "long",
    }).formatToParts(new Date(WHEN)).find((part) => part.type === "timeZoneName")?.value;
    assert.ok(zone);
    assert.equal(model.date.includes(zone), true);
    assert.equal(model.origin, "Generado en orvupi.com · herramienta para tokens de terceros");
    assert.equal(model.network, "Solana mainnet");
    assert.equal(model.address, USDC);
    assert.deepEqual(model.blocks.map((item) => item.heading), ["Qué se comprobó", "Qué requiere atención", "Qué falta"]);
    assert.match(joined(model, "comprobado"), /Dice llamarse «USD Coin» \(«USDC»\)/);
    assert.equal(joined(model, "comprobado").includes("7.721.704.579 USDC"), false);
    assert.match(joined(model, "comprobado"), /7\.721\.704\.579 tokens/);
    assert.match(joined(model, "atencion"), /Permiso de emisión/);
    assert.match(model.note, /Curva de Pump.fun: no aplica/);
    assert.equal(model.limitsLabel, "Límites");
    assert.deepEqual(model.limits, [
      "Es una lectura de datos públicos en el momento indicado. Puede haber cambiado.",
      "No es una auditoría, ni un aval, ni una recomendación.",
      "Lo que no se pudo leer no aparece como comprobado.",
      "Que no aparezcan señales no significa que esté todo comprobado.",
    ]);
    assertAbsent(report.reportPaintLines(model).join("\n"));
    const english = report.reportModel({
      summary: summary.summaryFromCard(usdc),
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "en");
    assert.equal(english.title, "Verify reading · not a certificate");
    assert.equal(english.network, "Solana mainnet");
    assert.equal(english.networkLabel, "Network");
    assert.equal(english.addressLabel, "Address");
    assert.match(english.date, /Checked on /);
    assert.match(english.date, /11-10-2026 12:18:00/);
    assert.match(english.date, /Madrid time/);
    const englishZone = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "long",
    }).formatToParts(new Date(WHEN)).find((part) => part.type === "timeZoneName")?.value;
    assert.ok(englishZone);
    assert.equal(english.date.includes(englishZone), true);
    assert.equal(english.origin, "Made on orvupi.com · not affiliated with third-party tokens");
    assert.deepEqual(english.limits, [
      "It is a reading of public data at the time stated. It may have changed.",
      "It is not an audit, an endorsement, or a recommendation.",
      "What could not be read does not appear as checked.",
      "No signals showing does not mean everything was checked.",
    ]);
    assertAbsent(report.reportPaintLines(english).join("\n"));
    assert.match(joined(english, "comprobado"), /It says it is called \u201CUSD Coin\u201D \(\u201CUSDC\u201D\)/);
    assert.equal(joined(english, "comprobado").includes("«"), false);
    assert.equal(joined(model, "falta").includes("Curva de Pump.fun"), false);
    assert.equal(joined(english, "falta").includes("Pump.fun curve"), false);
  });

  test("un clon conserva el aviso y no usa su símbolo como unidad", async () => {
    const { report, summary } = await load();
    const model = report.reportModel({
      summary: summary.summaryFromCard(card({
        mint: CLONE,
        name: { text: "ORVUPI", status: "verificado" },
        symbol: { text: "ORVUPI", status: "verificado" },
        supplyAccount: "1000000000000000",
        supplyRpc: "1000000000000000",
        metadataMutable: "no",
        curve: { status: "ok", present: true },
      })),
      mint: CLONE,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    const checked = joined(model, "comprobado");
    const attention = joined(model, "atencion");
    assert.match(checked, /Dice llamarse «ORVUPI»/);
    const lines = report.reportPaintLines(model);
    const warningAt = lines.findIndex((line) => line.includes("Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato"));
    const networkAt = lines.findIndex((line) => line === "Red");
    const checkedAt = lines.findIndex((line) => line === "Qué se comprobó");
    assert.ok(warningAt > 0);
    assert.ok(warningAt < networkAt);
    assert.ok(warningAt < checkedAt);
    assert.equal(lines[warningAt - 1]?.includes("Consultado el"), true);
    const attentionBlock = model.blocks.find((item) => item.id === "atencion");
    assert.ok(attentionBlock);
    assert.match(attentionBlock.lines[0]?.lead || "", /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    assert.match(attention, /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    const ordered = report.reportModel({
      summary: {
        blocks: [{
          id: "atencion",
          heading: { es: "Qué requiere atención", en: "What needs attention" },
          items: [
            {
              title: { es: "Comprobación anterior", en: "Earlier check" },
              lead: { es: "Es la ficha del 2026-10-09, no un dato de esta lectura.", en: "It is the 2026-10-09 card, not a fact from this reading." },
            },
            {
              title: { es: "Dirección", en: "Address" },
              lead: { es: "Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato.", en: "It is named like ORVUPI, but ORVUPI does not have a contract yet." },
            },
          ],
          empty: { es: "", en: "" },
        }],
      },
      mint: CLONE,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    const orderedAttention = ordered.blocks.find((item) => item.id === "atencion");
    assert.match(ordered.warning, /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    assert.match(orderedAttention?.lines[0]?.lead || "", /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    assert.match(orderedAttention?.lines[1]?.lead || "", /2026-10-09/);
    assert.equal(/\d{2}:\d{2}:\d{2}/.test(orderedAttention?.lines[1]?.lead || ""), false);
    const dropped = report.reportModel({
      summary: {
        blocks: [{
          id: "atencion",
          heading: { es: "Qué requiere atención", en: "What needs attention" },
          items: [{
            title: { es: "Comprobación anterior", en: "Earlier check" },
            lead: { es: "Es una ficha guardada de antes, no un dato de esta lectura.", en: "It is a card saved earlier, not a fact from this reading." },
          }],
          empty: { es: "Ninguna señal de esta lectura pide atención. Que no aparezcan señales no significa que esté todo comprobado.", en: "No signal." },
        }],
      },
      mint: CLONE,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.equal(joined(dropped, "atencion").includes("Comprobación anterior"), false);
    assert.match(joined(dropped, "atencion"), /Ninguna señal de esta lectura pide atención/);
    assert.equal(checked.includes("1.000.000.000 ORVUPI"), false);
    assert.match(checked, /1\.000\.000\.000 tokens/);
    assertAbsent(lines.join("\n"));
    assertAbsent(report.reportPaintLines(ordered).join("\n"));
    assert.equal(model.address, CLONE);
    const drawn = report.drawReport(mockCtx().ctx, model, 840);
    assert.ok(drawn.warningBottom > drawn.warningTop);
    assert.ok(drawn.warningTop < drawn.limitsTop);
  });

  test("un dato que falla no queda en lo comprobado", async () => {
    const { report } = await load();
    const model = report.reportModel({
      summary: {
        blocks: [
          {
            id: "comprobado",
            heading: { es: "Qué se comprobó", en: "What was checked" },
            items: [{
              title: { es: "Suministro total", en: "Total supply" },
              lead: { es: "No se pudo leer la cantidad de tokens.", en: "The token amount could not be read." },
            }],
            empty: { es: "Ningún dato quedó leído en esta consulta.", en: "No fact was read in this query." },
          },
          {
            id: "atencion",
            heading: { es: "Qué requiere atención", en: "What needs attention" },
            items: [],
            empty: { es: "Ninguna señal de esta lectura pide atención. Que no aparezcan señales no significa que esté todo comprobado.", en: "No signal." },
          },
          {
            id: "falta",
            heading: { es: "Qué falta", en: "What is missing" },
            items: [],
            empty: { es: "No falta ningún dato pedido en esta lectura.", en: "Nothing missing." },
          },
        ],
      },
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.equal(joined(model, "comprobado").includes("No se pudo"), false);
    assert.match(joined(model, "comprobado"), /Ningún dato quedó leído/);
    assert.match(joined(model, "falta"), /No se pudo leer la cantidad de tokens/);
    const english = report.reportModel({
      summary: {
        blocks: [
          {
            id: "comprobado",
            heading: { es: "Qué se comprobó", en: "What was checked" },
            items: [{
              title: { es: "Permiso", en: "Permission" },
              lead: { es: "revocada · verificado", en: "revoked · verified" },
            }],
            empty: { es: "Ningún dato quedó leído en esta consulta.", en: "No fact was read in this query." },
          },
          {
            id: "atencion",
            heading: { es: "Qué requiere atención", en: "What needs attention" },
            items: [],
            empty: { es: "Ninguna señal de esta lectura pide atención. Que no aparezcan señales no significa que esté todo comprobado.", en: "No signal." },
          },
          {
            id: "falta",
            heading: { es: "Qué falta", en: "What is missing" },
            items: [],
            empty: { es: "No falta ningún dato pedido en esta lectura.", en: "Nothing missing." },
          },
        ],
      },
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "en");
    assert.match(joined(english, "atencion"), /No signal in this reading needs attention\. No signals showing does not mean everything was checked\./);
    assert.equal(joined(english, "atencion").includes("No signal."), false);
    assert.match(joined(english, "falta"), /No requested fact is missing from this reading\./);
    assert.equal(joined(english, "falta").includes("Nothing missing."), false);
    assert.match(joined(english, "comprobado"), /revoked · read on-chain/);
    assert.equal(joined(english, "comprobado").includes("verified"), false);
    const spanishSeal = report.reportModel({
      summary: {
        blocks: [{
          id: "comprobado",
          heading: { es: "Qué se comprobó", en: "What was checked" },
          items: [{ title: { es: "Permiso", en: "Permission" }, lead: { es: "revocada · verificado", en: "revoked · verified" } }],
          empty: { es: "", en: "" },
        }],
      },
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.match(joined(spanishSeal, "comprobado"), /revocada · leído en la cadena/);
    assert.equal(joined(spanishSeal, "comprobado").includes("verificado"), false);
  });

  test("un token llamado verificado conserva el nombre, el símbolo y el resto de la cadena", async () => {
    const { report, summary } = await load();
    const named = card({
      mint: USDC,
      name: { text: "verificado", status: "verificado" },
      symbol: { text: "verified", status: "verificado" },
    });
    const source = {
      summary: summary.summaryFromCard(named),
      mint: "verificado",
      network: "verified",
      consultedAt: WHEN,
    };
    const model = report.reportModel(source, "es");
    const checked = joined(model, "comprobado");
    assert.match(checked, /Dice llamarse «verificado» \(«verified»\)/);
    assert.equal(checked.includes("leído en la cadena"), false);
    assert.equal(model.address, "verificado");
    assert.equal(model.network, "verified");
    const english = report.reportModel(source, "en");
    const englishChecked = joined(english, "comprobado");
    assert.match(englishChecked, /It says it is called \u201Cverificado\u201D \(\u201Cverified\u201D\)/);
    assert.equal(englishChecked.includes("«"), false);
    assert.equal(englishChecked.includes("read on-chain"), false);
    assert.equal(english.address, "verificado");
    assert.equal(english.network, "verified");
    const mixed = report.reportModel({
      summary: {
        blocks: [{
          id: "comprobado",
          heading: { es: "Qué se comprobó", en: "What was checked" },
          items: [
            {
              title: { es: "Nombre", en: "Name" },
              lead: { es: "Dice llamarse «verificado» («verified»).", en: "It says it is called «verificado» («verified»)." },
              note: { es: "dato de la cadena: verificado", en: "chain fact: verified" },
            },
            {
              title: { es: "Permiso", en: "Permission" },
              lead: { es: "revocada · verificado", en: "revoked · verified" },
            },
          ],
          empty: { es: "", en: "" },
        }],
      },
      mint: "verificado",
      network: "verified",
      consultedAt: WHEN,
    }, "es");
    const text = joined(mixed, "comprobado");
    assert.match(text, /Dice llamarse «verificado» \(«verified»\)/);
    assert.match(text, /dato de la cadena: verificado/);
    assert.match(text, /revocada · leído en la cadena/);
    assert.equal(/·\s*verificado/.test(text), false);
    const englishMixed = report.reportModel({
      summary: {
        blocks: [{
          id: "comprobado",
          heading: { es: "Qué se comprobó", en: "What was checked" },
          items: [
            {
              title: { es: "Nombre", en: "Name" },
              lead: { es: "Dice llamarse «verificado» («verified»).", en: "It says it is called «verificado» («verified»)." },
              note: { es: "dato de la cadena: verificado", en: "chain fact: verified" },
            },
            {
              title: { es: "Permiso", en: "Permission" },
              lead: { es: "revocada · verificado", en: "revoked · verified" },
            },
          ],
          empty: { es: "", en: "" },
        }],
      },
      mint: "verificado",
      network: "verified",
      consultedAt: WHEN,
    }, "en");
    const englishText = joined(englishMixed, "comprobado");
    assert.match(englishText, /It says it is called \u201Cverificado\u201D \(\u201Cverified\u201D\)/);
    assert.equal(englishText.includes("«"), false);
    assert.match(englishText, /chain fact: verified/);
    assert.match(englishText, /revoked · read on-chain/);
    assert.equal(/·\s*verified/i.test(englishText), false);
    const painted = report.reportPaintLines(mixed).join("\n");
    assert.match(painted, /«verificado»/);
    assert.match(painted, /«verified»/);
    assert.match(painted, /^verificado$/m);
    assert.match(painted, /^verified$/m);
    assert.equal(painted.includes("«leído en la cadena»"), false);
  });

  test("un bloque sin puntos no sale en blanco", async () => {
    const { report } = await load();
    const model = report.reportModel({
      summary: {
        blocks: [{
          id: "atencion",
          heading: { es: "Qué requiere atención", en: "What needs attention" },
          items: [],
          empty: { es: "", en: "" },
        }],
      },
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    const attention = joined(model, "atencion");
    assert.match(attention, /Nada que destacar en esta lectura/);
    assert.match(attention, /Que no aparezcan señales no significa que esté todo comprobado/);
    const block = model.blocks.find((item) => item.id === "atencion");
    assert.equal(block?.lines.length, 0);
    assert.ok((block?.empty.length ?? 0) > 0);
    const english = report.reportModel({
      summary: {
        blocks: [{
          id: "atencion",
          heading: { es: "Qué requiere atención", en: "What needs attention" },
          items: [],
          empty: { es: "", en: "" },
        }],
      },
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "en");
    assert.match(joined(english, "atencion"), /Nothing to highlight in this reading/);
    assert.match(joined(english, "atencion"), /No signals showing does not mean everything was checked/);
  });

  test("los fixtures conservan la cadena, separan la curva y ocupan varias páginas", async () => {
    const { report, summary } = await load();
    const read = (name: string) => JSON.parse(readFileSync(path.join(repoRoot(), "test/fixtures/informe", name), "utf8")) as Record<string, unknown>;
    const named = read("verificado.json");
    const namedModel = report.reportModel({
      summary: summary.summaryFromCard(named),
      mint: named.mint,
      network: "solana",
      consultedAt: named.consultedAt,
    }, "es");
    assert.match(joined(namedModel, "comprobado"), /Dice llamarse «verificado» \(«verified»\)/);
    assert.equal(joined(namedModel, "comprobado").includes("leído en la cadena"), false);
    assert.match(namedModel.date, /\d{2}:\d{2}:\d{2}/);
    const namedEnglish = report.reportModel({
      summary: summary.summaryFromCard(named),
      mint: named.mint,
      network: "solana",
      consultedAt: named.consultedAt,
    }, "en");
    assert.match(joined(namedEnglish, "comprobado"), /It says it is called \u201Cverificado\u201D \(\u201Cverified\u201D\)/);
    assert.equal(joined(namedEnglish, "comprobado").includes("«"), false);
    const marked = read("nombre-html.json");
    const markedModel = report.reportModel({
      summary: summary.summaryFromCard(marked),
      mint: marked.mint,
      network: "solana",
      consultedAt: marked.consultedAt,
    }, "es");
    assert.match(joined(markedModel, "comprobado"), /«A&B<i>»/);
    assert.equal(joined(markedModel, "comprobado").includes("&lt;"), false);
    assert.equal(joined(markedModel, "falta").includes("Curva de Pump.fun"), false);
    assert.match(markedModel.note, /Curva de Pump.fun: no aplica/);
    const markedEnglish = report.reportModel({
      summary: summary.summaryFromCard(marked),
      mint: marked.mint,
      network: "solana",
      consultedAt: marked.consultedAt,
    }, "en");
    assert.match(joined(markedEnglish, "comprobado"), /\u201CA&B<i>\u201D/);
    assert.equal(joined(markedEnglish, "falta").includes("Pump.fun curve"), false);
    assertAbsent(report.reportPaintLines(namedModel).join("\n"));
    assertAbsent(report.reportPaintLines(namedEnglish).join("\n"));
    assertAbsent(report.reportPaintLines(markedModel).join("\n"));
    assertAbsent(report.reportPaintLines(markedEnglish).join("\n"));
    const largo = read("largo.json");
    const longModel = report.reportModel(largo, "es");
    assert.match(longModel.date, /\d{2}:\d{2}:\d{2}/);
    assert.match(longModel.warning, /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    const longAttention = longModel.blocks.find((item) => item.id === "atencion");
    assert.match(longAttention?.lines[0]?.lead || "", /Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato/);
    assert.equal(joined(longModel, "falta").includes("Curva de Pump.fun"), false);
    assert.match(longModel.note, /Curva de Pump.fun: no aplica/);
    assertAbsent(report.reportPaintLines(longModel).join("\n"));
    const drawn = report.drawReport(mockCtx().ctx, longModel, 840);
    const warningHeight = Math.max(0, drawn.warningBottom - drawn.warningTop);
    const plan = report.reportPagePlan(drawn.height, drawn.limitsTop, 1500, warningHeight, drawn.guides);
    assert.ok(drawn.height > 1500);
    assert.ok(plan.length > 1);
    assert.equal(plan.every((page) => page.repeatLimits), true);
    assert.equal(plan.every((page) => page.repeatHeader), true);
    assert.equal(plan.some((page) => page.single), false);
    for (const line of drawn.lines) {
      if (line.header || line.limits) continue;
      const hits = plan.filter((page) => line.bottom > page.bodyTop && line.top < page.bodyBottom);
      assert.equal(hits.length, 1);
      const hit = hits[0];
      assert.ok(hit);
      assert.ok(line.top >= hit.bodyTop && line.bottom <= hit.bodyBottom);
    }
  });

  test("un informe de 6 páginas no parte ninguna línea", async () => {
    const { report } = await load();
    const items = Array.from({ length: 28 }, (_, index) => ({
      title: { es: `Suministro total ${index + 1}`, en: `Total supply ${index + 1}` },
      lead: { es: `Dato ${index + 1} leído en la cadena`, en: `Fact ${index + 1} read on-chain` },
      note: { es: "", en: "" },
    }));
    const model = report.reportModel({
      summary: {
        blocks: [
          {
            id: "comprobado",
            heading: { es: "Qué se comprobó", en: "What was checked" },
            items,
            empty: { es: "", en: "" },
          },
          {
            id: "atencion",
            heading: { es: "Qué requiere atención", en: "What needs attention" },
            items: [{
              title: { es: "Parecido", en: "Lookalike" },
              lead: { es: "Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato.", en: "It is named like ORVUPI, but ORVUPI does not have a contract yet." },
              note: { es: "", en: "" },
            }],
            empty: { es: "", en: "" },
          },
        ],
      },
      mint: CLONE,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.match(model.origin, /Generado en orvupi.com/);
    assert.match(model.warning, /todavía no tiene contrato/);
    const drawn = report.drawReport(mockCtx().ctx, model, 840);
    const foot = drawn.height - drawn.limitsTop;
    const bodyCards = drawn.cards.filter((item) => !item.header && !item.limits);
    const keptTall = Math.max(0, ...(drawn.guides.kept ?? []).map((span) => span.bottom - span.top));
    const tallest = Math.max(keptTall, ...bodyCards.map((item) => item.bottom - item.top));
    assert.ok(drawn.warningBottom <= drawn.guides.headerBottom);
    assert.ok(drawn.guides.headerBottom < drawn.limitsTop);
    let found: { pageHeight: number; plan: Array<{ bodyTop: number; bodyBottom: number; single: boolean; repeatHeader: boolean; repeatLimits: boolean }> } | null = null;
    const minPage = drawn.guides.headerBottom + foot + tallest + 16;
    for (let pageHeight = minPage; pageHeight < drawn.height; pageHeight += 8) {
      const plan = report.reportPagePlan(drawn.height, drawn.limitsTop, pageHeight, drawn.warningBottom - drawn.warningTop, drawn.guides);
      if (plan.length === 6) {
        found = { pageHeight, plan };
        break;
      }
      if (plan.length < 6) break;
    }
    if (!found) throw new Error("no hubo un alto de página que dejara 6 páginas");
    const plan = found.plan;
    const firstPage = plan[0];
    assert.ok(firstPage);
    assert.equal(plan.length, 6);
    assert.equal(plan.every((page) => page.single), false);
    assert.equal(plan.every((page) => page.repeatHeader && page.repeatLimits), true);
    assert.equal(firstPage.bodyTop, 0);
    assert.ok(firstPage.bodyBottom > drawn.guides.headerBottom);
    for (const page of plan.slice(1)) assert.ok(page.bodyTop >= drawn.guides.headerBottom);
    for (const line of drawn.lines) {
      if (line.header || line.limits) continue;
      const hits = plan.filter((page) => line.bottom > page.bodyTop && line.top < page.bodyBottom);
      assert.equal(hits.length, 1, `${line.top}-${line.bottom}`);
      const hit = hits[0];
      assert.ok(hit);
      assert.ok(line.top >= hit.bodyTop && line.bottom <= hit.bodyBottom);
    }
    assertTitleStaysWithFirstCard(plan, drawn.guides.kept ?? []);
    for (const card of bodyCards) {
      const hits = plan.filter((page) => card.bottom > page.bodyTop && card.top < page.bodyBottom);
      assert.equal(hits.length, 1);
      const hit = hits[0];
      assert.ok(hit);
      assert.ok(card.top >= hit.bodyTop && card.bottom <= hit.bodyBottom);
    }
    const rgba = new Uint8Array(drawn.height * 4);
    for (let row = 0; row < drawn.height; row += 1) {
      rgba[row * 4] = row & 255;
      rgba[row * 4 + 1] = (row >> 8) & 255;
    }
    const slices = report.sliceReportPages(rgba, 1, drawn.height, drawn.limitsTop, found.pageHeight, {
      top: drawn.warningTop,
      bottom: drawn.warningBottom,
    }, drawn.guides);
    assert.equal(slices.length, 6);
    const readRow = (bytes: Uint8Array, index: number) => (bytes[index * 4] ?? 0) + (bytes[index * 4 + 1] ?? 0) * 256;
    const containsFull = (bytes: Uint8Array, sliceHeight: number, start: number, end: number) => {
      const span = end - start;
      for (let index = 0; index + span <= sliceHeight; index += 1) {
        let same = true;
        for (let step = 0; step < span; step += 1) {
          if (readRow(bytes, index + step) !== start + step) {
            same = false;
            break;
          }
        }
        if (same) return true;
      }
      return false;
    };
    const containsAny = (bytes: Uint8Array, sliceHeight: number, start: number, end: number) => {
      for (let index = 0; index < sliceHeight; index += 1) {
        const row = readRow(bytes, index);
        if (row >= start && row < end) return true;
      }
      return false;
    };
    for (const line of drawn.lines) {
      const owners = slices.filter((slice) => containsAny(slice.rgba, slice.height, line.top, line.bottom));
      assert.ok(owners.length >= 1);
      assert.equal(owners.every((slice) => containsFull(slice.rgba, slice.height, line.top, line.bottom)), true);
      if (!line.header && !line.limits) assert.equal(owners.length, 1);
      if (line.header || line.limits) assert.equal(owners.length, 6);
    }
  });

  test("el título de sección viaja con su primera tarjeta", async () => {
    const { report } = await load();
    const items = Array.from({ length: 12 }, (_, index) => ({
      title: { es: `Suministro total ${index + 1}`, en: `Total supply ${index + 1}` },
      lead: { es: `Dato ${index + 1} leído en la cadena`, en: `Fact ${index + 1} read on-chain` },
      note: { es: "", en: "" },
    }));
    const model = report.reportModel({
      summary: {
        blocks: [
          {
            id: "comprobado",
            heading: { es: "Qué se comprobó", en: "What was checked" },
            items,
            empty: { es: "", en: "" },
          },
          {
            id: "atencion",
            heading: { es: "Qué requiere atención", en: "What needs attention" },
            items: [
              {
                title: { es: "Parecido", en: "Lookalike" },
                lead: { es: "Se llama como ORVUPI, pero ORVUPI todavía no tiene contrato.", en: "It is named like ORVUPI, but ORVUPI does not have a contract yet." },
                note: { es: "", en: "" },
              },
              {
                title: { es: "Siguiente señal", en: "Next signal" },
                lead: { es: "Otra tarjeta después del título.", en: "Another card after the title." },
                note: { es: "", en: "" },
              },
            ],
            empty: { es: "", en: "" },
          },
          {
            id: "falta",
            heading: { es: "Qué falta", en: "What is missing" },
            items: [],
            empty: { es: "Nada que destacar en esta lectura.", en: "Nothing to note in this reading." },
          },
        ],
      },
      mint: CLONE,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    const drawn = report.drawReport(mockCtx().ctx, model, 840);
    const kept = drawn.guides.kept ?? [];
    assert.ok(kept.length >= 3);
    const foot = drawn.height - drawn.limitsTop;
    const first = kept[0];
    assert.ok(first);
    assert.ok(first.headingBottom > first.top && first.bottom > first.headingBottom);
    const midpoint = Math.floor((first.headingBottom + first.bottom) / 2);
    assert.ok(midpoint > first.headingBottom && midpoint < first.bottom);
    const tight = report.reportPagePlan(drawn.height, drawn.limitsTop, foot + midpoint, drawn.warningBottom - drawn.warningTop, drawn.guides);
    assert.ok(tight.length > 1);
    assert.equal(tight.some((page) => page.single), false);
    assertTitleStaysWithFirstCard(tight, kept);
    const opening = tight[0];
    assert.ok(opening);
    const headingOnFirst = first.top < opening.bodyBottom && first.headingBottom > opening.bodyTop;
    if (headingOnFirst) assert.ok(first.bottom <= opening.bodyBottom);
    else assert.ok(opening.bodyBottom <= first.top);
    for (let pageHeight = foot + drawn.guides.headerBottom + 80; pageHeight < drawn.height; pageHeight += 12) {
      const plan = report.reportPagePlan(drawn.height, drawn.limitsTop, pageHeight, 0, drawn.guides);
      if (plan.some((page) => page.single)) continue;
      assertTitleStaysWithFirstCard(plan, kept);
    }
  });

  test("el lienzo normaliza el texto de la cadena y no lo escapa como HTML", async () => {
    const { report, summary } = await load();
    assert.equal(report.canvasSafeText("ab\u202Eba\u0000<script>"), "abba<script>");
    assert.equal(report.canvasSafeText("Tom\u00A0& Jerry"), "Tom & Jerry");
    const model = report.reportModel({
      summary: summary.summaryFromCard(card({
        mint: USDC,
        name: { text: "USD<script>\u202E", status: "verificado" },
        symbol: { text: "USDC", status: "verificado" },
      })),
      mint: `${USDC}<b>`,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    const { ctx, calls } = mockCtx();
    const size = report.drawReport(ctx, model, 840);
    assert.ok(size.width >= 840);
    assert.ok(size.height > 200);
    const painted = calls.filter((item) => item.op === "fillText").map((item) => item.text).join("\n");
    assert.match(painted, /Dice llamarse «USD<script>»/);
    assert.equal(painted.includes("&lt;script&gt;"), false);
    assert.equal(painted.includes("\u202E"), false);
    assert.match(painted, new RegExp(`${USDC}<b>`));
    assertAbsent(painted);
    assert.match(painted, /Generado en orvupi.com · herramienta para tokens de terceros/);
    assert.match(painted, /Solana mainnet/);
    const titlePaint = calls.find((item) => item.op === "fillText" && item.text?.includes("no es un certificado"));
    assert.ok(titlePaint);
    assert.match(titlePaint.text || "", /·/);
    assert.match(titlePaint.font || "", /system-ui/);
    assert.equal((titlePaint.font || "").includes("Silkscreen"), false);
    assert.equal(/\b(precio|compra|comprar|urgente|buy now)\b/i.test(painted), false);
    const fills = calls.filter((item) => item.op === "fillRect").map((item) => item.fillStyle);
    assert.equal(fills.includes("#1beb91"), false);
    assert.equal(fills.includes("#9bb4ce"), true);
  });

  test("el PDF se arma en memoria y Android comparte el archivo si el sistema lo permite", async () => {
    const { report } = await load();
    const rgba = new Uint8Array([255, 0, 80, 255, 7, 20, 34, 255]);
    const pdf = await report.pdfFromRgba(rgba, 2, 1);
    assert.equal(Buffer.from(pdf.subarray(0, 8)).toString("utf8"), "%PDF-1.4");
    const source = Buffer.from(pdf).toString("latin1");
    assert.match(source, /\/Subtype \/Image/);
    assert.match(source, /\/Filter \/FlateDecode/);
    const marker = "\nstream\n";
    const start = source.lastIndexOf(marker);
    const end = source.indexOf("\nendstream", start);
    const dataStart = Buffer.byteLength(source.slice(0, start + marker.length), "latin1");
    const dataEnd = Buffer.byteLength(source.slice(0, end), "latin1");
    const compressed = pdf.subarray(dataStart, dataEnd);
    const raw = inflateSync(compressed);
    assert.equal(raw.length, 6);
    assert.equal(raw[0], 255);
    assert.equal(raw[3], 7);

    const file = new File([new Uint8Array([1])], "informe.png", { type: "image/png" });
    const android = { userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7)", share() {}, canShare: () => true };
    assert.equal(report.isAndroid(android), true);
    assert.equal(report.savePlan(android, file), "share");
    const desktop = { userAgent: "Mozilla/5.0 (X11; Linux x86_64)", share() {}, canShare: () => true };
    assert.equal(report.savePlan(desktop, file), "download");
    const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", share() {}, canShare: () => false };
    assert.equal(report.savePlan(iphone, file), "download");

    let shared = false;
    let clicked = "";
    const doc = {
      body: { append() {} },
      createElement() {
        return {
          href: "",
          download: "",
          rel: "",
          click() { clicked = this.download; },
          remove() {},
        };
      },
    };
    const sharedMode = await report.saveBlob(new Blob(["png"], { type: "image/png" }), "informe.png", {
      userAgent: android.userAgent,
      async share() { shared = true; },
      canShare: () => true,
    }, doc as never);
    assert.equal(sharedMode, "share");
    assert.equal(shared, true);
    assert.equal(clicked, "");
    const downloaded = await report.saveBlob(new Blob(["png"], { type: "image/png" }), "informe.png", {
      userAgent: android.userAgent,
      share: undefined,
      canShare: undefined,
    }, doc as never);
    assert.equal(downloaded, "download");
    assert.equal(clicked, "informe.png");
  });

  test("sin contrato ORVUPI, un token llamado ORVUPI pide atención aunque lleve la marca antigua, y una red desconocida no se inventa", async () => {
    const { report, summary } = await load();
    const official = report.reportModel({
      summary: summary.summaryFromCard(card({
        mint: LEGACY_MINT,
        officialProject: true,
        name: { text: "ORVUPI", status: "verificado" },
        symbol: { text: "ORVUPI", status: "verificado" },
        metadataMutable: "no",
        curve: { status: "ok", present: true },
      })),
      mint: LEGACY_MINT,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.match(joined(official, "comprobado"), /«ORVUPI»/);
    assert.equal(joined(official, "atencion").includes("Se llama como ORVUPI"), true);
    const missing = report.reportModel({ summary: { blocks: [] }, mint: "", network: "", consultedAt: "" }, "es");
    assert.equal(missing.network, "Red no indicada");
    assert.equal(missing.address, "Dirección no indicada");
    assert.match(missing.date, /Fecha no indicada/);
    const other = report.reportModel({ summary: { blocks: [] }, mint: "abc", network: "otra<script>", consultedAt: WHEN }, "en");
    assert.equal(other.network, "otra<script>");
    assert.match(report.reportPaintLines(other).join("\n"), /otra<script>/);
    const tall = report.reportPagePlan(400, 300, 120);
    assert.ok(tall.length > 1);
    assert.equal(tall.every((page) => page.repeatLimits), true);
    const height = 200;
    const rgba = new Uint8Array(height * 4);
    for (let row = 0; row < height; row += 1) rgba[row * 4] = row;
    const slices = report.sliceReportPages(rgba, 1, height, 160, 100);
    assert.ok(slices.length > 1);
    assert.equal(slices.every((page) => page.rgba[(page.height - 1) * 4] === 199), true);
    rgba[12 * 4] = 250;
    const warned = report.sliceReportPages(rgba, 1, height, 160, 100, { top: 12, bottom: 13 });
    assert.ok(warned.length > 1);
    assert.equal(warned.every((page) => page.rgba[(page.height - 1) * 4] === 199), true);
    assert.equal(warned.every((page) => {
      for (let row = 0; row < page.height; row += 1) {
        if (page.rgba[row * 4] === 250) return true;
      }
      return false;
    }), true);
    assert.match(report.reportCopy("es").pdfFail, /no puede crear el PDF/);
    assert.match(report.reportCopy("es").pdfFail, /PNG/);
    assert.match(report.reportCopy("en").pdfFail, /cannot create the PDF/);
    assert.match(report.reportCopy("en").pdfFail, /Download the PNG/);
  });

  test("la página no afloja la CSP ni pinta la cadena con innerHTML", () => {
    const root = repoRoot();
    const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
    const informe = read("web/v2/shared/informe.js");
    const verify = read("web/v2/assets/verify.js");
    const actions = read("web/v2/assets/verificar-acciones.mjs");
    const notebook = read("web/v2/assets/cuaderno.js");
    for (const source of [informe, actions, notebook]) {
      assert.equal(source.includes("innerHTML"), false);
      assert.equal(source.includes("insertAdjacentHTML"), false);
    }
    assert.match(verify, /\/shared\/informe\.js/);
    assert.equal(verify.includes("orvupi-resumen"), false);
    assert.equal(actions.includes("orvupi-resumen"), false);
    assert.equal(actions.includes("reportDownloadBox"), false);
    assert.match(notebook, /reportDownloadBox/);
    assertAbsent(informe);
    assert.equal(/\b(precio|compra ya|urgente|guaranteed)\b/i.test(informe), false);
    for (const rel of ["web/v2/verify/index.html", "web/v2/cuaderno/index.html"]) {
      const html = read(rel);
      const meta = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
      assert.match(meta, /script-src 'self'/);
      assert.match(meta, /img-src 'self'/);
      assert.equal(meta.includes("blob:"), false);
      assert.equal(meta.includes("unsafe-inline"), false);
      assert.equal(meta.includes("unsafe-eval"), false);
    }
  });
});
