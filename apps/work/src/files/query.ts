import type { FileKind, FileRecord } from "../storage/types";

export type FileBrowseMode = "folder" | "recent" | "starred" | "trash";
export type FileSortKey = "name" | "updated" | "created" | "size" | "kind";
export type DateFilter = "any" | "today" | "week" | "month";

const DAY = 24 * 60 * 60 * 1000;

export function folderContains(files: FileRecord[], ancestorId: string, candidateId: string): boolean {
  const byId = new Map(files.map((file) => [file.id, file]));
  let current: string | null = candidateId;
  const seen = new Set<string>();
  while (current) {
    if (current === ancestorId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.folderId ?? null;
  }
  return false;
}

export function breadcrumb(files: FileRecord[], folderId: string | null): FileRecord[] {
  const byId = new Map(files.map((file) => [file.id, file]));
  const chain: FileRecord[] = [];
  let current = folderId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = byId.get(current);
    if (!folder || folder.kind !== "folder") break;
    chain.push(folder);
    current = folder.folderId;
  }
  return chain.reverse();
}

function withinDate(iso: string, filter: DateFilter, now: number): boolean {
  if (filter === "any") return true;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return false;
  if (filter === "today") return now - time <= DAY;
  if (filter === "week") return now - time <= 7 * DAY;
  return now - time <= 30 * DAY;
}

export function visibleFiles(
  files: FileRecord[],
  options: {
    mode: FileBrowseMode;
    folderId: string | null;
    query: string;
    kind: "all" | FileKind;
    date: DateFilter;
    now?: number;
  },
): FileRecord[] {
  const needle = options.query.trim().toLowerCase();
  const now = options.now ?? Date.now();
  return files.filter((file) => {
    if (options.mode === "trash") {
      if (file.deletedAt === null) return false;
    } else if (file.deletedAt !== null) return false;
    if (options.mode === "folder" && (file.folderId ?? null) !== options.folderId) return false;
    if (options.mode === "starred" && !file.favorite) return false;
    if (options.kind !== "all" && file.kind !== options.kind) return false;
    if (!withinDate(file.updatedAt, options.date, now)) return false;
    if (!needle) return true;
    return file.name.toLowerCase().includes(needle) || file.tags.some((tag) => tag.toLowerCase().includes(needle));
  });
}

export function sortFiles(files: FileRecord[], key: FileSortKey, direction: "asc" | "desc"): FileRecord[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...files].sort((left, right) => {
    const folders = Number(right.kind === "folder") - Number(left.kind === "folder");
    if (folders !== 0 && key !== "kind") return folders;
    const delta =
      key === "name"
        ? left.name.localeCompare(right.name)
        : key === "size"
          ? left.size - right.size
          : key === "kind"
            ? left.kind.localeCompare(right.kind)
            : key === "created"
              ? left.createdAt.localeCompare(right.createdAt)
              : left.updatedAt.localeCompare(right.updatedAt);
    return delta * factor;
  });
}
