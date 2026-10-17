import { formatUnitsLocale, percentTruncated } from "./bytes.js";
import { FallbackRpc, classifyRpcFailure } from "./fallback.js";
import { validateMint } from "./input.js";
import { compareCanonical, normalizeToken } from "./impersonation.js";
import { decodeMetaplex } from "./metadata.js";
import { decodeMint, metadataLink, readTokenAccount } from "./mint.js";
import {
  ACCOUNT_BASE_LEN,
  MINT_BASE_LEN,
  PUMP_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  associatedTokenAddress,
  bondingCurvePda,
  metadataPda,
} from "./programs.js";
import { decodeBondingCurve } from "./pump.js";
import { RpcClient, type AccountInfo, type ChainReader, type RpcResult, type RpcTransport, type TokenAmount } from "./rpc.js";
import type { CanonicalToken, ExtensionReport } from "./types.js";

/** Solo para comparar con «orvupi»: también con leet (0→o; 1, l, | y ! → i), como «0RVUP1» u «ORVUPl». */
export function namesProject(value: string): boolean {
  const folded = normalizeToken(value);
  return folded.includes("orvupi") || folded.replace(/0/g, "o").replace(/[1l|!]/g, "i").includes("orvupi");
}

const NAMED_LIKE_PROJECT = {
  es: "Se llama como ORVUPI, pero no es la dirección oficial",
  en: "It is named like ORVUPI, but it is not the official address",
};

export type Localized = { es: string; en: string };

export type SignalLevel = "ok" | "atencion" | "riesgo" | "neutro";

export type Signal = {
  id: string;
  level: SignalLevel;
  title: Localized;
  explain: Localized;
  tone?: "ajeno";
};

export type ReadSource = { dato: Localized; host: string };

// Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU (web/v2/shared/orvupi-contract.json).

export type LiveRow = { label: Localized; value: Localized };

export const AUDIT_NOTICE: Localized = {
  es: "Lectura en directo de datos públicos de la blockchain. No es una auditoría, ni una recomendación, ni un aval. ORVUPI no tiene relación con este token. Que no aparezcan señales no significa que esté todo comprobado.",
  en: "Live reading of public blockchain data. It is not an audit, a recommendation, or an endorsement. ORVUPI has no relationship with this token. No signals showing does not mean everything was checked.",
};

export const PRIVACY_NOTICE: Localized = {
  es: "La lectura es directa y solo en lectura.",
  en: "The read is live and read-only.",
};

export type FactState = "ok" | "ausente" | "fallo" | "no_consultado" | "no_aplica";

const CURVE_NOT_ON_PUMP: Localized = {
  es: "No aplica: este token no se creó en Pump.fun",
  en: "Not applicable: this token was not created on Pump.fun",
};

export type ReadingFact = { id: string; label: Localized; state: FactState };

export type LiveReading = {
  ok: boolean;
  kind: "lectura" | "limite" | "tiempo" | "red" | "invalida";
  mint: string | null;
  light: "ok" | "riesgo" | "atencion" | "neutro" | "espera";
  lightLabel: Localized;
  title: Localized;
  support: Localized;
  signals: Signal[];
  rows: LiveRow[];
  endpointHost: string | null;
  usedFallback: boolean;
  slot: number | null;
  fetchedAt: string | null;
  sources: ReadSource[];
  canSample: boolean;
  facts?: ReadingFact[];
  missing?: Localized;
  missingState?: "ok" | "falta";
  absent?: Localized;
  identity?: Localized | null;
  report?: Localized;
  shown?: Record<string, unknown> | null;
};

export type ReadMintInput = {
  mint: string;
  registry: readonly CanonicalToken[];
  endpoints: readonly string[];
  transport?: RpcTransport;
  timeoutMs?: number;
  maxRetries?: number;
  minIntervalMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  signal?: AbortSignal;
};

export function loadingView(mint: string | null): LiveReading {
  return {
    ok: false,
    kind: "lectura",
    mint,
    light: "espera",
    lightLabel: { es: "Leyendo", en: "Reading" },
    title: { es: "Leyendo la cadena…", en: "Reading the chain…" },
    support: PRIVACY_NOTICE,
    signals: [],
    rows: [],
    endpointHost: null,
    usedFallback: false,
    slot: null,
    fetchedAt: null,
    sources: [],
    canSample: false,
  };
}

function loc(es: string, en: string): Localized {
  return { es, en };
}

function blank(kind: LiveReading["kind"], mint: string | null, title: Localized, support: Localized): LiveReading {
  return {
    ok: false,
    kind,
    mint,
    light: "neutro",
    lightLabel: loc("No se pudo leer", "Could not be read"),
    title,
    support,
    signals: [],
    rows: [],
    endpointHost: null,
    usedFallback: false,
    slot: null,
    fetchedAt: null,
    sources: [],
    canSample: false,
  };
}

export function takeQuerySlot(
  stamps: readonly number[],
  now: number,
  limit = 6,
  windowMs = 60_000,
): { allowed: boolean; stamps: number[] } {
  const fresh = stamps.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= limit) {
    return { allowed: false, stamps: fresh };
  }
  return { allowed: true, stamps: [...fresh, now] };
}

export function readCache<T>(
  cache: ReadonlyMap<string, { at: number; value: T }>,
  key: string,
  now: number,
  ttlMs = 60_000,
): T | null {
  const hit = cache.get(key);
  if (!hit || now - hit.at >= ttlMs) {
    return null;
  }
  return hit.value;
}

const SERVICE_ES = "El servicio público no respondió, prueba otra vez en un minuto.";
const SERVICE_EN = "The public service did not respond, try again in a minute.";

function failureReading(kind: "limite" | "tiempo" | "red", mint: string, host: string | null, usedFallback: boolean): LiveReading {
  const checked = loc("No se pudo comprobar", "Could not be checked");
  const copy = {
    limite: {
      title: checked,
      support: loc(
        `El servicio público de lectura ha llegado al límite de peticiones. ${SERVICE_ES} No se ha inventado un resultado.`,
        `The public read service has hit its request limit. ${SERVICE_EN} No result was invented.`,
      ),
    },
    tiempo: {
      title: checked,
      support: loc(
        `Se agotó el tiempo de espera del servicio de lectura. ${SERVICE_ES} No se ha inventado un resultado.`,
        `The read service timed out. ${SERVICE_EN} No result was invented.`,
      ),
    },
    red: {
      title: checked,
      support: loc(
        `No se pudo comprobar: el servicio no respondió o rechazó la petición. ${SERVICE_ES} No se ha inventado un resultado.`,
        `It could not be checked: the service did not respond or refused the request. ${SERVICE_EN} No result was invented.`,
      ),
    },
  }[kind];
  const facts: ReadingFact[] = [
    { id: "suministro", label: loc("Suministro", "Supply"), state: "fallo" },
    { id: "decimales", label: loc("Decimales", "Decimals"), state: "fallo" },
    { id: "cuentas", label: loc("Cuentas con más tokens", "Largest token accounts"), state: "fallo" },
  ];
  const grouped = groupFacts(facts);
  return {
    ...blank(kind, mint, copy.title, copy.support),
    lightLabel: loc("No se pudo comprobar", "Could not be checked"),
    endpointHost: host,
    usedFallback,
    facts,
    missing: grouped.missing,
    missingState: grouped.missingState,
  };
}

