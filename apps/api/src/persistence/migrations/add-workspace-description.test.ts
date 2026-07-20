import assert from "node:assert/strict";
import test from "node:test";
import {
  addWorkspaceDescriptionSql,
  dropWorkspaceDescriptionSql,
} from "./1783296960000-add-workspace-description.js";

test("workspace description migration adds and removes the markdown source column", () => {
  assert.match(addWorkspaceDescriptionSql[0], /workspaces.*description/i);
  assert.match(dropWorkspaceDescriptionSql[0], /workspaces.*description/i);
});
