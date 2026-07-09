import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { TaskSummary } from "../tasks/tasks.contracts.js";
import type { ProjectMatrix } from "./project-matrix.contracts.js";
import { ProjectMatrixDto } from "./project-matrix.dto.js";
import { ProjectMatrixService } from "./project-matrix.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";

test("ProjectMatrixService maps a visible matrix to DTOs", async () => {
  const matrix: ProjectMatrix = {
    columns: [task({ id: "44444444-4444-4444-8444-444444444444", parentTaskId: null })],
    stages: [{ id: null, name: "Unassigned", color: null, position: "-1", isDone: false }],
    cells: [
      {
        columnTaskId: "44444444-4444-4444-8444-444444444444",
        stageId: null,
        tasks: [],
      },
    ],
  };
  const service = new ProjectMatrixService({ getForProject: async () => matrix });

  const response = await service.getProjectMatrix(workspaceId, projectId, userId);

  assert.ok(response instanceof ProjectMatrixDto);
  assert.equal(response.columns[0]?.id, matrix.columns[0]?.id);
  assert.equal(response.cells[0]?.tasks.length, 0);
});

test("ProjectMatrixService hides inaccessible projects", async () => {
  const service = new ProjectMatrixService({ getForProject: async () => null });

  await assert.rejects(
    () => service.getProjectMatrix(workspaceId, projectId, userId),
    NotFoundException,
  );
});

function task(input: Pick<TaskSummary, "id" | "parentTaskId">): TaskSummary {
  return {
    id: input.id,
    workspaceId,
    projectId,
    parentTaskId: input.parentTaskId,
    title: "Plan release",
    description: null,
    statusId: null,
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
