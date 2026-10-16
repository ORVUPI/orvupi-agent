export const ALLOWED_ACTIONS = [
  "ppm:print",
  "ppm:check",
  "log:append",
  "status",
  "killswitch:check",
  "chain:read",
] as const;

export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

export const LIMIT_IDS = [
  "no-sign",
  "no-custody",
  "no-trade",
  "no-send",
  "no-mainnet",
  "no-solicit-funds",
  "no-invented-addresses",
  "no-outcome-promises",
  "no-publish-while-killed",
  "no-store-secrets",
] as const;

export type LimitId = (typeof LIMIT_IDS)[number];

export const CANNOT_IDS = [
  "pause-holder-transfers",
  "freeze-accounts",
  "seize-balances",
  "stop-solana",
] as const;

export type CannotId = (typeof CANNOT_IDS)[number];

export type LimitDef = {
  id: LimitId;
  title: string;
  statement: string;
  enforcedBy: readonly string[];
  test: string;
};

export type CannotDef = {
  id: CannotId;
  statement: string;
};

export type KillSwitchState = {
  version: 1;
  engaged: boolean;
  since: string | null;
  reason: string | null;
  scope: "ops-social";
};

export type DispatchDenied = {
  ok: false;
  action: string;
  code: string;
  limitId: LimitId | null;
  message: string;
  onChainEffect: false;
  cannot: readonly string[];
};

export type DispatchOk = {
  ok: true;
  action: string;
  output: unknown;
};

export type DispatchResult = DispatchOk | DispatchDenied;

export type LogEntry = {
  v: 1;
  ts: string;
  actor: "orvupi-agent";
  action: string;
  detail: string;
  evidence: null;
  contentSha256: string;
  prevHash: string | null;
  hash: string;
  chain: "stub-until-p4";
};

export type MemoryEvent = {
  ts: string;
  action: string;
  ok: boolean;
  code: string;
};
