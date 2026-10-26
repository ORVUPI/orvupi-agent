/** Hash de Studio: el tramo de vista va antes de `?`, `&` o `/`. */

export const LIBRARY_VIEWS = ["plantillas", "fotos", "elementos", "favoritos"];

export function routeFromHash(hash) {
  const body = String(hash || "").replace(/^#/, "").replace(/^\/+/, "");
  const segment = body.split(/[?&/]/)[0] || "";
  return segment;
}

export function queryFromHash(hash) {
  const body = String(hash || "").replace(/^#/, "").replace(/^\/+/, "");
  const cut = body.search(/[?&]/);
  if (cut < 0) return {};
  const params = new URLSearchParams(body.slice(cut).replace(/^[?&]/, ""));
  const out = {};
  for (const [key, value] of params) out[key] = value;
  return out;
}
