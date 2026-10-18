/**
 * Raydium LaunchLab: lectura de la curva de un mint, solo con getMultipleAccounts.
 * Programa y layout: raydium-sdk-V2, src/raydium/launchpad/{layout,pda}.ts
 * (LaunchpadPool, getPdaLaunchpadPoolId = ["pool", mintA, mintB]).
 * Comprobado en la cadena con el pool de ORVUPI 8XidD43yueGuP31Zj4wpuyfAhVBEuCBfg1tvwZJ81jQk.
 */
import { decodePubkey, encodeBase58 } from "./base58.js";
import { percentTruncated, readU64 } from "./bytes.js";
import { findProgramAddress } from "./pda.js";

export const LAUNCHLAB_PROGRAM = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
export const CPMM_PROGRAM = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
/** Configuración CPMM 0 de Raydium (0,25 %), la que usa la migración por defecto. */
export const CPMM_DEFAULT_CONFIG = "D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2";
export const LAUNCHLAB_WSOL = "So11111111111111111111111111111111111111112";
export const LAUNCHLAB_USD1 = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";
/** sha256("account:PoolState")[0..8] */
export const LAUNCHLAB_POOL_DISCRIMINATOR = Uint8Array.from([247, 237, 227, 245, 215, 195, 222, 70]);
/** sha256("account:PlatformConfig")[0..8] */
export const LAUNCHLAB_PLATFORM_DISCRIMINATOR = Uint8Array.from([160, 78, 128, 0, 248, 83, 230, 160]);
/** Hasta creator incluido: 8 + 8 + 5 + 10·8 + 40 + 7·32. */
export const LAUNCHLAB_POOL_MIN_LEN = 365;
const PLATFORM_CP_CONFIG_OFFSET = 688;

export type LaunchlabStatus = "en_curva" | "migrando" | "migrado" | "desconocido";

export type LaunchlabPool = {
  poolAddress: string;
  status: LaunchlabStatus;
  statusCode: number;
  migrateType: "amm" | "cpmm" | "desconocido";
  decimalsA: number;
  decimalsB: number;
  supply: bigint;
  totalSellA: bigint;
  virtualA: bigint;
  virtualB: bigint;
  realA: bigint;
  realB: bigint;
  totalFundRaisingB: bigint;
  configId: string;
  platformId: string;
  mintA: string;
  mintB: string;
  vaultA: string;
  vaultB: string;
  creator: string;
  /** realB / totalFundRaisingB, truncado a 2 decimales. Null si el objetivo es 0. */
  progressPercent: string | null;
};

function same(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < disc.length) return false;
  for (let i = 0; i < disc.length; i += 1) if (data[i] !== disc[i]) return false;
  return true;
}

function must(value: string): Uint8Array {
  const bytes = decodePubkey(value);
  if (!bytes) throw new Error(`Dirección no decodifica: ${value}`);
  return bytes;
}

export function launchlabPoolPda(mint: string, quote: string = LAUNCHLAB_WSOL): string {
  const seed = new TextEncoder().encode("pool");
  return encodeBase58(findProgramAddress([seed, must(mint), must(quote)], must(LAUNCHLAB_PROGRAM)).address);
}

export function launchlabCandidates(mint: string): string[] {
  return [launchlabPoolPda(mint, LAUNCHLAB_WSOL), launchlabPoolPda(mint, LAUNCHLAB_USD1)];
}

function compare(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < 32; i += 1) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  return 0;
}

/** CPMM: ["pool", amm_config, token_0_mint, token_1_mint], con token_0 < token_1 por bytes. */
export function cpmmPoolPda(config: string, mintA: string, mintB: string): string {
  const a = must(mintA);
  const b = must(mintB);
  const [t0, t1] = compare(a, b) < 0 ? [a, b] : [b, a];
  return encodeBase58(findProgramAddress([new TextEncoder().encode("pool"), must(config), t0, t1], must(CPMM_PROGRAM)).address);
}

export function decodeLaunchlabPool(address: string, owner: string, data: Uint8Array, expectedMint?: string): LaunchlabPool | null {
  if (owner !== LAUNCHLAB_PROGRAM || data.length < LAUNCHLAB_POOL_MIN_LEN || !same(data, LAUNCHLAB_POOL_DISCRIMINATOR)) return null;
  const statusCode = data[17] ?? 255;
  const migrate = data[20] ?? 255;
  const u = (offset: number): bigint => readU64(data, offset) ?? 0n;
  let o = 21;
  const fields = ["supply", "totalSellA", "virtualA", "virtualB", "realA", "realB", "totalFundRaisingB"] as const;
  const values: Record<string, bigint> = {};
  for (const name of fields) {
    values[name] = u(o);
    o += 8;
  }
  o += 3 * 8 + 40; // protocolFee, platformFee, migrateFee, vestingSchedule
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    keys.push(encodeBase58(data.subarray(o, o + 32)));
    o += 32;
  }
  const [configId, platformId, mintA, mintB, vaultA, vaultB, creator] = keys as [string, string, string, string, string, string, string];
  if (expectedMint && mintA !== expectedMint) return null;
  const target = values.totalFundRaisingB ?? 0n;
  const realB = values.realB ?? 0n;
  return {
    poolAddress: address,
    status: statusCode === 0 ? "en_curva" : statusCode === 1 ? "migrando" : statusCode === 2 ? "migrado" : "desconocido",
    statusCode,
    migrateType: migrate === 0 ? "amm" : migrate === 1 ? "cpmm" : "desconocido",
    decimalsA: data[18] ?? 0,
    decimalsB: data[19] ?? 0,
    supply: values.supply ?? 0n,
    totalSellA: values.totalSellA ?? 0n,
    virtualA: values.virtualA ?? 0n,
    virtualB: values.virtualB ?? 0n,
    realA: values.realA ?? 0n,
    realB,
    totalFundRaisingB: target,
    configId,
    platformId,
    mintA,
    mintB,
    vaultA,
    vaultB,
    creator,
    progressPercent: target > 0n ? percentTruncated(realB, target, 2) : null,
  };
}

