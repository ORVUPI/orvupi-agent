#!/usr/bin/env node
// La portada y /memes sirven PNG optimizados (≤800 px) que sí están en git,
// en assets/orvupi/album, en las mismas rutas .png que pide el HTML.
// Este manifiesto describe los originales (~490 MB); `fetch` los copia a un
// directorio de despliegue si hay un origen. Pages no lo necesita: publica web/v2.
//   node web/v2/tools/album.mjs manifest <dir>        genera album-manifest.json desde una copia local
//   node web/v2/tools/album.mjs fetch <destino> [--from <dir>]
//        copia (desde <dir>) o descarga (desde https://orvupi.com, o ALBUM_ORIGIN) cada imagen a
//        <destino>/assets/orvupi/album y comprueba tamaño y sha256 del manifiesto.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "..", "assets", "orvupi", "album-manifest.json");
const ORIGIN = process.env.ALBUM_ORIGIN || "https://orvupi.com/assets/orvupi/album/";
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out.sort();
}

const [cmd, target, ...rest] = process.argv.slice(2);
if (cmd === "manifest" && target) {
  const files = [];
  for (const rel of await walk(target)) {
    const buf = await readFile(path.join(target, rel));
    files.push({ file: rel, bytes: buf.length, sha256: sha(buf) });
  }
  await writeFile(manifestPath, JSON.stringify({ origin: ORIGIN, files }, null, 1) + "\n");
  console.log(`manifiesto: ${files.length} archivos`);
} else if (cmd === "fetch" && target) {
  const from = rest[0] === "--from" ? rest[1] : null;
  const { files } = JSON.parse(await readFile(manifestPath, "utf8"));
  const dest = path.join(target, "assets", "orvupi", "album");
  let total = 0;
  for (const f of files) {
    let buf;
    if (from) buf = await readFile(path.join(from, f.file));
    else {
      const res = await fetch(ORIGIN + f.file.split("/").map(encodeURIComponent).join("/"));
      if (!res.ok) throw new Error(`${f.file}: HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    }
    if (buf.length !== f.bytes || sha(buf) !== f.sha256) throw new Error(`${f.file}: no coincide con el manifiesto`);
    await mkdir(path.dirname(path.join(dest, f.file)), { recursive: true });
    await writeFile(path.join(dest, f.file), buf);
    total += buf.length;
  }
  console.log(`álbum listo: ${files.length} archivos, ${(total / 1e6).toFixed(1)} MB, verificados`);
} else {
  console.error("uso: album.mjs manifest <dir> | fetch <destino> [--from <dir>]");
  process.exit(2);
}
