import assert from "node:assert/strict";
import test from "node:test";
import {
  changeSavedViewLayout,
  duplicateSavedViewDraft,
  type SavedViewDraft,
} from "./saved-view-draft.ts";

const draft: SavedViewDraft = {
  name: "Album matrix",
  description: null,
  projectId: null,
  visibility: "workspace",
  layout: "matrix",
  settings: {
    grouping: "status",
    subGrouping: "none",
    ordering: "manual",
    orderDirection: "asc",
    showSubtasks: true,
    showEmptyGroups: false,
    displayProperties: ["status", "project"],
    filters: [
      { field: "template", operator: "is", value: "template-id" },
      { field: "status", operator: "is_not", value: "done" },
    ],
  },
};

test("changing to board defaults empty row grouping to parent task", () => {
  const board = changeSavedViewLayout(draft, "board");
  const list = changeSavedViewLayout(board, "list");
  const matrix = changeSavedViewLayout(list, "matrix");

  assert.equal(board.settings.subGrouping, "parent_task");
  assert.equal(matrix.layout, "matrix");
  assert.deepEqual(matrix.settings, { ...draft.settings, subGrouping: "parent_task" });
  assert.notEqual(matrix.settings.filters, draft.settings.filters);
});

test("reselecting board preserves an explicit empty row grouping", () => {
  const board = changeSavedViewLayout({ ...draft, layout: "board" }, "board");

  assert.equal(board.settings.subGrouping, "none");
});

test("duplicating a view preserves the current draft without sharing mutable settings", () => {
  const duplicate = duplicateSavedViewDraft(draft, "Album matrix copy", "private");

  assert.deepEqual(duplicate, {
    ...draft,
    name: "Album matrix copy",
    visibility: "private",
  });
  assert.notEqual(duplicate.settings, draft.settings);
  assert.notEqual(duplicate.settings.displayProperties, draft.settings.displayProperties);
  assert.notEqual(duplicate.settings.filters, draft.settings.filters);
  assert.notEqual(duplicate.settings.filters[0], draft.settings.filters[0]);
});
