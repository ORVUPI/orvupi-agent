/** PDF multipágina a partir del mismo raster que la pantalla. Aplanado, 96 ppp, DeviceRGB. */

const SUBJECT = "Aplanado a 96 ppp. DeviceRGB. Sin sangrado. El texto no sigue editable.";

function ascii(text) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;
  return bytes;
}

function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pdfEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgbOf(rgba, width, height) {
  const expected = width * height * 4;
  if (!rgba || rgba.length < expected) throw new Error("pdf-imagen");
  const rgb = new Uint8Array(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgb[pixel * 3] = rgba[pixel * 4];
    rgb[pixel * 3 + 1] = rgba[pixel * 4 + 1];
    rgb[pixel * 3 + 2] = rgba[pixel * 4 + 2];
  }
  return rgb;
}

/**
 * Cada página entra ya rasterizada. El MediaBox está en puntos de 1/72"
 * a partir de píxeles de 96 ppp (px * 72/96). No es una etiqueta de 300 ppp.
 */
export function pdfFromPages(pages, meta = {}) {
  if (!Array.isArray(pages) || pages.length === 0) throw new Error("pdf-vacio");
  const objects = [];
  const pageIds = [];
  const contentIds = [];
  const imageIds = [];
  let nextId = 4;
  for (let index = 0; index < pages.length; index += 1) {
    pageIds.push(nextId);
    contentIds.push(nextId + 1);
    imageIds.push(nextId + 2);
    nextId += 3;
  }
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push({ id: 1, body: ascii("<< /Type /Catalog /Pages 2 0 R >>") });
  objects.push({ id: 2, body: ascii(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`) });
  objects.push({ id: 3, body: ascii(`<< /Producer (ORVUPI Studio) /Subject (${pdfEscape(meta.subject || SUBJECT)}) >>`) });
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const width = Math.max(1, Math.round(Number(page.width) || 0));
    const height = Math.max(1, Math.round(Number(page.height) || 0));
    const wPt = (width * 72 / 96).toFixed(4);
    const hPt = (height * 72 / 96).toFixed(4);
    const rgb = rgbOf(page.rgba, width, height);
    const content = ascii(`q\n${wPt} 0 0 ${hPt} 0 0 cm\n/Im0 Do\nQ\n`);
    objects.push({
      id: pageIds[index],
      body: ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents ${contentIds[index]} 0 R /Resources << /XObject << /Im0 ${imageIds[index]} 0 R >> >> >>`),
    });
    objects.push({
      id: contentIds[index],
      body: concat([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii("endstream")]),
    });
    objects.push({
      id: imageIds[index],
      body: concat([
        ascii(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgb.length} >>\nstream\n`),
        rgb,
        ascii("endstream"),
      ]),
    });
  }
  objects.sort((a, b) => a.id - b.id);
  const parts = [ascii("%PDF-1.4\n"), new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
  const offsets = [];
  const size = () => parts.reduce((sum, part) => sum + part.length, 0);
  for (const object of objects) {
    offsets[object.id] = size();
    parts.push(ascii(`${object.id} 0 obj\n`));
    parts.push(object.body);
    parts.push(ascii("\nendobj\n"));
  }
  const xrefAt = size();
  const total = objects.length + 1;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  parts.push(ascii(xref));
  parts.push(ascii(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  return concat(parts);
}

export const PDF_SUBJECT = SUBJECT;
