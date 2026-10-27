import { fileNameWithExtension } from "../security/names";
import { zipStore } from "../sheets/zip";
import { exportHtml } from "./html";
import { blocksFromDoc, headingLines, type Inline, type JsonNode } from "./model";

/** Formatos de Archivo → Descargar, en el orden de Documentos. */
export const DOC_DOWNLOADS = [
  { id: "docx", labelKey: "dlDocx" },
  { id: "pdf", labelKey: "dlPdfDoc" },
  { id: "odt", labelKey: "dlOdt" },
  { id: "txt", labelKey: "dlTxt" },
  { id: "rtf", labelKey: "dlRtf" },
  { id: "htmlzip", labelKey: "dlHtmlZip" },
  { id: "epub", labelKey: "dlEpub" },
  { id: "md", labelKey: "dlMd" },
] as const;

export type DownloadKind = (typeof DOC_DOWNLOADS)[number]["id"];
export type ExportKind = DownloadKind | "html" | "orvdoc";

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mdPlain(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|]/g, (char) => `\\${char}`);
}

function mdInlines(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "image") {
        const alt = mdPlain(inline.alt);
        return inline.src.startsWith("http://") || inline.src.startsWith("https://") ? `![${alt}](${inline.src})` : alt;
      }
      let text = mdPlain(inline.text);
      if (!text) return "";
      if (inline.bold && inline.italic) text = `***${text}***`;
      else if (inline.bold) text = `**${text}**`;
      else if (inline.italic) text = `*${text}*`;
      if (inline.strike) text = `~~${text}~~`;
      if (inline.subscript) text = `<sub>${text}</sub>`;
      if (inline.superscript) text = `<sup>${text}</sup>`;
      if (inline.href) text = `[${text}](${inline.href})`;
      return text;
    })
    .join("");
}

export function exportMarkdown(doc: JsonNode): string {
  const headings = headingLines(doc);
  const parts = blocksFromDoc(doc).map((block) => {
    if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
      const marks = block.type === "h1" ? "#" : block.type === "h2" ? "##" : "###";
      return `${marks} ${mdInlines(block.inlines)}`;
    }
    if (block.type === "quote") return mdInlines(block.inlines).split("\n").map((line) => `> ${line}`).join("\n");
    if (block.type === "paragraph") return mdInlines(block.inlines);
    if (block.type === "image") {
      const alt = mdPlain(block.alt);
      return block.src.startsWith("http://") || block.src.startsWith("https://") ? `![${alt}](${block.src})` : alt;
    }
    if (block.type === "bullet" || block.type === "ordered") {
      return block.items.map((item, index) => `${block.type === "bullet" ? "-" : `${index + 1}.`} ${mdInlines(item)}`).join("\n");
    }
    if (block.type === "checklist") {
      return block.items.map((item) => `- [${item.checked ? "x" : " "}] ${mdInlines(item.inlines)}`).join("\n");
    }
    if (block.type === "table" && block.rows.length > 0) {
      const width = Math.max(...block.rows.map((row) => row.length));
      const cells = (row: string[]) => Array.from({ length: width }, (_, index) => mdPlain(row[index] ?? "").replace(/\|/g, "\\|") || " ");
      const lines = block.rows.map((row) => `| ${cells(row).join(" | ")} |`);
      lines.splice(1, 0, `| ${Array.from({ length: width }, () => "---").join(" | ")} |`);
      return lines.join("\n");
    }
    if (block.type === "pageBreak") return "---";
    if (block.type === "contents") return headings.map((line) => `- ${mdPlain(line)}`).join("\n");
    if (block.type === "shape") return block.text;
    return "";
  });
  return parts.filter((part) => part.trim() !== "").join("\n\n").trim() + "\n";
}

function rtfText(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "\\") out += "\\\\";
    else if (char === "{") out += "\\{";
    else if (char === "}") out += "\\}";
    else if (char === "\n") out += "\\line ";
    else if (code > 0 && code < 128) out += char;
    else if (code <= 0xffff) out += `\\u${code > 32767 ? code - 65536 : code}?`;
    else out += "?";
  }
  return out;
}

function rtfInlines(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "image") return rtfText(inline.alt);
      let text = rtfText(inline.text);
      if (!text) return "";
      if (inline.bold) text = `\\b ${text}\\b0 `;
      if (inline.italic) text = `\\i ${text}\\i0 `;
      if (inline.underline) text = `\\ul ${text}\\ul0 `;
      return text;
    })
    .join("");
}

