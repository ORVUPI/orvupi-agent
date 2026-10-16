import { fingerprint } from "./fingerprint.js";
import { isRecord, sameKeys } from "./json-file.js";

/**
 * Public append-only log (phase P4).
 *
 * One JSON object per line in logs/agent-log.jsonl. Each line carries the
 * sha256 of its content and the hash of the previous line (hash chain).
 * Anchor files in logs/anchors/ fix the head of the chain at a given length;
 * each anchor is submitted to OpenTimestamps (.ots) by the workflow.
 *
 * Pure functions only: no file system, no network. Callers pass text in.
 */

export const LOG_FILE = "agent-log.jsonl";
export const ANCHOR_DIR = "anchors";
export const ANCHOR_HEADER = "orvupi-agent public log anchor v1";
export const REPO_SLUG = "ORVUPI/orvupi-agent";
export const MAX_LINE_BYTES = 4096;
export const MAX_ANCHOR_BYTES = 1024;
export const MAX_OTS_BYTES = 65536;

/**
 * Fixed text written into every entry, forever. The mode ("prototipo") and this
 * note are fixed in code: if the agent ever takes actions with effects outside
 * this repository, both must change first, in a public commit (see LOGS.md).
 * Changed on 2026-09-28 (P5) to name the @ORVUPI posts; earlier entries keep the earlier note (append-only).
 */
export const DAILY_NOTE =
  "Prototipo. El agente de este repositorio no publica en redes sociales, no firma y no mueve fondos. Los posts de @ORVUPI los prepara y publica otro agente de IA, fuera de este repositorio, a partir de textos aprobados antes de publicarse. Esta entrada la escribe el workflow daily-log y solo anota el estado del kill-switch y el resultado del simulacro en este repositorio.";

/**
 * Génesis de la cadena ORVUPI: la cadena se reinicia el 16-10-2026. La anterior, de 22 entradas,
 * se conserva en el tag pre-orvupi-2026-10-16 y su último hash queda escrito aquí. Las entradas
 * copiadas (anteriores a esa fecha) llevan una nota neutra, sin nombre de cuenta.
 */
export const COPIED_NOTE_FROM_0928 =
  "Prototipo. El agente de este repositorio no publica en redes sociales, no firma y no mueve fondos. Los posts de la cuenta del proyecto los prepara y publica otro agente de IA, fuera de este repositorio, a partir de textos aprobados antes de publicarse. Esta entrada la escribe el workflow daily-log y solo anota el estado del kill-switch y el resultado del simulacro en este repositorio.";
export const PREVIOUS_CHAIN_TAG = "pre-orvupi-2026-10-16";
export const PREVIOUS_CHAIN_HEAD = "00448b50f38e39a3e04b3bbc23e93a5e824f955eaa30f9f4911bfc9baf2b1168";
export const GENESIS_NOTE = `ORVUPI, 16-10-2026. La cadena se reinicia el 16-10-2026. La cadena anterior (22 entradas) se conserva sin cambios en el tag ${PREVIOUS_CHAIN_TAG}; su último hash es ${PREVIOUS_CHAIN_HEAD}. Las entradas 2 a 23 copian sus fechas, comprobaciones y enlaces, sin nombres de cuenta.`;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SHA40 = /^[0-9a-f]{40}$/;
const RUN_URL = /^https:\/\/github\.com\/ORVUPI\/orvupi-agent\/actions\/runs\/[1-9]\d{0,19}$/;
const ANCHOR_NAME = /^(\d{4}-\d{2}-\d{2})-(\d{6})\.txt$/;

export type KillSwitchSnapshot = {
  readable: boolean;
  engaged: boolean | null;
};

export type DrillSnapshot = {
  ran: boolean;
  ok: boolean | null;
  steps: number;
  passed: number;
};

export type DailyDetail = {
  mode: "prototipo";
  commit: string | null;
  killSwitch: KillSwitchSnapshot;
  drill: DrillSnapshot;
  note: string;
};

export type PublicLogEntry = {
  v: 1;
  seq: number;
  ts: string;
  actor: "orvupi-agent";
  action: "daily-status" | "genesis";
  detail: DailyDetail;
  evidence: string | null;
  contentSha256: string;
  prevHash: string | null;
  hash: string;
};

export type LogVerification = {
  ok: boolean;
  entries: number;
  head: string | null;
  problems: string[];
};

