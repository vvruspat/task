import assert from "node:assert/strict";
import test from "node:test";
import { activeTaskCountConditions } from "./typeorm-dashboard-read.store.js";

test("dashboard task counts exclude archived tasks, archived projects, and done statuses", () => {
  assert.deepEqual(activeTaskCountConditions, [
    "task.archived_at IS NULL",
    "project.archived_at IS NULL",
    "(status.is_done IS NULL OR status.is_done=false)",
  ]);
});
