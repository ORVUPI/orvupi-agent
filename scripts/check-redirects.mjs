import fs from "node:fs";

const text = fs.readFileSync("web/v2/_redirects", "utf8");
const rules = text.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
const dynamic = rules.filter((line) => /[*:]/.test(line.split(/\s+/)[0]));
const needed = [
  "/:lang/studio/views.mjs",
  "/:lang/token/metadata.json",
  "/:lang/studio/thumbs/*",
];
for (const source of needed) {
  if (!rules.some((line) => line.startsWith(source))) {
    console.error("falta", source);
    process.exit(1);
  }
}
if (dynamic.length >= 100) {
  console.error("reglas dinámicas", dynamic.length);
  process.exit(1);
}
if (rules.some((line) => line.startsWith("/sonar") || line.includes("/sonar/"))) {
  console.error("quedan reglas de Sonar en _redirects");
  process.exit(1);
}
const sources = rules.map((line) => line.split(/\s+/)[0]);
const wasmAt = sources.findIndex((source) => source.startsWith("/work/assets/ort-wasm"));
const broadAt = sources.findIndex((source) => source === "/work/:section/*");
if (wasmAt === -1 || (broadAt !== -1 && broadAt < wasmAt)) {
  console.error("la regla del wasm de Work queda tapada o no está");
  process.exit(1);
}
for (const source of ["/work/document/*", "/work/spreadsheets/*", "/work/presentation/*", "/work/forms/*", "/work/drawings/*", "/work/notes/*"]) {
  if (!sources.includes(source)) {
    console.error("falta", source);
    process.exit(1);
  }
}
console.log(`redirects ok: ${rules.length} reglas, ${dynamic.length} dinámicas`);
