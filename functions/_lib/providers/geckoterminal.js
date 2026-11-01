import { getJson } from "../limits.js";
import { disabledSet, httpsUrl, imageUrl } from "../security.js";
import { num, stamp, text } from "../normalize.js";

const HOME = "https://www.geckoterminal.com/";
const ATTR = "On-chain data provided by GeckoTerminal";

function disabled(env) {
  if (!disabledSet(env).has("geckoterminal")) return;
  const error = new Error("disabled");
  error.code = "disabled";
  throw error;
}

async function gt(env, path) {
  disabled(env);
  return getJson(`https://api.geckoterminal.com/api/v2${path}`, {
    provider: "geckoterminal",
    timeout: 10000,
    headers: { accept: "application/json;version=20230203" },
  });
}

function meta(extra) {
  return stamp("GeckoTerminal", HOME, ATTR, extra);
}

function includedMap(body) {
  const map = new Map();
  for (const item of body?.included || []) {
    if (item?.id) map.set(`${item.type}:${item.id}`, item);
  }
  return map;
}

export function poolRow(raw, map) {
  const attr = raw?.attributes || {};
  const baseRel = raw?.relationships?.base_token?.data;
  const dexRel = raw?.relationships?.dex?.data;
  const base = baseRel ? map.get(`${baseRel.type}:${baseRel.id}`) : null;
  const dex = dexRel ? map.get(`${dexRel.type}:${dexRel.id}`) : null;
  const network = raw?.relationships?.network?.data?.id || String(raw?.id || "").split("_")[0] || null;
  return {
    id: raw?.id || null,
    name: text(attr.name, 120),
    address: text(attr.address, 120),
    network,
    price: num(attr.base_token_price_usd),
    ch24h: num(attr.price_change_percentage?.h24),
    volume24h: num(attr.volume_usd?.h24),
    reserveUsd: num(attr.reserve_in_usd),
    createdAt: text(attr.pool_created_at, 40),
    baseSymbol: text(base?.attributes?.symbol, 24),
    baseAddress: text(base?.attributes?.address, 120),
    image: imageUrl(base?.attributes?.image_url),
    dex: text(dex?.attributes?.name, 80),
    url: network && attr.address ? httpsUrl(`https://www.geckoterminal.com/${network}/pools/${attr.address}`) : null,
  };
}

function rowsOf(body) {
  const map = includedMap(body);
  return (body?.data || []).map((row) => poolRow(row, map)).filter((row) => row.id);
}

export async function trendingPools(env) {
  const body = await gt(env, "/networks/trending_pools?page=1");
  return meta({ pools: rowsOf(body).slice(0, 20) });
}

export async function newPools(env) {
  const body = await gt(env, "/networks/new_pools?page=1");
  return meta({ pools: rowsOf(body).slice(0, 20) });
}

export async function searchPools(env, query) {
  const body = await gt(env, `/search/pools?query=${encodeURIComponent(query)}`);
  return meta({ pools: rowsOf(body).slice(0, 8) });
}

const NETWORK = {
  ethereum: "eth",
  "binance-smart-chain": "bsc",
  "polygon-pos": "polygon_pos",
  "arbitrum-one": "arbitrum",
  "optimistic-ethereum": "optimism",
  avalanche: "avax",
  solana: "solana",
  base: "base",
  tron: "tron",
};

export function geckoNetwork(platform) {
  return NETWORK[platform] || null;
}

export async function tokenPools(env, network, address) {
  const body = await gt(env, `/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(address)}/pools?page=1`);
  return meta({ pools: rowsOf(body).slice(0, 12), network });
}