export function decodePlatformCpConfig(owner: string, data: Uint8Array): string | null {
  if (owner !== LAUNCHLAB_PROGRAM || !same(data, LAUNCHLAB_PLATFORM_DISCRIMINATOR) || data.length < PLATFORM_CP_CONFIG_OFFSET + 32) return null;
  return encodeBase58(data.subarray(PLATFORM_CP_CONFIG_OFFSET, PLATFORM_CP_CONFIG_OFFSET + 32));
}

/** CPMM PoolState: token_0_mint en 168 y token_1_mint en 200. */
export function cpmmPoolHoldsMints(owner: string, data: Uint8Array, mintA: string, mintB: string): boolean {
  if (owner !== CPMM_PROGRAM || data.length < 232) return false;
  const t0 = encodeBase58(data.subarray(168, 200));
  const t1 = encodeBase58(data.subarray(200, 232));
  return (t0 === mintA && t1 === mintB) || (t0 === mintB && t1 === mintA);
}

export function quoteSymbol(mintB: string): string {
  if (mintB === LAUNCHLAB_WSOL) return "SOL";
  if (mintB === LAUNCHLAB_USD1) return "USD1";
  return mintB;
}

type Account = { owner: string; data: Uint8Array } | null;
type MultiReader = (addresses: readonly string[]) => Promise<{ ok: boolean; value?: Account[] | null }>;

export type LaunchlabReading = {
  pool: LaunchlabPool;
  /** Pool de Raydium al que migró, comprobado en la cadena. Null si no se localizó o no aplica. */
  migratedPool: string | null;
  migratedProgram: string | null;
  migratedNote: "localizado" | "no_localizado" | "amm_v4_no_derivable" | "no_aplica";
};

/** Lee los dos candidatos (SOL y USD1) y, si migró a CPMM, localiza el pool. Null si no hay curva o falla la lectura. */
export async function readLaunchlab(mint: string, read: MultiReader): Promise<{ ok: boolean; reading: LaunchlabReading | null }> {
  const candidates = launchlabCandidates(mint);
  const first = await read(candidates);
  if (!first.ok || !Array.isArray(first.value)) return { ok: false, reading: null };
  let pool: LaunchlabPool | null = null;
  for (let index = 0; index < candidates.length && !pool; index += 1) {
    const account = first.value[index];
    if (account) pool = decodeLaunchlabPool(candidates[index] as string, account.owner, account.data, mint);
  }
  if (!pool) return { ok: true, reading: null };
  return { ok: true, reading: await locateMigration(pool, read) };
}

export async function locateMigration(pool: LaunchlabPool, read: MultiReader): Promise<LaunchlabReading> {
  if (pool.status !== "migrado") return { pool, migratedPool: null, migratedProgram: null, migratedNote: "no_aplica" };
  if (pool.migrateType !== "cpmm") return { pool, migratedPool: null, migratedProgram: null, migratedNote: "amm_v4_no_derivable" };
  const configs = [CPMM_DEFAULT_CONFIG];
  const platform = await read([pool.platformId]);
  const platformAccount = platform.ok && Array.isArray(platform.value) ? platform.value[0] : null;
  const cp = platformAccount ? decodePlatformCpConfig(platformAccount.owner, platformAccount.data) : null;
  if (cp && !configs.includes(cp)) configs.push(cp);
  const pdas = configs.map((config) => cpmmPoolPda(config, pool.mintA, pool.mintB));
  const found = await read(pdas);
  if (found.ok && Array.isArray(found.value)) {
    for (let i = 0; i < pdas.length; i += 1) {
      const account = found.value[i];
      if (account && cpmmPoolHoldsMints(account.owner, account.data, pool.mintA, pool.mintB)) {
        return { pool, migratedPool: pdas[i] as string, migratedProgram: CPMM_PROGRAM, migratedNote: "localizado" };
      }
    }
  }
  return { pool, migratedPool: null, migratedProgram: null, migratedNote: "no_localizado" };
}
