import type { AuthSession, AuthSessionInfo } from "@task/api-client";

export const sessionCookieName = "task_session";
export const authenticatedUserIdHeader = "x-task-authenticated-user-id";

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
): Promise<{ session: AuthSession } | { error: string; status: number }> {
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
      error: "Сервис входа временно недоступен. Попробуйте ещё раз через минуту.",
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
    return { error: authErrorMessage(path, response.status), status: response.status };
  }
  if (!isAuthSession(responseBody)) {
    return { error: "Authentication service returned an invalid response.", status: 502 };
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

export function authErrorMessage(path: "/auth/login" | "/auth/register", status: number): string {
  if (status === 404) {
    return "Сервис входа ещё не запущен или не обновлён. Попробуйте позже.";
  }
  if (status >= 500) {
    return "Сервис входа временно недоступен. Попробуйте ещё раз через минуту.";
  }
  if (path === "/auth/register" && status === 409) {
    return "Аккаунт с таким email уже существует.";
  }
  if (path === "/auth/login" && status === 401) {
    return "Неверный email или пароль.";
  }
  if (status === 400) {
    return path === "/auth/register"
      ? "Проверьте имя, email и пароль. Пароль должен содержать от 8 до 128 символов."
      : "Проверьте формат email и пароля.";
  }
  return "Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.";
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
