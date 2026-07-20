import assert from "node:assert/strict";
import test from "node:test";
import {
  addWorkspaceScopedSlugsSql,
  dropWorkspaceScopedSlugsSql,
} from "./1783296840000-add-workspace-scoped-slugs.js";

test("workspace scoped slug migration covers projects and saved views", () => {
  const sql = addWorkspaceScopedSlugsSql.join("\n");
  assert.match(sql, /projects.*slug/is);
  assert.match(sql, /saved_views.*slug/is);
  assert.match(sql, /uq_projects_workspace_id_slug/);
  assert.match(sql, /uq_saved_views_workspace_id_slug/);
});

test("workspace scoped slug migration removes saved view fields first", () => {
  assert.match(dropWorkspaceScopedSlugsSql[0] ?? "", /saved_views/);
  assert.match(dropWorkspaceScopedSlugsSql.at(-1) ?? "", /projects.*slug/);
});
