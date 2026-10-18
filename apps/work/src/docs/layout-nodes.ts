import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Objetos de maquetación de Word en el editor de ORVUPI Work:
 * - docShape: cuadros de texto y formas (rectángulo, rectángulo redondeado, elipse) con texto editable,
 *   ajuste de texto y desplazamiento.
 * - section: sección con columnas, orientación y márgenes propios (equivale a w:sectPr).
 * - comment: marca que ancla un comentario del margen a un tramo de texto.
 * - wrapAttributes: ajuste de texto y desplazamiento de imágenes y formas.
 * - NoteNumbering: renumera notas al pie y notas finales por orden de aparición.
 */

export type Wrap = "inline" | "square" | "topBottom" | "behind" | "front";
export const WRAPS: Wrap[] = ["inline", "square", "topBottom", "behind", "front"];
export type ShapeKind = "textbox" | "rect" | "roundRect" | "ellipse";
export const SHAPES: ShapeKind[] = ["textbox", "rect", "roundRect", "ellipse"];
const HEX = /^#[0-9a-f]{6}$/i;

export function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export function safeWrap(value: unknown): Wrap {
  return WRAPS.includes(value as Wrap) ? (value as Wrap) : "inline";
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && (HEX.test(value) || value === "none") ? value.toLowerCase() : fallback;
}

/** Atributos compartidos por imágenes y formas: ajuste de texto y desplazamiento (px). */
export function wrapAttributes() {
  return {
    wrap: {
      default: "inline",
      parseHTML: (element: HTMLElement) => safeWrap(element.getAttribute("data-wrap")),
      renderHTML: (attributes: { wrap?: string }) => (safeWrap(attributes.wrap) === "inline" ? {} : { "data-wrap": safeWrap(attributes.wrap) }),
    },
    offsetX: {
      default: 0,
      parseHTML: (element: HTMLElement) => clampNum(element.getAttribute("data-ox"), -2000, 2000, 0),
      renderHTML: (attributes: { offsetX?: number }) => {
        const value = clampNum(attributes.offsetX, -2000, 2000, 0);
        return value ? { "data-ox": String(value), style: `--ox: ${value}px` } : {};
      },
    },
    offsetY: {
      default: 0,
      parseHTML: (element: HTMLElement) => clampNum(element.getAttribute("data-oy"), -2000, 2000, 0),
      renderHTML: (attributes: { offsetY?: number }) => {
        const value = clampNum(attributes.offsetY, -2000, 2000, 0);
        return value ? { "data-oy": String(value), style: `--oy: ${value}px` } : {};
      },
    },
  };
}

function applyShapeStyle(dom: HTMLElement, attrs: Record<string, unknown>) {
  const shape = SHAPES.includes(attrs.shape as ShapeKind) ? (attrs.shape as ShapeKind) : "textbox";
  const wrap = safeWrap(attrs.wrap);
  dom.className = `ow-shape is-${shape}`;
  dom.dataset.shape = shape;
  if (wrap === "inline") delete dom.dataset.wrap;
  else dom.dataset.wrap = wrap;
  const align = attrs.align === "right" || attrs.align === "center" ? String(attrs.align) : "left";
  if (align === "left") delete dom.dataset.align;
  else dom.dataset.align = align;
  const fill = safeColor(attrs.fill, "none");
  const stroke = safeColor(attrs.stroke, "#102032");
  dom.style.width = `${clampNum(attrs.width, 16, 1600, 240)}px`;
  dom.style.minHeight = `${clampNum(attrs.height, 16, 2400, 96)}px`;
  dom.style.background = fill === "none" ? "transparent" : fill;
  dom.style.borderColor = stroke === "none" ? "transparent" : stroke;
  const ox = clampNum(attrs.offsetX, -2000, 2000, 0);
  const oy = clampNum(attrs.offsetY, -2000, 2000, 0);
  dom.style.setProperty("--ox", `${ox}px`);
  dom.style.setProperty("--oy", `${oy}px`);
  if (ox) dom.dataset.ox = String(ox);
  else delete dom.dataset.ox;
  if (oy) dom.dataset.oy = String(oy);
  else delete dom.dataset.oy;
}