export function exportRtf(title: string, doc: JsonNode): string {
  const body = blocksFromDoc(doc)
    .map((block) => {
      if (block.type === "h1") return `\\pard\\sb240\\sa120\\fs36\\b ${rtfInlines(block.inlines)}\\b0\\fs24\\par`;
      if (block.type === "h2") return `\\pard\\sb200\\sa80\\fs28\\b ${rtfInlines(block.inlines)}\\b0\\fs24\\par`;
      if (block.type === "h3") return `\\pard\\sb160\\sa80\\fs26\\b ${rtfInlines(block.inlines)}\\b0\\fs24\\par`;
      if (block.type === "bullet" || block.type === "ordered") {
        return block.items.map((item, index) => `\\pard\\li360\\sa60 ${block.type === "bullet" ? "\\bullet" : `${index + 1}.`} ${rtfInlines(item)}\\par`).join("");
      }
      if (block.type === "checklist") {
        return block.items.map((item) => `\\pard\\li360\\sa60 ${item.checked ? "[x]" : "[ ]"} ${rtfInlines(item.inlines)}\\par`).join("");
      }
      if (block.type === "table") return block.rows.map((row) => `\\pard\\sa60 ${rtfText(row.join(" \t "))}\\par`).join("");
      if (block.type === "quote") return `\\pard\\li360\\sa120\\i ${rtfInlines(block.inlines)}\\i0\\par`;
      if (block.type === "image") return `\\pard\\sa120 ${rtfText(block.alt)}\\par`;
      if (block.type === "shape") return `\\pard\\sa120 ${rtfText(block.text)}\\par`;
      if (block.type === "pageBreak") return "\\page ";
      if (block.type === "paragraph") return `\\pard\\sa120 ${rtfInlines(block.inlines)}\\par`;
      return "";
    })
    .join("");
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}{\\info{\\title ${rtfText(title)}}{\\author ORVUPI Work}}\n\\f0\\fs24 ${body}}`;
}

function odtInlines(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "image") return xml(inline.alt);
      let text = xml(inline.text);
      if (!text) return "";
      if (inline.underline) text = `<text:span text:style-name="Underline">${text}</text:span>`;
      if (inline.italic) text = `<text:span text:style-name="Italic">${text}</text:span>`;
      if (inline.bold) text = `<text:span text:style-name="Bold">${text}</text:span>`;
      if (inline.href) text = `<text:a xlink:href="${xml(inline.href)}">${text}</text:a>`;
      return text;
    })
    .join("");
}

export function exportOdt(title: string, doc: JsonNode): Uint8Array {
  const blocks = blocksFromDoc(doc)
    .map((block) => {
      if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
        const level = block.type === "h1" ? 1 : block.type === "h2" ? 2 : 3;
        return `<text:h text:style-name="H${level}" text:outline-level="${level}">${odtInlines(block.inlines)}</text:h>`;
      }
      if (block.type === "bullet" || block.type === "ordered" || block.type === "checklist") {
        const items = block.type === "checklist"
          ? block.items.map((item) => `<text:list-item><text:p>${item.checked ? "[x] " : "[ ] "}${odtInlines(item.inlines)}</text:p></text:list-item>`)
          : block.items.map((item) => `<text:list-item><text:p>${odtInlines(item)}</text:p></text:list-item>`);
        return `<text:list>${items.join("")}</text:list>`;
      }
      if (block.type === "table") {
        const cols = Math.max(1, ...block.rows.map((row) => row.length));
        const columns = Array.from({ length: cols }, () => "<table:table-column/>").join("");
        const rows = block.rows
          .map((row) => `<table:table-row>${Array.from({ length: cols }, (_, index) => `<table:table-cell office:value-type="string"><text:p>${xml(row[index] ?? "")}</text:p></table:table-cell>`).join("")}</table:table-row>`)
          .join("");
        return `<table:table table:name="Tabla">${columns}${rows}</table:table>`;
      }
      if (block.type === "image") return `<text:p text:style-name="P">${xml(block.alt)}</text:p>`;
      if (block.type === "shape") return `<text:p text:style-name="P">${xml(block.text)}</text:p>`;
      if (block.type === "pageBreak") return `<text:p text:style-name="P"/>`;
      if (block.type === "paragraph" || block.type === "quote" || block.type === "contents") {
        const text = block.type === "contents" ? xml(headingLines(doc).join(" · ")) : odtInlines(block.inlines);
        return `<text:p text:style-name="${block.type === "quote" ? "Quote" : "P"}">${text}</text:p>`;
      }
      return "";
    })
    .join("");
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2">
<office:automatic-styles>
<style:style style:name="P" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="12pt" fo:font-family="Arial"/></style:style>
<style:style style:name="Quote" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm" fo:margin-bottom="0.2cm"/><style:text-properties fo:font-style="italic"/></style:style>
<style:style style:name="H1" style:family="paragraph"><style:text-properties fo:font-size="18pt" fo:font-weight="bold"/></style:style>
<style:style style:name="H2" style:family="paragraph"><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>
<style:style style:name="H3" style:family="paragraph"><style:text-properties fo:font-size="12pt" fo:font-weight="bold"/></style:style>
<style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
<style:style style:name="Underline" style:family="text"><style:text-properties style:text-underline-style="solid"/></style:style>
</office:automatic-styles>
<office:body><office:text>
<text:h text:style-name="H1" text:outline-level="1">${xml(title)}</text:h>
${blocks}
</office:text></office:body></office:document-content>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
<office:styles>
<style:default-style style:family="paragraph"><style:paragraph-properties fo:hyphenation-ladder-count="no-limit"/><style:text-properties fo:font-family="Arial" fo:font-size="12pt"/></style:default-style>
</office:styles>
</office:document-styles>`;
  const meta = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
