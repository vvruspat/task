import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultProjectView } from "./default-project-view.js";

const projectId = "33333333-3333-4333-8333-333333333333";

test("new projects receive a project-scoped board view", () => {
  const view = buildDefaultProjectView(projectId, "Album release");

  assert.equal(view.name, "Album release");
  assert.equal(view.projectId, projectId);
  assert.equal(view.visibility, "private");
  assert.equal(view.layout, "board");
  assert.equal(view.settings.grouping, "status");
  assert.equal(view.settings.subGrouping, "parent_task");
  assert.equal(view.settings.showEmptyGroups, true);
  assert.deepEqual(view.settings.filters, [{ field: "project", operator: "is", value: projectId }]);
});
