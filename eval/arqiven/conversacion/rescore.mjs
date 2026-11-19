import { readdir, readFile, writeFile } from "node:fs/promises";
const { TASKS } = await import("./tasks.mjs?" + Date.now());
const byId = Object.fromEntries(TASKS.map((t) => [t.id, t]));
const summary = [];
for (const f of (await readdir("out")).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(await readFile("out/" + f, "utf8"));
  for (const r of d.results) {
    const t = byId[r.id], out = r.out, fails = [];
    for (const re of t.must || []) if (!re.test(out)) fails.push("falta " + re);
    for (const re of t.mustNot || []) if (re.test(out)) fails.push("sobra " + re);
    if (t.minChars && out.length < t.minChars) fails.push("corta");
    if (t.complete && r.truncated) fails.push("truncada");
    if (t.maxSentences) { const n = out.split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length; if (n > t.maxSentences || /^\s*[-*•\d]/m.test(out)) fails.push(`frases ${n}`); }
    const bl = out.split("\n").filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)).length;
    if (t.bullets && bl !== t.bullets) fails.push(`viñetas ${bl}`);
    if (t.bulletsMin && bl < t.bulletsMin) fails.push(`viñetas ${bl}`);
    if (r.mode === "extractive" && t.cat !== "fuentes") fails.push("sustituida por extracto");
    r.fails = fails; r.pass = fails.length === 0;
  }
  await writeFile("out/" + f, JSON.stringify(d, null, 2));
  const res = d.results, ms = res.filter((r) => r.ms).map((r) => r.ms).sort((a, b) => a - b);
  const cats = {}; for (const r of res) { cats[r.cat] ??= [0, 0]; cats[r.cat][1]++; if (r.pass) cats[r.cat][0]++; }
  const es = res.filter((r) => r.lang === "es");
  summary.push({ run: f.replace(".json", ""), pass: res.filter((r) => r.pass).length, total: res.length, esPass: es.filter((r) => r.pass).length, esTotal: es.length, medianMs: ms[Math.floor(ms.length / 2)] || 0, p90Ms: ms[Math.floor(ms.length * 0.9)] || 0, truncated: res.filter((r) => r.truncated).length, extractive: res.filter((r) => r.mode === "extractive").length, empty: res.filter((r) => r.mode === "empty").length, medTps: (() => { const t = res.filter((r) => r.tps).map((r) => r.tps).sort((a, b) => a - b); return t[Math.floor(t.length / 2)]; })(), loadMs: d.loadMs, cats });
}
await writeFile("summary.json", JSON.stringify(summary, null, 2));
for (const s of summary) console.log(s.run.padEnd(42), `${s.pass}/${s.total}`, `es ${s.esPass}/${s.esTotal}`, `med ${s.medianMs}ms p90 ${s.p90Ms}`, `trunc ${s.truncated}`, `extr ${s.extractive}`, `vac ${s.empty}`, `tps ${s.medTps}`, JSON.stringify(s.cats));
