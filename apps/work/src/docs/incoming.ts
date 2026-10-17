import { encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { ALLOWED_IMPORT_EXTENSIONS, extensionOf, isBlockedExtension, MAX_FILE_BYTES } from "../security/limits";
import { createId, sanitizeName } from "../security/names";
import { htmlToDoc, textToDoc } from "./import-html";
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
  return new Uint8Array(await file.arrayBuffer());
}

export async function prepareImport(file: File, titleFallback: string): Promise<PreparedImport> {
  const bytes = await readFile(file);
  const extension = extensionOf(file.name);
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, "") || titleFallback);
  if (extension === "orvdoc" || extension === "json") {
    const parsed = parseOrvdoc(bytes);
    const id = createId();
    const next = createOrvdoc({ id, title: parsed.title || base, content: parsed.content, now: new Date().toISOString() });
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
  return { name: base, kind: "other", mime: file.type || "application/octet-stream", bytes, openAsDoc: false };
}

export function utf8(text: string): Uint8Array {
  return encodeUtf8(text);
}
