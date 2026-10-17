import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";

export const NOTE_COLORS = ["#fff8ec", "#ffffff", "#fff0f5", "#e5f6ee", "#fff4e0", "#102032"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export type NoteCheck = { id: string; text: string; done: boolean };

export type NoteFile = {
  format: "orvupi-note";
  version: 1;
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  color: NoteColor;
  checks: NoteCheck[];
  label?: string;
  archived?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function noteInk(color: string): string {
  if (color === "#102032") return "#fff8ec";
  if (color === "#e5f6ee") return "#0b5d36";
  if (color === "#fff4e0") return "#7a4a00";
  return "#102032";
}

function colorOf(value: unknown): NoteColor {
  return NOTE_COLORS.includes(value as NoteColor) ? (value as NoteColor) : "#fff8ec";
}

export function createNoteFile(input: { id: string; title: string }): NoteFile {
  return {
    format: "orvupi-note",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    body: "",
    pinned: false,
    color: "#fff8ec",
    checks: [],
    label: "",
    archived: false,
  };
}

export function serializeNote(file: NoteFile): Uint8Array {
  return encodeUtf8(JSON.stringify({ ...file, checks: file.checks.slice(0, 40) }));
}

export function parseNote(bytes: Uint8Array | string): NoteFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-note") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string") throw new WorkError("invalid-format");
  const checks = Array.isArray(parsed.checks) ? parsed.checks.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string") return [];
    const check: NoteCheck = {
      id: entry.id.slice(0, 40),
      text: typeof entry.text === "string" ? entry.text.slice(0, 240) : "",
      done: entry.done === true,
    };
    return [check];
  }).slice(0, 40) : [];
  return {
    format: "orvupi-note",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    body: typeof parsed.body === "string" ? parsed.body.slice(0, 4000) : "",
    pinned: parsed.pinned === true,
    color: colorOf(parsed.color),
    checks,
    label: typeof parsed.label === "string" ? parsed.label.slice(0, 40) : "",
    archived: parsed.archived === true,
  };
}
