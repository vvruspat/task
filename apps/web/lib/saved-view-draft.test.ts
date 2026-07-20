import assert from "node:assert/strict";
import test from "node:test";
import { changeSavedViewLayout, type SavedViewDraft } from "./saved-view-draft.ts";

const draft: SavedViewDraft = {
  name: "Album matrix",
  description: null,
  projectId: null,
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
