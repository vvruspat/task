import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";
import { WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
import { WorkspacesService } from "./workspaces.service.js";
import type { WorkspaceMemberManagementStore, WorkspaceReadStore } from "./workspaces.store.js";

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
  assert.equal(response.members.length, 1);
  assert.ok(response.members[0] instanceof WorkspaceMemberDto);
  assert.equal(response.members[0]?.userId, workspaceMember.userId);
  assert.equal(response.members[0]?.role, workspaceMember.role);
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
