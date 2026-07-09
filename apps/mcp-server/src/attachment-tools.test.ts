import assert from "node:assert/strict";
import test from "node:test";
import {
  AttachmentToolInputError,
  createAttachmentToolHandlers,
  parseAttachmentCreateLinkToolInput,
  parseAttachmentListToolInput,
} from "./attachment-tools.js";
import type {
  ApplyTaskSkillResponse,
  CreateTaskLinkAttachmentRequest,
  ListTaskAttachmentsRequest,
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

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskId = "66666666-6666-4666-8666-666666666666";
const userId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-01-01T00:00:00.000Z";

const taskAttachment: TaskAttachmentResponse = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  workspaceId,
  targetType: "task",
  targetId: taskId,
  kind: "link",
  title: "Reference mix",
  url: "https://example.com/reference",
  storageKey: null,
  telegramFileId: null,
  mimeType: null,
  sizeBytes: null,
  createdByUserId: userId,
  createdAt: timestamp,
};

test("parseAttachmentCreateLinkToolInput validates and normalizes link attachment payloads", () => {
  assert.deepEqual(
    parseAttachmentCreateLinkToolInput({
      workspaceId,
      projectId,
      taskId,
      userId,
      url: " https://example.com/reference ",
      title: " Reference mix ",
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
      url: "https://example.com/reference",
      title: "Reference mix",
    },
  );
  assert.deepEqual(
    parseAttachmentCreateLinkToolInput({
      workspaceId,
      projectId,
      taskId,
      userId,
      url: "https://example.com/reference",
      title: "",
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
      url: "https://example.com/reference",
      title: null,
    },
  );

  assert.throws(
    () =>
      parseAttachmentCreateLinkToolInput({
        workspaceId,
        projectId,
        taskId,
        userId,
        url: "ftp://example.com/reference",
      }),
    AttachmentToolInputError,
  );
  assert.throws(
    () =>
      parseAttachmentCreateLinkToolInput({
        workspaceId,
        projectId,
        taskId,
        userId,
        url: "",
      }),
    AttachmentToolInputError,
  );
});

test("parseAttachmentListToolInput validates and normalizes attachment list payloads", () => {
  assert.deepEqual(
    parseAttachmentListToolInput({
      workspaceId: ` ${workspaceId} `,
      projectId,
      taskId,
      userId,
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
    },
  );

  assert.throws(
    () => parseAttachmentListToolInput({ workspaceId, projectId: "bad", taskId, userId }),
    AttachmentToolInputError,
  );
  assert.throws(
    () => parseAttachmentListToolInput({ workspaceId, projectId, userId }),
    AttachmentToolInputError,
  );
});

test("attachment create link handler forwards link payloads to the backend client", async () => {
  const calls: CreateTaskLinkAttachmentRequest[] = [];
  const handlers = createAttachmentToolHandlers(
    createBackendClientStub([taskAttachment], [], calls),
  );

  assert.deepEqual(
    await handlers.createLink({
      workspaceId,
      projectId,
      taskId,
      userId,
      url: " https://example.com/reference ",
      title: " Reference mix ",
    }),
    taskAttachment,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      taskId,
      userId,
      body: {
        url: "https://example.com/reference",
        title: "Reference mix",
      },
    },
  ]);
});

test("attachment list handler forwards task identifiers to the backend client", async () => {
  const calls: ListTaskAttachmentsRequest[] = [];
  const handlers = createAttachmentToolHandlers(createBackendClientStub([taskAttachment], calls));

  assert.deepEqual(await handlers.list({ workspaceId, projectId, taskId, userId }), [
    taskAttachment,
  ]);
  assert.deepEqual(calls, [{ workspaceId, projectId, taskId, userId }]);
});

function createBackendClientStub(
  attachments: TaskAttachmentResponse[],
  listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [],
  createTaskLinkAttachmentCalls: CreateTaskLinkAttachmentRequest[] = [],
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
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
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
    createTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    cloneTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    archiveTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillMetadata: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillDefinition: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskAttachments: async (request): Promise<TaskAttachmentResponse[]> => {
      listTaskAttachmentsCalls.push(request);

      return attachments;
    },
    createTaskLinkAttachment: async (request): Promise<TaskAttachmentResponse> => {
      createTaskLinkAttachmentCalls.push(request);

      return taskAttachment;
    },
    listTaskComments: async (): Promise<TaskCommentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskComment: async (): Promise<TaskCommentResponse> => {
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
    archiveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