/** Cuadro de texto o forma con texto propio. El texto se edita dentro de la forma. */
export const DocShape = Node.create({
  name: "docShape",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      shape: { default: "textbox", parseHTML: (element: HTMLElement) => (SHAPES.includes(element.getAttribute("data-shape") as ShapeKind) ? element.getAttribute("data-shape") : "textbox") },
      width: { default: 240, parseHTML: (element: HTMLElement) => clampNum(element.getAttribute("data-w"), 16, 1600, 240) },
      height: { default: 96, parseHTML: (element: HTMLElement) => clampNum(element.getAttribute("data-h"), 16, 2400, 96) },
      fill: { default: "none", parseHTML: (element: HTMLElement) => safeColor(element.getAttribute("data-fill"), "none") },
      stroke: { default: "#102032", parseHTML: (element: HTMLElement) => safeColor(element.getAttribute("data-stroke"), "#102032") },
      text: { default: "", parseHTML: (element: HTMLElement) => (element.textContent ?? "").slice(0, 4000) },
      align: { default: "left" },
      ...wrapAttributes(),
    };
  },
  parseHTML: () => [{ tag: "div.ow-shape" }],
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs;
    return ["div", mergeAttributes(HTMLAttributes, {
      class: `ow-shape is-${a.shape}`,
      "data-shape": a.shape,
      "data-w": String(a.width),
      "data-h": String(a.height),
      "data-fill": a.fill,
      "data-stroke": a.stroke,
    }), ["div", { class: "ow-shape-text" }, String(a.text ?? "")]];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement("div");
      const text = document.createElement("div");
      text.className = "ow-shape-text";
      text.contentEditable = editor.isEditable ? "true" : "false";
      text.spellcheck = true;
      text.setAttribute("role", "textbox");
      text.setAttribute("aria-multiline", "true");
      text.setAttribute("aria-label", current.attrs.shape === "textbox" ? "Cuadro de texto" : "Texto de la forma");
      text.innerText = String(current.attrs.text ?? "");
      dom.append(text);
      applyShapeStyle(dom, current.attrs);
      let timer = 0;
      const commit = () => {
        timer = 0;
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (typeof pos !== "number") return;
        const value = text.innerText.replace(/\n$/, "").slice(0, 4000);
        if (value === current.attrs.text) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, text: value }));
      };
      text.addEventListener("input", () => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(commit, 250);
      });
      text.addEventListener("blur", () => {
        if (timer) window.clearTimeout(timer);
        commit();
      });
      return {
        dom,
        update(next: ProseNode) {
          if (next.type !== current.type) return false;
          current = next;
          applyShapeStyle(dom, next.attrs);
          if (document.activeElement !== text && text.innerText !== next.attrs.text) text.innerText = String(next.attrs.text ?? "");
          return true;
        },
        stopEvent: (event: Event) => event.target instanceof globalThis.Node && text.contains(event.target),
        ignoreMutation: () => true,
        destroy() {
          if (timer) {
            window.clearTimeout(timer);
            commit();
          }
        },
      };
    };
  },
});

export type SectionAttrs = { columns: number; orientation: "portrait" | "landscape"; margin: "normal" | "narrow" | "wide"; breakType: "nextPage" | "continuous" };

/** Sección de Word: columnas, orientación y márgenes propios. Empieza en hoja nueva o seguida. */
export const Section = Node.create({
  name: "section",
  group: "block",
  content: "block+",
  defining: true,
  isolating: false,
  addAttributes() {
    return {
      columns: { default: 1, parseHTML: (element: HTMLElement) => clampNum(element.getAttribute("data-cols"), 1, 3, 1), renderHTML: (a: { columns?: number }) => ({ "data-cols": String(clampNum(a.columns, 1, 3, 1)) }) },
      orientation: { default: "portrait", parseHTML: (element: HTMLElement) => (element.getAttribute("data-orient") === "landscape" ? "landscape" : "portrait"), renderHTML: (a: { orientation?: string }) => ({ "data-orient": a.orientation === "landscape" ? "landscape" : "portrait" }) },
      margin: { default: "normal", parseHTML: (element: HTMLElement) => { const v = element.getAttribute("data-margin"); return v === "narrow" || v === "wide" ? v : "normal"; }, renderHTML: (a: { margin?: string }) => ({ "data-margin": a.margin === "narrow" || a.margin === "wide" ? a.margin : "normal" }) },
      breakType: { default: "nextPage", parseHTML: (element: HTMLElement) => (element.getAttribute("data-break") === "continuous" ? "continuous" : "nextPage"), renderHTML: (a: { breakType?: string }) => ({ "data-break": a.breakType === "continuous" ? "continuous" : "nextPage" }) },
    };
  },
  parseHTML: () => [{ tag: "section.ow-sect" }],
  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { class: "ow-sect" }), 0];
  },
});

/** Marca del comentario: resalta el texto comentado y lo une a la tarjeta del margen. */
export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  excludes: "",
  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element: HTMLElement) => (element.getAttribute("data-cid") ?? "").slice(0, 80),
        renderHTML: (a: { id?: string }) => ({ "data-cid": String(a.id ?? "").slice(0, 80) }),
      },
    };
  },
  parseHTML: () => [{ tag: "span.ow-cmt[data-cid]" }],
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ow-cmt" }), 0];
  },
});

export const noteNumberingKey = new PluginKey("ow-note-numbering");

/** Las notas al pie y las notas finales se numeran solas, cada tipo por su lado, en orden. */
function renumber(state: import("@tiptap/pm/state").EditorState) {
  const tr = state.tr;
  const counters = { foot: 0, end: 0 };
  state.doc.descendants((node, pos) => {
    if (node.type.name !== "footnote") return;
    const kind = node.attrs.kind === "end" ? "end" : "foot";
    counters[kind] += 1;
    if (node.attrs.n !== counters[kind]) tr.setNodeMarkup(pos, undefined, { ...node.attrs, n: counters[kind] });
  });
  return tr.steps.length > 0 ? tr.setMeta("addToHistory", false) : null;
}

export const NoteNumbering = Extension.create({
  name: "noteNumbering",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: noteNumberingKey,
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          return renumber(state);
        },
        view(view) {
          // El contenido inicial no pasa por appendTransaction: se numera al montar.
          queueMicrotask(() => {
            if (view.isDestroyed) return;
            const tr = renumber(view.state);
            if (tr) view.dispatch(tr);
          });
          return {};
        },
      }),
    ];
  },
});

/** Envuelve en una sección los bloques de la selección o cambia la sección en la que está el cursor. */
export function sectionRangeInfo(doc: ProseNode, from: number): { pos: number; node: ProseNode } | null {
  const $from = doc.resolve(from);
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "section") return { pos: $from.before(depth), node };
  }
  return null;
}
