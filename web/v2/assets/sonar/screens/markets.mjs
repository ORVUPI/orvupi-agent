import { api, qs } from "../api.mjs";
import { t } from "../i18n.mjs";
import { applyLocalFilters, coverageNote, marketTabs, paintRanking, sortRows } from "../rows.mjs";
import { snapshot, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, pager, setChildren, skeleton, sourceLine } from "../ui.mjs";
import { compact, money, plain, show } from "../format.mjs";
import { pctNode } from "../ui.mjs";

const PRESETS = [
  ["stablecoins", "stable"],
  ["decentralized-finance-defi", "defi"],
  ["artificial-intelligence", "ia"],
  ["real-world-assets-rwa", "RWA"],
  ["depin", "DePIN"],
  ["gaming", "game"],
  ["meme-token", "Memes"],
  ["layer-1", "l1"],
  ["layer-2", "l2"],
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

// Tope de seguridad; el último número real sale del total que da la API (todas las monedas de CoinGecko).
const MAX_PAGE = 2000;

async function ranking(host, ctx, mine) {
  const body = host.querySelector("#sn-market-body");
  const prefs = snapshot().prefs;
  const category = ctx.route.params.get("category") || "";
  const period = ctx.route.params.get("period") || prefs.period || "24h";
  let page = Math.min(MAX_PAGE, Math.max(1, Number(ctx.route.params.get("page") || 1) || 1));
  const perRaw = Number(ctx.route.params.get("per") || 20);
  const per = [20, 50, 100].includes(perRaw) ? perRaw : 20;
  const view = ctx.route.params.get("view") || prefs.view || "list";
  body.replaceChildren(skeleton(10));
  let rows = [];
  let meta = null;
  const filters = readFilters(ctx.route.params);
  async function load() {
    try {
      const payload = await api(`/api/sonar/markets${qs({ vs: prefs.vs, page, per, category, order: "market_cap_desc" })}`);
      if (mine !== ticket) return;
      meta = payload;
      rows = payload.rows || [];
      paint();
    } catch {
      if (mine !== ticket) return;
      body.replaceChildren(errorBlock(() => load()));
    }
  }
  function turn(next) {
    setParam(ctx, next);
    ranking(host, ctx, mine);
  }
  function pageInfo() {
    const total = Number(meta?.total);
    if (!category && Number.isFinite(total) && total > 0) {
      const pages = Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / per)));
      if (page > pages || !rows.length) return { pages, more: false, past: page > 1 && !rows.length };
      return { pages, more: false, past: false };
    }
    if (!rows.length && page > 1) return { pages: page, more: false, past: true };
    if (rows.length >= per && page < MAX_PAGE) return { pages: page, more: true, past: false };
    return { pages: Math.max(1, page), more: false, past: false };
  }
  function pageBar(withSize) {
    const info = pageInfo();
    return pager({
      page,
      pages: info.pages,
      more: info.more,
      per,
      sizes: withSize ? [20, 50, 100] : [],
      onPage: (value) => turn({ page: String(value) }),
      onPer: (value) => turn({ per: String(value), page: "1" }),
    });
  }
  function paint() {
    const served = Number(meta?.page);
    if (Number.isFinite(served) && served >= 1 && served !== page) {
      page = served;
      setParam(ctx, { page: String(served) });
    }
    const shown = applyView(rows, filters, period, ctx);
    const info = pageInfo();
    if (info.past) {
      setChildren(body, [
        toolbar(),
        pills(),
        filtersOpen() ? filterForm() : null,
        el("p", { class: "sn-state", "data-sn": "past-end", text: t("pastEnd") }),
        el("button", { type: "button", class: "sn-btn on", "data-sn": "past-back", onclick: () => turn({ page: "1" }), text: t("back") }),
        sourceLine(meta),
      ]);
      return;
    }
    const total = Number(meta?.total);
    const listed = !category && Number.isFinite(total) && total > 0 ? t("listedN", { n: plain(total, 0) }) : "";
    setChildren(body, [
      toolbar(),
      pills(),
      filtersOpen() ? filterForm() : null,
      info.pages > 1 || info.more ? pageBar(true) : null,
      shown.length ? paintRanking(shown, {
        prefix: ctx.prefix,
        period,
        currency: meta?.vs || prefs.vs,
        columns: prefs.columns,
        rankFrom: (page - 1) * per + 1,
        view,
        onStar: (row) => toggleStar(row, paint),
        onSort: (key) => {
          rows = sortRows(rows, key, ctx.route.params.get("dir") === "asc" ? "desc" : "asc");
          setParam(ctx, { dir: ctx.route.params.get("dir") === "asc" ? "desc" : "asc", sort: key });
          paint();
        },
      }) : emptyBlock(),
      pageBar(true),
      el("p", { class: "sn-note", text: [listed, t("loadedNote", { n: rows.length }), ctx.route.params.get("sort") ? t("sortLoaded") : ""].filter(Boolean).join(" ") }),
      el("p", { class: "sn-note", text: t("filterHint") }),
      el("p", { class: "sn-note", text: t("ageSkip") }),
      sourceLine(meta),
    ]);
    body.classList.toggle("sn-as-grid", view === "grid");
  }
  function toolbar() {
    return el("div", { class: "sn-tools" }, [
      el("button", { type: "button", class: view === "list" ? "sn-btn on" : "sn-btn", "data-sn": "view-list", onclick: () => setParam(ctx, { view: "list" }) || ranking(host, ctx, mine), text: t("list") }),
      el("button", { type: "button", class: view === "grid" ? "sn-btn on" : "sn-btn", "data-sn": "view-grid", onclick: () => setParam(ctx, { view: "grid" }) || ranking(host, ctx, mine), text: t("grid") }),
      select(t("period"), period, [["1h", t("p1h")], ["24h", t("p24h")], ["7d", t("p7d")]], (value) => { update((data) => { data.prefs.period = value; return data; }); setParam(ctx, { period: value }); ranking(host, ctx, mine); }),
      el("button", { type: "button", class: "sn-btn", "data-sn": "filters", "aria-expanded": filtersOpen() ? "true" : "false", onclick: () => { body.toggleAttribute("data-filters"); paint(); }, text: t("filters") }),
    ]);
  }
  function pills() {
    const known = new Set(PRESETS.map((row) => row[0]));
    return el("div", { class: "sn-pills", "data-sn": "pills" }, [
      el("button", { type: "button", class: category ? "sn-pill" : "sn-pill on", onclick: () => setParam(ctx, { category: "", page: "1" }) || ranking(host, ctx, mine), text: t("allEx") }),
      ...PRESETS.filter(([id]) => known.has(id)).map(([id, label]) => el("button", {
        type: "button",
        class: category === id ? "sn-pill on" : "sn-pill",
        "data-sn-cat": id,
        onclick: () => setParam(ctx, { category: id, page: "1" }) || ranking(host, ctx, mine),
        text: label === "RWA" || label === "DePIN" || label === "Memes" ? label : t(label),
      })),
    ]);
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
  await load();
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
  const vs = snapshot().prefs.vs;
  const [globalResult, moversResult] = await Promise.allSettled([
    api(`/api/sonar/global${qs({ vs })}`),
    api(`/api/sonar/movers${qs({ vs, period: "24h", minVol: 50000 })}`),
  ]);
  if (mine !== ticket) return;
  if (globalResult.status === "rejected" && moversResult.status === "rejected") {
    body.replaceChildren(errorBlock(() => overview(host, ctx, mine)));
    return;
  }
  const global = globalResult.status === "fulfilled" ? globalResult.value : null;
  const movers = moversResult.status === "fulfilled" ? moversResult.value : null;
  const cap = global?.data?.global?.marketCap;
  body.replaceChildren(
    el("section", { class: "sn-overview", "data-sn": "overview" }, [
      el("article", { class: "sn-hero" }, global ? [
        el("h2", { text: t("cap") }),
        el("p", { class: "sn-hero-num", text: show(compact(cap, global.vs)) }),
        pctNode(global.data?.global?.change24h),
        el("p", { class: "sn-note", text: t("capMissing") }),
        sourceLine(global.data?.global),
      ] : [el("h2", { text: t("cap") }), errorBlock(() => overview(host, ctx, mine))]),
      movers ? moverCol(t("gainers"), movers.gainers, ctx, movers.vs) : errorBlock(() => overview(host, ctx, mine)),
      movers ? moverCol(t("losers"), movers.losers, ctx, movers.vs) : null,
    ]),
    movers ? el("p", { class: "sn-note", text: coverageNote(movers) }) : null,
    movers ? sourceLine(movers) : null,
  );
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
