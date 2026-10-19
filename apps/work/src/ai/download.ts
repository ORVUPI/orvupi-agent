/** ORVUPI AI: descarga robusta de los pesos del modelo.
 *  - Por partes (peticiones Range de 8 MB) con reintentos, espera progresiva y detección de conexiones colgadas.
 *  - Reanudable: cada parte se guarda en el almacenamiento privado del navegador (OPFS) y, si la conexión se corta,
 *    la siguiente vez continúa donde se quedó.
 *  - Guarda el archivo completo en OPFS en lugar de la Cache API (que falla con entradas de cientos de MB en móviles).
 *  Solo se descargan archivos públicos del modelo; ningún texto del usuario se envía a ningún sitio. */

export const CHUNK_BYTES = 8 * 1024 * 1024;
export const MAX_RETRIES = 6;
const STALL_MS = 45_000;
const DIR = "orvupi-ai-models";

export type DownloadProgress = (file: string, loaded: number, total: number) => void;

/** Error con causa clasificada para mostrar un mensaje claro. */
export class ModelDownloadError extends Error {
  constructor(
    public readonly kind: "offline" | "network" | "http" | "blocked" | "quota" | "memory",
    message: string,
    public readonly detail: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = "ModelDownloadError";
  }
}

/** Nombre estable en OPFS para una URL del Hub (repo + archivo; sin consulta). */
export function storageKey(url: string): string {
  const u = new URL(url);
  return u.pathname.replace(/^\/+/, "").replace(/\/resolve\/[^/]+\//, "/").replace(/[^A-Za-z0-9._-]+/g, "__");
}

/** Clave del archivo principal de pesos de un modelo, para saber si ya está descargado. */
export function modelWeightsKey(repo: string, dtype: string): string {
  const file = dtype === "q8" ? "model_quantized.onnx" : `model_${dtype}.onnx`;
  return storageKey(`https://huggingface.co/${repo}/resolve/main/onnx/${file}`);
}

type Dir = FileSystemDirectoryHandle;
async function modelsDir(): Promise<Dir | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return null;
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(DIR, { create: true });
  } catch {
    return null;
  }
}

async function readOk(dir: Dir, key: string): Promise<number | null> {
  try {
    const ok = await (await dir.getFileHandle(`${key}.ok`)).getFile();
    const size = Number(await ok.text());
    const data = await (await dir.getFileHandle(key)).getFile();
    return data.size === size ? size : null;
  } catch {
    return null;
  }
}

export async function isStored(key: string): Promise<boolean> {
  const dir = await modelsDir();
  return dir ? (await readOk(dir, key)) !== null : false;
}

export async function clearStored(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(DIR, { recursive: true });
  } catch {
    /* no había nada */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** fetch con detección de conexión colgada: aborta si no llegan bytes en STALL_MS. Devuelve el cuerpo entero (≤ 1 parte). */
async function fetchBytes(url: string, headers: Record<string, string>, fetchImpl: typeof fetch): Promise<{ status: number; body: Uint8Array; headers: Headers }> {
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), STALL_MS);
  const bump = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), STALL_MS); };
  try {
    const res = await fetchImpl(url, { headers, signal: ctrl.signal, cache: "no-store", credentials: "omit" });
    if (!res.ok) return { status: res.status, body: new Uint8Array(), headers: res.headers };
    const reader = res.body!.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.byteLength;
      bump();
    }
    const body = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { body.set(p, at); at += p.byteLength; }
    return { status: res.status, body, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

/** Una parte con reintentos. Diferencia: bloqueo (CSP/CORS/bloqueador) en el primer intento, sin conexión y corte de red. */
async function fetchRange(url: string, start: number, end: number | null, fetchImpl: typeof fetch, first: boolean) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await sleep(Math.min(15_000, 800 * 2 ** (attempt - 1)));
    while (offline()) await sleep(1500);
    try {
      const r = await fetchBytes(url, { Range: `bytes=${start}-${end ?? ""}` }, fetchImpl);
      if (r.status === 404 || r.status === 401 || r.status === 403) throw new ModelDownloadError("http", `HTTP ${r.status}`, { status: r.status });
      if (r.status >= 400) { lastError = new ModelDownloadError("http", `HTTP ${r.status}`, { status: r.status }); continue; }
      return r;
    } catch (error) {
      if (error instanceof ModelDownloadError && error.kind === "http" && Number(error.detail.status) < 500) throw error;
      lastError = error;
      // Un TypeError antes de recibir nada en la primera petición suele ser CSP, CORS o un bloqueador, no la red.
      if (first && attempt === 0 && error instanceof TypeError && !offline()) {
        try { await fetchImpl(url, { method: "HEAD", credentials: "omit" }); } catch { throw new ModelDownloadError("blocked", "blocked", { host: new URL(url).host }); }
      }
    }
  }
  if (offline()) throw new ModelDownloadError("offline", "offline");
  throw new ModelDownloadError("network", lastError instanceof Error ? lastError.message : String(lastError), { start });
}