function hostOf(endpoint: string): string | null {
  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
}

function sourceRows(rpc: FallbackRpc): ReadSource[] {
  const labels: Record<string, Localized> = {
    getMultipleAccounts: loc("Cuentas leídas", "Accounts read"),
    getTokenSupply: loc("Suministro leído", "Supply read"),
    getTokenLargestAccounts: loc("Muestra de cuentas", "Account sample"),
    getAccountInfo: loc("Cuenta leída", "Account read"),
    getSlot: loc("Slot", "Slot"),
  };
  return rpc.reads.map((read) => ({
    dato: labels[read.method] ?? loc("Otra lectura", "Other read"),
    host: hostOf(read.endpoint) ?? read.endpoint,
  }));
}

function madridClock(iso: string): Localized {
  const date = new Date(iso);
  const format = (lang: "es" | "en") =>
    new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date).replace(/[\u202f\u00a0]/g, " ");
  return loc(format("es"), format("en"));
}

function sourceClock(iso: string, slot: number | null, rpc: FallbackRpc): LiveRow[] {
  const sources = sourceRows(rpc);
  const hosts = [...new Set(sources.map((item) => item.host))];
  const when = madridClock(iso);
  const rows: LiveRow[] = [
    {
      label: loc("Momento", "Time"),
      value: loc(
        slot === null ? `Leído a las ${when.es} (Madrid).` : `Leído en el slot ${slot}, a las ${when.es} (Madrid).`,
        slot === null ? `Read at ${when.en} (Madrid).` : `Read at slot ${slot}, at ${when.en} (Madrid).`,
      ),
    },
  ];
  for (const source of sources) {
    rows.push({ label: source.dato, value: loc(source.host, source.host) });
  }
  if (hosts.length > 1) {
    rows.push({
      label: loc("Servicios", "Services"),
      value: loc("Esta lectura junta más de un servicio.", "This reading combines more than one service."),
    });
  }
  return rows;
}

export function clipForeign(value: string, official: boolean): string {
  const missing = "Sin nombre en las fuentes leídas";
  if (official) {
    return value || missing;
  }
  const raw = value || missing;
  const cut = raw.length > 64 ? `${raw.slice(0, 64)}…` : raw;
  return `«${cut}»`;
}

function isMintAccount(owner: string, data: Uint8Array): boolean {
  if (owner === TOKEN_PROGRAM) {
    return data.length === MINT_BASE_LEN;
  }
  if (owner !== TOKEN_2022_PROGRAM) {
    return false;
  }
  if (data.length === MINT_BASE_LEN) {
    return true;
  }
  return data.length > ACCOUNT_BASE_LEN && data[ACCOUNT_BASE_LEN] === 1;
}

function rememberSlot(result: { ok: boolean; slot?: number | null }, slots: Set<number>): void {
  if (result.ok && typeof result.slot === "number") {
    slots.add(result.slot);
  }
}

export async function readAnyMint(input: ReadMintInput): Promise<LiveReading> {
  const checked = validateMint(input.mint.trim());
  if (!checked.ok) {
    return blank(
      "invalida",
      null,
      loc("Esta dirección no es válida", "This address is not valid"),
      loc(
        "Tiene que ser la dirección completa de un token de Solana, sin el nombre del token y sin texto alrededor.",
        "It has to be the full address of a Solana token, without the token name and without surrounding text.",
      ),
    );
  }
  const endpoints = input.endpoints.map((item) => item.trim()).filter((item) => item.length > 0);
  if (endpoints.length === 0) {
    return failureReading("red", checked.mint, null, false);
  }
  const readers = endpoints.map(
    (endpoint) =>
      new RpcClient({
        endpoint,
        transport: input.transport,
        timeoutMs: input.timeoutMs ?? 8000,
        maxRetries: input.maxRetries ?? 0,
        minIntervalMs: input.minIntervalMs ?? 200,
        now: input.now,
        sleep: input.sleep,
        random: input.random,
        signal: input.signal,
      }),
  );
  const rpc = new FallbackRpc(readers, endpoints);
  return readWith(checked.mint, input.registry, rpc, input);
}

export async function readLargestAccounts(input: ReadMintInput): Promise<Signal> {
  const checked = validateMint(input.mint.trim());
  if (!checked.ok) {
    return {
      id: "cuentas",
      level: "atencion",
      title: loc("No se pudo comprobar", "Could not be checked"),
      explain: loc(
        "La dirección no es la de un token válido. No se ha pedido la muestra.",
        "The address is not a valid token address. The sample was not requested.",
      ),
    };
  }
  const endpoints = input.endpoints.map((item) => item.trim()).filter((item) => item.length > 0);
  if (endpoints.length === 0) {
    return emptySample();
  }
  const readers = endpoints.map(
    (endpoint) =>
      new RpcClient({
        endpoint,
        transport: input.transport,
        timeoutMs: input.timeoutMs ?? 6000,
        maxRetries: input.maxRetries ?? 0,
        minIntervalMs: input.minIntervalMs ?? 200,
        now: input.now,
        sleep: input.sleep,
        random: input.random,
        signal: input.signal,
      }),
  );
  const rpc = new FallbackRpc(readers, endpoints);
  const largest = await mainnetOnlyClient(input, input.timeoutMs ?? 6000).getTokenLargestAccounts(checked.mint);
  if (largest.ok && largest.value.length === 0) {
    return emptyLargestSignal();
  }
  if (!largest.ok) {
    const kind = classifyRpcFailure(largest.error, largest.httpStatus);
    const text = {
      limite: loc(
        `No se pudo comprobar. El servicio llegó al límite al pedir las cuentas más grandes. ${SERVICE_ES} No es una concentración de cero.`,
        `It could not be checked. The service hit its limit while asking for the largest accounts. ${SERVICE_EN} It is not zero concentration.`,
      ),
      tiempo: loc(
        `No se pudo comprobar. Se agotó el tiempo de 6 segundos al pedir las cuentas más grandes. ${SERVICE_ES} No es una concentración de cero.`,
        `It could not be checked. The 6 second wait ran out while asking for the largest accounts. ${SERVICE_EN} It is not zero concentration.`,
      ),
      red: loc(
        `No se pudo comprobar. El servicio no devolvió las cuentas más grandes. ${SERVICE_ES} No es una concentración de cero.`,
        `It could not be checked. The service did not return the largest accounts. ${SERVICE_EN} It is not zero concentration.`,
      ),
    }[kind];
    return { id: "cuentas", level: "atencion", title: loc("No se pudo comprobar", "Could not be checked"), explain: text };
  }
  const info = await rpc.getAccountInfo(checked.mint);
  const program = info.ok && info.value ? info.value.owner : TOKEN_PROGRAM;
  const sample = await accountSample(rpc, checked.mint, program, bondingCurvePda(checked.mint), largest, null);
  return sample.signal;
}

