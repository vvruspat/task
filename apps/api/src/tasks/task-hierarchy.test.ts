import assert from "node:assert/strict";
import test from "node:test";
import { collectTaskHierarchyIds } from "./task-hierarchy.js";

test("collectTaskHierarchyIds includes nested descendants and excludes unrelated tasks", () => {
  const ids = collectTaskHierarchyIds(
    [
      { id: "root", parentTaskId: null },
      { id: "child", parentTaskId: "root" },
      { id: "grandchild", parentTaskId: "child" },
      { id: "sibling", parentTaskId: null },
    ],
    "root",
  );

  assert.deepEqual([...ids], ["root", "child", "grandchild"]);
});

test("collectTaskHierarchyIds can start from a subtask", () => {
  const ids = collectTaskHierarchyIds(
    [
      { id: "root", parentTaskId: null },
      { id: "child", parentTaskId: "root" },
      { id: "grandchild", parentTaskId: "child" },
    ],
    "child",
  );

  assert.deepEqual([...ids], ["child", "grandchild"]);
});
