import type { FileKind } from "../storage/types";

/** Prefijo donde vive Work: "" en la raíz, "/work" en orvupi.com/work/. */
export const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

export function withBase(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export type EditorKind = "doc" | "sheet" | "slide" | "form" | "drawing" | "note";

const TOOLS: Record<EditorKind, { segment: string; product: string; favicon: string; view: "docs" | "sheets" | "slides" | "forms" | "drawings" | "notes" }> = {
  doc: { segment: "document", product: "ORVUPI Docs", favicon: withBase("/favicons/docs.svg"), view: "docs" },
  sheet: { segment: "spreadsheets", product: "ORVUPI Sheets", favicon: withBase("/favicons/sheets.svg"), view: "sheets" },
  slide: { segment: "presentation", product: "ORVUPI Slides", favicon: withBase("/favicons/slides.svg"), view: "slides" },
  form: { segment: "forms", product: "ORVUPI Forms", favicon: withBase("/favicons/forms.svg"), view: "forms" },
  drawing: { segment: "drawings", product: "ORVUPI Drawings", favicon: withBase("/favicons/drawings.svg"), view: "drawings" },
  note: { segment: "notes", product: "ORVUPI Notes", favicon: withBase("/favicons/notes.svg"), view: "notes" },
};

const SEGMENT = Object.fromEntries(Object.entries(TOOLS).map(([kind, tool]) => [tool.segment, kind])) as Record<string, EditorKind>;

export const STUDIO_DESIGN_MIME = "application/vnd.orvupi.design+json";

export function editorKind(kind: FileKind): EditorKind | null {
  if (kind === "doc" || kind === "sheet" || kind === "slide" || kind === "form" || kind === "drawing" || kind === "note") return kind;
  return null;
}

/** El diseño nativo vuelve a Studio con el id en la URL. El documento no viaja en la dirección. */
export function studioDesignPath(file: { id: string; mime?: string; kind?: FileKind }): string | null {
  if (file.mime !== STUDIO_DESIGN_MIME || !file.id || file.id.includes("/") || file.id.includes("..")) return null;
  return `/studio/#/work/${encodeURIComponent(file.id)}`;
}

export function editorPath(kind: EditorKind, id: string): string {
  return `${BASE}/${TOOLS[kind].segment}/d/${encodeURIComponent(id)}/edit`;
}

export function parseEditorPath(pathname: string): { kind: EditorKind; id: string } | null {
  if (BASE && pathname.startsWith(`${BASE}/`)) pathname = pathname.slice(BASE.length);
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

/** Huella de web/v2/assets/orvupi/avatar.png. La pestaña no debe reutilizar el icono anterior. */
export const WORK_TAB_ICON_VERSION = "352f34d8";

export function workTabIcon(): string {
  return `${withBase("/favicon-32.png")}?v=${WORK_TAB_ICON_VERSION}`;
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
  const path = favicon.split("?")[0] ?? favicon;
  link.type = path.endsWith(".svg") ? "image/svg+xml" : "image/png";
  link.href = favicon;
}

export function openEditorWindow(kind: EditorKind, id: string): Window | null {
  const here = parseEditorPath(window.location.pathname);
  if (here?.kind === kind && here.id === id) return null;
  return window.open(editorPath(kind, id), "_blank");
}
