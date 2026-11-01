import { api, qs } from "../api.mjs";
import { compact, day, money, plain, show } from "../format.mjs";
import { t } from "../i18n.mjs";
import { snapshot, uid, update } from "../store.mjs";
import { el, emptyBlock, errorBlock, skeleton } from "../ui.mjs";
import { marketTabs } from "../rows.mjs";

export function positionOf(txs, price) {
  const ordered = txs.slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  let qty = 0;
  let cost = 0;
  let realized = 0;
  let incomplete = false;
  for (const tx of ordered) {
    const q = Number(tx.qty);
    const p = Number(tx.price);
    const fee = Number(tx.fee) || 0;
    if (!Number.isFinite(q) || q <= 0) continue;
    if (tx.type === "buy" || tx.type === "deposit") {
      if (!Number.isFinite(p)) { incomplete = true; continue; }
      qty += q;
      cost += q * p + fee;
    } else if (tx.type === "sell") {
      if (!(qty > 0) || !Number.isFinite(p)) { incomplete = true; continue; }
      const used = Math.min(q, qty);
      const avg = cost / qty;
      realized += (p - avg) * used - fee;
      cost -= avg * used;
      qty -= used;
    } else if (tx.type === "withdraw" || tx.type === "transfer") {
      if (!(qty > 0)) { incomplete = true; continue; }
      const used = Math.min(q, qty);
      const avg = cost / qty;
      cost -= avg * used;
      qty -= used;
    }
  }
  const avg = qty > 0 ? cost / qty : null;
  const value = qty > 0 && Number.isFinite(price) ? qty * price : qty > 0 ? null : 0;
  const unrealized = value != null && avg != null ? (price - avg) * qty : null;
  return { qty, avg, cost, realized, value, unrealized, incomplete };
}

export async function mount(host, ctx) {
  host.replaceChildren(skeleton(6));
  await paint(host, ctx);
}

async function paint(host, ctx) {
  const data = snapshot();
  const vs = data.prefs.vs;
  const txs = data.txs.filter((row) => row.portfolioId === data.activePortfolio);
  const ids = [...new Set(txs.map((row) => row.coinId).filter(Boolean))];
  let quotes = {};
  let quoteError = false;
  if (ids.length) {
    try {
      const body = await api(`/api/sonar/quotes${qs({ vs, ids: ids.join(",") })}`);
      quotes = body.quotes || {};
    } catch {
      quoteError = true;
    }
  }
  const grouped = new Map();
  for (const tx of txs) {
    if (!grouped.has(tx.coinId)) grouped.set(tx.coinId, []);
    grouped.get(tx.coinId).push(tx);
  }
  let total = 0;
  let totalKnown = true;
  let unrealized = 0;
  let realized = 0;
  const slices = [];
  const rows = [];
  for (const [id, list] of grouped) {
    const price = quotes[id]?.price ?? null;
    const pos = positionOf(list, price);
    realized += pos.realized;
    if (pos.value == null) totalKnown = false;
    else total += pos.value;
    if (pos.unrealized != null) unrealized += pos.unrealized;
    if (pos.qty > 0) slices.push({ id, symbol: list[0].symbol || id, value: pos.value });
    rows.push({ id, symbol: list[0].symbol || id, pos, txs: list });
  }
  const page = el("section", { class: "sn-screen", "data-sn": "portfolio" });
  page.append(marketTabs("portfolio", ctx.go));
  page.append(el("div", { class: "sn-tools" }, [
    el("select", { onchange: async (event) => { await update((row) => { row.activePortfolio = event.target.value; return row; }); paint(host, ctx); } }, data.portfolios.map((row) => el("option", { value: row.id, selected: row.id === data.activePortfolio ? true : null, text: row.name }))),
    el("button", { type: "button", class: "sn-btn", onclick: () => createPort(host, ctx), text: t("portfolioNew") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "export", onclick: () => download(), text: t("export") }),
    el("label", { class: "sn-btn" }, [t("import"), el("input", { type: "file", accept: "application/json", hidden: true, onchange: (event) => ingest(event, host, ctx) })]),
  ]));
  page.append(el("div", { class: "sn-kpis" }, [
    kpi(t("value"), totalKnown ? show(money(total, vs)) : t("unavailable")),
    kpi(t("unrealized"), rows.every((row) => row.pos.unrealized != null || row.pos.qty === 0) ? show(money(unrealized, vs)) : t("unavailable")),
    kpi(t("realized"), show(money(realized, vs))),
  ]));
  if (quoteError) page.append(errorBlock(() => paint(host, ctx)));
  page.append(el("p", { class: "sn-note", text: t("local") }));
  page.append(allocation(slices, total));
  page.append(form(host, ctx, vs));
  if (!txs.length) page.append(emptyBlock(t("noTx")));
  else page.append(txTable(txs, vs, host, ctx));
  page.append(historyButton(rows, vs));
  host.replaceChildren(page);
}

