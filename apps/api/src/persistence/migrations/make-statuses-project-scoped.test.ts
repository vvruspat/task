import assert from "node:assert/strict";
import test from "node:test";
import {
  makeStatusesProjectScopedSql,
  restoreWorkspaceScopedStatusesSql,
} from "./1783296900000-make-statuses-project-scoped.js";

test("project status migration scopes statuses and task references to projects", () => {
  const sql = makeStatusesProjectScopedSql.join("\n");
  assert.match(sql, /ADD COLUMN "project_id" uuid/);
  assert.match(sql, /'Backlog'/);
  assert.match(sql, /'In progress'/);
  assert.match(sql, /'Done'/);
  assert.match(sql, /fk_tasks_status_project_workspace/);
  assert.match(sql, /uq_statuses_project_id_name/);
});

test("project status migration down restores workspace status schema", () => {
  const sql = restoreWorkspaceScopedStatusesSql.join("\n");
  assert.match(sql, /DROP COLUMN "project_id"/);
  assert.match(sql, /uq_statuses_workspace_id_name/);
});
