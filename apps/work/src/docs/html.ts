import { escapeHtml, safeHref, safeImageSrc } from "../security/sanitize";
import { blocksFromDoc, type Inline, type JsonNode } from "./model";

const SIZE_CLASS: Record<string, string> = {
  "14px": "14px",
  "16px": "16px",
  "20px": "20px",
  "28px": "28px",
};

function renderInline(inline: Inline): string {
  if (inline.type === "image") {
    const src = safeImageSrc(inline.src);
    if (!src) return "";
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(inline.alt)}" />`;
  }
  let html = escapeHtml(inline.text);
  if (!html) return "";
  if (inline.bold) html = `<strong>${html}</strong>`;
  if (inline.italic) html = `<em>${html}</em>`;
  if (inline.underline) html = `<u>${html}</u>`;
  if (inline.strike) html = `<s>${html}</s>`;
  const styles: string[] = [];
  if (inline.color) styles.push(`color: ${inline.color}`);
  if (inline.fontSize && SIZE_CLASS[inline.fontSize]) styles.push(`font-size: ${inline.fontSize}`);
  if (styles.length > 0) html = `<span style="${styles.join("; ")}">${html}</span>`;
  const href = inline.href ? safeHref(inline.href) : null;
  if (href) html = `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${html}</a>`;
  return html;
}

function renderInlines(inlines: Inline[]): string {
  return inlines.map((inline) => renderInline(inline)).join("");
}

export function docToHtmlBody(doc: JsonNode): string {
  return blocksFromDoc(doc)
    .map((block) => {
      if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
        return `<${block.type}>${renderInlines(block.inlines)}</${block.type}>`;
      }
      if (block.type === "quote") return `<blockquote><p>${renderInlines(block.inlines)}</p></blockquote>`;
      if (block.type === "paragraph") return `<p>${renderInlines(block.inlines)}</p>`;
      if (block.type === "image") {
        const src = safeImageSrc(block.src);
        if (!src) return "";
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" />`;
      }
      if (block.type === "bullet" || block.type === "ordered") {
        const tag = block.type === "bullet" ? "ul" : "ol";
        const items = block.items.map((item) => `<li>${renderInlines(item)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      }
      if (block.type !== "table") return "";
      const rows = block.rows
        .map((row, index) => {
          const cell = index === 0 ? "th" : "td";
          return `<tr>${row.map((value) => `<${cell}>${escapeHtml(value)}</${cell}>`).join("")}</tr>`;
        })
        .join("");
      return `<table>${rows}</table>`;
    })
    .join("\n");
}

export function exportHtml(title: string, doc: JsonNode, lang: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<meta name="generator" content="ORVUPI Work" />
</head>
<body>
<h1>${safeTitle}</h1>
${docToHtmlBody(doc)}
</body>
</html>
`;
}
