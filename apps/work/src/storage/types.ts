export type FileKind = "folder" | "doc" | "sheet" | "slide" | "form" | "drawing" | "note" | "pdf" | "other";

export type BlobDriver = "opfs" | "indexeddb" | "memory";

export type FileRecord = {
  id: string;
  name: string;
  kind: FileKind;
  mime: string;
  tags: string[];
  favorite: boolean;
  folderId: string | null;
  color: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  size: number;
  blobKey: string;
  contentHash: string;
  shortcutOf?: string;
};

export type LoadedFile = {
  record: FileRecord;
  bytes: Uint8Array;
  integrity: "ok" | "mismatch";
};

export type SaveFileInput = {
  id?: string;
  name: string;
  kind: FileKind;
  mime: string;
  bytes: Uint8Array;
  folderId?: string | null;
};

export type ImportFileInput = {
  name: string;
  bytes: Uint8Array;
  mime?: string;
};

export type AppSettings = {
  locale: "es" | "en";
};

export const defaultSettings: AppSettings = { locale: "es" };

export type WorkspaceBackup = {
  format: "orvupi-workspace";
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  files: Array<{ record: FileRecord; bytesBase64: string }>;
};

export interface BlobStore {
  readonly kind: BlobDriver;
  write(key: string, bytes: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface StorageService {
  readonly driver: "opfs" | "indexeddb";
  saveFile(input: SaveFileInput): Promise<FileRecord>;
  loadFile(id: string): Promise<LoadedFile>;
  listFiles(options?: { includeDeleted?: boolean }): Promise<FileRecord[]>;
  renameFile(id: string, name: string): Promise<FileRecord>;
  createFolder(name: string, parentId: string | null): Promise<FileRecord>;
  moveFile(id: string, folderId: string | null): Promise<FileRecord>;
  setFavorite(id: string, favorite: boolean): Promise<FileRecord>;
  setColor(id: string, color: string | null): Promise<FileRecord>;
  setTags(id: string, tags: string[]): Promise<FileRecord>;
  deleteFile(id: string): Promise<void>;
  restoreFile(id: string): Promise<void>;
  purgeFile(id: string): Promise<void>;
  duplicateFile(id: string): Promise<FileRecord>;
  createShortcut(id: string): Promise<FileRecord>;
  exportFile(id: string): Promise<{ record: FileRecord; bytes: Uint8Array; filename: string }>;
  importFile(input: ImportFileInput): Promise<FileRecord>;
  backupWorkspace(): Promise<Uint8Array>;
  restoreWorkspace(bytes: Uint8Array): Promise<{ files: number }>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
}
