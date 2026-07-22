import assert from "node:assert/strict";
import test from "node:test";
import {
  addEmailInvitationsSql,
  removeEmailInvitationsSql,
} from "./1783297800000-add-email-invitations.js";

test("email invitation migration adds recipient, revocation, and active uniqueness", () => {
  const sql = addEmailInvitationsSql.join("\n");
  assert.match(sql, /ADD COLUMN "email" text/);
  assert.match(sql, /ADD COLUMN "revoked_at" timestamptz/);
  assert.match(sql, /CHECK \("role" IN \('admin', 'member', 'guest'\)\)/);
  assert.match(sql, /CREATE UNIQUE INDEX "uq_invites_active_workspace_email"/);
  assert.match(sql, /WHERE "used_at" IS NULL AND "revoked_at" IS NULL/);
});

test("email invitation migration is reversible", () => {
  const sql = removeEmailInvitationsSql.join("\n");
  assert.match(sql, /DROP INDEX "uq_invites_active_workspace_email"/);
  assert.match(sql, /DROP COLUMN "revoked_at"/);
  assert.match(sql, /DROP COLUMN "email"/);
});
