import assert from "node:assert/strict";
import test from "node:test";
import {
  backlogStatusName,
  inProgressStatusName,
  isBacklogStatusName,
  isInProgressStatusName,
  requiredProjectStatusName,
} from "./required-project-statuses.js";

test("required project statuses match normalized workflow names", () => {
  assert.equal(requiredProjectStatusName(" backlog "), backlogStatusName);
  assert.equal(requiredProjectStatusName("IN   PROGRESS"), inProgressStatusName);
  assert.equal(requiredProjectStatusName("Todo"), null);
  assert.equal(isBacklogStatusName("Backlog"), true);
  assert.equal(isInProgressStatusName("in progress"), true);
});
