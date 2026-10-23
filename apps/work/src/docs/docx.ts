import { safeImageSrc } from "../security/sanitize";
import { imageBytesSync, preloadAssets, releaseExportAssets } from "../storage/assets";
import type { DocComment, JsonMark, JsonNode, PageMargin, PageOrientation, PageSize } from "./model";

type Docx = typeof import("docx");
type Shapes = typeof import("docx/shapes");
type Child = InstanceType<Docx["Paragraph"]> | InstanceType<Docx["Table"]>;
type Run = InstanceType<Docx["TextRun"]> | InstanceType<Docx["ImageRun"]> | InstanceType<Docx["ExternalHyperlink"]>;

export type DocxLayout = { pageSize?: PageSize; pageOrientation?: PageOrientation; pageMargin?: PageMargin; pageMarginTw?: number; columns?: number; comments?: DocComment[] };
type Note = { children: InstanceType<Docx["Paragraph"]>[] };
const EMU = 9525;

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
  const hit = imageBytesSync(safe);
  if (!hit) return null;
  const mime = hit.mime.split("/")[1];
  if (!mime || mime === "webp") return null;
  return { data: hit.data, type: mime === "jpeg" ? "jpg" : (mime as "png" | "gif") };
}

function pngSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length > 24 && data[0] === 0x89 && data[1] === 0x50) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  return null;
}

class Writer {
  footnotes: Record<number, Note> = {};
  endnotes: Record<number, Note> = {};
  private noteId = 1;
  private endId = 1;
  commentIds = new Map<string, number>();
  anchored = new Set<string>();
  private pendingLoose: number[] = [];

  constructor(private docx: Docx, private shapes: Shapes, public maxWidth: number, comments: DocComment[] = []) {
    let next = 0;
    for (const comment of comments) {
      this.commentIds.set(comment.id, next);
      next += 1 + (comment.replies?.length ?? 0);
    }
  }

  /** Comentarios sin texto anclado: se anclan al primer párrafo para que Word los muestre. */
  setLoose(ids: number[]) {
    this.pendingLoose = ids;
  }

  commentWrap(runs: Run[]): Run[] {
    if (this.pendingLoose.length === 0) return runs;
    const d = this.docx;
    const ids = this.pendingLoose;
    this.pendingLoose = [];
    const before = ids.map((id) => new d.CommentRangeStart(id) as unknown as Run);
    const after = ids.flatMap((id) => [new d.CommentRangeEnd(id) as unknown as Run, new d.TextRun({ children: [new d.CommentReference(id)] })]);
    return [...before, ...runs, ...after];
  }

  runs(nodes: JsonNode[] | undefined, extra: { bold?: boolean; heading?: boolean } = {}): Run[] {
    const out: Run[] = [];
    const d = this.docx;
    const open = new Set<number>();
    const syncComments = (marks: JsonMark[]) => {
      const now = new Set<number>();
      for (const mark of marks) {
        if (mark.type !== "comment") continue;
        const key = String(mark.attrs?.id ?? "");
        const id = this.commentIds.get(key);
        if (id === undefined) continue;
        now.add(id);
        this.anchored.add(key);
      }
      for (const id of [...open]) {
        if (now.has(id)) continue;
        out.push(new d.CommentRangeEnd(id) as unknown as Run, new d.TextRun({ children: [new d.CommentReference(id)] }));
        open.delete(id);
      }
      for (const id of now) {
        if (open.has(id)) continue;
        out.push(new d.CommentRangeStart(id) as unknown as Run);
        open.add(id);
      }
    };
    for (const node of nodes ?? []) {
      if (node.type === "text") syncComments(node.marks ?? []);
      if (node.type === "text") out.push(this.textRun(node.text ?? "", node.marks ?? [], extra));
      else if (node.type === "hardBreak") out.push(new this.docx.TextRun({ text: "", break: 1 }));
      else if (node.type === "image") {
        const image = this.imageRun(node);
        if (image) out.push(image);
      } else if (node.type === "footnote") {
        const note = { children: String(node.attrs?.text ?? "").split("\n").map((line) => new d.Paragraph({ children: [new d.TextRun(line)] })) };
        if (node.attrs?.kind === "end") {
          const id = this.endId++;
          this.endnotes[id] = note;
          out.push(new d.EndnoteReferenceRun(id) as unknown as Run);
        } else {
          const id = this.noteId++;
          this.footnotes[id] = note;
          out.push(new d.FootnoteReferenceRun(id) as unknown as Run);
        }
      } else if (node.content) out.push(...this.runs(node.content, extra));
    }
    syncComments([]);
    return out;
  }

