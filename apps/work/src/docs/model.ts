export type JsonMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type JsonNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: JsonMark[];
  content?: JsonNode[];
};

export type TextInline = {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  highlight?: string;
  href?: string;
  subscript?: boolean;
  superscript?: boolean;
};

export type ImageInline = { type: "image"; src: string; alt: string };

export type Inline = TextInline | ImageInline;

export type Block =
  | { type: "paragraph" | "h1" | "h2" | "h3" | "quote"; inlines: Inline[] }
  | { type: "bullet" | "ordered"; items: Inline[][] }
  | { type: "checklist"; items: Array<{ checked: boolean; inlines: Inline[] }> }
  | { type: "table"; rows: string[][] }
  | { type: "image"; src: string; alt: string }
  | { type: "pageBreak" }
  | { type: "contents" };

export type DocComment = { id: string; quote: string; body: string; createdAt: string };
export type DocVersion = { id: string; at: string; title: string; content: JsonNode };

export type PageSize = "a4" | "letter";
export type PageOrientation = "portrait" | "landscape";
export type PageMargin = "normal" | "narrow" | "wide";

export type OrvdocFile = {
  format: "orvupi-doc";
  version: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: JsonNode;
  header: string;
  footer: string;
  comments: DocComment[];
  versions: DocVersion[];
  columns?: 1 | 2 | 3;
  dropCap?: boolean;
  watermark?: string;
  pageNumber?: boolean;
  pageSize?: PageSize;
  pageOrientation?: PageOrientation;
  pageMargin?: PageMargin;
};

const COLORS = new Set(["#102032", "#ad1645", "#0b5d36", "#1d4e89", "#a3123f"]);
const SIZES = new Set(["14px", "16px", "20px", "28px"]);
const FONTS = new Set(["Arial", "Times New Roman", "Georgia", "Verdana", "Courier New", "Comic Sans MS", "Roboto", "Inter", "Lora", "Merriweather", "Montserrat"]);
const HEX = /^#[0-9a-f]{6}$/i;

function knownColor(value: string): string | undefined {
  const color = value.trim().toLowerCase();
  if (COLORS.has(color) || HEX.test(color)) return color;
  return undefined;
}

function knownSize(value: string): string | undefined {
  if (SIZES.has(value)) return value;
  const match = /^(\d{1,3})pt$/.exec(value.trim());
  if (!match) return undefined;
  const size = Number(match[1]);
  if (size < 1 || size > 400) return undefined;
  return `${size}pt`;
}

function knownFont(value: string): string | undefined {
  const cleaned = value.replaceAll('"', "").replaceAll("'", "").split(",")[0]?.trim() ?? "";
  for (const font of FONTS) {
    if (font.toLowerCase() === cleaned.toLowerCase()) return font;
  }
  return undefined;
}

export function emptyDoc(): JsonNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function textNode(value: string): JsonNode {
  return { type: "text", text: value };
}

export function paragraph(value = ""): JsonNode {
  return value ? { type: "paragraph", content: [textNode(value)] } : { type: "paragraph" };
}

export function heading(level: 1 | 2 | 3 | 4 | 5 | 6, value: string): JsonNode {
  return { type: "heading", attrs: { level }, content: [textNode(value)] };
}

export function bulletList(items: string[]): JsonNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}

export function documentNode(nodes: JsonNode[]): JsonNode {
  return { type: "doc", content: nodes.length > 0 ? nodes : [paragraph()] };
}

function stringAttr(node: JsonNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === "string" ? value : "";
}

function inlinesFrom(nodes: JsonNode[] | undefined): Inline[] {
  const result: Inline[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "text") {
      const marks = node.marks ?? [];
      const style = marks.find((mark) => mark.type === "textStyle");
      const link = marks.find((mark) => mark.type === "link");
      const color = typeof style?.attrs?.color === "string" ? knownColor(style.attrs.color) : undefined;
      const fontSize = typeof style?.attrs?.fontSize === "string" ? knownSize(style.attrs.fontSize) : undefined;
      const fontFamily = typeof style?.attrs?.fontFamily === "string" ? knownFont(style.attrs.fontFamily) : undefined;
      const highlight = typeof style?.attrs?.backgroundColor === "string" ? knownColor(style.attrs.backgroundColor) : undefined;
      const href = typeof link?.attrs?.href === "string" ? link.attrs.href : undefined;
      result.push({
        type: "text",
        text: node.text ?? "",
        bold: marks.some((mark) => mark.type === "bold") || undefined,
        italic: marks.some((mark) => mark.type === "italic") || undefined,
        underline: marks.some((mark) => mark.type === "underline") || undefined,
        strike: marks.some((mark) => mark.type === "strike") || undefined,
        color,
        fontSize,
        fontFamily,
        highlight,
        href,
        subscript: marks.some((mark) => mark.type === "subscript") || undefined,
        superscript: marks.some((mark) => mark.type === "superscript") || undefined,
      });
    } else if (node.type === "footnote") {
      const n = Number(node.attrs?.n);
      const note = typeof node.attrs?.text === "string" ? node.attrs.text : "";
      const label = Number.isFinite(n) && n > 0 ? `[${n}]` : "";
      result.push({ type: "text", text: `${label} ${note}`.trim(), superscript: true });
    } else if (node.type === "hardBreak") {
      result.push({ type: "text", text: "\n" });
    } else if (node.type === "image") {
      result.push({ type: "image", src: stringAttr(node, "src"), alt: stringAttr(node, "alt") });
    } else if (node.content) {
      result.push(...inlinesFrom(node.content));
    }
  }
  return result;
}

