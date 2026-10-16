import { ALLOWED_RPC_METHODS, type AllowedRpcMethod } from "./methods.js";

export type RpcTransport = (
  endpoint: string,
  body: string,
  timeoutMs: number,
) => Promise<{ status: number; body: string }>;

export type AccountInfo = {
  owner: string;
  executable: boolean;
  lamports: number;
  space: number;
  data: Uint8Array;
};

export type RpcSuccess<T> = {
  ok: true;
  value: T;
  slot: number | null;
  fetchedAt: string;
};

export type RpcFailure = {
  ok: false;
  method: string;
  error: string;
  httpStatus: number | null;
  fetchedAt: string;
};

export type RpcResult<T> = RpcSuccess<T> | RpcFailure;

export type TokenAmount = {
  amount: string;
  decimals: number;
};

export type LargestAccount = {
  address: string;
  amount: string;
  decimals: number;
};

type RpcClientOptions = {
  endpoint: string;
  transport?: RpcTransport;
  timeoutMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  minIntervalMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  monoNow?: () => number;
  signal?: AbortSignal;
};

export async function httpTransport(
  endpoint: string,
  body: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (typeof navigator === "undefined") {
    headers["user-agent"] = "orvupi-verify/0.1";
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: signal ? AbortSignal.any([AbortSignal.timeout(timeoutMs), signal]) : AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    } as RequestInit);
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.byteLength > 5_000_000) {
      return { status: response.status, body: "" };
    }
    return { status: response.status, body: new TextDecoder().decode(raw) };
  } catch {
    return { status: 0, body: "" };
  }
}

const RPC_BLOCK_MS = 10 * 60 * 1000;
const blockedRpcMethods = new Map<string, number>();

export function rpcBlockKey(endpoint: string, method: string): string {
  try {
    return `${new URL(endpoint).origin} ${method}`;
  } catch {
    return `${endpoint} ${method}`;
  }
}

export function rememberRpcBlock(endpoint: string, method: string, nowMs = Date.now()): void {
  blockedRpcMethods.set(rpcBlockKey(endpoint, method), nowMs + RPC_BLOCK_MS);
}

export function isRpcBlocked(endpoint: string, method: string, nowMs = Date.now()): boolean {
  const key = rpcBlockKey(endpoint, method);
  const until = blockedRpcMethods.get(key);
  if (until === undefined) return false;
  if (nowMs >= until) {
    blockedRpcMethods.delete(key);
    return false;
  }
  return true;
}

export function clearRpcBlocks(): void {
  blockedRpcMethods.clear();
}

export class RpcClient {
  private readonly endpoint: string;
  private readonly transport: RpcTransport;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffBaseMs: number;
  private readonly minIntervalMs: number;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly monoNow: () => number;
  private nextAt = 0;
  private id = 1;

  constructor(options: RpcClientOptions) {
    this.endpoint = options.endpoint;
    this.transport =
      options.transport ?? ((endpoint, body, timeoutMs) => httpTransport(endpoint, body, timeoutMs, options.signal));
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxRetries = options.maxRetries ?? 2;
    this.backoffBaseMs = options.backoffBaseMs ?? 500;
    this.minIntervalMs = options.minIntervalMs ?? 400;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
    this.monoNow = options.monoNow ?? Date.now;
  }

  getSlot(): Promise<RpcResult<number>> {
    return this.call<number>("getSlot", [{ commitment: "confirmed" }], (result) => {
      if (typeof result === "number" && Number.isSafeInteger(result)) {
        return result;
      }
      throw new Error("getSlot no devolvió un entero.");
    });
  }

  getAccountInfo(address: string): Promise<RpcResult<AccountInfo | null>> {
    return this.call(
      "getAccountInfo",
      [address, { encoding: "base64", commitment: "confirmed" }],
      (result) => parseAccountValue(result),
    );
  }

  getMultipleAccounts(addresses: readonly string[]): Promise<RpcResult<(AccountInfo | null)[]>> {
    return this.call(
      "getMultipleAccounts",
      [addresses, { encoding: "base64", commitment: "confirmed" }],
      (result) => {
        const value = contextValue(result);
        if (!Array.isArray(value) || value.length !== addresses.length) {
          throw new Error("getMultipleAccounts no devolvió todas las cuentas pedidas.");
        }
        return value.map((item) => parseAccount(item));
      },
    );
  }

  getTokenSupply(mint: string): Promise<RpcResult<TokenAmount>> {
    return this.call("getTokenSupply", [mint, { commitment: "confirmed" }], (result) => {
      const value = contextValue(result);
      return parseTokenAmount(value);
    });
  }

  getTokenLargestAccounts(mint: string): Promise<RpcResult<LargestAccount[]>> {
    return this.call("getTokenLargestAccounts", [mint, { commitment: "confirmed" }], (result) => {
      const value = contextValue(result);
      if (!Array.isArray(value)) {
        throw new Error("getTokenLargestAccounts no devolvió una lista.");
      }
      return value.map((item) => {
        if (!item || typeof item !== "object") {
          throw new Error("Cuenta de la muestra ilegible.");
        }
        const row = item as Record<string, unknown>;
        if (typeof row.address !== "string" || !/^\d+$/.test(String(row.amount)) || typeof row.decimals !== "number") {
          throw new Error("amount de la muestra no es una cadena de unidades mínimas.");
        }
        return { address: row.address, amount: String(row.amount), decimals: row.decimals };
      });
    });
  }

