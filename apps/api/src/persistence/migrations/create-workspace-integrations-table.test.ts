import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceIntegrationsSql,
  dropWorkspaceIntegrationsSql,
} from "./1783297920000-create-workspace-integrations-table.js";

test("workspace integrations migration scopes plugins to one installation per workspace", () => {
  const sql = createWorkspaceIntegrationsSql.join("\n");
  assert.match(sql, /CREATE TABLE "workspace_integrations"/u);
  assert.match(sql, /UNIQUE \("workspace_id", "plugin_key"\)/u);
  assert.match(
    sql,
    /CHECK \("status" IN \('authorizing', 'connected', 'disconnected', 'error'\)\)/u,
  );
  assert.match(sql, /REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/u);
  assert.match(sql, /"config" jsonb NOT NULL DEFAULT '\{\}'::jsonb/u);
});

test("workspace integrations migration is reversible", () => {
  assert.deepEqual(dropWorkspaceIntegrationsSql, [`DROP TABLE "workspace_integrations"`]);
});
