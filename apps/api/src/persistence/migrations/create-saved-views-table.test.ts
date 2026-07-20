import assert from "node:assert/strict";
import test from "node:test";
import {
  createSavedViewsTableSql,
  dropSavedViewsTableSql,
} from "./1783296720000-create-saved-views-table.js";

test("saved views migration creates a user-owned workspace view table", () => {
  const sql = createSavedViewsTableSql.join("\n");
  assert.match(sql, /CREATE TABLE "saved_views"/);
  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"user_id" uuid NOT NULL/);
  assert.match(sql, /"project_id" uuid/);
  assert.match(sql, /"settings" jsonb NOT NULL/);
  assert.match(sql, /CHECK \("layout" IN \('list', 'board'\)\)/);
  assert.match(sql, /REFERENCES "projects" \("id"\) ON DELETE CASCADE/);
});

test("saved views migration adds owner and project indexes", () => {
  const sql = createSavedViewsTableSql.join("\n");
  assert.match(sql, /idx_saved_views_workspace_id_user_id/);
  assert.match(sql, /idx_saved_views_project_id/);
  assert.deepEqual(dropSavedViewsTableSql, [
    `DROP INDEX "idx_saved_views_project_id"`,
    `DROP INDEX "idx_saved_views_workspace_id_user_id"`,
    `DROP TABLE "saved_views"`,
  ]);
});
