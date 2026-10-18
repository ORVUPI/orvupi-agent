import { zipStore } from "../../src/sheets/zip";
import { FIXTURE_PNG } from "./docx";

/**
 * DOCX sintéticos de la 0.8.2, uno por función: cuadros de texto y formas (wps, wpg y VML),
 * notas al pie y finales, secciones con columnas y orientación, comentarios con respuesta y resueltos,
 * imágenes flotantes con cada ajuste y párrafos y tablas más altos que una hoja.
 */
const enc = (text: string) => new TextEncoder().encode(text);
export const NS82 = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:w10="urn:schemas-microsoft-com:office:word"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
].join(" ");

const LOREM = "ORVUPI Work reparte el texto entre hojas igual que un procesador de textos de escritorio, sin cortar líneas por la mitad y respetando los márgenes de la página. ";

function p(text: string, extra = ""): string {
  return `<w:p>${extra}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

const CT = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/><Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/><Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/foto.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/><Relationship Id="rId5" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/></Relationships>`;

// PNG de 64x40 de color sólido para que las imágenes flotantes se vean en LibreOffice.
export const FLOAT_PNG = "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAWElEQVR4nO3PwQkAIBDAsBvJ0dz/o0P4CEKhA6Rz1v664YIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALHrs/xjbxYXcrPAAAAABJRU5ErkJggg==";

const SECT = (extra = "") => `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>${extra}</w:sectPr>`;

function anchor(inner: string, opts: { wrap: string; behind?: boolean; x: number; y: number; cx: number; cy: number; id: number; hRel?: string }): string {
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${opts.id}" behindDoc="${opts.behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${opts.hRel ?? "column"}"><wp:posOffset>${opts.x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${opts.y}</wp:posOffset></wp:positionV><wp:extent cx="${opts.cx}" cy="${opts.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${opts.wrap}<wp:docPr id="${opts.id}" name="Objeto ${opts.id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="x">${inner}</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

const PIC = `<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="foto.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId9"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1219200" cy="762000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`;

function wsp(text: string, prst: string, fill: string | null, box: boolean): string {
  return `<wps:wsp><wps:cNvSpPr${box ? ' txBox="1"' : ""}/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="762000"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : "<a:noFill/>"}<a:ln w="12700"><a:solidFill><a:srgbClr val="1D4E89"/></a:solidFill></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp>`;
}

export function fixture082(): Uint8Array {
  const body = [
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Prueba 0.8.2</w:t></w:r></w:p>`,
    // 1) Cuadro de texto wps anclado con ajuste cuadrado, elipse detrás del texto, VML y grupo.
    `<w:p>${anchor(wsp("Cuadro ORVUPI", "rect", null, true), { wrap: '<wp:wrapSquare wrapText="bothSides"/>', x: 0, y: 0, cx: 1905000, cy: 762000, id: 11 })}<w:r><w:t xml:space="preserve">${LOREM}${LOREM}</w:t></w:r></w:p>`,
    `<w:p>${anchor(wsp("Elipse", "ellipse", "FFD7E5", false), { wrap: "<wp:wrapNone/>", behind: true, x: 2857500, y: 95250, cx: 1905000, cy: 762000, id: 12 })}<w:r><w:t xml:space="preserve">Texto delante de una elipse rosa. ${LOREM}</w:t></w:r></w:p>`,
    `<w:p><w:r><w:pict><v:shape id="vml1" type="#_x0000_t202" style="position:absolute;margin-left:0;margin-top:0;width:150pt;height:40pt;z-index:1" fillcolor="#E8F0FE" strokecolor="#1D4E89"><v:textbox><w:txbxContent><w:p><w:r><w:t>Cuadro VML</w:t></w:r></w:p></w:txbxContent></v:textbox><w10:wrap type="topAndBottom"/></v:shape></w:pict></w:r></w:p>`,
    `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="3810000" cy="762000"/><wp:docPr id="13" name="Grupo"/><a:graphic><a:graphicData uri="g"><wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr/><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1714500" cy="762000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="DCEBFF"/></a:solidFill></wps:spPr><wps:txbx><w:txbxContent><w:p><w:r><w:t>Grupo A</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="2095500" y="0"/><a:ext cx="1714500" cy="762000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFE9A8"/></a:solidFill></wps:spPr><wps:txbx><w:txbxContent><w:p><w:r><w:t>Grupo B</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp></wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
    // 2) Notas al pie y finales.
    `<w:p><w:r><w:t xml:space="preserve">Frase con nota al pie</w:t></w:r><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="1"/></w:r><w:r><w:t xml:space="preserve"> y otra nota</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r><w:r><w:t xml:space="preserve"> y una nota final</w:t></w:r><w:r><w:endnoteReference w:id="1"/></w:r><w:r><w:t>.</w:t></w:r></w:p>`,
    // 4) Comentarios con respuesta y uno resuelto.
    `<w:p><w:commentRangeStart w:id="0"/><w:r><w:t xml:space="preserve">Texto comentado</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r><w:commentRangeStart w:id="1"/><w:commentRangeEnd w:id="1"/><w:r><w:t xml:space="preserve"> y </w:t></w:r><w:commentRangeStart w:id="2"/><w:r><w:t>otro resuelto</w:t></w:r><w:commentRangeEnd w:id="2"/><w:r><w:commentReference w:id="2"/></w:r></w:p>`,
    // 5) Imágenes flotantes con cada ajuste.
    `<w:p>${anchor(PIC, { wrap: '<wp:wrapSquare wrapText="bothSides"/>', x: 3810000, y: 0, cx: 1219200, cy: 762000, id: 21 })}<w:r><w:t xml:space="preserve">Imagen con ajuste cuadrado a la derecha. ${LOREM}</w:t></w:r></w:p>`,
    `<w:p>${anchor(PIC, { wrap: "<wp:wrapTopAndBottom/>", x: 952500, y: 0, cx: 1219200, cy: 762000, id: 22 })}<w:r><w:t xml:space="preserve">Imagen arriba y abajo desplazada 100 px.</w:t></w:r></w:p>`,
    `<w:p>${anchor(PIC, { wrap: "<wp:wrapNone/>", behind: true, x: 190500, y: 0, cx: 1219200, cy: 762000, id: 23 })}<w:r><w:t xml:space="preserve">Imagen detrás del texto. ${LOREM}</w:t></w:r></w:p>`,
    `<w:p>${anchor(PIC, { wrap: "<wp:wrapNone/>", x: 2857500, y: 0, cx: 1219200, cy: 762000, id: 24 })}<w:r><w:t xml:space="preserve">Imagen delante del texto. ${LOREM}</w:t></w:r></w:p>`,
    // 6) Un párrafo más alto que una hoja y una tabla larga con fila de encabezado.
    p(LOREM.repeat(40)),
    `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="7000"/></w:tblGrid><w:tr><w:trPr><w:tblHeader/></w:trPr><w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>N.º</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Concepto</w:t></w:r></w:p></w:tc></w:tr>${Array.from({ length: 60 }, (_, i) => `<w:tr><w:tc><w:p><w:r><w:t>${i + 1}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Fila ${i + 1} de la tabla larga</w:t></w:r></w:p></w:tc></w:tr>`).join("")}</w:tbl>`,
    // 3) Sección 1 termina aquí (vertical); la 2 va en horizontal y a dos columnas.
    `<w:p><w:pPr>${SECT()}</w:pPr><w:r><w:t>Fin de la sección vertical.</w:t></w:r></w:p>`,
    p("Sección horizontal a dos columnas. " + LOREM.repeat(6)),
    p(LOREM.repeat(4)),
  ].join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS82}><w:body>${body}<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:num="2" w:space="708"/></w:sectPr></w:body></w:document>`;
  const footnotes = `<?xml version="1.0" encoding="UTF-8"?><w:footnotes ${NS82}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote><w:footnote w:id="1"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Primera nota al pie de ORVUPI.</w:t></w:r></w:p></w:footnote><w:footnote w:id="2"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Segunda nota.</w:t></w:r></w:p></w:footnote></w:footnotes>`;
  const endnotes = `<?xml version="1.0" encoding="UTF-8"?><w:endnotes ${NS82}><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote><w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote><w:endnote w:id="1"><w:p><w:r><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> Nota final del documento.</w:t></w:r></w:p></w:endnote></w:endnotes>`;
  const comments = `<?xml version="1.0" encoding="UTF-8"?><w:comments ${NS82}><w:comment w:id="0" w:author="Ana" w:date="2026-10-18T10:00:00Z" w:initials="A"><w:p w14:paraId="1A000001"><w:r><w:t>Revisa esta frase.</w:t></w:r></w:p></w:comment><w:comment w:id="1" w:author="Luis" w:date="2026-10-18T10:05:00Z" w:initials="L"><w:p w14:paraId="1A000002"><w:r><w:t>Hecho.</w:t></w:r></w:p></w:comment><w:comment w:id="2" w:author="Ana" w:date="2026-10-18T10:10:00Z" w:initials="A"><w:p w14:paraId="1A000003"><w:r><w:t>Ya está bien.</w:t></w:r></w:p></w:comment></w:comments>`;
  const commentsExt = `<?xml version="1.0" encoding="UTF-8"?><w15:commentsEx ${NS82}><w15:commentEx w15:paraId="1A000001" w15:done="0"/><w15:commentEx w15:paraId="1A000002" w15:paraIdParent="1A000001" w15:done="0"/><w15:commentEx w15:paraId="1A000003" w15:done="1"/></w15:commentsEx>`;
  const styles = `<?xml version="1.0"?><w:styles ${NS82}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style></w:styles>`;
  return zipStore([
    { name: "[Content_Types].xml", data: enc(CT) },
    { name: "_rels/.rels", data: enc(ROOT_RELS) },
    { name: "word/document.xml", data: enc(document) },
    { name: "word/styles.xml", data: enc(styles) },
    { name: "word/footnotes.xml", data: enc(footnotes) },
    { name: "word/endnotes.xml", data: enc(endnotes) },
    { name: "word/comments.xml", data: enc(comments) },
    { name: "word/commentsExtended.xml", data: enc(commentsExt) },
    { name: "word/_rels/document.xml.rels", data: enc(DOC_RELS) },
    { name: "word/media/foto.png", data: Uint8Array.from(atob(FLOAT_PNG || FIXTURE_PNG), (c) => c.charCodeAt(0)) },
  ]);
}
