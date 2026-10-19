import type { SlideItem } from "./items";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function drawingSvg(items: SlideItem[], width = 960, height = 640): string {
  const body = items.map((item) => {
    if (item.kind === "shape" && item.shape === "ellipse") {
      return `<ellipse cx="${item.x + item.w / 2}" cy="${item.y + item.h / 2}" rx="${item.w / 2}" ry="${item.h / 2}" fill="${item.fill}" />`;
    }
    if (item.kind === "shape") {
      return `<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="${item.fill}" />`;
    }
    if (item.kind === "line") {
      return `<line x1="${item.x}" y1="${item.y + item.h / 2}" x2="${item.x + item.w}" y2="${item.y + item.h / 2}" stroke="#102032" stroke-width="4" />`;
    }
    if (item.kind === "text") {
      return `<text x="${item.x + 8}" y="${item.y + 28}" fill="${item.color ?? "#102032"}" font-size="${item.size ?? 18}" font-family="Inter, sans-serif">${escapeXml(item.text)}</text>`;
    }
    return "";
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff8ec" />${body}</svg>`;
}

export function drawingPng(items: SlideItem[], width = 960, height = 640): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#fff8ec";
  ctx.fillRect(0, 0, width, height);
  for (const item of items) {
    if (item.kind === "shape" && item.shape === "ellipse") {
      ctx.fillStyle = item.fill;
      ctx.beginPath();
      ctx.ellipse(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, item.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === "shape") {
      ctx.fillStyle = item.fill;
      ctx.fillRect(item.x, item.y, item.w, item.h);
    } else if (item.kind === "line") {
      ctx.strokeStyle = "#102032";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y + item.h / 2);
      ctx.lineTo(item.x + item.w, item.y + item.h / 2);
      ctx.stroke();
    } else if (item.kind === "text") {
      ctx.fillStyle = item.color ?? "#102032";
      ctx.font = `${item.bold ? "700 " : ""}${item.size ?? 18}px Inter, sans-serif`;
      ctx.fillText(item.text.slice(0, 80), item.x + 8, item.y + 28);
    }
  }
  return canvas.toDataURL("image/png");
}
