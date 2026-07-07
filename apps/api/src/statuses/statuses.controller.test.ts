import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceStatus } from "./statuses.contracts.js";
import { StatusesController } from "./statuses.controller.js";
import { StatusesService } from "./statuses.service.js";
import type { StatusesReadStore } from "./statuses.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const statusId = "33333333-3333-4333-8333-333333333333";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const workspaceStatus: WorkspaceStatus = {
  id: statusId,
  workspaceId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt,
  updatedAt: createdAt,
};

test("StatusesController uses trusted current user context for status list reads", async () => {
  const controller = new StatusesController(
    new StatusesService(createReadStore({ statuses: [workspaceStatus] })),
  );

  const response = await controller.listStatuses(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, statusId);
});

function createReadStore(options: { statuses?: WorkspaceStatus[] | null }): StatusesReadStore {
  return {
    listForWorkspace: async (): Promise<WorkspaceStatus[] | null> => options.statuses ?? null,
  };
}
