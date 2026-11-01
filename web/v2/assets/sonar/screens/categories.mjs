import { api, qs } from "../api.mjs";
import { compact, plain, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { paintRanking } from "../rows.mjs";
import { snapshot, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, pctNode, skeleton, sourceLine } from "../ui.mjs";

export async function mount(host, ctx) {
  host.replaceChildren(skeleton(8));
  if (ctx.route.id) return detail(host, ctx);
  return directory(host, ctx);
}

async function directory(host, ctx) {
  try {
    const body = await api(`/api/sonar/categories${qs({ vs: snapshot().prefs.vs })}`);
    const rows = (body.rows || []).slice().sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    const table = el("table", { class: "sn-table" });
    table.append(el("thead", {}, el("tr", {}, [t("rank"), t("name"), t("mcap"), t("changeMc"), t("volume"), t("btcDom")].map((label) => el("th", { text: label })))));
    const tbody = el("tbody");
    rows.slice(0, 100).forEach((row, index) => {
      tbody.append(el("tr", {}, [
        el("td", { text: String(index + 1) }),
        el("td", {}, [
          el("span", { class: "sn-stacklogos" }, (row.top3 || []).map((src) => el("img", { src, alt: "", width: "20", height: "20", loading: "lazy", referrerpolicy: "no-referrer" }))),
          el("a", { href: `${ctx.prefix}/sonar/categories/${row.id}`, text: row.name }),
        ]),
        el("td", { text: show(compact(row.marketCap, body.vs)) }),
        el("td", {}, pctNode(row.change24h)),
        el("td", { text: show(compact(row.volume24h, body.vs)) }),
        el("td", { text: row.dominance == null ? t("unavailable") : `${plain(row.dominance, 2)}%` }),
      ]));
    });
    table.append(tbody);
    const pills = el("div", { class: "sn-pills", "data-sn": "cat-pills" }, rows.slice(0, 8).map((row) => el("button", {
      type: "button",
      class: "sn-pill",
      "data-sn-cat": row.id,
      onclick: () => ctx.go(`/sonar/?category=${encodeURIComponent(row.id)}`),
      text: row.name,
    })));
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "categories" }, [
      el("h2", { text: t("categories") }),
      pills,
      el("div", { class: "sn-scroll" }, table),
      el("p", { class: "sn-note", text: t("dominanceNote") }),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => directory(host, ctx)));
  }
}

async function detail(host, ctx) {
  try {
    const body = await api(`/api/sonar/categories/${ctx.route.id}${qs({ vs: snapshot().prefs.vs })}`);
    document.title = `${body.category?.name || ctx.route.id} · ORVUPI Sonar`;
    const changes = (body.rows || []).map((row) => row.ch24h).filter((value) => value != null);
    const mean = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null;
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "category" }, [
      el("button", { type: "button", class: "sn-btn", onclick: () => ctx.go("/sonar/categories/"), text: t("back") }),
      el("h2", { text: body.category?.name || ctx.route.id }),
      el("p", { text: `${t("mcap")} ${show(compact(body.category?.marketCap, body.vs))} · ${t("volume")} ${show(compact(body.category?.volume24h, body.vs))}` }),
      el("p", {}, [t("changeMc"), " ", pctNode(body.category?.change24h)]),
      el("p", { text: mean == null ? t("unavailable") : t("meanNote", { n: changes.length }) }),
      mean == null ? null : el("p", {}, pctNode(mean)),
      (body.rows || []).length ? paintRanking(body.rows, {
        prefix: ctx.prefix,
        period: "24h",
        currency: body.vs,
        columns: snapshot().prefs.columns,
        onStar: (row) => update((data) => {
          const list = data.lists.find((item) => item.id === data.activeList) || data.lists[0];
          if (list && !list.ids.includes(row.id)) list.ids.unshift(row.id);
          return data;
        }),
      }) : emptyBlock(),
      sourceLine(body),
    ]));
  } catch (error) {
    host.replaceChildren(error.status === 404 ? emptyBlock(t("unavailable")) : errorBlock(() => detail(host, ctx)));
  }
}
