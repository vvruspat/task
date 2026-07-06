import assert from "node:assert/strict";
import test from "node:test";
import {
  createInvitesTableSql,
  dropInvitesTableSql,
} from "./1783296600000-create-invites-table.js";

test("invites migration creates the invites table after telegram tables exist", () => {
  const createTableStatements = createInvitesTableSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["invites"]);
});

test("invites migration includes expected columns and constraints", () => {
  const sql = createInvitesTableSql.join("\n");

  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"invited_user_id" uuid/);
  assert.match(sql, /"token_hash" text NOT NULL/);
  assert.match(sql, /"role" text NOT NULL/);
  assert.match(sql, /"expires_at" timestamptz NOT NULL/);
  assert.match(sql, /"used_at" timestamptz/);
  assert.match(
    sql,
    /CONSTRAINT "chk_invites_role" CHECK \("role" IN \('owner', 'admin', 'member', 'guest'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_invites_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_invites_invited_user_id" FOREIGN KEY \("invited_user_id"\) REFERENCES "users" \("id"\) ON DELETE SET NULL/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_invites_created_by_user_id" FOREIGN KEY \("created_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
  assert.match(sql, /CONSTRAINT "uq_invites_token_hash" UNIQUE \("token_hash"\)/);
});

test("invites migration includes expiry, invited user, and creator lookup indexes", () => {
  const sql = createInvitesTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_invites_workspace_id_expires_at" ON "invites" \("workspace_id", "expires_at"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_invites_workspace_id_invited_user_id" ON "invites" \("workspace_id", "invited_user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_invites_created_by_user_id" ON "invites" \("created_by_user_id"\)/,
  );
});

test("invites migration down queries drop indexes before table", () => {
  assert.deepEqual(dropInvitesTableSql, [
    `DROP INDEX "idx_invites_created_by_user_id"`,
    `DROP INDEX "idx_invites_workspace_id_invited_user_id"`,
    `DROP INDEX "idx_invites_workspace_id_expires_at"`,
    `DROP TABLE "invites"`,
  ]);
});
