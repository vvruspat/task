import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectsTableSql,
  dropProjectsTableSql,
} from "./1783296060000-create-projects-table.js";

test("projects migration creates the projects table after core tables exist", () => {
  const createTableSql = createProjectsTableSql.filter((sql) => sql.startsWith("CREATE TABLE"));

  assert.deepEqual(
    createTableSql.map((sql) => sql.match(/^CREATE TABLE "([^"]+)"/)?.[1]),
    ["projects"],
  );
});

test("projects migration includes expected constraints and indexes", () => {
  const sql = createProjectsTableSql.join("\n");

  assert.match(
    sql,
    /CONSTRAINT "fk_projects_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_projects_created_by_user_id" FOREIGN KEY \("created_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
  assert.match(sql, /CREATE INDEX "idx_projects_workspace_id" ON "projects" \("workspace_id"\)/);
  assert.match(
    sql,
    /CREATE INDEX "idx_projects_created_by_user_id" ON "projects" \("created_by_user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_projects_workspace_id_archived_at" ON "projects" \("workspace_id", "archived_at"\)/,
  );
});

test("projects migration down queries drop indexes before the table", () => {
  assert.deepEqual(dropProjectsTableSql, [
    `DROP INDEX "idx_projects_workspace_id_archived_at"`,
    `DROP INDEX "idx_projects_created_by_user_id"`,
    `DROP INDEX "idx_projects_workspace_id"`,
    `DROP TABLE "projects"`,
  ]);
});
