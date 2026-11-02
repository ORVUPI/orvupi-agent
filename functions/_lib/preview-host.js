/** Redirección del host de producción de Pages. Los previews (<hash>. o <rama>.) no se tocan. */

const APEX = "stubxai.pages.dev";
const HOME = "https://orvupi.com";

export function pagesDevRedirect(url) {
  const parsed = typeof url === "string" ? new URL(url) : new URL(url.url || url);
  if (parsed.hostname !== APEX) return null;
  return `${HOME}${parsed.pathname}${parsed.search}`;
}

export function previewRedirect(request) {
  const target = pagesDevRedirect(request.url);
  if (!target) return null;
  return Response.redirect(target, 301);
}
