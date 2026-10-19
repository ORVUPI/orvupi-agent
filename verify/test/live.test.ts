import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import { clearRpcBlocks } from "../rpc.js";
import { TOKEN_2022_PROGRAM, PUMP_PROGRAM, bondingCurvePda, metadataPda } from "../programs.js";
import { formatUnitsLocale } from "../bytes.js";
import { clipForeign, readAnyMint, readLargestAccounts, takeQuerySlot, type LiveReading } from "../signals.js";
import { repoRootFrom } from "../root.js";
import type { CanonicalToken } from "../types.js";
import type { RpcTransport } from "../rpc.js";
import { labFixtures, type AccountFixture, type LabFixture } from "./layouts.js";

beforeEach(() => {
  clearRpcBlocks();
});

const root = repoRootFrom(import.meta.url);
const registry = (
  JSON.parse(readFileSync(path.join(root, "verify/test/fixtures/registry-demo.json"), "utf8")) as { tokens: CanonicalToken[] }
).tokens;
const PUMP = Uint8Array.from([23, 183, 248, 55, 96, 216, 172, 96]);

function ok(slot: number, value: unknown): { status: number; body: string } {
  return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: { context: { slot }, value } }) };
}

function accountJson(account: AccountFixture | { owner: string; data: Uint8Array } | null): unknown {
  if (!account) {
    return null;
  }
  const data = "dataBase64" in account ? account.dataBase64 : Buffer.from(account.data).toString("base64");
  return {
    owner: account.owner,
    lamports: "lamports" in account ? account.lamports : 1,
    executable: false,
    space: "space" in account ? account.space : Buffer.from(data, "base64").length,
    data: [data, "base64"],
  };
}

function transportFor(input: {
  slot: number;
  accounts: Map<string, AccountFixture | { owner: string; data: Uint8Array } | null>;
  supply: { amount: string; decimals: number } | null;
  largest: Array<{ address: string; amount: string; decimals: number }> | null;
  failEndpoint?: string;
  timeout?: boolean;
}): RpcTransport {
  return async (endpoint, body) => {
    if (input.timeout) {
      throw new Error("The operation was aborted due to timeout");
    }
    if (input.failEndpoint && endpoint === input.failEndpoint) {
      return { status: 429, body: "" };
    }
    const request = JSON.parse(body) as { method: string; params: unknown[] };
    if (request.method === "getMultipleAccounts") {
      const ids = request.params[0] as string[];
      return ok(
        input.slot,
        ids.map((id) => accountJson(input.accounts.get(id) ?? null)),
      );
    }
    if (request.method === "getTokenSupply") {
      if (!input.supply) {
        return { status: 500, body: "" };
      }
      return ok(input.slot, input.supply);
    }
    if (request.method === "getTokenLargestAccounts") {
      if (!input.largest) {
        return { status: 429, body: "" };
      }
      return ok(input.slot, input.largest);
    }
    throw new Error(`método inesperado ${request.method}`);
  };
}

async function readFixture(fixture: LabFixture, endpoints = ["https://rpc-a.invalid"]): Promise<LiveReading> {
  const accounts = new Map<string, AccountFixture | null>();
  accounts.set(fixture.mint, fixture.mintAccount);
  accounts.set(metadataPda(fixture.mint), fixture.metaplex);
  accounts.set(bondingCurvePda(fixture.mint), fixture.curve);
  const supply = fixture.supply && !("error" in fixture.supply) ? fixture.supply : null;
  const largest = Array.isArray(fixture.largest) ? fixture.largest : null;
  return readAnyMint({
    mint: fixture.mint,
    registry,
    endpoints,
    transport: transportFor({ slot: fixture.slot, accounts, supply, largest }),
    maxRetries: 0,
    minIntervalMs: 0,
    sleep: async () => {},
  });
}

