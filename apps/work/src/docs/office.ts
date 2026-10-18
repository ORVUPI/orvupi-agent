import { WorkError } from "../security/errors";
import { unzip } from "../sheets/zip";

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };

function xmlText(source: string): string {
  // Una sola pasada: "&amp;lt;" queda como "&lt;" y no se decodifica dos veces.
  return source.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => XML_ENTITIES[name] ?? "");
}

function paragraphs(xml: string, pattern: RegExp): string[] {
  return xml.split(/<w:p[\s>]/).slice(1).map((chunk) => {
    const parts = [...chunk.matchAll(pattern)].map((match) => xmlText(match[1] ?? ""));
    return parts.join("").replace(/\s+/g, " ").trim();
  }).filter(Boolean);
}

export async function docxParagraphs(bytes: Uint8Array): Promise<string[]> {
  const files = await unzip(bytes);
  const xml = files.get("word/document.xml");
  if (!xml) throw new WorkError("invalid-format");
  const text = new TextDecoder().decode(xml);
  const lines = paragraphs(text, /<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (lines.length === 0) throw new WorkError("invalid-format");
  return lines.slice(0, 400);
}

export async function pptxSlides(bytes: Uint8Array): Promise<Array<{ title: string; body: string }>> {
  const files = await unzip(bytes);
  const names = [...files.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => {
    const left = Number(/\d+/.exec(a)?.[0] ?? 0);
    const right = Number(/\d+/.exec(b)?.[0] ?? 0);
    return left - right;
  });
  if (names.length === 0) throw new WorkError("invalid-format");
  return names.slice(0, 40).map((name) => {
    const xml = new TextDecoder().decode(files.get(name) ?? new Uint8Array());
    const lines = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((match) => xmlText(match[1] ?? "").trim()).filter(Boolean);
    return {
      title: (lines[0] ?? "").slice(0, 180),
      body: lines.slice(1).join("\n").slice(0, 2000),
    };
  });
}
