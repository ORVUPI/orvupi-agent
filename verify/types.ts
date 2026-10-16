export const DISCLAIMER =
  "ORVUPI Verify muestra datos on-chain públicos. No garantiza que un token sea seguro.";

export const RULES_VERSION = "0.1.0";

export const LEGITIMACY_LIMIT =
  "No es una auditoría ni una recomendación. Que no haya autoridad de congelación reduce ese permiso concreto; no demuestra que el proyecto sea legítimo.";

export type FieldStatus = "verificado" | "inferido" | "no_disponible" | "no_aplica";

export type FindingLevel = "ok" | "atención" | "riesgo";

export type Source = {
  method: string;
  account: string | null;
  slot: number | null;
  fetchedAt: string;
  detail: string | null;
};

export type Field = {
  readonly value: unknown;
  readonly unit: string | null;
  readonly status: FieldStatus;
  readonly source: Source | null;
  readonly note: string | null;
};

export function field(input: {
  value: unknown;
  status: FieldStatus;
  unit?: string | null;
  source?: Source | null;
  note?: string | null;
}): Field {
  return {
    value: input.value,
    unit: input.unit ?? null,
    status: input.status,
    source: input.source ?? null,
    note: input.note ?? null,
  };
}

export type AuthorityState = "activa" | "revocada" | "no_decodificable";

export type AuthorityValue = {
  state: AuthorityState;
  address: string | null;
};

export type ExtensionReport = {
  type: number;
  name: string;
  supported: boolean;
  decoded: boolean;
  summary: string | null;
};

export type HolderRow = {
  tokenAccount: string;
  owner: string | null;
  amountRaw: string;
  percent: string | null;
  label: string | null;
};

export type Finding = {
  id: string;
  level: FindingLevel;
  title: string;
  reason: string;
};

export type CanonicalToken = {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  imageUris: string[];
  imageCids: string[];
  links: string[];
  webHosts: string[];
  publishedAccounts?: Array<{ address: string; label: string }>;
};

export type Report = {
  tool: "orvupi-verify";
  rulesVersion: string;
  disclaimer: string;
  id: string;
  createdAt: string;
  network: "mainnet-beta";
  rpcEndpoint: string;
  mint: string;
  partial: boolean;
  supportedMint: boolean;
  referenceSlot: number | null;
  limitations: string[];
  findings: Finding[];
  identity: {
    ownerProgram: Field;
    standard: Field;
    decimals: Field;
    supplyRaw: Field;
    supplyUi: Field;
    onChainName: Field;
    onChainSymbol: Field;
    uri: Field;
    jsonName: Field;
    jsonSymbol: Field;
    image: Field;
    imageSha256: Field;
    website: Field;
    twitter: Field;
    telegram: Field;
    description: Field;
  };
  permissions: {
    mintAuthority: Field;
    freezeAuthority: Field;
    metaplexUpdateAuthority: Field;
    metaplexMutable: Field;
    tokenMetadataUpdateAuthority: Field;
    extensions: Field;
  };
  distribution: {
    denominatorRaw: Field;
    sample: Field;
    largestNonTechnicalPercent: Field;
  };
  market: {
    module: Field;
    bondingCurve: Field;
    present: Field;
    complete: Field;
    virtualTokenReserves: Field;
    virtualQuoteReserves: Field;
    realTokenReserves: Field;
    realQuoteReserves: Field;
    curveTokenSupply: Field;
    creator: Field;
    quoteMint: Field;
    progressPercent: Field;
  };
  authenticity: {
    inRegistry: Field;
    registryId: Field;
    signals: Field;
    statement: Field;
  };
};
