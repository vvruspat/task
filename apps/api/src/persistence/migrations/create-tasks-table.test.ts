import assert from "node:assert/strict";
import test from "node:test";
import { createTasksTableSql, dropTasksTableSql } from "./1783296120000-create-tasks-table.js";

test("tasks migration creates the tasks table after projects exist", () => {
  const createTableSql = createTasksTableSql.filter((sql) => sql.startsWith("CREATE TABLE"));

  assert.deepEqual(
    createTableSql.map((sql) => sql.match(/^CREATE TABLE "([^"]+)"/)?.[1]),
    ["tasks"],
  );
});

test("tasks migration includes expected columns and existing-table constraints", () => {
  const sql = createTasksTableSql.join("\n");

  assert.match(
    sql,
    /ALTER TABLE "projects" ADD CONSTRAINT "uq_projects_id_workspace_id" UNIQUE \("id", "workspace_id"\)/,
  );
  assert.match(
    sql,
    /ALTER TABLE "statuses" ADD CONSTRAINT "uq_statuses_id_workspace_id" UNIQUE \("id", "workspace_id"\)/,
  );
  assert.match(sql, /"parent_task_id" uuid/);
  assert.match(sql, /"source_skill_id" uuid/);
  assert.match(sql, /"source_skill_version_id" uuid/);
  assert.match(sql, /"metadata" jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_project_workspace" FOREIGN KEY \("project_id", "workspace_id"\) REFERENCES "projects" \("id", "workspace_id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_parent_task_workspace" FOREIGN KEY \("parent_task_id", "workspace_id"\) REFERENCES "tasks" \("id", "workspace_id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_status_workspace" FOREIGN KEY \("status_id", "workspace_id"\) REFERENCES "statuses" \("id", "workspace_id"\) ON DELETE SET NULL \("status_id"\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_assignee_user_id" FOREIGN KEY \("assignee_user_id"\) REFERENCES "users" \("id"\) ON DELETE SET NULL/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_tasks_created_by_user_id" FOREIGN KEY \("created_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
});

test("tasks migration defers task skill foreign keys until task skill tables exist", () => {
  const sql = createTasksTableSql.join("\n");

  assert.doesNotMatch(sql, /REFERENCES "task_skills"/);
  assert.doesNotMatch(sql, /REFERENCES "task_skill_versions"/);
});

test("tasks migration includes useful task tree indexes", () => {
  const sql = createTasksTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_tasks_workspace_id_project_id" ON "tasks" \("workspace_id", "project_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_tasks_workspace_id_parent_task_id" ON "tasks" \("workspace_id", "parent_task_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_tasks_workspace_id_status_id" ON "tasks" \("workspace_id", "status_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_tasks_workspace_id_assignee_user_id" ON "tasks" \("workspace_id", "assignee_user_id"\)/,
  );
  assert.match(sql, /CREATE INDEX "idx_tasks_metadata_gin" ON "tasks" USING GIN \("metadata"\)/);
});

test("tasks migration down queries drop indexes before the table", () => {
  assert.deepEqual(dropTasksTableSql, [
    `DROP INDEX "idx_tasks_metadata_gin"`,
    `DROP INDEX "idx_tasks_workspace_id_assignee_user_id"`,
    `DROP INDEX "idx_tasks_workspace_id_status_id"`,
    `DROP INDEX "idx_tasks_workspace_id_parent_task_id"`,
    `DROP INDEX "idx_tasks_workspace_id_project_id"`,
    `DROP TABLE "tasks"`,
    `ALTER TABLE "statuses" DROP CONSTRAINT "uq_statuses_id_workspace_id"`,
    `ALTER TABLE "projects" DROP CONSTRAINT "uq_projects_id_workspace_id"`,
  ]);
});
