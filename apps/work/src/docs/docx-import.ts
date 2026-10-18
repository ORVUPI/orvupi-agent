import { WorkError } from "../security/errors";
import { safeHref } from "../security/sanitize";
import { unzip } from "../sheets/zip";
import type { JsonMark, JsonNode, PageMargin, PageOrientation, PageSize } from "./model";

/**
 * Importación fiel de DOCX: estilos de párrafo y de carácter, negrita/cursiva parcial,
 * color, tamaño y fuente por tramo, títulos, listas, tablas, alineación, interlineado,
 * espaciado, imágenes con su tamaño, saltos de página, encabezado y pie.
 */

export type DocxImport = {
  content: JsonNode;
  header: string;
  footer: string;
  pageNumber: boolean;
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  pageMargin: PageMargin;
  images: number;
};

type RunProps = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number; // pt
  font?: string;
  highlight?: string;
  vert?: "sub" | "super";
  caps?: boolean;
};

type ParaProps = {
  align?: string;
  before?: number; // pt
  after?: number; // pt
  line?: number; // múltiplo
  indent?: number; // twips
  firstLine?: number;
  heading?: number;
  numId?: string;
  ilvl?: number;
  pageBreakBefore?: boolean;
};

type Style = { id: string; type: string; basedOn?: string; name: string; p?: Element; r?: Element };

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MAX_BLOCKS = 4000;
const EMU_PER_PX = 9525;
const HIGHLIGHTS: Record<string, string> = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000",
  darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000", white: "#ffffff",
};
const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

function kids(node: Element | null | undefined, name?: string): Element[] {
  if (!node) return [];
  const out: Element[] = [];
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== 1) continue;
    const element = child as Element;
    if (!name || element.localName === name) out.push(element);
  }
  return out;
}

function kid(node: Element | null | undefined, name: string): Element | null {
  return kids(node, name)[0] ?? null;
}

function attr(node: Element | null | undefined, name: string): string | null {
  if (!node) return null;
  return node.getAttributeNS(W, name) ?? node.getAttribute(`w:${name}`) ?? node.getAttribute(name);
}

function descendants(node: Element, name: string): Element[] {
  return Array.from(node.getElementsByTagName("*")).filter((element) => element.localName === name);
}

function onOff(node: Element | null): boolean | undefined {
  if (!node) return undefined;
  const value = attr(node, "val");
  return !(value === "0" || value === "false" || value === "off" || value === "none");
}