// Mint, metadatos y curva salen en un solo getMultipleAccounts.
// El suministro y las cuentas grandes van después, de una en una: un 429
// se reintenta una vez con espera; un 403 no se repite en el mismo nodo.
const OPTIONAL_SUPPLY_URL = "https://api.mainnet-beta.solana.com";

function mainnetOnlyClient(input: ReadMintInput, timeoutMs: number): RpcClient {
  return new RpcClient({
    endpoint: OPTIONAL_SUPPLY_URL,
    transport: input.transport,
    timeoutMs,
    maxRetries: input.maxRetries ?? 0,
    minIntervalMs: input.minIntervalMs ?? 200,
    now: input.now,
    sleep: input.sleep,
    random: input.random,
    signal: input.signal,
  });
}

async function optionalMainnetSupply(mint: string, input: ReadMintInput): Promise<RpcResult<TokenAmount>> {
  // getTokenSupply en publicnode responde 403 por diseño. Un corte de red tampoco
  // prueba ese nodo: el método sigue cerrado allí.
  return mainnetOnlyClient(input, input.timeoutMs ?? 8000).getTokenSupply(mint);
}

function groupFacts(facts: ReadingFact[]): { missing: Localized; missingState: "ok" | "falta"; absent: Localized } {
  const failed = facts.filter((item) => item.state === "fallo" || item.state === "no_consultado");
  const gone = facts.filter((item) => item.state === "ausente");
  const missing = failed.length
    ? loc(
        `Faltan datos: ${failed.map((item) => item.label.es).join("; ")}. ${SERVICE_ES}`,
        `Missing data: ${failed.map((item) => item.label.en).join("; ")}. ${SERVICE_EN}`,
      )
    : loc("No falta ningún dato pedido en esta lectura.", "No requested fact is missing in this reading.");
  const absent = gone.length
    ? loc(
        `Comprobado: no existe: ${gone.map((item) => `${item.label.es}: ausente comprobado`).join("; ")}.`,
        `Confirmed: it does not exist: ${gone.map((item) => `${item.label.en}: confirmed absent`).join("; ")}.`,
      )
    : loc("", "");
  return { missing, missingState: failed.length ? "falta" : "ok", absent };
}

