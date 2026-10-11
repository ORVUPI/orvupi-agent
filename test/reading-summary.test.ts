import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const STUBX = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

type Point = {
  topic: string;
  title: { es: string; en: string };
  lead: { es: string; en: string };
  detail: { es: string; en: string } | null;
};

type Summary = {
  title: { es: string; en: string };
  retry: boolean;
  note: Point | null;
  blocks: Array<{
    id: string;
    heading: { es: string; en: string };
    items: Point[];
    empty: { es: string; en: string };
  }>;
};

type SummaryModule = {
  buildReadingSummary: (view: Record<string, unknown>) => Summary;
  summaryFromCard: (card: Record<string, unknown>) => Summary;
};

async function load(): Promise<SummaryModule> {
  return (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/reading-summary.js")).href)) as SummaryModule;
}

function block(summary: Summary, id: string) {
  const found = summary.blocks.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

function prose(summary: Summary, lang: "es" | "en") {
  const note = summary.note ? `${summary.note.title[lang]} ${summary.note.lead[lang]}` : "";
  return summary.blocks
    .flatMap((item) => [
      item.heading[lang],
      item.empty[lang],
      ...item.items.flatMap((point) => [point.title[lang], point.lead[lang], point.detail?.[lang] ?? ""]),
    ])
    .concat(note)
    .join("\n");
}

function leads(summary: Summary, id: string, lang: "es" | "en") {
  return block(summary, id).items.map((item) => `${item.title[lang]} ${item.lead[lang]}`).join(" | ");
}

describe("resumen de la lectura", () => {
  test("USDC: lenguaje sencillo, congelación, emisión y la curva aparte", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro en los bytes del mint", en: "Supply in the mint bytes" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Consulta extra del suministro", en: "Extra supply query" }, state: "ok" },
        { id: "metadatos", label: { es: "Metadatos", en: "Metadata" }, state: "ok" },
        { id: "enlace", label: { es: "Enlace de metadatos", en: "Metadata link" }, state: "ausente" },
        { id: "cuentas", label: { es: "Cuentas con más tokens", en: "Largest token accounts" }, state: "ok" },
        { id: "curva", label: { es: "Curva", en: "Curve" }, state: "no_aplica" },
      ],
      rows: [
        { label: { es: "Nombre", en: "Name" }, value: { es: "USD Coin", en: "USD Coin" } },
        { label: { es: "Símbolo", en: "Symbol" }, value: { es: "USDC", en: "USDC" } },
        { label: { es: "Suministro", en: "Supply" }, value: { es: "7.721.704.579", en: "7,721,704,579" } },
      ],
      signals: [
        { id: "emision", level: "atencion", title: { es: "Alguien puede crear más tokens", en: "Someone can create more tokens" }, explain: { es: "activa", en: "active" } },
        { id: "congelacion", level: "riesgo", title: { es: "Alguien puede congelar cuentas", en: "Someone can freeze accounts" }, explain: { es: "puede impedir", en: "can stop" } },
        { id: "mutable", level: "atencion", title: { es: "El nombre se puede cambiar", en: "The name can be changed" }, explain: { es: "puede actualizar", en: "can update" } },
        { id: "comision", level: "riesgo", title: { es: "Comisión de transferencia", en: "Transfer fee" }, explain: { es: "parte de cada envío", en: "part of each transfer" } },
        { id: "curva", level: "neutro", title: { es: "Curva", en: "Curve" }, explain: { es: "No aplica: este token no se creó en Pump.fun", en: "Not applicable" } },
      ],
    });
    assert.equal(summary.title.es, "Resumen");
    assert.deepEqual(summary.blocks.map((item) => item.heading.es), ["Qué se comprobó", "Qué requiere atención", "Qué falta"]);
    const checked = leads(summary, "comprobado", "es");
    assert.match(checked, /Suministro total/);
    assert.match(checked, /7\.721\.704\.579 USDC/);
    assert.match(checked, /Nombre y símbolo/);
    assert.match(checked, /USD Coin \(USDC\)/);
    assert.match(checked, /No tiene enlace de metadatos/);
    assert.equal(checked.includes("No aplica"), false);
    assert.equal(checked.includes("bytes del mint"), false);
    assert.equal(checked.includes("Consulta extra"), false);
    assert.equal(summary.note?.lead.es, "Curva de Pump.fun: no aplica");
    assert.equal(summary.note?.topic, "curva");
    const attention = block(summary, "atencion");
    const attentionText = attention.items.map((item) => `${item.title.es} ${item.lead.es} ${item.detail?.es ?? ""}`).join(" ");
    assert.match(attentionText, /Permiso de emisión/);
    assert.match(attentionText, /moneda estable/);
    assert.match(attentionText, /promete el proyecto/);
    assert.match(attentionText, /Permiso de congelación/);
    assert.match(attentionText, /bloquear cuentas/);
    assert.match(attentionText, /no es una suplantación/);
    assert.match(attentionText, /Comisión al enviar/);
    assert.equal(attention.items.every((item) => item.lead.es.length <= 90), true);
    assert.equal(summary.retry, false);
    const card = summaryFromCard({
      mint: USDC,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "activa", status: "verificado" },
      freezeAuthority: { state: "activa", status: "verificado" },
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
    });
    assert.match(leads(card, "atencion", "es"), /Permiso de congelación/);
    assert.match(leads(card, "comprobado", "es"), /7\.721\.704\.579 USDC/);
    assert.equal(card.note?.lead.es, "Curva de Pump.fun: no aplica");
    assert.equal(leads(card, "comprobado", "es").includes("No aplica"), false);
    assert.equal(card.retry, false);
  });

  test("STUBX leído sin permiso activo no convierte la ausencia de señales en un aval", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro en los bytes del mint", en: "Supply in the mint bytes" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Consulta extra del suministro", en: "Extra supply query" }, state: "ok" },
        { id: "curva", label: { es: "Curva", en: "Curve" }, state: "ok" },
        { id: "cuentas", label: { es: "Cuentas con más tokens", en: "Largest token accounts" }, state: "ok" },
      ],
      signals: [
        { id: "emision", level: "ok", title: { es: "Nadie puede crear más tokens con ese permiso", en: "Nobody can create more tokens with that permission" } },
        { id: "congelacion", level: "ok", title: { es: "Nadie puede congelar cuentas con ese permiso", en: "Nobody can freeze accounts with that permission" } },
        { id: "mutable", level: "ok", title: { es: "El nombre no se puede cambiar en las fuentes leídas", en: "The name cannot be changed in the sources read" } },
        { id: "cuentas", level: "neutro", title: { es: "Cuentas con tokens", en: "Token accounts" }, explain: { es: "Se leyeron 2 cuentas", en: "2 accounts" } },
      ],
    });
    const attention = block(summary, "atencion");
    assert.equal(attention.items.length, 0);
    assert.match(attention.empty.es, /no significa que no haya riesgo/);
    assert.match(leads(summary, "comprobado", "es"), /Nadie puede crear más tokens ni congelar cuentas/);
    assert.equal(prose(summary, "es").includes("moneda estable"), false);
    const card = summaryFromCard({
      mint: STUBX,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "1000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "STUBX", status: "verificado" },
      symbol: { text: "STUBX", status: "verificado" },
      uri: { text: "https://example.invalid/meta", status: "verificado" },
      metadataMutable: "no",
      extensionsStatus: "no_aplica",
      curve: { status: "verificado", present: true },
      largestStatus: "ok",
    });
    assert.equal(block(card, "atencion").items.length, 0);
    assert.match(leads(card, "comprobado", "es"), /Nadie puede crear más tokens ni congelar cuentas/);
    assert.equal(prose(card, "es").includes("moneda estable"), false);
  });

  test("una muestra vacía o fallida va a Qué falta y no se llama ausencia", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro en los bytes del mint", en: "Supply in the mint bytes" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Consulta extra del suministro", en: "Extra supply query" }, state: "fallo" },
        { id: "cuentas", label: { es: "Cuentas con más tokens", en: "Largest token accounts" }, state: "fallo" },
        { id: "curva", label: { es: "Curva", en: "Curve" }, state: "no_aplica" },
      ],
      signals: [
        {
          id: "cuentas",
          level: "atencion",
          title: { es: "Cuentas con tokens", en: "Token accounts" },
          explain: { es: "La muestra de cuentas volvió vacía. No se leyó quién tiene más tokens.", en: "The account sample came back empty." },
        },
      ],
    });
    const missing = leads(summary, "falta", "es");
    assert.match(missing, /No se pudo leer el suministro otra vez/);
    assert.match(missing, /No se pudo leer quién tiene más tokens/);
    assert.equal(block(summary, "falta").items.find((item) => item.topic === "distribucion")?.topic, "distribucion");
    assert.equal(summary.retry, true);
    assert.equal(block(summary, "atencion").items.some((item) => item.title.es === "Concentración"), false);
    assert.equal(leads(summary, "comprobado", "es").includes("No aplica"), false);
    assert.equal(summary.note?.lead.es, "Curva de Pump.fun: no aplica");
    const emptyCard = summaryFromCard({
      mint: USDC,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "1000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "USDC", status: "verificado" },
      symbol: { text: "USDC", status: "verificado" },
      uri: { text: null, status: "ausente" },
      metadataMutable: "no",
      extensionsStatus: "no_aplica",
      curve: { status: "no_aplica", present: false },
      largestStatus: "ausente",
    });
    assert.match(leads(emptyCard, "falta", "es"), /No se pudo leer quién tiene más tokens/);
    assert.equal(prose(emptyCard, "es").includes("ausente comprobado"), false);
    const failedCard = summaryFromCard({
      mint: USDC,
      program: "token-2022",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: null,
      supplyRpcStatus: "fallo",
      decimals: 6,
      name: { text: "USDC", status: "verificado" },
      symbol: { text: null, status: "fallo" },
      uri: { text: null, status: "fallo" },
      metadataMutable: "fallo",
      extensionsStatus: "verificado",
      extensions: [{ type: 14, name: "TransferHook", status: "verificado" }],
      curve: { status: "no_aplica", present: false },
      largestStatus: "fallo",
    });
    assert.equal(failedCard.retry, true);
    assert.match(leads(failedCard, "falta", "es"), /No se pudo leer el suministro otra vez/);
    assert.match(leads(failedCard, "falta", "es"), /No se pudo leer quién tiene más tokens/);
    assert.match(leads(failedCard, "atencion", "es"), /Revisión de cada envío/);
    const concentrated = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [{ id: "cuentas", label: { es: "Cuentas", en: "Accounts" }, state: "ok" }],
      signals: [{ id: "cuentas", level: "atencion", title: { es: "Cuentas con tokens", en: "Token accounts" }, explain: { es: "La mayor cuenta tiene el 25 %.", en: "The largest account has 25%." } }],
    });
    assert.match(leads(concentrated, "atencion", "es"), /Concentración/);
    assert.match(leads(concentrated, "atencion", "es"), /25 %/);
    const whole = buildReadingSummary({ ok: false, kind: "red", facts: [], signals: [] });
    assert.equal(whole.retry, true);
    assert.match(leads(whole, "falta", "es"), /Esta lectura/);
    for (const lang of ["es", "en"] as const) {
      const text = `${prose(summary, lang)}\n${prose(emptyCard, lang)}\n${prose(failedCard, lang)}\n${prose(whole, lang)}`;
      assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score)\b/i.test(text), false);
      assert.equal(text.includes("ausente comprobado"), false);
      assert.equal(text.includes("bytes del mint"), false);
      assert.equal(text.includes("Consulta extra del suministro"), false);
    }
  });
});
