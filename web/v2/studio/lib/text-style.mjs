/** Fragmentos de estilo. Los índices son los de una cadena JS, como el cursor del campo. */

function rangeOf(text, start, end) {
  const length = String(text || "").length;
  const from = Math.max(0, Math.min(length, Math.round(Number(start) || 0)));
  const to = Math.max(from, Math.min(length, Math.round(Number(end) || 0)));
  return [from, to];
}

export function cleanRuns(text, runs) {
  const body = String(text || "");
  if (!Array.isArray(runs)) return [];
  const out = [];
  for (const run of runs) {
    if (!run || typeof run !== "object") continue;
    const [start, end] = rangeOf(body, run.start, run.end);
    if (end <= start) continue;
    const next = { start, end };
    if (typeof run.bold === "boolean") next.bold = run.bold;
    if (typeof run.italic === "boolean") next.italic = run.italic;
    if (typeof run.underline === "boolean") next.underline = run.underline;
    if (typeof run.color === "string" && /^#[0-9a-fA-F]{6}$/.test(run.color)) next.color = run.color;
    if (Number.isFinite(Number(run.size))) next.size = Math.max(8, Math.min(400, Math.round(Number(run.size))));
    if ("bold" in next || "italic" in next || "underline" in next || next.color || next.size) out.push(next);
  }
  return out.slice(0, 80);
}

function styleAt(runs, index, base) {
  let style = {
    bold: Boolean(base?.bold),
    italic: Boolean(base?.italic),
    underline: Boolean(base?.underline),
    color: base?.color || "#102032",
    size: base?.size || 48,
  };
  for (const run of runs) {
    if (index < run.start || index >= run.end) continue;
    if ("bold" in run) style.bold = run.bold;
    if ("italic" in run) style.italic = run.italic;
    if ("underline" in run) style.underline = run.underline;
    if (run.color) style.color = run.color;
    if (run.size) style.size = run.size;
  }
  return style;
}

export function piecesOf(text, runs, base) {
  const body = String(text || "");
  const clean = cleanRuns(body, runs);
  const parts = [];
  let index = 0;
  while (index < body.length) {
    const style = styleAt(clean, index, base);
    let end = index + 1;
    while (end < body.length) {
      const next = styleAt(clean, end, base);
      if (next.bold !== style.bold || next.italic !== style.italic || next.underline !== style.underline || next.color !== style.color || next.size !== style.size) break;
      end += 1;
    }
    parts.push({ text: body.slice(index, end), ...style });
    index = end;
  }
  return parts;
}

function sameStyle(a, b) {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.color === b.color && a.size === b.size;
}

function runFrom(start, end, style, base) {
  const run = { start, end };
  if (style.bold !== Boolean(base?.bold)) run.bold = style.bold;
  if (style.italic !== Boolean(base?.italic)) run.italic = style.italic;
  if (style.underline !== Boolean(base?.underline)) run.underline = style.underline;
  if (style.color && style.color !== (base?.color || "#102032")) run.color = style.color;
  if (style.size && style.size !== (base?.size || 48)) run.size = style.size;
  return "bold" in run || "italic" in run || "underline" in run || run.color || run.size ? run : null;
}

export function applySpan(text, runs, start, end, patch, base) {
  const body = String(text || "");
  let [from, to] = rangeOf(body, start, end);
  if (from === to) {
    from = 0;
    to = body.length;
  }
  if (to <= from) return cleanRuns(body, runs);
  const clean = cleanRuns(body, runs);
  const points = new Set([0, body.length, from, to]);
  for (const run of clean) {
    points.add(run.start);
    points.add(run.end);
  }
  const cuts = [...points].filter((n) => n >= 0 && n <= body.length).sort((a, b) => a - b);
  const next = [];
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const s = cuts[index];
    const e = cuts[index + 1];
    if (e <= s) continue;
    const style = styleAt(clean, s, base);
    if (s >= from && e <= to) Object.assign(style, patch);
    const run = runFrom(s, e, style, base);
    if (!run) continue;
    const prev = next[next.length - 1];
    if (prev && prev.end === run.start && sameStyle(
      { bold: "bold" in prev ? prev.bold : Boolean(base?.bold), italic: "italic" in prev ? prev.italic : Boolean(base?.italic), underline: "underline" in prev ? prev.underline : Boolean(base?.underline), color: prev.color || base?.color, size: prev.size || base?.size },
      { bold: "bold" in run ? run.bold : Boolean(base?.bold), italic: "italic" in run ? run.italic : Boolean(base?.italic), underline: "underline" in run ? run.underline : Boolean(base?.underline), color: run.color || base?.color, size: run.size || base?.size },
    )) prev.end = run.end;
    else next.push(run);
  }
  return next.slice(0, 80);
}

export function spanIs(text, runs, start, end, key, base) {
  const body = String(text || "");
  let [from, to] = rangeOf(body, start, end);
  if (from === to) {
    from = 0;
    to = body.length;
  }
  if (to <= from) return Boolean(base?.[key]);
  const clean = cleanRuns(body, runs);
  for (let index = from; index < to; index += 1) {
    if (!styleAt(clean, index, base)[key]) return false;
  }
  return true;
}
