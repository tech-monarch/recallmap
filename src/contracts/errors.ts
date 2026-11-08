import { z } from "zod";

/** Stable error codes shared by the API and the UI. Add codes; never repurpose one. */
export const ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation_failed",
  "rate_limited",
  "conflict",
  "ai_unavailable",
  "unsupported_file",
  "payload_too_large",
  "processing_failed",
  "database_unavailable",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  rate_limited: 429,
  conflict: 409,
  ai_unavailable: 503,
  unsupported_file: 415,
  payload_too_large: 413,
  processing_failed: 422,
  database_unavailable: 503,
  internal: 500,
};

export const errorBodySchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;
