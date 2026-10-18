import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { emptyDoc, type DocComment, type DocVersion, type JsonNode, type OrvdocFile } from "./model";

export type { OrvdocFile };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNode(value: unknown): value is JsonNode {
  return isRecord(value) && typeof value.type === "string";
}

export function createOrvdoc(input: { id: string; title: string; content?: JsonNode; now?: string }): OrvdocFile {
  const stamp = input.now ?? new Date().toISOString();
  return {
    format: "orvupi-doc",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    createdAt: stamp,
    updatedAt: stamp,
    content: input.content ?? emptyDoc(),
    header: "",
    footer: "",
    comments: [],
    versions: [],
    columns: 1,
    dropCap: false,
    watermark: "",
    pageNumber: false,
    pageSize: "a4",
    pageOrientation: "portrait",
    pageMargin: "normal",
  };
}

function commentsOf(value: unknown): DocComment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.body !== "string") return [];
    const replies = Array.isArray(entry.replies) ? entry.replies.slice(0, 50).flatMap((reply) => {
      if (!isRecord(reply) || typeof reply.id !== "string" || typeof reply.body !== "string") return [];
      return [{
        id: reply.id.slice(0, 80),
        body: reply.body.slice(0, 2000),
        createdAt: typeof reply.createdAt === "string" ? reply.createdAt : new Date().toISOString(),
        ...(typeof reply.author === "string" && reply.author ? { author: reply.author.slice(0, 80) } : {}),
      }];
    }) : [];
    return [{
      id: entry.id.slice(0, 80),
      quote: typeof entry.quote === "string" ? entry.quote.slice(0, 180) : "",
      body: entry.body.slice(0, 2000),
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
      ...(typeof entry.author === "string" && entry.author ? { author: entry.author.slice(0, 80) } : {}),
      ...(entry.resolved === true ? { resolved: true } : {}),
      ...(replies.length > 0 ? { replies } : {}),
    }];
  });
}

function versionsOf(value: unknown): DocVersion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-20).flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !isNode(entry.content) || entry.content.type !== "doc") return [];
    return [{
      id: entry.id.slice(0, 80),
      at: typeof entry.at === "string" ? entry.at : new Date().toISOString(),
      title: typeof entry.title === "string" ? entry.title.slice(0, 180) : "",
      content: entry.content,
    }];
  });
}

export function serializeOrvdoc(file: OrvdocFile): Uint8Array {
  return encodeUtf8(JSON.stringify(file));
}

export function parseOrvdoc(bytes: Uint8Array | string): OrvdocFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed)) throw new WorkError("invalid-format");
  if (parsed.format !== "orvupi-doc") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string") throw new WorkError("invalid-format");
  if (!isNode(parsed.content) || parsed.content.type !== "doc") throw new WorkError("invalid-format");
  return {
    format: "orvupi-doc",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    content: parsed.content,
    header: typeof parsed.header === "string" ? parsed.header.slice(0, 240) : "",
    footer: typeof parsed.footer === "string" ? parsed.footer.slice(0, 240) : "",
    comments: commentsOf(parsed.comments),
    versions: versionsOf(parsed.versions),
    columns: parsed.columns === 2 || parsed.columns === 3 ? parsed.columns : 1,
    dropCap: parsed.dropCap === true,
    watermark: typeof parsed.watermark === "string" ? parsed.watermark.slice(0, 40) : "",
    pageNumber: parsed.pageNumber === true,
    pageSize: parsed.pageSize === "letter" ? "letter" : "a4",
    pageOrientation: parsed.pageOrientation === "landscape" ? "landscape" : "portrait",
    pageMargin: parsed.pageMargin === "narrow" || parsed.pageMargin === "wide" ? parsed.pageMargin : "normal",
  };
}

export function withContent(file: OrvdocFile, content: JsonNode, title: string, updatedAt: string): OrvdocFile {
  return { ...file, content, title: sanitizeName(title), updatedAt };
}
