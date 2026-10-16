import { readFileSync } from "node:fs";
import path from "node:path";

/** Mete un grafo ESM relativo en un solo ámbito, sin import ni export. */
export function inlineModule(entryFile: string | readonly string[]): string {
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (file: string): void => {
    const abs = path.resolve(file);
    if (seen.has(abs)) {
      return;
    }
    seen.add(abs);
    const parsed = parseModule(readFileSync(abs, "utf8"));
    for (const spec of parsed.specs) {
      if (spec.startsWith("node:") || !spec.startsWith(".")) {
        throw new Error(`Import no admisible en ${abs}: ${spec}`);
      }
      visit(path.resolve(path.dirname(abs), spec));
    }
    order.push(abs);
  };
  for (const entry of typeof entryFile === "string" ? [entryFile] : entryFile) visit(entry);
  const body = order
    .map((file) => parseModule(readFileSync(file, "utf8")).body)
    .filter((item) => item.length > 0)
    .join("\n\n");
  if (/^\s*import\s/m.test(body) || /^\s*export\s/m.test(body)) {
    throw new Error("El módulo en línea todavía tiene import o export.");
  }
  return body;
}

function parseModule(source: string): { specs: string[]; body: string } {
  const lines = source.replaceAll("\r\n", "\n").replaceAll(/^\/\/# sourceMappingURL=.*$/gm, "").split("\n");
  const specs: string[] = [];
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^\s*import\s/.test(line)) {
      const taken = takeUntil(lines, index, (block) => specifierOf(block) !== null);
      const spec = specifierOf(taken.block);
      if (!spec) {
        throw new Error(`Import sin origen:\n${taken.block}`);
      }
      specs.push(spec);
      index = taken.end;
      continue;
    }
    if (/^\s*export\s*\{/.test(line)) {
      const taken = takeUntil(lines, index, (block) => /\}\s*(from\s*["'][^"']+["'])?\s*;?\s*$/.test(block));
      const reexport = /\bfrom\s*["']([^"']+)["']/.exec(taken.block);
      if (reexport?.[1]) {
        specs.push(reexport[1]);
      }
      index = taken.end;
      continue;
    }
    kept.push(line.replace(/^export\s+/, ""));
  }
  return { specs, body: kept.join("\n").trim() };
}

function takeUntil(lines: readonly string[], start: number, done: (block: string) => boolean): { block: string; end: number } {
  let block = lines[start] ?? "";
  let end = start;
  while (!done(block)) {
    end += 1;
    if (end >= lines.length || end - start > 40) {
      break;
    }
    block += `\n${lines[end] ?? ""}`;
  }
  return { block, end };
}

function specifierOf(block: string): string | null {
  return /\bfrom\s*["']([^"']+)["']/.exec(block)?.[1] ?? /^\s*import\s*["']([^"']+)["']/.exec(block)?.[1] ?? null;
}
