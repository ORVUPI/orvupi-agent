import { api, qs } from "../api.mjs";
import { chartHost, chartNote, drawChart, rsi } from "../chart.mjs";
import { btcPrice, compact, day, money, plain, show, when } from "../format.mjs";
import { categoryName, pageTitle, t } from "../i18n.mjs";
import { parseRoute, setCrumb } from "../shell.mjs";
import { activeList, snapshot, uid, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, field, logo, missing, pagedBlock, pctNode, setChildren, skeleton, sourceLine } from "../ui.mjs";
import { positionOf } from "./portfolio.mjs";

const TABS = ["resumen", "estadisticas", "mercados", "cartera", "acerca", "historico"];
const PERIODS = [["1h", "1", "1h"], ["24h", "1", ""], ["7d", "7", ""], ["30d", "30", ""], ["90d", "90", ""], ["1y", "365", ""], ["ytd", "365", "ytd"], ["all", "max", ""]];
const CHAINS = { ethereum: "ethereum", solana: "solana", base: "base", "binance-smart-chain": "bnb", "polygon-pos": "polygon", "arbitrum-one": "arbitrum", "optimistic-ethereum": "optimism", avalanche: "avalanche", tron: "tron" };

let stopChart = null;
let ticket = 0;

export async function mount(host, ctx) {
  const mine = ++ticket;
  stopChart?.();
  stopChart = null;
  if (!ctx.route.id) {
    host.replaceChildren(emptyBlock());
    return;
  }
  host.replaceChildren(skeleton(12));
  const vs = snapshot().prefs.vs;
  try {
    const coin = await api(`/api/sonar/coin/${ctx.route.id}${qs({ vs })}`);
    if (mine !== ticket || parseRoute().section !== "crypto" || parseRoute().id !== ctx.route.id) return;
    const tab = TABS.includes(ctx.route.params.get("tab")) ? ctx.route.params.get("tab") : "resumen";
    paint(host, ctx, coin, tab, mine);
    document.title = pageTitle(`${coin.name} (${coin.symbol})`);
    setCrumb([{ label: coin.name }]);
  } catch (error) {
    if (mine !== ticket) return;
    host.replaceChildren(error.status === 404 ? emptyBlock(t("missingCoin")) : errorBlock(() => mount(host, ctx)));
  }
}

function paint(host, ctx, coin, tab, mine) {
  const page = el("article", { class: "sn-coin", "data-sn": "coin", "data-coin": coin.id });
  const panel = el("div", { id: "sn-coin-panel" });
  const main = el("div", { class: "sn-coin-main" }, [tabs(ctx, tab), panel]);
  const extra = el("div", { class: "sn-coin-extra" }, [sideStats(coin), links(coin), contractChips(ctx, coin)]);
  page.append(el("div", { class: "sn-coin-layout" }, [header(ctx, coin), main, extra]));
  host.replaceChildren(page);
  if (tab === "resumen") summary(panel, ctx, coin, mine);
  else if (tab === "estadisticas") {
    panel.append(stats(coin), converter(coin));
    treasury(ctx, coin).then((node) => { if (node && panel.isConnected) panel.append(node); });
  }
  else if (tab === "mercados") markets(panel, ctx, coin);
  else if (tab === "cartera") panel.append(holding(ctx, coin));
  else if (tab === "acerca") setChildren(panel, [about(ctx, coin), contracts(ctx, coin)]);
  else history(panel, ctx, coin);
}

function header(ctx, coin) {
  const vs = coin.vs || snapshot().prefs.vs;
  return el("header", { class: "sn-coinhead" }, [
    el("button", { type: "button", class: "sn-btn", onclick: () => ctx.go("/sonar/"), text: t("back") }),
    logo(coin),
    el("div", {}, [el("h2", { text: coin.name }), el("p", { text: `${coin.symbol} · ${t("rankOf")} ${show(coin.rank)}` })]),
    el("div", { class: "sn-coinpx" }, [
      el("strong", { "data-k": "price", text: show(money(coin.price, vs)) }),
      el("span", { "data-k": "ch24h" }, pctNode(coin.ch24h)),
      el("small", { text: `${t("inBtc")} ${show(btcPrice(coin.priceBtc, coin.id))}` }),
    ]),
    el("div", { class: "sn-actions" }, [
      el("button", { type: "button", class: "sn-btn", "data-sn": "share", onclick: () => share(ctx, coin), text: t("share") }),
      el("button", { type: "button", class: "sn-star", "data-sn-star": coin.id, "aria-label": t("starAdd"), onclick: () => star(coin), text: "★" }),
      el("button", { type: "button", class: "sn-btn", "data-sn": "alert", onclick: () => alertForm(coin), text: t("saveAlert") }),
    ]),
  ]);
}

