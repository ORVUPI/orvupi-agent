import { api } from "./api.mjs";
import { changeOver } from "./changes.mjs";
import { compact, money, plain, show } from "./format.mjs";
import { t } from "./i18n.mjs";
import { hasCoin } from "./store.mjs";
import { coinLink, el, logo, missing, pctNode, spark } from "./ui.mjs";

export function changeKey(period) {
  if (period === "1h") return "ch1h";
  if (period === "7d") return "ch7d";
  if (period === "30d") return "ch30d";
  return "ch24h";
}

export function marketTabs(active, go) {
  const items = [
    ["top", "/sonar/", t("top")],
    ["trending", "/sonar/trending/", t("trending")],
    ["watchlist", "/sonar/watchlist/", t("watchlist")],
    ["overview", "/sonar/?tab=overview", t("overview")],
  ];
  return el("div", { class: "sn-tabs", role: "tablist", "data-sn": "tabs" }, items.map(([id, href, label]) => el("button", {
    type: "button",
    class: "sn-tab",
    role: "tab",
    "data-sn-tab": id,
    "aria-selected": active === id ? "true" : "false",
    onclick: () => go(href),
    text: label,
  })));
}

export function paintRanking(rows, opts) {
  const key = changeKey(opts.period || "24h");
  const cols = opts.columns || {};
  const currency = opts.currency || "usd";
  const head = [
    ["rank", t("rank")],
    ["name", t("name")],
    ["price", t("price")],
    cols.h1 === false ? null : ["ch1h", t("h1")],
    ["ch24h", t("h24")],
    cols.d7 === false ? null : ["ch7d", t("d7")],
    ["marketCap", t("mcap")],
    ["volume24h", t("volume")],
    cols.supply === false ? null : ["circulating", t("supply")],
    cols.spark === false ? null : ["spark", t("d7")],
    ["star", ""],
  ].filter(Boolean);
  const table = el("table", { class: "sn-table" });
  table.append(el("thead", {}, el("tr", {}, head.map(([id, label]) => el("th", {
    scope: "col",
    class: id === "name" || id === "star" ? "" : "num",
    "data-sort": id,
  }, id && opts.onSort && !["spark", "star", "name", "rank"].includes(id) ? el("button", { type: "button", class: "sn-sort", onclick: () => opts.onSort(id), text: label }) : label)))));
  const body = el("tbody");
  rows.forEach((row, index) => body.append(desktopRow(row, head, key, currency, opts, index)));
  table.append(body);
  const mobile = el("div", { class: "sn-mlist", "data-sn": "mlist" }, rows.map((row, index) => mobileRow(row, key, currency, opts, index)));
  const grid = opts.view === "grid" ? el("div", { class: "sn-grid", "data-sn": "grid" }, rows.map((row) => gridCard(row, key, currency, opts))) : null;
  const root = el("div", { "data-sn": "ranking" }, [
    el("div", { class: "sn-scroll" }, table),
    mobile,
    grid,
  ]);
  queueMicrotask(() => {
    if (root.isConnected) hydrateMissingChanges(root);
  });
  return root;
}

function rowRank(row, opts, index) {
  if (row.rank != null) return String(row.rank);
  return String((opts.rankFrom || 1) + index);
}

function desktopRow(row, head, key, currency, opts, index) {
  const cells = {
    rank: el("td", { class: "num", text: rowRank(row, opts, index) }),
    name: el("td", {}, el("span", { class: "sn-name" }, [logo(row), coinLink(row, opts.prefix, [el("strong", { text: row.name }), el("small", { text: row.symbol })])])),
    price: el("td", { class: "num", "data-k": "price", text: show(money(row.price, currency)) }),
    ch1h: changeCell(row, "ch1h"),
    ch24h: changeCell(row, "ch24h"),
    ch7d: changeCell(row, "ch7d"),
    marketCap: el("td", { class: "num", text: show(compact(row.marketCap, currency)) }),
    volume24h: el("td", { class: "num", text: show(compact(row.volume24h, currency)) }),
    circulating: el("td", { class: "num" }, supplyCell(row)),
    spark: el("td", {}, spark(row.spark7d)),
    star: el("td", {}, starButton(row, opts)),
  };
  return el("tr", { "data-coin": row.id }, head.map(([id]) => cells[id]));
}

function mobileRow(row, key, currency, opts, index) {
  return el("div", { class: "sn-mrow", "data-coin": row.id }, [
    el("span", { class: "sn-rank", text: rowRank(row, opts, index) }),
    logo(row),
    el("a", { class: "sn-mid", href: `${opts.prefix}/sonar/crypto/${row.id}` }, [el("strong", { text: row.symbol || row.name }), el("small", { text: show(compact(row.marketCap, currency)) })]),
    el("span", { class: "sn-px", "data-k": "price", text: show(money(row.price, currency)) }),
    el("span", { class: "sn-right" }, [changeCell(row, key, "span"), spark(row.spark7d)]),
    starButton(row, opts),
  ]);
}

