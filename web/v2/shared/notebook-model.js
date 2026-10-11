/**
 * Esquema, comparación e importación del cuaderno.
 * El texto importado no se ejecuta. Una ficha guardada no es una lectura actual.
 */
import { formatAmount } from "./amount.js";
import { factState } from "./fact-state.js";
import { notebookNameText } from "./reading-summary.js";
import { CARD_SCHEMA, CARD_VERSION, DISCLAIMER, OFFICIAL_MINT, isMintAddress } from "./solana-read.js";

export const EXPORT_SCHEMA = "stubx.notebook.export";
export const MAX_BYTES = 1_000_000;
export const MAX_CARDS = 40;
export const MAX_STORED = 200;
export const MAX_NOTE = 2_000;

const CURVE_KEYS = ["present", "status", "virtualToken", "virtualQuote", "realToken", "realQuote", "complete"];

const CARD_KEYS_V1 = [
  "schema",
  "schemaVersion",
  "rulesVersion",
  "network",
  "mint",
  "consultedAt",
  "slot",
  "slotStatus",
  "partial",
  "errors",
  "isMint",
  "program",
  "programStatus",
  "decimals",
  "supplyAccount",
  "supplyRpc",
  "supplyRpcStatus",
  "mintAuthority",
  "freezeAuthority",
  "name",
  "symbol",
  "uri",
  "metadataMutable",
  "extensions",
  "extensionsStatus",
  "curve",
  "officialStubx",
  "disclaimer",
];

const CARD_KEYS_V2 = [
  ...CARD_KEYS_V1.slice(0, CARD_KEYS_V1.indexOf("officialStubx")),
  "largestStatus",
  "officialStubx",
  "disclaimer",
];

const RECORD_KEYS = ["id", "note", "card"];
const STATUSES = new Set([
  "verificado",
  "inferido",
  "ok",
  "ausente",
  "fallo",
  "no_consultado",
  "no_disponible",
  "no_aplica",
  "no_soportada",
]);
const PROGRAMS = new Set(["spl-token", "token-2022", "no_es_mint", "no_disponible"]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DANGER = /<\s*script|<\/\s*script|javascript\s*:|onerror\s*=|onload\s*=/i;
const BANNED_KEYS = new Set(["price", "bought", "amountbought", "wallet", "seed", "secret", "uiamount", "current"]);

function fail(es, en) {
  return { ok: false, error: { es, en } };
}

function sameKeys(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== allowed.length) return false;
  return allowed.every((key) => Object.hasOwn(value, key));
}

function bannedKey(value, depth) {
  if (depth > 8 || value === null || typeof value !== "object") return false;
  for (const key of Object.keys(value)) {
    if (BANNED_KEYS.has(key.toLowerCase())) return true;
    if (bannedKey(value[key], depth + 1)) return true;
  }
  return false;
}

function dangerousString(value, depth) {
  if (depth > 8) return true;
  if (typeof value === "string") return DANGER.test(value);
  if (Array.isArray(value)) return value.some((item) => dangerousString(item, depth + 1));
  if (value && typeof value === "object") return Object.values(value).some((item) => dangerousString(item, depth + 1));
  return false;
}

function textField(value) {
  if (!value || typeof value !== "object") return false;
  if (!sameKeys(value, ["text", "status"])) return false;
  if (value.text !== null && (typeof value.text !== "string" || value.text.length > 300)) return false;
  return STATUSES.has(value.status);
}

function authority(value) {
  if (!value || typeof value !== "object") return false;
  if (!sameKeys(value, ["state", "address", "status"])) return false;
  if (!["revocada", "activa", "no_decodificable", "no_disponible", "no_aplica"].includes(value.state)) return false;
  if (value.address !== null && (typeof value.address !== "string" || value.address.length > 44)) return false;
  return STATUSES.has(value.status);
}

function amount(value) {
  return value === null || (typeof value === "string" && /^\d+$/.test(value) && value.length <= 40);
}

