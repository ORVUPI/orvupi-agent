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
console.log(`redirects ok: ${rules.length} reglas, ${dynamic.length} dinámicas`);
