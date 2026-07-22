import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";
import type { WorkspaceManagementStore, WorkspaceReadStore } from "./workspaces.store.js";

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

test("WorkspacesController uses trusted current user context", async () => {
  const controller = new WorkspacesController(
    new WorkspacesService(createReadStore({ workspaces: [workspaceSummary] })),
  );

  const response = await controller.listWorkspaces(userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, workspaceId);
});

test("WorkspacesController creates and renames workspaces for the trusted user", async () => {
  const detail: WorkspaceDetail = { ...workspaceSummary, description: null, members: [] };
  const managementStore: WorkspaceManagementStore = {
    createWorkspace: async (_userId: string, input: CreateWorkspaceInput) => ({
      ...detail,
      name: input.name,
    }),
    deleteWorkspace: async () => ({ status: "deleted", workspace: workspaceSummary }),
    updateWorkspace: async (
      _workspaceId: string,
      _userId: string,
      input: UpdateWorkspaceInput,
    ) => ({
      status: "updated",
      workspace: { ...detail, name: input.name ?? detail.name },
    }),
  };
  const controller = new WorkspacesController(
    new WorkspacesService(createReadStore({}), undefined, managementStore),
  );

  assert.equal(
    (await controller.createWorkspace(userId, { name: "New Studio" })).name,
    "New Studio",
  );
  assert.equal(
    (await controller.updateWorkspace(workspaceId, userId, { name: "Renamed Studio" })).name,
    "Renamed Studio",
  );
  assert.equal((await controller.deleteWorkspace(workspaceId, userId)).id, workspaceId);
});

function createReadStore(options: {
  workspaces?: WorkspaceSummary[];
  workspace?: WorkspaceDetail | null;
  members?: WorkspaceMember[] | null;
}): WorkspaceReadStore {
  return {
    listForUser: async (): Promise<WorkspaceSummary[]> => options.workspaces ?? [],
    getRoleForUser: async (): Promise<WorkspaceMember["role"] | null> => null,
    getForUser: async (): Promise<WorkspaceDetail | null> => options.workspace ?? null,
    listMembersForUser: async (): Promise<WorkspaceMember[] | null> => options.members ?? null,
  };
}
