import { createHash } from "node:crypto";
import { extractCid } from "./cid.js";
import type { LookupOptions } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpsRequest, type RequestOptions } from "node:https";

export type BytesResult = {
  ok: true;
  url: string;
  status: number;
  bytes: Uint8Array;
  fetchedAt: string;
} | {
  ok: false;
  url: string | null;
  status: number | null;
  error: string;
  fetchedAt: string;
};

export type JsonResult = {
  ok: true;
  url: string;
  status: number;
  json: unknown;
  fetchedAt: string;
} | {
  ok: false;
  url: string | null;
  status: number | null;
  error: string;
  fetchedAt: string;
};

type HostResolver = (hostname: string) => Promise<readonly string[]>;

type HttpOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  fetchImpl?: typeof fetch;
  resolveHost?: HostResolver;
};

const ARWEAVE_RE = /^[A-Za-z0-9_-]{43}$/;

const IPFS_GATEWAY_HOSTS = ["gateway.pinata.cloud", "dweb.link", "w3s.link", "ipfs.io"] as const;
const ARWEAVE_GATEWAY_HOSTS = ["arweave.net"] as const;
const MAX_REDIRECTS = 3;

export { extractCid } from "./cid.js";

export function extractArweaveId(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith("ar://")) {
    const id = trimmed.slice(5).split(/[/?#]/)[0] ?? "";
    return ARWEAVE_RE.test(id) ? id : null;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = stripHost(url.hostname);
  if (!ARWEAVE_GATEWAY_HOSTS.includes(host as (typeof ARWEAVE_GATEWAY_HOSTS)[number]) && !host.endsWith(".arweave.net")) {
    return null;
  }
  const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  return ARWEAVE_RE.test(id) ? id : null;
}

export function isPrivateAddress(hostname: string): boolean {
  const bare = stripHost(hostname);
  if (bare.length === 0 || bare === "localhost" || bare.endsWith(".localhost") || bare.endsWith(".local")) {
    return true;
  }
  if (/^\d+$/.test(bare)) {
    return true;
  }
  if (bare.includes(":")) {
    return isPrivateIpv6(bare);
  }
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare);
  if (!match) {
    return false;
  }
  const parts = [match[1], match[2], match[3], match[4]].map((item) => Number(item));
  if (parts.some((item) => item > 255)) {
    return true;
  }
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 0 || a === 10 || a === 127 || a >= 224) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  return false;
}

export function isPublicHttps(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  return !isPrivateAddress(url.hostname);
}

export function candidateUrls(uri: string): string[] {
  const urls: string[] = [];
  const cid = extractCid(uri);
  const arweave = cid ? null : extractArweaveId(uri);
  const direct = directGateway(uri, cid, arweave);
  if (direct) {
    urls.push(direct);
  }
  if (cid) {
    for (const host of IPFS_GATEWAY_HOSTS) {
      const next = `https://${host}/ipfs/${cid}`;
      if (!urls.includes(next)) {
        urls.push(next);
      }
    }
  } else if (arweave) {
    for (const host of ARWEAVE_GATEWAY_HOSTS) {
      const next = `https://${host}/${arweave}`;
      if (!urls.includes(next)) {
        urls.push(next);
      }
    }
  }
  return urls;
}

/** IPv4 públicas primero y después el resto, sin direcciones privadas. */
export function orderPublicAddresses(addresses: readonly string[]): string[] {
  const v4: string[] = [];
  const v6: string[] = [];
  for (const item of addresses) {
    if (item.length === 0 || isPrivateAddress(item)) {
      continue;
    }
    if (item.includes(":")) {
      v6.push(item);
    } else {
      v4.push(item);
    }
  }
  return [...v4, ...v6];
}

/** Lookup de `https.request`: ignora el nombre y devuelve la primera IPv4 pública, o la siguiente IP pública. El callback va en la siguiente vuelta para que el `error` del socket tenga listener. */
export function pinnedLookup(addresses: readonly string[]) {
  return (
    _hostname: string,
    options: LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void,
  ): void => {
    process.nextTick(() => {
      try {
        const ordered = orderPublicAddresses(addresses);
        const asked = options.family === "IPv6" || options.family === 6 ? 6 : options.family === "IPv4" || options.family === 4 ? 4 : 0;
        const wanted = asked === 4 || asked === 6
          ? ordered.filter((item) => (item.includes(":") ? 6 : 4) === asked)
          : ordered;
        const chosen = wanted[0];
        if (!chosen) {
          const error = new Error("sin IP pública validada") as NodeJS.ErrnoException;
          error.code = "EINVAL";
          callback(error, "", 0);
          return;
        }
        const family = chosen.includes(":") ? 6 : 4;
        if (options.all) {
          callback(null, [{ address: chosen, family }]);
          return;
        }
        callback(null, chosen, family);
      } catch (error) {
        const wrapped = error instanceof Error ? error : new Error("error de red");
        callback(wrapped as NodeJS.ErrnoException, "", 0);
      }
    });
  };
}

