/**
 * An expected, user-facing failure (validation, permission, "already done").
 * Actions turn these into `{ ok: false, error }`; anything else is a bug and
 * bubbles up to the error boundary.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export type AppErrorCode = "validation" | "not_found" | "forbidden" | "conflict";

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