/** JSON with object keys sorted at every level. Arrays keep their order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("non-finite number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new Error("unsupported value");
}

function contentOf(entry: Pick<PublicLogEntry, "v" | "seq" | "ts" | "actor" | "action" | "detail" | "evidence">) {
  return {
    v: entry.v,
    seq: entry.seq,
    ts: entry.ts,
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
    evidence: entry.evidence,
  };
}

export function contentSha256Of(entry: Parameters<typeof contentOf>[0]): string {
  return fingerprint(canonicalJson(contentOf(entry)));
}

export function lineHash(v: 1, seq: number, contentSha256: string, prevHash: string | null): string {
  return fingerprint(canonicalJson({ v, seq, contentSha256, prevHash }));
}

export function runUrl(repository: string | undefined, runId: string | undefined): string | null {
  if (repository !== REPO_SLUG || typeof runId !== "string") {
    return null;
  }
  const url = `https://github.com/${REPO_SLUG}/actions/runs/${runId}`;
  return RUN_URL.test(url) ? url : null;
}

export function normalizeCommit(value: string | null | undefined): string | null {
  return typeof value === "string" && SHA40.test(value) ? value : null;
}

export function buildPublicLogEntry(input: {
  action?: "daily-status" | "genesis";
  seq: number;
  ts: string;
  detail: DailyDetail;
  evidence: string | null;
  prevHash: string | null;
}): PublicLogEntry {
  const base = {
    v: 1 as const,
    seq: input.seq,
    ts: input.ts,
    actor: "orvupi-agent" as const,
    action: input.action ?? ("daily-status" as const),
    detail: input.detail,
    evidence: input.evidence,
  };
  const contentSha256 = contentSha256Of(base);
  return {
    ...base,
    contentSha256,
    prevHash: input.prevHash,
    hash: lineHash(1, input.seq, contentSha256, input.prevHash),
  };
}

export function serializeEntry(entry: PublicLogEntry): string {
  return canonicalJson(entry);
}

function isIsoUtc(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_UTC.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1000;
}

export function detailProblems(detail: unknown): string[] {
  if (!isRecord(detail) || !sameKeys(detail, ["mode", "commit", "killSwitch", "drill", "note"])) {
    return ["detail: forma incorrecta"];
  }
  const problems: string[] = [];
  if (detail.mode !== "prototipo") {
    problems.push("detail.mode: debe ser prototipo");
  }
  if (detail.commit !== null && normalizeCommit(detail.commit as string) === null) {
    problems.push("detail.commit: no es un SHA completo");
  }
  const ks = detail.killSwitch;
  if (
    !isRecord(ks) ||
    !sameKeys(ks, ["readable", "engaged"]) ||
    typeof ks.readable !== "boolean" ||
    (ks.readable ? typeof ks.engaged !== "boolean" : ks.engaged !== null)
  ) {
    problems.push("detail.killSwitch: forma incorrecta");
  }
  const drill = detail.drill;
  if (!isRecord(drill) || !sameKeys(drill, ["ran", "ok", "steps", "passed"]) || typeof drill.ran !== "boolean") {
    problems.push("detail.drill: forma incorrecta");
  } else if (drill.ran) {
    if (typeof drill.ok !== "boolean" || !isCount(drill.steps) || !isCount(drill.passed) || drill.passed > drill.steps) {
      problems.push("detail.drill: valores incorrectos");
    } else if (drill.ok !== (drill.steps > 0 && drill.passed === drill.steps)) {
      problems.push("detail.drill: ok no cuadra con los pasos");
    }
  } else if (drill.ok !== null || drill.steps !== 0 || drill.passed !== 0) {
    problems.push("detail.drill: un simulacro no ejecutado no lleva resultado");
  }
  if (isRecord(ks) && isRecord(drill) && drill.ran === true && !(ks.readable === true && ks.engaged === false)) {
    problems.push("detail.drill: no se ejecuta con el kill-switch activado o ilegible");
  }
  if (typeof detail.note !== "string" || detail.note.length < 1 || detail.note.length > 400) {
    problems.push("detail.note: longitud incorrecta");
  }
  return problems;
}

export function splitLines(text: string): { lines: string[]; problem: string | null } {
  if (text.length === 0) {
    return { lines: [], problem: null };
  }
  if (!text.endsWith("\n")) {
    return { lines: [], problem: "el archivo no termina en salto de línea" };
  }
  if (text.includes("\r")) {
    return { lines: [], problem: "el archivo tiene retornos de carro" };
  }
  return { lines: text.slice(0, -1).split("\n"), problem: null };
}

export function parseLogText(text: string): { entries: PublicLogEntry[]; lines: string[]; problems: string[] } {
  const split = splitLines(text);
  if (split.problem) {
    return { entries: [], lines: [], problems: [split.problem] };
  }
  const entries: PublicLogEntry[] = [];
  const problems: string[] = [];
  let prev: PublicLogEntry | null = null;
  split.lines.forEach((line, index) => {
    const n = index + 1;
    const where = `línea ${n}`;
    if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
      problems.push(`${where}: demasiado larga`);
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch {
      problems.push(`${where}: no es JSON`);
      return;
    }
    if (
      !isRecord(value) ||
      !sameKeys(value, ["v", "seq", "ts", "actor", "action", "detail", "evidence", "contentSha256", "prevHash", "hash"])
    ) {
      problems.push(`${where}: forma incorrecta`);
      return;
    }
    if (canonicalJson(value) !== line) {
      problems.push(`${where}: no está en forma canónica`);
    }
    const genesis = n === 1 && value.action === "genesis";
    if (value.v !== 1 || value.actor !== "orvupi-agent" || (value.action !== "daily-status" && !genesis)) {
      problems.push(`${where}: v, actor o action no admitidos`);
    }
    if (genesis && (value.evidence !== null || !isRecord(value.detail) || value.detail.note !== GENESIS_NOTE)) {
      problems.push(`${where}: la entrada génesis no es la acordada`);
    }
    if (value.seq !== n) {
      problems.push(`${where}: seq debería ser ${n}`);
    }
    if (!isIsoUtc(value.ts)) {
      problems.push(`${where}: fecha no válida`);
    } else if (prev && prev.action !== "genesis" && value.ts < prev.ts) {
      problems.push(`${where}: fecha anterior a la línea previa`);
    }
    if (value.evidence !== null && (typeof value.evidence !== "string" || !RUN_URL.test(value.evidence))) {
      problems.push(`${where}: evidence solo puede ser una ejecución de Actions de ${REPO_SLUG}`);
    }
    for (const problem of detailProblems(value.detail)) {
      problems.push(`${where}: ${problem}`);
    }
    if (typeof value.contentSha256 !== "string" || !HEX64.test(value.contentSha256)) {
      problems.push(`${where}: contentSha256 no válido`);
      return;
    }
    if (typeof value.hash !== "string" || !HEX64.test(value.hash)) {
      problems.push(`${where}: hash no válido`);
      return;
    }
    const entry = value as unknown as PublicLogEntry;
    if (contentSha256Of(entry) !== entry.contentSha256) {
      problems.push(`${where}: contentSha256 no coincide con el contenido`);
    }
    const expectedPrev = prev ? prev.hash : null;
    if (entry.prevHash !== expectedPrev) {
      problems.push(`${where}: prevHash no enlaza con la línea anterior`);
    }
    if (lineHash(1, n, entry.contentSha256, entry.prevHash) !== entry.hash) {
      problems.push(`${where}: hash no coincide`);
    }
    entries.push(entry);
    prev = entry;
  });
  return { entries, lines: split.lines, problems };
}

export function verifyLogText(text: string): LogVerification {
  const parsed = parseLogText(text);
  const last = parsed.entries[parsed.entries.length - 1];
  return {
    ok: parsed.problems.length === 0,
    entries: parsed.entries.length,
    head: last ? last.hash : null,
    problems: parsed.problems,
  };
}

export function prefixSha256(lines: readonly string[], count: number): string {
  return fingerprint(`${lines.slice(0, count).join("\n")}\n`);
}

export function anchorName(entry: Pick<PublicLogEntry, "seq" | "ts">): string {
  return `${entry.ts.slice(0, 10)}-${String(entry.seq).padStart(6, "0")}.txt`;
}

export function buildAnchorText(lines: readonly string[], entry: PublicLogEntry): string {
  return [
    ANCHOR_HEADER,
    `entries: ${entry.seq}`,
    `head: ${entry.hash}`,
    `log-sha256: ${prefixSha256(lines, entry.seq)}`,
    "",
  ].join("\n");
}

export function verifyAnchors(logText: string, anchors: ReadonlyMap<string, string>): string[] {
  const parsed = parseLogText(logText);
  const problems: string[] = [];
  for (const [name, text] of anchors) {
    const match = ANCHOR_NAME.exec(name);
    if (!match) {
      problems.push(`ancla ${name}: nombre no admitido`);
      continue;
    }
    const seq = Number(match[2]);
    const entry = parsed.entries[seq - 1];
    if (!entry || entry.seq !== seq) {
      problems.push(`ancla ${name}: no existe la entrada ${seq}`);
      continue;
    }
    if (entry.ts.slice(0, 10) !== match[1]) {
      problems.push(`ancla ${name}: la fecha no coincide con la entrada`);
    }
    if (text !== buildAnchorText(parsed.lines, entry)) {
      problems.push(`ancla ${name}: no coincide con el log`);
    }
  }
  return problems;
}

export type LogsTree = ReadonlyMap<string, Buffer>;

export type UpdateCheck = { ok: boolean; newEntries: number; problems: string[] };

/**
 * Decides whether `next` is an allowed update of `current` (paths relative to logs/).
 * Allowed: append lines to the log; add anchors for new entries; add .ots for
 * anchors; change an existing .ots (OpenTimestamps upgrade). Nothing else.
 */
