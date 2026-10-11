/**
 * Registro de redes. Solana y Base están encendidas.
 * Ethereum y BNB Chain están en la lista con enabled: false.
 * Encenderlas es cambiar ese campo: el lector EVM y el selector ya las conocen.
 */
import data from "./networks.json" with { type: "json" };
import { setMarketDirectory } from "./market-read.js";
import { setNotebookQuoteLookup } from "./reading-summary.js";

export const NETWORK_SCHEMA = data.schema;
export const DEFAULT_NETWORK = data.default;

export function allNetworks() {
  return data.networks;
}

export function networkById(id) {
  return data.networks.find((item) => item.id === id) || null;
}

export function enabledNetworks() {
  return data.networks.filter((item) => item.enabled);
}

export function isEnabledNetwork(id) {
  const network = networkById(id);
  return Boolean(network && network.enabled);
}

export function checksFor(networkId) {
  const network = networkById(networkId);
  const family = network ? network.family : "";
  const available = [];
  const unavailable = [];
  for (const check of data.checks) {
    if (check.on.includes(family)) available.push(check);
    else unavailable.push(check);
  }
  return { available, unavailable };
}

export function knownQuote(networkId, address) {
  const network = networkById(networkId);
  if (!network || !network.knownQuotes || typeof address !== "string") return "";
  return network.knownQuotes[address.toLowerCase()] || "";
}

setMarketDirectory(networkById);
setNotebookQuoteLookup(knownQuote);

export function rpcHost(networkId) {
  const network = networkById(networkId);
  if (!network || typeof network.rpc !== "string" || !network.rpc) return "";
  try {
    return new URL(network.rpc).host;
  } catch {
    return "";
  }
}