function kpi(label, value) {
  return el("article", { class: "sn-kpi" }, [el("span", { text: label }), el("strong", { text: value })]);
}

function allocation(slices, total) {
  if (!slices.length || !(total > 0)) return el("p", { class: "sn-note", text: t("allocation") });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sn-donut");
  svg.setAttribute("viewBox", "0 0 36 36");
  let cursor = 0;
  const palette = ["#ff3070", "#7dcea0", "#9ecbff", "#ffd27a", "#d2b4ff", "#f0a0b0"];
  slices.forEach((slice, index) => {
    const portion = ((slice.value || 0) / total) * 100;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "18");
    circle.setAttribute("cy", "18");
    circle.setAttribute("r", "15.9");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", palette[index % palette.length]);
    circle.setAttribute("stroke-width", "3.2");
    circle.setAttribute("stroke-dasharray", `${portion} ${100 - portion}`);
    circle.setAttribute("stroke-dashoffset", String(25 - cursor));
    svg.append(circle);
    cursor += portion;
  });
  return el("section", { class: "sn-box", "data-sn": "allocation" }, [
    el("h2", { text: t("allocation") }),
    svg,
    el("ul", {}, slices.map((slice) => el("li", { text: `${slice.symbol} ${total ? plain(((slice.value || 0) / total) * 100, 1) : t("unavailable")}%` }))),
  ]);
}

function form(host, ctx, vs) {
  const node = el("form", { class: "sn-form", "data-sn": "tx-form", onsubmit: async (event) => {
    event.preventDefault();
    const data = new FormData(node);
    const coinId = String(data.get("coinId") || "").trim();
    const qty = Number(data.get("qty"));
    const rawPrice = String(data.get("price") ?? "").trim();
    const price = rawPrice === "" ? NaN : Number(rawPrice);
    const at = String(data.get("at") || "");
    if (!/^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/.test(coinId) || !(qty > 0) || !Number.isFinite(price) || !at) {
      node.querySelector("[data-sn=tx-error]").hidden = false;
      return;
    }
    await update((row) => {
      row.txs.push({ id: uid(), portfolioId: row.activePortfolio, type: data.get("type"), coinId, symbol: String(data.get("symbol") || coinId).toUpperCase(), qty, price, fee: Number(data.get("fee")) || 0, note: String(data.get("note") || "").slice(0, 200), at });
      return row;
    });
    paint(host, ctx);
  } });
  node.append(
    el("h2", { text: t("addTx") }),
    el("p", { hidden: true, "data-sn": "tx-error", class: "sn-state", text: t("need") }),
    selectType(),
    coinPicker(),
    labeled("qty", t("qty"), "number"),
    labeled("price", t("price"), "number"),
    labeled("fee", t("fee"), "number"),
    labeled("at", t("date"), "date", new Date().toISOString().slice(0, 10)),
    labeled("note", t("note"), "text"),
    el("button", { type: "button", class: "sn-btn", "data-sn": "fill-price", onclick: () => fill(node), text: t("useNow") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "fill-date", onclick: () => fillDate(node), text: t("useDate") }),
    el("button", { type: "submit", class: "sn-btn on", "data-sn": "save-tx", text: t("save") }),
  );
  return node;
}

function coinPicker() {
  const hidden = el("input", { name: "coinId", type: "hidden" });
  const symbol = el("input", { name: "symbol", type: "hidden" });
  const search = el("input", { type: "search", "data-sn": "coin-pick", placeholder: t("pickCoinPh"), autocomplete: "off" });
  const list = el("div", { class: "sn-hits", "data-sn": "coin-results" });
  let timer = 0;
  search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const q = search.value.trim();
      if (q.length < 2) {
        list.replaceChildren();
        return;
      }
      try {
        const body = await api(`/api/sonar/search${qs({ q })}`);
        const coins = (body.coins?.coins || []).slice(0, 6);
        list.replaceChildren(...coins.map((row) => el("button", {
          type: "button",
          class: "sn-btn",
          onclick: () => {
            hidden.value = row.id;
            symbol.value = row.symbol || "";
            search.value = `${row.symbol || ""} ${row.name || ""}`.trim();
            list.replaceChildren();
          },
          text: `${row.symbol || ""} ${row.name || ""}`.trim(),
        })));
      } catch {
        list.replaceChildren();
      }
    }, 250);
  });
  return el("div", { class: "sn-picker" }, [el("span", { text: t("pickCoin") }), search, hidden, symbol, list]);
}

function selectType() {
  const select = el("select", { name: "type" }, ["buy", "sell", "transfer", "deposit", "withdraw"].map((id) => el("option", { value: id, text: t(id) })));
  return el("label", {}, [t("actions"), select]);
}

function labeled(name, label, type, value = null) {
  return el("label", {}, [label, el("input", { name, type, step: type === "number" ? "any" : null, value })]);
}