<office:meta><dc:title>${xml(title)}</dc:title><meta:generator>ORVUPI Work</meta:generator></office:meta>
</office:document-meta>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  const enc = new TextEncoder();
  return zipStore([
    { name: "mimetype", data: enc.encode("application/vnd.oasis.opendocument.text") },
    { name: "META-INF/manifest.xml", data: enc.encode(manifest) },
    { name: "content.xml", data: enc.encode(content) },
    { name: "styles.xml", data: enc.encode(styles) },
    { name: "meta.xml", data: enc.encode(meta) },
  ]);
}

function xhtmlBody(doc: JsonNode): string {
  return blocksFromDoc(doc)
    .map((block) => {
      if (block.type === "h1" || block.type === "h2" || block.type === "h3") return `<${block.type}>${odtInlines(block.inlines)}</${block.type}>`;
      if (block.type === "quote") return `<blockquote><p>${odtInlines(block.inlines)}</p></blockquote>`;
      if (block.type === "bullet" || block.type === "ordered") {
        const tag = block.type === "bullet" ? "ul" : "ol";
        return `<${tag}>${block.items.map((item) => `<li>${odtInlines(item)}</li>`).join("")}</${tag}>`;
      }
      if (block.type === "checklist") return `<ul>${block.items.map((item) => `<li>${item.checked ? "☑" : "☐"} ${odtInlines(item.inlines)}</li>`).join("")}</ul>`;
      if (block.type === "table") {
        const rows = block.rows.map((row, index) => `<tr>${row.map((cell) => `<${index === 0 ? "th" : "td"}>${xml(cell)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`).join("");
        return `<table>${rows}</table>`;
      }
      if (block.type === "image") return `<p>${xml(block.alt)}</p>`;
      if (block.type === "shape") return `<p>${xml(block.text)}</p>`;
      if (block.type === "pageBreak") return "<hr/>";
      if (block.type === "contents") return `<nav><ul>${headingLines(doc).map((line) => `<li>${xml(line)}</li>`).join("")}</ul></nav>`;
      if (block.type === "paragraph") return `<p>${odtInlines(block.inlines)}</p>`;
      return "";
    })
    .join("\n");
}

export function exportEpub(title: string, doc: JsonNode, lang: string): Uint8Array {
  const safeLang = /^[a-zA-Z-]{2,12}$/.test(lang) ? lang : "es";
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const chapter = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${xml(safeLang)}">
<head><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h1>${xml(title)}</h1>${xhtmlBody(doc)}</body></html>`;
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xml(safeLang)}">
<head><title>${xml(title)}</title></head>
<body><nav epub:type="toc" id="toc"><ol><li><a href="chapter.xhtml">${xml(title)}</a></li></ol></nav></body></html>`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:orvupi:${xml(title)}</dc:identifier>
<dc:title>${xml(title)}</dc:title>
<dc:language>${xml(safeLang)}</dc:language>
<dc:creator>ORVUPI Work</dc:creator>
<meta property="dcterms:modified">${stamp}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="chap" href="chapter.xhtml" media-type="application/xhtml+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
</manifest>
<spine><itemref idref="chap"/></spine>
</package>`;
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
  const css = "body{font-family:Georgia,serif;line-height:1.45} h1,h2,h3{font-family:sans-serif}";
  const enc = new TextEncoder();
  return zipStore([
    { name: "mimetype", data: enc.encode("application/epub+zip") },
    { name: "META-INF/container.xml", data: enc.encode(container) },
    { name: "OEBPS/content.opf", data: enc.encode(opf) },
    { name: "OEBPS/nav.xhtml", data: enc.encode(nav) },
    { name: "OEBPS/chapter.xhtml", data: enc.encode(chapter) },
    { name: "OEBPS/style.css", data: enc.encode(css) },
  ]);
}

export function exportHtmlZip(title: string, doc: JsonNode, lang: string): Uint8Array {
  const html = exportHtml(title, doc, lang);
  const name = fileNameWithExtension(title, "html");
  return zipStore([{ name, data: new TextEncoder().encode(html) }]);
}
