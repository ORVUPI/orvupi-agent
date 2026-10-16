import type { CardSummary } from "./mission/types.js";

/** Textos de presentación de la web. No cambia los nombres de campo de la API. */

const PERSONAL = "2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX";

const PUMP_ES = "Pump.fun lo llama ‘reserves’";
const PUMP_EN = "Pump.fun calls these ‘reserves’";

const STATEMENT_EN: Record<string, string> = {
  "Posible suplantación: el nombre, el símbolo, la imagen o un enlace coinciden con un token del registro curado, pero el mint es otro. La coincidencia no atribuye intención.":
    "Possible impersonation: the name, symbol, image, or a link matches a token in the curated registry, but the mint is different. The match does not attribute intent.",
  "El mint coincide con el registro curado (usdc). Que esté en el registro no es una auditoría.":
    "The mint matches the curated registry (usdc). Being in the registry is not an audit.",
  "Este mint no está en el registro curado. Que no esté no significa que sea falso ni que sea una copia.":
    "This mint is not in the curated registry. That does not mean it is fake or a copy.",
};

const CURVE_PROGRESS_ES_FROM =
  "Porcentaje inferido con la reserva real inicial pública de la curva clásica (793100000000000).";
const CURVE_PROGRESS_ES =
  `Porcentaje inferido con la cantidad real inicial pública de la curva clásica (${PUMP_ES}) (793100000000000).`;
const CURVE_PROGRESS_EN =
  `Percentage inferred from the public initial real curve amount of the classic curve (${PUMP_EN}) (793100000000000). Truncated to 2 decimals toward zero.`;

const NO_CURVE_ES = "No hay curva. No se rellena con cero.";
const NO_CURVE_EN = "There is no curve. It is not filled with zero.";

const MODULE_ES = "Cuenta con el discriminador público de BondingCurve.";
const MODULE_EN = "Account with the public BondingCurve discriminator.";

const MODULE_NONE_FROM =
  "La dirección derivada tiene una cuenta cuyo propietario no es el programa de Pump.fun. No es una curva y no se rellenan reservas a cero.";
const MODULE_NONE_ES =
  "La dirección derivada tiene una cuenta cuyo propietario no es el programa de Pump.fun. No es una curva y no se rellenan con cero las cantidades de la curva.";
const MODULE_NONE_EN =
  "The derived address has an account whose owner is not the Pump.fun program. It is not a curve, and the curve amounts are not filled in with zero.";

const ZERO_NOTE_ES =
  "Sin respuesta utilizable. No se interpreta como autoridad revocada, como inmutabilidad ni como cantidad cero.";
const ZERO_NOTE_EN =
  "No usable response. It is not interpreted as a revoked authority, as immutability, or as a zero balance.";

export const CLONE_NOTE_EN =
  "Known examples, not a complete list of clones. An address that is not here is not necessarily the official mint, nor is it necessarily fake. The match does not attribute intent.";

export const EVM_NOTE_EN =
  "Examples from Pump.fun search-v2, 2026-10-08 09:14 CEST. They have not been verified on-chain. This is not a complete list. The eip155:5042 network is not identified with certainty.";

export const EVM_ITEM_NOTE_EN = "The eip155:5042 network is not identified with certainty.";

export const EXAMPLE_NOTE_EN =
  "Name and creator read from the 2026-10-09 card. It does not identify a person.";

export type DisplayCard = CardSummary & {
  statement_en: string | null;
  holdersNote_en: string | null;
  curveProgressNote_en: string | null;
  curveModuleNote_en: string | null;
  signals_en: string[];
};

export function authorityWords(state: string): { es: string; en: string } {
  if (state === "revocada") return { es: "revocada", en: "revoked" };
  if (state === "activa") return { es: "activa", en: "active" };
  return { es: state, en: state };
}

export function signalEn(signal: string): string {
  const name = /^nombre «(.+)» incluye (.+)\/(.+)$/.exec(signal);
  if (name?.[1] && name[2]) return `name “${name[1]}” includes ${name[2]}`;
  const symbol = /^símbolo «(.+)» incluye (.+)\/(.+)$/.exec(signal);
  if (symbol?.[1] && symbol[3]) return `symbol “${symbol[1]}” includes ${symbol[3]}`;
  const link = /^enlace «(.+)» coincide con un enlace u host del registro$/.exec(signal);
  if (link?.[1]) return `link “${link[1]}” matches a link or host in the registry`;
  if (signal === "mint en el registro") return "mint in the registry";
  return signal;
}

