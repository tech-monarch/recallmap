import { describe, expect, it } from "vitest";
import { generateSessionToken, hashIp, hashSessionToken, SESSION_TOKEN_PATTERN } from "../../src/server/modules/auth/tokens";
import { buildSessionCookie, clearSessionCookie, readSessionCookie, sessionCookieName } from "../../src/server/modules/auth/session-cookie";

describe("session tokens", () => {
  it("are 256-bit base64url strings and unique", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateSessionToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) {
      expect(t).toMatch(SESSION_TOKEN_PATTERN);
      expect(Buffer.from(t, "base64url").length).toBe(32);
    }
  });

  it("hash deterministically to a hex SHA-256 that differs from the token", () => {
    const t = generateSessionToken();
    const h = hashSessionToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashSessionToken(t));
    expect(h).not.toContain(t);
    expect(hashSessionToken(t + "x")).not.toBe(h);
  });

  it("hashes IPs with the secret so they are not reversible by lookup", () => {
    expect(hashIp("1.2.3.4", "s1")).not.toBe(hashIp("1.2.3.4", "s2"));
    expect(hashIp("1.2.3.4", "s1")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("session cookie", () => {
  it("is HttpOnly, SameSite=Lax, Path=/ and Secure with the __Host- prefix when secure", () => {
    const c = buildSessionCookie("tok", { secure: true, maxAgeSeconds: 3600 });
    expect(c).toContain("__Host-rm_session=tok");
    for (const part of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age=3600"]) expect(c).toContain(part);
    expect(c).not.toContain("Domain=");
  });

  it("omits Secure and the prefix for local http", () => {
    const c = buildSessionCookie("tok", { secure: false, maxAgeSeconds: 10 });
    expect(c.startsWith("rm_session=tok")).toBe(true);
    expect(c).not.toContain("Secure");
    expect(c).toContain("HttpOnly");
  });

  it("clears with an expired date", () => {
    const c = clearSessionCookie(true);
    expect(c).toContain("Max-Age=0");
    expect(c).toContain("Expires=Thu, 01 Jan 1970");
    expect(c).toContain("__Host-rm_session=;");
  });

  it("reads only its own cookie", () => {
    expect(readSessionCookie("a=1; rm_session=abc; b=2", false)).toBe("abc");
    expect(readSessionCookie("rm_session=abc", true)).toBeNull();
    expect(readSessionCookie("__Host-rm_session=xyz", true)).toBe("xyz");
    expect(readSessionCookie(null, false)).toBeNull();
    expect(sessionCookieName(true)).toBe("__Host-rm_session");
  });
});
