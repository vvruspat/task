import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommentsTableSql,
  dropCommentsTableSql,
} from "./1783296240000-create-comments-table.js";

test("comments migration creates the comments table after task skills exist", () => {
  const sql = createCommentsTableSql.join("\n");
  const createTableStatements = createCommentsTableSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["comments"]);
  assert.match(sql, /CREATE TABLE "comments"/);
});

test("comments migration includes expected columns and tenant scoped constraints", () => {
  const sql = createCommentsTableSql.join("\n");

  assert.match(sql, /"id" uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"task_id" uuid NOT NULL/);
  assert.match(sql, /"author_user_id" uuid NOT NULL/);
  assert.match(sql, /"body" text NOT NULL/);
  assert.match(sql, /"created_at" timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(sql, /"updated_at" timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(
    sql,
    /CONSTRAINT "fk_comments_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_comments_task_workspace" FOREIGN KEY \("task_id", "workspace_id"\) REFERENCES "tasks" \("id", "workspace_id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_comments_author_user_id" FOREIGN KEY \("author_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
});

test("comments migration includes task and author lookup indexes", () => {
  const sql = createCommentsTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_comments_workspace_id_task_id" ON "comments" \("workspace_id", "task_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_comments_workspace_id_author_user_id" ON "comments" \("workspace_id", "author_user_id"\)/,
  );
});

test("comments migration down queries drop indexes before the table", () => {
  assert.deepEqual(dropCommentsTableSql, [
    `DROP INDEX "idx_comments_workspace_id_author_user_id"`,
    `DROP INDEX "idx_comments_workspace_id_task_id"`,
    `DROP TABLE "comments"`,
  ]);
});
