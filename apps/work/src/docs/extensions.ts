import { Extension, Mark, Node, getStyleProperty, mergeAttributes } from "@tiptap/core";
import { Code } from "@tiptap/extension-code";
import { Image } from "@tiptap/extension-image";
import { TaskItem } from "@tiptap/extension-list/task-item";
import { TaskList } from "@tiptap/extension-list/task-list";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { TableKit } from "@tiptap/extension-table/kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontFamily, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Mark as ProseMark, type Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { safeHref, safeImageSrc, sanitizeForeignHtml } from "../security/sanitize";
import { headingEntries, jumpToHeading } from "./jump";
import { DocChart, DocDrawing, Equation } from "./objects";
import { ImagePaste } from "./image-paste";
import { Pagination } from "./pagination";
import { assetUrl, isAssetSrc } from "../storage/assets";
import { CommentMark, DocShape, NoteNumbering, Section, wrapAttributes } from "./layout-nodes";

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Las imágenes «Detrás»/«Delante» no ocupan sitio en el flujo: fuera del modo paginado el editor crece
 * hasta la imagen más baja para que nunca quede fuera del documento (y se pueda seguir moviendo).
 */
const reserveFloating = new Plugin({
  key: new PluginKey("owImageReserve"),
  view: (view) => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const dom = view.dom as HTMLElement;
      if (!dom.isConnected || dom.closest(".is-paged")) {
        dom.style.removeProperty("--ow-reserve");
        return;
      }
      const top = dom.getBoundingClientRect().top;
      let need = 0;
      for (const img of Array.from(dom.querySelectorAll<HTMLElement>('img[data-wrap="behind"], img[data-wrap="front"]'))) need = Math.max(need, img.getBoundingClientRect().bottom - top);
      const next = need > 0 ? `${Math.ceil(need + (parseFloat(getComputedStyle(dom).paddingBottom) || 0))}px` : "";
      if (dom.style.getPropertyValue("--ow-reserve") !== next) {
        if (next) dom.style.setProperty("--ow-reserve", next);
        else dom.style.removeProperty("--ow-reserve");
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const onLoad = () => schedule();
    view.dom.addEventListener("load", onLoad, true);
    return {
      update: schedule,
      destroy: () => {
        if (frame) cancelAnimationFrame(frame);
        view.dom.removeEventListener("load", onLoad, true);
      },
    };
  },
});

const LocalImage = Image.extend({
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), reserveFloating];
  },
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => safeImageSrc(element.getAttribute("data-asset") ?? "") ?? safeImageSrc(element.getAttribute("src") ?? ""),
        renderHTML: (attributes: { src?: string | null }) => {
          const src = typeof attributes.src === "string" ? safeImageSrc(attributes.src) : null;
          // Imagen guardada aparte: el original vive en OPFS/IndexedDB y se pinta con una copia reducida.
          if (src && isAssetSrc(src)) return { "data-asset": src, src: BLANK_GIF };
          return src ? { src } : {};
        },
      },
      align: {
        default: "left",
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-align");
          return value === "center" || value === "right" ? value : "left";
        },
        renderHTML: (attributes: { align?: string }) => {
          const align = attributes.align === "center" || attributes.align === "right" ? attributes.align : "left";
          return align === "left" ? {} : { "data-align": align };
        },
      },
      ...wrapAttributes(),
    };
  },
  addNodeView() {
    return ({ HTMLAttributes }) => {
      const dom = document.createElement("img");
      const apply = (attrs: Record<string, unknown>) => {
        for (const name of Array.from(dom.getAttributeNames())) if (name !== "src" || !attrs.src) dom.removeAttribute(name);
        for (const [name, value] of Object.entries(attrs)) {
          if (value === null || value === undefined || value === false) continue;
          if (name === "src" && dom.dataset.loaded === String(attrs["data-asset"] ?? "")) continue;
          dom.setAttribute(name, String(value));
        }
        // La proporción guardada manda sobre la natural: un estirado por un lado se mantiene al soltar.
        const w = Number(attrs.width);
        const h = Number(attrs.height);
        if (w > 0 && h > 0) dom.style.aspectRatio = `${w} / ${h}`;
        else dom.style.removeProperty("aspect-ratio");
        const asset = attrs["data-asset"];
        if (typeof asset === "string" && dom.dataset.loaded !== asset) {
          dom.dataset.loaded = asset;
          dom.setAttribute("data-asset", asset);
          // Si ya se cargó antes (p. ej. al mover la imagen se recrea el nodo), se pinta al instante: sin destello.
          const known = LOADED_ASSETS.get(asset);
          if (known) dom.src = known;
          else
            void assetUrl(asset).then((url) => {
              if (!url) return;
              LOADED_ASSETS.set(asset, url);
              if (dom.dataset.loaded === asset) dom.src = url;
            });
        } else if (typeof asset !== "string") delete dom.dataset.loaded;
      };
      apply(HTMLAttributes);
      return {
        dom,
        update: (node) => {
          if (node.type.name !== "image") return false;
          const attrs = node.type.spec.toDOM?.(node) as unknown;
          const next = Array.isArray(attrs) && attrs[1] && typeof attrs[1] === "object" ? (attrs[1] as Record<string, unknown>) : {};
          apply(next);
          return true;
        },
        ignoreMutation: () => true,
      };
    };
  },
}).configure({ allowBase64: true });

