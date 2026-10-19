import { zipStore, unzip } from "../sheets/zip";
import { encodeUtf8, decodeUtf8 } from "../security/bytes";
import { PT, SLIDE_H, SLIDE_W, LIMITS, lineBox, newId, type ShapeKind, type Slide, type SlideItem, type SlidesFile, type TextStyle, type SlideTransition, type ListKind, type Placeholder } from "./model";
import { themeOf } from "./SlideView";
import { THEMES } from "./themes";

/** 1 px lógico (96 ppp) = 9525 EMU, así 960 × 540 son exactamente 10 × 5,625 pulgadas. */
const EMU = 9525;
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const PRESET: Record<ShapeKind, string> = {
  rect: "rect", round: "roundRect", ellipse: "ellipse", triangle: "triangle", "right-triangle": "rtTriangle", diamond: "diamond",
  pentagon: "pentagon", hexagon: "hexagon", octagon: "octagon", star: "star5", heart: "heart", plus: "plus", cloud: "cloud",
  callout: "wedgeRectCallout", "arrow-right": "rightArrow", "arrow-left": "leftArrow", "arrow-up": "upArrow", "arrow-down": "downArrow", chevron: "chevron",
};

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}
const e = (px: number) => Math.round(px * EMU);
const hex = (c: string | undefined, fallback: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback).slice(1).toUpperCase();
const solid = (c: string) => `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`;
const dashOf = (d: string | undefined) => (d === "dash" ? '<a:prstDash val="dash"/>' : d === "dot" ? '<a:prstDash val="sysDot"/>' : "");

