import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSummaryResponse,
  WorkspaceStatusResponse,
} from "./backend-client.js";
import {
  createStatusToolHandlers,
  parseStatusListToolInput,
  StatusToolInputError,
} from "./status-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "55555555-5555-4555-8555-555555555555";
const statusId = "88888888-8888-4888-8888-888888888888";
const timestamp = "2026-01-01T00:00:00.000Z";

const workspaceStatus: WorkspaceStatusResponse = {
  id: statusId,
  workspaceId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};

test("parseStatusListToolInput validates and normalizes status list payloads", () => {
  assert.deepEqual(
    parseStatusListToolInput({
      workspaceId: ` ${workspaceId} `,
      userId,
    }),
    {
      workspaceId,
      userId,
    },
  );

  assert.throws(
    () => parseStatusListToolInput({ workspaceId: "bad", userId }),
    StatusToolInputError,
  );
  assert.throws(() => parseStatusListToolInput({ workspaceId }), StatusToolInputError);
});

test("status list handler forwards workspace identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createStatusToolHandlers(createBackendClientStub([workspaceStatus], calls));

  assert.deepEqual(await handlers.list({ workspaceId, userId }), [workspaceStatus]);
  assert.deepEqual(calls, [{ workspaceId, userId }]);
});

function createBackendClientStub(
  statuses: WorkspaceStatusResponse[],
  listWorkspaceStatusesCalls: Array<{ workspaceId: string; userId: string }>,
): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getWorkspace: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceMembers: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceStatuses: async (request): Promise<WorkspaceStatusResponse[]> => {
      listWorkspaceStatusesCalls.push(request);

      return statuses;
    },
    listPendingConfirmationRequests: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    cancelConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    confirmConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskSkills: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getTaskSkill: async (): Promise<never> => {
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
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
