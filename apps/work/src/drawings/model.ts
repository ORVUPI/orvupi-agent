import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { itemOf, type SlideItem } from "../slides/model";

export type DrawingFile = {
  format: "orvupi-drawing";
  version: 1;
  id: string;
  title: string;
  items: SlideItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function drawingItem(value: unknown): SlideItem | null {
  return itemOf(value, { maxX: 960, maxY: 640, maxW: 900, maxH: 600, minH: 28 });
}

export function createDrawingFile(input: { id: string; title: string }): DrawingFile {
  return {
    format: "orvupi-drawing",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    items: [],
  };
}

export function serializeDrawing(file: DrawingFile): Uint8Array {
  return encodeUtf8(JSON.stringify({ ...file, items: file.items.slice(0, 40) }));
}

export function parseDrawing(bytes: Uint8Array | string): DrawingFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-drawing") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string") throw new WorkError("invalid-format");
  const items = Array.isArray(parsed.items) ? parsed.items.flatMap((entry) => {
    const item = drawingItem(entry);
    return item ? [item] : [];
  }).slice(0, 40) : [];
  return {
    format: "orvupi-drawing",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    items,
  };
}
