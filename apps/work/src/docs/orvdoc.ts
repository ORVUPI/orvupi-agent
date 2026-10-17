import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { emptyDoc, type JsonNode, type OrvdocFile } from "./model";

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
  };
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
  };
}

export function withContent(file: OrvdocFile, content: JsonNode, title: string, updatedAt: string): OrvdocFile {
  return { ...file, content, title: sanitizeName(title), updatedAt };
}
