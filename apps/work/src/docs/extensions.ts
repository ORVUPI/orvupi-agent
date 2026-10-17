import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TaskItem } from "@tiptap/extension-list/task-item";
import { TaskList } from "@tiptap/extension-list/task-list";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { TableKit } from "@tiptap/extension-table/kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontFamily, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import { Plugin } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { safeHref, safeImageSrc, sanitizeForeignHtml } from "../security/sanitize";

const HEX = /^#[0-9a-f]{6}$/i;

const LocalImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => safeImageSrc(element.getAttribute("src") ?? ""),
        renderHTML: (attributes: { src?: string | null }) => {
          const src = typeof attributes.src === "string" ? safeImageSrc(attributes.src) : null;
          return src ? { src } : {};
        },
      },
    };
  },
}).configure({ allowBase64: true });

const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "hr.ow-page-break" }],
  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(HTMLAttributes, { class: "ow-page-break" })];
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

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

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
      };
    },
  });
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
              });
            } catch {
              // The node view is not mounted on the first synchronous pass.
            }
          };
          queueMicrotask(paint);
          return { update: paint };
        },
      }),
    );
    return plugins;
  },
}).configure({ resizable: true, cellMinWidth: 48, handleWidth: 6 });

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
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    LineHeight.configure({ types: ["heading", "paragraph"] }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Indent,
    DocKeys,
    TaskList,
    TaskItem.configure({ nested: true }),
    PageBreak,
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