function parseXml(bytes: Uint8Array | undefined): Document | null {
  if (!bytes) return null;
  const text = new TextDecoder().decode(bytes);
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  return doc;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function safeFont(name: string | null): string | undefined {
  const cleaned = (name ?? "").replace(/[^\p{L}\p{N} .\-]/gu, "").trim().slice(0, 60);
  return cleaned || undefined;
}

function readRunProps(rPr: Element | null, target: RunProps): RunProps {
  if (!rPr) return target;
  const next = { ...target };
  const b = onOff(kid(rPr, "b"));
  if (b !== undefined) next.bold = b;
  const i = onOff(kid(rPr, "i"));
  if (i !== undefined) next.italic = i;
  const strike = onOff(kid(rPr, "strike")) ?? onOff(kid(rPr, "dstrike"));
  if (strike !== undefined) next.strike = strike;
  const caps = onOff(kid(rPr, "caps"));
  if (caps !== undefined) next.caps = caps;
  const u = kid(rPr, "u");
  if (u) next.underline = (attr(u, "val") ?? "single") !== "none";
  const color = attr(kid(rPr, "color"), "val");
  if (color && /^[0-9a-f]{6}$/i.test(color)) next.color = `#${color.toLowerCase()}`;
  else if (color === "auto") delete next.color;
  const sz = Number(attr(kid(rPr, "sz"), "val"));
  if (Number.isFinite(sz) && sz > 0) next.size = sz / 2;
  const fonts = kid(rPr, "rFonts");
  const font = safeFont(attr(fonts, "ascii") ?? attr(fonts, "hAnsi"));
  if (font) next.font = font;
  const highlight = attr(kid(rPr, "highlight"), "val");
  if (highlight && HIGHLIGHTS[highlight]) next.highlight = HIGHLIGHTS[highlight];
  const shd = attr(kid(rPr, "shd"), "fill");
  if (!highlight && shd && /^[0-9a-f]{6}$/i.test(shd) && shd.toLowerCase() !== "ffffff") next.highlight = `#${shd.toLowerCase()}`;
  const vert = attr(kid(rPr, "vertAlign"), "val");
  if (vert === "subscript") next.vert = "sub";
  else if (vert === "superscript") next.vert = "super";
  else if (vert === "baseline") delete next.vert;
  return next;
}

function readParaProps(pPr: Element | null, target: ParaProps): ParaProps {
  if (!pPr) return target;
  const next = { ...target };
  const jc = attr(kid(pPr, "jc"), "val");
  if (jc) next.align = jc === "both" || jc === "distribute" ? "justify" : jc === "end" ? "right" : jc === "start" ? "left" : jc;
  const spacing = kid(pPr, "spacing");
  if (spacing) {
    const before = attr(spacing, "before");
    const after = attr(spacing, "after");
    const line = attr(spacing, "line");
    if (before !== null && Number.isFinite(Number(before))) next.before = Number(before) / 20;
    if (after !== null && Number.isFinite(Number(after))) next.after = Number(after) / 20;
    const rule = attr(spacing, "lineRule") ?? "auto";
    if (line !== null && Number(line) > 0 && rule === "auto") next.line = Math.round((Number(line) / 240) * 100) / 100;
  }
  const ind = kid(pPr, "ind");
  if (ind) {
    const left = Number(attr(ind, "left") ?? attr(ind, "start") ?? NaN);
    if (Number.isFinite(left)) next.indent = left;
    const first = Number(attr(ind, "firstLine") ?? NaN);
    const hanging = Number(attr(ind, "hanging") ?? NaN);
    if (Number.isFinite(first)) next.firstLine = first;
    else if (Number.isFinite(hanging)) next.firstLine = -hanging;
  }
  const numPr = kid(pPr, "numPr");
  if (numPr) {
    const numId = attr(kid(numPr, "numId"), "val");
    if (numId && numId !== "0") {
      next.numId = numId;
      next.ilvl = Number(attr(kid(numPr, "ilvl"), "val") ?? 0) || 0;
    } else if (numId === "0") {
      delete next.numId;
    }
  }
  const outline = attr(kid(pPr, "outlineLvl"), "val");
  if (outline !== null && Number(outline) <= 5) next.heading = Number(outline) + 1;
  const pbb = onOff(kid(pPr, "pageBreakBefore"));
  if (pbb !== undefined) next.pageBreakBefore = pbb;
  return next;
}

class Styles {
  private map = new Map<string, Style>();
  private defaultsR: RunProps = {};
  private defaultsP: ParaProps = {};
  private defaultPara = "Normal";
  private defaultChar: string | null = null;

  constructor(doc: Document | null) {
    if (!doc) return;
    const root = doc.documentElement;
    const defaults = kid(root, "docDefaults");
    this.defaultsR = readRunProps(kid(kid(defaults, "rPrDefault"), "rPr"), {});
    this.defaultsP = readParaProps(kid(kid(defaults, "pPrDefault"), "pPr"), {});
    for (const node of kids(root, "style")) {
      const id = attr(node, "styleId") ?? "";
      const type = attr(node, "type") ?? "paragraph";
      const style: Style = {
        id,
        type,
        basedOn: attr(kid(node, "basedOn"), "val") ?? undefined,
        name: (attr(kid(node, "name"), "val") ?? id).toLowerCase(),
        p: kid(node, "pPr") ?? undefined,
        r: kid(node, "rPr") ?? undefined,
      };
      this.map.set(id, style);
      if (attr(node, "default") === "1" || attr(node, "default") === "true") {
        if (type === "paragraph") this.defaultPara = id;
        if (type === "character") this.defaultChar = id;
      }
    }
  }

  private chain(id: string | null | undefined): Style[] {
    const out: Style[] = [];
    const seen = new Set<string>();
    let current = id ? this.map.get(id) : undefined;
    while (current && !seen.has(current.id) && out.length < 20) {
      seen.add(current.id);
      out.unshift(current);
      current = current.basedOn ? this.map.get(current.basedOn) : undefined;
    }
    return out;
  }

  paragraph(id: string | null): { p: ParaProps; r: RunProps } {
    let p = { ...this.defaultsP };
    let r = { ...this.defaultsR };
    for (const style of this.chain(id ?? this.defaultPara)) {
      p = readParaProps(style.p ?? null, p);
      r = readRunProps(style.r ?? null, r);
    }
    const level = this.headingLevel(id ?? this.defaultPara);
    if (level) p.heading = level;
    return { p, r };
  }

  character(id: string | null, base: RunProps): RunProps {
    let r = base;
    for (const style of this.chain(id ?? this.defaultChar)) r = readRunProps(style.r ?? null, r);
    return r;
  }

  defaultRun(): RunProps {
    return { ...this.defaultsR };
  }

  private headingLevel(id: string): number | undefined {
    for (const style of this.chain(id).reverse()) {
      if (style.name === "title" || style.id === "Title") return 1;
      const match = /^heading\s*([1-6])$/.exec(style.name) ?? /^Heading([1-6])$/.exec(style.id);
      if (match) return Number(match[1]);
    }
    return undefined;
  }
}

class Numbering {
  private formats = new Map<string, Map<number, string>>();

  constructor(doc: Document | null) {
    if (!doc) return;
    const root = doc.documentElement;
    const abstracts = new Map<string, Map<number, string>>();
    for (const node of kids(root, "abstractNum")) {
      const levels = new Map<number, string>();
      for (const lvl of kids(node, "lvl")) {
        levels.set(Number(attr(lvl, "ilvl") ?? 0), attr(kid(lvl, "numFmt"), "val") ?? "bullet");
      }
      abstracts.set(attr(node, "abstractNumId") ?? "", levels);
    }
    for (const node of kids(root, "num")) {
      const abstract = attr(kid(node, "abstractNumId"), "val") ?? "";
      this.formats.set(attr(node, "numId") ?? "", abstracts.get(abstract) ?? new Map());
    }
  }

  ordered(numId: string, level: number): boolean {
    const format = this.formats.get(numId)?.get(level) ?? "bullet";
    return format !== "bullet" && format !== "none";
  }
}

type Ctx = {
  files: Map<string, Uint8Array>;
  rels: Map<string, { target: string; external: boolean }>;
  styles: Styles;
  numbering: Numbering;
  images: number;
  base: RunProps; // tamaño y fuente base para no repetir lo que ya es el estilo del editor
};

function relsOf(files: Map<string, Uint8Array>, path: string): Map<string, { target: string; external: boolean }> {
  const out = new Map<string, { target: string; external: boolean }>();
  const slash = path.lastIndexOf("/");
  const dir = path.slice(0, slash);
  const doc = parseXml(files.get(`${dir}/_rels/${path.slice(slash + 1)}.rels`));
  if (!doc) return out;
  for (const node of Array.from(doc.getElementsByTagName("*"))) {
    if (node.localName !== "Relationship") continue;
    const id = node.getAttribute("Id") ?? "";
    const target = node.getAttribute("Target") ?? "";
    const external = node.getAttribute("TargetMode") === "External";
    out.set(id, { target: external ? target : normalizePath(`${dir}/${target}`), external });
  }
  return out;
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/^\/+/, "").split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function marksFor(props: RunProps, ctx: Ctx, href?: string): JsonMark[] {
  const marks: JsonMark[] = [];
  if (props.bold) marks.push({ type: "bold" });
  if (props.italic) marks.push({ type: "italic" });
  if (props.underline) marks.push({ type: "underline" });
  if (props.strike) marks.push({ type: "strike" });
  if (props.vert === "sub") marks.push({ type: "subscript" });
  if (props.vert === "super") marks.push({ type: "superscript" });
  const style: Record<string, string> = {};
  if (props.color && props.color !== "#000000") style.color = props.color;
  if (props.size && props.size !== ctx.base.size) style.fontSize = `${props.size}pt`;
  if (props.font && props.font !== ctx.base.font) style.fontFamily = props.font;
  if (props.highlight) style.backgroundColor = props.highlight;
  if (Object.keys(style).length > 0) marks.push({ type: "textStyle", attrs: style });
  if (href) marks.push({ type: "link", attrs: { href } });
  return marks;
}

type Piece = { kind: "inline"; node: JsonNode } | { kind: "image"; node: JsonNode } | { kind: "break" };

function imageNode(drawing: Element, ctx: Ctx): JsonNode | null {
  const blip = descendants(drawing, "blip")[0] ?? descendants(drawing, "imagedata")[0];
  if (!blip) return null;
  const rid = blip.getAttribute("r:embed") ?? blip.getAttribute("r:id")
    ?? blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed")
    ?? blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const rel = rid ? ctx.rels.get(rid) : undefined;
  if (!rel || rel.external) return null;
  const bytes = ctx.files.get(rel.target);
  const ext = rel.target.split(".").pop()?.toLowerCase() ?? "";
  const mime = IMAGE_MIME[ext];
  if (!bytes || !mime) return null;
  const extent = descendants(drawing, "extent")[0];
  const cx = Number(extent?.getAttribute("cx") ?? 0);
  const cy = Number(extent?.getAttribute("cy") ?? 0);
  const docPr = descendants(drawing, "docPr")[0];
  const alt = (docPr?.getAttribute("descr") || docPr?.getAttribute("title") || docPr?.getAttribute("name") || "").slice(0, 180);
  const attrs: Record<string, unknown> = { src: `data:${mime};base64,${toBase64(bytes)}`, alt };
  if (cx > 0 && cy > 0) {
    attrs.width = Math.round(cx / EMU_PER_PX);
    attrs.height = Math.round(cy / EMU_PER_PX);
  }
  ctx.images += 1;
  return { type: "image", attrs };
}

function runPieces(run: Element, inherited: RunProps, ctx: Ctx, href?: string): Piece[] {
  const rPr = kid(run, "rPr");
  const props = readRunProps(rPr, ctx.styles.character(attr(kid(rPr, "rStyle"), "val"), inherited));
  const pieces: Piece[] = [];
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    const text = props.caps ? buffer.toUpperCase() : buffer;
    const marks = marksFor(props, ctx, href);
    pieces.push({ kind: "inline", node: marks.length > 0 ? { type: "text", text, marks } : { type: "text", text } });
    buffer = "";
  };
  for (const child of kids(run)) {
    const name = child.localName;
    if (name === "t") buffer += child.textContent ?? "";
    else if (name === "tab" || name === "ptab") buffer += "\t";
    else if (name === "noBreakHyphen") buffer += "\u2011";
    else if (name === "softHyphen") continue;
    else if (name === "sym") {
      const code = Number.parseInt(attr(child, "char") ?? "", 16);
      if (Number.isFinite(code) && code > 31 && code < 0xf000) buffer += String.fromCodePoint(code);
    } else if (name === "br" || name === "cr") {
      flush();
      const type = attr(child, "type");
      if (type === "page") pieces.push({ kind: "break" });
      else pieces.push({ kind: "inline", node: { type: "hardBreak" } });
    } else if (name === "drawing" || name === "pict" || name === "object") {
      flush();
      const image = imageNode(child, ctx);
      if (image) pieces.push({ kind: "image", node: image });
    } else if (name === "AlternateContent") {
      flush();
      const choice = kid(child, "Choice") ?? kid(child, "Fallback");
      const image = choice ? imageNode(choice, ctx) : null;
      if (image) pieces.push({ kind: "image", node: image });
    }
  }
  flush();
  return pieces;
}

