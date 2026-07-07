import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { WorkspaceStatus } from "./statuses.contracts.js";
import { WorkspaceStatusDto } from "./statuses.dto.js";
import { StatusesService } from "./statuses.service.js";
import type { StatusesReadStore } from "./statuses.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const statusId = "33333333-3333-4333-8333-333333333333";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

const workspaceStatus: WorkspaceStatus = {
  id: statusId,
  workspaceId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt,
  updatedAt,
};

test("StatusesService maps visible workspace statuses to DTOs", async () => {
  const service = new StatusesService(createReadStore({ statuses: [workspaceStatus] }));

  const response = await service.listStatuses(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof WorkspaceStatusDto);
  assert.equal(response[0]?.id, workspaceStatus.id);
  assert.equal(response[0]?.workspaceId, workspaceStatus.workspaceId);
  assert.equal(response[0]?.name, workspaceStatus.name);
  assert.equal(response[0]?.color, workspaceStatus.color);
  assert.equal(response[0]?.position, workspaceStatus.position);
  assert.equal(response[0]?.isDone, workspaceStatus.isDone);
});

test("StatusesService hides missing or inaccessible workspaces", async () => {
  const service = new StatusesService(createReadStore({ statuses: null }));

  await assert.rejects(() => service.listStatuses(workspaceId, userId), NotFoundException);
});

function createReadStore(options: { statuses?: WorkspaceStatus[] | null }): StatusesReadStore {
  return {
    listForWorkspace: async (): Promise<WorkspaceStatus[] | null> => options.statuses ?? null,
  };
}
