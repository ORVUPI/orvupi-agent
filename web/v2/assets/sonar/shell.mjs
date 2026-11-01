import { api, qs } from "./api.mjs";
import { compact, money, pct, plain, show } from "./format.mjs";
import { iaButton } from "./ia.mjs";
import { labelOf, locale, t } from "./i18n.mjs";
import { onTick, patchNodes, startLive, status } from "./live.mjs";
import { loadStore, remember, snapshot, update } from "./store.mjs";
import { el, errorBlock, pctNode, setChildren, skeleton, sourceLine } from "./ui.mjs";

const screens = {
  home: () => import("./screens/markets.mjs"),
  crypto: () => import("./screens/coin.mjs"),
  exchanges: () => import("./screens/exchanges.mjs"),
  categories: () => import("./screens/categories.mjs"),
  movers: () => import("./screens/boards.mjs").then((mod) => ({ mount: mod.mountMovers })),
  trending: () => import("./screens/boards.mjs").then((mod) => ({ mount: mod.mountTrending })),
  new: () => import("./screens/boards.mjs").then((mod) => ({ mount: mod.mountNew })),
  news: () => import("./screens/boards.mjs").then((mod) => ({ mount: mod.mountNews })),
  watchlist: () => import("./screens/watchlist.mjs"),
  portfolio: () => import("./screens/portfolio.mjs"),
  calendar: () => import("./screens/calendar.mjs").then((mod) => ({ mount: mod.mountCalendar })),
  unlocks: () => import("./screens/calendar.mjs").then((mod) => ({ mount: mod.mountUnlocks })),
};

let drawTicket = 0;

export function parseRoute() {
  const path = location.pathname;
  const prefixMatch = path.match(/^\/(en|pt-br|ja|ko)(?=\/)/);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const rest = path.slice(prefix.length).replace(/\/+$/, "");
  const parts = rest.split("/").filter(Boolean);
  const section = parts[1] || "home";
  return { prefix, section: screens[section] ? section : "home", id: parts[2] ? decodeURIComponent(parts[2]) : "", params: new URLSearchParams(location.search) };
}

export function go(path) {
  const prefix = parseRoute().prefix;
  history.pushState({}, "", `${prefix}${path}`);
  draw();
}

export async function start() {
  await loadStore();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/sonar.css";
  link.dataset.sonar = "1";
  if (!document.querySelector("link[data-sonar]")) document.head.append(link);
  document.body.classList.add("sonar-market");
  hideVerifyChrome();
  mountTop();
  mountDock();
  mountSearchButton();
  footerCredit();
  globalThis.__sonarFormatPrice = (value) => show(money(value, snapshot().prefs.vs));
  globalThis.__sonarFormatPct = (value) => show(pct(value));
  globalThis.__sonarVs = snapshot().prefs.vs;
  window.addEventListener("popstate", draw);
  document.getElementById("vf-root")?.replaceChildren(skeleton(8));
  draw();
  startLive().then(() => {
    const badge = document.getElementById("sn-live");
    if (badge) badge.textContent = status() === "live" ? t("connected") : t("disconnected");
  });
  onTick((updates) => {
    patchNodes(updates);
    checkAlerts(updates);
  });
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    /* el permiso se pide cuando el usuario guarda un aviso */
  }
}

function checkAlerts(updates) {
  const alerts = snapshot().alerts || [];
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  for (const update of updates) {
    for (const alert of alerts) {
      if (alert.coinId !== update.id || update.prev == null || update.price == null) continue;
      const hit = alert.op === "below" ? update.prev > alert.price && update.price <= alert.price : update.prev < alert.price && update.price >= alert.price;
      if (!hit) continue;
      try { new Notification("ORVUPI Sonar", { body: `${update.id} ${update.price}` }); } catch { /* sin permiso */ }
    }
  }
}

