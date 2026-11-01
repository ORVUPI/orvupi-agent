import { api, qs } from "../api.mjs";
import { t } from "../i18n.mjs";
import { marketTabs, paintRanking } from "../rows.mjs";
import { activeList, exportJson, importJson, snapshot, uid, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, skeleton } from "../ui.mjs";

export async function mount(host, ctx) {
  const shared = (ctx.route.params.get("ids") || "").split(",").filter((id) => /^[a-z0-9-]{1,80}$/.test(id));
  if (shared.length) {
    await update((data) => {
      const id = uid();
      data.lists.push({ id, name: t("share"), ids: shared });
      data.activeList = id;
      return data;
    });
    ctx.go("/sonar/watchlist/");
    return;
  }
  await paint(host, ctx);
}

async function paint(host, ctx) {
  const data = snapshot();
  const list = activeList();
  host.replaceChildren(skeleton(6));
  let rows = [];
  let meta = null;
  if (list?.ids?.length) {
    try {
      meta = await api(`/api/sonar/markets${qs({ vs: data.prefs.vs, ids: list.ids.join(","), per: 100, page: 1 })}`);
      const byId = new Map((meta.rows || []).map((row) => [row.id, row]));
      rows = list.ids.map((id) => byId.get(id)).filter(Boolean);
    } catch {
      host.replaceChildren(marketTabs("watchlist", ctx.go), errorBlock(() => paint(host, ctx)));
      return;
    }
  }
  const page = el("section", { class: "sn-screen", "data-sn": "watchlist" });
  page.append(marketTabs("watchlist", ctx.go));
  page.append(el("div", { class: "sn-tools" }, [
    el("select", { "data-sn": "lists", onchange: async (event) => { await update((row) => { row.activeList = event.target.value; return row; }); paint(host, ctx); } }, data.lists.map((row) => el("option", { value: row.id, selected: row.id === data.activeList ? true : null, text: row.name }))),
    el("button", { type: "button", class: "sn-btn", "data-sn": "new-list", onclick: () => create(host, ctx), text: t("listNew") }),
    el("button", { type: "button", class: "sn-btn", onclick: () => rename(host, ctx), text: t("rename") }),
    el("button", { type: "button", class: "sn-btn", onclick: () => share(ctx), text: t("share") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "export", onclick: () => download(), text: t("export") }),
    el("label", { class: "sn-btn" }, [t("import"), el("input", { type: "file", accept: "application/json", hidden: true, onchange: (event) => ingest(event, host, ctx) })]),
  ]));
  page.append(el("p", { class: "sn-note", text: t("local") }));
  if (!list?.ids?.length) {
    page.append(emptyBlock(t("emptyWatch")), el("button", { type: "button", class: "sn-btn on", "data-sn": "add-coins", onclick: () => ctx.openSearch(), text: t("addCoins") }));
  } else if (!rows.length) page.append(emptyBlock());
  else {
    page.append(paintRanking(rows, {
      prefix: ctx.prefix,
      period: "24h",
      currency: meta?.vs || data.prefs.vs,
      columns: data.prefs.columns,
      onStar: async (row) => {
        await update((store) => {
          const current = store.lists.find((item) => item.id === store.activeList);
          if (current) current.ids = current.ids.filter((id) => id !== row.id);
          return store;
        });
        paint(host, ctx);
      },
    }));
    page.append(orderButtons(list, host, ctx));
  }
  host.replaceChildren(page);
}

function orderButtons(list, host, ctx) {
  return el("div", { class: "sn-tools" }, list.ids.map((id, index) => el("span", { class: "sn-order" }, [
    el("span", { text: id }),
    el("button", { type: "button", class: "sn-btn", disabled: index === 0, onclick: () => move(index, -1, host, ctx), text: t("up") }),
    el("button", { type: "button", class: "sn-btn", disabled: index === list.ids.length - 1, onclick: () => move(index, 1, host, ctx), text: t("down") }),
  ])));
}

async function move(index, delta, host, ctx) {
  await update((data) => {
    const list = data.lists.find((item) => item.id === data.activeList);
    const next = index + delta;
    if (!list || next < 0 || next >= list.ids.length) return data;
    const [id] = list.ids.splice(index, 1);
    list.ids.splice(next, 0, id);
    return data;
  });
  paint(host, ctx);
}

async function create(host, ctx) {
  const name = window.prompt(t("namePh"), "");
  if (!name) return;
  await update((data) => {
    const id = uid();
    data.lists.push({ id, name: name.slice(0, 60), ids: [] });
    data.activeList = id;
    return data;
  });
  paint(host, ctx);
}

async function rename(host, ctx) {
  const name = window.prompt(t("namePh"), activeList()?.name || "");
  if (!name) return;
  await update((data) => {
    const list = data.lists.find((item) => item.id === data.activeList);
    if (list) list.name = name.slice(0, 60);
    return data;
  });
  paint(host, ctx);
}

async function share(ctx) {
  const ids = activeList()?.ids || [];
  const url = `${location.origin}${ctx.prefix}/sonar/watchlist/?ids=${encodeURIComponent(ids.join(","))}`;
  try { await navigator.clipboard.writeText(url); } catch { /* la URL queda en la barra si el usuario la abre */ }
}

function download() {
  const blob = new Blob([exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "orvupi-sonar-watchlist.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function ingest(event, host, ctx) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importJson(await file.text());
    paint(host, ctx);
  } catch {
    host.append(el("p", { class: "sn-state", text: t("badFile") }));
  }
}
