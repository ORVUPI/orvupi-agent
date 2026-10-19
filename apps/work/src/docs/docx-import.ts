import { WorkError } from "../security/errors";
import { hasAssetStore, putAsset } from "../storage/assets";
import { safeHref } from "../security/sanitize";
import { unzip } from "../sheets/zip";
import type { DocComment, JsonMark, JsonNode, PageMargin, PageOrientation, PageSize } from "./model";

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
  /** Margen izquierdo/derecho exacto en twips, si no coincide con un margen predefinido. */
  pageMarginTw?: number;
  images: number;
  columns: 1 | 2 | 3;
  comments: DocComment[];
  shapes: number;
  notes: number;
  sections: number;
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

type Style = { id: string; type: string; basedOn?: string; name: string; p?: Element; r?: Element; t?: Element };

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

const EDITOR_FONTS = ["Arial", "Times New Roman", "Georgia", "Verdana", "Courier New", "Comic Sans MS", "Roboto", "Inter", "Lora", "Merriweather", "Montserrat"];

/**
 * Fuente del documento → fuente disponible en el editor. Una fuente que el navegador no tiene
 * (Aptos, Calibri, Cambria…) caería en la serif por defecto: se usa la equivalente más cercana.
 */
export function editorFont(name: string | null | undefined): string | undefined {
  const cleaned = (name ?? "").replace(/[^\p{L}\p{N} .\-]/gu, "").trim().slice(0, 60);
  if (!cleaned) return undefined;
  const lower = cleaned.toLowerCase();
  const exact = EDITOR_FONTS.find((font) => font.toLowerCase() === lower);
  if (exact) return exact;
  if (/mono|courier|consolas|menlo|lucida console|source code/.test(lower)) return "Courier New";
  if (/comic/.test(lower)) return "Comic Sans MS";
  if (/georgia|cambria|garamond|book antiqua|palatino|constantia/.test(lower)) return "Georgia";
  if (/merriweather/.test(lower)) return "Merriweather";
  if (/lora/.test(lower)) return "Lora";
  if (/times|serif$|^serif|minion|baskerville|didot|bodoni|noto serif|liberation serif|tinos|caladea/.test(lower) && !/sans/.test(lower)) return "Times New Roman";
  if (/montserrat|gotham|century gothic|futura/.test(lower)) return "Montserrat";
  if (/roboto/.test(lower)) return "Roboto";
  if (/inter\b/.test(lower)) return "Inter";
  if (/verdana|tahoma/.test(lower)) return "Verdana";
  return "Arial"; // Aptos, Calibri, Helvetica, Segoe UI, Noto Sans, Open Sans, Play…
}

function safeFont(name: string | null): string | undefined {
  return editorFont(name);
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
        t: kid(node, "tblPr") ?? undefined,
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

  /** tblPr de un estilo de tabla y de los estilos en que se basa (del más general al más concreto). */
  tablePr(id: string | null): Element[] {
    const chain = this.chain(id);
    if (chain.length === 0) {
      const fallback = [...this.map.values()].find((style) => style.type === "table" && style.id === "TableNormal");
      if (fallback?.t) return [fallback.t];
    }
    return chain.flatMap((style) => (style.t ? [style.t] : []));
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
  pending?: Map<string, { bytes: Uint8Array; mime: string }>;
  files: Map<string, Uint8Array>;
  rels: Map<string, { target: string; external: boolean }>;
  styles: Styles;
  numbering: Numbering;
  images: number;
  base: RunProps; // tamaño y fuente base para no repetir lo que ya es el estilo del editor
  footnotes: Map<string, string>;
  endnotes: Map<string, string>;
  commentIds: Set<string>; // comentarios principales (las respuestas no marcan texto)
  active: Set<string>;
  quotes: Map<string, string>;
  marginLeftPx: number;
  contentWidthPx: number;
  shapes: number;
  notes: number;
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
  for (const id of ctx.active) if (ctx.commentIds.has(id)) marks.push({ type: "comment", attrs: { id: `c${id}` } });
  return marks;
}

type Piece = { kind: "inline"; node: JsonNode } | { kind: "image"; node: JsonNode } | { kind: "anchor"; node: JsonNode } | { kind: "break" };

const RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function emuPx(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n / EMU_PER_PX) : 0;
}

function hexOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(clean) ? `#${clean.toLowerCase()}` : null;
}

/** Texto plano de un contenedor de párrafos (cuadros de texto, notas, comentarios). */
function blockText(container: Element | null | undefined, separator = "\n"): string {
  if (!container) return "";
  const lines: string[] = [];
  for (const p of descendants(container, "p")) {
    let text = "";
    for (const node of Array.from(p.getElementsByTagName("*"))) {
      if (node.localName === "t") text += node.textContent ?? "";
      else if (node.localName === "tab") text += "\t";
      else if (node.localName === "br") text += "\n";
    }
    lines.push(text);
  }
  while (lines.length > 0 && !lines[lines.length - 1]!.trim()) lines.pop();
  return lines.join(separator).slice(0, 4000);
}

type Placement = { wrap: string; offsetX: number; offsetY: number; align: string };

