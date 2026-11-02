/**
 * Tipo de los exchanges de CoinGecko, revisado a mano el 2026-11-02
 * contra /exchanges (las 250 primeras por volumen). El mapa gana al
 * campo `centralized` de /exchanges/{id}. Solo entra quien es, sin duda,
 * custodio (cex) o un protocolo sin custodia (dex). Dex-Trade (dextrade)
 * es un custodio: el nombre no decide.
 *
 * Los ids se guardan con guiones. `uniswap_v3` y `uniswap-v3` coinciden.
 */

const CEX = [
  "kraken", "gdax", "coinbase", "okex", "okx", "binance", "binance-us", "mxc", "mexc",
  "bitget", "bitstamp", "crypto-com", "gate", "gate-us", "gateio", "bingx", "hashkey",
  "bitunix", "ourbit", "bitvavo", "bybit", "bybit-spot", "bybit-eu", "toobit", "kucoin",
  "weex", "luno", "bullish-com", "bullish", "osl-exchange", "bitkub", "gemini", "bitbank",
  "upbit", "upbit-indonesia", "lbank", "bitso", "niza-global", "bit2me", "coinw", "digifinex",
  "zoomex", "bitazza", "btse", "byte-exchange", "bitfinex", "coinstore", "bitkan", "valr",
  "whitebit", "p2pb2b", "p2b", "coinspro", "hotcoin-global", "hotcoin", "cointr", "huobi-japan",
  "levex", "bitrue", "bithumb", "bydfi", "biconomy", "deribit", "deribit-spot", "gmo-japan",
  "hibt", "pionex", "azbit", "backpack-exchange", "phemex", "xt", "bitflyer", "xbo-com",
  "koinpark", "paribu", "huobi", "htx", "websea", "bittime", "bitopro", "kcex", "max-maicoin",
  "cex", "cex-io", "deepcoin", "ondo-global-markets", "coincheck", "paymium", "bitvenus-spot",
  "independent-reserve", "zaif", "bitlo", "btcturk", "korbit", "webot", "hata", "tokpie",
  "tdax", "bitpanda", "poloniex", "pointpay", "bitdelta", "tapbit", "coinone", "changelly",
  "changenow", "blockchain-com", "coinjar", "cryptology", "indodax", "bigone", "bitexlive",
  "coinzoom", "blofin-spot", "blofin", "wazirx", "btcmarkets", "btc-markets", "btc-alpha",
  "earnbit", "foxbit", "kanga", "toko-crypto", "dextrade", "bitbaby-exchange", "young-platform",
  "secondbtc", "gopax", "bitcoin-com", "bitexen", "bitcastle", "aivora-exchange", "grovex",
  "coindcx", "giottus", "kinesis-money", "inx-one", "bit2c", "orangex", "chainex",
  "mercado-bitcoin", "buda", "nonkyc-io", "icrypex", "exmo", "btcc", "figure-markets",
  "koinbazar", "bitci", "zebpay", "mudrex", "wootrade", "woo-x", "delta-spot", "imbx",
  "coinup", "hitbtc", "fameex", "nbx", "catex", "cryptal", "bitbegin", "vindax", "safe-trade",
  "bilaxy", "globe-exchange", "bitmart", "ascendex", "probit", "latoken", "coinex", "coinbase-pro",
  "bitmex", "hotbit", "coinlist", "bitstamp-usa", "kraken-futures",
];

const DEX = [
  "hyperliquid", "hyperliquid-spot", "near-intents", "injective", "dexalot", "chainflip",
  "tokenlon", "metalx", "magma-finance", "project-x", "openocean-finance", "pons-v2-dex",
  "lighter-spot", "bdex", "grxswap", "ref-finance", "phoenix", "idex", "airswap",
  "alien-base", "swapbased", "justswap", "iziswap", "mute", "gmx", "gmx-v2", "dydx",
  "vertex-protocol", "1inch", "paraswap", "loopring", "thorswap", "thorchain", "hashflow",
  "woofi", "jupiter", "orca", "raydium", "raydium2", "meteora", "pump-fun", "pumpswap",
];

/** Familias de protocolo. El id tiene que ser la familia o empezar por `familia-`. */
const DEX_PREFIX = [
  "uniswap", "pancakeswap", "aerodrome", "aero-slipstream", "raydium", "sunswap",
  "sushiswap", "balancer", "curve", "kyberswap", "quickswap", "velodrome", "camelot",
  "traderjoe", "trader-joe", "spookyswap", "spiritswap", "pangolin", "biswap", "apeswap",
  "osmosis", "syncswap", "maverick", "bancor", "baseswap", "thruster", "lifinity",
  "meteora", "ekubo", "pharaoh", "ramses", "pumpswap", "matcha", "blackhole", "cetus",
  "thalaswap", "dragonswap", "turbos", "bluefin", "hyperswap", "solidly", "sparkdex",
  "orca", "jupiter", "jup", "dodo", "fluid", "woofi", "hashflow", "gmx", "dydx",
];

const CEX_SET = new Set(CEX);
const DEX_SET = new Set(DEX);

export function exchangeKey(id) {
  return String(id || "").trim().toLowerCase().replace(/_/g, "-");
}

function dexFamily(key) {
  return DEX_PREFIX.some((prefix) => key === prefix || key.startsWith(`${prefix}-`));
}

/** true custodio, false protocolo, null si no está en el mapa. */
export function staticCentralized(id) {
  const key = exchangeKey(id);
  if (!key) return null;
  if (CEX_SET.has(key)) return true;
  if (DEX_SET.has(key) || dexFamily(key)) return false;
  return null;
}
