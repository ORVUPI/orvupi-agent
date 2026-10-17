import DOMPurify from "dompurify";

const FORBIDDEN_TAGS = ["script", "iframe", "object", "embed", "link", "meta", "style", "form", "svg", "math"];

function purify(html: string, allowStyle: boolean): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: allowStyle ? [] : ["style"],
    ALLOW_DATA_ATTR: false,
  });
}

export function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

export function safeImageSrc(value: string): string | null {
  const match = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.exec(value.trim());
  if (!match) return null;
  if (value.length > 2_800_000) return null;
  return value.trim();
}

function scrubTree(html: string): string {
  if (typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") ?? "";
    if (!safeImageSrc(src)) image.remove();
  });
  template.content.querySelectorAll("a").forEach((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const safe = safeHref(href);
    if (!safe) anchor.removeAttribute("href");
    else anchor.setAttribute("href", safe);
    anchor.setAttribute("rel", "noopener noreferrer");
  });
  return template.innerHTML;
}

/** HTML ajeno: se quitan scripts, estilos y recursos remotos. */
export function sanitizeForeignHtml(html: string): string {
  return scrubTree(purify(html, false));
}

/** HTML generado por ORVUPI Work, con color y tamaño ya filtrados. */
export function sanitizeExportedHtml(html: string): string {
  return scrubTree(purify(html, true));
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
