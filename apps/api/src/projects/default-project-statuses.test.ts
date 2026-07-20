import assert from "node:assert/strict";
import test from "node:test";
import { defaultProjectStatuses } from "./default-project-statuses.js";

test("new projects receive the operational default status workflow", () => {
  assert.deepEqual(
    defaultProjectStatuses.map((status) => status.name),
    ["Backlog", "Todo", "In progress", "In review", "Test", "Done"],
  );
  assert.equal(defaultProjectStatuses.at(-1)?.isDone, true);
  assert.equal(new Set(defaultProjectStatuses.map((status) => status.color)).size, 6);
});
