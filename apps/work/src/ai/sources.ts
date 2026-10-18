import { docToText } from "../docs/model";
import { parseOrvdoc } from "../docs/orvdoc";
import { combinedContent } from "../docs/tabs";
import { parseSheet } from "../sheets/model";
import { gridToCsv } from "../sheets/csv";
import { parseSlides } from "../slides/model";
import { parseNote } from "../notes/model";
import type { FileRecord, StorageService } from "../storage/types";

/** Archivos de Work que la IA puede leer (todo se lee en el propio navegador). */
export const AI_KINDS = new Set(["doc", "sheet", "slide", "note"]);

export function aiFiles(files: readonly FileRecord[]): FileRecord[] {
  return files.filter((file) => !file.deletedAt && AI_KINDS.has(file.kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Texto plano de un archivo de Work: documento (todas las pestañas), hoja (CSV por pestaña), presentación (diapositivas) o nota. */
export function textOfBytes(kind: string, bytes: Uint8Array): string {
  if (kind === "doc") {
    const file = parseOrvdoc(bytes);
    const tabs = file.tabs && file.tabs.length > 1 ? file.tabs.map((tab, i) => (i === 0 ? { ...tab, content: file.content } : tab)) : null;
    return docToText(tabs ? combinedContent(tabs) : file.content).trim();
  }
  if (kind === "sheet") {
    const sheet = parseSheet(bytes);
    return sheet.sheets.map((tab) => `## ${tab.name}\n${gridToCsv(tab.cells).trim()}`).join("\n\n").trim();
  }
  if (kind === "slide") {
    const slides = parseSlides(bytes);
    return slides.slides.map((slide, i) => {
      const texts = slide.items.flatMap((item) => (item.kind === "text" && item.text.trim() ? [item.text.trim()] : []));
      const notes = slide.notes?.trim() ? `\nNotas: ${slide.notes.trim()}` : "";
      return `Diapositiva ${i + 1}: ${texts.join("\n")}${notes}`;
    }).join("\n\n").trim();
  }
  if (kind === "note") {
    const note = parseNote(bytes);
    return [note.title, note.body, ...note.checks.map((check) => `${check.done ? "[x]" : "[ ]"} ${check.text}`)].filter(Boolean).join("\n").trim();
  }
  return new TextDecoder().decode(bytes).trim();
}

export async function textOfFile(storage: StorageService, id: string): Promise<{ name: string; kind: string; text: string }> {
  const loaded = await storage.loadFile(id);
  return { name: loaded.record.name, kind: loaded.record.kind, text: textOfBytes(loaded.record.kind, loaded.bytes) };
}
