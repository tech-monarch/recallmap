export type AuthEndpoint =
  | "signIn"
  | "signUp"
  | "forgotPassword"
  | "resetPassword"
  | "google";

type UserResponse = {
  user: {
    id: string;
    email: string;
  };
};

const endpointPaths: Record<AuthEndpoint, string> = {
  signIn: process.env.NEXT_PUBLIC_AUTH_SIGN_IN_PATH || "/api/auth/sign-in",
  signUp: process.env.NEXT_PUBLIC_AUTH_SIGN_UP_PATH || "/api/auth/sign-up",
  forgotPassword:
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_PATH ||
    "/api/auth/password/forgot",
  resetPassword:
    process.env.NEXT_PUBLIC_AUTH_RESET_PASSWORD_PATH ||
    "/api/auth/password/reset",
  google: process.env.NEXT_PUBLIC_AUTH_GOOGLE_PATH || "/api/auth/google",
};

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

export function getAuthEndpoint(endpoint: AuthEndpoint): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new AuthApiError(
      "Authentication is not connected. Configure NEXT_PUBLIC_API_BASE_URL to use your backend.",
    );
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new AuthApiError(
      "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.",
    );
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") {
    throw new AuthApiError(
      "NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.",
    );
  }
  if (
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  ) {
    throw new AuthApiError(
      "NEXT_PUBLIC_API_BASE_URL must be an origin only, without credentials, path, query, or fragment.",
    );
  }

  const path = endpointPaths[endpoint];
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new AuthApiError(
      `The configured ${endpoint} endpoint must be a same-site path beginning with one slash.`,
    );
  }

  const url = new URL(path, base);
  if (url.origin !== base.origin) {
    throw new AuthApiError(
      `The configured ${endpoint} endpoint must use the API base URL origin.`,
    );
  }
  return url.toString();
}

async function post(
  endpoint: Exclude<AuthEndpoint, "google">,
  body: Record<string, string>,
): Promise<unknown> {
  const url = getAuthEndpoint(endpoint);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      "Could not reach the authentication backend. Check the API URL and network connection.",
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new AuthApiError(
        "The authentication backend returned an invalid JSON response.",
      );
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : `Authentication request failed (${response.status}).`;
    throw new AuthApiError(errorMessage);
  }

  return payload;
}

function requireUserResponse(payload: unknown): UserResponse {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("user" in payload) ||
    typeof payload.user !== "object" ||
    payload.user === null ||
    !("id" in payload.user) ||
    typeof payload.user.id !== "string" ||
    !("email" in payload.user) ||
    typeof payload.user.email !== "string"
  ) {
    throw new AuthApiError(
      "The authentication backend did not return the required user response.",
    );
  }
  return { user: { id: payload.user.id, email: payload.user.email } };
}

export async function signInWithPassword(email: string, password: string) {
  const payload = await post("signIn", { email, password });
  return requireUserResponse(payload);
}

export async function signUpWithPassword(
  name: string,
  email: string,
  password: string,
) {
  const payload = await post("signUp", { name, email, password });
  return requireUserResponse(payload);
}

export async function requestPasswordReset(
  email: string,
  redirectUrl: string,
) {
  await post("forgotPassword", { email, redirectUrl });
}

export async function resetPassword(token: string, password: string) {
  await post("resetPassword", { token, password });
}

export function getAuthErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The authentication request could not be completed.";
}
