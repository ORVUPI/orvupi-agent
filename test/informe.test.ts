import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const CLONE = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
const STUBX = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const WHEN = "2026-10-11T10:18:00.000Z";

type Line = { title: string; lead: string; note: string };
type Block = { id: string; heading: string; lines: Line[]; empty: string; service: string };
type Model = {
  title: string;
  date: string;
  network: string;
  networkLabel: string;
  address: string;
  addressLabel: string;
  blocks: Block[];
  note: string;
  limitsLabel: string;
  limits: string[];
  footer: string;
};

type ReportModule = {
  canvasSafeText: (value: string, max?: number) => string;
  reportModel: (source: Record<string, unknown>, lang: string) => Model;
  reportPaintLines: (model: Model) => string[];
  drawReport: (ctx: object, model: Model, width?: number) => { width: number; height: number };
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
  const calls: Array<{ op: string; text?: string; fillStyle?: string }> = [];
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
      calls.push({ op: "fillText", text, fillStyle: this.fillStyle });
    },
  };
  return { ctx, calls };
}

describe("informe descargable", () => {
  test("la ficha lleva fecha, red, dirección, resumen, límites y el pie", async () => {
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
    assert.equal(model.title, "Informe");
    assert.match(model.date, /Consultado el /);
    assert.match(model.date, /puede haber cambiado/);
    assert.equal(model.network, "Solana");
    assert.equal(model.address, USDC);
    assert.deepEqual(model.blocks.map((item) => item.heading), ["Qué se comprobó", "Qué requiere atención", "Qué falta"]);
    assert.match(joined(model, "comprobado"), /Dice llamarse «USD Coin» \(«USDC»\)/);
    assert.equal(joined(model, "comprobado").includes("7.721.704.579 USDC"), false);
    assert.match(joined(model, "comprobado"), /7\.721\.704\.579 tokens/);
    assert.match(joined(model, "atencion"), /Permiso de emisión/);
    assert.match(model.note, /Curva de Pump.fun: no aplica/);
    assert.equal(model.limitsLabel, "Límites");
    assert.match(model.limits.join(" "), /no aparece como comprobado/);
    assert.equal(model.footer, "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión");
    const english = report.reportModel({
      summary: summary.summaryFromCard(usdc),
      mint: USDC,
      network: "solana",
      consultedAt: WHEN,
    }, "en");
    assert.equal(english.title, "Report");
    assert.equal(english.networkLabel, "Network");
    assert.equal(english.addressLabel, "Address");
    assert.match(english.date, /Checked on /);
    assert.equal(english.footer, "High-risk crypto · You could lose everything · Not investment advice");
    assert.match(joined(english, "comprobado"), /It says it is called «USD Coin» \(«USDC»\)/);
  });

  test("un clon conserva el aviso y no usa su símbolo como unidad", async () => {
    const { report, summary } = await load();
    const model = report.reportModel({
      summary: summary.summaryFromCard(card({
        mint: CLONE,
        name: { text: "STUBX", status: "verificado" },
        symbol: { text: "STUBX", status: "verificado" },
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
    assert.match(checked, /Dice llamarse «STUBX»/);
    assert.match(attention, /Se parece a STUBX pero no es la dirección oficial/);
    assert.equal(checked.includes("1.000.000.000 STUBX"), false);
    assert.match(checked, /1\.000\.000\.000 tokens/);
    assert.equal(model.address, CLONE);
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
            empty: { es: "Ninguna señal de esta lectura pide atención. Que no aparezca no significa que no haya riesgo.", en: "No signal." },
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
  });

  test("el lienzo normaliza y escapa el texto de la cadena", async () => {
    const { report, summary } = await load();
    assert.equal(report.canvasSafeText("ab\u202Eba\u0000<script>"), "abba&lt;script&gt;");
    assert.equal(report.canvasSafeText("Tom\u00A0& Jerry"), "Tom &amp; Jerry");
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
    assert.match(painted, /Dice llamarse «USD&lt;script&gt;»/);
    assert.equal(painted.includes("<script>"), false);
    assert.equal(painted.includes("\u202E"), false);
    assert.match(painted, new RegExp(`${USDC}&lt;b&gt;`));
    assert.match(painted, /Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión/);
    assert.equal(/\b(precio|compra|comprar|urgente|buy now)\b/i.test(painted), false);
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

  test("el STUBX oficial puede nombrar su símbolo y una red desconocida no se inventa", async () => {
    const { report, summary } = await load();
    const official = report.reportModel({
      summary: summary.summaryFromCard(card({
        mint: STUBX,
        officialStubx: true,
        name: { text: "STUBX", status: "verificado" },
        symbol: { text: "STUBX", status: "verificado" },
        metadataMutable: "no",
        curve: { status: "ok", present: true },
      })),
      mint: STUBX,
      network: "solana",
      consultedAt: WHEN,
    }, "es");
    assert.match(joined(official, "comprobado"), /STUBX/);
    assert.equal(joined(official, "atencion").includes("Se parece a STUBX"), false);
    const missing = report.reportModel({ summary: { blocks: [] }, mint: "", network: "", consultedAt: "" }, "es");
    assert.equal(missing.network, "Red no indicada");
    assert.equal(missing.address, "Dirección no indicada");
    assert.match(missing.date, /Fecha no indicada/);
    const other = report.reportModel({ summary: { blocks: [] }, mint: "abc", network: "otra<script>", consultedAt: WHEN }, "en");
    assert.equal(other.network, "otra<script>");
    assert.match(report.reportPaintLines(other).join("\n"), /otra&lt;script&gt;/);
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
    assert.match(verify, /stubx-resumen/);
    assert.match(actions, /reportDownloadBox/);
    assert.match(notebook, /reportDownloadBox/);
    assert.match(informe, /Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión/);
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