function tabs(ctx, tab) {
  return el("div", { class: "sn-tabs", "data-sn": "coin-tabs" }, TABS.map((id) => el("button", {
    type: "button",
    class: "sn-tab",
    "data-sn-tab": id,
    "aria-selected": tab === id ? "true" : "false",
    onclick: () => ctx.go(`/sonar/crypto/${ctx.route.id}?tab=${id}`),
    text: t(id === "resumen" ? "summary" : id === "estadisticas" ? "stats" : id === "mercados" ? "mkts" : id === "cartera" ? "wallet" : id === "acerca" ? "about" : "hist"),
  })));
}

async function summary(panel, ctx, coin, mine) {
  const chart = chartHost();
  const tools = el("div", { class: "sn-tools", "data-sn": "periods" });
  let mode = "line";
  let period = "24h";
  let compare = "";
  let sma = false;
  let drawSeq = 0;
  const note = el("p", { class: "sn-note" });
  const read = el("p", { class: "sn-note", "data-sn": "rsi" });
  for (const [id, , ] of PERIODS) {
    tools.append(el("button", { type: "button", class: id === period ? "sn-btn on" : "sn-btn", "data-sn-period": id, onclick: () => { period = id; draw(); }, text: t(id === "1h" ? "p1h" : id === "24h" ? "p24h" : id === "7d" ? "p7d" : id === "30d" ? "p30d" : id === "90d" ? "p90d" : id === "1y" ? "p1y" : id === "ytd" ? "ytd" : "all") }));
  }
  tools.append(
    el("button", { type: "button", class: "sn-btn", "data-sn": "mode-line", onclick: () => { mode = "line"; draw(); }, text: t("line") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "mode-candles", onclick: () => { mode = "candles"; draw(); }, text: t("candles") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "sma", onclick: () => { sma = !sma; draw(); }, text: t("sma") }),
  );
  const select = el("select", { "data-sn": "compare", onchange: (event) => { compare = event.target.value; draw(); } }, [el("option", { value: "", text: t("none") }), el("option", { value: "bitcoin", text: t("btc") }), el("option", { value: "ethereum", text: t("eth") })]);
  setChildren(panel, [tools, el("label", { class: "sn-select", text: t("compare") }, select), chart, note, read, converter(coin), sourceLine(coin)]);
  async function draw() {
    tools.querySelectorAll("[data-sn-period]").forEach((button) => button.classList.toggle("on", button.getAttribute("data-sn-period") === period));
    const spec = PERIODS.find((row) => row[0] === period);
    const seq = ++drawSeq;
    chart.setAttribute("aria-busy", "true");
    chart.style.opacity = "0.45";
    try {
      const path = mode === "candles"
        ? `/api/sonar/coin/${coin.id}/ohlc${qs({ vs: coin.vs, days: spec[1] === "max" ? "365" : spec[1] })}`
        : `/api/sonar/coin/${coin.id}/chart${qs({ vs: coin.vs, days: spec[1], interval: spec[2] === "1h" ? "1h" : "" })}`;
      const payload = await api(path);
      if (mine !== ticket || seq !== drawSeq) return;
      let points = payload.points || [];
      if (spec[2] === "ytd") {
        const start = Date.parse(`${new Date().getUTCFullYear()}-01-01T00:00:00Z`);
        points = points.filter((row) => row[0] >= start);
        payload.points = points;
        payload.maxRangeNote = t("ytdNote");
      }
      let other = null;
      if (compare && compare !== coin.id && mode === "line") other = await api(`/api/sonar/coin/${compare}/chart${qs({ vs: coin.vs, days: spec[1] === "max" ? "365" : spec[1] })}`);
      if (mine !== ticket || seq !== drawSeq) return;
      chart.removeAttribute("aria-busy");
      chart.style.opacity = "";
      stopChart?.();
      stopChart = await drawChart(chart, payload, { mode, compare: other, sma, markers: [] });
      note.textContent = [chartNote(payload), compare ? t("compareNote") : "", mode === "candles" ? t("candleNote") : ""].filter(Boolean).join(" ");
      const value = rsi(payload.points);
      read.textContent = value == null ? "" : `${t("rsi")}: ${plain(value, 1)} · ${t("calc")}`;
    } catch {
      if (mine !== ticket || seq !== drawSeq) return;
      chart.removeAttribute("aria-busy");
      chart.style.opacity = "";
      chart.replaceChildren(errorBlock(draw));
    }
  }
  draw();
}