/** Ajuste de texto y posición de un objeto anclado (wp:anchor). */
function anchorPlacement(anchor: Element, width: number, ctx: Ctx): Placement {
  let wrap = "front";
  if (kid(anchor, "wrapSquare") || kid(anchor, "wrapTight") || kid(anchor, "wrapThrough")) wrap = "square";
  else if (kid(anchor, "wrapTopAndBottom")) wrap = "topBottom";
  else if (kid(anchor, "wrapNone")) wrap = anchor.getAttribute("behindDoc") === "1" || anchor.getAttribute("behindDoc") === "true" ? "behind" : "front";
  const posH = kid(anchor, "positionH");
  const posV = kid(anchor, "positionV");
  const hAlign = kid(posH, "align")?.textContent?.trim() ?? "";
  let offsetX = emuPx(kid(posH, "posOffset")?.textContent);
  const hRel = posH?.getAttribute("relativeFrom") ?? "column";
  if (hRel === "page") offsetX -= ctx.marginLeftPx;
  let offsetY = 0;
  const vRel = posV?.getAttribute("relativeFrom") ?? "paragraph";
  if (vRel === "paragraph" || vRel === "line") offsetY = emuPx(kid(posV, "posOffset")?.textContent);
  let align = hAlign === "center" ? "center" : hAlign === "right" || hAlign === "outside" ? "right" : "left";
  if (wrap === "square" && !hAlign && offsetX + width / 2 > ctx.contentWidthPx / 2 && ctx.contentWidthPx > 0) {
    // Flota a la derecha: el desplazamiento se cuenta desde el borde derecho.
    align = "right";
    offsetX = Math.max(0, ctx.contentWidthPx - offsetX - width);
  }
  if (hAlign) offsetX = 0;
  return { wrap, offsetX: Math.max(-2000, Math.min(2000, offsetX)), offsetY: Math.max(-2000, Math.min(2000, offsetY)), align };
}

function shapeKind(prst: string | null | undefined, textbox: boolean): string {
  if (prst === "ellipse") return "ellipse";
  if (prst === "roundRect") return "roundRect";
  if (textbox && (!prst || prst === "rect")) return "textbox";
  return "rect";
}

/** Forma o cuadro de texto DrawingML (wps:wsp). */
function wpsShape(wsp: Element, width: number, height: number): JsonNode {
  const spPr = kid(wsp, "spPr");
  const prst = kid(spPr, "prstGeom")?.getAttribute("prst");
  const isBox = kid(wsp, "cNvSpPr")?.getAttribute("txBox") === "1" || prst == null;
  const solid = kid(spPr, "solidFill");
  const fill = kid(spPr, "noFill") ? "none" : hexOf(kid(solid, "srgbClr")?.getAttribute("val")) ?? (isBox ? "none" : "#4472c4");
  const ln = kid(spPr, "ln");
  const stroke = kid(ln, "noFill") ? "none" : hexOf(kid(kid(ln, "solidFill"), "srgbClr")?.getAttribute("val")) ?? (isBox ? "#102032" : "#2f528f");
  const txbx = kid(wsp, "txbx");
  return {
    type: "docShape",
    attrs: { shape: shapeKind(prst, isBox && Boolean(txbx)), width: Math.max(16, width), height: Math.max(16, height), fill, stroke, text: blockText(kid(txbx, "txbxContent")) },
  };
}

function cssLength(style: string, key: string): number | null {
  const match = new RegExp(`(?:^|;)\\s*${key}\\s*:\\s*(-?[\\d.]+)(pt|in|px|cm|mm)?`, "i").exec(style);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = (match[2] ?? "px").toLowerCase();
  const px = unit === "pt" ? n * (96 / 72) : unit === "in" ? n * 96 : unit === "cm" ? n * (96 / 2.54) : unit === "mm" ? n * (96 / 25.4) : n;
  return Math.round(px);
}

/** Forma VML de documentos antiguos (v:shape, v:rect, v:roundrect, v:oval con v:textbox). */
function vmlShape(shape: Element): JsonNode | null {
  const style = shape.getAttribute("style") ?? "";
  const width = cssLength(style, "width") ?? 200;
  const height = cssLength(style, "height") ?? 80;
  const textbox = kid(shape, "textbox");
  const name = shape.localName;
  const kind = name === "oval" ? "ellipse" : name === "roundrect" ? "roundRect" : textbox && (shape.getAttribute("type") ?? "").includes("202") ? "textbox" : textbox && !shape.getAttribute("fillcolor") ? "textbox" : "rect";
  const filled = shape.getAttribute("filled");
  const fill = filled === "f" || filled === "false" ? "none" : hexOf(shape.getAttribute("fillcolor")) ?? (kind === "textbox" ? "none" : "#ffffff");
  const stroked = shape.getAttribute("stroked");
  const stroke = stroked === "f" || stroked === "false" ? "none" : hexOf(shape.getAttribute("strokecolor")) ?? "#102032";
  const wrapEl = kids(shape).find((child) => child.localName === "wrap");
  const wrapType = wrapEl?.getAttribute("type") ?? "";
  const z = Number(/z-index\s*:\s*(-?\d+)/.exec(style)?.[1] ?? 0);
  const absolute = /position\s*:\s*absolute/i.test(style);
  const wrap = !absolute ? "inline" : wrapType === "square" || wrapType === "tight" || wrapType === "through" ? "square" : wrapType === "topAndBottom" ? "topBottom" : z < 0 ? "behind" : "front";
  return {
    type: "docShape",
    attrs: {
      shape: kind, width, height, fill, stroke,
      text: blockText(kid(textbox, "txbxContent")),
      wrap,
      offsetX: absolute ? cssLength(style, "margin-left") ?? 0 : 0,
      offsetY: absolute ? cssLength(style, "margin-top") ?? 0 : 0,
      align: /mso-position-horizontal\s*:\s*right/i.test(style) ? "right" : /mso-position-horizontal\s*:\s*center/i.test(style) ? "center" : "left",
    },
  };
}

