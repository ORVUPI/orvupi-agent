import { safeImageSrc } from "../security/sanitize";
import type { JsonMark, JsonNode, PageMargin, PageOrientation, PageSize } from "./model";

type Docx = typeof import("docx");
type Child = InstanceType<Docx["Paragraph"]> | InstanceType<Docx["Table"]>;
type Run = InstanceType<Docx["TextRun"]> | InstanceType<Docx["ImageRun"]> | InstanceType<Docx["ExternalHyperlink"]>;

export type DocxLayout = { pageSize?: PageSize; pageOrientation?: PageOrientation; pageMargin?: PageMargin };

const HEX = /^#([0-9a-f]{6})$/i;
const PX_TO_TWIP = 15;

function hex(value: unknown): string | undefined {
  return typeof value === "string" && HEX.test(value) ? value.slice(1).toUpperCase() : undefined;
}

function halfPoints(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const pt = /^(\d+(?:\.\d+)?)pt$/.exec(value.trim());
  if (pt) return Math.round(Number(pt[1]) * 2);
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (px) return Math.round(Number(px[1]) * 0.75 * 2);
  return undefined;
}

function fontName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.replace(/["']/g, "").split(",")[0]?.trim() ?? "";
  return /^[\p{L}\p{N} .\-]{1,60}$/u.test(name) ? name : undefined;
}

function decodeImage(src: string): { data: Uint8Array; type: "png" | "jpg" | "gif" } | null {
  const safe = safeImageSrc(src);
  if (!safe) return null;
  const mime = /^data:image\/(png|jpeg|gif|webp)/i.exec(safe)?.[1]?.toLowerCase();
  if (!mime || mime === "webp") return null;
  const binary = atob((safe.split(",")[1] ?? "").replace(/\s+/g, ""));
  const data = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) data[index] = binary.charCodeAt(index);
  return { data, type: mime === "jpeg" ? "jpg" : (mime as "png" | "gif") };
}

function pngSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length > 24 && data[0] === 0x89 && data[1] === 0x50) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  return null;
}

class Writer {
  constructor(private docx: Docx, private maxWidth: number) {}

  runs(nodes: JsonNode[] | undefined, extra: { bold?: boolean; heading?: boolean } = {}): Run[] {
    const out: Run[] = [];
    for (const node of nodes ?? []) {
      if (node.type === "text") out.push(this.textRun(node.text ?? "", node.marks ?? [], extra));
      else if (node.type === "hardBreak") out.push(new this.docx.TextRun({ text: "", break: 1 }));
      else if (node.type === "image") {
        const image = this.imageRun(node);
        if (image) out.push(image);
      } else if (node.type === "footnote") {
        out.push(new this.docx.TextRun({ text: ` [${String(node.attrs?.n ?? "")}] ${String(node.attrs?.text ?? "")}`, superScript: true }));
      } else if (node.content) out.push(...this.runs(node.content, extra));
    }
    return out;
  }

  textRun(text: string, marks: JsonMark[], extra: { bold?: boolean; heading?: boolean }): Run {
    const has = (type: string) => marks.some((mark) => mark.type === type);
    const style = marks.find((mark) => mark.type === "textStyle")?.attrs ?? {};
    const link = marks.find((mark) => mark.type === "link")?.attrs?.href;
    const color = hex(style.color);
    const highlight = hex(style.backgroundColor);
    const parts = text.split("\t");
    const run = new this.docx.TextRun({
      children: parts.flatMap((part, index) => (index === 0 ? [part] : [new this.docx.Tab(), part])),
      bold: has("bold") || extra.bold || undefined,
      italics: has("italic") || undefined,
      underline: has("underline") || typeof link === "string" ? {} : undefined,
      strike: has("strike") || undefined,
      subScript: has("subscript") || undefined,
      superScript: has("superscript") || undefined,
      color: color ?? (typeof link === "string" ? "1155CC" : extra.heading ? "000000" : undefined),
      size: halfPoints(style.fontSize),
      font: fontName(style.fontFamily),
      shading: highlight ? { type: this.docx.ShadingType.CLEAR, color: "auto", fill: highlight } : undefined,
    });
    if (typeof link === "string" && /^(https?:|mailto:)/i.test(link)) {
      return new this.docx.ExternalHyperlink({ link, children: [run] });
    }
    return run;
  }