function dataUrlBytes(src: string): { bytes: Uint8Array; ext: string } | null {
  const m = /^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i.exec(src);
  if (!m) return null;
  const bin = atob(m[2]!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const ext = m[1]!.toLowerCase() === "jpg" ? "jpeg" : m[1]!.toLowerCase();
  return { bytes, ext };
}

type Ctx = { rels: string[]; media: Array<{ name: string; data: Uint8Array }>; nextRel: number; nextId: number; slideIndex: number; slideCount: number };

function rel(ctx: Ctx, type: string, target: string, external = false): string {
  const id = `rId${ctx.nextRel++}`;
  ctx.rels.push(`<Relationship Id="${id}" Type="${REL}/${type}" Target="${esc(target)}"${external ? ' TargetMode="External"' : ""}/>`);
  return id;
}

function linkXml(ctx: Ctx, link: string | undefined): string {
  if (!link) return "";
  const m = /^#slide=(\d+)$/.exec(link);
  if (m) {
    const n = Number(m[1]);
    if (n < 1 || n > ctx.slideCount) return "";
    return `<a:hlinkClick r:id="${rel(ctx, "slide", `slide${n}.xml`)}" action="ppaction://hlinksldjump"/>`;
  }
  return `<a:hlinkClick r:id="${rel(ctx, "hyperlink", link, true)}"/>`;
}

function xfrm(item: SlideItem, extra = ""): string {
  const rot = item.rot ? ` rot="${Math.round((((item.rot % 360) + 360) % 360) * 60000)}"` : "";
  return `<a:xfrm${rot}${extra}><a:off x="${e(item.x)}" y="${e(item.y)}"/><a:ext cx="${e(Math.max(1, item.w))}" cy="${e(Math.max(1, item.h))}"/></a:xfrm>`;
}

function defaultSize(item: SlideItem & TextStyle): number {
  if (item.kind === "text") {
    if (item.placeholder === "title") return 32;
    if (item.placeholder === "number") return 120;
    if (item.placeholder === "subtitle") return 24;
  }
  return 18;
}

function txBody(item: SlideItem & TextStyle, slide: Slide, defaults: { align: string; anchor: string }): string {
  const theme = themeOf(slide);
  const isTitle = item.kind === "text" && (item.placeholder === "title" || item.placeholder === "number");
  const color = item.kind === "shape" ? hex(item.color, "#" + (inkHex(item.fill))) : hex(item.color, isTitle ? theme.title : theme.text);
  const font = item.font ?? (isTitle ? theme.titleFont : theme.bodyFont);
  const sz = Math.round((item.size ?? defaultSize(item)) * 100);
  const algn = item.align === "center" ? "ctr" : item.align === "right" ? "r" : item.align === "justify" ? "just" : item.align === "left" ? "l" : defaults.align;
  const anchor = item.valign === "middle" ? "ctr" : item.valign === "bottom" ? "b" : item.valign === "top" ? "t" : defaults.anchor;
  const lnSpc = `<a:lnSpc><a:spcPct val="${Math.round((item.lineHeight ?? 1.15) * 100000)}"/></a:lnSpc>`;
  const bullet = item.list === "bullet" ? '<a:buFont typeface="Arial"/><a:buChar char="•"/>' : item.list === "number" ? '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>' : "<a:buNone/>";
  const mar = item.list === "bullet" || item.list === "number" ? ` marL="${e(item.size ? item.size * PT * 1.2 : 28)}" indent="-${e(item.size ? item.size * PT * 1.2 : 28)}"` : ' marL="0" indent="0"';
  const rPr = (tag: "a:rPr" | "a:endParaRPr") => `<${tag} lang="es-ES" sz="${sz}"${item.bold ? ' b="1"' : ' b="0"'}${item.italic ? ' i="1"' : ""}${item.underline ? ' u="sng"' : ""}${item.strike ? ' strike="sngStrike"' : ""} dirty="0">${solid(color)}${item.highlight && tag === "a:rPr" ? `<a:highlight><a:srgbClr val="${hex(item.highlight, "#ffff00")}"/></a:highlight>` : ""}<a:latin typeface="${esc(font)}"/><a:cs typeface="${esc(font)}"/></${tag}>`;
  const paras = (item.text || "").split("\n").map((line) => `<a:p><a:pPr algn="${algn}"${mar}>${lnSpc}${bullet}</a:pPr>${line ? `<a:r>${rPr("a:rPr")}<a:t>${esc(line)}</a:t></a:r>` : ""}${rPr("a:endParaRPr")}</a:p>`);
  const ins = e(8);
  return `<p:txBody><a:bodyPr wrap="square" lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}" anchor="${anchor}" rtlCol="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras.join("")}</p:txBody>`;
}

function inkHex(fill: string | undefined): string {
  if (!fill || !/^#[0-9a-f]{6}$/i.test(fill)) return "102032";
  const r = Number.parseInt(fill.slice(1, 3), 16), g = Number.parseInt(fill.slice(3, 5), 16), b = Number.parseInt(fill.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? "FFFFFF" : "102032";
}

async function itemXml(ctx: Ctx, item: SlideItem, slide: Slide, chartPng: (item: SlideItem) => Promise<Uint8Array | null>): Promise<string> {
  const id = ctx.nextId++;
  const name = (k: string) => `${k} ${id}`;
  const hl = linkXml(ctx, item.link);
  if (item.kind === "text") {
    const ph = item.placeholder === "title" ? '<p:ph type="title"/>' : "";
    const fill = item.fill ? solid(hex(item.fill, "#ffffff")) : "<a:noFill/>";
    const ln = item.stroke ? `<a:ln w="${e(2)}">${solid(hex(item.stroke, "#102032"))}</a:ln>` : "<a:ln><a:noFill/></a:ln>";
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name(item.placeholder === "title" ? "Title" : "TextBox")}">${hl}</p:cNvPr><p:cNvSpPr txBox="1"/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${xfrm(item)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}${ln}</p:spPr>${txBody(item, slide, { align: "l", anchor: "t" })}</p:sp>`;
  }
  if (item.kind === "shape") {
    const sw = item.stroke === "none" ? 0 : item.strokeWidth ?? 2;
    const fill = item.fill === "none" ? "<a:noFill/>" : solid(hex(item.fill, "#ff3070"));
    const ln = sw > 0 ? `<a:ln w="${e(sw)}">${solid(hex(item.stroke, "#102032"))}${dashOf(item.dash)}</a:ln>` : "<a:ln><a:noFill/></a:ln>";
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name("Shape")}">${hl}</p:cNvPr><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(item)}<a:prstGeom prst="${PRESET[item.shape] ?? "rect"}"><a:avLst/></a:prstGeom>${fill}${ln}</p:spPr>${txBody(item, slide, { align: "ctr", anchor: "ctr" })}</p:sp>`;
  }
  if (item.kind === "line") {
    const theme = themeOf(slide);
    const flipH = item.x2 < item.x1 ? ' flipH="1"' : "";
    const flipV = item.y2 < item.y1 ? ' flipV="1"' : "";
    const box = { ...item, x: Math.min(item.x1, item.x2), y: Math.min(item.y1, item.y2), w: Math.abs(item.x2 - item.x1), h: Math.abs(item.y2 - item.y1), rot: 0 };
    const end = (k: string | undefined) => (k === "arrow" ? "triangle" : k === "dot" ? "oval" : "none");
    return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${name("Line")}">${hl}</p:cNvPr><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrm(box as SlideItem, flipH + flipV).replace(/cx="\d+"/, `cx="${e(box.w)}"`).replace(/cy="\d+"/, `cy="${e(box.h)}"`)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${e(item.width ?? 2)}">${solid(hex(item.color, theme.title))}${dashOf(item.dash)}<a:headEnd type="${end(item.start)}"/><a:tailEnd type="${end(item.end)}"/></a:ln></p:spPr></p:cxnSp>`;
  }
  if (item.kind === "table") {
    const theme = themeOf(slide);
    const cols = item.rows[0]?.length ?? 1;
    const rh = e(item.h / Math.max(1, item.rows.length));
    const cw = e(item.w / cols);
    const border = ["lnL", "lnR", "lnT", "lnB"].map((t) => `<a:${t} w="12700">${solid("102032")}</a:${t}>`).join("");
    const rows = item.rows.map((row, r) => {
      const head = item.header !== false && r === 0;
      const color = head ? inkHex(theme.accent) : hex(item.color, theme.text);
      const cells = row.map((cell) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p>${cell ? `<a:r><a:rPr lang="es-ES" sz="${Math.round((item.size ?? 14) * 100)}"${head ? ' b="1"' : ""} dirty="0">${solid(color)}<a:latin typeface="${esc(item.font ?? theme.bodyFont)}"/></a:rPr><a:t>${esc(cell)}</a:t></a:r>` : ""}</a:p></a:txBody><a:tcPr>${border}${head ? solid(hex(theme.accent, "#ff3070")) : item.fill ? solid(hex(item.fill, "#ffffff")) : "<a:noFill/>"}</a:tcPr></a:tc>`).join("");
      return `<a:tr h="${rh}">${cells}</a:tr>`;
    }).join("");
    return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${name("Table")}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e(item.x)}" y="${e(item.y)}"/><a:ext cx="${e(item.w)}" cy="${e(item.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="${item.header !== false ? 1 : 0}" bandRow="0"/><a:tblGrid>${Array.from({ length: cols }, () => `<a:gridCol w="${cw}"/>`).join("")}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  }
  // imagen, gráfico (como imagen) o vídeo (póster con enlace)
  let bytes: { bytes: Uint8Array; ext: string } | null = null;
  let crop = "";
  let alpha = "";
  let link = hl;
  if (item.kind === "image") {
    bytes = dataUrlBytes(item.src);
    const c = item.crop;
    if (c) crop = `<a:srcRect l="${Math.round(c.l * 100000)}" t="${Math.round(c.t * 100000)}" r="${Math.round(c.r * 100000)}" b="${Math.round(c.b * 100000)}"/>`;
    if (item.opacity !== undefined && item.opacity < 1) alpha = `<a:alphaModFix amt="${Math.round(item.opacity * 100000)}"/>`;
  } else {
    const png = await chartPng(item);
    if (png) bytes = { bytes: png, ext: "png" };
    if (item.kind === "video" && item.youtube && !item.link) link = linkXml(ctx, `https://www.youtube.com/watch?v=${item.youtube}`);
  }
  if (!bytes) return "";
  const media = `image${ctx.slideIndex}_${id}.${bytes.ext}`;
  ctx.media.push({ name: `ppt/media/${media}`, data: bytes.bytes });
  const rid = rel(ctx, "image", `../media/${media}`);
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${name(item.kind === "chart" ? "Chart" : item.kind === "video" ? "Video" : "Picture")}">${link}</p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}">${alpha}</a:blip>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(item)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function transitionXml(t: SlideTransition | undefined, duration: number | undefined): string {
  if (!t || t === "none") return "";
  const spd = (duration ?? 0.6) <= 0.4 ? "fast" : (duration ?? 0.6) >= 1 ? "slow" : "med";
  const body = t === "dissolve" ? "<p:dissolve/>" : t === "slide-right" || t === "slide" ? '<p:push dir="l"/>' : t === "slide-left" ? '<p:push dir="r"/>' : t === "cube" || t === "gallery" ? '<p:cover dir="l"/>' : t === "flip" ? '<p:split orient="vert"/>' : "<p:fade/>";
  return `<p:transition spd="${spd}">${body}</p:transition>`;
}

const GROUP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

function themeXml(name: string): string {
  const t = THEMES.papel;
  const c = (v: string) => `<a:srgbClr val="${v.slice(1).toUpperCase()}"/>`;
  const fill3 = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`;
  return `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${name}"><a:themeElements><a:clrScheme name="ORVUPI"><a:dk1>${c("#102032")}</a:dk1><a:lt1>${c("#ffffff")}</a:lt1><a:dk2>${c("#3a2b33")}</a:dk2><a:lt2>${c(t.bg)}</a:lt2><a:accent1>${c("#ff3070")}</a:accent1><a:accent2>${c("#102032")}</a:accent2><a:accent3>${c("#007960")}</a:accent3><a:accent4>${c("#1d4e89")}</a:accent4><a:accent5>${c("#ffb000")}</a:accent5><a:accent6>${c("#9c1446")}</a:accent6><a:hlink>${c("#1d4e89")}</a:hlink><a:folHlink>${c("#9c1446")}</a:folHlink></a:clrScheme><a:fontScheme name="ORVUPI"><a:majorFont><a:latin typeface="Montserrat"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Inter"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ORVUPI"><a:fillStyleLst>${fill3}</a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill3}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

const CLRMAP = 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';

function ph(id: number, name: string, type: string, x: number, y: number, w: number, h: number, idx?: number): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="${type}"${idx !== undefined ? ` idx="${idx}"` : ""}/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="es-ES"/></a:p></p:txBody></p:sp>`;
}

/** Exporta a PowerPoint (.pptx, PresentationML) con texto editable, formas, líneas, imágenes, tablas, notas, transiciones y enlaces. */
export async function exportPptx(file: SlidesFile, options: { chartPng?: (item: SlideItem, slide: Slide) => Promise<Uint8Array | null> } = {}): Promise<Uint8Array> {
  const files: Array<{ name: string; data: Uint8Array }> = [];
  const put = (name: string, text: string) => files.push({ name, data: encodeUtf8(text) });
  const n = file.slides.length;
  const pngOf = options.chartPng ?? (async (item: SlideItem, slide: Slide) => {
    try {
      const { itemPng } = await import("./render");
      return await itemPng(item, slide);
    } catch {
      return null;
    }
  });
  const exts = new Set<string>();
  const slideXml: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const slide = file.slides[i]!;
    const ctx: Ctx = { rels: [], media: [], nextRel: 1, nextId: 2, slideIndex: i + 1, slideCount: n };
    rel(ctx, "slideLayout", "../slideLayouts/slideLayout1.xml");
    const theme = themeOf(slide);
    let bg = `<p:bg><p:bgPr>${solid(hex(slide.background, theme.bg))}<a:effectLst/></p:bgPr></p:bg>`;
    const bgImage = slide.backgroundImage ? dataUrlBytes(slide.backgroundImage) : null;
    if (bgImage) {
      const media = `bg${i + 1}.${bgImage.ext}`;
      ctx.media.push({ name: `ppt/media/${media}`, data: bgImage.bytes });
      bg = `<p:bg><p:bgPr><a:blipFill><a:blip r:embed="${rel(ctx, "image", `../media/${media}`)}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`;
    }
    const shapes: string[] = [];
    for (const item of slide.items) shapes.push(await itemXml(ctx, item, slide, (it) => pngOf(it, slide)));
    if (file.master) shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${ctx.nextId++}" name="Footer"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(20)}" y="${e(SLIDE_H - 40)}"/><a:ext cx="${e(500)}" cy="${e(30)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-ES" sz="1000">${solid(hex(theme.text, "#102032"))}</a:rPr><a:t>${esc(file.master)}</a:t></a:r></a:p></p:txBody></p:sp>`);
    if (file.numbers) shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${ctx.nextId++}" name="Slide Number"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(SLIDE_W - 90)}" y="${e(SLIDE_H - 40)}"/><a:ext cx="${e(70)}" cy="${e(30)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="r"/><a:r><a:rPr lang="es-ES" sz="1000">${solid(hex(theme.text, "#102032"))}</a:rPr><a:t>${i + 1}</a:t></a:r></a:p></p:txBody></p:sp>`);
    rel(ctx, "notesSlide", `../notesSlides/notesSlide${i + 1}.xml`);
    for (const m of ctx.media) { files.push(m); exts.add(m.name.split(".").pop()!); }
    put(`ppt/slides/slide${i + 1}.xml`, `${XML}<p:sld ${NS}${slide.hidden ? ' show="0"' : ""}><p:cSld>${bg}<p:spTree>${GROUP}${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>${transitionXml(slide.transition, slide.duration)}</p:sld>`);
    put(`ppt/slides/_rels/slide${i + 1}.xml.rels`, `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${ctx.rels.join("")}</Relationships>`);
    const notes = (slide.notes ?? "").split("\n").map((l) => `<a:p>${l ? `<a:r><a:rPr lang="es-ES" dirty="0"/><a:t>${esc(l)}</a:t></a:r>` : '<a:endParaRPr lang="es-ES"/>'}</a:p>`).join("");
    put(`ppt/notesSlides/notesSlide${i + 1}.xml`, `${XML}<p:notes ${NS}><p:cSld><p:spTree>${GROUP}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${notes}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`);
    put(`ppt/notesSlides/_rels/notesSlide${i + 1}.xml.rels`, `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/notesMaster" Target="../notesMasters/notesMaster1.xml"/><Relationship Id="rId2" Type="${REL}/slide" Target="../slides/slide${i + 1}.xml"/></Relationships>`);
    slideXml.push(`<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`);
  }
  const ct = (part: string, type: string) => `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/>`;
  const mime: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
  put("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...exts].map((x) => `<Default Extension="${x}" ContentType="${mime[x] ?? "image/png"}"/>`).join("")}${ct("/ppt/presentation.xml", "presentationml.presentation.main+xml")}${ct("/ppt/slideMasters/slideMaster1.xml", "presentationml.slideMaster+xml")}${ct("/ppt/slideLayouts/slideLayout1.xml", "presentationml.slideLayout+xml")}${ct("/ppt/notesMasters/notesMaster1.xml", "presentationml.notesMaster+xml")}${ct("/ppt/theme/theme1.xml", "theme+xml")}${ct("/ppt/theme/theme2.xml", "theme+xml")}${ct("/ppt/presProps.xml", "presentationml.presProps+xml")}${ct("/ppt/viewProps.xml", "presentationml.viewProps+xml")}${ct("/ppt/tableStyles.xml", "presentationml.tableStyles+xml")}${file.slides.map((_, i) => ct(`/ppt/slides/slide${i + 1}.xml`, "presentationml.slide+xml") + ct(`/ppt/notesSlides/notesSlide${i + 1}.xml`, "presentationml.notesSlide+xml")).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${ct("/docProps/app.xml", "extended-properties+xml")}</Types>`);
  put("_rels/.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  put("docProps/core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(file.title)}</dc:title><dc:creator>ORVUPI Work</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  put("docProps/app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ORVUPI Work</Application><Slides>${n}</Slides></Properties>`);
  put("ppt/presentation.xml", `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId3"/></p:notesMasterIdLst><p:sldIdLst>${slideXml.join("")}</p:sldIdLst><p:sldSz cx="${e(SLIDE_W)}" cy="${e(SLIDE_H)}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  put("ppt/_rels/presentation.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="theme/theme1.xml"/><Relationship Id="rId3" Type="${REL}/notesMaster" Target="notesMasters/notesMaster1.xml"/><Relationship Id="rId4" Type="${REL}/presProps" Target="presProps.xml"/><Relationship Id="rId5" Type="${REL}/viewProps" Target="viewProps.xml"/><Relationship Id="rId6" Type="${REL}/tableStyles" Target="tableStyles.xml"/>${file.slides.map((_, i) => `<Relationship Id="rId${10 + i}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`);
  put("ppt/presProps.xml", `${XML}<p:presentationPr ${NS}/>`);
  put("ppt/viewProps.xml", `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
  put("ppt/tableStyles.xml", `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);
  put("ppt/theme/theme1.xml", themeXml("ORVUPI"));
  put("ppt/theme/theme2.xml", themeXml("ORVUPI Notas"));
  put("ppt/slideMasters/slideMaster1.xml", `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${GROUP}${ph(2, "Title Placeholder 1", "title", e(48), e(40), e(864), e(90))}${ph(3, "Text Placeholder 2", "body", e(48), e(150), e(864), e(340), 1)}</p:spTree></p:cSld><p:clrMap ${CLRMAP}/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`);
  put("ppt/slideMasters/_rels/slideMaster1.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`);
  put("ppt/slideLayouts/slideLayout1.xml", `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="En blanco"><p:spTree>${GROUP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  put("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  put("ppt/notesMasters/notesMaster1.xml", `${XML}<p:notesMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${GROUP}${ph(2, "Slide Image Placeholder 1", "sldImg", 381000, 685800, 6096000, 3429000)}${ph(3, "Notes Placeholder 2", "body", 685800, 4343400, 5486400, 4114800, 1)}</p:spTree></p:cSld><p:clrMap ${CLRMAP}/></p:notesMaster>`);
  put("ppt/notesMasters/_rels/notesMaster1.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/theme" Target="../theme/theme2.xml"/></Relationships>`);
  return zipStore(files);
}

/* ================================================================ importación */

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function kids(el: Element | null | undefined, ns: string, name: string): Element[] {
  if (!el) return [];
  return [...el.children].filter((c) => c.namespaceURI === ns && c.localName === name);
}
function kid(el: Element | null | undefined, ns: string, name: string): Element | undefined {
  return kids(el, ns, name)[0];
}
function deep(el: Element | null | undefined, ns: string, name: string): Element | undefined {
  return el ? (el.getElementsByTagNameNS(ns, name)[0] ?? undefined) : undefined;
}
function parseXml(bytes: Uint8Array | undefined): Document | null {
  if (!bytes) return null;
  const doc = new DOMParser().parseFromString(decodeUtf8(bytes), "application/xml");
  return doc.getElementsByTagName("parsererror").length ? null : doc;
}
function relsOf(files: Map<string, Uint8Array>, part: string): Map<string, { type: string; target: string; external: boolean }> {
  const dir = part.slice(0, part.lastIndexOf("/"));
  const name = part.slice(part.lastIndexOf("/") + 1);
  const doc = parseXml(files.get(`${dir}/_rels/${name}.rels`));
  const out = new Map<string, { type: string; target: string; external: boolean }>();
  if (!doc) return out;
  for (const r of [...doc.getElementsByTagName("Relationship")]) {
    const target = r.getAttribute("Target") ?? "";
    const external = r.getAttribute("TargetMode") === "External";
    out.set(r.getAttribute("Id") ?? "", { type: (r.getAttribute("Type") ?? "").split("/").pop() ?? "", target: external ? target : resolve(dir, target), external });
  }
  return out;
}
function resolve(dir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = dir.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

type Colors = Record<string, string>;
function colorOf(el: Element | undefined, scheme: Colors): string | undefined {
  if (!el) return undefined;
  const srgb = kid(el, A, "srgbClr");
  if (srgb) return `#${(srgb.getAttribute("val") ?? "000000").toLowerCase()}`;
  const sc = kid(el, A, "schemeClr");
  if (sc) {
    const v = sc.getAttribute("val") ?? "";
    const map: Record<string, string> = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
    return scheme[map[v] ?? v];
  }
  const sys = kid(el, A, "sysClr");
  if (sys) return `#${(sys.getAttribute("lastClr") ?? "000000").toLowerCase()}`;
  return undefined;
}
function fillOf(spPr: Element | undefined, scheme: Colors): string | undefined | "none" {
  if (!spPr) return undefined;
  if (kid(spPr, A, "noFill")) return "none";
  return colorOf(kid(spPr, A, "solidFill"), scheme);
}
function bytesToDataUrl(bytes: Uint8Array, path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : null;
  if (!mime || bytes.byteLength > 5 * 1024 * 1024) return null;
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

const FROM_PRESET: Record<string, ShapeKind> = Object.fromEntries(Object.entries(PRESET).map(([k, v]) => [v, k as ShapeKind]));
Object.assign(FROM_PRESET, { flowChartProcess: "rect", flowChartAlternateProcess: "round", roundRect: "round", star4: "star", star6: "star", homePlate: "pentagon", wedgeRoundRectCallout: "callout", wedgeEllipseCallout: "callout", mathPlus: "plus", parallelogram: "rect", trapezoid: "rect" });

type Geo = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean };
type Map2 = (g: Geo) => Geo;

function geoOf(x: Element | undefined, k: number, map: Map2): Geo | null {
  if (!x) return null;
  const off = kid(x, A, "off");
  const ext = kid(x, A, "ext");
  if (!off || !ext) return null;
  return map({
    x: Number(off.getAttribute("x") ?? 0) * k,
    y: Number(off.getAttribute("y") ?? 0) * k,
    w: Number(ext.getAttribute("cx") ?? 0) * k,
    h: Number(ext.getAttribute("cy") ?? 0) * k,
    rot: Number(x.getAttribute("rot") ?? 0) / 60000,
    flipH: x.getAttribute("flipH") === "1",
    flipV: x.getAttribute("flipV") === "1",
  });
}

function phKey(sp: Element): { type: string; idx: string } | null {
  const nv = [...sp.children].find((c) => c.localName.startsWith("nv"));
  const ph = nv ? deep(nv, P, "ph") : undefined;
  if (!ph) return null;
  return { type: ph.getAttribute("type") ?? "body", idx: ph.getAttribute("idx") ?? "" };
}

function findPh(doc: Document | null, key: { type: string; idx: string }): Element | undefined {
  if (!doc) return undefined;
  const all = [...doc.getElementsByTagNameNS(P, "sp")];
  const norm = (t: string) => (t === "ctrTitle" ? "title" : t);
  return all.find((sp) => { const k = phKey(sp); return k && k.idx && k.idx === key.idx; })
    ?? all.find((sp) => { const k = phKey(sp); return k && norm(k.type) === norm(key.type); });
}

function textOf(txBody: Element | undefined, scheme: Colors, ptK: number): (TextStyle & { any: boolean }) | null {
  if (!txBody) return null;
  const paras = kids(txBody, A, "p");
  const linesOut: string[] = [];
  let style: Partial<TextStyle> = {};
  let found = false;
  let list: ListKind | undefined;
  let align: TextStyle["align"];
  for (const p of paras) {
    const pPr = kid(p, A, "pPr");
    if (pPr && !align) {
      const a = pPr.getAttribute("algn");
      align = a === "ctr" ? "center" : a === "r" ? "right" : a === "just" ? "justify" : a === "l" ? "left" : undefined;
    }
    if (pPr && list === undefined) list = kid(pPr, A, "buChar") ? "bullet" : kid(pPr, A, "buAutoNum") ? "number" : undefined;
    let line = "";
    for (const node of [...p.children]) {
      if (node.localName === "br") { line += "\n"; continue; }
      if (node.localName !== "r" && node.localName !== "fld") continue;
      const t = kid(node, A, "t")?.textContent ?? "";
      line += t;
      const rPr = kid(node, A, "rPr");
      if (!found && rPr && t.trim()) {
        found = true;
        const sz = rPr.getAttribute("sz");
        style = {
          size: sz ? Math.max(1, Math.round((Number(sz) / 100) * ptK)) : undefined,
          bold: rPr.getAttribute("b") === "1" || undefined,
          italic: rPr.getAttribute("i") === "1" || undefined,
          underline: rPr.getAttribute("u") && rPr.getAttribute("u") !== "none" ? true : undefined,
          strike: rPr.getAttribute("strike") && rPr.getAttribute("strike") !== "noStrike" ? true : undefined,
          color: colorOf(kid(rPr, A, "solidFill"), scheme),
          highlight: colorOf(kid(rPr, A, "highlight"), scheme),
          font: kid(rPr, A, "latin")?.getAttribute("typeface") ?? undefined,
        };
      }
    }
    linesOut.push(line);
  }
  while (linesOut.length > 1 && !linesOut[linesOut.length - 1]) linesOut.pop();
  const bodyPr = kid(txBody, A, "bodyPr");
  const anchor = bodyPr?.getAttribute("anchor");
  const text = linesOut.join("\n").slice(0, 4000);
  return { ...style, text, align, list, valign: anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : anchor === "t" ? "top" : undefined, any: text.trim().length > 0 };
}

const FONTS = ["Inter", "Arial", "Roboto", "Montserrat", "Lora", "Merriweather", "Georgia", "Courier New"];
function cleanFont(f: string | undefined): string | undefined {
  if (!f) return undefined;
  if (FONTS.includes(f)) return f;
  if (/calibri|helvetica|segoe|open sans|lato/i.test(f)) return "Arial";
  if (/times|cambria|garamond/i.test(f)) return "Georgia";
  if (/courier|consolas|mono/i.test(f)) return "Courier New";
  return undefined;
}

/** Importa un .pptx real: texto con formato, formas, líneas, imágenes (con recorte), tablas, fondos, notas, ocultas y transiciones. */
export async function importPptx(bytes: Uint8Array): Promise<{ slides: Slide[]; title?: string }> {
  const files = await unzip(bytes);
  const pres = parseXml(files.get("ppt/presentation.xml"));
  if (!pres) throw new Error("pptx");
  const sz = deep(pres.documentElement, P, "sldSz");
  const cx = Number(sz?.getAttribute("cx") ?? 9144000) || 9144000;
  const cy = Number(sz?.getAttribute("cy") ?? 5143500) || 5143500;
  // Se encaja en 960 × 540 manteniendo la proporción (4:3 queda centrada).
  const k = Math.min(SLIDE_W / cx, SLIDE_H / cy);
  const ox = (SLIDE_W - cx * k) / 2;
  const oy = (SLIDE_H - cy * k) / 2;
  const ptK = (k * EMU); // pt del original → pt del lienzo de 10 in
  const presRels = relsOf(files, "ppt/presentation.xml");
  const themePart = [...presRels.values()].find((r) => r.type === "theme")?.target;
  const scheme: Colors = {};
  const themeDoc = parseXml(themePart ? files.get(themePart) : undefined);
  const clr = themeDoc ? deep(themeDoc.documentElement, A, "clrScheme") : undefined;
  for (const c of clr ? [...clr.children] : []) { const v = colorOf(c, {}); if (v) scheme[c.localName] = v; }
  const ids = [...pres.getElementsByTagNameNS(P, "sldId")].map((s) => s.getAttributeNS(R, "id") ?? "").filter(Boolean);
  const slides: Slide[] = [];
  for (const rid of ids.slice(0, LIMITS.MAX_SLIDES)) {
    const part = presRels.get(rid)?.target;
    const doc = part ? parseXml(files.get(part)) : null;
    if (!part || !doc) continue;
    const rels = relsOf(files, part);
    const layoutPart = [...rels.values()].find((r) => r.type === "slideLayout")?.target;
    const layoutDoc = layoutPart ? parseXml(files.get(layoutPart)) : null;
    const masterPart = layoutPart ? [...relsOf(files, layoutPart).values()].find((r) => r.type === "slideMaster")?.target : undefined;
    const masterDoc = masterPart ? parseXml(files.get(masterPart)) : null;
    const root = doc.documentElement;
    const items: SlideItem[] = [];
    const ident: Map2 = (g) => ({ ...g, x: g.x + ox, y: g.y + oy });
    const linkOf = (el: Element): string | undefined => {
      const h = deep(el, A, "hlinkClick");
      const id = h?.getAttributeNS(R, "id");
      const r = id ? rels.get(id) : undefined;
      if (!r) return undefined;
      if (r.external) return /^(https?:|mailto:)/i.test(r.target) ? r.target : undefined;
      const m = /slide(\d+)\.xml$/.exec(r.target);
      if (m) {
        const idx = ids.findIndex((x) => presRels.get(x)?.target === r.target);
        return idx >= 0 ? `#slide=${idx + 1}` : undefined;
      }
      return undefined;
    };
    const walk = (tree: Element, map: Map2) => {
      for (const el of [...tree.children]) {
        if (items.length >= LIMITS.MAX_ITEMS) return;
        const name = el.localName;
        if (name === "grpSp") {
          const x = deep(kid(el, P, "grpSpPr"), A, "xfrm");
          const off = kid(x, A, "off"), ext = kid(x, A, "ext"), chOff = kid(x, A, "chOff"), chExt = kid(x, A, "chExt");
          if (off && ext && chOff && chExt) {
            const sx = Number(ext.getAttribute("cx")) / (Number(chExt.getAttribute("cx")) || 1);
            const sy = Number(ext.getAttribute("cy")) / (Number(chExt.getAttribute("cy")) || 1);
            const dx = Number(off.getAttribute("x")) * k, dy = Number(off.getAttribute("y")) * k;
            const cx0 = Number(chOff.getAttribute("x")) * k, cy0 = Number(chOff.getAttribute("y")) * k;
            const group = newId();
            const before = items.length;
            walk(el, (g) => map({ ...g, x: dx + (g.x - cx0) * sx, y: dy + (g.y - cy0) * sy, w: g.w * sx, h: g.h * sy }));
            for (let i = before; i < items.length; i += 1) items[i] = { ...items[i]!, group };
          } else walk(el, map);
          continue;
        }
        if (name === "sp" || name === "cxnSp") {
          const spPr = kid(el, P, "spPr");
          let g = geoOf(kid(spPr, A, "xfrm"), k, map);
          const key = phKey(el);
          if (!g && key) {
            const inherited = findPh(layoutDoc, key) ?? findPh(masterDoc, key);
            g = inherited ? geoOf(deep(kid(inherited, P, "spPr"), A, "xfrm"), k, ident) : null;
          }
          if (!g) continue;
          const prst = kid(spPr, A, "prstGeom")?.getAttribute("prst") ?? (name === "cxnSp" ? "line" : "rect");
          const ln = kid(spPr, A, "ln");
          const lineColor = ln && !kid(ln, A, "noFill") ? colorOf(kid(ln, A, "solidFill"), scheme) : undefined;
          const lineW = ln?.getAttribute("w") ? Math.max(0.5, Number(ln.getAttribute("w")) * k) : undefined;
          const dashVal = kid(ln, A, "prstDash")?.getAttribute("val");
          const dash = dashVal && dashVal !== "solid" ? (/dot/i.test(dashVal) ? "dot" as const : "dash" as const) : undefined;
          if (name === "cxnSp" || /^(line|straightConnector1|bentConnector\d|curvedConnector\d)$/.test(prst)) {
            const x1 = g.flipH ? g.x + g.w : g.x, x2 = g.flipH ? g.x : g.x + g.w;
            const y1 = g.flipV ? g.y + g.h : g.y, y2 = g.flipV ? g.y : g.y + g.h;
            const end = (t: string | null | undefined) => (!t || t === "none" ? undefined : t === "oval" ? "dot" as const : "arrow" as const);
            items.push(lineBox({ id: newId(), kind: "line", x: 0, y: 0, w: 0, h: 0, x1, y1, x2, y2, color: lineColor, width: lineW, dash, start: end(kid(ln, A, "headEnd")?.getAttribute("type")), end: end(kid(ln, A, "tailEnd")?.getAttribute("type")), link: linkOf(el) }));
            continue;
          }
          const text = textOf(kid(el, P, "txBody"), scheme, ptK);
          const fill = fillOf(spPr, scheme);
          const base = { id: newId(), x: g.x, y: g.y, w: Math.max(4, g.w), h: Math.max(4, g.h), rot: g.rot ? Math.round(g.rot) : undefined, link: linkOf(el) };
          const style: TextStyle = { text: text?.text ?? "", font: cleanFont(text?.font), size: text?.size, color: text?.color, highlight: text?.highlight, bold: text?.bold, italic: text?.italic, underline: text?.underline, strike: text?.strike, align: text?.align, valign: text?.valign, list: text?.list };
          const isBox = prst === "rect" && (fill === undefined || fill === "none") && !lineColor;
          if (isBox || key) {
            if (!text?.any && key) continue; // marcador vacío: en Slides no se ve al presentar
            const placeholder: Placeholder | undefined = key?.type === "title" || key?.type === "ctrTitle" ? "title" : key?.type === "subTitle" ? "subtitle" : key ? "body" : undefined;
            items.push({ ...base, kind: "text", ...style, fill: fill && fill !== "none" ? fill : undefined, stroke: lineColor, placeholder: placeholder === "title" ? "title" : undefined });
          } else {
            items.push({ ...base, kind: "shape", shape: FROM_PRESET[prst] ?? "rect", ...style, fill: fill ?? scheme.accent1 ?? "#ff3070", stroke: lineColor ?? (ln ? "none" : undefined), strokeWidth: lineW, dash });
          }
          continue;
        }
        if (name === "pic") {
          const g = geoOf(deep(kid(el, P, "spPr"), A, "xfrm"), k, map);
          const blip = deep(kid(el, P, "blipFill"), A, "blip");
          const target = blip ? rels.get(blip.getAttributeNS(R, "embed") ?? "")?.target : undefined;
          const data = target ? files.get(target) : undefined;
          const src = data && target ? bytesToDataUrl(data, target) : null;
          if (!g || !src) continue;
          const sr = deep(kid(el, P, "blipFill"), A, "srcRect");
          const c = sr ? { l: Number(sr.getAttribute("l") ?? 0) / 100000, t: Number(sr.getAttribute("t") ?? 0) / 100000, r: Number(sr.getAttribute("r") ?? 0) / 100000, b: Number(sr.getAttribute("b") ?? 0) / 100000 } : undefined;
          const alpha = blip ? deep(blip, A, "alphaModFix")?.getAttribute("amt") : undefined;
          items.push({ id: newId(), kind: "image", src, x: g.x, y: g.y, w: Math.max(4, g.w), h: Math.max(4, g.h), rot: g.rot ? Math.round(g.rot) : undefined, crop: c && c.l + c.t + c.r + c.b > 0 ? { l: Math.min(0.45, c.l), t: Math.min(0.45, c.t), r: Math.min(0.45, c.r), b: Math.min(0.45, c.b) } : undefined, opacity: alpha ? Number(alpha) / 100000 : undefined, link: linkOf(el) });
          continue;
        }
        if (name === "graphicFrame") {
          const tbl = deep(el, A, "tbl");
          const x = kid(el, P, "xfrm");
          const g = geoOf(x, k, map);
          if (!tbl || !g) continue;
          const rows = kids(tbl, A, "tr").slice(0, 20).map((tr) => kids(tr, A, "tc").slice(0, 20).map((tc) => [...tc.getElementsByTagNameNS(A, "t")].map((t) => t.textContent ?? "").join("").slice(0, 500)));
          if (!rows.length) continue;
          const width = Math.max(...rows.map((r) => r.length));
          const firstRow = kid(tbl, A, "tblPr")?.getAttribute("firstRow") === "1";
          const sz = deep(tbl, A, "rPr")?.getAttribute("sz");
          items.push({ id: newId(), kind: "table", x: g.x, y: g.y, w: Math.max(40, g.w), h: Math.max(20, g.h), rows: rows.map((r) => [...r, ...Array<string>(width - r.length).fill("")]), header: firstRow, size: sz ? Math.round((Number(sz) / 100) * ptK) : undefined });
        }
      }
    };
    const tree = deep(root, P, "spTree");
    if (tree) walk(tree, ident);
    // fondo
    let background: string | undefined;
    let backgroundImage: string | undefined;
    const bgPr = deep(deep(root, P, "bg"), P, "bgPr");
    if (bgPr) {
      background = colorOf(kid(bgPr, A, "solidFill"), scheme);
      const blip = deep(kid(bgPr, A, "blipFill"), A, "blip");
      const target = blip ? rels.get(blip.getAttributeNS(R, "embed") ?? "")?.target : undefined;
      const data = target ? files.get(target) : undefined;
      if (data && target) backgroundImage = bytesToDataUrl(data, target) ?? undefined;
    }
    // notas
    const notesPart = [...rels.values()].find((r) => r.type === "notesSlide")?.target;
    const notesDoc = notesPart ? parseXml(files.get(notesPart)) : null;
    let notes = "";
    if (notesDoc) {
      const body = [...notesDoc.getElementsByTagNameNS(P, "sp")].find((sp) => phKey(sp)?.type === "body");
      notes = body ? kids(deep(body, P, "txBody"), A, "p").map((p) => [...p.getElementsByTagNameNS(A, "t")].map((t) => t.textContent ?? "").join("")).join("\n").trim().slice(0, 8000) : "";
    }
    const tr = deep(root, P, "transition");
    const trKind = tr ? [...tr.children].find((c) => c.namespaceURI === P)?.localName : undefined;
    const transition: SlideTransition | undefined = !tr ? undefined : trKind === "dissolve" ? "dissolve" : trKind === "push" || trKind === "wipe" || trKind === "cover" ? ((kid(tr, P, trKind)?.getAttribute("dir") ?? "l") === "r" ? "slide-left" : "slide-right") : trKind === "split" ? "flip" : "fade";
    const titleItem = items.find((i) => i.kind === "text" && i.placeholder === "title");
    const firstText = items.find((i) => (i.kind === "text" || i.kind === "shape") && i !== titleItem && "text" in i && i.text);
    slides.push({
      id: newId(),
      title: titleItem && "text" in titleItem ? titleItem.text.slice(0, 200) : "",
      body: firstText && "text" in firstText ? firstText.text.slice(0, 2000) : "",
      theme: "sencillo",
      items,
      background: background ?? (scheme.lt1 && scheme.lt1 !== "#ffffff" ? scheme.lt1 : "#ffffff"),
      backgroundImage,
      notes,
      transition,
      layout: "blank",
      hidden: root.getAttribute("show") === "0" ? true : undefined,
    });
  }
  if (!slides.length) throw new Error("pptx");
  const core = parseXml(files.get("docProps/core.xml"));
  const title = core?.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")[0]?.textContent?.trim() || undefined;
  return { slides, title };
}
