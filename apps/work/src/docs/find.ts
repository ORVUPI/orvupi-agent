export type TextSlice = { text: string; pos: number };

export function findInSlices(slices: TextSlice[], query: string, fromPos: number): { from: number; to: number } | null {
  const needle = query.toLowerCase();
  if (!needle) return null;
  const ordered = [...slices].sort((left, right) => left.pos - right.pos);
  const matchAt = (start: number): { from: number; to: number } | null => {
    for (const slice of ordered) {
      const offset = start > slice.pos ? start - slice.pos : 0;
      if (offset > slice.text.length) continue;
      const index = slice.text.toLowerCase().indexOf(needle, offset);
      if (index >= 0) return { from: slice.pos + index, to: slice.pos + index + needle.length };
    }
    return null;
  };
  return matchAt(fromPos) ?? matchAt(0);
}

/** Última coincidencia que termina en o antes de `beforePos`. No da la vuelta. */
export function findBefore(slices: TextSlice[], query: string, beforePos: number): { from: number; to: number } | null {
  const needle = query.toLowerCase();
  if (!needle) return null;
  const ordered = [...slices].sort((left, right) => left.pos - right.pos);
  let last: { from: number; to: number } | null = null;
  for (const slice of ordered) {
    if (slice.pos >= beforePos) break;
    const text = slice.text.toLowerCase();
    let index = 0;
    while (index < text.length) {
      const found = text.indexOf(needle, index);
      if (found < 0) break;
      const from = slice.pos + found;
      const to = from + needle.length;
      if (to <= beforePos) last = { from, to };
      else break;
      index = found + needle.length;
    }
  }
  return last;
}

export function filterCommands<T extends { label: string; keywords?: string }>(commands: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => `${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(needle));
}
