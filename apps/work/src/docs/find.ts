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

export function filterCommands<T extends { label: string; keywords?: string }>(commands: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => `${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(needle));
}