/** URL ya resueltas de imágenes guardadas aparte (asset → blob:). */
const LOADED_ASSETS = new Map<string, string>();

const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "hr.ow-page-break" }],
  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(HTMLAttributes, { class: "ow-page-break" })];
  },
  addNodeView() {
    return ({ editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "ow-break";
      dom.setAttribute("contenteditable", "false");
      const rule = document.createElement("hr");
      rule.className = "ow-page-break";
      const head = document.createElement("p");
      head.className = "ow-break-head";
      const num = document.createElement("span");
      num.className = "ow-break-num";
      const foot = document.createElement("p");
      foot.className = "ow-break-foot";
      const paint = () => {
        let root: Element | null = null;
        try {
          root = editor.view.dom.closest(".ow-docs");
        } catch {
          // Al abrir un documento que ya tiene saltos, la vista aún no está montada.
          setTimeout(() => { if (!editor.isDestroyed) paint(); }, 0);
          return;
        }
        const edges = root?.querySelectorAll<HTMLInputElement>(".ow-a4-edge") ?? [];
        head.textContent = edges[0]?.value ?? "";
        foot.textContent = edges[1]?.value ?? "";
        const numbered = root?.querySelector(".ow-page-num") != null;
        const pos = getPos();
        let page = 2;
        if (typeof pos === "number") {
          page = 2;
          editor.state.doc.nodesBetween(0, pos, (node) => {
            if (node.type.name === "pageBreak") page += 1;
          });
        }
        num.textContent = numbered ? String(page) : "";
        num.hidden = !numbered;
      };
      paint();
      editor.on("update", paint);
      editor.on("selectionUpdate", paint);
      dom.append(rule, head, num, foot);
      return {
        dom,
        update() {
          paint();
          return true;
        },
        destroy() {
          editor.off("update", paint);
          editor.off("selectionUpdate", paint);
        },
      };
    };
  },
  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

const SubscriptMark = Mark.create({
  name: "subscript",
  excludes: "superscript",
  parseHTML() {
    return [{ tag: "sub" }, { style: "vertical-align=sub" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSubscript: () => ({ commands }) => commands.toggleMark(this.name),
    };
  },
});

const SuperscriptMark = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML() {
    return [
      {
        tag: "sup",
        getAttrs: (element: HTMLElement) => (element.classList.contains("ow-fn") ? false : null),
      },
      { style: "vertical-align=super" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleSuperscript: () => ({ commands }) => commands.toggleMark(this.name),
    };
  },
});

const Contents = Node.create({
  name: "contents",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "nav.ow-contents" }],
  renderHTML({ HTMLAttributes }) {
    return ["nav", mergeAttributes(HTMLAttributes, { class: "ow-contents" })];
  },
  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement("nav");
      dom.className = "ow-contents";
      dom.setAttribute("contenteditable", "false");
      const paint = () => {
        const title = document.documentElement.lang === "en" ? "Contents" : "Índice";
        dom.replaceChildren();
        const strong = document.createElement("strong");
        strong.textContent = title;
        dom.append(strong);
        headingEntries(editor).forEach((entry, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = entry.text;
          button.addEventListener("mousedown", (event) => event.preventDefault());
          button.addEventListener("click", () => jumpToHeading(editor, index));
          dom.append(button);
        });
      };
      paint();
      editor.on("update", paint);
      return {
        dom,
        update() {
          paint();
          return true;
        },
        destroy() {
          editor.off("update", paint);
        },
      };
    };
  },
  addCommands() {
    return {
      insertContents: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },
});

