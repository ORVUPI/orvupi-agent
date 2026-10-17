import type { IDBPDatabase } from "idb";
import { base64ToBytes, bytesToBase64, decodeUtf8, encodeUtf8, sha256 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { ALLOWED_IMPORT_EXTENSIONS, extensionOf, isBlockedExtension, MAX_BACKUP_BYTES, MAX_FILE_BYTES } from "../security/limits";
import { folderContains } from "../files/query";
import { assertId, createId, fileNameWithExtension, sanitizeName } from "../security/names";
import { publishFilesChanged } from "../routing/sync";
import { openWorkDb, type WorkDb } from "./db";
import type {
  AppSettings,
  BlobStore,
  FileKind,
  FileRecord,
  ImportFileInput,
  LoadedFile,
  SaveFileInput,
  StorageService,
  WorkspaceBackup,
} from "./types";
import { defaultSettings } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function kindForExtension(extension: string): FileKind {
  if (extension === "pdf") return "pdf";
  return "other";
}

const LABEL_COLORS = new Set(["#1d4e89", "#0b5d36", "#9a3412", "#a3123f", "#5b2a86", "#7a4a00"]);

function mimeFor(kind: FileKind, extension: string): string {
  if (kind === "doc") return "application/vnd.orvupi.doc+json";
  if (kind === "sheet") return "application/vnd.orvupi.sheet+json";
  if (kind === "slide") return "application/vnd.orvupi.slides+json";
  if (kind === "form") return "application/vnd.orvupi.form+json";
  if (kind === "drawing") return "application/vnd.orvupi.drawing+json";
  if (kind === "note") return "application/vnd.orvupi.note+json";
  if (kind === "folder") return "application/vnd.orvupi.folder+json";
  if (kind === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "csv") return "text/csv";
  return "application/octet-stream";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_BYTES) throw new WorkError("too-large");
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const tag = entry.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!tag || tags.includes(tag)) continue;
    tags.push(tag);
    if (tags.length === 6) break;
  }
  return tags;
}

function normalizeRecord(record: FileRecord): FileRecord {
  const color = typeof record.color === "string" && LABEL_COLORS.has(record.color) ? record.color : null;
  return {
    ...record,
    tags: cleanTags(record.tags),
    favorite: record.favorite === true,
    folderId: typeof record.folderId === "string" ? record.folderId : null,
    color,
    deletedAt: typeof record.deletedAt === "string" ? record.deletedAt : null,
  };
}

function descendants(files: FileRecord[], rootId: string): string[] {
  const ids = [rootId];
  for (let index = 0; index < ids.length; index += 1) {
    const current = ids[index];
    for (const file of files) {
      if (file.folderId === current && !ids.includes(file.id)) ids.push(file.id);
    }
  }
  return ids;
}

