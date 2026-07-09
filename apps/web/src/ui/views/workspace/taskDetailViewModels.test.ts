import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTaskDueDateInput,
  hasTaskDraftChanges,
  isTaskLinkUrlValid,
  taskStatusSelectValue,
  toTaskDueDateValue,
} from "./taskDetailViewModels.js";

test("task detail form view models preserve nullable task fields", () => {
  assert.equal(formatTaskDueDateInput("2026-07-10T18:30:00.000Z"), "2026-07-10");
  assert.equal(formatTaskDueDateInput(null), "");
  assert.equal(toTaskDueDateValue("2026-07-10"), "2026-07-10T00:00:00.000Z");
  assert.equal(toTaskDueDateValue(""), null);
  assert.equal(taskStatusSelectValue(null), "none");
});

test("task detail protects dirty drafts and rejects unsupported attachment URLs", () => {
  assert.equal(isTaskLinkUrlValid("https://example.com/reference"), true);
  assert.equal(isTaskLinkUrlValid("ftp://example.com/reference"), false);
  assert.equal(isTaskLinkUrlValid("not a url"), false);
  assert.equal(
    hasTaskDraftChanges({
      comment: "",
      description: "Notes",
      linkTitle: "",
      linkUrl: "",
      savedDescription: "Notes",
      savedTitle: "Record",
      subtaskTitle: "",
      title: "Record",
    }),
    false,
  );
  assert.equal(
    hasTaskDraftChanges({
      comment: "Unsaved",
      description: "Notes",
      linkTitle: "",
      linkUrl: "",
      savedDescription: "Notes",
      savedTitle: "Record",
      subtaskTitle: "",
      title: "Record",
    }),
    true,
  );
});
