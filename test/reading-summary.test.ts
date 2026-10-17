import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// Dirección del token anterior: solo como dato de prueba. No es un contrato ORVUPI.
const LEGACY_MINT = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

type Point = {
  topic: string;
  title: { es: string; en: string };
  lead: { es: string; en: string };
  detail: { es: string; en: string } | null;
  note?: { es: string; en: string } | null;
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
      ...item.items.flatMap((point) => [point.title[lang], point.lead[lang], point.note?.[lang] ?? "", point.detail?.[lang] ?? ""]),
    ])
    .concat(note)
    .join("\n");
}

function leads(summary: Summary, id: string, lang: "es" | "en") {
  return block(summary, id).items.map((item) => `${item.title[lang]} ${item.lead[lang]}`).join(" | ");
}

function times(summary: Summary, phrase: string) {
  return prose(summary, "es").split(phrase).length - 1;
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
    assert.match(checked, /7\.721\.704\.579 tokens/);
    assert.equal(checked.includes("7.721.704.579 USDC"), false);
    assert.match(checked, /Nombre y símbolo/);
    assert.match(checked, /Dice llamarse «USD Coin» \(«USDC»\)/);
    assert.match(checked, /No tiene enlace de metadatos/);
    assert.equal(checked.includes("No aplica"), false);
    assert.equal(checked.includes("bytes del mint"), false);
    assert.equal(checked.includes("Consulta extra"), false);
    assert.equal(summary.note?.lead.es, "Curva de Pump.fun: no aplica");
    assert.equal(summary.note?.topic, "curva");
    const attention = block(summary, "atencion");
    const emission = attention.items.find((item) => item.title.es === "Permiso de emisión");
    assert.equal(emission?.lead.es, "Está activo: permite crear más tokens.");
    assert.equal(/moneda estable|stablecoin/i.test(`${emission?.title.es} ${emission?.lead.es} ${emission?.lead.en}`), false);
    assert.match(emission?.detail?.es ?? "", /moneda estable/);
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
    assert.equal(block(card, "atencion").items.some((item) => item.lead.es.includes("Se llama como ORVUPI")), false);
    assert.match(leads(card, "comprobado", "es"), /7\.721\.704\.579 tokens/);
    assert.match(leads(card, "comprobado", "es"), /Dice llamarse «USD Coin» \(«USDC»\)/);
    assert.equal(leads(card, "comprobado", "es").includes("7.721.704.579 USDC"), false);
    assert.equal(card.note?.lead.es, "Curva de Pump.fun: no aplica");
    assert.equal(leads(card, "comprobado", "es").includes("No aplica"), false);
    assert.equal(card.retry, false);
  });

  test("sin permisos activos la ausencia de señales no es un aval, y un token llamado ORVUPI pide atención porque ORVUPI no tiene contrato", async () => {
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
    assert.equal(attention.empty.es, "Ninguna señal de esta lectura pide atención. Que no aparezcan señales no significa que esté todo comprobado.");
    assert.equal(attention.empty.en, "No signal in this reading needs attention. No signals showing does not mean everything was checked.");
    assert.equal(attention.empty.es.includes("no haya riesgo"), false);
    assert.equal(attention.empty.en.includes("there is no risk"), false);
    assert.match(leads(summary, "comprobado", "es"), /Nadie puede crear más tokens ni congelar cuentas/);
    assert.equal(prose(summary, "es").includes("moneda estable"), false);
    const card = summaryFromCard({
      mint: LEGACY_MINT,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "1000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "ORVUPI", status: "verificado" },
      symbol: { text: "ORVUPI", status: "verificado" },
      uri: { text: "https://example.invalid/meta", status: "verificado" },
      metadataMutable: "no",
      extensionsStatus: "no_aplica",
      curve: { status: "verificado", present: true },
      largestStatus: "ok",
    });
    assert.equal(block(card, "atencion").items.length, 1);
    assert.equal(block(card, "atencion").items[0]?.lead.es, "Se llama como ORVUPI, pero no es la dirección oficial.");
    assert.match(leads(card, "comprobado", "es"), /Hay 0,001 tokens/);
    assert.equal(leads(card, "comprobado", "es").includes("Dice llamarse «ORVUPI»"), true);
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
    const supplyItems = summary.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(supplyItems.length, 1);
    assert.equal(supplyItems[0]?.note ?? null, null);
    assert.equal(missing.includes("Suministro total"), false);
    assert.match(missing, /Segunda comprobación del suministro/);
    assert.equal(times(summary, "No se pudo hacer la segunda comprobación del suministro"), 1);
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
    const failedSupply = failedCard.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(failedSupply.length, 1);
    assert.equal(failedSupply[0]?.note ?? null, null);
    assert.equal(times(failedCard, "No se pudo hacer la segunda comprobación del suministro"), 1);
    assert.equal(leads(failedCard, "falta", "es").includes("Suministro total"), false);
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
    assert.match(leads(whole, "falta", "es"), /Suministro/);
    assert.match(leads(whole, "falta", "es"), /Decimales/);
    assert.match(leads(whole, "falta", "es"), /Cuentas con más tokens/);
    for (const lang of ["es", "en"] as const) {
      const text = `${prose(summary, lang)}\n${prose(emptyCard, lang)}\n${prose(failedCard, lang)}\n${prose(whole, lang)}`;
      assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score)\b/i.test(text), false);
      assert.equal(text.includes("ausente comprobado"), false);
      assert.equal(text.includes("bytes del mint"), false);
      assert.equal(text.includes("Consulta extra del suministro"), false);
    }
  });

  test("un token que no es USDC no nombra la moneda estable en el texto visible", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const other = "So11111111111111111111111111111111111111112";
    const signals = [
      { id: "emision", level: "atencion", title: { es: "Alguien puede crear más tokens", en: "Someone can create more tokens" }, explain: { es: "activa", en: "active" } },
      { id: "congelacion", level: "riesgo", title: { es: "Alguien puede congelar cuentas", en: "Someone can freeze accounts" }, explain: { es: "puede impedir", en: "can stop" } },
      { id: "mutable", level: "atencion", title: { es: "El nombre se puede cambiar", en: "The name can be changed" }, explain: { es: "puede actualizar", en: "can update" } },
    ];
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      mint: other,
      facts: [
        { id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" },
        { id: "metadatos", label: { es: "Metadatos", en: "Metadata" }, state: "ok" },
      ],
      rows: [
        { label: { es: "Nombre", en: "Name" }, value: { es: "Otro", en: "Other" } },
        { label: { es: "Símbolo", en: "Symbol" }, value: { es: "OTRO", en: "OTRO" } },
      ],
      signals,
    });
    const visible = block(summary, "atencion").items.map((item) => `${item.title.es} ${item.lead.es} ${item.title.en} ${item.lead.en}`).join("\n");
    assert.equal(/moneda estable|stablecoin/i.test(visible), false);
    assert.equal(visible.includes(USDC), false);
    const emission = block(summary, "atencion").items.find((item) => item.title.es === "Permiso de emisión");
    const freeze = block(summary, "atencion").items.find((item) => item.title.es === "Permiso de congelación");
    const metadata = block(summary, "atencion").items.find((item) => item.title.es === "Nombre y símbolo");
    assert.equal(emission?.lead.es, "Está activo: permite crear más tokens.");
    assert.equal(emission?.lead.en, "It is active: it can create more tokens.");
    assert.match(emission?.detail?.es ?? "", /moneda estable/);
    assert.match(emission?.detail?.en ?? "", /stablecoin/);
    assert.equal(freeze?.lead.es, "Está activo: puede bloquear cuentas.");
    assert.equal(freeze?.lead.en, "It is active: it can block accounts.");
    assert.equal(/acusa|estafa|suplantación/i.test(`${freeze?.lead.es} ${freeze?.lead.en}`), false);
    assert.equal(metadata?.lead.es, "Se pueden cambiar.");
    assert.equal(metadata?.lead.en, "They can change.");
    assert.equal(/suplantación|impersonation|acusa/i.test(`${metadata?.lead.es} ${metadata?.lead.en}`), false);
    assert.match(metadata?.detail?.es ?? "", /no es una suplantación/);
    const card = summaryFromCard({
      mint: other,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "activa", status: "verificado" },
      freezeAuthority: { state: "activa", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "1000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "Otro", status: "verificado" },
      symbol: { text: "OTRO", status: "verificado" },
      uri: { text: null, status: "ausente" },
      metadataMutable: "si",
      extensionsStatus: "no_aplica",
      extensions: [],
      curve: { status: "no_aplica", present: false },
      largestStatus: "ok",
    });
    const cardVisible = block(card, "atencion").items.map((item) => `${item.title.es} ${item.lead.es} ${item.title.en} ${item.lead.en}`).join("\n");
    assert.equal(/moneda estable|stablecoin/i.test(cardVisible), false);
    assert.match(block(card, "atencion").items.find((item) => item.title.es === "Permiso de emisión")?.detail?.es ?? "", /moneda estable/);
  });

  test("si falla getMultipleAccounts, Qué falta lista suministro, decimales y cuentas", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const unread = buildReadingSummary({ ok: false, kind: "red", facts: [], signals: [] });
    const missing = leads(unread, "falta", "es");
    assert.match(missing, /Suministro/);
    assert.match(missing, /Decimales/);
    assert.match(missing, /Cuentas con más tokens/);
    assert.equal(missing.includes("Esta lectura"), false);
    const card = summaryFromCard({
      mint: "So11111111111111111111111111111111111111112",
      program: "no_disponible",
      programStatus: "fallo",
      mintAuthority: { state: "no_disponible", status: "no_disponible" },
      freezeAuthority: { state: "no_disponible", status: "no_disponible" },
      supplyAccount: null,
      supplyRpc: null,
      supplyRpcStatus: "fallo",
      decimals: null,
      name: { text: null, status: "fallo" },
      symbol: { text: null, status: "fallo" },
      uri: { text: null, status: "fallo" },
      metadataMutable: "fallo",
      extensionsStatus: "fallo",
      extensions: [],
      curve: { status: "fallo", present: null },
      largestStatus: "fallo",
    });
    const cardMissing = leads(card, "falta", "es");
    assert.match(cardMissing, /Suministro/);
    assert.match(cardMissing, /Decimales/);
    assert.match(cardMissing, /Cuentas con más tokens/);
  });

  test("getTokenSupply fallido deja un solo suministro, y el cuaderno distingue las dos notas", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Suministro", en: "Supply" }, state: "fallo" },
      ],
      rows: [{ label: { es: "Suministro", en: "Supply" }, value: { es: "1.000", en: "1,000" } }],
      signals: [{
        id: "suministro",
        level: "neutro",
        title: { es: "Suministro y decimales", en: "Supply and decimals" },
        explain: { es: "El servicio no respondió. Eso no cambia esta cifra.", en: "The service did not respond." },
      }],
    });
    const titled = summary.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(titled.length, 1);
    assert.equal(titled[0]?.note ?? null, null);
    assert.equal(times(summary, "No se pudo hacer la segunda comprobación del suministro"), 1);
    assert.equal(prose(summary, "en").split("The second supply check could not be done.").length - 1, 1);
    assert.match(leads(summary, "falta", "es"), /Segunda comprobación del suministro/);
    assert.equal(leads(summary, "comprobado", "es").includes("Segunda comprobación"), false);
    assert.equal(block(summary, "atencion").items.some((item) => item.title.es === "Suministro total"), false);
    assert.equal(leads(summary, "comprobado", "es").includes("coinciden"), false);
    const mismatch = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Suministro", en: "Supply" }, state: "ok" },
      ],
      signals: [{
        id: "suministro",
        level: "atencion",
        title: { es: "Suministro y decimales", en: "Supply and decimals" },
        explain: { es: "La lectura extra no coincide. No se calculan porcentajes.", en: "The extra read does not match." },
      }],
    });
    const mismatchItems = mismatch.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(mismatchItems.length, 1);
    assert.equal(mismatchItems[0]?.note?.es, "Las dos lecturas no coinciden.");
    assert.equal(block(mismatch, "atencion").items.some((item) => item.title.es === "Suministro total"), false);
    const again = summaryFromCard({
      mint: LEGACY_MINT,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: null,
      supplyRpcStatus: "fallo",
      decimals: 6,
      name: { text: "ORVUPI", status: "verificado" },
      symbol: { text: "ORVUPI", status: "verificado" },
      uri: { text: null, status: "ausente" },
      metadataMutable: "no",
      extensionsStatus: "no_aplica",
      curve: { status: "verificado", present: true },
      largestStatus: "ok",
    });
    const againItems = again.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(againItems.length, 1);
    assert.equal(againItems[0]?.note ?? null, null);
    assert.equal(times(again, "No se pudo hacer la segunda comprobación del suministro"), 1);
    const different = summaryFromCard({
      mint: LEGACY_MINT,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "revocada", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "2000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "ORVUPI", status: "verificado" },
      symbol: { text: "ORVUPI", status: "verificado" },
      uri: { text: null, status: "ausente" },
      metadataMutable: "no",
      extensionsStatus: "no_aplica",
      curve: { status: "verificado", present: true },
      largestStatus: "ok",
    });
    const differentItems = different.blocks.flatMap((item) => item.items).filter((item) => item.title.es === "Suministro total");
    assert.equal(differentItems.length, 1);
    assert.equal(differentItems[0]?.note?.es, "Las dos lecturas no coinciden.");
    assert.equal(differentItems[0]?.note?.es.includes("No se pudo leer otra vez"), false);
  });

  test("una señal no leída de tipo desconocido va a Qué falta", async () => {
    const { buildReadingSummary } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [{ id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" }],
      signals: [{
        id: "tipo-raro",
        level: "atencion",
        title: { es: "Señal rara", en: "Rare signal" },
        explain: { es: "No se pudo leer este dato.", en: "This fact could not be read." },
      }],
    });
    assert.match(leads(summary, "falta", "es"), /Señal rara/);
    assert.match(leads(summary, "falta", "es"), /No se pudo leer/);
    assert.equal(block(summary, "atencion").items.some((item) => item.title.es === "Señal rara"), false);
    const read = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [{ id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" }],
      signals: [{
        id: "tipo-raro",
        level: "atencion",
        title: { es: "Señal rara", en: "Rare signal" },
        explain: { es: "El dato está en la cuenta.", en: "The fact is on the account." },
      }],
    });
    assert.equal(block(read, "falta").items.some((item) => item.title.es === "Señal rara"), false);
    assert.match(leads(read, "atencion", "es"), /Señal rara/);
  });

  test("un URI vacío o de nulos no es un enlace", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    for (const uri of ["", "   ", `\0`.repeat(200), "\uFFFD", "\u200B", " \u200B "]) {
      const summary = buildReadingSummary({
        ok: true,
        kind: "lectura",
        facts: [{ id: "enlace", label: { es: "Enlace de metadatos", en: "Metadata link" }, state: "ausente" }],
      });
      assert.match(leads(summary, "comprobado", "es"), /No tiene enlace de metadatos/);
      assert.equal(times(summary, "No tiene enlace de metadatos"), 1);
      assert.equal(leads(summary, "comprobado", "es").includes("Se leyó el enlace"), false);
      const card = summaryFromCard({
        mint: USDC,
        program: "spl-token",
        programStatus: "verificado",
        mintAuthority: { state: "activa", status: "verificado" },
        freezeAuthority: { state: "activa", status: "verificado" },
        supplyAccount: "1000",
        supplyRpc: "1000",
        supplyRpcStatus: "verificado",
        decimals: 6,
        name: { text: "USD Coin", status: "verificado" },
        symbol: { text: "USDC", status: "verificado" },
        uri: { text: uri, status: "verificado" },
        metadataMutable: "si",
        extensionsStatus: "no_aplica",
        curve: { status: "no_aplica", present: false },
        largestStatus: "ok",
      });
      assert.match(leads(card, "comprobado", "es"), /No tiene enlace de metadatos/);
      assert.equal(times(card, "No tiene enlace de metadatos"), 1);
      assert.equal(leads(card, "comprobado", "es").includes("Se leyó el enlace"), false);
    }
  });

  test("ERYyy simulado no usa el símbolo de terceros como si fuera ORVUPI", async () => {
    const { buildReadingSummary } = await load();
    const mint = "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump";
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      mint,
      facts: [
        { id: "suministro", label: { es: "Suministro", en: "Supply" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Suministro", en: "Supply" }, state: "ok" },
        { id: "metadatos", label: { es: "Metadatos", en: "Metadata" }, state: "ok" },
        { id: "enlace", label: { es: "Enlace", en: "Link" }, state: "ok" },
      ],
      rows: [
        { label: { es: "Nombre", en: "Name" }, value: { es: "ORVUPI", en: "ORVUPI" } },
        { label: { es: "Símbolo", en: "Symbol" }, value: { es: "ORVUPI", en: "ORVUPI" } },
        { label: { es: "Suministro", en: "Supply" }, value: { es: "1.000.000.000", en: "1,000,000,000" } },
      ],
      signals: [
        { id: "emision", level: "neutro", title: { es: "Nadie puede crear más tokens con ese permiso", en: "Nobody can create more tokens with that permission" } },
        { id: "congelacion", level: "neutro", title: { es: "Nadie puede congelar cuentas con ese permiso", en: "Nobody can freeze accounts with that permission" } },
        { id: "copia", level: "atencion", title: { es: "Se parece a ORVUPI, pero no es la CA oficial", en: "Looks like ORVUPI, but it is not the official CA" }, explain: { es: "La dirección es otra.", en: "The address is different." } },
        { id: "mutable", level: "atencion", title: { es: "El nombre se puede cambiar", en: "The name can be changed" }, explain: { es: "puede actualizar", en: "can update" } },
        {
          id: "ficha",
          level: "atencion",
          cardDate: "2026-10-09T16:16:12.461Z",
          title: { es: "La ficha fechada también dice que se parece a ORVUPI y no es la CA oficial", en: "The dated card also says it looks like ORVUPI and is not the official CA" },
          explain: { es: "Es una foto anterior.", en: "It is an earlier snapshot." },
        },
      ],
    });
    const supply = block(summary, "comprobado").items.find((item) => item.title.es === "Suministro total");
    assert.match(supply?.lead.es ?? "", /^Hay 1\.000\.000\.000 tokens/);
    assert.equal((supply?.lead.es ?? "").includes("ORVUPI"), false);
    const identity = block(summary, "comprobado").items.find((item) => item.title.es === "Nombre y símbolo");
    assert.equal(identity?.lead.es, "Dice llamarse «ORVUPI» (texto elegido por quien creó el token).");
    const attention = block(summary, "atencion").items;
    assert.equal(attention[0]?.lead.es, "Se llama como ORVUPI, pero no es la dirección oficial.");
    assert.match(attention[0]?.detail?.es ?? "", /Ninguna dirección es la oficial/);
    const dated = attention.find((item) => item.title.es === "Comprobación anterior");
    assert.equal(dated?.lead.es, "Es la ficha del 2026-10-09, no un dato de esta lectura.");
    assert.equal(dated?.lead.en, "It is the 2026-10-09 card, not a fact from this reading.");
    assert.equal(/\d{2}:\d{2}:\d{2}/.test(dated?.lead.es ?? ""), false);
    const undated = buildReadingSummary({
      ok: true,
      kind: "lectura",
      mint,
      facts: [],
      signals: [{
        id: "ficha",
        level: "atencion",
        title: { es: "Comprobación anterior", en: "Earlier check" },
        explain: { es: "Leído a las 12:18:00.", en: "Read at 12:18:00." },
      }],
    });
    assert.equal(block(undated, "atencion").items.some((item) => item.title.es === "Comprobación anterior"), false);
    assert.equal(prose(summary, "es").includes("Es un dato de esta lectura"), false);
  });

  test("ERYyy en el Cuaderno avisa el clon antes que el permiso de emisión", async () => {
    const { summaryFromCard } = await load();
    const summary = summaryFromCard(cloneCard("ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump", "ORVUPI", "ORVUPI"));
    const attention = block(summary, "atencion").items;
    assert.equal(attention[0]?.lead.es, "Se llama como ORVUPI, pero no es la dirección oficial.");
    assert.match(attention[0]?.detail?.es ?? "", /Ninguna dirección es la oficial/);
    assert.equal(attention.some((item) => item.title.es === "Permiso de emisión"), true);
    const supply = block(summary, "comprobado").items.find((item) => item.title.es === "Suministro total");
    assert.match(supply?.lead.es ?? "", /^Hay 1\.000\.000\.000 tokens/);
    assert.equal((supply?.lead.es ?? "").includes("ORVUPI"), false);
    const identity = block(summary, "comprobado").items.find((item) => item.title.es === "Nombre y símbolo");
    assert.equal(identity?.lead.es, "Dice llamarse «ORVUPI» (texto elegido por quien creó el token).");
  });

  test("FMNb en el Cuaderno avisa el clon cuando el nombre es Comunidad ORVUPI", async () => {
    const { summaryFromCard } = await load();
    const summary = summaryFromCard(cloneCard("FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump", "Comunidad ORVUPI", "COMUNIDAD"));
    const attention = block(summary, "atencion").items;
    assert.equal(attention[0]?.lead.es, "Se llama como ORVUPI, pero no es la dirección oficial.");
    const identity = block(summary, "comprobado").items.find((item) => item.title.es === "Nombre y símbolo");
    assert.equal(identity?.lead.es, "Dice llamarse «Comunidad ORVUPI» («COMUNIDAD») (texto elegido por quien creó el token).");
    const supply = block(summary, "comprobado").items.find((item) => item.title.es === "Suministro total");
    assert.match(supply?.lead.es ?? "", /^Hay 1\.000\.000\.000 tokens/);
    assert.equal((supply?.lead.es ?? "").includes("COMUNIDAD"), false);
  });

  test("un nombre con ancho cero se parece a ORVUPI", async () => {
    await assertLookalike("ORV\u200BUPI", "OTRO", "«ORVUPI» («OTRO»)");
  });

  test("el cirílico ОRVUРІ se parece a ORVUPI", async () => {
    await assertLookalike("\u041ERVU\u0420\u0406", "OTRO", "«\u041ERVU\u0420\u0406» («OTRO»)");
  });

  test("el ancho completo se parece a ORVUPI", async () => {
    const wide = "\uFF2F\uFF32\uFF36\uFF35\uFF30\uFF29";
    await assertLookalike(wide, "OTRO", `«${wide}» («OTRO»)`);
  });

  test("ORV UPI separado se parece a ORVUPI", async () => {
    await assertLookalike("ORV UPI", "OTRO", "«ORV UPI» («OTRO»)");
  });

  test("OR-VUPI en el símbolo se parece a ORVUPI", async () => {
    await assertLookalike("Otro", "OR-VUPI", "«Otro» («OR-VUPI»)");
  });

  test("el RTL override se parece a ORVUPI y no se muestra", async () => {
    await assertLookalike("\u202EORVUPI", "OTRO", "«ORVUPI» («OTRO»)");
  });

  test("un nombre largo se recorta con elipsis", async () => {
    const { summaryFromCard } = await load();
    const summary = summaryFromCard(cloneCard("So11111111111111111111111111111111111111112", "N".repeat(80), "OTRO"));
    const identity = block(summary, "comprobado").items.find((item) => item.title.es === "Nombre y símbolo");
    assert.equal(identity?.lead.es, `Dice llamarse «${"N".repeat(64)}…» («OTRO») (texto elegido por quien creó el token).`);
    assert.equal(block(summary, "atencion").items.some((item) => item.lead.es.includes("Se parece a ORVUPI")), false);
  });
});

