import assert from "node:assert/strict";
import test from "node:test";
import { filterTaskHierarchy, parentTaskSortTitle } from "./task-hierarchy.ts";

test("keeps every ancestor of a matching task and excludes unmatched siblings", () => {
  const root = { id: "root", title: "Root" };
  const parent = { id: "parent", title: "Parent", parentTaskId: root.id };
  const match = { id: "match", title: "Match", parentTaskId: parent.id };
  const sibling = { id: "sibling", title: "Sibling", parentTaskId: parent.id };

  const tasks = filterTaskHierarchy([root, parent, match, sibling], (task) => task.id === match.id);

  assert.deepEqual(
    tasks.map((task) => task.id),
    ["root", "parent", "match"],
  );
});

test("uses the immediate parent title as the hierarchy sorting key", () => {
  const alpha = { id: "alpha", title: "Alpha" };
  const alphaChild = { id: "alpha-child", title: "Zulu", parentTaskId: alpha.id };
  const beta = { id: "beta", title: "Beta" };
  const betaChild = { id: "beta-child", title: "Able", parentTaskId: beta.id };
  const taskById = new Map([alpha, alphaChild, beta, betaChild].map((task) => [task.id, task]));

  assert.equal(parentTaskSortTitle(alpha, taskById), "Alpha");
  assert.equal(parentTaskSortTitle(alphaChild, taskById), "Alpha");
  assert.equal(parentTaskSortTitle(betaChild, taskById), "Beta");
});
