import { decodeUtf8, encodeUtf8 } from "../security/bytes";
import { WorkError } from "../security/errors";
import { sanitizeName } from "../security/names";

export const QUESTION_KINDS = ["short", "long", "choice", "check", "dropdown", "scale", "date", "time", "grid", "section"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export type Question = {
  id: string;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[];
};

export type FormResponse = {
  id: string;
  at: string;
  answers: Record<string, string>;
};

export type FormFile = {
  format: "orvupi-form";
  version: 1;
  id: string;
  title: string;
  description: string;
  questions: Question[];
  responses: FormResponse[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function questionOf(value: unknown): Question | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const kind = QUESTION_KINDS.includes(value.kind as QuestionKind) ? (value.kind as QuestionKind) : "short";
  const options = Array.isArray(value.options)
    ? value.options.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 80)).slice(0, 8)
    : [];
  return {
    id: value.id.slice(0, 40),
    prompt: typeof value.prompt === "string" ? value.prompt.slice(0, 180) : "",
    kind,
    required: value.required === true,
    options: kind === "choice" || kind === "check" || kind === "dropdown" || kind === "grid" ? (options.length > 0 ? options : ["", ""]) : [],
  };
}

function responseOf(value: unknown): FormResponse | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.answers)) return null;
  const answers: Record<string, string> = {};
  for (const [key, answer] of Object.entries(value.answers)) {
    if (typeof answer === "string") answers[key.slice(0, 40)] = answer.slice(0, 2000);
  }
  return {
    id: value.id.slice(0, 40),
    at: typeof value.at === "string" ? value.at.slice(0, 40) : "",
    answers,
  };
}

export function createFormFile(input: { id: string; title: string }): FormFile {
  return {
    format: "orvupi-form",
    version: 1,
    id: input.id,
    title: sanitizeName(input.title),
    description: "",
    questions: [{ id: "q1", prompt: "", kind: "short", required: false, options: [] }],
    responses: [],
  };
}

export function serializeForm(file: FormFile): Uint8Array {
  return encodeUtf8(JSON.stringify({
    ...file,
    questions: file.questions.slice(0, 40),
    responses: file.responses.slice(0, 200),
  }));
}

export function parseForm(bytes: Uint8Array | string): FormFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof bytes === "string" ? bytes : decodeUtf8(bytes));
  } catch {
    throw new WorkError("invalid-format");
  }
  if (!isRecord(parsed) || parsed.format !== "orvupi-form") throw new WorkError("invalid-format");
  if (parsed.version !== 1) throw new WorkError("unsupported-version");
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string") throw new WorkError("invalid-format");
  const questions = Array.isArray(parsed.questions) ? parsed.questions.flatMap((entry) => {
    const question = questionOf(entry);
    return question ? [question] : [];
  }).slice(0, 40) : [];
  const responses = Array.isArray(parsed.responses) ? parsed.responses.flatMap((entry) => {
    const response = responseOf(entry);
    return response ? [response] : [];
  }).slice(0, 200) : [];
  return {
    format: "orvupi-form",
    version: 1,
    id: parsed.id,
    title: sanitizeName(parsed.title),
    description: typeof parsed.description === "string" ? parsed.description.slice(0, 500) : "",
    questions: questions.length > 0 ? questions : [{ id: "q1", prompt: "", kind: "short", required: false, options: [] }],
    responses,
  };
}

export function missingRequired(file: FormFile, answers: Record<string, string>): boolean {
  return file.questions.some((question) => question.kind !== "section" && question.required && (answers[question.id] ?? "").trim() === "");
}

export function answerCounts(file: FormFile, questionId: string): Array<{ label: string; count: number }> {
  const question = file.questions.find((item) => item.id === questionId);
  if (!question) return [];
  const labels = question.kind === "scale" ? ["1", "2", "3", "4", "5"] : question.options.filter(Boolean);
  return labels.map((label) => ({
    label,
    count: file.responses.filter((response) => (response.answers[questionId] ?? "").split("\n").includes(label) || response.answers[questionId] === label).length,
  }));
}
