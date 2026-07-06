import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { WorkspaceDetail, WorkspaceMember, WorkspaceSummary } from "./workspaces.contracts.js";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";
import type { WorkspaceReadStore } from "./workspaces.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const workspaceSummary: WorkspaceSummary = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt,
  updatedAt: createdAt,
};

test("WorkspacesController accepts a valid temporary user context header", async () => {
  const controller = new WorkspacesController(
    new WorkspacesService(createReadStore({ workspaces: [workspaceSummary] })),
  );

  const response = await controller.listWorkspaces(userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, workspaceId);
});

test("WorkspacesController rejects missing or invalid temporary user context headers", async () => {
  const controller = new WorkspacesController(new WorkspacesService(createReadStore({})));

  assert.throws(() => controller.listWorkspaces(undefined), BadRequestException);
  assert.throws(() => controller.listWorkspaces("not-a-uuid"), BadRequestException);
});

function createReadStore(options: {
  workspaces?: WorkspaceSummary[];
  workspace?: WorkspaceDetail | null;
  members?: WorkspaceMember[] | null;
}): WorkspaceReadStore {
  return {
    listForUser: async (): Promise<WorkspaceSummary[]> => options.workspaces ?? [],
    getForUser: async (): Promise<WorkspaceDetail | null> => options.workspace ?? null,
    listMembersForUser: async (): Promise<WorkspaceMember[] | null> => options.members ?? null,
  };
}
