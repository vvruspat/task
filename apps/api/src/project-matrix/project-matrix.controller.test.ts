import assert from "node:assert/strict";
import test from "node:test";
import type { ProjectMatrix } from "./project-matrix.contracts.js";
import { ProjectMatrixController } from "./project-matrix.controller.js";
import { ProjectMatrixService } from "./project-matrix.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";

test("ProjectMatrixController uses trusted current user context for matrix reads", async () => {
  let receivedUserId: string | null = null;
  const matrix: ProjectMatrix = { cells: [], columns: [], stages: [] };
  const controller = new ProjectMatrixController(
    new ProjectMatrixService({
      getForProject: async (_workspaceId, _projectId, currentUserId) => {
        receivedUserId = currentUserId;
        return matrix;
      },
    }),
  );

  const response = await controller.getProjectMatrix(workspaceId, projectId, userId);

  assert.equal(receivedUserId, userId);
  assert.equal(response.cells.length, 0);
});
