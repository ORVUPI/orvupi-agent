import { Node, mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TaskItem } from "@tiptap/extension-list/task-item";
import { TaskList } from "@tiptap/extension-list/task-list";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontFamily, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import { StarterKit } from "@tiptap/starter-kit";
import { safeHref, safeImageSrc, sanitizeForeignHtml } from "../security/sanitize";

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
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
  ];
}

export function pastedHtml(html: string): string {
  return sanitizeForeignHtml(html);
}