function totalFrom(headers: Headers, fallback: number): number {
  const m = /\/(\d+)\s*$/.exec(headers.get("content-range") ?? "");
  return m ? Number(m[1]) : fallback;
}

async function ensureSpace(bytes: number) {
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.quota !== undefined && est.usage !== undefined && est.quota - est.usage < bytes) {
      throw new ModelDownloadError("quota", "quota", { need: bytes, free: Math.max(0, est.quota - est.usage) });
    }
  } catch (error) {
    if (error instanceof ModelDownloadError) throw error;
  }
}

/** Descarga (o reanuda) un archivo y devuelve una Response respaldada por disco (OPFS) o por memoria si no hay OPFS. */
export async function robustFetch(url: string, onProgress: DownloadProgress, fetchImpl: typeof fetch = fetch, chunk = CHUNK_BYTES): Promise<Response> {
  const file = new URL(url).pathname.split("/").pop() ?? url;
  const key = storageKey(url);
  const dir = await modelsDir();
  if (dir) {
    const size = await readOk(dir, key);
    if (size !== null) {
      onProgress(file, size, size);
      return new Response(await (await dir.getFileHandle(key)).getFile(), { status: 200, headers: { "content-length": String(size) } });
    }
  }

  // Reanudar: lo que ya haya en el archivo parcial (solo partes completas). Sin OPFS escribible, en memoria.
  let handle: FileSystemFileHandle | null = null;
  let writable: FileSystemWritableFileStream | null = null;
  let have = 0;
  if (dir) {
    try {
      handle = await dir.getFileHandle(key, { create: true });
      have = (await handle.getFile()).size;
      have -= have % chunk;
      writable = await handle.createWritable({ keepExistingData: true });
    } catch {
      handle = null;
      writable = null;
      have = 0;
    }
  }
  const mem: Uint8Array[] = [];
  let total = 0;
  try {
    let head;
    try {
      head = await fetchRange(url, have, have + chunk - 1, fetchImpl, have === 0);
    } catch (error) {
      if (have > 0 && error instanceof ModelDownloadError && error.detail.status === 416) {
        have = 0;
        head = await fetchRange(url, 0, chunk - 1, fetchImpl, true);
      } else throw error;
    }
    if (head.status === 200) {
      // El servidor no admite Range: archivo entero (pequeño) de una vez
      have = 0;
      total = head.body.byteLength;
    } else {
      total = totalFrom(head.headers, have + head.body.byteLength);
    }
    if (have === 0) await ensureSpace(total);
    if (writable) {
      await writable.truncate(have);
      await writable.seek(have);
    }
    const put = async (bytes: Uint8Array) => {
      if (writable) await writable.write(bytes as unknown as BufferSource);
      else mem.push(bytes);
      have += bytes.byteLength;
      onProgress(file, have, total);
    };
    await put(head.body);
    while (have < total) {
      const end = Math.min(total, have + chunk) - 1;
      const part = await fetchRange(url, have, end, fetchImpl, false);
      if (part.status === 200) throw new ModelDownloadError("network", "range-ignored");
      await put(part.body);
    }
    if (writable) { await writable.close(); writable = null; }
  } catch (error) {
    if (writable) await writable.close().catch(() => undefined); // conserva lo descargado para reanudar
    if (error instanceof DOMException && error.name === "QuotaExceededError") throw new ModelDownloadError("quota", "quota", { need: total, free: 0 });
    throw error;
  }

  if (dir && handle) {
    const ok = await (await dir.getFileHandle(`${key}.ok`, { create: true })).createWritable();
    await ok.write(String(total));
    await ok.close();
    return new Response(await handle.getFile(), { status: 200, headers: { "content-length": String(total) } });
  }
  return new Response(new Blob(mem as BlobPart[]), { status: 200, headers: { "content-length": String(total) } });
}
