import assert from "node:assert/strict";
import test from "node:test";
import {
  addEmailPasswordAuthSql,
  dropEmailPasswordAuthSql,
} from "./1783297680000-add-email-password-auth.js";

test("email/password auth migration creates credentials, sessions, and normalized email uniqueness", () => {
  const migrationSql = addEmailPasswordAuthSql.join("\n");
  assert.match(migrationSql, /LOWER\("email"\)/u);
  assert.match(migrationSql, /password_credentials/u);
  assert.match(migrationSql, /auth_sessions/u);
});

test("email/password auth migration down path reverses its objects", () => {
  assert.deepEqual(dropEmailPasswordAuthSql, [
    `DROP INDEX "idx_auth_sessions_expires_at"`,
    `DROP INDEX "idx_auth_sessions_user_id"`,
    `DROP TABLE "auth_sessions"`,
    `DROP TABLE "password_credentials"`,
    `DROP INDEX "uq_users_normalized_email"`,
  ]);
});