  floating(attrs: Record<string, unknown>) {
    const d = this.docx;
    const wrap = String(attrs.wrap ?? "inline");
    if (wrap === "inline" || !wrap) return undefined;
    const align = attrs.align === "right" ? d.HorizontalPositionAlign.RIGHT : attrs.align === "center" ? d.HorizontalPositionAlign.CENTER : undefined;
    const ox = Math.round((Number(attrs.offsetX) || 0) * EMU);
    const oy = Math.round((Number(attrs.offsetY) || 0) * EMU);
    const square = wrap === "square";
    return {
      horizontalPosition: align && !(square && ox) ? { relative: d.HorizontalPositionRelativeFrom.COLUMN, align } : { relative: d.HorizontalPositionRelativeFrom.COLUMN, offset: align === d.HorizontalPositionAlign.RIGHT ? Math.max(0, Math.round(this.maxWidth * EMU) - ox - Math.round((Number(attrs.width) || 0) * EMU)) : ox },
      verticalPosition: { relative: d.VerticalPositionRelativeFrom.PARAGRAPH, offset: oy },
      behindDocument: wrap === "behind",
      allowOverlap: true,
      wrap: {
        type: square ? d.TextWrappingType.SQUARE : wrap === "topBottom" ? d.TextWrappingType.TOP_AND_BOTTOM : d.TextWrappingType.NONE,
        side: d.TextWrappingSide.BOTH_SIDES,
      },
      margins: { left: 114300, right: 114300, top: 0, bottom: 0 },
    };
  }

