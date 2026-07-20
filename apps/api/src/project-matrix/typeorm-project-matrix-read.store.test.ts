import assert from "node:assert/strict";
import test from "node:test";
import type { TaskSummary } from "../tasks/tasks.contracts.js";
import type { ProjectMatrixStage } from "./project-matrix.contracts.js";
import { buildProjectMatrix, projectMatrixTaskOrder } from "./typeorm-project-matrix-read.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";
const parentId = "44444444-4444-4444-8444-444444444444";
const statusId = "55555555-5555-4555-8555-555555555555";

const stages: ProjectMatrixStage[] = [
  { id: null, name: "Unassigned", color: null, position: "-1", isDone: false },
  { id: statusId, name: "Doing", color: "#2563EB", position: "1000", isDone: false },
];

test("buildProjectMatrix creates every parent-task and stage cell, including empty cells", () => {
  const matrix = buildProjectMatrix(
    [
      task({ id: parentId, parentTaskId: null, statusId: null }),
      task({
        id: "66666666-6666-4666-8666-666666666666",
        parentTaskId: parentId,
        statusId,
      }),
    ],
    stages,
  );

  assert.equal(matrix.columns.length, 1);
  assert.equal(matrix.cells.length, 2);
  assert.deepEqual(matrix.cells[0], { columnTaskId: parentId, stageId: null, tasks: [] });
  assert.equal(matrix.cells[1]?.tasks[0]?.id, "66666666-6666-4666-8666-666666666666");
});

test("buildProjectMatrix excludes orphaned and parent tasks from matrix cells", () => {
  const matrix = buildProjectMatrix(
    [
      task({ id: parentId, parentTaskId: null, statusId: null }),
      task({
        id: "77777777-7777-4777-8777-777777777777",
        parentTaskId: "88888888-8888-4888-8888-888888888888",
        statusId,
      }),
    ],
    stages,
  );

  assert.equal(
    matrix.cells.every((cell) => cell.tasks.length === 0),
    true,
  );
});

test("project matrix task ordering uses task id to break equal position and timestamp ties", () => {
  assert.deepEqual(projectMatrixTaskOrder, {
    parentTaskId: "ASC",
    position: "ASC",
    createdAt: "ASC",
    id: "ASC",
  });
});

function task(input: Pick<TaskSummary, "id" | "parentTaskId" | "statusId">): TaskSummary {
  return {
    id: input.id,
    workspaceId,
    projectId,
    number: 1,
    parentTaskId: input.parentTaskId,
    title: "Task",
    description: null,
    statusId: input.statusId,
    assigneeUserId: null,
    createdByUserId: userId,
    position: "1000",
    dueAt: null,
    sourceSkillId: null,
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
