import assert from "node:assert/strict";
import test from "node:test";
import {
  addDefaultMyIssuesViewSql,
  removeDefaultMyIssuesViewSql,
} from "./1783297320000-add-default-my-issues-view.js";

test("default My issues migration adds a per-user system view key", () => {
  const sql = addDefaultMyIssuesViewSql.join("\n");
  assert.match(sql, /ADD COLUMN "system_key" text/);
  assert.match(sql, /"workspace_id", "user_id", "system_key"/);
  assert.match(sql, /WHERE "system_key" IS NOT NULL/);
});

test("default My issues migration is reversible", () => {
  const sql = removeDefaultMyIssuesViewSql.join("\n");
  assert.match(sql, /DROP INDEX "uq_saved_views_workspace_user_system_key"/);
  assert.match(sql, /DROP COLUMN "system_key"/);
});