async function readWith(
  mint: string,
  registry: readonly CanonicalToken[],
  rpc: FallbackRpc,
  input: ReadMintInput,
): Promise<LiveReading> {
  const meta = metadataPda(mint);
  const curve = bondingCurvePda(mint);
  const packed = await rpc.getMultipleAccounts([mint, meta, curve]);
  if (!packed.ok) {
    return failureReading(classifyRpcFailure(packed.error, packed.httpStatus), mint, hostOf(rpc.lastEndpoint), rpc.usedFallback);
  }
  const slots = new Set<number>();
  rememberSlot(packed, slots);
  const mintInfo = packed.value[0] ?? null;
  const metaInfo = packed.value[1] ?? null;
  const curveInfo = packed.value[2] ?? null;
  if (!mintInfo) {
    return {
      ok: true,
      kind: "lectura",
      mint,
      light: "neutro",
      lightLabel: loc("No está", "Not found"),
      title: loc("Esta dirección no existe", "This address does not exist"),
      support: loc(
        "La red no tiene una cuenta en esa dirección. No se rellena con un token vacío.",
        "The network has no account at that address. It is not filled in as an empty token.",
      ),
      signals: [
        {
          id: "ausente",
          level: "neutro",
          title: loc("La cuenta no existe", "The account does not exist"),
          explain: loc(
            "Se pidió la cuenta y la respuesta fue vacía. No es lo mismo que un token sin permisos.",
            "The account was requested and the response was empty. That is not the same as a token with no permissions.",
          ),
        },
      ],
      rows: sourceClock(packed.fetchedAt, packed.slot, rpc),
      endpointHost: hostOf(rpc.lastEndpoint),
      usedFallback: rpc.usedFallback,
      slot: packed.slot,
      fetchedAt: packed.fetchedAt,
      sources: sourceRows(rpc),
      canSample: false,
      shown: { kind: "ausente", mint, consultedAt: packed.fetchedAt, slot: packed.slot },
      missing: loc(
        "No falta ningún dato pedido en esta lectura.",
        "No requested fact is missing in this reading.",
      ),
      missingState: "ok",
      absent: loc(
        "Comprobado: no existe: la cuenta.",
        "Confirmed: it does not exist: the account.",
      ),
      identity: loc(
        "Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.",
        "ORVUPI contract: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.",
      ),
    };
  }
  if (!isMintAccount(mintInfo.owner, mintInfo.data)) {
    const owner = mintInfo.owner;
    return {
      ok: true,
      kind: "lectura",
      mint,
      light: "atencion",
      lightLabel: loc("No es un token", "Not a token"),
      title: loc("Esta cuenta no es un token", "This account is not a token"),
      support: loc(
        "La dirección existe, pero no es un token del programa SPL Token ni del programa Token-2022. El nombre de un token no sustituye a esta comprobación.",
        "The address exists, but it is not a token of the SPL Token program or the Token-2022 program. A token name does not replace this check.",
      ),
      signals: [
        {
          id: "programa",
          level: "atencion",
          title: loc("Programa de la cuenta", "Account program"),
          explain: loc(
            `El propietario de la cuenta es ${owner}. No es el programa SPL Token ni Token-2022.`,
            `The account owner is ${owner}. It is not the SPL Token program or Token-2022.`,
          ),
        },
      ],
      rows: [
        { label: loc("Programa", "Program"), value: loc(owner, owner) },
        ...sourceClock(packed.fetchedAt, packed.slot, rpc),
      ],
      endpointHost: hostOf(rpc.lastEndpoint),
      usedFallback: rpc.usedFallback,
      slot: packed.slot,
      fetchedAt: packed.fetchedAt,
      sources: sourceRows(rpc),
      canSample: false,
      shown: { kind: "no_mint", mint, consultedAt: packed.fetchedAt, slot: packed.slot },
    };
  }
  const decoded = decodeMint(mintInfo.owner, mintInfo.data);
  if (!decoded || !decoded.initialized) {
    const unread = blank(
      "lectura",
      mint,
      loc("No se pudo leer el token", "The token could not be read"),
      loc(
        "La cuenta es del programa de tokens, pero sus bytes no se pudieron separar. No se inventan permisos.",
        "The account belongs to a token program, but its bytes could not be split. Permissions are not invented.",
      ),
    );
    return {
      ...unread,
      ok: true,
      endpointHost: hostOf(rpc.lastEndpoint),
      usedFallback: rpc.usedFallback,
      slot: packed.slot,
      shown: {
        kind: "ilegible",
        mint,
        consultedAt: packed.fetchedAt,
        slot: packed.slot,
        program: mintInfo.owner === TOKEN_2022_PROGRAM ? "token-2022" : "spl-token",
      },
    };
  }
  const supply = await optionalMainnetSupply(mint, input);
  rememberSlot(supply, slots);
  const metaplex = metaInfo ? decodeMetaplex(metaInfo.owner, metaInfo.data, mint) : null;
  const bonding = curveInfo && curveInfo.owner === PUMP_PROGRAM ? decodeBondingCurve(curveInfo.owner, curveInfo.data) : null;
  const names = [decoded.tokenMetadata?.name, metaplex?.name].filter((item): item is string => Boolean(item));
  const symbols = [decoded.tokenMetadata?.symbol, metaplex?.symbol].filter((item): item is string => Boolean(item));
  const uri = metadataLink(decoded.tokenMetadata?.uri || metaplex?.uri || "");
  const likeness = compareCanonical(
    { mint, names, symbols, imageUris: [], links: uri ? [uri] : [] },
    registry,
  );
  const signals: Signal[] = [];
  const programName = decoded.standard === "token-2022" ? "Token-2022" : "SPL Token";
  signals.push({
    id: "programa",
    level: "neutro",
    title: loc(`Programa: ${programName}`, `Program: ${programName}`),
    explain: loc(
      decoded.standard === "token-2022"
        ? "Es un token del programa Token-2022. Puede traer extensiones. Cada extensión de abajo se lee aparte."
        : "Es un token del programa SPL Token. Ese programa no trae las extensiones de Token-2022.",
      decoded.standard === "token-2022"
        ? "This is a token of the Token-2022 program. It can carry extensions. Each extension below is read on its own."
        : "This is a token of the SPL Token program. That program does not carry Token-2022 extensions.",
    ),
  });
  const supplyEs = formatUnitsLocale(decoded.supplyRaw, decoded.decimals, "es");
  const supplyEn = formatUnitsLocale(decoded.supplyRaw, decoded.decimals, "en");
  const supplyMatches =
    supply.ok && supply.value.amount === decoded.supplyRaw.toString() && supply.value.decimals === decoded.decimals;
  signals.push({
    id: "suministro",
    level: supply.ok && !supplyMatches ? "atencion" : "neutro",
    title: loc("Suministro y decimales", "Supply and decimals"),
    explain: loc(
      supply.ok
        ? supplyMatches
          ? `Hay ${supplyEs} tokens, con ${decoded.decimals} decimales, leídos de los datos del token en la cadena. La lectura extra coincide.`
          : `Los datos del token en la cadena dicen ${supplyEs} con ${decoded.decimals} decimales, y la lectura extra no coincide. Se muestra esa cifra. No se calculan porcentajes.`
        : `Hay ${supplyEs} tokens, con ${decoded.decimals} decimales, leídos de los datos del token en la cadena. ${SERVICE_ES} Eso no cambia esta cifra y no es una ausencia.`,
      supply.ok
        ? supplyMatches
          ? `There are ${supplyEn} tokens, with ${decoded.decimals} decimals, read from the token data on the chain. The extra read matches.`
          : `The token data on the chain says ${supplyEn} with ${decoded.decimals} decimals, and the extra read does not match. The figure shown is that one. Percentages are not calculated.`
        : `There are ${supplyEn} tokens, with ${decoded.decimals} decimals, read from the token data on the chain. ${SERVICE_EN} That does not change this figure and it is not an absence.`,
    ),
  });
  signals.push(authoritySignal("emision", decoded.mintAuthority, likeness.inRegistry));
  signals.push(authoritySignal("congelacion", decoded.freezeAuthority, likeness.inRegistry));
  signals.push(...extensionSignals(decoded.extensions, decoded.extensionsParsed));
  signals.push(...metadataSignals(decoded.tokenMetadata, metaplex, likeness.inRegistry));
  if ([...names, ...symbols].some((item) => item.includes("\uFFFD"))) {
    signals.push({
      id: "invisibles",
      level: "atencion",
      title: loc("Hay caracteres invisibles en el nombre", "There are invisible characters in the name"),
      explain: loc(
        "Al mostrar el nombre se marcaron caracteres de control o invisibles. La comparación con el registro los quita antes de mirar.",
        "When showing the name, control or invisible characters were marked. The comparison with the registry removes them first.",
      ),
    });
  }
  // getTokenLargestAccounts en publicnode responde 403 por diseño. Solo se pide a mainnet-beta.
  const largest = await mainnetOnlyClient(input, input.timeoutMs ?? 6000).getTokenLargestAccounts(mint);
  let largestState: FactState = "fallo";
  if (!largest.ok) {
    largestState = "fallo";
    signals.push({
      id: "cuentas",
      level: "atencion",
      title: loc("Cuentas con tokens", "Token accounts"),
      explain: loc(
        `${SERVICE_ES} No es una ausencia ni una concentración de cero.`,
        `${SERVICE_EN} It is not an absence and it is not zero concentration.`,
      ),
    });
  } else if (largest.value.length === 0) {
    // Una lista vacía no demuestra que nadie tenga tokens. USDC tiene millones de cuentas
    // y el nodo a veces responde 200 con []. Es una lectura que no salió, no una ausencia.
    largestState = "fallo";
    signals.push(emptyLargestSignal());
  } else {
    largestState = "ok";
    const sample = await accountSample(rpc, mint, mintInfo.owner, curve, largest, null);
    signals.push(sample.signal);
  }
  const curveNotOnPump = !mint.endsWith("pump") && (!curveInfo || curveInfo.owner !== PUMP_PROGRAM);
  signals.push(curveNotOnPump ? curveDoesNotApplySignal() : curveSignal(curveInfo, bonding));
  const copyByName = !likeness.inRegistry && likeness.signals.some((item) => /^nombre |^símbolo /.test(item));
  // Contrato oficial ORVUPI (Solana): Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU. Otro token que dice llamarse ORVUPI no es el oficial.
  const namedLikeProject = !likeness.inRegistry && mint !== "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU" && [...names, ...symbols].some((item) => namesProject(item));
  if (likeness.inRegistry) {
    signals.push({
      id: "registro",
      level: "ok",
      title: loc("Está en el registro curado", "It is in the curated registry"),
      explain: loc(
        "La dirección coincide con la del registro. La ficha fechada es una foto anterior. Estar en el registro no es una auditoría.",
        "The address matches the one in the registry. The dated card is an earlier snapshot. Being in the registry is not an audit.",
      ),
    });
  } else if (namedLikeProject) {
    signals.push({
      id: "copia",
      level: "atencion",
      title: loc(NAMED_LIKE_PROJECT.es, NAMED_LIKE_PROJECT.en),
      explain: loc(
        "El nombre o el símbolo dice ORVUPI. La única dirección oficial de ORVUPI está en orvupi.com/token, así que esta dirección no es la oficial. Esto no dice quién lo creó ni con qué intención.",
        "The name or the symbol says ORVUPI. The only official ORVUPI address is on orvupi.com/token, so this address is not the official one. This does not say who created it or why.",
      ),
    });
  } else if (copyByName) {
    signals.push({
      id: "copia",
      level: "atencion",
      title: loc("Se parece a un token del registro curado, pero la dirección es otra", "Looks like a token in the curated registry, but the address is different"),
      explain: loc(
        `El nombre o el símbolo se parece a un token del registro curado y la dirección es otra. Esto no dice quién lo creó ni con qué intención.`,
        `The name or the symbol looks like a token in the curated registry and the address is different. This does not say who created it or why.`,
      ),
    });
  } else if (likeness.signals.length > 0) {
      signals.push({
        id: "parecido",
        level: "atencion",
        title: loc("Hay un parecido con el registro", "There is a likeness with the registry"),
        explain: loc(
          "Un enlace u otro dato coincide con el registro y la dirección es otra. La coincidencia no dice quién lo hizo.",
          "A link or another fact matches the registry and the address is different. The match does not say who did it.",
        ),
      });
  }
  const hosts = new Set(sourceRows(rpc).map((item) => item.host));
  if (hosts.size > 1) {
    signals.push({
      id: "fuentes",
      level: "atencion",
      title: loc("Esta lectura junta más de un servicio", "This reading combines more than one service"),
      explain: loc(
        `No todos los datos salieron del mismo servicio: ${[...hosts].join(", ")}.`,
        `Not every fact came from the same service: ${[...hosts].join(", ")}.`,
      ),
    });
  }
  const risky = signals.some((item) => item.level === "riesgo");
  const attention = signals.some((item) => item.level === "atencion");
  const officialOrvupi = mint === "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";
  const headline = officialOrvupi
    ? {
        light: "ok" as const,
        lightLabel: loc("Dirección oficial de ORVUPI", "Official ORVUPI address"),
        title: loc("Dirección oficial de ORVUPI", "Official ORVUPI address"),
        support: loc(
          "Coincide con la dirección publicada en orvupi.com/token. Cada señal de abajo describe un hecho leído ahora. No es una puntuación.",
          "It matches the address published on orvupi.com/token. Each signal below describes a fact read just now. It is not a score.",
        ),
      }
    : likeness.inRegistry
    ? {
        light: risky || attention ? ("atencion" as const) : ("ok" as const),
        lightLabel: loc("En el registro", "In the registry"),
        title: loc("Esta dirección está en el registro curado", "This address is in the curated registry"),
        support: loc(
          "La lectura de ahora coincide con la dirección del registro. Las fichas fechadas siguen abajo, como foto anterior.",
          "This reading matches the address in the registry. The dated cards remain below, as an earlier snapshot.",
        ),
      }
    : {
        light: (risky ? "riesgo" : copyByName || namedLikeProject || attention ? "atencion" : "neutro") as "riesgo" | "atencion" | "neutro",
        lightLabel: namedLikeProject
          ? loc(NAMED_LIKE_PROJECT.es, NAMED_LIKE_PROJECT.en)
          : copyByName
          ? loc("Se parece a un token del registro curado, pero la dirección es otra", "Looks like a token in the curated registry, but the address is different")
          : loc(risky || attention ? "Hay señales" : "Sin esas señales", risky || attention ? "Signals found" : "Without those signals"),
        title: loc("Lectura de este token", "Reading for this token"),
        support: copyByName
          ? loc(
              "No está en el registro curado. Cada señal describe un hecho leído ahora. No es una puntuación.",
              "It is not in the curated registry. Each signal describes a fact read just now. It is not a score.",
            )
          : loc(
              "Cada señal describe un hecho leído ahora. No es una puntuación.",
              "Each signal describes a fact read just now. It is not a score.",
            ),
      };
  const quotedName = clipForeign(names[0] || "", likeness.inRegistry);
  const displayName = likeness.inRegistry || !names[0] ? quotedName : `Dice llamarse ${quotedName}`;
  const displayNameEn = likeness.inRegistry || !names[0] ? quotedName : `It says it is called ${quotedName}`;
  const displaySymbol = clipForeign(symbols[0] || "", likeness.inRegistry);
  const metadataState: FactState = !metaInfo && !decoded.tokenMetadata ? "ausente" : metaplex || decoded.tokenMetadata ? "ok" : "fallo";
  const uriState: FactState = metadataState === "fallo" ? "fallo" : uri ? "ok" : "ausente";
  const facts: ReadingFact[] = [
    { id: "suministro", label: loc("Suministro en los bytes del mint", "Supply in the mint bytes"), state: "ok" },
    {
      id: "suministro-extra",
      label: loc("Consulta extra del suministro", "Extra supply query"),
      state: supply.ok ? "ok" : "fallo",
    },
    { id: "metadatos", label: loc("Metadatos", "Metadata"), state: metadataState },
    { id: "enlace", label: loc("Enlace de metadatos", "Metadata link"), state: uriState },
    { id: "cuentas", label: loc("Cuentas con más tokens", "Largest token accounts"), state: largestState },
    {
      id: "curva",
      label: loc("Curva", "Curve"),
      state: curveNotOnPump ? "no_aplica" : !curveInfo ? "ausente" : bonding ? "ok" : "fallo",
    },
  ];
  const grouped = groupFacts(facts);
  const missing = grouped.missing;
  const absent = grouped.absent;
  const identity = loc(
    likeness.inRegistry
      ? `Esta dirección (${mint}) está en el registro curado. Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.`
      : "Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.",
    likeness.inRegistry
      ? `This address (${mint}) is in the curated registry. ORVUPI contract: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.`
      : "ORVUPI contract: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU.",
  );
  const checkedEs = facts.filter((item) => item.state === "ok").map((item) => item.label.es);
  const checkedEn = facts.filter((item) => item.state === "ok").map((item) => item.label.en);
  const attentionEs = signals
    .filter((item) => item.level === "atencion" || item.level === "riesgo")
    .map((item) => item.title.es);
  const attentionEn = signals
    .filter((item) => item.level === "atencion" || item.level === "riesgo")
    .map((item) => item.title.en);
  const report = loc(
    `Qué se comprobó: ${checkedEs.length ? checkedEs.join(", ") : "ningún dato con valor leído"}. Qué requiere atención: ${attentionEs.length ? attentionEs.join(", ") : "ninguna señal de atención"}. Qué falta: ${missing.es}${absent.es ? ` Qué no existe: ${absent.es}` : ""}`,
    `What was checked: ${checkedEn.length ? checkedEn.join(", ") : "no fact with a read value"}. What needs attention: ${attentionEn.length ? attentionEn.join(", ") : "no attention signal"}. What is missing: ${missing.en}${absent.en ? ` What does not exist: ${absent.en}` : ""}`,
  );
  const metadataMutable = metadataState === "fallo"
    ? "fallo"
    : metaplex?.mutable === true || decoded.tokenMetadata?.updateAuthority
      ? "si"
      : metaplex?.mutable === false
        ? "no"
        : metadataState === "ausente"
          ? "ausente"
          : "no";
  const supplyAmount = supply.ok && /^\d+$/.test(supply.value.amount) ? supply.value.amount : null;
  const shown = {
    kind: "mint",
    mint,
    consultedAt: packed.fetchedAt,
    slot: slots.size === 1 ? ([...slots][0] ?? packed.slot) : packed.slot,
    program: decoded.standard,
    decimals: decoded.decimals,
    supplyAccount: decoded.supplyRaw.toString(),
    supplyRpc: supplyAmount,
    supplyRpcStatus: supplyAmount === null ? "fallo" : "verificado",
    mintAuthority: decoded.mintAuthority,
    freezeAuthority: decoded.freezeAuthority,
    name: names[0] ?? null,
    symbol: symbols[0] ?? null,
    uri: uri || null,
    metadataStatus: metadataState === "ok" ? "verificado" : metadataState,
    uriStatus: uriState === "ok" ? "verificado" : uriState,
    metadataMutable,
    extensions: decoded.extensions.map((item) => ({
      type: item.type,
      name: item.name,
      status: item.supported ? "verificado" : "no_soportada",
    })),
    extensionsStatus: decoded.standard === "spl-token" ? "no_aplica" : decoded.extensionsParsed ? "verificado" : "fallo",
    largestStatus: largestState === "ok" ? "ok" : largestState,
    curve: curveNotOnPump
      ? { present: false, status: "no_aplica", virtualToken: null, virtualQuote: null, realToken: null, realQuote: null, complete: null }
      : !curveInfo
      ? { present: false, status: "ausente", virtualToken: null, virtualQuote: null, realToken: null, realQuote: null, complete: null }
      : !bonding
        ? { present: null, status: "fallo", virtualToken: null, virtualQuote: null, realToken: null, realQuote: null, complete: null }
        : {
            present: true,
            status: "verificado",
            virtualToken: bonding.virtualTokenReserves.toString(),
            virtualQuote: bonding.virtualQuoteReserves.toString(),
            realToken: bonding.realTokenReserves.toString(),
            realQuote: bonding.realQuoteReserves.toString(),
            complete: bonding.complete,
          },
  };
  return {
    ok: true,
    kind: "lectura",
    mint,
    light: headline.light,
    lightLabel: headline.lightLabel,
    title: headline.title,
    support: headline.support,
    signals,
    rows: [
      { label: loc("Nombre", "Name"), value: loc(displayName, displayNameEn) },
      { label: loc("Símbolo", "Symbol"), value: loc(displaySymbol, displaySymbol) },
      { label: loc("Programa", "Program"), value: loc(programName, programName) },
      {
        label: loc("Suministro", "Supply"),
        value: loc(supplyEs, supplyEn),
      },
      { label: loc("Decimales", "Decimals"), value: loc(String(decoded.decimals), String(decoded.decimals)) },
      ...sourceClock(packed.fetchedAt, slots.size === 1 ? ([...slots][0] ?? packed.slot) : null, rpc),
    ],
    endpointHost: hostOf(rpc.lastEndpoint),
    usedFallback: rpc.usedFallback,
    slot: slots.size === 1 ? [...slots][0] ?? packed.slot : packed.slot,
    fetchedAt: packed.fetchedAt,
    sources: sourceRows(rpc),
    canSample: largestState === "fallo",
    facts,
    missing,
    missingState: grouped.missingState,
    absent,
    identity,
    report,
    shown,
  };
}