  imageRun(node: JsonNode): Run | null {
    const decoded = decodeImage(String(node.attrs?.src ?? ""));
    if (!decoded) return null;
    let width = Number(node.attrs?.width) || 0;
    let height = Number(node.attrs?.height) || 0;
    if (!(width > 0 && height > 0)) {
      const natural = pngSize(decoded.data);
      width = natural?.width ?? 480;
      height = natural?.height ?? 320;
    }
    if (width > this.maxWidth) {
      height = Math.round((height * this.maxWidth) / width);
      width = this.maxWidth;
    }
    const alt = String(node.attrs?.alt ?? "").slice(0, 180);
    return new this.docx.ImageRun({
      type: decoded.type,
      data: decoded.data,
      transformation: { width, height },
      altText: alt ? { name: alt, description: alt, title: alt } : undefined,
    } as ConstructorParameters<Docx["ImageRun"]>[0]);
  }

  paragraphOptions(node: JsonNode) {
    const attrs = node.attrs ?? {};
    const align = attrs.textAlign ?? attrs.align;
    const alignment = align === "center" ? this.docx.AlignmentType.CENTER
      : align === "right" ? this.docx.AlignmentType.RIGHT
        : align === "justify" ? this.docx.AlignmentType.JUSTIFIED
          : undefined;
    const line = Number(attrs.lineHeight);
    const before = Number(attrs.spaceBefore);
    const after = Number(attrs.spaceAfter);
    const spacing: Record<string, number> = {};
    if (Number.isFinite(line) && line > 0) spacing.line = Math.round(line * 240);
    if (attrs.spaceBefore != null && Number.isFinite(before)) spacing.before = Math.round(before * 20);
    if (attrs.spaceAfter != null && Number.isFinite(after)) spacing.after = Math.round(after * 20);
    const indent = Number(attrs.indent);
    return {
      alignment,
      spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
      indent: Number.isFinite(indent) && indent > 0 ? { left: indent * 720 } : undefined,
    };
  }

  block(node: JsonNode, out: Child[], list?: { reference: string; level: number }): void {
    const d = this.docx;
    switch (node.type) {
      case "paragraph":
        out.push(new d.Paragraph({ ...this.paragraphOptions(node), numbering: list ? { reference: list.reference, level: list.level } : undefined, children: this.runs(node.content) }));
        return;
      case "heading": {
        const level = Number(node.attrs?.level ?? 1);
        const heading = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6][Math.min(5, Math.max(0, level - 1))];
        out.push(new d.Paragraph({ ...this.paragraphOptions(node), heading, children: this.runs(node.content, { heading: true }) }));
        return;
      }
      case "blockquote":
        for (const child of node.content ?? []) {
          if (child.type === "paragraph") out.push(new d.Paragraph({ ...this.paragraphOptions(child), indent: { left: 720 }, children: this.runs(child.content, {}) }));
          else this.block(child, out, list);
        }
        return;
      case "bulletList":
      case "orderedList": {
        const reference = node.type === "bulletList" ? "ow-bullet" : "ow-ordered";
        const level = list ? list.level + 1 : 0;
        for (const item of node.content ?? []) {
          for (const child of item.content ?? []) {
            if (child.type === "bulletList" || child.type === "orderedList") this.block(child, out, { reference, level });
            else this.block(child, out, { reference, level: Math.min(level, 8) });
          }
        }
        return;
      }
      case "taskList":
        for (const item of node.content ?? []) {
          const checked = item.attrs?.checked === true;
          for (const child of item.content ?? []) {
            if (child.type === "paragraph") out.push(new d.Paragraph({ children: [new d.TextRun(checked ? "☑ " : "☐ "), ...this.runs(child.content)] }));
            else this.block(child, out);
          }
        }
        return;
      case "pageBreak":
        out.push(new d.Paragraph({ children: [new d.PageBreak()] }));
        return;
      case "horizontalRule":
        out.push(new d.Paragraph({ border: { bottom: { color: "102032", space: 1, style: d.BorderStyle.SINGLE, size: 6 } }, children: [] }));
        return;
      case "image": {
        const run = this.imageRun(node);
        const align = node.attrs?.align;
        if (run) out.push(new d.Paragraph({ alignment: align === "center" ? d.AlignmentType.CENTER : align === "right" ? d.AlignmentType.RIGHT : undefined, children: [run] }));
        return;
      }
      case "table":
        out.push(this.table(node));
        return;
      case "equation":
        out.push(new d.Paragraph({ children: [new d.TextRun({ text: String(node.attrs?.expr ?? ""), italics: true })] }));
        return;
      case "docChart":
      case "docDrawing":
      case "contents":
        out.push(new d.Paragraph({ children: [new d.TextRun(node.type === "docChart" ? String(node.attrs?.title ?? "") : node.type === "contents" ? "" : "Dibujo")] }));
        return;
      default:
        if (node.content) for (const child of node.content) this.block(child, out, list);
    }
  }

  table(node: JsonNode): InstanceType<Docx["Table"]> {
    const d = this.docx;
    const rows = (node.content ?? []).map((row) => new d.TableRow({
      children: (row.content ?? []).map((cell) => {
        const children: Child[] = [];
        for (const child of cell.content ?? []) this.block(child, children);
        const paragraphs = children.filter((child): child is InstanceType<Docx["Paragraph"]> => child instanceof d.Paragraph);
        const fill = hex(cell.attrs?.background);
        const widths = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as unknown[]).map(Number).filter((w) => w > 0) : [];
        return new d.TableCell({
          children: paragraphs.length > 0 ? paragraphs : [new d.Paragraph("")],
          columnSpan: Number(cell.attrs?.colspan) > 1 ? Number(cell.attrs?.colspan) : undefined,
          rowSpan: Number(cell.attrs?.rowspan) > 1 ? Number(cell.attrs?.rowspan) : undefined,
          shading: fill ? { type: d.ShadingType.CLEAR, color: "auto", fill } : undefined,
          width: widths.length > 0 ? { size: widths.reduce((a, b) => a + b, 0) * PX_TO_TWIP, type: d.WidthType.DXA } : undefined,
        });
      }),
    }));
    return new d.Table({ rows, width: { size: 100, type: d.WidthType.PERCENTAGE } });
  }
}

