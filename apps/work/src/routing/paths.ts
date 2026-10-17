import type { FileKind } from "../storage/types";

export type EditorKind = "doc" | "sheet" | "slide" | "form" | "drawing" | "note";

const TOOLS: Record<EditorKind, { segment: string; product: string; favicon: string; view: "docs" | "sheets" | "slides" | "forms" | "drawings" | "notes" }> = {
  doc: { segment: "document", product: "ORVUPI Docs", favicon: "/favicons/docs.svg", view: "docs" },
  sheet: { segment: "spreadsheets", product: "ORVUPI Sheets", favicon: "/favicons/sheets.svg", view: "sheets" },
  slide: { segment: "presentation", product: "ORVUPI Slides", favicon: "/favicons/slides.svg", view: "slides" },
  form: { segment: "forms", product: "ORVUPI Forms", favicon: "/favicons/forms.svg", view: "forms" },
  drawing: { segment: "drawings", product: "ORVUPI Drawings", favicon: "/favicons/drawings.svg", view: "drawings" },
  note: { segment: "notes", product: "ORVUPI Notes", favicon: "/favicons/notes.svg", view: "notes" },
};

const SEGMENT = Object.fromEntries(Object.entries(TOOLS).map(([kind, tool]) => [tool.segment, kind])) as Record<string, EditorKind>;

export function editorKind(kind: FileKind): EditorKind | null {
  if (kind === "doc" || kind === "sheet" || kind === "slide" || kind === "form" || kind === "drawing" || kind === "note") return kind;
  return null;
}

export function editorPath(kind: EditorKind, id: string): string {
  return `/${TOOLS[kind].segment}/d/${encodeURIComponent(id)}/edit`;
}

export function parseEditorPath(pathname: string): { kind: EditorKind; id: string } | null {
  const match = pathname.match(/^\/(document|spreadsheets|presentation|forms|drawings|notes)\/d\/([^/]+)\/edit\/?$/);
  if (!match) return null;
  const kind = SEGMENT[match[1] ?? ""];
  const id = decodeURIComponent(match[2] ?? "");
  if (!kind || !id || id.includes("..") || id.includes("/")) return null;
  return { kind, id };
}

export function toolProduct(kind: EditorKind): string {
  return TOOLS[kind].product;
}

export function toolFavicon(kind: EditorKind): string {
  return TOOLS[kind].favicon;
}

export function viewForKind(kind: EditorKind): "docs" | "sheets" | "slides" | "forms" | "drawings" | "notes" {
  return TOOLS[kind].view;
}

export function tabTitle(name: string, kind: EditorKind): string {
  const clean = name.trim();
  const product = toolProduct(kind);
  return clean ? `${clean} - ${product}` : product;
}

export function applyDocumentChrome(title: string, favicon: string): void {
  if (typeof document === "undefined") return;
  document.title = title;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
  link.href = favicon;
}

export function openEditorWindow(kind: EditorKind, id: string): Window | null {
  const here = parseEditorPath(window.location.pathname);
  if (here?.kind === kind && here.id === id) return null;
  return window.open(editorPath(kind, id), "_blank");
}