export function validateCard(card) {
  const version = card && card.schemaVersion;
  const keys = version === 1 ? CARD_KEYS_V1 : version === 2 ? CARD_KEYS_V2 : null;
  if (!keys || !sameKeys(card, keys)) return fail("La ficha no tiene la forma esperada.", "The card does not have the expected shape.");
  if (card.schema !== CARD_SCHEMA || (version !== 1 && version !== CARD_VERSION)) {
    return fail("La versión de la ficha no es la de este cuaderno.", "The card version is not the one this notebook uses.");
  }
  if (card.rulesVersion !== "0.1.0" || card.network !== "solana") {
    return fail("La ficha no dice la red o la versión de reglas.", "The card does not name the network or the rules version.");
  }
  if (!isMintAddress(card.mint)) {
    return fail("La dirección de la ficha no es una dirección de Solana.", "The address on the card is not a Solana address.");
  }
  if (typeof card.consultedAt !== "string" || !ISO.test(card.consultedAt)) {
    return fail("La ficha no trae una hora UTC.", "The card does not include a UTC time.");
  }
  if (card.slot !== null && (!Number.isSafeInteger(card.slot) || card.slot < 0)) {
    return fail("El slot no es un entero razonable.", "The slot is not a reasonable integer.");
  }
  if (!STATUSES.has(card.slotStatus) || typeof card.partial !== "boolean" || typeof card.isMint !== "boolean") {
    return fail("Falta un estado de la ficha.", "A card status is missing.");
  }
  if (!PROGRAMS.has(card.program) || !STATUSES.has(card.programStatus)) {
    return fail("El programa del token no está en la lista.", "The token program is not on the list.");
  }
  if (card.decimals !== null && (!Number.isInteger(card.decimals) || card.decimals < 0 || card.decimals > 18)) {
    return fail("Los decimales no son válidos.", "The decimals are not valid.");
  }
  if (!amount(card.supplyAccount) || !amount(card.supplyRpc) || !STATUSES.has(card.supplyRpcStatus)) {
    return fail("El suministro no es un entero en unidades mínimas.", "Supply is not an integer in base units.");
  }
  if (!authority(card.mintAuthority) || !authority(card.freezeAuthority)) {
    return fail("Un permiso no tiene la forma esperada.", "A permission does not have the expected shape.");
  }
  if (!textField(card.name) || !textField(card.symbol) || !textField(card.uri)) {
    return fail("Un texto de metadatos no tiene la forma esperada.", "A metadata text does not have the expected shape.");
  }
  if (!["si", "no", "no_disponible", "no_aplica", "ausente", "fallo"].includes(card.metadataMutable)) {
    return fail("La mutabilidad no está en la lista.", "Mutability is not on the list.");
  }
  if (version === 2 && !STATUSES.has(card.largestStatus)) {
    return fail("El estado de las cuentas grandes no está en la lista.", "The large-account status is not on the list.");
  }
  if (!Array.isArray(card.extensions) || card.extensions.length > 40 || !STATUSES.has(card.extensionsStatus)) {
    return fail("Las extensiones no tienen la forma esperada.", "Extensions do not have the expected shape.");
  }
  for (const item of card.extensions) {
    if (!item || typeof item.name !== "string" || item.name.length > 80 || !Number.isInteger(item.type)) {
      return fail("Hay una extensión ilegible.", "An extension is unreadable.");
    }
    if (item.status !== "verificado" && item.status !== "no_soportada") {
      return fail("El estado de una extensión no está en la lista.", "An extension status is not on the list.");
    }
  }
  const curve = card.curve;
  if (!sameKeys(curve, CURVE_KEYS)) return fail("La curva tiene campos de más o de menos.", "The curve has extra or missing fields.");
  if (curve.present !== null && typeof curve.present !== "boolean") return fail("La curva no es un sí o un no.", "The curve is not a yes or a no.");
  if (!STATUSES.has(curve.status)) return fail("El estado de la curva no está en la lista.", "The curve status is not on the list.");
  for (const key of ["virtualToken", "virtualQuote", "realToken", "realQuote"]) {
    if (!amount(curve[key])) return fail("Una cantidad de la curva no es un entero.", "A curve amount is not an integer.");
  }
  if (curve.complete !== null && typeof curve.complete !== "boolean") {
    return fail("El campo complete no es un sí o un no.", "The complete field is not a yes or a no.");
  }
  if (typeof card.officialStubx !== "boolean" || card.officialStubx !== (card.mint === OFFICIAL_MINT)) {
    return fail("La marca de STUBX no coincide con la dirección.", "The STUBX mark does not match the address.");
  }
  if (!card.disclaimer || card.disclaimer.es !== DISCLAIMER.es || card.disclaimer.en !== DISCLAIMER.en) {
    return fail("Falta el aviso fijo de la ficha.", "The fixed card notice is missing.");
  }
  if (!Array.isArray(card.errors) || card.errors.length > 12) {
    return fail("La lista de errores no es válida.", "The error list is not valid.");
  }
  for (const item of card.errors) {
    if (!item || typeof item.method !== "string" || typeof item.message !== "string") {
      return fail("Hay un error ilegible.", "An error entry is unreadable.");
    }
    if (item.message.length > 300 || item.method.length > 40) return fail("Un error es demasiado largo.", "An error entry is too long.");
  }
  if (dangerousString(card, 0) || bannedKey(card, 0)) {
    return fail("La ficha trae texto que este cuaderno no guarda.", "The card contains text this notebook does not store.");
  }
  return { ok: true, card };
}

