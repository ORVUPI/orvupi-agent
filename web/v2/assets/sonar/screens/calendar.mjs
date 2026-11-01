import { api, qs } from "../api.mjs";
import { compact, plain, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { el, emptyBlock, errorBlock, skeleton, sourceLine } from "../ui.mjs";

export async function mountCalendar(host, ctx) {
  host.replaceChildren(skeleton(8));
  const kind = ctx.route.params.get("kind") || "";
  try {
    const body = await api(`/api/sonar/calendar${qs({ kind })}`);
    const kinds = [...new Set((body.rows || []).map((row) => row.kind).filter(Boolean))].slice(0, 12);
    const table = tableOf(body.rows || [], ctx);
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "calendar" }, [
      el("h2", { text: t("calendar") }),
      el("div", { class: "sn-pills" }, [el("button", { type: "button", class: kind ? "sn-pill" : "sn-pill on", onclick: () => ctx.go("/sonar/calendar/"), text: t("allEx") }), ...kinds.map((id) => el("button", { type: "button", class: kind === id ? "sn-pill on" : "sn-pill", "data-sn-kind": id, onclick: () => ctx.go(`/sonar/calendar/?kind=${encodeURIComponent(id)}`), text: kindLabel(id) }))]),
      (body.rows || []).length ? el("div", { class: "sn-scroll" }, table) : emptyBlock(),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountCalendar(host, ctx)));
  }
}

function kindLabel(value) {
  const bag = t("kind");
  if (bag && typeof bag === "object" && value && bag[value]) return bag[value];
  return t("event");
}

function tableOf(rows, ctx) {
  const table = el("table", { class: "sn-table" });
  table.append(el("thead", {}, el("tr", {}, [t("date"), t("event"), t("related")].map((label) => el("th", { text: label })))));
  const body = el("tbody");
  for (const row of rows.slice(0, 80)) {
    const asset = row.coinId ? el("a", { href: `${ctx.prefix}/sonar/crypto/${row.coinId}`, text: row.symbol || row.name || row.coinId }) : el("span", { text: row.symbol || t("unavailable") });
    body.append(el("tr", {}, [
      el("td", { text: row.date }),
      el("td", {}, [el("strong", { text: kindLabel(row.kind) }), el("p", { text: row.title })]),
      el("td", {}, asset),
    ]));
  }
  table.append(body);
  return table;
}

export async function mountUnlocks(host, ctx) {
  host.replaceChildren(skeleton(8));
  try {
    const body = await api("/api/sonar/unlocks");
    const table = el("table", { class: "sn-table" });
    table.append(el("thead", {}, el("tr", {}, [t("date"), t("name"), t("amount"), t("pct"), t("value"), t("basis")].map((label) => el("th", { text: label })))));
    const tbody = el("tbody");
    for (const row of (body.rows || []).slice(0, 80)) {
      tbody.append(el("tr", {}, [
        el("td", { text: row.date || t("unavailable") }),
        el("td", {}, row.coinId ? el("a", { href: `${ctx.prefix}/sonar/crypto/${row.coinId}`, text: `${row.symbol || ""} ${row.name || ""}` }) : (row.symbol || t("unavailable"))),
        el("td", { text: show(plain(row.amount, 2)) }),
        el("td", { text: row.pctCirc == null ? t("unavailable") : `${plain(row.pctCirc, 3)}%` }),
        el("td", { text: show(compact(row.valueUsd, "usd")) }),
        el("td", { text: (row.basis || []).join(", ") || t("unavailable") }),
      ]));
    }
    table.append(tbody);
    host.replaceChildren(el("section", { class: "sn-screen", "data-sn": "unlocks" }, [
      el("h2", { text: t("unlocks") }),
      (body.rows || []).length ? el("div", { class: "sn-scroll" }, table) : emptyBlock(),
      sourceLine(body),
    ]));
  } catch {
    host.replaceChildren(errorBlock(() => mountUnlocks(host, ctx)));
  }
}
