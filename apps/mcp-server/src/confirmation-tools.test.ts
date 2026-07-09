import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  ConfirmationRequestDetailResponse,
  ConfirmationRequestSummaryResponse,
  CreateConfirmationRequestInput,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSkillDetailResponse,
  TaskSkillSummaryResponse,
  TaskSummaryResponse,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceStatusResponse,
  WorkspaceSummaryResponse,
} from "./backend-client.js";
import {
  ConfirmationToolInputError,
  createConfirmationToolHandlers,
  parseConfirmationCancelToolInput,
  parseConfirmationCommitToolInput,
  parseConfirmationCreateToolInput,
  parseConfirmationGetToolInput,
  parseConfirmationListPendingToolInput,
} from "./confirmation-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const agentRunId = "33333333-3333-4333-8333-333333333333";
const confirmationRequestId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-01-01T00:00:00.000Z";

const confirmationRequest: ConfirmationRequestDetailResponse = {
  id: confirmationRequestId,
  workspaceId,
  agentRunId,
  userId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  status: "pending",
  expiresAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const createInput = {
  workspaceId,
  userId,
  agentRunId,
  kind: " task_skill.apply ",
  preview: {
    rootTaskTitle: "Intro",
  },
  expiresAt: "2026-01-01T00:00:00Z",
};

test("parseConfirmationListPendingToolInput validates identifiers", () => {
  assert.deepEqual(parseConfirmationListPendingToolInput({ workspaceId, userId }), {
    workspaceId,
    userId,
  });
  assert.throws(() => parseConfirmationListPendingToolInput(null), ConfirmationToolInputError);
});

test("parseConfirmationGetToolInput validates confirmation identifiers", () => {
  assert.deepEqual(
    parseConfirmationGetToolInput({
      workspaceId,
      confirmationRequestId,
      userId,
    }),
    {
      workspaceId,
      confirmationRequestId,
      userId,
    },
  );
});

test("parseConfirmationCreateToolInput validates and normalizes create payloads", () => {
  assert.deepEqual(parseConfirmationCreateToolInput(createInput), {
    workspaceId,
    userId,
    agentRunId,
    kind: "task_skill.apply",
    preview: {
      rootTaskTitle: "Intro",
    },
    expiresAt: timestamp,
  });
  assert.throws(
    () => parseConfirmationCreateToolInput({ ...createInput, kind: "" }),
    ConfirmationToolInputError,
  );
  assert.throws(
    () => parseConfirmationCreateToolInput({ ...createInput, preview: [] }),
    ConfirmationToolInputError,
  );
  assert.throws(
    () => parseConfirmationCreateToolInput({ ...createInput, expiresAt: "tomorrow" }),
    ConfirmationToolInputError,
  );
});

test("parseConfirmationCancelToolInput validates confirmation identifiers", () => {
  assert.deepEqual(
    parseConfirmationCancelToolInput({
      workspaceId,
      confirmationRequestId,
      userId,
    }),
    {
      workspaceId,
      confirmationRequestId,
      userId,
    },
  );
});

test("parseConfirmationCommitToolInput validates confirmation identifiers", () => {
  assert.deepEqual(
    parseConfirmationCommitToolInput({
      workspaceId,
      confirmationRequestId,
      userId,
    }),
    {
      workspaceId,
      confirmationRequestId,
      userId,
    },
  );
});

test("confirmation handlers forward list pending requests to the backend client", async () => {
  const calls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createConfirmationToolHandlers(
    createBackendClientStub({
      listPendingCalls: calls,
    }),
  );

  assert.deepEqual(await handlers.listPending({ workspaceId, userId }), [confirmationRequest]);
  assert.deepEqual(calls, [{ workspaceId, userId }]);
});

test("confirmation handlers forward get requests to the backend client", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const handlers = createConfirmationToolHandlers(
    createBackendClientStub({
      getCalls: calls,
    }),
  );

  assert.deepEqual(
    await handlers.get({ workspaceId, confirmationRequestId, userId }),
    confirmationRequest,
  );
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

test("confirmation handlers forward create requests to the backend client", async () => {
  const calls: Array<{
    workspaceId: string;
    userId: string;
    body: CreateConfirmationRequestInput;
  }> = [];
  const handlers = createConfirmationToolHandlers(
    createBackendClientStub({
      createCalls: calls,
    }),
  );

  assert.deepEqual(await handlers.create(createInput), confirmationRequest);
  assert.deepEqual(calls, [
    {
      workspaceId,
      userId,
      body: {
        agentRunId,
        kind: "task_skill.apply",
        preview: {
          rootTaskTitle: "Intro",
        },
        expiresAt: timestamp,
      },
    },
  ]);
});

test("confirmation handlers forward cancel requests to the backend client", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const cancelledRequest: ConfirmationRequestDetailResponse = {
    ...confirmationRequest,
    status: "cancelled",
  };
  const handlers = createConfirmationToolHandlers(
    createBackendClientStub({
      cancelCalls: calls,
      detail: cancelledRequest,
    }),
  );

  assert.deepEqual(
    await handlers.cancel({ workspaceId, confirmationRequestId, userId }),
    cancelledRequest,
  );
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

test("confirmation handlers forward commit requests to the backend client", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const confirmedRequest: ConfirmationRequestDetailResponse = {
    ...confirmationRequest,
    status: "confirmed",
  };
  const handlers = createConfirmationToolHandlers(
    createBackendClientStub({
      commitCalls: calls,
      detail: confirmedRequest,
    }),
  );

  assert.deepEqual(
    await handlers.commit({ workspaceId, confirmationRequestId, userId }),
    confirmedRequest,
  );
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

function createBackendClientStub(
  options: {
    listPendingCalls?: Array<{ workspaceId: string; userId: string }>;
    getCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    createCalls?: Array<{
      workspaceId: string;
      userId: string;
      body: CreateConfirmationRequestInput;
    }>;
    cancelCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    commitCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    detail?: ConfirmationRequestDetailResponse;
  } = {},
): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<WorkspaceSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getWorkspace: async (): Promise<WorkspaceDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceMembers: async (): Promise<WorkspaceMemberResponse[]> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
    },
    listPendingConfirmationRequests: async (
      request,
    ): Promise<ConfirmationRequestSummaryResponse[]> => {
      options.listPendingCalls?.push(request);

      return [options.detail ?? confirmationRequest];
    },
    getConfirmationRequest: async (request): Promise<ConfirmationRequestDetailResponse> => {
      options.getCalls?.push(request);

      return options.detail ?? confirmationRequest;
    },
    createConfirmationRequest: async (request): Promise<ConfirmationRequestDetailResponse> => {
      options.createCalls?.push(request);

      return options.detail ?? confirmationRequest;
    },
    cancelConfirmationRequest: async (request): Promise<ConfirmationRequestDetailResponse> => {
      options.cancelCalls?.push(request);

      return options.detail ?? confirmationRequest;
    },
    confirmConfirmationRequest: async (request): Promise<ConfirmationRequestDetailResponse> => {
      options.commitCalls?.push(request);

      return options.detail ?? confirmationRequest;
    },
    listTaskSkills: async (): Promise<TaskSkillSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getTaskSkill: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createTaskSkill: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    cloneTaskSkill: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    archiveTaskSkill: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillMetadata: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillDefinition: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskComments: async (): Promise<TaskCommentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskComment: async (): Promise<TaskCommentResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskAttachments: async (): Promise<TaskAttachmentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskLinkAttachment: async (): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
    archiveProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    getProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    listActiveTasks: async (): Promise<TaskSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    moveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskStatus: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskAssignee: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskDueDate: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    archiveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
