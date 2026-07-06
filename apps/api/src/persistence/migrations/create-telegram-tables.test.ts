import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramTablesSql,
  dropTelegramTablesSql,
} from "./1783296540000-create-telegram-tables.js";

test("telegram migration creates identity table before chat table", () => {
  const createTableStatements = createTelegramTablesSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["telegram_identities", "telegram_chats"]);
});

test("telegram migration includes identity columns and constraints", () => {
  const sql = createTelegramTablesSql.join("\n");

  assert.match(sql, /"telegram_id" bigint NOT NULL/);
  assert.match(sql, /"telegram_username" text/);
  assert.match(sql, /"linked_at" timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(sql, /"last_seen_at" timestamptz/);
  assert.match(
    sql,
    /CONSTRAINT "fk_telegram_identities_user_id" FOREIGN KEY \("user_id"\) REFERENCES "users" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(sql, /CONSTRAINT "uq_telegram_identities_telegram_id" UNIQUE \("telegram_id"\)/);
});

test("telegram migration includes chat columns and tenant-scoped default project constraint", () => {
  const sql = createTelegramTablesSql.join("\n");

  assert.match(sql, /"telegram_chat_id" bigint NOT NULL/);
  assert.match(sql, /"default_project_id" uuid/);
  assert.match(sql, /"linked_by_user_id" uuid NOT NULL/);
  assert.match(
    sql,
    /CONSTRAINT "fk_telegram_chats_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_telegram_chats_default_project_workspace" FOREIGN KEY \("default_project_id", "workspace_id"\) REFERENCES "projects" \("id", "workspace_id"\) ON DELETE SET NULL \("default_project_id"\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_telegram_chats_linked_by_user_id" FOREIGN KEY \("linked_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
  assert.match(
    sql,
    /CONSTRAINT "uq_telegram_chats_telegram_chat_id" UNIQUE \("telegram_chat_id"\)/,
  );
});

test("telegram migration includes identity and chat lookup indexes", () => {
  const sql = createTelegramTablesSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_telegram_identities_user_id" ON "telegram_identities" \("user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_telegram_chats_workspace_id" ON "telegram_chats" \("workspace_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_telegram_chats_default_project_id" ON "telegram_chats" \("default_project_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_telegram_chats_linked_by_user_id" ON "telegram_chats" \("linked_by_user_id"\)/,
  );
});

test("telegram migration down queries drop indexes before tables", () => {
  assert.deepEqual(dropTelegramTablesSql, [
    `DROP INDEX "idx_telegram_chats_linked_by_user_id"`,
    `DROP INDEX "idx_telegram_chats_default_project_id"`,
    `DROP INDEX "idx_telegram_chats_workspace_id"`,
    `DROP INDEX "idx_telegram_identities_user_id"`,
    `DROP TABLE "telegram_chats"`,
    `DROP TABLE "telegram_identities"`,
  ]);
});