export function validateRecord(record) {
  if (!sameKeys(record, RECORD_KEYS)) {
    return fail("Cada consulta tiene que traer id, nota y ficha, y nada más.", "Each query must contain an id, a note, and a card, and nothing else.");
  }
  if (typeof record.id !== "string" || !ID.test(record.id)) {
    return fail("El identificador de la consulta no es válido.", "The query id is not valid.");
  }
  if (typeof record.note !== "string") {
    return fail("La nota tiene que ser un texto de hasta 2000 caracteres.", "The note must be text of at most 2000 characters.");
  }
  const note = visibleText(record.note);
  if (note.length > MAX_NOTE) {
    return fail("La nota tiene que ser un texto de hasta 2000 caracteres.", "The note must be text of at most 2000 characters.");
  }
  if (DANGER.test(note)) {
    return fail("La nota parece un script. No se importa.", "The note looks like a script. It was not imported.");
  }
  const card = validateCard(record.card);
  if (!card.ok) return card;
  return { ok: true, record: { id: record.id, note, card: card.card } };
}

export function validateExport(text) {
  if (typeof text !== "string") return fail("El archivo no es texto.", "The file is not text.");
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_BYTES) {
    return fail("El archivo pasa de 1 MB. No se importa.", "The file is over 1 MB. It was not imported.");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("El archivo no es JSON. No se importa.", "The file is not JSON. It was not imported.");
  }
  if (dangerousString(parsed, 0) || bannedKey(parsed, 0)) {
    return fail("El archivo trae texto que este cuaderno no guarda.", "The file contains text this notebook does not store.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("La copia no tiene la forma esperada.", "The copy does not have the expected shape.");
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 4 || !keys.includes("schema") || !keys.includes("schemaVersion") || !keys.includes("exportedAt") || !keys.includes("cards")) {
    return fail("La copia tiene campos de más o de menos.", "The copy has extra or missing fields.");
  }
  if (parsed.schema !== EXPORT_SCHEMA || parsed.schemaVersion !== 1) {
    return fail("Esta copia no es de este cuaderno.", "This copy is not from this notebook.");
  }
  if (typeof parsed.exportedAt !== "string" || !ISO.test(parsed.exportedAt)) {
    return fail("La copia no trae una hora UTC.", "The copy does not include a UTC time.");
  }
  if (!Array.isArray(parsed.cards) || parsed.cards.length > MAX_CARDS) {
    return fail(`Se pueden importar hasta ${MAX_CARDS} consultas.`, `You can import up to ${MAX_CARDS} queries.`);
  }
  const records = [];
  const seen = new Set();
  for (const item of parsed.cards) {
    const checked = validateRecord(item);
    if (!checked.ok) return checked;
    if (seen.has(checked.record.id)) return fail("Hay dos consultas con el mismo id.", "Two queries share the same id.");
    seen.add(checked.record.id);
    records.push(checked.record);
  }
  return { ok: true, records };
}

export function visibleText(value) {
  return String(value).replace(/\p{Cf}/gu, "");
}

const TABLE_STATE = {
  ausente: { es: "No está en esta lectura", en: "It is not in this reading" },
  fallo: { es: "No se pudo leer", en: "It could not be read" },
  no_consultado: { es: "Esta lectura no lo pidió", en: "This reading did not ask for it" },
  no_aplica: { es: "No aplica", en: "Not applicable" },
};

