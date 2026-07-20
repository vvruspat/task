import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";
import { WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
import { WorkspacesService } from "./workspaces.service.js";
import type {
  WorkspaceManagementStore,
  WorkspaceMemberManagementStore,
  WorkspaceReadStore,
} from "./workspaces.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

const workspaceSummary: WorkspaceSummary = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt,
  updatedAt,
};

const workspaceMember: WorkspaceMember = {
  id: "33333333-3333-4333-8333-333333333333",
  workspaceId,
  userId,
  role: "owner",
  displayName: "Alex",
  email: "alex@example.com",
  avatarUrl: null,
  createdAt,
  updatedAt,
};

const workspaceDetail: WorkspaceDetail = {
  description: null,
  ...workspaceSummary,
  members: [workspaceMember],
};

test("WorkspacesService maps visible workspaces to DTOs", async () => {
  const service = new WorkspacesService(createReadStore({ workspaces: [workspaceSummary] }));

  const response = await service.listWorkspaces(userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof WorkspaceSummaryDto);
  assert.equal(response[0]?.id, workspaceSummary.id);
  assert.equal(response[0]?.name, workspaceSummary.name);
  assert.equal(response[0]?.slug, workspaceSummary.slug);
});

test("WorkspacesService returns workspace detail with member DTOs", async () => {
  const service = new WorkspacesService(createReadStore({ workspace: workspaceDetail }));

  const response = await service.getWorkspace(workspaceId, userId);

  assert.equal(response.id, workspaceId);
  assert.equal(response.description, null);
  assert.equal(response.members.length, 1);
  assert.ok(response.members[0] instanceof WorkspaceMemberDto);
  assert.equal(response.members[0]?.userId, workspaceMember.userId);
  assert.equal(response.members[0]?.role, workspaceMember.role);
});

test("WorkspacesService updates a workspace description and preserves permissions", async () => {
  const updatedWorkspace = {
    ...workspaceDetail,
    description: "## Studio notes",
    name: "Production Studio",
  };
  const service = new WorkspacesService(
    createReadStore({}),
    undefined,
    createWorkspaceManagementStore({ workspace: updatedWorkspace }),
  );

  const response = await service.updateWorkspace(workspaceId, userId, {
    description: "## Studio notes",
    name: "Production Studio",
  });
  assert.equal(response.description, "## Studio notes");
  assert.equal(response.name, "Production Studio");

  const forbiddenService = new WorkspacesService(
    createReadStore({}),
    undefined,
    createWorkspaceManagementStore({ result: "forbidden" }),
  );
  await assert.rejects(
    () => forbiddenService.updateWorkspace(workspaceId, userId, { description: null }),
    ForbiddenException,
  );
});

test("WorkspacesService creates an owned workspace", async () => {
  const service = new WorkspacesService(
    createReadStore({}),
    undefined,
    createWorkspaceManagementStore({ workspace: workspaceDetail }),
  );

  const response = await service.createWorkspace(userId, { name: "Studio" });

  assert.equal(response.name, "Studio");
  assert.equal(response.members[0]?.role, "owner");
});

test("WorkspacesService deletes a workspace only for its owner", async () => {
  const service = new WorkspacesService(
    createReadStore({}),
    undefined,
    createWorkspaceManagementStore({ workspace: workspaceDetail }),
  );
  assert.equal((await service.deleteWorkspace(workspaceId, userId)).id, workspaceId);

  const forbiddenService = new WorkspacesService(
    createReadStore({}),
    undefined,
    createWorkspaceManagementStore({ result: "forbidden" }),
  );
  await assert.rejects(
    () => forbiddenService.deleteWorkspace(workspaceId, userId),
    ForbiddenException,
  );
});

test("WorkspacesService returns workspace members for visible workspaces", async () => {
  const service = new WorkspacesService(createReadStore({ members: [workspaceMember] }));

  const response = await service.listMembers(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof WorkspaceMemberDto);
  assert.equal(response[0]?.displayName, workspaceMember.displayName);
  assert.equal(response[0]?.email, workspaceMember.email);
});

test("WorkspacesService hides missing or inaccessible workspaces", async () => {
  const service = new WorkspacesService(createReadStore({ workspace: null, members: null }));

  await assert.rejects(() => service.getWorkspace(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.listMembers(workspaceId, userId), NotFoundException);
});

test("WorkspacesService returns updated member role and preserves management errors", async () => {
  const service = new WorkspacesService(
    createReadStore({}),
    createManagementStore({ member: { ...workspaceMember, role: "admin" } }),
  );

  const response = await service.updateMemberRole(workspaceId, workspaceMember.id, userId, {
    role: "admin",
  });
  assert.equal(response.role, "admin");

  const forbiddenService = new WorkspacesService(
    createReadStore({}),
    createManagementStore({
      result: "forbidden",
    }),
  );
  await assert.rejects(
    () =>
      forbiddenService.updateMemberRole(workspaceId, workspaceMember.id, userId, { role: "guest" }),
    ForbiddenException,
  );
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

function createManagementStore(options: {
  member?: WorkspaceMember;
  result?: "forbidden" | "member_not_found";
}): WorkspaceMemberManagementStore {
  return {
    updateMemberRole: async (
      _workspaceId: string,
      _memberId: string,
      _userId: string,
      _input: UpdateWorkspaceMemberRoleInput,
    ) => {
      if (options.result !== undefined) return { status: options.result };
      if (options.member === undefined) return { status: "member_not_found" };
      return { member: options.member, status: "updated" };
    },
  };
}

function createWorkspaceManagementStore(options: {
  result?: "forbidden" | "workspace_not_found";
  workspace?: WorkspaceDetail;
}): WorkspaceManagementStore {
  return {
    createWorkspace: async () => options.workspace ?? null,
    deleteWorkspace: async () => {
      if (options.result !== undefined) return { status: options.result };
      if (options.workspace === undefined) return { status: "workspace_not_found" };
      return { status: "deleted", workspace: options.workspace };
    },
    updateWorkspace: async (
      _workspaceId: string,
      _userId: string,
      _input: UpdateWorkspaceInput,
    ) => {
      if (options.result !== undefined) return { status: options.result };
      if (options.workspace === undefined) return { status: "workspace_not_found" };
      return { status: "updated", workspace: options.workspace };
    },
  };
}