async function fill(form) {
  const id = form.coinId.value.trim();
  if (!/^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/.test(id)) return;
  try {
    const body = await api(`/api/sonar/quotes${qs({ vs: snapshot().prefs.vs, ids: id })}`);
    if (body.quotes?.[id]?.price != null) form.price.value = String(body.quotes[id].price);
  } catch { /* el campo se queda vacío */ }
}

async function fillDate(form) {
  const id = form.coinId.value.trim();
  const date = form.at.value;
  if (!/^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  try {
    const from = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
    const body = await api(`/api/sonar/coin/${id}/history${qs({ from, to: from + 86400 })}`);
    const point = (body.points || body.prices || []).find((row) => row[1] != null);
    const err = form.querySelector("[data-sn=tx-error]");
    if (point) form.price.value = String(point[1]);
    else {
      err.hidden = false;
      err.textContent = t("fillMissing");
    }
  } catch {
    const err = form.querySelector("[data-sn=tx-error]");
    err.hidden = false;
    err.textContent = t("fillMissing");
  }
}

function txTable(txs, vs, host, ctx) {
  const table = el("table", { class: "sn-table" });
  table.append(el("thead", {}, el("tr", {}, [t("date"), t("actions"), t("name"), t("qty"), t("price"), t("fee"), ""].map((label) => el("th", { text: label })))));
  const body = el("tbody");
  for (const tx of txs.slice().reverse()) {
    body.append(el("tr", {}, [
      el("td", { text: day(tx.at) || tx.at }),
      el("td", { text: t(tx.type) }),
      el("td", {}, el("a", { href: `/sonar/crypto/${tx.coinId}`, text: tx.symbol || tx.coinId })),
      el("td", { text: show(plain(tx.qty, 6)) }),
      el("td", { text: show(money(tx.price, vs)) }),
      el("td", { text: show(money(tx.fee || 0, vs)) }),
      el("td", {}, el("button", { type: "button", class: "sn-btn", onclick: async () => { await update((row) => { row.txs = row.txs.filter((item) => item.id !== tx.id); return row; }); paint(host, ctx); }, text: t("del") })),
    ]));
  }
  table.append(body);
  return el("div", { class: "sn-scroll" }, table);
}

function historyButton(rows) {
  const box = el("section", { class: "sn-box", "data-sn": "history" }, [
    el("h2", { text: t("history") }),
    el("p", { class: "sn-note", text: t("replay") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "load-history", onclick: () => loadHistory(box, rows), text: t("history") }),
  ]);
  return box;
}

function qtyAsOf(txs, dayKey) {
  const subset = (txs || []).filter((tx) => String(tx.at).slice(0, 10) <= dayKey);
  return positionOf(subset, 0).qty;
}

async function loadHistory(box, rows) {
  const pending = skeleton(4);
  box.append(pending);
  const held = rows.filter((row) => row.pos.qty > 0 || (row.txs || []).length);
  if (!held.length) {
    pending.remove();
    box.append(emptyBlock());
    return;
  }
  try {
    const series = await Promise.all(held.map(async (row) => ({ ...row, chart: await api(`/api/sonar/coin/${row.id}/chart${qs({ vs: snapshot().prefs.vs, days: "30" })}`) })));
    const days = new Map();
    for (const item of series) {
      for (const point of item.chart.points || []) {
        const key = new Date(point[0]).toISOString().slice(0, 10);
        const qty = qtyAsOf(item.txs, key);
        if (!(qty > 0)) continue;
        if (!days.has(key)) days.set(key, { sum: 0, missing: false });
        const bucket = days.get(key);
        if (point[1] == null) bucket.missing = true;
        else bucket.sum += point[1] * qty;
      }
    }
    pending.remove();
    const list = el("ol");
    const entries = [...days.entries()].slice(-14);
    if (!entries.length) {
      box.append(emptyBlock());
      return;
    }
    for (const [key, bucket] of entries) {
      list.append(el("li", { text: `${key}: ${bucket.missing ? t("unavailable") : show(compact(bucket.sum, snapshot().prefs.vs))}` }));
    }
    box.append(list, el("p", { class: "sn-note", text: t("partial") }));
  } catch {
    pending.remove();
    box.append(errorBlock(() => loadHistory(box, rows)));
  }
}

async function createPort(host, ctx) {
  const name = window.prompt(t("namePh"), "");
  if (!name) return;
  await update((row) => {
    const id = uid();
    row.portfolios.push({ id, name: name.slice(0, 60) });
    row.activePortfolio = id;
    return row;
  });
  paint(host, ctx);
}

function download() {
  const blob = new Blob([JSON.stringify({ version: 1, ...snapshot() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "orvupi-sonar.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function ingest(event, host, ctx) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const { importJson } = await import("../store.mjs");
    await importJson(await file.text());
    paint(host, ctx);
  } catch {
    host.append(el("p", { class: "sn-state", text: t("badFile") }));
  }
}