export function tableCellText(field, status, value, lang) {
  const state = factState(status, value);
  const language = lang === "en" ? "en" : "es";
  if (state === "ok" && value !== null && value !== undefined && value !== "") return String(value);
  if (state === "ausente" && field === "uri") {
    return language === "en" ? "It has no metadata link" : "No tiene enlace de metadatos";
  }
  const row = TABLE_STATE[state];
  if (row) return row[language];
  return language === "en" ? "It could not be read" : "No se pudo leer";
}

export function clipName(value, max = 64) {
  const clean = visibleText(value).replace(/\u0000/g, "").replace(/\uFFFD/g, "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

export function withinStoreLimit(existingCount, incomingNewCount) {
  if (!Number.isInteger(existingCount) || existingCount < 0) return false;
  if (!Number.isInteger(incomingNewCount) || incomingNewCount < 0) return false;
  return existingCount + incomingNewCount <= MAX_STORED;
}

export function toExport(records, exportedAt) {
  return JSON.stringify(
    {
      schema: EXPORT_SCHEMA,
      schemaVersion: 1,
      exportedAt,
      cards: records.map((record) => ({ id: record.id, note: record.note, card: record.card })),
    },
    null,
    2,
  );
}

const COMPARE_FIELDS = [
  ["program", "programStatus", "Programa", "Program", false],
  ["mintAuthority.state", "mintAuthority.status", "Permiso de emisión", "Mint authority", false],
  ["freezeAuthority.state", "freezeAuthority.status", "Permiso de congelación", "Freeze authority", false],
  ["decimals", null, "Decimales", "Decimals", false],
  ["name.text", "name.status", "Nombre", "Name", false],
  ["symbol.text", "symbol.status", "Símbolo", "Symbol", false],
  ["metadataMutable", "metadataMutable", "Metadatos mutables", "Mutable metadata", false],
  ["curve.present", "curve.status", "Curva presente", "Curve present", false],
  ["curve.realToken", "curve.status", "Cantidad real de tokens de la curva", "Real curve token amount", true],
  ["curve.virtualToken", "curve.status", "Cantidad virtual de tokens de la curva", "Virtual curve token amount", true],
  ["curve.complete", "curve.status", "Curva completa", "Curve complete", false],
];

function readPath(card, path) {
  let current = card;
  for (const part of path.split(".")) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  if (current === undefined) return null;
  return current;
}

function compareFact(status, value) {
  if (status === "si" || status === "no" || status === true || status === false) return "ok";
  const known = status === null || status === undefined
    ? (value === null || value === undefined || value === "" ? "no_disponible" : "verificado")
    : status;
  return factState(known, value);
}

function determined(state) {
  return state === "ok" || state === "ausente" || state === "no_aplica";
}

function supplyDigits(value) {
  return typeof value === "string" && /^\d+$/.test(value) ? value : null;
}

function totalSupply(card) {
  const account = supplyDigits(card && card.supplyAccount);
  if (account) return { raw: account, state: "ok" };
  if (card && card.supplyRpcStatus === "verificado") {
    const extra = supplyDigits(card.supplyRpc);
    if (extra) return { raw: extra, state: "ok" };
  }
  if (card && card.supplyRpcStatus === "no_aplica" && card.isMint === false) return { raw: null, state: "no_aplica" };
  return { raw: null, state: "fallo" };
}

const COMPARED_TEXT = {
  "spl-token": { es: "SPL Token", en: "SPL Token" },
  "token-2022": { es: "Token-2022", en: "Token-2022" },
  no_es_mint: { es: "No es una cuenta de mint", en: "Not a mint account" },
  no_disponible: { es: "no disponible", en: "unavailable" },
  si: { es: "sí", en: "yes" },
  no: { es: "no", en: "no" },
  true: { es: "sí", en: "yes" },
  false: { es: "no", en: "no" },
  activa: { es: "activa", en: "active" },
  revocada: { es: "revocada", en: "revoked" },
  no_decodificable: { es: "no se pudo leer", en: "could not be read" },
  no_aplica: { es: "no aplica", en: "not applicable" },
  ausente: { es: "No está en esta lectura", en: "It is not in this reading" },
  fallo: { es: "No se pudo leer", en: "It could not be read" },
  no_consultado: { es: "Esta lectura no lo pidió", en: "This reading did not ask for it" },
};

export const CURVE_NOT_ON_PUMP = {
  es: "No aplica: este token no se creó en Pump.fun",
  en: "Not applicable: this token was not created on Pump.fun",
};

export function curveComparisonValue(fieldEs, state, lang) {
  if (state !== "no_aplica" || !/curva/i.test(String(fieldEs))) return null;
  return lang === "en" ? CURVE_NOT_ON_PUMP.en : CURVE_NOT_ON_PUMP.es;
}

export function comparedValueText(raw, lang) {
  if (raw === null || raw === undefined || raw === "") return lang === "en" ? "unavailable" : "no disponible";
  const row = COMPARED_TEXT[String(raw)];
  if (!row) return String(raw);
  return lang === "en" ? row.en : row.es;
}

export function comparedSideText(fieldEs, card, raw, lang) {
  if (fieldEs === "Nombre") {
    const spoken = notebookNameText(card, lang);
    if (spoken) return spoken;
  }
  return comparedValueText(raw, lang);
}

export function supplyConfirmation(card) {
  const account = supplyDigits(card && card.supplyAccount);
  const extra = card && card.supplyRpcStatus === "verificado" ? supplyDigits(card.supplyRpc) : null;
  if (account && extra && account === extra) return { confirmed: true, reason: "coincide", account, extra };
  if (account && extra) return { confirmed: false, reason: "no_coincide", account, extra };
  if (account) return { confirmed: false, reason: "fallo", account, extra: null };
  if (extra) return { confirmed: true, reason: "coincide", account: null, extra };
  if (card && card.supplyRpcStatus === "no_aplica" && card.isMint === false) {
    return { confirmed: false, reason: "no_aplica", account: null, extra: null };
  }
  return { confirmed: false, reason: "fallo", account: null, extra: null };
}

export function supplyNote(card, lang) {
  const check = supplyConfirmation(card);
  if (check.reason !== "fallo" && check.reason !== "no_coincide") return null;
  if (!check.account || !Number.isInteger(card.decimals)) return null;
  const formatted = formatAmount(check.account, card.decimals, lang);
  if (!formatted) return null;
  const figure = formatted.replace(/ tokens$/, "");
  const en = lang === "en";
  if (check.reason === "no_coincide") {
    return en
      ? `The mint bytes say ${figure} with ${card.decimals} decimals, and the extra read does not match. The figure shown is the one from the bytes. Percentages are not calculated.`
      : `Los bytes del mint dicen ${figure} con ${card.decimals} decimales, y la lectura extra no coincide. Se muestra la cifra de los bytes. No se calculan porcentajes.`;
  }
  const service = en
    ? "The public service did not respond, try again in a minute."
    : "El servicio público no respondió, prueba otra vez en un minuto.";
  return en
    ? `There are ${figure} tokens, with ${card.decimals} decimals, read from the mint bytes. ${service} That does not change this figure and it is not an absence.`
    : `Hay ${figure} tokens, con ${card.decimals} decimales, leídos de los bytes del mint. ${service} Eso no cambia esta cifra y no es una ausencia.`;
}

export function supplyDirection(difference, decimals, lang) {
  if (difference === null || difference === undefined || difference === "") return null;
  let value;
  try {
    value = BigInt(difference);
  } catch {
    return null;
  }
  if (value === 0n) return null;
  const absolute = formatAmount((value < 0n ? -value : value).toString(), decimals, lang);
  if (!absolute) return null;
  if (lang === "en") return value < 0n ? `Fell ${absolute}` : `Rose ${absolute}`;
  return value < 0n ? `Bajó ${absolute}` : `Subió ${absolute}`;
}

function countClause(count, one, many) {
  return count === 1 ? one : many.replace("#", String(count));
}

export function comparisonSummary(compared, lang) {
  const changed = Array.isArray(compared && compared.changes) ? compared.changes.length : 0;
  const same = Array.isArray(compared && compared.unchanged) ? compared.unchanged.length : 0;
  const unknown = Array.isArray(compared && compared.unknown) ? compared.unknown.length : 0;
  if (lang === "en") {
    const change = countClause(changed, "1 fact changed", "# facts changed");
    const stay = countClause(same, "1 stayed the same", "# stayed the same");
    const miss = countClause(
      unknown,
      "1 cannot be compared because it is missing from one reading",
      "# cannot be compared because they are missing from one reading",
    );
    return `${change} · ${stay} · ${miss}`;
  }
  const change = countClause(changed, "1 dato cambió", "# datos cambiaron");
  const stay = countClause(same, "1 sigue igual", "# siguen igual");
  const miss = countClause(
    unknown,
    "1 no se puede comparar porque falta en alguna lectura",
    "# no se pueden comparar porque faltan en alguna lectura",
  );
  return `${change} · ${stay} · ${miss}`;
}

function supplyRow(left, right) {
  const a = totalSupply(left.card);
  const b = totalSupply(right.card);
  let verdict = "indeterminado";
  let difference = null;
  if (determined(a.state) && determined(b.state)) {
    verdict = a.raw === b.raw ? "igual" : "cambio";
    if (
      verdict === "cambio"
      && a.raw
      && b.raw
      && Number.isInteger(left.card.decimals)
      && left.card.decimals === right.card.decimals
    ) {
      difference = (BigInt(b.raw) - BigInt(a.raw)).toString();
    }
  }
  return {
    field: { es: "Suministro total", en: "Total supply" },
    left: a.raw,
    right: b.raw,
    amount: true,
    difference,
    leftState: a.state,
    rightState: b.state,
    verdict,
    same: verdict === "igual",
    leftAt: left.card.consultedAt,
    rightAt: right.card.consultedAt,
  };
}

export function compareRecords(left, right) {
  if (!left || !right || left.card.mint !== right.card.mint || left.card.network !== right.card.network) {
    return fail(
      "Solo se comparan dos consultas de la misma red y dirección.",
      "Only two queries of the same network and address can be compared.",
    );
  }
  if (String(left.card.consultedAt) > String(right.card.consultedAt)) {
    const newer = left;
    left = right;
    right = newer;
  }
  const rows = COMPARE_FIELDS.map(([path, statusPath, es, en, amount]) => {
    const a = readPath(left.card, path);
    const b = readPath(right.card, path);
    const leftState = compareFact(statusPath ? readPath(left.card, statusPath) : null, a);
    const rightState = compareFact(statusPath ? readPath(right.card, statusPath) : null, b);
    const verdict = determined(leftState) && determined(rightState)
      ? (Object.is(a, b) ? "igual" : "cambio")
      : "indeterminado";
    return {
      field: { es, en },
      left: a === null || a === undefined ? null : String(a),
      right: b === null || b === undefined ? null : String(b),
      amount,
      leftState,
      rightState,
      verdict,
      same: verdict === "igual",
      leftAt: left.card.consultedAt,
      rightAt: right.card.consultedAt,
    };
  });
  const freezeAt = rows.findIndex((row) => row.field.es === "Permiso de congelación");
  rows.splice(freezeAt + 1, 0, supplyRow(left, right));
  return {
    ok: true,
    mint: left.card.mint,
    network: left.card.network,
    formatChanged: left.card.schemaVersion !== right.card.schemaVersion,
    rows,
    changes: rows.filter((row) => row.verdict === "cambio"),
    unknown: rows.filter((row) => row.verdict === "indeterminado"),
    unchanged: rows.filter((row) => row.verdict === "igual"),
    technical: {
      slot: { left: left.card.slot ?? null, right: right.card.slot ?? null },
      consultedAt: { left: left.card.consultedAt, right: right.card.consultedAt },
    },
    notes: { left: left.note, right: right.note },
    older: left,
    newer: right,
  };
}

export function pickPrevious(records, card, exceptId) {
  if (!card || typeof card.mint !== "string" || typeof card.network !== "string") return null;
  const matches = (Array.isArray(records) ? records : []).filter((item) => {
    if (!item || !item.card || item.id === exceptId) return false;
    return item.card.mint === card.mint && item.card.network === card.network;
  });
  matches.sort((a, b) => (a.card.consultedAt < b.card.consultedAt ? 1 : -1));
  return matches[0] ?? null;
}

export function staleLine(consultedAt, lang) {
  const local = formatReadingStamp(consultedAt, lang, true);
  if (lang === "en") return `Checked on ${local} · this may have changed`;
  return `Consultado el ${local} · puede haber cambiado`;
}

export function formatReadingStamp(consultedAt, lang, withSeconds = true) {
  const date = new Date(consultedAt);
  if (Number.isNaN(date.getTime())) return formatLocal(consultedAt, lang);
  const options = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (withSeconds) options.second = "2-digit";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", options).format(date).replace(/[\u202f\u00a0]/g, " ");
}

function readingBaseLabel(card, lang) {
  const stamp = formatReadingStamp(card && card.consultedAt, lang, true);
  const spoken = notebookNameText(card, lang);
  const symbol = card && card.symbol && typeof card.symbol.text === "string" ? clipName(card.symbol.text, 24) : "";
  const name = card && card.name && typeof card.name.text === "string" ? clipName(card.name.text, 24) : "";
  const shortMint = `${String(card && card.mint ? card.mint : "").slice(0, 4)}…`;
  if (spoken.startsWith("Dice llamarse ") || spoken.startsWith("It says it is called ")) {
    return `${spoken} · ${shortMint} · ${stamp}`;
  }
  const title = symbol || name || spoken || shortMint;
  return `${title} · ${stamp}`;
}

export function sortNotebookRecords(records, lang) {
  const list = Array.isArray(records) ? records.slice() : [];
  const labelOf = (record) => readingOptionLabel(record && record.card, lang);
  list.sort((a, b) => {
    const at = String(a && a.card ? a.card.consultedAt : "");
    const bt = String(b && b.card ? b.card.consultedAt : "");
    if (at !== bt) return at < bt ? 1 : -1;
    const al = labelOf(a);
    const bl = labelOf(b);
    if (al < bl) return -1;
    if (al > bl) return 1;
    return 0;
  });
  return list;
}

export function readingOptionLabel(card, lang, peers) {
  const base = readingBaseLabel(card, lang);
  if (!Array.isArray(peers)) return base;
  const index = peers.indexOf(card);
  if (index < 0) return base;
  const earlier = peers.slice(0, index).filter((item) => readingBaseLabel(item, lang) === base).length;
  return earlier ? `${base} (${earlier + 1})` : base;
}

export function formatLocal(consultedAt, lang) {
  const date = new Date(consultedAt);
  if (Number.isNaN(date.getTime())) return lang === "en" ? "unknown local time" : "hora local desconocida";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export const NOTEBOOK_DB_VERSION = 2;

/**
 * Copia red y dirección a la entrada si faltan.
 * No borra la entrada, no pisa una red o una dirección que ya estuvieran, y no inventa datos.
 */
export function migrateStoredRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { changed: false, record: record ?? null };
  }
  const card = record.card && typeof record.card === "object" ? record.card : null;
  const networkFromCard = card && typeof card.network === "string" ? card.network : "";
  const addressFromCard = card && typeof card.mint === "string" ? card.mint : "";
  const next = { ...record };
  let changed = false;
  if (typeof next.network !== "string" || !next.network) {
    if (networkFromCard) {
      next.network = networkFromCard;
      changed = true;
    }
  }
  if (typeof next.address !== "string" || !next.address) {
    if (addressFromCard) {
      next.address = addressFromCard;
      changed = true;
    }
  }
  return { changed, record: next };
}

/** Una entrada nueva guarda siempre la red y la dirección de la ficha. */
export function stampIdentity(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const card = record.card && typeof record.card === "object" ? record.card : null;
  const network = card && typeof card.network === "string" && card.network
    ? card.network
    : (typeof record.network === "string" ? record.network : "");
  const address = card && typeof card.mint === "string" && card.mint
    ? card.mint
    : (typeof record.address === "string" ? record.address : "");
  return { ...record, network, address };
}

export function watchTargets(records) {
  const groups = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const migrated = migrateStoredRecord(record).record;
    if (!migrated || !migrated.card) continue;
    const network = typeof migrated.network === "string" ? migrated.network : "";
    const address = typeof migrated.address === "string" ? migrated.address : "";
    if (!network || !address) continue;
    const key = `${network}\n${address}`;
    const bucket = groups.get(key) || [];
    bucket.push(migrated);
    groups.set(key, bucket);
  }
  const entries = [];
  for (const [key, bucket] of groups) {
    const sorted = bucket.slice().sort((left, right) => {
      const at = String(left.card && left.card.consultedAt ? left.card.consultedAt : "");
      const bt = String(right.card && right.card.consultedAt ? right.card.consultedAt : "");
      if (at === bt) return 0;
      return at < bt ? 1 : -1;
    });
    const [network, address] = key.split("\n");
    entries.push({ key, network, address, latest: sorted[0], count: bucket.length });
  }
  entries.sort((left, right) => {
    const at = String(left.latest.card && left.latest.card.consultedAt ? left.latest.card.consultedAt : "");
    const bt = String(right.latest.card && right.latest.card.consultedAt ? right.latest.card.consultedAt : "");
    if (at === bt) return left.address < right.address ? -1 : left.address > right.address ? 1 : 0;
    return at < bt ? 1 : -1;
  });
  return entries;
}

