import { setAssetStore } from "./assets";
import { askPersistence } from "./quota";
import { openWorkDb } from "./db";
import { createOpfsBlobStore } from "./opfs";
import { createStorageService } from "./service";
import type { BlobStore, StorageService } from "./types";

class IndexedDbBlobStore implements BlobStore {
  readonly kind = "indexeddb" as const;

  constructor(private readonly dbName: string) {}

  private async database() {
    return openWorkDb(this.dbName);
  }

  async write(key: string, bytes: Uint8Array): Promise<void> {
    const db = await this.database();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await db.put("blobs", copy, key);
    db.close();
  }

  async read(key: string): Promise<Uint8Array | null> {
    const db = await this.database();
    const value = await db.get("blobs", key);
    db.close();
    return value ?? null;
  }

  async delete(key: string): Promise<void> {
    const db = await this.database();
    await db.delete("blobs", key);
    db.close();
  }
}

export async function createBrowserStorage(): Promise<StorageService> {
  const opfs = await createOpfsBlobStore();
  const blobs = opfs ?? new IndexedDbBlobStore("orvupi-work");
  // Las imágenes de los documentos van al mismo almacén de binarios, sin base64.
  setAssetStore(blobs);
  void askPersistence();
  const db = await openWorkDb("orvupi-work");
  return createStorageService(db, blobs);
}