/** Prueba cada IP validada. Un error de socket se captura y se sigue con la siguiente. */
export async function connectPinned(
  addresses: readonly string[],
  dial: (address: string, signal: AbortSignal) => Promise<Response>,
  signal: AbortSignal,
): Promise<Response> {
  const ordered = orderPublicAddresses(addresses);
  if (ordered.length === 0) {
    throw new Error("sin IP pública validada");
  }
  let last: Error = new Error("sin IP pública validada");
  for (const address of ordered) {
    if (signal.aborted) {
      throw abortError(signal);
    }
    try {
      return await dial(address, signal);
    } catch (error) {
      last = error instanceof Error ? error : new Error("error de red");
      if (signal.aborted) {
        throw abortError(signal);
      }
    }
  }
  throw last;
}

export async function resolvePublicHost(hostname: string, timeoutMs = 4000): Promise<string[]> {
  const bare = stripHost(hostname);
  if (isIpLiteral(bare)) {
    return [bare];
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      lookup(bare, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("timeout DNS")), timeoutMs);
      }),
    ]);
    return records.map((item) => item.address);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function fetchBytes(url: string, options: HttpOptions = {}): Promise<BytesResult> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const fetchImpl = options.fetchImpl ?? fetch;
  const pinConnection = options.fetchImpl === undefined;
  const resolveHost = options.resolveHost ?? (options.fetchImpl ? async (host: string) => [host] : resolvePublicHost);
  const timeoutMs = options.timeoutMs ?? 8000;
  const deadline = AbortSignal.timeout(timeoutMs);
  const maxBytes = options.maxBytes ?? 1_000_000;
  const maxRetries = options.maxRetries ?? 2;
  const backoffBaseMs = options.backoffBaseMs ?? 500;
  const urls = candidateUrls(url);
  if (urls.length === 0) {
    return {
      ok: false,
      url: null,
      status: null,
      error: "No se descarga la URI del creador. Solo entran pasarelas IPFS o Arweave de la lista blanca.",
      fetchedAt: now().toISOString(),
    };
  }
  let last: BytesResult = { ok: false, url: urls[0] ?? null, status: null, error: "sin respuesta", fetchedAt: now().toISOString() };
  for (const candidate of urls) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const fetchedAt = now().toISOString();
      if (deadline.aborted) {
        return { ok: false, url: candidate, status: null, error: "timeout", fetchedAt };
      }
      try {
        const result = await fetchChecked(candidate, {
          fetchImpl,
          resolveHost,
          pinConnection,
          signal: deadline,
          maxBytes,
          fetchedAt,
        });
        if (deadline.aborted) {
          return { ok: false, url: candidate, status: null, error: "timeout", fetchedAt };
        }
        if (!result.ok && result.retry && attempt < maxRetries) {
          last = result.body;
          await sleepUntil(deadline, sleep, backoffBaseMs * 2 ** attempt + Math.floor(random() * 100));
          continue;
        }
        if (result.ok) {
          return result.body;
        }
        last = result.body;
        break;
      } catch (error) {
        if (deadline.aborted) {
          return { ok: false, url: candidate, status: null, error: "timeout", fetchedAt };
        }
        last = {
          ok: false,
          url: candidate,
          status: null,
          error: error instanceof Error ? error.message : "error de red",
          fetchedAt,
        };
        if (attempt < maxRetries) {
          await sleepUntil(deadline, sleep, backoffBaseMs * 2 ** attempt + Math.floor(random() * 100));
          continue;
        }
      }
    }
  }
  return last;
}

export async function fetchJson(url: string, options: HttpOptions = {}): Promise<JsonResult> {
  const result = await fetchBytes(url, options);
  if (!result.ok) {
    return result;
  }
  try {
    const json = JSON.parse(new TextDecoder().decode(result.bytes)) as unknown;
    return { ok: true, url: result.url, status: result.status, json, fetchedAt: result.fetchedAt };
  } catch {
    return { ok: false, url: result.url, status: result.status, error: "El contenido no es JSON.", fetchedAt: result.fetchedAt };
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function stripHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/^\.+|\.+$/g, "");
}

