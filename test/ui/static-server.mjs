// Sirve web/v2 como el http.server de Python (index.html, 301 al añadir la barra,
// 404 si no está) pero atiende varias peticiones a la vez. El servidor de un solo
// hilo dejaba la suite de Playwright por encima de los 20 minutos del job.
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const root = normalize(process.argv[2] || "web/v2");
const port = Number(process.argv[3] || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function inside(file) {
  const abs = normalize(file);
  return abs === root || abs.startsWith(root + sep);
}

createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.includes("\0")) {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = normalize(join(root, pathname));
    if (!inside(file)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let stat;
    try {
      stat = statSync(file);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("File not found");
      return;
    }
    if (stat.isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { location: pathname + "/" + url.search });
        res.end();
        return;
      }
      const index = join(file, "index.html");
      try {
        statSync(index);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("File not found");
        return;
      }
      res.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" });
      createReadStream(index).pipe(res);
      return;
    }
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(port, "127.0.0.1");
