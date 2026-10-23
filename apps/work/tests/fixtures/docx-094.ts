import { zipStore } from "../../src/sheets/zip";
import { FLOAT_PNG, NS82 } from "./docx-082";

/**
 * DOCX sintético de la 0.9.4 que reproduce lo que se rompía al importar un trabajo real (sin datos personales):
 * hoja Carta con márgenes de 0,7", tablas del ancho exacto de la hoja con bordes y relleno por celda,
 * viñetas «●» dentro de las celdas (tabla con fila de encabezado que se parte entre hojas), «·» escrito, w:sym de Symbol y texto en Wingdings, pares de imágenes
 * con pie en una tabla sin bordes, una tabla y una imagen más anchas que la hoja, fuente Aptos y salto de página.
 */
const enc = (text: string) => new TextEncoder().encode(text);

/** Textos que deben aparecer tal cual tras importar (la prueba los busca uno a uno). */
export const T94 = {
  title: "Enfermedades profesionales comunes en distintos sectores",
  box: "Ejemplo inventado del profesor",
  boxText: "Documento modelo con lenguaje sencillo · Debe leerse y entenderse antes de entregarlo.",
  intro: "Importante: 2. Tabla comparativa",
  heads: ["Sector", "Enfermedades o daños frecuentes", "Factores de riesgo asociados", "Prevención básica"],
  sectors: ["PESCA", "INDUSTRIA CONSERVERA", "SALINAS E INDUSTRIA DE LA SAL", "CONSTRUCCIÓN", "AGRICULTURA", "OFICINAS"],
  bullets: [
    ["Trastornos musculoesqueléticos: túnel carpiano.", "Hipoacusia por ruido.", "Fatiga y estrés."],
    ["Movimientos repetitivos y cargas.", "Ruido, vibraciones y frío.", "Jornadas irregulares."],
    ["Ayudas mecánicas y pausas.", "Protección auditiva.", "Ropa impermeable y calzado antideslizante."],
  ],
  symbols: "Riesgo bajo · medio · alto",
  captions: ["Trabajo con redes: movimientos repetitivos, posturas forzadas, humedad y riesgo de sobreesfuerzo.", "Movimiento de cajas con ayuda mecánica para reducir la manipulación manual de cargas."],
  wide: ["Columna ancha uno", "Columna ancha dos", "Columna ancha tres"],
  after: "Después del salto de página.",
};