function isIpLiteral(hostname: string): boolean {
  return hostname.includes(":") || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function ipv6Hextets(host: string): number[] | null {
  const lower = host.toLowerCase();
  if (lower.includes(".")) {
    return null;
  }
  const halves = lower.split("::");
  if (halves.length > 2) {
    return null;
  }
  const parse = (part: string): number[] | null => {
    if (part === "") {
      return [];
    }
    const out: number[] = [];
    for (const bit of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/.test(bit)) {
        return null;
      }
      out.push(Number.parseInt(bit, 16));
    }
    return out;
  };
  const left = parse(halves[0] ?? "");
  const right = halves.length === 2 ? parse(halves[1] ?? "") : [];
  if (!left || !right) {
    return null;
  }
  if (halves.length === 1) {
    return left.length === 8 ? left : null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 0) {
    return null;
  }
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function isPrivateIpv6(host: string): boolean {
  if (host === "::" || host === "::1") {
    return true;
  }
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(host);
  if (mapped?.[1]) {
    return isPrivateAddress(mapped[1]);
  }
  const parts = ipv6Hextets(host);
  if (parts && parts.length === 8) {
    const nat64 = parts[0] === 0x64 && parts[1] === 0xff9b && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0;
    if (nat64) {
      return true;
    }
    const v4Mapped = parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0xffff;
    if (v4Mapped) {
      const hi = parts[6] ?? 0;
      const lo = parts[7] ?? 0;
      return isPrivateAddress(`${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`);
    }
  }
  const first = host.split(":").find((part) => part.length > 0) ?? "";
  const head = first.toLowerCase();
  if (head.startsWith("fe8") || head.startsWith("fe9") || head.startsWith("fea") || head.startsWith("feb")) {
    return true;
  }
  return head.startsWith("fc") || head.startsWith("fd");
}

function directGateway(uri: string, cid: string | null, arweave: string | null): string | null {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return null;
  }
  const host = stripHost(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);
  if (cid && (IPFS_GATEWAY_HOSTS as readonly string[]).includes(host) && parts[0] === "ipfs" && parts[1] === cid && parts.length === 2) {
    return `https://${host}/ipfs/${cid}`;
  }
  if (arweave && (ARWEAVE_GATEWAY_HOSTS as readonly string[]).includes(host) && parts.length === 1 && parts[0] === arweave) {
    return `https://${host}/${arweave}`;
  }
  return null;
}

async function destinationAllowed(value: string, resolveHost: HostResolver, initial: boolean): Promise<{ ok: true; url: string; addresses: readonly string[] } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "La redirección no es una URL." };
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return { ok: false, error: "La redirección no es https público." };
  }
  const host = stripHost(url.hostname);
  if (isPrivateAddress(host)) {
    return { ok: false, error: "Destino con IP o host privado." };
  }
  if (initial) {
    const allowed = (IPFS_GATEWAY_HOSTS as readonly string[]).includes(host) || (ARWEAVE_GATEWAY_HOSTS as readonly string[]).includes(host);
    if (!allowed) {
      return { ok: false, error: "El destino inicial no está en la lista blanca." };
    }
  }
  let addresses: readonly string[];
  try {
    addresses = await resolveHost(host);
  } catch {
    return { ok: false, error: "No se pudo comprobar el destino." };
  }
  if (addresses.length === 0 || addresses.some((item) => isPrivateAddress(item))) {
    return { ok: false, error: "El destino resuelve a una IP privada." };
  }
  return { ok: true, url: url.href, addresses };
}

