import { api, qs } from "../api.mjs";
import { compact, plain, show } from "../format.mjs";
import { categoryName, t } from "../i18n.mjs";
import { paintRanking } from "../rows.mjs";
import { snapshot, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, pagedBlock, pctNode, skeleton, sourceLine } from "../ui.mjs";

export async function mount(host, ctx) {
  host.replaceChildren(skeleton(8));
  if (ctx.route.id) return detail(host, ctx);
  return directory(host, ctx);
}

async function directory(host, ctx) {
  try {
    const body = await api(`/api/sonar/categories${qs({ vs: snapshot().prefs.vs })}`);
    const rows = (body.rows || []).slice().sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    const pills = el("div", { class: "sn-pills", "data-sn": "cat-pills" }, rows.slice(0, 8).map((row) => el("button", {
      type: "button",
      class: "sn-pill",
      "data-sn-cat": row.id,
      onclick: () => ctx.go(`/sonar/?category=${encodeURIComponent(row.id)}`),
      text: categoryName(row.name),
    })));
    const state = { page: 1, per: 20, paint() {} };
    state.paint = () => {
      host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "categories" }, [
        el("h2", { text: t("categories") }),
        pills,
        rows.length ? pagedBlock(rows, state, [20, 50, 100], (slice, view) => {
          const table = el("table", { class: "sn-table" });
          table.append(el("thead", {}, el("tr", {}, [t("rank"), t("name"), t("mcap"), t("changeMc"), t("volume"), t("catShare")].map((label) => el("th", { text: label })))));
          const tbody = el("tbody");
          slice.forEach((row, index) => {
            tbody.append(el("tr", {}, [
              el("td", { text: String((view.page - 1) * view.per + index + 1) }),
              el("td", {}, [
                el("span", { class: "sn-stacklogos" }, (row.top3 || []).map((src) => el("img", { src, alt: "", width: "20", height: "20", loading: "lazy", referrerpolicy: "no-referrer" }))),
                el("a", { href: `${ctx.prefix}/sonar/categories/${row.id}`, text: categoryName(row.name) }),
              ]),
              el("td", { text: show(compact(row.marketCap, body.vs)) }),
              el("td", {}, pctNode(row.change24h)),
              el("td", { text: show(compact(row.volume24h, body.vs)) }),
              el("td", { text: row.dominance == null ? t("unavailable") : `${plain(row.dominance, 2)}%` }),
            ]));
          });
          table.append(tbody);
          return el("div", { class: "sn-scroll" }, table);
        }) : emptyBlock(),
        el("p", { class: "sn-note", text: t("dominanceNote") }),
        sourceLine(body),
      ]));
    };
    state.paint();
  } catch {
    host.replaceChildren(errorBlock(() => directory(host, ctx)));
  }
}

function sumOf(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value != null);
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0);
}

async function detail(host, ctx) {
  try {
    const body = await api(`/api/sonar/categories/${ctx.route.id}${qs({ vs: snapshot().prefs.vs, per: 250, page: 1 })}`);
    const rows = (body.rows || []).map((row, index) => ({ ...row, rank: row.rank ?? index + 1 }));
    const rawName = body.category?.name || ctx.route.id.replace(/-/g, " ");
    const name = categoryName(rawName);
    document.title = `${name} · ORVUPI Sonar`;
    const marketCap = body.category?.marketCap ?? sumOf(rows, "marketCap");
    const volume = body.category?.volume24h ?? sumOf(rows, "volume24h");
    const weighted = rows.filter((row) => row.ch24h != null && row.marketCap);
    const change = body.category?.change24h ?? (weighted.length ? weighted.reduce((sum, row) => sum + row.ch24h * row.marketCap, 0) / weighted.reduce((sum, row) => sum + row.marketCap, 0) : null);
    const ranked = rows.filter((row) => row.ch24h != null);
    const gainers = ranked.slice().sort((a, b) => b.ch24h - a.ch24h).slice(0, 5);
    const losers = ranked.slice().sort((a, b) => a.ch24h - b.ch24h).slice(0, 5);
    const state = { page: 1, per: 20, paint() {} };
    state.paint = () => {
      host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "category" }, [
        el("button", { type: "button", class: "sn-btn", onclick: () => ctx.go("/sonar/categories/"), text: t("back") }),
        el("h2", { text: name }),
        el("div", { class: "sn-kpis" }, [
          el("article", { class: "sn-kpi" }, [el("span", { text: t("mcap") }), el("strong", { text: show(compact(marketCap, body.vs)) })]),
          el("article", { class: "sn-kpi" }, [el("span", { text: t("volume") }), el("strong", { text: show(compact(volume, body.vs)) })]),
          el("article", { class: "sn-kpi" }, [el("span", { text: t("h24") }), change == null ? el("strong", { text: t("unavailable") }) : pctNode(change)]),
        ]),
        el("div", { class: "sn-overview" }, [
          moverList(t("gainers"), gainers, ctx),
          moverList(t("losers"), losers, ctx),
        ]),
        rows.length ? pagedBlock(rows, state, [20, 50, 100], (slice, view) => paintRanking(slice, {
          prefix: ctx.prefix,
          period: "24h",
          currency: body.vs,
          columns: snapshot().prefs.columns,
          rankFrom: (view.page - 1) * view.per + 1,
          onStar: (row) => update((data) => {
            const list = data.lists.find((item) => item.id === data.activeList) || data.lists[0];
            if (list && !list.ids.includes(row.id)) list.ids.unshift(row.id);
            return data;
          }),
        })) : emptyBlock(),
        sourceLine(body),
      ]));
    };
    state.paint();
  } catch (error) {
    host.replaceChildren(error.status === 404 ? emptyBlock(t("missingCoin")) : errorBlock(() => detail(host, ctx)));
  }
}

function moverList(title, rows, ctx) {
  const list = el("ol", { class: "sn-mover" });
  for (const row of rows) list.append(el("li", {}, [el("a", { href: `${ctx.prefix}/sonar/crypto/${row.id}`, text: row.symbol || row.name }), pctNode(row.ch24h)]));
  return el("article", { class: "sn-hero" }, [el("h3", { text: title }), list.childNodes.length ? list : emptyBlock()]);
}
