export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_BACKUP_BYTES = 80 * 1024 * 1024;
export const MAX_NAME_LENGTH = 180;

export const ALLOWED_IMPORT_EXTENSIONS = new Set([
  "orvdoc",
  "json",
  "txt",
  "text",
  "md",
  "html",
  "htm",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "csv",
  "xlsx",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "sh",
  "js",
  "mjs",
  "cjs",
  "svg",
  "htmljs",
]);

export function extensionOf(name: string): string {
  const base = name.trim().toLowerCase();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1);
}

export function isBlockedExtension(name: string): boolean {
  return BLOCKED_EXTENSIONS.has(extensionOf(name));
}