const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      n: {
        default: 1,
        parseHTML: (element: HTMLElement) => {
          const value = Number(element.getAttribute("data-n"));
          return Number.isFinite(value) && value > 0 ? Math.min(999, Math.round(value)) : 1;
        },
        renderHTML: (attributes: { n?: number }) => ({ "data-n": String(attributes.n ?? 1) }),
      },
      text: {
        default: "",
        parseHTML: (element: HTMLElement) => (element.getAttribute("data-text") ?? "").replace(/\s+/g, " ").trim().slice(0, 2000),
        renderHTML: (attributes: { text?: string }) => ({ "data-text": String(attributes.text ?? "").slice(0, 2000) }),
      },
      kind: {
        default: "foot",
        parseHTML: (element: HTMLElement) => (element.getAttribute("data-kind") === "end" ? "end" : "foot"),
        renderHTML: (attributes: { kind?: string }) => (attributes.kind === "end" ? { "data-kind": "end" } : {}),
      },
    };
  },
  parseHTML: () => [{ tag: "sup.ow-fn" }],
  renderHTML({ HTMLAttributes, node }) {
    const n = Number(node.attrs.n ?? 1);
    const label = node.attrs.kind === "end" ? toRoman(n) : String(n);
    return ["sup", mergeAttributes(HTMLAttributes, { class: node.attrs.kind === "end" ? "ow-fn is-end" : "ow-fn", title: String(node.attrs.text ?? "").slice(0, 200) }), label];
  },
});

/** Las notas finales se numeran i, ii, iii como en Word. */
/** Tamaño de letra con una variable --ow-pt (en puntos) para que el modo móvil lo escale igual que el cuerpo. */
const ScaledFontSize = FontSize.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => getStyleProperty(element, "font-size") ?? (element.style.fontSize || null),
            renderHTML: (attributes: Record<string, unknown>) => {
              const raw = typeof attributes.fontSize === "string" ? attributes.fontSize.trim() : "";
              const match = /^(\d+(?:\.\d+)?)(pt|px)$/.exec(raw);
              if (!match) return raw && /^[\w.%\s-]+$/.test(raw) ? { style: `font-size: ${raw}` } : {};
              const pt = match[2] === "px" ? Number(match[1]) * 0.75 : Number(match[1]);
              return { style: `font-size: ${raw}; --ow-pt: ${Math.round(pt * 100) / 100}` };
            },
          },
        },
      },
    ];
  },
});

export function toRoman(value: number): string {
  let n = Math.max(1, Math.min(3999, Math.round(value)));
  const table: Array<[number, string]> = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [size, letter] of table) while (n >= size) { out += letter; n -= size; }
  return out;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
    subscript: {
      toggleSubscript: () => ReturnType;
    };
    superscript: {
      toggleSuperscript: () => ReturnType;
    };
    contents: {
      insertContents: () => ReturnType;
    };
  }
}

function points(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 200 ? Math.round(n) : null;
}

/** Espaciado anterior y posterior del párrafo (pt), como en Word y Google Docs. */
const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          spaceBefore: {
            default: null,
            parseHTML: (element: HTMLElement) => points(element.getAttribute("data-space-before")),
            renderHTML: (attributes: { spaceBefore?: number | null }) => {
              const value = points(attributes.spaceBefore);
              return value === null ? {} : { "data-space-before": String(value), style: `margin-top: ${value}pt` };
            },
          },
          spaceAfter: {
            default: null,
            parseHTML: (element: HTMLElement) => points(element.getAttribute("data-space-after")),
            renderHTML: (attributes: { spaceAfter?: number | null }) => {
              const value = points(attributes.spaceAfter);
              return value === null ? {} : { "data-space-after": String(value), style: `margin-bottom: ${value}pt` };
            },
          },
        },
      },
    ];
  },
});

const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-indent") ?? 0) || 0,
            renderHTML: (attributes: { indent?: number }) => {
              const indent = Number(attributes.indent ?? 0);
              if (!indent) return {};
              return { "data-indent": String(indent), style: `margin-left: ${indent * 36}px` };
            },
          },
        },
      },
    ];
  },
});

