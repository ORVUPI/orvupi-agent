import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

let workerReady = false;

async function pdfjs() {
  const lib = await import("pdfjs-dist");
  if (!workerReady) {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    workerReady = true;
  }
  return lib;
}

export async function openPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  const data = new Uint8Array(bytes);
  return lib.getDocument({ data, isEvalSupported: false, disableFontFace: false }).promise;
}

export async function pageSize(doc: PDFDocumentProxy, pageNumber: number): Promise<{ width: number; height: number }> {
  const page = await doc.getPage(pageNumber);
  const view = page.getViewport({ scale: 1 });
  return { width: view.width, height: view.height };
}

export async function paintPage(page: PDFPageProxy, canvas: HTMLCanvasElement, scale: number): Promise<void> {
  const viewport = page.getViewport({ scale });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // The sheet sets the CSS box. Writing canvas.style here would resize the
  // bitmap's layout after scroll has already been anchored and shove the page.
  canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
  canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  const task = page.render({ canvasContext: context, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] });
  await task.promise;
}

export async function paintThumb(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.22 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext("2d");
  if (!context) return "";
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function pageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
}

export type PdfOutline = { title: string; page: number | null; items: PdfOutline[] };

export async function readOutline(doc: PDFDocumentProxy): Promise<PdfOutline[]> {
  const raw = await doc.getOutline();
  if (!raw) return [];
  const walk = async (nodes: typeof raw): Promise<PdfOutline[]> =>
    Promise.all(nodes.map(async (node) => ({
      title: node.title,
      page: await destPage(doc, node.dest),
      items: node.items?.length ? await walk(node.items) : [],
    })));
  return walk(raw);
}

async function destPage(doc: PDFDocumentProxy, dest: unknown): Promise<number | null> {
  try {
    const resolved = typeof dest === "string" ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(resolved) || resolved.length === 0) return null;
    const index = await doc.getPageIndex(resolved[0] as Parameters<PDFDocumentProxy["getPageIndex"]>[0]);
    return index + 1;
  } catch {
    return null;
  }
}
