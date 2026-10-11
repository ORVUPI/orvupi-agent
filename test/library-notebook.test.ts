import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { repoRoot } from "../src/paths.js";

const CA = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const OTHER = "11111111111111111111111111111111";
const WHEN = "2026-10-09T12:00:00.000Z";

interface ReadModule {
  TOKEN_PROGRAM: string;
  TOKEN_2022_PROGRAM: string;
  METADATA_PROGRAM: string;
  PUMP_PROGRAM: string;
  ALLOWED_METHODS: readonly string[];
  ALLOWED_RPCS: readonly string[];
  PUBLICNODE_RPC: string;
  DEFAULT_RPC: string;
  metadataPda: (mint: string) => Promise<string>;
  bondingCurvePda: (mint: string) => Promise<string>;
  decodeMintAccount: (owner: string, data: Uint8Array) => { supplyRaw: string; mintAuthority: { state: string }; freezeAuthority: { state: string } } | null;
  decodeMetadataAccount: (data: Uint8Array) => { name: string; uri: string; mutable: string | null } | null;
  isAllowedRpcUrl: (value: string) => boolean;
  blankCard: (mint: string, consultedAt: string, errors: unknown[]) => Card;
  readMint: (options: Record<string, unknown>) => Promise<{ ok: boolean; card: Card | null }>;
  clearBlockedMethods: () => void;
  cardFromShown: (shown: Record<string, unknown>) => Card | null;
}

interface Card {
  isMint?: boolean;
  partial?: boolean;
  officialStubx?: boolean;
  name: { text: string | null; status?: string };
  symbol?: { text: string | null; status?: string };
  uri: { text: string | null };
  supplyRpc: string | null;
  supplyRpcStatus?: string;
  supplyAccount: string | null;
  program?: string;
  programStatus?: string;
  slot?: number | null;
  slotStatus?: string;
  mint: string;
  network?: string;
  consultedAt?: string;
  decimals?: number | null;
  mintAuthority?: { state: string; address?: string | null; status: string };
  freezeAuthority?: { state: string; address?: string | null; status: string };
  curve?: { present: boolean | null; status: string };
  largestStatus?: string;
  errors?: Array<{ message?: string }>;
}

interface ModelModule {
  MAX_BYTES: number;
  MAX_STORED: number;
  validateExport: (text: string) => { ok: boolean; error?: { es: string }; records?: Array<{ note: string; card: Card }> };
  validateCard: (card: Card) => { ok: boolean };
  withinStoreLimit: (existingCount: number, incomingNewCount: number) => boolean;
  visibleText: (value: string) => string;
  withNote: (record: { id: string; card: Card }, note: string) => { ok: boolean; record?: { note: string } };
  toExport: (records: unknown[], exportedAt: string) => string;
  compareRecords: (left: { card: Card }, right: { card: Card }) => {
    ok: boolean;
    rows?: Array<{ field: { es: string }; same: boolean; verdict?: string; difference?: string | null }>;
    unknown?: Array<{ field: { es: string } }>;
    unchanged?: Array<{ field: { es: string } }>;
    technical?: { slot: { left: number | null; right: number | null } };
  };
  pickPrevious: (records: Array<{ id: string; card: Card }>, card: Card, exceptId: string) => { id: string } | null;
  staleLine: (consultedAt: string, lang: string) => string;
  formatReadingStamp: (consultedAt: string, lang: string, withSeconds?: boolean) => string;
  readingOptionLabel: (card: Card, lang: string, peers?: Card[]) => string;
  comparisonSummary: (compared: { changes?: unknown[]; unchanged?: unknown[]; unknown?: unknown[] }, lang: string) => string;
  supplyDirection: (difference: string, decimals: number, lang: string) => string | null;
  comparedValueText: (raw: string, lang: string) => string;
  supplyConfirmation: (card: Card) => { confirmed: boolean; reason: string };
  supplyNote: (card: Card, lang: string) => string | null;
  CURVE_NOT_ON_PUMP: { es: string; en: string };
  curveComparisonValue: (fieldEs: string, state: string, lang: string) => string | null;
}

async function modules(): Promise<{ read: ReadModule; model: ModelModule }> {
  const root = repoRoot();
  const read = (await import(pathToFileURL(path.join(root, "web/v2/shared/solana-read.js")).href)) as ReadModule;
  const model = (await import(pathToFileURL(path.join(root, "web/v2/shared/notebook-model.js")).href)) as ModelModule;
  read.clearBlockedMethods();
  return { read, model };
}

function u32(value: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value);
  return bytes;
}

function u64(value: bigint): Buffer {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes;
}

function mintBytes(supply = 1000n): Buffer {
  const bytes = Buffer.alloc(82);
  u32(0).copy(bytes, 0);
  u64(supply).copy(bytes, 36);
  bytes[44] = 6;
  bytes[45] = 1;
  u32(1).copy(bytes, 46);
  bytes.fill(9, 50, 82);
  return bytes;
}

function borshString(value: string): Buffer {
  const body = Buffer.from(value);
  return Buffer.concat([u32(body.length), body]);
}

function metadataBytes(name: string, symbol: string, uri: string, mutable = 0): Buffer {
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.alloc(32, 3),
    Buffer.alloc(32, 4),
    borshString(name),
    borshString(symbol),
    borshString(uri),
    Buffer.from([0, 0, 0, 0, mutable]),
  ]);
}

function curveBytes(): Buffer {
  const bytes = Buffer.alloc(49);
  Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(bytes, 0);
  u64(10n).copy(bytes, 8);
  u64(20n).copy(bytes, 16);
  u64(30n).copy(bytes, 24);
  u64(40n).copy(bytes, 32);
  bytes[48] = 0;
  return bytes;
}

function account(owner: string, data: Buffer | null) {
  if (!data) return null;
  return { owner, data: [data.toString("base64"), "base64"], executable: false, lamports: 1, rentEpoch: 0 };
}

function rpcOk(value: unknown, slot = 99) {
  return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: { context: { slot }, value } }) };
}

function fastClock() {
  return {
    now: () => new Date(WHEN),
    sleep: async () => undefined,
    mono: () => 0,
    minIntervalMs: 0,
    maxRetries: 2,
    timeoutMs: 50,
  };
}