function mountTop() {
  if (document.querySelector(".sn-topnav")) return;
  const nav = el("nav", { class: "sn-topnav", "aria-label": t("markets") });
  const links = [
    ["/sonar/", t("markets")],
    ["/sonar/exchanges/", t("exchanges")],
    ["/sonar/categories/", t("categories")],
    ["/sonar/movers/", t("movers")],
    ["/sonar/trending/", t("trending")],
    ["/sonar/calendar/", t("calendar")],
    ["/sonar/unlocks/", t("unlocks")],
    ["/sonar/portfolio/", t("portfolio")],
  ];
  for (const [href, label] of links) {
    nav.append(el("a", { href, onclick: (event) => { event.preventDefault(); go(href); }, text: label }));
  }
  nav.append(el("a", { href: `${parseRoute().prefix}/verify/#dex`, text: t("verifySection") }));
  (document.querySelector(".vf-nav") || document.querySelector("header.site .wrap"))?.after(nav);
  if (!nav.parentElement) document.querySelector("header.site .wrap")?.append(nav);
}

function hideVerifyChrome() {
  document.getElementById("consulta")?.setAttribute("hidden", "");
  document.querySelector(".vf-nav")?.setAttribute("hidden", "");
}

function mountDock() {
  if (document.querySelector(".sn-dock")) return;
  const dock = el("nav", { class: "sn-dock", "aria-label": t("markets") }, [
    dockButton("markets", t("markets"), () => go("/sonar/")),
    dockButton("search", t("search"), () => openSearch()),
    dockButton("watchlist", t("watchlist"), () => go("/sonar/watchlist/")),
    dockButton("portfolio", t("portfolio"), () => go("/sonar/portfolio/")),
    dockButton("more", t("more"), () => toggleMore()),
  ]);
  document.body.append(dock, moreSheet());
}

function dockButton(id, label, onclick) {
  return el("button", { type: "button", "data-sn-dock": id, onclick, text: label });
}

function moreSheet() {
  const prefix = () => parseRoute().prefix;
  const items = [
    ["/sonar/exchanges/", t("exchanges")],
    ["/sonar/categories/", t("categories")],
    ["/sonar/movers/", t("movers")],
    ["/sonar/new/", t("fresh")],
    ["/sonar/calendar/", t("calendar")],
    ["/sonar/unlocks/", t("unlocks")],
    ["/verify/#dex", t("dexTool")],
    ["/verify/#tracer", t("tracer")],
    ["/verify/#visualizer", t("map")],
    ["/verify/#alertas", t("alerts")],
    ["/verify/#etiquetas", t("labels")],
    ["/verify/#paneles", t("panels")],
    ["/verify/#transfers", t("transfers")],
    ["/verify/#ficha", t("profile")],
  ];
  return el("div", { id: "sn-more", class: "sn-more", hidden: true }, items.map(([href, label]) => el("a", {
    href: href.startsWith("/verify/") ? `${prefix()}${href}` : `${prefix()}${href}`,
    onclick: (event) => {
      if (href.startsWith("/verify/")) return;
      event.preventDefault();
      document.getElementById("sn-more").hidden = true;
      go(href);
    },
    text: label,
  })));
}

function toggleMore() {
  const sheet = document.getElementById("sn-more");
  if (sheet) sheet.hidden = !sheet.hidden;
}

function mountSearchButton() {
  const button = document.getElementById("vf-open-search");
  if (!button || button.closest(".sn-headtools")) return;
  const tools = el("div", { class: "sn-headtools" });
  button.before(tools);
  tools.append(iaButton({ go, route: parseRoute(), openSearch, prefix: parseRoute().prefix }), button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openSearch();
  }, true);
  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      openSearch();
    }
  });
}

function footerCredit() {
  const footer = document.querySelector("footer.or-footer .wrap") || document.querySelector("footer.or-footer");
  if (!footer || footer.querySelector(".sn-attrib")) return;
  footer.append(el("p", { class: "sn-attrib" }, [
    el("a", { href: "https://www.coingecko.com/", rel: "noreferrer", text: t("cg") }),
    el("a", { href: "https://www.geckoterminal.com/", rel: "noreferrer", text: t("gt") }),
    el("a", { href: "https://alternative.me/crypto/fear-and-greed-index/", rel: "noreferrer", text: t("am") }),
    el("a", { href: "https://pattern.plus", rel: "noreferrer", text: t("pp") }),
  ]));
}

