import type { BlobStore } from "./types";

/**
 * Imágenes de los documentos guardadas aparte, como binario (OPFS o IndexedDB), no como base64
 * dentro del JSON. El documento solo guarda «orv-asset:<id>.<ext>». En pantalla se muestra una
 * copia reducida (object URL); el original se conserva intacto para exportar.
 */

export const ASSET_PREFIX = "orv-asset:";
const ASSET_RE = /^orv-asset:([a-z0-9]{8,64})\.(png|jpg|gif|webp)$/;
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif", "image/webp": "webp" };
/** Lado máximo de la copia que se dibuja en pantalla. */
const DISPLAY_SIDE = 2000;
/** Por debajo de este tamaño no merece la pena reducir. */
const DISPLAY_BYTES = 1_500_000;

let store: BlobStore | null = null;
const urls = new Map<string, Promise<string>>();
const exportCache = new Map<string, Uint8Array>();

export function setAssetStore(next: BlobStore | null) {
  store = next;
}

export function hasAssetStore(): boolean {
  return store !== null;
}

export function isAssetSrc(src: unknown): src is string {
  return typeof src === "string" && ASSET_RE.test(src);
}

export function assetMime(src: string): string | null {
  const match = ASSET_RE.exec(src);
  return match ? MIME[match[2]!] ?? null : null;
}

function keyOf(src: string): string | null {
  const match = ASSET_RE.exec(src);
  return match ? `assets/${match[1]}.${match[2]}` : null;
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Guarda el original y devuelve la referencia para el documento. */
export async function putAsset(bytes: Uint8Array, mime: string): Promise<string> {
  const ext = EXT[mime.toLowerCase()];
  if (!store || !ext) throw new Error("asset-store-unavailable");
  const src = `${ASSET_PREFIX}${randomId()}.${ext}`;
  await store.write(keyOf(src)!, bytes);
  return src;
}

export async function readAsset(src: string): Promise<Uint8Array | null> {
  const key = keyOf(src);
  if (!key) return null;
  const cached = exportCache.get(src);
  if (cached) return cached;
  return store ? store.read(key) : null;
}

async function shrink(bytes: Uint8Array, mime: string): Promise<Blob> {
  const original = new Blob([bytes as BlobPart], { type: mime });
  if (bytes.byteLength < DISPLAY_BYTES || mime === "image/gif" || typeof createImageBitmap !== "function") return original;
  try {
    const bitmap = await createImageBitmap(original);
    const scale = Math.min(1, DISPLAY_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && bytes.byteLength < DISPLAY_BYTES * 4) {
      bitmap.close();
      return original;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const type = mime === "image/png" ? "image/png" : "image/jpeg";
    let blob: Blob | null = null;
    if (typeof OffscreenCanvas === "function") {
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
      blob = await canvas.convertToBlob({ type, quality: 0.85 });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    }
    bitmap.close();
    return blob && blob.size < original.size ? blob : original;
  } catch {
    return original;
  }
}

/** URL para pintar la imagen (copia reducida si es enorme). Se cachea por sesión. */
export function assetUrl(src: string): Promise<string> {
  let hit = urls.get(src);
  if (!hit) {
    hit = (async () => {
      const bytes = await readAsset(src);
      const mime = assetMime(src);
      if (!bytes || !mime) return "";
      return URL.createObjectURL(await shrink(bytes, mime));
    })();
    urls.set(src, hit);
  }
  return hit;
}

/** Referencias a imágenes guardadas aparte dentro de un JSON de documento. */
export function assetSrcs(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) assetSrcs(item, out);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "src" && isAssetSrc(item)) out.add(item);
      else if (typeof item === "object") assetSrcs(item, out);
    }
  }
  return out;
}

/** Carga los originales antes de exportar (DOCX, PDF, HTML) para que el exportador los lea al momento. */
export async function preloadAssets(value: unknown): Promise<void> {
  for (const src of assetSrcs(value)) {
    if (exportCache.has(src)) continue;
    const bytes = store ? await store.read(keyOf(src)!) : null;
    if (bytes) exportCache.set(src, bytes);
  }
}

export function releaseExportAssets() {
  exportCache.clear();
}

/** Bytes y tipo de una imagen del documento: data URL o imagen guardada aparte ya cargada. */
export function imageBytesSync(src: string): { data: Uint8Array; mime: string } | null {
  if (isAssetSrc(src)) {
    const data = exportCache.get(src);
    const mime = assetMime(src);
    return data && mime ? { data, mime } : null;
  }
  const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/is.exec(String(src).trim());
  if (!match) return null;
  const binary = atob(match[2]!.replace(/\s+/g, ""));
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) data[i] = binary.charCodeAt(i);
  return { data, mime: match[1]!.toLowerCase() };
}

/** data URL del original (solo para exportar a HTML). */
export function assetDataUrlSync(src: string): string | null {
  const hit = imageBytesSync(src);
  if (!hit) return null;
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < hit.data.length; i += chunk) binary += String.fromCharCode(...hit.data.subarray(i, i + chunk));
  return `data:${hit.mime};base64,${btoa(binary)}`;
}

/** Copia del documento con las imágenes guardadas aparte incrustadas (tras preloadAssets). */
export function inlineAssets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => inlineAssets(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = key === "src" && isAssetSrc(item) ? assetDataUrlSync(item) ?? item : inlineAssets(item);
    }
    return out as T;
  }
  return value;
}

/** Pasa las imágenes incrustadas (data URL) de un documento a binarios guardados aparte. */
export async function externalizeImages<T>(value: T): Promise<T> {
  if (!store) return value;
  const map = new Map<string, string>();
  const swap = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) {
      const out: unknown[] = [];
      for (const item of node) out.push(await swap(item));
      return out;
    }
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(node)) {
        if (key === "src" && typeof item === "string" && item.startsWith("data:image/")) {
          if (!map.has(item)) {
            const hit = imageBytesSync(item);
            try {
              map.set(item, hit ? await putAsset(hit.data, hit.mime) : item);
            } catch {
              map.set(item, item);
            }
          }
          out[key] = map.get(item);
        } else out[key] = await swap(item);
      }
      return out;
    }
    return node;
  };
  return (await swap(value)) as T;
}
