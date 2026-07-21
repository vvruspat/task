import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorCode,
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

test("auth backend failures are converted to stable localized error codes", () => {
  assert.equal(authErrorCode("/auth/register", 404), "backend_missing");
  assert.equal(authErrorCode("/auth/register", 409), "email_taken");
  assert.equal(authErrorCode("/auth/login", 401), "invalid_credentials");
});