function stats(coin) {
  const vs = coin.vs || "usd";
  const ratio = coin.volume24h != null && coin.marketCap ? coin.volume24h / coin.marketCap : null;
  const circ = coin.circulating != null && coin.max ? (coin.circulating / coin.max) * 100 : null;
  return el("section", { class: "sn-stats-grid", "data-sn": "stats" }, [
    field(t("mcap"), text(compact(coin.marketCap, vs))),
    field(t("volume"), text(compact(coin.volume24h, vs))),
    field(t("fdv"), text(compact(coin.fdv, vs))),
    field(t("volMcap"), text(ratio == null ? null : plain(ratio, 4))),
    field(t("supply"), text(plain(coin.circulating, 0))),
    field(t("total"), text(plain(coin.total, 0))),
    field(t("max"), text(plain(coin.max, 0))),
    field(t("circPct"), text(circ == null ? null : `${plain(circ, 2)}%`)),
    field(t("high24"), text(money(coin.high24h, vs))),
    field(t("low24"), text(money(coin.low24h, vs))),
    field(t("ath"), text(coin.ath == null ? null : `${money(coin.ath, vs)} · ${day(coin.athDate) || ""}`)),
    field(t("fromAth"), pctNode(coin.athChange)),
    field(t("atl"), text(coin.atl == null ? null : `${money(coin.atl, vs)} · ${day(coin.atlDate) || ""}`)),
    field(t("fromAtl"), pctNode(coin.atlChange)),
    field(t("h1"), pctNode(coin.ch1h)),
    field(t("d7"), pctNode(coin.ch7d)),
    coin.sentimentUp == null ? null : field(t("votes"), text(`${plain(coin.sentimentUp, 0)}%`)),
  ]);
}

function text(value) {
  if (value == null || value === "") return missing();
  return document.createTextNode(String(value));
}

function sideStats(coin) {
  const vs = coin.vs || "usd";
  const ratio = coin.volume24h != null && coin.marketCap ? coin.volume24h / coin.marketCap : null;
  const circ = coin.circulating != null && coin.max ? (coin.circulating / coin.max) * 100 : null;
  const items = [
    [t("mcap"), compact(coin.marketCap, vs)],
    [t("volume"), compact(coin.volume24h, vs)],
    [t("fdv"), compact(coin.fdv, vs)],
    [t("volMcap"), ratio == null ? null : plain(ratio, 4)],
    [t("supply"), plain(coin.circulating, 0)],
    [t("max"), plain(coin.max, 0)],
    [t("circPct"), circ == null ? null : `${plain(circ, 2)}%`],
    [t("high24"), money(coin.high24h, vs)],
    [t("low24"), money(coin.low24h, vs)],
  ];
  const list = el("dl", { class: "sn-sidestats", "data-sn": "side-stats" });
  for (const [label, value] of items) list.append(el("dt", { text: label }), el("dd", {}, text(value)));
  list.append(
    el("dt", { text: t("h1") }), el("dd", {}, pctNode(coin.ch1h)),
    el("dt", { text: t("h24") }), el("dd", { "data-k": "ch24h" }, pctNode(coin.ch24h)),
    el("dt", { text: t("d7") }), el("dd", {}, pctNode(coin.ch7d)),
  );
  return list;
}

