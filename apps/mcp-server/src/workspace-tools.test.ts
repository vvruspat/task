import assert from "node:assert/strict";
import test from "node:test";
import type {
  TaskBackendClient,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceSummaryResponse,
} from "./backend-client.js";
import {
  createWorkspaceToolHandlers,
  parseWorkspaceGetCurrentToolInput,
  parseWorkspaceMemberListToolInput,
  parseWorkspaceUserResolveToolInput,
} from "./workspace-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-01-01T00:00:00.000Z";

const workspaceSummary: WorkspaceSummaryResponse = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workspaceMember: WorkspaceMemberResponse = {
  id: "88888888-8888-4888-8888-888888888888",
  workspaceId,
  userId,
  role: "member",
  displayName: "Alex",
  email: null,
  avatarUrl: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const exactWorkspaceMember: WorkspaceMemberResponse = {
  ...workspaceMember,
  id: "99999999-9999-4999-8999-999999999999",
  userId: "99999999-9999-4999-8999-999999999999",
  displayName: "Ali",
  email: "ali@example.com",
};

const prefixWorkspaceMember: WorkspaceMemberResponse = {
  ...workspaceMember,
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  displayName: "Alicia",
  email: "team-lead@example.com",
};

const substringWorkspaceMember: WorkspaceMemberResponse = {
  ...workspaceMember,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  displayName: "Tali",
  email: "operator@example.com",
};

const workspaceDetail: WorkspaceDetailResponse = {
  ...workspaceSummary,
  members: [workspaceMember],
};

test("parseWorkspaceGetCurrentToolInput validates user and optional workspace", () => {
  assert.deepEqual(
    parseWorkspaceGetCurrentToolInput({
      workspaceId,
      userId,
    }),
    {
      workspaceId,
      userId,
    },
  );
});

test("parseWorkspaceMemberListToolInput validates workspace and user", () => {
  assert.deepEqual(
    parseWorkspaceMemberListToolInput({
      workspaceId,
      userId,
    }),
    {
      workspaceId,
      userId,
    },
  );
});

test("parseWorkspaceUserResolveToolInput validates query and bounded optional limit", () => {
  assert.deepEqual(
    parseWorkspaceUserResolveToolInput({
      workspaceId,
      userId,
      query: " Alex ",
      limit: 3,
    }),
    {
      workspaceId,
      userId,
      query: "Alex",
      limit: 3,
    },
  );
});

test("parseWorkspaceUserResolveToolInput rejects empty query and out-of-range limit", () => {
  assert.throws(
    () => parseWorkspaceUserResolveToolInput({ workspaceId, userId, query: " " }),
    /query must not be empty/,
  );
  assert.throws(
    () => parseWorkspaceUserResolveToolInput({ workspaceId, userId, query: "Alex", limit: 21 }),
    /limit must be between 1 and 20/,
  );
});

test("workspace handlers get explicit workspace details", async () => {
  const getWorkspaceCalls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createWorkspaceToolHandlers({
    ...createBackendClientStub(),
    getWorkspace: async (request): Promise<WorkspaceDetailResponse> => {
      getWorkspaceCalls.push(request);
      return workspaceDetail;
    },
  });

  assert.deepEqual(await handlers.getCurrent({ workspaceId, userId }), workspaceDetail);
  assert.deepEqual(getWorkspaceCalls, [{ workspaceId, userId }]);
});

test("workspace handlers return first visible workspace when id is absent", async () => {
  const listWorkspaceCalls: Array<{ userId: string }> = [];
  const handlers = createWorkspaceToolHandlers({
    ...createBackendClientStub(),
    listWorkspaces: async (request): Promise<WorkspaceSummaryResponse[]> => {
      listWorkspaceCalls.push(request);
      return [workspaceSummary];
    },
  });

  assert.deepEqual(await handlers.getCurrent({ userId }), workspaceSummary);
  assert.deepEqual(listWorkspaceCalls, [{ userId }]);
});

test("workspace handlers list visible workspace members", async () => {
  const memberCalls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createWorkspaceToolHandlers({
    ...createBackendClientStub(),
    listWorkspaceMembers: async (request): Promise<WorkspaceMemberResponse[]> => {
      memberCalls.push(request);
      return [workspaceMember];
    },
  });

  assert.deepEqual(await handlers.listMembers({ workspaceId, userId }), [workspaceMember]);
  assert.deepEqual(memberCalls, [{ workspaceId, userId }]);
});

test("workspace handlers resolve users by exact, prefix, then substring matches", async () => {
  const memberCalls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createWorkspaceToolHandlers({
    ...createBackendClientStub(),
    listWorkspaceMembers: async (request): Promise<WorkspaceMemberResponse[]> => {
      memberCalls.push(request);
      return [
        substringWorkspaceMember,
        prefixWorkspaceMember,
        exactWorkspaceMember,
        workspaceMember,
      ];
    },
  });

  assert.deepEqual(await handlers.resolveUser({ workspaceId, userId, query: "ali", limit: 2 }), [
    exactWorkspaceMember,
    prefixWorkspaceMember,
  ]);
  assert.deepEqual(memberCalls, [{ workspaceId, userId }]);
});

test("workspace handlers resolve users by email and user id", async () => {
  const handlers = createWorkspaceToolHandlers({
    ...createBackendClientStub(),
    listWorkspaceMembers: async (): Promise<WorkspaceMemberResponse[]> => [
      exactWorkspaceMember,
      prefixWorkspaceMember,
    ],
  });

  assert.deepEqual(await handlers.resolveUser({ workspaceId, userId, query: "team-lead" }), [
    prefixWorkspaceMember,
  ]);
  assert.deepEqual(
    await handlers.resolveUser({
      workspaceId,
      userId,
      query: exactWorkspaceMember.userId,
    }),
    [exactWorkspaceMember],
  );
});

function createBackendClientStub(): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<WorkspaceSummaryResponse[]> => [],
    getWorkspace: async (): Promise<WorkspaceDetailResponse> => workspaceDetail,
    listWorkspaceMembers: async (): Promise<WorkspaceMemberResponse[]> => [],
    listWorkspaceStatuses: async () => [],
    listPendingConfirmationRequests: async () => [],
    getConfirmationRequest: async () => {
      throw new Error("getConfirmationRequest is not used by workspace tools.");
    },
    createConfirmationRequest: async () => {
      throw new Error("createConfirmationRequest is not used by workspace tools.");
    },
    cancelConfirmationRequest: async () => {
      throw new Error("cancelConfirmationRequest is not used by workspace tools.");
    },
    confirmConfirmationRequest: async () => {
      throw new Error("confirmConfirmationRequest is not used by workspace tools.");
    },
    listTaskSkills: async () => [],
    getTaskSkill: async () => {
      throw new Error("getTaskSkill is not used by workspace tools.");
    },
    createTaskSkill: async () => {
      throw new Error("createTaskSkill is not used by workspace tools.");
    },
    cloneTaskSkill: async () => {
      throw new Error("cloneTaskSkill is not used by workspace tools.");
    },
    archiveTaskSkill: async () => {
      throw new Error("archiveTaskSkill is not used by workspace tools.");
    },
    updateTaskSkillMetadata: async () => {
      throw new Error("updateTaskSkillMetadata is not used by workspace tools.");
    },
    updateTaskSkillDefinition: async () => {
      throw new Error("updateTaskSkillDefinition is not used by workspace tools.");
    },
    listActiveProjects: async () => [],
    getProject: async () => {
      throw new Error("getProject is not used by workspace tools.");
    },
    archiveProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createProject: async () => {
      throw new Error("createProject is not used by workspace tools.");
    },
    listActiveTasks: async () => [],
    listTaskComments: async () => [],
    createTaskComment: async () => {
      throw new Error("createTaskComment is not used by workspace tools.");
    },
    listTaskAttachments: async () => [],
    createTaskLinkAttachment: async () => {
      throw new Error("createTaskLinkAttachment is not used by workspace tools.");
    },
    createTaskFileAttachment: async () => {
      throw new Error("createTaskFileAttachment is not used by workspace tools.");
    },
    createTaskTelegramFileAttachment: async () => {
      throw new Error("createTaskTelegramFileAttachment is not used by workspace tools.");
    },
    getTask: async () => {
      throw new Error("getTask is not used by workspace tools.");
    },
    createTask: async () => {
      throw new Error("createTask is not used by workspace tools.");
    },
    addTaskSubtasks: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    moveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskStatus: async () => {
      throw new Error("updateTaskStatus is not used by workspace tools.");
    },
    updateTaskAssignee: async () => {
      throw new Error("updateTaskAssignee is not used by workspace tools.");
    },
    updateTaskDueDate: async () => {
      throw new Error("updateTaskDueDate is not used by workspace tools.");
    },
    previewTaskSkillApply: async () => {
      throw new Error("previewTaskSkillApply is not used by workspace tools.");
    },
    archiveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async () => {
      throw new Error("applyTaskSkill is not used by workspace tools.");
    },
  };
}
