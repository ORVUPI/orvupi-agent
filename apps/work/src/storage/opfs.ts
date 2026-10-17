import type { BlobStore } from "./types";

export class OpfsBlobStore implements BlobStore {
  readonly kind = "opfs" as const;

  constructor(private readonly root: FileSystemDirectoryHandle) {}

  private async file(key: string, create: boolean): Promise<FileSystemFileHandle> {
    const parts = key.split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename || parts.some((part) => part === "." || part === "..")) {
      throw new Error("invalid-blob-key");
    }
    let directory = this.root;
    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part, { create });
    }
    return directory.getFileHandle(filename, { create });
  }

  async write(key: string, bytes: Uint8Array): Promise<void> {
    const handle = await this.file(key, true);
    const writable = await handle.createWritable();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writable.write(copy);
    await writable.close();
  }

  async read(key: string): Promise<Uint8Array | null> {
    try {
      const handle = await this.file(key, false);
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const parts = key.split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename) return;
    let directory = this.root;
    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part);
    }
    await directory.removeEntry(filename);
  }
}

export async function createOpfsBlobStore(): Promise<OpfsBlobStore | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const probe = await root.getFileHandle(".orvupi-probe", { create: true });
    const writable = await probe.createWritable();
    await writable.write(new Uint8Array([1]));
    await writable.close();
    await root.removeEntry(".orvupi-probe");
    return new OpfsBlobStore(root);
  } catch {
    return null;
  }
}