/** Objetos de un w:drawing: imagen, forma, cuadro de texto o grupo; en línea o anclados. */
function drawingPieces(drawing: Element, ctx: Ctx): Piece[] {
  const holder = kid(drawing, "anchor") ?? kid(drawing, "inline");
  if (!holder) {
    const image = imageNode(drawing, ctx);
    return image ? [{ kind: "image", node: image }] : [];
  }
  const anchored = holder.localName === "anchor";
  const extent = kid(holder, "extent");
  const width = emuPx(extent?.getAttribute("cx"));
  const height = emuPx(extent?.getAttribute("cy"));
  const placement = anchored ? anchorPlacement(holder, width, ctx) : null;
  const place = (node: JsonNode, dx = 0, dy = 0): Extract<Piece, { node: JsonNode }> => {
    if (!placement) return { kind: "image", node };
    return { kind: "anchor", node: { ...node, attrs: { ...(node.attrs ?? {}), wrap: placement.wrap, offsetX: placement.offsetX + dx, offsetY: placement.offsetY + dy, align: placement.align } } };
  };
  const data = descendants(holder, "graphicData")[0];
  const wsp = data ? kids(data, "wsp")[0] : undefined;
  if (wsp) {
    ctx.shapes += 1;
    return [place(wpsShape(wsp, width, height))];
  }
  const group = data ? kids(data, "wgp")[0] : undefined;
  if (group) {
    const out: Array<Extract<Piece, { node: JsonNode }>> = [];
    for (const child of kids(group)) {
      const xfrm = descendants(child, "xfrm")[0];
      const off = kid(xfrm ?? null, "off");
      const ext = kid(xfrm ?? null, "ext");
      const cw = emuPx(ext?.getAttribute("cx")) || width;
      const ch = emuPx(ext?.getAttribute("cy")) || height;
      const dx = emuPx(off?.getAttribute("x"));
      const dy = emuPx(off?.getAttribute("y"));
      if (child.localName === "wsp") {
        ctx.shapes += 1;
        out.push(place(wpsShape(child, cw, ch), dx, dy));
      } else if (child.localName === "pic") {
        const image = imageNode(child, ctx);
        if (image) out.push(place({ ...image, attrs: { ...(image.attrs ?? {}), width: cw, height: ch } }, dx, dy));
      }
    }
    if (!placement) {
      // Grupo en línea: sus objetos van uno junto a otro, a la distancia que marca el grupo.
      let right = 0;
      return out.map((piece) => {
        const attrs = piece.node.attrs ?? {};
        const index = out.indexOf(piece);
        const child = kids(group).filter((el) => el.localName === "wsp" || el.localName === "pic")[index];
        const off = child ? kid(descendants(child, "xfrm")[0] ?? null, "off") : null;
        const dx = emuPx(off?.getAttribute("x"));
        const node = { ...piece.node, attrs: { ...attrs, wrap: "square", align: "left", offsetX: Math.max(0, dx - right), offsetY: 0 } };
        right = dx + Number(attrs.width ?? 0) + 12;
        return { kind: "image" as const, node };
      });
    }
    // Dentro de un grupo anclado los objetos se superponen: el primero conserva el ajuste y el resto va delante.
    return out.map((piece, index) => (index === 0 || piece.kind !== "anchor" ? piece : { ...piece, node: { ...piece.node, attrs: { ...(piece.node.attrs ?? {}), wrap: piece.node.attrs?.wrap === "behind" ? "behind" : "front" } } }));
  }
  const image = imageNode(holder, ctx);
  return image ? [place(image)] : [];
}

function pictPieces(pict: Element, ctx: Ctx): Piece[] {
  const out: Piece[] = [];
  for (const shape of kids(pict)) {
    const name = shape.localName;
    if (!["shape", "rect", "roundrect", "oval"].includes(name)) continue;
    if (kid(shape, "textbox") || (!kid(shape, "imagedata") && (shape.getAttribute("fillcolor") || name !== "shape"))) {
      const node = vmlShape(shape);
      if (node) {
        ctx.shapes += 1;
        out.push(node.attrs?.wrap === "inline" ? { kind: "image", node } : { kind: "anchor", node });
      }
    } else {
      const image = imageNode(shape, ctx);
      if (image) out.push({ kind: "image", node: image });
    }
  }
  if (out.length === 0) {
    const image = imageNode(pict, ctx);
    if (image) out.push({ kind: "image", node: image });
  }
  return out;
}

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
  // Con almacén de binarios la imagen se guarda aparte al final (sin base64); si no, va incrustada.
  let src: string;
  if (hasAssetStore()) {
    src = `${PENDING}${rel.target}`;
    ctx.pending ??= new Map();
    ctx.pending.set(rel.target, { bytes, mime });
  } else src = `data:${mime};base64,${toBase64(bytes)}`;
  const attrs: Record<string, unknown> = { src, alt };
  if (cx > 0 && cy > 0) {
    // Tamaño real (EMU → px a 96 ppp), limitado al ancho útil de la hoja manteniendo la proporción.
    let w = cx / EMU_PER_PX;
    let h = cy / EMU_PER_PX;
    const max = ctx.contentWidthPx > 0 ? ctx.contentWidthPx : Infinity;
    if (w > max) {
      h = (h * max) / w;
      w = max;
    }
    attrs.width = Math.max(1, Math.round(w));
    attrs.height = Math.max(1, Math.round(h));
  }
  ctx.images += 1;
  return { type: "image", attrs };
}