  private async call<T>(
    method: string,
    params: unknown,
    parse: (result: unknown) => T,
  ): Promise<RpcResult<T>> {
    if (!isAllowedMethod(method)) {
      return {
        ok: false,
        method,
        error: `Método RPC no permitido: ${method}`,
        httpStatus: null,
        fetchedAt: this.now().toISOString(),
      };
    }
    const nowMs = this.now().getTime();
    if (isRpcBlocked(this.endpoint, method, nowMs)) {
      return {
        ok: false,
        method,
        error: "HTTP 403",
        httpStatus: 403,
        fetchedAt: this.now().toISOString(),
      };
    }
    let lastError = "sin respuesta";
    let lastStatus: number | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this.pace();
      const fetchedAt = this.now().toISOString();
      try {
        const payload = JSON.stringify({ jsonrpc: "2.0", id: this.id, method, params });
        this.id += 1;
        const response = await this.transport(this.endpoint, payload, this.timeoutMs);
        lastStatus = response.status;
        if (isRetryableStatus(response.status) && attempt < this.maxRetries) {
          lastError = `HTTP ${response.status}`;
          await this.sleep(this.backoff(attempt, method));
          continue;
        }
        if (response.status === 403) {
          rememberRpcBlock(this.endpoint, method, nowMs);
          return { ok: false, method, error: "HTTP 403", httpStatus: 403, fetchedAt };
        }
        if (response.status < 200 || response.status >= 300) {
          return { ok: false, method, error: `HTTP ${response.status}`, httpStatus: response.status, fetchedAt };
        }
        const parsed = JSON.parse(response.body) as { result?: unknown; error?: { code?: number; message?: string } };
        if (parsed.error) {
          const message = parsed.error.message ?? "error JSON-RPC";
          if (isRetryableMessage(parsed.error.code, message) && attempt < this.maxRetries) {
            lastError = message;
            await this.sleep(this.backoff(attempt, method));
            continue;
          }
          return { ok: false, method, error: message, httpStatus: response.status, fetchedAt };
        }
        const slot = readSlot(parsed.result, method);
        return { ok: true, value: parse(parsed.result), slot, fetchedAt };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "error de red";
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoff(attempt, method));
          continue;
        }
        return { ok: false, method, error: lastError, httpStatus: lastStatus, fetchedAt };
      }
    }
    return {
      ok: false,
      method,
      error: lastError,
      httpStatus: lastStatus,
      fetchedAt: this.now().toISOString(),
    };
  }

  private backoff(attempt: number, method: string): number {
    const base = method === "getTokenLargestAccounts" ? Math.max(this.backoffBaseMs, 1000) : this.backoffBaseMs;
    const jitter = Math.floor(this.random() * 100);
    return base * 2 ** attempt + jitter;
  }

  private async pace(): Promise<void> {
    const now = this.monoNow();
    const start = Math.max(now, this.nextAt);
    this.nextAt = start + this.minIntervalMs;
    if (start > now) {
      await this.sleep(start - now);
    }
  }
}

export function isAllowedMethod(method: string): method is AllowedRpcMethod {
  return (ALLOWED_RPC_METHODS as readonly string[]).includes(method);
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 429 || status === 408 || status >= 500;
}

function isRetryableMessage(code: number | undefined, message: string): boolean {
  if (code === 429) {
    return true;
  }
  return /too many requests|rate limit|timeout|temporarily unavailable/i.test(message);
}

function readSlot(result: unknown, method: string): number | null {
  if (method === "getSlot" && typeof result === "number") {
    return result;
  }
  if (result && typeof result === "object" && "context" in result) {
    const slot = (result as { context?: { slot?: unknown } }).context?.slot;
    if (typeof slot === "number" && Number.isSafeInteger(slot)) {
      return slot;
    }
  }
  return null;
}

function contextValue(result: unknown): unknown {
  if (result && typeof result === "object" && "value" in result) {
    return (result as { value: unknown }).value;
  }
  return result;
}

function parseAccountValue(result: unknown): AccountInfo | null {
  return parseAccount(contextValue(result));
}

function parseAccount(value: unknown): AccountInfo | null {
  if (value === null) {
    return null;
  }
  if (!value || typeof value !== "object") {
    throw new Error("Cuenta ilegible.");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.owner !== "string" || !Array.isArray(row.data) || typeof row.data[0] !== "string") {
    throw new Error("getAccountInfo sin datos base64.");
  }
  const data = decodeBase64(row.data[0]);
  return {
    owner: row.owner,
    executable: row.executable === true,
    lamports: typeof row.lamports === "number" ? row.lamports : 0,
    space: typeof row.space === "number" ? row.space : data.length,
    data,
  };
}

function parseTokenAmount(value: unknown): TokenAmount {
  if (!value || typeof value !== "object") {
    throw new Error("Suministro ilegible.");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.amount !== "string" || !/^\d+$/.test(row.amount) || typeof row.decimals !== "number") {
    throw new Error("El suministro no viene como cadena de unidades mínimas.");
  }
  return { amount: row.amount, decimals: row.decimals };
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export type ChainReader = {
  getSlot(): Promise<RpcResult<number>>;
  getAccountInfo(address: string): Promise<RpcResult<AccountInfo | null>>;
  getMultipleAccounts(addresses: readonly string[]): Promise<RpcResult<(AccountInfo | null)[]>>;
  getTokenSupply(mint: string): Promise<RpcResult<TokenAmount>>;
  getTokenLargestAccounts(mint: string): Promise<RpcResult<LargestAccount[]>>;
};
