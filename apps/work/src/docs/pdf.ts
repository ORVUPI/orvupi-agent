import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { safeImageSrc } from "../security/sanitize";
import { blocksFromDoc, type Block, type Inline, type JsonNode } from "./model";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;

const REPLACEMENTS: Record<string, string> = {
  "\u2026": "...",
  "\u2014": "-",
  "\u2013": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u00a0": " ",
};

function pdfSafe(font: PDFFont, text: string): string {
  let output = "";
  for (const char of text) {
    const mapped = REPLACEMENTS[char] ?? char;
    for (const piece of mapped) {
      try {
        font.encodeText(piece);
        output += piece;
      } catch {
        output += "?";
      }
    }
  }
  return output;
}

function hexColor(value: string | undefined): ReturnType<typeof rgb> {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return rgb(0.063, 0.125, 0.196);
  const r = Number.parseInt(value.slice(1, 3), 16) / 255;
  const g = Number.parseInt(value.slice(3, 5), 16) / 255;
  const b = Number.parseInt(value.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const safe = pdfSafe(font, text);
  if (!safe) return [""];
  const lines: string[] = [];
  for (const paragraph of safe.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words.length > 0 ? words : [""]) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const char of word) {
        const next = chunk + char;
        if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else chunk = next;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont };

function pickFont(fonts: Fonts, inline: Inline): PDFFont {
  if (inline.type !== "text") return fonts.regular;
  if (inline.bold && inline.italic) return fonts.boldItalic;
  if (inline.bold) return fonts.bold;
  if (inline.italic) return fonts.italic;
  return fonts.regular;
}

export async function exportPdf(title: string, doc: JsonNode, header = "", footer = ""): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer("ORVUPI Work");
  pdf.setCreator("ORVUPI Work");
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  const ensure = (height: number): PDFPage => {
    if (y - height < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    return page;
  };

  const drawLines = (lines: string[], size: number, font: PDFFont, color = rgb(0.063, 0.125, 0.196)) => {
    const leading = size * 1.35;
    for (const line of lines) {
      ensure(leading);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      y -= leading;
    }
  };

  drawLines(wrap(fonts.bold, title, 22, maxWidth), 22, fonts.bold);
  if (header.trim()) drawLines(wrap(fonts.italic, header, 10, maxWidth), 10, fonts.italic);
  y -= 8;

  const drawInlines = (inlines: Inline[], size: number) => {
    const text = inlines.map((inline) => (inline.type === "text" ? inline.text : inline.alt)).join("");
    const styled = inlines.find((inline) => inline.type === "text");
    const font = pickFont(fonts, styled ?? { type: "text", text: "" });
    const color = hexColor(styled?.type === "text" ? styled.color : undefined);
    drawLines(wrap(font, text, size, maxWidth), size, font, color);
  };

  const drawBlock = async (block: Block) => {
    if (block.type === "h1") drawInlines(block.inlines, 20);
    else if (block.type === "h2") drawInlines(block.inlines, 16);
    else if (block.type === "h3") drawInlines(block.inlines, 14);
    else if (block.type === "paragraph" || block.type === "quote") drawInlines(block.inlines, 12);
    else if (block.type === "bullet" || block.type === "ordered") {
      block.items.forEach((item, index) => {
        const prefix = block.type === "bullet" ? "• " : `${index + 1}. `;
        const text = prefix + item.map((inline) => (inline.type === "text" ? inline.text : inline.alt)).join("");
        drawLines(wrap(fonts.regular, text, 12, maxWidth), 12, fonts.regular);
      });
    } else if (block.type === "checklist") {
      for (const item of block.items) {
        const text = `${item.checked ? "[x] " : "[ ] "}` + item.inlines.map((inline) => (inline.type === "text" ? inline.text : inline.alt)).join("");
        drawLines(wrap(fonts.regular, text, 12, maxWidth), 12, fonts.regular);
      }
    } else if (block.type === "pageBreak") {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    } else if (block.type === "table") {
      for (const row of block.rows) {
        drawLines(wrap(fonts.regular, row.join("  |  "), 11, maxWidth), 11, fonts.regular);
      }
    } else if (block.type === "image") {
      await drawImage(block.src, 180);
    }
    y -= 8;
  };

  const drawImage = async (src: string, height: number) => {
    const safe = safeImageSrc(src);
    if (!safe) return;
    const encoded = safe.split(",")[1] ?? "";
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    try {
      const image = safe.startsWith("data:image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const width = Math.min(maxWidth, (image.width / image.height) * height);
      ensure(height);
      page.drawImage(image, { x: MARGIN, y: y - height, width, height });
      y -= height;
    } catch {
      drawLines(["[imagen]"], 12, fonts.regular);
    }
  };

  for (const block of blocksFromDoc(doc)) {
    if (block.type === "image") await drawImage(block.src, 180);
    else await drawBlock(block);
  }
  if (footer.trim()) {
    y -= 8;
    drawLines(wrap(fonts.italic, footer, 10, maxWidth), 10, fonts.italic);
  }

  return pdf.save();
}
