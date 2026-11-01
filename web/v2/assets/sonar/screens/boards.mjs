import { api, qs } from "../api.mjs";
import { compact, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { coverageNote, marketTabs } from "../rows.mjs";
import { snapshot } from "../store.mjs";
import { el, emptyBlock, errorBlock, logo, pagedBlock, pctNode, skeleton, sourceLine } from "../ui.mjs";

export async function mountMovers(host, ctx) {
  const period = ctx.route.params.get("period") || "24h";
  host.replaceChildren(skeleton(8));
  try {
    const body = await api(`/api/sonar/movers${qs({ vs: snapshot().prefs.vs, period, minVol: ctx.route.params.get("minVol") || 50000 })}`);
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "movers" }, [
      el("div", { class: "sn-tabs" }, ["1h", "24h", "7d"].map((id) => el("button", { type: "button", class: "sn-tab", "data-sn-period": id, "aria-selected": period === id ? "true" : "false", onclick: () => ctx.go(`/sonar/movers/?period=${id}`), text: t(id === "1h" ? "p1h" : id === "7d" ? "p7d" : "p24h") }))),
      el("div", { class: "sn-split-cols" }, [
        columns(t("gainers"), body.gainers, period, ctx, body.vs, "gainers"),
        columns(t("losers"), body.losers, period, ctx, body.vs, "losers"),
      ]),
      el("p", { class: "sn-note", text: coverageNote(body) }),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountMovers(host, ctx)));
  }
}

function columns(title, rows, period, ctx, vs, kind) {
  const key = period === "1h" ? "ch1h" : period === "7d" ? "ch7d" : "ch24h";
  const list = rows || [];
  const box = el("section", { class: "sn-col", "data-sn": kind });
  const state = { page: 1, per: 10, paint() {} };
  state.paint = () => {
    box.replaceChildren(
      el("h2", { text: title }),
      list.length ? pagedBlock(list, state, [10, 20], (slice) => {
        const ol = el("ol", { class: "sn-mover" });
        for (const row of slice) ol.append(el("li", {}, [logo(row), el("a", { href: `${ctx.prefix}/sonar/crypto/${row.id}`, text: row.symbol }), pctNode(row[key]), el("small", { text: show(compact(row.price, vs)) })]));
        return ol;
      }) : emptyBlock(),
    );
  };
  state.paint();
  return box;
}

export async function mountTrending(host, ctx) {
  host.replaceChildren(marketTabs("trending", ctx.go), skeleton(8));
  try {
    const body = await api("/api/sonar/trending");
    const mode = ctx.route.params.get("mode") || "search";
    const searches = body.searches?.coins || [];
    const pools = body.pools?.pools || [];
    const source = mode === "chain" ? pools : searches;
    const state = { page: 1, per: 10, paint() {} };
    state.paint = () => {
      host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "trending" }, [
        marketTabs("trending", ctx.go),
        el("div", { class: "sn-tabs" }, [
          el("button", { type: "button", class: "sn-tab", "aria-selected": mode !== "chain" ? "true" : "false", "data-sn": "trend-search", onclick: () => ctx.go("/sonar/trending/?mode=search"), text: t("searched") }),
          el("button", { type: "button", class: "sn-tab", "aria-selected": mode === "chain" ? "true" : "false", "data-sn": "trend-chain", onclick: () => ctx.go("/sonar/trending/?mode=chain"), text: t("onchain") }),
        ]),
        el("p", { class: "sn-note", text: mode === "chain" ? t("chainNote") : t("searchCg") }),
        source.length ? pagedBlock(source, state, [10, 20], (slice, view) => {
          const list = el("ol", { class: "sn-mover", "data-sn": "trending-list" });
          slice.forEach((row, index) => {
            const rank = (view.page - 1) * view.per + index;
            const href = row.id && mode !== "chain" ? `${ctx.prefix}/sonar/crypto/${row.id}` : row.url || `${ctx.prefix}/sonar/trending/?mode=chain`;
            list.append(el("li", {}, [
              rank < 3 ? el("span", { class: "sn-fire", "aria-hidden": "true", text: "🐙" }) : el("span", { text: String(rank + 1) }),
              logo(row),
              el("a", { href, rel: row.url ? "noreferrer" : null, text: row.symbol || row.name || t("unavailable") }),
              pctNode(row.ch24h),
            ]));
          });
          return list;
        }) : emptyBlock(),
        sourceLine(mode === "chain" ? body.pools : body.searches),
      ]));
    };
    state.paint();
  } catch {
    host.replaceChildren(errorBlock(() => mountTrending(host, ctx)));
  }
}

export async function mountNew(host, ctx) {
  host.replaceChildren(skeleton(8));
  try {
    const body = await api("/api/sonar/new");
    const pools = body.pools || [];
    const state = { page: 1, per: 10, paint() {} };
    state.paint = () => {
      host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "new" }, [
        el("h2", { text: t("fresh") }),
        el("p", { class: "sn-note", text: t("newNote") }),
        pools.length ? pagedBlock(pools, state, [10, 20], (slice) => {
          const list = el("ol", { class: "sn-mover" });
          for (const row of slice) {
            list.append(el("li", {}, [
              logo(row),
              row.url ? el("a", { href: row.url, rel: "noreferrer", text: row.name || row.baseSymbol || t("pool") }) : el("span", { text: row.name || t("unavailable") }),
              el("span", { text: show(compact(row.price, "usd")) }),
              el("small", { text: row.network || "" }),
              el("small", { text: row.createdAt || t("unavailable") }),
            ]));
          }
          return list;
        }) : emptyBlock(),
        sourceLine(body),
      ]));
    };
    state.paint();
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
