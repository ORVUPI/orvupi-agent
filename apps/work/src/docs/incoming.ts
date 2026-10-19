import { encodeUtf8 } from "../security/bytes";
import { externalizeImages } from "../storage/assets";
import { ensureRoom } from "../storage/quota";
import { reportImportProgress } from "./docx-import";
import { WorkError } from "../security/errors";
import { ALLOWED_IMPORT_EXTENSIONS, extensionOf, isBlockedExtension, MAX_FILE_BYTES } from "../security/limits";
import { createId, sanitizeName } from "../security/names";
import { csvToGrid } from "../sheets/csv";
import { createSheetFile, serializeSheet } from "../sheets/model";
import { xlsxToSheets } from "../sheets/xlsx";
import { createSlidesFile, defaultItems, serializeSlides, type SlidesFile } from "../slides/model";
import { htmlToDoc, textToDoc } from "./import-html";
import { importDocx } from "./docx-import";
import { docxParagraphs, pptxSlides } from "./office";
import { createOrvdoc, parseOrvdoc, serializeOrvdoc } from "./orvdoc";
import type { FileKind } from "../storage/types";

export type PreparedImport = {
  name: string;
  kind: FileKind;
  mime: string;
  bytes: Uint8Array;
  openAsDoc: boolean;
};

async function readFile(file: File): Promise<Uint8Array> {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new WorkError("too-large");
  if (isBlockedExtension(file.name) || !ALLOWED_IMPORT_EXTENSIONS.has(extensionOf(file.name))) {
    throw new WorkError("unsupported-type");
  }
  // Antes de leer: ¿cabe en la cuota real del navegador? (el original y sus imágenes)
  await ensureRoom(Math.round(file.size * 1.1) + 1024 * 1024);
  reportImportProgress("read", 0, 1);
  return new Uint8Array(await file.arrayBuffer());
}

export async function prepareImport(file: File, titleFallback: string): Promise<PreparedImport> {
  const bytes = await readFile(file);
  const extension = extensionOf(file.name);
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, "") || titleFallback);
  if (extension === "orvdoc" || extension === "json") {
    const parsed = parseOrvdoc(bytes);
    const id = createId();
    const next = createOrvdoc({ id, title: parsed.title || base, content: await externalizeImages(parsed.content), now: new Date().toISOString() });
    if (parsed.tabs && parsed.tabs.length > 0) {
      const tabs = [];
      for (const tab of parsed.tabs) tabs.push(tab.content ? { ...tab, content: await externalizeImages(tab.content) } : tab);
      next.tabs = tabs;
    }
    return { name: next.title, kind: "doc", mime: "application/vnd.orvupi.doc+json", bytes: serializeOrvdoc(next), openAsDoc: true };
  }
  if (extension === "txt" || extension === "text" || extension === "md") {
    const doc = createOrvdoc({ id: createId(), title: base, content: textToDoc(new TextDecoder().decode(bytes)) });
    return { name: doc.title, kind: "doc", mime: "application/vnd.orvupi.doc+json", bytes: serializeOrvdoc(doc), openAsDoc: true };
  }
  if (extension === "html" || extension === "htm") {
    const doc = createOrvdoc({ id: createId(), title: base, content: htmlToDoc(new TextDecoder().decode(bytes)) });
    return { name: doc.title, kind: "doc", mime: "application/vnd.orvupi.doc+json", bytes: serializeOrvdoc(doc), openAsDoc: true };
  }
  if (extension === "pdf") {
    return { name: base, kind: "pdf", mime: "application/pdf", bytes, openAsDoc: false };
  }
  if (extension === "docx") {
    let doc;
    try {
      const imported = await importDocx(bytes);
      doc = {
        ...createOrvdoc({ id: createId(), title: base, content: imported.content }),
        header: imported.header,
        footer: imported.footer,
        pageNumber: imported.pageNumber,
        pageSize: imported.pageSize,
        pageOrientation: imported.pageOrientation,
        pageMargin: imported.pageMargin,
        ...(imported.pageMarginTw ? { pageMarginTw: imported.pageMarginTw } : {}),
        columns: imported.columns,
        comments: imported.comments,
      };
    } catch {
      // Respaldo: solo el texto, si el XML no se puede interpretar.
      const lines = await docxParagraphs(bytes);
      doc = createOrvdoc({ id: createId(), title: base, content: textToDoc(lines.join("\n\n")) });
    }
    return { name: doc.title, kind: "doc", mime: "application/vnd.orvupi.doc+json", bytes: serializeOrvdoc(doc), openAsDoc: true };
  }
  if (extension === "pptx") {
    const blank = createSlidesFile({ id: createId(), title: base });
    let file: SlidesFile;
    try {
      // Importación real: formas, texto con formato, imágenes, tablas, notas y fondos.
      const { importPptx } = await import("../slides/pptx");
      const imported = await importPptx(bytes);
      file = { ...blank, slides: imported.slides };
    } catch {
      // Respaldo: solo títulos y texto, si el paquete no se puede interpretar.
      const imported = await pptxSlides(bytes);
      file = {
        ...blank,
        slides: imported.map((slide) => ({
          title: slide.title,
          body: slide.body,
          theme: "papel",
          items: defaultItems(slide.title, slide.body),
          notes: "",
          transition: "none",
          layout: "title-body",
        })),
      };
    }
    return { name: file.title, kind: "slide", mime: "application/vnd.orvupi.slides+json", bytes: serializeSlides(file), openAsDoc: false };
  }
  if (extension === "csv" || extension === "xlsx") {
    const id = createId();
    const sheets = extension === "xlsx" ? await xlsxToSheets(bytes) : [{ name: "Hoja 1", cells: csvToGrid(new TextDecoder().decode(bytes)), freezeHeader: true }];
    const sheet = createSheetFile({ id, title: base, sheets });
    return { name: sheet.title, kind: "sheet", mime: "application/vnd.orvupi.sheet+json", bytes: serializeSheet(sheet), openAsDoc: false };
  }
  return { name: base, kind: "other", mime: file.type || "application/octet-stream", bytes, openAsDoc: false };
}

export function utf8(text: string): Uint8Array {
  return encodeUtf8(text);
}
