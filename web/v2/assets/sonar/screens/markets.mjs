import { api, qs } from "../api.mjs";
import { t } from "../i18n.mjs";
import { applyLocalFilters, marketTabs, paintRanking, sortRows } from "../rows.mjs";
import { snapshot, update, hasCoin } from "../store.mjs";
import { el, emptyBlock, errorBlock, setChildren, skeleton, sourceLine } from "../ui.mjs";
import { compact, money, show } from "../format.mjs";
import { pctNode } from "../ui.mjs";

const PRESETS = [
  ["stablecoins", "Stablecoins"],
  ["decentralized-finance-defi", "DeFi"],
  ["artificial-intelligence", "IA"],
  ["real-world-assets-rwa", "RWA"],
  ["depin", "DePIN"],
  ["gaming", "Gaming"],
  ["meme-token", "Memes"],
  ["layer-1", "Layer 1"],
  ["layer-2", "Layer 2"],
];

let ticket = 0;

export async function mount(host, ctx) {
  const mine = ++ticket;
  const tab = ctx.route.params.get("tab") || "top";
  host.replaceChildren(shell(ctx, tab));
  if (tab === "overview") return overview(host, ctx, mine);
  return ranking(host, ctx, mine);
}

function shell(ctx, tab) {
  return el("section", { class: "sn-screen", "data-sn": "markets" }, [
    marketTabs(tab === "overview" ? "overview" : "top", ctx.go),
    el("div", { id: "sn-market-body" }),
  ]);
}

async function ranking(host, ctx, mine) {
  const body = host.querySelector("#sn-market-body");
  const prefs = snapshot().prefs;
  const category = ctx.route.params.get("category") || "";
  const period = ctx.route.params.get("period") || prefs.period || "24h";
  const view = ctx.route.params.get("view") || prefs.view || "list";
  body.replaceChildren(skeleton(10));
  let page = 1;
  let rows = [];
  let meta = null;
  const filters = readFilters(ctx.route.params);
  async function load(reset) {
    if (reset) page = 1;
    try {
      const payload = await api(`/api/sonar/markets${qs({ vs: prefs.vs, page, per: 100, category, order: "market_cap_desc" })}`);
      if (mine !== ticket) return;
      meta = payload;
      rows = reset ? payload.rows || [] : rows.concat(payload.rows || []);
      paint();
    } catch {
      if (mine !== ticket) return;
      body.replaceChildren(errorBlock(() => load(true)));
    }
  }
  function paint() {
    const shown = applyView(rows, filters, period, ctx);
    const limit = Number(ctx.route.params.get("top") || prefs.top || 100);
    const sliced = shown.slice(0, limit);
    setChildren(body, [
      toolbar(),
      pills(),
      filtersOpen() ? filterForm() : null,
      sliced.length ? paintRanking(sliced, {
        prefix: ctx.prefix,
        period,
        currency: meta?.vs || prefs.vs,
        columns: prefs.columns,
        view,
        onStar: (row) => toggleStar(row, paint),
        onSort: (key) => {
          rows = sortRows(rows, key, ctx.route.params.get("dir") === "asc" ? "desc" : "asc");
          setParam(ctx, { dir: ctx.route.params.get("dir") === "asc" ? "desc" : "asc", sort: key });
          paint();
        },
      }) : emptyBlock(),
      el("p", { class: "sn-note", text: t("loadedNote", { n: rows.length }) + (ctx.route.params.get("sort") ? ` ${t("sortLoaded")}` : "") }),
      el("p", { class: "sn-note", text: t("filterHint") }),
      el("p", { class: "sn-note", text: t("ageSkip") }),
      rows.length >= page * 100 && page < 10 ? el("button", { type: "button", class: "sn-btn", "data-sn": "more-rows", onclick: () => { page += 1; load(false); }, text: t("loadMore") }) : null,
      sourceLine(meta),
    ]);
    body.classList.toggle("sn-as-grid", view === "grid");
  }
  function toolbar() {
    return el("div", { class: "sn-tools" }, [
      el("button", { type: "button", class: view === "list" ? "sn-btn on" : "sn-btn", "data-sn": "view-list", onclick: () => setParam(ctx, { view: "list" }) || ranking(host, ctx, mine), text: t("list") }),
      el("button", { type: "button", class: view === "grid" ? "sn-btn on" : "sn-btn", "data-sn": "view-grid", onclick: () => setParam(ctx, { view: "grid" }) || ranking(host, ctx, mine), text: t("grid") }),
      select(t("period"), period, [["1h", t("p1h")], ["24h", t("p24h")], ["7d", t("p7d")]], (value) => { update((data) => { data.prefs.period = value; return data; }); setParam(ctx, { period: value }); ranking(host, ctx, mine); }),
      select("Top", String(ctx.route.params.get("top") || prefs.top || 100), [["100", "100"], ["250", "250"], ["500", "500"], ["1000", "1000"]], (value) => { update((data) => { data.prefs.top = Number(value); return data; }); setParam(ctx, { top: value }); ranking(host, ctx, mine); }),
      el("button", { type: "button", class: "sn-btn", "data-sn": "filters", "aria-expanded": filtersOpen() ? "true" : "false", onclick: () => { body.toggleAttribute("data-filters"); paint(); }, text: t("filters") }),
    ]);
  }
  function pills() {
    const known = new Set(PRESETS.map((row) => row[0]));
    return el("div", { class: "sn-pills", "data-sn": "pills" }, [
      el("button", { type: "button", class: category ? "sn-pill" : "sn-pill on", onclick: () => setParam(ctx, { category: "" }) || ranking(host, ctx, mine), text: t("allEx") }),
      ...PRESETS.map(([id, label]) => el("button", {
        type: "button",
        class: category === id ? "sn-pill on" : "sn-pill",
        "data-sn-cat": id,
        onclick: () => setParam(ctx, { category: id }) || ranking(host, ctx, mine),
        text: label,
      })),
    ].filter((node) => node && (node.getAttribute?.("data-sn-cat") ? known.has(node.getAttribute("data-sn-cat")) || true : true)));
  }
  function filtersOpen() {
    return body.hasAttribute("data-filters");
  }
  function filterForm() {
    const form = el("form", { class: "sn-filters", "data-sn": "filter-form", onsubmit: (event) => { event.preventDefault(); const data = new FormData(form); setParam(ctx, { mcapMin: data.get("mcapMin"), mcapMax: data.get("mcapMax"), priceMin: data.get("priceMin"), priceMax: data.get("priceMax"), volMin: data.get("volMin"), chgMin: data.get("chgMin"), circMin: data.get("circMin"), hasMax: form.querySelector("[name=hasMax]").checked ? "1" : "" }); ranking(host, ctx, mine); } });
    form.append(
      numField("mcapMin", t("mcapMin"), filters.mcapMin),
      numField("mcapMax", t("mcapMax"), filters.mcapMax),
      numField("priceMin", t("priceMin"), filters.priceMin),
      numField("priceMax", t("priceMax"), filters.priceMax),
      numField("volMin", t("volMin"), filters.volMin),
      numField("chgMin", t("chgMin"), filters.chgMin),
      numField("circMin", t("circMin"), filters.circMin),
      el("label", { class: "sn-check" }, [el("input", { type: "checkbox", name: "hasMax", checked: filters.hasMax ? true : null }), t("hasMax")]),
      el("button", { type: "submit", class: "sn-btn on", text: t("apply") }),
      el("button", { type: "button", class: "sn-btn", onclick: () => { setParam(ctx, { mcapMin: "", mcapMax: "", priceMin: "", priceMax: "", volMin: "", chgMin: "", circMin: "", hasMax: "", category: "" }); ranking(host, ctx, mine); }, text: t("clear") }),
    );
    return form;
  }
  await load(true);
}

