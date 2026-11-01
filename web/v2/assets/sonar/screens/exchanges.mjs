import { api, qs } from "../api.mjs";
import { compact, plain, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { snapshot } from "../store.mjs";
import { el, emptyBlock, errorBlock, logo, skeleton, sourceLine } from "../ui.mjs";

export async function mount(host, ctx) {
  host.replaceChildren(skeleton(8));
  if (ctx.route.id) return detail(host, ctx);
  return list(host, ctx, ctx.route.params.get("type") || "all");
}

async function list(host, ctx, type) {
  try {
    const body = await api(`/api/sonar/exchanges${qs({ vs: snapshot().prefs.vs, type })}`);
    const types = [["all", t("allEx")], ["cex", t("cex")], ["dex", t("dex")], ["derivatives", t("deriv")]];
    const table = el("table", { class: "sn-table" });
    const headers = type === "derivatives"
      ? [t("rank"), t("name"), t("volume"), t("oi"), t("perps"), t("futures")]
      : [t("rank"), t("name"), t("volume"), t("trust"), t("country"), t("year")];
    table.append(el("thead", {}, el("tr", {}, headers.map((label) => el("th", { text: label })))));
    const tbody = el("tbody");
    (body.rows || []).forEach((row, index) => {
      const name = el("a", { href: `${ctx.prefix}/sonar/exchanges/${row.id || ""}`, text: row.name || t("unavailable") });
      if (type === "derivatives") {
        tbody.append(el("tr", {}, [
          el("td", { text: String(index + 1) }),
          el("td", {}, [logo(row), name]),
          el("td", { text: show(compact(row.volume24h, body.vs)) }),
          el("td", { text: show(compact(row.openInterest, body.vs)) }),
          el("td", { text: show(plain(row.perpetual, 0)) }),
          el("td", { text: show(plain(row.futures, 0)) }),
        ]));
      } else {
        tbody.append(el("tr", {}, [
          el("td", { text: String(index + 1) }),
          el("td", {}, [logo(row), name, el("small", { text: row.centralized == null ? t("unknownKind") : row.centralized ? t("cex") : t("dex") })]),
          el("td", { text: show(compact(row.volume24h, body.vs)) }),
          el("td", { text: row.trustScore == null ? t("unavailable") : String(row.trustScore) }),
          el("td", { text: row.country || t("unavailable") }),
          el("td", { text: row.year == null ? t("unavailable") : String(row.year) }),
        ]));
      }
    });
    table.append(tbody);
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "exchanges" }, [
      el("div", { class: "sn-tabs" }, types.map(([id, label]) => el("button", { type: "button", class: "sn-tab", "aria-selected": type === id ? "true" : "false", "data-sn-ex": id, onclick: () => ctx.go(`/sonar/exchanges/?type=${id}`), text: label }))),
      (body.rows || []).length ? el("div", { class: "sn-scroll" }, table) : emptyBlock(),
      el("p", { class: "sn-note", text: t("classNote") }),
      el("p", { class: "sn-note", text: t("reserves") }),
      el("p", { class: "sn-note", text: t("shareList") }),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => list(host, ctx, type)));
  }
}

async function detail(host, ctx) {
  try {
    const vs = snapshot().prefs.vs;
    const [row, tickers, volume] = await Promise.all([
      api(`/api/sonar/exchanges/${ctx.route.id}${qs({ vs })}`),
      api(`/api/sonar/exchanges/${ctx.route.id}/tickers${qs({ vs })}`).catch(() => null),
      api(`/api/sonar/exchanges/${ctx.route.id}/volume?days=7`).catch(() => null),
    ]);
    document.title = `${row.name} · ORVUPI Sonar`;
    const markets = el("table", { class: "sn-table" });
    markets.append(el("thead", {}, el("tr", {}, [t("pair"), t("price"), t("spread"), t("depth"), t("volume"), t("trust")].map((label) => el("th", { text: label })))));
    const body = el("tbody");
    for (const ticker of tickers?.rows || []) {
      body.append(el("tr", {}, [
        el("td", {}, ticker.coinId ? el("a", { href: `${ctx.prefix}/sonar/crypto/${ticker.coinId}`, text: `${ticker.base || ""}/${ticker.target || ""}` }) : `${ticker.base || ""}/${ticker.target || ""}`),
        el("td", { text: show(compact(ticker.price, vs)) }),
        el("td", { text: ticker.spreadPct == null ? t("unavailable") : `${plain(ticker.spreadPct, 3)}%` }),
        el("td", { text: ticker.depthUp2 == null ? t("unavailable") : show(compact(ticker.depthUp2, vs)) }),
        el("td", { text: show(compact(ticker.volume24h, vs)) }),
        el("td", { text: ticker.trust || t("unavailable") }),
      ]));
    }
    markets.append(body);
    host.replaceChildren(el("article", { class: "sn-screen", "data-sn": "exchange" }, [
      el("button", { type: "button", class: "sn-btn", onclick: () => ctx.go("/sonar/exchanges/"), text: t("back") }),
      el("h2", {}, [logo(row), row.name]),
      el("p", { text: `${t("volume")} ${show(compact(row.volume24h, vs))}` }),
      el("p", { text: `${t("coins")} ${show(plain(row.coins, 0))} · ${t("pairs")} ${show(plain(row.pairs, 0))}` }),
      el("p", { text: `${t("country")} ${row.country || t("unavailable")} · ${t("year")} ${row.year ?? t("unavailable")}` }),
      el("p", { text: `${t("trust")} ${row.trustScore == null ? t("unavailable") : row.trustScore}` }),
      row.url ? el("a", { href: row.url, rel: "noreferrer", text: t("visit") }) : null,
      row.description ? el("p", { text: row.description }) : el("p", { text: t("noDesc") }),
      volume?.points?.length ? el("p", { class: "sn-note", text: `${t("vol7")}: ${volume.points.length}` }) : el("p", { text: t("unavailable") }),
      (tickers?.rows || []).length ? el("div", { class: "sn-scroll" }, markets) : emptyBlock(),
      el("p", { class: "sn-note", text: t("liq") }),
      sourceLine(row),
    ]));
  } catch (error) {
    host.replaceChildren(error.status === 404 ? emptyBlock(t("unavailable")) : errorBlock(() => detail(host, ctx)));
  }
}
