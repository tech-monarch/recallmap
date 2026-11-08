import type { ZodType } from "zod";
import { AppError, toAppError, toErrorBody } from "../platform/errors";
import { createLogger, type Logger } from "../platform/logger";
import { createRequestContext, type RequestContext } from "../platform/request-context";
import { getConfig } from "../platform/config";

/**
 * Thin transport helpers. They use Web-standard Request/Response only, so they carry no Next.js dependency
 * and the API can later be mounted by another HTTP framework.
 */

const MAX_JSON_BYTES = 1_000_000;

let sharedLogger: Logger | undefined;
function defaultLogger(): Logger {
  if (!sharedLogger) {
    let level: "debug" | "info" | "warn" | "error" | "silent" = "info";
    try {
      level = getConfig().logLevel;
    } catch {
      /* invalid config must not prevent error handling */
    }
    sharedLogger = createLogger({ level, includeStack: process.env.NODE_ENV !== "production" });
  }
  return sharedLogger;
}

export type RouteHandler = (req: Request, ctx: RequestContext) => Promise<Response | Record<string, unknown> | unknown[]>;

export function route(handler: RouteHandler, options: { logger?: Logger } = {}): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const ctx = createRequestContext(req.headers.get("x-request-id"));
    const log = (options.logger ?? defaultLogger()).child({ requestId: ctx.requestId });
    const started = Date.now();
    try {
      const result = await handler(req, ctx);
      const res = result instanceof Response ? result : Response.json(result);
      res.headers.set("x-request-id", ctx.requestId);
      log.debug("request completed", { method: req.method, status: res.status, ms: Date.now() - started });
      return res;
    } catch (err) {
      const appErr = toAppError(err);
      const fields = { method: req.method, status: appErr.status, code: appErr.code, ms: Date.now() - started };
      if (appErr.status >= 500) log.error("request failed", { ...fields, err: appErr.cause instanceof Error ? appErr.cause : appErr });
      else log.warn("request rejected", fields);
      const res = Response.json(toErrorBody(appErr, ctx.requestId), { status: appErr.status });
      res.headers.set("x-request-id", ctx.requestId);
      return res;
    }
  };
}

export async function parseJsonBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_JSON_BYTES) throw new AppError("payload_too_large", "The request body is too large.");
  const text = await req.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError("payload_too_large", "The request body is too large.");
  let json: unknown;
  try {
    json = text.length === 0 ? {} : JSON.parse(text);
  } catch {
    throw new AppError("validation_failed", "The request body must be valid JSON.");
  }
  return schema.parse(json);
}

export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}