function authoritySignal(
  kind: "emision" | "congelacion",
  authority: { state: string; address: string | null },
  official: boolean,
): Signal {
  const minting = kind === "emision";
  if (authority.state === "revocada") {
    return {
      id: kind,
      level: official ? "ok" : "neutro",
      title: loc(
        minting ? "Nadie puede crear más tokens con ese permiso" : "Nadie puede congelar cuentas con ese permiso",
        minting ? "Nobody can create more tokens with that permission" : "Nobody can freeze accounts with that permission",
      ),
      explain: loc(
        minting
          ? "La autoridad de emisión está revocada en esta lectura. Eso no demuestra que el proyecto sea legítimo."
          : "La autoridad de congelación está revocada en esta lectura. Otros límites del token pueden seguir existiendo.",
        minting
          ? "The permission to create more tokens is revoked in this reading. That does not show that the project is legitimate."
          : "The freeze authority is revoked in this reading. Other limits on the token can still exist.",
      ),
    };
  }
  if (authority.state === "activa") {
    return {
      id: kind,
      level: minting ? "atencion" : "riesgo",
      title: loc(
        minting ? "Alguien puede crear más tokens" : "Alguien puede congelar cuentas",
        minting ? "Someone can create more tokens" : "Someone can freeze accounts",
      ),
      explain: loc(
        minting
          ? `La autoridad de emisión sigue asignada a ${authority.address ?? "una dirección"}. Puede aumentar el suministro. En una moneda estable eso es habitual: quien la emite añade unidades cuando entra dinero. Si un proyecto prometió un suministro fijo, el mismo permiso permite crear más. Esta lectura no dice cuál de los dos casos es.`
          : `La autoridad de congelación sigue asignada a ${authority.address ?? "una dirección"}. Puede impedir que una cuenta mueva sus tokens.`,
        minting
          ? `The permission to create more tokens is still assigned to ${authority.address ?? "an address"}. It can increase the supply. On a stablecoin that is common: the issuer adds units when money comes in. If a project promised a fixed supply, the same permission can create more. This reading does not say which of the two cases this is.`
          : `The freeze authority is still assigned to ${authority.address ?? "an address"}. It can stop an account from moving its tokens.`,
      ),
    };
  }
  return {
    id: kind,
    level: "atencion",
    title: loc(
      minting ? "La autoridad de emisión no se pudo leer" : "La autoridad de congelación no se pudo leer",
      minting ? "The permission to create more tokens could not be read" : "The freeze authority could not be read",
    ),
    explain: loc(
      "El campo no se decodifica. No se rellena como revocada.",
      "The field does not decode. It is not filled in as revoked.",
    ),
  };
}

