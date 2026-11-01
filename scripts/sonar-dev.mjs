import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handle } from "../functions/_lib/router.js";
import { applyMeta, renderSonarPage } from "../functions/_lib/seo.js";

const root = path.resolve("web/v2");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
};

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const rel = clean.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  if (fs.existsSync(path.join(full, "index.html"))) return path.join(full, "index.html");
  return null;
}

function localeOf(pathname) {
  const match = pathname.match(/^\/(en|pt-br|ja|ko)(?=\/)/);
  return match ? `/${match[1]}` : "";
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith("/api/sonar")) {
      const response = await handle(new Request(url, { method: req.method, headers: req.headers }), process.env, {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const market = url.pathname.match(/^(\/(?:en|pt-br|ja|ko))?\/sonar(\/.*)?$/);
    if (market && !fileFor(url.pathname)) {
      const prefix = market[1] || "";
      const rest = (market[2] || "/").replace(/\/+$/, "") || "/";
      const parts = rest.split("/").filter(Boolean);
      const kind = parts[0] === "crypto" ? "crypto" : parts[0] === "exchanges" ? "exchange" : parts[0] === "categories" ? "category" : "";
      const asset = path.join(root, prefix.replace(/^\//, ""), "verify/index.html");
      const html = fs.readFileSync(path.join(root, prefix ? `${prefix.slice(1)}/verify/index.html` : "verify/index.html"), "utf8");
      if (kind) {
        const response = await renderSonarPage(new Request(url), { SONAR_READ: () => html }, {}, { kind, id: parts[1] || "" });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      void asset;
      void applyMeta;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    const file = fileFor(url.pathname) || (url.pathname === "/" ? path.join(root, "index.html") : null);
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("error");
    console.error("sonar-dev", error?.status || error?.code || error?.message || "fail");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`sonar-dev http://127.0.0.1:${port}/sonar/`);
});

void localeOf;
