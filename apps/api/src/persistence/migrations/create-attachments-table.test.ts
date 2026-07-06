import assert from "node:assert/strict";
import test from "node:test";
import {
  createAttachmentsTableSql,
  dropAttachmentsTableSql,
} from "./1783296300000-create-attachments-table.js";

test("attachments migration creates the attachments table after comments exist", () => {
  const createTableStatements = createAttachmentsTableSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["attachments"]);
});

test("attachments migration includes expected columns and constraints", () => {
  const sql = createAttachmentsTableSql.join("\n");

  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"target_type" text NOT NULL/);
  assert.match(sql, /"target_id" uuid NOT NULL/);
  assert.match(sql, /"kind" text NOT NULL/);
  assert.match(sql, /"title" text/);
  assert.match(sql, /"url" text/);
  assert.match(sql, /"storage_key" text/);
  assert.match(sql, /"telegram_file_id" text/);
  assert.match(sql, /"mime_type" text/);
  assert.match(sql, /"size_bytes" bigint/);
  assert.match(
    sql,
    /CONSTRAINT "chk_attachments_target_type" CHECK \("target_type" IN \('task', 'project', 'comment'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "chk_attachments_kind" CHECK \("kind" IN \('file', 'link', 'telegram_file'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_attachments_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_attachments_created_by_user_id" FOREIGN KEY \("created_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
});

test("attachments migration leaves polymorphic target integrity to application validation", () => {
  const sql = createAttachmentsTableSql.join("\n");

  assert.doesNotMatch(sql, /FOREIGN KEY \("target_id"\)/);
  assert.doesNotMatch(sql, /REFERENCES "tasks"/);
  assert.doesNotMatch(sql, /REFERENCES "projects"/);
  assert.doesNotMatch(sql, /REFERENCES "comments"/);
});

test("attachments migration includes target and creator lookup indexes", () => {
  const sql = createAttachmentsTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_attachments_workspace_id_target" ON "attachments" \("workspace_id", "target_type", "target_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_attachments_workspace_id_created_by_user_id" ON "attachments" \("workspace_id", "created_by_user_id"\)/,
  );
});

test("attachments migration down queries drop indexes before the table", () => {
  assert.deepEqual(dropAttachmentsTableSql, [
    `DROP INDEX "idx_attachments_workspace_id_created_by_user_id"`,
    `DROP INDEX "idx_attachments_workspace_id_target"`,
    `DROP TABLE "attachments"`,
  ]);
});