function inlinePieces(container: Element, inherited: RunProps, ctx: Ctx, href?: string): Piece[] {
  const pieces: Piece[] = [];
  for (const child of kids(container)) {
    const name = child.localName;
    if (name === "r") pieces.push(...runPieces(child, inherited, ctx, href));
    else if (name === "hyperlink") {
      const rid = child.getAttribute("r:id") ?? child.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const rel = rid ? ctx.rels.get(rid) : undefined;
      const link = rel?.external ? safeHref(rel.target) ?? undefined : undefined;
      pieces.push(...inlinePieces(child, inherited, ctx, link ?? href));
    } else if (name === "ins" || name === "smartTag" || name === "fldSimple" || name === "customXml" || name === "bdo" || name === "dir") {
      pieces.push(...inlinePieces(child, inherited, ctx, href));
    } else if (name === "sdt") {
      pieces.push(...inlinePieces(kid(child, "sdtContent") ?? child, inherited, ctx, href));
    }
  }
  return pieces;
}

function paragraphAttrs(p: ParaProps): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (p.align && p.align !== "left") attrs.textAlign = p.align;
  if (p.line && p.line > 0 && p.line <= 5) attrs.lineHeight = String(p.line);
  if (p.before !== undefined && p.before > 0) attrs.spaceBefore = Math.min(Math.round(p.before), 200);
  attrs.spaceAfter = Math.min(Math.round(p.after ?? 0), 200);
  if (!p.numId && p.indent && p.indent > 0) attrs.indent = Math.min(8, Math.round(p.indent / 720));
  return attrs;
}

