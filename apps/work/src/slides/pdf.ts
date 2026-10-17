import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SlideItem, SlidesFile } from "./model";

const PAGE_W = 720;
const PAGE_H = 405;

function safe(text: string): string {
  return [...text].map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) > 255 ? "?" : char)).join("");
}

function colorOf(hex: string | undefined, fallback: ReturnType<typeof rgb>) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  return rgb(Number.parseInt(hex.slice(1, 3), 16) / 255, Number.parseInt(hex.slice(3, 5), 16) / 255, Number.parseInt(hex.slice(5, 7), 16) / 255);
}

export async function slidesToPdf(file: SlidesFile): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const slide of file.slides) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: colorOf(slide.background, rgb(1, 0.97, 0.93)) });
    for (const item of slide.items) drawItem(page, item, font, bold, pdf);
    if (slide.notes) page.drawText(safe(slide.notes).slice(0, 180), { x: 24, y: 16, size: 8, font, color: rgb(0.06, 0.13, 0.2) });
  }
  return pdf.save();
}

async function drawItem(
  page: ReturnType<PDFDocument["addPage"]>,
  item: SlideItem,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  pdf: PDFDocument,
) {
  const x = (item.x / 816) * PAGE_W;
  const y = PAGE_H - ((item.y + item.h) / 459) * PAGE_H;
  const w = (item.w / 816) * PAGE_W;
  const h = (item.h / 459) * PAGE_H;
  if (item.kind === "shape") {
    page.drawRectangle({ x, y, width: w, height: h, color: colorOf(item.fill, rgb(1, 0.19, 0.44)), borderColor: rgb(0.06, 0.13, 0.2), borderWidth: 1 });
  } else if (item.kind === "line") {
    page.drawLine({ start: { x, y: y + h / 2 }, end: { x: x + w, y: y + h / 2 }, thickness: 2, color: rgb(0.06, 0.13, 0.2) });
  } else if (item.kind === "text") {
    page.drawText(safe(item.text).slice(0, 240), { x: x + 4, y: y + h - 16, size: Math.min(28, item.size ?? 14), font: item.bold ? bold : font, color: colorOf(item.color, rgb(0.06, 0.13, 0.2)) });
  } else if (item.kind === "image" && item.src.startsWith("data:image/png")) {
    try {
      const bytes = Uint8Array.from(atob(item.src.split(",")[1] ?? ""), (char) => char.charCodeAt(0));
      const image = await pdf.embedPng(bytes);
      page.drawImage(image, { x, y, width: w, height: h });
    } catch {
      /* una imagen ilegible no tumba el PDF */
    }
  }
}
