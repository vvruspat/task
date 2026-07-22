import assert from "node:assert/strict";
import test from "node:test";
import { isPublicRequest } from "./public-route.ts";

test("invitation previews and auth pages are public while invitation acceptance stays private", () => {
  assert.equal(isPublicRequest("/invite/token", "GET"), true);
  assert.equal(isPublicRequest("/api/invitations/token", "GET"), true);
  assert.equal(isPublicRequest("/api/invitations/token", "POST"), false);
  assert.equal(isPublicRequest("/register", "GET"), true);
  assert.equal(isPublicRequest("/api/auth/session", "GET"), true);
});