async function draw() {
  const mine = ++drawTicket;
  const route = parseRoute();
  const root = document.getElementById("vf-root");
  if (!root) return;
  document.querySelectorAll("[data-sn-dock]").forEach((button) => {
    const id = button.getAttribute("data-sn-dock");
    const on = (id === "markets" && (route.section === "home" || route.section === "trending")) || id === route.section;
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const ctx = { route, prefix: route.prefix, go, openSearch, locale: locale() };
  root.replaceChildren(statsBar(ctx), el("div", { id: "sn-outlet" }, skeleton(8)));
  const outlet = root.querySelector("#sn-outlet");
  try {
    const mod = await screens[route.section]();
    if (mine !== drawTicket) return;
    await mod.mount(outlet, ctx);
  } catch {
    if (mine !== drawTicket) return;
    outlet.replaceChildren(errorBlock(() => draw()));
  }
}

function statsBar(ctx) {
  const bar = el("section", { class: "sn-stats", "data-sn": "stats" }, skeleton(4));
  const vs = snapshot().prefs.vs;
  queueMicrotask(() => api(`/api/sonar/global${qs({ vs })}`).then((body) => {
    if (!bar.isConnected) return;
    const data = body.data || {};
    const fx = body.rateMissing ? el("p", { class: "sn-note", text: t("rateMissing") }) : null;
    const fear = data.fear;
    const alt = data.alt;
    bar.replaceChildren(
      stat(t("cap"), show(compact(data.global?.marketCap, body.vs)), pctNode(data.global?.change24h), data.global),
      stat(t("volume"), show(compact(data.global?.volume24h, body.vs)), null, data.global),
      stat(t("btcDom"), data.global?.dominance?.btc == null ? t("unavailable") : `${plain(data.global.dominance.btc, 2)}%`, null, data.global),
      stat(t("ethDom"), data.global?.dominance?.eth == null ? t("unavailable") : `${plain(data.global.dominance.eth, 2)}%`, null, data.global),
      stat(t("assets"), show(plain(data.global?.assets, 0)), null, data.global),
      stat(t("marketsN"), show(plain(data.global?.markets, 0)), null, data.global),
      fearCard(fear),
      altCard(alt),
      stat(t("gas"), data.gas?.gwei == null ? t("unavailable") : `${plain(data.gas.gwei, 3)} ${t("gwei")}`, null, data.gas),
      stat(t("fee"), data.fees?.hour == null ? t("unavailable") : `${plain(data.fees.hour, 0)} ${t("sat")}`, null, data.fees),
    );
    if (fx) bar.after(fx);
    const select = currencySelect(vs);
    bar.append(select);
    const live = el("p", { id: "sn-live", class: "sn-note", text: t("disconnected") });
    bar.append(live);
  }).catch(() => {
    if (bar.isConnected) bar.replaceChildren(errorBlock(() => draw()));
  }));
  return bar;
}

function stat(label, value, extra, source) {
  return el("article", { class: "sn-stat", "data-sn-stat": label }, [
    el("span", { text: label }),
    el("strong", { text: value }),
    extra || null,
    sourceLine(source),
  ]);
}

function fearCard(fear) {
  const card = el("article", { class: "sn-stat", "data-sn-stat": "fear" }, [
    el("span", { text: t("fear") }),
    el("strong", { text: fear?.value == null ? t("unavailable") : String(fear.value) }),
    el("em", { text: fear?.label ? labelOf("fearWord", fear.label) : "" }),
    fear?.history?.[1]?.value != null ? el("small", { text: `${t("fearYest")} ${fear.history[1].value}` }) : null,
    el("a", { href: "https://alternative.me/crypto/fear-and-greed-index/", rel: "noreferrer", text: t("am") }),
  ]);
  return card;
}

function altCard(alt) {
  return el("article", { class: "sn-stat", "data-sn-stat": "alt" }, [
    el("span", { text: t("alt") }),
    el("strong", { text: alt?.value == null ? t("unavailable") : `${plain(alt.value, 0)}` }),
    el("small", { text: alt?.season ? labelOf("season", alt.season) : "" }),
    alt ? el("small", { text: t("altMethod", { beat: alt.beat ?? "—", coins: alt.coins ?? "—", days: alt.lookDays ?? "—" }) }) : null,
    el("a", { href: "https://pattern.plus", rel: "noreferrer", text: t("pp") }),
  ]);
}

function currencySelect(vs) {
  const codes = ["usd", "eur", "gbp", "jpy", "brl", "krw", "cny", "cad", "aud", "chf"];
  return el("label", { class: "sn-select sn-stat" }, [
    t("currency"),
    el("select", { "data-sn": "currency", onchange: async (event) => {
      await update((data) => { data.prefs.vs = event.target.value; return data; });
      globalThis.__sonarVs = event.target.value;
      draw();
    } }, codes.map((code) => el("option", { value: code, selected: code === vs ? true : null, text: code.toUpperCase() }))),
  ]);
}

let searchTimer = 0;

export function openSearch() {
  let dialog = document.getElementById("sn-search");
  if (!dialog) {
    dialog = el("dialog", { id: "sn-search", class: "sn-dialog sn-search", "aria-label": t("search") });
    document.body.append(dialog);
  }
  const input = el("input", { type: "search", "data-sn": "q", placeholder: t("searchPh"), autocomplete: "off", "aria-label": t("search") });
  const results = el("div", { "data-sn": "search-results" });
  dialog.replaceChildren(
    el("h2", { text: t("search") }),
    input,
    results,
    el("button", { type: "button", class: "sn-btn", onclick: () => dialog.close(), text: t("close") }),
  );
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(input.value, results), 250);
  });
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  input.focus();
  runSearch("", results);
}

