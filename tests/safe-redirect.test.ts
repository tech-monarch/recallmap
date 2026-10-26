import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "@/lib/auth/safe-redirect";

describe("getSafeNextPath", () => {
  it.each([
    ["/auth/reset-password", "/auth/reset-password"],
    ["/dashboard?tab=1", "/dashboard?tab=1"],
    ["/dashboard/settings", "/dashboard/settings"],
  ])("accepts safe local path %s", (input, out) => {
    expect(getSafeNextPath(input)).toBe(out);
  });

  it.each([
    "https://evil.com",
    "http://evil.com/x",
    "//evil.com",
    "//evil.com/path",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    "/ok\nHost: evil.com",
    "/\t/evil.com",
    "data:text/html,hi",
  ])("rejects %j", (input) => {
    expect(getSafeNextPath(input)).toBeNull();
  });

  it("rejects null/undefined", () => {
    expect(getSafeNextPath(null)).toBeNull();
    expect(getSafeNextPath(undefined)).toBeNull();
  });
});
