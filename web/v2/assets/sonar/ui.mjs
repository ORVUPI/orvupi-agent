import { clsPct, pct, show, when } from "./format.mjs";
import { t } from "./i18n.mjs";
import { finiteSeries, priceColor, seriesUp } from "./price-color.mjs";

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") continue;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "text") node.textContent = String(value);
    else if ((key === "href" || key === "src") && !safeUrl(value)) continue;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children || [])) append(node, child);
  return node;
}

function safeUrl(value) {
  const text = String(value || "");
  if (text.startsWith("/") && !text.startsWith("//")) return true;
  if (text.startsWith("#") || text.startsWith("?")) return true;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function append(node, child) {
  if (child == null || child === false) return;
  node.append(child.nodeType ? child : document.createTextNode(String(child)));
}

export function clear(node) {
  node.replaceChildren();
}

export function setChildren(node, children) {
  node.replaceChildren(...[].concat(children).filter((child) => child != null && child !== false));
}

export function skeleton(rows = 8) {
  const box = el("div", { class: "sn-skel", "data-sn": "skeleton", "aria-busy": "true", role: "status" });
  box.append(el("span", { class: "sn-sr", text: t("loading") }));
  for (let index = 0; index < rows; index += 1) box.append(el("span", { "aria-hidden": "true" }));
  return box;
}

export function errorBlock(onRetry) {
  return el("div", { class: "sn-state", "data-sn": "error" }, [
    el("p", { text: t("error") }),
    el("button", { type: "button", class: "sn-btn", "data-sn": "retry", onclick: onRetry, text: t("retry") }),
  ]);
}

export function emptyBlock(text) {
  return el("p", { class: "sn-state", "data-sn": "empty", text: text || t("empty") });
}

export function missing() {
  return el("span", { class: "sn-miss", text: t("unavailable") });
}

export function pctNode(value) {
  const text = pct(value);
  if (text == null) return missing();
  return el("span", { class: clsPct(value), text });
}

export function spark(values) {
  const clean = finiteSeries(values);
  if (clean.length < 2) return el("span", { class: "sn-spark sn-spark-empty", "aria-hidden": "true" });
  const width = 88;
  const height = 28;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const up = seriesUp(clean);
  const points = clean.map((value, index) => {
    const x = (index / (clean.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sn-spark");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-sn-trend", up == null ? "flat" : up ? "up" : "down");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", priceColor(up));
  line.setAttribute("stroke-width", "1.6");
  line.setAttribute("stroke-linejoin", "round");
  line.setAttribute("stroke-linecap", "round");
  svg.append(line);
  return svg;
}

export function sourceLine(payload, extra) {
  if (!payload?.source && !extra) return null;
  const line = el("p", { class: "sn-source", "data-sn": "source" });
  const link = payload?.sourceUrl ? el("a", { href: payload.sourceUrl, rel: "noreferrer", text: payload.source || payload.attribution }) : payload?.source || "";
  line.append(link || "");
  if (payload?.fetchedAt) line.append(` · ${when(payload.fetchedAt)}`);
  if (extra) line.append(` · ${extra}`);
  return line;
}

export function coinLink(row, prefix, child) {
  return el("a", { class: "sn-coinlink", href: `${prefix}/sonar/crypto/${row.id}`, "data-id": row.id }, child || [row.symbol || row.name]);
}

export function logo(row) {
  if (!row?.image) return el("span", { class: "sn-logo sn-logo-empty", "aria-hidden": "true", text: (row?.symbol || "?").slice(0, 1) });
  return el("img", { class: "sn-logo", src: row.image, alt: "", width: "22", height: "22", loading: "lazy", referrerpolicy: "no-referrer" });
}

export function field(label, valueNode) {
  return el("div", { class: "sn-field" }, [el("span", { text: label }), valueNode == null ? missing() : valueNode]);
}

export function textOrMissing(value) {
  return value == null || value === "" ? missing() : document.createTextNode(String(value));
}

export function showText(value) {
  return show(value);
}

/** Números de página con huecos: 1, 2, …, N. Con `more`, no hay última conocida. */
export function pageItems(page, pages, more = false) {
  const current = Math.max(1, Math.floor(Number(page) || 1));
  const last = more ? current + 1 : Math.max(current, Math.floor(Number(pages) || 1));
  const seeds = [1, last, current - 1, current, current + 1];
  const nums = [...new Set(seeds.filter((n) => n >= 1 && n <= last))].sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  if (more) out.push("gap");
  return out;
}

export function slicePage(rows, page, per) {
  const list = Array.isArray(rows) ? rows : [];
  const size = Math.max(1, Math.floor(Number(per) || 1));
  const pages = Math.max(1, Math.ceil(list.length / size) || 1);
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pages);
  const start = (current - 1) * size;
  return { page: current, pages, per: size, total: list.length, rows: list.slice(start, start + size) };
}

function scrollList() {
  document.getElementById("sn-outlet")?.scrollIntoView({ block: "start" });
}

export function pager({ page, pages = 1, more = false, per, sizes = [], onPage, onPer }) {
  const items = pageItems(page, pages, more);
  const canPrev = page > 1;
  const canNext = more || page < pages;
  const jump = (next) => {
    if (next === page || next < 1) return;
    onPage(next);
    scrollList();
  };
  const pagesBox = el("div", { class: "sn-pager-pages" });
  pagesBox.append(el("button", {
    type: "button",
    class: "sn-btn",
    "data-sn": "page-prev",
    "aria-label": t("prev"),
    disabled: canPrev ? null : true,
    onclick: () => { if (canPrev) jump(page - 1); },
    text: "‹",
  }));
  for (const item of items) {
    if (item === "gap") pagesBox.append(el("span", { class: "sn-pager-gap", "aria-hidden": "true", text: "…" }));
    else pagesBox.append(el("button", {
      type: "button",
      class: item === page ? "sn-btn on" : "sn-btn",
      "aria-current": item === page ? "page" : null,
      "aria-label": `${t("page")} ${item}`,
      onclick: () => jump(item),
      text: String(item),
    }));
  }
  pagesBox.append(el("button", {
    type: "button",
    class: "sn-btn",
    "data-sn": "page-next",
    "aria-label": t("next"),
    disabled: canNext ? null : true,
    onclick: () => { if (canNext) jump(page + 1); },
    text: "›",
  }));
  const size = sizes.length ? el("label", { class: "sn-select sn-pager-size" }, [
    el("span", { text: t("perPage") }),
    el("select", {
      "data-sn": "per-page",
      "aria-label": t("perPage"),
      onchange: (event) => {
        onPer(Number(event.target.value));
        scrollList();
      },
    }, sizes.map((n) => el("option", { value: String(n), selected: n === Number(per) ? true : null, text: String(n) }))),
  ]) : null;
  return el("nav", { class: "sn-pager", "data-sn": "pager", "aria-label": t("page") }, [pagesBox, size]);
}

/** Corta `rows` y pinta ‹ 1 2 … N › arriba (si hay más de una) y abajo, con el selector. */
export function pagedBlock(rows, state, sizes, render) {
  const view = slicePage(rows, state.page, state.per);
  state.page = view.page;
  state.per = view.per;
  const opts = {
    page: view.page,
    pages: view.pages,
    per: view.per,
    onPage: (next) => {
      state.page = next;
      state.paint();
    },
    onPer: (next) => {
      state.per = next;
      state.page = 1;
      state.paint();
    },
  };
  const bar = () => pager({ ...opts, sizes });
  return el("div", { class: "sn-paged" }, [
    view.pages > 1 ? bar() : null,
    render(view.rows, view),
    bar(),
  ]);
}
