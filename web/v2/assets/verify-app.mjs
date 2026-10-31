import { fetchBitcoinQuote, fetchCoinOhlc, fetchDexSnapshot, fetchGlobalMarket, fetchLargeTransfers, fetchPoolCandles, fetchPoolTrades, fetchTopMarkets, fetchTrendingPools, readAddress } from "../verify/net/adapters.mjs";
import { mountLiveChart } from "../verify/net/chart.mjs";
import { COIN_FRAMES, POLL_MS, TIMEFRAMES, stepLabel } from "../verify/net/ohlcv.mjs";
import { LIMITS, buildGraph, chainById, explorerHref, filterTransfers, formatUnits, groupSearch, identify, pager, slicePage, storageKeys, supportedIds, UNSUPPORTED } from "../verify/net/present.mjs";
import { isOfficialAddress, OFFICIAL_ADDRESS } from "../shared/orvupi-contract.js";

const KEYS = storageKeys();
const PROJECT_WALLET = "GKpccLJwKArptzt9j897njXUx9RsV5NKL3Egu7bfMA6Q";
const state = {
  screen: "home",
  timeframe: "30m",
  realCandle: "",
  pools: [],
  poolMeta: null,
  pool: null,
  chartMode: "btc",
  coinId: "bitcoin",
  chartStatus: null,
  quote: null,
  markets: null,
  liveTrades: null,
  dossier: null,
  dex: null,
  pages: {},
  direction: "all",
  usdOn: false,
  query: "",
  nets: new Set(supportedIds()),
  netsOpen: false,
  modal: false,
  modalQuery: "",
  modalIndex: 0,
  dexMode: "screener",
  alertDraft: false,
  labelTab: "labels",
  busy: "",
  trace: null,
  global: null,
  moreOpen: false,
  editingAlert: "",
  editingLabel: "",
};

let chartHandle = null;

