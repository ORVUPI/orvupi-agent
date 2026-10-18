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
  | "ai-unavailable";

export class WorkError extends Error {
  readonly code: WorkErrorCode;

  constructor(code: WorkErrorCode) {
    super(code);
    this.name = "WorkError";
    this.code = code;
  }
}

export function isWorkError(error: unknown): error is WorkError {
  return error instanceof WorkError;
}