function applyView(rows, filters, period, ctx) {
  let next = applyLocalFilters(rows, filters, period);
  const sort = ctx.route.params.get("sort");
  if (sort) next = sortRows(next, sort, ctx.route.params.get("dir") || "desc");
  return next;
}

async function overview(host, ctx, mine) {
  const body = host.querySelector("#sn-market-body");
  body.replaceChildren(skeleton(6));
  try {
    const [global, movers] = await Promise.all([
      api(`/api/sonar/global${qs({ vs: snapshot().prefs.vs })}`),
      api(`/api/sonar/movers${qs({ vs: snapshot().prefs.vs, period: "24h", minVol: 50000 })}`),
    ]);
    if (mine !== ticket) return;
    const cap = global.data?.global?.marketCap;
    body.replaceChildren(
      el("section", { class: "sn-overview", "data-sn": "overview" }, [
        el("article", { class: "sn-hero" }, [
          el("h2", { text: t("cap") }),
          el("p", { class: "sn-hero-num", text: show(compact(cap, global.vs)) }),
          pctNode(global.data?.global?.change24h),
          el("p", { class: "sn-note", text: t("capMissing") }),
          sourceLine(global.data?.global),
        ]),
        moverCol(t("gainers"), movers.gainers, ctx, movers.vs),
        moverCol(t("losers"), movers.losers, ctx, movers.vs),
      ]),
      el("p", { class: "sn-note", text: movers.note || t("universe") }),
      sourceLine(movers),
    );
  } catch {
    if (mine !== ticket) return;
    body.replaceChildren(errorBlock(() => overview(host, ctx, mine)));
  }
}

function moverCol(title, rows, ctx, currency) {
  const list = el("ol", { class: "sn-mover" });
  for (const row of (rows || []).slice(0, 8)) {
    list.append(el("li", {}, [
      el("a", { href: `${ctx.prefix}/sonar/crypto/${row.id}`, text: `${row.symbol} ${row.name || ""}` }),
      pctNode(row.ch24h),
      el("small", { text: show(money(row.price, currency)) }),
    ]));
  }
  return el("article", { class: "sn-hero" }, [el("h2", { text: title }), list.childNodes.length ? list : emptyBlock(t("emptyOverview"))]);
}

function select(label, value, options, onChange) {
  const node = el("label", { class: "sn-select" }, [el("span", { text: label }), el("select", { onchange: (event) => onChange(event.target.value) }, options.map(([id, text]) => el("option", { value: id, selected: id === String(value) ? true : null, text })))]);
  return node;
}

function numField(name, label, value) {
  return el("label", {}, [label, el("input", { name, type: "number", inputmode: "decimal", step: "any", value: value ?? "" })]);
}

function readFilters(params) {
  const num = (key) => {
    const value = params.get(key);
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    mcapMin: num("mcapMin"),
    mcapMax: num("mcapMax"),
    priceMin: num("priceMin"),
    priceMax: num("priceMax"),
    volMin: num("volMin"),
    chgMin: num("chgMin"),
    circMin: num("circMin"),
    hasMax: params.get("hasMax") === "1",
  };
}

function setParam(ctx, updates) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  history.replaceState({}, "", url);
  ctx.route = { ...ctx.route, params: url.searchParams };
}

async function toggleStar(row, paint) {
  await update((data) => {
    const list = data.lists.find((item) => item.id === data.activeList) || data.lists[0];
    if (!list) return data;
    list.ids = list.ids.includes(row.id) ? list.ids.filter((id) => id !== row.id) : [row.id, ...list.ids];
    return data;
  });
  paint();
}

export { toggleStar, hasCoin };