const PAGE_TWIPS: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 11906, height: 16838 },
  letter: { width: 12240, height: 15840 },
};

export async function exportDocx(title: string, doc: JsonNode, header: string, footer: string, pageNumber = false, layout: DocxLayout = {}): Promise<Uint8Array> {
  const docx = await import("docx");
  const size = PAGE_TWIPS[layout.pageSize ?? "a4"];
  const landscape = layout.pageOrientation === "landscape";
  const margin = layout.pageMargin === "narrow" ? 720 : layout.pageMargin === "wide" ? 2160 : 1440;
  const usable = Math.round(((landscape ? size.height : size.width) - margin * 2) / PX_TO_TWIP);
  const writer = new Writer(docx, usable);
  const children: Child[] = [];
  for (const node of doc.content ?? []) writer.block(node, children);
  const footerChildren: unknown[] = [];
  if (footer.trim()) footerChildren.push(new docx.TextRun({ text: footer, size: 18 }));
  if (pageNumber) {
    if (footerChildren.length > 0) footerChildren.push(new docx.TextRun({ text: " " }));
    footerChildren.push(new docx.TextRun({ children: [docx.PageNumber.CURRENT] }));
  }
  const levels = (format: "bullet" | "decimal") => Array.from({ length: 9 }, (_, level) => ({
    level,
    format: format === "bullet" ? docx.LevelFormat.BULLET : docx.LevelFormat.DECIMAL,
    text: format === "bullet" ? ["•", "◦", "▪"][level % 3]! : `%${level + 1}.`,
    alignment: docx.AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
  }));
  const file = new docx.Document({
    creator: "ORVUPI Work",
    title,
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    numbering: { config: [{ reference: "ow-bullet", levels: levels("bullet") }, { reference: "ow-ordered", levels: levels("decimal") }] },
    sections: [{
      properties: {
        page: {
          size: { width: size.width, height: size.height, orientation: landscape ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT },
          margin: { top: margin, bottom: margin, left: margin, right: margin },
        },
      },
      headers: header.trim() ? { default: new docx.Header({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: header, size: 18 })] })] }) } : undefined,
      footers: footerChildren.length > 0 ? { default: new docx.Footer({ children: [new docx.Paragraph({ children: footerChildren as InstanceType<typeof docx.TextRun>[] })] }) } : undefined,
      children: children.length > 0 ? children : [new docx.Paragraph("")],
    }],
  });
  const blob = await docx.Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}
