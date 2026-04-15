export type ErrorCode =
  | "NETWORK"
  | "HTTP"
  | "AUTH"
  | "WS"
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "GRAPHICS"
  | "DATABASE"
  | "UNKNOWN";

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
  httpStatus?: number;
}

export const err = (
  code: ErrorCode,
  message: string,
  details?: unknown,
  retryable?: boolean,
  httpStatus?: number
): AppError => ({ code, message, details, retryable, httpStatus });

export function normalizeError(e: unknown): AppError {
  if (typeof e === "object" && e && "code" in e && "message" in e) {
    return e as AppError;
  }

  if (e instanceof Error) {
    return err("UNKNOWN", e.message, e.stack, false);
  }

  return err("UNKNOWN", "Unknown error", e, false);
}