function converter(coin) {
  const input = el("input", { type: "number", min: "0", step: "any", value: "1", "data-sn": "convert", oninput: sync });
  const out = el("output", { "data-sn": "convert-out" });
  function sync() {
    const qty = Number(input.value);
    out.textContent = !Number.isFinite(qty) || coin.price == null ? t("unavailable") : show(money(qty * coin.price, coin.vs));
  }
  sync();
  return el("section", { class: "sn-box sn-converter", "data-sn": "converter" }, [
    el("h3", { text: t("converter") }),
    el("span", { text: t("youHave") }),
    input,
    el("span", { class: "sn-convert-unit", text: coin.symbol || "" }),
    el("span", { text: t("worth") }),
    out,
  ]);
}

function about(ctx, coin) {
  const box = el("section", { class: "sn-box", "data-sn": "about" }, [el("h3", { text: t("about") })]);
  if (!coin.description) box.append(el("p", { text: t("noDesc") }));
  else {
    box.append(el("p", { text: coin.description }));
    if (coin.descriptionLang === "en") box.append(el("p", { class: "sn-note", text: t("descEn") }));
  }
  if (coin.categories?.length) {
    const chips = coin.categories.filter((name) => name && name !== "null").map((name) => el("span", { class: "sn-chip", "data-name": name, text: categoryName(name) }));
    box.append(el("div", { class: "sn-pills" }, chips));
    api(`/api/sonar/categories${qs({ vs: coin.vs || "usd" })}`).then((body) => {
      const ids = new Map((body.rows || []).map((row) => [String(row.name || "").toLowerCase(), row.id]));
      for (const chip of chips) {
        if (!chip.isConnected) continue;
        const id = ids.get(String(chip.getAttribute("data-name")).toLowerCase());
        if (!id) continue;
        chip.replaceWith(el("a", { class: "sn-pill", href: `${ctx.prefix}/sonar/categories/${encodeURIComponent(id)}`, text: chip.textContent }));
      }
    }).catch(() => { /* sin ficha: el chip no enlaza */ });
  }
  const source = sourceLine(coin);
  if (source) box.append(source);
  return box;
}

const LINK_NAMES = {
  "x.com": "X", "twitter.com": "X", "t.me": "Telegram", "telegram.me": "Telegram",
  "discord.com": "Discord", "discord.gg": "Discord", "github.com": "GitHub",
  "reddit.com": "Reddit", "www.reddit.com": "Reddit", "facebook.com": "Facebook", "www.facebook.com": "Facebook",
  "etherscan.io": "Etherscan", "bscscan.com": "BscScan", "solscan.io": "Solscan",
  "arbiscan.io": "Arbiscan", "optimistic.etherscan.io": "Optimism Explorer", "polygonscan.com": "Polygonscan",
  "basescan.org": "BaseScan", "snowtrace.io": "Snowtrace",
};

