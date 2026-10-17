import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
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

export function createExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    TextStyle,
    Color,
    FontSize,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
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