/** La cadena anterior termina en PREVIOUS_CHAIN_HEAD y la nueva empieza con la génesis ORVUPI. */
export function isRegenesis(oldLog: string, newLog: string): boolean {
  const oldLines = oldLog.trim().split("\n");
  const newFirst = newLog.split("\n")[0] ?? "";
  try {
    const last = JSON.parse(oldLines[oldLines.length - 1] ?? "") as { hash?: unknown };
    const first = JSON.parse(newFirst) as { action?: unknown; seq?: unknown; detail?: { note?: unknown } };
    return last.hash === PREVIOUS_CHAIN_HEAD && first.action === "genesis" && first.seq === 1 && first.detail?.note === GENESIS_NOTE;
  } catch {
    return false;
  }
}

export function checkLogsUpdate(current: LogsTree, next: LogsTree, maxNewEntries: number | null): UpdateCheck {
  const problems: string[] = [];
  const allowed = (p: string) =>
    p === LOG_FILE || new RegExp(`^${ANCHOR_DIR}/\\d{4}-\\d{2}-\\d{2}-\\d{6}\\.txt(\\.ots)?$`).test(p);
  for (const p of next.keys()) {
    if (!allowed(p)) {
      problems.push(`archivo no admitido en logs/: ${p}`);
    }
  }
  for (const p of current.keys()) {
    if (!next.has(p)) {
      problems.push(`no se puede borrar logs/${p}`);
    }
  }
  const oldLog = current.get(LOG_FILE)?.toString("utf8") ?? "";
  const newLog = next.get(LOG_FILE)?.toString("utf8") ?? "";
  if (isRegenesis(oldLog, newLog)) {
    // Cambio único del 16-10-2026: la cadena anterior (tag pre-orvupi-2026-10-16) se sustituye
    // por la cadena ORVUPI, que empieza con la entrada génesis que cita su último hash.
    const kept = problems.filter((problem) => !problem.startsWith("no se puede borrar"));
    problems.length = 0;
    problems.push(...kept);
    const verified = verifyLogText(newLog);
    problems.push(...verified.problems);
    const anchors = new Map<string, string>();
    for (const [p, data] of next) {
      if (p.startsWith(`${ANCHOR_DIR}/`) && p.endsWith(".txt")) anchors.set(p.slice(ANCHOR_DIR.length + 1), data.toString("utf8"));
    }
    problems.push(...verifyAnchors(newLog, anchors));
    return { ok: problems.length === 0, newEntries: verified.entries, problems };
  }
  if (!newLog.startsWith(oldLog)) {
    problems.push("el log no es solo-añadir: cambia o borra líneas existentes");
  }
  const oldCount = parseLogText(oldLog).entries.length;
  const verified = verifyLogText(newLog);
  problems.push(...verified.problems);
  const newEntries = verified.entries - oldCount;
  if (maxNewEntries !== null && newEntries > maxNewEntries) {
    problems.push(`demasiadas entradas nuevas: ${newEntries} (máximo ${maxNewEntries})`);
  }
  const anchors = new Map<string, string>();
  for (const [p, data] of next) {
    if (p.startsWith(`${ANCHOR_DIR}/`) && p.endsWith(".txt")) {
      if (data.length > MAX_ANCHOR_BYTES) {
        problems.push(`ancla demasiado grande: ${p}`);
      }
      anchors.set(p.slice(ANCHOR_DIR.length + 1), data.toString("utf8"));
      const old = current.get(p);
      if (old && !old.equals(data)) {
        problems.push(`no se puede cambiar un ancla existente: ${p}`);
      }
    }
    if (p.endsWith(".ots")) {
      if (data.length > MAX_OTS_BYTES) {
        problems.push(`sello demasiado grande: ${p}`);
      }
      if (!next.has(p.slice(0, -4))) {
        problems.push(`sello sin ancla: ${p}`);
      }
    }
  }
  problems.push(...verifyAnchors(newLog, anchors));
  return { ok: problems.length === 0, newEntries, problems };
}
