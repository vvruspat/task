import assert from "node:assert/strict";
import test from "node:test";
import { isCreateSavedViewInput, isUpdateSavedViewInput } from "./saved-view-input.ts";

const settings = {
  grouping: "status",
  subGrouping: "none",
  ordering: "manual",
  orderDirection: "asc",
  showSubtasks: true,
  showEmptyGroups: false,
  displayProperties: ["status", "project", "due_at"],
  filters: [],
};

test("saved view input boundary accepts matrix creates and updates", () => {
  assert.equal(
    isCreateSavedViewInput({
      name: "Album matrix",
      description: null,
      projectId: null,
      layout: "matrix",
      settings,
    }),
    true,
  );
  assert.equal(isUpdateSavedViewInput({ layout: "matrix" }), true);
});

test("saved view input boundary rejects unsupported layouts", () => {
  assert.equal(
    isCreateSavedViewInput({
      name: "Calendar",
      layout: "calendar",
      settings,
    }),
    false,
  );
  assert.equal(isUpdateSavedViewInput({ layout: "calendar" }), false);
});