describe("lector y cuaderno", () => {
  test("los RPC y los métodos son los de Verify universal", async () => {
    const { read } = await modules();
    const limits = JSON.parse(readFileSync(path.join(repoRoot(), "verify/policy/limits.json"), "utf8")) as {
      defaultRpcUrl: string;
      fallbackRpcUrl: string;
      allowedRpcMethods: string[];
    };
    assert.deepEqual([...read.ALLOWED_RPCS], [limits.defaultRpcUrl, limits.fallbackRpcUrl]);
    assert.deepEqual([...read.ALLOWED_METHODS], limits.allowedRpcMethods);
  });

  test("las PDA coinciden con Verify y solo hay métodos de lectura", async () => {
    const { read } = await modules();
    const programs = (await import(pathToFileURL(path.join(repoRoot(), "dist/verify/programs.js")).href)) as {
      metadataPda: (mint: string) => string;
      bondingCurvePda: (mint: string) => string;
    };
    assert.equal(await read.metadataPda(CA), programs.metadataPda(CA));
    assert.equal(await read.bondingCurvePda(CA), programs.bondingCurvePda(CA));
    assert.deepEqual([...read.ALLOWED_METHODS], [
      "getAccountInfo",
      "getMultipleAccounts",
      "getTokenSupply",
      "getTokenLargestAccounts",
      "getSlot",
    ]);
  });

  test("una cuenta de mint, metadatos con script y una curva se leen sin seguir la URI", async () => {
    const { read } = await modules();
    const decoded = read.decodeMintAccount(read.TOKEN_PROGRAM, mintBytes(4242n));
    assert.equal(decoded?.supplyRaw, "4242");
    assert.equal(decoded?.mintAuthority.state, "revocada");
    assert.equal(decoded?.freezeAuthority.state, "activa");
    const unreadable = Buffer.from(mintBytes());
    unreadable.writeUInt32LE(2, 0);
    const broken = read.decodeMintAccount(read.TOKEN_PROGRAM, unreadable);
    assert.equal(broken?.mintAuthority.state, "no_decodificable");
    const meta = read.decodeMetadataAccount(metadataBytes("<script>alert(1)</script>", "ABC", "https://evil.example/phish", 1));
    assert.ok(meta);
    assert.equal(meta?.name.includes("<"), false);
    assert.equal(meta?.uri, "https://evil.example/phish");
    assert.equal(meta?.mutable, "si");
    const calls: string[] = [];
    const result = await read.readMint({
      mint: CA,
      ...fastClock(),
      transport: async (_endpoint: string, body: string) => {
        const parsed = JSON.parse(body) as { method: string };
        calls.push(parsed.method);
        if (parsed.method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, mintBytes()),
            account(read.METADATA_PROGRAM, metadataBytes("<script>alert(1)</script>", "STB", "https://evil.example/phish")),
            account(read.PUMP_PROGRAM, curveBytes()),
          ]);
        }
        if (parsed.method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmount: null, uiAmountString: "skip" });
        if (parsed.method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(parsed.method);
      },
    });
    assert.equal(result.card?.isMint, true);
    assert.equal(result.card?.largestStatus, "fallo");
    assert.equal(result.card?.partial, true);
    assert.equal(result.ok, false);
    assert.match((result.card?.errors ?? []).map((item) => item.message).join(" "), /volvió vacía/);
    assert.equal(JSON.stringify(result.card).includes("ausente comprobado"), false);
    assert.equal(result.card?.officialStubx, true);
    assert.equal(result.card?.name.text?.includes("<"), false);
    assert.equal(result.card?.uri.text, "https://evil.example/phish");
    assert.equal(JSON.stringify(result.card).includes("uiAmount"), false);
    assert.deepEqual(calls, ["getMultipleAccounts", "getTokenSupply", "getTokenLargestAccounts"]);
  });

  test("un permiso que no se puede leer se guarda como fallo", async () => {
    const { read, model } = await modules();
    const bytes = Buffer.from(mintBytes());
    bytes.writeUInt32LE(2, 0);
    const result = await read.readMint({
      mint: CA,
      ...fastClock(),
      transport: async (_endpoint: string, body: string) => {
        const parsed = JSON.parse(body) as { method: string };
        if (parsed.method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, bytes),
            account(read.METADATA_PROGRAM, metadataBytes("STB", "STB", "https://example.invalid/meta")),
            null,
          ]);
        }
        if (parsed.method === "getTokenSupply") return { status: 403, body: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "indexed request blocked" } }) };
        if (parsed.method === "getTokenLargestAccounts") return { status: 429, body: "{}" };
        throw new Error(parsed.method);
      },
    });
    assert.equal(result.card?.mintAuthority?.state, "no_decodificable");
    assert.equal(result.card?.mintAuthority?.status, "fallo");
    assert.notEqual(result.card?.mintAuthority?.status, "verificado");
    assert.equal(result.card?.freezeAuthority?.status, "verificado");
    assert.equal(result.card?.partial, true);
    assert.equal(model.validateCard(result.card as Card).ok, true);
  });

  test("guardar usa la lectura de pantalla y un permiso ilegible queda en fallo", async () => {
    const { read, model } = await modules();
    const shown = {
      kind: "mint",
      mint: CA,
      consultedAt: WHEN,
      slot: 7,
      program: "spl-token",
      decimals: 6,
      supplyAccount: "1000",
      supplyRpc: null,
      supplyRpcStatus: "fallo",
      mintAuthority: { state: "no_decodificable", address: null },
      freezeAuthority: { state: "revocada", address: null },
      name: "STB",
      symbol: "STB",
      uri: "https://example.invalid/meta",
      metadataStatus: "verificado",
      uriStatus: "verificado",
      metadataMutable: "no",
      extensions: [],
      extensionsStatus: "no_aplica",
      largestStatus: "fallo",
      curve: { present: false, status: "ausente", virtualToken: null, virtualQuote: null, realToken: null, realQuote: null, complete: null },
    };
    const card = read.cardFromShown(shown);
    assert.ok(card);
    assert.equal(card?.mintAuthority?.status, "fallo");
    assert.equal(card?.freezeAuthority?.status, "verificado");
    assert.equal(card?.supplyAccount, "1000");
    assert.equal(model.validateCard(card as Card).ok, true);
    assert.equal(read.cardFromShown({ ...shown, consultedAt: "ayer" }), null);
  });

  test("429, cuenta ausente, no-mint y dirección inválida no inventan un cero", async () => {
    const { read } = await modules();
    let calls = 0;
    const limited = await read.readMint({
      mint: OTHER,
      ...fastClock(),
      transport: async () => {
        calls += 1;
        return { status: 429, body: "{}" };
      },
    });
    assert.equal(limited.ok, false);
    assert.equal(limited.card?.supplyRpc, null);
    assert.equal(limited.card?.supplyAccount, null);
    assert.equal(limited.card?.supplyRpcStatus, "fallo");
    assert.equal(limited.card?.largestStatus, "fallo");
    assert.equal(limited.card?.programStatus, "fallo");
    assert.equal(limited.card?.decimals ?? null, null);
    assert.equal(JSON.stringify(limited.card).includes('"0"'), false);
    assert.ok(calls >= 3);
    const summary = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/reading-summary.js")).href)) as {
      summaryFromCard: (card: Card) => { blocks: Array<{ id: string; items: Array<{ title: { es: string } }> }> };
    };
    const batchMissing = summary.summaryFromCard(limited.card as Card).blocks.find((item) => item.id === "falta");
    const titles = (batchMissing?.items ?? []).map((item) => item.title.es).join(" | ");
    assert.match(titles, /Suministro/);
    assert.match(titles, /Decimales/);
    assert.match(titles, /Cuentas con más tokens/);

    const missing = await read.readMint({
      mint: OTHER,
      ...fastClock(),
      transport: async (_endpoint: string, body: string) => {
        assert.equal((JSON.parse(body) as { method: string }).method, "getMultipleAccounts");
        return rpcOk([null, null, null]);
      },
    });
    assert.equal(missing.ok, true);
    assert.equal(missing.card?.program, "no_es_mint");
    assert.equal(missing.card?.partial, false);
    assert.equal(missing.card?.supplyRpc, null);

    const foreign = await read.readMint({
      mint: OTHER,
      ...fastClock(),
      transport: async () => rpcOk([account("11111111111111111111111111111111", Buffer.from([1, 2, 3])), null, null]),
    });
    assert.equal(foreign.card?.program, "no_es_mint");

    let touched = false;
    const invalid = await read.readMint({
      mint: "no-es-una-direccion",
      ...fastClock(),
      transport: async () => {
        touched = true;
        return { status: 200, body: "{}" };
      },
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.card, null);
    assert.equal(touched, false);
    assert.equal(read.isAllowedRpcUrl("http://api.mainnet-beta.solana.com"), false);
    assert.equal(read.isAllowedRpcUrl("https://user:secret@example.com"), false);
    assert.equal(read.isAllowedRpcUrl("https://evil.example"), false);
    assert.equal(read.isAllowedRpcUrl("https://api.mainnet-beta.solana.com.evil.com"), false);
    assert.equal(read.isAllowedRpcUrl("https://api.mainnet-beta.solana.com/extra"), false);
    assert.equal(read.isAllowedRpcUrl("https://api.mainnet-beta.solana.com"), true);
    assert.equal(read.isAllowedRpcUrl("https://solana-rpc.publicnode.com"), true);
  });

  test("importar rechaza script, 10 MB y un esquema roto, y una copia válida vuelve", async () => {
    const { read, model } = await modules();
    const huge = "x".repeat(model.MAX_BYTES + 1);
    assert.match(model.validateExport(huge).error?.es ?? "", /1 MB/);
    assert.equal(model.validateExport("{").ok, false);
    assert.equal(model.validateExport('{"schema":"<script>alert(1)</script>"}').ok, false);
    const card = read.blankCard(OTHER, WHEN, []);
    const checked = model.validateCard(card);
    assert.equal(checked.ok, true);
    const record = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", note: "nota aparte", card };
    const copy = model.toExport([record], WHEN);
    const back = model.validateExport(copy);
    assert.equal(back.ok, true);
    assert.equal(back.records?.[0]?.note, "nota aparte");
    assert.equal(back.records?.[0]?.card.mint, OTHER);
    const broken = JSON.parse(copy) as { cards: Array<Record<string, unknown>> };
    broken.cards.push({ ...broken.cards[0], id: record.id });
    assert.match(model.validateExport(JSON.stringify(broken)).error?.es ?? "", /mismo id/);
    const priced = JSON.parse(copy) as { price?: number };
    priced.price = 1;
    assert.equal(model.validateExport(JSON.stringify(priced)).ok, false);
    const forged = JSON.parse(copy) as { cards: Array<{ card: { mint: string; slot: number | null; curve: { extra?: boolean } } }> };
    const forgedCard = forged.cards[0];
    assert.ok(forgedCard);
    forgedCard.card.mint = "O".repeat(44);
    assert.equal(model.validateExport(JSON.stringify(forged)).ok, false);
    forgedCard.card.mint = OTHER;
    forgedCard.card.slot = 1e300;
    assert.equal(model.validateExport(JSON.stringify(forged)).ok, false);
    forgedCard.card.slot = Number.MAX_SAFE_INTEGER;
    assert.equal(model.validateExport(JSON.stringify(forged)).ok, true);
    forgedCard.card.curve.extra = true;
    assert.equal(model.validateExport(JSON.stringify(forged)).ok, false);
    assert.equal(model.MAX_STORED, 200);
    assert.equal(model.withinStoreLimit(199, 1), true);
    assert.equal(model.withinStoreLimit(200, 1), false);
    assert.equal(model.withinStoreLimit(199, 2), false);
    assert.equal(model.visibleText("ab\u202Ecd\u200F"), "abcd");
    const saved = model.withNote({ id: record.id, card }, "ab\u202Ecd\u200F\u2067");
    assert.equal(saved.ok, true);
    assert.equal(saved.record?.note, "abcd");
    const imported = model.validateExport(model.toExport([{ ...record, note: "izq\u202Eder" }], WHEN));
    assert.equal(imported.records?.[0]?.note, "izqder");
  });

  test("publicnode va primero y un 403, un 5xx o un timeout prueba mainnet-beta", async () => {
    const { read } = await modules();
    const okAccounts = rpcOk([
      account(read.TOKEN_PROGRAM, mintBytes()),
      account(read.METADATA_PROGRAM, metadataBytes("STUBX", "STB", "https://evil.example/phish")),
      account(read.PUMP_PROGRAM, curveBytes()),
    ]);
    async function failThen(status: number | "timeout") {
      read.clearBlockedMethods();
      const seen: string[] = [];
      const result = await read.readMint({
        mint: CA,
        ...fastClock(),
        endpoint: read.PUBLICNODE_RPC,
        maxRetries: 0,
        transport: async (endpoint: string, body: string) => {
          seen.push(new URL(endpoint).hostname);
          const method = JSON.parse(body).method as string;
          if (method === "getMultipleAccounts" && new URL(endpoint).hostname === "solana-rpc.publicnode.com") {
            if (status === "timeout") throw new Error("The operation was aborted due to timeout");
            return { status, body: "" };
          }
          if (method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmountString: "0.001" });
          return okAccounts;
        },
      });
      assert.equal(result.ok, true, String(status));
      assert.equal(seen[0], "solana-rpc.publicnode.com");
      assert.equal(seen.some((host) => host === "api.mainnet-beta.solana.com"), true);
    }
    await failThen(403);
    await failThen(429);
    await failThen(503);
    await failThen("timeout");
    const seen: string[] = [];
    const rejected = await read.readMint({
      mint: CA,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 0,
      transport: async (endpoint: string) => {
        seen.push(new URL(endpoint).hostname);
        return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32602, message: "invalid" } }) };
      },
    });
    assert.equal(rejected.ok, false);
    assert.deepEqual(seen, ["solana-rpc.publicnode.com"]);
  });

  test("una lista que no trae exactamente 3 cuentas no se pudo comprobar y prueba el otro nodo", async () => {
    const { read } = await modules();
    const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const full = [
      account(read.TOKEN_PROGRAM, mintBytes()),
      account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
      null,
    ];
    for (const count of [0, 2, 4]) {
      for (const mint of [USDC, CA]) {
        const hosts: string[] = [];
        const extra: string[] = [];
        const result = await read.readMint({
          mint,
          ...fastClock(),
          endpoint: read.PUBLICNODE_RPC,
          maxRetries: 0,
          transport: async (endpoint: string, body: string) => {
            const method = (JSON.parse(body) as { method: string }).method;
            const host = new URL(endpoint).hostname;
            if (method === "getMultipleAccounts") {
              hosts.push(host);
              return rpcOk(Array.from({ length: count }, () => null));
            }
            extra.push(`${host} ${method}`);
            return rpcOk([]);
          },
        });
        assert.equal(result.ok, false, `${count} ${mint}`);
        assert.equal(result.card?.curve?.status, "fallo");
        const messages = (result.card?.errors ?? []).map((item) => item.message ?? "").join(" ");
        assert.match(messages, /No se pudo comprobar/);
        assert.equal(messages.includes("No aplica"), false);
        assert.equal(messages.includes("no existe"), false);
        assert.deepEqual(hosts, ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
        assert.deepEqual(extra, []);
      }
    }
    const limited: string[] = [];
    const capped = await read.readMint({
      mint: CA,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 1,
      transport: async (endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getMultipleAccounts") limited.push(new URL(endpoint).hostname);
        return rpcOk([null, null, null, null]);
      },
    });
    assert.equal(capped.ok, false);
    assert.match((capped.card?.errors ?? []).map((item) => item.message ?? "").join(" "), /No se pudo comprobar/);
    assert.deepEqual(limited, [
      "solana-rpc.publicnode.com",
      "solana-rpc.publicnode.com",
      "api.mainnet-beta.solana.com",
      "api.mainnet-beta.solana.com",
    ]);
    const seen: string[] = [];
    const recovered = await read.readMint({
      mint: USDC,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 0,
      transport: async (endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        const host = new URL(endpoint).hostname;
        seen.push(`${host} ${method}`);
        if (method === "getMultipleAccounts" && host === "solana-rpc.publicnode.com") return rpcOk([null, null]);
        if (method === "getMultipleAccounts") return rpcOk(full);
        if (method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmountString: "skip" });
        if (method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(method);
      },
    });
    assert.equal(recovered.card?.largestStatus, "fallo");
    assert.equal(recovered.card?.curve?.status, "no_aplica");
    assert.deepEqual(
      seen.filter((item) => item.endsWith("getMultipleAccounts")),
      ["solana-rpc.publicnode.com getMultipleAccounts", "api.mainnet-beta.solana.com getMultipleAccounts"],
    );
    assert.deepEqual(
      seen.filter((item) => item.endsWith("getTokenSupply") || item.endsWith("getTokenLargestAccounts")),
      ["api.mainnet-beta.solana.com getTokenSupply", "api.mainnet-beta.solana.com getTokenLargestAccounts"],
    );
    const pumpSeen: string[] = [];
    const pumpRecovered = await read.readMint({
      mint: CA,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 0,
      transport: async (endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        const host = new URL(endpoint).hostname;
        if (method === "getMultipleAccounts") pumpSeen.push(host);
        if (method === "getMultipleAccounts" && host === "solana-rpc.publicnode.com") return rpcOk([]);
        if (method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, mintBytes()),
            account(read.METADATA_PROGRAM, metadataBytes("STB", "STB", "https://example.invalid/meta")),
            null,
          ]);
        }
        if (method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmountString: "skip" });
        if (method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(method);
      },
    });
    assert.equal(pumpRecovered.card?.largestStatus, "fallo");
    assert.equal(pumpRecovered.card?.curve?.status, "ausente");
    assert.deepEqual(pumpSeen, ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
  });

  test("un corte de red en las cuentas prueba el segundo nodo y el suministro no sale de mainnet", async () => {
    const { read } = await modules();
    const hosts: Record<string, string[]> = { getMultipleAccounts: [], getTokenSupply: [], getTokenLargestAccounts: [] };
    const result = await read.readMint({
      mint: CA,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 0,
      transport: async (endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        const host = new URL(endpoint).hostname;
        if (hosts[method]) hosts[method]?.push(host);
        if (method === "getMultipleAccounts" && host === "solana-rpc.publicnode.com") return { status: 0, body: "" };
        if (method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, mintBytes()),
            account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
            null,
          ]);
        }
        if (method === "getTokenSupply") return { status: 0, body: "" };
        if (method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(method);
      },
    });
    assert.equal(result.card?.partial, true);
    assert.deepEqual(hosts.getMultipleAccounts, ["solana-rpc.publicnode.com", "api.mainnet-beta.solana.com"]);
    assert.deepEqual(hosts.getTokenSupply, ["api.mainnet-beta.solana.com"]);
    assert.deepEqual(hosts.getTokenLargestAccounts, ["api.mainnet-beta.solana.com"]);
  });

  test("un 403 se recuerda y no se vuelve a pedir ese método en la sesión", async () => {
    const { read } = await modules();
    const calls: string[] = [];
    const transport = async (endpoint: string, body: string) => {
      const method = (JSON.parse(body) as { method: string }).method;
      calls.push(`${new URL(endpoint).hostname} ${method}`);
      if (method === "getMultipleAccounts") {
        return rpcOk([
          account(read.TOKEN_PROGRAM, mintBytes()),
          account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
          null,
        ]);
      }
      if (method === "getTokenSupply" || method === "getTokenLargestAccounts") return { status: 403, body: "" };
      throw new Error(method);
    };
    const first = await read.readMint({ mint: CA, ...fastClock(), endpoint: read.DEFAULT_RPC, maxRetries: 0, transport });
    const second = await read.readMint({ mint: CA, ...fastClock(), endpoint: read.DEFAULT_RPC, maxRetries: 0, transport });
    assert.equal(first.card?.supplyRpcStatus, "fallo");
    assert.equal(second.card?.supplyRpcStatus, "fallo");
    assert.deepEqual(calls.filter((item) => item.endsWith("getTokenSupply")), ["api.mainnet-beta.solana.com getTokenSupply"]);
    assert.deepEqual(calls.filter((item) => item.endsWith("getTokenLargestAccounts")), ["api.mainnet-beta.solana.com getTokenLargestAccounts"]);
    assert.equal(calls.filter((item) => item.endsWith("getMultipleAccounts")).length, 2);
  });

  test("un 403 recordado caduca a los 10 minutos y Reintentar lo borra dentro del cupo", async () => {
    const { read } = await modules();
    const calls: string[] = [];
    let now = Date.parse(WHEN);
    const transport = async (endpoint: string, body: string) => {
      const method = (JSON.parse(body) as { method: string }).method;
      calls.push(`${new URL(endpoint).hostname} ${method}`);
      if (method === "getMultipleAccounts") {
        return rpcOk([
          account(read.TOKEN_PROGRAM, mintBytes()),
          account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
          null,
        ]);
      }
      if (method === "getTokenSupply" || method === "getTokenLargestAccounts") return { status: 403, body: "" };
      throw new Error(method);
    };
    const readAt = () => read.readMint({
      mint: CA,
      now: () => new Date(now),
      sleep: async () => undefined,
      mono: () => 0,
      minIntervalMs: 0,
      maxRetries: 0,
      timeoutMs: 50,
      endpoint: read.DEFAULT_RPC,
      transport,
    });
    const supplyCalls = () => calls.filter((item) => item.endsWith("getTokenSupply")).length;
    await readAt();
    await readAt();
    assert.equal(supplyCalls(), 1);
    now += 599_999;
    await readAt();
    assert.equal(supplyCalls(), 1);
    now += 1;
    await readAt();
    assert.equal(supplyCalls(), 2);
    read.clearBlockedMethods();
    await readAt();
    assert.equal(supplyCalls(), 3);

    const source = readFileSync(path.join(repoRoot(), "web/v2/assets/cuaderno.js"), "utf8");
    const consult = source.slice(source.indexOf("async function consult"), source.indexOf("async function saveNote"));
    const denied = consult.indexOf("if (!slot.allowed)");
    const clear = consult.indexOf("if (forgetBlocked) clearBlockedMethods()");
    assert.match(consult, /takeQuerySlot\(\s*queryStamps,\s*Date\.now\(\),\s*6,\s*60000\s*\)/);
    assert.ok(consult.indexOf("takeQuerySlot") < denied);
    assert.match(consult.slice(denied, clear), /return;/);
    assert.ok(clear < consult.indexOf("readMint"));
    assert.match(source, /addEventListener\("click", \(\) => consult\(retryMint, true\)\)/);
    assert.match(source, /addEventListener\("click", \(\) => consult\(record\.card\.mint\)\)/);

    const verifyUi = readFileSync(path.join(repoRoot(), "lab/client/verify-ui.js"), "utf8");
    const run = verifyUi.slice(verifyUi.indexOf("function run(force, forgetBlocked)"), verifyUi.indexOf("function readSample"));
    const verifyDenied = run.indexOf("if (!slot.allowed)");
    const verifyClear = run.indexOf("if (forgetBlocked) clearRpcBlocks()");
    assert.match(run, /takeQuerySlot\(stamps, now, 6, 60000\)/);
    assert.ok(verifyDenied < verifyClear);
    assert.match(run.slice(verifyDenied, verifyClear), /return;/);
    assert.ok(verifyClear < run.indexOf("readAnyMint({"));
    assert.match(verifyUi, /run\(true, true\)/);
  });

  test("getTokenSupply y las cuentas grandes no se piden a publicnode", async () => {
    const { read } = await modules();
    const hosts: Record<string, string[]> = { getTokenSupply: [], getTokenLargestAccounts: [], getMultipleAccounts: [] };
    const result = await read.readMint({
      mint: CA,
      ...fastClock(),
      endpoint: read.PUBLICNODE_RPC,
      maxRetries: 0,
      transport: async (endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        const host = new URL(endpoint).hostname;
        if (hosts[method]) hosts[method]?.push(host);
        if (method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, mintBytes()),
            account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
            null,
          ]);
        }
        if (method === "getTokenSupply") return rpcOk({ amount: "7723351880366328", decimals: 6, uiAmountString: "skip" });
        if (method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(method);
      },
    });
    assert.equal(result.card?.largestStatus, "fallo");
    assert.deepEqual(hosts.getTokenSupply, ["api.mainnet-beta.solana.com"]);
    assert.deepEqual(hosts.getTokenLargestAccounts, ["api.mainnet-beta.solana.com"]);
    assert.deepEqual(hosts.getMultipleAccounts, ["solana-rpc.publicnode.com"]);
  });

  test("en un token que no es de Pump.fun la curva no aplica y no entra en lo que falta", async () => {
    const { read, model } = await modules();
    const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const sentence = model.CURVE_NOT_ON_PUMP;
    const transport = async (_endpoint: string, body: string) => {
      const method = (JSON.parse(body) as { method: string }).method;
      if (method === "getMultipleAccounts") {
        return rpcOk([
          account(read.TOKEN_PROGRAM, mintBytes()),
          account(read.METADATA_PROGRAM, metadataBytes("USDC", "USDC", "https://example.invalid/meta")),
          null,
        ]);
      }
      if (method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmountString: "skip" });
      if (method === "getTokenLargestAccounts") return rpcOk([]);
      throw new Error(method);
    };
    const usdc = await read.readMint({ mint: USDC, ...fastClock(), endpoint: read.DEFAULT_RPC, maxRetries: 0, transport });
    assert.equal(usdc.card?.curve?.status, "no_aplica");
    assert.equal(usdc.card?.curve?.present, false);
    const pump = await read.readMint({ mint: CA, ...fastClock(), endpoint: read.DEFAULT_RPC, maxRetries: 0, transport });
    assert.equal(pump.card?.curve?.status, "ausente");
    const foreign = await read.readMint({
      mint: USDC,
      ...fastClock(),
      endpoint: read.DEFAULT_RPC,
      maxRetries: 0,
      transport: async (_endpoint: string, body: string) => {
        const method = (JSON.parse(body) as { method: string }).method;
        if (method === "getMultipleAccounts") {
          return rpcOk([
            account(read.TOKEN_PROGRAM, mintBytes()),
            null,
            account("11111111111111111111111111111111", Buffer.from([1, 2, 3])),
          ]);
        }
        if (method === "getTokenSupply") return rpcOk({ amount: "1000", decimals: 6, uiAmountString: "skip" });
        if (method === "getTokenLargestAccounts") return rpcOk([]);
        throw new Error(method);
      },
    });
    assert.equal(foreign.card?.curve?.status, "no_aplica");
    const facts = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/fact-state.js")).href)) as {
      missingFacts: (items: Array<{ label: string; state: string }>, lang: string) => { text: string; absentText: string };
    };
    const summary = facts.missingFacts(
      [
        { label: "Curva", state: "no_aplica" },
        { label: "Cuentas", state: "fallo" },
      ],
      "es",
    );
    assert.equal(summary.text.includes("Curva"), false);
    assert.equal(summary.absentText.includes("Curva"), false);
    assert.match(summary.text, /Faltan datos: Cuentas/);
    const leftCard = read.blankCard(USDC, WHEN, []);
    const rightCard = read.blankCard(USDC, "2026-10-09T13:00:00.000Z", []);
    for (const card of [leftCard, rightCard]) {
      card.isMint = true;
      card.curve = { present: false, status: "no_aplica" };
    }
    const compared = model.compareRecords({ card: leftCard }, { card: rightCard });
    assert.equal(compared.ok, true);
    const curveRows = (compared.rows ?? []).filter((row) => /curva/i.test(row.field.es));
    assert.equal(curveRows.length, 4);
    assert.equal(curveRows.every((row) => row.verdict === "igual"), true);
    assert.equal((compared.unknown ?? []).some((row) => /curva/i.test(row.field.es)), false);
    assert.equal(model.curveComparisonValue("Curva presente", "no_aplica", "es"), sentence.es);
    assert.equal(model.curveComparisonValue("Cantidad real de tokens de la curva", "no_aplica", "en"), sentence.en);
    assert.equal(model.curveComparisonValue("Nombre", "no_aplica", "es"), null);
    assert.equal(sentence.es, "No aplica: este token no se creó en Pump.fun");
    assert.equal(sentence.en, "Not applicable: this token was not created on Pump.fun");
  });

  test("solo se comparan dos fichas del mismo mint y la antigua no se presenta como actual", async () => {
    const { read, model } = await modules();
    const left = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", note: "primera", card: read.blankCard(CA, WHEN, []) };
    const rightCard = read.blankCard(CA, "2026-10-09T13:00:00.000Z", []);
    rightCard.supplyAccount = "5";
    const right = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", note: "segunda", card: rightCard };
    const same = model.compareRecords(left, right);
    assert.equal(same.ok, true);
    const supply = same.rows?.find((row) => row.field.es === "Suministro total");
    assert.equal(supply?.same, false);
    assert.equal(supply?.verdict, "indeterminado");
    const bothBlank = model.compareRecords(left, { ...right, card: read.blankCard(CA, "2026-10-09T13:00:00.000Z", []) });
    const blankSupply = bothBlank.rows?.find((row) => row.field.es === "Suministro total");
    assert.equal(blankSupply?.verdict, "indeterminado");
    assert.equal(blankSupply?.same, false);
    const older = read.blankCard(CA, WHEN, []);
    const newer = read.blankCard(CA, "2026-10-09T13:00:00.000Z", []);
    older.supplyAccount = "1000000";
    newer.supplyAccount = "2000000";
    older.decimals = 6;
    newer.decimals = 6;
    const moved = model.compareRecords({ ...left, card: older }, { ...right, card: newer });
    const movedSupply = moved.rows?.find((row) => row.field.es === "Suministro total");
    assert.equal(movedSupply?.verdict, "cambio");
    assert.equal(movedSupply?.difference, "1000000");
    const usdcLeft = read.blankCard(OTHER, "2026-10-10T19:35:21.457Z", []);
    const usdcRight = read.blankCard(OTHER, "2026-10-10T19:35:10.216Z", []);
    for (const card of [usdcLeft, usdcRight]) {
      card.isMint = true;
      card.program = "spl-token";
      card.programStatus = "verificado";
      card.decimals = 6;
      card.mintAuthority = { state: "activa", address: null, status: "verificado" };
      card.freezeAuthority = { state: "revocada", address: null, status: "verificado" };
      card.name = { text: "USD Coin", status: "verificado" };
      card.symbol = { text: "USDC", status: "verificado" };
      card.slotStatus = "verificado";
    }
    usdcLeft.slot = 11;
    usdcRight.slot = 22;
    usdcLeft.supplyAccount = "7723351880366328";
    usdcRight.supplyAccount = "7723319021661631";
    const usdc = model.compareRecords({ card: usdcLeft }, { card: usdcRight });
    const total = usdc.rows?.find((row) => row.field.es === "Suministro total");
    assert.equal(total?.verdict, "cambio");
    assert.equal(total?.difference, (7723351880366328n - 7723319021661631n).toString());
    assert.equal(usdc.rows?.some((row) => row.field.es === "Slot" || row.field.es === "Momento de la red"), false);
    assert.deepEqual(usdc.technical?.slot, { left: 22, right: 11 });
    const unchangedNames = (usdc.unchanged ?? []).map((row) => row.field.es);
    assert.equal(unchangedNames.includes("Permiso de emisión"), true);
    assert.equal(unchangedNames.includes("Nombre"), true);
    assert.equal(unchangedNames.includes("Decimales"), true);
    assert.ok(unchangedNames.length > 0);
    for (const row of usdc.rows ?? []) {
      assert.equal(["cambio", "igual", "indeterminado"].includes(row.verdict ?? ""), true);
    }
    const previous = model.pickPrevious(
      [
        { id: "1", card: older },
        { id: "2", card: { ...newer, mint: OTHER, network: "solana" } },
      ],
      newer,
      "3",
    );
    assert.equal(previous?.id, "1");
    assert.equal(model.pickPrevious([{ id: "1", card: { ...older, network: "otra" } }], newer, "3"), null);
    const other = model.compareRecords(left, { ...right, card: read.blankCard(OTHER, WHEN, []) });
    assert.equal(other.ok, false);
    const otherNet = model.compareRecords(left, { ...right, card: { ...right.card, network: "devnet" } });
    assert.equal(otherNet.ok, false);
    const stamp = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(WHEN)).replace(/[\u202f\u00a0]/g, " ");
    assert.equal(
      model.readingOptionLabel({ ...older, symbol: { text: "STUBX" }, name: { text: "STUBX" } }, "es"),
      `STUBX · ${stamp}`,
    );
    const amount = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/amount.js")).href)) as {
      formatAmount: (raw: string, decimals: number, lang: string) => string | null;
    };
    assert.equal(amount.formatAmount("1000000000000000", 6, "es"), "1.000.000.000 tokens");
    assert.equal(amount.formatAmount("1000000000000000", 6, "en"), "1,000,000,000 tokens");
    assert.equal(amount.formatAmount("1000000", 6, "es"), "1 tokens");
    assert.equal(amount.formatAmount("7840780507370947", 6, "es"), "7.840.780.507,370947 tokens");
    assert.equal(amount.formatAmount("7840780507370947", 6, "en"), "7,840,780,507.370947 tokens");
    assert.equal(amount.formatAmount(null as unknown as string, 6, "es"), null);
    const actions = readFileSync(path.join(repoRoot(), "web/v2/assets/verificar-acciones.mjs"), "utf8");
    assert.equal(actions.includes("localStorage"), false);
    assert.equal(actions.includes("sessionStorage"), false);
    assert.equal(actions.includes("searchParams"), false);
    assert.match(actions, /stubx-cuaderno/);
    assert.equal(model.staleLine(WHEN, "es"), `Consultado el ${model.formatReadingStamp(WHEN, "es")} · puede haber cambiado`);
    assert.equal(model.staleLine(WHEN, "en"), `Checked on ${model.formatReadingStamp(WHEN, "en")} · this may have changed`);
    assert.equal(model.staleLine(WHEN, "es").includes("2026-10-09T"), false);
    assert.equal(model.staleLine(WHEN, "es").includes("actual"), false);
  });

  test("el resumen separa cambio, igual e indeterminado", async () => {
    const { read, model } = await modules();
    const line = (changed: number, same: number, unknown: number, lang = "es") => model.comparisonSummary({
      changes: Array.from({ length: changed }),
      unchanged: Array.from({ length: same }),
      unknown: Array.from({ length: unknown }),
    }, lang);
    assert.equal(line(1, 0, 0), "1 dato cambió · 0 siguen igual · 0 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(0, 8, 0), "0 datos cambiaron · 8 siguen igual · 0 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(0, 0, 2), "0 datos cambiaron · 0 siguen igual · 2 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(1, 8, 0), "1 dato cambió · 8 siguen igual · 0 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(1, 0, 2), "1 dato cambió · 0 siguen igual · 2 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(0, 8, 2), "0 datos cambiaron · 8 siguen igual · 2 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(1, 8, 2), "1 dato cambió · 8 siguen igual · 2 no se pueden comparar porque faltan en alguna lectura");
    assert.equal(line(1, 1, 1), "1 dato cambió · 1 sigue igual · 1 no se puede comparar porque falta en alguna lectura");
    assert.equal(line(1, 8, 2, "en"), "1 fact changed · 8 stayed the same · 2 cannot be compared because they are missing from one reading");
    assert.equal(line(0, 8, 2).includes("No hay un cambio"), false);
    assert.equal(line(1, 0, 2).includes("no se puede determinar si cambió"), false);
    assert.equal(model.supplyDirection("-32858704697", 6, "es"), "Bajó 32.858,704697 tokens");
    assert.equal(model.supplyDirection("408850757", 6, "es"), "Subió 408,850757 tokens");
    assert.equal(model.supplyDirection("-408850757", 6, "en"), "Fell 408.850757 tokens");
    assert.equal(model.comparedValueText("si", "es"), "sí");
    assert.equal(model.comparedValueText("spl-token", "es"), "SPL Token");
    assert.equal(model.comparedValueText("token-2022", "en"), "Token-2022");
    assert.equal(model.comparedValueText("no_decodificable", "es"), "no se pudo leer");
    const earlier = "2026-10-10T20:49:07.000Z";
    const later = "2026-10-10T20:49:40.000Z";
    const first = read.blankCard(CA, earlier, []);
    first.symbol = { text: "USDC" };
    first.name = { text: "USD Coin" };
    const second = read.blankCard(CA, later, []);
    second.symbol = { text: "USDC" };
    second.name = { text: "USD Coin" };
    const seconds = String(new Date(earlier).getSeconds()).padStart(2, "0");
    assert.match(model.readingOptionLabel(first, "es", [first, second]), new RegExp(`:${seconds}$`));
    assert.equal(/\d{2}:\d{2}:\d{2}/.test(model.readingOptionLabel(first, "es", [first])), false);
  });

  test("el suministro total no queda verificado si la lectura extra falla o no coincide", async () => {
    const { read, model } = await modules();
    const card = read.blankCard(CA, WHEN, []);
    card.isMint = true;
    card.decimals = 6;
    card.supplyAccount = "1000";
    card.supplyRpc = null;
    card.supplyRpcStatus = "fallo";
    assert.equal(model.supplyConfirmation(card).confirmed, false);
    assert.equal(model.supplyConfirmation(card).reason, "fallo");
    assert.match(model.supplyNote(card, "es") ?? "", /El servicio público no respondió/);
    assert.match(model.supplyNote(card, "es") ?? "", /no es una ausencia/);
    assert.match(model.supplyNote(card, "en") ?? "", /does not match|not an absence|did not respond/);
    card.supplyRpc = "999";
    card.supplyRpcStatus = "verificado";
    assert.equal(model.supplyConfirmation(card).confirmed, false);
    assert.equal(model.supplyConfirmation(card).reason, "no_coincide");
    assert.match(model.supplyNote(card, "es") ?? "", /no coincide/);
    assert.match(model.supplyNote(card, "es") ?? "", /Se muestra la cifra de los bytes/);
    card.supplyRpc = "1000";
    assert.equal(model.supplyConfirmation(card).confirmed, true);
    assert.equal(model.supplyNote(card, "es"), null);
  });

  test("el nombre de Token-2022 sale de la extensión si no hay cuenta Metaplex", async () => {
    const { read } = await modules();
    const name = "STUBX";
    const symbol = "STUBX";
    const uri = "https://example.invalid/meta.json";
    const base = Buffer.alloc(166);
    mintBytes().copy(base, 0);
    base[165] = 1;
    const value = Buffer.concat([Buffer.alloc(64), borshString(name), borshString(symbol), borshString(uri), u32(0)]);
    const header = Buffer.alloc(4);
    header.writeUInt16LE(19, 0);
    header.writeUInt16LE(value.length, 2);
    const data = Buffer.concat([base, header, value]);
    const result = await read.readMint({
      mint: CA,
      ...fastClock(),
      transport: async () => rpcOk([account(read.TOKEN_2022_PROGRAM, data), null, null]),
    });
    assert.equal(result.card?.program, "token-2022");
    assert.equal(result.card?.name.text, name);
    assert.equal(result.card?.symbol?.text, symbol);
    const pointed = Buffer.concat([base, (() => {
      const pointer = Buffer.alloc(4 + 64);
      pointer.writeUInt16LE(18, 0);
      pointer.writeUInt16LE(64, 2);
      pointer.fill(7, 4 + 32, 4 + 64);
      return pointer;
    })(), header, value]);
    const hidden = await read.readMint({
      mint: CA,
      ...fastClock(),
      transport: async () => rpcOk([account(read.TOKEN_2022_PROGRAM, pointed), null, null]),
    });
    assert.equal(hidden.card?.name.text, null);
  });

  test("el test de navegador no vive dentro de la web que se publica", () => {
    const root = path.join(repoRoot(), "web/v2");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = path.relative(root, full);
        if (name === "test" || name.endsWith(".playwright.mjs")) hits.push(rel);
        if (statSync(full).isDirectory()) walk(full);
      }
    };
    walk(root);
    assert.deepEqual(hits, []);
  });

  test("las páginas nuevas no firman, no nombran otros tokens y llevan el pie", () => {
    const root = repoRoot();
    const files = [
      "web/v2/shared/solana-read.js",
      "web/v2/shared/notebook-model.js",
      "web/v2/assets/cuaderno.js",
      "web/v2/assets/draft-address.js",
    ];
    const banned = ["signTransaction", "sendTransaction", "phantom", "innerHTML"];
    for (const rel of files) {
      const source = readFileSync(path.join(root, rel), "utf8");
      for (const word of banned) assert.equal(source.includes(word), false, `${rel} ${word}`);
    }
    const aprender = readFileSync(path.join(root, "web/v2/aprender/index.html"), "utf8");
    for (const id of [
      "direccion",
      "registro",
      "autoridad-emision",
      "autoridad-congelacion",
      "metadatos-mutables",
      "desconocido",
      "curva-pump",
      "reserva-real",
      "reserva-virtual",
      "suplantacion",
      "titular",
      "holder",
      "ficha",
      "censo",
      "comision",
      "extension-token-2022",
      "guia-identificar",
      "guia-permisos",
      "guia-liquidez",
    ]) {
      assert.match(aprender, new RegExp(`id="${id}"`));
    }
    assert.match(aprender, /Pendiente de revisión humana|pendiente de revisión humana/);
    assert.ok(aprender.includes(CA));
    assert.equal(aprender.includes("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), false);
    assert.equal(aprender.toLowerCase().includes("estafa"), false);
    assert.match(aprender, /Cripto de alto riesgo · Puedes perderlo todo · No es consejo de inversión\./);
    assert.match(aprender, /High-risk crypto · You could lose everything · Not investment advice\./);
    const main = aprender.slice(aprender.indexOf("<main"), aprender.indexOf("</main>"));
    assert.equal(main.includes("https://"), false);
    assert.match(aprender, /href="\/verify\/"/);
    const notebook = readFileSync(path.join(root, "web/v2/cuaderno/index.html"), "utf8");
    assert.match(notebook, /puede haber cambiado/);
    assert.match(notebook, /this may have changed/);
    assert.match(
      notebook,
      /Lo que escribes se guarda solo en este navegador\. No escribas claves, frases semilla ni datos personales\. Borrar lo elimina\. Para leer la cadena, tu navegador consulta un servicio público de Solana \(por defecto solana-rpc\.publicnode\.com, o el que elijas\), que recibe la dirección consultada y tu IP\./,
    );
    assert.match(
      notebook,
      /What you write is stored only in this browser\. Do not write keys, seed phrases, or personal data\. Clear deletes it\. To read the chain, your browser queries a public Solana service \(by default solana-rpc\.publicnode\.com, or the one you choose\), which receives the address and your IP\./,
    );
    assert.match(
      notebook,
      /El idioma, el progreso de Lab, el borrador de Studio y el cuaderno, si se usan, se quedan en este navegador\./,
    );
    assert.match(
      notebook,
      /Language, Lab progress, the Studio draft, and the notebook, if they are used, stay in this browser\./,
    );
    assert.match(notebook, /Si eliges otro lector, ese servicio recibe tus consultas y tu IP\. STUBX no lo revisa\./);
    assert.match(notebook, /If you choose another reader, that service receives your queries and your IP\. STUBX does not review it\./);
    assert.equal(notebook.toLowerCase().includes("mala inversión"), false);
    assert.match(notebook, /connect-src 'self' https:\/\/solana-rpc\.publicnode\.com https:\/\/api\.mainnet-beta\.solana\.com/);
    assert.match(notebook, /<select id="rpc-url"/);
    assert.equal(notebook.includes('id="rpc-url" name="rpc" type="url"'), false);
    assert.match(notebook, /Este navegador guarda como máximo 200 fichas/);
    assert.equal(notebook.includes("frame-ancestors"), false);
    assert.match(notebook, /No es una auditoría ni una recomendación\./);
    assert.equal(notebook.toLowerCase().includes("phantom"), false);
    const draft = readFileSync(path.join(root, "web/v2/assets/draft-address.js"), "utf8");
    assert.equal(draft.includes("sessionStorage"), false);
    assert.equal(draft.includes("localStorage"), false);
    assert.equal(draft.includes('searchParams.set("a"'), false);
    assert.equal(draft.includes("searchParams.set('a'"), false);
    assert.match(draft, /history\.replaceState/);
    assert.match(draft, /url\.hash = "a=" \+ address/);
    const verify = readFileSync(path.join(root, "web/v2/verify/index.html"), "utf8");
    assert.match(verify, /draft-address\.js/);
    const learn = readFileSync(path.join(root, "web/v2/aprender/index.html"), "utf8");
    assert.match(learn, /draft-address\.js/);
    assert.match(verify, /href="\/aprender\/#direccion"/);
    const mission = readFileSync(path.join(root, "lab/client/ui.js"), "utf8");
    assert.match(mission, /\/aprender\/\?from=lab#/);
  });

  test("la dirección viaja en el fragmento y sale del historial", () => {
    const source = readFileSync(path.join(repoRoot(), "web/v2/assets/draft-address.js"), "utf8");
    const run = (start: string, options: { value?: string; links: string[] }) => {
      let current = new URL(start);
      const replacements: string[] = [];
      const input = options.value === undefined ? null : { value: options.value };
      const links = options.links.map((href) => {
        const link: { href: string; click: () => void; getAttribute: (name: string) => string | null; setAttribute: (name: string, value: string) => void; addEventListener: (type: string, fn: () => void) => void } = {
          href,
          click: () => undefined,
          getAttribute: (name) => (name === "href" ? link.href : null),
          setAttribute: (name, value) => {
            if (name === "href") link.href = value;
          },
          addEventListener: (type, fn) => {
            if (type === "click") link.click = fn;
          },
        };
        return link;
      });
      const sandbox = {
        location: {
          get href() { return current.href; },
          get origin() { return current.origin; },
          get pathname() { return current.pathname; },
          get search() { return current.search; },
          get hash() { return current.hash; },
        },
        history: {
          state: { page: "stubx" },
          replaceState: (_state: unknown, _title: string, next: string) => {
            assert.equal(_state, sandbox.history.state);
            current = new URL(next, current.origin);
            replacements.push(current.pathname + current.search + current.hash);
          },
        },
        document: {
          getElementById: (id: string) => (id === "direccion-token" ? input : null),
          querySelectorAll: (selector: string) => {
            const matched = links.filter((link) => {
              if (selector === 'a[href^="/aprender/"]') return link.href.startsWith("/aprender/");
              if (selector === 'a[href="/verify/"], a[href^="/verify/?"]') return link.href === "/verify/" || link.href.startsWith("/verify/?");
              return false;
            });
            return matched;
          },
        },
        URL,
        URLSearchParams,
      };
      vm.runInNewContext(source, sandbox, { filename: "draft-address.js" });
      return {
        input,
        links,
        replacements,
        url: () => current.pathname + current.search + current.hash,
      };
    };

    const filled = run(`https://stubxai.com/verify/#a=${CA}`, { value: "", links: ["/aprender/#direccion"] });
    assert.equal(filled.input?.value, CA);
    assert.equal(filled.url(), "/verify/");
    assert.deepEqual(filled.replacements, ["/verify/"]);
    filled.links[0]?.click();
    assert.equal(filled.links[0]?.href, `/aprender/#a=${CA}`);
    assert.equal(filled.links[0]?.href.includes("?"), false);

    const typed = run("https://stubxai.com/verify/#direccion", { value: CA, links: ["/aprender/?from=lab#direccion"] });
    assert.equal(typed.input?.value, CA);
    assert.deepEqual(typed.replacements, []);
    typed.links[0]?.click();
    assert.equal(typed.links[0]?.href, `/aprender/?from=lab#a=${CA}`);

    const ignoredQuery = run(`https://stubxai.com/verify/?a=${CA}#direccion`, { value: "", links: [] });
    assert.equal(ignoredQuery.input?.value, "");
    assert.equal(ignoredQuery.url(), "/verify/#direccion");

    const invalid = run("https://stubxai.com/verify/#a=no-es-direccion", { value: "", links: [] });
    assert.equal(invalid.input?.value, "");
    assert.equal(invalid.url(), "/verify/");

    const library = run(`https://stubxai.com/aprender/#direccion&a=${CA}`, { links: ["/verify/", "/verify/?lang=es"] });
    assert.equal(library.url(), "/aprender/#direccion");
    assert.equal(library.replacements.some((item) => item.includes(CA)), false);
    library.links[0]?.click();
    library.links[1]?.click();
    assert.equal(library.links[0]?.href, `/verify/#a=${CA}`);
    assert.equal(library.links[1]?.href, `/verify/?lang=es#a=${CA}`);

    const section = run("https://stubxai.com/aprender/#direccion", { links: ["/verify/"] });
    assert.deepEqual(section.replacements, []);
    section.links[0]?.click();
    assert.equal(section.links[0]?.href, "/verify/");

    const leaked = run(`https://stubxai.com/aprender/?a=${CA}#direccion`, { links: ["/verify/"] });
    assert.equal(leaked.url(), "/aprender/#direccion");
    leaked.links[0]?.click();
    assert.equal(leaked.links[0]?.href, "/verify/");
  });

  test("un dato vacío no se llama verificado y un 403 no se llama ausencia", async () => {
    const facts = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/shared/fact-state.js")).href)) as {
      factLine: (status: string, value: unknown, lang: string) => string;
      factState: (status: string, value: unknown) => string;
      missingFacts: (items: Array<{ label: string; state: string }>, lang: string) => { text: string; absentText: string };
    };
    assert.equal(facts.factState("verificado", ""), "ausente");
    assert.equal(facts.factLine("verificado", "", "es"), "ausente comprobado");
    assert.equal(facts.factLine("verificado", "", "es").includes("verificado"), false);
    assert.equal(facts.factLine("verificado", "", "es").includes("no disponible"), false);
    assert.equal(facts.factLine("fallo", null, "es"), "consulta fallida");
    assert.equal(facts.factLine("no_consultado", null, "en"), "not queried");
    assert.equal(facts.factLine("ok", null, "es"), "leído");
    const summary = facts.missingFacts(
      [
        { label: "Enlace", state: "ausente" },
        { label: "Cuentas", state: "fallo" },
      ],
      "es",
    );
    assert.match(summary.text, /Faltan datos: Cuentas/);
    assert.match(summary.text, /El servicio público no respondió, prueba otra vez en un minuto/);
    assert.equal(summary.text.includes("ausente comprobado"), false);
    assert.match(summary.absentText, /Comprobado: no existe: Enlace: ausente comprobado/);
  });

  test("Reintentar del cuaderno entra en el cupo de 6 lecturas por minuto", async () => {
    const { takeQuerySlot } = (await import(pathToFileURL(path.join(repoRoot(), "web/v2/modules/pair-report.mjs")).href)) as {
      takeQuerySlot: (stamps: number[], now: number, limit?: number, windowMs?: number) => { allowed: boolean; stamps: number[] };
    };
    let stamps: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      const slot = takeQuerySlot(stamps, 1_000 + index, 6, 60_000);
      assert.equal(slot.allowed, true);
      stamps = slot.stamps;
    }
    const blocked = takeQuerySlot(stamps, 1_006, 6, 60_000);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.stamps.length, 6);
    const opened = takeQuerySlot([0], 60_000, 6, 60_000);
    assert.equal(opened.allowed, true);
    const source = readFileSync(path.join(repoRoot(), "web/v2/assets/cuaderno.js"), "utf8");
    const consult = source.slice(source.indexOf("async function consult"), source.indexOf("async function saveNote"));
    assert.match(consult, /takeQuerySlot\(\s*queryStamps,\s*Date\.now\(\),\s*6,\s*60000\s*\)/);
    assert.match(consult, /maxRetries:\s*1/);
    assert.ok(consult.indexOf("isAllowedRpcUrl") < consult.indexOf("takeQuerySlot"));
    assert.ok(consult.indexOf("isMintAddress") < consult.indexOf("takeQuerySlot"));
    assert.ok(consult.indexOf("takeQuerySlot") < consult.indexOf("readMint"));
    assert.match(source, /addEventListener\("click", \(\) => consult\(retryMint, true\)\)/);
    assert.match(source, /Se han hecho 6 lecturas en un minuto/);
  });
});
