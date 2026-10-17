import type { BlobStore } from "./types";

export class MemoryBlobStore implements BlobStore {
  readonly kind = "memory" as const;
  private readonly files = new Map<string, Uint8Array>();

  async write(key: string, bytes: Uint8Array): Promise<void> {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    this.files.set(key, copy);
  }

  async read(key: string): Promise<Uint8Array | null> {
    const value = this.files.get(key);
    if (!value) return null;
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    return copy;
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }
}
