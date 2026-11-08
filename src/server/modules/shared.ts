import { z } from "zod";
import { AppError } from "../platform/errors";
import type { UserContext } from "../platform/request-context";

const uuid = z.string().uuid();

/**
 * Every repository function for user-owned data takes a UserContext and filters by ctx.userId.
 * There is deliberately no unscoped read or write of user data. Ownership is enforced here and in the
 * queries, never only in frontend routes or middleware.
 */
export function requireUser(ctx: UserContext): string {
  const parsed = uuid.safeParse(ctx?.userId);
  if (!parsed.success) throw new AppError("unauthenticated", "Sign in to continue.");
  return parsed.data;
}
