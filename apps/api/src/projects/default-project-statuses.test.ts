import assert from "node:assert/strict";
import test from "node:test";
import { defaultProjectStatuses } from "./default-project-statuses.js";

test("new projects receive the operational default status workflow", () => {
  assert.deepEqual(
    defaultProjectStatuses.map((status) => status.name),
    ["Backlog", "Todo", "In progress", "In review", "Test", "Done", "Won’t do", "Canceled"],
  );
  assert.equal(defaultProjectStatuses.at(-1)?.isDone, true);
  assert.equal(defaultProjectStatuses[0]?.color, "#D4D4D8");
  assert.equal(new Set(defaultProjectStatuses.map((status) => status.color)).size, 8);
});