  shapeRun(node: JsonNode): Run {
    const d = this.docx;
    const a = node.attrs ?? {};
    const width = Math.max(16, Number(a.width) || 240);
    const height = Math.max(16, Number(a.height) || 96);
    const kind = a.shape === "ellipse" ? "ellipse" : a.shape === "roundRect" ? "roundedRectangle" : "rectangle";
    const fill = typeof a.fill === "string" && HEX.test(a.fill) ? a.fill.slice(1).toUpperCase() : "none";
    const line = typeof a.stroke === "string" && HEX.test(a.stroke) ? { color: a.stroke.slice(1).toUpperCase(), width: 1 } : "none";
    const lines = String(a.text ?? "").split("\n");
    const floating = this.floating({ ...a, width });
    return new this.shapes.ShapeRun({
      type: kind,
      transformation: { width, height },
      fill,
      line,
      children: lines.map((text) => new d.Paragraph({ children: [new d.TextRun({ text, color: "102032" })] })),
      ...(floating ? { floating } : {}),
      altText: { name: a.shape === "textbox" ? "Cuadro de texto" : "Forma", description: lines.join(" ").slice(0, 180) },
    } as unknown as ConstructorParameters<Shapes["ShapeRun"]>[0]) as unknown as Run;
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
    const floating = this.floating({ ...(node.attrs ?? {}), width });
    return new this.docx.ImageRun({
      type: decoded.type,
      data: decoded.data,
      transformation: { width, height },
      altText: alt ? { name: alt, description: alt, title: alt } : undefined,
      ...(floating ? { floating } : {}),
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
        out.push(new d.Paragraph({ ...this.paragraphOptions(node), numbering: list ? { reference: list.reference, level: list.level } : undefined, children: this.commentWrap(this.runs(node.content)) }));
        return;
      case "docShape":
        out.push(new d.Paragraph({ children: [this.shapeRun(node)] }));
        return;
      case "heading": {
        const level = Number(node.attrs?.level ?? 1);
        const heading = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6][Math.min(5, Math.max(0, level - 1))];
        out.push(new d.Paragraph({ ...this.paragraphOptions(node), heading, children: this.commentWrap(this.runs(node.content, { heading: true })) }));
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
      tableHeader: (row.content ?? []).length > 0 && (row.content ?? []).every((cell) => cell.type === "tableHeader") ? true : undefined,
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

const MARGINS: Record<PageMargin, number> = { narrow: 720, normal: 1440, wide: 2160 };

export async function exportDocx(title: string, doc: JsonNode, header: string, footer: string, pageNumber = false, layout: DocxLayout = {}): Promise<Uint8Array> {
  await preloadAssets(doc);
  try {
    return await buildDocx(title, doc, header, footer, pageNumber, layout);
  } finally {
    releaseExportAssets();
  }
}

async function buildDocx(title: string, doc: JsonNode, header: string, footer: string, pageNumber = false, layout: DocxLayout = {}): Promise<Uint8Array> {
  const docx = await import("docx");
  const shapes = await import("docx/shapes");
  const size = PAGE_TWIPS[layout.pageSize ?? "a4"];
  const baseOrientation: PageOrientation = layout.pageOrientation === "landscape" ? "landscape" : "portrait";
  const baseMargin: PageMargin = layout.pageMargin ?? "normal";
  // Margen exacto del documento importado (twips) para el contenido suelto; las secciones usan el suyo.
  const exactTw = layout.pageMarginTw && layout.pageMarginTw >= 144 && layout.pageMarginTw <= 4320 ? Math.round(layout.pageMarginTw) : undefined;
  const twOf = (margin: PageMargin, exact?: boolean) => (exact && exactTw ? exactTw : MARGINS[margin]);
  const usableOf = (orientation: PageOrientation, margin: PageMargin, columns = 1, exact = false) =>
    Math.round((((orientation === "landscape" ? size.height : size.width) - twOf(margin, exact) * 2) / PX_TO_TWIP) / Math.max(1, columns));
  const comments = layout.comments ?? [];
  const writer = new Writer(docx, shapes, usableOf(baseOrientation, baseMargin, layout.columns, true), comments);

  // Cada nodo de sección es una sección de Word; el contenido suelto va en secciones con el formato del documento.
  type Part = { children: Child[]; orientation: PageOrientation; margin: PageMargin; columns: number; type: "nextPage" | "continuous"; exact?: boolean };
  const parts: Part[] = [];
  let loose: Part | null = null;
  for (const node of doc.content ?? []) {
    if (node.type === "section") {
      loose = null;
      const a = node.attrs ?? {};
      const part: Part = {
        children: [],
        orientation: a.orientation === "landscape" ? "landscape" : "portrait",
        margin: a.margin === "narrow" || a.margin === "wide" ? a.margin : "normal",
        columns: Math.max(1, Math.min(3, Number(a.columns) || 1)),
        type: a.breakType === "continuous" ? "continuous" : "nextPage",
      };
      writer.maxWidth = usableOf(part.orientation, part.margin, part.columns);
      for (const child of node.content ?? []) writer.block(child, part.children);
      parts.push(part);
      continue;
    }
    if (!loose) {
      loose = { children: [], orientation: baseOrientation, margin: baseMargin, columns: Math.max(1, Math.min(3, layout.columns ?? 1)), type: "nextPage", exact: true };
      parts.push(loose);
    }
    writer.maxWidth = usableOf(loose.orientation, loose.margin, loose.columns, true);
    writer.block(node, loose.children);
  }
  if (parts.length === 0) parts.push({ children: [], orientation: baseOrientation, margin: baseMargin, columns: 1, type: "nextPage", exact: true });

  // Comentarios sin texto anclado: se cuelgan del principio del documento.
  const loose_ids = comments.filter((comment) => !writer.anchored.has(comment.id)).map((comment) => writer.commentIds.get(comment.id)!).filter((id) => id !== undefined);
  if (loose_ids.length > 0) {
    writer.setLoose(loose_ids);
    const runs = writer.commentWrap([]);
    parts[0]!.children.unshift(new docx.Paragraph({ children: runs }));
  }

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
  const commentEntries = comments.flatMap((comment) => {
    const id = writer.commentIds.get(comment.id)!;
    const paragraphs = (text: string) => text.split("\n").map((line) => new docx.Paragraph({ children: [new docx.TextRun(line)] }));
    const author = (comment.author || "ORVUPI Work").slice(0, 80);
    const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; };
    return [
      { id, author, initials: author.slice(0, 2).toUpperCase(), date: date(comment.createdAt), children: paragraphs(comment.body), resolved: comment.resolved === true },
      ...(comment.replies ?? []).map((reply, index) => {
        const replyAuthor = (reply.author || "ORVUPI Work").slice(0, 80);
        return { id: id + 1 + index, author: replyAuthor, initials: replyAuthor.slice(0, 2).toUpperCase(), date: date(reply.createdAt), children: paragraphs(reply.body), parentId: id, resolved: comment.resolved === true };
      }),
    ];
  });
  const headers = header.trim() ? { default: new docx.Header({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: header, size: 18 })] })] }) } : undefined;
  const footers = footerChildren.length > 0 ? { default: new docx.Footer({ children: [new docx.Paragraph({ children: footerChildren as InstanceType<typeof docx.TextRun>[] })] }) } : undefined;
  const file = new docx.Document({
    creator: "ORVUPI Work",
    title,
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    numbering: { config: [{ reference: "ow-bullet", levels: levels("bullet") }, { reference: "ow-ordered", levels: levels("decimal") }] },
    ...(Object.keys(writer.footnotes).length > 0 ? { footnotes: writer.footnotes } : {}),
    ...(Object.keys(writer.endnotes).length > 0 ? { endnotes: writer.endnotes } : {}),
    ...(commentEntries.length > 0 ? { comments: { children: commentEntries } } : {}),
    sections: parts.map((part, index) => ({
      properties: {
        ...(index > 0 ? { type: part.type === "continuous" ? docx.SectionType.CONTINUOUS : docx.SectionType.NEXT_PAGE } : {}),
        page: {
          size: { width: size.width, height: size.height, orientation: part.orientation === "landscape" ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT },
          margin: { top: twOf(part.margin, part.exact), bottom: twOf(part.margin, part.exact), left: twOf(part.margin, part.exact), right: twOf(part.margin, part.exact) },
        },
        ...(part.columns > 1 ? { column: { count: part.columns, space: 708, equalWidth: true } } : {}),
      },
      headers,
      footers,
      children: part.children.length > 0 ? part.children : [new docx.Paragraph("")],
    })),
  } as ConstructorParameters<typeof docx.Document>[0]);
  const blob = await docx.Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}