function extensionSignals(extensions: readonly ExtensionReport[], parsed: boolean): Signal[] {
  if (!parsed) {
    return [
      {
        id: "extensiones",
        level: "atencion",
        title: loc("Extensiones no separadas", "Extensions not split"),
        explain: loc(
          "Los datos extra del token no se pudieron separar. No se afirma qué extensión falta.",
          "The extra token data could not be split. This does not claim which extension is missing.",
        ),
      },
    ];
  }
  const out: Signal[] = [];
  for (const item of extensions) {
    const signal = oneExtension(item);
    if (signal) {
      out.push(signal);
    }
  }
  if (out.length === 0) {
    out.push({
      id: "extensiones",
      level: "neutro",
      title: loc("Sin extensiones de riesgo leídas", "No risk extensions read"),
      explain: loc(
        "No apareció comisión de transferencia, delegado permanente, gancho de transferencia ni estado inicial congelado. Que no aparezcan extensiones no significa que esté todo comprobado.",
        "No transfer fee, permanent delegate, transfer hook, or frozen default state appeared. No extensions showing does not mean everything was checked.",
      ),
    });
  }
  return out;
}

function oneExtension(item: ExtensionReport): Signal | null {
  if (item.type === 1) {
    return {
      id: "comision",
      level: "riesgo",
      title: loc("Comisión de transferencia", "Transfer fee"),
      explain: loc(
        `El token puede quedarse una parte de cada envío. ${item.summary ?? "La cifra no se decodificó."}`,
        `The token can keep part of each transfer. ${item.summary ?? "The figure did not decode."}`,
      ),
    };
  }
  if (item.type === 12) {
    const absent = /ausente/.test(item.summary ?? "");
    return {
      id: "delegado",
      level: absent ? "atencion" : "riesgo",
      title: loc("Delegado permanente", "Permanent delegate"),
      explain: loc(
        absent
          ? "La extensión está en el token y la dirección leída está vacía. Conviene volver a leerla."
          : "Una dirección puede mover tokens desde otras cuentas. Eso no pide permiso a quien los tiene.",
        absent
          ? "The extension is on the token and the address that was read is empty. It is worth reading again."
          : "An address can move tokens out of other accounts. That does not ask the account that holds them.",
      ),
    };
  }
  if (item.type === 14) {
    return {
      id: "gancho",
      level: "riesgo",
      title: loc("Gancho de transferencia", "Transfer hook"),
      explain: loc(
        "Un programa puede revisar cada envío y rechazarlo. La transferencia deja de ser solo del programa de tokens.",
        "A program can inspect each transfer and reject it. The transfer is no longer only the token program’s.",
      ),
    };
  }
  if (item.type === 6) {
    const frozen = /frozen/.test(item.summary ?? "");
    const stateEs = frozen
      ? "congelado"
      : /uninitialized/.test(item.summary ?? "")
        ? "sin iniciar"
        : /initialized/.test(item.summary ?? "")
          ? "iniciado"
          : "sin detalle";
    const stateEn = frozen
      ? "frozen"
      : /uninitialized/.test(item.summary ?? "")
        ? "not started"
        : /initialized/.test(item.summary ?? "")
          ? "started"
          : "no detail";
    return {
      id: "estado-inicial",
      level: frozen ? "riesgo" : "neutro",
      title: loc(
        frozen ? "Las cuentas nuevas nacen congeladas" : "Estado inicial de las cuentas",
        frozen ? "New accounts start frozen" : "Initial account state",
      ),
      explain: loc(
        frozen
          ? "El estado por defecto es congelado. Una cuenta nueva puede no poder mover tokens hasta que alguien la descongele."
          : `Estado por defecto leído: ${stateEs}.`,
        frozen
          ? "The default state is frozen. A new account may be unable to move tokens until someone unfreezes it."
          : `Default state read: ${stateEn}.`,
      ),
    };
  }
  if (item.type === 9) {
    return {
      id: "no-transferible",
      level: "atencion",
      title: loc("Marcado como no transferible", "Marked non-transferable"),
      explain: loc(
        "El token dice que no se puede enviar. Esta lectura no prueba qué ocurre al intentarlo.",
        "The token says it cannot be sent. This reading does not prove what happens if someone tries.",
      ),
    };
  }
  if (item.type === 3) {
    return {
      id: "cierre",
      level: "atencion",
      title: loc("Alguien puede cerrar el token", "Someone can close the token"),
      explain: loc(
        item.summary ?? "Hay una autoridad de cierre.",
        item.summary ?? "There is a close authority.",
      ),
    };
  }
  if (!item.supported) {
    return {
      id: `extension-${item.type}`,
      level: "atencion",
      title: loc("Extensión no descrita", "Undescribed extension"),
      explain: loc(
        "Hay una extensión que esta lectura no describe. No se da por ausente ni por inofensiva.",
        "There is an extension this reading does not describe. It is not treated as absent or as harmless.",
      ),
    };
  }
  return null;
}

