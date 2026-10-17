import { isWorkError } from "../security/errors";
import { WorkError } from "../security/errors";
import type { LoadedFile, StorageService } from "../storage/types";

export async function loadFileWhenReady(storage: StorageService, id: string): Promise<LoadedFile> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await storage.loadFile(id);
    } catch (error) {
      if (!isWorkError(error) || error.code !== "not-found" || attempt === 19) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new WorkError("not-found");
}
