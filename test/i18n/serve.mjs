// Servidor estático mínimo que imita Cloudflare Pages para las pruebas de idioma:
// index.html por carpeta, reescrituras 200 de /work/* y el 404.html más cercano.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
const root = new URL("../../web/v2/", import.meta.url).pathname;
const port = Number(process.argv[2] || 4180);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".xml": "application/xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };
async function file(p) { try { const s = await stat(p); if (s.isDirectory()) return file(join(p, "index.html")); return p; } catch { return null; } }
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (/^\/work\/(document|spreadsheets|presentation|forms|drawings|notes)\//.test(path)) path = "/work/";
  let f = await file(join(root, path));
  let status = 200;
  if (!f) {
    status = 404;
    let dir = path.endsWith("/") ? path : dirname(path);
    while (!f) { f = await file(join(root, dir, "404.html")); if (dir === "/" || dir === ".") break; dir = dirname(dir); }
  }
  if (!f) { res.writeHead(404).end(); return; }
  res.writeHead(status, { "content-type": types[extname(f)] || "application/octet-stream" });
  res.end(await readFile(f));
}).listen(port, "127.0.0.1");
