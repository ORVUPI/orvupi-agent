import { blocksFromDoc, type Inline, type JsonNode } from "./model";

export async function exportDocx(title: string, doc: JsonNode, header: string, footer: string, pageNumber = false): Promise<Uint8Array> {
  const docx = await import("docx");
  const children: Array<InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>> = [];
  for (const block of blocksFromDoc(doc)) {
    if (block.type === "pageBreak") {
      children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
      continue;
    }
    if (block.type === "table") {
      children.push(new docx.Table({
        rows: block.rows.map((row) => new docx.TableRow({
          children: row.map((cell) => new docx.TableCell({
            children: [new docx.Paragraph({ children: [new docx.TextRun(cell)] })],
          })),
        })),
      }));
      continue;
    }
    if (block.type === "image") continue;
    if (block.type === "checklist") {
      for (const item of block.items) {
        children.push(new docx.Paragraph({ children: [new docx.TextRun(`${item.checked ? "[x] " : "[ ] "}${inlineText(item.inlines)}`)] }));
      }
      continue;
    }
    if (block.type === "bullet" || block.type === "ordered") {
      block.items.forEach((item, index) => {
        const prefix = block.type === "ordered" ? `${index + 1}. ` : "- ";
        children.push(new docx.Paragraph({ children: runsFrom(docx, item, prefix) }));
      });
      continue;
    }
    const heading = block.type === "h1" ? docx.HeadingLevel.HEADING_1 : block.type === "h2" ? docx.HeadingLevel.HEADING_2 : block.type === "h3" ? docx.HeadingLevel.HEADING_3 : undefined;
    const inlines = block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3" || block.type === "quote" ? block.inlines : [];
    children.push(new docx.Paragraph({ heading, children: runsFrom(docx, inlines) }));
  }
  const footerChildren: unknown[] = [];
  if (footer.trim()) footerChildren.push(new docx.TextRun({ text: footer, italics: true, size: 18 }));
  if (pageNumber) {
    if (footerChildren.length > 0) footerChildren.push(new docx.TextRun({ text: " " }));
    footerChildren.push(docx.PageNumber.CURRENT);
  }
  const file = new docx.Document({
    creator: "ORVUPI Work",
    title,
    sections: [{
      headers: header.trim() ? { default: new docx.Header({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: header, italics: true, size: 18 })] })] }) } : undefined,
      footers: footerChildren.length > 0 ? { default: new docx.Footer({ children: [new docx.Paragraph({ children: footerChildren as InstanceType<typeof docx.TextRun>[] })] }) } : undefined,
      children: children.length > 0 ? children : [new docx.Paragraph("")],
    }],
  });
  const blob = await docx.Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}

function inlineText(inlines: Inline[]): string {
  return inlines.map((inline) => (inline.type === "text" ? inline.text : inline.alt)).join("");
}

function runsFrom(docx: typeof import("docx"), inlines: Inline[], prefix = ""): InstanceType<typeof import("docx").TextRun>[] {
  if (inlines.length === 0) return [new docx.TextRun(prefix)];
  return inlines.map((inline, index) => {
    const text = `${index === 0 ? prefix : ""}${inline.type === "text" ? inline.text : inline.alt}`;
    if (inline.type !== "text") return new docx.TextRun(text);
    return new docx.TextRun({
      text,
      bold: inline.bold,
      italics: inline.italic,
      underline: inline.underline ? {} : undefined,
      strike: inline.strike,
      subScript: inline.subscript,
      superScript: inline.superscript,
    });
  });
}
