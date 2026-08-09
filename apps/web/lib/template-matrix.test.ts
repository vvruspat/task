import assert from "node:assert/strict";
import test from "node:test";
import { filterTaskHierarchy } from "./task-hierarchy.ts";
import { buildTemplateMatrix, normalizeTemplateMatrixTitle } from "./template-matrix.ts";

const templateId = "template-song";

test("normalizes matrix row titles for unicode, case and whitespace", () => {
  assert.equal(normalizeTemplateMatrixTitle("  ЗАПИСЬ   вокала  "), "запись вокала");
  assert.equal(normalizeTemplateMatrixTitle("ＡＢＣ"), "abc");
});

test("builds parent columns and de-duplicated subtask rows", () => {
  const parentOne = { id: "parent-1", title: "Песня 1", sourceSkillId: templateId };
  const parentTwo = { id: "parent-2", title: "Песня 2", sourceSkillId: templateId };
  const vocalOne = {
    id: "vocal-1",
    title: "Запись вокала",
    parentTaskId: parentOne.id,
    sourceSkillId: templateId,
  };
  const vocalTwo = {
    id: "vocal-2",
    title: "  ЗАПИСЬ  ВОКАЛА ",
    parentTaskId: parentTwo.id,
    sourceSkillId: templateId,
  };
  const guitarOne = {
    id: "guitar-1",
    title: "Запись гитары",
    parentTaskId: parentOne.id,
    sourceSkillId: templateId,
  };

  const matrix = buildTemplateMatrix(
    [parentOne, parentTwo, vocalOne, vocalTwo, guitarOne],
    templateId,
  );

  assert.deepEqual(
    matrix.columns.map((task) => task.title),
    ["Песня 1", "Песня 2"],
  );
  assert.equal(matrix.rows.length, 2);
  assert.deepEqual(
    matrix.rows[0]?.cells.map((task) => task?.id ?? null),
    ["vocal-1", "vocal-2"],
  );
  assert.deepEqual(
    matrix.rows[1]?.cells.map((task) => task?.id ?? null),
    ["guitar-1", null],
  );
});

test("keeps a matrix parent when only its subtask matches a filter", () => {
  const parent = {
    id: "parent-1",
    title: "Песня 1",
    sourceSkillId: templateId,
    assigneeUserId: null,
  };
  const matchingSubtask = {
    id: "vocal-1",
    title: "Запись вокала",
    parentTaskId: parent.id,
    sourceSkillId: templateId,
    assigneeUserId: "user-1",
  };
  const unmatchedSubtask = {
    id: "guitar-1",
    title: "Запись гитары",
    parentTaskId: parent.id,
    sourceSkillId: templateId,
    assigneeUserId: "user-2",
  };

  const filteredTasks = filterTaskHierarchy(
    [parent, matchingSubtask, unmatchedSubtask],
    (task) => task.assigneeUserId === "user-1",
  );
  const matrix = buildTemplateMatrix(filteredTasks, templateId);

  assert.deepEqual(
    filteredTasks.map((task) => task.id),
    ["parent-1", "vocal-1"],
  );
  assert.deepEqual(
    matrix.columns.map((task) => task.id),
    ["parent-1"],
  );
  assert.deepEqual(
    matrix.rows.map((row) => row.cells.map((task) => task?.id ?? null)),
    [["vocal-1"]],
  );
});
