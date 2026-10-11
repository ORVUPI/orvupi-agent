import { encodeBase58, isZeroPubkey } from "./base58.js";
import { readU16, readU32, readU64 } from "./bytes.js";
import { ACCOUNT_BASE_LEN, MINT_BASE_LEN, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./programs.js";
import type { AuthorityValue, ExtensionReport } from "./types.js";

export type DecodedMint = {
  standard: "spl-token" | "token-2022";
  supplyRaw: bigint;
  decimals: number;
  initialized: boolean;
  mintAuthority: AuthorityValue;
  freezeAuthority: AuthorityValue;
  extensions: ExtensionReport[];
  extensionsParsed: boolean;
  tokenMetadata: {
    updateAuthority: string | null;
    name: string;
    symbol: string;
    uri: string;
    additional: Array<{ key: string; value: string }>;
  } | null;
  metadataPointer: {
    authority: string | null;
    address: string | null;
  } | null;
};

const EXTENSION_NAMES: Record<number, string> = {
  0: "Uninitialized",
  1: "TransferFeeConfig",
  2: "TransferFeeAmount",
  3: "MintCloseAuthority",
  4: "ConfidentialTransferMint",
  5: "ConfidentialTransferAccount",
  6: "DefaultAccountState",
  7: "ImmutableOwner",
  8: "MemoTransfer",
  9: "NonTransferable",
  10: "InterestBearingConfig",
  11: "CpiGuard",
  12: "PermanentDelegate",
  13: "NonTransferableAccount",
  14: "TransferHook",
  15: "TransferHookAccount",
  16: "ConfidentialTransferFeeConfig",
  17: "ConfidentialTransferFeeAmount",
  18: "MetadataPointer",
  19: "TokenMetadata",
  20: "GroupPointer",
  21: "TokenGroup",
  22: "GroupMemberPointer",
  23: "TokenGroupMember",
  24: "ConfidentialMintBurn",
  25: "ScaledUiAmount",
  26: "Pausable",
  27: "PausableAccount",
};

const SUPPORTED = new Set([1, 3, 6, 9, 12, 14, 18, 19]);

export function decodeMint(owner: string, data: Uint8Array): DecodedMint | null {
  if (owner !== TOKEN_PROGRAM && owner !== TOKEN_2022_PROGRAM) {
    return null;
  }
  if (data.length < MINT_BASE_LEN) {
    return null;
  }
  const mintAuthority = readCOption(data, 0);
  const supplyRaw = readU64(data, 36);
  const decimals = data[44];
  const initialized = data[45] === 1;
  const freezeAuthority = readCOption(data, 46);
  if (!mintAuthority || supplyRaw === null || decimals === undefined || !freezeAuthority) {
    return null;
  }
  const standard = owner === TOKEN_2022_PROGRAM ? "token-2022" : "spl-token";
  const base: DecodedMint = {
    standard,
    supplyRaw,
    decimals,
    initialized,
    mintAuthority,
    freezeAuthority,
    extensions: [],
    extensionsParsed: standard === "spl-token",
    tokenMetadata: null,
    metadataPointer: null,
  };
  if (standard === "spl-token") {
    base.extensionsParsed = data.length === MINT_BASE_LEN;
    return base;
  }
  if (data.length === MINT_BASE_LEN) {
    base.extensionsParsed = true;
    return base;
  }
  if (data.length <= ACCOUNT_BASE_LEN || data[ACCOUNT_BASE_LEN] !== 1) {
    base.extensionsParsed = false;
    return base;
  }
  for (let i = MINT_BASE_LEN; i < ACCOUNT_BASE_LEN; i += 1) {
    if (data[i] !== 0) {
      base.extensionsParsed = false;
      return base;
    }
  }
  const tlv = parseTlv(data.subarray(ACCOUNT_BASE_LEN + 1));
  base.extensionsParsed = tlv.ok;
  base.extensions = tlv.extensions;
  base.tokenMetadata = tlv.tokenMetadata;
  base.metadataPointer = tlv.metadataPointer;
  return base;
}

function readCOption(data: Uint8Array, offset: number): AuthorityValue | null {
  const tag = readU32(data, offset);
  if (tag === null || offset + 36 > data.length) {
    return null;
  }
  const pubkey = data.subarray(offset + 4, offset + 36);
  if (tag === 0) {
    return { state: "revocada", address: null };
  }
  if (tag === 1) {
    return { state: "activa", address: encodeBase58(pubkey) };
  }
  return { state: "no_decodificable", address: null };
}

function parseTlv(tlv: Uint8Array): {
  ok: boolean;
  extensions: ExtensionReport[];
  tokenMetadata: DecodedMint["tokenMetadata"];
  metadataPointer: DecodedMint["metadataPointer"];
} {
  const extensions: ExtensionReport[] = [];
  let tokenMetadata: DecodedMint["tokenMetadata"] = null;
  let metadataPointer: DecodedMint["metadataPointer"] = null;
  let offset = 0;
  const done = (ok: boolean) => ({ ok, extensions, tokenMetadata, metadataPointer });
  while (offset < tlv.length) {
    if (offset + 2 > tlv.length) {
      return done(true);
    }
    const type = readU16(tlv, offset);
    if (type === null) {
      return done(false);
    }
    if (type === 0) {
      return done(true);
    }
    if (offset + 4 > tlv.length) {
      return done(false);
    }
    const length = readU16(tlv, offset + 2);
    if (length === null || offset + 4 + length > tlv.length) {
      return done(false);
    }
    const value = tlv.subarray(offset + 4, offset + 4 + length);
    const name = EXTENSION_NAMES[type] ?? `tipo ${type}`;
    const supported = SUPPORTED.has(type);
    const decoded = decodeExtension(type, value);
    if (type === 19 && decoded.metadata) {
      tokenMetadata = decoded.metadata;
    }
    if (type === 18 && decoded.pointer) {
      metadataPointer = decoded.pointer;
    }
    extensions.push({
      type,
      name,
      supported,
      decoded: decoded.ok,
      summary: decoded.summary,
    });
    offset += 4 + length;
  }
  return done(true);
}

function decodeExtension(type: number, value: Uint8Array): {
  ok: boolean;
  summary: string | null;
  metadata: DecodedMint["tokenMetadata"];
  pointer: DecodedMint["metadataPointer"];
} {
  if (type === 18 && value.length === 64) {
    const authority = optionalPubkey(value.subarray(0, 32));
    const address = optionalPubkey(value.subarray(32, 64));
    return {
      ok: true,
      summary: `autoridad ${authority ?? "ausente"}; metadatos en ${address ?? "ausente"}`,
      metadata: null,
      pointer: { authority, address },
    };
  }
  if (type === 19) {
    const metadata = readTokenMetadata(value);
    if (!metadata) {
      return { ok: false, summary: "TokenMetadata presente, longitud no decodificada", metadata: null, pointer: null };
    }
    return {
      ok: true,
      summary: `nombre ${metadata.name}; símbolo ${metadata.symbol}; autoridad ${metadata.updateAuthority ?? "ausente"}`,
      metadata,
      pointer: null,
    };
  }
  if (type === 3 && value.length === 32) {
    return { ok: true, summary: `autoridad de cierre ${optionalPubkey(value) ?? "ausente"}`, metadata: null, pointer: null };
  }
  if (type === 12 && value.length === 32) {
    return { ok: true, summary: `delegado permanente ${optionalPubkey(value) ?? "ausente"}`, metadata: null, pointer: null };
  }
  if (type === 9 && value.length === 0) {
    return { ok: true, summary: "el mint está marcado como no transferible", metadata: null, pointer: null };
  }
  if (type === 6 && value.length === 1) {
    const state = value[0];
    const label = state === 0 ? "uninitialized" : state === 1 ? "initialized" : state === 2 ? "frozen" : `desconocido (${state})`;
    return { ok: true, summary: `estado por defecto ${label}`, metadata: null, pointer: null };
  }
  if (type === 14 && value.length === 64) {
    return {
      ok: true,
      summary: `autoridad ${optionalPubkey(value.subarray(0, 32)) ?? "ausente"}; programa ${optionalPubkey(value.subarray(32, 64)) ?? "ausente"}`,
      metadata: null,
      pointer: null,
    };
  }
  if (type === 1 && value.length === 108) {
    const olderBps = readU16(value, 32 + 32 + 8 + 16);
    const newerBps = readU16(value, 32 + 32 + 8 + 18 + 16);
    return {
      ok: true,
      summary: `comisión de transferencia (puntos básicos) anterior ${olderBps ?? "?"} y nueva ${newerBps ?? "?"}`,
      metadata: null,
      pointer: null,
    };
  }
  if (SUPPORTED.has(type)) {
    return { ok: false, summary: `${EXTENSION_NAMES[type] ?? type}: longitud ${value.length} no esperada`, metadata: null, pointer: null };
  }
  return { ok: false, summary: null, metadata: null, pointer: null };
}

function optionalPubkey(bytes: Uint8Array): string | null {
  if (bytes.length !== 32 || isZeroPubkey(bytes)) {
    return null;
  }
  return encodeBase58(bytes);
}

function readTokenMetadata(value: Uint8Array): DecodedMint["tokenMetadata"] {
  if (value.length < 64) {
    return null;
  }
  const updateAuthority = optionalPubkey(value.subarray(0, 32));
  let offset = 64;
  const name = readBorshString(value, offset);
  if (!name) {
    return null;
  }
  offset = name.next;
  const symbol = readBorshString(value, offset);
  if (!symbol) {
    return null;
  }
  offset = symbol.next;
  const uri = readBorshString(value, offset);
  if (!uri) {
    return null;
  }
  offset = uri.next;
  const additional: Array<{ key: string; value: string }> = [];
  if (offset + 4 <= value.length) {
    const count = readU32(value, offset);
    offset += 4;
    if (count === null || count > 64) {
      return null;
    }
    for (let i = 0; i < count; i += 1) {
      const key = readBorshString(value, offset);
      if (!key) {
        return null;
      }
      offset = key.next;
      const extra = readBorshString(value, offset);
      if (!extra) {
        return null;
      }
      offset = extra.next;
      additional.push({ key: key.text, value: extra.text });
    }
  }
  return {
    updateAuthority,
    name: cleanText(name.text),
    symbol: cleanText(symbol.text),
    uri: cleanText(uri.text),
    additional,
  };
}

export function readBorshString(data: Uint8Array, offset: number): { text: string; next: number } | null {
  const length = readU32(data, offset);
  if (length === null || offset + 4 + length > data.length) {
    return null;
  }
  const text = new TextDecoder().decode(data.subarray(offset + 4, offset + 4 + length));
  return { text, next: offset + 4 + length };
}

export function cleanText(value: string): string {
  const withoutPadding = value.replace(/\0+$/u, "");
  return withoutPadding.replace(/[\0\p{Cc}\p{Cf}]/gu, "\uFFFD").replace(/\uFFFD+/g, "\uFFFD").trim();
}

/** Un URI vacío, de espacios o de relleno nulo no es un enlace. */
export function metadataLink(value: string | null | undefined): string {
  return cleanText(value ?? "").replace(/\uFFFD/g, "").trim();
}

export function readTokenAccount(data: Uint8Array): { mint: string; owner: string; amount: bigint } | null {
  if (data.length < 72) {
    return null;
  }
  const amount = readU64(data, 64);
  if (amount === null) {
    return null;
  }
  return {
    mint: encodeBase58(data.subarray(0, 32)),
    owner: encodeBase58(data.subarray(32, 64)),
    amount,
  };
}
