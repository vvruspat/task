import assert from "node:assert/strict";
import test from "node:test";
import { canLeaveTaskWithDraft } from "./taskNavigationGuard.js";

const openTask = { projectId: "project-1", routeId: "kanban" as const, taskId: "task-1" };

test("dirty task drawer blocks route changes and permits confirmed navigation", () => {
  const next = { ...openTask, routeId: "table" as const };
  assert.equal(
    canLeaveTaskWithDraft(openTask, next, true, () => false),
    false,
  );
  assert.equal(
    canLeaveTaskWithDraft(openTask, next, true, () => true),
    true,
  );
});

test("dirty task drawer blocks popstate task removal until confirmed", () => {
  assert.equal(
    canLeaveTaskWithDraft(openTask, { ...openTask, taskId: null }, true, () => false),
    false,
  );
  assert.equal(
    canLeaveTaskWithDraft(openTask, { ...openTask, taskId: null }, false, () => false),
    true,
  );
});