function fixture(id: string): LabFixture {
  const found = labFixtures().find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

function textOf(reading: LiveReading): string {
  return JSON.stringify(reading);
}

function u64(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let rest = value;
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function tlv(type: number, value: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + value.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, type, true);
  view.setUint16(2, value.length, true);
  out.set(value, 4);
  return out;
}

describe("lectura universal con RPC simulado", () => {
  test("una dirección inválida no llama al servicio", async () => {
    let called = false;
    const reading = await readAnyMint({
      mint: "no es una direccion",
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async () => {
        called = true;
        return { status: 200, body: "" };
      },
      maxRetries: 0,
      minIntervalMs: 0,
    });
    assert.equal(called, false);
    assert.equal(reading.kind, "invalida");
    assert.equal(reading.ok, false);
  });

  test("el mint revocado se lee sin puntuación", async () => {
    const reading = await readFixture(fixture("revoked-mint"));
    assert.equal(reading.ok, true);
    assert.equal(reading.title.es, "Lectura de este token");
    assert.equal(reading.signals.find((item) => item.id === "emision")?.level, "neutro");
    assert.equal(reading.signals.find((item) => item.id === "congelacion")?.level, "neutro");
    assert.match(textOf(reading), /Cuentas con tokens/);
    assert.equal(/\bholders?\b|reserva|\breserve\b|scam|recomendado|\bseguro\b/i.test(textOf(reading)), false);
  });

  test("la congelación activa es una señal y no un veredicto de estafa", async () => {
    const reading = await readFixture(fixture("active-freeze"));
    assert.equal(reading.title.es, "Lectura de este token");
    assert.equal(reading.signals.find((item) => item.id === "congelacion")?.level, "riesgo");
    assert.equal(reading.signals.find((item) => item.id === "emision")?.level, "atencion");
    assert.match(reading.signals.find((item) => item.id === "emision")?.explain.es ?? "", /moneda estable/);
    assert.match(reading.signals.find((item) => item.id === "emision")?.explain.es ?? "", /suministro fijo/);
    assert.equal(/estafa|acus/i.test(reading.signals.find((item) => item.id === "emision")?.explain.es ?? ""), false);
    assert.match(reading.signals.find((item) => item.id === "cuentas")?.explain.es ?? "", /No es un censo/);
    assert.equal(/no se pide sola/.test(reading.signals.find((item) => item.id === "cuentas")?.explain.es ?? ""), false);
    assert.equal(/scam|recomendado|\bseguro\b/i.test(textOf(reading)), false);
  });

  test("un nombre parecido a STUB con otra dirección no es la CA oficial", async () => {
    const reading = await readFixture(fixture("name-impersonation"));
    assert.equal(reading.title.es, "Lectura de este token");
    assert.match(reading.support.es, /No está en el registro curado/);
    assert.equal(reading.signals.find((item) => item.id === "copia")?.title.es, "Se parece a un token del registro curado, pero la dirección es otra");
    assert.equal(reading.signals.find((item) => item.id === "copia")?.level, "atencion");
    const name = reading.rows.find((row) => row.label.es === "Nombre");
    assert.equal(name?.value.es, "Dice llamarse «Comunidad STUB»");
    assert.equal(name?.value.en, "It says it is called «Comunidad STUB»");
    assert.equal(reading.signals.find((item) => item.id === "metadatos")?.title.es, "Nombre: Dice llamarse «Comunidad STUB»");
    assert.equal(reading.light, "atencion");
    assert.equal(reading.mint === registry[0]?.mint, false);
    const locked = reading.signals.find((item) => item.id === "mutable");
    assert.match(locked?.explain.es ?? "", /los metadatos ya no se pueden cambiar/);
    assert.match(locked?.explain.en ?? "", /the metadata can no longer be changed/);
    assert.equal((locked?.explain.es ?? "").includes("isMutable"), false);
    assert.equal((locked?.explain.en ?? "").includes("isMutable"), false);
  });

  test("los textos visibles no usan nombres de campo", async () => {
    const technical = /isMutable|is_mutable|updateAuthority|mintAuthority|freezeAuthority|InterestBearingConfig|TransferFeeConfig|TokenMetadata|MetadataPointer|CpiGuard|PermanentDelegate|DefaultAccountState|getMultipleAccounts|getTokenSupply|getAccountInfo|ausente comprobado|consulta fallida/;
    for (const id of ["revoked-mint", "name-impersonation", "mutable-metadata", "unsupported-extension"]) {
      const reading = await readFixture(fixture(id));
      const bits = [
        reading.title.es,
        reading.title.en,
        reading.support.es,
        reading.support.en,
        ...reading.signals.flatMap((signal) => [signal.title.es, signal.title.en, signal.explain.es, signal.explain.en]),
        ...reading.rows.flatMap((row) => [row.label.es, row.label.en, row.value.es, row.value.en]),
      ].join("\n");
      const found = bits.match(technical);
      assert.equal(found, null, `${id} ${found?.[0] ?? ""}`);
    }
    const unknown = await readFixture(fixture("unsupported-extension"));
    assert.equal(unknown.signals.some((signal) => signal.title.es === "Extensión no descrita"), true);
    assert.equal(unknown.signals.some((signal) => signal.title.es.includes("InterestBearing")), false);
  });

  test("la vista principal no dice mint y el slot queda en los detalles con segundos", async () => {
    const spl = await readFixture(fixture("revoked-mint"));
    const program = spl.signals.find((item) => item.id === "programa");
    const supply = spl.signals.find((item) => item.id === "suministro");
    assert.equal(program?.explain.es, "Es un token del programa SPL Token. Ese programa no trae las extensiones de Token-2022.");
    assert.match(program?.explain.en ?? "", /token of the SPL Token program/);
    assert.match(supply?.explain.es ?? "", /leídos de los datos del token en la cadena/);
    assert.match(supply?.explain.en ?? "", /token data on the chain/);
    const main = [
      spl.lightLabel.es,
      spl.lightLabel.en,
      spl.title.es,
      spl.title.en,
      spl.support.es,
      spl.support.en,
      ...spl.signals.flatMap((signal) => [signal.title.es, signal.title.en, signal.explain.es, signal.explain.en]),
    ].join("\n");
    assert.equal(/\bmint\b/i.test(main), false);
    assert.equal(/\bslot\b/i.test(main), false);
    const clock = spl.rows.find((row) => row.label.es === "Momento");
    assert.match(clock?.value.es ?? "", /slot \d+/);
    assert.match(clock?.value.es ?? "", /\d{2}:\d{2}:\d{2}/);
    assert.match(clock?.value.en ?? "", /slot \d+/);
    assert.match(clock?.value.en ?? "", /\d{2}:\d{2}:\d{2}/);
    const token2022 = await readFixture(fixture("name-impersonation"));
    assert.match(token2022.signals.find((item) => item.id === "programa")?.explain.es ?? "", /Es un token del programa Token-2022/);
  });

  test("la dirección del registro se reconoce", async () => {
    const mint = registry[0]?.mint ?? "";
    const sample = fixture("revoked-mint");
    const reading = await readAnyMint({
      mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: 1,
        accounts: new Map([
          [mint, sample.mintAccount],
          [metadataPda(mint), null],
          [bondingCurvePda(mint), null],
        ]),
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: [{ address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", decimals: 6 }],
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.title.es, "Esta dirección está en el registro curado");
    assert.equal(reading.light, "ok");
    assert.equal(reading.signals.find((item) => item.id === "emision")?.level, "ok");
    assert.equal(reading.signals.find((item) => item.id === "congelacion")?.level, "ok");
    assert.match(reading.rows.map((row) => row.label.es).join(" "), /Momento/);
    assert.match(reading.rows.map((row) => row.value.es).join(" "), /slot 1/);
    assert.equal(reading.canSample, false);
    assert.match(reading.signals.find((item) => item.id === "suministro")?.explain.es ?? "", /Hay 1\.000\.000\.000 tokens/);
    assert.match(reading.signals.find((item) => item.id === "suministro")?.explain.en ?? "", /There are 1,000,000,000 tokens/);
    assert.equal(formatUnitsLocale(7840780507370947n, 6, "es"), "7.840.780.507,370947");
    assert.equal(formatUnitsLocale(7840780507370947n, 6, "en"), "7,840,780,507.370947");
    assert.equal((reading.missing?.es ?? "").includes("ausente comprobado"), false);
    assert.match(reading.absent?.es ?? "", /Comprobado: no existe/);
    assert.match(reading.missing?.es ?? "", /No falta/);
    assert.match(reading.report?.es ?? "", /Qué se comprobó/);
    assert.match(reading.report?.es ?? "", /Qué requiere atención/);
    assert.match(reading.report?.es ?? "", /Qué falta/);
    assert.equal((reading.identity?.es ?? "").includes(mint), true);
  });

  test("si falla getMultipleAccounts faltan suministro, decimales y cuentas", async () => {
    const reading = await readAnyMint({
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async () => ({ status: 500, body: "" }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.ok, false);
    for (const id of ["suministro", "decimales", "cuentas"]) {
      assert.equal(reading.facts?.find((item) => item.id === id)?.state, "fallo", id);
    }
    assert.match(reading.missing?.es ?? "", /Suministro/);
    assert.match(reading.missing?.es ?? "", /Decimales/);
    assert.match(reading.missing?.es ?? "", /Cuentas con más tokens/);
    assert.equal((reading.missing?.es ?? "").includes("ausente comprobado"), false);
  });

  test("una muestra vacía de cuentas no es una ausencia", async () => {
    const reading = await readFixture(fixture("revoked-mint"));
    const cuentas = reading.facts?.find((item) => item.id === "cuentas");
    assert.equal(cuentas?.state, "fallo");
    assert.equal(reading.shown && "largestStatus" in reading.shown ? reading.shown.largestStatus : null, "fallo");
    assert.equal(reading.canSample, true);
    assert.match(reading.missing?.es ?? "", /Cuentas con más tokens/);
    assert.equal((reading.missing?.es ?? "").includes("ausente comprobado"), false);
    assert.equal((reading.absent?.es ?? "").includes("Cuentas"), false);
    const explain = reading.signals.find((item) => item.id === "cuentas")?.explain.es ?? "";
    assert.equal(/ausencia comprobada|ausente comprobado/.test(explain), false);
    assert.match(explain, /No se leyó/);
    assert.match(explain, /concentración de cero/);
    const sample = fixture("revoked-mint");
    const limited = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: sample.slot,
        accounts: new Map([
          [sample.mint, sample.mintAccount],
          [metadataPda(sample.mint), null],
          [bondingCurvePda(sample.mint), null],
        ]),
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: null,
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(limited.facts?.find((item) => item.id === "cuentas")?.state, "fallo");
    assert.equal((limited.missing?.es ?? "").includes("ausente comprobado"), false);
    assert.match(limited.signals.find((item) => item.id === "cuentas")?.explain.es ?? "", /concentración de cero/);
  });

  test("una cuenta ausente y una que no es mint no se rellenan", async () => {
    const missing = await readFixture(fixture("missing-account"));
    assert.equal(missing.title.es, "Esta dirección no existe");
    const other = await readFixture(fixture("not-a-mint"));
    assert.equal(other.title.es, "Esta cuenta no es un token");
  });

  test("si el suministro no cuadra no hay porcentajes", async () => {
    const reading = await readFixture(fixture("supply-mismatch"));
    const supply = reading.signals.find((item) => item.id === "suministro");
    assert.equal(supply?.level, "atencion");
    assert.match(supply?.explain.es ?? "", /No se calculan porcentajes/);
    assert.equal(reading.signals.some((item) => item.id === "fuentes"), false);
    assert.equal(reading.sources.some((item) => item.host === "api.mainnet-beta.solana.com"), false);
    const sample = reading.signals.find((item) => item.id === "cuentas");
    assert.equal(/\d+(?:\.\d+)? %/.test(sample?.explain.es ?? ""), false);
  });

  test("el límite en el primer servicio usa el segundo", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: transportFor({
        slot: sample.slot,
        accounts,
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: [],
        failEndpoint: "https://rpc-a.invalid",
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.ok, true);
    assert.equal(reading.usedFallback, true);
    assert.equal(reading.endpointHost, "rpc-b.invalid");
    const refused = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body) => {
        if (endpoint === "https://rpc-a.invalid") {
          return { status: 403, body: "" };
        }
        return transportFor({
          slot: sample.slot,
          accounts,
          supply: { amount: "1000000000000000", decimals: 6 },
          largest: [],
        })(endpoint, body, 8000);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(refused.ok, true);
    assert.equal(refused.usedFallback, true);
    assert.equal(refused.endpointHost, "rpc-b.invalid");
    assert.match(refused.rows.map((row) => row.value.es).join(" "), /slot/);
    clearRpcBlocks();
    const aboutTheMint = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body) => {
        if (endpoint === "https://rpc-a.invalid") {
          return {
            status: 200,
            body: JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32602, message: "Invalid param: not a Token mint" },
              id: 1,
            }),
          };
        }
        return transportFor({
          slot: sample.slot,
          accounts,
          supply: { amount: "1000000000000000", decimals: 6 },
          largest: [],
        })(endpoint, body, 8000);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(aboutTheMint.ok, false);
    assert.equal(aboutTheMint.usedFallback, false);
    assert.equal(aboutTheMint.title.es, "No se pudo comprobar");
    assert.notEqual(aboutTheMint.light, "ok");
    clearRpcBlocks();
    const bothDown = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async () => ({ status: 403, body: "" }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(bothDown.ok, false);
    assert.equal(bothDown.usedFallback, true);
    assert.equal(bothDown.title.es, "No se pudo comprobar");
    assert.equal(bothDown.light, "neutro");
    clearRpcBlocks();
    const supplyRefused = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getTokenSupply") {
          return { status: 403, body: "" };
        }
        return transportFor({
          slot: sample.slot,
          accounts,
          supply: { amount: "1000000000000000", decimals: 6 },
          largest: [],
        })(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(supplyRefused.ok, true);
    assert.equal(supplyRefused.title.es === "No se pudo comprobar", false);
    const supplyHosts = supplyRefused.rows.map((row) => row.value.es).join(" ");
    assert.match(supplyHosts, /rpc-a\.invalid/);
    assert.equal(supplyHosts.includes("rpc-b.invalid"), false);
    assert.match(supplyRefused.signals.find((item) => item.id === "suministro")?.explain.es ?? "", /no respondió/);
  });

  test("un fallo de getTokenSupply no junta servicios ni baja la lectura", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [{ address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", decimals: 6 }],
    });
    const supplyCalls: string[] = [];
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getTokenSupply") {
          supplyCalls.push(endpoint);
          return { status: 429, body: "" };
        }
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.ok, true);
    assert.deepEqual(supplyCalls, ["https://api.mainnet-beta.solana.com"]);
    const text = reading.rows.map((row) => `${row.label.es} ${row.value.es}`).join("\n");
    assert.match(text, /rpc-a\.invalid/);
    assert.equal(text.includes("rpc-b.invalid"), false);
    assert.match(text, /slot/);
    assert.match(text, /Madrid/);
    assert.equal(reading.signals.some((item) => item.id === "fuentes"), false);
    assert.equal(text.includes("Esta lectura junta más de un servicio"), false);
    const supply = reading.signals.find((item) => item.id === "suministro");
    assert.equal(supply?.level, "neutro");
    assert.match(supply?.explain.es ?? "", /datos del token en la cadena/);
    assert.match(supply?.explain.es ?? "", /no respondió/);
    assert.equal(reading.light, "neutro");
  });

  test("un 403 de getTokenSupply no baja la CA oficial y solo prueba mainnet-beta", async () => {
    const mint = registry[0]?.mint ?? "";
    assert.equal(mint, "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump");
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [mint, sample.mintAccount],
      [metadataPda(mint), null],
      [bondingCurvePda(mint), null],
    ]);
    const supplyCalls: string[] = [];
    const reading = await readAnyMint({
      mint,
      registry,
      endpoints: ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getTokenSupply") {
          supplyCalls.push(endpoint);
          return { status: 403, body: "" };
        }
        return transportFor({
          slot: sample.slot,
          accounts,
          supply: { amount: "1000000000000000", decimals: 6 },
          largest: [{ address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", decimals: 6 }],
        })(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.deepEqual(supplyCalls, ["https://api.mainnet-beta.solana.com"]);
    assert.equal(reading.ok, true);
    assert.equal(reading.light, "ok");
    assert.equal(reading.title.es, "Esta dirección está en el registro curado");
    const supply = reading.signals.find((item) => item.id === "suministro");
    assert.equal(supply?.level, "neutro");
    assert.match(supply?.explain.es ?? "", /datos del token en la cadena/);
    assert.match(supply?.explain.es ?? "", /no respondió/);
    assert.equal(reading.signals.some((item) => item.id === "fuentes"), false);
    assert.equal(reading.sources.some((item) => item.host === "api.mainnet-beta.solana.com"), false);
    assert.equal(reading.signals.find((item) => item.id === "congelacion")?.level, "ok");
    assert.equal(reading.signals.find((item) => item.id === "emision")?.level, "ok");
  });

  test("una lectura normal no pide suministro ni cuentas grandes a publicnode", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const hosts: Record<string, string[]> = { getTokenSupply: [], getTokenLargestAccounts: [], getMultipleAccounts: [] };
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "7723351880366328", decimals: 6 },
      largest: [],
    });
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (hosts[method]) hosts[method]?.push(new URL(endpoint).hostname);
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.ok, true);
    assert.deepEqual(hosts.getTokenSupply, ["api.mainnet-beta.solana.com"]);
    assert.deepEqual(hosts.getTokenLargestAccounts, ["api.mainnet-beta.solana.com"]);
    // Mint, metadatos y curva de Pump.fun; después, los dos candidatos de Raydium LaunchLab.
    assert.deepEqual(hosts.getMultipleAccounts, ["solana-rpc.publicnode.com", "solana-rpc.publicnode.com"]);
    assert.equal(reading.sources.some((item) => item.host === "api.mainnet-beta.solana.com"), false);
  });

  test("un 403 de mainnet se recuerda y el método no se vuelve a pedir en la sesión", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const calls: string[] = [];
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000", decimals: 6 },
      largest: [],
    });
    const transport: RpcTransport = async (endpoint, body, timeoutMs) => {
      const method = (JSON.parse(body) as { method: string }).method;
      calls.push(`${new URL(endpoint).hostname} ${method}`);
      if (method === "getTokenSupply" || method === "getTokenLargestAccounts") return { status: 403, body: "" };
      return base(endpoint, body, timeoutMs);
    };
    const input = {
      mint: sample.mint,
      registry,
      endpoints: ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"],
      transport,
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    };
    await readAnyMint(input);
    await readAnyMint(input);
    assert.deepEqual(
      calls.filter((item) => item.endsWith(" getTokenSupply")),
      ["api.mainnet-beta.solana.com getTokenSupply"],
    );
    assert.deepEqual(
      calls.filter((item) => item.endsWith(" getTokenLargestAccounts")),
      ["api.mainnet-beta.solana.com getTokenLargestAccounts"],
    );
  });

  test("la lectura automática pide las cuentas más grandes y un fallo aparte no es un censo", async () => {
    const sample = fixture("revoked-mint");
    const methods: string[] = [];
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [],
    });
    await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async (endpoint, body, timeoutMs) => {
        methods.push((JSON.parse(body) as { method: string }).method);
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(methods.includes("getTokenLargestAccounts"), true);
    assert.equal(methods.includes("getTokenSupply"), true);
    const sampleRead = await readLargestAccounts({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async () => ({ status: 429, body: "" }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
      timeoutMs: 6000,
    });
    assert.equal(sampleRead.title.es, "No se pudo comprobar");
    assert.match(sampleRead.explain.es, /No es una concentración de cero/);
    assert.equal(clipForeign("N".repeat(80), false).length, 67);
    assert.equal(takeQuerySlot([0, 1, 2, 3, 4, 5], 10, 6, 60_000).allowed, false);
    assert.equal(takeQuerySlot([0], 70_000, 6, 60_000).allowed, true);
  });

  test("el límite y el tiempo agotado se dicen en claro", async () => {
    const sample = fixture("revoked-mint");
    const limited = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async () => ({ status: 429, body: "" }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(limited.kind, "limite");
    assert.match(limited.support.es, /límite de peticiones/);
    assert.match(limited.support.es, /No se ha inventado un resultado/);
    const timed = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: 1,
        accounts: new Map(),
        supply: null,
        largest: null,
        timeout: true,
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(timed.kind, "tiempo");
    assert.match(timed.support.es, /tiempo de espera/);
  });

  test("las extensiones de riesgo de Token-2022 se nombran", async () => {
    const sample = fixture("revoked-mint");
    const key = new Uint8Array(32);
    key[0] = 4;
    const body = concat(
      tlv(1, new Uint8Array(108)),
      tlv(12, key),
      tlv(14, concat(key, key)),
      tlv(6, Uint8Array.of(2)),
    );
    const data = new Uint8Array(166 + body.length);
    const base = Buffer.from(sample.mintAccount?.dataBase64 ?? "", "base64");
    data.set(base.subarray(0, 82), 0);
    data[165] = 1;
    data.set(body, 166);
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: 4,
        accounts: new Map([
          [sample.mint, { owner: TOKEN_2022_PROGRAM, data }],
          [metadataPda(sample.mint), null],
          [bondingCurvePda(sample.mint), null],
        ]),
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: [],
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    const titles = reading.signals.map((item) => item.title.es).join("\n");
    assert.match(titles, /Comisión de transferencia/);
    assert.match(titles, /Delegado permanente/);
    assert.match(titles, /Gancho de transferencia/);
    assert.match(titles, /Las cuentas nuevas nacen congeladas/);
  });

  test("sin extensiones de riesgo la frase dice que no está todo comprobado", async () => {
    const sample = fixture("revoked-mint");
    const base = Buffer.from(sample.mintAccount?.dataBase64 ?? "", "base64");
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: 6,
        accounts: new Map([
          [sample.mint, { owner: TOKEN_2022_PROGRAM, data: base.subarray(0, 82) }],
          [metadataPda(sample.mint), null],
          [bondingCurvePda(sample.mint), null],
        ]),
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: [],
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    const signal = reading.signals.find((item) => item.id === "extensiones");
    assert.equal(
      signal?.explain.es,
      "No apareció comisión de transferencia, delegado permanente, gancho de transferencia ni estado inicial congelado. Que no aparezcan extensiones no significa que esté todo comprobado.",
    );
    assert.equal(
      signal?.explain.en,
      "No transfer fee, permanent delegate, transfer hook, or frozen default state appeared. No extensions showing does not mean everything was checked.",
    );
    assert.equal(signal?.explain.es.includes("otros riesgos"), false);
    assert.equal(signal?.explain.en.includes("other risks"), false);
  });

  test("la curva usa cantidad real y virtual", async () => {
    const sample = fixture("revoked-mint");
    const curve = concat(PUMP, u64(2000n), u64(100n), u64(500n), u64(50n), u64(1000n), Uint8Array.of(0));
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: 5,
        accounts: new Map<string, AccountFixture | { owner: string; data: Uint8Array } | null>([
          [sample.mint, sample.mintAccount],
          [metadataPda(sample.mint), null],
          [bondingCurvePda(sample.mint), { owner: PUMP_PROGRAM, data: curve }],
        ]),
        supply: { amount: "1000000000000000", decimals: 6 },
        largest: [],
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    const explain = reading.signals.find((item) => item.id === "curva")?.explain.es ?? "";
    assert.match(explain, /Cantidad real de la curva: 500/);
    assert.match(explain, /Cantidad virtual de la curva: 2000/);
    assert.equal(/reserva|\breserve\b|\bfondo\b/i.test(explain), false);
  });

  test("una lista incompleta prueba el otro nodo y si los dos fallan no se pudo comprobar", async () => {
    const sample = fixture("revoked-mint");
    const pump = registry[0]?.mint ?? "";
    assert.equal(pump.endsWith("pump"), true);
    const shortBody = (count: number) => ({
      status: 200,
      body: JSON.stringify({
        jsonrpc: "2.0",
        result: { context: { slot: sample.slot }, value: Array.from({ length: count }, () => null) },
      }),
    });
    for (const count of [0, 2, 4]) {
      for (const mint of [sample.mint, pump]) {
        const calls: string[] = [];
        const reading = await readAnyMint({
          mint,
          registry,
          endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
          transport: async (endpoint, body) => {
            const method = (JSON.parse(body) as { method: string }).method;
            calls.push(`${new URL(endpoint).host} ${method}`);
            return shortBody(count);
          },
          maxRetries: 0,
          minIntervalMs: 0,
          sleep: async () => {},
        });
        assert.equal(reading.ok, false, `${count} ${mint}`);
        assert.equal(reading.title.es, "No se pudo comprobar");
        assert.equal(reading.title.en, "Could not be checked");
        assert.equal(reading.signals.some((item) => item.id === "curva"), false);
        assert.equal(`${reading.support.es} ${reading.support.en}`.includes("No aplica"), false);
        assert.equal(`${reading.support.es} ${reading.support.en}`.includes("Not applicable"), false);
        assert.equal(reading.support.es.includes("no existe"), false);
        assert.equal(reading.usedFallback, true);
        assert.deepEqual(calls, ["rpc-a.invalid getMultipleAccounts", "rpc-b.invalid getMultipleAccounts"]);
      }
    }
    const limited: string[] = [];
    const stayed = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getMultipleAccounts") limited.push(new URL(endpoint).host);
        return shortBody(2);
      },
      maxRetries: 1,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(stayed.ok, false);
    assert.equal(stayed.title.es, "No se pudo comprobar");
    assert.equal(stayed.usedFallback, true);
    assert.deepEqual(limited, ["rpc-a.invalid", "rpc-a.invalid", "rpc-b.invalid", "rpc-b.invalid"]);
    const accounts = new Map<string, AccountFixture | { owner: string; data: Uint8Array } | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [],
    });
    const recoveredCalls: string[] = [];
    const recovered = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid", "https://rpc-b.invalid"],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        recoveredCalls.push(`${new URL(endpoint).host} ${method}`);
        if (method === "getMultipleAccounts" && endpoint === "https://rpc-a.invalid") return shortBody(2);
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(recovered.ok, true);
    assert.equal(recovered.usedFallback, true);
    assert.equal(recovered.facts?.find((item) => item.id === "curva")?.state, "no_aplica");
    assert.deepEqual(
      recoveredCalls.filter((item) => item.endsWith("getMultipleAccounts")),
      ["rpc-a.invalid getMultipleAccounts", "rpc-b.invalid getMultipleAccounts", "rpc-a.invalid getMultipleAccounts"],
    );
    assert.deepEqual(
      recoveredCalls.filter((item) => item.endsWith("getTokenSupply") || item.endsWith("getTokenLargestAccounts")),
      ["api.mainnet-beta.solana.com getTokenSupply", "api.mainnet-beta.solana.com getTokenLargestAccounts"],
    );
  });

  test("un token que no es de Pump.fun deja la curva fuera de lo que falta", async () => {
    const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const sample = fixture("revoked-mint");
    const reading = await readAnyMint({
      mint: usdc,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: transportFor({
        slot: sample.slot,
        accounts: new Map([
          [usdc, sample.mintAccount],
          [metadataPda(usdc), null],
          [bondingCurvePda(usdc), null],
        ]),
        supply: { amount: "1000", decimals: 6 },
        largest: [],
      }),
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    const curve = reading.signals.find((item) => item.id === "curva");
    assert.equal(curve?.title.es, "Curva");
    assert.equal(curve?.title.en, "Curve");
    assert.equal(curve?.explain.es, "No aplica: no hay curva de Pump.fun ni de Raydium LaunchLab para este token");
    assert.equal(curve?.explain.en, "Not applicable: there is no Pump.fun or Raydium LaunchLab curve for this token");
    assert.equal(reading.facts?.find((item) => item.id === "curva")?.state, "no_aplica");
    assert.equal((reading.missing?.es ?? "").includes("Curva"), false);
    assert.equal((reading.missing?.en ?? "").includes("Curve"), false);
    assert.equal((reading.absent?.es ?? "").includes("Curva"), false);
    assert.equal((reading.absent?.en ?? "").includes("Curve"), false);
    assert.equal((reading.shown as { curve?: { status?: string } } | null)?.curve?.status, "no_aplica");
  });

  test("un 429 del suministro se reintenta una vez y un corte de red no se propaga", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [],
    });
    let supplyHits = 0;
    const sleeps: number[] = [];
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async (endpoint, body, timeoutMs) => {
        const request = JSON.parse(body) as { method: string };
        if (request.method === "getTokenSupply") {
          supplyHits += 1;
          if (supplyHits === 1) return { status: 429, body: "" };
        }
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 1,
      minIntervalMs: 0,
      random: () => 0,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    assert.equal(supplyHits, 2);
    assert.equal(reading.facts?.find((item) => item.id === "suministro-extra")?.state, "ok");
    assert.ok(sleeps.some((ms) => ms >= 500));
    assert.equal((reading.missing?.es ?? "").includes("Consulta extra"), false);
    const dropped = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: ["https://rpc-a.invalid"],
      transport: async () => {
        throw new TypeError("Failed to fetch");
      },
      maxRetries: 1,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(dropped.ok, false);
    assert.equal(dropped.kind, "red");
    assert.match(dropped.support.es, /El servicio público no respondió, prueba otra vez en un minuto/);
  });

  test("un corte de red en un nodo prueba el segundo y no pasa de los reintentos", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [],
    });
    const dead = "https://rpc-a.invalid";
    const live = "https://rpc-b.invalid";
    const track = () => {
      const calls: { endpoint: string; method: string }[] = [];
      const transport: RpcTransport = async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        calls.push({ endpoint, method });
        if (endpoint === dead) return { status: 0, body: "" };
        return base(endpoint, body, timeoutMs);
      };
      return { calls, transport };
    };
    const packed = (calls: { endpoint: string; method: string }[]) =>
      calls.filter((item) => item.method === "getMultipleAccounts" && item.endpoint === dead);
    const once = track();
    const reading = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: [dead, live],
      transport: once.transport,
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(reading.ok, true);
    assert.equal(reading.usedFallback, true);
    assert.equal(reading.endpointHost, "rpc-b.invalid");
    // Una lectura de mint y curva de Pump.fun y otra de los candidatos de Raydium LaunchLab.
    assert.equal(packed(once.calls).length, 2);
    assert.equal(once.calls.filter((item) => item.method === "getMultipleAccounts" && item.endpoint === live).length, 2);
    const twice = track();
    const retried = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: [dead, live],
      transport: twice.transport,
      maxRetries: 1,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(retried.ok, true);
    assert.equal(retried.usedFallback, true);
    assert.equal(retried.endpointHost, "rpc-b.invalid");
    assert.equal(packed(twice.calls).length, 4);
    const fetches: string[] = [];
    const fetched = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: [dead, live],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (endpoint === dead) {
          if (method === "getMultipleAccounts") fetches.push(endpoint);
          throw new TypeError("Failed to fetch");
        }
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(fetches.length, 2);
    assert.equal(fetched.ok, true);
    assert.equal(fetched.usedFallback, true);
    assert.equal(fetched.endpointHost, "rpc-b.invalid");
    const both = track();
    const down = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: [dead, live],
      transport: async (endpoint, body) => {
        const method = (JSON.parse(body) as { method: string }).method;
        both.calls.push({ endpoint, method });
        return { status: 0, body: "" };
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.equal(down.ok, false);
    assert.equal(down.kind, "red");
    assert.equal(down.usedFallback, true);
    assert.deepEqual(
      both.calls.filter((item) => item.method === "getMultipleAccounts").map((item) => item.endpoint),
      [dead, live],
    );
  });

  test("un corte de red en el suministro no prueba publicnode y un 403 tampoco", async () => {
    const sample = fixture("revoked-mint");
    const accounts = new Map<string, AccountFixture | null>([
      [sample.mint, sample.mintAccount],
      [metadataPda(sample.mint), null],
      [bondingCurvePda(sample.mint), null],
    ]);
    const base = transportFor({
      slot: sample.slot,
      accounts,
      supply: { amount: "1000000000000000", decimals: 6 },
      largest: [],
    });
    const mainnet = "https://api.mainnet-beta.solana.com";
    const other = "https://solana-rpc.publicnode.com";
    const supplyOf = (retries: number, fail: (endpoint: string, hit: number) => { status: number; body: string } | null) => {
      const calls: string[] = [];
      const hits = new Map<string, number>();
      const transport: RpcTransport = async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getTokenSupply") {
          calls.push(endpoint);
          const hit = (hits.get(endpoint) ?? 0) + 1;
          hits.set(endpoint, hit);
          const failed = fail(endpoint, hit);
          if (failed) return failed;
        }
        return base(endpoint, body, timeoutMs);
      };
      return {
        calls,
        run: () =>
          readAnyMint({
            mint: sample.mint,
            registry,
            endpoints: [other, mainnet],
            transport,
            maxRetries: retries,
            minIntervalMs: 0,
            sleep: async () => {},
          }),
      };
    };
    const cut = supplyOf(0, (endpoint) => (endpoint === mainnet ? { status: 0, body: "" } : null));
    const moved = await cut.run();
    assert.deepEqual(cut.calls, [mainnet]);
    assert.equal(moved.ok, true);
    assert.equal(moved.facts?.find((item) => item.id === "suministro-extra")?.state, "fallo");
    const retried = supplyOf(1, (endpoint) => (endpoint === mainnet ? { status: 0, body: "" } : null));
    const afterRetry = await retried.run();
    assert.deepEqual(retried.calls, [mainnet, mainnet]);
    assert.equal(afterRetry.facts?.find((item) => item.id === "suministro-extra")?.state, "fallo");
    const refused = supplyOf(0, () => ({ status: 403, body: "" }));
    const stayed = await refused.run();
    assert.deepEqual(refused.calls, [mainnet]);
    assert.match(stayed.signals.find((item) => item.id === "suministro")?.explain.es ?? "", /no respondió/);
    clearRpcBlocks();
    const thrown: string[] = [];
    const fetched = await readAnyMint({
      mint: sample.mint,
      registry,
      endpoints: [other, mainnet],
      transport: async (endpoint, body, timeoutMs) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getTokenSupply" && endpoint === mainnet) {
          thrown.push(endpoint);
          throw new TypeError("Failed to fetch");
        }
        return base(endpoint, body, timeoutMs);
      },
      maxRetries: 0,
      minIntervalMs: 0,
      sleep: async () => {},
    });
    assert.deepEqual(thrown, [mainnet]);
    assert.equal(fetched.facts?.find((item) => item.id === "suministro-extra")?.state, "fallo");
    clearRpcBlocks();
    const both = supplyOf(0, () => ({ status: 0, body: "" }));
    const none = await both.run();
    assert.deepEqual(both.calls, [mainnet]);
    assert.equal(none.facts?.find((item) => item.id === "suministro-extra")?.state, "fallo");
  });
});
