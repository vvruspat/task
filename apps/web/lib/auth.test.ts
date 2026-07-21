import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorMessage,
  authenticatedUserIdHeader,
  readAuthenticatedUserId,
  readSessionToken,
} from "./auth.ts";

test("session cookie parser reads only the auth cookie", () => {
  const request = new Request("http://localhost", {
    headers: { cookie: "theme=dark; task_session=opaque-token; another=value" },
  });
  assert.equal(readSessionToken(request), "opaque-token");
});

test("authenticated user id is sourced from the proxy-owned request header", () => {
  const request = new Request("http://localhost", {
    headers: { [authenticatedUserIdHeader]: "11111111-1111-4111-8111-111111111111" },
  });
  assert.equal(readAuthenticatedUserId(request), "11111111-1111-4111-8111-111111111111");
});

test("auth backend failures are converted to actionable Russian messages", () => {
  assert.equal(
    authErrorMessage("/auth/register", 404),
    "Сервис входа ещё не запущен или не обновлён. Попробуйте позже.",
  );
  assert.equal(authErrorMessage("/auth/register", 409), "Аккаунт с таким email уже существует.");
  assert.equal(authErrorMessage("/auth/login", 401), "Неверный email или пароль.");
});
