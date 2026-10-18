import { WorkError } from "../security/errors";
import { formatBytes } from "../security/names";

/** Pide almacenamiento persistente (el navegador no lo borra al ir justo de espacio). */
export async function askPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Espacio libre real que deja el navegador, o null si no lo dice. */
export async function freeBytes(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate || typeof estimate.quota !== "number") return null;
    return Math.max(0, estimate.quota - (estimate.usage ?? 0));
  } catch {
    return null;
  }
}

/**
 * Comprueba antes de guardar que cabe. `need` es lo que se va a escribir (el original y lo que se
 * deriva de él). Si no cabe, error claro con el tamaño y el espacio libre.
 */
export async function ensureRoom(need: number, locale: "es" | "en" = "es"): Promise<void> {
  const free = await freeBytes();
  if (free === null) return;
  if (need > free) throw new WorkError("quota", { size: formatBytes(need, locale), free: formatBytes(free, locale) });
}
