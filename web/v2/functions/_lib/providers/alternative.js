import { getJson } from "../limits.js";
import { disabledSet } from "../security.js";
import { num, stamp } from "../normalize.js";

export async function getFearGreed(env) {
  if (disabledSet(env).has("alternative")) {
    const error = new Error("disabled");
    error.code = "disabled";
    throw error;
  }
  const body = await getJson("https://api.alternative.me/fng/?limit=30&format=json", { provider: "alternative", timeout: 8000 });
  const rows = Array.isArray(body?.data) ? body.data : [];
  const latest = rows[0];
  if (!latest) {
    const error = new Error("empty");
    error.status = 502;
    throw error;
  }
  return stamp("Alternative.me", "https://alternative.me/crypto/fear-and-greed-index/", "Fear & Greed: Alternative.me", {
    value: num(latest.value),
    label: typeof latest.value_classification === "string" ? latest.value_classification : null,
    updatedAt: num(latest.timestamp) ? new Date(Number(latest.timestamp) * 1000).toISOString() : null,
    history: rows.slice(0, 30).map((row) => ({
      value: num(row.value),
      label: typeof row.value_classification === "string" ? row.value_classification : null,
      at: num(row.timestamp) ? new Date(Number(row.timestamp) * 1000).toISOString() : null,
    })).filter((row) => row.value != null),
  });
}