const BORDER_SIDE = /^(none|[1-6]px solid #[0-9a-f]{6})$/i;

/** Bordes de celda: «none», «Npx solid #rrggbb» o cuatro lados (arriba|derecha|abajo|izquierda). */
export function cellBorders(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 120) return null;
  const sides = value.split("|");
  if ((sides.length !== 1 && sides.length !== 4) || !sides.every((side) => BORDER_SIDE.test(side))) return null;
  return value;
}

/** Relleno de celda en px: «arriba derecha abajo izquierda». */
export function cellPadding(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{1,2} \d{1,2} \d{1,2} \d{1,2}$/.test(value)) return null;
  return value;
}

function paintCell<T extends typeof TableCell>(node: T) {
  return node.extend({
    addAttributes() {
      return {
        ...(this.parent?.() ?? {}),
        background: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const value = element.style.backgroundColor;
            return HEX.test(value) ? value : null;
          },
          renderHTML: (attributes: { background?: string | null }) => {
            const background = attributes.background ?? "";
            if (!HEX.test(background)) return {};
            return { style: `background-color: ${background}` };
          },
        },
        // Bordes, relleno y alineación vertical del documento original (DOCX importado).
        borders: {
          default: null,
          parseHTML: (element: HTMLElement) => cellBorders(element.getAttribute("data-borders")),
          renderHTML: (attributes: { borders?: string | null }) => {
            const value = cellBorders(attributes.borders);
            if (!value) return {};
            const sides = value.split("|");
            const [top, right, bottom, left] = sides.length === 4 ? sides : [value, value, value, value];
            return { "data-borders": value, style: `border-top: ${top}; border-right: ${right}; border-bottom: ${bottom}; border-left: ${left}` };
          },
        },
        padding: {
          default: null,
          parseHTML: (element: HTMLElement) => cellPadding(element.getAttribute("data-padding")),
          renderHTML: (attributes: { padding?: string | null }) => {
            const value = cellPadding(attributes.padding);
            if (!value) return {};
            return { "data-padding": value, style: `padding: ${value.split(" ").map((n) => `${n}px`).join(" ")}` };
          },
        },
        valign: {
          default: null,
          parseHTML: (element: HTMLElement) => { const v = element.getAttribute("data-valign"); return v === "middle" || v === "bottom" ? v : null; },
          renderHTML: (attributes: { valign?: string | null }) => (attributes.valign === "middle" || attributes.valign === "bottom" ? { "data-valign": attributes.valign, style: `vertical-align: ${attributes.valign}` } : {}),
        },
      };
    },
  });
}

/**
 * Una tabla nunca es más ancha que la hoja: si sus columnas suman más que el ancho disponible
 * se pintan en proporción (porcentajes) al 100 %, sin desplazador horizontal ni cortes.
 * Solo cambia la vista: los anchos guardados no se tocan.
 */
export function fitTable(table: HTMLTableElement) {
  const holder = table.parentElement;
  const cols = Array.from(table.querySelectorAll(":scope > colgroup > col")) as HTMLTableColElement[];
  if (!holder || cols.length === 0) return;
  const avail = holder.clientWidth;
  if (!(avail > 0)) return;
  const px = cols.map((col) => {
    const raw = col.dataset.px ?? (col.style.width.endsWith("px") ? col.style.width : "");
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  });
  // Si el TableView ha vuelto a poner px, se toman como referencia nueva.
  cols.forEach((col, index) => { if (col.style.width.endsWith("px")) col.dataset.px = col.style.width; else if (!col.dataset.px && px[index]) col.dataset.px = `${px[index]}px`; });
  const total = px.reduce((a, b) => a + b, 0);
  const known = px.every((w) => w > 0);
  if (known && total > avail + 0.5) {
    cols.forEach((col, index) => { col.style.width = `${((px[index]! / total) * 100).toFixed(4)}%`; });
    table.style.width = "100%";
    table.style.minWidth = "";
    table.dataset.fit = "1";
  } else if (table.dataset.fit === "1") {
    cols.forEach((col, index) => { if (px[index]) col.style.width = `${px[index]}px`; });
    if (known) table.style.width = `${total}px`;
    delete table.dataset.fit;
  }
}