function metadataSignals(
  tokenMeta: { updateAuthority: string | null; name: string; symbol: string; uri: string } | null,
  metaplex: { updateAuthority: string; name: string; symbol: string; uri: string; mutable: boolean | null } | null,
  official: boolean,
): Signal[] {
  if (!tokenMeta && !metaplex) {
    return [
      {
        id: "metadatos",
        level: "neutro",
        title: loc("No hay metadatos en esta lectura", "There is no metadata in this reading"),
        explain: loc(
          "Se pidió la cuenta de metadatos y no estaba. No es un fallo de la consulta. El nombre puede vivir fuera de esta lectura.",
          "The metadata account was requested and it was not there. It is not a failed query. The name may live outside this reading.",
        ),
      },
    ];
  }
  const out: Signal[] = [];
  const name = tokenMeta?.name || metaplex?.name || "";
  const symbol = tokenMeta?.symbol || metaplex?.symbol || "";
  const uri = metadataLink(tokenMeta?.uri || metaplex?.uri || "");
  const visibleName = clipForeign(name, official);
  const linkEs = uri ? clipForeign(uri, official) : "No tiene enlace de metadatos";
  const linkEn = uri ? clipForeign(uri, official) : "It has no metadata link";
  const nameTitle = name
    ? official
      ? `Nombre: ${visibleName}`
      : `Nombre: Dice llamarse ${visibleName}`
    : "Nombre no leído";
  const nameTitleEn = name
    ? official
      ? `Name: ${visibleName}`
      : `Name: It says it is called ${visibleName}`
    : "Name not read";
  out.push({
    id: "metadatos",
    level: "neutro",
    tone: official ? undefined : "ajeno",
    title: loc(nameTitle, nameTitleEn),
    explain: loc(
      `Símbolo: ${symbol ? clipForeign(symbol, official) : "No está en esta lectura"}. Enlace de metadatos: ${linkEs}. El nombre es un texto. La dirección es otra cosa.`,
      `Symbol: ${symbol ? clipForeign(symbol, official) : "It is not in this reading"}. Metadata link: ${linkEn}. The name is text. The address is something else.`,
    ),
  });
  const update = tokenMeta?.updateAuthority || (metaplex ? metaplex.updateAuthority : null);
  const mutable = metaplex ? metaplex.mutable : tokenMeta?.updateAuthority ? true : null;
  const canChange = mutable === true || Boolean(tokenMeta?.updateAuthority);
  out.push({
    id: "mutable",
    level: canChange ? "atencion" : official ? "ok" : "neutro",
    title: loc(
      canChange ? "El nombre se puede cambiar" : "El nombre no se puede cambiar en las fuentes leídas",
      canChange ? "The name can be changed" : "The name cannot be changed in the sources read",
    ),
    explain: loc(
      canChange
        ? `Hay quien puede actualizar los metadatos${update ? ` (${update})` : ""}. Un nombre de hoy puede no ser el de mañana.`
        : "En las fuentes leídas no queda quien pueda cambiar los metadatos, o los metadatos ya no se pueden cambiar. Eso no demuestra legitimidad.",
      canChange
        ? `Someone can update the metadata${update ? ` (${update})` : ""}. Today’s name may not be tomorrow’s.`
        : "In the sources read there is nobody left who can change the metadata, or the metadata can no longer be changed. That does not show legitimacy.",
    ),
  });
  if (tokenMeta && metaplex && (tokenMeta.name !== metaplex.name || tokenMeta.symbol !== metaplex.symbol)) {
    out.push({
      id: "metadatos-distintos",
      level: "atencion",
      title: loc("Las dos fuentes de metadatos no coinciden", "The two metadata sources do not match"),
      explain: loc(
        "El nombre o el símbolo de Token-2022 y el de Metaplex son distintos en esta lectura.",
        "The Token-2022 name or symbol and the Metaplex one differ in this reading.",
      ),
    });
  }
  return out;
}

