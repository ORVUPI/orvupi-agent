/** Exportación HTML responsive de un sitio de Studio. Solo descarga local; no publica. */

import { fontById, orderedLayers } from "./document.mjs";
import { cleanChartProps } from "./chart-data.mjs";
import { cleanTableProps } from "./table-data.mjs";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layerHtml(layer) {
  const style = [
    `left:${Math.round(layer.x)}px`,
    `top:${Math.round(layer.y)}px`,
    `width:${Math.round(layer.w)}px`,
    `height:${Math.round(layer.h)}px`,
    `opacity:${layer.opacity ?? 1}`,
    layer.rotation ? `transform:rotate(${layer.rotation}deg)` : "",
  ].filter(Boolean).join(";");
  if (layer.visible === false) return "";
  if (layer.type === "text") {
    const font = fontById(layer.props?.fontId);
    const textStyle = [
      `font-family:${font.css},sans-serif`,
      `font-size:${Math.round(layer.props?.size || 24)}px`,
      `color:${esc(layer.props?.color || "#102032")}`,
      `text-align:${layer.props?.align || "left"}`,
      `line-height:${layer.props?.lineHeight || 1.15}`,
      layer.props?.bold ? "font-weight:700" : "",
      layer.props?.italic ? "font-style:italic" : "",
      layer.props?.underline ? "text-decoration:underline" : "",
    ].filter(Boolean).join(";");
    return `<div class="capa texto" style="${style}"><div style="${textStyle}">${esc(layer.props?.text || "").replace(/\n/g, "<br>")}</div></div>`;
  }
  if (layer.type === "image") {
    const note = layer.src?.kind === "user"
      ? "Imagen subida (no incluida en este HTML; exporta el paquete .orvdesign para los bytes)."
      : layer.src?.kind === "library"
        ? `Foto de biblioteca: ${esc(layer.src.id)}`
        : `Recurso: ${esc(layer.src?.id || "")}`;
    return `<div class="capa imagen" style="${style};background:#ddd;display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#102032">${esc(note)}</div>`;
  }
  if (layer.type === "chart") {
    const data = cleanChartProps(layer.props);
    const rows = data.labels.map((label, index) => `<li><strong>${esc(label)}</strong>: ${esc(data.values[index])}</li>`).join("");
    return `<div class="capa chart" style="${style}" data-chart="${esc(data.chartType)}"><p>${esc(data.chartType)}</p><ul>${rows}</ul></div>`;
  }
  if (layer.type === "table") {
    const data = cleanTableProps(layer.props);
    const body = data.rows.map((row, index) => {
      const tag = data.header && index === 0 ? "th" : "td";
      return `<tr>${row.map((cell) => `<${tag}>${esc(cell)}</${tag}>`).join("")}</tr>`;
    }).join("");
    return `<div class="capa table" style="${style}"><table>${body}</table></div>`;
  }
  if (layer.type === "line") {
    return `<div class="capa linea" style="${style};background:${esc(layer.props?.color || "#102032")}"></div>`;
  }
  const radius = layer.props?.shape === "ellipse" ? "50%" : "0";
  return `<div class="capa forma" style="${style};background:${esc(layer.props?.fill || "#FF3070")};border-radius:${radius}"></div>`;
}

/** Devuelve un HTML único responsive. No sube nada a un servidor. */
export function exportSiteHtml(doc, options = {}) {
  const width = doc?.format?.width || 1280;
  const height = doc?.format?.height || 1800;
  const bg = doc?.background?.fill || "#FFF8EC";
  const layers = orderedLayers(doc).map(layerHtml).join("\n");
  const title = esc(doc?.name || "Sitio");
  const lang = options.lang === "en" ? "en" : "es";
  const note = lang === "en"
    ? "Local HTML download only. Studio does not publish or host this page."
    : "Descarga HTML local. Studio no publica ni aloja esta página.";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root { color-scheme: light; }
body { margin: 0; background: #f4f7fb; font-family: system-ui, sans-serif; color: #102032; }
.aviso { margin: 0; padding: 12px 16px; background: #102032; color: #FFF8EC; font-size: 14px; }
.lienzo {
  position: relative;
  width: min(100%, ${width}px);
  aspect-ratio: ${width} / ${height};
  margin: 16px auto;
  background: ${esc(bg)};
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(16, 32, 50, 0.12);
}
.capa { position: absolute; box-sizing: border-box; overflow: hidden; }
.capa.texto { white-space: pre-wrap; word-break: break-word; }
.capa table { width: 100%; height: 100%; border-collapse: collapse; font-size: clamp(10px, 1.6vw, 16px); }
.capa th, .capa td { border: 1px solid #102032; padding: 4px; }
.capa.chart { background: #fff8ec; padding: 8px; font-size: clamp(10px, 1.6vw, 16px); }
@media (max-width: 720px) {
  .lienzo { margin: 8px; width: calc(100% - 16px); }
}
</style>
</head>
<body>
<p class="aviso">${esc(note)}</p>
<main class="lienzo" role="main" aria-label="${title}">
${layers}
</main>
</body>
</html>
`;
}