const DocsTable = Table.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      borderColor: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-border") ?? "";
          return HEX.test(value) ? value : null;
        },
        renderHTML: (attributes: { borderColor?: string | null }) => {
          const borderColor = attributes.borderColor ?? "";
          if (!HEX.test(borderColor)) return {};
          return { "data-border": borderColor };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    const plugins = this.parent?.() ?? [];
    plugins.push(
      new Plugin({
        view: (view) => {
          const paint = () => {
            try {
              view.state.doc.descendants((node, pos) => {
                if (node.type.name !== "table") return;
                const dom = view.nodeDOM(pos);
                const table = dom instanceof HTMLTableElement ? dom : dom instanceof HTMLElement ? dom.querySelector("table") : null;
                if (!(table instanceof HTMLTableElement)) return;
                const color = node.attrs.borderColor;
                if (typeof color === "string" && HEX.test(color)) table.style.setProperty("--table-border", color);
                else table.style.removeProperty("--table-border");
                fitTable(table);
              });
            } catch {
              // The node view is not mounted on the first synchronous pass.
            }
          };
          queueMicrotask(paint);
          // Al cambiar el ancho (girar el móvil, abrir paneles, zoom) se vuelve a ajustar.
          let frame = 0;
          const again = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(paint); };
          const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(again) : null;
          observer?.observe(view.dom);
          window.addEventListener("resize", again);
          requestAnimationFrame(paint);
          return { update: paint, destroy: () => { observer?.disconnect(); window.removeEventListener("resize", again); cancelAnimationFrame(frame); } };
        },
      }),
    );
    return plugins;
  },
}).configure({ resizable: true, cellMinWidth: 48, handleWidth: 6 });

const ALLOWED_FONTS = new Set(["arial", "times new roman", "georgia", "verdana", "courier new", "comic sans ms", "roboto", "inter", "lora", "merriweather", "montserrat"]);

function fontToken(value: string | null | undefined): string {
  return value?.replace(/["']/g, "").split(",")[0]?.trim().toLowerCase() ?? "";
}

/** El corrector de Chrome en Android envuelve cada letra con monoespacio y morado. */
function spellPurple(value: string): boolean {
  const color = value.trim().toLowerCase().replace(/\s+/g, "");
  return color === "purple" || color === "rgb(128,0,128)" || color === "rgba(128,0,128,1)";
}

function injectedMonospace(value: string): boolean {
  const name = fontToken(value);
  if (!name || ALLOWED_FONTS.has(name)) return false;
  return /mono|consolas|menlo|monaco|source code|courier/.test(name);
}

function browserInk(element: HTMLElement): boolean {
  const font = getStyleProperty(element, "font-family") ?? element.style.fontFamily;
  const color = getStyleProperty(element, "color") ?? element.style.color;
  return Boolean((font && injectedMonospace(font)) || (color && spellPurple(color)));
}

const SafeFontFamily = FontFamily.extend({
  addGlobalAttributes() {
    return (this.parent?.() ?? []).map((group) => ({
      ...group,
      attributes: {
        ...group.attributes,
        fontFamily: {
          ...group.attributes.fontFamily,
          parseHTML: (element: HTMLElement) => {
            const raw = getStyleProperty(element, "font-family") ?? element.style.fontFamily;
            const name = fontToken(raw);
            return raw && ALLOWED_FONTS.has(name) ? raw : null;
          },
        },
      },
    }));
  },
});

const SafeColor = Color.extend({
  addGlobalAttributes() {
    return (this.parent?.() ?? []).map((group) => ({
      ...group,
      attributes: {
        ...group.attributes,
        color: {
          ...group.attributes.color,
          parseHTML: (element: HTMLElement) => {
            const value = (getStyleProperty(element, "color") ?? element.style.color)?.replace(/['"]+/g, "");
            if (!value || spellPurple(value)) return null;
            return value;
          },
        },
      },
    }));
  },
});

const SafeCode = Code.extend({
  parseHTML() {
    return [
      {
        tag: "code",
        getAttrs: (element: HTMLElement) => (browserInk(element) ? false : null),
      },
    ];
  },
});

const SolidUnderline = Underline.extend({
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: "ow-ul" }), 0];
  },
  parseHTML() {
    return [
      { tag: "span.ow-ul" },
      { tag: "u" },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style: string) => (style.includes("underline") ? {} : false),
      },
    ];
  },
});

