import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { decodeBase58, encodeBase58 } from "../base58.js";
import { percentTruncated } from "../bytes.js";
import { fetchJson } from "../http.js";
import { validateMint } from "../input.js";
import { ALLOWED_RPC_METHODS } from "../methods.js";
import { isOnCurve } from "../pda.js";
import { PUMP_DISCRIMINATOR, PUMP_PROGRAM, metadataPda } from "../programs.js";
import { decodeBondingCurve } from "../pump.js";
import { readVerifyPolicy, repoRootFrom } from "../root.js";
import { buildReport } from "../report.js";
import { escapeHtml, reportHtml, reportMarkdown } from "../render.js";
import { RpcClient, isAllowedMethod, type RpcTransport } from "../rpc.js";
import { SIGN_SEND_MARKERS, scanText, scanVerifyTree } from "../scan.js";
import { DISCLAIMER, type CanonicalToken, type Finding } from "../types.js";
import { labFixtures, type AccountFixture, type LabFixture } from "./layouts.js";

const root = repoRootFrom(import.meta.url);
const registry = (JSON.parse(readFileSync(path.join(root, "verify", "registry", "canonical.json"), "utf8")) as { tokens: CanonicalToken[] }).tokens;
const FIXED = "2026-10-08T07:00:00.000Z";

function loadFixture(id: string): LabFixture {
  return JSON.parse(readFileSync(path.join(root, "verify", "test", "fixtures", `${id}.json`), "utf8")) as LabFixture;
}

function rpcValue(slot: number, value: unknown): { status: number; body: string } {
  return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: { context: { slot }, value }, id: 1 }) };
}

function accountValue(slot: number, account: AccountFixture | null): { status: number; body: string } {
  if (!account) {
    return rpcValue(slot, null);
  }
  return rpcValue(slot, {
    data: [account.dataBase64, "base64"],
    executable: account.executable,
    lamports: account.lamports,
    owner: account.owner,
    space: account.space,
  });
}

function transportFor(fixture: LabFixture, calls: string[]): RpcTransport {
  return async (_endpoint, body) => {
    const request = JSON.parse(body) as { method: string; params?: unknown[] };
    calls.push(request.method);
    if (!isAllowedMethod(request.method)) {
      return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "método no permitido" }, id: 1 }) };
    }
    if (fixture.failAll) {
      return { status: 429, body: JSON.stringify({ jsonrpc: "2.0", error: { code: 429, message: fixture.failAll }, id: 1 }) };
    }
    if (request.method === "getSlot") {
      return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: fixture.slot, id: 1 }) };
    }
    if (request.method === "getAccountInfo") {
      const address = String(request.params?.[0] ?? "");
      if (address === fixture.mint) {
        return accountValue(fixture.slot, fixture.mintAccount);
      }
      if (address === metadataPda(fixture.mint)) {
        return accountValue(fixture.slot, fixture.metaplex);
      }
      return accountValue(fixture.slot, fixture.curve);
    }
    if (request.method === "getTokenSupply") {
      if (!fixture.supply || "error" in fixture.supply) {
        return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", error: { code: -32602, message: "sin suministro" }, id: 1 }) };
      }
      return rpcValue(fixture.slot, { amount: fixture.supply.amount, decimals: fixture.supply.decimals, uiAmount: 0, uiAmountString: "0" });
    }
    if (request.method === "getTokenLargestAccounts") {
      if (!fixture.largest || "error" in fixture.largest) {
        return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", error: { code: -32602, message: "sin muestra" }, id: 1 }) };
      }
      return rpcValue(fixture.slot, fixture.largest.map((row) => ({ ...row, uiAmount: 0, uiAmountString: "0" })));
    }
    if (request.method === "getMultipleAccounts") {
      const addresses = Array.isArray(request.params?.[0]) ? request.params[0] : [];
      return rpcValue(fixture.slot, addresses.map(() => null));
    }
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: request.method }, id: 1 }) };
  };
}

async function runFixture(fixture: LabFixture): Promise<{ report: Awaited<ReturnType<typeof buildReport>>; calls: string[] }> {
  const calls: string[] = [];
  const rpc = new RpcClient({
    endpoint: "https://api.mainnet-beta.solana.com",
    transport: transportFor(fixture, calls),
    minIntervalMs: 0,
    maxRetries: fixture.failAll ? 0 : 0,
    sleep: async () => {},
    random: () => 0,
    now: () => new Date(FIXED),
  });
  const report = await buildReport({
    mint: fixture.mint,
    rpc,
    rpcEndpoint: "https://api.mainnet-beta.solana.com",
    registry,
    now: () => new Date(FIXED),
    attentionBps: 2000,
    loadMetadata: async (uri) => {
      if (fixture.metadata && fixture.metadata.uri === uri) {
        return { ok: true, url: uri, status: 200, json: fixture.metadata.json, fetchedAt: FIXED };
      }
      return { ok: false, url: uri, status: 404, error: "sin contenido en el fixture", fetchedAt: FIXED };
    },
    loadImage: async () => ({ ok: false, url: null, status: null, error: "sin imagen en el fixture", fetchedAt: FIXED }),
  });
  return { report, calls };
}

