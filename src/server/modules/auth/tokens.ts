import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes from the OS CSPRNG, base64url: 43 characters, 256 bits of entropy. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Only this hash is stored. The token itself exists only in the user's cookie. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashIp(ip: string, secret: string | undefined): string {
  return createHash("sha256").update(`${secret ?? ""}:${ip}`, "utf8").digest("hex");
}
