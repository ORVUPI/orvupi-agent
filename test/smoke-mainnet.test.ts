import assert from "node:assert/strict";
import { describe, test } from "node:test";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// Dirección del token anterior: se lee como cualquier otra.
const PREVIOUS = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump";
const PUBLICNODE = "https://solana-rpc.publicnode.com";
const MAINNET = "https://api.mainnet-beta.solana.com";

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let parsed: { result?: { value?: unknown }; error?: { message?: string } } = {};
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    parsed = {};
  }
  return { status: response.status, parsed };
}

function supplyFromMint(dataBase64: string) {
  const data = Buffer.from(dataBase64, "base64");
  assert.ok(data.length >= 82);
  let supply = 0n;
  for (let i = 0; i < 8; i += 1) supply |= BigInt(data[36 + i] ?? 0) << (8n * BigInt(i));
  return { supply, decimals: data[44], initialized: data[45] === 1 };
}

describe("smoke de mainnet con RPC públicos", { skip: process.env.SMOKE_MAINNET !== "1" }, () => {
  for (const mint of [USDC, PREVIOUS]) {
    test(`${mint} se lee por los bytes y un bloqueo no queda verificado`, async () => {
      const info = await rpc(PUBLICNODE, "getAccountInfo", [mint, { encoding: "base64", commitment: "confirmed" }]);
      assert.equal(info.status, 200);
      const value = info.parsed.result?.value as { data?: [string, string] } | null;
      assert.ok(value?.data?.[0]);
      const decoded = supplyFromMint(value.data[0]);
      assert.equal(decoded.initialized, true);
      assert.equal(decoded.decimals, 6);
      assert.ok(decoded.supply > 0n);

      const blocked = await rpc(PUBLICNODE, "getTokenSupply", [mint, { commitment: "confirmed" }]);
      assert.ok(blocked.status === 200 || blocked.status === 403 || blocked.status === 429);
      if (blocked.status === 403) {
        assert.match(blocked.parsed.error?.message ?? "", /personal token|indexed|blocked|forbidden/i);
        assert.equal(/verificado/.test(blocked.parsed.error?.message ?? ""), false);
      }

      const extra = await rpc(MAINNET, "getTokenSupply", [mint, { commitment: "confirmed" }]);
      if (extra.status === 200) {
        const amount = (extra.parsed.result?.value as { amount?: string } | undefined)?.amount;
        assert.equal(amount, decoded.supply.toString());
      } else {
        assert.ok(extra.status === 403 || extra.status === 429);
      }

      const largestPublic = await rpc(PUBLICNODE, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
      const largestMain = await rpc(MAINNET, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
      for (const row of [largestPublic, largestMain]) {
        if (row.status === 200 && Array.isArray((row.parsed.result?.value as unknown[] | undefined))) continue;
        assert.ok(row.status === 403 || row.status === 429 || row.status >= 500);
      }
    });
  }
});
