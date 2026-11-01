import { api, qs } from "../api.mjs";
import { compact, pct, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { marketTabs } from "../rows.mjs";
import { snapshot } from "../store.mjs";
import { el, emptyBlock, errorBlock, logo, pctNode, skeleton, sourceLine } from "../ui.mjs";

export async function mountMovers(host, ctx) {
  const period = ctx.route.params.get("period") || "24h";
  host.replaceChildren(skeleton(8));
  try {
    const body = await api(`/api/sonar/movers${qs({ vs: snapshot().prefs.vs, period, minVol: ctx.route.params.get("minVol") || 50000 })}`);
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "movers" }, [
      el("div", { class: "sn-tabs" }, ["1h", "24h", "7d"].map((id) => el("button", { type: "button", class: "sn-tab", "data-sn-period": id, "aria-selected": period === id ? "true" : "false", onclick: () => ctx.go(`/sonar/movers/?period=${id}`), text: t(id === "1h" ? "p1h" : id === "7d" ? "p7d" : "p24h") }))),
      columns(t("gainers"), body.gainers, period, ctx, body.vs),
      columns(t("losers"), body.losers, period, ctx, body.vs),
      el("p", { class: "sn-note", text: body.note || t("universe") }),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountMovers(host, ctx)));
  }
}

function columns(title, rows, period, ctx, vs) {
  const key = period === "1h" ? "ch1h" : period === "7d" ? "ch7d" : "ch24h";
  const list = el("ol", { class: "sn-mover" });
  for (const row of rows || []) {
    list.append(el("li", {}, [logo(row), el("a", { href: `${ctx.prefix}/sonar/crypto/${row.id}`, text: row.symbol }), pctNode(row[key]), el("small", { text: show(compact(row.price, vs)) })]));
  }
  return el("article", { class: "sn-hero" }, [el("h2", { text: title }), list.childNodes.length ? list : emptyBlock()]);
}

export async function mountTrending(host, ctx) {
  host.replaceChildren(marketTabs("trending", ctx.go), skeleton(8));
  try {
    const body = await api("/api/sonar/trending");
    const mode = ctx.route.params.get("mode") || "search";
    const searches = body.searches?.coins || [];
    const pools = body.pools?.pools || [];
    const list = el("ol", { class: "sn-mover", "data-sn": "trending-list" });
    const source = mode === "chain" ? pools : searches;
    source.forEach((row, index) => {
      const href = row.id && mode !== "chain" ? `${ctx.prefix}/sonar/crypto/${row.id}` : row.url || `${ctx.prefix}/sonar/trending/?mode=chain`;
      list.append(el("li", {}, [
        index < 3 ? el("span", { class: "sn-fire", "aria-hidden": "true", text: "🐙" }) : el("span", { text: String(index + 1) }),
        logo(row),
        el("a", { href, rel: row.url ? "noreferrer" : null, text: row.symbol || row.name || t("unavailable") }),
        pctNode(row.ch24h),
      ]));
    });
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "trending" }, [
      marketTabs("trending", ctx.go),
      el("div", { class: "sn-tabs" }, [
        el("button", { type: "button", class: "sn-tab", "aria-selected": mode !== "chain" ? "true" : "false", "data-sn": "trend-search", onclick: () => ctx.go("/sonar/trending/?mode=search"), text: t("searched") }),
        el("button", { type: "button", class: "sn-tab", "aria-selected": mode === "chain" ? "true" : "false", "data-sn": "trend-chain", onclick: () => ctx.go("/sonar/trending/?mode=chain"), text: t("onchain") }),
      ]),
      el("p", { class: "sn-note", text: mode === "chain" ? t("chainNote") : t("searchCg") }),
      source.length ? list : emptyBlock(),
      sourceLine(mode === "chain" ? body.pools : body.searches),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountTrending(host, ctx)));
  }
}

export async function mountNew(host, ctx) {
  host.replaceChildren(skeleton(8));
  try {
    const body = await api("/api/sonar/new");
    const list = el("ol", { class: "sn-mover" });
    for (const row of body.pools || []) {
      list.append(el("li", {}, [
        logo(row),
        row.url ? el("a", { href: row.url, rel: "noreferrer", text: row.name || row.baseSymbol || t("pool") }) : el("span", { text: row.name || t("unavailable") }),
        el("span", { text: show(compact(row.price, "usd")) }),
        el("small", { text: row.network || "" }),
        el("small", { text: row.createdAt || t("unavailable") }),
      ]));
    }
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "new" }, [
      el("h2", { text: t("fresh") }),
      el("p", { class: "sn-note", text: body.note || t("newNote") }),
      (body.pools || []).length ? list : emptyBlock(),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountNew(host, ctx)));
  }
}

export async function mountNews(host) {
  host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "news" }, [
    el("h2", { text: t("news") }),
    el("p", { class: "sn-state", text: t("newsOff") }),
  ]));
}

void pct;