// Fuentes de símbolos (Symbol, Wingdings): su código privado U+F0xx se traduce al carácter Unicode real.
const SYMBOL_FONT: Record<number, string> = {
  0x22: "∀", 0x24: "∃", 0x27: "∋", 0x2a: "∗", 0x2d: "−", 0x40: "≅", 0x44: "Δ", 0x46: "Φ", 0x47: "Γ", 0x4c: "Λ", 0x50: "Π", 0x51: "Θ", 0x53: "Σ", 0x57: "Ω", 0x58: "Ξ", 0x59: "Ψ",
  0x61: "α", 0x62: "β", 0x63: "χ", 0x64: "δ", 0x65: "ε", 0x66: "φ", 0x67: "γ", 0x68: "η", 0x69: "ι", 0x6b: "κ", 0x6c: "λ", 0x6d: "μ", 0x6e: "ν", 0x70: "π", 0x71: "θ", 0x72: "ρ", 0x73: "σ", 0x74: "τ", 0x75: "υ", 0x77: "ω", 0x78: "ξ", 0x79: "ψ", 0x7a: "ζ",
  0xa2: "′", 0xa3: "≤", 0xa5: "∞", 0xa7: "♣", 0xa8: "♦", 0xa9: "♥", 0xaa: "♠", 0xab: "↔", 0xac: "←", 0xad: "↑", 0xae: "→", 0xaf: "↓", 0xb0: "°", 0xb1: "±", 0xb2: "″", 0xb3: "≥", 0xb4: "×", 0xb5: "∝", 0xb6: "∂", 0xb7: "•", 0xb8: "÷", 0xb9: "≠", 0xba: "≡", 0xbb: "≈", 0xbc: "…",
  0xc5: "⊕", 0xc6: "∅", 0xc7: "∩", 0xc8: "∪", 0xd1: "∇", 0xd6: "√", 0xd7: "⋅", 0xd8: "¬", 0xd9: "∧", 0xda: "∨", 0xdb: "⇔", 0xdc: "⇐", 0xdd: "⇑", 0xde: "⇒", 0xdf: "⇓", 0xe0: "◊", 0xe5: "∑", 0xf2: "∫",
};
const WINGDINGS: Record<number, string> = {
  0x9f: "•", 0xa1: "○", 0xa7: "▪", 0xa8: "◻", 0xab: "★", 0x6c: "●", 0x6e: "■", 0x6f: "□", 0x71: "❑", 0x75: "◆", 0x76: "❖", 0x77: "◆", 0xd8: "➢", 0xe0: "➔", 0xe8: "➔", 0xf0: "⇨", 0xfb: "✗", 0xfc: "✓", 0xfd: "☒", 0xfe: "☑", 0x4a: "☺", 0x4c: "☹", 0x46: "☞", 0x21: "✏", 0x22: "✂", 0x28: "☎", 0x2a: "✉", 0x36: "⌛", 0x3a: "💻",
};

function rawFont(rPr: Element | null): string | null {
  const fonts = kid(rPr, "rFonts");
  return attr(fonts, "ascii") ?? attr(fonts, "hAnsi");
}

/** Carácter de un w:sym (o de un texto en fuente de símbolos) como Unicode. */
export function symbolChar(font: string | null | undefined, hex: string | null | undefined): string {
  let code = Number.parseInt(hex ?? "", 16);
  if (!Number.isFinite(code) || code <= 31) return "";
  if (code >= 0xf000 && code <= 0xf0ff) code -= 0xf000;
  const name = (font ?? "").toLowerCase();
  if (/wingdings/.test(name)) return WINGDINGS[code] ?? (code === 0x9f ? "•" : "•");
  if (/symbol/.test(name) && !/noto sans symbols|segoe ui symbol/.test(name)) return SYMBOL_FONT[code] ?? String.fromCodePoint(code);
  return code >= 0xe000 && code <= 0xf8ff ? "•" : String.fromCodePoint(code);
}

