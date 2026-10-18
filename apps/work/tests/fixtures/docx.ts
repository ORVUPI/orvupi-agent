import { zipStore } from "../../src/sheets/zip";

/** DOCX sintético: negrita dentro de una línea, imagen, salto de página, listas, tabla, enlace, cabecera y pie. */
export const FIXTURE_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==";
const enc = (text: string) => new TextEncoder().encode(text);
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

export function docxFixture(): Uint8Array {
  const document = `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Informe</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">Texto con </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>negrita</w:t></w:r><w:r><w:t xml:space="preserve"> y </w:t></w:r><w:r><w:rPr><w:i/><w:u w:val="single"/><w:color w:val="C00000"/><w:sz w:val="28"/><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/></w:rPr><w:t>estilo</w:t></w:r><w:r><w:rPr><w:rStyle w:val="Strong"/></w:rPr><w:t xml:space="preserve"> fuerte</w:t></w:r><w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t xml:space="preserve"> fin</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline><wp:extent cx="1905000" cy="952500"/><wp:docPr id="1" name="foto.png" descr="Una foto"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rId9"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
<w:p><w:r><w:t>Antes</w:t></w:r><w:r><w:br w:type="page"/></w:r><w:r><w:t>Después</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Uno</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Uno.a</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Paso</w:t></w:r></w:p>
<w:tbl><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>A1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:hyperlink r:id="rId7"><w:r><w:t>enlace</w:t></w:r></w:hyperlink></w:p>
<w:sectPr><w:headerReference w:type="default" r:id="rId5"/><w:footerReference w:type="default" r:id="rId6"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:left="1440" w:right="1440" w:top="1440" w:bottom="1440"/></w:sectPr>
</w:body></w:document>`;
  const styles = `<?xml version="1.0"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/><w:rPr><w:b/></w:rPr></w:style></w:styles>`;
  const numbering = `<?xml version="1.0"?><w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="image" Target="media/foto.png"/><Relationship Id="rId5" Type="header" Target="header1.xml"/><Relationship Id="rId6" Type="footer" Target="footer1.xml"/><Relationship Id="rId7" Type="hyperlink" Target="https://orvupi.com/" TargetMode="External"/></Relationships>`;
  const header = `<?xml version="1.0"?><w:hdr ${NS}><w:p><w:r><w:t>Cabecera ORVUPI</w:t></w:r></w:p></w:hdr>`;
  const footer = `<?xml version="1.0"?><w:ftr ${NS}><w:p><w:r><w:t>Pie</w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
  return zipStore([
    { name: "[Content_Types].xml", data: enc("<Types/>") },
    { name: "word/document.xml", data: enc(document) },
    { name: "word/styles.xml", data: enc(styles) },
    { name: "word/numbering.xml", data: enc(numbering) },
    { name: "word/_rels/document.xml.rels", data: enc(rels) },
    { name: "word/header1.xml", data: enc(header) },
    { name: "word/footer1.xml", data: enc(footer) },
    { name: "word/media/foto.png", data: Uint8Array.from(atob(FIXTURE_PNG), (c) => c.charCodeAt(0)) },
  ]);
}