function hostOf(href) {
  try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function linkLabel(href, fallback) {
  const host = hostOf(href);
  return LINK_NAMES[host] || LINK_NAMES[`www.${host}`] || host || fallback;
}

function links(coin) {
  const bag = coin.links || {};
  const rows = [];
  const seenHref = new Set();
  const seenLabel = new Set();
  const repos = (bag.github || []).filter((href) => href && href !== "null");
  const unique = new Set(["github", "x", "telegram", "reddit", "facebook"]);
  const add = (label, href, count) => {
    if (!href || href === "null" || /<|>|%3C|%3E/i.test(href)) return;
    const key = String(label || "").trim().toLowerCase();
    if (unique.has(key) && seenLabel.has(key)) return;
    let norm = String(href).trim().toLowerCase();
    try { norm = new URL(href).href.replace(/\/$/, "").toLowerCase(); } catch { /* se queda el texto */ }
    if (seenHref.has(norm)) return;
    seenHref.add(norm);
    seenLabel.add(key);
    const text = count != null ? `${label} · ${plain(count, 0)}` : label;
    rows.push(el("a", { href, rel: "noreferrer", text }));
  };
  for (const href of bag.homepage || []) {
    if (repos.length && hostOf(href).endsWith("github.com")) continue;
    add(linkLabel(href, t("website")), href);
  }
  add(t("whitepaper"), bag.whitepaper);
  for (const href of bag.explorers || []) add(linkLabel(href, t("explorers")), href);
  add("X", bag.twitter, coin.followers?.twitter);
  add("Telegram", bag.telegram, coin.followers?.telegram);
  add("Reddit", bag.reddit, coin.followers?.reddit);
  add("Facebook", bag.facebook);
  for (const href of bag.chat || []) {
    if (repos.length && hostOf(href).endsWith("github.com")) continue;
    add(linkLabel(href, t("community")), href);
  }
  for (const href of bag.forum || []) add(linkLabel(href, t("community")), href);
  for (const href of repos) add("GitHub", href);
  if (!rows.length) return null;
  return el("section", { class: "sn-sideblock", "data-sn": "links" }, [el("h3", { text: t("community") }), el("div", { class: "sn-links" }, rows)]);
}

const CHAIN_NAMES = {
  ethereum: "Ethereum", bitcoin: "Bitcoin", solana: "Solana", base: "Base",
  "binance-smart-chain": "BNB Chain", "polygon-pos": "Polygon", "arbitrum-one": "Arbitrum",
  "optimistic-ethereum": "Optimism", avalanche: "Avalanche", tron: "Tron",
};
const CHAIN_ORDER = ["ethereum", "bitcoin", "solana", "base", "binance-smart-chain", "polygon-pos", "arbitrum-one", "optimistic-ethereum", "avalanche", "tron"];
const EXPLORER = {
  ethereum: (address) => `https://etherscan.io/token/${address}`,
  "binance-smart-chain": (address) => `https://bscscan.com/token/${address}`,
  solana: (address) => `https://solscan.io/token/${address}`,
  base: (address) => `https://basescan.org/token/${address}`,
  "polygon-pos": (address) => `https://polygonscan.com/token/${address}`,
  "arbitrum-one": (address) => `https://arbiscan.io/token/${address}`,
  "optimistic-ethereum": (address) => `https://optimistic.etherscan.io/token/${address}`,
  avalanche: (address) => `https://snowtrace.io/token/${address}`,
  tron: (address) => `https://tronscan.org/#/token20/${address}`,
};

function chainName(id) {
  return CHAIN_NAMES[id] || id.replace(/-/g, " ");
}

function contractItem(ctx, platform, address) {
  const chain = CHAINS[platform];
  const verifyHref = chain ? `${ctx.prefix}/verify/?chain=${chain}&address=${encodeURIComponent(address)}#ficha` : null;
  const explorer = EXPLORER[platform]?.(address) || null;
  return el("li", {}, [
    el("strong", { text: chainName(platform) }),
    el("code", { text: address }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "copy-contract", onclick: () => copy(address), text: t("copyAddr") }),
    explorer ? el("a", { href: explorer, rel: "noreferrer", text: linkLabel(explorer, t("explorers")) }) : null,
    verifyHref ? el("a", { href: verifyHref, text: t("verify") }) : null,
  ]);
}

