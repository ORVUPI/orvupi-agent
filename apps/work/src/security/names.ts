import { WorkError } from "./errors";
import { MAX_NAME_LENGTH } from "./limits";

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const sixth = bytes[6] ?? 0;
  const eighth = bytes[8] ?? 0;
  bytes[6] = (sixth & 0x0f) | 0x40;
  bytes[8] = (eighth & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function assertId(id: string): string {
  if (!ID_PATTERN.test(id)) throw new WorkError("invalid-name");
  return id;
}

export function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f]/g, "").replace(/[\\/]/g, "-").trim();
  const cut = cleaned.slice(0, MAX_NAME_LENGTH);
  if (!cut) throw new WorkError("invalid-name");
  return cut;
}

export function fileNameWithExtension(name: string, extension: string): string {
  const base = sanitizeName(name).replace(/[. ]+$/g, "") || "documento";
  return `${base}.${extension}`;
}

export function formatBytes(bytes: number, locale: string): string {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 * 1024 ? "KB" : "MB";
  const value = bytes / (unit === "KB" ? 1024 : 1024 * 1024);
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${unit}`;
}