function mergeText(nodes: JsonNode[]): JsonNode[] {
  const out: JsonNode[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (last && node.type === "text" && last.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(node.marks ?? [])) {
      out[out.length - 1] = { ...last, text: `${last.text ?? ""}${node.text ?? ""}` };
    } else out.push(node);
  }
  return out;
}

type Item = { node: JsonNode; list?: { numId: string; level: number; ordered: boolean } };

function paragraphNodes(paragraph: Element, ctx: Ctx): Item[] {
  const pPr = kid(paragraph, "pPr");
  const styleId = attr(kid(pPr, "pStyle"), "val");
  const resolved = ctx.styles.paragraph(styleId);
  const p = readParaProps(pPr, resolved.p);
  // Los títulos tienen tamaño propio en el editor: se fija siempre el del documento.
  const base = ctx.base;
  if (p.heading) ctx.base = { ...base, size: -1 };
  const pieces = inlinePieces(paragraph, resolved.r, ctx);
  ctx.base = base;
  const attrs = paragraphAttrs(p);
  const list = p.numId ? { numId: p.numId, level: p.ilvl ?? 0, ordered: ctx.numbering.ordered(p.numId, p.ilvl ?? 0) } : undefined;
  const items: Item[] = [];
  if (p.pageBreakBefore) items.push({ node: { type: "pageBreak" } });
  let current: JsonNode[] = [];
  let produced = false;
  const pushText = (force: boolean) => {
    const content = mergeText(current);
    current = [];
    const hasText = content.some((node) => node.type !== "hardBreak" || content.length > 1);
    if (!hasText && !force) return;
    produced = true;
    const node: JsonNode = p.heading
      ? { type: "heading", attrs: { level: p.heading, ...attrs } }
      : { type: "paragraph", ...(Object.keys(attrs).length > 0 ? { attrs } : {}) };
    if (content.length > 0) node.content = content;
    items.push({ node, list });
  };
  for (const piece of pieces) {
    if (piece.kind === "inline") current.push(piece.node);
    else if (piece.kind === "image") {
      pushText(false);
      const imageAttrs = { ...(piece.node.attrs ?? {}), align: p.align === "center" || p.align === "right" ? p.align : "left" };
      items.push({ node: { ...piece.node, attrs: imageAttrs } });
      produced = true;
    } else {
      pushText(false);
      items.push({ node: { type: "pageBreak" } });
      produced = true;
    }
  }
  if (current.length > 0 || !produced) pushText(!produced);
  return items;
}

