/**
 * Cookie construction for the opaque session token.
 * Secure environments use the "__Host-" prefix (requires Secure, Path=/, and no Domain attribute).
 */
export type CookieOptions = Readonly<{ secure: boolean; maxAgeSeconds: number }>;

export function sessionCookieName(secure: boolean): string {
  return secure ? "__Host-rm_session" : "rm_session";
}

export function buildSessionCookie(token: string, opts: CookieOptions): string {
  const parts = [`${sessionCookieName(opts.secure)}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${sessionCookieName(secure)}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionCookie(cookieHeader: string | null | undefined, secure: boolean): string | null {
  if (!cookieHeader) return null;
  const name = sessionCookieName(secure);
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim() || null;
  }
  return null;
}