function holdersNoteEs(note: string | null): string | null {
  if (!note) return note;
  let next = note
    .replaceAll("ni como reserva cero.", "ni como cantidad cero.")
    .replaceAll("No es un censo de holders.", "No es un censo de cuentas con tokens.");
  if (next.includes("cuenta personal publicada.") && !next.includes(PERSONAL)) {
    next = next.replace("cuenta personal publicada.", `cuenta personal publicada (${PERSONAL}).`);
  }
  return next;
}

function holdersNoteEn(note: string | null): string | null {
  if (!note) return null;
  if (note.includes("Sin respuesta utilizable")) return ZERO_NOTE_EN;
  if (note.includes("0.0006 %")) {
    return "Balances read from the curve and from the creator. The rest of the supply is 0.0006 %. It is not a census of token accounts.";
  }
  if (note.includes("cuenta personal publicada") && note.includes("0.0000 %")) {
    return `Balances read from the curve, from the creator, and from the published personal account (${PERSONAL}). The rest of the supply is 0.0000 %. It is not a census of token accounts.`;
  }
  if (note.includes("0.0000 %")) {
    return "Balances read from the curve and from the creator. The rest of the supply is 0.0000 %. It is not a census of token accounts.";
  }
  return null;
}

function curveProgressEs(note: string | null): string | null {
  if (!note) return note;
  if (note.includes(CURVE_PROGRESS_ES_FROM)) return note.replace(CURVE_PROGRESS_ES_FROM, CURVE_PROGRESS_ES);
  return note;
}

function curveProgressEn(note: string | null): string | null {
  if (!note) return null;
  if (note.includes("Porcentaje inferido con la reserva real") || note.includes("cantidad real inicial pública")) {
    return CURVE_PROGRESS_EN;
  }
  if (note === NO_CURVE_ES) return NO_CURVE_EN;
  return null;
}

function curveModuleEs(note: string | null): string | null {
  if (!note) return note;
  if (note === MODULE_NONE_FROM) return MODULE_NONE_ES;
  return note;
}

function curveModuleEn(note: string | null): string | null {
  if (!note) return null;
  if (note === MODULE_ES) return MODULE_EN;
  if (note === MODULE_NONE_FROM || note === MODULE_NONE_ES) return MODULE_NONE_EN;
  return null;
}

export function presentCard(card: CardSummary): DisplayCard {
  return presentCardRaw(card);
}

function presentCardRaw(card: CardSummary): DisplayCard {
  return {
    ...card,
    holdersNote: holdersNoteEs(card.holdersNote),
    statement_en: card.statement ? STATEMENT_EN[card.statement] ?? null : null,
    holdersNote_en: holdersNoteEn(card.holdersNote),
    curveProgressNote: curveProgressEs(card.curveProgressNote),
    curveProgressNote_en: curveProgressEn(card.curveProgressNote),
    curveModuleNote: curveModuleEs(card.curveModuleNote),
    curveModuleNote_en: curveModuleEn(card.curveModuleNote),
    signals_en: card.signals.map(signalEn),
  };
}

export function presentEvmItem<T extends { note?: string }>(item: T): T & { note_en?: string } {
  if (typeof item.note !== "string") return item;
  if (item.note.includes("eip155:5042")) return { ...item, note_en: EVM_ITEM_NOTE_EN };
  if (item.note.includes("Nombre y creadora")) return { ...item, note_en: EXAMPLE_NOTE_EN };
  return item;
}

export function presentClones<T extends Record<string, unknown>>(clones: T): T {
  const copy = structuredClone(clones) as Record<string, unknown>;
  if (typeof copy.note === "string") copy.note_en = CLONE_NOTE_EN;
  if (typeof copy.evmNote === "string") copy.evmNote_en = EVM_NOTE_EN;
  if (Array.isArray(copy.evm)) copy.evm = copy.evm.map((item) => presentEvmItem(item as { note?: string }));
  if (Array.isArray(copy.examples)) {
    copy.examples = copy.examples.map((item) => presentEvmItem(item as { note?: string }));
  }
  return copy as T;
}