async function runSearch(text, results) {
  const q = text.trim();
  results.replaceChildren(skeleton(4));
  try {
    if (!q) {
      const [suggest, recent] = await Promise.all([api("/api/sonar/suggest"), Promise.resolve(snapshot().recent)]);
      setChildren(results, [
        block(t("recent"), (recent || []).map((row) => hit(row.kind, row.id, row.label, row.href))),
        block(t("popular"), (suggest.trending?.coins || []).slice(0, 6).map((row) => hit("coin", row.id, `${row.symbol} ${row.name}`, `/sonar/crypto/${row.id}`))),
        block(t("onchain"), (suggest.pools?.pools || []).slice(0, 4).map((row) => hit("pool", row.id, row.name || row.baseSymbol, row.url))),
        block(t("gainers"), (suggest.gainers || []).map((row) => hit("coin", row.id, row.symbol, `/sonar/crypto/${row.id}`))),
        block(t("losers"), (suggest.losers || []).map((row) => hit("coin", row.id, row.symbol, `/sonar/crypto/${row.id}`))),
      ]);
      return;
    }
    const body = await api(`/api/sonar/search${qs({ q })}`);
    const coins = body.coins?.coins || [];
    const exchanges = body.coins?.exchanges || [];
    const categories = body.coins?.categories || [];
    const pools = body.pools?.pools || [];
    if (!coins.length && !exchanges.length && !categories.length && !pools.length) {
      results.replaceChildren(el("p", { class: "sn-state", text: t("noResults") }));
      return;
    }
    setChildren(results, [
      block(t("groupsCoins"), coins.map((row) => hit("coin", row.id, `${row.symbol} ${row.name}`, `/sonar/crypto/${row.id}`))),
      block(t("groupsEx"), exchanges.map((row) => hit("exchange", row.id, row.name, `/sonar/exchanges/${row.id}`))),
      block(t("groupsCat"), categories.map((row) => hit("category", row.id, row.name, `/sonar/categories/${row.id}`))),
      block(t("groupsPool"), pools.map((row) => hit("pool", row.id, row.name, row.url))),
    ]);
  } catch {
    results.replaceChildren(errorBlock(() => runSearch(text, results)));
  }
}

function block(title, nodes) {
  const clean = nodes.filter(Boolean);
  if (!clean.length) return null;
  return el("section", {}, [el("h3", { text: title }), el("ul", { class: "sn-hits" }, clean)]);
}

function hit(kind, id, label, href) {
  if (!label) return null;
  const external = typeof href === "string" && href.startsWith("http");
  return el("li", {}, el("a", {
    href: external ? href : `${parseRoute().prefix}${href}`,
    rel: external ? "noreferrer" : null,
    onclick: async (event) => {
      if (external) return;
      event.preventDefault();
      await remember({ kind, id, label, href });
      document.getElementById("sn-search")?.close?.();
      go(href);
    },
    text: label,
  }));
}
