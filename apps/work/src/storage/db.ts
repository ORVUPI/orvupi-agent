import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppSettings, FileRecord } from "./types";

export interface WorkDb extends DBSchema {
  files: {
    key: string;
    value: FileRecord;
    indexes: { updatedAt: string };
  };
  blobs: {
    key: string;
    value: Uint8Array;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

export function openWorkDb(name: string): Promise<IDBPDatabase<WorkDb>> {
  return openDB<WorkDb>(name, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("files")) {
        const files = db.createObjectStore("files", { keyPath: "id" });
        files.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    },
  });
}