async function fetchChecked(start: string, input: {
  fetchImpl: typeof fetch;
  resolveHost: HostResolver;
  pinConnection: boolean;
  signal: AbortSignal;
  maxBytes: number;
  fetchedAt: string;
}): Promise<{ ok: true; body: BytesResult } | { ok: false; retry: boolean; body: BytesResult }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (input.signal.aborted) {
      return {
        ok: false,
        retry: false,
        body: { ok: false, url: current, status: null, error: "timeout", fetchedAt: input.fetchedAt },
      };
    }
    const allowed = await withDeadline(input.signal, destinationAllowed(current, input.resolveHost, hop === 0));
    if (!allowed.ok) {
      return {
        ok: false,
        retry: false,
        body: { ok: false, url: current, status: null, error: allowed.error, fetchedAt: input.fetchedAt },
      };
    }
    const response = input.pinConnection
      ? await requestPinned(allowed.url, allowed.addresses, input.maxBytes, input.signal)
      : await input.fetchImpl(allowed.url, {
          method: "GET",
          redirect: "manual",
          headers: { accept: "*/*", "user-agent": "orvupi-verify/0.1" },
          signal: input.signal,
        });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) {
        return {
          ok: false,
          retry: false,
          body: { ok: false, url: allowed.url, status: response.status, error: "Redirección no utilizable.", fetchedAt: input.fetchedAt },
        };
      }
      current = new URL(location, allowed.url).href;
      continue;
    }
    if (response.status === 429 || response.status === 408 || response.status >= 500) {
      return {
        ok: false,
        retry: true,
        body: { ok: false, url: allowed.url, status: response.status, error: `HTTP ${response.status}`, fetchedAt: input.fetchedAt },
      };
    }
    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        retry: false,
        body: { ok: false, url: allowed.url, status: response.status, error: `HTTP ${response.status}`, fetchedAt: input.fetchedAt },
      };
    }
    const bytes = await readLimited(response, input.maxBytes);
    return { ok: true, body: { ok: true, url: allowed.url, status: response.status, bytes, fetchedAt: input.fetchedAt } };
  }
  return {
    ok: false,
    retry: false,
    body: { ok: false, url: start, status: null, error: "Demasiadas redirecciones.", fetchedAt: input.fetchedAt },
  };
}

function requestPinned(url: string, addresses: readonly string[], maxBytes: number, signal: AbortSignal): Promise<Response> {
  return connectPinned(addresses, (address) => requestOne(url, address, maxBytes, signal), signal);
}

export function pinnedSocketOptions(address: string): { family: 4 | 6; autoSelectFamily: false } {
  return {
    family: address.includes(":") ? 6 : 4,
    autoSelectFamily: false,
  };
}

function requestOne(url: string, address: string, maxBytes: number, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError(signal));
      return;
    }
    let settled = false;
    let onAbort: () => void = () => {};
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const target = new URL(url);
    const socketOptions = pinnedSocketOptions(address);
    let req: ReturnType<typeof httpsRequest>;
    const requestOptions: RequestOptions & { autoSelectFamily: false } = {
      hostname: target.hostname,
      port: target.port === "" ? 443 : Number(target.port),
      path: `${target.pathname}${target.search}`,
      method: "GET",
      servername: target.hostname,
      headers: {
        accept: "*/*",
        "user-agent": "orvupi-verify/0.1",
        host: target.host,
      },
      family: socketOptions.family,
      autoSelectFamily: socketOptions.autoSelectFamily,
      lookup: pinnedLookup([address]),
    };
    try {
      req = httpsRequest(
        requestOptions,
        (res) => {
          const chunks: Buffer[] = [];
          let total = 0;
          res.on("error", (error) => {
            finish(() => reject(error));
          });
          res.on("data", (chunk: Buffer) => {
            total += chunk.byteLength;
            if (total > maxBytes) {
              res.destroy();
              req.destroy();
              finish(() => reject(new Error("Respuesta mayor que el límite.")));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(res.headers)) {
              if (value === undefined) {
                continue;
              }
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
            }
            finish(() => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, headers })));
          });
        },
      );
      onAbort = () => {
        req.destroy();
        finish(() => reject(abortError(signal)));
      };
      signal.addEventListener("abort", onAbort);
      const onFail = (error: Error) => {
        finish(() => reject(error));
      };
      req.on("error", onFail);
      req.on("socket", (socket) => {
        socket.on("error", onFail);
      });
      if (req.socket) {
        req.socket.on("error", onFail);
      }
      req.end();
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error("error de red")));
    }
  });
}

function abortError(signal: AbortSignal): Error {
  const reason = signal.reason;
  if (reason instanceof Error) {
    return reason;
  }
  return new Error("timeout");
}

function withDeadline<T>(signal: AbortSignal, work: Promise<T>): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(abortError(signal));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(abortError(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function sleepUntil(signal: AbortSignal, sleep: (ms: number) => Promise<void>, ms: number): Promise<void> {
  if (signal.aborted || ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", done);
      resolve();
    };
    signal.addEventListener("abort", done, { once: true });
    sleep(ms).then(done, done);
  });
}

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.byteLength > maxBytes) {
      throw new Error("Respuesta mayor que el límite.");
    }
    return raw;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const step = await reader.read();
    if (step.done) {
      break;
    }
    total += step.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Respuesta mayor que el límite.");
    }
    chunks.push(step.value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
