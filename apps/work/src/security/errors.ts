export type WorkErrorCode =
  | "invalid-name"
  | "too-large"
  | "invalid-format"
  | "unsupported-version"
  | "storage"
  | "not-found"
  | "corrupt-file"
  | "unsupported-type"
  | "image-too-large"
  | "image-type"
  | "invalid-link"
  | "invalid-move"
  | "ai-unavailable"
  | "quota";

export class WorkError extends Error {
  readonly code: WorkErrorCode;
  readonly vars?: Record<string, string | number>;

  constructor(code: WorkErrorCode, vars?: Record<string, string | number>) {
    super(code);
    this.name = "WorkError";
    this.code = code;
    this.vars = vars;
  }
}

export function isWorkError(error: unknown): error is WorkError {
  return error instanceof WorkError;
}
