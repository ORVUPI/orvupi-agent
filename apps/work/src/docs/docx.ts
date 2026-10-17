import { blocksFromDoc, type JsonNode } from "./model";

export async function exportDocx(title: string, doc: JsonNode, header: string, footer: string): Promise<Uint8Array> {
  const docx = await import("docx");
  const children: InstanceType<typeof docx.Paragraph>[] = [];
  if (header.trim()) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: header, italics: true, size: 18 })] }));
  }
  for (const block of blocksFromDoc(doc)) {
    if (block.type === "pageBreak") {
      children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
      continue;
    }
    if (block.type === "table") {
      block.rows.forEach((row) => {
        children.push(new docx.Paragraph({ children: [new docx.TextRun(row.join(" | "))] }));
      });
      continue;
    }
    if (block.type === "image") continue;
    if (block.type === "checklist") {
      for (const item of block.items) {
        const text = `${item.checked ? "[x] " : "[ ] "}${item.inlines.map((inline) => (inline.type === "text" ? inline.text : "")).join("")}`;
        children.push(new docx.Paragraph({ children: [new docx.TextRun(text)] }));
      }
      continue;
    }
    const text = listOrInlineText(block);
    const heading =
      block.type === "h1" ? docx.HeadingLevel.HEADING_1 : block.type === "h2" ? docx.HeadingLevel.HEADING_2 : block.type === "h3" ? docx.HeadingLevel.HEADING_3 : undefined;
    children.push(new docx.Paragraph({ heading, children: [new docx.TextRun(text)] }));
  }
  if (footer.trim()) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: footer, italics: true, size: 18 })] }));
  }
  const file = new docx.Document({
    creator: "ORVUPI Work",
    title,
    sections: [{ children: children.length > 0 ? children : [new docx.Paragraph("")] }],
  });
  const blob = await docx.Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}

function inlineText(inlines: { type: string; text?: string }[]): string {
  return inlines.map((inline) => (inline.type === "text" ? inline.text ?? "" : "")).join("");
}

function listOrInlineText(block: ReturnType<typeof blocksFromDoc>[number]): string {
  if (block.type === "bullet" || block.type === "ordered") {
    return block.items
      .map((item, index) => `${block.type === "ordered" ? `${index + 1}. ` : "- "}${inlineText(item)}`)
      .join("\n");
  }
  if (block.type === "paragraph" || block.type === "h1" || block.type === "h2" || block.type === "h3" || block.type === "quote") {
    return inlineText(block.inlines);
  }
  return "";
}
