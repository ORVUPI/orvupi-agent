import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";
import { SLIDE_FILLS, type SlideItem } from "../slides/model";

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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function itemOf(value: unknown): SlideItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const x = clamp(Number(value.x), 0, 960);
  const y = clamp(Number(value.y), 0, 640);
  const w = clamp(Number(value.w), 40, 900);
  const h = clamp(Number(value.h), 28, 600);
  const id = value.id.slice(0, 40);
  if (value.kind === "text") {
    return { id, kind: "text", x, y, w, h, text: typeof value.text === "string" ? value.text.slice(0, 4000) : "" };
  }
  if (value.kind === "shape") {
    const fill = SLIDE_FILLS.includes(value.fill as (typeof SLIDE_FILLS)[number]) ? String(value.fill) : "#1d4e89";
    return { id, kind: "shape", x, y, w, h, shape: value.shape === "ellipse" ? "ellipse" : "rect", fill };
  }
  if (value.kind === "image" && typeof value.src === "string" && value.src.startsWith("data:image/") && value.src.length < 2_800_000) {
    return { id, kind: "image", x, y, w, h, src: value.src };
  }
  return null;
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
    const item = itemOf(entry);
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
