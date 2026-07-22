import type { AuthSession, AuthSessionInfo } from "@task/api-client";

export type AuthErrorCode =
  | "backend_missing"
  | "email_taken"
  | "generic"
  | "invalid_credentials"
  | "invalid_login"
  | "invalid_register"
  | "unavailable";

export const sessionCookieName = "task_session";
export const authenticatedUserIdHeader = "x-task-authenticated-user-id";
export const workspaceRequestPathHeader = "x-task-workspace-request-path";

export function apiBaseUrl(): string {
  return process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader === null) return null;
  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === sessionCookieName) {
      const value = valueParts.join("=");
      return value.length === 0 ? null : decodeURIComponent(value);
    }
  }
  return null;
}

export function readAuthenticatedUserId(request: Request): string | undefined {
  const userId = request.headers.get(authenticatedUserIdHeader);
  return userId === null || userId.length === 0 ? undefined : userId;
}

export async function resolveSession(request: Request): Promise<AuthSessionInfo | null> {
  const token = readSessionToken(request);
  if (token === null) return null;
  const response = await fetch(`${apiBaseUrl()}/auth/session`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return isAuthSessionInfo(body) ? body : null;
}

export async function createBackendSession(
  path: "/auth/login" | "/auth/register",
  body: unknown,
): Promise<{ session: AuthSession } | { error: AuthErrorCode; status: number }> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      body: JSON.stringify(body),
      headers: { accept: "application/json", "content-type": "application/json" },
      method: "POST",
      cache: "no-store",
    });
  } catch (error: unknown) {
    console.error("Authentication backend is unreachable.", { cause: error, path });
    return {
      error: "unavailable",
      status: 503,
    };
  }
  const responseBody: unknown = await response.json().catch((): null => null);
  if (!response.ok) {
    if (response.status === 404 || response.status >= 500) {
      console.error("Authentication backend rejected a configured route.", {
        backendMessage: readBackendMessage(responseBody),
        path,
        status: response.status,
      });
    }
    return { error: authErrorCode(path, response.status), status: response.status };
  }
  if (!isAuthSession(responseBody)) {
    return { error: "generic", status: 502 };
  }
  return { session: responseBody };
}

function isAuthUser(value: unknown): value is AuthSessionInfo["user"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

function isAuthSessionInfo(value: unknown): value is AuthSessionInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "expiresAt" in value &&
    typeof value.expiresAt === "string" &&
    "user" in value &&
    isAuthUser(value.user)
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isAuthSessionInfo(value) &&
    "token" in value &&
    typeof value.token === "string" &&
    value.token.length > 0
  );
}

export function authErrorCode(
  path: "/auth/login" | "/auth/register",
  status: number,
): AuthErrorCode {
  if (status === 404) {
    return "backend_missing";
  }
  if (status >= 500) {
    return "unavailable";
  }
  if (path === "/auth/register" && status === 409) {
    return "email_taken";
  }
  if (path === "/auth/login" && status === 401) {
    return "invalid_credentials";
  }
  if (status === 400) {
    return path === "/auth/register" ? "invalid_register" : "invalid_login";
  }
  return "generic";
}

function readBackendMessage(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  )
    return value.message;
  return null;
}