export function createStorageService(db: IDBPDatabase<WorkDb>, blobs: BlobStore): StorageService {
  const driver = blobs.kind === "opfs" ? "opfs" : "indexeddb";

  async function readRecord(id: string): Promise<FileRecord> {
    const record = await db.get("files", assertId(id));
    if (!record) throw new WorkError("not-found");
    return normalizeRecord(record);
  }

  async function saveFile(input: SaveFileInput): Promise<FileRecord> {
    assertBytes(input.bytes);
    const name = sanitizeName(input.name);
    const stamp = nowIso();
    const existing = input.id ? await db.get("files", assertId(input.id)) : undefined;
    const previous = existing ? normalizeRecord(existing) : undefined;
    const id = previous?.id ?? assertId(input.id ?? createId());
    const blobKey = `files/${id}`;
    const contentHash = await sha256(input.bytes);
    await blobs.write(blobKey, input.bytes);
    const record: FileRecord = {
      id,
      name,
      kind: input.kind,
      mime: input.mime,
      tags: previous?.tags ?? [],
      favorite: previous?.favorite ?? false,
      folderId: input.folderId !== undefined ? input.folderId : (previous?.folderId ?? null),
      color: previous?.color ?? null,
      deletedAt: null,
      createdAt: previous?.createdAt ?? stamp,
      updatedAt: stamp,
      size: input.bytes.byteLength,
      blobKey,
      contentHash,
    };
    await db.put("files", record);
    publishFilesChanged();
    return record;
  }

  async function loadFile(id: string): Promise<LoadedFile> {
    const record = await readRecord(id);
    const bytes = await blobs.read(record.blobKey);
    if (!bytes) throw new WorkError("not-found");
    const hash = await sha256(bytes);
    return { record, bytes, integrity: hash === record.contentHash ? "ok" : "mismatch" };
  }

  async function listFiles(options?: { includeDeleted?: boolean }): Promise<FileRecord[]> {
    const all = (await db.getAll("files")).map((file) => normalizeRecord(file));
    const visible = options?.includeDeleted ? all : all.filter((file) => file.deletedAt === null);
    return visible.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async function createFolder(name: string, parentId: string | null): Promise<FileRecord> {
    if (parentId) {
      const parent = await readRecord(parentId);
      if (parent.kind !== "folder" || parent.deletedAt) throw new WorkError("invalid-move");
    }
    return saveFile({
      name,
      kind: "folder",
      mime: mimeFor("folder", ""),
      bytes: encodeUtf8("{}"),
      folderId: parentId,
    });
  }

  async function moveFile(id: string, folderId: string | null): Promise<FileRecord> {
    const record = await readRecord(id);
    const all = await listFiles({ includeDeleted: true });
    if (folderId) {
      const parent = all.find((file) => file.id === folderId);
      if (!parent || parent.kind !== "folder" || parent.deletedAt) throw new WorkError("invalid-move");
      if (folderId === id || folderContains(all, id, folderId)) throw new WorkError("invalid-move");
    }
    const next = { ...record, folderId, updatedAt: nowIso() };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function setFavorite(id: string, favorite: boolean): Promise<FileRecord> {
    const record = await readRecord(id);
    const next = { ...record, favorite, updatedAt: nowIso() };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function setColor(id: string, color: string | null): Promise<FileRecord> {
    if (color !== null && !LABEL_COLORS.has(color)) throw new WorkError("invalid-format");
    const record = await readRecord(id);
    const next = { ...record, color, updatedAt: nowIso() };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function setTags(id: string, tags: string[]): Promise<FileRecord> {
    const record = await readRecord(id);
    const next = { ...record, tags: cleanTags(tags), updatedAt: nowIso() };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function renameFile(id: string, name: string): Promise<FileRecord> {
    const record = await readRecord(id);
    const next = { ...record, name: sanitizeName(name), updatedAt: nowIso() };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function deleteFile(id: string): Promise<void> {
    const all = await listFiles({ includeDeleted: true });
    const stamp = nowIso();
    for (const itemId of descendants(all, assertId(id))) {
      const record = all.find((file) => file.id === itemId);
      if (!record || record.deletedAt) continue;
      await db.put("files", { ...record, deletedAt: stamp, updatedAt: stamp });
    }
    publishFilesChanged();
  }

  async function restoreFile(id: string): Promise<void> {
    const all = await listFiles({ includeDeleted: true });
    const ids = new Set(descendants(all, assertId(id)));
    const stamp = nowIso();
    for (const itemId of ids) {
      const record = all.find((file) => file.id === itemId);
      if (!record) continue;
      let folderId = record.folderId;
      if (folderId && !ids.has(folderId)) {
        const parent = all.find((file) => file.id === folderId);
        if (!parent || parent.deletedAt) folderId = null;
      }
      await db.put("files", { ...record, folderId, deletedAt: null, updatedAt: stamp });
    }
    publishFilesChanged();
  }

  async function purgeFile(id: string): Promise<void> {
    const record = await readRecord(id);
    await blobs.delete(record.blobKey);
    await db.delete("files", record.id);
    publishFilesChanged();
  }

  async function duplicateFile(id: string): Promise<FileRecord> {
    const loaded = await loadFile(id);
    if (loaded.integrity === "mismatch") throw new WorkError("corrupt-file");
    const copyName = sanitizeName(`${loaded.record.name} copia`);
    const copy = await saveFile({
      name: copyName,
      kind: loaded.record.kind,
      mime: loaded.record.mime,
      bytes: loaded.bytes,
      folderId: loaded.record.folderId,
    });
    const next = { ...copy, tags: loaded.record.tags, favorite: false, color: loaded.record.color };
    await db.put("files", next);
    publishFilesChanged();
    return next;
  }

  async function exportFile(id: string): Promise<{ record: FileRecord; bytes: Uint8Array; filename: string }> {
    const loaded = await loadFile(id);
    const extension =
      loaded.record.kind === "doc"
        ? "orvdoc"
        : loaded.record.kind === "sheet"
          ? "orsheet"
          : loaded.record.kind === "slide"
            ? "orslides"
            : loaded.record.kind === "form"
              ? "orform"
              : loaded.record.kind === "drawing"
                ? "ordraw"
                : loaded.record.kind === "note"
                  ? "ornote"
            : loaded.record.kind === "pdf"
              ? "pdf"
              : loaded.record.mime === "image/png"
                ? "png"
                : loaded.record.mime === "image/jpeg"
                  ? "jpg"
                  : loaded.record.mime === "text/csv"
                    ? "csv"
                    : "bin";
    return {
      record: loaded.record,
      bytes: loaded.bytes,
      filename: fileNameWithExtension(loaded.record.name, extension),
    };
  }

  async function importFile(input: ImportFileInput): Promise<FileRecord> {
    if (isBlockedExtension(input.name) || !ALLOWED_IMPORT_EXTENSIONS.has(extensionOf(input.name))) {
      throw new WorkError("unsupported-type");
    }
    assertBytes(input.bytes);
    const extension = extensionOf(input.name);
    const kind = kindForExtension(extension);
    return saveFile({
      name: sanitizeName(input.name.replace(/\.[^.]+$/, "") || input.name),
      kind,
      mime: input.mime || mimeFor(kind, extension),
      bytes: input.bytes,
    });
  }

  async function getSettings(): Promise<AppSettings> {
    const stored = await db.get("settings", "app");
    if (!stored || (stored.locale !== "es" && stored.locale !== "en")) return { ...defaultSettings };
    return { locale: stored.locale };
  }

  async function saveSettings(settings: AppSettings): Promise<void> {
    if (settings.locale !== "es" && settings.locale !== "en") throw new WorkError("invalid-format");
    await db.put("settings", { locale: settings.locale }, "app");
  }

  async function backupWorkspace(): Promise<Uint8Array> {
    const files = await db.getAll("files");
    const settings = await getSettings();
    const packed: WorkspaceBackup["files"] = [];
    for (const record of files) {
      const bytes = await blobs.read(record.blobKey);
      if (!bytes) continue;
      packed.push({ record, bytesBase64: bytesToBase64(bytes) });
    }
    const payload: WorkspaceBackup = {
      format: "orvupi-workspace",
      version: 1,
      exportedAt: nowIso(),
      settings,
      files: packed,
    };
    const encoded = encodeUtf8(JSON.stringify(payload));
    if (encoded.byteLength > MAX_BACKUP_BYTES) throw new WorkError("too-large");
    return encoded;
  }

  async function restoreWorkspace(bytes: Uint8Array): Promise<{ files: number }> {
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BACKUP_BYTES) throw new WorkError("too-large");
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeUtf8(bytes));
    } catch {
      throw new WorkError("invalid-format");
    }
    if (!isRecord(parsed) || parsed.format !== "orvupi-workspace" || parsed.version !== 1) {
      throw new WorkError(parsed && isRecord(parsed) && parsed.format === "orvupi-workspace" ? "unsupported-version" : "invalid-format");
    }
    if (!Array.isArray(parsed.files)) throw new WorkError("invalid-format");
    const rawLocale = isRecord(parsed.settings) ? parsed.settings.locale : null;
    const settings: AppSettings = rawLocale === "es" || rawLocale === "en" ? { locale: rawLocale } : { ...defaultSettings };
    const next: Array<{ record: FileRecord; bytes: Uint8Array }> = [];
    for (const entry of parsed.files) {
      if (!isRecord(entry) || !isRecord(entry.record) || typeof entry.bytesBase64 !== "string") {
        throw new WorkError("invalid-format");
      }
      const record = entry.record;
      if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.kind !== "string") {
        throw new WorkError("invalid-format");
      }
      const fileBytes = base64ToBytes(entry.bytesBase64);
      assertBytes(fileBytes);
      const id = assertId(record.id);
      const restored: FileRecord = {
        id,
        name: sanitizeName(record.name),
        kind:
          record.kind === "doc" || record.kind === "sheet" || record.kind === "slide" || record.kind === "form" || record.kind === "drawing" || record.kind === "note" || record.kind === "pdf" || record.kind === "folder"
            ? record.kind
            : "other",
        mime: typeof record.mime === "string" ? record.mime.slice(0, 120) : "application/octet-stream",
        tags: cleanTags(record.tags),
        favorite: record.favorite === true,
        folderId: typeof record.folderId === "string" ? record.folderId : null,
        color: typeof record.color === "string" && LABEL_COLORS.has(record.color) ? record.color : null,
        deletedAt: typeof record.deletedAt === "string" ? record.deletedAt : null,
        createdAt: typeof record.createdAt === "string" ? record.createdAt : nowIso(),
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : nowIso(),
        size: fileBytes.byteLength,
        blobKey: `files/${id}`,
        contentHash: await sha256(fileBytes),
      };
      next.push({ record: restored, bytes: fileBytes });
    }

    const known = new Set(next.map((file) => file.record.id));
    for (const file of next) {
      if (file.record.folderId && !known.has(file.record.folderId)) file.record.folderId = null;
    }
    const previous = await db.getAll("files");
    for (const file of next) {
      await blobs.write(file.record.blobKey, file.bytes);
    }
    const tx = db.transaction("files", "readwrite");
    await tx.store.clear();
    for (const file of next) await tx.store.put(file.record);
    await tx.done;
    await saveSettings(settings);
    const keep = new Set(next.map((file) => file.record.blobKey));
    for (const file of previous) {
      if (!keep.has(file.blobKey)) await blobs.delete(file.blobKey);
    }
    return { files: next.length };
  }

  return {
    driver,
    saveFile,
    loadFile,
    listFiles,
    renameFile,
    createFolder,
    moveFile,
    setFavorite,
    setColor,
    setTags,
    deleteFile,
    restoreFile,
    purgeFile,
    duplicateFile,
    exportFile,
    importFile,
    backupWorkspace,
    restoreWorkspace,
    getSettings,
    saveSettings,
  };
}

export async function openStorage(dbName: string, blobs: BlobStore): Promise<StorageService> {
  const db = await openWorkDb(dbName);
  return createStorageService(db, blobs);
}
