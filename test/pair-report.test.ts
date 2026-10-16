import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { canonicalJson as verifyCanonical } from "../verify/bytes.js";
import { repoRoot } from "../src/paths.js";

const reportUrl = pathToFileURL(path.join(repoRoot(), "web/v2/modules/pair-report.mjs")).href;
const readUrl = pathToFileURL(path.join(repoRoot(), "pares/chain-read.mjs")).href;
const OFFICIAL = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const OTHER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const FOOTER_ES = "Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión.";
const FOOTER_EN = "High-risk crypto · You could lose everything · Not investment advice.";

function curve(quoteSol: boolean, complete = false, quoteMint: string | null = null) {
  return { quoteSol, complete, quoteMint };
}

function fakeContext() {
  const texts: string[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    canvas: undefined as undefined,
    fillRect() {},
    fillText(text: string) {
      texts.push(text);
    },
    measureText(text: string) {
      return { width: text.length * 8 };
    },
  };
  return { ctx, texts };
}

describe("informe de pares", () => {
  test("la moneda base no se inventa y el informe no lleva ruta", async () => {
    const { describePair, evidenceRecord } = await import(reportUrl);
    assert.equal(describePair({ ok: false }).curve, "no_disponible");
    assert.equal(Object.hasOwn(describePair({ ok: false }), "route"), false);
    assert.equal(Object.hasOwn(describePair({ ok: false }), "connector"), false);
    const missing = describePair({ ok: true, curve: null, fees: null });
    assert.equal(missing.curve, "sin_curva");
    assert.equal(missing.base, "desconocida");
    const closed = describePair({ ok: true, curve: curve(true, true), fees: null });
    assert.equal(closed.curve, "completa");
    assert.equal(closed.base, "SOL");
    const other = describePair({ ok: true, curve: curve(false, false, OTHER), fees: null });
    assert.equal(other.curve, "abierta");
    assert.equal(other.base, OTHER);
    const open = describePair({
      ok: true,
      curve: curve(true, false, null),
      fees: { protocol: { status: "leida", bps: 95n }, creator: { status: "leida", bps: 5n } },
    });
    assert.equal(open.curve, "abierta");
    assert.equal(open.protocolFeeBps, 95);
    assert.equal(open.creatorFeeBps, 5);
    const downloaded = evidenceRecord({
      mint: OTHER,
      name: "Ejemplo",
      uri: null,
      base: open.base,
      curve: open.curve,
      protocolFeeBps: open.protocolFeeBps,
      creatorFeeBps: open.creatorFeeBps,
      slot: 1,
      source: "solana-rpc.publicnode.com",
      readAt: "2026-10-10T10:00:00.000Z",
    });
    assert.equal(downloaded.curve, "abierta");
    assert.equal(Object.hasOwn(downloaded, "route"), false);
    assert.equal(Object.hasOwn(downloaded, "connector"), false);
    const absent = describePair({
      ok: true,
      curve: curve(true),
      fees: { protocol: { status: "ausente" }, creator: { status: "ilegible" } },
    });
    assert.equal(absent.protocolFeeBps, null);
    assert.equal(absent.creatorFeeBps, null);
    const zero = describePair({
      ok: true,
      curve: curve(true),
      fees: { protocol: { status: "leida", bps: 0n }, creator: { status: "ausente" } },
    });
    assert.equal(zero.protocolFeeBps, 0);
  });

  test("el hash cambia si cambia la evidencia y no certifica verdad", async () => {
    const { canonicalJson, evidenceRecord, sha256Hex, snapshotLines, drawSnapshot } = await import(reportUrl);
    const sample = { version: "u09-pares-1", mint: OTHER, nested: { b: 1, a: null } };
    assert.equal(canonicalJson(sample), verifyCanonical(sample));
    const evidence = evidenceRecord({
      mint: OTHER,
      name: "<script>alert(1)</script>",
      uri: "https://evil.example/meta.json",
      base: "SOL",
      curve: "abierta",
      protocolFeeBps: 95,
      creatorFeeBps: null,
      slot: 454936125,
      source: "solana-rpc.publicnode.com",
      readAt: "2026-10-10T10:00:00.000Z",
    });
    const digest = await sha256Hex(canonicalJson(evidence));
    const copy = { ...evidence, mint: OFFICIAL, official: false };
    assert.notEqual(await sha256Hex(canonicalJson(copy)), digest);
    assert.equal(await sha256Hex(canonicalJson({ ...evidence })), digest);
    const { ctx, texts } = fakeContext();
    const lines = snapshotLines(evidence, "es");
    drawSnapshot(ctx, lines);
    const card = texts.join("\n");
    assert.match(card, /2026-10-10T10:00:00.000Z/);
    assert.match(card, /Instantánea: puede haber cambiado/);
    assert.match(card, /No es una auditoría ni una recomendación\./);
    assert.match(card, /ORVUPI no revisa ni respalda este token\./);
    assert.match(card, /Un emparejamiento no es una colaboración ni un respaldo\./);
    assert.match(card, /<script>alert\(1\)<\/script>/);
    assert.equal(card.includes(FOOTER_ES), false);
    assert.match(card, /generado con stubxai.com\/verify/);
    assert.equal(/\b(verificado|seguro|aprobado|socio)\b/i.test(card), false);
    assert.match(card, /creator_fee_basis_points/);
    const plain = lines.map((line: { text: string }) => line.text).join("\n");
    assert.match(plain, /Puede no coincidir con la comisión de una operación concreta; consulta la documentación de Pump\.fun\./);
    assert.match(card.replaceAll("\n", " "), /Puede no coincidir con la comisión de una operación concreta; consulta la documentación de Pump\.fun\./);
    assert.equal(/comisión de creación/i.test(card), false);
    assert.equal(/se cobraría/i.test(card), false);
    const official = snapshotLines(evidenceRecord({ ...evidence, mint: OFFICIAL }), "en");
    const english = official.map((line: { text: string }) => line.text).join("\n");
    assert.match(english, /ORVUPI does not review or endorse this token\./); // sin contrato ORVUPI, ninguna dirección coincide
    assert.equal(english.includes(FOOTER_EN), false);
    assert.equal(/\b(verified|safe|approved|partner)\b/i.test(english), false);
  });

  test("los metadatos con script siguen siendo texto", async () => {
    const { METADATA_PROGRAM, decodeMetadata, encodeMetadataAccount } = await import(readUrl);
    const name = "<script>alert(1)</script>";
    const data = encodeMetadataAccount(OTHER, name, "X", "https://evil.example/meta.json");
    const decoded = decodeMetadata(METADATA_PROGRAM, data, OTHER);
    assert.equal(decoded?.name, name);
    assert.equal(decoded?.uri, "https://evil.example/meta.json");
    const sources = ["web/v2/modules/pair-report.mjs", "pares/chain-read.mjs", "web/v2/assets/pares.mjs"]
      .map((file) => readFileSync(path.join(repoRoot(), file), "utf8"))
      .join("\n");
    assert.equal(sources.includes("sendTransaction"), false);
    assert.equal(sources.includes("signTransaction"), false);
    assert.equal(sources.includes("simulateTransaction"), false);
    assert.equal(sources.includes("innerHTML"), false);
  });

  test("un nombre largo se recorta en la instantánea y el hash usa el nombre entero", async () => {
    const { clipTokenName, evidenceRecord, canonicalJson, sha256Hex, snapshotLines, NAME_LIMIT } = await import(reportUrl);
    const full = "N".repeat(200);
    assert.equal(clipTokenName(full).length, NAME_LIMIT + 1);
    assert.notEqual(clipTokenName(full), full);
    assert.equal(clipTokenName(full).endsWith("…"), true);
    const evidence = evidenceRecord({
      mint: OTHER,
      name: full,
      uri: null,
      base: "SOL",
      curve: "abierta",
      protocolFeeBps: null,
      creatorFeeBps: null,
      slot: 1,
      source: "solana-rpc.publicnode.com",
      readAt: "2026-10-10T10:00:00.000Z",
    });
    assert.equal(evidence.name, full);
    const digest = await sha256Hex(canonicalJson(evidence));
    assert.equal(await sha256Hex(canonicalJson({ ...evidence, name: full })), digest);
    const lines = snapshotLines(evidence, "es");
    const nameLine = lines.map((line: { text: string }) => line.text).find((text: string) => text.startsWith("Nombre leído"));
    assert.ok(nameLine);
    assert.equal(nameLine.includes(full), false);
    assert.match(nameLine, /N{48}…/);
  });

  test("el recorte del PNG quita RTL y ancho cero y no parte emojis", async () => {
    const { clipTokenName, NAME_LIMIT } = await import(reportUrl);
    const rtl = "Nombre\u202Eoficial\u200B\u200C\u2060\uFEFF\u2066";
    assert.equal(clipTokenName(rtl), "Nombreoficial");
    assert.equal(/[\u202A-\u202E\u2066-\u2069\u200B\u200C\uFEFF]/.test(clipTokenName(rtl)), false);
    const messy = `${"A".repeat(10)}\u202E${"B".repeat(50)}`;
    assert.equal(clipTokenName(messy), `${"A".repeat(10)}${"B".repeat(38)}…`);
    const hidden = `${"N".repeat(48)}${"\u200B".repeat(20)}TAIL`;
    assert.equal(clipTokenName(hidden), `${"N".repeat(48)}…`);
    assert.equal(clipTokenName("A\u200DB"), "AB");
    const emoji = "😀";
    const family = "👨‍👩‍👧‍👦";
    const many = emoji.repeat(50);
    const cut = clipTokenName(many);
    assert.equal(cut, `${emoji.repeat(NAME_LIMIT)}…`);
    assert.equal([...cut.slice(0, -1)].every((char) => char === emoji), true);
    const atBoundary = `${"N".repeat(NAME_LIMIT - 1)}${family}Z`;
    const kept = clipTokenName(atBoundary);
    assert.equal(kept, `${"N".repeat(NAME_LIMIT - 1)}${family}…`);
    assert.equal(kept.includes(family), true);
    assert.equal(clipTokenName(`${"A".repeat(47)}${family}`), `${"A".repeat(47)}${family}`);
  });

  test("la lectura de la cadena no se publica como módulo", async () => {
    const bundleUrl = pathToFileURL(path.join(repoRoot(), "web/v2/tools/bundle-pares.mjs")).href;
    const { bundlePares } = await import(bundleUrl);
    const published = path.join(repoRoot(), "web/v2/assets/pares.mjs");
    assert.equal(readFileSync(published, "utf8"), bundlePares());
    assert.equal(existsSync(path.join(repoRoot(), "web/v2/modules/chain-read.mjs")), false);
    assert.equal(existsSync(path.join(repoRoot(), "web/v2/modules/curve-math.mjs")), false);
    const source = readFileSync(published, "utf8");
    assert.equal(source.includes("../modules/chain-read.mjs"), false);
    assert.equal(source.includes("function readCurveState"), true);
  });

  test("la séptima lectura en un minuto no llama al transporte", async () => {
    const { readWithinLimit } = await import(reportUrl);
    let stamps: number[] = [];
    let calls = 0;
    const now = 1_700_000_000_000;
    for (let i = 0; i < 7; i += 1) {
      const gate = await readWithinLimit(stamps, now + i, async () => {
        calls += 1;
        return "leido";
      });
      stamps = gate.stamps;
    }
    assert.equal(calls, 6);
  });
});