/** Sin marcas se consultan todas. Con marcas, solo esas. */
export function chooseWatchTargets(targets, selectedKeys) {
  const list = Array.isArray(targets) ? targets : [];
  const keys = Array.isArray(selectedKeys) ? selectedKeys.filter((key) => typeof key === "string" && key) : [];
  if (!keys.length) return list.slice();
  const wanted = new Set(keys);
  return list.filter((item) => wanted.has(item.key));
}

/**
 * Pide huecos de una en una. Si el cupo se llena, el resto espera y no se consulta.
 * takeSlot es takeQuerySlot: mismas reglas que una consulta suelta.
 */
export function reserveWatchSlots(entries, stamps, now, takeSlot) {
  const list = Array.isArray(entries) ? entries : [];
  let current = Array.isArray(stamps) ? stamps.slice() : [];
  if (typeof takeSlot !== "function") return { ready: [], waiting: list.slice(), stamps: current };
  const ready = [];
  const waiting = [];
  let blocked = false;
  for (const entry of list) {
    if (blocked) {
      waiting.push(entry);
      continue;
    }
    const slot = takeSlot(current, now, 6, 60000);
    current = Array.isArray(slot && slot.stamps) ? slot.stamps : current;
    if (!slot || slot.allowed !== true) {
      blocked = true;
      waiting.push(entry);
      continue;
    }
    ready.push(entry);
  }
  return { ready, waiting, stamps: current };
}