export function plainText(node: JsonNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map((child) => plainText(child)).join(node.type === "paragraph" || node.type === "heading" ? "" : "");
}

export function blocksFromDoc(doc: JsonNode): Block[] {
  const blocks: Block[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === "heading") {
      const level = node.attrs?.level;
      const type = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      blocks.push({ type, inlines: inlinesFrom(node.content) });
    } else if (node.type === "paragraph") {
      blocks.push({ type: "paragraph", inlines: inlinesFrom(node.content) });
    } else if (node.type === "blockquote") {
      blocks.push({ type: "quote", inlines: inlinesFrom(node.content) });
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = (node.content ?? [])
        .filter((item) => item.type === "listItem")
        .map((item) => inlinesFrom(item.content));
      blocks.push({ type: node.type === "bulletList" ? "bullet" : "ordered", items });
    } else if (node.type === "taskList") {
      const items = (node.content ?? [])
        .filter((item) => item.type === "taskItem")
        .map((item) => ({ checked: item.attrs?.checked === true, inlines: inlinesFrom(item.content) }));
      blocks.push({ type: "checklist", items });
    } else if (node.type === "pageBreak") {
      blocks.push({ type: "pageBreak" });
    } else if (node.type === "table") {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) =>
          (cell.content ?? [])
            .map((child) => plainText(child))
            .join(" ")
            .trim(),
        ),
      );
      blocks.push({ type: "table", rows });
    } else if (node.type === "image") {
      blocks.push({ type: "image", src: stringAttr(node, "src"), alt: stringAttr(node, "alt") });
    } else if (node.type === "horizontalRule") {
      blocks.push({ type: "paragraph", inlines: [{ type: "text", text: "—" }] });
    } else if (node.type === "contents") {
      blocks.push({ type: "contents" });
    } else if (node.type === "equation" || node.type === "docChart" || node.type === "docDrawing") {
      const text = node.type === "equation"
        ? String(node.attrs?.expr ?? "")
        : node.type === "docChart"
          ? String(node.attrs?.title ?? "")
          : "Dibujo";
      blocks.push({ type: "paragraph", inlines: [{ type: "text", text }] });
    }
  }
  return blocks;
}

export function headingLines(doc: JsonNode): string[] {
  const lines: string[] = [];
  const walk = (node: JsonNode) => {
    if (node.type === "heading") {
      const text = (node.content ?? []).map((child) => child.text ?? "").join("").trim();
      if (text) lines.push(text);
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return lines;
}

export function docToText(doc: JsonNode): string {
  const headings = headingLines(doc);
  return blocksFromDoc(doc)
    .map((block) => {
      if (block.type === "image") return block.alt;
      if (block.type === "table") return block.rows.map((row) => row.join("\t")).join("\n");
      if (block.type === "bullet" || block.type === "ordered") {
        return block.items
          .map((item, index) => {
            const prefix = block.type === "bullet" ? "- " : `${index + 1}. `;
            return prefix + inlineText(item);
          })
          .join("\n");
      }
      if (block.type === "checklist") {
        return block.items.map((item) => `${item.checked ? "[x]" : "[ ]"} ${inlineText(item.inlines)}`).join("\n");
      }
      if (block.type === "pageBreak") return "—";
      if (block.type === "contents") return headings.join("\n");
      if (block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3" || block.type === "quote") {
        return inlineText(block.inlines);
      }
      return "";
    })
    .join("\n\n")
    .trim();
}

function inlineText(inlines: Inline[]): string {
  return inlines
    .map((inline) => (inline.type === "text" ? inline.text : inline.alt))
    .join("")
    .trim();
}

export function countWords(text: string): { words: number; characters: number } {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: text.length,
  };
}

export function firstLine(text: string): string {
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find(Boolean);
  return (line ?? "").slice(0, 80);
}

export const UNTITLED_NAMES = new Set(["Sin título", "Untitled"]);