function cellNodes(cell: Element, ctx: Ctx): JsonNode[] {
  const nodes = blockItems(kids(cell), ctx).map((item) => item.node).filter((node) => node.type !== "pageBreak");
  return nodes.length > 0 ? nodes : [{ type: "paragraph" }];
}

function tableNode(table: Element, ctx: Ctx): JsonNode {
  const rows = kids(table, "tr");
  const grid = kids(kid(table, "tblGrid"), "gridCol").map((col) => Number(attr(col, "w") ?? 0) / 15);
  const starts = new Map<string, JsonNode>();
  const out: JsonNode[] = [];
  rows.forEach((row, rowIndex) => {
    let column = 0;
    const cells: JsonNode[] = [];
    for (const cell of kids(row, "tc")) {
      const tcPr = kid(cell, "tcPr");
      const span = Math.max(1, Number(attr(kid(tcPr, "gridSpan"), "val") ?? 1) || 1);
      const merge = kid(tcPr, "vMerge");
      const mergeVal = merge ? attr(merge, "val") ?? "continue" : null;
      if (mergeVal === "continue") {
        const start = starts.get(`${column}`);
        if (start?.attrs) start.attrs.rowspan = Number(start.attrs.rowspan ?? 1) + 1;
        column += span;
        continue;
      }
      const fill = attr(kid(tcPr, "shd"), "fill");
      const widths = grid.slice(column, column + span).map((w) => Math.round(w));
      const attrs: Record<string, unknown> = { colspan: span, rowspan: 1 };
      if (widths.length === span && widths.every((w) => w > 0)) attrs.colwidth = widths;
      if (fill && /^[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase() !== "ffffff") attrs.background = `#${fill.toLowerCase()}`;
      const node: JsonNode = { type: "tableCell", attrs, content: cellNodes(cell, ctx) };
      if (mergeVal === "restart") starts.set(`${column}`, node);
      else starts.delete(`${column}`);
      cells.push(node);
      column += span;
    }
    if (cells.length > 0) out.push({ type: "tableRow", content: cells });
    void rowIndex;
  });
  return { type: "table", content: out.length > 0 ? out : [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph" }] }] }] };
}

function blockItems(elements: Element[], ctx: Ctx): Item[] {
  const items: Item[] = [];
  for (const element of elements) {
    if (items.length > MAX_BLOCKS) break;
    const name = element.localName;
    if (name === "p") items.push(...paragraphNodes(element, ctx));
    else if (name === "tbl") items.push({ node: tableNode(element, ctx) });
    else if (name === "sdt") items.push(...blockItems(kids(kid(element, "sdtContent")), ctx));
    else if (name === "customXml" || name === "ins") items.push(...blockItems(kids(element), ctx));
  }
  return items;
}

/** Agrupa párrafos numerados consecutivos en listas anidadas. */
function groupLists(items: Item[]): JsonNode[] {
  const out: JsonNode[] = [];
  let index = 0;
  while (index < items.length) {
    const item = items[index]!;
    if (!item.list) {
      out.push(item.node);
      index += 1;
      continue;
    }
    const run: Item[] = [];
    while (index < items.length && items[index]!.list) {
      run.push(items[index]!);
      index += 1;
    }
    out.push(...buildList(run, 0));
  }
  return out;
}

function buildList(run: Item[], level: number): JsonNode[] {
  const lists: JsonNode[] = [];
  let currentList: JsonNode | null = null;
  let index = 0;
  while (index < run.length) {
    const item = run[index]!;
    const itemLevel = Math.max(level, item.list!.level);
    if (itemLevel > level) {
      const nested: Item[] = [];
      while (index < run.length && run[index]!.list!.level > level) {
        nested.push(run[index]!);
        index += 1;
      }
      const lastItem = currentList?.content?.[currentList.content.length - 1];
      const children = buildList(nested, level + 1);
      if (lastItem) lastItem.content = [...(lastItem.content ?? []), ...children];
      else lists.push(...children);
      continue;
    }
    const type = item.list!.ordered ? "orderedList" : "bulletList";
    if (!currentList || currentList.type !== type) {
      currentList = { type, content: [] };
      lists.push(currentList);
    }
    const paragraph = item.node.type === "heading" ? { ...item.node, type: "paragraph", attrs: undefined } : item.node;
    currentList.content!.push({ type: "listItem", content: [paragraph] });
    index += 1;
  }
  return lists;
}

function plainOf(doc: Document | null): string {
  if (!doc) return "";
  const lines: string[] = [];
  for (const p of Array.from(doc.getElementsByTagName("*")).filter((node) => node.localName === "p")) {
    let text = "";
    let field = 0; // 0 fuera, 1 instrucción, 2 resultado (se omite: el número lo pone el editor)
    for (const node of Array.from(p.getElementsByTagName("*"))) {
      if (node.localName === "fldChar") {
        const type = attr(node, "fldCharType");
        field = type === "begin" ? 1 : type === "separate" ? 2 : 0;
      } else if (node.localName === "t" && field === 0) {
        let inside = false;
        for (let up = node.parentElement; up && up !== p; up = up.parentElement) if (up.localName === "fldSimple") inside = true;
        if (!inside) text += node.textContent ?? "";
      }
    }
    if (text.trim()) lines.push(text.trim());
  }
  return lines.join(" · ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function hasPageField(doc: Document | null): boolean {
  if (!doc) return false;
  const nodes = Array.from(doc.getElementsByTagName("*"));
  return nodes.some((node) => (node.localName === "instrText" && /\bPAGE\b/.test(node.textContent ?? ""))
    || (node.localName === "fldSimple" && /\bPAGE\b/.test(attr(node, "instr") ?? "")));
}

export async function importDocx(bytes: Uint8Array): Promise<DocxImport> {
  const files = await unzip(bytes);
  const main = "word/document.xml";
  const document = parseXml(files.get(main));
  if (!document) throw new WorkError("invalid-format");
  const body = kid(document.documentElement, "body");
  if (!body) throw new WorkError("invalid-format");
  const styles = new Styles(parseXml(files.get("word/styles.xml")));
  const ctx: Ctx = {
    files,
    rels: relsOf(files, main),
    styles,
    numbering: new Numbering(parseXml(files.get("word/numbering.xml"))),
    images: 0,
    base: { size: 11, font: "Arial" },
  };
  const items = blockItems(kids(body), ctx);
  // Un salto de página al final del documento no aporta una página vacía.
  while (items.length > 0 && items[items.length - 1]!.node.type === "pageBreak") items.pop();
  const content = groupLists(items);

  const sect = kids(body, "sectPr").pop() ?? descendants(body, "sectPr").pop() ?? null;
  const pgSz = kid(sect, "pgSz");
  const width = Number(attr(pgSz, "w") ?? 11906);
  const height = Number(attr(pgSz, "h") ?? 16838);
  const landscape = attr(pgSz, "orient") === "landscape" || width > height;
  const shortSide = Math.min(width, height);
  const pageSize: PageSize = Math.abs(shortSide - 12240) < 120 ? "letter" : "a4";
  const left = Number(attr(kid(sect, "pgMar"), "left") ?? 1440);
  const pageMargin: PageMargin = left <= 900 ? "narrow" : left >= 2000 ? "wide" : "normal";
  const headerRef = kids(sect, "headerReference").find((ref) => attr(ref, "type") !== "first" && attr(ref, "type") !== "even") ?? kid(sect, "headerReference");
  const footerRef = kids(sect, "footerReference").find((ref) => attr(ref, "type") !== "first" && attr(ref, "type") !== "even") ?? kid(sect, "footerReference");
  const partOf = (ref: Element | null) => {
    const rid = ref?.getAttribute("r:id") ?? ref?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = rid ? ctx.rels.get(rid) : undefined;
    return rel ? parseXml(files.get(rel.target)) : null;
  };
  const headerDoc = partOf(headerRef);
  const footerDoc = partOf(footerRef);
  return {
    content: { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] },
    header: plainOf(headerDoc),
    footer: plainOf(footerDoc),
    pageNumber: hasPageField(headerDoc) || hasPageField(footerDoc),
    pageSize,
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargin,
    images: ctx.images,
  };
}