function cloneCard(mint: string, name: string, symbol: string) {
  return {
    mint,
    officialProject: false,
    program: "spl-token",
    programStatus: "verificado",
    mintAuthority: { state: "activa", status: "verificado" },
    freezeAuthority: { state: "revocada", status: "verificado" },
    supplyAccount: "1000000000000000",
    supplyRpc: "1000000000000000",
    supplyRpcStatus: "verificado",
    decimals: 6,
    name: { text: name, status: "verificado" },
    symbol: { text: symbol, status: "verificado" },
    uri: { text: "https://example.invalid/meta", status: "verificado" },
    metadataMutable: "si",
    extensionsStatus: "no_aplica",
    extensions: [],
    curve: { status: "ausente", present: false },
    largestStatus: "ok",
  };
}

async function assertLookalike(name: string, symbol: string, quoted: string) {
  const { summaryFromCard } = await load();
  const summary = summaryFromCard(cloneCard("ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump", name, symbol));
  const attention = block(summary, "atencion").items;
  assert.equal(attention[0]?.lead.es, "Se llama como ORVUPI, pero no es la dirección oficial.");
  const identity = block(summary, "comprobado").items.find((item) => item.title.es === "Nombre y símbolo");
  assert.equal(identity?.lead.es, `Dice llamarse ${quoted} (texto elegido por quien creó el token).`);
  assert.equal(/[\u200B\u202E\u202A-\u202E]/.test(identity?.lead.es ?? ""), false);
  const supply = block(summary, "comprobado").items.find((item) => item.title.es === "Suministro total");
  assert.match(supply?.lead.es ?? "", /^Hay 1\.000\.000\.000 tokens/);
  assert.equal((supply?.lead.es ?? "").includes(symbol), false);
}
