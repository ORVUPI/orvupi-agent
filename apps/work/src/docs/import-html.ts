import { sanitizeForeignHtml } from "../security/sanitize";
import { documentNode, paragraph, textNode, type JsonNode } from "./model";

function inlineFrom(node: Node): JsonNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    return value ? [textNode(value)] : [];
  }
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === "BR") return [{ type: "hardBreak" }];
  const children = [...node.childNodes].flatMap((child) => inlineFrom(child));
  const mark = node.tagName === "STRONG" || node.tagName === "B"
    ? "bold"
    : node.tagName === "EM" || node.tagName === "I"
      ? "italic"
      : node.tagName === "U"
        ? "underline"
        : node.tagName === "S" || node.tagName === "DEL"
          ? "strike"
          : null;
  if (mark) {
    return children.map((child) => (child.type === "text" ? { ...child, marks: [...(child.marks ?? []), { type: mark }] } : child));
  }
  if (node.tagName === "A") {
    const href = node.getAttribute("href");
    if (!href) return children;
    return children.map((child) =>
      child.type === "text" ? { ...child, marks: [...(child.marks ?? []), { type: "link", attrs: { href } }] } : child,
    );
  }
  return children;
}

function blockFrom(element: Element): JsonNode[] {
  const tag = element.tagName;
  if (tag === "UL" || tag === "OL") {
    const items = [...element.children]
      .filter((child) => child.tagName === "LI")
      .map((item) => ({ type: "listItem", content: [{ type: "paragraph", content: inlineFrom(item) }] }));
    return [{ type: tag === "UL" ? "bulletList" : "orderedList", content: items }];
  }
  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6") {
    const level = Number(tag.slice(1));
    return [{ type: "heading", attrs: { level }, content: inlineFrom(element) }];
  }
  if (tag === "BLOCKQUOTE") {
    return [{ type: "blockquote", content: [{ type: "paragraph", content: inlineFrom(element) }] }];
  }
  return [{ type: "paragraph", content: inlineFrom(element) }];
}

export function htmlToDoc(html: string): JsonNode {
  const clean = sanitizeForeignHtml(html);
  const tree = new DOMParser().parseFromString(clean, "text/html");
  const blocks = [...tree.body.children].flatMap((element) => blockFrom(element));
  if (blocks.length > 0) return documentNode(blocks);
  const text = tree.body.textContent?.trim() ?? "";
  return documentNode(text ? [paragraph(text)] : []);
}

export function textToDoc(text: string): JsonNode {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const chunks = normalized.split(/\n{2,}/).filter((chunk) => chunk.trim().length > 0);
  if (chunks.length === 0) return documentNode([]);
  return documentNode(
    chunks.map((chunk) => {
      const lines = chunk.split("\n");
      const content: JsonNode[] = [];
      lines.forEach((line, index) => {
        if (line) content.push(textNode(line));
        if (index < lines.length - 1) content.push({ type: "hardBreak" });
      });
      return { type: "paragraph", content };
    }),
  );
}
