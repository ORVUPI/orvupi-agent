import { renderSonarPage } from "../_lib/seo.js";

export async function onRequest(context) {
  return renderSonarPage(context.request, context.env || {}, context, specOf(context.params.path));
}

const SHELL = new Set(["movers", "trending", "new", "news", "watchlist", "portfolio", "calendar", "unlocks", "crypto"]);

export function specOf(path) {
  const parts = Array.isArray(path) ? path : path ? String(path).split("/").filter(Boolean) : [];
  const [kind, id] = parts;
  if (kind === "crypto" && id) return { kind: "crypto", id };
  if (kind === "exchanges") return { kind: "exchange", id: id || "" };
  if (kind === "categories") return { kind: "category", id: id || "" };
  if (!kind || (SHELL.has(kind) && parts.length === 1)) return { kind: "shell", id: "" };
  return { kind: "notfound", id: "" };
}