function contractEntries(coin) {
  const entries = Object.entries(coin.platforms || {}).filter(([, address]) => address && address !== "null");
  entries.sort((a, b) => {
    const ai = CHAIN_ORDER.indexOf(a[0]);
    const bi = CHAIN_ORDER.indexOf(b[0]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return entries;
}

function shortAddr(address) {
  const text = String(address);
  if (text.length <= 14) return text;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}

function contractChips(ctx, coin) {
  const entries = contractEntries(coin);
  if (!entries.length) return null;
  const row = el("div", { class: "sn-links" });
  for (const [platform, address] of entries.slice(0, 3)) {
    const explorer = EXPLORER[platform]?.(address);
    const label = `${chainName(platform)} ${shortAddr(address)}`;
    row.append(explorer
      ? el("a", { class: "sn-chip", href: explorer, rel: "noreferrer", text: label })
      : el("span", { class: "sn-chip", text: label }));
  }
  if (entries.length > 3) {
    row.append(el("button", {
      type: "button",
      class: "sn-btn",
      "data-sn": "see-contracts",
      onclick: () => ctx.go(`/sonar/crypto/${coin.id}?tab=acerca&contracts=1`),
      text: t("seeAll"),
    }));
  }
  return el("section", { class: "sn-sideblock", "data-sn": "contract-chips" }, [el("h3", { text: t("contracts") }), row]);
}

function contracts(ctx, coin) {
  const entries = contractEntries(coin);
  if (!entries.length) return null;
  const preview = el("ul", { class: "sn-contracts sn-contract-preview" });
  entries.slice(0, 3).forEach(([platform, address]) => preview.append(contractItem(ctx, platform, address)));
  const box = el("section", { class: "sn-box sn-box-flat", "data-sn": "contracts" }, [
    el("h3", { text: t("contracts") }),
    preview,
  ]);
  if (entries.length <= 3) return box;
  const full = el("div", { class: "sn-contract-all", hidden: true, "data-sn": "contracts-all" });
  const state = { page: 1, per: 8, paint() {} };
  state.paint = () => {
    full.replaceChildren(pagedBlock(entries, state, [8, 16], (slice) => el("ul", { class: "sn-contracts" }, slice.map(([platform, address]) => contractItem(ctx, platform, address)))));
  };
  const open = ctx.route.params.get("contracts") === "1";
  const btn = el("button", {
    type: "button",
    class: "sn-btn",
    "data-sn": "contracts-all-btn",
    text: open ? t("close") : t("seeAll"),
    onclick: () => {
      full.hidden = !full.hidden;
      if (!full.hidden && !full.childElementCount) state.paint();
      btn.textContent = full.hidden ? t("seeAll") : t("close");
    },
  });
  box.append(btn, full);
  if (open) {
    full.hidden = false;
    state.paint();
  }
  return box;
}

async function markets(panel, ctx, coin) {
  panel.append(skeleton(6));
  try {
    const body = await api(`/api/sonar/coin/${coin.id}/tickers${qs({ type: "all", vs: coin.vs })}`);
    const ref = coin.price;
    const rawSpot = body.spot?.rows || [];
    const rawDex = body.dex || [];
    const inBand = (price) => {
      if (price == null) return false;
      if (!ref) return true;
      const ratio = price / ref;
      return ratio <= 3 && ratio >= 0.3;
    };
    const spot = rawSpot.filter((row) => {
      if (row.volume24h == null || row.volume24h <= 0 || row.price == null) return false;
      if (row.coinId && row.coinId !== coin.id) return false;
      return inBand(row.price);
    }).sort((a, b) => b.volume24h - a.volume24h);
    const dex = rawDex.filter((pool) => pool.price == null || inBand(pool.price));
    const showTrust = spot.some((row) => row.trust);
    const total = spot.reduce((sum, row) => sum + (row.volume24h || 0), 0);
    const heads = [t("exchange"), t("pair"), t("price"), t("spread"), t("depth"), t("volume"), t("ofVol"), showTrust ? t("trust") : null, t("updated")].filter(Boolean);
    function cexTable(slice) {
      const table = el("table", { class: "sn-table" });
      table.append(el("thead", {}, el("tr", {}, heads.map((label) => el("th", { text: label })))));
      const tbody = el("tbody");
      for (const row of slice) {
        tbody.append(el("tr", {}, [
          el("td", {}, row.exchangeId ? el("a", { href: `${ctx.prefix}/sonar/exchanges/${row.exchangeId}`, text: row.exchangeName || row.exchangeId }) : (row.exchangeName || t("unavailable"))),
          el("td", { text: row.base && row.target ? `${row.base}/${row.target}` : t("unavailable") }),
          el("td", { text: show(money(row.price, coin.vs)) }),
          el("td", { text: row.spreadPct == null ? t("unavailable") : `${plain(row.spreadPct, 3)}%` }),
          el("td", { text: row.depthUp2 == null && row.depthDown2 == null ? t("unavailable") : `${show(compact(row.depthUp2, coin.vs))} / ${show(compact(row.depthDown2, coin.vs))}` }),
          el("td", { text: show(compact(row.volume24h, coin.vs)) }),
          el("td", { text: row.volume24h != null && total ? `${plain((row.volume24h / total) * 100, 2)}%` : t("unavailable") }),
          showTrust ? el("td", { text: row.trust || "" }) : null,
          el("td", { text: row.lastTradedAt ? when(row.lastTradedAt) : t("unavailable") }),
        ]));
      }
      table.append(tbody);
      return el("div", { class: "sn-scroll" }, table);
    }
    function dexList(slice) {
      return el("ul", { class: "sn-pools" }, slice.map((pool) => el("li", {}, [
        el("a", { href: pool.url || `${ctx.prefix}/sonar/crypto/${coin.id}`, rel: "noreferrer", text: pool.name || pool.dex || t("pool") }),
        el("span", { text: show(money(pool.price, coin.vs)) }),
        el("span", { text: show(compact(pool.reserveUsd, coin.vs)) }),
        el("small", { text: pool.network || "" }),
      ])));
    }
    const venues = [];
    if (spot.length) venues.push("cex");
    if (dex.length) venues.push("dex");
    let active = venues[0] || "cex";
    const state = { cex: { page: 1, per: 20, paint() {} }, dex: { page: 1, per: 20, paint() {} } };
    const dexSource = rawDex[0] ? { source: "GeckoTerminal", sourceUrl: "https://www.geckoterminal.com/", attribution: t("gt"), fetchedAt: body.spot?.fetchedAt } : null;
    const paint = () => {
      if (!venues.length) {
        const note = rawSpot.length || rawDex.length ? t("noPairPrice") : t("noCex");
        setChildren(panel, [el("h3", { text: t("mkts") }), emptyBlock(note), sourceLine(body.spot)]);
        return;
      }
      if (!venues.includes(active)) active = venues[0];
      const rows = active === "cex" ? spot : dex;
      const st = state[active];
      st.paint = paint;
      setChildren(panel, [
        el("h3", { text: t("mkts") }),
        venues.length > 1 ? el("div", { class: "sn-tabs", role: "tablist", "data-sn": "market-tabs" }, venues.map((id) => marketTab(id, t(id)))) : null,
        pagedBlock(rows, st, [10, 20], (slice) => (active === "cex" ? cexTable(slice) : dexList(slice))),
        active === "cex" ? el("p", { class: "sn-note", text: t("liq") }) : null,
        sourceLine(active === "cex" ? body.spot : dexSource),
      ]);
    };
    function marketTab(id, label) {
      return el("button", {
        type: "button",
        class: "sn-tab",
        role: "tab",
        "data-sn-venue": id,
        "aria-selected": active === id ? "true" : "false",
        onclick: () => {
          active = id;
          paint();
        },
        text: label,
      });
    }
    paint();
  } catch {
    panel.replaceChildren(errorBlock(() => markets(panel, ctx, coin)));
  }
}

async function history(panel, ctx, coin) {
  panel.append(skeleton(8));
  try {
    const body = await api(`/api/sonar/coin/${coin.id}/history${qs({ vs: coin.vs, days: "90" })}`);
    const rows = (body.rows || []).slice().reverse();
    const state = { page: 1, per: 15, paint() {} };
    state.paint = () => {
      if (!panel.isConnected) return;
      panel.replaceChildren(
        el("h3", { text: t("hist") }),
        rows.length ? pagedBlock(rows, state, [15, 30], (slice) => {
          const table = el("table", { class: "sn-table" });
          table.append(el("thead", {}, el("tr", {}, [t("date"), t("open"), t("high"), t("low"), t("close"), t("volume")].map((label) => el("th", { text: label })))));
          const tbody = el("tbody");
          for (const row of slice) {
            tbody.append(el("tr", {}, [
              el("td", { text: day(row.time) || t("unavailable") }),
              el("td", { text: show(money(row.open, coin.vs)) }),
              el("td", { text: show(money(row.high, coin.vs)) }),
              el("td", { text: show(money(row.low, coin.vs)) }),
              el("td", { text: show(money(row.close, coin.vs)) }),
              el("td", { text: row.volume == null ? t("unavailable") : show(compact(row.volume, coin.vs)) }),
            ]));
          }
          table.append(tbody);
          return el("div", { class: "sn-scroll" }, table);
        }) : emptyBlock(),
        el("p", { class: "sn-note", text: body.volumeNote === "volume-day" ? t("volumeDay") : t("volMissing") }),
        sourceLine(body),
      );
    };
    state.paint();
  } catch {
    panel.replaceChildren(errorBlock(() => history(panel, ctx, coin)));
  }
}

async function treasury(ctx, coin) {
  if (coin.id !== "bitcoin" && coin.id !== "ethereum") return null;
  const box = el("section", { class: "sn-box", "data-sn": "treasury" }, [el("h3", { text: t("treasury") }), skeleton(3)]);
  try {
    const body = await api(`/api/sonar/treasury/${coin.id}${qs({ vs: coin.vs })}`);
    const list = el("ul");
    for (const row of (body.companies || []).slice(0, 8)) {
      list.append(el("li", {}, `${row.name}: ${show(plain(row.holdings, 0))} · ${show(compact(row.valueUsd, coin.vs))}`));
    }
    box.replaceChildren(el("h3", { text: t("treasury") }), el("p", { text: `${t("holdings")} ${show(plain(body.totalHoldings, 0))}` }), list.childNodes.length ? list : emptyBlock(), sourceLine(body));
  } catch {
    box.replaceChildren(el("h3", { text: t("treasury") }), emptyBlock());
  }
  return box;
}

function holding(ctx, coin) {
  const txs = snapshot().txs.filter((row) => row.portfolioId === snapshot().activePortfolio && row.coinId === coin.id);
  const pos = positionOf(txs, coin.price);
  const box = el("section", { class: "sn-box", "data-sn": "position" }, [
    el("h3", { text: t("position") }),
    txs.length ? el("ul", {}, [
      el("li", { text: `${t("qty")} ${show(plain(pos.qty, 6))}` }),
      el("li", { text: `${t("avg")} ${pos.avg == null ? t("unavailable") : show(money(pos.avg, coin.vs))}` }),
      el("li", { text: `${t("value")} ${pos.value == null ? t("unavailable") : show(money(pos.value, coin.vs))}` }),
      el("li", { text: `${t("unrealized")} ${pos.unrealized == null ? t("unavailable") : show(money(pos.unrealized, coin.vs))}` }),
      el("li", { text: `${t("realized")} ${show(money(pos.realized, coin.vs))}` }),
    ]) : el("p", { text: t("noPosition") }),
    el("a", { href: `${ctx.prefix}/sonar/portfolio/`, text: t("addTx") }),
  ]);
  return box;
}

async function star(coin) {
  await update((data) => {
    const list = data.lists.find((item) => item.id === data.activeList) || data.lists[0];
    if (!list) return data;
    list.ids = list.ids.includes(coin.id) ? list.ids.filter((id) => id !== coin.id) : [coin.id, ...list.ids];
    return data;
  });
  const button = document.querySelector(`[data-sn-star="${coin.id}"]`);
  if (button) button.classList.toggle("on", activeList()?.ids.includes(coin.id));
}

async function share(ctx, coin) {
  const url = `${location.origin}${ctx.prefix}/sonar/crypto/${coin.id}`;
  try {
    if (navigator.share) await navigator.share({ title: coin.name, url });
    else await navigator.clipboard.writeText(url);
  } catch {
    try { await navigator.clipboard.writeText(url); } catch { /* el usuario puede copiar la URL */ }
  }
}

function copy(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

async function alertForm(coin) {
  const price = window.prompt(t("target"), coin.price != null ? String(coin.price) : "");
  if (!price) return;
  const value = Number(price);
  if (!Number.isFinite(value)) return;
  await update((data) => {
    data.alerts.push({ id: uid(), coinId: coin.id, op: "above", price: value });
    return data;
  });
}
