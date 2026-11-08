import { ZodError } from "zod";
import { HTTP_STATUS_BY_CODE, type ErrorBody, type ErrorCode } from "../../contracts/errors";

/** Expected, user-presentable failure. The message must be safe to show. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: ErrorCode, message: string, options?: { details?: unknown; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = HTTP_STATUS_BY_CODE[code];
    this.details = options?.details;
  }
}

const DB_UNAVAILABLE_PG_CODES = new Set(["53300", "57P01", "57P02", "57P03", "08000", "08001", "08003", "08004", "08006", "08P01"]);
const DB_UNAVAILABLE_NODE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE"]);

export function isDatabaseUnavailable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && (DB_UNAVAILABLE_PG_CODES.has(code) || DB_UNAVAILABLE_NODE_CODES.has(code))) return true;
  if (err.cause && isDatabaseUnavailable(err.cause)) return true;
  return /connection terminated|timeout exceeded when trying to connect|remaining connection slots|too many clients|the database system is (starting|shutting)/i.test(
    err.message,
  );
}

/** Convert anything thrown into an AppError whose message is safe to return to a client. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError("validation_failed", "The request was not valid.", {
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (isDatabaseUnavailable(err)) {
    return new AppError("database_unavailable", "The database is temporarily unavailable. Please try again shortly.", { cause: err });
  }
  const code = err instanceof Error ? (err as { code?: unknown }).code : undefined;
  if (code === "23505") return new AppError("conflict", "That item already exists.", { cause: err });
  return new AppError("internal", "Something went wrong.", { cause: err });
}

export function toErrorBody(err: AppError, requestId: string): ErrorBody {
  return {
    error: {
      code: err.code,
      message: err.message,
      requestId,
      ...(err.details === undefined ? {} : { details: err.details }),
    },
  };
}