async function accountSample(
  rpc: ChainReader,
  mint: string,
  program: string,
  curvePda: string,
  largest: RpcResult<{ address: string; amount: string; decimals: number }[]>,
  denominator: bigint | null,
): Promise<{ signal: Signal; failure: string | null; httpStatus: number | null }> {
  if (!largest.ok) {
    return { signal: emptySample(), failure: largest.error, httpStatus: largest.httpStatus };
  }
  const rows = largest.value.slice(0, 20);
  const curveAta = associatedTokenAddress(curvePda, mint, program);
  let owners = new Map<string, string | null>();
  if (rows.length > 0) {
    const packed = await rpc.getMultipleAccounts(rows.map((row) => row.address));
    if (packed.ok) {
      owners = new Map(
        rows.map((row, index) => {
          const account = packed.value[index] ?? null;
          const decoded = account ? readTokenAccount(account.data) : null;
          return [row.address, decoded?.owner ?? null];
        }),
      );
    }
  }
  const lines = rows.map((row) => {
    const amount = BigInt(row.amount);
    const percent = denominator === null ? null : percentTruncated(amount, denominator, 2);
    const technical = curveAta !== null && row.address === curveAta;
    const label = technical ? "cuenta de la curva" : "cuenta con tokens";
    return { address: row.address, percent, label, amount };
  });
  const listed = lines
    .map((row) => `${row.percent === null ? "sin %" : `${row.percent} %`} · ${row.label} · ${row.address}`)
    .join("\n");
  const nonTechnical = lines.filter((row) => row.label !== "cuenta de la curva");
  const top = nonTechnical.reduce<{ amount: bigint; percent: string | null } | null>((best, row) => {
    if (!best || row.amount > best.amount) {
      return { amount: row.amount, percent: row.percent };
    }
    return best;
  }, null);
  const high = top?.percent !== null && top?.percent !== undefined && Number(top.percent) >= 20;
  return {
    failure: null,
    httpStatus: null,
    signal: {
      id: "cuentas",
      level: high ? "atencion" : "neutro",
      title: loc("Cuentas con tokens", "Token accounts"),
      explain: loc(
        rows.length === 0
          ? "La muestra de cuentas volvió vacía. No se leyó quién tiene más tokens. No es una ausencia de cuentas ni una concentración de cero."
          : `Se leyeron ${rows.length} cuentas con tokens, como máximo 20. No es un censo ni un recuento de personas.${
              top?.percent ? ` La mayor cuenta que no es la de la curva tiene el ${top.percent} %.` : ""
            }\n${listed}`,
        rows.length === 0
          ? "The account sample came back empty. Who holds the most tokens was not read. It is not an absence of accounts and it is not zero concentration."
          : `${rows.length} token accounts were read, 20 at most. It is not a census and it is not a count of people.${
              top?.percent ? ` The largest account that is not the curve account has ${top.percent}%.` : ""
            }\n${listed}`,
      ),
    },
  };
}

function emptyLargestSignal(): Signal {
  return {
    id: "cuentas",
    level: "atencion",
    title: loc("Cuentas con tokens", "Token accounts"),
    explain: loc(
      "La muestra de cuentas volvió vacía. No se leyó quién tiene más tokens. No es una ausencia de cuentas ni una concentración de cero.",
      "The account sample came back empty. Who holds the most tokens was not read. It is not an absence of accounts and it is not zero concentration.",
    ),
  };
}

function emptySample(): Signal {
  return {
    id: "cuentas",
    level: "atencion",
    title: loc("Cuentas con tokens", "Token accounts"),
    explain: loc(
      "No se pudo leer la muestra. No es una concentración de cero.",
      "The sample could not be read. It is not zero concentration.",
    ),
  };
}

function curveDoesNotApplySignal(): Signal {
  return {
    id: "curva",
    level: "neutro",
    title: loc("Curva", "Curve"),
    explain: CURVE_NOT_ON_PUMP,
  };
}

function curveSignal(account: AccountInfo | null, curve: ReturnType<typeof decodeBondingCurve>): Signal {
  if (!account) {
    return {
      id: "curva",
      level: "neutro",
      title: loc("Sin curva de Pump.fun", "No Pump.fun curve"),
      explain: loc(
        "No hay cuenta en la dirección derivada de la curva. No se rellenan con cero la cantidad real ni la cantidad virtual.",
        "There is no account at the derived curve address. The real amount and the virtual amount are not filled in with zero.",
      ),
    };
  }
  if (!curve) {
    return {
      id: "curva",
      level: "neutro",
      title: loc("No es una curva de Pump.fun", "Not a Pump.fun curve"),
      explain: loc(
        "La dirección derivada tiene una cuenta cuyo propietario no es el programa de la curva, o los bytes no encajan. No se rellena con cero.",
        "The derived address has an account whose owner is not the curve program, or the bytes do not fit. It is not filled in with zero.",
      ),
    };
  }
  const real = curve.realTokenReserves.toString();
  const virtual = curve.virtualTokenReserves.toString();
  const progress = curve.progressPercent === null ? "" : ` Avance inferido de la curva clásica: ${curve.progressPercent} %.`;
  if (curve.complete) {
    return {
      id: "curva",
      level: "neutro",
      title: loc("La curva figura como completada", "The curve is marked complete"),
      explain: loc(
        `El campo complete es verdadero. Cantidad real de la curva: ${real}. Cantidad virtual de la curva: ${virtual}. Esta lectura no mira el mercado posterior.`,
        `The complete field is true. Real curve amount: ${real}. Virtual curve amount: ${virtual}. This reading does not look at the later market.`,
      ),
    };
  }
  return {
    id: "curva",
    level: "neutro",
    title: loc("Curva de Pump.fun abierta", "Pump.fun curve still open"),
    explain: loc(
      `La curva sigue abierta. Cantidad real de la curva: ${real}. Cantidad virtual de la curva: ${virtual}.${progress}`,
      `The curve is still open. Real curve amount: ${real}. Virtual curve amount: ${virtual}.${progress ? ` Inferred classic-curve progress: ${curve.progressPercent}%.` : ""}`,
    ),
  };
}