const BORDER = (color: string, sz = 6) => `<w:tcBorders><w:top w:val="single" w:sz="${sz}" w:color="${color}"/><w:left w:val="single" w:sz="${sz}" w:color="${color}"/><w:bottom w:val="single" w:sz="${sz}" w:color="${color}"/><w:right w:val="single" w:sz="${sz}" w:color="${color}"/></w:tcBorders>`;
const run = (text: string, rPr = "") => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;
const para = (inner: string, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;
const bullet = (text: string) => para(run(text, '<w:sz w:val="17"/>'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="60"/>');
const cell = (w: number, inner: string, extra = "") => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra}</w:tcPr>${inner}</w:tc>`;
const table = (style: string, grid: number[], rows: string[], width = grid.reduce((a, b) => a + b, 0)) =>
  `<w:tbl><w:tblPr><w:tblStyle w:val="${style}"/><w:tblW w:w="${width}.0" w:type="dxa"/><w:jc w:val="center"/><w:tblInd w:w="-115.0" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
const image = (id: number, cx = 2999232, cy = 1999488) =>
  `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="114300" distR="114300"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagen ${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="foto.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId9"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

export function fixture094(): Uint8Array {
  const head = (text: string) => cell(2556, para(run(text, '<w:b/><w:color w:val="FFFFFF"/><w:sz w:val="17"/>'), '<w:jc w:val="center"/>'), `<w:shd w:val="clear" w:fill="183B5B"/>${BORDER("FFFFFF", 4)}<w:vAlign w:val="center"/>`);
  const sectorRow = (sector: string) =>
    `<w:tr>${cell(2556, para(run(sector, '<w:b/><w:color w:val="183B5B"/><w:sz w:val="17"/>'), '<w:jc w:val="center"/>'), `<w:shd w:val="clear" w:fill="EAF3F8"/>${BORDER("D9E1E8")}`)}${T94.bullets.map((list) => cell(2556, list.map(bullet).join(""), BORDER("D9E1E8"))).join("")}</w:tr>`;
  const body = [
    para(run(T94.title), '<w:pStyle w:val="Title"/>'),
    table("Table1", [10224], [`<w:tr>${cell(10224, para(run(T94.box, "<w:b/>")) + para(run(T94.boxText, '<w:sz w:val="17"/>')), `<w:shd w:val="clear" w:fill="EAF3F8"/>${BORDER("EAF3F8", 4)}<w:tcMar><w:top w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/></w:tcMar>`)}</w:tr>`]),
    para(run("Importante:", "<w:b/>") + run(" 2. Tabla comparativa")),
    table("Table3", [2556, 2556, 2556, 2556], [`<w:tr><w:trPr><w:tblHeader/></w:trPr>${T94.heads.map(head).join("")}</w:tr>`, ...T94.sectors.map(sectorRow)]),
    // Símbolos: «·» escrito, w:sym de Symbol (F0B7 = •) y texto en Wingdings («ü» = ✓).
    para(run(T94.symbols) + `<w:r><w:sym w:font="Symbol" w:char="F0B7"/></w:r>` + run(" ") + run("ü", '<w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings"/>')),
    para(run("3.1. Pesca"), '<w:pStyle w:val="Heading2"/>'),
    table("Table5", [5112, 5112], [
      `<w:tr>${cell(5112, para(image(21), '<w:jc w:val="center"/>'))}${cell(5112, para(image(22), '<w:jc w:val="center"/>'))}</w:tr>`,
      `<w:tr>${T94.captions.map((caption) => cell(5112, para(run(caption, '<w:i/><w:sz w:val="16"/>'), '<w:jc w:val="center"/>'))).join("")}</w:tr>`,
    ]),
    // Más ancha que la hoja: 14 000 twips frente a 10 224 útiles, e imagen de 9 000 000 EMU (≈ 945 px).
    table("Table1", [4666, 4667, 4667], [`<w:tr>${T94.wide.map((text) => cell(4666, para(run(text)), BORDER("000000"))).join("")}</w:tr>`]),
    para(image(23, 9000000, 3000000)),
    para(`<w:r><w:br w:type="page"/></w:r>` + run(T94.after)),
    `<w:sectPr><w:headerReference w:type="default" r:id="rId5"/><w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/><w:pgMar w:top="1008" w:right="1008" w:bottom="936" w:left="1008" w:header="720" w:footer="720"/></w:sectPr>`,
  ].join("");
  const document = `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS82}><w:body>${body}</w:body></w:document>`;
  const styles = `<?xml version="1.0"?><w:styles ${NS82}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="222222"/><w:sz w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:rFonts w:ascii="Play" w:hAnsi="Play"/><w:b/><w:color w:val="183B5B"/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:color w:val="2E75B6"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="TableNormal"/><w:tblPr><w:tblCellMar><w:top w:w="100.0" w:type="dxa"/><w:left w:w="100.0" w:type="dxa"/><w:bottom w:w="100.0" w:type="dxa"/><w:right w:w="100.0" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
${["Table1", "Table3", "Table5"].map((id) => `<w:style w:type="table" w:styleId="${id}"><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblCellMar><w:top w:w="0.0" w:type="dxa"/><w:left w:w="115.0" w:type="dxa"/><w:bottom w:w="0.0" w:type="dxa"/><w:right w:w="115.0" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`).join("")}</w:styles>`;
  const numbering = `<?xml version="1.0"?><w:numbering ${NS82}><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Noto Sans Symbols" w:hAnsi="Noto Sans Symbols"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/foto.png"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const header = `<?xml version="1.0"?><w:hdr ${NS82}><w:p><w:r><w:t xml:space="preserve">IPE · Enfermedades profesionales por sectores</w:t></w:r></w:p></w:hdr>`;
  const CT = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`;
  return zipStore([
    { name: "[Content_Types].xml", data: enc(CT) },
    { name: "_rels/.rels", data: enc(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/document.xml", data: enc(document) },
    { name: "word/styles.xml", data: enc(styles) },
    { name: "word/numbering.xml", data: enc(numbering) },
    { name: "word/header1.xml", data: enc(header) },
    { name: "word/_rels/document.xml.rels", data: enc(rels) },
    { name: "word/media/foto.png", data: Uint8Array.from(atob(FLOAT_PNG), (c) => c.charCodeAt(0)) },
  ]);
}

/** Todas las palabras que el documento debe conservar (sin cabecera). */
export function words094(): string[] {
  const all = [T94.title, T94.box, T94.boxText, T94.intro, ...T94.heads, ...T94.sectors, ...T94.bullets.flat(), T94.symbols, "3.1. Pesca", ...T94.captions, ...T94.wide, T94.after];
  return all.join(" ").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}
