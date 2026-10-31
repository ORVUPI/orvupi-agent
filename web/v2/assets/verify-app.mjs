import { defillamaBlocked, fetchBitcoinOhlc, fetchBitcoinQuote, fetchCoinOhlc, fetchDexSnapshot, fetchPoolCandles, fetchPoolTrades, fetchTopMarkets, fetchTrendingPools, readAddress } from "../verify/net/adapters.mjs";
import { mountLiveChart } from "../verify/net/chart.mjs";
import { POLL_MS, TIMEFRAMES, observedStep } from "../verify/net/ohlcv.mjs";
import { LIMITS, buildGraph, chainById, explorerHref, filterTransfers, formatUnits, groupSearch, identify, pager, slicePage, storageKeys, supportedIds, UNSUPPORTED } from "../verify/net/present.mjs";
import { isOfficialAddress, OFFICIAL_ADDRESS } from "../shared/orvupi-contract.js";

const KEYS = storageKeys();
const state = {
  screen: "home",
  timeframe: "5m",
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
function usd(value) {
  if (value == null || Number.isNaN(Number(value))) return t("sin datos", "no data");
  return new Intl.NumberFormat(lang() === "en" ? "en-US" : "es-ES", { maximumFractionDigits: 2 }).format(Number(value));
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
  return h("div", { class: "vf-empty" }, [h("img", { src: "/assets/orvupi/avatar.png", alt: "" }), h("p", {}, text)]);
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
    { label: t("Hora", "Time"), cell: (row) => row.time || t("sin datos", "no data") },
    { label: t("De", "From"), cell: (row) => addr(row.from, row.chain) },
    { label: t("A", "To"), cell: (row) => addr(row.to, row.chain) },
    { label: t("Cantidad", "Amount"), cell: (row) => formatUnits(row.value, row.decimals) || t("sin datos", "no data") },
    { label: "Token", cell: (row) => row.token || t("sin datos", "no data") },
    { label: "USD", cell: (row) => row.usd == null ? t("sin datos", "no data") : usd(row.usd) },
  ];
}
function feedRows() {
  if (state.screen === "ficha" && state.dossier?.transfers?.length) return state.dossier.transfers;
  return state.liveTrades?.rows || [];
}
function transferBlock(id) {
  const focus = state.dossier?.address || "";
  let rows = filterTransfers(feedRows(), { direction: state.direction, focus: state.screen === "ficha" ? focus : "", chains: null, minUsd: state.usdOn ? 1 : null, query: state.query });
  const window = slicePage(rows, pageOf(id));
  return h("section", { class: "vf-card" }, [
    h("div", { class: "vf-row" }, [h("h2", {}, "Transfers"), pagerBar(id, window)]),
    h("div", { class: "vf-chips" }, [
      h("button", { type: "button", "aria-pressed": String(!state.usdOn) }, "ALL"),
      h("button", { type: "button", "aria-pressed": String(state.usdOn), onclick: () => { state.usdOn = !state.usdOn; render(); } }, "USD ≥ 1"),
    ]),
    rows.length ? table(transferColumns(), window.rows, state.dossier?.provider || "") : empty(t("Sin movimientos en la muestra descargada.", "No movements in the downloaded sample.")),
    h("p", { class: "vf-meta" }, window.total ? t(`Muestra ${window.showing} de ${window.total}. No es el historial completo.`, `Sample ${window.showing} of ${window.total}. Not the full history.`) : t("sin datos", "no data")),
  ]);
}
function statusLine() {
  const status = state.chartStatus;
  const node = h("p", { class: "vf-live", "data-state": status?.state || "sin-datos" });
  node.append(h("span", { class: "vf-dot", "aria-hidden": "true" }));
  if (!status) node.append(t("sin datos", "no data"));
  else if (status.state === "comprobado") node.append(t(`en vivo · cada ${POLL_MS / 1000} s`, `live · every ${POLL_MS / 1000} s`));
  else node.append(status.state.replaceAll("-", " "));
  if (status?.fetchedAt) node.append(h("time", { datetime: status.fetchedAt }, status.fetchedAt));
  if (status) node.append(h("span", {}, [status.network, status.provider, status.timeframe, status.scope].filter(Boolean).join(" · ")));
  return node;
}
function chartCard() {
  const card = h("section", { class: "vf-chart-card" });
  card.append(h("div", { class: "vf-row" }, [
    h("h2", {}, state.chartMode === "btc" ? "Bitcoin · CoinGecko" : t("Velas del pool", "Pool candles")),
    h("div", { class: "vf-pills" }, TIMEFRAMES.map((frame) => h("button", {
      type: "button",
      "aria-pressed": String(state.timeframe === frame.id && state.chartMode === "pool"),
      onclick: () => { state.chartMode = "pool"; state.timeframe = frame.id; render(); },
    }, frame.label))),
  ]));
  card.append(h("div", { class: "vf-chips" }, [
    h("button", { type: "button", "aria-pressed": String(state.chartMode === "pool"), onclick: () => { state.chartMode = "pool"; render(); } }, t("Pool", "Pool")),
    h("button", { type: "button", "aria-pressed": String(state.chartMode === "btc"), onclick: () => { state.chartMode = "btc"; render(); } }, "Bitcoin"),
  ]));
  card.append(statusLine());
  card.append(h("div", { id: "vf-chart-host" }));
  card.append(h("p", { class: "vf-meta" }, t(
    "DeFiLlama: requiere permiso. No se consulta. DEX Screener no documenta velas; su liquidez va en la tabla de pares, no dentro de la serie.",
    "DeFiLlama: permission required. It is not queried. DEX Screener does not document candles; its liquidity stays in the pair table, not inside the series.",
  )));
  const tip = h("p", { id: "vf-tip", class: "vf-meta" }, "");
  card.append(tip);
  return card;
}
function ensureChart() {
  const host = document.getElementById("vf-chart-host");
  if (!host) return;
  chartHandle = mountLiveChart(host, async () => {
    if (state.chartMode === "coin") return fetchCoinOhlc(state.coinId || "ethereum", "1");
    if (state.chartMode === "btc" || !state.pool?.address) return fetchBitcoinOhlc("1");
    return fetchPoolCandles(state.pool.network, state.pool.address, state.timeframe);
  }, {
    emptyText: t("sin datos", "no data"),
    onStatus: (result) => {
      state.chartStatus = result;
      const line = document.querySelector("#vf-root .vf-live");
      if (line) line.replaceWith(statusLine());
      const tip = document.getElementById("vf-tip");
      if (tip && result?.stepSeconds) tip.textContent = t(`Paso observado: ${result.stepSeconds} s. No se renombra a 1m.`, `Observed step: ${result.stepSeconds} s. It is not renamed to 1m.`);
    },
    onCrosshair: (point) => {
      const tip = document.getElementById("vf-tip");
      if (!tip) return;
      tip.textContent = point ? `O ${point.open}  H ${point.high}  L ${point.low}  C ${point.close}` : "";
    },
  });
}
function coinCards() {
  const pack = state.markets;
  if (!pack) return h("p", { class: "vf-meta" }, t("Leyendo CoinGecko…", "Reading CoinGecko…"));
  if (!pack.ok) return empty(`${pack.state || "sin datos"} · CoinGecko`);
  return h("div", { class: "vf-coins" }, pack.coins.map((coin) => h("button", { type: "button", class: "vf-coin", onclick: () => openCoin(coin) }, [
    h("strong", {}, coin.symbol),
    h("span", {}, usd(coin.price)),
    h("span", { class: coin.change24 != null && coin.change24 < 0 ? "vf-down" : "vf-up" }, coin.change24 == null ? "—" : `${coin.change24 > 0 ? "+" : ""}${coin.change24.toFixed(2)}% 24h`),
    h("span", { class: "vf-meta" }, `MC ${usd(coin.marketCap)}`),
  ])));
}
function home() {
  const tradeNote = state.liveTrades?.ok
    ? `${state.liveTrades.provider} · ${state.liveTrades.network} · ${state.liveTrades.fetchedAt} · ${state.liveTrades.scope}`
    : state.liveTrades ? `${state.liveTrades.state} · ${state.liveTrades.provider}` : t("Leyendo operaciones…", "Reading trades…");
  return h("div", { class: "vf-grid" }, [
    h("div", { class: "vf-stack" }, [
      chartCard(),
      h("section", { class: "vf-card" }, [
        h("div", { class: "vf-row" }, [h("h2", {}, t("Mercado", "Market")), h("span", { class: "vf-meta" }, state.markets?.fetchedAt || "")]),
        coinCards(),
        state.markets?.ok ? h("p", { class: "vf-meta" }, `${state.markets.provider} · ${state.markets.scope}`) : null,
      ]),
    ]),
    h("div", { class: "vf-stack" }, [
      h("section", { class: "vf-card" }, [
        h("h2", {}, t("Pools en tendencia", "Trending pools")),
        poolTable(state.pools),
        state.poolMeta ? h("p", { class: "vf-meta" }, `${state.poolMeta.provider || "GeckoTerminal"} · ${state.poolMeta.fetchedAt || ""} · ${state.poolMeta.scope || state.poolMeta.state || ""}`) : h("p", { class: "vf-meta" }, t("Leyendo GeckoTerminal…", "Reading GeckoTerminal…")),
      ]),
      h("div", {}, [transferBlock("home"), h("p", { class: "vf-meta" }, tradeNote)]),
    ]),
  ]);
}
function poolTable(pools) {
  if (!pools?.length) return state.poolMeta && !state.poolMeta.ok ? empty(`${state.poolMeta.state} · GeckoTerminal`) : h("p", { class: "vf-meta" }, t("Leyendo GeckoTerminal…", "Reading GeckoTerminal…"));
  return table([
    { label: t("Par", "Pair"), key: "name" },
    { label: t("Red", "Network"), key: "network" },
    { label: "USD", cell: (row) => usd(row.reserveUsd) },
    { label: "24h", cell: (row) => usd(row.volumeH24) },
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
      coin?.price != null ? h("p", { class: "vf-token-px" }, usd(coin.price)) : null,
      coin?.change24 != null ? h("p", {}, `${coin.change24 > 0 ? "+" : ""}${Number(coin.change24).toFixed(2)}% 24h`) : null,
      coin?.marketCap != null ? h("p", { class: "vf-meta" }, `MC ${usd(coin.marketCap)}`) : null,
      h("p", { class: "vf-meta" }, "CoinGecko / GeckoTerminal"),
    ]),
    chartCard(),
  ]);
}
function market() {
  return h("div", {}, [
    h("div", { class: "vf-pills" }, ["resumen", "spot", "futuros", "opciones"].map((id) => h("button", { type: "button", "aria-pressed": String((state.marketTab || "spot") === id), onclick: () => { state.marketTab = id; render(); } }, id))),
    (state.marketTab || "spot") === "spot" || !(state.marketTab) ? h("div", {}, [chartCard(), h("button", { type: "button", onclick: loadQuote }, t("Leer Bitcoin en CoinGecko", "Read Bitcoin on CoinGecko")), quoteCard()]) : null,
    state.marketTab === "resumen" ? quoteCard() : null,
    state.marketTab === "futuros" || state.marketTab === "opciones" ? empty(t("no soportado. No hay una fuente gratuita de futuros u opciones enlazada.", "not supported. No free futures or options source is connected.")) : null,
    h("p", { class: "vf-meta" }, defillamaBlocked().scope),
  ]);
}
function quoteCard() {
  const quote = state.quote;
  if (!quote?.ok) return h("section", { class: "vf-card" }, empty(t("sin datos de la cotización de Bitcoin.", "no Bitcoin quote data.")));
  return h("section", { class: "vf-card" }, [
    h("h2", {}, "Bitcoin"),
    h("p", {}, `USD ${usd(quote.usd)}`),
    h("p", {}, `${t("capitalización", "market cap")} ${usd(quote.marketCap)}`),
    h("p", {}, `${t("volumen 24 h", "24h volume")} ${usd(quote.volumeH24)}`),
    h("p", { class: "vf-meta" }, `${quote.provider} · ${quote.network} · ${quote.fetchedAt} · ${quote.scope}`),
  ]);
}
function panels() {
  const largest = state.dossier?.largest || [];
  const supply = fact("supply");
  const bars = largest.length ? h("ul", {}, largest.map((row) => {
    const pct = supply?.value ? Number((BigInt(row.amount) * 10000n) / BigInt(supply.value)) / 100 : null;
    return h("li", {}, `${short(row.address)} · ${formatUnits(row.amount, row.decimals) || t("sin datos", "no data")}${pct == null ? "" : ` · ${pct}%`}`);
  })) : empty(t("sin datos. La muestra de cuentas solo existe tras leer un mint de Solana.", "no data. The account sample exists only after reading a Solana mint."));
  return h("div", { class: "vf-two" }, [
    h("section", { class: "vf-card" }, [
      h("h2", {}, t("Panel: muestra de cuentas", "Panel: account sample")),
      h("p", { class: "vf-meta" }, t("Definición: getTokenLargestAccounts, como máximo 20. El porcentaje usa el suministro leído del mint. No es un censo.", "Definition: getTokenLargestAccounts, at most 20. The percentage uses the mint supply that was read. It is not a census.")),
      bars,
    ]),
    chartCard(),
  ]);
}
function visualizer() {
  const drawn = graphSvg();
  return h("div", { class: "vf-side" }, [
    h("aside", { class: "vf-card" }, [
      h("div", { class: "vf-row" }, [h("h2", {}, t("Vistas", "Views")), h("button", { type: "button", onclick: saveView }, t("+ Nueva", "+ New"))]),
      loadList(KEYS.views).length ? h("ul", {}, loadList(KEYS.views).map((view) => h("li", {}, view.title))) : empty(t("Nada aquí todavía.", "Nothing here yet.")),
      h("p", { class: "vf-meta" }, `${loadList(KEYS.views).length} · ${t("máximo", "max")} ${LIMITS.maxNodes} ${t("nodos", "nodes")} · ${t("profundidad", "depth")} 1`),
    ]),
    h("section", { class: "vf-card" }, drawn.graph.nodes.length ? drawn.svg : empty(t("sin datos. Lee una dirección con transferencias parseadas.", "no data. Read an address with parsed transfers."))),
    h("section", {}, [chartCard(), transferBlock("viz")]),
  ]);
}
function graphSvg() {
  const rows = feedRows();
  const graph = buildGraph(rows, { seed: rows[0]?.to || state.dossier?.address || "", maxNodes: LIMITS.maxNodes, depth: 1 });
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
    wrap.setPointerCapture(event.pointerId);
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
      empty(t("Los seguimientos se quedan en este navegador. La entrega continua es próximamente.", "Traces stay in this browser. Continuous delivery is coming later.")),
      h("p", { class: "vf-meta" }, t(`Gratis. Profundidad ${LIMITS.maxDepth}, máximo ${LIMITS.maxNodes} nodos y ${LIMITS.maxTransactions} transacciones.`, `Free. Depth ${LIMITS.maxDepth}, at most ${LIMITS.maxNodes} nodes and ${LIMITS.maxTransactions} transactions.`)),
    ]),
    h("section", { class: "vf-card" }, [
      h("h2", {}, "Tracer"),
      drawn.graph.nodes.length ? drawn.svg : empty(t("sin datos. Lee una dirección para seguir la muestra descargada.", "no data. Read an address to follow the downloaded sample.")),
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
      ? empty(t("no soportado. No hay una fuente gratuita de P&L realizado.", "not supported. There is no free source of realized P&L."))
      : h("section", { class: "vf-card" }, [
        h("div", { class: "vf-row" }, [h("h2", {}, "DEX"), h("span", { class: "vf-live", "data-state": state.poolMeta?.state || "sin-datos" }, state.poolMeta?.fetchedAt || "")]),
        poolTable(window.rows.length ? window.rows : state.pools),
        state.poolMeta ? h("p", { class: "vf-meta" }, `${state.poolMeta.provider || ""} · ${state.poolMeta.scope || state.poolMeta.state || ""}`) : null,
        pagerBar("dex", window),
      ]),
  ]);
}
function alerts() {
  const rows = loadList(KEYS.alerts);
  return h("div", { class: "vf-side" }, [
    h("aside", { class: "vf-card" }, [
      h("h2", {}, t("Alertas", "Alerts")),
      h("p", {}, `${rows.length} / 10`),
      h("p", { class: "vf-meta" }, t("próximamente: no hay ejecución continua ni envío.", "coming later: there is no continuous run or delivery.")),
      h("button", { type: "button", onclick: () => { state.alertDraft = !state.alertDraft; render(); } }, t("+ Nueva", "+ New")),
    ]),
    h("section", { class: "vf-card" }, [
      empty(rows.length ? t("Las reglas están en este navegador y no se envían.", "Rules stay in this browser and are not sent.") : t("No hay alertas.", "There are no alerts.")),
      state.alertDraft ? h("form", { onsubmit: (event) => { event.preventDefault(); const data = new FormData(event.target); saveList(KEYS.alerts, [{ chain: data.get("chain"), token: data.get("token"), at: new Date().toISOString(), delivery: "proximamente" }, ...rows]); state.alertDraft = false; render(); } }, [
        h("label", {}, ["Token", h("input", { name: "token", required: true })]),
        h("label", {}, [t("Red", "Network"), h("select", { name: "chain" }, supportedIds().map((id) => h("option", { value: id }, id)))]),
        h("button", { type: "submit" }, t("Guardar en local", "Save locally")),
      ]) : null,
    ]),
  ]);
}
function labels() {
  const local = loadList(KEYS.labels);
  return h("section", { class: "vf-card" }, [
    h("div", { class: "vf-pills" }, [
      h("button", { type: "button", "aria-pressed": String(state.labelTab === "labels"), onclick: () => { state.labelTab = "labels"; render(); } }, t("Etiquetas", "Labels")),
      h("button", { type: "button", "aria-pressed": String(state.labelTab === "entities"), onclick: () => { state.labelTab = "entities"; render(); } }, t("Entidades", "Entities")),
    ]),
    h("article", {}, [
      h("h2", {}, "ORVUPI"),
      h("p", { class: "vf-addr" }, OFFICIAL_ADDRESS),
      h("p", { class: "vf-meta" }, t("Evidencia: orvupi-contract.json, Solana, 17-10-2026. No atribuye una persona.", "Evidence: orvupi-contract.json, Solana, 17 Oct 2026. It does not name a person.")),
    ]),
    local.length ? h("ul", {}, local.map((row) => h("li", {}, `${row.name} · ${t("nota local, sin evidencia externa", "local note, no external evidence")}`))) : empty(t("No hay etiquetas propias.", "There are no custom labels.")),
    h("form", { onsubmit: (event) => { event.preventDefault(); const data = new FormData(event.target); saveList(KEYS.labels, [{ name: String(data.get("name") || "").slice(0, 80), at: new Date().toISOString() }, ...local]); render(); } }, [
      h("input", { name: "name", required: true, maxlength: "80" }),
      h("button", { type: "submit" }, t("Nota local", "Local note")),
    ]),
  ]);
}
function transfersPage() {
  return h("section", {}, [h("h2", {}, "Transfers"), transferBlock("all")]);
}
function ficha() {
  const card = state.dossier;
  if (!card) return empty(t("sin datos. Escribe una dirección y pulsa Leer ficha.", "no data. Type an address and press Read profile."));
  const symbol = fact("symbol")?.value || fact("standard")?.value || card.kind;
  return h("div", {}, [
    h("header", { class: "vf-card" }, [
      h("h2", {}, `${symbol || t("Dirección", "Address")} · ${card.chain}`),
      addr(card.address, card.chain),
      isOfficialAddress(card.address) ? h("p", {}, t("Contrato ORVUPI publicado.", "Published ORVUPI contract.")) : null,
      h("p", { class: "vf-meta" }, `${card.provider} · ${card.fetchedAt} · slot ${card.slot ?? t("sin datos", "no data")} · ${card.state}`),
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
        (card.largest || []).length ? h("ul", {}, card.largest.map((row) => h("li", {}, `${short(row.address)} · ${formatUnits(row.amount, row.decimals) || t("sin datos", "no data")}`))) : empty(t("sin datos", "no data")),
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
async function investigate(raw, chainId) {
  const found = identify(raw);
  const chain = found.chainId || chainId || "solana";
  if (!raw) return;
  state.busy = "read";
  state.screen = "ficha";
  render();
  state.dossier = await readAddress(chain, raw);
  remember(found.address || raw, state.dossier.chain || chain);
  const input = document.getElementById("direccion-token");
  if (input && input.value !== raw) input.value = raw;
  const select = document.getElementById("red");
  if (select && [...select.options].some((option) => option.value === chain)) select.value = chain;
  if (found.kind === "solana" || chain === "solana" || found.kind === "evm") {
    state.dex = await fetchDexSnapshot(state.dossier.chain || chain, found.address || raw);
  }
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
  document.body.append(dock);
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
  const field = document.getElementById("direccion-token");
  if (field) field.setAttribute("placeholder", t("Busca tokens, direcciones o pools", "Search tokens, addresses or pools"));
  document.querySelector(".langsuggest")?.remove();
  render();
  loadLive();
}
async function loadLive() {
  const [markets, pools] = await Promise.all([fetchTopMarkets(), fetchTrendingPools()]);
  state.markets = markets;
  state.poolMeta = pools;
  state.pools = pools.pools || [];
  const top = state.pools[0];
  if (top?.address && top.network) {
    state.pool = state.pool || top;
    state.liveTrades = await fetchPoolTrades(top.network, top.address);
  } else {
    state.liveTrades = { ok: false, state: pools.state || "sin-datos", provider: "GeckoTerminal", rows: [] };
  }
  render();
}

if (document.body.classList.contains("verify-app")) boot();

export { observedStep };
