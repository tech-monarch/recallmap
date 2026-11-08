import { randomUUID } from "node:crypto";

export type RequestContext = Readonly<{ requestId: string; userId?: string }>;

const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "")}`;
}

/** Accept an inbound id only if it is a short, safe token; otherwise generate one. */
export function createRequestContext(inboundRequestId?: string | null, userId?: string): RequestContext {
  const requestId = inboundRequestId && SAFE_ID.test(inboundRequestId) ? inboundRequestId : newRequestId();
  return Object.freeze({ requestId, ...(userId ? { userId } : {}) });
}

/** Context for code that acts for a specific, already-authenticated user. */
export type UserContext = Readonly<{ requestId: string; userId: string }>;
