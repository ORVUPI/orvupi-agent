/** Lecturas públicas de solo lectura. Si fallan, no se inventa ninguna cifra. */

const LIVE = /\b(inversi[oó]n(?:es)?|bolsa|mercados?|acciones|bonos|criptomonedas?|cripto|bitcoin|ethereum|divisas?|inflaci[oó]n|tipos de inter[eé]s|cotizaci[oó]n)\b/i;

export function wantsLiveFacts(question) {
  return LIVE.test(String(question || ""));
}

async function readJson(fetchImpl, url, timeoutMs) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  return response.json();
}

function rateLine(amount, code) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return "";
  return `1 EUR = ${number} ${code}.`;
}

export async function liveFacts(question, options = {}) {
  if (!wantsLiveFacts(question)) return { text: "", sources: [] };
  const fetchImpl = options.fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 2500;
  const blocks = [];
  const sources = [];
  try {
    const fx = await readJson(fetchImpl, "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", timeoutMs);
    const date = String(fx?.date || "");
    const lines = [rateLine(fx?.rates?.USD, "USD"), rateLine(fx?.rates?.GBP, "GBP")].filter(Boolean);
    if (date && lines.length) {
      blocks.push(`[fx] Fuente: Frankfurter, tipos de referencia del BCE. Fecha: ${date}.\n${lines.join(" ")}`);
      sources.push({ id: "fx", name: "Frankfurter", date });
    }
  } catch { /* sin tipo de cambio */ }
  try {
    const coin = await readJson(fetchImpl, "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd", timeoutMs);
    const btc = Number(coin?.bitcoin?.usd);
    const eth = Number(coin?.ethereum?.usd);
    const lines = [];
    if (Number.isFinite(btc)) lines.push(`Bitcoin: ${btc} USD.`);
    if (Number.isFinite(eth)) lines.push(`Ethereum: ${eth} USD.`);
    if (lines.length) {
      const at = new Date().toISOString();
      blocks.push(`[btc] Fuente: CoinGecko. Consultado: ${at}.\n${lines.join(" ")}`);
      sources.push({ id: "btc", name: "CoinGecko", date: at });
    }
  } catch { /* sin cripto */ }
  return { text: blocks.join("\n\n"), sources };
}
