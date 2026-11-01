import { guarded, getJson } from "../limits.js";
import { disabledSet } from "../security.js";
import { num, stamp } from "../normalize.js";

export async function getEthGas(env) {
  if (disabledSet(env).has("chain")) {
    const error = new Error("disabled");
    error.code = "disabled";
    throw error;
  }
  const body = await guarded("chain", async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("https://ethereum-rpc.publicnode.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error("upstream");
        error.status = response.status;
        throw error;
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  });
  const wei = typeof body?.result === "string" ? Number.parseInt(body.result, 16) : NaN;
  return stamp("PublicNode", "https://ethereum-rpc.publicnode.com", "eth_gasPrice", {
    gwei: Number.isFinite(wei) ? wei / 1e9 : null,
  });
}

export async function getBtcFees(env) {
  if (disabledSet(env).has("chain")) {
    const error = new Error("disabled");
    error.code = "disabled";
    throw error;
  }
  const body = await getJson("https://mempool.space/api/v1/fees/recommended", { provider: "chain", timeout: 8000 });
  return stamp("mempool.space", "https://mempool.space/", "mempool.space fees", {
    fastest: num(body?.fastestFee),
    halfHour: num(body?.halfHourFee),
    hour: num(body?.hourFee),
    economy: num(body?.economyFee),
  });
}
