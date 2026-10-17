import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";

export const SLIDE_THEMES = ["papel", "tinta", "bosque", "rosa"] as const;
export type SlideTheme = (typeof SLIDE_THEMES)[number];
export const SLIDE_FILLS = ["#fff8ec", "#ffffff", "#102032", "#ff3070", "#0b5d36", "#1d4e89", "#fff0f5", "#e5f6ee"] as const;

export type SlideItem =
  | { id: string; kind: "text"; x: number; y: number; w: number; h: number; text: string }
  | { id: string; kind: "shape"; x: number; y: number; w: number; h: number; shape: "rect" | "ellipse"; fill: string }
  | { id: string; kind: "image"; x: number; y: number; w: number; h: number; src: string };

export type Slide = {
  title: string;
  body: string;
  theme: SlideTheme;
  items: SlideItem[];
};

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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function defaultItems(title: string, body: string): SlideItem[] {
  return [
    { id: "title", kind: "text", x: 48, y: 56, w: 720, h: 88, text: title },
    { id: "body", kind: "text", x: 48, y: 168, w: 720, h: 240, text: body },
  ];
}

function themeOf(value: unknown): SlideTheme {
  return SLIDE_THEMES.includes(value as SlideTheme) ? (value as SlideTheme) : "papel";
}

function itemOf(value: unknown): SlideItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const x = clamp(Number(value.x), 0, 900);
  const y = clamp(Number(value.y), 0, 560);
  const w = clamp(Number(value.w), 40, 860);
  const h = clamp(Number(value.h), 28, 520);
  const id = value.id.slice(0, 40);
  if (value.kind === "text") {
    return { id, kind: "text", x, y, w, h, text: typeof value.text === "string" ? value.text.slice(0, 4000) : "" };
  }
  if (value.kind === "shape") {
    const fill = SLIDE_FILLS.includes(value.fill as (typeof SLIDE_FILLS)[number]) ? String(value.fill) : "#ff3070";
    return { id, kind: "shape", x, y, w, h, shape: value.shape === "ellipse" ? "ellipse" : "rect", fill };
  }
  if (value.kind === "image" && typeof value.src === "string" && value.src.startsWith("data:image/") && value.src.length < 2_800_000) {
    return { id, kind: "image", x, y, w, h, src: value.src };
  }
  return null;
}

function slideOf(entry: unknown): Slide | null {
  if (!isRecord(entry)) return null;
  const title = typeof entry.title === "string" ? entry.title.slice(0, 180) : "";
  const body = typeof entry.body === "string" ? entry.body.slice(0, 4000) : "";
  const parsed = Array.isArray(entry.items) ? entry.items.flatMap((item) => {
    const next = itemOf(item);
    return next ? [next] : [];
  }) : [];
  const items = parsed.length > 0 ? parsed.slice(0, 24) : defaultItems(title, body);
  const titleItem = items.find((item) => item.id === "title" && item.kind === "text");
  const bodyItem = items.find((item) => item.id === "body" && item.kind === "text");
  return {
    title: titleItem && titleItem.kind === "text" ? titleItem.text.slice(0, 180) : title,
    body: bodyItem && bodyItem.kind === "text" ? bodyItem.text.slice(0, 4000) : body,
    theme: themeOf(entry.theme),
    items,
  };
}

export function syncSlideText(slide: Slide): Slide {
  const title = slide.items.find((item) => item.id === "title" && item.kind === "text");
  const body = slide.items.find((item) => item.id === "body" && item.kind === "text");
  return {
    ...slide,
    title: title && title.kind === "text" ? title.text.slice(0, 180) : slide.title,
    body: body && body.kind === "text" ? body.text.slice(0, 4000) : slide.body,
  };
}

export function createSlidesFile(input: { id: string; title: string }): SlidesFile {
  return {
    format: "orvupi-slides",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    slides: [{ title: "", body: "", theme: "papel", items: defaultItems("", "") }],
  };
}

export function serializeSlides(file: SlidesFile): Uint8Array {
  const slides = file.slides.map(syncSlideText);
  return encodeUtf8(JSON.stringify({ ...file, slides }));
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
    const slide = slideOf(entry);
    return slide ? [slide] : [];
  });
  return {
    format: "orvupi-slides",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    slides: slides.length > 0 ? slides : [{ title: "", body: "", theme: "papel", items: defaultItems("", "") }],
  };
}