function lang() {
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";
}
function t(es, en) {
  return lang() === "en" ? en : es;
}
function h(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children || [])) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}
function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function saveList(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows.slice(0, 40)));
}
function pageOf(id) {
  return state.pages[id] || 1;
}
function setPage(id, page) {
  state.pages[id] = page;
  render();
}
function go(screen) {
  state.screen = screen;
  document.querySelectorAll("details.vf-more").forEach((menu) => { menu.open = false; });
  history.replaceState(null, "", `#${screen}`);
  window.scrollTo(0, 0);
  document.querySelectorAll("[data-vf-view]").forEach((button) => {
    if (button.getAttribute("data-vf-view") === screen) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const jump = document.getElementById("vf-jump");
  if (jump) jump.value = screen;
  render();
}
function stopChart() {
  chartHandle?.stop();
  chartHandle = null;
}
function remember(address, chain) {
  const rows = loadList(KEYS.recent).filter((row) => row.address !== address);
  rows.unshift({ address, chain, at: new Date().toISOString() });
  saveList(KEYS.recent, rows);
}
function fact(id) {
  return state.dossier?.facts?.find((item) => item.id === id) || null;
}
function amount(factRow) {
  if (!factRow || factRow.value == null) return t("sin datos", "no data");
  const shown = formatUnits(factRow.value, factRow.decimals);
  return shown == null ? String(factRow.value) : `${shown}${factRow.symbol ? ` ${factRow.symbol}` : ""}`;
}
function locale() {
  return lang() === "en" ? "en-GB" : "es-ES";
}
function priceText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const digits = Math.abs(number) >= 1000 ? 0 : Math.abs(number) >= 1 ? 2 : 4;
  return `$${number.toLocaleString(locale(), { minimumFractionDigits: digits ? 2 : 0, maximumFractionDigits: digits })}`;
}
function compactUsd(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const abs = Math.abs(number);
  const sign = number < 0 ? "-" : "";
  const unit = abs >= 1e12 ? ["T", 1e12] : abs >= 1e9 ? ["B", 1e9] : abs >= 1e6 ? ["M", 1e6] : abs >= 1e3 ? ["K", 1e3] : ["", 1];
  const digits = unit[1] === 1 ? (abs >= 1 ? 2 : 4) : 2;
  const body = (abs / unit[1]).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${sign}$${body}${unit[0]}`;
}
function changeText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const body = `${number > 0 ? "+" : ""}${number.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return h("span", { class: number < 0 ? "vf-down" : "vf-up" }, body);
}
function clock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const same = date.toDateString() === now.toDateString();
  if (same) return new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date);
  return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
const NETWORK_NAMES = {
  eth: "Ethereum", ethereum: "Ethereum", solana: "Solana", sol: "Solana", base: "Base", bsc: "BNB Chain", bnb: "BNB Chain",
  arbitrum: "Arbitrum", polygon: "Polygon", polygon_pos: "Polygon", optimism: "Optimism", avax: "Avalanche", avalanche: "Avalanche",
  ton: "TON", robinhood: "Robinhood Chain", bitcoin: "Bitcoin", btc: "Bitcoin", tron: "Tron",
};
function networkName(id) {
  const key = String(id || "");
  return NETWORK_NAMES[key] || NETWORK_NAMES[key.toLowerCase()] || key;
}
function networkCell(id) {
  const name = networkName(id);
  return h("span", { class: "vf-netname" }, [h("span", { class: "vf-netdot", "data-net": String(id || ""), "aria-hidden": "true" }, name.slice(0, 1)), name]);
}
function sourceLine(provider, at, tip, stale) {
  if (!provider && !at) return null;
  const line = h("p", { class: "vf-source" });
  const when = at ? clock(at) : "";
  const freshness = stale ? t("actualizado", "updated") : t("en vivo", "live");
  line.append(`${t("Fuente", "Source")}: ${provider || "—"}${when ? ` · ${freshness} · ${when}` : ""}`);
  if (tip) line.append(h("button", { type: "button", class: "vf-info", title: tip, "aria-label": tip }, "ⓘ"));
  return line;
}
function sonarMark() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vf-sonar");
  svg.setAttribute("viewBox", "0 0 80 80");
  svg.setAttribute("aria-hidden", "true");
  const rings = [[40, 46, 8], [40, 46, 16], [40, 46, 24]];
  for (const [cx, cy, r] of rings) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#ff3070");
    circle.setAttribute("stroke-width", "1.5");
    svg.append(circle);
  }
  const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  head.setAttribute("cx", "40");
  head.setAttribute("cy", "46");
  head.setAttribute("r", "7");
  head.setAttribute("fill", "#ff3070");
  svg.append(head);
  for (const [x, y] of [[18, 22], [62, 18], [14, 58], [66, 62]]) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    dot.setAttribute("r", "2.2");
    dot.setAttribute("fill", "#7dcea0");
    svg.append(dot);
  }
  return svg;
}
function skeleton(count = 3) {
  return h("div", { class: "vf-skel", "aria-busy": "true" }, [sonarMark(), ...Array.from({ length: count }, () => h("span"))]);
}
function failed(text, retry) {
  return h("div", { class: "vf-empty" }, [
    sonarMark(),
    h("p", {}, text),
    h("button", { type: "button", onclick: retry }, t("Reintentar", "Retry")),
  ]);
}
function short(value) {
  const text = String(value || "");
  if (text.length < 14) return text || "—";
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}
function addr(value, chain) {
  if (!value) return h("span", {}, t("sin datos", "no data"));
  const wrap = h("span", { class: "vf-addr" });
  wrap.append(short(value));
  wrap.append(h("button", { type: "button", onclick: () => navigator.clipboard?.writeText(value) }, t("copiar", "copy")));
  const href = explorerHref(chain || state.dossier?.chain || "solana", value);
  if (href) wrap.append(h("a", { href, target: "_blank", rel: "noopener noreferrer" }, t("enlace", "link")));
  return wrap;
}
function empty(text) {
  return h("div", { class: "vf-empty" }, [sonarMark(), h("img", { src: "/assets/orvupi/avatar.png", alt: "ORVUPI Sonar" }), h("p", {}, text)]);
}
function pagerBar(id, window) {
  return h("div", { class: "vf-row" }, [
    h("button", { type: "button", onclick: () => setPage(id, window.page - 1), disabled: window.page <= 1 }, "‹"),
    h("span", { class: "vf-pager" }, window.label),
    h("button", { type: "button", onclick: () => setPage(id, window.page + 1), disabled: window.page >= window.pages }, "›"),
  ]);
}
function table(columns, rows, chain) {
  const head = h("tr", {}, columns.map((column) => h("th", { scope: "col" }, column.label)));
  const body = rows.map((row) => h("tr", {}, columns.map((column) => {
    const value = column.cell ? column.cell(row) : row[column.key];
    return h("td", {}, value && value.nodeType ? value : value == null || value === "" ? t("sin datos", "no data") : String(value));
  })));
  const cards = h("div", { class: "vf-cards" }, rows.map((row) => h("article", { class: "vf-card-row" }, columns.map((column) => h("p", {}, [
    h("strong", {}, `${column.label}: `),
    column.card ? column.card(row) : (column.cell ? column.cell(row) : row[column.key] ?? t("sin datos", "no data")),
  ])))));
  const scroller = h("div", { class: "vf-scroll" }, h("table", { class: "vf-table" }, [h("thead", {}, head), h("tbody", {}, body.length ? body : h("tr", {}, h("td", { colspan: String(columns.length) }, t("sin datos", "no data"))))]));
  return h("div", {}, [scroller, cards, chain ? h("p", { class: "vf-meta" }, chain) : null]);
}
function transferColumns() {
  return [
    { label: t("Hora", "Time"), cell: (row) => clock(row.time) || "—" },
    { label: t("De", "From"), cell: (row) => addr(row.from, row.chain) },
    { label: t("A", "To"), cell: (row) => addr(row.to, row.chain) },
    { label: t("Cantidad", "Amount"), cell: (row) => formatUnits(row.value, row.decimals) || "—" },
    { label: "Token", cell: (row) => row.token || "—" },
    { label: "USD", cell: (row) => row.usd == null ? "—" : compactUsd(row.usd) },
  ];
}
function feedRows() {
  if (state.screen === "ficha" && state.dossier?.transfers?.length) return state.dossier.transfers;
  if ((state.screen === "tracer" || state.screen === "visualizer") && state.trace?.transfers?.length) return state.trace.transfers;
  return state.liveTrades?.rows || [];
}
function transferBlock(id) {
  const focus = state.screen === "ficha" ? (state.dossier?.address || "") : state.screen === "tracer" || state.screen === "visualizer" ? (state.trace?.address || "") : (state.liveTrades?.pool || "");
  let rows = filterTransfers(feedRows(), { direction: state.direction, focus, chains: null, minUsd: state.usdOn ? 1 : null, query: state.query });
  const window = slicePage(rows, pageOf(id));
  return h("section", { class: "vf-card" }, [
    h("div", { class: "vf-row" }, [h("h2", {}, "Transfers"), pagerBar(id, window)]),
    h("div", { class: "vf-chips" }, [
      h("button", { type: "button", "aria-pressed": String(state.direction === "all"), onclick: () => { state.direction = "all"; render(); } }, t("Todas", "All")),
      h("button", { type: "button", "aria-pressed": String(state.direction === "in"), onclick: () => { state.direction = "in"; render(); } }, t("Entradas", "In")),
      h("button", { type: "button", "aria-pressed": String(state.direction === "out"), onclick: () => { state.direction = "out"; render(); } }, t("Salidas", "Out")),
      h("button", { type: "button", "aria-pressed": String(state.usdOn), onclick: () => { state.usdOn = !state.usdOn; render(); } }, "USD ≥ 1"),
    ]),
    rows.length ? table(transferColumns(), window.rows, "") : feedRows().length ? h("p", { class: "vf-meta" }, t("Nada coincide con el filtro.", "Nothing matches the filter.")) : (state.liveTrades || state.dossier || state.trace ? failed(t("Las fuentes no respondieron.", "The sources did not respond."), loadLive) : skeleton(4)),
    sourceLine(state.liveTrades?.provider || state.dossier?.provider, state.liveTrades?.fetchedAt || state.dossier?.fetchedAt, state.liveTrades?.scope || "", state.liveTrades?.stale),
  ]);
}
function chartFrames() {
  return state.chartMode === "pool" && state.pool?.address ? TIMEFRAMES : COIN_FRAMES;
}
function chartTitle() {
  if (state.chartMode === "pool" && state.pool?.name) return state.pool.name;
  if (state.chartMode === "coin" && state.coin?.symbol) return state.coin.symbol;
  return "Bitcoin";
}
function chartCard() {
  const frames = chartFrames();
  const card = h("section", { class: "vf-chart-card" });
  card.append(h("div", { class: "vf-row" }, [
    h("h2", {}, chartTitle()),
    h("div", { class: "vf-segments", role: "group" }, frames.map((frame) => {
      const real = state.timeframe === frame.id && state.realCandle && state.realCandle !== frame.label ? state.realCandle : frame.label;
      const tip = state.chartMode === "pool"
        ? t(`Velas de ${frame.label}.`, `${frame.label} candles.`)
        : t(`Velas de ${frame.label}. Si el tamaño real es otro, el botón lo muestra.`, `${frame.label} candles. If the real size differs, the button shows it.`);
      return h("button", {
        type: "button",
        class: "vf-seg",
        title: tip,
        "aria-pressed": String(state.timeframe === frame.id),
        onclick: () => { state.timeframe = frame.id; state.realCandle = ""; render(); },
      }, real);
    })),
  ]));
  if (state.pool?.address) {
    card.append(h("div", { class: "vf-segments vf-mode" }, [
      h("button", { type: "button", "aria-pressed": String(state.chartMode === "pool"), onclick: () => { state.chartMode = "pool"; if (!TIMEFRAMES.some((frame) => frame.id === state.timeframe)) state.timeframe = "5m"; render(); } }, t("Pool", "Pool")),
      h("button", { type: "button", "aria-pressed": String(state.chartMode !== "pool"), onclick: () => { state.chartMode = "btc"; state.timeframe = "30m"; state.realCandle = ""; render(); } }, "Bitcoin"),
    ]));
  }
  card.append(sourceLine(state.chartStatus?.provider, state.chartStatus?.fetchedAt, state.chartStatus?.scope || "", state.chartStatus?.stale));
  card.append(h("div", { id: "vf-chart-host" }));
  return card;
}
function chartKey() {
  const pool = state.chartMode === "pool" ? state.pool?.address || "" : state.coinId || "bitcoin";
  return `${state.chartMode}:${state.timeframe}:${pool}`;
}
function ensureChart() {
  const host = document.getElementById("vf-chart-host");
  if (!host) return;
  const key = chartKey();
  const initial = state.chartStatus?.chartKey === key ? state.chartStatus : null;
  chartHandle = mountLiveChart(host, async () => {
    if (state.chartMode === "pool" && state.pool?.address && TIMEFRAMES.some((frame) => frame.id === state.timeframe)) {
      return fetchPoolCandles(state.pool.network, state.pool.address, state.timeframe);
    }
    const frame = COIN_FRAMES.find((item) => item.id === state.timeframe) || COIN_FRAMES[0];
    const coin = state.chartMode === "coin" ? (state.coinId || "ethereum") : "bitcoin";
    return fetchCoinOhlc(coin, frame.days, frame.id);
  }, {
    emptyText: t("Las velas no llegaron. Se reintenta solo.", "Candles did not arrive. Retrying."),
    initial,
    onStatus: (result) => {
      if (result) result.chartKey = key;
      state.chartStatus = result;
      const real = stepLabel(result?.stepSeconds);
      if (real && real !== state.realCandle) {
        state.realCandle = real;
        const pressed = document.querySelector(".vf-chart-card .vf-seg[aria-pressed='true']");
        if (pressed && pressed.textContent !== real) pressed.textContent = real;
      }
      const line = document.querySelector("#vf-root .vf-chart-card .vf-source");
      const next = sourceLine(result?.provider, result?.fetchedAt, result?.scope || "", result?.stale);
      if (line && next) line.replaceWith(next);
    },
  });
}
function coinCards() {
  const pack = state.markets;
  if (!pack) return skeleton(4);
  if (!pack.ok) return failed(t("El mercado no respondió.", "The market did not respond."), loadLive);
  return h("div", { class: "vf-coins" }, pack.coins.map((coin) => h("button", { type: "button", class: "vf-coin", onclick: () => openCoin(coin) }, [
    h("strong", {}, coin.symbol),
    h("span", {}, priceText(coin.price)),
    changeText(coin.change24),
    h("span", { class: "vf-meta" }, compactUsd(coin.marketCap)),
  ])));
}
function home() {
  return h("div", { class: "vf-grid" }, [
    h("div", { class: "vf-stack" }, [
      chartCard(),
      h("section", { class: "vf-card" }, [
        h("div", { class: "vf-row" }, [h("h2", {}, t("Mercado", "Market"))]),
        coinCards(),
        sourceLine(state.markets?.provider, state.markets?.fetchedAt, state.markets?.scope, state.markets?.stale),
      ]),
    ]),
    h("div", { class: "vf-stack" }, [
      h("section", { class: "vf-card" }, [
        h("h2", {}, t("Pools en tendencia", "Trending pools")),
        poolTable(state.pools),
        sourceLine(state.poolMeta?.provider, state.poolMeta?.fetchedAt, state.poolMeta?.scope, state.poolMeta?.stale),
      ]),
      transferBlock("home"),
    ]),
  ]);
}
function poolTable(pools) {
  if (!pools?.length) return state.poolMeta && !state.poolMeta.ok ? failed(t("Los pools no respondieron.", "Pools did not respond."), loadLive) : skeleton(4);
  return table([
    { label: t("Par", "Pair"), key: "name" },
    { label: t("Red", "Network"), cell: (row) => networkCell(row.network) },
    { label: "USD", cell: (row) => compactUsd(row.reserveUsd) },
    { label: "24h", cell: (row) => compactUsd(row.volumeH24) },
    { label: "", cell: (row) => h("button", { type: "button", onclick: () => openPool(row) }, t("Ficha", "Profile")) },
  ], pools.slice(0, 8), "");
}
function openCoin(coin) {
  state.coin = coin;
  state.coinId = coin.id;
  state.chartMode = coin.id === "bitcoin" ? "btc" : "coin";
  go("token");
}
function openPool(pool) {
  state.pool = pool;
  state.chartMode = "pool";
  state.coin = { symbol: pool.name, name: pool.name, price: null, change24: pool.changeH24, marketCap: pool.reserveUsd, id: pool.address };
  go("token");
}
function tokenView() {
  const coin = state.coin;
  return h("div", { class: "vf-stack" }, [
    h("header", { class: "vf-card vf-token-head" }, [
      h("h2", {}, coin ? `${coin.symbol} ${coin.name || ""}` : t("Token", "Token")),
      coin?.price != null ? h("p", { class: "vf-token-px" }, priceText(coin.price)) : null,
      coin?.change24 != null ? h("p", {}, changeText(coin.change24)) : null,
      coin?.marketCap != null ? h("p", { class: "vf-meta" }, compactUsd(coin.marketCap)) : null,
    ]),
    chartCard(),
  ]);
}
function market() {
  return h("div", {}, [
    h("div", { class: "vf-pills" }, ["resumen", "spot", "futuros", "opciones"].map((id) => h("button", { type: "button", "aria-pressed": String((state.marketTab || "spot") === id), onclick: () => { state.marketTab = id; render(); } }, id))),
    (state.marketTab || "spot") === "spot" || !(state.marketTab) ? h("div", {}, [chartCard(), quoteCard()]) : null,
    state.marketTab === "resumen" ? quoteCard() : null,
    state.marketTab === "futuros" || state.marketTab === "opciones" ? empty(t("No hay una fuente gratuita de futuros u opciones.", "There is no free futures or options source.")) : null,
  ]);
}
function quoteCard() {
  const quote = state.quote;
  if (!quote) return h("section", { class: "vf-card" }, skeleton(3));
  if (!quote.ok) return h("section", { class: "vf-card" }, failed(t("La cotización no respondió.", "The quote did not respond."), loadQuote));
  return h("section", { class: "vf-card" }, [
    h("h2", {}, "Bitcoin"),
    h("p", { class: "vf-token-px" }, priceText(quote.usd)),
    quote.changeH24 != null ? h("p", {}, changeText(quote.changeH24)) : null,
    quote.marketCap != null ? h("p", {}, `${t("Capitalización", "Market cap")} ${compactUsd(quote.marketCap)}`) : null,
    quote.volumeH24 != null ? h("p", {}, `${t("Volumen 24 h", "24h volume")} ${compactUsd(quote.volumeH24)}`) : null,
    sourceLine(quote.provider, quote.fetchedAt, quote.scope, quote.stale),
  ]);
}
function metric(label, value) {
  return h("p", { class: "vf-metric" }, [h("span", {}, label), h("strong", {}, value)]);
}
function panels() {
  const globe = state.global;
  const sample = state.markets?.coins || [];
  const cap = globe?.ok ? globe.marketCap : sample.reduce((sum, coin) => sum + (Number(coin.marketCap) || 0), 0);
  const volume = globe?.ok ? globe.volume : sample.reduce((sum, coin) => sum + (Number(coin.volumeH24) || 0), 0);
  const body = !globe && !sample.length ? skeleton(3) : cap ? h("div", { class: "vf-metrics" }, [
    metric(t("Capitalización", "Market cap"), compactUsd(cap)),
    metric(t("Volumen 24 h", "24h volume"), compactUsd(volume)),
    globe?.btcDominance != null ? metric("BTC", `${Number(globe.btcDominance).toLocaleString(locale(), { maximumFractionDigits: 2 })}%`) : null,
    globe?.change24 != null ? changeText(globe.change24) : null,
  ]) : failed(t("El mercado no respondió.", "The market did not respond."), loadLive);
  const largest = state.dossier?.largest || [];
  return h("div", { class: "vf-two" }, [
    h("section", { class: "vf-card" }, [
      h("h2", {}, t("Mercado global", "Global market")),
      body,
      sourceLine(globe?.provider || state.markets?.provider, globe?.fetchedAt || state.markets?.fetchedAt, globe?.scope || state.markets?.scope, globe?.stale || state.markets?.stale),
      largest.length ? h("ul", {}, largest.slice(0, 5).map((row) => h("li", {}, `${short(row.address)} · ${formatUnits(row.amount, row.decimals) || "—"}`))) : null,
    ]),
    chartCard(),
  ]);
}
function visualizer() {
  const drawn = graphSvg();
  return h("div", { class: "vf-side" }, [
    h("aside", { class: "vf-card" }, [
      h("div", { class: "vf-row" }, [h("h2", {}, t("Vistas", "Views")), h("button", { type: "button", onclick: saveView }, t("+ Nueva", "+ New"))]),
      loadList(KEYS.views).length ? h("ul", {}, loadList(KEYS.views).map((view) => h("li", {}, `${view.title} · ${clock(view.at)}`))) : h("p", { class: "vf-meta" }, t("Puedes guardar esta vista.", "You can save this view.")),
      h("p", { class: "vf-meta" }, `${loadList(KEYS.views).length} · ${t("máximo", "max")} ${LIMITS.maxNodes} ${t("nodos", "nodes")} · ${t("profundidad", "depth")} 1`),
    ]),
    h("section", { class: "vf-card" }, drawn.graph.nodes.length ? drawn.svg : (state.trace ? failed(t("Esa lectura no dejó transferencias.", "That read left no transfers."), () => loadExample("trace")) : skeleton(2))),
    h("section", {}, [chartCard(), transferBlock("viz")]),
  ]);
}
function graphSvg() {
  const rows = feedRows();
  const graph = buildGraph(rows, { seed: state.trace?.address || state.dossier?.address || rows[0]?.to || "", maxNodes: LIMITS.maxNodes, depth: 1 });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 640 360");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "360");
  svg.setAttribute("role", "img");
  graph.nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, graph.nodes.length);
    node.x = 320 + Math.cos(angle) * 120;
    node.y = 180 + Math.sin(angle) * 90;
  });
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("stroke", "#ff3070");
    line.setAttribute("stroke-width", "2");
    svg.append(line);
  }
  for (const node of graph.nodes) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.seed ? 16 : 10);
    circle.setAttribute("fill", node.seed ? "#ff3070" : "#102032");
    svg.append(circle);
  }
  return { graph, svg: bindGraph(svg) };
}
function bindGraph(svg) {
  const wrap = document.createElement("div");
  wrap.className = "vf-graph";
  svg.style.transformOrigin = "center center";
  wrap.append(svg);
  const points = new Map();
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let pinch = null;
  const apply = () => { svg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  wrap.addEventListener("pointerdown", (event) => {
    try { wrap.setPointerCapture(event.pointerId); } catch { /* un gesto sintético puede no tener puntero activo */ }
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size === 2) {
      const [a, b] = [...points.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale };
    }
  });
  wrap.addEventListener("pointermove", (event) => {
    if (!points.has(event.pointerId)) return;
    const prev = points.get(event.pointerId);
    const next = { x: event.clientX, y: event.clientY };
    points.set(event.pointerId, next);
    if (points.size >= 2 && pinch) {
      const [a, b] = [...points.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      scale = Math.min(4, Math.max(0.6, pinch.scale * (dist / pinch.dist)));
    } else if (prev) {
      tx += next.x - prev.x;
      ty += next.y - prev.y;
    }
    apply();
  });
  const end = (event) => { points.delete(event.pointerId); if (points.size < 2) pinch = null; };
  wrap.addEventListener("pointerup", end);
  wrap.addEventListener("pointercancel", end);
  wrap.addEventListener("wheel", (event) => {
    event.preventDefault();
    scale = Math.min(4, Math.max(0.6, scale * (event.deltaY < 0 ? 1.08 : 0.92)));
    apply();
  }, { passive: false });
  wrap.append(h("button", { type: "button", class: "vf-graph-reset", onclick: () => { scale = 1; tx = 0; ty = 0; apply(); } }, "100%"));
  return wrap;
}
function tracer() {
  const drawn = graphSvg();
  return h("div", { class: "vf-two" }, [
    h("aside", { class: "vf-card" }, [
      h("div", { class: "vf-row" }, [h("h2", {}, "Traces"), h("button", { type: "button", onclick: () => investigate(document.getElementById("direccion-token")?.value, document.getElementById("red")?.value || "solana") }, t("+ Nueva", "+ New"))]),
      h("p", { class: "vf-meta" }, state.trace?.address ? short(state.trace.address) : t("Leyendo una dirección pública.", "Reading a public address.")),
      h("p", { class: "vf-meta" }, t(`Gratis. Profundidad ${LIMITS.maxDepth}, máximo ${LIMITS.maxNodes} nodos y ${LIMITS.maxTransactions} transacciones.`, `Free. Depth ${LIMITS.maxDepth}, at most ${LIMITS.maxNodes} nodes and ${LIMITS.maxTransactions} transactions.`)),
    ]),
    h("section", { class: "vf-card" }, [
      h("h2", {}, "Tracer"),
      drawn.graph.nodes.length ? drawn.svg : (state.trace ? failed(t("Esa lectura no dejó transferencias.", "That read left no transfers."), () => loadExample("trace")) : skeleton(2)),
    ]),
  ]);
}
function dex() {
  const rows = state.pools.filter((pool) => !state.query || `${pool.name} ${pool.address}`.toLowerCase().includes(state.query.toLowerCase()));
  const window = slicePage(rows, pageOf("dex"));
  return h("div", {}, [
    h("div", { class: "vf-pills" }, [
      h("button", { type: "button", "aria-pressed": String(state.dexMode === "screener"), onclick: () => { state.dexMode = "screener"; render(); } }, "Screener"),
      h("button", { type: "button", "aria-pressed": String(state.dexMode === "leaderboard"), onclick: () => { state.dexMode = "leaderboard"; render(); } }, "Leaderboard"),
    ]),
    state.dexMode === "leaderboard"
      ? empty(t("No hay una fuente gratuita de P&L realizado.", "There is no free source of realized P&L."))
      : h("section", { class: "vf-card" }, [
        h("div", { class: "vf-row" }, [h("h2", {}, "DEX")]),
        poolTable(window.rows.length ? window.rows : state.pools),
        sourceLine(state.poolMeta?.provider, state.poolMeta?.fetchedAt, state.poolMeta?.scope, state.poolMeta?.stale),
        pagerBar("dex", window),
      ]),
  ]);
}
function rid() {
  return Math.random().toString(36).slice(2, 10);
}
function alerts() {
  const rows = loadList(KEYS.alerts).map((row) => ({ ...row, id: row.id || rid() }));
  const editing = rows.find((row) => row.id === state.editingAlert);
  return h("div", { class: "vf-side" }, [
    h("aside", { class: "vf-card" }, [
      h("h2", {}, t("Alertas", "Alerts")),
      h("p", {}, `${rows.length} / 10`),
      h("p", { class: "vf-meta" }, t("Se quedan en este navegador. No hay envío.", "They stay in this browser. Nothing is sent.")),
    ]),
    h("section", { class: "vf-card" }, [
      rows.length ? h("ul", { class: "vf-local" }, rows.map((row) => h("li", {}, [
        h("span", {}, `${row.token} · ${networkName(row.chain)} · ${clock(row.at)}`),
        h("button", { type: "button", onclick: () => { state.editingAlert = row.id; render(); } }, t("Editar", "Edit")),
        h("button", { type: "button", onclick: () => { saveList(KEYS.alerts, rows.filter((item) => item.id !== row.id)); state.editingAlert = ""; render(); } }, t("Borrar", "Delete")),
      ]))) : h("p", { class: "vf-meta" }, t("Todavía no hay reglas guardadas.", "No rules saved yet.")),
      h("form", { onsubmit: (event) => {
        event.preventDefault();
        const data = new FormData(event.target);
        const next = { id: editing?.id || rid(), chain: data.get("chain"), token: String(data.get("token") || "").slice(0, 80), at: new Date().toISOString() };
        const list = editing ? rows.map((row) => row.id === editing.id ? next : row) : [next, ...rows];
        saveList(KEYS.alerts, list.slice(0, 10));
        state.editingAlert = "";
        render();
      } }, [
        h("label", {}, ["Token", h("input", { name: "token", required: true, value: editing?.token || "" })]),
        h("label", {}, [t("Red", "Network"), h("select", { name: "chain" }, supportedIds().map((id) => h("option", { value: id, selected: (editing?.chain || "solana") === id }, networkName(id))))]),
        h("button", { type: "submit" }, editing ? t("Guardar cambios", "Save changes") : t("Crear", "Create")),
      ]),
    ]),
  ]);
}
function labels() {
  const local = loadList(KEYS.labels).map((row) => ({ ...row, id: row.id || rid() }));
  const editing = local.find((row) => row.id === state.editingLabel);
  return h("section", { class: "vf-card" }, [
    h("div", { class: "vf-pills" }, [
      h("button", { type: "button", "aria-pressed": String(state.labelTab === "labels"), onclick: () => { state.labelTab = "labels"; render(); } }, t("Etiquetas", "Labels")),
      h("button", { type: "button", "aria-pressed": String(state.labelTab === "entities"), onclick: () => { state.labelTab = "entities"; render(); } }, t("Entidades", "Entities")),
    ]),
    state.labelTab === "entities" ? h("p", { class: "vf-meta" }, t("No hay un directorio público de entidades que se pueda reutilizar.", "There is no public entity directory that can be reused.")) : null,
    h("article", {}, [
      h("h2", {}, "ORVUPI"),
      h("p", { class: "vf-addr" }, OFFICIAL_ADDRESS),
      h("p", { class: "vf-meta" }, t("Contrato publicado en Solana. No nombra a una persona.", "Published Solana contract. It does not name a person.")),
    ]),
    local.length ? h("ul", { class: "vf-local" }, local.map((row) => h("li", {}, [
      h("span", {}, `${row.name} · ${clock(row.at)}`),
      h("button", { type: "button", onclick: () => { state.editingLabel = row.id; render(); } }, t("Editar", "Edit")),
      h("button", { type: "button", onclick: () => { saveList(KEYS.labels, local.filter((item) => item.id !== row.id)); state.editingLabel = ""; render(); } }, t("Borrar", "Delete")),
    ]))) : h("p", { class: "vf-meta" }, t("Las notas propias aparecen aquí.", "Your own notes show up here.")),
    h("form", { onsubmit: (event) => {
      event.preventDefault();
      const data = new FormData(event.target);
      const next = { id: editing?.id || rid(), name: String(data.get("name") || "").slice(0, 80), at: new Date().toISOString() };
      saveList(KEYS.labels, editing ? local.map((row) => row.id === editing.id ? next : row) : [next, ...local]);
      state.editingLabel = "";
      render();
    } }, [
      h("input", { name: "name", required: true, maxlength: "80", value: editing?.name || "" }),
      h("button", { type: "submit" }, editing ? t("Guardar cambios", "Save changes") : t("Crear", "Create")),
    ]),
  ]);
}
function transfersPage() {
  return h("section", {}, [h("h2", {}, "Transfers"), transferBlock("all")]);
}
function ficha() {
  const card = state.dossier;
  if (!card) return skeleton(4);
  if (card.ok === false) return failed(card.message || t("Esa lectura no salió.", "That read did not complete."), () => investigate(card.address || document.getElementById("direccion-token")?.value, card.chain || document.getElementById("red")?.value));
  const symbol = fact("symbol")?.value || fact("standard")?.value || card.kind;
  return h("div", {}, [
    h("header", { class: "vf-card", "data-address": card.address || "" }, [
      h("h2", {}, `${symbol || t("Dirección", "Address")} · ${networkName(card.chain)}`),
      addr(card.address, card.chain),
      isOfficialAddress(card.address) ? h("p", {}, t("Contrato ORVUPI publicado.", "Published ORVUPI contract.")) : null,
      sourceLine(card.provider, card.fetchedAt, card.message || "", card.stale),
      networkPicker(),
    ]),
    h("div", { class: "vf-two" }, [
      h("section", { class: "vf-card" }, [
        h("h2", {}, t("Lectura", "Reading")),
        h("ul", {}, (card.facts || []).map((item) => h("li", {}, `${item.id}: ${amount(item)} · ${item.state}`))),
        card.transferNote ? h("p", {}, card.transferNote) : null,
      ]),
      chartCard(),
    ]),
    h("div", { class: "vf-two" }, [
      h("section", { class: "vf-card" }, [
        h("h2", {}, t("Muestra de cuentas", "Account sample")),
        (card.largest || []).length ? h("ul", {}, card.largest.map((row) => h("li", {}, `${short(row.address)} · ${formatUnits(row.amount, row.decimals) || "—"}`))) : h("p", { class: "vf-meta" }, t("Esta lectura no trajo una muestra de cuentas.", "This read did not include an account sample.")),
      ]),
      transferBlock("ficha"),
    ]),
    h("p", { class: "vf-meta" }, t("El resultado clásico de SPL, Token-2022 y la curva sigue en la lectura de abajo.", "The classic SPL, Token-2022 and curve reading stays in the result below.")),
  ]);
}
function networkPicker() {
  const panel = state.netsOpen ? h("div", { class: "vf-net-panel" }, [
    ...supportedIds().map((id) => h("label", {}, [h("input", { type: "checkbox", checked: state.nets.has(id), onchange: () => { if (state.nets.has(id)) state.nets.delete(id); else state.nets.add(id); render(); } }), chainById(id)?.label?.[lang()] || id])),
    ...UNSUPPORTED.map((item) => h("p", {}, `${item.label}: ${t("no soportado", "not supported")}`)),
    h("button", { type: "button", onclick: () => { state.netsOpen = false; render(); } }, "Done"),
  ]) : null;
  return h("div", { class: "vf-net" }, [
    h("button", { type: "button", onclick: () => { state.netsOpen = !state.netsOpen; render(); } }, state.nets.size === supportedIds().length ? t("Todas las redes", "All networks") : `${state.nets.size}`),
    panel,
  ]);
}
function searchDialog() {
  if (!state.modal) return null;
  const groups = groupSearch(state.modalQuery, { recent: loadList(KEYS.recent), pools: state.pools, official: { address: OFFICIAL_ADDRESS, name: "ORVUPI" } });
  const flat = groups.groups.flatMap((group) => group.items.map((item) => ({ group: group.id, item, status: group.status })));
  return h("div", { class: "vf-modal", onclick: (event) => { if (event.target === event.currentTarget) { state.modal = false; render(); } } }, h("div", { class: "vf-dialog", role: "dialog", "aria-modal": "true" }, [
    h("input", { id: "vf-modal-q", value: state.modalQuery, oninput: (event) => { state.modalQuery = event.target.value; state.modalIndex = 0; render(); } }),
    ...groups.groups.map((group) => h("section", {}, [
      h("h3", {}, `${group.id} · ${group.status}`),
      group.items.length ? h("ul", {}, group.items.map((item) => h("li", {}, h("button", { type: "button", onclick: () => openHit(item) }, item.name || item.address || item.label || t("sin datos", "no data"))))) : h("p", {}, group.status === "no-soportado" ? t("no soportado", "not supported") : t("sin datos", "no data")),
    ])),
    h("p", { class: "vf-meta" }, t("Flechas seleccionan. Ctrl L copia. Ctrl Enter abre en otra pestaña. Enter abre.", "Arrows select. Ctrl L copies. Ctrl Enter opens a new tab. Enter opens.")),
    h("span", { id: "vf-flat", hidden: true }, String(flat.length)),
  ]));
}
function openHit(item) {
  state.modal = false;
  if (item.address && item.network && item.name) {
    state.pool = item;
    state.chartMode = "pool";
    go("mercado");
    return;
  }
  if (item.address) investigate(item.address, item.chainId || item.chain || document.getElementById("red")?.value || "solana");
}
async function loadPools() {
  state.busy = "pools";
  render();
  state.poolMeta = await fetchTrendingPools();
  state.pools = state.poolMeta.pools || [];
  state.busy = "";
  render();
}
async function loadQuote() {
  state.quote = await fetchBitcoinQuote();
  state.chartMode = "btc";
  render();
}
function ensureNetworks() {
  const select = document.getElementById("red");
  if (!select) return;
  for (const id of supportedIds()) {
    if ([...select.options].some((option) => option.value === id)) continue;
    const option = document.createElement("option");
    option.value = id;
    option.textContent = chainById(id)?.label?.[lang()] || networkName(id);
    select.append(option);
  }
}
async function loadExample(kind) {
  if (kind === "trace") state.trace = await readAddress("solana", PROJECT_WALLET);
  else state.dossier = await readAddress("solana", OFFICIAL_ADDRESS);
  render();
}
let readTicket = 0;
async function investigate(raw, chainId) {
  const text = String(raw || "").trim();
  if (!text) return;
  const ticket = ++readTicket;
  const found = identify(text);
  const chain = found.chainId || chainId || "solana";
  if (found.kind === "unknown" || found.kind === "empty") {
    state.dossier = {
      ok: false,
      state: "no-soportado",
      address: text,
      chain,
      facts: [],
      transfers: [],
      largest: [],
      message: t("Eso no es una dirección de las redes que leemos.", "That is not an address on the networks we read."),
    };
    go("ficha");
    return;
  }
  state.busy = "read";
  state.dossier = null;
  state.screen = "ficha";
  render();
  try {
    const card = await readAddress(chain, text);
    if (ticket !== readTicket) return;
    state.dossier = card;
    if (!state.dossier?.ok && state.dossier?.state !== "comprobado" && state.dossier?.state !== "sin-datos") {
      state.dossier = { ...state.dossier, ok: false, message: t("Esa lectura no salió. Puedes reintentar.", "That read did not complete. You can retry."), address: found.address || text, chain };
    }
  } catch {
    if (ticket !== readTicket) return;
    state.dossier = { ok: false, address: found.address || text, chain, facts: [], transfers: [], largest: [], message: t("Esa lectura no salió. Puedes reintentar.", "That read did not complete. You can retry.") };
  }
  if (ticket !== readTicket) return;
  remember(found.address || text, state.dossier.chain || chain);
  const input = document.getElementById("direccion-token");
  if (input && input.value !== text) input.value = text;
  const select = document.getElementById("red");
  if (select && [...select.options].some((option) => option.value === chain)) select.value = chain;
  if (found.kind === "solana" || chain === "solana" || found.kind === "evm") {
    try {
      state.dex = await fetchDexSnapshot(state.dossier.chain || chain, found.address || text);
    } catch {
      state.dex = null;
    }
  }
  if (ticket !== readTicket) return;
  state.busy = "";
  go("ficha");
}
function saveView() {
  const rows = loadList(KEYS.views);
  rows.unshift({ title: state.dossier?.address || t("Vacía", "Empty"), at: new Date().toISOString() });
  saveList(KEYS.views, rows);
  render();
}
function render() {
  const root = document.getElementById("vf-root");
  if (!root) return;
  stopChart();
  const screens = { home, dex, tracer, visualizer, alertas: alerts, etiquetas: labels, paneles: panels, transfers: transfersPage, mercado: market, ficha, token: tokenView };
  const view = screens[state.screen] || home;
  const dialog = searchDialog();
  root.replaceChildren(view());
  if (dialog) root.append(dialog);
  ensureChart();
}
function openSearch() {
  state.modal = true;
  state.modalQuery = "";
  render();
  document.getElementById("vf-modal-q")?.focus();
}
function boot() {
  const dock = document.createElement("nav");
  dock.className = "vf-dock";
  dock.setAttribute("aria-label", lang() === "en" ? "Sections" : "Secciones");
  for (const [id, es, en] of [["home", "Explorar", "Explore"], ["dex", "DEX", "DEX"], ["tracer", "Tracer", "Tracer"], ["visualizer", "Mapa", "Map"], ["mercado", "Mercado", "Market"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-vf-view", id);
    const label = document.createElement("span");
    label.textContent = lang() === "en" ? en : es;
    button.append(label);
    dock.append(button);
  }
  const more = document.createElement("button");
  more.type = "button";
  more.id = "vf-more-open";
  more.textContent = lang() === "en" ? "More" : "Más";
  more.addEventListener("click", () => { state.moreOpen = !state.moreOpen; paintSheet(); });
  dock.append(more);
  document.body.append(dock);
  paintSheet();
  document.querySelectorAll("[data-vf-view]").forEach((button) => button.addEventListener("click", () => go(button.getAttribute("data-vf-view"))));
  document.getElementById("vf-jump")?.addEventListener("change", (event) => go(event.target.value));
  document.getElementById("vf-open-search")?.addEventListener("click", openSearch);
  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      openSearch();
    }
    if (!state.modal) return;
    if (event.key === "Escape") { state.modal = false; render(); }
    if (event.key === "Enter") {
      const groups = groupSearch(state.modalQuery, { recent: loadList(KEYS.recent), pools: state.pools, official: { address: OFFICIAL_ADDRESS, name: "ORVUPI" } });
      const hit = groups.groups.flatMap((group) => group.items)[state.modalIndex];
      if (hit) openHit(hit);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      const url = new URL(location.href);
      url.hash = state.modalQuery ? `q=${encodeURIComponent(state.modalQuery)}` : state.screen;
      navigator.clipboard?.writeText(url.toString());
    }
  });
  const hash = location.hash.replace("#", "");
  if (hash && ["home", "dex", "tracer", "visualizer", "alertas", "etiquetas", "paneles", "transfers", "mercado", "ficha", "token"].includes(hash)) state.screen = hash;
  const read = h("button", { type: "button", id: "vf-leer", onclick: () => investigate(document.getElementById("direccion-token")?.value, document.getElementById("red")?.value || "solana") }, t("Ficha", "Profile"));
  document.querySelector(".consulta-barra")?.append(read);
  const slot = document.createElement("div");
  slot.id = "vf-search-slot";
  slot.className = "vf-search-slot";
  document.querySelector(".vf-nav")?.after(slot);
  const form = document.getElementById("consulta");
  if (form && slot) slot.append(form);
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || form.id !== "consulta") return;
    event.preventDefault();
    event.stopPropagation();
    investigate(document.getElementById("direccion-token")?.value, document.getElementById("red")?.value || "solana");
  }, true);
  const field = document.getElementById("direccion-token");
  if (field) field.setAttribute("placeholder", t("Busca tokens, direcciones o pools", "Search tokens, addresses or pools"));
  document.querySelector(".langsuggest")?.remove();
  const heading = document.querySelector("main h1");
  if (heading && !document.querySelector(".vf-tagline")) {
    const tag = document.createElement("p");
    tag.className = "vf-tagline";
    tag.textContent = "Sonar · verify on-chain";
    heading.after(tag);
  }
  document.title = "ORVUPI Sonar";
  ensureNetworks();
  render();
  loadLive();
}
function paintSheet() {
  let sheet = document.getElementById("vf-sheet");
  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "vf-sheet";
    sheet.className = "vf-sheet";
    document.body.append(sheet);
  }
  sheet.hidden = !state.moreOpen;
  sheet.replaceChildren();
  for (const [id, es, en] of [["alertas", "Alertas", "Alerts"], ["etiquetas", "Etiquetas", "Labels"], ["paneles", "Paneles", "Panels"], ["transfers", "Transfers", "Transfers"], ["ficha", "Ficha", "Profile"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = lang() === "en" ? en : es;
    button.addEventListener("click", () => { state.moreOpen = false; paintSheet(); go(id); });
    sheet.append(button);
  }
}
async function loadLive() {
  try {
    state.markets = await fetchTopMarkets();
    const btc = state.markets?.coins?.find((coin) => coin.id === "bitcoin");
    if (btc) {
      state.quote = { ok: true, state: "comprobado", provider: state.markets.provider, fetchedAt: state.markets.fetchedAt, usd: btc.price, marketCap: btc.marketCap, volumeH24: btc.volumeH24, changeH24: btc.change24, scope: "Bitcoin", stale: state.markets.stale, network: "bitcoin" };
    }
  } catch {
    state.markets = { ok: false, coins: [], provider: "CoinGecko", fetchedAt: new Date().toISOString() };
  }
  render();
  try {
    state.poolMeta = await fetchTrendingPools();
    state.pools = state.poolMeta.pools || [];
    if (!state.pool && state.pools[0]) state.pool = state.pools[0];
  } catch {
    state.poolMeta = { ok: false, pools: [], provider: "GeckoTerminal", fetchedAt: new Date().toISOString() };
    state.pools = [];
  }
  render();
  try {
    if (state.pool?.address) state.liveTrades = await fetchPoolTrades(state.pool.network, state.pool.address);
    if (!state.liveTrades?.rows?.length) state.liveTrades = await fetchLargeTransfers();
    else if (state.liveTrades.rows.length < 9) {
      const extra = await fetchLargeTransfers();
      if (extra?.rows?.length) state.liveTrades = { ...state.liveTrades, rows: [...state.liveTrades.rows, ...extra.rows].slice(0, 16) };
    }
  } catch {
    state.liveTrades = state.liveTrades || { ok: false, rows: [], provider: "", fetchedAt: new Date().toISOString() };
  }
  render();
  try {
    state.global = await fetchGlobalMarket();
    if (!state.quote?.ok) state.quote = await fetchBitcoinQuote();
  } catch {
    state.global = state.global || { ok: false };
  }
  render();
  try {
    state.dossier = await readAddress("solana", OFFICIAL_ADDRESS);
  } catch {
    state.dossier = { ok: false, address: OFFICIAL_ADDRESS, chain: "solana", facts: [], transfers: [], largest: [], message: t("La lectura no salió.", "The read did not complete.") };
  }
  render();
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));
    state.trace = await readAddress("solana", PROJECT_WALLET);
  } catch {
    state.trace = { ok: false, address: PROJECT_WALLET, chain: "solana", transfers: [], facts: [], largest: [] };
  }
  render();
}

if (document.body.classList.contains("verify-app")) boot();
