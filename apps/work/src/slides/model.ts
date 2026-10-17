import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";

export type Slide = { title: string; body: string };

export type SlidesFile = {
  format: "orvupi-slides";
  version: 1;
  id: string;
  title: string;
  slides: Slide[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createSlidesFile(input: { id: string; title: string }): SlidesFile {
  return {
    format: "orvupi-slides",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    slides: [{ title: "", body: "" }],
  };
}

export function serializeSlides(file: SlidesFile): Uint8Array {
  return encodeUtf8(JSON.stringify(file));
}

export function parseSlides(bytes: Uint8Array | string): SlidesFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-slides") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string" || !Array.isArray(parsed.slides)) {
    throw new WorkError("invalid-format");
  }
  const slides = parsed.slides.slice(0, 30).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    return [{ title: typeof entry.title === "string" ? entry.title.slice(0, 180) : "", body: typeof entry.body === "string" ? entry.body.slice(0, 4000) : "" }];
  });
  return {
    format: "orvupi-slides",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    slides: slides.length > 0 ? slides : [{ title: "", body: "" }],
  };
}
