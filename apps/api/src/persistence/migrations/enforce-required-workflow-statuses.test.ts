import assert from "node:assert/strict";
import test from "node:test";
import { enforceRequiredWorkflowStatusesSql } from "./1783297560000-enforce-required-workflow-statuses.js";

test("required workflow migration creates Backlog and In progress for every project", () => {
  const sql = enforceRequiredWorkflowStatusesSql.join("\n");

  assert.match(sql, /'Backlog', '#64748B'/);
  assert.match(sql, /'In progress', '#0EA5E9'/);
  assert.match(sql, /WHERE NOT EXISTS/);
});

test("required workflow migration advances parents with active non-Backlog subtasks", () => {
  const sql = enforceRequiredWorkflowStatusesSql.join("\n");

  assert.match(sql, /UPDATE "tasks" parent/);
  assert.match(sql, /child\."parent_task_id" = parent\."id"/);
  assert.match(sql, /<> 'backlog'/);
  assert.match(sql, /child\."archived_at" IS NULL/);
});
