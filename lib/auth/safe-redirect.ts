/**
 * Returns `next` only when it is a safe same-site path, otherwise `null`.
 *
 * Accepted:  "/auth/reset-password", "/dashboard?tab=1"
 * Rejected:  absolute URLs, "//evil.com", "/\evil.com", "javascript:", control
 *            characters, encoded slashes that would collapse into "//", etc.
 */
export function getSafeNextPath(
  next: string | null | undefined,
): string | null {
  if (!next || typeof next !== "string") return null;
  if (next.length > 2048) return null;

  // Must start with exactly one "/".
  if (!next.startsWith("/") || next.startsWith("//")) return null;

  // Backslashes are treated as "/" by browsers ("/\evil.com" => "//evil.com").
  if (next.includes("\\")) return null;

  // Control characters / whitespace tricks.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;

  // Final check: resolve against a dummy origin and make sure it stays there.
  try {
    const base = "http://safe.invalid";
    const resolved = new URL(next, base);
    if (resolved.origin !== base) return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}
