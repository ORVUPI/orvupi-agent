import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../src/paths.js";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const STUBX = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";

type SummaryModule = {
  buildReadingSummary: (view: Record<string, unknown>) => Summary;
  summaryFromCard: (card: Record<string, unknown>) => Summary;
};

type Summary = {
  title: { es: string; en: string };
  retry: boolean;
  blocks: Array<{
    id: string;
    heading: { es: string; en: string };
    items: Array<{ topic: string; text: { es: string; en: string } }>;
    empty: { es: string; en: string };
  }>;
};

async function load(): Promise<SummaryModule> {
  return (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/reading-summary.js")).href)) as SummaryModule;
}

function block(summary: Summary, id: string) {
  const found = summary.blocks.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

function joined(summary: Summary, lang: "es" | "en") {
  return summary.blocks
    .flatMap((item) => [item.heading[lang], item.empty[lang], ...item.items.map((point) => point.text[lang])])
    .join("\n");
}

describe("resumen de la lectura", () => {
  test("USDC: lo leído, el permiso de emisión con contexto y la curva que no aplica", async () => {
    const { buildReadingSummary, summaryFromCard } = await load();
    const summary = buildReadingSummary({
      ok: true,
      kind: "lectura",
      facts: [
        { id: "suministro", label: { es: "Suministro en los bytes del mint", en: "Supply in the mint bytes" }, state: "ok" },
        { id: "suministro-extra", label: { es: "Consulta extra del suministro", en: "Extra supply query" }, state: "ok" },
        { id: "metadatos", label: { es: "Metadatos", en: "Metadata" }, state: "ok" },
        { id: "enlace", label: { es: "Enlace de metadatos", en: "Metadata link" }, state: "ausente" },
        { id: "cuentas", label: { es: "Cuentas con más tokens", en: "Largest token accounts" }, state: "ausente" },
        { id: "curva", label: { es: "Curva", en: "Curve" }, state: "no_aplica" },
      ],
      signals: [
        { id: "emision", level: "atencion", title: { es: "Alguien puede crear más tokens", en: "Someone can create more tokens" }, explain: { es: "activa", en: "active" } },
        { id: "congelacion", level: "neutro", title: { es: "Nadie puede congelar cuentas con ese permiso", en: "Nobody can freeze accounts with that permission" } },
        { id: "mutable", level: "atencion", title: { es: "El nombre se puede cambiar", en: "The name can be changed" }, explain: { es: "puede actualizar", en: "can update" } },
        { id: "curva", level: "neutro", title: { es: "Curva", en: "Curve" }, explain: { es: "No aplica: este token no se creó en Pump.fun", en: "Not applicable" } },
      ],
    });
    assert.equal(summary.title.es, "Resumen");
    assert.equal(summary.title.en, "Summary");
    assert.deepEqual(summary.blocks.map((item) => item.heading.es), ["Qué se comprobó", "Qué requiere atención", "Qué falta"]);
    assert.deepEqual(summary.blocks.map((item) => item.heading.en), ["What was checked", "What needs attention", "What is missing"]);
    const checked = block(summary, "comprobado");
    assert.match(checked.items.map((item) => item.text.es).join(" | "), /Suministro en los bytes del mint/);
    assert.match(checked.items.map((item) => item.text.es).join(" | "), /No aplica: este token no se creó en Pump.fun/);
    assert.equal(checked.items.find((item) => item.text.es.includes("No aplica"))?.topic, "curva");
    const attention = block(summary, "atencion");
    assert.match(attention.items.map((item) => item.text.es).join(" "), /moneda estable/);
    assert.match(attention.items.map((item) => item.text.en).join(" "), /stablecoin/);
    assert.match(attention.items.map((item) => item.text.es).join(" "), /promete el proyecto/);
    assert.match(attention.items.map((item) => item.text.es).join(" "), /no es una suplantación/);
    assert.equal(attention.items.every((item) => item.topic === "permisos" || item.topic === "metadatos"), true);
    assert.equal(summary.retry, false);
    assert.match(joined(summary, "es"), /Qué falta/);
    const card = summaryFromCard({
      mint: USDC,
      program: "spl-token",
      programStatus: "verificado",
      mintAuthority: { state: "activa", status: "verificado" },
      freezeAuthority: { state: "revocada", status: "verificado" },
      supplyAccount: "1000",
      supplyRpc: "1000",
      supplyRpcStatus: "verificado",
      decimals: 6,
      name: { text: "USDC", status: "verificado" },
      symbol: { text: "USDC", status: "verificado" },
      uri: { text: null, status: "ausente" },
      metadataMutable: "si",
      extensionsStatus: "no_aplica",
      curve: { status: "no_aplica", present: false },
      largestStatus: "ausente",
    });
    assert.match(block(card, "atencion").items.map((item) => item.text.es).join(" "), /moneda estable/);
    assert.match(block(card, "comprobado").items.map((item) => item.text.es).join(" "), /No aplica: este token no se creó en Pump.fun/);
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
    assert.match(attention.empty.en, /does not mean there is no risk/);
    assert.match(block(summary, "comprobado").items.map((item) => item.text.es).join(" "), /Suministro en los bytes del mint/);
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
    assert.match(block(card, "comprobado").items.map((item) => item.text.es).join(" "), /Permiso de emisión/);
    assert.equal(joined(card, "es").includes("moneda estable"), false);
  });

  test("una consulta fallida va a Qué falta y se puede reintentar, sin tratarla como concentración", async () => {
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
          explain: { es: "El servicio público no respondió, prueba otra vez en un minuto.", en: "The public service did not respond, try again in a minute." },
        },
      ],
    });
    const missing = block(summary, "falta");
    assert.match(missing.items.map((item) => item.text.es).join(" | "), /Consulta extra del suministro: consulta fallida/);
    assert.match(missing.items.map((item) => item.text.es).join(" | "), /Cuentas con más tokens: consulta fallida/);
    assert.match(missing.items.map((item) => item.text.en).join(" | "), /failed query/);
    assert.equal(missing.items.find((item) => item.text.es.startsWith("Cuentas"))?.topic, "distribucion");
    assert.equal(summary.retry, true);
    assert.equal(block(summary, "atencion").items.some((item) => item.text.es.includes("parte grande")), false);
    const whole = buildReadingSummary({ ok: false, kind: "red", facts: [], signals: [] });
    assert.equal(whole.retry, true);
    assert.match(block(whole, "falta").items.map((item) => item.text.es).join(" "), /Esta lectura: consulta fallida/);
    const card = summaryFromCard({
      mint: USDC,
      program: "spl-token",
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
      extensionsStatus: "no_aplica",
      curve: { status: "no_aplica", present: false },
      largestStatus: "fallo",
    });
    assert.equal(card.retry, true);
    assert.match(block(card, "falta").items.map((item) => item.text.es).join(" "), /Consulta extra del suministro/);
    assert.match(block(card, "falta").items.map((item) => item.text.es).join(" "), /Cuentas con más tokens/);
    for (const lang of ["es", "en"] as const) {
      const text = `${joined(summary, lang)}\n${joined(card, lang)}\n${joined(whole, lang)}`;
      assert.equal(/\b(precio|compra|comprar|seguro|buy|sell|score)\b/i.test(text), false);
    }
  });
});
