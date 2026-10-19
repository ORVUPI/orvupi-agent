/** Markdown sencillo de la respuesta del modelo → bloques: títulos, listas, párrafos, negrita y cursiva.
 *  Se usa para mostrarlo con formato (sin innerHTML), insertarlo en Docs y exportarlo a DOCX/PDF. */
import type { JsonNode } from "../docs/model";

export type Span = { text: string; bold?: boolean; italic?: boolean };
export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; spans: Span[] }
  | { type: "paragraph"; spans: Span[] }
  | { type: "bullet"; items: Span[][] }
  | { type: "ordered"; items: Span[][]; start: number }
  | { type: "table"; rows: Span[][][]; header: boolean }
  | { type: "pageBreak" };

/** Marca de salto de página en el markdown de ORVUPI AI. */
export const PAGE_BREAK = "<<<salto de página>>>";

function tableCells(line: string): string[] {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  const re = /(\*\*|__)(.+?)\1|(\*|_)(?!\s)(.+?)(?<!\s)\3/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > at) spans.push({ text: text.slice(at, m.index) });
    if (m[2] !== undefined) spans.push({ text: m[2], bold: true });
    else spans.push({ text: m[4]!, italic: true });
    at = m.index! + m[0].length;
  }
  if (at < text.length) spans.push({ text: text.slice(at) });
  return spans.map((s) => ({ ...s, text: s.text.replace(/`/g, "") })).filter((s) => s.text.length > 0);
}

export function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", spans: parseInline(para.join(" ")) });
    para = [];
  };
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (line === PAGE_BREAK || /^\\(newpage|pagebreak)$/.test(line)) { flush(); blocks.push({ type: "pageBreak" }); continue; }
    if (/^\|.*\|$/.test(line)) {
      flush();
      const last = blocks.at(-1);
      if (/^\|(\s*:?-{2,}:?\s*\|)+$/.test(line)) { if (last?.type === "table") last.header = true; continue; }
      const cells = tableCells(line).map(parseInline);
      if (last?.type === "table") last.rows.push(cells);
      else blocks.push({ type: "table", rows: [cells], header: false });
      continue;
    }
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line) || /^```/.test(line)) { flush(); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const b = /^[-*•+]\s+(.*)$/.exec(line);
    const o = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: "heading", level: Math.min(3, h[1]!.length) as 1 | 2 | 3, spans: parseInline(h[2]!.replace(/#+\s*$/, "")) });
    } else if (b) {
      flush();
      const last = blocks.at(-1);
      if (last?.type === "bullet") last.items.push(parseInline(b[1]!));
      else blocks.push({ type: "bullet", items: [parseInline(b[1]!)] });
    } else if (o) {
      flush();
      const last = blocks.at(-1);
      if (last?.type === "ordered") last.items.push(parseInline(o[2]!));
      else blocks.push({ type: "ordered", items: [parseInline(o[2]!)], start: Number(o[1]) });
    } else if (/^\*\*[^*]+\*\*:?$/.test(line)) {
      flush();
      blocks.push({ type: "heading", level: 3, spans: parseInline(line.replace(/^\*\*|\*\*:?$/g, "")) });
    } else para.push(line);
  }
  flush();
  return blocks;
}

function textNodes(spans: Span[]): JsonNode[] {
  return spans.map((s) => {
    const marks = [...(s.bold ? [{ type: "bold" }] : []), ...(s.italic ? [{ type: "italic" }] : [])];
    return marks.length ? { type: "text", text: s.text, marks } : { type: "text", text: s.text };
  });
}

/** Nodos de TipTap/ORVUPI Docs (para insertar en un documento). */
export function markdownToNodes(md: string): JsonNode[] {
  return parseMarkdown(md).map((block): JsonNode => {
    if (block.type === "heading") return { type: "heading", attrs: { level: block.level }, content: textNodes(block.spans) };
    if (block.type === "paragraph") return { type: "paragraph", content: textNodes(block.spans) };
    if (block.type === "pageBreak") return { type: "pageBreak" };
    if (block.type === "table") {
      return {
        type: "table",
        content: block.rows.map((row, r) => ({
          type: "tableRow",
          content: row.map((cell) => ({ type: block.header && r === 0 ? "tableHeader" : "tableCell", content: [{ type: "paragraph", content: textNodes(cell) }] })),
        })),
      };
    }
    const items = block.items.map((item) => ({ type: "listItem", content: [{ type: "paragraph", content: textNodes(item) }] }));
    return block.type === "bullet" ? { type: "bulletList", content: items } : { type: "orderedList", attrs: { start: block.start }, content: items };
  });
}

/** Documento completo (para «Abrir como documento» y las exportaciones). */
export function markdownToDoc(md: string, title?: string): JsonNode {
  const nodes = markdownToNodes(md);
  const head: JsonNode[] = title ? [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] }] : [];
  return { type: "doc", content: [...head, ...nodes] };
}

/** Texto plano sin marcas (para copiar). */
export function markdownToPlain(md: string): string {
  return parseMarkdown(md).map((block) => {
    const t = (spans: Span[]) => spans.map((s) => s.text).join("");
    if (block.type === "heading" || block.type === "paragraph") return t(block.spans);
    if (block.type === "pageBreak") return "";
    if (block.type === "table") return block.rows.map((row) => row.map(t).join("\t")).join("\n");
    return block.items.map((item, i) => (block.type === "bullet" ? `• ${t(item)}` : `${block.start + i}. ${t(item)}`)).join("\n");
  }).join("\n\n");
}
