import { clsPct, pct, show, when } from "./format.mjs";
import { t } from "./i18n.mjs";

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") continue;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "text") node.textContent = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children || [])) append(node, child);
  return node;
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
  const box = el("div", { class: "sn-skel", "data-sn": "skeleton", "aria-busy": "true" });
  for (let index = 0; index < rows; index += 1) box.append(el("span"));
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

export function spark(values, up) {
  if (!Array.isArray(values) || values.length < 2) return el("span", { class: "sn-spark sn-spark-empty", "aria-hidden": "true" });
  const width = 88;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sn-spark");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", up === false ? "#f0a0b0" : "#7dcea0");
  line.setAttribute("stroke-width", "1.6");
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
  return el("img", { class: "sn-logo", src: row.image, alt: "", width: "28", height: "28", loading: "lazy", referrerpolicy: "no-referrer" });
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
