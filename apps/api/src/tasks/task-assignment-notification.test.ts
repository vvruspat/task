import assert from "node:assert/strict";
import test from "node:test";
import { taskAssignmentActivityPayload } from "./task-assignment-notification.js";

test("taskAssignmentActivityPayload records both sides of an assignment change", () => {
  assert.deepEqual(taskAssignmentActivityPayload("previous-user", "next-user"), {
    assigneeUserId: "next-user",
    previousAssigneeUserId: "previous-user",
  });
});