function gridCard(row, key, currency, opts) {
  return el("article", { class: "sn-card", "data-coin": row.id }, [
    el("div", { class: "sn-card-top" }, [logo(row), coinLink(row, opts.prefix, row.symbol || row.name), starButton(row, opts)]),
    el("strong", { "data-k": "price", text: show(money(row.price, currency)) }),
    changeCell(row, key, "span"),
    spark(row.spark7d),
  ]);
}

function changeCell(row, key, tag = "td") {
  const attrs = { "data-k": key };
  if (tag === "td") attrs.class = "num";
  if (row[key] == null) attrs["data-missing"] = "1";
  return el(tag, attrs, pctNode(row[key]));
}

const chartPoints = new Map();
const WINDOWS = { ch1h: [1, 0.5], ch24h: [24, 2], ch7d: [168, 6] };

function loadChart(id) {
  if (!chartPoints.has(id)) {
    chartPoints.set(id, api(`/api/sonar/coin/${encodeURIComponent(id)}/chart?days=7`).then((body) => (Array.isArray(body?.points) ? body.points : [])).catch(() => null));
  }
  return chartPoints.get(id);
}

/** Rellena celdas vacías con la serie real de 7 días. Dos peticiones a la vez. Si no hay punto en la ventana, el hueco se queda. */
export function hydrateMissingChanges(root) {
  if (!root?.querySelectorAll) return;
  const groups = new Map();
  for (const node of root.querySelectorAll("[data-missing='1']")) {
    const id = node.closest("[data-coin]")?.getAttribute("data-coin");
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(node);
  }
  const ids = [...groups.keys()];
  if (!ids.length) return;
  let cursor = 0;
  const workers = Math.min(2, ids.length);
  const placeholder = t("unavailable");
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor];
      cursor += 1;
      if (!root.isConnected) return;
      let points = null;
      try {
        points = await loadChart(id);
      } catch {
        points = null;
      }
      if (!root.isConnected) return;
      for (const cell of groups.get(id) || []) {
        if (!cell.isConnected || !cell.hasAttribute("data-missing")) continue;
        const current = cell.textContent.trim();
        if (current && current !== placeholder) {
          cell.removeAttribute("data-missing");
          continue;
        }
        const spec = WINDOWS[cell.getAttribute("data-k")];
        const value = spec && points ? changeOver(points, spec[0], spec[1]) : null;
        cell.removeAttribute("data-missing");
        if (value == null) continue;
        cell.replaceChildren(pctNode(value));
      }
    }
  }
  for (let index = 0; index < workers; index += 1) worker();
}

function supplyCell(row) {
  const wrap = el("span", { class: "sn-supply" });
  wrap.append(show(compact(row.circulating, "")) || t("unavailable"));
  if (row.max && row.circulating != null) {
    const ratio = Math.max(0, Math.min(100, (row.circulating / row.max) * 100));
    const step = Math.max(0, Math.min(20, Math.round(ratio / 5)));
    wrap.append(el("span", { class: "sn-bar", title: `${ratio.toFixed(1)}%` }, el("span", { class: `sn-w${step}` })));
  }
  return wrap;
}

function starButton(row, opts) {
  const on = hasCoin(row.id);
  return el("button", {
    type: "button",
    class: on ? "sn-star on" : "sn-star",
    "data-sn-star": row.id,
    "aria-pressed": on ? "true" : "false",
    "aria-label": on ? t("starDel") : t("starAdd"),
    onclick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      opts.onStar?.(row);
    },
    text: "★",
  });
}

export function coverageNote(body) {
  const count = body?.count == null ? "—" : show(plain(body.count, 0));
  return t(body?.partial ? "universePartial" : "universe", { n: count });
}

export function sortRows(rows, key, dir) {
  const factor = dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? factor : av < bv ? -factor : 0;
  });
}

export function applyLocalFilters(rows, filters, period) {
  const key = changeKey(period);
  return rows.filter((row) => {
    if (filters.mcapMin != null && (row.marketCap == null || row.marketCap < filters.mcapMin)) return false;
    if (filters.mcapMax != null && (row.marketCap == null || row.marketCap > filters.mcapMax)) return false;
    if (filters.priceMin != null && (row.price == null || row.price < filters.priceMin)) return false;
    if (filters.priceMax != null && (row.price == null || row.price > filters.priceMax)) return false;
    if (filters.volMin != null && (row.volume24h == null || row.volume24h < filters.volMin)) return false;
    if (filters.chgMin != null && (row[key] == null || row[key] < filters.chgMin)) return false;
    if (filters.hasMax && row.max == null) return false;
    if (filters.circMin != null) {
      if (!row.max || row.circulating == null) return false;
      if ((row.circulating / row.max) * 100 < filters.circMin) return false;
    }
    return true;
  });
}