/** Texto de un w:t: en fuente Symbol/Wingdings, o con códigos privados U+F0xx, se traduce a Unicode. */
function symbolText(raw: string, font: string | null): string {
  const symbolFont = /^(symbol|wingdings)/i.test(font ?? "");
  if (!symbolFont && !/[\uf020-\uf0ff]/.test(raw)) return raw;
  return Array.from(raw).map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return symbolFont || (cp >= 0xf020 && cp <= 0xf0ff) ? symbolChar(font, cp.toString(16)) || ch : ch;
  }).join("");
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
    for (const id of ctx.active) if (ctx.commentIds.has(id)) ctx.quotes.set(id, `${ctx.quotes.get(id) ?? ""}${text}`.slice(0, 180));
    pieces.push({ kind: "inline", node: marks.length > 0 ? { type: "text", text, marks } : { type: "text", text } });
    buffer = "";
  };
  for (const child of kids(run)) {
    const name = child.localName;
    if (name === "t") buffer += symbolText(child.textContent ?? "", rawFont(rPr));
    else if (name === "tab" || name === "ptab") buffer += "\t";
    else if (name === "noBreakHyphen") buffer += "\u2011";
    else if (name === "softHyphen") continue;
    else if (name === "sym") {
      buffer += symbolChar(attr(child, "font"), attr(child, "char"));
    } else if (name === "br" || name === "cr") {
      flush();
      const type = attr(child, "type");
      if (type === "page") pieces.push({ kind: "break" });
      else pieces.push({ kind: "inline", node: { type: "hardBreak" } });
    } else if (name === "drawing") {
      flush();
      pieces.push(...drawingPieces(child, ctx));
    } else if (name === "pict" || name === "object") {
      flush();
      pieces.push(...pictPieces(child, ctx));
    } else if (name === "AlternateContent") {
      flush();
      const choice = kid(child, "Choice") ?? kid(child, "Fallback");
      const inner = choice ? kids(choice)[0] : undefined;
      if (inner?.localName === "drawing") pieces.push(...drawingPieces(inner, ctx));
      else if (inner) pieces.push(...pictPieces(inner, ctx));
    } else if (name === "footnoteReference" || name === "endnoteReference") {
      flush();
      const id = attr(child, "id") ?? "";
      const end = name === "endnoteReference";
      const text = (end ? ctx.endnotes : ctx.footnotes).get(id) ?? "";
      ctx.notes += 1;
      pieces.push({ kind: "inline", node: { type: "footnote", attrs: { n: 1, text, kind: end ? "end" : "foot" } } });
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
    } else if (name === "commentRangeStart") {
      ctx.active.add(attr(child, "id") ?? "");
    } else if (name === "commentRangeEnd") {
      ctx.active.delete(attr(child, "id") ?? "");
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
  // Los objetos anclados se colocan antes del texto de su párrafo, para que el texto los rodee.
  const anchors = pieces.filter((piece) => piece.kind === "anchor").map((piece) => ({ node: piece.node }));
  items.push(...anchors);
  for (const piece of pieces) {
    if (piece.kind === "anchor") continue;
    if (piece.kind === "inline") current.push(piece.node);
    else if (piece.kind === "image") {
      pushText(false);
      const imageAttrs = { ...(piece.node.attrs ?? {}), align: piece.node.attrs?.align && piece.node.attrs.align !== "left" ? piece.node.attrs.align : p.align === "center" || p.align === "right" ? p.align : "left" };
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
  // Las listas dentro de una celda se agrupan igual que en el cuerpo: así no se pierden sus viñetas.
  const items = blockItems(kids(cell), ctx).filter((item) => item.node.type !== "pageBreak");
  const nodes = groupLists(items);
  return nodes.length > 0 ? nodes : [{ type: "paragraph" }];
}

type Side = "top" | "left" | "bottom" | "right" | "insideH" | "insideV";
type BorderSpec = { width: number; color: string } | null; // null = sin borde

/** Un borde de Word (w:top, w:left…) como ancho en px y color; null si es nil/none. */
function borderOf(node: Element | null): BorderSpec | undefined {
  if (!node) return undefined;
  const val = attr(node, "val") ?? "single";
  if (val === "nil" || val === "none") return null;
  const eighths = Number(attr(node, "sz") ?? 4);
  const width = Math.max(1, Math.min(6, Math.round(((Number.isFinite(eighths) ? eighths : 4) / 8) * (96 / 72))));
  const color = attr(node, "color");
  return { width: val === "double" ? Math.max(3, width) : width, color: color && /^[0-9a-f]{6}$/i.test(color) ? `#${color.toLowerCase()}` : "#000000" };
}

function bordersOf(container: Element | null, target: Partial<Record<Side, BorderSpec>>) {
  if (!container) return target;
  const next = { ...target };
  for (const side of ["top", "left", "bottom", "right", "insideH", "insideV"] as const) {
    const alias = side === "left" ? "start" : side === "right" ? "end" : side;
    const value = borderOf(kid(container, side) ?? kid(container, alias));
    if (value !== undefined) next[side] = value;
  }
  return next;
}

function cellMarginOf(container: Element | null, target: Partial<Record<"top" | "left" | "bottom" | "right", number>>) {
  if (!container) return target;
  const next = { ...target };
  for (const side of ["top", "left", "bottom", "right"] as const) {
    const alias = side === "left" ? "start" : side === "right" ? "end" : side;
    const node = kid(container, side) ?? kid(container, alias);
    const w = Number(attr(node, "w"));
    if (node && Number.isFinite(w) && (attr(node, "type") ?? "dxa") === "dxa") next[side] = Math.max(0, Math.min(60, Math.round(w / 15)));
  }
  return next;
}

const cssBorder = (spec: BorderSpec | undefined) => (!spec ? "none" : `${spec.width}px solid ${spec.color}`);

function tableNode(table: Element, ctx: Ctx): JsonNode {
  const rows = kids(table, "tr");
  const tblPr = kid(table, "tblPr");
  const styleChain = ctx.styles.tablePr(attr(kid(tblPr, "tblStyle"), "val"));
  // Bordes y márgenes de celda: estilo de tabla → propiedades de la tabla → propiedades de la celda.
  let tableBorders: Partial<Record<Side, BorderSpec>> = {};
  let tableMar: Partial<Record<"top" | "left" | "bottom" | "right", number>> = {};
  for (const pr of [...styleChain, ...(tblPr ? [tblPr] : [])]) {
    tableBorders = bordersOf(kid(pr, "tblBorders"), tableBorders);
    tableMar = cellMarginOf(kid(pr, "tblCellMar"), tableMar);
  }
  // Anchos reales de la rejilla, ajustados al ancho útil de la hoja si lo superan (sin cortes ni desplazamiento).
  let grid = kids(kid(table, "tblGrid"), "gridCol").map((col) => Number(attr(col, "w") ?? 0) / 15);
  if (grid.length === 0 || grid.some((w) => !(w > 0))) {
    const tblW = kid(tblPr, "tblW");
    const total = (attr(tblW, "type") ?? "dxa") === "dxa" ? Number(attr(tblW, "w") ?? 0) / 15 : 0;
    const count = Math.max(...rows.map((row) => kids(row, "tc").reduce((n, tc) => n + Math.max(1, Number(attr(kid(kid(tc, "tcPr"), "gridSpan"), "val") ?? 1) || 1), 0)), 1);
    grid = total > 0 ? Array.from({ length: count }, () => total / count) : [];
  }
  const available = Math.max(120, ctx.contentWidthPx);
  const sum = grid.reduce((a, b) => a + b, 0);
  const scale = sum > available ? available / sum : 1;
  const cols = grid.map((w) => Math.max(24, Math.floor(w * scale)));
  const starts = new Map<string, JsonNode>();
  const out: JsonNode[] = [];
  rows.forEach((row, rowIndex) => {
    let column = 0;
    const header = onOff(kid(kid(row, "trPr"), "tblHeader")) === true;
    const cells: JsonNode[] = [];
    const tcs = kids(row, "tc");
    const gridBefore = Number(attr(kid(kid(row, "trPr"), "gridBefore"), "val") ?? 0) || 0;
    column += gridBefore;
    let columnTotal = 0;
    for (const tc of tcs) columnTotal += Math.max(1, Number(attr(kid(kid(tc, "tcPr"), "gridSpan"), "val") ?? 1) || 1);
    for (const cell of tcs) {
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
      const widths = cols.slice(column, column + span);
      const attrs: Record<string, unknown> = { colspan: span, rowspan: 1 };
      if (widths.length === span && widths.every((w) => w > 0)) attrs.colwidth = widths;
      if (fill && /^[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase() !== "ffffff") attrs.background = `#${fill.toLowerCase()}`;
      // Bordes: los de la celda mandan; si no, los exteriores o interiores de la tabla según su posición.
      const own = bordersOf(kid(tcPr, "tcBorders"), {});
      const first = column - gridBefore === 0;
      const last = column + span >= gridBefore + columnTotal;
      const pick = (side: "top" | "left" | "bottom" | "right"): BorderSpec | undefined => {
        if (own[side] !== undefined) return own[side];
        const outer = side === "top" ? rowIndex === 0 : side === "bottom" ? rowIndex === rows.length - 1 : side === "left" ? first : last;
        return outer ? tableBorders[side] : tableBorders[side === "top" || side === "bottom" ? "insideH" : "insideV"];
      };
      const sides = (["top", "right", "bottom", "left"] as const).map((side) => cssBorder(pick(side)));
      attrs.borders = sides.every((side) => side === sides[0]) ? sides[0] : sides.join("|");
      const mar = cellMarginOf(kid(tcPr, "tcMar"), tableMar);
      attrs.padding = [mar.top ?? 0, mar.right ?? 7, mar.bottom ?? 0, mar.left ?? 7].join(" ");
      const vAlign = attr(kid(tcPr, "vAlign"), "val");
      if (vAlign === "center" || vAlign === "bottom") attrs.valign = vAlign === "center" ? "middle" : "bottom";
      const node: JsonNode = { type: header ? "tableHeader" : "tableCell", attrs, content: cellNodes(cell, ctx) };
      if (mergeVal === "restart") starts.set(`${column}`, node);
      else starts.delete(`${column}`);
      cells.push(node);
      column += span;
    }
    if (cells.length > 0) out.push({ type: "tableRow", content: cells });
  });
  return {
    type: "table",
    content: out.length > 0 ? out : [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph" }] }] }],
  };
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

function notesOf(doc: Document | null, name: "footnote" | "endnote"): Map<string, string> {
  const out = new Map<string, string>();
  if (!doc) return out;
  for (const note of kids(doc.documentElement, name)) {
    const type = attr(note, "type");
    if (type === "separator" || type === "continuationSeparator" || type === "continuationNotice") continue;
    out.set(attr(note, "id") ?? "", blockText(note, " ").replace(/\s+/g, " ").trim().slice(0, 2000));
  }
  return out;
}

type RawComment = { id: string; author: string; date: string; body: string; paraId: string; parent?: string; done: boolean };

function commentsOf(doc: Document | null, extended: Document | null): RawComment[] {
  if (!doc) return [];
  const W14 = "http://schemas.microsoft.com/office/word/2010/wordml";
  const W15 = "http://schemas.microsoft.com/office/word/2012/wordml";
  const ext = new Map<string, { parent?: string; done: boolean }>();
  if (extended) {
    for (const node of Array.from(extended.getElementsByTagName("*")).filter((el) => el.localName === "commentEx")) {
      const paraId = node.getAttributeNS(W15, "paraId") ?? node.getAttribute("w15:paraId") ?? "";
      const parent = node.getAttributeNS(W15, "paraIdParent") ?? node.getAttribute("w15:paraIdParent") ?? undefined;
      const done = (node.getAttributeNS(W15, "done") ?? node.getAttribute("w15:done")) === "1";
      ext.set(paraId, { parent: parent || undefined, done });
    }
  }
  return kids(doc.documentElement, "comment").slice(0, 200).map((node) => {
    const paragraphs = descendants(node, "p");
    const last = paragraphs[paragraphs.length - 1];
    const paraId = last ? last.getAttributeNS(W14, "paraId") ?? last.getAttribute("w14:paraId") ?? "" : "";
    const info = ext.get(paraId);
    return {
      id: attr(node, "id") ?? "",
      author: (attr(node, "author") ?? "").slice(0, 80),
      date: attr(node, "date") ?? new Date().toISOString(),
      body: blockText(node).slice(0, 2000),
      paraId,
      parent: info?.parent,
      done: info?.done === true,
    };
  });
}

type SectInfo = { columns: number; orientation: "portrait" | "landscape"; margin: PageMargin; breakType: "nextPage" | "continuous"; left: number; right: number; width: number; height: number };

function sectInfo(sect: Element | null): SectInfo {
  const pgSz = kid(sect, "pgSz");
  const width = Number(attr(pgSz, "w") ?? 11906);
  const height = Number(attr(pgSz, "h") ?? 16838);
  const landscape = attr(pgSz, "orient") === "landscape" || width > height;
  const left = Number(attr(kid(sect, "pgMar"), "left") ?? 1440);
  const right = Number(attr(kid(sect, "pgMar"), "right") ?? left);
  const columns = Math.max(1, Math.min(3, Number(attr(kid(sect, "cols"), "num") ?? 1) || 1));
  const type = attr(kid(sect, "type"), "val");
  return {
    columns,
    orientation: landscape ? "landscape" : "portrait",
    margin: left <= 900 ? "narrow" : left >= 2000 ? "wide" : "normal",
    breakType: type === "continuous" ? "continuous" : "nextPage",
    left,
    right: Number.isFinite(right) ? right : left,
    width,
    height,
  };
}

export async function importDocx(bytes: Uint8Array): Promise<DocxImport> {
  const files = await unzip(bytes);
  reportImportProgress("parse", 1, 1);
  const main = "word/document.xml";
  const document = parseXml(files.get(main));
  if (!document) throw new WorkError("invalid-format");
  const body = kid(document.documentElement, "body");
  if (!body) throw new WorkError("invalid-format");
  const styles = new Styles(parseXml(files.get("word/styles.xml")));
  const rels = relsOf(files, main);
  const relPart = (type: string, fallback: string) => {
    for (const [, rel] of rels) if (!rel.external && rel.target.endsWith(type)) return rel.target;
    return fallback;
  };
  const rawComments = commentsOf(parseXml(files.get(relPart("comments.xml", "word/comments.xml"))), parseXml(files.get(relPart("commentsExtended.xml", "word/commentsExtended.xml"))));
  const byPara = new Map(rawComments.map((comment) => [comment.paraId, comment]));
  const topLevel = rawComments.filter((comment) => !comment.parent || !byPara.has(comment.parent));
  const finalSect = kids(body, "sectPr").pop() ?? null;
  const first = sectInfo(finalSect);
  const ctx: Ctx = {
    files,
    rels,
    styles,
    numbering: new Numbering(parseXml(files.get("word/numbering.xml"))),
    images: 0,
    base: { size: 11, font: "Arial" },
    footnotes: notesOf(parseXml(files.get(relPart("footnotes.xml", "word/footnotes.xml"))), "footnote"),
    endnotes: notesOf(parseXml(files.get(relPart("endnotes.xml", "word/endnotes.xml"))), "endnote"),
    commentIds: new Set(topLevel.map((comment) => comment.id)),
    active: new Set(),
    quotes: new Map(),
    marginLeftPx: Math.round(first.left / 15),
    contentWidthPx: Math.floor(((first.orientation === "landscape" ? Math.max(first.width, first.height) : Math.min(first.width, first.height)) - first.left - first.right) / 15),
    shapes: 0,
    notes: 0,
  };

  // Cada w:sectPr dentro de un párrafo cierra una sección; la última va al final del cuerpo.
  const groups: Array<{ elements: Element[]; sect: Element | null }> = [];
  let currentGroup: Element[] = [];
  for (const element of kids(body)) {
    if (element.localName === "sectPr") continue;
    currentGroup.push(element);
    const inner = element.localName === "p" ? kid(kid(element, "pPr"), "sectPr") : null;
    if (inner) {
      groups.push({ elements: currentGroup, sect: inner });
      currentGroup = [];
    }
  }
  groups.push({ elements: currentGroup, sect: finalSect });
  const sections = groups.map((group) => {
    const info = sectInfo(group.sect);
    ctx.marginLeftPx = Math.round(info.left / 15);
    ctx.contentWidthPx = Math.floor(((info.orientation === "landscape" ? Math.max(info.width, info.height) : Math.min(info.width, info.height)) - info.left - info.right) / 15);
    const items = blockItems(group.elements, ctx);
    return { info, items };
  });
  const trim = (items: Item[]) => {
    while (items.length > 0 && items[items.length - 1]!.node.type === "pageBreak") items.pop();
    return items;
  };
  let content: JsonNode[];
  let columns: 1 | 2 | 3 = 1;
  const docInfo = sections[0]!.info;
  if (sections.length === 1) {
    content = groupLists(trim(sections[0]!.items));
    columns = Math.max(1, Math.min(3, sections[0]!.info.columns)) as 1 | 2 | 3;
  } else {
    content = sections.flatMap(({ info, items }) => {
      const inner = groupLists(trim(items));
      return [{
        type: "section",
        attrs: { columns: info.columns, orientation: info.orientation, margin: info.margin, breakType: info.breakType },
        content: inner.length > 0 ? inner : [{ type: "paragraph" }],
      }];
    });
  }

  const comments: DocComment[] = topLevel.map((comment) => ({
    id: `c${comment.id}`,
    quote: (ctx.quotes.get(comment.id) ?? "").slice(0, 180),
    body: comment.body.slice(0, 2000),
    createdAt: comment.date,
    author: comment.author || undefined,
    resolved: comment.done,
    replies: rawComments.filter((reply) => reply.parent && reply.parent === comment.paraId).map((reply) => ({
      id: `c${reply.id}`,
      body: reply.body.slice(0, 2000),
      createdAt: reply.date,
      author: reply.author || undefined,
    })),
  }));

  const sect = finalSect ?? descendants(body, "sectPr").pop() ?? null;
  const pgSz = kid(sect, "pgSz");
  const width = Number(attr(pgSz, "w") ?? 11906);
  const height = Number(attr(pgSz, "h") ?? 16838);
  const shortSide = Math.min(width, height);
  const pageSize: PageSize = Math.abs(shortSide - 12240) < 120 ? "letter" : "a4";
  const pageMargin: PageMargin = docInfo.margin;
  const headerRef = kids(sect, "headerReference").find((ref) => attr(ref, "type") !== "first" && attr(ref, "type") !== "even") ?? kid(sect, "headerReference");
  const footerRef = kids(sect, "footerReference").find((ref) => attr(ref, "type") !== "first" && attr(ref, "type") !== "even") ?? kid(sect, "footerReference");
  const partOf = (ref: Element | null) => {
    const rid = ref?.getAttribute("r:id") ?? ref?.getAttributeNS(RNS, "id");
    const rel = rid ? ctx.rels.get(rid) : undefined;
    return rel ? parseXml(files.get(rel.target)) : null;
  };
  const headerDoc = partOf(headerRef);
  const footerDoc = partOf(footerRef);
  let docBody: JsonNode = { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
  if (ctx.pending && ctx.pending.size > 0) docBody = await storePending(docBody, ctx.pending);
  return {
    content: docBody,
    header: plainOf(headerDoc),
    footer: plainOf(footerDoc),
    pageNumber: hasPageField(headerDoc) || hasPageField(footerDoc),
    pageSize,
    pageOrientation: docInfo.orientation,
    pageMargin,
    ...(sections.length === 1 && ![720, 1440, 2160].includes(Math.round(docInfo.left)) && docInfo.left >= 144 && docInfo.left <= 4320 ? { pageMarginTw: Math.round(docInfo.left) } : {}),
    images: ctx.images,
    columns,
    comments,
    shapes: ctx.shapes,
    notes: ctx.notes,
    sections: sections.length,
  };
}

const PENDING = "orv-pending:";

export function reportImportProgress(phase: string, done: number, total: number) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ow-import-progress", { detail: { phase, done, total } }));
}

/** Guarda cada imagen una vez, como binario, y cambia las referencias provisionales por orv-asset:. */
async function storePending(doc: JsonNode, pending: Map<string, { bytes: Uint8Array; mime: string }>): Promise<JsonNode> {
  const map = new Map<string, string>();
  let done = 0;
  for (const [target, image] of pending) {
    try {
      map.set(target, await putAsset(image.bytes, image.mime));
    } catch {
      map.set(target, `data:${image.mime};base64,${toBase64(image.bytes)}`);
    }
    done += 1;
    reportImportProgress("images", done, pending.size);
  }
  const swap = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(swap);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        out[key] = key === "src" && typeof value === "string" && value.startsWith(PENDING) ? map.get(value.slice(PENDING.length)) ?? null : swap(value);
      }
      return out;
    }
    return node;
  };
  return swap(doc) as JsonNode;
}