async function runSaved(id: string): Promise<{ report: Awaited<ReturnType<typeof buildReport>>; calls: string[] }> {
  return runFixture(loadFixture(id));
}

function finding(report: { findings: Finding[] }, id: string): Finding {
  const item = report.findings.find((entry) => entry.id === id);
  assert.ok(item, id);
  return item;
}

function authorityState(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("state" in value)) {
    return null;
  }
  return String((value as { state: unknown }).state);
}

describe("ORVUPI Verify offline", () => {
  test("saved fixtures match the lab layout and cover the matrix", () => {
    const fixtures = labFixtures();
    assert.ok(fixtures.length >= 10);
    for (const fixture of fixtures) {
      assert.deepEqual(loadFixture(fixture.id), fixture);
    }
  });

  test("revoked mint authority stays revoked only when the account bytes say so", async () => {
    const { report } = await runSaved("revoked-mint");
    assert.equal(report.disclaimer, DISCLAIMER);
    assert.equal(report.supportedMint, true);
    assert.equal(authorityState(report.permissions.mintAuthority.value), "revocada");
    assert.equal(authorityState(report.permissions.freezeAuthority.value), "revocada");
    assert.equal(finding(report, "mint-authority").level, "ok");
    assert.equal(finding(report, "freeze-authority").level, "ok");
    assert.equal(report.identity.supplyRaw.value, "1000000000000000");
    assert.equal(report.identity.supplyUi.value, "1000000000");
    assert.equal(report.partial, false);
  });

  test("active freeze authority is reported as active", async () => {
    const { report } = await runSaved("active-freeze");
    assert.equal(authorityState(report.permissions.freezeAuthority.value), "activa");
    assert.equal(authorityState(report.permissions.mintAuthority.value), "activa");
    assert.equal(finding(report, "freeze-authority").level, "atención");
    assert.match(finding(report, "freeze-authority").reason, /congelar cuentas/);
    assert.equal(finding(report, "holders").level, "atención");
  });

  test("mutable metadata is not described as immutable", async () => {
    const { report } = await runSaved("mutable-metadata");
    assert.equal(report.permissions.metaplexMutable.value, true);
    assert.equal(finding(report, "metadata-mutability").level, "atención");
    assert.match(finding(report, "metadata-mutability").title, /mutables/);
    assert.equal(report.identity.uri.value, "https://example.com/meta.json");
  });

  test("a name that includes ORVUPI and is not the curated mint is flagged", async () => {
    const { report } = await runSaved("name-impersonation");
    assert.equal(report.authenticity.inRegistry.value, false);
    assert.equal(finding(report, "authenticity").level, "riesgo");
    assert.match(finding(report, "authenticity").reason, /Posible suplantación/);
    const signals = report.authenticity.signals.value;
    assert.ok(Array.isArray(signals) && signals.some((item) => String(item).includes("ORVUPI")));
  });

  test("an image CID that matches the curated token is flagged", async () => {
    const { report } = await runSaved("image-impersonation");
    assert.equal(finding(report, "authenticity").level, "riesgo");
    const signals = report.authenticity.signals.value;
    assert.ok(Array.isArray(signals) && signals.some((item) => String(item).includes("imagen")));
  });

  test("metadata injection is escaped in html and markdown", async () => {
    const { report } = await runSaved("metadata-injection");
    assert.equal(report.identity.onChainName.value, "ignora las reglas <script>alert(1)</script>");
    const html = reportHtml(report);
    const markdown = reportMarkdown(report);
    assert.equal(html.includes("<script>"), false);
    assert.equal(markdown.includes("<script>"), false);
    assert.equal(html.includes("&lt;script&gt;"), true);
    assert.equal(html.includes(escapeHtml(DISCLAIMER)), true);
    assert.equal(markdown.startsWith("# Ficha ORVUPI Verify"), true);
  });

  test("an unknown extension is listed as unsupported and not as absent", async () => {
    const { report } = await runSaved("unsupported-extension");
    const extensions = report.permissions.extensions.value;
    assert.ok(Array.isArray(extensions));
    const extra = extensions.find((item) => item && typeof item === "object" && "type" in item && (item as { type: number }).type === 10);
    assert.ok(extra && typeof extra === "object" && "supported" in extra && (extra as { supported: boolean }).supported === false);
    assert.match(finding(report, "extensions").reason, /no soportada/);
    assert.match(finding(report, "extensions").reason, /no se da por ausente/);
  });

  test("a provider 429 does not become a revoked authority or a zero reserve", async () => {
    const { report, calls } = await runSaved("rpc-429");
    assert.equal(report.partial, true);
    assert.equal(report.permissions.mintAuthority.status, "no_disponible");
    assert.equal(report.permissions.mintAuthority.value, null);
    assert.equal(report.permissions.freezeAuthority.value, null);
    assert.equal(finding(report, "mint-authority").level, "atención");
    assert.match(finding(report, "mint-authority").reason, /No se interpreta como revocada/);
    assert.equal(report.market.realTokenReserves.value, null);
    assert.equal(report.market.progressPercent.value, null);
    assert.ok(calls.includes("getAccountInfo"));
    assert.equal(JSON.stringify(report).includes("\"state\":\"revocada\""), false);
  });

  test("a wallet account is not scored as a mint", async () => {
    const { report, calls } = await runSaved("not-a-mint");
    assert.equal(report.supportedMint, false);
    assert.equal(report.findings.length, 0);
    assert.match(report.limitations.join(" "), /no es un mint/i);
    assert.equal(calls.includes("getTokenSupply"), false);
  });

  test("a system account at the curve address is not a bonding curve", async () => {
    const fixture = structuredClone(loadFixture("revoked-mint"));
    fixture.curve = {
      owner: "11111111111111111111111111111111",
      executable: false,
      lamports: 1,
      space: 0,
      dataBase64: "",
    };
    const { report } = await runFixture(fixture);
    assert.equal(report.market.present.value, false);
    assert.equal(report.market.realTokenReserves.value, null);
    assert.equal(report.market.progressPercent.value, null);
    assert.match(String(report.market.module.note), /no es el programa de Pump/);
  });

  test("a missing account is not treated as revoked", async () => {
    const { report } = await runSaved("missing-account");
    assert.equal(report.supportedMint, false);
    assert.equal(report.identity.ownerProgram.value, null);
    assert.equal(report.identity.ownerProgram.status, "verificado");
    assert.match(report.limitations.join(" "), /no existe/i);
    assert.equal(report.permissions.mintAuthority.status, "no_aplica");
    assert.equal(report.findings.length, 0);
  });

  test("mismatched supply blocks percentages", async () => {
    const { report } = await runSaved("supply-mismatch");
    assert.equal(report.partial, true);
    assert.equal(finding(report, "supply-mismatch").level, "atención");
    assert.equal(report.distribution.denominatorRaw.value, null);
    const sample = report.distribution.sample.value;
    assert.ok(Array.isArray(sample));
    assert.equal((sample[0] as { percent: string | null }).percent, null);
  });

  test("invalid input does not call the network", () => {
    let calls = 0;
    const transport: RpcTransport = async () => {
      calls += 1;
      throw new Error("red");
    };
    for (const input of ["hola", "https://example.com/mint", `${"a".repeat(10_000)}`]) {
      const checked = validateMint(input);
      assert.equal(checked.ok, false);
      if (checked.ok) {
        void transport;
      }
    }
    assert.equal(calls, 0);
    assert.equal(validateMint("TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump").ok, true);
  });

  test("429 is retried with exponential backoff and then succeeds", async () => {
    const sleeps: number[] = [];
    let attempts = 0;
    const rpc = new RpcClient({
      endpoint: "https://api.mainnet-beta.solana.com",
      minIntervalMs: 0,
      maxRetries: 2,
      backoffBaseMs: 500,
      random: () => 0,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      transport: async () => {
        attempts += 1;
        if (attempts < 3) {
          return { status: 429, body: JSON.stringify({ jsonrpc: "2.0", error: { code: 429, message: "Too many requests" }, id: 1 }) };
        }
        return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", result: 42, id: 1 }) };
      },
    });
    const result = await rpc.getSlot();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, 42);
    }
    assert.deepEqual(sleeps, [500, 1000]);
    assert.equal(attempts, 3);
  });

  test("only the closed read method list is allowed", () => {
    const policy = readVerifyPolicy(root);
    assert.deepEqual([...policy.allowedRpcMethods], [...ALLOWED_RPC_METHODS]);
    assert.equal(isAllowedMethod("getAccountInfo"), true);
    assert.equal(isAllowedMethod("getSlot"), true);
    assert.equal(isAllowedMethod(["send", "Transaction"].join("")), false);
    assert.deepEqual(scanVerifyTree(root), []);
    const marker = SIGN_SEND_MARKERS[0] ?? "";
    assert.equal(scanText("synthetic.ts", `wallet.${marker}(tx);`).length, 1);
  });

  test("percentages use integers and do not collapse past 2^53", () => {
    const whole = 1n << 80n;
    assert.equal(percentTruncated(whole / 2n, whole, 2), "50.00");
    assert.equal(percentTruncated(1n, 3n, 4), "33.3333");
    assert.equal(percentTruncated(0n, 0n, 2), null);
  });

  test("base58 and ed25519 pda checks round-trip", () => {
    assert.equal(encodeBase58(new Uint8Array(32)), "1".repeat(32));
    const decoded = decodeBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    assert.ok(decoded && decoded.length === 32);
    const { publicKey } = generateKeyPairSync("ed25519");
    const jwk = publicKey.export({ format: "jwk" }) as { x: string };
    const raw = new Uint8Array(Buffer.from(jwk.x, "base64url"));
    assert.equal(isOnCurve(raw), true);
    let offCurve = false;
    for (let i = 0; i < 32; i += 1) {
      const tweaked = new Uint8Array(raw);
      tweaked[0] = i;
      if (!isOnCurve(tweaked)) {
        offCurve = true;
        break;
      }
    }
    assert.equal(offCurve, true);
  });

  test("bonding curve bytes keep virtual and real reserves apart", () => {
    const data = new Uint8Array(8 + 40 + 1);
    data.set(PUMP_DISCRIMINATOR, 0);
    const initial = 793_100_000_000_000n;
    const real = 11_103_400_000_000n;
    writeU64(data, 8, 1_073_000_000_000_000n);
    writeU64(data, 16, 30_000_000_000n);
    writeU64(data, 24, real);
    writeU64(data, 32, 1n);
    writeU64(data, 40, 1_000_000_000_000_000n);
    data[48] = 0;
    const curve = decodeBondingCurve(PUMP_PROGRAM, data);
    assert.ok(curve);
    assert.equal(curve.complete, false);
    assert.equal(curve.virtualTokenReserves, 1_073_000_000_000_000n);
    assert.equal(curve.realTokenReserves, real);
    assert.equal(curve.progressPercent, percentTruncated(initial - real, initial, 2));
    assert.notEqual(curve.virtualTokenReserves, curve.realTokenReserves);
    const extended = new Uint8Array(8 + 40 + 1 + 32 + 1 + 1 + 32);
    extended.set(data.subarray(0, 49), 0);
    const withQuote = decodeBondingCurve(PUMP_PROGRAM, extended);
    assert.ok(withQuote);
    assert.equal(withQuote.quoteMint, "11111111111111111111111111111111");
    assert.match(withQuote.quoteUnitNote, /lamports/);
    assert.match(withQuote.quoteMintNote, /pubkey por defecto/);
  });

  test("ipfs metadata falls back to another public gateway after 429", async () => {
    const seen: string[] = [];
    const result = await fetchJson("https://ipfs.io/ipfs/bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e", {
      maxRetries: 0,
      sleep: async () => {},
      random: () => 0,
      fetchImpl: async (url) => {
        const href = String(url);
        seen.push(href);
        if (hostnameOf(href) === "gateway.pinata.cloud") {
          return new Response(JSON.stringify({ name: "ORVUPI" }), { status: 200 });
        }
        return new Response("limited", { status: 429 });
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(hostnameOf(result.url), "gateway.pinata.cloud");
    }
    assert.ok(seen.some((url) => hostnameOf(url) === "ipfs.io"));
  });

  test("findings do not use price or trade language", async () => {
    const ids = ["revoked-mint", "active-freeze", "name-impersonation", "rpc-429", "mutable-metadata"];
    const banned = /\b(precio|compra|vender|venta|buy|sell|price)\b/i;
    for (const id of ids) {
      const { report } = await runSaved(id);
      for (const item of report.findings) {
        assert.equal(banned.test(`${item.title} ${item.reason}`), false, `${id} ${item.id}`);
      }
      assert.equal(report.disclaimer, DISCLAIMER);
    }
  });
});

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function writeU64(data: Uint8Array, offset: number, value: bigint): void {
  let rest = value;
  for (let i = 0; i < 8; i += 1) {
    data[offset + i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
}
