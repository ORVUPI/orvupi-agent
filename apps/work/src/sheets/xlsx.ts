import { COL_COUNT, ROW_COUNT, cellRef, columnLabel, emptyGrid } from "./formulas";
import type { SheetTab } from "./model";
import { unzip, zipStore } from "./zip";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sheetXml(cells: string[][]): string {
  const rows: string[] = [];
  for (let row = 0; row < ROW_COUNT; row += 1) {
    const cols: string[] = [];
    for (let col = 0; col < COL_COUNT; col += 1) {
      const value = cells[row]?.[col] ?? "";
      if (!value) continue;
      const ref = cellRef(row, col);
      if (value.startsWith("=")) {
        cols.push(`<c r="${ref}"><f>${escapeXml(value.slice(1))}</f></c>`);
      } else if (value.trim() !== "" && Number.isFinite(Number(value))) {
        cols.push(`<c r="${ref}"><v>${escapeXml(value)}</v></c>`);
      } else {
        cols.push(`<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`);
      }
    }
    if (cols.length > 0) rows.push(`<row r="${row + 1}">${cols.join("")}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

export function sheetsToXlsx(sheets: SheetTab[]): Uint8Array {
  const files: Array<{ name: string; data: Uint8Array }> = [];
  const encoder = new TextEncoder();
  const sheetList = sheets.slice(0, 12);
  files.push({
    name: "[Content_Types].xml",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetList.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`),
  });
  files.push({
    name: "_rels/.rels",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
  });
  files.push({
    name: "xl/workbook.xml",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetList.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>
</workbook>`),
  });
  files.push({
    name: "xl/_rels/workbook.xml.rels",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetList.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
</Relationships>`),
  });
  sheetList.forEach((sheet, index) => {
    files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: encoder.encode(sheetXml(sheet.cells)) });
  });
  return zipStore(files);
}

function textOf(xml: string, tag: string): string[] {
  const found: string[] = [];
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  for (const match of xml.matchAll(pattern)) found.push(decodeXml(match[1] ?? ""));
  return found;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sharedStrings(xml: string): string[] {
  return textOf(xml, "t");
}

function cellsFromWorksheet(xml: string, shared: string[]): string[][] {
  const grid = emptyGrid();
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const ref = /r="([A-Z]+)(\d+)"/i.exec(attrs);
    if (!ref?.[1] || !ref[2]) continue;
    let col = 0;
    for (const char of ref[1].toUpperCase()) col = col * 26 + char.charCodeAt(0) - 64;
    col -= 1;
    const row = Number(ref[2]) - 1;
    if (row < 0 || row >= ROW_COUNT || col < 0 || col >= COL_COUNT) continue;
    const formula = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body);
    const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(body);
    const value = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body);
    let text = "";
    if (formula?.[1]) text = `=${decodeXml(formula[1])}`;
    else if (inline?.[1]) text = decodeXml(inline[1]);
    else if (value?.[1] && /\bt="s"/.test(attrs)) text = shared[Number(decodeXml(value[1]))] ?? "";
    else if (value?.[1]) text = decodeXml(value[1]);
    grid[row]![col] = text.slice(0, 500);
  }
  return grid;
}

export async function xlsxToSheets(bytes: Uint8Array): Promise<SheetTab[]> {
  const files = await unzip(bytes);
  const shared = sharedStrings(new TextDecoder().decode(files.get("xl/sharedStrings.xml") ?? new Uint8Array()));
  const names = [...files.keys()]
    .filter((name) => /xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  if (names.length === 0) throw new Error("xlsx");
  const workbook = new TextDecoder().decode(files.get("xl/workbook.xml") ?? new Uint8Array());
  const labels = [...workbook.matchAll(/name="([^"]*)"/g)].map((match) => decodeXml(match[1] ?? ""));
  return names.slice(0, 12).map((name, index) => ({
    name: (labels[index] || `Hoja ${index + 1}`).slice(0, 40),
    cells: cellsFromWorksheet(new TextDecoder().decode(files.get(name) ?? new Uint8Array()), shared),
    freezeHeader: true,
  }));
}

export function columnCountLabel(): string {
  return `${columnLabel(0)}–${columnLabel(COL_COUNT - 1)}`;
}
