import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthEndpoint,
  requestPasswordReset,
  resetPassword,
  signInWithPassword,
} from "@/lib/auth/api";

describe("configurable auth API", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("requires a configured backend URL instead of falling back to demo auth", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    expect(() => getAuthEndpoint("signIn")).toThrow(
      "Authentication is not connected.",
    );
  });

  it("rejects credentials and paths in the public API base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://user:secret@api.example.test/v1");

    expect(() => getAuthEndpoint("signIn")).toThrow(
      "must be an origin only",
    );
  });

  it("sends sign-in credentials to the configured endpoint and requires a user response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "u-1", email: "a@example.test" } }), {
        status: 200,
      }),
    );

    await expect(signInWithPassword("a@example.test", "secret")).resolves.toEqual({
      user: { id: "u-1", email: "a@example.test" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/sign-in",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "a@example.test", password: "secret" }),
      }),
    );
  });

  it("surfaces backend errors without converting them into success", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "invalid_credentials", message: "Invalid credentials." },
        }),
        { status: 401 },
      ),
    );

    await expect(signInWithPassword("a@example.test", "wrong")).rejects.toThrow(
      "Invalid credentials.",
    );
  });

  it("submits the reset token and password to the configured endpoint", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(resetPassword("reset-token", "new-secret")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/password/reset",
      expect.objectContaining({
        body: JSON.stringify({ token: "reset-token", password: "new-secret" }),
      }),
    );
  });

  it("sends the explicit reset-page URL with the reset request", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "If the account exists, email was sent." }), {
        status: 202,
      }),
    );

    await requestPasswordReset(
      "a@example.test",
      "https://recallmap.example.test/auth/reset-password",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/password/forgot",
      expect.objectContaining({
        body: JSON.stringify({
          email: "a@example.test",
          redirectUrl: "https://recallmap.example.test/auth/reset-password",
        }),
      }),
    );
  });
});