function sameMarks(left: readonly ProseMark[], right: readonly ProseMark[]): boolean {
  if (left.length !== right.length) return false;
  const sort = (marks: readonly ProseMark[]) => [...marks].sort((a, b) => a.type.name.localeCompare(b.type.name));
  const a = sort(left);
  const b = sort(right);
  return a.every((mark, index) => mark.eq(b[index]!));
}

function cleanedMarks(marks: readonly ProseMark[]): readonly ProseMark[] {
  const next: ProseMark[] = [];
  for (const mark of marks) {
    if (mark.type.name !== "textStyle") {
      next.push(mark);
      continue;
    }
    const fontFamily = typeof mark.attrs.fontFamily === "string" ? mark.attrs.fontFamily : null;
    const color = typeof mark.attrs.color === "string" ? mark.attrs.color : null;
    const attrs = { ...mark.attrs };
    if (fontFamily && injectedMonospace(fontFamily)) attrs.fontFamily = null;
    if (color && spellPurple(color)) attrs.color = null;
    if (Object.values(attrs).every((value) => value == null || value === "")) continue;
    next.push(mark.type.create(attrs));
  }
  return ProseMark.setFrom(next);
}

function normalizeBlock(node: ProseNode): ProseNode[] | null {
  if (!node.isTextblock) return null;
  const children: ProseNode[] = [];
  let dirty = false;
  node.forEach((child) => {
    if (!child.isText) {
      children.push(child);
      return;
    }
    const marks = cleanedMarks(child.marks);
    const text = child.text ?? "";
    const previous = children[children.length - 1];
    if (previous?.isText && sameMarks(previous.marks, marks)) {
      children[children.length - 1] = node.type.schema.text(`${previous.text ?? ""}${text}`, marks);
      dirty = true;
      return;
    }
    if (!sameMarks(marks, child.marks)) dirty = true;
    children.push(sameMarks(marks, child.marks) ? child : node.type.schema.text(text, marks));
  });
  return dirty ? children : null;
}

const hygieneKey = new PluginKey("ow-mark-hygiene");

const MarkHygiene = Extension.create({
  name: "markHygiene",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: hygieneKey,
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          if (transactions.some((transaction) => transaction.getMeta(hygieneKey))) return null;
          const tr = state.tr;
          const jobs: Array<{ from: number; to: number; children: ProseNode[] }> = [];
          state.doc.descendants((node, pos) => {
            const children = normalizeBlock(node);
            if (!children) return;
            jobs.push({ from: pos + 1, to: pos + node.nodeSize - 1, children });
          });
          if (jobs.length === 0) return null;
          for (const job of jobs.reverse()) tr.replaceWith(job.from, job.to, job.children);
          if (!tr.docChanged) return null;
          tr.setMeta(hygieneKey, true);
          return tr;
        },
      }),
    ];
  },
});

const DocKeys = Extension.create({
  name: "docKeys",
  addKeyboardShortcuts() {
    const strike = () => this.editor.commands.toggleStrike();
    return {
      "Alt-Shift-5": strike,
      "Alt-Shift-%": strike,
    };
  },
});

export function createExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: false,
      underline: false,
      code: false,
    }),
    SolidUnderline,
    SubscriptMark,
    SuperscriptMark,
    SafeCode,
    TextStyle,
    SafeColor,
    BackgroundColor,
    SafeFontFamily,
    ScaledFontSize,
    LineHeight.configure({ types: ["heading", "paragraph"] }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Indent,
    ParagraphSpacing,
    Pagination,
    ImagePaste,
    DocKeys,
    MarkHygiene,
    TaskList,
    TaskItem.configure({ nested: true }),
    PageBreak,
    Contents,
    Footnote,
    NoteNumbering,
    DocShape,
    Section,
    CommentMark,
    Equation,
    DocChart,
    DocDrawing,
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false,
      defaultProtocol: "https",
      HTMLAttributes: { rel: "noopener noreferrer" },
      isAllowedUri: (url) => safeHref(url) !== null,
    }),
    LocalImage,
    TableKit.configure({ table: false, tableCell: false, tableHeader: false }),
    DocsTable,
    paintCell(TableCell),
    paintCell(TableHeader),
    Placeholder.configure({ placeholder }),
  ];
}

export function pastedHtml(html: string): string {
  return sanitizeForeignHtml(html);
}