const REFUSAL = /HTTP 403|HTTP 429|request blocked|indexed request|access forbidden|personal token/i;

/** Un servicio que rechaza la consulta no es una lectura igual. */
export function serviceRejection(card) {
  if (!card || typeof card !== "object") return { rejected: true, primary: true };
  const errors = Array.isArray(card.errors) ? card.errors : [];
  const refused = errors.some((item) => {
    if (!item || typeof item !== "object") return false;
    const status = item.httpStatus;
    if (status === 403 || status === 429 || status === 0 || status === 408) return true;
    if (typeof status === "number" && status >= 500) return true;
    return REFUSAL.test(String(item.message || ""));
  });
  const primary = card.programStatus === "fallo";
  return { rejected: Boolean(refused || primary), primary: Boolean(primary) };
}

export function watchVerdict(previous, result) {
  const card = result && result.card ? result.card : null;
  const rejection = serviceRejection(card);
  if (!previous || !previous.card || !card || rejection.primary) {
    return { kind: "rechazada", compared: null, save: false, card, rejection };
  }
  const checked = validateCard(card);
  if (!checked.ok) return { kind: "rechazada", compared: null, save: false, card, rejection };
  const next = { id: "00000000-0000-4000-8000-000000000001", note: "", card: checked.card };
  const compared = compareRecords(previous, next);
  if (!compared.ok) return { kind: "rechazada", compared: null, save: false, card: checked.card, rejection };
  if (rejection.rejected) {
    return {
      kind: compared.changes.length ? "cambio" : "incompleto",
      compared,
      save: true,
      card: checked.card,
      rejection,
    };
  }
  if (compared.changes.length) {
    return { kind: "cambio", compared, save: true, card: checked.card, rejection };
  }
  if (compared.unknown.length) {
    return { kind: "incompleto", compared, save: true, card: checked.card, rejection };
  }
  return { kind: "igual", compared, save: true, card: checked.card, rejection };
}

export function withNote(record, note) {
  if (typeof note !== "string") {
    return fail("La nota tiene que ser texto, de hasta 2000 caracteres, y no puede ser un script.", "The note must be text, at most 2000 characters, and it cannot be a script.");
  }
  const cleaned = visibleText(note);
  if (cleaned.length > MAX_NOTE || DANGER.test(cleaned)) {
    return fail("La nota tiene que ser texto, de hasta 2000 caracteres, y no puede ser un script.", "The note must be text, at most 2000 characters, and it cannot be a script.");
  }
  return { ok: true, record: { id: record.id, note: cleaned, card: record.card } };
}
